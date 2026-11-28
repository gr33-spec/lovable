# Contrôle du jour J : la liste de mise en production est-elle complète ?

Audit de nuit du 28 novembre 2026, en LECTURE SEULE. Rien n'a été modifié : ni le code, ni `MISE-EN-PROD.md`, ni
`COORDINATION.md`.

- Liste relue : `baticlair/docs/groupe/MISE-EN-PROD.md`, version de la branche de test au commit `1cef91ff`.
- Comparée au code de ce même commit, à l'audit sécurité du 27 novembre
  (`baticlair/docs/securite-sauvegardes-couts-2026-11-27.md`) et aux textes légaux candidats (`baticlair/docs/legal/`).

## En bref

La section 0 de la liste couvre déjà :
- la sauvegarde ;
- Search Console ;
- la protection anti-robots de Vercel ;
- « Couvreurs de Bretagne » ;
- la publication des sites Pro.

Il manque surtout cinq choses :
- **les nouveaux prix** (rien dans le code ni dans le script Stripe) ;
- **le renouvellement des clés** ;
- **le masquage de Pro Max et de Mission** ;
- **le passage du code de la branche de test vers `main`** (la production tourne encore sur un commit d'octobre) ;
- **le rattachement de mobiiz.fr à Vercel**.

Les sections 1 à 7 sont en grande partie périmées : PR #284 à #287, commission sur facture, `baticlair.fr`, premier lot
« chantier signé ». Elles brouillent la lecture.

## 1. Ce que demande Greg, point par point

| Point demandé | Dans la liste ? | Constat |
|---|---|---|
| Renouvellement des clés : Neon, IA, Resend, Stripe, `CRON_SECRET`, `RESEND_WEBHOOK_SECRET` | **Partiel** | La section 7 ne cite que `CRON_SECRET` et `RESEND_WEBHOOK_SECRET`, et seulement « après le premier lot ». La clé API Neon, la clé IA (aujourd'hui la même pour le test et la production), Resend et Stripe manquent. L'audit du 27 novembre (point 5) demande des clés de production séparées, jamais données à une discussion. |
| Produits Stripe aux nouveaux prix (19,90 €/mois et 199 €/an en lancement ; 29,90 € et 299 € en normal) | **Absent** | Le code et le script `apps/api/scripts/stripe-creer-prix.mjs` créent encore Pro 29 € / 290 € et Pro Max 49 € / 490 €. `packages/domain/src/groupe/tarifs.ts` dit 29 € et 49 €. Rien ne prévoit d'offre de lancement. |
| Code FONDATEUR gardé en réserve | **Absent** | Le serveur sait poser le coupon (Stripe test). La liste ne dit pas qu'il ne faut PAS le créer en live au lancement. |
| Sauvegarde rebranchée sur la production | **Oui** | Section 0, deux points (rôle `sauvegarde` à recréer EN SQL sur Neon `main`, secret à changer, `MOBIIZ_API` à changer en même temps). Complet. |
| Search Console | **Oui** | Section 0, avec la procédure `docs/referencement/search-console-bing.md`. |
| Protection anti-robots de Vercel | **Oui** | Section 0 (Firewall, Attack Challenge Mode, test avec l'agent Googlebot). |
| Masquer Mission | **Flou** | Mission est coupée par défaut (`MISSIONS_V1`) et réglée par l'interrupteur de l'admin. La liste ne dit pas de vérifier que l'interrupteur est sur « coupé » dans l'admin de PRODUCTION. |
| Masquer Pro Max | **Absent, et aucun réglage n'existe** | Pro Max s'affiche sur `/tarifs`, dans « Mon abonnement », dans la FAQ et dans les CGU. Aucune variable ne le cache. Il faut un changement de code avant le jour J. |
| Masquer « Couvreurs de Bretagne » | **Oui** | Section 0 : 404 quand `VERCEL_ENV=production`, à vérifier en ligne. |
| Publication des sites Pro | **Oui** | Section 0 (`SITE_PUBLICATION_PAYANTE=on` et `SITE_PUBLICATION_PAYANTE_DEPUIS`). |

## 2. Ce qui manque ou reste flou

1. **Le code à mettre en production.**
   - La production est au commit `b7654ab0` (octobre) ; `main` ne porte que le fichier de sauvegarde en plus.
   - Rien ne dit comment le code de la branche de test arrive sur `main`, ni quand. Il faut : une fusion relue, avec
     accord de Greg, et les migrations jouées sur Neon `main`.
   - Les sections 1, 3 et 4 parlent encore des PR #284 à #287 et des migrations d'octobre.
2. **mobiiz.fr n'est rattaché à aucun projet Vercel** (constat du 27 novembre). Il faut le rattacher au projet du site,
   et donner à l'API son adresse de production, avant toute autre étape « en ligne ».
3. **Les nouveaux prix.** Il faut changer :
   - `tarifs.ts`, `abonnement.ts` et les écrans ;
   - la FAQ et l'e-mail de rappel annuel ;
   - le script Stripe (nouvelles clés de recherche, par exemple `mobiiz_pro_1990_mois`) ;
   - les CGU candidates (encore 29 € / 290 € et Pro Max).

   Il faut aussi trancher comment l'offre de lancement devient le prix normal :
   - pour qui ;
   - à partir de quand ;
   - avec quel préavis (CGU, article 15.4 : 30 jours).
4. **Masquer Pro Max** : un réglage à coder (comme `MISSIONS_V1`), puis CGU et FAQ sans Pro Max.
5. **Clés de production séparées** : Anthropic (avec un plafond de dépense mensuel dans la console), Resend, Stripe live,
   `CRON_SECRET`, `AUTH_SECRET`, `RESEND_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`. Les clés du site de test ne vont
   jamais en production.
6. **`SIRETS_DE_TEST` n'est pas bloqué en production.**
   - Le code le lit partout (`groupe.service.ts`) ; seul un commentaire dit « jamais en production ».
   - `DEMO_PUBLIQUE`, `ACCES_DEMO` et `SIRET_VERIFICATION=forme` sont, eux, refusés au démarrage en production.
   - Il faut soit vérifier à la main que la variable est absente de la Production, soit ajouter le même refus dans le
     code.
7. **Stockage des photos de production.** Le stockage Vercel Blob « mobiiz-photos-test » n'est relié qu'à la
   prévisualisation. En production, sans `BLOB_READ_WRITE_TOKEN`, les photos sont coupées (`off`). Il faut :
   - créer un stockage de production ;
   - poser `BLOB_READ_WRITE_TOKEN` (API) et `PHOTOS_BLOB_URL` (site).
8. **Anti-robot Turnstile** : les deux clés Cloudflare, en Production. Le point est dans CLAUDE.md mais pas dans
   `MISE-EN-PROD.md`.
9. **Chiffrement des fichiers** : `CHIFFREMENT_CLE` est à poser AVANT les premiers fichiers réels. Une clé perdue rend
   les fichiers illisibles : la garder hors de Vercel aussi.
10. **Textes légaux.** Il faut :
    - publier les CGU / CGV, la confidentialité et les mentions légales candidates du 28 novembre, avec le téléphone de
      l'éditeur ;
    - monter `VERSION_CGU_MAJEURE` ;
    - corriger d'abord l'anonymat des achats groupés dans le code (discussion « SaaS achat artisans »).

    La liste ne cite que les conditions négoces et la discrétion.
11. **Contrats de sous-traitance (DPA)** à accepter dans chaque compte : Vercel, Neon, Resend, Anthropic, Cloudflare,
    Stripe live (`RGPD-SOUS-TRAITANTS.md`).
12. **Réglages de production à vérifier un par un** (aujourd'hui éparpillés dans CLAUDE.md) :
    - `ASSISTANT_IA` (allumé ou non en production ?) ;
    - `BUDGET_IA_JOUR` ;
    - `LECTURES_IA_GRATUIT_TOTAL` (absent ou 3 ; le test en a 60) ;
    - `AI_EXTRACTION_MODEL` et `AI_EXTRACTION_EFFORT` (le test est en Sonnet, le code par défaut en Opus : choix à
      trancher) ;
    - `METIERS_OUVERTS` (par défaut, Couverture et Peinture) ;
    - `ACHATS_GROUPES_V1`, `GROUPE`, `GROUPE_DEPARTEMENTS` ;
    - `SIRET_VERIFICATION=insee` et `INSEE_API_KEY` ;
    - `CHANTIER_FICTIF` coupé.
13. **Adresse d'alerte dans l'admin de production** (Admin › Réglages, double validation) : sans elle, seul `ALERT_EMAIL`
    sert de repli.
14. **E-mails.** Il faut :
    - le domaine d'envoi Resend vérifié pour la production ;
    - le webhook de réception vers l'API de production ;
    - DMARC à passer en `p=reject` une fois les envois vérifiés (accord de Greg du 22 novembre).
15. **Stripe live, au-delà des prix** :
    - le webhook vers l'API de production et son secret ;
    - le portail client (résiliation, changement de carte) ;
    - les mentions des factures (siège, SIREN, TVA, pénalités de retard).
16. **Dépôt GitHub privé.**
    - Avant, vérifier que l'auteur des commits est bien gr33-spec : le réglage de démarrage n'est pas sur `main`.
    - Relancer les discussions ouvertes.
17. **Sections périmées à nettoyer dans la liste** :
    - les variables `FACTURE_EMETTEUR_*` pour une « facture de commission » (il n'y a plus de commission) ;
    - `REPONSES_DOMAINE` en `baticlair.fr` et `WEB_APP_URL` en `app.baticlair.fr` ;
    - le « premier lot de test » (section 5), qui décrit l'ancien groupé ;
    - le cron `rapport-mensuel` (« Y € économisés »), à vérifier contre la règle « aucune économie garantie » ;
    - « Vercel Pro » (déjà fait le 27 novembre).

## 3. L'ordre proposé pour le jour J

Chaque étape attend la précédente. Rien ne se fait sans l'accord de Greg.

**La veille**
1. Trancher les prix (lancement et normal), le sort de Pro Max, le modèle d'IA de lecture et `ASSISTANT_IA` en
   production.
2. Faire coder et tester, sur la branche de test :
   - les nouveaux prix ;
   - le masquage de Pro Max ;
   - le refus de `SIRETS_DE_TEST` en production ;
   - l'anonymat des achats groupés ;
   - le lien « Mentions légales » des sites.

   Puis mettre à jour les textes légaux (prix, sans Pro Max).
3. Créer les clés de production neuves : Anthropic (avec un plafond de dépense), Resend, `CRON_SECRET`, `AUTH_SECRET`,
   `CHIFFREMENT_CLE`, Turnstile. Les garder hors des discussions.
4. Créer le stockage Blob de production et le domaine d'envoi Resend de production.

**Le matin**

5. Faire une sauvegarde Neon de `main` (branche ou instantané) juste avant.
6. Fusionner, avec accord, la branche de test vers `main`, puis contrôler la construction de production et les
   migrations sur Neon `main`.
7. Rattacher mobiiz.fr au projet du site, et l'adresse de l'API de production à son projet.
8. Poser les variables de Production. D'abord les clés de l'étape 3, puis :
   - `SITE_PUBLICATION_PAYANTE` et `SITE_PUBLICATION_PAYANTE_DEPUIS` ;
   - `METIERS_OUVERTS` ;
   - `GROUPE`, `GROUPE_DEPARTEMENTS` et `GROUPE_ADMINS` (l'adresse de Greg seulement) ;
   - `SIRET_VERIFICATION` et `INSEE_API_KEY` ;
   - le stockage des photos.

   Vérifier ensuite l'ABSENCE de `SIRETS_DE_TEST`, `ACCES_DEMO`, `DEMO_PUBLIQUE` et `CHANTIER_FICTIF`.
9. Stripe live :
   - créer les prix par le script `--reel`, sans le coupon FONDATEUR (gardé en réserve) ;
   - créer le webhook et poser son secret ;
   - régler le portail client.
10. Dans l'admin de production : poser l'adresse d'alerte, laisser Mission sur « coupé » et vérifier les plafonds IA.

**Mise en ligne**

11. Publier les CGU / CGV, la confidentialité et les mentions légales, et monter `VERSION_CGU_MAJEURE`. Garder les
    conditions négoces candidates en attente de l'avocat.
12. Rebrancher la sauvegarde :
    - recréer le rôle `sauvegarde` EN SQL sur Neon `main` ;
    - changer le secret `SAUVEGARDE_DATABASE_URL` et `MOBIIZ_API` en même temps ;
    - lancer le workflow à la main et lire « Test de restauration ».
13. Contrôles en ligne :
    - `/version` du site et de l'API ;
    - `/couvreurs-bretagne` en 404 ;
    - aucun Pro Max à l'écran ;
    - inscription avec Turnstile ;
    - un paiement réel de Greg, puis son remboursement.

**Ouverture aux moteurs (le jour même ou après)**

14. Régler le pare-feu de Vercel (anti-robots), puis `INDEXATION_SITE=on`, la redirection de `www`, Search Console et
    Bing, et l'envoi du sitemap.

**Dans la semaine**

15. Passer DMARC en `p=reject` une fois les envois vérifiés.
16. Accepter les DPA dans chaque compte.
17. Supprimer l'admin de test de `GROUPE_ADMINS` de la prévisualisation.
18. Supprimer l'ancienne `ANTHROPIC_API_KEY`.
19. Faire tourner les secrets qui ont servi aux tests.
