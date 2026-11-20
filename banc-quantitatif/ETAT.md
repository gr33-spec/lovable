# État du banc d'essai (pour reprendre au prochain « continue »)

Branche : `claude/quantitatif-benchmark-methodes-pymtqy`. Dossier : `banc-quantitatif/`. Rien n'est modifié dans l'appli.
Moteur de calcul : copie de la branche de test (`outils/prepare.sh`, commit 9d79748e, fiche roofing-2026.11.20-62). Aucune clé Anthropic utilisée.

## Étapes
- [x] 0. Méthode 0 comprise, moteur branché (`outils/moteur.mjs`), prompt réel extrait (`fiche/systeme-m0.txt`).
- [x] 1. Chantiers : 15 fabriqués (C01–C10 entraînement, C11–C15 examen) + 5 devis réels (R01–R05). Rendus : `node outils/rendre.mjs`.
- [ ] 2. Contrôleur + contrôleur du contrôleur : listes de référence validées.
- [ ] 3. Tour 1 : EN COURS. Vague 1 lancée sur C01–C04, C06, C07, C09, C10 (reste C05, C08). Reprise : `node outils/banc.mjs travaux M0,…:C01,…` liste ce qui manque ; puis `assembler`, `suite.mjs questions`, `roles.mjs couvreur`, `suite.mjs integrer`, `suite.mjs noter`.
- [ ] 4. Tour 2 : les trois meilleures, 5 lectures par chantier (+ devis réels).
- [ ] 5. Examen final : gagnante (et méthode 11 éventuelle) + méthode 0 sur C11–C15.
- [ ] 6. Compte rendu (`COMPTE-RENDU.md`).
