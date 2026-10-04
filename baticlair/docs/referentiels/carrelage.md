# Référentiel quantitatif CARRELAGE (Rappidos)

Oct 3, 2026 · @Greg

Ce référentiel est le tiroir `referentiels/carrelage/` du moteur générique (gabarit section 27 du référentiel couverture). Il ne contient que des données : aucune ligne de code moteur ne doit porter un mot de ce métier. Toute valeur non sourcée est marquée *(à vérifier)* et listée au chapitre 11.

## 1. Métier et axes de variation

**Métier** : carreleur, revêtements durs de sols et murs intérieurs et extérieurs collés ou scellés (carrelage céramique, grès cérame, faïence, pierre naturelle, mosaïque), avec les travaux associés : préparation du support (primaire, ragréage), protection à l'eau (SPEC/SEL), désolidarisation, joints, plinthes, profilés, seuils. Hors périmètre : chape fluide anhydrite coulée par entreprise spécialisée, parquet, sols souples, résine.

**Normes pivots** : NF DTU 52.2 (pose collée), NF DTU 52.1 (pose scellée), NF DTU 52.10 (sous-couches isolantes), CPT 3265/3529 (SPEC), CPT 3267 (plancher chauffant) — détails chapitre 5.

**Fiche d'identité `metier.json`**

```json
{
  "id": "carrelage",
  "libelle": "Carrelage - revêtements durs",
  "version": "0.1.0",
  "normes": ["NF DTU 52.2", "NF DTU 52.1", "NF DTU 52.10", "CPT 3265_V2", "CPT 3529_V4"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "moyen",
    "type_batiment": "faible",
    "neuf_renovation": "fort",
    "gamme": "fort"
  },
  "unite_commande_interdite": ["m2"],
  "questions_max": 4
}
```

| Axe | Poids | Ce qu'il change dans la commande | Exemple |
| --- | --- | --- | --- |
| neuf\_renovation | **fort** | Préparation du support : primaire, ragréage, dépose, pose sur ancien carrelage (colle C2 + primaire d'accrochage) | Réno sur ancien carrelage : +1 primaire spécial + colle C2 S1 au lieu de C2 |
| gamme / format | **fort** | Format du carreau → colle (simple ou double encollage, peigne), perte, nombre de cartons, croisillons/calage | 60×60 rectifié : double encollage, perte 10 % ; 120×60 : peigne 10 mm + croisillons autonivelants |
| epoque\_bati | moyen | Support ancien (plancher bois, chape fragile, carrelage existant) → désolidarisation, ragréage plus épais | Plancher bois : panneau CTB-X ou natte + colle déformable S1 |
| type\_batiment | faible | Locaux P3/P4 (ERP, commerces) → classement UPEC carreau et épaisseur colle ; logement = P2/P3 | ERP : SPEC sol obligatoire dans les zones lavées au jet |
| geographie | faible | Extérieur en zone gel (Est, montagne) : carreau ingélif, colle C2 S1 / S2, double encollage systématique ; aucune autre variation régionale | Terrasse en Alsace vs à Marseille : même carreau, mais colle et pente imposées hors gel en Alsace |

Conséquence moteur : la question région n'est posée que si le devis contient un ouvrage **extérieur**. Le département connu par l'adresse du chantier suffit dans 100 % des cas restants.

## 2. Règle d'or et unités de commande

**Règle d'or** : le m² est une unité de *calcul*, jamais une unité de *commande*. Le carreau se commande en **cartons entiers**, la colle et le joint en **sacs**, le SPEC en **seaux**, les profilés en **barres**. Chaque ligne de sortie porte : article, quantité entière, unité de commande, et entre parenthèses la surface ou le ml couverts.

**Deuxième règle, propre au carrelage** : le m² par carton dépend du produit, pas du format. Deux 60×60 peuvent faire 1,44 m² ou 1,08 m² par carton. Le moteur prend le m²/carton dans cet ordre : (1) la référence du devis si elle porte le conditionnement, (2) le catalogue fournisseur connecté, (3) la valeur par défaut du format (chapitre 4.1) affichée comme hypothèse.

**Troisième règle** : un même lot (tonalité/calibre) pour tout le chantier. On arrondit toujours au carton supérieur, et on ajoute la réserve d'entretien (chapitre 6) parce que le client ne retrouvera jamais le même bain.

| Famille | Unité de calcul | Unité de commande | Arrondi |
| --- | --- | --- | --- |
| Carreaux sol / mur | m² | carton (m²/carton du produit) ; palette si > 1 palette | carton entier supérieur |
| Plinthes | ml | carton ou boîte de N pièces (ex. 8×60 : pièces de 0,60 m) | carton entier |
| Mosaïque | m² | boîte de N plaques (plaque \~30×30) | boîte entière |
| Mortier-colle poudre | kg | sac 25 kg (parfois 15 ou 5 kg) | sac entier |
| Colle en pâte (mur) | kg | seau (souvent 5, 15 ou 25 kg) *(à vérifier)* | seau entier |
| Mortier de joint ciment | kg | sac 5 kg ou 25 kg | sac entier |
| Joint époxy | kg | kit / seau 5 kg | kit entier |
| SPEC liquide | kg | seau 7 kg ou 20 kg, ou kit 6 m² | seau entier |
| Bande d'angle SPEC | ml | rouleau (5 m, 10 m, 50 m selon marque) | rouleau entier |
| Natte de désolidarisation | m² | rouleau 5 m² ou 30 m² (largeur 1 m) | rouleau entier |
| Primaire | kg ou L | bidon / seau (1, 5, 12, 25 kg selon marque) | bidon entier |
| Ragréage | kg | sac 25 kg | sac entier |
| Profilés (finition, nez de marche, seuil) | ml | barre 2,50 m (standard) ou 3 m | barre entière |
| Croisillons / cales | u | sachet (100 à 1000 pièces) | sachet entier |
| Silicone sanitaire | ml de joint | cartouche 300 ou 310 ml | cartouche entière |
| Mortier de pose scellée | kg | sac 25 ou 35 kg ; sable + ciment en vrac / big bag | sac entier |

## 3. Ouvrages, vocabulaire des devis et pièges

Chaque ouvrage ci-dessous est une entrée de `ouvrages.json`. L'IA rattache chaque ligne du devis à un ouvrage via `vocabulaire.json` ; un mot inconnu déclenche une question, jamais une supposition.

| Id ouvrage | Ce que l'artisan réalise | Expressions courantes dans les devis | Pièges |
| --- | --- | --- | --- |
| `sol_colle_int` | Carrelage de sol intérieur collé | « fourniture et pose carrelage sol », « grès cérame 60×60 rectifié », « carrelage pièce de vie », « pose droite », « pose décalée », « pose en diagonale » | La diagonale et le point de Hongrie font grimper la perte (chapitre 5.2) ; « fourniture client » = ne pas commander le carreau, mais commander colle et joint |
| `mur_colle_int` | Faïence / carrelage mural intérieur | « faïence murale », « crédence », « carrelage mural salle de bains », « toute hauteur », « h = 2,10 m » | « toute hauteur » sans hauteur : demander ou prendre 2,50 m ; déduire porte et fenêtre seulement si > 1 m² |
| `douche_italienne` | Douche de plain-pied carrelée | « douche à l'italienne », « receveur à carreler », « caniveau », « siphon de sol », « pente 1 à 2 % » | Implique toujours SPEC sol + mur, bande d'angle, souvent receveur prêt-à-carreler (pièce à commander) et mosaïque ou petit format au sol |
| `sol_ext` | Terrasse, balcon, plage de piscine | « carrelage extérieur », « dalle 2 cm sur plots », « ingélif », « R11 », « terrasse » | Dalle 20 mm sur plots = pas de colle ni de joint, mais des plots (unité à la pièce) ; colle C2 S1 minimum et double encollage systématique en pose collée |
| `plinthes` | Plinthes carrelées | « plinthes assorties », « plinthes à talon », « ml de plinthes », « plinthes découpées dans le carreau » | « découpées dans le carreau » : ajouter le ml en carreaux, pas de plinthes à commander |
| `escalier` | Marches et contremarches | « habillage escalier », « nez de marche », « 14 marches » | Compter en marches, pas en m² : 1 nez de marche (profilé ou pièce spéciale) par marche |
| `prep_ragreage` | Ragréage autolissant | « ragréage », « lissage », « mise à niveau », « P3 » | L'épaisseur est rarement écrite : défaut 3 mm (chapitre 6) ; toujours un primaire avant |
| `prep_primaire` | Primaire d'accrochage ou bouche-pores | « primaire d'accrochage », « primaire sur ancien carrelage », « sur plâtre », « sur anhydrite » | Ancien carrelage = primaire spécial supports fermés, pas le même que sur chape |
| `spec` | Protection à l'eau sous carrelage | « SPEC », « SEL », « étanchéité sous carrelage », « Weber sys protec », « Mapelastic », « Kerdi » | Natte (Kerdi, Ditra) ≠ résine liquide : unités différentes (rouleau vs seau) |
| `desolidarisation` | Natte de désolidarisation | « natte Ditra », « désolidarisation », « sur plancher bois », « sur ancien carrelage fissuré » | Elle se colle avec un mortier-colle : ajouter la colle sous la natte (peigne 3 ou 4 mm) |
| `scelle` | Pose scellée traditionnelle | « pose scellée », « sur chape de pose », « au mortier », « tomettes », « pierre naturelle épaisse » | Mortier de pose 3 à 5 cm à quantifier en sacs ou sable + ciment ; barbotine |
| `depose` | Dépose de l'ancien revêtement | « dépose carrelage », « piquage », « évacuation gravats », « benne » | Hors matériaux à commander ; mais conserver : elle signale un support à préparer (ragréage) |
| `joints_silicone` | Joints souples périphériques | « joint silicone », « joint mastic », « jonctions baignoire » | ml = périmètre de la baignoire / receveur + angles verticaux de la douche |

Mots qui changent la nature de la commande : « rectifié » (joint 2 mm, croisillons fins), « grand format » ou « XXL » (≥ 60×120 : colle spéciale, système de calage, perte majorée), « fourni par le client » (aucun carreau), « sur plancher chauffant » (colle S1 et joint flexible), « extérieur » (ingélif, colle C2 S1, joint adapté).

## 4. Matériaux et fiches fabricant

Toutes les consommations ci-dessous sont transcrites des fiches techniques fabricant (lien dans chaque ligne). Les valeurs Weber servent de **référence nationale** ; un artisan qui utilise une autre marque surcharge la valeur au niveau artisan (gabarit 27.1). Règle reprise du modèle couverture : le conditionnement de `materiaux.json` vient d'une fiche négoce quand elle existe, car c'est le négoce qui livre.

### 4.1 Carreaux (conditionnement par défaut si le devis ne le donne pas)

Le m²/carton est propre à chaque produit. Ce tableau ne sert que de valeur par défaut, affichée comme hypothèse.

| Format (cm) | Épaisseur courante | m²/carton par défaut | Pièces/carton | Poids/m² | Source |
| --- | --- | --- | --- | --- | --- |
| 60×60 rectifié | 9,5 mm | 1,44 | 4 | ≈ 20 kg | [Brico Dépôt LOU 60×60](https://www.bricodepot.fr/p/3660827059628/carrelage-de-sol-interieur-gres-cerame-60x60-lou-gris) : carton 1,44 m², palette 30 cartons = 43,20 m² ; poids : [Bricomarché Ceram 60×60](https://www.bricomarche.com/p/sol-et-mur-interieur-invisible-60x60-1.44m2/bte/8429991455804) 29,3 kg emballé pour 1,44 m² |
| 60×120 rectifié | 8,5 à 9 mm | 1,44 | 2 | ≈ 20 kg *(à vérifier)* | [Brico Dépôt Calacatta 60×120](https://www.bricodepot.fr/p/4262537230053/media.bricodepot.fr) : palette 36 cartons = 51,84 m² |
| 30×60 | 9 mm | 1,44 *(à vérifier)* | 8 | ≈ 20 kg *(à vérifier)* | — |
| 45×45 | 8 mm | 1,62 *(à vérifier)* | 8 | ≈ 18 kg *(à vérifier)* | — |
| 33×33 | 8 mm | 1,31 *(à vérifier)* | 12 | ≈ 18 kg *(à vérifier)* | — |
| Faïence 25×40 / 20×50 / 30×60 | 7 à 9 mm | 1,00 à 1,50 *(à vérifier)* | variable | ≈ 15 kg *(à vérifier)* | — |
| Métro 7,5×15 / 10×20 | 7 mm | 0,50 à 1,00 *(à vérifier)* | variable | ≈ 14 kg *(à vérifier)* | — |
| Mosaïque plaque 30×30 | 4 à 6 mm | 1 plaque = 0,09 m² ; boîte de 10 ou 11 plaques *(à vérifier)* | — | — | — |
| Dalle extérieure 60×60 ép. 20 mm | 20 mm | 0,72 *(à vérifier)* | 2 | ≈ 45 kg *(à vérifier)* | — |
| Plinthe 8×60 (ou 7×60, 9,5×60) | 8 à 10 mm | en ml : 0,60 ml/pièce ; carton 12 à 20 pièces *(à vérifier)* | — | — | — |

### 4.2 Mortiers-colles (référence : weber.col flex éco, C2S1 ET)

Sac 25 kg, palette 48 sacs (1 200 kg), palette 107×107 cm ([IDF Matériaux](https://www.idfmateriaux.paris/weber-col-flex-eco-blanc-sac-25-kg-weber-c2x33391595)). Épaisseur après pose 2 à 10 mm ([Gedimat](https://www.gedimat.fr/mortier-colle-pour-carrelage-webercol-flex-eco-gris-sac-de-25kg-weber,1605711,12,81,335.htm)).

| Surface du carreau | Peigne (taloche crantée) | Simple encollage | Double encollage | Source |
| --- | --- | --- | --- | --- |
| ≤ 500 cm² | dents carrées 6×6×6 mm | 3 kg/m² | 4,5 kg/m² | [Matériaux Online, fiche Weber](https://materiauxonline.fr/produit/Weber_Col_Flex_Eco_Gris_25kg) |
| > 500 cm² | dents carrées 9×9×9 mm | 4 kg/m² | 5,5 kg/m² | idem |
| > 500 cm² | demi-lune 20×8 mm | 5 kg/m² | 6,5 kg/m² | idem |
| Consistance fluide, sol, ≤ 1 200 cm² | 9×9×9 mm | 4 kg/m² | — | [CGMat, weber.col flex](https://www.cgmat.fr/colles-en-poudre/502-webercol-flex-25kg-webercol-flex-3388751196126.html) |
| Consistance fluide, sol, > 1 200 cm² | demi-lune 20×8 mm | 5 kg/m² | — | idem |
| Sous natte de désolidarisation | 3×3 ou 4×4 mm | 1,5 kg/m² *(à vérifier)* | — | peigne : [Leroy Merlin, Schlüter-DITRA](https://www.leroymerlin.fr/produits/natte-de-desolidarisation-et-etancheite-schluter-ditra-5ml-88151830.html) |

Autres colles du marché (pour surcharge artisan) : la fiche Vicat transcrite donne 3,5 à 4,5 kg/m² en simple encollage et 5 à 8 kg/m² en double ([Vicat via mon-carrelage.com](https://www.mon-carrelage.com/BD_images/P8137.pdf)) ; le guide Parexlanko retient 7 kg/m² minimum en double encollage pour les cas exigeants ([Guide du carreleur Parexlanko](<https://www.parexlanko.com/uploads/resources/Thu%20Apr%2014%202022%2011:08:33%20GMT+0200%20(Central%20European%20Summer%20Time)-GUIDE-CARRELEUR-250322-web%20BD.pdf>)).

Classe de colle à commander (NF EN 12004) : C1 mur intérieur sec ; C2 sol intérieur courant ; C2 S1 sur plancher chauffant, extérieur, grands formats, ancien carrelage, bois ; colle en pâte (D1/D2) sur plaque de plâtre ou carreaux de plâtre en mur.

### 4.3 Mortiers de joint

| Produit | Largeur de joint | Densité | Conditionnement | Consommation | Source |
| --- | --- | --- | --- | --- | --- |
| weber.joint fin (ciment, intérieur) | 1 à 6 mm | 1,6 (mortier durci) | sac 5 kg (pack 4×5 kg, palette 144 sacs) ; sac 25 kg (palette 48) | 0,2 à 1,3 kg/m² | [Leroy Merlin](https://www.leroymerlin.fr/produits/joints-minces-carrelage-mural-blanc-pur-25-kg-weber-weberjoint-fin-88143768.html), [Matériaux Online](https://materiauxonline.fr/produit/Weber_Joint_Fin_Gris_Perle_5kg) |
| weber.joint intégral (sol, rectifiés, ext.) | jusqu'à large | 1,8 | sac 5 kg | 0,1 à 2 kg/m² | [Materiauxnet](https://www.materiauxnet.com/mortier-joint-carrelage-murs-sols-weber-joint-integral-5kg.html) |
| Vicat V650 joint fin premium | jusqu'à 10 mm | coefficient 0,14 (cm) | sac *(à vérifier)* | 30×30, joint 3 mm, prof. 10 mm = 0,28 kg/m² ; 60×60 = 0,14 kg/m² | [Fiche Vicat V650](https://www.vpi.vicat.fr/content/download/48395/448869/version/10/file/FT+JOINT+FIN+PREMIUM+V650_06.2026.pdf) |
| weber.joint poxy (époxy) | 2 à 15 mm | coefficient 0,16 (cm) | kit 5 kg | 0,3 à 1 kg/m² en joint | [Fiche weber.joint poxy](https://www.mybleurouge.com/catalogue/fiches_techniques_article/03536.pdf) |

### 4.4 Protection à l'eau sous carrelage (SPEC) et désolidarisation

| Produit | Consommation | Conditionnement | Accessoires | Source |
| --- | --- | --- | --- | --- |
| weber.sys protec (résine) | 2 couches croisées de 400 g/m² = 800 g/m² (film sec 0,5 mm) | seau 7 kg ; seau 20 kg (palette 24 seaux) ; kit 6 m² = 4,8 kg résine + 1 kg weber.prim RP + 5 m de bande BE14 | bande BE14 rouleau 5 m ; angle rentrant AR12, angle sortant AS12, platine PM12 ; recouvrement des bandes ≥ 5 cm | [Fiche Weber (Samse)](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1091512.pdf), [Avis technique 13/12-1153](https://batichimie-boval.com/wp-content/uploads/2020/09/2012_Avis_Technique_weber.sys_protec_n_13_12_1153.pdf), [Tessella, kit](https://www.tessella.fr/products/kit-d-etancheite-sys-protec-weber) |
| Schlüter-DITRA 25 (natte, SPEC + désolidarisation) | surface + recouvrement des lés (bande KEBA aux jonctions) | rouleau 1 m × 5 m (5 m²) ou 1 m × 30 m (30 m²), épaisseur 3 mm | bande KERDI-KEBA aux jonctions sol/mur, colle KERDI-COLL | [Batiproduits DITRA 25](https://www.batiproduits.com/fiche/produits/desolidarisation-sous-carrelage-en-renovation-in-p69084143.html), [Schlüter, fiche DITRA](https://eu.schluter.com/mediafiles/stream/fr_FR/48002) |

### 4.5 Préparation du support

| Produit | Consommation | Conditionnement | Domaine | Source |
| --- | --- | --- | --- | --- |
| weber.niv pro / elit / primo (ragréage autolissant) | ≈ 1,5 kg/m²/mm | sac 25 kg, palette 48 sacs (1 200 kg) | P2 : 1 à 10 mm ; P3 : 3 à 10 mm ; ponctuel 20 mm ; sous carrelage minimum 3 mm | [Fiche weber.niv pro](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_295609.pdf), [weber.niv elit](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3388750058135-xLGDgDceYc.pdf) |
| weber.prim RP (primaire bouche-pores) | 100 à 200 g/m² sur supports neufs | seaux 4, 12 et 25 kg *(à vérifier : liste tronquée dans l'avis technique)* ; bidon 1 kg dans le kit SPEC | supports poreux, avant ragréage et SPEC | [Avis technique sys protec](https://batichimie-boval.com/wp-content/uploads/2020/09/2012_Avis_Technique_weber.sys_protec_n_13_12_1153.pdf) |
| Primaire universel (ex. Vicat Prima Universel) | 50 à 150 g/m² | *(à vérifier)* | tous supports | [Fiche Vicat](https://www.mon-carrelage.com/BD_images/P8137.pdf) |
| Primaire supports fermés (ancien carrelage) : weber.prim AD / express | *(à vérifier)* | *(à vérifier)* | ancien carrelage, supports non poreux | cité dans [weber.niv elit](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3388750058135-xLGDgDceYc.pdf) |

### 4.6 Profilés, accessoires, consommables

| Article | Unité de commande | Valeur | Source |
| --- | --- | --- | --- |
| Profilé de finition (Schlüter-JOLLY et équivalents) | barre 2,50 m | hauteur à choisir = épaisseur du carreau : 6, 8, 10, 11, 12,5 mm | [Fiche Schlüter JOLLY](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_49891.pdf) |
| Nez de marche, barre de seuil | barre 2,50 m *(à vérifier selon marque)* | 1 par marche / par seuil | — |
| Croisillons 2, 3, 5 mm | sachet 100 à 1 000 pièces *(à vérifier)* | ≈ 3 à 4 par carreau posé en croix (chapitre 5) | — |
| Système de calage autonivelant (clips + coins) | sachet 100 ou 250 clips *(à vérifier)* | grands formats ≥ 60×60 | — |
| Silicone sanitaire | cartouche 300 / 310 ml *(à vérifier)* | ≈ 12 ml de joint par cartouche pour un cordon 6×6 mm *(à vérifier)* | — |
| Mortier de pose scellée (DTU 52.1) | sac 25/35 kg ou sable + ciment | *(à vérifier, chapitre 13)* | — |

## 5. Règles de calcul DTU, formules et pertes

Une règle = une fonction pure de `regles.json`, testable seule. Toutes les longueurs de carreau sont en mm, les surfaces en m², les masses en kg. Arrondi au conditionnement entier supérieur **à la toute fin**, jamais en cours de calcul.

### 5.1 Ce que dit la norme (valeurs extraites)

| Sujet | Règle retenue par l'app | Source |
| --- | --- | --- |
| Mode d'encollage, sol intérieur | Double encollage si surface du carreau > 1 100 cm², ou > 500 cm² pour un carreau peu poreux (grès cérame) | fiche Vicat citant NF DTU 52.2 ([lien](https://www.mon-carrelage.com/BD_images/P8137.pdf)) ; confirmé > 500 cm² au sol par [Angelino](https://angelino-carrelages.com/pose-et-technique/pose-carrelage-60x60/) |
| Mode d'encollage, mur intérieur | Double encollage si > 500 cm² | même fiche Vicat ; [Batirama](https://www.batirama.com/article/11424-nf-dtu-52.2-pose-collee-des-revetements-ceramiques-et-assimiles.html) : simple encollage en règle générale en mur |
| Mode d'encollage, sol et mur extérieurs | Double encollage systématique (mur extérieur : dès > 50 cm²) | fiche Vicat ; [Guide Parexlanko](<https://www.parexlanko.com/uploads/resources/Thu%20Apr%2014%202022%2011:08:33%20GMT+0200%20(Central%20European%20Summer%20Time)-GUIDE-CARRELEUR-250322-web%20BD.pdf>) |
| Exception colle fluide | Colle en consistance fluide au sol (ex. weber.col flex) : simple encollage admis jusqu'à 10 000 cm² | [fiche weber.col flex](https://www.cgmat.fr/colles-en-poudre/502-webercol-flex-25kg-webercol-flex-3388751196126.html) |
| Peigne | ≤ 500 cm² : U6/V6 ; 500 à 2 200 cm² : U9 ; au-delà : demi-lune 20 ou denture 12 mm | [Guide Parexlanko](<https://www.parexlanko.com/uploads/resources/Thu%20Apr%2014%202022%2011:08:33%20GMT+0200%20(Central%20European%20Summer%20Time)-GUIDE-CARRELEUR-250322-web%20BD.pdf>) |
| Largeur de joint mini | Pose à joint nul interdite. Rectifié (± 0,25 mm) : 2 mm. Pressé ≤ 500 cm² : 2 mm ; > 500 cm² : 3 mm. Extérieur : 5 mm *(à vérifier)* | NF DTU 52.2 § 7.3.5 cité sur [Forumconstruire](https://www.forumconstruire.com/construire/topic-251671.php) *(texte à confirmer sur la norme)* ; extérieur : [Espace Aubade](https://www.espace-aubade.fr/blog/carrelage/quelle-est-la-taille-ideale-des-joints-de-carrelage.html) |
| Planéité support | 5 mm sous la règle de 2 m ; au-delà : ragréage obligatoire | [Angelino](https://angelino-carrelages.com/pose-et-technique/pose-carrelage-60x60/) |
| Joints de fractionnement / périphériques | ≥ 5 mm, sur toute l'épaisseur colle + carrelage ; au droit des seuils de porte | [extrait DTU 52.2 (checkmy-house)](https://checkmy-house.fr/wp-content/uploads/2021/08/DTU-52.2.pdf) |
| Format maxi | Mur intérieur : 3 600 cm² en mortier-colle, 2 200 cm² en adhésif ; sol intérieur : jusqu'à 10 000 cm² sous conditions | [extrait DTU 52.2](https://checkmy-house.fr/wp-content/uploads/2021/08/DTU-52.2.pdf), [Batirama](https://www.batirama.com/article/11424-nf-dtu-52.2-pose-collee-des-revetements-ceramiques-et-assimiles.html) |

### 5.2 Carreaux

```latex
N_{cartons} = \left\lceil \frac{S \times (1 + p)}{m^2_{carton}} \right\rceil + N_{reserve}
```

S = surface du devis (déjà nette d'ouvertures dans 90 % des devis ; sinon, déduire les ouvertures > 1 m²). p = perte de coupe ci-dessous. N\_reserve = 1 carton si S ≥ 20 m², 0 sinon *(ratio à valider, chapitre 11)*.

| Pose | Perte p, carreau ≤ 45×45 | Perte p, carreau ≥ 60×60 |
| --- | --- | --- |
| Droite | 5 % | 8 % |
| Décalée (1/2, 1/3) | 8 % | 10 % |
| Diagonale | 12 % | 15 % |
| Chevron, point de Hongrie, opus | 15 % | 18 % |
| Majoration petite pièce (S < 5 m²) ou beaucoup d'angles | + 5 % | + 5 % |

Toutes ces pertes sont des usages de métier, **non normatives** : *(à vérifier par un carreleur, chapitre 11)*.

### 5.3 Mortier-colle

```latex
N_{sacs} = \left\lceil \frac{S \times c_{colle} \times 1{,}05}{25} \right\rceil
```

c\_colle = valeur du tableau 4.2 selon surface du carreau, peigne et mode d'encollage (5.1). 1,05 = reste au fond des seaux et rattrapages *(à vérifier)*. Colle sous natte : ajouter S × 1,5 kg/m² *(à vérifier)*.

### 5.4 Mortier de joint

```latex
c_{joint} = \frac{L + l}{L \times l} \times e \times j \times d \quad ; \quad N_{sacs} = \left\lceil \frac{S \times c_{joint} \times 1{,}10}{m_{sac}} \right\rceil
```

L, l, e (épaisseur) et j (largeur de joint) en mm ; c\_joint en kg/m². d = 1,5 pour un joint ciment (formule Weber : 1,5 × C × D × (A+B)/(A×B), [fiche weber.color premium](https://www.ma.weber/files/ma/2020-05/FTC-FR-P-webercolor-junta-premium.pdf)) ; d = 1,6 pour un époxy ([fiche weber.joint poxy](https://www.mybleurouge.com/catalogue/fiches_techniques_article/03536.pdf)). 1,10 = perte au lavage *(à vérifier)*. Contrôle : 60×60, e = 9,5, j = 2 → 0,095 kg/m² ; 30×30, e = 10, j = 3 → 0,30 kg/m² (Vicat publie 0,28 : écart < 10 %).

### 5.5 SPEC, désolidarisation, préparation

- **SPEC liquide** : kg = S\_spec × 0,8 × 1,05 ; seaux de 20 kg puis complément en 7 kg (minimiser le reste). S\_spec douche = sol de la douche + murs de la douche sur la hauteur protégée *(hauteur à vérifier CPT 3265 : 2 m par défaut)*.
- **Bande d'angle** : ml = jonctions sol/mur de la zone protégée + angles verticaux × hauteur protégée ; rouleaux = ⌈ml × 1,10 / longueur du rouleau⌉. Pièces d'angle : 1 par angle rentrant / sortant, 1 platine par traversée de tuyau.
- **Natte** : m² = S × 1,05 ; choisir 30 m² si S > 20 m², sinon rouleaux de 5 m².
- **Ragréage** : kg = S × e\_mm × 1,5 ; sacs 25 kg. **Primaire avant ragréage** : kg = S × 0,15.
- **Primaire avant SPEC** : kg = S\_spec × 0,15.

### 5.6 Linéaires et pièces

- **Plinthes** : ml = périmètre − 0,90 m par porte ; pièces = ⌈ml × 1,05 / 0,60⌉ ; cartons selon le conditionnement produit.
- **Profilés** : barres = ⌈ml / 2,50⌉ par hauteur de profilé (hauteur = épaisseur du carreau, arrondie au profilé supérieur : 6, 8, 10, 11, 12,5 mm).
- **Croisillons** : ≈ 1 par carreau en pose croisée ; nombre de carreaux = S / (L × l) ; sachets entiers *(à vérifier)*.
- **Calage autonivelant** (≥ 60×60) : ≈ 3 clips par carreau *(à vérifier)*.
- **Silicone** : cartouches = ⌈ml / 12⌉ *(à vérifier)*.

## 6. Valeurs par défaut et hypothèses à afficher

Quand le devis ne dit rien, le moteur applique ces défauts **et les affiche** sur la carte quantitatif, chacun avec un bouton pour le changer à la voix ou au doigt. Surcharge : référentiel → artisan → chantier.

| Paramètre | Défaut | Indexé par axe | Ligne affichée à l'artisan |
| --- | --- | --- | --- |
| Mode de pose | droite | — | « Pose droite (perte 5 %) » |
| Réserve d'entretien | 1 carton si S ≥ 20 m² | gamme | « + 1 carton de réserve pour le client » |
| m²/carton | tableau 4.1 selon format | gamme | « Carton supposé de 1,44 m² : vérifiez sur votre référence » |
| Épaisseur du carreau | 9,5 mm sol ; 8 mm mur | gamme | « Carreau de 9,5 mm » |
| Largeur de joint | 2 mm rectifié ; 3 mm pressé > 500 cm² ; 2 mm pressé ≤ 500 cm² ; 5 mm extérieur | — | « Joint de 2 mm » |
| Colle | C2 S1 sol ; C1 ou C2 mur ; pâte sur plaque de plâtre | neuf\_renovation, type\_batiment | « Colle C2 S1 (sol) » |
| Encollage | règle 5.1 | — | « Double encollage (carreau > 500 cm²) » |
| Ragréage | 0 en neuf ; 3 mm en rénovation si devis le mentionne sans épaisseur | neuf\_renovation, epoque\_bati | « Ragréage 3 mm » |
| Hauteur faïence « toute hauteur » | 2,50 m | — | « Hauteur 2,50 m » |
| Hauteur protégée SPEC douche | 2,00 m *(à vérifier CPT)* | — | « Étanchéité jusqu'à 2 m » |
| Portes déduites des plinthes | 1 porte de 0,90 m par pièce | — | « 1 porte déduite » |
| Couleur du joint et du silicone | gris (artisan choisit à l'envoi) | — | « Joint gris : à changer si besoin » |

Règle d'affichage : au plus 5 hypothèses visibles ; les autres repliées sous « Voir les hypothèses ».

## 7. Questions à poser (questions.json)

Quatre questions maximum, à boutons, jamais sur une quantité. Le moteur ne pose une question que si le devis ne contient pas la réponse ; l'ordre ci-dessous est l'ordre de priorité, classé par impact sur la commande.

| Ordre | Question (bouton) | Boutons | Posée si | Sensibilité sur la commande |
| --- | --- | --- | --- | --- |
| 1 | « Le carrelage, c'est vous qui le fournissez ? » | Oui / Non, le client | toujours, sauf mention explicite | 100 % des cartons (oui / rien) |
| 2 | « Comment vous le posez ? » | Droit / Décalé / Diagonale / Chevron | pose non écrite | carreaux : + 3 à + 13 % (de 5 % à 18 % de perte) |
| 3 | « On pose sur quoi ? » | Chape neuve / Ancien carrelage / Plancher bois / Je ne sais pas | ouvrage sol en rénovation | primaire + ragréage ou natte : 0 à + 30 % du coût hors carreau ; colle C2 → C2 S1 |
| 4 | « Le sol est-il chauffant ? » | Oui / Non | ouvrage sol, neuf, rien dans le devis | colle C2 → C2 S1, joint flexible : quantité ± 0 %, référence change |
| 5 | « C'est en extérieur ? » | Oui / Non | mot ambigu (« terrasse couverte », « véranda ») | colle × 1,3 (double encollage), joint × 2,5 (5 mm au lieu de 2) |
| 6 | « Quel carton ? » (photo de l'étiquette ou bouton 1,44 / 1,08 / autre) | boutons | m²/carton inconnu et carton par défaut incertain | jusqu'à ± 25 % de cartons |

Les questions 5 et 6 ne passent que si une des quatre premières est déjà résolue par le devis. « Je ne sais pas » applique le défaut le plus sûr (ancien carrelage → primaire spécial + C2 S1) et l'affiche.

## 8. Matériaux dominants par région

L'axe géographie est **faible** : le grès cérame et les colles ciment sont les mêmes partout. La région ne change la commande que dans trois cas, tous déclenchés par un ouvrage précis. Aucune ligne de ce chapitre n'est sourcée : tout est *(à vérifier par un carreleur de chaque zone)*.

| Zone | Ce qui change | Ouvrage déclencheur | Effet sur la commande |
| --- | --- | --- | --- |
| Zones de gel sévère : Grand Est, Bourgogne-Franche-Comté, Massif central, Alpes, Pyrénées, altitude > 600 m | Carreau ingélif obligatoire, colle C2 S1 (voire S2), joint adapté extérieur, double encollage | `sol_ext` | Colle × 1,3 ; alerte si la référence n'est pas ingélive |
| Sud-Est, Provence, Occitanie (rénovation) | Tomettes et terre cuite anciennes en dépose ; pose scellée encore courante en réno ; carreaux de ciment | `scelle`, `depose` | Active les règles de pose scellée (chapitre 13 : à compléter) |
| Bretagne, Pays de la Loire, littoral | Pierre naturelle (granit, ardoise en dallage) en extérieur et en réno | `sol_ext`, pierre | Colle pour pierre naturelle (blanche si pierre claire), joint adapté |
| Construction neuve, toutes régions | Chape fluide anhydrite très répandue sous plancher chauffant | `sol_colle_int` en neuf | Primaire spécial anhydrite obligatoire + colle S1 |
| DROM (Antilles, Réunion, Guyane) | Pas de gel, humidité et cyclones : règles locales non couvertes | tous | L'app affiche « hors référentiel » *(à traiter plus tard)* |

Conséquence moteur : `defauts.json` ne porte qu'une colonne région, `zone_gel` (oui/non), déduite du département du chantier. Liste des départements en zone de gel : *(à vérifier, chapitre 13)*.

## 9. Points singuliers et consommables

Tout ce qui se commande à la pièce ou au ml. Le moteur les déduit de l'ouvrage, sans question.

| Point singulier | Déclencheur dans le devis | À commander | Unité | Règle |
| --- | --- | --- | --- | --- |
| Douche à l'italienne | « italienne », « plain-pied » | receveur prêt-à-carreler ou forme de pente + siphon / caniveau | pièce | 1 par douche ; dimensions lues dans le devis, sinon question |
| Angle rentrant SPEC | douche, SPEC | angle rentrant (type AR12) | pièce | 4 par douche à 3 murs *(à vérifier)* |
| Angle sortant SPEC | muret de douche, niche | angle sortant (type AS12) | pièce | 2 par muret, 4 par niche *(à vérifier)* |
| Traversée de tuyau | douche, robinetterie murale | platine murale (type PM12) | pièce | 1 par sortie d'eau (mitigeur = 2, douchette = 1) *(à vérifier)* |
| Angle sortant de carrelage mural | « angles », « tablier », « niche » | profilé de finition, hauteur = épaisseur | barre 2,50 m | ml d'arêtes / 2,50 |
| Arrêt de carrelage à mi-hauteur | « crédence », « soubassement h = 1,20 » | profilé de finition | barre 2,50 m | longueur de l'arête |
| Seuil de porte, changement de revêtement | « seuil », « jonction parquet » | barre de seuil | barre | 1 par porte où le revêtement change |
| Marche d'escalier | « escalier », « n marches » | nez de marche + carreaux marche/contremarche | barre ou pièce | 1 nez par marche |
| Joint de fractionnement | grandes surfaces, extérieur | profilé de fractionnement | barre 2,50 m | *(règle de surface à vérifier DTU 52.2)* |
| Joint périphérique | toujours | bande périphérique de désolidarisation *(si chape)* | rouleau | périmètre ; sinon simple vide de 5 mm sans fourniture |
| Jonction baignoire / receveur / angles | « joint silicone » ou douche/bain | silicone sanitaire | cartouche | ml / 12 |
| Trappe de visite | « tablier baignoire » | trappe carrelable | pièce | 1 par tablier |

**Consommables de pose** (ligne optionnelle « petites fournitures », désactivable par l'artisan) : croisillons (sachets), clips et coins de calage (sachets), disques diamant Ø 125 mm (1 par chantier < 40 m², 2 au-delà *(à vérifier)*), éponges et pads de nettoyage du joint (1 lot par chantier), nettoyant de fin de chantier (bidon 1 L).

## 10. Cas de test (tests/)

Ces trois cas sont **synthétiques** : ils vérifient que le moteur applique bien les règles du chapitre 5, pas que les ratios sont justes. Ils seront remplacés par 10 devis réels anonymisés de carreleurs, avec ce qu'ils ont vraiment commandé (critère de bêta du gabarit : 10 cas réels dans la tolérance, 4 questions maximum, zéro question sur une quantité).

**carr-001 : séjour neuf, grès 60×60 rectifié, pose droite**

Calcul : 35 × 1,08 / 1,44 = 26,25 → 27 + 1 réserve = 28 cartons. Carreau 3 600 cm² > 2 200 → demi-lune 20, double encollage 6,5 kg/m² → 35 × 6,5 × 1,05 = 239 kg → 10 sacs. Joint 0,095 kg/m² × 35 × 1,10 = 3,7 kg → 1 sac de 5 kg. Plinthes (26 − 2 × 0,90) × 1,05 / 0,60 = 42,4 → 43 pièces.

```json
{
  "id": "carr-001",
  "source": "synthétique v0.1",
  "devis_pdf": null,
  "contexte": { "departement": "22", "neuf_renovation": "neuf", "support": "chape ciment", "chauffant": false },
  "lignes_devis": [
    { "ouvrage": "sol_colle_int", "surface_m2": 35, "format_mm": [600, 600], "epaisseur_mm": 9.5, "rectifie": true, "pose": "droite", "m2_carton": 1.44 },
    { "ouvrage": "plinthes", "perimetre_ml": 26, "portes": 2, "format_mm": [80, 600] }
  ],
  "attendu": [
    { "article": "grès cérame 60x60 rectifié", "quantite": 28, "unite": "carton 1,44 m²", "tolerance_pct": 4 },
    { "article": "mortier-colle C2 S1", "quantite": 10, "unite": "sac 25 kg", "tolerance_pct": 10 },
    { "article": "mortier de joint fin", "quantite": 1, "unite": "sac 5 kg", "tolerance_pct": 0 },
    { "article": "plinthe 8x60", "quantite": 43, "unite": "pièce", "tolerance_pct": 5 }
  ],
  "questions_max": 4
}
```

**carr-002 : salle de bains en rénovation, sol sur ancien carrelage, faïence, douche italienne**

Calcul : sol 6 × 1,05 / 1,62 = 3,9 → 4 cartons. Faïence 18 × 1,05 / 1,50 = 12,6 → 13 cartons. Colle : sol 45×45 (2 025 cm²) U9 double 5,5 kg/m² ; mur 25×40 (1 000 cm² > 500) U9 double 5,5 → (6 + 18) × 5,5 × 1,05 = 138,6 kg → 6 sacs. Joint 3 mm (pressés > 500 cm²) : sol 0,16 + mur 0,234 kg/m² → (0,96 + 4,21) × 1,10 = 5,7 kg → 2 sacs de 5 kg. Primaire ancien carrelage 6 × 0,15 = 0,9 kg → 1 bidon. SPEC : (1,08 + 2,1 × 2,0) × 0,8 × 1,05 = 4,4 kg → 1 seau de 7 kg. Bande : (2,1 + 2,0) × 1,10 = 4,5 ml → 1 rouleau de 5 m.

```json
{
  "id": "carr-002",
  "source": "synthétique v0.1",
  "devis_pdf": null,
  "contexte": { "departement": "35", "neuf_renovation": "renovation", "support": "ancien carrelage", "chauffant": false },
  "lignes_devis": [
    { "ouvrage": "sol_colle_int", "surface_m2": 6, "format_mm": [450, 450], "epaisseur_mm": 8, "rectifie": false, "pose": "droite", "m2_carton": 1.62 },
    { "ouvrage": "mur_colle_int", "surface_m2": 18, "format_mm": [250, 400], "epaisseur_mm": 8, "rectifie": false, "m2_carton": 1.5 },
    { "ouvrage": "douche_italienne", "dimensions_m": [1.2, 0.9], "murs_carreles": 2, "hauteur_spec_m": 2.0 }
  ],
  "attendu": [
    { "article": "carrelage sol 45x45", "quantite": 4, "unite": "carton 1,62 m²", "tolerance_pct": 0 },
    { "article": "faïence 25x40", "quantite": 13, "unite": "carton 1,50 m²", "tolerance_pct": 8 },
    { "article": "mortier-colle C2 S1", "quantite": 6, "unite": "sac 25 kg", "tolerance_pct": 17 },
    { "article": "mortier de joint fin", "quantite": 2, "unite": "sac 5 kg", "tolerance_pct": 0 },
    { "article": "primaire supports fermés", "quantite": 1, "unite": "bidon", "tolerance_pct": 0 },
    { "article": "SPEC résine", "quantite": 1, "unite": "seau 7 kg", "tolerance_pct": 0 },
    { "article": "bande d'angle SPEC", "quantite": 1, "unite": "rouleau 5 m", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

**carr-003 : terrasse collée sur dalle béton, zone de gel, 60×60 épaisseur 20 mm**

Calcul : 20 × 1,08 / 0,72 = 30 → 30 + 1 réserve = 31 cartons. Extérieur → double encollage systématique, demi-lune 6,5 kg/m² → 20 × 6,5 × 1,05 = 136,5 kg → 6 sacs. Joint extérieur 5 mm, e = 20 : 0,50 kg/m² × 20 × 1,10 = 11 kg → 3 sacs de 5 kg (moins de reste qu'un sac de 25 kg).

```json
{
  "id": "carr-003",
  "source": "synthétique v0.1",
  "devis_pdf": null,
  "contexte": { "departement": "67", "zone_gel": true, "neuf_renovation": "neuf", "support": "dalle béton" },
  "lignes_devis": [
    { "ouvrage": "sol_ext", "surface_m2": 20, "format_mm": [600, 600], "epaisseur_mm": 20, "rectifie": true, "pose": "droite", "m2_carton": 0.72, "mode": "collé" }
  ],
  "attendu": [
    { "article": "dalle grès 60x60 ép. 20 mm ingélive", "quantite": 31, "unite": "carton 0,72 m²", "tolerance_pct": 4 },
    { "article": "mortier-colle C2 S1", "quantite": 6, "unite": "sac 25 kg", "tolerance_pct": 17 },
    { "article": "mortier de joint extérieur", "quantite": 3, "unite": "sac 5 kg", "tolerance_pct": 0 }
  ],
  "alertes_attendues": ["vérifier que la référence est ingélive"],
  "questions_max": 4
}
```

## 11. Ratios à faire valider par un carreleur (ratios-a-valider.md)

À faire relire par un carreleur en activité, idéalement deux (un en neuf, un en rénovation). Classés par impact sur la commande.

| # | Ratio | Valeur actuelle | Impact si faux | Question à poser au carreleur |
| --- | --- | --- | --- | --- |
| 1 | Pertes de coupe par pose et format | 5 à 18 % (5.2) | ± 1 à 3 cartons sur 35 m² | « Sur 35 m² de 60×60 en pose droite, combien de cartons tu commandes en vrai ? » |
| 2 | Réserve d'entretien | 1 carton si S ≥ 20 m² | ± 1 carton | « Tu laisses des cartons au client ? Combien ? » |
| 3 | Peigne et kg/m² pour 60×60 et plus | demi-lune 20, 6,5 kg/m² en double | ± 2 sacs sur 35 m² | « Quel peigne pour du 60×60, et combien de sacs pour 35 m² ? » |
| 4 | Seuil double encollage au sol | > 500 cm² (grès) | colle × 1,4 | « À partir de quel format tu beurres le dos ? » |
| 5 | Largeur de joint par défaut | 2 / 3 / 5 mm | joint × 2,5 | « Joint de combien sur rectifié, sur non rectifié, dehors ? » |
| 6 | Majorations colle 1,05 et joint 1,10 | — | ± 1 sac | « Il te reste combien de colle en fin de chantier ? » |
| 7 | Hauteur protégée SPEC douche | 2,00 m | ± 1 seau | « Tu montes l'étanchéité jusqu'où dans une douche ? » |
| 8 | Pièces d'angle et platines SPEC par douche | 2-4 et 2 | ± quelques pièces | « Pour une douche d'angle, combien d'angles et de platines ? » |
| 9 | Colle sous natte | 1,5 kg/m² | ± 1 sac | « Combien de colle pour coller la natte ? » |
| 10 | Croisillons, clips, silicone, disques | 5.6 et 9 | faible | « Combien de sachets de croisillons pour 30 m² ? » |
| 11 | m²/carton par défaut hors 60×60 | tableau 4.1 | ± 25 % de cartons | « Tes formats courants : combien de m² par carton chez ton négoce ? » |
| 12 | Départements en zone de gel | à établir | colle et référence en extérieur | « Dans ta zone, tu considères qu'il gèle ? » |

## 12. Sources officielles

Pages effectivement ouvertes ou lues pour ce référentiel. Les DTU complets sont payants (AFNOR / CSTB) : les extraits cités viennent de fabricants ou de sites qui les reproduisent, à confirmer sur le texte officiel.

| Source | Ce qu'on y a pris |
| --- | --- |
| [Batirama, NF DTU 52.2](https://www.batirama.com/article/11424-nf-dtu-52.2-pose-collee-des-revetements-ceramiques-et-assimiles.html) | Structure du DTU, simple encollage en mur intérieur, double encollage en mur extérieur > 50 cm² |
| [Extrait DTU 52.2 (checkmy-house)](https://checkmy-house.fr/wp-content/uploads/2021/08/DTU-52.2.pdf) | Planéité 5 mm / 2 m, formats maxi 3 600 / 2 200 cm², joints de fractionnement ≥ 5 mm |
| [Guide du carreleur Parexlanko](<https://www.parexlanko.com/uploads/resources/Thu%20Apr%2014%202022%2011:08:33%20GMT+0200%20(Central%20European%20Summer%20Time)-GUIDE-CARRELEUR-250322-web%20BD.pdf>) | Peignes U6/V6 et U9 par format, 7 kg/m² mini en double encollage exigeant |
| [Fiche Vicat colle (mon-carrelage.com)](https://www.mon-carrelage.com/BD_images/P8137.pdf) | Seuils de double encollage par support, consommations, primaires 50-150 g/m² |
| [weber.col flex éco (Matériaux Online)](https://materiauxonline.fr/produit/Weber_Col_Flex_Eco_Gris_25kg), [IDF Matériaux](https://www.idfmateriaux.paris/weber-col-flex-eco-blanc-sac-25-kg-weber-c2x33391595), [CGMat](https://www.cgmat.fr/colles-en-poudre/502-webercol-flex-25kg-webercol-flex-3388751196126.html) | Tableau peigne × encollage × kg/m², sac 25 kg, palette 48 |
| [weber.joint fin (Leroy Merlin)](https://www.leroymerlin.fr/produits/joints-minces-carrelage-mural-blanc-pur-25-kg-weber-weberjoint-fin-88143768.html) | Conditionnements 5 / 25 kg, plage 0,2-1,3 kg/m² |
| [weber.color premium (Weber Maroc)](https://www.ma.weber/files/ma/2020-05/FTC-FR-P-webercolor-junta-premium.pdf) | Formule de consommation du joint, coefficient 1,5 |
| [Vicat V650 joint fin premium](https://www.vpi.vicat.fr/content/download/48395/448869/version/10/file/FT+JOINT+FIN+PREMIUM+V650_06.2026.pdf) | Formule coefficient 0,14 et exemples de contrôle |
| [weber.joint poxy](https://www.mybleurouge.com/catalogue/fiches_techniques_article/03536.pdf) | Formule époxy coefficient 0,16, kit 5 kg |
| [weber.sys protec (fiche)](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1091512.pdf), [Avis technique 13/12-1153](https://batichimie-boval.com/wp-content/uploads/2020/09/2012_Avis_Technique_weber.sys_protec_n_13_12_1153.pdf) | 2 × 400 g/m², seaux 7 / 20 kg, kit, bande BE14, pièces d'angle, primaire RP 100-200 g/m² |
| [weber.niv pro](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_295609.pdf), [weber.niv elit](https://medias.bigmat.fr/data_medias/medias_finaux/documents/3388750058135-xLGDgDceYc.pdf) | Ragréage 1,5 kg/m²/mm, épaisseurs P2/P3, sac 25 kg |
| [Schlüter-DITRA (fiche Schlüter)](https://eu.schluter.com/mediafiles/stream/fr_FR/48002), [Batiproduits DITRA 25](https://www.batiproduits.com/fiche/produits/desolidarisation-sous-carrelage-en-renovation-in-p69084143.html) | Rouleaux 5 et 30 m², largeur 1 m, épaisseur 3 mm, ATec 13/16-1349 |
| [Schlüter-JOLLY (fiche)](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_49891.pdf) | Barre 2,50 m, hauteurs 6 à 12,5 mm |
| [Brico Dépôt 60×60](https://www.bricodepot.fr/p/3660827059628/carrelage-de-sol-interieur-gres-cerame-60x60-lou-gris), [60×120](https://www.bricodepot.fr/p/4262537230053/media.bricodepot.fr), [Bricomarché 60×60](https://www.bricomarche.com/p/sol-et-mur-interieur-invisible-60x60-1.44m2/bte/8429991455804) | Cartons 1,44 m², palettes 30 et 36 cartons, poids carton |
| [Angelino, pose 60×60](https://angelino-carrelages.com/pose-et-technique/pose-carrelage-60x60/) | Double encollage > 500 cm² au sol, ≈ 7 kg/m² |

À acheter ou consulter pour fiabiliser : NF DTU 52.2 (P1-1-1 murs intérieurs, P1-1-3 sols, P1-2 critères de choix), NF DTU 52.1, CPT 3265\_V2 et 3529\_V4 (SPEC), CPT plancher chauffant (CSTB) ; accès via [boutique CSTB](https://boutique.cstb.fr) ou abonnement AFNOR *(lien non ouvert)*.

## 13. Plan de complétion

| # | Manque | Source | Qui | Critère de fin |
| --- | --- | --- | --- | --- |
| 1 | Validation des 12 ratios du chapitre 11 | carreleur en activité | Greg trouve 1-2 carreleurs (réseau Rappidos) | chaque ligne validée ou corrigée, version 0.2 |
| 2 | 10 devis réels + bons de commande correspondants | carreleurs clients | terrain (Dorothée, Omar) | 10 cas dans tests/, tous dans la tolérance |
| 3 | Texte officiel NF DTU 52.2 : joints, fractionnement, encollage sol | AFNOR / CSTB | achat | lignes « à confirmer » du 5.1 levées |
| 4 | CPT SPEC : hauteur et zones protégées en douche | CSTB | achat | règle 5.5 confirmée |
| 5 | Conditionnements négoce réels (Point.P, Gedimat, Big Mat, négoces carrelage) : m²/carton par format, primaires, colles en pâte, croisillons | fiches négoce | Claude (prochaine session) | tableau 4.1 et 4.6 sans « à vérifier » |
| 6 | Pose scellée DTU 52.1 : épaisseur de chape de pose, dosage, sacs | DTU 52.1 + fiches mortier | Claude | ouvrage `scelle` calculable |
| 7 | Dalles sur plots (extérieur) : plots, réglage, têtes | fiches fabricants de plots | Claude | ouvrage `sol_ext` mode plots calculable |
| 8 | Départements en zone de gel | carte gel / DTU | Claude | colonne `zone_gel` dans commun/departements.json |
| 9 | Deuxième marque de référence (Parexlanko ou Mapei) pour surcharge | fiches fabricant | Claude | tableau 4.2 bis |

Critère de bêta du métier : 10 cas réels passent, 4 questions maximum, zéro question sur une quantité, aucune ligne « à vérifier » dans les ratios qui pèsent plus de 5 % de la commande.

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 2026-10-03 | 0.1.0 | Création du référentiel carrelage au format du gabarit section 27 : 14 chapitres, fiches Weber, Vicat, Parexlanko, Schlüter sourcées, 3 cas de test synthétiques, 12 ratios à valider |
