# Référencement Google et IA : audit et plan (27 novembre 2026)

Chantier 04 du cahier ChatGPT (`docs/cahiers-chatgpt/MOBIIZ_Cahiers_des_charges_integral_v2.pdf`, pages 6 à 8).
Les décisions de Greg du 27 novembre priment sur le PDF :

- lancement avec les couvreurs seulement (Côtes-d'Armor, puis Bretagne, puis France) ; les autres métiers entrent en rodage ;
- la landing nationale reste telle quelle ; la page « Couvreurs de Bretagne » reste abandonnée (non publiée, non indexée) ;
- aucune offre « Premium » : Gratuit, Pro, Pro Max.

Rien n'est publié. Aucune page n'est créée.

## Suite du 28 novembre 2026 : décisions de Greg et étape 0 faite

Décisions : robots « recherche oui, entraînement non » ; Search Console oui (Greg pose la ligne, `search-console-bing.md`) ;
`/couvreurs` gardée non liée et non indexée, `/peintres` retirée ; pas de page Côtes-d'Armor avant de vrais couvreurs ;
brouillons écrits par Claude d'après les règles de couvreur du dépôt, tout relu par Greg ; titre des sites artisans
inchangé (« Couvreur à Saint-Brieuc – Dupont Couverture », le §4.1 plus bas ne s'applique plus).

Étape 0 codée (`apps/web/src/lib/indexation.ts`, `robots.ts`, `sitemap.ts`, test `scripts/indexation.test.mjs`) :
réglage `INDEXATION_SITE` (mobiiz.fr en production seulement), robots.txt, sitemap, canonical sur chaque page publique
(toujours https://mobiiz.fr en production), titres sans « Mobiiz » en double, `Organization` et `WebSite` sur la
landing, police inutile retirée (Bricolage Grotesque dans la mise en page racine). Laissés pour plus tard : la vitesse de
`/negoce` (page de compte rendue dans le navigateur, gardée `noindex`), le sitemap des sites d'artisans (avec la
discussion des écrans, quand Greg les ouvrira aux moteurs). Brouillon P1 : `brouillons/P1-achats-groupes-couverture.md`.

 Aucun outil (Search Console, Bing) n'est branché.

Mesures faites le 27 novembre 2026 au soir sur test.mobiiz.fr et api-test.mobiiz.fr (commit en ligne `730eea42`).
Ce qui est « mesuré » l'est ici ; ce qui est « hypothèse » attend des données réelles.

---

## 1. Ce qui doit rester hors de Google : état et correction

| Adresse | État mesuré | Depuis quand | Action |
|---|---|---|---|
| test.mobiiz.fr (toutes les pages, fichiers, `/v1` relayé) | `X-Robots-Tag: noindex, nofollow` sur chaque réponse (12 pages vérifiées, images, manifeste, 404) | Depuis le premier commit de `baticlair/` (29 septembre 2026), avant la mise en ligne du domaine (24 octobre) | Rien |
| Comptes, devis, chantiers, admin, liens à jeton (`/chiffrer`, `/reponse`, `/grille`, `/achat-groupe`) | Même en-tête (règle globale de `next.config.ts`) ; pages derrière connexion | idem | Rien |
| Brouillons de sites (`/e/<adresse>`) | Page privée = 404 ; page publiée : `noindex` tant que `PAGES_ENTREPRISES_INDEXEES` n'est pas `on` (éteint sur le test) | 16 novembre 2026 | Rien |
| `/couvreurs-bretagne` | `noindex` (en-tête + balise), 404 en production (`VERCEL_ENV=production`) | 19 novembre 2026 | Rien |
| Aperçus Vercel | Seule la branche de test se déploie (`claude/**` coupé dans `vercel.json`) ; même code, donc même `noindex` sur l'adresse technique `*.vercel.app` | — | Rien |
| **api-test.mobiiz.fr** | **Aucun en-tête `noindex`** (JSON, PDF et Excel des demandes par lien à jeton, photos) | Depuis toujours | **CORRIGÉ** (voir plus bas) |
| mobiiz.fr, www.mobiiz.fr | Domaine pointé sur Vercel, aucun déploiement (404 « DEPLOYMENT_NOT_FOUND ») | — | Rien tant que la production n'existe pas |

**Déjà indexé ?** Rien trouvé : la recherche `site:test.mobiiz.fr` et « mobiiz » ne rendent aucune page Mobiiz.
Limite : l'outil de recherche utilisé n'est pas Google. La preuve définitive est le rapport « Pages » de Search Console
(à faire avec l'accord de Greg, voir §6). Risque faible : le site a toujours été en `noindex`, et l'API ne sert que du
JSON et des fichiers par liens à jeton qui ne circulent que dans des e-mails.

**Correction (seul code de la mission)** : `apps/api/src/app.ts` pose `X-Robots-Tag: noindex, nofollow` sur toutes les
réponses de l'API (connues ou non, avec ou sans session). Un en-tête et pas un `robots.txt` : un `robots.txt` qui
interdit empêche le robot de lire le `noindex` et n'est pas un contrôle d'accès. Test : `apps/api/test/api-hors-index.test.ts`.
Les données privées restent protégées par la connexion (sessions) et par les jetons, pas par le référencement.

---

## 2. Audit des pages publiques (mesuré)

### Carte des pages

| Page | Rôle | Liée depuis la landing | Titre | Description | Remarque |
|---|---|---|---|---|---|
| `/` (= `/decouvrir` sans session) | Landing nationale | — | « Mobiiz · Plus on est, moins on paie. » | Propre | Même page sous deux adresses, pas de canonical |
| `/tarifs` | Tarifs | oui | « Tarifs — Mobiiz · Mobiiz » | Propre | Nom en double |
| `/couvreurs` | Page couvreurs | **non** (orpheline) | « Mobiiz pour les couvreurs » | Propre | Lien interne vers `/couvreurs?demo` |
| `/peintres` | Page peintres | non (orpheline) | « Mobiiz pour les peintres » | Propre | Métier en rodage |
| `/negoce` | Espace négoce | oui | « Mobiiz » | Générique | LCP lent (voir vitesse) |
| `/mentions-legales`, `/cgu`, `/confidentialite`, `/conditions-negoce` | Légal | oui | « … — Mobiiz · Mobiiz » (3 sur 4) | Générique | Nom en double |
| `/connexion`, `/inscription`, `/commencer`, `/mot-de-passe-oublie` | Compte | oui | « Mobiiz » | Générique | À garder hors index |
| `/e/<adresse>` | Sites des artisans | — | « Couvreur à Ville – Nom » | Propre | Canonical et JSON-LD déjà là |
| `/couvreurs-bretagne` | Abandonnée | non | — | — | 404 en production |

### Socle technique

- **HTML** : rendu côté serveur, le texte est lisible sans JavaScript (bon pour tous les robots, IA compris). `lang="fr"`, un seul `h1` par page, toutes les images ont un `alt`.
- **robots.txt** : absent (404). **sitemap.xml** : absent (404).
- **canonical** : absent partout sauf `/e/…` et `/couvreurs-bretagne`.
- **Données structurées** : aucune sur le site Mobiiz ; `LocalBusiness` (type par métier) déjà présent sur les sites d'artisans, sans adresse exacte sans accord, sans note.
- **Production** : la règle actuelle de `next.config.ts` met `noindex` partout, et en production, avec `PAGES_ENTREPRISES_INDEXEES=on`, partout SAUF `/e/`. Donc la landing et les tarifs seraient en `noindex` en production. Il faudra un réglage dédié (voir §3, étape 0).

### Vitesse en laboratoire (Playwright, profil téléphone « Moto G4 », 4G lente, processeur ×4, premier chargement)

| Page | LCP | CLS | INP (clic) | Poids |
|---|---|---|---|---|
| `/` | 1,5 à 2,9 s (2 mesures) | 0,006 | 56 ms | 548 Ko |
| `/couvreurs` | 1,5 à 1,6 s | 0 | 16 ms | 379 Ko |
| `/tarifs` | 1,1 s | 0 | 24 ms | 310 Ko |
| `/negoce` | **3,4 à 3,5 s** | 0 | — | 302 Ko |
| légal, connexion | 1,0 à 1,1 s | 0 | < 30 ms | 280 à 295 Ko |

Seuils Google : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. CLS et INP sont bons. LCP limite sur la landing au premier
chargement, trop lent sur `/negoce`. Ce sont des mesures de laboratoire : les vraies valeurs (75e centile) viendront de
Search Console après le lancement. Piste vue dans le code, non corrigée (écrans = autre discussion) : la police
Bricolage Grotesque est encore chargée dans `app/layout.tsx` alors qu'elle n'est plus utilisée.

### Robots des moteurs et des IA (documentation officielle lue le 27 novembre 2026)

| Robot | Sert à | Se règle par | Peut lire nos pages aujourd'hui |
|---|---|---|---|
| Googlebot | Google Search, AI Overviews, AI Mode | robots.txt, `noindex` | Lit, mais `noindex` : rien n'entre |
| Google-Extended | Pas un robot : un mot du robots.txt pour l'entraînement de Gemini et l'ancrage ; sans effet sur Google Search | robots.txt | — |
| Bingbot | Bing, Copilot | robots.txt, `noindex` | idem (page d'aide Bing non lisible par l'outil ; à revérifier dans Bing Webmaster Tools) |
| OAI-SearchBot | Résultats de recherche de ChatGPT | robots.txt (prise en compte en ~24 h) | Lit ; `noindex` non documenté par OpenAI |
| GPTBot | Entraînement OpenAI | robots.txt | Lit |
| ChatGPT-User | Visite à la demande d'un utilisateur ; « robots.txt peut ne pas s'appliquer » | — | Lit |
| Claude-SearchBot | Qualité de la recherche de Claude | robots.txt | Lit |
| ClaudeBot | Entraînement Anthropic | robots.txt (et signal « pas d'entraînement » reconnu depuis le 30 octobre 2026) | Lit |
| Claude-User | Visite à la demande d'un utilisateur | robots.txt | Lit |

Google le dit noir sur blanc : aucun fichier « IA », aucun balisage spécial n'est nécessaire pour apparaître dans
AI Overviews ; il faut être indexé et éligible à un extrait. Pas de `llms.txt`, pas de recette « GEO ». Google prévoit
de lire le signal commun « pas d'entraînement » (AIPREF) début 2027.

Sources : developers.openai.com/api/docs/bots ; support.claude.com (article 8896518) ; developers.google.com/search/docs
(overview-google-crawlers, google-common-crawlers, appearance/ai-features).

---

## 3. Plan des pages (rien n'est publié ; Greg valide chaque texte métier)

### Étape 0 : socle technique, avant toute page (code, environ 1 jour, 0 €)

À faire par la discussion des écrans (fichiers partagés) ou par moi avec accord :

1. Un réglage `INDEXATION_SITE` (éteint par défaut ; seul mobiiz.fr en production l'allume) : il retire le `noindex`
   des seules pages publiques listées (landing, tarifs, pages du plan, légal), garde `noindex` sur tout le reste.
2. `robots.txt` (`app/robots.ts`) : en production seulement, tout permis + adresse du sitemap ; sur le test, rien
   (l'en-tête suffit). Pas de `Disallow` sur les pages privées : il empêcherait de lire leur `noindex`.
3. `sitemap.xml` (`app/sitemap.ts`) : les pages publiques du plan seulement, plus un sitemap par site d'artisan publié.
4. Canonical sur chaque page publique ; `/decouvrir` pointe vers `/`.
5. Titres sans « Mobiiz » en double (`Tarifs · Mobiiz`, `CGU · Mobiiz`…) ; un titre et une description propres à `/negoce`.
6. Données structurées `Organization` (nom, logo, URL, contact@mobiiz.fr) sur la landing ; `FAQPage` seulement si une vraie FAQ visible existe (Google ne l'affiche plus en résultat enrichi, mais la page reste lisible par les IA).
7. LCP de `/negoce` et de la landing sous 2,5 s (image principale prioritaire, police inutile retirée).

### Recherches prioritaires (25, à valider ; volumes NON mesurés)

Aucun volume de recherche n'a été mesuré : aucun outil payant, et Keyword Planner demande un compte Google Ads. Ce sont
des hypothèses d'intention, à classer avec Search Console après 4 à 8 semaines en ligne.

| # | Recherche | Intention | Page |
|---|---|---|---|
| 1 | achat groupé matériaux couverture | Achat groupé | P1 |
| 2 | achat groupé ardoise | Achat groupé | P1 |
| 3 | achat en gros ardoise naturelle | Achat groupé | P1 |
| 4 | groupement d'achat artisans bâtiment | Achat groupé | P1 |
| 5 | centrale d'achat couvreur | Achat groupé | P1 |
| 6 | achat groupé matériaux Côtes-d'Armor | Achat groupé local | P5 |
| 7 | approvisionnement toiture Bretagne | Achat groupé local | P5 |
| 8 | comparer prix négoce couverture | Achat individuel | P2 |
| 9 | demande de prix négoce matériaux | Achat individuel | P2 |
| 10 | comparer devis fournisseurs matériaux | Achat individuel | P2 |
| 11 | prix ardoise négoce | Achat individuel | P2 |
| 12 | négoce couverture Saint-Brieuc | Local (négoce) | P5 |
| 13 | quantitatif toiture | Quantitatif | P3 |
| 14 | calcul quantité ardoise toiture | Quantitatif | P3 |
| 15 | calcul nombre d'ardoises au m² | Quantitatif | Guide G1 |
| 16 | calcul liteaux toiture | Quantitatif | Guide G1 |
| 17 | métré couverture | Quantitatif | P3 |
| 18 | liste de matériaux toiture | Quantitatif | P3 |
| 19 | transformer un devis en liste de matériaux | Devis → liste | P4 |
| 20 | devis couverture en bon de commande | Devis → liste | P4 |
| 21 | logiciel quantitatif couvreur | Outil | P3 |
| 22 | application couvreur | Outil | P0 (landing) |
| 23 | calcul zinc gouttière développé | Quantitatif zinc | Guide G2 |
| 24 | quantité zinc joint debout | Quantitatif zinc | Guide G2 |
| 25 | négoce matériaux couverture inscription | Négoces | `/negoce` |

### Pages à créer, dans l'ordre (aucune page ville en série)

Chaque page : une intention, un titre unique, un contenu original, un exemple marqué « Exemple » (jamais présenté comme
réel), un seul bouton clair, des liens internes, validation de Greg avant publication.

| Ordre | Page (adresse proposée) | Intention | Effort |
|---|---|---|---|
| P0 | Landing nationale `/` (inchangée) + `Organization` | Marque, « application couvreur » | 0,5 j de code |
| P1 | `/achats-groupes-couverture` : comment marche l'achat groupé (ardoise, zinc, liteaux), confidentialité, « plus on est, moins on paie » | Achat groupé | 1 j rédaction + relecture Greg |
| P2 | `/comparer-negoces` : envoyer une demande à 5 négoces, comparer ligne par ligne ; jamais obligé de commander | Achat individuel | 1 j |
| P3 | `/quantitatif-toiture` : de la toiture à la liste commandable (unités du comptoir, exemple d'une liste) ; ne pas confondre avec l'achat groupé | Quantitatif | 1 j |
| P4 | `/devis-en-liste-de-materiaux` : déposer son devis, la liste sort, on la corrige | Devis → liste | 0,5 j |
| P5 | `/cotes-d-armor` : la seule page locale, avec ce qui existe VRAIMENT (achats ouverts, négoces partenaires réels, sinon liste d'attente transparente) ; la Bretagne seulement quand elle est réellement ouverte | Local | 1 j, après accord (proche de la page abandonnée : décision de Greg) |
| G1 | Guide « ardoise : calculer ses quantités » (pureau, crochets, liteaux), chiffres sourcés (Cupa, §34) | Guide métier | 1 j + relecture Greg |
| G2 | Guide « zinc : façonné ou bobine, développé, joint debout », chiffres VMZINC (§36) | Guide métier | 1 j + relecture Greg |
| G3 | FAQ couvreurs (vraies questions reçues, pas inventées) | Questions | 0,5 j, après les premiers retours |

Rythme réaliste : une page par semaine après lancement, P1 à P4 d'abord. Les autres métiers : liste d'attente, aucune page
tant qu'ils sont en rodage.

### Maillage

- Landing → P1, P2, P3 (une ligne « En savoir plus » dans chaque bloc existant, sans refaire la landing) et pied de page.
- P1 ↔ P2 (« seul ou à plusieurs : deux circuits différents ») ; P3 ↔ P4 ; P3 → G1, G2 ; G1, G2 → P3 et P1.
- P5 → P1, P2 ; chaque page → `/tarifs` et `/commencer`.
- Sites d'artisans → Mobiiz : seulement la signature discrète à valider (§4), pas d'ancre de mot-clé.
- Liens externes : à obtenir naturellement (organisations professionnelles, Chambre de métiers, presse locale), jamais achetés.

### Coûts

0 € d'outil (Search Console et Bing Webmaster Tools sont gratuits ; vitesse mesurée avec Playwright/Lighthouse local).
Seul coût : le temps de rédaction et la relecture de Greg. Aucun outil de mots-clés payant proposé.

---

## 4. Sites des artisans : ce que le moteur commun devra faire tout seul

À coder plus tard par la discussion des écrans (moteur `packages/domain/src/page-entreprise/page.ts`, page `app/(vitrine)/e/[adresse]`).
Déjà fait : canonical, description à 160 caractères, `LocalBusiness` par métier sans adresse exacte sans accord ni note,
images AVIF/WebP, page privée = 404.

À faire :

1. **Titre dans l'ordre demandé** : « Dupont Couverture – Couvreur à Saint-Brieuc » (aujourd'hui « Couvreur à Saint-Brieuc – Dupont Couverture », `titreDeLaPage`). Seulement avec métier et zone réellement déclarés ; sans zone, « Dupont Couverture – Couvreur ».
2. **Indexation par site, pas globale** : un site s'indexe seulement s'il est publié, complet (nom, métier, zone, au moins une prestation) et en production ; brouillon, page privée, page signalée ou modérée = `noindex` + absente du sitemap.
3. **Sitemap par site** (`/e/<adresse>/sitemap.xml` ou une entrée par site dans un index), régénéré à la publication, avec la date de dernière modification.
4. **`LocalBusiness` complété** : `areaServed` en liste de communes déclarées, `sameAs` vers la fiche Google si l'artisan l'a renseignée, `image` ; jamais d'avis ni de note.
5. **`alt` des photos** : texte utile tiré du titre de la réalisation (« Réfection en ardoise, Plérin »), jamais un mot-clé répété.
6. **Adresse stable** : un changement d'adresse redirige en 301 (déjà fait), jamais de doublon.
7. **Signature** « Site pro créé avec Mobiiz » à valider par Greg, lien `rel="nofollow"` ou sans ancre de mot-clé.
8. **Plus tard** : aide « Améliorer mon référencement » en 5 étapes facultatives (« 4 étapes sur 5 »), jamais un score Google.

---

## 5. Search Console, Bing, et politique des robots IA (préparé, rien de branché)

### Search Console (gratuit, 30 minutes, avec Greg)

1. Propriété « Domaine » `mobiiz.fr` (couvre test, www, api) : un enregistrement TXT chez le registraire du domaine.
2. Vérifier tout de suite le rapport « Pages » : aucune URL de test.mobiiz.fr ni api-test ne doit être indexée (preuve du §1).
3. Après le lancement de la production : envoyer `https://mobiiz.fr/sitemap.xml`, suivre chaque semaine pages indexées, impressions, clics, requêtes.

### Bing Webmaster Tools (gratuit, 10 minutes)

Import direct depuis Search Console (une fois Search Console vérifiée). Couvre Bing et Copilot ; permet aussi IndexNow plus tard.

### Politique « recherche oui / entraînement ? » : `robots.txt` de production proposé

```
# Moteurs de recherche et recherche des IA : oui
User-agent: *
Allow: /

# Entraînement des modèles : DÉCISION DE GREG (option B ci-dessous)
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
User-agent: Google-Extended
Disallow: /
User-agent: CCBot
Disallow: /

Sitemap: https://mobiiz.fr/sitemap.xml
```

- **Option A, tout ouvert** : la marque peut être mieux connue des modèles ; nos textes servent à l'entraînement.
- **Option B, recherche oui, entraînement non** (bloc ci-dessus) : Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot restent permis, donc Mobiiz reste trouvable dans Google, ChatGPT, Claude, Copilot ; nos textes métier ne servent pas à entraîner. Bloquer Google-Extended n'a aucun effet sur Google Search.
- Ma recommandation : **B** pour les pages de Mobiiz ; pour les sites des artisans, la même règle par défaut.
- Pas de pare-feu (WAF) devant Vercel aujourd'hui : rien à régler côté CDN ; à revérifier si Vercel Firewall ou un « bot protection » est activé un jour (il pourrait bloquer OAI-SearchBot ou Claude-SearchBot).

---

## 6. Décisions de Greg

1. Politique robots IA : option A (tout ouvert) ou B (recherche oui, entraînement non) ?
2. Search Console sur `mobiiz.fr` : feu vert pour la vérification DNS (TXT) maintenant, pour prouver que le test n'est pas indexé ?
3. `/couvreurs` et `/peintres` existent, non liées, sur le test : on les garde comme base de P1-P3, ou on les retire avant la production ?
4. Une page Côtes-d'Armor (P5) : oui, non, ou plus tard ? (Elle ressemble à la page abandonnée ; rien sans ton accord.)
5. Ordre des pages P1 à P4 et rédaction : je rédige des brouillons pour ta relecture, ou tu dictes d'abord les points métier ?
6. Qui code l'étape 0 (socle) : la discussion des écrans, ou moi après elle ?
