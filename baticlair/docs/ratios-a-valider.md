# Ratios et hypothèses à retrouver dans une source publique

Le référentiel couverture (`roofing-2026.10.03-9`) utilise les chiffres du document
« Référentiel quantitatif couverture-étanchéité » rédigé et validé par le fondateur
(couvreur) le 2026-10-03. Ils sont enregistrés comme **pratique métier validée**
(source `fondateur-referentiel-2026-10-03`). Le document les présente comme des
« valeurs courantes des DTU et fiches fabricants » : ce fichier liste ce qu'il reste à
retrouver dans un document public (fiche fabricant, mémento, guide) pour passer de
« pratique validée » à « donnée sourcée ». Aucun contenu DTU protégé n'est recopié.

| Donnée | Valeur utilisée | Où elle sert | Source à retrouver |
|---|---|---|---|
| Tableau de recouvrement de l'ardoise (pente × zone) | 110…70 mm (zone 1), 120…80 (zone 2), 130…90 (zone 3) | pureau, donc nombre d'ardoises, crochets, liteaux | mémento Rathscheck ou guide Cupa (pose au crochet) |
| Première ligne du tableau dès 45 % de pente | ligne « 25° (47 %) » appliquée dès 45 % | hypothèse de pente par défaut | pente minimale de l'ardoise selon le fabricant |
| Supplément de recouvrement, rampant > 5,5 m | +10 mm | ardoises | même source |
| Pertes | ardoise 5 %, crochets 2 %, tuile mécanique 3 %, liteaux 5 %, bande zinc 5 % | toutes les quantités | pratique du fondateur ; à confirmer sur chantier |
| Pureau de la tuile à emboîtement sans pureau écrit | mini du fabricant en zone 3 ou pente < 35 %, sinon maxi | tuiles, liteaux, tuiles de rive | documentation du modèle (pureau selon la pente) |
| Faîtière courante | 2,9 pièces/ml (ml ÷ 0,35) | faîtières sans modèle | fiche du modèle choisi par le fournisseur |
| Abouts de faîtage | 2 par faîtage | abouts | définition (une ligne de faîtage) |
| Crochets de gouttière | tous les 50 cm, 40 cm en bord de mer | crochets | notice du système de gouttière |
| Colliers de descente | tous les 1,8 m + 1 | colliers | notice du système de descente |
| Coudes par descente | 2 (un dévoiement) | coudes | hypothèse chantier, modifiable |
| Pattes de fixation d'une bande zinc | 3 par mètre | faîtage zinc | guide VMZINC |
| Écran HPV courant | rouleau 1,5 × 50 m = 75 m² | écran sans marque | fiche du produit choisi |
| Gouttière, bande zinc | longueurs de 4 m, de 3 m | conditionnement | catalogue du négoce |
| Liteaux | botte de 50 ml (ordre de grandeur) | conditionnement | catalogue du négoce |
| Zone climatique par département | voir `packages/domain/src/referential/zone.ts` | recouvrement, crochets | carte des zones (approximation départementale, cas le plus exposé) |
| Pente par défaut | 45 % | tout ce qui dépend de la pente | choix du fondateur (« on met 45 % en moyenne ») |
| Entraxe par défaut | 60 cm | contre-liteaux | pratique du fondateur (rénovation courante) |

Écarts relevés dans le document du fondateur (non reproduits dans le code) :

- l'exemple « 200 m², 32×22, 45°, zone 2 → 8 160 ardoises » ne correspond pas au tableau
  (zone 2 à 45° : R = 85 mm → environ 7 740 ardoises) ;
- l'exemple de la section 3 applique 8 % de perte alors que la règle donne 5 % (toit simple) ou 9 % ;
- « crochets = ardoises × 1,02 » est appliqué à la quantité théorique ; l'exemple l'appliquait à la
  quantité avec perte (9 300 au lieu de 8 630).
