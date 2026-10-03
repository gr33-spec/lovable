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
| `questions` | 4 au plus une fois le plafond en place (plan v3, étape 3) : `id`, `texte`, `boutons` [{label, valeur}], `je_ne_sais_pas`, `saisie_libre`, `unite`. Jamais une quantité. |
| `lignes` | à commander : `id` stable, `libelle`, `quantite`, `unite`, `conditionnement`, `ouvrage`, `origine` (calcul ou devis), `a_confirmer`, `explication` |
| `a_chiffrer` | ce que le fournisseur doit proposer (modèle non choisi) |
| `hypotheses` | les valeurs par défaut utilisées (pente 45°…), avec leurs choix |
| `peut_partir` | la liste peut être envoyée au fournisseur |

`explication` (§39) contient :

- `phrase` : par exemple « 9 313 pièces = surface de toiture 200 m² · pente du toit 45° · zone climatique 3 · longueur du rampant 5,5 m · recouvrement 95 mm · pureau 10,25 cm · marge recommandée 5 % ».
- `morceaux` : chaque élément de la phrase, avec sa `confiance` (`devis`, `hypothese`, `referentiel` ou `artisan`). Un morceau qui porte une `cle` est modifiable.

## Répondre — `POST /v1/quantitatifs/{id}/reponses`

```json
{ "reponses": [{ "question": "engine:param:nb_descentes", "valeur": "2" }] }
```

- `valeur: null` veut dire « je ne sais pas » : la valeur par défaut est gardée.
- `"ok"` confirme une ligne reprise telle quelle.

## Corriger — `POST /v1/quantitatifs/{id}/corrections`

- Changer une valeur : `{ "action": "modifier", "cle": "param:pente", "valeur": "30" }`. Seules les lignes qui en dépendent sont recalculées.
- Ajouter une ligne : `{ "action": "ajouter", "ligne": { "libelle": "Chatière", "quantite": "4", "unite": "u", "prix": null } }`.

La réponse est toujours le quantitatif complet, à jour.
