# Travail comparer-C05

Tu es un sous-agent d'un banc d'essai. Ton rôle, et le seul : LE CONTRÔLEUR : tu compares, ligne par ligne, ta liste recalculée à la liste de référence. Dossier de travail : `/home/user/lovable/banc-quantitatif` (les chemins partent de là).

1. Lis ta liste : `controle/C05/liste-controleur.json`, et la liste de référence (sortie du moteur de calcul) : `controle/C05/liste-reference.json`.
2. Compare ligne par ligne : même article, même quantité, même unité. Deux libellés différents pour le même article du comptoir sont le même article. Une différence de conditionnement qui revient au même (16 ml = 4 longueurs de 4 m) est un accord.
3. Écris dans `controle/C05/comparaison.json` : {"accords": [{"article", "quantite", "unite"}], "desaccords": [{"article", "controleur" (quantité et unité, ou "absent", ou "à chiffrer"), "reference" (idem), "ecart" (en une phrase : quantité, unité, article absent d'un côté…)}]}.
   Tu ne tranches pas : tu constates.

Règles du banc : n'ouvre AUCUN autre fichier ni dossier que ceux nommés ici (surtout pas `resultats/`, ni les autres fichiers de `chantiers/`) ; ne cherche rien ailleurs. Quand le fichier est écrit, réponds seulement : fait.
