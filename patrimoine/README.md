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

### Face ID

Plus → **Connexion Face ID** → « Activer Face ID sur cet appareil ». La
connexion se fait ensuite d'un geste ; le mot de passe reste valable.
Changer `APP_PASSWORD` désactive toutes les clés Face ID.

### Partage en lecture seule

Plus → **Partager en lecture seule** : lien pour un banquier, un comptable
ou un associé, valable 7 jours à 1 an, révocable à tout moment. La personne
voit la synthèse et télécharge le dossier PDF, sans rien pouvoir modifier.
Le lien n'est affiché qu'une fois (seule son empreinte est stockée).

### Gestion locative (location nue, résidence principale)

Fiche de chaque logement (Patrimoine → immeuble → logement) :
**Changer de locataire** (départ, état des lieux de sortie comparé à
l'entrée, dépôt de garantie et retenues, nouveau locataire, bail, acte de
cautionnement, état des lieux d'entrée) et **Obtenir une quittance** (un
mois précis, ou attestation de loyers à jour ; reçu seulement si le paiement
est partiel). Les textes juridiques sont versionnés dans `src/lib/legal/` :
le modèle de bail est choisi selon la date de conclusion (contrat type 2015,
ou version issue du décret n° 2026-596 pour les baux conclus à compter du
1er octobre 2026). Voir Plus → Cadre juridique.

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
- Export Excel (un onglet par thème, chiffres calculés inclus).

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
