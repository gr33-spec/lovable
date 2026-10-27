# Conformité légale et RGPD — état au 26 octobre 2026

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

### Business model final du 25 octobre 2026

- **Commission** : sur un regroupement négocié, la commission (2 % par défaut, `COMMISSION_DEFAUT`) est intégrée au prix affiché à l'artisan, avec la mention « Commission Mobiiz incluse dans le prix » ; CGU (article 2) : « Mobiiz peut percevoir une commission du négoce sur les commandes groupées » ; conditions négoces, point « Regroupements négociés par Mobiiz » : commission convenue au moment de l'offre, jamais sans accord écrit. Aucune facturation automatique (`FACTURATION_NEGOCE=off`).
- **Apporteur d'affaires** : Mobiiz négocie et transmet la commande ; le contrat de vente reste entre l'artisan et le négoce (CGU article 4, conditions négoces « Ni vendeur ni acheteur »). Le statut d'apporteur d'affaires (contrat avec chaque négoce, facturation de la commission, TVA) est à valider par l'avocat avant la première commande groupée réelle (A-FAIRE-RELIRE 42).
- **Usage statistique anonymisé** des prix (observatoire) : clause dans les CGU et les conditions négoces ; table sans identifiant.
- Points à faire relire : A-FAIRE-RELIRE 42 à 46.

### Achat groupé automatique du 27 octobre 2026

- **Conditions** : CGU article 2 « Les achats groupés » (version 2026-10-27) ; conditions négoces, point « Achats groupés automatiques » (version 2026-10-27), acceptées par la case du lien de réponse avant toute offre (date gardée sur la consultation).
- **Anonymat** : un négoce ne reçoit que les noms de ses propres clients ; un artisan ne voit jamais le nom ni le prix d'un autre artisan ; total seulement à partir de 5 entreprises ; le nom du négoce de la meilleure offre seulement aux abonnés participants (choix 13 de Greg).
- **Argent** : paiement direct de l'artisan au négoce ; Mobiiz ne touche jamais l'argent ; facture de commission mensuelle préparée, envoi réel coupé (`envoiFacturesActif: false`).
- **Anti-fraude** : SIRET vérifié et code d'activité du bâtiment exigés, commerce de gros refusé, comptes à surveiller dans l'admin.
- **Registre** : traitement 20 (`RGPD-REGISTRE.md`).

## Reste à faire par Greg

### 1. Les infos du Kbis — fait le 26 octobre 2026

Capital 1 000 €, RCS Saint-Brieuc 910 796 325, directeur de la publication Grégory Roy (gérant), contact contact@mobiiz.fr, base de données Neon, LLC (groupe Databricks, Inc.), 160 Spear Street, Suite 1300, San Francisco, CA 94105. Plus aucun repère `[A COMPLETER]` : la garde de production passe (`GARDE_A_COMPLETER=stricte`). Le même bloc partout : mentions, confidentialité, pied des e-mails, landing, factures (`MENTIONS_EDITEUR`, `BLOC_LEGAL`).

### 2. Les contrats de sous-traitance (DPA)

- [ ] Vercel, [ ] Neon, [ ] Resend, [ ] Anthropic (conditions commerciales de l'API, sans entraînement) — détail dans `RGPD-SOUS-TRAITANTS.md`.

### 3. L'avocat

Relire `docs/A-FAIRE-RELIRE.md` : CGU, conditions négoces, confidentialité, clause concurrence, responsabilité, bons de commande 10 ans.

#### Passages à faire relire par l'avocat (version du 26 octobre 2026, points D de Greg)

| # | Où | Passage | Pourquoi le faire relire |
|---|---|---|---|
| AV1 | CGU, article 4 | « BATI INVEST est un intermédiaire : ni vendeur ni acheteur » ; commission du négoce comprise dans le prix affiché | Qualification (courtage, apporteur d'affaires, agent commercial ?) ; obligation d'information de l'artisan sur la commission (transparence, art. L. 441-1 et suivants du code de commerce) |
| AV2 | CGU, article 2, « L'adresse Mobiiz » | Adresse au nom de l'entreprise, envois « X via Mobiiz », réponses reçues par Mobiiz | Mandat d'envoi au nom de l'artisan ; secret des correspondances ; responsabilité en cas d'e-mail perdu |
| AV-AG1 | CGU, article 2, « Les achats groupés » | Le nom de la meilleure offre réservé aux abonnés ; commande ferme par « Commander » ; « Me désister » après la clôture | Information précontractuelle, égalité de traitement entre participants, portée d'un désistement |
| AV-AG2 | Conditions négoces, « Achats groupés automatiques » | Offre unique et ferme jusqu'à la date de commande, même si le volume final est un peu inférieur ; commission acceptée par case à cocher, 0 % au lancement | Validité d'une offre ferme sans volume garanti ; formation du contrat de commission par case à cocher ; facturation mensuelle |
| AV-AG3 | Demande au négoce | « De la part de vos clients X et Y, via Mobiiz », Reply-To vers l'adresse Mobiiz d'un client | Mandat donné par les artisans ; prospection B2B d'un négoce non inscrit |
| AV-AG4 | Anti-fraude | Refus des entreprises hors bâtiment (code NAF) | Refus de vente / accès au service entre professionnels |
| AV3 | CGU, article 5, « Les limites de la lecture automatique » | L'IA peut se tromper ; l'artisan valide la liste | Validité de la limitation de responsabilité entre professionnels ; règlement européen sur l'IA (transparence) |
| AV4 | CGU, article 3 | 49 € HT / mois, 348 € HT / an, essai, renouvellement annuel tacite avec rappel 30 jours, pas de rétractation | Reconduction tacite entre professionnels ; mentions obligatoires |
| AV5 | Conditions négoces, « Regroupements négociés par Mobiiz » | Commission de 1 à 2 % du HT livré, facturée par BATI INVEST après livraison, payable à 30 jours | Forme du contrat avec chaque négoce, facturation et TVA, pénalités de retard et indemnité de 40 € (mentions obligatoires sur facture) |
| AV6 | Conditions négoces, « Non-sollicitation » | 12 mois, limité au contournement d'une offre négociée | Proportionnalité ; compatibilité avec le droit de la concurrence (pas d'exclusivité déguisée) |
| AV7 | Confidentialité et registre | Durées : compte 3 ans après la dernière connexion, devis et e-mails durée du compte, journaux 1 an ; e-mails reçus (n° 18) | Base légale des e-mails reçus de tiers (négoces non clients) ; information des expéditeurs (phrase en pied d'e-mail) |
| AV8 | Observatoire (registre n° 19, CGU article 2, conditions négoces) | Statistiques publiées au-delà de `SEUIL_ANONYMAT` (5 entreprises ou 2 regroupements) | Anonymisation réelle au sens du RGPD (risque de réidentification dans un petit département) ; secret des affaires des négoces |
| AV9 | Pied de chaque e-mail | « Une réponse à cet e-mail peut être reçue par Mobiiz… » ; lien « Ne plus recevoir ces e-mails » | Suffisance de l'information ; e-mails non transactionnels (prospection B2B des négoces invités) |
| AV10 | Turnstile (Cloudflare) | Défi anti-robots, sans cookie publicitaire | Besoin ou non de consentement (traceur strictement nécessaire à la sécurité ?) |

