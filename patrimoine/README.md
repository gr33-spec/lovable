# Patrimoine — pilotage patrimonial privé

Application web privée pour piloter un patrimoine immobilier sur 30 ans :
holding → sociétés → immeubles → logements, crédits, travaux, chronologie,
simulations et dossier banque PDF. Aucune IA : tous les chiffres viennent
d'un moteur de calcul unique et déterministe (`src/lib/engine`).

## Mise en ligne (une seule fois, environ 10 minutes)

L'application s'héberge gratuitement sur **Vercel** avec une base de données
**Neon** (PostgreSQL). Une fois en place, rien n'est à relancer : l'adresse
fonctionne en permanence.

1. Allez sur <https://vercel.com/new> et connectez-vous avec GitHub.
2. Dans la liste, choisissez le dépôt **lovable** → **Import**.
3. Dans **Root Directory**, cliquez **Edit**, choisissez le dossier
   **patrimoine**, puis **Continue**.
4. Ouvrez **Environment Variables** et ajoutez :
   - Nom : `APP_PASSWORD` — Valeur : le mot de passe de votre choix
     (long, par exemple 4 mots séparés par des tirets).
5. Cliquez **Deploy**. Le premier déploiement affichera une erreur de base
   de données : c'est normal, on la branche à l'étape suivante.
6. Dans le projet Vercel, onglet **Storage** → **Create Database** →
   **Neon** (Serverless Postgres) → **Continue** → région **Frankfurt**
   (ou Paris) → **Create** → **Connect** au projet. Vercel ajoute tout seul
   la variable `DATABASE_URL`.
7. Onglet **Deployments** → sur la dernière ligne, menu **⋯** →
   **Redeploy**.
8. Ouvrez l'adresse `https://….vercel.app` affichée par Vercel, entrez
   votre mot de passe. Terminé.

Les tables de la base sont créées automatiquement au premier accès.

### Lecture automatique des bilans (facultatif)

Pour que les PDF de bilans soient lus par l'IA (Claude, d'Anthropic) :
créez une clé sur console.anthropic.com → API Keys, puis ajoutez la variable
`ANTHROPIC_API_KEY` dans Vercel et redéployez. Sans cette clé, les PDF sont
conservés et la saisie manuelle fonctionne. Rien n'est enregistré sans
validation.

### Sur iPhone

Ouvrez l'adresse dans Safari → bouton **Partager** → **Sur l'écran
d'accueil** → **Ajouter**.

### Changer le mot de passe

Vercel → projet → **Settings** → **Environment Variables** → modifier
`APP_PASSWORD` → **Redeploy**. Toutes les sessions ouvertes sont alors
déconnectées.

## Sécurité

- Toutes les pages et API exigent une session (`src/proxy.ts` + contrôle
  dans chaque route). Sans session : redirection vers `/connexion`, API en
  401.
- Mot de passe uniquement côté serveur (variable d'environnement),
  comparaison à temps constant, 8 essais max par quart d'heure et par IP.
- Session : cookie `HttpOnly`, `Secure`, `SameSite=Lax`, signé HMAC,
  60 jours glissants.
- Contrôle d'origine sur les requêtes d'écriture, en-têtes de sécurité
  (HSTS, `X-Frame-Options`, `noindex`).
- HTTPS fourni par Vercel ; base Neon accessible uniquement avec ses
  identifiants (jamais envoyés au navigateur).

## Sauvegardes

- Chaque modification est enregistrée immédiatement (indicateur
  « Enregistré »).
- Un instantané automatique par jour (120 conservés) + avant chaque
  import, restauration ou suppression de la démo. Restauration depuis
  **Plus → Sauvegardes**.
- Export / import d'un fichier de sauvegarde complet (JSON).

## Développement

```bash
npm install
# .env.local : DATABASE_URL=postgresql://… et APP_PASSWORD=…
npm run dev        # http://localhost:3000
npm test           # tests du moteur de calcul
npm run lint && npm run typecheck
```

Structure :

```
src/lib/engine/    moteur de calcul unique (crédits, projection, scénarios)
src/lib/server/    base de données, session, garde d'API
src/lib/pdf/       dossier banque (PDF généré côté serveur)
src/app/(app)/     écrans (Accueil, Patrimoine, Chronologie, Simulations, Plus)
src/app/api/       API privées
```
