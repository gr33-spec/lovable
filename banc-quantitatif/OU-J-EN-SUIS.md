# Où j'en suis (banc du calcul) — à lire en premier à chaque reprise

Mis à jour : 22 novembre 2026, soir. Lire d'abord « DERNIER ÉTAT » plus bas. Détail d'avant : `ETAT.md`, `A-TRANCHER.md`, `COMPTE-RENDU.md`.

## Score
- Banc du calcul : **98 sur 99** (fiche `roofing-2026.11.22-75`). Objectif de Greg (95 %) atteint.
- Rejouer : `cd baticlair/packages/domain && npx vitest run test/banc-couverture.test.ts` ; enregistrer : `BANC_MAJ=1 …` ;
  voir un chantier : `BANC_VOIR=C05 … --reporter=verbose`. La liste juste : `cd banc-quantitatif && node outils/exporter-banc.mjs`.
- Dernière chaîne complète verte : fiche -74 (fusion), moteur 1331, serveur 921, parcours 359 (22 novembre).

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
- AJOUT 2, CORRIGÉ par Greg le 22 novembre (lot À PART, après le calcul, touche l'écran). Plus de « ? » : une petite FLÈCHE
  discrète sur la ligne, qui déroule le détail du calcul juste en dessous.
  - Un poste par ligne, en mots simples. Exemple pour « 7 252 ardoises » : Surface 150 m² × 39,5 = 5 925 · Arêtiers 12 m ×
    26 = 312 · Égout 20 m = … · Faîtage 10 m, 1 rang = … · Lucarnes (ta réponse) = … · Perte 5 % = …
  - Chaque poste se corrige d'un toucher, le total se recalcule tout de suite. Un poste corrigé à la main est marqué
    « modifié par toi ». Les valeurs par défaut sont signalées.
  - Lucarnes : la quantité vient TOUJOURS de la réponse de l'artisan, jamais estimée à sa place.
  - D'abord l'ardoise et la tuile plate, puis toutes les lignes calculées, même affichage.
  - Bulle de première utilisation : « Touche la flèche pour voir le calcul », une seule fois, disparaît au toucher.
  - Le détail n'apparaît ni dans le PDF ni dans l'e-mail au négoce.
  - Conséquence pour le moteur : il faudra que le calcul sorte ses POSTES (libellé, mesure, taux, résultat, par défaut ou
    non), pas seulement une phrase de précision.
- À VÉRIFIER ET DIRE (sans coder) : où en est l'apprentissage des corrections (retenu pour l'artisan ; même correction par
  plusieurs couvreurs → remonte pour devenir une règle après validation).

## Fait
- Lots 1 à 4 (fiches -63 à -67) : 49 → 81. Rapport rendu.
- Fiche -68 : mots de l'arêtier zinc précis ; « jouée » reste un ouvrage. Tests serveur des crochets en boîtes.
- Fiche -69 (en cours) : « 1 descente » jamais « 1 pièce » de tube ; tuile Terreal Volnay PV au catalogue. 83 sur 100.

- Fiche -70 : réponses 5, 6, 7, 10 faites (bac acier sans + 1, vis 8/m², faîtière HP 10 demi-ronde 2,5/m, mortier de faîtage
  7,5 kg/m). Réponse 8 EN PARTIE : une sortie de ventilation ÉCRITE sur tuile donne tuile à douille + lanterne (ma lecture
  de « l'article s'adapte au matériau » : à dire à Greg) ; la Suggestion « Sortie de ventilation » (AJOUT 1) reste à faire.
  Moteur 1305 verts ; serveur et parcours PAS rejoués depuis la fiche -69.

## DERNIER ÉTAT (22 novembre, soir) : fiche `roofing-2026.11.22-75`
- **Banc : 98 sur 99 (99 %)** : entraînement 63/64, examen 35/35. Reste faux : feuilles de zinc de l'abergement (C05, 3
  contre 4) ; crochets à pointe de C11 hors compte (« incertain »).
- Fait (-75) : liteaux × 1,10 (aboutage) × 1,05 ; faîtière fibres-ciment « Quelle faîtière ? » (Demi-ronde, Angulaire,
  D'aération ; longueurs utiles Cedral) ; une mesure en mètres d'un article en pièces n'est jamais une quantité.
- Tests du moteur et du serveur à adapter : confiés à un agent (il ne touche qu'aux tests). Puis : parcours de l'écran
  COMPLETS (ordinateur + téléphone) AVANT de proposer de pousser (exigence de Greg du 22 novembre).

## Consignes de Greg du 22 novembre (soir)
- Ne fusionner RIEN dans la branche de test sans son accord. Avant de proposer de pousser : moteur, serveur ET parcours.
- Vérifié le 22 novembre : AUCUN commit de ma discussion sur la branche de test ; ma branche n'y est pas. La case « Pointes
  pour liteaux » vient d'une autre discussion (session …eSR2whwoenEzNd4TQZ, commits d03ce052 et 41834731 du 20 novembre,
  fusion 1f798072 du 21 novembre). L'autre discussion adapte ses 40 parcours ; ne pas m'en occuper.
- Contre-liteaux : Greg demande s'ils doivent suivre les 10 % d'aboutage → mon avis à lui donner.

## PROCHAIN LOT : calculateur de feuilles de zinc (Greg, 22 novembre), dans la FICHE, pas dans le cœur
- Zinguerie sur mesure (abergements, bandes, solins, habillages). Par pièce, deux questions à boutons : développé (20, 25,
  33, 40 cm, « autre ») et longueur des pièces (1 m ou 2 m). La longueur en ml vient du devis.
- Feuilles de 2 × 1 m : pièces = ml ÷ longueur, arrondi au-dessus ; bandes par feuille = 100 cm ÷ développé, arrondi en
  dessous ; feuilles = pièces ÷ bandes par feuille, arrondi au-dessus. Ex. 10 ml, pièces de 2 m, dév. 20 → 5 pièces, 5 bandes
  par feuille → 1 feuille.
- Regrouper les pièces de même longueur sur les mêmes feuilles quand ça réduit le total.
- Calcul affiché sous la flèche (« 5 pièces de 2 m × 20 cm = 1 feuille 2 × 1 m »), quantité modifiable.
- Pas de recouvrement ajouté. Développé > largeur de feuille, ou « je ne sais pas » → « Combien de feuilles ? ».
- Règle changée à dire : avant, le développé ne se demandait jamais pour des feuilles (Greg, 10 octobre).
- Idée de mise en œuvre : la fiche dit la feuille (2 × 1 m) et les deux questions ; le cœur n'a qu'un rangement générique
  de bandes dans des feuilles (aucun mot de couverture). Pour 1 m : deux pièces par bande de 2 m (à vérifier avec Greg).

## État précédent (22 novembre, après-midi) : fiche `roofing-2026.11.22-74` (fusion de la branche de test)
- Avant fusion, chaîne COMPLÈTE VERTE sur la -73 : moteur 1313, serveur 921, site construit, parcours 354 (ordinateur +
  téléphone), 0 échec.
- Fusion de `claude/saas-achat-artisans-prompt-1lyihx` (23 commits : suggestions sans limite, pointes de liteaux, fixations,
  kits Velux, dauphins, tuiles de rive en suggestion, accueil premium) dans ma branche. Conflits réglés en gardant les deux
  côtés. Moteur 1331 verts, banc 96 sur 99 inchangé. Chaîne complète relancée sur le code fusionné (résultat à lire).
- CHAÎNE COMPLÈTE VERTE SUR LE CODE FUSIONNÉ (22 novembre, soir) : moteur 1331, serveur 921, site construit, parcours 359
  sur ordinateur + téléphone (1 lent relancé seul : vert). Parcours adaptés à l'étape « Suggestions » (pointes de liteaux de
  l'autre discussion, sortie de ventilation) : aides `continuerSansSortieDeVentilation` et `continuerSansSuggestionParApi`
  dans `apps/web/e2e/discussion.ts`, rendues générales.
- Rien sur la branche de test ni sur test.mobiiz.fr : rapport à Greg rendu, J'ATTENDS SON ACCORD pour pousser.
- À signaler à Greg : la case « Pointes pour liteaux » (autre discussion) s'affiche aussi sur une liste d'ardoises dictée en
  pièces, sans liteaux ; la carte dit « J'ai lu ton devis » sur une liste sans devis.

## État précédent (22 novembre) : fiche -73
- **Banc : 96 sur 99 (97 %)** : entraînement 61/64 (95,3 %), examen 35/35. Objectif de 95 % atteint (une ligne « incertaine »
  hors compte : crochets à pointe de C11). Moteur 1312 verts.
- Fiche -73 : fibres-ciment 40×24 à 27,1 au m² (Cedral + Cembrit) ; deux lignes d'un même ouvrage qui n'écrivent pas la même
  mesure → la question se pose (`sansRediteDeLaQuantite` dans `par-le-code.ts`).
- Serveur : 921 verts sur la -72 (pas rejoué sur la -73 ; `dist` PAS reconstruit tant que les parcours tournent).
- Parcours Playwright : passage sur la -72 arrêté à 1 h 30 (trop long), une vingtaine d'échecs sur `ordinateur` (assistant,
  parcours-artisan, recentrage, deux-parcours, negocie-humain, achat-groupe). `dist` du moteur et site RECONSTRUITS sur la -73.
  Adaptation confiée à un agent (il ne touche qu'à `apps/web/e2e/`). À sa fin : lire son rapport (vrais défauts d'écran),
  commit, rejouer serveur complet sur la -73 (40 min, seul), puis parcours complets, puis rapport à Greg.
- 22 novembre (suite) : parcours adaptés par l'agent, tous verts sauf « 36 m de liteaux » → c'était un vrai défaut, corrigé
  dans le moteur : la sortie de ventilation ne se propose que si la couverture elle-même est écrite avec sa surface. Moteur
  1313 verts, `dist` et site reconstruits. Les cinq fichiers de parcours qui utilisent les aides de l'agent sont relancés
  sur ordinateur (certaines listes sans surface ne verront plus la case : retirer le passage là où c'est le cas).
- 22 novembre (suite 2) : les passages ajoutés par l'agent dans assistant-mobiiz, negocie-humain, recentrage, responsive et
  trois de parcours-artisan sont retirés (ces listes n'ont pas de surface : plus de case). Six fichiers verts sur ordinateur
  (112). Chaîne complète lancée : serveur puis tous les parcours (ordinateur + téléphone), en une seule commande.
- Défauts d'écran vus par l'agent, PAS corrigés (à dire à Greg) : (a) la carte « Suggestions » dit « J'ai lu ton devis »
  même pour une liste écrite à la main ou dictée ; (b) l'API répond « prêt », `peut_partir: true`, alors que l'écran attend
  encore l'étape « Suggestions » ; (c) la question de l'égout et les nouveaux nombres ne sont couverts par AUCUN parcours à
  l'écran (les devis d'ardoise des parcours ont tous une gouttière) : un parcours à ajouter.
- Les 3 lignes encore fausses : liteaux C01 (+ 10 % d'aboutage ?), feuilles de zinc de l'abergement C05 (3 contre 4),
  faîtières fibres-ciment C10 (le devis ne dit pas laquelle : question « Quelle faîtière ? » à proposer à Greg).
- Demande de Greg du 22 novembre : l'AJOUT 2 devient une flèche qui déroule le détail (voir plus bas).

## État précédent (22 novembre, tôt) : fiche -72
- Fiche -72 : suggestion « Sortie de ventilation » sur les 7 couvertures (`avecSortieDeVentilation` dans `roofing.ts`,
  `suggested.unlessWorks`), test permanent `packages/domain/test/reponses-greg-21-novembre-soir.test.ts`. Moteur 1312 verts,
  banc 94 sur 99.
- Serveur sur la fiche -71 : 903 verts, 18 rouges dans 7 fichiers (commande-claire-negoce, envoi-fournisseur, infos-chantier,
  je-ne-sais-pas-aux-bacs, partner-keys, quantitatifs, version-figee) : la question de l'égout et les ardoises en plus quand
  une gouttière ou un faîtage est écrit. Adaptation confiée à un agent ; à sa fin : relire son rapport (chaque nombre
  vérifié par la formule), relancer tout le serveur (40 min, seul), puis les parcours Playwright, puis rapport à Greg.
- 22 novembre : les 7 fichiers du serveur adaptés par l'agent (helper `apps/api/test/support/egout.ts`), verts ensemble
  (44 tests). Chaîne complète du serveur relancée sur la -72, puis parcours à rejouer.
- Défauts relevés par l'agent, PAS corrigés : (a) devis bacs + ardoises : la question de l'égout (et la qualité d'ardoise)
  disparaît quand le façonnage est répondu, puis revient après la longueur des bacs ; (b) libellé tronqué « Couverture zinc
  joint debout à » tant que la longueur des bacs manque ; (c) le test `version-figee` fabrique son ancienne version avec la
  fiche du jour : il ne prouve pas qu'un vrai quantitatif d'avant le 21 novembre se rejoue (à vérifier avant la mise en
  ligne : un quantitatif déjà validé ne doit pas se rouvrir avec la question de l'égout).
- TANT QUE serveur et parcours ne sont pas verts : lot PAS prêt pour le site de test.

## État au 21 novembre, nuit : fiche -71
- Moteur 1305 verts, banc 94 sur 99. Serveur : vert sur la fiche -70 (921) ; relancé sur la -71 (résultat à lire : des tests
  d'ardoise du serveur vont sûrement demander la réponse « Oui » à `param:egout_compris`, comme ceux du moteur). Parcours
  Playwright : PAS rejoués depuis la fiche -68.
- Ajouts au cœur : `askOnlyAfter` et `silentDefault` sur une donnée (`model.ts`, `schema.ts`), `si()` paresseux
  (`expression.ts`), `fromWorks` lu par le code et mots jamais demandés lus sur les lignes de fourniture (`par-le-code.ts`).
- Défauts connus, pas corrigés (d'avant, mais plus fréquents) : tant que la question de l'égout attend, la ligne des crochets
  cités n'est pas dans la liste, et une ligne « crochets, 1 lot » à part sort telle qu'écrite. Tout revient après la réponse.
- Rapport des « 10 réponses » rendu à Greg le 21 novembre, nuit. PAS prêt pour le site de test tant que serveur et parcours
  ne sont pas verts sur la -71.
- PROCHAINES ÉTAPES : (a) lire le résultat du serveur, adapter ses tests (réponse « Oui ») ; (b) rejouer les parcours ;
  (c) AJOUT 1, suggestion « Sortie de ventilation » sur chaque couverture (emplacement `suggested`, pas si une sortie de toit
  est écrite) ; (d) rives d'ardoise 0,16 m²/m ; (e) lot « ? » et bulle ; (f) étape 3.

## Détail de la fiche -71 (historique)
- Banc : **94 sur 99** (entraînement 59/64, examen 35/35). Une ligne mise « incertaine » : crochets à pointe de C11.
- Fait dans `roofing.ts` : ardoises = (surface + 0,66 m²/m d'arêtier + 0,50 m²/m de noue) × ardoises au m² + un rang au
  faîtage et à l'égout, puis 5 % ; égout = gouttière écrite, sinon question `egout_compris` (Oui/Non) puis `egout_a_ajouter`
  (champ `askOnlyAfter`, nouveau dans `model.ts`/`schema.ts`, filtré dans `lecture.ts`) ; `si()` ne lit que la branche
  retenue (`expression.ts`) ; ouvrage `remaniage-ardoises` (question `ardoises_a_prevoir`, aucune marge).
- Référence du contrôleur mise à jour dans `outils/exporter-banc.mjs` (C01 4107, C05 7771 et 16 boîtes, C08 170, C11 6294 et
  13 boîtes). ATTENTION : ces nombres sont ceux du moteur avec les règles de Greg, vérifiés à la main pour C01 seulement.
- 56 tests du moteur à adapter (la question de l'égout apparaît sur tout devis d'ardoise sans gouttière) : confiés à un
  agent ; à sa fin, relire son rapport, bump version -71, CHANGELOG, snapshot, build, commit, push.
- Lignes encore fausses : liteaux C01 (988 contre 893 : le contrôleur ajoute 10 % de chute d'aboutage, la fiche ne tranche
  pas) ; feuilles de zinc de l'abergement C05 (4 contre 3, débit absent de la fiche) ; C10 fibres-ciment (liteaux : le devis
  écrit 100 m² sur une ligne et 110 sur les autres ; ardoises selon le recouvrement ; faîtières).
- À DIRE À GREG : (1) arêtier en bande ZINC : j'ai pris 0,66 m²/m comme le fermé (sa réponse ne parlait que du 3 biaises ; le
  manuel donnerait 0,50) ; (2) rives d'ardoise 0,16 m²/m PAS encore branchées (le moteur ne connaît pas la longueur des
  rives d'un toit d'ardoise) ; (3) crochets : boîtes de 500 partout, la fiche dit 700 pour le crochet à pointe → question
  « agrafe ou pointe ? » ; (4) liteaux : + 10 % de chute d'aboutage en plus des 5 % ? ; (5) la question de l'égout se pose
  aussi sur des jouées de lucarne en ardoise ; (6) sortie de ventilation ÉCRITE sur tuile = tuile à douille + lanterne ;
  (7) 30 mm par jonction : 20 ml tout rond = 6 longueurs.

## Reste (après la fiche -70)
- Réponses 1 à 4 (ardoise : arêtier 26/m, faîtage 1 rang, rive 0,16 m²/m, noue 0,50 m²/m, question de l'égout) : le plus gros.
- Réponse 9 (remaniage : aucune ardoise d'office, question). AJOUT 1 (suggestion sortie de ventilation).
- « par défaut » à afficher sur la faîtière HP 10 et le mortier (aujourd'hui : dans la précision du mortier seulement).
- Rejouer serveur (922 tests, 40 min, seul) et parcours avant de dire « prêt ».

## Reste (ancienne liste)
1. Finir -69 : deux tests de `test/referential.test.ts` échouent depuis l'ajout de la Volnay ; puis build, pousser.
2. Lot « 10 réponses » + référence du contrôleur (`outils/exporter-banc.mjs`) + AJOUT 1.
3. Mes lignes sans attendre : feuilles de zinc de l'abergement (C05 : 3 contre 4, la fiche ne donne pas le débit),
   faîtière fibres-ciment (C10), fibres-ciment selon le recouvrement, crochets à pointe en boîtes de 700 (fiche) contre
   agrafe 500 : question « agrafe ou pointe ? » à prévoir.
4. Vérifier l'apprentissage des corrections et le dire à Greg.
5. Lot « ? » et bulle (écran).
6. Étape 3 : questions par le code, noms et bref par le code, méthode 11, examen.
7. À signaler à Greg : 30 mm par jonction fait 6 longueurs pour 20 ml tout rond (pas encore de réponse).

## Apprentissage des corrections : état vérifié le 21 novembre (lecture seule, à dire à Greg)
Existe (depuis le 24 octobre, `docs/DECISIONS.md:109`) :
- Pour l'artisan : nom, précision et quantité d'une ligne calculée, retenus au 2e chantier (`regle_apprise`,
  `packages/domain/src/apprentissage/habitudes.ts`, `apps/api/.../habitudes.service.ts`), réappliqués avec « Ajusté selon tes
  habitudes » et « Annuler ». Produit choisi et réponse d'habitude (façonnage…) gardés par la mémoire d'entreprise.
- Pour tous : à 3 artisans, une règle « proposée » dans Admin › pilotage (« Corrections proposées par les artisans »),
  appliquée seulement après « Oui, pour tout le monde ». Admin › « Corrections les plus fréquentes » (90 jours).
- Tests : `apps/api/test/apprentissage.test.ts`, `habitudes.test.ts`, `learning.test.ts`, domaine `apprentissage-habitudes.test.ts`.
Manque :
- Pas retenu : retrait d'une ligne calculée, ajout ou correction d'une ligne reprise telle qu'écrite, changement d'unité.
- L'écran des 90 jours ne compte pas les corrections faites d'un geste sur une ligne calculée (action `correct`).
- Deux circuits séparés (écran 90 jours / règles proposées). Un retrait ou un ajout fréquent ne devient jamais une règle.
- Pas d'écran où l'artisan voit et efface ses habitudes apprises (non trouvé). La règle se retrouve par le NOM de la ligne :
  si le nom change d'un devis à l'autre, elle ne s'applique pas (à vérifier).
- Une règle validée ne change pas la fiche du métier : elle se pose sur la ligne.
