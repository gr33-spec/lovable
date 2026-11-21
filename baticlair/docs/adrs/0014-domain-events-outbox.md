# ADR-0014 — Événements métier via outbox transactionnelle

- **Date** : 2026-09-28 · **Statut** : Accepté

## Contexte
Notifications, analytics, recalcul des comparaisons et futurs webhooks
doivent réagir aux faits métier (`SupplierOfferParsed`…) sans coupler les
modules entre eux, et sans perdre d'événement.

## Options
1. Appels directs entre modules — couplage, oublis.
2. Bus en mémoire — événements perdus si le processus s'arrête.
3. Kafka / broker — surdimensionné.
4. **Outbox** : événement inséré dans `outbox_event` dans la même
   transaction que la modification, puis distribué par le worker via la
   file de jobs (ADR-0005).

## Décision
Option 4. Événements typés, versionnés (`type`, `version`, `payload`,
`companyId`, `occurredAt`), abonnés idempotents.

## Conséquences
Livraison « au moins une fois » : chaque abonné doit être idempotent. Les
mêmes événements alimenteront plus tard les webhooks partenaires.
