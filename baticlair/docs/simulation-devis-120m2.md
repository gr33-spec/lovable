# Simulation du devis test de 120 m² : ce que BatiClair sait, ce qu'il doit demander

> **Date** : 2026-10-01 · référentiel `roofing-2026.10.01-2`.
> **Rejouée à chaque version** par `packages/domain/test/simulation-devis-120.test.ts` :
> si la frontière bouge, le test le montre.
>
> **Devis utilisé** : reconstitué d'après ton exemple, parce que le vrai devis
> test reste à fournir. Le classement des lignes est fait ici par mots-clés ;
> dans l'appli, l'IA le proposera, avec ses preuves.
>
> **Aucun résultat forcé.** Les quantités « après validation » ne sont
> **pas** montrées à un artisan aujourd'hui (§ 3).

## 1. Ligne par ligne

| Ligne du devis | 1. Ce que BatiClair sait automatiquement | 2. Ce qu'il calcule avec certitude | 3. Information manquante | 4. Seule question posée | 5. Ce qui part au fournisseur |
|---|---|---|---|---|---|
| **L1** Dépose couverture existante – 120 m² | C'est une prestation | — | — | aucune | Rien (une prestation ne se commande pas) |
| **L5** Tuiles terre cuite grand moule type HP10 – 120 m² | Surface 120 m² (devis). Modèle **probable** : HP 10 Huguenot, reconnu par « HP10 ». Fiche vérifiée : largeur utile 268 mm, pureau de 310 à 376 mm, 240 tuiles/palette. | **Rien d'exact.** Seulement une fourchette : **1 191 à 1 445 tuiles** (5 à 7 palettes) selon le pureau, soit ±10 %. | Confirmation du modèle (« type HP10 » ne cite ni la marque ni la réf. 205). **Pureau retenu.** Validation de la règle de calcul. | « J'ai identifié : Tuiles HP10. C'est bien ce modèle ? », puis « À quel pureau posez-vous ces tuiles ? » | **Aujourd'hui** : « … HP10 : pour une surface de 120 m² (quantité à calculer) ». **Après validation** (pureau 34,3 cm) : **1 306 pièces** (≈ 6 palettes). |
| **L4** Liteaux 27×40 – 120 m² | Section 27×40, surface 120 m² | **Rien d'exact.** Fourchette : **319 à 387 ml** selon le pureau | Pureau (même question que les tuiles, posée **une seule fois**). Longueur vendue (fiche du négoce). Validation de la règle. **Non compté** : doublage du liteau d'égout et liteaux de faîtage. | aucune de plus | **Aujourd'hui** : « pour une surface de 120 m² ». **Après** : 349,85 ml → **88 longueurs de 4 m** (si 4 m est confirmé). |
| **L3** Contre-lattes 27×40 – 120 m² | Section, surface | **Rien.** Il faut l'entraxe des chevrons | **Entraxe des chevrons.** Validation de la règle. | « Entraxe des chevrons ? » | **Aujourd'hui** : « pour une surface de 120 m² ». **Après** (60 cm) : 200 ml → **50 longueurs de 4 m**. |
| **L2** Écran sous-toiture HPV – 120 m² | Famille « écran », surface **couverte** 120 m² | **Rien** tant que le rouleau n'est pas connu. Avec le SOP'ÉCRAN HPV R2 1,50 × 50 m, ce serait 128,57 m² (pente > 30 %) ou 138,46 m² (≤ 30 %), donc **2 rouleaux dans les deux cas**. | **Quel écran** : « HPV » ne désigne aucune marque ni taille de rouleau. Pente. Validation de la règle. | « Quel produit pour : écran sous-toiture ? », puis « Pente du toit ? » | **Avant ce jour** : « 120 m² », faux car les recouvrements manquaient (§ 2). **Aujourd'hui** : « pour une surface de 120 m² ». **Après** : **2 rouleaux**. |
| **L6** Faîtage avec faîtières et closoir ventilé – 12 ml | 12 ml de faîtage. La ligne est classée « closoir » **seulement**. | **Rien** | Le référentiel faîtage n'existe pas encore : faîtières au ml (réf. 710 ?), closoir (longueur du rouleau), fixations. | aucune possible aujourd'hui | « Faîtage avec faîtières et closoir ventilé : 12 ml », tel quel. Le fournisseur fait le métré. |
| **L7** Rives à rabat – 20 ml | 20 ml de rives | **Rien** | Rives gauches et droites, pièces au ml (fiche accessoires HP 10) | aucune possible aujourd'hui | « Rives à rabat : 20 ml », tel quel |
| **L8** Gouttière zinc demi-ronde dév. 33 – 24 ml | 24 ml de gouttière | **Rien** sur les accessoires | Longueur des barres, crochets (espacement), naissances, talons, angles | aucune possible aujourd'hui | « … : 24 ml », tel quel, **sans accessoires** |
| **L9** Descente zinc Ø 80 – 10 ml | 10 ml de descente | **Rien** sur les accessoires | Longueur des tubes, coudes, colliers, dauphin | aucune possible aujourd'hui | « … : 10 ml », tel quel, **sans accessoires** |

## 2. Ce que la simulation a révélé (corrigé et devenu test permanent)

1. **L'écran en m² était envoyé comme une quantité d'achat.** « Écran HPV
   120 m² » sur un devis client désigne la surface **couverte**. Avec les
   recouvrements, il faut davantage d'écran. C'est corrigé : l'écran part
   « pour une surface de 120 m² ».
2. **« Écran HPV » était rattaché à la marque Soprema.** Une description
   générique (« écran HPV », « membrane respirante », « pare-pluie haute
   perméance ») désigne la **famille**, jamais une marque. Le produit
   Soprema ne se reconnaît plus qu'à son nom (« SOP'ÉCRAN »). Sinon,
   BatiClair demande quel écran.
3. **Frontière documentée, pas corrigée :** une ligne « faîtage avec
   faîtières et closoir » contient **deux produits**, et le classement n'en
   retient qu'un. Il faudra un ouvrage « faîtage » (faîtières au ml,
   closoir au rouleau), avec les fiches accessoires.

Cas limites déjà fixés : écran à 30 % de pente pile (≤ 30 % → 20 cm) ; et
« 120 m² + HP10 » qui ne suffisent pas, car le pureau n'est jamais choisi
par BatiClair.

## 3. Pourquoi aucune quantité n'est encore montrée à un artisan

Les **caractéristiques fabricant** sont vérifiées : HP 10, SOP'ÉCRAN. Les
**règles de calcul**, en revanche, sont des règles BatiClair que tu n'as
pas encore validées :
- tuiles = surface ÷ (largeur utile × pureau) ;
- liteaux = surface ÷ pureau ;
- contre-liteaux = surface ÷ entraxe ;
- écran = surface × largeur ÷ (largeur − recouvrement).

Tant qu'elles restent en attente, le moteur répond « Règle de calcul en
attente de vérification » et ne donne **aucun chiffre**. Il manque aussi la
**fiche du négoce** pour la longueur vendue des liteaux.

Les règles des liteaux et des tuiles **redonnent déjà les tableaux de la
fiche Edilians** (3,22 / 2,91 / 2,66 ml/m² ; 9,9 à 12 tuiles/m², à
l'arrondi de la fiche près). C'est vérifié par un test.

## 4. Le parcours de l'artisan, si les règles étaient validées *(mis à jour)*

**Nouvelle règle du moteur** : une donnée inconnue n'est demandée que si
elle **change la commande**. Le moteur calcule la commande pour **toutes**
ses valeurs possibles (calcul sur intervalles, sans tirer de valeurs au
hasard). Si la commande est la même partout, il ne pose pas la question et
écrit « inconnue, sans effet sur la commande » dans « Voir le calcul ».

| # | Question | Indispensable ? | Pourquoi |
|---|---|---|---|
| 1 | « J'ai identifié : Tuiles HP10. C'est bien ce modèle ? » | **Oui**, pour ce devis | « type HP10 » ne cite ni la marque ni la référence. **Disparaît** si le devis écrit « Edilians HP 10 réf. 205 ». |
| 2 | « À quel pureau posez-vous ces tuiles ? » | **Oui** | Il change la commande : **de 1 191 à 1 445 tuiles** (la question l'affiche). Aucune donnée prouvée ne permet de le déduire. |
| 3 | « Entraxe des chevrons ? » | **Oui**, si le devis ne le donne pas | Sans entraxe, le nombre de contre-liteaux peut tout valoir. **Disparaît** si le devis ou un plan l'indique. |
| 4 | « Quel produit pour : écran sous-toiture ? » | **Au premier chantier seulement** | Ensuite, l'**écran habituel** de l'entreprise répond (préférence mémorisée, modifiable, jamais une donnée fabricant). |
| — | ~~« Pente du toit ? »~~ | **Supprimée** | De 128,57 m² (pente > 30 %) à 138,46 m² (≤ 30 %) : **2 rouleaux dans tous les cas**. Pour 70 m², la pente compte (1 ou 2 rouleaux) : là, elle est demandée. Les deux cas sont testés. |

**Bilan** : 4 questions au premier chantier, 3 ensuite. Ce serait **1 seule**
(le pureau) si le devis citait la marque, la référence et l'entraxe. C'est
encore au-dessus de l'objectif « 0 ou 1 », mais chaque question restante a une
raison chiffrée.

Liste d'achat obtenue :

```
Tuiles HP10          1 306 pièces   ≈ 6 palettes
Liteaux 27×40        88 longueurs de 4 m   (349,85 ml)
Contre-liteaux 27×40 50 longueurs de 4 m   (200 ml)
Écran HPV            2 rouleaux            (128,57 à 138,46 m², pente sans effet)
+ faîtage, rives, gouttière, descente : tels qu'écrits (hors référentiel)
```

## 4 bis. Faiblesses restantes de l'architecture (révélées par ce cas)

1. **Ouvrages linéaires.** « Faîtage 12 ml » ou « rives 20 ml » sont des
   mesures d'ouvrage, comme les m². Elles partent pourtant telles quelles,
   car l'étape 0 ne traite que les surfaces. Le moteur sait déjà faire
   « 1 ouvrage → plusieurs matériaux ». Il manque les données (fiches
   accessoires) et les ouvrages faîtage, rives, gouttière et descente.
2. **Extraction du contexte chantier.** La structure existe et elle est
   testée : preuves réunies, contradictions signalées, réponse de
   l'artisan prioritaire. L'IA qui remplit ce contexte à partir du devis
   (prompt v6, avec preuves) reste à écrire.
3. **Préférences de l'entreprise.** Elles fonctionnent dans le moteur. Leur
   enregistrement (base de données, écran pour les modifier) reste à
   faire.
4. **Données sans borne prouvée** (entraxe). Sans plage admissible
   sourcée, une donnée inconnue peut tout valoir : la question reste
   nécessaire, sauf si le devis la donne.
5. **Validation des règles.** Tant que les 4 règles de calcul ne sont pas
   validées, rien n'est montré à un artisan.

## 5. Ce qu'il faut pour aller plus loin

1. **Toi** : valider ou corriger les 4 règles de calcul (§ 3), et dire ce qu'il
   faut ajouter (doublage d'égout, rang de faîtage).
2. **Documents** : le vrai devis test, la fiche du négoce pour les liteaux,
   les fiches accessoires HP 10 (faîtage, rives), puis gouttières et
   descentes.
3. **Moi** : ne pas poser une question qui ne change pas la commande
   (pente) ; ouvrages « faîtage » et « rives » dès que les fiches sont là.
