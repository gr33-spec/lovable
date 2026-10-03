@AGENTS.md

# BatiClair — règles de travail

## Référentiel métier (source de vérité)

`docs/referentiel-couverture.md` est le référentiel quantitatif couverture-étanchéité écrit par le fondateur (couvreur). Il fait foi pour :

- les ratios, règles de conversion et conditionnements (sections 1 à 18) ;
- le modèle de données matériau / règle / ouvrage (section 19) ;
- le parcours conversationnel et la règle des 10 ans (section 21) ;
- le mandat d'architecture : un métier = un dossier de référentiel, moteur générique, plan avant code (section 22) ;
- l'amélioration continue et le coût IA (section 23) ;
- le périmètre du MVP : jusqu'à l'envoi au fournisseur (section 24) ;
- les points singuliers et petites fournitures (section 25), les régions et matériaux dominants (section 26) ;
- le gabarit universel multi-métiers, à lire en premier (section 27) ; les règles de pose (section 28) ;
- le vocabulaire des devis (section 29), les cas de test (section 30), le plan de complétion (section 31) ;
- les schémas des fichiers de référentiel (section 32) et les sources officielles (section 33) ;
- les données fabricant qui font foi sur les sections 3, 5 et 7 : ardoise Cupa (section 34), tuiles Edilians et pentes DTU (section 35), zinc VMZINC (section 36) ; anciennes valeurs dans `referentiels/couverture/CHANGELOG.md` ;
- l'état du référentiel (section 37), l'API partenaires, API first (section 38), la compréhension et la modification du quantitatif ligne par ligne (section 39) ;
- le test du fournisseur : chaque ligne commandable telle quelle, unités interdites en sortie (section 40) ; les deux prompts système à brancher tels quels, A lecture et B chat, la règle des questions et ce que l'artisan peut modifier (section 41) ;
- l'annexe fournisseur « détail du devis sans prix » (section 42) ; l'envoi fournisseur : un seul générateur, le mail et le PDF ont le même contenu en trois blocs, zéro IA, aucun prix (test permanent `apps/api/test/envoi-fournisseur.test.ts`), notifications demandées au premier envoi, lien « une question ? » en v3.1 (section 43).

Avant de toucher au moteur, aux règles ou aux écrans, lire la section concernée. Tout chiffre codé doit citer sa section ou sa source ; un chiffre sans source est une hypothèse à faire valider par l'artisan, jamais une quantité affichée comme certaine.

## Règles produit non négociables

- Aucune quantité inventée : l'IA lit une fois, le code déterministe calcule ensuite.
- La pente est en degrés partout, jamais en % (un % lu dans un devis est converti). Pente inconnue → 45° par défaut, affichée comme hypothèse, boutons 30° / 35° / 45° / autre.
- Une surface en m² dans un devis de couvreur est une surface de toiture.
- Une mesure du devis n'est jamais présentée comme une quantité d'article.
- L'app ne demande JAMAIS une quantité à l'artisan : elle calcule avec les hypothèses par défaut et les dit. Une question se pose si sa réponse change une quantité commandée de plus de 3 %, change une unité de commande ou change un matériau : courte, à boutons, une à la fois, dans l'ordre du levier le plus gros, et il n'y a pas de maximum (section 41 ; elle remplace « 4 questions au plus »). Jamais « quelle quantité ? ». Test permanent : `packages/domain/test/jamais-de-quantite-demandee.test.ts`.
- Le test du fournisseur (section 40) : chaque ligne « À commander » doit pouvoir être chargée dans le camion sans rappeler l'artisan. Jamais de m² pour ce qui se pose en éléments, jamais de ml de métal sans largeur ni épaisseur, jamais « lot », « forfait », « ensemble » : le moteur le verrouille (41.3), test permanent `packages/domain/test/test-du-fournisseur.test.ts`.
- Tout métal façonné (joint debout, bandes zinc, abergements, gouttières, noues, faîtages, rives) : la question « tu façonnes toi-même ou tu commandes façonné ? » (clé unique `faconnage`) ; bobines en kg d'un côté, pièces aux dimensions de l'autre.
- « Le fournisseur chiffrera » est le DERNIER recours : le moteur tente d'abord (question à boutons, générique « modèle à préciser » si l'artisan refuse les modèles proposés). N'y tombent que les ouvrages sans règle (jouées de lucarnes) et les lignes hors métier. Test permanent : `packages/domain/test/dernier-recours.test.ts`.
- Règle des 3 % (§41) appliquée par le moteur : pour chaque question à boutons, le calcul est rejoué avec chaque réponse ; si toutes donnent la même commande à 3 % près (mêmes unités, mêmes articles), la première vaut hypothèse dite et modifiable, la question n'est pas posée ; sinon les questions se posent dans l'ordre du levier le plus gros (`computeWithAnswers`, test `packages/domain/test/questions-3-pourcent.test.ts`).
- Habitudes d'entreprise : un produit choisi ou une réponse d'habitude (`kind: "artisan_preference"` : façonnage, épaisseur du zinc, bacs longs) est mémorisé à chaque réponse ; établi au 2e chantier différent, il n'est plus demandé (dit « Habitude de votre entreprise », modifiable d'un tap) ; un choix contraire le fait reproposer. Tests : `packages/domain/test/rampant-long-panneaux-habitudes.test.ts`, `apps/api/test/habitudes.test.ts`.
- Les dimensions lues par l'IA (prompt A : pente, rampant, épaisseur, en ligne ou en en-tête) entrent dans le calcul (`factsFromReading`), après le texte lu par le code, avant les hypothèses par défaut. Test : `packages/domain/test/lecture-prompt-a.test.ts`.
- Aucun texte affiché sur le quantitatif qui ne soit pas modifiable d'un tap : désignation, quantité, unité, chaque hypothèse (41.4).
- Pas de correction spécifique à un devis : chaque cas devient un test permanent.
- Pas de contenu DTU protégé recopié ; pas de chiffre fabricant non sourcé.

## Commandes utiles

- `pnpm --filter @baticlair/domain build` (l'API importe `dist`)
- `pnpm -r typecheck`, `pnpm -r lint`, `npx vitest run` dans `packages/domain` et `apps/api`
- e2e : `pnpm --filter @baticlair/web build` puis `npx playwright test` dans `apps/web`
