# Référentiel quantitatif couverture-étanchéité (Rappidos)

Oct 3, 2026 · @Greg

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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- | --- |
| 25° (47 %) | 110 | 120 | 130 |
| 30° (58 %) | 100 | 110 | 120 |
| 35° (70 %) | 90 | 100 | 110 |
| 40° (84 %) | 85 | 90 | 100 |
| 45° (100 %) | 80 | 85 | 95 |
| ≥ 50° (119 %) | 70 | 80 | 90 |

Pente minimale ardoise : 45 % (24°) en zone normale, 60 % (31°) en zone exposée. En dessous, refuser l'ouvrage ou passer en pose clouée triple recouvrement.

**Tableau de référence par format** (R = 100 mm, soit zone 1 à 30° ou zone 3 à 40°). Pour un autre R, recalculer avec les formules ; la source est le mémento Rathscheck / tableau DTU.

| Format (cm) | Pureau (mm) | Ardoises/m² | Crochet (cm) | Liteaux (ml/m²) |
| --- | --- | --- | --- | --- |
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
| --- | --- |
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
| --- | --- | --- | --- | --- |
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
| --- | --- | --- | --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- |
| Abergement de cheminée (4 côtés) | périmètre cheminée × 1,3 en ml de zinc dév. 33 à 40 cm + solin ou bande porte-solin au périmètre |
| Solin contre mur (bavette + solin) | ml × 1,1 bande zinc + ml bande porte-solin ou mortier ; vis + chevilles 3/ml |
| Chéneau encaissé | ml × 1,05, dév. selon section (50 à 80 cm) ; joint de dilatation tous les 12 m |
| Bavette de fenêtre de toit | pièce fabricant (raccord d'étanchéité par modèle et par type de couverture) |
| Sortie de toit, souche VMC | 1 pièce + 1 collerette |

Exemple : pan 12 m × 7 m de rampant, zone 3 exposé → 28 bacs de 7 m = 196 ml de bac (98 m² dév., ≈ 460 kg zinc 0,65) ; joints 27 × 7 = 189 ml → 570 pattes (≈ 100 fixes, 470 coulissantes) ; voligeage 88 m² ; égout 12 m = 3 gouttières de 4 m + 25 crochets + 2 talons + 1 naissance + 1 descente Ø 80.

## 8. Bac acier et plaques (DTU 40.35)

La commande se fait en nombre de plaques à longueur, pas en m². Largeur utile courante 1,00 m (bac 1000) ou 0,90 m ; longueur à la demande jusqu'à 12 m, 1 plaque par rampant si possible (sinon recouvrement transversal 15 à 20 cm). Pente mini 7 % simple peau, 5 % sandwich.

| Élément | Règle de conversion | Conditionnement |
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
| --- | --- | --- |
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
- Toujours proposer une valeur par défaut validable en un tap (boutons de réponse rapide) : « Pente ? \[35°\] \[45°\] \[autre\] ». La valeur par défaut vient de la section 19 (`hypotheses_a_afficher`) et de la zone climatique du département.
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

## 25. Points singuliers, zinc en pièces, mortier et petites fournitures — tout ce qui se commande

Complète les sections 3, 7 et 10. Sources : manuel CAP couvreur chapitre 21 « Quantitatif d'une couverture en ardoise au crochet » (plus-values, tableau de recouvrement, crochets, liteaux, ventilation), fiches VMZINC / Rheinzink / Point.P / Weber / VPI / PRB. Les lignes marquées (à valider) sont des valeurs courantes non sourcées.

### 25.1 Ardoise : plus-values des points singuliers (manuel CAP, m² à ajouter à la surface)

| Ouvrage | Plus-value par ml |
| --- | --- |
| Égout droit | pureau × longueur |
| Égout biais | 2 pureaux × longueur |
| Rive latérale, tranchis droit | 0,16 m² |
| Rive latérale, tranchis biais | 0,25 m² |
| Rive, tranchis circulaire | 0,33 m² |
| Arêtier (pour les 2 rives), par rang de doublage ou ardoises biaises | 0,66 m² |
| Noue à fendis et renvers (1 ou 2 tranchis) | 1,50 m² |
| Déversée à 1 tranchis / à 2 tranchis | 0,33 m² / 0,50 m² |
| Tourelle | circonférence de base × hauteur |

Méthode : surface de couverture + somme des plus-values = surface à considérer ; puis × nombre d'ardoises au m² et × ml liteaux au m² (jeu de tête 0,5 cm). Ajouter ensuite la perte (section 2). Exemple du manuel : versant 39 m², égout 5 m, tranchis droit 6 m, rive biaise 6,32 m, 32×22 à R 75 → 42,15 m² → 1 543 ardoises, 340 ml liteaux.

**Recouvrement (manuel CAP, régions I/II/III × projection horizontale du rampant 0-5,5 / 5,5-11 / 11-16,5 m).** Le tableau complet est à saisir dans `referentiels/couverture/regles.json` depuis le manuel. Point de contrôle : à 45° (pente 100 cm/m), région I, rampant ≤ 5,5 m → R = 75 mm → 32×22 = 36,6 ardoises/m², 30×22 = 39,9/m². À 24° (pente 45 cm/m) les valeurs montent vers 110-130 mm. **La pente est toujours en degrés dans l'app ; un « 45 % » lu dans un devis est une erreur probable à confirmer.**

**Crochets inox, boîte de 5 kg** (Ø 2,7 mm) : nombre de crochets = nombre d'ardoises ; 4/5 en crochets-agrafes, 1/5 en crochets-pointes.

| Longueur crochet | Agrafes / boîte | Pointes / boîte |
| --- | --- | --- |
| 7 cm | 670 | 830 |
| 8 | 635 | 775 |
| 9 | 600 | 725 |
| 10 | 570 | 680 |
| 11 | 540 | 640 |
| 12 | 515 | 605 |
| 13 | 495 | 575 |
| 14 | 475 | 545 |
| 15 | 455 | 520 |
| 16 | 430 | 500 |

Longueur du crochet = fonction du recouvrement (colonne du tableau formats : R 100 → crochet 11, R 90 → 10, R 75 → 8).

**Section des liteaux selon l'entraxe des chevrons** : 0,35 m → 14×40 ; 0,40 → 14×50 ou 18×40 ; 0,66 → 18×50 ; 0,84 → 18×75 ; 1,00 → 25×50.

**Ventilation (obligatoire, entrée = sortie)** : section 1/3 000 de la surface de couverture (comble aménagé) ou de la surface en plan (non aménagé). Chatière 60 à 145 cm² selon modèle ; bande d'égout ventilée ≈ 70 cm²/ml ; faîtage ventilé ≈ 85 cm²/ml. Nombre de chatières = section nécessaire ÷ section d'une chatière, réparties moitié égout / moitié faîtage, en quinconce.

**Noquets** (arêtiers et noues à noquets, rives biaises) : 1 noquet par rang, soit (longueur de l'arêtier ou noue ÷ pureau) noquets. Découpés dans une feuille de zinc 2 × 1 m : ≈ 18 noquets de 30 × 33 cm par feuille (à valider selon format).

### 25.2 Zinc : pièces telles qu'on les achète

| Pièce | Dimensions courantes | Poids / unité | Note |
| --- | --- | --- | --- |
| Feuille zinc naturel | 2 000 × 1 000 mm, ép. 0,65 (n° 12) / 0,70 (13) / 0,80 (14) | 9,36 kg en 0,65 | palettes 54 ou 107 feuilles ; existe aussi 2 000 × 500 / 650 / 800 mm |
| Bobine / feuille joint debout | largeur 500 ou 650 mm, ép. 0,65-0,70, longueur ≤ 13-15 m | 4,7 kg/m² en 0,65 | 650 interdit en zone 4 et zone 3 exposé → 500 partout sur le littoral breton |
| Noue préformée | développé 500 mm (mini DTU 330, relevés 45 mm), L 2 m ou 3 m | 3,9 kg (2 m) | recouvrement 150 mm entre éléments → longueur utile 1,85 m pour 2 m ; nombre = ml noue ÷ 1,85 arrondi sup. |
| Bande de solin à biseau | développé 100 mm, L 2 m, ép. 0,65 | 0,86 kg | nombre = ml solin ÷ 1,9 (recouvrement 10 cm) ; + porte-solin même longueur si engravure |
| Bande de rive à ourlet / biseau | développé 250 à 400 mm (400 → 315 mm utile), L 2 m | ≈ 1,5-2,5 kg | 4 fixations/ml (clous calotins ou vis autoforeuses) |
| Couvre-joint | développé 100 mm, L 2 m | — |  |
| Faîtage zinc (bande à rabattre / à ourlet) | développé 200 à 330 mm, L 2 ou 3 m | — | 3 pattes ou clous/ml |
| Bande d'astragale, bande de battellement | développé 150 à 250 mm, L 2 m | — | à l'égout et sous chéneau |
| Gouttière demi-ronde / nantaise | dév. 250 / 285 / 333 / 400, L 4 m (zinc), 2 ou 4 m (PVC/alu) | — | crochets tous 40-50 cm, 1 talon par extrémité, 1 naissance par descente, 1 jonction ou soudure par longueur |
| Descente | Ø 80 / 100 / 120, L 2 m (zinc) ou 4 m | — | 2 coudes par descente (saut de loup), 1 collier tous 2 m, 1 dauphin si pied exposé |

**Développé** : largeur de la pièce à plat, pas la largeur utile. Pour une pièce façonnée sur place : développé = somme des pans + pinces (4 cm par rive) ; kg = ml × développé × 4,7 (0,65 mm) ; feuilles = (ml ÷ 2 m) × (développé ÷ 1 000) arrondi sup.

### 25.3 Soudure et fixation du zinc

- Baguette de soudure étain 33 % (ou sans plomb SnZn), 220-250 g ; targette 950 g. Consommation ≈ 60-80 g par ml de soudure continue, soit 1 baguette pour 3 ml (à valider).
- Décapant pour zinc : 1 flacon 250 ml pour ≈ 40 ml de soudure (à valider).
- Gaz chalumeau : 1 bouteille 400 g pour ≈ 20-30 ml de soudure (à valider).
- Clous calotins zinc 40 × 2,7 mm, boîte de 250 : bandes de rive et faîtages 4/ml ; abergements et solins 5/ml.
- Pattes de fixation joint debout : 3/ml de joint (section 7), fixes + coulissantes.
- Ml de soudure à prévoir = longueurs des jonctions non agrafées (noues façonnées, chéneaux, abergements, boîtes à eau, talons de gouttière).

### 25.4 Mortier bâtard (solins, faîtages, arêtiers, rives scellés)

- Sac de 25 kg (palette 48 sacs = 1 200 kg) ou 5 kg ; eau 3,7 l par sac de 25 kg. Alternative sur site : 1 vol. ciment + 1 vol. chaux NHL 3,5 + 4 à 5 vol. sable 0/2 ; dosage 350 kg de liant/m³ ; 1 m³ de mortier ≈ 1,4 t de sable + 350 kg de liant.
- Faîtage tuiles scellé : 5 à 10 kg/ml (Weber, VPI : 5 kg/ml ; PRB : 5 à 20 kg/ml selon galbe). Valeur par défaut : 8 kg/ml pour tuiles grand moule, 12 kg/ml pour canal et fort galbe.
- Arêtier tuiles scellé : 6 à 10 kg/ml (à valider).
- Rives scellées (tuiles de rive, ruellée) : 2 à 3 kg/ml.
- Solin maçonné (ruellée contre mur) : 3 à 5 kg/ml (à valider).
- Embarrure d'about, crête de coq, souche : 5 kg par unité (à valider).
- Sacs = total kg ÷ 25 arrondi sup. Pigment pour mortier teinté : 1 dose par sac.
- Faîtage à sec (closoir + crochets) : remplace le mortier ; ne jamais commander les deux.

### 25.5 Pointes, vis, fixations

- Longueur de pointe : 2,5 × épaisseur à fixer si < 15 mm, 2 × si ≥ 15 mm (règle DTU) ; galvanisées classe 2 (12 µm) pour liteaux, contre-liteaux, volige ; inox ou galva 50 µm en bardage.
- Liteaux + contre-liteaux : 1 pointe par croisement liteau/chevron, soit ml liteaux ÷ entraxe chevrons (+ contre-liteaux : ml ÷ 0,30). Ordre de grandeur 1 000 à 2 000 pointes pour 100 m². Pointe 60 × 2,8 galva ≈ 400/kg → 3 à 5 kg pour 100 m². Vendues en boîte de 5 kg ou carton de 1 kg.
- Volige : 2 pointes par croisement planche/chevron.
- Joint debout sur volige (pattes) : 2 000 pointes crantées 28-35 mm pour 100 m².
- Bardage : 25 pointes/m².
- Vis bac acier : 7 vis/m² + 3 vis/ml de recouvrement longitudinal (section 8).
- Vis autoforeuses bandes de rive alu/zinc : 4/ml.

### 25.6 Consommables divers par chantier

- Bande adhésive pour écran de sous-toiture : 1 rouleau de 25 m pour 150 m² d'écran (à valider).
- Mastic PU / silicone neutre : 1 cartouche par 8 ml de joint (solins, couvertines, pénétrations).
- Bande d'étanchéité bitume adhésive (pourtour cheminée, fenêtre de toit) : périmètre × 1,2.
- Disques à tronçonner diamant : 1 par 50 m² de tuiles/ardoises à couper (à valider).
- Film de protection, sacs à gravats, EPI : forfait par chantier, saisi par l'artisan dans ses habitudes.

### 25.7 Ce qui reste à faire valider par un couvreur

Noquets par feuille, soudure et décapant au ml, mortier arêtier/solin/embarrure, bande adhésive écran, disques. Tout le reste est sourcé fabricant ou manuel CAP. Claude Code : porter ces lignes dans `docs/ratios-a-valider.md` avec la mention de la source quand elle existe.

## 26. Toute la France : régions, zones et matériaux dominants

**Principe.** Le département du chantier (lu dans l'adresse du devis, sinon celui de l'artisan) fixe trois choses : la zone climatique DTU (recouvrements, écrans, fixations), la zone de vent (largeur des feuilles de zinc, crochets de gouttière, fixations de bac), et le **matériau probable** quand le devis est muet. Le matériau dominant n'est jamais imposé : c'est la valeur par défaut proposée dans la question, l'artisan la confirme en un tap.

### 26.1 Trois découpages à ne pas confondre

- **Régions ardoise DTU 40.11 (I / II / III)** : pilotent le recouvrement. Région III = littoral Atlantique, Manche, Bretagne, Normandie côtière, montagne > 900 m ; région II = intérieur de l'Ouest, Nord, Est, Massif central ; région I = reste. Détail par département à saisir depuis le DTU dans `referentiels/couverture/zones.json`.
- **Zones climatiques DTU tuiles (1 / 2 / 3)** : mêmes familles, mais le découpage n'est pas identique (DTU 40.21 et suivants). Zone 3 = bord de mer et altitude.
- **Zones de vent (1 à 5, Eurocode / NV65)** : Bretagne littorale et Cotentin en zone 4, pointe du Finistère zone 5, Méditerranée 3-4, intérieur 1-2. Pilote : largeur zinc 500/650, espacement des crochets de gouttière (40 cm en zone exposée, 50 cm ailleurs), densité de fixation des bacs.

Claude Code : une seule table `departements.json` avec, par département, les trois codes ; l'altitude > 900 m et le littoral font basculer en zone supérieure (question à l'artisan si l'adresse est ambiguë : « Bord de mer ? Oui / Non »).

### 26.2 Matériaux dominants par région (valeurs par défaut, à affiner avec les données terrain)

| Région | Couverture dominante | Formats / modèles courants | Zinguerie courante |
| --- | --- | --- | --- |
| Bretagne, Normandie, Pays de la Loire | Ardoise naturelle au crochet | 32×22, 30×22, 30×20 ; crochets inox ; faîtage zinc ou lignolet | gouttière zinc nantaise ou demi-ronde dév. 285-333 |
| Nord, Pas-de-Calais, Picardie | Tuile plate TC et tuile mécanique, ardoise en ville | plate 60-70/m², panne S | zinc |
| Champagne-Ardenne, Lorraine | Un peu de tout : tuile mécanique (panne, double romane), ardoise (Ardennes), tuile plate | 10-13/m² | zinc, parfois ardoise d'Ardenne |
| Alsace | Tuile plate écaille (Biberschwanz) | 36-45/m², double recouvrement | zinc, cuivre |
| Île-de-France | Tuile plate, ardoise, zinc à tasseaux / joint debout (Paris) | plate 65-75/m² ; zinc 0,65-0,70 | zinc, chéneaux encaissés |
| Bourgogne, Franche-Comté | Tuile plate, tuile mécanique, tuile vernissée (Bourgogne) | plate 60-70/m² | zinc |
| Centre-Val de Loire | Ardoise (Touraine, Anjou proche) et tuile plate | 32×22, plate | zinc |
| Nouvelle-Aquitaine | Tuile canal (Gironde, Charentes, Landes), tuile mécanique ; ardoise en Limousin et Pyrénées | canal 22-28/m², Romane | PVC et zinc |
| Occitanie | Tuile canal et Romane ; ardoise/lauze en Aveyron, Lozère, Pyrénées | canal 25-30/m² (double courant/couvrant) ; faîtages scellés | PVC, zinc |
| PACA, Corse | Tuile canal et Romane ; lauze en montagne (Corse) | canal ; tuiles à emboîtement Marseillaise | PVC, zinc, cuivre |
| Auvergne-Rhône-Alpes | Tuile mécanique (plaine), canal (Drôme, Ardèche sud), lauze et bac acier (montagne), ardoise (Cantal) | Romane, HP10, lauze 150-200 kg/m² | zinc, bac acier |
| Hauts-de-Savoie / stations | Bac acier, tôle à joint debout, ancelles, lauze | bac 7 vis/m², neige : arrêts de neige obligatoires | zinc 500 mm |

### 26.3 Comment l'IA s'en sert

- Devis clair (« ardoise 32×22 ») → aucune question, le matériau du devis prime.
- Devis vague (« réfection toiture 150 m² ») → question avec le matériau régional en premier bouton : en Gironde « Tuile canal · Tuile mécanique · Ardoise · Autre », en Bretagne « Ardoise · Tuile · Autre ».
- Les quantités, recouvrements et accessoires suivent ensuite la zone du département, pas la région « culturelle ».
- Spécificités régionales à activer automatiquement : arrêts de neige (montagne), scellement des faîtages au mortier (Sud, section 25.4), closoir ventilé (Ouest), ardoises de rive biaises (Ardenne, Bretagne).

### 26.4 Apprentissage

Chaque chantier validé enregistre département + matériau + modèle. Après quelques centaines de chantiers, la table 26.2 est recalculée depuis les données réelles, région par région (section 23.1, apprentissage collectif, validation humaine). C'est la première table du référentiel qui doit devenir vivante.

## 27. Gabarit universel multi-métiers (à lire en premier par Claude Code)

Ce chapitre définit l'arbre architectural de l'application pour tous les métiers du bâtiment. Le présent document (sections 1 à 26) est la **première instance** de ce gabarit, pour le métier couverture-étanchéité. Chaque métier futur sera un document du même format, un dossier du même format, chargé par le même moteur. **Rien de spécifique à un métier ne vit dans le code** : tout vit dans son dossier de référentiel.

### 27.1 Principes non négociables

1. **Un métier = un dossier**, `referentiels/<metier>/`, avec toujours les mêmes fichiers. Ajouter un métier = ajouter un dossier + ses tests, zéro ligne de moteur modifiée.
2. **Un seul moteur**, générique : il lit des schémas, pas des matériaux. Si une fonction contient le mot « ardoise », elle est au mauvais endroit.
3. **Chargement à la demande** : le profil de l'artisan donne son ou ses métiers ; l'app ne charge dans le contexte IA que les référentiels concernés, et dans ces référentiels uniquement les ouvrages détectés dans le devis. Un couvreur ne paie jamais un token de plomberie.
4. **Tout ce qui est commun est factorisé** dans `referentiels/commun/` : départements et zones, unités, conditionnements génériques des négoces, règle d'or, prompts du moteur.
5. **Chaque métier déclare ses axes de variation** (27.3). Le moteur ne pose une question de contexte (région, époque du bâti…) que si le métier déclare que l'axe compte. La couverture dépend fortement de la région ; l'électricité n'en dépend pas du tout.
6. **Référentiels versionnés** : chaque chantier enregistre la version du référentiel utilisée ; un changement de ratio ne modifie jamais un quantitatif passé.
7. **Trois niveaux de surcharge**, dans cet ordre de priorité : référentiel (valeur nationale) → artisan (ses habitudes apprises) → chantier (ce que dit le devis ou l'artisan dans le chat).

### 27.2 Structure d'un dossier métier

```
referentiels/
  commun/
    departements.json      # par département : zones DTU, vent, neige, climat RE2020, sismique
    unites.json            # ml, m², u, kg, L, sac, carton, palette… et conversions
    conditionnements.json  # formats génériques négoce (palette, carton, botte, seau…)
    regle-d-or.md          # jamais une surface comme unité de commande
  <metier>/
    metier.json            # fiche d'identité (27.3)
    ouvrages.json          # ce que l'artisan réalise (toiture ardoise, cloison 72/48…)
    materiaux.json         # fiches produits + conditionnements réels (section 19 du doc)
    regles.json            # formules, pertes, DTU, pas de pose, fixations/m²
    defauts.json           # hypothèses par défaut, indexées par axe de variation
    questions.json         # questions autorisées, ordre de priorité, boutons
    vocabulaire.json       # synonymes du devis → ouvrage ; jargon régional
    ratios-a-valider.md    # ce qu'un pro du métier doit relire (section 25.7)
    tests/                 # devis réels anonymisés + quantitatif attendu
    CHANGELOG.md
```

### 27.3 Fiche d'identité `metier.json`

```json
{
  "code": "couverture",
  "nom": "Couverture - étanchéité",
  "version": "1.0.0",
  "normes": ["DTU 40.11", "DTU 40.21", "DTU 40.41", "DTU 43.1"],
  "axes_de_variation": {
    "geographie": "fort",
    "epoque_bati": "moyen",
    "type_batiment": "moyen",
    "neuf_renovation": "fort",
    "gamme": "faible"
  },
  "metiers_lies": ["charpente", "zinguerie", "isolation"],
  "unites_de_commande": ["u", "ml", "carton", "palette", "kg", "sac", "bobine", "feuille"],
  "maturite": "beta"
}
```

**Les axes de variation.** Ils remplacent la notion de « région » par quelque chose de plus général. Chaque métier dit quels axes pèsent sur ses défauts, et à quel point (fort / moyen / faible / nul). Le moteur en déduit les questions de contexte à poser et les colonnes de `defauts.json`.

| Axe | Ce qu'il capture | Métiers où il est fort |
| --- | --- | --- |
| geographie | matériau régional, zones climatiques, vent, neige, sismique | couverture, maçonnerie (brique Nord, parpaing ailleurs, pierre), isolation (zones H1/H2/H3), charpente (neige) |
| epoque\_bati | ce qu'on trouve en déposant : pierre, brique pleine, plancher bois, cuivre, plomb | plomberie, électricité (mise aux normes), maçonnerie, couverture (ancien liteaunage) |
| type\_batiment | maison, immeuble, ERP, industriel, agricole | électricité (NF C 15-100 vs ERP), plomberie, bac acier |
| neuf\_renovation | dépose, reprise, raccords, contraintes d'accès | tous, surtout couverture, plâtrerie, électricité |
| gamme | standard / premium, change le produit pas la méthode | menuiserie, carrelage, peinture, sanitaire |
| nul | le métier est piloté par la norme seule | électricité (sections, nombre de prises par pièce), plomberie (diamètres), gros œuvre béton |

Exemples : la plâtrerie est quasi universelle (BA13, rails 48/70, plaques 1,20 × 2,50) mais l'axe geographie reste « faible » et non « nul » : brique plâtrière ou béton cellulaire en intérieur dans certaines régions. L'électricité déclare geographie « nul » et type\_batiment « fort ».

### 27.4 Chapitres obligatoires du document métier

Chaque référentiel métier est écrit dans le même ordre. Les numéros ci-dessous deviennent les sections du document ; le document couverture actuel sera réordonné pour s'y conformer.

1. Règle d'or et unités de commande du métier
2. Normes et DTU applicables, avec les valeurs chiffrées extraites
3. Métré : ce qu'on mesure, coefficients, pertes par ouvrage
4. Ouvrages : la liste de ce que l'artisan réalise, chacun avec ses matériaux et ses règles
5. Matériaux et fiches produits : formats, conditionnements, fournisseurs, poids
6. Règles de calcul : formules pures, testables, une par ouvrage
7. Points singuliers et accessoires : tout ce qui se commande à la pièce ou au ml
8. Consommables et petites fournitures : fixations, colles, mortiers, disques
9. Axes de variation et valeurs par défaut : la table des défauts par région / époque / bâtiment
10. Vocabulaire : comment les devis nomment les choses, synonymes, jargon régional
11. Questions autorisées : ordre de priorité, formulation, boutons
12. Ratios à valider par un professionnel du métier
13. Cas de test : devis réels et quantitatifs attendus
14. Modèle de données et prompt Claude Code (commun à tous, référencé)

### 27.5 Liste des métiers prévus et pré-diagnostic des axes

| Métier | Dépendance régionale | Particularité pour le quantitatif |
| --- | --- | --- |
| Couverture - étanchéité | forte | matériau par région, zones vent/neige — en cours |
| Charpente | moyenne | essences locales, charges de neige, sections normées |
| Maçonnerie - gros œuvre | forte | brique rouge Nord/Pas-de-Calais, parpaing ailleurs, pierre et moellon réno, béton cellulaire |
| Plâtrerie - cloisons - plafonds | faible | quasi universel ; brique plâtrière et béton cellulaire en intérieur localement |
| Isolation | moyenne | zones H1/H2/H3 (RE2020), épaisseurs par zone, laine de verre/roche/biosourcé par région |
| Menuiserie ext./int. | faible | gamme et dimensions, pas de région ; sauf volets bois vs PVC |
| Électricité | nulle | norme NF C 15-100 seule ; type de bâtiment et époque (mise aux normes) |
| Plomberie - chauffage | nulle à faible | diamètres normés ; époque (cuivre/PER/multicouche), gaz de ville vs citerne par territoire |
| Carrelage - revêtements | faible | gamme ; formats ; pertes selon calepinage |
| Peinture - finitions | nulle | rendement par support, nombre de couches |
| VRD - terrassement | moyenne | nature du sol, granulats locaux |

### 27.6 Ce que le moteur fait, métier par métier, sans changer

1. Lire le profil artisan → charger `metier.json` des métiers déclarés.
2. Extraire le devis → faire correspondre chaque ligne à un ouvrage via `vocabulaire.json` ; ne charger que ces ouvrages.
3. Lire `axes_de_variation` → résoudre ceux qu'on connaît déjà (adresse → département → geographie ; profil → neuf/réno) ; ne poser que les questions restantes, dans l'ordre de `questions.json`, 3-4 maximum.
4. Appliquer `regles.json` en code pur, avec les défauts de `defauts.json` surchargés par l'artisan puis le chantier.
5. Convertir en unités de commande via `materiaux.json` et `commun/conditionnements.json`.
6. Produire la carte quantitatif (section 21), les hypothèses affichées, la version du référentiel.
7. Enregistrer les corrections de l'artisan comme surcharges niveau artisan ; proposer les récurrentes à la validation collective (section 23).

### 27.7 Première action demandée à Claude Code

Avant tout code : un plan d'architecture d'une page qui montre comment l'existant (`module quantitatif/`) devient `referentiels/commun/` + `referentiels/couverture/` + un moteur générique, avec la liste des fonctions qui contiennent aujourd'hui du métier codé en dur et leur destination. Puis un second métier **vide** (dossier `platrerie/` avec des fichiers minimaux et un test) pour prouver que le moteur tourne sans modification sur deux métiers. Tant que ce test ne passe pas, l'architecture n'est pas validée.

## 28. Règles de pose complémentaires (ce qui déclenche ou interdit un ouvrage)

Ces règles ne changent pas une quantité, elles changent **ce qu'on commande** : un écran en plus, une fixation sur toutes les tuiles au lieu d'une sur cinq, un refus de calculer tant que la pente n'est pas connue. Toutes les pentes sont en degrés, avec l'équivalent en % entre parenthèses parce que les DTU tuiles raisonnent en %. Les valeurs marquées *(à vérifier DTU)* viennent de la pratique courante et doivent être confirmées sur le texte officiel avant mise en production.

### 28.1 Pente minimale par matériau

| Matériau | Pente minimale courante | Remarque |
| --- | --- | --- |
| Ardoise naturelle au crochet | 22° (40 %) région I, plus en II/III selon rampant | sous cette pente : refus ou écran + recouvrement majoré *(à vérifier DTU 40.11)* |
| Ardoise fibres-ciment | 17-22° (30-40 %) selon zone | DTU 40.13 |
| Tuile canal | 14° (25 %) avec écran, 16° (28 %) sans | DTU 40.22 ; crochets ou pose scellée selon zone |
| Tuile à emboîtement grand moule (Romane, panne) | 14-16° (25-28 %) selon zone et rampant | DTU 40.21 ; chaque modèle a sa pente mini fabricant, souvent plus haute |
| Tuile à emboîtement petit moule | 17-20° (30-36 %) | DTU 40.23 |
| Tuile plate | 35° (70 %) en général, 27° (50 %) en région abritée | DTU 40.23 ; double recouvrement |
| Zinc joint debout | 3° (5 %) | DTU 40.41 ; en dessous : étanchéité |
| Bac acier | 3-5° (5-9 %) selon profil et recouvrement | DTU 40.35 |
| Shingle | 11° (20 %) | — |
| Étanchéité bitume / membrane | 0 à 3° | DTU 43.1 |

Règle app : si la pente est en dessous du minimum du matériau du devis, la carte affiche une alerte et propose l'écran ou le changement de matériau ; elle ne calcule pas en silence.

### 28.2 Longueur maximale de rampant

Pour les tuiles, le DTU donne un rampant maximal par pente et par zone (exemple courant : canal zone 1 ≈ 6,50 m, grand moule zone 2 ≈ 8 m, plate zone 3 ≈ 5,50 m) *(à vérifier DTU 40.21-23)*. Au-delà : écran obligatoire ou recouvrement majoré. Pour l'ardoise, le rampant entre dans le tableau de recouvrement (section 25.2). Règle app : la longueur de rampant est toujours demandée ou déduite (surface ÷ longueur de gouttière) ; jamais supposée.

### 28.3 Fixation des tuiles selon zone et pente

| Zone de vent / exposition | Pente < 60 % | Pente ≥ 60 % |
| --- | --- | --- |
| Zone 1-2 abritée | 1 tuile sur 5 en quinconce + rives, égouts, faîtages | 1 sur 3 |
| Zone 3, ou bord de mer | 1 sur 3 | 1 sur 2 |
| Zone 4-5, littoral breton, altitude | toutes les tuiles | toutes |

Une tuile fixée = 1 crochet inox ou 1 vis + rondelle *(à vérifier DTU 40.21 tableau fixation)*. Les tuiles de rive, d'égout, de faîtage, autour des pénétrations sont **toujours** fixées. Ardoise : 100 % au crochet, pas de variation.

### 28.4 Écrans de sous-toiture (DTU 40.29)

- Obligatoire : combles aménagés avec isolant au rampant, pente sous le minimum, zone 3, rampant long, tuiles canal sur liteaux.
- Recouvrement entre lés : 10 cm si pente ≥ 30 % (17°), 20 cm en dessous *(à vérifier DTU 40.29)*.
- Écran HPV (hautement perméable à la vapeur) : posé au contact de l'isolant, contre-liteaux ≥ 20 mm.
- Écran non HPV : lame d'air 2 cm minimum sous l'écran, ventilation basse et haute obligatoires.
- Quantité : surface rampant × 1,10 à 1,15 (recouvrements + relevés), rouleaux 75 m² (1,50 × 50 m) ; adhésif de recouvrement et bande d'égout en ml.

### 28.5 Ventilation (rappel section 25, règle unique)

Section de ventilation = 1/3000 de la surface projetée, répartie moitié en bas (égout ventilé, peigne) et moitié en haut (closoir ventilé, chatières). Nombre de chatières = (surface projetée / 3000 / 2) ÷ section d'une chatière. Le closoir ventilé remplace les chatières hautes quand le faîtage est à sec.

### 28.6 Liteaux et supports

- Section de liteau selon entraxe chevrons : 27×38 jusqu'à 60 cm, 27×50 à 90 cm, 38×38 au-delà *(à vérifier DTU 40.11 et 40.21)*.
- Contre-liteaux 27×40 au-dessus d'un écran, 1 par chevron.
- Volige 18 mm : ardoise au clou, zinc, shingle. Perte 5 %.
- Les liteaux se commandent en ml par longueur standard (3, 4, 5 m) ou en botte ; le ml vient du nombre de rangs × longueur de versant, jamais de la surface.

## 29. Vocabulaire des devis (`vocabulaire.json`)

L'IA reconnaît l'ouvrage à partir des mots du devis. Ce fichier liste, par ouvrage, les expressions rencontrées. Il est alimenté au départ par cette table et ensuite par chaque devis réel (section 23). Les mots inconnus déclenchent une question, jamais une supposition.

| Ouvrage | Expressions courantes | Pièges |
| --- | --- | --- |
| Couverture ardoise | « réfection ardoise », « ardoise 32×22 », « pose au crochet », « ardoise d'Espagne », « Cupa », « ardoise d'Angers », « ardoise naturelle 1ère qualité » | « ardoise fibro / Eternit / artificielle » = fibres-ciment, autre règle |
| Couverture tuile | « tuile mécanique », « Romane », « panne S », « plate 20×30 », « canal », « tige de botte », « tuile de pays », « DC12 », « HP10 » | « tuile de pays » : canal au Sud, plate au Nord → trancher par département |
| Zinguerie | « gouttière nantaise », « demi-ronde 33 », « descente 100 », « noue », « solin », « bavette », « abergement » | « chéneau » = encaissé, pas une gouttière |
| Faîtage | « faîtage à sec », « faîtage scellé », « lignolet », « faîtière à emboîtement », « closoir » | « scellé » implique le mortier (section 25.4) |
| Écran / support | « écran sous-toiture », « pare-pluie », « HPV », « liteaunage », « voligeage », « contre-lattage » | « pare-pluie » ≠ « pare-vapeur » |
| Dépose | « dépose », « démolition de couverture », « évacuation », « mise en décharge », « benne » | « dépose soignée » = réemploi possible, change les quantités |
| Fenêtre de toit | « Velux », « GGL », « fenêtre de toit 78×98 », « raccord EDW / EDL » | « Velux » est une marque : lire le code et le format |
| Isolation combles | « laine soufflée », « R = 7 », « 300 mm », « ouate », « laine de verre entre chevrons » | une épaisseur ou un R : convertir |
| Sécurité / moyens | « échafaudage », « ligne de vie », « nacelle », « monte-matériaux » | hors matériaux à commander, mais à conserver pour le devis |

## 30. Cas de test (`tests/`)

Un cas = un devis réel anonymisé + ce que l'artisan a réellement commandé + l'écart toléré. Format :

```json
{
  "id": "couv-001",
  "source": "Fab, chantier Paimpol, 2026-09",
  "devis_pdf": "couv-001.pdf",
  "contexte": { "departement": "22", "littoral": true, "pente_deg": 45, "rampant_m": 5.2 },
  "attendu": [
    { "article": "ardoise 32x22 R100", "quantite": 8500, "unite": "u", "tolerance_pct": 2 },
    { "article": "crochet inox 11 cm", "quantite": 17, "unite": "carton 500", "tolerance_pct": 5 },
    { "article": "liteau 27x38", "quantite": 1900, "unite": "ml", "tolerance_pct": 5 }
  ],
  "questions_max": 4
}
```

Critères de validation d'un référentiel métier avant bêta : **10 cas réels, chaque ligne dans la tolérance, 4 questions maximum par chantier, zéro question sur une quantité**. Un cas qui échoue bloque la livraison, comme un test de code.

## 31. Plan de complétion vers le quantitatif parfait

| # | Manque | Source | Qui | Critère de fin |
| --- | --- | --- | --- | --- |
| 1 | Tableaux officiels DTU 40.11 (recouvrement, régions par département, liteaux) | texte DTU (CSTB / AFNOR, payant) ou manuel CAP chap. 21 | Greg fournit, Claude transcrit | `regles.json` sans aucun *(à vérifier)* |
| 2 | Pentes mini, rampants maxi, fixations tuiles par zone | DTU 40.21/22/23 + fiches fabricants | idem | idem |
| 3 | Fiches produits des 10 modèles les plus posés en Bretagne puis par région | sites Edilians, Terreal, BMI, Cupa, Catteau, VMZINC | Claude (recherche web) | `materiaux.json` avec tuiles/m², palette, accessoires |
| 4 | Conditionnements réels négoces | catalogues Point P, Larivière, Asturienne, Gedimat | Claude + Fab | chaque article a un conditionnement |
| 5 | 10 cas de test réels | devis + commandes de Fab | Greg / Fab | `tests/` complet, tous verts |
| 6 | 6 ratios 25.7 + nouveaux *(à vérifier)* | relecture Fab | Fab | `ratios-a-valider.md` vide |
| 7 | Vocabulaire enrichi | 50 premiers devis bêta | automatique + validation | zéro mot inconnu sur un devis courant |
| 8 | Table matériaux par région recalculée | chantiers réels | automatique | à partir de 300 chantiers |

Ordre : 5 d'abord (sans cas réels, rien n'est validable), puis 1-2, puis 3-4. Le reste suit la bêta.

## 32. Schémas des fichiers de référentiel (complément de la section 19)

La section 19 définit Materiau, Regle et Ouvrage. Voici les quatre fichiers restants. Claude Code valide chaque fichier avec un schéma JSON au chargement ; un référentiel invalide ne se charge pas.

### 32.1 `commun/departements.json`

```json
{
  "22": {
    "nom": "Côtes-d'Armor",
    "region": "Bretagne",
    "ardoise_region_dtu": "III",
    "zone_climatique_tuile": 3,
    "zone_vent": 4,
    "zone_neige": "A1",
    "zone_re2020": "H2a",
    "littoral": "partiel",
    "altitude_max_m": 340,
    "materiaux_dominants": ["ardoise_naturelle", "tuile_mecanique"]
  }
}
```

`littoral: "partiel"` déclenche la question « Bord de mer ? » ; `"oui"` ou `"non"` ne la posent pas. L'altitude > 900 m fait de même pour la montagne.

### 32.2 `<metier>/defauts.json`

Une valeur par défaut = une clé, une valeur, et les axes qui la font varier. Le moteur résout dans l'ordre : chantier → artisan → variation par axe → valeur nationale.

```json
{
  "perte_ardoise_pct": {
    "valeur": 5,
    "variations": [
      { "si": { "neuf_renovation": "renovation" }, "valeur": 7 },
      { "si": { "geographie.zone_vent": ">=4" }, "valeur": 7 }
    ],
    "afficher": "Perte ardoise {valeur} %"
  },
  "largeur_zinc_mm": {
    "valeur": 650,
    "variations": [ { "si": { "geographie.zone_vent": ">=3" }, "valeur": 500 } ],
    "afficher": "Zinc largeur {valeur} mm"
  }
}
```

### 32.3 `<metier>/questions.json`

```json
[
  {
    "id": "pente",
    "ouvrages": ["couverture_*"],
    "priorite": 1,
    "si_inconnu": "pente_deg",
    "texte": "Pente du toit ?",
    "boutons": [ { "label": "30°", "valeur": 30 }, { "label": "35°", "valeur": 35 }, { "label": "45°", "valeur": 45 }, { "label": "Autre", "valeur": null } ],
    "defaut": 35,
    "sensibilite_pct": 12
  },
  {
    "id": "materiau",
    "ouvrages": ["couverture_*"],
    "priorite": 0,
    "si_inconnu": "materiau",
    "texte": "Toiture en ?",
    "boutons": "@materiaux_dominants",
    "sensibilite_pct": 100
  }
]
```

`sensibilite_pct` = écart sur le quantitatif si la valeur est fausse : le moteur ne pose que les questions dont la sensibilité dépasse 5 %, par priorité décroissante, 4 maximum. `boutons: "@materiaux_dominants"` lit la liste du département.

### 32.4 `<metier>/vocabulaire.json`

```json
{
  "couverture_ardoise": {
    "expressions": ["réfection ardoise", "ardoise naturelle", "pose au crochet", "cupa", "ardoise d'espagne"],
    "exclusions": ["fibro", "eternit", "artificielle"],
    "extrait": { "format": "(\\d{2})\\s?[x×]\\s?(\\d{2})" }
  }
}
```

Une expression inconnue dans une ligne de devis chiffrée en matériaux → question « C'est quoi, \[expression\] ? » avec les ouvrages les plus proches en boutons ; la réponse enrichit le vocabulaire au niveau artisan, puis collectif après validation.

### 32.5 Versionnage

Chaque dossier métier porte un `version` semver dans `metier.json`. Chaque chantier enregistre `{ metier, version }`. Un ratio modifié = version mineure ; un schéma modifié = version majeure et migration écrite. Les anciens quantitatifs se recalculent toujours avec leur version d'origine.

## 33. Sources officielles du tiroir couverture

Les documents ci-dessous couvrent l'essentiel du marché français. Chaque `materiaux.json` et `regles.json` cite sa source (champ `source` + page). Une valeur sans source reste marquée *(à vérifier)*.

### 33.1 Tuiles terre cuite et béton (fabricants, gratuit)

| Fabricant | Document | Lien | Contenu utile |
| --- | --- | --- | --- |
| Edilians | Encyclopédie de la tuile 2024 (tous modèles) | https://edilians.com/media//wysiwyg/Encyclopedie/encyclopedie-tuiles-2024.pdf | tuiles/m², pureau, poids, pentes mini par colonne de rampant (A ≤ 6,5 m, B ≤ 9,5 m, C ≤ 12 m), accessoires, références |
| Edilians | Tuiles canal | https://edilians.com/media/wysiwyg/Encyclopedie/canal-tuiles-edilians.pdf | canal Gironde, Charentaise, Lyonnaise, Restorial |
| Edilians | Prescription de mise en œuvre DTU 40.21 | https://edilians.com/media/productattach/p/r/prescription-de-mise-en-oeuvre-tuiles-fag-dtu-4021.pdf | zones, pentes, fixations |
| Edilians | Calculateur de fixation / nombre de tuiles | https://edilians.com/calcul-fixation-tuile-edilians/calcul-toiture | à utiliser comme oracle pour les cas de test |
| BMI Monier | Guide Monier (tuiles, composants, isolation) | https://www.bmigroup.com/fr/documentation/guide-monier/ | tuiles béton Plein Ciel, Nobilée, terre cuite Marseille, Losangée, Plate de pays |
| Terreal | Espace documents | https://terreal.com/fr/documents/recherche | une soixantaine de modèles ; plates, canal, grands moules ; fixation 2 points sur plate |

Modèles prioritaires à saisir (10 premiers) : Edilians HP10, HP17, Romane Evolution, Panne S, Canal Gironde, Plate 16×38 ; BMI Marseille, Plein Ciel ; Terreal Giverny, Elysée. Puis compléter par région selon section 26.2.

### 33.2 Ardoise

| Source | Lien | Contenu |
| --- | --- | --- |
| Cupa Pizarras — Guide de mise en œuvre | https://www.cupapizarras.com/wp-content/uploads/2018/11/guide\_de\_mise\_en\_oeuvre-1.pdf | recouvrement selon pente/région/exposition, formats, longueur de crochet = R + marge, tableau quantité/m² et ml liteaux |
| Cupa — Catalogue couvreur | https://www.cupapizarras.com/wp-content/uploads/2019/10/catalogue\_couvreur\_be.pdf | carrières, épaisseurs, tableau pureau / nb/m² / crochet / liteaux |
| Cupa — FAQ pureau et ardoises au m² | https://www.cupapizarras.com/fr/centre-ressources/faqs/pureau-ardoises-au-m2/ | formule P = (H − R)/2, 32×22 : 36 à 41/m² |
| Manuel CAP couvreur, chap. 21 | https://www.fichier-pdf.fr/2020/04/05/1q/1q.pdf | tableau recouvrement régions I/II/III, plus-values points singuliers, boîtes de crochets |
| DTU 40.11 (NF P 32-201) | boutique CSTB / AFNOR, payant | texte de référence : régions par département, recouvrements, liteaux. À acheter. |

### 33.3 Zinc

| Source | Lien | Contenu |
| --- | --- | --- |
| VMZINC — Guide Joint debout toiture (nov. 2025) | https://assets.fedrusinternational.be/gen/VMZINC/Documentation/Belgium/R\_Standing%20Seam/Joint%20debout%20toiture\_FR.pdf | dimensionnement et commande des bandes, pattes selon zones de vent, faîtage, égout, rive |
| VMZINC — Pattes monovis (DTA) | https://uploads.gedimat.fr/DOCUMENT/TYPE2/0000230283858.pdf | pente 5 % à 173 %, largeurs 500/650, épaisseurs 0,65/0,70/0,80 |
| Dossier technique joint debout (Soluzinc) | https://www.soluzinc.com/documents/1570113828\_Dossier-technique-JDB.pdf | poids 5,5 / 6 / 7 kg/m² selon épaisseur, entraxes de volige, carte des zones de vent |
| DTU 40.41 et 40.5 | CSTB, payant | zinc en feuilles et gouttières |

### 33.4 Conditionnements réels (négoces)

Les fiches produit Point.P (ex. ardoise Cupa Excellence 32×22, réf. 1727232 : https://www.pointp.fr/p/couverture/ardoise-d-espagne-cupa-excellence-6-en-12326-ce-nf-32x22-cm-A1727232), Larivière, Asturienne et Gedimat donnent la palette, le carton, le poids. Règle : le conditionnement de `materiaux.json` vient d'une fiche négoce, pas du fabricant, car c'est le négoce qui livre.

### 33.5 Pour les autres tiroirs (à venir)

Batiprix (bordereau de prix du bâtiment, payant) décompose chaque ouvrage en matériaux et temps : source la plus rapide pour amorcer maçonnerie, plâtrerie, électricité, plomberie. Les catalogues techniques fabricants (Placo, Knauf, Isover, Legrand, Nicoll) jouent le même rôle qu'Edilians ici.
