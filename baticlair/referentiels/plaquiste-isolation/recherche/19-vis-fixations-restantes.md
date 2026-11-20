# 19. Vis et fixations restantes (sixième vague, 20 novembre 2026)

Mission : confirmer par une 2e source indépendante (dont un fabricant ou un DTU) cinq chiffres encore à 1 source
(FICHE.md §15, points 3, 5, 6, 9, 10). Rien n'est inventé : sans 2e source, le chiffre reste « à confirmer ».
Documents déjà téléchargés relus avec `python3 -I` / grep (données seulement). Recherches web : compteur en fin de fichier.

Sections écrites au fur et à mesure ; bilan et sources en fin de fichier.

## 1. Vis TTPC 25 d'un doublage ou d'une contre-cloison sur ossature Knauf (BA13 simple, entraxe 0,60)

| Donnée | Valeur | Unité | Source (URL, date du document, consultation) | Statut | Note |
|---|---|---|---|---|---|
| Vis TTPC, doublage Placo (fourrures F530 + appuis) | 11 | u/m² | Placo, L'Intégrale 2021-2022 « Doublage Placostil avec appui sur fourrures Stil F 530 », https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/L%27Int%C3%A9grale%20Placo%202021-2022-%20Doublage%20Placostil%C2%AE%20avec%20appui%20sur%20fourrures%20Stil%C2%AE%20F%20530.pdf (2021, extrait moteur revu le 20/11/2026) | valeur de marque Placo (déjà en `16` n° 18) | Rien de neuf. |
| Vis TTPC, doublage Siniat | 12 | u/m² | Siniat fiche Clipstar (`16` n° 19) | valeur de marque Siniat | Rien de neuf. |
| Vis TTPC, doublage sans marque | 15 | u/m² | SNIP fiche 18, déc. 2024, p. 10 (`13` D1) | 1 source (repli syndicat) | Rien de neuf. |
| Vis TTPC, doublage **Knauf** | aucune valeur publiée trouvée | — | 1) Catalogue Knauf « Plaquiste/Plafiste 2020 » (déjà téléchargé, `cf/kn/k3.txt`, 7 646 lignes relues par grep) : chaque système renvoie à « Quantitatif estimatif : voir p. 500 », page absente de l'extrait ; 2) knauf.com, fiches produit vis TTPC (https://knauf.com/fr-FR/p/produit/vis-ttpc-tete-trompette-pointe-clou-10818_4091, consultée 20/11/2026) : conditionnement seulement, aucune consommation ; 3) Chausson, document Knauf « Polyplac » (https://www.chausson.fr/media/article-document/214725, Knauf, non daté (RT 2012), consulté 20/11/2026) : complexes collés, aucune vis ; 4) deux recherches moteur ciblées (« Knauf doublage fourrures vis TTPC par m² », « Plaquiste/Plafiste quantitatifs estimatifs ») : aucun tableau de quantités Knauf | **à confirmer (aucune source Knauf chiffrée accessible)** | Indice relevé dans le même catalogue Knauf 2020 (`cf/kn/k3.txt`, l. 3507-3509) : la mise en œuvre Knauf « relève des Règles de l'Art traditionnelles décrites dans le DTU 25.41 révisé », Knauf ne précisant un entraxe de vissage propre (250 mm) que pour ses systèmes particuliers (plaques larges 600 mm, KS 25, EI 180). Autrement dit, Knauf visse comme le DTU : il n'existe pas de règle de vissage « Knauf » différente qui justifierait un autre nombre que celui calculé selon le DTU. |

**Valeur retenue (moteur)** : `vis_ttpc25_doublage_knauf = 15 u/m²` (repli SNIP, décision du fondateur), inchangé.

**État** : à confirmer. Aucune 2e source ; pas de valeur Knauf publiée en ligne (page « Quantitatifs estimatifs » du catalogue introuvable, knauf.com en 403, aucune FDES système Knauf sur INIES, cf. `16` n° 20).

**Ce qui reste incertain** : la valeur que Knauf publie dans ses « Quantitatifs estimatifs » (catalogue Plaquiste/Plafiste, p. 500). Comme Knauf renvoie au DTU 25.41 pour le vissage, le 15 du SNIP (vis de rive comprises, jamais à court) est le repli le plus prudent ; il peut dépasser la valeur Knauf de 3 à 4 vis/m² (écart Placo 11 / SNIP 15, mêmes règles DTU). Piste : demander la page 500 au comptoir d'un négoce Knauf, ou au support technique Knauf.

## 2. Cloison séparative SAA / SAD, 1re peau (plaque intérieure) : vis par m²

| Donnée | Valeur | Unité | Source (URL, date du document, consultation) | Statut | Note |
|---|---|---|---|---|---|
| Vis TTPC 1re peau, séparative 2 × BA13, montants simples 0,60 / 0,40 ; doublés 0,60 / 0,40 | 12 / 16 ; 15 / 21 | u/m² de cloison (2 faces) | [S1] SNIP fiche conseil n° 18 « Quantitatifs estimés », décembre 2024, p. 6-7 (`snip/snip18.txt`, déjà téléchargé ; les quatre tableaux SAD double rail, SAA rail unique, double cornière, rail unique / cornière : mêmes chiffres) | 1 source chiffrée | Hypothèse SNIP p. 3 : « la peau intérieure est celle qui est fixée directement sur l'ossature » ; p. 13 (plafonds) : « L'écartement des vis est de 60 cm pour la peau intérieure ». |
| Règle : plaques internes (1re peau) vissées à 60 cm | 0,60 | m | [S2] Chausson, « Le Guide ABC de la construction » 2019-2020 / 2020-2021, fiche n° 63 Cloisons et n° 61 Contre-cloisons (`v3/abc.txt` l. 2921-2925 et 2033-2035 : « Dans le cas de parement double : décaler les joints, visser les plaques internes à entraxe 60 cm »), https://media.chausson.fr/catalogues/Guide-ABC-Construction-2020-2021-Chausson-Materiaux-ppi.pdf (fichier daté 27/11/2019) | **règle : 2 sources (SNIP + négoce Chausson)** | Chausson est un négoce, indépendant du SNIP. |
| Règle fabricant pour la 1re peau d'un parement double | 0,50 sur montants (0,25 sur rails) | m | [S3] Knauf, catalogue « Plaquiste/Plafiste 2020 », p. 77, cloisons KS 25 EI 180 (`cf/kn/k3.txt` l. 2686-2689) : « Entraxe de vissage de la 1re peau du parement double : 500 mm sur les montants et 250 mm sur les rails ; entraxe de vissage de la 2e peau : 250 mm » | 1 source fabricant (cas feu particulier) | Confirme le principe (1re peau vissée large), pas le pas courant de 0,60 : système feu EI 180, plus serré. |
| Calcul de la règle (1re peau à 0,60 sur chaque montant, bords de plaque compris, plaques 1,20 m, H 2,50 m, sans vis en rail) | 12 (simples 0,60) ; 16 (simples 0,40) | u/m² (2 faces) | calcul : par face et par plaque de 1,20 × 2,50 = 3 m² : 3 files de vis (0 ; 0,60 ; 1,20) × 6 vis (⌈2,50 / 0,60⌉ + 1) = 18 vis → 6/m² → **12** pour 2 faces ; à 0,40 : 4 files × 6 = 24 → 8/m² → **16** ; 98/48 (H 3 m) : 3 × 6 / 3,6 = 5 → **10** (SNIP 10) | calcul reproduit | Le calcul redonne exactement les quatre chiffres SNIP (12, 16, et 10 / 14 du 98/48) : la valeur 12 n'est pas une habitude, c'est la règle « 60 cm » appliquée sans chute. |
| Placo (méthode Placo) | ≈ 3 par face (doublage double parement) ; FDES SAA 120 : masse de vis compatible avec très peu de vis en 1re peau | u/m² | [S4] Placo, « Doublages Placostil sur montants », tableau « Quantités indicatives pour 1 m² d'ouvrage » : TTPC 25/35 « 3 » en 1re peau du double parement (extrait moteur, 20/11/2026) ; [S5] FDES Placo 38669 « Cloison séparative Placostil SAA 120 » (INIES n° 20240638669, 19/06/2024) : TTPC 25/35 = 0,04 kg pour les 4 plaques (`16` n° 11) | contradiction expliquée | Placo vise sa 1re peau encore plus large (ou ne compte que les vis de maintien) : 3/face → 6 pour 2 faces. Même écart Placo / SNIP que pour la 98/48 (`16` n° 8). |

**Valeur retenue (moteur)** : `vis_ttpc25_1re_peau_separative = 12 u/m²` (simples 0,60), 16 (simples 0,40), 15 (doublés 0,60), 21 (doublés 0,40) ; vis de 2e peau inchangées (30 / 37 / 35 / 47, TTPC 35).

**État** : **règle confirmée par 2 sources (SNIP, Chausson) + calcul reproduit** ; le chiffre lui-même n'est publié que par le SNIP. Les fiches Siniat (Prégymétal S180, https://siniat.fr/-/print2pdf/system/pi79436/…, 25/09/2026, lue) et Placo (fiches système SAA sp00011592 : 403) ne donnent aucun nombre de vis.

**Ce qui reste incertain** : la façon dont un plaquiste visse vraiment sa 1re peau (Placo publie 3 par face, la règle à 60 cm donne 6 par face). 12 couvre le cas le plus exigeant des deux : jamais à court, au pire une demi-boîte de trop.

## 3. Plafond BA13 sur fourrures à 0,40 m : vis et fourrures par m²

| Donnée | Valeur | Unité | Source (URL, date du document, consultation) | Statut | Note |
|---|---|---|---|---|---|
| Fourrures, entraxe 0,40 | 3,0 | ml/m² | [P1] Placo, L'Intégrale Second Œuvre 04/2023, Plafonds (SO03), tableau quantitatif, https://dam.pim-cps.saint-gobain.com/MAM/assets/1/C1A269993195482DA567890D5C26E716/doc/CEDB5A77BEAE4BDA8E2753C0A9B3A813/SO03-Intgrale_Placo_Second_Oeuvre_04.2023_-_Plafonds.pdf (04/2023) ; [P2] Placo, fiche technique fourrure Stil F 530 (même tableau « 3 / 2,2 / 2 », 0,40 / 0,50 / 0,60), https://entrepot-du-bricolage.fr/mediaw/pdf/fiche_technique_fourrure-stil-f530-3-m-45x18-mm-placo-.pdf (extrait moteur, 20/11/2026) | **1 source (Placo, deux documents du même éditeur)** | Pas une 2e source indépendante. |
| Fourrures 0,60 / 0,50 (autres éditeurs) | 1,79 / 2,10 (SNIP) ; 2,20 à 0,50 (Chausson) | ml/m² | [S1] SNIP fiche 18, déc. 2024, p. 14 ; [S2] Chausson Guide ABC 2020-21, fiche n° 55 (`v3/abc.txt` l. 236-256) | — | SNIP et Chausson ne publient **pas** l'entraxe 0,40 (SNIP p. 13 : « Les entraxes des fourrures et ossatures sont de 50 cm ou de 60 cm »). |
| Fourrures 0,40, calcul de la méthode SNIP | 1 / 0,40 × 1,05 = 2,63 (+ abouts ≈ 2,7) | ml/m² | calcul : SNIP 0,50 = 2,10 = 1 / 0,50 × 1,05 ; 0,60 = 1,79 ≈ 1 / 0,60 × 1,05 + abouts | calcul | Placo 3,0 = 2,63 arrondi au-dessus avec marge (son 2,2 à 0,50 est aussi au-dessus de 2,10). |
| Vis TTPC 25, plafond 1 BA13 à 0,40 | 15 | u/m² | [P1] Placo Intégrale 04/2023 (10 à 0,60 ; 15 à 0,40) | 1 source | — |
| Vis à 0,40, extrapolation SNIP | ≈ 17 à 18 | u/m² | calcul : SNIP 12 (0,60) et 14 (0,50) ; × 0,60 / 0,40 → 18 ; × 0,50 / 0,40 → 17,5 | calcul (pas une source) | Même logique que Placo (10 × 1,5 = 15) : le nombre de vis suit le nombre de fourrures. |
| Isover, guide DTU 25.41 | entraxe 0,40 admis (BA13, suspentes à 1,20 m) | — | https://www.isover.fr/documents/brochure-systeme/dg-dtu2541-1411.pdf (extrait moteur, 20/11/2026) | contexte | Isover est du groupe Saint-Gobain comme Placo : pas indépendant. Ne donne ni vis ni ml. |

**Valeur retenue (moteur)** :
- `fourrures_plafond_0_40 = 3,0 ml/m²` (Placo, arrondi au-dessus, jamais à court) ;
- `vis_ttpc25_plafond_0_40 = 15 u/m²` (Placo) — ou 18 si l'on veut rester cohérent avec le 12 SNIP retenu à 0,60 (voir incertitude).

**État** : **1 source (Placo) pour les deux chiffres**, cohérents avec la méthode SNIP recalculée ; à confirmer (aucun autre éditeur ne publie l'entraxe 0,40 : SNIP et Chausson s'arrêtent à 0,50).

**Ce qui reste incertain** : le moteur retient 12 vis à 0,60 (SNIP, vis de rive comprises) mais 15 à 0,40 (Placo, sans vis de rive) : les deux chiffres ne viennent pas de la même méthode. Proposition à trancher par le fondateur : à 0,40, prendre **18** (12 × 0,60 / 0,40, méthode SNIP cohérente avec la valeur à 0,60) plutôt que 15. Calcul, pas une source : à dire comme tel.

## 4. Fixation des rails : une fixation de plus en bout de rail ?

| Donnée | Valeur | Unité | Source (URL, date du document, consultation) | Statut | Note |
|---|---|---|---|---|---|
| Pas des fixations de rail (sol, plafond) | 0,60 maxi | m | [R1] Placo, Mise en œuvre B01 « Cloisons sur ossature métallique Placostil », juin 2008 (`r18/gp.txt` l. 314-315, 353, 376-377, 1310-1311 : « Les rails sont fixés au sol mécaniquement tous les 0,60 m maxi ») ; [R2] Placo, déclaration / fiche montant Stil M70 (https://entrepot-du-bricolage.fr/mediaw/pdf/declaration_performance_montant-stil-m70-2-59-m-70-x-41-mm-placo.pdf, extrait moteur 20/11/2026 : « Les rails sont fixés au sol mécaniquement au pas de 60 cm ») ; [R3] Pladur, Guide de mise en œuvre, éd. 2017-2018 (`d12b/gmo.txt` l. 1185, 1199, 1518 : « fixer le rail bas tous les 50 à 60 cm ») ; [R4] Chausson Guide ABC 2020-21 fiche 63 (« Fixer les rails au sol : mécaniquement ou par collage tous les 50 à 60 cm ») ; [R5] forum citant NF DTU 25.41 § 6.3.4.1.2 « tous les 0,60 m maximum » (non vérifié sur le texte AFNOR) | **confirmé (Placo + Pladur + Chausson)** | Déjà retenu. Le Placo 2008 est ancien : la même règle est redite par la fiche Placo actuelle [R2] et par Pladur 2017-2018, donc inchangée. |
| Pas en performance feu (Knauf) | 0,30 | m | [R6] Knauf, fiche système « Knauf Métal CC Oversize » (`cf/kn/k4.txt` l. 125, 192 : « Entraxe des fixations des rails ramené à 300 mm en cas de performance feu ») | 1 source (cas feu) | À garder pour les ouvrages coupe-feu Knauf si un jour on les chiffre. |
| Fixation en bout de rail (à 5-10 cm de l'extrémité) | « à 10 cm de chaque bord » | — | [R7] Castorama, « Comment monter une ossature de cloison » (https://www.castorama.fr/idees-et-conseils/comment-monter-une-ossature-de-cloison/CF_CPRD_npcart_100284.art, extrait moteur 20/11/2026 : « une vis tous les 60 cm et à 10 cm de chaque bord » ; au sol : « percer à 10 cm du bord et tous les 60 cm ») | **1 source grand public ; aucune source fabricant ni DTU** | Placo B01, Pladur 2017-2018, Chausson, SNIP fiche 18 : aucun ne parle de l'extrémité du rail. Le seul « 5 cm » trouvé dans les guides (Pladur, d'après NF DTU 25.41-1-1 art. 6.4.10 : « Fixations du rail à plus de 5 cm du bord », `cf/txt/pdf_mem.pdf.txt` l. 14869-14873 ; et l. 3455 « à au moins 5 cm du bord de dalle ») vise le **bord de la dalle** (cloison en bord de trémie), pas le bout du rail. |

**Lecture des sources** : aucune ne demande une fixation « en plus » du pas. Elles disent seulement « pas de 0,60 m au plus ». Or une ligne de rail de longueur L, fixée à ses deux bouts (ou à 10 cm de chaque bout) avec un pas d'au plus 0,60 m, demande mécaniquement ⌈L / 0,60⌉ + 1 fixations (la « règle du piquet de clôture »). Le « + 1 » n'est donc pas une fixation supplémentaire : c'est la conséquence arithmétique du pas maximum appliqué de bout en bout.

**Valeur retenue (moteur)** : `fixations_rail = ⌈L_rail / 0,60⌉ + 1` **par ligne de rail** (par file : bas, haut ; par face d'ossature pour une SAD à double rail), arrondi au-dessus ; puis la chute de 5 % déjà appliquée par le moteur. Exemple : cloison de 4 m, rail bas : ⌈4 / 0,60⌉ + 1 = 8 fixations (au lieu de 7 sans le + 1).
- Compter **par ligne de rail**, pas par barre de 3 m : les sources ne disent rien des aboutages de rails, et compter par barre ajouterait une fixation à chaque raccord sans source.
- Montants de départ (contre un mur) : même règle, « tous les 0,60 m maxi » (Placo B01 l. 395-396, Pladur l. 1518) : ⌈H / 0,60⌉ + 1 par montant de départ. Le SNIP ne les compte pas (partie courante).

**État** : pas de 0,60 confirmé (3 sources) ; « + 1 par ligne » = calcul déduit de ce pas, **à confirmer** comme habitude de chantier (seul Castorama l'écrit, au sens « à 10 cm de chaque bout »).

**Ce qui reste incertain** : le texte exact du NF DTU 25.41 (février 2022) sur ce point n'a pas été lu (norme payante, AFNOR) ; la citation de forum (« § 6.3.4.1.2 ») n'est pas vérifiée. Écart en jeu : une fixation par ligne de rail (2 pour une cloison de 4 m, sur environ 16), sans effet sur la commande dès qu'on vend les chevilles par boîte de 50 ou 100.

## 5. Adhésif de membrane pare-vapeur : ml de ruban par m² de membrane

| Donnée | Valeur | Unité | Source (URL, date du document, consultation) | Statut | Note |
|---|---|---|---|---|---|
| Vario Fast Tape / Vario Multitape | 0,8 (Fast Tape) ; 0,8 à 1,4 « suivant les points singuliers » (Multitape) | ml/m² | [M1] Isover, « Documentation membranes, gestion de la vapeur d'eau et étanchéité à l'air », https://www.isover.fr/documents/array/documentation-membranes-gestion-de-la-vapeur-deau-et-ea.pdf (extrait moteur relu le 20/11/2026 : « Quantitatif : 0.8 m / m² » et « 0.8 m à 1.4 m / m² suivant les points singuliers » ; « 2 m par mètre de mur en pose haut et bas » pour la jonction) | 1 fabricant | Valeur écrite telle quelle. |
| Adhésif de jointoiement Vario KB1 dans un **système** posé (FDES vérifiées) | 0,35 à 0,75 (lés seuls) ; 0,8 à 1,1 (Isocoton, avec Xtra Band en plus) | ml/m² | [M2] FDES INIES, API `https://www.base-inies.fr/api/Produit/<id>` (consultée 20/11/2026) : 39850 « Optima Murs avec membrane, GR 32 120 mm, BA 13 » (24/01/2025) KB1 0,009 kg/m² ; 50168 « Optima Murs avec membrane, Flex 55, BA 18S » (31/03/2026) 0,01 kg/m² ; 53321 « Vario Confort, combles aménagés, entraxe 0,6 m » (28/08/2026) 0,014 kg/m² ; 39665 « Optima Murs avec membrane, Isocoton 100 mm » (26/07/2024) 0,021 kg/m² + Vario Xtra Band 0,028 kg/m². Conversion par la FDES du produit 37214 « Adhésif Vario KB1 » (24/01/2025) : UF = « un mètre linéaire de jointoiement des lés », bande 0,0186 kg/ml + film protecteur 0,0072 kg/ml (0,0186 à 0,0258 kg/ml) | **même groupe que [M1] (Saint-Gobain Isover / Placo) : cohérent, pas indépendant** | Dans ces systèmes, la **périphérie est faite au mastic** (Mastic Vario DoubleFit, 0,04 à 0,06 kg/m²), l'adhésif ne sert qu'aux lés et aux percements : d'où 0,35 à 0,75. Membrane Vario Xtra : 0,097 kg/m² de paroi pour 0,08 kg/m² de film (FDES 33579, 24/01/2025) ≈ 1,2 m² de membrane par m² de paroi (recouvrements et chutes). |
| Plancher négoce | 0,65 | ml/m² | [M3] Chausson Guide ABC 2020-21, fiche combles aménagés : « Adhésif 0,65 ml » par m² (`13` G3) | négoce indépendant | Reprend le bas de la fourchette Isover. |
| Pro Clima (Intello + Tescon Vana), Siga (Majrex + Sicrall), Knauf Insulation (LDS), Ursa (Seco) | aucun quantitatif publié trouvé | — | [M4] pro clima, brochure « Système INTELLO » (https://fr.proclima.com/media-download/94/pro%20clima%20systeme%20INTELLO.pdf, lue en entier, 20/11/2026) : rouleaux 1,50 m × 20 ou 50 m, aucune consommation de ruban ; [M5] Siga : notices de pose (siga.swiss), rouleaux Sicrall 60 mm, aucune consommation (extraits moteur, 20/11/2026) ; [M6] Knauf LDS 2 Silk (knauf.com/fr-CH), Ursa : rien | — | Ces fabricants disent « coller tous les recouvrements, raccords et traversées » sans chiffrer : la quantité découle du linéaire de joints. |
| Calcul géométrique des joints entre lés | 1 / (1,50 − 0,10) = 0,71 | ml/m² | calcul (`13` G3) : lé de 1,50 m (Isover, pro clima : rouleaux de 1,50 m de large [M4]), recouvrement de 10 cm | calcul | 0,71 pour les seuls joints entre lés ; la périphérie et les percements viennent en plus, sauf si elle est faite au mastic. |

**Valeur retenue (moteur)** : `adhesif_membrane = 0,8 ml/m² de membrane` (la valeur Isover écrite telle quelle), arrondi au rouleau (20 à 40 m selon la marque).

**État** : **1 fabricant (Isover) + 1 négoce (Chausson, plancher 0,65) + calcul (0,71) + FDES Isover du même groupe (0,35 à 0,75 pour les lés seuls)**. Les chiffres concordent entre 0,65 et 0,8 pour les joints courants ; aucun 2e fabricant indépendant ne publie de quantitatif (pro clima, Siga, Knauf Insulation, Ursa : rien trouvé). À confirmer au sens strict des consignes.

**Ce qui reste incertain** :
- la périphérie : 0,8 suppose qu'elle est collée au mastic (comme dans les systèmes Isover) ou qu'elle est courte (grande pièce) ; si l'artisan colle aussi la périphérie au ruban, la valeur monte vers 1,4 (haut de fourchette Isover) ;
- ne pas compter deux fois : si la fiche sort déjà un mastic de périphérie, garder 0,8 ; sinon, ligne orange « à vérifier » avec la fourchette 0,8-1,4.

## Bilan

Chiffres examinés : 5 sujets, 9 valeurs.

| Point | Valeur retenue | État |
|---|---|---|
| 1. Vis doublage Knauf | 15 u/m² (repli SNIP) | à confirmer : aucune valeur Knauf publiée accessible (Knauf renvoie au DTU 25.41 pour le vissage) |
| 2. Séparative, 1re peau | 12 / 16 / 15 / 21 u/m² | règle « 1re peau à 60 cm » : 2 sources (SNIP, Chausson) ; chiffre SNIP seul, reproduit exactement par le calcul ; Placo vise plus large (3 par face) |
| 3. Plafond à 0,40 : fourrures / vis | 3,0 ml/m² / 15 u/m² (ou 18, méthode SNIP) | 1 source (Placo, deux documents) ; SNIP et Chausson ne publient pas 0,40 ; calcul cohérent (2,63 ml) |
| 4. Fixation en bout de rail | ⌈L / 0,60⌉ + 1 par ligne de rail | pas de 0,60 : 3 sources ; « + 1 » = arithmétique du pas maxi, écrit seulement par Castorama ; aucun fabricant ni DTU lu ne demande une fixation en plus |
| 5. Adhésif de membrane | 0,8 ml/m² | 1 fabricant (Isover) + négoce (0,65) + calcul (0,71) + FDES du même groupe ; aucun 2e fabricant indépendant |

Confirmés à deux sources indépendantes : le pas de 0,60 m des rails (Placo, Pladur, Chausson) et la règle de vissage de la 1re peau (SNIP, Chausson).
Toujours « à confirmer » : vis Knauf ; 1re peau séparative (le chiffre lui-même) ; plafond à 0,40 (vis et fourrures) ; « + 1 » en bout de rail ; adhésif de membrane (2e fabricant).

Proposition au fondateur (à trancher, pas appliquée ici) : plafond à 0,40, prendre 18 vis au lieu de 15 pour rester dans la même méthode que le 12 retenu à 0,60.

Où j'en suis : 13 recherches web, 6 lectures web (dont 3 PDF lus en entier), 5 FDES INIES téléchargées par l'API. Rien d'autre à chercher sans le catalogue Knauf p. 500 ou le texte AFNOR du NF DTU 25.41.

## Sources

1. SNIP (Les industries du plâtre), Fiche conseil n° 18 « Ouvrages en plaques de plâtre : quantitatifs estimés de produits », décembre 2024 (déjà téléchargée, `snip/snip18.txt`), consultée 20/11/2026.
2. Chausson Matériaux, « Le Guide ABC de la construction » 2020-2021, https://media.chausson.fr/catalogues/Guide-ABC-Construction-2020-2021-Chausson-Materiaux-ppi.pdf (fichier du 27/11/2019 ; `v3/abc.txt`), consulté 20/11/2026.
3. Knauf, catalogue « Plaquiste/Plafiste 2020 » (`cf/kn/k3.txt`), 2020, consulté 20/11/2026.
4. Knauf, fiche système « Knauf Métal CC Oversize » (`cf/kn/k4.txt`), non datée, consultée 20/11/2026.
5. Knauf, fiche produit vis TTPC, https://knauf.com/fr-FR/p/produit/vis-ttpc-tete-trompette-pointe-clou-10818_4091 (extrait moteur), consultée 20/11/2026.
6. Knauf, « Polyplac » (document Chausson), https://www.chausson.fr/media/article-document/214725, non daté (RT 2012), consulté 20/11/2026.
7. Placo, L'Intégrale 2021-2022 « Doublage Placostil avec appui sur fourrures Stil F 530 » et « Doublages Placostil sur montants » (extraits moteur, placo.fr 403), consultés 20/11/2026.
8. Placo, L'Intégrale Second Œuvre 04/2023 « Plafonds » (SO03), https://dam.pim-cps.saint-gobain.com/MAM/assets/1/C1A269993195482DA567890D5C26E716/doc/CEDB5A77BEAE4BDA8E2753C0A9B3A813/SO03-Intgrale_Placo_Second_Oeuvre_04.2023_-_Plafonds.pdf, 04/2023, consultée 20/11/2026 (extrait moteur).
9. Placo, fiche technique fourrure Stil F 530, https://entrepot-du-bricolage.fr/mediaw/pdf/fiche_technique_fourrure-stil-f530-3-m-45x18-mm-placo-.pdf (extrait moteur), consultée 20/11/2026.
10. Placo, Mise en œuvre B01 « Cloisons sur ossature métallique Placostil », juin 2008 (`r18/gp.txt`), consulté 20/11/2026.
11. Placo, déclaration de performance montant Stil M70, https://entrepot-du-bricolage.fr/mediaw/pdf/declaration_performance_montant-stil-m70-2-59-m-70-x-41-mm-placo.pdf (extrait moteur), consultée 20/11/2026.
12. Placo, FDES INIES 38669 « Cloison séparative Placostil SAA 120 », 19/06/2024 (`16` [Y4b]).
13. Siniat, fiche système « Cloison Prégymétal S180 EI60 60 dB M90-50 », https://siniat.fr/-/print2pdf/system/pi79436/siniat-fiche-technique/fr-fr/cloison-pregymetal-s180---ei60---60db---m90-50---isolant.pdf, 25/09/2026, lue le 20/11/2026 (aucun nombre de vis).
14. Pladur, « Guide de mise en œuvre » (éditions août 2017 et janvier 2018, `cf/txt/pdf_mem.pdf.txt`, `d12b/gmo.txt`), consultés 20/11/2026.
15. CAPEB, « Guide NF DTU 25.41, les principales nouveautés 2022 » (`pdf/capeb.txt`), 2022, consulté 20/11/2026.
16. Castorama, « Comment monter une ossature de cloison », https://www.castorama.fr/idees-et-conseils/comment-monter-une-ossature-de-cloison/CF_CPRD_npcart_100284.art (extrait moteur), consulté 20/11/2026.
17. Isover, « Documentation membranes, gestion de la vapeur d'eau et étanchéité à l'air », https://www.isover.fr/documents/array/documentation-membranes-gestion-de-la-vapeur-deau-et-ea.pdf (extrait moteur), consultée 20/11/2026.
18. Isover / Placo, FDES INIES 39850 (24/01/2025), 50168 (31/03/2026), 53321 (28/08/2026), 39665 (26/07/2024), 37214 « Adhésif Vario KB1 » (24/01/2025), 33579 « Membrane Vario Xtra » (24/01/2025), https://www.base-inies.fr/api/Produit/<id>, consultées 20/11/2026.
19. pro clima, brochure « Système INTELLO », https://fr.proclima.com/media-download/94/pro%20clima%20systeme%20INTELLO.pdf (métadonnées 2022), lue le 20/11/2026.
20. SIGA, notices de pose du frein-vapeur (siga.swiss) et rouleaux Sicrall (extraits moteur), consultés 20/11/2026.
21. Isover, « DG DTU 25.41 » (https://www.isover.fr/documents/brochure-systeme/dg-dtu2541-1411.pdf, extrait moteur), consulté 20/11/2026.
