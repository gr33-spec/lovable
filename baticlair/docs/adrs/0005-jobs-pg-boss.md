# ADR-0005 — File de jobs sur PostgreSQL (pg-boss)

- **Date** : 2026-09-28 · **Statut** : Accepté

## Contexte
Analyse de documents, IA, envois d'e-mails, imports massifs, relances
planifiées : tout cela doit être asynchrone, reprenable et idempotent.

## Options
1. Redis + BullMQ — mature, rapide ; mais une infrastructure de plus à
   opérer, sauvegarder et sécuriser, et **pas de transaction commune** avec
   la base métier (risque de job créé sans donnée, ou l'inverse).
2. **pg-boss** (file dans PostgreSQL) — pas d'infra supplémentaire, mise en
   file dans **la même transaction** que l'écriture métier, clés de
   singleton pour l'idempotence, tâches planifiées (remplace le cron
   Vercel), reprises et expirations.
3. Service managé (SQS…) — dépendance à un cloud, même problème transactionnel.

## Décision
pg-boss, derrière un port `JobQueue` (enqueue, schedule, handler). Les
volumes attendus (quelques milliers de jobs par jour) sont très loin de ses
limites.

## Conséquences
- Si les volumes l'exigent un jour, un adapter BullMQ remplacera pg-boss
  sans toucher aux cas d'usage.
- Redis pourra être ajouté plus tard pour du cache ou de la limitation de
  débit, indépendamment.
