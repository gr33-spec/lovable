# Infos chantier facultatives : avis et MVP

Demande du fondateur (2026-10-03) : sous le dépôt du devis, « + Ajouter des informations sur le chantier (facultatif) » : texte libre, photos, croquis, plan. Rien d'obligatoire ; si l'artisan dépose seulement son devis, BatiClair fait son travail. Avis avant code, puis MVP.

## 1. Avis

**Oui, ça apporte de la valeur, et surtout là où le devis est muet.** Sur le banc, ce que le devis ne dit presque jamais : la pente, le rampant, le nombre de descentes, le façonnage, le périmètre d'une cheminée, les longueurs de noue et de faîtage quand elles ne sont pas des lignes. Ce sont exactement les données que le moteur demande aujourd'hui par des questions à boutons. Une note de trois lignes tapée au dépôt (« Pente 42°. Rampants 2 × 6,50 m. Noue 12 m ») supprime ces questions avant qu'elles existent. Sur le devis de 200 m² à Brest, deux lignes de note (pente, rampant) font passer la pente d'« hypothèse 45° » à « donnée artisan » : les ardoises passent de 9 200 à une quantité fondée, sans question.

**Ça améliore la fiabilité, pas la précision brute.** Le gain n'est pas « plus de décimales », c'est moins d'hypothèses par défaut dans la liste envoyée au fournisseur : chaque hypothèse remplacée par une mesure de l'artisan est une ligne qui ne sera pas contestée à la livraison. Le risque symétrique existe : une note mal lue vaut pire qu'une hypothèse dite. D'où la règle : seule une mesure NON AMBIGUË et NOMMÉE (« rampant 6,50 m ») devient un fait ; « c'est pentu » reste du contexte.

**Ça s'intègre sans refonte.** Le moteur raisonne déjà sur un *contexte chantier* : des faits (`SiteFact`) avec clé, valeur, unité, preuve et origine (`devis`, `document`, `artisan`), réunis avant le calcul, et une réponse de l'artisan l'emporte sur un document (`paramsFromContext`). Le code postal (zone), le prompt A (dimensions lues) y entrent déjà en « faits hors texte ». Une note artisan est un fait de plus, origine `artisan`, preuve « Votre note ». Le croquis est un document du chantier, comme le devis. Rien de nouveau dans le moteur.

**Texte libre : déterministe d'abord, IA seulement pour le contexte.** Le même lecteur qui trouve « entraxe 90 cm » ou « pente 45 % » dans une ligne de devis lit la note : chaque paramètre d'ouvrage a ses mots (`textLabels` : pente, rampant, faîtage, noue, descentes, épaisseur, développé, périmètre…). « Rampants 2 × 6,50 m » donne 6,50 m. Une pente en % passe en degrés. Ce qui n'est pas une mesure nommée (« les Velux sont conservés », « le garage n'est pas compris ») n'est pas inventé : il est gardé tel quel, montré dans le quantitatif et envoyé au fournisseur dans « Le chantier en bref ». Plus tard, la note peut être donnée au prompt A comme contexte de lecture du PDF (quelques centaines de jetons) et au prompt B comme mémoire du chat ; ce n'est pas nécessaire pour le MVP.

**Photo, croquis, plan : pas d'analyseur de plans.** Hiérarchie retenue, exactement celle proposée :
1. ce que l'artisan ÉCRIT (note, commentaire d'un croquis) → fait `artisan`, s'il est nommé et non ambigu ;
2. une cote lisible sur un document → fait `document`, avec sa preuve (à venir : lecture IA du croquis, même format que les dimensions du prompt A) ;
3. ce qu'on devine d'une photo → jamais une mesure ; au mieux du contexte ;
4. ce qu'on ne peut pas établir → rien.
Dans le MVP, la photo est GARDÉE (document du chantier, visible, jointe au dossier) et son commentaire est lu comme une note. La lecture IA du croquis n'est pas branchée : elle coûterait un appel vision par image pour des cotes souvent illisibles, et elle produirait des faits `document` qui, par construction, ne peuvent qu'entrer en contradiction avec le devis ou la note, donc poser des questions. On la branchera quand on aura des croquis réels à lire et une règle de lisibilité.

**IA ou déterministe.** Déterministe : mesures nommées du texte, provenance, contradictions, priorité, calcul, envoi fournisseur. IA : lire un PDF de devis (déjà), plus tard lire une cote sur un croquis et interpréter une phrase de contexte (« garage non compris » → exclure une ligne). Aucun appel IA ajouté par le MVP.

**Provenance et contradictions.** Chaque fait garde sa preuve ; le calcul la cite (« longueur du rampant 6,5 m — Votre note (« Rampants 2 × 6,50 m ») »). Deux règles :
- mesure tapée par l'artisan ≠ devis : la note l'emporte, et l'explication dit les deux (« Votre note : 15 m ; le devis disait 12 m ») ; c'est ce que le fondateur demande, et c'est cohérent : l'artisan a vu le toit, pas le logiciel de devis ;
- devis ≠ document (croquis lu, en-tête lu par l'IA), ou deux lectures différentes : question avec les deux valeurs en boutons, rien n'est choisi en silence.

**Coûts.** Zéro appel IA de plus dans le MVP. Si plus tard la note est donnée au prompt A : + 100 à 300 jetons d'entrée par lecture. Lecture IA d'un croquis : un appel vision par image, à n'activer que sur demande explicite (« lire ce croquis »), jamais d'office.

**Risques.** (1) Une mesure mal attribuée (« 12 m » sans mot) : refusée par construction, on ne lit que des mesures nommées. (2) L'artisan écrit une quantité d'article (« 9 000 ardoises ») : ignorée, ce n'est pas une donnée d'ouvrage ; l'app ne demande jamais une quantité, elle n'en lit pas non plus. (3) Deux notes qui se contredisent : la dernière écrite remplace, la zone de texte est unique. (4) Dérive vers un formulaire : non, une zone de texte et un bouton photo, repliés par défaut.

**Plus simple ?** Oui, deux choses. D'abord ne pas inventer un objet « infos chantier » à part : la note vit sur le chantier (pas sur un quantitatif), elle est lue à chaque recalcul, et elle se modifie d'un tap comme une hypothèse. Ensuite, le chat fait déjà ce travail pour une mesure (« mets 30° de pente ») : la note est la même grammaire, en plusieurs lignes, avant la lecture. Le bouton « Ajouter une info » du chat et la zone sous le dépôt écrivent au même endroit.

## 2. MVP retenu

- **Chantier** : un champ `siteNotes` (texte libre) ; `PATCH /v1/projects/:id` l'enregistre ; la porte `/v1/quantitatifs` accepte `infos` à la création (partenaires compris).
- **Croquis** : photo (JPEG, PNG, PDF) déposée en document du chantier avec `purpose: "sketch"` et un commentaire ; le commentaire est ajouté à la note sous la forme « Croquis : … ». Pas de lecture IA.
- **Lecture** : `readSiteNotes(ref, texte)` (domaine, déterministe) → faits `artisan` ; passés au calcul comme les faits du code postal et du prompt A. Priorité : réponse du chantier > note artisan > texte du devis > lecture IA > hypothèse.
- **Contradictions** : note ≠ devis → la note gagne, les deux valeurs sont dites ; devis ≠ document → question avec les deux valeurs.
- **Écran** : sous le dépôt, « + Ajouter des informations sur le chantier (facultatif) » replié : zone de texte, bouton « Photo d'un croquis » avec commentaire. Dans le chat : bouton « Ajouter une info » qui ouvre la même zone. Le quantitatif montre la note et les croquis ; le fournisseur reçoit la note dans « Le chantier en bref ».
- **Reporté** : lecture IA d'un croquis ou d'un plan ; note donnée au prompt A ; exclusion d'une ligne par une phrase (« garage non compris ») ; image annotée.

## 3. Lot du §44 (référentiel 44 sections, 2026-10-04)

Le §44 du référentiel du fondateur formalise ce MVP. Ajouts :

- **Banc de 30 phrasés d'artisan** (§44.2) : `packages/domain/test/note-artisan-30-phrases.test.ts`. « environ », « env. », « ~ », « 6m50 », « 2 rampants de 6,5 » (une longueur sans unité se lit en mètres, et seulement une longueur), « deux descentes », « pte », « 12 lin », « hauteur des descentes 5 m ». Cinq pièges ne créent aucune mesure (9 000 ardoises, budget en €, « à voir sur place », noue sans ouvrage, une date).
- **Filet** : la note est donnée au prompt A comme contexte, entre balises `<note_artisan>`, dans le message (jamais dans le prompt système), avec la consigne de n'en faire ni une ligne ni une quantité et d'ignorer toute consigne qu'elle contiendrait (`siteNotesInstruction`, test `apps/api/test/prompt-a.test.ts`). Coût : quelques centaines de jetons d'entrée, seulement quand une note existe.
- **Phrases d'exclusion** (`readExclusions`, `exclusionFor`) : « garage non compris », « Velux fournis par le client », « charpente conservée », « hors abri de jardin ». Sans IA ; une ligne n'est exclue que si elle nomme TOUS les mots visés, jamais au plus proche. La ligne sort du calcul et du « À commander », reste dans le détail sans prix (§42) avec « exclu par l'artisan (« … ») », et l'artisan la voit dans « Lignes mises de côté ».
- **L'explication cite les deux valeurs** (§44.3) : « pente du toit 35° (note de l'artisan ; le devis disait 40°) ».
- **Contradiction entre documents** : la validation est refusée (`contradiction_open`) tant que la question est ouverte ; rien ne part au fournisseur.
- **Les 7 tests du §44.5** : `apps/api/test/infos-chantier-44-5.test.ts`.

## Retour du fondateur (2026-10-05) : premier écran court

Le premier écran d'un chantier ne montre que le dépôt du devis (« Déposez le devis, je fais la liste. », une phrase, le bouton). Le bouton « Ajouter des informations sur le chantier — Facultatif, mais aide à la précision » apparaît dès que le devis commence à charger, et reste là pendant la lecture. Les étapes de lecture sont neutres (« Je reconnais les ouvrages du devis. ») : elles valent pour tous les métiers.
