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

## Alertes (à partir du staging)

Taux d'échec des jobs, file bloquée, fournisseur IA ou e-mail en erreur,
coût IA journalier au-delà d'un seuil, échec de sauvegarde.

## Journal d'audit

`AuditEvent` pour les actions sensibles : connexion, changement de mot de
passe, ajout/retrait de membre, connexion/déconnexion d'intégration,
export, suppression. Consultable par le propriétaire de l'entreprise.
