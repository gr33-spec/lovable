# Référentiel quantitatif couverture-étanchéité (Rappidos)

2026-10-03 · Greg

## 1. Règle d'or et architecture

Une surface n'est jamais une unité de commande. Le devis se mesure en m² et en ml ; la commande fournisseur se passe en unités, bottes, rouleaux, barres, seaux, cartons. Entre les deux il faut une couche de conversion métier, et c'est elle qui manque aujourd'hui.

Chaque ligne de devis passe par trois étapes :

1. **Métré** : l'artisan donne (ou l'IA déduit) des surfaces rampantes, des linéaires et une pente.
2. **Conversion** : pour chaque ouvrage, une règle transforme métré → quantité d'approvisionnement, par matériau, dans l'unité de commande (ex. 200 m² ardoise 32×22, pente 45°, zone 2 → 8 160 ardoises + 1 820 ml de liteaux + 8 200 crochets).
3. **Conditionnement** : la quantité est arrondie au conditionnement fournisseur (bottes de 50 ml, rouleaux de 75 m², palettes de 500 ardoises…).

Trois règles de codage non négociables :

- Chaque matériau porte **son unité de commande** (`unite_commande`), jamais héritée de l'ouvrage.
- Chaque matériau porte **une règle de conversion** paramétrée par le format, la pente et la zone climatique, jamais un ratio unique codé en dur.
- Les ratios de ce document sont des **valeurs par défaut** : l'artisan doit pouvoir les surcharger (son format d'ardoise, son fournisseur, son recouvrement habituel).

Sources normatives : DTU 40.11 (ardoises), 40.13 (ardoises fibres-ciment), 40.21/40.22/40.23/40.24 (tuiles), 40.35 (bac acier), 40.41 (zinc), 40.5 (évacuation EP), 43.1/43.3/43.4/43.5 (étanchéité). Les chiffres ci-dessous sont les valeurs courantes des DTU et des fiches fabricants (Cupa, Rathscheck, Imerys/Edilians, Terreal, VMZINC, Soprema). Pour un marché public ou un litige, c'est le DTU en vigueur et la fiche produit qui font foi.

## 2. Méthode générale de métré

Tout part de trois familles de données : les surfaces rampantes (m²), les linéaires de points singuliers (ml) et le contexte (pente, zone, altitude). Si l'artisan ne donne qu'une surface au sol, l'app la convertit en surface rampante avec le coefficient de pente avant toute conversion matériau.

**Surface rampante** = surface au sol × 1 / cos(angle). Pente % = tan(angle) × 100.

| Pente (°) | Pente (%) | Coefficient rampant |
|---|---|---|
| 20 | 36 | 1,064 |
| 25 | 47 | 1,103 |
| 30 | 58 | 1,155 |
| 35 | 70 | 1,221 |
| 40 | 84 | 1,305 |
| 45 | 100 | 1,414 |
| 50 | 119 | 1,556 |
| 60 | 173 | 2,000 |

**Linéaires à collecter systématiquement** (ils pilotent les accessoires) : égout, faîtage, arêtiers, noues, rives (gauche/droite séparées pour les tuiles), solins/abergements (cheminées, murs), longueur de rampant (pour le recouvrement ardoise et les joints de dilatation zinc).

**Zones climatiques** (DTU 40.11/40.21) : zone 1 = intérieur, zone 2 = bande littorale 20-40 km et altitude 200-500 m, zone 3 = bord de mer < 20 km et altitude > 500 m. Chaque zone se décline en site protégé / normal / exposé. Paimpol et tout le littoral breton = zone 3 par défaut. La zone augmente le recouvrement, donc le nombre d'éléments au m².

**Coefficients de perte** (à appliquer après conversion, avant arrondi au conditionnement) :

| Ouvrage | Perte par défaut | Commentaire |
|---|---|---|
| Ardoise, pans rectangulaires simples | 5 % | casse + coupes de rive |
| Ardoise, toiture complexe (noues, arêtiers, lucarnes) | 8 à 10 % | tranchis et biaises |
| Tuiles plates | 5 % |  |
| Tuiles mécaniques | 3 % |  |
| Liteaux, voliges | 5 % | chutes |
| Écran de sous-toiture | 10 à 15 % | recouvrements + chutes |
| Zinc en bande (faîtage, noue, rive) | 5 % | recouvrements 3 m |
| Zinc joint debout | 5 à 8 % | selon forme du pan |
| Membrane bitume | 8 à 12 % | recouvrements longitudinaux et transversaux |
| EPDM | 10 % |  |

**Arrondis** : toujours à l'unité de conditionnement supérieure. L'app affiche la quantité théorique, la quantité avec perte et la quantité commandée (ex. 8 160 → 8 568 → 18 palettes de 500 = 9 000 ardoises, ou 86 cartons selon le fournisseur).

## 3. Ardoise naturelle (DTU 40.11)

L'unité de commande est l'ardoise (vendue au mille, par palette ou carton). Le nombre au m² se calcule, il ne se lit pas : il dépend du format, du recouvrement, et le recouvrement dépend de la pente, de la zone et de la longueur du rampant.

**Formules** (pose au crochet, double recouvrement, hauteur H et largeur L en mm, recouvrement R en mm) :

```latex
\text{pureau} = \frac{H - R}{2}
```

```latex
\text{ardoises/m}^2 = \frac{1\,000\,000}{L \times \text{pureau}}
```

```latex
\text{liteaux (ml/m}^2) = \frac{1000}{\text{pureau}}
```

**Recouvrement R selon pente et zone** (valeurs courantes DTU 40.11, pose au crochet, rampant ≤ 5,5 m ; +10 mm si rampant > 5,5 m, +5 mm supplémentaires par tranche de 1 m au-delà de 8 m). L'app prend la valeur du tableau puis l'arrondit aux 5 mm supérieurs.

| Pente | Zone 1 | Zone 2 | Zone 3 |
|---|---|---|---|
| 25° (47 %) | 110 | 120 | 130 |
| 30° (58 %) | 100 | 110 | 120 |
| 35° (70 %) | 90 | 100 | 110 |
| 40° (84 %) | 85 | 90 | 100 |
| 45° (100 %) | 80 | 85 | 95 |
| ≥ 50° (119 %) | 70 | 80 | 90 |

Pente minimale ardoise : 45 % (24°) en zone normale, 60 % (31°) en zone exposée. En dessous, refuser l'ouvrage ou passer en pose clouée triple recouvrement.

**Tableau de référence par format** (R = 100 mm, soit zone 1 à 30° ou zone 3 à 40°). Pour un autre R, recalculer avec les formules ; la source est le mémento Rathscheck / tableau DTU.

| Format (cm) | Pureau (mm) | Ardoises/m² | Crochet (cm) | Liteaux (ml/m²) |
|---|---|---|---|---|
| 40 × 25 | 150 | 26,7 | 11 | 6,67 |
| 40 × 22 | 150 | 30,3 | 11 | 6,67 |
| 35 × 25 | 125 | 32,0 | 11 | 8,00 |
| 35 × 22 | 125 | 36,4 | 11 | 8,00 |
| 33 × 23 | 115 | 37,8 | 11 | 8,70 |
| 32 × 22 | 110 | 41,3 | 11 | 9,09 |
| 30 × 22 | 100 | 45,5 | 11 | 10,0 |
| 30 × 20 | 100 | 50,0 | 11 | 10,0 |
| 30 × 18 | 100 | 55,6 | 11 | 10,0 |
| 27 × 18 (R 90) | 90 | 61,7 | 10 | 11,1 |
| 27 × 16 (R 90) | 90 | 69,4 | 10 | 11,1 |
| 25 × 18 (R 80) | 85 | 65,4 | 9 | 11,8 |
| 22 × 16 (R 70) | 75 | 83,3 | 8 | 13,3 |

**Fixations** : 1 crochet inox par ardoise (longueur = pureau + 10 à 20 mm, Ø 2,7 mm, inox 18/10 en zone littorale) ; pose clouée = 2 clous cuivre par ardoise. Commander crochets = ardoises × 1,02.

**Support** : soit liteaux 18×40 ou 27×40 mm à l'écartement du pureau (ml/m² du tableau, +5 %), soit voligeage 15/18 mm jointif (m² × 1,05) avec pose au clou.

**Points singuliers** (consommation en plus de la surface courante) :

| Ouvrage | Règle de conversion |
|---|---|
| Doublis (rang d'égout) | 1 rang supplémentaire sur l'égout : ml égout / L × 1,05 ardoises + un rang d'ardoises raccourcies |
| Rive à tranchis (ardoises coupées) | +1 ardoise par rang de chaque côté : ml rive / pureau |
| Arêtier fermé en ardoises (biaises) | +2 ardoises par rang et par versant : 2 × ml arêtier / pureau × 2 versants |
| Arêtier ou faîtage en zinc | bande zinc dév. 25 à 33 cm, longueurs 3 m : ml × 1,05 ; bande de 2 m = ml / 2 arrondi sup. + pattes de fixation 3/ml |
| Faîtage en lignolet (ardoises) | ardoises débordantes : ml faîtage / L × 1,2 |
| Noue encaissée zinc | noue dév. 50 à 60 cm, longueurs 3 m : ml × 1,05 ; +1 ardoise biaise par rang de chaque côté |
| Noue ronde en ardoises | +3 ardoises par rang de chaque côté |
| Solin / abergement | zinc ou bavette plomb : ml × 1,1 + solin mortier ou bande porte-solin |
| Chatières | 1 pour 20 à 25 m² en bas et en haut de rampant |

Exemple complet (ce que l'app doit sortir) : 200 m² rampant, 32×22, pente 45°, zone 3, rampant 6 m → R = 95 + 10 = 105 mm → pureau 107,5 mm → 42,3 ardoises/m² → 8 460 ardoises théoriques → +8 % = 9 140 → 9 500 ardoises (19 palettes de 500) ; liteaux 9,3 ml/m² → 1 860 ml + 5 % = 1 950 ml → 39 bottes de 50 ml ; crochets 9 300 → 10 cartons de 1 000.

## 4. Ardoise fibres-ciment (DTU 40.13)

Mêmes formules que l'ardoise naturelle, avec des formats et recouvrements propres. Pose au crochet ou clou + crochet d'antivent (1 par ardoise en zone exposée).

| Format (cm) | Recouvrement courant (mm) | Pureau (mm) | Ardoises/m² | Liteaux (ml/m²) |
|---|---|---|---|---|
| 40 × 24 | 100 | 150 | 27,8 | 6,67 |
| 40 × 27 | 100 | 150 | 24,7 | 6,67 |
| 60 × 30 (pose simple, grand format) | 100 | 250 | 13,3 | 4,0 |
| 60 × 40 | 100 | 250 | 10,0 | 4,0 |
| 45 × 32 (losangée / diagonale) | 90 | selon fabricant | ≈ 12 | ≈ 4,5 |

Fixations : 2 clous inox + 1 crochet d'antivent par ardoise (commander clous = 2,1 × ardoises, antivents = 1,05 × ardoises). Points singuliers : mêmes règles qu'en ardoise naturelle (section 3), mais les arêtiers et faîtages sont presque toujours en zinc ou en pièces fabricant.

## 5. Tuiles terre cuite et béton (DTU 40.21 à 40.24)

L'unité de commande est la tuile (par palette) et chaque accessoire est une pièce distincte : faîtière, arêtier, rive gauche, rive droite, about, chatière, tuile à douille. Le nombre au m² vient de la fiche fabricant (pureau × largeur utile) ; les valeurs ci-dessous sont les ordres de grandeur à utiliser par défaut quand le modèle n'est pas connu.

```latex
\text{tuiles/m}^2 = \frac{1}{\text{pureau (m)} \times \text{largeur utile (m)}}
```

**Tuiles courantes**

| Famille | Exemples | Pureau (cm) | Tuiles/m² | Liteaux (ml/m²) | DTU |
|---|---|---|---|---|---|
| Mécanique grand moule à emboîtement | Double Romane, Romane Canal, Rhôna, Alpha 10, HP10 | 34 à 37 | 10 à 11 | 2,8 à 3,0 | 40.21 |
| Mécanique grand moule faible galbe | PV10, Plate 10 | 34 à 37 | 10 à 11 | 2,8 à 3,0 | 40.21 |
| Mécanique petit moule | Marseille, Losangée, Alpha 13, Beauvoise | 24 à 26 | 13 à 15 | 4,0 à 4,2 | 40.22 |
| Mécanique petit moule 20 | H2, Panne H2 (vérifier fiche fabricant) | 28 à 30 | 18 à 22 | 3,4 à 3,6 | 40.22 |
| Plate petit moule traditionnelle | 16×27, 17×27, 17×30 | 8 à 10 | 60 à 75 | 10 à 12,5 | 40.23 |
| Plate grand moule | 20×30, 25×40, Plate 20 | 11 à 15 | 32 à 42 | 6,7 à 9 | 40.23 |
| Canal (courante + couvrante) | tuiles romaines, 40 à 50 cm | 30 à 36 | 22 à 28 au total (moitié courantes, moitié couvertes) | selon support (tasseaux, plaques support canal 1 m²/m²) | 40.22 |
| Canal à emboîtement | Omega 10, Canal S, Médiane | 34 à 37 | 10 à 13 | 2,8 à 3,0 | 40.21 |
| Béton grand moule | Monier Signy, Plein Ciel, Innotech | 33 à 35 | 9,5 à 10,5 | 2,9 à 3,0 | 40.24 |

Recouvrement minimal des tuiles à emboîtement : le pureau réel se cale entre pureau mini et maxi de la fiche produit selon la pente ; en zone 3 et pente < 35 %, prendre le pureau mini (donc le nombre au m² maxi).

**Accessoires** (en pièces, à partir des linéaires)

| Accessoire | Règle de conversion | Conditionnement courant |
|---|---|---|
| Faîtière 1/2 ronde ou angulaire (40 à 42 cm, recouvrement 5 à 7 cm) | ml faîtage / 0,35 ≈ 2,9 pièces/ml, arrondi sup. | à l'unité, palette de 100 |
| Arêtier (même pièce que faîtière en général) | ml arêtier / 0,35 ≈ 2,9 pièces/ml | idem |
| About de faîtage / about d'arêtier | 1 par extrémité libre (2 par faîtage, 1 par arêtier) | unité |
| Poinçon / rencontre 3 ou 4 voies | 1 par intersection faîtage-arêtiers | unité |
| Closoir ventilé faîtage (rouleau 5 m, largeur 30 à 32 cm) | ml faîtage / 5 arrondi sup. ; arêtier : largeur 23 cm | rouleau |
| Crochets de faîtière à sec | 1 par faîtière + liteau de faîtage ml × 1,05 + supports de liteau 1/ml | sachet |
| Tuile de rive gauche / droite (grand moule) | ml rive / pureau, soit ≈ 3/ml par côté | unité |
| Tuile de rive (petit moule) | ml rive / pureau ≈ 4/ml par côté | unité |
| Rive en bande zinc ou planche de rive + bardelis | ml rive × 1,05 | barre 3 m |
| Tuile et demie (plate, pour rives et noues) | ml rive + 2 × ml noue, divisé par pureau, divisé par 2 | unité |
| Chatière / tuile de ventilation | 1 pour 20 à 25 m², en bas et en haut de rampant | unité |
| Tuile à douille + lanterne (sortie VMC, hotte) | 1 par sortie demandée | unité |
| Crochets / vis de tuile | pente > 60 % ou zone 3 : 1 par tuile ; sinon rives, égout, faîtage et 1 tuile sur 5 en plan carré | boîte de 100/250 |
| Noue zinc dév. 50 cm | ml noue × 1,05 | bande 3 m |
| Peigne / grille anti-oiseaux d'égout | ml égout / 1 (barres de 1 m) | barre |
| Bande d'égout zinc + bavette | ml égout × 1,05 | bande 3 m |

Exemple : 120 m² en Double Romane (10,5/m²), faîtage 12 m, 2 arêtiers de 6 m, rives 2 × 7 m → 1 260 + 3 % = 1 300 tuiles ; 35 faîtières + 35 arêtiers + 2 abouts + 2 rencontres 3 voies ; 21 rives gauches + 21 rives droites ; 6 chatières ; closoir 3 rouleaux de 5 m.

## 6. Support et sous-couche

Ces lignes se déduisent automatiquement de la surface rampante et de la charpente (entraxe chevrons) ; l'app ne doit jamais les oublier, c'est là que le quantitatif « au m² » est le plus trompeur.

| Élément | Unité de commande | Règle de conversion | Conditionnement |
|---|---|---|---|
| Écran de sous-toiture HPV (rouleau 1,5 × 50 m = 75 m²) | rouleau | m² rampant × 1,12 / 75, arrondi sup. | rouleau |
| Adhésif de recouvrement d'écran | rouleau 25 m | ml de recouvrements ≈ m² / 1,4 → / 25 | rouleau |
| Contre-liteaux 27×40 ou 40×40 (sur chevrons) | ml | m² rampant / entraxe chevrons (0,45 à 0,60 m) ≈ 1,7 à 2,2 ml/m², +5 % | botte ou barre 4 m |
| Liteaux 27×40 (tuile) ou 18×40 / 27×27 (ardoise) | ml | m² × (1 / pureau en m), +5 % (voir sections 3 et 5) | botte de 50 ml, barres 4 m |
| Voligeage sapin 15 ou 18 mm, jointif ou à claire-voie | m² | m² rampant × 1,05 (jointif) ; claire-voie : × 0,6 | paquet, ml de volige 10 cm |
| Panneaux OSB 3 / contreplaqué CTBX (support zinc ou étanchéité) | panneau | m² × 1,05 / surface panneau (2,50 × 1,25 = 3,125 m²) | panneau |
| Pointes torsadées / vis pour liteaux | kg ou boîte | 2 fixations par croisement liteau-chevron : nb = ml liteaux / entraxe chevrons × 2 ; ≈ 0,15 kg/m² en pointes | boîte, kg |
| Isolant sarking (PIR, fibre de bois) | panneau | m² × 1,03 / surface panneau | panneau, palette |
| Pare-vapeur (sous isolant sarking) | rouleau | m² × 1,15 / surface rouleau | rouleau |
| Planche de rive / bandeau d'égout | ml | ml égout et rives × 1,05 | barre 4 ou 5 m |
| Peigne anti-oiseaux | ml | ml égout | barre 1 m |
| Grille / closoir d'égout ventilé | ml | ml égout | barre ou rouleau |

Si l'artisan ne connaît pas l'entraxe chevrons, prendre 0,60 m en rénovation courante et le signaler comme hypothèse dans le devis.

## 7. Zinc : joint debout, évacuation des eaux, points singuliers

**Joint debout (DTU 40.41)** : la commande se fait en ml de bac (ou en kg / bobines de zinc), pas en m². Largeur développée 500 mm → entraxe des joints 430 mm (obligatoire en zone 3 site exposé et zone 4, donc tout le littoral breton exposé) ; 650 mm → entraxe 580 mm ailleurs. Épaisseur 0,65 mm standard, 0,70 mm au-delà de 900 m d'altitude ou bacs > 10 m. Pente mini 5 % (3°).

| Élément | Règle de conversion | Conditionnement |
|---|---|---|
| Bacs zinc (entraxe 430) | nb bacs par pan = largeur pan / 0,43 arrondi sup. ; ml = nb bacs × longueur rampant ; m² zinc développé = ml × 0,50 ; kg ≈ m² dév. × 4,7 (ép. 0,65) | bobine 500 mm ou bacs profilés à longueur (max 10 à 15 m) |
| Bacs zinc (entraxe 580) | idem avec 0,58 et largeur 0,65 ; kg ≈ m² dév. × 4,7 | bobine 650 mm |
| Pattes fixes + coulissantes inox | 3 pattes/ml de joint (entraxe ≈ 33 cm, 3 premières à l'égout à 165 mm) : nb = ml de joints × 3 ; dont pattes fixes = 1 zone de 3 à 4 pattes par bac, le reste coulissantes | carton de 100 ou 250 |
| Vis ou pointes annelées de pattes | 2 par patte | boîte |
| Support voligeage 18 mm ou OSB | m² rampant × 1,05 ; lame d'air ventilée de 40 mm (60 mm si rampant > 12 m) | voir section 6 |
| Bande d'égout + ourlet (dév. 25 à 33 cm) | ml égout × 1,05 | bande 2 ou 3 m |
| Faîtage (bande à rabat ou double agrafure) | ml faîtage × 1,05 | bande |
| Rive (bande de rive + patte de rive) | ml rive × 1,05 ; pattes de rive 3/ml | bande |
| Noue (encaissée 50 mm si pente < 15 % ou surface collectée > 200 m²) | ml noue × 1,05, dév. 50 à 66 cm | bande |
| Joint de dilatation / ressaut | 1 tous les 10 à 15 m de longueur de bac selon section du bac | pièce |

**Gouttières et descentes (DTU 40.5 / 60.11)** : la section se dimensionne sur la surface de toiture collectée en projection horizontale. Règle de dimensionnement par défaut : 1 cm² de section de gouttière par m² collecté, et un tuyau de descente par tranche de 50 à 80 m².

| Élément | Règle de conversion | Conditionnement |
|---|---|---|
| Gouttière demi-ronde dév. 25 cm (zinc 0,65) | surface collectée ≤ 60 m² par descente ; ml égout / 4 arrondi sup. | longueur 4 m |
| Gouttière demi-ronde dév. 33 cm | 60 à 110 m² par descente ; ml égout / 4 | longueur 4 m |
| Gouttière nantaise, havraise, pendante carrée | selon section fabricant, même logique | 4 m |
| Crochets de gouttière | 1 tous les 50 cm (40 cm en zone 3) : ml / 0,5 + 1 par ligne | carton |
| Jonctions (soudure) | nb longueurs − 1 par ligne ; étain + décapant ≈ 15 g/jonction |  |
| Talons / fonds | 2 par ligne droite, 1 par ligne finissant en angle | pièce |
| Angles sortants / rentrants | 1 par angle de bâtiment | pièce |
| Naissances | 1 par descente | pièce |
| Descente Ø 80 (jusqu'à ≈ 70 m²) ou Ø 100 (jusqu'à ≈ 130 m²) | hauteur de façade / 2 arrondi sup. en longueurs de 2 m ; +1 coude 72° × 2 par dévoiement ; +1 dauphin ou bague de pied | longueur 2 m |
| Colliers de descente | 1 tous les 1,5 à 2 m : hauteur / 1,8 + 1 | pièce |
| Boîte à eau (chéneau) | 1 par descente en chéneau | pièce |
| Crapaudine | 1 par naissance | pièce |

**Points singuliers zinc tous types de couverture**

| Ouvrage | Règle de conversion |
|---|---|
| Abergement de cheminée (4 côtés) | périmètre cheminée × 1,3 en ml de zinc dév. 33 à 40 cm + solin ou bande porte-solin au périmètre |
| Solin contre mur (bavette + solin) | ml × 1,1 bande zinc + ml bande porte-solin ou mortier ; vis + chevilles 3/ml |
| Chéneau encaissé | ml × 1,05, dév. selon section (50 à 80 cm) ; joint de dilatation tous les 12 m |
| Bavette de fenêtre de toit | pièce fabricant (raccord d'étanchéité par modèle et par type de couverture) |
| Sortie de toit, souche VMC | 1 pièce + 1 collerette |

Exemple : pan 12 m × 7 m de rampant, zone 3 exposé → 28 bacs de 7 m = 196 ml de bac (98 m² dév., ≈ 460 kg zinc 0,65) ; joints 27 × 7 = 189 ml → 570 pattes (≈ 100 fixes, 470 coulissantes) ; voligeage 88 m² ; égout 12 m = 3 gouttières de 4 m + 25 crochets + 2 talons + 1 naissance + 1 descente Ø 80.

## 8. Bac acier et plaques (DTU 40.35)

La commande se fait en nombre de plaques à longueur, pas en m². Largeur utile courante 1,00 m (bac 1000) ou 0,90 m ; longueur à la demande jusqu'à 12 m, 1 plaque par rampant si possible (sinon recouvrement transversal 15 à 20 cm). Pente mini 7 % simple peau, 5 % sandwich.

| Élément | Règle de conversion | Conditionnement |
|---|---|---|
| Plaques bac acier simple peau (largeur utile 1,00 m) | nb = largeur pan / 1,00 arrondi sup. × nb de plaques par rampant ; longueur = rampant + 5 cm de débord | plaque à longueur |
| Panneaux sandwich (largeur utile 1,00 m) | idem | panneau |
| Plaques fibres-ciment ondulées (177 × 92 cm, utile ≈ 1,55 × 0,873) | m² / 1,35 ≈ 0,75 plaque/m² | plaque |
| Vis autoperceuses + rondelle EPDM | 6 à 8 par m² en plan carré, 10 en rive et égout ; soit m² × 7 + ml rives × 3 | boîte de 100 |
| Couturage (vis de recouvrement latéral) | 1 tous les 50 cm par recouvrement : ml de recouvrements / 0,5 | boîte |
| Faîtière bac (dév. 50 cm, long. 2 ou 3 m) | ml / 2 ou 3 arrondi sup., +1 | pièce |
| Closoirs mousse profilés (égout et faîtage) | 1 par plaque en bas, 1 par plaque en haut | pièce |
| Rive (bande de rive crantée) | ml rive / 2 arrondi sup. | pièce 2 m |
| Bande d'égout | ml égout / 2 ou 3 | pièce |
| Régulateur de condensation (feutre anti-condensation) | option intégrée au bac, m² × 1 |  |
| Pannes de support (acier ou bois) | entraxe 1,5 à 2 m selon portée du bac : ml = m² / entraxe | ml |

## 9. Étanchéité toitures-terrasses (DTU 43.1, 43.3, 43.4, 43.5)

Ici la surface est presque l'unité, mais la commande se fait en rouleaux, panneaux, seaux et kg, et les relevés (en ml × hauteur) pèsent souvent 20 à 30 % du total. Chaque couche est une ligne distincte. Support : béton (43.1), bac acier (43.3), bois (43.4), réfection (43.5).

**Partie courante**

| Couche | Règle de conversion | Conditionnement |
|---|---|---|
| Primaire d'imprégnation (EIF) | 0,25 à 0,30 kg/m² sur béton : m² × 0,3 / contenance | seau 10 ou 25 kg |
| Pare-vapeur bitume (rouleau 1 × 10 m) ou feuille alu/PE | m² × 1,12 / 10 arrondi sup. | rouleau |
| Isolant PIR / PUR / laine de roche / verre cellulaire | m² × 1,03 / surface panneau (1,20 × 0,60 = 0,72 m² ou 1,20 × 1,00 = 1,2 m²), arrondi sup. | panneau, palette |
| Fixations mécaniques d'isolant (sur bac acier) | 4 à 6 par m² en plan carré, 8 à 10 en rive et angle | boîte |
| Colle à froid pour isolant | 0,3 à 0,5 kg/m² | seau |
| Bicouche bitume SBS, 1ère couche (rouleau 1 × 10 m, recouvrement 6 cm) | m² × 1,10 / 10 arrondi sup. | rouleau |
| Bicouche, 2e couche autoprotégée ardoisée (rouleau 1 × 8 m, recouvrement 8 cm) | m² × 1,13 / 8 arrondi sup. | rouleau |
| Monocouche bitume (rouleau 1 × 7 ou 8 m) | m² × 1,13 / longueur rouleau | rouleau |
| Membrane PVC / TPO (rouleau 1,5 à 2 × 15 à 20 m) | m² × 1,10 / surface rouleau ; + fixations 3 à 5/m² ou tôle colaminée en périphérie | rouleau |
| EPDM (feuilles jusqu'à 15 × 30 m) | m² × 1,10 ; colle de surface 0,3 à 0,4 kg/m² ; colle de joint 0,05 kg/ml de recouvrement | feuille sur mesure, seau |
| Système d'étanchéité liquide (SEL, résine PU ou PMMA) | consommation du DTA, typiquement 2 à 3 kg/m² en 2 couches + armature voile de verre m² × 1,1 | seau 10/25 kg |
| Protection lourde gravillons (terrasse inaccessible) | 4 cm d'épaisseur ≈ 65 kg/m² → tonnes = m² × 0,065 | big bag 1 t, vrac |
| Dalles sur plots (accessible) | m² × 1,03 / surface dalle (0,25 m² pour 50 × 50) ; plots = (nb dalles + nb dalles en périphérie) × 1,2 | dalle, plot |
| Feutre de séparation / drainant | m² × 1,10 | rouleau |
| Bouteilles de gaz propane (soudage bicouche) | 1 bouteille 13 kg pour ≈ 60 à 80 m² de bicouche | bouteille |

**Relevés et points singuliers**

| Ouvrage | Règle de conversion | Conditionnement |
|---|---|---|
| Relevé d'étanchéité (hauteur mini 15 cm au-dessus de la protection, 10 cm en bac acier) | surface = ml relevé × (hauteur + 0,15 m de retour) ; en bandes de 25 à 33 cm : ml × 1,1 par couche (équerre de renfort + 2 couches = 3 lignes) | rouleau 1 m découpé en lés ou bandes préfabriquées |
| Bande solin / couvre-joint aluminium + mastic | ml relevé × 1,05 ; mastic 1 cartouche / 8 ml ; chevilles 4/ml | barre 2 ou 3 m |
| Becquet / engravure | ml relevé |  |
| Évacuation d'eaux pluviales (EEP) : naissance + platine + moignon | mini 2 par terrasse ; 1 par 100 à 150 m² ; Ø 80 ≤ 70 m², Ø 100 ≤ 130 m², Ø 125 au-delà | pièce |
| Trop-plein | 1 par EEP (obligatoire) | pièce |
| Crapaudine / garde-grève | 1 par EEP | pièce |
| Costière métallique (lanterneau, désenfumage) | périmètre × hauteur en bande + 1 raccord par angle | pièce |
| Passage de pénétration (tuyau, ventilation) | 1 manchon ou platine par traversée, Ø adapté | pièce |
| Couvertine / bavette d'acrotère (alu ou zinc) | ml acrotère × 1,05 ; éclisses 1 par jonction ; fixations 3/ml | barre 2 ou 3 m |
| Joint de dilatation | ml × 1,1 en bande double + profilé |  |
| Bande d'arrêt gravillons / arrêt de dalle | ml égout de la zone protégée |  |

**Exemple** : terrasse béton 150 m², acrotères 50 ml hauteur de relevé 30 cm, 2 EEP → EIF 2 seaux de 25 kg ; pare-vapeur 17 rouleaux ; isolant PIR 120 mm 1,2 × 0,6 : 215 panneaux ; 1ère couche 17 rouleaux ; 2e couche 22 rouleaux ; relevés 50 × 0,45 = 22,5 m² × 3 lignes → 8 rouleaux de bande 33 cm ; bande solin 18 barres de 3 m + 7 cartouches ; 2 naissances Ø 100 + 2 trop-pleins + 2 crapaudines ; gaz 3 bouteilles.

## 10. Dépose, moyens et consommables

Un devis de couverture inclut toujours des lignes qui ne sont pas des matériaux de couverture. L'app doit les proposer par défaut et les quantifier à partir des mêmes données (surface, périmètre, hauteur).

| Poste | Règle de conversion | Unité |
|---|---|---|
| Dépose ardoises (poids ≈ 25 à 30 kg/m²) | tonnes = m² × 0,028 ; bennes 8 m³ : 1 pour ≈ 110 m² | tonne, benne |
| Dépose tuiles terre cuite (≈ 40 à 45 kg/m²) | tonnes = m² × 0,043 ; benne 8 m³ : 1 pour ≈ 80 m² | tonne, benne |
| Dépose tuiles béton (≈ 45 à 50 kg/m²) | tonnes = m² × 0,048 | tonne |
| Dépose liteaux + voliges (bois) | benne bois 15 m³ : 1 pour ≈ 150 m² | benne |
| Dépose fibro-ciment amianté | m² → sacs big-bag amiante 1 m³ pour ≈ 25 m² + filière SS4 (ne jamais quantifier sans plan de retrait) | m², sac |
| Dépose étanchéité bitume (≈ 10 à 12 kg/m²) | tonnes = m² × 0,011 | tonne |
| Échafaudage de pied | ml façade × hauteur ; location à la semaine ; + 1 console de rive par tranche de 2 m | m², semaine |
| Filet de sécurité / ligne de vie provisoire | ml égout | ml |
| Monte-matériaux / grue | forfait journée : 1 jour par 100 m² de tuiles ou ardoises livrées | jour |
| Bâchage provisoire | m² découvert × 1,3 | m² |
| Pointes, vis, étain, décapant, mastic, silicone | forfait = 1,5 à 2 % du montant matériaux | forfait |
| Mortier de solin / scellement faîtage (si non à sec) | 1 sac 25 kg pour 4 à 5 ml de faîtage ; sable 0,02 m³/ml | sac |
| Traitement charpente (si demandé) | m² de bois ≈ m² rampant × 1,3 ; produit 0,3 l/m² | litre |

Main-d'œuvre indicative (pour le temps, pas pour les matériaux) : ardoise 1,2 à 1,8 h/m² pose seule, tuile grand moule 0,5 à 0,8 h/m², joint debout 1,5 à 2 h/m², bicouche 0,4 à 0,6 h/m², dépose 0,3 à 0,5 h/m². Ces ratios sont à faire valider par l'artisan.

## 11. Fenêtres de toit, lucarnes, chiens-assis

Une fenêtre de toit se commande en kit : la fenêtre, son raccord d'étanchéité adapté à la couverture, et les accessoires de pose. Chaque fenêtre déclenche en plus du bois de chevêtre et une petite surcoupe de couverture.

| Élément | Règle de conversion | Unité |
|---|---|---|
| Fenêtre de toit (dimensions nominales ex. 78×98, 78×118, 114×118) | 1 par ouverture | pièce |
| Raccord d'étanchéité | 1 par fenêtre : type tuile (ondulée, pureau > 45 mm), ardoise ou matériau plat (< 45 mm), encastré ; fenêtres jumelées : raccord combiné 1 par groupe | pièce |
| Kit d'isolation périphérique + collerette pare-vapeur | 1 de chaque par fenêtre | pièce |
| Chevêtre (chevrons de renfort + linteau haut et bas) | ml bois = 2 × (hauteur + 0,30) + 2 × (largeur + 0,30) ; section = celle des chevrons ; 4 sabots ou équerres | ml, pièce |
| Liteaux / voliges de contour | 4 ml par fenêtre | ml |
| Gouttière de drainage d'écran (pliée au-dessus) | 1 par fenêtre, incluse dans certains raccords | pièce |
| Surcoupe de couverture (ardoises ou tuiles coupées) | +0,5 m² de couverture en perte par fenêtre | selon matériau |
| Store, volet roulant, motorisation | option 1 par fenêtre | pièce |
| Exutoire de désenfumage / lanterneau (terrasse) | 1 pièce + costière 1 pièce + raccord étanchéité périmètre × hauteur | pièce |

**Lucarne ou chien-assis** (réfection de l'existant) : trois sous-ouvrages à quantifier séparément.

| Sous-ouvrage | Règle de conversion |
|---|---|
| Couverture de la lucarne (toit à 1 ou 2 pans) | surface rampante propre, même règle que le pan principal (ardoises ou tuiles au m²) |
| Jouées (côtés) habillées en ardoise ou zinc | surface = 2 × (hauteur moyenne × profondeur) ; en ardoise : ardoises/m² de la section 3 avec pureau du toit + 10 % de coupes ; en zinc : m² dév. × 1,2 |
| Noues de raccord | 2 noues × longueur de la jouée en zinc (section 7) ou noues en ardoises (section 3) |
| Fronton et bavette | ml fronton × 1,1 en bande zinc ou planche + bavette plomb ou zinc |
| Faîtage de lucarne | ml faîtage lucarne (section 3 ou 5) |
| Jonction avec le pan principal (abergement en haut de lucarne) | ml largeur lucarne × 1,2 en zinc dév. 33 cm |
| Châssis / fenêtre verticale | 1 pièce |

## 12. Plomb, cuivre, autres couvertures métalliques

Le plomb se commande au kg ou en rouleaux (bandes de largeur 20 à 100 cm, longueur 3 à 6 m) ; le cuivre comme le zinc, en bobines ou bacs. Le poids est l'unité qui compte chez le fournisseur.

| Élément | Règle de conversion | Unité |
|---|---|---|
| Plomb en feuille (épaisseur 1,5 / 2 / 2,5 mm = 17 / 22,7 / 28,4 kg/m²) | m² développé × 1,15 × masse surfacique | kg, rouleau |
| Abergement de cheminée en plomb | périmètre × 0,40 m de dév. × 1,2 = m² → kg ; plomb 2 mm courant | kg |
| Bavettes et solins plomb (bande 20 à 33 cm) | ml × 1,1 × largeur = m² → kg ; bande porte-solin 1/ml ; chevilles 4/ml | kg, ml |
| Noquets plomb (ardoise contre mur) | 1 noquet par rang : ml / pureau, chaque noquet ≈ 0,05 m² de plomb 1,5 mm | pièce → kg |
| Pattes et agrafes cuivre pour plomb | 3 par ml de bande | pièce |
| Cuivre en bande (0,6 mm = 5,4 kg/m²) ou bac joint debout | mêmes règles que le zinc (section 7) ; kg = m² dév. × 5,4 | bobine, kg |
| Aluminium laqué (bandes de rive, couvertines) | ml × 1,05, barres 2 ou 3 m, éclisses 1 par jonction | barre |
| Acier inox / zinc pré-patiné | idem zinc |  |

Compatibilité à vérifier par l'app : jamais de cuivre en amont du zinc ou de l'acier galvanisé (corrosion galvanique), plomb protégé contre les bois tanniques (chêne, châtaignier) par un feutre.

## 13. Bardeaux bitumés, toitures végétalisées, autres

| Élément | Règle de conversion | Unité |
|---|---|---|
| Bardeaux bitumés (shingle), paquet ≈ 3 m² posés, pente mini 20 % | m² × 1,10 / 3 arrondi sup. | paquet |
| Clous à bardeau | 4 par bardeau ≈ 25 à 30/m² ≈ 0,12 kg/m² | kg, boîte |
| Sous-couche feutre bitumé (rouleau 1 × 20 m) | m² × 1,15 / 20 | rouleau |
| Bande de départ d'égout | ml égout / 10 (rouleau 10 m) | rouleau |
| Faîtage et arêtiers en bardeaux découpés | ml / 0,30 × 1 bardeau ≈ 1 paquet par 9 ml | paquet |
| Bande de rive alu | ml rive × 1,05 | barre |
| Support panneau OSB 18 mm | m² × 1,05 / 3,125 | panneau |
| Toiture végétalisée extensive sur étanchéité anti-racines | couche par couche ci-dessous |  |
| Membrane anti-racines (si l'étanchéité ne l'est pas) | m² × 1,10 | rouleau |
| Couche drainante (plaques alvéolaires 1 × 2 m) | m² × 1,05 / 2 | plaque |
| Feutre filtrant | m² × 1,15 | rouleau |
| Substrat (8 à 12 cm) | m³ = m² × épaisseur ; ≈ 1 t/m³ sec, 1,3 t saturé | big bag 1 m³, vrac |
| Végétalisation : tapis de sedum précultivé ou godets | tapis m² × 1,05 ; godets 16 à 20/m² ; semis 1 kg/50 m² | m², godet |
| Bande stérile gravillons en périphérie et autour des EEP (50 cm) | ml périphérie × 0,5 × 0,05 m = m³ → t × 1,6 | tonne |
| Bordure de séparation alu perforée | ml périphérie × 1,05 | barre |
| Tuiles de verre / ardoises translucides | 1 pièce par m² éclairé demandé, même format que la couverture | pièce |
| Chaume (roseau) | ≈ 1 botte / 0,1 m² ; épaisseur 30 cm ; fil inox 0,3 kg/m² ; hors scope d'un couvreur généraliste, prévoir sous-traitance | botte |
| Lauze, schiste épais | ≈ 100 à 150 kg/m², quantité au m² selon carrière, sous-traitance | tonne |

## 14. Sécurité définitive et accès

Obligatoire sur toute toiture où une intervention ultérieure est prévue (entretien, panneaux solaires, ramonage). Se quantifie à partir du faîtage, de la surface et du nombre de souches.

| Élément | Règle de conversion | Unité |
|---|---|---|
| Crochets de sécurité (NF EN 517, type B) | 1 tous les 3 m de faîtage + 1 par souche de cheminée + 1 par fenêtre de toit ; fixés sur chevron | pièce |
| Crochets de service / de couvreur (échelle) | 1 par rampant tous les 6 m d'égout | pièce |
| Ligne de vie câble inox (NF EN 795 C) | ancrages : 1 tous les 10 m + 2 d'extrémité + 1 par changement de direction ; câble ml × 1,10 ; 1 tendeur et 1 absorbeur par ligne | pièce, ml |
| Points d'ancrage ponctuels (NF EN 795 A) | 1 par zone de travail de 20 m² | pièce |
| Échelle de toit fixe / passerelle | ml rampant ou ml de cheminement + consoles 1 tous les 2 m | ml |
| Garde-corps d'acrotère (terrasse non accessible) | ml périphérie × 1,05 ; potelets tous les 1,5 m | ml |
| Filet ou chemin de circulation sur bac acier | ml de cheminement | ml |

## 15. Gouttières PVC et aluminium

Même logique de dimensionnement que le zinc (section 7 : 1 cm² de section par m² collecté, descente par 50 à 80 m²). Diffèrent par les longueurs et le mode d'assemblage.

| Élément | Règle de conversion | Unité |
|---|---|---|
| Gouttière PVC demi-ronde 25 ou 33 (longueur 4 m) | ml égout / 4 arrondi sup. | longueur |
| Jonctions PVC à joint ou à coller | nb longueurs − 1 par ligne ; colle PVC 1 pot / 20 jonctions | pièce |
| Joints de dilatation PVC | 1 tous les 12 m de ligne droite | pièce |
| Crochets PVC ou acier | 1 tous les 50 cm (40 cm en zone 3) + 1 par extrémité | pièce |
| Talons, angles, naissances PVC | comme en zinc : 2 talons par ligne droite, 1 angle par angle, 1 naissance par descente | pièce |
| Descente PVC Ø 80 ou 100 (longueur 2,8 ou 4 m) | hauteur / longueur arrondi sup. ; coudes 67° 2 par dévoiement ; colliers tous les 2 m ; manchon de dilatation 1 par descente | longueur, pièce |
| Gouttière aluminium laqué (longueurs 4 à 6 m, ou continue posée à la profileuse) | ml égout / 4 (ou ml exact si continue) ; crochets tous les 50 cm ; jonctions collées 1 par raccord | ml |
| Dauphin fonte ou acier (pied de descente) | 1 par descente, 1 m | pièce |
| Récupérateur d'eau de pluie + collecteur | 1 collecteur par descente équipée | pièce |

## 16. Isolation des combles (vendue avec la réfection)

Trois cas : combles perdus (soufflage ou rouleaux au sol), rampants par l'intérieur (entre et sous chevrons), sarking par l'extérieur (section 6). Le R visé pilote l'épaisseur.

| Élément | Règle de conversion | Unité |
|---|---|---|
| Laine soufflée (verre ou roche) en combles perdus | kg = m² × épaisseur (m) × masse volumique (10 à 25 kg/m³ selon produit) ; R 7 ≈ 30 à 35 cm ; sacs de 15 à 20 kg | sac |
| Rouleaux en combles perdus (2 couches croisées) | m² × 1,05 / surface rouleau (ex. 1,20 × 5 = 6 m²) par couche | rouleau |
| Rouleaux ou panneaux entre chevrons | m² rampant × 0,85 (largeur utile entre chevrons) / surface rouleau, largeur = entraxe − 1 cm | rouleau |
| 2e couche sous chevrons | m² rampant × 1,05 / surface rouleau | rouleau |
| Pare-vapeur (membrane hygro-régulante) | m² × 1,15 / surface rouleau (ex. 1,5 × 40 = 60 m²) ; adhésif 1 rouleau 25 m par 25 m² ; mastic d'étanchéité périphérique 1 cartouche / 8 ml | rouleau |
| Suspentes et fourrures (plafond rampant) | suspentes 2,5/m² ; fourrures 2 ml/m² ; éclisses 1 par 3 m de fourrure | pièce, ml |
| Plaques de plâtre BA13 (1,20 × 2,50 = 3 m²) | m² × 1,10 / 3 arrondi sup. ; vis 15/m² ; bande à joint 2 ml/m² ; enduit 0,4 kg/m² | plaque |
| Déflecteurs de ventilation à l'égout (combles perdus) | 1 par entre-chevrons à l'égout : ml égout / entraxe | pièce |
| Trappe de combles isolée | 1 pièce | pièce |
| Rehausse de trappe, boîtier spots protégés, caisson VMC | 1 par élément | pièce |
| Pare-pluie / écran HPV si inexistant (par l'intérieur) | m² rampant × 1,15 | rouleau |

## 17. Bardage, habillages de rive et façade

| Élément | Règle de conversion | Unité |
|---|---|---|
| Planche de rive / bandeau PVC cellulaire ou alu (profils 2 à 6 m) | ml égout + ml rives × 1,05 ; angles 1 par coin ; éclisses 1 par jonction ; vis inox 4/ml | ml, pièce |
| Sous-face de débord de toit (lambris PVC, bois, planches) | m² = ml × largeur de débord × 1,10 ; profils de départ et de finition ml × 1,05 ; grille de ventilation 1 pour 4 ml | m², ml |
| Bardage ardoise en façade (pose au clou, pureau +) | m² façade × ardoises/m² (section 3, recouvrement 60 à 80 mm car vertical) + 10 % ; voligeage ou liteaux idem | ardoise |
| Bardage bois (lames à clin ou à claire-voie) | ml lames = m² / largeur utile (ex. 0,12 m) × 1,10 ; tasseaux verticaux 2 ml/m² (entraxe 50 cm) ; pare-pluie m² × 1,15 ; vis inox 25/m² | ml, m² |
| Bardage fibres-ciment ou composite | m² × 1,10 / surface lame ou panneau ; ossature 2,5 ml/m² ; fixations fabricant | lame, panneau |
| Grille anti-rongeurs en pied de bardage | ml pied de façade | ml |
| Angles, bavettes de fenêtre, couvre-joints | ml × 1,05 | barre |

## 18. Désamiantage (fibres-ciment amiante, bitume amianté)

Un couvreur sans certification SS3 ne retire pas lui-même une couverture amiantée : il sous-traite ou fait certifier l'entreprise. L'app doit produire un poste « diagnostic + retrait » chiffré par un tiers, pas un quantitatif matériaux. Elle quantifie uniquement ce qui est mesurable.

| Élément | Règle de conversion | Unité |
|---|---|---|
| Repérage amiante avant travaux (RAT, obligatoire avant 1997) | 1 diagnostic + prélèvements : 1 par matériau suspect | forfait |
| Plan de retrait et déclaration | 1 forfait ; délai 1 mois avant chantier | forfait |
| Plaques fibres-ciment amiante (≈ 15 kg/m²) | tonnes = m² × 0,015 ; conditionnement en housses ou palettes filmées : 1 palette / 40 m² | tonne, palette |
| Big bags amiante (1 m³) pour débris et EPI | 1 pour 25 m² + 1 pour les déchets d'équipement | sac |
| Évacuation en ISDD/ISDND avec BSDA | tonnes ci-dessus × tarif filière | tonne |
| EPI jetables, masques, sas, film de confinement | forfait par jour d'intervention : jours = m² / 60 | jour |
| Mesures d'empoussièrement (META) | 2 à 3 par chantier | forfait |

Si la couverture amiantée est en bon état, proposer l'alternative recouvrement (sur-toiture bac acier sur pannes rapportées, section 8) plutôt que le retrait : c'est souvent moins cher et admis sous conditions.

## 19. Modèle de données pour l'app

Le référentiel se code en trois objets : `Materiau` (ce qu'on commande), `Regle` (comment on le calcule) et `Ouvrage` (ce que l'artisan décrit). Un ouvrage déclenche plusieurs règles, chaque règle produit une ligne de quantitatif dans l'unité de commande du matériau.

```json
{
  "materiaux": [
    {
      "id": "ardoise_32x22_cupa_h7",
      "libelle": "Ardoise naturelle 32x22 CUPA H7",
      "famille": "ardoise_naturelle",
      "unite_commande": "unite",
      "conditionnements": [{"libelle": "palette", "quantite": 500}, {"libelle": "carton", "quantite": 50}],
      "params": {"hauteur_mm": 320, "largeur_mm": 220, "poids_kg": 0.6},
      "dtu": "40.11"
    },
    {
      "id": "liteau_18x40",
      "libelle": "Liteau sapin 18x40 traité",
      "famille": "bois_support",
      "unite_commande": "ml",
      "conditionnements": [{"libelle": "botte", "quantite": 50}],
      "dtu": "40.11"
    }
  ],
  "regles": [
    {
      "id": "ardoise_double_recouvrement",
      "declencheur": {"ouvrage": "couverture_ardoise", "mesure": "surface_rampante_m2"},
      "entrees": ["pente_deg", "zone_climatique", "longueur_rampant_m", "complexite"],
      "etapes": [
        "R = table_recouvrement(pente_deg, zone_climatique)",
        "if longueur_rampant_m > 5.5: R += 10",
        "if longueur_rampant_m > 8: R += 5 * ceil(longueur_rampant_m - 8)",
        "R = arrondi_sup(R, 5)",
        "pureau = (hauteur_mm - R) / 2",
        "ardoises_m2 = 1e6 / (largeur_mm * pureau)",
        "q_theorique = surface_rampante_m2 * ardoises_m2",
        "perte = 0.05 if complexite == 'simple' else 0.09",
        "q_commande = arrondi_conditionnement(q_theorique * (1 + perte))"
      ],
      "sorties": [
        {"materiau": "ardoise_*", "quantite": "q_commande", "unite": "unite"},
        {"materiau": "crochet_inox_*", "quantite": "q_theorique * 1.02", "unite": "unite", "param": "longueur_crochet = pureau + 15"},
        {"materiau": "liteau_*", "quantite": "surface_rampante_m2 * 1000 / pureau * 1.05", "unite": "ml"}
      ],
      "hypotheses_a_afficher": ["R", "pureau", "ardoises_m2", "perte"]
    }
  ],
  "ouvrages": [
    {
      "id": "couverture_ardoise",
      "mesures_requises": ["surface_rampante_m2", "pente_deg", "longueur_rampant_m"],
      "mesures_optionnelles": ["ml_egout", "ml_faitage", "ml_aretier", "ml_noue", "ml_rive", "entraxe_chevrons_m"],
      "regles": ["ardoise_double_recouvrement", "ecran_sous_toiture", "contre_liteaux", "doublis_egout", "faitage_zinc", "aretier_ardoise_biaise", "noue_zinc", "rive_tranchis", "chatieres"],
      "defauts": {"zone_climatique": "depuis_code_postal", "entraxe_chevrons_m": 0.6, "complexite": "simple"}
    }
  ]
}
```

**Sortie attendue pour chaque ligne de devis** : matériau, quantité théorique, perte appliquée, quantité commandée, conditionnement, hypothèses utilisées (recouvrement, pureau, entraxe), source DTU. L'artisan voit les hypothèses et peut les modifier ; la quantité se recalcule.

**Table zone climatique par département** (à coder, DTU 40.11 / 40.21) : zone 3 = façade atlantique et Manche (22, 29, 56, 35 littoral, 50, 14, 76, 62, 59, 17, 33, 40, 64), Corse, Alpes/Pyrénées > 500 m ; zone 2 = bande 20 à 40 km de côte et 200 à 500 m d'altitude ; zone 1 = le reste. Le site (protégé/normal/exposé) reste une saisie artisan, défaut « normal ».

## 20. Prompt d'intégration pour Claude Code

Exporte ce document en Markdown, place-le dans le repo sous `docs/referentiel-couverture.md`, référence-le dans `CLAUDE.md`, puis lance le prompt ci-dessous.

```markdown
# Contexte
Lis intégralement docs/referentiel-couverture.md avant toute modification. C'est le référentiel métier couverture-étanchéité de Rappidos. Il fait foi sur les unités, les formules et les ratios.

# Problème à corriger
Le quantitatif actuel ressort les matériaux dans l'unité de l'ouvrage (m² d'ardoise, m² de liteaux). C'est inexploitable : un artisan commande des ardoises à l'unité, des liteaux au ml, des pattes au carton, des membranes au rouleau. Il manque une couche de conversion métier entre le métré et la commande fournisseur.

# Travail demandé
1. Crée un module `quantitatif/` isolé du reste (pas de dépendance à l'IA de saisie vocale) avec trois entités : Materiau, Regle, Ouvrage, selon le schéma JSON de la section 19 du référentiel.
2. Implémente les règles des sections 3 à 18 comme fonctions pures et testables, une par règle, avec les formules exactes (pureau, recouvrement, nombre au m², accessoires au ml, conditionnement). Les tables (recouvrement ardoise par pente et zone, coefficients de pente, formats, pertes) sont des fichiers de données JSON/YAML, jamais des constantes dans le code.
3. Chaque règle retourne : materiau_id, quantite_theorique, perte, quantite_commande, unite_commande, conditionnement, hypotheses (dictionnaire lisible), source_dtu.
4. Le moteur reçoit un Ouvrage avec ses mesures (surface rampante OU surface au sol + pente, linéaires, pente, zone, longueur rampant, entraxe chevrons) et renvoie la liste complète des lignes, y compris support, sous-toiture, accessoires, fixations et consommables. Si une mesure requise manque, il renvoie une question précise à poser à l'artisan, jamais une quantité devinée.
5. Toute hypothèse par défaut (zone depuis le code postal, entraxe 0,60 m, site normal, complexité simple) est tracée et surchargeable par l'artisan dans l'UI ; une modification recalcule la ligne.
6. L'unité affichée dans le devis est toujours l'unité de commande du matériau. Interdiction d'afficher un m² ou un ml pour un matériau vendu à l'unité ou au rouleau.
7. Écris les tests sur les trois exemples chiffrés du référentiel (ardoise 32×22 200 m² section 3, Double Romane 120 m² section 5, terrasse bicouche 150 m² section 9) et sur l'exemple joint debout section 7. Les résultats doivent correspondre à ±2 %.
8. Ajoute un endpoint ou une commande qui exporte le quantitatif au format bon de commande fournisseur (matériau, référence, quantité, conditionnement, nombre de colis).

# Contraintes
- Ne touche pas au module de reconnaissance vocale ni à la génération de devis existante tant que le moteur n'est pas testé.
- Chaque ratio hors référentiel que tu serais tenté d'ajouter doit être signalé dans un fichier docs/ratios-a-valider.md avec sa source, pas inséré silencieusement.
- Commence par me présenter le plan de fichiers et la liste des règles que tu vas implémenter, puis attends ma validation avant de coder.
```

Suite logique après validation : étendre le même moteur aux autres métiers (charpente, maçonnerie, plaquiste, électricité, plomberie) en réutilisant exactement la structure Materiau / Regle / Ouvrage. Chaque métier ne demandera qu'un nouveau fichier de données et ses règles, pas une nouvelle architecture.

## 21. Spécification UX — parcours conversationnel (application mobile)

**Principe.** Le moteur de règles (sections 1-19) reste invisible. L'artisan ne voit qu'un chat. L'IA lit tout ce qu'elle peut dans le devis et ne pose que les questions dont le moteur a réellement besoin. Design propre à la marque Rappidos : logique et repères proches de Claude / ChatGPT / Gemini, pas une copie visuelle.

### 21.1 Parcours en 4 écrans

1. **Nouveau chantier** — un seul bouton principal : « Déposer mon devis ». Aucun formulaire préalable.
2. **Dépôt du devis** — PDF (ou photo) du devis. L'IA extrait automatiquement : nom du client, adresse si présente, lignes d'ouvrage, surfaces, matériaux, formats. Le chantier est créé et nommé avec le nom du client détecté (modifiable en un tap). Ne jamais demander une information déjà lisible dans le devis.
3. **Chat** — interface conversationnelle plein écran : barre de saisie en bas, bouton micro avec transcription vocale en temps réel, envoi au relâchement. Pendant le calcul, afficher les étapes de réflexion en cours, une ligne chacune, type : « Lecture du devis… », « 3 ouvrages détectés », « Calcul ardoises 32×22 zone 3… », « Vérification DTU 40.11 ». L'IA pose ses questions (21.2), puis génère le quantitatif.
4. **Quantitatif** — carte de résultat affichée dans le chat (21.3) avec boutons : « Envoyer au fournisseur » (flux existant), « Exporter PDF », « Modifier ». Les corrections se font dans le même chat, à la voix ou au clavier : « mets 10 % de perte », « enlève les crochets, j'en ai en stock », « ajoute 2 chatières ». Chaque correction régénère la carte sans repartir de zéro.

### 21.2 Règles des questions

- Maximum 3 à 4 questions par devis, une seule à la fois.
- Une ligne par question, pas de paragraphe, pas de justification. Exemple : « Pente du toit ? » et non « Afin de calculer correctement le recouvrement, pourriez-vous m'indiquer la pente ».
- Toujours proposer une valeur par défaut validable en un tap (boutons de réponse rapide) : « Pente ? [35°] [45°] [autre] ». La valeur par défaut vient de la section 19 (`hypotheses_a_afficher`) et de la zone climatique du département.
- Ne poser une question que si le moteur ne peut pas calculer sans elle (`mesures_requises` manquantes dans la Regle). Les `mesures_optionnelles` sont prises par défaut et signalées dans la carte, jamais demandées.
- Ordre de priorité des questions, par ouvrage :
    - **Couverture ardoise / tuile** : 1) pente, 2) longueur de rampant, 3) linéaires faîtage / arêtiers / noues / rives (proposer une estimation à partir de la surface, à valider), 4) entraxe chevrons si contre-liteaux ou volige.
    - **Zinc joint debout** : 1) longueur de rampant, 2) largeur de pan, 3) exposition (abrité / exposé).
    - **Gouttières / descentes** : 1) linéaire, 2) nombre d'angles, 3) nombre de descentes et hauteur.
    - **Étanchéité terrasse** : 1) hauteur de relevé, 2) périmètre, 3) nombre d'EEP, 4) isolant oui/non et épaisseur.
    - **Fenêtre de toit** : 1) dimensions / référence, 2) type de couverture pour le raccord.
- Si l'artisan répond « je sais pas », appliquer la valeur par défaut, le dire en une ligne, continuer.
- Jamais de question sur le nom du client, l'adresse ou le matériau si le devis les contient.

### 21.3 Carte quantitatif

- Une ligne par matériau : libellé, quantité commandée, unité de commande, conditionnement (ex. « Ardoises 32×22 — 9 500 u — 19 palettes de 500 »).
- Regroupement par ouvrage (Couverture, Zinguerie, Support, Étanchéité, Sécurité, Consommables).
- Sous chaque groupe, une ligne discrète « Hypothèses : zone 3, pente 45°, perte 5 % » dépliable ; chaque hypothèse modifiable par un message dans le chat.
- Quantité théorique et perte visibles au dépliage, pas en vue principale.
- Boutons en bas de carte : Envoyer au fournisseur · Exporter PDF · Modifier.
- Le PDF reprend exactement la carte (bon de commande, seul document où un champ manuel est admis : date de livraison souhaitée).

### 21.4 Comportement de l'IA dans le chat

- Ton : direct, phrases courtes, vocabulaire de chantier, tutoiement par défaut (paramétrable).
- Jamais de pavé. Un message d'IA = une question, une confirmation ou une carte.
- Après génération : un seul message « Quantitatif prêt. Tu veux modifier quelque chose ? » puis la carte.
- Toute modification demandée est confirmée en une ligne (« OK, perte passée à 10 % ») et la carte est mise à jour.
- Si une demande sort du périmètre du référentiel (matériau inconnu), l'IA le dit en une ligne, propose une saisie manuelle de la quantité et l'inscrit dans `docs/ratios-a-valider.md`.

### 21.5 Consignes pour Claude Code

- Le chat est une couche fine au-dessus du module `quantitatif/` : il collecte les `mesures_requises`, appelle les fonctions pures, affiche la sortie. Aucune règle métier dans le code du chat.
- Les questions sont générées depuis les schémas Regle / Ouvrage (section 19), pas codées en dur.
- Les étapes de réflexion affichées correspondent aux vraies étapes du moteur (extraction, détection d'ouvrages, règles exécutées, vérifications).
- Réutiliser les écrans et le flux existants pour l'envoi au fournisseur ; ne pas les réécrire.
- Prévoir la transcription vocale côté app et un fallback clavier.
- Tests : pour chaque exemple des sections 3, 5, 7 et 9, simuler le dialogue (devis → questions → réponses par défaut) et vérifier que la carte sort les mêmes quantités (±2 %).

## 22. Mandat donné à Claude Code — architecture solide et liberté de refonte

**Objectif.** Une application parfaite pour l'artisan, pas une application conforme à ce document. Ce référentiel est la source métier ; l'architecture et l'existant ne sont pas sacrés.

### 22.1 Liberté de revoir l'existant

- Tu as mandat pour remettre en question tout ce qui a été mis en place dans l'app (écrans, modèle de données, flux de création de chantier, module quantitatif actuel) si cela permet un produit plus simple, plus fiable ou plus facile à étendre.
- Avant toute refonte : présenter en quelques lignes ce que tu proposes de changer, pourquoi, et ce que ça casse. Attendre validation. Ensuite, exécuter sans demi-mesure.
- Ce qui ne doit pas changer : les règles métier déjà testées (sections 3 à 18) et le flux d'envoi au fournisseur, sauf si tu identifies une erreur, auquel cas tu la signales.
- Si une partie de ce document te semble contradictoire, incomplète ou mal pensée, dis-le au lieu de l'appliquer tel quel.

### 22.2 Architecture multi-métiers dès maintenant

D'autres métiers arriveront (maçon, charpentier, plaquiste, électricien, plombier, carreleur, peintre…). Construire pour ça dès le premier métier :

- **Un métier = un paquet de données, zéro code spécifique.** Un dossier `referentiels/<metier>/` contenant ses `materiaux.json`, `regles.json`, `ouvrages.json` et sa doc Markdown. Ajouter un métier = ajouter un dossier, pas toucher au moteur.
- **Moteur générique.** Le module `quantitatif/` exécute des Regle décrites en données (entrées, étapes, sorties) ; il ne connaît ni l'ardoise ni le zinc. Les formules sont exprimées dans un petit langage d'expressions évaluable et testable, pas en fonctions TypeScript nommées par matériau.
- **Détection d'ouvrages par métier.** L'extraction du devis identifie le métier (ou plusieurs) et les ouvrages à partir des `declencheurs` de chaque référentiel. Un devis mixte (couverture + charpente) doit fonctionner le jour où les deux référentiels existent.
- **Questions, hypothèses, carte, PDF : tout dérive des schémas.** Rien de spécifique à la couverture dans l'UI.
- **Ratios surchargeables à trois niveaux** : référentiel par défaut → réglages de l'artisan (ses pertes, ses fournisseurs, ses conditionnements) → chantier en cours.
- **Versionner les référentiels.** Chaque quantitatif enregistre la version du référentiel utilisée, pour pouvoir expliquer un résultat passé après une mise à jour des ratios.
- **Tests par référentiel.** Chaque dossier métier embarque ses cas de test (devis d'exemple → quantitatif attendu). Le moteur a ses propres tests indépendants du métier.

### 22.3 Critères de qualité

- Simplicité pour l'artisan avant tout : si un écran ou une étape peut disparaître, il disparaît.
- Chaque quantité affichée doit être explicable en une phrase (formule, hypothèses, source).
- Zéro valeur magique dans le code : tout ratio vit dans un fichier de données avec sa source.
- Performance : le quantitatif d'un devis courant doit sortir en quelques secondes, les étapes de réflexion affichées en temps réel.

### 22.4 Première action attendue

Lire tout le document, puis proposer un plan d'architecture en une page : structure des dossiers, modèle du moteur générique, ce que tu gardes de l'existant, ce que tu refais, ordre des chantiers. Pas de code avant validation du plan.

## 23. Amélioration continue, coût IA et règle des 10 ans

### 23.1 L'app apprend de chaque artisan, sans réglage

- **Préférences apprises des corrections.** Chaque correction dans le chat (« mets 10 % de perte », « enlève les crochets ») est enregistrée comme préférence de cet artisan. Au chantier suivant, elle s'applique d'office et s'affiche en une ligne : « Perte 10 %, comme d'habitude ». Aucune page de réglages n'est nécessaire ; une page « Mes habitudes » existe seulement pour consulter et supprimer.
- **Apprentissage collectif anonyme.** Si une majorité d'artisans d'une zone corrige un ratio dans le même sens, le référentiel par défaut évolue pour tous (proposé à l'équipe Rappidos, validé par un humain, jamais automatique).
- **Retour terrain.** À l'envoi au fournisseur puis quelques semaines après : « Il t'a manqué ou resté des matériaux ? » Une question, deux boutons, puis saisie libre si besoin. C'est la seule mesure réelle de précision ; elle alimente les deux points précédents.
- **Score de confiance par ligne.** Couleur discrète (vert / orange) selon que la quantité repose sur une mesure donnée ou sur une hypothèse. L'artisan ne vérifie que l'orange.
- **Photos optionnelles.** Si l'artisan ajoute des photos de la toiture, l'IA pré-remplit pente, points singuliers, nombre de descentes, et pose moins de questions. Jamais obligatoire.

### 23.2 Maîtrise du coût IA

Ordre de grandeur visé : moins de 15 centimes par chantier, quelle que soit la taille du devis.

- Le moteur de règles calcule en code : zéro token pour les quantités.
- Extraire le texte du PDF en code quand il est lisible ; n'envoyer les pages en image que pour les scans ou devis manuscrits.
- Photos redimensionnées côté app avant envoi (max 1 Mpx).
- Modèle léger (Haiku) pour les échanges simples du chat ; modèle plus puissant uniquement pour l'extraction du devis et l'interprétation des corrections ambiguës.
- Référentiel et instructions système en cache de prompt ; ne jamais renvoyer le référentiel entier à chaque message, seulement les règles des ouvrages détectés.
- Mesurer et afficher le coût par chantier dans l'admin Rappidos.

### 23.3 Règle des 10 ans — chaque écran, chaque action

Un enfant de 10 ans doit comprendre chaque action sans explication. Critères concrets, à vérifier écran par écran :

- **Un écran = une action principale**, un seul gros bouton évident. Les actions secondaires sont discrètes.
- **Chaque bouton dit ce qu'il fait**, en langage parlé : « Déposer mon devis », « C'est bon, envoie », « Modifier ». Jamais de jargon (pas de « générer », « soumettre », « valider la saisie »).
- **Aucune question n'exige de taper** si deux ou trois boutons suffisent. Le clavier et le micro restent disponibles mais ne sont jamais obligatoires.
- **Toujours une sortie visible** : à tout moment, l'artisan sait où il en est (« Étape 2 sur 3 ») et peut revenir en arrière sans rien perdre.
- **L'attente est expliquée** par les étapes de réflexion affichées en temps réel, jamais par un spinner muet.
- **Les erreurs parlent** : « Je n'arrive pas à lire la page 3, tu peux la reprendre en photo ? », jamais de code d'erreur.
- **Rien à configurer avant le premier chantier.** Le premier usage fonctionne avec les valeurs par défaut.
- **Le chat reste familier** : même logique que Claude / ChatGPT / Gemini (messages, barre en bas, micro), avec l'identité visuelle Rappidos.
- **Test obligatoire** : avant chaque livraison, faire tester le parcours complet par une personne qui ne connaît ni le BTP ni l'app, sans aucune explication. Si elle bloque, c'est l'écran qui est faux, pas la personne.

### 23.4 Consigne à Claude Code

Pour chaque écran ou composant que tu crées ou modifies, écrire en une ligne dans le commentaire du composant : l'action principale, ce que l'utilisateur voit pendant l'attente, et ce qu'il peut faire si ça ne marche pas. Si tu ne peux pas remplir ces trois lignes simplement, l'écran est trop compliqué.

## 24. Périmètre du MVP

**Le MVP s'arrête à l'envoi du quantitatif au fournisseur.** Si l'artisan dépose son devis et obtient un quantitatif juste qu'il envoie en un tap, l'objectif est atteint.

### Dans le MVP

- Nouveau chantier → dépôt du devis → chat (questions courtes) → carte quantitatif → corrections dans le chat → envoi à un ou plusieurs fournisseurs (flux existant) → export PDF.
- Métier couverture-étanchéité uniquement.
- Préférences apprises des corrections (section 23.1, premier point).

### Hors MVP (ne pas coder, mais ne pas bloquer)

- Analyse des devis fournisseurs reçus : comparaison des prix, lignes en trop, lignes manquantes, recommandation du mieux placé. Pour le rendre possible plus tard sans refonte : chaque ligne du quantitatif envoyé conserve un identifiant stable et un libellé normalisé, repris dans le PDF et dans l'envoi.
- Photos de toiture, score de confiance par ligne, apprentissage collectif, retour terrain après livraison.
- Autres métiers.

Si une fonctionnalité hors MVP demande un choix d'architecture maintenant, le signaler dans le plan et proposer l'option la moins coûteuse qui laisse la porte ouverte.