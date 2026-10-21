# Test complet du parcours, avant que Greg ne regarde

Demande du 21 octobre 2026 : jouer tout le parcours comme un vrai utilisateur, iPhone puis ordinateur, du début à la fin, noter chaque bug, chaque écran qui ne répond pas, chaque texte faux, corriger, rejouer jusqu'à zéro défaut.

## Comment le test est joué

- **Où** : sur le code de la prévisualisation #284 (branche `claude/saas-achat-artisans-prompt-1lyihx`, landing, pages légales et PWA comprises), complété par la pile d'intégration (#290 et les PR #291 à #298) pour les trois étapes qui n'existent que là : rapport mensuel, démo guidée, aide « ? ». Le tout est réuni sur la branche `claude/test-complet` (PR vers `claude/integration-groupe`). L'adresse `vercel.app` n'est pas joignable depuis la machine de test : le même code tourne en local (`next build` + `next start`, API et base de test vidée avant chaque passage), avec les réglages des parcours e2e (lecture rejouée, e-mails capturés, SIRET vérifié sur la forme, webhook Resend signé).
- **Avec quoi** : un navigateur piloté (Chromium), iPhone 13 (390 × 844, ×2) puis ordinateur (1 440 × 900). Chaque geste est celui de l'écran (taper, cocher, déposer un PDF) ; l'API n'est appelée directement que pour lire la boîte aux lettres de test, signer la réponse e-mail du négoce (webhook) et lancer la tâche du rapport mensuel. Le script : `docs/groupe/test-complet/parcours.mjs`.
- **Ce qui est hors de portée ici** : la vraie lecture du devis (crédit API à zéro : lecture rejouée, le double de test), l'envoi réel des e-mails (capturés), l'API INSEE (SIRET « sur la forme », base Sirene de trois négoces de démonstration), le push iPhone.

## Les 40 étapes jouées, dans l'ordre de la demande

| # | Étape | iPhone | Ordinateur |
|---|---|---|---|
| 1 | Landing déconnecté, premier lancement | ✅ | ✅ |
| 2 à 4 | Démo guidée : trois écrans, « Suivant », « Passer », ne revient pas | ✅ | ✅ |
| 5 | Landing : six sections, deux « Créer un compte », 24 métiers, pied de page, aucune ressource extérieure, pas de débordement | ✅ | ✅ |
| 6 | Mentions légales, CGU, conditions négoce, confidentialité (aucun « avocat » visible) | ✅ | ✅ |
| 7 | Création de compte : 6 métiers puis « Voir les 19 autres », bouton gris tant que la case CGU n'est pas cochée | ✅ | ✅ |
| 8 | Accueil après inscription | ✅ | ✅ |
| 9 | PWA : manifeste, icônes, « Ajouter à l'écran d'accueil » (téléphone seulement), « Compris » | ✅ | ✅ |
| 10 | Compte : adresse, SIRET, « Coordonnées enregistrées. » | ✅ | ✅ |
| 11 | Groupé : « Vérifier mon SIRET », l'étape se coche | ✅ | ✅ |
| 12 | Nouveau chantier depuis le « + », dépôt du devis (lecture rejouée) | ✅ | ✅ |
| 13 | Questions de comptoir (3), « Calculer ma liste » | ✅ | ✅ |
| 14 | Ton chantier : la liste, deux lignes orange réglées d'un tap | ✅ | ✅ |
| 15 | Aide « ? » sur Ton chantier | ✅ | ✅ |
| 16 | Envoi aux négoces : « À qui j'envoie ? », fournisseur ajouté sur place, e-mail avec PDF parti | ✅ | ✅ |
| 17 | Proposer au groupé, chantier signé, phrase d'engagement cochée | ✅ (après correction B1) | ✅ |
| 18 | Second chantier proposé en « devis en attente » | ✅ | ✅ |
| 19 | Mes négoces : suggestion Sirene dès trois lettres, favori, numéro de compte | ✅ | ✅ |
| 20 | Second négoce (généraliste), message type copié | ✅ | ✅ |
| 21 | Aide « ? » sur Tes négoces, Le groupé, Ton compte, Tes chantiers | ✅ | ✅ |
| 22 | Groupé : trois étapes cochées, « Mes lots » (lot ouvert, besoin en attente sans engagement) | ✅ | ✅ |
| 23 | Artisan B (autre navigateur) : compte, SIRET, devis, proposition signée | ✅ | ✅ |
| 24 | Formation du lot au deuxième signé : e-mail « Regroupement artisans » aux deux négoces, commission en gras, PDF joint, aucun nom d'artisan | ✅ | ✅ |
| 25 | Notification artisan « Le groupé est parti chez 2 négoces » | ✅ | ✅ |
| 26 | Négoce 1 : réponse par e-mail → lien neuf, page de dépôt sans compte, contrat PDF, dépôt gris tant que la case 2 % n'est pas cochée, « Devis reçu, merci. » | ✅ | ✅ |
| 27 | Négoce 2 : seconde offre | ✅ | ✅ |
| 28 | Négoce retenu : « 1,02 € HT l'unité chez Négoce Généraliste », jamais le nom de l'autre artisan | ✅ | ✅ |
| 29 | Bons de commande (2 PDF + récapitulatif) et facture de commission chez le négoce retenu ; bon de commande à chaque artisan | ✅ | ✅ |
| 30 | Sur le chantier, « Mon offre » : prix habituel, « Voir mon économie », « Problème » signalé | ✅ | ✅ |
| 31 | Mes lots : « Tout est arrivé ? » → « Livré, merci. » | ✅ | ✅ |
| 32 | Artisan B : « Je ne commande pas » → avertissement, raison, « Je ne commande pas, c'est sûr » ; négoce prévenu (« une commande annulée »), artisan averti | ✅ | ✅ |
| 33 | Compte : « Économisé grâce au groupé » 100,00 €, 1 commande groupée | ✅ | ✅ |
| 34 | Admin (compte `GROUPE_ADMINS`) : lien « Admin groupé », lots, journal du lot | ✅ | ✅ |
| 35 à 38 | Admin : Négoces, Accords, Factures (CSV), Exclusions | ✅ | ✅ |
| 39 | Rapport mensuel du 1er : « Ton mois d'octobre 2026 avec BatiClair : 2 chantiers lus, 100 € économisés, 1 lot » | ✅ | ✅ |
| 40 | Déconnexion, reconnexion | ✅ | ✅ |

Captures : `docs/groupe/captures/test-complet/iphone/` et `docs/groupe/captures/test-complet/ordinateur/` (une par étape, numérotée comme ci-dessus, plus les écrans intermédiaires), e-mails capturés en `.txt` à côté, journal `journal.json`.

## Les défauts trouvés, et ce qui en est fait

Classés par gravité. « Corrigé » = sur la branche `claude/test-complet`, rejoué ensuite.

| # | Gravité | Où | Ce que l'utilisateur voyait | Fait |
|---|---|---|---|---|
| B1 | **Bloquant** | Ton chantier → « Proposer au groupé » | Un chantier créé depuis le « + » n'a pas d'adresse ; « Proposer » répondait « Renseigne l'adresse du chantier (avec le code postal) : le lot se forme par département. Code support : … » et l'artisan restait là, sans champ ni lien. Vu sur l'iPhone (capture `run1/23-…`). | **Corrigé** : la barre demande l'adresse sur place (« Adresse du chantier, avec le code postal »), l'enregistre sur le chantier et propose dans la foulée. Capture `17-proposer-adresse-demandee.jpg`. |
| B2 | Texte | E-mail au fournisseur | Objet « Demande de devis · Couverture Le Goff · chantier Nouveau chantier » quand le devis ne donne ni client ni ville. | **Corrigé** : l'objet devient « Demande de devis · Couverture Le Goff » (ou « chantier à <ville> » quand la ville est connue). |
| B3 | Texte | E-mails de compte | « Confirmez votre adresse e-mail », « Réinitialisation de votre mot de passe » : les deux seuls e-mails qui vouvoient. | **Corrigé** : « Confirme ton adresse e-mail », « Ton nouveau mot de passe », corps au tutoiement. |
| B4 | Texte | Rapport mensuel | « Tes 1 lot du groupé : … ». | **Corrigé** : « Ton lot du groupé » au singulier. |
| B5 | Texte | Mes lots, Mon offre, page de dépôt du négoce, admin, e-mail d'annulation au négoce | « 1250 pièces » sans l'espace des milliers, alors que la liste écrit « 1 250 pièces » (sur la page du négoce, l'espace fine de `fr-FR` existait mais ne se voyait pas dans la police). | **Corrigé** partout (`quantiteFr`, espace insécable), et l'e-mail d'annulation dit « 1 250 pièces de Tuile… ». |
| B6 | Texte | Admin groupé | Statuts bruts de la base à l'écran : « livre », « retire », « envoyee », « choisi ». | **Corrigé** : « livré », « retiré », « envoyée », « négoce retenu »… |
| B7 | Limite du test | Bref du chantier | « 1 descentes, diamètre des descentes : Ø 80. » : la phrase vient de la lecture rejouée (double de test), pas du code de l'app ; avec la vraie lecture, le modèle écrit la phrase. | Rien à corriger dans l'app ; noté. |
| B8 | Limite du test | Nom du chantier | Les deux chantiers s'appellent « Nouveau chantier » : le devis de test n'a ni client ni ville, donc rien à déduire. Avec un vrai devis, le chantier prend le nom lu. | Rien à corriger ; noté. |
| B9 | Observation | Sélecteurs de date | « 10/28/2026 » dans le navigateur piloté (Chromium sans locale système) ; sur un iPhone en français, Safari affiche la date en français. | Rien à corriger. |
| B11 | Observation | Admin, journal d'un lot | Le journal s'affiche brut (événement + JSON), lisible par Greg seul ; c'est voulu (section 5 du document : « journal visible par Greg seul »), mais il pourra être mis en phrases plus tard. | Rien à corriger ; noté. |
| B10 | Observation | Numéros | « Lot n° 73 », « Facture n° 31 » sur une base vidée : le script de vidage e2e ne remet pas les séquences à zéro. Sans effet en production. | Rien à corriger. |

## Rejoué jusqu'à zéro défaut

Six passages sur iPhone (le premier : 15 étapes rouges, dont 14 en cascade derrière B1 ; le quatrième : 3 ; le cinquième et le sixième : 0), puis un passage ordinateur après les corrections de texte : 0. Les tests permanents touchés passent (domaine, API, e2e des écrans modifiés).

## Ce qui reste

- Le même parcours sur la vraie prévisualisation `vercel.app`, avec la vraie lecture (crédit API) et un vrai e-mail : à faire par Greg, c'est la checklist §5 de `MISE-EN-PROD.md`.
- Le push iPhone (« Livraison aujourd'hui. Tout est arrivé ? ») : la tâche du jour de livraison n'est pas jouée ici (la date de livraison est à J+7).
