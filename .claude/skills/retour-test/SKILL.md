---
name: retour-test
description: Traiter un retour de test du fondateur, en général une capture iPhone de BatiClair avec un défaut (ligne en trop ou manquante, mauvaise couleur, question absente, texte coupé). Retrouver la règle du référentiel, écrire le test qui échoue, corriger, montrer une capture avant de fusionner, résumer court.
---

# Retour de test : de la capture à la correction fusionnée

Charger aussi la skill `referentiel` : la règle numéro un et la section 49 priment.

## 1. Lire la capture

- Noter ce que l'écran montre, mot pour mot : désignation, quantité, couleur (vert, orange, gris), raison, question, bouton.
- Retrouver l'écran du parcours §48 (dépôt, analyse, questions, liste, envoi) et le composant :
  - écran des questions : `QuestionsScreen` (`apps/web/src/components/journey.tsx`) ;
  - liste : `supply-list.tsx` (`CardActions`) ;
  - envoi : `quote-preview.tsx`, `project-price-requests.tsx`.
- Retrouver le devis : un devis réel déjà anonymisé dans `packages/domain/test/devis-reels/`, sinon l'anonymiser là. On garde seulement désignations, quantités et unités, jamais de nom ni d'adresse. Le PDF n'est jamais commité.

## 2. Retrouver la règle

- Chercher la section du référentiel (`docs/referentiel-couverture.md`) qui dit ce que l'écran aurait dû montrer. En général :
  - §49.1 : d'où vient chaque ligne, un article écrit ne disparaît jamais ;
  - §49.2 : la quantité, et « Info manquante » orange ;
  - §49.4 : les questions, avant le calcul et une seule fois ;
  - §49.8 : la carte orange ;
  - §48.6 : le façonnage pièce par pièce ;
  - §47.8 : les mots du comptoir.
- Citer la section et la phrase exacte dans le test et dans le résumé.
- Chercher la **cause**, pas seulement le symptôme. Par exemple : une question restée sans réponse jusqu'à la liste, ou un mot du devis non reconnu par un emplacement (`keywords`). Corriger la cause, à l'endroit le plus général (le moteur ou le tiroir), jamais un cas propre à un seul devis.

## 3. Écrire le test qui échoue

- Domaine : `packages/domain/test/<règle>-<devis>.test.ts`, avec `readQuote` (et `applyRuleConfirmations` pour voir les couleurs comme l'API).
- API si le défaut passe par une route : `apps/api/test/<règle>.test.ts`.
- e2e si le défaut est un geste ou un affichage : `apps/web/e2e/parcours-artisan.spec.ts`, sur téléphone et sur ordinateur.
- Le lancer et le voir échouer pour la bonne raison, avant de toucher au code.

## 4. Corriger

- La correction la plus petite qui fait passer le test sans casser les tests permanents.
- Si le tiroir change : monter la version, compléter le `CHANGELOG.md`, puis `npx vitest run -u` et relire le diff des comptes rendus.
- Vérifier que le test échoue sans la correction (`git stash` du code, relancer, `git stash pop`).
- Tout relancer : domaine, API, web (types, lint, build), e2e.

## 5. Capture avant fusion

- Rejouer l'écran sur iPhone (projet `telephone`, Pixel 7) avec un parcours Playwright temporaire, hors du dépôt ou supprimé avant le commit, sur le même devis ou sur sa fixture.
- Envoyer la capture « après » au fondateur avec le résumé, puis fusionner : PR petite, CI verte, fusion par merge, attente du déploiement.

## 6. Résumé court (en français)

Un bloc par point du retour, trois lignes chacun :

- **Section** : la section du référentiel concernée (par exemple « §49.2 »), avec la phrase qui s'applique.
- **Ce qui a changé** : avant → après, avec les mots de l'écran, et la cause trouvée. Si une règle du référentiel a changé : « Règle changée : §X, avant → après », plus la nouvelle version du référentiel.
- **À décider de ton côté** : ce qui reste ouvert (un chiffre à valider, un choix de règle, un cas non couvert), ou « rien ».

Terminer par une ligne : les tests permanents ajoutés et le numéro de la PR.
