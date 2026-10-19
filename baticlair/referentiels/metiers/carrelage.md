---
code: carrelage
metier: tiling
nom: Carrelage - faïence
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/carrelage.md
---

# Fiche métier : carrelage - faïence (format commun, §52)

Tirée du référentiel carrelage du 3 octobre 2026 (`docs/referentiels/carrelage.md`, sections 4 et 5 : fiches Weber, Vicat,
Schlüter ; NF DTU 52.2). Règle d'or du métier : le m² du devis devient des cartons de carreaux, des sacs de colle et de joint,
des seaux de résine, des sacs de ragréage, des plinthes à la pièce ; arrondi au conditionnement entier à la toute fin.

## 1. Unités et vocabulaire du devis

Unités du devis : m² (sol, mur, protection à l'eau, ragréage), ml (plinthes), u (seuils, nez de marche, receveurs).
Mots du métier : « grès cérame », « rectifié », « 60x60 », « 60×120 » (format en cm) ; « faïence » (mur) ; « pose droite »,
« pose décalée », « diagonale » ; « SPEC », « SEL », « système de protection à l'eau sous carrelage » ; « ragréage »,
« autolissant », « P3 » ; « plinthes assorties » ; « double encollage ».
Le format écrit (« 60x60 ») va dans « donnees » (`format_sol` ou `format_mur`), comme la pose (`pose_sol`) et l'épaisseur de
ragréage (`epaisseur_ragreage`) ; sinon la fiche les demande. Le carreau lui-même (référence, coloris) est celui du devis : la
fiche n'en compte que les cartons. Au sol, grès cérame en double encollage (carreau > 500 cm², NF DTU 52.2).
Hors commande : dépose, évacuation, main-d'œuvre, protection.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| carrelage-sol | Carrelage de sol collé | m² | « Carrelage sol grès cérame 60x60 rectifié », « carrelage au sol », « pose de carrelage sol collé » |
| faience-mur | Faïence murale collée | m² | « Faïence murale 25x40 », « faïence salle de bains », « carrelage mural » |
| plinthes-carrelage | Plinthes carrelage assorties | ml | « Plinthes assorties », « plinthes carrelage » |
| spec-douche | Protection à l'eau sous carrelage (SPEC) | m² | « SPEC », « système de protection à l'eau sous carrelage », « étanchéité sous carrelage douche » |
| ragreage | Ragréage autolissant | m² | « Ragréage autolissant », « ragréage P3 », « préparation du support par ragréage » |

## 3. Ratios

Carreaux : surface × (1 + perte de coupe : ≤ 45×45 droite 5 %, décalée 8 %, diagonale 12 % ; ≥ 60×60 droite 8 %, décalée 10 %,
diagonale 15 % ; faïence 8 %). Colle : double encollage au sol 5,5 kg/m² (peigne 9 mm), 6,5 kg/m² en 60×120 (demi-lune), simple
encollage 3 kg/m² pour la faïence ≤ 500 cm², + 5 %. Joint : (L + l) ÷ (L × l) × épaisseur × largeur × 1,5 × 1,10. SPEC :
2 couches de 400 g/m² + 5 %. Ragréage : 1,5 kg/m² par mm.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| carrelage-sol | Carreau de sol 30×30 | 1,05 | m² | format_sol=30x30 et pose_sol=droite | à vérifier | S1 S2 |
| carrelage-sol | Carreau de sol 30×30 | 1,08 | m² | format_sol=30x30 et pose_sol=decalee | à vérifier | S1 S2 |
| carrelage-sol | Carreau de sol 30×30 | 1,12 | m² | format_sol=30x30 et pose_sol=diagonale | à vérifier | S1 S2 |
| carrelage-sol | Mortier-colle C2 S1 | 5,775 | kg | format_sol=30x30 | usuel | S3 S4 |
| carrelage-sol | Mortier de joint | 0,264 | kg | format_sol=30x30 | usuel | S5 |
| carrelage-sol | Carreau de sol 45×45 | 1,05 | m² | format_sol=45x45 et pose_sol=droite | à vérifier | S1 S2 |
| carrelage-sol | Carreau de sol 45×45 | 1,08 | m² | format_sol=45x45 et pose_sol=decalee | à vérifier | S1 S2 |
| carrelage-sol | Carreau de sol 45×45 | 1,12 | m² | format_sol=45x45 et pose_sol=diagonale | à vérifier | S1 S2 |
| carrelage-sol | Mortier-colle C2 S1 | 5,775 | kg | format_sol=45x45 | usuel | S3 S4 |
| carrelage-sol | Mortier de joint | 0,176 | kg | format_sol=45x45 | usuel | S5 |
| carrelage-sol | Carreau de sol 60×60 | 1,08 | m² | format_sol=60x60 et pose_sol=droite | à vérifier | S1 S2 |
| carrelage-sol | Carreau de sol 60×60 | 1,1 | m² | format_sol=60x60 et pose_sol=decalee | à vérifier | S1 S2 |
| carrelage-sol | Carreau de sol 60×60 | 1,15 | m² | format_sol=60x60 et pose_sol=diagonale | à vérifier | S1 S2 |
| carrelage-sol | Mortier-colle C2 S1 | 5,775 | kg | format_sol=60x60 | usuel | S3 S4 |
| carrelage-sol | Mortier de joint | 0,1045 | kg | format_sol=60x60 | usuel | S5 |
| carrelage-sol | Carreau de sol 60×120 | 1,08 | m² | format_sol=60x120 et pose_sol=droite | à vérifier | S1 S2 |
| carrelage-sol | Carreau de sol 60×120 | 1,1 | m² | format_sol=60x120 et pose_sol=decalee | à vérifier | S1 S2 |
| carrelage-sol | Carreau de sol 60×120 | 1,15 | m² | format_sol=60x120 et pose_sol=diagonale | à vérifier | S1 S2 |
| carrelage-sol | Mortier-colle C2 S1 | 6,825 | kg | format_sol=60x120 | usuel | S3 S4 |
| carrelage-sol | Mortier de joint | 0,0743 | kg | format_sol=60x120 | usuel | S5 |
| faience-mur | Faïence 20×20 | 1,08 | m² | format_mur=20x20 | à vérifier | S1 S2 |
| faience-mur | Mortier-colle C2 S1 | 3,15 | kg | format_mur=20x20 | usuel | S3 S4 |
| faience-mur | Mortier de joint | 0,231 | kg | format_mur=20x20 | usuel | S5 |
| faience-mur | Faïence 25×40 | 1,08 | m² | format_mur=25x40 | à vérifier | S1 S2 |
| faience-mur | Mortier-colle C2 S1 | 5,775 | kg | format_mur=25x40 | usuel | S3 S4 |
| faience-mur | Mortier de joint | 0,1502 | kg | format_mur=25x40 | usuel | S5 |
| faience-mur | Faïence 30×60 | 1,08 | m² | format_mur=30x60 | à vérifier | S1 S2 |
| faience-mur | Mortier-colle C2 S1 | 5,775 | kg | format_mur=30x60 | usuel | S3 S4 |
| faience-mur | Mortier de joint | 0,1485 | kg | format_mur=30x60 | usuel | S5 |
| plinthes-carrelage | Plinthe carrelage 8 × 60 | 1,05 | m | — | usuel | S6 |
| spec-douche | Résine de protection à l'eau (SPEC) | 0,84 | kg | — | sûr | S7 |
| spec-douche | Primaire avant SPEC | 0,15 | kg | — | usuel | S7 |
| ragreage | Ragréage autolissant P3 | 4,5 | kg | epaisseur_ragreage=3 | sûr | S8 |
| ragreage | Ragréage autolissant P3 | 7,5 | kg | epaisseur_ragreage=5 | sûr | S8 |
| ragreage | Ragréage autolissant P3 | 15 | kg | epaisseur_ragreage=10 | sûr | S8 |
| ragreage | Primaire d'accrochage | 0,15 | kg | — | usuel | S8 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source | Consommable |
|---|---|---|---|---|---|---|
| Carreau de sol 30×30 | carton | 1,08 | m² | à vérifier | S1 | non |
| Mortier-colle C2 S1 | sac | 25 | kg | sûr | S3 | non |
| Mortier de joint | sac | 5 | kg | sûr | S5 | non |
| Carreau de sol 45×45 | carton | 1,62 | m² | à vérifier | S1 | non |
| Carreau de sol 60×60 | carton | 1,44 | m² | sûr | S1 | non |
| Carreau de sol 60×120 | carton | 1,44 | m² | usuel | S1 | non |
| Faïence 20×20 | carton | 1 | m² | à vérifier | S1 | non |
| Faïence 25×40 | carton | 1,5 | m² | à vérifier | S1 | non |
| Faïence 30×60 | carton | 1,44 | m² | à vérifier | S1 | non |
| Plinthe carrelage 8 × 60 | plinthe | 0,6 | m | usuel | S6 | non |
| Résine de protection à l'eau (SPEC) | seau | 7 | kg | sûr | S7 | non |
| Primaire avant SPEC | bidon | 1 | kg | usuel | S7 | non |
| Ragréage autolissant P3 | sac | 25 | kg | sûr | S8 | non |
| Primaire d'accrochage | bidon | 5 | kg | à vérifier | S8 | non |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| format_sol | Tes carreaux de sol font quel format ? | 30x30=30x30 / 45x45=45x45 / 60x60=60x60 / 60x120=60x120 | carrelage-sol |
| pose_sol | Tu poses comment au sol ? | Pose droite=droite / Pose décalée=decalee / Diagonale=diagonale | carrelage-sol |
| format_mur | Ta faïence fait quel format ? | 20x20=20x20 / 25x40=25x40 / 30x60=30x60 | faience-mur |
| epaisseur_ragreage | Ton ragréage fait quelle épaisseur ? | 3 mm=3 / 5 mm=5 / 10 mm=10 | ragreage |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : sols et salle de bains d'un appartement.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Dépose de l'ancien revêtement et évacuation | 1 | ens | — |
| 2 | Ragréage autolissant | 42 | m² | ragreage |
| 3 | Carrelage sol grès cérame rectifié | 42 | m² | carrelage-sol |
| 4 | Plinthes assorties | 38 | ml | plinthes-carrelage |
| 5 | Faïence murale salle de bains | 18 | m² | faience-mur |
| 6 | Système de protection à l'eau sous carrelage, douche | 6 | m² | spec-douche |

### Bref

- Sols d'un appartement : ragréage puis carrelage grès cérame rectifié sur 42 m², 38 ml de plinthes assorties.
- Salle de bains : 18 m² de faïence murale, protection à l'eau sous carrelage de la douche sur 6 m² ; dépose hors commande.

### Questions attendues

- `epaisseur_ragreage`
- `format_sol`
- `pose_sol`
- `format_mur`

### Réponses

- `epaisseur_ragreage` = 3
- `format_sol` = 60x60
- `pose_sol` = droite
- `format_mur` = 25x40

### Comptes attendus

Calculs : ragréage 42 × 4,5 = 189 kg ÷ 25 ; carreaux 42 × 1,08 = 45,36 m² ÷ 1,44 ; colle 42 × 5,775 + 18 × 5,775 = 346,5 kg ÷ 25 ;
joint 42 × 0,1045 + 18 × 0,15 = 7,09 kg ÷ 5 ; plinthes 38 × 1,05 = 39,9 m ÷ 0,6 ; faïence 18 × 1,08 = 19,44 m² ÷ 1,5 ; SPEC 6 ×
0,84 = 5,04 kg ; primaires 6,3 kg et 0,9 kg.

| Fourniture | Commande |
|---|---|
| Ragréage autolissant P3 | 8 sacs de 25 kg |
| Primaire d'accrochage | 2 bidons de 5 kg |
| Carreau de sol 60×60 | 32 cartons de 1,44 m² |
| Mortier-colle C2 S1 | 14 sacs de 25 kg |
| Mortier de joint | 2 sacs de 5 kg |
| Plinthe carrelage 8 × 60 | 67 plinthes de 0,6 m |
| Faïence 25×40 | 13 cartons de 1,5 m² |
| Résine de protection à l'eau (SPEC) | 1 seau de 7 kg |
| Primaire avant SPEC | 1 bidon |

## 7. À relire par un carreleur

- Pertes de coupe (5 à 15 % selon format et pose) : usages de métier, non normatifs ; un carton de réserve au-delà de 20 m² n'est
  pas ajouté.
- Cartons par format (30×30 : 1,08 m², 45×45 : 1,62, faïence 20×20 : 1, 25×40 : 1,5, 30×60 : 1,44) : le carton réel est celui de la
  référence du devis ; seuls 60×60 et 60×120 sont sourcés (1,44 m²).
- Colle en double encollage au sol pour tout grès cérame > 500 cm² (5,5 kg/m²) ; une colle fluide en simple encollage en
  demande 4 kg/m².
- Joint : largeur 2 mm (rectifié) ou 3 mm (pressé), épaisseur du carreau ; joint époxy non distingué.
- SPEC : surface de la douche seulement ; bandes d'angle et pièces (angles, platines) à ajouter selon la douche (kit).

## 8. Sources

- S1 : Cartons de grès cérame 60×60 : 1,44 m² (Brico Dépôt LOU 60×60, Bricomarché) ; 60×120 : 1,44 m² (Brico Dépôt Calacatta) ; autres formats : à vérifier sur la référence.
- S2 : Pertes de coupe par format et par pose : référentiel du 3 octobre §5.2, usages de métier à vérifier par un carreleur.
- S3 : weber.col flex éco (C2 S1 ET), sac de 25 kg : 3 kg/m² simple encollage peigne 6, 4 à 5,5 kg/m² peigne 9, 5 à 6,5 kg/m² demi-lune (Matériaux Online, CGMat).
- S4 : NF DTU 52.2 (via fiche Vicat, Batirama) : double encollage au sol si carreau > 500 cm² peu poreux, en mur si > 500 cm² ; + 5 % de reste au fond des seaux (à vérifier).
- S5 : Formule Weber du joint : 1,5 × épaisseur × largeur × (L + l) ÷ (L × l) ; weber.joint fin en sac de 5 kg ; + 10 % au lavage (à vérifier) ; contrôle Vicat V650 30×30 = 0,28 kg/m².
- S6 : Plinthe carrelage 8 × 60 (0,60 m par pièce), + 5 % : référentiel du 3 octobre §5.6.
- S7 : weber.sys protec (avis technique 13/12-1153) : 2 couches croisées de 400 g/m², seaux de 7 et 20 kg ; primaire weber.prim RP 100 à 200 g/m², bidon de 1 kg dans le kit.
- S8 : weber.niv pro / elit : 1,5 kg/m² par mm, sac de 25 kg, minimum 3 mm sous carrelage ; primaire 0,15 kg/m² (bidon de 5 kg à vérifier).
