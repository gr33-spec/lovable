# Brancher Stripe (le vrai paiement)

Aujourd'hui, le paiement est **simulé** (`PAIEMENT=simule`) : la page « Paiement (simulation) » remplace Stripe, les factures portent le préfixe `TEST`, aucun argent ne bouge. Tout est prêt pour Stripe : il n'y a rien à reprogrammer, seulement des réglages chez Stripe et dans Vercel.

**Deux formules** (Greg, 24 octobre 2026) : **mensuel** 49 € HT par mois, sans engagement ; **annuel** 348 € HT par an, payé en une fois. Il faut donc **deux prix** chez Stripe.

Compte environ 30 minutes. Fais-le d'abord en **mode test** de Stripe (les clés commencent par `sk_test_`), puis refais-le en **mode réel** (`sk_live_`) le jour du lancement.

## 1. Chez Stripe

1. Crée le compte sur stripe.com au nom de **BATI INVEST** (SIRET, IBAN, pièce d'identité du gérant).
2. **Réglages → Facturation → Taxes** : crée un taux de TVA « TVA 20 % », France, **non inclus dans le prix**. Note son identifiant (`txr_…`).
3. **Les deux prix**. Le plus simple : le script, qui crée le produit « Abonnement Mobiiz » et ses deux prix (ou les retrouve s'ils existent déjà) et affiche leurs identifiants :

   ```
   cd apps/api
   STRIPE_SECRET_KEY=sk_test_… node scripts/stripe-creer-prix.mjs
   ```

   Il refuse une clé réelle (`sk_live_`) sans `--reel`. À la main, c'est **Catalogue de produits → Ajouter un produit**, nom « Abonnement Mobiiz », puis deux prix sur ce produit :
   - **49,00 € HT**, récurrent, **mensuel**, « Taxes : non incluses » ;
   - **348,00 € HT**, récurrent, **annuel**, « Taxes : non incluses ».

   Note les deux identifiants (`price_…`).
4. **Réglages → Portail client** : active le portail (changer de carte, voir les factures Stripe, **résilier en fin de période**). Coche « Les clients peuvent résilier » avec « À la fin de la période de facturation ». Laisse **décoché** « Les clients peuvent changer de formule » : le passage du mois à l'année se fait dans Mobiiz (« Mon abonnement » → « Passer à l'annuel »), au prorata.
5. **Réglages → Facturation → Abonnements → Prorata** : laisse « Créer des prorata » (c'est le défaut). Au passage à l'annuel, Mobiiz demande à Stripe de facturer tout de suite l'année, moins ce qui reste du mois (`proration_behavior=always_invoice`).
6. **Rappel de renouvellement** : Mobiiz envoie lui-même l'e-mail 30 jours avant le renouvellement de l'annuel. Dans **Réglages → Facturation → Abonnements → E-mails**, laisse « Envoyer un rappel avant le renouvellement » décoché, sinon l'artisan reçoit deux rappels.
7. **Réglages → Facturation → Abonnements → Gestion des échecs de paiement** : 3 nouvelles tentatives sur 7 jours, puis « annuler l'abonnement ». (Mobiiz laisse de son côté 7 jours de grâce avec un bandeau rouge et un e-mail.)
8. **Développeurs → Webhooks → Ajouter un point de terminaison** :
   - URL : `https://<adresse de l'API>/v1/abonnement/stripe/webhook` (en production : l'adresse du projet Vercel `baticlair-api`) ;
   - Événements à cocher, et seulement eux :
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Note le **secret de signature** (`whsec_…`).
9. **Développeurs → Clés API** : copie la **clé secrète** (`sk_test_…` ou `sk_live_…`). Ne la colle jamais dans une conversation ni dans un fichier : seulement dans Vercel.

## 2. Dans Vercel (projet `baticlair-api`)

**Settings → Environment Variables**, pour l'environnement voulu (Preview pour essayer, Production pour le lancement) :

| Variable | Valeur |
|---|---|
| `PAIEMENT` | `stripe` |
| `STRIPE_SECRET_KEY` | la clé secrète (`sk_…`) |
| `STRIPE_WEBHOOK_SECRET` | le secret du webhook (`whsec_…`) |
| `STRIPE_PRICE_ID_MENSUEL` | le prix mensuel, 49 € (`price_…`) |
| `STRIPE_PRICE_ID_ANNUEL` | le prix annuel, 348 € (`price_…`) |
| `STRIPE_TAX_RATE_ID` | le taux de TVA 20 % (`txr_…`) |
| `ABONNEMENT` | `on` (déjà la valeur par défaut) |

L'ancienne variable `STRIPE_PRICE_ID` (une seule formule à 29 €) n'est plus lue que si `STRIPE_PRICE_ID_MENSUEL` manque : remplace-la.

Puis **Redeploy**. Sans la clé, le secret du webhook et les deux prix, l'API refuse de démarrer avec `PAIEMENT=stripe` (elle le dit dans le journal de build). En production, `PAIEMENT=simule` est refusé : personne ne peut s'abonner sans payer.

## 3. Vérifier

1. Avec les clés de **test**, ouvre l'app, « Mon abonnement ». Les deux formules sont là, l'annuel coché. Choisis le **mensuel**, puis « M'abonner dès maintenant ». La page de paiement Stripe s'ouvre, à 49 € HT.
2. Paie avec la carte de test `4242 4242 4242 4242` (date future, code 123). Retour sur « Mon abonnement » : « Abonné au mois », et une facture `F-000001` dans « Mes factures ».
3. « Passer à l'annuel » → « Oui, payer … » : Stripe facture l'année moins ce qui reste du mois. Quelques secondes plus tard : « Abonné à l'année », et une deuxième facture (« Passage à l'abonnement annuel »).
4. Dans Stripe → Webhooks, chaque événement doit être en **200**. Un 403 = mauvais `STRIPE_WEBHOOK_SECRET`.
5. Échec : carte `4000 0000 0000 0341` (refusée au renouvellement) ou, dans Stripe, « Envoyer un événement de test » `invoice.payment_failed` : bandeau rouge et e-mail « Ton paiement Mobiiz n'est pas passé ».
6. Résiliation : « Résilier » puis « Oui, résilier » : e-mail de confirmation, l'accès reste jusqu'à la fin de la période payée (l'échéance de l'année pour l'annuel), sans remboursement.
7. Un autre compte, l'**annuel** directement : 348 € HT, « Abonné à l'année », renouvellement dans un an.

## Ce que fait le code

- **Checkout en abonnement** (`apps/api/src/modules/abonnement/infrastructure/stripe.ts`) : le prix de la formule choisie (mensuel ou annuel), la TVA 20 %, l'adresse de facturation et le n° de TVA de l'artisan (facultatif) demandés par Stripe.
- **Passage à l'annuel** : le prix de l'abonnement Stripe est remplacé par le prix annuel, avec facturation immédiate au prorata ; la facture arrive par `invoice.paid` (`billing_reason = subscription_update`) et Mobiiz l'émet comme « Passage à l'abonnement annuel ».
- **La formule** de chaque événement se lit au prix de la ligne de facture ou de l'abonnement (les deux identifiants de Vercel), sinon à la métadonnée `formule` posée au Checkout.
- **Rappel de l'annuel** : la tâche horaire envoie l'e-mail 30 jours avant l'échéance (réglable dans l'admin), une fois par année, même quand l'artisan a coupé les relances (il touche au paiement).
- **Webhooks signés** : la signature `Stripe-Signature` est vérifiée (HMAC-SHA256, 5 minutes de tolérance) ; un événement rejoué n'est appliqué qu'une fois.
- **Factures** : à chaque `invoice.paid`, Mobiiz émet sa propre facture au nom de BATI INVEST, numérotée sans trou (`F-000001`, `F-000002`…), avec HT, TVA, TTC, raison sociale, SIRET et adresse du client. Les factures de test gardent leur suite à part (`TEST-…`).
- **Changer un prix** : dans l'admin (réglages : prix du mensuel, prix de l'annuel) **et** chez Stripe (nouveau prix, puis `STRIPE_PRICE_ID_MENSUEL` ou `STRIPE_PRICE_ID_ANNUEL`). Les CGU imposent un préavis de 30 jours aux abonnés.

## À savoir

- Stripe envoie aussi ses propres reçus si tu l'actives (Réglages → E-mails clients). Ce n'est pas nécessaire : Mobiiz envoie la facture.
- Les factures se gardent 10 ans (obligation comptable), même si l'artisan supprime son compte.
