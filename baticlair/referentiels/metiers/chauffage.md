---
code: chauffage
metier: hvac
nom: Chauffage - PAC - VMC
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/chauffage-pac-ventilation.md
---

# Fiche métier : chauffage, pompes à chaleur, ventilation (format commun, §52)

Tirée du référentiel chauffage-PAC-ventilation du 3 octobre 2026 (`docs/referentiels/chauffage-pac-ventilation.md`, sections
2 à 5 ; notices Daikin, NF DTU 65.14, 65.16, 68.3) et du référentiel VMC (`ventilation-vmc.md`). Règle d'or du métier : aucune
ligne en m², en m³/h ni en kW ; on commande des couronnes, des barres, des cartons, des kits. Les appareils (PAC, groupes,
unités intérieures, caissons VMC, radiateurs, chaudières, ballons) restent TELS QU'ÉCRITS, avec leur référence ; la fiche ajoute
ce qui les raccorde.

## 1. Unités et vocabulaire du devis

Unités du devis : u (appareils, unités intérieures, radiateurs, kits VMC), m² (plancher chauffant), ens / forfait (mise en
service : hors commande).
Mots du métier : « monosplit », « bisplit », « tri-split » (1 groupe extérieur + 1, 2 ou 3 unités intérieures : chaque unité
intérieure est une ligne de l'ouvrage split) ; « PAC air/eau », « monobloc » (liaison hydraulique), « bibloc » (liaison
frigorifique) ; « PCBT », « plancher chauffant » ; « robinet thermostatique », « pieuvre », « nourrice » ; « VMC simple flux »,
« hygro A », « hygro B » (kit caisson + bouches + entrées d'air, tel qu'écrit).
La puissance (« 2,5 kW », « 8 kW ») désigne un appareil : jamais une quantité. Un kit hydraulique ou un kit VMC écrit n'est pas
redétaillé. Les réponses écrites vont dans « donnees » : `distance_groupe` (groupe extérieur ↔ unité intérieure),
`type_pac`, `radiateur_reseau`, `distance_radiateur`, `nb_bouches` (pièces de service : cuisine, salles d'eau, WC).
Hors commande : mise en service, attestation de capacité fluide, Consuel, ramonage, nacelle, déchetterie, main-d'œuvre.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Article écrit | Ce que le devis écrit |
|---|---|---|---|---|
| split | Unité intérieure de climatisation (split) | u | oui | « Unité intérieure murale 2,5 kW », « split mural », « console » |
| groupe-exterieur | Groupe extérieur de climatisation | u | oui | « Groupe extérieur bisplit 5 kW », « unité extérieure », « groupe extérieur » |
| pac-air-eau | Pompe à chaleur air/eau | u | oui | « PAC air/eau monobloc 8 kW », « PAC air/eau bibloc », « Alfea », « Altherma » |
| plancher-chauffant | Plancher chauffant hydraulique | m² | non | « Plancher chauffant hydraulique », « PCBT », « plancher chauffant basse température » |
| radiateur | Radiateur à eau | u | oui | « Radiateur acier type 22 600 × 1000 », « radiateurs acier », « radiateur à eau chaude » |
| vmc-simple-flux | VMC simple flux (kit) | u | oui | « VMC simple flux hygro B », « VMC hygroréglable », « kit VMC autoréglable » |

## 3. Ratios

Split : une couronne pré-isolée par unité intérieure, la plus petite ≥ (distance + 1 m de lyres) × 1,10 ; goulotte = distance
× 1,05 ; condensats = distance + 1 m. PAC monobloc : multicouche isolé 2 × (distance + 1) × 1,05. Plancher : pas de 15 cm
(6,7 ml/m² sur 90 % de surface) + amenées ≈ 6,6 ml/m² ; panneaux × 1,05. Radiateur neuf : 2 × distance × 1,10. VMC :
5,5 m de gaine par bouche (5 m × 1,10), Ø125 en cuisine, Ø80 ailleurs, 2 m de rejet isolé.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| split | Liaison frigorifique bi-tube 1/4 – 3/8 isolée, couronne de 5 m | 1 | u | distance_groupe=3 | usuel | S1 S2 |
| split | Goulotte de liaison 80 × 60 | 3,15 | m | distance_groupe=3 | à vérifier | S3 |
| split | Tuyau de condensats Ø16 | 4 | m | distance_groupe=3 | à vérifier | S3 |
| split | Liaison frigorifique bi-tube 1/4 – 3/8 isolée, couronne de 10 m | 1 | u | distance_groupe=5 | usuel | S1 S2 |
| split | Goulotte de liaison 80 × 60 | 5,25 | m | distance_groupe=5 | à vérifier | S3 |
| split | Tuyau de condensats Ø16 | 6 | m | distance_groupe=5 | à vérifier | S3 |
| split | Liaison frigorifique bi-tube 1/4 – 3/8 isolée, couronne de 10 m | 1 | u | distance_groupe=8 | usuel | S1 S2 |
| split | Goulotte de liaison 80 × 60 | 8,4 | m | distance_groupe=8 | à vérifier | S3 |
| split | Tuyau de condensats Ø16 | 9 | m | distance_groupe=8 | à vérifier | S3 |
| split | Liaison frigorifique bi-tube 1/4 – 3/8 isolée, couronne de 20 m | 1 | u | distance_groupe=12 | usuel | S1 S2 |
| split | Goulotte de liaison 80 × 60 | 12,6 | m | distance_groupe=12 | à vérifier | S3 |
| split | Tuyau de condensats Ø16 | 13 | m | distance_groupe=12 | à vérifier | S3 |
| split | Passage de mur pour goulotte | 1 | u | — | à vérifier | S3 |
| split | Angle de goulotte | 2 | u | — | à vérifier | S3 |
| groupe-exterieur | Support de groupe extérieur | 1 | u | — | sûr | S4 |
| groupe-exterieur | Plots antivibratiles (jeu de 4) | 1 | u | — | sûr | S4 |
| pac-air-eau | Tube multicouche isolé 26 × 3 | 8,4 | m | type_pac=monobloc et distance_groupe=3 | à vérifier | S5 |
| pac-air-eau | Liaison frigorifique bi-tube 3/8 – 5/8 isolée, couronne de 5 m | 1 | u | type_pac=bibloc et distance_groupe=3 | usuel | S1 S2 |
| pac-air-eau | Tuyau de condensats Ø16 | 4 | m | distance_groupe=3 | à vérifier | S3 |
| pac-air-eau | Tube multicouche isolé 26 × 3 | 12,6 | m | type_pac=monobloc et distance_groupe=5 | à vérifier | S5 |
| pac-air-eau | Liaison frigorifique bi-tube 3/8 – 5/8 isolée, couronne de 10 m | 1 | u | type_pac=bibloc et distance_groupe=5 | usuel | S1 S2 |
| pac-air-eau | Tuyau de condensats Ø16 | 6 | m | distance_groupe=5 | à vérifier | S3 |
| pac-air-eau | Tube multicouche isolé 26 × 3 | 18,9 | m | type_pac=monobloc et distance_groupe=8 | à vérifier | S5 |
| pac-air-eau | Liaison frigorifique bi-tube 3/8 – 5/8 isolée, couronne de 10 m | 1 | u | type_pac=bibloc et distance_groupe=8 | usuel | S1 S2 |
| pac-air-eau | Tuyau de condensats Ø16 | 9 | m | distance_groupe=8 | à vérifier | S3 |
| pac-air-eau | Tube multicouche isolé 26 × 3 | 27,3 | m | type_pac=monobloc et distance_groupe=12 | à vérifier | S5 |
| pac-air-eau | Liaison frigorifique bi-tube 3/8 – 5/8 isolée, couronne de 20 m | 1 | u | type_pac=bibloc et distance_groupe=12 | usuel | S1 S2 |
| pac-air-eau | Tuyau de condensats Ø16 | 13 | m | distance_groupe=12 | à vérifier | S3 |
| pac-air-eau | Flexible de raccordement hydraulique | 2 | u | type_pac=monobloc | usuel | S5 |
| pac-air-eau | Vanne d'isolement | 2 | u | type_pac=monobloc | usuel | S5 |
| pac-air-eau | Filtre à boues magnétique | 1 | u | — | usuel | S5 |
| pac-air-eau | Support de groupe extérieur | 1 | u | — | usuel | S5 |
| pac-air-eau | Plots antivibratiles (jeu de 4) | 1 | u | — | usuel | S5 |
| plancher-chauffant | Tube PER BAO 16 × 1,5 | 6,6 | m | — | à vérifier | S6 |
| plancher-chauffant | Panneau isolant à plots | 1,05 | m² | — | usuel | S6 |
| plancher-chauffant | Bande périphérique | 0,6 | m | — | à vérifier | S6 |
| radiateur | Tube multicouche 16 × 2 | 8,8 | m | radiateur_reseau=neuf et distance_radiateur=4 | à vérifier | S7 |
| radiateur | Tube multicouche 16 × 2 | 17,6 | m | radiateur_reseau=neuf et distance_radiateur=8 | à vérifier | S7 |
| radiateur | Tube multicouche 16 × 2 | 26,4 | m | radiateur_reseau=neuf et distance_radiateur=12 | à vérifier | S7 |
| radiateur | Robinet thermostatique | 1 | u | radiateur_reseau=neuf | usuel | S7 |
| radiateur | Té de réglage | 1 | u | radiateur_reseau=neuf | usuel | S7 |
| radiateur | Raccord de transition | 2 | u | radiateur_reseau=identique | usuel | S7 |
| vmc-simple-flux | Gaine VMC souple Ø80 | 11 | m | nb_bouches=3 | à vérifier | S8 S9 |
| vmc-simple-flux | Collier de serrage VMC | 8 | u | nb_bouches=3 | à vérifier | S8 |
| vmc-simple-flux | Gaine VMC souple Ø80 | 16,5 | m | nb_bouches=4 | à vérifier | S8 S9 |
| vmc-simple-flux | Collier de serrage VMC | 10 | u | nb_bouches=4 | à vérifier | S8 |
| vmc-simple-flux | Gaine VMC souple Ø80 | 22 | m | nb_bouches=5 | à vérifier | S8 S9 |
| vmc-simple-flux | Collier de serrage VMC | 12 | u | nb_bouches=5 | à vérifier | S8 |
| vmc-simple-flux | Gaine VMC souple Ø80 | 27,5 | m | nb_bouches=6 | à vérifier | S8 S9 |
| vmc-simple-flux | Collier de serrage VMC | 14 | u | nb_bouches=6 | à vérifier | S8 |
| vmc-simple-flux | Gaine VMC souple Ø125 | 5,5 | m | — | à vérifier | S8 S9 |
| vmc-simple-flux | Gaine VMC isolée Ø125 (rejet) | 2 | m | — | à vérifier | S8 |
| vmc-simple-flux | Sortie de toit VMC | 1 | u | — | usuel | S8 |
| vmc-simple-flux | Adhésif aluminium | 1 | u | — | usuel | S8 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source | Consommable |
|---|---|---|---|---|---|---|
| Liaison frigorifique bi-tube 1/4 – 3/8 isolée, couronne de 5 m | couronne | 1 | u | sûr | S2 | non |
| Goulotte de liaison 80 × 60 | barre | 2 | m | sûr | S3 | non |
| Tuyau de condensats Ø16 | rouleau | 30 | m | sûr | S3 | non |
| Liaison frigorifique bi-tube 1/4 – 3/8 isolée, couronne de 10 m | couronne | 1 | u | sûr | S2 | non |
| Liaison frigorifique bi-tube 1/4 – 3/8 isolée, couronne de 20 m | couronne | 1 | u | sûr | S2 | non |
| Passage de mur pour goulotte | u | 1 | u | sûr | S3 | non |
| Angle de goulotte | u | 1 | u | sûr | S3 | non |
| Support de groupe extérieur | u | 1 | u | sûr | S4 | non |
| Plots antivibratiles (jeu de 4) | jeu | 1 | u | sûr | S4 | non |
| Tube multicouche isolé 26 × 3 | couronne | 25 | m | à vérifier | S5 | non |
| Liaison frigorifique bi-tube 3/8 – 5/8 isolée, couronne de 5 m | couronne | 1 | u | sûr | S2 | non |
| Liaison frigorifique bi-tube 3/8 – 5/8 isolée, couronne de 10 m | couronne | 1 | u | sûr | S2 | non |
| Liaison frigorifique bi-tube 3/8 – 5/8 isolée, couronne de 20 m | couronne | 1 | u | sûr | S2 | non |
| Flexible de raccordement hydraulique | u | 1 | u | sûr | S5 | non |
| Vanne d'isolement | u | 1 | u | sûr | S5 | non |
| Filtre à boues magnétique | u | 1 | u | sûr | S5 | non |
| Tube PER BAO 16 × 1,5 | couronne | 240 | m | sûr | S6 | non |
| Panneau isolant à plots | panneau | 0,94 | m² | sûr | S6 | non |
| Bande périphérique | rouleau | 50 | m | sûr | S6 | non |
| Tube multicouche 16 × 2 | couronne | 50 | m | usuel | S7 | non |
| Robinet thermostatique | u | 1 | u | sûr | S7 | non |
| Té de réglage | u | 1 | u | sûr | S7 | non |
| Raccord de transition | u | 1 | u | sûr | S7 | non |
| Gaine VMC souple Ø80 | carton | 6 | m | sûr | S9 | non |
| Collier de serrage VMC | sachet | 10 | u | à vérifier | S8 | oui |
| Gaine VMC souple Ø125 | carton | 6 | m | sûr | S9 | non |
| Gaine VMC isolée Ø125 (rejet) | carton | 6 | m | usuel | S9 | non |
| Sortie de toit VMC | u | 1 | u | sûr | S8 | non |
| Adhésif aluminium | rouleau | 1 | u | sûr | S8 | oui |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| distance_groupe | Entre le groupe extérieur et chaque unité intérieure, il y a combien ? | 3 m=3 / 5 m=5 / 8 m=8 / 12 m=12 | split, pac-air-eau |
| type_pac | Ta PAC air/eau est monobloc ou bibloc ? | Monobloc=monobloc / Bibloc=bibloc | pac-air-eau |
| radiateur_reseau | Tes radiateurs, réseau neuf ou à l'identique ? | Réseau neuf ou déplacé=neuf / À l'identique=identique | radiateur |
| distance_radiateur | En moyenne, tes radiateurs sont à combien de la nourrice ? | 4 m=4 / 8 m=8 / 12 m=12 | radiateur |
| nb_bouches | Combien de pièces de service (cuisine, salles d'eau, WC) ? | 3=3 / 4=4 / 5=5 / 6=6 | vmc-simple-flux |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : rénovation énergétique d'une maison.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Unité intérieure murale 2,5 kW | 2 | u | split |
| 2 | Groupe extérieur bisplit 5 kW | 1 | u | groupe-exterieur |
| 3 | PAC air/eau monobloc 8 kW | 1 | u | pac-air-eau |
| 4 | Radiateur acier type 22 600 × 1000 | 4 | u | radiateur |
| 5 | VMC simple flux hygro B | 1 | u | vmc-simple-flux |
| 6 | Plancher chauffant hydraulique | 60 | m² | plancher-chauffant |
| 7 | Mise en service et attestation de capacité | 1 | ens | — |

### Bref

- Rénovation énergétique : bisplit (2 unités murales 2,5 kW, groupe 5 kW), PAC air/eau monobloc 8 kW.
- 4 radiateurs acier type 22, VMC simple flux hygro B, 60 m² de plancher chauffant ; mise en service hors commande.

### Questions attendues

- `consommables`
- `distance_groupe`
- `type_pac`
- `radiateur_reseau`
- `distance_radiateur`
- `nb_bouches`

### Réponses

- `consommables` = 1
- `distance_groupe` = 5
- `type_pac` = monobloc
- `radiateur_reseau` = neuf
- `distance_radiateur` = 8
- `nb_bouches` = 4

### Comptes attendus

Calculs (distance 5 m) : liaisons 2 couronnes de 10 m ((5 + 1) × 1,10 = 6,6 m) ; goulotte 2 × 5,25 = 10,5 m ÷ 2 ; condensats
2 × 6 + 6 = 18 m ; multicouche isolé 2 × 6 × 1,05 = 12,6 m ; radiateurs 4 × 2 × 8 × 1,10 = 70,4 m ÷ 50 ; VMC Ø80 3 × 5,5 = 16,5 m
÷ 6 ; plancher 60 × 6,6 = 396 m ÷ 240 ; panneaux 63 m² ÷ 0,94 ; bande 36 m.

| Fourniture | Commande |
|---|---|
| Liaison frigorifique bi-tube 1/4 – 3/8 isolée, couronne de 10 m | 2 couronnes |
| Goulotte de liaison 80 × 60 | 6 barres de 2 m |
| Tuyau de condensats Ø16 | 1 rouleau de 30 m |
| Passage de mur pour goulotte | 2 u |
| Angle de goulotte | 4 u |
| Support de groupe extérieur | 2 u |
| Plots antivibratiles (jeu de 4) | 2 jeux |
| Tube multicouche isolé 26 × 3 | 1 couronne de 25 m |
| Flexible de raccordement hydraulique | 2 u |
| Vanne d'isolement | 2 u |
| Filtre à boues magnétique | 1 u |
| Tube multicouche 16 × 2 | 2 couronnes de 50 m |
| Robinet thermostatique | 4 u |
| Té de réglage | 4 u |
| Gaine VMC souple Ø80 | 3 cartons de 6 m |
| Gaine VMC souple Ø125 | 1 carton de 6 m |
| Gaine VMC isolée Ø125 (rejet) | 1 carton de 6 m |
| Sortie de toit VMC | 1 u |
| Adhésif aluminium | 1 rouleau |
| Collier de serrage VMC | 1 sachet de 10 u |
| Tube PER BAO 16 × 1,5 | 2 couronnes de 240 m |
| Panneau isolant à plots | 68 panneaux de 0,94 m² |
| Bande périphérique | 1 rouleau de 50 m |

## 7. À relire par un chauffagiste

- Liaisons frigorifiques : diamètres 1/4 – 3/8 (split ≤ 3,5 kW) et 3/8 – 5/8 (PAC bibloc) par défaut : la notice du modèle fait
  foi ; charge complémentaire de fluide au-delà de la longueur préchargée non comptée.
- Plancher chauffant : 6,6 ml/m² (pas de 15 cm, salles de bains au pas de 10 non distinguées), boucles de 120 m maximum : le
  rangement en couronnes de 240 m n'est pas fait boucle par boucle ; collecteur tel qu'écrit.
- Bande périphérique : 0,6 m par m² (pièces moyennes) au lieu du périmètre réel.
- Radiateurs : distance moyenne à la nourrice ; raccords et coudes à sertir non comptés.
- VMC : 5 m de gaine par bouche + 10 % ; bouches et entrées d'air livrées dans le kit ; sortie de toit à confirmer (chapeau en
  pignon possible).

## 8. Sources

- S1 : Daikin, guide de référence installateur split R32 RXM-R : longueurs mini et maxi, 1 m de lyres, 10 % de marge (règle BatiClair, à vérifier).
- S2 : Couronnes de cuivre pré-isolées bi-tube 3, 5, 10, 20, 50 m (Cedeo, Comptoir des Pros).
- S3 : Goulotte 80 × 60 en barres de 2 m (Artiplastic via Cedeo) ; tuyau de condensats en rouleaux de 30 et 50 m ; NF DTU 65.16 (pente 3 %, siphon) ; accessoires par liaison (1 passage de mur, 2 angles) : à vérifier.
- S4 : NF DTU 65.16 (synthèses Batirama, Cedeo) : groupe extérieur sur support, garde au sol ≥ 10 cm, plots antivibratiles.
- S5 : Référentiel du 3 octobre §5.3 : PAC monobloc, liaison hydraulique 2 × (distance + 1 m) × 1,05 ; par PAC 2 flexibles, 2 vannes, 1 filtre, 1 support et plots ; multicouche isolé 26 × 3 en couronne de 25 m à vérifier.
- S6 : NF DTU 65.14 et guides de pose Anjou Connectique, Thermacome : boucles de 120 m maximum, pas de 15 cm ; tube PER BAO en couronnes de 120 et 240 m (Roth via Cedeo) ; plaque à plots utile 1,12 × 0,84 m = 0,94 m² (PUM) ; bande périphérique en rouleau de 50 m (Velta).
- S7 : Référentiel du 3 octobre §5.5 : radiateur neuf ou déplacé, 2 × distance × 1,10 de multicouche, 1 robinet thermostatique et 1 té de réglage ; à l'identique, 2 raccords de transition.
- S8 : Arrêté du 24 mars 1982 et NF DTU 68.3 : une bouche par pièce de service, Ø125 en cuisine, Ø80 ailleurs, rejet isolé ; gaine 5 m par bouche + 10 %, 2 colliers par tronçon, 1 rouleau d'adhésif : référentiel du 3 octobre §5.6, à vérifier.
- S9 : Aldes Algaine : gaine souple en cartons de 6 m.
