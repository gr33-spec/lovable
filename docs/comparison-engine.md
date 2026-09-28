# Moteur de comparaison

Code : `packages/domain/src/comparison/` et `packages/domain/src/offer/`.
Version actuelle : `COMPARISON_ENGINE_VERSION = "0.1.0"`. Statut : **RÉEL**
(implémenté et testé, pas encore branché sur une base de données ni une UI).

## Principe

> L'IA extrait et rapproche. Le moteur calcule et constate. L'interface
> explique. Personne ne « devine » un montant.

Le moteur est une **fonction pure** : `compareOffers({ items, offers, matches }) → result`.
Mêmes entrées ⇒ même résultat, au caractère près (testé). Chaque exécution
est enregistrée (`ComparisonRun`) avec la version du moteur et l'empreinte
de ses entrées, ce qui permet d'expliquer ou de rejouer un résultat.

## Entrées

| Entrée | Origine | Remarque |
|---|---|---|
| `items` : besoins demandés | Instantané **figé** du quantitatif validé (`ConsultationItem`) | Une modification ultérieure du quantitatif ne fausse pas une comparaison passée |
| `offers` : offres fournisseurs | Extraction IA + corrections utilisateur, normalisées | Chaque ligne a une **nature** (`kind`) |
| `matches` : correspondances besoin ↔ lignes | Moteur de matching (phase 3) + confirmations utilisateur | Score interne 0..1 ; `confirmed` fait foi |

### Nature des lignes d'offre

| `kind` | Signification | Total fournisseur | Total comparable |
|---|---|---|---|
| `main` | Offre principale | ✅ | ✅ si correspond à un besoin |
| `substitution` | Remplace le produit demandé | ✅ | ✅ + avertissement |
| `variant` | Proposition alternative **en plus** (= « alternative ») | ❌ | ❌ (signalée) |
| `option` | Article facultatif non demandé | ❌ | ❌ (signalée) |
| `fee` | Livraison, éco-contribution, manutention… | ✅ | ✅ |
| `deposit` | Consigne remboursable | ✅ | ❌ (argent avancé, pas un coût) |
| `info` | Texte sans prix | — | — |

Une ligne `main` qui ne correspond à aucun besoin est un **article non
demandé** : comptée dans le total fournisseur, exclue du comparable,
signalée (`EXTRA_LINES`).

## Étapes

1. **Évaluation besoin × fournisseur**
   - lignes produit correspondantes → montant facturé (remise globale
     répartie au prorata) ;
   - quantité proposée convertie dans l'unité du besoin **uniquement si
     c'est sûr** (m ↔ ml, kg ↔ t, ou conditionnement explicite « rouleau de
     47 m² ») ;
   - prix unitaire effectif = facturé ÷ quantité proposée ;
   - **montant normalisé** = prix unitaire effectif × quantité demandée ;
   - drapeaux : `SUBSTITUTION`, `QUANTITY_LOWER`, `QUANTITY_HIGHER`,
     `UNIT_NOT_COMPARABLE`, `ONLY_AS_VARIANT`, `NOT_PRICED`.
2. **Estimation des manquants** : pour un besoin absent chez un fournisseur,
   estimation = **médiane** des montants normalisés des autres
   fournisseurs. Un besoin que personne n'a chiffré sort de la base commune
   pour tout le monde (`ITEM_NOT_QUOTED_BY_ANYONE`).
3. **Synthèse fournisseur** (`SupplierSummary`)
   - `printedTotalHT` — **fait** imprimé ;
   - `computedTotalHT` — recalcul de l'offre principale ;
   - `arithmetic` — contrôle ligne à ligne, total HT, TVA, TTC ;
   - `comparableTotalHT` — **estimation** : Σ normalisés + manquants estimés + frais ;
   - `estimatedPartHT` — part qui n'est pas chiffrée par ce fournisseur ;
   - `comparability` : `complete` / `provisional` (correspondance à vérifier) /
     `estimated` (manquants estimés) / `incomplete` (non estimable).
4. **Constats transverses** : classement, écarts par famille.

## Constats (`Finding`)

Chaque constat porte une **nature** (§55), une **gravité** et une
**priorité** (ordre dans la synthèse). Aucun texte : l'interface traduit
le code + les paramètres.

| Code | Nature | Exemple de formulation (UI) |
|---|---|---|
| `LOWEST_TOTAL_NOT_COMPARABLE` | WARNING | « B affiche un total inférieur de 614,60 €, mais 2 articles demandés semblent absents. Les totaux ne sont pas directement comparables. » |
| `ITEMS_MISSING` | INFERENCE | « Liteaux et bande de rive semblent absents chez B (≈ 702 € estimés). » |
| `PRINTED_TOTAL_INCLUDES_NON_COUNTED_LINES` | INFERENCE | « Le total de C semble inclure l'option gouttière (360 €). » |
| `BEST_COMPARABLE_OFFER` | RECOMMENDATION | « A est l'offre complète la plus avantageuse, 60,85 € de moins que B. » |
| `CATEGORY_PRICE_GAP` | INFERENCE | « B est 21 % moins cher que A sur le faîtage. » |
| `SUBSTITUTION_PROPOSED` | FACT | « C propose un autre écran que celui demandé. » |
| `UNCERTAIN_MATCH` | WARNING | « Je ne suis pas sûr que la faîtière de C corresponde. Confirmer ? » |
| `QUANTITY_DIFFERS` | FACT | « C propose 400 ml de liteaux pour 420 demandés. » |
| `UNIT_NOT_COMPARABLE` | WARNING | « Bardage chiffré à l'unité chez X, demandé en m². » |
| `DELIVERY_FEE` / `DELIVERY_NOT_SPECIFIED` | FACT / WARNING | « C ajoute 145 € de transport. » / « Livraison non précisée chez Y. » |
| `VARIANT_AVAILABLE`, `OPTION_PRESENT`, `DEPOSIT_PRESENT`, `EXTRA_LINES`, `FULL_COVERAGE`, `ARITHMETIC_MISMATCH`, `ITEM_NOT_QUOTED_BY_ANYONE` | … | |

## Règles de prudence

- Une offre incomplète n'est **jamais** annoncée comme la moins chère ;
  la référence de l'avertissement est l'offre complète au total affiché le
  plus bas.
- `BEST_COMPARABLE_OFFER` n'est émis que si l'offre en tête est `complete`
  ou `provisional` : **jamais sur la base d'estimations**.
- Un écart arithmétique est « à vérifier », jamais « une erreur du
  fournisseur » (l'extraction peut s'être trompée).
- Le moteur teste une hypothèse précise quand le total imprimé ne colle
  pas : « le fournisseur a-t-il additionné une variante/option ? ».
- Un besoin présent uniquement en variante reste **manquant** dans l'offre
  principale.
- Les écarts par famille ne portent que sur les besoins **couverts par les
  deux** fournisseurs comparés ; seuils par défaut : ≥ 10 % **et** ≥ 50 € HT.

## Argent et arrondis

- `decimal.js`, précision 40, arrondi commercial (demi vers le haut).
- Aucun arrondi intermédiaire ; arrondi au centime à la sortie
  (`roundToCents`).
- Tolérances arithmétiques : 0,02 € par ligne, 0,05 € par total (réglables).
- Comparaison en **HT** (voir [product-decisions.md](product-decisions.md)).

## Points ouverts

- Q3 (conditionnement) : les deux montants (facturé / normalisé) sont
  calculés ; le choix d'affichage attend ta décision.
- Correspondance « une ligne → plusieurs besoins » (lot) : non gérée en
  v0.1 ; à ajouter si les vrais documents le montrent.
- Poids des estimations : la médiane est un choix neutre ; à revoir avec
  des cas réels.

## Tests

`packages/domain/test/comparison.test.ts` et `arithmetic.test.ts`, sur le
chantier fictif Dupont (`test/fixtures/dupont.ts`, 3 fournisseurs, pièges
documentés en tête du fichier) et des cas limites. Montants attendus
**calculés à la main**, pas recopiés depuis la sortie du code.
