# Porte d'entrée `/v1/quantitatifs` (§38)

La seule porte du calcul : l'appli (chat) et les partenaires (Rappidos en premier) y passent. Aujourd'hui, l'accès se fait avec la session d'un compte artisan ; la clé par partenaire (avec quota) viendra ensuite, sans changer les routes.

## Déposer un devis — `POST /v1/quantitatifs`

Deux formes, au choix :

- **PDF** (multipart) : champ `file`, et en option `projetId`, `reference`, `adresse`. L'IA lit le devis.
- **Lignes** (JSON, pour Rappidos), sans IA :

```json
{
  "reference": "Dupont — réfection toiture",
  "adresse": "12 rue de Siam, 29200 Brest",
  "lignes": [
    { "libelle": "Couverture en ardoises naturelles 30x22 posées au crochet", "quantite": "200", "unite": "m²", "prix": "85,00" },
    { "libelle": "Gouttière zinc demi-ronde 25", "quantite": 24, "unite": "ml", "prix": "42" }
  ]
}
```

- `quantite` et `prix` : un nombre ou un texte (« 1 250,50 ») ; `null` s'ils sont absents. Entre 1 et 500 lignes.
- `adresse` (ou code postal) : elle donne la zone climatique, qui n'est jamais demandée à l'artisan.
- Sans `projetId`, un chantier est créé, nommé avec la `reference`.

Réponses :

- **201** : le quantitatif est prêt (`etat` vaut `pret` ou `questions`).
- **202** : la lecture continue (`etat: "en_cours"`). Interroger `GET /v1/quantitatifs/{id}` toutes les 3 s (en-tête `Retry-After`).
- **422** : le fichier n'est pas un PDF.
- **400** : l'entrée est invalide.

## Lire le résultat — `GET /v1/quantitatifs/{id}`

| Champ | Contenu |
|---|---|
| `etat` | `en_cours`, `questions`, `pret` ou `erreur` (avec `erreur.raison`) |
| `metier`, `version_referentiel` | le métier (`couverture`) et la version des règles utilisée pour ce calcul |
| `compris` | ce que BatiClair a compris du devis, en une phrase par ouvrage |
| `devis` | les lignes telles que reçues, avec leur prix |
| `questions` | une à la fois côté écran, sans maximum (§41) : `id`, `texte`, `boutons` [{label, valeur}], `je_ne_sais_pas`, `saisie_libre`, `unite`. Jamais une quantité. |
| `lignes` | à commander : `id` stable, `libelle`, `quantite`, `unite`, `conditionnement`, `ouvrage`, `origine` (calcul ou devis), `a_confirmer`, `estimation` (présent quand le chiffre est approché, avec la raison et le format conseillé), `explication` |
| `a_chiffrer` | ce que le fournisseur doit proposer (modèle non choisi) |
| `hypotheses` | les valeurs par défaut utilisées (pente 45°…), avec leurs choix |
| `peut_partir` | la liste peut être envoyée au fournisseur |

`explication` (§39) contient :

- `phrase` : par exemple « 9 200 pièces = surface de toiture 200 m² · pente du toit 45° · région ardoise III (estimation) · longueur du rampant 5,5 m · recouvrement 95 mm · pureau 10,25 cm · diamètre du crochet 2,7 mm · ardoises au m² (formule Cupa Pizarras, hors table) 43,81 /m² · marge recommandée 5 % ».
- `morceaux` : chaque élément de la phrase, avec sa `confiance` (`devis`, `hypothese`, `referentiel`, `artisan` ou `estimation`). Un morceau qui porte une `cle` est modifiable.

## Répondre — `POST /v1/quantitatifs/{id}/reponses`

```json
{ "reponses": [{ "question": "engine:param:nb_descentes", "valeur": "2" }] }
```

- `valeur: null` veut dire « je ne sais pas » : la valeur par défaut est gardée.
- `"ok"` confirme une ligne reprise telle quelle.

## Corriger — `POST /v1/quantitatifs/{id}/corrections`

- Changer une valeur : `{ "action": "modifier", "cle": "param:pente", "valeur": "30" }`. Seules les lignes qui en dépendent sont recalculées.
- Ajouter une ligne : `{ "action": "ajouter", "ligne": { "libelle": "Chatière", "quantite": "4", "unite": "u", "prix": null } }`.

- Lignes du quantitatif (champ `lignes`, §41.4) : `{ "action": "renommer", "id": "<ligne>", "libelle": "…" }` et `{ "action": "fixer_quantite", "id": "<ligne>", "quantite": "9000", "unite": "pièces" }`. Une ligne reprise du devis corrige la ligne du devis ; une ligne calculée garde son calcul derrière, et `modifie` dit ce qui a été réécrit.
- Lignes du devis (champ `devis`) :
  - `{ "action": "modifier_ligne", "id": "<ligne>", "ligne": { "libelle": "…", "quantite": "200", "unite": "u" } }` ;
  - `{ "action": "retirer", "id": "<ligne>" }` ;
  - `{ "action": "confirmer", "id": "<ligne>" }` (ligne douteuse gardée telle quelle).

La réponse est toujours le quantitatif complet, à jour.

## Valider — `POST /v1/quantitatifs/{id}/validation`

L'artisan valide la liste (`valide: true`) : elle peut partir en demande de prix. `POST …/reouverture` la rouvre pour la corriger.

## L'appli (le chat du chantier)

Le chat n'appelle que cette porte :

- **Devis déjà déposé sur le chantier** : `POST /v1/quantitatifs` avec `{ "documentId": "…" }`. Déjà lu : rien n'est relu ni décompté.
- **Retrouver le quantitatif d'un chantier** : `GET /v1/quantitatifs?projetId=…` → `{ items: [le plus récent], ia_disponible }`.
- **`?ecran=1`** sur toutes les routes : ajoute `ecran`, le détail de l'écran de l'appli (lignes lues, décisions, preuves du calcul). Un partenaire n'en a pas besoin.
- **Réponse directe à une valeur du calcul** : `{ "question": "param:pente", "valeur": "40", "unite": "°" }` (ou `product:…`, `role:<ligne>`).
