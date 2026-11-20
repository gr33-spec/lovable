# Fenêtres de toit : résumé de la recherche (20 novembre 2026)

Données complètes et sources : `fenetres-toit.json` (45 entrées, 6 verdicts, 4 fiches comptoir).
Statuts : 26 confirmées, 6 `confirme_fabricant`, 13 à une seule source, 0 à confirmer (71 % confirmées).

Sources principales : tarif-catalogue VELUX France 2024 (copie CAPEB), fiches techniques des raccords VELUX
06/24 (contenthub.velux.com), guide des tailles VELUX 2026, table Kingspan des tailles Velux / Fakro, fiches
Fakro (fenêtres FTP-V, raccords EZV, EHV, ELV, ELJ), fiche Roto Designo R6, négoces (Castorama, Brico Dépôt).
Le site velux.fr était hors ligne le 20/11/2026 (incident de sécurité) : rien n'a été lu dessus.

## Ce qui est sûr

| Article | Valeur | Statut |
| --- | --- | --- |
| Tailles Velux (cotes hors tout, cm) | CK02 55×78, CK04 55×98, FK06 66×118, MK04 78×98, MK06 78×118, MK08 78×140, MK10 78×160, PK06 94×118, PK08 94×140, PK10 94×160, SK06 114×118, SK08 114×140, UK04 134×98, UK08 134×140 | confirmé (Velux + Kingspan + Fakro) |
| Lecture du code | lettre = largeur (C 55, F 66, M 78, P 94, S 114, U 134) ; chiffre = hauteur (02 78, 04 98, 06 118, 08 140, 10 160) | confirmé |
| Pente, fenêtre à rotation GGL / GGU | 15° à 90° (même règle chez Fakro et Roto) | confirmé |
| Pente, fenêtre à projection GPL / GPU | 15° à 55° | confirmé |
| EDW | tuiles jusqu'à 120 mm de relief, pose standard, 15° ; aussi sur bac acier | confirmé fabricant |
| EDL | ardoises et plats ≤ 8 mm (16 mm en double), pose standard, 15° | confirmé fabricant |
| EDJ / EDN | pose encastrée, tuiles ≤ 90 mm / ardoises < 8 mm, **20°** minimum | confirmé fabricant |
| EDP | tuiles plates de largeur < 300 mm, **25°** minimum | une source (tarif France) |
| BDX, BFX, BBX | un de chaque par fenêtre, à la taille, vendus à part | BDX confirmé fabricant ; BFX, BBX une source |
| Finitions | GGL = bois peint blanc (WhiteFinish), GGU = polyuréthane (EverFinish), ClearFinish = bois verni | confirmé |
| Gammes | 2076 / 0076 Confort, 2057 / 0057 Tout Confort | confirmé |
| Manœuvre | manuelle, électrique INTEGRA (…21), solaire (…30) | confirmé |
| Fakro | mêmes cotes que Velux (code 05 = 78×98, 10 = 114×118) | confirmé |
| Roto | largeurs 54 / 74 / 94 / 114 / 134 : une Roto 7/9 (74×98) ne remplace pas une MK04 | confirmé |

## Ce que le comptoir demande

Fenêtre : taille, rotation ou projection, finition (bois blanc / PU / bois verni), gamme (Confort / Tout
Confort), manœuvre. Raccord : couverture (tuile, ardoise, tuile plate), pose standard ou encastrée, coloris
(gris 0000, ocre 0700C1, rouge-brun 0700C2). Tout se vend à la pièce, à la taille de la fenêtre.

## Verdicts sur le code

- `roofing.ts` FENETRES (11 tailles) : justes ; manquent PK10, UK08, MK10, CK01.
- Choix du raccord (tuiles / ardoises / tuiles plates) : juste ; tuile plate = EDP à 25°, encastré = 20°.
- Suggestions Velux (BDX, BBX…) : justes ; ajouter la collerette d'écran BFX.
- Surface du Velux retirée : utiliser les cotes hors tout (MK04 0,76 m², SK06 1,35 m²).
- « Raccord ZWC » (exemple de00000071) : ZWC est un kit de profilés pour fenêtre sans raccord, pas un
  raccord de couverture ; à revoir avec le fondateur.

## Ce qui reste à confirmer

- Le raccord EDW 0000 vendu en France inclut-il la collerette BFX ? (inclus en Suisse, vendu à part au tarif France 2024).
- EDP, EDS, LSB / LSC, Pack PRO+, ZWC : lus seulement dans le tarif Velux France 2024.
- Stock des tailles FK06 et MK10 en négoce breton (absentes du tableau de prix GGL France).
- Tarif Velux 2026 non lisible (page renvoyée en HTML) : vérifier qu'aucune référence n'a changé depuis 2024.
