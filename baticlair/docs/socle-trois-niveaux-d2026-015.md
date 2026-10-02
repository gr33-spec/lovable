# D-2026-015 en trois niveaux : lu dans le devis → il faut → à commander

Fichier GÉNÉRÉ par `packages/domain/test/socle-trois-niveaux.test.ts` : ne pas modifier à la main.
Valeurs réellement produites par BatiClair. Les règles de couverture sont EN BROUILLON :
aucune n'a été validée pour ce rapport.

### 1. Aujourd'hui, sans réponse de l'artisan (ce que voit l'application)

| Ligne du devis | Lu dans le devis | Il faut | À commander | État |
|---|---|---|---|---|
| ligne 1 — Écran de sous-toiture respirant | 120 m² (mesure de l'ouvrage) | Écran sous-toiture : à calculer | Écran sous-toiture : à préciser | ? |
| ligne 2 — Contre-lattage en liteaux 27x40 | 120 m² (mesure de l'ouvrage) | Liteaux 27×40 : à calculer | Liteaux 27×40 : à préciser | ? |
| ligne 3 — Lattage en liteaux 27x40 pour tuiles HP10 | 120 m² (mesure de l'ouvrage) | Liteaux 27×40 : à calculer | Liteaux 27×40 : à préciser | ? |
| ligne 4 — Couverture en tuiles terre cuite HP10 rouge | 120 m² (mesure de l'ouvrage) | Tuiles HP10 : à calculer | Tuiles HP10 : à préciser | ? |
| ligne 5 — Rives de toit | 24 m (mesure de l'ouvrage) | à calculer — Tuile de rive : pas encore de règle de calcul dans BatiClair. | — | ? |
| ligne 6 — Faîtage | 10 m (mesure de l'ouvrage) | Faîtières : à calculer ; Closoir : à calculer ; Fixations de faîtières : à calculer | Faîtières : à préciser ; Closoir : à préciser ; Fixations de faîtières : à préciser | ? |
| ligne 7 — Gouttière PVC de 25 sable | 20 m (mesure de l'ouvrage) | Gouttière : à calculer ; Crochets : à calculer ; Naissances : à calculer | Gouttière : à préciser ; Crochets : à préciser ; Naissances : à préciser | ? |
| ligne 8 — Descente d'eau pluviale PVC Ø80 avec coudes | 2 unités (mesure de l'ouvrage) | Tubes de descente : à calculer ; Coudes : à calculer ; Colliers : à calculer | Tubes de descente : à préciser ; Coudes : à préciser ; Colliers : à préciser | ? |
| ligne 9 — Chatières de ventilation | 10 unités (à commander tel quel) | 10 unités (tel quel) | 10 unités | ✓ |
| ligne 10 — Sortie de toit Poujoulat | 1 unité (à commander tel quel) | 1 unité (tel quel) | 1 unité | ✓ |

### 2. Après les réponses de l'artisan (modèle de tuile, pureau 34,3 cm, écran)

| Ligne du devis | Lu dans le devis | Il faut | À commander | État |
|---|---|---|---|---|
| ligne 1 — Écran de sous-toiture respirant | 120 m² (mesure de l'ouvrage) | Écran HPV : à calculer | Écran HPV : à préciser | ? |
| ligne 2 — Contre-lattage en liteaux 27x40 | 120 m² (mesure de l'ouvrage) | Liteaux 27×40 : à calculer | Liteaux 27×40 : à préciser | ? |
| ligne 3 — Lattage en liteaux 27x40 pour tuiles HP10 | 120 m² (mesure de l'ouvrage) | Liteaux 27×40 : à calculer | Liteaux 27×40 : à préciser | ? |
| ligne 4 — Couverture en tuiles terre cuite HP10 rouge | 120 m² (mesure de l'ouvrage) | Tuiles HP10 : à calculer | Tuiles HP10 : à préciser | ? |
| ligne 5 — Rives de toit | 24 m (mesure de l'ouvrage) | à calculer — Tuile de rive : pas encore de règle de calcul dans BatiClair. | — | ? |
| ligne 6 — Faîtage | 10 m (mesure de l'ouvrage) | Faîtières : à calculer ; Closoir : à calculer ; Fixations de faîtières : à calculer | Faîtières : à préciser ; Closoir : à préciser ; Fixations de faîtières : à préciser | ? |
| ligne 7 — Gouttière PVC de 25 sable | 20 m (mesure de l'ouvrage) | Gouttière : à calculer ; Crochets : à calculer ; Naissances : à calculer | Gouttière : à préciser ; Crochets : à préciser ; Naissances : à préciser | ? |
| ligne 8 — Descente d'eau pluviale PVC Ø80 avec coudes | 2 unités (mesure de l'ouvrage) | Tubes de descente : à calculer ; Coudes : à calculer ; Colliers : à calculer | Tubes de descente : à préciser ; Coudes : à préciser ; Colliers : à préciser | ? |
| ligne 9 — Chatières de ventilation | 10 unités (à commander tel quel) | 10 unités (tel quel) | 10 unités | ✓ |
| ligne 10 — Sortie de toit Poujoulat | 1 unité (à commander tel quel) | 1 unité (tel quel) | 1 unité | ✓ |

### 3. Calcul PROVISOIRE avec les règles en brouillon (écran du validateur, jamais montré à l'artisan)

| Ligne du devis | Lu dans le devis | Il faut | À commander | État |
|---|---|---|---|---|
| ligne 1 — Écran de sous-toiture respirant | 120 m² (mesure de l'ouvrage) | Écran HPV : 128,57 à 138,46 m² | Écran HPV : 2 rouleaux | ? |
| ligne 2 — Contre-lattage en liteaux 27x40 | 120 m² (mesure de l'ouvrage) | Liteaux 27×40 : 133,33 ml | Liteaux 27×40 : à préciser | ? |
| ligne 3 — Lattage en liteaux 27x40 pour tuiles HP10 | 120 m² (mesure de l'ouvrage) | Liteaux 27×40 : 349,85 ml | Liteaux 27×40 : à préciser | ? |
| ligne 4 — Couverture en tuiles terre cuite HP10 rouge | 120 m² (mesure de l'ouvrage) | Tuiles HP10 : 1305,43 pièce(s) | Tuiles HP10 : 1306 pièces | ? |
| ligne 5 — Rives de toit | 24 m (mesure de l'ouvrage) | à calculer — Tuile de rive : pas encore de règle de calcul dans BatiClair. | — | ? |
| ligne 6 — Faîtage | 10 m (mesure de l'ouvrage) | Faîtières : à calculer ; Closoir : 10 ml ; Fixations de faîtières : à calculer | Faîtières : à préciser ; Closoir : à préciser ; Fixations de faîtières : à préciser | ? |
| ligne 7 — Gouttière PVC de 25 sable | 20 m (mesure de l'ouvrage) | Gouttière : 20 ml ; Crochets : à calculer ; Naissances : 2 pièce(s) | Gouttière : à préciser ; Crochets : à préciser ; Naissances : à préciser | ? |
| ligne 8 — Descente d'eau pluviale PVC Ø80 avec coudes | 2 unités (mesure de l'ouvrage) | Tubes de descente : 8 ml ; Coudes : à calculer ; Colliers : à calculer | Tubes de descente : à préciser ; Coudes : à préciser ; Colliers : à préciser | ? |
| ligne 9 — Chatières de ventilation | 10 unités (à commander tel quel) | 10 unités (tel quel) | 10 unités | ✓ |
| ligne 10 — Sortie de toit Poujoulat | 1 unité (à commander tel quel) | 1 unité (tel quel) | 1 unité | ✓ |
