# ADR-0004 — PostgreSQL + Prisma

- **Date** : 2026-09-28 · **Statut** : Accepté

## Décision
- **PostgreSQL** : relationnel adapté au domaine, contraintes et clés
  étrangères, `numeric` exact, JSONB pour les sorties d'extraction
  immuables, full-text et `pg_trgm` pour le matching (avant toute base
  vectorielle), RLS disponible, et support d'une file de jobs (ADR-0005).
- **Prisma** (déjà utilisé par BatiClair) : schéma déclaratif, migrations
  versionnées, typage. SQL brut autorisé dans les repositories pour les
  requêtes de matching ou d'agrégation.

## Règles
- Toute évolution de schéma passe par une migration commitée ; jamais de
  modification manuelle en production.
- Montants et quantités en `numeric`, jamais `float`.
- Prisma n'est utilisé que dans les couches `infrastructure/` ; le domaine
  n'en connaît pas les types.

## Alternatives écartées
Drizzle (intéressant, plus proche du SQL, mais changement sans gain décisif
vs l'existant) ; MongoDB (domaine relationnel, contraintes indispensables).
