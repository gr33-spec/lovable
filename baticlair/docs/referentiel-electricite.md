# Référentiel quantitatif électricité (BatiClair)

Oct 11, 2026 · @Greg

Ce référentiel transforme les lignes d'un devis d'électricité en fournitures que le comptoir vend. Il est la deuxième brique métier de BatiClair, à côté du référentiel couverture, et prouve l'architecture : l'IA lit le devis, le référentiel du métier convertit.

## 1. Règle numéro un et place du référentiel

- La règle numéro un s'applique telle quelle : l'app lit le devis ligne par ligne et n'invente jamais un ouvrage absent du devis. Mais en électricité, une ligne du devis est presque toujours un **point** (un point lumineux, une prise), pas une fourniture. La conversion d'un point en fournitures (boîte, appareil, câble, gaine) n'est pas un ajout : c'est ce que le point contient. Chaque fourniture d'un point porte en rappel la ligne qui l'a produite.
- Les lignes d'étude, de pose, de mise en service, de percement, de plan, de Consuel et de formation sont des lignes sans fourniture (règle 49.9 du référentiel couverture, même logique).
- Les sections 49 (charte), 50 (ce que voit l'artisan) et 51 (le moteur voit le chantier avant de compter) du référentiel couverture s'appliquent à tous les métiers, donc ici.
- Quand une ligne nomme une marque, une gamme ou un modèle (Hager Essensya, Aldes Bahia, Atoll 750 W), ce nom est repris tel quel, sans question. Quand elle ne le nomme pas, la ligne sort en orange avec sa question (modèle, teinte ou qualité), et la réponse la passe au vert (51.6).

## 2. Unités commandables

Aucune ligne ne sort en « point » ni en « U » de devis : tout est converti dans l'unité que le comptoir vend.

| Fourniture | Unité commandable | Conditionnement courant |
| --- | --- | --- |
| Câble rigide (3G1,5 / 3G2,5 / 3G6) | couronne | 100 m ; au-delà de 300 m, touret 500 m |
| Gaine ICTA Ø20 / Ø25 | couronne | 100 m |
| Câble réseau grade 2 (RJ45) | boîte | 100 m |
| Câble coaxial (TV) | couronne | 100 m |
| Boîte d'encastrement Ø67 | pièce (ou sachet de 10) | prof. 40 pour cloison sèche |
| Boîte DCL plafond + douille | pièce |  |
| Appareillage (interrupteur, prise, RJ45, TV) | pièce | gamme du devis |
| Disjoncteur, interrupteur différentiel, peigne | pièce |  |
| Tableau, coffret de communication | pièce | rangées selon § 4 |
| Piquet de terre, barrette, câble 16 mm² vert/jaune | pièce / m |  |
| Gaine VMC souple PVC Ø80 / Ø125 | longueur | 6 m ou 10 m |
| Radiateur, chauffe-eau, VMC, sanitaire | pièce | modèle du devis |

## 3. Conversions par type de ligne

Chaque ligne de point donne les fournitures ci-dessous, multipliées par la quantité du devis. Les longueurs de câble sont des moyennes par point en logement, à faire valider par l'électricien (§ 7) ; elles servent au calcul des couronnes, arrondies à la couronne supérieure par section.

| Ligne du devis | Appareil | Boîte | Câble | Gaine | Protection au tableau |
| --- | --- | --- | --- | --- | --- |
| Point lumineux simple | 1 interrupteur simple | 1 boîte Ø67 + 1 boîte DCL plafond avec douille | 3G1,5 : 10 m | Ø20 : 10 m | 1 disjoncteur 10 A pour 8 points |
| Va-et-vient 1 point | 2 interrupteurs va-et-vient | 2 boîtes Ø67 + 1 DCL | 3G1,5 : 10 m + 4G1,5 : 6 m (navette) | Ø20 : 16 m | idem |
| Va-et-vient 2 points | 2 va-et-vient | 2 boîtes Ø67 + 2 DCL | 3G1,5 : 14 m + 4G1,5 : 6 m | Ø20 : 20 m | idem |
| Télérupteur 1 point | 3 poussoirs + 1 télérupteur modulaire | 3 boîtes Ø67 + 1 DCL | 3G1,5 : 10 m + 2×1,5 : 12 m | Ø20 : 22 m | idem |
| Prise 16 A+T | 1 prise 2P+T | 1 boîte Ø67 | 3G2,5 : 8 m | Ø20 : 8 m | 1 disjoncteur 16 A pour 8 prises (ou 20 A pour 12) |
| Prise four, prise plaque | 1 sortie de câble 32 A | 1 boîte Ø67 prof. 50 | 3G6 : 8 m | Ø25 : 8 m | 1 disjoncteur 32 A par ligne |
| Prise lave-vaisselle, lave-linge, sèche-linge, chauffe-eau, hotte | 1 prise 2P+T (hotte : 16 A ; autres : 20 A) | 1 boîte Ø67 | 3G2,5 : 8 m | Ø20 : 8 m | 1 disjoncteur 20 A par ligne (hotte : 16 A) |
| Alimentation radiateur | 1 sortie de câble avec fil pilote | 1 boîte Ø67 | 4G1,5 : 8 m | Ø20 : 8 m | 1 disjoncteur 10 A ou 16 A pour 2 radiateurs (selon puissance) |
| Prise RJ45 | 1 prise RJ45 grade 2 | 1 boîte Ø67 | câble grade 2 : 12 m | Ø20 : 12 m | aucune |
| Prise TV | 1 prise TV | 1 boîte Ø67 | coaxial : 12 m | Ø20 : 12 m | aucune |
| Alimentation chauffe-eau (ligne dédiée) | 1 sortie de câble | 1 boîte Ø67 | 3G2,5 : 8 m | Ø20 : 8 m | 1 disjoncteur 20 A + contacteur J/N |

Règles communes :

- Un point lumineux dans une pièce d'eau (salle de bains, salle d'eau) prend un appareil et une boîte identiques ; la différence est dans l'IP du luminaire, qui n'est pas au devis.
- Les douilles DCL ne sont pas à ajouter quand le devis dit « fourniture et pose de luminaire » : le luminaire est alors la fourniture.
- Une ligne « alimentation hotte » ou « alimentation chauffe-eau » est un point, pas un appareil : l'appareil (hotte, chauffe-eau) est sur sa propre ligne ou absent du devis.
- Les quantités de câble s'additionnent par section sur tout le devis, puis se convertissent en couronnes de 100 m, arrondies au-dessus. Pas de chute ajoutée : la moyenne par point la contient déjà.
- Les boîtes d'encastrement s'additionnent sur tout le devis et sortent en pièces ; l'app n'arrondit pas au sachet.

## 4. Tableau et protections

Quand le devis donne une ligne « tableau » avec la liste de son contenu sans les nombres (cas courant : « disjoncteurs 2 A, 10 A, 16 A, 20 A, 32 A, contacteur J/N, fils, barrette, montage »), l'app déduit la composition des points du même logement, selon les protections du § 3, et la pose en orange avec une question : « Composition du tableau : \[détail déduit\] — C'est bon / Modifier ». La réponse passe la ligne au vert.

- Nombre de disjoncteurs : somme des protections du § 3 sur le logement, chaque calibre arrondi au-dessus.
- Interrupteurs différentiels 30 mA : 1 pour 8 disjoncteurs, dont au moins 1 de type A (plaque, lave-linge) ; 40 A en logement sans chauffage électrique sur ce différentiel, 63 A sinon.
- Disjoncteur 2 A : 1 par contacteur jour/nuit et 1 par télérupteur.
- Peigne : 1 par rangée. Rangées : 1 rangée pour 13 modules, le tableau arrondi au-dessus (2, 3 ou 4 rangées).
- Mise à la terre, quand le devis la nomme : 1 piquet de terre, 1 barrette de coupure, câble 16 mm² vert/jaune 10 m, liaison équipotentielle 6 mm² 15 m ; le mesurage est une ligne sans fourniture.
- Coffret de communication : repris tel que nommé au devis (grade, nombre de RJ45) ; le devis nomme ses connecteurs, ils sont repris tels quels.

## 5. Questions obligatoires

Une question seulement quand le devis ne permet ni de lire ni de déduire la donnée (51.2). Les cas qui en produisent une :

- Teinte ou finition de l'appareillage quand seule la gamme est écrite (Essensya blanc ou noir ?).
- Longueurs non écrites d'un réseau : gaine VMC par logement, PER par diamètre quand le devis ne donne qu'un total.
- Un article « à définir » au devis (paroi de douche) : modèle.
- Un écart entre deux lignes qui comptent la même chose (59 alimentations pour 49 radiateurs) : à quoi servent les lignes en plus.
- Un bloc de pièces qui n'est rattaché à aucun logement : lequel.
- Mode de pose quand il change les fournitures et n'est pas écrit : encastré (boîtes + gaine ICTA) ou en saillie (moulures, boîtes en saillie). Question à boutons : encastré / saillie, « encastré » en premier en rénovation lourde ou neuf. Règle générale (51.6) : tout orange a sa question, et la liste est entièrement verte une fois répondu.

## 6. Test permanent devis 7954 (Morellec, 10 logements)

Lecture attendue, validée par Greg le 11 octobre 2026.

**Bref :** transformation d'un hôtel-restaurant en 10 logements à Paimpol, électricité complète monophasée, appareillage Hager Essensya, un tableau Hager et un coffret de communication par logement, chauffage électrique Atoll et sèche-serviettes, VMC hygro B Aldes par logement, plomberie avec 10 WC suspendus, 10 meubles vasque, 10 douches, 10 chauffe-eau, PER en dalle, évacuation PVC 100.

**Questions, exactement celles-ci :** teinte de l'appareillage Essensya ; mètres de gaine Ø80 et Ø125 par logement ; répartition des 890 m de PER entre 10×12 et 13×16 ; modèle des parois de douche « à définir » ; usage des 10 alimentations radiateur en plus des 49 appareils ; logement de rattachement du bloc chambre/dégagement de la page 12. Aucune question sur une marque, un modèle ou une contenance écrits au devis. Aucune question sur la composition des tableaux (déduite, § 4).

**Comptes de points sur les 10 logements :** 58 points lumineux simples, 13 va-et-vient 1 point, 1 va-et-vient 2 points, 1 télérupteur, 151 prises 16 A, 28 RJ45, 12 TV, 10 four, 10 plaque, 10 frigo, 10 hotte, 4 lave-vaisselle, 8 lave-linge, 3 sèche-linge, 8 chauffe-eau, 10 tableaux, 10 mises à la terre, 59 alimentations radiateur.

**Fournitures attendues (électricité, points seulement) :** interrupteurs simples 58 ; va-et-vient 30 ; poussoirs 3 + télérupteur 1 ; prises 2P+T 16 A : 161 (151 + 10 hottes) ; prises 20 A : 23 ; sorties de câble 32 A : 20 ; sorties radiateur : 59 ; RJ45 : 28 ; TV : 12 ; boîtes Ø67 : 392 (dont 20 prof. 50) ; DCL : 74 ; câble 3G1,5 : 734 m → 8 couronnes ; 4G1,5 : 556 m → 6 couronnes ; 2×1,5 : 12 m → 1 couronne ; 3G2,5 : 1 472 m → 15 couronnes ; 3G6 : 160 m → 2 couronnes ; grade 2 : 336 m → 4 boîtes ; coaxial : 144 m → 2 couronnes ; gaine Ø20 : 3 254 m → 33 couronnes ; Ø25 : 160 m → 2 couronnes.

**Lignes reprises telles quelles :** coffrets com 10, connecteurs RJ45 30, radiateurs Atoll 750 W 18 et 1000 W 21, sèche-serviettes 10, kits VMC Aldes 10, bouches 10/8/10/3, entrées d'air 25, manchons 25, et tout le lot sanitaire avec ses quantités.

**Lignes sans fourniture :** dépose, prise de chantier, plan, percements, pose et mise en service, mesure de terre, Consuel, formation.

Le test échoue si une seule question porte sur une donnée écrite au devis, si une ligne sort en « point » ou en « U », ou si un compte s'écarte de plus de 3 % des valeurs ci-dessus.

## 7. À faire relire par un électricien

Les ratios suivants sont des moyennes standard en logement, pas des mesures de terrain. Une heure avec un électricien suffit pour les valider ou les corriger, et chaque correction se fait dans la ligne correspondante du § 3 ou du § 4, avec la date.

- Longueurs moyennes de câble par point (10 m éclairage, 8 m prise, 12 m RJ45/TV).
- Nombre de points par disjoncteur (8 en éclairage, 8 en 16 A ou 12 en 20 A).
- Un différentiel pour 8 disjoncteurs, calibre 40 A ou 63 A.
- Télérupteur : 3 poussoirs par défaut.
- Alimentation radiateur avec fil pilote en 4G1,5.
- Arrondi des couronnes au-dessus, sans chute ajoutée.

## 8. Versions

- 11 octobre 2026 : première version, rédigée à partir du devis 7954, avant relecture par un électricien.
