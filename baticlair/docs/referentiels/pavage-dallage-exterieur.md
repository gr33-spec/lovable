# Référentiel quantitatif PAVAGE / DALLAGE EXTÉRIEUR (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

Le pavage / dallage extérieur réalise des surfaces circulables (allées, terrasses, cours, accès garage, parkings privés, trottoirs) en éléments modulaires posés sur un lit : pavés, dalles, bordures. Le quantitatif dépend d'abord de l'usage (piéton ou voiture), qui fixe l'épaisseur des pavés et de la fondation ; la région change surtout le matériau, pas la méthode.

**Périmètre.** Inclus : pavés béton, terre cuite et pierre naturelle ; dalles béton, pierre naturelle et grès cérame 20 mm ; pose souple (sable ou gravillons), pose scellée (mortier ou béton), pose sur plots ; bordures et caniveaux ; lit de pose, joints, géotextile, fondation granulaire sous le revêtement. Exclus (renvoyés à un autre tiroir) : terrassement et évacuation des terres (tiroir *terrassier*), dalle béton armé coulée et murets (tiroir *maçonnerie*), carrelage collé sur chape (tiroir *carrelage*), enrobé et béton désactivé (hors MVP).

### metier.json

```json
{
  "code": "pavage",
  "nom": "Pavage - dallage extérieur",
  "version": "1.0.0",
  "normes": ["NF P98-335", "NF EN 1338", "NF EN 1339", "NF EN 1340", "NF P98-340/CN", "NF EN 1341", "NF EN 1342", "NF EN 1344", "NF EN 13242", "CCTG fascicules 29 et 31"],
  "axes_de_variation": {
    "geographie": "moyen",
    "epoque_bati": "nul",
    "type_batiment": "fort",
    "neuf_renovation": "fort",
    "gamme": "moyen"
  },
  "metiers_lies": ["terrassement", "maconnerie", "carrelage", "vrd"],
  "unites_de_commande": ["palette", "u", "ml", "t", "big-bag", "sac", "seau", "rouleau", "m3"],
  "maturite": "alpha"
}
```

### Poids des axes

| Axe | Poids | Ce qu'il change pour ce métier | Comment le moteur le résout |
| --- | --- | --- | --- |
| type\_batiment (ici : **usage / trafic**) | fort | Piéton → pavé 4-6 cm, fondation 15 cm. Voiture légère → pavé 6-8 cm, fondation 20-30 cm. Voirie poids lourds → hors périmètre (étude). | Mots du devis (« allée », « terrasse » / « accès garage », « stationnement ») ; sinon question Q1 |
| neuf\_renovation | fort | Rénovation : dépose de l'ancien revêtement, fondation parfois réutilisable (−100 % de grave), regarnissage seul possible | Lignes « dépose », « démolition » du devis ; sinon question Q3 |
| geographie | moyen | Matériau régional (granit en Bretagne, grès en Alsace-Vosges, calcaire en Bourgogne, terre cuite dans le Nord), gel (classe « D » pour pavés et dalles), sable disponible | Adresse chantier → département (`commun/departements.json`) |
| gamme | moyen | Change le produit (béton standard / béton vieilli / pierre naturelle) et le format, donc le nombre d'unités au m² et le poids par palette | Désignation du devis ; jamais une question |
| epoque\_bati | nul | Sans effet sur un revêtement extérieur | Ignoré |

L'axe *type\_batiment* est réinterprété ici en **classe d'usage** : `pieton`, `vl` (voiture légère, charge par roue ≤ 25 kN), `pl` (poids lourds, bloqué : l'app dit qu'il faut une étude de dimensionnement). Le seuil 25 kN vient du guide CERIB pour la pose sur plots ([source](https://www.alkern.fr/wp-content/uploads/documents/Guide-de-pose-dalles-et-paves-Cerib.pdf)).

## 2. Règle d'or et unités de commande

**Règle d'or : aucune ligne du quantitatif n'est en m².** Le m² sert au calcul, jamais à la commande. Les pavés et dalles sortent en palettes (avec les m² de la palette en rappel), les bordures en unités, les granulats en tonnes ou en big-bags, les liants en sacs, le géotextile en rouleaux.

**Règle d'arrondi.** Toujours à l'unité de commande supérieure, après pertes. Exception pavés/dalles : si le reste après palettes entières est < 25 % d'une palette, proposer « N palettes + X m² au détail (si le négoce coupe les palettes) », bouton pour basculer sur N+1 palettes. *(règle produit à valider par un paveur)*

| Matériau | Unité de commande | Conversion depuis le calcul | Rappel affiché sur la ligne |
| --- | --- | --- | --- |
| Pavés, dalles béton | palette | m² après pertes ÷ m²/palette (fiche produit) | m² couverts, poids palette, nb de pièces |
| Pavés, dalles pierre naturelle | palette ou caisse (granit : souvent à la tonne) | m² ÷ m²/palette, ou t = m² × kg/m² ÷ 1000 | m², tonnage |
| Dalles grès cérame 20 mm | carton puis palette | m² ÷ m²/carton | m², nb de dalles |
| Bordures, caniveaux, pavés de rive | u (élément de 1 m en général ; 0,5 m en courbe) | ml × 1,03 ÷ longueur élément | ml couverts |
| Sable de lit de pose 0/4 ou 0/6,3 | t (vrac) ou big-bag ≈ 1 t | m³ = m² × épaisseur ; t = m³ × 1,6 *(à vérifier, sable sec foisonné)* | épaisseur retenue |
| Gravillons de lit de pose 2/4, 4/6,3, 2/6,3 | t ou big-bag | m³ × 1,5 *(à vérifier)* | épaisseur retenue |
| Grave non traitée (fondation) 0/20 ou 0/31,5 | t (camion benne) | m³ compacté × 2,1 t/m³ *(à vérifier selon carrière)* | épaisseur compactée |
| Sable de jointoiement 0/2 | sac 25 kg ou big-bag | kg = volume des joints × 1,6 + regarnissage | — |
| Sable polymère / joint prêt à l'emploi | sac ou seau (15, 20 ou 25 kg selon marque) | m² ÷ couverture du sac (fiche fabricant) | largeur et profondeur de joint |
| Ciment (sable stabilisé, mortier de pose, fondation bordure) | sac 35 kg (25 kg en GSB) | kg ÷ 35 | dosage retenu |
| Béton de fondation bordure C16/20 | m³ toupie (≥ 1 m³) ou sacs de béton prêt 35 kg | m³, ou sacs = m³ × 2 200 ÷ 35 *(à vérifier rendement sac)* | section de fondation |
| Géotextile | rouleau (largeur × longueur fiche produit) | m² × 1,10 ÷ m²/rouleau | recouvrement 30 cm |
| Plots réglables (terrasse sur plots) | u ou carton | voir formule section 5 | hauteur de réglage |
| Croisillons / écarteurs | sachet | 1 par croisement de joints | — |
| Disques diamant | u | 1 par tranche de 50 ml de coupe *(à valider)* | — |

**Ce que le négoce doit lire sans rappeler** : référence ou désignation complète (matériau, format L × l × épaisseur, teinte), nombre de palettes, et une ligne « livraison : X t au total, accès camion grue ? » car un chantier de pavage pèse vite 10 à 20 tonnes.

## 3. Ouvrages, vocabulaire des devis et pièges

Sept ouvrages couvrent l'essentiel des devis de particuliers. Chaque ligne de devis doit tomber dans l'un d'eux via `vocabulaire.json` ; sinon l'IA pose une question.

### ouvrages.json (résumé)

| Code ouvrage | Ce que c'est | Couches à quantifier (de bas en haut) | Unité de métré du devis |
| --- | --- | --- | --- |
| `pavage_souple` | Pavés posés sur sable ou gravillons, joints sable | géotextile → grave → lit de pose → pavés → sable de joint | m² |
| `dallage_souple` | Dalles posées sur sable ou gravillons | idem, joints ≥ 5 mm | m² |
| `pavage_scelle` / `dallage_scelle` | Pavés ou dalles sur mortier ou béton, joints mortier | (grave) → dalle ou béton de pose → mortier 4 cm → éléments → mortier de joint | m² |
| `dallage_plots` | Dalles sur plots réglables (terrasse sur dalle béton ou étanchéité) | plots → dalles (grès 20 mm ou béton) | m² |
| `bordure` | Bordures et caniveaux scellés sur béton | fondation béton → bordure → solin → joints | ml |
| `pas_japonais` | Dalles isolées dans gazon ou gravier | lit de sable → dalle | u ou ml de cheminement |
| `rejointoiement` | Réfection des joints d'un pavage existant | nettoyage → sable ou sable polymère | m² |

### vocabulaire.json (extraits)

| Le devis écrit | Ouvrage | Ce que l'app en déduit |
| --- | --- | --- |
| « allée pavée », « pavage », « pavés autobloquants », « pavés drainants » | `pavage_souple` | usage piéton sauf mot « garage », « voiture », « stationnement » |
| « cour carrossable », « accès garage », « entrée de propriété », « parking » | `pavage_souple` | usage `vl` → pavé ≥ 6 cm, fondation 25 cm |
| « terrasse en dalles », « dallage extérieur », « dalles gravillonnées », « dalles pierre » | `dallage_souple` ou `dallage_scelle` | si « scellé », « sur chape », « sur dalle béton » → scellé |
| « terrasse sur plots », « dalles sur plots », « toit-terrasse » | `dallage_plots` | support existant = dalle ou étanchéité, pas de grave |
| « pavés granit », « pavés de Bretagne », « pavés porphyre », « grès », « Luserne » | même ouvrage, gamme pierre naturelle | joint 8-10 mm, poids élevé |
| « bordure P1 », « T1 », « T2 », « A2 », « CS1 », « bordurette », « volige de rive » | `bordure` | type → dimensions (section 4) |
| « fil d'eau », « caniveau CC1 / CS2 », « caniveau à grille » | `bordure` (caniveau) | caniveau à grille = article à la pièce |
| « décaissement », « terrassement », « évacuation » | renvoi tiroir *terrassier* | ne rien quantifier ici, mais lire la profondeur |
| « hérisson », « tout-venant », « GNT », « grave 0/31,5 », « concassé » | couche de fondation | épaisseur indiquée = épaisseur compactée |
| « sable de pose », « lit de sable », « sable 0/4 », « sable de Loire » | lit de pose | épaisseur 3 cm par défaut |
| « sable polymère », « joint perméable », « joint résine » | joint spécial | sacs ou seaux, pas de sable 0/2 |
| « opus incertum », « opus romain », « pose à l'anglaise », « chevrons », « arc de cercle » | appareillage | modifie les pertes, pas le nombre de m² |

### Pièges à connaître

1. **Le m² du devis inclut souvent les bordures.** Si une ligne de bordures existe, retirer la bande de bordure (largeur × ml) de la surface pavée seulement si le devis le précise ; sinon garder la surface telle quelle et afficher l'hypothèse.
2. **« Pavés autobloquants » en 6 cm pour un accès garage** : conforme pour voiture légère ; en 4 cm, l'app alerte (risque de casse).
3. **Un mot-clé « opus » ou « pose en arc »** fait monter les pertes de 5 % à 10-15 % (section 5).
4. **Pierre naturelle vendue à la tonne** (granit en vrac, porphyre) : convertir via le poids au m², jamais en palettes standard.
5. **Pose scellée sur une ancienne dalle béton** : pas de grave, pas de géotextile ; le devis le dit rarement → question Q2.
6. **Les pavés drainants** demandent des gravillons 2/6,3 en lit et en joint, jamais de sable fin (colmatage) ([source](https://ceralit-tp.fr/wp-content/uploads/2021/08/NOTICE-DE-POSE-DES-PAVES.pdf)).
7. **Le terrassement est souvent sur une ligne à part** : sa profondeur (ex. « décaissement 30 cm ») sert à vérifier l'épaisseur de grave = profondeur − épaisseur pavé − lit de pose.

## 4. Matériaux et fiches fabricant

Le chiffre clé de chaque fiche est le **m² par palette** (ou le nombre de pièces par m²) et le **poids** : c'est ce qui transforme une surface en palettes et en camion. Les valeurs ci-dessous sont transcrites des fiches officielles ouvertes le 3 oct. 2026 ; toute ligne sans lien est « à vérifier ».

### 4.1 Pavés béton (NF EN 1338)

| Produit (fabricant) | Format L × l × ép. (cm) | Usage | kg/m² | Pièces/m² | m²/palette | Pièces/palette | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pavé I (Alkern) | 16,5 × 19,8 × 4,5 | piéton uniquement | 98 | 36 | 15,43 | 540 | [fiche](https://www.alkern.fr/wp-content/uploads/documents/Alkern-Fiche-technique-Pave-I-210x297-V1k-1.pdf) |
| Pavé I (Alkern) | 16,5 × 19,8 × 6 | VL (classe T5) | 146 | 36 | 11,62 | 420 | [fiche](https://www.alkern.fr/wp-content/uploads/documents/Alkern-Fiche-technique-Pave-I-210x297-V1k-1.pdf) |
| Parabloc (Alkern) | 20 × 20 × 6 | VL | 135 | 25 *(calcul)* | à vérifier | à vérifier | [page](https://www.alkern.fr/products/parabloc/) |
| Parabloc (Alkern) | 10 × 20 × 8 / 20 × 20 × 8 | VL intensif | 180 | 50 / 25 *(calcul)* | à vérifier | à vérifier | [page](https://www.alkern.fr/products/parabloc/) |
| Vaudois multiformat (Alkern) | 9 formats, largeur 12,5 × 6 | VL | 138 | variable | 10 | 470 | [fiche](https://www.alkern.fr/wp-content/uploads/documents/Alkern-Fiche-technique-Pave-Vaudois-210x297-v1e-2.pdf) |
| Campus (Alkern) | 20 × 20 × 6,3 | VL | ≈ 135 (5,4 kg/pièce) | 25 | à vérifier | à vérifier | [Point.P](https://www.pointp.fr/p/terrasses-et-exterieurs/pave-sol-exterieur-beton-circulable-campus-anthracite-20x20-cm-ep-6-3-cm-A4001618) |
| Opus Argens multiformat (Alkern) | 20×20 à 40×40 × 6 | VL | à vérifier | multiformat | à vérifier (palette 1 296 kg) | — | [Point.P](https://www.pointp.fr/p/decoration-exterieure/pave-beton-multi-formats-argens-alkern-ep-6-cm-ton-ardoise-A3351506) |

Règle générale tirée des fiches : **4 à 4,5 cm = piéton seulement ; 6 cm = voiture légère ; 8 cm = trafic plus intensif**. Ordre de grandeur du poids : ≈ 23 kg/m² par cm d'épaisseur (98 kg à 4,5 cm, 146 kg à 6 cm, 180 kg à 8 cm).

Attention au m² des fiches Alkern : pour un produit **sans écarteur**, la surface annoncée est la surface nette du pavé, il faut ajouter la largeur des joints ; **avec écarteurs**, c'est la surface couverte dans le calepinage ; en multiformat, c'est une surface « environ » ([notice de pose Alkern 2026](https://www.alkern.fr/wp-content/uploads/documents/NOTICE-DE-POSE-PAVES-2026.pdf)).

### 4.2 Pavés pierre naturelle (NF EN 1342) et terre cuite (NF EN 1344)

| Produit | Format (cm) | Poids | Pièces/m² | Conditionnement | Source |
| --- | --- | --- | --- | --- | --- |
| Pavé granit gris éclaté (Pierres de l'Est) | 10 × 10 × 8 | 1,83 kg/pièce (≈ 150 kg/m² posé avec joint 1 cm) | 100 à joint nul ; **≈ 83 avec joint 1 cm** | palette de 7,32 m² | [Point.P réf. 237606](https://www.pointp.fr/p/decoration-exterieure/pave-granit-gris-eclate-10x10x8cm-ref-237606-A3379295) |
| Pavé granit gris-bleu | 9 × 9 × 7-9 | à vérifier | ≈ 100 avec joint | à vérifier | [Point.P](https://www.pointp.fr/c/paves-beton/x4snv4_dig_2014898/page-2) |
| Pavé Luserne trié | 8/10 × 8/10 × 8/10 | à vérifier | à vérifier | souvent vendu à la tonne | [Point.P](https://www.pointp.fr/c/paves-pierre-naturelle/x4snv4_dig_2014899/page-2) |
| Pavé terre cuite Penter (Wienerberger) | 20 × 10 × 5,2 | 2,30 kg/pièce | ≈ 48 à plat | à vérifier | [fiche](https://www.bouwkampioen.be/nl/mwdownloads/download/link/id/4428) |
| Pavé terre cuite Penter WNF | 20 × 10 × 7,1 | 3,10 kg/pièce | ≈ 48 à plat | à vérifier | [fiche](https://www.bouwkampioen.be/nl/mwdownloads/download/link/id/4428) |
| Pavé terre cuite Arte (Wienerberger) | 20,1 × 4,8 × 8,7 | 1,65 kg/pièce | ≈ 56 à plat, ≈ 101 sur chant | à vérifier | [fiche](https://gobert.groupegobert.com/ressources/images/articles/Fiches_techniques/WIENERBERGER%20FT%20ARTE%20POURPRE.pdf) |

Pour la pierre, le moteur calcule toujours pièces/m² = 1 / \[(L + j) × (l + j)\], car les fiches donnent souvent la valeur à joint nul alors qu'un pavé éclaté se pose à 8-10 mm.

### 4.3 Dalles

| Produit | Format (cm) | Poids | Unités/m² | Conditionnement | Source |
| --- | --- | --- | --- | --- | --- |
| Dalle grès cérame 20 mm | 60 × 60 × 2 | 15,6 à 16,9 kg/dalle ; ≈ 47 kg/m² | 2,78 | lot de 2 (0,72 m²) ; palette de 60 dalles (21,6 m²) | [plots-direct](https://www.plots-direct.com/produit/dalles-gres-cerame-60x60/), [plots-discount](https://www.plots-discount.com/fr/geotextile/1685-geotextile-100g-m-rouleau-2m-x-25m-50m-3700125912741.html) |
| Dalle béton jardin (gammes Alkern Cluny, Abbaye, Calcara…) | 40 × 40, 50 × 50, 40 × 60, multiformat | à vérifier par gamme | 6,25 / 4 / 4,17 | palette à vérifier | [gammes Alkern](https://www.alkern.fr/products/pave-i/) |
| Dalle gravillonnée classe T7 | 40 × 40 × 4,5 / 50 × 50 × 5 | à vérifier | 6,25 / 4 | à vérifier | [Alkern](https://www.alkern.fr/products/pave-i/) |

### 4.4 Bordures et caniveaux (NF EN 1340 + NF P98-340/CN)

| Profil | Section l × h (cm) | Longueur | Poids/pièce | Pièces/palette | Source |
| --- | --- | --- | --- | --- | --- |
| P1 | 8 × 20 | 1 m | 34 à 39 kg | 36 à 44 | [Ciffreo Bona](https://www.ciffreobona.fr/userfiles/file/fiches_technique/lib_voirie/ft_bordure_lib.pdf), [Betag](https://www.betag.fr/bordures/) |
| P2 | 6 × 28 | 1 m | 39 à 40 kg | 28 | [Ciffreo Bona](https://www.ciffreobona.fr/userfiles/file/fiches_technique/lib_voirie/ft_bordure_lib.pdf) |
| T1 | 12 × 20 | 1 m | 52 à 53 kg | 32 | [Heinrich Bock](https://heinrich-bock.com/app/uploads/2020/06/BORDURE-T1-T2.pdf) |
| T2 | 15 × 25 | 1 m | 74 à 85 kg | 18 | [Heinrich Bock](https://heinrich-bock.com/app/uploads/2020/06/BORDURE-T1-T2.pdf), [Mialanes](https://www.groupe-mialanes.fr/fr/activites/mialanes/travaux-publics/bordures-caniveaux/documents/bordures-t2.pdf) |
| T3 | 17 × 28 | 1 m | 113 kg | 18 | [Heinrich Bock](https://heinrich-bock.com/app/uploads/2020/06/BORDURE-T1-T2.pdf) |
| A2 | 20 × 15 | 1 m | 68 à 70 kg | 24 à 30 | [Betag](https://www.betag.fr/bordures/), [Vibromat](http://www.vibromat.com/telechargements/DOC-BORDURES.pdf) |
| CS1 (caniveau) | 40 × 10 | 1 m | 52 kg | 24 | [Betag](https://www.betag.fr/bordures/) |

Les profils normalisés P1 8 × 20, P2 6 × 28, T1 12 × 20, T2 15 × 25, T3 17 × 28 sont confirmés par [Point.P](https://www.pointp.fr/c/bordure-beton/x3snv3_dig_2035168). Bordurettes de jardin (Alkern « Bordurette lisse à emboîtement », « Rondin ») : dimensions à vérifier.

### 4.5 Granulats, liants, joints, accessoires

| Produit | Spécification | Conditionnement négoce | Rendement / densité | Source |
| --- | --- | --- | --- | --- |
| Sable de lit de pose | NF EN 13242, 0/4 ou 0/6,3, fines ≤ 7 % | vrac (t) ou big-bag ≈ 1 t | 1,6 t/m³ *(à vérifier)* | [guide CERIB](https://www.alkern.fr/wp-content/uploads/documents/Guide-de-pose-dalles-et-paves-Cerib.pdf) |
| Gravillons de lit de pose | 2/4, 4/6,3 ou 2/6,3 ; Los Angeles ≤ 25 | vrac ou big-bag | 1,5 t/m³ *(à vérifier)* | [guide CERIB](https://www.alkern.fr/wp-content/uploads/documents/Guide-de-pose-dalles-et-paves-Cerib.pdf) |
| Sable de joint | NF EN 13242, 0/2 ou 0/4 | sac 25 kg ou big-bag | — | [guide CERIB](https://www.alkern.fr/wp-content/uploads/documents/Guide-de-pose-dalles-et-paves-Cerib.pdf) |
| Tout-venant / GNT | 0/31,5 | vrac (t) | 2,1 t/m³ compacté *(à vérifier)* | [notice Alkern](https://www.alkern.fr/wp-content/uploads/documents/NOTICE-DE-POSE-PAVES-2026.pdf) |
| Sable de jointoiement polymère SD+ NextGel (Techniseal) | joints 2 à 10 mm, éléments ≥ 20 mm d'épaisseur | sac 25 kg | 25 kg ≈ 10 à 15 m² de pavés ; 1 kg = 0,6 L de joint | [fiche Techniseal](https://techniseal.com/pub/media/catalog/product/pdf/f/t/ft_40101149_sd__nextgel_fr.pdf) |
| Ciment | CEM I ou CEM II 32,5 / 42,5 | sac 35 kg | sable stabilisé : 75 à 100 kg/m³ de sable sec | [guide CERIB](https://www.alkern.fr/wp-content/uploads/documents/Guide-de-pose-dalles-et-paves-Cerib.pdf) |
| Béton de fondation bordure | C16/20 | toupie (m³) ou sacs | — | [guide CERIB](https://www.alkern.fr/wp-content/uploads/documents/Guide-de-pose-dalles-et-paves-Cerib.pdf) |
| Géotextile non-tissé 100 g/m² | classe A15 (Bidim One4) | rouleau 2 × 25 m (50 m²) ; aussi 2 × 50 m (100 m²) | 0,07 kg/m² | [Point.P Bidim One4](https://www.pointp.fr/p/decoration-exterieure/geotextile-one4-tencate-bidim-geosynthetics-rouleau-l-25-m-l-2-m-A1787427) |
| Plot réglable Jouplast Essentiel | gammes 20-30 mm à 140-230 mm ; tête Ø 120 ; 4 écarteurs 3 mm | u ou carton | 6/m² (40 × 40), 4/m² (50 × 50), 3/m² (60 × 60) | [Chausson](https://www.chausson.fr/materiaux/plot-reglable-dalle-terrasse-essentiel-jouplast-mm-p-693061-1) |
