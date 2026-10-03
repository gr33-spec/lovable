# Plan d'architecture v3 — une page, avant tout code

Répond au §27.7 du référentiel (`docs/referentiel-couverture.md`, 33 sections). Rien n'est codé avant ton « ok ».

## Où on va

```
baticlair/referentiels/
  commun/      departements.json · unites.json · conditionnements.json · regle-d-or.md
  couverture/  metier.json · ouvrages.json · materiaux.json · regles.json · defauts.json
               questions.json · vocabulaire.json · ratios-a-valider.md · tests/ · CHANGELOG.md
  platrerie/   les mêmes fichiers, minimaux : 1 ouvrage, 1 test
packages/domain/   le moteur générique, sans un mot de métier
```

- **Chargement** : chaque fichier est validé par son schéma JSON au démarrage ; un référentiel invalide ne se charge pas. Le contrôle d'intégrité actuel (unités, formules, sources) s'ajoute aux schémas.
- **Moteur** : celui d'aujourd'hui (formules à unités, tables, hypothèses, pertes, conditionnements, traces), qui lit les JSON au lieu de TypeScript. On ne le réécrit pas.
- **Profil → métiers** : le moteur, la lecture IA et les questions prennent le référentiel du métier de l'entreprise, jamais « couverture » en dur.
- **Versions (§27.1.6, §32.5)** : chaque liste de matériaux enregistre `{ metier, version }`. À l'ouverture, elle est recalculée avec sa version d'origine. Aujourd'hui, elle l'est avec les règles du jour : **à corriger**.
- **Questions (§32.3)** : chacune a une `sensibilite_pct`. Le moteur ne pose que celles au-dessus de 5 %, par priorité, **4 au maximum par chantier**. Aujourd'hui, il n'y a pas de plafond : **à corriger**.
- **Hypothèses « à vérifier DTU »** : chaque valeur porte son statut, et l'écran l'affiche dans « Hypothèses » (« à confirmer »), jamais comme une certitude.

## Le métier codé en dur aujourd'hui, et sa destination

| Où (fichier · fonction) | Ce qu'il contient | Destination |
|---|---|---|
| `domain/referential/data/roofing.ts` (966 lignes) | tout le référentiel couverture en TypeScript | `couverture/*.json` |
| `domain/trades/roofing.ts` · `ROOFING_PROFILE` | familles, mots-clés, oublis (« des tuiles sans liteaux ») | `couverture/vocabulaire.json`, `regles.json` |
| `domain/trades/light-profiles.ts` | 9 autres métiers en TypeScript | un dossier par métier, plus tard |
| `domain/referential/zone.ts` · `climateZone` | liste des départements en zone 2 et 3 | `commun/departements.json` |
| `domain/trust/purchase-view.ts` · `WRITTEN_UNITS`, `MATERIAL_WORDS` | unités écrites, matières (zinc, PVC…) | `commun/unites.json`, `vocabulaire.json` |
| `domain/takeoff/characteristics.ts` · `MATERIALS`, `COLOURS` | matières et coloris | `commun/` (vocabulaire partagé) |
| `domain/takeoff/validation.ts` · `WORK_HEADS` | « jouée », « habillage »… | `couverture/vocabulaire.json` |
| `api/takeoff/takeoff.service.ts` · `review()` | `ROOFING_REFERENTIAL` en dur ; fait « zone » nommé dans le code | référentiel choisi selon le métier ; zone lue dans `departements.json` |
| `api/takeoff/prompt.ts` · consigne v8 | « tuiles, ardoises, liteaux, zinc » dans le texte | vocabulaire injecté depuis le métier (§27.3, chargement à la demande) |
| `web/components/chat.tsx` · `reasoningOf`, `parseCommand` | `param:pente`, `param:zone` en dur | phrases et commandes tirées de `questions.json` / `defauts.json` (`afficher`) |
| `api/demo/demo-documents.ts` | devis de démonstration de couvreur | données de démo du dossier métier |

Ce qui reste dans le moteur, parce que c'est commun à tous les métiers : les unités et conversions, les degrés et pourcentages de pente, le tri des doutes de l'IA (lecture ou calcul), les pertes, les conditionnements et l'agrégation de la liste d'achats.

## Ordre des chantiers (comme tu l'as fixé)

1. **Schémas JSON** des 7 fichiers métier et des 3 fichiers communs (§19, §32), avec un test : un fichier faux est refusé.
2. **Migration de la couverture** vers `referentiels/couverture/`, tous les tests au vert, résultats identiques sur tes deux vrais devis (9 313 ardoises, 1 488 tuiles…), valeurs « à vérifier DTU » affichées comme hypothèses, version et plafond de 4 questions en place.
3. **`platrerie/` minimal** (1 ouvrage, par exemple une cloison 72/48 : plaques, rails, montants ; 1 test) qui tourne **sans modifier le moteur**. Si ce test exige une ligne de moteur, l'architecture n'est pas validée et je te le dis.
4. **Ensuite seulement** : le chat de la section 21, maquette avant code.

## Trois points à trancher avant de commencer

- **Pente par défaut** : tu as dit 45°, mais l'exemple du §32.3 donne `"defaut": 35`. Je garde **45°** sauf avis contraire.
- **Pente minimale de l'ardoise** : le §28.1 donne 22°, le §3 donne 24° et le tableau de recouvrement commence à 25°. Je garde 25° (pas de calcul en dessous, avec une alerte) jusqu'à la relecture du DTU.
- **Écriture des formules** : le §19 écrit les règles en pseudo-code (`if`, `ceil`). Je propose de garder le langage de formules actuel (`si(…)`, `arrondi_sup(…)`), déjà testé et qui vérifie les unités. Seule la forme change, pas le fond.
