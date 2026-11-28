@AGENTS.md

# Mobiiz — contexte

> **PRENDS LES INITIATIVES QUI ONT DU SENS (Greg, 28 novembre 2026, pour toutes les discussions).** Pense chaque fonctionnalité de bout en bout, comme un artisan qui l'utilise pour la première fois. Si quelque chose est évidemment nécessaire pour qu'elle soit trouvable, compréhensible et utilisable (un onglet, un bouton, un message, un état vide, un retour en arrière), fais-le sans attendre qu'on le demande, et signale-le dans le compte rendu. Ne demande que pour ce qui change une décision produit, coûte de l'argent ou touche la prod.

> **Toute nouvelle discussion crée sa branche depuis `claude/saas-achat-artisans-prompt-1lyihx`, jamais depuis `main`, même si `main` est la branche par défaut.** (Greg, 27 novembre 2026)
>
> **Auteur des commits : le compte GitHub de Greg** (`gr33-spec`, `234254365+gr33-spec@users.noreply.github.com`) ; le committer reste Claude (signature). Posé par le hook de démarrage `.claude/settings.json` (`git config author.name` / `author.email`) ; sans lui, Vercel refuse la mise en ligne quand le dépôt est privé. Vérifier avant le premier commit : `git config author.email`.

Fiche lue par chaque nouvelle session. Le détail des règles produit est dans `baticlair/CLAUDE.md` (à lire avant de toucher au code) ; l'état d'avancement dans `baticlair/docs/SUIVI.md`, les décisions dans `baticlair/docs/DECISIONS.md`, la reprise dans `baticlair/docs/REPRISE.md`.

## Qui, quoi

- Fondateur : Grégory Roy, ancien couvreur, non technicien. On lui parle simplement, court, en français, en le tutoyant.
- Entité : BATI INVEST (SARL, RCS Saint-Brieuc). Contact : contact@mobiiz.fr. Site de test : test.mobiiz.fr (API : api-test.mobiiz.fr).
- Slogans : « Par des artisans, pour les artisans » / « Plus on est, moins on paie ».
- Le produit s'appelle Mobiiz. Le dossier du code s'appelle encore `baticlair` (ancien nom) : ne pas le renommer.

## Trois briques

1. **Quantitatif** : la liste de matériaux d'un chantier (à la main, par le catalogue, par l'assistant, photo ou scan, devis PDF).
2. **Achats** : envoi de la demande de prix jusqu'à 5 négoces, comparaison des réponses, achats groupés par métier et par département.
3. **Mission** : un artisan indépendant (qui se lance, ou dont un chantier est décalé) publie ses compétences et ses diplômes ; une entreprise surchargée cherche du renfort (compétences, nombre de personnes). Mobiiz fait UNIQUEMENT de la mise en relation : les deux parties s'arrangent entre elles, administratif compris (contrat, assurances, attestation de vigilance URSSAF). Jamais d'intérim, de recrutement ni de mission garantie.

- Application multimétier (douze métiers au catalogue) ; la publicité et la communication ciblent d'abord les couvreurs en Bretagne.
- Zinguerie et Étanchéité sont des métiers à part de la Couverture, partout : catalogue, routage des négoces, lots et filtre des achats groupés (13 novembre 2026).
- Un « négoce couverture » a Couverture, Zinguerie et Étanchéité cochées d'office ; il décoche ce qu'il ne vend pas. La demande de prix classique trie ses lignes par métier de chaque négoce ; une ligne que personne ne couvre part chez tous (14 novembre 2026).
- Confidentialité : côté achats, les artisans ne se voient jamais entre eux ; un négoce ne voit jamais les prix d'un autre ; les négoces sont vérifiés.

## Charte

- Jaune #FED206 (tranché par Greg le 16 novembre 2026 : celui du code, déjà partout ; #FFC800 n'est plus la référence) et noir profond ; thème clair ivoire #FBF8F3 ; aucun marron.
- Police : **Plus Jakarta Sans** (tranché par Greg le 13 novembre 2026). Bricolage Grotesque n'est plus utilisée.
- Ton : `baticlair/docs/TON.md`. Page publique : jamais « IA », « automatique », « précis », « exact » ; aucun montant ; aucune économie garantie.

## État réel du code (13 novembre 2026)

- Monorepo pnpm + Turborepo dans `baticlair/` :
  - `packages/domain` : règles métier en TypeScript pur (catalogue, référentiels, achats groupés, missions, abonnement). L'API importe son `dist` : `pnpm -s build` après chaque changement.
  - `apps/api` : NestJS 11, Prisma 7, PostgreSQL (Neon en ligne), tests vitest.
  - `apps/web` : Next 16, React 19, Tailwind 4, tests Playwright (`e2e/`, `e2e-ag-v1/`).
  - `referentiels/`, `docs/` : référentiels métier et documents de suivi.
- Outils : Vercel (site et API), Neon (base), Resend (e-mails), Stripe (compte « Mobiiz »), Anthropic (lecture des devis, clé `BATICLAIR_ANTHROPIC_KEY`).
- Tarifs (RÈGLE CHANGÉE par Greg le 15 novembre 2026, code `packages/domain/src/groupe/tarifs.ts` et `abonnement/abonnement.ts` ; détail dans « Nouveaux tarifs » plus bas) : Gratuit, Pro (29 € HT par mois ou 290 € HT par an), Pro Max (49 € HT par mois ou 490 € HT par an) ; à l'année, deux mois offerts. Rien n'est facturé aux négoces. Avant : Découverte, Essentiel 19,90 €, Pro 39,90 €. L'ancienne limite de chantiers ne s'applique plus jamais : listes sans limite pour tous.
- Réglages coupés par défaut : `MISSIONS_V1`, `ASSISTANT_IA`, `ACHATS_GROUPES_V1`, `ACCES_DEMO`, `DEMO_PUBLIQUE`.
- Budget IA : `BUDGET_IA_JOUR` (2 € par défaut dans le code ; alerte e-mail au-delà), `AI_MONTHLY_BUDGET_EUR`, plafonds de l'assistant.
- Branche de test : `claude/saas-achat-artisans-prompt-1lyihx` (déployée sur test.mobiiz.fr). Aucune production à ce jour.

## Commandes

Depuis `baticlair/` (avant tout : `service postgresql start`) :

- Moteur : `cd packages/domain && pnpm -s build && npx tsc --noEmit && npx vitest run`
- Serveur : `cd apps/api && npx tsc --noEmit && npx eslint src test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_test CI=true npx vitest run`
- Site : `cd apps/web && npx tsc --noEmit && npx eslint src e2e e2e-ag-v1 && pnpm -s build`
- Parcours : `CI=true E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_e2e PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --trace off` (ajouter `-c playwright.ag-v1.config.ts` pour les parcours activés) ; ils tournent sur le site CONSTRUIT.

## Règles de travail

- Expliquer simplement et court ; compte rendu en français simple.
- Pas de refonte du modèle sans retours terrain.
- Aucun champ à remplir à la main dans les documents générés (sauf le bon de commande).
- Tests sans appel à l'API IA réelle ; respecter `BUDGET_IA_JOUR`. Jamais d'e-mail réel à un négoce ou à un artisan, jamais de paiement réel, pendant un test.
- Ne jamais toucher à la production ni à la branche principale sans accord. Aucune suppression de données sans accord. Migrations additives et réversibles.
- On ne pousse sur la branche de test qu'un commit dont toute la chaîne de tests est verte ; on vérifie ensuite que le site et l'API servent ce commit.
- Vérifier la mise en ligne (Greg, 22 novembre 2026) : `https://test.mobiiz.fr/version` (le site) et `https://api-test.mobiiz.fr/version` (l'API) donnent `{ "commit", "environnement" }`, rien d'autre. Après chaque poussée, attendre que LES DEUX donnent le commit poussé (relire toutes les minutes, quelques minutes de construction) avant de dire « c'est en ligne » ; c'est à la discussion de le faire, pas à Greg. Code : `apps/web/src/app/version/route.ts`, `apps/api/src/modules/health/http/version.controller.ts` (le commit vient de `VERCEL_GIT_COMMIT_SHA`).
- Chaque règle changée se dit : « Règle changée : avant → après ».
- Ne jamais afficher une clé ni un secret. Pas de nouvelle dépendance sans accord.
- Mettre ce fichier à jour à chaque décision importante.

## Décisions du 13 novembre 2026

- Capture d'écran des signalements : pas de bibliothèque pour l'instant.
- Mission reste coupée ; les propositions du juriste (`baticlair/docs/groupe/relecture-juridique-missions-2026-11-13.md`) sont à revoir avec un avocat avant la production.
- Studio : aucun outil payant pour l'instant.
- Alertes : `ALERT_EMAIL` = contact@mobiiz.fr.
- Filtre par fabricant (tuiles) : plus tard, après retours terrain.
- Tarifs : Découverte gratuite, plus deux formules payantes (Essentiel, Pro) ; deux mois offerts à l'année.

## Décisions du 14 novembre 2026 (après la recette complète du 13)

- L'artisan n'est jamais obligé de commander : il décide à la réception de l'offre. La FAQ dit comme l'application.
- Négoces gratuits au lancement : plus aucune commission écrite dans les conditions négoces (version 2026-11-14).
- Les montants d'exemple de la page publique restent.
- CGU : une version à jour est préparée pour l'avocat (`baticlair/docs/groupe/CGU-candidate-2026-11-14.md`). Rien n'est publié : la page `/cgu` affiche encore la version du 27/10/2026, avec ses anciens prix.
- Un abonnement en cours refuse un second paiement. Les envois de demandes passent par une file (trois à la fois).
- Mission : un numéro, un e-mail ou une adresse de site écrits dans une annonce, un profil ou une réponse sont masqués pour les autres entreprises.
- Rapport de la recette : `baticlair/docs/recette/recette-complete-2026-11-13.md`.

## Décisions du 14 novembre 2026 (après la recette n° 2, `baticlair/docs/recette/recette-complete-2026-11-14.md`)

- « Commander » est une vraie commande : écran de confirmation, puis le bon de commande part par e-mail au négoce. Jamais « commandé » sans envoi réel (la commande n'est notée qu'une fois le mail parti). « Je retiens ce négoce » n'existe plus.
- Offre d'achat groupé : deux boutons, « Commander à ce prix » (confirmation, bon de commande au fournisseur) et « Non merci ». L'e-mail d'offre part à l'artisan dès que l'offre arrive. Règle changée : avant, aucune commande ni acceptation en achats groupés V1.
- « Tu décides à la réception de l'offre » partout, conditions négoces comprises (à faire relire par l'avocat). Ne pas commander n'exclut plus des achats groupés.
- Un seul compte par SIRET vérifié ; un SIRET qui change n'est plus vérifié. Les comptes déjà vérifiés ne sont pas touchés. `SIRETS_DE_TEST` : SIRET fictifs des jeux de test, jamais en production.
- « Deux fois moins cher » est retiré partout ; « au prix des gros » reste.
- Une demande triée par métier part en plusieurs demandes d'un même lot : chacune a son suivi, ses offres, « Comparer », « Commander ».
- Une ligne écrite sans quantité est orange « Quantité à préciser » et ne part pas chez un négoce.
- Mission : tous les champs libres d'une annonce, d'une réponse et d'un profil sont masqués pour une autre entreprise (pas seulement les grands textes).
- Recette en ligne : de vrais e-mails seulement vers les adresses de Greg.
- Testeurs : ne jamais afficher l'environnement d'un processus (des clés s'y trouvent).

## Décisions du 14 novembre 2026 (soir) : assistant Mobiiz

- L'assistant est branché sur l'IA réelle sur le site de test (`ASSISTANT_IA=on` sur l'environnement de test seulement ; coupé par défaut ailleurs). Son plafond se compte au jour et tous les appels IA du jour respectent `BUDGET_IA_JOUR`. Règle changée : avant, 300 appels et 2 $ cumulés depuis toujours.
- Une question à la fois (avant : trois au plus). Un article flou, incomplet ou inconnu ne rentre pas dans la liste avant sa réponse ; un mot inconnu n'est jamais remplacé par un article qui lui ressemble.
- Interface : une conversation et la barre du bas (« + » pour photo et document, micro) ; plus de gros boutons dans le fil ni de bloc de compteurs ; les analyses restantes se disent seulement dans la fenêtre « Analyser ce document ? ».
- Les étapes du travail se voient en direct (« Réflexion… », « Lecture… », « Vérification des quantités… », « Terminé ») et se déplient. Ce sont les vraies étapes du serveur. La réponse s'affiche au fil de l'eau, mais seulement après la relecture par le code : rien du modèle n'est montré avant.
- La conversation suit le thème de l'app : fond blanc en mode jour. Avant : noir dans les deux thèmes.
- Offre d'achat groupé : l'e-mail du fournisseur est obligatoire au dépôt ; sans lui, l'offre reste en vérification.
- `SIRETS_DE_TEST` est posé sur l'environnement de test (le SIRET partagé par les comptes de test).

## Décisions du 14 novembre 2026 (soir) : espace admin

- L'espace admin s'ouvre sur `/admin` : six cartes (inscrits, abonnés payants, en Gratuit, revenus du mois, inscriptions de la semaine, négoces inscrits) avec leur tendance, chacune mène à sa liste ; un bandeau rouge seulement s'il y a un problème. L'ancien tableau de bord reste (`/admin/pilotage`).
- Listes artisans et négoces (une recherche, quelques filtres), fiche sur une page. Lecture seule. L'admin ne voit jamais le contenu d'un chantier ; chaque liste, fiche ou question consultée est au journal de l'admin (purgé à 1 an).
- « Pose ta question » : le code calcule des chiffres d'ensemble, seuls eux et la question partent au modèle ; éteint ou au-delà du budget, le code répond seul. Ne jamais y écrire le nom d'une personne.
- Adresse d'alerte : réglée dans l'admin (Réglages), double validation, appliquée sans redéploiement. Règle changée : avant, la variable fixe `ALERT_EMAIL` (elle ne sert plus que de repli). Les alertes, les signalements et les e-mails reçus sur contact@ y partent.
- Alertes par e-mail : bug signalé, erreur serveur, paiement refusé, négoce en attente de vérification ; regroupées par sorte (une toutes les dix minutes au plus).
- Code promo « FONDATEUR » (Stripe test seulement) : 6 mois offerts, puis 30 % de remise à vie posée par le serveur. Rien n'est créé en production sans l'accord de Greg.
- La réponse d'un négoce reçue sur l'adresse Mobiiz est copiée (message et nom des pièces jointes) dans l'e-mail envoyé à la vraie adresse de l'artisan. Avant : seulement « X t'a répondu » et un lien.
- Politique de confidentialité passée en version du 14/11/2026 (relue par l'agent juriste, à valider par l'avocat). À décider par Greg : la boîte qui reçoit les alertes (une boîte personnelle gratuite est un destinataire de données), la durée des signalements.

## Décisions du 15 novembre 2026 (lot UX mobile)

- Un négoce reçoit un seul e-mail : la demande de prix, avec le lien pour créer son accès. Règle changée : avant, deux e-mails.
- Signalements : gardés 12 mois, puis supprimés tout seuls. Taux de réponse des négoces : visible seulement dans l'admin.
- L'onglet Quantitatifs ouvre deux choix : « Créer un quantitatif » et « Suivre mes demandes » (le suivi : `/chantiers?vue=suivi`, avec négoces, réponses, recherche et filtres). Règle changée : avant, la liste directement.
- L'accueil est un tableau de bord : « À faire maintenant », « Achats groupés qui peuvent t'intéresser », « Missions près de toi » (si Mission est active), « Activité récente ». Trois cartes au plus par section, aucune section vide, aucune donnée inventée, aucun nom d'une autre entreprise. Règle changée : avant, trois grandes cartes.
- Achats groupés : « Publier un besoin », bouton flottant au-dessus du menu sur téléphone, bouton d'en-tête sur ordinateur ; deux chemins (« Choisir dans un quantitatif », « Saisir un nouveau besoin »). (Règle changée le 16 novembre : un article déjà envoyé aux négoces se groupe après confirmation, voir plus bas.)
- Missions : recherche, trois filtres (Missions, Entreprises, Mes annonces), deux actions compactes, puis « Près de toi ».
- Les neuf testeurs restent en local. Le paiement du code FONDATEUR se teste juste avant le lancement. L'assistant reste allumé sur le site de test.
- Le jaune du code est #FED206 : gardé (tranché le 16 novembre 2026).

## Décisions du 16 novembre 2026

- Jaune : #FED206, celui du code. Négoce invité seulement avec sa première demande de prix : plus d'e-mail « créez votre accès » depuis « Mes négoces ».
- Mission : l'application affiche « Bientôt » avec le principe ; fonctions désactivées ; un interrupteur dans l'admin (Réglages) les ouvre d'un clic, sans redéploiement. `MISSIONS_V1` ne sert plus que de valeur par défaut tant que l'admin n'a rien choisi.
- Un seul outil de saisie : « Saisir un nouveau besoin » (achats groupés) ouvre l'écran « Nouveau quantitatif » (« Je saisis ma liste » ou « Mobiiz m'aide »), puis l'écran où l'on coche les lignes à grouper. Règle changée : avant, une conversation propre aux achats groupés.
- Article déjà envoyé aux négoces : cochable en achat groupé après « Déjà envoyé à tes négoces. Tu veux quand même le mettre en achat groupé ? » (Oui / Non). Il reste dans sa demande individuelle. Règle changée : avant, jamais.
- Commander chez un négoce : l'artisan choisit une date de livraison souhaitée ; le négoce retenu lit « C'est OK pour moi, livraison souhaitée le [date], on s'appelle pour caler les détails. » Juste après : « Prévenir les autres négoces consultés ? Oui / Non » ; « Oui » envoie un e-mail poli, jamais le prix ni le nom du négoce retenu (un négoce qui n'avait pas répondu lit que la demande est close).
- Rappel de suivi : 7 jours après les réponses à une demande directe, sans commande dans Mobiiz, « Où en es-tu avec cette demande ? », un seul bouton « C'est réglé » ; sans clic, la demande reste dans « À faire maintenant ». Pas de fil de discussion artisan-négoce pour une demande individuelle : ils s'appellent. L'offre d'un achat groupé, elle, passe obligatoirement par Mobiiz.
- Ordre des anciennes demandes : gênants côté demandes, gênants côté abonnement, lot B, lot D. Le reste attend l'après-lancement.
- Lot B : le chiffrement des fichiers est branché (`platform/database/prisma.service.ts`), éteint tant que `CHIFFREMENT_CLE` n'est pas posée par Greg dans Vercel ; fichiers déjà là : `scripts/fichiers-chiffrement.ts`. Dépôt limité à 10 Mo (avant : 20). Alerte quand la base dépasse 70 % de `BASE_TAILLE_MAX_MO` (512 Mo).

## Décisions du 16 novembre 2026 (après le test de Greg)

- Questions après la lecture d'un devis : UN SEUL ÉCRAN, la discussion Mobiiz. Une question à la fois dans une bulle, ses boutons dessous ; on touche un bouton OU on répond au clavier ou à la voix. La réponse s'affiche comme un message, la question suivante arrive ; « Calculer ma liste » est proposé dans le fil. Règle changée : avant, une conversation en haut et les mêmes questions en cartes dessous, « réponds avec les numéros ».
- Les réponses brèves et plusieurs réponses d'un coup sont comprises par le sens et par l'ordre (« J'achète tout fait, 0,65, 1, chevron, ou je pli, bord de mer »). Mobiiz confirme en une ligne et ne repose que ce qui manque. Rien n'est inventé.
- « Je ne sais pas » remplace la poubelle des cartes (sauf pour le façonnage, obligatoire). Toucher une de ses réponses la rouvre.
- Mots simples : « Ton chantier est où ? » (« Bord de mer », « Intérieur des terres », « Montagne », « Entre les deux »), jamais « Zone climatique ». Seuls les mots changent, pas le calcul.
- FONDATEUR sur le Pro au mois seulement, date de besoin à 7 jours, essence du liteau facultative : confirmés par Greg.
- Tarifs : « Y a-t-il une limite d'analyses ? » (plus le mot « illimitées »).
- Achats groupés, visibilité (RÈGLE CHANGÉE par Greg) : les noms des entreprises sont visibles, jamais la quantité de chacune, seulement le total ; chaque artisan peut cocher « rester anonyme » ; à moins de 3 entreprises, « en cours de regroupement » à la place du volume. Avant : jamais de nom, volumes dès la première publication.

- Les besoins déjà publiés avant ce changement restent anonymes ; seuls les nouveaux montrent le nom de l'entreprise. « +N depuis ta publication » ne dit une quantité qu'à partir de deux nouvelles entreprises.
- Peinture en achat groupé : deux produits, « Peinture murs et plafonds » et « Peinture façade », tirés du catalogue, sans marque. Comptés en litres ; le pot de 15 L est proposé, l'artisan le confirme. Seuil « recommandé » posé à 150 L : à valider par Greg.

## Décisions du 16 novembre 2026 (soir) : « Mon site » et « Entre pros »

- Rendu du site d'artisan validé par Greg. Onglet « Mon site » dans la navigation principale (5e onglet) ; on dit « Mon site » partout dans l'app. Règle changée : avant, Profil › Ma page (entrée retirée, ancienne adresse redirigée).
- Une page, deux niveaux. Règle changée : avant, la disponibilité Mission était sur la page publique. Maintenant un visiteur ne voit que le site ; une entreprise connectée voit en plus « Entre pros » (disponibilités, compétences, « Proposer une mission »). Dans Mission, le profil d'une entreprise ouvre son site.
- CV, diplômes, attestations : ni affichés ni obligatoires ; envoyés seulement par l'artisan dans une discussion de Mission. Règle changée : avant, un document coché « sur mon profil public » s'y montrait.
- Mission sur le site de test : à ouvrir par Greg dans Admin › Réglages › Missions ; reste coupée en production tant que les CGU ne sont pas relues.
- Site d'artisan d'après la maquette de Greg (17 novembre 2026) : barre du haut noire (nom, métier, menu, « Demander un devis » jaune), accueil sombre sur la photo (« Couvreur » en blanc, « à Lannion » en jaune, l'accroche, « Demander un devis » et le numéro), prestations en cartes avec une icône jaune choisie par le code d'après le titre, trois chantiers puis « Voir plus de réalisations », bande noire (zone, horaires), pied de page « Créé avec MOBIIZ ». Règle changée : avant, page claire de bout en bout, sans pictogramme. Pas d'« Avis clients » : la règle « ni avis, ni note » reste. Validé par Greg le 17 novembre 2026 (« Top ») et poussé sur la branche de test.
- Retour de Greg sur « Mon site » (17 novembre 2026) : « Voir mon site » flottant ; le site en plein écran défile, avec « Retour » ; la vraie page ouverte depuis l'app a « Retour à Mon site ». Règle changée : avant, quatre teintes sombres proches → neuf teintes bien différentes (ardoise, anthracite, bleu nuit, vert sapin, bleu roi, pétrole, bordeaux, rouge brique, prune), qui colorent la barre, l'accueil, la bande et le contact. Une ville en capitales s'écrit « Ploubazlanec ». Rendu plus soigné (cartes, pastilles d'icônes, photos arrondies).
- Modèle pro de Greg (17 novembre 2026, deux maquettes) : barre blanche, grande photo avec bord arrondi, nom en capitales espacées, bandeau de garanties, petites cartes de prestations, carte « À propos », barre de confiance (zone, horaires, certifications), quatre chantiers sur une ligne. Règle changée : avant, boutons toujours jaunes → « Couleur des boutons » au choix (jaune Mobiiz par défaut, neuf couleurs ; texte noir ou blanc choisi par le code). Pas d'« Avis » ni de textes inventés (« Devis gratuit », « Travaux garantis ») : seulement ce que l'artisan écrit ou déclare.

## Décisions du 17 novembre 2026 (soir) : « Mon site », trois chantiers de Greg

- Photos : sur le site de test, le stockage Vercel Blob n'existe pas encore (`stockagePhotos` faux, envoi refusé « stockage_coupe »). L'éditeur le dit clairement, plus d'échec muet ; le logo, lui, passe par le profil et marche. Pas-à-pas Blob donné à Greg (projet baticlair-api : `BLOB_READ_WRITE_TOKEN` ; projet baticlair : `PHOTOS_BLOB_URL`).
- « Demander un devis » : le message part aussi dans « Messages et réponses » (filtre « Mon site », table `message_site`, 12 mois puis supprimé) et l'e-mail renvoie vers lui. Règle changée : avant, Mobiiz ne gardait que la trace anti-abus. Un e-mail en panne ne perd plus la demande. L'aperçu dit « rien ne part ». « Devis gratuit » retiré (texte inventé). Politique de confidentialité : version du 17/11/2026.
- Photos par défaut : une vraie photo libre de droits par métier, une neutre pour plusieurs métiers, galerie au choix (`photo_defaut`). Règle changée : avant, sans couverture, la première photo des chantiers ouvrait le site. Crédit en pied de page quand la licence l'exige. 25 photos de Wikimedia Commons (`baticlair/docs/photos-par-defaut.md`), aucune générée par IA (pas d'outil branché) ; chauffage-ventilation prend la neutre (marques partout), l'agenceur prend la menuiserie.
- Éditeur « style Lovable » : ordinateur, sept onglets à gauche (Couleurs, Photos, Prestations, Chantiers, À propos, Contact, Publier) et le site en grand à droite ; téléphone, le site toujours visible en haut, les onglets en bas ouvrent un tiroir. Règle changée : avant, une longue colonne de cartes et un bouton flottant.
- Page publique sur téléphone : nom et métier en entier, « Appeler » en rond, une carte de prestation par ligne, icônes d'une seule couleur, zone écrite « Ploubazlanec » (`zoneLisible`), première phrase de la présentation dans la carte et la suite dans « À propos » (`decouperPresentation`), plus de texte coupé par « … ». Barre du bas de l'app : un libellé par ligne.

## Mission de fond : le quantitatif par l'IA (Greg, 16 novembre 2026)

- La solution retenue tient en une page : `baticlair/docs/quantitatif-ia.md`. Les mesures : `baticlair/docs/quantitatif-ia-mesures.md`.
- Cinq étapes : comprendre (IA, schéma strict), rapprocher du catalogue (code), questions (règles du catalogue et du référentiel, par le code), lire les réponses (code, puis IA), calculer (code, règles écrites). L'IA n'invente ni article, ni quantité, ni caractéristique, et ne formule pas les questions.
- Prompts versionnés : `baticlair/packages/domain/src/ia/prompts/` (socle commun, puis couverture, zinguerie, peinture).
- Modèles : Haiku 5.5 pour lire les réponses (avant : Haiku 4.5, dont chaque appel échouait). Le choix se fait sur les chiffres du jeu de test.
- Jeu de test rejouable : `baticlair/apps/web/scripts/jeu-quantitatif.mjs` (site de test seulement). À rejouer à chaque changement de prompt ou de modèle.
- Écran : une seule discussion. Les étapes (« Lecture… », « Vérification des quantités… ») remplacent l'animation plein écran. Règle changée : avant, le devis au surligneur et les fournitures qui en sortaient. Bandeau « Ma liste · N articles », récapitulatif, puis « Voir ma liste ». L'assistant de la liste ne s'ouvre plus tout seul après un devis.
- Règle changée : dès que tout est répondu, les réponses partent au serveur et les dernières questions du calcul arrivent dans le fil, avant « Calculer ma liste » (avant : après, avec un refus). Une réponse reste modifiable jusqu'au calcul.
- Plusieurs réponses d'un coup : un nombre sans unité n'est jamais pris pour une question à boutons dont il n'est aucun bouton ; elle est reposée, seule.
- Règle changée (Greg, 16 novembre soir) : une réponse qui correspond à un bouton est prise (« 1 » → 1 descente), l'ordre aide ; une question n'est reposée, avec ses boutons, que s'il y a un vrai doute. Ce que le code a rangé sur un bouton passe avant la lecture du modèle.
- Règle changée : dans la lecture d'un devis, une question = un seul sujet, jamais deux (prompt `lecture_devis` version 6). Avant : une seule question par article, qui nommait toutes ses données. Seule exception gardée : « modèle et teinte » d'un élément à remplacer à l'identique.
- `BUDGET_IA_JOUR` = 10 € sur le site de test pendant cette mission (variable de la branche de test ; 2 € par défaut ailleurs).
- Analyses offertes : 50 sur le site de test pendant cette mission (`LECTURES_IA_GRATUIT_TOTAL`, variable de la branche de test, choisi par Greg le 16 novembre soir) ; 3 partout ailleurs, et l'écran dit toujours « 3 ».
- Une question du modèle écrite sous une clé à lui (« faconnage_rive ») est la donnée du référentiel quand la ligne visée n'a qu'un ouvrage qui la porte : elle n'est plus posée deux fois.
- Règle changée (site de test seulement, pendant cette mission) : la lecture d'un devis se fait avec Sonnet 5.5, effort moyen (`AI_EXTRACTION_MODEL`, `AI_EXTRACTION_EFFORT`, variables de la branche de test). Avant : Opus 5.5, effort haut, qui reste la valeur par défaut du code. Sur le devis zinc : 34 s au lieu de 72, 0,13 $ au lieu de 0,33 $, même liste. À trancher pour de bon sur les vrais devis de Greg.
- Le cœur s'adapte à n'importe quel métier (Greg, 17 novembre 2026) : les mots que l'artisan dit pour un bouton (« je plie », « tout fait ») sont écrits sur le bouton, dans la fiche du métier (`dit`), jamais dans le lecteur des réponses, commun à tous. Avant : les mots du façonnage étaient dans le code commun. Couvreur : s'il plie, des feuilles de zinc ; sinon des longueurs toutes prêtes (test `mots-dits-par-metier.test.ts`). Deux boutons dits dans la même réponse : la question est reposée.
- Règle changée (Greg, 17 novembre 2026, §48.6) : le pliage se demande UNE fois pour tout le devis (« Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ? »), plus jamais pièce par pièce. S'il plie : des feuilles 2 × 1 m, comptées d'après les développés et les longueurs ; tout fait : des longueurs de pièces façonnées ; gouttières, descentes, naissances et crochets : articles normaux dans les deux cas. Il change ce choix pour une pièce dans le récapitulatif. Les bacs d'un joint debout gardent leur question. Dans la fiche : `groupe` sur la donnée (le moteur ne connaît aucun groupe). Test `pliage-une-reponse-pour-le-devis.test.ts`. À reporter par Greg dans son référentiel (§48.6, §49.4).
- Tuile à remplacer : une seule question, « Quelle tuile ? » (modèle et teinte ensemble), prompt `lecture_devis` version 7.
- Six réponses sur six (Greg, 17 novembre 2026) : une donnée déjà connue (l'habitude dite dans le fil) ou que le devis ne demande pas (la pose des crochets) est confirmée, ou changée, quand l'artisan la dit ; jamais posée ni reposée. Test `six-reponses-sur-six.test.ts`.
- Sécurité : Next 16.4.6 (faille GHSA-mfr8-8qww-v76h de 16.4.2), accord de Greg du 17 novembre 2026.
- Vitesse de lecture (mesures du 17 novembre 2026, `baticlair/docs/quantitatif-ia-mesures.md`, passe 6) : le temps est celui des mots que le modèle écrit ; Haiku 5.5 est plus lent ici que Sonnet 5.5 (il réfléchit plus). L'écran regarde chaque seconde (avant : 3). Deux réglages éteints par défaut : `AI_EXTRACTION_REFLEXION=minimale` (écrire sans réfléchir d'abord) et `LECTURE_ET_REPERAGE_ENSEMBLE=on` (la lecture part avec le repérage ; une lecture de plus quand le devis est d'un autre métier). Sous 10 secondes : il faudra couper la lecture en deux appels simultanés, à juger sur les vrais devis de Greg.
- Une question de façonnage du modèle sans ligne visée devient les questions du calcul (les bacs, les pièces pliées) : jamais la clé commune, qui vaudrait pour tout.
- Chaque ligne dit son origine quand la liste mêle les deux : « Dit par toi », « Calculé », « À vérifier ».
- Admin › « Corrections les plus fréquentes » : la ligne proposée et la ligne corrigée, sur 90 jours, sans nom d'entreprise ni de chantier.

## Décisions du 18 novembre 2026 : stockage des photos, fiche Google, engagements

- Stockage Vercel Blob « mobiiz-photos-test » (Paris, offre Hobby gratuite) créé et relié au projet baticlair-api en Preview ; `PHOTOS_BLOB_URL` posée sur le site (Preview). Envoi de photos testé en ligne (couverture et chantiers). Rien en production.
- « Mon site » : champ « Lien de ma fiche Google » (seulement une adresse Google : google.com, g.page, maps.app.goo.gl…) qui affiche « Voir nos avis Google ». Toujours ni avis ni note dans Mobiiz.
- Règle changée : « Devis gratuit » était retiré comme texte inventé → l'artisan coche lui-même « Devis gratuit », « Déplacement gratuit », « Intervention rapide » ; seules les cases cochées s'affichent dans le bandeau de garanties.
- La page publique de l'API n'est plus gardée en cache (avant : 60 secondes) : un site modifié se voit tout de suite.
- « Messages et réponses » n'allume plus l'onglet Missions tant que Mission est « Bientôt ».
- Éditeur « Mon site » sur téléphone (Greg, 18 novembre 2026). Règle changée : avant, le site en haut et une barre d'onglets flottante en bas, qui cachait les couleurs → une colonne d'onglets collée à gauche (en L avec le menu de l'app), le téléphone en entier à droite, réduit pour tenir, qui défile ; un onglet ouvre un tiroir sous lui (la moitié de l'écran au plus, « Fermer ») et le téléphone, à taille lisible, montre la partie réglée. Ordinateur inchangé.
- Aperçu « Ordinateur » de « Mon site » : réduit par `zoom` au lieu de `transform: scale` (sur iPhone, il restait blanc un long moment).
- Barre « Appeler » du site sur téléphone (Greg, 18 novembre 2026). Règle changée : avant, `position: fixed`, qui flottait au milieu de l'aperçu, et le rond « Appeler » de la barre du haut restait dans l'accueil (trois boutons d'appel) → collée en bas du cadre qui défile (l'écran, ou le téléphone de l'aperçu), visible seulement une fois l'accueil passé ; sur téléphone, plus de rond dans la barre du haut : l'accueil a « Demander un devis » et le numéro, puis la barre du bas.
- Navigation (Greg, 18 novembre 2026). Règle changée : avant, « Mon site » était le 5e onglet de la barre du bas → sur téléphone, la barre revient à 4 onglets (Accueil, Quantitatifs, Achats groupés, Missions) et « Mon site » est le globe de l'en-tête, à gauche du jour/nuit, sur tous les écrans ; sur ordinateur, « Mon site » reste dans la colonne de gauche.
- Petit aperçu de l'éditeur sur téléphone : réduit par `zoom`, plus par `transform` (Safari laissait la barre « Appeler » figée au milieu du cadre).
- NAVIGATION DÉFINITIVE DU TÉLÉPHONE (Greg, 18 novembre 2026, figée jusqu'aux retours de vrais artisans). Règle changée : avant, Accueil · Quantitatifs · Achats groupés · Missions → Accueil · Demandes · ＋ · Groupés · Messages. Le ＋ (rond jaune surélevé, qui tourne en croix) ouvre « Créer » : Nouveau quantitatif, Besoin groupé, Mission (grisée « Bientôt » si Mission est coupée) ; fermée par la croix, le voile, Échap ou le retour. Demandes (`/demandes`) : Négoces (états en filtres secondaires) et Groupées (`?type=groupees`, mes besoins publiés ou rejoints). Groupés (`/achats-groupes`) : les regroupements ouverts de mon département, la clôture la plus proche d'abord, recherche par matériau, filtre métier, une phrase et UN bouton « Rejoindre » ou « Voir » par carte ; plus de « Mes besoins » ni de bouton flottant « Publier un besoin » sur téléphone. Messages : tous les messages (négoces, Missions, site, Mobiiz), pastille des non-lus. En-tête inchangé (globe, jour/nuit, cloche, profil). Ordinateur : la colonne ne change pas. Anciens liens gardés (`/chantiers?vue=suivi`, `/achats-groupes/mes-besoins`, `/chantiers`).
- Recette du testeur-artisan (18 novembre 2026), corrigé : sous 3 entreprises, l'alerte « Une entreprise vient de rejoindre ton besoin » ne dit plus de volume (bloquant : on déduisait la quantité de l'autre) ; rejoindre propose l'unité du total (les pièces), plus la palette d'office ; une réponse de négoce est lue quand on ouvre la demande ou qu'on commande ; « Négoce retenu » devient « Commandé », « retiens le négoce » devient « choisis chez qui commander » ; « Continuer · N matériaux » sur le chemin « Besoin groupé » ; l'aperçu de l'éditeur redéfile jusqu'à la partie réglée ; marge de défilement au-dessus de la barre du bas.
- Un regroupement se rejoint dans son département : le filtre « rayon » n'est pas proposé (on ne pourrait pas rejoindre un achat d'un autre département) ; l'écran dit le secteur et comment le changer.
- Alertes (Greg, 18 novembre 2026). Règles changées : la réponse d'un négoce par le lien de chiffrage arrive aussi dans la cloche (avant : e-mail seul) et son e-mail suit les réglages ; une demande reçue sur « Mon site » a sa rubrique de réglages « Mon site » (colonne `site` de `reglage_alertes`), arrive dans la cloche et son e-mail suit les réglages (avant : toujours envoyé) ; un regroupement prévient dans la cloche à chaque étape (reconfirmer, clos, offre reçue, commande envoyée, annulé ; avant : seulement « une entreprise a rejoint » et « plus que 3 jours ») et ses e-mails suivent la rubrique « Achats groupés » et le réglage des e-mails ; un regroupement annulé est dit à chaque participant (avant : à personne).
- Logo du site : seulement celui que l'entreprise a envoyé dans son profil ; sinon ses initiales. Le code n'a aucun logo Mobiiz de repli (vérifié par un test).

## Décisions du 19 novembre 2026 : après validation de la navigation (figée ensuite)

- Fiche d'une demande (`/chantiers/<id>`) : la barre du bas reste visible, en plus de « Retour ». Règle changée : avant, elle s'y cachait. Les boutons collés en bas (« Aperçu », « Envoyer ») se posent au-dessus d'elle ; la discussion des questions et la lecture restent en plein écran, par-dessus. Elle se cache toujours quand le clavier est ouvert.
- Onglet « Offres » : « Commander » sur chaque offre (`Commander chez <négoce>`). Il ouvre la MÊME confirmation que « Voir le devis reçu » (négoce, total, date de livraison souhaitée, « Confirmer la commande » / « Annuler »), puis le parcours habituel : bon de commande au négoce, « Prévenir les autres négoces consultés ? ». « Annuler » ramène à Offres. Une commande par demande : ensuite, plus de bouton.
- Une liste créée par le chemin « Besoin groupé » porte `project.origine = "achat-groupe"` (migration additive `20261119090000_project_origine`). Tant qu'elle n'est pas partie chez un négoce : jamais dans « À faire : Vérifier ta liste », ni dans Demandes › Négoces, ni dans « Depuis un quantitatif » ; pas encore publiée, elle se reprend dans Demandes › Groupées (« Listes à finir »). Règle changée : avant, elle apparaissait aussi dans « À faire » et dans les listes ordinaires. Test `apps/api/test/liste-du-besoin-groupe.test.ts`.
- Textes : « Négoce · classée » → « Classée » (et « À classer ») ; « Prix saisis en ligne » → « Prix donnés par le négoce » ; titres de liste au mois abrégé à l'écran (« Liste du 18 nov. », le nom enregistré ne change pas), coupés à la fin d'un mot avec « … » (`lib/titres.ts`), jamais en plein mot.

## Décisions du 19 novembre 2026 : « Mon site », revue UI/UX, développeur senior et saboteur

- Aucune faille trouvée par le saboteur. Corrigé : un changement raté de l'éditeur n'est plus perdu (relancé tout seul, le champ refusé garde son erreur) ; les limites du formulaire de devis (5 par heure et par visiteur, 30 par jour et par page) et des 20 photos tiennent même quand tout arrive au même instant ; une demande de devis est gardée même sans adresse où l'envoyer ; une photo bloquée en traitement passe en erreur au ménage ; une photo ne se retire pas quand le stockage est coupé.
- Règle changée : les textes proposés par Mobiiz (prestations, accroches, présentations) ne promettent plus rien (« nous intervenons rapidement », « devis clair, chantier propre », « nettoyage compris », « aux normes ») ; avant, une promesse pouvait s'afficher sans que l'artisan l'ait cochée. Les sites déjà créés gardent leurs textes. Test `packages/domain/test/mon-site-revue-19-novembre.test.ts`.
- Règle changée : « Entre pros » se lit seulement par une entreprise au SIRET vérifié (avant : tout compte connecté), n'apparaît pas quand l'artisan n'a rien publié, et vient après les prestations ; plus de bouton « Publier une mission » dans ce bloc.
- Lien Google : plus de lien de redirection (`/url?q=`) ni de « goo.gl » (seulement « maps.app.goo.gl »). Masquage Mission : « O6 12… » (lettre O) et les e-mails en « (at) », « [at] », « arobase » sont masqués.
- Site public : garanties sur 3 colonnes au plus sur téléphone ; la zone telle qu'écrite (plus de « et alentours » ajouté dans la barre de confiance) ; une assurance est « Assurance déclarée » ; pas de redite entre bandeau et barre ; liens de 44 px ; une adresse en majuscules redirige ; « Retour à Mon site » sort du lien aussitôt lu ; logo et image de partage gardés 5 minutes en cache (avant : un jour).
- Éditeur sur téléphone : l'aperçu garde au moins 38 % de la hauteur quand un réglage est ouvert, sans sa barre « Appeler » ; onglets plus lisibles, « Voir mon site » à 44 px, aides en 14 px. En sombre, la couleur choisie se lit.
- Réponses de Greg (19 novembre 2026). Règle changée : l'éditeur « Mon site » prend la disposition de l'ordinateur dès la tablette (768 px), sur toute la largeur de l'écran ; avant, la tablette gardait celle du téléphone. Règle changée : l'adresse du site d'une entreprise supprimée n'est jamais redonnée (table `adresse_page_reservee`, remplie par un déclencheur avant la suppression d'une entreprise, migration `20261119210000_adresse_page_reservee`) ; avant, une autre entreprise pouvait la reprendre. Demandes : titre de liste au mois abrégé (« Liste du 19 nov. »).
- Règle changée (feu vert de Greg, 20 novembre 2026) : le gris des textes de l'app passe de #614822 (brun) à #4F4B45 (gris neutre, même contraste AA), dans `globals.css`, les écrans d'erreur et de chargement. Puis (Greg, 20 novembre 2026) la page d'accueil publique (`landing.css`), les e-mails (`mail-html.ts`) et les dessins : plus aucun #614822 dans le code.

## Décisions du 17 novembre 2026 (soir) : « droit au but », après le test du chantier ardoise de Greg

- Principe (tous métiers) : le négoce reçoit une commande claire, rien d'autre. L'usage des articles, le détail par pièce et les calculs restent dans l'app.
- Règle changée : une seule ligne par article identique, avec le total (toutes les feuilles de zinc réunies ; comptées pièce par pièce, puis additionnées). Avant : une ligne par ouvrage, avec son usage.
- Document envoyé : jamais de « ? », d'hypothèse, de note pour l'artisan ni de « au choix du fournisseur ». Une ligne sans quantité n'est pas dans le tableau : elle est dans « À préciser », qui n'existe que s'il n'est pas vide.
- Les mots de l'artisan ne sont pas transformés (« mortier de ciment » reste « mortier de ciment »). Une équivalence se demande.
- Unité de vente identique dans l'app et le PDF (« 2 tubes de 3 m ») ; plus de « (10 ml à couvrir) » ni de doublon « Ø 80 (Ø80) ».
- Le PDF reflète exactement la liste de l'app : test permanent `apps/api/test/commande-claire-negoce.test.ts` (le chantier de Greg, lecture réelle enregistrée, repère « JEU-D2026-020 »).
- PDF allégé : en-tête, deux lignes de description au plus, le tableau, « À préciser » si besoin, le bloc de réponse (adresse Mobiiz du chantier et texte de Greg du 31 octobre). Plus de section « Informations complémentaires ». Logo de l'entreprise ou ses initiales. Règle changée : jamais l'e-mail personnel de l'artisan (avant : il servait de repli pour l'adresse de réponse et figurait dans l'en-tête).
- E-mail au négoce : court et neutre, « Bonjour, » sans prénom, le chantier et le nombre d'articles, comment répondre, le portable, la signature. Règle changée : plus de ligne « créer votre accès » dans l'e-mail (elle reste sur la page de chiffrage, après la réponse), plus de pied « envoyé avec Mobiiz ».
- Ardoises : le pureau ne se demande jamais (`neverAsk`). Format de l'ardoise et taille des crochets → pureau, ardoises au m², crochets, liteaux. Tableau à valider par Greg : `baticlair/docs/tableau-ardoises.md` (généré par le code).
- Feuilles de zinc : règle validée par Greg pour démarrer (feuille de 2 × 1 m, chutes non réutilisées). C'est une estimation : le nombre de feuilles doit s'ajuster d'un toucher dans la liste (à faire).
- Vitesse : pas de découpage en trois pour l'instant, la qualité passe avant. À la place : les lignes affichées une par une pendant la lecture, et les gains sans risque au début et à la fin (à faire).
- Lecture d'un devis : le nom d'une fourniture ne dit que les mots du devis (jamais une alternative, une matière ou une dimension qu'il ne donne pas), prompt `lecture_devis` version 8.
- Étape « Suggestions » (18 novembre 2026) : après la lecture et avant les questions, une carte à cases dans la discussion (« Suggestions. Coche ce qu'il te faut, on l'ajoute à ta liste. », un bouton « Continuer »). Les propositions viennent de la fiche du métier (`suggested` sur un emplacement), jamais de l'IA ; cinq au plus ; aucune = pas d'étape. Coché : l'article vaut un article écrit, ses questions se posent ensuite. Règle changée : avant, aucune suggestion, et la naissance d'une gouttière ajoutée d'office. Couverture : naissances, crochets, talons et angles de gouttière. Réponse `suggestions:choisies` ; test `packages/domain/test/etape-suggestions.test.ts`.
- Réponses de Greg du 18 novembre 2026 : les consommables (silicone, vis, pattes…) sont des cases de « Suggestions » : plus jamais ajoutés d'office, plus de question oui / non, plus d'habitude (un « oui » déjà donné sur un ancien chantier reste). Talons et angles : une case avec « si tu ne les fabriques pas ». La carte s'affiche dès qu'il y a une suggestion, même sans question. Cinq cases au plus, articles de la fiche d'abord, consommables ensuite.
- Plus jamais « développé ? » dans une ligne. Pour des feuilles de zinc, le développé ne se demande toujours pas (Greg, 10 octobre : « on veut juste un nombre de feuilles ») ; pour une pièce commandée toute faite, il se demande avec ses boutons.
- Tubes de descente dans leur unité de vente (« 2 tubes de 4 m », « 2 tubes de 3 m » quand le devis le dit), accords justes (« 1 descente »).
- Deux lectures lancées au même instant aboutissent toutes les deux (avant : la seconde lisait « Un problème est survenu »). Test `apps/api/test/deux-lectures-en-meme-temps.test.ts`.
- Rythme de test (Greg) : sur les petites corrections, seulement les tests concernés, groupés ; la chaîne complète une fois par lot, juste avant de pousser.
- Lignes une par une pendant la lecture (18 novembre 2026) : sous « Lecture… », « Lignes déjà lues » se remplit au fil de l'eau. Seuls les mots retrouvés dans le texte du devis s'affichent ; une photo ou un scan ne montre que le compte (« N lignes lues »). Règle gardée : rien du modèle n'est montré tel quel. Limite : le modèle écrit ses lignes après la fiche et les questions, elles arrivent donc vers le milieu de la lecture ; changer cet ordre est un changement de prompt, à mesurer. Test `apps/api/test/lignes-une-par-une.test.ts`.
- Règle changée (Greg, 17 novembre 2026) : l'e-mail d'un achat groupé au négoce est le même e-mail court que pour un chantier, avec « C'est une demande groupée : plusieurs artisans du secteur achètent ensemble. » ; la liste est dans le PDF joint, plus dans le texte. Avant : un long e-mail avec les lignes, « D'autres négoces du secteur sont consultés » et « la commande se fera sans vous ».
- Coût et temps d'une analyse : `baticlair/docs/quantitatif-ia-mesures.md`, passe 9 (petit devis ≈ 25 s et 0,14 $, moyen ≈ 55 s et 0,26 $ ; le gros est à rejouer sur un vrai devis).
- Réponses envoyées d'un coup (recette en ligne du 18 novembre 2026) : une donnée connue de la fiche du métier dont la question n'est pas, ou plus, ouverte est prise avec l'unité de sa fiche ; avant, le serveur la refusait « sans unité » et l'écran reposait la même question sans fin. Test `apps/api/test/reponses-d-un-coup.test.ts`.
- Suivi d'une lecture ou d'un calcul (recette en ligne du 18 novembre 2026) : l'écran regarde l'état chaque seconde sans jamais annuler la demande précédente (`refresh` de `use-resource.ts`). Avant : il l'annulait, et dès que le serveur mettait plus d'une seconde à répondre, l'écran restait sur « Lecture… » sans fin. Parcours permanent « un serveur lent… ».
- Feuilles de zinc (18 novembre 2026) : « − / + » directement sur la ligne fermée, pour toute quantité que la fiche du métier marque comme une estimation (`estimation` envoyé à l'écran). Avant : il fallait ouvrir la ligne.
- Recette en ligne : le devis de démonstration du chantier ardoise doit garder la colonne d'unité et les descriptions du vrai devis ; sans elles, la lecture est plus pauvre (pièces pliées en double, descente en « 6 m »). À traiter : un devis sans unité doit poser la question « mètres ou pièces ? ».
- Fait : lignes une par une, feuilles ajustables, coût et temps (passe 9), phrase « demande groupée ». Reste, dans l'ordre de Greg : la fiche Peinture au niveau de la Couverture.

## Décisions du 18 novembre 2026 (soir) : « l'analyse doit être complète », après le devis D-2026-024 de Greg (zinc à tasseaux)

- Greg : « Tu dois TOUT connaître sur la couverture ! C'est TOI le pro capable de faire les quantitatifs. » Pour la technique, chercher chez les fabricants et dans les règles de pose (et citer la source) au lieu de lui demander ; ne lui demander que ses habitudes, ou une règle introuvable.
- Greg : ne pas tenir compte de ses essais d'avant le 18 novembre au soir (faits vite, pour tester les boutons) ; ses prochains tests sont sérieux.
- Règle changée : l'étape « Suggestions » arrive À LA FIN, après la dernière question et juste avant le quantitatif (dans la discussion ; sans aucune question, la carte seule avant la liste). Avant : après la lecture, avant les questions.
- Une information écrite au devis n'est jamais demandée, même dite avec un autre mot (« bacs de 4 m » = la longueur du rampant). Les mots sont dans la fiche du métier (`textLabels`), valent pour les lignes, la fiche lue et les questions du modèle, et sont donnés au modèle. Une question que le modèle pose sous son mot est LA question de la donnée : une seule, fermée par la réponse. Test `packages/domain/test/info-ecrite-jamais-demandee.test.ts`.
- Règle changée : le rampant d'une couverture en bacs (joint debout, tasseaux) n'est plus supposé à 5,5 m ; écrit au devis, sinon demandé en mètres. L'ardoise garde son défaut.
- Nouvel ouvrage « couverture zinc à tasseaux » dans la fiche Couverture (version `roofing-2026.11.18-57`) : bobine de 650 (500 au choix), tasseaux de 50, entraxe 620 (470), longueur d'un bac = rampant + 15 cm ; pattes dans les chutes (aucune ligne). Chiffres de Greg, retrouvés dans le descriptif VMZINC. Tasseaux et couvre-joints : seulement s'ils sont écrits, « à chiffrer » tant que Greg n'a pas validé le nombre de rangs (bacs + 1). Test `zinc-a-tasseaux.test.ts`.
- Une ligne « fourniture » (ou « fourniture et pose ») dont la lecture ne tire aucun article reste dans la liste, « à chiffrer », avec ses mots. Avant : repliée sous « N lignes sans fourniture ».
- Une bande de zinc qui attend sa réponse (pliage, développé) ne sort plus en plus comme une question « Interdit : métal au mètre… ».
- « Je ne sais pas » à la longueur des bacs : l'ouvrage qui a une valeur courante pour le rampant (les ardoises, dont il ne règle que le recouvrement) la reprend et reste chiffré ; les bacs restent à préciser dans la liste. Test `apps/api/test/je-ne-sais-pas-aux-bacs.test.ts`.
- Une qualité qui se nomme (« Ardoise d'Angers ») est acceptée même quand sa question n'est plus ouverte au moment où les réponses arrivent d'un coup (avant : refusée « pas un nombre », puis reposée).
- La discussion des questions n'est jamais fermée en route : les cases « Suggestions » s'affichent dans son fil.
- Recette en ligne du 19 novembre 2026 (D-2026-024) : la largeur de bobine ne se demande plus (défaut affiché 650, jamais « à confirmer », modifiable) ; une ligne « Fourniture et pose » que le modèle détaille en articles sans quantité d'un même ouvrage (bobine, tasseaux, couvre-joints) donne sa surface au premier : la couverture est chiffrée ; un nombre que le code calcule (rangs de tasseaux, nombre de bacs) n'est jamais demandé. Test `zinc-a-tasseaux.test.ts`.
- Constat du 18 novembre : trois lectures du même devis donnent trois listes différentes. À faire : D-2026-024 au jeu de test, puis stabiliser (prompt, clés de la fiche).

## Décisions du 15 novembre 2026 (soir) : dossier UX et réponses de Greg

- Stripe (test) : les quatre prix sont créés et posés sur la branche de test (`STRIPE_PRIX_PRO`, `_PROMAX`, `_PRO_ANNUEL`, `_PROMAX_ANNUEL`).
- Code FONDATEUR : 6 mois de Pro offerts, puis 30 % à vie, sur le Pro seulement. La case du code n'existe que pour le Pro au mois ; passer à Pro Max arrête la remise.
- « Mes prix » : 3 mois d'historique en Gratuit, tout en Pro et Pro Max (déjà le cas).
- CGU : version candidate complète `baticlair/docs/groupe/CGU-candidate-2026-11-16.md` (agent juriste, points pour l'avocat à la fin). Rien n'est publié.
- Anti-robot : à activer avant la production (deux clés Cloudflare Turnstile à créer par Greg).
- Achats groupés, visibilité : les artisans ne voient JAMAIS le nom d'une autre entreprise, ni avant ni après avoir participé ; ils voient le volume total, le nombre d'entreprises (créateur compris), la zone et « Entreprises vérifiées ». Seul l'admin voit l'identité et l'historique.
- Règle changée : volumes visibles dès la première publication (avant : à partir de 5 entreprises).
- Règle changée : date de besoin d'un achat groupé à 7 jours au moins (avant : 21) ; sous 21 jours, « Date proche », sans promesse. La fin des participations se dit à part.
- Règle changée : l'épaisseur d'une ardoise et l'essence d'un liteau sont facultatives (valeur, « Standard fabricant » ou « À préciser ») ; jamais une valeur inventée. Les autres caractéristiques restent obligatoires.
- « Publier un besoin groupé » vit sous Achats groupés (`/achats-groupes/publier`) : onglet, titre et Retour le disent ; l'ancienne adresse y renvoie. Feuille : « Choisir une liste », « Créer mon besoin ».
- Métiers : un seul réglage, `METIERS_OUVERTS` (« tous » ou des codes). Sans réglage : Couverture et Peinture en production, tout ailleurs ; posé à « tous » sur la branche de test. Les autres métiers restent visibles, « Bientôt ».
- Chantier fictif : retiré de l'interface par le réglage `CHANTIER_FICTIF` (coupé par défaut) ; rien n'est supprimé.
- Compte et sécurité : « Modifier mon mot de passe » (actuel, nouveau, confirmation, « Déconnecter mes autres appareils », 5 essais par heure).
- Accueil : « Mes demandes en cours » (demandes de prix et achats groupés séparés) et « Messages et réponses ». La boîte regroupe réponses des négoces, messages Mobiiz et Missions ; pas de fil artisan-négoce pour une demande directe.
- Alertes des achats groupés : dans la cloche seulement (« Une entreprise vient de rejoindre ton besoin », « Plus que 3 jours avant la clôture »), une par achat et par tranche de six heures.
- L'assistant branché sur le site de test reste allumé. La routine qui surveillait le crédit IA est coupée.

## Nouveaux tarifs (Greg, 15 novembre 2026 ; remplace Découverte, Essentiel et Pro)

- Gratuit : tout l'outil (listes à la main, envoi aux négoces, comparaison, publier et rejoindre des achats groupés), 3 analyses offertes en tout (devis, photo et liste confondus), première commande groupée offerte.
- Pro : 29 € HT par mois ou 290 € HT par an. Analyses incluses ; dans les achats groupés, voir le négoce retenu et commander.
- Pro Max : 49 € HT par mois ou 490 € HT par an. Même chose, avec un plafond bien plus haut. De Pro à Pro Max à tout moment, au prorata.
- Règle changée : avant, les achats groupés étaient gratuits en entier. Maintenant, publier et rejoindre restent gratuits ; après sa première commande (offerte), un compte gratuit voit le prix de l'offre, mais ni le nom du négoce ni le lieu, et « Commander » demande Pro.
- Aucun compteur ni barre à l'écran. Plafond caché par mois d'abonnement et par abonné, en euros de consommation : 5 € pour Pro, 20 € pour Pro Max, réglables dans Admin › Réglages (sans redéploiement). Un seul message, au plafond : « Passe au Pro Max ou attends le renouvellement le [date]. » Un compte gratuit lit ce qui lui reste seulement dans la fenêtre « Analyser ce document ? ».
- Garde-fous : 20 pages au plus par devis (`DOCUMENT_MAX_PAGES`) ; `BUDGET_IA_JOUR` avec alerte ; une analyse demande un e-mail vérifié (dès qu'un vrai fournisseur d'IA est branché) ; anti-robot à l'inscription (Turnstile, actif quand ses deux clés sont posées) ; alerte admin quand un compte dépense plus de 1 € d'analyses en un jour ou atteint son plafond.
- Assistant : au-delà des droits du compte (analyses offertes prises, plafond atteint, e-mail non vérifié), le code seul répond, sans rien dépenser.
- Page publique : jamais « illimité » ; la limite d'usage se dit en une phrase, sans chiffre. La landing ne montre toujours aucun montant ; les prix sont sur la page Tarifs.
- Stripe : nouvelles variables `STRIPE_PRIX_PRO`, `STRIPE_PRIX_PROMAX`, `STRIPE_PRIX_PRO_ANNUEL`, `STRIPE_PRIX_PROMAX_ANNUEL` ; les anciennes (`STRIPE_PRICE_ID_…`) ne sont plus lues, pour qu'un ancien prix ne soit jamais facturé. Tant que les nouveaux prix ne sont pas créés (accord de Greg), le paiement répond « pas encore ouvert » sur le site de test.
- CGU : version à faire relire par l'avocat, `baticlair/docs/groupe/CGU-candidate-2026-11-15.md`. Rien n'est publié : `/cgu` reste la version du 27/10/2026.
- En attente de Greg : création des quatre prix Stripe de test ; code FONDATEUR (« 6 mois de Pro offerts » : la remise de 30 % à vie est-elle retirée, et le code vaut-il pour Pro Max ?) ; « Mes prix » limité à trois mois en Gratuit (gardé tel quel).
- Clé IA refaite et posée le 15 novembre 2026 sur l'environnement de test seulement (variable de la branche de test).

## Signalement de bugs

- Bouton « Signaler un problème » : dans « Mon menu » sur chaque écran de l'application, et en bas des pages sans compte (espace négoce). La page et la capture d'écran sont jointes toutes seules.
- L'utilisateur reçoit « Merci, on regarde » ; Greg reçoit une alerte, puis le résumé du réparateur avec un lien pour valider. Rien n'est corrigé sans l'accord de Greg. Une fois corrigé et en ligne, « Marquer corrigé » envoie « C'est corrigé, merci ».
- Liste : espace admin › Signalements (`/admin/signalements`), statuts nouveau, en cours, corrigé.

## Équipe d'agents

Les sous-agents sont dans `.claude/agents/` (un fichier par agent). Greg ne parle qu'à la session principale, qui délègue et résume. Les agents ne travaillent que quand Greg le demande.

- « recette complète » : lancer tous les testeurs (testeur-artisan, testeur-negoce, testeur-mission, saboteur, rush, comptable, relecteur, mauvais-payeur, testeur-terrain), puis rendre UN rapport classé par gravité avec des propositions. Ne rien corriger sans l'accord de Greg.
- Les testeurs ne travaillent que sur l'environnement de test ou en local.
- Deux agents de plus (Greg, 19 novembre 2026) : `specialiste-ui-ux` (lisibilité, contraste, toucher, mots, clair et sombre) et `developpeur-senior` (revue de code, cas limites, tests manquants). Comme les autres, ils proposent et ne corrigent rien.

## Vérifications avant la production

- La liste complète : `baticlair/docs/groupe/MISE-EN-PROD.md`, section 0.
- La page `/couvreurs-bretagne` ne doit PAS partir en production (Greg, 19 novembre 2026) : non liée, « Page introuvable » quand `VERCEL_ENV=production`. Vérifier qu'elle répond 404 en production.
- Anti-robot (Turnstile) à activer ; admin de test à retirer de `GROUPE_ADMINS`.
- Conditions négoces du 21 novembre 2026 (repères de prix) : relues par l'avocat avant toute publication (version majeure, réacceptation des négoces).

## Décisions du 19 novembre 2026 : pages régionales, inscription par métier (en partie remplacées le même jour, voir plus bas)

- Page `/couvreurs-bretagne` : un MODÈLE piloté par une fiche (`baticlair/apps/web/src/lib/regions/`, une fiche par page, liste `PAGES_LOCALES`) ; route `app/(public)/[pageLocale]` (seules les adresses des fiches existent). Carte de la région (tracés IGN Admin Express, Licence ouverte), département touché retenu sur l'appareil et rempli à l'inscription, regroupements en cours du département (`GET /v1/public/regroupements`, jamais « 0 »). Sources : `baticlair/docs/regions/`. Aucune autre région, aucun menu des régions sur la landing avant validation de Greg.
- Inscription par métier (RÈGLE CHANGÉE : avant, tous les métiers s'inscrivaient) : « Couvreur » ouvert et choisi d'office, les autres « Bientôt disponible » → liste d'attente (`POST /v1/public/liste-attente`, table `liste_attente_metier`), lue dans `/admin/liste-attente` (par métier et par département). Le département choisi est gardé (`company.departement`, zone des achats groupés quand l'adresse n'a pas de code postal). Comptes existants non touchés.

## Décisions du 19 novembre 2026 (soir) : la carte passe dans l'onboarding

- La page « Couvreurs de Bretagne » est mise de côté : gardée, non liée, non indexée, jamais en production (voir « Vérifications avant la production »). La landing nationale reste telle quelle, pub comprise.
- NOUVEL ONBOARDING `/commencer` (RÈGLE CHANGÉE : avant, « Commencer » menait à un formulaire nom, entreprise, métier, e-mail, mot de passe) : carte de France par régions, zoom animé sur la région découpée en départements (retour à la France ; Corse sur la carte et en liste, outre-mer en liste) ; métier, « Couvreur » d'abord, un autre métier entre aussi avec le message « en rodage » ; e-mail et portable, rien d'autre (CGU à cocher et anti-robot gardés) ; l'e-mail se vérifie comme avant ; puis le nouveau quantitatif. Compte sans mot de passe choisi (aléatoire, jamais montré) : « Mot de passe oublié » pour se reconnecter ailleurs. Le guide de premier lancement ne s'ouvre pas par-dessus le premier essai.
- Les entreprises créées ainsi portent `parcours_inscription = essai`. Pour elles seulement : le SIRET n'est demandé qu'au moment d'envoyer aux négoces, de grouper ou de commander (« Pour que les négoces sachent à qui ils répondent… »), l'entreprise trouvée (nom, adresse, activité) se confirme (« C'est bien mon entreprise » / « Ce n'est pas la mienne »), et rien ne part avant : 403 `identite_a_confirmer` sur l'envoi, l'ajout de négoces, la commande, la demande perso (`IdentiteConfirmeeGuard`) ; achats groupés : SIRET compté seulement une fois confirmé. Département de l'entreprise ≠ celui de la carte : l'artisan choisit lequel garder (`PATCH /v1/company/departement`). Les comptes d'avant ne sont pas touchés.
- Zone des achats groupés : le département choisi d'abord, sinon le code postal de l'adresse (RÈGLE CHANGÉE : avant, le code postal d'abord).
- L'inscription complète `/inscription` reste servie (parcours de test), plus liée ; « Bientôt disponible » et la liste d'attente sont retirés de l'écran (données gardées). Admin › « Métiers et départements des inscrits » (`/admin/liste-attente`).

## Décisions du 20 novembre 2026 : réponses de Greg sur l'onboarding

- Connexion (RÈGLE CHANGÉE : avant, le mot de passe seul) : sur `/connexion`, d'abord « Recevoir un lien de connexion » (lien par e-mail, 15 minutes, usage unique, jamais une création de compte ; plugin `magicLink` de better-auth, déjà installé) ; le mot de passe reste possible. Profil › Sécurité : « Choisir un mot de passe » (un lien par e-mail, le chemin de « Mot de passe oublié », anti-robot compris). Comptes existants inchangés.
- « Voici ton adresse Mobiiz » (RÈGLE CHANGÉE : avant, juste après l'inscription) : au premier envoi aux négoces, une seule fois, dans la feuille d'envoi, après la validation de l'entreprise. L'inscription complète `/inscription` le montre encore à l'inscription.
- Aucun nom d'entreprise tant que le SIRET n'est pas validé (parcours « essai ») : le nom est vide en base, l'en-tête n'affiche rien ; l'annuaire donne le nom à la confirmation ; l'adresse Mobiiz attend ce nom (créée au premier besoin). E-mails d'identité : « Bonjour, » quand il n'y a pas de nom.
- Message pour un autre métier : gardé.

## Décisions du 20 novembre 2026 : même devis, même liste (Greg, D-2026-024)

- RÈGLE CHANGÉE (§51.5, tous métiers) : les questions sont décidées par le code d'après la fiche du métier (ce que le négoce exige pour chaque ligne), jamais par la lecture. Une question du modèle n'est gardée que pour une donnée que la fiche ne connaît pas, ou un doute écrit au devis (deux valeurs écrites) ; sinon elle prend le texte et les boutons de la fiche. Toujours l'ordre du calcul. Avant : les questions du modèle, dans son ordre.
- RÈGLE CHANGÉE : les lignes « fourniture et pose » sont rattachées à leur ouvrage par les mots de la fiche, dans le code (`lecture/par-le-code.ts`). Avant : l'ouvrage venait du modèle.
- Toute ligne « à chiffrer » vient avec la question qui la débloque. Le développé se demande pièce par pièce, au nom de la pièce.
- Tasseaux (fiche `roofing-2026.11.20-62`) : rangs = bacs − 1 + rives sur tasseau ; question « Ton pan finit comment, de chaque côté ? » (2 / 1 / 0), lue au devis quand il la dit. Sources : RHEINZINK, VMZINC, NedZink (le texte du NF DTU 40.41 est payant : non lu, non recopié).
- Nouvel ouvrage « Chéneau encaissé zinc » : bobineau au mètre, largeur = développé (question à boutons).
- RÈGLE CHANGÉE : la désignation de chaque ligne est reprise du texte du devis (`designationsDuDevis`, à l'enregistrement de la lecture), jamais des mots du modèle. Une question du modèle sur une donnée de la fiche n'est posée que si c'est un doute écrit au devis ; jamais une question qui demande une quantité.
- Test permanent : `packages/domain/test/meme-devis-meme-liste-d2026-024.test.ts` (huit lectures réelles, dont les cinq rejouées en ligne le 20 novembre : mêmes questions, même liste finale).

## Décisions du 20 novembre 2026 : carte et retours haptiques

- Carte de l'onboarding : zoom en un seul mouvement mené par le navigateur, flou posé une fois le zoom fini, départements préchargés. Règle changée : sur la carte, les NUMÉROS seuls (avant : noms et numéros mêlés) ; les noms dans la barre « Continuer ». Règle changée (même jour) : sous la carte d'une région, plus la liste des départements, seulement le département choisi et « Continuer » ; seuls les départements trop petits pour le pouce (75, 92, 93, 94, et 90, 68, 66) gardent un bouton à leur numéro ; la barre ne montre que le département de la région affichée. Règle changée (même jour) : sous la France entière, seulement l'outre-mer en boutons ; les régions se touchent sur la carte (avant : leurs noms en boutons aussi). Pas de zoom de la page au double toucher sur l'onboarding.
- Retours haptiques dans toute l'application (`lib/haptique.ts`, `RetoursHaptiques` dans la mise en page racine) : un léger au choix (région, département, métier, case, onglet), un appui sur un bouton d'action ; jamais sur un simple lien. Android : vibration du navigateur ; iPhone (iOS 18 et plus) : le clic de l'interrupteur natif. Coupables dans Profil › Apparence (« Vibrations au toucher », allumées par défaut, gardées sur l'appareil).

## Décisions du 20 novembre 2026 : l'accueil premium

- RÈGLE CHANGÉE (Greg, 20 novembre 2026) : avant, un tableau de bord (« À faire maintenant », « Mes demandes en cours », « Messages et réponses », achats groupés, « Missions près de toi », « Activité récente ») → TROIS ZONES : « Nouveau quantitatif » (photo du métier, le bouton, devis / photo / dictée seulement s'ils marchent), « Mon activité » (un dossier une seule fois, deux cartes sur téléphone, « Voir tout » vers Demandes ; rien = pas de zone), « Achats groupés » (« Rejoins les couvreurs des Côtes-d'Armor », un groupé de son métier avec « Rejoindre », règle des 3, chrono sous 48 h jusqu'à « Clôturé », sinon « Sois le premier dans ton département »). Plus de bloc Missions ni de carte « Messages et réponses » sur l'accueil. « Bonjour » moins haut.
- Nouveau compte : « Pour bien démarrer », trois étapes cochées d'après les vrais dossiers ; se ferme et ne revient pas (sur l'appareil).
- Code : `components/accueil.tsx`, `packages/domain/src/accueil/mon-activite.ts` ; photos : `apps/web/public/accueil/`, `lib/photos-accueil.ts`, `baticlair/docs/photos-accueil.md` (les photos de Greg depuis le 21 novembre 2026).
- Prix : état des lieux et proposition dans `baticlair/docs/prix-etat-des-lieux-2026-11-20.md` (rien n'est touché dans la base).

## Décisions du 21 novembre 2026 : accueil, prix, partage avec le banc d'essai

- Partage du travail : la discussion du banc d'essai (`banc-quantitatif/DEFAUTS.md`, `A-TRANCHER.md`) corrige le calcul du moteur et branche la nouvelle lecture des devis. Cette discussion-ci ne touche plus ni au calcul du moteur ni aux questions du quantitatif : elle garde l'accueil, les prix et la recherche pour la fiche couverture.
- Accueil : les deux photos sont celles de Greg, sans crédit (avant : Wikimedia Commons, crédit en bas de l'accueil). La photo des plans sert à tous les métiers. Anciennes photos gardées dans `baticlair/docs/photos-accueil-anciennes/`. Le chrono d'un groupé a sa propre ligne. L'encart « Mets Mobiiz sur ton écran d'accueil » ne revient plus une fois l'appli installée.
- Prix (oui de Greg aux 4 changements). L'observatoire garde un statut, proposé ou commandé, et la région (migration additive `20261121090000_observatoire_statut_region`). Les offres des achats groupés et les commandes y sont versées. Rien n'est montré aux artisans pour l'instant. Ligne 23 du registre RGPD, corrigée par le juriste (données pseudonymisées). Phrase des conditions négoces : changement MAJEUR selon le juriste (réacceptation), seuil de trois négoces, jamais visible par un négoce ; NON PUBLIÉE, `baticlair/docs/groupe/conditions-negoces-candidate-2026-11-21.md`, à l'avocat. Conservation (accord de Greg le 22 novembre 2026) : empreinte de la source effacée 12 mois après la clôture, ligne supprimée à 3 ans, appliquées chaque nuit. Ligne 20 du registre : plus de « factures de commission ». La relecture des conditions négoces par l'avocat est dans `MISE-EN-PROD.md`, section 0.
- Analyses offertes sur le site de test : 60 (avant : 50), pour finir les lectures de D-2026-024.
- Parcours de test (22 novembre 2026) : la carte « Suggestions » s'ouvre maintenant dans des listes qui n'en avaient pas (pointes de liteaux) ; les parcours qui ne la regardent pas touchent « Continuer » sans rien cocher (`continuerQuandLesSuggestionsSOuvrent`, `e2e/discussion.ts`). Tests seulement, rien du moteur.

- Règle changée (Greg, 23 novembre 2026) : l'image de « Nouveau quantitatif » est celle de Greg, un devis qui entre dans la machine Mobiiz et ressort en quantitatif (avant : un artisan sur ses plans, gardée dans `baticlair/docs/photos-accueil-anciennes/`). Comme elle porte déjà ses mots, « Prépare ta liste de matériaux » passe SOUS l'image, à la couleur du thème (avant : en blanc sur la photo, avec un voile sombre).

## Décisions du 22 novembre 2026 : base couverture et banc d'essai

- Partage du travail (Greg) : la session « base couverture » fait la recherche et la fiche, avec les sources ; tout ce qui touche au calcul, aux suggestions ou aux questions s'écrit dans `banc-quantitatif/A-INTEGRER.md`, et c'est le banc d'essai qui l'intègre.
- Suggestions : pas de limite à 5 ; rangées par catégorie (Couverture, Zinguerie, Fixations, Ventilation…) avec un petit titre, une vingtaine au plus (fait par le banc d'essai).
- Chatières et vis : calculées d'après le modèle et la surface, jamais demandées.
- Fixation des tuiles : zone de vent et situation exposée déduites de la commune ; seule question « Écran sous toiture ? », si le devis ne le dit pas.
- Clous d'ardoise en Suggestion : longueurs d'égout, de faîtage et de rive prises au devis, demandées seulement si la case est cochée et qu'elles manquent. Règle changée : faîtage à 2 clous au moins au dernier rang (DTU), avant 1.

## Décisions du 22 novembre 2026 : e-mails entrants blindés, quantité d'un achat groupé

- E-mails reçus sur contact@ et sur les adresses Mobiiz des artisans (comme Gmail et Outlook) : le résultat SPF, DKIM, DMARC du serveur de réception décide (`verdictEntrant`, `packages/domain/src/messagerie/entrant.ts`). DMARC refusé, SPF et DKIM refusés, faux mobiiz.fr, domaine ou nom qui imite Mobiiz, adresse cachée dans le nom affiché, pièce dangereuse : le message va aux Indésirables, jamais supprimé, et à la liste admin « E-mails bloqués » avec la raison. Pièces jointes : exécutables, archives, macros, pages web retenues ; PDF et images passent (contenu vérifié). Une réponse n'est rattachée à une demande que si l'expéditeur est le négoce de cette demande ET authentifié (DMARC). Un message externe n'est jamais habillé en Mobiiz : bandeau « Message externe, non vérifié par Mobiiz », aucun logo, vrai expéditeur, objet « [Externe] », liens en texte non cliquable. Alerte admin à 30 messages dans l'heure sur une adresse. Tests : `emails-entrants-blindes` et `saboteur-emails-entrants` (domaine et serveur).
- DMARC de mobiiz.fr : Greg n'envoie aucun e-mail @mobiiz.fr hors de l'appli ; accord pour passer en `p=reject` une fois les envois Resend vérifiés. ATTENTION : si un jour une vraie boîte est créée pour contact@mobiiz.fr (Gmail, Outlook…), il faudra D'ABORD l'autoriser dans les réglages du domaine (SPF et DKIM de ce fournisseur), sinon les messages de Greg seront bloqués.
- « Ajoute ta quantité » (achats groupés), validé par Greg. Règle changée : avant, un bloc « Conditionnement » à confirmer à part, puis la quantité à l'écran suivant → la quantité se tape juste sous l'unité choisie (« Combien de longueurs de 4 m ? », « 12 longueurs = 48 m », « Corriger » sur place) ; « Continuer » confirme le conditionnement écrit dans la question ; l'étape suivante devient « Où et pour quand ? ». La barre « Continuer » se range pendant la saisie sur téléphone.
- Ce qui apparaît après un toucher se montre (`reveler-apres-toucher.tsx`) : défilement doux, premier champ mis en avant, la page garde en bas la place des barres d'action (`data-barre-action`, `--barre-action`). Test petit iPhone : `e2e-ag-v1/ce-qui-apparait-se-voit.spec.ts`.

## Décisions du 22 novembre 2026 (soir) : la messagerie, comme Gmail et Outlook

- « Messages pour lire, Demandes pour décider » (maquettes validées par Greg). Trois dossiers : Reçus, Envoyés, Indésirables (`components/messagerie.tsx`). Règle changée : avant, une liste plate et six filtres → Reçus regroupe les réponses des négoces PAR CHANTIER (« Négoce · Toiture Dupont », « 3 réponses sur 5 », un négoce une seule fois, ceux qui n'ont pas répondu « En attente »), qui se déplie sur place ; puis les autres messages (Mission seulement si Mission est ouverte, Mon site, Mobiiz, réponses à classer). Pastille ronde : camion jaune pour un négoce, poignée de main grise pour une mission.
- Règle changée : avant, « Écrire à » ouvrait la messagerie du téléphone → les échanges avec les négoces passent par Mobiiz : « Répondre » sous chaque message de négoce (`POST /v1/recus/:id/repondre`), la réponse part de l'adresse Mobiiz de l'artisan, au négoce de la demande seulement (jamais à un expéditeur inconnu), avec l'étiquette de la demande, et la réponse du négoce revient rangée dans le bon chantier. Pas de bouton « Appeler ». Le message s'ouvre en fil (reçus et envoyés à ce négoce, dans l'ordre).
- « Envoyés » : tout ce qui part au nom de l'artisan (demandes de prix, bons de commande, ses réponses, relances automatiques, « prévenir les autres négoces »), noté une fois parti pour de vrai (table `message_envoye`, migration additive `20261122120000_messages_envoyes`, `platform/email/journal-envois.ts`).
- Indésirables : rangés par Mobiiz ou par l'artisan (« Signaler comme indésirable »), « Ce n'est pas un indésirable » les remet dans Reçus ; rien n'est supprimé.
- Ordinateur : le menu à gauche, la liste au milieu, le message ouvert à droite. Téléphone : le message en plein écran, Retour ramène au même endroit (dossier, chantier déplié, défilement).
- Règle changée : avant, les brouillons mêlés aux demandes envoyées dans « Toutes » → repliés en bas de Demandes, « À terminer (N) » (étape `parties` de `/v1/projects`) ; le filtre « À préparer » reste ; « Sélectionner » les déplie.
- Fiche d'une demande : un négoce une seule fois (le bloc du suivi ne montre plus que les négoces qui ont quelque chose à dire : question, refus, conditions).
- Tests : `apps/api/test/messagerie.test.ts`, `e2e/messagerie.spec.ts`.

## Décisions du 22 novembre 2026 (soir) : la dictée du quantitatif

- RÈGLE CHANGÉE (Greg, 22 novembre 2026), discussion des questions du quantitatif seulement : avant, le texte dicté s'écrivait dans la case et attendait « Envoyer », sans « Annuler » (règle du 7 novembre) → pendant la dictée, aucun texte : une onde jaune qui suit la vraie voix (Web Audio, rien n'est enregistré ni envoyé ; sans accès au son, l'onde respire), un petit chrono, un gros bouton rouge « Arrêter » et « Annuler ». À l'arrêt, ce qui a été dit part comme une bulle normale ; un toucher sur la bulle rouvre la réponse et remet le texte dans la case. « Annuler » : rien ne part. Le reste du parcours ne change pas. L'assistant de la liste garde l'ancienne dictée (texte dans la case).
- Écoute continue : elle ne s'arrête qu'à « Arrêter » ; un morceau redonné en double par Chrome sur Android n'est pas répété.
- Code : `lib/dictee.ts` (`continu`), `components/chat-mobiiz.tsx` (`EcouteEnCours`, `dicteeEnBulle`), `components/journey.tsx`. Test : `e2e/parcours-artisan.spec.ts`, « la dictée du quantitatif ».
- À vérifier par Greg sur son iPhone : Safari peut couper l'écoute seul après un long silence (le message part alors tout seul) ; l'onde et la dictée utilisent le micro en même temps.

## Décisions du 23 novembre 2026 : tester comme le jour du lancement

- RÈGLE CHANGÉE (Greg, 23 novembre 2026) : sur le site de test, les e-mails DE COMPTE (validation de l'inscription, lien de connexion, mot de passe oublié) partent à la vraie adresse de la personne, pour qu'un ami qui a le lien valide son inscription tout seul. Avant : détournés vers Greg (« [TEST → …] ») comme tous les autres, et l'ami ne pouvait jamais valider son adresse. Tous les autres e-mails restent détournés vers Greg, ceux des négoces d'abord (jamais d'e-mail réel à un négoce pendant un test). Une adresse réservée aux tests (example.*, exemple.*, .test, .invalid) reste détournée. Code : `TransactionalEmail.compte`, `garder` (`platform/email/mise-en-page.ts`) ; test `apps/api/test/emails-reels.test.ts`.
- Guide « Revoir le guide » (Greg, 23 novembre 2026 : « les textes à jour ») : un écran par grande fonction. « Compare tes négoces » (devis, photo ou dictée, jusqu'à 5 négoces, réponses dans Messages rangées par chantier), « Achète en collectif » (son métier, son département, « plus on est, moins on paie »), NOUVEL écran « Crée ton site » (« Mon site »), puis « Publie ou trouve une mission » si Mission est ouverte. Règle changée : avant, deux écrans (trois avec Mission), sans « Mon site ». Il ne s'ouvre toujours pas à l'inscription `/commencer` : seulement par « Revoir le guide ».
- Lecture refusée pour un e-mail pas encore confirmé : l'écran dit la vraie phrase (« Confirme d'abord ton adresse e-mail… ») et propose « Renvoyer le lien de confirmation ». Avant : « Un champ n'est pas correctement rempli » (capture de l'ami de Greg). Parcours `e2e/parcours-artisan.spec.ts`, « e-mail pas encore confirmé ».

## Décisions du 27 novembre 2026 : vitesse du calcul, « Je ne sais pas » au développé

- Abergement de cheminée : cotes validées par Greg (« approximativement »), valeurs par défaut marquées, montrées sous la flèche, modifiables ; sans la taille au devis, « Combien de feuilles ? » direct.
- Vitesse (Greg : « moins de 2 secondes par réponse ») : seul ce qui change se recalcule, aucun résultat changé (banc 99 sur 99, sortie identique avant / après). Chantier D-2026-020 en local : calcul 8,7 s → 0,85 s ; tout « Je ne sais pas » d'un coup 12,2 s → 2,5 s. « Vérification des quantités… » s'affiche dès « Calculer ma liste ».
- Règle changée : « Je ne sais pas » au développé d'une pièce que l'artisan plie → « Pour …, combien de feuilles de zinc te faut-il ? » dans la discussion (avant : la ligne attendait son développé). Pièce commandée toute faite : rien ne change.

## Décisions du 27 novembre 2026 (suite) : l'habitude nommée, le prix d'un devis client

- Règle changée (iPhone de Greg) : une habitude retenue nomme toujours ce qu'elle concerne (« Épaisseur du zinc : 0,65 mm, comme d'habitude »), une ligne par habitude, et se rouvre d'un toucher. Avant : « Comme d'habitude : 0,65 mm. » seul. Le serveur envoie le nom (`habits[].nom`, champ commun avec la discussion des écrans, qui avait fait la même correction le même jour ; gardée : la version qui se touche). Parcours « une habitude dit toujours ce qu'elle concerne ».
- Nouvelle règle (Greg) : le prix écrit sur un devis client est le prix de VENTE de l'artisan ; jamais un prix d'achat, jamais dans l'observatoire des prix ni dans « Mes prix », jamais montré à un négoce. Vérifié : seules les réponses des négoces (lien de chiffrage, offres groupées) alimentent l'observatoire et « Mes prix ». Test permanent `apps/api/test/prix-du-devis-client-jamais-un-prix-d-achat.test.ts`.
## Décisions du 27 novembre 2026 : retour de Greg sur la dictée (iPhone, Safari)

- RÈGLE CHANGÉE : dans les questions du quantitatif, la dictée en bulle du 22 novembre (onde, chrono, envoi à l'arrêt) est retirée → la dictée normale revient : le texte s'écrit dans la case pendant qu'on parle, rien ne part avant « Envoyer ». (On y répond surtout d'un toucher.)
- NOUVEAU « À la voix » au départ d'un nouveau quantitatif (carte de « Nouveau quantitatif », et bouton de l'accueil, avant « Dicter ») : « Parler », puis l'onde jaune au rythme de la voix, le chrono, le gros bouton rouge et « Annuler » ; à l'arrêt, le texte dans une bulle à corriger (« Relis et corrige si besoin »), puis « Envoyer à l'analyse » (ou « Recommencer »). Rien ne part tout seul. Code : `ALaVoix` (`components/nouveau-quantitatif.tsx`, `entree=voix`), `EcouteEnCours` (`chat-mobiiz.tsx`).
- Coupure de Safari après un silence : l'écoute continue repart toute seule et garde tout ce qui a été dit, tant que l'artisan n'a pas touché « Arrêter » ou « Annuler » (`useDictee` continu, `lib/dictee.ts`).
- Sur téléphone, l'onde suit les mots reconnus (chaque résultat de la dictée la relance) ; le micro n'est plus ouvert une seconde fois à côté de la dictée (sur iPhone, l'onde restait plate et le texte ne revenait pas). Sur ordinateur, elle suit le son du micro.
- « Comme d'habitude : 0,65 mm. » seul ne disait rien → chaque habitude dit son nom : « Épaisseur du zinc : 0,65 mm, comme d'habitude. » (nom de la donnée de la fiche, `habits[].nom`).
- Tests : `e2e/parcours-artisan.spec.ts` (« la dictée des questions », « À la voix », coupure de Safari simulée), `apps/api/test/habitudes.test.ts`. PAS ESSAYÉ SUR UN VRAI IPHONE (pas d'iPhone ni de Safari ici) : à confirmer par Greg.

## Décisions du 27 novembre 2026 : la version ordinateur (Greg : « pas pro aujourd'hui »)

- Le téléphone ne bouge pas : chaque changement est en `lg:` (ou au-delà) ; captures téléphone comparées avant et après (seules l'heure et les adresses de test diffèrent).
- Skill frontend-design d'Anthropic ajouté au projet (`.claude/skills/frontend-design`, licence Apache 2.0), à côté de taste-skill.
- RÈGLE CHANGÉE : la colonne de l'ordinateur a « Messages » (avec ses non-lus) ; avant, la messagerie n'y avait pas de ligne et « Missions » s'allumait sur /messages (bug corrigé). Au-delà de 1536 px, le contenu va jusqu'à 100 rem (avant : 76 rem partout).
- Messagerie sur ordinateur, comme Gmail : trois volets sur toute la hauteur (dossiers, liste, message ouvert) ; avant, une petite boîte à droite.
- Nouveau quantitatif : les trois choix côte à côte en grandes cartes (`CarteLien colonne`). Achats groupés : toute la largeur, trois colonnes, état vide centré. Demandes : trois colonnes au-delà de 1536 px. L'accueil s'aligne sur l'en-tête.
- Site artisan, grand écran (à partir de 1200 px de site) : contenu jusqu'à 1440 px, accueil sur toute la hauteur de l'écran, prestations en cartes avec leur texte entier, réalisations en grandes photos, rubriques aérées. Le téléphone et la tablette ne changent pas.
- MODÈLES DE SITE : `MODELES_SITE` et `modeleDe` (domaine), colonne `page_entreprise.modele` (migration additive `20261127180000_page_modele`), registre `RENDUS` dans `vue-page.tsx` (`ModeleAtelier`). Un modèle est un habillage : il lit le même contenu, changer de modèle ne touche à aucune donnée (test « MODÈLES DE SITE », `apps/api/test/page-entreprise.test.ts`). Un seul modèle pour l'instant ; le choix apparaît dans l'onglet Couleurs dès qu'il y en a deux.
- RÈGLE CHANGÉE : « Voir mon site » s'ouvre en version ordinateur sur ordinateur et en version téléphone sur téléphone (avant : toujours téléphone) ; le sélecteur reste. L'aperçu ordinateur se dessine sur 1440 px (avant : 1200), réduit en miniature entière sur un téléphone.

## Décisions du 27 novembre 2026 (soir) : sites des artisans, le socle (cahiers 02 et 03)

- Cahiers 02 et 03 rangés dans `baticlair/docs/cahiers-chatgpt/` ; le message de Greg l'emporte, « plus tard » attend (carrousel, animations, illustrations, vibrations, « Améliorer mon référencement », pied « Site pro créé avec Mobiiz »). Compte rendu complet : `baticlair/docs/sites-artisans-socle-2026-11-27.md`.
- RÈGLE CHANGÉE : avant, chaque changement de « Mon site » était en ligne tout de suite → l'éditeur modifie un BROUILLON, le visiteur ne voit que ce qui a été PUBLIÉ (« Publier », ou l'interrupteur « Page visible ») ; couper « Page visible » retire le site de la ligne sans rien effacer. Une page en ligne d'avant ce changement ne bouge pas : elle est figée juste avant son premier changement. Une photo retirée quitte aussi le site (elle est effacée). Colonnes additives `publie`, `publie_le`, `modele_precedent` (migration `20261127200000_page_brouillon_publie`).
- Deux modèles, mêmes données, un seul éditeur : « Atelier » (l'actuel) et « Sobre » (clair, accueil en deux parties, prestations en liste, bande de la teinte, contact clair ; `modele-sobre.tsx`). Aller-retour sans perte prouvé (test API « MODÈLES DE SITE », parcours `e2e/site-modeles.spec.ts`) ; « Revenir au modèle … » dans « Couleurs ».
- RÈGLE CHANGÉE : le jaune Mobiiz n'est plus imposé aux sites : six palettes lisibles (`PALETTES_SITE`), réglées de la même façon dans tous les modèles.
- Adresses : noms réservés étendus (technique, messagerie, marque) ; doublons, changement unique avec redirection et adresses réservées pour toujours vérifiés. Sous-domaines : comparaison écrite, rien de changé (DNS, domaine, Vercel).
- Droit de publier réservé à l'abonnement : prêt et COUPÉ jusqu'au lancement (Greg, 28 novembre 2026 : les testeurs essaient tout) ; à allumer au lancement (`MISE-EN-PROD.md`, section 0 : `SITE_PUBLICATION_PAYANTE=on` et `SITE_PUBLICATION_PAYANTE_DEPUIS`). Contrôlé côté serveur, sans Stripe ni prix.
- Résiliation (Greg, 28 novembre 2026, option 2) : le site reste en ligne 30 jours après la fin de l'abonnement, un e-mail et une alerte 7 jours avant le retrait, puis retiré chaque nuit ; textes, photos et adresse gardés, republication en un toucher après réabonnement (`etatDuSiteApresFin`, `sitesApresFinAbonnement`, colonne additive `retrait_prevenu_le`). N'agit que quand la publication réservée est allumée. Écrit pour l'avocat dans `docs/groupe/CGU-candidate-2026-11-16.md` (points indispensables).
- Coûts estimés pour 100, 1 000 et 10 000 sites (stockage et bande passante Vercel Blob) ; aucun service payant ajouté.

## Idées à venir, notées sans être codées (Greg, 20 novembre 2026)

- Les derniers prix négociés affichés anonymement : jamais le nom du négoce, seulement après la clôture ; à prévoir dans les conditions des négoces.
- Le compteur d'économies, quand on aura les vrais prix payés par l'artisan.
- La lecture des factures du négoce de l'artisan.

## À faire avant l'ouverture d'un nouveau métier

- Le bouton admin « Prévenir les inscrits » existe (chantier 05, 28 novembre 2026, voir plus bas) : seuls les inscrits qui l'ont choisi sont prévenus, jamais toutes les entreprises du métier.

## Décisions du 27 novembre 2026 : sécurité, sauvegardes (audit `baticlair/docs/securite-sauvegardes-couts-2026-11-27.md`)

- Vercel : l'équipe gr33-spec est en **Pro** (actif, aucune suspension), pour les deux projets (baticlair, baticlair-api). mobiiz.fr n'est rattaché à aucun projet pour l'instant.
- Sauvegarde nocturne : `.github/workflows/sauvegarde-base.yml` posé SEUL sur `main` (seule exception permise par Greg à « jamais main ») ; les deux mises en ligne de production lancées par Vercel ont été annulées, la production reste au commit b7654ab0. Chaque nuit : export, VRAI test de restauration dans une base jetable de GitHub, chiffrement puis déchiffrement de contrôle, 30 jours (90 pour celle du 1er du mois). Elle vise la base du SITE DE TEST tant qu'il n'y a pas de production. Elle ne part qu'une fois la branche par défaut passée à `main` et les deux secrets posés (Greg).
- RÈGLE CHANGÉE : une clé API partenaire n'ouvre plus que les quantitatifs (`routeOuverteAuxCles`, `identity/http/session.guard.ts`). Avant : toutes les routes du compte, suppression comprise.
- RÈGLE CHANGÉE : « Répondre » seulement sur une demande déjà envoyée, au négoce de la demande, à l'adresse figée à l'envoi, quand le message vient de ce négoce authentifié ; objet nettoyé, nom d'expéditeur sans signe d'adresse, identité confirmée, 30 réponses par heure et par entreprise. Test `apps/api/test/saboteur-repondre.test.ts` (26 attaques).
- RÈGLE CHANGÉE : les analyses en cours comptent dans les 3 analyses offertes (réservation sous verrou par entreprise) ; avant, dix lectures lancées d'un coup passaient toutes.
- RÈGLE CHANGÉE : les lectures qui coûtent sont limitées (route avec son `@Throttle`, PDF, Excel, CSV, pages par jeton) ; avant, aucune lecture n'était comptée. Les jetons du chemin ne sont plus écrits dans les journaux (`cheminJournalise`).
- Dépôt privé : AVANT de le passer en privé, les commits qui partent sur Vercel doivent avoir pour AUTEUR le compte GitHub de Greg (gr33-spec), seul membre de l'équipe Vercel ; sinon Vercel bloque la mise en ligne (« commit author is not a member of the team »).

## Décisions du 28 novembre 2026 : chantier 05, liste d'attente et invitations

- Cahier `baticlair/docs/cahiers-chatgpt/05_Admin_Stripe_parrainage.pdf`, partie 2 seulement ; compte rendu : `baticlair/docs/chantier-05-liste-attente-invitations.md`.
- Ouvert au lancement : les couvreurs des Côtes-d'Armor (`OUVERTURES_DE_DEPART`). Un couple métier et département s'ouvre quand l'admin « prévient les inscrits » (confirmation = décision d'ouverture) ; ouvrir ne bloque personne et ne change aucune règle d'achat groupé.
- Liste d'attente : case « Préviens-moi » à l'inscription (`/commencer`) et sur l'accueil, jamais cochée d'office, choix noté avec sa version ; « Tu es sur la liste. On t'écrit dès que Mobiiz ouvre pour les plaquistes du 22. » ; une ligne par e-mail et métier ; désinscription en un clic (lien de l'e-mail, ou l'accueil).
- Admin › « Prévenir les inscrits » (`/admin/prevenir`) : métier, départements, nombre, aperçu de l'e-mail, confirmation sur ce nombre ; lots de 20 ; une fois par inscrit ; journal (adresses masquées). Admin › « Invitations » : qui a invité qui.
- « Invite d'autres artisans » sur l'accueil (fermable) : lien personnel `/invitation/<code>` partagé par l'artisan (SMS, WhatsApp, e-mail, copier) ; aucune récompense ; suivi seul (`invitation_suivi`), prêt pour Flouzeo plus tard.
- Migration additive `20261128120000_liste_attente_invitations`. Registre RGPD lignes 24 et 25. À valider par Greg : les durées de conservation proposées (ligne 24), pas encore appliquées.

## Décisions du 28 novembre 2026 : référencement Google et IA (audit `baticlair/docs/referencement/audit-seo-ia-2026-11-27.md`)

- Robots : « recherche oui, entraînement non ». `robots.txt` permet tous les robots de recherche (Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot…) et refuse les robots d'entraînement (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, meta-externalagent) : `apps/web/src/app/robots.ts`, liste dans `apps/web/src/lib/indexation.ts`.
- RÈGLE CHANGÉE : seul mobiiz.fr en production s'ouvre aux moteurs (`INDEXATION_SITE=on` en Production ET hôte `mobiiz.fr`), et seulement la landing, les tarifs et les pages légales (`PAGES_INDEXABLES`) ; tout le reste dit `noindex` (en-tête), test.mobiiz.fr et les adresses Vercel compris. Avant : `noindex` partout, sauf les sites des artisans dès `PAGES_ENTREPRISES_INDEXEES=on` sur n'importe quel hôte ; maintenant ils demandent aussi mobiiz.fr en production. Test `apps/web/scripts/indexation.test.mjs`.
- Une page entre dans le sitemap et s'ouvre aux moteurs en l'ajoutant à `PAGES_INDEXABLES`, jamais autrement. Adresse officielle (canonical) toujours `https://mobiiz.fr` en production (`origineCanonique`).
- `/couvreurs` gardée, non liée, non indexée (base de la future page couverture) ; `/peintres` retirée.
- Pas de page Côtes-d'Armor avant d'avoir de vrais couvreurs. Pas de pages villes en série. Chaque texte de page publique : brouillon dans `baticlair/docs/referencement/brouillons/`, relu par Greg, aucune affirmation commerciale sans son accord.
- Titre des sites des artisans : on garde « Couvreur à Saint-Brieuc – Dupont Couverture ».
- Search Console (propriété « Domaine ») : feu vert, Greg pose la ligne TXT dans Vercel (DNS de mobiiz.fr chez Vercel) : `baticlair/docs/referencement/search-console-bing.md`.

## Décisions du 28 novembre 2026 : la sauvegarde prévient elle-même

- RÈGLE CHANGÉE (Greg : « je ne veux pas dépendre des notifications de mon compte GitHub ») : avant, seul GitHub prévenait d'un échec de la sauvegarde nocturne → à la fin de chaque exécution, le workflow envoie son résultat à l'API (`POST /v1/internal/sauvegarde`, jeton signé de GitHub OIDC, aucun secret) ; un échec, test de restauration compris, part par les alertes de Mobiiz (« SAUVEGARDE ÉCHOUÉE », adresse d'Admin › Réglages), avec l'étape et le lien de l'exécution ; la réussite qui suit un échec dit « rétablie » ; la veille quotidienne de l'API prévient après 36 h sans réussite (une fois le workflow branché).
- Essai de l'alerte : le fichier du workflow modifié sur une autre branche que `main` se lance seul et échoue exprès ; l'e-mail dit « ESSAI de l'alerte », jamais compté comme une sauvegarde.
- Carte « Santé » de l'admin (à faire) : lire `GET /v1/admin/sauvegarde` (dernière nuit, dernière réussite, retard, dernier essai). Code : `baticlair/apps/api/src/modules/sauvegarde/`, test `apps/api/test/sauvegarde-alerte.test.ts`.

## Décisions du 28 novembre 2026 : les manques évidents, repris sans attendre

- « Mon site » : un onglet « Modèles », le premier (dessin de chaque modèle aux couleurs choisies, « Choisi », « Revenir au modèle … ») ; avant, le choix était caché dans « Couleurs ». Sur ordinateur, l'éditeur s'ouvre sur « Modèles ».
- « Mon site » dit la date de retrait d'un site dont l'abonnement est fini (la même que l'e-mail et l'alerte, `publication.retraitLe`) avec « Reprendre l'abonnement » ; « Publier » refusé faute d'abonnement mène à l'abonnement. N'agit que quand `SITE_PUBLICATION_PAYANTE=on`.
- Profil › « Inviter des artisans » (`/compte/inviter`) : le lien d'invitation et la liste d'attente, pour les retrouver après avoir fermé l'encart de l'accueil (qui le dit). Admin › liste d'attente : lien « Qui a invité qui ».
