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
