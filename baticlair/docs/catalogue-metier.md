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

## 2. Ce qui est fait (étapes 1 à 4)

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
  (facultatif) » ajouté à la désignation (après une virgule : un « - » couperait la ligne, voir §5).

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

## 5. Ce qui reste (étapes 5 à 8)

- **Apprentissage** : rapprocher les intitulés voisins (« Tuile XYZ rouge », « XYZ terre cuite rouge ») avant le seuil des
  propositions ; seuils configurables (aujourd'hui 3 entreprises, constante `SEUIL_PROPOSITION`).
- **Lecture IA** : la question « Quel modèle de tuile ? » répondue avec le même moteur (puces du catalogue + saisie
  libre), la quantité du devis gardée.
- **Achats groupés** : signaler sur la liste un achat ouvert pour une référence compatible (clé technique, unité).
- **Une ligne écrite à la main est coupée au premier « - »** dans la lecture sans modèle (`lectureDepuisLignes`) : la
  fourniture garde seulement ce qui précède. À corriger pour garder la désignation entière.
- **Données** : étendre la couverture (ardoises par fabricant, accessoires) avec des fiches vérifiées, puis la zinguerie.
