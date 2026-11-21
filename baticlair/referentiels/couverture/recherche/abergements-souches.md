# Abergements de souche et de cheminée : résumé de la recherche (20 novembre 2026)

Données, sources et extraits : `abergements-souches.json` (18 entrées : 11 confirmées, 6 à une source, 1 à confirmer ; 9 verdicts ; 5 fiches comptoir).
Famille `abergement`, pas encore branchée dans `construire_fiche.py`. Bandes zinc de 2 m, mortier de solin et étain : voir `zinguerie.json` et `points-singuliers.json`.

## Ce qui est sûr

| Donnée | Valeur | Statut |
| --- | --- | --- |
| Pièces | bavette (aval), 2 rives à noquets ou couloirs, derrière / besace (amont), bande porte-solin + solin | confirmé |
| Bavette | largeur de souche + 10 à 12 cm de chaque côté, partie visible ≥ 1 pureau | confirmé |
| Relevé contre la souche | 10 cm minimum (Wakaflex : 15 cm) | confirmé |
| Noquets | longueur de l'élément, posés **tous les deux rangs** : ml ÷ (2 × pureau) | confirmé (le CAP enseigne 1 par rang) |
| Bande porte-solin | développé ≈ 100 mm, 2 m | confirmé |
| Plomb, masse | 1,5 mm 17,0 ; 2 mm 22,7 ; 2,5 mm 28,4 kg/m² | confirmé (fabricant + densité 11,35) |
| Plomb, formats | bandes 160 à 400 mm en 10, 5 ou 2 m ; épaisseurs 1,25 à 3 mm | confirmé (Le Plomb Français, D'Huart) |
| Bavette plomb plissé (préfabriqué) | 200 à 300 mm | confirmé |
| Bande souple sans plomb | rouleau de 5 m (Wakaflex, Flexeo, Easy-Form, Ubiflex) | confirmé |

Une source : derrière (débords 12 à 15 cm, tuiles en recouvrement 6 cm, relevé 10 à 12 cm) ; épaisseur de plomb par ouvrage (2 mm pour une cheminée) ; largeurs Wakaflex 140 / 180 / 280 / 370 / 560 mm, coloris Rouge Sienne, Ardoise, Gris Plomb, Brun ; longueur de bande souple ≈ périmètre + 1 m.

## Verdicts principaux
- Noquets « ml / pureau » (§12, §30) : **corrigé**, ml / (2 × pureau) dans le cas courant.
- `rouleau_plomb = 6 m` (`roofing.ts:2961`) : **corrigé**, 10 m (≤ 300 mm) ou 5 m (330 mm et plus).
- Plomb « bandes 20 à 100 cm, 3 à 6 m » : **corrigé**.
- Masses du plomb : **confirmées**. Défaut 1,5 mm : règle du fondateur, à signaler (2 mm conseillé pour une cheminée).
- Abergement « périmètre × 1,3 » : **à confirmer** ; le calcul donne × 1,4 (souche 60 × 60) à × 1,6 (40 × 40).

## Reste à confirmer
- Noquets taillés par feuille 2 × 1 m (≈ 30 au calcul, la doc dit 18).
- Développé du derrière (besace) en zinc et coefficient de longueur.
- Chevilles et pattes au ml de porte-solin.
