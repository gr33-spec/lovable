# BatiClair

**Le juste prix de tes matériaux.**

BatiClair est une application web mobile-first destinée aux artisans du
bâtiment : comparer des devis fournisseurs, vérifier ses factures et
envoyer des demandes de devis par e-mail, le tout depuis son téléphone.

## Fonctionnalités

- **Comparer des devis** : dépose 2 à 4 devis (photo ou PDF), l'IA les lit
  et indique le devis le plus avantageux ainsi que l'économie réalisée. Pour
  chaque produit où un fournisseur est plus cher, un bouton « Négocier »
  prépare un e-mail prêt à envoyer pour lui demander de s'aligner sur le
  meilleur prix.
- **Vérifier une facture** : compare une facture reçue à son devis d'origine
  pour repérer un éventuel trop-payé.
- **Connexion par lien magique** : aucun mot de passe, juste un e-mail.
- **Abonnement Pro** (Stripe) : 3 analyses gratuites par mois, illimité avec
  le plan Pro.
- **Chantiers (demandes de devis)** : crée un chantier, envoie une demande de
  devis à plusieurs fournisseurs en un clic depuis ton carnet d'adresses, et
  suis sa progression (« 2 / 5 devis reçus ») sur sa fiche. Les réponses des
  fournisseurs (devis en pièce jointe + prix indiqués dans le corps du
  message) sont rattachées automatiquement au chantier — pas de boîte mail à
  gérer. Relance (automatiquement ou manuellement, jusqu'à 2 fois) les
  fournisseurs muets, et lance la comparaison IA dès que 2 devis sont
  arrivés, sans attendre les autres ; un nouveau devis reçu après une
  première comparaison propose de la relancer.
- **Bilan** : économies cumulées sur l'année et prix moyens par produit (les
  désignations sont normalisées pour fusionner les variantes d'écriture d'un
  même produit, ex. « OSB 3 18mm » et « OSB 3 - 18mm »).

## Interface

BatiClair a l'apparence d'une application mobile native — mode jour/nuit,
coins arrondis généreux, ombres douces, barre de navigation basse fixe avec
les 4 onglets (Accueil · Analyser · Demande · Bilan) — et reste confortable
sur grand écran : sur PC, le contenu garde une largeur « téléphone » centrée
au milieu de l'écran plutôt que de s'étirer.

- **Thèmes clair/sombre** : sélecteur dans le bandeau du haut, respecte le
  thème système par défaut et persiste sans flash au rechargement. Toute la
  charte (couleurs, dégradés, ombres) est définie via des variables CSS dans
  `src/app/globals.css` (`:root` pour le clair, `.dark` pour le sombre) —
  un seul endroit à modifier pour ajuster les couleurs partout.
- **Couleurs** : dégradé signature violet `#7B3FE4` → bleu `#3B82F6` pour les
  actions principales et le « hero » des économies ; or `#E8A23C` réservé aux
  montants d'argent (économies, trop-payé) ; vert/rouge conservés pour les
  verdicts bon plan / anomalie.
- **Animations discrètes** : entrée des cartes, appui sur les boutons,
  remplissage de la barre de progression. Toutes passent par les variantes
  `motion-safe:` de Tailwind et sont donc désactivées automatiquement si
  l'utilisateur a activé « Réduire les animations » (`prefers-reduced-motion:
  reduce`).

## Stack technique

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19, TypeScript
- Tailwind CSS v4
- PostgreSQL + [Prisma](https://www.prisma.io)
- [Auth.js](https://authjs.dev) (connexion par lien magique)
- [Anthropic Claude](https://www.anthropic.com) pour la lecture des devis/factures
- [Stripe](https://stripe.com) pour l'abonnement Pro
- [Resend](https://resend.com) pour l'envoi d'e-mails
- [Supabase Storage](https://supabase.com/storage) pour les pièces jointes des réponses fournisseurs

Toutes les intégrations externes (Resend, Stripe, Anthropic, Supabase) sont à
**dégradation gracieuse** : sans leur clé, l'application reste utilisable —
le contenu est affiché dans les logs du serveur ou la fonctionnalité
concernée est désactivée proprement.

## Installation

### Prérequis

- Node.js 20+
- Une base de données PostgreSQL (locale ou hébergée)

### Étapes

1. Installe les dépendances :

   ```bash
   npm install
   ```

2. Copie `.env.example` en `.env` et complète les variables (le détail de
   chaque variable est documenté dans ce fichier). Au minimum :

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` : connexion à ta base PostgreSQL.
   - `AUTH_SECRET` : génère une valeur avec `npx auth secret`.
   - `ANTHROPIC_API_KEY` : nécessaire pour l'écran « Analyser ».

3. Applique le schéma de base de données :

   ```bash
   npm run db:migrate
   ```

4. Lance le serveur de développement :

   ```bash
   npm run dev
   ```

   Ouvre [http://localhost:3000](http://localhost:3000).

Sans `RESEND_API_KEY`, le lien de connexion et les e-mails de demande de
devis/relances sont affichés dans les logs du terminal au lieu d'être
envoyés.

## Scripts disponibles

| Commande              | Description                                      |
| --------------------- | ------------------------------------------------- |
| `npm run dev`          | Démarre le serveur de développement (Turbopack)    |
| `npm run build`        | Build de production                                |
| `npm run start`        | Démarre le serveur de production                   |
| `npm run lint`         | Vérifie le code avec ESLint                        |
| `npm run db:migrate`   | Applique les migrations Prisma (développement)     |
| `npm run db:studio`    | Ouvre Prisma Studio                                |

## Déploiement sur Vercel

1. Importe le dépôt dans [Vercel](https://vercel.com/new).
2. Configure les variables d'environnement du projet (cf. `.env.example`) :
   au minimum `DATABASE_URL`, `AUTH_SECRET` et `ANTHROPIC_API_KEY`. Ajoute
   `RESEND_API_KEY`/`EMAIL_FROM`, `STRIPE_*`, `INBOUND_EMAIL_DOMAIN`,
   `SUPABASE_*`, etc. selon les fonctionnalités souhaitées.
3. Provisionne une base PostgreSQL (par ex. [Neon](https://neon.tech) ou
   [Supabase](https://supabase.com)) et applique les migrations en
   production :

   ```bash
   npx prisma migrate deploy
   ```

4. **Relances automatiques** : `vercel.json` déclare déjà un
   [Vercel Cron](https://vercel.com/docs/cron-jobs) qui appelle
   `GET /api/relancer` chaque jour à 6h UTC — rien à faire de plus après le
   déploiement. Si tu définis `CRON_SECRET`, Vercel ajoute automatiquement
   l'en-tête `Authorization: Bearer <CRON_SECRET>` à cet appel.
5. **Webhooks** :
   - Stripe : configure le webhook vers `/api/stripe/webhook` (événements
     `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`).
   - E-mails entrants : si `INBOUND_EMAIL_DOMAIN` est configuré, configure
     ton fournisseur d'e-mails pour transférer les réponses des
     fournisseurs vers `/api/inbound-email` (voir ci-dessous).

### Réception automatique des devis fournisseurs

Pour que les réponses des fournisseurs arrivent directement sur la fiche du
bon chantier, sans que l'artisan ait à gérer une boîte mail :

1. Configure `INBOUND_EMAIL_DOMAIN` (ex. `inbound.tonapp.fr`). Chaque demande
   de devis est alors envoyée avec une adresse de réponse dédiée
   `demande+<idDuChantier>@<INBOUND_EMAIL_DOMAIN>` (plus-addressing).
2. Configure ton service d'e-mails entrants (par ex. Resend Inbound ou
   Postmark Inbound) pour router les e-mails reçus sur ce domaine vers
   `POST /api/inbound-email`, avec le corps `{ to, from, subject, text,
   attachments }` (`attachments` : `{ filename, contentType, content
   (base64) }[]`).
3. Le webhook retrouve le chantier grâce à l'adresse `to`, enregistre la
   réponse (texte du message **et** pièces jointes — le prix est parfois
   indiqué directement dans le corps de l'e-mail), marque le fournisseur
   comme « répondu » (la barre de progression avance automatiquement) et
   stocke les pièces jointes via Supabase Storage (`SUPABASE_*`).
4. Si `INBOUND_EMAIL_SECRET` est défini, le webhook doit recevoir l'en-tête
   `Authorization: Bearer <INBOUND_EMAIL_SECRET>`.

Sans `INBOUND_EMAIL_DOMAIN`, les réponses des fournisseurs arrivent
directement dans la boîte mail de l'artisan (adresse de réponse = son
e-mail) et doivent être transférées manuellement.

## Structure du projet

```
src/
├── app/
│   ├── (app)/        # Écrans principaux : Accueil, Analyser, Demande, Bilan, Compte
│   ├── api/          # Routes API : analyse IA, Stripe, demande de devis, webhooks…
│   └── connexion/    # Connexion par lien magique
├── components/       # Composants d'interface partagés
└── lib/              # Accès aux données (Prisma), IA, e-mail, paiement, stockage…
prisma/
└── schema.prisma     # Schéma de base de données
```
