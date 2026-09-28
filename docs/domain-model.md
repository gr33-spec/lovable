# Modèle de domaine

> Vocabulaire commun. En code : anglais. À l'écran : français simple.

## Glossaire

| Code | Écran (FR) | Définition |
|---|---|---|
| `Company` | Entreprise | Le client (tenant). Toutes les données lui appartiennent. |
| `Project` | Chantier | Regroupe documents, besoins, consultations, offres, factures. |
| `Takeoff` | Liste de matériaux / quantitatif | Le besoin structuré d'un chantier. |
| `Consultation` | Demande de prix | Envoi d'un besoin figé à plusieurs fournisseurs. |
| `SupplierRequest` | Demande à un fournisseur | La part d'une consultation pour un fournisseur. |
| `SupplierOffer` | Offre / devis fournisseur | La réponse chiffrée d'un fournisseur. |
| `ItemMatch` | Correspondance | Lien besoin ↔ ligne(s) d'offre. |
| `CanonicalProduct` | Produit | Un produit tel que l'entreprise le connaît. |
| `ProductAlias` | — | Une autre façon de désigner ce produit (texte, référence fournisseur). |

## Entités

### Tenancy
- **User** — identité de connexion (e-mail vérifié, OAuth).
- **Company** — `name`, `vatRegime` (`standard` / `franchise`), `activity?`.
- **Membership** — `userId`, `companyId`, `role` (`owner` | `admin` | `member` | `viewer`).
  Au MVP : un propriétaire par entreprise, rôles prêts pour plus tard.

### Chantiers et documents
- **Project** — `name`, `clientName?`, `address?`, `status` (`active` |
  `archived`, affichés « En cours » / « Terminé »), `lastActivityAt`
  (dernière action métier ; sert au tri). La recherche porte sur le nom,
  le client et l'adresse, sans accents.
- **Document** — fichier importé : `storageKey`, `originalName`, `mimeType`
  (vérifié), `sizeBytes`, `sha256`, `pageCount?`, `source` (`upload` |
  `email` | `api` | `connector`), `purpose` (`takeoff_source` |
  `supplier_offer` | `invoice` | `unknown`), `status`.
  Unicité `(companyId, sha256)` → détection de doublon.
- **DocumentProcessing** — une tentative d'analyse : `pipelineVersion`,
  `strategy` (`native_text` | `vision` | `ocr`), `status`, `aiExecutionIds`,
  `startedAt`, `finishedAt`, `errorCode?`. Un document peut être retraité ;
  l'historique est conservé.

### Besoin (quantitatif)
- **Takeoff** — `projectId`, `version`, `status` (`draft` | `needs_review` |
  `validated`), `sourceDocumentId?`, `validatedAt?`, `validatedBy?`.
- **TakeoffLine**
  - valeurs courantes : `designation`, `normalizedDesignation`, `category?`,
    `quantity` + `unit`, `dimensions?`, `technicalAttributes` (JSON),
    `reference?`, `notes?`, `position` ;
  - `lineType` : `material` | `work_item` (ouvrage à convertir, voir Q2) ;
  - `origin` : `extracted` | `manual` ;
  - `extracted` (JSON **immuable**) : ce que l'IA a produit, avec
    `confidence`, `sourcePage`, `sourceEvidence` (extrait de texte),
    `sourceRegion?` ;
  - `userEditedFields[]` : champs modifiés à la main.
- **Clarification** — `takeoffId`, `lineId?`, `kind` (`unit_ambiguous`,
  `quantity_missing`, `line_unreadable`, `possible_duplicate`,
  `work_item_needs_materials`…), `options` (JSON), `status` (`open` |
  `answered` | `dismissed`), `answer?`, `materiality` (impact estimé).

**Règle de retraitement** : une nouvelle extraction produit de nouvelles
valeurs `extracted`, mais **ne remplace jamais** un champ présent dans
`userEditedFields`. Si elle diverge d'une correction utilisateur, elle crée
une `Clarification` au lieu d'écraser.

### Fournisseurs
- **Supplier** — `name`, `notes?`, `defaultConditions?`.
- **SupplierContact** — `name?`, `email?`, `phone?`, `isPrimary`.

### Consultation
- **Consultation** — `projectId`, `takeoffId` + `takeoffVersion`,
  `reference` (code court unique, ex. `K7Q2M`, utilisé dans le sujet et
  l'adresse de réponse), `status` (`draft` | `sent` | `collecting` |
  `ready_to_compare` | `closed`).
- **ConsultationItem** — **copie figée** d'une ligne du quantitatif au
  moment de l'envoi (PD-014).
- **SupplierRequest** — `supplierId`, `contactEmail`, `status` (`draft` |
  `sent` | `delivered` | `responded` | `declined` | `no_response`),
  `sentAt?`, `remindersSent`, `lastReminderAt?`, `idempotencyKey`.
- **InboundMessage** — message reçu (e-mail ou import manuel) : `channel`,
  `fromAddress?`, `subject?`, `receivedAt`, `messageId?`, `threadId?`,
  `attachmentDocumentIds[]`, `bodyText?`, `linkStatus` (`linked` |
  `needs_review`), `linkEvidence` (quels indices ont servi au rattachement).

### Offres
- **SupplierOffer** — `supplierRequestId?` (nul si import libre),
  `supplierId`, `documentId?`, `version` (un fournisseur peut envoyer une
  offre révisée ; une seule est `current`), `offerDate?`, `validUntil?`,
  `currency`, totaux imprimés (`printedTotalHT/VAT/TTC`), `globalDiscount?`,
  `deliveryIncluded?`, `paymentTerms?`.
- **SupplierOfferLine** — `kind` (voir moteur), `designation`, `reference?`,
  `quantity` + `unit`, `packaging?` (contenu), `unitPrice`, `discountRate?`,
  `lineTotal`, `vatRate?`, `feeType?`, `relatesToLineIds[]`, provenance,
  `extracted` immuable, `userEditedFields[]`.

### Mémoire métier (privée par entreprise)
- **CanonicalProduct** — `label`, `category?`, `unit`, `attributes` (JSON :
  dimensions, épaisseur, matière…).
- **ProductAlias** — `canonicalProductId`, `supplierId?`, `supplierReference?`,
  `normalizedText`, `validatedAt`, `validatedBy`, `usageCount`.
- **ItemMatch** — `consultationItemId`, `supplierOfferId`, `lineIds[]`,
  `score`, `signals` (JSON : quels indices et avec quel poids),
  `status` (`proposed` | `confirmed` | `rejected`), `decidedBy?`.
  Une confirmation alimente `ProductAlias`.

### Comparaison
- **ComparisonRun** — `consultationId`, `engineVersion`, `inputHash`,
  `result` (JSON figé), `createdAt`. Recalculée à chaque nouvelle offre ou
  correction ; l'historique reste consultable.

### Factures (phase 6)
- **Invoice**, **InvoiceLine** (même structure de ligne que les offres).
- **PriceObservation** — prix unitaire observé pour un `CanonicalProduct`
  chez un fournisseur à une date (source : offre ou facture).
- **PriceAnomaly** — écart détecté, statut (`open` | `acknowledged` |
  `dismissed`).

### Plateforme
- **AIExecution** — voir [ai-architecture.md](ai-architecture.md).
- **OutboxEvent**, **AuditEvent**, **Notification**,
  **NotificationPreference**.
- **Connection** — intégration externe : `provider`, `scopes`, jetons
  **chiffrés**, `status` (`active` | `revoked` | `error`).
- **Plan** (configuration, pas de montant en dur dans le code), **Subscription**
  (`channel` : `stripe` | `app_store` | `play_store` | `manual`),
  **Entitlement** (droits effectifs calculés), **UsageCounter**.

## Objets-valeurs (implémentés dans `packages/domain`)

- **Money** — montant décimal exact + devise ; opérations entre devises
  interdites ; arrondi uniquement explicite.
- **Quantity** — valeur décimale ≥ 0 + **unité obligatoire**.
- **UnitCode** — liste fermée : `U, M, ML, M2, M3, L, KG, T, SAC, BOITE,
  PALETTE, ROULEAU, PAQUET, BOTTE, LOT, FORFAIT`. Un libellé inconnu donne
  `null`, jamais une supposition.
- **PackagingSpec** — contenu explicite d'un conditionnement ; seule source
  autorisée pour convertir « rouleau » en « m² ».
- **ConfidenceLevel** — `certain` / `probable` / `to_verify`.

## Règles d'unités

| Conversion | Autorisée ? |
|---|---|
| m ↔ ml | Oui (même grandeur) |
| kg ↔ t, L ↔ m³ | Oui |
| rouleau → m², sac → kg, boîte → unités | **Seulement** avec un conditionnement explicite issu du document ou d'une donnée validée |
| m² ↔ unités, ml ↔ m² | **Jamais** automatiquement (dépend du produit) |

## Persistance

- Montants : `numeric(18,4)` ; taux : `numeric(9,6)` ; quantités :
  `numeric(18,4)`. Jamais `float`.
- Clés étrangères systématiques, `companyId` indexé partout, contraintes
  d'unicité métier (`(companyId, sha256)`, `(consultationId, supplierId)`,
  `Consultation.reference`), horodatages `createdAt/updatedAt`, statuts en
  enums PostgreSQL.
