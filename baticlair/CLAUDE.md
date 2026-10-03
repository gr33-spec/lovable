@AGENTS.md

# BatiClair — règles de travail

## Référentiel métier (source de vérité)

`docs/referentiel-couverture.md` est le référentiel quantitatif couverture-étanchéité écrit par le fondateur (couvreur). Il fait foi pour :

- les ratios, règles de conversion et conditionnements (sections 1 à 18) ;
- le modèle de données matériau / règle / ouvrage (section 19) ;
- le parcours conversationnel et la règle des 10 ans (section 21) ;
- le mandat d'architecture : un métier = un dossier de référentiel, moteur générique, plan avant code (section 22) ;
- l'amélioration continue et le coût IA (section 23) ;
- le périmètre du MVP : jusqu'à l'envoi au fournisseur (section 24).

Avant de toucher au moteur, aux règles ou aux écrans, lire la section concernée. Tout chiffre codé doit citer sa section ou sa source ; un chiffre sans source est une hypothèse à faire valider par l'artisan, jamais une quantité affichée comme certaine.

## Règles produit non négociables

- Aucune quantité inventée : l'IA lit une fois, le code déterministe calcule ensuite.
- La pente est en degrés partout, jamais en % (un % lu dans un devis est converti). Pente inconnue → 45° par défaut, affichée comme hypothèse, boutons 30° / 35° / 45° / autre.
- Une surface en m² dans un devis de couvreur est une surface de toiture.
- Une mesure du devis n'est jamais présentée comme une quantité d'article.
- L'app ne demande JAMAIS une quantité à l'artisan : elle calcule avec les hypothèses par défaut et les dit. Si une donnée manque vraiment : UNE question courte avec des boutons de valeur (+ « Je ne sais pas »), jamais « quelle quantité ? ». Test permanent : `packages/domain/test/jamais-de-quantite-demandee.test.ts`.
- Pas de correction spécifique à un devis : chaque cas devient un test permanent.
- Pas de contenu DTU protégé recopié ; pas de chiffre fabricant non sourcé.

## Commandes utiles

- `pnpm --filter @baticlair/domain build` (l'API importe `dist`)
- `pnpm -r typecheck`, `pnpm -r lint`, `npx vitest run` dans `packages/domain` et `apps/api`
- e2e : `pnpm --filter @baticlair/web build` puis `npx playwright test` dans `apps/web`
