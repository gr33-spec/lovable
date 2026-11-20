# 21. Cloisons séparatives entre logements : SAA (ossature alternée) et SAD (double ossature)

Recherche du 20 novembre 2026. Consignes : `_consignes.md`. Rien n'est inventé : chaque chiffre porte sa source ;
ce qui n'a qu'une source ou une source ancienne est marqué.

Déjà su (non refait) : exigence DnT,A ≥ 53 dB (recherche/03 §2.1), fiches Siniat S180 / S195 / S205 / S140 Twin /
S180 Twin (03 §2.2, 11), vis SNIP des séparatives 12 / 30 / 4 (13 C1-C3, 15 n° 3, 19 §2), masses INIES SAA 120 / 140 /
SAD 180 (16 Y4b). Nouveau ici : les **PDF** des FDES Placo (quantités en ml, u, m², pas seulement en kg), deux FDES de
plus (SAD 220, SAD 160 Duo'Tech), le **quantitatif Placo B01 003 b**, le **catalogue Knauf 2020 (KMA)** et le
**Mémento Pladur 2017** (séparatives SA / SD), relus dans les fichiers déjà téléchargés.

## 0. Vocabulaire (ce que veulent dire les noms du devis)

| Nom au devis | Ce que c'est | Marque | Source |
|---|---|---|---|
| SAA 120 / 140 / 160 / 180 / 220 | **Ossature alternée** : un seul rail large en périphérie (R70, R90, ou cornières CR2 avec M90), deux lignes de montants alternées (décalées de 0,30 m à 0,60 d'entraxe, de 0,20 m à 0,40), chaque ligne ne porte qu'un parement. Montants fixés au rail par vis TRPF 13. | Placo | [P1] Placo B01 003 b p. 1 et 6 |
| SAD 160 / 180 / 200 / 220 / 260 | **Double ossature indépendante** : deux rails par ligne (R48, R70 ou R90), deux ossatures qui ne se touchent pas ; montants emboîtés dans les rails. | Placo | [P1] p. 2 et 6 |
| KMA 22-160/48-35 | « Knauf Métal Acoustique », 2 plaques par parement, 160 mm, montant 48/35. Profilé de départ : rail 70 ou 90 (= alternée), « 2 rails de 48 » (= double), cornières (M70, M90, M100). | Knauf | [K1] catalogue Plaquiste/Plafiste 2020 p. 91-99 |
| KMA 23 / KMA 33 | 2 + 3 ou 3 + 3 plaques | Knauf | [K1] p. 96 |
| KMA 11 | 1 plaque épaisse par parement (KS 25, KA 18 Phonik, KA 25 Phonik+), plaques de 0,90 m | Knauf | [K1] p. 97-99 |
| Prégymétal S180, S195, S205 … ; S140 Twin, S180 Twin | Séparatives Siniat à deux ossatures (« deux demi-cloisons indépendantes ») | Siniat | recherche/03 [S33-S38] |
| SA 120/48, SD 160/48 … | Pladur Métal SA (alternée) et SD (désolidarisée), DTA 9/15-1008 (plaques 1,20 m) et 9/15-1015 (0,90 m) | Pladur | [L1] Mémento Pladur 2017 p. 61-64 |

Note de vocabulaire : SAA = « séparative à ossature alternée », SAD = « séparative à ossature désolidarisée (double) »
(Placo [P1] ; Pladur [L1] glossaire : « cloison séparative alternée : montants reliés dans un même rail » /
« désolidarisée : montants emboîtés dans deux rails »). **Confirmé (2 fabricants)**.

## 1. Règle commune aux trois grandes marques : les montants M48 sont DOUBLÉS (ou à 0,40)

C'est la découverte qui change le plus le calcul. Avec 2 BA13 par face sur M48-35, **aucune marque n'admet des
montants simples à 0,60 m** dans une séparative :

| Donnée (2 + 2 BA13, M48-35) | ] simples 0,60 | ] simples 0,40 | ][ doublés 0,60 | ][ doublés 0,40 | Source | Date |
|---|---|---|---|---|---|---|
| Siniat Prégymétal S120 / S160 (tableau 7 du DTA) | — (interdit) | 2,55 m | 2,75 m | 3,00 m | [S1] DTA 9/11-922_V5 p. 24 | valide du 02/09/2026 |
| Placo SAA 120 / SAD 160 (fiches système, extraits moteur) | — | 2,55 m (SAD 160, sp00021607) | 2,75 m (sp00011564, sp00018886) | 3,00 m (SAA 120, sp00011594 du 17/10/2025 ; FDES SAA 120 « max 3,00 m ») | [P2] extraits moteur placo.fr (403) ; [P3] FDES INIES 38669 | 2024-2025 |
| Placo SAA 120 / SAD 160 (B01 003 b) | — (« 48 (D) » seulement) | — | 2,75 m | 3,05 m | [P1] p. 4 | **juin 2008 (ancien)** |
| Knauf KMA 22-120/48-35 et 160/48-35 | — | — | 2,75 m | 3,05 m | [K1] p. 93 | **2020, DTA 9/15-1023 expiré 31/10/2021** |
| Pladur SA 120 / SD 160, M48-35 | — | 2,55 m | 2,75 m | 3,05 m | [L1] p. 62 | **août 2017, DTA 9/15-1008** |

**État : confirmé (2 sources en vigueur : Siniat DTA V5 2026 + fiches Placo 2025), cohérent avec Knauf et Pladur.**
La valeur 3,05 m des documents anciens est devenue **3,00 m** dans les documents en vigueur (Siniat 2026, Placo 2025) :
on retient 3,00 m.

Conséquence pour la fiche : une séparative M48 a **par défaut des montants doublés à 0,60** (2,75 m) puis **doublés
à 0,40** jusqu'à 3,00 m ; au-delà, M70 / M90 (voir §2). Les montants simples ne sont admis qu'à 0,40 (2,55 m) ou
avec un montant plus large. Les doublés sont **solidarisés tous les 60 cm** (Siniat : vis RT 421 « tous les 60 cm en
quinconce », [S1] §2.4.3.2) ou **tous les 40 cm** (Placo : « vis TRPF 13 réparties au pas de 0,40 m », [P1] p. 6).
→ **contradiction (pas de solidarisation 0,60 Siniat / 0,40 Placo 2008)**, sans effet sur la commande (une boîte).

## 2. Systèmes par marque

Légende hauteurs : ] = montants simples, ][ = montants doublés (accolés dos à dos), entraxe en m.

### 2.1 Placo (Placostil SAA / SAD)

| Système | Plaques par face | Montants | Rail / profilé de départ | Isolant | Vide entre parements | Hauteurs | Feu | RA (Rw+C) | Sources | État |
|---|---|---|---|---|---|---|---|---|---|---|
| SAA 120 | 2 BA13 | M48 doublés, deux lignes alternées | **1 rail R70** haut et bas | FDES 2024 : PAR Phonic 60 mm (fiche INIES) ou 70 mm (titre du PDF) ; 2008 : 45 mm | 70 mm | ][ 0,60 : 2,75 ; ][ 0,40 : 3,00 | EI 60 (PV RS 09-091 + ext 21/2) | **56 dB** (CSTB AC19-26080037) ; Rw(C;Ctr) 58 (−2 ; −9) | [P3] FDES 38669 (2024) ; [P2] fiches sp00011594 / sp00011592 (2025, extraits) ; [P1] (2008 : 58 dB) | confirmé 2 sources (FDES + fiche), même éditeur ; acoustique 2008 dépassée |
| SAA 140 | 2 BA13 | **M70 simples**, alternés | 1 rail R90 | 85 mm | 90 mm | « max 3,25 m » (nom de la FDES) ; 2008 : ] 0,60 2,95 / ] 0,40 3,20 / ][ 0,60 3,50 / ][ 0,40 3,85 | EI 60 | **58 dB** (CSTB AC23-15802) | [P4] FDES 38670 (2024) ; [P1] | 1 source en vigueur pour 3,25 m ; tableau complet seulement 2008 → à confirmer (raison : fiche système 403) |
| SAA 160 | 2 BA13 | M70 ou M90 alternés | rail R90 (M70) ou **cornières CR2** (M90) | 85 mm | 110 mm | 2008 : M90 ] 0,60 3,40 … ][ 0,40 4,50 ; 2025 : 4,05 m (M90 ][ 0,60) | EI 60 | 61 dB (Activ'Air, M70 0,40) | recherche/03 (extraits) ; [P1] | 1 source en vigueur |
| SAD 160 | 2 BA13 | M48, deux ossatures indépendantes | **2 rails R48** | 2 × 45 mm | 110 mm | ] 0,40 : 2,55 ; ][ 0,60 : 2,75 ; (][ 0,40 : 3,05 en 2008) | EI 60 | 61 dB (Activ'Air) ; 2008 : 62 dB | [P2] sp00021607, sp00011564 ; [P1] | confirmé 2 sources (fiche 2025 + Siniat DTA même ossature) |
| SAD 160 Duo'Tech 25 | 1 Duo'Tech 25 (0,90 m) | M48 à 0,90 | 2 rails R48 | 2 × 45 PAR Phonic Tech | — | 2,50 m (FDES) ; ][ 0,90 : 2,85 (fiche sp00020927) | EI 60 | **66 dB** (CEBTP BEE2.9.6037-2) | [P5] FDES 42217 (2025) ; [P2] | 2 sources même éditeur |
| SAD 180 (2 + 3) | 2 BA13 d'un côté, 3 de l'autre | M48 doublés | 2 rails R48 | 2 × 45 mm | 118 mm | ][ 0,60 : 2,75 ; « max 3,00 m » (FDES = ][ 0,40) | EI 60 (assimilé) | **63 dB** (CSTB AC19-26080037) ; Rw 65 (−2 ; −8) | [P6] FDES 38671 (2024) ; [P2] sp00018886 | confirmé 2 sources même éditeur |
| SAD 180 (3 + 3) | 3 BA13 | M48 doublés | 2 rails R48 | 2 × 45 | 105 mm | ][ 0,60 : 3,05 | EI 60 | 66 dB | [P2] sp00011547 (extrait) ; [P1] 2008 : ][ 0,60 2,75 / ][ 0,40 3,05, 67 dB | contradiction (3,05 à 0,60 en 2025 / à 0,40 en 2008) → à confirmer sur la fiche |
| SAD 200 | 2 BA13 + 2/3 | M70 | 2 rails R70 | 2 × 45 | 138 mm | 2008 : ][ 0,60 3,50 ; ][ 0,40 3,85 | EI 60 | 2008 : 64-65 dB | [P1] seul | à confirmer (aucune source en vigueur) |
| SAD 220 (3 + 3) | 3 BA13 | **M70 doublés** | 2 rails R70 | 2 × 70 mm | 145 mm | « max 3,90 m » | EI 60 | **67 dB** (simulation) ; Rw 70 (−3 ; −8) | [P7] FDES 38672 (2024) ; [P1] 2008 : ][ 0,60 3,95 ? | 1 source en vigueur |
| SAD 260 (3 + 3) | 3 BA13 | M90 doublés | 2 rails R90 | 2 × 85 | 185 mm | 2008 : ][ 0,60 4,55 ; ][ 0,40 5,05 | 2 h (Placoflam 3 h) | 69 dB | [P1] seul | à confirmer (2008) |

### 2.2 Siniat (Prégymétal S, S TWIN ; DTA 9/11-922_V5 valide du 02/09/2026)

Le DTA couvre **les deux montages** : « 2 lignes de rails ou cornières **ou un rail commun** aux 2 lignes de
montants » ; montants « alignés » (vide ≥ 2 cm entre files) ou « en quinconce, décalés d'un demi-entraxe » ([S1]
§2.2.1, §2.4.3.2). Siniat ne vend donc pas un nom « SAA » : sa S120 sur rail commun est l'équivalent.

| Système | Plaques | Montants | Hauteurs (m) | Feu | Rw+C | Sources | État |
|---|---|---|---|---|---|---|---|
| S120 (2+2 BA13) | 2 BA13 / face | M48-35 | ] 0,40 2,55 ; ][ 0,60 2,75 ; ][ 0,40 3,00 | EI 60 à EI 120 selon plaques (PV Efectis 07-A-009, « S120 à S180 – 4 Prégyplac Std BA13 ») | non lu (le DTA renvoie au rapport CSTB RE AC23-15896 sans en recopier les valeurs BA13) | [S1] tableau 7, §2.10.1 | hauteurs : confirmé (DTA en vigueur + fiches Placo 2025) ; Rw+C : à confirmer (rapport non lu) |
| S145 (3+3 BA13) | 3 / face | M48-35 | ] 0,60 2,55 ; ] 0,40 2,85 ; ][ 0,60 3,05 ; ][ 0,40 3,35 | selon PV 07-A-009 (non détaillé) | — | [S1] tableau 7 | 1 source (DTA) |
| S180 (2+2 BA13) | 2 / face | M90-50 | ] 0,60 3,55 ; ][ 0,60 4,20 ; ] 0,40 3,90 ; ][ 0,40 4,65 | EI 60 | 60 dB | [S2] fiche pi79436 (25/09/2026) ; [S1] tableau 7 (M90-50 : 3,55 / 3,90 / 4,20 / 4,65) | **confirmé 2 sources (fiche + DTA)** |
| S180 (2+3 BA13) | 2 + 3 | M48-50 **accolés** | ][ 0,60 2,95 ; ][ 0,40 3,25 | EI 60 | 63 dB (simulation) | [S3] fiche pi80743 (21/09/2026) ; [S1] tableau 7 (M48-50 ][ : 2,95 / 3,25) | **confirmé 2 sources** |
| S195 (3+3) | 3 / face | M90-50 | ] 0,60 3,95 ; ][ 0,60 4,00 ; ][ 0,40 4,50 | EI 120 | 65 dB | recherche/03 [S35] | 1 source |
| S205 (3+3) | 3 / face | M48-35 ][ | 3,00 | EI 120 | 67 dB | recherche/03 [S36] | 1 source |
| S120 TWIN BA25 S | 1 Prégytwin BA25 S (0,90 m) / face | M48-35 | ] 0,90 2,50 ; ] 0,45 2,95 ; ][ 0,90 2,95 ; ][ 0,45 3,50 | EI 60 | 61 dB | [S4] fiche pi79823 (23/09/2026) | 1 source |
| S140 TWIN UP BA18 S, S180 TWIN BA25 S | voir recherche/03 [S37, S38] | | | | 61 / 67 dB | | 1 source |

### 2.3 Knauf (KMA, « Knauf Métal Acoustique »)

Source unique trouvée : **catalogue Plaquiste/Plafiste 2020** [K1], qui renvoie au DTA 9/15-1023 (validité
31/10/2021) et au DTA 9/15-1004_V1 (31/03/2022). **Documents expirés** : les chiffres ci-dessous servent seulement à
recouper ; knauf.fr répond 403 et aucune fiche KMA en vigueur n'a été lue. État de toute la section : **à confirmer
(raison : source unique de 2020, DTA expiré)**, sauf là où Siniat 2026 / Placo 2025 donnent le même chiffre.

| Système | Plaques | Montants / départ | Vide | Laine | Hauteurs (m) ] 0,60 / ] 0,40 / ][ 0,60 / ][ 0,40 | RA | Feu |
|---|---|---|---|---|---|---|---|
| KMA 22-120/48-35 | 2 KS 13 / face | M48-35 ; **rail 70** (alternée) | 70 | 70 | — / — / 2,75 / 3,05 | 57 (simulation) | EI 60 (PV Efectis 08-A-036) |
| KMA 22-140/70-35 | 2 KS 13 | M70-35 ; rail 90 | 90 | 70 | 2,85 / 3,15 / 3,40 / 3,75 | 58 | EI 60 |
| KMA 22-160/48-35 | 2 KS 13 | M48-35 ; **2 rails de 48** (double) | 110 | 2 × 45 | — / — / 2,75 / 3,05 | 61 | EI 60 |
| KMA 22-160/90-35 | 2 KS 13 | M90-35 ; cornières | 110 | 2 × 45 | 3,30 / 3,65 / 3,95 / 4,35 | 61 | EI 60 |
| KMA 23-180/48-35 | 2 + 3 KS 13 | M48-35 ; 2 rails de 48 | 117,5 | 2 × 45 | — / — / 2,75 / 3,05 | 64 (CSTB AC12-26039554) ; Rw 66 (−2 ; −8) | EI 60 |
| KMA 33-200/48-35 | 3 + 3 KS 13 | M48 ; 2 rails de 48 | 125 | 2 × 45 | — / — / 3,10 / 3,40 | 67 | EI 60 ; KF : EI 120 |
| KMA 33-220/70-35 | 3 + 3 | M70 ; 2 rails de 70 | 145 | 70 | 3,20 / 3,55 / 3,80 / 4,20 | 67 | EI 60 |
| KMA 11 (KS 25, KA 18 Phonik, KA 25 Phonik+) | 1 plaque 0,90 m / face | M48 à M150 | — | 45 à 2 × 100 | entraxes 0,90 / 0,45 (ex. KA 25 Phonik+ 160/48 : 2,50 / 2,75 / 2,75 / 3,25 avec M48-35) | 55 à 68 | EI 60 |

Recoupement : KMA 22-120/48 et 160/48 donnent les mêmes hauteurs que Placo 2008 et Pladur 2017 (2,75 / 3,05), et
3,05 → 3,00 dans les documents 2025-2026 (Siniat, Placo). Désignation Knauf : `KMA 22-160/48-35` = 2 plaques par
parement, 160 mm, montant 48/35 ([K1] p. 91). Dispositions acoustiques Knauf : « bande résiliente ou mastic sous rail
ou sous cornière en pied de cloison et mastic en pied de cloison sous les plaques » ([K1] p. 91).

### 2.4 Pladur (Métal SA / SD, DTA 9/15-1008 et 9/15-1015 ; Mémento août 2017)

| Système | Plaques | Montants | Hauteurs (m) ] 0,60 / ] 0,40 / ][ 0,60 / ][ 0,40 (parement double) | Rw+C | Feu | Source | État |
|---|---|---|---|---|---|---|---|
| SA 120/48, SD 160/48 | 2 BA13 / face | M48-35 | — / 2,55 / 2,75 / 3,05 | SA 120 : 56 (CSTB AC15-26057814) ; SD 160 : 59 (simulation) | EI 60 (PV Efectis EFR 14-J-002357, hauteur ≤ 4 m) | [L1] p. 62-63 | 1 source (2017), recoupe Siniat 2026 sauf ][ 0,40 |
| SA 140/70, SD 210/70 | 2 BA13 | M70-37 | 2,90 / 3,25 / 3,50 / 3,85 | — | EI 60 | [L1] | 1 source |
| SD 180/48 | 2 + 3 BA13 | M48 | — | 63 | EI 60 | [L1] | 1 source |
| SD 180/48, SD 200/48 | 3 + 3 BA13 | M48 | (parement triple) ][ 0,60 3,10 ; ][ 0,40 3,40 | 65 ; 67 | EI 60 | [L1] | 1 source |

Pladur : rails ou « rails cornières » ; quantitatif de la SD (§3.4). Mémento de 2017 : à remplacer par un document
en vigueur si on le trouve (raison : pas de version plus récente lue).

### 2.5 Fermacell

Pas de cloison séparative de logement Fermacell lue (voir §6, « Ce qui reste incertain »).

## 3. Quantités par m² publiées

### 3.1 Les FDES Placo 2024-2025 (PDF lus en entier : quantités « incluant les chutes »)

FDES = quantités pour 1 m² de cloison, chutes comprises (taux de perte déclarés : 5 % métal et plaques, 2 % laine,
10 % ruban résilient). Elles ne donnent pas la longueur de cloison de référence.

| Composant / m² | SAA 120 (2+2, M48 « doubles 400 mm », R70) [P3] | SAA 140 (2+2, M70 « simple 400 mm », R90) [P4] | SAD 180 (2+3, M48 « doubles 400 mm », 2 × R48) [P6] | SAD 220 (3+3, M70 « doubles 600 mm », 2 × R70) [P7] | SAD 160 Duo'Tech 25 (1+1, M48 à 0,90) [P5] |
|---|---|---|---|---|---|
| Plaques | 4,20 m² BA13 | 4,20 m² | 5,25 m² | 6,30 m² | 2,10 m² Duo'Tech 25 |
| Montants | 6,80 ml M48 | 3,30 ml M70 | 10,50 ml M48 | 10,00 ml M70 | 3,15 ml M48 |
| Rails | 1,15 ml R70 | 1,15 ml R90 | 1,60 ml R48 | 1,60 ml R70 | 1,68 ml R48 |
| Isolant | 1,02 m² PAR Phonic 60/70 | 1,02 m² PAR Phonic 85 | 2,04 m² PAR Phonic 45 (2 couches) | 2,04 m² PAR Phonic 70 (2 couches) | 2,04 m² PAR Phonic Tech 45 |
| Ruban résilient | 0,58 ml | 0,58 ml | 0,80 ml | 0,80 ml | — (mastic acrylique 100 cm³) |
| Vis plaques TTPC 25/35 | 32 u | 32 u | 40 u | 48 u | 12,6 u (TTPC 35) |
| Vis profilés (TRPF) | 9,96 u | 1,86 u | 15,09 u | 14,50 u | 2,86 u |
| Chevilles de fixation | 1,86 u | 1,86 u | 2,59 u | 2,59 u | 2,86 u |
| Enduit (poudre PR4) | 0,69 kg | 0,69 kg | 0,69 kg | 0,69 kg | 0,92 kg |
| Bande | 2,58 ml | 2,58 ml | 2,58 ml | 2,58 ml | 3,44 ml |

Lecture : les vis plaques font **8 par m² de plaque** dans les trois FDES BA13 (32 / 4, 40 / 5, 48 / 6) ; le ruban
résilient fait **la moitié de la longueur de rail** (0,58 / 1,15 ; 0,80 / 1,60) : il n'est compté que sous les rails
bas. **Incohérence interne de libellé** : « M48 doubles entraxe 400 » donne 6,80 ml (SAA 120) mais 10,50 ml (SAD 180)
et « M70 doubles entraxe 600 » donne 10,00 ml (SAD 220). Le calcul (2 files × 2 montants ÷ entraxe × 1,05) donne
7,0 ml à 0,60 et 10,5 ml à 0,40 : **SAA 120 = doublés à 0,60 ; SAD 180 et SAD 220 = doublés à 0,40** (le libellé de
la SAA 120 et de la SAD 220 est faux, les quantités sont justes). Même rapport, même éditeur (ELYS, PLAC063 / 091).

### 3.2 Placo, B01 003 b « Cloisons séparatives Placostil SAA et SAD » (juin 2008), quantitatif pour H = 2,60 m

| Composant / m² | SAA 120 | SAA 140 | SAD 160 | SAA 180 (2+3) | SAD 260 (3+3) |
|---|---|---|---|---|---|
| Plaques | 4,20 | 4,20 | 4,20 | 5,25 | 6,30 |
| Rails | 1,15 | 1,15 | 1,60 | 1,60 | 1,60 |
| Montants | 7 | 3,30 | 7 | 7 | 7 |
| Vis TTPC 25 | 6 | 6 | 6 | 6 | 6 |
| Vis TTPC 35 | 20 | 20 | 20 | 13 | 6 |
| Vis TTPC 45 | — | — | — | 10 | 20 |
| Vis TRPF | 10 | 2 | 10 | 10 | 10 |
| Ruban résilient Placoplatre | 0,80 m | 0,80 | 1,60 | 1,60 | 1,60 |
| Mastic plastique | 100 cm³ | 100 | 100 | 100 | 100 |
| Bande PP | 2,80 m | | | | |
| Enduit poudre / pâte | 0,66 kg / 1,45 kg | | | | |

Document ancien (2008) : utilisé **seulement** là où une source en vigueur donne la même valeur (plaques, rails,
montants : identiques dans les FDES 2024). Le ruban (0,80 / 1,60, haut ET bas) est **remplacé** par la règle en
vigueur (sous rail bas seulement, §3.4). [P1]

### 3.3 Autres quantitatifs

| Source | Système | Plaques | Montants (ml/m²) | Rails (ml/m²) | Isolant | Vis 1re peau | Vis 2e peau | TRPF | Bande |
|---|---|---|---|---|---|---|---|---|---|
| [V1] SNIP fiche 18 (déc. 2024), « séparative 180, double rail », L 4 m × H 2,50 | 2+2 M48 | 4,20 | ] 0,60 4,20 ; ] 0,40 5,78 ; ][ 0,60 7,35 ; ][ 0,40 10,50 | 1,68 | 1,05 / couche | 12 / 16 / 15 / 21 | 30 / 37 / 35 / 47 | 4 / 5 / 10 / 14 | 3,47 |
| [V1] SNIP, « séparative 120, rail unique en périphérie » | 2+2 M48 | 4,20 | 3,15 / 4,73 / 6,30 / 9,45 | **1,37** (périmètre) | 1,05 | idem | idem | idem | 3,47 |
| [V1] SNIP, « séparative 180, 2 BA13 / 3 BA13, double cornière », M70 | 2+3 | 5,25 | 3,68 / 5,25 / 6,83 / 9,98 | cornière 2,21 | 1,05 / couche | (voir SNIP p. 7) | | | |
| [L1] Pladur Mémento 2017, S160 / S180, H 2,5 et 3 m, entraxe 0,60 | 2+2 | 4,2 | ] 3,50 ; ][ 7,00 | 1,68 (H 2,5) ; 1,40 (H 3) | — | PM 25 : 41 (]) / 68 (][) | PM 35 : 81 / 136 (S160) ; 61 / 102 + PM 45 41 / 68 (S180) | MM 2 / 3 | 3,50 / 3,27 |

Pladur compte des vis au pas de 0,25-0,30 m sur toutes les peaux (autre méthode, déjà notée en recherche/13 C1) :
gardé comme borne haute, jamais retenu.

### 3.4 Synthèse des quantités, avec l'état de chaque chiffre

| Donnée | Valeur retenue | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
|---|---|---|---|---|---|---|
| Plaques 2 + 2 / 2 + 3 / 3 + 3 | 4,20 / 5,25 / 6,30 | m²/m² | [P3][P6][P7] FDES Placo 2024 | [V1] SNIP 2024 ; [L1] Pladur 4,2 | **confirmé (2 sources)** | = faces × plaques × 1,05 |
| Montants M48 doublés 0,60 (deux files) | ≈ 7,0 | ml/m² | [P3] FDES SAA 120 : 6,80 ; [P1] 7 | [L1] Pladur ][ 0,60 : 7,00 ; [V1] SNIP 6,30 (rail unique) / 7,35 (double rail) | **confirmé (2 fabricants)** | formule : 2 files × 2 × (L/0,60 + 1) × 1,05 |
| Montants M48 doublés 0,40 | 10,5 | ml/m² | [P6] FDES SAD 180 : 10,50 | [V1] SNIP double rail ][ 0,40 : 10,50 | **confirmé (2 sources)** | |
| Montants simples 0,60 (M70, M90) | ≈ 3,3-3,5 | ml/m² | [P4] FDES SAA 140 : 3,30 | [L1] Pladur ] 0,60 : 3,50 | **confirmé (2 fabricants)** | interdit en M48 (§1) |
| Rails SAD (2 files, haut + bas) | 4 × L × 1,05 (= 1,60 ml/m² à 2,60 m) | ml | [P6][P7] FDES 1,60 | [L1] Pladur 1,68 / 1,40 ; [V1] SNIP 1,68 | **confirmé (2 sources)** | = formule actuelle de la fiche |
| Rails SAA (1 rail large, haut + bas **+ départs verticaux**) | (2 × L + 2 × H) × 1,05 | ml | [V1] SNIP « rail unique sur toute la périphérie » 1,37 (L 4 × H 2,5 : (8 + 5) ÷ 10 × 1,05 = 1,365) | [P3][P4] FDES 1,15 ; [P1] 1,15 (périmètre d'une cloison plus longue) | **confirmé (2 sources)** | la fiche ne compte que 2 × L : il manque les deux rails verticaux de départ |
| Largeur du rail SAA | R70 avec M48 ; R90 avec M70 ; cornières CR2 avec M90 | — | [P1] p. 1 ; [P3][P4] | [K1] KMA 22-120/48 rail 70, 140/70 rail 90, 160/90 cornières | **confirmé (2 fabricants)** | |
| Ruban / bande résiliente sous rail **bas** (et pas en tête) | L × files × 1,05 → rouleaux de 15 m (Placo) ou 30 m (Tramiband) | ml | [S1] Siniat DTA V5 §2.4.2.1 : résilient sous les rails au sol ; « fixation haute et en départ de mur : … résilient qui n'est pas nécessaire » | [P3][P6] FDES 2024 : ruban = ½ des rails ; [K1] « sous rail en pied de cloison » | **confirmé (3 fabricants)** | Règle changée par rapport à Placo 2008 (haut et bas) |
| Ruban résilient Placo | « Ruban Résilient 45 », 45 mm × 4 mm × 15 m, boîte de 10, réf. H94960015 ; « Ruban Résilient 20 » réf. H94800015 | rouleau | [N1] fiche Placo copiée par BigMat (mise à jour 18/12/2023) | [N2] extrait moteur placo.fr fichetechnique-ruban-rsilient-45 / -20 (MAJ 31/03/2026) | **confirmé (2 sources, même éditeur)** | largeur pour un rail R70 / R90 : à confirmer |
| Résilient Siniat | mousse adhésive à cellules fermées 5 mm, ou bande Phaltex 10 mm | — | [S1] §2.4.2.1 | — | 1 source | |
| Mastic en pied (sous / contre les plaques) | joint mastic acrylique à la pompe entre dernière plaque et sol, les deux faces | — | [S1] §2.4.2.2 | [K1] « mastic en pied de cloison sous les plaques » ; [P1] | **règle confirmée (3 fabricants)** | |
| Quantité de mastic | 100 cm³/m² → cartouches de 310 ml | cm³/m² | [P1] Placo 2008 | [P5] FDES SAD 160 Duo'Tech 2025 : 100 cm³ | **1 source (Placo, deux éditions)** | ≈ 1 cartouche pour 3 m² de cloison |
| Isolant | 1,05 m² par couche ; SAA : 1 couche ; SAD : 1 ou 2 couches selon le système écrit | m²/m² | [V1] SNIP « par couche » 1,05 | [P3] 1,02 (1 couche) ; [P6][P7] 2,04 (2 couches) | **confirmé (2 sources)** | épaisseur lue au devis (45, 2 × 45, 70, 85, 2 × 70) |
| Vis TRPF, montants M48 doublés 0,60 | 10 | u/m² | [V1] SNIP ][ 0,60 : 10 | [P1] Placo SAA 120 / SAD 160 : 10 ; [P3] FDES 9,96 | **confirmé (2 sources)** | doublés 0,40 : 14 (SNIP seul ; FDES SAD 180 : 15,09) → **confirmé (2 sources)** |
| Vis TRPF, montants simples (SAA 140) | 2 | u/m² | [P1] 2 ; [P4] FDES 1,86 | [V1] SNIP simples 0,60 : 4 | contradiction (méthode : SNIP visse aussi les montants au rail en double rail) | garder 4 (valeur haute) |
| Vis plaques, 2 + 2 BA13, doublés 0,60 | SNIP : 15 (1re) + 35 (2e) = 50 ; Placo : 32 (FDES 2024) ; 26 (2008) | u/m² | [V1] | [P3] | **contradiction (méthode)** : Siniat visse la 1re peau à 0,60 et la 2e à 0,30 ([S1] tableau 7 du §2.4.3.3), « en quinconce d'un montant à l'autre » sur les doublés, ce qui donne l'ordre de grandeur Placo ; le SNIP compte chaque montant doublé | proposition : garder le SNIP **de la colonne du montage** (une boîte de 1000 couvre 20 à 30 m²) ; à confirmer |
| Vis 3e peau (TTPC 45) | 2+3 : 10 ; 3+3 : 20 | u/m² | [P1] 2008 | — | 1 source (ancienne) | vissage triple parement 0,90 / 0,60 / 0,30 ([S1]) |
| Vis plaques par m² de plaque (Placo) | 8 | u/m² de plaque | [P3][P6][P7] FDES 2024 | — | 1 source (Placo, 3 FDES) | ordre de grandeur |
| Fixations des rails | pas 0,60 m maxi | — | [S1] §2.4.3.1 « entraxe maximum des fixations … 60 cm » | [P1] « au pas de 0,60 m maxi » ; [P3] 1,86 chevilles/m² ; [P6] 2,59 | **confirmé (2 sources)** | = règle actuelle de la fiche |
| Solidarisation des montants doublés | vis tous les 0,60 m (Siniat RT 421) ou 0,40 m (Placo TRPF 13) | — | [S1] §2.4.3.2 | [P1] p. 6 | contradiction (pas) | déjà dans les TRPF/m² |
| Entretoises, pontets, goussets en SAD | **aucun** : « aucune liaison n'est présente entre les ossatures » | — | [S1] §2.1 et §2.2.1 | [P1] « Les cloisons SAD ne nécessitent pas d'autres dispositions particulières que celles relatives aux fixations des rails » (liaison ponctuelle en pied seulement pour une SAD en nez de dalle) | **confirmé (2 sources)** | Fermacell : éclisses à chaque tiers seulement pour sa cloison « installations techniques » ([F1] §7.6), pas une séparative |
| Bande à joint | 2,80 (Placo) ; 2,58 (FDES) ; 3,47 (SNIP) ; 3,27-3,50 (Pladur) | ml/m² | [P1] 2,80 | [P3] 2,58 | **confirmé** : seule la dernière peau de chaque face est jointoyée, comme la 98/48 → **garder 2,80** | |
| Enduit poudre | 0,66-0,69 | kg/m² | [P1] 0,66 | [P3] 0,69 ; [L1] 0,7 | **confirmé (2 fabricants)** | = valeur actuelle |
| Bourrage avant-dernier parement en tête et en jonction (étanchéité à l'air) | Prégycolle 120 (pas de quantité) | — | [S1] §2.4.2.2 | — | 1 source, non chiffré | pas de ligne |

## 4. Ce que le négoce attend sur la ligne

| Article | Désignation au comptoir | Exemple | Source |
|---|---|---|---|
| Plaques | type, épaisseur, largeur, longueur | « Placoplatre BA13 1,20 × 2,60 » | fiche actuelle |
| Montants | largeur / aile, longueur, marque | « Montant Stil M48 3,00 m » ; Siniat « M48-35 », « M48-50 » ; Knauf « M 48-35 » | [P3] ; [S3] ; [K1] |
| Rails SAA | le rail LARGE, pas le rail des montants | « Rail Stil R70 3 m » (SAA 120), « R90 » (SAA 140) ; Knauf « Rail 70 » | [P3][P4] ; [K1] |
| Rails SAD | rail de la largeur des montants, en double quantité | « Rail Stil R48 3 m » ; Knauf « 2 rails de 48 » | [P6] ; [K1] |
| Cornières (SAA M90, Knauf M70-M100) | « Cornière Stil CR2 » ; Knauf « cornière 30/50 » | | [P1] ; [K1] p. 96 |
| Ruban résilient | « Ruban Résilient 45 Placo, 15 m (boîte de 10) » réf. H94960015 ; ou bande résiliente Tramiband 45 × 3 × 30 m | | [N1] ; FICHE (accessoires, ligne « Bande résiliente sous rail ») [R05 E] |
| Laine | marque, épaisseur, en panneaux ou rouleaux semi-rigides « avec garantie de non-tassement » | « PAR Phonic 45 », « 2 × 45 » | [P1] p. 2 ; [P3] |
| Mastic | « mastic acrylique, cartouche 310 ml » | | [S1] ; recherche/05 |
| Ce qui fait foi | le **nom du système** (SAA 120, SAD 180, KMA 22-160/48-35, S180) et son PV : le comptoir chiffre la composition de la fiche système, pas un mélange | | [P1] p. 4 (« montages conformes aux procès-verbaux ») ; [K1] p. 35 (« système 100 % Knauf ») |

## 5. Ce qu'il faut changer dans la fiche

| N° | Élément (`cloison-separative`) | Valeur actuelle de la fiche | Valeur proposée | Sources | État |
|---|---|---|---|---|---|
| 1 | Montants M48 : simples ou doublés | `(L / 0,60 + 1) × files_montants (2) × 1,05` : deux files de montants **simples à 0,60** | **doublés** : `(L / e + 1) × 2 files × 2 × 1,05`, e = 0,60 par défaut (H ≤ 2,75 m), 0,40 de 2,75 à 3,00 m ; au-delà de 3,00 m en M48 : ligne « à vérifier » (M70 / M90 selon la fiche système). Exemple L 5 m × H 2,60 : 20 montants → **40** (Placo : 7 ml/m² × 13 m² = 91 ml ≈ 35 montants de 2,59 m) | §1 : [S1] DTA Siniat 2026, [P2] Placo 2025, [K1], [L1] ; §3.4 | **confirmé (2 sources en vigueur)** |
| 2 | Hauteurs limites (M48, 2+2) | aucune | ][ 0,60 : 2,75 ; ][ 0,40 : 3,00 ; ] 0,40 : 2,55 ; ] 0,60 : interdit | [S1] ; [P2] | confirmé (2 sources) |
| 3 | Montants quand le devis écrit un système à M70 / M90 | M48 toujours (« Montants M48 ») | lire le système : SAA 140 = M70 **simples** (R90) ; SAA 160 = M70 / M90 ; SAD 220 = M70 doublés (R70) ; S180 Siniat = M90-50 ; sinon M48 doublés | [P4][P7] FDES ; [P1] ; [S2] | 2 sources pour SAA 140 et SAD 220 (FDES + B01) ; le reste 1 source |
| 4 | Rails SAA | `L × 2 × 1 file × 1,05`, désignation « rails de 3 m (largeur selon le système) » | `(2 × L + 2 × H) × 1,05` (rail sur toute la périphérie, départs compris), **rail R70** (M48) / **R90** (M70), jamais R48 | [V1] SNIP ; [P3][P4] ; [K1] | confirmé (2 sources) |
| 5 | Rails SAD | `L × 2 × 2 files × 1,05` | inchangé ; largeur = celle des montants (R48 / R70 / R90) | [P6][P7] ; [L1] ; [V1] | confirmé |
| 6 | Bande résiliente sous rail | non comptée dans l'ouvrage (FICHE, accessoires : « 1 ml par ml de rail posé contre le gros œuvre ») | **dans l'ouvrage, d'office** (le système l'exige) : `L × files × 1,05` (rails **bas** seulement), rouleaux de 15 m (Placo Ruban Résilient 45) ; règle « 1 ml par ml de rail » à restreindre aux rails bas pour une séparative | [S1] ; [P3][P6] ; [K1] | confirmé (3 fabricants) |
| 7 | Mastic acrylique en pied | absent | joint mastic en pied des deux faces : `S × 100 cm³ ÷ 310 ml` cartouches, orange « quantité à confirmer » | [S1] (règle) ; [P1][P5] (quantité) | règle confirmée ; quantité 1 source |
| 8 | Isolant | `S × 1,05` (une couche) | `S × 1,05 × couches`, couches = 1 (SAA, SAD « 1 × 70 / 85 ») ou 2 (« 2 × 45 », « 2 × 70 ») selon le devis ; question si non écrit | [V1] ; [P3][P6][P7] | confirmé (2 sources) |
| 9 | Plaques 2 + 3 et 3 + 3 | `plaques_par_face = 2` fixe | lire « 2 + 3 » (SAD 180, KMA 23, S180 2+3) et « 3 + 3 » (SAD 220, S195, S205) : 5,25 / 6,30 m²/m² ; vis de 3e peau TTPC 45 | [P6][P7] ; [P1] ; [K1] | confirmé (2 sources) ; TTPC 45 : 1 source |
| 10 | Vis TTPC 1re / 2e peau | 12 / 30 (SNIP, simples 0,60) | **colonne du montage** : doublés 0,60 → 15 / 35 ; doublés 0,40 → 21 / 47 ; simples 0,40 → 16 / 37 | [V1] SNIP ; Placo plus bas ([P3] 32 au total) | à confirmer (contradiction de méthode, valeur haute gardée) |
| 11 | Vis TRPF | 4 (simples 0,60) | doublés 0,60 → **10** ; doublés 0,40 → **14** ; simples (M70) → 4 | [V1] ; [P1] 10 ; [P3] 9,96 ; [P6] 15,09 | confirmé (2 sources) |
| 12 | Entretoises / goussets en SAD | non comptés | **aucun** (rien à ajouter) | [S1] ; [P1] | confirmé (2 sources) |
| 13 | Bande / enduit | 2,80 ml ; 0,66 kg | inchangé | [P1] ; [P3] ; [L1] | confirmé |
| 14 | Question `type_separative` | SAA / SAD | garder ; la lire d'abord dans le nom du système (« SAA », « SAD », « KMA 22-120/48 » rail 70 = alternée, « KMA 22-160/48 » 2 rails = double, Siniat « S » + « rail commun » = alternée, sinon double ; Pladur « SA » / « SD ») | [K1] ; [S1] ; [L1] | confirmé |
| 15 | Mention de performance | — | ne jamais déduire le système du 53 dB : DnT,A ≥ 53 dB est l'exigence **en œuvre** (déjà dit, recherche/03) ; les systèmes courants vont de RA 56 (SAA 120) à 67 dB (SAD 220) | [P3][P7] | confirmé |

## 6. Ce qui reste incertain

1. **Knauf en vigueur** : seul le catalogue 2020 (DTA 9/15-1023 expiré 2021) a été lu. Un listing tiers cite un
   DTA 9/15-1004_V4 du 24/03/2023 valable jusqu'au 28/02/2030 ; knauf.com et media.knauf.com refusent la lecture
   (403 / page HTML). Le quantitatif Knauf « p. 501 » n'est pas dans le fichier téléchargé. → à confirmer.
2. **Vis plaques d'une séparative** : SNIP 50 / Placo 32 (doublés 0,60). La règle de vissage Siniat en vigueur
   (600 / 300, quinconce sur les doublés) explique l'écart, mais aucun fabricant ne publie le chiffre au m² de sa
   propre règle à part Placo. On garde le SNIP (valeur haute).
3. **Libellés des FDES Placo** : « entraxe 400 » / « 600 » contredits par les quantités de la même FDES (§3.1). Les
   quantités sont prises, les libellés ne le sont pas.
4. **SAD 180 3+3 Placo** : 3,05 m à 0,60 (fiche 2025, extrait) contre 3,05 m à 0,40 (2008). Fiche système non lisible (403).
5. **SAA 140 / 160 / 180, SAD 200 / 260 Placo** : hauteurs complètes seulement en 2008, sauf « max 3,25 m » (SAA 140,
   FDES 2024) et 4,05 m (SAA 160, extrait 2025).
6. **Acoustique Siniat S120 BA13** : rapport CSTB RE AC23-15896 cité par le DTA, valeurs non lues.
7. **Largeur du ruban** sous un rail R70 / R90 (le Ruban Résilient 45 couvre un R48) : aucune source.
8. **Quantité de mastic** (100 cm³/m²) : Placo seul.
9. **Fermacell** : le guide 2012 ([F1]) décrit des cloisons « à ossature parallèle », sans tableau de séparative entre
   logements français (hauteurs, RA) ; aucune fiche en vigueur trouvée. Pas de système Fermacell à proposer.
10. **Pladur** : Mémento 2017 seul (DTA 9/15-1008) ; pas de version en vigueur lue.

## Bilan

- Chiffres relevés : environ 190 (tableaux des systèmes §1-§2 et quantités §3) ; chiffres utiles à la fiche : 27 (§3.4).
- Confirmés par 2 sources indépendantes (dont un fabricant, un DTA/DTA-CSTB ou une FDES) : 19 sur 27 — plaques,
  montants doublés 0,60 et 0,40, montants simples M70, rails SAD, rails SAA (périmètre), largeur du rail SAA, règle du
  résilient sous rail bas, règle du mastic en pied, isolant par couche, TRPF doublés 0,60 et 0,40, pas de fixation,
  absence d'entretoises, bande, enduit, hauteurs M48 (4 valeurs).
- 1 source : ruban Placo (même éditeur, 2 documents), quantité de mastic, vis de 3e peau, vis par m² de plaque (Placo),
  résilient Siniat (nature).
- À confirmer / contradiction : vis plaques (méthode), TRPF des montants simples, pas de solidarisation (0,60 / 0,40),
  Knauf en vigueur, largeur du ruban sous R70 / R90, hauteurs Placo hors M48, acoustique Siniat S120 BA13, Fermacell.

Où j'en suis : 7 recherches web, 4 lectures web ; tous les sujets demandés sont traités ; Knauf en vigueur et
Fermacell restent ouverts faute de document lisible.

## Sources

| Réf. | Document | Éditeur | Date du document | Consulté |
|---|---|---|---|---|
| S1 | DTA n° 9/11-922_V5 « Cloisons séparatives PREGYMETAL S et S TWIN », https://media.siniat.fr/pi42095/original/991616172/siniat---dta---cloisons-separatives-pregymetal-s---cstb-9_11_922_v3 (PDF lu en entier, 34 p. ; l'adresse dit « v3 » mais le document servi est la **V5**) | CSTB / Siniat (Etex) | valide du 02/09/2026 | 20/11/2026 |
| S2 | Fiche « Cloison Prégymétal S180 EI60 60 dB M90-50 », https://siniat.fr/-/print2pdf/system/pi79436/siniat-fiche-technique/fr-fr/cloison-pregymetal-s180---ei60---60db---m90-50---isolant.pdf | Siniat | 25/09/2026 | 20/11/2026 |
| S3 | Fiche « Cloison Prégymétal S180 2+3 BA13 Std EI60 63 dB M48-50 », https://www.siniat.fr/-/print2pdf/system/pi80743/siniat-fiche-technique/fr-fr/cloison-pregymetal-s180-2-3-ba13-std-ei60-63db-m48-50-isolant-85-mm.pdf | Siniat | 21/09/2026 | 20/11/2026 |
| S4 | Fiche « Cloison Prégymétal S120 TWIN BA25 S EI60 61 dB M48-35 », https://siniat.fr/-/print2pdf/system/pi79823/siniat-fiche-technique/fr-fr/cloison-pregymetal-s120-twin-ba25-s---ei60---61db---m48-35---isolant.pdf | Siniat | 23/09/2026 | 20/11/2026 |
| P1 | B01 003 b « Cloisons séparatives Placostil SAA et SAD » (mise en œuvre, caractéristiques, quantitatif), fichier déjà téléchargé `scratchpad/r18/gp.txt` (recherche/18) | Placo (Placoplatre) | juin 2008 (**ancien**, utilisé seulement en recoupement) | 20/11/2026 |
| P2 | Fiches système Placo, extraits moteur (placo.fr 403) : sp00011594 (SAA 120, 17/10/2025), sp00011592, sp00011564, sp00018886 (SAD 180 2+3), sp00011547 (SAD 180 3+3), sp00021607 (SAD 160), sp00020927 (SAD 160 Duo'Tech), https://www.placo.fr/documents/fiche-systeme/ | Placo | 2023-2025 | 20/11/2026 |
| P3 | FDES « Cloison séparative Placostil SAA 120 – 2x BA13 – EI60 – 56 dB – max 3,00 m – PAR Phonic », n° 20240638669, https://www.base-inies.fr/api/Produit/38669 ; PDF https://www.base-inies.fr/api/Document/93503/download | Placo, vérif. ELYS | vérifiée 19/06/2024, valide au 31/12/2029 | 20/11/2026 |
| P4 | FDES « SAA 140 – 2x BA13 – EI60 – 58 dB – max 3,25 m – PAR Phonic 85 », n° 2024…38670, /api/Produit/38670 ; PDF /api/Document/95436/download | Placo | 23/07/2024 | 20/11/2026 |
| P5 | FDES « Cloisons – SAD160 – 1x Duo'Tech 25 / face – Stil M48 – 0,90 m – EI60 – 66 dB – 2,50 m », /api/Produit/42217 ; PDF /api/Document/108388/download | Placo | 23/04/2025 | 20/11/2026 |
| P6 | FDES « SAD 180 – 2+3x BA13 – EI60 – 63 dB – max 3,00 m – PAR Phonic 2x45 », n° 20240638671, /api/Produit/38671 ; PDF /api/Document/93511/download | Placo | 19/06/2024 | 20/11/2026 |
| P7 | FDES « SAD 220 – 3x BA13 – EI60 – 67 dB – max 3,90 m – PAR Phonic 2x70 », /api/Produit/38672 ; PDF /api/Document/93507/download | Placo | 18-19/06/2024 | 20/11/2026 |
| K1 | Catalogue « Plaquiste / Plafiste 2020 », p. 43-46 (guide de choix) et 91-99 (KMA), fichier déjà téléchargé `scratchpad/cf/kn/k3.txt` | Knauf | 2020 (DTA cités expirés en 2021-2022) | 20/11/2026 |
| L1 | Mémento Pladur « Plafonds, cloisons, doublages », p. 61-64 et glossaire, fichier déjà téléchargé `scratchpad/pdf/mem.txt` | Pladur Gypsum | août 2017 | 20/11/2026 |
| V1 | SNIP, fiche conseil n° 18 « Quantitatifs estimés », p. 6-7, `scratchpad/snip/snip18.txt` (recherche/13) | SNIP | décembre 2024 | 20/11/2026 |
| N1 | « Ruban résilient 45 », fiche Placo copiée par BigMat, https://medias.bigmat.fr/data_medias/medias_finaux/documents/3496250213418-YBOTXm17Vk.pdf | Placo (copie négoce BigMat) | mise à jour 18/12/2023 | 20/11/2026 |
| N2 | Fiches Placo « Ruban résilient 45 » et « 20 », extraits moteur : https://www.placo.fr/documents/fiche-technique/fichetechnique-ruban-rsilient-45.pdf , https://www.placo.fr/documents/fiche-produit/ficheproduit-ruban-rsilient-20.pdf | Placo | MAJ 31/03/2026 (extrait) | 20/11/2026 |
| F1 | « Guide de prescription et mise en œuvre, plaque Fermacell fibres-gypse », https://cdn.chausson.fr/catalog-document/02550c9b-d95f-48e4-a3d6-ac1949526784/guide-de-prescription-et-mise-en-oeuvre-plaque-fermacell-fibres-gypse.pdf | Fermacell (copie Chausson) | état 01/2012 (**ancien**) | 20/11/2026 |
| X | Recherches antérieures relues, non refaites : recherche/03 (§2.1 exigence DnT,A ≥ 53 dB, fiches Siniat S195 / S205 / S140 Twin / S180 Twin), 13 (C1-C3), 15 (n° 3), 16 (Y4b), 19 (§2) | — | — | — |
