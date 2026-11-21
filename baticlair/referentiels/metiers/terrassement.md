---
code: terrassement
metier: earthworks
nom: Terrassement - VRD
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/terrassier.md
---

# Fiche métier : terrassement - VRD (format commun, §52)

Tirée du référentiel terrassier du 3 octobre 2026 (`docs/referentiels/terrassier.md`, sections 2 à 12, sources consultées ce
jour-là). Ce que le terrassier commande au négoce : granulats en tonnes, tubes en barres, gaines et drains en couronnes,
géotextile et grillage avertisseur en rouleaux. Le reste (décapage, fouilles, évacuation, engins, main-d'œuvre) est hors
commande et ne sort jamais en fourniture.

## 1. Unités et vocabulaire du devis

Unités du devis : m² (plateformes, hérisson, géotextile), m³ (empierrement ou remblai au volume, déblais), ml (tranchées,
canalisations, fourreaux, drains, épandage), u (regards, fosses, boîtes), ens / forfait (branchement, évacuation).
Mots du métier : « TV » = terre végétale (pas télévision) ; « GNT », « grave », « concassé », « tout-venant », « 0/31,5 »,
« 0/20 », « macadam » = empierrement (couche de forme, pas un enrobé) ; « hérisson », « cailloutis », « pierres cassées » =
couche drainante sous dallage ; « EU » eaux usées, « EP » eaux pluviales, « CR8 » classe de rigidité du tube PVC d'assainissement ;
« fourreau », « gaine TPC » = gaine annelée enterrée (rouge électricité, verte télécom) ; « FTE » = fosse toutes eaux ;
« épandage » = tranchées d'infiltration d'un assainissement non collectif.
Hors commande (aucune fourniture, la ligne reste au devis) : décapage, fouilles en rigole, en puits ou en pleine masse,
« remblai » sans « apport » (terres du site), évacuation, mise en décharge, rotation de camion, location d'engin, compactage,
implantation, main-d'œuvre.
Une ligne qui écrit deux ouvrages (« empierrement GNT 20 cm sur géotextile, 80 m² ») donne deux fournitures, une par ouvrage,
chacune avec la quantité de la ligne. L'épaisseur, le diamètre ou la tranchée commune écrits sur la ligne vont dans
« donnees » (`epaisseur_forme` = 20, `diametre_eu` = 125…) : la question n'est alors pas posée. Les pièces écrites à l'unité
(regard, fosse toutes eaux, boîte de répartition, de bouclage) restent telles qu'écrites, sans ouvrage de cette fiche.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| plateforme-empierrement | Empierrement en GNT 0/31,5 compactée | m² | « Empierrement GNT 0/31,5 ép. 20 cm », « fond de forme », « couche de forme en grave », « tout-venant », « macadam » (en m²) |
| empierrement-volume | Empierrement en GNT 0/31,5 au volume | m³ | « Empierrement GNT 16 m³ », « apport de grave 0/31,5 compactée » (en m³ en place) |
| geotextile | Géotextile sous plateforme | m² | « Géotextile », « feutre anticontaminant », « géotextile sous empierrement » |
| herisson-20-40 | Hérisson en cailloux 20/40 | m² | « Hérisson 20/40 », « cailloutis 20/40 sous dallage », « hérisson » sans calibre écrit |
| herisson-40-80 | Hérisson en cailloux 40/80 | m² | « Hérisson 40/80 », « pierres cassées 40/80 » |
| canalisation-assainissement | Canalisation PVC CR8 (EU ou EP) en tranchée, lit et enrobage sable | ml | « Branchement EU PVC CR8 Ø125, 18 ml », « canalisation EP Ø110 », « raccordement tout-à-l'égout » (en ml) |
| fourreau-electricite | Fourreau TPC rouge (électricité) | ml | « Fourreau Enedis TPC Ø63 », « gaine rouge », « tranchée EDF » (en ml) |
| fourreau-telecom | Fourreau TPC vert (télécom) | ml | « Fourreau télécom Ø40 », « gaine verte », « fourreau Orange » (en ml) |
| enrobage-sable-reseau-sec | Lit de pose et enrobage sable d'une tranchée de fourreaux | ml | « Lit et enrobage sable », « sablage de la tranchée » sur une tranchée de fourreaux |
| drainage-peripherique | Drainage périphérique : drain, massif 20/40, géotextile | ml | « Drainage périphérique drain Ø100, gravier 20/40, géotextile », « drainage en pied de fondation » |
| drain-seul | Drain Ø100 enrobé, seul | ml | « Drain Ø100 enrobé » sans gravier ni géotextile écrits |
| epandage | Tranchées d'épandage (ANC) | ml | « Épandage 3 tranchées de 15 ml », « tranchées d'infiltration », « épandage gravier 10/40 » |
| remblai-sable | Remblai en sable d'apport | m³ | « Remblai en sable », « apport de sable 0/4 » |
| remblai-gnt | Remblai en GNT d'apport | m³ | « Remblai GNT », « remblai en grave 0/31,5 » |
| apport-terre-vegetale | Apport de terre végétale | m³ | « Apport de terre végétale », « TV d'apport » |

## 3. Ratios

Granulats : tonnes = quantité × épaisseur × densité compactée × (1 + perte). Tubes, gaines, drains : mètres × (1 + perte).
Sable de tranchée : (largeur × (lit + Ø + recouvrement) − section du tube) × 1,8 × 1,05, par mètre de tranchée.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| plateforme-empierrement | GNT 0/31,5 | 0,231 | t | epaisseur_forme=10 | usuel | S1 |
| plateforme-empierrement | GNT 0/31,5 | 0,462 | t | epaisseur_forme=20 | usuel | S1 |
| plateforme-empierrement | GNT 0/31,5 | 0,693 | t | epaisseur_forme=30 | usuel | S1 |
| plateforme-empierrement | GNT 0/31,5 | 0,924 | t | epaisseur_forme=40 | usuel | S1 |
| empierrement-volume | GNT 0/31,5 | 2,31 | t | — | usuel | S1 |
| geotextile | Géotextile 150 g/m² | 1,15 | m² | — | à vérifier | S11 |
| herisson-20-40 | Cailloux 20/40 | 0,2475 | t | epaisseur_herisson=15 | à vérifier | S3 |
| herisson-20-40 | Cailloux 20/40 | 0,33 | t | epaisseur_herisson=20 | à vérifier | S3 |
| herisson-20-40 | Cailloux 20/40 | 0,4125 | t | epaisseur_herisson=25 | à vérifier | S3 |
| herisson-20-40 | Cailloux 20/40 | 0,495 | t | epaisseur_herisson=30 | à vérifier | S3 |
| herisson-40-80 | Cailloux 40/80 | 0,2475 | t | epaisseur_herisson=15 | à vérifier | S3 |
| herisson-40-80 | Cailloux 40/80 | 0,33 | t | epaisseur_herisson=20 | à vérifier | S3 |
| herisson-40-80 | Cailloux 40/80 | 0,4125 | t | epaisseur_herisson=25 | à vérifier | S3 |
| herisson-40-80 | Cailloux 40/80 | 0,495 | t | epaisseur_herisson=30 | à vérifier | S3 |
| canalisation-assainissement | Tube PVC CR8 Ø110 | 1,03 | m | diametre_eu=110 | usuel | S6 |
| canalisation-assainissement | Tube PVC CR8 Ø125 | 1,03 | m | diametre_eu=125 | usuel | S6 |
| canalisation-assainissement | Tube PVC CR8 Ø160 | 1,03 | m | diametre_eu=160 | usuel | S6 |
| canalisation-assainissement | Sable 0/4 | 0,30 | t | — | à vérifier | S4 |
| canalisation-assainissement | Grillage avertisseur marron | 1,05 | m | — | sûr | S5 |
| fourreau-electricite | Gaine TPC rouge Ø40 | 1,05 | m | diametre_elec=40 | usuel | S7 |
| fourreau-electricite | Gaine TPC rouge Ø63 | 1,05 | m | diametre_elec=63 | usuel | S7 |
| fourreau-electricite | Gaine TPC rouge Ø90 | 1,05 | m | diametre_elec=90 | usuel | S7 |
| fourreau-electricite | Grillage avertisseur rouge | 1,05 | m | — | sûr | S5 |
| fourreau-telecom | Gaine TPC verte Ø40 | 1,05 | m | diametre_telecom=40 | usuel | S7 |
| fourreau-telecom | Gaine TPC verte Ø63 | 1,05 | m | diametre_telecom=63 | usuel | S7 |
| fourreau-telecom | Grillage avertisseur vert | 1,05 | m | — | sûr | S5 |
| enrobage-sable-reseau-sec | Sable 0/4 | 0,19 | t | tranchee_commune=non | à vérifier | S4 |
| enrobage-sable-reseau-sec | Sable 0/4 | 0,29 | t | tranchee_commune=oui | à vérifier | S4 |
| drainage-peripherique | Drain Ø100 enrobé géotextile | 1,05 | m | — | usuel | S8 |
| drainage-peripherique | Cailloux 20/40 | 0,252 | t | — | à vérifier | S3 |
| drainage-peripherique | Géotextile de drainage | 2,0 | m² | — | à vérifier | S11 |
| drain-seul | Drain Ø100 enrobé géotextile | 1,05 | m | — | usuel | S8 |
| epandage | Tube d'épandage PVC CR4 Ø100 | 1,05 | m | — | usuel | S10 |
| epandage | Gravier roulé lavé 10/40 | 0,3045 | t | — | usuel | S9 |
| epandage | Géotextile en bande de 1 m | 1,05 | m | — | usuel | S9 |
| remblai-sable | Sable 0/4 | 1,89 | t | — | usuel | S12 |
| remblai-gnt | GNT 0/31,5 | 2,31 | t | — | usuel | S1 |
| apport-terre-vegetale | Terre végétale | 1,43 | t | — | à vérifier | S12 |

## 4. Conditionnements

Les granulats se commandent à la tonne (le négoce livre en vrac au-delà de 8 t, en big bag de 1 m³ en dessous, §7) : la
contenance est le pas d'arrondi.

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source |
|---|---|---|---|---|---|
| GNT 0/31,5 | t | 1 | t | usuel | S13 |
| Cailloux 20/40 | t | 1 | t | usuel | S13 |
| Cailloux 40/80 | t | 1 | t | usuel | S13 |
| Gravier roulé lavé 10/40 | t | 1 | t | usuel | S13 |
| Sable 0/4 | t | 1 | t | usuel | S13 |
| Terre végétale | t | 1 | t | usuel | S13 |
| Géotextile 150 g/m² | rouleau 4 × 25 m | 100 | m² | sûr | S11 |
| Géotextile de drainage | rouleau 2 × 25 m | 50 | m² | sûr | S11 |
| Géotextile en bande de 1 m | rouleau | 50 | m | sûr | S11 |
| Tube PVC CR8 Ø110 | barre | 3 | m | sûr | S6 |
| Tube PVC CR8 Ø125 | barre | 3 | m | sûr | S6 |
| Tube PVC CR8 Ø160 | barre | 3 | m | sûr | S6 |
| Tube d'épandage PVC CR4 Ø100 | barre | 4 | m | sûr | S10 |
| Gaine TPC rouge Ø40 | couronne | 50 | m | sûr | S7 |
| Gaine TPC rouge Ø63 | couronne | 50 | m | sûr | S7 |
| Gaine TPC rouge Ø90 | couronne | 50 | m | sûr | S7 |
| Gaine TPC verte Ø40 | couronne | 50 | m | sûr | S7 |
| Gaine TPC verte Ø63 | couronne | 50 | m | sûr | S7 |
| Drain Ø100 enrobé géotextile | couronne | 50 | m | sûr | S8 |
| Grillage avertisseur marron | rouleau | 100 | m | sûr | S5 |
| Grillage avertisseur rouge | rouleau | 100 | m | sûr | S5 |
| Grillage avertisseur vert | rouleau | 100 | m | sûr | S5 |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| epaisseur_forme | Ton empierrement fait quelle épaisseur, une fois compacté ? | 10 cm=10 / 20 cm=20 / 30 cm=30 / 40 cm=40 | plateforme-empierrement |
| epaisseur_herisson | Ton hérisson fait quelle épaisseur ? | 15 cm=15 / 20 cm=20 / 25 cm=25 / 30 cm=30 | herisson-20-40, herisson-40-80 |
| diametre_eu | Ta canalisation, c'est quel diamètre ? | Ø110=110 / Ø125=125 / Ø160=160 | canalisation-assainissement |
| diametre_elec | Le fourreau électrique, quel diamètre ? | Ø40=40 / Ø63=63 / Ø90=90 | fourreau-electricite |
| diametre_telecom | Le fourreau télécom, quel diamètre ? | Ø40=40 / Ø63=63 | fourreau-telecom |
| tranchee_commune | Les fourreaux passent dans la même tranchée ? | Oui=oui / Non=non | enrobage-sable-reseau-sec |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : accès et réseaux d'une maison neuve, d'après les cas terr-001 à
terr-006 du référentiel du 3 octobre.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1.1 | Décapage terre végétale sur 30 cm et mise en dépôt | 80 | m² | — |
| 1.2 | Fourniture et pose géotextile sous empierrement | 80 | m² | geotextile |
| 1.3 | Empierrement GNT 0/31,5 compactée | 80 | m² | plateforme-empierrement |
| 2.1 | Hérisson en cailloux 20/40 sous dallage | 60 | m² | herisson-20-40 |
| 3.1 | Branchement eaux usées PVC CR8 en tranchée | 18 | ml | canalisation-assainissement |
| 3.2 | Fourreau Enedis TPC | 30 | ml | fourreau-electricite |
| 3.3 | Fourreau télécom TPC | 30 | ml | fourreau-telecom |
| 3.4 | Lit de pose et enrobage sable des fourreaux | 30 | ml | enrobage-sable-reseau-sec |
| 4.1 | Drainage périphérique drain Ø100, gravier 20/40, géotextile | 44 | ml | drainage-peripherique |
| 5.1 | Épandage, 3 tranchées de 15 ml, gravier 10/40 lavé, géotextile | 45 | ml | epandage |
| 6.1 | Remblai en sable d'apport | 5 | m³ | remblai-sable |
| 7.1 | Évacuation des déblais en décharge | 1 | ens | — |

### Bref

- Terrassement et réseaux d'une maison neuve : accès empierré de 80 m² sur géotextile, hérisson 20/40 de 60 m² sous dallage.
- Branchement eaux usées en PVC CR8 sur 18 ml, fourreaux électricité et télécom sur 30 ml, lit et enrobage sable.
- Drainage périphérique de 44 ml, épandage de 45 ml, 5 m³ de remblai en sable ; décapage et évacuation hors commande.

### Questions attendues

- `epaisseur_forme`
- `epaisseur_herisson`
- `diametre_eu`
- `diametre_elec`
- `diametre_telecom`
- `tranchee_commune`

### Réponses

- `epaisseur_forme` = 20
- `epaisseur_herisson` = 20
- `diametre_eu` = 125
- `diametre_elec` = 63
- `diametre_telecom` = 40
- `tranchee_commune` = oui

### Comptes attendus

Calculs : GNT 80 × 0,462 = 36,96 t ; cailloux 20/40 60 × 0,33 + 44 × 0,252 = 30,89 t ; sable 18 × 0,30 + 30 × 0,29 + 5 × 1,89
= 23,55 t ; tube 18 × 1,03 = 18,54 m ÷ 3 ; géotextile 80 × 1,15 = 92 m² ; drainage 44 × 2,0 = 88 m² ; épandage 45 × 1,05 =
47,25 m ÷ 4 = 11,8 barres ; gravier 45 × 0,3045 = 13,7 t.

| Fourniture | Commande |
|---|---|
| Géotextile 150 g/m² | 1 rouleau 4 × 25 m de 100 m² |
| GNT 0/31,5 | 37 t |
| Cailloux 20/40 | 31 t |
| Tube PVC CR8 Ø125 | 7 barres de 3 m |
| Sable 0/4 | 24 t |
| Grillage avertisseur marron | 1 rouleau de 100 m |
| Gaine TPC rouge Ø63 | 1 couronne de 50 m |
| Grillage avertisseur rouge | 1 rouleau de 100 m |
| Gaine TPC verte Ø40 | 1 couronne de 50 m |
| Grillage avertisseur vert | 1 rouleau de 100 m |
| Drain Ø100 enrobé géotextile | 1 couronne de 50 m |
| Géotextile de drainage | 2 rouleaux 2 × 25 m de 50 m² |
| Tube d'épandage PVC CR4 Ø100 | 12 barres de 4 m |
| Gravier roulé lavé 10/40 | 14 t |
| Géotextile en bande de 1 m | 1 rouleau de 50 m |

## 7. À relire par un artisan

- Densité de la GNT 0/31,5 compactée (2,20 t/m³ calcaire, 2,15 granit ou silex) et perte de 5 % : ±5 % sur toutes les tonnes de forme.
- Sable de tranchée : largeur 0,40 m pour un branchement (0,60 en tranchée commune), lit 10 cm, 20 cm au-dessus du tube en
  assainissement et 10 cm sur les fourreaux : ±30 % sur le sable si le godet fait 0,50 m.
- Massif drainant du drainage périphérique (40 × 40 cm de 20/40, géotextile 2 m² par mètre) : ±50 % sur le gravier.
- Hérisson : 1,5 t/m³ en vrac plus 10 % de tassement ; un artisan qui commande au m³ en big bag change l'unité, pas le besoin.
- Granulats vendus à la tonne : le passage au big bag de 1 m³ (≈ 1,5 t de GNT, 1,6 t de sable) sous 8 t reste à brancher (§7 du
  référentiel du 3 octobre, question « livraison »).

## 8. Sources

- S1 : Fiche carrière SAS Pellet, grave concassée calcaire 0/31,5 (NF EN 13242), densité compactée 2,20 t/m³ ; Koncrete, densité de la GNT foisonnée et compactée, marge de 3 à 5 % sur le tonnage ; consultés le 3 octobre 2026.
- S2 : Calcul-BTP, foisonnement et densités des terres (déblai, remblai), consulté le 3 octobre 2026 (hors commande seulement).
- S3 : Sorelest, densité des graviers (cailloux 20/40 et 40/80 ≈ 1,5 t/m³ en vrac) ; perte de 10 % au tassement et massif drainant 40 × 40 cm : règle BatiClair du 3 octobre, à vérifier (NF DTU 20.1 non lu).
- S4 : Fascicule 70 du CCTG (lit de pose ≥ 10 cm, 15 cm sur rocher) ; prescriptions Mauges Communauté et Montpellier 3M (enrobage 20 cm au-dessus de la génératrice) ; NF P 98-332 (tranchée commune) ; largeur 0,40 / 0,60 m : règle BatiClair, à vérifier.
- S5 : NF EN 12613, dispositifs avertisseurs : grillage 0,30 × 100 m, marron assainissement, rouge électricité, vert télécom (catalogue Ciffréo Bona ; guide technique ACSO), consulté le 3 octobre 2026.
- S6 : Fiche Bipeau CR8 (NF EN 13476-2, NF EN 1401) : tubes PVC d'assainissement en barres de 3 m à joint ; perte 3 % (Fascicule 70, règle BatiClair).
- S7 : Chausson et Sorodist, gaine TPC annelée (NF EN 61386-24) Ø40 à Ø90 en couronnes de 25 et 50 m ; perte 5 %.
- S8 : Formatub et VM Matériaux, drain agricole Ø100 enrobé géotextile (NF U 51-101), couronne de 50 m.
- S9 : NF DTU 64.1 (extrait CCSVP) et fiches SPANC eau47 : tranchée d'épandage de 0,50 m, gravier 10/40 lavé sur 0,40 m (1,45 t/m³), géotextile au-dessus ; perte 5 %.
- S10 : Fitt, ATE BatiPand, Gedimat Sotrapand : tube d'épandage PVC CR4 Ø100 en barres de 4 m.
- S11 : Chausson, géotextile non tissé Edia en rouleaux 4 × 25 et 4 × 50 m ; PUM, géotextile en bandes 0,5 × 100, 1 × 50 et 2 × 25 m ; recouvrements 15 % : règle BatiClair, à vérifier.
- S12 : Densités compactées sable 1,8 t/m³ et terre végétale 1,3 t/m³ (Koncrete, tableau des densités du BTP ; Calcul-BTP) ; perte 5 % sable, 10 % terre végétale ; consultés le 3 octobre 2026.
- S13 : Garandeau, big bag calcaire 1 m³ = 1,5 t ; vrac au-delà de 8 t : pratique négoce relevée le 3 octobre 2026, à confirmer par un terrassier.
