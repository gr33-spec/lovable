# Plan d'architecture v2 — une page, avant tout code

Répond au mandat de la section 22 du référentiel (`docs/referentiel-couverture.md`). **Validé par le fondateur le 3 octobre 2026**, avec un changement : les questions par sensibilité passent avant le prompt v8. Décisions du même jour : PR #121 fusionnée sans lancement public ; bêta fermée de 10 couvreurs dès les 5 correctifs bloquants ; la pente est en degrés partout (boutons 30° / 35° / 45° / autre).

## Ce qu'on garde (ça marche, c'est testé)

- **Le moteur de calcul** (`packages/domain/src/referential/engine.ts`) : formules à unités, intervalles, tables de recouvrement, pertes, conditionnement, hypothèses par défaut, trace de chaque chiffre. 281 tests. On ne le réécrit pas : on le fait lire des JSON au lieu de TypeScript.
- **La liste d'achats** (`purchase-view.ts`, écran `purchase-list.tsx`) : J'ai compris / À acheter / À faire chiffrer / Hypothèses / questions à boutons.
- **Le flux fournisseur** : demandes de prix, dépôt des devis reçus, comparaison. Hors MVP mais déjà là, on n'y touche pas.
- **Auth, multi-entreprise, coût IA, idempotence** : en l'état, plus les correctifs de l'audit.

## Ce qu'on refait

1. **La lecture du devis** (prompt v8) : l'IA ne rend plus des lignes, elle rend des **ouvrages** (« couverture ardoise 32×22, 200 m² rampant, pente non lue ») + les **données chantier** (pente, zone via code postal, hauteur, altitude). Le code déterministe fait tout le reste. Fin du pont lignes → ouvrages (`plan.ts`, `line-roles.ts` disparaissent à terme).
2. **Les référentiels en données, un dossier par métier** :
   ```
   referentiels/
     couverture/
       materiaux.json      # unité de commande, format, conditionnement, source
       regles.json         # conversions paramétrées pente × zone × format
       ouvrages.json       # ouvrage → matériaux + règles + questions possibles
       tests/              # un cas = un devis anonymisé + liste attendue
       README.md           # résumé lisible par le fondateur
     _schema/              # JSON Schema des trois fichiers, validé en CI
   ```
   `roofing.ts` devient un export de ces JSON ; l'intégrité actuelle (`integrity.ts`) devient la validation du schéma. Un nouveau métier = un dossier, zéro ligne de moteur.
3. **Les questions dérivées de la sensibilité** : le moteur calcule la liste avec l'hypothèse basse et haute ; si l'écart dépasse 5 % de la commande, ça devient une question (boutons + « Je ne sais pas » = défaut). Sinon ça reste une hypothèse repliée. Plus de liste de questions écrite à la main.
4. **Le parcours conversationnel** (section 21) : dépôt → étapes de réflexion visibles → 3 questions max → carte quantitatif par ouvrage → bon de commande PDF → envoi fournisseur. Même composants, nouvel enchaînement.
5. **Les préférences apprises** (section 23) : chaque correction de l'artisan (pureau, format, fournisseur) est stockée par entreprise et prime sur le défaut du référentiel au prochain devis. Trois niveaux : référentiel → entreprise → ce devis.

## Choix d'architecture à acter maintenant (hors MVP mais irréversibles)

- **Identifiant stable par ligne de liste d'achats** + libellé normalisé : indispensable pour comparer plus tard les devis fournisseurs ligne à ligne. Coût nul maintenant, impossible à rattraper après.
- **Événements produit** dès le départ (devis déposé, question répondue, correction, validé, envoyé) : c'est la matière de l'amélioration continue.
- **PDF stockés hors base** (stockage objet UE) avant 100 clients.

## Ordre des chantiers

| # | Chantier | Durée | Dépend de |
|---|---|---|---|
| 0 | Correctifs bloquants de l'audit (B1–B5) | 1 sem | — |
| 1 | Bêta fermée : 10 couvreurs, écran actuel, observation | 2 sem (en parallèle) | 0 |
| 2 | Référentiels en JSON + schéma + README par métier | 1 sem | — |
| 3 | Questions par sensibilité (décision du fondateur : avant le prompt v8) | 0,5 sem | 2 |
| 4 | Prompt v8 (ouvrages + données chantier), passé sur les vrais devis | 1,5 sem | 3, clé API |
| 5 | Parcours conversationnel + bon de commande PDF | 1,5 sem | 4 |
| 6 | Préférences apprises | 1 sem | 5 |
| 7 | Lancement public couvreurs | — | 1 à 6 |

Total : ~7 semaines de développement, lancement public couvreurs mi-novembre si la bêta ne révèle rien de gros.

## Ce que je ne ferai pas

- Pas de deuxième métier avant que la couverture tourne chez de vrais clients.
- Pas de photos, pas de micro, pas de comparaison fournisseurs retravaillée avant le lancement.
- Pas de réécriture du moteur : on le nourrit en JSON, c'est tout.
