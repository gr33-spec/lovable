# Porte d'entrée `/v1/quantitatifs` (§38)

La seule porte du calcul : l'appli (chat) et les partenaires (Rappidos en premier) y passent. Aujourd'hui, l'accès se fait avec la session d'un compte artisan ; la clé par partenaire (avec quota) viendra ensuite, sans changer les routes.

## S'authentifier — clé API partenaire

- L'appli passe par la session ; un partenaire (Rappidos…) passe par une **clé API** : en-tête `X-Api-Key: bc_…`, sans cookie ni `x-company-id` (la clé porte son entreprise).
- La clé se crée dans l'appli (Compte → « Clés API partenaire »), ou par `POST /v1/partner-keys` `{ "nom": "Rappidos", "quotaMensuel": 500 }` ; elle n'est montrée qu'une fois. `GET /v1/partner-keys` liste les clés (préfixe, quota, utilisées ce mois) ; `DELETE /v1/partner-keys/{id}` la révoque. Ces trois routes exigent une session : une clé ne gère pas les clés.
- **Quota** : `quotaMensuel` quantitatifs créés par mois civil et par clé. Au-delà : `429 too_many_requests` avec `{ quota, utilises }`. Les lectures (`GET`) ne comptent pas. La limitation de débit par adresse s'applique en plus.
- Une clé révoquée ou inconnue : `401 unauthenticated`.

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
- `infos` (facultatif, 4 000 caractères) : les informations sur le chantier, écrites comme on les dirait (« Pente 42°. Rampants 2 × 6,50 m. Les Velux sont conservés. »). Seules les mesures nommées entrent dans le calcul (pente, rampant, faîtage, gouttière, descentes, cheminées, périmètre, épaisseur, développé) ; elles passent devant le devis et l'explication cite les deux ; le reste est gardé et transmis au fournisseur dans « Le chantier en bref ». Sans IA. Une phrase d'exclusion (« garage non compris », « Velux fournis par le client ») retire du « À commander » la ligne qui en nomme tous les mots ; elle reste au détail sans prix, « exclu par l'artisan ». Voir `docs/infos-chantier-facultatives.md`.
- `metier` (facultatif) : `couverture` ou `platrerie` ; choisit le référentiel. Absent : le métier de l'entreprise. Un métier sans référentiel répond `422` `{ "error": { "code": "no_referential", "details": { "metier", "disponibles": ["couverture", "platrerie"], "message" } } }` ; rien n'est créé ni décompté.

### Infos chantier après coup

- `PUT /v1/projects/{projetId}/infos` `{ "texte": "Pente 35°" | null }` : remplace la note du chantier ; le quantitatif se recalcule au prochain `GET`.
- `POST /v1/projects/{projetId}/infos/croquis` (multipart : `file` image JPEG/PNG/WebP ou PDF, `commentaire` facultatif, `article` facultatif) : la photo est gardée telle quelle (jamais lue par l'IA). Sans `article`, le commentaire rejoint la note (« Croquis (nom) : … ») ; avec `article` (la clé d'un article de la liste, `ecran.purchase.toBuy[].key`), le croquis est rattaché à cette ligne, sa précision reste à l'article, et il part avec la commande (ligne « — croquis joint », pages du PDF, pièce jointe du mail). Réponse `201 { id, nom, article?, commentaire? }`.
- Le quantitatif rend `infos: { texte, croquis: [{ id, nom }] }`.
- Deux sources qui se contredisent (la ligne du devis dit 40°, son en-tête 35°) donnent une question `engine:param:<clé>` avec les deux valeurs en boutons ; la note de l'artisan tranche sans question.
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
