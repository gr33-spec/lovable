# ADR-0013 — Hébergement en conteneurs, région UE

- **Date** : 2026-09-28 · **Statut** : Proposé (choix du fournisseur en phase 5)

## Contexte
BatiClair est prévu pour Vercel (fonctions serverless, cron Vercel). Le
nouveau backend a un worker permanent (jobs) et traite des données
commerciales de clients européens.

## Décision proposée
- Tout est livré en **images Docker** (web, api, worker) : aucune
  dépendance à une plateforme.
- Production dans l'UE : PostgreSQL managé avec sauvegardes et restauration
  à un instant donné, stockage S3-compatible, conteneurs managés.
  Candidats : Scaleway, Clever Cloud, OVHcloud (fournisseurs français), ou
  un cloud majeur en région UE. Comparaison chiffrée faite en phase 5.
- Staging identique à la production, données fictives uniquement.

## Conséquences
Le cron Vercel de BatiClair est remplacé par les tâches planifiées de
pg-boss. Le web Next.js peut rester sur une plateforme serverless s'il est
hébergé en région UE, mais la cible par défaut est le même hébergeur.
