# Ardoise au crochet : ce que consomment les ouvrages au mètre

Recherche du 21 novembre 2026. Rien ici n'est lu par le moteur : le fondateur valide d'abord.
Elle complète `ardoise.md` (§7) et la ligne `plus_values_par_ml` de `fiche-couverture.md`. Elle ne les refait pas.

## En bref

- **Une seule source chiffre tout en m² par mètre : le manuel CAP couvreur (chapitre 21).** Je l'ai relu en entier
  aujourd'hui : les valeurs de la fiche sont exactes, mot pour mot.
- **Aucune deuxième source chiffrée n'existe sur le web pour les rives, les arêtiers et les noues.** Cherché chez
  Cupa (guide de mise en œuvre), Rathscheck (brochure), le calepin de chantier CSTB / CAPEB / FFB, le guide du
  ministère de la Culture, un cours de BTS, deux articles de blog. Ils décrivent la façon, pas la quantité.
  Le guide du Ministère dit seulement que ces ouvrages se comptent « au mètre linéaire ».
- **Ce qui est confirmé par deux sources ou plus** : le doublis d'égout (un rang), le nombre de biaises d'un
  arêtier selon son angle, le rythme des noquets (un tous les deux rangs, ou un par rang).
- **La règle écrite par le fondateur dans son référentiel (§3 : « + 2 ardoises par rang et par versant » pour un
  arêtier) retombe sur le chiffre du manuel CAP** : 0,73 m² par mètre contre 0,66. C'est le meilleur recoupement
  trouvé. Mais le manuel ne fait aucune différence entre 2, 3 et 4 biaises.
- Le manuel CAP ne compte **rien pour le faîtage** (dans son exemple, 8 m de faîtage, zéro plus-value). La fiche
  compte un rang. Les deux se contredisent : voir le point 2 à trancher.

## 1. Comment lire le tableau

- **m² par mètre** : surface à ajouter à la surface du toit, pour un mètre d'ouvrage, AVANT de multiplier par le
  nombre d'ardoises au m², et avant la perte. C'est la méthode du manuel CAP : « à ajouter à la surface de
  couverture ».
- **Ardoises par mètre** = m² par mètre × ardoises au m².
- **Exemple chiffré** dans tout le fichier : 32×22, Bretagne zone 3, 45°, pureau 115,5 mm, 38,8 ardoises au m²
  (`ardoise.md` §2).
- **Rangs par mètre d'ouvrage biais** (arêtier, noue, rive biaise) = sin(angle) ÷ pureau. L'angle est celui de
  la ligne d'arêtier avec un rang, mesuré sur le versant. C'est de la géométrie, pas une source.
  Pour une croupe aux deux pentes égales : tangente de l'angle = 1 ÷ cosinus de la pente. À 45° de pente :
  angle 54,7°, soit 7,07 rangs par mètre d'arêtier avec le pureau de 115,5.
  Le référentiel (§25.1, noquets) écrit « longueur ÷ pureau » : c'est trop fort de 15 à 20 % sur un ouvrage biais.

Niveaux de confiance : **confirmé** (deux sources indépendantes), **une source**, **à confirmer** (déduit, ou
sources en désaccord), **introuvable**.

## 2. Tableau

| Ouvrage | Façon | Valeur | Formule | Condition | Sources | Confiance |
| --- | --- | --- | --- | --- | --- | --- |
| Égout | droit (doublis) | 1 pureau × longueur. Exemple : 0,1155 m² par m = **4,5 ardoises par m** | m² = pureau × ml ; ou ardoises = ml ÷ (largeur + 3 mm) : c'est le même nombre | un rang de doublis, ardoises raccourcies (hauteur − pureau), 2 clous | S1, S2, S3, S4, S6 | **confirmé** |
| Égout | biais | 2 pureaux × longueur. Exemple : 0,231 m² par m = 9 ardoises par m | m² = 2 × pureau × ml | égout qui n'est pas d'équerre avec les rangs | S1 seul. S2 dit seulement : la plus petite ardoise n'est pas plus courte que le recouvrement | une source |
| Faîtage | lignolet | 1 rang en plus par versant : 1 pureau × longueur, comme l'égout | m² = pureau × ml, par versant | le dernier rang est fait « d'une ardoise entière et d'une ardoise de tête » ; site normal ou protégé seulement | S3 (la façon), S2 (la condition). Aucun chiffre écrit. S1 ne compte rien | à confirmer |
| Faîtage | zinc ou terre cuite | **0** selon S1 ; 1 rang selon la fiche actuelle (`ardoise.md` §7) | — | le métal recouvre les ardoises d'un recouvrement au moins (S3) | S1 (exemple : faîtage 8 m, aucune plus-value) contre la fiche | à confirmer (désaccord) |
| Rive | tranchis droit (entières et demies) | **0,16 m² par m** = 6,2 ardoises par m | m² = 0,16 × ml | rive droite, une demi-ardoise un rang sur deux | S1 pour le chiffre. S2, S3, S4 pour la façon (entières et demies alternées). Règle du fondateur S8 : + 1 ardoise par rang = 0,22 m² par m (8,7 ardoises) | une source |
| Rive | tranchis biais (rive biaise, rive biaise à noquets) | **0,25 m² par m** = 9,7 ardoises par m | m² = 0,25 × ml | rive qui coupe les rangs en biais ; S1 l'applique aussi à une « rive biaise à noquets » | S1 seul | une source |
| Rive | tranchis circulaire | 0,33 m² par m | m² = 0,33 × ml | rive courbe (tourelle, œil-de-bœuf) | S1 seul | une source |
| Rive | déversée à 1 tranchis / à 2 tranchis | 0,33 / 0,50 m² par m | m² = valeur × ml | rive en déversée à fendis contre un mur ou une jouée | S1 seul. S3 décrit (fendis de 8 cm, longs de 3,5 pureaux) | une source |
| Arêtier | fermé en ardoises biaises (2, 3 ou 4 biaises) | **0,66 m² par m, les deux côtés compris** = 25,6 ardoises par m | m² = 0,66 × ml | arêtier fermé, sans métal apparent | S1 pour le chiffre, sans différence entre 2, 3 et 4 biaises. Règle du fondateur S8 (« + 2 ardoises par rang et par versant ») : 4 × 7,07 = 28 ardoises par m, soit 0,73 m² : **concordant** | une source, recoupée par la règle du fondateur |
| Arêtier | à 3 biaises, règle du fondateur du 21 novembre | 3 ardoises par côté et par rang = 6 × 7,07 = **42 ardoises par m** (1,09 m²), BRUT | ardoises = n biaises × 2 côtés × sin(angle) ÷ pureau | c'est ce que l'arêtier consomme ; ces ardoises couvrent aussi de la surface, déjà comptée dans les m² du toit | S8 (fondateur) seul. Aucune source écrite ne chiffre par nombre de biaises | à confirmer (voir point 1 à trancher) |
| Arêtier | nombre de biaises selon l'angle | 35 à 45° : 4 biaises ; 45 à 60° : 3 ; 60 à 68° : 2 ; au-delà : demi-arêtière (demie biaise ou droite) | — | angle de l'arêtier avec le rang, sur le versant. Croupe à pentes égales de 45° : 54,7°, donc 3 biaises | S3, S2 (« demi-ardoise, 3 ou 4 biaises »), S4, S5, S7 | **confirmé** |
| Arêtier | à rang de doublage | **0,66 m² par m, les deux côtés compris** | m² = 0,66 × ml | angle faible (11 à 35° selon S3, moins de 45° selon S4) ; ardoises du versant en tranchis biais, puis deux rangs posés le long de l'arête | S1 pour le chiffre ; S3 et S4 pour la façon | une source |
| Arêtier | en bardelis, en travers, gironné | introuvable | — | S5 : en travers, « deux arêtières à partir d'une seule ardoise », « une seule biaise par rang » | aucun chiffre | introuvable |
| Arêtier | zinc ou terre cuite (coupes seulement) | 2 tranchis biais = **0,50 m² par m** = 19,4 ardoises par m | m² = 2 × 0,25 × ml | « Les ardoises du versant sont taillées en tranchis » (S3). Le manuel n'a pas de ligne « arêtier métal » : c'est une déduction | S1 (tranchis biais) + S3 (la façon) | à confirmer (déduit) |
| Noue | à fendis : à 1 tranchis, à 2 tranchis | **1,50 m² par m** = 58 ardoises par m | m² = 1,50 × ml | noue tout en ardoise ; fendis de 6 à 8 cm, longs de 3,5 pureaux ; 2 ou 3 fendis par rang | S1 pour le chiffre ; S3, S4 pour la façon | une source |
| Noue | ronde en ardoise | **1,50 m² par m** selon S1 (« renvers rond ») ; règle du fondateur S8 : + 3 ardoises par rang et par côté = 42 ardoises par m (1,09 m²) | m² = 1,50 × ml | pentes de plus de 60°, écart de pente de 15° au plus (S3) ; 3 ou 4 fendis par rang | S1 contre S8 | à confirmer (désaccord) |
| Noue | renvers (noue contre une jouée) rond ou à 1 tranchis | 1,50 m² par m | m² = 1,50 × ml | un des deux versants est vertical | S1 seul | une source |
| Noue | fermée à noquets | ardoises : 2 tranchis biais = 0,50 m² par m (déduit). **Noquets : 1 tous les 2 rangs** (pente de 45° et plus), **1 par rang** (pente plus faible ou beaucoup d'eau) | noquets = ml × sin(angle) ÷ pureau, ÷ 2 si un rang sur deux | pentes d'au moins 40 %, écart de pente de moins de 15°, rangs consécutifs | noquets : S2, S3, S4. Ardoises : déduction de S1, aucune ligne dans le manuel | noquets : **confirmé** ; ardoises : à confirmer |
| Noue | zinc ouverte | 2 tranchis biais = **0,50 m² par m** = 19,4 ardoises par m (déduit). Règle du fondateur S8 : + 1 biaise par rang et par côté = 14 ardoises par m (0,36 m²) | m² = 2 × 0,25 × ml | ardoises en tranchis, épaulées, 2 clous, 6 cm au moins sur le métal ; noue voligée | S1 (tranchis biais) + S2, S4 (la façon), contre S8 | à confirmer (déduit, et désaccord) |
| Tourelle | — | surface du cylindre : circonférence de base × hauteur | — | — | S1 seul | une source |

## 3. Ce que le calcul dit des chiffres du manuel

Ce sont des contrôles de cohérence. Ce ne sont pas des sources.

- **Égout** : pureau × longueur × ardoises au m² = longueur ÷ (largeur + jeu). C'est exactement un rang. Rien à redire.
- **Rive droite, 0,16** : une demi-ardoise un rang sur deux, taillée dans une entière. Si la chute est perdue, on
  perd un quart de largeur d'ardoise par mètre de rive, soit 0,055 m². Le manuel compte trois fois plus : il
  couvre aussi la casse des épaulements. La règle du fondateur (une ardoise par rang, 0,22) est encore plus large.
  Les trois vont dans le même sens ; l'écart entre 0,16 et 0,22 pèse 2,5 ardoises par mètre de rive.
- **Arêtier, 0,66** : très proche de « 2 ardoises par rang et par versant » (0,73). En revanche « 3 par côté »
  compté en entier donne 1,09 : c'est 65 % de plus que le manuel. Soit le manuel sous-compte les arêtiers à 3 et
  4 biaises, soit une partie de ces ardoises est déjà dans la surface. Aucune source ne tranche.
- **Les chiffres du manuel sont ronds** : 0,16, 0,25, 0,33, 0,50, 0,66. Ce sont des forfaits de métré, pas des
  mesures par format : ils ne changent ni avec le format ni avec le pureau.

## 4. Laquelle croire quand deux disent autre chose

| Sujet | Les deux valeurs | La plus sûre, et pourquoi |
| --- | --- | --- |
| Arêtier fermé | manuel 0,66 m² ; fondateur 3 biaises = 1,09 m² brut | Le manuel pour 2 biaises (les deux se rejoignent). Pour 3 et 4 biaises, le fondateur : le manuel ne distingue pas, et lui sait ce qu'il taille. À lui de dire s'il faut retirer ce que ces ardoises couvrent. |
| Noue ronde | manuel 1,50 m² ; fondateur 1,09 m² | Le manuel : c'est le seul chiffre écrit, il est plus large, et une noue ronde demande des fendis longs (3,5 pureaux) taillés dans de grandes ardoises. |
| Noue zinc | déduit du manuel 0,50 m² ; fondateur 0,36 m² | Le fondateur : sa règle est écrite pour cet ouvrage ; le 0,50 est une déduction de ma part (deux rives biaises). |
| Rive droite | manuel 0,16 ; fondateur 0,22 | Le manuel : valeur écrite, et déjà trois fois le minimum géométrique. |
| Faîtage zinc | manuel 0 ; fiche 1 rang | Pas de vainqueur. Le dernier rang sous le métal est fait d'ardoises raccourcies : un rang compté en plus est prudent, zéro est défendable. |

## 5. Sources

Toutes lues le 21 novembre 2026.

- **S1. Manuel CAP couvreur, chapitre 21 « Quantitatif d'une couverture en ardoise au crochet »**, tableau
  « Plus-values pour le calcul du quantitatif (à ajouter à la surface de couverture) ». Éditeur non écrit dans
  l'extrait. https://www.fichier-pdf.fr/2020/04/05/1q/1q.pdf
  « Par ardoises biaises (pour 2 rives) 0,66 m² » ; « Tranchis droit 0,16 m² » ; « À 1 tranchis, à 2 tranchis 1,50 m² ».
  Exemple : « 0,1225 × 5,00 = 0,61 m² » pour l'égout, rien pour le faîtage de 8 m.
- **S2. « Calepins de chantier : Couvertures en ardoises »**, édité par le CSTB, FFB-UNCP et CAPEB-UNA, janvier
  2014, ISBN 978-2-86891-586-3. Se réfère au NF DTU 40.11.
  https://www.capeb.fr/www/capeb/media/herault/document/Couverture_ardoises.pdf
  « La hauteur du doublis est égale à une ardoise moins le pureau. » ; « 1 noquet tous les 2 pureaux. » ; « il peut
  être traité en demi-ardoise, à 3 ou 4 ardoises biaises ».
- **S3. « Ouvrages de couverture : Ardoises »**, guide de maîtrise d'ouvrage et de maîtrise d'œuvre, ministère de
  la Culture, août 2011 (fascicule technique, bordereau de prix, mode de métré).
  https://www.culture.gouv.fr/Media/Thematiques/Monuments-historiques-Sites-patrimoniaux-remarquables/Fichiers/Guides-MOA-MOE/Guide-de-maitrise-d-ouvrage-et-de-maitrise-d-aeuvre-Ouvrages-de-couverture-ardoises
  « de 45 à 60° : trois ardoises biaises » ; « Les rangs sont constitués alternativement de trois fendis et deux
  petites approches » ; « Arêtier fermé en ardoises taillées : au mètre linéaire ». Aucune quantité d'ardoises.
- **S4. « Techno BTS, lot 4-2 : Couvertures en ardoises »**, cours de lycée professionnel, mis en ligne en mars 2015.
  https://chpbtsmendes.wordpress.com/wp-content/uploads/2015/03/lot-4-2-couvertures-en-ardoises.pdf
  « Arêtier à trois ardoises biaises pour angles compris entre 45° et 60° » ; « Des noquets métalliques sont
  ajoutés tous les rangs d'ordre impair ». Aucune quantité.
- **S5. Même manuel CAP que S1, chapitre 14 « Mettre en œuvre : une rive en arêtier » et chapitre 22 « Les
  arêtiers »** (ce n'est donc pas une source indépendante de S1).
  https://www.fichier-pdf.fr/2020/05/10/ae25632124789364/ae25632124789364.pdf et
  https://www.fichier-pdf.fr/2020/03/20/1/1.pdf
  « De 45° à 60° : 3 biaises » ; « Les dimensions des biaises sont invariables dans tous les cas. »
- **S6. « Combien d'ardoises au m² ? »**, blog Ozymandias Agency, 15 novembre 2026. Site commercial, sans source citée.
  https://ozymandias.agency/blog/combien-ardoises-m2-tableau-formats-calcul-2026/
  « comptez une ardoise supplémentaire par largeur d'ardoise sur toute la longueur d'égout ». Pour le reste : 10 %
  de marge, sans chiffre au mètre.
- **S7. toiture.pro, lexique « Approche (ardoise) »** : mêmes seuils de biaises. Lu seulement dans le résultat de
  recherche, pas la page entière. https://toiture.pro/lexique/ardoise-approche.html
- **S8. Référentiel du fondateur**, `docs/referentiel-couverture.md` §3 (lignes « Rive à tranchis », « Arêtier
  fermé en ardoises (biaises) », « Noue encaissée zinc », « Noue ronde en ardoises ») et sa décision du 21 novembre
  2026. C'est son expérience de chantier, pas un document publié.

Lus sans rien y trouver sur ces ouvrages : Cupa Pizarras, « Guide de mise en œuvre »
(https://www.cupapizarras.com/wp-content/uploads/2018/11/guide_de_mise_en_oeuvre-1.pdf) ; Rathscheck, brochure
« L'ardoise » (https://www.rathscheck.de/wp-content/uploads/2020/10/RSCH_Broschuere_L_Ardoise_FR_A4_210x297_web.pdf) ;
l-e-couvreur.fr (5 à 10 % de marge, sans détail).

Non lus : le texte du NF DTU 40.11 (payant) ; les fiches « Les arêtiers en ardoise » et « Les noues en ardoise »
des Techniques de l'ingénieur (payantes) ; le guide de pose des Ardoisières d'Angers (cité par S2, introuvable en
ligne) ; aucun document des Compagnons trouvé avec des quantités.

## 6. Les questions à boutons, quand le devis ne dit pas la façon

Une phrase, des boutons, et « Autre » comme partout. Une façon écrite au devis ne se demande pas.

| Ouvrage | Question | Boutons |
| --- | --- | --- |
| Égout | Ton égout, il est droit ou en biais ? | Droit · En biais |
| Faîtage | Ton faîtage, tu le fais comment ? | Zinc · Terre cuite · Lignolet (ardoise) |
| Rive | Ta rive, elle finit comment ? | Rive droite · Rive biaise · Contre un mur (noquets) |
| Arêtier | Ton arêtier, tu le fais comment ? | Fermé en ardoises · Zinc · Terre cuite · Rang de doublage |
| Arêtier fermé | Ton arêtier fermé, il est à combien de biaises ? | 2 biaises · 3 biaises · 4 biaises |
| Noue | Ta noue, tu la fais comment ? | Zinc · Fermée à noquets · Ronde en ardoise · À fendis (1 ou 2 tranchis) |

La question « combien de biaises » peut ne pas se poser : l'angle de l'arêtier se calcule avec la pente (croupe à
pentes égales), et les seuils sont confirmés. On l'affiche alors comme une hypothèse que l'artisan change.

## 7. Ce que le fondateur doit trancher

1. **Arêtier fermé : on compte comment ?** Le manuel donne un forfait de 0,66 m² par mètre, quel que soit le nombre
   de biaises (pareil que ta règle « 2 par rang et par versant »). Ta règle du 21 novembre donne 6 ardoises par rang
   pour 3 biaises, soit 42 ardoises par mètre d'arêtier en 32×22. On ajoute ces 42 en entier, ou on retire ce
   qu'elles couvrent déjà ? Et pour 4 biaises : 8 par rang ?
2. **Faîtage zinc ou terre cuite : un rang en plus, ou rien ?** Le manuel CAP ne compte rien, la fiche compte un
   rang par versant. Même question pour le lignolet (un rang en plus par versant, aucune source chiffrée).
3. **Noues et rives : ta règle ou le manuel ?** Noue zinc : toi 1 biaise par rang et par côté (14 ardoises par
   mètre), le manuel déduit 19. Noue ronde : toi 3 par rang et par côté (42), le manuel 58. Rive droite : toi 1 par
   rang (8,7), le manuel 6,2. Je propose ta règle pour la noue zinc, le manuel pour la noue ronde et la rive.
