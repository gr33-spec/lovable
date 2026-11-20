# Fiche couverture (couverture-2026.11.19-1, en validation)

Fichier GÉNÉRÉ par `construire_fiche.py` depuis `recherche/` : ne pas modifier à la main.

Taux de chiffres confirmés : **92.4 %**. Règle : confirme : deux sources indépendantes, dont un fabricant ou un DTU quand c'est possible ; confirme_fabricant : fiche officielle du fabricant, sur son domaine, datée, et contrôle par le calcul du modèle (décision du fondateur, 19/11/2026) ; une_source ; a_confirmer.

## Ardoises

### ardoise naturelle

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| formule_pureau | (H − R) / 2 mm | pose à pureau entier, double recouvrement | confirme |
| formule_ardoises_m2 | 1 / [pureau × (largeur + Ø crochet)], Ø ≈ 3 mm u/m2 | pose au crochet | confirme |
| liteaux_ml_par_m2 | 1 / pureau ml/m2 | une file de liteaux par rang, hors doublis et faîtage | confirme |
| hauteur_minimale_ardoise | H ≥ 3 × R mm | choix du format (NF DTU 40.11 P1-1 §5.1.1.3) | confirme |
| longueur_crochet | R + 3 mm, arrondi au cm supérieur cm | ardoise naturelle, pose au crochet (pureau entier, claire-voie ordinaire) | confirme |
| recouvrement_obtenu_avec_un_crochet_c | entre C − 12 mm et C − 3 mm (valeur pratique C − 5 mm) mm | on connaît le crochet (écrit au devis), pas le recouvrement | confirme |
| crochet_tige_ondulee_obligatoire_a_partir_de | 12 cm | crochets droits au-delà de 11 cm hors DTU ; Frénéhard livre en crosinus dès 12 cm | confirme |
| longueurs_crochet | 7 à 16 cm, de cm en cm cm | 2,4 mm limité à 11 cm ; 17 cm hors DTU | confirme |
| diametres_fil | 2,4 / 2,7 / 3,0 (3,4 cuivre ou acier) mm | le diamètre ne dépasse pas l'épaisseur nominale de l'ardoise | confirme |
| diametre_minimal_bretagne | 2.7 mm | inox 2,4 interdit en zones de vent 3 et 4 (NV65) : départements entiers 22, 29, 56 (et 85, 06, 34, Corse), partiels 44, 59, 62, 80, 76, 17, 11, 30 | confirme |
| diametre_minimal | 3.0 mm | formats > 40×22 en zone 2 site exposé, zone 3, et zone de vent 4 (Eurocode 1-4) | une_source |
| crochet_galvanise_admis | False  | NF DTU 40.11 (2020) : crochets en inox (X6Cr17, X5CrNi18-10, X6CrNiMoTi17-12-2) ou cuivre | confirme |
| nuance_inox_selon_distance_mer | rural : inox 17 % ; 10-20 km : 18/10 ; 3-10 km : 18/10 ; < 3 km : 316Ti (18/10 ou cuivre sur dérogation écrite du fabricant) ; front de mer : 316Ti seul  | NF DTU 40.11 P1-2 annexe B (tableau B.1) résumé par Frénéhard | une_source |
| crochets_par_ardoise | 1 u | pose à pureau entier (claire-voie : 2 crochets par ardoise) | confirme |
| part_crochets_pointe | 0.2 fraction | pose à l'agrafe sur liteaux : crochets-pointes au droit des chevrons (et sur les parties voligées) | une_source |
| type_crochet_sur_voligeage | crochet à pointe (100 %)  | Bretagne : pose au crochet fréquente sur voligeage jointif (vent) | confirme |
| longueur_pointe_du_crochet | épaisseur de l'ardoise + 20 mm (au moins) mm | crochet à pointe, NF DTU 40.11 P1-2 §3.3.2.1.2 | confirme |
| agrafe_selon_liteau | agrafe 14 (liteau 14-16,5), 18 (liteau 18), 20 (liteau 20) ; autres 18 à 40 mm sur demande mm | Frénéhard Anjou Color ; négoce : A16 pour liteau 15-18 | confirme |
| conditionnement | 500 u/boîte | crochet à agrafe Ø 2,7, longueurs 7 à 14 cm (400 pour 15-16 cm) | confirme |
| conditionnement | 700 u/boîte | crochet à pointe Ø 2,7, longueurs 7 à 14 cm (500 pour 15-16 cm) | confirme |
| crochets_par_boite_5kg | None u | inox Ø 2,7 : 7 cm 670 agrafes / 830 pointes … 11 cm 540 / 640 … 16 cm 430 / 500 | une_source |
| clous_ardoise | 27×15 (Ø 2,4, L 27) ; 30×16 (Ø 2,7, L 30) ; 35×17 (Ø 3,0, L 35) ; tête ≥ 7,5 mm mm | clous à tête large, acier galvanisé, cuivre ou inox (NF DTU 40.11 P1-2 tableau 3) | confirme |
| clous_par_ardoise | 2 u | pose au clou (ardoise naturelle) ; ardoises de rive, doublis, premier rang et dernier rang : 2 clous | confirme |
| unite_de_vente | au kg (boîtes de 1 kg et 5 kg) kg | galva 2,7×30 en 5 kg ; cuivre 2,7×27 et 2,7×30 en 1 kg | confirme |
| clou_galvanise_admis | oui pour les clous non apparents (zinc ≥ 5 g/dm²) ; clous apparents (dernier rang, lignolet) : inox ou cuivre  | NF DTU 40.11 P1-2 §3.3.2.2 | confirme |
| rangs_supplementaires_egout | 1 rang de doublis (ardoise raccourcie : pureau + recouvrement) sous le premier rang rang | égout en ardoises ou avec bande métallique | confirme |
| rangs_supplementaires_faitage | 1 rang de doublage (ou rang de rencontre) au dernier rang rang | faîtage terre cuite, métallique ou lignolet ; rive de tête | confirme |
| plus_value_rive | tranchis droit 0,16 m²/ml ; biais 0,25 ; circulaire 0,33 m2/ml | rive latérale (manuel CAP) ; DTU : rive droite en ardoises entières et demies, toutes à 2 clous | une_source |
| perte | 5 % (casse et coupes, toit simple) ; 10 % toit compliqué : pratique du fondateur seule % | casse et coupes | une_source |
| majoration_site_expose | +10 mm en zone III situation exposée (NF DTU 40.11 de 2020) ; Cupa et Rathscheck conseillent encore « majorer de 10 % » (texte de 1993) ; lignes « zone 3 exposée » : la plus forte des deux mm | situation exposée : littoral sur ~5 km, sommets de falaises, îles, presqu'îles étroites, estuaires | confirme |
| pente_minimale_32x22 | zone 1 : 50 % (26,6°) ; zone 2 : 60 % (31°) ; zone 3 : 70 % (35°) % | pose au crochet, projection ≤ 5,50 m, situation normale (R ≤ 106 mm = H/3) | confirme |
| selections | Excellence (= NF D1), Ardoisier (= NF D2), Naturelle (hors marque NF), Modèle flamand  | Cupa Pizarras | confirme_fabricant |
| classes_exigees | NF EN 12326-1 + W1 (absorption ≤ 0,6 %), T1, S1, carbone non carbonaté ≤ 2 %  | NF DTU 40.11 P1-2 §3.1 | confirme |
| epaisseur | 3,5 à 5 mm courant (épaisses 7-8 mm) ; MH : 4,5 mm minimum mm | Espagne (Cupa) ; Monuments historiques | confirme |
| origines | Espagne (Galice, León : Cupa, Matacouta, Del Carmen, Proinor, Santa Clara…) très majoritaire ; Trélazé (Angers) fermé en 2014 ; Brésil, Chine, Inde ; Pays de Galles marginal  | marché français | une_source |
| marques_vendues_bretagne | naturelles : Cupa (2, 3, 4, 6, 7, 9, 10, 13, 17, 37, 77), Matacouta, Del Carmen, Proinor, Santa Clara ; fibres-ciment : Kergoat, Orléane, Artoit (Etex), Tregal, Bravan, Karnak  | Tanguy Matériaux (Finistère et Bretagne) | une_source |
| formats_courants_bretagne | modèles moyens et petits (32×22, 30×20, 27×18…)  | Bretagne, pentes ≥ 40-45° | une_source |
| longueur_reelle | 320 × 220 (32×22 du commerce : Cupa, Rathscheck) mm | « 32×22 » | confirme |

- **Toutes marques pose au crochet, pureau entier** (confirme 175) : recouvrement_minimal 153 mm; recouvrement_minimal 147 mm; recouvrement_minimal 142 mm; recouvrement_minimal 137 mm; recouvrement_minimal 133 mm; recouvrement_minimal 127 mm; recouvrement_minimal 123 mm; recouvrement_minimal 119 mm; recouvrement_minimal 116 mm; recouvrement_minimal 107 mm; recouvrement_minimal 103 mm; recouvrement_minimal 97 mm; recouvrement_minimal 92 mm; recouvrement_minimal 87 mm; recouvrement_minimal 80 mm; recouvrement_minimal 77 mm; recouvrement_minimal 73 mm; recouvrement_minimal 69 mm; recouvrement_minimal 65 mm; recouvrement_minimal 65 mm; recouvrement_minimal 63 mm; recouvrement_minimal 60 mm; recouvrement_minimal 60 mm; recouvrement_minimal 60 mm; recouvrement_minimal 60 mm; recouvrement_minimal 153 mm; recouvrement_minimal 147 mm; recouvrement_minimal 142 mm; recouvrement_minimal 137 mm; recouvrement_minimal 133 mm; recouvrement_minimal 127 mm; recouvrement_minimal 123 mm; recouvrement_minimal 116 mm; recouvrement_minimal 110 mm; recouvrement_minimal 103 mm; recouvrement_minimal 100 mm; recouvrement_minimal 92 mm; recouvrement_minimal 87 mm; recouvrement_minimal 83 mm; recouvrement_minimal 80 mm; recouvrement_minimal 73 mm; recouvrement_minimal 73 mm; recouvrement_minimal 67 mm; recouvrement_minimal 65 mm; recouvrement_minimal 63 mm; recouvrement_minimal 63 mm; recouvrement_minimal 63 mm; recouvrement_minimal 153 mm; recouvrement_minimal 147 mm; recouvrement_minimal 142 mm; recouvrement_minimal 137 mm; recouvrement_minimal 133 mm; recouvrement_minimal 127 mm; recouvrement_minimal 117 mm; recouvrement_minimal 113 mm; recouvrement_minimal 106 mm; recouvrement_minimal 100 mm; recouvrement_minimal 92 mm; recouvrement_minimal 87 mm; recouvrement_minimal 83 mm; recouvrement_minimal 80 mm; recouvrement_minimal 77 mm; recouvrement_minimal 73 mm; recouvrement_minimal 69 mm; recouvrement_minimal 67 mm; recouvrement_minimal 67 mm; recouvrement_minimal 65 mm; recouvrement_minimal 153 mm; recouvrement_minimal 147 mm; recouvrement_minimal 142 mm; recouvrement_minimal 137 mm; recouvrement_minimal 133 mm; recouvrement_minimal 127 mm; recouvrement_minimal 119 mm; recouvrement_minimal 113 mm; recouvrement_minimal 107 mm; recouvrement_minimal 103 mm; recouvrement_minimal 94 mm; recouvrement_minimal 89 mm; recouvrement_minimal 87 mm; recouvrement_minimal 80 mm; recouvrement_minimal 77 mm; recouvrement_minimal 73 mm; recouvrement_minimal 69 mm; recouvrement_minimal 67 mm; recouvrement_minimal 65 mm; recouvrement_minimal 63 mm; recouvrement_minimal 63 mm; recouvrement_minimal 60 mm; recouvrement_minimal 153 mm; recouvrement_minimal 147 mm; recouvrement_minimal 142 mm; recouvrement_minimal 137 mm; recouvrement_minimal 130 mm; recouvrement_minimal 123 mm; recouvrement_minimal 116 mm; recouvrement_minimal 110 mm; recouvrement_minimal 103 mm; recouvrement_minimal 94 mm; recouvrement_minimal 89 mm; recouvrement_minimal 87 mm; recouvrement_minimal 80 mm; recouvrement_minimal 77 mm; recouvrement_minimal 73 mm; recouvrement_minimal 73 mm; recouvrement_minimal 69 mm; recouvrement_minimal 69 mm; recouvrement_minimal 67 mm; recouvrement_minimal 153 mm; recouvrement_minimal 147 mm; recouvrement_minimal 142 mm; recouvrement_minimal 130 mm; recouvrement_minimal 123 mm; recouvrement_minimal 117 mm; recouvrement_minimal 107 mm; recouvrement_minimal 100 mm; recouvrement_minimal 94 mm; recouvrement_minimal 92 mm; recouvrement_minimal 87 mm; recouvrement_minimal 83 mm; recouvrement_minimal 77 mm; recouvrement_minimal 77 mm; recouvrement_minimal 73 mm; recouvrement_minimal 73 mm; recouvrement_minimal 73 mm; recouvrement_minimal 153 mm; recouvrement_minimal 147 mm; recouvrement_minimal 142 mm; recouvrement_minimal 133 mm; recouvrement_minimal 127 mm; recouvrement_minimal 119 mm; recouvrement_minimal 113 mm; recouvrement_minimal 106 mm; recouvrement_minimal 97 mm; recouvrement_minimal 92 mm; recouvrement_minimal 89 mm; recouvrement_minimal 83 mm; recouvrement_minimal 80 mm; recouvrement_minimal 77 mm; recouvrement_minimal 73 mm; recouvrement_minimal 73 mm; recouvrement_minimal 73 mm; recouvrement_minimal 69 mm; recouvrement_minimal 65 mm; recouvrement_minimal 153 mm; recouvrement_minimal 147 mm; recouvrement_minimal 137 mm; recouvrement_minimal 127 mm; recouvrement_minimal 123 mm; recouvrement_minimal 110 mm; recouvrement_minimal 103 mm; recouvrement_minimal 100 mm; recouvrement_minimal 94 mm; recouvrement_minimal 87 mm; recouvrement_minimal 83 mm; recouvrement_minimal 80 mm; recouvrement_minimal 77 mm; recouvrement_minimal 77 mm; recouvrement_minimal 77 mm; recouvrement_minimal 73 mm; recouvrement_minimal 153 mm; recouvrement_minimal 142 mm; recouvrement_minimal 137 mm; recouvrement_minimal 130 mm; recouvrement_minimal 117 mm; recouvrement_minimal 110 mm; recouvrement_minimal 103 mm; recouvrement_minimal 97 mm; recouvrement_minimal 92 mm; recouvrement_minimal 87 mm; recouvrement_minimal 87 mm; recouvrement_minimal 83 mm; recouvrement_minimal 80 mm; recouvrement_minimal 80 mm; recouvrement_minimal 77 mm
- **Toutes marques 60×30** (confirme 27) : ardoises_par_m2 13.0 u/m2; ardoises_par_m2 12.9 u/m2; ardoises_par_m2 12.7 u/m2; ardoises_par_m2 12.6 u/m2; ardoises_par_m2 12.5 u/m2; ardoises_par_m2 12.4 u/m2; ardoises_par_m2 12.3 u/m2; ardoises_par_m2 12.3 u/m2; ardoises_par_m2 12.3 u/m2; ardoises_par_m2 13.3 u/m2; ardoises_par_m2 13.0 u/m2; ardoises_par_m2 12.9 u/m2; ardoises_par_m2 12.9 u/m2; ardoises_par_m2 12.7 u/m2; ardoises_par_m2 12.6 u/m2; ardoises_par_m2 12.5 u/m2; ardoises_par_m2 12.4 u/m2; ardoises_par_m2 12.4 u/m2; ardoises_par_m2 13.6 u/m2; ardoises_par_m2 13.4 u/m2; ardoises_par_m2 13.1 u/m2; ardoises_par_m2 13.0 u/m2; ardoises_par_m2 12.9 u/m2; ardoises_par_m2 12.8 u/m2; ardoises_par_m2 12.7 u/m2; ardoises_par_m2 12.6 u/m2; ardoises_par_m2 12.5 u/m2
- **Toutes marques 50×25** (confirme 27) : ardoises_par_m2 19.4 u/m2; ardoises_par_m2 19.1 u/m2; ardoises_par_m2 18.8 u/m2; ardoises_par_m2 18.7 u/m2; ardoises_par_m2 18.5 u/m2; ardoises_par_m2 18.3 u/m2; ardoises_par_m2 18.2 u/m2; ardoises_par_m2 18.2 u/m2; ardoises_par_m2 18.1 u/m2; ardoises_par_m2 19.9 u/m2; ardoises_par_m2 19.5 u/m2; ardoises_par_m2 19.2 u/m2; ardoises_par_m2 19.1 u/m2; ardoises_par_m2 18.8 u/m2; ardoises_par_m2 18.7 u/m2; ardoises_par_m2 18.5 u/m2; ardoises_par_m2 18.3 u/m2; ardoises_par_m2 18.3 u/m2; ardoises_par_m2 20.4 u/m2; ardoises_par_m2 20.1 u/m2; ardoises_par_m2 19.6 u/m2; ardoises_par_m2 19.4 u/m2; ardoises_par_m2 19.2 u/m2; ardoises_par_m2 19.0 u/m2; ardoises_par_m2 18.8 u/m2; ardoises_par_m2 18.7 u/m2; ardoises_par_m2 18.5 u/m2
- **Toutes marques 46×30** (confirme 27) : ardoises_par_m2 17.9 u/m2; ardoises_par_m2 17.7 u/m2; ardoises_par_m2 17.4 u/m2; ardoises_par_m2 17.2 u/m2; ardoises_par_m2 17.1 u/m2; ardoises_par_m2 16.9 u/m2; ardoises_par_m2 16.7 u/m2; ardoises_par_m2 16.7 u/m2; ardoises_par_m2 16.6 u/m2; ardoises_par_m2 18.5 u/m2; ardoises_par_m2 18.0 u/m2; ardoises_par_m2 17.8 u/m2; ardoises_par_m2 17.7 u/m2; ardoises_par_m2 17.4 u/m2; ardoises_par_m2 17.2 u/m2; ardoises_par_m2 17.1 u/m2; ardoises_par_m2 16.9 u/m2; ardoises_par_m2 16.8 u/m2; ardoises_par_m2 19.0 u/m2; ardoises_par_m2 18.6 u/m2; ardoises_par_m2 18.2 u/m2; ardoises_par_m2 17.9 u/m2; ardoises_par_m2 17.8 u/m2; ardoises_par_m2 17.5 u/m2; ardoises_par_m2 17.4 u/m2; ardoises_par_m2 17.2 u/m2; ardoises_par_m2 17.1 u/m2
- **Toutes marques 46×25** (confirme 27) : ardoises_par_m2 21.5 u/m2; ardoises_par_m2 21.2 u/m2; ardoises_par_m2 20.8 u/m2; ardoises_par_m2 20.6 u/m2; ardoises_par_m2 20.4 u/m2; ardoises_par_m2 20.2 u/m2; ardoises_par_m2 20.0 u/m2; ardoises_par_m2 20.0 u/m2; ardoises_par_m2 19.9 u/m2; ardoises_par_m2 22.1 u/m2; ardoises_par_m2 21.6 u/m2; ardoises_par_m2 21.3 u/m2; ardoises_par_m2 21.2 u/m2; ardoises_par_m2 20.8 u/m2; ardoises_par_m2 20.6 u/m2; ardoises_par_m2 20.4 u/m2; ardoises_par_m2 20.2 u/m2; ardoises_par_m2 20.1 u/m2; ardoises_par_m2 22.8 u/m2; ardoises_par_m2 22.3 u/m2; ardoises_par_m2 21.8 u/m2; ardoises_par_m2 21.5 u/m2; ardoises_par_m2 21.3 u/m2; ardoises_par_m2 21.0 u/m2; ardoises_par_m2 20.8 u/m2; ardoises_par_m2 20.6 u/m2; ardoises_par_m2 20.4 u/m2
- **Toutes marques 40×25** (confirme 36, confirme_fabricant 1) : ardoises_par_m2 25.7 u/m2; ardoises_par_m2 25.3 u/m2; ardoises_par_m2 24.7 u/m2; ardoises_par_m2 24.5 u/m2; ardoises_par_m2 24.2 u/m2; ardoises_par_m2 23.9 u/m2; ardoises_par_m2 23.6 u/m2; ardoises_par_m2 23.6 u/m2; ardoises_par_m2 23.5 u/m2; ardoises_par_m2 26.6 u/m2; ardoises_par_m2 25.8 u/m2; ardoises_par_m2 25.4 u/m2; ardoises_par_m2 25.3 u/m2; ardoises_par_m2 24.7 u/m2; ardoises_par_m2 24.5 u/m2; ardoises_par_m2 24.2 u/m2; ardoises_par_m2 23.9 u/m2; ardoises_par_m2 23.7 u/m2; ardoises_par_m2 27.5 u/m2; ardoises_par_m2 26.9 u/m2; ardoises_par_m2 26.1 u/m2; ardoises_par_m2 25.7 u/m2; ardoises_par_m2 25.4 u/m2; ardoises_par_m2 24.9 u/m2; ardoises_par_m2 24.7 u/m2; ardoises_par_m2 24.5 u/m2; ardoises_par_m2 24.2 u/m2; ardoises_par_m2 28.7 u/m2; ardoises_par_m2 27.9 u/m2; ardoises_par_m2 27.0 u/m2; ardoises_par_m2 26.5 u/m2; ardoises_par_m2 26.3 u/m2; ardoises_par_m2 25.7 u/m2; ardoises_par_m2 25.5 u/m2; ardoises_par_m2 25.3 u/m2; pente_minimale_zone3_exposee 60 % (31.0°) %; poids_unitaire 0.98 kg
- **Toutes marques 40×22** (confirme 36, confirme_fabricant 1) : ardoises_par_m2 29.1 u/m2; ardoises_par_m2 28.7 u/m2; ardoises_par_m2 28.0 u/m2; ardoises_par_m2 27.8 u/m2; ardoises_par_m2 27.4 u/m2; ardoises_par_m2 27.1 u/m2; ardoises_par_m2 26.8 u/m2; ardoises_par_m2 26.8 u/m2; ardoises_par_m2 26.6 u/m2; ardoises_par_m2 30.2 u/m2; ardoises_par_m2 29.3 u/m2; ardoises_par_m2 28.8 u/m2; ardoises_par_m2 28.7 u/m2; ardoises_par_m2 28.0 u/m2; ardoises_par_m2 27.8 u/m2; ardoises_par_m2 27.4 u/m2; ardoises_par_m2 27.1 u/m2; ardoises_par_m2 26.9 u/m2; ardoises_par_m2 31.2 u/m2; ardoises_par_m2 30.5 u/m2; ardoises_par_m2 29.6 u/m2; ardoises_par_m2 29.1 u/m2; ardoises_par_m2 28.8 u/m2; ardoises_par_m2 28.3 u/m2; ardoises_par_m2 28.0 u/m2; ardoises_par_m2 27.8 u/m2; ardoises_par_m2 27.4 u/m2; ardoises_par_m2 32.6 u/m2; ardoises_par_m2 31.7 u/m2; ardoises_par_m2 30.6 u/m2; ardoises_par_m2 30.1 u/m2; ardoises_par_m2 29.8 u/m2; ardoises_par_m2 29.2 u/m2; ardoises_par_m2 28.9 u/m2; ardoises_par_m2 28.7 u/m2; pente_minimale_zone3_exposee 60 % (31.0°) %; poids_unitaire 0.862 kg
- **Toutes marques 40×20** (confirme 27, confirme_fabricant 1) : ardoises_par_m2 32.0 u/m2; ardoises_par_m2 31.5 u/m2; ardoises_par_m2 30.8 u/m2; ardoises_par_m2 30.5 u/m2; ardoises_par_m2 30.1 u/m2; ardoises_par_m2 29.8 u/m2; ardoises_par_m2 29.4 u/m2; ardoises_par_m2 29.4 u/m2; ardoises_par_m2 29.2 u/m2; ardoises_par_m2 33.2 u/m2; ardoises_par_m2 32.2 u/m2; ardoises_par_m2 31.7 u/m2; ardoises_par_m2 31.5 u/m2; ardoises_par_m2 30.8 u/m2; ardoises_par_m2 30.5 u/m2; ardoises_par_m2 30.1 u/m2; ardoises_par_m2 29.8 u/m2; ardoises_par_m2 29.6 u/m2; ardoises_par_m2 34.3 u/m2; ardoises_par_m2 33.5 u/m2; ardoises_par_m2 32.5 u/m2; ardoises_par_m2 32.0 u/m2; ardoises_par_m2 31.7 u/m2; ardoises_par_m2 31.1 u/m2; ardoises_par_m2 30.8 u/m2; ardoises_par_m2 30.5 u/m2; ardoises_par_m2 30.1 u/m2; poids_unitaire 0.784 kg
- **Toutes marques 35×25** (confirme 34) : ardoises_par_m2 30.6 u/m2; ardoises_par_m2 30.1 u/m2; ardoises_par_m2 29.3 u/m2; ardoises_par_m2 29.0 u/m2; ardoises_par_m2 28.5 u/m2; ardoises_par_m2 28.1 u/m2; ardoises_par_m2 27.7 u/m2; ardoises_par_m2 27.7 u/m2; ardoises_par_m2 27.5 u/m2; ardoises_par_m2 32.0 u/m2; ardoises_par_m2 30.9 u/m2; ardoises_par_m2 30.3 u/m2; ardoises_par_m2 30.1 u/m2; ardoises_par_m2 29.3 u/m2; ardoises_par_m2 29.0 u/m2; ardoises_par_m2 28.5 u/m2; ardoises_par_m2 28.1 u/m2; ardoises_par_m2 27.9 u/m2; ardoises_par_m2 33.4 u/m2; ardoises_par_m2 32.4 u/m2; ardoises_par_m2 31.2 u/m2; ardoises_par_m2 30.6 u/m2; ardoises_par_m2 30.3 u/m2; ardoises_par_m2 29.6 u/m2; ardoises_par_m2 29.3 u/m2; ardoises_par_m2 29.0 u/m2; ardoises_par_m2 28.5 u/m2; ardoises_par_m2 32.5 u/m2; ardoises_par_m2 31.9 u/m2; ardoises_par_m2 31.5 u/m2; ardoises_par_m2 30.8 u/m2; ardoises_par_m2 30.4 u/m2; ardoises_par_m2 30.1 u/m2; pente_minimale_zone3_exposee 80 % (38.7°) %
- **Toutes marques 35×22** (confirme 34, confirme_fabricant 1) : ardoises_par_m2 34.8 u/m2; ardoises_par_m2 34.1 u/m2; ardoises_par_m2 33.2 u/m2; ardoises_par_m2 32.9 u/m2; ardoises_par_m2 32.4 u/m2; ardoises_par_m2 31.9 u/m2; ardoises_par_m2 31.5 u/m2; ardoises_par_m2 31.5 u/m2; ardoises_par_m2 31.2 u/m2; ardoises_par_m2 36.3 u/m2; ardoises_par_m2 35.0 u/m2; ardoises_par_m2 34.4 u/m2; ardoises_par_m2 34.1 u/m2; ardoises_par_m2 33.2 u/m2; ardoises_par_m2 32.9 u/m2; ardoises_par_m2 32.4 u/m2; ardoises_par_m2 31.9 u/m2; ardoises_par_m2 31.7 u/m2; ardoises_par_m2 37.8 u/m2; ardoises_par_m2 36.8 u/m2; ardoises_par_m2 35.4 u/m2; ardoises_par_m2 34.8 u/m2; ardoises_par_m2 34.4 u/m2; ardoises_par_m2 33.6 u/m2; ardoises_par_m2 33.2 u/m2; ardoises_par_m2 32.9 u/m2; ardoises_par_m2 32.4 u/m2; ardoises_par_m2 36.9 u/m2; ardoises_par_m2 36.2 u/m2; ardoises_par_m2 35.7 u/m2; ardoises_par_m2 34.9 u/m2; ardoises_par_m2 34.5 u/m2; ardoises_par_m2 34.1 u/m2; pente_minimale_zone3_exposee 80 % (38.7°) %; poids_unitaire 0.755 kg
- **Toutes marques 35×20** (confirme 27) : ardoises_par_m2 38.2 u/m2; ardoises_par_m2 37.5 u/m2; ardoises_par_m2 36.5 u/m2; ardoises_par_m2 36.1 u/m2; ardoises_par_m2 35.6 u/m2; ardoises_par_m2 35.1 u/m2; ardoises_par_m2 34.6 u/m2; ardoises_par_m2 34.6 u/m2; ardoises_par_m2 34.3 u/m2; ardoises_par_m2 39.9 u/m2; ardoises_par_m2 38.5 u/m2; ardoises_par_m2 37.7 u/m2; ardoises_par_m2 37.5 u/m2; ardoises_par_m2 36.5 u/m2; ardoises_par_m2 36.1 u/m2; ardoises_par_m2 35.6 u/m2; ardoises_par_m2 35.1 u/m2; ardoises_par_m2 34.8 u/m2; ardoises_par_m2 41.6 u/m2; ardoises_par_m2 40.4 u/m2; ardoises_par_m2 38.9 u/m2; ardoises_par_m2 38.2 u/m2; ardoises_par_m2 37.7 u/m2; ardoises_par_m2 36.9 u/m2; ardoises_par_m2 36.5 u/m2; ardoises_par_m2 36.1 u/m2; ardoises_par_m2 35.6 u/m2
- **Toutes marques 33×23** (confirme 33, confirme_fabricant 1) : ardoises_par_m2 36.1 u/m2; ardoises_par_m2 35.3 u/m2; ardoises_par_m2 34.3 u/m2; ardoises_par_m2 33.9 u/m2; ardoises_par_m2 33.4 u/m2; ardoises_par_m2 32.9 u/m2; ardoises_par_m2 32.4 u/m2; ardoises_par_m2 32.4 u/m2; ardoises_par_m2 32.1 u/m2; ardoises_par_m2 37.8 u/m2; ardoises_par_m2 36.4 u/m2; ardoises_par_m2 35.6 u/m2; ardoises_par_m2 35.3 u/m2; ardoises_par_m2 34.3 u/m2; ardoises_par_m2 33.9 u/m2; ardoises_par_m2 33.4 u/m2; ardoises_par_m2 32.9 u/m2; ardoises_par_m2 32.6 u/m2; ardoises_par_m2 38.3 u/m2; ardoises_par_m2 36.8 u/m2; ardoises_par_m2 36.1 u/m2; ardoises_par_m2 35.6 u/m2; ardoises_par_m2 34.8 u/m2; ardoises_par_m2 34.3 u/m2; ardoises_par_m2 33.9 u/m2; ardoises_par_m2 33.4 u/m2; poids_unitaire 0.744 kg; ardoises_par_m2 38.5 u/m2; ardoises_par_m2 37.6 u/m2; ardoises_par_m2 37.2 u/m2; ardoises_par_m2 36.2 u/m2; ardoises_par_m2 35.8 u/m2; ardoises_par_m2 35.3 u/m2; pente_minimale_zone3_exposee 80 % (38.7°) %
- **Toutes marques 32×22** (confirme 33, a_confirmer 1) : ardoises_par_m2 39.3 u/m2; ardoises_par_m2 38.5 u/m2; ardoises_par_m2 37.4 u/m2; ardoises_par_m2 36.9 u/m2; ardoises_par_m2 36.3 u/m2; ardoises_par_m2 35.7 u/m2; ardoises_par_m2 35.2 u/m2; ardoises_par_m2 35.2 u/m2; ardoises_par_m2 34.9 u/m2; ardoises_par_m2 41.3 u/m2; ardoises_par_m2 39.7 u/m2; ardoises_par_m2 38.8 u/m2; ardoises_par_m2 38.5 u/m2; ardoises_par_m2 37.4 u/m2; ardoises_par_m2 36.9 u/m2; ardoises_par_m2 36.3 u/m2; ardoises_par_m2 35.7 u/m2; ardoises_par_m2 35.4 u/m2; ardoises_par_m2 41.9 u/m2; ardoises_par_m2 40.2 u/m2; ardoises_par_m2 39.3 u/m2; ardoises_par_m2 38.8 u/m2; ardoises_par_m2 37.8 u/m2; ardoises_par_m2 37.4 u/m2; ardoises_par_m2 36.9 u/m2; ardoises_par_m2 36.3 u/m2; ardoises_par_m2 41.1 u/m2; ardoises_par_m2 40.6 u/m2; ardoises_par_m2 39.5 u/m2; ardoises_par_m2 39.0 u/m2; ardoises_par_m2 38.5 u/m2; pente_minimale_zone3_exposee 90 % (42.0°) %; poids_unitaire 0.69 kg
- **Toutes marques 30×22** (confirme 24) : ardoises_par_m2 43.1 u/m2; ardoises_par_m2 42.1 u/m2; ardoises_par_m2 40.8 u/m2; ardoises_par_m2 40.2 u/m2; ardoises_par_m2 39.5 u/m2; ardoises_par_m2 38.8 u/m2; ardoises_par_m2 38.2 u/m2; ardoises_par_m2 38.2 u/m2; ardoises_par_m2 37.8 u/m2; ardoises_par_m2 43.5 u/m2; ardoises_par_m2 42.5 u/m2; ardoises_par_m2 42.1 u/m2; ardoises_par_m2 40.8 u/m2; ardoises_par_m2 40.2 u/m2; ardoises_par_m2 39.5 u/m2; ardoises_par_m2 38.8 u/m2; ardoises_par_m2 38.5 u/m2; ardoises_par_m2 44.2 u/m2; ardoises_par_m2 43.1 u/m2; ardoises_par_m2 42.5 u/m2; ardoises_par_m2 41.3 u/m2; ardoises_par_m2 40.8 u/m2; ardoises_par_m2 40.2 u/m2; ardoises_par_m2 39.5 u/m2
- **Toutes marques 30×20** (confirme 29, une_source 1) : ardoises_par_m2 47.4 u/m2; ardoises_par_m2 46.3 u/m2; ardoises_par_m2 44.8 u/m2; ardoises_par_m2 44.2 u/m2; ardoises_par_m2 43.4 u/m2; ardoises_par_m2 42.7 u/m2; ardoises_par_m2 41.9 u/m2; ardoises_par_m2 41.9 u/m2; ardoises_par_m2 41.6 u/m2; ardoises_par_m2 47.8 u/m2; ardoises_par_m2 46.7 u/m2; ardoises_par_m2 46.3 u/m2; ardoises_par_m2 44.8 u/m2; ardoises_par_m2 44.2 u/m2; ardoises_par_m2 43.4 u/m2; ardoises_par_m2 42.7 u/m2; ardoises_par_m2 42.3 u/m2; ardoises_par_m2 48.5 u/m2; ardoises_par_m2 47.4 u/m2; ardoises_par_m2 46.7 u/m2; ardoises_par_m2 45.4 u/m2; ardoises_par_m2 44.8 u/m2; ardoises_par_m2 44.2 u/m2; ardoises_par_m2 43.4 u/m2; ardoises_par_m2 49.0 u/m2; ardoises_par_m2 47.6 u/m2; ardoises_par_m2 46.9 u/m2; ardoises_par_m2 46.3 u/m2; pente_minimale_zone3_exposee 100 % (45.0°) %; poids_unitaire 0.588 kg
- **Toutes marques 30×18** (confirme 24) : ardoises_par_m2 52.5 u/m2; ardoises_par_m2 51.3 u/m2; ardoises_par_m2 49.7 u/m2; ardoises_par_m2 49.0 u/m2; ardoises_par_m2 48.1 u/m2; ardoises_par_m2 47.3 u/m2; ardoises_par_m2 46.5 u/m2; ardoises_par_m2 46.5 u/m2; ardoises_par_m2 46.1 u/m2; ardoises_par_m2 53.1 u/m2; ardoises_par_m2 51.8 u/m2; ardoises_par_m2 51.3 u/m2; ardoises_par_m2 49.7 u/m2; ardoises_par_m2 49.0 u/m2; ardoises_par_m2 48.1 u/m2; ardoises_par_m2 47.3 u/m2; ardoises_par_m2 46.9 u/m2; ardoises_par_m2 53.8 u/m2; ardoises_par_m2 52.5 u/m2; ardoises_par_m2 51.8 u/m2; ardoises_par_m2 50.4 u/m2; ardoises_par_m2 49.7 u/m2; ardoises_par_m2 49.0 u/m2; ardoises_par_m2 48.1 u/m2
- **Toutes marques 27×18** (confirme 22, une_source 2) : ardoises_par_m2 59.7 u/m2; ardoises_par_m2 57.5 u/m2; ardoises_par_m2 56.6 u/m2; ardoises_par_m2 55.5 u/m2; ardoises_par_m2 54.4 u/m2; ardoises_par_m2 53.3 u/m2; ardoises_par_m2 53.3 u/m2; ardoises_par_m2 52.8 u/m2; ardoises_par_m2 60.4 u/m2; ardoises_par_m2 59.7 u/m2; ardoises_par_m2 57.5 u/m2; ardoises_par_m2 56.6 u/m2; ardoises_par_m2 55.5 u/m2; ardoises_par_m2 54.4 u/m2; ardoises_par_m2 53.8 u/m2; ardoises_par_m2 60.4 u/m2; ardoises_par_m2 58.4 u/m2; ardoises_par_m2 57.5 u/m2; ardoises_par_m2 56.6 u/m2; ardoises_par_m2 55.5 u/m2; ardoises_par_m2 60.7 u/m2; ardoises_par_m2 59.7 u/m2; pente_minimale_zone3_exposee 140 % (54.5°) %; poids_unitaire 0.476 kg
- **Toutes marques 27×16** (confirme 20) : ardoises_par_m2 67.0 u/m2; ardoises_par_m2 64.6 u/m2; ardoises_par_m2 63.6 u/m2; ardoises_par_m2 62.3 u/m2; ardoises_par_m2 61.0 u/m2; ardoises_par_m2 59.9 u/m2; ardoises_par_m2 59.9 u/m2; ardoises_par_m2 59.3 u/m2; ardoises_par_m2 67.8 u/m2; ardoises_par_m2 67.0 u/m2; ardoises_par_m2 64.6 u/m2; ardoises_par_m2 63.6 u/m2; ardoises_par_m2 62.3 u/m2; ardoises_par_m2 61.0 u/m2; ardoises_par_m2 60.4 u/m2; ardoises_par_m2 67.8 u/m2; ardoises_par_m2 65.6 u/m2; ardoises_par_m2 64.6 u/m2; ardoises_par_m2 63.6 u/m2; ardoises_par_m2 62.3 u/m2
- **Toutes marques 25×18** (confirme 16) : ardoises_par_m2 64.3 u/m2; ardoises_par_m2 63.2 u/m2; ardoises_par_m2 61.7 u/m2; ardoises_par_m2 60.4 u/m2; ardoises_par_m2 59.1 u/m2; ardoises_par_m2 59.1 u/m2; ardoises_par_m2 58.4 u/m2; ardoises_par_m2 64.3 u/m2; ardoises_par_m2 63.2 u/m2; ardoises_par_m2 61.7 u/m2; ardoises_par_m2 60.4 u/m2; ardoises_par_m2 59.7 u/m2; ardoises_par_m2 65.4 u/m2; ardoises_par_m2 64.3 u/m2; ardoises_par_m2 63.2 u/m2; ardoises_par_m2 61.7 u/m2
- **Toutes marques 25×15** (confirme 16) : ardoises_par_m2 76.9 u/m2; ardoises_par_m2 75.6 u/m2; ardoises_par_m2 73.9 u/m2; ardoises_par_m2 72.2 u/m2; ardoises_par_m2 70.7 u/m2; ardoises_par_m2 70.7 u/m2; ardoises_par_m2 69.9 u/m2; ardoises_par_m2 76.9 u/m2; ardoises_par_m2 75.6 u/m2; ardoises_par_m2 73.9 u/m2; ardoises_par_m2 72.2 u/m2; ardoises_par_m2 71.4 u/m2; ardoises_par_m2 78.3 u/m2; ardoises_par_m2 76.9 u/m2; ardoises_par_m2 75.6 u/m2; ardoises_par_m2 73.9 u/m2
- **Toutes marques 22×16** (confirme 9) : ardoises_par_m2 83.5 u/m2; ardoises_par_m2 81.3 u/m2; ardoises_par_m2 79.2 u/m2; ardoises_par_m2 79.2 u/m2; ardoises_par_m2 78.2 u/m2; ardoises_par_m2 83.5 u/m2; ardoises_par_m2 81.3 u/m2; ardoises_par_m2 80.2 u/m2; ardoises_par_m2 83.5 u/m2
- **Toutes marques 40×24 (format fibres-ciment, pas un modèle d'ardoise naturelle)** (a_confirmer 1) : format_dans_les_tables_fabricant format fibres-ciment (Cedral, Cembrit) ; absent des gammes et des tables d'ardoise naturelle relevées (Cupa, Rathscheck, Samaca, InterSIN, Ministère)
- **Toutes marques 32×20** (confirme 1) : format_dans_les_tables_fabricant absent des tables et des gammes des fabricants relevés
- **Toutes marques 24×16** (confirme 1) : format_dans_les_tables_fabricant absent des tables et des gammes des fabricants relevés
- **Toutes marques 22×18** (confirme 1) : format_dans_les_tables_fabricant absent des tables et des gammes des fabricants relevés
- **Toutes marques 30×20, 33×23, 35×22, 35×25, 40×22, 40×25, 27×18** (a_confirmer 1) : ardoises_par_palette None u/palette
- **ArcelorMittal Périgueux (TE Pointes) pointe tête extra-large galvanisée 2,70 × 30** (confirme_fabricant 1) : clous_par_kg 653 u/kg
- **Cupa Pizarras Cupa 2** (confirme_fabricant 1) : carriere_et_epaisseurs carrière souterraine de Riodolas, Carballeda de Valdeorras (Ourense), depuis 1972 ; épaisseurs nominales 3,5 à 6 mm
- **Cupa Pizarras Cupa 3** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Solana de Forcadas (León), zone San Pedro, depuis 1892 ; épaisseur moyenne 3,5 mm, 7 à 8 mm en « Heavy »
- **Cupa Pizarras Cupa 4** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Armadilla, zone Benuza (León), depuis 1968 ; 3,5 à 4 mm, jusqu'à 8 mm (modèles épais) ; gamme Monument historique
- **Cupa Pizarras Cupa 5** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Valdacal, zone Pusmazán (Ourense), depuis 1971 ; 3,5 à 5 mm, 7-8 mm (épais, Pyrineas) ; gris clair
- **Cupa Pizarras Cupa 6** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Los Campos, zone San Pedro (León), depuis 1968 ; 3,5 à 5 mm
- **Cupa Pizarras Cupa 7** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Las Arcas Prada, zone San Pedro (León), depuis 1983 ; 3,5 à 5 mm
- **Cupa Pizarras Cupa 9** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Anabel, Abejera de Aliste (Zamora), depuis 2001 ; 4, 5 et jusqu'à 8 mm ; noire
- **Cupa Pizarras Cupa 10** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Las Arcas, zone San Pedro (León), depuis 1983 ; 3,5 à 5 mm
- **Cupa Pizarras Cupa 13** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Sotillo, zone Benuza (León), depuis 1992 ; 3,5 à 5 mm
- **Cupa Pizarras Cupa 17** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Trevinca, Casayo, zone Rozadais (Ourense), depuis 1960 ; 3,5 mm, 8 mm en « Heavy »
- **Cupa Pizarras Cupa 30** (confirme_fabricant 1) : carriere_et_epaisseurs carrière La Invencible (Proinor), Sobradelo (Ourense), depuis 1968 ; 5, 6,5 et 7,5 mm
- **Cupa Pizarras Cupa 37** (confirme_fabricant 1) : carriere_et_epaisseurs carrière Paraje de Rozadais (Ourense), depuis 1985 ; 3,5, 4 et 7,5 mm ; gris clair
- **Cupa Pizarras Cupa Sélection Plus (Plus / Plus NF)** (confirme_fabricant 1) : carriere_et_formats carrière Los Campos, San Pedro (León) ; formats 27×18, 30×20, 32×22, 40×22 ; épaisseur 3,5 mm
- **Cupa Pizarras Cupa 10 Excellence 32×22** (une_source 1) : ardoises_par_palette 1950 u/palette
- **Pizarras Samaca Samaca 29** (confirme_fabricant 1) : carriere_et_formats carrière María del Carmen, La Baña (León) ; noire ; formats rectangulaires 60×30, 50×30, 50×25, 40×25, 40×22, 40×20, 35×25, 35×22, 35×20, 32×22, 30×20
- **Pizarras Samaca Samaca 33** (confirme_fabricant 1) : carriere_et_formats carrière Os Follos, O Alto da Cova, Carballeda de Valdeorras (Ourense) ; formats rectangulaires 40×25, 40×22, 40×20, 35×22, 32×22, 30×20, 27×18
- **Pizarras Samaca Samaca 44** (confirme_fabricant 1) : carriere_et_formats carrière Vianzola, Lardeira, Carballeda de Valdeorras (Ourense) ; formats rectangulaires 40×25, 40×22, 40×20, 35×22, 32×22, 30×20, 27×18
- **Pizarras Samaca Samaca 47** (confirme_fabricant 1) : carriere_et_formats site de Rozadais (Ourense), exploité depuis 1985 ; formats rectangulaires 40×25, 40×22, 40×20, 35×22, 32×22, 30×20, 27×18
- **Pizarras Samaca Samaca 55** (confirme_fabricant 1) : carriere_et_formats carrière Juanita, Los Molinos, Carballeda de Valdeorras (Ourense), depuis les années 1960 ; formats rectangulaires 60×30, 50×30, 50×25, 40×25, 40×22, 40×20, 35×25, 35×22, 35×20, 32×22, 30×20
- **Rathscheck Schiefer (InterSIN) SIN 120** (confirme_fabricant 1) : carriere_formats_epaisseurs carrière A Fraguiña, Carballeda de Valdeorras (Ourense) ; Primera : 60×30 à 27×18, 3,5 à 6 mm (32×22 en 3,5 / 5) ; Standard : 46×30 à 40×20
- **Rathscheck Schiefer (InterSIN) SIN 150** (confirme_fabricant 1) : carriere_formats_epaisseurs carrière Valdemiguel ; Primera : 60×30 à 27×18 ; 32×22 en 4 / 5 / 6-8 mm, 30×20 en 5 / 6-8 mm, 27×18 en 5 mm
- **Rathscheck Schiefer (InterSIN) SIN 240** (confirme_fabricant 1) : carriere_formats_epaisseurs carrière Rozadais III, Casaio (Ourense) ; Primera : 40×22, 35×22, 32×22 (4/5 mm), 30×20, 27×18 (4 mm) ; Standard 40×22 à 30×20
- **Rathscheck Schiefer (InterSIN) SIN 340** (confirme_fabricant 1) : carriere_formats_epaisseurs carrière Fuidemalo Amable, La Baña (León) ; Primera : 40×22, 35×22, 32×22, 30×22 (3,5 mm) ; Standard : 40×22 (3,5), 32×22 et 30×20 (3,5 / 5), 27×18 (3,5)
- **Rathscheck Schiefer (InterSIN) SIN 340 Fine 32×22 NF** (une_source 1) : ardoises_par_palette 1700 u/palette
- **Minardoises (marque négoce) K08 Star 32×22** (une_source 1) : ardoises_par_palette 2200 u/palette

### ardoise fibres-ciment

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| mode_de_fixation | 1 crochet (tous formats) ; ou 2 clous (formats ≤ 40×24) ; ou 2 clous + 1 crampon tempête (formats ≥ 45×30) ; claire-voie : 2 crochets  | NF DTU 40.13 (Cedral) | confirme |
| longueur_crochet | R + 10 mm mm | ardoise fibres-ciment (Cedral, Cembrit), pose au crochet | confirme |
| ardoises_par_palette | 33×23 : 3 000 ; 40×24 : 1 980 ; 45×30 : 1 440 ; 60×30 : 1 080 ; 40×22 (Kergoat ronde) : 1 920 u | Cedral, gammes Tecta / Kergoat (poids 0,53 / 0,86 / 1,22 / 1,62 / 0,78 kg l'ardoise ; palette 1 580 / 1 703 / 1 757 / 1 750 / 1 501 kg) | confirme_fabricant |
| format_en_couverture_france | absents des gammes couverture en France  | 40×27 et 60×40 (référentiel §4) | confirme |

- **Cedral 33×23** (confirme_fabricant 5) : ardoises_par_m2 32.59 u/m2; ardoises_par_m2 33.9 u/m2; ardoises_par_m2 35.31 u/m2; ardoises_par_m2 36.85 u/m2; ardoises_par_m2 38.52 u/m2
- **Cedral 40×22 (Kergoat ronde)** (confirme_fabricant 6) : ardoises_par_m2 27.23 u/m2; ardoises_par_m2 28.09 u/m2; ardoises_par_m2 29.01 u/m2; ardoises_par_m2 30.0 u/m2; ardoises_par_m2 31.05 u/m2; ardoises_par_m2 32.18 u/m2
- **Cedral 40×24** (confirme 7) : ardoises_par_m2 24.64 u/m2; ardoises_par_m2 25.41 u/m2; ardoises_par_m2 26.23 u/m2; ardoises_par_m2 27.1 u/m2; ardoises_par_m2 28.03 u/m2; ardoises_par_m2 29.04 u/m2; recouvrement_minimal 100 mm
- **Cedral 45×30** (confirme 9) : ardoises_par_m2 17.2 u/m2; ardoises_par_m2 17.66 u/m2; ardoises_par_m2 18.16 u/m2; ardoises_par_m2 18.67 u/m2; ardoises_par_m2 19.22 u/m2; ardoises_par_m2 19.81 u/m2; ardoises_par_m2 20.42 u/m2; ardoises_par_m2 21.08 u/m2; ardoises_par_m2 21.79 u/m2
- **Cedral 60×30** (confirme 9) : ardoises_par_m2 12.33 u/m2; ardoises_par_m2 12.57 u/m2; ardoises_par_m2 12.82 u/m2; ardoises_par_m2 13.08 u/m2; ardoises_par_m2 13.34 u/m2; ardoises_par_m2 13.62 u/m2; ardoises_par_m2 13.91 u/m2; ardoises_par_m2 14.21 u/m2; ardoises_par_m2 14.53 u/m2

## Tuiles à emboîtement et à glissement

### grand moule fortement galbé

- **Edilians Aquitaine Poudenx** (confirme_fabricant 11) : tuiles_par_m2 11 u/m2; pureau 375 mm; largeur_utile 247 mm; poids_unitaire 4.2 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier à pureau variable 2,5 à 3/ml ; faîtière sans emboîtement 2,5/ml texte; note Nb au m² lu dans « Poids au m² ≃ 46,2 kg (11 tuiles au m²) ». texte
- **Edilians Médiane Plus Gélis** (confirme_fabricant 16) : tuiles_par_m2_min 11.8 u/m2; tuiles_par_m2_max 13.6 u/m2; pureau_min 360 mm; pureau_max 376 mm; largeur_utile 205-225 mm; poids_unitaire 3.8 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier à bourrelet 2,5/ml ; à pureau variable 2,5 à 3/ml texte; liteaux_ml_par_m2 2.78 (pureau mini) / 2.66 (pureau maxi) ml/m2; note Pose libre (largeur utile 205 à 225) : 11,8 à 13,6 /m² (fiche 2026) ; pose bloquée à 240 mm : 11,1 à 11,6 /m² (encyclopédie 2024). Demander le mode de pose si le devis ne le dit pas. texte; tuiles_par_m2_pose_bloquee 11,1 à 11,6 u/m2
- **Edilians Médiane Réno Gélis** (confirme_fabricant 14) : tuiles_par_m2_min 11.1 u/m2; tuiles_par_m2_max 13.6 u/m2; pureau_min 360 mm; pureau_max 376 mm; largeur_utile 205-240 mm; poids_unitaire 3.8 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier à bourrelet 2,5/ml ; à pureau variable 2,5 à 3/ml texte; liteaux_ml_par_m2 2.78 (pureau mini) / 2.66 (pureau maxi) ml/m2
- **Edilians Méridionale Poudenx** (confirme_fabricant 11) : tuiles_par_m2 13.5 u/m2; pureau 358 mm; largeur_utile 210 mm; poids_unitaire 3.4 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.8 u/ml; faitieres_par_ml faîtière sans emboîtement 2,5/ml ; à pureau variable 2,5 à 3/ml texte
- **Edilians Oméga 10 Ste Foy** (confirme_fabricant 13) : tuiles_par_m2_min 10 u/m2; tuiles_par_m2_max 11.7 u/m2; pureau_min 390 mm; pureau_max 410 mm; poids_unitaire 4.83 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.5 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 2,5/ml ; conique 2,5/ml texte; liteaux_ml_par_m2 2.56 (pureau mini) / 2.44 (pureau maxi) ml/m2
- **Edilians Oméga 13 Ste Foy** (confirme_fabricant 14) : tuiles_par_m2_min 12.6 u/m2; tuiles_par_m2_max 14.3 u/m2; pureau_min 367 mm; pureau_max 377 mm; largeur_utile 190-210 mm; poids_unitaire 3.7 kg; tuiles_par_palette 288 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 2,5/ml ; conique 2,5/ml texte; liteaux_ml_par_m2 2.72 (pureau mini) / 2.65 (pureau maxi) ml/m2
- **Edilians Oméga Max Ste Foy** (confirme_fabricant 14) : tuiles_par_m2_min 8.8 u/m2; tuiles_par_m2_max 9.7 u/m2; pureau_min 400 mm; pureau_max 440 mm; largeur_utile 259 mm; poids_unitaire 5.2 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.5 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 2,5/ml ; conique 2,5/ml ; lisse 2,5/ml texte; liteaux_ml_par_m2 2.5 (pureau mini) / 2.27 (pureau maxi) ml/m2
- **Edilians Plein Sud Gélis** (confirme_fabricant 14) : tuiles_par_m2_min 9.6 u/m2; tuiles_par_m2_max 11.4 u/m2; pureau_min 380 mm; pureau_max 404 mm; largeur_utile 231-257 mm; poids_unitaire 4.4 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.6 u/ml; faitieres_par_ml faîtière 2,5/ml ; à pureau variable 2,5 à 3/ml texte; liteaux_ml_par_m2 2.63 (pureau mini) / 2.47 (pureau maxi) ml/m2
- **Edilians Plein Sud Réabilis Gélis** (confirme_fabricant 14) : tuiles_par_m2 10 u/m2; pureau_min 380 mm; pureau_max 404 mm; largeur_utile 231-257 mm; poids_unitaire 4.4 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.6 u/ml; faitieres_par_ml faîtière/arêtier pureau variable 2,5 à 3/ml texte; liteaux_ml_par_m2 2.63 (pureau mini) / 2.47 (pureau maxi) ml/m2; note Seul « ≃ 44 kg (10 tuiles au m²) » est donné ; la plage selon pureau n'est pas imprimée. texte
- **Edilians Romane Sans** (confirme_fabricant 13) : tuiles_par_m2_min 13.2 u/m2; tuiles_par_m2_max 13.8 u/m2; pureau 355 mm; largeur_utile 209 mm; poids_unitaire 3.2 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.8 u/ml; faitieres_par_ml faîtière/arêtier à bourrelet 2,5/ml ; à pureau variable 2,5 à 3/ml texte; liteaux_ml_par_m2 2.82 (pureau mini) / 2.82 (pureau maxi) ml/m2
- **Koramic Kanal 10** (confirme_fabricant 9) : tuiles_par_m2 10 u/m2; pureau_min 362 mm; pureau_max 392 mm; largeur_utile 235-250 mm; poids_unitaire 4.7 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code
- **Koramic Romane 1.2** (confirme_fabricant 10) : tuiles_par_m2_min 11.5 u/m2; tuiles_par_m2_max 12 u/m2; pureau_min 347 mm; pureau_max 372 mm; largeur_utile 237 mm; poids_unitaire 3.9 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code
- **Terreal Val de Saône** (confirme_fabricant 9) : tuiles_par_m2 10 u/m2; pureau_min 395 mm; pureau_max 415 mm; largeur_utile 210-245 mm; poids_unitaire 4.6 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code
- **Monier Gallo-Romane** (confirme_fabricant 13) : tuiles_par_m2_min 12.4 u/m2; tuiles_par_m2_max 13 u/m2; pureau_min 358 mm; pureau_max 368 mm; largeur_utile 217 mm; liteaux_ml_par_m2 2.8 (pureau mini) / 2.7 (pureau maxi) ml/m2; poids_unitaire 3.4 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; pente_minimale 19 % / 10°76' (zone 1, site protégé, avec écran, rampant < 6,5 m) % du support; note Modèle ajouté le 19/11/2026 depuis le catalogue BMI Monier en ligne. Région affichée par BMI : Pays de la Loire (lieu de fabrication probable, pas une zone de vente). texte
- **Monier Romane (Monier)** (confirme_fabricant 13) : tuiles_par_m2_min 13 u/m2; tuiles_par_m2_max 13.6 u/m2; pureau_min 358 mm; pureau_max 366 mm; largeur_utile 208 mm; liteaux_ml_par_m2 2.8 (pureau mini) / 2.7 (pureau maxi) ml/m2; poids_unitaire 3.2 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; pente_minimale 30 % / 16°70' (fiche) ; 19 % / 10°76' (page produit) % du support; note Modèle ajouté le 19/11/2026 depuis le catalogue BMI Monier en ligne. Région affichée par BMI : Occitanie (lieu de fabrication probable, pas une zone de vente). texte

### grand moule fortement galbé (aspect canal)

- **Edilians Canal S Poudenx** (confirme_fabricant 15, a_confirmer 1) : tuiles_par_m2_min 11.1 u/m2; tuiles_par_m2_max 11.8 u/m2; pureau 375 mm; largeur_utile 233 mm; poids_unitaire 4.45 kg; tuiles_par_palette 200 u; dtu 40.21 NF DTU; classe_galbe G3 classe; famille_pente C* code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier à pureau variable 2,5 à 3/ml ; faîtière sans emboîtement 2,5/ml ; tuile d'égout 4,3/ml texte; note Tableau de pentes propre au modèle (valeurs plus hautes que la famille C), à relire sur la fiche. texte; tuiles_par_m2 11.4 u/m2; pureau_min 369 mm; pureau_max 381 mm
- **Monier Galleane 10** (confirme_fabricant 13) : tuiles_par_m2_min 9.9 u/m2; tuiles_par_m2_max 11.3 u/m2; pureau_min 353 mm; pureau_max 383 mm; largeur_utile 250-265 mm; liteaux_ml_par_m2 2.8 (pureau mini) / 2.6 (pureau maxi) ml/m2; poids_unitaire 4.5 kg; tuiles_par_palette 144 u; dtu 40.21 NF DTU; classe_galbe G2 classe; pente_minimale 19 % / 10°76' % du support; note Modèle ajouté le 19/11/2026 depuis le catalogue BMI Monier en ligne. Région affichée par BMI : Grand Est (lieu de fabrication probable, pas une zone de vente). texte
- **Monier Abeille** (confirme_fabricant 13) : tuiles_par_m2_min 9.5 u/m2; tuiles_par_m2_max 10.1 u/m2; pureau_min 400 mm; pureau_max 414 mm; largeur_utile 252 mm; liteaux_ml_par_m2 2.5 (pureau mini) / 2.4 (pureau maxi) ml/m2; poids_unitaire 4.6 kg; tuiles_par_palette 144 u; dtu 40.21 NF DTU; classe_galbe G2 classe; pente_minimale 19 % / 10°76' % du support; note Modèle ajouté le 19/11/2026 depuis le catalogue BMI Monier en ligne. Région affichée par BMI : Auvergne-Rhône-Alpes (lieu de fabrication probable, pas une zone de vente). texte

### grand moule à pureau plat

- **Edilians Alpha 10 Ste Foy** (confirme_fabricant 14, a_confirmer 1) : tuiles_par_m2_min 10 u/m2; tuiles_par_m2_max 11.2 u/m2; pureau_min 330 mm; pureau_max 370 mm; largeur_utile 270 mm; poids_unitaire 4.43 kg; tuiles_par_palette 240 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A* code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 3 ou 2,5/ml selon modèle ; angulaire 3/ml ; à bourrelet 2,5/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 3.0 (pureau mini) / 2.7 (pureau maxi) ml/m2; note Avec écran, pentes propres au modèle : 35/35/40 (protégé et normal), plus basses que la famille A. texte
- **Edilians HP 10 Huguenot** (confirme_fabricant 21) : tuiles_par_m2_min 9.9 u/m2; tuiles_par_m2_max 12 u/m2; pureau_min 310 mm; pureau_max 376 mm; largeur_utile 268 mm; poids_unitaire 4.3 kg; tuiles_par_palette 240 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier angulaire 710 3/ml ; losangée 716 et 1/2 rond 717 2,5/ml ; arêtier 758 2,5/ml ; faîtière Shed 3/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 3.22 (pureau mini) / 2.66 (pureau maxi) ml/m2; demi_tuile 1/2 tuile HP 10 Huguenot référence; chatiere_section_ventilation 50 cm²; tuile_a_douille tuile à douille HP 10 Huguenot Ø 160, conforme VMC (réf. 205.32) ; lanterne bi-section Ø 126 et Ø 160, section d'aération 259 cm² (réf. 1007) ; kit VMC Mangouste 160 référence; tuiles_de_rive_references tuile de rive à rabat D 205.72 / G 205.73 (2,7/ml) ; 1/2 tuile de rive à rabat D 205.74 / G 205.75 (2,7/ml) ; rive universelle 1050 (3/ml) ; rive individuelle PV 13 Huguenot D 215.41 / G 215.42 (2,7/ml au pureau de 368 mm) référence; abouts_references about de faîtière losangée 824 ; about d'arêtier angulaire 859 ; about d'arêtier à emboîtement 863 ; about de faîtière/arêtier 1/2 rond 869 ; about de rive universelle G 1070 / D 1071 ; frontons 801 (angulaire), 805/806 (Shed), 807 (1/2 rond), 809 (losangée), 1080 (rive universelle) référence; tuile_de_finition tuile de finition 205.80 (sur commande) ; 1/2 tuile de finition 205.86 référence; tuile_en_verre réf. VER205 ; pose limitée à 3 unités et 2 rangs successifs référence
- **Edilians HP 13 Évolutive Huguenot** (confirme_fabricant 14) : tuiles_par_m2_min 13.3 u/m2; tuiles_par_m2_max 16.6 u/m2; pureau_min 280 mm; pureau_max 350 mm; largeur_utile 215 mm; poids_unitaire 3.7 kg; tuiles_par_palette 300 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A code; rives_par_ml_et_par_cote 2.9 u/ml; faitieres_par_ml faîtière/arêtier angulaire 3/ml ; losangée et 1/2 rond 2,5/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 3.57 (pureau mini) / 2.85 (pureau maxi) ml/m2
- **Koramic Nueva** (confirme_fabricant 9) : tuiles_par_m2 9.5 u/m2; pureau_min 345 mm; pureau_max 370 mm; largeur_utile 282 mm; poids_unitaire 4.7 kg; tuiles_par_palette 240 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A code
- **Koramic Actua (ex-Actua de Migeon)** (confirme_fabricant 12, a_confirmer 1) : tuiles_par_m2 10 u/m2; pureau_min 310 mm; pureau_max 380 mm; largeur_utile 262 mm; poids_unitaire 4.2 kg; tuiles_par_palette 240 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A (DTA : plus bas avec écran) code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière ventilée Lantenne 2,5/ml ; ventilée angulaire 3/ml ; tige de botte 3/ml ; Shed 2,4/ml texte; note Fiche Actua 2026 : « Nombre de tuiles au m2 : environ 10 », « 240 tuiles ≈ 24 m² ». Au lattage mini 310 mm : 12,3/m² (calcul). Ancien catalogue Migeon : 10,5/m². texte
- **Koramic Actua Duplex** (confirme_fabricant 9) : tuiles_par_m2 10 u/m2; pureau_min 310 mm; pureau_max 380 mm; largeur_utile 262 mm; poids_unitaire 4.4 kg; tuiles_par_palette 240 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A code
- **Monier Signy** (confirme_fabricant 15) : tuiles_par_m2_min 9.5 u/m2; tuiles_par_m2_max 11.8 u/m2; pureau_min 300 mm; pureau_max 375 mm; largeur_utile 283 mm; poids_unitaire 4.9 kg; tuiles_par_palette 210 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A code; pente_minimale 35 % / 19°29' (zone 1, site protégé et normal, rampant < 8 m en projection horizontale) % du support; tuiles_de_rive tuile de rive G/D + demi-tuile de rive, ou rive à rabat G/D + demi-tuile, ou rive universelle de 33 G/D texte; liteaux_ml_par_m2 3.3 (pureau mini) / 2.7 (pureau maxi) ml/m2; note Signy est une tuile TERRE CUITE (DTU 40.211), pas une tuile béton. texte

### grand moule à pureau plat (double tuile)

- **Edilians Double HP 20 Huguenot** (confirme_fabricant 14) : tuiles_par_m2_min 9.5 u/m2; tuiles_par_m2_max 10.6 u/m2; pureau_min 225 mm; pureau_max 250 mm; largeur_utile 418 mm; poids_unitaire 4.5 kg; tuiles_par_palette 240 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A code; rives_par_ml_et_par_cote 4.0 u/ml; faitieres_par_ml faîtière/arêtier angulaire 3/ml ; losangée 2,5/ml ; 1/2 rond 2,5/ml ; arêtier 2,5/ml texte; liteaux_ml_par_m2 4.44 (pureau mini) / 4.0 (pureau maxi) ml/m2

### grand moule à relief (double tuile)

- **Edilians Artoise Huguenot** (confirme_fabricant 11) : tuiles_par_m2 10 u/m2; pureau 264 mm; largeur_utile 389 mm; poids_unitaire 4.3 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code; rives_par_ml_et_par_cote 3.8 u/ml; faitieres_par_ml faîtière 1/2 rond 2,5/ml ; Shed 3/ml ; arêtier 2,5/ml ; rive universelle 3/ml, grande rive Patrimoine 2,5/ml texte

### grand moule à relief

- **Edilians Delta 10 Ste Foy** (confirme_fabricant 13) : tuiles_par_m2_min 10.8 u/m2; tuiles_par_m2_max 12 u/m2; pureau_min 350 mm; pureau_max 390 mm; largeur_utile 238 mm; poids_unitaire 3.6 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 2.6 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 2,5 ou 3/ml ; à bourrelet 2,5/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 2.86 (pureau mini) / 2.56 (pureau maxi) ml/m2
- **Edilians Diamant Huguenot** (confirme_fabricant 11) : tuiles_par_m2 10 u/m2; pureau 380 mm; largeur_utile 260 mm; poids_unitaire 4.3 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière 1/2 rond et losangée 2,5/ml ; angulaire 3/ml ; Shed 3/ml texte
- **Edilians H 10 Huguenot** (confirme_fabricant 14) : tuiles_par_m2_min 10 u/m2; tuiles_par_m2_max 12.4 u/m2; pureau_min 312 mm; pureau_max 388 mm; largeur_utile 259 mm; poids_unitaire 4.3 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier angulaire 3/ml ; losangée et 1/2 rond 2,5/ml ; Shed 3/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 3.2 (pureau mini) / 2.58 (pureau maxi) ml/m2
- **Edilians H 14 Huguenot** (confirme_fabricant 12) : tuiles_par_m2 13 u/m2; pureau 360 mm; largeur_utile 215 mm; poids_unitaire 3.2 kg; tuiles_par_palette 300 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code; rives_par_ml_et_par_cote 2.8 u/ml; faitieres_par_ml faîtière losangée et 1/2 ronde 2,5/ml ; Shed 3/ml ; arêtier 2,5/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 2.78 (pureau mini) / 2.78 (pureau maxi) ml/m2
- **Edilians Jura 10 Jacob** (confirme_fabricant 14, a_confirmer 1) : tuiles_par_m2_min 9.7 u/m2; tuiles_par_m2_max 10.8 u/m2; pureau_min 340 mm; pureau_max 378 mm; largeur_utile 272 mm; poids_unitaire 4.3 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B/C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 3 ou 2,5/ml ; à bourrelet 2,5/ml texte; liteaux_ml_par_m2 2.94 (pureau mini) / 2.64 (pureau maxi) ml/m2; note Sans écran : table B ; avec écran : table C (doc §35.4). texte
- **Edilians Losangée Huguenot** (confirme_fabricant 14, a_confirmer 1) : tuiles_par_m2_min 12.7 u/m2; tuiles_par_m2_max 13.62 u/m2; pureau_min 350 mm; pureau_max 364 mm; largeur_utile 216 mm; poids_unitaire 3.5 kg; tuiles_par_palette 300 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C* code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière losangée et 1/2 rond 2,5/ml ; Shed 3/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 2.94 (pureau mini) / 2.75 (pureau maxi) ml/m2; note Sans écran site protégé : valeurs propres 25/26/27, 25/28/30, 27/30/35. texte
- **Edilians Losangée Ste Foy** (confirme_fabricant 14) : tuiles_par_m2_min 11.5 u/m2; tuiles_par_m2_max 13.3 u/m2; pureau_min 330 mm; pureau_max 380 mm; largeur_utile 228 mm; poids_unitaire 3.7 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 2,5/ml ; à emboîtement 3/ml ; à bourrelet 2,5/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 3.03 (pureau mini) / 2.63 (pureau maxi) ml/m2
- **Edilians Marseille Poudenx** (confirme_fabricant 14) : tuiles_par_m2_min 12.3 u/m2; tuiles_par_m2_max 14.3 u/m2; pureau_min 317 mm; pureau_max 370 mm; largeur_utile 220 mm; poids_unitaire 3.2 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière angulaire 208.150 2,3/ml ; losangée 2,5/ml texte; liteaux_ml_par_m2 3.15 (pureau mini) / 2.7 (pureau maxi) ml/m2
- **Edilians Provinciale Ste Foy** (confirme_fabricant 14) : tuiles_par_m2_min 13.8 u/m2; tuiles_par_m2_max 15.7 u/m2; pureau_min 290 mm; pureau_max 330 mm; largeur_utile 220 mm; poids_unitaire 3.3 kg; tuiles_par_palette 300 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 3.0 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 2,5/ml ; à emboîtement 3/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 3.45 (pureau mini) / 3.03 (pureau maxi) ml/m2
- **Edilians PV 13 Huguenot** (confirme_fabricant 14) : tuiles_par_m2_min 12.6 u/m2; tuiles_par_m2_max 14.9 u/m2; pureau_min 310 mm; pureau_max 368 mm; largeur_utile 216 mm; poids_unitaire 3.5 kg; tuiles_par_palette 300 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière losangée et 1/2 rond 2,5/ml ; Shed 3/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 3.22 (pureau mini) / 2.72 (pureau maxi) ml/m2
- **Edilians Rhôna 10 Ste Foy** (confirme_fabricant 14, a_confirmer 1) : tuiles_par_m2_min 9.3 u/m2; tuiles_par_m2_max 10.1 u/m2; pureau_min 360 mm; pureau_max 390 mm; largeur_utile 276 mm; poids_unitaire 4.4 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C* code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 2,5/ml ; à emboîtement 3/ml ; angulaire 3/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 2.77 (pureau mini) / 2.56 (pureau maxi) ml/m2; note Avec écran : valeurs propres plus basses que la table C (à relire sur la fiche). texte
- **Edilians Standard 9 Jacob** (confirme_fabricant 14) : tuiles_par_m2_min 9.8 u/m2; tuiles_par_m2_max 10.8 u/m2; pureau_min 340 mm; pureau_max 375 mm; largeur_utile 273 mm; poids_unitaire 4.4 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 3 ou 2,5/ml ; à bourrelet 2,5/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 2.94 (pureau mini) / 2.67 (pureau maxi) ml/m2
- **Edilians Standard 14 Vario Jacob** (confirme_fabricant 14) : tuiles_par_m2_min 14 u/m2; tuiles_par_m2_max 17 u/m2; pureau_min 285 mm; pureau_max 350 mm; largeur_utile 205 mm; poids_unitaire 3.1 kg; tuiles_par_palette 300 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code; rives_par_ml_et_par_cote 3.0 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 2,5/ml ; à emboîtement 3/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 3.5 (pureau mini) / 2.86 (pureau maxi) ml/m2
- **Koramic Jura Nova** (confirme_fabricant 13) : tuiles_par_m2 10 u/m2; pureau_min 335 mm; pureau_max 390 mm; largeur_utile 263 mm; poids_unitaire 4.25 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 2.6 u/ml; faitieres_par_ml faîtière 1/2 ronde Seltz 2,5/ml ; Shed 2,4/ml texte; note Rive à rabat « 2,6 à 3,0 au ml » selon pureau. texte
- **Koramic Alegra** (confirme_fabricant 10) : tuiles_par_m2 10.5 u/m2; pureau_min 345 mm; pureau_max 375 mm; largeur_utile 251 mm; poids_unitaire 4.3 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code
- **Koramic VHV V** (confirme_fabricant 8) : tuiles_par_m2 15 u/m2; pureau_min 288 mm; pureau_max 308 mm; largeur_utile 216-222 mm; poids_unitaire 2.75 kg; tuiles_par_palette 384 u; dtu 40.21 NF DTU; famille_pente B code
- **Koramic Optima** (confirme_fabricant 9) : tuiles_par_m2 9 u/m2; pureau_min 335 mm; pureau_max 405 mm; largeur_utile 278 mm; poids_unitaire 4.5 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; famille_pente C code; note Lattage maxi 405 mm lu dans le guide de pose (2016). texte
- **Koramic Méga** (confirme_fabricant 10) : tuiles_par_m2 10 u/m2; pureau_min 335 mm; pureau_max 393 mm; largeur_utile 261 mm; poids_unitaire 4.35 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; note Lattage maxi 393 mm lu dans le guide de pose (2016). texte
- **Koramic Tradi 12** (confirme_fabricant 9) : tuiles_par_m2 12 u/m2; pureau_min 325 mm; pureau_max 368 mm; largeur_utile 224 mm; poids_unitaire 3.4 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code
- **Koramic Losangée Koramic** (confirme_fabricant 10) : tuiles_par_m2_min 12 u/m2; tuiles_par_m2_max 14 u/m2; pureau_min 325 mm; pureau_max 368 mm; largeur_utile 224 mm; poids_unitaire 3.5 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code
- **Koramic Standard Koramic** (confirme_fabricant 8) : tuiles_par_m2 14 u/m2; pureau 336 mm; largeur_utile 210 mm; poids_unitaire 3.15 kg; tuiles_par_palette 300 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente B code
- **Koramic Prima** (confirme_fabricant 7) : tuiles_par_m2 9.5 u/m2; pureau_max 380 mm; dtu 40.21 NF DTU; famille_pente C code; note Guide de pose 2016 (lattage maxi 380 = 9,5/m²) et page produit wienerberger.fr (lattage 340 à 380, largeur utile 278, 9,50 au lattage maxi). Calcul 1/(0,278 × 0,38) = 9,47. texte; pureau_min 340 mm; largeur_utile 278 mm

### grand moule à relief (double panne)

- **Edilians Double Panne S Huguenot** (confirme_fabricant 11) : tuiles_par_m2 10 u/m2; pureau 275 mm; largeur_utile 378 mm; poids_unitaire 4.3 kg; tuiles_par_palette 210 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code; rives_par_ml_et_par_cote 3.7 u/ml; faitieres_par_ml faîtière 1/2 rond 2,5/ml ; ondulée Terroise 3/ml ; arêtier 1/2 rond 3/ml ; rive universelle 3/ml texte

### grand moule à relief (panne)

- **Edilians Panne H2 Huguenot** (confirme_fabricant 12) : tuiles_par_m2 14 u/m2; pureau 360 mm; largeur_utile 197 mm; poids_unitaire 3.2 kg; tuiles_par_palette 288 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 2.8 u/ml; faitieres_par_ml faîtière 1/2 rond 2,5/ml ; Shed 3/ml ; arêtier 2,5/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 2.78 (pureau mini) / 2.78 (pureau maxi) ml/m2
- **Koramic Panne TFP** (confirme_fabricant 7, a_confirmer 1) : tuiles_par_m2 14.5 u/m2; pureau 344 mm; largeur_utile 200 mm; poids_unitaire 2.9 kg; tuiles_par_palette 256 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente DTA très faible pente code

### grand moule faiblement galbé À RELIEF (tuile à côte)

- **Edilians PV 10 Huguenot** (confirme_fabricant 22) : tuiles_par_m2_min 9.9 u/m2; tuiles_par_m2_max 12 u/m2; pureau_min 310 mm; pureau_max 376 mm; largeur_utile 268 mm; poids_unitaire 4.3 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier angulaire 3/ml ; 1/2 rond et losangée 2,5/ml ; Shed 3/ml ; rive universelle 3/ml texte; liteaux_ml_par_m2 3.22 (pureau mini) / 2.66 (pureau maxi) ml/m2; note « PV » = pureau variable (66 mm). Marque NF Montagne et Faible Pente, donc table C ; ce n'est PAS la famille HP 10 (40.211). Mêmes dimensions que la HP 10 sur les deux fiches officielles : ce n'est pas une copie (voir differences_avec_hp10). texte; demi_tuile 1/2 tuile PV 10 Huguenot référence; chatiere_section_ventilation 50 cm²; tuile_a_douille tuile à douille PV 10 Huguenot Ø 160, conforme VMC (réf. 214.32) ; lanterne bi-section Ø 126 et Ø 160, 259 cm² (réf. 1007) ; kit VMC Mangouste 160 référence; tuiles_de_rive_references rive individuelle à emboîtement PV 13 Huguenot D 215.41 / G 215.42 (2,7/ml au pureau de 368 mm) ; rive universelle 1050 (3/ml) ; grande rive universelle Patrimoine 1048 (2,5/ml) ; pas de tuile de rive à rabat propre au PV 10 référence; abouts_references about de faîtière losangée 824 ; about d'arêtier angulaire 859 ; about d'arêtier à emboîtement 863 ; about de faîtière/arêtier 1/2 rond 869 ; about de rive universelle G 1070 / D 1071 ; about de rive universelle Patrimoine G 1078 / D 1079 ; frontons 801, 805/806, 807, 809, 816, 816.10, 1080 référence; tuile_en_verre réf. VER214 ; pose limitée à 3 unités et 2 rangs successifs référence; differences_avec_hp10 même moule de base que la HP 10 (460 × 306 mm, largeur utile 268, pureau 310-376, 9,9 à 12/m², 4,3 kg, 240/palette : chiffres identiques sur les deux fiches) ; diffèrent : relief à côte, DTU 40.21 (HP 10 : 40.211), classe de galbe G1 (HP 10 : G0), joints droits ou croisés (HP 10 : croisés), NF Montagne et Faible Pente (pentes dès 25 % sans écran, HP 10 : 45 %), 4 coloris (HP 10 : 6), rive PV 13 au lieu des tuiles de rive à rabat 205.72-75

### petit moule à pureau plat

- **Edilians Arboise Écaille Jacob** (confirme_fabricant 11) : tuiles_par_m2 22.5 u/m2; pureau 220 mm; largeur_utile 200 mm; poids_unitaire 2.0 kg; tuiles_par_palette 480 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code; rives_par_ml_et_par_cote 4.1 u/ml; faitieres_par_ml faîtière/arêtier 1/2 rond 3 ou 2,5/ml ; angulaire 3/ml ; arêtier tige de botte 4/ml texte
- **Edilians Arboise Rectangulaire Jacob** (confirme_fabricant 14) : tuiles_par_m2_min 19.8 u/m2; tuiles_par_m2_max 20.6 u/m2; pureau_min 243 mm; pureau_max 253 mm; largeur_utile 200 mm; poids_unitaire 2.2 kg; tuiles_par_palette 480 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code; rives_par_ml_et_par_cote 4.1 u/ml; faitieres_par_ml faîtière/arêtier 1/2 ronde 3 ou 2,5/ml ; angulaire 3/ml ; tige de botte 4/ml texte; liteaux_ml_par_m2 4.11 (pureau mini) / 3.95 (pureau maxi) ml/m2
- **Edilians Beauvoise Huguenot** (confirme_fabricant 15) : tuiles_par_m2_min 20.2 u/m2; tuiles_par_m2_max 20.7 u/m2; pureau_min 242 mm; pureau_max 248 mm; largeur_utile 200 mm; poids_unitaire 2.2 kg; tuiles_par_palette 480 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code; rives_par_ml_et_par_cote 4.1 u/ml; faitieres_par_ml faîtière/arêtier angulaire 3/ml ; 1/2 rond et losangée 2,5/ml ; arêtier 2,5/ml texte; liteaux_ml_par_m2 4.08 (pureau mini) / 4.08 (pureau maxi) ml/m2; note Pureau 242-248 repris de la fiche Beauvoise citée au §35.2 (le texte de l'Encyclopédie ne s'extrait pas proprement). texte
- **Edilians Beauvoise Graphite Huguenot** (confirme_fabricant 13) : tuiles_par_m2_min 20.2 u/m2; tuiles_par_m2_max 20.7 u/m2; pureau 245 mm; largeur_utile 200 mm; poids_unitaire 1.9 kg; tuiles_par_palette 480 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code; rives_par_ml_et_par_cote 4.1 u/ml; faitieres_par_ml faîtière/arêtier angulaire 3/ml ; losangée et 1/2 rond 2,5/ml ; arêtier 2,5/ml texte; liteaux_ml_par_m2 4.08 (pureau mini) / 4.08 (pureau maxi) ml/m2
- **Edilians HP 17 Huguenot** (confirme_fabricant 13) : tuiles_par_m2_min 17.2 u/m2; tuiles_par_m2_max 22 u/m2; pureau_min 222 mm; pureau_max 285 mm; tuiles_par_palette 420 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code; faitieres_par_ml faîtière/arêtier angulaire 3/ml ; losangée et 1/2 rond 2,5/ml ; arêtier 2,5/ml texte; note Poids au m² ≃ 44,7 kg au pureau de 285 mm ; largeur utile ≃ 204 mm (lue en extraction brute de l'encyclopédie 2024 et sur la fiche 2026). texte; largeur_utile 204 mm; liteaux_ml_par_m2 4.5 (pureau mini) / 3.51 (pureau maxi) ml/m2
- **Edilians Valoise Huguenot** (confirme_fabricant 11) : tuiles_par_m2 20 u/m2; pureau 268 mm; largeur_utile 190 mm; poids_unitaire 2.2 kg; tuiles_par_palette 480 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code; rives_par_ml_et_par_cote 3.8 u/ml; faitieres_par_ml faîtière Valoise 3,3/ml ; arêtier Valoise 2,7/ml ; 1/2 rond 2,5/ml ; angulaire 3/ml texte
- **Koramic Lisséa** (confirme_fabricant 11) : tuiles_par_m2_min 17 u/m2; pureau_min 225 mm; pureau_max 295 mm; poids_unitaire 2.7 kg; tuiles_par_palette 350 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code; note Guide 2026 : « 17 à 22 » au m², palette de 350 « ≃ 20,6 m² » (≈ 17 /m², au lattage maxi). Calcul 1/(0,201 × 0,295) = 16,9 et 1/(0,201 × 0,225) = 22,1. texte; tuiles_par_m2_max 22 u/m2; largeur_utile 201 mm
- **Koramic Vauban 2 Droite** (confirme_fabricant 9) : tuiles_par_m2 22 u/m2; pureau_min 258 mm; pureau_max 273 mm; largeur_utile 169 mm; poids_unitaire 2.25 kg; tuiles_par_palette 350 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code
- **Koramic Vauban 2 Écaille** (confirme_fabricant 9) : tuiles_par_m2 22 u/m2; pureau_min 258 mm; pureau_max 273 mm; largeur_utile 169 mm; poids_unitaire 2.3 kg; tuiles_par_palette 350 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code
- **Monier Régence** (confirme_fabricant 12) : tuiles_par_m2_min 19.2 u/m2; tuiles_par_m2_max 20.3 u/m2; pureau_min 266 mm; pureau_max 276 mm; poids_unitaire 2.3 kg; tuiles_par_palette 510 u; dtu 40.211 NF DTU; famille_pente PM_PLAT code; pente_minimale 45 % / 24°23' (site protégé, avec écran) % du support; liteaux_ml_par_m2 3.7 (pureau mini) / 3.7 (pureau maxi) ml/m2; largeur_utile 187 mm
- **Monier Fontenelle** (confirme_fabricant 13) : tuiles_par_m2_min 19.7 u/m2; tuiles_par_m2_max 20.8 u/m2; pureau_min 240 mm; pureau_max 255 mm; largeur_utile 200 mm; liteaux_ml_par_m2 4.2 (pureau mini) / 4 (pureau maxi) ml/m2; poids_unitaire 2.6 kg; tuiles_par_palette 420 u; dtu 40.211 NF DTU; classe_galbe G0 classe; pente_minimale 45 % / 24°23' (site protégé, avec écran) % du support; note Modèle ajouté le 19/11/2026 depuis le catalogue BMI Monier en ligne. Région affichée par BMI : Hauts-de-France (lieu de fabrication probable, pas une zone de vente). texte

### petit moule à relief

- **Edilians Monopole N°1 Huguenot** (confirme_fabricant 11) : tuiles_par_m2 22 u/m2; pureau 241 mm; largeur_utile 189 mm; poids_unitaire 2.0 kg; tuiles_par_palette 600 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente PM_RELIEF code; rives_par_ml_et_par_cote 4.2 u/ml; faitieres_par_ml faîtière 1/2 rond 2,5/ml ; arêtier 1/2 rond 3/ml ; rive universelle 3/ml texte
- **Edilians Ténord Huguenot** (confirme_fabricant 14) : tuiles_par_m2_min 18.7 u/m2; tuiles_par_m2_max 20.2 u/m2; pureau_min 250 mm; pureau_max 270 mm; largeur_utile 198 mm; poids_unitaire 2.15 kg; tuiles_par_palette 420 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; rives_par_ml_et_par_cote 4.2 u/ml; faitieres_par_ml faîtière 1/2 rond 2,5/ml ; ondulée Terroise 3/ml ; arêtier 1/2 rond 3/ml texte; liteaux_ml_par_m2 4.0 (pureau mini) / 3.7 (pureau maxi) ml/m2
- **Edilians Terroise Huguenot** (confirme_fabricant 10) : tuiles_par_m2 20 u/m2; pureau 265 mm; largeur_utile 190 mm; poids_unitaire 2.2 kg; tuiles_par_palette 480 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente PM_RELIEF code; faitieres_par_ml faîtière ondulée Terroise 3/ml texte
- **Koramic OVH V** (confirme_fabricant 9) : tuiles_par_m2 15.5 u/m2; pureau_min 305 mm; pureau_max 320 mm; largeur_utile 202 mm; poids_unitaire 2.45 kg; tuiles_par_palette 378 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente PM_RELIEF code
- **Koramic Galbée 401** (confirme_fabricant 7) : tuiles_par_m2 16.5 u/m2; pureau 300 mm; largeur_utile 201 mm; poids_unitaire 2.55 kg; tuiles_par_palette 480 u; dtu 40.21 NF DTU; famille_pente PM_RELIEF code
- **Koramic Tempête 18** (confirme_fabricant 9, a_confirmer 1) : tuiles_par_m2_min 17.1 u/m2; tuiles_par_m2_max 18.9 u/m2; pureau_min 235 mm; pureau_max 260 mm; largeur_utile 225 mm; poids_unitaire 2.32 kg; tuiles_par_palette 576 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente à confirmer code
- **Koramic Tempête 993** (confirme_fabricant 8) : tuiles_par_m2 19 u/m2; pureau 248 mm; largeur_utile 210 mm; poids_unitaire 1.99 kg; tuiles_par_palette 576 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente PM_RELIEF code
- **Koramic Tempête 44** (confirme_fabricant 8) : tuiles_par_m2 20.5 u/m2; pureau 248 mm; largeur_utile 195 mm; poids_unitaire 1.71 kg; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente PM_RELIEF code; note Palette « selon coloris ». texte
- **Monier Postel 20** (confirme_fabricant 13) : tuiles_par_m2_min 19.8 u/m2; tuiles_par_m2_max 21 u/m2; pureau_min 235 mm; pureau_max 250 mm; largeur_utile 202 mm; liteaux_ml_par_m2 4.3 (pureau mini) / 4 (pureau maxi) ml/m2; poids_unitaire 2 kg; tuiles_par_palette 600 u; dtu 40.21 NF DTU; classe_galbe G1 classe; pente_minimale 35 % / 19°29' (zone 1, site protégé, avec écran) % du support; note Modèle ajouté le 19/11/2026 depuis le catalogue BMI Monier en ligne. Région affichée par BMI : Hauts-de-France (lieu de fabrication probable, pas une zone de vente). texte
- **Monier Chartreuse** (confirme_fabricant 13) : tuiles_par_m2_min 19.1 u/m2; tuiles_par_m2_max 20.2 u/m2; pureau_min 266 mm; pureau_max 276 mm; largeur_utile 188 mm; liteaux_ml_par_m2 3.7 (pureau mini) / 3.6 (pureau maxi) ml/m2; poids_unitaire 2.2 kg; tuiles_par_palette 510 u; dtu 40.21 NF DTU; classe_galbe G1 classe; pente_minimale 35 % / 19°29' (zone 1, site protégé, avec écran) % du support; note Modèle ajouté le 19/11/2026 depuis le catalogue BMI Monier en ligne. Région affichée par BMI : Hauts-de-France (lieu de fabrication probable, pas une zone de vente). texte

### petit moule à relief (panne)

- **Edilians Panne S Huguenot** (une_source 13) : tuiles_par_m2 20 u/m2; pureau 275 mm; poids_unitaire 2.3 kg; tuiles_par_palette 420 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente PM_RELIEF code; rives_par_ml_et_par_cote 3.7 u/ml; faitieres_par_ml faîtière 1/2 rond 2,5/ml ; ondulée Terroise 3/ml ; arêtier 1/2 rond 3/ml ; rive universelle 3/ml texte; note Poids unitaire déduit de « ≃ 46 kg (20 tuiles au m²) » ; pureau = pureau moyen indiqué. texte; largeur_utile 190 mm; liteaux_ml_par_m2 3.63 ml/m2

### format intermédiaire à pureau plat (dit grand moule par Koramic)

- **Koramic Datura** (confirme_fabricant 9) : tuiles_par_m2 15.5 u/m2; pureau_min 270 mm; pureau_max 307 mm; largeur_utile 211 mm; poids_unitaire 3.02 kg; tuiles_par_palette 288 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A code

### grand moule à relief (double tuile du Nord)

- **Koramic Opalys** (confirme_fabricant 12) : tuiles_par_m2 9.5 u/m2; pureau_min 254 mm; pureau_max 266 mm; largeur_utile 403 mm; poids_unitaire 3.8 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code; rives_par_ml_et_par_cote 3.9 u/ml; faitieres_par_ml faîtière 1/2 ronde Seltz 2,5/ml ; Shed 2,4/ml texte

### grand moule à onde douce

- **Koramic JPV 2** (confirme_fabricant 9) : tuiles_par_m2 12 u/m2; pureau_min 300 mm; pureau_max 370 mm; largeur_utile 223 mm; poids_unitaire 3.5 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code

### petit moule à relief (panne du Nord)

- **Koramic Vieille Panne 451** (confirme_fabricant 9) : tuiles_par_m2 18.5 u/m2; pureau 277 mm; largeur_utile 194 mm; poids_unitaire 2.33 kg; tuiles_par_palette 432 u; dtu 40.21 NF DTU; famille_pente PM_RELIEF code; note Guide de pose 2016 : 281 mm = 19/m² (édition plus ancienne). texte

### grand moule du Sud, à ressaut

- **Terreal Romane Canal** (confirme_fabricant 11) : tuiles_par_m2 12 u/m2; pureau 385 mm; largeur_utile 219 mm; poids_unitaire 3.7 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.6 u/ml; faitieres_par_ml faîtière ventilation + clip 2,5/ml ; arêtier ventilation ou à sceller 3/ml ; faîteau 2,8/ml ; sous-faîtière 4,7/ml ; tuile demi-pureau 4,7/ml texte; note Fiche : « La tuile de référence du grand Ouest » ; marque NF option faible pente. texte
- **Terreal Romane Azur** (confirme_fabricant 10) : tuiles_par_m2_min 8.6 u/m2; tuiles_par_m2_max 10.9 u/m2; pureau_min 417 mm; pureau_max 447 mm; largeur_utile 220-260 mm; poids_unitaire 5.1 kg; tuiles_par_palette 90 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code

### grand moule du Sud, double canal

- **Terreal Double Canal 12 (DC12)** (confirme_fabricant 10) : tuiles_par_m2 12 u/m2; pureau 373 mm; largeur_utile 226 mm; poids_unitaire 4.0 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.7 u/ml; faitieres_par_ml faîtière/arêtier conique à glissement 50 cm 2,5/ml ; à pureau variable 50 cm 2,2 à 2,7/ml ; cylindrique 40 cm 2,5/ml ; sous-faîtière 4,5/ml texte
- **Terreal Horizon 12** (confirme_fabricant 11) : tuiles_par_m2 12 u/m2; pureau_min 370 mm; pureau_max 390 mm; largeur_utile 200-220 mm; poids_unitaire 3.9 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.6 u/ml; faitieres_par_ml faîtière ventilation + clip 2,5/ml ; arêtier 3/ml ; faîteau 2,8/ml ; sous-faîtière 4,9/ml texte

### grand moule fortement galbé, type double canal

- **Terreal Canal Horizon** (confirme_fabricant 10) : tuiles_par_m2 12 u/m2; pureau_min 373 mm; pureau_max 388 mm; largeur_utile 207-222 mm; poids_unitaire 3.95 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; note Fiche : « galbe typique des canal de l'ouest ». texte

### grand moule fortement galbé, à ressaut

- **Terreal Latitude 12** (confirme_fabricant 9) : tuiles_par_m2 12 u/m2; pureau_min 370 mm; pureau_max 390 mm; largeur_utile 200-220 mm; poids_unitaire 3.9 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code

### grand moule double canal

- **Terreal Héritage Canal** (confirme_fabricant 9, a_confirmer 1) : tuiles_par_m2 10 u/m2; pureau_min 396 mm; pureau_max 416 mm; largeur_utile 225-255 mm; poids_unitaire 4.9 kg; tuiles_par_palette 90 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente NF FP + DTA très faible pente code; note Palette indicative de 90. texte

### grand moule fortement galbé (romane)

- **Terreal Romane Réno** (confirme_fabricant 11) : tuiles_par_m2 13.5 u/m2; pureau_min 353 mm; pureau_max 366 mm; largeur_utile 205-215 mm; poids_unitaire 3.5 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; classe_galbe G2 classe; famille_pente C code; rives_par_ml_et_par_cote 2.8 u/ml; faitieres_par_ml faîtière/arêtier à pureau variable 50 cm 2,2 à 2,7/ml ; conique 50 cm 2,5/ml ; cylindrique 40 cm 2,5/ml texte

### grand moule à côte (rénovation)

- **Terreal Losangée Terreal** (confirme_fabricant 13) : tuiles_par_m2_min 12 u/m2; tuiles_par_m2_max 14 u/m2; pureau_min 320 mm; pureau_max 370 mm; largeur_utile 222 mm; poids_unitaire 3.6 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; pente_minimale 19 % (zone 1, protégé, avec écran, rampant ≤ 6,5 m) % du support; rives_par_ml_et_par_cote 3.0 u/ml; faitieres_par_ml faîtière angulaire à emboîtement 2,5/ml ; ronde ventilée 2,5/ml ; Résidence 2,5/ml ; arêtier Résidence 3/ml ; demi-tuile universelle 1,5/ml texte
- **Terreal Côte de Nuits PV** (confirme_fabricant 10) : tuiles_par_m2 14 u/m2; pureau_min 310 mm; pureau_max 363 mm; largeur_utile 196 mm; poids_unitaire 3.0 kg; tuiles_par_palette 300 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code; pente_minimale 30 % / 16,70° % du support

### grand moule à côte

- **Terreal Santenay** (confirme_fabricant 13) : tuiles_par_m2 10 u/m2; pureau_min 345 mm; pureau_max 418 mm; largeur_utile 249 mm; poids_unitaire 4.0 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; pente_minimale 19 % % du support; rives_par_ml_et_par_cote 2.5 u/ml; faitieres_par_ml faîtière ronde ventilée 2,5/ml ; angulaire 2,5/ml ; arêtier large ou élégant 2,6/ml texte
- **Terreal Côte de Beaune** (confirme_fabricant 10) : tuiles_par_m2 10 u/m2; pureau_min 345 mm; pureau_max 418 mm; largeur_utile 248 mm; poids_unitaire 4.5 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente C code; pente_minimale 19 % / 10,76° % du support
- **Terreal Montagny** (confirme_fabricant 10, a_confirmer 1) : tuiles_par_m2 9.5 u/m2; pureau_min 375 mm; pureau_max 422 mm; largeur_utile 251 mm; poids_unitaire 4.4 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente à confirmer code; pente_minimale 25 % / 14,04° (zone 1, protégé, avec écran) % du support; note Titulaire de la marque NF sans option FP affichée ; pente de 25 % qui ne tombe ni en B ni en C. texte
- **Terreal Jura PV** (confirme_fabricant 10) : tuiles_par_m2 14.5 u/m2; pureau_min 285 mm; pureau_max 345 mm; largeur_utile 203 mm; poids_unitaire 3.0 kg; tuiles_par_palette 300 u; dtu 40.21 NF DTU; famille_pente B code; pente_minimale 30 % / 16,70° % du support; note Liteaux 2,9 ml/m² (fiche). texte

### grand moule d'aspect plat

- **Terreal Volnay PV** (confirme_fabricant 9, a_confirmer 1) : tuiles_par_m2 10 u/m2; pureau_min 340 mm; pureau_max 408 mm; largeur_utile 251 mm; poids_unitaire 4.5 kg; tuiles_par_palette 240 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A (sous DTA avec écran) code
- **Terreal Volnay PV Tandem** (confirme_fabricant 9, a_confirmer 1) : tuiles_par_m2 10 u/m2; pureau_min 340 mm; pureau_max 408 mm; largeur_utile 251 mm; poids_unitaire 4.5 kg; tuiles_par_palette 240 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente A (sous DTA) code; pente_minimale 35 % / 19,29° % du support

### petit moule d'aspect plat, format paysage

- **Terreal Rully** (confirme_fabricant 12) : tuiles_par_m2 20 u/m2; largeur_utile 315 mm; poids_unitaire 2.4 kg; tuiles_par_palette 288 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code; pente_minimale 45 % / 24,23° % du support; rives_par_ml_et_par_cote 6.3 u/ml; note Format paysage : pureau ≈ 16 cm (calcul 1 / (20 × 0,315)). texte; pureau_min 152 mm; pureau_max 168 mm

### petit moule d'aspect plat

- **Terreal Giverny PV** (confirme_fabricant 11) : tuiles_par_m2_min 18 u/m2; tuiles_par_m2_max 22 u/m2; pureau_min 225 mm; pureau_max 275 mm; largeur_utile 204 mm; poids_unitaire 2.3 kg; tuiles_par_palette 450 u; dtu 40.211 NF DTU; classe_galbe G0 classe; famille_pente PM_PLAT code; pente_minimale 45 % / 24,23° % du support

### petit moule à cornet

- **Terreal Côte Fleurie PV** (une_source 12, a_confirmer 1) : tuiles_par_m2_min 18 u/m2; tuiles_par_m2_max 20 u/m2; pureau_min 251 mm; pureau_max 276 mm; poids_unitaire 2.1 kg; tuiles_par_palette 540 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente à confirmer code; rives_par_ml_et_par_cote 3.6 u/ml; largeur_utile 206 mm; liteaux_ml_par_m2 4 (pureau mini) / 3.6 (pureau maxi) ml/m2; pente_minimale 35 % / 19,29° (zone 1, situation protégée, avec écran) % du support

### grand moule faible relief, simple emboîtement

- **Monier Losangée Héritage** (confirme_fabricant 14) : tuiles_par_m2_min 11.6 u/m2; tuiles_par_m2_max 13.1 u/m2; pureau_min 336 mm; pureau_max 376 mm; largeur_utile 228 mm; poids_unitaire 3.4 kg; tuiles_par_palette 300 u; dtu 40.21 NF DTU; classe_galbe G1 classe; famille_pente B code; pente_minimale 30 % / 16°70' (zone 1, site protégé, avec écran) % du support; tuiles_de_rive rive standard G/D, rive universelle de 33 G/D (+ about de rive), demi-tuile texte; liteaux_ml_par_m2 3.0 (pureau mini) / 2.6 (pureau maxi) ml/m2

### grand moule fort galbe, aspect canal

- **Monier Galleane 12** (confirme_fabricant 13) : tuiles_par_m2_min 11.4 u/m2; tuiles_par_m2_max 13.2 u/m2; pureau_min 350 mm; pureau_max 380 mm; largeur_utile 215-230 mm; poids_unitaire 3.8 kg; tuiles_par_palette 180 u; dtu 40.21 NF DTU; famille_pente C code; pente_minimale 19 % / 10°76' % du support; liteaux_ml_par_m2 2.8 (pureau mini) / 2.6 (pureau maxi) ml/m2; note Fiche 2019 (Chausson) revérifiée sur la fiche BMI en ligne (PDF du 08/04/2026) : mêmes valeurs ; DTA n° 5/09-2078. texte

### règle générale

- **Toutes marques tous** (confirme 13, une_source 3) : formule_tuiles_m2 1 / (largeur utile × pureau) u/m2; formule_liteaux_m2 1 / pureau ml/m2; tuiles_de_rive_par_ml 1 / pureau, par côté (gauche et droite = deux articles) u/ml; rive_universelle_par_ml 3 u/ml; rive_a_rabat_joints_croises moitié tuiles à rabat, moitié demi-tuiles à rabat (par côté) texte; nombre_de_chatieres Sh / 3000 (ou Sh / 5000 selon le cas) ÷ section d'une chatière u; choix_du_pureau pureau = longueur du rampant ÷ nombre entier de rangs, dans la plage mini-maxi du fabricant texte

### grand moule à pureau plat (faible galbe)

- **Monier Belmont** (confirme_fabricant 13) : tuiles_par_m2_min 9.7 u/m2; tuiles_par_m2_max 11.9 u/m2; pureau_min 300 mm; pureau_max 375 mm; largeur_utile 282 mm; liteaux_ml_par_m2 3.3 (pureau mini) / 2.7 (pureau maxi) ml/m2; poids_unitaire 4.5 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; pente_minimale 19 % / 10°76' % du support; note Modèle ajouté le 19/11/2026 depuis le catalogue BMI Monier en ligne. Région affichée par BMI : Hauts-de-France (lieu de fabrication probable, pas une zone de vente). texte
- **Monier Maizières** (confirme_fabricant 13) : tuiles_par_m2_min 9.5 u/m2; tuiles_par_m2_max 11.9 u/m2; pureau_min 300 mm; pureau_max 375 mm; largeur_utile 280 mm; liteaux_ml_par_m2 3.3 (pureau mini) / 2.7 (pureau maxi) ml/m2; poids_unitaire 4.4 kg; tuiles_par_palette 240 u; dtu 40.21 NF DTU; classe_galbe G1 classe; pente_minimale 30 % / 16°70' (fiche) ; 19 % / 10°76' (page produit) % du support; note Modèle ajouté le 19/11/2026 depuis le catalogue BMI Monier en ligne. Région affichée par BMI : Hauts-de-France (lieu de fabrication probable, pas une zone de vente). texte

### modèle de la liste du fondateur

- **Toutes marques Sud 2000** (a_confirmer 1) : existence_au_catalogue None -
- **Toutes marques Pierrelatte** (a_confirmer 1) : existence_au_catalogue None -
- **Toutes marques Alliance** (a_confirmer 1) : existence_au_catalogue None -
- **Toutes marques Signature** (a_confirmer 1) : existence_au_catalogue None -
- **Toutes marques Ergo** (a_confirmer 1) : existence_au_catalogue None -

## Tuiles plates

### tuile plate terre cuite

- **Edilians Plate Elixir (réf. 511)** (confirme_fabricant 9) : tuiles_par_m2 73.5 u/m2; liteaux_ml_par_m2 11.76 ml/m2; tuiles_par_m2 69 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 66 u/m2; liteaux_ml_par_m2 10.53 ml/m2; dimensions_et_largeur_utile 260 × 160 (utile 160) mm; poids_unitaire 1.2 kg; tuiles_par_palette 720 u
- **Edilians Plate 18x28 Anteis Doyet (réf. 532)** (confirme_fabricant 9) : tuiles_par_m2 58,5 u/m2; liteaux_ml_par_m2 10.53 ml/m2; tuiles_par_m2 ≈ 55 u/m2; liteaux_ml_par_m2 10.0 ml/m2; tuiles_par_m2 53 u/m2; liteaux_ml_par_m2 9.52 ml/m2; dimensions_et_largeur_utile 280 × 180 (utile 180) mm; poids_unitaire 1.6 kg; tuiles_par_palette 720 u
- **Edilians Plate 16x38 Doyet (réf. 526)** (confirme_fabricant 9) : tuiles_par_m2 43 u/m2; liteaux_ml_par_m2 6.9 ml/m2; tuiles_par_m2 42 u/m2; liteaux_ml_par_m2 6.67 ml/m2; tuiles_par_m2 40 u/m2; liteaux_ml_par_m2 6.45 ml/m2; dimensions_et_largeur_utile 380 × 160 (utile 160) mm; poids_unitaire 1.9 kg; tuiles_par_palette 400 u
- **Edilians Plate 17x27 Doyet (réf. 520)** (confirme_fabricant 9) : tuiles_par_m2 65 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 62 u/m2; liteaux_ml_par_m2 10.53 ml/m2; tuiles_par_m2 59 u/m2; liteaux_ml_par_m2 10.0 ml/m2; dimensions_et_largeur_utile 275 × 170 (utile 170) mm; poids_unitaire 1.2 kg; tuiles_par_palette 720 u
- **Edilians Plate Tradition 17x27 Doyet (réf. 523)** (confirme_fabricant 9) : tuiles_par_m2 65 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 62 u/m2; liteaux_ml_par_m2 10.53 ml/m2; tuiles_par_m2 59 u/m2; liteaux_ml_par_m2 10.0 ml/m2; dimensions_et_largeur_utile 275 × 170 (utile 170) mm; poids_unitaire 1.38 kg; tuiles_par_palette 720 u
- **Edilians Monument Historique Doyet 17x27 (réf. 522)** (confirme_fabricant 9) : tuiles_par_m2 65 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 62 u/m2; liteaux_ml_par_m2 10.53 ml/m2; tuiles_par_m2 59 u/m2; liteaux_ml_par_m2 10.0 ml/m2; dimensions_et_largeur_utile 275 × 170 (utile 170) mm; poids_unitaire 1.5 kg; tuiles_par_palette 600 u
- **Edilians Plate Tradition 17x27 Phalempin (réf. 507)** (confirme_fabricant 10) : tuiles_par_m2 65 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 62 u/m2; liteaux_ml_par_m2 10.53 ml/m2; tuiles_par_m2 59 u/m2; liteaux_ml_par_m2 10.0 ml/m2; dimensions_et_largeur_utile 268 × 168 (utile 168) mm; poids_unitaire 1.2 kg; tuiles_par_palette 960 u
- **Edilians Monument Historique 16x27 (réf. 503)** (confirme_fabricant 9) : tuiles_par_m2 73.5 u/m2; liteaux_ml_par_m2 11.76 ml/m2; tuiles_par_m2 69 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 66 u/m2; liteaux_ml_par_m2 10.53 ml/m2; dimensions_et_largeur_utile 260 × 160 (utile 160) mm; poids_unitaire 1.5 kg; tuiles_par_palette 750 u
- **Edilians Restauration 16x27 (réf. 502)** (confirme_fabricant 9) : tuiles_par_m2 73.5 u/m2; liteaux_ml_par_m2 11.76 ml/m2; tuiles_par_m2 69 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 66 u/m2; liteaux_ml_par_m2 10.53 ml/m2; dimensions_et_largeur_utile 260 × 160 (utile 160) mm; poids_unitaire 1.2 kg; tuiles_par_palette 900 u
- **Edilians Plate 16x24 Phalempin (réf. 505)** (confirme_fabricant 10) : tuiles_par_m2 83.3 u/m2; liteaux_ml_par_m2 13.33 ml/m2; tuiles_par_m2 78 u/m2; liteaux_ml_par_m2 12.5 ml/m2; tuiles_par_m2 73.5 u/m2; liteaux_ml_par_m2 11.76 ml/m2; dimensions_et_largeur_utile 240 × 160 (utile 160) mm; poids_unitaire 0.9 kg; tuiles_par_palette 1088 u
- **Edilians Plate 16x24 Doyet (réf. 521)** (confirme_fabricant 9) : tuiles_par_m2 83.3 u/m2; liteaux_ml_par_m2 13.33 ml/m2; tuiles_par_m2 78 u/m2; liteaux_ml_par_m2 12.5 ml/m2; tuiles_par_m2 73.5 u/m2; liteaux_ml_par_m2 11.76 ml/m2; dimensions_et_largeur_utile 240 × 160 (utile 160) mm; poids_unitaire 1.0 kg; tuiles_par_palette 900 u
- **Edilians Plate Stretto Huguenot (réf. 530)** (confirme_fabricant 9) : tuiles_par_m2 26,95 u/m2; liteaux_ml_par_m2 7.14 ml/m2; tuiles_par_m2 ≈ 26 u/m2; liteaux_ml_par_m2 6.9 ml/m2; tuiles_par_m2 25,15 u/m2; liteaux_ml_par_m2 6.67 ml/m2; dimensions_et_largeur_utile 370 × 265 (utile 265) mm; poids_unitaire 2.8 kg; tuiles_par_palette 288 u
- **Edilians Plate 20x30 Huguenot (réf. 510)** (confirme_fabricant 10) : tuiles_par_m2 47.6 u/m2; liteaux_ml_par_m2 9.52 ml/m2; tuiles_par_m2 45.5 u/m2; liteaux_ml_par_m2 9.09 ml/m2; tuiles_par_m2 43.5 u/m2; liteaux_ml_par_m2 8.7 ml/m2; dimensions_et_largeur_utile 300 × 200 (utile 200) mm; poids_unitaire 1.6 kg; tuiles_par_palette 660 u
- **Edilians Plate écaille pressée 17x27 Ste Foy (réf. 551)** (confirme_fabricant 9) : tuiles_par_m2 65 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 62 u/m2; liteaux_ml_par_m2 10.53 ml/m2; tuiles_par_m2 59 u/m2; liteaux_ml_par_m2 10.0 ml/m2; dimensions_et_largeur_utile 272 × 170 (utile 170) mm; poids_unitaire 1.1 kg; tuiles_par_palette 780 u
- **Edilians Plate pressée 17x27 Ste Foy (réf. 501)** (confirme_fabricant 10) : tuiles_par_m2 65 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 62 u/m2; liteaux_ml_par_m2 10.53 ml/m2; tuiles_par_m2 59 u/m2; liteaux_ml_par_m2 10.0 ml/m2; dimensions_et_largeur_utile 272 × 170 (utile 170) mm; poids_unitaire 1.2 kg; tuiles_par_palette 720 u
- **Edilians Plate 17x27 Phalempin (réf. 500)** (confirme_fabricant 10) : tuiles_par_m2 65 u/m2; liteaux_ml_par_m2 11.11 ml/m2; tuiles_par_m2 62 u/m2; liteaux_ml_par_m2 10.53 ml/m2; tuiles_par_m2 59 u/m2; liteaux_ml_par_m2 10.0 ml/m2; dimensions_et_largeur_utile 268 × 168 (utile 168) mm; poids_unitaire 1.1 kg; tuiles_par_palette 1088 u
- **Edilians arêtier « tige de botte »** (une_source 1) : pieces_au_ml 3 u/ml
- **Edilians Plate Stretto Huguenot (grand format)** (une_source 1) : pente_minimale_avec_ecran 40 % (zone 1 protégé, X ≥ 80 mm) à 75 % %
- **Terreal Rustique 17x27** (confirme_fabricant 6) : tuiles_par_m2 59 / 62 / 65 u/m2; dimensions_hors_tout 17 × 27 × 1,2 cm; liteaux_ml_par_m2 10 / 10,5 / 11,1 ml/m2; poids_unitaire 1.1 kg; tuiles_par_palette 960 u; pente_minimale 70 % / 35° (zone 1, situation normale, avec écran) %
- **Terreal Éminence 17x27** (confirme_fabricant 6) : tuiles_par_m2 59 / 62 / 65 u/m2; dimensions_hors_tout 17 × 27 × 1,2 cm; liteaux_ml_par_m2 10 / 10,5 / 11,1 ml/m2; poids_unitaire 1.1 kg; tuiles_par_palette 1008 u; pente_minimale 70 % / 35° (zone 1, situation normale, avec écran) %
- **Terreal Sologne Vieux Pays 17x27** (confirme_fabricant 6) : tuiles_par_m2 59 / 62 / 65 u/m2; dimensions_hors_tout 17 × 27 × 1,6 cm; liteaux_ml_par_m2 10 / 10,5 / 11,1 ml/m2; poids_unitaire 1.5 kg; tuiles_par_palette 624 u; pente_minimale 60 % / 31° (zone 1, situation protégée) %
- **Terreal Ségala Vieux Pays 20x29** (confirme_fabricant 6) : tuiles_par_m2 45 / 48 / 50 u/m2; dimensions_hors_tout 20 × 29 × 1,6 cm; liteaux_ml_par_m2 9 / 9,6 / 10 ml/m2; poids_unitaire 1.7 kg; tuiles_par_palette 576 u; pente_minimale 60 % / 31° (zone 1, situation protégée) %
- **Terreal Rully (tuile d'aspect plat à emboîtement, DTU 40.21)** (confirme_fabricant 5) : tuiles_par_m2 20 u/m2; pente_minimale 45 % / 24,23° %; pureau_min 152 mm; pureau_max 168 mm; largeur_utile 315 mm
- **Wienerberger Plate 301 17x27** (confirme_fabricant 8) : tuiles_par_m2 59 / 62 / 65 u/m2; dimensions_hors_tout 17 × 27 × 1,2 cm; liteaux_ml_par_m2 11.1 (pureau mini) / 10 (pureau maxi) ml/m2; poids_unitaire 1.02 kg; tuiles_par_palette 1152 u; pureau_min 90 mm; pureau_max 100 mm; largeur_utile 170 mm
- **Monier Plate de Pays terre cuite** (confirme_fabricant 10) : tuiles_par_m2 59 à 65 (≈ 62) u/m2; dimensions_hors_tout ≈ 17 × 27 cm; poids_unitaire 1.18 kg; tuiles_par_palette 864 u; pente_minimale 60 % (zone 1, site protégé, avec écran, recouvrement mini 8 cm) %; pureau_min 90 mm; pureau_max 100 mm; largeur_utile 172 mm; liteaux_ml_par_m2 11 (pureau mini) / 10 (pureau maxi) ml/m2
- **Toutes marques plate 17 × 27 cm** (confirme 1) : tuiles_par_m2 59 / 62 / 65 u/m2
- **Toutes marques plate 16 × 27 cm** (confirme 1) : tuiles_par_m2 73,5 / 69 / 66 u/m2
- **Toutes marques plate 16 × 24 cm** (confirme 1) : tuiles_par_m2 83,3 / 78 / 73,5 u/m2
- **Toutes marques plate 20 × 30 cm (20 × 29)** (confirme 1) : tuiles_par_m2 43,5 à 50 u/m2
- **Toutes marques toutes plates** (confirme 3) : liteaux_ml_par_m2 1 / pureau ml/m2; densite_de_fixation_en_plain_carre pente ≤ 100 % : zones 1-2 site protégé/normal aucune tuile fixée ; site exposé et zones 3-4 : 1 tuile sur 6 ; 100 < p ≤ 175 % : idem ; 175 < p ≤ 300 % : 1 sur 6 partout ; p > 300 % : toutes. Rives et égout : toutes fixées, sauf p ≤ 100 % en zones 1-2 site protégé/normal. -; rampant_au_dela_duquel_les_pentes_ne_valent_plus_consulter 8 m (projection horizontale)
- **Toutes marques rive individuelle (à rabat) gauche ou droite de tuile plate** (confirme 1) : rives_au_ml_par_cote 1 / (2 × pureau) : 5 au ml à pureau 10 cm, 6 au ml à pureau 8,5 à 9 cm u/ml
- **Toutes marques faîtière 1/2 ronde ou angulaire de tuile plate** (confirme 1) : faitieres_par_ml 3 u/ml
- **Toutes marques arêtier cornier de tuile plate** (confirme 1) : aretiers_corniers_au_ml 10 à 11 u/ml
- **Toutes marques plate petit moule (17 × 27 et voisins)** (confirme 2, une_source 1) : pente_minimale sans écran 70 % (recouvrement ≥ 80 mm) / 80 % (≥ 70 mm) ; avec écran 60 % / 70 % %; pente_minimale sans écran 80 % (recouvrement ≥ 80 mm) / 90 % (≥ 70 mm) ; avec écran 70 % / 80 % %; pente_minimale sans écran 100 % (recouvrement ≥ 80 mm) / 110 % (≥ 70 mm) ; avec écran 85 % / 95 % %

## Tuiles canal

### tuile canal

- **Edilians Canal 50 Poudenx (couvert 414 / courant à tenons 454)** (confirme_fabricant 12) : couverts_par_m2 10.3 u/m2; liteaux_ml_par_m2 2.78 ml/m2; couverts_par_m2 11.1 u/m2; liteaux_ml_par_m2 2.86 ml/m2; couverts_par_m2 11.8 u/m2; liteaux_ml_par_m2 2.94 ml/m2; couverts_par_m2 12.6 u/m2; liteaux_ml_par_m2 3.03 ml/m2; longueur_hors_tout 500 mm; poids_unitaire 414 : 2,5 kg ; 454 : 2,7 kg kg; tuiles_par_palette 414 : 225 ; 454 : 200 u
- **Edilians Canal 50 Réabilis Poudenx (couvert 421 / courant 454)** (confirme_fabricant 11) : couverts_par_m2 10.3 u/m2; liteaux_ml_par_m2 2.78 ml/m2; couverts_par_m2 11.1 u/m2; liteaux_ml_par_m2 2.86 ml/m2; couverts_par_m2 11.8 u/m2; liteaux_ml_par_m2 2.94 ml/m2; couverts_par_m2 12.6 u/m2; liteaux_ml_par_m2 3.03 ml/m2; longueur_hors_tout 500 mm; poids_unitaire 421 : 2,6 kg ; 454 : 2,7 kg kg; tuiles_par_palette 200 u
- **Edilians Canal 50 Restauration Poudenx (couvert 418 / courant 454)** (confirme_fabricant 11) : couverts_par_m2 10.3 u/m2; liteaux_ml_par_m2 2.78 ml/m2; couverts_par_m2 11.1 u/m2; liteaux_ml_par_m2 2.86 ml/m2; couverts_par_m2 11.8 u/m2; liteaux_ml_par_m2 2.94 ml/m2; couverts_par_m2 12.6 u/m2; liteaux_ml_par_m2 3.03 ml/m2; longueur_hors_tout 500 mm; poids_unitaire 418 : 2,5 kg ; 454 : 2,7 kg kg; tuiles_par_palette 200 u
- **Edilians Canal Gironde 50 Poudenx (couvert 406 / courant à tenons 456)** (confirme_fabricant 11) : couverts_par_m2 12.4 u/m2; liteaux_ml_par_m2 2.83 ml/m2; couverts_par_m2 12.7 u/m2; liteaux_ml_par_m2 2.92 ml/m2; couverts_par_m2 13.1 u/m2; liteaux_ml_par_m2 3.01 ml/m2; couverts_par_m2 13.5 u/m2; liteaux_ml_par_m2 3.1 ml/m2; longueur_hors_tout 492 mm; poids_unitaire 406 : 2 kg ; 456 : 2,1 kg kg; tuiles_par_palette 406 : 336 ; 456 : 384 u
- **Edilians Canal Quintescia Poudenx (couvert 413 / courant 456)** (confirme_fabricant 11) : couverts_par_m2 12.4 u/m2; liteaux_ml_par_m2 2.83 ml/m2; couverts_par_m2 12.7 u/m2; liteaux_ml_par_m2 2.92 ml/m2; couverts_par_m2 13.1 u/m2; liteaux_ml_par_m2 3.01 ml/m2; couverts_par_m2 13.5 u/m2; liteaux_ml_par_m2 3.1 ml/m2; longueur_hors_tout 492 mm; poids_unitaire 2,1 kg kg; tuiles_par_palette 413 : 336 ; 456 : 384 u
- **Edilians Canal Lyonnaise 40 Poudenx (couvert 401 / courant à tenons 451)** (confirme_fabricant 11) : couverts_par_m2 14.2 u/m2; liteaux_ml_par_m2 3.85 ml/m2; couverts_par_m2 14.8 u/m2; liteaux_ml_par_m2 4.0 ml/m2; couverts_par_m2 15.4 u/m2; liteaux_ml_par_m2 4.17 ml/m2; couverts_par_m2 16.1 u/m2; liteaux_ml_par_m2 4.35 ml/m2; longueur_hors_tout 400 mm; poids_unitaire 2,2 kg kg; tuiles_par_palette 401 : 500 ; 451 : 320 u
- **Edilians Canal Restorial Poudenx (couvert 412 / courant 451)** (confirme_fabricant 11) : couverts_par_m2 14.2 u/m2; liteaux_ml_par_m2 3.85 ml/m2; couverts_par_m2 14.8 u/m2; liteaux_ml_par_m2 4.0 ml/m2; couverts_par_m2 15.4 u/m2; liteaux_ml_par_m2 4.17 ml/m2; couverts_par_m2 16.1 u/m2; liteaux_ml_par_m2 4.35 ml/m2; longueur_hors_tout 400 mm; poids_unitaire 2,2 kg kg; tuiles_par_palette 412 : 500 ; 451 : 320 u
- **Edilians Canal Charentaise Poudenx (couvert 405 / courant à tenons 455)** (confirme_fabricant 11) : couverts_par_m2 16.7 u/m2; liteaux_ml_par_m2 3.85 ml/m2; couverts_par_m2 17.4 u/m2; liteaux_ml_par_m2 4.0 ml/m2; couverts_par_m2 18.1 u/m2; liteaux_ml_par_m2 4.17 ml/m2; couverts_par_m2 18.9 u/m2; liteaux_ml_par_m2 4.35 ml/m2; longueur_hors_tout 400 mm; poids_unitaire 405 : 1,6 kg ; 455 : 1,7 kg kg; tuiles_par_palette 405 : 600 ; 455 : 384 u
- **Edilians Canal Gironde à blocage Poudenx (couvert 409 / courant 459), sous DTA** (confirme_fabricant 6) : tuiles_par_m2 12.7 u/m2; liteaux_ml_par_m2 2.92 ml/m2; tuiles_par_palette 409 : 336 ; 459 : 384 u; poids_unitaire 2,1 kg kg; pureau 342 mm; largeur_utile 200-230 mm
- **Edilians Canal Charentaise à blocage Poudenx (couvert 410 / courant 460), sous DTA** (confirme_fabricant 6) : tuiles_par_m2 17.4 u/m2; liteaux_ml_par_m2 4.0 ml/m2; tuiles_par_palette 410 : 600 ; 460 : 384 u; poids_unitaire 410 : 1,7 kg ; 460 : 1,8 kg kg; pureau 250 mm; largeur_utile 200-230 mm
- **Edilians tuile canal** (une_source 1) : longueur_de_rampant_au_dela_de_laquelle_consulter_le_fabricant 12 m (projection horizontale)
- **Edilians tuile chatière canal 403.22** (une_source 1) : section_de_ventilation 42 cm2
- **Terreal Languedocienne à talons 75CLP (courant)** (confirme_fabricant 6) : tuiles_par_m2 10,7 à 12,6 u/m2; tuiles_par_palette 144 u; poids_unitaire 2.6 kg; pureau_min 330 mm; pureau_max 360 mm; largeur_utile 240-260 mm
- **Terreal Languedocienne 1CL (couvert filé, 50 cm)** (une_source 1) : couverts_par_m2 10,7 à 12,6 u/m2
- **Terreal Languedocienne 1CL (couvert)** (une_source 1) : tuiles_par_palette 250 u
- **Terreal Gamme Canal Méditerranée (Languedocienne, Canal Origine)** (une_source 1) : liteaux_ml_par_m2 2.9 ml/m2
- **Terreal Canal Origine (couvert 1CO, courant Languedocienne à talons 75CLP)** (confirme_fabricant 5) : tuiles_par_m2 10,7 à 12,6 u/m2; poids_unitaire 2.9 kg; pureau_min 330 mm; pureau_max 360 mm; largeur_utile 240-260 mm
- **Terreal Canal Évolution (49,5 × 22 cm, à blocage, sous DTA)** (confirme_fabricant 8) : tuiles_par_m2 9,2 à 11,6 u/m2; tuiles_par_m2 19 à 23 u/m2; pente_minimale 24 % / 13,50° %; tuiles_par_palette 200 u; pureau_min 360 mm; pureau_max 420 mm; largeur_utile 240-260 mm; liteaux_ml_par_m2 2.4 ml/m2
- **Terreal Vendéenne (canal 40 cm)** (confirme_fabricant 6) : tuiles_par_m2 17,5 à 22,8 u/m2; liteaux_ml_par_m2 4.3 (pureau mini) / 3.8 (pureau maxi) ml/m2; tuiles_par_palette 180 u; pureau_min 230 mm; pureau_max 260 mm; largeur_utile 190-220 mm
- **Terreal égout canal sur plaque support** (une_source 1) : doublis_a_l_egout 1 rang de doublis de 10 à 13 cm, recouvrement 10 cm -
- **Terreal fixation tuiles canal sur liteaux** (une_source 1) : densite_de_fixation courant à talon : 1 tuile clouée sur 5 ; couvert : toutes fixées, 8 crochets S pour 2 crochets longs (crochets longs par bande tous les 5 m) ; rives et égout : chaque tuile -
- **Toutes marques tuile canal traditionnelle, pose à 2 tuiles** (confirme 1) : rapport_courants_couverts 1 courant pour 1 couvert (même nombre au m²) rapport
- **Toutes marques tuile canal sur liteaux** (confirme 1) : articles_distincts_au_comptoir 2 : le couvert et le courant à tenons/talons (références, poids et palettes différents) -
- **Toutes marques tuile canal sur plaque support (PST)** (confirme 1) : tuiles_posees pose à 1 tuile (couvert seul) ou à 2 tuiles (couvert et courant) -
- **Toutes marques tuile canal sur plaque support** (une_source 1) : recouvrement_minimal_entre_tuiles 100 mm
- **Toutes marques tuile canal (toutes)** (confirme 18) : pente_minimale_sans_ecran 24 %; recouvrement 140 mm; pente_minimale_sans_ecran 27 %; recouvrement 150 mm; pente_minimale_sans_ecran 30 %; recouvrement 160 mm; pente_minimale_sans_ecran 27 %; recouvrement 150 mm; pente_minimale_sans_ecran 30 %; recouvrement 160 mm; pente_minimale_sans_ecran 33 %; recouvrement 170 mm; pente_minimale_sans_ecran 30 %; recouvrement 150 mm; pente_minimale_sans_ecran 33 %; recouvrement 160 mm; pente_minimale_sans_ecran 35 %; recouvrement 170 mm
- **Toutes marques tuile canal** (une_source 1) : recouvrement_reduit_admis 10 cm (zones 1-2 site protégé) ; 12 cm (zones 1-2 site normal) cm
- **Toutes marques bardelis (rive) gauche ou droit** (confirme 1) : bardelis_au_ml_de_rive_par_cote 2.7 u/ml
- **Toutes marques faîtière canal 50 cm (sans emboîtement ou à pureau variable)** (confirme 1) : faitieres_par_ml 2,5 (sans emboîtement) ; 2,5 à 3 (pureau variable Edilians) ; 2,2 à 2,7 (pureau variable Terreal) u/ml
- **Monier Canal de 40** (confirme_fabricant 11) : tuiles_par_m2_min 16.7 u/m2; tuiles_par_m2_max 21.7 u/m2; pureau_min 230 mm; pureau_max 260 mm; largeur_utile 200-230 mm; liteaux_ml_par_m2 4.4 (pureau mini) / 3.9 (pureau maxi) ml/m2; poids_unitaire 1.5 kg; tuiles_par_palette 720 u; pente_minimale 24 % / 13°50' (zone 1, site protégé, avec écran) %; dtu NF P 31-201 [DTU 40.22] -

### plaque support sous tuile

- **Onduline Flexoutuile (profils T95, T220, T235, T470, T50, T285)** (confirme 1) : longueur_x_largeur_utile 2000 × 855 à 965 mm
- **Onduline Flexoutuile** (une_source 1) : fixations 15 pointes par plaque u
- **Onduline Flexoutuile sous tuile canal** (confirme 1) : pente_minimale 24 %
- **Onduline Flexoutuile (surface utile par plaque)** (une_source 1) : plaques_au_m2 0,56 à 0,63 u/m2

## Tuiles romanes

### romane / grand moule du Sud

- **Terreal Romane Canal (tuile à ressaut)** (confirme_fabricant 8) : tuiles_par_m2 12 u/m2; tuiles_par_palette 240 u; poids_unitaire 3.7 kg; liteaux_ml_par_m2 2.6 ml/m2; rives_rondes_a_ressaut_gauche_droite_au_ml 2.6 u/ml; tuile_1_2_pureau_ou_3_4_pureau_sous_faitiere_au_ml 4.7 u/ml; pureau 385 mm; largeur_utile 219 mm
- **Terreal Romane Réno** (confirme_fabricant 7) : tuiles_par_m2 13.5 u/m2; tuiles_par_palette 180 u; poids_unitaire 3.5 kg; pureau_min 353 mm; pureau_max 366 mm; largeur_utile 205-215 mm; liteaux_ml_par_m2 2.8 ml/m2
- **Terreal Double Canal 12** (confirme_fabricant 6) : tuiles_par_m2 12 u/m2; tuiles_par_palette 180 u; poids_unitaire 4 kg; liteaux_ml_par_m2 2.7 ml/m2; pureau 373 mm; largeur_utile 226 mm
- **Terreal Héritage Canal (double canal)** (confirme_fabricant 7) : tuiles_par_m2 10 u/m2; tuiles_par_palette 90 u; poids_unitaire 4.9 kg; liteaux_ml_par_m2 2.4 ml/m2; pureau_min 396 mm; pureau_max 416 mm; largeur_utile 225-255 mm
- **Terreal Double Canal Languedoc (DCL)** (confirme_fabricant 6) : tuiles_par_m2 9.5 u/m2; tuiles_par_palette 90 u; poids_unitaire 5 kg; pureau_min 407 mm; pureau_max 427 mm; largeur_utile 250-260 mm
- **Terreal Latitude 12 (tuile à ressaut)** (confirme_fabricant 8) : tuiles_par_m2 12 u/m2; tuiles_par_palette 240 u; poids_unitaire 3.9 kg; pente_minimale 19 %; pureau_min 370 mm; pureau_max 390 mm; largeur_utile 200-220 mm; liteaux_ml_par_m2 2.6 ml/m2

## Tuiles béton

### tuile béton grand moule

- **Monier Double Romane** (confirme_fabricant 14) : tuiles_par_m2_min 9.6 u/m2; pureau_min 295 mm; largeur_utile 300 mm; liteaux_ml_par_m2 3.4 (pureau mini) / 2.9 (pureau maxi) ml/m2; poids_unitaire_et_au_m2 4.3 kg ; 41,3 à 48,6 kg/m² kg; tuiles_par_palette 160 u; pente_minimale 29 % / 16°17' (site protégé, avec écran) %; dtu NF P 31-207 [DTU 40.24] -; tuiles_par_m2_max 11.3 u/m2; pureau_max 345 mm; rives_par_ml_et_par_cote 3,2 u/ml; faitieres_par_ml 2.8 u/ml; chatiere_section_ventilation 18 cm²
- **Monier Plein Ciel** (confirme_fabricant 14) : tuiles_par_m2_min 9.6 u/m2; pureau_min 315 mm; largeur_utile 300 mm; liteaux_ml_par_m2 3.2 (pureau mini) / 2.9 (pureau maxi) ml/m2; poids_unitaire_et_au_m2 4.2 kg ; 40,3 à 44,5 kg/m² kg; tuiles_par_palette 160 u; pente_minimale 25 % / 14°04' %; dtu NF P 31-207 [DTU 40.24] -; tuiles_par_m2_max 10.6 u/m2; pureau_max 345 mm; rives_par_ml_et_par_cote 3,2 u/ml; faitieres_par_ml 2.8 u/ml; chatiere_section_ventilation 18 cm²
- **Monier Perspective** (confirme_fabricant 14) : tuiles_par_m2_min 9.6 u/m2; pureau_min 295 mm; largeur_utile 300 mm; liteaux_ml_par_m2 3.4 (pureau mini) / 2.9 (pureau maxi) ml/m2; poids_unitaire_et_au_m2 4.6 kg ; 44,2 à 52 kg/m² kg; tuiles_par_palette 160 u; pente_minimale 25 % / 14°04' (site protégé, avec écran) %; dtu NF P 31-207 [DTU 40.24] -; tuiles_par_m2_max 11.3 u/m2; pureau_max 345 mm; rives_par_ml_et_par_cote 3,2 u/ml; faitieres_par_ml 2.8 u/ml; chatiere_section_ventilation 25 cm²
- **Monier Innotech** (confirme_fabricant 14) : tuiles_par_m2_min 9.6 u/m2; pureau_min 295 mm; largeur_utile 300 mm; poids_unitaire_et_au_m2 4.6 kg ; 44 à 52 kg/m² kg; tuiles_par_palette 140 u; pente_minimale 40 % / 21°80' (site protégé, avec écran) %; dtu NF P 31-205 [DTU 40.241] -; tuiles_par_m2_max 11.3 u/m2; pureau_max 345 mm; liteaux_ml_par_m2 3.4 (pureau mini) / 2.9 (pureau maxi) ml/m2; rives_par_ml_et_par_cote 1,5 à 1,7 + 1,5 à 1,7 u/ml; faitieres_par_ml 2.8 u/ml; chatiere_section_ventilation 25 cm²
- **Monier Nobilée** (confirme_fabricant 14) : tuiles_par_m2_min 9.6 u/m2; pureau_min 295 mm; largeur_utile 299-301 mm; poids_unitaire_et_au_m2 4.6 kg ; 44 à 52 kg/m² kg; tuiles_par_palette 140 u; pente_minimale 40 % / 21°80' (site protégé, avec écran) %; dtu NF P 31-205 [DTU 40.241] -; tuiles_par_m2_max 11.3 u/m2; pureau_max 345 mm; liteaux_ml_par_m2 3.4 (pureau mini) / 2.9 (pureau maxi) ml/m2; rives_par_ml_et_par_cote 1,5 à 1,7 + 1,5 à 1,7 u/ml; faitieres_par_ml 2.8 u/ml; chatiere_section_ventilation 25 cm²
- **Monier Tradipanne** (confirme_fabricant 14) : tuiles_par_m2_min 9.6 u/m2; tuiles_par_m2_max 11.3 u/m2; pureau_min 295 mm; pureau_max 345 mm; largeur_utile 300 mm; liteaux_ml_par_m2 3.4 (pureau mini) / 2.9 (pureau maxi) ml/m2; poids_unitaire 4.1 kg; tuiles_par_palette 144 u; pente_minimale 25 % / 14°04' (site protégé, avec écran) %; dtu NF P 31-207 [DTU 40.24] -; rives_par_ml_et_par_cote 3,2 u/ml; faitieres_par_ml 2.8 u/ml; chatiere_section_ventilation 18 cm²
- **Toutes marques tuile béton grand moule 42 × 33 cm (Monier)** (une_source 1) : tuiles_par_m2 9,6 à 11,3 u/m2

### tuile plate béton

- **Monier Médiévale (plate béton)** (une_source 7) : tuiles_par_m2 60 à 67 (≈ 63) u/m2; pureau 9 à 10 (recouvrement 7 à 9) cm; largeur_utile ≈ 16,7 cm; poids_unitaire_et_au_m2 1.2 kg ; 72 à 80,4 kg/m² kg; tuiles_par_palette 1008 u; pente_minimale 60 % / 30°96' %; dtu NF P 31-206 [DTU 40.25] -
- **Monier Vieille France (plate béton)** (une_source 7) : tuiles_par_m2 60 à 67 (≈ 63) u/m2; pureau 9 à 10 (recouvrement 7 à 9) cm; largeur_utile ≈ 16,7 cm; poids_unitaire_et_au_m2 1.2 kg ; 72 à 80,4 kg/m² kg; tuiles_par_palette 1008 u; pente_minimale 60 % / 30°96' %; dtu NF P 31-206 [DTU 40.25] -
- **Monier tuiles plates béton** (une_source 1) : fixation rives et égout : toutes les tuiles fixées ; plain carré selon tableau (pente, écran, hauteur, vent) -
- **Toutes marques tuile plate béton Monier (Médiévale, Vieille France)** (une_source 1) : tuiles_par_m2 60 à 67 u/m2

## Faîtages, arêtiers, rives, égouts, noues, ventilation

### faîtage tuile

- **Toutes marques faîtière 1/2 ronde ou angulaire 40-42 cm** (confirme 1) : pieces_par_ml 3 u/ml
- **Toutes marques faîtière/arêtier 1/2 rond ou conique à emboîtement, grand modèle (≈ 45-50 cm)** (confirme 1) : pieces_par_ml 2.5 u/ml
- **Toutes marques faîtière, arêtier, about, rencontre** (confirme 1) : unite_de_vente pièce
- **Monier faîtière/arêtier demi-ronde de 50** (une_source 1) : pieces_par_ml 2 u/ml

### faîtage ardoise

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| types | lignolet ; faîtière terre cuite scellée au mortier bâtard ; faîtière terre cuite à sec (Armor, Ardoise) ; faîtage zinc à pinces ou à ourlets  |  | confirme |

- **Edilians Faîtière Armor 33 (réf. 729), faîtière terre cuite à emboîtement pour toiture ardoise** (confirme 1) : longueur_piece 370 mm
- **Edilians Faîtière Armor 33 (réf. 729)** (une_source 1, confirme 1, a_confirmer 1) : conditionnement 184 u/palette; pieces_par_ml None u/ml
- **Edilians Faîtière ardoise de 40 Ouverture 17 (réf. 720)** (une_source 1) : longueur_piece 445 mm
- **Toutes marques lignolet** (confirme 1, une_source 1) : definition ardoises du versant au vent débordant sur l'autre versant, sans métal ni mortier ; site normal ou protégé seulement; ardoises_par_ml 2 × 1 000 ÷ (largeur d'ardoise en mm + 3) ardoises par ml de faîtage (un rang de doublage par versant), + 2 clous par ardoise sur les deux derniers rangs ardoises par ml de faîtage (les deux versants)

### closoir de faîtage / arêtier

- **Monier Metalroll, Figaroll Plus** (confirme 1) : longueur_rouleau 5 m
- **Toutes marques Airtec Duo/Alu Roll, Dryroll, bi-composant** (confirme 1) : longueur_rouleau 10 m ou dévidoir 50 m m
- **Toutes marques closoir souple ou rigide** (confirme 1) : recouvrement 5 cm
- **Toutes marques closoirs souples** (confirme 1) : 
- **Toutes marques closoirs souples ventilés** (confirme 1) : usage le même closoir sert au faîtage et à l'arêtier
- **Toutes marques closoirs ventilés** (confirme 1) : section_ventilation 70 à 200 cm²/ml
- **Terreal LAHE-PRO (rigide ventilé)** (une_source 1) : longueur_element 2 m

### faîtage à sec

- **Toutes marques système faîtage à sec** (confirme 1) : composition closoir + lisse de rehausse + supports de lisse + clips (ou vis) de faîtière

### fixation de faîtière

- **Toutes marques clip / crochet de faîtière** (confirme 1) : nombre 1 u par faîtière
- **Toutes marques support de lisse / porte-liteau de faîtage** (confirme 1) : espacement 1 par chevron ou fermette (50 à 80 cm), soit ≈ 1,5 à 2 au ml u/ml
- **Toutes marques porte-liteau pour pose à sec** (confirme 1) : hauteur 180 à 310 mm (Ubbink) ; réglable 30 à 45 mm ou 210 mm à clouer (Terreal) mm
- **E.u.r.o.Tec Support d'arêtier et de latte faîtière 50** (une_source 1) : conditionnement 100 u

### abouts

- **Toutes marques about de faîtière / fronton** (une_source 1) : nombre 1 par extrémité de faîtage sur pignon ; 0 côté croupe (rencontre ou poinçon) u
- **Toutes marques about d'arêtier** (confirme 1) : nombre 1 u par arêtier
- **Toutes marques rencontre / porte-poinçon 3 ou 4 branches** (confirme 1) : nombre 1 par jonction faîtage-arêtiers u

### mortier de faîtage

- **Toutes marques mortier de couverture prêt à gâcher** (confirme 1, a_confirmer 1) : consommation 5 à 10 kg/ml
- **Toutes marques sac de 25 kg** (confirme 1) : conditionnement sac 25 kg ; palette 48 sacs (1 200 kg) Weber et PRB, 56 sacs VPI
- **Toutes marques mortier de couverture** (confirme 1) : usages faîtières, arêtiers, égouts, rives, solins, crêtes de coq, souches

### mortier de rive / arêtier

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| consommation | None kg/ml | rive scellée, arêtier scellé, ruellée | a_confirmer |


### mortier de solin

- **Technichem B304 Sperrmörtel** (une_source 1) : consommation 1,5 à 2 kg/ml

### faîtage zinc

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| pattes_par_ml | 3 u/ml | pattes ou clous de faîtage zinc | a_confirmer |

- **Toutes marques faîtage simple à pinces ou à ourlets** (confirme 1) : longueur_piece 2 m
- **Toutes marques faîtage simple à pinces / à ourlets** (confirme 1) : developpe 250, 333, 400 mm

### rive tuile

- **Toutes marques rive individuelle à emboîtement, grand moule** (confirme 1) : pieces_par_ml 2,6 à 2,8 (= 1 ÷ pureau) u/ml par côté
- **Edilians rive individuelle tuile plate** (une_source 1) : pieces_par_ml 4,6 à 5 (au pureau de 110 à 100 mm) u/ml par côté

### rive zinc

- **Toutes marques bande de rive (à biseau, à cheval, astragale, à pli, lyonnaise)** (confirme 1) : longueur_piece 2 m

### rive ardoise

- **Toutes marques rive à tranchis (ardoise et demi-ardoise alternées)** (confirme 1) : mise_en_oeuvre rang d'ardoise alterné d'un demi-rang, à l'aplomb d'un chevron de rive saillant ; fixation 1 clou de tête + 1 crochet (entière), 2 clous (demi)

### noue préformée

- **Edilians NOOK (autoportante)** (une_source 1) : longueur_utile 1.85 m par élément de 2 m
- **Edilians Noue à pinces (toiture ardoise)** (une_source 1) : developpe 250 (2 ml), 333 (2 ou 3 ml), 400 (2 ou 3 ml) mm
- **VMZINC Noue 100 % zinc pour tuiles** (confirme 1) : dimensions largeur 400 ou 500 mm ; longueur 2 ou 3 m (naturel), 2 m (laqué) ; 0,65 mm (naturel), 0,70 (laqué)

### noue ardoise

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| types | noue métallique ouverte (sur voligeage, recouvrement ardoise ≥ 6 cm) ; noue fermée à noquets (pente ≥ 40 %, 1 noquet tous les 2 pureaux) ; noue ronde en ardoise  | NF DTU 40.11 illustré par la CAPEB | confirme |


### égout

- **Toutes marques closoir peigne pare-moineaux, closoir d'égout acier** (confirme 1) : longueur_piece 1 m
- **Toutes marques bande de doublis / bande à ourlet** (confirme 1) : longueur_piece 2 m
- **Terreal Larmier zinc** (confirme 1) : dimensions zinc 0,6 mm, longueur 2 m, développé 166 mm
- **Ubbink liteau de ventilation H14, liteau A-U 20** (une_source 1) : section_ventilation 80 (H14) ; 200 à 300 (A-U 20) cm²/ml

### ventilation

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| section_totale | tuiles, comble perdu sans écran : 1/5000 ; comble aménagé sans écran : 1/3000 ; avec écran ventilé en sous-face : 1/5000 au-dessus + 1/3000 sous l'écran ; ardoise comble perdu 1/5000, aménagé 1/3000 de la surface projetée (tuiles) | moitié en partie basse, moitié en partie haute ; DTU série 40.1 / 40.2 cités par la FFB | confirme |

- **Toutes marques tuile chatière** (confirme 1) : section_ventilation 13 à 55 cm² par tuile
- **Toutes marques tuile à douille + lanterne / chapeau** (confirme 1) : diametre Ø 100, 126, 150 ou 160 selon modèle mm
- **Ubbink chatière discrète VEPAC 70 / 140 ardoises** (une_source 1) : section_ventilation 70 ou 140 cm²

## Zinguerie et évacuation des eaux pluviales

### gouttière zinc demi-ronde pendante

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| developpes_vendus | [160, 250, 330, 400] mm | appellation comptoir « de 16 », « de 25 », « de 33 », « de 40 » ; RHEINZINK, Edilians et NedZink écrivent 166 / 333 pour la « 16 » / la « 33 » | confirme |
| section_d_ecoulement | {'160': 20, '250': 57, '330': 113, '400': 174} cm2 |  | confirme |
| surface_en_plan_desservie_par_sortie_pente_5_mm_m | {'250': 35, '330': 95, '400': 180} m2 | surface en projection horizontale, par sens d'écoulement vers une naissance ; une naissance au milieu reçoit les deux côtés | confirme |

- **VMZINC Gouttière pendante de 16** (confirme_fabricant 1) : 
- **VMZINC Gouttière demi-ronde de 25** (confirme_fabricant 1) : 
- **VMZINC Gouttière demi-ronde de 33** (confirme_fabricant 1) : 
- **VMZINC Gouttière pendante de 40** (confirme_fabricant 1) : 
- **RHEINZINK Gouttière demi-ronde 166 / 250 / 333 (boudin 14)** (confirme_fabricant 1) : 
- **Edilians Gouttière demi-ronde NATZINC (boudin 14)** (confirme_fabricant 1) : 
- **NedZink Gouttière ½ ronde (types 250 à 500)** (confirme_fabricant 1) : 

### gouttière zinc

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| developpe_28_285_mm | 285 mm | demi-ronde de 28 : 280 mm (RHEINZINK, longueur standard 3 m) ou 285 mm (NedZink, catalogue belge) ; aussi en moulurée NedZink et en PVC (Nicoll LG28) | confirme |
| developpe_20 | None mm |  | a_confirmer |
| autres_longueurs_vendues | [2, 6] m | 2 m surtout en grande surface de bricolage et petite gamme ; 6 m rare (lyonnaise acier RHEINZINK 6000 mm) | confirme |
| epaisseur_courante | 0.65 mm | 0,80 mm existe (VMZINC demi-ronde 6,5/10 ou 8/10) | confirme |
| finitions | ['naturel', 'Quartz-Zinc', 'Anthra-Zinc', 'Pigmento', 'bilaqué'] liste | autres marques : RHEINZINK CLASSIC naturel / prePATINA ; NedZink NATUREL / NOVA / NOIR ; elZinc naturel / patiné. Règle du fondateur : naturel par défaut sauf si le devis précise. | confirme |
| profils_vendus_en_bretagne | ['demi-ronde pendante 25 / 33', 'nantaise 33 / 40 (rampante, relevé 80)', 'Quimper', 'carrée 33'] liste |  | confirme |
| longueur_maximale_sans_dispositif_de_dilatation | 12 m |  | confirme |
| recouvrement_mini_d_une_jonction_soudee | 30 mm |  | confirme |


### gouttière zinc lyonnaise (renforcée neige)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| developpes_et_section | {'250': 43, '330': 100} cm2 | régions de neige (montagne, Est) ; rare en Bretagne | confirme |


### gouttière zinc (demi-ronde, lyonnaise, nantaise)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_vendue_standard | 4 m | zinc 0,65 ; vendue à l'unité, botte de 5 chez le fabricant | confirme |


### gouttière zinc nantaise (rampante, sur rampant)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| developpes | [330, 400] mm | « de 33 » et « de 40 » chez VMZINC (écrit 33 / 40), RHEINZINK et Edilians (écrivent 333 / 400) ; la nantaise de 25 n'est plus au catalogue VMZINC 2026 ; la 50 (500 mm) est nouvelle chez VMZINC seul | confirme |

- **VMZINC Gouttière nantaise (ou laval) de 33** (confirme_fabricant 1) : 
- **VMZINC Gouttière nantaise (ou laval) de 40 et de 50** (confirme_fabricant 1) : 
- **RHEINZINK Gouttière nantaise 333 et 400 (avec pince)** (confirme_fabricant 1) : 
- **Edilians Gouttière nantaise et havraise NATZINC (avec pince)** (confirme_fabricant 1) : 

### gouttière zinc nantaise

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_vendue | 4 m |  | confirme |
| hauteur_de_releve_choix_au_comptoir | [80, 100] mm | 80 mm (« R8 ») courant en Bretagne ; 100 mm (« R10 ») surtout en 40, en 33 chez VMZINC et RHEINZINK | confirme |
| surface_desservie_selon_pente_du_toit_releve_80_100_dev_330 | {'27°': [35, 65], '35°': [23, 45], '45°': [15, 30], '60°': [None, 20]} m2 | la section d'une gouttière rampante baisse quand la pente du toit monte : une nantaise sur ardoise à 45° dessert peu de surface ; le tableau VMZINC écrit 333 mm pour la nantaise de 33 | une_source |


### gouttière zinc havraise / ardennaise (rampante)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| developpes | [330, 400] mm | 33 (333 mm sur les fiches) et 40 ; longueurs 2 m ou 4 m ; la havraise de 25 n'est dans aucun catalogue 2024-2026 | confirme |

- **VMZINC Gouttière havraise (ou ardennaise) de 33 et de 40** (confirme_fabricant 1) : 
- **RHEINZINK Gouttière havraise 333 et 400 (avec pince)** (confirme_fabricant 1) : 

### gouttière rampante (nantaise, havraise)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| bande_de_doublis_a_commander_avec_la_gouttiere | 2 m | la gouttière rampante se pose sur une bande de doublis ; talons, retours et moignon du doublis sont façonnés par le couvreur (VMZINC) | confirme |


### gouttière zinc Quimper

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| profil_regional_breton_existant | Quimper nom | VMZINC zinc naturel, ép. 0,65 mm, développé 400 mm, hauteur 95 mm, longueur 4 m ; crochet équerre propre (Frénéhard) ; se pose sur une bande de doublis | confirme |

- **VMZINC Gouttière Quimper** (confirme_fabricant 1) : 

### crochet de gouttière pendante

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| espacement_maximal | 0.5 m | gouttière pendante zinc, toutes régions ; à réduire selon charges climatiques (neige) d'après le DTU 40.5 | confirme |
| espacement_reduit_neige_vent_bord_de_mer | 0.4 m |  | a_confirmer |

- **VMZINC Crochet discret PLUVIAZINC (gouttière demi-ronde à pince)** (confirme_fabricant 1) : 
- **RHEINZINK Crochets de gouttière demi-ronde (emboutis, Rouen, Toulouse)** (confirme_fabricant 1) : 
- **NedZink Crochets et accessoires de gouttière ½ ronde** (une_source 1) : 

### crochet de gouttière à l'anglaise

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| espacement_maximal | 0.4 m |  | confirme |


### crochet de gouttière PVC

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| espacement_maximal | 0.5 m |  | confirme |
| distance_du_premier_crochet_crochets_pres_d_un_raccord | {'premier_crochet_cm': 30, 'distance_mini_raccord_cm': 5} cm |  | une_source |


### crochet de gouttière

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| types_vendus_pose | ['sur chevron / volige (Rouen, Toulouse, Montpellier…)', 'bandeau (à visser en façade)', 'à queue (sous la couverture)', 'sur hampe', 'crochet nantais / havrais (gouttière rampante)', 'crochet discret (PLUVIAZINC)'] liste |  | confirme |
| matieres | ['acier galvanisé', 'inox', 'cuivre', 'galvanisé laqué'] liste |  | confirme |
| conditionnement_fabricant | {'dev_250': 100, 'dev_330': 50} u/carton | crochet discret PLUVIAZINC (VMZINC) ; le conditionnement dépend du modèle : voir les modèles VMZINC, RHEINZINK, NedZink. Le négoce vend aussi à la pièce ; la règle du skill (nombre exact, sans arrondi à la boîte) reste valable | confirme |


### talon (fond) de gouttière

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| conditionnement_pose | soudé ou emboîtable, gauche/droite ou universel texte |  | confirme |

- **VMZINC Talon symétrique et embouts à talon (demi-ronde)** (confirme_fabricant 1) : 
- **RHEINZINK Talons, embouts à talon et équerres (demi-ronde)** (confirme_fabricant 1) : 

### talon de gouttière rampante

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| fourniture | façonné par le couvreur, ou fond nantais / havrais emboîtable (Edilians) texte | nantaise, havraise : VMZINC fait façonner les accessoires (pentes différentes à chaque versant) ; Edilians vend des fonds nantais emboîtables gauche / droite en dév. 333, relevé 8 ou 10, et des fonds havrais gauche / droite | confirme |

- **Edilians Fonds, naissances et crochets nantais / havrais NATZINC** (confirme_fabricant 1) : 

### équerre (angle) de gouttière

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| types | ['extérieure 90°', 'intérieure 90°'] liste | 90° au catalogue des trois fabricants français ; 135° en zinc : non catalogué (voir equerre_135_zinc) | confirme |
| equerre_zinc_a_135_au_catalogue | non trouvée  | VMZINC 2026 : équerres 90° seulement ; RHEINZINK 2026 : équerres sans angle indiqué (90° d'usage) ; Edilians 2024 : équerres zinc sans angle, angles à 135° seulement en aluminium Aqualu | a_confirmer |

- **VMZINC Équerre 90° demi-ronde de 25** (confirme_fabricant 1) : 
- **VMZINC Équerre 90° demi-ronde de 33** (confirme_fabricant 1) : 

### naissance / moignon

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| types_et_diametres | {'dev_250': 'Ø80', 'dev_330': 'Ø80 ou Ø100'} mm | naissance agrafable (libre dilatation) ou moignon tronconique à souder ; le comptoir demande développé + Ø de descente ; RHEINZINK, Edilians et NedZink écrivent 333 pour la « 33 » ; dév. 166 → Ø 60 et dév. 400 → Ø 120 (Edilians, RHEINZINK) | confirme |

- **VMZINC Naissance agrafable et moignons (demi-ronde)** (confirme_fabricant 1) : 
- **RHEINZINK Naissances (agrafables, cylindriques à souder, tronconiques)** (confirme_fabricant 1) : 
- **Edilians Naissances NATZINC (demi-ronde et lyonnaise)** (confirme_fabricant 1) : 

### gouttière (toutes matières)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| pente_minimale | 5 mm/m |  | confirme |


### descente EP

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| surface_en_plan_desservie_selon_diametre_interieur | {'60': 40, '80': 71, '100': 113, '120': 161, '140': 220, '160': 287} m2 | intensité 3 l/min/m² (France métropolitaine, NF DTU 60.11) | confirme |


### descente EP zinc

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| diametres_ronds_vendus | [60, 80, 100, 120] mm | Ø 80 et Ø 100 couvrent la maison individuelle ; carrés existent (VMZINC tuyaux carrés, dimensions non relevées) | confirme |
| longueurs_vendues | [2, 3, 4] m | 2 m = longueur standard du zinc ; 3 m en Ø 80 et Ø 100 ; 4 m en Ø 100 seulement (VMZINC, RHEINZINK, Edilians) | confirme |

- **VMZINC Tuyau de descente zinc (cylindrique bord à bord et tronconique)** (confirme_fabricant 1) : 
- **RHEINZINK Tuyaux de descente (tulipe, soudés, tronconiques)** (confirme_fabricant 1) : 
- **Edilians Descentes, coudes, colliers et dauphins NATZINC** (confirme_fabricant 1) : 

### descente EP PVC

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueurs_vendues | [4, 3, 2, 1] m | 4 m = longueur standard Nicoll ; First Plast vend 1, 2 et 3 m | confirme |


### collier de descente

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| espacement_maximal_et_nombre | {'espacement_max_m': 2, 'mini_par_element': 1} m | zinc et PVC : 2 m ; fonte 2,70 m ; cuivre 2,50 m ; écart au mur ≥ 2 cm | confirme |
| types_et_conditionnement | ['collier à embase (à visser, tige)', 'bague autobloquante (VMZINC)', 'bague simple + collier mural', 'collier PVC (Nicoll)'] liste | le comptoir demande Ø, type (embase / à bague / à cheviller) et longueur de tige selon l'isolation de façade | confirme |

- **VMZINC Bagues de descente zinc** (confirme_fabricant 1) : 
- **RHEINZINK Colliers et bagues de descente** (confirme_fabricant 1) : 

### coude de descente

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| angles_vendus | {'zinc': [36, 40, 60, 70, 72, 76, 85, 90], 'pvc': [67.5, 87.5]} degre | zinc courant : 72° ; 40° et 90° (VMZINC), 76° « Paris » et 60° en Ø 60 (RHEINZINK), 85° (Edilians), 70° angle vif et 36° rotule (VMZINC) | confirme |
| nombre_usuel_par_descente_devoiement_sous_la_gouttiere | 2 u | débord de toit : naissance → coude → coude → tube ; 0 si la naissance tombe à l'aplomb ; +1 en pied si raccord au regard sans dauphin | confirme |

- **VMZINC Coudes de descente zinc** (confirme_fabricant 1) : 
- **RHEINZINK Coudes de descente zinc** (confirme_fabricant 1) : 

### dauphin

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_standard | 1 m | fonte ou acier, droit ou coudé, Ø80 / Ø100 ; existe en 2 m (Pil, Achard) et 0,5 m en acier galva (Frénéhard) | confirme |

- **RHEINZINK Dauphins fonte (cylindriques droits ou coudés)** (confirme_fabricant 1) : 

### cuvette / boîte à eau / crapaudine

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| pieces_de_reseau | ['cuvette de branchement', 'cuvette de face', "cuvette d'angle", 'boîte à eau', 'crapaudine'] liste | jamais calculées : une par point de raccord, à faire dire par l'artisan | confirme |


### gouttière PVC

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueurs_vendues | [4, 2] m |  | confirme |
| longueur_maxi_alimentant_une_naissance_dispositif_de_dilatation | 12 m |  | confirme |
| surface_desservie_par_naissance | {'LG16': 20, 'LG25': 65, 'LG33': '100 / 160'} m2 | Nicoll, naissance recevant les deux côtés | une_source |

- **Nicoll Demi-ronde LG25** (confirme_fabricant 1) : 
- **Nicoll Demi-ronde LG33** (une_source 1) : 
- **First Plast Gouttière PVC 16 / 25 / 33** (une_source 1) : 

### gouttière aluminium continue

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_d_un_troncon_profile_sur_chantier_avant_joint | 15 m |  | une_source |


### gouttière aluminium

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| espacement_des_crochets | 0.5 m |  | une_source |


### gouttière acier galvanisé laqué

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| formats | {'developpes': [250, 333], 'longueur_m': 4, 'tuyaux': 'Ø87 / Ø100 en 3 m'} mm |  | une_source |


### feuille de zinc

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| format_courant | 2000 × 1000 mm |  | confirme |
| autres_formats | ['2000 × 650', '2000 × 800', '3000 × 1000', '2250 × 1000'] mm | 2 × 0,65 et 2 × 0,80 : VMZINC seulement ; 2250 × 1000 : NedZink seulement | une_source |
| epaisseurs | [0.65, 0.7, 0.8, 1.0] mm | 0,65 par défaut (skill) : confirmé comme épaisseur courante | confirme |
| poids_d_une_feuille_2_x_1_m_en_0_65 | 9.36 kg | 0,65 mm : 9,36 kg (calcul vérifié sur la fiche RHEINZINK 0,80 = 11,52 kg) ; 0,80 mm : 11,52 kg | confirme |
| feuilles_par_palette | {'palette_500kg': 54, 'palette_1t': 107} u |  | une_source |
| bandes_de_2_m_tirees_d_une_feuille_2_x_1_m_selon_developpe | {'dev_250': 4, 'dev_330': 3, 'dev_400': 2, 'dev_500': 2} u | arithmétique : partie entière de 1000 / développé ; chute 10 mm en dév. 330, 200 mm en dév. 400 | confirme |


### bobineau de zinc

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| largeurs_et_longueurs | {'largeurs_mm': [500, 650, 1000], 'longueurs_m': [17, 21, 31], 'epaisseurs_mm': [0.65, 0.7, 0.8]} mm/m |  | confirme |


### bobine de zinc joint debout

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| largeur_entraxe_des_joints | {'500': 430, '650': 580} mm | 500 imposé en zone de vent 3 exposé et zone 4 (VMZINC) : littoral breton | confirme |


### patte de joint debout

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| pattes_par_metre_de_joint | 3 u/m | VMZINC donne des pattes par m² selon le rampant (doc §36.2), cohérent : 3/ml de joint × (1 / 0,43) ≈ 7 pattes/m² en 500 | confirme |


### bande zinc façonnée (égout, rive, faîtage, solin, doublis)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_standard | 2 m | sur mesure : VMZINC plie jusqu'à 4 m (12 m pour les chéneaux), développé 1000 mm maxi | confirme |


### bande zinc façonnée sur mesure

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_maximale_pliage_a_la_demande | 4 m |  | une_source |


### faîtage zinc façonné

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_vendue | 2 m |  | confirme |


### étain à souder

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| baguette_33_etain | 200 à 250 g | facturé au kg en négoce (Nevax : unité de facturation kilogramme) | confirme |
| targette_barre_33 | 800 g |  | confirme |
| titres_d_alliage_vendus_pour_le_zinc | ['Sn33/Pb67 (courant)', 'Sn30/Pb70', 'Sn28', 'Sn40/Pb60 rare', 'sans plomb SnZn (RHEINZINK)'] liste |  | confirme |
| consommation_par_jonction_ou_par_ml | None g |  | a_confirmer |


### décapant (flux) zinc

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| flacons_vendus | [250, 320, 1000] ml | RHEINZINK : « liquide à souder Z-04-S » et solvant pour prePATINA (volume non relevé) | confirme |


### longueurs vendues

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueurs_vendues_en_bretagne | {'gouttiere': 4, 'tuyau_descente': 2, 'tuyau_descente_variante': 3, 'bandes_doublis_rive_egout_noue_faitage': 2} m | zinc 0,65 mm (0,80 en nantaise de 40) ; naturel, quartz, anthra, Granum ; descentes Ø 60 / 80 / 100 et carrées 80 × 80 | confirme |


### joint de dilatation de gouttière

- **VMZINC Joint de dilatation VMZINC type 26 / type 39** (confirme_fabricant 1) : 
- **RHEINZINK Joints et éléments de dilatation** (confirme_fabricant 1) : 

### manchon de descente

- **VMZINC Manchon pour tuyau cylindrique Ø 80 / Ø 100** (confirme_fabricant 1) : conditionnement 5 u/carton

### crochet de gouttière rampante

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| espacement_maximal | 0.5 m | gouttières havraises, rouennaises et nantaises : crochets de même métal, 0,50 m au plus (NF DTU 40.5) ; aucun fabricant (VMZINC, RHEINZINK, Edilians) ne donne d'écartement propre aux crochets nantais | une_source |

- **RHEINZINK Crochets nantais et havrais** (confirme_fabricant 1) : 

## Écrans sous toiture

### écran souple de sous-toiture

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| recouvrement_horizontal_entre_les | 10 cm | pente > 30 % (> 16,7°) ; NF DTU 40.29 | confirme |
| recouvrement_horizontal_entre_les | 20 cm | pente ≤ 30 % (≤ 16,7°) ; NF DTU 40.29 | confirme |
| recouvrement_en_about_de_le | 10 cm | jonction au droit d'un support (chevron) ; sinon + bande adhésive | confirme |
| recouvrement_par_retournement_au_faitage | 20 cm | pente ≤ 30 % ; 30 cm si pente > 30 % (Edilians) ; bande à cheval de 40 cm mini | une_source |
| seuil_de_pente_qui_change_le_recouvrement | 30 % | 30 % = 16,7° ; 10 cm strictement au-dessus, 20 cm à 30 % et en dessous | confirme |
| consommation_d_ecran_par_m2_de_toiture | 1.15 m²/m² | plage 1,10 à 1,20 selon la pente (recouvrements compris) | une_source |
| entraxe_maxi_des_chevrons_selon_la_classe_mecanique | 60 cm | TR1 45 cm, TR2 (« R2 ») 60 cm, TR3 (« R3 ») 90 cm | confirme |
| mode_de_pose | None  | pose tendue avec contre-lattage obligatoire ; pose en auget (non tendue) interdite | confirme |


### écran souple à double bande adhésive intégrée

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| recouvrement_horizontal_entre_les | 10 cm | toutes pentes, écran à bandes adhésives intégrées (ADH, BBC) | confirme |


### écran HPV

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| format_de_rouleau | 75 m² | 1,50 × 50 m, format courant de toutes les marques | confirme |
| rouleaux_par_palette | 12 à 39 rouleaux | dépend du modèle, à lire sur la fiche du modèle : DELTA-MAXX PLUS 18, DELTA-XX PLUS UNIVERSAL 22, Edilians AERO 24, Spirtech 300 20, DELTA-NEO VENT 25, Divoroll Ecotech 200FR 25, Ondutiss 39, iNDi R2 12 ; sans effet sur la commande d'un chantier (vente au rouleau) | confirme |
| valeur_sd_d_un_ecran_hpv | 0.18 m | HPV = Sd ≤ 0,18 m (perméance ≥ 0,5 g/m².h.mmHg) ; classe Sd1 ≤ 0,10 m ; produits courants 0,02 à 0,03 m | confirme |
| pose_au_contact_de_l_isolant | 0 cm | Sd1, E1, support discontinu ≤ 60 cm (TR2/TR3) ; obligatoire avec laine minérale sous rampant (CPT 3560, 2009) | confirme |

- **Monier Spirtech 110** (une_source 1) : format_de_rouleau 150 m²
- **Monier Divoroll Spirtech 200** (une_source 1) : 
- **Monier Divoroll Spirtech 300** (une_source 1) : 
- **Monier Divoroll Ecotech 200FR** (une_source 1) : rouleaux_par_palette 25 rouleaux
- **Dörken DELTA-MAXX PLUS** (confirme_fabricant 2) : valeur_sd 0.17 m
- **Dörken DELTA-XX PLUS UNIVERSAL** (confirme_fabricant 1) : 
- **Dörken DELTA-FOXX PLUS** (confirme_fabricant 1) : 
- **Dörken DELTA-NEO VENT** (une_source 1) : rouleaux_par_palette 25 rouleaux
- **Edilians AERO 1 / AERO 1 DBA** (confirme_fabricant 1) : 
- **Edilians AERO 2 / AERO 2 DBA** (confirme_fabricant 1) : 
- **Edilians AERO 3 / AERO 3 DBA** (confirme_fabricant 1) : 
- **Ubbink Multivap 300XS** (confirme_fabricant 1) : 

### écran HPV petit format (GSB)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| format_de_rouleau | 30 m² | 1,50 × 20 m (Ondutiss Air R2 Resist 150, 30 m²) ; Soprema 30 × 1 m (30 m²) | une_source |


### écran non HPV (Sd2, Sd3)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| lame_d_air_ventilee_sous_l_ecran | 2 cm | support discontinu (chevrons) ; sur support continu : 4 cm (rampant < 12 m) ou 6 cm (≥ 12 m) | confirme |


### contre-liteau sur écran

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| section_minimale | 20 × 36 mm | 20 mm d'épaisseur × 36 mm de largeur minimum, bois traité classe 2 | confirme |
| nombre_de_files | 1 file par chevron | une contre-latte sur chaque chevron ou fermette, qui fixe l'écran ; ml = surface ÷ entraxe des chevrons | confirme |


### bande d'égout / larmier

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| dimensions | 2 m | développé 166 mm, longueur 2 m (Edilians) ; bande rigide obligatoire à l'égout (NF DTU 40.29) | confirme |


### adhésif de recouvrement d'écran

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| ml_d_adhesif_par_m2_de_toiture | 0.71 ml/m² | = 1 ÷ 1,40 m de lé utile (pente > 30 %) ; 1 ÷ 1,30 = 0,77 ml/m² (≤ 30 %) ; seulement si l'écran participe à l'étanchéité à l'air et n'a pas de bande intégrée | une_source |

- **Dörken DELTA-MULTI-BAND M60** (confirme 1) : format_de_rouleau 25 m

### pare-vapeur sous écran

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| valeur_sd_minimale | 18 m | pare-vapeur continu côté chaud avec un écran de sous-toiture | confirme |


### pare-vapeur (combles, sarking)

- **Dörken DELTA-REFLEX** (confirme 1) : format_de_rouleau 75 m²

## Étanchéité de toiture

### membrane bitume SBS soudée

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| recouvrement_longitudinal_galon | 6 cm | bicouche soudé, NF DTU 43.1 / 43.3 / 43.4 ; 10 à 12 cm pour une 1re couche fixée mécaniquement (fixations dans le recouvrement) | confirme |


### membrane bitume SBS

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| recouvrement_en_about_de_le | 15 cm | feuille autoadhésive Adepar JS (Siplast) ; about soudé : valeur non trouvée | a_confirmer |


### 1re couche (sous-couche) SBS

- **Soprema Elastophène Flam 25** (confirme 1, confirme_fabricant 1) : format_de_rouleau 7 m²
- **Siplast Paradiene S VV / S R4** (une_source 1) : format_de_rouleau 7.5 m²

### 1re couche sur bac acier

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| format_de_rouleau | 10 m² | Paradiene FM R4, Parastyrene FM JS, Paracier G VV 100 : 10 × 1 m (32 à 43 kg) ; Paradiene FM : 7,5 × 1 m | une_source |


### 2e couche autoprotégée SBS (paillettes d'ardoise)

- **Soprema Elastophène Flam 25 AR** (confirme 1, confirme_fabricant 1) : format_de_rouleau 6 m²
- **Soprema Sopralène Flam 180 AR** (confirme_fabricant 1) : 
- **Soprema Nuancier paillettes d'ardoise** (confirme_fabricant 1) : 
- **Siplast Paradiene 30.1 GS** (une_source 1) : 

### primaire EIF

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| consommation | 0.25 l/m² | Elastocol 500 : 0,15 à 0,25 l/m² en une couche ; béton absorbant ≈ 0,25 l/m² (30 l ≈ 120 m²) ; métal ≈ 0,15 l/m² (30 l ≈ 200 m²) | confirme |
| conditionnement | 5 / 10 / 25 / 30 l | Soprema Elastocol 500 : bidons de 5 et 30 l ; Siplast Primer : 2, 10 ou 25 l ; Impression Veral : 10 ou 25 l ; Eco-Activ Primer : 1, 10 ou 20 l | confirme |


### isolant PIR sous étanchéité

- **Soprema Efigreen Alu+** (une_source 1) : format_de_panneau 0.36 m²

### isolant laine de roche sous étanchéité

- **Rockwool Rockacier B** (confirme 1) : format_de_panneau 1.2 m²

### relevé d'étanchéité

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| hauteur_minimale_au_dessus_de_la_protection | 15 cm | valeur courante ; 10, 15 ou 25 cm selon la nature de la protection (NF DTU 43.1) | confirme |


### équerre de renfort de relevé

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| largeur_de_bande | 25 cm | bande de 0,25 m en rouleau de 10 m (Soprema) ; 25 ou 33 cm (Derbigum, 33 cm sur pare-vapeur si isolant > 130 mm) | confirme |


### protection lourde gravillons

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| epaisseur | 4 cm | terrasse inaccessible | une_source |


### pare-vapeur toiture-terrasse

- **Holcim Elevate V-Gard** (a_confirmer 1) : format_de_rouleau 54 m²

### pare-vapeur bitume

- **Soprema Elastovap** (une_source 1) : format_de_rouleau 7 m²

### membrane EPDM

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| format_de_rouleau | 3.05 m de large | RubberCover 1,1-1,14 mm : 3,05 × 7,62 m (23,2 m²) en France ; 3,05 × 30,5 m (93 m²) chez un négoce anglais ; bâche sur mesure | a_confirmer |


### entrée d'eaux pluviales (EEP)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| regle_de_dimensionnement | None  | NF DTU 60.11 P3 (formule de Bazin) + DTU série 43 ; règle courante « 1 cm² de section par m² » ; trop-plein | a_confirmer |


### membrane PVC

- **Soprema Flagon SV / SR** (une_source 1) : format_de_rouleau 42 m²

### bicouche SBS

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| surface_de_membrane_par_m2_de_terrasse_recouvrements_seuls | 1.08 m²/m² | rouleau 1 m, galon 6 cm, about 10 cm : 7 × 1 → 0,94 × 6,9 = 6,49 m² utiles (×1,079) ; 6 × 1 → 0,94 × 5,9 = 5,55 (×1,081) ; hors chutes et relevés | une_source |


### monocouche SBS autoprotégée

- **Siplast Parafor Solo GS** (une_source 1) : 

### 1re couche (sous-couche) SBS

- **Soprema Sopralène Flam 180** (une_source 1) : 

### 1re couche SBS

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| rouleau_de_1_x_10_m_existe_t_il | oui, hors 1re couche soudée courante  | 1 × 10 m : Siplast Paracier (bac acier, fixé mécaniquement), Soprema Belgique Soprarock SBS P3 TF (36 kg) ; en France la sous-couche soudée courante fait 6 à 7,5 m | confirme |


### 2e couche autoprotégée SBS

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| rouleau_de_1_x_8_m_en_france | None  |  | a_confirmer |


### membrane bitume SBS soudée

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| recouvrement_en_about_transversal | 10 à 15 cm | Soprema (guide) 10 cm mini en bord et en bout de lé ; IKO 15 cm transversal (8 cm longitudinal) | confirme |


### bicouche SBS

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| decalage_des_joints_de_la_2e_couche | demi-largeur de lé  | joints décalés dans les deux sens (quinconce) | confirme |
| majoration_pertes_et_recouvrements | 1.15 × surface | rouleaux, hors relevés comptés à part | une_source |


### membrane EPDM

- **Firestone RubberCover** (une_source 1) : 

### colle EPDM

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| consommation_de_colle_de_contact_solvant | 0,35 à 0,45 l/m² | Firestone BA 2012 : 2,35 à 2,75 m²/l (bidons 5 l = 10-12,5 m², 10 l = 20-25 m²) ; BA-2016 projetée : canister 22 l = 50-60 m² ; Elevate BA-2012 : ≈ 3 m²/l | confirme |

- **Flexirub colle membrane EPDM bois / béton** (une_source 1) : consommation 0.25 l/m²

### isolant PIR sous étanchéité

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| format_de_panneau_courant | 1200 × 600 (0,72 m²) mm | Utherm Roof L, IKO enertherm ALU, Recticel PowerDeck F ; existent aussi 1200 × 1000 (Knauf Thane OpTTI), 1200 × 2400 (IKO XL), 600 × 600 (Efigreen Alu+) | confirme |


### entrée d'eaux pluviales (EEP)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| regle_de_dimensionnement_et_trop_plein | None  | NF DTU 60.11 P3 (2013) tableau 5 : diamètre selon la surface collectée par EEP, majoré selon les NF DTU 43 ; trop-plein obligatoire avec une seule EEP (NF DTU 43.1 §8.6.1, cité par un forum) | a_confirmer |


## Bois de couverture

### liteau

- **Toutes marques 18×38 sapin/épicéa CL2** (confirme 1) : 
- **Toutes marques 18×48 / 18×50 CL2** (confirme 1) : 
- **Toutes marques 14×38 / 37×14 CL2** (confirme 1) : 
- **Toutes marques tableau sections liteaux (ancien DTU 40.11)** (confirme 1) : 
- **Toutes marques 18×40** (une_source 1) : ecartement_maximal_entre_appuis 53 cm
- **Toutes marques tuile à emboîtement** (confirme 1) : hauteur_minimale_de_liteau 22 mm
- **Toutes marques tableau NF DTU 40.21** (confirme 1) : 
- **Toutes marques 27×40 sapin/épicéa CL2** (confirme 1) : 
- **Toutes marques 27×38 sapin/épicéa CL2** (confirme 1) : 
- **Toutes marques tous** (confirme 5, a_confirmer 1, une_source 1) : unite_de_vente ml (prix au ml ou par 100 ml = hectomètre), minimum 1 pièce ml; pieces_par_botte_en_bretagne None; ml_de_liteaux_par_m2 1 / pureau (m) ml/m²; perte_casse_coupes 5 %; traitement classe 2 (jaune ou incolore) ; classe 3 (vert) existe pour bardage; essence sapin/épicéa (de France ou du Nord) ; pin et douglas en marge
- **Toutes marques liteaux 4 m** (confirme 1) : 

### contre-liteau

- **Toutes marques sous écran** (confirme 2) : epaisseur_minimale 20 mm; implantation une file par chevron ; sous volige, largeur du contre-liteau = largeur du chevron
- **Toutes marques CL2/CL3** (confirme 1) : 

### volige

- **Toutes marques sapin CL2 18×150 / 18×200** (confirme 1) : 
- **Toutes marques sapin CL2 25×200** (confirme 1) : longueur 4.2 m
- **Toutes marques mi-bois sapin du Nord 15/16 × 180/185** (confirme 1) : 
- **Toutes marques pin maritime / pin des Landes CL2** (confirme 1) : 
- **Toutes marques peuplier 18 à 27 mm, toute largeur** (confirme 1) : 
- **Toutes marques toutes** (confirme 1, a_confirmer 1) : unite_de_vente m² (minimum 1 pièce = longueur × largeur) m²; perte 5 %
- **Toutes marques tableau sections voliges (ancien DTU 40.11)** (confirme 1) : 
- **Toutes marques ardoise au clou** (une_source 1) : 
- **Toutes marques jointive** (confirme 2) : usage_regional ardoise au crochet sur voligeage jointif en site venté (Bretagne)
- **Toutes marques sous zinc / métal** (confirme 1) : essences_a_eviter douglas, mélèze, chêne, châtaignier, red cedar (pH < 5)
- **Toutes marques sapin, pin** (confirme 1) : traitement classe 2 minimum ; peuplier non traité

### chevron

- **Toutes marques 63×75 sapin/épicéa CL2** (confirme 1) : 
- **Toutes marques sapin/épicéa CL2** (confirme 1) : 
- **Toutes marques chevrons bois du Nord** (une_source 1) : 
- **Toutes marques tous** (confirme 1) : unite_de_vente pièce d'une longueur donnée, prix au ml

### longueurs

- **Toutes marques sapin/épicéa de France (Siat, Jura, Vosges)** (confirme 1) : 
- **Toutes marques sapin blanc du Nord / import (Scandinavie)** (confirme 1) : 
- **Toutes marques pin maritime / des Landes** (confirme 1) : 
- **Toutes marques tous** (a_confirmer 2) : 

### planche de rive

- **Toutes marques sapin blanc du Nord (Silverwood, Protac)** (une_source 1) : 

## Pertes de casse et de coupe

### méthode

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| methode_de_metre_des_points_singuliers | surface de couverture + plus-values des points singuliers (m² par ml) = surface à considérer ; quantité = surface à considérer × éléments au m² ; puis + % de casse  | couverture en petits éléments (ardoise au crochet dans le manuel ; le guide Culture fait de même pour l'ardoise clouée ou au crochet) | confirme |


### ardoise naturelle

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| plus_values_par_ml_m2_a_ajouter_a_la_surface | {'egout_droit': 'pureau × longueur', 'egout_biais': '2 pureaux × longueur', 'rive_tranchis_droit': 0.16, 'rive_tranchis_biais': 0.25, 'rive_tranchis_circulaire': 0.33, 'aretier_rang_doublage_2_rives': 0.66, 'aretier_ardoises_biaises_2_rives': 0.66, 'noue_fendis_renvers_1_ou_2_tranchis': 1.5, 'noue_renvers_rond_ou_1_tranchis': 1.5, 'deversee_1_tranchis': 0.33, 'deversee_2_tranchis': 0.5, 'tourelle': 'circonférence de base × hauteur'} m² par ml | ardoise au crochet ; exemple du manuel : versant 39 m², égout 5 m, tranchis droit 6 m, tranchis biais 6,32 m → 3,15 m² de plus-values (+8 %) → 42,15 m² | une_source |
| perte_casse_et_coupes | 5 % | toit simple (deux pans, sans ouverture), après plus-values ou à défaut sur la surface | une_source |
| perte_casse_et_coupes_toit_complique | 7 % (lucarnes, fenêtres de toit) ; 10 % et plus (croupes, noues, arêtiers, tourelles) % | sans plus-values comptées à part | a_confirmer |
| crochets_d_ardoise | 1 crochet par ardoise ; surplus 0 à 10 % selon la source u | pose au crochet | a_confirmer |


### ardoise fibres-ciment

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| perte_casse_et_coupes | 5 % | toit simple | a_confirmer |


### tuiles terre cuite (emboîtement, plates, canal)

- **CTMNC (FDES collectives des fabricants français de tuiles terre cuite) tuile à emboîtement ; tuile canal et tuile plate ; tuile terre cuite (2014)** (confirme 1) : taux_de_casse_a_la_mise_en_oeuvre_hypothese_fdes_module_a5 1 %

### tuiles à emboîtement (grand moule, petit moule, romanes, béton)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| perte_casse_et_coupes | 3 à 5 % | toit simple à deux pans, rives en tuiles de rive comptées à part | a_confirmer |


### toutes tuiles

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| perte_casse_et_coupes_toit_complique | 7 à 10 % et plus (noues, arêtiers, croupes, lucarnes, fenêtres de toit) % |  | a_confirmer |


### tuiles plates

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| perte_casse_et_coupes | 5 % | toit simple | a_confirmer |


### tuiles canal

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| perte_casse_et_coupes_courant_et_couvert | au moins 1 % (casse) ; 5 % courant en formation % |  | a_confirmer |


### faîtières, arêtiers, tuiles de rive

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| methode | ml × pièces au ml du modèle, arrondi à la pièce supérieure ; casse 1 % (FDES) ; aucun % de coupe trouvé  |  | a_confirmer |


### liteaux et contre-liteaux

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| chute_d_aboutage | longueur vendue ÷ longueur utile (multiple de l'entraxe des chevrons) : 0 % si la longueur tombe juste (4,20 m sur chevrons à 60 cm), 10 % pour 4,00 m sur 60 cm % | liteaux aboutés sur chevron (DTU 40.11 cité par les guides : appui de 35 mm, divisé par deux aux jonctions) | une_source |


### voliges

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| perte_coupes_et_chutes | 5 à 10 % | plus haut sur croupes, lucarnes ; plus la chute d'aboutage (comme les liteaux) | a_confirmer |


### écran sous toiture

- **Siplast Sup'Air, Def'X R1** (une_source 1) : consommation_recouvrements_compris 1,10 à 1,20 m²/m²

### zinc en bandes (faîtage, rive, égout, noue)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| methode | ml + recouvrement à chaque jonction, arrondi à la longueur de 2 m ; avec 5 cm de recouvrement : +2,5 % ; avec 10 cm : +5 %  | bandes façonnées vendues en 2 m | a_confirmer |


### gouttières zinc

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| methode | ml de gouttière + 30 mm par jonction soudée, arrondi aux longueurs de 4 m ; pas de % en plus  |  | confirme |


## Points du comptoir et situation exposée

### faîtage ardoise

- **Edilians Faîtière Armor 33 (réf. 729)** (confirme 2, une_source 1) : pieces_par_ml 3 u/ml; recouvrement_entre_faitieres 40 mm
- **Edilians Faîtière Armor 33 Émaillé Brun** (une_source 1) : conditionnement 176 u/palette
- **Edilians Faîtière ardoise de 40 Ouverture 17 (réf. 720)** (une_source 1) : pieces_par_ml 2.5 u/ml

### ardoise naturelle

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| part_crochets_pointe | 0.2 fraction | pose à l'agrafe sur liteaux : pointes là où l'agrafe ne passe pas (au droit de chaque chevron ou contre-liteau) et sur les parties voligées (égout : doublis et 1er rang) ; rives : ardoises à 2 clous, pas de crochet ; sur voligeage jointif : 100 % de pointes | une_source |

- **Toutes marques tous formats** (a_confirmer 2, confirme 1) : ardoises_par_palette_estimation ≈ 1 350 kg ÷ poids unitaire (poids = L × l × e × 2,8 g/cm³) u/palette; majoration_recouvrement R + 10 mm (retenir max(R + 10 mm, R × 1,10)) mm; majoration_recouvrement R × 1,10 arrondi au mm supérieur (≈ + 7 à + 10 mm) mm
- **Toutes marques 27x18** (une_source 1) : ardoises_par_palette 2800 u/palette
- **Toutes marques 40x22** (une_source 1) : ardoises_par_palette 1500 u/palette
- **Toutes marques 35x25** (une_source 1) : ardoises_par_palette 800 u/palette
- **Toutes marques 40x25** (une_source 1) : ardoises_par_palette 950 u/palette
- **Toutes marques 46x30** (une_source 1) : ardoises_par_palette 700 u/palette
- **Toutes marques 30x20** (a_confirmer 1) : ardoises_par_palette None u/palette
- **Toutes marques 33x23** (a_confirmer 1) : ardoises_par_palette None u/palette
- **Toutes marques 35x22** (a_confirmer 1) : ardoises_par_palette None u/palette
- **Toutes marques 45x30** (a_confirmer 1) : ardoises_par_palette None u/palette
- **Toutes marques 50x25** (a_confirmer 1) : ardoises_par_palette None u/palette
- **Cupa Cupa 10 Excellence 40×22** (confirme 1) : unite_de_vente au mille (MIL)

### gouttière

- **Toutes marques pendante, nantaise, havraise** (confirme 1) : ecartement_crochets 0.5 m

### tuile terre cuite

- **Toutes marques DTU 40.21 / 40.211** (confirme 1) : effet_situation_exposee pente minimale plus forte (colonne « exposé » des tableaux), pas de majoration de recouvrement

## Sarking (isolation par-dessus les chevrons)

### panneau PIR / PU de sarking

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| format_hors_tout | 2400 × 1200 mm | panneaux PIR ou PU à rainure-languette 4 côtés (Unilin, Recticel, Soprema, Edilians, Terreal) | confirme |
| surface_utile_d_un_panneau_2400_x_1200 | 2,81 à 2,86 m² | surface couverte après emboîtement ; la surface hors tout (2,88 m²) surestime la couverture de 1 à 2,5 % | confirme |

- **Unilin Utherm Sarking K** (une_source 1) : 
- **Recticel Eurotoit** (une_source 1) : 
- **Recticel Powerroof Max** (une_source 1) : 
- **Soprema (Efyos) Efisarking** (une_source 1) : 
- **Terreal Sarking NRJ+** (a_confirmer 1) : 

### panneau PIR + fibre de bois

- **Unilin Utherm Sarking L Comfort** (une_source 1) : 

### vis de fixation des contre-lattes

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_de_vis | contre-latte + isolant + support (volige, platelage) + ancrage ≥ 60 mm mm | vis perpendiculaire ; en pose inclinée (30° à 60°) la longueur augmente : prendre le tableau du fabricant de vis | confirme |
| ancrage_minimal_dans_le_chevron | 60 mm | tous isolants rigides PIR / phénolique / laine de roche | confirme |
| vis_au_m2 | 2 vis/m² | climat de plaine, neige A1/A2 à 200 m, couverture 0,55 à 0,65 kN/m² (ardoise, tuile légère), chevrons à 60 cm, contre-latte 40 × 60 | confirme |
| fixations_minimales_par_contre_latte_et_position_en_bout | {'minimum': '2 vis (Terreal) ou 3 points (Simpson)', 'premiere_vis_du_bout_mm': '100 (Terreal) à 200 (Rockwool)'}  |  | a_confirmer |

- **Soprema (Efyos) Efivis SF / DF** (une_source 1) : 
- **Rockwool Rockroof Sarking** (une_source 1) : vis_au_m2 6 vis/m²

### panneau phénolique de sarking

- **Edilians Sarkéo Feu** (une_source 1) : 

### panneau fibre de bois de sarking

- **Steico STEICOspecial dry / universal dry** (confirme 1) : format 1880 × 600 (net 1855 × 575) mm
- **Steico STEICOuniversal dry** (une_source 1) : 

### contre-latte sur sarking

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| section | 27 × 60 ou 40 × 60 mm | Terreal : 27 × 60 si couverture < 46 kg/m² (ardoise, tuile légère), 40 × 60 de 46 à 100 kg/m² ; Simpson et Steico calculent en 40 × 60 (mini 30 × 50) | confirme |


### adhésif de jonction des panneaux

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| ml_d_adhesif_par_m2_de_toiture | 1.5 ml/m² | panneaux 2400 × 1200 ; pontage des joints quand il n'y a pas d'écran séparé | une_source |
| formats_de_rouleau | {'Terreal NRJ+': '45 m × 50 mm', 'Soprema Efibande Butyle': '20 m × 75 mm, colis de 8', 'Recticel': 'RECTITAPE (format non trouvé)'}  |  | une_source |


### butée et finitions d'égout

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| piece_de_bois_en_pied_de_versant_butee_sabot_lisse | 1 ml par ml d'égout ml | hauteur = épaisseur d'isolant ; vissée dans les chevrons ; le premier rang de panneaux s'appuie dessus | confirme |


## Abergements de souche et de cheminée

### abergement de souche (métal façonné)

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| pieces_d_un_abergement_complet | ['bavette (devant, en aval, sur le dernier rang)', '2 rives latérales : noquets (ardoise, tuile plate) ou couloirs (tuile à relief)', "derrière / besace (amont, petit chéneau qui rejette l'eau sur les côtés)", 'bande porte-solin + solin (mortier ou mastic) sur le pourtour'] liste | souche, contrefort, édicule ; tuile ou ardoise | confirme |
| debord_de_la_bavette_de_chaque_cote_de_la_souche | 10 à 12 cm | longueur de bavette = largeur de la souche + 2 × 10 à 12 cm ; partie visible au moins égale à un pureau ; goussets soudés aux angles | confirme |
| derriere_besace_debords_recouvrement_et_releve | {'debord_chaque_cote_cm': '12 à 15', 'recouvrement_tuiles_cm_min': 6, 'espace_libre_amont': '3 à 4 pureaux', 'releve_cm': '10 à 12'}  | tuile plate ; une pince à chaque extrémité, goussets soudés | une_source |
| releve_contre_la_souche | 10 cm | minimum ; recouvert par la bande porte-solin ou le solin | confirme |


### noquets

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| dimensions_d_un_noquet | {'longueur': "longueur de l'ardoise ou de la tuile", 'largeur_ardoise': 'demi-ardoise (partie plate) + relevé contre le mur'}  | noquet posé tous les deux rangs | confirme |
| nombre_de_noquets_au_ml_de_jouee | 1 ÷ (2 × pureau) u/ml | cas le plus courant : un noquet tous les deux rangs (longueur = longueur de l'élément) ; ex. pureau 11 cm → 4,5/ml ; 13 cm → 3,8/ml ; tuile plate pureau 10 cm → 5/ml ; arrondir au supérieur + 1 | confirme |
| noquets_tailles_dans_une_feuille_de_zinc_2_x_1_m | ≈ 30 (ardoise 32 × 22) u/feuille | noquet 32 cm de long × ≈ 20 cm de développé (11 cm de partie plate + ≈ 9 cm de relevé) : 6 × 5 = 30 | a_confirmer |


### bande porte-solin

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| developpe_et_longueur | dév. 100 mm, 2 m  | retombée ≈ 50 mm + partie horizontale 15-20 mm + relevé 20-30 mm ≈ 85 à 100 mm ; vendue façonnée en 2 m | confirme |
| hauteur_du_solin_mortier_suspendu_au_dessus_des_tuiles | 20 à 30 mm | rive avec noquets et solin suspendu | une_source |


### plomb laminé

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| masse_surfacique | {'1,25': 14.2, '1,5': 17.0, '2': 22.7, '2,5': 28.4, '3': 34.05} kg/m² selon épaisseur (mm) | plomb laminé EN 12588, masse volumique 11,35 kg/dm³ | confirme |
| formats_vendus_bandes_en_rouleau | {'longueurs_m': [10, 5, 2], 'largeurs_bandes_mm': '160 à 400 (500 en 2,5 mm)', 'epaisseurs_mm': '1,25 à 3', 'tables': '1 m de large en 2, 5 ou 10 m', 'Le Plomb Français': '10 m × 160 / 200 / 250 / 300 (1,25 à 2 mm) ; 5 m × 330 (1,5 et 2 mm) ; 5 m × 300 à 500 (2,5 mm)'}  | plomb de couverture ; en grande surface de bricolage : 10 m × 100 ou 160 mm en 1,25 mm | confirme |

- **Le Plomb Français guide des épaisseurs** (une_source 1) : 

### abergement préfabriqué

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| largeur_de_la_bavette_plomb_plisse | 200 à 300 mm | Edilians 250 mm (6 coloris) ; Terreal 300 mm en rouleau séparé ; abergement universel 200 mm (plomb plissé 0,6 mm) | confirme |
| plages_de_reglage_et_pentes | {'Edilians réglable': "30-60 cm et 60-110 cm, pentes jusqu'à 100 %", 'Edilians fixe': 'boisseaux 26 × 26 à 60 × 40 cm, pentes 25 à 45 %, table plomb 9/10', 'Terreal': 'petit format (boisseaux 350 × 350 à 400 × 400, 300 × 500), grand format (530 × 760 à 1000 × 1000)', 'Universel (BigMat)': '30 à 53 cm, rallonges 500 / 800 mm, pentes ≤ 63 %'}  | boisseaux et souches ; commande à l'unité selon les cotes extérieures | confirme |


### bande d'abergement souple sans plomb

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_de_rouleau | 5 m | Wakaflex, Flexeo, Easy-Form, Ubiflex Finio (Wakaflex 280 mm existe aussi en 10 m ; Ubiflex Standard en 12 m) | confirme |
| largeurs_vendues | {'Wakaflex': [140, 180, 280, 370, 560], 'Flexeo': [280, 450], 'Easy-Form': [200, 250, 300, 450, 600], 'Ubiflex Finio': [250, 300, 400, 500]} mm | largeur courante pour une souche : 280 à 300 mm | une_source |
| longueur_de_bande_par_souche | ≈ périmètre + 1 m ml | devant : L + 2 × 10-15 cm ; côtés : 2 × (P + chevauchement tuile + 10-15 cm) ; arrière : L + 2 × 10-15 cm, en 350 mm de large mini (souvent 2 bandes ou une bande de 370 / 560) | une_source |

- **Monier Wakaflex** (une_source 1) : 

## Sous-faces et habillages de débord

### lambris PVC de sous-face

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| largeurs_de_lame | 100 et 250 mm | lame 10 mm d'épaisseur ; 250 mm (frisette, planche) le plus courant ; Deceuninck de 100 à 250 | confirme |
| longueurs_vendues | 4 m (3, 4,5 et 6 m existent) m | pro : 4 m (M.E.P, Atout Pro), 6 m (Atout Pro, Deceuninck) ; grande surface de bricolage : 3 m | confirme |
| fixation_des_lames | 1 clip inox tous les 60 cm au plus  | entraxe des tasseaux ≤ 60 cm ; à réduire selon coloris et exposition (notice de pose) | une_source |
| lame_d_air_derriere_les_lames | 20 mm | minimum, entre montants bois ; ventilation selon le DTU de couverture | une_source |

- **M.E.P SE254 / SER254 / ST254 / SL254 / SME254 / SB104** (une_source 1) : 

### profils de finition et de ventilation

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| accessoires_de_sous_face | {'finition': ['SFP24 petite finition', 'SFA34 finition murale', 'SFPC4 finition clipable', 'SDC204 / SAJ254 finition double'], 'ventilation': ['grilles SV4 / SV7 (4 et 7 cm)', 'SV237 / SV238 / SV404', 'SVD404 profilé de ventilation dissimulé'], 'fixation': 'clip inox SB3A'}  | longueurs des profils non publiées dans le catalogue ; 3 m en grande surface (Tecnoprofils) | une_source |


### planche de rive / bandeau PVC cellulaire

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| largeurs_et_longueurs | {'largeurs_mm': '150 à 400', 'longueurs_m': [5, 6], 'epaisseur_mm': '9 à 25'}  | Deceuninck 150-400 × 9 mm en 6 m (et 5-6 m selon gamme) ; Plastivan 150 à 404 × 18 mm en 5 m | confirme |

- **M.E.P Rivecel L9** (une_source 1) : 

### sous-face aluminium

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| longueur_standard_des_lames | 3 m | DAL'ALU SF77 / SF129 (largeur utile 280-290 mm, ≈ 2 kg/m²) ; GutterFrance 310 mm utiles, 0,7 mm | une_source |

- **DAL'ALU SF77 / SF129 perforées** (une_source 1) : 

### lambris bois de sous-face

| Règle | Valeur | Condition | Statut |
|---|---|---|---|
| format_standard | None  | sapin, pin, douglas ; classe d'emploi 3 (ou 2 sous abri) | a_confirmer |


## Carte des régions

Voir `carte-regions.json` (et `recherche/regions.md` pour la page lisible).
