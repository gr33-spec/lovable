# 07 — Troisième passe (recherche du 19-20/11/2026)

Objet : lever les « à confirmer » laissés par la 1re passe (fichiers 01 à 06), par ordre d'impact sur une commande.
Chaque ligne cite le fichier de 1re passe concerné et l'ancien statut. Méthode : WebFetch de fiches PDF fabricants hébergées
par des négoces, certificats ACERMI, fiches Siniat print2pdf ; recherches web limitées (quota partagé).

Colonnes : | Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe, ancien statut) |

## 1. Isolants PSE / XPS / PU / minces (04-isolants.md § A7, ancien statut : « à confirmer, aucune source lue »)

### 1.1 PSE sous chape : Knauf Therm Chape Th38 (le PSE « sol » courant chez le plaquiste-isolateur)

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe, ancien statut) |
|---|---|---|---|---|---|---|
| Format standard | **2500 × 1200 mm** (3,00 m²) ; sur demande 1500 × 1200 et 1200 × 500 | mm | [P1] fiche Knauf « Knauf Therm Chape Th38 sous chape hydraulique », MAJ 30/08/2017, hébergée Samse (lue 19/11/2026) | [P2] page produit knauf.com fr-FR (extrait moteur, fiche technique datée mai 2025) : « 1.200 mm, 2.500 mm » | confirmé (2 sources) | 04 §A7 « PSE sol : format 1200 × 600 ou 1200 × 1000 », à confirmer → **faux pour Knauf** : le PSE sol Knauf est en 2,50 × 1,20 |
| Épaisseurs | 20 à 200 mm (205 à 300 sous délai / quantité mini) | mm | [P1] | [P2] (« 20 mm … » ; gamme jusqu'à 200) | confirmé (2 sources) | |
| λ | 0,038 (Th38 = λ 38 mW) | W/(m·K) | [P1] (R = e/0,038 vérifié sur le tableau) | [P2] nom de gamme Th38 | confirmé (2 sources) | |
| R par épaisseur | 20 → 0,50 ; 30 → 0,75 ; 40 → 1,05 ; 50 → 1,30 ; 60 → 1,55 ; 70 → 1,80 ; 80 → 2,10 ; 90 → 2,35 ; 120 → 3,15 ; 140 → 3,65 ; 160 → 4,20 ; 180 → 4,70 ; 200 → 5,25 | m²·K/W | [P1] | [P2] 20 mm → 0,50 ; [P3] Mr Bricolage « Th38 ép. 4 cm 2,5 × 1,2 m R 1,05 » (titre, 19/11/2026) ; fiche 2021 citée par moteur (Chausson) : 100 mm → 2,60 | confirmé (2 sources) pour 20, 40, 100 ; 1 source + calcul (e/0,038 arrondi inférieur) pour les autres | ACERMI **03/007/172** ([P1] et [P2]) |
| Panneaux par paquet | **30 en 20 mm** (soit 90 m²) | pcs | [P2] | — | 1 source | autres épaisseurs : à confirmer (règle probable : hauteur de paquet constante ≈ 600 mm → 600/e panneaux ; **hypothèse**, ne pas coder) |
| Quantité d'isolant par m² traité | **1,05 m²/m²** | m²/m² | [P1] « Quantitatifs par m² de surface traitée » | — | 1 source (fabricant) | |
| Film polyéthylène 150 µm (chape fluide / hydraulique / mortier) | **2,30 m²/m²** | m²/m² | [P1] | — | 1 source (fabricant) | chiffre surprenant (relevés + recouvrements + 2 films ?) : à confirmer avant de coder |
| Bande périphérique Knauf Périmousse | rouleau 100 m ; largeurs 100/125/150/175 mm ; ép. 5 mm | — | [P1] | — | 1 source | ml = périmètre de la pièce + émergences |
| Classe de compressibilité | SC2 a2 (20-200 mm) ; SC2 a3 (205-300) | — | [P1] | — | 1 source | locaux < 500 kg/m², DTU 52.10 / 26.2 |
| Knauf Therm Mur Th38 (PSE nu pour doublage maçonnerie) | 1200 × 2500 ou 2600 mm, 20 à 120 mm, 30 pcs/paq en 20 mm ; existe en SE (ignifugé) | — | [P2b] page knauf.com « Knauf Therm Mur Th38 » (extrait moteur ; fiche mai 2025) | — | 1 source | **Knauf annonce l'arrêt des complexes de doublage PSE blanc Th38** (même extrait) : les Polyplac Th38 de [P4] (fiche 27/07/2020) ne sont plus à proposer → à signaler à 01-plaques.md |

### 1.2 XPS (polystyrène extrudé)

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe, ancien statut) |
|---|---|---|---|---|---|---|
| Styrodur 3035 CS : format | 1250 × 600 mm, chants **à feuillure**, surface lisse | mm | [P5] Batiproduits, fiche « Styrodur 3035 CS » distribué en France par **Placo** (19/11/2026) | [P6] ETA-19/0120 (DIBt), longueur nominale 1250 mm (extrait moteur) | confirmé (2 sources) | 04 §A7 « usuel 1250 × 600 à feuillure », à confirmer → confirmé |
| Styrodur 3035 CS : épaisseurs (France) | 30, 40, 50, 60, 80, 100, 120 | mm | [P5] | [P6] 50 à 200 mm (gamme allemande) | confirmé (2 sources) pour la plage | |
| Styrodur 3035 CS : panneaux par colis | **7 à 14** selon épaisseur | pcs | [P5] | — | 1 source | détail par épaisseur : à confirmer |
| Styrodur 3035 CS : ACERMI | 03/004/274 ; DTA CSTB ; Euroclasse E | — | [P5] | moteur (même n°) | 1 source | R par épaisseur : **à confirmer** (Batiproduits ne lie pas R et épaisseur ; fiche BASF hors réseau) |
| Styrodur : distribution | Isover Allemagne a cessé de distribuer Styrodur au 31/12/2024 | — | [P7] fiche isover.de (extrait moteur) | — | 1 source | en France, Placo le distribue (Batiproduits) : vérifier en négoce que la référence existe encore |
| Ravatherm XPS Plus 300 ST (ex-Styrofoam, Ravago) : format | **1250 × 600 mm**, bord droit, peau d'extrusion | mm | [P8] fiche Ravago hébergée Chausson (doc. 15/01/2020, lue 19/11/2026) | [P5]/[P6] même format chez BASF | 1 source pour ce produit | |
| Ravatherm XPS Plus 300 ST : λD | 0,029 | W/(m·K) | [P8] | — | 1 source | ACERMI 03/013/203 |
| Ravatherm XPS Plus 300 ST : R | 30 → 1,05 ; 40 → 1,40 ; 50 → 1,75 ; 60 → 2,10 ; 80 → 2,80 ; 100 → 3,50 ; 120 → 4,20 | m²·K/W | [P8] | calcul e/0,029 → 1,03 / 1,38 / 1,72 / 2,07 / 2,76 / 3,45 / 4,14 ; les R déclarés correspondent à λ ≈ 0,0286 (λ non arrondi) | 1 source + calcul (écart 1,5 %) : à confirmer sur le certificat ACERMI | ACERMI non relu ; dalles DTU 13.3, chapes DTU 52.10 (SC1a1Ch 40-100 mm) |
| URSA XPS | — | — | — | — | à confirmer (non recherché, quota) | |

### 1.3 Polyuréthane

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe, ancien statut) |
|---|---|---|---|---|---|---|
| Soprema Efigreen Alu+ / Duo+ : domaine | **toitures-terrasses** (support d'étanchéité), pas de doublage ni de sol intérieur | — | [P9] fiche Soprema INSFR005-1/d, hébergée Samse (lue 19/11/2026) | [P10] brochure gamme Efigreen (Matériaux Naturels) ; [P11] brochure Efigreen Duo+ (Chausson) | confirmé (2 sources) | 04 §A7 « Efigreen sol / doublage », à confirmer → **hors périmètre plaquiste : retirer du référentiel plaquiste** (relève de l'étanchéité) |
| Efigreen Alu+ : format, λ | 600 × 600 mm, bords droits ; λD 0,022 (40-160 mm), 0,023 (30-35 mm) ; R 1,80 à 7,30 ; ACERMI 15/006/1093 | — | [P9] | [P10] 600 × 600, λD 0,022, R 100 mm = 4,50 | confirmé (2 sources) | pour information du tiroir étanchéité |
| Efigreen Duo+ : R par épaisseur | 40 → 1,70 ; 50 → 2,15 ; 60 → 2,60 ; 80 → 3,45 ; 100 → 4,35 ; 120 → 5,20 ; 160 → 6,95 (λ 0,023, ACERMI 12/006/761) | m²·K/W | [P11] (édition RT 2012, ancienne) | [P10] (λ 0,022, 100 mm → 4,50 : **édition plus récente**) | contradiction (détail : λ passé de 0,023 à 0,022 entre les deux brochures ; prendre le certificat ACERMI en vigueur) | hors périmètre plaquiste |
| PU de doublage (complexes PU + plaque) | traités dans 01-plaques.md (Placo Placomur / Knauf Polyplac R-Thane) | — | — | — | renvoi | |
| PU nu de sol / mur (Recticel Eurothane, Knauf Thane) | — | — | — | — | à confirmer (non recherché : quota) | certificats ACERMI Recticel listés : Eurothane Mur (F), Powerwall (F)… ([P12] liste ACERMI, n° non associés sans ambiguïté) |

### 1.4 Isolants minces réfléchissants (statut)

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe, ancien statut) |
|---|---|---|---|---|---|---|
| Statut technique (assurance) | procédés « produit mince réfléchissant + lame(s) d'air » = **technique non traditionnelle mise en observation** par la C2P de l'AQC ; « leur performance propre d'isolation thermique est réduite du fait de leur faible épaisseur » ; la performance annoncée dépend de lames d'air non ventilées d'épaisseur constante ; risque vapeur | — | [P13] AQC, Communiqué C2P n° 62 (daté juillet 2005, toujours publié sur qualiteconstruction.com, dossier 2025/12 ; lu 19/11/2026) | [P14] fiche CEE BAR-EN-101 : les isolants réfléchissants sont évalués selon **NF EN ISO 22097** (pas selon NF EN 12667 comme les laines) | confirmé (2 sources) | 04 §A7 « usage en complément uniquement, ne pas afficher de R », à confirmer → confirmé dans l'esprit : **ne jamais afficher un R de mince comme équivalent à une laine** ; un procédé sous Avis Technique sans observation (Liste verte AQC) fait exception |
| Éligibilité aux aides | un réfléchissant n'est pas exclu des CEE, mais son R installé doit atteindre le seuil (7 / 6 / 3,7) mesuré selon NF EN ISO 22097 | — | [P14] BAR-EN-101 vA64-6 | [P15] BAR-EN-102 vA65-4 | confirmé (2 sources) | en pratique seuls des produits alvéolaires épais (ex. Actis Hybris) peuvent viser ces R : R par épaisseur de Hybris **non lu** (à confirmer sur son certificat ACERMI) |
| Actis **Hybris 31** (isolant alvéolaire réflecteur, gamme actuelle) : certification | λD **0,031** ; ACERMI **22/189/1575** ; DTA mur 20/15-349 (V5 publié le 03/06/2024), toiture 20/16-373 ; ETA-22/0237 | — | [P49] brochure Actis « Hybris 31 » (PDF du 28/03/2025, hébergée Union Matériaux, lue 19/11/2026) | [P50] brochure Actis « Hybris » (ancienne gamme, Chausson) : λD 0,033, ACERMI 15/189/1047, mêmes DTA | confirmé (2 sources) pour les DTA ; **Hybris (λ 33) remplacé par Hybris 31** : ne plus proposer l'ancien | Hybris n'est **pas** un « mince » : c'est un alvéolaire épais (50 à 250 mm) |
| Hybris 31 : RD intrinsèque par épaisseur | 50 → 1,60 ; 75 → 2,40 ; 90 → 2,90 ; 105 → 3,35 ; 125 → 4,00 ; 140 → 4,50 ; 155 → 5,00 ; 170 → 5,45 ; 185 → 5,95 ; 195 → 6,25 ; 205 → 6,60 ; 235 → 7,55 ; 250 → 8,05 | m²·K/W | [P49] | calcul e/0,031 : 105 → 3,39 ; 205 → 6,61 (cohérent, arrondi inférieur) | 1 source + calcul | **R « avec 1 lame d'air »** (mur : 105 → 4,00 ; combles : 105 → 3,80, valeurs ETA) **n'est acquis que si la lame d'air non ventilée de 20 mm est réalisée** : afficher le RD intrinsèque par défaut |
| Hybris 31 : formats et colis | mur : **1200 × 2700** ou **1200 × 2800 mm** (3,24 / 3,36 m² par panneau) ; toiture : 1200 × 1800 ou 2400 ; en **105 mm : 4 panneaux par colis** (13,44 m² en 2800) | — | [P49] | [P51] Entrepôt du Bricolage « Hybris 31 mur ép. 105 mm, 1,20 × 2,70 m, ballot de 4 panneaux » (titre de fiche, 19/11/2026) | confirmé (2 sources) pour 105 mm | colisage des autres épaisseurs : à confirmer |
| Actis Triso / Boost'R (minces multicouches) | — | — | — | — | à confirmer (non recherché ; quota) | relèvent du § C2P ci-dessus |
| Révision en cours | la « Règle produit n° 12 » ACERMI (produits réfléchissants) est en révision (rapport d'activité ACERMI 2024) | — | [P16] extrait moteur du rapport ACERMI 2024 | — | 1 source (extrait) | |

## 2. Membranes et adhésifs hors Isover (04-isolants.md § D)

Ancien statut (04 § D) : « Knauf LDS, Siga Majrex, Pro Clima Intello (Plus) : 1,50 × 50 m = 75 m² cités de mémoire, à confirmer (aucune source lue) » ; « adhésifs Siga Rissan, Tescon : à confirmer » ; « recouvrement 10 cm : à confirmer ».

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe, ancien statut) |
|---|---|---|---|---|---|---|
| Pro Clima **Intello Plus** : rouleaux | **1,5 × 50 m = 75 m²** (art. 10092, 9 kg) ; aussi 1,5 × 20 m = 30 m² (10093) ; 3 × 50 m = 150 m² (10076 / 12222) | m² | [P21] fiche technique pro clima Intello Plus, version 505932 du 27/01/2026 (hébergée Mister Matériaux, lue 19/11/2026) | — | 1 source (fabricant, à jour) | 04 §D, à confirmer → 75 m² **confirmé par le fabricant** ; 2e source négoce non lue |
| Pro Clima **Intello** : rouleaux | 1,5 × 50 m = 75 m² (10090, 7 kg) ; 1,5 × 20 m = 30 m² ; 3 × 50 m = 150 m² | m² | [P22] fiche pro clima Intello, version 505952 du 27/01/2026 (Mister Matériaux) | [P21] (même gamme de formats) | 1 source par produit | |
| Intello / Intello Plus : pose perpendiculaire | entraxe des porteurs ≤ 100 cm ; lattage transversal ≤ 50 cm côté intérieur pour reprendre le poids de l'isolant ; chevauchement collé renforcé par bandes d'adhésif perpendiculaires tous les ≈ 30 cm | cm | [P21] | [P22] | confirmé (2 sources, même fabricant) | ne crée pas de ligne de commande sauf lattage (si le devis le cite) |
| Siga **Majrex** : rouleau | **1,5 × 50 m = 75 m²** ; 150 g/m² ; 30 rouleaux par palette | m² | [P23] fiche produit SIGA Majrex, « actualisée le 11.05.2017 » (Hornbach CH, lue 19/11/2026) | [P24] Batiproduits, fiche Majrex (poids du rouleau 13,5 kg ; extrait moteur) — cohérent avec 75 m² × 150 g + mandrin | 1 source + recoupement de poids | fiche de 2017 : vérifier en négoce que le format n'a pas changé |
| Knauf **LDS 100** (Homeseal) : rouleau | 2 × 50 m = **100 m²** ; 2 × 12,5 m = 25 m² ; 185 g/m² | m² | [P25] page knauf.com fr-BE « Homeseal LDS 100 » (extrait moteur, 19/11/2026) | — | 1 source, **hors France** | 04 §D « 1,50 × 50 m » → **faux pour LDS 100** (largeur 2 m) ; LDS 0,02 UV = 1,5 × 50 m (75 m²), LDS Flexplus = 1,5 × 40 m (60 m²) (même extrait) ; Avis Technique France 20/13-287 **expiré au 31/07/2016** [P26] : disponibilité France à confirmer |
| Placo / Isover **Stopvap Fast** | 1,5 × 40 m = 60 m² (nom du fichier étiquette Isover « 13352-membrane-stopvap-fast-15x40m ») | m² | [P27] isover.fr, étiquette d'emballage réf. 13352 (titre seulement, PDF 403) | `isolation.md` (piste interne, « 1,5 × 40 m ») | à confirmer (titre de fichier + piste interne non sourcée) | 04 §D, à confirmer → inchangé ; Stopvap est une marque **Isover** (pas Placo) |
| Soprema **Sopravap Visio** (pare-vapeur translucide) | 1,5 × 50 m = 75 m² (40 rlx couchés/palette) ; 3 × 50 m = 150 m² (20 rlx) ; 120 g/m² | m² | [P28] fiche Soprema DT-10/109_FR, hébergée Chausson (lue 19/11/2026) | — | 1 source | produit possible en négoce généraliste |
| **Recouvrement entre lés** | **10 cm minimum**, recouvrement collé sur toute sa longueur (adhésif dédié) | cm | [P26] Avis Technique Knauf LDS 100 20/13-287 (§ pose : « recouvrement de 10 cm minimum », jointoyé à l'adhésif LDS Soliplan) | [P29] Rockwool, fiche « Rocktect Intello Climate Plus » ABPFR61, novembre 2024 (« doivent se chevaucher sur 10 cm ») ; [P28] Soprema Sopravap Visio (« recouvrement entre les lés de 10 cm minimal ») ; extrait moteur de la fiche Isover Vario KB1 (« jointoyer deux lés … recouvrement de 10 cm ») | **confirmé (3 fabricants)** | 04 §D « 10 cm usuel », à confirmer → confirmé ; la majoration 1,10 m²/m² de 04 reste cohérente (lé 1,50 → utile 1,40 = +7,1 % + relevés) |
| Pro Clima **Tescon Vana** (adhésif) | **60 mm × 30 m** (art. 1AR02070, carton de 20, 480/palette) ; 300 mm × 30 m (1AR03059, carton de 4) | — | [P30] fiche pro clima Tescon Vana, version 505968 du 27/01/2026 (Mister Matériaux) | extraits moteur Insulation Merchant et Onninen « 60 mm × 30 m » | confirmé (2 sources) | 04 §D, à confirmer → confirmé ; sur support minéral lisse : primaire Tescon Primer ; ≥ 3 cm d'adhérence sur le minéral |
| SIGA **Rissan 60** (adhésif) | **60 mm × 25 m**, 10 rouleaux par carton (art. 2510-6025) | — | [P31] siga.swiss, page Rissan 60 (extrait moteur, 19/11/2026) | [P32] fiche produit SIGA Rissan PDS fr (hébergée CRB, extrait moteur) ; Insulation Merchant « 60 mm × 25 m » | confirmé (2 sources) | 04 §D, à confirmer → confirmé |
| SIGA Sicrall 60 | — | — | — | — | à confirmer (non trouvé) | |
| Adhésifs Knauf LDS (d'après l'AT de 2013) | Soliplan (lés) 60 mm × 40 m ; Solifit (raccords, perforations) 60 mm × 25 m ; Solidouble (double face, fixation provisoire) 25 mm × 40 m ; manchons 15-22 / 28-35 (150 × 150 mm), manchon universel Ø 75-125 | — | [P26] | — | 1 source **ancienne (AT expiré 2016)** | à confirmer sur l'offre actuelle |
| Ratio adhésif de jointoiement | ml d'adhésif ≈ S / 1,40 (lé 1,50, recouvrement 0,10) + périmètre ; 1 rouleau Tescon Vana de 30 m couvre les joints de ≈ 42 m² ; 1 Rissan de 25 m ≈ 35 m² ; 1 Soliplan de 40 m ≈ 56 m² (hors périphérie) | ml/m² | calcul à partir du recouvrement confirmé (10 cm) et des lés (1,50 m) | — | calcul (pas de ratio fabricant lu) | 04 §D même formule ; ne pas oublier le périmètre (mastic ou adhésif) |

## 3. Suspentes Intégra 2 (04-isolants.md § D ; 02-ossatures-fixations.md)

Ancien statut (04 § D) : « principe : 1 source ; boîte de 50 : à confirmer ; entraxe / densité : voir 02 » (02 n'en parle pas).

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe, ancien statut) |
|---|---|---|---|---|---|---|
| Principe | suspente composite : **coupelle** qui maintient l'isolant + **clé** qui traverse la membrane en gardant l'étanchéité à l'air (« clip » sonore) et reçoit la fourrure ; fourrures de 45 mm (Optima 240) ; ménage un espace technique entre membrane et plaque | — | [P33] fiche Isover « Suspente Intégra 2 », MAJ 24/03/26, hébergée Samse (lue 19/11/2026) | [P34] fiche projet Isover « Isolez et aménagez vos combles » (Castorama, PDF du 26/04/2019) ; [S75] notice Vario Xtra (schéma) | confirmé (2 sources) | 04 §D 1 source → confirmé |
| Tailles (épaisseur d'isolant reprise) | réf. 85601 = **160 mm** ; 84937 = **200 mm** ; 85600 = **240 mm** ; 68319 = **280 mm** (vendues « 120-160 », « 160-200 », « 200-240 », « 240-280 ») | mm | [P33] | Leroy Merlin, Bricomarché, Brico Dépôt (titres produits « boîte de 50 … 120-160 / 160-200 / 200-240 / 240-280 », extraits moteur 19/11/2026) | confirmé (2 sources) | choisir la taille = épaisseur totale d'isolant **sous** la suspente (couche sous chevrons ou les deux couches selon montage) : **question à poser** |
| Conditionnement | **boîte de 50** | pcs | [P33] (50 par paquet) | Brico Dépôt « lot de 50 suspentes Intégra 2 … 200-240 » ; Leroy Merlin « boîte de 50 » | confirmé (2 sources) | 04 §D, à confirmer → confirmé |
| Implantation (rampant, 2 couches entre et sous chevrons) | 4 suspentes aux angles, cordeau, puis : **tous les 60 cm sur un même chevron**, **tous les 1,20 m perpendiculairement aux chevrons**, **à 10 cm maxi du pignon** ; 2 vis à bois par suspente | — | [P34] (Isover, étapes 1-2) | extrait moteur Isover « pas à pas de pose Intégra 2 » (« espacement maximum 60 cm sur un même chevron, 1,20 m perpendiculairement aux chevrons ») | confirmé (2 sources) | une autre brochure Isover (extrait moteur « suspente Intégra2 en combles aménagés ») dit « en quinconce, tous les 120 cm sur un même chevron pour un entraxe entre chevrons ≤ 60 cm » : **contradiction de lecture** (quel côté fait 60 / 120) → le résultat par m² est le même |
| Densité | **1,5 à 3 suspentes/m²** | u/m² | [P34] « Ma liste pour mon projet », quantité pour 1 m² | calcul : grille 0,60 × 1,20 m = 1,39/m² + rives et pignons → ≈ 1,5 ; revendeur (extrait moteur) « 2 à 3 suspentes/m², fourrures 40-60 cm » | confirmé (2 sources) pour la fourchette | **règle proposée** : 1,5/m² (fourrures à 0,60) ; 2,1/m² si fourrures à 0,40 (plaque parallèle, hydro, isolant lourd : voir 02 « plafond, fourrures 0,40 ») ; arrondir à la boîte de 50 |
| Autres quantités de la même fiche Isover (pour 1 m² de rampant) | isolant 1,05 m² par couche ; fourrure Optima 240 **2 ml** ; membrane Vario Xtra **1,10 m²** ; adhésif Vario Fast Tape / Multitape **> 0,65 ml** ; plaque Placo 1,05 m² ; vis TTPC 15 ; enduit 0,35 kg ; 3 vis-chevilles pour rails et fourrures horizontales | /m² | [P34] | 04 §D (1,10 m²/m² de membrane, 1 source ; adhésif 0,71 ml/m² calculé) | **1,10 m² de membrane : confirmé (2 sources)** ; adhésif 0,65 ml/m² : 1 source + calcul cohérent (0,71) | 04 §D « majoration membrane : 1 source + calcul » → confirmé |

## 4. Coffrages, soffites, habillages d'IPN, gaines techniques

Ancien statut : non traité en 1re passe (aucun fichier ; besoin signalé dans la mission). Aucun quantitatif fabricant « par ml de coffrage » n'a été trouvé pour un soffite ou un habillage d'IPN ; seul Pladur publie un quantitatif de gaine technique.

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Gaine technique Pladur (2 BA13 sur ossature indépendante + laine, DTU 25.41) : domaine | intérieur 200 × 200 à 1250 × 1000 mm, hauteur ≤ 3,00 m, 2 à 4 faces ; EI 60 | — | [P35] Pladur, fiche système « Gaine technique », rév. 03/2019 (corporate.pladur.com, lue 19/11/2026) | [P36] Siniat, fiche « Gaine technique composée d'une cloison Prégymétal D72/48 + isolant » (print2pdf, 11/02/2025, extrait) : gaines faites avec les systèmes de cloison / contre-cloison | confirmé (2 sources) pour le principe (une gaine = une cloison ou contre-cloison de 2 à 4 faces) | |
| Gaine 200 × 200, 2 faces, h 2,60 m (quantités **par gaine**, pertes 5 % incluses) | plaques 2,18 m² ; rail 0,84 m ; montants 10,92 m ; vis 25 : 20 ; vis 35 : 58 ; vis MM (métal-métal) : 17 ; enduit 2,01 kg ; bande 9 m ; isolant 1,01 m² | par gaine | [P35] | calcul de vérification : 2 faces × 0,20 m × 2,60 m × 2 peaux = 2,08 m² × 1,05 = 2,18 ✔ ; 4 montants × 2,60 × 1,05 = 10,92 ✔ ; rails (0,20 + 0,20) × 2 × 1,05 = 0,84 ✔ | 1 source + calcul qui la retrouve | Pladur titre « par m² de cloison » mais les chiffres sont **par gaine** (le calcul le montre) |
| Gaine 400 × 400, 3 faces, h 2,50 m | plaques 3,30 m² ; rail 2,52 m ; montants 15,75 m ; vis 25 : 31 ; vis 35 : 79 ; MM : 16 ; enduit 2,89 kg ; bande 13 m ; isolant 3,15 m² | par gaine | [P35] | calcul : 3 × 0,40 × 2,50 × 2 = 6,0 m² ≠ 3,30 → **ne se retrouve pas** (peut-être 1 peau par face, ou 2 faces doublées seulement) | contradiction (détail : chiffre Pladur incohérent avec « 2 plaques » sur 3 faces) | ne pas coder ; à confirmer auprès de Pladur |
| Gaine 1200 × 1000, 3 faces, h 3,00 m | plaques 20,48 m² ; rail 6,83 m ; montants 44,10 m ; vis 25 : 85 ; vis 35 : 191 ; MM : 38 ; enduit 6,42 kg ; bande 29 m ; isolant 10,24 m² | par gaine | [P35] | calcul : (1,2 + 1,0 + 1,2) × 3,0 × 2 = 20,4 m² ≈ 20,48 ✔ (pertes non ajoutées ?) | 1 source + calcul approché | |
| Règle de mise en œuvre gaine | toujours **deux montants en vis-à-vis** pour tenir la laine ; montant de départ vissé (ou chevillé) dans la cloison existante ; chevêtre aux ailes vissées ou serties | — | [P35] | — | 1 source | |
| Gaine Siniat Prégyroche Duo 10+50+10 | panneau sandwich sur **cornière Prégymétal 50-50** ; 70 mm ; CF 1 h 30 ; Rw+C 30 dB ; 21,5 kg/m² | — | [P37] fiche Siniat « Gaine technique Prégyroche Duo », 01/04/2014, hébergée Chausson | Batiproduits « Prégyroche Duo » (rails et cornières 50 × 50 en accessoires, extrait moteur) | confirmé (2 sources) | fiche ancienne : vérifier que le produit existe encore |
| Habillage de poutre acier (IPN, HEA…) au feu, Siniat | 1 à 3 plaques Prégyflam vissées sur **rail Prégymétal R36-30 + clip** ; R 30 à R 120 selon massiveté ; joints et angles en bande ou cornière + Prégylys | — | [P38] fiche système Siniat « Protection des structures acier, 1 Prégyflam BA15, R120, massiveté < 46 m⁻¹ » (print2pdf, lue 19/11/2026) | knauf.com fr-BE, clip de fixation pour l'habillage de poutres HEA/HEB/IPE/IPN (extrait moteur) | confirmé (2 sources) pour le principe (rail + clip sur l'aile) | **quantités par ml : non publiées** → à confirmer ; un habillage feu n'est pas un coffrage déco : demander l'exigence (R30/R60…) |
| Coffrage / soffite décoratif (caisson de plafond, descente d'eau, IPN sans exigence feu) : quantitatif | — | — | — | — | **à confirmer (aucun quantitatif fabricant trouvé)** | règle de métré proposée (hypothèse à faire valider) : plaques = développé (somme des faces) × longueur × 1,10 ; ossature = 2 cornières ou rails de rive par ml + 1 fourrure ou montant d'angle par arête ; bande armée d'angle (ou cornière d'angle) = nombre d'arêtes saillantes × longueur ; vis 25 ≈ 15 par m² de plaque |

## 5. Locaux humides sous carrelage : entraxe des montants

Ancien statut : 02-ossatures-fixations.md « 0,40 imposé en parement simple ≤ 15 mm selon certaines fiches (extrait Placo) », 1 source ; seuil de format non trouvé.

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe, ancien statut) |
|---|---|---|---|---|---|---|
| Règle (NF DTU 25.41, 2022, § 6.3.2.1, locaux **EB+ privatifs**) | cloison ou contre-cloison à **parement simple BA13 ou BA15** recevant un **carrelage de plus de 1 600 cm² par carreau** (au-delà de 40 × 40 cm) → **entraxe des montants 0,40 m** ; sinon cas général 0,60 m | m | [P39] AQC, « Mémo chantier — ouvrages en plaques de plâtre sur ossature », 2024 (qualiteconstruction.com, lu 19/11/2026) : « 1 BA13 ou 1 BA15 et surface carreaux > 1 600 cm² → 40 cm ; cas général 60 cm » | [P40] Knauf France, FAQ support technique (knauf.com, extrait moteur 19/11/2026) citant le NF DTU 25.41 (même règle) ; [S74] guide CAPEB/FFB « NF DTU 25.41 — nouveautés 2022 » p. 16 : « en cas de finition carrelage, suivant le format des carreaux et le type de plaque, resserrement des entraxes (§ 6.3.2.1) » | **confirmé (2 sources + guide DTU)** | 02 « 1 source » → confirmé, avec le **seuil 1 600 cm²** ; c'est une **question de comptoir** : « Carrelage au mur ? format des carreaux ? » |
| Même règle, plaques BA18 / BA25 en largeur 900 mm | entraxe limité à **0,45 m** | m | [P40] Knauf FAQ (extrait) | — | 1 source | rare en logement |
| Parement double (2 × BA13) | règle des 0,40 ne s'applique pas (« parement simple » seulement) | — | [P39] (le cas particulier ne vise que 1 BA13 / 1 BA15) | [P40] | confirmé (2 sources), par lecture a contrario | |
| Plaques en EB+ privatif | plaques **H1** (hydro) ; SPEC sous carrelage, sauf si enduit et mortier de rebouchage tous hydrofugés ; sous rampant, parois < 1,80 m en H1 | — | [P39] | [S74] guide DTU 2022 p. 16 | confirmé (2 sources) | voir 01-plaques.md |
| EB+ collectifs | entraxe : voir Avis Technique ou NF DTU ; SPEC sur 2 m mini au-dessus du sol fini, bandes de renfort sol/mur | — | [P39] (renvoi cahier CSTB 3567) | [S74] | confirmé (2 sources) | hors logement individuel |
| Autre seuil (Placo) | 3 600 cm² et 40 kg/m² (revêtements lourds) | — | extrait moteur fiche Placo (placo.fr/media/33306, 19/11/2026) | — | à confirmer (autre disposition, à ne pas confondre avec 1 600 cm²) | |
| Effet sur la commande | à 0,40 m : montants simples 2,89 ml/m² au lieu de 2,10 ; vis TTPC 37/m² au lieu de 30 (72/48) | ml/m², u/m² | 02-ossatures-fixations.md D.1 (SNIP [S1]) | — | renvoi | |

## 6. Ossatures Siniat / Knauf France ; cheville Molly

Ancien statut : 02-ossatures-fixations.md « Knauf 48/35 : 2,59 / 3,00 / 3,99, 10 pcs/paquet : à confirmer (pages hors France) » ; « Siniat Prégymétal M48 : Ultra WAB 3 m, 0,62 mm, bottes de 13 : à confirmer » ; 02 « Molly : jusqu'à 60 kg par point sur Habito, 1 source ».

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe, ancien statut) |
|---|---|---|---|---|---|---|
| Knauf France, montant 48/35 : longueurs | **2,59 m et 2,99 m** relevées sur la page **fr-FR** ; **10 pièces par paquet** | m | [P41] knauf.com/fr-FR « Montant 48/35 » (réf. 22807_4091), extrait moteur 19/11/2026 (page 403 en direct) | 02 [S36] extraits knauf.com hors France (2,59 / 3,00 / 3,99 ; 10 pcs) | confirmé (2 sources) pour 10 pcs/paquet ; longueurs : 2,59 confirmé, **2,99 (FR) vs 3,00 (hors FR) : contradiction de libellé** | la fiche fr-FR existe aussi en Z275 (réf. 22820) ; liste complète des longueurs FR : à confirmer en négoce |
| Siniat Prégymétal Ultra WAB 48-35 | **3 m**, 0,62 mm, **13 barres par botte** ; palette de 18 paquets (code SAP 99532) | — | [P42] Batiproduits, fiche Siniat ossature locaux humides (extrait moteur, 19/11/2026) | [P43] CMES Matériaux, fiche Siniat « MT Ultra WAB 48-35 L 3 m PAL × 18 paq » (extrait moteur ; PDF 403 en direct) | confirmé (2 sources) | 02 « à confirmer » → confirmé pour la version Ultra WAB (locaux humides) ; M48-35 standard Siniat : longueurs **toujours à confirmer** (fiches print2pdf en erreur 500 le 19/11/2026) |
| Charges sur cloison BA13 standard | au-delà de **30 kg** (lavabo, WC suspendu, meuble, chaudière, ballon ≤ 50 l) : **renfort incorporé à l'ossature** (traverse, platine, bâti-support) | kg | extrait moteur d'une fiche système Placo (placo.fr, 19/11/2026) : « renforts pour les charges supérieures à 30 kg … fixées sur des supports ou renforts incorporés à l'ossature » | — | 1 source (extrait) | le NF DTU 25.41 contient une règle équivalente (non relue) : à confirmer ; **conséquence commande** : une charge lourde citée au devis appelle un renfort (ligne à demander), pas une cheville |
| Cheville métallique à expansion (type Molly) sur **Habito** | jusqu'à **60 kg par point** sans renfort (vis Ø 6) ; 20 kg avec une vis à bois VBA Ø 5 ; entraxe mini 40 cm entre 2 points | kg | [P44] Placo, « Offre Placo 2024 » (catalogue, PDF du 21/02/2024 hébergé CAPEB, p. Habito) | 02 [S44] Placo « Destination rénovation » 2021 (60 kg) ; Batiproduits fiche Habito (extrait : 20 / 60 kg) | **confirmé (2 sources)** | 02 « 1 source » → confirmé ; **ne vaut que pour Habito** |
| Molly sur **BA13 standard** : charge admissible | aucune valeur fabricant trouvée ; valeurs grand public 15 à 30 kg (indicatif) ; Bricomarché « charge indicative 25 kg » (Ø 8 mm) | kg | — | — | **à confirmer (aucune fiche Fischer / Spit / Rawl lue ; quota)** | ne pas coder de charge ; la cheville n'est commandée que si le devis la cite |

## 7. Accessoires : trappes, boîtiers étanches, bande résiliente

Ancien statut : 05-finitions-accessoires.md (trappes, boîtiers, bande résiliente non chiffrés ou « à confirmer »).

### 7.1 Trappes de visite Placo (offre 2024)

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Trappe acier laqué blanc (ouverture par pression) | 200 × 200, 300 × 300, 400 × 400, 500 × 500, 600 × 500, 600 × 600 mm ; **carton de 5 trappes** ; J+5 | mm | [P44] Placo, « Offre Placo 2024 », p. 100 (PDF du 21/02/2024, hébergé CAPEB, lu 19/11/2026) | — | 1 source (catalogue fabricant) | codes T119250 à T119275 ; offre 2026 (placo.fr) : 403, non relue → vérifier qu'elle n'a pas changé |
| Trappe **alu / plaque** (plaque de plâtre intégrée, sans vis apparente, locaux humides) | 200, 300, 400, 500, 600 (carrées) ; **à la pièce** | mm | [P44] | — | 1 source | réf. T119625 à T119665 ; c'est la « trappe à plaque intégrée » |
| Trappe **étanche à l'air** (plaque vissée, câble de sécurité) | 300, 400, 500, 600 (carrées) ; à la pièce | mm | [P44] | — | 1 source | à proposer en plafond sous comble isolé (exigence BAR-EN-101 : rehausse de trappe, voir § 8.2) |
| Trappe plafond **coupe-feu 60** (joint intumescent) | 300, 400, 500, 600 (carrées) ; à la pièce | mm | [P44] | — | 1 source | EI 30 / 60 selon PV |
| Gamme CFD (trappes coupe-feu, cartons neutres) | dimensions hors-tout = ouvrant + 220 mm ; passage libre = ouvrant | mm | [P44] p. 101 | — | 1 source | |
| Question de comptoir | dimension (côté en mm) + type (acier, à plaque, étanche, coupe-feu) | — | déduit de [P44] | — | — | une ligne « trappe » sans dimension reste à préciser |

### 7.2 Boîtiers électriques étanches à l'air pour cloisons sèches

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Legrand **Écobatibox** (étanche à l'air) : profondeurs | **40 mm** (0 800 21 simple ; 22/23/24 = 2/3/4 postes) et **50 mm** (0 800 31 ; 32/33/34) ; perçage **Ø 67 mm** (scie cloche 67/68), entraxe 71 mm | mm | [P45] fiche Legrand F01033FR/03 « Écobatibox boîtes cloisons sèches », MAJ 15/09/2021 (hébergée Sonepar, lue 19/11/2026) | [P46] 123elec, « Écobatibox simple étanche à l'air D67 P40 – 080021L » et « … P50 – 080031L » (titres, 19/11/2026) | confirmé (2 sources) | « Batibox Air'Métic » n'existe pas chez Legrand sous ce nom (introuvable) : la gamme étanche à l'air Legrand est **Écobatibox** ; la Batibox 0 800 41 (40 mm, cloisons sèches) n'est pas annoncée étanche |
| Écobatibox : serrage (épaisseur de parement) | 40 mm : 4 à 30 mm ; 50 mm : 9 à 35 mm | mm | [P45] | — | 1 source | 50 mm conseillée en 2 × BA13 (26 mm) ou BA18 + doublage ; question à poser si le devis ne dit pas |
| Écobatibox : lots | lots de 100 (0 800 12 en 40 mm / 0 800 13 en 50 mm) ; lots de 300 en sachets de 50 (0 800 07 / 0 800 14) | pcs | [P45] | — | 1 source | |
| Écobatibox 0 800 86 (prises 20/32 A) | Ø perçage 85 mm, prof. 45 mm | mm | [P45] | — | 1 source | |
| Nombre de boîtiers | ne vient **que** du devis (lot électricité) | — | règle §49 BatiClair | — | — | le plaquiste ne les commande que s'ils sont écrits à son devis |

### 7.3 Bande résiliente sous rail (Tramico Tramiband)

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note (fichier 1re passe) |
|---|---|---|---|---|---|---|
| Tramiband / Tramiband SR : formats | **45 × 3 mm × 30 m** (colis de 20 = 600 m) ; **65 × 3 × 30** (colis de 14) ; **50 × 3 × 30** (colis de 18) ; **70 × 3 × 30** (colis de 12) ; 25 × 5 × 20 m (colis de 12) | mm / m | [P47] fiche Tramico « Tramiband », PDF du 28/01/2026, hébergée Samse (lue 19/11/2026) | [P48] fiche Tramico « Tramiband SR », 2019, hébergée BigMat (45 / 65 / 25 mm, mêmes colisages) ; Castorama « Tramiband 70 × 3 mm », Brico Dépôt « 30 m × 70 mm » (titres) | **confirmé (2 sources)** | choisir la largeur = largeur du rail (R48 → 45 ou 50 ; R70 → 65 ou 70) ; Rs,w 65 dB (ISO 10140) |
| Quantité | ml de bande = ml de rails posés sur sol, plafond et murs (périmètre de la cloison) ; raccords bout à bout | ml | [P47] (pose sous rails et cornières, entre rail et structures porteuses aux sols, murs et plafonds) | [P48] | confirmé (2 sources) pour le principe | rouleaux = ⌈ml / 30⌉ |
| Placo « ruban résilient 45 » | 45 mm, **15 m**, 4 mm | — | extrait moteur fiche Placo (placo.fr, 403 en direct) | — | à confirmer (1 extrait) | autre produit que Tramiband |
| Knauf « bande résiliente » (V120) | collée sous rails ; dimensions non lues | — | knauf.com fr-FR (extrait) | — | à confirmer | |

## 8. Réglementation : RT existant élément par élément, CEE 2026

Ancien statut (04-isolants.md § C) : « Rénovation élément par élément : à confirmer (valeurs non lues) » ; « Seuils CEE 7 / 6 / 3,7 / 3 : à confirmer (fiches non lues) ».

### 8.1 RT existant « élément par élément » (arrêté du 3 mai 2007 modifié par l'arrêté du 22 mars 2017), R minimal de l'ensemble paroi + isolant, **valeurs depuis le 1er janvier 2023**

| Paroi | H1 | H2 (et H3 > 800 m) | H3 < 800 m | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|---|
| Mur extérieur, toiture de pente > 60° | 3,2 | 3,2 | 2,2 | [P17] Ministère, fiche « Les exigences réglementaires pour les travaux de rénovation », juillet 2023 (PDF du 21/08/2023, lu 19/11/2026) | [P18] Ministère / DREAL Pays de la Loire, même fiche, édition 2018 : 2,9 / 2,9 / 2,2 « du 1er janvier 2018 au 31 décembre 2022 » et « ces exigences seront renforcées à compter de 2023 » | 1 source pour la valeur 2023 (officielle) ; calendrier confirmé par 2 sources | texte Légifrance non lu (403) ; **2,9 (ancienne valeur) ne doit plus être codé** |
| Mur sur volume non chauffé | 2,5 | 2,5 | 2,5 | [P17] | [P18] ancien : 2 | 1 source (officielle) | |
| Plancher bas sur extérieur ou local non chauffé | 3 (*) | 3 (*) | 2,1 (*) | [P17] | [P18] ancien : 2,7 / 2,7 / 2,1 | 1 source (officielle) | (*) R 2,1 admis si la hauteur libre est limitée par une autre exigence |
| Plancher de combles perdus | 5,2 | 5,2 | 5,2 | [P17] | [P18] ancien : 4,8 | 1 source (officielle) | |
| Toiture de pente < 60° (rampants) | 5,2 (**) | 4,5 | 4 | [P17] | [P18] ancien : 4,4 / 4,3 / 4 | 1 source (officielle) | (**) R 4 admis si la perte de surface habitable dépasse 5 % |
| Toiture-terrasse | 4,5 | 4,3 | 4 | [P17] | [P18] ancien : 3,3 | 1 source | hors plaquiste |
| R à utiliser pour vérifier | seules les valeurs déclarées (CE, Avis Technique, ACERMI, Keymark…) | — | — | [P17] | [P18] | confirmé (2 sources) | |

### 8.2 Fiches CEE (opérations standardisées), état en 2026

| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| BAR-EN-101 (combles ou toiture) : seuil | **R ≥ 7** en comble perdu ; **R ≥ 6** en rampant (isolation existante non comptée) | m²·K/W | [P14] fiche BAR-EN-101 **vA64-6, à compter du 01/01/2025** (ecologie.gouv.fr, lue 19/11/2026) | [P19] catalogue des fiches, 80e arrêté (19/01/2026) : dernière version listée de BAR-EN-101 = A64-6 au 01/01/2025 ; 04-isolants (fiche Isoconfort « aides 200 mm R 6,25 ») | confirmé (2 sources) | 04 §C « à confirmer » → confirmé |
| BAR-EN-102 (murs) : seuil | **R ≥ 3,7** | m²·K/W | [P15] fiche BAR-EN-102 **vA65-4, à compter du 01/01/2025** | [P19] dernière version listée = A65-4 ; extrait moteur ADEME (« R ≥ 3,7 ») | confirmé (2 sources) | |
| Fin de validité | les deux fiches sont **abrogées à compter du 1er mai 2027** | — | [P14] | [P15] | confirmé (2 sources) | à revérifier en 2027 |
| Toujours actives en 2026 | BAR-EN-101 et 102 figurent dans les volumes délivrés de la lettre d'information CEE de juillet 2026 | — | [P20] lettre d'infos CEE 2026-07 (ecologie.gouv.fr) | [P19] | confirmé (2 sources) | |
| Autres conditions | pare-vapeur si nécessaire ; visite technique avant devis ; 7 jours francs entre acceptation du devis et travaux ; professionnel RGE ; preuve : marque, référence, épaisseur, surface, R | — | [P14] | [P15] | confirmé (2 sources) | BAR-EN-101 : coffrage autour des conduits et spots, rehausse de trappe → **lignes à commander** (voir 04 §B2) |
| BAR-EN-103 (plancher bas) : seuil R ≥ 3 | non relu | — | — | — | à confirmer | version en vigueur non vérifiée (tableau du catalogue [P19] illisible pour cette ligne) |
| RE2020 (neuf) | pas de R minimal par paroi | — | — | — | à confirmer (non relu, quota) | inchangé depuis 04 |

## Bilan

**Volume** : 99 lignes de données (certaines lignes portent un tableau de valeurs, par exemple R par épaisseur) ; **42 confirmées (2 sources ou plus)**, 38 à 1 source (dont 1 source + calcul de vérification), 2 contradictions expliquées, 13 « à confirmer », 4 renvois / règles. Environ 26 recherches web, le reste en lecture directe de PDF hébergés par des négoces (Samse, Chausson, BigMat, CAPEB, Mister Matériaux, Union Matériaux, Castorama) et par l'administration (ecologie.gouv.fr, DREAL).

### Levés (ancien statut → nouveau)

1. **PSE sous chape Knauf Therm Chape Th38** (04 §A7, à confirmer) : 2500 × 1200 mm, R par épaisseur (ACERMI 03/007/172), 1,05 m²/m² → confirmé. Le format « 1200 × 600 ou 1200 × 1000 » de 04 est **faux pour Knauf**.
2. **Styrodur 3035 CS** : 1250 × 600 à feuillure, 30 à 120 mm, 7 à 14 panneaux/colis, distribué en France par Placo → format confirmé ; **Ravatherm XPS 300 ST** : λ 0,029, R par épaisseur (1 source).
3. **Efigreen (Soprema)** : c'est un isolant de **toiture-terrasse** (600 × 600) → à retirer du périmètre plaquiste (2 sources).
4. **Isolants minces** : technique non traditionnelle en observation C2P (AQC) ; R évalué selon NF EN ISO 22097 ; **Hybris 31** (λ 0,031, ACERMI 22/189/1575, 1200 × 2700/2800, 4 panneaux en 105 mm) n'est pas un mince : RD intrinsèque à afficher, pas le R « avec lame d'air ».
5. **Membranes** : Intello / Intello Plus 1,5 × 50 m = 75 m² (fiche 01/2026) ; Majrex 1,5 × 50 m (fiche 2017) ; **Knauf LDS 100 = 2 × 50 m = 100 m²** (et non 1,5 × 50) ; Sopravap Visio 1,5 × 50 m.
6. **Recouvrement entre lés : 10 cm minimum** → confirmé (Knauf AT, Rockwool 11/2024, Soprema, Isover KB1).
7. **Adhésifs** : Tescon Vana 60 mm × 30 m (carton de 20) ; Rissan 60 : 60 mm × 25 m (carton de 10) → confirmés.
8. **Intégra 2** : boîte de 50, tailles 160/200/240/280, implantation 60 cm × 1,20 m, **1,5 à 3 suspentes/m²** → confirmé ; **membrane 1,10 m²/m²** confirmée (04 : 1 source) ; adhésif > 0,65 ml/m².
9. **Carrelage en EB+ privatif** : parement simple BA13/BA15 + carreau > **1 600 cm²** → montants à **0,40 m** (2 sources + guide DTU).
10. **RT existant élément par élément (depuis 01/01/2023)** : murs 3,2 / 3,2 / 2,2 ; combles perdus 5,2 ; rampants 5,2 / 4,5 / 4 ; plancher bas 3 / 3 / 2,1 (fiche ministère 07/2023 ; 1 source pour les valeurs 2023).
11. **CEE** : BAR-EN-101 vA64-6 (R ≥ 7 combles, ≥ 6 rampants), BAR-EN-102 vA65-4 (R ≥ 3,7), toujours en vigueur en 2026, **abrogées au 1er mai 2027**.
12. **Habito + Molly : 60 kg/point** → confirmé ; Knauf 48/35 : 10 pcs/paquet → confirmé ; Siniat Ultra WAB 48-35 : 3 m, 13 barres/botte → confirmé.
13. **Accessoires** : trappes Placo (6 tailles, carton de 5 pour l'acier), Écobatibox 40/50 mm Ø 67, Tramiband 45/50/65/70 × 3 mm × 30 m avec colisages.

### Restants (à confirmer) et pourquoi

- R par épaisseur de **Styrodur 3035 CS** : fiche BASF hors réseau (fepwaf36.basf.com non résolu par le réseau de la session), Batiproduits ne lie pas R et épaisseur ; certificats ACERMI non ouverts (adresse du certificat introuvable sans son suffixe de version).
- **URSA XPS, PU nu de sol / mur (Recticel Eurothane, Knauf Thane), Actis Triso / Boost'R** : non recherchés (quota).
- Colisage du **Knauf Therm Chape** hors 20 mm ; **film PE 2,30 m²/m²** (chiffre Knauf surprenant).
- **Stopvap (Isover)** : seul le nom de fichier « 15x40m » est lisible (isover.fr 403).
- **Knauf LDS en France** : Avis Technique expiré en 2016, données Belgique.
- **Coffrage / soffite / habillage d'IPN décoratif** : aucun quantitatif fabricant par ml trouvé ; gaine Pladur 400 × 400 incohérente ; règle de métré proposée = hypothèse.
- **Molly sur BA13 standard** : aucune fiche fabricant (Fischer, Spit, Rawl) lue ; seule règle Placo « > 30 kg → renfort » (extrait).
- **Siniat M48-35 standard** (longueurs) : fiches print2pdf en erreur 500 le 19/11/2026 ; Knauf FR 2,99 vs 3,00 m.
- **Valeurs RT existant 2023** : une seule source officielle (Légifrance 403) ; **BAR-EN-103** non relue ; **RE2020** non relue.
- Trappes Placo : catalogue 2024 seul (offre 2026 sur placo.fr en 403).

### À reporter dans les fichiers de 1re passe (sans les modifier ici)

- 04-isolants.md §A7 : remplacer le format PSE sol, retirer Efigreen du périmètre, ajouter Hybris 31 ; §C : valeurs RT existant 2023 et versions des fiches CEE ; §D : Knauf LDS 100 = 2 m de large, recouvrement 10 cm confirmé, Intégra 2.
- 01-plaques.md : Knauf annonce l'arrêt des complexes PSE blanc Th38 (Polyplac Th38).
- 02-ossatures-fixations.md : règle 1 600 cm² → 0,40 m ; densité Intégra 2.

## Sources

Consultées le 19/11/2026 (sauf mention). « Extrait moteur » = texte lu dans les résultats du moteur, PDF ou page non ouvert.

1. [P1] Knauf, fiche « Knauf Therm Chape Th38 sous chape hydraulique », dernière modification 30/08/2017 — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_237820.pdf (Samse ; lu).
2. [P2] Knauf, page produit « Knauf Therm Chape Th38 » fr-FR (fiche technique mai 2025) — https://knauf.com/fr-FR/p/produit/knauf-therm-r-chape-th38-22187_4091 (extrait moteur ; 403 en direct).
3. [P2b] Knauf, page « Knauf Therm Mur Th38 » fr-FR — https://knauf.com/fr-FR/p/produit/knauf-therm-r-mur-th38-22350_4091 (extrait moteur).
4. [P3] Mr Bricolage, « Panneau Therm Chape Th38 ép. 4 cm 2,5 × 1,2 m R 1,05 Knauf » — https://www.mr-bricolage.fr/Persan/panneau-therm-chape-th38-ep-4cm-25x12m-r105-knauf.html (titre).
5. [P4] Knauf, fiche technique produit « Polyplac », 27/07/2020 — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1155000.pdf (Samse ; lu).
6. [P5] Batiproduits, fiche « Styrodur 3035 CS » (Placo) — https://www.batiproduits.com/fiche/produits/panneau-isolant-xps-polyvalent-a-surface-lisse-et-p68905333.html (lu ; date de mise à jour non affichée).
7. [P6] DIBt, ETA-19/0120 (Styrodur) — https://www.dibt.de/pdf_storage/2026/ETA-19!0120(8.12.01-21!25).pdf (extrait moteur).
8. [P7] Isover Allemagne, fiche Styrodur 3035 CS — https://www.isover.de/assets/download/media/32471 (extrait moteur).
9. [P8] Ravago, fiche technique « Ravatherm XPS Plus 300 ST » (fichier du 15/01/2020) — https://www.chausson.fr/media/article-document/267868 (Chausson ; lu).
10. [P9] Soprema, fiche technique Efigreen Alu+ n° INSFR005-1/d (et INSFR005/b) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1159160.pdf ; https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1039190.pdf (Samse ; lus).
11. [P10] Soprema, brochure « Gamme Efigreen » — https://www.materiaux-naturels.fr/doc/product/n_1127.pdf (lu ; non datée, postérieure à 2016).
12. [P11] Soprema, brochure « Efigreen Duo+ » (époque RT 2012) — https://www.chausson.fr/media/article-document/214040 (lu).
13. [P12] ACERMI, liste des produits certifiés (valide au 19/11/2026) — https://acermi.com/en/certified-insulation-products/ (lu partiellement).
14. [P13] AQC, Communiqué C2P n° 62 « procédés d'isolation associant des produits minces réfléchissants » (juillet 2005, en ligne en 2025) — https://qualiteconstruction.com/wp-content/uploads/2025/12/Communique-Observation-C2P-62-Isolation-Produits-Minces-Reflechissants-AQC.pdf (lu).
15. [P14] Ministère, fiche CEE BAR-EN-101 vA64-6 à compter du 01/01/2025 — https://www.ecologie.gouv.fr/sites/default/files/documents/BAR-EN-101%20vA64-6%20%C3%A0%20compter%20du%2001-01-2025_1.pdf (lu).
16. [P15] Ministère, fiche CEE BAR-EN-102 vA65-4 à compter du 01/01/2025 — https://www.ecologie.gouv.fr/sites/default/files/documents/BAR-EN-102%20vA65-4%20%C3%A0%20compter%20du%2001-01-2025_1.pdf (lu).
17. [P16] ACERMI, rapport d'activité 2024 — https://www.acermi.com/publications/rapports-activites/acermi-rapport-activite-2024.pdf (extrait moteur).
18. [P17] Ministère (RT-RE bâtiment), « Les exigences réglementaires pour les travaux de rénovation », juillet 2023 — https://rt-re-batiment.developpement-durable.gouv.fr/IMG/pdf/fiche-exigences-reglementaires-renovation.pdf (lu).
19. [P18] Ministère / DREAL Pays de la Loire, même fiche, édition 2018 — https://www.pays-de-la-loire.developpement-durable.gouv.fr/IMG/pdf/fiche-travaux-renovation-logement-reglementation-thermique.pdf (lu).
20. [P19] Ministère, « Catalogue des fiches, version actualisée 80e arrêté » (PDF du 19/01/2026) — https://www.ecologie.gouv.fr/sites/default/files/documents/Catalogue%20fiches%20version%20actualis%C3%A9e%2080%C3%A8me%20arr%C3%AAt%C3%A9.pdf (lu).
21. [P20] Ministère, lettre d'information CEE juillet 2026 — https://www.ecologie.gouv.fr/sites/default/files/documents/2026-07%20lettre%20d%27infos%20CEE%20vf.pdf (lu).
22. [P21] pro clima, fiche technique Intello Plus, version 505932 du 27/01/2026 — https://attachments.mistermateriaux.com/pro%20clima%20INTELLO%20PLUS%20Fiche%20technique.pdf (lu).
23. [P22] pro clima, fiche technique Intello, version 505952 du 27/01/2026 — https://attachments.mistermateriaux.com/pro%20clima%20INTELLO%20Fiche%20technique.pdf (lu).
24. [P23] SIGA, fiche produit Majrex, actualisée le 11/05/2017 — https://media.hornbach.ch/hb/technicaldatasheet/as.46141230.pdf (lu).
25. [P24] Batiproduits, fiche « Majrex » — https://www.batiproduits.com/fiche/produits/systeme-de-frein-vapeur-en-rouleau-a-technologie-p296937832.html (extrait moteur).
26. [P25] Knauf Insulation Belgique, « Homeseal LDS 100 » — https://knauf.com/fr-BE/p/produit/homeseal-lds-100-21506_0217 (extrait moteur).
27. [P26] CSTB, Avis Technique 20/13-287 « LDS 100 / LDS 100 Plus » (Knauf Insulation), enregistré 11/03/2014, validité au 31/07/2016 — https://www.chausson.fr/media/article-document/211650 (lu).
28. [P27] Isover, étiquette « 13352 membrane Stopvap Fast 1,5 × 40 m » — https://www.isover.fr/download-documents/packaging-bat/13352-membrane-stopvap-fast-15x40m-etiquette.pdf (titre seulement ; 403).
29. [P28] Soprema, fiche « Sopravap Visio » DT-10/109_FR — https://www.chausson.fr/media/article-document/205969 (lu).
30. [P29] Rockwool, fiche « Rocktect Intello Climate Plus » ABPFR61, novembre 2024 — https://www.rockwool.com/syssiteassets/rw-bnl/downloads-fr/downloads/fiches-techniques/accessoires/fiche-technique-rocktect-intello-climate-plus-fr.pdf (lu).
31. [P30] pro clima, fiche technique Tescon Vana, version 505968 du 27/01/2026 — https://attachments.mistermateriaux.com/pro%20clima%20TESCON%20VANA%20Fiche%20technique.pdf (lu).
32. [P31] SIGA, page « Rissan 60 » — https://siga.swiss/gb_en/products/rissan/rissan-60 (extrait moteur).
33. [P32] SIGA, fiche produit Rissan PDS fr — https://prd-media.crb.ch/media/53533/SIGA_Rissan_fiche_produit_PDS_fr.pdf (extrait moteur).
34. [P33] Isover, fiche « Suspente Intégra 2 », MAJ 24/03/26 — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_631115.pdf (Samse ; lu).
35. [P34] Isover, fiche projet « Isolez et aménagez vos combles » (PDF du 26/04/2019) — https://media.castorama.fr/is/content/Castorama/3596265231039_int_frpdf (lu).
36. [P35] Pladur, fiche système « Gaine technique », rév. 03/2019 — https://corporate.pladur.com/siteassets/page-assets/interactive-selector/gaines-techniques.pdf (lu).
37. [P36] Siniat, fiche « Gaine technique composée d'une cloison Prégymétal D72/48 + isolant » (11/02/2025) — https://www.siniat.fr/-/print2pdf/system/pi80638/siniat-fiche-technique/fr-fr/gaine-technique-composee-dune-cloison-pregymetal-d7248---isolant.pdf (extrait moteur ; PDF quasi vide en lecture).
38. [P37] Siniat, « Gaine technique Prégyroche Duo 10+50+10 », 01/04/2014 — https://www.chausson.fr/media/article-document/210317 (lu).
39. [P38] Siniat, « Protection des structures acier, 1 Prégyflam BA15, R120 » — https://siniat.fr/-/print2pdf/system/pi80155/siniat-fiche-technique/fr-fr/protection-des-structures-acier---1-pregyflam-ba15---r120---massivete--46-m.pdf (lu).
40. [P39] AQC, « Mémo chantier — ouvrages en plaques de plâtre sur ossature » (2024) — https://qualiteconstruction.com/wp-content/uploads/2024/05/Memo-Chantier-Ouvrages-Plaques-Platre-Ossature-AQC.pdf (lu).
41. [P40] Knauf France, FAQ support technique — https://knauf.com/fr-FR/knauf/outils-services/support-technique-knauf/faq-support-technique (extrait moteur).
42. [S74] CAPEB / FFB / SNIP, « Guide NF DTU 25.41 — les principales nouveautés 2022 » — https://www.capeb.fr/www/capeb/media//morbihan/document/2022_Guide%20DTU%2025-41_DEF_HD_WEB.pdf (lu ; URL retrouvée pour la source [S74] de 04).
43. [P41] Knauf France, « Montant 48/35 » — https://knauf.com/fr-FR/p/produit/montant-48-35-22807_4091 (extrait moteur ; 403 en direct).
44. [P42] Batiproduits, ossature Siniat locaux humides (Ultra WAB) — https://www.batiproduits.com/fiche/produits/ossature-metallique-pour-plafonds-de-locaux-humid-p68891413.html (extrait moteur).
45. [P43] CMES Matériaux, fiche Siniat Ultra WAB 48-35 — https://www.cmesmat.fr/media/catalog/product/attributes/K/i/KiCfCAjfaDPfLRqKrtP3tMkw1gyc0YGz35b1ato_KuxsoioANGZ+RxBwnaeWDbXG.pdf (extrait moteur ; 403 en direct).
46. [P44] Placo, « Offre Placo 2024 — aménagement intérieur, plafonds décoratifs et isolation du bâti » (PDF du 21/02/2024) — https://www.capeb.fr/www/capeb/media/document/loffre-placo-reg-2024-1-.pdf (CAPEB ; lu).
47. [P45] Legrand, fiche technique F01033FR/03 « Écobatibox boîtes cloisons sèches », MAJ 15/09/2021 — https://res.cloudinary.com/sonepar-fr/raw/upload/s--uxgnFoi3--/v1/documents/1/F01033FR-03.pdf (lu).
48. [P46] 123elec, Écobatibox 080021L (P40) et 080031L (P50) — https://www.123elec.com/legrand-ecobatibox-boite-encastrement-simple-etanche-a-l-air-d67-p40-080021l.html (titres).
49. [P47] Tramico, fiche « Tramiband » (PDF du 28/01/2026) — https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_797737.pdf (Samse ; lu).
50. [P48] Tramico, fiche « Tramiband SR » (PDF du 26/09/2019) — https://medias.bigmat.fr/data_medias/medias_finaux/documents/3530780000428-DxOFhDJTxn.pdf (BigMat ; lu).
51. [P49] Actis, brochure « Hybris 31 » (PDF du 28/03/2025) — https://api-pro.union-materiaux.fr/api/product-notice/809734_17290841_hybris31.pdf (Union Matériaux ; lu).
52. [P50] Actis, plaquette « Hybris » (ancienne gamme) — https://cdn.chausson.fr/catalog-document/9e6a2841-6c0a-444e-9676-401bd3d5c5b6/plaquettecommerciale-1000985.pdf (lu).
53. [P51] Entrepôt du Bricolage, fiche conseil « Hybris 31 mur 105 mm, 1,20 × 2,70 m, ballot de 4 panneaux » — https://www.entrepot-du-bricolage.fr/mediaw/asset/fiche_conseil_panneau-d-isolant-alveolaire-hybris-31-mur-epaisseur-105-mm-l-1-20-x-2-70-m-ballot-de-4-panneaux-actis.pdf (titre ; PDF non servi).
54. [S75] Isover, notice Membrane Vario Xtra (copie Gedimat) — https://uploads.gedimat.fr/DOCUMENT/TYPE2/0000225966312.pdf (relu ; ne donne pas le recouvrement).
