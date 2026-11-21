# ADR-0016 — BatiClair dans son propre dossier, ancien prototype supprimé

- **Date** : 2026-09-29 · **Statut** : Accepté · Remplace la disposition de l'ADR-0002

## Contexte
Le dépôt contient deux applications sans lien : **patrimoine** (en service)
et **BatiClair**. Les fichiers d'outillage de BatiClair placés à la racine
(`package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`)
étaient visibles pendant la construction Vercel de patrimoine, qui échouait
alors sur la branche de travail alors qu'elle réussit sur `main`.

## Décision
- Tout BatiClair vit dans `baticlair/` (apps, packages, docs, outillage).
  La racine du dépôt ne contient plus que ce qui est commun à Git
  (`.github/`, `.gitignore`, consignes des agents) et un README d'orientation.
- La CI BatiClair s'exécute dans `baticlair/` et seulement quand ce dossier change.
- Projets Vercel BatiClair : Root Directory `baticlair/apps/api` et
  `baticlair/apps/web`.
- L'ancien prototype (`legacy/baticlair/`) est **supprimé** à la demande du
  fondateur. Il reste récupérable dans l'historique Git :
  `git checkout 672adda -- legacy/baticlair`.

## Conséquence
Une modification de BatiClair ne peut plus changer la construction de patrimoine, et inversement.
