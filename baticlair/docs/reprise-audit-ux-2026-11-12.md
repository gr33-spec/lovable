# Reprise : dossier de corrections UX du 12 novembre 2026

Source : « MOBIIZ — Dossier de corrections UX et produit » (Greg, 12 novembre 2026, 14 points, 22 captures) et la mission
en 5 lots. Ce fichier est LA première chose à lire à la reprise : vérifier le commit, puis reprendre au « Prochain geste ».

## Où
- Dossier : `/home/user/lovable/baticlair` · branche locale isolée `audit-ux-2026-11-12` (jamais poussée telle quelle).
- Base de départ : `4badcc4e` (branche de test `claude/saas-achat-artisans-prompt-1lyihx`, en ligne sur test.mobiiz.fr).
- Livraison : seulement quand TOUS les lots sûrs sont faits et la chaîne complète verte sur un commit exact ; alors
  avance rapide de la branche de test, push, attente des deux domaines, recette en ligne.

## Lots
| Lot | État |
|---|---|
| 1 Blocages et fiabilité | EN COURS (point 1 fait ; notifications, rattachement, reçus à faire) |
| 2 Missions, aide, paramètres | non commencé |
| 3 Contenus, documents, MVP | non commencé |
| 4 Formules et facturation (test seulement) | non commencé |
| 5 Passe visuelle | non commencé |

## Fait
- Point 1 (case « Quels articles grouper ? ») : cause = la case d'un article « À préciser » était `disabled`, donc l'appui
  était ignoré en silence. Maintenant : l'appui dit ce qui manque, ouvre « Préciser », garde l'intention ; l'article se
  coche dès que la précision est complète. Fichiers : `apps/web/src/components/ag-v1-quantitatif.tsx`,
  `apps/web/e2e-ag-v1/achats-groupes-v1.spec.ts`. Test : `-g "depuis un quantitatif tapé|un seul circuit"` 6/6 (3 appareils).

## Rappels techniques
- Les e2e tournent sur le site CONSTRUIT : `pnpm -s build` dans `apps/web` avant chaque passe, puis
  `fuser -k 3000/tcp 4000/tcp`.
- e2e activés : `CI=true E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_e2e PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test -c playwright.ag-v1.config.ts --trace off`.
- Chaîne complète : voir `docs/REPRISE.md`.

## Interdits (toujours)
Production, `main`, e-mail réel, paiement réel, appel IA payant, suppression de données, Stripe en production, document
juridique validé, règles de facturation réelles : rien sans l'accord explicite de Greg.

## Prochain geste
Lot 1, point 2 : notifications (lu, pastille, suppression par glissement avec « Annuler »), côté serveur et écran.
