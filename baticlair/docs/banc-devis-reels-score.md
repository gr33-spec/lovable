# Banc d'essai — vrais devis : tableau de score

Fichier GÉNÉRÉ par `packages/domain/test/banc-devis-reels.test.ts` : ne pas modifier à la main.
Référentiel : roofing-2026.10.01-6.

Une ligne « commande connue » a toutes ses quantités à commander ; « besoin connu » a ses quantités
(ml, m², pièces) mais pas encore l'unité de vente vérifiée. Les questions comptent celles qui sont
posées, celles où aucune proposition ne convient et celles restées sans réponse connue.

### Aujourd'hui, pour un artisan (données vérifiées seulement)

| Devis | Lignes matériaux | Commande connue | Besoin connu (conditionnement à confirmer) | Attend une réponse | Ne sait pas encore | Ouvrage pas encore couvert | Questions |
|---|---|---|---|---|---|---|---|
| D-2026-015 | 10 | 0 | 0 | 0 | 7 | 3 | 1 |

### Si les règles en attente étaient validées (écran du validateur)

| Devis | Lignes matériaux | Commande connue | Besoin connu (conditionnement à confirmer) | Attend une réponse | Ne sait pas encore | Ouvrage pas encore couvert | Questions |
|---|---|---|---|---|---|---|---|
| D-2026-015 | 10 | 0 | 1 | 4 | 2 | 3 | 5 |

## Détail par devis

### D-2026-015

Origine : Devis client d'une entreprise de couverture, transmis par le fondateur le 2026-10-01.

| Ligne | Aujourd'hui | Si les règles en attente étaient validées |
|---|---|---|
| ligne 1 | ne sait pas encore | attend une réponse |
| ligne 2 | ne sait pas encore | besoin connu, conditionnement à confirmer |
| ligne 3 | ne sait pas encore | attend une réponse |
| ligne 4 | ne sait pas encore | attend une réponse |
| ligne 5 | ouvrage pas encore couvert | ouvrage pas encore couvert — Tuile de rive : pas encore de règle de calcul dans BatiClair. |
| ligne 6 | ne sait pas encore | attend une réponse |
| ligne 7 | ne sait pas encore | ne sait pas encore — Calcul impossible sans les données du produit (Crochets). |
| ligne 8 | ne sait pas encore | ne sait pas encore — Calcul impossible sans les données du produit (Colliers). |
| ligne 9 | ouvrage pas encore couvert | ouvrage pas encore couvert — Tuile chatière : pas encore de règle de calcul dans BatiClair. |
| ligne 10 | ouvrage pas encore couvert | ouvrage pas encore couvert — Sortie de toit : pas encore de règle de calcul dans BatiClair. |

Questions (règles validées) :

- posée : « J'ai identifié : Tuiles HP10. C'est bien ce modèle ? » — Le devis écrit « tuiles … type HP10 » : l'artisan confirme le modèle.
- aucune proposition ne convient : « Quel produit pour : faîtières ? » — Le devis écrit « faîtières ventilées » : la faîtière 710 du référentiel n'est pas documentée comme ventilée.
- sans réponse connue : « À quel pureau posez-vous ces tuiles ? » (De 1 191 à 1 445 pièces selon la réponse.)
- sans réponse connue : « Quel produit pour : écran sous-toiture ? »
- sans réponse connue : « Combien de coudes par descente ? »

À documenter pour aller plus loin (règles validées) :

- Liteaux 27×40 — Conditionnement (unité de vente) (ligne 2) — Fiche article du fabricant ou du négoce (unité vendue, contenu).
- Closoir — produit à identifier (ligne 6) — Référence exacte du produit (devis, artisan), puis sa fiche technique.
- Gouttière — produit à identifier (ligne 7) — Référence exacte du produit (devis, artisan), puis sa fiche technique.
- Crochets — produit à identifier (ligne 7) — Référence exacte du produit (devis, artisan), puis sa fiche technique.
- Naissances — produit à identifier (ligne 7) — Référence exacte du produit (devis, artisan), puis sa fiche technique.
- Tubes de descente — produit à identifier (ligne 8) — Référence exacte du produit (devis, artisan), puis sa fiche technique.
- Colliers — produit à identifier (ligne 8) — Référence exacte du produit (devis, artisan), puis sa fiche technique.
- Faîtières — modèle du devis absent du référentiel (ligne 6) — Référence exacte du produit (devis, artisan), puis sa fiche technique.
- Tuile de rive — ouvrage à couvrir (ligne 5) — Exemples réels de cet ouvrage + documentation des produits utilisés.
- Tuile chatière — ouvrage à couvrir (ligne 9) — Exemples réels de cet ouvrage + documentation des produits utilisés.
- Sortie de toit — ouvrage à couvrir (ligne 10) — Exemples réels de cet ouvrage + documentation des produits utilisés.

À documenter aujourd'hui (règles en attente) :

- Tuiles — règle de calcul (ligne 3, ligne 4) — en attente : Règle BatiClair : rangs au pureau, files de contre-liteaux par chevron, tuiles par m² couvert, surface d'écran avec recouvrements
- Liteaux — règle de calcul (ligne 3) — en attente : Règle BatiClair : rangs au pureau, files de contre-liteaux par chevron, tuiles par m² couvert, surface d'écran avec recouvrements
- Contre-liteaux — règle de calcul (ligne 2) — en attente : Règle BatiClair : rangs au pureau, files de contre-liteaux par chevron, tuiles par m² couvert, surface d'écran avec recouvrements
- Écran sous-toiture — règle de calcul (ligne 1) — en attente : Règle BatiClair : rangs au pureau, files de contre-liteaux par chevron, tuiles par m² couvert, surface d'écran avec recouvrements
- Closoir — règle de calcul (ligne 6) — en attente : Règle de pratique BatiClair : faîtage, gouttière, descente
- Gouttière — règle de calcul (ligne 7) — en attente : Règle de pratique BatiClair : faîtage, gouttière, descente
- Crochets — règle de calcul (ligne 7) — en attente : Règle de pratique BatiClair : faîtage, gouttière, descente
- Naissances — règle de calcul (ligne 7) — en attente : Règle de pratique BatiClair : faîtage, gouttière, descente
- Tubes de descente — règle de calcul (ligne 8) — en attente : Règle de pratique BatiClair : faîtage, gouttière, descente
- Coudes — règle de calcul (ligne 8) — en attente : Règle de pratique BatiClair : faîtage, gouttière, descente
- Colliers — règle de calcul (ligne 8) — en attente : Règle de pratique BatiClair : faîtage, gouttière, descente
