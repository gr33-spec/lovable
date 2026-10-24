# Brancher Stripe (le vrai paiement)

Aujourd'hui, le paiement est **simulé** (`PAIEMENT=simule`) : la page « Paiement (simulation) » remplace Stripe, les factures portent le préfixe `TEST`, aucun argent ne bouge. Tout est prêt pour Stripe : il n'y a rien à reprogrammer, seulement des réglages chez Stripe et dans Vercel.

Compte environ 30 minutes. Fais-le d'abord en **mode test** de Stripe (les clés commencent par `sk_test_`), puis refais-le en **mode réel** (`sk_live_`) le jour du lancement.

## 1. Chez Stripe

1. Crée le compte sur stripe.com au nom de **BATI INVEST** (SIRET, IBAN, pièce d'identité du gérant).
2. **Réglages → Facturation → Taxes** : crée un taux de TVA « TVA 20 % », France, **non inclus dans le prix**. Note son identifiant (`txr_…`).
3. **Catalogue de produits → Ajouter un produit** :
   - Nom : « Abonnement Mobiiz » ;
   - Prix : **29,00 € HT**, **récurrent**, **mensuel** ;
   - Note l'identifiant du prix (`price_…`).
4. **Réglages → Portail client** : active le portail (changer de carte, voir les factures Stripe, **résilier en fin de période**). Coche « Les clients peuvent résilier » avec « À la fin de la période de facturation ».
5. **Réglages → Facturation → Abonnements → Gestion des échecs de paiement** : 3 nouvelles tentatives sur 7 jours, puis « annuler l'abonnement ». (Mobiiz laisse de son côté 7 jours de grâce avec un bandeau rouge et un e-mail.)
6. **Développeurs → Webhooks → Ajouter un point de terminaison** :
   - URL : `https://<adresse de l'API>/v1/abonnement/stripe/webhook` (en production : l'adresse du projet Vercel `baticlair-api`) ;
   - Événements à cocher, et seulement eux :
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Note le **secret de signature** (`whsec_…`).
7. **Développeurs → Clés API** : copie la **clé secrète** (`sk_test_…` ou `sk_live_…`). Ne la colle jamais dans une conversation ni dans un fichier : seulement dans Vercel.

## 2. Dans Vercel (projet `baticlair-api`)

**Settings → Environment Variables**, pour l'environnement voulu (Preview pour essayer, Production pour le lancement) :

| Variable | Valeur |
|---|---|
| `PAIEMENT` | `stripe` |
| `STRIPE_SECRET_KEY` | la clé secrète (`sk_…`) |
| `STRIPE_WEBHOOK_SECRET` | le secret du webhook (`whsec_…`) |
| `STRIPE_PRICE_ID` | le prix mensuel (`price_…`) |
| `STRIPE_TAX_RATE_ID` | le taux de TVA 20 % (`txr_…`) |
| `ABONNEMENT` | `on` (déjà la valeur par défaut) |

Puis **Redeploy**. Sans les trois premières clés, l'API refuse de démarrer avec `PAIEMENT=stripe` (elle le dit dans le journal de build). En production, `PAIEMENT=simule` est refusé : personne ne peut s'abonner sans payer.

## 3. Vérifier

1. Avec les clés de **test**, ouvre l'app, « Mon abonnement » → « M'abonner dès maintenant ». La page de paiement Stripe s'ouvre.
2. Paie avec la carte de test `4242 4242 4242 4242` (date future, code 123). Retour sur « Mon abonnement » : « Abonné », et une facture `F-000001` dans « Mes factures ».
3. Dans Stripe → Webhooks, chaque événement doit être en **200**. Un 403 = mauvais `STRIPE_WEBHOOK_SECRET`.
4. Échec : carte `4000 0000 0000 0341` (refusée au renouvellement) ou, dans Stripe, « Envoyer un événement de test » `invoice.payment_failed` : bandeau rouge et e-mail « Ton paiement Mobiiz n'est pas passé ».
5. Résiliation : « Résilier » puis « Oui, résilier » : e-mail de confirmation, l'accès reste jusqu'à la fin du mois payé.

## Ce que fait le code

- **Checkout en abonnement** (`apps/api/src/modules/abonnement/infrastructure/stripe.ts`) : le prix, la TVA 20 %, l'adresse de facturation et le n° de TVA de l'artisan (facultatif) demandés par Stripe.
- **Webhooks signés** : la signature `Stripe-Signature` est vérifiée (HMAC-SHA256, 5 minutes de tolérance) ; un événement rejoué n'est appliqué qu'une fois.
- **Factures** : à chaque `invoice.paid`, Mobiiz émet sa propre facture au nom de BATI INVEST, numérotée sans trou (`F-000001`, `F-000002`…), avec HT, TVA, TTC, raison sociale, SIRET et adresse du client. Les factures de test gardent leur suite à part (`TEST-…`).
- **Changer le prix** : dans l'admin (réglages de l'abonnement) **et** chez Stripe (nouveau prix, puis `STRIPE_PRICE_ID`). Les CGU imposent un préavis de 30 jours aux abonnés.

## À savoir

- Stripe envoie aussi ses propres reçus si tu l'actives (Réglages → E-mails clients). Ce n'est pas nécessaire : Mobiiz envoie la facture.
- Les factures se gardent 10 ans (obligation comptable), même si l'artisan supprime son compte.
