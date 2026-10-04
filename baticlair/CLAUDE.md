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
- l'annexe fournisseur « détail du devis sans prix » (section 42) ; l'envoi fournisseur : un seul générateur, le mail et le PDF ont le même contenu en trois blocs, zéro IA, aucun prix (test permanent `apps/api/test/envoi-fournisseur.test.ts`), notifications demandées au premier envoi, lien « une question ? » en v3.1 (section 43) ;
- les infos chantier facultatives : note, mesures, croquis, lecture sans IA, phrases d'exclusion, hiérarchie des sources, 7 tests (section 44).

Avant de toucher au moteur, aux règles ou aux écrans, lire la section concernée. Tout chiffre codé doit citer sa section ou sa source ; un chiffre sans source est une hypothèse à faire valider par l'artisan, jamais une quantité affichée comme certaine.

## Règles produit non négociables

- Aucune quantité inventée : l'IA lit une fois, le code déterministe calcule ensuite.
- La pente est en degrés partout, jamais en % (un % lu dans un devis est converti). Pente inconnue → 45° par défaut, affichée comme hypothèse, boutons 30° / 35° / 45° / autre.
- Une surface en m² dans un devis de couvreur est une surface de toiture.
- Une mesure du devis n'est jamais présentée comme une quantité d'article.
- L'app ne demande JAMAIS une quantité à l'artisan : elle calcule avec les hypothèses par défaut et les dit. Une question se pose si sa réponse change une quantité commandée de plus de 3 %, change une unité de commande ou change un matériau : courte, à boutons, TOUTES SUR UN SEUL ÉCRAN (retour du fondateur, 2026-10-04 : l'artisan enchaîne les réponses puis valide une fois, `questions-form.tsx`), dans l'ordre du levier le plus gros, et il n'y a pas de maximum ; un doute = une question (le moteur découvre d'avance les questions qui suivent une réponse) (section 41 ; elle remplace « 4 questions au plus »). Jamais « quelle quantité ? ». Test permanent : `packages/domain/test/jamais-de-quantite-demandee.test.ts`.
- Le test du fournisseur (section 40) : chaque ligne « À commander » doit pouvoir être chargée dans le camion sans rappeler l'artisan. Jamais de m² pour ce qui se pose en éléments, jamais de ml de métal sans largeur ni épaisseur, jamais « lot », « forfait », « ensemble » : le moteur le verrouille (41.3), test permanent `packages/domain/test/test-du-fournisseur.test.ts`.
- Métal façonné (joint debout, bandes zinc, solins, abergements, noues, faîtages, rives) : la question « tu façonnes toi-même ou tu commandes façonné ? » (clé unique `faconnage`). Je façonne : zinc en feuilles de 2 × 1 m pour les petits ouvrages (§25.2), bobine en kg pour le joint debout ; commandé façonné : pièces aux dimensions. Gouttières et descentes ne sont JAMAIS façonnées : aucune question.
- Tuiles canal : famille `roof_tile_canal` qui affine `roof_tile` (`refines`) ; le mot le plus précis de la ligne l'emporte, jamais une tuile à emboîtement pour « tuile canal ». Modèle douteux → question. Test : `packages/domain/test/tuiles-canal.test.ts`.
- « Le fournisseur chiffrera » est le DERNIER recours : le moteur tente d'abord (question à boutons, générique « modèle à préciser » si l'artisan refuse les modèles proposés). N'y tombent que les ouvrages sans règle (jouées de lucarnes) et les lignes hors métier. Test permanent : `packages/domain/test/dernier-recours.test.ts`.
- Règle des 3 % (§41) appliquée par le moteur : pour chaque question à boutons, le calcul est rejoué avec chaque réponse ; si toutes donnent la même commande à 3 % près (mêmes unités, mêmes articles), la première vaut hypothèse dite et modifiable, la question n'est pas posée ; sinon les questions se posent dans l'ordre du levier le plus gros (`computeWithAnswers`, test `packages/domain/test/questions-3-pourcent.test.ts`).
- Habitudes d'entreprise : un produit choisi ou une réponse d'habitude (`kind: "artisan_preference"` : façonnage, épaisseur du zinc, bacs longs) est mémorisé à chaque réponse ; établi au 2e chantier différent, il n'est plus demandé (dit « Habitude de votre entreprise », modifiable d'un tap) ; un choix contraire le fait reproposer. Tests : `packages/domain/test/rampant-long-panneaux-habitudes.test.ts`, `apps/api/test/habitudes.test.ts`.
- Infos chantier facultatives (§44, `docs/infos-chantier-facultatives.md`) : la note de l'artisan (chantier, `siteNotes`) et les commentaires de croquis sont lus sans IA (`readSiteNotes`) ; une mesure nommée passe devant le devis et l'explication cite les deux ; deux documents qui se contredisent font une question à deux valeurs (`plan.contradictions`), jamais un choix en silence ; la photo d'un croquis est gardée (`purpose: "sketch"`), jamais lue par l'IA. Rien n'est obligatoire. Banc de 30 phrasés (§44.2, `packages/domain/test/note-artisan-30-phrases.test.ts`) ; la note part aussi au prompt A comme contexte, en filet, jamais comme consigne ; une phrase d'exclusion (« garage non compris », « Velux fournis par le client ») retire la ligne qui nomme TOUS ses mots du « À commander » et la garde au détail sans prix, « exclu par l'artisan » ; l'explication cite la note et le devis ; une contradiction entre documents bloque la validation. Les 7 tests du §44.5 : `apps/api/test/infos-chantier-44-5.test.ts`. Tests : `packages/domain/test/infos-chantier.test.ts`, `apps/api/test/infos-chantier.test.ts`.
- Les dimensions lues par l'IA (prompt A : pente, rampant, épaisseur, en ligne ou en en-tête) entrent dans le calcul (`factsFromReading`), après le texte lu par le code, avant les hypothèses par défaut. Test : `packages/domain/test/lecture-prompt-a.test.ts`.
- Aucun texte affiché sur le quantitatif qui ne soit pas modifiable d'un tap : désignation, quantité, unité, chaque hypothèse (41.4).
- Une quantité de ligne vaut d'abord pour l'ouvrage de sa ligne (`SiteFact.workItemId`) : 200 m² d'ardoises et 20 m² de tuiles au garage sont deux surfaces, jamais une contradiction ; un autre ouvrage ne la reprend que s'il n'a rien lu lui-même (descentes → gouttière). Test : `packages/domain/test/deux-toitures.test.ts`.
- Pas de correction spécifique à un devis : chaque cas devient un test permanent.
- Pas de contenu DTU protégé recopié ; pas de chiffre fabricant non sourcé.

## Référentiels : forme, version, métiers

- Un référentiel est une donnée : il passe par `validateReferential` (schéma zod, `schema.ts`) puis `checkReferential` avant le moteur ; `loadReferential` refuse un fichier faux avec le chemin de la faute. Test : `packages/domain/test/schema-referentiel.test.ts`, qui tient aussi à jour `referentiels/couverture/referentiel.json` (export de `roofing.ts`, qui reste la source de vérité).
- Version figée par chantier : l'API enregistre l'instantané du référentiel à sa version (`referential_snapshot`) et recalcule chaque quantitatif avec SA version ; jamais les règles du jour. Test : `apps/api/test/version-figee.test.ts`.
- Un métier = un tiroir (§22) : `referentialFor(métier)` (registre `REFERENTIALS` : couverture, plâtrerie). La porte `/v1/quantitatifs` prend le champ `metier`, sinon le métier de l'entreprise ; un métier sans tiroir reçoit 422 `no_referential` avec la liste des métiers disponibles, jamais les règles du couvreur. Test : `apps/api/test/referentiel-par-metier.test.ts`.
- Un second métier existe : `PLATRERIE_REFERENTIAL` (cloison 72/48), calculé par le même moteur sans changement ; ses chiffres non sourcés sont en brouillon : rails, montants et entraxe restent `draft` (test permanent `packages/domain/test/referentiel-par-metier.test.ts`), donc « à chiffrer », jamais commandés comme certains. Toute donnée hors référentiel du fondateur reste `draft` tant qu'un professionnel ne l'a pas validée.

## Partenaires

- Clé API partenaire (`X-Api-Key: bc_…`, module `partners`) : une clé par intégration, hachée en base, montrée une seule fois, rattachée à l'entreprise et à son auteur ; quota mensuel de quantitatifs créés (429 au-delà, les lectures ne comptent pas) ; révocation immédiate ; une clé ne gère jamais les clés. Test : `apps/api/test/partner-keys.test.ts`. Notice : `docs/api-quantitatifs.md`.

## Commandes utiles

- `pnpm --filter @baticlair/domain build` (l'API importe `dist`)
- `pnpm -r typecheck`, `pnpm -r lint`, `npx vitest run` dans `packages/domain` et `apps/api`
- e2e : `pnpm --filter @baticlair/web build` puis `npx playwright test` dans `apps/web`
