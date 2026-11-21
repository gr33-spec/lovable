---
code: facade
metier: facade
nom: Ravalement - ITE
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/facadier.md
---

# Fiche métier : ravalement - ITE (format commun, §52)

Tirée du référentiel façadier du 3 octobre 2026 (`docs/referentiels/facadier.md`, sections 2, 4 et 5 : fiches Weber, PRB,
Baumit, Point.P, Hirsch ; NF DTU 26.1, CPT 3035, NF DTU 42.1). Règle d'or du métier : le devis parle en m², le négoce livre des
sacs, des seaux, des colis d'isolant, des boîtes de chevilles et des rouleaux ; aucune ligne ne sort en m².

## 1. Unités et vocabulaire du devis

Unités du devis : m² (enduit, ITE, finition, peinture, nettoyage), ml (angles, tableaux, pied de façade : tels qu'écrits),
u (appuis, bavettes : tels qu'écrits).
Mots du métier : « enduit monocouche », « OC1 », « OC2 », « gratté », « taloché » ; « ITE », « isolation par l'extérieur »,
« PSE graphite », « 140 mm » ; « RPE », « crépi », « finition organique », « grain 1,5 » ; « peinture façade », « D2 » ;
« démoussage », « antimousse ».
Le support (« sur parpaing »), la finition (« gratté »), l'épaisseur d'isolant (« 140 mm ») et le grain (« grain 2 ») écrits
vont dans « donnees » (`support_enduit`, `finition_enduit`, `epaisseur_ite`, `grain_rpe`). Le coloris est celui du devis.
Hors commande : échafaudage (location), nettoyage haute pression, main-d'œuvre, protection.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| enduit-monocouche | Enduit monocouche de façade | m² | « Enduit monocouche », « enduit de façade gratté », « enduit monocouche OC2 » |
| ite-pse | Isolation par l'extérieur sous enduit mince (PSE) | m² | « Isolation thermique par l'extérieur PSE », « ITE polystyrène graphité », « ITE sous enduit » |
| rpe | Revêtement plastique épais (finition en pâte) | m² | « Revêtement plastique épais », « RPE taloché », « finition organique » |
| peinture-facade | Peinture de façade D2 | m² | « Peinture de façade D2 », « peinture façade Pliolite », « peinture siloxane façade » |
| demoussage | Traitement antimousse | m² | « Traitement antimousse », « démoussage façade », « traitement fongicide » |

## 3. Ratios

Monocouche (fiche weber.pral F, milieu de fourchette) : sur maçonnerie 27 kg/m² gratté, 23,5 taloché ; sur béton ou
sous-enduit 16 gratté, 13,5 taloché ; + 5 % (machine). ITE : plaques 1200 × 600 (0,72 m²) + 5 % de coupes, colis selon
l'épaisseur ; mortier colle et sous-enduit (même produit) 3,5 + 7,5 kg/m², + 5 % ; chevilles 7 par m², + 5 %, longueur
isolant + 60 mm ; treillis 1,1 m² par m² ; finition talochée 2,5 kg/m², + 10 %. RPE (Baumit) : 2,5 / 2,9 / 3,9 kg/m² en grain
1,5 / 2 / 3, + 10 %. Peinture : 2 couches à 7 m²/L, + 5 %. Antimousse : 5 m²/L.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| enduit-monocouche | Enduit monocouche | 28,35 | kg | support_enduit=maconnerie et finition_enduit=gratte | usuel | S1 S7 |
| enduit-monocouche | Enduit monocouche | 24,68 | kg | support_enduit=maconnerie et finition_enduit=taloche | usuel | S1 S7 |
| enduit-monocouche | Enduit monocouche | 16,8 | kg | support_enduit=beton et finition_enduit=gratte | usuel | S1 S7 |
| enduit-monocouche | Enduit monocouche | 14,18 | kg | support_enduit=beton et finition_enduit=taloche | usuel | S1 S7 |
| ite-pse | PSE graphite ITE 1200 × 600 × 100 mm | 1,05 | m² | epaisseur_ite=100 | à vérifier | S2 S3 S7 |
| ite-pse | PSE graphite ITE 1200 × 600 × 120 mm | 1,05 | m² | epaisseur_ite=120 | à vérifier | S2 S3 S7 |
| ite-pse | PSE graphite ITE 1200 × 600 × 140 mm | 1,05 | m² | epaisseur_ite=140 | à vérifier | S2 S3 S7 |
| ite-pse | PSE graphite ITE 1200 × 600 × 160 mm | 1,05 | m² | epaisseur_ite=160 | à vérifier | S2 S3 S7 |
| ite-pse | Mortier colle et sous-enduit ITE | 11,55 | kg | — | usuel | S2 |
| ite-pse | Cheville à frapper ITE 160 mm | 7,35 | u | epaisseur_ite=100 | à vérifier | S4 |
| ite-pse | Cheville à frapper ITE 180 mm | 7,35 | u | epaisseur_ite=120 | à vérifier | S4 |
| ite-pse | Cheville à frapper ITE 200 mm | 7,35 | u | epaisseur_ite=140 | à vérifier | S4 |
| ite-pse | Cheville à frapper ITE 220 mm | 7,35 | u | epaisseur_ite=160 | à vérifier | S4 |
| ite-pse | Treillis d'armature fibre de verre | 1,1 | m² | — | usuel | S4 |
| ite-pse | Finition organique talochée | 2,75 | kg | — | usuel | S5 |
| rpe | Revêtement plastique épais | 2,75 | kg | grain_rpe=1.5 | sûr | S5 |
| rpe | Revêtement plastique épais | 3,19 | kg | grain_rpe=2 | sûr | S5 |
| rpe | Revêtement plastique épais | 4,29 | kg | grain_rpe=3 | sûr | S5 |
| peinture-facade | Peinture façade D2 | 0,3 | L | — | à vérifier | S6 S7 |
| demoussage | Antimousse façade | 0,2 | L | — | à vérifier | S7 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source | Consommable |
|---|---|---|---|---|---|---|
| Enduit monocouche | sac | 25 | kg | sûr | S1 | non |
| PSE graphite ITE 1200 × 600 × 100 mm | colis | 3,6 | m² | à vérifier | S3 | non |
| PSE graphite ITE 1200 × 600 × 120 mm | colis | 2,88 | m² | à vérifier | S3 | non |
| PSE graphite ITE 1200 × 600 × 140 mm | colis | 2,16 | m² | sûr | S3 | non |
| PSE graphite ITE 1200 × 600 × 160 mm | colis | 2,16 | m² | à vérifier | S3 | non |
| Mortier colle et sous-enduit ITE | sac | 25 | kg | sûr | S2 | non |
| Cheville à frapper ITE 160 mm | boîte | 100 | u | sûr | S4 | non |
| Cheville à frapper ITE 180 mm | boîte | 100 | u | sûr | S4 | non |
| Cheville à frapper ITE 200 mm | boîte | 100 | u | sûr | S4 | non |
| Cheville à frapper ITE 220 mm | boîte | 100 | u | sûr | S4 | non |
| Treillis d'armature fibre de verre | rouleau | 50 | m² | sûr | S4 | non |
| Finition organique talochée | seau | 25 | kg | sûr | S5 | non |
| Revêtement plastique épais | seau | 25 | kg | sûr | S5 | non |
| Peinture façade D2 | seau | 15 | L | sûr | S6 | non |
| Antimousse façade | bidon | 20 | L | usuel | S7 | non |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| support_enduit | Ton enduit va sur quel support ? | Maçonnerie=maconnerie / Béton ou sous-enduit=beton | enduit-monocouche |
| finition_enduit | Ton enduit, tu le finis comment ? | Gratté=gratte / Taloché=taloche | enduit-monocouche |
| epaisseur_ite | Ton isolant fait quelle épaisseur ? | 100 mm=100 / 120 mm=120 / 140 mm=140 / 160 mm=160 | ite-pse |
| grain_rpe | Ton RPE, il a quel grain ? | Grain 1,5=1.5 / Grain 2=2 / Grain 3=3 | rpe |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : ravalement et ITE d'une maison.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Échafaudage, location et montage | 1 | ens | — |
| 2 | Traitement antimousse | 120 | m² | demoussage |
| 3 | Enduit monocouche, pignon | 80 | m² | enduit-monocouche |
| 4 | Isolation thermique par l'extérieur PSE | 100 | m² | ite-pse |

### Bref

- Ravalement et ITE d'une maison : antimousse sur 120 m², enduit monocouche sur le pignon (80 m²).
- ITE PSE sous enduit mince sur 100 m² ; échafaudage hors commande (location).

### Questions attendues

- `support_enduit`
- `finition_enduit`
- `epaisseur_ite`

### Réponses

- `support_enduit` = maconnerie
- `finition_enduit` = gratte
- `epaisseur_ite` = 140

### Comptes attendus

Calculs : antimousse 120 × 0,2 = 24 L ÷ 20 ; monocouche 80 × 28,35 = 2 268 kg ÷ 25 ; PSE 105 m² ÷ 2,16 ; mortier 1 155 kg ÷ 25 ;
chevilles 735 ÷ 100 ; treillis 110 m² ÷ 50 ; finition 275 kg ÷ 25.

| Fourniture | Commande |
|---|---|
| Antimousse façade | 2 bidons de 20 L |
| Enduit monocouche | 91 sacs de 25 kg |
| PSE graphite ITE 1200 × 600 × 140 mm | 49 colis de 2,16 m² |
| Mortier colle et sous-enduit ITE | 47 sacs de 25 kg |
| Cheville à frapper ITE 200 mm | 8 boîtes de 100 u |
| Treillis d'armature fibre de verre | 3 rouleaux de 50 m² |
| Finition organique talochée | 11 seaux de 25 kg |

## 7. À relire par un façadier

- Monocouche : milieu des fourchettes Weber ; épaisseur écrite au devis (kg = S × e × 1,45) non branchée ; tableaux et
  voussures en ml non comptés (+ ml × 0,20 m × conso, §5.2 du référentiel).
- Colis de PSE : 3 plaques en 140 et 160 mm (sourcé en 140), 4 en 120 et 5 en 100 mm (Hirsch « 100-120 : 4-5 », à vérifier
  selon le fabricant).
- Chevilles : 7 par m² en site normal ; 8 à 12 selon vent et hauteur ; renforts d'angle (4 par ml) non comptés. Longueur =
  isolant + 60 mm (ancrage 50, calage 10), à vérifier selon la cheville.
- Rail de départ, cornières d'angle, gouttes d'eau et renfort de soubassement : comptés seulement si le devis les écrit en ml
  (non calculés ici).
- Primaire sous RPE et sous finition (0,15 à 0,25 kg/m²) non compté : souvent imposé par le système.
- Peinture : 7 m²/L par couche (bas de fourchette, façade rugueuse) ; fixateur sur fond farinant non compté.
- Imperméabilité I1 à I4 et enduit chaux sur bâti ancien : pas encore dans la fiche (consommations par système).

## 8. Sources

- S1 : weber.pral F (OC2) : sur maçonnerie 22 à 25 kg/m² rustique ou taloché, 26 à 28 gratté ; sur béton ou sous-enduit 12 à 15
  et 15 à 17 kg/m² ; sac de 25 kg, palette de 48 ; fiche Weber (Quéguiner), référentiel façadier du 3 octobre §4.1.
- S2 : weber.therm XM : collage et calage 2,5 à 4,5 kg/m², sous-enduit 7,5 kg/m² (5 mm) ; sac de 25 kg ; fiche Weber (Gedimat),
  référentiel façadier §4.2.
- S3 : PSE graphite λ 0,031 en 1200 × 600 (Point.P 120 mm, CBA 140 mm) ; colis de 3 plaques en 140 mm (Elaustore) ; Hirsch
  Cellomur Ultra (100-120 mm : 4-5 plaques ; 140-180 : 3) ; référentiel façadier §4.2.
- S4 : Chevilles : 5 par plaque soit 6,9 par m² minimum (Edilteco, DTA), 8 à 12 selon vent (Tollens), défaut 7 par m²
  (Batirama) ; boîtes de 100 (Point.P) ; treillis 1,1 m² par m², rouleau de 50 m² ; référentiel façadier §4.2 et §5.4.
- S5 : Finitions en pâte : webertene XL+ taloché ≈ 2,5 kg/m² ; Baumit gratté 2,5 / 2,9 / 3,9 kg/m² en grain 1,5 / 2 / 3
  (+ 10 % conseillé) ; seaux de 25 kg ; référentiel façadier §4.3 et §5.5.
- S6 : Peinture D2 Pliolite 6 à 11 m²/L par couche selon porosité, seaux de 10 et 15 L (fiche Gedimat 1517, Artilite) ;
  référentiel façadier §4.4 et §5.6.
- S7 : Pertes (enduit machine 5 %, isolant 5 %, peinture 5 %) et antimousse 5 m²/L : référentiel façadier §5.8 et §5.9, à
  vérifier par un façadier.
