# Revue à froid : ce qu'un couvreur de 50 ans ne comprend pas en 3 secondes

Plan 2 du 21 octobre 2026, bloc 1. Parcours rejoué sur téléphone (projet Playwright `telephone`, 412 × 915, Chromium) sur la branche `claude/integration-groupe` : landing, inscription, accueil, Groupé avant et après SIRET, Compte, Fournisseurs et formulaire négoce, nouveau chantier, dépôt, questions, « Ton chantier », proposition au groupé (sélection, signé, engagement), « Au groupé », « Mes lots » à chaque étape du lot, « Mon offre », livraison, problème, aide. Puis côté négoce : l'e-mail de demande, la relance après réponse par e-mail, la page de dépôt avant et après dépôt, les e-mails de bon de commande.

Gravité : **1** = il s'arrête (mot ou bouton pas compris, geste bloqué) ; **2** = il hésite (ordre, doublon, écran en trop) ; **3** = détail (ton, mot, mise en page).

« Fait » : corrigé dans cette PR, sans toucher au parcours décidé. « À décider » : un choix du fondateur, laissé tel quel.

## Côté artisan

| N° | Écran | Ce qu'il voit | Ce qu'il comprend (ou pas) | Gravité | Fait |
|---|---|---|---|---|---|
| 1 | Notifications et e-mails du groupé | « Vos 1 250 pièces sont dans le groupé Vendée. » | 1 250 pièces de quoi ? Et toute l'app le tutoie, sauf ce message. | 1 | Fait : « Tes 1 250 pièces de tuile romane canal rouge 12,5 u/m² sont dans le groupé Vendée. » Même chose pour « négoce retenu » et le bon de commande (le mail mélangeait « Vos » et « Tu »). |
| 2 | Groupé, « Pour en profiter » | Trois boutons : « Compte », « Nouveau chantier », « Fournisseurs ». | Des noms d'écrans, pas des gestes : « Compte » pour un SIRET ? | 1 | Fait : « Renseigner mon SIRET », « Déposer un devis », « Ajouter un négoce » (ce dernier ouvre directement le formulaire). |
| 3 | Fournisseurs | Deux listes : « Mes négoces (groupé) » et les fournisseurs, avec deux boutons d'ajout. | Pour lui, Point P est un seul comptoir ; il doit le saisir deux fois. | 2 | Fait en partie : un fournisseur déjà saisi se reprend d'un tap dans « Mes négoces » (nom et e-mail préremplis). Fusionner les deux carnets changerait le parcours : à décider. |
| 4 | Fournisseurs, carte négoce | Badge orange « Sans numéro de compte ». | De l'orange pour une chose facultative : il croit à une erreur. | 2 | Fait : badge neutre « Numéro de compte à ajouter ». |
| 5 | Ton chantier, barre « Proposer » | Deux boutons « Chantier signé » / « Devis en attente », sans question. | Il ne sait pas ce qu'on lui demande. | 2 | Fait : la question « Ton client a signé le devis ? » au-dessus. |
| 6 | Ton chantier, barre « Proposer » | « Transmis au négoce comme volume probable, sans engagement. » | « Volume probable » est un mot de négoce. | 2 | Fait : « Le négoce le voit comme une quantité possible, sans engagement de ta part. Tu le passeras en signé d'un tap quand ton client aura signé. » |
| 7 | Au groupé / Mes lots | États « Engagé, lot parti », « Commandé », « Lot clos sans offre », « devis en attente (volume probable) ». | « Commandé » alors qu'il n'a rien fait ; « clos » ; « volume probable ». | 2 | Fait : « Parti chez les négoces, tu es engagé », « Bon de commande envoyé au négoce », « Aucun négoce n'a répondu, lot fermé », « devis en attente, sans engagement ». |
| 8 | Mon offre | « Ton dernier prix payé seul (€ HT l'unité) » + « Calculer mon économie ». | « Payé seul » ne se dit pas. | 2 | Fait : « Ton prix habituel chez ton négoce (€ HT l'unité) » + « Voir mon économie ». |
| 9 | Mes lots, désistement | Bouton « Confirmer le désistement ». | « Désistement » est un mot d'administration. | 2 | Fait : « Je ne commande pas, c'est sûr ». |
| 10 | Groupé | La carte « Tes commandes d'ardoise… » et ses trois étapes prennent tout l'écran, à chaque visite, même quand il a des lots. | Il doit faire défiler pour voir ses lots. | 2 | Fait : une fois SIRET, devis et négoces faits, les trois étapes se replient derrière « Comment ça marche ». |
| 11 | Accueil, premier lancement | Le premier bloc de l'écran est « Mets BatiClair sur ton écran d'accueil », avant son nom, avant « À faire ». | Il n'a encore rien fait et on lui parle de menus Chrome. | 2 | Fait : le conseil vient après le bloc « À faire ». |
| 12 | Compte | Vingt-cinq lignes « Ratios en cours de validation » au milieu de la page. | Un tableau de bord interne ; il ne sait pas ce qu'il doit en faire. | 2 | Fait : la liste se replie derrière « Voir les 25 métiers ». |
| 13 | Compte | Titre « VOS DEMANDES DE DEVIS » dans une page qui tutoie. | Rupture de ton. | 3 | Fait : « TES DEMANDES DE DEVIS ». |
| 14 | Compte | « Économisé grâce au groupé » tout en bas, après « Supprimer mon compte ». | Le compteur qui fait plaisir est caché sous le bouton qui fait peur. | 3 | Fait : la carte vient avant « Se déconnecter » (toujours sous la ligne de flottaison, pour ne rien décaler au chargement). |
| 15 | Onglet « Groupé » | Le mot seul dans la barre du bas. | « Groupé » quoi ? Il comprend après un tap. | 3 | À décider (nom du produit choisi par le fondateur : BatiClair Groupé). « Achats groupés » serait plus parlant mais plus long. |
| 16 | Inscription | 24 métiers à cocher, un écran entier. | Long, mais il trouve le sien en haut (couverture). | 3 | À décider : rien changé. |
| 17 | E-mail « Confirmez votre adresse e-mail » | Vouvoiement. | Rupture de ton, hors groupé (gabarit d'authentification). | 3 | À décider : rien changé. |

## Côté négoce

| N° | Écran | Ce qu'il voit | Ce qu'il comprend (ou pas) | Gravité | Fait |
|---|---|---|---|---|---|
| 18 | Page de dépôt | Un champ de fichier brut « Choose Files / No file chosen » (texte du navigateur). | Moche et parfois en anglais. | 2 | Fait : bouton « Choisir le PDF » / « Changer de PDF », le nom du fichier choisi en dessous. |
| 19 | Page de dépôt | Rien ne dit ce qu'on attend dans le devis. | Il se demande s'il doit chiffrer franco, par chantier, avec quel délai. | 2 | Fait : une ligne « Comme d'habitude : prix unitaire HT par référence, délai et conditions de livraison, validité. » |
| 20 | Page de dépôt | Aucun pied de page : qui est BatiClair, à qui écrire. | Un vendeur méfiant ferme la page. | 2 | Fait : « BatiClair est édité par BATI INVEST SARL. Une question : répondez simplement à l'e-mail reçu. » + liens légaux. |
| 21 | E-mail de demande (texte) | La phrase de commission en majuscules entre `**`. | Crié ; la version HTML, elle, la met en gras. | 3 | Rien changé : la version texte n'a pas de gras, et la plupart des messageries affichent le HTML. |
| 22 | E-mail de demande | « Volume ferme », « volume probable ». | Mots du métier, compris par un négoce. | 3 | Rien changé. |

## Ce qui va bien (rien à changer)

Landing : accroche, trois étapes, « Le négoce paie 2 % ». Inscription : quatre champs, un métier, la case CGU. Nouveau chantier : un seul bouton « Déposer mon devis ». Questions : boutons, « Autre », « Calculer ma liste ». Ton chantier : la liste, les cases vertes et orange, « Proposer au groupé » en haut. Page de dépôt du négoce : le lot, les chantiers, la case obligatoire, le contrat à côté. Aide « ? » : trois lignes, tutoiement.

## Tests

Les e2e qui lisaient les anciens libellés sont mis à jour ; aucun nouveau parcours n'est nécessaire, chaque changement est un texte ou un ordre d'affichage couvert par les tests existants (étape 2, étape 8, scénarios 1 et 2, aide, PWA, responsive).
