# Suivi des demandes de Greg (depuis le 25 octobre 2026)

Une ligne par demande, dans l'ordre où elles sont arrivées. États : **à faire**, **en cours**, **en ligne** (sur test.mobiiz.fr), **reportée** (avec pourquoi et pour quand). Mis à jour à chaque rapport ; les lignes changées y sont recopiées.

Rien ne va dans main, aucune dépense, pas de Stripe live : ces trois règles valent pour toutes les lignes.

## Rattrapage en cours (27 octobre) : passe avant les lots B et suivants et avant les peintres

| N° | Date | Demande | État | Détail |
| --- | --- | --- | --- | --- |
| R1 | 23, 25 et 26/10 | Plus aucun reste de l'ancien mode côté artisan (bandeau « Commande du 1er nov… Clôture dans », bloc commande du mois, onglet /groupe…), test qui échoue s'il réapparaît | en ligne | 26/10, commit e82854f. Test e2e « Mode humain : plus rien de l'ancien mode » sur 6 écrans, vu échouer sur l'ancien code. Captures iPhone SE et ordinateur au rapport de rattrapage. |
| R2 | 26/10 | Onglet Regroupements : « Déclarer un besoin » toujours en haut, « Bientôt chez toi » supprimé, deux exemples cliquables par métier, « Invite tes négoces » | en ligne | 26/10, commit e82854f. Couvreur, charpentier, plaquiste ; les autres métiers ont les exemples du couvreur. |
| R3 | 26/10 | Exemples du peintre (« 20 pots de blanc mat 15 L pour le 15 novembre », « 10 pots de sous-couche 15 L pour fin novembre ») | en ligne | 27/10 : peinture et sous-couche regroupables (teinte et contenance exigées, un blanc ne rejoint jamais un gris ; marque et finition comptent quand elles sont écrites), exemples du peintre, unité « pots ». En ligne le 27/10 (commit cd21830). |
| R4 | 26/10 | Carte « Regroupements » de l'accueil, quand elle est vide : « Tu sais déjà ce que tu vas commander ? Dis-le, on regroupe et on négocie. » | en ligne | 27/10 : faite (accueil vide et accueil avec chantiers), test e2e. En ligne le 27/10 (commit cd21830). |
| R5 | 25 et 26/10 | Les 8 derniers caractères de la clé Anthropic de test.mobiiz.fr | en ligne | Remplacé, avec ton accord du 27/10, par l'identifiant d'organisation Anthropic de la clé dans l'espace admin (carte « Compte Anthropic de la clé ») : lu par le serveur sur un appel gratuit, la clé n'est jamais affichée. En ligne le 27/10 (commits cd21830 et suivant). |
| R6 | 25/10 | Élision « pièces d'ardoise », règle générale sur les voyelles | en ligne | 25/10, commit 1721bbb : `de()` du domaine (« d' » devant toute voyelle, jamais devant h), utilisée par les notifications et les alertes du chasseur, test `elision-de.test.ts`. Revérifiée le 27/10 : plus aucun « de » collé en dur devant un article dans le code. Capture d'une notification au rapport de rattrapage. |
| R7 | 26/10 | Adresse Mobiiz par artisan (`bati-invest@mobiiz.fr`) et réception des devis négoces dans Mobiiz, notifications à chaque réponse | en ligne | 27/10, feu vert sur les dix points + l'écran dédié. Adresse créée avec l'entreprise, changeable une fois (l'ancienne reste), demande envoyée « via Mobiiz » avec Répondre étiqueté, réponse du négoce rattachée à la demande (PDF = devis reçu) ou dans « Mes reçus », push + e-mail. Écrans : inscription, Compte (copier, « Donne-la à tes négoces »), rappel au premier envoi, chantier, « Mes reçus ». Tests API (6), domaine (6), e2e (2 × 2 appareils). Recette en ligne avec un vrai e-mail de négoce : au rapport final. |
| R8 | 26/10 | Rapport en dix lignes sur l'adresse Mobiiz (ce qui existe, ce que Resend permet, coût du plan, proposition) avant de coder | en ligne | Envoyé le 27/10 (dix points, validés). Plafonds Resend vérifiés avant de coder : gratuit 3 000/mois et 100/jour, reçus compris ; Pro 20 $/mois nécessaire vers 100 artisans inscrits ou dès qu'un jour dépasse 100 e-mails. |
| R9 | 26/10 | Plan peintres en dix lignes | en ligne | Reçu et validé par toi le 26/10 (10 points, feu vert). Ma ligne « à faire » était fausse. |
| R10 | 26/10 | Les deux codes secrets de la sauvegarde nocturne : noms et comment les poser | en ligne | Tu me les as donnés le 26/10 et ils sont posés dans GitHub. La sauvegarde nocturne part à la mise en ligne de mobiiz.fr (ton choix du 26/10). Ma ligne « à faire » était fausse. |
| R12 | 27/10 | Capture : « Tu n'as pas le droit de faire cette modification (motif : zone_inactive). Code support » en déclarant « Peinture blanche 15l » | en ligne | Deux causes. 1) Ton entreprise de test n'a pas d'adresse : le serveur prenait le département de l'entreprise (aucun) au lieu de la ville de livraison. Maintenant, la ville de livraison décide (zone ouverte et droits) ; sans ville et sans adresse d'entreprise : « Il me faut une ville de livraison avec son code postal ». 2) Le message : quand le serveur a une phrase en français, l'écran l'affiche, jamais un motif technique (vaut pour tous les écrans). Et la peinture se regroupe désormais (R3). La case « Ville de livraison » montrait « 22300 Lannion » en gris, qu'on pouvait prendre pour une valeur remplie : elle dit maintenant « Code postal et ville ». Tests API et e2e. Rejoué en ligne le 27/10 sur iPhone SE et ordinateur avec un compte de recette sans adresse : sans ville, la phrase claire ; avec « 22300 Lannion », « Besoin déclaré ». Captures dans `docs/groupe/captures/rattrapage-27-10/`. |
| R11 | 25/10 | Problème de quantitatif en photo (deux captures) | reportée | Cause trouvée le 25/10 : le compte Anthropic n'a plus de crédit, toutes les lectures IA échouent (photo, PDF, liste). Le message d'erreur est corrigé (commit 9fbad66). Reprend quand tu auras rechargé le compte (R5) ; je rejoue alors la lecture en photo sur test.mobiiz.fr. |

## Demandes du 25 octobre

| N° | Date | Demande | État | Détail |
| --- | --- | --- | --- | --- |
| 1 | 25/10 | Clé IA « Preview » cochée, relancer les 3 étapes | en ligne | Clé cochée en Preview. Les lectures échouent faute de crédit Anthropic (voir R11). |
| 2 | 25/10 | Vraie lecture du 7954 | reportée | Même cause : crédit Anthropic. Après ta recharge. |
| 3 | 25/10 | Admin de test en prévisualisation, cycle complet en ligne, à supprimer avant la prod (noté dans MISE-EN-PROD.md) | en ligne | Noté dans MISE-EN-PROD.md. |
| 4 | 25/10 | Vercel Pro dans la liste « go prod », clôture vers 11 h UTC en test | en ligne | MISE-EN-PROD.md. |
| 5 | 25/10 | Réponses à bonjour@ dans ta boîte, « Répondre » vers cette adresse | en ligne | Remplacé le 26/10 par contact@mobiiz.fr (demande 19 B) ; bonjour@ continue d'arriver chez toi. |
| 6 | 25/10 | Listes multimétiers, négoces généralistes ou spécialistes (7 points, tests, démo, recette en ligne) | en ligne | Code et tests faits. Ne vaut plus qu'en mode automatique depuis le business model final. |
| 7 | 25/10 | Recentrage : demande perso, Mes prix, regroupements, gratuit/payant, admin des hypothèses, interface, landing | en ligne | Repris et remplacé par le business model final (8). |
| 8 | 25/10 | Business model final, points 1 à 12 (chasseur, besoins, veille, observatoire, vérification des négoces, gratuit/payant…) | en ligne | Mode humain par défaut, mode automatique gardé derrière l'interrupteur. |
| 9 | 25/10 | Point 13 : mise en ligne sur mobiiz.fr | reportée | Tu as dit « Vas-y, mets en ligne », puis tu as interrompu ; le 26/10 tu as posé l'adresse Mobiiz (R7), les mentions légales et la sécurité comme bloquants avant la mise en ligne. mobiiz.fr répond 404 aujourd'hui. Quand : après R7, sur ton accord. |
| 10 | 25/10 | Point 4 bis, alertes du chasseur | en ligne | Formation, digest de 18 h, rappels J-5 et J-2, date butoir, négoces à appeler. |
| 11 | 25/10 | Purger les faux négoces des recettes, garder ceux de la démo | en ligne | Bouton « Purger les recettes » (prévisualisation). La recette du chasseur du 26/10 ne l'a pas trouvé (20/22) : à revérifier au rapport de rattrapage. |
| 12 | 25/10 | Message d'erreur à l'envoi vers un négoce après validation de l'e-mail | en ligne | Commit 7a1b0d2 : sans adresse d'entreprise, la case s'ouvre dans le bloc. |
| 13 | 25/10 | Les 20 $ partis : compter les lectures réelles, dire quels tests appellent l'API | en ligne | Rapport fait le 25/10. |
| 14 | 25/10 | Aucun test automatique n'appelle l'API réelle | en ligne | Workflow « Vraie lecture » à la main seulement ; les clés sont retirées des parcours e2e. |
| 15 | 25/10 | Compteur admin des lectures et du coût du jour et du mois, alerte au-delà de `BUDGET_IA_JOUR` (5 $) | en ligne | Seuil réglable dans l'espace admin (`seuilIaJourEur`, 5 par défaut), e-mail d'alerte. Écart : le seuil est en euros, pas en dollars. |
| 16 | 25/10 | Accès à l'espace admin : adresse, compte, code | en ligne | Répondu le 25/10. |
| 17 | 25/10 | Espace admin compréhensible pour un enfant de 15 ans | en ligne | 4 chiffres en mots simples, 4 onglets. |
| 18 | 25/10 | « Tout est fonctionnel à 100 % ? » | en cours | Non : la lecture IA est arrêtée faute de crédit (R11), l'adresse Mobiiz manque (R7). Le rapport de rattrapage dira ce qui marche, écran par écran. |

## Demandes du 26 octobre

| N° | Date | Demande | État | Détail |
| --- | --- | --- | --- | --- |
| 19 | 26/10 | Adresse Mobiiz par artisan et réception des devis négoces | en ligne | 27/10, voir R7. |
| 20 | 26/10 | A. Mentions légales sans champ vide | en ligne | Bloc légal unique (pages légales, e-mails, factures). |
| 21 | 26/10 | B. contact@mobiiz.fr partout, renvoyé chez toi | en ligne | Réception chez Resend (MX), renvoi vers ton adresse admin. |
| 22 | 26/10 | C. Sécurité de l'admin (2FA, blocages, journal, e-mail à chaque connexion) | en ligne | |
| 23 | 26/10 | C. Suite sécurité : mots de passe fuités, Turnstile, sauvegardes, CSP | en cours | Turnstile branché, actif quand tu me donnes les deux clés Cloudflare. Sauvegarde nocturne gratuite : part à la mise en ligne de mobiiz.fr (ton choix du 26/10), ses deux secrets sont à poser par toi (R10). |
| 24 | 26/10 | D. Juridique et RGPD revus (CGU, conditions négoces, confidentialité, registre), passages avocat marqués | en ligne | Les CGU citent l'adresse Mobiiz : elle existe depuis le 27/10 (R7). |
| 25 | 26/10 | MX chez Resend sans sous-domaine, confirmation qu'un vrai e-mail arrive | en ligne | |
| 26 | 26/10 | Adresse de Neon dans les mentions | en ligne | Neon, LLC (groupe Databricks). |
| 27 | 26/10 | Peintres, deuxième métier (lecture, référentiel, catalogue en vignettes 2 bis, exemples 2 ter, regroupements, négoces peinture, /peintres, démo) | reportée | Plan validé le 26/10. Code après le rattrapage et les lots de la revue (ton ordre). Déjà faits : /peintres (landing), exemples 2 ter (R2, R3), regroupement de la peinture (R3, point 3 du plan). Il me faut tes trois devis de peintres réels et du crédit Anthropic pour le point 1. |
| 28 | 26/10 | Revue complète, lot A (IA remplaçable, hors connexion, file de reprise, webhooks sans doublon) | en ligne | Commit 1115590. Recette en ligne partielle (crédit IA). |
| 29 | 26/10 | Revue, lot B (chiffrement, liens signés, compression des images, 10 Mo, espace Neon et alerte à 70 %, stockage externe en dette) | en cours | Commencé : copie complète de la base de test, procédure de retour arrière dans SECURITE.md, module de chiffrement testé (rien d'activé). Reprend après le rattrapage. La clé `CHIFFREMENT_CLE` est à poser par toi dans Vercel (projet baticlair-api, Preview). |
| 30 | 26/10 | Revue, lot C (règles en dur vers l'admin, vocabulaire BatiClair nulle part, updatedAt, journal RGPD) | à faire | Après le lot B. |
| 31 | 26/10 | Revue, lot D (responsive 5 tailles, messages d'erreur, journal d'erreurs, 44 px, clavier numérique, un bouton principal) | à faire | Après le lot C. |
| 32 | 26/10 | Revue, lot E (nettoyage, ARCHITECTURE, SECURITE, CONFORMITE, RGPD, DETTE) | à faire | Après le lot D. |
| 33 | 26/10 | Après chaque lot : recette complète artisan + négoce + chasseur sur test.mobiiz.fr, rapport avec captures | en cours | Faite pour le lot A (partielle, crédit IA). À rejouer au rapport de rattrapage. |
| 34 | 26/10 | Landing « niveau studio » (accueil, /couvreurs, page négoce, mentions), Lighthouse mobile ≥ 95, partage WhatsApp/SMS | en ligne | |
| 35 | 26/10 | Lien de parrainage vide et image de partage vers vercel.app | en ligne | |
| 36 | 26/10 | Écart pot seul / palette en peinture, mention « Exemple » | en ligne | |
| 37 | 26/10 | Vrai devis animé dont sortent les lignes du quantitatif | en ligne | |
| 38 | 26/10 | /couvreurs sans bloc peinture, /peintres avec le bloc en pleine place | en ligne | 26/10, commit e82854f. |
| 39 | 26/10 | Phrase du concept et trois lignes sous le titre, visibles sur iPhone SE, test de l'œil neuf, captures aux cinq tailles | en ligne | 26/10, commit e82854f. Compris en 5 secondes au 2e passage. Restent trois questions pour toi : le titre ne dit pas qu'on achète à plusieurs ; « prix des gros » (grossiste ou grosses entreprises ?) ; les concurrents voient-ils ce que je commande ? |
| 40 | 26/10 | Photo de toi ou d'un de tes chantiers sur la landing | reportée | Tu l'envoies dans la semaine ; la page part sans. |
| 41 | 27/10 | Ce fichier, SUIVI.md, montré avant de reprendre ; lignes changées à chaque rapport ; report annoncé le jour même | en cours | Créé le 27/10. |
