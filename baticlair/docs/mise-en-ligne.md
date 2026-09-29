# Mise en ligne (une seule fois, environ 20 minutes)

Même méthode que l'application **patrimoine** : hébergement **Vercel** et
base de données **Neon** (PostgreSQL), région **Francfort**. Une fois en
place, rien n'est à relancer : l'adresse fonctionne en permanence, et
chaque mise à jour de la branche principale se déploie toute seule.

Différence avec patrimoine : l'application est en **deux morceaux**, donc
**deux projets Vercel** à importer depuis le même dépôt :

| Projet Vercel | Dossier | Rôle |
|---|---|---|
| `baticlair-api` | `baticlair/apps/api` | Le moteur : comptes, entreprises, chantiers, base de données |
| `baticlair` | `baticlair/apps/web` | Les écrans. Il relaie `/v1/*` vers l'API : pour le navigateur, tout vient de la même adresse |

> Les noms de projets donnent les adresses : `https://baticlair-api.vercel.app`
> et `https://baticlair.vercel.app`. Si Vercel ajoute un suffixe (nom déjà
> pris), notez l'adresse réelle affichée et utilisez-la partout ci-dessous.

> **Le projet Vercel `lovable` déjà existant** met en ligne la *racine* du
> dépôt, où se trouvait l'ancienne BatiClair (supprimée depuis, voir
> ADR-0016). Ses déploiements échouent déjà (rien à construire à la
> racine) ; la version déjà en ligne reste affichée.
> Au choix :
> - **le réutiliser comme site** (recommandé, garde l'adresse) :
>   projet **lovable** → **Settings** → **Build and Deployment** →
>   **Root Directory** : `baticlair/apps/web` → **Save**, puis faites l'étape 2
>   ci-dessous *dans ce projet* au lieu d'en créer un nouveau (ajoutez
>   `API_URL`, les anciennes variables peuvent rester ou être supprimées),
>   et utilisez son adresse à la place de `https://baticlair.vercel.app` ;
> - ou le **supprimer** (**Settings** → **Delete Project**) si l'ancienne
>   version en ligne ne sert plus.
>
> Le projet **patrimoine** (dossier `patrimoine/`) est une autre
> application : ne changez rien à ses réglages.

---

## Avant de commencer : le secret de session

Il faut une longue valeur secrète (au moins 32 caractères) qui protège les
connexions. Deux possibilités :

- ouvrez <https://generate-secret.vercel.app/32> et copiez le texte affiché ;
- ou inventez une phrase de 6 mots au moins, avec des chiffres
  (ex. `Ardoise-Crochet-Liteau-2026-Faitage-Rive-91`).

Gardez-la de côté pour l'étape 1. Ne la communiquez à personne.

---

## Étape 1 — Le moteur (`baticlair-api`)

1. Allez sur <https://vercel.com/new> (connecté avec GitHub).
2. Choisissez le dépôt **lovable** → **Import**.
3. **Project Name** : `baticlair-api`.
4. **Root Directory** → **Edit** → choisissez **baticlair** → **apps** → **api** → **Continue**.
   Vercel reconnaît **NestJS**.
5. **Environment Variables** — ajoutez :
   - `AUTH_SECRET` : le secret préparé plus haut ;
   - `API_PUBLIC_URL` : `https://baticlair.vercel.app` ;
   - `WEB_APP_URL` : `https://baticlair.vercel.app`.
6. **Deploy**. Le premier déploiement échoue sur la base de données :
   c'est normal, on la branche maintenant.
7. Onglet **Storage** → **Create Database** → **Neon** (Serverless
   Postgres) → **Continue** → région **Frankfurt** (eu-central-1) →
   **Create** → **Connect** au projet. Vercel ajoute tout seul
   `DATABASE_URL` et `DATABASE_URL_UNPOOLED`.
8. Onglet **Deployments** → dernière ligne, menu **⋯** → **Redeploy**.
   Les tables sont créées automatiquement pendant ce déploiement.
9. Vérification : ouvrez `https://baticlair-api.vercel.app/v1/health`.
   Vous devez lire `{"status":"ok", …}`.

## Étape 2 — Les écrans (`baticlair`)

1. De nouveau <https://vercel.com/new> → dépôt **lovable** → **Import**.
2. **Project Name** : `baticlair`.
3. **Root Directory** → **baticlair** → **apps** → **web** → **Continue**. Vercel reconnaît **Next.js**.
4. **Environment Variables** :
   - `API_URL` : `https://baticlair-api.vercel.app`.
5. **Deploy**.
6. Ouvrez `https://baticlair.vercel.app` → **Créer un compte**. Terminé.

## Étape 3 — Si Vercel a changé une adresse

Si l'adresse réelle du site n'est pas `https://baticlair.vercel.app` :
projet **baticlair-api** → **Settings** → **Environment Variables** →
corrigez `API_PUBLIC_URL` et `WEB_APP_URL` → **Deployments** → **Redeploy**.
Si c'est l'adresse de l'API qui diffère : projet **baticlair** → corrigez
`API_URL` → **Redeploy**.

---

## Facultatif — les e-mails (confirmation d'adresse, mot de passe oublié)

Sans cette étape, tout fonctionne, mais aucun e-mail ne part : l'application
l'indique clairement (« la réinitialisation par e-mail est indisponible »).

1. Créez un compte sur <https://resend.com> → **API Keys** → **Create**.
2. Pour écrire à n'importe quelle adresse, Resend demande de vérifier un
   nom de domaine (**Domains** → **Add**). En attendant, seuls les e-mails
   vers votre propre adresse de compte Resend partent.
3. Projet **baticlair-api** → **Environment Variables** :
   - `RESEND_API_KEY` : la clé ;
   - `EMAIL_FROM` : par exemple `BatiClair <bonjour@votre-domaine.fr>`.
4. **Redeploy**.

## Sur iPhone

Ouvrez l'adresse du site dans Safari → **Partager** → **Sur l'écran
d'accueil** → **Ajouter**. L'application s'ouvre ensuite comme une app.

## Changer le secret de session

Projet **baticlair-api** → **Settings** → **Environment Variables** →
modifier `AUTH_SECRET` → **Redeploy**. Toutes les sessions ouvertes sont
alors déconnectées.

---

## Ce qui est en ligne aujourd'hui

| Fonction | État |
|---|---|
| Créer un compte, se connecter, rester connecté 30 jours | **RÉEL** |
| Mot de passe oublié, confirmation d'e-mail | **RÉEL** si Resend est configuré, sinon indiqué comme indisponible |
| Entreprise, chantiers (créer, chercher, modifier, marquer terminé) | **RÉEL** |
| Bouton « + » : nouveau chantier | **RÉEL** |
| Bouton « + » : photo / fichier d'un devis | **NON IMPLÉMENTÉ** (affiché « Bientôt ») |
| Fournisseurs, Factures | **NON IMPLÉMENTÉ** (écrans « Bientôt ici ») |
| Comparaison de devis | Moteur réel et testé, **pas encore relié aux écrans** |

## Précautions

- **Déploiements de test** : Vercel déploie aussi les autres branches
  (« Preview »). Comme les migrations de base s'exécutent au déploiement,
  activez dans l'intégration Neon **« Create a database branch for each
  preview deployment »** (Storage → la base → Settings), pour que les
  essais n'utilisent jamais la base principale.
- **Données réelles** : cette version sert aux essais. Avant d'y mettre
  les vrais documents de clients, il reste à valider le fournisseur d'IA
  et l'hébergement de production (Q6), et à tester une restauration de
  sauvegarde (docs/security.md).
- Les adresses `*.vercel.app` ne sont pas indexées par les moteurs de
  recherche (en-tête `noindex`).
