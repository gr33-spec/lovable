# Bac acier, tuile canal, ardoise fibres-ciment : recherche du 21 novembre 2026

But : combler trois trous de la fiche couverture, avec au moins deux sources par valeur quand elles existent.
Rien de ce fichier n'est lu par le moteur. Toutes les pages ont été lues le 21 novembre 2026.

Niveaux de confiance :

- **confirmé** : deux sources indépendantes disent la même chose ;
- **une source** : un seul fabricant ou un seul document ;
- **à confirmer** : calcul fait ici, sources qui se contredisent, ou page lue seulement par son résumé de recherche.

Les textes des NF DTU (40.35, 40.22, 40.13) n'ont pas été lus : ils sont payants. Leurs valeurs viennent des
guides qui les citent (FFB, fabricants). Les numéros entre crochets renvoient à la liste des sources, en bas.

Ce qui existait déjà et n'a pas été refait : `tuiles-plates-canal-beton.json` (canal), `ardoise.json` (ardoises
fibres-ciment), `points-singuliers.json` (mortier). Le trou de la fiche vient de là : le fichier `.md` de la fiche
affiche les valeurs sans leur condition, alors que la condition est bien dans les `.json`.

---

## A. Bac acier (plaques nervurées, simple peau)

| Donnée | Valeur | Condition | Sources | Confiance |
|---|---|---|---|---|
| Largeur utile d'une plaque | 1,00 m | profil à 3 pas de 333 mm, nervure de 45 mm : Bacacier Covéo 3.45, Joris Ide JI 45.333.1000 | [A3] « COVEO 3.45 1000 mm 45 mm » ; [A6] « largeur utile de 1000 mm » | confirmé |
| Largeur 1,05 m | non trouvée comme largeur utile | une annonce de grande surface écrit « l 105 cm » : c'est sans doute la largeur totale de la plaque | [A10] (titre d'annonce seulement) | à confirmer |
| Recouvrement latéral | une nervure (l'emboîtement de la nervure de rive) ; il est déjà compris dans la largeur utile | toutes pentes | [A1] « donné par l'emboîtement » ; [A5] « recouvrement de leurs nervures de rives » | confirmé |
| Nombre de plaques | largeur du pan ÷ largeur utile, arrondi au-dessus | plaques commandées à la longueur du rampant | calcul, d'après les deux lignes ci-dessus | confirmé (calcul simple) |
| Débord à l'égout, à ajouter au rampant | entre 10 et 40 cm | FFB, qui cite le DTU 40.35 | [A1] « est compris entre 10 et 40 cm » | une source |
| Débord à l'égout, autre valeur | 200 mm au plus | fiche de pose Bacacier (bande de rive) | [A4] (page introuvable ce jour, lue par son résumé) | à confirmer : contredit en partie la ligne du dessus |
| Recouvrement en bout (deux plaques sur un même rampant) | 150 à 300 mm selon la pente : 300 (7 à 10 %), 200 (10 à 15 %), 150 (15 % et plus) en zones I et II ; 300 puis 200 en zone III | toujours sur une panne ; sans complément d'étanchéité | [A2] tableau « recouvrement transversal minimal » ; [A1] « entre 150 mm et 200 mm » (avec complément) | confirmé pour l'ordre de grandeur ; le détail par pente n'a qu'une source |
| Où l'on visse | en sommet de nervure, avec cavalier et rondelle d'étanchéité | sur chaque panne | [A1] « généralement en sommet de nervures principales » ; [A2] ; [A7] | confirmé |
| Vis en partie courante | une nervure sur deux, en quinconce d'une panne à l'autre | sur toutes les pannes | [A2] « Fixation une onde sur deux en quinconce » ; [A8] « UNE NERVURE SUR DEUX » | confirmé |
| Vis à l'égout et au faîtage | toutes les nervures, sur les deux premières pannes | bas et haut du pan | [A2] « toutes les ondes sur les deux premières pannes » ; [A8] « sablière et faîtage […] deux premières pannes » | confirmé |
| Vis en rive | toutes les nervures, sur 1 m de large, sur toutes les pannes | chaque côté du pan | [A2] « toutes les ondes sur une largeur de 1 m » ; [A8] | confirmé |
| Vis par plaque et par panne (profil 1,00 m, 3 nervures utiles) | 1,5 en partie courante ; 3 sur les pannes d'égout, de faîtage et en rive | calcul fait ici d'après les trois règles ci-dessus | calcul | à confirmer |
| Vis au m², règle rapide | 2,5 vis par m² | notice Joris Ide (profils JI 45.333.1000, JI 40.250.1000, JI 33.250.1000) | [A5] « comptez 2,5 Vis/m² » | une source ; le calcul ci-dessus donne le même ordre (pan de 6 m, pannes à 1,20 m : 2,5) |
| Vis au m², autre valeur | 6 à 8 (pannes à 1,5 m), 8 à 10 (pannes à 1 m) | site de conseil, sans source ; son propre exemple (250 à 300 vis pour 60 m²) donne 4 à 5 | [A9] | à confirmer : contredit Joris Ide, non retenu |
| Vis de couture (entre deux plaques, sur le recouvrement latéral) | pente de 10° et plus : une par entraxe de pannes (pannes à moins de 2 m) ; pente plus faible : deux fois plus | tableau « fixation de couture » qui cite le DTU 40.35 | [A2] ; [A5] « couturés tous les 50 cm » si pente ≤ 10 % | une source par valeur |
| Diamètre des vis | 5,5 mm au moins sur l'ossature ; 4,8 mm au moins en couture | | [A2] « 5,5 mm » ; [A1] « diamètre minimal 4,8 mm » ; [A7] vis Ø 5,5 | confirmé |
| Conditionnement des vis | boîte de 100 (kits de 25 et de 50 en grande surface) | vis autoperceuses, cavaliers vendus aussi par 100 | [A7] « Conditionnement 100 » ; [A11] « vis autoperceuse plaque […] x100 bacacier » ; [A12] kits de 25 et 50 | confirmé |
| Closoir mousse : longueur | 1 m le plus souvent (la longueur suit la largeur du profil) | mousse de polyéthylène, 15 ou 20 mm d'épaisseur ; vendu en carton, quantité non publiée | [A13] « La plupart des longueurs font 1m » | une source |
| Closoir mousse : lequel, où | closoir « profil » à l'égout ; « contre-profil » (contre-closoir) sous la faîtière | | [A13] « contre-profil […] au faitage tandis que les profils en égout » ; [A2] dessin « contre closoir en mousse » sous la faîtière ; [A1] | confirmé |
| Closoirs : combien | égout : longueur d'égout ÷ 1 m ; faîtage : 2 × longueur du faîtage ÷ 1 m (un rang par versant) | calcul fait ici ; « petite onde / grande onde » n'apparaît dans aucun document lu | calcul | à confirmer |
| Contre-closoir : obligatoire quand | pentes faibles : entre 5 et 7 % | au-dessus, la faîtière crantée suffit | [A1] « contre-closoirs en mousse » ; [A2] colonne « > 5 % » | confirmé |
| Faîtière double pente : longueur vendue | 2,10 m hors tout, 2,00 m utile | accessoires pliés Bacacier ; même cote chez Tolganor | [A3] « Utile 2000 mm, Totale 2100 mm » ; [A14] « Longueur utile : 2 000 mm - Longueur hors tout : 2 100 mm » | confirmé |
| Faîtière : autre longueur | 3 m (ArcelorMittal, sauf pièces crantées) | | [A15] « pièces de 3m (sauf accessoires crantés) » (résumé de recherche) | à confirmer |
| Recouvrement entre deux faîtières | 100 mm au moins | | [A1] « de faîtière à faîtière doit être de 100 mm minimum » ; [A2] « B – 100 MM MINI » | confirmé |
| Recouvrement de la faîtière sur les plaques | 120 mm au moins | | [A1] « 120 mm minimum sur les plaques » ; [A2] « A – 120 MM MINI » | confirmé |
| Faîtières pour 12,50 m de faîtage | 7 pièces de 2,10 m | calcul : (12,50 − 0,10) ÷ 2,00 = 6,2, arrondi au-dessus ; 6 pièces ne couvrent que 12,10 m | calcul d'après [A1] [A3] | confirmé (calcul sur valeurs confirmées) |
| Bande de rive : longueur vendue | 2,10 m (Bacacier, grande surface et négoce) ; 2,10 m ou 4,00 m (Tolganor) | même recouvrement de 100 mm que les faîtières : non écrit, à confirmer | [A3] « longueurs 2100 mm » ; [A16] « rive […] lg2100mm bacacier » ; [A14] « 2 100 ou 4 000 mm » | confirmé pour 2,10 m |
| Position de la rive | la dernière nervure est à 350 mm au plus du bord du toit | | [A1] « inférieure ou égale à 350 mm » ; [A2] « A – 350 MM MAXI » | confirmé |

---

## B. Tuile canal terre cuite, sur liteaux

| Donnée | Valeur | Condition | Sources | Confiance |
|---|---|---|---|---|
| Couverts au m², Edilians Canal 50 (414 / 454) | 10,3 / 11,1 / 11,8 / 12,6 | recouvrement 140 / 150 / 160 / 170 mm. **Ce sont les quatre valeurs de la fiche, dans cet ordre.** | [B1] tableau Edilians | une source (fabricant) |
| Couverts au m², Edilians Canal Gironde 50 (406 / 456) | 12,4 / 12,7 / 13,1 / 13,5 | recouvrement 140 / 150 / 160 / 170 mm | [B1] | une source (fabricant) |
| Couverts au m², tuile de 50 cm d'un autre fabricant | 10,7 à 12,6 | Terreal Canal Origine et Languedocienne, pureau de 360 à 330 mm, soit recouvrement de 140 à 170 mm | [B2] | confirme l'ordre de grandeur d'Edilians (12,6 à 170 mm chez les deux ; 10,3 contre 10,7 à 140 mm) |
| Explication de l'écart | couverts au m² = 1 ÷ (pureau × écart entre deux rangs) | Terreal : écart de 240 à 260 mm ; 1 ÷ (0,36 × 0,26) = 10,7 | calcul | confirmé par le calcul |
| Quel recouvrement | zone 1 : 140 / 150 / 160 mm ; zones 2 et 3 : 150 / 160 / 170 mm | site protégé / normal / exposé ; DTU 40.22 cité par les deux fabricants | [B1] [B2] | confirmé |
| Courants et couverts : un ou deux articles | deux articles : le couvert, et le courant à tenons (ou à talon). Références, poids et palettes différents | pose sur liteaux | [B1] (414 et 454) ; [B2] (1CO et 75CLP) | confirmé |
| Proportion | autant de courants que de couverts | pose à deux tuiles ; le total au m² est donc le double du tableau | [B1] [B2] | confirmé |
| Liteaux au m² | 2,78 / 2,86 / 2,94 / 3,03 ml (tuile de 500 mm) ; 2,83 / 2,92 / 3,01 / 3,10 ml (Gironde, 492 mm) | recouvrement 140 / 150 / 160 / 170 mm ; règle : 1 ÷ (longueur − recouvrement) | [B1] ; [B2] « 2,9 ml/m² » ; calcul | confirmé |
| Bardelis (rive) | 2,7 au mètre, par côté (un modèle gauche, un modèle droit) | | [B1] [B2] (relevé du 19 novembre, non relu aujourd'hui) | confirmé |
| Faîtières | 2,5 au mètre (faîtière de 50 cm sans emboîtement) ; 2,5 à 3 (pureau variable Edilians) ; 2,2 à 2,7 (Terreal) | | [B1] [B2] (relevé du 19 novembre, non relu aujourd'hui) | confirmé |
| Mortier de scellement du faîtage | 5 à 10 kg par mètre de faîtage ; sac de 25 kg | 5 kg pour un lit de 20 cm ; le haut de la fourchette pour une tuile très galbée comme la canal | [B3] « environ 5 à 10 kg/ml de faîtage » ; [B4] « 5 kg/m linéaire de faîtage ou lit de maçonnerie (20 cm de large) » | confirmé pour la fourchette |
| Mortier : valeur précise pour la canal | introuvable | aucune fiche ne donne un chiffre propre à la tuile canal ; la recherche du 19 novembre note que PRB monte à 20 kg/ml « selon la tuile » | [B5] | à confirmer |
| Sacs pour 10 m de faîtage | 2 à 4 sacs de 25 kg | calcul : 50 à 100 kg | calcul | confirmé (calcul) |

---

## C. Ardoise fibres-ciment 40×24

| Donnée | Valeur | Condition | Sources | Confiance |
|---|---|---|---|---|
| Ardoises au m² | 24,64 / 25,41 / 26,23 / 27,10 / 28,03 / 29,04 | recouvrement 70 / 80 / 90 / 100 / 110 / 120 mm, pose au crochet. **Ce sont les six valeurs de la fiche, dans cet ordre.** | [C1] Cedral ; [C2] Cembrit : même tableau, mêmes chiffres | confirmé |
| Ardoises au m², pose clouée | 27,33 (et 54,66 clous) | recouvrement 100 mm, 2 clous | [C1] | une source |
| Liteaux au m² | 6,06 / 6,25 / 6,45 / 6,67 / 6,90 / 7,15 ml | mêmes recouvrements ; règle : 1 ÷ pureau, pureau = (400 − recouvrement) ÷ 2 | [C1] [C2] | confirmé |
| Recouvrement, zone 1 normale ou protégée (rampant de moins de 8 m en projection) | 120 mm (pente 45 à 49 %) ; 110 (50 à 59 %) ; 100 (60 à 79 %) ; 90 (80 à 99 %) ; 80 (100 à 139 %) ; 70 (140 % et plus) | + 10 mm si le rampant fait 8 à 15 m | [C2] tableau Cembrit ; [C1] même tableau (relevé du 19 novembre) | confirmé |
| Recouvrement, zone 2 exposée et zone 3 normale ou protégée | 120 mm (60 à 69 %) ; 110 (70 à 89 %) ; 100 (90 à 119 %) ; 90 (120 à 199 %) ; 80 (200 % et plus) | rampant de moins de 8 m ; + 10 mm de 8 à 15 m | [C1] tableau Cedral | une source lue aujourd'hui ; Cembrit donne le même principe |
| Recouvrement, zone 3 exposée (bord de mer breton) | 120 mm (70 à 89 %) ; 110 (90 à 119 %) ; 100 (120 à 199 %) ; 90 (200 % et plus) | rampant de moins de 8 m | [C1] « En zone III exposée, il faut ajouter 10 mm » | une source lue aujourd'hui |
| Valeur par défaut proposée | 100 mm → 27,10 ardoises et 6,67 ml de liteaux au m² | pente de 45° (100 %), zone 3 normale, rampant court | [C1] [C2] | confirmé |
| Fixation au crochet | 1 crochet par ardoise ; longueur du crochet = recouvrement + 10 mm | tous formats | [C1] « Fixation : 1 crochet. Longueur des crochets : R + 10 mm » ; [C2] même phrase | confirmé |
| Fixation aux clous | 2 clous par ardoise | formats jusqu'au 40×24 | [C1] [C2] | confirmé |
| Crampon tempête | 2 clous + 1 crampon par ardoise | formats à partir du 45×30 : pas pour le 40×24 | [C1] « supérieure ou égale à 45 x 30 » ; [C2] « 2 clous et 1 crampon tempête » | confirmé |
| Fil du crochet | Ø 3 mm en zone 2 exposée et en zone 3 | 40×24 | [C2] « les crochets devront être en fil Ø 3 mm » | une source |
| Faîtière demi-ronde | 400 × 160 mm, longueur utile 330 mm, 1,3 kg : 3,03 au mètre, soit 4 pièces pour 1 m et 31 pour 10 m | pentes de plus de 70 % ; ventilation par chatière | [C1] « Utile 330 » ; [C3] fiche Cedral « longueur utile 330 mm » | une source (deux documents du même fabricant) |
| Faîtière angulaire à bords plats | 1200 × 200 mm, longueur utile 1100 mm, 6,5 kg, angles 136° et 90° : 0,91 au mètre | | [C1] « Utile 1100 » | une source |
| Faîtière d'aération | 600 × 200 mm, longueur utile 490 mm, 2,9 kg, angles 136°, 118°, 103°, 90° : 2,04 au mètre | pentes de 40 à 100 % | [C1] « utile 490 » | une source |
| Faîtage en ardoises (strackords) | 8,3 de chaque côté au mètre, recouvrement 60 mm, un noquet zinc 200 × 100 par lit | Cembrit : pentes de moins de 120 % | [C1] « 8,3 de chaque coté au ml » ; [C2] décrit la même pose, sans nombre | une source pour le nombre |
| Faîtière Cembrit | introuvable | la documentation Cembrit 2016 ne décrit que le faîtage en strackords | [C2] | introuvable |

---

## Sources

Toutes lues le 21 novembre 2026, sauf mention.

### A. Bac acier

- [A1] « Les couvertures en bac acier », Fédération française du bâtiment, page du 11 mars 2026, cite le NF DTU 40.35.
  https://www.ffbatiment.fr/techniques-batiment/enveloppe-du-batiment/couverture/dossier/couverture-bac-acier
  (les tableaux de la page sont des images : non lus).
- [A2] « Mise en œuvre, profils de couverture traditionnelle », pages 160 à 163 d'un catalogue général 2018-2019 de
  fabricant (le nom n'est pas dans le texte extrait ; la mise en page est celle de Bacacier : à vérifier).
  https://cdn.manomano.com/files/pdf/8917591.pdf
- [A3] « Les solutions de finitions : les pliages », catalogue général Bacacier 2016, pages 107 à 112 (chez Chausson).
  https://www.chausson.fr/media/article-document/271410
- [A4] Fiche technique « Rive 2 m 10 » Bacacier (L'Entrepôt du Bricolage). Page introuvable (404) le 21 novembre ; lue
  par son résumé de recherche seulement.
  https://entrepot-du-bricolage.fr/mediaw/pdf/fiche_technique_rive-rouge-2-m-10-bacacier.pdf
- [A5] « Notice de montage Jorisolar RS-R », Joris Ide, février 2023 (bacs JI 45.333.1000, JI 40.250.1000, JI 33.250.1000).
  https://www.sunethic.fr/wp-content/uploads/2023/09/55387_Notice-de-Montage-JORISOLAR-RS-R-Fevrier-2023-vFR__compressed.pdf
- [A6] « Profil de couverture JI 45-333-1000 Toiture », Joris Ide, fiche Batiweb (lue par son résumé de recherche).
  https://www.batiweb.com/produit-btp/profil-de-couverture-tole-acier-ji-45-333-1000-toiture-348106
- [A7] « Vis de bacs acier Zacrovis 12 » (Ø 5,5 × 85, boîte de 100), Legallais.
  https://legallais.com/product-page-pdf//31381.pdf
- [A8] Fiche technique Scell-it (fixations de bac acier), lue par son résumé de recherche seulement.
  https://cdn-assets.inwink.com/f15db6dc-d927-4e98-8bb5-78a6cdc831a1/f47c2d9c-7669-4ec9-82fd-19123c004144
- [A9] « Combien de fixations par m² pour une toiture bac acier ? », Hellopro (site de conseil, sans source, non daté).
  https://conseils.hellopro.fr/combien-de-fixations-par-m-pour-une-toiture-bac-acier-5160.html
- [A10] Annonce « Plaque de couverture nervurée gris l 105 × L 200 cm, h 45 mm, ép 0,63 mm », Leroy Merlin (titre seul).
  https://www.leroymerlin.fr/produits/plaque-de-couverture-nervure-gris-l-105-x-l-200-cm-h-45-mm-ep-0-63-mm-90782010.html
- [A11] Annonce « Vis autoperceuse plaque bleu ardoise x100 Bacacier », Mr Bricolage (titre seul).
  https://www.mr-bricolage.fr/Groix/vis-autoperceuse-plaque-bleu-ardoise-x100-bacacier.html
- [A12] Annonce « Kit 50 fixations bac acier sur bois 6,3 × 100, Scell-it », Bricoman (titre seul ; existe aussi par 25).
  https://www.bricoman.fr/produits/kit-50-fixations-bac-acier-sur-bois-6-3-x-100-bleu-ral5008-scell-it-94737220.html
- [A13] « Fiche technique : closoir mousse », Faynot Industrie, mise à jour du 22 décembre 2015 (chez Envain Matériaux).
  https://www.envain-materiaux.fr/ressources/images/articles/ficheTechnique/FT_closoir-mousse.pdf
- [A14] « Pièces de finition, panneaux de couverture », Tolganor, édition 8 (2025). Panneaux sandwich : sert ici
  seulement pour les longueurs des pièces pliées.
  https://tolganor.fr/wp-content/uploads/2022/03/Pi-ces-Finition-Panneaux-Couverture-Ed.-8B-Septembre-2025.pdf
- [A15] « Plaques nervurées en acier pour couvertures sèches », ArcelorMittal Construction, fiche Batiproduits (résumé
  de recherche seulement).
  https://www.batiproduits.com/fiche/produits/plaques-nervurees-en-acier-pour-couvertures-sech-p68905778.html
- [A16] Annonce « Rive gris graphite pour plaque nervurée Covéo, ép 0,75 mm, lg 2100 mm, Bacacier », Mr Bricolage (titre seul).
  https://www.mr-bricolage.fr/Bauge/rive-gris-graphite-pour-plaque-nervuree-coveo-ep075mm-lg2100mm-bacacier.html

Non trouvés : un guide de pose d'ArcelorMittal Construction, de SMI ou de Tôle & Bac ; la fiche Joris Ide des pièces
de finition (accès refusé) ; le nombre de closoirs par carton.

### B. Tuile canal

- [B1] « Tuiles canal », encyclopédie Edilians (tableaux par modèle et par recouvrement). Relevé du 19 novembre 2026,
  repris de `tuiles-plates-canal-beton.json`.
  https://edilians.com/media/wysiwyg/Encyclopedie/canal-tuiles-edilians.pdf
- [B2] « Guide de pose Canal », Terreal (site Wienerberger). Relevé du 19 novembre 2026, repris du même fichier.
  https://www.wienerberger.fr/content/dam/wienerberger/france/marketing/documents-magazines/commercial/commercial-product-info-sheet/roof/terreal/FR_MKT_DOC_TRL_Guide_de_pose_CANAL_001.pdf
- [B3] « weber.cel tuile, mortier à la chaux pour les travaux de couverture », Weber (chez Chausson). Relu le 21 novembre.
  https://www.chausson.fr/media/article-document/223821
- [B4] « Mortier bâtard, mortier de montage », VPI (Vicat), édition 2023-2024 (chez Samse). Relu le 21 novembre.
  https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_241212.pdf
- [B5] Fiche PRB, citée dans `points-singuliers.json` (non relue).
  https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1218289.pdf
- Lu sans y trouver de chiffre : « Couvertures en tuiles », calepin de chantier (CAPEB Hérault).
  https://www.capeb.fr/www/capeb/media//herault/document/Couverture_tuiles.pdf

### C. Ardoise fibres-ciment

- [C1] « Manuel de pose ardoises fibres-ciment Cedral », Etex France, fichier du 15 avril 2026, 55 pages. Relu le 21 novembre.
  https://media.cedral.world/doc_1140309_fr/original/-293360529/cedral-ardoises-manuel-de-pose-pt.pdf?brand=cedral&market=fr
- [C2] « Documentation technique, ardoises en fibres-ciment » (Dolmen, Bravan), Cembrit, septembre 2016 (chez Chausson).
  Relu le 21 novembre.
  https://cdn.chausson.fr/catalog-document/5d3645ae-4526-43cd-bc4b-7702d4d39619/sfr-dolmen-bravan-20dt-fr-2016-1.pdf
- [C3] « Fiche faîtière demi-ronde », Cedral (lue par son résumé de recherche ; même fabricant que [C1]).
  https://media.cedral.world/pi782325/original/250204399/cedral-toiture_fiche-faitiere-demi-ronde.pdf

---

## Ce que le fondateur doit trancher

### A. Bac acier

1. **Les vis.** Deux façons de compter : la règle rapide « 2,5 vis par m² » (Joris Ide, une seule source), ou le compte
   par panne (une nervure sur deux au milieu, toutes les nervures en bas, en haut et sur 1 m de chaque côté). Le
   compte par panne est confirmé par deux sources, mais il demande le nombre de pannes. Laquelle garde-t-on, et avec
   quelle marge ?
2. **Le débord à l'égout.** « Entre 10 et 40 cm » (FFB) ou « 20 cm au plus » (fiche Bacacier, non relue). Quelle
   valeur ajouter au rampant quand le devis ne dit rien ? Ou poser la question à l'artisan ?
3. **Les longueurs des pièces pliées.** 2,10 m (2,00 m utile) est confirmé ; ton négoce vend-il aussi du 3 m ou du 4 m ?
   Et les closoirs : par pièce de 1 m, ou par carton ?

### B. Tuile canal

1. **Le recouvrement par défaut.** La fiche a quatre valeurs (140 à 170 mm). En Bretagne (zones 2 et 3) : 150, 160 ou
   170 mm. Laquelle prendre quand l'artisan ne dit rien, ou la question « protégé, normal, exposé » ?
2. **Le mortier du faîtage.** 5 à 10 kg par mètre : pour une canal, tu comptes combien en vrai ? Aucune fiche ne donne
   un chiffre propre à la canal.
3. **Deux lignes.** Couverts et courants en deux lignes de même quantité (confirmé par Edilians et Terreal) : c'est
   bien ce que ton négoce attend ?

### C. Ardoise fibres-ciment

1. **Le recouvrement par défaut du 40×24.** 100 mm (27,10 au m², 6,67 ml de liteaux) pour une pente de 45° en zone 3
   normale ; 110 mm en bord de mer exposé. On garde 100 par défaut ?
2. **La faîtière.** Demi-ronde (3 au mètre, pentes de plus de 70 %), angulaire de 1,20 m (0,91 au mètre) ou d'aération
   (2 au mètre) : laquelle proposer d'office ? Une seule source (Cedral).
3. **La fixation.** Crochet (1 par ardoise) ou 2 clous : laquelle par défaut pour le 40×24 ? Le crampon tempête ne
   concerne que le 45×30 et plus.
