# Moteur de quantitatif : structure et premier exemple (à valider)

> **Principe** : l'IA comprend → le référentiel connaît → le code calcule →
> l'artisan vérifie simplement.
>
> **État au 2026-10-01** : les fondations sont codées et testées (étape 1).
> Les données couverture sont **en brouillon** : aucune ne sert au calcul
> d'un artisan tant que tu ne les as pas vérifiées. Rien n'a encore changé
> dans l'appli, à part l'étape 0 (§ 5).

---

## 1. La structure définitive

Code : `packages/domain/src/referential/`. Données couverture :
`referential/data/roofing.ts`.

```
Référentiel (un par métier, versionné : « roofing-2026.10.01-1 »)
├── Sources ............ fiche fabricant, DTU, règle BatiClair, distributeur
├── Familles ........... Tuile, Liteau, Écran…  (unité du besoin + caractéristiques attendues)
├── Produits ........... HP 10 Huguenot, Liteau 27×40 4 m, Écran HPV R2 1,50×50
│     ├── appellations   « hp10 », « hp 10 huguenot » / « membrane respirante »…
│     ├── caractéristiques  valeur + unité + source + vérification + version
│     └── unités de vente   pièce, longueur de 4 m, rouleau de 75 m², palette…
├── Ouvrages ........... « Couverture en tuiles à emboîtement sur liteaux »
│     ├── paramètres     surface, pureau, entraxe des chevrons, pente (+ question si absent)
│     ├── emplacements   tuile, liteau, contre-liteau, écran
│     ├── constantes     recouvrement de l'écran selon la pente… (sourcées)
│     └── besoins        une formule par besoin, sourcée, avec ce qu'elle exclut
└── Marges ............. recommandation sourcée, sinon réglage de l'artisan, sinon 0 % (affiché)
```

**Chaque donnée chiffrée** a la même forme :

```
valeur 0,268 · unité m · produit HP 10 Huguenot · source « Fiche HP 10 Huguenot (Edilians) »
vérification : brouillon | vérifiée le JJ/MM/AAAA par <nom> | retirée · version 1
```

**Garde-fous automatiques** (tests qui bloquent toute mise en ligne) :
- **Sources et vérification**
  - une donnée sans source connue est refusée ;
  - une donnée « vérifiée » sans date ni nom est refusée.
- **Unités et formules**
  - une formule qui mélange des m² et des ml est refusée ;
  - une formule qui annonce des ml en calculant des m² est refusée ;
  - les arrondis se font sur des pièces, jamais sur des mètres ;
  - les formules sont lues par un analyseur écrit pour BatiClair, qui
    refuse tout ce qui n'est pas un calcul.
- **Appellations** : une même appellation pour deux produits de la même
  famille est refusée. Le cas se tranche par une question à l'artisan,
  jamais en prenant le premier de la liste.
- **Calcul** : une donnée en brouillon ne sert jamais au calcul d'un
  artisan. Le moteur répond alors « en attente de vérification ».

---

## 2. Exemple complet : « Couverture tuiles HP10 – 120 m² »

### Ce que BatiClair lit et demande

| Information | D'où elle vient |
|---|---|
| Surface 120 m² | Devis (ligne citée) |
| Modèle HP 10 Huguenot | Reconnu par l'appellation « HP10 ». **Question** : « J'ai identifié : Tuiles HP10. C'est bien ce modèle ? » [Oui] [Modifier] |
| Pureau 34,3 cm | **Question** : « À quel pureau posez-vous ces tuiles ? ». La réponse est refusée si elle sort de la fiche (31 à 37,6 cm). |
| Entraxe des chevrons 60 cm | **Question** (seulement si les contre-liteaux sont retenus) |
| Pente 45 % | **Question** (seulement si l'écran est retenu) |

Une seule question à la fois, et chaque réponse sert à tout l'ouvrage : le
pureau sert aux tuiles **et** aux liteaux.

### Ce que l'artisan voit (téléphone)

*Calcul provisoire : données en brouillon (§ 3).*

```
Tuiles HP10                              1 306 pièces
                                         Voir le calcul

Liteaux 27×40                            349,85 ml
≈ 88 longueurs de 4 m                    Voir le calcul

Contre-liteaux 27×40        À confirmer  200 ml
≈ 50 longueurs de 4 m       (pas sur le devis)

Écran HPV                   À confirmer  128,57 m²
2 rouleaux                  (pas sur le devis)
```

### « Voir le calcul » (exemple : tuiles)

```
Surface de toiture          120 m²        Devis, ligne 4
Pureau                      34,3 cm       Votre réponse
  (fiche : 31 à 37,6 cm)                  Fiche HP 10 Huguenot (Edilians)
Largeur utile (Tuiles HP10) 0,268 m       Fiche HP 10 Huguenot (Edilians)
Calcul   120 ÷ (0,268 × 0,343) = 1 305,43 tuiles
Marge    0 %  (aucune marge réglée : à toi de la régler)
Commande 1 306 pièces (arrondi au supérieur)
Non compté : tuiles de rive, faîtières et accessoires (calculés à part)
```

### Les règles de cet exemple

| Besoin | Formule | Source (en brouillon) |
|---|---|---|
| Tuiles | surface ÷ (largeur utile × pureau) | Fiche Edilians HP 10 |
| Liteaux | surface ÷ pureau | Règle BatiClair. Elle redonne le tableau « ml de liteaux par m² » de la fiche HP 10 : 3,22 / 2,91 / 2,66 ml/m² aux pureaux 31 / 34,3 / 37,6 cm. |
| Contre-liteaux | surface ÷ entraxe des chevrons | Règle BatiClair (une file par chevron) |
| Écran | surface × largeur ÷ (largeur − recouvrement) ; recouvrement 20 cm sous 30 % de pente, 10 cm au-dessus | NF DTU 40.29 |
| Achat | besoin ÷ contenu de l'unité de vente, arrondi au supérieur | Unité de vente du produit |

**Conséquence de « 3 situations seulement »** : avec le référentiel tel
qu'il est aujourd'hui (tout en brouillon), un artisan verrait, pour chaque
besoin, « Calcul impossible : donnée en attente de vérification ».
BatiClair ne montre aucune quantité tant que ses données ne sont pas
prouvées.

---

## 3. Ce que je te demande de vérifier (couvreur validateur)

| # | Donnée | Valeur en brouillon | Où vérifier |
|---|---|---|---|
| 1 | HP 10 Huguenot : largeur utile | 268 mm | Fiche Edilians HP 10 (14/12/2021) |
| 2 | HP 10 : pureau mini / maxi | 310 / 376 mm | Même fiche |
| 3 | HP 10 : tuiles par palette | *non saisi* | Même fiche (pour afficher « ≈ X palettes ») |
| 4 | Liteaux : 1 rang par pureau, hors doublage d'égout et liteaux de faîtage | règle | Ton expérience. Faut-il ajouter les rangs d'égout et de faîtage dans la règle ? |
| 5 | Contre-liteaux : 1 file par chevron | règle | Ton expérience |
| 6 | Écran : recouvrement 20 cm (< 30 %) / 10 cm (≥ 30 %) | 0,20 / 0,10 m | NF DTU 40.29 |
| 7 | Écran HPV R2 : rouleau 1,50 × 50 m = 75 m² | 1,5 m / 50 m | Fiche du produit utilisé |
| 8 | Liteaux : longueur vendue | 4 m | Tes négoces (3 m ? 4 m ? 4,2 m ?) |

Pour chaque ligne, réponds-moi « OK » ou la bonne valeur. Je passe alors la
donnée en « vérifiée le JJ/MM/AAAA par <ton nom> » et elle devient
utilisable. Plus tard, cette validation se fera dans un écran dédié.

### Questions de métier
- **Pureau** *(tranché le 2026-10-01 : donnée du chantier, jamais choisie
  par BatiClair ; voir `simulation-devis-120m2.md`)* : un artisan connaît-il son pureau, ou faut-il plutôt demander
  « combien de tuiles au m² ? » (d'après la fiche) ou la pente et la zone ?
- **Casse** : quelle marge réglerais-tu par défaut sur tes chantiers ?
  Elle restera un réglage de l'artisan, affiché dans le calcul.

---

## 4. Ce qui vient ensuite (après ta validation)

1. Compléter la couverture : rives, faîtage (faîtières, closoirs),
   gouttières (barres, crochets, naissances, talons), descentes (longueurs,
   coudes, colliers), ventilation, fixations, en commençant par **les
   produits de tes vrais devis**.
2. Brancher le moteur dans l'appli : lecture du devis qualifiée (ouvrage,
   modèle, paramètres avec preuves), questions une par une, liste d'achat
   avec « Voir le calcul ».
3. Demandes de prix et comparaison sur ces mêmes besoins. Le même
   référentiel reconnaît « Écran HPV », « Membrane respirante
   sous-toiture » et « Écran sous-toiture HPV R2 1,5×50 » comme le même
   besoin (c'est déjà testé), puis compare les caractéristiques clés.
4. Jeu de vérité : vrais dossiers anonymisés (devis client → quantitatif
   attendu → commande réelle), avec une mesure de précision à chaque
   version.

---

## 5. Étape 0 (en ligne après fusion)

Une ligne du devis client comme « Liteaux 27×40 – 120 m² » ou « Tuiles –
120 m² » est reconnue comme une **surface d'ouvrage** :
- **à l'écran** : « Pour 120 m² · quantité à calculer » (plus de « C'est
  bon » à cliquer sur une fausse quantité) ;
- **dans la demande au fournisseur** : « pour une surface de 120 m²
  (quantité à calculer) ». C'est le fournisseur qui fait le métré, en
  attendant notre moteur.
