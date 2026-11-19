# Zinguerie et évacuation des eaux pluviales : résumé de la recherche (19 novembre 2026)

Données complètes et sources : `zinguerie.json` (66 entrées, 33 verdicts, 17 fiches comptoir).
Statuts : 44 confirmées (au moins deux sources indépendantes), 18 à une seule source, 4 à confirmer.

Sources principales : guide et dossier technique VMZINC « Collecte des eaux pluviales », catalogue VMZINC
2022-2023 (PLUVIAZINC), fiches RHEINZINK (diffusées par Samse et Richardson), catalogue NedZink, elZinc joint
debout, Avis technique Nicoll LG25/LG28, guide First Plast, calepin de chantier CAPEB (DTU 40.5 et 60.11),
synthèse Progineer du NF DTU 40.5, mémo Les Matériaux (tables DTU 60.11), fiches étain Guilbert Express et
Metaconcept. Les textes AFNOR n'ont pas été lus : les valeurs DTU viennent des guides qui les citent.

## Ce qui est sûr

| Article | Valeur | Statut |
| --- | --- | --- |
| Gouttière demi-ronde zinc | développés 16, 25, 33, 40 (VMZINC : 160 / 250 / 330 / 400 mm ; RHEINZINK écrit 333) | confirmé |
| Longueur gouttière (zinc, PVC) | 4 m ; 2 m et 6 m existent | confirmé |
| Épaisseur | 0,65 mm (0,80 existe) | confirmé |
| Finitions zinc | naturel, Quartz-Zinc, Anthra-Zinc, Pigmento, bilaqué (PLUVIAZINC : Quartz-Zinc seulement) | confirmé |
| Nantaise de 33 | longueur 4 m, relevé 80 ou 100 mm | confirmé (relevé : une source) |
| Crochets, gouttière pendante | 0,50 m maximum (DTU 40.5), à réduire selon les charges climatiques ; 0,40 m pour une gouttière à l'anglaise | confirmé |
| Dilatation, gouttière zinc | 12 m maximum sans dispositif (DTU 40.5) | confirmé |
| Dilatation, gouttière PVC | 12 m maximum par naissance ou entre deux dispositifs | confirmé |
| Recouvrement d'une jonction zinc | 30 mm minimum, soudé | confirmé |
| Pente | 5 mm/m minimum | confirmé |
| Surface desservie par descente (DTU 60.11) | Ø 60 → 40 m² ; Ø 80 → 71 ; Ø 100 → 113 ; Ø 120 → 161 | confirmé |
| Surface desservie par gouttière demi-ronde, par sens, à 5 mm/m | 25 → 35 m² ; 33 → 95 m² ; 40 → 180 m² | confirmé |
| Descente zinc | Ø 60 / 80 / 100 / 120, tuyaux de **2 m** (3 m existe) ; aucun tuyau zinc de 4 m trouvé | confirmé |
| Descente PVC | tubes de **4 m** (Nicoll) ; 3, 2 et 1 m existent | confirmé |
| Colliers | 2 m maximum, au moins un par élément (fonte 2,70 m ; cuivre 2,50 m) | confirmé |
| Coudes | zinc 72° (40°, 76° « Paris », 90°) ; PVC 67°30 ou 87°30 ; 2 par dévoiement (col de cygne) | confirmé |
| Dauphin | fonte ou acier, 1 m (2 m existe) | confirmé |
| Feuille de zinc | 2 000 × 1 000 mm, 0,65 / 0,70 / 0,80 / 1 mm ; 9,36 kg en 0,65 | confirmé |
| Bandes de 2 m par feuille | dév. 25 → 4 ; dév. 33 → 3 ; dév. 40 à 50 → 2 | confirmé (calcul) |
| Bobineau | 500 / 650 / 1 000 mm × 17 / 21 / 31 m | confirmé (40 m en 500 : à confirmer) |
| Bobine joint debout | 500 → entraxe 430 ; 650 → 580 ; 3 pattes par mètre de joint | confirmé |
| Bandes façonnées et faîtage zinc | longueurs de **2 m** (VMZINC plie jusqu'à 4 m sur mesure) | confirmé |
| Étain | 33 % pour le zinc ; baguette d'environ 250 g (une source), targette 800 g, vendu au kg, carton de 25 kg | confirmé |

## Verdict sur les ratios existants

**Confirmés (16).** Crochets 50 cm + 1 ; colliers h / 2 (+ 1 du fondateur) ; 2 coudes par descente ; gouttière en 4 m ;
zinc 0,65 ; zinc naturel par défaut ; bandes façonnées 2 m ; feuilles 2 × 1 m et 4 bandes en dév. 25 ; feuille
9,36 kg ; bobineau ; bobine 500 / 650 ; étain 33 % en baguettes ; dilatation PVC 12 m ; dauphin 1 m ; talons,
angles, naissances, jonctions ; coudes 72° / 67°.

**Corrigés (10).**
- Tubes de descente en 4 m par défaut (`roofing.ts:3851`) : le zinc se vend en **2 m**, le PVC en 4 m. Le défaut doit dépendre de la matière.
- « Descente en 2 m » du skill : vrai pour le zinc, faux pour le PVC (4 m).
- Descente PVC « 2,8 ou 4 m » (§15) : 2,8 m introuvable ; les longueurs vendues sont 4, 3, 2 et 1 m.
- **Faîtage zinc en 3 m** (`roofing.ts:1775`, :2402, :3218) : aucun faîtage de 3 m trouvé, la longueur est **2 m**.
- Colliers « h / 1,8 + 1 » (§7) : c'est h / 2 (DTU), comme dans le code.
- « Ø 100 jusqu'à 130 m² » (`roofing.ts:510`, §7) : c'est **113 m²** (Ø 80 : 71 m², Ø 120 : 161 m²).
- « Gouttière 25 ≤ 60 m², 33 de 60 à 110 m² » (§7) : 35 et 95 m² par sens à 5 mm/m ; le double avec une naissance centrale.
- « 1 cm² par m² » et « une descente par 50 à 80 m² » (§7, §15) : utiliser les tables du DTU 60.11.
- Gouttière zinc sans dilatation dans le code : 12 m maximum (DTU) ; à proposer en Suggestion seulement.

**À confirmer (7).** 40 cm en bord de mer (aucune source ne le lie au littoral ; le DTU parle des charges
climatiques, surtout la neige) ; 2,5 crochets/m (gamme PLUVIAZINC seulement) ; pattes 3/m pour les bandes (2 à 4/m
selon les sources) ; 15 g d'étain par jonction ; 1 flacon de décapant ; développé 28 (moulurée ou PVC, pas en
demi-ronde zinc VMZINC) ; marge × 1,05 alors que le skill dit « l'arrondi suffit ».

## Bretagne

- La demi-ronde pendante de 25 et 33 est le profil courant (VMZINC : « idéales en région de plaine ou bord de mer »).
- Nantaise de 33 (rampante, sur ardoise) : sa capacité baisse fortement avec la pente du toit (relevé 80 mm : 35 m² à 27°, 15 m² à 45°). Elle demande une **bande de doublis** (2 m maximum), et le couvreur façonne talons et retours.
- VMZINC fait aussi une gouttière **Quimper**, en zinc naturel, proche de la nantaise (développé non trouvé).
- Aucun négoce breton (Point P, Larivière, Réseau Pro…) ne publie sa gamme en ligne : les longueurs vendues en Bretagne restent à faire confirmer par un comptoir.

## Ce que le vendeur demande (résumé)

- **Gouttière** : profil, développé, avec ou sans pince, épaisseur, finition, nombre de longueurs. Pour une nantaise : relevé 80 ou 100, et le doublis.
- **Crochets** : profil et développé, pose (chevron, bandeau, à queue, hampe), modèle, matière, longueur de tige.
- **Naissance** : développé et Ø de descente, type (agrafable ou à souder).
- **Descente** : matière, Ø, cylindrique ou tronconique, finition, longueur (zinc 2 m, PVC 4 m).
- **Coudes** : Ø et angle. **Colliers** : Ø, type, longueur de tige. **Dauphin** : Ø, droit ou coudé, fonte ou acier.
- **Zinc plat** : format, épaisseur, finition ; bobineau : largeur × longueur ; bande façonnée : croquis coté.
- **Étain** : 33 %, baguette ou targette, en kg. **Décapant** : pour zinc naturel ou prépatiné, volume.

## Décisions à trancher par le fondateur

1. Longueur des tubes de descente : par matière (zinc 2 m, PVC 4 m) plutôt que 4 m partout ?
2. Faîtage zinc en 2 m au lieu de 3 m ?
3. 40 cm en bord de mer : garder comme prudence d'atelier, ou 50 cm partout sauf neige ?
4. Coudes : 2 d'office (code) ou demander le nombre (skill) ?
5. Marge × 1,05 sur le zinc linéaire, ou « l'arrondi suffit » (skill) ?
6. Corriger l'aide « Ø 100 jusqu'à 130 m² » en 113 m².
7. Ajouter le développé 16 ; garder 28 seulement pour le PVC et la moulurée ?
8. Nantaise : la bande de doublis est-elle toujours écrite au devis en Bretagne ? (sinon, en Suggestion)
9. Dilatation de la gouttière zinc au-delà de 12 m : en Suggestion ?
