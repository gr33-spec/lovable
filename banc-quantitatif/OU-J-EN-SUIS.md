# Où j'en suis (banc du calcul) — à lire en premier à chaque reprise

Mis à jour : 21 novembre 2026, soir. Détail d'avant : `ETAT.md`, `A-TRANCHER.md`, `COMPTE-RENDU.md`.

## Score
- Banc du calcul : **83 sur 100** (fiche `roofing-2026.11.21-69`, en cours d'enregistrement). Objectif : 95 %.
- Rejouer : `cd baticlair/packages/domain && npx vitest run test/banc-couverture.test.ts` ; enregistrer : `BANC_MAJ=1 …` ;
  voir un chantier : `BANC_VOIR=C05 … --reporter=verbose`. La liste juste : `cd banc-quantitatif && node outils/exporter-banc.mjs`.
- Dernière chaîne complète verte (fiche -68) : moteur 1305, serveur 921, site construit, parcours 350 (2 mis à jour).

## Consignes en cours (Greg)
- RIEN sur la branche de test ni sur test.mobiiz.fr sans son accord : rapport d'abord. Pousser sur
  `claude/quantitatif-benchmark-methodes-pymtqy` après chaque lot. Jamais main.
- Zéro dépense sur la clé Mobiiz. Essai réel seulement après le calcul, coût annoncé avant.
- EXIGENCE : zéro ligne fausse envoyée à un négoce. Ce dont Mobiiz n'est pas sûr, il le demande ou le laisse « à chiffrer »
  avec sa question.
- En cas de doute, on demande au couvreur. Rien de propre à la couverture dans le cœur.
- Ne pas prendre la branche amazing-einstein : elle arrive par la branche de test.
- Rapport court après chaque lot : score, lignes encore fausses et pourquoi, état de l'apprentissage, lot prêt ou non pour
  le site de test.
- Tenir CE fichier à jour.

## Règles de Greg (passent avant la fiche et le contrôleur)
Anciennes : article non dit → Suggestions (naissance comprise) ; jamais demander le pureau ; « je plie » une fois pour le
devis ; zinc naturel par défaut ; lucarnes et raccords : on demande ; toute ligne « à chiffrer » a sa question.

Du 21 novembre (appliquées) : tuiles à emboîtement 5 % ; faîtières, arêtières, rives sans + 1 % ; bandes zinc 2 m sans
recouvrement avec la note ; crochets en boîtes avec le nombre de pièces ; rives G/D en deux lignes ; canal courants/couverts ;
équerre de gouttière sans effet ; gouttière PVC/alu en 4 m sur le total ; contre-liteaux 5 % ; arêtier zinc suit « je plie » ;
30 mm par jonction de gouttière zinc.

### Réponses du 21 novembre au soir (À APPLIQUER, lot « 10 réponses »)
1. Arêtier ardoise à 3 biaises : seulement le surplus, 26 ardoises au mètre (manuel du CAP).
2. Faîtage ardoise : un rang d'ardoises en plus sur la longueur du faîtage.
3. Rives et noues ardoise : chiffres du manuel, 0,16 m² par mètre de rive, 0,50 m² par mètre de noue. Anciens chiffres abandonnés.
4. Égout : la longueur de la gouttière si elle est écrite. Sinon UNE question : « Tes m² d'ardoise comprennent déjà l'égout
   et les coupes ? » Oui : rien en plus. Non : « Quelle longueur d'égout ? »
5. Faîtière de bac acier : 7 pour 12,50 m. Plus de « + 1 ».
6. Vis de bac acier : 8 au m², validé, sans question, ligne modifiable.
7. Faîtière HP 10 sans modèle écrit : demi-ronde par défaut (2,5 au mètre), sans question, marquée « par défaut », modifiable.
8. Sortie de toit : tuile à douille et lanterne en Suggestions, jamais d'office.
9. Remaniage : aucune ardoise d'office. Question : « Tu vas remanier. Je te prévois des ardoises ? Si oui, combien ? »
10. Mortier de faîtage : 7,5 kg au mètre par défaut, en sacs, modifiable.
« Mets la référence du contrôleur à jour avec ces règles. »

### Ajouts du 21 novembre au soir
- AJOUT 1 : sur toute réfection de toiture (ardoise, tuile, zinc…), si le devis n'en parle pas, Suggestion « Sortie de
  ventilation (VMC, extraction d'air) ». Même mot partout ; l'article s'adapte au matériau (tuile à douille et lanterne sur
  tuile, sortie adaptée sur ardoise ou zinc).
- AJOUT 2 (lot À PART, après le calcul, touche l'écran) : un « ? » discret sur chaque ligne calculée ; au toucher, le calcul
  en clair (« 120 m² × 39,5 ardoises au m² = 4 740 · arêtier 8 m × 26 = 208 · faîtage 10 m : 1 rang = 46 · perte 5 % »),
  valeurs par défaut signalées. Première liste d'un artisan : bulle « Touche le ? pour voir le calcul », une seule fois.
  Ni dans le PDF ni dans l'e-mail au négoce.
- À VÉRIFIER ET DIRE (sans coder) : où en est l'apprentissage des corrections (retenu pour l'artisan ; même correction par
  plusieurs couvreurs → remonte pour devenir une règle après validation).

## Fait
- Lots 1 à 4 (fiches -63 à -67) : 49 → 81. Rapport rendu.
- Fiche -68 : mots de l'arêtier zinc précis ; « jouée » reste un ouvrage. Tests serveur des crochets en boîtes.
- Fiche -69 (en cours) : « 1 descente » jamais « 1 pièce » de tube ; tuile Terreal Volnay PV au catalogue. 83 sur 100.

## Reste
1. Finir -69 : deux tests de `test/referential.test.ts` échouent depuis l'ajout de la Volnay ; puis build, pousser.
2. Lot « 10 réponses » + référence du contrôleur (`outils/exporter-banc.mjs`) + AJOUT 1.
3. Mes lignes sans attendre : feuilles de zinc de l'abergement (C05 : 3 contre 4, la fiche ne donne pas le débit),
   faîtière fibres-ciment (C10), fibres-ciment selon le recouvrement, crochets à pointe en boîtes de 700 (fiche) contre
   agrafe 500 : question « agrafe ou pointe ? » à prévoir.
4. Vérifier l'apprentissage des corrections et le dire à Greg.
5. Lot « ? » et bulle (écran).
6. Étape 3 : questions par le code, noms et bref par le code, méthode 11, examen.
7. À signaler à Greg : 30 mm par jonction fait 6 longueurs pour 20 ml tout rond (pas encore de réponse).
