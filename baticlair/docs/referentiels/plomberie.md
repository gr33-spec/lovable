# Référentiel quantitatif PLOMBERIE (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

La plomberie sanitaire est pilotée par la norme (diamètres et pentes DTU), pas par la région : le seul axe fort est l'**époque du bâti en rénovation**, qui décide de la dépose et des raccords de transition. Périmètre de ce tiroir : alimentation eau froide / eau chaude sanitaire, évacuation EU/EV (eaux usées, eaux vannes), pose d'appareils sanitaires, production d'eau chaude (chauffe-eau). Le chauffage central (radiateurs, chaudière, plancher chauffant) et le gaz sont des tiroirs séparés (voir section 13) ; quand un devis en contient, le moteur les signale « hors tiroir » sans les calculer.

| Axe | Poids | Ce qu'il change dans le quantitatif | Résolution par le moteur |
| --- | --- | --- | --- |
| `neuf_renovation` | fort | En réno : raccords de transition (cuivre ↔ multicouche, fonte ↔ PVC), manchons de réparation, dépose, bouchons ; en neuf : tout le réseau depuis le compteur | Déduit du devis (lignes « dépose », « remplacement ») ; sinon question Q2 |
| `epoque_bati` | fort (réno seulement) | Avant 1950 : plomb possible (dépose obligatoire de la portion), fonte en chute ; 1950-1990 : cuivre + fonte/PVC ; après 1990 : PVC + cuivre puis PER/multicouche dès 2000 | Question Q3 seulement si réno avec raccordement à l'existant |
| `type_batiment` | moyen | Immeuble collectif : piquage sur colonne existante, pas de compteur ni de branchement ; maison : réseau complet, chute et ventilation primaire en toiture | Déduit du devis (adresse « appt », « bât. », « lot ») ; sinon défaut maison |
| `gamme` | moyen | Change la référence de l'appareil (WC suspendu vs à poser, robinetterie), pas les quantités de tubes | Lu sur la ligne du devis (marque, référence) ; jamais demandé |
| `geographie` | faible | Eau dure (calcaire) : adoucisseur fréquent ; zone froide : calorifugeage hors-gel des tubes en vide sanitaire ; Corse/DOM : ne change pas le calcul | Département du chantier (`commun/departements.json`) ; jamais demandé |

**Fiche d'identité `metier.json` proposée** : `id: "plomberie"`, `axes: { neuf_renovation: "fort", epoque_bati: "fort", type_batiment: "moyen", gamme: "moyen", geographie: "faible" }`, `unite_de_mesure_devis: ["u", "ml", "forfait", "ens"]`, `dtu: ["60.1", "60.11", "60.31", "60.33", "60.5"]`.

Particularité du métier : les devis de plombier sont presque toujours **au point d'eau ou au forfait** (« fourniture et pose d'un lavabo », « alimentation et évacuation salle de bains, forfait »), rarement au mètre. Le moteur doit donc reconstruire les longueurs à partir du nombre d'appareils et d'une distance au collecteur (section 5), c'est le cœur du tiroir.

## 2. Règle d'or et unités de commande

**Règle d'or plomberie : jamais un mètre linéaire nu, jamais un « forfait », jamais un m².** Un tube se commande en barres ou en couronnes de longueur fixe, un raccord à la pièce avec son diamètre et sa forme, un appareil avec sa référence. Chaque ligne du quantitatif doit pouvoir être saisie telle quelle par le comptoir du négoce.

| Famille | Unité de commande | Formats courants (négoce) | Arrondi |
| --- | --- | --- | --- |
| Tube PVC évacuation | barre | 4 m (aussi 2 m en Ø32-Ø40) — [Nicoll](https://www.nicoll.fr/fr/tube-pvc-compact-non-premanchonne-0) | barre supérieure |
| Tube cuivre écroui | barre | 4 m (KME, standard) ; 5 m chez certains négoces — [KME / Setin](https://www.setin.fr/tube-cuivre-anticorrosion-en-barre-kme-a25791.html), [Téréva](https://www.tereva.fr/A-571596--tube-cuivre-ecroui-barre-de-4-m) | barre supérieure |
| Tube cuivre recuit | couronne | 25 m, 50 m | couronne supérieure |
| Tube multicouche | couronne ou barre | couronnes 50 / 100 / 200 m ([Avis technique Henco](https://www.anjou-connectique.com/media/wysiwyg/PDF/avis-technique-henco-multicouche.pdf)) ; barres 4 ou 5 m (à vérifier par marque) | couronne : la plus petite qui couvre ; barre si ≤ 2 barres |
| Tube PER (nu ou pré-gainé) | couronne | 25 / 50 / 100 m pré-gainé ; 240 m nu ([PBtub](https://www.pbtub.com/fr/tube-per-pre-gaine-simple-en-couronne.html), [Watts](https://www.prosynergie.fr/couronne-de-tube-per-nu-non-gaine-couleur-rouge-p-205033)) | couronne supérieure |
| Gaine annelée (ICTA) | couronne | 25 / 50 / 100 m (à vérifier) | couronne supérieure |
| Raccords (coude, té, manchon, réduction) | u | à la pièce ; sachets de 5/10 en GSB, cartons pro (à vérifier) | unité |
| Colliers | boîte / sachet | 25 à 100 selon diamètre ([Nicoll Collclip, cond. 100](https://www.nicoll.fr/fr/collier-de-fixation-collclipr-pour-multicouche-cuivre-en-pvc-blanc-0)) | boîte supérieure |
| Colle PVC | pot | 250 ml, 500 ml, 1 L ([Griffon](https://lebonraccord.com/raccord-piscine/colle-griffon-pvc-pression-500ml-ref1327.html)) | pot supérieur |
| Décapant PVC | bidon | 1 L ([Tangit](https://www.farnell.com/datasheets/24464.pdf)) | bidon supérieur |
| Téflon, filasse, pâte à joint | u | rouleau 12 m (à vérifier), pelote filasse, pot pâte | 1 de chaque par chantier minimum |
| Appareils sanitaires, chauffe-eau | u | référence lue sur le devis | unité |

**Conversion longueur → unité de commande** (code pur, dans `commun/conditionnements.json`) : `nb_barres = ceil(L_totale × (1 + perte) / L_barre)`. Pour les couronnes : choisir la plus petite couronne ≥ besoin ; si besoin > plus grande couronne, combiner (ex. 130 m → 100 + 50, pas 200 si l'écart dépasse 30 %). Le moteur affiche toujours la longueur réellement utilisée en hypothèse (« 23 m de multicouche 16 → 1 couronne de 50 m »).

## 3. Ouvrages du métier, vocabulaire des devis, pièges

Le plombier vend des **points d'eau** : chaque appareil déclenche un kit de matériaux (alimentation EF/ECS, évacuation, robinetterie de raccordement), puis le réseau qui relie ces points au collecteur. Le moteur décompose donc tout forfait « salle de bains » en appareils avant de calculer.

### 3.1 Liste des ouvrages (`ouvrages.json`)

| Id | Ouvrage | Déclenche | Règle (section 5) |
| --- | --- | --- | --- |
| PL-01 | Alimentation d'un appareil (EF seule ou EF + ECS) | tube, raccords, robinet d'arrêt, plaque/applique murale | R1, R2 |
| PL-02 | Évacuation d'un appareil | tube PVC, siphon, coudes, colliers, colle | R4, R5 |
| PL-03 | WC à poser | cuvette + réservoir (réf.), pipe/manchon Ø100, robinet flotteur, flexible | R7 |
| PL-04 | WC suspendu | bâti-support + plaque de commande + cuvette (3 lignes distinctes), manchon 90/100 | R7 |
| PL-05 | Lavabo / vasque / lave-mains | appareil, bonde, siphon Ø32, mitigeur, 2 flexibles ou 2 robinets | R7 |
| PL-06 | Douche (receveur ou italienne) | receveur ou siphon de sol, bonde Ø90, évacuation Ø40/50, robinetterie (apparente ou encastrée) | R7 |
| PL-07 | Baignoire | baignoire, vidage, pieds/tablier, évacuation Ø40, mitigeur bain-douche | R7 |
| PL-08 | Évier + lave-vaisselle | évier, bonde, siphon Ø40 avec piquage LV, robinet LV | R7 |
| PL-09 | Lave-linge | robinet machine, siphon/attente Ø40 | R7 |
| PL-10 | Chauffe-eau (électrique, thermodynamique) | appareil, groupe de sécurité, siphon d'évacuation, raccords diélectriques, réducteur de pression si > 3 bar | R8 |
| PL-11 | Collecteur / nourrice | nourrice EF, nourrice ECS, vannes, 1 départ par appareil | R2 |
| PL-12 | Alimentation générale (compteur → logement) | tube Ø20-26 multicouche ou PE enterré, vanne générale, réducteur, clapet | R3 |
| PL-13 | Chute et collecteur EU/EV | tube Ø100, culottes, tampons de visite, ventilation primaire en toiture | R6 |
| PL-14 | Dépose (appareils, tuyauterie) | aucun matériau ; bouchons + raccords de transition si réseau conservé | R9 |
| PL-15 | Robinet de puisage extérieur | robinet, purge hors-gel, traversée de mur | R1 |

### 3.2 Vocabulaire des devis (`vocabulaire.json`)

| Le devis écrit | Ouvrage / sens |
| --- | --- |
| F&P, Fourn. et pose, FP | fourniture + pose (on commande le matériau) |
| « Pose seule », « fourniture client », « FC » | **ne rien commander** pour cet appareil (consommables de raccordement seulement) |
| EF, EFS / EC, ECS | eau froide / eau chaude sanitaire |
| EU / EV / EP | eaux usées (lavabo, douche…) / eaux vannes (WC) / eaux pluviales (hors tiroir, voir zinguerie) |
| Nourrice, collecteur, pieuvre, distribution en étoile | PL-11 |
| Pipe, manchette, manchon WC | raccord cuvette → Ø100 |
| Bâti-support, bâti autoportant, Geberit, Grohe Rapid | PL-04 |
| Receveur extra-plat, douche à l'italienne, douche de plain-pied, caniveau | PL-06 |
| Cumulus, ballon, CE, CET, chauffe-eau thermodynamique | PL-10 |
| Mitigeur, mélangeur, thermostatique, colonne de douche, encastré | robinetterie (référence) |
| Groupe de sécurité, GS, réducteur, clapet, vanne ¼ tour | organes de PL-10 / PL-12 |
| Té, coude, culotte, réduction, tampon de visite, chapeau, clapet aérateur | raccords PVC (PL-02, PL-13) |
| Sertir, glissement, compression, à visser, braser, souder | mode d'assemblage (Q1) |

### 3.3 Pièges

- **WC suspendu = 3 lignes** : bâti-support, plaque de commande, cuvette. La plaque est vendue séparément ([Geberit](https://catalog.geberit-global.com/fr-XE/product/PRO_4081335)). Le bâti sort en Ø90 PE-HD : prévoir le manchon de transition 90/100 si le modèle ne l'inclut pas (certaines références le livrent, d'autres non — [Livea](https://www.livea.fr/bati-support-pour-wc-suspendus/12526-bati-support-fixation-murale-duofix-up320-111300005-4025416846208.html)).
- **« Fourniture client »** sur un appareil : ne rien commander pour l'appareil, mais garder flexibles, joints et siphon (le client les fournit rarement). Afficher l'hypothèse.
- **Douche à l'italienne** : le siphon de sol ou le caniveau est plombier ; la natte d'étanchéité et la forme de pente sont carreleur (tiroir CARRELAGE). Ne pas les compter ici.
- **Robinetterie encastrée** : deux lignes, corps d'encastrement + façade (vendus séparément chez la plupart des marques, à vérifier par référence).
- **Chauffe-eau** : le groupe de sécurité est obligatoire et ne figure presque jamais sur le devis ; le moteur l'ajoute toujours, avec siphon et raccords diélectriques si réseau cuivre.
- **Diamètres DTU en intérieur, catalogues en extérieur** : un multicouche « 16 » fait 12 mm intérieur, un PER « 16 » fait 13 mm ([Henco](https://a.storyblok.com/f/240355/x/92f18757bb/th_henco_2024_fr_rgb-web.pdf), [waterout](https://waterout.fr/blogs/actualite-plomberie-tutoriel/les-differents-diametres-de-tube-multicouche)). Le moteur ne compare jamais un diamètre DTU à un diamètre catalogue sans conversion.
- **Lignes « chauffage » ou « gaz »** dans un devis de plomberie : hors tiroir, signalées sans calcul.

## 4. Matériaux et fiches fabricant

Trois familles de tubes couvrent 95 % des devis : PVC pour l'évacuation, multicouche ou PER pour l'alimentation en neuf et réno récente, cuivre pour les reprises sur réseau ancien. Les poids servent au bon de livraison, pas au calcul.

### 4.1 Tubes d'évacuation PVC (NF E / NF Me)

| Ø ext. (mm) | Épaisseur (mm) | Usage | Format | Poids (kg/m) | Source |
| --- | --- | --- | --- | --- | --- |
| 32 | 3,0 (à vérifier) | lavabo, lave-mains, bidet | barre 4 m (2 m aussi) | ≈ 0,38 (calculé) | [Nicoll](https://www.nicoll.fr/fr/tube-pvc-compact-non-premanchonne-0) |
| 40 | 3,0 (à vérifier) | douche, évier, baignoire, LV, LL | barre 4 m (2 m aussi) | ≈ 0,49 (calculé) | [Nicoll EU4H](https://www.nicoll.fr/fr/tube-pvc-compact-non-premanchonne-0) |
| 50 | 3,0 (à vérifier) | douche extra-plate, collecteur 2-3 appareils | barre 4 m | ≈ 0,62 (calculé) | Nicoll |
| 80 | 3,0 | collecteur, WC à chasse directe | barre 4 m | ≈ 1,0 (calculé) | [Nicoll EU4R](https://www.nicoll.fr/fr/tube-pvc-compact-non-premanchonne-0) |
| 100 | 3,0 | WC, chute EV, collecteur général | barre 4 m | ≈ 1,28 (calculé) | [Nicoll EU4T](https://www.nicoll.fr/fr/tube-pvc-compact-non-premanchonne-0) |

Poids calculés = π × (D − e) × e × 1,4 kg/dm³ (densité PVC, à vérifier sur fiche).

### 4.2 Tubes d'alimentation

| Tube | Ø ext. × ép. (mm) | Ø int. (mm) | Format négoce | Poids (kg/m) | Source |
| --- | --- | --- | --- | --- | --- |
| Multicouche PE-Xc/Al/PE-Xc | 16 × 2 | 12 | couronne 50/100/200 m | 0,125 | [Henco manuel 2024](https://a.storyblok.com/f/240355/x/92f18757bb/th_henco_2024_fr_rgb-web.pdf) |
| Multicouche | 20 × 2 | 16 | couronne 50/100 m | 0,147 | Henco |
| Multicouche | 26 × 3 | 20 | couronne 50 m, barre 5 m | 0,285 | Henco |
| Multicouche | 32 × 3 | 26 | barre 5 m | 0,390 | Henco |
| PER nu | 12 × 1,1 | 9,8 | couronne 25/50/240 m | à vérifier | [Watts Intersol](https://www.prosynergie.fr/couronne-de-tube-per-nu-non-gaine-couleur-rouge-p-205033) |
| PER nu / pré-gainé | 16 × 1,5 | 13 | couronne 25/50/100/240 m | 0,115 pré-gainé | [PBtub](https://www.pbtub.com/fr/tube-per-nu-en-couronne.html), [Mister Matériaux](https://mistermateriaux.com/produit/tube-per/xq4n1l8i) |
| PER | 20 × 1,9 | 16 | couronne 25/50/240 m | à vérifier | PBtub |
| Cuivre écroui | 12 × 1 (10/12) | 10 | barre 4 m | ≈ 0,31 (calculé) | [KME / Setin](https://www.setin.fr/tube-cuivre-anticorrosion-en-barre-kme-a25791.html) |
| Cuivre écroui | 14 × 1 (12/14) | 12 | barre 4 m | ≈ 0,36 (calculé) | KME |
| Cuivre écroui | 16 × 1 (14/16) | 14 | barre 4 m (5 m selon négoce) | ≈ 0,42 (calculé) | [Leroy Merlin](https://www.leroymerlin.fr/produits/chauffage-plomberie/circuit-alimentation-en-eau/tube-et-raccord-alimentation/tube-alimentation/tube-alimentation-cuivre-ecroui-diam-14-x-16-mm-en-barre-de-4-m-69060845.html), [Téréva](https://www.tereva.fr/A-571596--tube-cuivre-ecroui-barre-de-4-m) |
| Cuivre écroui | 18 × 1 (16/18) | 16 | barre 4 m | ≈ 0,48 (calculé) | KME |
| Cuivre écroui | 22 × 1 (20/22) | 20 | barre 4 m | ≈ 0,59 (calculé) | KME |
| Cuivre recuit | 12 × 1 | 10 | couronne 50 m (20,55 kg) | 0,41 | [ManoMano](https://www.manomano.fr/p/tube-cuivre-recuit-diametre-12-mm-la-couronne-de-50-m-468064) |

Poids cuivre calculés = π × (D − e) × e × 8,9 kg/dm³. Multicouche Henco : pression de service 10 bar, 95 °C maxi, dilatation 0,025 mm/m·K ([Henco](https://a.storyblok.com/f/240355/x/92f18757bb/th_henco_2024_fr_rgb-web.pdf)). Raccords à sertir Henco : profils de pince BE et TH.

### 4.3 Colle et décapant PVC

Consommation Tangit pour **100 assemblages** (1 assemblage = 1 emboîture collée) ([fiche Tangit PVC-U eau potable](https://www.dod.fr/PartageWeb/PartageWeb/Fiche_Tech/88932_tangit_colle_pvc_u_eau.pdf)) :

| Ø tube (mm) | Colle pour 100 assemblages (kg) | Colle par assemblage (g) |
| --- | --- | --- |
| 32 | 0,2 | 2 |
| 40 | 0,3 | 3 |
| 50 | 0,5 | 5 |
| 100 | 1,2 | 12 |

Décapant : bidon 1 L ; consommation par assemblage de 3 ml (petit Ø) à 13 ml (Ø100) selon le tableau Tangit PVC-U Plus ([Henkel](https://datasheets.tdx.henkel.com/TANGIT-PVC-U-PLUS-fr_BE.pdf)) — correspondance exacte Ø ↔ ml à vérifier. Colle en pot 250 / 500 ml / 1 L ([Griffon](https://lebonraccord.com/raccord-piscine/colle-griffon-pvc-pression-250ml-ref1495.html)).

### 4.4 Colliers

| Collier | Diamètres | Conditionnement | Source |
| --- | --- | --- | --- |
| Collier lyre PP gris évacuation (insert 7×150) | Ø8 à Ø125 | à la pièce / carton (à vérifier) | [Nicoll](https://www.nicoll.fr/sites/default/files/products/FT_colliers_evac.pdf) |
| Collier monobloc PP | Ø32, 40, 50 | carton 30 à 40 ([FITT](https://shop.fitt.mc/p/collier-de-fixation-charniere-pvc-evacuation/)) | Nicoll |
| Collier double Collclip (multicouche, cuivre, PER) | Ø12 à Ø22 | boîte de 100 | [Nicoll](https://www.nicoll.fr/fr/collier-de-fixation-collclipr-pour-multicouche-cuivre-en-pvc-blanc-0) |
| Collier simple / double cuivre (patte à vis) | Ø12 à Ø22 | sachet de 25 | [Monraccord](https://monraccord.com/catalogue/1/raccords/638/tubes-cuivre-fixations/3467/collier-simple/608010/colliers-simples-o12-pour-tubes-cuivre-lot-25/) |

### 4.5 Équipements à la pièce (exemples de fiches)

| Article | Contenu livré | Ce qui n'est PAS livré | Source |
| --- | --- | --- | --- |
| Bâti-support Geberit Duofix 112 cm, réservoir Sigma 12 cm | alimentation R 1/2 avec robinet équerre, kit de raccordement Ø90, coude 90° PE-HD Ø90, manchon 90/110, fixations | plaque de déclenchement, cuvette | [Geberit 111.950.00.6](https://catalog.geberit-global.com/fr-XE/product/PRO_4081335) |
| Bâti-support Duofix UP320 (111.300.00.5) | réservoir, fixations cuvette | plaque, manchon 90/100, fixation murale mur porteur | [Livea](https://www.livea.fr/bati-support-pour-wc-suspendus/12526-bati-support-fixation-murale-duofix-up320-111300005-4025416846208.html) |

Règle : pour tout appareil, `materiaux.json` stocke « livré avec » et « à commander en plus » ; le moteur ajoute automatiquement les secondes lignes.

## 5. Règles de calcul DTU (formules, pertes)

Le calcul part de la **liste des appareils** et de leur **distance au collecteur**, jamais d'une longueur saisie par l'artisan. Chaque règle est une fonction pure (`regles.json`), testable seule.

### R1. Diamètre d'alimentation par appareil (NF DTU 60.11 P1-1, tableau 1)

| Appareil | Débit mini (l/s) | Ø intérieur mini (mm) | Multicouche | PER | Cuivre |
| --- | --- | --- | --- | --- | --- |
| Lavabo, bidet, lave-mains | 0,20 | 10 | 16×2 | 12×1,1 (9,8 int., à vérifier) ou 16 | 10/12 |
| WC à réservoir | 0,12 | 10 | 16×2 | 12 | 10/12 |
| Lave-linge, lave-vaisselle | à vérifier | 10 | 16×2 | 12 | 10/12 |
| Évier, douche, poste d'eau ½" | 0,20 | 12 | 16×2 | 16×1,5 | 12/14 |
| Baignoire, bac à laver | 0,33 | 13 | 20×2 | 16×1,5 | 14/16 |

Sources : [extrait DTU 60.11 P1-1 tableau 1](https://fr.scribd.com/document/915515561/Dtu-60-11-Partie-1-1-Reseaux-d-Alimentation-d-Eau-Froide-Et-Chaude-Sanitaire), [Progineer](https://progineer.fr/workspace/regulation/dtu-60-11/), [calculpro](https://calculpro.fr/outils/plomberie/dimensionnement-complet-reseau). En installation individuelle, la somme des coefficients d'appareils donne le diamètre du tronçon commun (figure 1 du DTU) ; au-delà de 15, méthode collective avec coefficient de simultanéité y = 0,8 / √(x − 1) ([calculpro](https://calculpro.fr/outils/plomberie/conduites-eau)). Le tableau des coefficients individuels (tableau 2) reste **à transcrire** depuis le texte officiel.

### R2. Longueur d'alimentation (distribution en étoile, défaut)

```
pour chaque appareil a :
  nb_tubes(a) = 2 si a reçoit EF+ECS, 1 si EF seule (WC, LL, LV, robinet ext.)
  L(a) = nb_tubes(a) × (d_nourrice(a) + 0,5 m de remontée par extrémité × 2)
L_par_diametre = Σ L(a) groupés par diamètre R1
commande = conditionner(L_par_diametre × 1,05)   # perte couronne 5 %
```

En distribution en té (cuivre, réno) : même longueur, perte 10 % (barres), et un té par appareil au lieu d'une sortie de nourrice.

### R3. Alimentation générale et nourrices

- Tronçon compteur → nourrice : diamètre par défaut multicouche 20×2 (1 salle d'eau) ou 26×3 (2 salles d'eau ou plus) — **à vérifier** contre la figure 1 du DTU 60.11.
- Nourrice EF : sorties = nb appareils EF + 1 réserve ; nourrice ECS : sorties = nb appareils ECS + 1 réserve ; arrondi au modèle du commerce (2, 3, 4, 5, 6 sorties — à vérifier).
- Pression > 3 bar en entrée de logement : réducteur de pression (règle de l'art DTU 60.1, à vérifier dans le texte).

### R4. Diamètre d'évacuation par appareil (NF DTU 60.11 P1-2)

| Appareil | Ø int. mini (mm) | Tube PVC courant | Source |
| --- | --- | --- | --- |
| Lavabo, lave-mains, bidet | 30 | Ø32 | [Nicoll](https://www.nicoll.fr/fr/dtu-6011-comment-dimensionner-son-reseau-deaux-usees) |
| Douche, évier, lave-vaisselle, lave-linge | 33 | Ø40 | [Nicoll](https://www.nicoll.fr/fr/dtu-6011-comment-dimensionner-son-reseau-deaux-usees), [calculpro](https://calculpro.fr/outils/plomberie/canalisation) |
| Baignoire | 33 si ≤ 1 m, 38 au-delà | Ø40 ou Ø50 | [victor-plombier](https://victor-plombier31.fr/installation-sanitaire-et-canalisations-les-normes-dtu-60-1-et-60-11/) |
| Douche extra-plate / italienne | 33 | Ø50 recommandé | calculpro |
| WC (eaux vannes) | 90 (PVC) | Ø100 | [alobees](https://www.alobees.com/conseils/dtu-60-11) |

Pente : 1 cm/m minimum, 1 à 3 cm/m courant ([Nicoll](https://www.nicoll.fr/fr/dtu-6011-comment-dimensionner-son-reseau-deaux-usees)). La pente ne change pas la quantité commandée ; elle sert d'alerte si le devis parle d'une évacuation longue en extra-plat.

### R5. Longueur, raccords et colle d'évacuation

```
L_evac(a) = d_collecteur(a) + 0,5 m          # remontée sous l'appareil
coudes(a) = 2 par défaut ; culotte/té de piquage(a) = 1
emboitures = 2 × coudes + 3 × culottes + 2 × manchons + 1 × tampons
colle_g = Σ emboitures(Ø) × g_par_assemblage(Ø)     # 2 g Ø32, 3 g Ø40, 5 g Ø50, 12 g Ø100 (Tangit)
pots_colle = choisir_pot(colle_g / 0,97 g/ml)        # 250 ml mini
barres = ceil(Σ L_evac(Ø) × 1,10 / 4 m)              # perte barre 10 %
```

Colliers d'évacuation PVC (NF DTU 60.33, via [PUM](https://www.mypum.fr/solutions/supporter-une-canalisation)) : horizontal 0,5 m (Ø32-63), 0,8 m (Ø75-140), 1,0 m (Ø160-250) ; vertical ≤ 2,7 m et au moins un point d'ancrage par niveau. `colliers = ceil(L / e) + 1` par tronçon apparent ; 0 si le tronçon est noyé ou en sol.

### R6. Chute et collecteur EV

`L_chute = nb_niveaux × hauteur_niveau (2,7 m défaut) + 1 m (traversée toiture)` ; tampon de visite en pied de chute et à chaque changement de direction ; ventilation primaire prolongée hors toiture (chapeau) ou, à défaut de sortie, clapet aérateur (conditions d'emploi à vérifier DTU 60.11 P1-2).

### R7. Kits d'appareil (lignes ajoutées automatiquement)

| Appareil | Lignes du kit (hors appareil lui-même) |
| --- | --- |
| Lavabo / vasque | bonde, siphon Ø32, 2 robinets d'arrêt, 2 flexibles (si non livrés avec le mitigeur), 1 kit de fixation |
| WC à poser | pipe ou manchon souple Ø100, robinet d'arrêt, flexible, kit fixation sol |
| WC suspendu | bâti-support, plaque de commande, cuvette, manchon 90/100 si non livré, abattant si non livré |
| Douche receveur | bonde (Ø90 standard, Ø60 extra-plat), siphon/coude Ø40 ou Ø50, mitigeur ou colonne |
| Baignoire | vidage (trop-plein), pieds, tablier si prévu, mitigeur bain-douche, flexible + douchette |
| Évier | bonde(s), siphon Ø40 avec prise lave-vaisselle, mitigeur, robinet machine LV |
| Lave-linge | robinet machine, attente ou siphon Ø40 |

### R8. Chauffe-eau

Toujours : 1 groupe de sécurité, 1 siphon de groupe de sécurité, 1 évacuation Ø32 vers le réseau. Si réseau cuivre ou acier : 2 raccords diélectriques. Si chauffe-eau vertical mural sur cloison légère : trépied ou console (question Q4 ou hypothèse affichée). Réducteur de pression : voir R3.

### R9. Rénovation : transitions et bouchons

Par appareil raccordé sur l'existant : 2 raccords de transition (EF + ECS, matériau existant → matériau neuf) + 1 raccord d'évacuation (PVC ↔ fonte : joint/manchon de raccordement Ø100, ou PVC ↔ PVC : manchon). Par point d'eau supprimé : 2 bouchons d'alimentation + 1 bouchon d'évacuation.

### Pertes et arrondis

| Élément | Perte | Arrondi |
| --- | --- | --- |
| Tube en barre (PVC, cuivre, multicouche barre) | 10 % | barre supérieure |
| Tube en couronne (PER, multicouche, cuivre recuit) | 5 % | couronne la plus petite qui couvre |
| Raccords | 0 % ; +1 de réserve par référence si quantité ≥ 5 (à valider) | unité |
| Colliers | 0 % | boîte supérieure |
| Colle, décapant, téflon, silicone | — | 1 contenant mini par chantier |

## 6. Valeurs par défaut et hypothèses affichées

Toute valeur non lue dans le devis et non demandée est une hypothèse **affichée sur la carte quantitatif** et modifiable d'un tap. Ordre de surcharge : défaut métier → profil artisan → chantier.

| Clé `defauts.json` | Valeur par défaut | Variante par axe | Texte affiché à l'artisan |
| --- | --- | --- | --- |
| `materiau_alimentation` | multicouche | réno avant 2000 sans reprise totale : cuivre en té ; profil artisan « PER » : PER | « Alimentation en multicouche » |
| `assemblage_alimentation` | à sertir | cuivre : à braser ; PER : à glissement | « Raccords à sertir » |
| `distribution` | en étoile depuis nourrice | réno partielle : en té sur l'existant | « Distribution par nourrice » |
| `d_nourrice` (m) | 3 même pièce, 6 pièce voisine, 10 autre niveau | — | « Environ 6 m entre la nourrice et la cuisine » |
| `d_collecteur` (m) | 1,5 même pièce, 3 pièce voisine | WC suspendu : 1 | « Environ 1,5 m d'évacuation par appareil » |
| `pose_tube` | encastré en gaine (pas de collier) | réno en apparent : colliers R5 | « Tubes en gaine, sans colliers » |
| `materiau_evacuation` | PVC NF E/NF Me | — | « Évacuations en PVC » |
| `hauteur_niveau` (m) | 2,7 | — | « Hauteur d'étage 2,70 m » |
| `type_batiment` | maison | « appt », « lot », « bât. » dans l'adresse : immeuble (pas de chute ni d'alimentation générale) | « Maison individuelle » |
| `reseau_existant` (réno) | cuivre + PVC | époque < 1950 : plomb + fonte possibles (alerte, dépose de la portion) | « Réseau existant en cuivre » |
| `pression_entree` | inconnue → réducteur ajouté en option barrée | profil artisan peut fixer « jamais » | « Réducteur de pression proposé (à confirmer) » |
| `flexibles_livres_avec_robinetterie` | oui | — | « Flexibles fournis avec les mitigeurs » |
| `joint_silicone` | 1 cartouche pour 2 appareils (lavabo, douche, baignoire, évier) — à valider | — | « 2 cartouches de silicone sanitaire » |
| `teflon_filasse` | 1 rouleau téflon + 1 pot pâte d'étanchéité par chantier, +1 par 10 raccords filetés | — | « Consommables d'étanchéité » |

Règle d'affichage : chaque hypothèse dit d'où vient la valeur (« défaut », « ton profil », « lu dans le devis ») et ce qu'elle change, en une ligne.

## 7. Questions à poser (4 maximum, à boutons)

Le moteur pose au plus **4 questions par devis**, à boutons, classées par levier sur le quantitatif ; jamais une quantité ni une longueur. Une question n'est posée que si la réponse n'est ni dans le devis, ni dans le profil artisan, ni dans les réponses d'un chantier précédent. Les sensibilités sont des estimations sur une salle de bains type (lavabo, douche, WC) et restent **à valider** sur devis réels.

| Ordre | Id | Question affichée | Boutons | Ce que ça change | Sensibilité |
| --- | --- | --- | --- | --- | --- |
| 1 | Q1 | L'arrivée d'eau est où par rapport aux appareils ? | Même pièce · Pièce à côté · Autre étage | `d_nourrice` 3 / 6 / 10 m | ± 50 % sur les longueurs d'alimentation |
| 2 | Q2 | Tu gardes une partie des tuyaux existants ? | Non, tout neuf · Oui, je me raccorde | ajoute transitions et bouchons (R9), retire alimentation générale | + 5 à 15 lignes de raccords ; ± 30 % de tube |
| 3 | Q3 | Tu poses quel tuyau pour l'eau ? | Multicouche · PER · Cuivre | change toutes les références d'alimentation et le format (couronne / barre) | 100 % des références alim., ± 5 % de longueur (pertes) |
| 4 | Q4 | Les tuyaux restent visibles ? | Cachés · Visibles | colliers (R5) et calorifuge éventuel | 0 → 2 colliers/ml apparent ; ± 3 % du coût matière |
| cond. | Q5 | Les tuyaux existants sont en quoi ? (si Q2 = oui) | Cuivre · PER / multicouche · Plomb ou vieux acier · Je ne sais pas | type de raccord de transition ; alerte plomb | ± 2 à 4 raccords |
| cond. | Q6 | Le WC suspendu va contre un mur porteur ? (si PL-04) | Oui · Non, cloison | fixation murale vs bâti autoportant | 1 ligne |
| cond. | Q7 | Le chauffe-eau se fixe sur quoi ? (si PL-10 vertical mural) | Mur porteur · Cloison | trépied ou console | 1 ligne |

Règles de file d'attente (`questions.json`) : une question conditionnelle déclenchée prend la place de la question de rang le plus bas encore non posée, pour rester à 4. Q3 n'est jamais posée si le devis nomme le matériau (« PER », « multicouche », « cuivre ») ou si le profil artisan l'a déjà fixé : c'est la première réponse à enregistrer comme préférence artisan.

## 8. Matériaux dominants par région

En plomberie sanitaire, **la région ne change ni les diamètres ni les matériaux** : le DTU est national et les tubes sont les mêmes partout. L'axe `geographie` est déclaré « faible » et n'est jamais demandé ; il ne déclenche que des options et des alertes. Aucune statistique régionale sourcée n'a été trouvée sur la part PER / multicouche / cuivre : le choix est une **habitude d'artisan**, capturée par Q3 puis mémorisée dans son profil.

| Effet régional | Zones concernées | Ce que fait le moteur | Statut |
| --- | --- | --- | --- |
| Eau calcaire | eau dure dans de nombreux départements (Bassin parisien, Nord, Est, Sud-Est, Centre — liste à établir par département) | propose un adoucisseur ou un filtre anti-calcaire **en option barrée**, jamais d'office | à vérifier (données ARS / services d'eau par commune) |
| Risque de gel | départements de montagne et du Nord-Est ; tout tube en vide sanitaire ou garage non chauffé | ajoute calorifuge sur les tronçons signalés « hors volume chauffé » et propose un robinet extérieur purgeable | à vérifier (zones climatiques RE2020 H1/H2/H3 dans `commun/departements.json`) |
| Littoral | départements côtiers | aucun effet en plomberie intérieure (contrairement à la couverture) | — |
| Bâti ancien en centre-ville (plomb, fonte) | villes anciennes, immeubles d'avant 1950 | renforce l'alerte plomb de Q5 | à vérifier |

Conséquence pour Claude Code : pas de colonne région dans `defauts.json` plomberie ; une seule table d'options régionales dans `commun/departements.json` (dureté, zone climatique).

## 9. Points singuliers et consommables

Ce sont les lignes que le devis n'écrit jamais et que l'artisan oublie au comptoir. Le moteur les ajoute toutes, regroupées en fin de quantitatif sous « Petites fournitures », chacune modifiable.

### 9.1 Points singuliers (commandés à la pièce)

| Point singulier | Déclencheur | Quantité | Remarque |
| --- | --- | --- | --- |
| Traversée de dalle ou de mur (fourreau) | tube qui change de pièce ou de niveau | 1 fourreau par traversée, Ø tube + 10 mm (à vérifier) | DTU 60.1 : fourreau pour libre dilatation |
| Manchon de dilatation PVC | chute verticale | 1 par niveau (à vérifier DTU 60.33) | uniquement en pose apparente |
| Tampon de visite | pied de chute, changement de direction du collecteur | 1 par point | R6 |
| Culotte / té de piquage | chaque appareil sur collecteur ou chute | 1 par appareil | R5 |
| Applique / plaque murale | chaque sortie de tube encastré | 1 par tube encastré (EF et ECS séparés) | multicouche ou PER à sertir |
| Boîtier d'encastrement de nourrice | nourrice en cloison | 1 par nourrice | option |
| Raccord de transition | réno, tube neuf sur ancien | R9 | type selon Q5 |
| Bouchon | point d'eau supprimé | 2 alim + 1 évac | R9 |
| Clapet anti-retour | alimentation générale neuve | 1 | souvent intégré au compteur, à vérifier |
| Disconnecteur | appareil à risque de retour (chaudière, adoucisseur, arrosage) | 1 par appareil concerné | hors salle de bains classique |

### 9.2 Consommables (par chantier)

| Consommable | Unité | Règle de quantité | Statut |
| --- | --- | --- | --- |
| Colle PVC | pot 250 / 500 ml / 1 L | R5, Tangit g/assemblage | sourcé |
| Décapant PVC | bidon 1 L | 1 par chantier jusqu'à 100 assemblages (à vérifier) | à valider |
| Papier de nettoyage / chiffon | rouleau | 1 par chantier | à valider |
| Téflon | rouleau | 1 par chantier + 1 par 10 raccords filetés | à valider |
| Filasse + pâte d'étanchéité | pelote + pot | 1 kit par chantier si raccords filetés en réno | à valider |
| Joints fibre (raccords 3 pièces) | sachet | 1 sachet par 10 raccords à écrou | à valider |
| Silicone sanitaire | cartouche 300 ml (à vérifier) | 1 pour 2 appareils | à valider |
| Brasure + décapant cuivre | bobine + pot | si Q3 = cuivre : 1 de chaque par chantier | à valider |
| Chevilles + vis (colliers, bâti, appareils) | boîte | 1 boîte de 100 si ≥ 20 colliers, sinon livrées avec les kits | à valider |

Règle « à la pièce » : jamais de consommable au poids ou au volume calculé seul ; on convertit toujours en contenant commandable et on affiche « 1 pot de 250 ml (besoin estimé 90 ml) ».

## 10. Cas de test (format JSON)

Trois cas synthétiques, calculés à la main avec les règles de la section 5 et les défauts de la section 6. Ils servent de tests unitaires du moteur en attendant des **devis réels anonymisés** et leur quantitatif validé par un plombier (section 13).

### PL-001 — Salle de bains neuve, maison

```json
{
  "id": "plomb-001",
  "source": "synthétique, référentiel v0.1",
  "devis_lignes": ["F&P vasque + mitigeur", "F&P receveur 90x90 + mitigeur douche", "F&P WC suspendu Geberit Duofix", "Alimentation multicouche + évacuations PVC, forfait"],
  "contexte": { "type_batiment": "maison", "neuf_renovation": "neuf", "Q1_distance": "meme_piece", "Q3_materiau": "multicouche", "Q4_visible": "caches" },
  "attendu": [
    { "article": "tube multicouche 16x2", "quantite": 1, "unite": "couronne 50 m", "hypothese": "besoin 21 m" },
    { "article": "nourrice EF 4 sorties", "quantite": 1, "unite": "u" },
    { "article": "nourrice ECS 3 sorties", "quantite": 1, "unite": "u" },
    { "article": "applique murale à sertir 16 x 1/2", "quantite": 4, "unite": "u" },
    { "article": "raccord à sertir 16 x 1/2 F (bâti WC)", "quantite": 1, "unite": "u" },
    { "article": "tube PVC Ø32", "quantite": 1, "unite": "barre 4 m" },
    { "article": "tube PVC Ø40", "quantite": 1, "unite": "barre 4 m" },
    { "article": "tube PVC Ø100", "quantite": 1, "unite": "barre 4 m" },
    { "article": "bâti-support WC 112 cm", "quantite": 1, "unite": "u" },
    { "article": "plaque de commande WC", "quantite": 1, "unite": "u" },
    { "article": "manchon de raccordement 90/100", "quantite": 1, "unite": "u", "hypothese": "si non livré avec le bâti" },
    { "article": "siphon lavabo Ø32", "quantite": 1, "unite": "u" },
    { "article": "bonde de douche Ø90", "quantite": 1, "unite": "u" },
    { "article": "colle PVC", "quantite": 1, "unite": "pot 250 ml" },
    { "article": "silicone sanitaire", "quantite": 1, "unite": "cartouche" }
  ],
  "tolerance_pct": 0,
  "questions_max": 4
}
```

### PL-002 — Remplacement de chauffe-eau, réseau cuivre

```json
{
  "id": "plomb-002",
  "source": "synthétique, référentiel v0.1",
  "devis_lignes": ["Dépose ancien cumulus", "F&P chauffe-eau électrique vertical mural 200 L"],
  "contexte": { "neuf_renovation": "renovation", "Q5_existant": "cuivre", "Q7_support": "mur_porteur" },
  "attendu": [
    { "article": "chauffe-eau électrique vertical mural 200 L", "quantite": 1, "unite": "u" },
    { "article": "groupe de sécurité 20x27", "quantite": 1, "unite": "u" },
    { "article": "siphon de groupe de sécurité", "quantite": 1, "unite": "u" },
    { "article": "raccord diélectrique", "quantite": 2, "unite": "u" },
    { "article": "réducteur de pression", "quantite": 1, "unite": "u", "option": true },
    { "article": "téflon", "quantite": 1, "unite": "rouleau" }
  ],
  "tolerance_pct": 0,
  "questions_max": 2
}
```

### PL-003 — Cuisine en rénovation, raccordement sur cuivre existant

```json
{
  "id": "plomb-003",
  "source": "synthétique, référentiel v0.1",
  "devis_lignes": ["Pose évier client", "Alimentation + évacuation lave-vaisselle", "Alimentation + évacuation lave-linge"],
  "contexte": { "neuf_renovation": "renovation", "Q1_distance": "piece_a_cote", "Q2_existant_conserve": true, "Q3_materiau": "multicouche", "Q4_visible": "caches", "Q5_existant": "cuivre" },
  "attendu": [
    { "article": "tube multicouche 16x2", "quantite": 1, "unite": "couronne 50 m", "hypothese": "besoin 29 m" },
    { "article": "raccord de transition cuivre 14/16 → multicouche 16", "quantite": 2, "unite": "u" },
    { "article": "tube PVC Ø40", "quantite": 2, "unite": "barre 4 m" },
    { "article": "siphon évier Ø40 avec prise lave-vaisselle", "quantite": 1, "unite": "u" },
    { "article": "robinet machine (LV)", "quantite": 1, "unite": "u" },
    { "article": "robinet machine (LL)", "quantite": 1, "unite": "u" },
    { "article": "colle PVC", "quantite": 1, "unite": "pot 250 ml" }
  ],
  "absent_attendu": ["évier", "mitigeur évier"],
  "tolerance_pct": 0,
  "questions_max": 4
}
```

Le champ `absent_attendu` vérifie la règle « fourniture client » : le test échoue si l'évier ou son mitigeur apparaissent.

## 11. Ratios à faire valider par un plombier

Ces valeurs viennent de la pratique courante ou d'un calcul, pas d'un texte officiel ni d'une fiche fabricant. Un plombier doit les relire avant la mise en production ; chaque case cochée passe la ligne en « validé » dans `ratios-a-valider.md`. Classées par impact sur le quantitatif.

- [ ] Distances par défaut nourrice → appareil : 3 m même pièce, 6 m pièce voisine, 10 m autre niveau (R2, Q1).
- [ ] Remontée de 0,5 m à chaque extrémité de tube d'alimentation (R2).
- [ ] Distance par défaut appareil → collecteur : 1,5 m même pièce, 3 m pièce voisine, 1 m WC suspendu (R5).
- [ ] 2 coudes + 1 culotte par appareil en évacuation (R5).
- [ ] Diamètre du tronçon compteur → nourrice : multicouche 20 pour 1 salle d'eau, 26 au-delà (R3) — à recouper avec la figure 1 du DTU 60.11.
- [ ] PER 12×1,1 (9,8 mm intérieur) accepté pour lavabo et WC malgré le minimum DTU de 10 mm intérieur (R1).
- [ ] Pertes : 10 % sur barres, 5 % sur couronnes ; +1 raccord de réserve par référence au-delà de 5 pièces.
- [ ] Espacement des colliers d'alimentation en apparent (multicouche, PER, cuivre) : valeur à fixer, aucune source officielle trouvée.
- [ ] Silicone sanitaire : 1 cartouche pour 2 appareils.
- [ ] Téflon : 1 rouleau par chantier + 1 par 10 raccords filetés ; joints fibre : 1 sachet par 10 raccords à écrou.
- [ ] Décapant PVC : 1 bidon de 1 L suffit jusqu'à 100 assemblages.
- [ ] Réducteur de pression proposé en option quand la pression est inconnue (R3, R8).
- [ ] Flexibles considérés comme livrés avec la robinetterie (défaut section 6).
- [ ] Sensibilités des questions Q1 à Q4 (section 7), à mesurer sur 10 devis réels.

Méthode de validation proposée : envoyer à un plombier les trois cas de test de la section 10 et lui demander de corriger le quantitatif comme il le ferait au comptoir ; chaque écart devient soit une correction de ratio, soit un nouveau cas de test.

## 12. Sources officielles et liens

Les textes DTU complets sont payants (boutique AFNOR / CSTB) ; les valeurs ci-dessus viennent d'extraits publiés par des fabricants et sites techniques, à recouper sur le texte officiel avant production.

| Source | Type | Utilisée pour |
| --- | --- | --- |
| [NF DTU 60.11 P1-1, tableau 1 (extrait)](https://fr.scribd.com/document/915515561/Dtu-60-11-Partie-1-1-Reseaux-d-Alimentation-d-Eau-Froide-Et-Chaude-Sanitaire) | norme (extrait) | débits et Ø intérieurs mini d'alimentation (R1) |
| [Nicoll — DTU 60.11, dimensionner son réseau d'eaux usées](https://www.nicoll.fr/fr/dtu-6011-comment-dimensionner-son-reseau-deaux-usees) | fabricant | Ø d'évacuation par appareil, pente 1 à 3 cm/m (R4) |
| [Nicoll — tube PVC compact non prémanchonné](https://www.nicoll.fr/fr/tube-pvc-compact-non-premanchonne-0) | fabricant | barres 2 et 4 m, épaisseurs (4.1) |
| [Nicoll — fiche colliers lyre et monobloc](https://www.nicoll.fr/sites/default/files/products/FT_colliers_evac.pdf) | fabricant | gamme de colliers Ø8 à Ø125 (4.4) |
| [Nicoll — Collclip](https://www.nicoll.fr/fr/collier-de-fixation-collclipr-pour-multicouche-cuivre-en-pvc-blanc-0) | fabricant | colliers d'alimentation, boîte de 100 |
| [Batirama — NF DTU 60.33](https://www.batirama.com/article/28273-nf-dtu-60.33-canalisations-en-pvc-non-plastifie-evacuation-d-eu-et-d-ev.html) | presse technique | règles de pose PVC EU/EV |
| [PUM — supporter une canalisation](https://www.mypum.fr/solutions/supporter-une-canalisation) | distributeur | espacement des colliers DTU 60.33 et 60.31 (R5) |
| [Henco — manuel technique 2024](https://a.storyblok.com/f/240355/x/92f18757bb/th_henco_2024_fr_rgb-web.pdf) | fabricant | Ø, épaisseurs, poids/m, pression, dilatation du multicouche (4.2) |
| [Avis technique Henco 14/10-1608](https://www.anjou-connectique.com/media/wysiwyg/PDF/avis-technique-henco-multicouche.pdf) | avis technique CSTB | couronnes 50 / 100 / 200 m |
| [PBtub — tube PER](https://www.pbtub.com/fr/tube-per-nu-en-couronne.html) | fabricant | couronnes PER 25 à 240 m |
| [Watts Intersol (Prosynergie)](https://www.prosynergie.fr/couronne-de-tube-per-nu-non-gaine-couleur-rouge-p-205033) | distributeur | PER 12×1,1 et 16×1,5, couronnes |
| [KME (Setin)](https://www.setin.fr/tube-cuivre-anticorrosion-en-barre-kme-a25791.html) | distributeur | cuivre en barres de 4 m |
| [Téréva — tube cuivre écroui](https://www.tereva.fr/A-571596--tube-cuivre-ecroui-barre-de-4-m) | négoce | barres de 4 et 5 m selon diamètre |
| [Tangit PVC-U eau potable](https://www.dod.fr/PartageWeb/PartageWeb/Fiche_Tech/88932_tangit_colle_pvc_u_eau.pdf) | fabricant | colle par 100 assemblages (4.3) |
| [Tangit PVC-U Plus (Henkel)](https://datasheets.tdx.henkel.com/TANGIT-PVC-U-PLUS-fr_BE.pdf) | fabricant | décapant par assemblage, cartons de 12 pots |
| [Geberit — Duofix 111.950.00.6](https://catalog.geberit-global.com/fr-XE/product/PRO_4081335) | fabricant | contenu livré du bâti-support (4.5) |
| [Livea — Duofix UP320 111.300.00.5](https://www.livea.fr/bati-support-pour-wc-suspendus/12526-bati-support-fixation-murale-duofix-up320-111300005-4025416846208.html) | distributeur | éléments non livrés (plaque, manchon 90/100) |
| [calculpro — dimensionnement DTU 60.11](https://calculpro.fr/outils/plomberie/dimensionnement-complet-reseau) | outil technique | coefficient de simultanéité, Ø mini |

À obtenir en priorité : texte officiel NF DTU 60.11 P1-1 (tableau 2 des coefficients et figure 1), NF DTU 60.1 (supports des tubes métalliques, fourreaux, essais), NF DTU 60.33 (tableau d'espacement des colliers en original).

## 13. Plan de complétion

Le tiroir est utilisable pour une salle de bains, une cuisine et un chauffe-eau ; il lui manque les tableaux officiels des coefficients et des supports, et la validation d'un plombier sur devis réels.

1. Faire relire la section 11 et les 3 cas de test par un plombier (Greg : un contact du réseau Rappidos).
2. Récupérer 10 devis de plombier réels anonymisés (salle de bains, cuisine, chauffe-eau, réno) et leur bon de commande réel au négoce ; en faire des tests `plomb-004` à `plomb-013`.
3. Transcrire depuis le texte officiel : tableau 2 et figure 1 du DTU 60.11 P1-1 ; tableau d'espacement des colliers du DTU 60.33 ; supports et fourreaux du DTU 60.1.
4. Conditionnements négoce réels (Cedeo, Téréva, Frans Bonhomme, Richardson) : raccords à sertir à la pièce ou en sachet, colliers par boîte, gaine annelée, téflon.
5. Kits d'appareils : vérifier « livré avec / à commander en plus » pour les 10 références les plus vendues (bâtis, mitigeurs, receveurs, chauffe-eau).
6. Tiroirs voisins à ouvrir ensuite : **chauffage central** (radiateurs, chaudière, PAC, plancher chauffant) et **gaz** (DTU 61.1), qui partagent tubes et raccords avec ce tiroir.
7. Table `commun/departements.json` : dureté de l'eau et zone climatique par département (options section 8).

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 2026-10-03 | v0.1 | Création du référentiel plomberie au format section 27 : 14 chapitres, 15 ouvrages, règles R1 à R9, 7 questions dont 4 au maximum par devis, 3 cas de test, 14 ratios à valider, 18 sources. |
