---
name: referentiel
description: Règles du référentiel couverture BatiClair (règle numéro un, section 49, prompts 41.1/41.2, parcours 48). À charger AVANT de toucher au moteur (`packages/domain`), aux tiroirs (`referential/data/*.ts`), aux prompts de lecture ou de relecture, aux questions de comptoir ou à l'écran de la liste.
---

# Référentiel BatiClair : ce qui fait foi

## Où sont les choses

| Quoi | Où |
|---|---|
| Le référentiel du fondateur (texte, fait foi) | `baticlair/docs/referentiel-couverture.md` |
| Le tiroir couverture (source de vérité du code) | `baticlair/packages/domain/src/referential/data/roofing.ts` |
| Les autres métiers (22 tiroirs) | `baticlair/packages/domain/src/referential/data/*.ts`, registre `REFERENTIALS` (`registry.ts`) |
| L'export du référentiel (généré par le test, jamais à la main) | `baticlair/referentiels/couverture/referentiel.json`, écrit par `packages/domain/test/schema-referentiel.test.ts` |
| Les anciennes valeurs et chaque changement de version | `baticlair/referentiels/couverture/CHANGELOG.md` |
| Les prompts A (lecture) et B (relecture) | `baticlair/apps/api/src/modules/takeoff/application/prompt.ts`, `quantitatif-pass.ts` |
| Les devis réels anonymisés (jamais le PDF) | `baticlair/packages/domain/test/devis-reels/` (D-2026-011, 015, 018, 020…) |
| Le dernier audit et son suivi | `baticlair/docs/audit-2026-10-07.md` |
| Les règles produit, en une page | `baticlair/CLAUDE.md` |

## Ordre de priorité

1. **La règle numéro un et la section 49 priment sur tout.** Cela vaut contre une autre section, un test ancien, une habitude du code ou une idée « pour aider ». BatiClair retranscrit le devis : jamais un article absent du devis, ni en vert, ni en orange, ni en suggestion, dans aucun tiroir. Un besoin n'existe que dans quatre cas :
   - son emplacement est écrit ;
   - il est la forme d'achat de ce qui est écrit (`formOf`) ;
   - c'est la naissance d'une gouttière (`indissociable`) ;
   - une ligne de pose le cite (`citedBy`).

   S'y ajoute un consommable accepté par la seule question « consommables ».
2. **Section 49 :**
   - §49.1 : la liste suit l'ordre du devis, jamais deux lignes fusionnées. Un article écrit ne disparaît jamais.
   - §49.2 : la quantité écrite fait foi, et un écart se dit sur la ligne. Une donnée manquante met la ligne en orange « Info manquante », jamais en vert avec une hypothèse.
   - §49.4 : les questions se posent à l'écran des questions, avant le calcul, jamais sur une donnée écrite, jamais en double. Le façonnage d'une pièce de zinguerie est obligatoire.
   - §49.8 : une ligne orange se règle dans sa carte, d'un geste.
3. **Section 48 :** le parcours, cinq écrans, zéro saisie, tutoiement.
4. **Section 41 :** les prompts A (§41.1) et B (§41.2) sont branchés mot pour mot. Le format technique s'ajoute sans rien réécrire. Deux appels IA au plus par devis.
5. Le reste du référentiel : les ratios des sections 1 à 18 et 34 à 36, les règles du comptoir (§47.8), le test du fournisseur (§40).

## Avant de toucher au moteur ou aux prompts

- Relire dans `docs/referentiel-couverture.md` les sections **41.1, 41.2, 48 et 49**, puis la section du sujet (par exemple §36 pour le zinc, §7 pour le joint debout).
- Relire dans `CLAUDE.md` la règle produit concernée et le test permanent qu'elle cite.
- Tout chiffre codé cite sa section ou sa source (`source`, `verification`). Un chiffre sans source reste `draft` et sort orange « Quantité à confirmer ».
- Aucune correction propre à un seul devis : chaque cas devient une règle générale et un test permanent.
- Un prompt (A ou B) ne se réécrit pas : son texte est testé contre le référentiel.

## Chaque règle touchée a son test permanent

- Écrire d'abord le test qui échoue, sur un devis réel de `test/devis-reels/` quand c'en est un, puis corriger.
- Le nommer d'après la règle (par exemple `joint-debout-d2026-018.test.ts`, `zinguerie-piece-par-piece.test.ts`), avec en tête la section et la date du retour du fondateur.
- Vérifier qu'il échoue sans la correction (`git stash` du code, relancer, `git stash pop`).
- Tests transversaux à garder verts :
  - `regle-numero-un-tous-tiroirs.test.ts` (les 22 tiroirs) ;
  - `devis-d2026-020.test.ts` (§49.6) ;
  - `test-du-fournisseur.test.ts` ;
  - `jamais-de-quantite-demandee.test.ts` ;
  - `brest-inchange.test.ts`.

## Règle de travail : chaque changement de règle se dit

À chaque fois qu'une règle du référentiel change (un ratio, une question, une ligne qui sort ou ne sort plus, une couleur) :

- **Le dire au fondateur en une ligne**, dans le résumé : « Règle changée : §X, avant → après ». Il met ainsi à jour son Claude Doc du référentiel. Le texte de `docs/referentiel-couverture.md` reste le sien : on ne le réécrit pas.
- **Monter la version et écrire l'entrée du CHANGELOG**, comme ci-dessous, même pour un petit changement.

## Changer le tiroir couverture

1. Modifier `roofing.ts`.
2. Monter `version` (format `roofing-AAAA.MM.JJ-N`).
3. Ajouter l'entrée au `CHANGELOG.md` : quoi, pourquoi, ancienne valeur.
4. `cd baticlair/packages/domain && npx vitest run -u` régénère `referentiel.json` et les comptes rendus (`docs/lot-*`, `docs/banc-devis-reels-score.md`). Relire le diff : seul ce qui est voulu doit bouger.
5. `pnpm build` dans `packages/domain`, car l'API importe `dist`.

Les chantiers existants gardent leur version figée (`referential_snapshot`) : on ne migre jamais un chantier vers les règles du jour.

## Vérifier avant la PR

- `packages/domain` : `npx tsc --noEmit && npx vitest run`.
- `apps/api` : `pnpm typecheck && npx eslint src test`, puis `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_test CI=true npx vitest run` (lancer d'abord `service postgresql start`).
- `apps/web` : `npx tsc --noEmit && npx eslint src e2e && pnpm build`, puis les e2e : `CI=true E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_e2e PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test` (une seule série à la fois).
