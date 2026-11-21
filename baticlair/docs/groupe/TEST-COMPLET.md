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

Classés par gravité. « Corrigé » = sur la branche `claude/test-complet` (PR #299), rejoué ensuite ; les cinq corrections qui touchent le code de #284 sont aussi sur sa branche (commit « report sur #284 »), donc sur sa prévisualisation.

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

## Rejoué le 22 octobre au soir, avec le nouveau cap (plan « finition », bloc 2)

Le parcours demandé par Greg, étape par étape, et ce qui le rejoue à chaque poussée (tout vert le 22 octobre au soir). Le parcours tourne sur le code de #284 (local, lecture rejouée, e-mails capturés, géocodage par table fixe de codes postaux).

| # | Étape | Rejoué par | Vu |
|---|---|---|---|
| 1 | La liste (photo d'une liste écrite à la main) | e2e « « + Nouvelle liste » : « Donne ta liste de matériaux »… » | une carte par ligne, telle qu'écrite, aucune question |
| 2 | La précision d'une ligne vague | même test ; domaine `ligne-precise-ou-vague` | « Marque ? » en boutons ; « Edilians » s'écrit dans la désignation ; la pastille passe au vert |
| 3 | Ligne vague hors commande commune | API `cap-22-octobre` (« ligne vague refusée ») ; e2e « scénarios 1 » | case grisée ; l'API refuse (400 `ligne_vague`) ; la ligne part quand même chez le négoce de l'artisan |
| 4 | Le regroupement | e2e « étape 8 » ; API `groupe-regroupement` | deux couvreurs, même ligne précise, même département : une commande commune |
| 5 | Les mails aux négoces | e2e « étape 8 » ; API `groupe-demande`, `cap-22-octobre` | « Commande commune : demande de prix… », commission en gras, PDF ; le négoce ajouté reçoit le mail d'information (texte corrigé ce soir, voir plus bas) |
| 6 | Les devis lus | e2e « étape 8 » (deux négoces par e-mail, webhook signé) | « Devis reçu, merci. » ; lu une fois au dépôt (faux lecteur) |
| 7 | La comparaison et les alertes | API `cap-22-octobre` ; domaine `calculs-a-la-main` (cas 3) | « Nouveau meilleur prix », « au même prix » (corrigé ce soir), « légèrement plus haut », « plus haut » |
| 8 | Le prix livré, gratuit jusqu'à X km, Y € au-delà | domaine `calculs-a-la-main` (cas 1 et 3) ; API `cap-22-octobre` | « Ton prix livré à … : … HT (livraison …, N km du dépôt) » |
| 9 | Le choix du négoce | domaine `calculs-a-la-main` (cas 2) ; API `groupe-choix` | le moins cher livraison comprise |
| 10 | Le bon de commande | API `groupe-commande` ; domaine `calculs-a-la-main` (cas 1) | un PDF par artisan, au négoce et en copie à l'artisan ; la livraison promise y est écrite (ajout de ce soir) |
| 11 | Le suivi façon colis | e2e « depuis le + », « étape 8 » ; domaine `calculs-a-la-main` (cas 3) | Liste prête → Prix demandés → Prix reçus → Commandé |
| 12 | Livré / Problème | e2e « étape 8 » ; API `groupe-commande` | « Livré, merci. » ; « Problème » journalisé pour Greg |
| 13 | Le désistement | e2e « scénarios 2 » ; domaine `calculs-a-la-main` (cas 3) | avertissement, puis exclusion de six mois au deuxième dans les 12 mois |

### Trois cas vérifiés à la main

Chaque chiffre ci-dessous a été posé à la main, puis écrit dans le test permanent `packages/domain/test/calculs-a-la-main.test.ts` : la doc et le code ne peuvent plus diverger sans que la CI le dise.

**Cas 1 : l'ardoise de la démo, Ploubazlanec.**
- Paliers du négoce : dès 5 000 pièces à 0,95 €, dès 8 000 à 0,92 €, dès 10 000 à 0,89 €. Volume ferme du lot : 8 200 pièces. Le plus haut palier atteint est 8 000 : **0,92 €**.
- Distance : Guingamp (48,56 ; −3,15) → Ploubazlanec (48,80 ; −3,03). À vol d'oiseau 28,10 km ; × 1,3 = 36,53 ; arrondi : **37 km**. Gratuit jusqu'à 30 km, 45 € au-delà : **45 €**.
- Prix livré de l'artisan (2 760 pièces) : 2 760 × 0,92 = 2 539,20 € ; + 45 = **2 584,20 € HT**.
- Prix habituel (1,04 €) : 2 760 × 1,04 = 2 870,40 €. Économie : 2 870,40 − 2 584,20 = **286,20 €**. Baisse affichée : (1,04 − 0,92) / 1,04 = 11,5 %, arrondi **12 %**.
- Commission (si elle s'applique un jour, rémunération en suspens) : 8 200 × 0,92 = 7 544,00 € ; 2 % = **150,88 € HT** ; TVA 20 % = 30,176, arrondi **30,18 €** ; TTC **181,06 €**.
- Bon de commande : « Livraison : 45,00 € HT (37 km du dépôt, au-delà de 30 km) », « Total HT : 2 539,20 € », « Total HT livraison comprise : 2 584,20 € ».

**Cas 2 : le moins cher livraison comprise.**
- 500 m² de carrelage, trois chantiers : à 10 km, à 40 km, et une adresse introuvable (comptée « au-delà », on n'annonce jamais une livraison gratuite non vérifiée).
- Négoce A : 20,00 € ; gratuit jusqu'à 30 km, 60 € au-delà ; livraisons 0 + 60 + 60 = 120 € ; total 500 × 20,00 + 120 = **10 120 €**.
- Négoce B : 20,10 € ; gratuit jusqu'à 50 km, 30 € au-delà ; livraisons 0 + 0 + 30 = 30 € ; total 500 × 20,10 + 30 = **10 080 €**.
- **B est retenu** (40 € de moins), bien que son prix unitaire soit plus haut ; A est écarté « plus cher ».

**Cas 3 : Paimpol → Lannion.**
- 600 pièces : le négoce C ne chiffre que dès 1 000 pièces → écarté « palier insuffisant » ; le négoce D donne 1,02 € sans palier → **retenu à 1,02 €**.
- Distance : Paimpol (48,78 ; −3,05) → Lannion (48,73 ; −3,46) : 30,57 km × 1,3 = 39,74 → **40 km**. Gratuit jusqu'à 50 km : 0 € ; jusqu'à 40 km : 0 € (« jusqu'à » compte 40) ; jusqu'à 39 km : 45 €.
- Alertes, meilleur prix à 1,00 € : 0,98 → « Nouveau meilleur prix » ; 1,00 → « au même prix » ; 1,08 (+8 %) → « légèrement plus haut » ; 1,12 (+12 %) → « plus haut » (au-delà de 10 %).
- Compteur : « 3 couvreurs, 2 demandes envoyées, 1 devis reçu, meilleur prix 1,02 € » ; seul : « 1 couvreur, demande commune pas encore partie ».
- Suivi : 2 demandes, 1 devis → étape « Prix reçus », « 1 devis reçu sur 2 demandes. Meilleur prix : 1,02 €. » ; commandé → « C'est commandé. ».
- Désistement le 15 novembre 2026 : aucun avant → avertissement ; un le 15 août 2026 (moins de 12 mois) → exclusion jusqu'au **15 mai 2027** ; un le 14 octobre 2025 (plus de 12 mois) → avertissement.

### Ce que le bloc 2 a trouvé et corrigé

1. **L'économie de la carte « Mon offre » oubliait la livraison.** Démo : prix livré 2 584 €, prix habituel 2 870 €, mais « Économie estimée : 331 € » (la livraison de 45 € n'était pas retirée). L'économie vaut désormais « prix habituel − prix livré » : 286 €. Même chiffre dans la démo guidée, dans le compteur « Économisé grâce à la commande commune » et dans le rapport mensuel (ils lisent la même valeur).
2. **La démo guidée affichait « −11 % »** alors que l'app arrondit 11,5 % à 12 % : corrigé (« −12 % »).
3. **Un devis au même prix que le meilleur déclenchait « légèrement plus haut : 1,00 € contre 1,00 € ».** Il dit maintenant « au même prix ».
4. **Le bon de commande ne disait pas la livraison promise.** L'artisan voyait « livraison 45 € » dans son prix livré, le négoce ne recevait que les fournitures. Le bon porte maintenant la ligne de livraison (prix, distance, règle) et le total livraison comprise.
5. **Le mail d'information au négoce lui demandait « votre prix de livraison par zone »**, règle remplacée le 22 octobre : il dit maintenant « vos conditions de livraison (gratuite jusqu'à une distance que vous fixez, un prix par livraison au-delà) ».

## Rejoué le 23 octobre, avec l'espace négoce autonome

Joué par l'e2e « Commande du mois : un cycle complet » (téléphone et ordinateur), sur le 1er novembre 2026 : invitation → inscription → clôture → réponse → résultats → commande → recommande sur grille garantie.

1. A (Lannion) ajoute N1, N2, N3 : chacun reçoit « Un regroupement de couvreurs vous a ajouté à la Commande commune : créez votre accès », sans le nom d'A.
2. Chaque négoce crée son accès depuis `/negoce/rejoindre/<jeton>` : enseigne, un dépôt (N1 et N3 à Lannion, N2 à Paimpol), paliers (gratuite jusqu'à 20 / 30 / 10 km, puis 50 / 40 / 60 € jusqu'à 1 000 km), le 22 coché d'office, conditions cochées → « Vous recevrez la prochaine grille de votre secteur à la clôture du 1er novembre à 12 h. » Son espace dit « Prochaine clôture dans N j », rien d'autre.
3. A et B déposent (5 000 ardoises, 400 m de liteaux, 10 boîtes de crochets) ; clôture ; la grille part aux trois comptes.
4. Chaque négoce ouvre sa grille : zones « 22300 Lannion, 22500 Paimpol », aucun nom ; coche « Prix fermes, quel que soit le volume final. » (sans elle, le bouton reste gris) et dépose son PDF. Premier ou non, jamais les prix des autres.
5. Résultats : pour A, N1 2 120 € livré (gratuit), N2 2 140 € (2 100 + 40 de livraison depuis Paimpol), N3 1 880 € ; N2 coché d'office (le moins cher sur toute la commande). « Commander chez Négoce N2 » → « En commandant, tu transmets tes coordonnées et ton adresse de livraison à Négoce N2. » → « Confirmer la commande » → bon parti chez N2 (il contient « Toitures A ») ; N1 n'a rien reçu d'A.
6. Grille garantie : « Prix garantis jusqu'au 1er décembre » chez N2 ; A recommande 100 ardoises à 0,88 € : 88 € de matériaux + 40 € de livraison = 128 € livré, « Commande sur grille garantie du 1er novembre », deuxième bon chez N2. B la voit sur son accueil sans avoir rien déposé pour elle.

Rien de faux trouvé sur ce parcours. Les cas API couverts à part : négoce « ne livre pas ta zone » (au-delà de la distance maximale), prix non garanti hors total, rappel de clôture au négoce jamais inscrit (3 cycles), désabonnement par lien, suppression du compte, alertes à Greg.
