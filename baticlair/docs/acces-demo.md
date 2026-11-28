# Accès démo « Découvrir l'application »

Greg, 7 novembre 2026, option 1, **test.mobiiz.fr seulement**.

## Ce que voit le visiteur

- Sur la landing, sous « Commencer gratuitement » : **Découvrir l'application**. Le bouton n'existe que si le serveur a
  l'accès allumé (`GET /v1/public/demo` → `{ actif }`).
- Un tap : un espace fictif s'ouvre, sans inscription ni mot de passe (`POST /v1/public/demo/session`).
- Sur chaque écran, le bandeau **Mode démonstration** : « données fictives, rien ne part (ni e-mail, ni paiement) »,
  avec **Recommencer** (un espace neuf) et **Quitter** (retour à la landing).

## Ce qu'il y a dedans (tout fictif)

- L'entreprise « Couverture Démo (fictive) », Lannion (22) ; le compte « Camille Démo ».
- « Démo – Toiture Martin » : un devis client fictif, lu par la lecture simulée (jamais l'IA).
- « Chantier Lannion (démo) » : une demande déjà chiffrée par trois négoces fictifs (prix fictifs) : suivi, offres,
  comparaison livraison comprise.
- Trois négoces fictifs qui « répondent » seuls ; toutes les adresses sont sur `demo.mobiiz.fr` (sans boîte aux lettres).

## Ce qui ne part jamais

- **E-mails** : tout envoi pendant une requête du visiteur est simulé (`EmailSortantSender`), liste blanche ou pas ;
  les relances automatiques ignorent les entreprises des visiteurs.
- **IA** : aucun appel (lecture simulée pour tout devis déposé, interprète coupé, garde centrale `sansIaEnDemo`).
- **Refusés (403)** : paiement et abonnement, clés partenaires, vérification SIRET, achats groupés, rapprochements,
  commande du mois, espaces négoce et admin (`routeInterditeEnDemo`).

## Isolation et remise à zéro

- Un compte `visiteur-<hasard>@demo.mobiiz.fr` et une entreprise **par visite** : l'isolation est celle de toute
  entreprise (test `isolation-toutes-routes`, test `acces-demo`).
- Effacé après **24 h** (à la visite suivante) ; 300 visiteurs au plus en même temps. « Tout effacer » du jeu
  de démonstration de l'admin ne les touche pas (ils ont leur propre effacement).

## Le réglage

- `ACCES_DEMO=off` par défaut : pas de bouton, la route répond 404.
- `ACCES_DEMO=on` : posé sur le projet baticlair-api, **prévisualisation de la branche de test seulement**.
- Refusé en production : le serveur ne démarre pas avec `ACCES_DEMO=on` et `VERCEL_ENV=production`.
- Pour le couper : retirer la variable (ou `off`) puis redéployer.

## Tests

`apps/api/test/acces-demo.test.ts` (6) ; e2e `apps/web/e2e/acces-demo.spec.ts` (téléphone et ordinateur).
