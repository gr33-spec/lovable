# Banc d'essai — vrais devis : tableau de score

Fichier GÉNÉRÉ par `packages/domain/test/banc-devis-reels.test.ts` : ne pas modifier à la main.
Référentiel : roofing-2026.10.04-20.

Une ligne « commande connue » a toutes ses quantités à commander ; « besoin connu » a ses quantités
(ml, m², pièces) mais pas encore l'unité de vente vérifiée. Les questions comptent celles qui sont
posées, celles où aucune proposition ne convient et celles restées sans réponse connue.

### Aujourd'hui, pour un artisan (données vérifiées seulement)

| Devis | Lignes matériaux | Commande connue | Besoin connu (conditionnement à confirmer) | Attend une réponse | Ne sait pas encore | Ouvrage pas encore couvert | Questions |
|---|---|---|---|---|---|---|---|
| D-2026-015 | 10 | 8 | 0 | 0 | 0 | 2 | 1 |

### Si les règles en attente étaient validées (écran du validateur)

| Devis | Lignes matériaux | Commande connue | Besoin connu (conditionnement à confirmer) | Attend une réponse | Ne sait pas encore | Ouvrage pas encore couvert | Questions |
|---|---|---|---|---|---|---|---|
| D-2026-015 | 10 | 8 | 0 | 0 | 0 | 2 | 1 |

## Détail par devis

### D-2026-015

Origine : Devis client d'une entreprise de couverture, transmis par le fondateur le 2026-10-01.

| Ligne | Aujourd'hui | Si les règles en attente étaient validées |
|---|---|---|
| ligne 1 | commande connue | commande connue |
| ligne 2 | commande connue | commande connue |
| ligne 3 | commande connue | commande connue |
| ligne 4 | commande connue | commande connue |
| ligne 5 | commande connue | commande connue |
| ligne 6 | commande connue | commande connue |
| ligne 7 | commande connue | commande connue |
| ligne 8 | commande connue | commande connue |
| ligne 9 | ouvrage pas encore couvert | ouvrage pas encore couvert — Tuile chatière : pas encore de règle de calcul dans BatiClair. |
| ligne 10 | ouvrage pas encore couvert | ouvrage pas encore couvert — Sortie de toit : pas encore de règle de calcul dans BatiClair. |

Questions (règles validées) :

- posée : « J'ai identifié : Tuiles HP10. C'est bien ce modèle ? » — Le devis écrit « tuiles … type HP10 » : l'artisan confirme le modèle.

À documenter pour aller plus loin (règles validées) :

- Tuile chatière — ouvrage à couvrir (ligne 9) — Exemples réels de cet ouvrage + documentation des produits utilisés.
- Sortie de toit — ouvrage à couvrir (ligne 10) — Exemples réels de cet ouvrage + documentation des produits utilisés.

À documenter aujourd'hui (règles en attente) :

