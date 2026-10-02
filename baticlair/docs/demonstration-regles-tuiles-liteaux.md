# Démonstration — règles tuiles et liteaux (Edilians HP 10 Huguenot)

Statut des deux règles : **brouillon** (non utilisées pour un artisan) tant que
la page exacte de la documentation n'est pas reportée ci-dessous.

## 1. Les deux règles

| Besoin | Formule BatiClair | Nature de la règle |
|---|---|---|
| Tuiles | `surface ÷ (largeur utile × pureau)` | géométrie : une tuile couvre largeur utile × pureau |
| Liteaux | `surface ÷ pureau` | géométrie : une file de liteaux tous les « pureau » |

Données utilisées :

| Donnée | Valeur | Nature | Source |
|---|---|---|---|
| Largeur utile HP 10 | 268 mm | caractéristique fabricant | Edilians, doc. HP 10 Huguenot réf. 205 |
| Pureau admissible | 310 à 376 mm | caractéristique fabricant | idem |
| Pureau réel | — | **donnée chantier** (jamais choisie par BatiClair) | artisan / devis |

## 2. Calcul refait, comparé au tableau du fabricant

| Pureau | Liteaux ml/m² calculé (1 ÷ p) | Fiche | Tuiles/m² calculé (1 ÷ (0,268 × p)) | Fiche |
|---|---|---|---|---|
| 310 mm | 3,2258 | 3,22 | 12,0366 | 12 |
| 343 mm | 2,9155 | 2,91 | 10,8786 | — |
| 376 mm | 2,6596 | 2,66 | 9,9238 | 9,9 |

Lecture :

- Liteaux : la fiche donne 2 décimales, **tronquées** à 310 et 343 mm,
  arrondies à 376 mm. Écart maximal : 0,006 ml/m², soit 0,7 ml sur 120 m².
- Tuiles : la fiche donne 1 décimale (« 9,9 à 12 »). Écart maximal : 0,04 tuile/m².
- Conclusion : les deux formules redonnent le tableau du fabricant. Elles ne
  contiennent **aucun coefficient** ; seules entrent la largeur utile
  (fabricant) et le pureau (chantier).

Exemple 120 m² (pureau inconnu → BatiClair calcule les deux bornes) :

| Pureau | Liteaux | Tuiles |
|---|---|---|
| 310 mm | 387,10 ml | 1 444,39 → 1 445 |
| 343 mm | 349,85 ml | 1 305,43 → 1 306 |
| 376 mm | 319,15 ml | 1 190,85 → 1 191 |

Le pureau change la commande (1 191 à 1 445 tuiles) : c'est donc **la seule
question** posée sur cet ouvrage, avec cet écart affiché.

Non inclus volontairement : casse, chutes, rives, doublis. Ce sont des marges
ou des accessoires, sourcés à part ou réglés par l'entreprise.

## 3. Sources et page — état honnête

| Source | Version | Page | État |
|---|---|---|---|
| Edilians, documentation HP 10 Huguenot réf. 205 — `edilians.com/media/productattach/2/0/205_fag_hp_10_huguenot_19042024_bd.pdf` | 19/04/2024 | **à reporter** | valeurs relayées par le fondateur ; PDF inaccessible depuis l'environnement BatiClair (site bloqué) |
| Même document | 14/12/2021 | **à reporter** | valeurs vues uniquement dans un résumé de recherche web : non retenu comme preuve |

Pour valider : ouvrir le PDF 2024 et reporter ici le numéro de page (ou de
tableau) de chacune des lignes : largeur utile, plage de pureau, tuiles/m²,
ml de liteaux/m². Ensuite, et seulement ensuite, les deux règles passent en
« vérifié » dans `packages/domain/src/referential/data/roofing.ts`.

## 4. Test permanent

`packages/domain/test/referential.test.ts` — « les règles BatiClair redonnent
les tableaux du fabricant (Edilians HP 10) » : compare le calcul au tableau,
écart < 0,01 ml/m² pour les liteaux et < 0,05 tuile/m² pour les tuiles.
