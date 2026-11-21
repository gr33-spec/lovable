# Faux devis pour la recette

Bibliothèque de devis INVENTÉS, par métier, pour l'agent `testeur-artisan` (`.claude/agents/`). Aucun client réel, aucune adresse réelle, prix fictifs.

Trois états par métier :
- `propre` : un devis net, bien écrit ;
- `mal-scanne` : le même genre de devis tel qu'un scan de travers le rend (lettres confondues, colonnes décalées, lignes coupées) ;
- `fautes` : écrit vite, plein de fautes et d'abréviations de chantier.

Usage : coller le texte dans l'assistant, ou en faire un PDF ou une photo avant de l'importer. En local la lecture est simulée ; sur l'environnement de test, une lecture réelle consomme du crédit : respecter `BUDGET_IA_JOUR`.

Ajouter un métier : trois fichiers `<metier>-propre.txt`, `<metier>-mal-scanne.txt`, `<metier>-fautes.txt`.
