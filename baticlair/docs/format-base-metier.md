# Format commun d'une base de référence métier

Mission du fondateur (19 novembre 2026) : « tout va dans la fiche métier unique, classée par famille, puis
marque, puis modèle, avec la carte des régions à part. Le code lit cette fiche et rien d'autre ; le cœur reste
sans métier. La structure doit pouvoir servir de modèle aux autres métiers. »

Premier métier : la couverture (`referentiels/couverture/`). Un autre métier ajoute son dossier avec les mêmes
fichiers, sans une ligne de code.

## Les fichiers d'un métier

| Fichier | Rôle | Écrit par |
|---|---|---|
| `referentiels/<métier>/recherche/*.json` et `*.md` | la recherche brute, une famille par fichier, chaque chiffre avec ses sources (`recherche/CONSIGNES.md`) | la recherche, puis le fondateur |
| `referentiels/<métier>/construire_fiche.py` | range la recherche dans la fiche | — |
| `referentiels/<métier>/fiche-<métier>.json` | **la base que le code lit** | généré, jamais à la main |
| `referentiels/<métier>/carte-regions.json` | la carte des régions, à part | généré |
| `referentiels/<métier>/fiche-<métier>.md` | la même base en tableaux, pour la relecture | généré |

`packages/domain/scripts/gen-fiches.mjs` met chaque `fiche-<métier>.json` et sa carte dans le domaine, à chaque
build, test et vérification de types. Le code les lit par `baseDuMetier("<métier>")`
(`packages/domain/src/referential/base/`). Le lecteur ne connaît aucun métier.

## La fiche

```
fiche, metier, nom, version, etat (brouillon | en validation | relu), regle_confirmation, taux_confirme
familles[]            une famille par grande catégorie (ardoise, tuile_emboitement, zinguerie…)
  code, libelle
  sous_familles[]
    nom
    regles[]          les chiffres sans modèle : DTU, calcul, recoupement de plusieurs marques
    marques[]
      nom, groupe     « Koramic », groupe « Wienerberger » ; « Toutes marques » pour un format sans marque
      modeles[]
        nom           « HP 10 Huguenot », « 32×22 »
        attributs[]   les chiffres du modèle
  verdicts[]          le verdict sur chaque ratio existant (confirmé, corrigé, à confirmer)
  comptoir[]          ce que le vendeur demande pour commander
sources[]             une par document : id (S1…), titre, url, type, consulté le
```

Un chiffre (`regles[]` ou `attributs[]`) :

| Champ | Contenu |
|---|---|
| `id` | identifiant unique dans la fiche |
| `attribut`, `valeur`, `unite` | « tuiles_par_m2 », 12, « u/m2 » |
| `condition` | quand il vaut (« pente 45°, zone 2 ») |
| `regions` | où il vaut |
| `statut` | `confirme`, `confirme_fabricant`, `une_source`, `a_confirmer` |
| `sources` | les id de `sources[]` |
| `preuves` | courte citation de chaque source |
| `ecart`, `raison`, `controle` | pourquoi deux sources divergent, pourquoi c'est à confirmer, le contrôle par le calcul |

## Les statuts

- `confirme` : deux sources indépendantes au moins, dont un fabricant ou un DTU quand c'est possible.
- `confirme_fabricant` (décision du fondateur, 19 novembre 2026) : chiffre propre à un modèle, lu sur la fiche
  officielle du fabricant, sur son domaine et datée, et le modèle passe le contrôle par le calcul.
- `une_source`, `a_confirmer` : sortent orange « Quantité à confirmer » (§47.1) tant que le fondateur ou trois
  entreprises ne les ont pas validés.

## La carte des régions

```
version, taux_confirme, definitions_zones, avertissements
departements[]   code, nom, region, materiaux [{materiau, rang, part, modeles_formats, sources}],
                 zones {dtu_ardoise, dtu_tuile, vent, neige, littoral}, habitudes, statut
communes         fichiers de zones calculées par commune (distance à la côte, altitude)
```

Usage décidé : selon la commune du chantier, l'assistant propose d'abord ce qui s'y fait (ordre des boutons,
valeurs par défaut, suggestions). Il n'avance jamais par défaut un matériau qui ne s'y fait pas. Le devis prime
toujours.
