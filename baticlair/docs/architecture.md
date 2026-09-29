# Architecture

## Vue d'ensemble

**Monolithe modulaire** (ADR-0001) : un seul backend déployable, découpé en
modules aux frontières explicites, chacun organisé en **ports & adapters**.
Un **noyau métier pur** (`packages/domain`) contient les règles qui ne
dépendent d'aucun framework ni prestataire.

```
apps/web (Next.js, UI)  ──HTTP /v1──►  apps/api (NestJS)
                                         ├─ main.ts    → API HTTP
                                         └─ worker.ts  → jobs (pg-boss)
                                              │
               ┌──────────────────────────────┼─────────────────────────┐
         PostgreSQL                     Object storage            Prestataires
   (données, file de jobs,              S3 privé                  (via adapters)
    outbox d'événements)
```

Le même code backend tourne en deux processus : l'**API** (réponses
rapides, ne fait jamais de traitement long) et le **worker** (extraction,
IA, e-mails, imports massifs). Ils se partagent la base et les modules.

## Couches d'un module

```
modules/<nom>/
  domain/          entités, règles, objets-valeurs — aucune dépendance externe
  application/     cas d'usage (ex. ValidateTakeoff), ports (interfaces)
  infrastructure/  adapters : repositories Prisma, clients prestataires
  http/            contrôleurs, DTO (schémas de packages/contracts)
  index.ts         API publique du module — seule porte d'entrée
```

Règles :

1. `domain` n'importe rien d'autre que `packages/domain` et lui-même.
2. `application` dépend de `domain` et de **ports** ; jamais d'un adapter.
3. Un module n'importe jamais les fichiers internes d'un autre module,
   seulement son `index.ts`. Contrôlé par une règle ESLint
   (`no-restricted-imports`) dès la phase 1.
4. Les réactions entre modules passent de préférence par des **événements
   métier** (voir plus bas) plutôt que par des appels croisés.
5. Pas de logique métier dans `apps/web` : l'interface affiche, saisit et
   appelle l'API.

## Modules

| Module | Responsabilité | Dépend de |
|---|---|---|
| `identity` | Comptes, sessions, OAuth de connexion, suppression de compte | — |
| `tenancy` | Entreprises, membres, rôles, **contexte tenant** | identity |
| `projects` | Chantiers | tenancy |
| `documents` | Upload, validation, stockage, pipeline d'ingestion, doublons | tenancy, ai |
| `takeoff` | Quantitatif, lignes, clarifications, validation, versions | documents |
| `suppliers` | Fournisseurs, contacts, notes | tenancy |
| `consultations` | Demandes de prix, envois, relances, réponses entrantes | takeoff, suppliers, integrations |
| `offers` | Offres fournisseurs extraites, lignes typées | documents, consultations |
| `matching` | Correspondances besoin ↔ ligne, mémoire métier (alias, produits canoniques) | offers, ai |
| `comparison` | Exécution et historisation du moteur de `packages/domain` | offers, matching |
| `invoices` | Factures, observations de prix, anomalies | documents, matching |
| `notifications` | In-app, e-mail, préférences, anti-spam | événements |
| `billing` | Plans, abonnements, canaux de paiement, **entitlements**, compteurs d'usage | tenancy |
| `ai` | Port `AIProvider`, registre de prompts, traçabilité `AIExecution` | — |
| `integrations` | Connexions externes (boîtes mail, logiciels de devis), jetons chiffrés | tenancy |
| `audit` | Journal des actions sensibles | — |

## Ports (interfaces) et adapters prévus

| Port | Premier adapter | Remplaçable par |
|---|---|---|
| `AIProvider` | Anthropic | OpenAI, Mistral, Gemini, modèle local |
| `OCRProvider` | aucun au MVP (vision du modèle) | Tesseract, service OCR dédié |
| `DocumentTextExtractor` | extraction du texte natif des PDF | — |
| `StorageProvider` | S3-compatible (MinIO en local) | tout S3 |
| `JobQueue` | pg-boss | BullMQ/Redis si volumes le justifient |
| `TransactionalEmailProvider` | un service d'envoi (Resend, Brevo, Postmark…) | idem |
| `InboundEmailReceiver` | webhook d'e-mail entrant | idem |
| `MailboxConnector` | (phase 4) Gmail, Microsoft Graph | — |
| `PaymentProvider` | (phase 5) Stripe | App Store, Play Store, virement |
| `NotificationChannel` | in-app, e-mail | push mobile |
| `ProductDataProvider` | aucun | catalogues fournisseurs, bases de prix |
| `EstimatingSoftwareConnector` | import PDF / CSV | API Tolteck, etc. si disponibles |
| `AnalyticsSink` | table interne d'événements | outil d'analytics respectueux |
| `Clock`, `IdGenerator` | système | versions de test |

L'authentification passe par Better Auth (ADR-0007), encapsulée dans le
module `identity` : le reste de l'application ne connaît qu'un
`AuthenticatedUser { userId }` et un `TenantContext { companyId, role }`.

## Multi-tenant

- Toute table métier porte `companyId` (non nul, clé étrangère, indexée).
- Les repositories exigent un `TenantContext` en paramètre : il est
  **impossible** d'écrire une requête métier sans préciser l'entreprise.
- Les identifiants exposés sont opaques (UUID v7 / cuid) ; un identifiant
  d'une autre entreprise renvoie **404** (et non 403, pour ne pas révéler
  son existence).
- Tests d'intégration dédiés : pour chaque route, un utilisateur d'une
  entreprise B ne peut ni lire ni modifier une ressource de A.
- Durcissement prévu en phase 5 : Row-Level Security PostgreSQL en
  défense en profondeur (ADR-0007).

## Événements métier et outbox

Les événements (`DocumentUploaded`, `TakeoffExtracted`, `TakeoffValidated`,
`ConsultationCreated`, `SupplierRequestSent`, `SupplierOfferReceived`,
`SupplierOfferParsed`, `ComparisonCompleted`, `InvoiceAnalyzed`…) sont
écrits dans une table `outbox_event` **dans la même transaction** que la
modification métier, puis distribués par le worker aux abonnés
(notifications, analytics, webhooks futurs). Aucun événement perdu si le
processus s'arrête ; aucun Kafka.

## Jobs

- États : `queued → processing → completed | partial | failed`, avec
  nombre de tentatives, dernière erreur (sans données sensibles), durée.
- Chaque job a une **clé d'idempotence** métier (ex.
  `extract-document:<documentId>:<pipelineVersion>`) : un retry ne crée
  jamais un doublon (e-mail, offre, facture, appel IA facturé).
- Délais d'expiration par type de job ; reprise exponentielle ; au-delà,
  état `failed` visible dans l'interface avec une action « Relancer ».

## API

- REST JSON versionnée (`/v1/...`), schémas Zod partagés via
  `packages/contracts`, documentation OpenAPI générée.
- Erreurs normalisées : `{ code, message, supportId, retryable }`.
- Pagination par curseur pour toute liste.
- Écritures sensibles : en-tête `Idempotency-Key` accepté.
- Prévu plus tard : clés d'API partenaires, quotas, webhooks signés.

## Environnements

`development` (Docker Compose : Postgres, MinIO, Mailpit), `test` (base
éphémère par exécution de CI), `staging`, `production`. Configuration par
variables d'environnement validées au démarrage (l'application refuse de
démarrer si une variable obligatoire manque). Aucun secret dans Git ;
`.env.example` documente tout.

## Ce que nous ne faisons pas (volontairement)

Microservices, Kubernetes, Kafka, event sourcing, CQRS généralisé, base
vectorielle dédiée. Chacun pourra être introduit **si un problème mesuré le
justifie** ; l'architecture modulaire le permet sans réécriture.
