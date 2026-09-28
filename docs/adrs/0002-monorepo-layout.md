# ADR-0002 — Monorepo pnpm + Turborepo

- **Date** : 2026-09-28 · **Statut** : Accepté (option B, après la réponse du fondateur à Q1 : aucun utilisateur réel)

## Contexte
Le dépôt contient BatiClair (prototype Next.js à la racine, npm) et
`patrimoine/` (autre produit). Le nouveau produit a besoin de plusieurs
paquets partagés (domaine, contrats, UI, i18n) et de deux applications.

## Décision
- pnpm workspaces + Turborepo (cache, tâches parallèles), TypeScript strict partout.
- Arborescence cible : `apps/{web,api}`, `packages/{domain,contracts,ui,i18n}`, `tools/ai-evals`, `fixtures/`, `docs/`.
- `patrimoine/` n'est pas concerné.
- BatiClair est déplacé tel quel dans `legacy/baticlair/` (projet npm
  indépendant, hors de l'espace de travail pnpm), comme `patrimoine/`.
  L'historique git est conservé (déplacement, pas suppression).

## Options pour BatiClair (Q1)
- A : évoluer sur place — déconseillé.
- B : geler dans `legacy/baticlair/`, garder en service jusqu'au remplacement — **recommandé**.
- C : nouveau dépôt dédié.

## Conséquences
Si un déploiement Vercel de BatiClair existe, son « Root Directory » doit
désormais pointer vers `legacy/baticlair/`. La base de prix mutualisée
(`PriceRecord`) n'est pas reprise (PD-012).
