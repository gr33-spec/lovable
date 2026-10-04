# Référentiel quantitatif CONSTRUCTEUR DE MAISONS / ENTREPRISE GÉNÉRALE (Rappidos)

Oct 3, 2026 · @Greg

## 0. Statut et principe d'orchestration

Ce tiroir `entreprise-generale/` ne recalcule rien de ce qu'un autre tiroir sait déjà faire : il découpe le devis en lots, envoie chaque lot au tiroir métier concerné, calcule lui-même les lots qui n'ont pas encore de tiroir, puis fusionne tout en un seul quantitatif classé par phase de chantier et par fournisseur. Statut : V0.1 du 3 oct. 2026, format section 27 du référentiel couverture, à faire relire par un conducteur de travaux de maisons individuelles. Toute valeur sans lien de source est marquée « à vérifier ».

**Principe d'orchestration (nouveau dans le gabarit).** Le constructeur de maisons est le seul métier qui « reprend tous les métiers ». Son tiroir déclare donc un champ `delegue_a` par lot. Le moteur reste générique : il ne sait pas qu'il traite une maison, il lit une table de routage.

| Lot du devis | Tiroir qui calcule | État du tiroir au 3 oct. 2026 |
| --- | --- | --- |
| Terrassement, fouilles, remblais, évacuation | `terrassement/` | rédigé |
| Fondations, soubassement, dallage, élévation, planchers, linteaux | `maconnerie/` | rédigé |
| Charpente, couverture, zinguerie, écran, fenêtres de toit | `couverture/` (+ charpente ici, §3.4) | rédigé (couverture) |
| Carrelage, faïence, chape de pose | `carrelage/` | rédigé |
| Peinture, toile de verre, enduits intérieurs | `peinture/` | rédigé |
| Plâtrerie, cloisons, doublages, plafonds, isolation des combles | ici (§3.5, §4.2, §5.5) | à créer en tiroir propre |
| Menuiseries extérieures et intérieures, portes de garage | ici (§3.6) | à créer |
| Électricité NF C 15-100 | ici (§3.7, §5.7) | à créer |
| Plomberie, sanitaires, ventilation, chauffage | ici (§3.8, §5.8) | à créer |
| Enduit de façade, ravalement | ici (§3.9, §5.9) | à créer |
| Chape fluide, isolant sous chape | ici (§3.10) | à créer |
| Réseaux VRD : assainissement, eaux pluviales, gaines, regards | ici (§3.11) | à créer |

Règle de fusion : une même référence venue de deux tiroirs (ex. ciment pour fondations et pour seuils) est additionnée avant l'arrondi au conditionnement, jamais après. Arrondir deux fois fait commander un sac de trop par lot.

## 1. Métier et axes de variation

Le constructeur de maisons (CCMI, loi du 19 déc. 1990) et l'entreprise générale vendent un ouvrage complet, de la fouille aux finitions, et sous-traitent souvent une partie des lots. Pour l'app, cela change deux choses : le devis est long (souvent 15 à 60 pages, 200 à 600 lignes) et une partie des lots ne se commande pas au négoce mais à un fabricant sur plan (charpente industrielle, menuiseries, prédalles).

**Fiche `metier.json`** : `id: entreprise-generale`, `orchestrateur: true`, `delegue_a` = table du statut ci-dessus, `unites_dominantes: [u, sac, palette, m3_toupie, ml, botte, rouleau, couronne]`.

| Axe | Poids | Ce qu'il change pour le quantitatif | Résolu comment |
| --- | --- | --- | --- |
| `neuf_renovation` | fort | En neuf : tous les lots, pas de dépose. En rénovation lourde : dépose, reprises, raccords, matériaux « à l'ancienne » (chaux, brique pleine). Change 30 à 60 % des lignes. | déduit du devis (« démolition », « dépose », « existant ») ; sinon question Q1 |
| `geographie` | fort | Mur en parpaing, brique terre cuite, béton cellulaire ou pierre ; couverture régionale ; zone thermique H1/H2/H3 ; zone sismique ; neige et vent sur charpente. | adresse du chantier → département → `commun/departements.json` |
| `type_batiment` | moyen | Plain-pied ou étage (plancher intermédiaire, escalier, échafaudage) ; garage accolé ; vide sanitaire, sous-sol ou dallage sur terre-plein. | déduit des lignes (« plancher hourdis R+1 », « vide sanitaire ») ; sinon Q2 et Q3 |
| `gamme` | moyen | Change le produit, pas la méthode : PVC ou alu, carrelage 60×60 ou 120×60, isolant laine de verre ou biosourcé. | lu dans le devis (les CCMI listent les marques) ; jamais demandé |
| `epoque_bati` | nul en neuf, fort en réno | En rénovation : ce qu'on trouve en déposant (pierre, plancher bois, plomb). | pas de question en neuf ; délégué aux tiroirs en réno |
| `mode_constructif` | fort (axe ajouté) | Maçonnerie traditionnelle, béton cellulaire collé, brique rectifiée collée, ossature bois. Change le mortier (sacs) ou la colle (seaux), les linteaux, les chaînages. | lu dans le devis ; sinon Q2 |

Axe ajouté au gabarit : `mode_constructif`. Il existe peut-être déjà côté `maconnerie/` ; si oui, le tiroir orchestrateur le lit et le transmet, il ne le redéclare pas (à vérifier avec le tiroir maçonnerie).

Règle de transmission : un axe résolu une fois (département, neuf/réno) est passé à tous les tiroirs délégués. L'artisan ne doit jamais entendre deux fois la même question parce que deux tiroirs la déclarent.

## 2. Règle d'or et unités de commande

**Règle d'or (commune) : jamais une surface ni un volume théorique comme unité de commande.** Chaque ligne sort dans l'unité que le négoce ou le fabricant facture et livre, avec son format. « 145 m² de cloison » n'est pas une ligne ; « 62 plaques BA13 1,20 × 2,50 + 48 montants M48 3,00 m + 14 rails R48 3,00 m » en est une.

**Trois règles propres à l'orchestrateur.**

1. **Une ligne = un fournisseur probable.** Le quantitatif est découpé en paquets : négoce matériaux (gros œuvre), négoce plâtrerie-isolation, distributeur électrique, distributeur sanitaire-chauffage, centrale à béton, fabricants sur plan. Chaque paquet part vers les fournisseurs que l'artisan a cochés pour ce paquet.
2. **Ce qui se commande sur plan ne se calcule pas, il se décrit.** Charpente industrielle (fermettes), menuiseries, escalier, prédalles, poutrelles-hourdis sur calepinage fabricant : l'app sort une ligne « à chiffrer sur plan » avec toutes les cotes lues dans le devis, et joint l'annexe sans prix. Elle ne devine jamais un nombre de fermettes.
3. **Le béton se commande en m³ toupie, arrondi au 0,5 m³ supérieur** (à vérifier auprès des centrales : certaines facturent au 0,25 m³ et appliquent un minimum de 3 à 4 m³ ou un supplément « petite quantité »). En dessous de 1 m³, l'app propose la fabrication sur place (sacs de ciment + sable + gravier ou sacs de béton prêt à gâcher).

| Famille | Unité de commande | Format type négoce | Exemple de ligne |
| --- | --- | --- | --- |
| Béton prêt à l'emploi | m³ toupie (classe + consistance) | C25/30 XC1 S3 ; pompe en option | « Béton C25/30 S3 : 9,5 m³ (fondations) » |
| Ciment, mortier, colle, enduit | sac | 25 ou 35 kg ; palette 40 à 56 sacs | « Ciment CEM II 32,5 sac 35 kg : 18 sacs » |
| Sable, gravier | t ou big-bag | big-bag ≈ 1 t ; vrac à la tonne | « Sable 0/4 : 2 big-bags » |
| Blocs, briques | u (palette entière ou détail) | parpaing 20×20×50 : palette 60 u (à vérifier négoce) | « Bloc B40 20×20×50 : 1 140 u = 19 palettes » |
| Aciers | barre, panneau, u | HA en barres de 6 m ; treillis 2,40 × 6,00 m ; chaînages préfabriqués 6 m | « Treillis ST25C 2,40×6,00 : 12 panneaux » |
| Bois de charpente et liteaux | ml par longueur ou u | sections × longueurs commerciales | « Lisse basse 45×145 L 4,00 m : 9 u » |
| Plaques de plâtre | u (plaque) | 1,20 × 2,50 ou 2,60 ou 2,70 m | « BA13 1,20×2,60 : 74 plaques » |
| Ossatures métalliques | u (barre) par longueur | 3,00 m standard | « Montant M48 3,00 m : 96 u » |
| Isolants | rouleau, panneau, paquet, sac | rouleau ou paquet de m² indiqué | « Laine de verre 200 mm rouleau 4,6 m² : 22 rouleaux » |
| Câbles, gaines, tubes | couronne ou touret | couronne 100 m (câble, ICTA) ; couronne 50/100 m (PER) | « Gaine ICTA Ø20 couronne 100 m : 9 » |
| Appareillage, sanitaires, menuiseries | u | référence + dimensions | « Fenêtre PVC 2 vantaux 125×120 (H×L) : 3 » |
| Tubes PVC évacuation | barre | 4 m ou 3 m selon Ø | « PVC CR8 Ø125 barre 4 m : 8 » |

Les conditionnements chiffrés de ce tableau sont repris et sourcés au chapitre 4 ; ceux qui n'y sont pas sourcés restent « à vérifier » dans `materiaux.json`.

## 3. Ouvrages, vocabulaire des devis et pièges

Un devis de constructeur se lit d'abord par **lot**, ensuite par ouvrage. L'IA d'extraction repère les titres de lot (souvent numérotés : « Lot 01 Terrassement », « 3. Gros œuvre ») puis rattache chaque ligne à un ouvrage de `ouvrages.json`. Un mot inconnu déclenche une question, jamais une supposition.

### 3.1 Lots délégués (rappel du vocabulaire de routage seulement)

| Lot | Mots qui routent vers le tiroir | Piège de routage |
| --- | --- | --- |
| Terrassement | « décapage », « fouilles en rigole », « déblais », « remblai », « évacuation des terres », « plateforme » | « tranchées VRD » va au lot réseaux (§3.11), pas aux fouilles |
| Gros œuvre | « semelles filantes », « béton de propreté », « soubassement », « vide sanitaire », « hourdis », « poutrelles », « élévation », « agglos », « linteaux », « chaînages », « appuis de fenêtre » | « plancher » seul peut être hourdis (maçon), bois (charpentier) ou chape (carreleur) : lire les mots voisins |
| Couverture | « tuiles », « ardoises », « zinguerie », « écran sous-toiture », « faîtage », « Velux » | « couverture » en tête de lot inclut souvent la charpente : la séparer (§3.4) |
| Carrelage | « carrelage », « faïence », « plinthes », « grès cérame », « chape de ravoirage » | « chape fluide anhydrite » est un lot à part (§3.10) |
| Peinture | « peinture », « impression », « toile de verre », « bandes et enduits de finition » | « enduit » seul : intérieur (peintre) ou façade (§3.9) → lire le lot |

### 3.2 Gros œuvre : ce que l'orchestrateur vérifie lui-même

Il ne calcule pas les quantités, mais il contrôle la cohérence entre lots : périmètre des fondations ≈ périmètre des murs ; surface du dallage ≈ emprise au sol ; surface de plancher haut ≈ surface habitable de l'étage. Un écart de plus de 15 % déclenche une question (« Le garage est-il compris dans le dallage ? »). *(seuil à vérifier avec un conducteur de travaux)*

### 3.3 Ouvrages calculés dans ce tiroir

| Ouvrage (`id`) | Vocabulaire des devis | Pièges |
| --- | --- | --- |
| **3.4 Charpente industrielle** `charpente_fermettes` | « charpente fermettes », « fermes industrielles », « W », « fermettes à entrait porteur », « charpente traditionnelle » | Industrielle = commandée sur plan au fabricant, l'app ne compte pas les fermettes. Traditionnelle = charpentier, hors périmètre V0. |
| **3.5 Plâtrerie** `cloison_distribution`, `doublage_colle`, `doublage_ossature`, `plafond_suspendu` | « cloison 72/48 », « Placostil », « Placopan », « doublage 10+100 », « complexe PSE », « faux plafond F530 », « BA13 hydro », « plaque H1 » | « 10+80 » = complexe plâtre + isolant collé, pas une cloison. « Placopan » = cloison alvéolaire, pas d'ossature. Plafond « sous fermettes » = fourrures F530 + suspentes. |
| **Isolation des combles** `isolation_combles` | « laine soufflée », « R = 7 », « 320 mm », « laine de verre déroulée », « pare-vapeur » | Une épaisseur ou un R : convertir via la fiche (λ). « Soufflée » se commande en sacs, pas en rouleaux. |
| **3.6 Menuiseries** `menuiserie_ext`, `porte_int`, `porte_garage` | « fenêtre PVC 2 vtx », « baie coulissante », « porte d'entrée », « volet roulant », « bloc-porte », « porte sectionnelle » | Tout est sur mesure : sortir H × L, sens, couleur, type de pose. Ne jamais regrouper deux tailles. |
| **3.7 Électricité** `elec_logement` | « installation électrique NF C 15-100 », « tableau », « prises 16 A », « points lumineux », « VMC », « Consuel » | Le devis donne souvent un forfait : compter les points pièce par pièce depuis le plan ou le minimum normatif (§5.7). |
| **3.8 Plomberie, ventilation, chauffage** `plomberie_alim`, `evacuation_int`, `vmc`, `chauffage` | « PER », « multicouche », « nourrice », « ballon thermodynamique », « PAC air-eau », « VMC simple flux hygro B » | Les équipements (PAC, ballon) sont des lignes unitaires à la référence ; les tubes se comptent par point d'eau. |
| **3.9 Enduit de façade** `enduit_facade` | « enduit monocouche », « gratté », « taloché », « OC2 », « sous-enduit », « baguettes d'angle » | Surface de façade nette d'ouvertures, mais les tableaux (retours) s'ajoutent. |
| **3.10 Chape** `chape_fluide`, `isolant_sol` | « chape anhydrite », « chape fluide », « isolant sous chape PU 80 mm », « film polyane » | La chape fluide se commande en m³ à une entreprise spécialisée, souvent sous-traitée. |
| **3.11 Réseaux VRD** `assainissement`, `eaux_pluviales`, `fourreaux` | « raccordement tout-à-l'égout », « fosse toutes eaux », « regard 40×40 », « TPC Ø90 », « EP Ø100 » | Le linéaire n'est presque jamais dans le devis (souvent un forfait) : question Q4 ou hypothèse affichée. |

### 3.12 Lignes à garder sans rien commander

« Assurance dommages-ouvrage », « étude de sol G2 », « étude thermique RE2020 », « test d'étanchéité à l'air », « Consuel », « branchements concessionnaires », « nettoyage », « installation de chantier ». L'app les reconnaît, les classe « hors matériaux » et ne pose aucune question à leur sujet.

## 4. Matériaux et fiches fabricant sourcées

Seuls les lots calculés ici ont leurs fiches dans ce tiroir ; les fiches des lots délégués restent dans leur tiroir. Règle reprise du modèle : le conditionnement vient d'une fiche **négoce** quand elle existe, car c'est le négoce qui livre.

### 4.1 Plâtrerie (source principale : SNIP, fiche conseil n° 18, déc. 2024)

Le SNIP (syndicat des industriels du plâtre) publie des quantités moyennes par m² d'ouvrage, pertes de 5 % incluses, conformes au NF DTU 25.41. Ce sont les valeurs de référence du tiroir. [Fiche SNIP n° 18](https://www.lesindustriesduplatre.org/wp-content/uploads/2025/03/SNIP-FICHE-CONSEIL-18-VERSIONS-2025_V6-13fevrier.pdf)

| Produit | Format de commande | Poids | Source |
| --- | --- | --- | --- |
| Plaque BA13 standard | plaque 1,20 × 2,50 / 2,60 / 2,70 / 3,00 m | ≈ 9 kg/m² *(à vérifier fiche Placo)* | [Placo](https://www.placo.fr/professionnels/solution/sp00011111/cloisons-7248-1x-placoplatre-ba-13-1x-placoplatre-ba-13-stil-ml-48-50-04-double-ei30-38-db-365-m) |
| Plaque hydrofuge (H1, verte) | idem | idem | à vérifier |
| Montant M48 / M70 | barre de 3,00 m *(autres longueurs à vérifier négoce)* | — | Placo |
| Rail R48 / R70 | barre de 3,00 m | — | Placo |
| Fourrure F530 + suspentes + éclisses | barre 3,00 m ; u | — | SNIP |
| Vis TTPC 25 (plaque) / TRPF 13 (métal) | boîte *(contenance à vérifier : 1 000 courant)* | — | SNIP |
| Bande à joint papier | rouleau *(longueur à vérifier : 150 m)* | — | SNIP |
| Enduit à joint | sac 25 kg (poudre) ou seau (prêt à l'emploi) | — | [Placo PR4 25 kg](https://www.placo.fr/professionnels/solution/sp00011111/cloisons-7248-1x-placoplatre-ba-13-1x-placoplatre-ba-13-stil-ml-48-50-04-double-ei30-38-db-365-m) |

Consommation d'enduit donnée par le SNIP, par face : 350 g/m² en poudre, 450 g/m² en prêt à l'emploi (plaques de 1 200 mm).

### 4.2 Isolation des combles perdus : laine de verre à souffler Isover Comblissimo

Sac de 17,3 kg, 36 sacs par palette. Le nombre de sacs est **imposé par la certification ACERMI** : c'est un minimum, pas une estimation. [Fiche Comblissimo (Denis Matériaux)](https://media.denismateriaux.com/media/173561_comblissimo_fichetech.pdf)

| R visé (m².K/W) | Épaisseur mini installée | Pouvoir couvrant mini | Sacs mini / 100 m² |
| --- | --- | --- | --- |
| 7,0 | 330 mm | 3,80 kg/m² | 22 |
| 7,5 | 350 mm | 4,10 kg/m² | 23 |
| 8,0 | 375 mm | 4,30 kg/m² | 25 |

Autres R (5, 6, 9, 10) : dépliant Isover plus ancien, 16 / 19 / 28 / 31 sacs pour 100 m² *(à revérifier sur le certificat ACERMI en vigueur n° 07/D/18/474)*.

### 4.3 Enduit de façade : Weber weber.pral F (monocouche OC2)

Sac de 25 kg, palette filmée de 48 sacs (1 200 kg). Consommation en épaisseur conventionnelle : sur maçonnerie, 22 à 25 kg/m² en gratté et 26 à 28 kg/m² en rustique ou taloché ; sur béton ou sous-enduit, 15 à 17 kg/m² et 12 à 15 kg/m². [Fiche weber.pral F](https://www.queguiner.fr/external-media/sa-saint-gobain-weber-france/fiche/fiche-produit-weberpral-f.pdf)

### 4.4 Gros œuvre : fiches de contrôle (calcul délégué au tiroir maçonnerie)

| Produit | Format de commande | Poids | Source |
| --- | --- | --- | --- |
| Treillis soudé ST25C (dallage maison individuelle) | panneau 6,00 × 2,40 m = 14,40 m², maille 150 × 150, fil Ø 7 | 57,98 kg | [Launay Matériaux](https://www.groupelaunaymateriaux.fr/produit/px-treillis-st25c-maille-15-15-VFJFSUxMSVNTVDI1Qw==) |
| Béton prêt à gâcher weber béton | sac 35 kg (palette 36) ou 25 kg (palette 48) ; dosé 350 kg de ciment/m³ | — | [Fiche Weber](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1405443.pdf) |

### 4.5 Électricité

| Produit | Format de commande | Source |
| --- | --- | --- |
| Gaine ICTA préfilée Ø20 3G2,5 (prises) | couronne 100 m, ≈ 15,3 kg | [La Plateforme du Bâtiment](https://www.laplateforme.com/catalogue/produit/96551/gaine-prefilee-icta-gris-o-20-mm-3-x-2-5-rouleau-de-100-m) |
| Gaine ICTA préfilée Ø16 ou Ø20 3G1,5 (éclairage) | couronne 100 m | [Elec44 Preflex](https://elec44.fr/4055-gaines-electriques-icta-prefilees) |
| Gaine ICTA préfilée Ø20 3G2,5 + 1×1,5 (va-et-vient, volets) | couronne 100 m | [Domomat](https://www.domomat.com/8975-couronne-100m-gaine-prefilee-icta-3422-d20-3g25mm-brvj-fils-et-cables-generiques-tue20020020.html) |
| Gaine préfilée RJ45 Cat6 | couronne 50 m | Elec44 |
| Câble 3G6 (cuisson), 3G10 / 3G16 (alimentation tableau) | couronne ou au mètre *(à vérifier négoce)* | à vérifier |
| Tableau, disjoncteurs, interrupteurs différentiels, appareillage, boîtes d'encastrement, DCL | u | marque lue dans le devis |

### 4.6 Plomberie

| Produit | Format de commande | Source |
| --- | --- | --- |
| Tube PER prégainé 16 × 1,5 (bleu / rouge) | couronne 50 m (aussi 15, 25, 100 m) | [Bricomarché](https://www.bricomarche.com/c/plomberie-et-sanitaire/tube-et-raccord/tube-et-raccord-per/tube-et-couronne-per/131041) |
| Tube PER prégainé 20 × 1,9 | couronne 25 ou 50 m | idem |
| Tube PER 25 × 2,3 (alimentation générale) | couronne 50 m | idem |
| Collecteur (nourrice) 4 à 8 départs, raccords à sertir | u | marque lue dans le devis |
| Tube PVC évacuation Ø32, 40, 100 | barre *(4 m ou 3 m selon Ø, à vérifier négoce)* | à vérifier |

### 4.7 Lots commandés sur plan (aucune fiche de quantité)

Fermettes industrielles, menuiseries extérieures, portes intérieures, escalier, poutrelles et hourdis (calepinage fabricant), volets roulants. `materiaux.json` contient pour eux une **liste de cotes à transmettre**, pas un rendement.

## 5. Règles de calcul DTU, formules et pertes

Toutes les règles sont des fonctions pures de `regles.json`, une par ouvrage, testables seules. Notation : `S` surface en m², `L` longueur en m, `H` hauteur en m, `ceil` arrondi à l'entier supérieur. Les ratios SNIP incluent déjà 5 % de pertes : ne pas les majorer une seconde fois.

### 5.1 Orchestration et fusion

1. Découper le devis en lots (§3), router chaque lot vers son tiroir, recevoir des quantités **brutes non arrondies**.
2. Additionner par référence identique (même produit, même format), tous lots confondus.
3. Arrondir une seule fois au conditionnement, puis appliquer la règle « palette entière » si le reste dépasse 80 % d'une palette *(seuil à valider avec un négoce)*.
4. Classer par paquet fournisseur et par phase : fondations → élévation → hors d'eau → hors d'air → second œuvre → finitions → extérieurs.

### 5.2 Contrôles de cohérence entre lots (aucune quantité, seulement des alertes)

| Contrôle | Règle | Action |
| --- | --- | --- |
| Périmètre fondations vs murs | écart > 15 % | question à l'artisan |
| Dallage vs emprise au sol | écart > 15 % | question « garage compris ? » |
| Surface plafonds vs surface habitable | écart > 20 % | alerte affichée |
| Nombre de fenêtres du lot menuiserie vs ouvertures déduites du lot maçonnerie | différent | alerte affichée |

Seuils à faire valider (§11).

### 5.3 Charpente industrielle (DTU 31.3) : une ligne « sur plan »

L'app ne commande pas de fermettes. Elle produit une ligne fabricant avec : longueur et largeur du bâtiment, pente (degrés), débords, type de couverture (poids au m², repris du tiroir couverture), comble perdu ou aménageable, zone neige et vent (depuis le département). À titre d'information seulement : nombre de fermettes ≈ ceil(L / 0,60) + 1 pour un entraxe de 60 cm *(entraxe courant, à vérifier)*.

### 5.4 Plâtrerie (NF DTU 25.41, ratios SNIP)

Cloison distributive 72/48, 1 BA13 par face, montant simple entraxe 60 cm, par m² de cloison : plaque 2,10 m² ; montant 2,10 ml ; rail 0,84 ml ; isolant 1,05 m² ; 30 vis TTPC ; 2 vis TRPF ; bande 3,47 ml. Entraxe 40 cm : montant 2,89 ml et 37 vis TTPC. Contre-cloison sur montant 1 BA13 entraxe 60 : plaque 1,05 m² ; montant 2,10 ml ; rail 0,84 ml ; 15 vis TTPC ; bande 1,73 ml. Plafond BA13 sur fourrures entraxe 60 : plaque 1,05 m² ; fourrure 1,79 ml ; suspentes 1,56 ; cornière 0,47 ml ; éclisses 0,21 ; 12 vis TTPC ; 4 TRPF ; bande 1,58 ml. (Fiche SNIP n° 18.)

Conversion en unités de commande :

```latex
N_{plaques} = \left\lceil \frac{S \times r_{plaque}}{1{,}20 \times L_{plaque}} \right\rceil \quad \text{avec } L_{plaque} \geq H
```

```latex
N_{montants} = \left\lceil \frac{S \times r_{montant}}{H} \right\rceil \ \text{barres de longueur} \geq H \quad N_{rails} = \left\lceil \frac{S \times r_{rail}}{3{,}00} \right\rceil
```

Un montant est toute hauteur (SNIP : pas d'aboutage sous 3 m) : on commande une barre par montant, de longueur immédiatement supérieure à H, et on ne divise jamais les ml par la longueur de barre (on compterait des chutes de 50 cm comme réutilisables).

Pièges : la longueur de plaque est choisie ≥ hauteur sous plafond (2,50 pour 2,50 m sous plafond ; au-dessus, plaque 2,60 ou 2,70). Au-delà de 3 m, un joint horizontal s'ajoute (SNIP). Les ratios SNIP sont « partie courante sans menuiserie » : ajouter 2 montants par bloc-porte *(à valider)*. Enduit : 0,35 kg × nombre de faces × S, en sacs de 25 kg.

### 5.5 Isolation des combles perdus (NF DTU 45.11)

```latex
N_{sacs} = \left\lceil \frac{S_{plancher\ combles}}{100} \times n_{sacs/100\,m^2}(R) \right\rceil
```

`n(R)` vient du tableau ACERMI du produit (§4.2). Aucune perte ajoutée : le minimum certifié en tient compte. Ajouter le pare-vapeur si le devis le mentionne (S × 1,10, en rouleaux *(format à vérifier)*), et 1 ensemble de repérage d'épaisseur (piges) pour 10 m² *(à vérifier Avis Technique)*.

### 5.6 Menuiseries

Aucun calcul : une ligne par taille identique, avec H × L, nombre de vantaux, sens d'ouverture, matériau, couleur, vitrage, volet intégré ou non, type de pose (tunnel, applique, feuillure). Une information absente devient une question, jamais une valeur par défaut silencieuse.

### 5.7 Électricité (NF C 15-100) : minimum normatif pièce par pièce

Si le devis ne détaille pas, l'app compte le minimum de la norme depuis la liste des pièces : séjour 1 socle 16 A par tranche de 4 m², minimum 5, et 7 au-delà de 28 m² ; chambre 3 ; cuisine de plus de 4 m² 6 socles dont 4 au-dessus du plan de travail ; au moins 1 point lumineux par pièce ; 8 points au maximum par circuit d'éclairage en 1,5 mm². ([Selectra](https://selectra.info/energie/actualites/marche/prises-obligatoires-norme-nf-c-15-100), [Circuia](https://www.circuia.com/norme-nf-c-15-100), à revérifier sur le texte de la norme ou le guide Promotelec.) Une prise double compte pour 2 socles.

```latex
N_{couronnes} = \left\lceil \frac{N_{points} \times \ell_{moyen}}{100} \right\rceil
```

`ℓ_moyen` = longueur de gaine préfilée par point, **à valider par un électricien** (hypothèse V0 : 8 m par prise, 10 m par point lumineux, par sous-famille de section).

### 5.8 Plomberie (DTU 60.1, NF DTU 60.11)

Distribution en pieuvre depuis un collecteur : un tube par point d'eau et par fluide (froid, chaud). Longueur = distance collecteur → point, **ratio à valider** (hypothèse V0 : 10 m par tube). Couronnes = ceil(somme / 50). Collecteur : nombre de départs = nombre de points + 1 de réserve *(à valider)*.

### 5.9 Enduit de façade (NF DTU 26.1)

```latex
S_{enduit} = P_{fa\c{c}ade} \times H - \sum S_{ouvertures} + \sum (P_{ouverture} \times p_{tableau})
```

`p_tableau` = profondeur du tableau, 0,20 m par défaut *(à vérifier)*. Sacs = ceil(S × conso / 25), conso du §4.3 selon support et finition. Baguettes d'angle : (nombre d'angles sortants × H) ÷ longueur de baguette *(longueur à vérifier : 2,50 ou 3,00 m)*.

### 5.10 Chape fluide et isolant sous chape

Volume chape = S × épaisseur × 1,05, commandé en m³ à l'applicateur (souvent sous-traité, ligne « à chiffrer »). Isolant : S × 1,05 ÷ surface d'un panneau. Bande périphérique : somme des périmètres des pièces × 1,05 ÷ longueur du rouleau *(format à vérifier)*.

### 5.11 Réseaux VRD (DTU 64.1 pour l'assainissement non collectif)

Tubes : ceil(L × 1,05 ÷ longueur de barre). Coudes et regards : 1 regard à chaque changement de direction et à chaque raccordement *(règle courante, à vérifier DTU 60.11 / règlement du service d'assainissement)*. Fourreaux (TPC) : en couronnes de 25 ou 50 m *(à vérifier)*.

## 6. Valeurs par défaut et hypothèses à afficher

Une valeur par défaut n'est utilisée que si le devis ne dit rien ; elle est alors **toujours affichée** en haut de la carte quantitatif, modifiable d'un tap. Ordre de surcharge : référentiel → habitudes de l'artisan → chantier. Les défauts des lots délégués restent dans leurs tiroirs ; ceux ci-dessous sont propres à l'orchestrateur.

| Clé `defauts.json` | Valeur par défaut | Texte affiché à l'artisan | Axe | Statut |
| --- | --- | --- | --- | --- |
| `neuf_renovation` | neuf | « Maison neuve (pas de démolition dans le devis) » | neuf\_renovation | sûr si aucun mot de dépose |
| `hauteur_sous_plafond` | 2,50 m | « Hauteur sous plafond 2,50 m → plaques 2,50 m » | type\_batiment | à valider |
| `entraxe_montants` | 60 cm, montant simple | « Cloisons 72/48, montants tous les 60 cm » | — | SNIP |
| `plafond_ossature` | fourrures F530 entraxe 60 cm, suspentes | « Plafonds plaques sur fourrures » | — | SNIP |
| `isolation_combles_R` | R = 8 en laine de verre soufflée | « Combles perdus R = 8 (25 sacs/100 m²) » | geographie | à valider (RE2020 n'impose pas un R par paroi) |
| `enduit_finition` | gratté sur maçonnerie | « Enduit gratté, 22 à 25 kg/m², valeur haute retenue » | geographie | Weber |
| `profondeur_tableau` | 0,20 m | « Retours d'enduit 20 cm autour des fenêtres » | mode\_constructif | à vérifier |
| `elec_niveau` | minimum NF C 15-100 | « Électricité au minimum de la norme : à confirmer si le devis prévoit plus » | type\_batiment | norme |
| `elec_ml_par_point` | 8 m prise, 10 m éclairage | « Longueur moyenne de gaine par point » | type\_batiment | à valider |
| `plomberie_ml_par_tube` | 10 m | « Longueur moyenne collecteur → point d'eau » | type\_batiment | à valider |
| `beton_arrondi` | 0,5 m³ | « Béton arrondi au demi-m³ supérieur » | — | à vérifier centrales |
| `reseaux_lineaire` | aucun | jamais supposé : question Q4 | — | règle |

**Ce qui n'a jamais de valeur par défaut** (question obligatoire ou ligne « à chiffrer sur plan ») : dimensions des menuiseries, nombre de fermettes, linéaire de réseaux extérieurs, liste des pièces si le devis donne un forfait électricité et aucun plan.

**Bandeau d'hypothèses**, au format de la carte (section 21 du modèle) : 3 lignes maximum visibles, les autres repliées sous « voir toutes les hypothèses (n) ». Les hypothèses à plus fort levier (§7) passent en premier.

## 7. Questions à poser, avec sensibilité

Un devis de maison réveille plusieurs tiroirs, et chacun a ses questions. L'orchestrateur les **fusionne** : il retire les doublons (un axe déjà résolu n'est jamais redemandé), les classe par levier sur le quantitatif total, puis n'en garde que **4 à boutons** pour le premier écran. Aucune ne porte sur une quantité. Les questions suivantes (5 à 10 maximum, décision du 3 oct. 2026) ne s'affichent que s'il reste un vrai doute, toujours à boutons.

La sensibilité = part des lignes du quantitatif qui changent selon la réponse, ou écart maximal sur la ligne concernée. Valeurs V0 estimées, **à mesurer sur les 10 cas de test**.

| # | Question (exactement comme à l'écran) | Boutons | Posée si | Sensibilité |
| --- | --- | --- | --- | --- |
| Q1 | « C'est une maison neuve ? » | Oui, neuve · Non, rénovation · Extension | aucun mot « dépose », « démolition », « existant » ni « permis de construire » dans le devis | 30 à 60 % des lignes |
| Q2 | « Les murs sont en quoi ? » | Parpaing · Brique · Béton cellulaire · Ossature bois | le lot gros œuvre ne nomme pas le bloc | ±100 % sur mortier ou colle (changement de produit) ; 15 à 25 % du poids total commandé |
| Q3 | « Sous la maison, il y a quoi ? » | Dalle sur terre · Vide sanitaire · Sous-sol | le devis ne dit ni « dallage », ni « vide sanitaire », ni « sous-sol » | ±40 % sur le béton et les aciers du bas |
| Q4 | « La maison est à quelle distance de la rue ? » | Moins de 10 m · 10 à 25 m · Plus de 25 m · Pas dans mon devis | un lot réseaux existe sans linéaire | ±100 % sur tubes, fourreaux et tranchées |
| Q5 | « Il y a un étage ? » | Plain-pied · Un étage · Combles aménagés | plan et devis muets | ±30 % sur plâtrerie, électricité, plancher |
| Q6 | « Le garage est dans le devis ? » | Oui, accolé · Oui, intégré · Pas de garage | le mot « garage » apparaît sans surface | ±10 à 20 % sur gros œuvre et dallage |
| Q7 | « L'électricité, c'est le minimum de la norme ? » | Oui, minimum · Un peu plus · Je préfère compter moi-même | forfait électricité sans détail | ±30 à 50 % sur gaines et appareillage |
| Q8 | « Les combles, c'est quoi ? » | Perdus (laine soufflée) · Aménagés (isolant en rouleaux) | le devis ne nomme pas l'isolant | change le produit et le conditionnement |

Q4 donne une distance de chantier, pas une quantité de matériau ; elle reste dans la règle. Les quantités par tranche sont calculées au milieu de la tranche et affichées comme hypothèse (Moins de 10 m → 8 m ; 10 à 25 m → 18 m ; Plus de 25 m → question texte court « environ combien de mètres ? » en dernier recours) *(à valider)*.

**Règle de priorité entre tiroirs.** Les questions du tiroir couverture (pente, zone) ou maçonnerie (bloc) sont reprises telles quelles, mais classées dans la même file que celles-ci, par sensibilité décroissante. Si deux questions ont la même sensibilité, celle du lot le plus tôt dans le chantier passe d'abord (on commande les fondations avant les plaques).

## 8. Matériaux dominants par région

La région est déduite de l'adresse du chantier (département), jamais demandée. Elle sert à deux choses : proposer le bon produit quand le devis est vague (« murs maçonnés »), et passer aux tiroirs délégués les zones réglementaires qu'ils attendent. Les tables de zones vivent dans `commun/departements.json` ; ce chapitre ne liste que ce que l'orchestrateur en fait.

### 8.1 Zones climatiques RE2020 (arrêté du 4 août 2021)

Huit zones : H1a, H1b, H1c, H2a, H2b, H2c, H2d, H3. Elles fixent les seuils de la RE2020, pas des épaisseurs d'isolant : l'app s'en sert seulement pour choisir le R par défaut des combles (§6) et l'alerte « isolant faible pour la zone ». Correction d'altitude : au-delà de 800 m, un département H2 est traité en H1, un H3 en H2 ([Argile](https://www.argile.ai/blog/les-8-zones-climatiques-francaises-h1a-a-h3), à vérifier sur l'arrêté).

| Zone | Départements (extrait) | Source |
| --- | --- | --- |
| H1a | 02, 14, 27, 28, 59, 60, 61, 62, 75, 76, 77, 78, 80, 91 à 95 | [Ilex Environnement](https://ilexenvironnement.fr/zones-climatiques-france/) |
| H1b | 08, 10, 45, 51, 52, 54, 55, 57, 58, 67, 68, 70, 88, 89, 90 | idem |
| H1c | 01, 03, 05, 15, 19, 21, 23, 25, 38, 39, 42, 43, 63, 69, 71, 73, 74, 87 | [Hellowatt](https://www.hellowatt.fr/renovation/globale/zone-climatique) |
| H2a | 22, 29, 35, 50, 56 | Ilex Environnement |
| H2b | 16, 17, 18, 36, 37, 41, 44, 49, 53, 72, 79, 85, 86 | idem |
| H2c | reste du Sud-Ouest (09, 12, 24, 31, 32, 33, 40…) *(liste complète à saisir)* | à compléter |
| H2d | 04, 07, 26, 48, 84 | Ilex Environnement |
| H3 | 06, 11, 13, 20, 30, 34, 66, 83 + outre-mer | idem |

### 8.2 Mur de la maison neuve : produit proposé si le devis est vague

Valeurs de pratique courante, **à vérifier avec le tiroir maçonnerie** qui fait foi (il traite déjà « brique vs parpaing selon région »). L'orchestrateur ne fait que choisir le défaut affiché et poser Q2 si le devis ne tranche pas.

| Territoire | Mur dominant en maison neuve | Remarque pour le quantitatif |
| --- | --- | --- |
| Bretagne, Normandie, Pays de la Loire, Centre, Île-de-France | parpaing béton 20 × 20 × 50 | mortier en sacs ou toupie ; enduit monocouche |
| Sud-Ouest (Occitanie ouest, Nouvelle-Aquitaine sud), Rhône-Alpes | brique terre cuite rectifiée collée | colle en seaux ou sacs, pas de mortier traditionnel |
| Nord, Pas-de-Calais | brique (parement ou à enduire) et bloc béton | parement = joint, pas d'enduit |
| Alsace, Lorraine, Vosges, Landes, montagne | ossature bois en forte part | ce tiroir ne la calcule pas en V0 : ligne « sur plan » |
| Partout, en complément | béton cellulaire collé | colle spécifique ; enduit adapté |

### 8.3 Autres axes transmis aux tiroirs

Zone sismique (décret 2010-1255, zones 1 à 5) → tiroir maçonnerie (chaînages, treillis du dallage ; le guide ADETS signale des dispositions propres aux zones 3 et 4 pour les dallages : [Guide treillis Fimurex](https://www.queguiner.fr/external-media/sarl-fimurex-planchers/fiche/2024-03-25-guide-treillis-soude.pdf)). Zones vent et neige (NF EN 1991, annexes nationales) → tiroir couverture et ligne charpente. Littoral → tiroir couverture (crochets inox) et ici : menuiseries en finition « bord de mer » à signaler dans la ligne fabricant *(à vérifier)*.

## 9. Points singuliers et consommables

Ce sont les lignes que l'artisan oublie et qui le font retourner au négoce. Elles se commandent à la pièce, au mètre ou à la boîte, et se déduisent des ouvrages déjà détectés : **aucune question supplémentaire**. Les ratios sans source sont des hypothèses V0 à faire valider (§11).

| Lot | Point singulier ou consommable | Règle de calcul | Unité de commande | Statut |
| --- | --- | --- | --- | --- |
| Plâtrerie | Montants supplémentaires aux portes | 2 par bloc-porte (de part et d'autre de l'huisserie) | barre 3,00 m | à valider |
| Plâtrerie | Bande armée d'angle sortant | 1 ml par ml d'angle sortant | rouleau *(longueur à vérifier)* | à valider |
| Plâtrerie | Bande résiliente sous rail | 1 ml par ml de cloison | rouleau 30 m | [Calculpro](https://calculpro.fr/outils/isolation/ossature-metallique-placo) (à vérifier fabricant) |
| Plâtrerie | Trappe de visite des combles | 1 par comble perdu | u | règle |
| Plâtrerie | Plaques hydrofuges (H1) | toutes les faces de salle de bains, salle d'eau, WC | plaque | règle DTU 25.41 (à vérifier) |
| Isolation | Piges de repérage d'épaisseur | selon Avis Technique du produit soufflé | u | à vérifier |
| Isolation | Coffrage autour de la trappe et des spots | 1 par trappe ; 1 capot par spot encastré | u | règle |
| Électricité | Boîtes d'encastrement | 1 par socle ou groupe de socles + 1 par commande | u | à valider |
| Électricité | Boîtes DCL plafond | 1 par point lumineux | u | norme |
| Électricité | Disjoncteurs | 1 par circuit ; éclairage = ceil(points / 8) ; prises = ceil(socles / 8) *(à vérifier)* ; circuits spécialisés : four, plaque 32 A, lave-linge, lave-vaisselle, chauffe-eau | u | norme (à vérifier) |
| Électricité | Interrupteurs différentiels 30 mA | 8 circuits au maximum par différentiel ([Circuia](https://www.circuia.com/norme-nf-c-15-100)) | u | norme |
| Plomberie | Raccords à sertir | 2 par tube (collecteur + point d'eau) | u | à valider |
| Plomberie | Colliers, fixations de tube | 1 tous les 0,80 m en apparent *(à vérifier)* | sachet | à valider |
| Évacuation | Colle PVC, décapant | 1 kit par maison | pot | à valider |
| Évacuation | Coudes, culottes, manchons | 1 coude par appareil + 1 culotte par piquage *(à valider)* | u | à valider |
| Enduit façade | Baguettes d'angle | (angles sortants × H) ÷ longueur de baguette | u | §5.9 |
| Enduit façade | Trame d'armature aux jonctions de matériaux | 0,40 m × longueur de jonction (linteaux, planchers, coffres) *(à vérifier DTU 26.1)* | rouleau | à vérifier |
| Menuiseries | Mousse PU, bande de calfeutrement, vis de fixation | 1 aérosol pour 2 fenêtres ; bande = périmètre × 1,05 *(à valider)* | u, rouleau | à valider |
| Chape | Bande périphérique, film polyane | §5.10 | rouleau | à vérifier |
| Tous lots | Cartouches de mastic, disques, lames, sacs à gravats | non calculés en V0 : ligne « petites fournitures » proposée, cochable | u | décision |

**Règle d'affichage.** Les consommables sont regroupés sous un bloc « Petites fournitures » replié par défaut, au bas de chaque paquet fournisseur. L'artisan peut tout décocher d'un tap ; l'app retient ce choix pour lui (surcharge niveau artisan).

## 10. Cas de test (format JSON)

Trois cas **synthétiques**, calculés à la main avec les règles des chapitres 4 et 5, pour que Claude Code ait des tests qui tournent dès le premier jour. Ils devront être remplacés par 10 devis réels de constructeurs (critère de bêta, §13). Le cas eg-001 vérifie surtout la règle de fusion : arrondir par lot ferait commander 1 boîte de vis, 1 sac d'enduit et 1 rouleau de bande de trop.

```json
{
  "id": "eg-001",
  "source": "synthétique V0, à remplacer par un devis réel",
  "devis_pdf": null,
  "contexte": { "departement": "22", "neuf": true, "plain_pied": true, "hauteur_sous_plafond_m": 2.50 },
  "lignes_devis": [
    { "lot": "platrerie", "texte": "Cloisons de distribution 72/48 BA13, 30 ml" },
    { "lot": "platrerie", "texte": "Plafonds plaques BA13 sur ossature, 100 m²" },
    { "lot": "isolation", "texte": "Isolation combles perdus laine de verre soufflée R=8, 100 m²" }
  ],
  "attendu": [
    { "article": "plaque BA13 1,20x2,50", "quantite": 88, "unite": "u", "detail": "cloisons 53 + plafonds 35", "tolerance_pct": 3 },
    { "article": "montant M48 3,00 m", "quantite": 63, "unite": "u", "tolerance_pct": 5 },
    { "article": "rail R48 3,00 m", "quantite": 21, "unite": "u", "tolerance_pct": 5 },
    { "article": "fourrure F530 3,00 m", "quantite": 60, "unite": "u", "tolerance_pct": 5 },
    { "article": "suspente F530", "quantite": 156, "unite": "u", "tolerance_pct": 5 },
    { "article": "cornière 3,00 m", "quantite": 16, "unite": "u", "tolerance_pct": 5 },
    { "article": "éclisse F530", "quantite": 21, "unite": "u", "tolerance_pct": 10 },
    { "article": "vis TTPC 25", "quantite": 4, "unite": "boîte 1000", "detail": "2250 + 1200 = 3450 vis", "tolerance_pct": 0 },
    { "article": "bande à joint papier", "quantite": 3, "unite": "rouleau 150 m", "detail": "260 + 158 = 418 ml", "tolerance_pct": 0 },
    { "article": "enduit à joint poudre", "quantite": 4, "unite": "sac 25 kg", "detail": "52,5 + 35 = 87,5 kg", "tolerance_pct": 0 },
    { "article": "laine de verre soufflée Comblissimo", "quantite": 25, "unite": "sac 17,3 kg", "tolerance_pct": 0 }
  ],
  "questions_max": 4,
  "questions_attendues": []
}
```

```json
{
  "id": "eg-002",
  "source": "synthétique V0, à remplacer par un devis réel",
  "contexte": { "departement": "35", "neuf": true },
  "lignes_devis": [
    { "lot": "electricite", "texte": "Installation électrique NF C 15-100, forfait" },
    { "lot": "plan", "texte": "Séjour 35 m², cuisine 10 m², 3 chambres, SDB, WC, entrée, cellier, dégagement" }
  ],
  "attendu": [
    { "article": "socle prise 16 A", "quantite": 25, "unite": "u", "detail": "séjour 7, cuisine 6, chambres 9, SDB 1, entrée 1, cellier 1", "tolerance_pct": 0 },
    { "article": "point lumineux DCL", "quantite": 10, "unite": "u", "detail": "1 par pièce, dégagement compris", "tolerance_pct": 0 },
    { "article": "gaine ICTA préfilée 3G2,5 Ø20", "quantite": 2, "unite": "couronne 100 m", "detail": "25 x 8 m = 200 m", "tolerance_pct": 0 },
    { "article": "gaine ICTA préfilée 3G1,5 Ø16", "quantite": 1, "unite": "couronne 100 m", "detail": "10 x 10 m = 100 m", "tolerance_pct": 0 }
  ],
  "hypotheses_affichees": ["électricité au minimum de la norme", "8 m de gaine par prise, 10 m par point lumineux"],
  "questions_max": 4,
  "questions_attendues": ["Q7"]
}
```

```json
{
  "id": "eg-003",
  "source": "synthétique V0, à remplacer par un devis réel",
  "contexte": { "departement": "56", "neuf": true, "mur": "parpaing" },
  "lignes_devis": [
    { "lot": "facade", "texte": "Enduit monocouche gratté teinte claire, façades 40 ml x 2,70 m, ouvertures 15 m²" }
  ],
  "attendu": [
    { "article": "weber.pral F sac 25 kg", "quantite": 101, "unite": "sac", "detail": "(108 - 15 + 40 x 0,20) = 101 m² x 25 kg / 25 ; 2 palettes de 48 + 5 sacs", "tolerance_pct": 5 }
  ],
  "hypotheses_affichees": ["valeur haute 25 kg/m² (gratté sur maçonnerie)", "périmètre cumulé des ouvertures 40 m", "tableaux 20 cm"],
  "questions_max": 4,
  "questions_attendues": []
}
```

Dans eg-002, les longueurs de gaine par point sont des hypothèses : le test vérifie la chaîne de calcul, pas la réalité d'un chantier ; 100 m tout juste tient dans 1 couronne, ce cas sert aussi à tester l'arrondi à la limite. Dans eg-003, le périmètre cumulé des ouvertures (40 m) sera lu dans le devis ou le plan en version réelle ; ici il est fixé pour le test.

## 11. Ratios à faire valider par un artisan

Relecteur idéal : un **conducteur de travaux de constructeur de maisons** (il connaît tous les lots et les commandes réelles), puis un plaquiste, un électricien et un plombier pour leurs lignes. Chaque ratio validé passe de « à valider » à « validé par X, date » dans `ratios-a-valider.md`, et sa version est incrémentée.

| # | Ratio ou règle | Valeur V0 | Qui valide | Impact si faux |
| --- | --- | --- | --- | --- |
| R1 | Longueur de gaine préfilée par prise | 8 m | électricien | fort (couronnes en trop ou en moins) |
| R2 | Longueur de gaine par point lumineux | 10 m | électricien | fort |
| R3 | Longueur de PER par point d'eau | 10 m | plombier | moyen |
| R4 | Départs de collecteur = points + 1 | + 1 | plombier | faible |
| R5 | Montants supplémentaires par bloc-porte | 2 | plaquiste | moyen |
| R6 | Hauteur sous plafond par défaut | 2,50 m | conducteur de travaux | fort (longueur de plaque) |
| R7 | R par défaut des combles perdus en neuf | R = 8 | conducteur de travaux / thermicien | moyen |
| R8 | Profondeur des tableaux pour l'enduit | 0,20 m | façadier | faible |
| R9 | Valeur haute de consommation d'enduit retenue | 25 kg/m² gratté | façadier | moyen (±12 %) |
| R10 | Seuils de cohérence entre lots | 15 % / 20 % | conducteur de travaux | faible (alerte seulement) |
| R11 | Arrondi béton | 0,5 m³ | centrale à béton | faible |
| R12 | Seuil « palette entière » | reste > 80 % | négoce | faible |
| R13 | Milieu de tranche pour la distance à la rue (Q4) | 8 m / 18 m | terrassier / VRD | moyen |
| R14 | Mur dominant par territoire (§8.2) | table V0 | maçon (déjà dans le tiroir maçonnerie) | fort |
| R15 | Consommables : mousse PU 1 pour 2 fenêtres, raccords 2 par tube, colliers tous les 0,80 m | V0 | poseur menuiseries / plombier | faible |
| R16 | Disjoncteurs prises : 8 socles max par circuit 2,5 mm² | à vérifier | électricien | moyen |

- [ ] Faire relire R1 à R16 par un conducteur de travaux
- [ ] Faire relire R1, R2, R16 par un électricien
- [ ] Faire relire R3, R4, R15 par un plombier
- [ ] Faire relire R5, R6 par un plaquiste

## 12. Sources officielles

Pages ouvertes ou lues le 3 oct. 2026. Les textes DTU et la norme NF C 15-100 sont payants (AFNOR / CSTB) : seules leurs références sont citées, et toute valeur qui en vient sans source primaire reste « à vérifier ».

**Fabricants et syndicats professionnels (sources primaires)**

- [SNIP, fiche conseil n° 18 : quantitatifs des ouvrages en plaques de plâtre (déc. 2024)](https://www.lesindustriesduplatre.org/wp-content/uploads/2025/03/SNIP-FICHE-CONSEIL-18-VERSIONS-2025_V6-13fevrier.pdf)
- [Placo, fiche système cloison 72/48 Placostil](https://www.placo.fr/professionnels/solution/sp00011111/cloisons-7248-1x-placoplatre-ba-13-1x-placoplatre-ba-13-stil-ml-48-50-04-double-ei30-38-db-365-m)
- [Isover Comblissimo, fiche technique (via Denis Matériaux)](https://media.denismateriaux.com/media/173561_comblissimo_fichetech.pdf)
- [Weber, fiche weber.pral F (via Quéguiner)](https://www.queguiner.fr/external-media/sa-saint-gobain-weber-france/fiche/fiche-produit-weberpral-f.pdf)
- [Weber, fiche weber béton (via Groupe Samse)](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1405443.pdf)
- [Fimurex, guide treillis soudé pour dallages et dalles](https://www.queguiner.fr/external-media/sarl-fimurex-planchers/fiche/2024-03-25-guide-treillis-soude.pdf)

**Négoces (conditionnements livrés)**

- [Groupe Launay Matériaux, treillis ST25C](https://www.groupelaunaymateriaux.fr/produit/px-treillis-st25c-maille-15-15-VFJFSUxMSVNTVDI1Qw==)
- [La Plateforme du Bâtiment, gaine ICTA préfilée 3G2,5 Ø20](https://www.laplateforme.com/catalogue/produit/96551/gaine-prefilee-icta-gris-o-20-mm-3-x-2-5-rouleau-de-100-m)
- [Domomat, gaine ICTA 3422 préfilée](https://www.domomat.com/8975-couronne-100m-gaine-prefilee-icta-3422-d20-3g25mm-brvj-fils-et-cables-generiques-tue20020020.html)
- [Elec44, gamme Preflex](https://elec44.fr/4055-gaines-electriques-icta-prefilees)
- [Bricomarché, couronnes PER](https://www.bricomarche.com/c/plomberie-et-sanitaire/tube-et-raccord/tube-et-raccord-per/tube-et-couronne-per/131041)

**Normes et réglementation (secondaires, à confirmer sur le texte)**

- NF C 15-100 (installations électriques) : [Selectra](https://selectra.info/energie/actualites/marche/prises-obligatoires-norme-nf-c-15-100), [Circuia](https://www.circuia.com/norme-nf-c-15-100) ; source primaire à obtenir : guide Promotelec ou norme AFNOR.
- RE2020, zones climatiques (arrêté du 4 août 2021) : [Ilex Environnement](https://ilexenvironnement.fr/zones-climatiques-france/), [Hellowatt](https://www.hellowatt.fr/renovation/globale/zone-climatique), [Argile](https://www.argile.ai/blog/les-8-zones-climatiques-francaises-h1a-a-h3).
- Références à acheter ou consulter (CSTB / AFNOR) : NF DTU 25.41 (plaques de plâtre), NF DTU 45.11 (isolation par soufflage), NF DTU 26.1 (enduits), NF DTU 13.3 (dallages), NF DTU 31.3 (charpentes industrielles), NF DTU 60.1 et 60.11 (plomberie), DTU 64.1 (assainissement non collectif), décret 2010-1255 (zonage sismique), NF EN 1991 (neige et vent).

## 13. Plan de complétion

Critère de bêta du tiroir (repris du modèle, section 30) : 10 devis réels de constructeurs, chaque ligne dans sa tolérance, 4 questions au premier écran, zéro question sur une quantité. Tant qu'il n'est pas atteint, l'app peut traiter un devis de maison mais affiche « version d'essai » sur les lots calculés ici.

| # | Manque | Source à aller chercher | Priorité |
| --- | --- | --- | --- |
| C1 | 10 devis réels de maisons neuves anonymisés + bons de commande correspondants | constructeurs partenaires, réseau de Dorothée et Omar | 1 |
| C2 | Validation de R1 à R16 | conducteur de travaux, puis artisans par lot | 1 |
| C3 | Vérifier la cohérence avec les tiroirs maçonnerie, terrassement, carrelage, peinture, couverture (noms d'axes, `mode_constructif`, ids de produits partagés comme le ciment) | relecture croisée par Claude Code | 1 |
| C4 | Conditionnements négoce manquants : vis (boîte), bande (rouleau), montants autres longueurs, câble 3G6 / 3G10, tubes PVC, isolant sous chape, bande périphérique, pare-vapeur | fiches Point.P, Gedimat, Rexel, Cedeo | 2 |
| C5 | NF C 15-100 sur source primaire (guide Promotelec) : prises par circuit, circuits spécialisés | Promotelec | 2 |
| C6 | Liste complète H2c et table départementale vérifiée sur l'arrêté du 4 août 2021 | Légifrance | 2 |
| C7 | Doublage collé (complexes 10+80, 10+100, 10+120) : plaques et mortier adhésif par m² | Placo, Knauf, Siniat | 2 |
| C8 | Isolation des murs par doublage sur ossature (laine en rouleaux, épaisseurs) | Isover, Knauf | 2 |
| C9 | Créer les tiroirs propres `platrerie/`, `electricite/`, `plomberie/` puis déplacer ces sections hors de l'orchestrateur | conversations Claude dédiées (une par métier) | 3 |
| C10 | Ossature bois (Est, Landes, montagne) | fabricants d'ossature, DTU 31.2 | 3 |
| C11 | Rénovation lourde (dépose, reprises) au niveau orchestrateur | devis réels de réno | 3 |

**Prochaine étape conseillée** : après ce tiroir, ouvrir les conversations « PLÂTRERIE », « ÉLECTRICITÉ » et « PLOMBERIE » avec le même prompt, car ce sont les trois lots que l'orchestrateur calcule aujourd'hui « en attendant ».

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 3 oct. 2026 | 0.1 | Création du tiroir `entreprise-generale/` au format section 27. Ajouts au gabarit : champ `orchestrateur` et table `delegue_a` dans `metier.json`, axe `mode_constructif`, règle de fusion « additionner avant d'arrondir », fusion des questions entre tiroirs. Lots calculés en attendant leurs tiroirs : plâtrerie et isolation des combles (SNIP, Isover), électricité (NF C 15-100), plomberie, enduit de façade (Weber), chape, VRD. Trois cas de test synthétiques eg-001 à eg-003. |
