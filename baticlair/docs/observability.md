# Observabilité

Objectif : **comprendre pourquoi quelque chose a échoué sans lire les
données privées du client.**

## Identifiants de corrélation

| Identifiant | Origine | Propagé dans |
|---|---|---|
| `requestId` | Généré à l'entrée de l'API (ou repris de l'en-tête) | Logs, réponses d'erreur, jobs créés |
| `supportId` | Forme courte du `requestId` affichée à l'utilisateur (« Code support : 7F3K-92Q ») | Messages d'erreur UI |
| `jobId` | File de jobs | Logs du worker, `AIExecution` |
| `documentId`, `consultationId`, `projectId` | Métier | Logs |
| `companyId` | Contexte tenant | Logs (identifiant opaque, jamais le nom) |

## Logs

- JSON structuré (pino), un événement par ligne, niveau, horodatage,
  module, identifiants ci-dessus, durée.
- **Interdit** dans les logs : contenu de document, prompt rempli, réponse
  du modèle, montants d'un client, adresses e-mail complètes (masquées),
  jetons, mots de passe. Filtre de masquage automatique sur les clés
  sensibles.

## Suivi d'erreurs

SDK compatible Sentry (instance UE ou auto-hébergée), avec `requestId`,
`jobId`, version de l'application ; données personnelles filtrées.

## Traces

OpenTelemetry sur l'API et le worker (HTTP, Prisma, appels sortants),
exporteur configurable. Une analyse de document = une trace de la requête
d'upload jusqu'à la fin du job.

## Métriques

- Techniques : latence API, taux d'erreur, profondeur et âge des files de
  jobs, durée par type de job, tentatives, échecs.
- IA : appels, échecs, sorties invalides, jetons, **coût** par document /
  entreprise / consultation / module / modèle (depuis `AIExecution`).
- Produit : entonnoir (inscription → premier document → liste validée →
  première consultation → première comparaison).

## Alertes (en place : audit de lancement, B5)

L'API prévient l'équipe elle-même (`platform/alerts/alerter.ts`) :

- **erreur serveur** (toute réponse 5xx) : code, route, code support — jamais de donnée de client ;
- **lecture de devis échouée** (IA en panne, réponse inutilisable, erreur imprévue) : la raison.

Au plus une alerte par sorte toutes les 10 minutes ; la suivante dit combien ont été tues.
`GET /v1/health` → `features.alerts` dit si un canal est branché.

**Brancher les alertes** (projet Vercel `baticlair-api` → Settings → Environment Variables, puis Redeploy) :

1. `ALERT_WEBHOOK_URL` : l'adresse d'un webhook **Discord** (salon → Modifier → Intégrations →
   Webhooks → Copier l'URL ; notifications sur le téléphone avec l'appli Discord) ou **Slack**
   (Incoming Webhook).
2. et/ou `ALERT_EMAIL` : une adresse e-mail (nécessite l'envoi d'e-mails configuré, `RESEND_API_KEY`).

**Le site répond-il ?** (à faire une fois, hors de Vercel) : un moniteur gratuit
(UptimeRobot ou Better Stack) sur `https://baticlair-api.vercel.app/v1/health`, toutes les
5 minutes, alerte par e-mail ou SMS. Il détecte ce que l'API ne peut pas dire elle-même : qu'elle
ne répond plus.

## Journal d'audit

`AuditEvent` pour les actions sensibles : connexion, changement de mot de
passe, ajout/retrait de membre, connexion/déconnexion d'intégration,
export, suppression. Consultable par le propriétaire de l'entreprise.
