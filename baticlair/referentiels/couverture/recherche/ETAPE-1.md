# Étape 1 : recherche brute (19 novembre 2026)

Neuf recherches, une par famille, plus l'inventaire de l'existant. Rien de ce dossier n'est lu par le moteur.

## Chiffres

| Famille | Entrées | Confirmées (2 sources) | Une source | À confirmer | Verdicts sur l'existant (confirmé / corrigé / à confirmer) |
|---|---|---|---|---|---|
| Ardoises | 741 | 616 (83 %) | 116 | 9 | 10 / 12 / 7 |
| Tuiles à emboîtement (93 modèles) | 1 067 | 13 (1 %) | 1 040 | 14 | 4 / 16 / 4 |
| Tuiles plates, canal, romanes, béton (52 modèles) | 418 | 34 (8 %) | 381 | 3 | 10 / 12 / 3 |
| Faîtage, rives, noues, égout, ventilation | 47 | 30 (64 %) | 13 | 4 | 7 / 10 / 8 |
| Zinguerie et évacuations | 66 | 44 (67 %) | 18 | 4 | 16 / 10 / 7 |
| Écrans et étanchéité | 42 | 24 (57 %) | 13 | 5 | 13 / 9 / 11 |
| Bois de couverture | 42 | 29 (69 %) | 9 | 4 | 12 / 8 / 7 |
| Carte des régions (101 départements) | 101 | 16 (16 %) | 68 | 17 | §26 et zone.ts : voir regions.md |
| **Total** | **2 524** | **806 (32 %)** | **1 658** | **60** | **72 / 77 / 47** |

Inventaire de l'existant : 369 chiffres (code, référentiel, tests, skill), dont 179 en contradiction entre deux
endroits (`inventaire-ratios.md`).

**Pourquoi 32 % et pas 98 %.** Les règles générales (pentes DTU, recouvrements, formules, entraxes) sont
confirmées par plusieurs sources. Les chiffres propres à un modèle (nombre au m², pureau, palette d'une tuile
précise) n'existent que sur la fiche de son fabricant : les négoces la recopient. Hors tuiles, le taux est de
79 % (773 sur 980). Une recherche de seconde source par modèle (CSTB, FDES INIES, objets BIM…) est en cours.

## Verdict sur les ratios du fondateur (skill `regles-metier`)

| Ratio | Verdict | Source / bonne valeur |
|---|---|---|
| Pureau = (longueur − crochet) ÷ 2 + 2,5 mm | **confirmé** | manuel CAP (« jeu de tête 0,5 cm »), guide ministère de la Culture, Cupa ; le code (+ 5 mm) est à corriger |
| 1 crochet par ardoise | **confirmé** | Cupa, Rathscheck, DTU 40.11 via guides ; le code (× 1,02) est à corriger |
| 1 rang en plus à l'égout et au faîtage (ardoise) | **confirmé** | manuel CAP, Cupa |
| Crochets inox, boîte de 500 | **confirmé** (agrafes) ; pointes en boîte de 700 ou 5 kg | Frénéhard, négoces |
| Formats courants 32×22 et 30×20 ; crochets 9 / 10 / 11 | **confirmé** | Cupa, Rathscheck |
| Clous galva, 1 au faîtage et 2 ailleurs | **corrigé** : inox ou cuivre (galva interdit depuis le DTU 2020), 2 au faîtage aussi | DTU 40.11 (2020) via guides, Frénéhard |
| Pertes ardoise 5 % / 10 % | **à confirmer** : aucune source chiffrée | — |
| Tuile : perte demandée à l'artisan | **confirmé** comme pratique (aucun fabricant ne donne de %, CAP : 5 %) ; le 3 % du code est sans source | — |
| Tuiles de rive (ml + 5 %) ÷ pureau, 2 lignes G / D | **confirmé** pour le principe et les 2 lignes ; le + 5 % est une marge sans source ; plate : ÷ (2 × pureau) | Edilians, Terreal, Koramic |
| Tuile canal : courant et couvert | **tranché** : 2 lignes de même quantité (1 pour 1) | Edilians, Terreal |
| Liteaux en ml, 1 ÷ pureau | **confirmé** | Cupa, Rathscheck, Edilians |
| Contre-liteaux entraxe 50 cm | **à confirmer** : ils suivent l'entraxe des chevrons ; aucune source ne donne 50 cm ; le référentiel dit 60 | — |
| Écran surface + 10 %, en m² | **à confirmer** : juste au-dessus de 30 % de pente, ≈ + 20 % en dessous (Siplast) ; le comptoir sert des rouleaux | Siplast, DTU 40.29 via guides |
| Faîtage en ml + 5 % | **à confirmer** : la faîtière se commande à la pièce (2,5 ou 3 au ml selon le modèle) | Edilians, Terreal, Monier |
| Closoir, rives, noues + 5 % | **à confirmer** : sans source, risque de double compte (noue : 1,85 m utiles sur 2 m) | — |
| Zinc 0,65 par défaut, naturel par défaut | **confirmé** | VMZinc |
| Zinc façonné en 2 m | **confirmé** (faîtage zinc compris : le code le met en 3 m, à corriger) | VMZinc, Rheinzink |
| Gouttière en 4 m | **confirmé** | VMZinc, Nicoll |
| Crochets de gouttière tous les 50 cm | **confirmé** (+ 1 en bout) | DTU 40.5 via guides, VMZinc |
| Descente en 2 m | **confirmé en zinc**, **corrigé en PVC** (4 m) ; le code met 4 m en zinc, à corriger | VMZinc, Rheinzink, NedZink, Nicoll |
| Colliers 1 tous les 2 m + 1 | **confirmé** (le « + 1 » est une habitude que rien ne contredit) | DTU 40.5 via guides |
| Longueurs de bois en Bretagne 3 / 3,70 / 4,20 m | **corrigé** : 3,00 et 4,20 confirmées, 3,70 introuvable (3,60) ; deux séries : bois du Nord au pas de 0,30 m, bois de France au pas de 0,50 m | Bretagne Matériaux, Tanguy, Quéguiner |
| Longueurs Champagne-Ardenne 4 / 4,50 / 5 / 5,50 m | **à confirmer** : correspond au bois de France ; aucun négoce régional lisible | — |
| Liteau sapin par défaut | **confirmé** (sapin / épicéa traité classe 2) | négoces |

## Ce que le fondateur doit trancher (classé par poids sur la commande)

1. **Règle de confirmation des chiffres par modèle** : la fiche officielle du fabricant, datée, plus le contrôle
   par le calcul (nombre au m² = 1 ÷ largeur utile × pureau), suffit-elle pour « confirmé » ?
2. **Suggestions contre §49** : ta règle « seulement en Suggestions » contredit le référentiel écrit (§49.1 :
   pas de bloc Suggestions) que le code applique. Le branchement en dépend.
3. **Zone par commune** (distance à la côte et altitude, comme le DTU) plutôt que par département. Corrections
   sûres en attendant : 44, 85, 17, 33, 40 en zone 2 ; Rennes, Vitré, Fougères en zone 1 ; 56 en zone 2 sur la
   côte du golfe ; altitude (48, 15, 43, 12 en zone 3). Deux zones distinctes : ardoise et tuile.
4. **Ardoise** : garder ta marge de 2,5 mm avec un plancher « jamais sous le recouvrement du DTU » ; remplacer
   la table du code par le tableau DTU en projection horizontale ; pente par défaut 45°.
5. **Tuile** : pureau par défaut sans longueur de rampant (maxi du fabricant en hypothèse affichée, ou le
   demander) ; faîtière au nombre du modèle (2,5 ou 3 au ml) au lieu de 2,9 ; rive universelle ou individuelle.
6. **Écran** : coefficient (+ 10 % partout, ou 1,10 / 1,20 selon la pente) et affichage (m² ou rouleaux).
7. **Bois** : liteau d'ardoise par défaut en Bretagne (18×38 ou 18×50, ou le demander) ; entraxe des
   contre-liteaux (le demander ?) ; « botte de 50 ml » remplacée par « N pièces de L m » ; arrondi à la
   longueur de la région qui gaspille le moins.
8. **Zinguerie** : descente zinc 2 m / PVC 4 m ; faîtage zinc 2 m ; crochets à 40 cm en bord de mer (sans
   source) ; coudes 2 d'office ou demandés ; dilatation zinc au-delà de 12 m (en Suggestion ?).
9. **Faîtage breton par défaut** : terre cuite scellée ou lignolet (tradition sourcée) ou zinc (à vérifier
   auprès des couvreurs).
10. **Points bretons à faire relire par un couvreur ardoisier** : lignolet, faîtière Armor, noquets, part de
    crochets à pointe (1/5 sur liteaux, 100 % sur volige), volige jointive en site venté.
