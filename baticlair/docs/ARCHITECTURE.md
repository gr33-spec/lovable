# Architecture de BatiClair (à jour au 21 octobre 2026)

Pour un développeur qui arrive demain : ce qui tourne, où, et comment une requête, un e-mail ou une tâche traverse le système. Les choix de fond sont dans `docs/adrs/` ; les règles produit dans `CLAUDE.md` ; le référentiel métier dans `docs/referentiel-couverture.md`. L'ancien `docs/architecture.md` décrit la cible de 2025 (worker, stockage objet) : ce document dit ce qui existe.

## 1. Vue d'ensemble

```
iPhone / navigateur
   │  HTTPS
   ▼
apps/web (Next.js 16, Vercel « baticlair », fra1)
   │  relaie /v1/* vers l'API (rewrite dans next.config.ts) : même adresse pour le navigateur
   ▼
apps/api (NestJS, Vercel « baticlair-api », fra1, une fonction serverless)
   ├─ packages/domain : le moteur métier pur (lecture → besoin → liste d'achats, groupé, comparaison)
   ├─ Prisma 7 + @prisma/adapter-pg → PostgreSQL (Neon, Francfort)
   ├─ Anthropic (lecture des devis, relecture, devis négoce)           ─ port AI
   ├─ Resend (e-mails sortants, webhook e-mails entrants)              ─ port e-mail
   ├─ Web Push (VAPID dérivé de AUTH_SECRET)                           ─ port push
   └─ API Sirene (INSEE) : vérification du SIRET, base négoces        ─ port Sirene
Tâches planifiées : Vercel Cron → GET /v1/internal/… avec Bearer CRON_SECRET
```

Trois paquets dans un monorepo pnpm + Turborepo (`baticlair/`) :

| Paquet | Rôle | Dépend de |
|---|---|---|
| `packages/domain` (`@baticlair/domain`) | Règles métier pures, sans framework ni base : référentiels par métier (`referential/data/*.ts`), moteur de calcul, groupé (regroupement, demande, choix, commande, notifications, rapport mensuel), comparaison d'offres, monnaie et quantités. Testé seul (`vitest`), publié en `dist/` que l'API importe. | rien |
| `apps/api` (`@baticlair/api`) | NestJS : modules métier, Prisma, ports et adapters (IA, e-mail, push, Sirene). Un seul processus, pas de worker : tout se fait dans la requête ou dans une tâche planifiée. | domain |
| `apps/web` (`@baticlair/web`) | Next.js App Router, téléphone d'abord, PWA (manifest, icônes, `sw.js` pour le push). Aucune donnée métier côté serveur Next : chaque écran appelle `/v1/*`. | domain (types et textes partagés) |

Pas de worker ni de file de jobs : la lecture d'un devis (deux appels IA au plus) se fait dans la requête de dépôt, bornée par la durée d'une fonction Vercel ; les envois massifs (lots, bons, relances) passent par les tâches planifiées, avec un budget de temps par passage (§5).

## 2. L'API : modules, couches, conventions

`apps/api/src/modules/<nom>/` suit toujours la même forme :

```
application/   services (cas d'usage) et ports (interfaces) ; ne connaissent ni HTTP ni Prisma directement, sauf via PrismaService
infrastructure/ adapters : dépôts Prisma, clients (Anthropic, Sirene, pdf.js)
http/          contrôleurs NestJS, schémas Zod des corps (ZodPipe), garde de session et de tenant
index.ts       seule porte d'entrée du module pour les autres
```

| Module | Ce qu'il porte |
|---|---|
| `identity` | Better Auth (e-mail + mot de passe, Google, Microsoft), session par cookie `better-auth.session_token`, `@Public()` pour les routes sans session, limite de débit des routes d'auth (`rate_limit`). |
| `tenancy` | Entreprises, membres, rôles ; le `TenantContext { userId, companyId, role }` posé par le `TenantGuard` depuis l'en-tête `x-company-id`. Toute table métier porte `companyId` ; un id d'une autre entreprise répond 404. |
| `projects` | Chantiers, « prochaine action » de l'accueil. |
| `documents` | Dépôt des PDF (octets magiques, 20 Mo, 60 pages, envoi en morceaux `upload_part` au-delà de 4 Mo), texte par page (pdf.js), stockage en base (`document_blob`). |
| `takeoff` | La lecture du devis (prompt A §41.1, modèle le plus capable), la relecture (prompt B), la fiche de chantier, les questions de comptoir, la liste d'achats ; version du référentiel figée par chantier (`referential_snapshot`). |
| `quantitatifs` | Porte d'entrée `/v1/quantitatifs` (PDF ou lignes) pour l'app et les partenaires ; `POST /v1/projects/:id/liste` pour « J'ai déjà ma liste » (photo ou PDF d'une liste déjà comptée, lue sans calcul : `ListeReader`, faux lecteur à trois listes enregistrées en test). |
| `suppliers`, `price-requests`, `offers` | Carnet de fournisseurs, demandes de prix (copie figée de la liste, PDF joint, e-mail), devis fournisseurs reçus et lus, comparaison. |
| `learning` | Mémoire de l'entreprise (habitudes, consommables), journal des corrections, règles « à vérifier » confirmées. |
| `ai-usage` | Chaque appel IA journalisé (`ai_execution`), budget mensuel, compteur d'analyses par mois (paliers). |
| `billing` | Essai, formules, activation par code, demande de formule ; `PAYWALL` l'allume. |
| `partners` | Clés API de partenaires (hachées), quota mensuel. |
| `privacy` | Export et suppression du compte, CGU acceptées, purge des comptes inactifs (3 ans). |
| `demo` | Chantier et fournisseurs fictifs pour tester seul (`@demo.baticlair.fr`). |
| `health` | `/v1/health` : base, drapeaux (`features.groupe`…). |
| `groupe` | BatiClair Groupé : état et étapes de l'onglet, besoins, base négoces (saisie + Sirene), regroupement, demandes, réponses (page sans compte, webhook e-mail), choix, bons de commande, factures de commission, livraisons, désistements, notifications, admin, rapport mensuel, jeu de démonstration. |

Transversal, dans `src/platform/` : configuration validée par Zod (`config/config.ts`, toute variable y est déclarée), journal structuré avec masquage des secrets, filtre d'erreurs (`DomainError` → codes HTTP et `reason` lisibles par l'app), idempotence (`Idempotency-Key` → `idempotency_record`), limites de débit (`@Throttle({ default: HOURLY(n) })`, compteurs en base `api_rate_limit`), e-mail (Resend, console, capture en test, désactivé), push (web-push, clés VAPID dérivées d'`AUTH_SECRET`), alertes (e-mail ou webhook).

## 3. Les tables (Prisma, `apps/api/prisma/schema.prisma`)

Migrations appliquées par `vercel-build` (`prisma migrate deploy`) ; une migration poussée ne se modifie jamais (`prisma/migrations/empreintes.json` + test `migrations-figees`).

| Domaine | Tables | Notes |
|---|---|---|
| Comptes | `user`, `session`, `account`, `verification`, `push_subscription` | Better Auth ; `user.cguAccepteLe/cguVersion` ; un appareil abonné au push par ligne. |
| Entreprises | `company`, `membership` (rôles owner/member/viewer), `company_preference`, `partner_api_key` | `company.siretVerifieLe` ouvre le groupé ; `contactEmail` sinon l'e-mail du propriétaire pour les envois. |
| Chantiers et documents | `project`, `document`, `document_blob`, `document_processing`, `document_page`, `upload_part` | Le PDF vit en base (`document_blob`), chargé seulement pour le lire. |
| IA | `ai_analysis` (unité des paliers), `ai_execution` (chaque appel : modèle, jetons, coût) | |
| Quantitatif | `takeoff`, `takeoff_line`, `quantitatif`, `referential_snapshot`, `rule_confirmation`, `consumable_habit`, `correction_event` | `takeoff.lecture` garde la lecture brute du modèle ; `answers` les réponses de l'artisan. |
| Fournisseurs | `supplier`, `price_request`, `price_request_recipient` (`etiquette` : l'étiquette de réponse, R7), `supplier_offer`, `supplier_offer_line` | La demande est une copie figée de la liste. |
| Adresse Mobiiz (R7, 27 octobre) | `adresse_mobiiz` (nom avant le @, `courante`, jamais réattribué), `email_recu_artisan` (expéditeur, objet, texte, demande et chantier quand rattaché, `lu_le`), `email_recu_fichier` (pièces jointes en base, `document_id` quand le PDF est devenu le devis reçu) | `company.adresse_mobiiz_vue_le` : l'écran dédié a été vu. |
| Achat groupé automatique (27 octobre) | `regroupement_negocie` (`mode` automatique, `cloture_le`, `reponse_avant_le`, `consulte_le`, `analyse_le`, `pas_assez_le`, `commission_pct`, `meilleure_id`), `besoin_negocie` (`desiste_le`, `consultation_commande_id`, `prix_commande_ht`), `negoce_participant`, `consultation_achat_groupe` (jeton haché, offre, devis PDF, lecture, statut valide/douteuse), `desistement_achat_groupe`, `alerte_achat_groupe`, `facture_commission_mensuelle` ; `company.alertes_achats_groupes`, `company.naf` | Module `achat-groupe` ; mode `automatique` par défaut. |
| Technique | `idempotency_record`, `rate_limit`, `api_rate_limit`, `parametre_groupe` | `parametre_groupe` : curseurs de l'import Sirene, entreprises déjà servies par le rapport mensuel. |
| Groupé | `besoin`, `negoce`, `negoce_artisan`, `negoce_sirene`, `lot_groupe`, `reponse_negoce`, `reponse_negoce_fichier`, `offre_artisan`, `bon_commande`, `livraison`, `journal_groupe`, `accord_negoce`, `facture_negoce`, `desistement` | Un négoce = une ligne par (e-mail, département) ; un lot = (référence, famille, zone, fenêtre) ; `journal_groupe` est la trace visible par l'admin. |
| Commande commune et espace négoce (22-23 octobre) | `cycle_commande` (`retenuId`, `garantieJusquau`), `grille_negoce` (`prix`, `nonGarantis`, `livraison` figée : dépôts, paliers, distances), `choix_artisan`, `commande_garantie`, `compte_negoce` (e-mail, SIRET, enseigne, paliers, conditions acceptées, désabonnement), `depot_negoce` | Une commande = (jour de clôture, famille, zone) ; un compte négoce porte 1 à n dépôts et des paliers communs ; une ligne `negoce` par département rattachée au compte = un abonnement (`stopLe` = désabonné). |

Cycle d'un lot : `besoin.statut` en_attente | signe → engage → commande → livre (ou retire) ; `lot_groupe.statut` ouvert → forme → envoye → choisi (ou clos | annule).

## 4. Les routes HTTP (`/v1/…`)

Toutes exigent une session et un `x-company-id` sauf celles marquées « public » ou « interne ». Les corps sont validés par Zod ; une erreur métier répond `{ error: { code, reason } }`.

| Famille | Routes | Rôle |
|---|---|---|
| Auth (public) | `/v1/auth/*` (Better Auth), `GET /v1/health` | Inscription, connexion, mot de passe, OAuth ; état du service. |
| Moi | `GET/DELETE /v1/me`, `GET /v1/me/export`, `GET/POST /v1/me/cgu`, `GET/POST /v1/me/notifications`, `POST …/push`, `…/prompted`, `GET …/push-key` | Compte, RGPD, CGU, notifications. |
| Entreprise | `POST /v1/companies`, `GET/PATCH /v1/company/profile`, `PATCH /v1/company/trades`, `GET/PUT/DELETE /v1/company/logo`, `GET /v1/metiers` | Coordonnées, SIRET, logo, métiers. |
| Chantiers | `GET/POST /v1/projects`, `GET/PATCH /v1/projects/:id`, `GET /v1/next-actions`, `…/infos` | |
| Adresse Mobiiz (R7) | `GET /v1/company/adresse-mobiiz`, `POST …/vue`, `POST …/verifier`, `PUT /v1/company/adresse-mobiiz` (une fois) ; `GET /v1/recus[?projectId]`, `GET /v1/recus/demandes`, `GET /v1/recus/:id`, `GET …/fichiers/:fichierId`, `POST /v1/recus/:id/rattacher` | L'adresse de l'entreprise ; les e-mails reçus dessus, leurs fichiers, le rattachement à une demande. |
| Documents | `GET/POST /v1/projects/:id/documents`, `GET/DELETE /v1/documents/:id`, `GET …/file`, `PUT /v1/uploads/:id/parts/:index`, `POST /v1/documents/:id/takeoff` | Dépôt (en morceaux au-delà de 4 Mo), lecture. |
| Quantitatif | `GET /v1/projects/:id/takeoff`, `POST /v1/takeoffs/:id/{answers,decisions,lines,validate,reopen}`, `PATCH/DELETE /v1/takeoff-lines/:id`, `POST …/confirm`, `POST /v1/quantitatifs`, `…/reponses` | Questions, liste, validation. |
| Fournisseurs | `/v1/suppliers`, `/v1/projects/:id/price-requests` (+ `preview`), `/v1/price-requests/:id/*` (recipients, analysis, order, comparison, classification, PDF), `/v1/price-request-recipients/:id/{send,quote,analysis}`, `PATCH /v1/offer-lines/:id`, `/v1/price-requests/settings` | Demandes de prix, devis reçus, comparaison, commande. |
| Mémoire | `DELETE /v1/memoire`, `GET /v1/corrections/export.csv` | |
| Formules, partenaires, démo | `/v1/billing`, `/v1/billing/{activate,request}`, `/v1/partner-keys`, `/v1/ai-usage`, `/v1/demo/project`, `/v1/demo/recipients/:id/quote`, `POST /v1/client-errors` | |
| Groupé, artisan | `GET /v1/groupe`, `POST /v1/groupe/siret`, `GET /v1/groupe/lots`, `GET /v1/groupe/offres`, `GET /v1/groupe/economies`, `GET/POST /v1/projects/:id/groupe`, `POST /v1/groupe/besoins/:id/signer`, `DELETE /v1/groupe/besoins/:id`, `POST /v1/groupe/offres/:id/{probleme,reference}`, `POST /v1/groupe/bons/:id/{livraison,desistement}`, `GET/POST /v1/groupe/negoces`, `PATCH/DELETE …/:id`, `GET …/message`, `GET …/suggestions?q=`, `POST …/boucle` (« Mets ton négoce dans la boucle », 23 octobre) | Toutes 404 quand `GROUPE=off` ; « ouvert » exige le SIRET vérifié et un département ouvert. |
| Groupé, négoce (public) | `GET/POST /v1/reponse/:jeton`, `GET …/contrat.pdf`, `POST /v1/negoces/lien/apercu`, `POST /v1/negoces/lien`, `POST /v1/webhooks/resend` | Page de dépôt sans compte (jeton haché), liens « pas concerné » / « stop » signés (180 jours), réponse par e-mail (signature Svix). |
| Groupé, admin | `GET /v1/admin/groupe`, `GET …/lots/:id`, `POST …/lots/:id/{forcer,clore,annuler,negoce}`, `POST …/factures/:id/payee`, `GET …/factures.csv` | `GROUPE_ADMINS` (sinon `REFERENTIAL_VALIDATORS`). |
| Commande commune, artisan | `GET /v1/commande-du-mois[?projectId]` (commandes, prochaine clôture, grilles garanties), `POST /v1/projects/:id/commande-du-mois`, `DELETE /v1/commande-du-mois/lignes/:id`, `POST /v1/commande-du-mois/:cycleId/commander`, `POST …/:cycleId/recommander` (grille garantie) | Le bon part au négoce choisi seulement, après confirmation à l'écran. |
| Commande commune, négoce (jeton de grille, public) | `GET/POST /v1/grille/:jeton` (dépôt : PDF, `fermes` obligatoire, `nonGarantis[]`) | 409 `inscription_requise` sans compte inscrit ; 400 `prix_fermes_requis`. |
| Espace négoce (`/v1/negoce/*`) | `GET invitation/:jeton`, `POST inscription`, `POST connexion` (lien magique), `POST connexion/:jeton`, `POST deconnexion`, `GET/PUT/DELETE compte`, `POST desabonner`, `POST desabonner/:jeton`, `GET conditions` | Jetons HMAC signés (`jetons-negoce.ts`) : invitation 90 jours, connexion 30 minutes, session 30 jours (cookie `bc_negoce`, HttpOnly, SameSite=Lax), désabonnement 180 jours. |
| Commande commune, admin | `GET/PUT /v1/admin/commande-du-mois/config`, `POST …/cycles/:id/dates`, `GET …/negoces` (inscrits, invités, désabonnés, taux de réponse par cycle, commandes par négoce retenu) | `GROUPE_ADMINS`. |
| Interne (Bearer `CRON_SECRET`) | `GET /v1/internal/purge-inactive`, `GET /v1/internal/groupe/regrouper`, `GET /v1/internal/groupe/sirene`, `GET /v1/internal/rapport-mensuel`, `POST/DELETE /v1/internal/demo/jeu` (jamais en production), `GET /v1/internal/test/emails` (test seulement) | Les tâches ; `?maintenant=` n'est lu qu'en `NODE_ENV=test`. |

## 5. Les tâches planifiées (`apps/api/vercel.json` → crons, UTC)

| Heure | Route | Ce qu'elle fait |
|---|---|---|
| 03:17 chaque jour | `purge-inactive` | Efface les comptes sans visite depuis 3 ans et les morceaux d'envoi abandonnés. |
| 05:00 chaque jour | `groupe/sirene` | Import de la base négoces Sirene, page par page, un cycle complet par mois (curseur dans `parametre_groupe`, 40 s par passage). |
| 06:00 chaque jour | `groupe/regrouper` | Dans l'ordre : ranger les besoins libres dans les lots et former ceux au seuil (plus tous les lots signés un lundi sur deux) → envoyer les demandes des lots formés aux négoces → décider les lots envoyés (tous ont répondu ou 7 jours) → bons de commande, facture de commission, relances (factures échues, livraisons à J+15) → « Livraison aujourd'hui ». Budget de 40 s par passage : une étape s'arrête à l'échéance, lot entier par lot entier, et reprend le lendemain (`tempsEpuise` dans la réponse). |
| 07:00 le 1er du mois | `rapport-mensuel` | « Ce mois : X chantiers lus, Y € économisés au groupé, Z lots » à chaque entreprise qui a quelque chose à lire, jamais deux fois. |

Chaque étape est rejouable : elle ne regarde que des statuts (`forme`, `envoye`, `choisi`, `relanceLe` nul…), jamais l'heure du dernier passage. Les mêmes services s'appellent aussi depuis l'app : un lot formé par le seuil part aux négoces dès la proposition, un lot dont tous les négoces ont répondu se décide dès le dernier dépôt.

Recentrage (25 octobre 2026) : `/v1/internal/demandes-perso` à 9 h 35 UTC (relances de la demande perso à 48 h ouvrées).

Revue lot A (26 octobre 2026) : `/v1/internal/reprises` à 4 h 23 UTC passe la file de reprise (`platform/reprise/`) ; comme le plan Hobby n'autorise qu'une tâche par jour, la file est aussi passée au fil des requêtes (au plus toutes les 5 min, bail de 10 min en base, `waitUntil`). Les webhooks Stripe et Resend notent chaque événement traité (`evenement_traite`) et ignorent un rejeu. L'IA passe par un seul contrat (`platform/ai/lecteur-ia.ts`, fabrique `fabriqueIa`, `AI_PROVIDER` = anthropic, openai ou enregistre).

Achat groupé (27 octobre 2026) : `/v1/internal/achats-groupes` à 10 h 23 UTC, après la clôture de 10 h : rappel de la veille aux artisans, clôtures (demandes aux négoces ou plan B), analyses à l'échéance, résumés d'alertes, factures de commission le 1er.

Routes de l'achat groupé : `GET /v1/achats-groupes` (mes cartes), `GET …/pres-de-chez-moi`, `GET …/catalogue?q=`, `GET …/negoces?q=`, `POST /v1/achats-groupes` (lancer), `POST …/ouverts/:achatId/rejoindre`, `GET|PUT …/:besoinId`, `DELETE …/:besoinId/negoces/:participantId`, `GET …/:besoinId/prevenir`, `POST …/negoces/:participantId/prevenu`, `POST …/:besoinId/retirer|desister|commander|plan-b`, `GET …/:besoinId/bon.pdf`, `GET|POST /v1/projects/:projectId/achat-groupe` (depuis une liste), `GET|PUT /v1/me/alertes-achats-groupes` ; public : `GET|POST /v1/public/achat-groupe/:jeton` ; admin : `GET /v1/admin/pilotage/achats-groupes`, `PUT …/volume-min`, `POST …/consultations/:id/valider`, `GET …/consultations/:id/devis.pdf`. Variables : `MODE_REGROUPEMENT` (automatique | humain | mois), `DELAI_REPONSE_NEGOCE_JOURS` (3), `ALERTES_ACHATS_GROUPES_JOUR` (2), `COMMISSION_LANCEMENT`, `COMMISSION_LANCEMENT_PREMIERS` (20), `BUDGET_IA_JOUR` (2 €).

## 6. Les variables d'environnement (validées au démarrage, `src/platform/config/config.ts`)

| Groupe | Variables | Notes |
|---|---|---|
| Socle | `NODE_ENV`, `PORT`, `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED` pour les migrations), `AUTH_SECRET`, `WEB_APP_URL`, `API_PUBLIC_URL`, `LOG_LEVEL`, `RATE_LIMIT`, `VERCEL_ENV` | `AUTH_SECRET` signe les sessions, les liens des négoces et les clés VAPID. |
| OAuth | `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET` | Facultatifs. |
| IA | `AI_PROVIDER` (anthropic | fake), `ANTHROPIC_API_KEY` ou `BATICLAIR_ANTHROPIC_KEY`, `AI_EXTRACTION_MODEL`, `AI_EXTRACTION_EFFORT`, `AI_QUANTITATIF` (on/off), `AI_QUANTITATIF_MODEL`, `AI_MONTHLY_BUDGET_EUR`, `AI_ANALYSIS_MAX_EUR`, `AI_USD_TO_EUR`, `READING_ANSWER_WITHIN_MS` | `fake` en test et en e2e : aucun appel. |
| Documents | `DOCUMENT_MAX_BYTES` (20 Mo), `DOCUMENT_MAX_PAGES` (60) | |
| E-mail | `EMAIL_PROVIDER` (resend | console | capture | disabled), `RESEND_API_KEY`, `EMAIL_DOMAINE`, `EMAIL_EXPEDITEUR` (ou `EMAIL_FROM`), `EMAILS_AUTORISES` et `EMAIL_REDIRECTION` (liste blanche de la prévisualisation, `docs/groupe/EMAILS.md`), `REPONSES_DOMAINE`, `RESEND_WEBHOOK_SECRET` | `REPONSES_DOMAINE` donne l'adresse `lot-<n°>@…` en `Reply-To` ; le webhook reçoit `email.received`. |
| Alertes | `ALERT_EMAIL`, `ALERT_WEBHOOK_URL` | Erreurs serveur et dépassements de budget IA. |
| Formules | `PAYWALL`, `BILLING_PLANS`, `PLAN_ACTIVATION_CODES`, `REFERENTIAL_VALIDATORS` | |
| Tâches | `CRON_SECRET` | Vercel l'envoie en `Bearer`. |
| Groupé | `GROUPE` (on/off), `GROUPE_DEPARTEMENTS` (`22,29` ou `*`), `GROUPE_ADMINS`, `SIRET_VERIFICATION` (insee | forme, `forme` refusé en production), `INSEE_API_KEY`, `SIRENE_DEPARTEMENTS`, `SIRENE_NAF`, `FACTURE_EMETTEUR_{NOM,FORME,SIRET,ADRESSE,TVA}`, `FACTURE_TVA_POURCENT` | Détail et valeurs de production dans `docs/groupe/MISE-EN-PROD.md`. |

Côté web : `API_URL` (cible du relais `/v1/*`), rien d'autre.

Recentrage (25 octobre 2026) : `ZONES_ACTIVES` (« 22 » ; « * » = partout), `SEUIL_LIGNE_GROUPABLE` (1 000), `SEUIL_ANONYMAT` (5), `SEUIL_VOLUME_MIN` (JSON par famille), `PRIX_REPERES` (JSON famille → unité → € HT), `FAMILLES_GROUPABLES`, `LECTURES_GRATUITES_MOIS` (2), `SEUIL_ZONE_ACTIVE` (10). Module `apps/api/src/modules/recentrage` (droits, demande perso, regroupements, hypothèses).

## 7. Les flux e-mail

Tout e-mail sort par le port `TransactionalEmailSender` (`src/platform/email/`) : Resend en ligne, `console` en développement, `capture` en test (lu par `GET /v1/internal/test/emails` dans les parcours e2e). Texte toujours, HTML quand la mise en forme compte. `mustDeliver: true` fait échouer la requête si l'e-mail ne part pas (une demande au fournisseur) ; sinon l'échec est journalisé et l'action continue.

| Flux | Déclencheur | Destinataire | Contenu |
|---|---|---|---|
| Compte | Better Auth | artisan | « Confirmez votre adresse e-mail », « Réinitialisation de votre mot de passe ». |
| Demande de prix | artisan, écran d'envoi | fournisseur | Objet et corps générés par le domaine, PDF « demande de devis » (+ « Détail du chantier (sans prix) » si coché). R7 : `From` « {Entreprise} via Mobiiz <adresse@mobiiz.fr> », `Reply-To` `adresse+r<étiquette>@mobiiz.fr`, `[réf. <étiquette>]` dans l'objet ; sans `EMAIL_DOMAINE`, `Reply-To` l'artisan comme avant. |
| Réponse d'un négoce (R7) | Resend → `POST /v1/webhooks/resend` | artisan (push + e-mail personnel) | L'e-mail est gardé (`email_recu_artisan`), rattaché à sa demande par l'étiquette ou le repère (son PDF devient le devis reçu), sinon « Mes reçus » ; « {Négoce} t'a répondu par e-mail ». Jamais vers une adresse du domaine (boucle). |
| Devis lu, liste prête | fin de lecture (`takeoff.module.ts`) | artisan (push seulement) | « Ton devis est lu » (questions à répondre) ou « Ta liste est prête ». |
| Groupé, négoce | tâche `regrouper` | chaque négoce du département concerné (une agence par département) | Demande « Regroupement artisans » avec la phrase de commission en gras, le PDF (volumes fermes et probables, livraison par chantier sans nom de client), le lien de dépôt unique, « pas concerné » et « stop » ; `Reply-To lot-<n°>@REPONSES_DOMAINE`. Puis : relance quand il répond par e-mail sans déposer ; bons de commande + récapitulatif quand il est retenu ; facture de commission 2 % (30 jours) et sa relance ; « une commande annulée » après un désistement. |
| Groupé, artisan | tâche et actions | artisan (push + e-mail) | Les quatre messages de la section 3 : besoin accepté, demande partie, négoce retenu (avec son bon en PDF), livraison du jour ; relance à J+15 ; avertissement après un désistement. Jamais le nom ni le nombre des autres artisans. |
| Rapport mensuel | tâche du 1er | artisan | « Ce mois : X chantiers lus, Y € économisés au groupé, Z lots ». |
| Espace négoce (23 octobre) | ajout par un artisan, clôture, relance, résultats, commande | négoce (compte) | Invitation « Un regroupement de couvreurs vous a ajouté à la Commande commune : créez votre accès » (lien `/negoce/rejoindre/<jeton>`, un envoi par semaine au plus, jamais le nom de l'artisan) ; lien de connexion (30 minutes) ; à la clôture « La grille du 15 octobre est prête (22) : N articles à chiffrer » avec « Se désabonner » ; au négoce invité jamais inscrit « La grille … est prête : créez votre accès pour la chiffrer » (3 cycles au plus) ; relance la veille ; résultats (retenu ou message neutre) ; bon de commande PDF (« Prix ferme de la Commande commune du … » ou « Commande sur grille garantie du … »). Alertes à Greg (`commande_commune`) : département sans négoce inscrit, aucune réponse 48 h avant la limite, grille retenue à plus de 30 % non garantie. |
| Entrant | Resend → `POST /v1/webhooks/resend` (signature Svix) | — | Un négoce répond à `lot-<n°>@…` : aucun fichier n'est pris ; il reçoit un lien de dépôt neuf (l'ancien meurt), le journal du lot note `reponse_par_email`. |

## 8. Le web (`apps/web/src`)

- `app/(public)/decouvrir` : la page publique, servie à la place de `/` quand il n'y a pas de cookie de session (`proxy.ts`) ; la démo guidée derrière « Voir comment ça marche (30 s) », jamais ouverte d'office (`DemoSurBouton`, fenêtre plein écran, `/?demo` l'ouvre aussi).
- `app/(auth)/…` : connexion, inscription (case CGU), pages légales, page de dépôt du négoce (`/reponse/[jeton]`), liens des négoces (`/negoces/lien/[jeton]`).
- Espace négoce (`app/(auth)/negoce/…`, vouvoiement) : `rejoindre/[jeton]` (inscription en une page : dépôts, paliers, départements, conditions), `connexion` et `connexion/[jeton]` (lien magique), la page `/negoce` (prochaine clôture, grilles à chiffrer, commandes reçues, réglages, abonnements, suppression), `conditions`, `desabonner/[jeton]` ; la grille `grille/[jeton]` (case « Prix fermes, quel que soit le volume final », « Prix non garanti » par article, zones en communes). Côté artisan (`components/commande-du-mois.tsx`) : confirmation avant « Commander », « Ne livre pas ta zone », prix indicatifs à part, bloc « Prix garantis jusqu'au … » avec « Recommander à ce prix ».
- `app/(app)/…` : l'app connectée derrière `SessionGate` (`/v1/me` + `/v1/health` au chargement) : accueil, chantiers (dépôt → questions → « Ton chantier » → envoi), fournisseurs (carnet + « Mes négoces »), groupé (« Mes lots »), compte, formules, admin du groupé.
- `lib/api.ts` : un seul client `fetch` qui pose `x-company-id` et `Idempotency-Key` ; `lib/fr.ts` : les textes ; `lib/aide.ts` : l'aide « ? » ; `components/` : un composant par écran ou par bloc.
- Sécurité : CSP dans `next.config.ts` (aucune ressource tierce), `X-Robots-Tag: noindex` tant que le site n'est pas ouvert, voir `docs/SECURITE.md`.

## 9. Tests et livraison

| Niveau | Où | Commande |
|---|---|---|
| Domaine | `packages/domain/test` (661 tests, dont la non-régression des 179 lectures et la règle numéro un sur les 22 tiroirs) | `npx vitest run` |
| API | `apps/api/test` (388 tests, base Postgres locale, IA et e-mail factices) | `TEST_DATABASE_URL=… CI=true npx vitest run` |
| Charge | `apps/api/test/charge.test.ts` | `CHARGE=1 …` (voir `docs/PERFORMANCE.md`) |
| Bout en bout | `apps/web/e2e` (Playwright, téléphone Pixel 7 et ordinateur, 110 parcours ; base vidée à chaque série) | `CI=true E2E_DATABASE_URL=… npx playwright test` |

CI GitHub (`.github/workflows/ci.yml`) : lint, types, tests, build, puis les parcours e2e sur les deux projets. Déploiement : chaque push sur `main` déploie les deux projets Vercel (`vercel-build` de l'API applique les migrations) ; seules `main` et la branche de #284 ont une prévisualisation (`git.deploymentEnabled` dans les deux `vercel.json`). Mise en production du groupé : `docs/groupe/MISE-EN-PROD.md`.

## 10. Comment suivre une requête (exemple : « Proposer au groupé »)

1. L'écran « Ton chantier » (`components/supply-list.tsx` → `components/groupe.tsx`) envoie `POST /v1/projects/:id/groupe` avec les lignes cochées, la fenêtre, « signé » et l'engagement, et une `Idempotency-Key`.
2. `GroupeController` (`modules/groupe/http`) : session (`SessionGuard`), entreprise (`TenantGuard`), drapeau `GROUPE`, corps validé par Zod.
3. `GroupeService.proposer` : le groupé est-il ouvert à l'entreprise (SIRET vérifié, département ouvert, pas d'exclusion) ; chaque ligne vient du quantitatif validé (`takeoff`), clé de référence et famille par le domaine (`cleDeReference`, `familleDuMetier`), plafond 3 × médiane (`RegroupementService.plafond`), puis `besoin` créés dans une transaction.
4. `RegroupementService.ranger` : le besoin rejoint le lot ouvert de sa (référence, zone, fenêtre) ou en ouvre un ; si le seuil est atteint, le lot passe « formé » et `DemandeService.envoyerLesLotsFormes` l'envoie aux négoces.
5. `NotificationsGroupeService.prevenir` : push et e-mail « Tes 1 250 pièces de … sont dans le groupé … ».
6. L'écran recharge `GET /v1/projects/:id/groupe` et montre « Au groupé ».

Tout ce qui est décidé seul pendant une mission est dans `docs/DECISIONS.md` ; la dette connue dans `docs/DETTE.md`.
