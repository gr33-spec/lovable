# Stratégie de tests

## Pyramide

| Niveau | Outil | Portée | Quand |
|---|---|---|---|
| Unitaire — noyau | Vitest | `packages/domain` : argent, unités, arithmétique, moteur de comparaison, scoring du matching | Chaque commit |
| Unitaire — modules | Vitest | Cas d'usage avec ports simulés | Chaque commit |
| Intégration | Vitest + **vrai PostgreSQL** (conteneur) + MinIO | Repositories, transactions, contraintes, jobs, **isolation multi-tenant** | Chaque commit (CI) |
| Contrat d'adapter | Vitest + réponses enregistrées | Adapters IA / e-mail / paiement / stockage | Chaque commit ; revalidés contre le vrai service avant mise en production |
| E2E | Playwright | Parcours complets avec `FakeAIProvider` et e-mails capturés (Mailpit) | Chaque PR |
| Évaluations IA | `tools/ai-evals` | Qualité d'extraction / matching sur datasets | À chaque changement de prompt ou de modèle |

## État actuel

- `packages/domain` : **105 tests** unitaires (dont coût d'un appel IA,
  grilles de prix datées, routage des pages, référentiel et validation
  du quantitatif couvreur).
- `apps/api` : **57 tests** (configuration, identité, entreprises, chantiers,
  recherche, double appui, erreurs réseau, dépôt et lecture de PDF,
  consommation IA, paliers d'analyses), dont les tests d'intégration sur
  PostgreSQL réel et le test d'isolation entre entreprises. Ce dernier a été vérifié par mutation : en retirant le
  filtre d'entreprise d'une requête, il échoue.

- `apps/web` : **8 parcours** de bout en bout, chacun sur téléphone et sur
  ordinateur (16 exécutions), dont le dépôt de devis PDF.

Les PDF de test sont générés (`apps/api/test/support/pdf-fixtures.ts`) :
aucun document réel dans le dépôt.

Tout se lance avec `pnpm turbo run lint typecheck test build`.

## Cas métier obligatoires (§109)

| Cas | Couvert |
|---|---|
| Article manquant | ✅ moteur |
| Même quantité, nom différent / deux noms différents | ⏳ matching (phase 3) — le moteur consomme déjà les correspondances |
| Unités différentes (m ↔ ml, m² ≠ unités) | ✅ |
| Conditionnements différents (rouleaux, boîtes) | ✅ |
| Variante, plusieurs variantes, option, alternative | ✅ |
| Substitution | ✅ |
| Transport / frais supplémentaire | ✅ |
| Remise ligne, remise globale (taux et montant) | ✅ |
| TVA / TTC incohérents | ✅ |
| Consigne | ✅ |
| Quantité supérieure / inférieure au besoin | ✅ |
| Total fournisseur incohérent (dont variante additionnée) | ✅ |
| Matching ambigu, mapping corrigé par l'utilisateur | ✅ (côté moteur) ⏳ (mémoire métier) |
| PDF incomplet / scanné / invalide, document doublon | ⏳ phase 2 |
| E-mail doublon, réponse sans PDF, mauvais fil | ⏳ phase 3 |
| Fournisseur IA / e-mail indisponible | ⏳ phases 2-3 |

## Règles

- Une règle métier critique = un test qui la nomme.
- Les montants attendus sont calculés à la main dans le test ou en
  commentaire, jamais recopiés depuis la sortie du code.
- Une correction métier du fondateur (§125) devient : règle du domaine +
  test + entrée dans `product-decisions.md`.
- Aucun appel réseau réel dans la CI (sauf campagne d'évaluation
  explicitement lancée).
- Aucun test désactivé pour « faire passer » la CI.
- **Chaque cas tordu découvert sur le terrain** (devis client, réponse
  fournisseur, contrôle du fondateur) **devient un test permanent** avant
  sa correction : le test échoue, on corrige, il passe, il reste. Une
  correction ne doit jamais en défaire une autre trois semaines plus tard.
- **Référentiel métier** : chaque chantier contrôlé par un professionnel
  (devis → quantitatif attendu → commande réelle) devient un cas de
  référence rejoué à chaque version du moteur ; un écart est une régression.

## Banc d'essai « vrais devis »

`packages/domain/test/banc-devis-reels.test.ts` fait passer chaque vrai
devis anonymisé par le chemin de l'application et régénère
`docs/banc-devis-reels-score.md` (lignes transformées, questions). Toute
évolution du score est visible dans la revue. Mode d'emploi :
`banc-devis-reels.md`.

## CI (phase 1)

`lint → typecheck → tests unitaires → tests d'intégration (Postgres) →
build → E2E`. Tout échec bloque la fusion.
