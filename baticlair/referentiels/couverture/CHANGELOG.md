# Référentiel couverture — CHANGELOG

## roofing-2026.10.09-44 — pattes du joint debout (retour du fondateur, 2026-10-09, D-2026-018)

- **§49.1 Pattes fixes** : « pattes en inox fixes et coulissantes » écrit au devis donne deux lignes, pattes fixes ET pattes coulissantes, chacune sa quantité (VMZINC 36.2). Avant : seules les coulissantes sortaient (le mot « fixes » n'était pas reconnu après « inox »).
- **§49.2 Façonnage pas choisi** : les pattes du joint debout attendent le façonnage (bobines ou bacs) ; tant qu'il manque, elles sortent orange « Info manquante : façonnage », avec leur quantité, jamais vertes « pour bobine 500 mm ». Aucune quantité ne change.

## roofing-2026.10.07-43 — audit avant bêta (2026-10-07)

- **Ø des descentes** : la question disait « Descentes en Ø 80 ou en Ø 100 ? » et proposait trois boutons (Ø 80, Ø 100, Ø 120). Elle dit maintenant « Descentes en Ø 80, Ø 100 ou Ø 120 ? », avec « Ø 120 au-delà » dans l'aide. Aucune quantité ne change.

## roofing-2026.10.07-42 — zinguerie pièce par pièce, une info demandée une fois (retour du fondateur, 2026-10-07)

- **§48.6 Une question par pièce de zinguerie écrite au devis** : l'ouvrage « Bandes zinc (solin, rive, égout, ventilation, couvre-joint) » ne pose plus une question globale. Écrit sur plusieurs lignes, il devient une pièce par ligne (`perLine`, instance `bandes-zinc__<ligne>`), chacune avec SES données (développé, aspect), sa question à son nom (« Bande de ventilation en Z en zinc quartz : tu façonnes toi-même ou tu commandes façonné ? », deux boutons) et sa réponse ; jamais une donnée prêtée d'une pièce sœur. Une pièce dont le devis dit le façonnage n'a pas de question : « comprend le pliage » = je façonne, « pliée(s) en Z », « préfaçonné(e)s » = commandé façonné. « Habillage de rive en zinc » est une bande zinc. Développé « 200 mm » ajouté aux choix (§36.4 : 200 à 330 mm) : « Dév. 200 » écrit est lu, jamais redemandé. Le nom d'un lot ne garde plus sa parenthèse (« Abergement de cheminée »).
- **Une info manquante se demande une fois** : une question du comptoir (« manque » de la lecture) sur une donnée que l'ouvrage de la ligne connaît (le Ø des naissances pour la gouttière, la qualité d'ardoise, l'épaisseur du zinc) n'est jamais posée, ni avant ni après le calcul ; c'est la question du tiroir, posée à l'écran des questions, qui règle toutes les lignes. Une dimension lue par l'IA sur une ligne vaut pour l'ouvrage (la pièce) de cette ligne.

## roofing-2026.10.06-41 — §49.7 mortier de solin, §49.8 lignes orange réglées dans leur carte (fondateur, 2026-10-06)

- **§49.7 Mortier de solin** : « Ciment 35 kg + sable » est remplacé par « Mortier d'étanchéité pour solin, sac 25 kg » (produit `mortier-solin-25`, famille `solin_mortar` comptée en kg). Règle du fondateur : sacs = arrondi supérieur de (ml de porte-solin × 2 kg) / 25 (`regle.mortier_solin_par_ml` = 2 kg/ml, sourcée §49.7). Sur D-2026-020 : 4 ml ⇒ 1 sac, **en vert**, hypothèse « 4 ml × 2 kg/ml ». Ancienne valeur : « Ciment 35 kg + sable : 1 sac », orange (estimation `todo`).
- **§49.8 Écran « À vérifier »** : chaque article porte ce qui le règle sur place (`asks` : la donnée qui manque ou le défaut à confirmer, avec ses boutons ; `gap` : « le devis dit 20, le calcul donne 21 »). Rien ne change dans les quantités.

## roofing-2026.10.06-40 — §49, la charte du quantitatif (fondateur, 2026-10-06)

Les prompts 41.1 (lecture, v12) et 41.2 (relecture, v4) sont branchés mot pour mot ; le §49 remplace tout ce qui le contredit.

- **§49.1 D'où vient chaque ligne** : la règle numéro un vaut pour **tous les tiroirs, tous les métiers** (lot B compris : une cloison écrite, ce sont ses plaques ; rails, vis, bande, enduit seulement s'ils sont écrits). Une ligne par article écrit, **dans l'ordre du devis**, jamais fusionnée avec une autre ligne (les feuilles du faîtage, des rives et du porte-solin restent trois lignes). Accessoire indissociable : la **naissance seule** (le raccord de fenêtre de toit n'est plus ajouté d'office). Une ligne de pose qui cite un article sans le chiffrer (« fixation » des descentes) le fait sortir, calculé, orange (`citedBy`). Plus aucun bloc « Suggestions », plus aucun interdit « X sans Y ».
- **§49.1 point 4 Consommables** : UNE question, « Consommables de pose : je les ajoute à la liste ? » (oui / non, mémorisable comme habitude). Oui : seulement ceux liés à une ligne écrite (vis et silicone des bandes, pattes du faîtage, silicone du porte-solin, **étain et décapant** quand la pose écrit des soudures), en orange, en fin de liste. Non : rien.
- **§49.2 D'où vient chaque quantité** : la quantité écrite reste la base ; l'écart avec le calcul se dit « Le devis dit 20, le calcul donne 21 (…) ». Tuyau en **tubes** (« 2 tubes de 3 m »). Marge écrite dans la phrase d'hypothèse des ardoises (« 48 m² × 40,7 ardoises/m² (crochet 11 cm, pente 30°) + 5 % de marge »). Feuilles d'un zinc façonné : orange « ajuste selon ton façonnage ». Une valeur par défaut du tiroir non confirmée garde sa ligne orange.
- **§49.2.5 Info manquante** : une ligne écrite qui attend une réponse ne disparaît plus : calculée sans la donnée, avec un « ? » à sa place (« Gouttière zinc Havraise dév. ? », 3 longueurs de 4 m), ou telle qu'écrite avec la quantité du devis (faîtage, porte-solin en attente du façonnage), orange « Info manquante : … ».
- **§49.4 Questions** : celles du tiroir, plus le « manque » de la lecture (§41.1) quand le tiroir ne pose pas déjà la même ; jamais une question sur une donnée écrite.
- Les tiroirs du lot B passent en `-2026.10.06-2` (article principal de chaque ouvrage mesuré). Test permanent : `packages/domain/test/devis-d2026-020.test.ts` (§49.6).

## roofing-2026.10.06-39 — RÈGLE NUMÉRO UN : rien d'absent du devis (fondateur, 2026-10-06)

- **Règle numéro un** (`writtenOnly`) : BatiClair retranscrit ce que le devis écrit, avec ses quantités ; il n'ajoute jamais un article absent du devis, ni en vert, ni en orange, ni en suggestion. Un article sort seulement s'il est écrit dans une ligne, ou s'il en est la forme d'achat (`formOf` : feuilles 2 × 1 m d'une bande façonnée, bobines ou bacs d'un joint debout, plaques d'un bac acier, pièces d'une sortie de toit ou d'un abergement), ou s'il en est l'accessoire indissociable (`indissociable` : la naissance d'une gouttière, §48.7 ; le raccord d'une fenêtre de toit). Plus de liteaux, contre-liteaux, écran, pattes, pointes, colliers, dauphins, abouts, jonctions, talons, angles, vis, silicone… s'ils ne sont pas écrits ; plus de question à leur sujet. Les « On ajoute ? » et les interdits « X sans Y » sont coupés pour la couverture.
- **§48.6 zinc façonné** : une question « tu façonnes ? » par ouvrage (faîtage zinc, bande porte-solin, bandes, noue, abergement), jamais prêtée d'une pièce à l'autre (`ownOnly`) ; aucune question quand le devis dit déjà le façonnage. Façonné sur place : **feuilles 2 × 1 m**, estimées d'après le développé (« 1 feuille de 1 m de large en bandes de développé, 2 m de long » : dév. 25 cm → 8 m par feuille), raisonnement dit en clair ; le bobineau est réservé au joint debout, terrasses et chéneaux (fin de la règle « bobineau au-delà de 6 ml »).
- **Bande porte-solin** : ouvrage à part (`bande-porte-solin`), avec sa question de façonnage et son mortier écrit (orange, estimé).
- **Tuyau de descente** écrit en mètres avec « N descentes de H m » : commandé en longueurs (« 2 longueurs de 3 m »).
- **Crochets d'ardoise** : l'écart avec les ardoises (2 094 pour 2 052) est dit sur la ligne : un par ardoise + 2 % de casse (référentiel : crochets = ardoises × 1,02).
- La gouttière garde son profil écrit (« Havraise ») dans sa désignation.
- Le tableau de Brest et les comptes rendus des lots bougent en conséquence (articles non écrits retirés). Test : `packages/domain/test/devis-d2026-020.test.ts`.

## roofing-2026.10.06-38 — le mortier reste, l'écart devis / calcul se dit (D-2026-020)

- **Mortier de solin** (nouvelle famille `solin_mortar`, mot « mortier », emplacement `mortier` des bandes zinc) : cité au devis (« bande porte-solin zinc et mortier ciment »), il n'est plus jamais supprimé. Estimation du fondateur, à confirmer : « Ciment 35 kg + sable (mortier de solin) : 1 sac », ligne orange « Quantité à confirmer : estimation 1 sac de ciment 35 kg + sable ». Non cité, il n'apparaît pas.
- **Quantité écrite comparée au calcul** : le devis reste la base (« 20 crochets de gouttière »), mais BatiClair calcule aussi l'article. Un écart réel (plus de 3 % et au moins une pièce) met la ligne en orange avec la note : « 20 au devis, 21 calculés pour 10 ml de gouttière, un tous les 50 cm + 1 en bout ». « C'est bon » garde la quantité du devis. L'écart est propre au chantier : il ne valide jamais une règle (§47.4).
- **Crochets de gouttière zinc** : un tous les 50 cm (40 en zone 3) **plus un en bout de ligne** (avant : sans le crochet de bout), comme la gouttière PVC (§15).

## roofing-2026.10.06-37 — le vrai devis D-2026-020 lu jusqu'au bout

- **Lignes de pose** (« Pose de couverture … pente 30° », « Façonnage et pose des bandes de rive ») : elles ne commandent toujours rien, mais ce qu'elles écrivent vaut pour l'ouvrage qu'elles nomment (pente, crochets, façonnage).
- **Façonnage** lu au devis (« façonnage et pose », « façonnées sur place ») : l'artisan façonne, plus de question « tu façonnes ou tu commandes façonné ? ».
- **Un mot complément ne nomme pas un article** : « crochets de gouttière », « fixation de la gouttière », « dévoiement des descentes » ne citent ni la gouttière ni les tubes. Les 20 crochets de gouttière et les 4 coudes du devis partent tels qu'écrits ; plus de ligne « Tubes de descente (Coude…) » à faire chiffrer. « et crochets », « avec coudes », « accessoires de fixation » nomment toujours.
- **« inox » des crochets** (« des crochets de fixation en inox ») ne se colle plus sur les ardoises.
- **Deux lignes du même article** (bandes de rive 4 m + bande porte-solin 4 m) : leurs longueurs s'additionnent (8 m), la seconde ne part plus « à faire chiffrer ». Deux articles différents (ardoises et écran) gardent une seule mesure.
- **Développé** : celui du faîtage (dév. 25 cm) n'est plus prêté aux bandes de rive ; une donnée écrite sur une ligne vaut d'abord pour son ouvrage.
- **« 1 lot » de crochets** : un lot ne dit pas combien d'articles, le calcul les compte (comme un forfait).
- Gouttière **Havraise** et zinc **mouluré** gardés dans la désignation. Test : `packages/domain/test/devis-d2026-020.test.ts`.

## roofing-2026.10.06-36 — plus de crochet « 1 mm » à l'écran

- Le choix du crochet se dit « Standard » ou « Inox Ø 2,7 mm (bord de mer) » ; « Courant (1 mm) » n'apparaît plus (retour du fondateur : un crochet de 1 mm n'existe pas). Le 1 mm reste le jeu de la formule Cupa (§34) dans le calcul : aucune quantité ne bouge.

## roofing-2026.10.06-35 — ce que le devis règle n'est plus demandé (D-2026-020, suite)

- **Ø des descentes** lu après « diam. » ou « diamètre » (« diam. 80mm », « diamètre 100 ») : plus de question « Ø 80 ou Ø 100 ? » quand le devis l'écrit.
- **Hauteur des descentes** lue dans « 2 descentes de 3 m » (comme « hauteur 4 m ») ; « descente 100 mm » n'est jamais une hauteur (1 à 30 m).
- Un ouvrage dont le devis donne les articles (tubes, coudes) ET la mesure écrite (« 2 descentes de 3 m ») calcule encore ce qu'il ne cite pas (colliers, dauphins). Une ligne commandée telle quelle sans mesure écrite (« 42 faîtières ») ne calcule toujours rien de plus.
- D-2026-020 reconstitué : 4 coudes (avant 8), 6 colliers (avant 12), 2 naissances (avant 4), dauphins = question du comptoir. Tableau de Brest inchangé.

## roofing-2026.10.06-34 — le devis fait foi : coudes et crochets (D-2026-020)

- **Coudes** : « Tubes de descente (Coude zinc Ø80) — 4 unités » sont 4 coudes commandés tels quels (la parenthèse qui suit le titre nomme l'article). Le nombre de descentes ne vient plus que d'une ligne de tubes (`forSlots: ["tube"]`) ou de « 2 descentes » écrit (`textCount`) ; avant : 4 descentes, 8 coudes, 4 naissances, 4 dauphins.
- **Longueur de crochet** : devenue une donnée de l'ouvrage, lue au devis (« crochet inox de 11 cm », « crochets d'ardoise … 110 mm » ; « Ø 2,7 mm » n'en est pas une), commandée telle quelle. Écrite, elle fixe le recouvrement (crochet − 1 cm, Cupa §34), donc le pureau et le nombre d'ardoises, crochets et liteaux. Non écrite : recouvrement + 1 cm, comme avant ; dite dans les hypothèses, modifiable.
- Tableau de Brest inchangé. Test : `packages/domain/test/devis-d2026-020.test.ts`.

## roofing-2026.10.05-33 — plomb et cuivre (§12, réponse du fondateur)

- **Plomb** (nouvel ouvrage `bandes-plomb`, famille `lead_strip` : « plomb », « bavette plomb », « solin plomb ») : bande commandée **en rouleaux**, largeur lue au devis (« largeur 40 cm »), sinon **30 cm** ; épaisseur **1,5 mm** par défaut (« 2 mm », « 2,5 mm » lus) ; ml × 1,1 (§12). La longueur du rouleau (§12 : 3 à 6 m) est prise à 6 m et reste **à confirmer** : la ligne sort orange, « Quantité à confirmer : rouleau de plomb de 6 m ».
- **Cuivre** (nouvel ouvrage `bandes-cuivre`, famille `copper_strip`) : comme le zinc, avec ses largeurs. Commandé façonné : bandes en longueurs de 2 m ; façonné sur place : feuilles 2 × 1 m jusqu'à 6 ml, **bobine au mètre** au-delà, à la plus petite largeur qui contient le développé (500, 600, 670 mm, **à confirmer**) ; 0,6 mm par défaut (§12). Son développé a sa propre clé : une bande zinc du même devis garde le sien.
- Les épaisseurs du plomb et du cuivre ne se lisent que sur leurs propres valeurs (« ép. 0,65 mm » reste celle du zinc).
- Pas encore : abergement de cheminée en plomb (calculé en zinc), noquets, plomb au kg, cuivre à joint debout.
- Compte rendu : `docs/lot-couverture/point-8.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-32 — descentes en longueurs (réponse du fondateur)

- **Tubes de descente** PVC et zinc en **longueurs de 4 m** (2 m si le devis le dit : « en longueurs de 2 m »), par descente la hauteur en longueurs entières : « Tubes de descente zinc Ø100, longueur 4 m : 4 pièces » pour 2 descentes de 5 m (avant : 10 ml).
- **Coudes** : 2 par descente par défaut (inchangé). **Colliers** : un tous les 2 m plus un (avant : 1,8 m).
- **Dauphin** : question du comptoir, « Un dauphin en pied de chaque descente ? » ; lu au devis (« avec dauphin », « dauphin fonte », « sans dauphin »). Oui : un dauphin d'1 m par descente (§15).
- D-2026-015 (2 descentes PVC de 4 m) : 2 longueurs de 4 m (avant 8 ml), 6 colliers (avant 8), une question de plus (le dauphin). Devis de démonstration : « sans dauphin » écrit, toujours aucune question.
- Compte rendu : `docs/lot-couverture/point-7.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-31 — sécurité et accès (§14), désamiantage (§18)

- **Sécurité et accès** (famille `roof_safety`) : crochets de sécurité, crochets de service, crochets d'échelle, échelle de toit, ligne de vie, points d'ancrage, garde-corps, passerelle. Reconnus, ils partent **tels que le devis les écrit** (modèle, norme, longueur), sans calcul ni question. Une ligne de vie à sa longueur passe le test du fournisseur (un système vendu à la longueur).
- **Désamiantage** (famille `asbestos_removal`, `dominant` : elle l'emporte sur tout autre mot de la ligne ; « plaques fibres-ciment amiantées » n'est jamais une ardoise) : la ligne part telle qu'écrite (poste chiffré par une entreprise certifiée), et un **avertissement** est dit à l'artisan en haut de la liste, même pour une ligne de dépose : « Amiante : le retrait se fait par une entreprise certifiée (SS3), après un repérage avant travaux… ». L'avertissement ne part jamais au fournisseur.
- Moteur (générique) : une famille peut être `dominant` et porter un `warning` (lu par le plan sur toutes les lignes, `PurchaseView.warnings`) ; le profil couvreur reconnaît ces lignes avant « crochet » et « ciment ».
- Compte rendu : `docs/lot-couverture/point-6.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-30 — ardoise fibres-ciment (§4)

- **Ardoises fibres-ciment** (nouvel ouvrage `couverture-ardoises-fibres-ciment`, famille `roof_slate_fc` qui précise `roof_slate` : « fibres-ciment », « fibro-ciment », « artificielles », « Eternit ») : le calcul de l'ardoise naturelle avec les formats du §4, recouvrement courant 100 mm : 40 × 24 (27,8/m², liteaux 6,67 ml/m²), 40 × 27 (24,7/m², 6,67), 60 × 30 (13,3/m², 4,0), 60 × 40 (10/m², 4,0), + 5 % de perte. Ses fixations : **clous inox** = 2,1 × ardoises commandées, **crochets d'antivent** = 1,05 × ardoises (jamais de crochets d'ardoise naturelle) ; liteaux, contre-liteaux et écran comme l'ardoise naturelle.
- Questions du comptoir, lues au devis quand il les écrit : le **format** et la **teinte** (bleu-noir, noir, brun).
- L'ardoise naturelle ne change pas (Brest inchangé). Compte rendu : `docs/lot-couverture/point-5.md`.
- Correctif du point 3 : une famille qui en précise une autre (« PVC », « alu », « fibres-ciment ») ne se lit plus seule. « Bande de rive alu » ou « Échelle de toit aluminium » ne deviennent plus des gouttières, « Plaques fibres-ciment » n'est plus une ardoise.

## roofing-2026.10.05-29 — bac acier (§8)

- **Couverture bac acier** (nouvel ouvrage `couverture-bac-acier`, famille `steel_tray` : « bac acier », « tôle nervurée », « panneau sandwich ») : jamais de m² en sortie. **Plaques à la longueur du rampant + 5 cm de débord**, une par rampant, autant par pan que la largeur du pan (surface ÷ pans ÷ rampant) compte de largeurs utiles de 1,00 m ; **vis** autoperceuses avec rondelle EPDM, 7 par m² + 3 par mètre de rive, en boîtes de 100 ; **closoirs** mousse en bas et en haut de chaque plaque ; **faîtières** en longueurs de 2 m (largeur d'un pan ÷ 2, + 1), pas de faîtière en monopente.
- Questions du comptoir, chacune lue au devis quand il l'écrit : la **longueur des plaques** (« rampant 6 m » ; même clé que le rampant de l'ardoise, où elle reste une hypothèse), la **teinte** (RAL 7016, 7022, 8012, 9005), le **feutre anti-condensation** (simple peau seulement). Panneau sandwich lu (« sandwich »), deux pans par défaut (« monopente » lu).
- Compte rendu : `docs/lot-couverture/point-4.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-28 — gouttières PVC et aluminium (§15)

- **Gouttière PVC ou alu** (nouvel ouvrage `gouttiere-pvc-alu`, famille `gutter_plastic` qui précise `gutter` : le mot « PVC » ou « alu » n'importe où dans la ligne) : mêmes règles que le zinc, avec les pièces du §15. **Longueurs de 4 m** ; **crochets** tous les 50 cm (40 en bord de mer) plus un en bout de chaque ligne ; **jonctions** entre longueurs ; **2 talons par ligne** ; **un angle par angle** (« Combien d'angles sur cette gouttière ? » si le devis ne le dit pas) ; **une naissance par descente** ; **joint de dilatation** PVC tous les 12 m de ligne. « Longueur : 2 x 10 m » = deux lignes (deux fois les talons, jonctions par ligne).
- La matière et la **teinte** se lisent dans la ligne (grise, blanche, sable, brune, anthracite), sinon le comptoir demande la teinte ; désignations comme au comptoir : « Gouttière PVC demi-ronde sable de 25 », « Talons de gouttière PVC sable de 25 ».
- D-2026-015 (gouttière PVC sable 2 × 10 m) : + 4 jonctions, + 4 talons, une question de plus (les angles).
- La gouttière **zinc ne change pas** (Brest inchangé).
- Test du fournisseur : un tube « Ø80 » au mètre (alu, zinc) n'est plus pris pour du métal sans dimension.
- Compte rendu : `docs/lot-couverture/point-3.md`.

## roofing-2026.10.05-27 — fenêtres de toit (§11)

- **Fenêtre de toit** (nouvel ouvrage `fenetre-de-toit`, famille `roof_window`) : la fenêtre part **telle que le devis l'écrit** (marque, modèle, taille) et compte l'ouvrage. Sans taille dans la ligne (ni « 78x98 », ni référence « MK04 »), la question du comptoir se pose sur la ligne : « Fenêtre de toit : quelle taille ? » (55 × 78, 78 × 98, 78 × 118, 114 × 118 ou saisie) ; la réponse part en précision.
- **Raccord d'étanchéité** : un par fenêtre, **pour tuiles**, **pour ardoises** ou **pour tuiles plates**, à la taille lue (« Raccords d'étanchéité pour tuiles, fenêtre 78 × 98 »), sinon « à la taille de la fenêtre de toit ». La couverture se lit dans la ligne, puis sur la couverture du devis ; sinon « Raccord de fenêtre de toit : pour tuiles, pour ardoises ou pour tuiles plates ? ». Codes de taille Velux lus (CK02 à UK08).
- Pas encore : kit d'isolation, collerette pare-vapeur, chevêtre, raccords combinés de fenêtres jumelées (un raccord par fenêtre, à corriger d'un tap).
- Compte rendu : `docs/lot-couverture/point-2.md`. Tableau de Brest inchangé.

## roofing-2026.10.05-26 — noues et arêtiers (§3, §5, §7, §25.2)

- **Noue zinc** (nouvel ouvrage `noue`, famille `valley`) : même règle que les bandes. Commandée façonnée : noues en **longueurs de 2 m**, longueur utile 1,85 m (recouvrement 15 cm, §25.2). Façonnée sur place : feuilles 2 × 1 m jusqu'à 6 ml, bobineau au-delà (zinc = ml × 1,05, §7). Développé lu au devis (« dév. 50 / 60 / 66 », « encaissée » → 66), sinon la noue préformée de 50, dite et modifiable. Question du comptoir : « Noue zinc : tu la façonnes toi-même ou tu la commandes façonnée ? » (même clé `faconnage` que tout le métal façonné).
- **Arêtier** (nouvel ouvrage `aretier`, famille `hip`) : en tuiles, **arêtiers** à 2,9 pièces/ml (§5), **closoir d'arêtier** de 23 cm en rouleaux de 5 m, un **crochet** par arêtier posé à sec, un **about** par arêtier ; en zinc, **bande d'arêtier** dév. 25 ou 33 en longueurs de 3 m (ml × 1,05) et **3 pattes par mètre** (§3). La matière se lit dans la ligne (« zinc », « arêtières »), sinon sur la couverture du devis (tuiles → arêtières ; ardoises ou zinc → bande zinc), sinon le comptoir demande « Arêtier en tuiles (arêtières) ou en bande zinc ? ». Le nombre d'arêtiers se lit (« 4 pans », « 2 arêtiers »), sinon « Combien d'arêtiers sur ce toit ? » (les abouts).
- **Développé écrit en centimètres** (« Faîtage zinc dév. 33 », « Bande zinc dév. 25 ») : lu pour les bandes et le faîtage zinc ; la question « Développé de la bande zinc ? » n'est plus posée quand le devis le dit.
- Compte rendu : `docs/lot-couverture/point-1.md`. Tableau de Brest inchangé.

## roofing-2026.10.04-25 — la règle du comptoir (§47.8)

- **Questions** : seulement celles que le vendeur du négoce poserait pour chiffrer. Nouvelles : développé de gouttière (25 / 28 / 33 / 40), crochets sur chevrons ou bandeau, descentes Ø 80 / 100, qualité d'ardoise (habitude d'entreprise), teinte du zinc quand le devis dit « prépatiné » sans la dire. Chacune est lue au devis quand il l'écrit. Supprimée : « égout et faîtage, on les ajoute ? » (les deux bandes passent dans « On ajoute ? », sauf si le devis les cite).
- **Désignations** comme au comptoir : aspect et épaisseur du zinc (« Bobine Quartz-Zinc 0,65 mm, largeur 500 mm »), développé et Ø (« Naissances zinc demi-ronde dév. 33 Ø80 »), pose des crochets, qualité d'ardoise, longueur des crochets d'ardoise (recouvrement + 1 cm, Cupa §34), section et traitement des voliges.
- Compte rendu : `docs/lot-comptoir.md`.

## roofing-2026.10.04-24 — bobineau au-delà de 6 ml

- **Bobineau** (réponse du fondateur) : pour les bandes façonnées sur place (égout, rive, faîtage, noue, solin, abergement), au-delà de **6 ml** un bobineau remplace les feuilles 2 × 1 m. Largeurs 500, 650, 1 000 mm ; longueurs 17, 21, 31 m (40 m en 500) ; épaisseur du chantier (0,65 par défaut, 0,70, 0,80). Vendu à la pièce, désignation « Bobineau 500 × 17 m, 0,65 ». Choix : la plus petite largeur qui contient le développé, la plus courte longueur qui couvre le zinc à façonner (marge 10 % comprise) ; au-delà, plusieurs bobineaux de la plus grande longueur. Chantier Test : 13 ml de bande d'égout → **1 bobineau 500 × 17 m, 0,65** (avant : 3 feuilles 2 × 1 m).
- Le développé n'est plus demandé quand il ne change pas l'article (un bobineau de 500 mm contient tous les développés proposés) ; il l'est toujours pour les feuilles et pour une bande **commandée façonnée** (elle se fabrique à son développé).
- Moteur (générique) : désignation calculée d'un article (`designation`, même écriture que la précision) ; une donnée à boutons peut être bornée à ses réponses tant qu'elle n'est pas répondue (`withinChoices`) ; la règle des 3 % ne remplace jamais par une hypothèse une donnée exigée par une précision (`precisionRequires`) ; une précision s'écrit dès que ses propres valeurs sont sûres.

## roofing-2026.10.04-23 — sortie de toit décomposée, longueurs expliquées

- **Sortie de toit** (nouvel ouvrage `sortie-de-toit`, réponse du fondateur) : une sortie = une **embase plomb** (ardoise, tuile) ou une **platine zinc soudée** (zinc), au diamètre du conduit, plus un **chapeau** ; une **collerette d'étanchéité** (solin) seulement pour un conduit de fumée. Questions à boutons : diamètre Ø 80 / 100 / 125 / 150 / 180 ou VMC, puis conduit de fumée ou ventilation. La couverture se lit sur les autres ouvrages du devis (zinc à joint debout → platine ; ardoises ou tuiles → embase), sinon sur la ligne (« tuile HP10 »), sinon on demande. « VMC », « poêle », « fumée », « ventilation », « Ø 150 » écrits dans la ligne sont lus. Le diamètre part en précision (« Ø 150 », « VMC »). La ligne du devis n'est plus un article tel quel : D-2026-015 « Sortie de toit Poujoulat » devient embase + chapeau (+ collerette si fumée), après deux questions.
- **Précisions des longueurs** (même esprit que « 4 longueurs de 4 m (13 ml à couvrir) ») : bobine « 31 bacs × 7,15 m », liteaux « lattage 120 m², une file tous les 31 cm », contre-liteaux « contre-lattage 120 m², une file tous les 90 cm », tubes de descente « 2 descentes × 4 m ».
- Moteur (générique, sans changement de règle) : une donnée peut se lire par un mot de la ligne (`textValues`) ou sur les autres ouvrages du devis (`fromWorks`) ; une donnée qui change l'ARTICLE sans changer la quantité est demandée (`precisionRequires`) ; une précision écrit une donnée comme elle se dit (`display`, « Ø 150 »).

## roofing-2026.10.04-22 — surlongueur de bobine, bâche fournie

- **Surlongueur de bobine** (réponse du fondateur) : **15 cm par bac** (10 en égout, 5 en faîtage), ajoutés au rampant avant de multiplier par le nombre de bacs. Chantier Test, 91 m², rampant 7 m, bobine 500 : 31 × 7,15 = **222 ml** (avant : 217 ml). 91 m², rampant 5,5 m : 39 × 5,65 = **221 ml** (avant : 215 ml).
- **Bâche de protection** : une fourniture (famille `tarpaulin` du métier), elle part au fournisseur telle qu'écrite ; « bâche » n'est plus un mot de main d'œuvre.

## roofing-2026.10.04-21 — sortie de toit : le diamètre à boutons

- **Sortie de toit** (famille `roof_outlet`, réponse du fondateur : « boutons Ø 80 / 100 / 125 / 150 / 180 ou VMC ») : la ligne reste telle qu'écrite (marque, modèle) ; quand elle ne dit pas le diamètre (ni « Ø », ni « diamètre », ni « VMC », ni « 80/100/125/150/180 mm »), elle est orange avec une question à six boutons. La réponse part dans la colonne « précision » (« Ø 150 ») ; « Je ne sais pas » : la ligne part telle quelle, à préciser avec le fournisseur (gris). Nouveau champ de famille `ask` (question, boutons, expression « déjà dit »).
- Collerette, bobineau, surlongueur de bobine : en attente des valeurs du fondateur, rien d'inventé.

## roofing-2026.10.04-20 — chantier Test (§45.5) : ce que le comptoir sert

- **Pattes du joint debout** : deux lignes, **pattes coulissantes** et **pattes fixes**, au lieu d'une somme (VMZINC 36.2, tableaux séparés par largeur de bobine). Chantier Test, 91 m², rampant 7 m, bobine 500 : 91 × 5,70 = **519 coulissantes**, 91 × 1,90 = **173 fixes**. Plus une troisième ligne, les **pointes annelées 2,5 × 28 mm** (volige 18 mm), 2 par patte (§36.2) : **1 384 pièces**. Familles `seam_clip_sliding`, `seam_clip_fixed`, `clip_fixing`.
- **Égout et faîtage du joint debout** : question à boutons « Égout et faîtage / Faîtage seulement / Égout seulement / Déjà au devis » (`egout_faitage`, sans défaut : le devis les cite souvent sur une autre ligne). Égout : largeur du pan × 1,05 ÷ 1,9 m utile → bandes d'égout à ourlet développé 33 cm en **longueurs de 2 m** (§7) ; faîtage : largeur du pan × 1,05 en longueurs de 3 m.
- **Bandes zinc façonnées** : dites en **longueurs de 2 m** (« 8 longueurs de 2 m »), plus en « pièces ».
- **Précision par ligne** (champ `precision` d'un besoin, §45.3) : ce qui sert au comptoir, avec les valeurs du chantier (« pour façonner 13 ml de bande, développé 33 cm », « pour bobine 500 mm, zone fixe de chaque bac », « 2 par patte, sur volige 18 mm »). Une feuille 2 × 1 m porte toujours son usage (§45.5).
- **Longueurs** : quand la longueur achetée diffère de la longueur à couvrir, les deux sont écrites : « 4 longueurs de 4 m (13 ml à couvrir) » ; jamais « soit 13 ml » (§45.5).
- Un composant dont la règle existe mais que la réponse écarte (bandes façonnées quand l'artisan façonne) ne part plus « à chiffrer » avec « pas encore de règle ».

## roofing-2026.10.04-19 — bobine de zinc au mètre linéaire, jamais au kg

- **Joint debout, « je façonne »** (retour du fondateur) : la bobine se commande au **mètre linéaire**, plus en kg. Une bande par bac, à la longueur du rampant : nombre de bacs (largeur du pan ÷ largeur utile 430 ou 580 mm) × rampant. 91 m², rampant 5,5 m, bord de mer : 39 × 5,5 = **215 ml de bobine 500 mm** (avant : 501 kg). Rampant 12 m profilé sur place : 18 × 12 = 216 ml. La largeur est écrite sur la ligne (deux articles : bobine 500 mm en bord de mer, 650 mm ailleurs) ; l'épaisseur reste dite et part dans « Le chantier en bref ». Les poids VMZINC (5,5 / 6 / 7 kg/m²) ne servent plus au calcul.

## roofing-2026.10.04-18 — voligeage seul

- **Voligeage** (nouvel ouvrage `voligeage`, famille `sheathing`) : une ligne « Voligeage en sapin traité 18×200 mm, 91 m² » ne reste plus « article inconnu » : 91 m² × 1,05 = 96 m² de voliges sapin 18 mm (§7 « Support voligeage : m² rampant × 1,05 »). Sous un zinc à joint debout, la volige reste à l'ouvrage zinc (un seul article). « voligeage » ajouté au vocabulaire du couvreur.

## roofing-2026.10.04-17 — retour du fondateur : tuiles canal, zinc en feuilles, toutes les questions d'un coup

- **Tuiles canal** (famille `roof_tile_canal`, source Edilians « canal-tuiles-edilians.pdf ») : une ligne « tuiles canal » n'est plus lue comme une tuile à emboîtement (avant : HP 10 proposée). Une famille peut en affiner une autre (`refines`) : le mot le plus précis de la ligne l'emporte. Modèle à préciser → question à boutons (Canal 50, Gironde 50, Lyonnaise 40, Charentaise…) ; recouvrement R140 à R170 demandé d'emblée (sauf tuiles à blocage, recouvrement fixe). Tuiles = surface × nombre au m² du fabricant (couvert + courant), liteaux au m², bardelis 2,7 au ml de rive. Exemple : Gironde 50, R150, 100 m² → 2 540 tuiles, 307 ml de liteaux.
- **Zinc façonné sur place** (bandes, solins, abergements) : en **feuilles de 2 × 1 m** (2 m², §25.2), plus en kg. Bandes : arrondi sup (ml × développé ÷ 2 m²) ; abergement : périmètre × 0,33 ÷ 2 m². Le joint debout reste en bobine au kg (VMZINC). Le bobineau n'est pas modélisé (pas de donnée).
- **Gouttières et descentes** : jamais de question de façonnage (pièces commandées toutes faites).
- **Questions** : le moteur découvre d'avance les questions qui suivent une réponse (il essaie chaque réponse possible) ; l'écran les pose toutes d'un coup, une seule validation.

## roofing-2026.10.03-16 — le fournisseur chiffre en dernier recours

- **Modèle refusé** (« aucun de ces modèles ») : le moteur calcule quand même avec le produit générique de la famille, étiqueté « modèle à préciser » ; le fournisseur met sa marque. Avant : la ligne partait « à chiffrer ». Exemple D-2026-015 : 29 faîtières (modèle à préciser) + 29 crochets, plus rien à chiffrer.
- **Bandes zinc au ml** (nouvel ouvrage `bandes-zinc`, famille `zinc_strip` : bande de ventilation, de solin, de rive, d'égout, couvre-joint, bavette) : question « développé ? » (100 / 250 / 330 / 400 mm, §36.4) et « tu façonnes ? ». Façonné : ml × 1,1 ÷ 1,9 → bandes de 2 m (§7, §36.4). Je façonne : ml × 1,1 × développé × 4,7 kg/m² (0,65 ; 5,04 en 0,70 ; 5,76 en 0,80 : 7,2 kg/m² par mm) en bobine, réunis avec le zinc du joint debout. Avant : « du métal au mètre sans largeur ni épaisseur », à chiffrer.
- **Abergement de cheminée** (nouvel ouvrage `abergement-cheminee`, famille `chimney_flashing` : entourage, abergement, solin de cheminée) : question « périmètre d'une cheminée ? » (2 / 3 / 4 / 5 m), puis périmètre × 1,3 en zinc développé 33 cm (§7) en bandes de 2 m ou en kg, et bande porte-solin au périmètre (longueurs de 2 m). Avant : « pas encore de règle », à chiffrer.
- Une ligne dont l'emplacement est « mesure seulement » (joint debout, abergement) a son rôle « mesure » d'office : plus de question « 2 : entourages à commander ou cheminées ? ».
- **Joint debout, rampant de plus de 10 m** (`bacs_longs`, §7 « bacs profilés à longueur (max 10 à 15 m) ») : si l'artisan commande façonné et que le rampant dépasse 10 m, question « bobine profilée sur place, ou bacs en plusieurs longueurs ? ». Profilée sur place : zinc en bobine au kg ; plusieurs longueurs : nombre de travées × arrondi sup (rampant / 10 m) bacs. Une condition de besoin (`when`) peut désormais citer une constante de l'ouvrage (`regle.rampant_max_bac`).
- **Panneaux OSB** (produit générique `panneau-osb-standard`, famille volige, §7 « 2,50 × 1,25 = 3,125 m² ») : commandé au m² (admis pour un panneau, §40.3) avec le nombre de panneaux à côté (« 96 m², ≈ 31 panneaux de 2,50 × 1,25 m »).
- Les dimensions lues par le prompt A (pente, rampant, épaisseur, développé, périmètre… dans la ligne ou l'en-tête) entrent dans le calcul comme faits du chantier, après le texte lu par le code et avant les hypothèses par défaut ; une pente en % est convertie en degrés.

## Version roofing-2026.10.03-15 (appliquée dans le moteur) — référentiel 41 sections

- **Joint debout (§7, §36)** : nouvel ouvrage `couverture-zinc-joint-debout`. Question d'ouverture (§40.2) : « Tu façonnes tes bacs toi-même, ou tu les commandes façonnés ? » ; « je façonne » → zinc en bobine en **kg** (5,5 / 6 / 7 kg/m² selon 0,65 / 0,70 / 0,80 mm, VMZINC 36.1), largeur 500 mm en bord de mer, 650 ailleurs ; « commandé façonné » → **bacs** = largeur du pan (surface ÷ rampant) ÷ entraxe (430 / 580 mm), à la longueur du rampant. Pattes par m² selon le rampant (tableau 36.2, fixes + coulissantes). Voliges sapin 18 mm = m² × 1,05 (§7). La question est posée par chantier : la mémoire des habitudes ne couvre pas encore les réponses, seulement les produits.
- **Test du fournisseur (§40, verrou §41.3)** : une ligne du devis en m², en ml de métal sans largeur ni épaisseur, en « lot », « forfait » ou « ensemble » ne part plus en commande : elle va chez « Le fournisseur chiffrera » avec sa mesure et la raison. Les panneaux et rouleaux (volige, OSB, écran, isolant) restent admis au m².
- **Questions (§41)** : plus de maximum ; la règle devient « une question si la réponse change une quantité de plus de 3 %, une unité ou un matériau ». Le tri par sensibilité reste à faire : aujourd'hui, toute donnée manquante est demandée.
- **Moteur** : condition d'existence d'un besoin (`when`), emplacement de mesure seule (`measureOnly`), surcharges de libellé et de quantité par l'artisan (§41.4).

## Version roofing-2026.10.03-14 (appliquée dans le moteur)

**Recouvrement hors des bornes Cupa d'un format (§34)** — 32×22 : 69 à 103 mm ; 30×22 : 69 à 100 mm… Règle du fondateur :

- **Le devis nomme le format (ou l'artisan l'a choisi) : on le garde toujours.** La formule Cupa calcule, la ligne est marquée « estimation, recouvrement hors table Cupa », et le format voisin (plage la plus proche qui admet ce recouvrement) est proposé en conseil : une hypothèse à boutons, jamais une question bloquante.
- **Le format ne vient pas du devis** (habitude de l'entreprise, défaut) : UNE question à boutons, le voisin « conseillé » en premier.

| Cas | Résultat |
|---|---|
| 32×22, 45°, région III, rampant 6 m (R 105) — exemple du §3, format du devis | 8 840 ardoises, « estimation » ; conseil : 33×23, puis 35×22, 35×25, 40×22 |
| 30×22, 30°, région III (R 120), format du devis | calculé par la formule, « estimation » ; conseil : 40×22 |
| même cas, format venu d'une habitude | question : « Ardoises 30×22 non admis ici : … Quel format ? », 40×22 (conseillé) en premier |

## Version roofing-2026.10.03-12

Décision du fondateur : **la table Cupa (§34) fait foi** pour tous les formats et recouvrements qu'elle couvre ; la formule Cupa ne sert qu'hors table.

| Élément | -11 | -12 |
|---|---|---|
| Ardoises au m² | formule Cupa partout | **table Cupa (194 lignes du §34)**, lue sur le recouvrement posé (hauteur − 2 × pureau) ; formule Cupa seulement hors table, dite « hors table » |
| Diamètre du crochet | change toujours le nombre | toujours affiché et modifiable ; ne change le nombre que hors table |
| 200 m², 30×22, 40°, région III (R 100) | 9 050 + 5 % | **44,8/m² → 9 408** |
| 200 m², 30×22, 45°, région I (R 80) | 8 639 | **40,7/m² → 8 547** |
| 200 m², 30×22, 45°, région III (R 95, hors table) | 9 271 / 9 200 à Brest | inchangé (formule) |
| Région ardoise | — | marquée **« estimation »** dans l'explication (zone climatique du département, en attendant la liste du DTU 40.11) |

## Version roofing-2026.10.03-11

Demandé par le fondateur avant la fusion de la porte `/v1/quantitatifs` :

| Élément | Avant (-10) | Maintenant (-11) |
|---|---|---|
| Ardoises au crochet | surface / (largeur × pureau) | formule Cupa §34 : surface / [pureau × (largeur + Ø crochet)] |
| Ø du crochet | non compté | 1 mm ; **inox 2,7 mm d'office si le chantier est dans un département littoral** (code postal) ; modifiable |
| 200 m², 30×22, 45°, région III | 9 313 ardoises | 9 271 (crochet 1 mm) ; **9 200 à Brest** (2,7 mm) |
| Crochets d'ardoise | même calcul que les ardoises, + 2 % (9 047 : moins que les ardoises) | **ardoises commandées (après marge) × 1,02** : 9 457 (1 mm), 9 384 à Brest ; jamais moins que les ardoises (test permanent) |
| Nom dans l'explication | « zone climatique 3 » | « région ardoise III » (DTU 40.11 ; la zone climatique reste pour les tuiles) |

Reste à faire (étape 3 du plan v3) : la table Cupa elle-même (§34) avant la formule, et la table des régions ardoise par département (§26, « à saisir depuis le DTU »). En attendant, la région ardoise prend la valeur de la zone climatique du département.

## Référentiel du 3 octobre 2026, 39 sections

Consigne du §37 : quand les sections 34, 35 et 36 (sources fabricant) contredisent les sections 3, 5 et 7, ce sont 34-36 qui font foi. Les anciennes valeurs sont notées ici avec la mention « remplacé par source fabricant ». Les sections 3, 5 et 7 restent utilisées pour les matériaux que 34-36 ne couvrent pas encore (fibres-ciment, tuiles béton, modèles non listés), chargées avec `confiance: "estimation"`.

### §3 Ardoise naturelle → §34 Table officielle Cupa — remplacé par source fabricant

| Élément | Ancienne valeur (§3) | Nouvelle valeur (§34) |
|---|---|---|
| Formule ardoises/m² | 1 000 000 / (L × pureau), L et pureau en mm | 1 / [P × (L + Ø crochet)], Ø 1 mm (0,0027 m inox en zone littorale) |
| Longueur de crochet | pureau + 10 à 20 mm | R + 1 cm environ (R 100 → 11 cm, R 90 → 10, R 80 → 9, R 70 → 8) |
| 40×22, R 100 | 30,3 ardoises/m² | 29,9 |
| 35×25, R 100 | 32,0 | 31,6 |
| 35×22, R 100 | 36,4 | 35,9 |
| 33×23, R 100 | 37,8 | 37,3 |
| 32×22, R 100 | 41,3 | 40,7 |
| 30×22, R 100 | 45,5 | 44,8 |
| 30×20, R 100 | 50,0 | 49,2 |
| 30×18, R 100 | 55,6 | 54,6 |
| Recouvrement hors table | ligne voisine du tableau | interpolation par les formules Cupa ; R hors bornes du format = format non admissible, proposer le voisin |

### §5 Tuiles → §35 Fiches Edilians — remplacé par source fabricant

| Élément | Ancienne valeur (§5) | Nouvelle valeur (§35) |
|---|---|---|
| Grand moule (HP10, Alpha 10, Double Romane…) | pureau 34 à 37 cm, 10 à 11 tuiles/m², liteaux 2,8 à 3,0 ml/m² | par modèle : HP10 pureau 310-376 mm, 9,9-12/m², liteaux 3,22 / 2,66 ; Alpha 10 330-370 mm, 10-11,2/m² ; etc. (tableau 35.1) |
| Petit moule (Marseille, Losangée, Beauvoise) | pureau 24 à 26 cm, 13 à 15/m², liteaux 4,0 à 4,2 | Marseille Poudenx 317-370 mm, 12,3-14,3/m² ; Beauvoise 242-248 mm, 20,2-20,7/m², liteaux 4,08 |
| Canal | 22 à 28 tuiles/m² au total | nombre donné pour le couvert seul, × 2 pour couvert + courant, selon le modèle et R 140-170 (tableau 35.3) |
| Pentes minimales | 28.1 : 14-16° grand moule, 17-20° petit moule *(à vérifier)* | tableaux DTU 40.21/40.22 par famille A/B/C, zone, site et rampant (35.4) |
| Pureau par défaut | pureau mini en zone 3 et pente < 35 % | pureau maxi par défaut, pureau mini en zone 3, site exposé ou rampant long |

### §7 Zinc joint debout → §36 Données VMZINC — remplacé par source fabricant

| Élément | Ancienne valeur (§7) | Nouvelle valeur (§36) |
|---|---|---|
| Poids | kg ≈ m² développé × 4,7 (0,65 mm) | 5,5 kg/m² posé (0,65), 6 (0,70), 7 (0,80) |
| Pattes | 3 pattes/ml de joint, 3 à 4 fixes par bac | pattes coulissantes et fixes par m², selon le rampant et la bobine (tableau 36.2) |
| Fixation des pattes | 2 vis ou pointes par patte | selon l'épaisseur du support : vis 4×30 ou pointe annelée 2,8×25 / 2,5×28 ; 2 par patte (à vérifier sur le modèle) |
| Joint de dilatation / ressaut | 1 tous les 10 à 15 m | longueur maxi des feuilles selon pente et zone (tableau 36.3) ; au-delà, jonction transversale |
| Épaisseur 0,70 mm | au-delà de 900 m d'altitude ou bacs > 10 m | 0,70 minimum pour une pente > 173 % (bardage) |
| Largeur 500 mm | zone 3 exposé et zone 4 | idem, et pente > 173 % ; zones de vent NV65 (36.1) |
