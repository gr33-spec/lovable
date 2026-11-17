# Tableau des ardoises : format + crochet → pureau, ardoises, crochets, liteaux

Document généré par le code (`packages/domain/test/tableau-ardoises.test.ts`) : c'est exactement ce que Mobiiz applique.
À valider par Greg (17 novembre 2026).

## La règle, en clair

- On ne demande jamais le pureau. On lit le **format de l'ardoise** et la **taille des crochets** (au devis, sinon on les demande ou on les propose).
- Recouvrement = crochet − 1 cm (un crochet de 11 tient un recouvrement de 10 cm).
- Pureau = (hauteur de l'ardoise − recouvrement) ÷ 2.
- Ardoises au m² : la valeur de la table des fabricants (Cupa) quand elle existe pour ce format et ce recouvrement ; sinon la formule 1 ÷ (pureau × (largeur + épaisseur du crochet)).
- Ardoises à commander = surface × ardoises au m² + **5 % de chutes**.
- Crochets = un par ardoise commandée + **2 %**.
- Liteaux = un rang par pureau (surface ÷ pureau) + **5 %**.

## Le tableau (quantités pour 100 m² de toiture)

| Format | Crochet | Recouvrement | Pureau | Ardoises au m² | D'où vient le chiffre | Ardoises pour 100 m² | Crochets pour 100 m² | Liteaux pour 100 m² |
|---|---|---|---|---|---|---|---|---|
| 40×25 | de 8 | 7 cm | 16,5 cm | 24,15 | formule | 2 536 | 2 587 | 636 ml |
| 40×25 | de 9 | 8 cm | 16 cm | 24,9 | formule | 2 615 | 2 668 | 656 ml |
| 40×25 | de 10 | 9 cm | 15,5 cm | 25,7 | formule | 2 699 | 2 753 | 677 ml |
| 40×25 | de 11 | 10 cm | 15 cm | 26,56 | formule | 2 789 | 2 845 | 700 ml |
| 40×25 | de 12 | 11 cm | 14,5 cm | 27,1 | table des fabricants | 2 846 | 2 903 | 724 ml |
| 40×25 | de 13 | 12 cm | 14 cm | 28,46 | formule | 2 989 | 3 049 | 750 ml |
| 40×22 | de 8 | 7 cm | 16,5 cm | 27,42 | formule | 2 880 | 2 938 | 636 ml |
| 40×22 | de 9 | 8 cm | 16 cm | 28,28 | formule | 2 970 | 3 030 | 656 ml |
| 40×22 | de 10 | 9 cm | 15,5 cm | 29,19 | formule | 3 066 | 3 128 | 677 ml |
| 40×22 | de 11 | 10 cm | 15 cm | 29,9 | table des fabricants | 3 140 | 3 203 | 700 ml |
| 40×22 | de 12 | 11 cm | 14,5 cm | 30,8 | table des fabricants | 3 234 | 3 299 | 724 ml |
| 40×22 | de 13 | 12 cm | 14 cm | 32,32 | formule | 3 394 | 3 462 | 750 ml |
| 35×25 | de 8 | 7 cm | 14 cm | 28,46 | formule | 2 989 | 3 049 | 750 ml |
| 35×25 | de 9 | 8 cm | 13,5 cm | 29,51 | formule | 3 099 | 3 161 | 778 ml |
| 35×25 | de 10 | 9 cm | 13 cm | 30,65 | formule | 3 218 | 3 283 | 808 ml |
| 35×25 | de 11 | 10 cm | 12,5 cm | 31,6 | table des fabricants | 3 318 | 3 385 | 840 ml |
| 35×25 | de 12 | 11 cm | 12 cm | 32,8 | table des fabricants | 3 444 | 3 513 | 875 ml |
| 35×25 | de 13 | 12 cm | 11,5 cm | 34,64 | formule | 3 638 | 3 711 | 913 ml |
| 35×22 | de 8 | 7 cm | 14 cm | 32,32 | formule | 3 394 | 3 462 | 750 ml |
| 35×22 | de 9 | 8 cm | 13,5 cm | 33,52 | formule | 3 520 | 3 591 | 778 ml |
| 35×22 | de 10 | 9 cm | 13 cm | 34,81 | formule | 3 655 | 3 729 | 808 ml |
| 35×22 | de 11 | 10 cm | 12,5 cm | 35,9 | table des fabricants | 3 770 | 3 846 | 840 ml |
| 35×22 | de 12 | 11 cm | 12 cm | 37,2 | table des fabricants | 3 906 | 3 985 | 875 ml |
| 35×22 | de 13 | 12 cm | 11,5 cm | 39,35 | formule | 4 132 | 4 215 | 913 ml |
| 33×23 | de 8 | 7 cm | 13 cm | 33,3 | formule | 3 497 | 3 567 | 808 ml |
| 33×23 | de 9 | 8 cm | 12,5 cm | 34,63 | formule | 3 637 | 3 710 | 840 ml |
| 33×23 | de 10 | 9 cm | 12 cm | 36,08 | formule | 3 788 | 3 864 | 875 ml |
| 33×23 | de 11 | 10 cm | 11,5 cm | 37,3 | table des fabricants | 3 917 | 3 996 | 913 ml |
| 33×23 | de 12 | 11 cm | 11 cm | 38,8 | table des fabricants | 4 074 | 4 156 | 955 ml |
| 33×23 | de 13 | 12 cm | 10,5 cm | 41,23 | formule | 4 330 | 4 417 | 1 000 ml |
| 32×22 | de 8 | 7 cm | 12,5 cm | 36,2 | formule | 3 801 | 3 878 | 840 ml |
| 32×22 | de 9 | 8 cm | 12 cm | 37,3 | table des fabricants | 3 917 | 3 996 | 875 ml |
| 32×22 | de 10 | 9 cm | 11,5 cm | 39,35 | formule | 4 132 | 4 215 | 913 ml |
| 32×22 | de 11 | 10 cm | 11 cm | 40,7 | table des fabricants | 4 274 | 4 360 | 955 ml |
| 32×22 | de 12 | 11 cm | 10,5 cm | 43,09 | formule | 4 525 | 4 616 | 1 000 ml |
| 32×22 | de 13 | 12 cm | 10 cm | 45,25 | formule | 4 752 | 4 848 | 1 050 ml |
| 30×22 | de 8 | 7 cm | 11,5 cm | 39,35 | formule | 4 132 | 4 215 | 913 ml |
| 30×22 | de 9 | 8 cm | 11 cm | 40,7 | table des fabricants | 4 274 | 4 360 | 955 ml |
| 30×22 | de 10 | 9 cm | 10,5 cm | 43,09 | formule | 4 525 | 4 616 | 1 000 ml |
| 30×22 | de 11 | 10 cm | 10 cm | 44,8 | table des fabricants | 4 704 | 4 799 | 1 050 ml |
| 30×22 | de 12 | 11 cm | 9,5 cm | 47,63 | formule | 5 002 | 5 103 | 1 105 ml |
| 30×22 | de 13 | 12 cm | 9 cm | 50,28 | formule | 5 280 | 5 386 | 1 167 ml |
| 30×20 | de 8 | 7 cm | 11,5 cm | 43,26 | formule | 4 543 | 4 634 | 913 ml |
| 30×20 | de 9 | 8 cm | 11 cm | 44,7 | table des fabricants | 4 694 | 4 788 | 955 ml |
| 30×20 | de 10 | 9 cm | 10,5 cm | 47,38 | formule | 4 976 | 5 076 | 1 000 ml |
| 30×20 | de 11 | 10 cm | 10 cm | 49,2 | table des fabricants | 5 166 | 5 270 | 1 050 ml |
| 30×20 | de 12 | 11 cm | 9,5 cm | 52,37 | formule | 5 499 | 5 609 | 1 105 ml |
| 30×20 | de 13 | 12 cm | 9 cm | 55,28 | formule | 5 805 | 5 922 | 1 167 ml |
| 30×18 | de 8 | 7 cm | 11,5 cm | 48,04 | formule | 5 045 | 5 146 | 913 ml |
| 30×18 | de 9 | 8 cm | 11 cm | 49,6 | table des fabricants | 5 208 | 5 313 | 955 ml |
| 30×18 | de 10 | 9 cm | 10,5 cm | 52,62 | formule | 5 525 | 5 636 | 1 000 ml |
| 30×18 | de 11 | 10 cm | 10 cm | 54,6 | table des fabricants | 5 733 | 5 848 | 1 050 ml |
| 30×18 | de 12 | 11 cm | 9,5 cm | 58,16 | formule | 6 107 | 6 230 | 1 105 ml |
| 30×18 | de 13 | 12 cm | 9 cm | 61,39 | formule | 6 446 | 6 575 | 1 167 ml |
