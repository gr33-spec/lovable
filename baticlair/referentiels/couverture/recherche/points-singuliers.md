# Points singuliers : faîtage, arêtier, rives, égout, noues, ventilation

Recherche du 19 novembre 2026. Les données sont dans `points-singuliers.json` : 47 entrées, 25 verdicts, 14 fiches comptoir.
Statuts des entrées après la deuxième passe : 33 `confirme`, 10 `une_source`, 4 `a_confirmer` (avant : 30 / 13 / 4).
Le moteur ne lit rien de ce dossier. Tout passe par la validation du fondateur.

Sources principales : BMI Monier (closoirs Metalroll, Figaroll Plus, Dryroll), Ubbink (catalogue ventilation, Airtec), Terreal
(Romane Canal, Lahe-Pro), Edilians (encyclopédie tuiles, NOOK, catalogue Toiture ardoise 360), VMZINC et RHEINZINK (bandes),
Weber, PRB et VPI (mortiers), Eurotec et Simpson (supports de lisse), le guide FFB sur la ventilation, le calepin CAPEB ardoise
(NF DTU 40.11 illustré) et Maisons Paysannes (ardoise de l'Ouest). Aucun texte de DTU n'a été lu directement : les valeurs DTU
viennent de ces guides.

## Bretagne : ardoise

- **Faîtage.** Quatre façons de faire : le lignolet (ardoises, sans métal ni mortier, en site normal ou protégé seulement ;
  ardoises triangulaires dans le Morbihan et le Finistère nord), la faîtière terre cuite scellée au mortier bâtard, la faîtière
  terre cuite Edilians « Armor » ou « Ardoise », et le faîtage zinc à pinces ou à ourlets.
- **Faîtage zinc.** Les pièces font 2 m, en développé 250, 333 ou 400, épaisseur 0,65, zinc naturel ou prépatiné noir
  (Edilians, VMZINC). Je n'ai trouvé de pièce de 3 m pour le faîtage chez aucun fabricant.
- **Faîtière Armor.** Elle mesure 37 cm d'après le titre d'une fiche de négoce. Le nombre au ml n'est publié nulle part : il faut
  le demander à Edilians.
- **Lignolet.** Le guide Culture le décrit (sur chaque versant, un rang d'ardoises entières et un rang d'ardoises de tête, l'un
  dépassant l'autre de 50 à 60 mm) sans donner de nombre au ml. La règle « ml ÷ L × 1,2 » du §3 reste `a_confirmer`.
- **Rive.** On pose un rang d'ardoises entières alterné de demi-ardoises, sur un chevron de rive en saillie. La demi-ardoise
  prend 1 clou de tête et 1 clou de milieu, l'entière 1 clou de tête et 1 crochet (CAPEB). L'expression « rive à approche » ne
  figure dans aucune source écrite que j'ai consultée. La bande de rive zinc existe en plusieurs profils (biseau, à cheval,
  astragale, à pli, lyonnaise), en longueurs de 2 m.
- **Noues.** Trois types : noue métallique ouverte (sur voligeage, recouvrement de l'ardoise d'au moins 6 cm), noue fermée à
  noquets (pente d'au moins 40 %) et noue ronde en ardoise (CAPEB et guide Culture : confirmé). **Noquets** : 1 tous les 2 rangs
  dans le cas courant ; 1 par rang si la pente est faible (sous 45° environ) ou si la noue reçoit beaucoup d'eau (guide Culture). Edilians vend une noue à pinces en
  développé 250, 333 ou 400, en 2 ou 3 m.
- **Chatière ardoise.** Ubbink VEPAC : 70 ou 140 cm².

## Toute la France : tuile

| Article | Règle | Statut |
| --- | --- | --- |
| Faîtière 40-42 cm sans emboîtement, ou angulaire | 3 pièces/ml | confirme (Edilians, Terreal) |
| Faîtière à emboîtement grand modèle | 2,5 pièces/ml (de 2,2 à 2,8 selon le modèle) | confirme |
| Faîtière demi-ronde de 50 (Monier) | 2 pièces/ml | une_source |
| Closoir souple | rouleaux de 5 m (Monier, Atout Pro) ou de 10 m (Ubbink, Dryroll), dévidoir de 50 m ; rigide en éléments de 2 m (Terreal) ; recouvrement de 5 cm entre morceaux | confirme |
| Largeur du closoir | selon le galbe de la tuile : 240 mm (tuile plate) à 400 mm (fort galbe) ; même closoir en faîtage et en arêtier | confirme |
| Clip de faîtière | 1 par faîtière, propre au modèle de faîtière | confirme |
| Support de lisse | 1 par chevron ou fermette (50 à 80 cm), soit environ 1,7 au ml | confirme |
| About de faîtage | 1 par extrémité qui arrive sur un pignon ; côté croupe, une rencontre à la place | une_source (déduit des gammes) |
| About d'arêtier | 1 par arêtier | confirme |
| Rencontre 3 ou 4 branches | 1 par jonction entre le faîtage et les arêtiers | confirme |
| Tuile de rive | 1 ÷ pureau : 2,6 à 2,8/ml en grand moule, 4,6 à 5/ml en tuile plate, une ligne gauche et une ligne droite | confirme / une_source |
| Mortier de faîtage scellé | 5 à 10 kg/ml (Weber, VPI) ; PRB jusqu'à 20 kg/ml ; sac de 25 kg, palette de 48 sacs (56 chez VPI) | confirme |
| Mortier de rive ou d'arêtier | PRB : 12 à 25 kg/ml de « scellement de tuile » (faîtière ou rive) ; Weber : 5 à 10 kg/ml de faîtage ; rien de propre à la rive | a_confirmer |
| Mortier de solin | 1,5 à 2 kg/ml (Technichem seulement, solin mur-sol) | une_source |
| Noue préformée | 400 ou 500 mm, en 2 m (et 3 m en zinc naturel chez VMZINC) ; NOOK : recouvrement de 15 cm, donc 1,85 m utiles | confirme / une_source |
| Peigne ou closoir d'égout | barres de 1 m | confirme |
| Doublis, bande d'égout, larmier | pièces de 2 m, développé de 100 à 400 mm | confirme |
| Ventilation | 1/5000 en comble perdu, 1/3000 en comble aménagé, plus 1/3000 sous un écran ventilé ; moitié en bas, moitié en haut | confirme (FFB, Ubbink : 2 et 3,3 cm²/m²) |
| Larmier sous écran | zinc, développé 166 mm, 2 m | confirme (Terreal, Edilians) |
| Tuile chatière | 13 à 55 cm² selon le modèle | confirme |

## Verdicts sur les ratios existants

- **Corrigés (11).**
  - Noquets « 1 par rang » : 1 tous les 2 rangs par défaut, 1 par rang seulement en faible pente ou en noue très chargée (CAPEB, guide Culture).
  - Faîtière à 2,9/ml : passer à 3/ml par défaut, ou à la valeur du modèle.
  - Abouts à 2 par faîtage : 1 par pignon.
  - Closoir d'arêtier de 23 cm : c'est le même closoir que le faîtage, choisi selon le galbe.
  - Supports de liteau à 1/ml : 1 par chevron.
  - Faîtage et arêtier zinc en 3 m : 2 m.
  - Rive et bande d'égout zinc en 3 m : 2 m.
  - Tuile de rive à 3/ml : 2,6 à 2,8/ml.
  - Chatière « 1 pour 20 à 25 m² » : calculer avec la section de la chatière (une tuile chatière de 20 cm² en demande 3 à
    4 fois plus).
  - Ventilation au 1/3000 seul : 1/5000 en comble perdu.
  - Skill « faîtage en ml, sans conversion » : la faîtière se commande à la pièce.
- **Confirmés (7).** Closoir en rouleau de 5 m (bon défaut, d'autres longueurs existent) ; 1 clip par faîtière ; mortier de
  faîtage de 5 à 10 kg/ml (8 par défaut) ; noue NOOK de 1,85 m utiles ; peigne en barres de 1 m ; palette de 48 sacs ; jamais
  de mortier et de closoir ensemble sur le même faîtage.
- **À confirmer (7).**
  - Mortier de solin à 2 kg/ml : une seule source, et le chiffre Remmers à 1,7 kg/ml n'a pas été retrouvé.
  - Mortier de rive et d'arêtier.
  - Noue de 50 par défaut : sur ardoise, le catalogue propose 250, 333 ou 400 ; le bouton « de 66 » ne correspond à aucune
    pièce préformée.
  - Les + 5 % du skill sur le closoir, les rives et les noues : aucune source, et risque de double compte avec la longueur
    utile de 1,85 m.
  - Coupes comptées dans la perte du toit ou en plus-values (§25.1).
  - Pattes et clous de zinc : 3 et 4 au ml.

## Décisions à trancher par le fondateur

1. **Faîtière par défaut à 3/ml**, plutôt que 2,9, quand le modèle n'est pas connu.
2. **Abouts.** Faut-il demander la forme du toit (deux pignons, croupes) ou garder 2 en « à vérifier » ?
3. **Système de faîtage à sec.** Le skill interdit de proposer les supports de lisse et les clips, alors que les fabricants
   (Monier, Terreal) les mettent dans le système à sec. Faut-il les passer en Suggestions ?
4. **Faîtage : pièces ou ml + 5 %** sur la liste. Le comptoir sert des pièces.
5. **Noue.** Quel défaut sur ardoise en Bretagne (noue façonnée, ou noue à pinces de 333 ou 400) ? Faut-il supprimer le choix
   « de 66 » ?
6. **Coupes de rive, d'arêtier et de noue sur l'ardoise** : plus-values du manuel CAP (§25.1), ou comptées dans la perte du toit
   (skill) ?
7. **Valeurs bretonnes à faire confirmer par un couvreur ardoisier** : quantité d'ardoises pour le lignolet, nombre de faîtières
   Armor au ml, noquets.

## Ce que demande le vendeur au comptoir (détail dans le JSON)

- **Faîtière et arêtier.** Le modèle de la tuile, le type (1/2 ronde, conique, angulaire), avec ou sans emboîtement, la teinte,
  la pose (à sec ou à sceller) et le nombre de pièces.
- **Closoir.** La largeur (selon le galbe), la couleur, souple ou rigide, et le nombre de ml.
- **Clips de faîtière.** Le modèle de faîtière, inox ou galva.
- **Supports de lisse.** Le type (à clou ou à pattes), la hauteur, la section de la lisse et le nombre.
- **Zinc** (faîtage, rive, égout, noue). Le profil, le développé, l'épaisseur, l'aspect et le nombre de longueurs de 2 m.
- **Mortier.** La teinte et le nombre de sacs de 25 kg.
- **Peigne d'égout.** La hauteur et la couleur, en barres de 1 m.
- **Chatière et tuile à douille.** Le modèle de tuile, le diamètre et la teinte.

## Deuxième passe (19 novembre 2026) : ce qui reste

- **À confirmer (4)** : nombre de faîtières Armor au ml (aucune fiche Edilians ne le publie) ; mortier de rive et d'arêtier
  (deux fabricants divergents, aucun chiffre propre à la rive) ; pattes de faîtage zinc au ml (le guide Culture dit « à chaque
  jonction » sans nombre) ; ardoises du lignolet au ml.
- **Une source (10)** : faîtière demi-ronde de 50 à 2/ml (toujours Monier seul, fiches lues chez des négoces) ; closoir rigide
  Terreal ; conditionnement des supports de lisse ; abouts (déduit des gammes) ; mortier de solin ; rive de tuile plate ;
  recouvrement NOOK 15 cm ; noue à pinces Edilians ; ventilation linéaire Ubbink ; chatière ardoise VEPAC.
- Les + 5 % sur closoir, rives et noues : toujours aucune source.

## Passe 3b (19 novembre 2026, testeur-négoce) : faîtage breton

- **Faîtière Armor** : fabricant **Edilians** confirmé (page produit edilians.com « Faîtière Armor 33 », réf. **729**, usine de
  Pargny-sur-Saulx ; catalogue Toiture ardoise 360). Longueur **hors tout 370 mm** (Edilians, Leadermat, CMESMAT : `confirme`),
  3,1 kg, **palette de 184** (code catalogue « PC184 » + Leadermat : `confirme`). Coloris **Rouge, Vieilli Masse, Émaillé Brun**
  (`une_source` : page Edilians seule ; le catalogue cite VM et RO). **Nombre au ml : non publié** (`a_confirmer`) ; le « 33 » du
  nom pourrait être un pas de 0,33 m (3 au ml) mais rien ne le dit : demander le nombre de faîtières. Ajout de la faîtière
  « ardoise de 40 ouverture 17 » (réf. 720, 445 mm, 4,2 kg, `une_source`).
- **Lignolet** : formule corrigée, unité juste : **2 × 1 000 ÷ (L + 3 mm) ardoises par ml de faîtage** (un rang de doublage par
  versant : 32×22 ≈ 9,0 /ml ; 30×20 ≈ 9,9 /ml), 2 clous par ardoise sur les deux derniers rangs. C'est le « + 1 rang au
  faîtage » déjà compté dans ardoise.json : ne pas l'ajouter deux fois. `une_source` (géométrie appliquée à la description du
  guide Culture et du DTU, aucun nombre publié). L'ancien « ml ÷ L × 1,2 » est corrigé (verdict ajouté). **Écart important** : le
  DTU 2020 (copie lue) réserve le lignolet à la **zone I protégée** (débordement 50 mm) ; la CAPEB dit « normal ou protégé ». Sur
  la côte bretonne, le lignolet est hors DTU : seulement si le devis l'écrit.
- **Mortier de faîtage par type** : aucun fabricant ne le chiffre par type de faîtière. Entrée `a_confirmer` qui range les
  fourchettes publiées : ≈ 5 kg/ml sur plates et faible galbe (VPI, bas Weber), 5 à 10 (Weber) sur emboîtement galbé, jusqu'à
  20 (PRB « suivant types de tuiles ») sur canal ou très fort galbe.
- **Closoir selon la classe de galbe** (`confirme`, 3 fabricants) : G0 ≈ 240 mm (Edilians SIROKO+4, Ubbink TP), G1 ≈ 300-310
  (SIROKO+3, ZEF, Ubbink TG), G2 ≈ 370-390 (SIROKO+2, ZEF ; Ubbink MG 360), G3 ≈ 390-400 (SIROKO+1 ; Ubbink FG 400) ; Monier :
  rouleau 26/32 (Metalroll) ou 28/32 (Figaroll Plus) pour G0-G1, 32/38 ou 34/38 pour G2-G3 ; rigide Edilians SHARK+ 90 (G0-G1),
  120 (G2), 140 (G3). La correspondance Ubbink TP/TG/MG/FG ↔ G0-G3 est une lecture (Ubbink n'écrit pas les classes QB).
  HP 10 = G0, PV 10 = G1 (fiches Edilians).
