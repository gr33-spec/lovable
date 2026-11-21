# Architecture UX de MOBIIZ : proposition (1er novembre 2026, à valider par Greg)

Aucun code n'est modifié par ce document. Il décrit l'existant (lu dans le code, chemins cités) puis la cible.
Tout ce qui change une règle déjà décidée par Greg est marqué **[DÉCISION]**.

## 1. L'existant

### 1.1 Navigation et routes

- Barre (`components/app-nav.tsx`) : Accueil · Achats groupés · « + » (→ `/chantiers/nouveau`) · Mes listes (`/chantiers`) · Profil.
  Sur ordinateur, colonne à gauche avec en plus « Mes négoces ». La barre disparaît sur un chantier (plein écran) et sur
  Profil › Apparence.
- Écrans artisan : `/` (accueil), `/chantiers`, `/chantiers/nouveau`, `/chantiers/[id]` (le dossier : liste, assistant,
  demande, réponses), `/achats-groupes`, `/achats-groupes/[id]`, `/achats-groupes/lancer`, `/fournisseurs` (Mes négoces),
  `/recus` (e-mails reçus sur l'adresse Mobiiz), `/mes-prix`, `/compte` et `/compte/[rubrique]`, `/abonnement`, `/formules`.
- Anciens écrans gardés (autres modes du regroupement) : `/groupe` (mode « lots »), `/regroupements` (mode « humain »).
- Côté négoce, sans compte : `/chiffrer/[jeton]` (répondre en ligne), `/reponse/[jeton]`, `/achat-groupe/[jeton]`,
  `/grille/[jeton]`, `/negoce/*` (espace négoce).
- Administration : `/admin/achats-groupes`, `/admin/catalogue`, `/admin/emails`, `/admin/pilotage`, `/admin/chasseur`, `/admin/groupe`.

### 1.2 Le parcours d'une liste (« + »)

1. `/chantiers/nouveau` : trois entrées.
   - « Importer un document » : une feuille avec « Prendre une photo », « Choisir une photo » et « Choisir un PDF ».
     Le type (devis ou liste) est reconnu sans le demander (`natureDuDocument`), puis une fenêtre dit le coût avant l'analyse.
   - « Saisir ma liste » (`saisir-ma-liste.tsx`, catalogue partagé avec l'achat groupé).
   - « Décrire mon chantier » (`decrire-mon-chantier.tsx`, conversation `chat-mobiiz.tsx`).
2. La lecture : animation plein écran (`ReadingStage`, `ReadingScene` dans `chantier-scenes.tsx` ; « Je lis ton devis »,
   puis « Gros devis, j'y suis encore… » après 30 s). Un seul appel à l'IA par devis (§51.5).
3. La carte « Lots repérés » quand le devis couvre plusieurs métiers (`LotsCard`).
4. Les questions de comptoir : TOUTES sur un seul écran, en boutons, avant le calcul (`QuestionsScreen`, §48.4 et §50).
5. Le calcul (`ListScene`), puis « Ton chantier » (`supply-list.tsx`) : lignes à vérifier, « Valider » / « Préciser ».
6. L'assistant Mobiiz (`assistant-mobiiz.tsx`) s'ouvre une fois après un devis ou une photo.
   - Sur ordinateur, la conversation à gauche et le vrai PDF à droite ; sur téléphone, « Voir PDF ».
   - Ses questions viennent du document, puis du chantier (adresse, livraison, date).
   - **Il ne fait aucun appel IA** : c'est du code. L'IA ne sert qu'à la lecture et à la relecture d'une réponse « Autre » (§51.2).
7. Ensuite, un seul bouton par étape (§ point 8 du 28 octobre).
   - « Demander les prix à mes négoces » ; « Envoyer une partie » ; au plus une suggestion d'achat groupé.
   - Menu « ··· » : ajouter, renvoyer ou changer de négoce, modifier la liste, supprimer la demande.

### 1.3 La demande individuelle

- Données :
  - `Project` = le dossier, avec `status` : `active` ou `archived` (« Terminée ») ;
  - `Takeoff` = la liste, avec `status` : `draft` ou `validated` ;
  - `PriceRequest` = une demande ; `PriceRequestRecipient` = un négoce consulté, avec `status` (`to_send`, `sent`,
    `received`, `declined`) et les dates `sentAt`, `reponduLe`, `relanceLe`, `commandeLe`, `livreLe`, `prix`, `tokenHash` ;
  - `SupplierOffer` = un devis de négoce rangé.
- Réponses :
  - par le lien (prix ligne par ligne, Excel) : la comparaison est faite par le code ;
  - par e-mail sur l'adresse Mobiiz étiquetée (`EmailRecuArtisan`, avec `luLe`, ses fichiers, son rattachement au négoce
    et à la demande) : visible sur le chantier et dans « Mes reçus » ;
  - **aucune réponse depuis l'application** : l'artisan répond depuis sa propre messagerie ;
  - « Je retiens ce négoce » passe la demande à « Commandé ».
- Statuts montrés (`packages/domain/src/accueil/accueil.ts`) : « Consultation des négoces », « N réponses reçues », « Terminée ».

### 1.4 L'achat groupé

Trois modes coexistent (`useModeRegroupement`) :
- « automatique » : le mode par défaut ;
- « humain » : regroupement négocié par un « chasseur » ;
- « mois » : l'ancienne commande du mois.

Le mode automatique :
- **Une proposition** = un métier (une famille parmi `couverture`, `charpente`, `second_oeuvre`) + une zone + une période
  (`packages/domain/src/groupe/achat-groupe-panier.ts`).
- **Un panier de lignes** du catalogue par artisan (`BesoinNegocie`, `LigneAchatGroupe`).
- **Chacun apporte ses négoces**, et chaque négoce ne reçoit que les lignes de ses familles (`lignesPourNegoce`).
- **Saisie en 4 étapes** : matériaux, lieu et date, négoces, engagement (`FormulaireAchatGroupe`).
- **Depuis une liste** : « Acheter en groupe » (`AcheterEnGroupe`).
- **Conditions pour rejoindre** : un SIRET vérifié par l'INSEE (`siretVerifieLe`, `achat-groupe.service.ts:271`).
- **Engagement**, dans les mots de Greg :
  - « Je commande ces quantités, chez le moins cher entre la meilleure offre du groupe et mon négoce habituel » ;
  - deux seules sorties possibles (chantier annulé, aucune offre livrable) ;
  - exclusion de 3 mois en cas de manquement (`PHRASE_ENGAGEMENT`, `REGLES_ENGAGEMENT`).
- **Ce que voient les autres** : le titre, le métier, la zone, la clôture, le nombre d'entreprises (à partir de 5,
  `SEUIL_ANONYMAT_DEFAUT`) et une jauge en quarts du volume en euros (`jaugeVolume`). **Jamais les quantités des
  autres**, par confidentialité.
- **États d'une participation** : `seul`, `regroupe`, `regroupe_total`, `consultation`, `validation`, `offre`,
  `pas_assez`, `commande`, `desiste`, `sorti`, `non_commande`, `retire`.
- **Le blocage multi-métier** (`catalogue-listes.tsx:98-118`) : un article d'un autre métier « se met de côté »,
  avec « Un achat groupé reste d'un seul métier. Mets-le dans l'achat groupé … ».

### 1.5 Les négoces

Deux carnets :
- **`Supplier`** : les négoces des demandes individuelles (nom, e-mail, contact, téléphone), **sans aucune spécialité** ;
- **`Negoce`** : la base des achats groupés, avec `familles` et `generaliste`, déclarés à l'ajout.

### 1.6 La vérification des entreprises

| Élément | Ce qui existe |
|---|---|
| E-mail | lien envoyé à l'inscription, **non obligatoire** (`requireEmailVerification: false`) |
| Téléphone | enregistré, **jamais vérifié** ; aucun prestataire SMS (les « SMS » existants sont des liens `sms:` que l'artisan envoie lui-même) |
| SIRET | contrôlé auprès de l'INSEE (`siretVerifieLe`), obligatoire pour l'achat groupé |
| Contrôle des abus | compte signalé à l'admin après 3 participations sans commande (`PARTICIPATIONS_SANS_COMMANDE_MAX`) ; statut « douteuse » ; journal des actions admin |

## 2. La navigation cible

Barre du téléphone, ordre inchangé :

| Accueil | Achats groupés | **+** | Mes demandes | Profil |
|---|---|---|---|---|

- « Mes listes » devient **« Mes demandes »**. L'adresse `/chantiers` reste (liens des e-mails et notifications) ;
  seuls le nom et le contenu changent.
- Ordinateur : colonne de gauche avec Accueil, Achats groupés, « Nouvelle demande » (le +), Mes demandes, Mes négoces, Profil.
- Accueil, inchangé dans son principe :
  - « Bonjour [prénom] » ;
  - « À faire maintenant » : une seule action, selon la règle de priorité existante ;
  - « Commencer » : les quatre façons du + et « Voir les achats groupés » ;
  - « Dossiers à suivre » : deux au plus, avec « Voir tout ».
- « Mes reçus » ne disparaît pas tout de suite : les messages passent dans l'onglet « Messages » de chaque demande, et
  « Mes reçus » ne garde que les e-mails sans demande (« à rattacher »).

## 3. Le parcours du « + »

1. Feuille du « + », quatre choix (le bouton ne change pas) :
   1. **Importer un document** : PDF, devis, liste, scan, capture ;
   2. **Photographier une liste papier** : l'appareil photo directement (aujourd'hui caché dans « Importer ») ;
   3. **Créer une liste à la main** (« Saisir ma liste ») ;
   4. **Décrire mon chantier** : à l'écrit ou à la voix.

   Une ligne dit ce que MOBIIZ accepte : « Devis, liste, PDF, photo, scan, liste manuscrite, ou ta description. »
2. Le document ou la description.
3. La fenêtre « type reconnu et coût » (existante).
4. **L'animation d'analyse, gardée telle quelle.**
5. La conversation avec MOBIIZ, en plein écran sur téléphone. Sur ordinateur : la conversation à gauche, la liste à jour à droite.
   - Les questions arrivent **une par une** : quantité manquante, unité, dimension, épaisseur, référence, conditionnement, doublon.
   - Chaque réponse met la liste à jour aussitôt.
   - « Voir ma liste » est toujours accessible.
   - **[DÉCISION]** Aujourd'hui, les questions se posent toutes sur un seul écran avant le calcul (§48.4, §50 du
     référentiel), puis l'assistant pose le reste. Le « une par une » remplace l'écran des questions par la conversation.
     C'est une règle de ton référentiel : elle change seulement avec ton accord. Je propose de garder le même moteur de
     questions (`counterQuestions`, `questionsDuDocument`) et de changer seulement la présentation : aucune question
     nouvelle, aucune quantité inventée.
   - **[DÉCISION]** La conversation reste pilotée par le code, sans IA, comme aujourd'hui. Un texte libre est relu par
     l'IA seulement là où c'est déjà le cas (réponse « Autre », §51.2). Un vrai dialogue avec l'IA à chaque message
     coûterait un appel par message et augmenterait le risque d'invention.
6. La vérification par l'artisan, sur la liste.
7. La liste validée, puis quatre choix :
   - **Demander des prix à mes négoces** ;
   - **Ajouter toute ma liste à un achat groupé** ;
   - **Regrouper seulement certains articles** : les gros volumes sont cochés d'avance, l'artisan décide ;
   - **Enregistrer pour plus tard**.
8. Partie de « Achats groupés » (paramètre `?depuis=achat:<id>`, gardé dans le brouillon), on ne redemande rien :
   - **Ajouter toute ma liste** ;
   - **Choisir les articles à regrouper**.

## 4. Le parcours d'un achat groupé

### 4.1 L'écran « Achats groupés »

Trois vues : **Propositions ouvertes** · **Mes participations** · **Mes propositions**. Filtres : métier ou famille, zone.

Carte d'une proposition :
- titre clair (« Ardoise naturelle · secteur Paimpol · clôture le 20 novembre ») ;
- famille de matériaux ;
- zone ;
- date de clôture ;
- quantité réunie ;
- nombre d'entreprises ;
- bouton **« Ajouter mes quantités »**.

En haut : **« Proposer un besoin groupé »**. Sur une liste existante : **« Regrouper certains articles »**.
« Ajouter ma liste à un achat groupé » disparaît des écrans (à vérifier dans tous les textes et e2e).

**[DÉCISION] Quantités et entreprises visibles.** Aujourd'hui, ni l'un ni l'autre n'est montré sous 5 entreprises, pour
ne pas dévoiler le chantier d'un concurrent (« 900 ardoises, 1 entreprise »). Je propose :
- la quantité arrondie par tranche (« plus de 2 000 ardoises ») ;
- « moins de 5 entreprises » sous le seuil ;
- seules les quantités confirmées par des entreprises vérifiées sont comptées.

### 4.2 Ajouter mes quantités

Cinq façons :
- **À la main** : le catalogue actuel, une quantité et une unité ;
- **Depuis une liste enregistrée** : le choix des lignes, comme dans `AcheterEnGroupe` ;
- **Importer un document**, **Photographier une liste papier** ou **Décrire mon chantier** : le parcours du « + »,
  avec le contexte de l'achat gardé.

Ensuite :
1. Un récapitulatif exact : chaque article, sa quantité, son unité.
2. La case **« Je confirme que ces quantités correspondent à un besoin réel de mon entreprise. »**
3. **« Ajouter mes quantités »**.

### 4.3 Avant la clôture

- La participation se modifie ou se retire jusqu'à la clôture, et les règles sont affichées sur la carte.
- Un rappel part avant la clôture (le mécanisme de rappel existe déjà pour les négoces).
- Les quantités sont verrouillées à la clôture, puis les négoces sont consultés.

**[DÉCISION] « Pas une commande ».** Le texte actuel d'engagement (« Je commande ces quantités… », sorties limitées,
exclusion de 3 mois) dit l'inverse de « libre d'accepter ou de refuser ». Ce sont tes mots, ils touchent les CGU et
l'équilibre avec les négoces : rien ne change sans ta décision écrite, et une relecture juridique si besoin.

### 4.4 Lots multi-métiers dans un achat groupé

Une liste qui contient plusieurs familles est découpée automatiquement. Chaque famille va dans la proposition de son
métier et de sa zone, existante ou à créer, sans que l'artisan recommence. Un seul récapitulatif montre « 12 lignes →
achat couverture, 4 lignes → achat charpente, 3 lignes non regroupables (envoyées en demande perso si tu veux) ».

## 5. Les quantitatifs multi-métiers

Ce qui existe déjà :
- la lecture rend le métier et les lots (`lecture.metier`, `.lots`, `ecranParLots`) ;
- « Ton chantier » montre une section par lot ;
- « Cocher ce lot » existe en « Envoyer une partie ».

À faire :
1. Remplacer la phrase bloquante (`catalogue-listes.tsx:118`) et la mise de côté par : « Cette liste contient plusieurs
   familles de matériaux. MOBIIZ va les organiser en lots afin de les adresser aux négoces les plus adaptés. Tu pourras
   vérifier la répartition avant l'envoi. »
2. Une famille par ligne : celle du lot de la lecture, sinon celle du catalogue, sinon « Généraliste / à classer »,
   modifiable d'un tap. Familles proposées : couverture, charpente, maçonnerie, isolation, plâtrerie, électricité,
   plomberie, bois, généraliste.
   **[DÉCISION]** L'achat groupé ne connaît aujourd'hui que trois familles (couverture, charpente, second œuvre) :
   faut-il en ouvrir d'autres ?
3. Une seule vue du chantier pour l'artisan. L'envoi se fait par lot, chaque lot à ses négoces compatibles (§6).

## 6. Les spécialités des négoces et la correspondance avant envoi

- À l'ajout d'un négoce : son e-mail, puis **ses spécialités** en boutons : généraliste, couverture, charpente,
  maçonnerie, isolation et plâtrerie, plomberie, électricité, bois, autre (écrire). Elles restent modifiables, notées
  « déclarées par toi », jamais présentées comme sûres.
- Avant l'envoi, un écran **« Qui reçoit quoi »** :
  - les lots en lignes et les négoces en colonnes (cases cochées d'office selon la compatibilité) ;
  - lots couverts, lots non couverts ;
  - négoces spécialisés, négoces généralistes ;
  - lignes sans destinataire.
- Alerte quand un lot n'a personne : « Deux lignes de maçonnerie n'ont actuellement aucun négoce compatible. Ajoute un
  négoce généraliste ou un négoce spécialisé pour demander leur chiffrage. »
- Forcer l'envoi d'un lot à un négoce non compatible reste possible, après l'avertissement « Ce négoce n'est pas noté
  pour la maçonnerie. L'envoyer quand même ? ».
- Un spécialisé ne reçoit que ses lots ; un généraliste peut en recevoir plusieurs.
- **Rien ne part sans le bouton « Envoyer » final**, comme aujourd'hui.

## 7. La vérification des entreprises (progressive)

| Niveau | Contrôle | Ce qu'il permet |
|---|---|---|
| 0, compte créé | — | consulter, préparer des listes, voir les propositions |
| 1 | e-mail confirmé (lien, existant) | envoyer des demandes de prix aux négoces |
| 2 | téléphone confirmé par code | **[DÉCISION]** demande un prestataire SMS : nouvelle dépendance, coût, sous-traitant RGPD |
| 3 | SIRET actif à l'INSEE (existant), plus une correspondance raisonnable : nom de l'entreprise, code d'activité du bâtiment, département, domaine de l'e-mail | quantités **comptées** dans un achat groupé |
| 4 | contrôle manuel par l'admin quand le niveau 3 trouve une incohérence (nom très différent, code d'activité hors bâtiment, SIRET déjà utilisé) | levée du doute ; le statut `douteuse` existe déjà |

- Avant le niveau 3, l'artisan peut préparer sa participation, mais elle n'est pas comptée dans le total. La carte le
  dit : « Tes quantités seront comptées dès que ton entreprise sera vérifiée. »
- Un historique minimal est gardé : ajout, modification, retrait, confirmation, avec la date, l'utilisateur, la valeur
  avant et après.

## 8. « Mes demandes »

- Une demande = un dossier : le chantier (`Project`), sa liste, ses documents d'origine, le PDF envoyé, les négoces
  consultés et leurs dates, les messages, les réponses, les offres, la comparaison et l'historique.
- Filtres :
  - **À préparer** : la liste n'est pas encore envoyée ;
  - **Envoyées** : en attente de réponses ;
  - **Réponses reçues** ;
  - **Terminées** : le statut `archived` existant, ou un négoce retenu.
  - Pas d'« Archivées » : l'archivage existant est déjà « Terminée ».
- Carte d'une demande :
  - le nom ;
  - l'état ;
  - « 3 négoces consultés · 2 réponses » ;
  - la prochaine action utile, par exemple « Compare les 2 offres » ;
  - une pastille « 2 non lus ».
- Écran d'une demande, avec 4 onglets :
  - **Résumé** : l'état, la prochaine action, la liste en une ligne, les négoces et leur état ;
  - **Messages** : par négoce, rattachés à la demande. Chaque message dit qui écrit, la ligne ou le document concerné, et
    « À toi de répondre » ou « Pour info ». Pas de messagerie générale ; la réponse se fait depuis la messagerie de
    l'artisan, comme aujourd'hui (ou une réponse dans l'app plus tard) ;
  - **Offres** : les réponses chiffrées, la comparaison, « Je retiens ce négoce » ;
  - **Documents** : devis d'origine, PDF envoyé, devis reçus, croquis.
- Ordinateur : la liste des demandes à gauche (filtres et recherche visibles), le détail à droite.

## 9. Les écrans principaux

| Écran | Téléphone | Ordinateur |
|---|---|---|
| Accueil | une colonne : action prioritaire, 4 façons de commencer, 2 dossiers | deux colonnes : action et dossiers à gauche ; achats groupés près de chez moi à droite |
| Feuille du « + » | panneau qui monte du bas, 4 grandes tuiles | fenêtre centrée, 4 tuiles en ligne |
| Analyse | animation plein écran (existante) | idem |
| Conversation MOBIIZ | plein écran ; barre de saisie fixe avec micro ; bouton « Ma liste (12) » qui ouvre la liste en panneau | conversation à gauche, liste à jour à droite (comme l'assistant actuel avec le PDF) |
| Liste validée | 4 choix en grandes cartes, le principal en jaune | idem, en ligne |
| Qui reçoit quoi | une carte par lot : ses négoces, puis les alertes | tableau lots × négoces |
| Achats groupés | 3 onglets en haut ; cartes empilées ; « Proposer un besoin groupé » fixé en bas | onglets ; grille de cartes ; filtres à gauche |
| Ajouter mes quantités | étapes en plein écran : source, lignes, récapitulatif, confirmation | une colonne de saisie et une colonne de récapitulatif |
| Mes demandes | filtres en pastilles ; cartes | liste à gauche, détail à droite |
| Une demande | onglets en haut ; action principale fixée en bas | onglets ; comparaison des offres sur toute la largeur |

Pour toutes les vues téléphone :
- la barre basse est fixe et la zone du geste respectée (règles déjà en place) ;
- rien n'est caché sous la barre (`--nav-space`) ;
- les cibles tactiles font 44 px ;
- les choix secondaires s'ouvrent en panneaux qui montent du bas.

## 10. Base de données : changements ajoutés, sans rien supprimer

| Table | Ajout | Pour |
|---|---|---|
| `supplier` | `familles text[]`, `generaliste boolean`, `familles_maj_le` | les spécialités du carnet individuel |
| `price_request_recipient` | `lots text[]`, `hors_specialite boolean` | qui reçoit quel lot ; l'envoi forcé |
| `company` | `telephone_verifie_le`, `verification` (niveau), `verification_motif`, `verifiee_par_admin_le` | la vérification progressive |
| nouvelle table `code_verification` | entreprise, canal, empreinte du code, expiration, essais | le code téléphone (si décidé) |
| `ligne_achat_groupe` | `confirme_le`, `modifie_le`, `retire_le` | confirmation, modification, retrait (rien n'est effacé) |
| nouvelle table `journal_participation` | entreprise, utilisateur, achat, action, avant, après, date | l'historique anti-abus |
| `price_request_recipient`, `email_recu_artisan` | `vu_le` sur les réponses (`lu_le` existe pour les e-mails) | les « non lus » |
| `regroupement_negocie` | `rappel_cloture_le` si le rappel existant ne suffit pas | le rappel avant clôture |

Toutes ces migrations sont additives, faites d'abord sur la base de test, puis répétées sur une copie de la
production avant toute mise en ligne.

## 11. Risques, limites, décisions à prendre

1. **[DÉCISION]** Les questions une par une dans la conversation remplacent l'écran des questions (§48.4, §50).
2. **[DÉCISION]** La conversation reste pilotée par le code, l'IA seulement là où elle sert déjà.
3. **[DÉCISION]** L'engagement de l'achat groupé (« Je commande… », sorties, exclusion) contre « ce n'est pas une
   commande » : touche les CGU.
4. **[DÉCISION]** Montrer la quantité réunie et le nombre d'entreprises : par tranches, et « moins de 5 » sous le seuil ?
5. **[DÉCISION]** Le code téléphone : quel prestataire SMS (coût, contrat de sous-traitance) ? Ou d'abord sans, avec
   e-mail, SIRET, correspondance et contrôle manuel ?
6. **[DÉCISION]** Les familles de l'achat groupé au-delà de couverture, charpente et second œuvre.
7. **[DÉCISION]** Fusionner ou non les deux carnets de négoces (question déjà ouverte) : les spécialités vont dans le
   carnet individuel dans tous les cas.
8. **[DÉCISION]** L'e-mail confirmé devient obligatoire avant le premier envoi à un négoce (recommandé).
9. Les modes « humain » et « mois » et leurs écrans (`/groupe`, `/regroupements`) restent intacts et cachés : je ne les
   touche pas sans ta décision.
10. Risque d'oubli : chaque texte remplacé (« Ajouter ma liste à un achat groupé », « Mes listes ») est cherché dans les
    écrans, les e-mails, les notifications et les e2e avant le changement.
11. Limite : aucune garantie d'économie n'est affichée, nulle part, et rien ne part chez un négoce sans le bouton final.
12. Sécurité : chaque nouvelle route passe dans le test d'isolation entre entreprises (`isolation-toutes-routes`).

## 12. Ordre de réalisation proposé, une étape validée à la fois

1. **Sans base, faible risque** :
   - les noms (« Mes demandes », « Ajouter mes quantités ») ;
   - la feuille du « + » à 4 choix ;
   - les filtres et cartes de « Mes demandes » ;
   - le remplacement de la phrase bloquante multi-métier ;
   - les 3 vues des achats groupés avec les données existantes.
2. Spécialités des négoces et écran « Qui reçoit quoi » : une migration additive.
3. Participation fiable : confirmation explicite, modification ou retrait jusqu'à la clôture, historique, comptage
   des seules entreprises vérifiées.
4. Dossier « Mes demandes » à 4 onglets, avec les non-lus.
5. Questions une par une dans la conversation, si tu le valides.
6. Code téléphone, si tu le valides.
