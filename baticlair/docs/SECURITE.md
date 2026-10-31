# Sécurité et robustesse de BatiClair

Audit du 20 octobre 2026 (plan, bloc 8), branche `claude/securite`. Ce qui tient, ce qui a été corrigé, ce qui reste.

## Ce qui tient

| Point | Où | Vérifié par |
|---|---|---|
| Sessions : cookies HttpOnly, `__Secure-` en ligne, better-auth, limite de débit sur connexion / inscription / mot de passe oublié | `apps/api/src/modules/identity/infrastructure/auth.ts` | `identity.test.ts` |
| Isolation : chaque route répond 404 pour les objets d'une autre entreprise (ids de chantier, devis, besoin, négoce, offre, bon, lot, facture) | tous les contrôleurs | `isolation-toutes-routes.test.ts` |
| Origines : CORS limité à `WEB_APP_URL` ; en prévisualisation, seules les adresses `*-gr33-spec.vercel.app` ; une origine inconnue n'obtient aucun en-tête CORS | `platform/config/config.ts` (`originesAcceptees`), `app.ts` | `securite.test.ts`, `platform.test.ts` |
| En-têtes : helmet sur l'API ; sur le site `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS, `Permissions-Policy`, et depuis cet audit une `Content-Security-Policy` | `app.ts`, `apps/web/next.config.ts` | `securite.test.ts`, e2e |
| Routes publiques limitées en débit : page et dépôt d'un négoce (`/v1/reponse/:jeton`, 120 et 30 par heure), liens « pas concerné » / « stop » (60 par heure), webhook Resend (600 par heure), export RGPD (5 par heure), et depuis cet audit les tâches internes (60 par heure) | `@Throttle(HOURLY(n))` dans chaque contrôleur | lecture du code |
| Webhook Resend : signature Svix obligatoire (`RESEND_WEBHOOK_SECRET`), horodatage à ± 5 minutes (pas de rejeu), corps brut vérifié ; sans secret, le webhook est fermé | `webhook-resend.controller.ts` | `groupe-notifications.test.ts` |
| Jetons de réponse des négoces : 24 octets aléatoires, gardés hachés (SHA-256), régénérés à chaque réponse par e-mail, inutiles dès que le lot n'est plus « envoyé » | `demande.service.ts` | `groupe-demande.test.ts`, `groupe-notifications.test.ts` |
| Liens d'e-mail « pas concerné » / « stop » : signés (HMAC du secret de l'application), confirmés sur une page (jamais appliqués au simple chargement), et depuis cet audit **expirent après 180 jours** ; un lien sans date est refusé | `lien-negoce.ts` | `securite.test.ts`, `groupe-negoces.test.ts` |
| Espace négoce (23 octobre) : jetons signés (HMAC du secret de l'application) à durée bornée, invitation 90 jours, lien de connexion 30 minutes, session 30 jours en cookie `bc_negoce` HttpOnly, SameSite=Lax, `Secure` en ligne, désabonnement 180 jours ; la demande de lien de connexion répond pareil, adresse connue ou non ; routes limitées en débit | `jetons-negoce.ts`, `espace-negoce.controller.ts` | `espace-negoce.test.ts`, `isolation-toutes-routes.test.ts` |
| Confidentialité des artisans envers les négoces : avant une commande, la page de grille et l'espace du négoce ne portent ni nom, ni téléphone, ni adresse exacte d'artisan (zones en communes) ; le bon ne part qu'au négoce choisi, après confirmation ; un négoce non retenu ne voit rien des autres | `commande-du-mois.service.ts` (`pageGrille`, `commander`), `espace-negoce.service.ts` (`compte`) | `negoce-confidentialite.test.ts` (test de fuite), e2e « un cycle complet » |
| Tâches planifiées : `CRON_SECRET` obligatoire (`Bearer`), fermées sans secret ; la date forcée (`?maintenant=`) n'existe qu'en `NODE_ENV=test` | `regroupement.controller.ts`, `sirene.controller.ts`, `retention.controller.ts` | `securite.test.ts` |
| Boîte aux lettres de test (`/v1/internal/test/emails`) : n'existe qu'en `NODE_ENV=test` | `test-mailbox.controller.ts` | lecture du code |
| Journaux : mots de passe, cookies, `authorization`, jetons, clés d'API, secrets et signatures masqués (pino `redact`) | `platform/logging/logger.ts` | lecture du code |
| Fichiers : PDF seulement (type et taille vérifiés, 15 Mo, deux au plus pour un négoce), corps JSON limité à 1 Mo | `reponse.controller.ts`, `app.ts` | `groupe-demande.test.ts` |
| Secrets : jamais dans le dépôt ; variables Vercel ; les tests utilisent des valeurs factices | `.env.example`, `playwright.config.ts` | — |
| SIRET : vérifié à l'INSEE avant tout accès au groupé ; le repli « bien formé = vérifié » (`SIRET_VERIFICATION=forme`) est refusé en production par la configuration | `config.ts`, `siret-verifier.ts` | `platform.test.ts` |

## Corrigé par cet audit

1. **Expiration des liens d'e-mail** (« pas concerné », « stop ») : 180 jours, un lien sans date ne vaut rien.
2. **Limite de débit sur les tâches internes** (`purge-inactive`, `groupe/regrouper`, `groupe/sirene`) : 60 par heure, en plus du secret.
3. **Journaux** : `apiKey`, `secret`, `jeton`, l'en-tête INSEE et la signature Svix masqués.
4. **Content-Security-Policy** sur le site : rien ne se charge d'ailleurs (`default-src 'self'`, `frame-ancestors 'none'`, `blob:` pour les PDF ouverts dans la page et les photos avant envoi). Scripts et styles en ligne restent autorisés (`'unsafe-inline'`) : Next ne pose pas de nonce sur les pages rendues à l'avance ; le passage à un nonce est en dette.
5. **Test permanent** `securite.test.ts` : origine inconnue, prévisualisation, tâches internes, en-têtes, expiration des liens.

## Dépendances (`pnpm audit`, 20 octobre 2026)

| Gravité | Paquet | Chemin | Exposition | Décision |
|---|---|---|---|---|
| haute | `deepmerge-ts` < 8 | `prisma` → `@prisma/config` | outil de développement (CLI Prisma), jamais exécuté en ligne | attendre la version de Prisma qui le corrige |
| haute, modérée | `mysql2` ≤ 3.23.0 | `prisma` | pilote MySQL embarqué par la CLI, BatiClair n'utilise que PostgreSQL | idem |
| haute | `braces` ≤ 3.0.3 | `eslint-config-next` → `fast-glob` | lint, développement seulement ; aucune version corrigée publiée | surveiller |
| haute | `source-map-js` < 1.2.2 | `vitest` → `vite` → `postcss` | tests, développement seulement | mettre à jour vitest/vite à la prochaine montée de version |

Aucune de ces failles n'est atteignable depuis l'application en ligne : toutes vivent dans des outils de développement. À revoir à chaque montée de version (`pnpm audit`).

## Ce qui reste (dette, par ordre de risque)

1. **CSP avec nonce** (retirer `'unsafe-inline'` pour les scripts) : demande le rendu dynamique de toutes les pages ou un `proxy.ts` qui pose le nonce ; à faire quand la landing et les pages légales sont fusionnées.
2. **`/v1/health` sans limite de débit** : lu à chaque chargement de page, la limite par adresse gênerait un atelier derrière une seule IP ; la réponse est légère et sans donnée. À limiter si un abus apparaît.
3. **Rejeu d'un jeton de réponse de négoce** : le lien reste valable tant que le lot est « envoyé » (7 jours au plus) ; une expiration propre par lien (au-delà du lot) serait plus stricte.
4. **Deux secrets sur le même poste de Greg** (`CRON_SECRET`, `RESEND_WEBHOOK_SECRET`) : les faire tourner à la mise en production, les noter dans `docs/groupe/MISE-EN-PROD.md`.
5. **Alerte sur erreur 5xx** : `ALERT_*` existe ; vérifier en production qu'un webhook ou un e-mail d'alerte est bien configuré.

## Procédure en cas de violation de données (RGPD, articles 33 et 34)

Mise en place le 24 octobre 2026. Référent : Greg.

1. **Constater et contenir** (heure 0) : couper l'accès en cause (faire tourner `AUTH_SECRET`, `CRON_SECRET`, la clé Neon, la clé Resend ou `BATICLAIR_ANTHROPIC_KEY` selon le cas ; révoquer les clés partenaires) ; garder les journaux (Vercel, Neon, Resend) sans les effacer.
2. **Évaluer** : quelles données (comptes, listes, prix des négoces, coordonnées), combien de personnes, quel risque (usurpation, prix d'un négoce révélé à un concurrent, hameçonnage).
3. **Notifier la CNIL sous 72 heures** après en avoir eu connaissance, sauf risque improbable : téléservice https://notifications.cnil.fr/notifications/index. Si tout n'est pas connu, notifier quand même et compléter ensuite.
4. **Prévenir les personnes** sans délai si le risque est élevé (mots de passe, coordonnées, prix), par e-mail, avec le modèle ci-dessous.
5. **Consigner** chaque violation, même non notifiée : date, faits, effets, mesures, dans le tableau ci-dessous.

### Modèle de message aux personnes

> Objet : Incident de sécurité sur BatiClair
>
> Bonjour,
>
> Le [date], nous avons constaté [ce qui s'est passé, en une phrase]. Les données concernées sont : [liste]. Elles ont pu être [consultées / copiées / modifiées] par [qui, si connu].
>
> Ce que nous avons fait : [mesures]. Ce que nous vous conseillons : [changer votre mot de passe BatiClair et partout où vous utilisiez le même ; vous méfier des e-mails qui demandent un paiement ou un mot de passe].
>
> Nous avons prévenu la CNIL le [date]. Pour toute question : [contact].
>
> Greg, BATI INVEST (BatiClair)

### Journal des violations

| Date | Faits | Données, personnes | Notifiée CNIL | Personnes prévenues | Mesures |
|---|---|---|---|---|---|
| — | Aucune à ce jour | — | — | — | — |

### Ce qui limite l'effet d'une violation

Mots de passe hachés (better-auth) ; devis anonymisés avant stockage ; fichier d'origine effacé après 30 jours ; liste d'exclusion en empreintes ; preuves d'acceptation en empreintes ; jetons des e-mails signés et à durée bornée ; isolation par entreprise testée route par route.

## Le tableau de bord admin (24 octobre 2026)

- **Qui** : les seuls e-mails de `GROUPE_ADMINS` (Vercel, projet `baticlair-api`). Un autre compte reçoit 403 sur toutes les routes `/v1/admin/pilotage/*`.
- **Double authentification** : après le mot de passe, un code à 6 chiffres envoyé par e-mail (`POST /v1/admin/pilotage/code`), valable 10 minutes, 5 essais, haché en base (`code_admin`, empreinte SHA-256 avec `AUTH_SECRET`) ; il ouvre le pilotage pour **cette session seulement**, 12 heures. Une autre connexion (autre appareil) redemande un code. Limité à 20 envois et 30 vérifications par heure.
- **Journal** : chaque envoi, code juste ou faux, ouverture du tableau, ouverture d'un détail nominatif, réglage et décision est écrit dans `journal_admin` (qui, quoi, quand), visible en bas du tableau.
- **Agrégé par défaut** : le tableau ne contient aucun nom d'entreprise ni e-mail (test `apps/api/test/pilotage.test.ts`). Le détail (artisans à risque, essais qui finissent, paiements refusés) s'ouvre sur un clic, il est journalisé, montré à l'écran seulement : **aucun export nominatif**.
- **Comptages sans cookie** : les visites de la page publique sont comptées par le serveur du site (un nombre par jour, `compteur_jour`) ; les installations sur l'écran d'accueil, une fois par appareil. Aucune adresse IP, aucun identifiant.
- **Faux comptes** : les comptes `@demo.baticlair.fr` (démonstration et jeu de test) sont exclus de tous les chiffres.
- À venir si un second admin arrive : un code par application d'authentification (TOTP) au lieu de l'e-mail (DETTE 31).


## Audit du 26 octobre 2026 : « je dois être le seul à pouvoir entrer dans l'admin »

### Corrigé (critique)

- **Toutes les routes d'admin demandent le code à 6 chiffres de la session**, pas seulement le pilotage : `/v1/admin/groupe/*` et `/v1/admin/commande-du-mois/*` passent par `exigerDeuxFacteurs` (`apps/api/src/platform/http/deux-facteurs.ts`). Avant, la liste blanche suffisait.
- **Session admin : 2 heures au plus, fermée après 30 minutes sans action** (`VALIDITE_SESSION_ADMIN_MS`, `INACTIVITE_ADMIN_MS`, colonne `code_admin.derniereActiviteLe`). Avant : 12 heures, sans inactivité.
- **5 codes faux en 30 minutes : bloqué 30 minutes**, même en redemandant un code, avec un e-mail d'alerte à l'admin (`code_bloque`, `bloque_30_minutes` au journal). Avant, un nouveau code remettait le compteur à zéro.
- **Un e-mail à chaque entrée réussie** dans l'espace admin (date, heure, adresse IP).
- **Le journal note l'adresse IP** de chaque action admin (`journal_admin.ip`).
- **La liste blanche est `GROUPE_ADMINS` seule** : elle ne reprend plus `REFERENTIAL_VALIDATORS` quand elle est vide.
- **Dépendances** : `multer` 2.5.0 et `body-parser` 2.4.0 (failles « haute » corrigées, aucune nouvelle dépendance).

Test permanent : `apps/api/test/admin-securite.test.ts` (routes, liste blanche, e-mail d'entrée, IP, blocage, session de 2 h et 30 min).

### Choix gardé

- Le rôle admin n'est jamais donné depuis l'interface : il vient de la variable `GROUPE_ADMINS` sur Vercel, que seul le titulaire du compte Vercel peut changer. Le code par e-mail prouve en plus que la personne a la boîte.

### En attente de l'accord de Greg (important) — feu vert le 26 octobre 2026, voir plus bas

- Vérification des mots de passe fuités (Have I Been Pwned, k-anonymat, gratuit) ; limite par compte en plus de la limite par IP.
- Antivirus des fichiers reçus et anti-robot sur l'inscription (service externe, ex. Cloudflare Turnstile gratuit).
- Sauvegarde quotidienne de la base avec test de restauration (plan Neon à vérifier).
- CSP sans `unsafe-inline` (nonce), failles « haute » restantes dans les outils de développement seulement (`vite`, `deepmerge-ts`, `zod` via la CLI Vercel).

## Suite sécurité du 26 octobre 2026 (feu vert de Greg)

- **Mots de passe fuités** : à l'inscription, au changement et à la réinitialisation, un mot de passe présent dans Have I Been Pwned est refusé (« Ce mot de passe a déjà fuité sur Internet. Choisis-en un autre. »). Seuls les 5 premiers caractères de l'empreinte SHA-1 partent (k-anonymat). Module `haveIBeenPwned` de better-auth (déjà installé, aucune dépendance ajoutée), `MOTS_DE_PASSE_FUITES` (en ligne : oui par défaut). Test `apps/api/test/mots-de-passe-fuites.test.ts`.
- **Turnstile (Cloudflare, gratuit)** : défi anti-robots sur l'inscription, le mot de passe oublié, l'inscription négoce et la demande de lien de connexion négoce ; jeton vérifié côté API (`x-captcha-response`, module `captcha` de better-auth et `platform/http/turnstile.ts`), refus si Cloudflare ne répond pas. **Inactif tant que Greg n'a pas créé le site Turnstile** et posé `TURNSTILE_SECRET_KEY` (API) et `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (site) dans Vercel. Le script de Cloudflare est le seul script extérieur, chargé seulement sur ces pages et seulement avec la clé (test `sans-tiers.test.mjs`). Test `apps/api/test/turnstile.test.ts`.
- **CSP par nonce** : chaque page reçoit un nonce neuf (`src/proxy.ts`, `src/lib/csp.ts`) ; `script-src 'self' 'nonce-…' 'strict-dynamic'`, plus de `'unsafe-inline'` pour les scripts. Les pages sont rendues à la demande (`connection()` dans `app/layout.tsx`). Les styles en ligne restent permis (attributs `style` de React). Vérifié dans Chromium : 0 erreur CSP sur /, /connexion, /inscription, /mentions-legales, /tarifs.
- **Sauvegardes** : le projet Neon `baticlair-db` (Francfort) est sur le **plan gratuit : 6 heures d'historique seulement, aucune sauvegarde quotidienne**. Ajouté sans frais : `.github/workflows/sauvegarde-base.yml`, export complet chaque nuit (pg_dump), chiffré AES-256, gardé 30 jours. Il ne tourne qu'après (1) la fusion dans `main` (un horaire GitHub ne part que de la branche par défaut) et (2) les secrets `SAUVEGARDE_DATABASE_URL` (rôle en lecture seule) et `SAUVEGARDE_CLE` posés par Greg. Autre voie, payante (accord de Greg) : plan Neon Launch, 7 jours d'historique.
- **Restauration** : télécharger l'artefact, `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in base-AAAA-MM-JJ.dump.enc -out base.dump -pass pass:<clé>`, puis `pg_restore --no-owner -d <base vide> base.dump`. À tester une fois par trimestre sur une branche Neon.
- **Boîte de contact** : MX de mobiiz.fr chez Resend ; le webhook est signé (Svix) et vérifié ; le renvoi à l'admin garde « Répondre » vers l'expéditeur, jamais de boucle (`contact-entrant.ts`).


## Revue, lot B (26 octobre 2026) : garde-fou et retour arrière

### Avant le lot : la copie complète de la base de test

- Copie prise le 26 octobre 2026 à 22 h 15 (UTC), avant tout changement du lot B : branche Neon
  `sauvegarde-test-2026-10-26-avant-lot-b` (`br-snowy-dew-b28tvroy`), copie entière de la branche de test
  `preview/claude/saas-achat-artisans-prompt-1lyihx` (point LSN `0/4A6A988`). Projet Neon gratuit, aucune dépense.
- La copie ne bouge plus : aucune application n'y écrit, elle n'a pas de point d'accès ouvert.
- La production (branche `main`) n'est pas touchée par le lot B. Elle a sa propre copie, `sauvegarde-prod-2026-10-24`.

### Retour arrière, dans cet ordre

1. **Fichiers chiffrés d'abord.** Si `CHIFFREMENT_CLE` a déjà servi, les fichiers déposés depuis portent l'en-tête `MZC1`
   et l'ancien code ne sait pas les lire. On les remet en clair avec la clé encore posée :
   `pnpm --filter @baticlair/api exec tsx scripts/fichiers-chiffrement.ts dechiffrer` (base de la branche visée dans
   `DATABASE_URL`). Le script dit combien de fichiers il a remis en clair et s'arrête s'il en reste un illisible.
2. **Le code.** `git revert <commit du lot B>` sur la branche `claude/saas-achat-artisans-prompt-1lyihx`, puis push :
   Vercel redéploie test.mobiiz.fr seul. Rien à faire côté production, qui n'a pas reçu le lot.
3. **La clé.** Retirer `CHIFFREMENT_CLE` de Vercel (projet baticlair-api, Preview) seulement après l'étape 1, et la garder
   en lieu sûr : un fichier chiffré resté quelque part ne se relit qu'avec elle.
4. **Les données, en dernier recours** (seulement si l'étape 1 échoue ou si des données sont abîmées) : dans la console Neon,
   Branches, `preview/claude/saas-achat-artisans-prompt-1lyihx`, « Restore », source `sauvegarde-test-2026-10-26-avant-lot-b`.
   Neon garde l'état d'avant la restauration dans une branche à part : la restauration se défait elle aussi. Tout ce qui a été
   saisi sur test.mobiiz.fr depuis le 26 octobre 22 h 15 est alors perdu (base de test, pas de client réel).
5. **Vérifier** : la recette en ligne artisan + négoce + chasseur (`docs/groupe/recette-en-ligne/recette.mjs`) passe, et un
   devis déposé avant le lot s'ouvre toujours.
