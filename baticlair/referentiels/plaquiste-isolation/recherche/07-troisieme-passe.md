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
| Actis Hybris / Triso : formats, R | — | — | — | — | à confirmer (non recherché ; quota) | |
| Révision en cours | la « Règle produit n° 12 » ACERMI (produits réfléchissants) est en révision (rapport d'activité ACERMI 2024) | — | [P16] extrait moteur du rapport ACERMI 2024 | — | 1 source (extrait) | |

## 2. Membranes et adhésifs hors Isover (04-isolants.md § D)

(en cours)

## 3. Suspentes Intégra 2 (04-isolants.md § D ; 02-ossatures-fixations.md)

(en cours)

## 4. Coffrages, soffites, habillages d'IPN, gaines techniques

(en cours)

## 5. Locaux humides sous carrelage : entraxe des montants

(en cours)

## 6. Ossatures Siniat / Knauf France ; cheville Molly

(en cours)

## 7. Accessoires : trappes, boîtiers étanches, bande résiliente

(en cours)

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

## Sources
