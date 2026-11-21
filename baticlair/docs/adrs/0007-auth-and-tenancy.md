# ADR-0007 — Authentification et isolation multi-tenant

- **Date** : 2026-09-28 · **Statut** : Accepté

## Contexte
Besoin : e-mail + mot de passe, vérification d'e-mail, reset, Google,
Microsoft, sessions longues, suppression de compte ; plus tard Apple Sign
In pour une app native. Données en Europe, pas de dépendance forte à un
service d'identité.

## Options
1. Service managé (Clerk, Auth0) — rapide, mais données d'identité hors de
   chez nous, coût par utilisateur, verrouillage.
2. Auth.js (utilisé par BatiClair) — lié à Next.js, alors que l'auth doit
   vivre dans l'API (ADR-0003).
3. Fait maison — risqué sur un sujet de sécurité.
4. **Better Auth** — bibliothèque TypeScript indépendante du framework,
   données dans notre PostgreSQL, e-mail/mot de passe, vérification, reset,
   OAuth sociaux, sessions en base. Activement maintenue (v1.7.6 publiée le
   2026-09-24 d'après le registre npm).

## Décision
Better Auth, hébergé dans `apps/api`, encapsulé dans le module `identity`.
Le reste du code ne connaît que `AuthenticatedUser` et `TenantContext`.

## Tenancy
- `Company` est le tenant ; `Membership(userId, companyId, role)` avec rôles
  `owner | admin | member | viewer` (MVP : un owner ; pas de moteur RBAC).
- `TenantContext` résolu par un guard à chaque requête (entreprise active
  de la session, appartenance vérifiée) et transmis explicitement aux
  repositories.
- Accès à une ressource d'une autre entreprise → 404.
- Tests d'isolation automatiques obligatoires.
- Phase 5 : RLS PostgreSQL (`SET LOCAL app.company_id` par transaction) en
  défense en profondeur.

## Conséquences
La documentation détaillée de Better Auth n'a pas pu être consultée depuis
cet environnement (accès réseau bloqué) : l'intégration sera vérifiée sur
la documentation officielle au début de la phase 1.
