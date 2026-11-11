# Inventaire du mode démonstration (11 novembre 2026)

Décision de Greg : la démonstration publique est retirée. Un visiteur n'entre plus dans une fausse session. Ce document
recense ce qui en dépend encore, sans rien supprimer. Aucune suppression sans son accord.

Trois choses portent le mot « démo » dans le code. Une seule est retirée.

| Quoi | État | À quoi ça sert |
|---|---|---|
| 1. L'accès visiteur public (« Découvrir l'application ») | **retiré du public, point d'entrée fermé par défaut** | Créait un compte et une entreprise fictifs sans inscription |
| 2. Le chantier fictif d'un vrai compte (« Essayer avec un chantier fictif ») | inchangé | Un compte réel essaie le parcours sur un chantier d'exemple |
| 3. Le jeu de démonstration de l'administration | inchangé | L'admin crée ou efface des données d'exemple pour tester |

## 1. L'accès visiteur public

**Ce qui est fait dans ce commit**

- La page publique n'a plus le bouton « Découvrir l'application » : il est remplacé par « Voir Mobiiz en images », une
  présentation statique (`apps/web/src/components/presentation-images.tsx`) qui ne crée ni compte ni session.
- Nouveau réglage `DEMO_PUBLIQUE` (coupé par défaut, refusé en production). Le point d'entrée ne s'ouvre que si
  `DEMO_PUBLIQUE` **et** `ACCES_DEMO` sont allumés. Fermé, `POST /v1/public/demo/session` répond « introuvable » (404),
  sans créer d'utilisateur, d'entreprise ni de session, et `GET /v1/public/demo` répond `{ actif: false }`.
- Sur test.mobiiz.fr, `ACCES_DEMO` est encore allumé dans les réglages de l'hébergeur (non modifié : c'est une
  configuration). Comme `DEMO_PUBLIQUE` n'y est pas posé, le point d'entrée est fermé dès ce commit.

**Routes**

| Route | Fichier | État |
|---|---|---|
| `GET /v1/public/demo` | `apps/api/src/modules/acces-demo/http/acces-demo.controller.ts` | répond `actif: false` |
| `POST /v1/public/demo/session` | même fichier | fermée (404) sauf les deux réglages allumés |

**Fichiers qui en dépendent encore (seulement désactivés)**

- `apps/api/src/modules/acces-demo/` (service et contrôleur) : création du visiteur et de son espace.
- `apps/api/src/platform/demo-domaine.ts` : reconnaît un visiteur, liste les routes interdites en démonstration.
- `apps/api/src/platform/logging/request-context.ts`, `modules/identity/http/session.guard.ts` : marquent la requête d'un visiteur.
- `apps/api/src/platform/email/*.sender.ts`, `platform/ai/fabrique-ia.ts`, `modules/interpretation/interpretation.module.ts`,
  `modules/takeoff/takeoff.module.ts` : rien ne part et aucun appel IA pour un visiteur.
- `apps/api/src/platform/config/config.ts` : réglages `ACCES_DEMO` et `DEMO_PUBLIQUE`.
- `apps/web/src/components/acces-demo.tsx` : l'ancien bouton (plus utilisé par la page) et le bandeau « Mode démonstration ».
- `apps/web/src/components/app-shell.tsx` : affiche ce bandeau à un visiteur.

**Tests qui en dépendent**

- `apps/api/test/acces-demo.test.ts` : fermé par défaut, fermé même avec `ACCES_DEMO` allumé, puis le comportement interne
  (isolation, rien ne part, effacement après 24 h).
- `apps/web/e2e/acces-demo.spec.ts` : la session fictive, ouverte par son point d'entrée (allumé dans ces parcours seulement).
- `apps/web/playwright.config.ts` : `ACCES_DEMO` et `DEMO_PUBLIQUE` allumés pour ce seul parcours interne.
- `apps/api/test/isolation-toutes-routes.test.ts`, `emails-reels.test.ts` : citent le visiteur dans leurs contrôles.

**Données en base de test (lecture seule, 11 novembre 2026)**

- 16 comptes visiteurs (`visiteur-…@demo.mobiiz.fr`), le plus ancien créé ce jour à 12 h 03. Leur code les efface après
  24 h, mais seulement à l'arrivée d'un nouveau visiteur : le point d'entrée étant fermé, ils ne seront plus effacés
  tout seuls. Rien n'a été supprimé.
- Aucune table propre à la démonstration publique : un visiteur est un utilisateur et une entreprise ordinaires.

**Ce qui pourrait être supprimé plus tard, avec l'accord de Greg**

1. Le module `acces-demo`, ses deux routes et ses tests.
2. Le bouton `BoutonDecouvrir` et le bandeau dans `acces-demo.tsx`, puis leur appel dans `app-shell.tsx`.
3. Les réglages `ACCES_DEMO` et `DEMO_PUBLIQUE`, ici et chez l'hébergeur.
4. La liste des routes interdites en démonstration et le marquage de la requête, s'ils ne servent plus qu'au visiteur.
5. Les 16 comptes visiteurs de la base de test.

À vérifier avant : `estRequeteDemo` sert aussi à choisir la lecture simulée ; ne pas le retirer sans regarder le point 2.

## 2. Le chantier fictif d'un vrai compte (inchangé)

- Routes : `POST /v1/demo/project`, `POST /v1/demo/recipients/:id/quote` (`apps/api/src/modules/demo/`).
- Donnée : la colonne `project.demo` (33 chantiers dans la base de test).
- Écrans : `apps/web/src/components/demo.tsx`, `demo-guidee.tsx`, `menu-artisan.tsx` (« Essayer avec un chantier fictif »),
  `project-price-requests.tsx`, `lib/rubriques-profil.ts`.
- Lecture : `apps/api/src/modules/takeoff/infrastructure/fake-lecture-reader.ts` (aucun appel au modèle).
- Tests : `apps/api/test/demo.test.ts`, `billing.test.ts`, `next-actions.test.ts`, `compteur-landing.test.ts` ;
  `apps/web/e2e/parcours-artisan.spec.ts`, `responsive.spec.ts`.

## 3. Le jeu de démonstration de l'administration (inchangé)

- Routes : `POST /v1/admin/pilotage/demo/:geste`, `DELETE /v1/admin/pilotage/demo`, `POST` et `DELETE /v1/internal/demo/jeu`.
- Fichiers : `apps/api/src/modules/pilotage/application/demo.service.ts`, `modules/groupe/application/jeu-demonstration.service.ts`,
  `apps/web/src/app/(app)/admin/pilotage/page.tsx`.
- Tests : `apps/api/test/demo-admin.test.ts`, `groupe-jeu-demonstration.test.ts`, `pilotage.test.ts`.
