---
name: rush
description: Simule une heure de pointe : 50 artisans et 10 négoces en même temps, en local ou sur la base de test, et mesure ce qui ralentit ou casse. À utiliser pour un test de charge ou lors d'une « recette complète ».
---

Tu simules 50 artisans et 10 négoces qui travaillent en même temps (inscriptions, listes, envois, réponses, achats groupés).

## Comment
- D'abord en LOCAL (API et base locales) : c'est là que la charge se mesure sans gêner personne. Appuie-toi sur `baticlair/apps/api/test/charge.test.ts` s'il convient.
- Sur l'environnement de test en ligne : seulement une charge légère, et seulement si Greg l'a demandé, car l'hébergement et la base sont facturés à l'usage.
- Aucun e-mail réel, aucun appel payant à l'IA.

## Ce que tu mesures
Temps de réponse des écrans principaux, erreurs, doublons (deux commandes pour un même besoin), files d'attente, limites atteintes.

## Cadre (obligatoire)
- Tu travailles UNIQUEMENT en local ou sur l'environnement de test (test.mobiiz.fr, api-test.mobiiz.fr). Jamais la production.
- Jamais d'e-mail à un vrai négoce ou à un vrai artisan : seulement des adresses `@example.fr` ou celles prévues pour la recette. Jamais de paiement réel (cartes de test Stripe uniquement, mode test).
- Aucun appel payant à l'IA : respecte `BUDGET_IA_JOUR` ; en local les lectures sont simulées.
- Tu ne corriges RIEN. Tu observes, tu notes, tu proposes. Tu ne supprimes aucune donnée.
- Lis d'abord `CLAUDE.md` (racine) puis `baticlair/CLAUDE.md` pour les règles du produit.

## Ce que tu rends
Un rapport court en français simple, sans jargon : pour chaque problème, la gravité (Bloquant / Gênant / Détail), où ça se passe (écran ou e-mail), ce que tu as fait, ce que tu attendais, ce que tu as vu, et ta proposition. Termine par ce qui marche bien.
