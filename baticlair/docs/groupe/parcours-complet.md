# BatiClair Groupé — parcours complet et prompt Claude Code

Oct 19, 2026 · @Greg

## 0 ter. Espace négoce autonome — 23 octobre 2026

**Prioritaire sur le point 4 de la section 0 bis (livraison, prix fermes) et sur tout ce qui parle d'un négoce sans compte.** Objectif de Greg : il n'intervient jamais entre un artisan et un négoce. Détails et choix dans `docs/DECISIONS.md` ; cycle complet joué dans l'e2e « Commande du mois : un cycle complet » (invitation → inscription → clôture → réponse → résultats → commande → recommande sur grille garantie).

1. **Invitation** : un artisan ajoute son négoce (« Mets ton négoce dans la boucle ») ; le négoce reçoit un e-mail vouvoyé, sans le nom de l'artisan (« Un artisan de votre secteur (22) vous a ajouté à la Commande commune. Créez votre accès en une minute. »), avec un lien unique `/negoce/rejoindre/<jeton>` lié à son SIRET (sinon son e-mail) : trente artisans qui ajoutent le même négoce donnent un seul compte et un seul lien, régénéré à chaque ajout, valable 90 jours, un e-mail par semaine au plus. Compte créé, le lien renvoie vers la connexion. Connexion par lien magique (30 minutes), session de 30 jours.
2. **Inscription en une page** (`/negoce/rejoindre/<jeton>`) : e-mail, SIRET (prérempli, vérifié Sirene), enseigne, téléphone ; au moins un dépôt (« Ajouter un dépôt », géocodé) ; des paliers de livraison communs à tous les dépôts (gratuite jusqu'à X km, un ou deux paliers payants, distance maximale ; défauts 30 km, 80 € jusqu'à 60 km, 100 km max) ; les départements cochés d'après les dépôts et l'invitation, modifiables ; la case obligatoire des conditions (`/negoce/conditions`). Après : « Vous recevrez la prochaine grille de votre secteur à la clôture du 1er novembre à 12 h. » Les paliers remplacent l'ancien « franco X km / Y € au-delà » partout ; le prix livré de chaque artisan se calcule depuis le dépôt le plus proche de son chantier ; au-delà de la distance maximale, le négoce est listé « Ne livre pas ta zone » et ne se choisit pas.
3. **Abonnement à la zone** : à chaque clôture, « La grille du 15 octobre est prête (22) : N articles à chiffrer » aux comptes inscrits de la zone, relance la veille de la limite ; un négoce invité jamais inscrit reçoit à la clôture « créez votre accès pour la chiffrer », une fois par cycle, trois cycles au plus. Son espace (`/negoce`) : pendant les dépôts, seulement « Prochaine clôture dans X j » ; puis ses grilles à chiffrer ; ses commandes reçues ; dépôts, paliers, départements modifiables ; désabonnement d'un département ou de tout ; suppression du compte. Un lien « Se désabonner » dans chaque e-mail de grille.
4. **Confidentialité absolue** : avant « Commander », le négoce ne voit que la grille (articles, quantités cumulées) et les zones de livraison en communes (« 22300 Lannion, 22500 Paimpol »). Les artisans ne se voient jamais. Au clic « Commander chez X », un écran dit « En commandant, tu transmets tes coordonnées et ton adresse de livraison à X. » et attend la confirmation ; alors seulement le bon PDF part, au négoce choisi et à lui seul. Un négoce retenu ne voit que ses commandes ; les autres reçoivent un message neutre. Test automatique de fuite : `apps/api/test/negoce-confidentialite.test.ts`.
5. **Prix fermes quel que soit le volume** : case obligatoire « Prix fermes, quel que soit le volume final. » au dépôt, rappel au-dessus du bouton ; sans elle, rien ne part (400 `prix_fermes_requis`). Par article, une case « Prix non garanti (matière cotée, ex. zinc) » : le prix est indicatif, montré à part chez l'artisan, exclu du total comparé et de la garantie. Le bon porte « Prix ferme de la Commande commune du 15 octobre. »
6. **Grille garantie 30 jours** : après les résultats, le négoce retenu (le moins cher sur le total) tient ses prix 30 jours pour tout artisan de la zone, nouvel inscrit compris. Bloc « Prix garantis jusqu'au 21 novembre » sur l'onglet et sur l'accueil : les articles au prix garanti, « Recommander à ce prix » (quantités, adresse de livraison, confirmation), le bon part au négoce avec la mention « Commande sur grille garantie du 15 octobre. » et le suivi colis. Deux fenêtres ouvertes = deux blocs, la plus récente d'abord ; fin de fenêtre = le bloc disparaît.
7. **Conditions négoce** (`/negoce/conditions`, dix points, vouvoyés, versionnés `CONDITIONS_NEGOCE_VERSION`) : prix fermes, un prix pour tous, garantie 30 jours, livraison selon paliers, confidentialité, aucun classement public, aucun coût pour l'instant (BATI INVEST se réserve une commission ultérieure avec préavis), désabonnement libre, liberté de ne pas répondre, données. À relire par l'avocat.
8. **Admin** (onglet Négoces) : inscrits, invités jamais venus, désabonnés ; taux de réponse par cycle ; grilles retenues et commandes reçues par négoce. Alertes e-mail à Greg : aucun négoce inscrit pour un département où des artisans ont déposé ; aucune réponse 48 h avant la fin du délai ; grille retenue avec plus de 30 % de lignes non garanties.

## 0 bis. Commande commune — 22 octobre 2026, au soir (cycle raccourci le 23 octobre)

**Prioritaire sur la section 0 et sur tout le reste.** Elle remplace le regroupement par lot au fil de l'eau (« Regroupement », « compteur », « l'app retient seule la moins chère » de la section 0). Détails et choix dans `docs/DECISIONS.md`, totaux à la main dans `docs/groupe/RECETTE.md` (section 5 bis).

1. **Une commande toutes les deux semaines** (Greg, 23 octobre : cycle raccourci). Inscriptions jusqu'à la clôture, le 1er et le 15 de chaque mois à 12 h (heure de Paris ; en décembre, le 15 puis le 1er janvier), avec un chrono partout (« Clôture dans 9 j 4 h »). Une commande porte le jour de sa clôture (« Commande du 15 octobre »). Après la clôture, tout est figé ; ce qui arrive part avec la suivante (« Trop tard pour le 15 octobre, ta liste part avec la commande du 1er novembre. »). Puis la phase « Négoces » : la grille part à tous les négoces couverture de la zone (10 au plus, ajoutés avant la clôture), qui ont 5 jours ouvrés (« Réponse avant le 22/10 à 18 h, il reste X j »), une relance la veille, puis c'est figé. Puis les résultats. Toutes les dates dans une seule config, modifiable par l'admin. Couverture seulement, une zone = un département.
2. **L'artisan dépose** seulement du matériel sûr : un chantier signé ou du stock, les deux dans la même commande. « Mets seulement ce que tu es sûr de commander. Sans engagement : tu commandes seulement si le prix te plaît. » Les lignes vagues restent dehors.
3. **À la clôture**, les produits identiques sont additionnés, les autres restent à part : une seule grille par commande.
4. **Le négoce chiffre la grille** : un prix par article, le même pour tous, toutes les lignes (une grille incomplète passe derrière) ; livraison gratuite jusqu'à X km, Y € au-delà ; prix fermes pour tout le cycle. Pendant le chrono, il voit seulement s'il est premier, jamais les prix des autres. « Chaque artisan choisit le négoce le moins cher pour lui. Plus vos prix sont bons sur tout, plus vous récupérez de chantiers et de nouveaux clients. » Aucune facturation.
5. **Résultats** : le devis est lu une fois, puis le code applique chaque grille à chaque artisan, livraison comprise. Le moins cher sur toute la commande est coché d'office ; l'artisan peut en choisir un autre (« Chez A, 8 400 € livré ; chez B, 7 900 € livré »). Les négoces non retenus reçoivent un message neutre. Suivi : Liste déposée → Commande close → Prix demandés → Prix reçus → Commandé.
6. **Affichage en quantités, jamais en nombre d'entreprises** : « Toi seul : 3 palettes d'ardoises 32×22, 400 m de liteaux », « Toute la commande du 1er novembre : 52 palettes, 6 000 m de liteaux », « Clôture dans 9 j ». Au début : « Pour l'instant, tu es le premier. Partage le lien pour faire grossir la commande. » Notification regroupée, une par jour au plus : « +6 palettes d'ardoises 32×22 viennent d'être ajoutées. L'union fait la force ! »
7. **Landing** : « Marre de te faire enfumer… », « L'union fait la force », « Une commande toutes les deux semaines avec les couvreurs de ta région. » ; 1. Dépose ta liste avant la clôture. 2. On envoie tout le volume aux négoces. 3. Tu vois le meilleur prix et tu commandes si ça te plaît.
8. **Plus tard** : la commande express (hors cycle), notée dans `docs/DETTE.md`.

L'ancien regroupement par lot reste dans le code (`COMMANDE_COMMUNE=lots`) et ses parcours e2e tournent dans une passe dédiée, tant que Greg n'a pas décidé de le retirer.

## 0. Nouveau cap — 22 octobre 2026

**Prioritaire sur tout le reste.** Là où les sections 1 à 7 le contredisent, cette section l'emporte. Ce fichier fait foi : il remplace l'export du doc de Greg (décision du 22 octobre ; détails de mise en œuvre dans `docs/DECISIONS.md`).

- **Promesse : « Paie tes matériaux moins cher ».** Le quantitatif n'est plus la promesse, c'est un coup de main.
- **Métiers.** Tous les métiers restent ouverts dans l'app. La landing, les exemples et la démo sont centrés sur les couvreurs, Côtes-d'Armor d'abord. Ensuite : charpente, maçonnerie, isolation-placo.
- **Entrée.** Un gros bouton « Donne ta liste de matériaux » (photo, PDF, capture). Un petit bouton « Je n'ai qu'un devis » : « On t'avance la liste, sans garantie, tu la peaufines. »
- **Liste en cartes.** On touche pour modifier, on glisse pour supprimer, un « + Ajouter ». Une ligne vague ne bloque rien, mais elle n'entre pas dans la commande commune : elle part seulement chez le négoce de l'artisan. Seules les lignes précises sont regroupées (pastille orange : « Précise pour l'ajouter à la commande commune »).
- **Regroupement** par lignes identiques et par secteur, avec un écran compteur (artisans, demandes, devis reçus, meilleur prix). Un mail type part aux négoces de tous les artisans du groupe ; un mail prévient chaque négoce qu'il existe un regroupement.
- **Devis négoce.** Lu une seule fois par Opus à son arrivée, puis comparé par le code au meilleur prix. Une alerte à chaque nouveau devis. L'app retient seule la moins chère qui couvre tout (livraison comprise).
- **Livraison.** Le négoce donne deux chiffres : « gratuite jusqu'à X km » et « Y € par livraison au-delà » (plus l'adresse de son dépôt). L'app calcule la distance jusqu'à chaque chantier et affiche à chaque artisan son prix livré.
- **Suivi façon colis.** Liste prête → Prix demandés → Prix reçus → Commandé.
- **Nom : « Commande commune »**, dans une seule constante (`packages/domain/src/groupe/nom.ts`), à confirmer auprès de 2-3 couvreurs.
- **Rémunération : en suspens.** Rien ne change pour l'instant (ni abonnement, ni 2 %).
- **Landing (22 octobre, deuxième version) : fun dans les mots, pro dans le visuel.** Fond blanc, une couleur d'accent, vraies captures, aucun dessin. Accroche « Marre de te faire enfumer sur le prix de tes matériaux ? » (« enfumer » vise le prix, jamais une personne : les négoces lisent aussi la page) ; sous-titre « Rassemblons-nous et mettons nos forces en commun pour négocier les meilleurs prix. » ; bouton « Je rejoins le mouvement ». Le principe : « Plus on est nombreux, plus on pèse face aux négoces. », avec le compteur « X couvreurs déjà inscrits dans les Côtes-d'Armor » (vrai chiffre de la base, masqué sous 10). Trois étapes : « Tu donnes ta liste » → « On regroupe les couvreurs du secteur » → « Les négoces se battent pour ton prix ». Un gros bloc « L'union fait la force : fais venir tes collègues » (WhatsApp, SMS, copier le lien, message prérempli) ; le même « Inviter un collègue » dans l'app, après l'inscription et sur l'écran Commande commune. « Gratuit pour l'artisan » bien visible. En bas, pour les négoces : « Négoces : des commandes groupées, des volumes sûrs. Répondez aux demandes, on vous apporte les clients. » Tutoiement, phrases courtes, zéro jargon.

## 1. Principes

Le groupé est une option de BatiClair qui regroupe les besoins de plusieurs artisans d'une même zone pour obtenir un prix de volume, sans jamais toucher au circuit du négoce.

- Chaque artisan commande sur son propre compte négoce, est livré sur son chantier, facturé et payé comme d'habitude (30 jours).
- Les artisans ne se voient pas et ne se parlent pas : chacun voit seulement son offre et son prix.
- BatiClair n'encaisse jamais d'acompte, ne vend rien et ne porte aucun risque d'impayé.
- Le groupé est inclus dans l'abonnement BatiClair (29 à 50 €/mois, « remboursé dès la première commande groupée »). Aucune commission, aucun frais par lot, ni pour l'artisan ni pour le négoce.
- Un besoin entre dans le groupé uniquement s'il vient d'un vrai devis lu par l'app, et uniquement sur engagement ferme : « je prends ces quantités quoi qu'il arrive ».
- Une seule application, BatiClair. Le négoce n'a rien à installer : un e-mail, un lien, il dépose son devis.
- Zéro gestion humaine : mails, regroupement, lecture des réponses, offres et bons de commande sont automatiques. Greg surveille, il ne traite pas.
- Le regroupement est du code pur (référence, zone, fenêtre). L'IA sert seulement à lire les devis des artisans et les devis des négoces.

## 2. Parcours de A à Z

Huit étapes, du devis à la livraison. L'artisan ne fait que deux gestes : proposer (et s'engager), confirmer la livraison.

1. **Devis → liste de commande.** BatiClair lit le devis et produit la liste (temps un, deux, trois). Rien de nouveau ici.
2. **Proposer au groupé et s'engager.** Sur l'écran 3, un interrupteur « Proposer au groupé » par ligne ou par lot, une fenêtre de livraison (date la plus tôt, date limite) et une seule question : « Chantier signé » ou « Devis en attente ». Seuls les besoins « signé » forment le lot ferme ; les « en attente » sont transmis au négoce comme volume probable, sans engagement. En cochant « signé », l'artisan s'engage à commander ces quantités au prix groupé obtenu, chez le négoce retenu. Son besoin part sans son nom.
3. **Base négoces alimentée par les artisans.** À la première proposition, l'artisan saisit l'e-mail de ses négoces (le favori en premier) et coche ce que chacun vend : couverture, charpente, maçonnerie, électricité, plomberie, aménagement extérieur, menuiseries et fermetures, second œuvre (peinture, carrelage, plâtrerie, sols), serrurerie et métallerie. Ces négoces rejoignent la base commune du département. L'app lui donne un message type pour prévenir son négoce. Un négoce qui reçoit un lot qui ne le concerne pas clique « pas concerné » : la famille est décochée toute seule. Aucun démarchage par Greg.
4. **Regroupement automatique.** Le code regroupe par référence exacte (ex. ardoise 32×22), famille de matériau, zone (département) et fenêtre de livraison compatible. Un lot se forme toutes les deux semaines (lundi 7 h) ou dès qu'un seuil est atteint. Un seul lot ouvert par référence et par zone.
5. **Demande aux négoces.** L'e-mail part au nom du « Regroupement artisans » (nom provisoire) depuis l'adresse BatiClair, à tous les négoces du département qui vendent la famille concernée : spécialistes (ardoise à La Rivière) comme généralistes (Point P reçoit toutes ses familles). PDF en deux parties : total ferme + volume probable, puis livraison par chantier (adresse, quantité, fenêtre) sans nom de client. Le négoce clique un lien, dépose son devis PDF (un ou deux, par palier de quantité) et peut ajouter une phrase libre. Pas de compte, pas de formulaire. Il chiffre ce qu'il vend et ignore le reste.
6. **Lecture et choix.** Sonnet extrait de chaque devis négoce les prix par référence et le délai ; le code retient le négoce le moins cher qui couvre tout le lot dans la fenêtre. Un seul prix, un seul négoce par lot : tout le volume va au même endroit, c'est ce qui fait le prix. Cas douteux marqué « à vérifier » pour Greg.
7. **Offre à chaque artisan.** Chacun reçoit son offre personnelle : sa quantité, son prix unitaire, son économie estimée, le négoce retenu, la date de livraison. C'est une information, pas une question : il s'est engagé à l'étape 2. Un bouton « Problème » s'il voit une erreur.
8. **Bons de commande, livraison, confirmation.** Le bon de commande de chaque artisan part automatiquement au négoce retenu : nom, numéro de compte (ou demande d'ouverture), adresse du chantier, quantités, fenêtre de livraison, mention « tarif groupé lot n° … ». Le négoce livre chaque chantier comme une commande normale, il n'appelle personne sauf pour caler l'heure. L'artisan confirme d'un tap (« Livré » / « Problème »), relance à J+15.

## 3. Notifications artisan

Cinq notifications maximum par lot, toutes par push iPhone + e-mail, toujours courtes et sans jamais nommer les autres artisans.

| Moment | Message | Action attendue |
| --- | --- | --- |
| Besoin accepté dans le groupé | « Vos 31 bacs sont dans le groupé Côtes-d'Armor. Prochain lot lundi. » | Aucune |
| Lot formé, demande envoyée | « Le groupé est parti chez 4 négoces. Réponses attendues sous 7 jours. » | Aucune |
| Négoce retenu | « Vos 31 bacs : X € chez A (−Y %). Bon de commande transmis, livraison le 3 nov. » | Problème (si erreur) |
| Livraison prévue | « Livraison aujourd'hui. Tout est arrivé ? » | Livré / Problème |

Quatre notifications par lot, pas de rappel : l'artisan n'a rien à décider après son engagement.

## 4. Le cas du non-engagement

Règle de base : on n'entre dans le groupé que sur engagement ferme (« chantier signé »), donc le négoce chiffre un volume ferme et donne un prix ferme. Plus de second tour, plus de palier qui baisse : le prix annoncé est le prix payé.

**a) Avant le départ du lot.** L'artisan retire son besoin librement tant que la demande n'est pas partie aux négoces.

**b) Entre le départ du lot et le bon de commande.** Le besoin est engagé : il ne peut plus être retiré, et l'artisan ne choisit pas le négoce. Il commande chez celui que le code a retenu pour tout le lot.

**c) Après le bon de commande.** L'artisan qui ne commande pas ou refuse la livraison :

- première fois : avertissement, aucun frais ;
- deuxième fois sur 12 mois : exclu du groupé 6 mois (il garde BatiClair) ;
- le négoce est prévenu automatiquement et peut annuler la ligne.

**d) Le devis en attente ne coûte rien.** Un besoin « en attente » n'engage personne ; s'il devient signé, l'artisan le bascule d'un tap et il rejoint le lot suivant.

**Ce qu'on ne fait pas :** pas d'acompte, pas de pénalité en euros, pas de nom affiché aux autres artisans.

## 5. Garde-fous

- SIRET vérifié (API INSEE) avant tout accès au groupé ; compte de moins de 30 jours plafonné à un lot et 5 000 € de besoin.
- Un besoin = une ligne issue d'un devis lu par l'app, jamais une saisie libre.
- Quantité d'un besoin plafonnée à 3 × la médiane des besoins de la même référence sur 90 jours.
- Un artisan ne voit jamais le nombre d'autres artisans, leurs noms ni leurs chantiers ; seulement « lot formé ».
- Le négoce reçoit les adresses de livraison et les quantités, jamais les noms de clients finaux ; il ne voit le nom de l'artisan qu'au bon de commande.
- Un négoce peut se désinscrire d'un tap (« stop ») ou décocher une famille (« pas concerné »).
- Rôle « négociateur » (plus tard) : un gros artisan peut négocier lui-même un lot avec son négoce ; la réponse arrive dans l'app comme les autres.
- Journal de chaque lot (qui a proposé, engagé, choisi, confirmé, avec horodatage) visible par Greg seul.
- Un seul lot ouvert par référence et par zone à la fois.
- Risque de contournement accepté : le prix groupé est réservé au lot, l'artisan reste pour le quantitatif.

## 6. Abonnement et facturation

Un seul revenu : l'abonnement mensuel BatiClair, 29 à 50 € selon le palier retenu, prélevé par Stripe. Aucune commission sur les lots, aucun frais par commande, aucune marge sur les prix. Argument de vente : « Tu fais ton devis, on commande moins cher pour toi. »

- Le groupé est inclus dans l'abonnement ; pas d'accès au groupé sans abonnement actif et SIRET vérifié.
- Économie affichée = (prix de référence − prix groupé) × quantité ; prix de référence = prix catalogue du négoce ou dernier prix payé seul déclaré par l'artisan. Sert au compteur « Économisé grâce au groupé », pas à facturer.
- Le négoce ne paie rien et n'a rien à signer : répondre est gratuit, il reçoit des commandes groupées prêtes, avec adresses et quantités.
- Option gardée pour plus tard, quand les lots pèseront : commission d'apporteur d'affaires côté négoce, payée seulement par le négoce qui gagne le lot, avec contrat signé électroniquement. Pas au lancement.
- Écartés : marge cachée sur les prix, BatiClair acheteur-revendeur, frais payés par les négoces pour voir les lots, réseau social d'artisans.
- En bêta : facture simple sans prélèvement ; Stripe branché avant l'ouverture large.

## 7. Prompt pour Claude Code

À envoyer seulement après la mission multimétier (23 oct.) et la réception des réponses négoce. Copier le bloc tel quel.

```markdown
Nouveau chantier : « BatiClair Groupé ». Règles dans le doc joint (sections 1 à 6) ; lis-le entièrement avant de coder. Rien en prod sans mon accord explicite, tout derrière un drapeau `groupe` désactivé par défaut.

Objectif : regrouper les besoins fermes de plusieurs artisans d'une même zone pour obtenir un prix de volume chez un seul négoce par lot, chacun commandant ensuite sur son propre compte négoce. Aucun contact entre artisans. BatiClair n'encaisse jamais d'argent de commande, ne prend aucune commission : le groupé est inclus dans l'abonnement. Zéro gestion humaine : tout est automatique, Greg ne fait que surveiller.

Étape 1 — Données (PR 1)
- Tables Prisma : Besoin (ligne du quantitatif, artisan, chantier, référence normalisée, famille, quantité, unité, zone = département, fenêtre tôt/tard, statut signé | en attente | retiré | engagé | commandé | livré), Negoce (nom, e-mail, département, familles vendues, favori de, stop, ajouté par), LotGroupe (référence, famille, zone, fenêtre, statut, date d'envoi, clôture, négoce retenu, prix retenu), ReponseNegoce (lot, négoce, fichiers déposés, prix par référence et palier, délai, message libre, statut extraction), OffreArtisan (lot, besoin, prix unitaire, économie estimée, horodatages), BonCommande (offre, négoce, PDF, envoyé le), Livraison (bon, date prévue, livré | problème), Journal (lot, événement, horodatage).
- Normalisation : clé par référence fabricant quand elle existe, sinon libellé référentiel + dimension + teinte. Deux besoins ne se groupent que sur clé identique.

Étape 2 — Entrée du besoin (PR 2)
- Écran 3 : interrupteur « Proposer au groupé » par ligne et par lot, visible seulement si drapeau actif, SIRET vérifié, abonnement actif.
- Au premier usage : fenêtre de livraison, puis un seul choix « Chantier signé » / « Devis en attente », puis phrase d'engagement « En cochant Chantier signé, je m'engage à commander ces quantités au prix groupé obtenu, chez le négoce retenu ». Bascule « en attente → signé » d'un tap plus tard.
- Retrait possible tant que le lot n'est pas parti.

Étape 3 — Base négoces (PR 3)
- Écran « Mes négoces » : e-mail + cases familles (couverture, charpente, maçonnerie, électricité, plomberie, aménagement extérieur, menuiseries et fermetures, second œuvre, serrurerie et métallerie ; chaque métier du référentiel rattaché à au moins une), favori en premier ; message type à envoyer au négoce. Chaque négoce ajouté rejoint la base du département.
- Lien « pas concerné » dans chaque e-mail négoce : décoche la famille ; lien « stop » : désinscrit.

Étape 4 — Regroupement (PR 4)
- Cron Vercel un lundi sur deux à 7 h, et à chaque seuil atteint : un lot par (référence, zone, fenêtre compatible). Seuils dans `groupe/seuils.json` (ex. ardoise : 2 artisans ou 2 palettes). Un seul lot ouvert par référence et zone. Plafond par besoin : 3 × médiane 90 jours.
- Le lot sépare volume ferme (signé) et volume probable (en attente).

Étape 5 — Demande aux négoces (PR 5)
- E-mail au nom de « Regroupement artisans » (nom dans une constante), expéditeur BatiClair, à tous les négoces du département dont les familles couvrent le lot ; un généraliste reçoit toutes ses familles dans un seul e-mail.
- PDF en deux parties : total ferme + probable par référence ; puis une ligne par chantier (adresse, quantité, fenêtre), sans nom de client.
- Lien unique de réponse `reponse/<token-lot-negoce>` : page sans compte, dépôt d'un ou deux PDF (paliers de quantité), zone de texte libre, bouton Envoyer. Réponse par e-mail à `lot-<id>@reponses.<domaine>` acceptée aussi (webhook Resend existant).
- Extraction Sonnet : prix par référence et par palier, délai, message ; cas douteux « à vérifier » dans l'admin, jamais bloquant pour le lot.

Étape 6 — Choix et offres (PR 6)
- Code pur : pour chaque lot, prix de chaque négoce au volume ferme, délai dans la fenêtre ; un seul négoce retenu, le moins cher qui couvre tout le lot. Jamais de répartition entre plusieurs négoces.
- OffreArtisan : quantité, prix unitaire, négoce retenu, date de livraison, économie estimée (prix de référence − prix groupé) × quantité.
- Écran « Mon offre » : information seulement, bouton « Problème » si erreur. Jamais le nombre ni le nom des autres artisans.

Étape 7 — Bons de commande et livraison (PR 7)
- Dès le négoce retenu : bon de commande PDF par artisan (nom, numéro de compte négoce ou « ouverture de compte demandée », adresse chantier, quantités, fenêtre, mention « tarif groupé lot n° … »), envoyé automatiquement au négoce avec une liste récapitulative de ses livraisons ; copie à l'artisan.
- Notification le jour prévu : « Livré » / « Problème ». Relance à J+15.
- Compteur « Économisé grâce au groupé » dans Compte.
- Désistement après bon de commande : 1er = avertissement ; 2e sur 12 mois = exclusion 6 mois ; négoce prévenu.

Étape 8 — Notifications (PR 8)
- Push + e-mail, quatre messages par lot (tableau section 3), aucun rappel.

Étape 9 — Admin Greg (PR 9)
- Écran admin : lots en cours, réponses négoces et extractions « à vérifier », journal, boutons « forcer / annuler un lot / changer le négoce retenu », base négoces (familles, stop), compteur de lots et d'économies par département.

Tests : scénario complet avec 4 artisans fictifs (3 signés, 1 en attente), 3 négoces fictifs dont un généraliste et un « pas concerné », un désistement après bon de commande ; e2e sur iPhone (375 px) pour chaque écran. Crédit API : faux lecteur pour les devis négoce, vraie extraction Sonnet seulement sur demande.

Rapport à chaque PR : ce qui marche, ce qui manque, ≤ 3 décisions pour moi.
```
