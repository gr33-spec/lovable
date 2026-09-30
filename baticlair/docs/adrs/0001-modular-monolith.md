# ADR-0001 — Monolithe modulaire, ports & adapters

- **Date** : 2026-09-28 · **Statut** : Accepté

## Contexte
Produit B2B naissant, petite équipe, domaine riche (documents, IA,
comparaison, e-mail, facturation), forte exigence d'indépendance vis-à-vis
des prestataires.

## Options
1. Microservices dès le départ — coût opérationnel énorme, frontières encore inconnues.
2. Application Next.js « tout-en-un » (comme BatiClair) — logique métier couplée au framework d'interface, traitements longs impossibles.
3. **Monolithe modulaire** : un backend, des modules isolés, ports & adapters par module, noyau métier pur.

## Décision
Option 3. Modules listés dans `docs/architecture.md`, API publique par
`index.ts`, imports inter-modules contrôlés par ESLint, prestataires
uniquement derrière des ports.

## Conséquences
- Un seul déploiement backend (deux processus : API et worker).
- Extraction d'un module en service possible plus tard si un besoin mesuré l'exige.
- Discipline requise : les frontières sont vérifiées par l'outillage, pas seulement par convention.
