# Deuxième passe (20 novembre 2026) : les 67 chiffres de referentiel.json qui n'ont pas deux sources

Point de départ : 59 % des valeurs de la fiche confirmées par deux sources. Objectif de Greg : 98 %.
Chaque numéro est repris par un chercheur dans recherche/09-* à 12-*. État : [1 source], [contradiction] (valeur retenue + désaccord), [à confirmer].

1. [1 source] .products[rail-f530].sellingUnits[longueur].contains = 2.35 m — 2,35 m, botte de 20 : fiche Placo Rail F 530 (18/12/2023) ; l'ancienne piste interne disait 3 m (faux).
2. [1 source] .products[eclisse-f530].sellingUnits[boite].contains = 50 u — Boîte de 50 : fiche Placo Éclisse F 530 (18/12/2023).
3. [1 source] .products[clous-gaz-beton].sellingUnits[boite].contains = 500 u — Spit C6 : boîte de 500 clous + 1 cartouche, ou 1500 + 3 ; Hilti non vérifié (recherche/02 C.4). Longueur 20 mm pour un rail sur béton : usage, à confirmer.
4. [1 source] .products[isoconfort35-220].sellingUnits[colis].contains = 3.36 m2 — 3,36 m² : fiche Isover 24/03/2026 (longueur 2,80 m) ; l'ancienne fiche disait 2,10 m. R 6,25 : 2 sources.
5. [1 source] .products[isoconfort35-240].sellingUnits[colis].contains = 3.12 m2 — 3,12 m² : fiche Isover 24/03/2026.
6. [1 source] /plaquiste-isolation[cloison-distributive].vis_1p_s40 = 37 u/m2 — SNIP fiche 18 : 37 vis/m² à 0,40 (Placo ancien : 30).
7. [1 source] /plaquiste-isolation[cloison-distributive].vis_1p_d60 = 35 u/m2 — SNIP fiche 18, montants doublés 0,60.
8. [1 source] /plaquiste-isolation[cloison-distributive].vis_1p_d40 = 47 u/m2 — SNIP fiche 18, montants doublés 0,40.
9. [1 source] /plaquiste-isolation[cloison-distributive].vis_int_s60 = 10 u/m2 — SNIP fiche 18, 98/48 : 1re peau vissée à 60 cm, TTPC 25.
10. [1 source] /plaquiste-isolation[cloison-distributive].vis_int_s40 = 14 u/m2 — SNIP fiche 18.
11. [1 source] /plaquiste-isolation[cloison-distributive].vis_ext_s60 = 27 u/m2 — SNIP fiche 18, 98/48 : 2e peau, TTPC 35 (2 × 12,5 mm + 10 mm).
12. [1 source] /plaquiste-isolation[cloison-distributive][vis-ttpc-25] = surface * si(couches < 2, si(montage < 2, regle.vis_1p_s60,  u — Ratio SNIP par montage.
13. [1 source] /plaquiste-isolation[cloison-distributive][vis-ttpc-35] = surface * si(montage < 2, regle.vis_ext_s60, si(montage < 3, u — Ratio SNIP, parement double.
14. [1 source] /plaquiste-isolation[cloison-distributive][vis-trpf] = surface * si(montage < 2, regle.trpf_s60, si(montage < 3, re u — Ratio SNIP.
15. [1 source] /plaquiste-isolation[doublage-fourrures][vis-trpf] = surface * regle.trpf_par_m2 u — SNIP.
16. [1 source] /plaquiste-isolation[contre-cloison-montants].h48_s40 = 2.25 m — Pladur : M48-35 0,40 simples 2,25 m.
17. [1 source] /plaquiste-isolation[contre-cloison-montants].h48_d40 = 2.65 m — Pladur : 2,65 m.
18. [1 source] /plaquiste-isolation[plafond-fourrures].params[plenum].default = 1  — Suspente longue 171 (plénum 20 à 150 mm) : cas courant sous solives (Placo).
19. [1 source] /plaquiste-isolation[plafond-fourrures].params[longueur_plaque].default = 2.5  — 2,50 m : longueur la plus courante (pile de 50) ; ne change pas le nombre de m².
20. [1 source] /plaquiste-isolation[plafond-fourrures].fourrures_e40 = 3.0 ml/m2 — 3,0 ml/m² à 0,40 : Placo Intégrale 2023.
21. [1 source] /plaquiste-isolation[plafond-fourrures].suspentes_e40 = 2.7 u/m2 — 2,7 (Placo 2023).
22. [1 source] /plaquiste-isolation[plafond-fourrures].eclisses_e60 = 0.21 u/m2 — SNIP (aboutage des fourrures).
23. [1 source] /plaquiste-isolation[plafond-fourrures].vis_e40 = 15 u/m2 — 15 (Placo 2023).
24. [1 source] /plaquiste-isolation[plafond-fourrures][chevilles-suspentes] = nb_suspentes u — Une cheville métallique Ø 6 par suspente sous béton (Placo 2023 ; Knauf clou-cheville 6 × 40).
25. [1 source] /plaquiste-isolation[isolation-soufflee].tables.sacs = table u — Certificat ACERMI du produit (une source officielle par produit ; Comblissimo R 10 recoupé par la fiche Isover 2026).
26. [1 source] /plaquiste-isolation[pare-vapeur][membrane] = surface * regle.majoration m2 — Surface × 1,10.
27. [contradiction] .products[vis-trpf-13].sellingUnits[boite].contains = 500 u — Boîte de 500 (Placo, GSB) retenue. | désaccord : Klimas vend la TEX 3,5 × 9,5 en boîte de 1000 : le conditionnement dépend de la marque (recherche/02 C.3).
28. [contradiction] .products[enduit-pate].sellingUnits[seau].contains = 25 kg — Seau de 25 kg retenu (Placomix classique 25 kg, Siniat Prégy S 25 kg). | désaccord : Placomix Pro est en seau de 22 kg, le Pro Allégé en 17 kg, Siniat Prégy S aussi en 7 kg : le seau dépend de la marque (recherche/05 B.2).
29. [contradiction] .products[gr32-nu-45].sellingUnits[colis].contains = 12.15 m2 — 12,15 m² par paquet (fiche Isover) ; R 1,40 (ACERMI 2025). | désaccord : La fiche Isover ancienne imprime R 1,45 ; le certificat ACERMI en vigueur dit 1,40. Colisage : 1 source.
30. [contradiction] /plaquiste-isolation[cloison-distributive].h_9848_d60 = 3.70 m — 3,70 m retenu (valeur la plus basse). | désaccord : Rockwool (DTU 2022) 3,70 ; Siniat carnet et Pladur 3,75.
31. [contradiction] /plaquiste-isolation[cloison-distributive].vis_1p_s60 = 30 u/m2 — 30 vis/m² (SNIP fiche 18, déc. 2024 : vis à 30 cm sur montants + 5 vis/ml sur les rails). | désaccord : Placo (fiche solution 72/48) dit 22 sans les vis de rail ; Pladur 41 ; Gypso 25. SNIP retenu, document de la profession le plus récent.
32. [contradiction] /plaquiste-isolation[cloison-distributive].trpf_d60 = 5 u/m2 — 5 TRPF/m² (SNIP). | désaccord : Placo compte aussi l'assemblage des montants doublés : 6.
33. [contradiction] /plaquiste-isolation[cloison-distributive].trpf_d40 = 7 u/m2 — 7 TRPF/m² (SNIP). | désaccord : Placo : 10.
34. [contradiction] /plaquiste-isolation[cloison-distributive].enduit_pate_par_m2 = 0.94 kg/m2 — 0,47 kg/m² de parement : Intégrale Placo 2023 et brochure 2017 × 2 face(s). | désaccord : La fiche Placomix Pro dit 0,525 kg/m², Siniat Prégy S 0,45 : selon le produit (recherche/05 B.2).
35. [contradiction] /plaquiste-isolation[cloison-distributive][montants] = arrondi_sup((longueur_cloison / entraxe + 1) * doubles * reg u — Un montant par entraxe + 1, × 1,05 ; soit ≈ 1,75 ml/m² à 0,60 (Pladur). | désaccord : SNIP et Placo comptent 2,10 ml/m² : ils incluent montants de départ, d'about et d'huisserie. À trancher par un plaquiste.
36. [contradiction] /plaquiste-isolation[doublage-colle].map_par_m2 = 1.8 kg/m2 — 1,8 kg/m² (10 plots de 10 cm) : Siniat Prégycolle 120 (01/09/2026) et Placo brochure doublage 2017. | désaccord : La fiche produit Placo MAP Formule + (28/05/2025) dit 2 à 3 kg/m² « minimum », Pladur 2,5 : selon la planéité du mur. À trancher par un plaquiste.
37. [contradiction] /plaquiste-isolation[doublage-colle].enduit_pate_par_m2 = 0.47 kg/m2 — 0,47 kg/m² de parement : Intégrale Placo 2023 et brochure 2017 × 1 face(s). | désaccord : La fiche Placomix Pro dit 0,525 kg/m², Siniat Prégy S 0,45 : selon le produit (recherche/05 B.2).
38. [contradiction] /plaquiste-isolation[doublage-colle][map] = surface * regle.map_par_m2 kg — Ratio Siniat / Placo système. | désaccord : Fiche produit MAP : 2 à 3 kg/m².
39. [contradiction] /plaquiste-isolation[doublage-fourrures].vis_par_m2 = 15 u/m2 — 15 vis/m² (SNIP fiche 18, vis de rive comprises). | désaccord : Placo (ancien) 11 ; Pladur 26 à 2,50 m. À trancher.
40. [contradiction] /plaquiste-isolation[doublage-fourrures].derived[nb_fourrures] = arrondi_sup((longueur_mur / regle.entraxe + 1) * regle.chute u — Une fourrure par 0,60 m + 1, × 1,05 (≈ 1,75 ml/m², Pladur). | désaccord : Placo et SNIP comptent 2,0 à 2,5 ml/m² (fourrure horizontale de départ ou de fixation des appuis).
41. [contradiction] /plaquiste-isolation[doublage-fourrures][fourrures] = nb_fourrures * si(hauteur <= regle.longueur_fourrure, regle. ml — Une fourrure entière par file (hauteur ≤ 3 m). | désaccord : Placo / SNIP : 2,0 à 2,5 ml/m².
42. [contradiction] /plaquiste-isolation[doublage-fourrures][appuis] = nb_fourrures * lignes_appuis u — Un appui par fourrure et par ligne (≈ 0,8/m² à 2,50 m, SNIP 0,80). | désaccord : Placo (ancien) compte 2 appuis/m², Pladur 1.
43. [contradiction] /plaquiste-isolation[doublage-fourrures][vis-ttpc-25] = surface * regle.vis_par_m2 u — SNIP 15/m². | désaccord : Placo 11, Pladur 26.
44. [contradiction] /plaquiste-isolation[contre-cloison-montants].vis_s60 = 15 u/m2 — 15 vis/m² (SNIP fiche 18). | désaccord : Placo ancien 11 ; Pladur 26.
45. [contradiction] /plaquiste-isolation[contre-cloison-montants][montants] = arrondi_sup((longueur_mur / entraxe + 1) * doubles * regle.c u — Un montant par entraxe + 1, × 1,05. | désaccord : SNIP compte 2,10 ml/m² (montants de départ compris).
46. [contradiction] /plaquiste-isolation[plafond-fourrures].fourrures_e60 = 1.79 ml/m2 — 1,79 ml/m² à 0,60 : SNIP fiche 18 (2024) et Placo « solution plancher bois ». | désaccord : L'Intégrale Placo 2023 compte 2,0 ml/m² ; Pladur 1,75.
47. [contradiction] /plaquiste-isolation[plafond-fourrures].suspentes_e60 = 1.8 u/m2 — 1,8 suspente/m² à 0,60 : Placo Intégrale 2023 ; retenu par défaut car il compte les suspentes de bout de fourrure des petites pièces (recherche/02b). | désaccord : SNIP fiche 18 : 1,56 (plafond de 8 × 10 m) ; Pladur 1,46. L'écart dépend de la taille de la pièce.
48. [contradiction] /plaquiste-isolation[plafond-fourrures].suspentes_e50 = 2.2 u/m2 — 2,2 (Placo 2023). | désaccord : SNIP 1,84 ; Pladur 1,75.
49. [contradiction] /plaquiste-isolation[plafond-fourrures].vis_e60 = 12 u/m2 — 12 vis/m² à 0,60 (SNIP). | désaccord : Placo 2023 : 10 ; Pladur : 8.
50. [contradiction] /plaquiste-isolation[plafond-fourrures].vis_e50 = 14 u/m2 — 14 (SNIP). | désaccord : Placo 12.
51. [contradiction] /plaquiste-isolation[plafond-fourrures].vis_int = 8 u/m2 — 1re peau : 8 vis/m² (SNIP, 0,60). | désaccord : Placo : 3 à 5 selon l'entraxe.
52. [contradiction] /plaquiste-isolation[plafond-fourrures].derived[nb_suspentes] = arrondi_sup(surface * si(entraxe_fourrures >= regle.e60, reg u — Ratio Placo 2023. | désaccord : SNIP 1,56 à 0,60.
53. [contradiction] /plaquiste-isolation[isolation-rouleaux].chute = 1.05 u — 1,05 m² par m² (Placo et Pladur en cloison et doublage). | désaccord : Aucune valeur fabricant pour les combles ; entre montants ou chevrons à 60 cm la chute est presque nulle, en rampants biais elle est plus forte.
54. [contradiction] /plaquiste-isolation[isolation-rouleaux][isolant] = surface * couches_isolant * regle.chute m2 — Surface × couches × 1,05. | désaccord : Chute non publiée pour les combles.
55. [à confirmer] .products[ibr-200].sellingUnits[colis].contains = 5.4 m2 — 5,40 m² : Tessella seul ; à confirmer sur la fiche Isover 2026.
56. [à confirmer] .products[cheville-metal-6x40].sellingUnits[boite].contains = 100 u — Boîte de 100 : conditionnement non relevé ; le principe (cheville métallique Ø 6 sous dalle béton) est Placo Intégrale 2023 et Knauf (clou-cheville 6 × 40).
57. [à confirmer] /plaquiste-isolation[cloison-distributive][fixations-clous] = arrondi_sup(longueur_cloison * regle.rails_par_cloison * reg u — Pas de 60 cm confirmé (Siniat, Placo) ; la fixation en bout de chaque rail n'est chiffrée par aucune source lue.
58. [à confirmer] /plaquiste-isolation[cloison-distributive][fixations-chevilles] = arrondi_sup(longueur_cloison * regle.rails_par_cloison * reg u — Idem fixations au cloueur.
59. [à confirmer] /plaquiste-isolation[cloison-separative].files_montants = 2 u — Aucun quantitatif fabricant SAA / SAD lu : déduit de la constitution (Placo SAA 120 / SAD 160, Siniat S180) et des ratios de la 98/48.
60. [à confirmer] /plaquiste-isolation[cloison-separative][fixations-clous] = arrondi_sup(longueur_cloison * 2 * files_rails * regle.chute u — Pas de 60 cm confirmé (Siniat, Placo Intégrale 2023) ; la fixation en bout de rail et celle des appuis ne sont chiffrées par aucune source lue.
61. [à confirmer] /plaquiste-isolation[plafond-fourrures].trpf_par_m2 = 4 u/m2 — 4 TRPF/m² (SNIP : suspente-fourrure) ; inutile si les suspentes sont clipsées (Stil F 530) : à confirmer.
62. [à confirmer] /plaquiste-isolation[plafond-fourrures].chute_corniere = 1.05 u — 5 % de coupes d'angle sur la cornière : aucune source chiffrée.
63. [à confirmer] /plaquiste-isolation[plafond-fourrures].tables.perimetre = table ml/m2 — Estimation : pièce supposée carrée (périmètre = 4 × √surface). Ni SNIP (0,47 ml/m² pour 8 × 10 m) ni Placo (« selon chantier ») ne donnent mieux : à remplacer p
64. [à confirmer] /plaquiste-isolation[plafond-fourrures][corniere] = surface * table.perimetre * regle.chute_corniere ml — Périmètre estimé (pièce carrée).
65. [à confirmer] /plaquiste-isolation[plafond-fourrures][vis-trpf] = surface * regle.trpf_par_m2 u — SNIP ; inutile avec des suspentes clipsées.
66. [à confirmer] /plaquiste-isolation[pare-vapeur].majoration_adhesif = 1.3 u — Joints entre lés + raccords en rive : aucun ratio fabricant ; 30 % pour les rives, à confirmer.
67. [à confirmer] /plaquiste-isolation[pare-vapeur][adhesif] = surface / regle.largeur_utile * regle.majoration_adhesif ml — Joints tous les 1,40 m + rives.