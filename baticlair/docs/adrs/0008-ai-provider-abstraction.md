# ADR-0008 — Abstraction du fournisseur IA et sorties structurées

- **Date** : 2026-09-28 · **Statut** : Accepté

## Contexte
BatiClair appelle le SDK Anthropic directement, avec des prompts qui
demandent « du JSON strict » analysé à la main, sans version ni trace.

## Décision
- Port `AIProvider.generateStructured` ; premier adapter Anthropic ;
  `FakeAIProvider` pour les tests.
- Schémas de sortie **définis par nous** (Zod, `packages/contracts/ai`),
  convertis par l'adapter vers le mécanisme de sortie structurée du
  fournisseur, puis **revalidés**.
- Registre de prompts versionnés et immuables dans le code.
- `AIExecution` pour chaque appel (modèle, prompt, jetons, coût, durée, issue), sans contenu.
- Routage simple tâche → niveau → modèle, par configuration.
- Pas de fallback automatique inter-fournisseurs au MVP.
- Évaluations obligatoires avant tout changement de prompt ou de modèle.

## Conséquences
Changer de fournisseur = écrire un adapter + passer les évaluations ; le
domaine, les schémas et les prompts métier restent. Détails :
`docs/ai-architecture.md`.
