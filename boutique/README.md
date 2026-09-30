# La Bohème en Paillettes — boutique en ligne

Boutique e-commerce de bijoux artisanaux en résine : **simple devant, robuste derrière**.

- Côté cliente : *je vois → j'aime → j'ajoute → je paie* (mobile d'abord, sans création de compte).
- Côté créatrice : *je crée → je publie → je vends → je prépare → j'expédie*, depuis son téléphone.

---

## 0. Voir la boutique en ligne (aperçu, ~15 minutes)

Tout se fait dans **Vercel** : la base de données (Neon) et le stockage des photos (Blob) s'y ajoutent en un clic.
Pas besoin de Supabase, Resend ni Stripe pour ce premier aperçu.

1. **Intégrer le code à la branche principale du dépôt** (une seule fois) : sur GitHub, fusionner la branche
   `claude/boutique-boheme-paillettes` (bouton *Create pull request*, puis *Merge*).
2. <https://vercel.com/signup> → **Continue with GitHub** → autoriser l'accès au dépôt **lovable**.
3. **Add New… → Project** → **Import** à côté de *lovable*.
   - **Root Directory** → *Edit* → choisir **`boutique`** → *Continue*.
   - **Environment Variables** : ajouter `APP_SECRET`, `CRON_SECRET` et `ADMIN_SETUP_TOKEN`
     (trois longues suites de caractères aléatoires, différentes), et `STRIPE_MODE` = `test`.
   - **Deploy**. Ce premier déploiement réussit mais le site affiche « pause technique » : la base n'existe pas encore.
4. Dans le projet : onglet **Storage** → **Create Database** → **Neon** (Postgres) → région **Frankfurt** → *Create* → *Connect*.
5. Toujours **Storage** → **Create** → **Blob** → accès **Public** (photos des produits) → *Create* → *Connect*.
6. Onglet **Deployments** → sur la dernière ligne, menu **⋯** → **Redeploy**. La base se crée toute seule.
7. Ouvrir `https://<votre-projet>.vercel.app/admin` → saisir le `ADMIN_SETUP_TOKEN` → créer votre compte.
8. Sur le tableau de bord : **« Ajouter les exemples »** → la boutique se remplit de 4 créations d'exemple
   (retirables d'un clic). Ouvrir `https://<votre-projet>.vercel.app` sur le téléphone.

À ce stade, tout se visite et l'administration fonctionne entièrement. Le **paiement** s'active en ajoutant une clé
de test Stripe (§ 3.3, étapes 1 et 3 : `STRIPE_SECRET_KEY` = `sk_test_…`, puis *Redeploy*) — carte de test
`4242 4242 4242 4242`. Les **e-mails** s'activent avec Resend (§ 3.2). Avant d'ouvrir au public : suivre le § 3.

## 1. Ce qui est construit

> **Mode actuel : réservation, sans paiement en ligne.** Sur chaque bijou, « Je réserve ce bijou »
> (prénom, téléphone, e-mail facultatif, main propre ou envoi). La pièce est bloquée aussitôt, la
> créatrice reçoit un e-mail et gère tout dans **Administration → Réservations** (appel, WhatsApp,
> confirmer, annuler / remettre disponible ; libération automatique après 24 h, désactivable dans
> Paramètres). Le panier et Stripe restent dans le code, désactivés : `RESERVATION_MODE` dans
> `src/lib/sales-mode.ts` les réactive.

**Boutique** — accueil, catalogue (catégories, filtres utiles seulement, tri, recherche tolérante aux accents),
fiche produit (photos au doigt, zoom, barre « Ajouter au panier » fixe sur mobile), panier conservé,
commande invitée (autocomplétion des adresses), paiement Stripe (carte, Apple Pay, Google Pay),
page de confirmation et de suivi, justificatif imprimable, pages L'atelier / Contact / légales, 404 et
erreurs soignées, partage Facebook/WhatsApp (OpenGraph), SEO (sitemap, robots, données structurées).

**Administration** (`/admin`, invisible dans la navigation) — tableau de bord (à préparer, épuisés,
stock faible, incidents, liste « avant d'ouvrir »), produits (photos glisser-déposer ou depuis le
téléphone, principale, ordre, brouillon/publié/archivé, stock modifiable depuis la liste, actions
groupées), commandes (préparation → expédition avec suivi → e-mail automatique, annulation /
remboursement Stripe, effacement RGPD), catégories et collections, apparence (12 thèmes + palette personnalisée, logo, textes,
réseaux), livraison (modes, prix, gratuité, pays, retrait en main propre), paramètres (légal, TVA,
Stripe, sécurité du compte et double authentification, sauvegardes, exports, journal).

**Vérifié automatiquement** — 82 tests serveur sur une vraie base PostgreSQL et 24 parcours dans un
vrai navigateur (voir § 7).

## 2. Décisions importantes (et pourquoi)

| Sujet | Décision | Raison |
|---|---|---|
| Architecture | Un seul site Next.js (boutique + admin + API), dossier `boutique/` | Monolithe bien découpé : rien à synchroniser, un seul déploiement. |
| Hébergement | GitHub → Vercel ; base PostgreSQL et photos ajoutées depuis Vercel (Neon + Vercel Blob) ; paiement Stripe ; e-mails Resend | Moins de comptes et de copier-coller : la base et le stockage se branchent en un clic. **Supabase reste pris en charge** (mêmes données, autre fournisseur) si tu le préfères. Resend est ajouté car ni Neon ni Supabase n'envoient d'e-mails. |
| Accès aux données | **Uniquement depuis le serveur.** Aucune clé Supabase dans le navigateur ; RLS activée sur *toutes* les tables sans aucune autorisation publique (tout refusé) ; la migration échoue si une table n'a pas de RLS. | Personne ne peut interroger la base directement, même avec les outils du navigateur. |
| Paiement | **Stripe Checkout** (page hébergée par Stripe) | Le plus simple et le plus sûr : aucune carte ne touche le site ; Apple Pay / Google Pay inclus. |
| Prix | Recalculés **en base** à chaque paiement ; le navigateur n'envoie que des identifiants et des quantités | Impossible de payer 1 € un bijou à 40 €. |
| Stock | **Réservé** au moment de partir payer (transaction verrouillée), rendu si le paiement n'aboutit pas (retour arrière, expiration 30 min, refus) | Deux clientes ne peuvent jamais acheter la même dernière pièce. |
| « Épuisé » | Pas un statut enregistré : c'est un produit publié dont le stock est à 0 | Une seule source de vérité : pas d'incohérence possible entre statut et stock. |
| Commandes | Copie figée de ce qui a été acheté (nom, prix, photo) ; numéros lisibles non séquentiels (`BP-7K3F9Q`) ; lien de suivi par jeton de 256 bits | L'historique reste juste même si le produit change ; impossible de deviner la commande d'une autre. |
| Webhooks | Signature vérifiée, chaque événement traité une seule fois, e-mails envoyés via une boîte d'envoi (un seul e-mail par commande et par type, nouvel essai automatique) | Double webhook, rafraîchissement, double clic : jamais de doublon. |
| Thèmes | 12 thèmes + « Créer ma palette » (3 couleurs). Toutes les nuances (survol, fonds pâles, bordures, textes) sont calculées par `buildTokens` (`src/lib/themes.ts`) avec contrastes garantis ; testé sur les 12 thèmes et 300+ palettes aléatoires. Couleurs métier (épuisé, erreur…) fixes | Une palette illisible ne peut pas être livrée ; la créatrice ne règle jamais 20 variables. |
| Codes promo | Créés dans Stripe (option à activer dans Paramètres) | Zéro complexité ajoutée ; le montant réellement payé est enregistré. |
| Compte cliente | Non (commande invitée) | Inutile au lancement ; l'architecture permet de l'ajouter. |
| Suivi d'audience | Aucun (ni Google Analytics, ni Meta Pixel) → **aucune bannière cookies nécessaire** | Seuls un cookie technique d'administration et le panier (dans le navigateur) existent. |
| PWA | Manifeste « Ajouter à l'écran d'accueil » seulement, pas de mode hors-ligne | Utile pour l'admin sur téléphone, sans complexité. |

## 3. Mise en ligne pas à pas

Compter environ 1 heure. Tout se fait dans des tableaux de bord, sans ligne de commande.

### 3.1 Base de données et photos

**Option recommandée : depuis Vercel** (déjà fait si tu as suivi le § 0) — Storage → **Neon** (base, sauvegarde avec
retour dans le temps intégrée) et Storage → **Blob** public (photos). Pour les sauvegardes nocturnes automatiques,
créer un **second Blob en accès Private**, et copier son jeton dans une variable `BLOB_PRIVATE_READ_WRITE_TOKEN`
(sinon : sauvegarde manuelle depuis l'administration).

**Option Supabase** (au lieu de Neon + Blob) :
1. <https://supabase.com> → **New project** → région **Europe (Paris) `eu-west-3`**, mot de passe fort (le noter).
2. **Project Settings → Database → Connection string** → onglet **Transaction pooler** → copier l'URL
   (remplacer `[YOUR-PASSWORD]`) : c'est `DATABASE_URL`.
3. Même page, **Session pooler** → copier : c'est `DATABASE_URL_MIGRATIONS` (utilisée pour mettre à jour la base).
4. Même page, **SSL Configuration → Download certificate** → ouvrir le fichier, copier tout son contenu : `DATABASE_CA_CERT`.
5. **Project Settings → API** → `Project URL` = `SUPABASE_URL` ; clé **service_role / secret** = `SUPABASE_SERVICE_ROLE_KEY`
   (ne jamais la partager ; elle ne va que dans Vercel).
6. Les deux espaces de stockage (photos publiques, sauvegardes privées) sont créés automatiquement.
7. Facultatif mais conseillé : **Project Settings → Data API → désactiver** (le site ne l'utilise pas).

### 3.2 E-mails — Resend
1. <https://resend.com> → **Domains → Add domain** → `labohemeenpaillettes.fr`.
2. Ajouter chez le registraire du domaine les enregistrements DNS affichés (SPF et DKIM), puis **Verify**.
3. Ajouter aussi un enregistrement DMARC : type `TXT`, nom `_dmarc`, valeur
   `v=DMARC1; p=none; rua=mailto:contact@labohemeenpaillettes.fr` (passer à `p=quarantine` après quelques semaines sans problème).
4. **API Keys → Create** (permission *Sending access*) = `RESEND_API_KEY`.
5. Resend *envoie* seulement. Pour *recevoir* sur `contact@…`, créer une boîte chez le registraire (OVH, Gandi…) ou Google Workspace.

### 3.3 Paiement — Stripe (d'abord en mode test)
1. Le compte Stripe doit être **celui de La Bohème en Paillettes** (identité et IBAN de l'entreprise).
2. **Settings → Account details** : copier l'identifiant `acct_…` = `STRIPE_ACCOUNT_ID`. Le site refuse d'encaisser avec un autre compte.
3. Activer le **mode Test** (interrupteur en haut) → **Developers → API keys** → *Secret key* `sk_test_…` = `STRIPE_SECRET_KEY` ; `STRIPE_MODE=test`.
4. **Developers → Webhooks → Add endpoint** : URL `https://labohemeenpaillettes.fr/api/stripe/webhook`, événements :
   `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `charge.refunded` → *Signing secret* `whsec_…` = `STRIPE_WEBHOOK_SECRET`.
5. **Settings → Payment methods** : vérifier que Cartes, Apple Pay et Google Pay sont activés.

### 3.4 Site — Vercel
1. <https://vercel.com/new> → dépôt **lovable** → **Root Directory : `boutique`**.
2. **Environment Variables** (environnement *Production*) : toutes les variables du tableau § 3.6.
3. **Deploy**. La base est créée/mise à jour automatiquement à chaque déploiement (migrations versionnées).
4. **Settings → Domains** : ajouter `labohemeenpaillettes.fr` et `www.labohemeenpaillettes.fr` (redirigé vers le premier),
   suivre les instructions DNS. HTTPS est automatique ; HTTP redirige vers HTTPS.
5. **Settings → Deployment Protection** : laisser la protection des préproductions activée.
6. ⚠️ Les conditions de Vercel réservent l'offre gratuite *Hobby* à un usage non commercial : pour une boutique, prévoir l'offre **Pro**.

### 3.5 Premier accès et vérifications
1. Ouvrir `https://labohemeenpaillettes.fr/admin/installation`, saisir `ADMIN_SETUP_TOKEN`, créer le compte de la créatrice.
   Ensuite, **supprimer `ADMIN_SETUP_TOKEN`** de Vercel (la page se désactive de toute façon dès qu'un compte existe).
2. Admin → Paramètres → Sécurité : **activer la double authentification**.
3. Admin → Paramètres → Paiement → **Vérifier le compte connecté** : le nom de l'entreprise doit apparaître.
4. Suivre la liste **« Avant d'ouvrir la boutique »** du tableau de bord (livraison, légal, pages, présentation…).
5. Passer une commande test avec la carte `4242 4242 4242 4242` (date future, n'importe quel code) : vérifier l'e-mail reçu,
   la commande dans l'admin, le stock. Un bandeau « mode test » est affiché à tous tant que `STRIPE_MODE=test`.

**Passage en réel (volontaire)** : dans Stripe, désactiver le mode Test, récupérer la clé `sk_live_…` et recréer le webhook
(en mode live) ; dans Vercel, remplacer `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et mettre `STRIPE_MODE=live` ; **Redeploy**.
Le site refuse toute incohérence (clé de test avec `STRIPE_MODE=live`, clé réelle hors production, autre compte que `STRIPE_ACCOUNT_ID`).

### 3.6 Variables d'environnement

| Variable | Obligatoire | Rôle |
|---|---|---|
| `SITE_URL` | à l'ouverture | `https://labohemeenpaillettes.fr` (sinon : l'adresse `….vercel.app`). |
| `APP_SECRET` | oui | 48 caractères aléatoires (`openssl rand -base64 48`). Protège sessions, liens de commande, double authentification. |
| `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`) | oui | Posées automatiquement par Neon. Avec Supabase : `DATABASE_URL`, `DATABASE_URL_MIGRATIONS`, `DATABASE_CA_CERT` (§ 3.1). |
| `BLOB_STORE_ID` ou `BLOB_READ_WRITE_TOKEN` | oui | Posée automatiquement par Vercel en reliant le magasin Blob (photos) ; les deux méthodes de connexion sont acceptées. Avec Supabase : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`. |
| `BLOB_PRIVATE_READ_WRITE_TOKEN` | conseillé | Jeton d'un second Blob **privé** : sauvegardes nocturnes. |
| `STRIPE_MODE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ACCOUNT_ID` | oui | Paiement (§ 3.3). En mode test, le webhook et l'identifiant de compte sont facultatifs ; en réel, obligatoires. |
| `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` | oui | Ex. `EMAIL_FROM="La Bohème en Paillettes <commandes@labohemeenpaillettes.fr>"`. |
| `CRON_SECRET` | oui | 32 caractères aléatoires (tâches nocturnes). |
| `ADMIN_SETUP_TOKEN` | 1re installation | À supprimer ensuite. |

**Environnements** : ne rien configurer pour *Preview* (les préproductions n'ont alors ni base ni paiement), ou leur donner
un **second projet Supabase** et des clés Stripe **de test**. Jamais la base de production ni des clés réelles hors production
(le site le refuse pour Stripe). En local : `.env.local` (voir `.env.example`), simulateur de paiement, e-mails écrits dans `.data/emails`.

## 4. Ce que toi seul peux fournir

À saisir dans **Admin → Paramètres** et **Admin → Apparence** (rien n'a été inventé ; tout manque est surligné sur le site) :
- nom / raison sociale, statut juridique, **SIRET**, adresse de l'entreprise, directeur·rice de la publication ;
- **régime de TVA** (franchise en base « art. 293 B du CGI » ou assujettie) — à confirmer avec l'URSSAF ou un comptable ;
- **médiateur de la consommation** (obligatoire pour vendre aux particuliers) ;
- hébergeur (Vercel Inc. : coordonnées sur vercel.com, page *Legal*) ;
- relecture/complétion des **CGV** (rétractation, retours, garanties), **confidentialité** (durées de conservation), **livraison** ;
- durée de conservation des adresses de livraison ;
- modes et **prix de livraison** réels (ceux proposés sont des exemples désactivés) ;
- logo en bonne qualité, photos, texte de présentation, liens Facebook / Instagram / WhatsApp.

Question à poser au comptable : le **justificatif de commande** est intitulé « Facture » (numérotation continue `F2026-0001`)
dès que les informations légales sont complètes. En cas de remboursement, faut-il émettre un avoir séparé ? L'export
**« Ventes — livre des recettes »** (Admin → Paramètres → Données) sert au suivi comptable.

## 5. Exploitation

- **Sauvegardes** : copie complète chaque nuit dans l'espace privé (30 jours) + bouton « Sauvegarde complète » à télécharger
  régulièrement (copie hors ligne). Supabase Pro ajoute ses propres sauvegardes quotidiennes : recommandé dès les premières ventes.
- **Restauration** (testée automatiquement) : `DATABASE_URL=… npm run db:restore -- sauvegarde.json` (aperçu), puis ajouter
  `--confirmer`. Remplace toutes les données de la base visée : essayer d'abord sur un projet Supabase vide.
- **Surveillance** : le tableau de bord affiche en clair tout incident (paiement bloqué, webhook refusé, e-mail en échec) et un
  e-mail d'alerte est envoyé la nuit en cas de problème. Recommandé : un moniteur gratuit (UptimeRobot, Better Stack…) sur
  `https://labohemeenpaillettes.fr/api/health` (répond 503 si quelque chose ne va pas). Stripe prévient aussi par e-mail si le webhook échoue.
- **Tâches nocturnes** (Vercel Cron, 1×/jour) : réservations expirées, e-mails en attente, sauvegarde, nettoyage des photos
  non utilisées, effacement RGPD. Ces tâches tournent aussi « à la volée » (webhook, ouverture du tableau de bord).
- **Mises à jour** : Dependabot propose chaque mois les correctifs (jamais les versions majeures automatiquement) ;
  chaque proposition passe par les vérifications GitHub (lint, types, tests, construction) avant d'être fusionnée.
- **Exports** : produits, ventes, mouvements de stock (tableur) et sauvegarde JSON complète : la boutique n'est prisonnière d'aucun prestataire.

## 6. Sécurité et données personnelles (résumé)

- Admin : mot de passe haché (scrypt), sessions aléatoires révocables (30 j max, 7 j d'inactivité), cookies `HttpOnly`/`Secure`/`SameSite`,
  10 essais / 15 min par IP et 8 par compte, double authentification (codes à usage unique), réinitialisation par lien unique de 30 min,
  changement de mot de passe = déconnexion des autres appareils. Chaque page, action et API revérifie la session en base.
- Toutes les entrées validées côté serveur (types, tailles, formats) ; requêtes SQL paramétrées ; textes jamais interprétés comme du HTML ;
  contrôle d'origine sur les écritures ; en-têtes CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, anti-iframe.
- Photos : fichier entièrement décodé puis réencodé (un faux .jpg est refusé), limite de taille et de pixels, métadonnées (dont GPS) supprimées,
  noms de fichiers générés par le serveur.
- Journal des actions sensibles, sans aucun mot de passe, jeton ni donnée bancaire.
- RGPD : minimisation (téléphone facultatif, pas de compte, pas de newsletter, pas de traceur), export des données d'une cliente,
  effacement par commande, purge automatique configurable, paiements non aboutis anonymisés après 30 jours.

## 7. Développement

```bash
cd boutique
npm install
cp .env.example .env.local        # base locale, simulateur de paiement, e-mails dans .data/emails
npm run db:migrate && npm run db:seed   # données de démonstration (refusées en production)
npm run dev                       # http://localhost:3000 — admin : creatrice@boutique.test / paillettes-demo-2026
npm test                          # 56 tests (base PostgreSQL de test : TEST_DATABASE_URL)
npm run lint && npm run typecheck
PLAYWRIGHT=…/playwright/index.mjs npm run test:e2e   # 26 parcours navigateur (serveur de dev lancé)
```

Organisation :

```
db/migrations/        schéma versionné (jamais modifié une fois appliqué : nouvelle migration)
src/lib/server/       logique serveur : orders (stock, paiement), payments/ (Stripe, simulateur),
                      email/ (fournisseur, modèles, boîte d'envoi), auth, catalog, admin-*, backup, storage, images
src/lib/              code partagé : validation, prix, thèmes, statuts, formatage
src/app/(shop)/       pages de la boutique      src/app/admin/   administration
src/app/api/          panier, paiement, webhook, photos, exports, santé, tâches
tests/                tests serveur             e2e/             parcours navigateur
```

Remplacer un prestataire : paiement → `src/lib/server/payments/` (interface `PaymentProvider`) ; e-mails →
`email/provider.ts` ; stockage → `storage.ts` ; transporteur → champ `carrier` des modes de livraison.
