# ADR-0012 — Moteur de comparaison déterministe

- **Date** : 2026-09-28 · **Statut** : Accepté

## Contexte
BatiClair demande au LLM de comparer les devis, de désigner le
moins-disant et de calculer l'économie : résultats non reproductibles,
non vérifiables, et potentiellement faux sur les montants.

## Décision
- La comparaison est une **fonction pure** du noyau (`compareOffers`) :
  mêmes entrées ⇒ même sortie.
- L'IA intervient **en amont** (extraction, nature des lignes,
  propositions de correspondance) ; ses sorties sont validées et
  corrigeables. Elle peut intervenir **en aval** pour reformuler, jamais
  pour calculer.
- Constats typés (fait / inférence / avertissement / recommandation) sans
  texte ; formulations dans l'i18n.
- Chaque exécution est historisée avec `engineVersion` et l'empreinte de
  ses entrées.

## Conséquences
Chaque règle est testable unitairement ; toute évolution de règle =
nouvelle version du moteur + tests + entrée dans `product-decisions.md`.
Détails : `docs/comparison-engine.md`.
