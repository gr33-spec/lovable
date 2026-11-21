# Pilote 20 à 100 couvreurs : état réel et plan (1er novembre 2026)

Établi en lecture des preuves (Git, CI GitHub, API Vercel et Neon en GET, code) et en tests LOCAUX seulement. Rien n'a
été poussé, déployé, migré ni modifié sur un service. Faits **[prouvé]**, suppositions **[hypothèse]**.

## 1. Où en est-on

| Élément | État | Preuve |
|---|---|---|
| Production | code du 19 octobre (`977823f0`), 324 commits et 34 migrations derrière test.mobiiz.fr, adresses `*.vercel.app` seulement **[prouvé]** | `git rev-list`, API Vercel (alias, déploiements) |
| test.mobiiz.fr | `7b4d79ae` (code de `89011e1f`), base Neon de test, e-mails hors liste blanche REDIRIGÉS vers une adresse de test **[prouvé]** | API Vercel ; `config.ts` (`EMAILS_AUTORISES`, `EMAIL_REDIRECTION`) |
| CI | rouge (exécution 786) ; corrigée sur la branche locale `claude/pilote-fiabilite` (voir §3) **[prouvé]** | journaux GitHub, tests locaux |
| Réglages de la production (noms seulement) | ni envoi d'e-mails (`RESEND_API_KEY`, `EMAIL_DOMAINE` absents), ni réglage de paiement, ni `GROUPE`, ni administrateurs, ni alertes **[prouvé]** | API Vercel `GET /v9/projects/*/env` (noms) |
| Démarrage du code actuel en production avec ces réglages | refusé : `PAIEMENT` vaut « simulé » par défaut et `ABONNEMENT` « on » ; la configuration refuse ce couple en production **[prouvé par lecture du code, non exécuté]** | `config.ts` lignes 139, 144, 451 |
| Sauvegardes | aucune hors Neon ; workflow corrigé en local, non activé **[prouvé]** | §3 |
| IA | crédit Anthropic épuisé au dernier contrôle (12 h 50 UTC) ; lecture réelle non revérifiée depuis le 26 octobre **[prouvé]** | routine `credit-ia` |
| Quotas pour un compte sans abonnement | 1 analyse de devis au total (`LECTURES_IA_GRATUIT_TOTAL`, défaut 1) et 3 scans ; pendant l'essai de 60 jours, jusqu'à 5 négoces par demande, sinon 1 **[prouvé]** | `tarifs.ts:25`, `config.ts:247`, `offre-artisan.ts:77-93` |
| Alertes de production | prévues (`platform/alerts/alerter.ts`) mais `ALERT_EMAIL` / `ALERT_WEBHOOK_URL` posés nulle part **[prouvé]** | API Vercel (noms) |
| Neon | formule gratuite (`free_v3`), 6 h d'historique, production 75 Mo **[prouvé]** | API Neon |
| Vercel, Resend | formules inconnues **[hypothèse]** : à lire dans les consoles | — |

## 2. Capacité 20, 40, 100 couvreurs (sans test de charge)

Hypothèse d'usage normal : 3 listes par couvreur et par semaine, 3 négoces par demande, une analyse IA par devis déposé,
5 à 15 personnes connectées en même temps à 100 couvreurs. Ce n'est pas une mesure.

| | 20 | 40 | 100 |
|---|---|---|---|
| Serveur (Vercel, fonctions) | large **[hypothèse]** | large | large, si formule commerciale |
| Base (Neon gratuit) | probable | limite de stockage à surveiller (devis et PDF stockés dans la base, purgés à 30 jours) | formule payante probable |
| E-mails (≈ 4 par demande avec réponses et relances) | ≈ 1 000 / mois | ≈ 2 000 | ≈ 5 000 : au-delà d'une formule gratuite Resend si c'en est une **[hypothèse]** |
| IA (Opus par devis) | coût par lecture non mesuré : à lire dans `ai_execution` | | |

Aucun chiffre de capacité n'est garanti : la mesure se fera sur une copie isolée avec des données fictives, avec accord.

## 3. Corrigé sur la branche locale `claude/pilote-fiabilite` (non poussée)

| Commit | Quoi | Vérification |
|---|---|---|
| `9fc81337` | recherche du catalogue 5 fois plus rapide (mêmes résultats) ; l'erreur « adresse pas valide » d'une fiche de négoce s'efface à la correction ; tests « lots » au texte actuel | domaine 937/937 ; e2e « lots » 16/16 (téléphone et ordinateur) ; types et lint |
| `3dc02cd0` | workflow de sauvegarde : client PostgreSQL 18, échec si secrets absents, export relu, SHA-256, environnement « sauvegarde » ; restauration sans phrase en ligne de commande | répétition locale sur la base e2e fictive : export, chiffrement, déchiffrement, restauration, comptages identiques |

### Tests locaux complets sur cette branche (1er novembre 2026, soir)

| Série | Résultat | Durée |
|---|---|---|
| Domaine (types, 937 tests) | vert | 45 s |
| API (types, 641 tests) | 640 réussis, 1 ignoré, 0 échec | 21,5 min |
| Web (types, lint, tests unitaires, build) | vert | — |
| e2e principale (téléphone + ordinateur) | 243 réussis, 29 ignorés, 0 échec | 36,8 min |
| e2e « lots » (téléphone + ordinateur) | 16 réussis sur 16 | 11,3 min |

Ces tests utilisent le faux lecteur IA et un envoi d'e-mails simulé : ils ne prouvent ni la vraie lecture IA ni la
délivrance réelle des e-mails, à vérifier une fois en ligne avec accord.

## 4. Plan

Voir le message à Greg du 1er novembre 2026 (blocages, actions de Greg, ce qui attend). Rien ne se fait sur le vrai
site, la production, la facturation ou un service externe sans son accord pour l'action précise.
