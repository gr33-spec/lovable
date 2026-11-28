# Accessoires des tuiles : résumé de la recherche (20 novembre 2026)

Données, sources et extraits : `accessoires-tuiles.json` (famille `accessoires_tuiles`, 66 entrées, 246 valeurs :
45 entrées confirmées fabricant, 12 confirmées, 7 à une source, 2 à confirmer ; 3 verdicts ; 4 fiches comptoir ;
7 corrections). Pas encore branché dans `construire_fiche.py`. Modèles : HP 10 et PV 10 Huguenot, Alpha 10 Ste Foy
(Edilians), Actua (Koramic), Signy (Monier), Romane Canal (Terreal). Fiches officielles relues le 20/11/2026.

## Chatières

| Modèle | Référence | Section | 100 m² comble perdu (1/5000) | 100 m² rampant isolé sans écran (1/3000) |
| --- | --- | --- | --- | --- |
| HP 10 Huguenot | 205.20 | 50 cm² | 4 | 7 |
| PV 10 Huguenot | 214.20 | 50 cm² | 4 | 7 |
| Signy | (pas de code) | 33 cm² | 7 | 11 |
| Actua | MACT 8640 + grille 6070272 | 26 cm² | 8 | 13 |
| Alpha 10 Ste Foy | 200.20 | 19 cm² | 11 | 18 |
| Romane Canal | 610 RC | 18 cm² | 12 (Terreal imprime 11) | 19 |

Nombre total (moitié en bas, moitié en haut) = arrondi supérieur de surface projetée × ratio ÷ section.
Le calcul refait exactement les tables Koramic et Terreal. Il n'y a pas de nombre de chatières au m² commun à tous les modèles.

## Rives, demi-tuiles, faîtières
- HP 10 : rabat 205.72/73 + 1/2 rabat 205.74/75, rive PV 13 215.41/42, universelle 1050. PV 10 : **pas de rabat**, rive PV 13 215.41/42, 1050, Patrimoine 1048. Alpha 10 : rive individuelle 200.41/42, universelle 1051.
- Rabat + demi-rabat : **2,7 par ml et par côté au total** (≈ 1,35 + 1,35), pas 2,7 de chaque (Koramic, Monier).
- Romane Canal : pas de demi-tuile en largeur, ajustement en longueur (demi-pureau 3 RC, sous-faîtières 4,7/ml).
- Signy : rive universelle de 33 et son about en Rouge Vieilli seulement.
- Références des faîtières, abouts et frontons de chaque modèle : dans le JSON.

## Closoirs
Largeur selon la classe de galbe de la tuile : G0 (HP 10, Alpha 10, Actua, Signy) 240 mm SIROKO+4 ou 28/32 Figaroll ;
G1 (PV 10) 300 à 310 mm ; G2 (Romane Canal) 370 à 390 mm ou 34/38. Rouleaux de 5 ml, recouvrement 5 cm,
rouleaux = arrondi supérieur de ml ÷ 4,95. Ventilation : Figaroll Plus 103, SHARK+ 100, Lahe-Roll / ZEF 150, SIROKO+ 150 à 200 cm²/ml.

## Mortier de faîtage
5 à 10 kg/ml (Weber), 5 à 20 (PRB Pose Tuiles), 5 (VPI), 12 à 25 (PRB bâtard, généraliste). Aucun fabricant
ne sépare la faîtière demi-ronde de l'angulaire. C'est le galbe de la tuile qui fait varier la quantité (à confirmer).
Sacs de 25 kg (≈ 15 l), 48 par palette ; 4 sacs pour 10 ml à 8 kg/ml. Le 35 kg est un mortier de maçonnerie.

## Corrections (à reporter dans `tuiles-emboitement.json`, non modifié ici)
1. « Palette standard Edilians » est écrit sur 49 entrées Koramic, Terreal et Monier. L'ancien « Terreal » de la HP 10 venait d'une phrase de la fiche Romane Canal.
2. Rive « PV 13 » de la PV 10 : **c'est juste**, la fiche Edilians la désigne (commune aux HP 10, PV 10, H 14 et Losangée).
3. PV 10 = HP 10 en chiffres : vérifié, même moule. Restent différents : galbe G0/G1, DTU, pentes, rives, coloris et références.
4. Rive à rabat HP 10 : le total par côté est 2,7, pas 2,7 + 2,7.
5. La fiche HP 10 de mars 2026 remplace celle de janvier 2024 (chiffres identiques). Actua : « Rouge naturel ». Les coloris de la Romane Canal ont été ajoutés.

## Reste à confirmer
- Les coloris réellement stockés en Bretagne (aucune source publique).
- Le mortier par type de faîtière.
- L'absence de mortier de couverture en sac de 35 kg.
- La gamme Lahe-Roll actuelle (brochure de 2015).
- Les codes Koramic des faîtières (lus dans l'ordre de la fiche).
