# État du banc d'essai (pour reprendre au prochain « continue »)

Branche : `claude/quantitatif-benchmark-methodes-pymtqy`. Dossier : `banc-quantitatif/`. Rien n'est modifié dans l'appli.
Moteur de calcul : copie de la branche de test (`outils/prepare.sh`, commit 9d79748e, fiche roofing-2026.11.20-62). Aucune clé Anthropic utilisée.

## Phase 2 (depuis le 21 novembre 2026) : la correction dans l'appli

Décisions de Greg : le calcul d'abord ; le « chantier en bref » refait par le code ; essai avec la vraie clé seulement
après la correction du calcul, coût annoncé avant. On ne garde que la méthode 11 (gagnante) et la 0 (secours et référence) ;
les méthodes 1 à 10 sont dans `archives/`. La branche de test est fusionnée dans celle-ci (à refaire souvent).

Objectif : 95 % de lignes justes contre la liste du contrôleur, sur les 15 chantiers et sur l'examen.

- [x] Étape 1. Banc du calcul, sans IA : `baticlair/packages/domain/test/banc-couverture.test.ts` (15 chantiers dans
      `test/banc-couverture/`, tableau dans `SCORE.md`). Départ : 49/98 (50 %).
      Rejouer : `cd baticlair/packages/domain && npx vitest run test/banc-couverture.test.ts` ;
      après une correction : `BANC_MAJ=1 npx vitest run test/banc-couverture.test.ts` (refusé si une ligne baisse).
      La liste juste se régénère par `node outils/exporter-banc.mjs` (dans `banc-quantitatif/`).
- [ ] Étape 2. EN COURS. Banc : 56/98 (57 %) après deux lots (fiches roofing-2026.11.21-63 et -64). Questions de métier
      ouvertes : `A-TRANCHER.md`. Reste côté code (sans attendre Greg) : fenêtres et raccords en deux lignes (C05, C12) ;
      « 1 ens » avec la mesure dans le texte (C05 noues, C12 rives) ; descente « 1 u » de hauteur inconnue (C08) ; abergement
      de périmètre inconnu (C13) ; bande porte-solin non dite (C05) ; ardoise « identique à l'existant » (C08) ; « Quelle
      tuile ? » (C15) ; tuile canal (C06) ; faîtière de bac acier (C07) ; sortie de toit en une ou deux lignes. Puis la fiche
      (bac acier, canal, fibres-ciment) avec deux sources. Outil : `BANC_VOIR=C05 npx vitest run test/banc-couverture.test.ts --reporter=verbose`.
- [ ] Étape 2 (suite). Corriger : a) les erreurs de la lecture de référence ; b) le moteur qui ne suit pas la fiche ; c) la fiche.
- [ ] Étape 3. La lecture : questions par le code, noms et bref par le code, méthode 11, examen.

Règles de Greg qui passent avant la fiche et le contrôleur : un article non dit va en Suggestions (la naissance aussi) ;
ne jamais demander le pureau ; « je plie » une fois pour tout le devis ; zinc naturel par défaut ; lucarnes et raccords :
on demande ; toute ligne « à chiffrer » a sa question ; rien de propre à la couverture dans le cœur.
