# Lecture des gros devis — stratégie et coût

Fichier GÉNÉRÉ par `packages/domain/test/lecture-gros-devis.test.ts` : ne pas modifier à la main.

Chaque devis est lu par une IA simulée fidèle aux consignes (aucun appel payant). Modèle et
réglage inchangés : `claude-sonnet-5-5`, effort « high », 2 $ / 10 $ par million de tokens en
entrée / sortie, 1 $ = 0,92 €. Tokens comptés à 3 caractères par token (convention prudente de
l'application). Limite de réponse d'un appel : 16 000 tokens.

| Devis | Pages | Stratégie choisie | Appels | Entrée (tokens) | Réponse visible (tokens) | Plus grosse réponse d'un appel | Coût probable¹ | Coût estimé haut² |
|---|---|---|---|---|---|---|---|---|
| 20 lignes, PDF texte | 1 | 1 appel | 1 | 2 594 | 901 (haut : 3 014) | 901 | 0,03 € | 0,03 € |
| 100 lignes, PDF texte | 4 | 1 appel | 1 | 4 944 | 4 444 (haut : 6 939) | 4 444 | 0,07 € | 0,07 € |
| 300 lignes, PDF texte | 12 | 2 blocs (6 + 6 pages) | 2 | 18 522 | 13 424 (haut : 18 892) | 7 218 | 0,19 € | 0,21 € |
| 300 lignes, scan | 12 | 3 blocs (4 + 4 + 4 pages) | 3 | 64 240 | 12 843 (haut : 25 200) | 4 682 | 0,29 € | 0,35 € |
| 500 lignes, PDF texte | 19 | 3 blocs (6 + 6 + 7 pages) | 3 | 37 097 | 22 489 (haut : 30 933) | 7 915 | 0,33 € | 0,35 € |
| 500 lignes, scan | 19 | 4 blocs (5 + 5 + 5 + 4 pages) | 4 | 124 480 | 21 445 (haut : 38 400) | 5 874 | 0,50 € | 0,58 € |
| Morellec réel (165 lignes, 9 pages scannées) | 9 | 2 blocs (5 + 4 pages) | 2 | 37 600 | 7 378 (haut : 18 400) | 4 100 | 0,17 € | 0,24 € |

1. Entrée et réponse visible simulées, plus 2 000 tokens de réflexion du modèle par appel (non
   mesurable sans vrai appel : le coût réel de chaque appel est enregistré et visible dans « Mon compte »).
2. Estimation haute calculée avant tout appel par le plan de lecture : c'est elle qui décide du découpage
   et qui sert de garde-fou (3 € par document par défaut, `AI_ANALYSIS_MAX_EUR`).
