# Cas de référence n° 1 : devis réel D-2026-015 (couverture 120 m²)

> Premier vrai devis client, fourni par le fondateur le 2026-10-01. Il est
> rejoué à chaque version par `packages/domain/test/cas-reference-d2026-015.test.ts`
> (anonymisé : aucune donnée personnelle dans le dépôt).
>
> **Ce document décrit ce que BatiClair fait vraiment**, avec le code actuel.
> Aucune valeur n'a été forcée.

## Le devis en bref

| Ligne | Ouvrage | Quantité du devis |
|---|---|---|
| 1 | Écran de sous-toiture HPV respirant, **sur fermettes d'entraxe 90 cm** | 120 m² |
| 2 | Contre-lattage en liteaux 27×40 | 120 m² |
| 3 | Lattage en liteaux 27×40 « pureau adapté » pour tuiles type HP10 | 120 m² |
| 4 | Couverture en tuiles terre cuite grand moule **type HP10 rouge** | 120 m² |
| 5 | Rives : tuiles de rive (**4 rives de 6 m**) | 24 m |
| 6 | Faîtage : **faîtières ventilées + closoir ventilé + fixations** | 10 m |
| 7 | Gouttière PVC demi-ronde de 25 sable, **crochets et naissances compris** (2 × 10 m) | 20 m |
| 8 | Descente PVC Ø80 sable, **hauteur 4 m, 2 jeux de coudes + colliers par descente** | 2 ensembles |
| 9 | Tuiles chatières adaptées au modèle HP10 (5 de chaque côté) | 10 |
| 10 | Sortie de toit **Poujoulat** complète, solin adapté HP10 | 1 |

---

## 1. Ce que BatiClair a compris tout seul

- **10 lignes, toutes à commander.** Aucune n'est une prestation seule.
- **La surface de 120 m² est certaine.** On la retrouve, identique, sur
  4 lignes (écran, contre-lattes, liteaux, tuiles).
- **L'entraxe de 90 cm est lu sur la ligne de l'écran** (« fermettes
  d'entraxe 90 cm ») et **réutilisé pour les contre-lattes**. C'est le
  raisonnement sur le chantier complet : la question disparaît.
- **Ce qui est une mesure d'ouvrage et ce qui est une vraie quantité :**
  - mesures d'ouvrage : écran, liteaux, contre-lattes et tuiles en m² ;
    rives et faîtage en m ;
  - vraies quantités : 10 chatières, 1 sortie de toit, 20 m de gouttière.
- **Le bon produit dans la bonne famille.** Le liteau 27×40 est reconnu.
  La tuile HP10 est reconnue comme modèle **probable**. La mention « pour
  tuiles HP10 » sur la ligne des liteaux ou des chatières ne fait **pas**
  de ces lignes des tuiles.
- **La géométrie est cohérente** : 4 rives de 6 m, faîtage de 10 m, et
  2 pans × 6 m × 10 m = 120 m². BatiClair ne s'en sert **pas encore** (§ 6).

## 2. Le quantitatif qu'il peut sortir avec certitude

**Aujourd'hui, pour un artisan :** seulement ce qui est déjà une quantité
d'achat sur le devis.
- 10 chatières ;
- 1 sortie de toit (modèle à préciser) ;
- 20 m de gouttière, **sans** ses accessoires.

Tout le reste est « à calculer », parce que les 4 règles de calcul ne sont
pas encore validées (§ 6).

**Dès que les règles seront validées**, après les 2 réponses du § 3 :

| Matériau | Besoin | À commander | Certitude |
|---|---|---|---|
| Tuiles HP10 rouge | 1 305,43 tuiles | **1 306 pièces** (≈ 6 palettes) | Certain |
| Liteaux 27×40 | 349,85 ml | **88 longueurs de 4 m** | ml certains ; « 4 m » à confirmer (fiche du négoce) |
| Contre-lattes 27×40 | 133,33 ml (120 m² ÷ 0,90 m) | **34 longueurs de 4 m** | ml certains, **entraxe lu sur le devis** ; « 4 m » à confirmer |
| Écran HPV (SOP'ÉCRAN 1,50 × 50) | 128,57 à 138,46 m² | **2 rouleaux** | Certain, quelle que soit la pente |

*(Chiffres avec un pureau de 34,3 cm, pris pour l'exemple : c'est la
réponse de l'artisan qui fixera les vrais chiffres.)*

## 3. Les questions qu'il doit absolument poser

| # | Question | Pourquoi elle est indispensable | Comment elle disparaîtra |
|---|---|---|---|
| 1 | « J'ai identifié : Tuiles HP10. C'est bien ce modèle ? » | Le devis dit « **type** HP10 », sans marque ni référence. Un autre modèle n'aurait pas les mêmes dimensions, donc pas les mêmes quantités. | Le devis cite « Edilians HP 10 réf. 205 », ou l'entreprise l'a déjà confirmé une fois (préférence). |
| 2 | « À quel pureau posez-vous ces tuiles ? » | Le devis dit « pureau **adapté** », sans valeur. La réponse change la commande **de 1 191 à 1 445 tuiles** et de 319 à 387 ml de liteaux. Aucune donnée prouvée ne permet de le déduire. | Une règle prouvée qui le déduit du rampant (6 m, lu sur la ligne des rives), si une source le permet (§ 6). |
| 3 | « Quel écran utilisez-vous ? » | Au **premier chantier seulement** : « écran HPV respirant » ne désigne ni une marque ni un rouleau. | Dès le chantier suivant : l'écran habituel de l'entreprise. |

**Questions supprimées :**
- **Entraxe des contre-lattes** : il est lu sur la ligne de l'écran.
- **Pente du toit** : elle ne change rien, c'est 2 rouleaux d'écran dans
  tous les cas.

**Bilan : 2 questions, plus 1 au tout premier chantier.** Proposition : poser
les questions 1 et 2 sur **un seul écran** (« Tuiles HP10 Edilians, posées
au pureau de … cm ? »), ce qui ne fait qu'**une** interaction.

## 4. Ce qu'il ne sait pas encore calculer, et pourquoi

| Ouvrage | Ce qu'il faudrait produire | Ce qui manque |
|---|---|---|
| Rives (4 × 6 m) | Tuiles de rive **gauches et droites** | Les données de la tuile de rive HP10 (nombre par rang ou par mètre, gauche et droite), et le pureau |
| Faîtage (10 m) | Faîtières ventilées + closoir ventilé + fixations | Le nombre de faîtières au mètre, la longueur d'un rouleau de closoir, les fixations par faîtière (fiches accessoires) |
| Gouttière (2 × 10 m) | Barres, crochets, naissances | Longueur des barres, **espacement des crochets** (fabricant), et la règle « 1 naissance par descente » (2), à sourcer |
| Descentes (2 × 4 m) | Tubes, coudes, colliers | Longueur des tubes, nombre de coudes dans un « jeu » (**ambigu** : 1 ou 2 coudes ?), espacement des colliers |
| Chatières (10) | Le bon produit | La référence exacte de la chatière HP10 et son coloris. Remplace-t-elle 10 tuiles ? Règle à sourcer. |
| Sortie de toit Poujoulat | Le bon modèle | Diamètre et modèle du conduit, absents du devis |
| Écran sur fermettes à 90 cm | Une vérification | L'écran accepte-t-il 90 cm entre supports ? C'est une condition d'emploi, à vérifier sur sa fiche (ce n'est pas une quantité). |

## 5. Les faiblesses que ce vrai devis a révélées

Chacune est devenue un test permanent :

| # | Faiblesse | État |
|---|---|---|
| 1 | Une ligne était classée d'après un **composant cité dans sa description** : la gouttière comme « accessoire » à cause de « naissances », la descente à cause de « coudes, colliers », le faîtage comme « closoir », la sortie de toit comme « zinguerie » à cause de « solin ». | **Corrigé** : c'est le nom de l'ouvrage, le premier mot reconnu, qui classe la ligne. « Tuile de rive » et « membrane respirante » ajoutées au vocabulaire. |
| 2 | « Rives 24 m » et « Faîtage 10 m » partaient comme des quantités d'achat. | **Corrigé** : « pour une longueur de 24 m (quantité à calculer) ». |
| 3 | La mention « (Fourniture & Pose) » partait chez le fournisseur. | **Corrigé.** |
| 4 | « Pour tuiles HP10 », sur la ligne des liteaux ou des chatières, faisait proposer la **tuile**. | **Protégé** : produit cherché dans la famille de la ligne seulement (testé). |
| 5 | Le moteur ne connaissait que l'entraxe des **chevrons** ; ici, ce sont des **fermettes**. | **Corrigé** : entraxe des chevrons **ou fermettes**. |
| 6 | Un conditionnement non vérifié (liteaux de 4 m) **cachait** les mètres linéaires, pourtant certains. | **Corrigé** : le besoin s'affiche, seule la conversion attend. |
| 7 | « 2 unités » = 2 **descentes complètes** (tube + coudes + colliers), lues comme 2 pièces. | **Frontière documentée** : il faut l'ouvrage composé « descente ». |
| 8 | Les **coloris** (rouge, sable) ne passent pas dans la liste d'achat calculée par le moteur. | **À corriger** : le fournisseur en a besoin. |
| 9 | La cohérence géométrique (2 × 6 × 10 = 120) n'est pas exploitée. | **Proposé** : elle confirmerait les mesures et pourrait aider pour le pureau. |
| 10 | Les e-mails reprennent le texte du devis client (« pour la création de la lame d'air », « pureau adapté »). | **À corriger** avec la liste d'achat normalisée. |

## 6. Ce que je propose maintenant

1. **Règles de calcul : prouver avant de valider.**
   - **Tuiles et liteaux** : la formule redonne déjà **les tableaux Edilians
     que tu as vérifiés** (9,9 à 12 tuiles/m² ; 3,22 / 2,91 / 2,66 ml/m²).
     Un test le prouve. Je te propose de les valider **sur cette preuve**,
     pas de mémoire.
   - **Contre-lattes** (une file par chevron ou fermette) et **écran**
     (surface avec recouvrements) : il faut le texte qui le démontre.
     Documents : **guide de pose Soprema SOP'ÉCRAN HPV R2** (contre-lattage
     et recouvrements) et **NF DTU 40.29** (§ contre-lattes).
2. **Ouvrages composés**, avec leurs fiches. Le moteur sait déjà faire
   « 1 ouvrage → plusieurs matériaux ».
   - **Faîtage** et **rives** : fiches accessoires Edilians HP 10 (faîtière
     ventilée, closoir, rives gauche et droite, fixations, chatière).
   - **Gouttière et descentes PVC** : **quelle marque utilises-tu** ? (Ce
     sera une préférence de l'entreprise.) Puis sa fiche système : longueur
     des barres, espacement des crochets, naissance Ø80, longueur des
     tubes, espacement des colliers, contenu d'un « jeu de coudes ».
3. **Coloris et caractéristiques clés** dans la liste d'achat (rouge, sable,
   Ø80, « de 25 »).
4. **Une seule carte** pour le modèle et le pureau.
5. **Cohérence géométrique** : vérifier surface = pans × rampant × faîtage
   et le signaler si ça ne tombe pas juste.

---

## La liste exacte envoyée aujourd'hui au fournisseur

Elle est produite par le code actuel. Les lignes dépendent de ce que l'IA
retient de chaque ligne du devis ; voici la version **titre seul** :

```
Bonjour,

Pourriez-vous me faire une offre de prix pour le chantier « … » :

- Écran de sous-toiture respirant : pour une surface de 120 m² (quantité à calculer)
- Contre-lattage en liteaux 27x40 : pour une surface de 120 m² (quantité à calculer)
- Lattage en liteaux 27x40 pour tuiles HP10 : pour une surface de 120 m² (quantité à calculer)
- Couverture en tuiles terre cuite HP10 rouge : pour une surface de 120 m² (quantité à calculer)
- Rives de toit : pour une longueur de 24 m (quantité à calculer)
- Faîtage : pour une longueur de 10 m (quantité à calculer)
- Gouttière PVC de 25 sable : 20 m
- Descente d'eau pluviale PVC Ø80 avec coudes : 2 unités
- Chatières de ventilation : 10 unités
- Sortie de toit Poujoulat : 1 unité

Merci d'indiquer pour chaque ligne le prix unitaire HT, la remise éventuelle,
le conditionnement et le délai de livraison.
```

**Ce que ce texte dit honnêtement** : il ne présente plus de fausse quantité.
**Ses limites :**
- le fournisseur doit encore faire le métré des tuiles, des liteaux, des
  rives et du faîtage ;
- en version titre seul, des précisions utiles disparaissent : « HPV »,
  « crochets et naissances compris », hauteur 4 m et colliers, « adaptées
  HP10 ». Elles ne restent que si l'IA garde aussi la description.

**La liste visée**, une fois les règles validées et les 2 réponses données
(pureau de 34,3 cm pour l'exemple) :

```
Tuiles terre cuite HP10 rouge (Edilians)  1 306 pièces   ≈ 6 palettes
Liteaux 27×40                             349,85 ml      ≈ 88 longueurs de 4 m
Contre-lattes 27×40                       133,33 ml      ≈ 34 longueurs de 4 m
Écran HPV (SOP'ÉCRAN 1,50 × 50 m)         2 rouleaux
Tuiles chatières HP10 rouge               10 pièces
Sortie de toit Poujoulat + solin HP10     1 (modèle à préciser)
Rives, faîtage, gouttière, descentes      à calculer dès réception des fiches (§ 6)
```


---

## Rejouée n° 2 (2026-10-01, après les sources officielles relayées par le fondateur)

**Accès aux sources** : edilians.com, particuliers.soprema.fr et nicoll.fr
sont **bloqués par le réseau de l'environnement de développement**. Les
données saisies sont celles que tu as relevées sur les documents officiels :
- HP 10 (2024) : largeur utile, 9,9 à 12 tuiles/m², 240 tuiles/palette ;
- faîtière angulaire 710 : 3 pièces/ml ;
- SOP'ÉCRAN : 1,50 × 50 m = 75 m².

Rien d'autre n'a été saisi : pas de longueur de barre, pas d'espacement de
crochets, pas de conditionnement de liteaux.

### Ce qui a changé

1. **Aucune information du devis ne se perd** dans la liste fournisseur.
   L'intitulé est court, mais il garde l'objet fourni (« faîtières
   ventilées ») et toutes les caractéristiques : HPV, rouge, terre cuite,
   grand moule, PVC, de 25, sable, demi-ronde, Ø80, hauteur 4 m,
   « crochets et naissances compris », « avec closoir ventilé et accessoires
   de fixation », Poujoulat, solin HP10. La phrase de pose (« pour la
   création de la lame d'air ») disparaît. C'est un test permanent.
2. **Ouvrages composés**. Chaque matériau est justifié par le devis :
   - faîtage → faîtières + closoir (+ fixations : aucune donnée) ;
   - gouttière → profil + crochets + naissances ;
   - descente → tubes + coudes + colliers.
3. **Un besoin certain n'attend plus le produit.** 10 ml de closoir, 20 ml
   de gouttière, 2 naissances, 8 ml de tube : ces chiffres viennent du
   devis. Seule la conversion en unités de vente attend le produit.
4. **Chantier complet.** Tous les ouvrages sont calculés ensemble, une seule
   question à la fois. **En production, aucune question pour un calcul que
   BatiClair ne sait pas encore terminer** : il ne demande pas le pureau
   tant que la règle des tuiles n'est pas validée.

### Avant → après

| | Avant (rejouée n° 1) | Après (aujourd'hui, en production) | Après validation des règles en attente |
|---|---|---|---|
| Lignes calculées | 0 | **1** : faîtières, 10 m × 3/ml = **30 pièces** (si l'artisan confirme le modèle 710) | **9 besoins** : tuiles 1 306 · liteaux 349,85 ml · contre-lattes 133,33 ml · écran 2 rouleaux · faîtières 30 · closoir 10 ml · gouttière 20 ml · naissances 2 · tubes 8 ml |
| Questions | 2 (+1 au 1er chantier) | **1** : le modèle de faîtière | **4** : modèle HP10, pureau, modèle de faîtière, coudes par descente (+ l'écran au 1er chantier) |
| Impossible | rives, faîtage, gouttière, descentes, sortie | crochets, colliers, fixations de faîtage, rives, chatière exacte, sortie Poujoulat | crochets et colliers (espacement Nicoll), fixations de faîtage, rives, sortie Poujoulat (modèle, diamètre) |

**Pourquoi chaque question reste :**
- **Modèle de tuile** : « type HP10 » ne cite ni la marque ni la référence.
- **Pureau** : « pureau adapté » n'est pas une valeur, et il change la
  commande de 1 191 à 1 445 tuiles.
- **Modèle de faîtière** : le devis demande des faîtières **ventilées**.
  Rien ne prouve que la faîtière angulaire 710 l'est : **BatiClair ne la
  choisit pas à ta place** (test permanent).
- **Coudes** : « 2 jeux de coudes par descente » n'est pas un nombre de
  coudes. C'est la seule ambiguïté du devis.
- **Écran** : au premier chantier seulement.

### Règles en attente : ce qu'il faut pour les valider

| Règle | Nature | Comment la valider |
|---|---|---|
| Tuiles = surface ÷ (largeur utile × pureau) | règle fabricant | **Déjà prouvée** : elle redonne les 9,9 à 12 tuiles/m² Edilians (test). Ton OK sur cette preuve suffit. |
| Liteaux = surface ÷ pureau | règle fabricant | **Déjà prouvée** par le tableau Edilians 3,22 / 2,91 / 2,66 ml/m² (test). Ton OK sur cette preuve suffit. |
| Contre-lattes = une file par fermette | pose | Guide de pose SOP'ÉCRAN (site bloqué) ou ta validation de pratique |
| Écran = surface × largeur ÷ (largeur − recouvrement) | géométrie + recouvrements Soprema | Ta validation de pratique (les recouvrements sont déjà sourcés) |
| Closoir = longueur du faîtage | pratique | Ta validation de pratique |
| Gouttière = longueur ; 1 naissance par descente | pratique (ou fiche Nicoll) | Ta validation, ou la fiche Nicoll |
| Tubes = nombre de descentes × hauteur | pratique | Ta validation (sans déduire les coudes) |

### Documents encore nécessaires (sites bloqués depuis l'environnement)

1. **Nicoll, gouttière LG25 et descente Ø80 (système)** : longueur des barres
   et des tubes, **espacement maximal des crochets et des colliers**, et un
   « jeu de coudes ». Ce sont des PDF ou des captures de pages
   nicoll.fr.
2. **Edilians HP 10 (2024)**, pages accessoires : faîtière **ventilée**
   (référence et pièces au mètre), rives gauche et droite, fixations de
   faîtage, chatière. Le PDF à fournir est
   `205_fag_hp_10_huguenot_19042024_bd.pdf`.
3. **Poujoulat** : rien à chercher tant que le devis ne dit ni le modèle ni
   le diamètre. C'est une information **manquante du chantier**, pas une
   donnée de référentiel.
4. **Liteaux** : la fiche du négoce, quand tu l'auras. En attendant, les ml
   sont calculés et le conditionnement reste à confirmer.

### Liste envoyée aujourd'hui au fournisseur (code réel, sans perte)

```
- Écran de sous-toiture respirant (écran de sous-toiture HPV, entraxe 90 cm) : pour une surface de 120 m² (quantité à calculer)
- Contre-lattage en liteaux 27x40 (contre-lattes en liteaux de section 27x40 mm) : pour une surface de 120 m² (quantité à calculer)
- Lattage en liteaux 27x40 pour tuiles HP10 (liteaux de section 27x40 mm) : pour une surface de 120 m² (quantité à calculer)
- Couverture en tuiles terre cuite HP10 rouge (tuiles en terre cuite grand moule type HP10 de coloris rouge) : pour une surface de 120 m² (quantité à calculer)
- Rives de toit (tuiles de rive) : pour une longueur de 24 m (quantité à calculer)
- Faîtage (faîtières ventilées, avec closoir ventilé et accessoires de fixation) : pour une longueur de 10 m (quantité à calculer)
- Gouttière PVC de 25 sable (gouttières demi-ronde de 25 en PVC de coloris sable, 2×10 m, crochets et naissances compris) : 20 m
- Descente d'eau pluviale PVC Ø80 avec coudes (ensemble de descente d'eau pluviale en PVC Ø80 coloris sable, hauteur 4 m, comprenant 2 jeux de coudes et les colliers de fixation par descente) : 2 unités
- Chatières de ventilation (tuiles chatières de ventilation adaptées au modèle HP10) : 10 unités
- Sortie de toit Poujoulat (sortie de toit complète de marque Poujoulat, HP10, avec solin d'étanchéité adapté à la tuile HP10) : 1 unité
```

### La liste d'achat visée (après validation des règles et réponses)

```
Tuiles terre cuite HP10 rouge         1 306 pièces   ≈ 6 palettes
Liteaux 27×40                         349,85 ml      (conditionnement à confirmer)
Contre-lattes 27×40                   133,33 ml      (conditionnement à confirmer)
Écran HPV SOP'ÉCRAN 1,50 × 50 m       2 rouleaux
Faîtières (modèle confirmé)           30 pièces
Closoir ventilé                       10 ml          (produit à préciser)
Gouttière PVC demi-ronde 25 sable     20 ml          (longueur des barres : fiche Nicoll)
Naissances LG25 Ø80 sable             2
Tubes PVC Ø80 sable                   8 ml           (longueur des tubes : fiche Nicoll)
Coudes Ø80 sable                      selon votre réponse
Crochets, colliers                    impossibles sans l'espacement Nicoll
Rives HP10 gauche/droite              impossibles sans les fiches accessoires
Chatières HP10 rouge                  10 pièces      (référence à préciser)
Sortie de toit Poujoulat + solin HP10 1              (modèle et diamètre manquants)
```
