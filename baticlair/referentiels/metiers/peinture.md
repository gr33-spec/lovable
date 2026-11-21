---
code: peinture
metier: painting
nom: Peinture - finitions
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/peintre.md
---

# Fiche métier : peinture - finitions (format commun, §52)

Tirée du référentiel peintre du 3 octobre 2026 (`docs/referentiels/peintre.md`, sections 2, 4 et 5 : fiches Seigneurie,
Toupret, Zolpan, Tollens ; NF DTU 59.1, 59.4, 42.1). Règle d'or du métier : jamais un m² ni un litre en vrac ; le m² du devis
devient des seaux de peinture, des sacs d'enduit, des rouleaux de toile ou de papier, des seaux de colle, arrondis au
conditionnement entier à la toute fin.

## 1. Unités et vocabulaire du devis

Unités du devis : m² (murs, plafonds, boiseries au développé, façade), u (portes, radiateurs : telles qu'écrites, la fiche ne
convertit pas encore les points singuliers en m² développés).
Mots du métier : « impression », « sous-couche » ; « 2 couches », « monocouche » ; « mat », « velours », « satin » ;
« ratissage », « lissage », « enduit 2 passes » ; « toile de verre », « intissé à peindre » ; « papier peint » ; « ravalement »,
« D2 », « Pliolite » ; « démoussage », « anti-mousse ».
Le nombre de couches, l'impression et les passes d'enduit écrits vont dans « donnees » (`couches`, `impression`,
`passes_enduit`). La teinte et la marque sont celles du devis : la fiche n'en compte que les quantités. Hors commande :
lessivage, ponçage, protection, main-d'œuvre.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| peinture-interieure | Peinture murs et plafonds | m² | « Peinture murs », « peinture plafonds », « peinture acrylique mate », « peinture velours » |
| laque-boiseries | Laque boiseries | m² | « Laque boiseries », « peinture boiseries », « laque satin » |
| enduit-lissage | Enduit de lissage | m² | « Enduit de lissage », « ratissage », « enduit repassé » |
| toile-de-verre | Toile de verre posée | m² | « Toile de verre », « pose de toile de verre », « intissé à peindre » |
| papier-peint | Papier peint posé | m² | « Papier peint », « pose de papier peint », « tapisserie » |
| facade-d2 | Peinture de façade D2 | m² | « Peinture façade », « ravalement peinture D2 », « peinture Pliolite » |
| demoussage | Traitement anti-mousse | m² | « Traitement anti-mousse », « démoussage », « traitement fongicide » |

## 3. Ratios

Peinture intérieure : rendement retenu 10 m²/L par couche (Pantex mat 9 à 12), + 5 % au rouleau ; impression 9 m²/L
(Practi Prim 8 à 10), + 5 %. Laque : 12 m²/L par couche, + 10 % (fonds de pot), impression comprise dans la première couche.
Enduit de lissage poudre : 0,40 kg/m² par passe (Toupret F : 25 kg pour 60 à 75 m²), + 10 %. Toile de verre : rouleau de 50 m²,
+ 10 % ; colle 0,22 kg/m², + 10 %. Papier peint : rouleau de 10,05 × 0,53 m (5,3 m²), lés et chutes + 15 % ; colle 0,2 kg/m²,
+ 10 %. Façade D2 : 7 m²/L par couche sur enduit gratté (k = 0,85), 2 couches, + 5 %. Anti-mousse : 4 m²/L, une passe.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| peinture-interieure | Peinture acrylique murs et plafonds | 0,105 | L | couches=1 | usuel | S1 S8 |
| peinture-interieure | Peinture acrylique murs et plafonds | 0,21 | L | couches=2 | usuel | S1 S8 |
| peinture-interieure | Peinture acrylique murs et plafonds | 0,315 | L | couches=3 | usuel | S1 S8 |
| peinture-interieure | Impression acrylique | 0,1167 | L | impression=oui | usuel | S2 S8 |
| laque-boiseries | Laque acrylique satin boiseries | 0,0917 | L | couches=1 | usuel | S3 S8 |
| laque-boiseries | Laque acrylique satin boiseries | 0,1833 | L | couches=2 | usuel | S3 S8 |
| laque-boiseries | Laque acrylique satin boiseries | 0,275 | L | couches=3 | usuel | S3 S8 |
| enduit-lissage | Enduit de lissage en poudre | 0,44 | kg | passes_enduit=1 | à vérifier | S4 S8 |
| enduit-lissage | Enduit de lissage en poudre | 0,88 | kg | passes_enduit=2 | à vérifier | S4 S8 |
| toile-de-verre | Toile de verre à peindre, rouleau de 50 m² | 1,1 | m² | — | à vérifier | S5 S8 |
| toile-de-verre | Colle toile de verre | 0,242 | kg | — | usuel | S5 |
| papier-peint | Papier peint, rouleau de 10,05 × 0,53 m | 1,15 | m² | — | à vérifier | S6 |
| papier-peint | Colle papier peint | 0,22 | kg | — | à vérifier | S6 |
| facade-d2 | Peinture façade D2 | 0,353 | L | — | à vérifier | S7 S8 |
| demoussage | Anti-mousse | 0,25 | L | — | à vérifier | S7 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source | Consommable |
|---|---|---|---|---|---|---|
| Peinture acrylique murs et plafonds | seau | 15 | L | sûr | S1 | non |
| Impression acrylique | seau | 15 | L | sûr | S2 | non |
| Laque acrylique satin boiseries | pot | 1 | L | sûr | S3 | non |
| Enduit de lissage en poudre | sac | 25 | kg | sûr | S4 | non |
| Toile de verre à peindre, rouleau de 50 m² | rouleau | 50 | m² | sûr | S5 | non |
| Colle toile de verre | seau | 20 | kg | sûr | S5 | non |
| Papier peint, rouleau de 10,05 × 0,53 m | rouleau | 5,3 | m² | sûr | S6 | non |
| Colle papier peint | seau | 10 | kg | à vérifier | S6 | non |
| Peinture façade D2 | seau | 15 | L | sûr | S7 | non |
| Anti-mousse | bidon | 20 | L | à vérifier | S7 | non |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| couches | Tu passes combien de couches de finition ? | 1 couche=1 / 2 couches=2 / 3 couches=3 | peinture-interieure, laque-boiseries |
| impression | Tu passes une couche d'impression avant ? | Impression=oui / Sans impression=non | peinture-interieure |
| passes_enduit | Ton enduit, tu le passes combien de fois ? | 1 passe=1 / 2 passes=2 | enduit-lissage |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : rénovation d'un appartement.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Protection des sols et lessivage | 1 | ens | — |
| 2 | Enduit de lissage, ratissage murs | 120 | m² | enduit-lissage |
| 3 | Peinture murs et plafonds | 170 | m² | peinture-interieure |
| 4 | Laque boiseries | 20 | m² | laque-boiseries |
| 5 | Toile de verre, chambre | 30 | m² | toile-de-verre |

### Bref

- Rénovation d'un appartement : ratissage des murs sur 120 m², peinture des murs et plafonds sur 170 m².
- Laque sur 20 m² de boiseries, toile de verre sur 30 m² dans une chambre ; protection et lessivage hors commande.

### Questions attendues

- `passes_enduit`
- `couches`
- `impression`

### Réponses

- `passes_enduit` = 1
- `couches` = 2
- `impression` = oui

### Comptes attendus

Calculs : enduit 120 × 0,44 = 52,8 kg ÷ 25 ; peinture 170 × 0,21 = 35,7 L ÷ 15 ; impression 170 × 0,1167 = 19,84 L ÷ 15 ;
laque 20 × 0,1833 = 3,67 L ; toile 33 m² ÷ 50 ; colle 30 × 0,242 = 7,26 kg ÷ 20.

| Fourniture | Commande |
|---|---|
| Enduit de lissage en poudre | 3 sacs de 25 kg |
| Peinture acrylique murs et plafonds | 3 seaux de 15 L |
| Impression acrylique | 2 seaux de 15 L |
| Laque acrylique satin boiseries | 4 pots |
| Toile de verre à peindre, rouleau de 50 m² | 1 rouleau de 50 m² |
| Colle toile de verre | 1 seau de 20 kg |

## 7. À relire par un peintre

- Rendements retenus (mat 10, impression 9, laque 12, façade 7 m²/L par couche) : milieu de fourchette des fiches ; la marque
  de l'artisan change tout (6,5 à 12 m²/L, référentiel §7.1).
- Pertes : 5 % au rouleau, 20 % à l'airless (non distingué ici : une question à ajouter si un peintre projette souvent),
  10 % pour la laque ; teinte foncée ou vive : une couche de plus, non comptée.
- Enduit : 0,40 kg/m² par passe pour un lissage poudre ; garnissant (1 kg/m²), révision (0,15) et rebouchage (0,05) non
  distingués.
- Toile de verre : la peinture sur toile n'est comptée que si une ligne de peinture l'écrit (règle numéro un) ; consommation
  majorée sur toile (k = 0,75 à 0,85) non appliquée.
- Papier peint : + 15 % pour les lés et le raccord (calcul exact par lés, §5.5 du référentiel, à brancher quand la hauteur est
  lue) ; colle 0,2 kg/m².
- Façade : classes I1 à I4 non calculées (fiche système obligatoire) ; anti-mousse 4 m²/L.
- Points singuliers (portes, radiateurs, plinthes comptés à l'unité ou au mètre) : sortis tels qu'écrits, sans conversion en
  m² développés (§9.1 du référentiel, entièrement à vérifier).

## 8. Sources

- S1 : Seigneurie Pantex Mat (rendement 9 à 12 m²/L par couche, 1 - 5 - 15 L) et Gauthier Super G Mat (8 à 11 m²/L,
  1 - 5 - 15 L), fiches fabricant ; référentiel peintre du 3 octobre §4.1.
- S2 : Seigneurie Practi Prim et Muroprim (impression 8 à 10 m²/L, 5 - 15 L), fiches fabricant ; référentiel peintre §4.2.
- S3 : Laques satin acryliques : Seigneurie Elyopur (11 à 13 m²/L, 1 L), Tollens Laque Boiseries Satin (≈ 14 m²/L, 0,5 - 2 L),
  Comus Styl'Laque (12 à 16 m²/L, 1 - 3 - 10 L) ; référentiel peintre §4.3.
- S4 : Toupret F (300 g/m²/mm ; 25 kg pour 60 à 75 m² par passe, sac de 15 et 25 kg) ; référentiel peintre §4.4 et §5.4.
- S5 : Toile de verre en rouleaux de 25 et 50 m² (Brikadeco) ; colles Zolpan Quelyd TDV et Tollens colle chantier (150 à
  250 g/m², seaux de 5 à 20 kg) ; référentiel peintre §4.5 et §5.6.
- S6 : Papier peint en rouleau de 10,05 × 0,53 m (NF EN 12956) ; colle ≈ 0,2 kg/m² prête à l'emploi, à vérifier par fiche ;
  référentiel peintre §4.5 et §5.5.
- S7 : Façade D2 : Seigneurie Pancryl (6 à 9 m²/L), Tollens Tol-Façade Pliolite (8 m²/L, 5 - 15 L) ; anti-mousse ≈ 4 à 5 m²/L,
  bidons de 5 et 20 L, à vérifier ; référentiel peintre §4.6 et §5.7.
- S8 : Pertes et coefficients de support (rouleau 5 %, laque 10 %, enduit et toile 10 %, enduit gratté k = 0,85) : référentiel
  peintre du 3 octobre §5.3, tous à vérifier par un peintre.
