# Architecture Decision Records

Une décision structurante = un ADR court : contexte, options, décision,
conséquences. Un ADR accepté n'est pas réécrit : on le remplace par un
nouveau (« Remplacé par ADR-XXXX »).

| # | Sujet | Statut |
|---|---|---|
| [0001](0001-modular-monolith.md) | Monolithe modulaire, ports & adapters | Accepté |
| [0002](0002-monorepo-layout.md) | Monorepo pnpm + Turborepo, emplacement du code | Accepté |
| [0003](0003-backend-nestjs-separate-from-web.md) | API NestJS séparée de Next.js | Accepté |
| [0004](0004-postgresql-prisma.md) | PostgreSQL + Prisma | Accepté |
| [0005](0005-jobs-pg-boss.md) | File de jobs sur PostgreSQL (pg-boss) | Accepté |
| [0006](0006-object-storage.md) | Stockage objet S3-compatible privé | Accepté |
| [0007](0007-auth-and-tenancy.md) | Authentification (Better Auth) et isolation multi-tenant | Accepté |
| [0008](0008-ai-provider-abstraction.md) | Abstraction du fournisseur IA et sorties structurées | Accepté |
| [0009](0009-money-and-quantities.md) | Argent et quantités en décimal exact | Accepté |
| [0010](0010-email-architecture.md) | Architecture e-mail : envoi depuis la boîte de l'artisan, réception sans lecture de sa boîte | Accepté |
| [0011](0011-billing-entitlements.md) | Billing séparé des entitlements | Accepté |
| [0012](0012-deterministic-comparison-engine.md) | Moteur de comparaison déterministe | Accepté |
| [0013](0013-hosting-eu-containers.md) | Hébergement en conteneurs, région UE | Proposé |
| [0014](0014-domain-events-outbox.md) | Événements métier via outbox transactionnelle | Accepté |
