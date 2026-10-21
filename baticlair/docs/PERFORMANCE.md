# Performance (plan du 20 octobre 2026, bloc 12)

Mesure : Lighthouse 12.8 (mobile, « slow 4G » simulé : 1,6 Mbit/s, 150 ms d'aller-retour, processeur ralenti ×4), site construit (`next build` + `next start`) et API locale, le 20 octobre 2026. C'est plus sévère que « la 4G » d'un chantier ; les chiffres réels sur un iPhone en 4G sont meilleurs.

## Pages publiques (branche `claude/landing-page`)

| Page | Score | Premier rendu | Plus grand élément (LCP) | Blocage | Décalage (CLS) | Poids |
|---|---|---|---|---|---|---|
| `/` (landing) | 97 | 0,9 s | 1,6 s | 50 ms | 0,10 | 267 Ko |
| `/connexion` | 99 | 0,8 s | 1,6 s | 70 ms | 0,04 | 279 Ko |
| `/inscription` | 93 | 1,4 s | 1,9 s | 60 ms | 0,15 | 238 Ko |

Objectif « < 2 s » tenu sur les pages publiques, en slow 4G.

## Application connectée (branche de #284, session ouverte)

| Écran | Score | Premier rendu | LCP | Blocage | CLS | Poids |
|---|---|---|---|---|---|---|
| Accueil `/` | 92 | 1,4 s | 3,0 s | 80 ms | 0,10 | 338 Ko |
| Nouveau chantier | 93 | 1,4 s | 3,2 s | 90 ms | 0,00 | 314 Ko |
| Groupé | 92 | 1,1 s | 3,4 s | 90 ms | 0,00 | 314 Ko |
| Fournisseurs | 95 | 1,1 s | 3,0 s | 60 ms | 0,00 | 315 Ko |
| Mon compte (avant correction) | 64 | 1,4 s | 3,6 s | 130 ms | **0,96** | 329 Ko |

Lecture : le premier rendu arrive en 1,1 à 1,4 s ; le contenu final (LCP) à 3 s en slow 4G parce que l'app attend deux allers-retours après le chargement (la session `/v1/me` + `/v1/health`, puis les données de l'écran). En 4G réelle (10 Mbit/s, 50 ms), ces deux allers-retours coûtent ~0,3 s : l'écran est lisible sous 2 s.

## Corrigé

- **Mon compte, CLS 0,96** : la carte « Économisé grâce au groupé » arrivait après le chargement au-dessus de la carte du compte et poussait tout l'écran. Elle est maintenant en bas de l'écran : plus de décalage.

## Pistes (dette, par gain décroissant)

1. **Un seul aller-retour au démarrage** : servir `/v1/me` et `/v1/health` ensemble (une route `/v1/session`), ou laisser la page charger ses données en parallèle de la session au lieu d'attendre `SessionGate`. Gain estimé : −0,6 s de LCP en slow 4G.
2. **Mettre `/v1/health` en cache côté navigateur 30 s** (en-tête `Cache-Control`) : il ne change qu'au déploiement.
3. **Polices** : trois familles variables chargées (Plus Jakarta Sans, Bricolage Grotesque, Instrument Serif) ; `font-display: swap` est posé par Fontsource ; précharger la police d'affichage du titre (LCP) avec `<link rel="preload">`.
4. **Accueil, CLS 0,10** : la liste « À faire » arrive après les chantiers récents ; réserver sa hauteur minimale.

## Lighthouse mobile à 90 (plan 2 du 21 octobre 2026, bloc 9)

Même mesure (Lighthouse 12.8, mobile, slow 4G simulé, site construit, API locale), sur la branche `claude/dette-2`, le 21 octobre 2026. Toutes les pages sont à 90 ou plus.

| Page | Score | Premier rendu | LCP | Blocage | CLS |
|---|---|---|---|---|---|
| `/` (landing, déconnecté) | 94 | 1,4 s | 2,6 s | 50 ms | 0,10 |
| `/connexion` | 99 | 0,8 s | 1,7 s | 90 ms | 0,06 |
| `/inscription` | 91 | 1,4 s | 2,6 s | 50 ms | 0,15 |
| Accueil `/` (connecté) | 93 | 1,4 s | 3,1 s | 80 ms | 0,04 |
| Chantiers | 93 | 1,4 s | 3,2 s | 50 ms | 0,00 |
| Nouveau chantier | 94 | 1,4 s | 3,1 s | 40 ms | 0,00 |
| Groupé | 94 | 1,1 s | 3,0 s | 70 ms | 0,00 |
| Fournisseurs | 91 | 1,1 s | 2,9 s | 100 ms | 0,11 |
| Mon compte (avant) | 70 | 1,4 s | 3,3 s | 80 ms | **0,55** |
| Mon compte (après) | 93 | 1,4 s | 3,1 s | 60 ms | 0,02 |

Corrigé sur « Mon compte » : trois cartes arrivaient après leur réponse de l'API et poussaient tout l'écran (la formule, les coordonnées de l'entreprise, la liste des 23 métiers). Elles prennent leur place dès le premier rendu : la carte de la formule a un gabarit vide, la carte des coordonnées se dessine avec ses champs grisés (`aria-busy`) et se remplit sans bouger, la liste des métiers réserve sa hauteur. Les pistes 1 à 4 ci-dessus restent valables pour aller plus loin (le LCP à 3 s en slow 4G tient aux deux allers-retours du démarrage) ; la 2 est faite (`/v1/health` en cache 30 s).

## Tests de charge de l'API (plan 2 du 21 octobre 2026, bloc 7)

Mesure : `CHARGE=1 … npx vitest run test/charge.test.ts` dans `apps/api` (base Postgres locale, prestataire d'e-mail de capture, PDF réels). Jeu : 200 artisans dans 5 départements, 20 négoces, 1 000 besoins signés sur 50 références, plus le compte de Greg avec 10 besoins. Le test n'est pas dans la série ordinaire (il écrit 1 010 bons de commande) ; il se relance à la demande et affiche son tableau.

### Routes (objectif : moins d'une seconde)

| Route | Avant les lots | Après 50 lots passés |
|---|---|---|
| `GET /v1/groupe` (état de l'onglet) | 35 ms | 23 ms |
| `GET /v1/groupe/lots` (« Mes lots », 10 lots) | 24 ms | 14 ms |
| `GET /v1/groupe/negoces` | 14 ms | |
| `GET /v1/projects/:id/groupe` (« Au groupé ») | 19 ms | 12 ms |
| `GET /v1/admin/groupe` (tableau, 50 lots, 1 010 bons) | 38 ms | 50 ms |
| `GET /v1/admin/groupe/lots/:id` (journal d'un lot) | | 25 ms |
| `GET /v1/groupe/economies` | | 8 ms |
| `GET /v1/admin/groupe/factures.csv` (50 factures) | | 12 ms |

Toutes sous 50 ms : rien à corriger côté routes. « Mes lots » ne charge plus le PDF de chaque bon (il n'était pas affiché).

### Tâches planifiées (par passage, une fois par jour)

| Étape | Durée | Volume | Par lot |
|---|---|---|---|
| `regrouper` : ranger 1 010 besoins, former 50 lots | 0,5 s | 50 lots | 10 ms |
| Demandes aux négoces (un e-mail par négoce, PDF joint) | 5,8 s | 20 négoces, 50 lots | 115 ms |
| Choix des négoces + bons de commande + factures | 12,6 s, puis 11,4 s avec les PDF par paquets de 10 | 50 lots, 1 010 bons (un PDF chacun), 1 010 e-mails | 230 ms |
| Relances (50 factures, 1 010 livraisons) | 5,9 s | 1 060 e-mails | |
| Rapport mensuel | 0,06 s (0,98 s avant) | 201 entreprises | |

Ce qui a été corrigé :

- **Un budget de temps par passage** (`BUDGET_MS` = 40 s dans `regroupement.controller.ts`) : une fonction Vercel s'arrête à 60 s au plus ; à 50 lots par jour, un passage dépassait ce temps et aurait été coupé au milieu d'un lot. Chaque étape s'arrête maintenant à l'échéance, lot entier par lot entier, et le reste part au passage suivant (toutes les étapes sont rejouables : statuts des lots, « déjà envoyé », « déjà relancé »). La réponse de la tâche porte `tempsEpuise: true` quand il reste du travail.
- **Rapport mensuel** : deux requêtes groupées (devis lus par entreprise, bons du mois) au lieu de quatre par entreprise : 975 ms → 63 ms pour 201 entreprises.
- **Bons de commande** : numéros de compte et propriétaires lus en deux requêtes par lot au lieu de deux par bon ; **relances de livraison** : les propriétaires en une requête. **Demandes** : les réponses existantes lues d'un coup, les nouvelles créées d'un coup.

Ce qui reste : le temps des bons de commande est celui des PDF (pdf-lib, ~10 ms par bon, un seul fil d'exécution : les paquets de 10 ne gagnent que 10 %) et des e-mails, un par artisan ; 50 lots d'un coup est un jour exceptionnel (la formation se fait au fil de l'eau, dès le seuil), et le budget garantit qu'un passage ne casse pas.
