# Sécurité, sauvegardes et coûts : audit du 27 novembre 2026

Audit seul : RIEN n'est corrigé, rien n'est changé en ligne, aucun forfait touché. Les corrections attendent l'accord de Greg.

Sources :
- trois audits (serveur, secrets et accès, saboteur sur « Répondre ») ;
- les tests lancés le 27 novembre ;
- les pages publiques de Vercel, Neon, Resend et Stripe, consultées ce jour.

Les prix sont à revérifier au moment de payer.

## 1. Cartographie

| Service | Offre aujourd'hui | Ce qui compte | Double authentification |
|---|---|---|---|
| GitHub `gr33-spec/lovable` | Gratuit, **dépôt PUBLIC** | Code, docs et historique lisibles par tous. Branche par défaut : `claude/baticlaire-full-build-e5iq2s` (vieille, sans Mobiiz). | Oui (appli ou clé) : à activer. |
| Vercel (équipe gr33-spec) | **Hobby, gratuit** | Deux projets (site, API), région Francfort, 12 tâches planifiées par jour. Un second compte `greg-2412` reste branché (neutralisé en partie). | Oui : à activer. |
| Neon `baticlair-db` | **Gratuit** | 0,5 Go, **6 h d'historique**. Branche `main` = production (vide d'usage), une copie par prévisualisation, plafond de points d'accès déjà atteint. | Oui (via le compte de connexion) : à activer. |
| Vercel Blob `mobiiz-photos-test` | Hobby, gratuit (1 Go) | Photos « Mon site », publiques par nature. **Aucune copie.** | Celle de Vercel. |
| Anthropic | Paiement à l'usage | Clé `BATICLAIR_ANTHROPIC_KEY`, **la même pour le test et la prod**. | Oui : à activer, plafond de dépense mensuel à poser dans la console. |
| Resend | Gratuit | 3 000 e-mails par mois, **100 par jour** (les e-mails reçus comptent aussi). | Oui : à activer. |
| Stripe « Mobiiz » | Mode test | Clés live pas créées. | Obligatoire chez Stripe. |
| Cloudflare (DNS, Turnstile) | Gratuit | Turnstile pas posé : aucun anti-robot. | Oui : à activer. |

## 2. Vercel : la suspension de cette semaine

- **Cause probable : une limite mensuelle de l'offre gratuite dépassée.** Hobby met tout le compte en pause dès qu'une limite gratuite est dépassée (page « 503 DEPLOYMENT_PAUSED »). En général, il faut attendre 30 jours ou passer en Pro. Un seul déblocage gratuit est accordé.
- **Limites les plus serrées :** 4 h de calcul actif par mois et 10 Go de « Fast Origin Transfer ».
- **Suspects :**
  - la fabrication des photos en AVIF + WebP en 3 tailles (très gourmande en calcul) ;
  - les lectures de devis ;
  - les écrans qui relisent l'état chaque seconde ;
  - les recettes en ligne ;
  - 12 tâches planifiées.
- **Non vérifiable d'ici :** je n'ai pas accès au tableau de bord. À lire par Greg dans Vercel › Usage (la jauge en rouge donne la cause exacte).
- **Le site répond de nouveau** au 27 novembre, au bon commit (`578f3438`), site et API.
- **Usage commercial interdit en Hobby.** Passage en Pro à faire AVANT le premier client payant, et au plus tard le jour où mobiiz.fr est ouvert au public.
- **Prix de Pro :** 20 $ par mois et par membre (un seul membre suffit), avec 20 $ d'usage compris. Une limite de dépense se règle (Spend Management) pour ne jamais être surpris.

## 3. Risques, classés par gravité

### Critique (bloque le lancement)

1. **La sauvegarde nocturne n'a JAMAIS tourné.** `sauvegarde-base.yml` n'existe que sur la branche de test. GitHub ne lance un horaire que depuis la branche par défaut, qui ne l'a pas : aucune exécution dans l'historique des workflows. La seule protection réelle est donc l'historique de 6 h de Neon.
2. **Le dépôt est public.** Code, règles, journaux des workflows lisibles par tous. Les sauvegardes chiffrées y deviendraient téléchargeables par n'importe quel compte GitHub.
3. **Une clé partenaire (`X-Api-Key`) ouvre tout le compte, pas seulement les quantitatifs.** Elle permet l'export des données, le profil, et la **suppression du compte** (`DELETE /v1/me`, vérifié par test). Code : `identity/http/session.guard.ts:66`, `tenancy/http/tenant.guard.ts:20`.
4. **« Répondre » devient un envoi libre depuis mobiiz.fr.** On rattache à la main un message à une demande jamais envoyée, puis on « répond » à n'importe quelle adresse du carnet (vérifié par test). Code : `adresse-mobiiz/application/reponses-recues.service.ts:338` et `:371-393`.
5. **Clés données à des sessions Claude, à renouveler avant la prod :**
   - jeton Vercel (90 jours) ;
   - clé API Neon (toute l'organisation, prod comprise) ;
   - clé Resend ;
   - clé Stripe de test ;
   - clé IA du 15 novembre, commune au test et à la prod ;
   - `CRON_SECRET` et `RESEND_WEBHOOK_SECRET` de test.

### Haute

6. **Le quota gratuit de 3 analyses se contourne en lançant plusieurs lectures d'un coup :** 10 lancées ensemble, 10 acceptées. Seules les analyses terminées sont comptées (`ai-usage/application/analysis-meter.ts:88`). `BUDGET_IA_JOUR` ne couvre pas la lecture des devis.
7. **Les limites de débit ne s'appliquent à aucune route GET** (environ 29 routes, exports PDF compris), contrairement à ce que dit `SECURITE.md` (`platform/http/rate-limit.module.ts:56`).
8. **« Répondre », autres failles** (9 sur 26 attaques, détail dans `docs/securite/attaques-repondre.test.ts`) :
   - destinataire pris dans le carnet actuel au lieu de l'adresse de la demande ;
   - message d'un inconnu cité « Négoce X a écrit » ;
   - retour à la ligne gardé dans l'objet ;
   - ancien repère qui range la réponse dans le mauvais chantier ;
   - limite par adresse IP seulement ;
   - identité non confirmée acceptée ;
   - nom d'entreprise qui casse le From ;
   - négoce archivé encore joignable.
9. **Les jetons placés dans l'adresse sont écrits dans les journaux Vercel** (liens négoce, chiffrage, désabonnement : `platform/http/request-context.middleware.ts:25`).
10. **Pas d'anti-robot** (Turnstile non posé), **pas de chiffrement des fichiers** (`CHIFFREMENT_CLE` non posée, à vérifier), **photos sans aucune copie**.

### Moyenne

11. **Remplissage de la base par e-mails entrants :** jusqu'à 10 Mo gardés par message, même indésirable. Une alerte existe, mais rien ne bloque.
12. **Relais d'envoi :** aucun plafond d'e-mails par entreprise et par jour. La seule limite est par adresse IP.
13. **Infos personnelles dans les docs publiques :** l'adresse hotmail de Greg (`DECISIONS.md:174`) et l'identifiant de l'admin de test (qui reste dans `GROUPE_ADMINS` en prévisualisation).
14. **Garde-fous liés à `VERCEL_ENV=production` seulement.** `SIRETS_DE_TEST` n'a aucun garde-fou en production.
15. **Second compte Vercel `greg-2412` :** une prévisualisation de l'API y construirait encore (et migrerait sa base).
16. **CORS :** en prévisualisation, toute adresse `*-gr33-spec.vercel.app` est acceptée, y compris les autres projets (boutique, patrimoine).

### Basse

17. **Stripe :** « actif » sans regarder `payment_status`. C'est un problème seulement si un paiement différé (SEPA) est activé.
18. **Code admin à 6 chiffres :** les 5 essais se dépassent en parallèle. Il faut déjà le mot de passe admin.
19. **Secret des tâches planifiées** comparé avec `!==`, pas en temps constant.
20. **Rôle `REFERENTIAL_VALIDATORS`** sans code admin ni e-mail vérifié. L'export qu'il ouvre ne contient aucune donnée d'entreprise.

### Bien protégé (vérifié)

- Isolation entre entreprises, route par route : 14 fichiers de tests de sécurité, 72/72 verts le 27 novembre.
- Un négoce ne voit jamais les prix d'un autre.
- Admin : liste blanche, plus un code par session.
- Webhook Stripe : signature sur le corps brut, événement traité une seule fois.
- Webhook Resend : signature Svix, anti-rejeu.
- E-mails entrants : rattachement seulement si même expéditeur et DMARC valide.
- Pièces jointes servies de façon neutre.
- Tâches internes fermées sans `CRON_SECRET`.
- Mots de passe et clés masqués dans les journaux.
- Aucune clé réelle trouvée dans l'historique git. Réserve : la copie locale est partielle, un scan complet par GitHub est à lancer (gratuit sur un dépôt public).

## 4. Sauvegardes et restauration

### Ce qui est déjà inclus

- **Neon gratuit :** 6 h d'historique, restauration d'une branche à un instant donné, copie (branche) manuelle.
- **Neon Launch :** jusqu'à 7 jours. **Neon Scale :** jusqu'à 30 jours.
- **Vercel :** chaque déploiement est gardé, retour instantané à un ancien déploiement (Instant Rollback) en un clic, sans toucher à la base.
- **GitHub :** l'historique du code ; les artefacts gardés jusqu'à 90 jours.
- **Blob :** aucune sauvegarde des photos.

### Proposition

| | Valeur proposée | Pourquoi |
|---|---|---|
| Perte maximale acceptée (base) | 24 h dans le pire cas, quelques minutes dans le cas courant | L'historique Neon couvre le courant ; l'export de la nuit couvre la catastrophe (compte, projet ou région perdus). |
| Remise en route | 1 h pour revenir en arrière sur le code ; 4 h pour une restauration complète de la base | Le retour sur le code est instantané ; une restauration se vérifie avant d'être branchée. |
| Fréquence | Export complet chaque nuit | Base petite (quelques Mo à quelques centaines de Mo). |
| Conservation | 30 exports quotidiens, plus 1 par mois gardé 12 mois | 30 jours couvre une erreur vue tard ; le mensuel couvre la comptabilité. |
| Historique Neon | Launch : 7 jours, dès le lancement (environ 15 à 25 $ par mois à 100 utilisateurs) | Le retour à la minute près sur une semaine. |
| Photos | Copie chaque nuit des nouvelles photos (originaux seulement) vers le même stockage que les exports | Sans copie, une suppression est définitive. |
| Où garder les exports | Hors du dépôt public : rendre le dépôt privé (gratuit), ou un stockage privé (Cloudflare R2, 10 Go gratuits) | Sur un dépôt public, les artefacts sont téléchargeables par tous. |

### Test de restauration (fait le 27 novembre, en local, base isolée)

- **Source :** base locale `audit_source` remplie par le test d'isolation du serveur (126 tables, 106 migrations, 2 343 lignes). Jamais le site de test.
- **Chaîne rejouée à l'identique du workflow :**
  - `pg_dump` au format personnalisé ;
  - relecture `pg_restore --list` : 126 tables, migrations présentes ;
  - chiffrement AES-256 avec PBKDF2 à 200 000 itérations ;
  - empreinte SHA-256 ;
  - vérification de l'empreinte (OK) ;
  - déchiffrement ;
  - restauration dans une base vide `audit_restore` (1 s).
- **Résultat : identique.**
  - Pour chacune des 126 tables, même nombre de lignes et même empreinte du contenu.
  - Schéma identique (seul écart : le droit par défaut sur le schéma `public`, retiré par `--no-privileges`).
  - `prisma migrate status` : « Database schema is up to date ».
- **Pas testé :**
  - une restauration depuis Neon (pas d'accès, et aucune sauvegarde n'existe encore) ;
  - le client PostgreSQL 18 de la prod (16 en local).
  - Premier test réel à faire dès la première sauvegarde nocturne : restaurer dans une branche Neon jetable, jamais celle du site de test.

### Procédure en cas de bug (jamais de restauration automatique de toute la base)

1. **Revenir en arrière sur le code, pas sur la base.** Dans Vercel › projet › Deployments, choisir le dernier déploiement sain, puis « Instant Rollback ». Le faire pour l'API PUIS pour le site. Vérifier `/version` des deux.
   - Les inscriptions, demandes et quantitatifs créés entre-temps restent : la base n'est pas touchée.
   - Les migrations sont additives (vérifié sur les 40 dernières : aucune suppression de colonne ou de table, aucune colonne obligatoire sans valeur par défaut). L'ancien code tourne donc sur la base actuelle.
2. **Corriger le code**, chaîne de tests verte, puis nouveau déploiement.
3. **Si des données sont abîmées** (rare) :
   - restaurer dans une branche Neon À PART (« Restore » vers une nouvelle branche, ou export de la nuit restauré dans une base vide) ;
   - comparer ;
   - recopier SEULEMENT les lignes abîmées, avec l'accord de Greg.
   - Jamais d'écrasement de la base en ligne.
4. **Noter l'incident** (quoi, quand, ce qui est revenu) dans `docs/SUIVI.md`.

## 5. Surveillance

### Déjà là (gardé tel quel)

- Alertes par e-mail, une par sorte toutes les 10 minutes : erreur serveur, écran en erreur, lecture échouée, action abandonnée, base pleine à 70 %, paiement refusé, consommation d'analyses, e-mails entrants, négoce à vérifier.
- Signalement de bug.
- Bandeau rouge de l'accueil admin : signalements, paiements refusés, erreurs serveur sur 24 h, négoces à vérifier.
- `/v1/health` et `/version`.

### Ce qui manque (proposé, pas codé)

| Manque | Proposition | Coût |
|---|---|---|
| Site indisponible | Un workflow GitHub toutes les 15 min lit `/version` des deux domaines ; GitHub prévient Greg par e-mail en cas d'échec. Il doit être sur la branche par défaut. | 0 € sur dépôt public ; sur dépôt privé, environ 1 500 min par mois sur les 2 000 gratuites. Alternative : un moniteur externe gratuit (compte à créer par Greg). |
| Erreur grave | Déjà là (`server_error`). | 0 € |
| Sauvegarde ratée | GitHub envoie un e-mail à chaque échec d'un workflow planifié ; le workflow échoue déjà si un secret manque. Plus une ligne « dernière sauvegarde : date » dans l'admin (lue par l'API GitHub). | 0 € |
| Dépense IA anormale | `conso_ia` existe par compte ; à ajouter : le total du jour de TOUTES les analyses (lecture des devis comprise) comparé à `BUDGET_IA_JOUR`, et un plafond mensuel posé dans la console Anthropic. | 0 € |
| État de santé dans l'admin | Une carte « Santé » : base (OK, taille sur la limite), e-mails du jour sur 100, dépense IA du jour sur le budget, dernière sauvegarde, dernière tâche planifiée passée. Aucune donnée de client. | 0 € |

## 6. Coûts par mois (estimation, hors taxes, en dollars si le service facture en dollars)

**Hypothèses :**
- la moitié des inscrits actifs chaque mois ;
- 3 analyses par actif à 0,20 $ (mesure de la passe 9 : 0,14 $ pour un petit devis, 0,26 $ pour un moyen) ;
- 40 e-mails par inscrit (envois, réponses reçues, alertes) ;
- 20 % d'abonnés à 29 € ;
- 10 Mo de photos par inscrit.

| Poste | Inclus gratuit aujourd'hui | 100 utilisateurs | 1 000 utilisateurs | 10 000 utilisateurs |
|---|---|---|---|---|
| Vercel (site et API) | Hobby, interdit au commercial | Pro 20 $ | 20 $ + 20 à 60 $ d'usage | 20 $ + 150 à 400 $ d'usage |
| Neon (base) | 0,5 Go, 6 h d'historique | Launch, environ 15 à 25 $ | environ 40 à 80 $ | Scale, environ 150 à 300 $ |
| Photos (Blob) | 1 Go | moins de 1 $ | environ 1 à 5 $ | environ 10 à 40 $ |
| Resend (e-mails) | 3 000 par mois, 100 par jour | Pro 20 $ (le gratuit casse à 100 par jour) | Pro 20 à 35 $ | Scale, environ 90 $ et plus, environ 350 $ |
| Anthropic (IA) | — | environ 30 $ | environ 300 $ | environ 3 000 $ |
| Stripe (sur 20 % d'abonnés) | rien sans vente | environ 18 € (1,5 % + 0,25 € par paiement, plus 0,7 % Billing) | environ 180 € | environ 1 800 € |
| Sauvegardes (exports) | GitHub Actions gratuit sur dépôt public | 0 € (R2 : 10 Go gratuits) | 0 à 1 € | 1 à 5 € |
| GitHub, Cloudflare, Turnstile | gratuits | 0 € | 0 € | 0 € |
| **Total fixe, hors Stripe** | | **environ 85 à 95 $** | **environ 400 à 500 $** | **environ 3 700 à 4 100 $** |
| Revenus pour comparer (20 % × 29 €) | | 580 € | 5 800 € | 58 000 € |

- **Le poste qui grossit le plus est l'IA :** environ 0,30 $ par inscrit et par mois, couvert par les plafonds cachés de 5 € (Pro) et 20 € (Pro Max).
- **Le premier mur payant est Resend :** à 100 e-mails par jour, les envois s'arrêtent net. Il est à passer en Pro avant les premiers vrais artisans.

## 7. Corrections proposées (dans l'ordre, chacune à valider par Greg)

1. **Rendre le dépôt GitHub privé** (gratuit, 2 minutes dans Settings). Vérifier ensuite que Vercel construit toujours (l'intégration GitHub suit).
2. **Activer la sauvegarde :**
   - mettre `sauvegarde-base.yml` sur la branche par défaut (ou changer la branche par défaut vers `main`) ;
   - poser les deux secrets dans l'environnement GitHub `sauvegarde` (rôle Neon en lecture seule, phrase longue gardée hors de GitHub) ;
   - lancer une fois à la main ;
   - restaurer dans une branche Neon jetable.
3. **Clé partenaire :** la limiter aux seules routes `/v1/quantitatifs` (correction serveur, avec test).
4. **« Répondre »** :
   - seulement sur une demande partie, au négoce de la demande, à l'adresse figée à l'envoi ;
   - jamais citer un expéditeur inconnu ;
   - objet nettoyé ;
   - From entre guillemets ;
   - limite par entreprise ;
   - identité confirmée.
   - Les 26 tests d'attaque sont prêts à passer dans `apps/api/test/`.
5. **Quota d'analyses :** compter les analyses en cours (réservation avant l'appel) ; `BUDGET_IA_JOUR` pour toutes les lectures.
6. **Limites de débit sur les routes GET** qui fabriquent des PDF ou servent des jetons ; jetons masqués dans les journaux.
7. **Renouveler les clés listées au point 5 des risques** et créer des clés de production séparées (IA, Resend, Stripe live), jamais données à une session.
8. **Activer la double authentification** sur GitHub, Vercel, Neon, Anthropic, Resend et Cloudflare (Stripe l'impose).
9. **Avant la prod :**
   - Vercel Pro (20 $) ;
   - Neon Launch ;
   - Resend Pro (20 $) ;
   - Turnstile ;
   - `CHIFFREMENT_CLE` ;
   - retirer l'admin de test ;
   - plafond de dépense dans les consoles Vercel et Anthropic.
10. **Carte « Santé » de l'admin et surveillance du site** (tableau de la partie 5).
