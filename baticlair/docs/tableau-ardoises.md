# Tableau des ardoises : format + crochet → pureau, ardoises, crochets, liteaux

Document généré par le code (`packages/domain/test/tableau-ardoises.test.ts`) : c'est exactement ce que Mobiiz applique.
À valider par Greg (17 novembre 2026).

## La règle, en clair

- On ne demande jamais le pureau. On lit le **format de l'ardoise** et la **taille des crochets** (au devis, sinon on les demande ou on les propose).
- Recouvrement = crochet − 5 mm de jeu de tête (un crochet de 11 tient un recouvrement de 10,5 cm), soit pureau = (hauteur − crochet) ÷ 2 + 2,5 mm (règle du fondateur, confirmée : manuel CAP, ministère de la Culture, Cupa).
- Pureau = (hauteur de l'ardoise − recouvrement) ÷ 2.
- Ardoises au m² : la valeur de la table des fabricants (Cupa) quand elle existe pour ce format et ce recouvrement ; sinon la formule 1 ÷ (pureau × (largeur + épaisseur du crochet)).
- Ardoises à commander = surface × ardoises au m² + **5 % de chutes**.
- Crochets = un par ardoise commandée. Pose à agrafe : 4 sur 5 à agrafe, le cinquième à pointe (au droit des chevrons), chacun arrondi au-dessus ; pose à pointe : tous à pointe. Sans type écrit au devis, Mobiiz demande « à agrafe ou à pointe ? » une fois pour le devis (Greg, 22 novembre 2026). Le tableau compte une pose à agrafe.
- Liteaux = un rang par pureau (surface ÷ pureau) + **10 % de chute au total**, aboutage compris (Greg, 22 novembre 2026).

## Le tableau (quantités pour 100 m² de toiture)

| Format | Crochet | Recouvrement | Pureau | Ardoises au m² | D'où vient le chiffre | Ardoises pour 100 m² | Crochets pour 100 m² (à agrafe + à pointe) | Liteaux pour 100 m² |
|---|---|---|---|---|---|---|---|---|
| 40×25 | de 8 | 7,5 cm | 16,25 cm | 24,52 | formule | 2 575 | 2 575 (2 060 + 515) | 677 ml |
| 40×25 | de 9 | 8,5 cm | 15,75 cm | 25,3 | formule | 2 657 | 2 658 (2 126 + 532) | 698 ml |
| 40×25 | de 10 | 9,5 cm | 15,25 cm | 26,13 | formule | 2 744 | 2 745 (2 196 + 549) | 721 ml |
| 40×25 | de 11 | 10,5 cm | 14,75 cm | 27,01 | formule | 2 837 | 2 838 (2 270 + 568) | 746 ml |
| 40×25 | de 12 | 11,5 cm | 14,25 cm | 27,96 | formule | 2 936 | 2 937 (2 349 + 588) | 772 ml |
| 40×25 | de 13 | 12,5 cm | 13,75 cm | 28,98 | formule | 3 043 | 3 044 (2 435 + 609) | 800 ml |
| 40×22 | de 8 | 7,5 cm | 16,25 cm | 27,85 | formule | 2 924 | 2 925 (2 340 + 585) | 677 ml |
| 40×22 | de 9 | 8,5 cm | 15,75 cm | 28,73 | formule | 3 017 | 3 018 (2 414 + 604) | 698 ml |
| 40×22 | de 10 | 9,5 cm | 15,25 cm | 29,67 | formule | 3 116 | 3 117 (2 493 + 624) | 721 ml |
| 40×22 | de 11 | 10,5 cm | 14,75 cm | 30,68 | formule | 3 222 | 3 223 (2 578 + 645) | 746 ml |
| 40×22 | de 12 | 11,5 cm | 14,25 cm | 31,75 | formule | 3 335 | 3 335 (2 668 + 667) | 772 ml |
| 40×22 | de 13 | 12,5 cm | 13,75 cm | 32,91 | formule | 3 456 | 3 457 (2 765 + 692) | 800 ml |
| 35×25 | de 8 | 7,5 cm | 13,75 cm | 28,98 | formule | 3 043 | 3 044 (2 435 + 609) | 800 ml |
| 35×25 | de 9 | 8,5 cm | 13,25 cm | 30,07 | formule | 3 158 | 3 159 (2 527 + 632) | 830 ml |
| 35×25 | de 10 | 9,5 cm | 12,75 cm | 31,25 | formule | 3 281 | 3 282 (2 625 + 657) | 863 ml |
| 35×25 | de 11 | 10,5 cm | 12,25 cm | 32,52 | formule | 3 415 | 3 415 (2 732 + 683) | 898 ml |
| 35×25 | de 12 | 11,5 cm | 11,75 cm | 33,91 | formule | 3 561 | 3 562 (2 849 + 713) | 936 ml |
| 35×25 | de 13 | 12,5 cm | 11,25 cm | 35,41 | formule | 3 719 | 3 720 (2 976 + 744) | 978 ml |
| 35×22 | de 8 | 7,5 cm | 13,75 cm | 32,91 | formule | 3 456 | 3 457 (2 765 + 692) | 800 ml |
| 35×22 | de 9 | 8,5 cm | 13,25 cm | 34,15 | formule | 3 586 | 3 587 (2 869 + 718) | 830 ml |
| 35×22 | de 10 | 9,5 cm | 12,75 cm | 35,49 | formule | 3 727 | 3 728 (2 982 + 746) | 863 ml |
| 35×22 | de 11 | 10,5 cm | 12,25 cm | 36,94 | formule | 3 879 | 3 880 (3 104 + 776) | 898 ml |
| 35×22 | de 12 | 11,5 cm | 11,75 cm | 38,51 | formule | 4 044 | 4 045 (3 236 + 809) | 936 ml |
| 35×22 | de 13 | 12,5 cm | 11,25 cm | 40,22 | formule | 4 224 | 4 225 (3 380 + 845) | 978 ml |
| 33×23 | de 8 | 7,5 cm | 12,75 cm | 33,95 | formule | 3 566 | 3 567 (2 853 + 714) | 863 ml |
| 33×23 | de 9 | 8,5 cm | 12,25 cm | 35,34 | formule | 3 711 | 3 712 (2 969 + 743) | 898 ml |
| 33×23 | de 10 | 9,5 cm | 11,75 cm | 36,84 | formule | 3 869 | 3 870 (3 096 + 774) | 936 ml |
| 33×23 | de 11 | 10,5 cm | 11,25 cm | 38,48 | formule | 4 041 | 4 042 (3 233 + 809) | 978 ml |
| 33×23 | de 12 | 11,5 cm | 10,75 cm | 40,27 | formule | 4 229 | 4 230 (3 384 + 846) | 1 023 ml |
| 33×23 | de 13 | 12,5 cm | 10,25 cm | 42,23 | formule | 4 435 | 4 435 (3 548 + 887) | 1 073 ml |
| 32×22 | de 8 | 7,5 cm | 12,25 cm | 36,94 | formule | 3 879 | 3 880 (3 104 + 776) | 898 ml |
| 32×22 | de 9 | 8,5 cm | 11,75 cm | 38,51 | formule | 4 044 | 4 045 (3 236 + 809) | 936 ml |
| 32×22 | de 10 | 9,5 cm | 11,25 cm | 40,22 | formule | 4 224 | 4 225 (3 380 + 845) | 978 ml |
| 32×22 | de 11 | 10,5 cm | 10,75 cm | 42,09 | formule | 4 420 | 4 420 (3 536 + 884) | 1 023 ml |
| 32×22 | de 12 | 11,5 cm | 10,25 cm | 44,15 | formule | 4 636 | 4 637 (3 709 + 928) | 1 073 ml |
| 32×22 | de 13 | 12,5 cm | 9,75 cm | 46,41 | formule | 4 873 | 4 874 (3 899 + 975) | 1 128 ml |
| 30×22 | de 8 | 7,5 cm | 11,25 cm | 40,22 | formule | 4 224 | 4 225 (3 380 + 845) | 978 ml |
| 30×22 | de 9 | 8,5 cm | 10,75 cm | 42,09 | formule | 4 420 | 4 420 (3 536 + 884) | 1 023 ml |
| 30×22 | de 10 | 9,5 cm | 10,25 cm | 44,15 | formule | 4 636 | 4 637 (3 709 + 928) | 1 073 ml |
| 30×22 | de 11 | 10,5 cm | 9,75 cm | 46,41 | formule | 4 873 | 4 874 (3 899 + 975) | 1 128 ml |
| 30×22 | de 12 | 11,5 cm | 9,25 cm | 48,92 | formule | 5 137 | 5 138 (4 110 + 1 028) | 1 189 ml |
| 30×22 | de 13 | 12,5 cm | 8,75 cm | 51,71 | formule | 5 430 | 5 430 (4 344 + 1 086) | 1 257 ml |
| 30×20 | de 8 | 7,5 cm | 11,25 cm | 44,22 | formule | 4 644 | 4 645 (3 716 + 929) | 978 ml |
| 30×20 | de 9 | 8,5 cm | 10,75 cm | 46,28 | formule | 4 860 | 4 860 (3 888 + 972) | 1 023 ml |
| 30×20 | de 10 | 9,5 cm | 10,25 cm | 48,54 | formule | 5 097 | 5 098 (4 078 + 1 020) | 1 073 ml |
| 30×20 | de 11 | 10,5 cm | 9,75 cm | 51,03 | formule | 5 358 | 5 359 (4 287 + 1 072) | 1 128 ml |
| 30×20 | de 12 | 11,5 cm | 9,25 cm | 53,79 | formule | 5 648 | 5 649 (4 519 + 1 130) | 1 189 ml |
| 30×20 | de 13 | 12,5 cm | 8,75 cm | 56,86 | formule | 5 971 | 5 972 (4 777 + 1 195) | 1 257 ml |
| 30×18 | de 8 | 7,5 cm | 11,25 cm | 49,11 | formule | 5 157 | 5 158 (4 126 + 1 032) | 978 ml |
| 30×18 | de 9 | 8,5 cm | 10,75 cm | 51,39 | formule | 5 397 | 5 398 (4 318 + 1 080) | 1 023 ml |
| 30×18 | de 10 | 9,5 cm | 10,25 cm | 53,9 | formule | 5 660 | 5 660 (4 528 + 1 132) | 1 073 ml |
| 30×18 | de 11 | 10,5 cm | 9,75 cm | 56,67 | formule | 5 950 | 5 950 (4 760 + 1 190) | 1 128 ml |
| 30×18 | de 12 | 11,5 cm | 9,25 cm | 59,73 | formule | 6 272 | 6 273 (5 018 + 1 255) | 1 189 ml |
| 30×18 | de 13 | 12,5 cm | 8,75 cm | 63,14 | formule | 6 630 | 6 630 (5 304 + 1 326) | 1 257 ml |
