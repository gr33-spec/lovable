# Catalogue métier : audit, architecture, sources (31 octobre 2026)

Demande de Greg du 31 octobre 2026 (« Mobiiz doit comprendre le langage des artisans »). Ce document dit ce qui existe,
ce qui a été fait, d'où viennent les données et ce qui reste. Il est tenu à jour à chaque étape (voir `docs/REPRISE.md`).

## 1. L'existant (audit)

| Brique | Où | État avant le 31 octobre |
|---|---|---|
| Catalogue en données | `packages/domain/src/catalogue/donnees/*.ts` (amorce), table `catalogue_article` (copie modifiable par l'admin) | Désignations génériques, sans marque, 11 métiers, famille › produit › variante |
| Recherche | `rechercherArticles` (`catalogue.ts`), `GET /v1/catalogue?q=` | Mots partiels, fautes légères, synonymes ; pas de dimensions normalisées, une faute pouvait rapprocher 18×40 et 18×50 |
| Saisie « Écris ta liste » | `apps/web/src/components/ecrire-ma-liste.tsx` | Intitulé et quantité séparés (30 octobre), propositions en puces plates |
| Intitulés des artisans | `libelle_ecrit`, `libelles-artisans.ts`, Admin › Catalogue « Intitulés proposés par les artisans » | Privés à l'entreprise ; propositions génériques (3 entreprises) validées par l'admin |
| Référentiel couverture | `packages/domain/src/referential/data/roofing.ts`, `docs/referentiel-couverture.md` | Produits sourcés (Edilians HP 10 réf. 205, canaux Poudenx, liteaux 18×40 et 27×40) utilisés par la lecture IA, pas par la saisie |
| Lecture IA des devis | `LectureReader`, prompt `lecture_devis` v4 | Demande le modèle d'une tuile à remplacer (« Quelle tuile : modèle et teinte ? ») ; réponse écrite librement |
| Achats groupés | `clesDeRegroupement`, `referenceStricte` | Un article du catalogue se regroupe par sa clé ; jamais deux articles différents additionnés |
| Demande au négoce | `supplier-packet.ts` | La désignation part telle quelle (liste, PDF, mail) ; la référence d'une ligne n'a pas de colonne à part dans le PDF |

## 2. Ce qui est fait (étapes 1 à 7)

- **Moteur de recherche métier** (`rechercherAvecPrecisions`, `requeteAPlat`) :
  - dimensions de toutes les écritures (« 18x40 », « 18 x 40 », « 18/40 », « 18*40 », « 18×40 », « 18 40 ») ;
  - une dimension ou une référence (mot avec chiffre : « h14 », « hp10 », « 18x40 ») ne se rapproche jamais à une faute
    près : une H14 n'est pas une HP10, une 18×50 n'est pas une 18×40 ;
  - le féminin des qualificatifs (« blanche mate » trouve « blanc mat ») ;
  - un mot qui précise sans désigner (couleur, finition, « pro ») absent de l'article ne l'écarte pas : il est rendu en
    `precisions` et reste dans la désignation de l'artisan (« Tuile H 14 Huguenot, réf. 204 (Edilians) rouge ») ;
  - à score égal, un article sourcé passe devant.
- **Fiche d'article** : `marque`, `reference`, `statut` (`verifie` : référence commerciale vérifiée ; `generique`),
  `source` (libellé, lien, date de vérification). L'API la rend avec chaque résultat (`GET /v1/catalogue?q=`).
- **Écris ta liste** : un produit à plusieurs formats tient en une puce (« Liteau › »), ses formats en boutons ;
  « Je ne trouve pas mon matériau — le saisir moi-même » ouvre la saisie libre, avec « Marque, modèle ou référence
  (facultatif) » ajouté à la désignation (après une virgule).
- **Une ligne écrite n'est plus coupée** : dans une liste sans lecture (`lectureDepuisLignes`), ce qui suit « - » devient
  la précision de la ligne au lieu d'être perdu (test `ligne-ecrite-entiere.test.ts`).
- **Apprentissage** (`candidatesDeLibelles`) : les intitulés voisins (« Tuile XYZ rouge », « XYZ terre cuite rouge »,
  « Tuile modèle XYZ ») se rapprochent par leurs mots qui identifient (un mot inconnu du catalogue, une référence) ; des
  dimensions différentes ne se rapprochent jamais ; un groupe devient candidat à `CATALOGUE_SEUIL_PROPOSITION` entreprises
  (3 par défaut) ; un mot inconnu doit être écrit par ce nombre d'entreprises (un nom de client ne passe pas) ; jamais de
  mots comme chantier, client, réf., rue. L'admin voit la candidate et ses variantes (Admin › Catalogue), vérifie le
  produit et l'ajoute ; seul le catalogue est proposé à tous. Un seul système : celui des propositions existant.
- **Lecture IA** : une question de modèle ou de référence (« Modèle de la tuile ? ») propose, sous la réponse écrite, les
  références du même moteur (`ReferencesCatalogue`, à l'écran des questions et dans la ligne ouverte) ; la quantité du
  devis est gardée ; la réponse entre dans la fiche du chantier, qui part au négoce. Jamais une référence choisie sans
  l'artisan (e2e « Catalogue métier »).
- **Achats groupés** : déjà en place (rien de nouveau à construire) : la liste montre au plus une suggestion d'achat
  groupé ouvert de son métier et de son secteur ; un article du catalogue se regroupe par sa clé technique
  (`clesDeRegroupement`), jamais deux articles différents additionnés.

## 3. Les sources réellement intégrées

| Données | Source | Statut |
|---|---|---|
| Liteaux 18×40, 14×40, 27×40, 14×50, 18×50, 18×75, 25×50, 27×27 (sapin traité classe 2) | Référentiel couverture du fondateur, §200 et §760 | générique, sourcé |
| Tuile H 14 Huguenot, réf. 204 (Edilians) | [Fiche Edilians](https://edilians.eu/h-14-huguenot.html), consultée le 31/10/2026 | vérifié ; coloris non publiés sur la fiche, donc non listés |
| Tuile HP 10 Huguenot, réf. 205 (Edilians) | [Documentation Edilians](https://edilians.com/media/productattach/2/0/205_fag_hp_10_huguenot_19042024_bd.pdf) (référentiel) | vérifié |
| Six tuiles canal Poudenx (réf. 401/451 à 410/460, Edilians) | [Tuiles canal Edilians](https://edilians.com/media/wysiwyg/Encyclopedie/canal-tuiles-edilians.pdf) (référentiel §35.3) | vérifié |

Rien d'autre n'a été importé. Les articles de l'amorce d'origine (sans statut) restent des désignations génériques non
sourcées, à faire relire.

**ETIM, FAB-DIS** : ce sont des formats d'échange (classification et fiches produit des fabricants vers les
distributeurs), pas des catalogues publics. Les données FAB-DIS s'obtiennent auprès des fabricants ou des distributeurs,
avec leurs conditions de réutilisation. La fiche d'article ci-dessus peut accueillir un import ETIM ou FAB-DIS plus tard
(marque, référence, attributs, source) ; rien n'est récupéré automatiquement, aucune collecte massive.

## 4. Comment tester

- Domaine : `cd packages/domain && npx vitest run test/catalogue-metier.test.ts` (liteau, liteau 18x40, 18 40, H14 rouge,
  HP10, tuile, crochet gouttière, peinture blanche mate professionnelle, mot inconnu).
- e2e : « Je la note moi-même » (Liteau › 18×40, H14 rouge, saisie libre avec modèle).
- À la main, sur test.mobiiz.fr : Nouvelle liste › Je la note moi-même, taper « liteau », « H14 rouge », « 18 40 ».

## 5. Ce qui reste

- **Données** : étendre la couverture avec des fiches fabricant vérifiées (ardoises, accessoires de tuiles, écrans),
  puis la zinguerie et les autres métiers ; un import ETIM ou FAB-DIS quand un fabricant ou un distributeur fournit ses
  données avec leur licence.
- **La réponse « modèle » dans la ligne** : aujourd'hui elle entre dans la fiche du chantier (le bref envoyé au négoce)
  quand la lecture la pose pour tout le chantier ; la lecture réelle (Opus) la relie à sa ligne (`reponsesDeLaLigne`) :
  à revérifier en ligne quand le crédit IA reviendra.
- **Rapprochement plus fin** des intitulés (synonymes, unités) après les premiers retours de l'admin.
