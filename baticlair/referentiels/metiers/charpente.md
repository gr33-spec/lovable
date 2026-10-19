---
code: charpente
metier: carpentry
nom: Charpente bois
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/charpentier.md
---

# Fiche métier : charpente bois (format commun, §52)

Tirée du référentiel charpentier du 3 octobre 2026 (`docs/referentiels/charpentier.md`, sections 2 à 7, fiches négoce
ouvertes ce jour-là). Règle d'or du métier : on commande des pièces d'une section dans une longueur commerciale, jamais des
m², des m³ ni des « ml » en vrac ; pointes et vis à la boîte ; traitement au bidon. Les fermettes se commandent en lot au
fabricant, sur plan.

## 1. Unités et vocabulaire du devis

Unités du devis : m² (charpente, chevronnage, traitement, plancher de comble, au m² de toiture ou de plancher), ml (sablières,
rives, pannes), u (pièces, fermettes, sabots), ens / forfait (lot de fermettes, dépose).
Mots du métier : « bastaing » = 63×175 ; « madrier » = 75×225 ; « chevron 6/8 » ou « 6×8 » = chevron 63×75 (sections en cm à
convertir en mm) ; « panne », « filière », « ventrière » = panne ; « faîtage », « faîtière » = panne de faîtage ; « sablière »,
« plate-forme » = sablière ; « KVH », « BMA », « lamellé-collé », « GL24h » = bois reconstitué à la longueur exacte ;
« fermettes », « fermes en W », « charpente industrielle » = lot fabricant ; « classe 2 », « CL2 » = traité intérieur.
Hors commande : dépose, démolition, évacuation, levage, grue, main-d'œuvre.
Ce que la fiche calcule : le chevronnage au m² de toiture (chevrons 63×75 à la pièce dans la longueur commerciale, vis de
charpente à la boîte), le traitement des bois au bidon, le plancher de comble en OSB au panneau, les planches de rive à la
pièce, l'ancrage des sablières. Ce qui reste tel qu'écrit, avec sa section et sa longueur : pannes, faîtage, sablières,
poutres, lamellé-collé, BMA, solives, lot de fermettes (une ligne « lot sur plan », le fabricant fournit le contreventement),
connecteurs écrits à l'unité.
La longueur des chevrons et leur entraxe écrits sur la ligne (« L 4,50 m », « entraxe 60 cm ») vont dans « donnees »
(`longueur_chevron` = 450, `entraxe_chevrons` = 60) : la question n'est pas posée. Une ligne qui écrit aussi la sablière en bois
donne deux fournitures : l'ancrage (ouvrage `ancrage-sablieres`) et la pièce de bois telle qu'écrite.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| chevronnage | Chevronnage en 63×75 (au m² de toiture) | m² | « Chevronnage sapin traité 63×75 », « chevrons 6/8 », « charpente pannes et chevrons, chevrons 63×75 » |
| traitement-preventif | Traitement préventif des bois de charpente | m² | « Traitement préventif insecticide fongicide », « traitement des bois neufs » |
| traitement-curatif | Traitement curatif d'une charpente existante | m² | « Traitement curatif de charpente », « traitement insecticide charpente existante », « traitement capricornes » |
| plancher-osb | Plancher de comble en OSB 18 mm | m² | « Plancher de comble OSB 18 mm », « plancher OSB », « panneaux OSB3 rainés-bouvetés » |
| planche-de-rive | Planche de rive sapin traité | ml | « Planches de rive », « bandeau de rive », « planche de rive sapin traité » |
| ancrage-sablieres | Ancrage des sablières sur maçonnerie | ml | « Sablière ancrée sur maçonnerie », « fixation des sablières », « ancrage sablière » |

## 3. Ratios

Chevrons : pièces au m² de toiture = 1 ÷ (entraxe × (longueur commerciale − 0,10 m de coupe)) × 1,05 (casse et défauts,
⌈n/20⌉). Vis : une par croisement chevron × appui, un appui tous les 2,50 m au plus plus les deux extrémités (≈ 0,68 vis par mètre
de chevron) + 10 %. Traitement : surface développée = 1,3 × surface de toiture, × 0,20 L/m² (préventif) ou 0,30 L/m²
(curatif), + 10 %.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| chevronnage | Chevron 63×75 traité classe 2 L 3,50 m | 0,7721 | u | longueur_chevron=350 et entraxe_chevrons=40 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 4,00 m | 0,6731 | u | longueur_chevron=400 et entraxe_chevrons=40 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 4,50 m | 0,5966 | u | longueur_chevron=450 et entraxe_chevrons=40 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 5,00 m | 0,5357 | u | longueur_chevron=500 et entraxe_chevrons=40 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 5,50 m | 0,4861 | u | longueur_chevron=550 et entraxe_chevrons=40 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 6,00 m | 0,4449 | u | longueur_chevron=600 et entraxe_chevrons=40 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 3,50 m | 0,6176 | u | longueur_chevron=350 et entraxe_chevrons=50 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 4,00 m | 0,5385 | u | longueur_chevron=400 et entraxe_chevrons=50 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 4,50 m | 0,4773 | u | longueur_chevron=450 et entraxe_chevrons=50 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 5,00 m | 0,4286 | u | longueur_chevron=500 et entraxe_chevrons=50 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 5,50 m | 0,3889 | u | longueur_chevron=550 et entraxe_chevrons=50 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 6,00 m | 0,3559 | u | longueur_chevron=600 et entraxe_chevrons=50 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 3,50 m | 0,5147 | u | longueur_chevron=350 et entraxe_chevrons=60 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 4,00 m | 0,4487 | u | longueur_chevron=400 et entraxe_chevrons=60 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 4,50 m | 0,3977 | u | longueur_chevron=450 et entraxe_chevrons=60 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 5,00 m | 0,3571 | u | longueur_chevron=500 et entraxe_chevrons=60 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 5,50 m | 0,3241 | u | longueur_chevron=550 et entraxe_chevrons=60 | à vérifier | S1 S2 |
| chevronnage | Chevron 63×75 traité classe 2 L 6,00 m | 0,2966 | u | longueur_chevron=600 et entraxe_chevrons=60 | à vérifier | S1 S2 |
| chevronnage | Vis de charpente 8×160 | 1,87 | u | entraxe_chevrons=40 | à vérifier | S3 |
| chevronnage | Vis de charpente 8×160 | 1,496 | u | entraxe_chevrons=50 | à vérifier | S3 |
| chevronnage | Vis de charpente 8×160 | 1,2467 | u | entraxe_chevrons=60 | à vérifier | S3 |
| traitement-preventif | Traitement insecticide-fongicide charpente | 0,286 | L | — | à vérifier | S4 |
| traitement-curatif | Traitement insecticide-fongicide charpente | 0,429 | L | — | à vérifier | S4 |
| plancher-osb | Panneau OSB3 18 mm rainé-bouveté 2500×675 | 1,05 | m² | — | usuel | S5 |
| planche-de-rive | Planche de rive sapin traité | 1,05 | m | — | usuel | S6 |
| ancrage-sablieres | Goujon d'ancrage béton M10 | 0,9 | u | — | à vérifier | S7 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source |
|---|---|---|---|---|---|
| Chevron 63×75 traité classe 2 L 3,50 m | pièce | 1 | u | usuel | S1 |
| Chevron 63×75 traité classe 2 L 4,00 m | pièce | 1 | u | usuel | S1 |
| Chevron 63×75 traité classe 2 L 4,50 m | pièce | 1 | u | usuel | S1 |
| Chevron 63×75 traité classe 2 L 5,00 m | pièce | 1 | u | usuel | S1 |
| Chevron 63×75 traité classe 2 L 5,50 m | pièce | 1 | u | usuel | S1 |
| Chevron 63×75 traité classe 2 L 6,00 m | pièce | 1 | u | usuel | S1 |
| Vis de charpente 8×160 | boîte | 50 | u | sûr | S3 |
| Traitement insecticide-fongicide charpente | bidon | 20 | L | sûr | S4 |
| Panneau OSB3 18 mm rainé-bouveté 2500×675 | panneau | 1,65 | m² | à vérifier | S5 |
| Planche de rive sapin traité | pièce | 4 | m | à vérifier | S6 |
| Goujon d'ancrage béton M10 | boîte | 50 | u | à vérifier | S7 |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| longueur_chevron | Tes chevrons, tu les prends en quelle longueur ? | 3,50 m=350 / 4,00 m=400 / 4,50 m=450 / 5,00 m=500 / 5,50 m=550 / 6,00 m=600 | chevronnage |
| entraxe_chevrons | Tes chevrons sont espacés de combien ? | 40 cm=40 / 50 cm=50 / 60 cm=60 | chevronnage |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : charpente d'une maison de 10 × 8 m à deux pans, d'après le cas
charp-001 du référentiel du 3 octobre.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Dépose de la charpente existante et évacuation | 1 | ens | — |
| 2 | Chevronnage sapin traité classe 2 63×75 | 96 | m² | chevronnage |
| 3 | Traitement préventif insecticide fongicide des bois | 96 | m² | traitement-preventif |
| 4 | Plancher de comble OSB 18 mm | 30 | m² | plancher-osb |
| 5 | Planches de rive sapin traité | 24 | ml | planche-de-rive |
| 6 | Sablière ancrée sur maçonnerie | 20 | ml | ancrage-sablieres |
| 7 | Lot de fermettes industrielles sur plan, garage | 1 | ens | — |

### Bref

- Charpente d'une maison à deux pans : chevronnage 63×75 traité classe 2 sur 96 m², traitement préventif des bois.
- Plancher de comble en OSB 18 mm sur 30 m², 24 ml de planches de rive, 20 ml de sablières ancrées sur la maçonnerie.
- Fermettes du garage en lot fabricant sur plan ; dépose de l'ancienne charpente hors commande.

### Questions attendues

- `longueur_chevron`
- `entraxe_chevrons`

### Réponses

- `longueur_chevron` = 450
- `entraxe_chevrons` = 60

### Comptes attendus

Calculs : chevrons 96 × 1,05 ÷ (0,60 × 4,40) = 38,2 → 39 pièces ; vis 96 × 0,68 ÷ 0,60 × 1,10 = 119,7 → 3 boîtes de 50 ;
traitement 96 × 1,3 × 0,20 × 1,10 = 27,5 L → 2 bidons de 20 L ; OSB 30 × 1,05 = 31,5 m² ÷ 1,65 ; rives 24 × 1,05 = 25,2 m ÷ 4 ;
goujons 20 × 0,9 = 18.

| Fourniture | Commande |
|---|---|
| Chevron 63×75 traité classe 2 L 4,50 m | 39 pièces |
| Vis de charpente 8×160 | 3 boîtes de 50 u |
| Traitement insecticide-fongicide charpente | 2 bidons de 20 L |
| Panneau OSB3 18 mm rainé-bouveté 2500×675 | 20 panneaux de 1,65 m² |
| Planche de rive sapin traité | 7 pièces de 4 m |
| Goujon d'ancrage béton M10 | 1 boîte de 50 u |

## 7. À relire par un charpentier

- Chevrons au m² de toiture : 1 ÷ (entraxe × (longueur − 0,10 m)) + 5 % de casse ; la formule ignore le chevron de rive en plus
  par versant et suppose une seule pièce par rampant (pas de raccord sur panne) : ±1 à 2 pièces par versant.
- Vis de charpente : une par croisement chevron × appui (appuis tous les 2,50 m au plus) ; la longueur 8×160 suppose un chevron
  63×75 posé sur chant (ETA du fabricant à vérifier) : ±25 % sur les boîtes.
- Traitement : surface développée = 1,3 × surface de toiture (ratio à valider) ; ±30 % sur les bidons ; les bidons de 5 L ne
  sont pas encore proposés.
- Surface utile d'un OSB 2500×675 rainé-bouveté (1,65 m²) et longueur des planches de rive (4 m) : à confirmer au négoce.
- Ancrage des sablières : un goujon tous les 1,20 m environ (0,9 au ml) ; le lot de fermettes peut fournir ses propres ancrages.

## 8. Sources

- S1 : Point.P, bastaings et madriers sapin-épicéa traités classe 2 (longueurs 3,50 à 7,50 m au pas de 0,50 m) et chevrons 63×75 ; surlongueur de coupe 0,10 m et casse ⌈n/20⌉ : règle BatiClair du 3 octobre, à vérifier ; consultés le 3 octobre 2026.
- S2 : Entraxe courant des chevrons 0,40 à 0,60 m (défaut 0,60 m ; couverture lourde ou neige zone C : 0,50 m) : référentiel du 3 octobre, à vérifier (NF DTU 31.1 non lu).
- S3 : Vis de charpente tête disque Torx 8×240 en boîte de 50 (Point.P SPAX, Chausson Rocket), gamme 8×120 à 8×320 (Würth) ; une vis par croisement chevron × appui, portée maxi d'un chevron 63×75 entre appuis 2,50 m : règle BatiClair, à vérifier.
- S4 : Fiche Pro Tech Bois (insecticide-fongicide : préventif 200 ml/m², curatif 300 ml/m²) ; Xilix en seau de 20 L ; surface développée = 1,3 × surface de toiture : ratio à valider (référentiel du 3 octobre, §5.2 point 10) ; + 10 %.
- S5 : Panneau OSB3 18 mm 2500×675 rainé-bouveté (exemple du référentiel du 3 octobre, §2.1) ; surface utile 1,65 m² estimée (languette déduite), à vérifier ; + 5 % de coupes.
- S6 : Planche de rive sapin traité, pièce de 4 m : longueur courante négoce, à vérifier ; + 5 %.
- S7 : Goujon d'ancrage béton M10×95 en boîte de 50 et ancrage des sablières tous les 1,00 à 1,50 m : référentiel du 3 octobre (§4.4, §5.2 point 11), à vérifier.
- S8 : Guide CODIFAB / UICB 2024, charpente industrialisée : fermettes livrées en lot complet avec plan de pose et pièces de contreventement (raison pour laquelle le lot reste tel qu'écrit).
