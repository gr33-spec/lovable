# Fibres-ciment : résumé de la recherche (20 novembre 2026)

Données complètes et sources : `fibres-ciment.json` (37 entrées, 3 verdicts, 3 fiches comptoir).
Statuts : 30 confirmées, 6 à une seule source, 1 à confirmer (81 % confirmées).

Sources principales : documentation technique Eternit « Plaques ondulées 177 x 51 FR » (avril 2015),
guide de pose Edilfibro Plakfort 5 et 6 ondes (2016, tableau tiré du NF DTU 40.37), fiche PO5 ELOS (Chausson),
fiches Eternit sur Batiproduits, manuel de pose Cedral (avril 2026) et documentation Cembrit (2016).
Le texte du NF DTU 40.37 n'a pas été lu : ses valeurs viennent des deux guides fabricants qui le reprennent.
Les ardoises fibres-ciment (nombre au m², recouvrements, crochets, palettes) sont déjà dans `ardoise.json`.

## Plaques ondulées : ce qui est sûr

| Point | Valeur |
| --- | --- |
| Profil | onde 177 × 51 mm, épaisseur 6,5 mm ; 5 ou 6 ondes seulement (pas de 8 ondes en France) |
| Largeur totale (utile) | 5 ondes 918 (873) mm ; 6 ondes 1095 (1050) mm |
| Longueurs | 5 ondes : 1,25 / 1,52 / 1,58 / 1,75 / 2,00 / 2,50 / 3,05 m ; 6 ondes : 1,25 / 1,58 / 1,75 / 2,00 / 2,50 m |
| 3,05 m | hors marque NF et hors Avis technique, posée sur 3 pannes |
| Poids | environ 14 kg/m² |
| Pente minimale | 9 % ; altitude ≤ 900 m |
| Recouvrement transversal | 200 mm (140 mm dès 31 %) ; maximum 230 (coins coupés d'usine) / 260 mm |
| Recouvrement longitudinal | environ 45 mm (1/4 d'onde, réglé au gabarit) |
| Entraxe des pannes | 1,385 m maximum ; panne bois ≥ 65 mm, métal ≥ 40 mm |
| Fixations | 2 par plaque et par panne, en 2e et 5e ondes, à 50 mm du bord haut |
| Fixations au m² (calcul) | 6 ondes 1,38 ; 5 ondes 1,65 ; plus la ligne d'égout |
| Plaques au m² (calcul) | 6 ondes de 1,585 m : 0,688 ; 5 ondes de 1,585 m : 0,827 |
| Porte-à-faux à l'égout | 350 mm sans gouttière, 200 mm avec |
| Rampant maximum | zone I 15 à 40 m, zone II 12 à 35 m, zone III 10 à 30 m selon la pente (tableau dans le JSON) |
| Faîtière | à charnière à bords ondulés (2 éléments), une par largeur de plaque, pente 10 à 100 % |

**Bretagne** (zones du DTU 40.37, différentes des zones ardoise) : zone III sur 20 km le long de la Manche et
de l'Atlantique jusqu'à Lorient ; zone II de Lorient vers le sud ; zone I à l'intérieur (une source : Eternit).

## Ardoises fibres-ciment (en plus d'ardoise.json)

- Pente minimale 25 % (14°) en zone I, rampant ≤ 15 m (Cedral, Cembrit) : confirmé.
- Liteaux au m², recouvrement 100 mm : 33×23 8,70 ; 40×24 6,67 ; 45×30 5,71 ; 60×30 4,00.
- Teintes : anthracite / noir, brun (gris, rouge en Tecta). « Bleu-noir » n'existe chez aucun des deux fabricants.

## Ce que le comptoir demande

Plaque : 5 ou 6 ondes, longueur, teinte (naturelle, Coloronde, Coloragri), coins coupés ou non, nombre.
Fixations : support bois (tirefond Ø 8) ou métal (vis Ø ≥ 6,3), longueur, rondelles. Accessoires : faîtière,
closoirs (de ventilation par 50), bandes de rive, tous en 5 ou 6 ondes.

## Verdicts sur le code

- Liteaux des ardoises fibres-ciment 6,67 et 4 : justes.
- Question de teinte « bleu-noir, noir ou brun » : à corriger en « anthracite / noir, brun, autre ».
- Plaques fibres-ciment rangées avec le bac acier : elles se vendent en longueurs fixes, avec 2 fixations par
  plaque et par panne. Une famille séparée est à décider avec le fondateur.

## Ce qui reste à confirmer

- Nombre de plaques par lot ou par palette (non publié).
- Zones climatiques du DTU 40.37 en Bretagne : une seule description écrite (Eternit).
- Conditionnement des fixations, des faîtières et des bandes de rive en négoce breton.
- Le texte Eternit dit « recouvrement longitudinal environ 1/2 onde » alors que son dessin et les largeurs donnent 45 mm.
