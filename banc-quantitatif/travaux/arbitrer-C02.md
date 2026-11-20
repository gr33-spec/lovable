# Travail arbitrer-C02

Tu es un sous-agent d'un banc d'essai. Ton rôle, et le seul : LE CONTRÔLEUR DU CONTRÔLEUR : deux calculs ne sont pas d'accord, tu retournes aux sources et tu tranches. Dossier de travail : `/home/user/lovable/banc-quantitatif` (les chemins partent de là).

1. Lis les désaccords : `controle/C02/comparaison.json` (champ `desaccords`), la liste du contrôleur avec ses calculs `controle/C02/liste-controleur.json`, et la liste de référence `controle/C02/liste-reference.json` (sortie du moteur de calcul de l'application, avec les questions posées au couvreur et ses réponses).
2. Retourne aux sources : le devis `entrees/C02/devis.pdf` et `entrees/C02/devis.txt`, la fiche vérité `chantiers/C02/verite.json`, la fiche métier `.moteur/baticlair/referentiels/couverture/fiche-couverture.md` (cherche par mots avec Grep, lis autour).
3. Pour chaque désaccord, refais le calcul toi-même et tranche. Écris dans `controle/C02/arbitrage.json` un tableau : {"article", "bonne_valeur" (quantité et unité justes selon toi, ou "à chiffrer", ou "ne doit pas sortir"), "qui_a_raison" ("controleur", "reference", "aucun"), "cause" (une de : "erreur du contrôleur", "fiche métier fausse ou incomplète", "moteur de calcul ne suit pas la fiche", "lecture de référence fausse", "réponse du couvreur mal comprise", "simple différence de présentation"), "explication" (deux phrases au plus, avec le passage de la fiche ou du devis)}.
   Si c'est la fiche métier qui est fausse, incomplète ou contradictoire, dis-le clairement : c'est un défaut de la fiche à signaler.

Règles du banc : n'ouvre AUCUN autre fichier ni dossier que ceux nommés ici (surtout pas `resultats/`, ni les autres fichiers de `chantiers/`) ; ne cherche rien ailleurs. Quand le fichier est écrit, réponds seulement : fait.
