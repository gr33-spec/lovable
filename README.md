# BatiClair — assistant d'achat pour les artisans du bâtiment

> « Je donne mes documents au logiciel, il comprend ce qui se passe et il me
> montre uniquement ce qui mérite mon attention. »

Toute la vision, l'architecture et les décisions sont dans [`docs/`](docs/) —
commencer par [`docs/00-cadrage.md`](docs/00-cadrage.md).

## Contenu du dépôt

| Dossier | Contenu | État |
|---|---|---|
| `apps/api` | API métier NestJS : identité, entreprises, chantiers | Phase 1 en cours |
| `packages/domain` | Noyau métier pur : argent, unités, moteur de comparaison | Réel, testé |
| `docs/` | Cadrage, architecture, ADR, décisions produit | |
| `legacy/baticlair` | Premier prototype (gelé, projet npm indépendant) | Référence UX uniquement |
| `patrimoine/` | Autre produit, sans lien | Non concerné |

## Démarrer en local

Prérequis : Node.js 22.12+, pnpm 10, Docker (ou un PostgreSQL 16 local).

```bash
docker compose up -d                      # PostgreSQL
cp apps/api/.env.example apps/api/.env    # puis renseigner AUTH_SECRET
pnpm install
pnpm db:migrate                           # applique les migrations
pnpm --filter @baticlair/api dev          # API sur http://localhost:4000
```

## Vérifications (identiques à la CI)

```bash
pnpm turbo run lint typecheck test build
```

Les tests d'intégration utilisent une vraie base PostgreSQL
(`TEST_DATABASE_URL`, vidée à chaque exécution).
