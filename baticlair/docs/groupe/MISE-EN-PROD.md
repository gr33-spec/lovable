# BatiClair Groupé : checklist de mise en production

Plan du 20 octobre 2026, bloc 11. À dérouler dans l'ordre, le jour J, par Greg. Rien de tout cela n'est fait sans son accord.

## 0. Go prod : à faire AVANT toute mise en production (Greg, 25 octobre 2026)

- [ ] **Vercel Pro** sur l'équipe gr33-spec : obligatoire pour un usage commercial. Remettre alors la clôture de la commande du mois à l'heure (tâches planifiées horaires au lieu d'une fois par jour, `vercel.json` de l'API ; en test la clôture se fait vers 11 h UTC).
- [ ] **Supprimer l'admin de test** `delivered+admin-recette@resend.dev` de `GROUPE_ADMINS` (projet baticlair-api, Preview, branche `claude/saas-achat-artisans-prompt-1lyihx`) : il n'a été ajouté que pour la recette en ligne du cycle complet. Il n'est pas, et ne doit jamais être, dans la variable de Production : vérifier que celle-ci ne contient que l'adresse de Greg.
- [ ] Clés Stripe **live** (accord de Greg) et prix live créés par `apps/api/scripts/stripe-creer-prix.mjs --reel`.
- [ ] `BATICLAIR_ANTHROPIC_KEY` : cochée Production et Preview depuis le 25 octobre ; l'ancienne `ANTHROPIC_API_KEY` (refusée par Anthropic) peut être supprimée.
- [ ] Renvoi de bonjour@mobiiz.fr vers la boîte de Greg (Forward Email, gratuit, DNS seulement) : vérifier qu'il marche encore, et passer au besoin à une vraie boîte.

## 1. Avant de fusionner

- [ ] PR #284 relue, verte (CI), Claude Approvals passée.
- [ ] PR #285 (pages légales, basée sur #284) relue : fusionner dans #284 ou juste après. Les textes ont été relus par un avocat (CGU, conditions négoce, confidentialité, contrat d'apporteur d'affaires).
- [ ] PR #286 (landing), #287 (PWA) : indépendantes, fusionnables avant ou après.
- [ ] `docs/DECISIONS.md` relu : chaque décision prise seule est confirmée ou renversée.
- [ ] `docs/A-FAIRE-RELIRE.md` traité avec l'avocat (19 points), et la rémunération tranchée : contrat PDF, page de dépôt et conditions négoce alignés (dette n° 23).
- [ ] Indexation : retirer `X-Robots-Tag: noindex` pour la landing et les pages légales dans `apps/web/next.config.ts` (dette n° 26), le garder pour l'app.
- [ ] Mentions légales : e-mail de contact, directeur de la publication, capital et RCS de BATI INVEST renseignés (`apps/web/src/lib/legal.ts`).

## 2. Variables Vercel, projet API, environnement Production

| Variable | Valeur | Pourquoi |
|---|---|---|
| `GROUPE` | `on` | Allume le groupé (routes, onglet, tâche). Éteint : tout répond 404, l'onglet disparaît. |
| `GROUPE_DEPARTEMENTS` | `22` | Première ouverture : les Côtes-d'Armor seules. Les autres voient « pas encore ouvert dans ton département ». Élargir ensuite (`22,29,35,56`), ou `*`. |
| `GROUPE_ADMINS` | l'e-mail de Greg | L'admin du groupé (`/admin/groupe`). À défaut : `REFERENTIAL_VALIDATORS`. |
| `SIRET_VERIFICATION` | `insee` (ou absent) | Seule valeur admise en production ; `forme` est refusé au démarrage. |
| `INSEE_API_KEY` | la clé d'intégration Sirene | Vérification du SIRET avant tout accès, et base négoces (`SIRENE_DEPARTEMENTS`, `SIRENE_NAF` par défaut : 22/29/35/56, 46.73A/B 47.52A/B). |
| `EMAIL_PROVIDER` / `RESEND_API_KEY` / `EMAIL_DOMAINE` / `EMAIL_EXPEDITEUR` (prévisualisation : `EMAILS_AUTORISES`, `EMAIL_REDIRECTION`) | Resend, voir `EMAILS.md` | Demandes aux négoces, bons de commande, factures, relances. |
| `REPONSES_DOMAINE` | le domaine de réception (`reponses.baticlair.fr`) | Adresse `Reply-To` `lot-<n°>@…` ; à configurer chez Resend en réception (« Receiving »), MX posés. |
| `RESEND_WEBHOOK_SECRET` | `whsec_…` du webhook `email.received` → `POST /v1/webhooks/resend` | Sans lui, le webhook est fermé (une réponse par e-mail n'est pas traitée, le négoce garde son lien). |
| `FACTURE_EMETTEUR_NOM` | `BATI INVEST` | Facture de commission. |
| `FACTURE_EMETTEUR_FORME` | `SARL` | |
| `FACTURE_EMETTEUR_SIRET` | `910 796 325 00017` | |
| `FACTURE_EMETTEUR_ADRESSE` | `6 impasse du Ouipoure, 22620 Ploubazlanec` | |
| `FACTURE_EMETTEUR_TVA` | `FR61910796325` | |
| `FACTURE_TVA_POURCENT` | `20` | Assujettie. |
| `CRON_SECRET` | à régénérer (32 octets aléatoires) | Tâches `regrouper` (6 h UTC chaque jour), `sirene` (5 h UTC chaque jour, page par page, un cycle complet par mois) et `rapport-mensuel` (le 1er du mois, 7 h UTC : l'e-mail « ce mois : X chantiers lus, Y € économisés, Z lots » à chaque artisan) ; Vercel l'envoie en `Bearer`. |
| `WEB_APP_URL` | `https://app.baticlair.fr` (ou l'adresse du site) | Liens des e-mails, CORS. |
| `AUTH_SECRET` | inchangé | Signe aussi les liens « pas concerné » / « stop » (expirent après 180 jours). |

Projet web : rien de nouveau (`API_URL` déjà posé).

## 3. Migrations

`vercel-build` lance `prisma migrate deploy` : les migrations du groupé s'appliquent au premier déploiement de production :

1. `20261019210000_groupe_donnees` (12 tables),
2. `20261020180000_groupe_desistements`,
3. `20261020190000_groupe_notifications`,
4. `20261020200000_groupe_accords_factures` (tolérante : `IF NOT EXISTS`),
5. `20261020210000_groupe_negoces_sirene`,
6. `20261020230000_parametre_groupe`,
7. `20261020220000_cgu` (PR #285).

- [ ] Sauvegarde Neon (branche ou snapshot) juste avant le déploiement.
- [ ] Après déploiement : `GET /v1/health` → `db: ok`, `features.groupe: true`.

## 4. Ordre de fusion et de déploiement

1. Fusionner #284 (groupé) → déploiement de production, `GROUPE=on`, `GROUPE_DEPARTEMENTS=22`.
2. Fusionner #285 (pages légales) → la case CGU apparaît à l'inscription.
3. Fusionner #286 (landing) et #287 (PWA).
4. Lancer `GET /v1/internal/groupe/sirene` avec le `CRON_SECRET` jusqu'à `cycleTermine: true` (ou laisser la tâche quotidienne faire) : la base négoces se remplit.

## 4 bis. Voir l'admin et « Mes lots » remplis sur la prévisualisation (jeu de démonstration)

Jamais en production (la route y répond 403). Sur l'API de prévisualisation, avec le `CRON_SECRET` de la prévisualisation et l'e-mail du compte de Greg :

```
curl -X POST "https://baticlair-api-git-<branche>-gr33-spec.vercel.app/v1/internal/demo/jeu?entreprise=<e-mail de Greg>" -H "Authorization: Bearer $CRON_SECRET"
```

Crée 12 artisans du 22, 8 négoces, 3 lots (en cours, décidé, livré) et met l'entreprise de Greg dans chacun ; rejouable (l'ancien jeu est effacé d'abord). `curl -X DELETE …/v1/internal/demo/jeu` l'efface.

## 5. Premier lot de test (avec l'adresse de Greg comme négoce)

- [ ] Compte artisan A (SIRET réel, 22) : un chantier, une ligne proposée en « Chantier signé ».
- [ ] Compte artisan B (autre SIRET, 22) : même référence, « Chantier signé » → le lot se forme (seuil : 2 artisans).
- [ ] Dans « Mes négoces » de A : un négoce avec l'adresse e-mail de Greg, famille couverture.
- [ ] L'e-mail « Regroupement artisans » arrive chez Greg : phrase de commission en gras, PDF, lien de dépôt, `Reply-To lot-<n°>@…`.
- [ ] Répondre à l'e-mail (sans rien déposer) : le webhook renvoie un lien neuf, le journal du lot (admin) note `reponse_par_email`.
- [ ] Ouvrir le lien, cocher la case, déposer un devis PDF : « Devis reçu, merci. » ; l'admin voit la réponse (prix lu ou « à vérifier »).
- [ ] Forcer le choix depuis l'admin si on ne veut pas attendre 7 jours (« Forcer » n'existe que pour un lot ouvert ; un lot envoyé se décide quand tous ont répondu ou au cron à J+7).
- [ ] Bons de commande reçus par Greg (négoce) et par A et B (artisans) ; facture de commission n° 1 émise (CSV admin).
- [ ] A dit « Livré » ; le compteur « Économisé grâce au groupé » bouge si un prix de référence a été donné.
- [ ] Vérifier dans l'admin : journal complet, facture « payée » à la main.

## 6. Retour arrière

- `GROUPE=off` (redéploiement) : toutes les routes du groupé répondent 404, l'onglet et le bloc « Proposer au groupé » disparaissent, la tâche planifiée ne fait rien. Les tables restent (aucune donnée perdue), rien n'est envoyé.
- `GROUPE_DEPARTEMENTS=` (vide) ferme tous les départements sans éteindre l'admin.
- Les migrations ne se défont pas : elles n'ont touché aucune table existante (seulement `company.siretVerifieLe`, `livraison`, `user.cgu*`), le reste de l'app ne dépend pas d'elles.
- En cas de doute sur un lot : « Clore le lot » ou « Annuler » depuis l'admin ; les besoins annulés redeviennent libres.

## 7. Après le premier lot réel

- [ ] Faire tourner `CRON_SECRET` et `RESEND_WEBHOOK_SECRET` (ils ont servi aux tests).
- [ ] Vérifier qu'une alerte 5xx arrive (`ALERT_*`).
- [ ] Relire `docs/SECURITE.md` (dette : CSP avec nonce, limite sur `/v1/health`).
