# Référentiel quantitatif CUISINE (Rappidos)

Oct 3, 2026 · @Greg

Ce tiroir couvre la **pose et l'agencement de cuisine** (cuisiniste-poseur) : il transforme un devis de cuisine en lignes commandables au négoce bois-panneaux, à la quincaillerie et au fabricant de meubles. Il suit le gabarit de la section 27 du référentiel couverture : aucun mot de métier dans le moteur, tout vit ici.

## 1. Métier et axes de variation

La cuisine est pilotée par la **gamme** et le **neuf/rénovation**, presque pas par la géographie. Un poseur reçoit en général les caissons et façades d'un fabricant (kit ou cuisiniste) ; ce qu'il commande lui-même au négoce, ce sont les plans de travail, crédences, plinthes, fileurs, joues, fixations, quincaillerie de pose et consommables. La fabrication de caissons à partir de panneaux bruts (menuisier-agenceur) est un sous-profil traité en 3.4 et 13.

### 1.1 Fiche d'identité `metier.json`

```json
{
  "code": "cuisine",
  "nom": "Cuisine - pose et agencement",
  "version": "0.1.0",
  "normes": ["NF EN 1116:2018", "NF EN 14749", "NF C 15-100", "DTU 60.1", "DTU 68.3", "DTU 52.2 (crédence carrelée)"],
  "axes_de_variation": {
    "geographie": "nul",
    "epoque_bati": "moyen",
    "type_batiment": "faible",
    "neuf_renovation": "fort",
    "gamme": "fort"
  },
  "profils": ["poseur_meubles_fournis", "agenceur_fabrique"],
  "metiers_lies": ["plomberie", "electricite", "carrelage", "menuiserie", "platrerie", "peinture"],
  "unites_de_commande": ["u", "barre", "plan", "panneau", "rouleau", "cartouche", "boite", "sachet", "jeu", "kit"],
  "maturite": "alpha"
}
```

### 1.2 Poids de chaque axe

| Axe | Poids | Ce qui change dans le quantitatif | Résolu comment |
| --- | --- | --- | --- |
| gamme | fort | stratifié 38 mm en barre de 4,10 m, ou quartz/granit/céramique sur mesure (gabarit, découpes facturées) ; crédence stratifiée, verre, carrelage ou inox | lu dans le devis (matériau du plan) ; sinon question 1 |
| neuf\_renovation | fort | dépose et évacuation de l'ancienne cuisine, reprises murales, adaptation plomberie/élec, cales et pieds plus longs sur sol irrégulier | lu dans le devis (« dépose », « rénovation ») ; sinon question 3 |
| epoque\_bati | moyen | nature du mur porteur des meubles hauts : plaque de plâtre (chevilles à expansion, rail obligatoire), brique creuse, béton, pierre (chevilles chimiques) | question 2 (mur des meubles hauts) |
| type\_batiment | faible | logement collectif : gaine de hotte souvent interdite en façade → hotte en recyclage | défaut : maison ; question seulement si hotte en évacuation |
| geographie | nul | aucun matériau régional ; seul le littoral impose inox A4 pour la quincaillerie exposée (rare en intérieur) | non posée |

Règle moteur : comme `geographie` est `nul`, le moteur ne lit jamais `departements.json` pour ce métier, sauf pour l'adresse de livraison.

## 2. Règle d'or et unités de commande

**Règle d'or : en cuisine, rien ne se commande en m² ni en ml nu.** Un plan de travail se commande en barres de longueur catalogue (ou en plan sur mesure avec cotes et découpes), une plinthe en barres, un caisson à la pièce avec sa largeur, un joint en cartouches. Chaque ligne doit être lisible par le vendeur du négoce sans recalcul.

| Ouvrage du devis | Interdit en sortie | Unité de commande obligatoire | Exemple de ligne prête à envoyer |
| --- | --- | --- | --- |
| Plan de travail stratifié | m², ml | barre (longueur × profondeur × épaisseur, décor, chant) | 2 × plan stratifié Egger 4100 × 650 × 38 mm, décor F186 ST9, chant postformé |
| Plan pierre / quartz / céramique | m² seul | plan sur mesure (u) + cotes + liste des découpes | 1 × plan quartz 20 mm, 2 pièces (2650 × 620 + 1800 × 620), 1 découpe évier sous-plan, 1 découpe plaque, 1 trou robinet |
| Crédence panneau | m² | panneau (longueur × hauteur × épaisseur) | 1 × crédence stratifiée 4100 × 640 × 9 mm, décor assorti |
| Crédence carrelée | m² | renvoi au tiroir carrelage (cartons, sacs de colle, joint) | voir référentiel CARRELAGE |
| Plinthe de cuisine | ml | barre (longueur, hauteur, finition) + kit d'angles + clips | 3 × plinthe 2400 × 150 mm blanc, 2 angles, 1 sachet de clips |
| Meubles bas / hauts / colonnes | ml de linéaire | caisson (u) avec largeur, hauteur, profondeur, nombre de portes/tiroirs | 2 × caisson bas 600 × 720 × 560, 1 porte |
| Joues, fileurs, corniches, cache-lumière | ml | panneau ou barre (u) avec dimensions | 2 × joue de finition 720 × 600 × 19 mm |
| Rail de suspension | ml | barre de 2 m (u) | 2 × rail de suspension acier 2000 mm |
| Pieds réglables | « jeu » vague | sachet de 4 (u) | 5 × sachet 4 pieds 100-150 mm |
| Silicone sanitaire | ml de joint | cartouche 310 ml (u), coloris | 2 × silicone sanitaire 310 ml translucide |
| Profil de jonction / finition | ml | profil (u) avec épaisseur du plan et longueur | 1 × profil de jonction d'angle alu 38 mm, L 670 mm |
| Électroménager, évier, robinet | « lot » | article (u) avec référence | 1 × évier 1 cuve encastré 860 × 500 |

### 2.1 Unités déclarées pour `commun/unites.json`

| Code | Libellé affiché | Conversion |
| --- | --- | --- |
| barre | barre | longueur catalogue en mm portée par l'article |
| plan | plan sur mesure | pas de conversion ; cotes et découpes en attributs |
| panneau | panneau | L × l × e en mm portés par l'article |
| cartouche | cartouche | volume en ml porté par l'article (310 standard) |
| sachet | sachet | nombre de pièces par sachet porté par l'article |
| jeu | jeu | paire gauche/droite (suspensions) |
| kit | kit | contenu listé dans l'article |

Toute ligne qui sortirait en m² ou en ml est une erreur bloquante du moteur, sauf la ligne « surface carrelée » transmise au tiroir carrelage.

## 3. Ouvrages du métier, vocabulaire des devis, pièges

Douze ouvrages couvrent une cuisine standard. Le moteur ne charge que ceux trouvés dans le devis.

### 3.1 Ouvrages (`ouvrages.json`)

| Code ouvrage | Ce que l'artisan fait | Ce qui sort au quantitatif |
| --- | --- | --- |
| cuisine\_depose | dépose de l'ancienne cuisine, évacuation | big bag ou benne (u), sacs gravats (u) ; aucun matériau neuf |
| cuisine\_meubles\_bas | pose des caissons bas sur pieds | caissons (u), pieds en sachets, équerres de liaison mur, vis d'assemblage |
| cuisine\_meubles\_hauts | pose des caissons hauts | caissons (u), rails de 2 m, suspensions (jeux), chevilles + vis selon mur |
| cuisine\_colonnes | colonnes four/frigo/rangement | caissons (u), pieds, équerres anti-basculement |
| cuisine\_plan\_stratifie | plan stratifié découpé sur place | barres de plan, boulons de jonction, profils, chants de rive, silicone |
| cuisine\_plan\_sur\_mesure | quartz, granit, céramique, Dekton, compact | plan sur mesure (u) avec cotes et découpes ; tasseaux/renforts si porte-à-faux |
| cuisine\_credence | crédence panneau, verre, inox ou carrelée | panneaux (u) + colle MS (cartouches) + profils ; ou renvoi carrelage |
| cuisine\_finitions | plinthes, fileurs, joues, corniches, cache-lumière | barres et panneaux (u), clips, angles, embouts |
| cuisine\_evier\_robinetterie | évier, robinet, raccordement | évier (u), robinet (u), siphon (u), flexibles (u), vanne LV (u), silicone |
| cuisine\_electromenager | encastrement four, plaque, hotte, LV, frigo | appareils (u) si fournis ; gaine hotte, colliers, clapet |
| cuisine\_eclairage | réglettes LED sous meubles hauts | réglettes (u), alimentations (u), câbles de liaison (u) |
| cuisine\_ilot | îlot ou péninsule | caissons, plan, joues, fixation au sol (équerres), passage réseaux |

Les lots plomberie (alimentation, évacuation PVC) et électricité (circuits spécialisés) sont **transmis aux tiroirs plomberie et électricité** quand le devis les chiffre ; le tiroir cuisine ne garde que le raccordement final (siphon, flexibles, prises).

### 3.2 Vocabulaire des devis (`vocabulaire.json`)

| Expression lue sur le devis | Ouvrage | Extraction utile |
| --- | --- | --- |
| « fourniture et pose cuisine équipée », « cuisine aménagée », « implantation » | cuisine\_meubles\_bas + hauts | liste des modules si présente |
| « bas 60 », « BE 60 » (bas évier), « B1P », « B2T », « casserolier » | cuisine\_meubles\_bas | largeur en cm, portes (P), tiroirs (T) |
| « haut 60 », « H72 », « élément haut », « haut hotte » | cuisine\_meubles\_hauts | largeur, hauteur |
| « colonne four », « colonne frigo », « armoire », « réfrigérateur intégrable » | cuisine\_colonnes | hauteur (2000/2200) |
| « PDT », « plan de travail », « plan stratifié 38 », « post-formé », « chant droit » | cuisine\_plan\_stratifie | longueur totale, profondeur, décor |
| « quartz », « Silestone », « granit », « Dekton », « céramique », « compact », « marbre » | cuisine\_plan\_sur\_mesure | épaisseur (12/20/30), découpes |
| « crédence », « fond de hotte », « dosseret », « remontée » | cuisine\_credence | hauteur, matériau |
| « fileur », « joue », « habillage », « corniche », « cache-lumière », « plinthe » | cuisine\_finitions | dimensions |
| « évier », « sous-plan », « à encastrer », « 1 cuve égouttoir » | cuisine\_evier\_robinetterie | type de pose |
| « hotte », « groupe filtrant », « hotte îlot », « évacuation extérieure », « recyclage » | cuisine\_electromenager | évacuation ou recyclage |
| « dépose », « démontage », « évacuation ancienne cuisine » | cuisine\_depose | — |

Exclusions : « cuisine d'été », « barbecue maçonné » → tiroir maçonnerie ; « dressing », « placard » → tiroir menuiserie.

### 3.3 Pièges fréquents

1. **Le devis donne un linéaire (« 4,20 ml de cuisine »)** sans la liste des modules. Le moteur ne doit pas inventer les caissons : il sort les plans, plinthes, rails et consommables, et met les caissons en ligne « selon plan fabricant, à joindre ».
2. **Plan en L ou en U** : deux barres minimum, plus boulons de jonction et profil d'angle ; un U de 2,5 + 3 + 2,5 m ne tient pas dans deux barres de 4,10 m.
3. **Profondeur** : plan 600 sur caisson de 560-580 mm laisse un débord de 20-40 mm ; un plan de 650 sert quand il y a des tuyaux derrière ou une goulotte. Toujours reprendre la profondeur écrite au devis.
4. **Plan pierre ou quartz** : jamais commandé en barres. Le négoce ou le marbrier prend les cotes sur gabarit après pose des caissons ; le moteur sort une ligne de préparation, pas une quantité.
5. **Hotte en recyclage ou évacuation** : la gaine n'existe que pour l'évacuation ; ne jamais raccorder une hotte motorisée sur la VMC.
6. **Colonnes** : pas de plan de travail au-dessus ; à retirer du linéaire de plan.
7. **Électroménager « fourni par le client »** : aucune ligne d'appareil, mais garder l'encastrement (fileurs, grille d'aération du frigo).
8. **Îlot** : deux faces visibles, donc joues et fond fini en plus ; plinthes sur 4 côtés.

### 3.4 Sous-profil agenceur qui fabrique ses caissons

Si l'artisan fabrique lui-même (devis avec « fabrication atelier », « sur mesure », « panneaux mélaminés »), le quantitatif bascule vers panneaux mélaminés, chants en rouleaux, charnières, coulisses. Cette branche est **hors v1** : le moteur pose la question 4 et, si la réponse est « je fabrique », il produit uniquement plans, finitions et consommables, et signale « débit panneaux : à faire avec ton logiciel d'optimisation ».

## 4. Matériaux : fiches fabricant sourcées

Les fiches ci-dessous sont transcrites de documents fabricant ou de fiches négoce ouvertes le 3 oct. 2026. Toute valeur sans lien est marquée **(à vérifier)**.

### 4.1 Plans de travail

| Article | Longueur (mm) | Profondeur (mm) | Épaisseur (mm) | Poids | Conditionnement | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Egger stratifié postformé hydrofuge P3 | 4100 | 650 | 38 | 65 kg | à la pièce | [Point P](https://www.pointp.fr/p/materiaux-bois-gros-oeuvre/plan-de-travail-egger-support-hydrofuge-p3-stratifie-hpl-decor-blanc-kaolin-w980-finition-st2-chant-postforme-format-410x65cm-epaisseur-38mm-A7792247) |
| Egger stratifié chant droit hydrofuge P3 | 4100 | 650 | 38 | 65 kg | à la pièce, bande de chant fournie | [Dispano](https://www.dispano.fr/p/panneaux-decoratifs/plan-de-travail-egger-perfectsense-support-hydrofuge-p3-stratifie-hpl-decor-blanc-alpin-w1100-finition-pt-chant-droit-format-410x65cm-epaiss-A7792257) |
| Egger Eurospan profil 300/3 | 4100 | 600 | 38 | \~58 kg | à la pièce | [fiche Egger via Gedimat](https://uploads.gedimat.fr/DOCUMENT/TYPE1/2013025470727.pdf) |
| Egger Eurospan profil 300/3 (îlot) | 4100 | 920 | 38 | \~87 kg | à la pièce | [fiche Egger via Gedimat](https://uploads.gedimat.fr/DOCUMENT/TYPE1/2013025470727.pdf) |
| Egger compact stratifié | 4100 | 650 ou 920 | 12 | (à vérifier) | à la pièce, chants chanfreinés | [Egger via bimobject](https://www.bimobject.com/ja/egger/product/worktops) |

Longueurs catalogue Egger Eurospan : 5600, 5200, 4100, 3660 et 3050 mm ; épaisseurs 28 et 38 mm ; tolérance de longueur ± 5 mm ([fiche Egger](https://uploads.gedimat.fr/DOCUMENT/TYPE1/2013025470727.pdf)). **Le stock courant négoce est 4100 × 650 × 38** ([Groupe Ratheau](https://www.groupe-ratheau.com/produit/plan-de-travail-stratifie-egger)) ; les autres longueurs sont sur commande (à vérifier par négoce).

Plans quartz, granit, céramique, Dekton : **sur mesure uniquement**, épaisseurs courantes 12, 20 et 30 mm (à vérifier par fabricant). Pas de fiche de conditionnement : l'unité est le plan découpé.

### 4.2 Crédences et remontées

| Article | Dimensions (mm) | Source |
| --- | --- | --- |
| Crédence Egger assortie (UK) | 4100 × 640 × 8 | [Egger](https://www.egger.com/en/furniture-interior-design/decorative-collection/worktops-collection/splashbacks-upstands?country=GB) |
| Crédence Egger double face (DE) | 2800 × 640 × 9,2 | [Hornbach](https://www.hornbach.de/s/Egger) |
| Remontée (dosseret) Egger | 4100 × 120 × 18 | [Egger](https://www.egger.com/en/furniture-interior-design/decorative-collection/worktops-collection/splashbacks-upstands?country=GB) |
| Crédence verre trempé, inox, alu composite | sur mesure (à vérifier) | — |

Format France des crédences assorties : **(à vérifier)** auprès d'un négoce (Dispano, Point P).

### 4.3 Fixation des meubles hauts

| Article | Caractéristiques | Conditionnement | Source |
| --- | --- | --- | --- |
| Rail de suspension Camar 875 | acier zingué 26 × 2032 mm, réglage 28 mm en hauteur, charge 50 kg | 1 rail, recoupable | [Bricozor](https://www.bricozor.com/ferrures-fixation-elements-suspendus/rail-fixation-camar.html) |
| Rail de suspension Hettich | acier zingué 2000 × 29 × 6,5 × 2 mm, 150 kg par meuble ; 2 vis Ø 5,5 × 50 à chaque suspension, 1 vis de plus au centre dès 900 mm de large | 1 rail | [Hettich](https://shop-diy.hettich.com/de_FR/Hettich/Am%C3%A9nagement-d%27armoires-et-accessoires/Dispositifs-d%27accrochage-et-rails-de-suspension/Rail-suspension-meuble%2C-2000-x-29-x-6%2C5-x-2-mm%2C-Acier%2C-zingu%C3%A9/p/5510) |
| Suspension Camar 818 | 60 kg par pièce | jeu de 2 (1 D + 1 G) | [Bricozor](https://www.bricozor.com/ferrures-fixation-elements-suspendus/suspensions-elements-hauts-camar.html) |
| Suspension Camar 806 | 50 kg ; au moins 2 boîtiers et 2 plaquettes ou 1 rail par meuble | à la pièce | [Bricozor](https://www.bricozor.com/ferrures-fixation-elements-suspendus/fixations-806-boitiers-seuls-camar.html) |
| Suspension Camar 807 (meubles bas suspendus) | jusqu'à 240 kg par paire | à la pièce | [Bricozor](https://www.bricozor.com/ferrures-fixation-elements-suspendus-bas-807-camar.html) |

Les caissons de fabricant arrivent en général avec leurs suspensions montées : le poseur commande alors **seulement le rail et les chevilles** (à vérifier par fabricant).

### 4.4 Pieds, plinthes, jonctions

| Article | Caractéristiques | Conditionnement | Source |
| --- | --- | --- | --- |
| Pied de cuisine réglable | réglage 100 à 170 mm | sachet de 4 | [Mr.Bricolage](https://www.mr-bricolage.fr/pied-cuisine-noir-h100-150-o25-mm-x4.html) |
| Pied Riex GK50 | 100 mm (−15/+25) ou 120 mm (−25/+25) | à la pièce ; clip plinthe séparé | [Hranipex](https://hranipex.de/fr/produit/riex-gk50-clip-de-pied-reglable-pour-plinthe-plastique-fwf002927) |
| Clip de plinthe pour pied Ø 25 mm | acier | sachet de 4 | [Bricomarché](https://www.bricomarche.com/p/4-clips-fixation-plinthe-pour-pied-de-meuble-cuisine/3232320088674) |
| Plinthe de cuisine | hauteur 100 à 150 mm ; longueurs 2200 à 3000 mm **(à vérifier)** | barre | — |
| Assemblage de plan (boulon de jonction) | acier zingué 150 mm, serrage par-dessous | lot de 2 | [Mr.Bricolage](https://www.mr-bricolage.fr/2-assemblages-plan-de-travail.html) |
| Profil de jonction d'angle alu | pour plan 38 mm, longueur 670 mm | à la pièce | [Mr.Bricolage](https://www.mr-bricolage.fr/profil-aluminium-de-plan-de-travail-alu-jonction-angle-2-4-rond-38-mm-sptd.html) |

### 4.5 Consommables et ventilation

| Article | Rendement / caractéristique | Conditionnement | Source |
| --- | --- | --- | --- |
| Silicone sanitaire (Mapesil AC) | 3 ml de joint par cartouche en section 10 × 10 mm | cartouche 310 ml | [Castorama / Mapei](https://www.castorama.fr/mkp/mastic-silicone-mapesil-ac-coloris-125-gris-ch-teau-mapei/8022452134715_CAFR.prd) |
| Gaine alu souple de hotte | Ø 160 mm, 3 m, avec 2 colliers | kit | [catalogue Sonepar](https://res.cloudinary.com/sonepar-fr/raw/upload/s--56jnuWVP--/v1/documents/39/880100.pdf) |
| Conduit de hotte (notice type) | Ø intérieur 150 mm | à la pièce | [notice hotte](https://media.castorama.fr/is/content/Castorama/Marketplace/8016361985001_mnl_FR_CF_MP) |

### 4.6 Quincaillerie (sous-profil agenceur, pour mémoire)

Nombre de charnières Blum CLIP top selon la porte (largeur 600 mm) : 2 jusqu'à 600 × 700 mm, 3 jusqu'à 600 × 1500 mm, 4 jusqu'à 600 × 2000 mm ([notice Blum](<https://assets.leevalley.com/Original\\10113\\114084-charnieres-155-a-encombrement-zero-blum-clip-top-avec-amortisseur-integre-porte-a-recouvrement-c-02-fr.pdf>)). Charnière CLIP top 107° vendue par 250 ([fiche Blum](https://static.foussier.fr/document/ft/FT-0000004619.pdf)).

## 5. Règles de calcul, formules et pertes

Il n'existe **pas de DTU de pose de cuisine**. Les cotes viennent de la norme de coordination NF EN 1116:2018, des notices fabricant et, pour les réseaux, de la NF C 15-100 et des DTU 60.1 et 68.3. Les pertes ne sont pas des pourcentages : on optimise la découpe dans les longueurs catalogue (rangement en barres).

### 5.1 Cotes de référence (`regles.json` → `cotes`)

| Cote | Valeur | Source |
| --- | --- | --- |
| Hauteur plan fini | 850 ou 900 mm (+50 possible) | [NF EN 1116:2018, synthèse CATAS](https://catas.com/uploads/media/unien1116-eng.pdf) |
| Hauteur de socle (plinthe) | ≥ 80 mm (EN 1116), ≥ 100 mm sous pieds mobiles (EN 14749) | [CATAS](https://catas.com/uploads/media/unien1116-eng.pdf) |
| Profondeur plan | ≥ 600 mm | [CATAS](https://catas.com/uploads/media/unien1116-eng.pdf) |
| Profondeur meuble haut | 310 à 400 mm | [CATAS](https://catas.com/uploads/media/unien1116-eng.pdf) |
| Vide plan → meuble haut | 500 à 650 mm, usage 550 | [Asso Bois](https://www.asso-bois.fr/hauteur-meuble-haut-cuisine/) (à vérifier dans le texte de la norme) |
| Hotte → plan de cuisson | 650 mm mini au gaz, 650-750 mm selon notice | [notice hotte](https://media.castorama.fr/is/content/Castorama/Marketplace/8016361985001_mnl_FR_CF_MP) |
| Prises plan de travail | 4 sur 6 dans une cuisine > 4 m², à 80 mm mini au-dessus du plan, aucune au-dessus évier ou plaque | [Legrand](https://www.legrand.fr/questions-frequentes/quelle-est-la-norme-nf-c-15-100-pour-la-cuisine-en-2026) |
| Circuits spécialisés | plaque 32 A en 6 mm² ; four, lave-vaisselle, lave-linge 20 A en 2,5 mm² | [Legrand](https://www.legrand.fr/questions-frequentes/quelle-est-la-norme-nf-c-15-100-pour-la-cuisine-en-2026) |
| Hotte | jamais raccordée à la VMC ; conduit Ø 150 mm conseillé | [catalogue Sonepar](https://res.cloudinary.com/sonepar-fr/raw/upload/s--56jnuWVP--/v1/documents/39/880100.pdf) |

### 5.2 Plan de travail stratifié

```text
Entrées : segments de mur [a, b, c…] en mm, profondeur p (650 défaut), forme (I, L, U, îlot)
1. Pièces à couper :
   I  → [a]
   L  → [a, b - p]
   U  → [a, b - p, c - p]
   îlot → [longueur_ilot] en profondeur 920
2. Longueur à réserver par pièce = pièce + 20 mm (10 mm de recoupe par bout)
3. Si pièce > 4080 mm → coupe en deux pièces + 1 jonction droite (boulons + profil droit)
   OU proposer barre 5200/5600 « sur commande » (bouton, voir 7)
4. Rangement en barres de 4100 : tri décroissant, première barre qui peut recevoir la pièce,
   trait de scie 4 mm entre pièces.
5. Sortie : nb_barres × « plan L × p × 38, décor, chant »
```

| Accessoire | Formule | Unité |
| --- | --- | --- |
| Boulons de jonction | 2 par joint en profondeur ≤ 650 ; 3 par joint en 920 (à vérifier) | lot de 2 |
| Profil de jonction d'angle | 1 par angle si chant postformé ; 0 si chant droit assemblé bout à bout (à vérifier) | u |
| Profil de jonction droite | 1 par jonction droite | u |
| Embout / profil de finition | 1 par extrémité libre visible (postformé) | u |
| Bande de chant | 1 par extrémité libre visible (chant droit) ; souvent fournie avec le plan | u |
| Découpe évier / plaque | aucune quantité ; à noter dans l'annexe fournisseur | — |

### 5.3 Meubles bas, hauts et colonnes

```text
Caissons : reprendre la liste du devis telle quelle (largeur, type, portes/tiroirs).
  Si le devis ne donne qu'un linéaire → AUCUN caisson inventé ; ligne « caissons selon plan fabricant ».
Pieds (meubles fabricant non livrés avec pieds) :
  4 par caisson bas ou colonne de largeur ≤ 600 ; 6 au-delà de 800 (à vérifier)
  sachets = ceil(total_pieds / 4)
Clips de plinthe = 2 par caisson en façade + 2 par retour latéral libre → sachets de 4
Équerres de liaison au mur : 2 par caisson bas, 2 anti-basculement par colonne (à vérifier)
Vis de liaison entre caissons : 4 par jonction de caissons voisins (à vérifier) → boîte
```

### 5.4 Fixation des meubles hauts

```text
Rail : par mur, linéaire_hauts_mur ; barres de 2000 mm ; un rail ne passe pas un angle.
  nb_rails = somme_par_mur(ceil(linéaire_mur / 2000))
Vis + chevilles (règle Hettich) : 2 vis Ø 5,5 × 50 à chaque suspension → 4 par meuble,
  +1 au centre si largeur ≥ 900 mm
Type de cheville selon le mur (question 2) :
  plaque de plâtre → cheville métallique à expansion
  brique creuse   → cheville longue à expansion ou scellement chimique (à vérifier)
  béton / brique pleine / pierre → cheville nylon Ø 8
boîtes = ceil(nb_chevilles / contenance_boite)
```

### 5.5 Plinthes et finitions

```text
Linéaire plinthe = façades des bas + colonnes + retours latéraux visibles (profondeur caisson)
Pièces = un tronçon par façade droite entre deux angles
Rangement en barres de la longueur catalogue (2400 défaut, à vérifier), trait 4 mm
Angles = 1 par angle rentrant ou sortant ; embouts = 1 par extrémité libre
Joues, fileurs, corniches : reprendre le devis (u, dimensions) ; jamais en ml
```

### 5.6 Joints et colles

```text
Joint silicone (ml) = longueur plan contre mur + périmètre évier encastré + bas de crédence
Rendement théorique : 310 ml / (5 mm × 5 mm) = 12,4 ml ; rendement pratique retenu 8 ml (à vérifier)
cartouches = max(1, ceil(ml / 8))
Colle MS pour crédence panneau : 1 cartouche par 1,5 m² de crédence (à vérifier)
```

### 5.7 Hotte, évier, éclairage

| Élément | Règle | Sortie |
| --- | --- | --- |
| Hotte en évacuation | 1 conduit Ø 150 (kit 3 m si trajet ≤ 2,5 m) + 1 clapet anti-retour + 1 sortie murale + 2 colliers | u |
| Hotte en recyclage | aucun conduit ; filtres fournis avec la hotte | — |
| Évier | 1 siphon, 2 flexibles de robinet si non fournis, 1 robinet d'arrêt machine par LV ou LL, 1 raccord d'évacuation machine | u |
| Éclairage sous meubles hauts | 1 réglette par meuble haut au-dessus du plan, longueur ≤ largeur du meuble ; 1 alimentation par groupe (à vérifier) | u |

### 5.8 Pertes

Pas de pourcentage global. La perte vient du rangement en barres (5.2 et 5.5) et d'une marge de recoupe de 10 mm par bout. Pour les consommables vendus à la boîte, on arrondit à l'unité supérieure, sans marge en plus.

## 6. Valeurs par défaut et hypothèses à afficher

Chaque défaut s'affiche en clair sous le quantitatif, modifiable d'un tap. Ordre de résolution : chantier → artisan → variation par axe → valeur nationale.

| Clé `defauts.json` | Valeur nationale | Variations | Texte affiché |
| --- | --- | --- | --- |
| plan\_materiau | stratifie\_38 | lu dans le devis | « Plan stratifié 38 mm » |
| plan\_profondeur\_mm | 650 | 600 si écrit au devis ; 920 si îlot | « Profondeur plan {valeur} mm » |
| plan\_longueur\_barre\_mm | 4100 | 5200 ou 5600 si l'artisan accepte un délai | « Barres de {valeur} mm » |
| plan\_chant | postforme | chant\_droit si écrit | « Chant {valeur} » |
| marge\_recoupe\_mm | 10 par bout | — | « Recoupe 10 mm par bout » |
| trait\_scie\_mm | 4 | — | (non affiché) |
| pieds\_par\_caisson | 4 | 6 si largeur > 800 ; 0 si l'artisan dit « pieds fournis » | « {valeur} pieds par meuble » |
| plinthe\_longueur\_barre\_mm | 2400 (à vérifier) | longueur de l'article choisi | « Plinthe en barres de {valeur} mm » |
| plinthe\_hauteur\_mm | 150 | 100 à 150 selon pieds | « Plinthe H {valeur} mm » |
| rail\_longueur\_mm | 2000 | — | « Rail en barres de 2 m » |
| mur\_meubles\_hauts | plaque\_platre | epoque\_bati = ancien → brique ; neuf → plaque\_platre | « Mur des meubles hauts : {valeur} » |
| silicone\_ml\_par\_cartouche | 8 (à vérifier) | — | « 8 m de joint par cartouche » |
| hotte\_mode | recyclage | evacuation si le devis dit « évacuation », « extérieur », « gaine » | « Hotte en {valeur} » |
| hotte\_conduit\_diametre\_mm | 150 | 125 si notice | « Conduit Ø {valeur} » |
| depose | non | oui si « dépose » ou « rénovation » au devis | « Dépose ancienne cuisine : {valeur} » |
| electromenager\_fourni | lu au devis | non par défaut | « Électroménager fourni par : {valeur} » |

### 6.1 Hypothèses toujours affichées

1. « Caissons repris de ton devis » ou « Caissons non détaillés : ligne à compléter selon le plan fabricant ».
2. « Plans optimisés dans des barres de 4,10 m, chutes : {x} mm ».
3. « Plan pierre/quartz : quantité sur gabarit, le fournisseur prend les cotes ».
4. « Électricité et plomberie : seulement le raccordement final ; les circuits sont dans les lots électricité et plomberie ».

## 7. Questions à poser et sensibilité

Quatre questions au maximum, toutes à boutons, jamais sur une quantité. Le moteur ne pose une question que si le devis ne donne pas la réponse et si sa sensibilité dépasse 5 %.

| Priorité | id | Texte affiché | Boutons | Défaut | Sensibilité | Lignes touchées |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | profil\_meubles | « Les meubles, tu les… » | Achète montés · Achète en kit · Fabrique moi-même | Achète montés | 100 % | caissons, pieds, quincaillerie |
| 1 | plan\_materiau | « Plan de travail en… » | Stratifié · Quartz / granit · Bois massif · Céramique | Stratifié | 100 % | toutes les lignes plan |
| 2 | forme | « Forme de la cuisine ? » | Droite · En L · En U · Avec îlot | Droite | 30 % (barres, jonctions, profils, plinthes) | plan, plinthes, profils |
| 3 | mur\_hauts | « Mur des meubles hauts ? » | Placo · Brique · Béton ou pierre | selon époque (6) | 100 % des fixations, environ 5 % du total | chevilles, vis |
| 4 | hotte\_mode | « La hotte rejette dehors ? » | Oui, dehors · Non, recyclage | Recyclage | 100 % des lignes ventilation | conduit, clapet, sortie murale |

Règle d'arbitrage : si 5 questions seraient nécessaires, la question 3 tombe (défaut affiché, modifiable d'un tap).

### 7.1 Format `questions.json`

```json
[
  {
    "id": "plan_materiau",
    "ouvrages": ["cuisine_plan_*"],
    "priorite": 1,
    "si_inconnu": "plan_materiau",
    "texte": "Plan de travail en…",
    "boutons": [
      { "label": "Stratifié", "valeur": "stratifie_38" },
      { "label": "Quartz / granit", "valeur": "sur_mesure" },
      { "label": "Bois massif", "valeur": "bois_massif" },
      { "label": "Céramique", "valeur": "sur_mesure" }
    ],
    "defaut": "stratifie_38",
    "sensibilite_pct": 100
  },
  {
    "id": "forme",
    "ouvrages": ["cuisine_plan_stratifie", "cuisine_finitions"],
    "priorite": 2,
    "si_inconnu": "forme",
    "texte": "Forme de la cuisine ?",
    "boutons": [
      { "label": "Droite", "valeur": "I" },
      { "label": "En L", "valeur": "L" },
      { "label": "En U", "valeur": "U" },
      { "label": "Avec îlot", "valeur": "ilot" }
    ],
    "defaut": "I",
    "sensibilite_pct": 30
  }
]
```

Si la forme est « En L » ou « En U » et que le devis ne donne que le linéaire total, le moteur répartit par défaut à parts égales et l'affiche (« Murs supposés : 2,10 m + 2,10 m ») ; l'artisan corrige d'un tap. Ce n'est pas une question de quantité.

## 8. Matériaux dominants par région

Aucun matériau de cuisine ne dépend de la région : l'axe `geographie` est `nul` et le moteur ne pose jamais de question régionale. La région ne joue qu'à travers le **mur des meubles hauts** dans le bâti ancien, ce qui ne change que les chevilles.

| Contexte | Mur probable des meubles hauts | Défaut cheville | Statut |
| --- | --- | --- | --- |
| Logement neuf ou rénové après 1980, partout | plaque de plâtre sur ossature ou doublage collé | métallique à expansion | (à vérifier) |
| Maison ancienne Nord, Picardie | brique pleine | nylon Ø 8 | (à vérifier) |
| Maison ancienne Bretagne, Massif central, Alpes | pierre ou moellon, souvent doublé | nylon Ø 8 ou scellement chimique si pierre friable | (à vérifier) |
| Pavillon 1950-1980 | brique creuse ou parpaing | cheville longue à expansion | (à vérifier) |
| Immeuble béton | béton banché | nylon Ø 8 | (à vérifier) |

Ces lignes ne servent que de **défaut affiché** quand la question 3 n'est pas posée. Elles ne déclenchent jamais une question à elles seules.

Tendance commerciale non sourcée, pour mémoire seulement : plans en granit plus fréquents là où existent des marbreries locales (Bretagne, Vosges, Tarn). Le moteur ne s'en sert pas.

## 9. Points singuliers et consommables

Tout ce qui se commande à la pièce, même absent du devis, parce que le chantier ne se finit pas sans.

### 9.1 Points singuliers

| Point singulier | Déclencheur | Ce qui s'ajoute | Unité |
| --- | --- | --- | --- |
| Angle de plan (L, U) | forme ≠ droite | boulons de jonction + profil d'angle (postformé) | lot de 2, u |
| Plan > 4080 mm | pièce trop longue | jonction droite : boulons + profil droit, ou barre longue sur commande | lot de 2, u |
| Extrémité libre de plan | plan ne touchant pas un mur ou une colonne | embout ou bande de chant | u |
| Évier encastré | ouvrage évier | silicone sur le pourtour ; découpe notée en annexe | cartouche |
| Évier sous-plan | plan sur mesure | découpe et polissage chiffrés par le marbrier ; fixations d'évier fournies | annexe |
| Plaque de cuisson | ouvrage électroménager | découpe notée ; joint de plaque souvent fourni | annexe |
| Lave-vaisselle intégrable | présent au devis | 1 robinet d'arrêt machine, 1 raccord d'évacuation ; tôle de protection vapeur sous plan (à vérifier) | u |
| Réfrigérateur intégrable en colonne | présent au devis | grille d'aération de plinthe (à vérifier selon notice) | u |
| Four en colonne ou sous plan | présent au devis | fileurs éventuels ; aucune ligne si caisson fabricant | — |
| Hotte en évacuation | question 4 | conduit Ø 150, clapet anti-retour, sortie murale, colliers, adhésif alu | u, rouleau |
| Hotte îlot | « hotte îlot » | fixation plafond selon notice ; vérifier support | annexe |
| Îlot | forme = îlot | plan 920 de profondeur, 2 joues, fond fini, plinthe 4 faces, équerres au sol | u |
| Colonne près d'un mur | colonne | 2 équerres anti-basculement | u |
| Mur hors d'équerre | rénovation | fileurs à recouper (pas de quantité en plus) | — |
| Sol irrégulier | rénovation | pieds de course plus grande (100-170) | sachet |

### 9.2 Consommables

| Consommable | Règle | Unité de commande | Statut |
| --- | --- | --- | --- |
| Silicone sanitaire translucide ou coloris plan | 5.6 | cartouche 310 ml | sourcé (rendement 10 × 10), pratique à vérifier |
| Colle MS polymère (crédence, joues) | 1 cartouche par 1,5 m² de crédence | cartouche 290 ml | (à vérifier) |
| Chevilles + vis meubles hauts | 5.4 | boîte | type sourcé Hettich, contenance à vérifier |
| Vis d'assemblage entre caissons | 4 par jonction | boîte | (à vérifier) |
| Équerres de fixation meubles bas | 2 par caisson | sachet | (à vérifier) |
| Cales de réglage | 1 sachet par cuisine en rénovation | sachet | (à vérifier) |
| Adhésif aluminium | 1 rouleau si hotte en évacuation | rouleau | (à vérifier) |
| Lames de scie plan stratifié | 1 si plus de 2 barres à couper (outillage, option) | u | (à vérifier) |
| Protection sol (carton, film) | 1 rouleau par cuisine | rouleau | (à vérifier) |
| Sacs gravats / big bag | si dépose : 1 big bag par cuisine de moins de 5 m | u | (à vérifier) |

Les consommables marqués « option » sont proposés décochés : l'artisan les coche d'un tap s'il veut les recevoir.

## 10. Cas de test

Trois cas synthétiques calculés à la main avec les règles de la section 5. Ils servent à tester le moteur tant qu'on n'a pas de devis réels ; ils seront remplacés par 10 cas réels (voir 13). Les quantités dépendant d'une valeur « à vérifier » ont une tolérance plus large.

### 10.1 Cuisine droite, stratifié, placo, recyclage

Devis : cuisine droite 3,00 m, 5 bas de 60 dont 1 bas évier, 4 hauts de 60, plan stratifié 38 profondeur 650, 1 extrémité libre, évier 1 cuve encastré 860 × 500, lave-vaisselle intégrable, hotte recyclage, neuf. Calcul : pièce 3020 mm → 1 barre ; pieds 20 → 5 sachets ; clips 10 + 2 (retour) → 3 sachets ; plinthe 3000 + 560 → pièces 2400 + 600 + 560 → 2 barres ; rail 2400 mm → 2 barres ; vis 4 × 4 = 16 ; joint 3,00 + 2,72 = 5,72 m → 1 cartouche.

```json
{
  "id": "cuis-001",
  "source": "synthétique, règles v0.1.0",
  "contexte": { "forme": "I", "plan_materiau": "stratifie_38", "mur_hauts": "plaque_platre", "hotte_mode": "recyclage", "neuf_renovation": "neuf" },
  "attendu": [
    { "article": "plan stratifié 4100x650x38 postformé", "quantite": 1, "unite": "barre", "tolerance_pct": 0 },
    { "article": "embout de plan 38", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "caisson bas 600", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "caisson bas évier 600", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "caisson haut 600", "quantite": 4, "unite": "u", "tolerance_pct": 0 },
    { "article": "pieds réglables 100-170", "quantite": 5, "unite": "sachet 4", "tolerance_pct": 0 },
    { "article": "clips de plinthe", "quantite": 3, "unite": "sachet 4", "tolerance_pct": 0 },
    { "article": "plinthe 2400x150", "quantite": 2, "unite": "barre", "tolerance_pct": 50 },
    { "article": "angle de plinthe", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "rail de suspension 2000", "quantite": 2, "unite": "barre", "tolerance_pct": 0 },
    { "article": "cheville métallique à expansion + vis", "quantite": 16, "unite": "u", "tolerance_pct": 25 },
    { "article": "silicone sanitaire 310 ml", "quantite": 1, "unite": "cartouche", "tolerance_pct": 100 },
    { "article": "robinet d'arrêt machine", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "siphon évier", "quantite": 1, "unite": "u", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

### 10.2 Cuisine en L, stratifié, brique, hotte dehors

Devis : cuisine en L 2,80 m + 2,40 m, plan stratifié 650, hotte évacuation extérieure, rénovation avec dépose, mur en brique. Calcul : pièces 2800 et 2400 − 650 = 1750 → 2820 et 1770 mm → 2 barres (1276 mm restant dans la première, insuffisant) ; 1 joint d'angle → 1 lot de 2 boulons + 1 profil d'angle.

```json
{
  "id": "cuis-002",
  "source": "synthétique, règles v0.1.0",
  "contexte": { "forme": "L", "murs_mm": [2800, 2400], "plan_materiau": "stratifie_38", "mur_hauts": "brique", "hotte_mode": "evacuation", "neuf_renovation": "renovation" },
  "attendu": [
    { "article": "plan stratifié 4100x650x38 postformé", "quantite": 2, "unite": "barre", "tolerance_pct": 0 },
    { "article": "boulon de jonction de plan 150 mm", "quantite": 1, "unite": "lot 2", "tolerance_pct": 0 },
    { "article": "profil de jonction d'angle 38", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "kit conduit alu Ø150 3 m + colliers", "quantite": 1, "unite": "kit", "tolerance_pct": 0 },
    { "article": "clapet anti-retour Ø150", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "sortie murale Ø150", "quantite": 1, "unite": "u", "tolerance_pct": 0 },
    { "article": "big bag gravats", "quantite": 1, "unite": "u", "tolerance_pct": 100 }
  ],
  "questions_max": 4
}
```

### 10.3 Cuisine en U, quartz, devis sans liste de meubles

Devis : « fourniture et pose cuisine 6,50 ml en U, plan quartz 20 mm, évier sous-plan, plaque induction ». Attendu : aucune barre de plan, aucun caisson inventé, une ligne plan sur mesure et une ligne caissons à compléter.

```json
{
  "id": "cuis-003",
  "source": "synthétique, règles v0.1.0",
  "contexte": { "forme": "U", "plan_materiau": "sur_mesure", "lineaire_total_mm": 6500 },
  "attendu": [
    { "article": "plan quartz 20 mm sur gabarit, 3 pièces, 1 découpe évier sous-plan, 1 découpe plaque", "quantite": 1, "unite": "plan", "tolerance_pct": 0 },
    { "article": "caissons selon plan fabricant", "quantite": 1, "unite": "ligne à compléter", "tolerance_pct": 0 }
  ],
  "interdit": ["plan stratifié", "m²", "ml"],
  "questions_max": 4
}
```

Critère de bêta identique au gabarit : 10 cas réels, chaque ligne dans la tolérance, 4 questions maximum, zéro question sur une quantité.

## 11. Ratios à faire valider par un cuisiniste

Ces douze points doivent être relus par un poseur de cuisine en activité avant la bêta. Chaque réponse se note directement dans la colonne « Réponse du pro ».

| # | Ratio ou hypothèse | Valeur actuelle | Question au pro | Réponse du pro |
| --- | --- | --- | --- | --- |
| 1 | Profondeur de plan par défaut | 650 mm | Tu commandes plutôt du 600 ou du 650 ? |  |
| 2 | Marge de recoupe | 10 mm par bout | Assez, trop, pas assez ? |  |
| 3 | Boulons de jonction | 2 par joint (650), 3 (920) | Combien tu en mets vraiment ? |  |
| 4 | Profil d'angle | systématique sur postformé | Tu fais des coupes d'angle à la défonceuse avec gabarit à la place ? |  |
| 5 | Pieds par caisson | 4, 6 au-delà de 800 mm | Les meubles arrivent avec leurs pieds ou tu les commandes ? |  |
| 6 | Longueur des plinthes | barres de 2400 mm | Quelle longueur achètes-tu ? |  |
| 7 | Fixation meubles hauts | rail + 4 vis par meuble | Rail toujours, ou plaquettes seules ? |  |
| 8 | Chevilles sur placo | cheville métallique à expansion | Tu renforces le placo (tasseau, plaque bois) avant pose ? |  |
| 9 | Silicone | 8 m par cartouche | Combien de cartouches pour une cuisine moyenne ? |  |
| 10 | Colle crédence | 1 cartouche par 1,5 m² | Juste ? |  |
| 11 | Équerres de fixation bas | 2 par caisson | Tu fixes chaque meuble bas au mur ? |  |
| 12 | Éclairage LED | 1 réglette par meuble haut | Une réglette par meuble ou un ruban continu ? |  |

Tant qu'une ligne n'est pas validée, la valeur reste affichée avec la mention « valeur standard, à confirmer » dans l'app.

## 12. Sources officielles

Pages ouvertes le 3 oct. 2026. Les normes AFNOR sont payantes : seules leurs fiches de présentation et des synthèses publiques ont été lues.

### 12.1 Normes

| Texte | Objet | Lien |
| --- | --- | --- |
| NF EN 1116:2018 | dimensions de coordination meubles de cuisine et électroménager | [AFNOR](https://www.boutique.afnor.org/en-gb/standard/nf-en-1116/furniture-kitchen-furniture-coordinating-sizes-for-kitchen-furniture-and-ki/fa183731/82019) · [synthèse CATAS](https://catas.com/uploads/media/unien1116-eng.pdf) |
| NF EN 14749 | sécurité des meubles de cuisine et plans de travail | [AFNOR](https://www.boutique.afnor.org/en-gb/standard/nf-en-14749/domestic-and-kitchen-storage-units-and-worktops-safety-requirements-and-tes/fa135165/26326) |
| NF C 15-100 (cuisine) | prises, circuits spécialisés | [Legrand](https://www.legrand.fr/questions-frequentes/quelle-est-la-norme-nf-c-15-100-pour-la-cuisine-en-2026) · [Selectra / Promotelec](https://selectra.info/energie/actualites/marche/prises-obligatoires-norme-nf-c-15-100) |
| DTU 60.1, DTU 68.3, DTU 52.2 | plomberie, ventilation, carrelage collé | non consultés (payants) — à transcrire si besoin, voir 13 |

### 12.2 Fabricants

| Fabricant | Document | Lien |
| --- | --- | --- |
| Egger | fiche technique plans de travail Eurospan | [Gedimat](https://uploads.gedimat.fr/DOCUMENT/TYPE1/2013025470727.pdf) |
| Egger | plan postformé 4100 × 650 × 38, P3 | [Point P](https://www.pointp.fr/p/materiaux-bois-gros-oeuvre/plan-de-travail-egger-support-hydrofuge-p3-stratifie-hpl-decor-blanc-kaolin-w980-finition-st2-chant-postforme-format-410x65cm-epaisseur-38mm-A7792247) |
| Egger | plan chant droit 4100 × 650 × 38 | [Dispano](https://www.dispano.fr/p/panneaux-decoratifs/plan-de-travail-egger-perfectsense-support-hydrofuge-p3-stratifie-hpl-decor-blanc-alpin-w1100-finition-pt-chant-droit-format-410x65cm-epaiss-A7792257) |
| Egger | formats en stock (HPL et compact) | [Groupe Ratheau](https://www.groupe-ratheau.com/produit/plan-de-travail-stratifie-egger) |
| Egger | crédences et remontées | [Egger UK](https://www.egger.com/en/furniture-interior-design/decorative-collection/worktops-collection/splashbacks-upstands?country=GB) |
| Egger | compact 12 mm | [bimobject](https://www.bimobject.com/ja/egger/product/worktops) |
| Hettich | rail de suspension 2000 mm, règle de vissage | [Hettich](https://shop-diy.hettich.com/de_FR/Hettich/Am%C3%A9nagement-d%27armoires-et-accessoires/Dispositifs-d%27accrochage-et-rails-de-suspension/Rail-suspension-meuble%2C-2000-x-29-x-6%2C5-x-2-mm%2C-Acier%2C-zingu%C3%A9/p/5510) |
| Camar | rail 875, suspensions 806, 818, 807 | [Bricozor](https://www.bricozor.com/ferrures-fixation-elements-suspendus/rail-fixation-camar.html) |
| Blum | nombre de charnières par porte | [notice Blum](<https://assets.leevalley.com/Original\\10113\\114084-charnieres-155-a-encombrement-zero-blum-clip-top-avec-amortisseur-integre-porte-a-recouvrement-c-02-fr.pdf>) |
| Mapei | rendement silicone Mapesil AC | [Castorama](https://www.castorama.fr/mkp/mastic-silicone-mapesil-ac-coloris-125-gris-ch-teau-mapei/8022452134715_CAFR.prd) |
| Riex | pieds GK50 et clips | [Hranipex](https://hranipex.de/fr/produit/riex-gk50-clip-de-pied-reglable-pour-plinthe-plastique-fwf002927) |
| Hottes | hauteur 65-75 cm, conduit Ø 150 | [notice](https://media.castorama.fr/is/content/Castorama/Marketplace/8016361985001_mnl_FR_CF_MP) · [Sonepar](https://res.cloudinary.com/sonepar-fr/raw/upload/s--56jnuWVP--/v1/documents/39/880100.pdf) |

### 12.3 Négoce et grand public (valeurs secondaires)

[Asso Bois](https://www.asso-bois.fr/hauteur-meuble-haut-cuisine/) (vide plan / meuble haut) · [Mr.Bricolage](https://www.mr-bricolage.fr/2-assemblages-plan-de-travail.html) (boulons de jonction, profils, pieds) · [Bricomarché](https://www.bricomarche.com/p/4-clips-fixation-plinthe-pour-pied-de-meuble-cuisine/3232320088674) (clips de plinthe).

## 13. Plan de complétion

Ordre : cas réels d'abord (rien n'est validable sans eux), puis relecture par un cuisiniste, puis formats négoce manquants.

| # | Manque | Source | Qui | Critère de fin |
| --- | --- | --- | --- | --- |
| 1 | 10 devis réels de cuisine + ce qui a été commandé | cuisinistes partenaires, réseau Rappidos | Greg | `tests/` complet, tous verts |
| 2 | Validation des 12 ratios de la section 11 | un poseur de cuisine | Greg organise, le pro répond | colonne « Réponse du pro » remplie |
| 3 | Longueurs réelles des plinthes, crédences assorties en France | catalogues Dispano, Point P, Gedimat, Leroy Merlin Pro | Claude (recherche web) | aucune longueur « à vérifier » en 4.2 et 4.4 |
| 4 | Contenances des boîtes de chevilles, vis, équerres | catalogues Fischer, Spit, Würth | Claude | chaque consommable a un conditionnement |
| 5 | Kits fournis par les fabricants de meubles (pieds, suspensions déjà montés ?) | notices Ikea Metod, Schmidt, Mobalpa, Nobilia | Claude + un poseur | règle « fourni / à commander » par fabricant |
| 6 | Plans sur mesure : épaisseurs, découpes standards, délais | marbriers, Cosentino (Silestone, Dekton) | Claude | fiche par matériau |
| 7 | Sous-profil agenceur (panneaux, chants, quincaillerie) | Egger panneaux mélaminés, Blum, Hettich | Claude, après la bêta | tiroir menuiserie-agencement séparé |
| 8 | Vocabulaire enrichi | 50 premiers devis bêta | automatique + validation | zéro mot inconnu sur un devis courant |

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 3 oct. 2026 | 0.1.0 | Création du tiroir cuisine au format section 27 : axes (gamme et neuf/réno forts, géographie nulle), 12 ouvrages, fiches Egger, Hettich, Camar, Blum, Mapei, règles de rangement en barres, 5 questions dont 4 posées au maximum, 3 cas de test synthétiques, 12 ratios à valider. |
