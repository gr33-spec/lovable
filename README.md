# BatiClair

**Le juste prix de tes matériaux.**

BatiClair est une application web mobile-first destinée aux artisans du
bâtiment : comparer des devis fournisseurs, vérifier ses factures et
envoyer des demandes de devis par e-mail, le tout depuis son téléphone.

## Fonctionnalités

- **Comparer des devis** : dépose 2 à 4 devis (photo ou PDF), l'IA les lit
  et indique le devis le plus avantageux ainsi que l'économie réalisée.
- **Vérifier une facture** : compare une facture reçue à son devis d'origine
  pour repérer un éventuel trop-payé.
- **Connexion par lien magique** : aucun mot de passe, juste un e-mail.
- **Abonnement Pro** (Stripe) : 3 analyses gratuites par mois, illimité avec
  le plan Pro.
- **Demande de devis** : envoie une demande à plusieurs fournisseurs en un
  clic depuis ton carnet d'adresses, suis les réponses reçues et relance
  automatiquement les fournisseurs muets.
- **Bilan** : économies cumulées sur l'année et prix moyens par produit.

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
     fournisseurs vers `/api/inbound-email`.

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
