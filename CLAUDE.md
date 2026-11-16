@AGENTS.md

# Mobiiz — contexte

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
- Chaque ligne dit son origine quand la liste mêle les deux : « Dit par toi », « Calculé », « À vérifier ».
- Admin › « Corrections les plus fréquentes » : la ligne proposée et la ligne corrigée, sur 90 jours, sans nom d'entreprise ni de chantier.

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
