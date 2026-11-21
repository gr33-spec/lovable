# Tableau des ardoises : format + crochet → pureau, ardoises, crochets, liteaux

Document généré par le code (`packages/domain/test/tableau-ardoises.test.ts`) : c'est exactement ce que Mobiiz applique.
À valider par Greg (17 novembre 2026).

## La règle, en clair

- On ne demande jamais le pureau. On lit le **format de l'ardoise** et la **taille des crochets** (au devis, sinon on les demande ou on les propose).
- Recouvrement = crochet − 5 mm de jeu de tête (un crochet de 11 tient un recouvrement de 10,5 cm), soit pureau = (hauteur − crochet) ÷ 2 + 2,5 mm (règle du fondateur, confirmée : manuel CAP, ministère de la Culture, Cupa).
- Pureau = (hauteur de l'ardoise − recouvrement) ÷ 2.
- Ardoises au m² : la valeur de la table des fabricants (Cupa) quand elle existe pour ce format et ce recouvrement ; sinon la formule 1 ÷ (pureau × (largeur + épaisseur du crochet)).
- Ardoises à commander = surface × ardoises au m² + **5 % de chutes**.
- Crochets = un par ardoise commandée.
- Liteaux = un rang par pureau (surface ÷ pureau) + **5 %**.

## Le tableau (quantités pour 100 m² de toiture)

| Format | Crochet | Recouvrement | Pureau | Ardoises au m² | D'où vient le chiffre | Ardoises pour 100 m² | Crochets pour 100 m² | Liteaux pour 100 m² |
|---|---|---|---|---|---|---|---|---|
| 40×25 | de 8 | 7,5 cm | 16,25 cm | 24,52 | formule | 2 575 | 2 575 | 646 ml |
| 40×25 | de 9 | 8,5 cm | 15,75 cm | 25,3 | formule | 2 657 | 2 657 | 667 ml |
| 40×25 | de 10 | 9,5 cm | 15,25 cm | 26,13 | formule | 2 744 | 2 744 | 689 ml |
| 40×25 | de 11 | 10,5 cm | 14,75 cm | 27,01 | formule | 2 837 | 2 837 | 712 ml |
| 40×25 | de 12 | 11,5 cm | 14,25 cm | 27,96 | formule | 2 936 | 2 936 | 737 ml |
| 40×25 | de 13 | 12,5 cm | 13,75 cm | 28,98 | formule | 3 043 | 3 043 | 764 ml |
| 40×22 | de 8 | 7,5 cm | 16,25 cm | 27,85 | formule | 2 924 | 2 924 | 646 ml |
| 40×22 | de 9 | 8,5 cm | 15,75 cm | 28,73 | formule | 3 017 | 3 017 | 667 ml |
| 40×22 | de 10 | 9,5 cm | 15,25 cm | 29,67 | formule | 3 116 | 3 116 | 689 ml |
| 40×22 | de 11 | 10,5 cm | 14,75 cm | 30,68 | formule | 3 222 | 3 222 | 712 ml |
| 40×22 | de 12 | 11,5 cm | 14,25 cm | 31,75 | formule | 3 335 | 3 335 | 737 ml |
| 40×22 | de 13 | 12,5 cm | 13,75 cm | 32,91 | formule | 3 456 | 3 456 | 764 ml |
| 35×25 | de 8 | 7,5 cm | 13,75 cm | 28,98 | formule | 3 043 | 3 043 | 764 ml |
| 35×25 | de 9 | 8,5 cm | 13,25 cm | 30,07 | formule | 3 158 | 3 158 | 792 ml |
| 35×25 | de 10 | 9,5 cm | 12,75 cm | 31,25 | formule | 3 281 | 3 281 | 824 ml |
| 35×25 | de 11 | 10,5 cm | 12,25 cm | 32,52 | formule | 3 415 | 3 415 | 857 ml |
| 35×25 | de 12 | 11,5 cm | 11,75 cm | 33,91 | formule | 3 561 | 3 561 | 894 ml |
| 35×25 | de 13 | 12,5 cm | 11,25 cm | 35,41 | formule | 3 719 | 3 719 | 933 ml |
| 35×22 | de 8 | 7,5 cm | 13,75 cm | 32,91 | formule | 3 456 | 3 456 | 764 ml |
| 35×22 | de 9 | 8,5 cm | 13,25 cm | 34,15 | formule | 3 586 | 3 586 | 792 ml |
| 35×22 | de 10 | 9,5 cm | 12,75 cm | 35,49 | formule | 3 727 | 3 727 | 824 ml |
| 35×22 | de 11 | 10,5 cm | 12,25 cm | 36,94 | formule | 3 879 | 3 879 | 857 ml |
| 35×22 | de 12 | 11,5 cm | 11,75 cm | 38,51 | formule | 4 044 | 4 044 | 894 ml |
| 35×22 | de 13 | 12,5 cm | 11,25 cm | 40,22 | formule | 4 224 | 4 224 | 933 ml |
| 33×23 | de 8 | 7,5 cm | 12,75 cm | 33,95 | formule | 3 566 | 3 566 | 824 ml |
| 33×23 | de 9 | 8,5 cm | 12,25 cm | 35,34 | formule | 3 711 | 3 711 | 857 ml |
| 33×23 | de 10 | 9,5 cm | 11,75 cm | 36,84 | formule | 3 869 | 3 869 | 894 ml |
| 33×23 | de 11 | 10,5 cm | 11,25 cm | 38,48 | formule | 4 041 | 4 041 | 933 ml |
| 33×23 | de 12 | 11,5 cm | 10,75 cm | 40,27 | formule | 4 229 | 4 229 | 977 ml |
| 33×23 | de 13 | 12,5 cm | 10,25 cm | 42,23 | formule | 4 435 | 4 435 | 1 024 ml |
| 32×22 | de 8 | 7,5 cm | 12,25 cm | 36,94 | formule | 3 879 | 3 879 | 857 ml |
| 32×22 | de 9 | 8,5 cm | 11,75 cm | 38,51 | formule | 4 044 | 4 044 | 894 ml |
| 32×22 | de 10 | 9,5 cm | 11,25 cm | 40,22 | formule | 4 224 | 4 224 | 933 ml |
| 32×22 | de 11 | 10,5 cm | 10,75 cm | 42,09 | formule | 4 420 | 4 420 | 977 ml |
| 32×22 | de 12 | 11,5 cm | 10,25 cm | 44,15 | formule | 4 636 | 4 636 | 1 024 ml |
| 32×22 | de 13 | 12,5 cm | 9,75 cm | 46,41 | formule | 4 873 | 4 873 | 1 077 ml |
| 30×22 | de 8 | 7,5 cm | 11,25 cm | 40,22 | formule | 4 224 | 4 224 | 933 ml |
| 30×22 | de 9 | 8,5 cm | 10,75 cm | 42,09 | formule | 4 420 | 4 420 | 977 ml |
| 30×22 | de 10 | 9,5 cm | 10,25 cm | 44,15 | formule | 4 636 | 4 636 | 1 024 ml |
| 30×22 | de 11 | 10,5 cm | 9,75 cm | 46,41 | formule | 4 873 | 4 873 | 1 077 ml |
| 30×22 | de 12 | 11,5 cm | 9,25 cm | 48,92 | formule | 5 137 | 5 137 | 1 135 ml |
| 30×22 | de 13 | 12,5 cm | 8,75 cm | 51,71 | formule | 5 430 | 5 430 | 1 200 ml |
| 30×20 | de 8 | 7,5 cm | 11,25 cm | 44,22 | formule | 4 644 | 4 644 | 933 ml |
| 30×20 | de 9 | 8,5 cm | 10,75 cm | 46,28 | formule | 4 860 | 4 860 | 977 ml |
| 30×20 | de 10 | 9,5 cm | 10,25 cm | 48,54 | formule | 5 097 | 5 097 | 1 024 ml |
| 30×20 | de 11 | 10,5 cm | 9,75 cm | 51,03 | formule | 5 358 | 5 358 | 1 077 ml |
| 30×20 | de 12 | 11,5 cm | 9,25 cm | 53,79 | formule | 5 648 | 5 648 | 1 135 ml |
| 30×20 | de 13 | 12,5 cm | 8,75 cm | 56,86 | formule | 5 971 | 5 971 | 1 200 ml |
| 30×18 | de 8 | 7,5 cm | 11,25 cm | 49,11 | formule | 5 157 | 5 157 | 933 ml |
| 30×18 | de 9 | 8,5 cm | 10,75 cm | 51,39 | formule | 5 397 | 5 397 | 977 ml |
| 30×18 | de 10 | 9,5 cm | 10,25 cm | 53,9 | formule | 5 660 | 5 660 | 1 024 ml |
| 30×18 | de 11 | 10,5 cm | 9,75 cm | 56,67 | formule | 5 950 | 5 950 | 1 077 ml |
| 30×18 | de 12 | 11,5 cm | 9,25 cm | 59,73 | formule | 6 272 | 6 272 | 1 135 ml |
| 30×18 | de 13 | 12,5 cm | 8,75 cm | 63,14 | formule | 6 630 | 6 630 | 1 200 ml |
