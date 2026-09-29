# ADR-0015 — Mise en ligne d'essai : Vercel + Neon, comme patrimoine

- **Date** : 2026-09-29 · **Statut** : Accepté · Complète ADR-0013 (qui reste la cible pour la production avec données réelles)

## Contexte
Le fondateur veut une application utilisable en ligne, mise en place
« de la même manière » que l'application patrimoine du même dépôt :
Vercel + base Neon, quelques clics, déploiement automatique.

## Décision
- **Deux projets Vercel** depuis le même dépôt : `apps/api` (NestJS,
  détecté sans configuration par Vercel) et `apps/web` (Next.js).
- Le site **relaie `/v1/*` vers l'API** (rewrite Next.js) : une seule
  origine pour le navigateur, donc cookies de session « même site »
  (fiables sur Safari/iPhone), pas de CORS. `API_PUBLIC_URL` de l'API = adresse du site.
- **Neon** créé depuis Vercel, région Francfort ; fonctions Vercel en
  `fra1` (`vercel.json`). Données et calcul dans l'UE.
- **Migrations au déploiement** (`vercel-build` : `prisma migrate deploy`
  sur la connexion directe `DATABASE_URL_UNPOOLED`).
- E-mails via **Resend** si une clé est fournie ; sinon désactivés et
  signalés à l'interface (`/v1/health` → `features.email`).

## Limites connues, assumées pour la phase d'essai
- **Pas de worker permanent** : les traitements longs (lecture de
  documents par IA, phase 2) demanderont soit des fonctions longues ou une
  file gérée par Vercel, soit un hébergement de conteneurs (ADR-0013). À
  trancher au début de la phase 2, mesures à l'appui.
- Limitation de débit de l'authentification en mémoire par instance.
- Déploiements « Preview » : utiliser les branches de base Neon par preview.
- Déploiement Vercel **non testable depuis l'environnement de développement** :
  la chaîne a été vérifiée localement (build de production, migrations,
  tests de bout en bout) ; le premier déploiement réel fera foi.
