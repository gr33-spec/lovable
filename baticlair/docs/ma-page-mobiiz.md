# Ma page Mobiiz : la page publique de chaque entreprise (chantier du 16 novembre 2026)

Demande de Greg (16 novembre 2026) : chaque entreprise inscrite a une landing page propre, moderne et partageable
(`mobiiz.fr/e/<adresse>`), réglée en 5 minutes depuis le téléphone, depuis Profil › Mon entreprise › Ma page. Branche de
travail : `claude/company-public-page-htnc6f` (partie de `claude/saas-achat-artisans-prompt-1lyihx`, la branche de test).
Hors périmètre, à ne pas toucher : l'assistant IA, le quantitatif, les achats groupés (le chantier « quantitatif IA » tourne
en parallèle dans une autre session).

## REFONTE DU RENDU (Greg, 16 novembre 2026, 2e message ; RÈGLE CHANGÉE)

« Ce que tu as fait ressemble à un écran d'application sombre, pas à un site d'artisan. » La mécanique est gardée (éditeur,
photos, sécurité, tests) ; le rendu public est refait : UN SEUL MODÈLE (les trois modèles, le nuancier, le fond sombre, les
pictogrammes, les motifs et les visuels dessinés sont retirés), fond ivoire et typographie / boutons de la landing de
Mobiiz, « Appeler » jaune #FED206 texte noir, quatre teintes sobres (ardoise, anthracite, bleu nuit, vert sapin), de vraies
photos en grand. Structure d'un site d'artisan : barre du haut fixe (logo ou initiales, menu Prestations / Réalisations /
À propos / Contact, téléphone ; sur téléphone : « Appeler » et menu déroulant), accueil plein écran sur la photo (grand
titre « Couvreur à Lannion », le nom dessous, la ligne de preuves, « Appeler » et « Demander un devis »), prestations
(titre + phrase, proposées d'après le métier à la création de la page), réalisations PAR CHANTIER (titre sur la photo,
visionneuse au toucher, deux colonnes sur ordinateur, le premier en grand quand ils sont en nombre impair), à propos (photo
de l'équipe si elle existe), zone, contact foncé « Un projet ? Parlons-en », pied de page (nom, SIRET, mentions légales,
« Voir mon site », « Page créée avec Mobiiz »). Sur téléphone, « Appeler » fixé en bas une fois l'accueil passé, et alors
retiré de la barre du haut (jamais en double). Aucune rubrique vide, ni dans la page ni dans le menu. Données : colonne
`prestations` (JSON), table `realisation_page`, `photo_page.realisation_id`, photo de rôle `equipe` ; colonnes `modele`,
`fond`, `pictos`, `motif` retirées (la migration n'a jamais été déployée : régénérée en une seule).

Comparée (captures) à la landing de Mobiiz et à trois sites de couvreurs (la-couverture.fr, couverture-jmc.fr,
couvreur-insulaire.fr). Lighthouse mobile : 93 à 94 en performance, 100 en bonnes pratiques.

## « MON SITE » ET « ENTRE PROS » (Greg, 16 novembre 2026, 3e message ; RÈGLES CHANGÉES)

- Validé par Greg. Onglet « Mon site » dans la navigation principale (5e onglet, téléphone et ordinateur) : il ouvre
  l'éditeur (`app/(app)/mon-site`), aperçu en haut, puis Teinte, Prestations, Chantiers, À propos, « Page visible »,
  « Partager », « Voir mon site » (puis Coordonnées et Adresse du site). Règle changée : avant, Profil › Ma page ; l'entrée
  du Profil est retirée, « Mon entreprise » renvoie à l'onglet, l'ancienne adresse `/compte/ma-page` y redirige. Partout
  dans l'app : « Mon site ». Cinq onglets tiennent à 375 px (11 px) et à 320 px (10 px, un rien plus serrés), sans texte
  coupé (e2e « cinq onglets »).
- Une seule page, deux niveaux. Règle changée : avant, la disponibilité Mission et « Proposer une mission » étaient sur
  la page publique (bloc Contact) ; maintenant la page publique (mise en cache, la même pour tous) ne dit RIEN de Mission.
  Une entreprise CONNECTÉE (missions ouvertes) voit en plus le bloc « Entre pros » sous l'accueil (îlot client
  `entre-pros.tsx`, `GET /v1/pages-entreprises/:adresse/entre-pros`, privé, sans cache) : disponibilités, compétences
  (profil Mission, champs masqués comme dans Mission ; sinon les métiers), « Proposer une mission » (vers la disponibilité
  publiée : jamais de contact libre, règle Mission) ; sans disponibilité, « Publier une mission ». Un visiteur non connecté
  ne le voit jamais (401) ; un blocage, un site privé ou masqué, Mission coupée : rien.
- Dans Mission, le profil d'une entreprise ouvre son site (`GET /v1/pages-entreprises/entreprise/:companyId`, puis
  `/e/<adresse>#entre-pros`) ; sans site en ligne, la fiche Mission d'avant.
- CV, diplômes, attestations : ni affichés ni obligatoires. Règle changée : avant, un document du dossier coché « sur mon
  profil public » s'y montrait et s'ouvrait par toute entreprise vérifiée ; maintenant plus jamais (case retirée, lien
  refusé). Ils partent seulement quand l'artisan les envoie lui-même dans une discussion de Mission. Reste à trancher par
  Greg : un document joint à une RÉPONSE à une mission (déjà possible avant) est-il gardé ?
- Mission sur le site de test : l'interrupteur existe (Admin › Réglages › Missions › « Ouvrir les missions »). Il demande
  le compte admin de Greg (code à 6 chiffres) : à faire par lui. C'est un réglage de la base : la production n'est pas
  touchée.

## Pas-à-pas Vercel Blob (à donner à Greg après sa validation, rien n'est fait sans lui)

1. vercel.com › l'équipe gr33-spec › projet de l'API (« baticlair-api ») › onglet Storage › Create Database › Blob.
2. Nom : `mobiiz-photos` ; région : Francfort (fra1), la plus proche ; Create.
3. Écran suivant : Connect Project › projet de l'API ; environnements : Preview (pour test.mobiiz.fr) et, plus tard,
   Production ; Connect. Vercel ajoute seul la variable `BLOB_READ_WRITE_TOKEN` à l'API.
4. Dans le store (Storage › mobiiz-photos › Settings), copier « Base URL » (`https://<id>.public.blob.vercel-storage.com`).
5. Projet du site (« baticlair ») › Settings › Environment Variables › Add : nom `PHOTOS_BLOB_URL`, valeur la Base URL,
   environnements Preview (et Production plus tard) ; Save.
6. Redéployer les deux projets (Deployments › ⋯ › Redeploy) pour que les variables soient prises.
7. Vérifier : onglet « Mon site » › ajouter une photo ; elle passe « prête » en quelques secondes et s'affiche sur `/e/<adresse>`.

## Point de reprise (à tenir à jour à chaque étape)

Reprendre à la première case non cochée.

- [x] 1. Domaine `packages/domain/src/page-entreprise/` (thèmes, nuancier, contraste, adresse, rubriques, JSON-LD, textes) ;
      test `packages/domain/test/page-entreprise.test.ts` (19).
- [x] 2. API `apps/api/src/modules/page-entreprise/` ; migration additive `20261116180000_ma_page_mobiiz` (5 tables) ;
      test `apps/api/test/page-entreprise.test.ts` (17) ; `isolation-toutes-routes.test.ts` complété.
- [x] 3. Web : page publique `app/(vitrine)/e/[adresse]` (+ `apercu.png`), éditeur `app/(app)/compte/ma-page`, admin
      `app/(app)/admin/pages-publiques`, cache `app/api/pages-entreprises/rafraichir`.
- [x] 4. e2e `apps/web/e2e/ma-page.spec.ts` (téléphone, ordinateur, petit iPhone 375 px, thèmes clair et sombre, deux
      comptes) ; Lighthouse mobile 91 à 93 (performance), 100 (accessibilité, bonnes pratiques).
- [x] 5. Relecture du juriste (`docs/groupe/ma-page-juridique-2026-11-16.md`), captures, coût mensuel.
- [x] 6. Chaîne complète rejouée le 16 novembre sur le dernier commit (branche de test : aucun commit nouveau à intégrer) :
      domaine 1 213/1 213, API 856/856 (+1 ignoré), lint et types partout, builds ; e2e « mois » 301/302, e2e « @lots » 16/16.
      Restent rouges, HORS de ce chantier et déjà rouges sur la branche de test sans lui : 3 tests unitaires du site
      (`erreurs-precises`, `nom-app` « trois choix… Tarifs sans montant », « Analyses disponibles ») ; 1 parcours instable
      (`parcours-artisan.spec.ts:1639`, ordinateur, 1 échec sur 3 : mesure prise pendant une animation). Ma branche est
      poussée ; RIEN sur la branche de test (attend Greg).
- [x] 7. Onglet « Mon site », « Entre pros », lien Mission (3e message de Greg) : codé et testé (API 43 ciblés, e2e
      ma-page 9/9, e2e-ag-v1 entre-pros 3/3).
- [x] 8. Chaîne complète sur le commit final (branche de test intégrée, 3 fusions sans conflit) : domaine 1 217/1 217,
      API 860/860 (+1 ignoré), lint, types, builds ; e2e « mois » 304/304, « @lots » 16/16, ag-v1 88/88. Restent rouges, hors
      chantier : les 3 tests unitaires du site déjà rouges sur la branche de test. Poussé sur la branche de test.
- [ ] 9. Après l'accord de Greg : store Vercel Blob relié au projet API (`BLOB_READ_WRITE_TOKEN`) et son adresse publique
      posée sur le projet web (`PHOTOS_BLOB_URL` : les photos sont servies sous `/photos/…`, même domaine, la CSP reste
      « rien d'ailleurs »), fusion dans la branche de test, migration appliquée par le déploiement (additive).

## Ce qui existe

- **Page publique** `/e/<adresse>` : logo ou initiales, nom, accroche (sinon « Couvreur · Lannion »), métiers, zone,
  présentation, galerie, badge « Entreprise vérifiée » (SIRET vérifié), certifications et assurances déclarées, « Depuis
  2008 », horaires, « Voir mon site », formulaire de contact (l'e-mail de l'entreprise n'est jamais montré), « Membre
  Mobiiz », « Signaler cette page », mentions. Missions ouvertes (interrupteur de l'admin) ET une disponibilité publiée :
  la rubrique « Disponible pour des missions » et « Proposer une mission » ; sinon rien. Barre « Appeler / Écrire » fixe sur
  téléphone. Aucune rubrique vide (`rubriquesVisibles`). Trois architectures (`ordreDesRubriques`) : plein écran photo,
  classique en colonnes (carte d'infos collante), sobre et direct (gros bouton « Appeler 02… »).
- **SEO** : titre « Couvreur à Lannion – Nom », description 160 caractères, canonique, JSON-LD (`RoofingContractor`,
  `HousePainter`, `Electrician`, `Plumber`, `HVACBusiness`, `GeneralContractor`, sinon `HomeAndConstructionBusiness`), sans
  adresse exacte ni note inventée ; image d'aperçu 1200 × 630 (JPEG de la couverture, sinon image composée aux couleurs).
  Indexation : `PAGES_ENTREPRISES_INDEXEES=on` côté site (production seulement) ; sinon `noindex` comme le reste du site.
- **Ambiance par métier** : un thème par métier du catalogue (25) : couleur, fond, visuel de couverture dessiné en SVG
  (12 familles : toiture, peinture, électricité…), pictogramme, motif de fond, textes d'exemple (suggestions de l'éditeur,
  jamais publiés tels quels). Couleur et fond nuls = ceux du métier : changer de métier principal change l'ambiance, sauf
  ce que l'artisan a choisi.
- **Contraste** : `paletteDeLaPage` recalcule texte de bouton, liens et accents pour 4,5:1 au moins, quelle que soit la
  couleur (nuancier de 20 teintes + sélecteur libre, testé sur des couleurs extrêmes).
- **Éditeur** (Profil › Ma page, et une carte dans Mon entreprise) : enregistrement automatique à chaque changement, page
  publique régénérée aussitôt (« Enregistré : ta page est à jour »), aperçu en direct (téléphone / ordinateur, même
  composant que la page), modèles, nuancier, fond, pictogrammes, motif, logo (celui des demandes de prix), couverture,
  galerie (glisser par la poignée, flèches du clavier, légende, 20 au plus), accroche et présentation, « Mobiiz m'aide à
  l'écrire », téléphone et zone préremplis et synchronisés (vide = profil), horaires, site, année, certifications,
  « Afficher mon adresse » (désactivé par défaut), adresse modifiable une fois (l'ancienne redirige), « Partager » (lien,
  WhatsApp, QR code, partage du téléphone).
- **Photos** : réduites dans le navigateur (2 560 px, JPEG, HEIC lu par Safari), puis AVIF + WebP à 3 largeurs
  (galerie 480/960/1600, couverture 640/1280/1920, jamais agrandies) et un JPEG 1200 × 630 de partage, en arrière-plan
  (`waitUntil`), redressées, sans métadonnées ; stockage objet (`StockagePhotos` : Vercel Blob, dossier local, coupé),
  noms imprévisibles, cache d'un an ; suppression des fichiers puis de la ligne.
- **Cache** : la page lit l'API avec une étiquette par adresse (`revalidate` 5 min) ; l'éditeur, l'admin et la carte des
  coordonnées du profil la régénèrent tout de suite (`/api/pages-entreprises/rafraichir`, qui demande à l'API, avec la
  session de l'appelant, quelles adresses il a le droit de rafraîchir).
- **Sécurité** : réglages toujours sur `tenant.companyId` (garde d'entreprise, rôle lecteur refusé) ; visiteurs : page
  visible et non masquée seulement ; contact : 5 messages par heure et par IP, 30 par jour et par page, Turnstile quand il
  est branché, on ne garde que l'heure et une empreinte de l'IP ; signalement : une fois par jour et par visiteur ;
  modération dans Admin › Pages publiques (masquer, rétablir, signalements traités, journal de l'admin).

## Coût mensuel estimé (1 000 entreprises × 20 photos)

Mesuré sur de vraies photos : 0,3 à 1 Mo par photo pour ses 7 fichiers (AVIF, WebP, partage). Hypothèse : 0,8 Mo en
moyenne, 300 visites par page et par mois, 0,3 Mo d'images par visite (couverture + vignettes chargées à la demande).
Grille Vercel Blob du 23 septembre 2026 (stockage 0,023 $/Go, opérations avancées 5 $/million, transfert ≈ 0,05 $/Go).

| Poste | Calcul | Par mois |
|---|---|---|
| Stockage | 21 000 photos × 0,8 Mo ≈ 17 Go | ≈ 0,40 $ |
| Envois | 7 fichiers par photo ; 10 % des photos changent par mois | ≈ 0,10 $ (≈ 0,75 $ une fois au départ) |
| Transfert des images | 300 000 visites × 0,3 Mo ≈ 90 Go | ≈ 5 à 9 $ selon la région |
| Rendu des pages (fonctions) | 300 000 rendus, données en cache | ≈ 1 à 3 $ |
| Préparation des photos | ≈ 3 s de calcul par photo | ≈ 0,30 $ (≈ 2 $ une fois au départ) |
| « Mobiiz m'aide à l'écrire » | quelques millièmes de dollar par appel, compté comme une analyse | négligeable |

**Total : environ 7 à 13 $ par mois (≈ 6 à 12 €)**, en plus de l'abonnement Vercel. Attention : l'offre gratuite
(Hobby) plafonne Blob à 1 Go et 10 Go de transfert et interdit l'usage commercial ; pour 1 000 entreprises il faut l'offre
Pro (20 $ par membre et par mois, avec un crédit d'usage qui couvre l'essentiel de ces montants).

## Décisions prises seules

Aussi dans `docs/DECISIONS.md` (16/11).

1. Adresse « /e/<nom-de-l-entreprise> », créée à la première ouverture de Ma page (pas à l'inscription), privée.
2. Le sous-titre vide devient « Couvreur · Lannion », jamais un texte d'exemple : la page ne dit rien que l'artisan n'a pas
   dit ou que son profil ne porte.
3. Pas de photo de banque d'images : sans couverture, un visuel dessiné du métier (une page d'artisan ne montre jamais un
   chantier qui n'est pas le sien).
4. Pas d'avis ni de note (Mobiiz n'en recueille pas) : rien d'inventé dans la page ni dans les données structurées.
5. Logo : le même que celui des demandes de prix (un seul logo, synchronisé).
6. « Mobiiz m'aide à l'écrire » : même garde que le scan d'une liste (analyses offertes, plafond, e-mail vérifié) ; un
   appel réussi compte avec les analyses offertes (`droits.service.ts`, tâche `aide_ecriture_page`) ; sans droit ou IA
   coupée, une proposition tirée du profil, gratuite, et la phrase le dit.
7. « Proposer une mission » n'apparaît qu'avec une disponibilité publiée (jamais de contact libre, règle Missions).
8. Aperçu de la branche : pas de déploiement Vercel de la branche (une prévisualisation de l'API appliquerait la migration
   à une base Neon de test, et le plafond de branches Neon est atteint) ; aperçu statique et captures à la place.

## Relecture du juriste (16 novembre 2026, `docs/groupe/ma-page-juridique-2026-11-16.md`)

Fait dans le code (points « indispensables ») : bloc « Mentions légales » (éditeur = l'entreprise, SIRET, contact,
responsable de la publication, hébergeur BATI INVEST et serveurs Vercel) ; case datée « J'ai pris ces photos ou j'ai le
droit de les utiliser… » avant la première photo (`photosAccordLe`, refus `accord_photos` sinon) ; phrase RGPD du
formulaire corrigée (copie technique chez le prestataire d'e-mails, trace 30 jours) ; « déclarées par l'entreprise, non
vérifiées par Mobiiz » ; explication du badge (SIRET actif, pas un label) ; « Garantie de parfait achèvement » et « Artisan
certifié CMA » retirées des pastilles ; e-mail à l'artisan quand sa page est masquée (motif, contestation) ; ménage de la
nuit (`/v1/internal/pages-entreprises/menage`, 3 h 41 UTC) : traces de contact 30 jours, empreintes IP des signalements
30 jours, signalements 12 mois, fichiers du stockage sans photo (compte supprimé) effacés.

À DÉCIDER PAR GREG / L'AVOCAT, non fait : adresse d'établissement obligatoire (LCEN) contre « jamais d'adresse exacte » pour
un artisan à domicile ; forme juridique, RCS/RNE, capital (champs absents du profil) ; téléphone de BATI INVEST (un
`[A COMPLETER]` bloquerait la construction de production) ; assureur et zone couverte de la décennale ; e-mail facultatif
dans le signalement ; « Membre Mobiiz » (texte demandé par Greg) que le juriste propose de remplacer par « Page créée avec
Mobiiz » ; paragraphes candidats de la politique de confidentialité, du registre (n° 23 à 26) et de l'article 15 bis des
CGU (non publiés) ; région UE du store Blob ; durée de conservation chez Resend.
