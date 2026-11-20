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
| SAA 120 | 2 BA13 | M48 doublés, deux lignes alternées | **1 rail R70** haut et bas | 45 à 70 mm (FDES 2024 : PAR Phonic 60-70) | 70 mm | ][ 0,60 : 2,75 ; ][ 0,40 : 3,00 | EI 60 (PV RS 09-091 + ext 21/2) | **56 dB** (CSTB AC19-26080037) ; Rw(C;Ctr) 58 (−2 ; −9) | [P3] FDES 38669 (2024) ; [P2] fiches sp00011594 / sp00011592 (2025, extraits) ; [P1] (2008 : 58 dB) | confirmé 2 sources (FDES + fiche), même éditeur ; acoustique 2008 dépassée |
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

