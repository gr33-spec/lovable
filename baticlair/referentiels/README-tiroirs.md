# Tiroirs métier en recherche (non activés)

Chaque dossier `referentiels/<code>/` (hors `couverture/`, qui reste la référence en production) contient :

- `tiroir.json` : la fiche du métier (`metier`), puis `valeurs` : chaque ratio ou conditionnement que le chapitre 11 ou 13 du référentiel marquait « à vérifier », avec ce que la recherche a trouvé ;
- `vocabulaire.json` : les mots des devis qui rattachent une ligne à un ouvrage de ce tiroir (chapitre 3 du référentiel), base du rattachement « un tiroir par ligne » ;
- le référentiel source en Markdown est dans `docs/referentiels/<fichier>.md`.

**Rien de ces tiroirs n'est chargé par le moteur ni montré à un utilisateur** : aucun code ne lit ces dossiers, le registre `REFERENTIALS` ne les connaît pas.

## Une valeur

```json
{
  "id": "ciment_sac_35_palette",
  "libelle": "Ciment CEM II 32,5, sac 35 kg : sacs par palette",
  "avant": "palette 40 sacs (à vérifier)",
  "valeur": 42,
  "unite": "sacs/palette",
  "statut": "source",
  "sources": [{ "url": "https://…", "date": "2026-10-04" }],
  "ecart": "…"
}
```

`statut` :

- `source` : trouvée sur une fiche fabricant ou négoce, lien et date ;
- `a_verifier` : rien de fiable trouvé, la valeur du référentiel reste une hypothèse ;
- `contradiction` : deux sources (ou la source et le référentiel) ne disent pas la même chose ; les deux sont gardées dans `sources` / `ecart`, rien n'est tranché.

**Méthode (4 octobre 2026).** Le proxy de la session bloque l'ouverture directe des fiches (PDF Samse, Chausson, négoces) : les valeurs ont été lues dans les extraits que le moteur de recherche donne de ces pages. Chaque source est la page d'où vient l'extrait ; une valeur `source` reste à confirmer en ouvrant la fiche avant d'être activée.
