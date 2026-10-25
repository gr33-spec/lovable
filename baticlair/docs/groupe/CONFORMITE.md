# Conformité légale et RGPD — état au 24 octobre 2026

Branche `claude/saas-achat-artisans-prompt-1lyihx` (PR #284), puis `claude/integration-groupe`. Rien dans `main`.

## Fait (coché par le code et les tests)

- [x] **Suivi des demandes de prix** : « Demandes envoyées à N négoces de ton secteur », « Résultats le … à 18 h », compteur et barre en temps réel, une notification par jour au plus sans nom ni prix, bilan à l'échéance (0, 1, plusieurs, toutes), relance la veille, report automatique au cycle suivant, « ton négoce a répondu / pas encore », côté négoce « N négoces consultés », admin. Tests : `packages/domain/test/suivi-des-demandes.test.ts`, `apps/api/test/suivi-des-demandes.test.ts`, e2e « Suivi des demandes de prix ».
- [x] **Plus de 2 %** : formule unique « Aucun frais pour l'instant. BATI INVEST pourra introduire une commission ultérieurement, avec un préavis de 60 jours et l'accord du négoce. » ; facturation négoce derrière `FACTURATION_NEGOCE=off` (code gardé). Test : `apps/api/test/facturation-negoce-eteinte.test.ts`.
- [x] **Mentions légales** (LCEN) avec section Contact et délai d'un mois.
- [x] **CGU artisan** versionnées (2026-10-24) : pros à SIRET actif, service, sans engagement, ni vendeur ni acheteur, aucune garantie de prix, concurrence, documents déposés (anonymisation, garantie de droit de transmettre), responsabilité limitée, suspension, droit français, tribunal de commerce de Saint-Brieuc ; acceptation horodatée, réacceptation à chaque version majeure (bandeau « Nouvelles conditions »). Test : `apps/api/test/conditions-a-jour.test.ts`.
- [x] **Conditions négoces** versionnées (13 points), réacceptation au dépôt d'une grille après une version majeure (400 `conditions_requises`).
- [x] **Clause concurrence** : les prix d'un négoce ne sont jamais montrés à un autre. Test de fuite : `apps/api/test/concurrence-prix-negoces.test.ts`.
- [x] **Pied de page partout** : mentions, CGU, conditions négoces, confidentialité, contact.
- [x] **Confidentialité en tableau** : responsable, finalités, données, base légale, durée, destinataires, sous-traitants, transferts, cookies, droits, contact, CNIL.
- [x] **Registre** `docs/groupe/RGPD-REGISTRE.md` (durées de Greg, DPO et AIPD non obligatoires, raisonnement écrit).
- [x] **Sous-traitants** `docs/groupe/RGPD-SOUS-TRAITANTS.md`.
- [x] **Anonymisation des devis** avant stockage et avant l'IA ; nom de chantier = commune ; plus de PDF entier envoyé à l'IA. Tests : `packages/domain/test/anonymisation-devis.test.ts`, `apps/api/test/rgpd-droits.test.ts`.
- [x] **Cookies** : seulement les nécessaires, aucun script tiers. Test : `apps/web/scripts/sans-tiers.test.mjs`.
- [x] **Droits en libre-service** : export JSON et PDF (artisan, négoce), rectification, suppression avec archives sans nom (10 ans) et preuves (5 ans), « Ne plus recevoir ces e-mails » en un clic, « Ne plus jamais être contacté » côté négoce, liste d'exclusion respectée quand un autre artisan rajoute. Tests : `apps/api/test/rgpd-droits.test.ts`, e2e « RGPD ».
- [x] **E-mails d'invitation** : qui envoie (BATI INVEST), pourquoi (un artisan du secteur vous a ajouté), lien d'opposition. Les messages WhatsApp / SMS partent du téléphone de l'artisan.
- [x] **Purges quotidiennes** testées avec dates forcées (`purgerSelonLeRegistre`).
- [x] **Procédure de violation** dans `docs/SECURITE.md` (CNIL 72 h, modèle de message, journal).
- [x] **Garde `[A COMPLETER]`** : la construction de production échoue tant qu'un repère reste (`apps/web/scripts/garde-a-completer.mjs`, test `garde-a-completer.test.mjs`).

### Recentrage du 25 octobre 2026

- [x] Regroupements anonymes : aucun nom d'artisan ni de négoce entre eux ; sous `SEUIL_ANONYMAT` (5) entreprises, seulement « Regroupement en cours » ; au-dessus, « 5+ entreprises » et le département, jamais une commune (`phraseParticipants`, test `apps/api/test/regroupements-recentrage.test.ts`).
- [x] Aucune messagerie entre artisans.
- [x] Un négoce consulté voit le volume et la zone, jamais un nom ; il peut refuser une consultation (« Je ne chiffre pas ») ; ses prix ne sont jamais vus d'un autre négoce, ni alignés automatiquement.
- [x] Demande perso : l'identité de l'artisan n'est transmise qu'avec son accord, daté (`accordIdentiteLe`) ; le lien de chiffrage est un jeton aléatoire stocké haché (`tokenHash`).
- [x] « Mes prix » : seulement les prix de l'artisan lui-même (test « Mes prix ne montre que ses propres prix »).
- [x] Aucune promesse d'économie chiffrée sur la landing, /tarifs ni la démo.

## Reste à faire par Greg

### 1. Les infos du Kbis (5 repères `[A COMPLETER]`, dans `apps/web/src/lib/legal.ts`)

| Repère | Où | Quoi |
|---|---|---|
| `EDITEUR.capital` | mentions légales | Capital social de BATI INVEST (€) |
| `EDITEUR.rcs` | mentions légales | Ville du RCS (Saint-Brieuc ?) |
| `EDITEUR.directeurPublication` | mentions légales | Nom du directeur de la publication |
| `EDITEUR.contact` | mentions, confidentialité, registre | Adresse e-mail de contact et des demandes RGPD |
| `HEBERGEUR_BASE.adresse` | mentions légales | Adresse légale de Neon Inc. (dans son DPA) |

Tant qu'un repère reste, `VERCEL_ENV=production` refuse la construction : rien ne part en production avec un repère.

### 2. Les contrats de sous-traitance (DPA)

- [ ] Vercel, [ ] Neon, [ ] Resend, [ ] Anthropic (conditions commerciales de l'API, sans entraînement) — détail dans `RGPD-SOUS-TRAITANTS.md`.

### 3. L'avocat

Relire `docs/A-FAIRE-RELIRE.md` : CGU, conditions négoces, confidentialité, clause concurrence, responsabilité, bons de commande 10 ans.
