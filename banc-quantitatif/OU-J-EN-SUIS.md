# Où j'en suis (banc du calcul) — à lire en premier à chaque reprise

Mis à jour : 22 novembre 2026, soir. Lire d'abord « DERNIER ÉTAT » plus bas. Détail d'avant : `ETAT.md`, `A-TRANCHER.md`, `COMPTE-RENDU.md`.

## NUIT DU 22 AU 23 NOVEMBRE (Greg : « enchaîne les lots, pousse si toute la chaîne est verte et /version bon »)
Fait sur ma branche, dans l'ordre de Greg :
1. Crochets agrafe / pointe : déjà fait (-77), tests serveur mis à jour par l'agent (5 fichiers verts).
2. Calculateur de feuilles de zinc (-79) : longueur des pièces 1 m / 2 m (une question pour le devis, 2 m par défaut),
   part de feuille additionnée sur la liste puis UN arrondi (pièces partagées), développé de l'abergement (25/33/40),
   détail sous la flèche. C11 : 7 feuilles (avant 6+1+1). D-2026-020 : 2 feuilles (avant 3).
3. Suggestions par catégorie (Couverture, Zinguerie, Fixations, Ventilation, Fenêtres de toit, Autres), 20 au plus, titres
   et comptes repliables dans la carte.
4. A-INTEGRER §3 clous d'ardoise en Suggestion (-80) ; §1 chatières (-81, `cos_deg` et cm² au moteur) ; §2 fixation des
   tuiles PAS faite (A-TRANCHER n° 10).
5. Flèche (déjà faite) + apparence d'après la maquette de Greg (`maquettes/fournitures-greg-2026-11-22.png`) : lignes
   plates, point et quantité à droite, crayon carré, « Voir le calcul » et « Valider / Préciser » sous la ligne, bandeau
   « Quantités à vérifier », « Aperçu » et « Demander les prix ». Coordination : `COORDINATION.md` (la messagerie ne touche
   pas la liste).
6. Orthographe (00dfa339) : `lecture/orthographe.ts`, devis remis au propre par le son des mots du métier, doutes en
   questions `orthographe:<mot>` ; 6 chantiers du banc écrits avec des fautes = même liste.
Banc : 98/99 (C05 feuilles 3 contre 4, à trancher). Points à trancher : `A-TRANCHER.md`, section « NUIT ».
Chaîne complète lancée sur 7786bf0e (tout sauf l'orthographe) : moteur 1 383 vert ; la suite dans b3ly2a7kz.

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
  - CONSIGNE DE GREG (22 novembre 2026, vue sur le site de test, À FAIRE DANS CE LOT) : aujourd'hui TOUTES les lignes
    calculées affichent « à vérifier », même les tasseaux et les couvre-joints validés : « si tout est à vérifier, l'artisan
    ne fait plus confiance à rien ». Règle : « À vérifier » SEULEMENT quand la ligne repose sur une valeur par défaut ou une
    hypothèse incertaine, et la flèche dit LAQUELLE. Une ligne calculée avec des règles validées et les infos du devis
    affiche seulement « Calculé ». (Message transmis par la discussion « messagerie », qui ne touche pas au calcul.)
  - MAQUETTE DE GREG (22 novembre 2026, `maquettes/fournitures-greg-2026-11-22.png`, « à titre d'information, n'hésite pas à
    faire mieux, sans rien oublier comme bouton ») : l'écran « Fournitures » refait DANS CE LOT, en même temps que la flèche.
    Ligne compacte (nom, précision dessous, point de couleur, quantité, crayon) ; « Autres fournitures » repliées ; en bas
    « Aperçu » et « Demander les prix » ; le crayon ouvre une feuille du bas (« Modifier la quantité », quantité et unité,
    « Calcul proposé » = le détail de la flèche, « Enregistrer »). Rien ne disparaît (« Envoyer une partie », valider,
    retirer, renommer, ajouter un article, « N lignes à vérifier »). La discussion « messagerie » ne touche pas à cet écran.
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

## LOT DE LA FLÈCHE (Greg, 22 novembre au soir) — FAIT SUR MA BRANCHE, chaîne en cours
Consignes de Greg (à faire ENSEMBLE) :
1. « À vérifier » seulement si la ligne repose sur une valeur par défaut ou une hypothèse incertaine, et la flèche dit
   laquelle ; une ligne calculée avec des règles validées et les infos du devis : « Calculé ». (Aujourd'hui tout est « à
   vérifier », même tasseaux et couvre-joints.) La branche de test n'avait pas encore la note de l'autre discussion le
   22 novembre à 17 h : travaillé d'après le message de Greg.
2. Écran « Fournitures » d'après la maquette de Greg (NON reçue par cette discussion : fait d'après sa description) : ligne
   compacte (nom en gras, précision dessous, point de couleur, quantité, crayon) ; « Autres fournitures » repliées en bas ;
   en bas « Aperçu » et « Demander les prix » ; le crayon ouvre une feuille du bas : « Modifier la quantité », nom, quantité
   et unité, « Calcul proposé » (le détail de la flèche, chaque poste corrigeable), « Enregistrer ». Rien ne disparaît :
   « Envoyer une partie », valider une ligne, la retirer, changer son nom, ajouter un article, « N lignes à vérifier », la
   bulle de première utilisation, « modifié par toi ». Captures petit iPhone + ordinateur, clair + sombre, AVANT de pousser.
3. Le détail (AJOUT 2) : postes en mots simples, chaque poste corrigeable, total recalculé, « modifié par toi », valeurs par
   défaut signalées, lucarnes = réponse de l'artisan, ardoise et tuile plate d'abord puis toutes les lignes ; gouttière :
   « 5 longueurs couvrent 19,88 m ». Jamais dans le PDF ni l'e-mail.
Plan : (a) moteur : `postes` sur un besoin (fiche), calculés et vérifiés (somme = besoin), + la perte ; (b) état
« calcule » / « a_verifier » par ligne avec ses raisons ; (c) API : postes et état dans la vue ; (d) écran ; (e) captures ;
(f) chaîne complète ; (g) rapport à Greg, il valide seul ce qui part.
FAIT sur ma branche (commits a0e75817 → 7fa232e3, fiche -78) :
- (a)(b)(c) moteur, état, API : faits. Clé d'un poste = `param:<donnée>@<ouvrage>` (une correction ne vaut que pour son
  ouvrage). Un produit pris par défaut dont le format est écrit sur la ligne (« Ardoises naturelles 32×22 ») n'est pas un
  défaut ; un autre se dit « Ardoises 32×22 : modèle par défaut ».
- (d) écran (`supply-list.tsx`) : point de couleur (vert, orange, jaune = modifié par toi) à la place de la bordure ; petite
  flèche « Voir le calcul : … » qui déroule les postes (« Surface 48 m² × 42,09 au m² = 2 020 », « Perte 5 % = 105 ») et les
  raisons ; bulle « Touche la flèche pour voir le calcul » une seule fois (appareil, `mobiiz.bulle-calcul`) ; crayon → feuille
  du bas (« Modifier la quantité », nom, précision, − / + et unité, « Calcul proposé » avec une case par donnée, la question
  de la ligne, nom, précision, croquis, retirer, « Enregistrer ») ; « Autres fournitures » (consommables et divers) repliées
  en bas, jamais une ligne orange ni une ligne déjà partie à part ; « Modifié par toi » aussi sur une ligne orange.
  Règle changée : une ligne « Calculé » / « Dit par toi » ne porte plus en plus « à vérifier » (point 31 du 27 octobre).
  Gardé : « Demander les prix à mes négoces » (pas « Demander les prix ») : mot validé le 28 octobre, à confirmer par Greg.
- Parcours : « la flèche du calcul » (nouveau), §49.8 « Enregistrer » au lieu de « Fermer », feuille dans l'écran, suggestions
  8 cases (pas de liteaux dans D-2026-020), aide `continuerSansSuggestionParApi` sans case = rien à répondre.
- Serveur : l'agent a mis les tests à jour (crochets agrafe / pointe, 8 cases), 5 fichiers verts.
- (e) captures : scratchpad/captures (iPhone 375 et ordinateur, clair et sombre). (f) chaîne complète lancée (b155sn0tb).
- Défaut vu sur les captures, à traiter : la ligne d'attente des crochets dit « Crochets d'ardoise inox de 11 standard,
  longueur cm » (mots du devis mal recollés) ; « Une réponse est attendue » ne nomme pas la question.

## EN LIGNE (vérifié par /version) : `b90a279e`, 22 novembre, 16 h 45 UTC
- Contenu : fiche -74 (banc 96/99, ce qui était déjà en ligne avec 9ceac7d0) + `/version` site et API + tests. Les deux
  `/version` donnent b90a279e, environnement « test ». Méthode dans CLAUDE.md (Règles de travail).
- Chaîne avant poussée : moteur 1331, serveur 927 (+ test d'isolation corrigé et relancé), parcours 361 sur 394 passés en
  entier, puis les 4 parcours retouchés relancés 3 fois sur les deux écrans (33/33). Seuls des tests avaient changé.

## SUR MA BRANCHE, PAS ENCORE EN LIGNE : fiches -75 à -77 (banc 100/101)
- Liteaux 10 % au total ; contre-liteaux 5 % (validé) ; arêtier zinc 0,50 / fermé 0,66 ; jouées sans égout ; pointes avec
  les liteaux ; faîtière fibres-ciment ; « J'ai ta liste » ; crochets « Agrafe ou pointe ? » (1/5 à pointe, UNE source).
- Moteur 1333 vert. Serveur et parcours PAS encore rejoués sur -77 : à faire avant de proposer de pousser.

## 22 NOVEMBRE (fin d'après-midi) — historique
- Greg : contre-liteaux 5 %, validé. « Vérifier la mise en ligne, c'est à toi » → adresse `/version` (site :
  `apps/web/src/app/version/route.ts` ; API : `apps/api/src/modules/health/http/version.controller.ts`, aussi `/v1/version`),
  méthode écrite dans `CLAUDE.md` (Règles de travail). Après chaque poussée : attendre que les DEUX `/version` donnent le
  commit poussé avant de dire « c'est en ligne ».
- Les autres discussions avaient les numéros de déploiement Vercel (`dpl_…`, docs/REPRISE.md) : elles avaient un accès Vercel
  que cette discussion n'a pas.
- Poussée de `/version` seule en préparation : dossier `/home/user/lot-pousse`, branche locale `version-a-pousser` =
  9ceac7d0 (en ligne) + d05484b9 (cherry-pick de cbd514b5). Chaîne complète en cours (bases `_lot`). Si verte : pousser,
  puis attendre les deux `/version`.
- Lot en cours dans le dossier habituel (fiche à passer en -76) : liteaux 10 % au total (marge par emplacement `slot`,
  nouveau champ des marges, dans le cœur et générique), arêtier zinc 0,50 / fermé 0,66 (`aretier_ferme`), jouées sans
  égout (`ownOnly`), pointes seulement avec des liteaux (`suggested.onlyWith`), « J'ai ta liste » sans devis (`devisLu`).
  Banc 98/99. Tests du moteur confiés à un agent ; recherche crochets à pointe confiée à un agent.

## POUSSÉ SUR LA BRANCHE DE TEST (accord de Greg du 22 novembre, nuit)
- 22 novembre vers 14 h 10 (UTC) : commit `9ceac7d0` poussé sur `claude/saas-achat-artisans-prompt-1lyihx` = fiche -74 (banc
  96/99) + pointe de la branche de test (300dd4ab, puis 842c39b2 : documents seulement). Chaîne sur ce code : moteur 1331,
  serveur 926, site construit, parcours 360 (ordinateur + téléphone), 0 échec. Premier envoi de ma discussion sur cette branche.
- Vérification : API de test « ok », base « ok », site 200. Le commit servi n'est PAS prouvé (ni l'API ni le site ne disent
  leur commit ; pas d'accès à Vercel) : à vérifier par Greg dans Vercel (déploiement « Ready » sur 9ceac7d0).
- Ma branche a fusionné 9ceac7d0 ensuite (bc76f30f).

## À INTÉGRER, confié par la base couverture (`banc-quantitatif/A-INTEGRER.md`, 22 novembre)
- 1. Chatières : section à atteindre (2 cm²/m² comble perdu ou au-dessus d'un écran ; 3,3 cm²/m² sous l'écran), surface
  projetée = surface × cos(pente), nombre arrondi au-dessus puis au pair, section par modèle (HP 10 : 50 cm²…) ; modèle
  inconnu → à chiffrer avec sa question.
- 2. Fixation des tuiles (en Suggestion) : zone et exposition par la commune, une seule question « Écran sous toiture ? »,
  tableau NF DTU 40.21 §5.4 pour la partie courante, toujours fixées égout, rives, faîtières, arêtières ; boîtes de 400.
- 3. Clous d'ardoise (en Suggestion) : 2 clous au doublis, 1er rang, rives, dernier rang sous le faîtage ; au kg.

## RÉPONSES DE GREG DU 22 NOVEMBRE (nuit) — À APPLIQUER
- « OUI, pousse ce lot sur le site de test » : le lot annoncé prêt = fiche -74 (commit ce07225d, chaîne verte). En cours :
  dossier à part `/home/user/lot-pousse` (branche locale `lot-a-pousser`), ce07225d + fusion de la pointe de la branche de
  test (300dd4ab) = f5277c18 ; chaîne complète relancée dessus (bases `baticlair_test_lot`, `baticlair_e2e_lot`). Si verte :
  `git push origin lot-a-pousser:claude/saas-achat-artisans-prompt-1lyihx`, puis vérifier que site et API servent ce commit.
  La fiche -75 n'en fait PAS partie (sa règle des liteaux est corrigée ci-dessous).
- 2. Arêtier en bande zinc : 0,50 m² par mètre, comme la noue (avant : 0,66).
- 3. Sortie de ventilation écrite sur tuile : tuile à douille + lanterne, validé.
- 4. Liteaux : 10 % de chute AU TOTAL, pas 10 % en plus des 5 % (corriger la -75).
- 5. Crochets : devis muet → « Agrafe ou pointe ? ». En pose à agrafe, ajouter quelques crochets à pointe (ceux qui tombent
  sur les chevrons) : chercher le ratio, deux sources minimum, l'écrire dans la fiche. Boîtes de 500 (agrafe), 700 (pointe),
  nombre de pièces sur la ligne.
- 6. Gouttière zinc : on garde 3 cm de croisure par jonction (19,90 ou 20 m → 6 longueurs de 4 m). Sous la flèche : « 5
  longueurs couvrent 19,88 m », pour repasser à 5 d'un toucher.
- 7. Fibres-ciment : « Quelle faîtière ? » validé (déjà fait en -75).
- 8. Jouées de lucarne : pas de question d'égout.
- Abergement zinc : le calculateur de feuilles (développé + pièces de 1 ou 2 m).
- À CORRIGER : Suggestions sans limite à 5, rangées PAR CATÉGORIE (ex. Couverture, Zinguerie, Fixations, Ventilation), petit
  titre et nombre de cases, les plus importantes en haut, une vingtaine au plus, chaque catégorie repliable.
- À CORRIGER : « Pointes pour liteaux » seulement s'il y a des liteaux dans la liste.
- À CORRIGER : « J'ai lu ton devis » seulement s'il y a vraiment un devis ; sinon une phrase adaptée.
- ENSUITE : le lot de la flèche (détail du calcul), puis l'étape 3 (nouvelle lecture des devis). Rapport court après chaque lot.

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
