---
code: serrurerie
metier: metalwork
nom: Serrurerie - métallerie
etat: brouillon
version: 2026-10-19
moteur: fiche
---

# Fiche métier : serrurerie - métallerie (format commun, §52)

Nouveau métier (aucun tiroir avant le 19 octobre 2026). Recherche du 19 octobre : NF P01-012 (garde-corps : hauteur 1 m,
vide entre barreaux ≤ 11 cm, fiche AQC A02), tubes acier S235 en barres de 6 m chez les négoces, panneaux rigides de clôture
(gammes négoce Bigmat, Dirickx, Chausson), cartouches de scellement chimique de 300 ml. Règle d'or : le ml ou le m² du devis
devient des barres de 6 m, des panneaux, des poteaux, des pots ; ce qui est fabriqué ou acheté fini (portail, portillon,
escalier) sort tel qu'écrit.

## 1. Unités et vocabulaire du devis

Unités du devis : ml (garde-corps, clôture), m² (grille de défense), u (portail, portillon, escalier, pièces finies : tels
qu'écrits).
Mots du métier : « garde-corps à barreaudage », « barreaux verticaux », « main courante », « lisse » ; « grille de défense »,
« barreaudage de fenêtre » ; « clôture en panneaux rigides », « panneaux soudés », « poteaux à encoches » ; « galvanisé »,
« thermolaqué », « antirouille ».
La hauteur de clôture (« 1,53 m ») et la finition écrites vont dans « donnees » (`hauteur_cloture`, `finition`). La
galvanisation et le thermolaquage sont sous-traités : hors commande de fourniture. Hors commande : main-d'œuvre, pose,
transport.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| garde-corps-barreaude | Garde-corps acier à barreaudage | ml | « Garde-corps acier à barreaudage », « garde-corps barreaux verticaux », « garde-corps métallique » |
| grille-defense | Grille de défense acier | m² | « Grille de défense acier », « barreaudage de fenêtre », « grille de protection » |
| cloture-panneaux | Clôture en panneaux rigides | ml | « Clôture en panneaux rigides », « clôture panneaux soudés », « clôture rigide » |

## 3. Ratios

Garde-corps (NF P01-012) : hauteur 1 m ; barreaux carrés de 20 mm à 13 cm d'entraxe (vide de 11 cm), 0,9 m chacun entre
lisses, soit 7,7 barreaux et 6,9 m par ml ; main courante et lisse basse 1 m chacune par ml ; poteaux tous les 1,5 m
(1,1 m chacun, 0,73 m par ml) ; chutes + 5 % sur les barres. Grille de défense : barreaux à 12 cm d'entraxe (8,3 ml par m²)
et deux traverses (2 ml par m²), + 5 %. Clôture : panneaux de 2,50 m, un poteau par panneau (+ 1 en bout de ligne, non
compté). Antirouille et laque : 10 m²/L par couche sur 0,35 m² d'acier par ml de garde-corps.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| garde-corps-barreaude | Tube carré acier 20 × 20 (barreaux) | 7,27 | m | — | à vérifier | S1 S2 |
| garde-corps-barreaude | Tube carré acier 40 × 40 (main courante, lisse, poteaux) | 2,87 | m | — | à vérifier | S1 S2 |
| garde-corps-barreaude | Platine acier 150 × 150 × 8 | 0,67 | u | — | à vérifier | S1 |
| garde-corps-barreaude | Scellement chimique, cartouche de 300 ml | 0,03 | u | — | à vérifier | S4 |
| garde-corps-barreaude | Primaire antirouille | 0,035 | L | finition=peint | usuel | S5 |
| garde-corps-barreaude | Laque glycéro métal | 0,07 | L | finition=peint | usuel | S5 |
| grille-defense | Carré plein acier 14 × 14 (barreaux) | 8,75 | m | — | à vérifier | S1 S2 |
| grille-defense | Fer plat acier 30 × 8 (traverses) | 2,1 | m | — | à vérifier | S2 |
| cloture-panneaux | Panneau rigide 2,50 × 1,03 m | 0,4 | u | hauteur_cloture=1.03 | sûr | S3 |
| cloture-panneaux | Panneau rigide 2,50 × 1,23 m | 0,4 | u | hauteur_cloture=1.23 | sûr | S3 |
| cloture-panneaux | Panneau rigide 2,50 × 1,53 m | 0,4 | u | hauteur_cloture=1.53 | sûr | S3 |
| cloture-panneaux | Panneau rigide 2,50 × 1,73 m | 0,4 | u | hauteur_cloture=1.73 | sûr | S3 |
| cloture-panneaux | Panneau rigide 2,50 × 1,93 m | 0,4 | u | hauteur_cloture=1.93 | sûr | S3 |
| cloture-panneaux | Poteau de clôture à encoches | 0,4 | u | — | usuel | S3 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source | Consommable |
|---|---|---|---|---|---|---|
| Tube carré acier 20 × 20 (barreaux) | barre | 6 | m | sûr | S2 | non |
| Tube carré acier 40 × 40 (main courante, lisse, poteaux) | barre | 6 | m | sûr | S2 | non |
| Platine acier 150 × 150 × 8 | pièce | 1 | u | sûr | S1 | non |
| Scellement chimique, cartouche de 300 ml | cartouche | 1 | u | sûr | S4 | oui |
| Primaire antirouille | pot | 1 | L | usuel | S5 | non |
| Laque glycéro métal | pot | 1 | L | usuel | S5 | non |
| Carré plein acier 14 × 14 (barreaux) | barre | 6 | m | sûr | S2 | non |
| Fer plat acier 30 × 8 (traverses) | barre | 6 | m | sûr | S2 | non |
| Panneau rigide 2,50 × 1,03 m | panneau | 1 | u | sûr | S3 | non |
| Panneau rigide 2,50 × 1,23 m | panneau | 1 | u | sûr | S3 | non |
| Panneau rigide 2,50 × 1,53 m | panneau | 1 | u | sûr | S3 | non |
| Panneau rigide 2,50 × 1,73 m | panneau | 1 | u | sûr | S3 | non |
| Panneau rigide 2,50 × 1,93 m | panneau | 1 | u | sûr | S3 | non |
| Poteau de clôture à encoches | poteau | 1 | u | sûr | S3 | non |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| finition | Ton garde-corps, il est fini comment ? | Peint=peint / Galvanisé=galva / Thermolaqué=thermo | garde-corps-barreaude |
| hauteur_cloture | Tes panneaux de clôture font quelle hauteur ? | 1,03 m=1.03 / 1,23 m=1.23 / 1,53 m=1.53 / 1,73 m=1.73 / 1,93 m=1.93 | cloture-panneaux |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : métallerie d'une maison.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Garde-corps acier à barreaudage, terrasse | 12 | ml | garde-corps-barreaude |
| 2 | Grille de défense acier, fenêtres du rez-de-chaussée | 4 | m² | grille-defense |
| 3 | Clôture en panneaux rigides | 30 | ml | cloture-panneaux |
| 4 | Pose et réglages | 1 | ens | — |

### Bref

- Métallerie d'une maison : garde-corps à barreaudage sur 12 ml de terrasse, grilles de défense sur 4 m² de fenêtres.
- Clôture en panneaux rigides sur 30 ml ; pose et réglages hors commande.

### Questions attendues

- `finition`
- `hauteur_cloture`
- `consommables`

### Réponses

- `finition` = peint
- `hauteur_cloture` = 1.53
- `consommables` = 1

### Comptes attendus

Calculs : barreaux 12 × 7,27 = 87,2 m ÷ 6 ; tube 40 × 40 12 × 2,87 = 34,4 m ÷ 6 ; platines 12 × 0,67 = 8,04 → 9 ;
cartouches 0,36 → 1 ; antirouille 0,42 L ; laque 0,84 L ; carré plein 4 × 8,75 = 35 m ÷ 6 ; plat 8,4 m ÷ 6 ;
panneaux et poteaux 30 × 0,4 = 12.

| Fourniture | Commande |
|---|---|
| Tube carré acier 20 × 20 (barreaux) | 15 barres de 6 m |
| Tube carré acier 40 × 40 (main courante, lisse, poteaux) | 6 barres de 6 m |
| Platine acier 150 × 150 × 8 | 9 pièces |
| Scellement chimique, cartouche de 300 ml | 1 cartouche |
| Primaire antirouille | 1 pot |
| Laque glycéro métal | 1 pot |
| Carré plein acier 14 × 14 (barreaux) | 6 barres de 6 m |
| Fer plat acier 30 × 8 (traverses) | 2 barres de 6 m |
| Panneau rigide 2,50 × 1,53 m | 12 panneaux |
| Poteau de clôture à encoches | 12 poteaux |

## 7. À relire par un serrurier-métallier

- Garde-corps : barreaux de 20 mm à 13 cm d'entraxe, poteaux tous les 1,5 m, profils 40 × 40 : un dessin type, pas une note de
  calcul (la tenue aux efforts de la NF P01-013 n'est pas vérifiée ici). La zone pleine des 45 premiers centimètres (escalade)
  n'est pas comptée.
- Platines et scellement : une platine par poteau (une de plus en bout, non comptée), 4 chevilles par platine ; cartouche de
  300 ml pour ≈ 95 trous Ø 12 sur 90 mm (calcul indicatif, pas de fiche fabricant trouvée).
- Clôture : un poteau par panneau, le poteau de bout de ligne et les poteaux d'angle ne sont pas comptés (une ligne de plus
  par tronçon) ; les clips et les platines sont souvent livrés avec le poteau.
- Peinture du garde-corps : 0,35 m² d'acier par ml (la grille de défense, souvent galvanisée, n'en sort pas), à 10 m²/L par couche (une couche d'antirouille,
  deux de laque) : à confirmer.
- Les sections (tube 40 × 40, plat 30 × 8, carré plein 14) sont les plus courantes ; le devis qui les écrit fait foi (une
  question à ajouter si les serruriers les varient souvent).

## 8. Sources

- S1 : NF P01-012 (révisée le 22 novembre 2024) : hauteur 1 m, vide entre barreaux verticaux ≤ 11 cm, entre lisses ≤ 18 cm,
  zone pleine sur 45 cm ; fiche qualité réglementaire AQC A02 (qualiteconstruction.com), synthèses Horizal et Saint-Gobain,
  consultées le 19 octobre 2026.
- S2 : Tubes et profils acier S235 en barres de 6 m chez les négoces (Mecafluid 20 × 20 × 1,5 et 2 mm, BM Steel 20 × 20 × 1,5,
  0,84 kg/m) ; les grandes surfaces vendent du 1 ou 2 m ; consultés le 19 octobre 2026.
- S3 : Panneaux rigides de 2,50 m en hauteurs 1,03 / 1,23 / 1,53 / 1,73 / 1,93 m (fiche Geno, Bigmat) ; poteaux à encoches
  (Dirickx AXIS, entraxe 2,535 m) ; consultés le 19 octobre 2026.
- S4 : Scellement chimique en cartouche de 300 ml (Legallais Charcot II : kit cartouche + 4 tiges M10) ; consommation par
  trou non publiée, estimée par le volume annulaire : à vérifier.
- S5 : Rendements de primaire antirouille et de laque métal (≈ 8 à 12 m²/L par couche) : référentiel peintre du 3 octobre
  §4.3 et §6.1.
