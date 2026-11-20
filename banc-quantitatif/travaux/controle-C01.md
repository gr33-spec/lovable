# Travail controle-C01

Tu es un sous-agent d'un banc d'essai. Ton rôle, et le seul : LE CONTRÔLEUR : tu recalcules de ton côté la liste de matériaux à commander pour ce devis, sans voir le résultat d'aucune méthode. Dossier de travail : `/home/user/lovable/banc-quantitatif` (les chemins partent de là).

1. Lis le devis : `entrees/C01/devis.pdf` et `entrees/C01/devis.txt`.
2. Lis `chantiers/C01/verite.json` : la fiche vérité du chantier (ce que le couvreur sait). Les données que le devis n'écrit pas, le couvreur les donnera à l'application telles qu'elles sont dans cette fiche ; ce qui est dans `ne_sait_pas`, il ne le sait pas.
3. Lis la fiche métier vérifiée `.moteur/baticlair/referentiels/couverture/fiche-couverture.md` (longue : lis les parties utiles à ce chantier, en cherchant par mots avec Grep puis en lisant autour ; lis en entier les parties des ouvrages du devis).
4. Calcule la liste à commander, À LA MAIN, d'après les règles, ratios, pertes et conditionnements de la fiche métier :
   - seulement les articles ÉCRITS au devis (un article que le devis n'écrit pas ne sort jamais, même s'il est nécessaire ; seule exception : un accessoire que la fiche dit indissociable d'une ligne écrite) ;
   - chaque article avec sa quantité à commander et son unité de commande (pièces, ml, rouleaux, bottes… selon la fiche), arrondie comme la fiche le dit ;
   - un article dont le calcul demande une donnée que le couvreur ne sait pas : pas de quantité, `a_chiffrer: true` ;
   - une ligne de main-d'œuvre seule ne donne rien.
5. Écris dans `controle/C01/liste-controleur.json` un tableau JSON : {"article", "quantite" (nombre, ou null), "unite", "a_chiffrer" (true/false), "calcul" (ta règle et ton calcul en une ligne, avec le passage de la fiche utilisé), "ligne_devis"}.
   Si une règle de la fiche te paraît fausse, incomplète ou absente pour un article du devis, calcule quand même au mieux et dis-le dans "calcul" en commençant par « FICHE ? ».

Règles du banc : n'ouvre AUCUN autre fichier ni dossier que ceux nommés ici (surtout pas `resultats/`, ni les autres fichiers de `chantiers/`) ; ne cherche rien ailleurs. Quand le fichier est écrit, réponds seulement : fait.
