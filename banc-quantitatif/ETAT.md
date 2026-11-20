# État du banc d'essai (pour reprendre au prochain « continue »)

Branche : `claude/quantitatif-benchmark-methodes-pymtqy`. Dossier : `banc-quantitatif/`. Rien n'est modifié dans l'appli.
Moteur de calcul : copie de la branche de test (`outils/prepare.sh`, commit 9d79748e, fiche roofing-2026.11.20-62). Aucune clé Anthropic utilisée.

## Étapes
- [x] 0. Méthode 0 comprise, moteur branché (`outils/moteur.mjs`), prompt réel extrait (`fiche/systeme-m0.txt`).
- [x] 1. Chantiers : 15 fabriqués (C01–C10 entraînement, C11–C15 examen) + 5 devis réels (R01–R05). Rendus : `node outils/rendre.mjs`.
- [ ] 2. Contrôleur + contrôleur du contrôleur : listes de référence validées.
- [x] 3. Tour 1 : fait et noté (`resultats/notes.json`). Trio de tête : M4, M6, M10.
- [ ] 4. Tour 2 : EN COURS. Essais 2 à 5 de M4, M6, M10 et essais 2 et 3 de M0 sur C01–C10 (+ M8 sur les photos). Reprise : `node outils/banc.mjs travaux M4,M6,M10:C01,…,C10:2,3,4,5 M0:C01,…:2,3` liste ce qui manque ; puis assembler, questions, noter, `suite.mjs stabilite`.
- [ ] 5. Examen final : gagnante (et méthode 11 éventuelle) + méthode 0 sur C11–C15.
- [ ] 6. Compte rendu (`COMPTE-RENDU.md`).
