# Référentiel couverture — CHANGELOG

## Version roofing-2026.10.03-13 (appliquée dans le moteur)

**Format non admissible (§34)** : un recouvrement hors des bornes Cupa d'un format (32×22 : 69 à 103 mm ; 30×22 : 69 à 100 mm…) rend ce format non admis. Rien n'est calculé pour les ardoises et les crochets ; UNE question à boutons propose les formats dont la plage contient ce recouvrement, le plus proche d'abord, marqué « conseillé ».

| Cas | Avant | Maintenant |
|---|---|---|
| 32×22, 45°, région III, rampant 6 m (R 105) — exemple du §3 | 8 840 ardoises (formule) | non admis → 33×23 (conseillé), 35×22, 35×25, 40×22 |
| 30×22, 30°, région III (R 120) | calculé par la formule | non admis → 40×22 (conseillé)… |

## Version roofing-2026.10.03-12

Décision du fondateur : **la table Cupa (§34) fait foi** pour tous les formats et recouvrements qu'elle couvre ; la formule Cupa ne sert qu'hors table.

| Élément | -11 | -12 |
|---|---|---|
| Ardoises au m² | formule Cupa partout | **table Cupa (194 lignes du §34)**, lue sur le recouvrement posé (hauteur − 2 × pureau) ; formule Cupa seulement hors table, dite « hors table » |
| Diamètre du crochet | change toujours le nombre | toujours affiché et modifiable ; ne change le nombre que hors table |
| 200 m², 30×22, 40°, région III (R 100) | 9 050 + 5 % | **44,8/m² → 9 408** |
| 200 m², 30×22, 45°, région I (R 80) | 8 639 | **40,7/m² → 8 547** |
| 200 m², 30×22, 45°, région III (R 95, hors table) | 9 271 / 9 200 à Brest | inchangé (formule) |
| Région ardoise | — | marquée **« estimation »** dans l'explication (zone climatique du département, en attendant la liste du DTU 40.11) |

## Version roofing-2026.10.03-11

Demandé par le fondateur avant la fusion de la porte `/v1/quantitatifs` :

| Élément | Avant (-10) | Maintenant (-11) |
|---|---|---|
| Ardoises au crochet | surface / (largeur × pureau) | formule Cupa §34 : surface / [pureau × (largeur + Ø crochet)] |
| Ø du crochet | non compté | 1 mm ; **inox 2,7 mm d'office si le chantier est dans un département littoral** (code postal) ; modifiable |
| 200 m², 30×22, 45°, région III | 9 313 ardoises | 9 271 (crochet 1 mm) ; **9 200 à Brest** (2,7 mm) |
| Crochets d'ardoise | même calcul que les ardoises, + 2 % (9 047 : moins que les ardoises) | **ardoises commandées (après marge) × 1,02** : 9 457 (1 mm), 9 384 à Brest ; jamais moins que les ardoises (test permanent) |
| Nom dans l'explication | « zone climatique 3 » | « région ardoise III » (DTU 40.11 ; la zone climatique reste pour les tuiles) |

Reste à faire (étape 3 du plan v3) : la table Cupa elle-même (§34) avant la formule, et la table des régions ardoise par département (§26, « à saisir depuis le DTU »). En attendant, la région ardoise prend la valeur de la zone climatique du département.

## Référentiel du 3 octobre 2026, 39 sections

Consigne du §37 : quand les sections 34, 35 et 36 (sources fabricant) contredisent les sections 3, 5 et 7, ce sont 34-36 qui font foi. Les anciennes valeurs sont notées ici avec la mention « remplacé par source fabricant ». Les sections 3, 5 et 7 restent utilisées pour les matériaux que 34-36 ne couvrent pas encore (fibres-ciment, tuiles béton, modèles non listés), chargées avec `confiance: "estimation"`.

### §3 Ardoise naturelle → §34 Table officielle Cupa — remplacé par source fabricant

| Élément | Ancienne valeur (§3) | Nouvelle valeur (§34) |
|---|---|---|
| Formule ardoises/m² | 1 000 000 / (L × pureau), L et pureau en mm | 1 / [P × (L + Ø crochet)], Ø 1 mm (0,0027 m inox en zone littorale) |
| Longueur de crochet | pureau + 10 à 20 mm | R + 1 cm environ (R 100 → 11 cm, R 90 → 10, R 80 → 9, R 70 → 8) |
| 40×22, R 100 | 30,3 ardoises/m² | 29,9 |
| 35×25, R 100 | 32,0 | 31,6 |
| 35×22, R 100 | 36,4 | 35,9 |
| 33×23, R 100 | 37,8 | 37,3 |
| 32×22, R 100 | 41,3 | 40,7 |
| 30×22, R 100 | 45,5 | 44,8 |
| 30×20, R 100 | 50,0 | 49,2 |
| 30×18, R 100 | 55,6 | 54,6 |
| Recouvrement hors table | ligne voisine du tableau | interpolation par les formules Cupa ; R hors bornes du format = format non admissible, proposer le voisin |

### §5 Tuiles → §35 Fiches Edilians — remplacé par source fabricant

| Élément | Ancienne valeur (§5) | Nouvelle valeur (§35) |
|---|---|---|
| Grand moule (HP10, Alpha 10, Double Romane…) | pureau 34 à 37 cm, 10 à 11 tuiles/m², liteaux 2,8 à 3,0 ml/m² | par modèle : HP10 pureau 310-376 mm, 9,9-12/m², liteaux 3,22 / 2,66 ; Alpha 10 330-370 mm, 10-11,2/m² ; etc. (tableau 35.1) |
| Petit moule (Marseille, Losangée, Beauvoise) | pureau 24 à 26 cm, 13 à 15/m², liteaux 4,0 à 4,2 | Marseille Poudenx 317-370 mm, 12,3-14,3/m² ; Beauvoise 242-248 mm, 20,2-20,7/m², liteaux 4,08 |
| Canal | 22 à 28 tuiles/m² au total | nombre donné pour le couvert seul, × 2 pour couvert + courant, selon le modèle et R 140-170 (tableau 35.3) |
| Pentes minimales | 28.1 : 14-16° grand moule, 17-20° petit moule *(à vérifier)* | tableaux DTU 40.21/40.22 par famille A/B/C, zone, site et rampant (35.4) |
| Pureau par défaut | pureau mini en zone 3 et pente < 35 % | pureau maxi par défaut, pureau mini en zone 3, site exposé ou rampant long |

### §7 Zinc joint debout → §36 Données VMZINC — remplacé par source fabricant

| Élément | Ancienne valeur (§7) | Nouvelle valeur (§36) |
|---|---|---|
| Poids | kg ≈ m² développé × 4,7 (0,65 mm) | 5,5 kg/m² posé (0,65), 6 (0,70), 7 (0,80) |
| Pattes | 3 pattes/ml de joint, 3 à 4 fixes par bac | pattes coulissantes et fixes par m², selon le rampant et la bobine (tableau 36.2) |
| Fixation des pattes | 2 vis ou pointes par patte | selon l'épaisseur du support : vis 4×30 ou pointe annelée 2,8×25 / 2,5×28 ; 2 par patte (à vérifier sur le modèle) |
| Joint de dilatation / ressaut | 1 tous les 10 à 15 m | longueur maxi des feuilles selon pente et zone (tableau 36.3) ; au-delà, jonction transversale |
| Épaisseur 0,70 mm | au-delà de 900 m d'altitude ou bacs > 10 m | 0,70 minimum pour une pente > 173 % (bardage) |
| Largeur 500 mm | zone 3 exposé et zone 4 | idem, et pente > 173 % ; zones de vent NV65 (36.1) |
