# Plan d'architecture v3 — une page, avant tout code

Répond aux §27.7, §38 et §39 du référentiel (`docs/referentiel-couverture.md`, 39 sections). Rien n'est codé avant ton « ok ».

## 1. Une seule porte d'entrée : API first (§38)

```
Appli (chat) ─┐                         ┌─ referentiels/commun/      departements · unites · conditionnements
Partenaires ──┼─▶ /v1/quantitatifs ─▶ moteur générique ─▶ referentiels/couverture/   metier · ouvrages · materiaux · regles
 (plus tard)  ┘   (seule porte)          (packages/domain)  referentiels/platrerie/    defauts · questions · vocabulaire · tests/
```

| Route | Rôle |
|---|---|
| `POST /v1/quantitatifs` | devis (PDF ou texte) et contexte (département, métier, surcharges) ; réponse immédiate : un identifiant (lecture en arrière-plan, déjà en place avec B3) |
| `GET /v1/quantitatifs/{id}` | état `en_cours` / `questions` / `pret` / `erreur` ; en `questions` : texte, boutons, défaut, sensibilité |
| `POST …/{id}/reponses` | réponses aux questions |
| `POST …/{id}/corrections` | modifier une valeur, retirer une ligne (stock), ajouter une ligne libre : les mêmes actions que dans le chat |

- **Réponse `pret`** : lignes avec identifiant stable, libellé normalisé, quantité, unité de commande, conditionnement, hypothèses, confiance, `metier` et `version_referentiel`.
- **Le chat n'appelle que ces routes.** Les routes actuelles (`/documents/:id/takeoff`, `/takeoffs/:id/answers`…) deviennent des alias, puis disparaissent.
- **Hors MVP mais prévu sans refonte** : une clé par partenaire, avec quota (même mécanisme que la limitation de débit B2), isolation des données par partenaire, documentation OpenAPI.

## 2. Chaque ligne s'explique en une phrase modifiable (§39)

- **La phrase n'est pas écrite à la main.** L'API la fabrique à partir des hypothèses de la règle (`hypotheses_a_afficher`) : « 9 271 ardoises = 200 m² × 44,1 ardoises/m² (30×22, recouvrement 95 mm) + 5 % de perte ».
- **Chaque morceau de la phrase est une valeur modifiable**, avec sa clé, son unité, ses choix et son niveau de confiance (mesure du devis, hypothèse par défaut ou estimation). L'appli affiche ces morceaux comme des boutons.
- **La voix passe par la même grammaire** (« mets 8 % de perte »), qui est construite à partir de `defauts.json` et `questions.json`, et non écrite en dur.
- **Seule la ligne touchée se recalcule** : une surcharge vaut pour cette ligne, sauf si l'artisan choisit « Toujours », auquel cas elle devient son habitude (§23.1). Pour chaque modification, l'API renvoie en une ligne ce qui a changé.
- **Trois actions par ligne, pas plus** : modifier, retirer (la ligne reste barrée, avec « j'en ai en stock »), ajouter une ligne libre.
- **Les abréviations sont écrites en clair** (« R 100 » devient « recouvrement 100 mm »), et le total de chaque ouvrage est affiché en tête de son groupe.

## 3. Le moteur sans métier dedans (§27)

- **Les fichiers JSON sont vérifiés au chargement** par un schéma JSON (§19, §32) et par le contrôle d'intégrité actuel (unités, formules, sources). Un référentiel invalide ne se charge pas.
- **Le moteur actuel est gardé** (formules à unités, tables, hypothèses, pertes, conditionnements, traces). Seule change sa source : il lit des JSON au lieu de TypeScript.
- **Version figée par chantier** : chaque quantitatif enregistre `{ metier, version }` et se recalcule avec sa version d'origine. Aujourd'hui, il est recalculé avec les règles du jour : **à corriger**.
- **4 questions au maximum**, choisies par sensibilité supérieure à 5 % et par ordre de priorité. Aujourd'hui, le nombre n'est pas plafonné : **à corriger**.
- **Données de confiance** : tout ce qui vient des §34-36 est sourcé fabricant. Les valeurs « à vérifier DTU » et les anciennes §3, 5 et 7 (`confiance: "estimation"`) apparaissent dans les hypothèses avec « à confirmer ».

**Le métier écrit en dur dans le code aujourd'hui, et où il partira :**

| Fichier · fonction | Contenu | Destination |
|---|---|---|
| `domain/referential/data/roofing.ts` (966 lignes) | tout le référentiel couverture | `couverture/*.json` |
| `domain/trades/roofing.ts` · `ROOFING_PROFILE` | familles, mots-clés, oublis | `couverture/vocabulaire.json`, `regles.json` |
| `domain/trades/light-profiles.ts` | 9 autres métiers en TypeScript | un dossier par métier, plus tard |
| `domain/referential/zone.ts` · `climateZone` | départements en zone 2 et 3 | `commun/departements.json` |
| `domain/trust/purchase-view.ts` · `WRITTEN_UNITS`, `MATERIAL_WORDS` | unités écrites, matières | `commun/unites.json`, vocabulaire |
| `domain/takeoff/characteristics.ts` · `MATERIALS`, `COLOURS` · `validation.ts` · `WORK_HEADS` | matières, coloris, « jouée » | vocabulaire commun ou métier |
| `api/takeoff/takeoff.service.ts` · `review()` | `ROOFING_REFERENTIAL` et fait « zone » en dur | choix selon le métier, `departements.json` |
| `api/takeoff/prompt.ts` · consigne v8 | « tuiles, ardoises, liteaux, zinc » | vocabulaire injecté depuis le métier, à la demande |
| `web/components/chat.tsx` · `reasoningOf`, `parseCommand` | `param:pente`, `param:zone` | morceaux d'explication et grammaire venant de l'API |
| `api/demo/demo-documents.ts` | devis de démonstration de couvreur | démo du dossier métier |

Ce qui reste dans le moteur, parce que c'est commun à tous les métiers : unités et conversions, degrés et %, tri des doutes de l'IA (lecture ou calcul), pertes, conditionnements, agrégation de la liste d'achats.

## 4. Ordre des chantiers

1. **Porte `/v1/quantitatifs`** au-dessus de l'existant, et le chat branché dessus (lignes avec identifiant stable, version, explication).
2. **Schémas JSON** des 7 fichiers métier et des 3 fichiers communs, avec un test qui vérifie qu'un fichier faux est refusé.
3. **Migration de la couverture** avec les données §34-36 :
   - tous les tests au vert ;
   - version figée et 4 questions au maximum en place ;
   - CHANGELOG commencé (`referentiels/couverture/CHANGELOG.md`).
4. **`platrerie/` minimal** : une cloison 72/48 (plaques, rails, montants) avec un test, qui doit tourner **sans toucher au moteur**. Si une seule ligne de moteur change, l'architecture n'est pas validée et je te le dis.
5. **Ensuite seulement** : le chat de la section 21, avec une maquette avant le code.

## 5. Ce que les données fabricant changent, et trois points à trancher

- **Ardoises (§34)** : la formule Cupa compte l'épaisseur du crochet. Ton devis de 200 m² en 30×22 (45°, zone 3) passe de **9 313 à 9 271** ardoises avec un crochet de 1 mm, et à **9 200** avec le crochet inox de 2,7 mm prévu en zone littorale. Les tests seront mis à jour avec ces valeurs.
- **Pente par défaut** : tu as dit 45°, mais l'exemple du §32.3 donne 35°. Je garde **45°** sauf avis contraire.
- **Recouvrement de l'ardoise** : le §34 donne pureau, nombre au m², crochet et liteaux pour chaque recouvrement. Le recouvrement lui-même vient toujours du tableau pente × région × rampant, que le §37 marque « à vérifier ». Je garde le tableau actuel, affiché comme hypothèse, jusqu'à ce que tu fournisses le DTU 40.11.
- **Écriture des formules** : je garde le langage actuel (`si(…)`, `arrondi_sup(…)`), testé et qui vérifie les unités, plutôt que le pseudo-code du §19. Seule la forme change, pas le fond.
