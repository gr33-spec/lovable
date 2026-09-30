# ADR-0003 — API NestJS séparée de l'application web Next.js

- **Date** : 2026-09-28 · **Statut** : Accepté

## Contexte
Exigence API-first (web aujourd'hui, mobile / partenaires / webhooks
demain) ; traitements longs (IA, OCR, e-mail) ; Next.js évolue vite avec
des ruptures (signalé par `AGENTS.md`).

## Options
1. Next.js seul (route handlers) + worker séparé — une app de moins, mais l'API métier suit le cycle de vie du framework d'interface.
2. Fastify / Hono + composition manuelle — léger, mais tout l'outillage de structure est à inventer.
3. **NestJS** — modules et injection de dépendances natifs (ports ↔ adapters par jetons), guards (auth, tenant), conventions largement connues, compatible OpenAPI.

## Décision
`apps/api` en NestJS, deux points d'entrée (`main.ts` HTTP, `worker.ts`
jobs) ; `apps/web` en Next.js, **interface uniquement**, qui consomme
l'API. Le cœur métier ne dépend pas de NestJS : les décorateurs restent
dans les couches `http/` et `infrastructure/`.

## Conséquences
- Deux applications à déployer (+ le worker).
- Les clients futurs (mobile, partenaires) utilisent exactement la même API.
- Session partagée web ↔ API par cookie sur le domaine parent.

## Précisions de mise en œuvre (phase 1)
- **NestJS 11** (et non 12) : la 12 est sortie le 2026-08-27 et impose
  l'ESM uniquement ; la 11 est mature et toujours corrigée. Migration vers
  la 12 à planifier quand son écosystème sera stabilisé.
- **TypeScript 5.9** (et non 7, réécriture complète du compilateur).
- **Injection explicite** : toute dépendance est déclarée par
  `@Inject(TOKEN)`, `emitDecoratorMetadata` désactivé. Les ports sont des
  jetons, jamais des classes résolues implicitement ; le comportement est
  identique en développement (tsx), en test (Vitest) et en production (tsc).
- API en ESM (`"type": "module"`, résolution NodeNext).
- Frontières vérifiées par ESLint : un module n'importe que l'`index.ts`
  d'un autre ; `domain/` et `application/` ne peuvent importer ni NestJS,
  ni Prisma, ni Better Auth.
