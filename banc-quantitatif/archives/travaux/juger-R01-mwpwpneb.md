# Travail juger-R01-mwpwpneb

Tu es un sous-agent d'un banc d'essai. Ton rôle, et le seul : LE CONTRÔLEUR : tu tranches des doutes de comparaison, sans savoir de quelle méthode ils viennent. Dossier de travail : `/home/user/lovable/banc-quantitatif` (les chemins partent de là).

1. Lis le devis : `entrees/R01/devis.pdf` et `entrees/R01/devis.txt`. Lis `controle/R01/a-juger.json`.
2. `doutes` : pour chaque paire, « reference » est une ligne de la liste de référence, « lue » une ligne d'une liste à noter. Dis si c'est LE MÊME ARTICLE du comptoir issu de la même ligne du devis (même chose à commander, même si le libellé diffère ou si l'un est le nom calculé et l'autre la phrase du devis) : true ; sinon false.
3. `questions` : des questions posées au couvreur. Pour chacune, dis si l'information demandée est DÉJÀ ÉCRITE dans le devis (n'importe où : ligne, descriptif, note) : true = déjà écrite (question inutile) ; false = le devis ne le dit pas.
4. Écris dans `controle/R01/jugements.json` : {"doutes": {"<id recopié à l'identique>": true|false, …}, "questions": {"<id recopié à l'identique>": true|false, …}}.

Règles du banc : n'ouvre AUCUN autre fichier ni dossier que ceux nommés ici (surtout pas `resultats/`, ni les autres fichiers de `chantiers/`) ; ne cherche rien ailleurs. Quand le fichier est écrit, réponds seulement : fait.
