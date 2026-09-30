# ADR-0009 — Argent et quantités en décimal exact

- **Date** : 2026-09-28 · **Statut** : Accepté

## Contexte
Montants, prix unitaires à 3-4 décimales (vis, crochets), quantités
décimales (91,5 m²), taux de remise et de TVA. BatiClair utilise `Float`.

## Options
1. `number` JavaScript — erreurs de flottant (0,1 + 0,2 ≠ 0,3) : exclu.
2. Entiers en centimes — insuffisant pour les prix unitaires fins et les
   quantités décimales, conversions partout.
3. **Décimal à précision arbitraire** (`decimal.js`) encapsulé dans des
   objets-valeurs `Money` et `Quantity`.

## Décision
Option 3, implémentée dans `packages/domain` :
- `Money` : montant + devise (EUR aujourd'hui), opérations entre devises
  interdites, arrondi uniquement explicite (au centime, demi vers le haut).
- `Quantity` : valeur ≥ 0 + unité obligatoire ; conversions uniquement si
  sûres (ADR-0012, `docs/domain-model.md`).
- Sérialisation en chaînes (`{"amount":"12.50","currency":"EUR"}`), jamais
  en `number`, dans l'API comme en base (`numeric`).

## Conséquences
Multi-devise possible sans refonte (aucune conversion implicite n'existe).
