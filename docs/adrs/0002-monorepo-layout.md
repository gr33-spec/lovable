# ADR-0002 — Monorepo pnpm + Turborepo

- **Date** : 2026-09-28 · **Statut** : Proposé (emplacement final dépendant de Q1)

## Contexte
Le dépôt contient BatiClair (prototype Next.js à la racine, npm) et
`patrimoine/` (autre produit). Le nouveau produit a besoin de plusieurs
paquets partagés (domaine, contrats, UI, i18n) et de deux applications.

## Décision
- pnpm workspaces + Turborepo (cache, tâches parallèles), TypeScript strict partout.
- Arborescence cible : `apps/{web,api}`, `packages/{domain,contracts,ui,i18n}`, `tools/ai-evals`, `fixtures/`, `docs/`.
- `patrimoine/` n'est pas concerné.
- **En attendant Q1**, `packages/domain` est un paquet autonome (son propre
  `package.json`, sans workspace racine) pour ne rien modifier de
  BatiClair. Le passage en workspace se fera à la phase 1.

## Options pour BatiClair (Q1)
- A : évoluer sur place — déconseillé.
- B : geler dans `legacy/baticlair/`, garder en service jusqu'au remplacement — **recommandé**.
- C : nouveau dépôt dédié.

## Conséquences
Le déploiement Vercel actuel de BatiClair (racine du dépôt) devra pointer
vers `legacy/baticlair/` si l'option B est retenue.
