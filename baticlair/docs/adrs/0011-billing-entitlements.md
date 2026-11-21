# ADR-0011 — Billing séparé des entitlements

- **Date** : 2026-09-28 · **Statut** : Accepté

## Contexte
BatiClair lit `user.plan` et un plafond codé en dur (3 analyses/mois). Le
produit visera le web (Stripe) puis peut-être les stores mobiles, avec des
plans, essais et quotas encore indéfinis.

## Décision
- **Plans** en configuration (base de données) : prix, période, limites,
  fonctionnalités. Aucun montant dans le code métier.
- **Subscription** : lien entre une entreprise et un plan via un **canal**
  (`stripe`, `app_store`, `play_store`, `manual`), alimenté par les
  webhooks du canal.
- **Entitlement** : droits effectifs calculés (« peut analyser », « N
  consultations/mois », « essai jusqu'au… »). **Toute l'application ne lit
  que les entitlements.**
- **UsageCounter** : compteurs (analyses, pages, consultations) prêts pour
  des quotas futurs, sans limite activée sans décision business.
- Stripe derrière `PaymentProvider`.

## Conséquences
Changer de prix, ajouter un essai, un plan supérieur ou un canal store ne
touche pas les modules métier.
