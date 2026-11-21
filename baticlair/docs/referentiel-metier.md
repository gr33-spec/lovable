# Du devis client à la liste d'achat fournisseur : audit et architecture

> **Statut** : décidé (2026-10-01) : le moteur de quantitatif est le cœur de
> BatiClair. Étapes 0 et 1 réalisées ; structure et premier exemple :
> `referentiel-exemple-couverture.md`.
>
> **Principe** : complexité derrière, simplicité devant. BatiClair **sait et
> justifie**, ou **demande**, ou **dit qu'il ne sait pas**. Jamais de fausse
> précision.

---

## 1. Audit : pourquoi on obtient « 120 m² de liteaux »

Le comportement actuel est **voulu par construction**. Ce n'est pas un bug
isolé : le système a été conçu comme un **transcripteur fidèle du devis**,
pas comme un métreur.

| # | Constat | Où |
|---|---|---|
| 1 | La consigne de lecture (prompt v5) demande de lister les fournitures **« telles qu'écrites dans le devis »**, une ligne par ligne du devis, et interdit tout calcul (« Ne calcule jamais de quantité »). Or un devis client chiffre des **ouvrages** (« Fourniture et pose liteaux 27×40 — 120 m² » = 120 m² de toiture liteautée). On recopie donc une surface d'ouvrage comme si c'était une quantité d'achat. | `apps/api/src/modules/takeoff/application/prompt.ts` |
| 2 | La validation **repère** déjà le problème : « Liteau en m², c'est inhabituel » (`UNIT_UNUSUAL_FOR_FAMILY`), « Tuile en m² : combien de pièces au m² ? » (`AREA_NEEDS_PRODUCT_YIELD`). Mais elle ne propose **aucune conversion**. L'artisan n'a que deux choix : « C'est bon » (la ligne devient « sûre » telle quelle) ou corriger à la main, ce qui revient à faire le métré lui-même. | `packages/domain/src/takeoff/validation.ts` |
| 3 | Le modèle de données ne distingue pas **ouvrage**, **besoin matériau** et **ligne d'achat**. Le type `work_item` (ouvrage à convertir) était prévu dans `docs/domain-model.md`, mais il n'a jamais été implémenté. Une `TakeoffLine` ne stocke que `designation`, `quantityRaw` et `unitRaw`. | `apps/api/prisma/schema.prisma` |
| 4 | Le référentiel couvreur (`TradeProfile`) sert à **reconnaître** les lignes : mots-clés, unités admises, plafonds de vraisemblance, oublis fréquents. Il ne contient **aucune donnée produit** (tuiles/m², pureau, longueurs commerciales, conditionnements) ni aucune source. Il est codé en TypeScript, donc pas versionné comme une donnée sourcée. | `packages/domain/src/trades/roofing.ts` |
| 5 | Les conversions d'unités sont saines mais volontairement limitées. `Quantity.convertTo` refuse m² → pièces et ml → m² sans conditionnement explicite, et c'est bien ce qu'on veut. En revanche, rien ne fournit ce conditionnement ou ce rendement depuis une donnée vérifiée. | `packages/domain/src/quantity/quantity.ts` |
| 6 | La demande de prix envoie au fournisseur la ligne **telle quelle**, et le fournisseur reçoit « Liteaux 27×40 : 120 m² ». La comparaison rapproche ensuite les lignes fournisseur par **similarité de texte** (IA, `requestLine`). Une réponse en ml face à une demande en m² donne `UNIT_NOT_COMPARABLE`. | `price-requests.service.ts`, `offers/application/prompt.ts`, `comparison/engine.ts` |

**Conséquence** : l'erreur d'origine (ouvrage pris pour un achat) se propage
à la consultation, puis à la comparaison et à l'économie annoncée. Corriger
l'écran ne suffit pas : il faut **une étape de conversion métier** entre la
lecture et la consultation.

### Ce qui est sain et qu'on garde
- **Traçabilité** de chaque ligne jusqu'au devis : les références
  `[page:ligne]` sont vérifiées par le code (`reviewExtractedTakeoff`).
- **Doute → question unique** à l'artisan (QuestionCard), jamais de
  correction silencieuse (PD-026).
- **Objets-valeurs** `Quantity`, `Unit`, `PackagingSpec`, `Decimal`, `Money` :
  des calculs exacts et des conversions refusées quand elles ne sont pas
  sûres.
- **Profils métier** comme principe : un métier = de la donnée, pas du code.
  Le format doit évoluer (§ 3), pas le principe.
- **Moteur de comparaison déterministe** (sommes calculées par le code,
  estimation des manquants, `COMPARISON_ENGINE_VERSION`).
- **Versionnage** des prompts et du moteur, et `AiExecution` pour l'audit.

---

## 2. Les trois niveaux à distinguer

```
OUVRAGE (ce que le client paie)        « Couverture tuiles HP10 – 120 m² »
   │  lu par l'IA, prouvé par le devis
   ▼
BESOIN MATÉRIAU (ce que l'ouvrage consomme)
   tuiles = surface × tuiles/m² (fiche fabricant)
   liteaux = surface ÷ pureau (+ rangs d'égout/faîtage)
   contre-liteaux = surface ÷ entraxe des chevrons
   │  calculé par le code, avec une règle sourcée
   ▼
LIGNE D'ACHAT (ce qu'on demande au fournisseur)
   Tuiles HP10        1 320 pièces  ≈ 4 palettes
   Liteaux 27×40      372 ml        ≈ 93 longueurs de 4 m
   │  conditionnement + marge justifiée + arrondi au supérieur
   ▼
DEMANDE DE PRIX → RÉPONSES → COMPARAISON SUR LE BESOIN
```

*(Les nombres ci-dessus sont fictifs : ils illustrent la forme, pas des
coefficients.)*

Chaque besoin et chaque ligne d'achat porte **son origine** :

| Origine | Sens | Affichage |
|---|---|---|
| `explicit` | Écrit tel quel dans le devis (déjà une quantité d'achat : « 3 rouleaux d'écran ») | aucune mention |
| `deduced` | Calculé par une règle **vérifiée** à partir d'un ouvrage du devis | « Calculé » · Voir le calcul |
| `suggested` | Habituellement nécessaire, **absent du devis** | « À confirmer » (jamais ajouté sans un oui) |
| `unknown` | Calcul impossible : il manque une donnée | « Calcul impossible sans le modèle exact » + action |

---

## 3. Le référentiel métier

### 3.1 Contenu (entités)

Le référentiel est **commun à tous les artisans** et **en lecture seule**
pour eux. On ne le confond pas avec la mémoire privée de chaque entreprise
(§ 3.4).

| Entité | Rôle | Exemples couverture |
|---|---|---|
| **Trade** | Métier | `roofing` |
| **WorkItemType** (type d'ouvrage) | Ce qu'un devis chiffre, avec ses **paramètres** requis | « Couverture en tuiles à emboîtement sur liteaux » : surface (m²), modèle de tuile, entraxe des chevrons ; facultatifs : longueur de faîtage, de rive, d'égout |
| **ProductFamily** | Famille de produits (reprend les 22 familles actuelles) | `roof_tile`, `batten`, `underlay`… |
| **Product** | Produit identifié (fabricant + modèle), ou **gabarit générique** quand le modèle importe peu | « Tuile X modèle Y » ; « Liteau sapin traité 27×40 » |
| **ProductAttribute** | Caractéristique chiffrée d'un produit, **une valeur = une source** | tuiles/m², pureau min/max, dimensions, poids, Sd d'un écran, classe de traitement |
| **Packaging** (conditionnement) | Unités de vente et contenu | palette de N tuiles ; botte de N liteaux de 4 m ; rouleau de 1,5 × 50 m |
| **Alias** (synonyme) | Texte → famille, produit ou attribut, avec sa portée (métier, fournisseur) | « HP10 », « tuile grand moule », « BA13 », « plaque 13 mm », « écran HPV », « membrane respirante » |
| **Recipe** (règle de calcul) | Type d'ouvrage → besoins matériaux, en **formules déclaratives** | `tuiles = ceil(surface × tuiles_par_m2 × (1 + marge_casse))` |
| **WasteRule** (marge) | Marge par famille, sourcée **ou** réglée par l'artisan | casse des tuiles, chutes de coupe |
| **Source** | Origine de toute valeur | fiche technique fabricant (URL, date), DTU / document reconnu, vérification BatiClair |

### 3.2 Une valeur n'existe jamais sans sa provenance

Chaque attribut, conditionnement, règle et marge porte :

```
source: { kind: manufacturer_sheet | standard | baticlair_verified | other,
          title, publisher, url | documentRef, retrievedAt }
verification: { status: draft | verified | deprecated,
                verifiedAt, verifiedBy, notes }
confidence: high | medium | low      # déduit du kind + status, pas déclaré librement
version: entier, incrémenté à chaque changement
```

- **Seules les valeurs `verified` servent au calcul automatique.**
- Une valeur `draft`, trouvée sur le web ou proposée par l'IA, n'est
  **jamais** utilisée en silence. Au mieux, elle alimente une question
  (« La fiche du fabricant indique N tuiles/m². C'est bien ça ? ») ; au
  pire, elle reste dans la file de vérification.
- Une valeur `deprecated` reste lisible pour rejouer un ancien calcul.
- Ordre de confiance : fabricant > document technique reconnu >
  vérifié BatiClair > autre source identifiée.

### 3.3 Stockage : « données comme du code », chargées en base

- **Source de vérité** : des fichiers de données versionnés dans le dépôt
  (`packages/referential/data/roofing/*.json`), relus en revue de code
  comme le code. Chaque modification garde donc une trace : qui l'a faite,
  quand, pourquoi, avec quelle source.
- **Contrôles automatiques** (tests) :
  - toute valeur `verified` a une source et une date ;
  - toute formule ne cite que des paramètres déclarés ;
  - les unités sont cohérentes (on n'additionne pas des m² et des ml) ;
  - chaque règle a des **cas d'exemple** avec résultat attendu, comme des
    tests de non-régression métier.
- **Chargement en base** au déploiement (tables de référence non
  rattachées à une entreprise). Chaque calcul enregistre la **version du
  référentiel** utilisée, pour pouvoir rejouer et expliquer un ancien
  quantitatif.
- Plus tard, un écran d'administration (équipe BatiClair) pourra écrire
  dans ces mêmes tables, avec le même circuit brouillon → vérifié.

**Pourquoi pas des `if/else`** : un nouveau métier ajoute des **fichiers de
données** (types d'ouvrage, produits, alias, règles) et leurs cas d'exemple.
Le moteur, lui, ne change pas.

### 3.4 Mémoire privée de l'entreprise (séparée)

Ce que l'artisan nous apprend ne sert **qu'à lui** :
- son produit habituel (« Mes tuiles, c'est toujours le modèle Y ») ;
- sa marge de casse habituelle et sa section de liteaux habituelle ;
- ses réponses aux questions ;
- les références de ses fournisseurs (« chez Point.P, TUI-RC12 = … »).

Cette mémoire **règle des choix**, jamais des coefficients techniques.
Exemple : l'artisan peut dire « je prends 5 % de casse », mais pas « cette
tuile fait 9/m² » contre la fiche du fabricant. Ce cas-là devient un
signalement à vérifier par l'équipe.

---

## 4. Le mécanisme de conversion

```
1. LECTURE (IA)            lignes du devis + preuves [page:ligne]
2. QUALIFICATION (IA → code)
   pour chaque ligne : prestation / fourniture / ouvrage
   + type d'ouvrage candidat + mentions produit + paramètres lus
   (surface, ml, section, modèle), chacun avec sa preuve
   → le code vérifie chaque preuve et chaque valeur dans le texte
3. RÉSOLUTION (code)       alias → produit / famille du référentiel
   un seul candidat vérifié  → retenu
   plusieurs candidats       → UNE question (« C'est bien la tuile X ? »)
   aucun                     → famille seule, modèle « à préciser »
4. CALCUL (code)           règle du type d'ouvrage + attributs vérifiés
   → besoins (quantité, unité, origine, trace du calcul)
5. ACHAT (code)            conditionnement + marge + arrondi au supérieur
   → lignes d'achat (« 372 ml ≈ 93 longueurs de 4 m »)
6. QUESTIONS               une à la fois, la plus coûteuse d'abord ;
   chaque réponse est mémorisée, puis on reprend à l'étape 3
7. VALIDATION ARTISAN      la liste d'achat, et non plus la transcription
```

**Trace du calcul** (« Voir le calcul ») : on enregistre chaque calcul pour
pouvoir l'afficher simplement :

> 120 m² de toiture (devis, ligne 4) × N tuiles/m² (fiche fabricant,
> vérifiée le …) = X tuiles + 5 % de casse (votre réglage) = Y →
> arrondi à Z palettes de P.

---

## 5. Quand une donnée manque

| Situation | Réponse de BatiClair |
|---|---|
| Le modèle est identifié sans ambiguïté et ses données sont vérifiées | Il calcule et montre « Calculé ». |
| Le modèle est probable (un alias, plusieurs candidats) | **Une question** : « J'ai reconnu la tuile X. C'est bien ce modèle ? » [Oui] [Modifier]. |
| Un paramètre de l'ouvrage manque (entraxe des chevrons, longueur de faîtage) | **Une question** à choix simples. Sans réponse : « À confirmer », sans calcul. |
| Le produit est inconnu du référentiel | « Calcul impossible sans les données de ce modèle ». La demande au fournisseur est **formulée en ouvrage** (« Tuiles X pour **120 m² de couverture** : merci d'indiquer la quantité »), ce qui laisse le métré au fournisseur, honnêtement. Le produit part dans la **file d'enrichissement**. |
| Un matériau est habituel mais absent du devis | Suggestion « À confirmer », jamais ajoutée sans un oui. |

**File d'enrichissement** : la liste des produits et alias inconnus
rencontrés sur de vrais devis. L'équipe (ou un outil de recherche web
assistée) y propose une valeur en **brouillon, avec sa source** ; une
personne la vérifie avant qu'elle serve. BatiClair s'améliore ainsi devis
après devis, sans jamais transformer une recherche automatique en vérité.

---

## 6. Ce que fait l'IA, ce que fait le code

| IA (proposer, avec preuves) | Code (décider, calculer) |
|---|---|
| Lire le devis (texte et images) | Vérifier chaque preuve et chaque nombre dans le texte |
| Qualifier une ligne : ouvrage, fourniture ou prestation | Valider le type d'ouvrage contre le référentiel |
| Repérer des mentions de produit et des paramètres | Résoudre les alias, ou poser une question |
| Proposer un rapprochement quand le texte est inhabituel | **Tous les nombres** : coefficients, formules, marges, arrondis, conversions, montants |
| Lire les devis fournisseurs | Comparer besoin par besoin, attributs compris |
| Aider à préparer des brouillons de données (file d'enrichissement) | Refuser toute valeur non vérifiée dans un calcul |

**Jamais par l'IA** : un coefficient, un rendement, une marge, un
conditionnement, un prix.

---

## 7. Comparaison fournisseurs : comparer des besoins

Chaque ligne d'achat porte une **identité métier** : une famille, un produit
s'il est connu, et des **attributs clés** (section 27×40, classe de
traitement, Sd de l'écran, épaisseur 13 mm…). Les lignes fournisseur passent
par la **même résolution** (alias + attributs lus) :
- **même besoin, mêmes attributs** : équivalent ;
- **même besoin, attribut différent ou inconnu** : « Référence différente :
  à vérifier avant commande (Sd non indiqué) » ;
- **besoin non couvert** : manquant, estimé au prix des autres. Le moteur
  sait déjà le faire.

Le moteur déterministe existant reste la base. Il gagne des quantités
comparables (même unité d'achat) et des constats rédigés en artisan :
« A est le moins cher à périmètre égal, mais il manque 2 rouleaux d'écran
estimés à X € ».

---

## 8. Ce qu'on réutilise

| Existant | Devient |
|---|---|
| Prompt v5 + vérification des preuves | Étape 1 (lecture), inchangée sur le fond ; le prompt v6 ajoute la qualification (étape 2) |
| `TradeProfile.families` (22 familles couvreur) | `ProductFamily` du référentiel, migrées en données |
| Alertes `UNIT_UNUSUAL_FOR_FAMILY` / `AREA_NEEDS_PRODUCT_YIELD` | Déclencheurs de l'étape 3 (« ouvrage à convertir ») au lieu de simples alertes |
| `companionRules` | Suggestions « À confirmer » |
| `Quantity`, `PackagingSpec`, `Unit`, `Decimal` | Moteur de calcul (étapes 4-5) |
| QuestionCard (une question à la fois) | Questions de résolution et de paramètres |
| Snapshot des lignes à l'envoi de la demande | Snapshot des **lignes d'achat** |
| `compareOffers` + estimation des manquants | Comparaison sur besoins, enrichie des attributs |
| `ProductAlias` (prévu dans le modèle de domaine) | Mémoire privée des références fournisseur |

---

## 9. Plan d'implémentation proposé

**Étape 0 — Arrêter la fausse précision (petit, tout de suite).**
Une ligne « liteaux en m² » ou « tuiles en m² » ne part plus au fournisseur
comme une quantité de matériau. Elle part en **ouvrage** :
« Liteaux 27×40 pour 120 m² de couverture : merci d'indiquer la quantité ».
L'écran l'affiche « Quantité à calculer ». C'est honnête dès aujourd'hui, en
attendant le moteur.

**Étape 1 — Fondations du référentiel (sans changement visible).**
- Format des données et schéma : entités § 3.1, provenance § 3.2.
- Chargeur, tables de référence, version enregistrée sur chaque calcul.
- Évaluateur de formules déclaratives, sûr (pas d'`eval`), avec contrôle
  des unités.
- Tests de cohérence, et cas d'exemple obligatoires pour chaque règle.

**Étape 2 — Données couverture vérifiées.**
- Types d'ouvrage : tuiles à emboîtement, tuiles canal, ardoises, écran,
  liteaunage et contre-liteaunage, faîtage et rives, zinguerie courante.
- Produits : les modèles qu'on rencontre réellement dans **tes** devis,
  d'abord. Chaque valeur vient d'une fiche fabricant, avec URL et date, et
  est vérifiée par une personne.
- Règles de liteaunage et de contre-liteaunage d'après le DTU 40.2x et les
  fiches de pose fabricant. Aucune valeur n'est écrite de mémoire.

**Étape 3 — Conversion dans l'appli.**
- Prompt v6 : qualification et paramètres, avec leurs preuves.
- Résolution, calcul, lignes d'achat, une question à la fois.
- Écran : nom court, quantité d'achat, « ≈ conditionnement », origine,
  « Voir le calcul ».
- La validation de l'artisan porte sur la **liste d'achat**.

**Étape 4 — Consultation et comparaison sur besoins.**
- Demandes de prix construites à partir des lignes d'achat.
- Résolution des lignes fournisseur, constats sur les attributs, phrases de
  synthèse « comme un artisan ».

**Étape 5 — Enrichissement et autres métiers.**
- File d'enrichissement, écran d'administration, recherche web assistée
  (brouillons sourcés).
- Puis plâtrerie, isolation, carrelage… : de nouveaux fichiers de données
  et leurs cas d'exemple, sans toucher au moteur.

### Évaluation (indispensable avant de promettre)
Constituer un **jeu de vérité** : 10 à 20 vrais devis de couverture, avec
**la commande réellement passée** pour chaque chantier. Chaque version du
moteur est mesurée dessus :
- part de lignes calculées, écart de quantité par famille ;
- questions posées par devis ;
- zéro valeur inventée.

---

## 10. Décisions à prendre par le fondateur

1. **Qui vérifie les données du référentiel** (toi, un couvreur partenaire,
   l'équipe) ? Aucune valeur ne passe en « vérifiée » sans une personne
   identifiée.
2. **Jeu de vérité** : peux-tu fournir des devis réels avec les bons de
   commande correspondants (anonymisés) ?
3. **Marges** : faut-il une marge par défaut **sourcée** (recommandation
   fabricant), ou uniquement le réglage de chaque artisan (0 % tant qu'il
   n'a rien réglé, affiché clairement) ?
4. **Étape 0** : d'accord pour l'appliquer tout de suite ?
