# État du banc d'essai (pour reprendre au prochain « continue »)

Branche : `claude/quantitatif-benchmark-methodes-pymtqy`. Dossier : `banc-quantitatif/`. Rien n'est modifié dans l'appli.
Moteur de calcul : copie de la branche de test (`outils/prepare.sh`, commit 9d79748e, fiche roofing-2026.11.20-62). Aucune clé Anthropic utilisée.

## Étapes
- [x] 0. Méthode 0 comprise, moteur branché, prompt réel extrait.
- [x] 1. 15 chantiers fabriqués + 5 devis réels.
- [x] 2. Contrôleur et arbitre sur les 15 chantiers fabriqués (`controle/`, `DEFAUTS.md`).
- [x] 3. Tour 1 : méthodes 0 à 10 sur C01–C10.
- [x] 4. Tour 2 : méthodes 4, 6, 11 (5 lectures) et 0 (3 lectures). La méthode 10 n'a pas été rejouée (quota).
- [x] 5. Examen final sur C11–C15 et devis réels R01–R05 (méthodes 0, 4, 6, 10, 11, 12).
- [x] 6. Compte rendu : `COMPTE-RENDU.md`. Tableaux : `resultats/tableaux.md`.

Rien n'est adopté dans l'appli. Reste à décider avec Greg (voir la fin du compte rendu).

Pour tout renoter sans aucun appel : `node outils/suite.mjs noter $(cat tout.txt)`, puis `node outils/resume.mjs`.
