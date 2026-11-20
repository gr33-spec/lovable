# Sarking : résumé de la recherche (20 novembre 2026)

Données, sources et extraits : `sarking.json` (21 entrées : 8 confirmées, 11 à une source, 2 à confirmer ; 3 verdicts ; 5 fiches comptoir).
Famille `sarking`, pas encore branchée dans `FAMILLES` de `construire_fiche.py`. Les écrans, pare-vapeur et larmiers restent dans `ecrans-etancheite.json`.

## Ce qui est sûr

| Donnée | Valeur | Statut |
| --- | --- | --- |
| Panneau PIR / PU | 2400 × 1200 mm (Efisarking 2410 × 1200) | confirmé (5 marques) |
| Surface utile | 2,81 à 2,86 m² (Recticel, Unilin 2380 × 1180 ; Edilians 2385 × 1185 ; Soprema 2400 × 1190) | confirmé |
| Steico (fibre de bois) | 1880 × 600, net 1855 × 575 = 1,067 m² | confirmé |
| Longueur de vis | contre-latte + isolant + support + 60 mm d'ancrage | confirmé (Edilians, Terreal, Rockwool, Steico) |
| Ancrage dans le chevron | 60 mm minimum | confirmé |
| Vis au m² | ≈ 2 en plaine (chevrons 60 cm, neige ≤ 55 daN/m²), soit ≈ 1,2 par ml de contre-latte + 1 par bout ; 3 à 6 en montagne ou laine de roche | confirmé (SFS/Steico, Simpson) |
| Contre-latte | 27 × 60 (couverture < 46 kg/m²) ou 40 × 60 | confirmé |
| Butée / sabot d'égout | 1 ml par ml d'égout, hauteur = épaisseur d'isolant | confirmé |

Par modèle (une source, fiche du fabricant lue chez un négoce) : Unilin Utherm Sarking K (R ACERMI 2,75 à 7,40 de 60 à 160 mm, 6 à 2 plaques par colis), L Comfort (2511 × 611), Recticel Eurotoit (60 / 88 / 110 / 132 / 160 mm), Powerroof Max (Belgique), Soprema Efisarking (65 à 160 mm, tableau des vis Efivis), Edilians Sarkéo Feu, Steico universal dry (R 0,75 à 2,30, pente ≥ 14°).

## Adhésif de jonction
Terreal : 1,5 ml/m², rouleau 45 m × 5 cm ; Soprema Efibande Butyle 20 m × 75 mm (colis de 8). Le calcul des seuls joints donne 1,27 ml/m² (panneau 2400 × 1200), 1,83 (1200 × 1000).

## Verdicts
- `referentiel-couverture.md` §6 « m² × 1,03 / surface panneau » : **corrigé**, diviser par la surface UTILE ; le 1,03 n'a pas de source.
- Vis (longueur, nombre) : absentes du code, règles proposées.

## Reste à confirmer
- Nombre minimal de vis par contre-latte (2 chez Terreal, 3 chez Simpson).
- Tableau d'entraxe des chevrons Terreal NRJ+ (PDF mal lisible).
- Bretagne : vent côtier ; demander l'abaque du fabricant de vis pour la zone de vent.
