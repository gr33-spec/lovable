# Référentiel quantitatif ARROSAGE AUTOMATIQUE (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

L'arrosagiste (arrosage automatique intégré, souvent paysagiste) installe un réseau enterré : branchement sur la source d'eau, canalisation primaire jusqu'aux électrovannes, canalisations secondaires vers les arroseurs (tuyères, turbines, goutte-à-goutte), programmateur et câblage 24 V. Il n'existe pas de DTU : le métier suit les règles professionnelles UNEP/SYNAA P.C.6-R0 (conception), P.C.7-R0 (mise en œuvre), P.E.4-R0 (maintenance) et les fascicules 35 et 71 du CCTG en marché public.

Le levier n°1 du quantitatif n'est pas la région : c'est le nombre d'arroseurs et de secteurs, lui-même fixé par la pression et le débit disponibles. Le devis les donne presque toujours (« 12 tuyères, 4 turbines, programmateur 6 stations »).

| Axe | Poids | Ce qu'il change |
| --- | --- | --- |
| Géographie | moyen | Profondeur hors gel des tranchées, eau calcaire (filtre), littoral (inox, regards renforcés), restrictions d'eau (goutte-à-goutte, sonde de pluie) |
| Époque du bâti | nul | Aucun effet ; le jardin compte, pas la maison |
| Type de bâtiment | moyen | Particulier : PE 25/32 PN 10, programmateur 4-8 stations. Collectivité/copro/ERP : PE 40/50/63 PN 16, disconnecteur, regards fonte ou jumbo, fourreaux |
| Neuf / rénovation | moyen | Jardin à créer : tranchée libre. Gazon existant : trancheuse + reprise gazon. Extension d'un réseau existant : réutiliser programmateur et primaire |
| Gamme | fort | Grand public (Gardena, Claber) vs pro (Hunter, Rain Bird, Toro, Netafim) : références, conditionnements et pression mini différents |
| Source d'eau (axe propre au métier) | fort | Réseau public : clapet + vanne + compteur divisionnaire. Puits/forage/récupérateur : pompe ou surpresseur, crépine, filtre, coffret |

```json
{
  "code": "arrosage",
  "nom": "Arrosage automatique",
  "version": "1.0.0",
  "normes": ["UNEP/SYNAA P.C.6-R0", "UNEP/SYNAA P.C.7-R0", "UNEP/SYNAA P.E.4-R0", "CCTG fascicule 35", "NF EN 1717", "NF EN 12201", "NF C 15-100"],
  "axes_de_variation": {
    "geographie": "moyen",
    "epoque_bati": "nul",
    "type_batiment": "moyen",
    "neuf_renovation": "moyen",
    "gamme": "fort",
    "source_eau": "fort"
  },
  "metiers_lies": ["paysagiste", "terrassement", "plomberie", "electricite"],
  "unites_de_commande": ["u", "couronne", "ml", "boite", "sachet", "lot", "tube"],
  "maturite": "beta"
}
```

## 2. Règle d'or et unités de commande

Jamais de m² dans le bon de commande : la surface de gazon sert à vérifier le nombre d'arroseurs, pas à commander. Tout se commande à la pièce (arroseur, buse, vanne, regard, raccord), à la couronne (tube PE, goutte-à-goutte, câble, grillage avertisseur), ou au sachet/boîte (connecteurs, piquets).

| Famille | Unité de commande | Règle d'arrondi |
| --- | --- | --- |
| Tube PE primaire/secondaire | couronne 25, 50 ou 100 m (par diamètre et PN) | Longueur + 10 %, puis plus petit jeu de couronnes qui couvre ; jamais au ml si le négoce vend en couronne |
| Tube goutte-à-goutte | couronne 50, 100 ou 400 m (selon fabricant) | Longueur + 5 %, arrondi à la couronne |
| Tuyère / turbine / arroseur | u | Nombre du devis, + 0 |
| Buse de tuyère (vendue séparément) | u | 1 par tuyère |
| Électrovanne, programmateur, sonde, regard, vanne, clapet | u | Nombre exact |
| Collier de prise en charge, raccord PE (té, coude, manchon, bouchon) | u (ou sachet si vendu ainsi) | Calcul + 10 % sur les petits raccords |
| Câble multiconducteur 24 V | couronne 25, 50 ou 100 m, par nombre de conducteurs | Longueur + 10 % |
| Connecteurs étanches à graisse | boîte/sachet (souvent 10, 25 ou 50) | 2 par électrovanne + 2 par sonde, arrondi à la boîte |
| Piquets/crampons goutte-à-goutte | sachet (10, 25, 50 ou 100) | 1 tous les 1 à 2 m, arrondi au sachet |
| Grillage avertisseur | rouleau 25, 50 ou 100 m | = longueur de tranchée, arrondi au rouleau |
| Sable de lit de pose | sac 35 kg ou big bag 1 m³ | Seulement si sol caillouteux (question) |
| Ruban PTFE, colle PVC | u (rouleau, pot) | 1 rouleau par tranche de 20 filetages |

Les longueurs de couronne exactes de chaque produit sont dans la section 4 ; celles notées « à vérifier » doivent être confirmées sur la fiche du négoce qui livre (Frans Bonhomme, Hydralians, Descours & Cabaud, Point.P, France Arrosage).

Règle de lecture du devis : si une ligne dit « réseau PE 25 : 80 ml », l'app sort « 1 couronne 100 m PE 25 PN 10 », pas « 80 ml ».

## 3. Ouvrages, vocabulaire des devis, pièges

Sept ouvrages couvrent 95 % des devis. Chaque ligne du devis est rattachée à l'un d'eux via `vocabulaire.json`.

| Ouvrage (code) | Mots du devis | Ce qu'il déclenche | Pièges |
| --- | --- | --- | --- |
| `branchement` | piquage, raccordement compteur, tête de réseau, nourrice, prise d'eau | vanne d'arrêt, clapet anti-retour (EA) ou disconnecteur (BA en collectif), réducteur de pression si > 4,5 bar, purge, raccords laiton | « Raccordement sur existant » = pas de compteur à fournir ; puits/forage = pompe et filtre, pas de clapet EA seul |
| `primaire` | réseau primaire, conduite principale, alimentation électrovannes, PE 32 PN 16 | tube PE en couronne, raccords compression, grillage avertisseur bleu | Reste sous pression toute la saison : PN 16 en pro, PN 10 mini en particulier |
| `secteur_aspersion` | secteur, zone, station, voie ; tuyères, escamotables, pop-up, turbines, arroseurs rotatifs, rotators/MP | électrovanne, arroseurs, buses, colliers de prise en charge, tube secondaire, montage souple ou articulé | Tuyère Rain Bird 1800 / Hunter Pro-Spray vendue sans buse : ajouter la buse. « Tuyère 10 cm » = hauteur de sortie, pas portée |
| `secteur_goutte` | goutte-à-goutte, micro-irrigation, ligne de goutteurs, Techline, XFS, massif, haie | électrovanne, filtre, régulateur de pression (kit de contrôle), tube goutteur, collecteur PE, raccords Ø 16/17, piquets, purge de fin de ligne | Goutteur intégré ≠ goutteur à piquer ; « 3 haies de 20 m » = ml de tube, pas m² |
| `regard` | regard, boîte à vannes, chambre, VB, jumbo, regard rond 6" | regard rectangulaire, géotextile, gravier | Taille selon nombre d'électrovannes (section 5) |
| `pilotage` | programmateur, horloge, contrôleur, module Wi-Fi, sonde de pluie, capteur d'humidité, débitmètre | programmateur, transformateur si extérieur, câble multiconducteur, connecteurs, sonde | Programmateur à pile 9 V = pas de câble ; nombre de stations ≥ nombre de secteurs |
| `tranchee` | tranchée, trancheuse, terrassement, remblai, reprise gazon | pas de matériel arrosage hors sable et grillage | Le terrassement est souvent sous-traité : ne commander le sable que si le devis le mentionne ou si la question « sol caillouteux » = oui |

Synonymes à normaliser : « électrovanne » = EV = vanne solénoïde ; « tuyère » = escamotable = spray = pop-up ; « turbine » = arroseur rotatif = rotor ; « programmateur » = contrôleur = horloge ; « PE » = polyéthylène = tube noir ; « CPC » = collier de prise en charge ; « bouche d'arrosage » = prise rapide = raccord rapide.

Pièges transverses : un devis qui donne « surface arrosée 300 m² » sans nombre d'arroseurs oblige à appliquer les ratios de la section 5 et à afficher l'hypothèse ; un devis de maintenance (hivernage, remise en eau) ne génère aucun quantitatif matériel sauf pièces listées.

## 4. Matériaux et fiches fabricant

Les produits de référence sont Rain Bird, Hunter et Netafim (marques citées par l'UNEP et vendues chez Frans Bonhomme/Chausson, Hydralians, Descours & Cabaud). Une ligne non sourcée porte la mention « à vérifier ».

### 4.1 Arroseurs

| Produit | Caractéristiques | Pression | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| Tuyère Rain Bird 1800 (1802/1804/1806/1812) | Entrée 1/2" (15/21) ; soulèvement 5/10/15/30 cm ; portée 0,6 à 5,5 m selon buse ; vendue sans buse | 1,0 à 2,1 bar ; version SAM-PRS régulée à 2,1 bar | u | [Rain Bird VAN](https://www.rainbird.com/sites/default/files/media/documents/2021-04/van_fr.pdf), [fiche négoce](https://normandie-bassin-concept.com/tuyere-residentielle/69-tuyere-escamotable-serie-1800.html) |
| Buse Rain Bird VAN 4/6/8/10/12/15/18 | Secteur réglable 0-360° (0-330° pour 4, 6, 8) ; portées 0,9-1,2 / 1,2-1,8 / 1,8-2,4 / 2,1-3,0 / 2,7-3,7 / 3,4-4,6 / 4,3-5,5 m | 1,0 à 2,1 bar, optimum 2,1 | u (1 par tuyère) | [Rain Bird VAN](https://www.rainbird.com/sites/default/files/media/documents/2021-04/van_fr.pdf) |
| Turbine Rain Bird 5004 (PC/FC, Plus) | Entrée 3/4" (20/27) F ; portée 7,6 à 15,2 m (5,7 m avec vis brise-jet) ; secteur 40-360° ; buse n°3 prémontée + jeu de buses | 1,7 à 4,5 bar ; débit 0,17 à 2,19 m³/h | u | [fiche négoce](https://www.arrosage-distribution.fr/arroseur-5004-rain-bird.html) |
| Hunter Pro-Spray / PGP Ultra | Équivalents Hunter de la 1800 et de la 5004 | à vérifier | u | à vérifier |

Débits VAN à 2,1 bar (buse à 360°, extraits du tableau Rain Bird) : VAN 10 = 0,59 m³/h, VAN 12 = 0,54, VAN 15 = 0,84, VAN 18 = 1,21. À 90° le débit est environ le quart. Pluviométrie tuyère : 40 à 100 mm/h selon buse.

### 4.2 Goutte-à-goutte

| Produit | Caractéristiques | Conditionnement | Source |
| --- | --- | --- | --- |
| Netafim Techline CV / HCVXR Ø 16 | Goutteur autorégulant intégré, 1,0 / 1,6 / 2,3 / 3,5 l/h, espacement 0,3 / 0,4 / 0,5 / 1,0 m | Couronnes 50, 100, 200, 400 m | [catalogue Netafim](https://www.netafim.com/en-ae/bynder/889E84A6-6954-4AC7-BBB4B01D946C10CB-landscape-product-catalog.pdf) |
| Netafim Technet / Unitechline Ø 16 | 1,6 l/h autorégulant, espacement 30 ou 33 cm, 0,5 à 4 bar | Couronnes 50 et 100 m | [Hydralians](https://www.hydralians.fr/tuyau-goutteur-integre-technet-16-mm-30-cm-100-m-59859080), [RS Pompes](https://www.rs-pompes.com/goutte-a-goutte/2197-goutte-a-goutte-unitechline-16-lh-auto-regulant-100-m-netafim.html) |
| Kit de contrôle (filtre 120-130 µm + régulateur 1,5-2 bar) | 1 par électrovanne goutte-à-goutte | u | à vérifier |
| Raccords cannelés ou à serrage Ø 16/17 (té, coude, manchon, bouchon) | — | sachet ou u | à vérifier |

### 4.3 Électrovannes, regards, pilotage

| Produit | Caractéristiques | Conditionnement | Source |
| --- | --- | --- | --- |
| Électrovanne Hunter PGV 1" (PGV-101G) | 24 V AC (ou 9 V DC pour programmateur à pile) ; 0,05 à 9 m³/h ; 1,5 à 10 bar | u | [RS Pompes](https://www.rs-pompes.com/electrovanne-24-v-hunter/2078-electrovanne-pgv-101g-hunter-24-volts-1-ff-avec-reglage-de-debit.html) |
| Programmateur Hunter X-Core | Intérieur, 2/4/6/8 stations, transformateur 230 V → 24 V fourni | u | [Jardinet](https://www.jardinet.fr/p-3218-programmateur-dinterieur-x-core-xc-hunter) |
| Regard rectangulaire Standard (12") | 59 × 49,1 × 30,7 cm, couvercle vert | u | [Frans Bonhomme](https://www.fransbonhomme.fr/p-68362-regard_jumbo) |
| Regard Jumbo | 69,9 × 53,1 × 30,7 cm | u | idem |
| Regard Super Jumbo | 84,1 × 60,5 × 38,1 cm | u | idem |
| Regard Maxi Jumbo | 102,4 × 68,8 × 45,7 cm | u | idem |
| Rehausse Standard/Jumbo | h 17,1 cm | u | idem |
| Regard rond 6" (vanne de purge) | — | u | à vérifier |
| Câble Rain Bird Irricable 0,8 mm² | 3, 5, 7, 9 ou 13 conducteurs ; 350 m maxi programmateur → vanne (175 m si 2 vannes) | touret 75 m ou 150 m | [Rain Bird](https://www.rainbird.com/products/multi-conductor-irrigation-cable) |
| Connecteur étanche à graisse (type DBY) | 1 par épissure | boîte/sachet, à vérifier | à vérifier |
| Sonde de pluie (Hunter Mini-Clik, Rain Bird RSD) | — | u | à vérifier |

### 4.4 Canalisations et raccords

| Produit | Caractéristiques | Conditionnement | Source |
| --- | --- | --- | --- |
| Tube PEHD irrigation PE80 PN 10 (bande blanche) | Ø 20 à 110 mm, SDR 13,6 | Couronnes 25, 50 ou 100 m | [Frans Bonhomme](https://www.fransbonhomme.fr/p-PP_0000_0393-tube_irrigation_noir_bandes_blanches_poly_hpm_pe80_pn10_couronne_50m) |
| Tube PEHD eau potable PE80/PE100 PN 16 (bande bleue) | Ø 20 à 75 mm | Couronne 25 m (aussi 50 et 100 m) | [Frans Bonhomme](https://www.fransbonhomme.fr/p-09585-tube_pehd_pe_80_pn16_20_couronne_25m) |
| Raccords PE à compression (té, coude, manchon, réduction, bouchon, adaptateur fileté) | 16 à 63 mm ; 16 bar si service > 5 bar, sinon 10 bar (P.C.7-R0) | u | P.C.7-R0 §3.6.2.2 |
| Collier de prise en charge PE | 25 × 1/2", 32 × 1/2", 32 × 3/4", 40 × 1" | u | à vérifier |
| Tube souple de montage déporté + coudes cannelés 1/2" et 3/4" | Tube spécial déport, 2 coudes mini sous l'arroseur ; Ø 16 et allonges droites interdits | tube en couronne, à vérifier ; coudes u | P.C.7-R0 §3.13.1 |
| Montage articulé PVC 10 bar 3 ou 5 coudes | Arroseurs ≥ 1" | u | P.C.7-R0 §3.13.2 |
| Grillage avertisseur bleu (eau) / rouge (électricité) | Posé à 15-20 cm de profondeur | rouleau, longueurs à vérifier | P.C.7-R0 §3.8 |

Poids : sans objet pour la commande (petits volumes) ; seul le sable de lit de pose (sac 35 kg) intéresse la livraison.

## 5. Règles de calcul

Sans DTU, la référence est P.C.7-R0 (UNEP/SYNAA, 2014) ; les formules marquées (R) en sont tirées, celles marquées (H) sont des hypothèses métier à faire valider (section 11). Le moteur part toujours des comptes du devis (arroseurs, secteurs, ml) et n'applique les ratios que si le devis ne les donne pas.

### 5.1 Arroseurs et secteurs

```latex
N_{\text{arroseurs}} = \left\lceil \frac{S}{e^2} \times 1{,}25 \right\rceil
```

S = surface arrosée (m²), e = espacement = portée de la buse (recouvrement tête à tête, tableaux Rain Bird à 50 % du diamètre). Le 1,25 couvre les bordures (H). Tuyère : e = 4 m par défaut ; turbine 5004 : e = 10 m.

```latex
N_{\text{par secteur}} = \left\lfloor \frac{Q_{\text{disponible}}}{q_{\text{arroseur}}} \right\rfloor \qquad N_{\text{secteurs}} = \left\lceil \frac{N_{\text{arroseurs}}}{N_{\text{par secteur}}} \right\rceil
```

Q disponible par défaut 1,8 m³/h (H). q tuyère VAN 12 à 360° = 0,54 m³/h, compté 0,40 m³/h en moyenne (mélange 90/180/360°) (H) ; q turbine 5004 buse 3 ≈ 0,7 m³/h (à vérifier). Ne jamais mélanger tuyères et turbines sur un même secteur (pluviométrie 3 à 6 fois différente). Chaque zone goutte-à-goutte = 1 secteur à part.

### 5.2 Électrovannes, regards, programmateur

- Électrovannes = N secteurs (+ 1 vanne maîtresse si le devis la cite).
- Regards (R, tableau 3 P.C.7-R0, sans filtre ni régulateur) : regard 12" = 2 EV 3/4"-1" ; Jumbo = 4 ; Super Jumbo = 6. Une EV goutte-à-goutte avec filtre + régulateur compte pour 2 (H). Choisir le plus petit jeu de regards ; au-delà de 6 EV, plusieurs regards.
- Par regard (R) : 1 vanne de sectionnement amont, 2 raccords union par EV, gravier 5 cm au fond, géotextile autour.
- Programmateur : stations ≥ N secteurs, modèle immédiatement supérieur (4, 6, 8) ; > 8 → programmateur modulaire (à vérifier). Intérieur par défaut ; extérieur = modèle à transformateur intégré, posé à 1 m du sol mini (R).

### 5.3 Canalisations

| Débit du tronçon | Diamètre PE (vitesse ≤ 1,5 m/s) |
| --- | --- |
| ≤ 1,8 m³/h | PE 25 |
| ≤ 3,0 m³/h | PE 32 |
| ≤ 4,8 m³/h | PE 40 |
| ≤ 7,5 m³/h | PE 50 |

(H : calcul sur diamètre intérieur PN 10, à valider.)

```latex
L_{\text{secondaire}} = \sum_{\text{secteurs}} (N_i \times e_i + 10) \times 1{,}10
```

```latex
L_{\text{primaire}} = d_{\text{source}\to\text{regard}} \times 1{,}10
```

Le +10 m par secteur relie le regard au premier arroseur (H), +10 % de chutes et d'ondulation (pose « ondulée », dilatation 0,2 mm/m/°C, R). Primaire PN 16 en pro, PN 10 accepté en particulier (H). Conversion : plus petit jeu de couronnes 25/50/100 m qui couvre L, une ligne par diamètre et PN.

Profondeurs (R) : couverture 0,60 m sur primaire, 0,40 m sur secondaire et câbles ; tranchée ≥ 0,12 m de large.

### 5.4 Raccordement des arroseurs (R)

- 1 collier de prise en charge par arroseur (diamètre du secondaire × 1/2" tuyère ou 3/4" turbine).
- Montage déporté (tuyères, petites turbines) : 2 coudes cannelés + 0,4 m de tube de déport par arroseur (H sur la longueur).
- Montage articulé PVC 10 bar 3 ou 5 coudes pour arroseurs ≥ 1".
- Par secteur : 1 adaptateur PE × mâle en sortie d'EV, 1 bouchon ou té de purge en bout, 3 coudes et 2 tés en moyenne (H), +10 % sur les petits raccords.
- Purge (R) : 1 vanne de vidange manuelle par secteur au point bas, dans un regard rond drainant.

### 5.5 Goutte-à-goutte

```latex
L_{\text{goutteur}} = \left(\frac{S_{\text{massif}}}{s_{\text{lignes}}} + L_{\text{haies}} \times n_{\text{lignes}}\right) \times 1{,}05
```

s lignes = 0,40 m par défaut (0,30 sol sableux, 0,50 argileux) (H) ; haie : 1 ligne si largeur ≤ 0,6 m, 2 au-delà (H). Pose en peigne bouclée (R) : 2 collecteurs PE ou Ø 16 de longueur = largeur du massif. Crampons : 1 tous les 2 m maxi en ligne droite, resserrés en courbe (R) → 1 par 1,5 m par défaut (H). 1 kit filtre + régulateur par EV, 1 vanne de purge sur le collecteur, 1 vanne à air au point haut si pente (R).

### 5.6 Électricité 24 V (R)

```latex
n_{\text{conducteurs}} = N_{\text{EV}} + 1_{\text{commun}} + 1_{\text{réserve}} \Rightarrow \{3, 5, 7, 9, 13\}
```

Longueur câble = distance programmateur → chaque regard + 0,8 m de boucle par connexion, +10 % ; touret 75 ou 150 m. Section 0,82 mm² jusqu'à 350 m, 1,5 mm² jusqu'à 625 m (tableau 4 P.C.7-R0). Connecteurs étanches : 2 par EV, 2 par sonde ; épissures et dominos interdits.

### 5.7 Branchement et fournitures de tranchée

- Réseau public : 1 vanne de sectionnement, 1 dispositif anti-retour (clapet EA en maison individuelle, disconnecteur en collectif : à vérifier NF EN 1717 et règlement du service d'eau), 1 robinet de purge, réducteur de pression si pression statique > 4,5 bar (H).
- Grillage avertisseur : bleu = longueur de tranchée eau seule ; rouge = tranchées avec câble ; +5 %, arrondi au rouleau.
- Sable (seulement si sol caillouteux ou rocheux) : 0,10 m d'épaisseur sous la conduite (R) × 0,15 m de large × longueur de tranchée.
- Gravier fond de regard : 5 cm × surface du fond (R) → 1 sac de 25-35 kg par regard Jumbo (H).
- PTFE : 1 rouleau par 20 filetages (H). Raccords PE/PVC ou PE/métal : téflon ; métal/métal : filasse et pâte (R, tableau 2).

## 6. Valeurs par défaut et hypothèses affichées

Chaque défaut utilisé apparaît en clair sous le quantitatif (« Hypothèse : 1,8 m³/h disponibles »), modifiable d'un tap. Ordre de résolution : chantier → artisan → axe → national.

| Clé | Défaut national | Varie selon | Phrase affichée |
| --- | --- | --- | --- |
| `debit_disponible_m3h` | 1,8 | source d'eau (puits/pompe : selon pompe) | « Débit d'eau supposé : 1,8 m³/h » |
| `pression_statique_bar` | 4 | source d'eau | « Pression supposée : 4 bar (pas de réducteur) » |
| `gamme` | pro Rain Bird/Hunter | gamme (profil artisan) | « Matériel pro type Rain Bird / Hunter » |
| `tuyere_type` | 1804 (10 cm) + buse VAN 12 | type de bâtiment (massifs : 1806/1812) | « Tuyères 10 cm, buses réglables » |
| `turbine_type` | 5004 3/4" | — | « Turbines moyenne portée » |
| `espacement_tuyere_m` | 4 | — | « Tuyères tous les 4 m » |
| `espacement_turbine_m` | 10 | — | « Turbines tous les 10 m » |
| `pe_secondaire` | PE 25 PN 10, couronne 50/100 m | débit secteur | « Réseau secondaire PE 25 » |
| `pe_primaire` | PE 32 PN 16 | type de bâtiment (collectif : PE 40-63) | « Primaire PE 32 PN 16 » |
| `longueur_primaire_m` | 15 | — | « 15 m entre le compteur et les vannes » |
| `distance_programmateur_m` | 15 | — | « 15 m de câble jusqu'aux vannes » |
| `programmateur_emplacement` | intérieur | — | « Programmateur en intérieur (garage) » |
| `anti_retour` | clapet EA | type de bâtiment (collectif : disconnecteur) | « Clapet anti-retour au branchement » |
| `espacement_lignes_goutte_m` | 0,40 | géographie/sol | « Lignes de goutte-à-goutte tous les 40 cm » |
| `goutteur` | Ø 16, 1,6 l/h, 33 cm | — | « Goutteurs 1,6 l/h tous les 33 cm » |
| `sol_caillouteux` | non | géographie | « Pas de sable de pose » |
| `sonde_pluie` | oui si le devis la cite, sinon non | géographie (restrictions d'eau : proposer) | — |
| `chutes_tube_pct` | 10 | — | « +10 % de tube pour les chutes » |

Géographie : en zone de gel sévère (montagne, Est), la couverture de 0,60 / 0,40 m reste la règle ; l'app ne change pas les quantités mais rappelle la purge d'hiver. Littoral : rien ne change au quantitatif matériel (à vérifier : visserie inox des regards).

## 7. Questions à poser

Quatre questions à boutons suffisent dans 90 % des cas ; aucune ne demande un nombre de matériaux. Le moteur saute toute question dont le devis donne déjà la réponse. Sensibilité = écart estimé sur la valeur de la commande entre la meilleure et la pire réponse (H, à mesurer sur cas réels).

| Ordre | Question (texte exact) | Boutons | Saute si | Sensibilité |
| --- | --- | --- | --- | --- |
| 1 | D'où vient l'eau ? | Compteur de la maison · Puits ou forage · Cuve de récup | Devis cite pompe, puits, cuve ou compteur | ± 25 % (pompe, crépine, filtre, coffret vs clapet seul) |
| 2 | Le programmateur, il va où ? | Dans le garage · Dehors au mur · À pile dans le regard | Devis donne le modèle | ± 10 % (câble, connecteurs, transformateur, solénoïdes 9 V) |
| 3 | Entre le compteur et les vannes, c'est… | Tout près (< 10 m) · Moyen (10-30 m) · Loin (30-60 m) · Très loin (> 60 m) | Devis donne la longueur du primaire | ± 10 % (couronnes PE, câble, grillage) |
| 4 | Le terrain est plein de cailloux ? | Oui · Non | Devis cite sable ou lit de pose | ± 5 à 15 % (sable, big bag) |

Questions de réserve, posées seulement en cas de doute réel :

| Question | Boutons | Quand | Sensibilité |
| --- | --- | --- | --- |
| C'est pour une maison ou un immeuble/collectivité ? | Maison · Collectif | Adresse ou client ambigus | ± 15 % (PN 16, disconnecteur, regards renforcés) |
| Les tuyères des massifs, quelle hauteur ? | Gazon 10 cm · Massif 15 cm · Massif haut 30 cm | Devis dit « massif » sans modèle | ± 3 % |
| Tu veux une sonde de pluie ? | Oui · Non | Département en restriction d'eau et devis muet | ± 2 % |
| Matériel pro ou grand public ? | Pro (Rain Bird, Hunter) · Grand public (Gardena) | Profil artisan inconnu | change toutes les références |

La question 3 est une distance, pas une quantité de matériau : elle se répond d'un coup d'œil sur le terrain.

## 8. Matériaux dominants par région

La région pèse peu : le même matériel Rain Bird/Hunter/Netafim se pose partout. Elle change surtout la part de goutte-à-goutte, le filtrage et l'hivernage. Tableau entièrement à vérifier auprès d'arrosagistes locaux.

| Zone | Ce qui domine | Effet sur le quantitatif |
| --- | --- | --- |
| Méditerranée, Sud-Est, Corse | Goutte-à-goutte sur massifs et haies, turbines sur grands gazons ; arrêtés sécheresse fréquents | Défaut : sonde de pluie/humidité proposée, filtre systématique (eau calcaire) |
| Sud-Ouest, Aquitaine | Gazon + massifs, sols sableux (Landes) | Lignes de goutte-à-goutte à 0,30 m sur sable |
| Bretagne, Normandie, littoral Manche | Petits jardins, tuyères dominantes, moins d'installations | Sonde de pluie fortement conseillée ; rien d'autre |
| Île-de-France, grandes villes | Copropriétés, toitures-terrasses, jardinières | Question « collectif » plus fréquente ; goutte-à-goutte en bacs |
| Est, montagne, Massif central | Gel profond | Vidanges en points bas systématiques, purge au compresseur (pas de matériel en plus, sauf raccord de purge à vérifier) |
| Eau calcaire (Est, Bassin parisien, Sud-Est) | — | Filtre 120 µm sur chaque secteur goutte-à-goutte (déjà défaut) |

Réseaux de distribution : Frans Bonhomme/Chausson, Hydralians, Descours & Cabaud et Point.P au niveau national ; spécialistes France Arrosage, Irrijardin (Sud), magasins en ligne (RS Pompes, Arrosage Distribution). L'app doit garder les références fabricant (Rain Bird, Hunter, Netafim) que tous ces négoces reconnaissent.

## 9. Points singuliers et consommables

Ce sont les lignes que les devis oublient et que l'artisan découvre sur le chantier. Le moteur les ajoute automatiquement dès que l'ouvrage parent existe.

| Point singulier | Déclencheur | Ajout automatique | Source |
| --- | --- | --- | --- |
| Tête de réseau | Ouvrage `branchement` | 1 vanne de sectionnement, 1 anti-retour, 1 robinet de purge, raccords laiton PE × fileté | P.C.7-R0 §3.3 |
| Nourrice d'électrovannes | Chaque regard | 1 vanne d'arrêt amont, 2 raccords union par EV, tés de collecteur (N EV − 1), 1 bouchon | P.C.7-R0 §3.10 |
| Fond de regard | Chaque regard | Gravier 5 cm + géotextile | P.C.7-R0 §3.11 |
| Rehausse | EV à plus de 40 cm de profondeur (primaire à 60 cm) | 1 rehausse par regard Standard/Jumbo, ou jeu de coudes | P.C.7-R0 §3.10 ; H |
| Vidange de secteur | Chaque secteur | 1 vanne de vidange 1/2" + 1 regard rond au point bas | P.C.7-R0 §3.12 |
| Kit goutte-à-goutte | Chaque secteur `secteur_goutte` | Filtre + régulateur, vanne de purge sur collecteur, vanne à air si pente | P.C.7-R0 §3.14.1 |
| Traversée d'allée/terrasse | Devis cite « passage sous allée », « fourreau » | Fourreau TPC Ø 63 ou 90 (longueur du passage + 1 m) | P.C.7-R0 §2.2.22 ; diamètre à vérifier |
| Connexions électriques | Chaque EV et sonde | Connecteurs étanches à graisse ; boucle 0,8 m | P.C.7-R0 §3.15.2 |
| Ligne 230 V du programmateur | Programmateur sur secteur | Pas de matériel arrosage (électricien) ; afficher « prévoir une prise protégée par différentiel » | P.C.7-R0 §3.15.1 |
| Prise de terre | Système à décodeurs uniquement | Piquet de terre + câble cuivre nu 25 mm² | P.C.7-R0 §3.15.3 |
| Grillage avertisseur | Toute tranchée | Bleu (eau), rouge (câble) | P.C.7-R0 §3.8 |

Consommables : ruban PTFE (filetages plastique/métal), filasse + pâte (métal/métal), colle PVC + décapant si montage articulé collé, chiffons et bouchons d'extrémité de couronne (non commandés, H). L'app ne commande jamais d'outillage (coupe-tube, trancheuse).

## 10. Cas de test

Deux cas calculés à la main avec les règles de la section 5 ; ils servent de tests de non-régression en attendant des devis réels anonymisés (section 13).

**arro-001** : maison, 300 m² de gazon + haie + massif. Devis : 12 tuyères 1804 buse VAN 12, 4 turbines 5004, goutte-à-goutte sur haie 25 m et massif 12 m², programmateur 8 stations en garage, branchement sur compteur. Réponses : compteur, garage, moyen (20 m), pas de cailloux. Calcul : tuyères 4 par secteur → 3 secteurs ; turbines 2 par secteur → 2 ; goutte 2 → 7 EV ; regards 5 + 2×2 = 9 unités → 1 Super Jumbo + 1 Jumbo ; secondaire (3×26 + 2×30 + 2×10) × 1,1 = 174 m ; goutte (25 + 30) × 1,05 = 58 m ; câble 9 conducteurs.

```json
{
  "id": "arro-001",
  "source": "cas théorique Claude, 2026-10",
  "devis_pdf": null,
  "contexte": { "departement": "22", "source_eau": "compteur", "programmateur": "interieur", "distance_primaire_m": 20, "sol_caillouteux": false },
  "attendu": [
    { "article": "tuyère Rain Bird 1804", "quantite": 12, "unite": "u", "tolerance_pct": 0 },
    { "article": "buse Rain Bird 12 VAN", "quantite": 12, "unite": "u", "tolerance_pct": 0 },
    { "article": "turbine Rain Bird 5004 PC", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "électrovanne Hunter PGV 1\" 24 V", "quantite": 7, "unite": "u", "tolerance_pct": 0 },
    { "article": "programmateur 8 stations intérieur", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "regard Super Jumbo", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "regard Jumbo", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "regard rond 6\" de purge", "quantite": 7, "unite": "u", "tolerance_pct": 0 },
    { "article": "vanne de vidange 1/2\"", "quantite": 7, "unite": "u", "tolerance_pct": 0 },
    { "article": "tube PE80 Ø25 PN10 couronne 100 m", "quantite": 1, "unite": "couronne", "tolerance_pct": 0 },
    { "article": "tube PE80 Ø25 PN10 couronne 50 m", "quantite": 1, "unite": "couronne", "tolerance_pct": 0 },
    { "article": "tube PE80 Ø25 PN10 couronne 25 m", "quantite": 1, "unite": "couronne", "tolerance_pct": 0 },
    { "article": "tube PEHD Ø32 PN16 couronne 25 m", "quantite": 1, "unite": "couronne", "tolerance_pct": 0 },
    { "article": "collier de prise en charge 25 x 1/2\"", "quantite": 12, "unite": "u", "tolerance_pct": 0 },
    { "article": "collier de prise en charge 25 x 3/4\"", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "coude cannelé 1/2\"", "quantite": 24, "unite": "u", "tolerance_pct": 10 },
    { "article": "coude cannelé 3/4\"", "quantite": 8, "unite": "u", "tolerance_pct": 10 },
    { "article": "goutte-à-goutte Ø16 1,6 l/h 33 cm couronne 100 m", "quantite": 1, "unite": "couronne", "tolerance_pct": 0 },
    { "article": "kit filtre + régulateur goutte-à-goutte", "quantite": 2, "unite": "u", "tolerance_pct": 0 },
    { "article": "crampon de sol", "quantite": 1, "unite": "sachet 50", "tolerance_pct": 0 },
    { "article": "câble 9 conducteurs 0,8 mm² touret 75 m", "quantite": 1, "unite": "touret", "tolerance_pct": 0 },
    { "article": "connecteur étanche à graisse", "quantite": 14, "unite": "u", "tolerance_pct": 0 },
    { "article": "vanne de sectionnement + clapet anti-retour EA + purge (tête de réseau)", "quantite": 1, "unite": "lot", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

**arro-002** : goutte-à-goutte seul sur haie de 40 m, programmateur à pile, piquage sur robinet extérieur existant, 10 m de liaison. Réponses : compteur, à pile dans le regard, tout près, pas de cailloux. Aucun câble attendu.

```json
{
  "id": "arro-002",
  "source": "cas théorique Claude, 2026-10",
  "devis_pdf": null,
  "contexte": { "departement": "83", "source_eau": "compteur", "programmateur": "pile_regard", "distance_primaire_m": 10, "sol_caillouteux": false },
  "attendu": [
    { "article": "goutte-à-goutte Ø16 1,6 l/h 33 cm couronne 50 m", "quantite": 1, "unite": "couronne", "tolerance_pct": 0 },
    { "article": "programmateur à pile 9 V 1 voie", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "électrovanne 1\" solénoïde 9 V", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "regard rectangulaire 12\"", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "kit filtre + régulateur goutte-à-goutte", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "tube PE80 Ø25 PN10 couronne 25 m", "quantite": 1, "unite": "couronne", "tolerance_pct": 0 },
    { "article": "vanne de vidange 1/2\" + regard rond 6\"", "quantite": 1, "unite": "lot", "tolerance_pct": 0 },
    { "article": "crampon de sol", "quantite": 1, "unite": "sachet 50", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

Les tailles de sachet (crampons, connecteurs) restent à confirmer chez le négoce (section 4).

## 11. Ratios à faire valider par un arrosagiste

Classés par impact sur la commande. Chaque ligne validée passe de (H) à (V) avec le nom du relecteur dans le CHANGELOG.

| # | Ratio | Valeur actuelle | Question à poser au pro |
| --- | --- | --- | --- |
| 1 | Débit disponible par défaut | 1,8 m³/h | « Sur une maison standard, tu comptes combien au compteur ? » |
| 2 | Débit moyen d'une tuyère VAN 12 en mélange de secteurs | 0,40 m³/h | « Combien de tuyères tu mets par vanne d'habitude ? » |
| 3 | Débit turbine 5004 buse 3 | 0,7 m³/h | « Combien de turbines par vanne ? » |
| 4 | Coefficient de bordure sur le nombre d'arroseurs | × 1,25 | « Pour 300 m² en tuyères, tu en mets combien ? » |
| 5 | Longueur regard → 1er arroseur | + 10 m par secteur | « Ton tube secondaire, tu en prends combien par secteur ? » |
| 6 | Chutes de tube PE | + 10 % | idem |
| 7 | Tableau diamètre PE / débit | PE 25 ≤ 1,8 m³/h, PE 32 ≤ 3 | « Tu passes en 32 à partir de combien d'arroseurs ? » |
| 8 | EV goutte-à-goutte avec kit = 2 places de regard | 2 | « Tu mets combien de vannes goutte dans un Jumbo ? » |
| 9 | Raccords par secteur | 3 coudes + 2 tés | « Tu prends combien de coudes et de tés par secteur ? » |
| 10 | Tube de déport par arroseur | 0,4 m | « Ton montage souple, il fait quelle longueur ? » |
| 11 | Espacement lignes de goutte-à-goutte | 0,40 m (0,30 sable, 0,50 argile) | « Dans un massif, tes lignes sont à combien ? » |
| 12 | Crampons | 1 par 1,5 m | « Tu mets un crampon tous les combien ? » |
| 13 | Réducteur de pression | si > 4,5 bar | « À partir de quelle pression tu mets un réducteur ? » |
| 14 | Clapet EA ou disconnecteur | EA en maison | « Le service d'eau t'impose quoi au branchement ? » |

## 12. Sources officielles

Pages ouvertes le 3 octobre 2026.

| Source | Ce qu'on en tire |
| --- | --- |
| [UNEP/SYNAA P.C.7-R0 — Travaux de mise en œuvre des systèmes d'arrosage (2014)](https://www.e-spacevert.com/app/uploads/2022/11/p-c-7-r0-regles-pro-travaux-de-mise-en-oeuvre-des-systemes-d-arrosage-020516.pdf) | Profondeurs, regards (tableau 3), câbles (tableau 4), montages, goutte-à-goutte, raccords |
| [UNEP/SYNAA P.C.6-R0 — Conception des systèmes d'arrosage](https://www.e-spacevert.com/app/uploads/2022/11/p-c-6-r0-conception-090516.pdf) | Conception, symboles ; à lire pour les espacements de goutte-à-goutte |
| [UNEP/SYNAA P.E.4-R0 — Maintenance](https://www.e-spacevert.com/app/uploads/2022/11/p-e-4-r0-maintenance-28-04-16.pdf) | Hivernage, devis de maintenance |
| [e-spacevert — Pose d'un système d'arrosage automatique](https://www.e-spacevert.com/conseils/pose-dun-systeme-darrosage-automatique) | Synthèse pratique, pression 3,5-4 bar conseillée |
| [Rain Bird — buses série VAN (PDF)](https://www.rainbird.com/sites/default/files/media/documents/2021-04/van_fr.pdf) | Portées, débits, pluviométries |
| [Arrosage Distribution — turbine Rain Bird 5004](https://www.arrosage-distribution.fr/arroseur-5004-rain-bird.html) | Portée, pression, débit, entrée 3/4" |
| [Rain Bird — câble multiconducteur](https://www.rainbird.com/products/multi-conductor-irrigation-cable) | Conducteurs, tourets 75/150 m, distance maxi |
| [Netafim — catalogue paysage](https://www.netafim.com/en-ae/bynder/889E84A6-6954-4AC7-BBB4B01D946C10CB-landscape-product-catalog.pdf) | Techline : débits, espacements, couronnes |
| [Hydralians — Technet 16 mm 100 m](https://www.hydralians.fr/tuyau-goutteur-integre-technet-16-mm-30-cm-100-m-59859080) | Conditionnement négoce |
| [RS Pompes — Hunter PGV 101G](https://www.rs-pompes.com/electrovanne-24-v-hunter/2078-electrovanne-pgv-101g-hunter-24-volts-1-ff-avec-reglage-de-debit.html) | Débit, pression |
| [Jardinet — Hunter X-Core](https://www.jardinet.fr/p-3218-programmateur-dinterieur-x-core-xc-hunter) | Stations, transformateur |
| [Frans Bonhomme — regards Standard à Maxi Jumbo](https://www.fransbonhomme.fr/p-68362-regard_jumbo) | Dimensions |
| [Frans Bonhomme — tube PE80 irrigation PN 10](https://www.fransbonhomme.fr/p-PP_0000_0393-tube_irrigation_noir_bandes_blanches_poly_hpm_pe80_pn10_couronne_50m) | Couronnes 25/50/100 m |
| [Frans Bonhomme — tube PEHD PN 16 couronne 25 m](https://www.fransbonhomme.fr/p-09585-tube_pehd_pe_80_pn16_20_couronne_25m) | Primaire PN 16 |

Normes citées non consultées en texte intégral (payantes) : NF EN 1717 (protection contre la pollution par retour), NF EN 12201 (tubes PE eau), NF C 15-100, CCTG fascicules 35 et 71.

## 13. Plan de complétion

Le référentiel est utilisable en bêta : nombres d'arroseurs, vannes, regards, couronnes et câble sont sourcés ; les ratios (H) et quelques conditionnements restent à confirmer.

- [ ] Faire relire les 14 ratios de la section 11 par un arrosagiste (priorité 1 à 4 d'abord)
- [ ] Récupérer 5 devis réels anonymisés (dont 1 collectivité, 1 goutte-à-goutte seul, 1 avec puits) et leur commande négoce réelle → tests arro-003 à 007
- [ ] Confirmer chez Frans Bonhomme/Chausson ou Hydralians : tailles de sachet des connecteurs et crampons, longueurs de rouleau du grillage avertisseur, couronne du tube de déport, colliers de prise en charge disponibles
- [ ] Ajouter les fiches Hunter Pro-Spray, PGP Ultra, Rain Bird ESP-TM2/RC2 et un programmateur modulaire > 8 stations
- [ ] Lire P.C.6-R0 pour transcrire les espacements de goutte-à-goutte par type de sol et les règles de sectorisation
- [ ] Vérifier l'exigence anti-retour (clapet EA ou disconnecteur) selon NF EN 1717 pour l'arrosage enterré
- [ ] Ajouter la gamme grand public (Gardena, Claber) si des artisans l'utilisent
- [ ] Ouvrage `source_pompe` (puits, forage, cuve) : pompe, crépine, coffret, pressostat — hors P.C.7-R0, à rédiger avec un pro

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 3 oct. 2026 | 1.0.0 (bêta) | Création : 14 chapitres au format section 27, règles P.C.7-R0, fiches Rain Bird / Hunter / Netafim / Frans Bonhomme, 2 cas de test théoriques, 14 ratios à valider |
