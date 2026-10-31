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
| Tuile H 14 Huguenot, réf. 204 (Edilians) | [Fiche Edilians](https://edilians.eu/h-14-huguenot.html), consultée le 31/10/2026 | vérifié |
| Tuile HP 10 Huguenot, réf. 205 (Edilians) | [Documentation Edilians](https://edilians.com/media/productattach/2/0/205_fag_hp_10_huguenot_19042024_bd.pdf) (référentiel) | vérifié |
| Six tuiles canal Poudenx (réf. 401/451 à 410/460, Edilians) | [Tuiles canal Edilians](https://edilians.com/media/wysiwyg/Encyclopedie/canal-tuiles-edilians.pdf) (référentiel §35.3) | vérifié |
| **52 autres modèles de tuiles Edilians** (Oméga 10 et 13, Oméga Max, Alpha 10, Rhôna 10, Delta 10, H 10, PV 10, PV 13, HP 13, HP 17, Double HP 20, Panne H2, Panne S, Monopole N°1, Losangées, Marseille, Méridionale, Romane Sans, Canal S, Canal Sablière, Médiane, Plein Sud, plates 16×24, 17×27, 20×30, Élixir…), **avec leurs coloris et l'EAN de chaque coloris** ; les coloris aussi pour H 14, HP 10 et les canaux Poudenx | Une fiche produit par modèle sur edilians.com (trouvée par l'index public `sitemap.xml`, lue une fois le 31/10/2026, une page toutes les 1,5 s) : nom, référence = numéro de la fiche technique (« 104_fog_omega_10… » → réf. 104), coloris et EAN publiés. Sans numéro de fiche, la référence est l'EAN du coloris | vérifié |
| **Ardoises fibres-ciment Cedral** : Kergoat, Orléane, Pommay, Vertigo, Vertigo Alterna, Alterna, Tecta Texture, avec formats, bords et coloris | Pages modèle de [cedral.world/fr-fr](https://www.cedral.world/fr-fr/toiture/ardoises-fibres-ciment/kergoat/), 31/10/2026 | vérifié |
| **Ardoises naturelles Cupa Pizarras** : carrières CUPA 3, 4 (Armadilla), 5 (Valdacal), 6, 7, 9, 10 (Las Arcas), 13, 17, en 13 formats (50×25 à 27×18) | [Catalogue couvreur Cupa Pizarras](https://www.cupapizarras.com/sites/default/files/catalogue_couvreur.pdf) (édition 2024) : carrières et tableau de pose. Un format se confirme auprès du négoce selon la carrière | vérifié (carrière) |
| **Peinture par attributs** : usage × liant × finition × teinte × conditionnement (murs et plafonds, pièces humides, boiseries, fer, façade, sols, impressions, bois extérieur) | Désignations génériques du comptoir, sans marque (`peinture-attributs.ts`) | générique |

Pas encore : Terreal, Monier (Bramac), Wienerberger (Koramic), ardoises d'Angers et Rathscheck (leur site ne publie pas d'index lisible, ou le catalogue n'a pas été trouvé en ligne : à demander au fabricant ou au négoce).

**ETIM, FAB-DIS** : ce sont des formats d'échange (classification et fiches produit des fabricants vers les
distributeurs), pas des catalogues publics. Les données FAB-DIS s'obtiennent auprès des fabricants ou des distributeurs,
avec leurs conditions de réutilisation. La fiche d'article ci-dessus peut accueillir un import ETIM ou FAB-DIS plus tard
(marque, référence, attributs, source) ; rien n'est récupéré automatiquement, aucune collecte massive.

## 3 bis. Les références des artisans (31 octobre 2026, soir)

Demande de Greg : « un produit que nous n'avons pas […] devient une référence à partir du moment où quelqu'un d'autre
formule la même chose ou commande en achat groupé ». Ce qui se passe :

- **Comptent** : les intitulés écrits dans les listes (`libelle_ecrit`) et les lignes libres des achats groupés (« je décris
  mon besoin »), une fois par entreprise, anonymisés (un intitulé où l'anonymisation retire quelque chose n'est jamais
  gardé ; un intitulé qui contient chantier, client, rue, chez, M., Mme… n'entre jamais).
- **Rapprochés** : même mot qui identifie (« ZX 12 » = « zx12 », « Zéphyr » = « zephyr »), jamais deux dimensions
  différentes.
- **Publiés dès deux entreprises** (`CATALOGUE_SEUIL_COMMUNAUTE`, 2 par défaut) : proposés à tous dans « Écris ta liste »,
  marqués « écrit par d'autres artisans », jamais « vérifié », sans nom d'entreprise. Un mot inconnu doit venir de deux
  entreprises (un nom de client ne se répète pas d'une entreprise à l'autre).
- **L'admin** (Admin › Catalogue) voit chaque référence, « proposé à tous » ou non ; il l'écarte (« Ne plus le proposer à
  tous », table `reference_ecartee`, les intitulés écrits restent) ou l'ajoute au catalogue (elle devient un article).
- Test permanent : `apps/api/test/libelles-artisans.test.ts` (« RÉFÉRENCES DES ARTISANS »).

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
