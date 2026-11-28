# Sites des artisans : le socle (27 novembre 2026)

D'après les cahiers 02 et 03 (`docs/cahiers-chatgpt/`) et le message de Greg du 27 novembre 2026. En cas de différence, le
message de Greg l'emporte. Ce qui est marqué « plus tard » n'est pas fait : carrousel, animations, illustrations métier,
vibrations, « Améliorer mon référencement », pied de page « Site pro créé avec Mobiiz ».

## 1. Contenu et présentation séparés

- **Le contenu** est la ligne `page_entreprise` (textes, couleurs, prestations, options), les tables `photo_page` et
  `realisation_page`, et le profil de l'entreprise (nom, métiers, téléphone, logo, SIRET), relu à chaque affichage.
- **La présentation** est un modèle : un composant qui lit `ContenuPage` et n'écrit rien. Les modèles sont listés dans
  `MODELES_SITE` (domaine), dessinés par `ModeleAtelier` (`vue-page.tsx`) et `ModeleSobre` (`modele-sobre.tsx`, CSS
  `modele-sobre.css`, toutes ses règles sous `.pe-m-sobre`). Les calculs communs à tous les modèles (titre, garanties,
  barre de confiance, couleurs) sont faits une seule fois (`preparerSite`). Le pied de page légal et la barre « Appeler »
  sont partagés (`PiedSite`, `BarreAppel`).
- **Un seul éditeur** pour tous les modèles : le modèle se choisit dans l'onglet « Couleurs » (« Modèle du site »).
- **Rien ne se perd** : un champ qu'un modèle n'affiche pas reste enregistré, et il revient avec un autre modèle. Changer
  de modèle n'écrit que `modele` (et `modele_precedent`) : test `MODÈLES DE SITE` (`apps/api/test/page-entreprise.test.ts`),
  parcours `e2e/site-modeles.spec.ts`, où le texte du site Atelier est identique, mot pour mot, après Atelier → Sobre → Atelier.
- **Palettes** (`PALETTES_SITE`) : six associations teinte + couleur des boutons, prises dans les valeurs existantes ; le
  texte des boutons reste lisible (`texteSurCouleur`). Le jaune Mobiiz n'est plus qu'une palette parmi d'autres. Les
  couleurs se règlent de la même façon pour tous les modèles.

## 2. Brouillon et site publié

- L'éditeur modifie le **brouillon**. Le visiteur lit l'**instantané publié** (`page_entreprise.publie`, format
  `InstantanePublie` version 1 : les champs de la page, la liste des photos, les chantiers et leurs titres).
- **« Publier »** (`POST /v1/ma-page/publication`, ou l'interrupteur « Page visible ») recopie le brouillon et met le site
  en ligne. **« Page visible » coupée** (`DELETE /v1/ma-page/publication`) retire le site de la ligne, sans rien effacer.
- L'éditeur dit « Tu as des changements pas encore en ligne » et propose « Publier les changements » ; un bouton
  « Publier » apparaît à côté de « Voir mon site » quand il reste quelque chose à publier.
- **Pages déjà en ligne avant ce changement** : elles restent lues comme avant. Juste avant leur premier changement, ce
  qui est en ligne est figé (`figerAvantChangement`), donc rien ne bouge chez le visiteur sans « Publier ». Aucune donnée
  n'est réécrite par la migration.
- **Revenir au modèle précédent** : `modele_precedent`, un bouton « Revenir au modèle … » dans « Couleurs ».
- **Limite assumée** : une photo **retirée** est effacée du stockage (droit des personnes, place) : elle quitte aussi le
  site en ligne. Une photo **ajoutée** attend la publication.
- **Migration** : `20261127180000_page_modele` et `20261127200000_page_brouillon_publie`, colonnes ajoutées seulement
  (retour arrière écrit dans chaque fichier). Testées d'abord sur une copie : la base de test locale et la base des
  parcours, puis la base de la branche de test de Neon au déploiement (jamais la production).
- Tests : `apps/api/test/site-brouillon-publie.test.ts` (brouillon jamais public, publier, retirer, page d'avant le
  brouillon, photos, droit de publier, deux artisans isolés, adresses), `packages/domain/test/sites-socle.test.ts`.

## 3. Adresses : l'audit

| Point | État |
|---|---|
| Forme | `mobiiz.fr/e/<adresse>` : 3 à 50 caractères, minuscules, chiffres, tirets (`refusAdresse`). |
| Noms réservés | Étendus le 27 novembre : en plus des écrans de Mobiiz, les noms techniques et de messagerie (`www`, `mail`, `smtp`, `mx`, `api`, `api-test`, `cdn`, `static`, `staging`…) et de marque (`mobiiz`, `bati-invest`…). Test `sites-socle.test.ts`. |
| Doublons | Adresse unique en base ; une adresse prise, ancienne ou réservée n'est jamais redonnée (`adressePrise` : page, ancienne adresse, table `adresse_page_reservee`). Une demande d'adresse prise répond 409. |
| Changement d'adresse | Une seule fois ; l'ancienne redirige vers la nouvelle et n'est jamais réattribuée. Test `ADRESSES` (`site-brouillon-publie.test.ts`). |
| Entreprise supprimée | Son adresse reste réservée pour toujours (déclencheur `adresse_page_reservee`, 19 novembre 2026). |
| Brouillons | Jamais servis au public : la route publique ne lit que l'instantané publié et répond 404 à une page non visible ou masquée. Les fichiers de photos ont des adresses imprévisibles (identifiant aléatoire) ; une photo d'un brouillon n'est liée nulle part tant qu'elle n'est pas publiée. |
| Prise de contrôle de sous-domaine | Impossible aujourd'hui : il n'y a pas de sous-domaine par artisan, les sites sont des chemins de `test.mobiiz.fr`. |

### Sous-domaine `dupont-couverture.mobiiz.fr` ou chemin `mobiiz.fr/dupont-couverture` ?

À décider par Greg ; **rien n'a été changé** (ni DNS, ni domaine, ni Vercel).

- **Chemin (aujourd'hui `/e/<adresse>`)** : rien à configurer, le certificat de `mobiiz.fr` couvre tout, aucun risque de
  prise de contrôle, un seul site pour Google. Passer à `mobiiz.fr/<adresse>` (sans `/e/`) demanderait de réserver aussi
  tous les chemins de l'application.
- **Sous-domaine** : plus « site à soi » pour l'artisan, mais il faut une entrée DNS joker `*.mobiiz.fr` vers Vercel, un
  certificat joker (Vercel le gère avec ses serveurs DNS ou par vérification), un aiguillage par nom d'hôte dans le site, et
  la liste des noms réservés ci-dessus (déjà prête). Le risque de prise de contrôle vient d'une entrée DNS qui pointe vers un
  service abandonné : avec un joker vers notre propre projet Vercel et aucun CNAME par artisan, il ne se pose pas.
- Le parcours public d'Obat n'a pas été regardé de l'intérieur : je ne suppose rien de sa configuration.

## 4. Droit de publier (offre payante) : prêt, coupé

- Réglage `SITE_PUBLICATION_PAYANTE` : **coupé** par défaut (tout le monde publie, comme aujourd'hui).
- Allumé, publier demande un abonnement en cours (ligne `abonnement` active ou résiliée dont la période n'est pas finie :
  `publicationPermise`). Vérifié **côté serveur** (403 `publication_reservee`, « Mettre ton site en ligne fait partie de
  l'abonnement Pro. »). Aucun appel à Stripe, aucun prix créé ou changé.

### Ce que devient le site si l'artisan résilie : DÉCIDÉ (Greg, 28 novembre 2026) = option 2

Codé : `etatDuSiteApresFin` (domaine), `sitesApresFinAbonnement` (lancé chaque nuit par `menage`), colonne additive
`retrait_prevenu_le` (migration `20261128090000_page_retrait_prevenu`). N'agit que quand `SITE_PUBLICATION_PAYANTE=on`
(coupé jusqu'au lancement). Écrit pour l'avocat dans `docs/groupe/CGU-candidate-2026-11-16.md`. Les trois propositions :

1. **Il reste en ligne** tel qu'il est, sans pouvoir être modifié ni republié, avec le formulaire de devis actif. Le plus
   simple ; Mobiiz garde un site actif sans revenu.
2. **Il reste en ligne 30 jours**, puis il est retiré de la ligne (rien n'est effacé) ; un e-mail prévient 7 jours avant ; il
   revient tel quel au réabonnement. *Recommandé* : juste pour l'artisan, rien ne se perd, coût maîtrisé.
3. **Il est retiré de la ligne à la fin de la période payée**, et revient tel quel au réabonnement.

Dans les trois cas : l'adresse reste à l'artisan (jamais redonnée), les données ne sont pas effacées (sauf demande de
suppression du compte).

## 5. Coûts : stockage et bande passante

Hypothèses : une photo de chantier donne AVIF + WebP en 3 largeurs (640, 1 280, 1 920 px) et un JPEG de partage, soit
environ **1 Mo** ; une photo d'accueil (4 largeurs, jusqu'à 2 560 px) environ **1,8 Mo**. Un site courant : 1 photo
d'accueil et 8 photos, environ **10 Mo** ; au maximum (20 photos), environ **22 Mo**. Une visite charge environ
**0,5 Mo** d'images (la photo d'accueil à la bonne taille, des vignettes de 640 px), plus la page elle-même.

Prix de Vercel Blob relevés le 27 novembre 2026 (à revérifier sur la page de Vercel, ils varient selon la région) :
stockage 0,023 $ par Go et par mois ; transfert 0,05 $ par Go ; opérations simples 0,40 $ le million ; écritures 5 $ le
million. L'offre Hobby inclut 1 Go stocké et 10 Go de transfert par mois.

| Sites | Stockage courant (max) | Coût stockage / mois | Visites / mois (300 par site) | Transfert images | Coût transfert / mois |
|---|---|---|---|---|---|
| 100 | 1 Go (2,2 Go) | ≈ 0,02 $ (0,05 $) | 30 000 | ≈ 15 Go | ≈ 0,75 $ |
| 1 000 | 10 Go (22 Go) | ≈ 0,23 $ (0,51 $) | 300 000 | ≈ 150 Go | ≈ 7,50 $ |
| 10 000 | 100 Go (220 Go) | ≈ 2,30 $ (5,10 $) | 3 000 000 | ≈ 1,5 To | ≈ 75 $ |

Les pages elles-mêmes (HTML, scripts) passent par le transfert du site Vercel, compris dans l'offre Pro jusqu'à 1 To par
mois. La base (Neon) ne grossit presque pas : quelques kilo-octets par site. **Aucun service payant n'a été ajouté.** Note :
l'offre Hobby de Vercel est réservée à un usage non commercial ; la production demandera l'offre Pro (déjà prévue avant
le lancement, ce n'est pas une dépense nouvelle de ce chantier).

## 6. Ce qui reste à faire, plus tard

- Les modèles 3 et 4 (une fois l'aller-retour éprouvé par de vrais artisans).
- Prévenir les artisans d'un nouveau modèle (notifications existantes), sans l'imposer.
- Le guide « Améliorer mon référencement », le pied de page « Site pro créé avec Mobiiz », le carrousel et les animations.
