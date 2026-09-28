# Roadmap

Construction **verticale** : un parcours complet et excellent avant
d'élargir.

## Phase 0 — Cadrage ✅ (2026-09-28)

- Documentation, ADR, décisions produit.
- `packages/domain` : argent, quantités, unités, offres, contrôle
  arithmétique, moteur de comparaison v0.2.0 — 52 tests.

## Phase 1 — Fondations (en cours)

Fait (2026-09-28) :
- ✅ BatiClair gelé dans `legacy/baticlair/` ; monorepo pnpm + Turborepo.
- ✅ `apps/api` NestJS : configuration validée, logs JSON corrélés
  (`requestId`, `userId`, `companyId`), erreurs normalisées avec code support,
  en-têtes de sécurité, CORS.
- ✅ Auth (Better Auth) : inscription, connexion, vérification d'e-mail,
  réinitialisation du mot de passe, sessions ; e-mails via un port
  (adapters de développement uniquement pour l'instant).
- ✅ Entreprise + appartenance + contexte tenant ; chantiers (création,
  liste paginée, lecture, modification, archivage) ; rôle lecture seule.
- ✅ Tests d'intégration sur PostgreSQL réel, dont isolation entre entreprises.
- ✅ ESLint avec règles de frontières de modules ; CI GitHub Actions.

Reste :

- `apps/web` (Next.js) : inscription, onboarding, liste de chantiers ;
  `packages/{contracts,ui,i18n}`.
- Adapter e-mail réel (transactionnel) ; suppression de compte.
- `StorageProvider` S3, `JobQueue` pg-boss + worker, outbox d'événements.
- `AIProvider` + `FakeAIProvider` + registre de prompts + `AIExecution`.
- Logs structurés, `requestId`/`supportId`, erreurs normalisées.
- Design system : jetons + composants de base + layout mobile/desktop.
- CI : lint, typecheck, tests, build.

**Terminé quand** : inscription → entreprise → chantier fonctionne en local
et en CI, avec tests d'isolation verts.

## Phase 2 — Premier parcours réel

Upload → validation → stockage → job → texte/vision → extraction
(adapter Anthropic) → normalisation → quantitatif → clarifications →
édition → validation. Datasets d'évaluation initiaux. E2E complet.

**Terminé quand** : un vrai PDF de devis produit une liste validée, en
conditions réelles, avec reprise après échec du fournisseur IA.

## Phase 3 — Consultation et comparaison

Fournisseurs ; consultation (instantané) ; **connexion de la boîte mail
Gmail / Outlook et envoi depuis celle-ci** (ADR-0010, avancé depuis la
phase 4) ; **réception par double adresse de réponse** ; lancement de la
vérification de l'application OAuth par Google ; import
manuel d'offres ; extraction des offres ; matching (règles + mémoire +
IA) ; confirmations ; comparaison branchée sur le moteur ; synthèse ;
comparateur desktop/mobile ; négociation.

## Phase 4 — E-mail avancé et notifications

Rattachement avancé (transferts, fils, sujets modifiés), autres
messageries, notifications configurables, relances.

## Phase 5 — Lancement

Plans, essai (Q5), paywall, Stripe, entitlements, compteurs d'usage ;
onboarding soigné ; pages publiques (landing, tarifs, CGU,
confidentialité, mentions légales, contact) ; durcissement (RLS,
antivirus, revue sécurité) ; sauvegardes testées ; hébergement de
production UE ; migration BatiClair si nécessaire.

## Phase 6 — Factures

Import massif, historique de prix, anomalies, contrôle facture ↔ offre.

## Phase 7 — Intégrations

Connecteurs de logiciels de devis, share sheet / mobile, API partenaires,
données produit externes.

## Changements proposés par rapport au prompt initial

1. Réception des réponses par **adresse dédiée dès la phase 3** : la
   comparaison devient utile sans attendre l'OAuth (et sans scope Gmail
   restreint).
2. **Validation terrain avant la phase 3** (S7) : 5 artisans, leurs vrais
   documents.
3. Le module factures pourrait être avancé si la validation terrain montre
   qu'il apporte plus de valeur que la mise en concurrence (risque produit
   n°1) — décision à prendre ensemble après la phase 2.
