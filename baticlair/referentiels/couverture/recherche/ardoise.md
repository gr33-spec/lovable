# Ardoises : recherche du 19 novembre 2026

Ce fichier résume `ardoise.json`. Rien ici n'est lu par le moteur : le fondateur valide d'abord.

**En bref**

- 741 entrées, 20 formats d'ardoise naturelle calculés, 5 formats de fibres-ciment, 29 verdicts sur les ratios
  existants, 4 fiches « ce que demande le comptoir ».
- Après la seconde passe : 712 entrées confirmées par deux sources indépendantes (96 %), 19 confirmées sur la fiche
  du fabricant avec contrôle par le calcul (`confirme_fabricant`), 10 à une seule source, 0 à confirmer. Première
  passe : 616 / 0 / 116 / 9.
- Le recouvrement de l'ardoise vient du tableau 7 du NF DTU 40.11. Il a été relu chez deux fabricants qui le
  recopient : Cupa (tableau CSV téléchargé) et Rathscheck (brochure 2023). Les 169 valeurs sont identiques, y
  compris les pentes sous 35 % et à partir de 300 % (mal relues à la première passe).
- **Règle du fondateur (+ 2,5 mm) : confirmée.** C'est la formule du manuel CAP. **Règle du code (+ 5 mm) : à
  corriger.** Elle se dit tirée de Cupa, mais Cupa ne l'écrit nulle part.
- **Le tableau de recouvrement du code est trop fort**, de 0 à 7 mm. Il raisonne en longueur de rampant alors que
  le DTU raisonne en projection horizontale. **Les zones par département sont fausses** pour la côte sud de
  l'Atlantique, Rennes, Nantes et la Méditerranée.

Sources principales :

- Cupa : FAQ « pureau », FAQ « crochets », page « recouvrement » et son CSV.
- Rathscheck : brochure FR 2023.
- Frénéhard, fabricant de crochets à L'Aigle : catalogue 2015 et fiche « Nouveau DTU 2020 ».
- Manuel CAP couvreur, chapitre 21.
- Guide « Ardoises » du Ministère de la Culture.
- Cedral (Etex, ex-Eternit), cahier de pose des ardoises fibres-ciment.
- Tanguy Matériaux, négoce breton.
- Seconde passe : Pizarras Samaca (fiches FR 2026), Cembrit (Dolmen et Bravan, 2016), ArcelorMittal TE Pointes
  (catalogue 2021), Swisspearl (Suisse, 2026), fiche de révision CAP couvreur (Nomad Education).
- Le texte du NF DTU 40.11 de 2020, relu sur une copie non officielle. Ses tableaux y sont en image.

## 1. Comment on calcule (pose au crochet, à pureau entier)

| Quoi | Règle | Sources |
| --- | --- | --- |
| Recouvrement R | tableau 7 du NF DTU 40.11 : zone, pente, projection horizontale du rampant (≤ 5,50 / 5,50-11 / 11-16,50 m) | Cupa CSV + Rathscheck |
| Pureau | (hauteur − R) ÷ 2 | Cupa, Rathscheck, Ministère |
| Ardoises au m² | 1 ÷ [pureau × (largeur + 3 mm)] (le jeu de 3 mm = le fil du crochet) | Cupa (exemple 32×22 → 39,3), Rathscheck, Frénéhard |
| Liteaux au m² | 1 ÷ pureau | Cupa, Rathscheck, CAP |
| Format admis | hauteur ≥ 3 × R | Rathscheck, Cupa, DTU §5.1.1.3 |
| Crochet | R + 3 mm, arrondi au cm supérieur | Cupa, Frénéhard, DTU 2020 (cité par hmonp) |
| Crochet ≥ 12 cm | crochet à tige ondulée (crosinus) ; crochet droit au-delà de 11 cm : hors DTU | Frénéhard, Cupa |
| Site exposé (littoral ≤ 5 km, falaises, îles, estuaires) | + 10 mm en zone III selon le DTU 2020 ; « + 10 % » selon Cupa et Rathscheck (ancien texte) ; même crochet en Bretagne | une source (DTU, copie non officielle) |

**Les zones du DTU (annexe B, inchangées en 2020).** Elles suivent la distance à la côte, pas le département.

- **Zone 3** : bande de 20 km le long de la Mer du Nord, de la Manche et de l'Atlantique jusqu'à Lorient. Aussi la
  vallée du Rhône, la Provence, le Languedoc, le Roussillon, la Corse, et tout ce qui est au-dessus de 500 m.
- **Zone 2** : bande de 20 km sur la côte atlantique, de Lorient à l'Espagne. Aussi une bande de transition
  d'environ 20 km derrière la zone 3 (Manche et Bretagne), et tout ce qui est entre 200 et 500 m d'altitude.
- **Zone 1** : le reste, sous 200 m.

**En Bretagne :**

| Zone | Où (approximatif) |
| --- | --- |
| Zone 3 | Côtes-d'Armor et Finistère côtiers, côte du Morbihan jusqu'à Lorient, Saint-Malo, Dinard, Cancale |
| Zone 2 | Côte sud à l'est de Lorient (Auray, Quiberon, Vannes, golfe du Morbihan) ; bande de 20 à 40 km derrière la côte nord et ouest (Guingamp, Carhaix…) ; monts d'Arrée au-dessus de 200 m |
| Zone 1 | Le bassin de Rennes, et sans doute Pontivy et Ploërmel (plus de 40 km de la côte, sous 200 m) : **à confirmer commune par commune** |

## 2. Tableau Bretagne : ce qu'il faut au m²

Cellule = recouvrement / crochet / pureau (mm) / **ardoises au m²**. Conditions : projection horizontale ≤ 5,50 m,
situation normale, hors pertes, doublis et faîtage.

| Format | Pente | Zone 1 (Rennes) | Zone 2 (Vannes, intérieur) | Zone 3 (côte nord et ouest) |
| --- | --- | --- | --- | --- |
| 32×22 | 38,7° (80 %) | 80 / 9 / 120 / **37,4** | 89 / 10 / 115,5 / **38,8** | 97 / 10 / 111,5 / **40,2** |
| 32×22 | 45° (100 %) | 73 / 8 / 123,5 / **36,3** | 80 / 9 / 120 / **37,4** | 89 / 10 / 115,5 / **38,8** |
| 32×22 | 50° (120 %) | 69 / 8 / 125,5 / **35,7** | 77 / 8 / 121,5 / **36,9** | 83 / 9 / 118,5 / **37,8** |
| 30×20 | 38,7° | 80 / 9 / 110 / **44,8** | 89 / 10 / 105,5 / **46,7** | 97 / 10 / 101,5 / **48,5** |
| 30×20 | 45° | 73 / 8 / 113,5 / **43,4** | 80 / 9 / 110 / **44,8** | 89 / 10 / 105,5 / **46,7** |
| 30×20 | 50° | 69 / 8 / 115,5 / **42,7** | 77 / 8 / 111,5 / **44,2** | 83 / 9 / 108,5 / **45,4** |
| 33×23 | 45° | 73 / 8 / 128,5 / **33,4** | 80 / 9 / 125 / **34,3** | 89 / 10 / 120,5 / **35,6** |
| 35×22 | 45° | 73 / 8 / 138,5 / **32,4** | 80 / 9 / 135 / **33,2** | 89 / 10 / 130,5 / **34,4** |
| 40×22 | 45° | 73 / 8 / 163,5 / **27,4** | 80 / 9 / 160 / **28,0** | 89 / 10 / 155,5 / **28,8** |
| 27×18 | 45° | 73 / 8 / 98,5 / **55,5** | 80 / 9 / 95 / **57,5** | 89 / 10 / 90,5 / **60,4** |
| 22×16 | 45° | 73 / 8 / 73,5 / **83,5** | non admis | non admis |

Liteaux au m² = 1000 ÷ pureau. Exemple : 32×22, zone 3, 45° → 8,66 ml/m². Les 33×23, 35×22 et 40×22 aux faibles recouvrements sont calculés hors de la plage de la table fabricant (¹ en annexe).

Points à retenir pour la Bretagne :

- **Pente minimale du 32×22** : 50 % (26,6°) en zone 1, 60 % (31°) en zone 2, 70 % (35°) en zone 3. Pour le 30×20 :
  55 %, 70 % et 80 %. Une pente de « 45 % » lue au devis exclut ces formats partout en Bretagne : c'est une erreur
  probable à confirmer.
- **Site exposé en zone 3** (moins de 5 km de la mer, îles, presqu'îles, estuaires) : + 10 mm de recouvrement.
  Exemple : 32×22 à 45°, R 99, crochet 11, pureau 110,5, 40,6/m². Avec le « + 10 % » de Cupa et Rathscheck : R 98,
  même crochet de 11, pureau à 0,5 mm près. Le + 10 mm reste à relire dans le texte AFNOR.
- **Crochets** : Ø 2,4 interdit dans le 22, le 29 et le 56 (zones de vent 3 et 4). Prendre du 2,7 au minimum,
  et du 3,0 pour les formats au-delà de 40×22 en zone 3.
- **Nuance de l'inox** : 18/10 à moins de 20 km de la mer, 316Ti à moins de 3 km (sauf dérogation écrite du
  fabricant). Pas de galva : il est interdit depuis le DTU de 2020.
- **Pose sur voligeage jointif**, fréquente en Bretagne à cause du vent (guide du Ministère) : tous les crochets
  sont à pointe.

Les tableaux complets des 20 formats (pentes de 35° à 59,5°, trois zones) sont à l'annexe A.

## 3. Le pureau quand l'artisan donne le crochet (fondateur contre code)

| | Formule | 32×22, crochet 9 | Ardoises/m² |
| --- | --- | --- | --- |
| Fondateur (skill) | (H − C) ÷ 2 + 2,5 mm, soit R = C − 5 mm | 117,5 mm | 38,1 |
| Manuel CAP (« jeu de tête 0,5 cm ») | (H − C + 5 mm) ÷ 2 : **identique** | 117,5 mm | 38,1 |
| Code (roofing.ts:2060, marge 10 mm) | (H − (C − 10)) ÷ 2, soit R = C − 10 mm | 120 mm | 37,3 |

**Pourquoi les deux formules existent.** Le DTU, Cupa et Frénéhard choisissent le crochet ainsi : R + 3 mm,
arrondi au cm supérieur. Un crochet de 9 cm sert donc pour tout recouvrement de 78 à 87 mm. Le Ministère le dit
autrement : le crochet dépasse le recouvrement de 3 à 10 mm. Les deux formules tombent dans cette plage.

- Le fondateur prend R = C − 5 : côté prudent, plus d'ardoises. C'est aussi la règle de la FARCC belge
  (« crochet = R + 5 mm »).
- Le code prend R = C − 10 : le bas de la plage, environ 2 % d'ardoises en moins.
- La note du code « crochet − 1 cm (Cupa §34) » vient d'une lecture du tableau Cupa. Le texte de Cupa dit
  « + 3 mm, arrondi au cm ».

**Verdict** : fondateur **confirmé**, code **à corriger** (marge de 5 mm). Garde-fou à ajouter : ne jamais descendre
sous le recouvrement du DTU. Formule : pureau = (H − max(R_DTU, C − 5 mm)) ÷ 2. Exemple : R 97 et crochet 10 donnent
C − 5 = 95, qui est sous 97 ; on garde donc 97.

## 4. Proposition : le pureau sans question supplémentaire

1. **Crochet écrit au devis** (« crochets de 10 ») : pureau = (H − max(R_DTU, C − 5)) ÷ 2. Le devis prime.
2. **Pas de crochet écrit** : on calcule tout, sans rien demander.
   - **Zone** : déduite du code postal. Il faut une table par commune (distance à la côte ; altitude au-dessus de
     200 et de 500 m), à construire une fois avec les données IGN ou INSEE. En attendant, prendre le département au
     plus exposé, avec trois corrections sûres : la côte atlantique au sud de Lorient en zone 2 ; Rennes (35000 à
     35200) et Nantes (44000 à 44300) en zone 1 ; la Méditerranée en zone 3.
   - **Site exposé** : la liste officielle des communes littorales (loi Littoral) sert de première approximation.
   - **Pente** : celle du devis. Sinon, **45° par défaut pour l'ardoise**, et non 45 %.
   - **Projection** : rampant du devis × cos(pente). Sinon, ≤ 5,50 m.
   - **R** : lu dans le tableau DTU, + 10 mm en zone III exposée. **Crochet** = R + 3 mm, arrondi au cm.
     **Pureau** = (H − R) ÷ 2.
3. **Chiffres par défaut pour la Bretagne** (32×22, 45°) :

   | Zone | R | Crochet | Ardoises/m² |
   | --- | --- | --- | --- |
   | Zone 3 | 89 | 10 | 38,8 |
   | Zone 3 exposée | 99 | 11 | 40,6 |
   | Zone 2 | 80 | 9 | 37,4 |
   | Zone 1 | 73 | 8 | 36,3 |

   On affiche la phrase d'hypothèse, par exemple : « zone 3, pente 45°, crochet 10 ». L'artisan corrige d'un geste.
4. Le tableau DTU remplace la table du code (roofing.ts:2131). On n'arrondit plus aux 5 mm. Le supplément « rampant
   > 5,5 m » est remplacé par les colonnes de projection.

## 5. Crochets

- **Longueurs** : de 7 à 16 cm, de cm en cm. Le 17 cm est hors DTU, et le Ø 2,4 s'arrête à 11 cm.
- **Diamètres** : 2,4, 2,7, 3,0 (et 3,4 en cuivre). Le diamètre ne dépasse jamais l'épaisseur de l'ardoise.
- **Matières admises** (DTU 2020) :
  - inox 17 % (X6Cr17), seulement en milieu rural ;
  - inox 18/10 ;
  - inox 316Ti (X6CrNiMoTi 17-12-2), en bord de mer ;
  - cuivre.

  **Galva interdit.** Les anciennes fiches de Cupa et le catalogue Frénéhard de 2015 en listent encore.
- **Finition** : brut, ou teinté noir (Anjou Color : 100 µm de polyester).
- **Agrafe ou pointe** :
  - l'agrafe se clipse sur le liteau ; on la choisit d'après l'épaisseur du liteau (14, 18 ou 20 mm) ;
  - la pointe se plante au droit des chevrons et sur la volige ; elle mesure au moins l'épaisseur de l'ardoise
    + 20 mm.
- **Nombre** : 1 crochet par ardoise en pureau entier, 2 en claire-voie (Cupa, Frénéhard, DTU).
- **Part de crochets à pointe** quand on pose à l'agrafe : 1/5 selon le manuel CAP. C'est la seule source. En
  partie courante, la géométrie donnerait plutôt 7 à 10 % (un contre-liteau de 4 cm tous les 60 cm). Sur
  voligeage : 100 % de pointes.
- **Boîtes** :
  - Frénéhard, Ø 2,7 : agrafes par 500 (7 à 14 cm) ou 400 (15-16 cm) ; pointes par 700 (7 à 14 cm) ou 500
    (15-16 cm) ; aussi en boîte de 5 kg ;
  - négoces : boîtes de 500 (« CA Inox 17 % 11×2.7 A16 500 ») ; chez Leroy Merlin, 700 et 900 ;
  - manuel CAP, boîte de 5 kg en Ø 2,7 : 11 cm = 540 agrafes ou 640 pointes.

  **Aucun carton de 1 000.**

## 6. Clous

- **Dimensions** (Frénéhard, d'après le tableau 3 du DTU) : 27×15 (Ø 2,4, longueur 27), 30×16 (Ø 2,7, 30),
  35×17 (Ø 3,0, 35). Tête large, au moins 7,5 mm. Le clou dépasse la volige d'environ 10 mm (Ministère).
- **Matière** : galva (au moins 5 g/dm² de zinc) admis pour les clous cachés. Les clous apparents (dernier rang,
  lignolet) sont en inox ou en cuivre.
- **Nombre** : 2 par ardoise en pose clouée. Sont toujours fixés à 2 clous : les ardoises de rive, le doublis et le
  premier rang à l'égout, le dernier rang au faîtage.
- **Vente** : au kg, en boîtes de 1 kg (cuivre, Rivierre) ou de 5 kg (galva 2,7×30, Tanguy).
- **Nombre au kg** (catalogue ArcelorMittal TE Pointes, confirmé sur fiche fabricant et par le calcul de masse) :
  galva tête extra-large 2,7×30 = environ 653 ; 2,4×27 = 919 ; 2,7×27 = 726 ; 2,7×40 = 433. Cuivre carrée crantée
  3,0×30 = 420. Une autre marque peut différer d'environ 10 % : la commande reste au kg.

## 7. Rangs en plus et pertes

| Poste | Règle | Statut |
| --- | --- | --- |
| Égout | 1 rang de doublis (ardoise raccourcie : pureau + R), soit ml d'égout ÷ (largeur + 3 mm) ardoises. Plus-value CAP : pureau × longueur, ce qui fait exactement 1 rang | confirmé (DTU, Ministère, CAP) |
| Faîtage | 1 rang de doublage (rang de rencontre) | confirmé (DTU, Ministère) |
| Rive | CAP : + 0,16 m² par ml (tranchis droit), 0,25 (biais), 0,33 (circulaire). Ardoises entières et demies, à 2 clous | une source |
| Pertes | 5 % toit simple, 10 % toit compliqué (fondateur) | une source : le 5 % est écrit dans une fiche de révision CAP ; le 10 % n'a aucune source |

## 8. Ardoises fibres-ciment

Sources : Cedral (Etex France, ex-Eternit, manuel d'avril 2026) et Cembrit (Dolmen et Bravan, 2016). Les deux
publient les mêmes nombres au m² pour le 40×24, le 45×30 et le 60×30 (joint de 6 mm entre ardoises), et le même
tableau de recouvrement. Le 33×23 et la Kergoat ronde 40×22 sont propres à Cedral (`confirme_fabricant`).

- **Formats en couverture** : Cedral 33×23, 40×22 (Kergoat ronde), 40×24, 45×30, 60×30 ; Cembrit 32×23, 33×24,
  40×24, 44×29, 45×30, 60×30. **Le 40×27 et le 60×40 du référentiel n'existent chez aucun des deux** (confirmé). Le
  600×400 existe chez Swisspearl en Suisse (norme SIA, 9,5 à 10,3 au m²) : c'est sans doute l'origine du 10/m² du code.
- **Fixation : un seul mode par chantier.**
  - 1 crochet, pour tous les formats. Crochet = R + 10 mm.
  - Ou 2 clous, pour les formats jusqu'au 40×24.
  - Ou 2 clous + 1 crampon tempête, pour les formats à partir du 45×30.
  - Crochet = R + 10 mm chez Cedral et chez Cembrit (confirmé).
  - En claire-voie : 2 crochets.
- **Ardoises au m²** à R 100 (pose au crochet) : 40×24 = 27,10 ; 45×30 = 18,67 ; 60×30 = 13,08 ; 33×23 = 36,85. En
  pose clouée, le 40×24 = 27,33.
- **Recouvrement du 40×24 au crochet, à 45-50°** : zone III = 100 mm (110 au-delà de 8 m de projection) ; zone II =
  90 ; zone I = 80 (25,41/m²).
- **Zone III exposée** : + 10 mm (Cedral, Cembrit : 40×24 à 45°, 100 → 110).
- **Palettes** (propres à la marque) : Cedral 33×23 = 3 000 ; 40×24 = 1 980 ; 45×30 = 1 440 ; 60×30 = 1 080
  (poids × nombre = poids de la palette) ; Cembrit 40×24 = 1 800 ; 45×30 = 1 200 ; 60×30 = 1 000.

## 9. Origines et qualités

- **Espagne, très majoritaire** (Galice, León) : Cupa, dont le siège France est à Rennes, Matacouta, Del Carmen,
  Proinor, Santa Clara. Tanguy Matériaux, négoce breton, les vend. Il vend aussi les fibres-ciment Kergoat (Eternit,
  atelier en Bretagne), Orléane, Artoit, Tregal, Bravan et Karnak.
- **Trélazé (Angers)** : fermé en mars 2014 ; c'était la dernière ardoisière de France.
- **Autres origines** : Brésil, Chine et Inde produisent aussi ; le Pays de Galles reste marginal. Samaca et
  Pizarras Los Ángeles n'ont pas été vérifiés en négoce breton.
- **Exigences du DTU 2020** : NF EN 12326-1, plus W1 (absorption ≤ 0,6 %), T1, S1, et carbone non carbonaté ≤ 2 %.
- **Marque NF** : codes D1 et D2 (depuis 2017), obligatoires sur les palettes. Chez Cupa : Excellence = D1,
  Ardoisier = D2, Naturelle = hors NF.
- **Épaisseur** : 3,5 à 5 mm couramment (7-8 mm pour les épaisses) ; 4,5 mm minimum en Monuments historiques.
- **Poids**, en 3,5 mm (Cupa, FAQ de février 2026 ; volume × 2,8 g/cm³) : 32×22 = 0,69 kg ; 30×20 = 0,59 kg ;
  27×18 = 0,48 kg ; 33×23 = 0,744 ; 35×22 = 0,755 ; 40×20 = 0,784 ; 40×22 = 0,862 ; 40×25 = 0,98. Le chiffre du
  Ministère pour le 325×220 de 2,7 mm (540 kg le mille) est cohérent.
- **Longueur réelle du 32×22** : 320 mm chez Cupa et Rathscheck (confirmé par leurs pureaux). Le 325×220 du
  Ministère est l'ancien « modèle ordinaire » français de 2,7 mm, pas le 32×22 vendu aujourd'hui.
- **Samaca** (Valdeorras) : fiches FR 2026 ; le Samaca 29 et le 55 existent en 60×30, ce qui confirme ce format en
  ardoise naturelle (seule Rathscheck en donnait la table).

## 10. Ce que demande le comptoir

| Article | Ce que le vendeur demande | Unité de vente |
| --- | --- | --- |
| Ardoises naturelles | format, carrière ou marque, sélection (D1/D2, 1er choix, rustique), épaisseur, nombre | pièce, au mille ou à la palette (nombre par palette selon le modèle, à demander) |
| Crochets | longueur, Ø, agrafe ou pointe (crosinus dès 12 cm), épaisseur de liteau (agrafe), nuance (17 %, 18/10, 316Ti, cuivre), brut ou teinté, talon | boîte (500, 700, 400, 900 ou 5 kg) |
| Clous | matière, Ø × longueur (2,7×30), tête large, tige lisse, crantée ou torsadée | kg (boîtes de 1 ou 5 kg) |
| Fibres-ciment | gamme, format, teinte, nombre ; crochets (R + 10), clous cuivre ou inox, crampons | pièce ou palette |

## 11. Verdicts sur les ratios existants

| Ratio (origine) | Verdict | Bonne valeur |
| --- | --- | --- |
| Pureau = (H − crochet) ÷ 2 + 2,5 mm (skill) | **confirmé** | idem (manuel CAP), avec un plancher au R du DTU |
| marge_crochet = 10 mm dans le pureau (roofing.ts:2060, 2126) | **corrigé** | 5 mm |
| Crochet par défaut = R + 10 arrondi au cm (roofing.ts:2080) | **corrigé** | R + 3, arrondi au cm |
| Table de recouvrement du code (roofing.ts:2131) | **corrigé** | tableau DTU (45° : 73 / 80 / 89) |
| + 10 mm si rampant > 5,5 m (roofing.ts:2122) | **corrigé** | colonnes de projection horizontale du DTU |
| Arrondi du R aux 5 mm (roofing.ts:2125) | à confirmer | inutile avec le tableau DTU |
| Ø crochet = 1 mm dans la formule (roofing.ts:354) | **corrigé** | 3 mm |
| Table Cupa des ardoises au m² (roofing.ts:141) | **confirmé** | identique, recoupée par Rathscheck (à 0,1 près) |
| Liteaux = 1 ÷ pureau | **confirmé** | idem |
| Crochets = ardoises × 1,02 | à confirmer | 1 par ardoise ; le + 2 % n'est pas sourcé |
| 1 crochet par ardoise partout (skill) | **confirmé** | 2 en claire-voie |
| Libellé « longueur = pureau + 10 à 20 mm » (roofing.ts:1732) | **corrigé** | recouvrement + 3 mm, arrondi au cm |
| Cartons de 1 000 crochets (référentiel §3) | **corrigé** | boîtes de 500 ou 700, ou 5 kg |
| Inox brut, boîte de 500 (skill) | **confirmé** | 500 pour les agrafes ; 700 pour les pointes ; nuance selon la mer |
| Inox 2,7 en département littoral | **confirmé** | + 3,0 pour les formats > 40×22 en zone 3 |
| Zones par département (zone.ts) | **corrigé** | zones du DTU par distance à la côte (§1) |
| Pente minimale 24° / 31° (référentiel §3) | **corrigé** | dépend du format (32×22 : 50 / 60 / 70 %) |
| Pente par défaut 45 % (ratios-a-valider) | à confirmer | 45° pour l'ardoise |
| Pertes 5 % / 10 % (skill, code) | à confirmer | 5 % écrit aussi dans une fiche de révision CAP ; 10 % sans source |
| + 1 rang égout, + 1 rang faîtage (skill) | **confirmé** | doublis et rang de doublage |
| Rives dans la perte (skill) | à confirmer | CAP : + 0,16 m² par ml |
| Clous : 1 au faîtage, 2 ailleurs, galva (skill) | **corrigé** | 2 au faîtage aussi ; clous apparents en inox ou cuivre |
| 2 clous cuivre en pose clouée (référentiel §3) | **confirmé** | 2 clous (cuivre, inox ou galva caché) |
| Formats courants 32×22 et 30×20 (skill) | **confirmé** | une source écrite (Cupa) |
| Crochets courants 90, 100, 110 (skill) | **confirmé** | de 8 à 11 cm en Bretagne selon la pente |
| Part de crochets à pointe (skill, référentiel §25.1) | à confirmer | 1/5 (CAP seul) ; 100 % sur volige |
| Fibres-ciment au m² : 27,8 / 24,7 / 13,3 / 10 (roofing.ts:1711) | **corrigé** | Cedral et Cembrit R 100 : 40×24 = 27,10 ; 60×30 = 13,08 ; 40×27 et 60×40 hors gamme France |
| Fibres-ciment : 2 clous + 1 antivent par ardoise (roofing.ts:2245) | **corrigé** | 1 crochet, ou 2 clous, ou 2 clous + crampon, selon le format |
| Qualité « Espagne 1er choix » ou « NF » (roofing.ts:537) | à confirmer | carrière + sélection (D1/D2) + épaisseur |

## 12. Ce qui reste à une seule source, et pourquoi

Aucune entrée n'est plus `a_confirmer`. Dix restent `une_source` :

1. **Site exposé : + 10 mm.** Lu seulement dans une copie non officielle du NF DTU 40.11 de 2020 ; Cupa (catalogues
   2023-2024) et Rathscheck (2023) écrivent encore « + 10 % » (ancien texte). Écart compris : en Bretagne zone 3 les
   deux règles donnent le même crochet (R 89 → 98 ou 99, crochet 11). À relire dans le texte AFNOR.
2. **Ø 3,0 mm au-delà de 40×22 en zone 3** : lu seulement dans le texte du DTU (copie). Aucun fabricant d'ardoise
   naturelle ne le reprend ; la règle Cembrit (fil Ø 3 mm en zone 2 exposée et zone 3) vaut pour les fibres-ciment.
3. **Nuances d'inox selon la distance à la mer** : seule la fiche Frénéhard (2021) résume le tableau B.1 du DTU ; la
   copie du DTU ne donne que son titre.
4. **Part de crochets à pointe (1/5)** : seul le manuel CAP.
5. **Crochets par boîte de 5 kg** : seul le manuel CAP ; Frénéhard ne donne que des poids bruts.
6. **Plus-value de rive (0,16 m² par ml)** : seul le manuel CAP.
7. **Pertes** : le 5 % a maintenant une source écrite (fiche de révision CAP) ; le 10 % n'en a aucune.
8. **Origines, négoce breton, formats courants en Bretagne** : une source chacune (Batiweb, Tanguy, Cupa). Point P et
   l'Asturienne refusent la lecture automatique.

Hors entrées, il reste à construire la **zone de chaque commune bretonne** : le DTU définit les zones par la distance
à la côte (20 et 40 km) et l'altitude, sans liste de communes.

Les quatre formats absents (40×24, 32×20, 24×16 et 22×18 en ardoise naturelle) sont maintenant confirmés absents
(Cupa, Rathscheck, Samaca, Ministère) : si un devis en écrit un, appliquer les formules ou demander « il en faut combien
au m² ? ».

## 13. Décisions pour le fondateur

1. **Marge du crochet** : garder ta règle (+ 2,5 mm, R = C − 5) et corriger le code. Elle est confirmée par le
   manuel CAP et elle est prudente. Faut-il ajouter le plancher « jamais sous le R du DTU » ?
2. **Tableau de recouvrement** : remplacer la table actuelle par le tableau DTU (Cupa et Rathscheck), avec les
   colonnes de projection horizontale. On abandonne l'arrondi aux 5 mm et le seuil « rampant 5,5 m ».
3. **Zones** : passer d'une zone par département à une zone par commune (distance à la côte). En attendant,
   corriger la côte atlantique au sud de Lorient (zone 2), Rennes et Nantes (zone 1) et la Méditerranée (zone 3).
4. **Pente par défaut pour l'ardoise** : 45° (et non 45 %) ?
5. **Crochets** : + 2 % (code) ou exactement 1 par ardoise commandée (toi) ?
6. **Clous du faîtage** : 2 par ardoise (DTU, Ministère) au lieu de 1 ?
7. **Rives** : les laisser dans la perte, ou ajouter la plus-value CAP (0,16 m² par ml) ?
8. **Fibres-ciment** : corriger les nombres au m² (Cedral) et demander le mode de fixation (crochet, clous, ou clous
   + crampon) au lieu d'additionner clous et antivents.
9. **Crochets à pointe** : adopter 1/5 sur liteaux et 100 % sur voligeage ?

## Annexe A : tableaux complets par format

Cellule : R / crochet / pureau (mm) / **ardoises au m²** / liteaux (ml/m²). Projection horizontale ≤ 5,50 m,
situation normale ou protégée. « Non admis » : R dépasse le tiers de la hauteur de l'ardoise.
¹ = R hors de la plage de la table du fabricant pour ce format : la valeur est calculée avec les mêmes formules.
Les colonnes 5,50-11 m et 11-16,50 m sont dans `ardoise.json` (entrées `recouvrement_minimal`).

**60 × 30** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 256,5 / **12,9** / 3,90 ¹ | R 94 / 10 cm / 253,0 / **13,0** / 3,95 ¹ | R 106 / 11 cm / 247,0 / **13,4** / 4,05 ¹ |
| 80 % (38,7°) | R 80 / 9 cm / 260,0 / **12,7** / 3,85 ¹ | R 89 / 10 cm / 255,5 / **12,9** / 3,91 ¹ | R 97 / 10 cm / 251,5 / **13,1** / 3,98 ¹ |
| 90 % (42°) | R 77 / 8 cm / 261,5 / **12,6** / 3,82 ¹ | R 87 / 9 cm / 256,5 / **12,9** / 3,90 ¹ | R 92 / 10 cm / 254,0 / **13,0** / 3,94 ¹ |
| 100 % (45°) | R 73 / 8 cm / 263,5 / **12,5** / 3,80 ¹ | R 80 / 9 cm / 260,0 / **12,7** / 3,85 ¹ | R 89 / 10 cm / 255,5 / **12,9** / 3,91 ¹ |
| 120 % (50°) | R 69 / 8 cm / 265,5 / **12,4** / 3,77 ¹ | R 77 / 8 cm / 261,5 / **12,6** / 3,82 ¹ | R 83 / 9 cm / 258,5 / **12,8** / 3,87 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 267,5 / **12,3** / 3,74 ¹ | R 73 / 8 cm / 263,5 / **12,5** / 3,80 ¹ | R 80 / 9 cm / 260,0 / **12,7** / 3,85 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 267,5 / **12,3** / 3,74 ¹ | R 69 / 8 cm / 265,5 / **12,4** / 3,77 ¹ | R 77 / 8 cm / 261,5 / **12,6** / 3,82 ¹ |

**50 × 25** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 206,5 / **19,1** / 4,84 ¹ | R 94 / 10 cm / 203,0 / **19,5** / 4,93 ¹ | R 106 / 11 cm / 197,0 / **20,1** / 5,08 ¹ |
| 80 % (38,7°) | R 80 / 9 cm / 210,0 / **18,8** / 4,76 ¹ | R 89 / 10 cm / 205,5 / **19,2** / 4,87 ¹ | R 97 / 10 cm / 201,5 / **19,6** / 4,96 ¹ |
| 90 % (42°) | R 77 / 8 cm / 211,5 / **18,7** / 4,73 ¹ | R 87 / 9 cm / 206,5 / **19,1** / 4,84 ¹ | R 92 / 10 cm / 204,0 / **19,4** / 4,90 ¹ |
| 100 % (45°) | R 73 / 8 cm / 213,5 / **18,5** / 4,68 ¹ | R 80 / 9 cm / 210,0 / **18,8** / 4,76 ¹ | R 89 / 10 cm / 205,5 / **19,2** / 4,87 ¹ |
| 120 % (50°) | R 69 / 8 cm / 215,5 / **18,3** / 4,64 ¹ | R 77 / 8 cm / 211,5 / **18,7** / 4,73 ¹ | R 83 / 9 cm / 208,5 / **19,0** / 4,80 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 217,5 / **18,2** / 4,60 ¹ | R 73 / 8 cm / 213,5 / **18,5** / 4,68 ¹ | R 80 / 9 cm / 210,0 / **18,8** / 4,76 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 217,5 / **18,2** / 4,60 ¹ | R 69 / 8 cm / 215,5 / **18,3** / 4,64 ¹ | R 77 / 8 cm / 211,5 / **18,7** / 4,73 ¹ |

**46 × 30** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 186,5 / **17,7** / 5,36 ¹ | R 94 / 10 cm / 183,0 / **18,0** / 5,46 ¹ | R 106 / 11 cm / 177,0 / **18,6** / 5,65 ¹ |
| 80 % (38,7°) | R 80 / 9 cm / 190,0 / **17,4** / 5,26 ¹ | R 89 / 10 cm / 185,5 / **17,8** / 5,39 ¹ | R 97 / 10 cm / 181,5 / **18,2** / 5,51 ¹ |
| 90 % (42°) | R 77 / 8 cm / 191,5 / **17,2** / 5,22 ¹ | R 87 / 9 cm / 186,5 / **17,7** / 5,36 ¹ | R 92 / 10 cm / 184,0 / **17,9** / 5,43 ¹ |
| 100 % (45°) | R 73 / 8 cm / 193,5 / **17,1** / 5,17 ¹ | R 80 / 9 cm / 190,0 / **17,4** / 5,26 ¹ | R 89 / 10 cm / 185,5 / **17,8** / 5,39 ¹ |
| 120 % (50°) | R 69 / 8 cm / 195,5 / **16,9** / 5,12 ¹ | R 77 / 8 cm / 191,5 / **17,2** / 5,22 ¹ | R 83 / 9 cm / 188,5 / **17,5** / 5,31 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 197,5 / **16,7** / 5,06 ¹ | R 73 / 8 cm / 193,5 / **17,1** / 5,17 ¹ | R 80 / 9 cm / 190,0 / **17,4** / 5,26 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 197,5 / **16,7** / 5,06 ¹ | R 69 / 8 cm / 195,5 / **16,9** / 5,12 ¹ | R 77 / 8 cm / 191,5 / **17,2** / 5,22 ¹ |

**46 × 25** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 186,5 / **21,2** / 5,36 ¹ | R 94 / 10 cm / 183,0 / **21,6** / 5,46 ¹ | R 106 / 11 cm / 177,0 / **22,3** / 5,65 ¹ |
| 80 % (38,7°) | R 80 / 9 cm / 190,0 / **20,8** / 5,26 ¹ | R 89 / 10 cm / 185,5 / **21,3** / 5,39 ¹ | R 97 / 10 cm / 181,5 / **21,8** / 5,51 ¹ |
| 90 % (42°) | R 77 / 8 cm / 191,5 / **20,6** / 5,22 ¹ | R 87 / 9 cm / 186,5 / **21,2** / 5,36 ¹ | R 92 / 10 cm / 184,0 / **21,5** / 5,43 ¹ |
| 100 % (45°) | R 73 / 8 cm / 193,5 / **20,4** / 5,17 ¹ | R 80 / 9 cm / 190,0 / **20,8** / 5,26 ¹ | R 89 / 10 cm / 185,5 / **21,3** / 5,39 ¹ |
| 120 % (50°) | R 69 / 8 cm / 195,5 / **20,2** / 5,12 ¹ | R 77 / 8 cm / 191,5 / **20,6** / 5,22 ¹ | R 83 / 9 cm / 188,5 / **21,0** / 5,31 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 197,5 / **20,0** / 5,06 ¹ | R 73 / 8 cm / 193,5 / **20,4** / 5,17 ¹ | R 80 / 9 cm / 190,0 / **20,8** / 5,26 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 197,5 / **20,0** / 5,06 ¹ | R 69 / 8 cm / 195,5 / **20,2** / 5,12 ¹ | R 77 / 8 cm / 191,5 / **20,6** / 5,22 ¹ |

**40 × 25** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 156,5 / **25,3** / 6,39 ¹ | R 94 / 10 cm / 153,0 / **25,8** / 6,54 ¹ | R 106 / 11 cm / 147,0 / **26,9** / 6,80 ¹ |
| 80 % (38,7°) | R 80 / 9 cm / 160,0 / **24,7** / 6,25 ¹ | R 89 / 10 cm / 155,5 / **25,4** / 6,43 ¹ | R 97 / 10 cm / 151,5 / **26,1** / 6,60 ¹ |
| 90 % (42°) | R 77 / 8 cm / 161,5 / **24,5** / 6,19 ¹ | R 87 / 9 cm / 156,5 / **25,3** / 6,39 ¹ | R 92 / 10 cm / 154,0 / **25,7** / 6,49 ¹ |
| 100 % (45°) | R 73 / 8 cm / 163,5 / **24,2** / 6,12 ¹ | R 80 / 9 cm / 160,0 / **24,7** / 6,25 ¹ | R 89 / 10 cm / 155,5 / **25,4** / 6,43 ¹ |
| 120 % (50°) | R 69 / 8 cm / 165,5 / **23,9** / 6,04 ¹ | R 77 / 8 cm / 161,5 / **24,5** / 6,19 ¹ | R 83 / 9 cm / 158,5 / **24,9** / 6,31 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 167,5 / **23,6** / 5,97 ¹ | R 73 / 8 cm / 163,5 / **24,2** / 6,12 ¹ | R 80 / 9 cm / 160,0 / **24,7** / 6,25 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 167,5 / **23,6** / 5,97 ¹ | R 69 / 8 cm / 165,5 / **23,9** / 6,04 ¹ | R 77 / 8 cm / 161,5 / **24,5** / 6,19 ¹ |

**40 × 22** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 156,5 / **28,7** / 6,39 ¹ | R 94 / 10 cm / 153,0 / **29,3** / 6,54 | R 106 / 11 cm / 147,0 / **30,5** / 6,80 |
| 80 % (38,7°) | R 80 / 9 cm / 160,0 / **28,0** / 6,25 ¹ | R 89 / 10 cm / 155,5 / **28,8** / 6,43 ¹ | R 97 / 10 cm / 151,5 / **29,6** / 6,60 |
| 90 % (42°) | R 77 / 8 cm / 161,5 / **27,8** / 6,19 ¹ | R 87 / 9 cm / 156,5 / **28,7** / 6,39 ¹ | R 92 / 10 cm / 154,0 / **29,1** / 6,49 |
| 100 % (45°) | R 73 / 8 cm / 163,5 / **27,4** / 6,12 ¹ | R 80 / 9 cm / 160,0 / **28,0** / 6,25 ¹ | R 89 / 10 cm / 155,5 / **28,8** / 6,43 ¹ |
| 120 % (50°) | R 69 / 8 cm / 165,5 / **27,1** / 6,04 ¹ | R 77 / 8 cm / 161,5 / **27,8** / 6,19 ¹ | R 83 / 9 cm / 158,5 / **28,3** / 6,31 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 167,5 / **26,8** / 5,97 ¹ | R 73 / 8 cm / 163,5 / **27,4** / 6,12 ¹ | R 80 / 9 cm / 160,0 / **28,0** / 6,25 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 167,5 / **26,8** / 5,97 ¹ | R 69 / 8 cm / 165,5 / **27,1** / 6,04 ¹ | R 77 / 8 cm / 161,5 / **27,8** / 6,19 ¹ |

**40 × 20** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 156,5 / **31,5** / 6,39 ¹ | R 94 / 10 cm / 153,0 / **32,2** / 6,54 | R 106 / 11 cm / 147,0 / **33,5** / 6,80 |
| 80 % (38,7°) | R 80 / 9 cm / 160,0 / **30,8** / 6,25 ¹ | R 89 / 10 cm / 155,5 / **31,7** / 6,43 ¹ | R 97 / 10 cm / 151,5 / **32,5** / 6,60 |
| 90 % (42°) | R 77 / 8 cm / 161,5 / **30,5** / 6,19 ¹ | R 87 / 9 cm / 156,5 / **31,5** / 6,39 ¹ | R 92 / 10 cm / 154,0 / **32,0** / 6,49 |
| 100 % (45°) | R 73 / 8 cm / 163,5 / **30,1** / 6,12 ¹ | R 80 / 9 cm / 160,0 / **30,8** / 6,25 ¹ | R 89 / 10 cm / 155,5 / **31,7** / 6,43 ¹ |
| 120 % (50°) | R 69 / 8 cm / 165,5 / **29,8** / 6,04 ¹ | R 77 / 8 cm / 161,5 / **30,5** / 6,19 ¹ | R 83 / 9 cm / 158,5 / **31,1** / 6,31 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 167,5 / **29,4** / 5,97 ¹ | R 73 / 8 cm / 163,5 / **30,1** / 6,12 ¹ | R 80 / 9 cm / 160,0 / **30,8** / 6,25 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 167,5 / **29,4** / 5,97 ¹ | R 69 / 8 cm / 165,5 / **29,8** / 6,04 ¹ | R 77 / 8 cm / 161,5 / **30,5** / 6,19 ¹ |

**35 × 25** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 131,5 / **30,1** / 7,60 ¹ | R 94 / 10 cm / 128,0 / **30,9** / 7,81 | R 106 / 11 cm / 122,0 / **32,4** / 8,20 |
| 80 % (38,7°) | R 80 / 9 cm / 135,0 / **29,3** / 7,41 ¹ | R 89 / 10 cm / 130,5 / **30,3** / 7,66 | R 97 / 10 cm / 126,5 / **31,2** / 7,91 |
| 90 % (42°) | R 77 / 8 cm / 136,5 / **29,0** / 7,33 ¹ | R 87 / 9 cm / 131,5 / **30,1** / 7,60 ¹ | R 92 / 10 cm / 129,0 / **30,6** / 7,75 |
| 100 % (45°) | R 73 / 8 cm / 138,5 / **28,5** / 7,22 ¹ | R 80 / 9 cm / 135,0 / **29,3** / 7,41 ¹ | R 89 / 10 cm / 130,5 / **30,3** / 7,66 |
| 120 % (50°) | R 69 / 8 cm / 140,5 / **28,1** / 7,12 ¹ | R 77 / 8 cm / 136,5 / **29,0** / 7,33 ¹ | R 83 / 9 cm / 133,5 / **29,6** / 7,49 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 142,5 / **27,7** / 7,02 ¹ | R 73 / 8 cm / 138,5 / **28,5** / 7,22 ¹ | R 80 / 9 cm / 135,0 / **29,3** / 7,41 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 142,5 / **27,7** / 7,02 ¹ | R 69 / 8 cm / 140,5 / **28,1** / 7,12 ¹ | R 77 / 8 cm / 136,5 / **29,0** / 7,33 ¹ |

**35 × 22** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 131,5 / **34,1** / 7,60 ¹ | R 94 / 10 cm / 128,0 / **35,0** / 7,81 | R 106 / 11 cm / 122,0 / **36,8** / 8,20 |
| 80 % (38,7°) | R 80 / 9 cm / 135,0 / **33,2** / 7,41 ¹ | R 89 / 10 cm / 130,5 / **34,4** / 7,66 | R 97 / 10 cm / 126,5 / **35,4** / 7,91 |
| 90 % (42°) | R 77 / 8 cm / 136,5 / **32,9** / 7,33 ¹ | R 87 / 9 cm / 131,5 / **34,1** / 7,60 ¹ | R 92 / 10 cm / 129,0 / **34,8** / 7,75 |
| 100 % (45°) | R 73 / 8 cm / 138,5 / **32,4** / 7,22 ¹ | R 80 / 9 cm / 135,0 / **33,2** / 7,41 ¹ | R 89 / 10 cm / 130,5 / **34,4** / 7,66 |
| 120 % (50°) | R 69 / 8 cm / 140,5 / **31,9** / 7,12 ¹ | R 77 / 8 cm / 136,5 / **32,9** / 7,33 ¹ | R 83 / 9 cm / 133,5 / **33,6** / 7,49 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 142,5 / **31,5** / 7,02 ¹ | R 73 / 8 cm / 138,5 / **32,4** / 7,22 ¹ | R 80 / 9 cm / 135,0 / **33,2** / 7,41 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 142,5 / **31,5** / 7,02 ¹ | R 69 / 8 cm / 140,5 / **31,9** / 7,12 ¹ | R 77 / 8 cm / 136,5 / **32,9** / 7,33 ¹ |

**35 × 20** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 131,5 / **37,5** / 7,60 | R 94 / 10 cm / 128,0 / **38,5** / 7,81 | R 106 / 11 cm / 122,0 / **40,4** / 8,20 |
| 80 % (38,7°) | R 80 / 9 cm / 135,0 / **36,5** / 7,41 ¹ | R 89 / 10 cm / 130,5 / **37,7** / 7,66 | R 97 / 10 cm / 126,5 / **38,9** / 7,91 |
| 90 % (42°) | R 77 / 8 cm / 136,5 / **36,1** / 7,33 ¹ | R 87 / 9 cm / 131,5 / **37,5** / 7,60 | R 92 / 10 cm / 129,0 / **38,2** / 7,75 |
| 100 % (45°) | R 73 / 8 cm / 138,5 / **35,6** / 7,22 ¹ | R 80 / 9 cm / 135,0 / **36,5** / 7,41 ¹ | R 89 / 10 cm / 130,5 / **37,7** / 7,66 |
| 120 % (50°) | R 69 / 8 cm / 140,5 / **35,1** / 7,12 ¹ | R 77 / 8 cm / 136,5 / **36,1** / 7,33 ¹ | R 83 / 9 cm / 133,5 / **36,9** / 7,49 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 142,5 / **34,6** / 7,02 ¹ | R 73 / 8 cm / 138,5 / **35,6** / 7,22 ¹ | R 80 / 9 cm / 135,0 / **36,5** / 7,41 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 142,5 / **34,6** / 7,02 ¹ | R 69 / 8 cm / 140,5 / **35,1** / 7,12 ¹ | R 77 / 8 cm / 136,5 / **36,1** / 7,33 ¹ |

**33 × 23** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 121,5 / **35,3** / 8,23 | R 94 / 10 cm / 118,0 / **36,4** / 8,47 | R 106 / 11 cm / 112,0 / **38,3** / 8,93 |
| 80 % (38,7°) | R 80 / 9 cm / 125,0 / **34,3** / 8,00 ¹ | R 89 / 10 cm / 120,5 / **35,6** / 8,30 | R 97 / 10 cm / 116,5 / **36,8** / 8,58 |
| 90 % (42°) | R 77 / 8 cm / 126,5 / **33,9** / 7,91 ¹ | R 87 / 9 cm / 121,5 / **35,3** / 8,23 | R 92 / 10 cm / 119,0 / **36,1** / 8,40 |
| 100 % (45°) | R 73 / 8 cm / 128,5 / **33,4** / 7,78 ¹ | R 80 / 9 cm / 125,0 / **34,3** / 8,00 ¹ | R 89 / 10 cm / 120,5 / **35,6** / 8,30 |
| 120 % (50°) | R 69 / 8 cm / 130,5 / **32,9** / 7,66 ¹ | R 77 / 8 cm / 126,5 / **33,9** / 7,91 ¹ | R 83 / 9 cm / 123,5 / **34,8** / 8,10 ¹ |
| 140 % (54,5°) | R 65 / 7 cm / 132,5 / **32,4** / 7,55 ¹ | R 73 / 8 cm / 128,5 / **33,4** / 7,78 ¹ | R 80 / 9 cm / 125,0 / **34,3** / 8,00 ¹ |
| 170 % (59,5°) | R 65 / 7 cm / 132,5 / **32,4** / 7,55 ¹ | R 69 / 8 cm / 130,5 / **32,9** / 7,66 ¹ | R 77 / 8 cm / 126,5 / **33,9** / 7,91 ¹ |

**32 × 22** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 116,5 / **38,5** / 8,58 | R 94 / 10 cm / 113,0 / **39,7** / 8,85 | R 106 / 11 cm / 107,0 / **41,9** / 9,35 ¹ |
| 80 % (38,7°) | R 80 / 9 cm / 120,0 / **37,4** / 8,33 | R 89 / 10 cm / 115,5 / **38,8** / 8,66 | R 97 / 10 cm / 111,5 / **40,2** / 8,97 |
| 90 % (42°) | R 77 / 8 cm / 121,5 / **36,9** / 8,23 | R 87 / 9 cm / 116,5 / **38,5** / 8,58 | R 92 / 10 cm / 114,0 / **39,3** / 8,77 |
| 100 % (45°) | R 73 / 8 cm / 123,5 / **36,3** / 8,10 | R 80 / 9 cm / 120,0 / **37,4** / 8,33 | R 89 / 10 cm / 115,5 / **38,8** / 8,66 |
| 120 % (50°) | R 69 / 8 cm / 125,5 / **35,7** / 7,97 | R 77 / 8 cm / 121,5 / **36,9** / 8,23 | R 83 / 9 cm / 118,5 / **37,8** / 8,44 |
| 140 % (54,5°) | R 65 / 7 cm / 127,5 / **35,2** / 7,84 ¹ | R 73 / 8 cm / 123,5 / **36,3** / 8,10 | R 80 / 9 cm / 120,0 / **37,4** / 8,33 |
| 170 % (59,5°) | R 65 / 7 cm / 127,5 / **35,2** / 7,84 ¹ | R 69 / 8 cm / 125,5 / **35,7** / 7,97 | R 77 / 8 cm / 121,5 / **36,9** / 8,23 |

**30 × 22** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 106,5 / **42,1** / 9,39 | R 94 / 10 cm / 103,0 / **43,5** / 9,71 | non admis (R 106 > 100) |
| 80 % (38,7°) | R 80 / 9 cm / 110,0 / **40,8** / 9,09 | R 89 / 10 cm / 105,5 / **42,5** / 9,48 | R 97 / 10 cm / 101,5 / **44,2** / 9,85 |
| 90 % (42°) | R 77 / 8 cm / 111,5 / **40,2** / 8,97 | R 87 / 9 cm / 106,5 / **42,1** / 9,39 | R 92 / 10 cm / 104,0 / **43,1** / 9,62 |
| 100 % (45°) | R 73 / 8 cm / 113,5 / **39,5** / 8,81 | R 80 / 9 cm / 110,0 / **40,8** / 9,09 | R 89 / 10 cm / 105,5 / **42,5** / 9,48 |
| 120 % (50°) | R 69 / 8 cm / 115,5 / **38,8** / 8,66 | R 77 / 8 cm / 111,5 / **40,2** / 8,97 | R 83 / 9 cm / 108,5 / **41,3** / 9,22 |
| 140 % (54,5°) | R 65 / 7 cm / 117,5 / **38,2** / 8,51 ¹ | R 73 / 8 cm / 113,5 / **39,5** / 8,81 | R 80 / 9 cm / 110,0 / **40,8** / 9,09 |
| 170 % (59,5°) | R 65 / 7 cm / 117,5 / **38,2** / 8,51 ¹ | R 69 / 8 cm / 115,5 / **38,8** / 8,66 | R 77 / 8 cm / 111,5 / **40,2** / 8,97 |

**30 × 20** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 106,5 / **46,3** / 9,39 | R 94 / 10 cm / 103,0 / **47,8** / 9,71 | non admis (R 106 > 100) |
| 80 % (38,7°) | R 80 / 9 cm / 110,0 / **44,8** / 9,09 | R 89 / 10 cm / 105,5 / **46,7** / 9,48 | R 97 / 10 cm / 101,5 / **48,5** / 9,85 |
| 90 % (42°) | R 77 / 8 cm / 111,5 / **44,2** / 8,97 | R 87 / 9 cm / 106,5 / **46,3** / 9,39 | R 92 / 10 cm / 104,0 / **47,4** / 9,62 |
| 100 % (45°) | R 73 / 8 cm / 113,5 / **43,4** / 8,81 | R 80 / 9 cm / 110,0 / **44,8** / 9,09 | R 89 / 10 cm / 105,5 / **46,7** / 9,48 |
| 120 % (50°) | R 69 / 8 cm / 115,5 / **42,7** / 8,66 | R 77 / 8 cm / 111,5 / **44,2** / 8,97 | R 83 / 9 cm / 108,5 / **45,4** / 9,22 |
| 140 % (54,5°) | R 65 / 7 cm / 117,5 / **41,9** / 8,51 | R 73 / 8 cm / 113,5 / **43,4** / 8,81 | R 80 / 9 cm / 110,0 / **44,8** / 9,09 |
| 170 % (59,5°) | R 65 / 7 cm / 117,5 / **41,9** / 8,51 | R 69 / 8 cm / 115,5 / **42,7** / 8,66 | R 77 / 8 cm / 111,5 / **44,2** / 8,97 |

**30 × 18** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 106,5 / **51,3** / 9,39 | R 94 / 10 cm / 103,0 / **53,1** / 9,71 | non admis (R 106 > 100) |
| 80 % (38,7°) | R 80 / 9 cm / 110,0 / **49,7** / 9,09 | R 89 / 10 cm / 105,5 / **51,8** / 9,48 | R 97 / 10 cm / 101,5 / **53,8** / 9,85 |
| 90 % (42°) | R 77 / 8 cm / 111,5 / **49,0** / 8,97 | R 87 / 9 cm / 106,5 / **51,3** / 9,39 | R 92 / 10 cm / 104,0 / **52,5** / 9,62 |
| 100 % (45°) | R 73 / 8 cm / 113,5 / **48,1** / 8,81 | R 80 / 9 cm / 110,0 / **49,7** / 9,09 | R 89 / 10 cm / 105,5 / **51,8** / 9,48 |
| 120 % (50°) | R 69 / 8 cm / 115,5 / **47,3** / 8,66 | R 77 / 8 cm / 111,5 / **49,0** / 8,97 | R 83 / 9 cm / 108,5 / **50,4** / 9,22 |
| 140 % (54,5°) | R 65 / 7 cm / 117,5 / **46,5** / 8,51 | R 73 / 8 cm / 113,5 / **48,1** / 8,81 | R 80 / 9 cm / 110,0 / **49,7** / 9,09 |
| 170 % (59,5°) | R 65 / 7 cm / 117,5 / **46,5** / 8,51 | R 69 / 8 cm / 115,5 / **47,3** / 8,66 | R 77 / 8 cm / 111,5 / **49,0** / 8,97 |

**27 × 18** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 91,5 / **59,7** / 10,93 | non admis (R 94 > 90) | non admis (R 106 > 90) |
| 80 % (38,7°) | R 80 / 9 cm / 95,0 / **57,5** / 10,53 | R 89 / 10 cm / 90,5 / **60,4** / 11,05 | non admis (R 97 > 90) |
| 90 % (42°) | R 77 / 8 cm / 96,5 / **56,6** / 10,36 | R 87 / 9 cm / 91,5 / **59,7** / 10,93 | non admis (R 92 > 90) |
| 100 % (45°) | R 73 / 8 cm / 98,5 / **55,5** / 10,15 | R 80 / 9 cm / 95,0 / **57,5** / 10,53 | R 89 / 10 cm / 90,5 / **60,4** / 11,05 |
| 120 % (50°) | R 69 / 8 cm / 100,5 / **54,4** / 9,95 | R 77 / 8 cm / 96,5 / **56,6** / 10,36 | R 83 / 9 cm / 93,5 / **58,4** / 10,70 |
| 140 % (54,5°) | R 65 / 7 cm / 102,5 / **53,3** / 9,76 | R 73 / 8 cm / 98,5 / **55,5** / 10,15 | R 80 / 9 cm / 95,0 / **57,5** / 10,53 |
| 170 % (59,5°) | R 65 / 7 cm / 102,5 / **53,3** / 9,76 | R 69 / 8 cm / 100,5 / **54,4** / 9,95 | R 77 / 8 cm / 96,5 / **56,6** / 10,36 |

**27 × 16** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | R 87 / 9 cm / 91,5 / **67,0** / 10,93 | non admis (R 94 > 90) | non admis (R 106 > 90) |
| 80 % (38,7°) | R 80 / 9 cm / 95,0 / **64,6** / 10,53 | R 89 / 10 cm / 90,5 / **67,8** / 11,05 | non admis (R 97 > 90) |
| 90 % (42°) | R 77 / 8 cm / 96,5 / **63,6** / 10,36 | R 87 / 9 cm / 91,5 / **67,0** / 10,93 | non admis (R 92 > 90) |
| 100 % (45°) | R 73 / 8 cm / 98,5 / **62,3** / 10,15 | R 80 / 9 cm / 95,0 / **64,6** / 10,53 | R 89 / 10 cm / 90,5 / **67,8** / 11,05 |
| 120 % (50°) | R 69 / 8 cm / 100,5 / **61,0** / 9,95 | R 77 / 8 cm / 96,5 / **63,6** / 10,36 | R 83 / 9 cm / 93,5 / **65,6** / 10,70 |
| 140 % (54,5°) | R 65 / 7 cm / 102,5 / **59,9** / 9,76 | R 73 / 8 cm / 98,5 / **62,3** / 10,15 | R 80 / 9 cm / 95,0 / **64,6** / 10,53 |
| 170 % (59,5°) | R 65 / 7 cm / 102,5 / **59,9** / 9,76 | R 69 / 8 cm / 100,5 / **61,0** / 9,95 | R 77 / 8 cm / 96,5 / **63,6** / 10,36 |

**25 × 18** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | non admis (R 87 > 83) | non admis (R 94 > 83) | non admis (R 106 > 83) |
| 80 % (38,7°) | R 80 / 9 cm / 85,0 / **64,3** / 11,76 | non admis (R 89 > 83) | non admis (R 97 > 83) |
| 90 % (42°) | R 77 / 8 cm / 86,5 / **63,2** / 11,56 | non admis (R 87 > 83) | non admis (R 92 > 83) |
| 100 % (45°) | R 73 / 8 cm / 88,5 / **61,7** / 11,30 | R 80 / 9 cm / 85,0 / **64,3** / 11,76 | non admis (R 89 > 83) |
| 120 % (50°) | R 69 / 8 cm / 90,5 / **60,4** / 11,05 | R 77 / 8 cm / 86,5 / **63,2** / 11,56 | R 83 / 9 cm / 83,5 / **65,4** / 11,98 |
| 140 % (54,5°) | R 65 / 7 cm / 92,5 / **59,1** / 10,81 | R 73 / 8 cm / 88,5 / **61,7** / 11,30 | R 80 / 9 cm / 85,0 / **64,3** / 11,76 |
| 170 % (59,5°) | R 65 / 7 cm / 92,5 / **59,1** / 10,81 | R 69 / 8 cm / 90,5 / **60,4** / 11,05 | R 77 / 8 cm / 86,5 / **63,2** / 11,56 |

**25 × 15** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | non admis (R 87 > 83) | non admis (R 94 > 83) | non admis (R 106 > 83) |
| 80 % (38,7°) | R 80 / 9 cm / 85,0 / **76,9** / 11,76 | non admis (R 89 > 83) | non admis (R 97 > 83) |
| 90 % (42°) | R 77 / 8 cm / 86,5 / **75,6** / 11,56 | non admis (R 87 > 83) | non admis (R 92 > 83) |
| 100 % (45°) | R 73 / 8 cm / 88,5 / **73,9** / 11,30 | R 80 / 9 cm / 85,0 / **76,9** / 11,76 | non admis (R 89 > 83) |
| 120 % (50°) | R 69 / 8 cm / 90,5 / **72,2** / 11,05 | R 77 / 8 cm / 86,5 / **75,6** / 11,56 | R 83 / 9 cm / 83,5 / **78,3** / 11,98 |
| 140 % (54,5°) | R 65 / 7 cm / 92,5 / **70,7** / 10,81 | R 73 / 8 cm / 88,5 / **73,9** / 11,30 | R 80 / 9 cm / 85,0 / **76,9** / 11,76 |
| 170 % (59,5°) | R 65 / 7 cm / 92,5 / **70,7** / 10,81 | R 69 / 8 cm / 90,5 / **72,2** / 11,05 | R 77 / 8 cm / 86,5 / **75,6** / 11,56 |

**22 × 16** (projection ≤ 5,50 m, situation normale) — cellule : R / crochet / pureau / ardoises au m² / liteaux ml/m²

| Pente | Zone 1 | Zone 2 | Zone 3 |
| --- | --- | --- | --- |
| 70 % (35°) | non admis (R 87 > 73) | non admis (R 94 > 73) | non admis (R 106 > 73) |
| 80 % (38,7°) | non admis (R 80 > 73) | non admis (R 89 > 73) | non admis (R 97 > 73) |
| 90 % (42°) | non admis (R 77 > 73) | non admis (R 87 > 73) | non admis (R 92 > 73) |
| 100 % (45°) | R 73 / 8 cm / 73,5 / **83,5** / 13,61 | non admis (R 80 > 73) | non admis (R 89 > 73) |
| 120 % (50°) | R 69 / 8 cm / 75,5 / **81,3** / 13,25 | non admis (R 77 > 73) | non admis (R 83 > 73) |
| 140 % (54,5°) | R 65 / 7 cm / 77,5 / **79,2** / 12,90 | R 73 / 8 cm / 73,5 / **83,5** / 13,61 | non admis (R 80 > 73) |
| 170 % (59,5°) | R 65 / 7 cm / 77,5 / **79,2** / 12,90 | R 69 / 8 cm / 75,5 / **81,3** / 13,25 | non admis (R 77 > 73) |
## Passe 3b (19 novembre 2026, testeur-négoce) : situation exposée, carrières, palettes

**Situation exposée (côte des 22, 29, 56).** Règle retenue : R exposé = la plus forte de R normal + 10 mm (NF DTU 40.11 de 2020, §5.1.1.2, lu dans une copie non officielle ET dans la fiche Progineer qui le cite) et R normal × 1,10 (Cupa catalogue 2024, Rathscheck 2023 : « majorer de 10 % », texte de 1993). Puis les formules habituelles (pureau = (H − R)/2, N = 1/[pureau × (L + 3)], crochet = R + 3 arrondi au cm sup., liteaux = 1/pureau). 45 lignes `…_zone3expo_…` (projection ≤ 5,50 m) : **42 `confirme`** (les deux règles donnent le même crochet et le même nombre à 1 % près), **3 `une_source`** (elles divergent : la valeur retenue n'est portée que par une règle ; les deux résultats sont dans `details`). Sous la pente minimale, le format n'est pas admis (H < 3 R) : ne pas calculer.

Tableau : R retenu (mm) / crochet (cm) / ardoises au m² / liteaux ml/m² ; « — » = non admis à cette pente en situation exposée.

| Pente | 32×22 | 30×20 | 33×23 | 35×22 | 35×25 | 40×22 | 40×25 | 27×18 |
|---|---|---|---|---|---|---|---|---|
| 60 % (31°) | — | — | — | — | — | R 125 / 13 / **32,6** / 7,27 | R 125 / 13 / **28,7** / 7,27 | — |
| 70 % (35°) | — | — | — | — | — | R 117 / 12 / **31,7** / 7,07 | R 117 / 12 / **27,9** / 7,07 | — |
| 80 % (38,7°) | — | — | R 107 / 11 / **38,5** / 8,97 | R 107 / 11 / **36,9** / 8,23 | R 107 / 11 / **32,5** / 8,23 | R 107 / 11 / **30,6** / 6,83 | R 107 / 11 / **27,0** / 6,83 | — |
| 90 % (42°) | R 102 / 11 / **41,1** / 9,17 | — | R 102 / 11 / **37,6** / 8,77 | R 102 / 11 / **36,2** / 8,06 | R 102 / 11 / **31,9** / 8,06 | R 102 / 11 / **30,1** / 6,71 | R 102 / 11 / **26,5** / 6,71 | — |
| 100 % (45°) | R 99 / 11 / **40,6** / 9,05 | R 99 / 11 / **49,0** / 9,95 | R 99 / 11 / **37,2** / 8,66 | R 99 / 11 / **35,7** / 7,97 | R 99 / 11 / **31,5** / 7,97 | R 99 / 11 / **29,8** / 6,64 | R 99 / 11 / **26,3** / 6,64 | — |
| 120 % (50°) | R 93 / 10 / **39,5** / 8,81 | R 93 / 10 / **47,6** / 9,66 | R 93 / 10 / **36,2** / 8,44 | R 93 / 10 / **34,9** / 7,78 | R 93 / 10 / **30,8** / 7,78 | R 93 / 10 / **29,2** / 6,51 | R 93 / 10 / **25,7** / 6,51 | — |
| 140 % (54,5°) | R 90 / 10 / **39,0** / 8,7 | R 90 / 10 / **46,9** / 9,52 | R 90 / 10 / **35,8** / 8,33 | R 90 / 10 / **34,5** / 7,69 | R 90 / 10 / **30,4** / 7,69 | R 90 / 10 / **28,9** / 6,45 | R 90 / 10 / **25,5** / 6,45 | R 90 / 10 / **60,7** / 11,11 (une_source) |
| 170 % (59,5°) | R 87 / 9 / **38,5** / 8,58 | R 87 / 9 / **46,3** / 9,39 (une_source) | R 87 / 9 / **35,3** / 8,23 | R 87 / 9 / **34,1** / 7,6 | R 87 / 9 / **30,1** / 7,6 | R 87 / 9 / **28,7** / 6,39 | R 87 / 9 / **25,3** / 6,39 | R 87 / 9 / **59,7** / 10,93 (une_source) |

Pente minimale en zone 3 exposée : 40×25 60 % (31.0°) ; 40×22 60 % (31.0°) ; 35×25 80 % (38.7°) ; 35×22 80 % (38.7°) ; 32×22 90 % (42.0°) ; 30×20 100 % (45.0°) ; 27×18 140 % (54.5°) ; 33×23 80 % (38.7°). Le 32×22 n'est plus admis à 38,7° en situation exposée (R 107 → 3 R = 321 mm > 320 mm, à 1 mm près) : le signaler à l'artisan plutôt que de calculer.

- **Écart des deux règles** : en Bretagne les crochets sont les mêmes sauf aux pentes où R normal passe 100 mm (le + 10 % devient plus fort) ou descend sous 80 mm (le + 10 mm est plus fort). Écart sur le nombre au m² : 0 à 1,2 %.
- **Règle `ardoise_zone_exposee`** passée de `une_source` à `confirme` (+10 mm lu dans deux relais indépendants du DTU 2020 ; le + 10 % des fabricants est l'ancien texte, écart expliqué).
- **Carrières en modèle** (`confirme_fabricant`, dénomination lue sur la fiche officielle datée, pas de calcul possible) : Cupa 2, 3, 4, 5, 6, 7, 9, 10, 13, 17, 30, 37 (catalogue architecte, PDF du 23/08/2024) et Cupa Sélection Plus (fiche 02/2026 : Los Campos, 27×18 / 30×20 / 32×22 / 40×22, 3,5 mm) ; Samaca 29, 33, 44, 47, 55 (fiches 07/2026, carrière et formats) ; Rathscheck InterSIN SIN 120, 150, 240, 340 (brochure 03/2025, carrière, formats et épaisseurs par sélection). Pizarras Los Ángeles : non trouvé, reste à faire.
- **Palettes** : aucun fabricant ne publie le nombre par palette (Cupa, Samaca, Rathscheck vérifiés). Négoces seulement, et pour le 32×22 seulement : Cupa 10 Excellence 1 950 (690 kg, Sobemat), SIN 340 Fine ±4 mm 1 700 (Sobemat), K08 Star 3,5 mm 2 200 (Minardoises), Catteau 2 300 (2,7-3 mm) / 1 900 (3,5-4 mm) / 1 500-1 600 (4-5 mm) / 1 400 (4,5-6 mm) / 800 (7-10 mm). Statuts : `une_source` par produit, `a_confirmer` pour la règle générale et pour les autres formats (non publiés).
- **40×24 « ardoise naturelle »** : requalifié (`a_confirmer`, « format fibres-ciment, pas un modèle d'ardoise naturelle ») ; si un devis l'écrit, demander à l'artisan.
- Comptoir « Ardoises naturelles » : liste de carrières, question « situation exposée ? », conditionnement par épaisseur (32×22).
