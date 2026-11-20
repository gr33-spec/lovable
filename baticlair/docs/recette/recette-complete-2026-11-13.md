# Recette complète du 13 novembre 2026

Neuf testeurs (artisan, négoce, mission, saboteur, rush, comptable, relecteur, mauvais-payeur, terrain) sur un site LOCAL de recette, commit `4e19eff9` : e-mails capturés, paiement simulé, aucune lecture IA, achats groupés V1, missions et assistant allumés, paywall allumé (réglage des parcours de test ; il est en pause sur test.mobiiz.fr). Rien n'a été corrigé. Les rapports bruts et les captures sont restés dans le dossier de travail de la session (non versés au dépôt).

« Vu » = constaté à l'écran ou par un essai. « Lu » = déduit du code, non essayé.

## Bloquant

| N° | Constat | Preuve | Proposition |
|---|---|---|---|
| B1 | Les CGU affichent encore 49 € HT par mois et 348 € HT par an, « 3 listes en tout », « l'abonnement ouvre les achats groupés ». L'application demande d'accepter cette version (27/10/2026). Aussi visible sur test.mobiiz.fr. | Vu (comptable, relecteur) | Publier une version à jour après relecture (base : `docs/groupe/CGU-candidate-2026-11-11.md`, à compléter avec l'annuel) ; lire les prix depuis le code. Décision de Greg et avocat. |
| B2 | L'écran `/formules` vend encore « Solo 39 € » et « Pro 79 € » ; « Abonnement, factures et reçus » dit « Essai gratuit, 0 chantier sur 3 ». | Vu (relecteur, artisan, mauvais-payeur) | Renvoyer « Voir les formules » vers « Mon abonnement », retirer la page. |
| B3 | Paywall allumé : un abonné Pro qui a payé est refusé au 4e chantier (« Ton essai est terminé », anciens prix). L'ancienne limite de chantiers et les formules Essentiel/Pro ne se parlent pas. Sans effet tant que `PAYWALL=off`. | Vu (mauvais-payeur) | Retirer l'ancienne limite ou la brancher sur les formules, avant de rallumer le paywall. |
| B4 | On peut payer deux fois : le serveur accepte un nouveau paiement alors qu'un abonnement court, sans rien déduire. Avec Stripe, le retour `?paiement=ok` n'est pas lu : le bouton de paiement peut réapparaître. | Vu en simulé ; lu pour Stripe | Refuser un paiement quand un abonnement court ; écran « Paiement reçu, on active ton abonnement ». |
| B5 | L'e-mail de confirmation d'un abonnement à l'année annonce le prix au mois (« Pro, 39,90 € HT par mois ») ; la facture, elle, est juste (399 € HT). | Vu (comptable, mauvais-payeur) | L'e-mail doit lire la périodicité (`abonnement.service.ts`, vers la ligne 636) ; test sur le texte. |
| B6 | Une douzaine d'artisans qui envoient leur demande au même instant figent le serveur 2 minutes ; 11 voient une erreur alors que 11 e-mails sur 12 sont partis. | Mesuré en local (rush), 22 erreurs de transaction dans le journal. Non mesuré en ligne. | Sortir l'envoi du mail du verrou ou réutiliser la même connexion ; attente de quelques secondes, pas 120 ; dire « Ta demande est partie ». |
| B7 | Demande de prix classique : le tri par métier ne joue pas. Un négoce « Zinguerie seule » et un « Étanchéité seule » reçoivent les six lignes, ardoises comprises, sous l'objet « demande de prix couverture ». Le routage corrigé le 13 novembre ne concerne que les achats groupés. | Vu (testeur négoce) | Découper la liste ligne par ligne avant l'envoi et montrer « qui reçoit quoi ». Règle à confirmer par Greg. |
| B8 | Après l'envoi d'une offre, « Créer mon compte négoce » mène à « Page introuvable » (adresse écrite deux fois). Le lien de l'e-mail d'invitation marche. | Vu deux fois (testeur négoce) | Ne pas remettre le début de l'adresse devant celle que le serveur renvoie. |
| B9 | Une ligne ajoutée sans quantité ne peut plus recevoir de quantité dans la liste ; la demande part chez le négoce sans quantité. | Vu (artisan) | Quantité et unité dans le panneau de chaque ligne ; ligne orange tant que c'est vide. |
| B10 | Mission : un numéro ou un e-mail écrit dans une annonce, un profil ou une réponse s'affiche en clair avant l'accord des deux, à côté de « Coordonnées privées avant accord mutuel ». Mission est coupée sur le site de test. | Vu (testeur mission, saboteur) | Appliquer le masquage des messages à ces textes, ou refuser la saisie. |

## Gênant

**Paiement et tarifs**
- G1. La page Tarifs ne parle pas de l'année (199 € et 399 € HT, deux mois offerts) alors que « Mon abonnement » la propose. Vu.
- G2. Conditions négoces et CGU parlent d'une commission de 1 à 2 % ; l'e-mail au négoce dit « aucune commission (lancement) ». Le calcul est bien à 0. Vu pour les CGU, lu pour les conditions négoces. À trancher par Greg et l'avocat.
- G3. Impossible de reprendre un abonnement résilié, de descendre de Pro à Essentiel ou de passer du mois à l'année ; aucune phrase ne l'explique. Vu.
- G4. Résilier pendant un paiement refusé : pas de bouton à l'écran, et l'écran reste sur « Paiement refusé ». Vu.
- G5. E-mails en double (résiliation, échec de paiement). Vu en simulé ; lu pour Stripe.
- G6. Messages Stripe en retard ou dans le désordre non gérés ; carte refusée au passage à Pro : message technique. Lu, non essayé.
- G7. Arrondis : un centime d'écart possible sur une offre ou un bon de commande quand le prix unitaire a plus de deux décimales. Recalculé par script.
- G8. « Mes prix » limite le gratuit à trois mois d'historique, ce que la page Tarifs ne dit pas. Vu.
- G9. Premier paiement simulé refusé : « pour garder l'accès » et droits Essentiel pendant 7 jours sans avoir payé. Vu ; avec Stripe ce cas est ignoré (lu).

**Achats et négoces**
- G10. Le même négoce peut recevoir trois ou quatre fois la même demande (double clic, deux onglets). Mesuré.
- G11. Page de chiffrage : « abc » ou « -5 » donnent « Total : NaN » et un message technique ; 950 € la pièce part sans alerte. Vu.
- G12. Après envoi, le récapitulatif du négoce ne montre plus le total, la livraison ni le délai ; pas d'e-mail de confirmation. Vu.
- G13. Aucune acceptation des conditions avant de déposer une offre sans compte. Vu. À trancher.
- G14. Pas de dépôt de PDF sur la page du négoce. Vu.
- G15. Achats groupés : pas de lot Étanchéité ; le filtre ne montre pas le métier du peintre. Vu.
- G16. Achats groupés : précisions perdues si on quitte l'écran ; nom du produit en points de suspension avant validation ; « havraise » disparaît ; « Voir » sur son propre achat propose d'ajouter une quantité. Vu.
- G17. Après l'envoi aux négoces, plus rien ne peut être groupé, sans avertissement avant. Vu.
- G18. À 50 artisans en même temps, créer une liste ou chercher au catalogue prend 5 à 10 secondes (mesure locale, machine partagée).

**Liste et assistant**
- G19. Lignes orange : le compteur et le message « Ta liste est prête » ne concordent pas ; mots mélangés (« regroupement » / « achats groupés », « fournisseur » / « négoce »). Vu.
- G20. L'assistant calcule avec des hypothèses non données (pente 45°, crochet 11 cm, 5 % de marge), ajoute une ligne « Naissances ». Vu. À rapprocher de la règle « ne jamais inventer ».
- G21. Sans réseau, l'assistant répond quand même, mal, vide le champ et ne dit rien de la coupure. Vu.
- G22. Faux devis plein de fautes collé dans l'assistant : résultat inutilisable, proposé quand même à l'ajout. Vu en lecture simulée ; à refaire avec la vraie lecture.
- G23. Recherche du catalogue : un mot en trop (« 15L ») et plus rien ne sort. Même article ajouté deux fois sans alerte. Vu.
- G24. Messages en jargon : SIRET (« champ à vérifier : siret. Code support… »), limites de débit en anglais (lu).

**Mission et vérification**
- G25. Le masquage des messages se contourne (0033, chiffres espacés un à un, numéro étranger, adresse de site). Vu.
- G26. « Entreprise vérifiée » : deux comptes ont validé le même SIRET, qui n'était à aucun des deux. Vu en local (annuaire simulé) ; l'absence d'unicité et de preuve de rattachement est dans le code.
- G27. La condition « SIRET vérifié » arrive à la fin du formulaire, sans lien, et la saisie est perdue. Vu.
- G28. La phrase complète « qui gère quoi » (contrat, assurances, URSSAF) n'est que sur un écran. Vu.
- G29. On ne peut signaler qu'une conversation, pas un profil ni une annonce ; aucune alerte à Greg (lu). Conversation archivée introuvable, blocage définitif non annoncé. Vu.
- G30. Recherche Missions limitée au métier exact ou à la ville ; pas de case « diplômes » ni « attestation URSSAF ». Vu.
- G31. Libellés à risque : « CV », « Débutant accompagné », « Tarif journalier / personne », « Entreprise vérifiée ». Rejoint la relecture du juriste.

**Textes**
- G32. « Je dois obligatoirement commander ? » : la FAQ dit oui, l'application dit « tu décides à la réception de l'offre ». Règle à trancher par Greg.
- G33. Page publique : montants d'exemple (1 480 €, 1 280 €, 1 190 €) et renvoi à une simulation « 6 € à 3 € » ; promesses (« meilleurs tarifs », « le moins cher »). Pages `/couvreurs` et `/peintres` : « au prix des gros », « deux fois moins cher ».
- G34. CGU section 6 (« les artisans ne se voient pas ») contre Mission ; vouvoiement des CGU, tutoiement ailleurs ; fautes (« à le regroupement », « de le regroupement »).
- G35. Inscription : « Essai gratuit » ; « Couverture, charpente, zinguerie » en un seul bouton ; métiers en double.
- G36. Le signalement tutoie le négoce, que ses pages vouvoient. La fenêtre affiche le lien personnel du négoce (« Page jointe : /chiffrer/… ») ; vérifié dans le code : le serveur le remplace par « :jeton » avant d'enregistrer. Défaut d'affichage, pas de fuite.
- G37. Liens trompeurs : « Voir les conditions » mène à Tarifs, « Revoir la démo » ne fait rien, « Découvrir les missions » mène à l'inscription.

**Téléphone et chantier**
- G38. Écran d'erreur du compte : phrase noire sur fond noir (contraste 1,00). Vu deux fois.
- G39. Après un envoi raté sans réseau, le bouton jaune disparaît et le message rouge reste. Vu.
- G40. Plein soleil : contours des champs à 1,3:1, boutons désactivés à 3,4:1, une consigne à 1,7:1. Mesuré.
- G41. Cibles trop petites : recherche Missions 24 px, liens de bas de page 18 à 20 px, retour du catalogue 40 px. Mesuré.

## Détail

Factures sans centimes (« 20 € ») ; jauge de quota ambiguë ; deux boutons « Signaler un problème » de sens différents ; « Mon menu » écrit nulle part ; accueil « Rien à faire » alors que des réponses attendent ; noms d'entreprise coupés ; deux listes du même jour au même nom ; « Retirer de la liste » sans annulation ; trois slogans ; double clic qui crée deux listes ou trois entreprises ; liste déroulante en 15 px ; vieux prix dans des commentaires du code ; `POST /v1/companies` qui range les métiers envoyés en « other » (lu).

## Ce qui tient bien

- Cloisonnement : un artisan ne lit ni ne modifie les chantiers d'un autre ; administration et signalements fermés sans droit ; lien négoce trafiqué refusé ; un négoce ne voit ni les prix ni le nom des autres (vu à l'écran).
- Calculs : prix, TVA, TTC, prorata Essentiel vers Pro, deux mois offerts, quotas, livraison, paliers, coût total livré : justes.
- Achats groupés sous charge : 50 artisans sur le même produit, un seul achat ouvert, compteur exact ; « une ligne, un seul circuit » tenu 5 fois sur 5.
- Zéro erreur serveur à 50 artisans hors B6.
- Mission : parcours complet dans les deux sens, coordonnées après l'accord des deux, pièces jointes contrôlées.
- Téléphone : aucun défilement horizontal, saisies gardées après une coupure, signalement qui part en 3G lente.
- Nouveautés du 13 novembre : Couverture, Zinguerie et Étanchéité séparées au catalogue ; « Catalogue en cours d'enrichissement », « Je saisis mon matériau », « Laisser à préciser », « Signaler un problème » fonctionnent.

## Ce qui n'a pas été testé

- Le vrai Stripe (carte de test, portail, vrais messages) : aucune clé en local.
- La vraie lecture des devis et des photos : coupée en local.
- Le site en ligne : aucun compte créé sur test.mobiiz.fr (cela enverrait de vrais e-mails) ; les temps de réponse réels restent à mesurer.
- Les limiteurs de débit : coupés en local.
- Bout de chaîne : lecture d'une offre d'achat groupé, comparaison, bon de commande à l'écran ; réponse d'un négoce par e-mail avec un PDF illisible ; lecture croisée des prix entre négoces par essai direct (couverte par les tests du serveur).
- Expirations réelles (fin de période, fin de grâce) : il aurait fallu avancer l'horloge du serveur partagé.
- Zoom à 200 %, vrai téléphone, vrai soleil.

## Réserves sur la recette elle-même

- Le test de charge a figé le site local deux fois deux minutes. Les erreurs « Un problème est survenu » vues par quatre autres testeurs tombent très probablement sur ces créneaux ; elles ne sont pas comptées comme des défauts séparés.
- Le site local partagé a ralenti toutes les mesures de vitesse : elles sont indicatives.
- Les comptes de test (« ta- », « tn- », « tm- », « sb- », « ru- », « co- », « re- », « mp- », « tt- ») sont restés dans la base locale de test, qui est vidée à chaque lancement des parcours.
