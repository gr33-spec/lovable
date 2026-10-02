# Fiches de démonstration — 4 règles de la couverture en tuiles (étape A)

> Préparées le 2026-10-01 pour décision du fondateur. **Aucune de ces règles
> n'est validée par ce document.** Dans le référentiel, les quatre restent
> en brouillon (`baticlair-geometrie-couverture`, `verification: draft`).
>
> Principe retenu (fondateur) : une formule **purement géométrique** peut être
> validée comme telle si elle est démontrée. Une **règle de mise en œuvre**
> reste en attente tant qu'elle n'est pas sourcée, ou enregistrée
> explicitement comme pratique propre à l'entreprise.
>
> Dans chaque fiche, les hypothèses sont donc marquées :
> - **[G]** : géométrie ou définition, démontrée ici ;
> - **[M]** : mise en œuvre, **à sourcer** (fabricant, norme) avant usage ;
> - **[E]** : pratique de l'entreprise, à enregistrer comme telle, jamais universelle.
>
> Aucun chiffre ci-dessous n'est pris de mémoire. Les seules valeurs
> fabricant sont celles déjà au référentiel, relevées par le fondateur sur les
> documents officiels (page exacte encore à compléter). Le contenu des normes
> (DTU) n'a **pas** été consulté et n'est **pas** utilisé : droits non vérifiés.

## Ce que les 4 fiches ont en commun

**Notations**
- *S* : surface de la couverture, **mesurée dans le plan du versant** (en rampant).
- *W* : largeur d'un versant, parallèle à l'égout.
- *R* : longueur du rampant, de l'égout au faîtage.
- Pour un versant rectangulaire, *S = W × R*.

**Hypothèse commune [G] : la surface du devis est mesurée en rampant.**
- Si le devis donne une surface **projetée au sol**, toutes les formules sous-estiment.
- Le rapport est 1 / cos(angle de pente).
- Le devis ne le dit presque jamais. C'est une **condition d'emploi**, pas un détail.

**Découverte importante : la formule continue est un minimum.**
- Les formules « par m² » répartissent la surface sans arrondir : un rang, une tuile, une file n'existent qu'en nombre entier.
- Quand les dimensions de chaque versant sont connues, le compte par versant (arrondi au supérieur) est plus juste.
- Sur l'exemple D-2026-015, l'écart va de **+0,3 % à +8 %** selon la règle (voir chaque fiche).
- Le devis donne rarement *W* et *R*. D-2026-015 les laisse déduire (4 rives de 6 m, faîtage 10 m, 2 versants de 10 × 6 m = 120 m²), **mais ce raisonnement lui-même reste à valider**.

**Exemple chiffré utilisé partout :** D-2026-015, 120 m², 2 versants supposés de 10 m × 6 m (déduits du devis, pour l'exemple).

---

## Fiche 1 — Nombre de tuiles

**Statut proposé :** formule géométrique validable si la démonstration est acceptée ; quantité de commande **non** couverte (voir « n'inclut pas »).

**Données d'entrée**

| Donnée | Unité | D'où elle vient |
|---|---|---|
| *S* surface | m² | devis (quantité de la ligne) |
| *Lu* largeur utile de la tuile | m | fiche fabricant (HP 10 : 0,268 m, relevé fondateur, page à préciser) |
| *p* pureau retenu | m | devis, sinon **question** à l'artisan, borné par la plage fabricant (HP 10 : 0,310 à 0,376 m) |

**Formule (continue)** : *N = S / (Lu × p)*

**Démonstration [G]**
1. Une tuile à emboîtement posée laisse visible un rectangle de *Lu* (en largeur) sur *p* (en hauteur). C'est la définition même de la largeur utile et du pureau : le reste de la tuile est recouvert par ses voisines.
2. Sur un versant *W × R*, il y a *W / Lu* tuiles par rang et *R / p* rangs.
3. *N = (W / Lu) × (R / p) = W·R / (Lu·p) = S / (Lu·p)*. ∎

**Recoupement fabricant** : avec la plage HP 10, 1 / (0,268 × 0,376) = 9,92 et 1 / (0,268 × 0,310) = 12,04 tuiles/m². Le référentiel note que la documentation Edilians annonce « 9,9 à 12 tuiles/m² ». La page est **à reconfirmer** sur le PDF officiel.

**Inclut**
- Les tuiles courantes sur la surface couverte.

**N'inclut pas**
- L'arrondi par rang et par versant (voir l'exemple).
- Les tuiles de rive, faîtières, arêtiers et tuiles spéciales.
- Les chatières et tuiles à douille, qui **remplacent** peut-être des tuiles courantes : à sourcer [M].
- Les coupes en noue, arêtier et autour des fenêtres de toit.
- Les déductions d'ouvertures.
- La casse.

**Hypothèses**
- [G] surface en rampant ;
- [G] versant plan ;
- [G] pureau constant sur tout le versant ;
- [G] *Lu* et *p* sont ceux du produit réellement posé ;
- [M] le pureau choisi est admis par le fabricant pour la pente et la situation du chantier. Le moteur vérifie seulement qu'il est dans la plage de la fiche, pas qu'il convient à la pente.

**Ne pas utiliser pour**
- les tuiles plates, les tuiles canal, les ardoises (autre géométrie de recouvrement) ;
- un pureau variable sur le versant ;
- une tuile dont *Lu* n'est pas sourcée ;
- une surface dont on ne sait pas si elle est en rampant ou au sol (on demande).

**Exemple D-2026-015**

| Pureau | Formule continue | Compte par versant (2 × ⌈10 / 0,268⌉ × ⌈6 / p⌉) | Écart |
|---|---|---|---|
| 0,310 m | 1 444,4 → 1 445 | 2 × 38 × 20 = 1 520 | +5,2 % |
| 0,376 m | 1 190,9 → 1 191 | 2 × 38 × 16 = 1 216 | +2,1 % |

Le compte par versant suppose qu'une tuile coupée en bout de rang compte pour une tuile entière. C'est cohérent, mais **à valider** [M] : selon le système, la dernière tuile peut être une tuile de rive.

**Sources**
- Disponible : documentation HP 10 Huguenot, Edilians, version du 19/04/2024 (URL au référentiel, page à préciser).
- Norme : référence probable NF DTU 40.21 pour les tuiles à emboîtement ; **non consultée, droits non vérifiés**.

**Pratique de votre entreprise (séparée, à enregistrer si vous le souhaitez)**
- Pourcentage de casse et de coupe.
- Arrondi : à la palette, au paquet ou à la pièce.
- Compter par versant ou globalement.
- Votre pureau habituel par type de tuile : jamais appliqué en silence, toujours montré comme hypothèse.

---

## Fiche 2 — Liteaux (mètres linéaires)

**Statut proposé :** géométrie validable ; l'hypothèse « une file par rang » est de la **mise en œuvre à sourcer**.

**Données d'entrée** : *S* (devis), *p* pureau (devis, sinon question).

**Formule (continue)** : *L = S / p* (en mètres linéaires)

**Démonstration [G], sous l'hypothèse [M] « un liteau par rang de tuiles »**
1. Chaque rang est accroché sur une file de liteaux.
2. Les files sont espacées de *p* le long du rampant : il y en a *R / p* sur un versant.
3. Chaque file mesure *W*.
4. *L = W × R / p = S / p*. ∎

**Recoupement fabricant** : le référentiel note que la règle redonne le tableau Edilians « ml de liteaux par m² ». La formule donne 1 / p = 2,66 à 3,23 ml/m² sur la plage HP 10. **À reconfirmer** avec la page exacte du tableau.

**Inclut**
- Une file par rang, sur toute la largeur.

**N'inclut pas**
- L'arrondi du nombre de files.
- Une file supplémentaire à l'égout et au faîtage, si le système en demande une [M].
- Les liteaux autour des ouvertures.
- Les chutes : un liteau se raboute sur un support, donc la coupe dépend de la longueur vendue et de l'entraxe.

**Hypothèses**
- [G] surface en rampant, versant plan, pureau constant ;
- [M] une file par rang, à sourcer dans la documentation de pose du fabricant de tuiles.

**Ne pas utiliser pour**
- une pose sur voliges ou panneaux sans liteaux ;
- des tuiles posées sur un support qui n'est pas un liteau par rang ;
- les ardoises au crochet (autre règle).

**Exemple D-2026-015**

| Pureau | Formule continue | Par versant (2 × ⌈6 / p⌉ files × 10 m) | Écart |
|---|---|---|---|
| 0,310 m | 387,1 ml | 2 × 20 × 10 = 400 ml | +3,3 % |
| 0,376 m | 319,1 ml | 2 × 16 × 10 = 320 ml | +0,3 % |

**Conditionnement (décision du fondateur)** : on distingue toujours deux choses.
- **« Besoin exact : X ml »** est montré dès que la règle et le pureau sont établis.
- **« Nombre de longueurs à acheter : inconnu »** reste inconnu tant que la longueur vendue n'est pas sourcée. Le fournisseur la précise.

Le moteur sait déjà présenter un besoin exact en ml sans conditionnement. Aucun changement n'est nécessaire pour cela.

**Sources**
- Disponible : documentation HP 10 (tableau ml/m², page à préciser).
- Section 27 × 40 : désignation commerciale (brouillon).
- **Manquant** : la fiche du négoce, pour la longueur vendue.

**Pratique de votre entreprise**
- File de doublage à l'égout ou au faîtage si vous en posez toujours une.
- Chute habituelle.
- Section de liteau habituelle selon l'entraxe des supports.

---

## Fiche 3 — Contre-liteaux (mètres linéaires)

**Statut proposé :** géométrie validable ; l'existence et la disposition des contre-liteaux sont de la **mise en œuvre à sourcer**. C'est la règle la plus exposée à l'arrondi.

**Données d'entrée** : *S* (devis), *e* entraxe des chevrons ou fermettes (devis : D-2026-015 écrit « fermettes d'entraxe 90 cm » ; sinon question).

**Formule (continue)** : *L = S / e*

**Démonstration [G], sous l'hypothèse [M] « un contre-liteau sur chaque chevron, sur tout le rampant »**
1. Sur un versant de largeur *W*, il y a *W / e* intervalles entre supports.
2. Chaque contre-liteau mesure *R*.
3. *L = (W / e) × R = S / e*. ∎

**Attention : erreur d'un piquet, démontrée [G].** *n* supports espacés de *e* sur une largeur *W* sont au nombre de ⌊*W / e*⌋ + 1, pas *W / e*. La formule continue oublie donc environ un contre-liteau (*R* mètres) par versant.

**Inclut**
- Une file par support, sur tout le rampant.

**N'inclut pas**
- Le support supplémentaire d'extrémité (voir ci-dessus).
- Les rives et chevêtres d'ouvertures.
- Les chutes de raboutage.

**Hypothèses**
- [G] entraxe régulier, versant rectangulaire, surface en rampant ;
- [M] écran posé sur les chevrons avec contre-lattage, et un contre-liteau par chevron. À sourcer dans la documentation de l'écran ou des tuiles.

**Ne pas utiliser pour**
- un écran sur support continu (voliges, panneaux) ;
- une couverture sans écran ;
- un entraxe variable ;
- des chevrons dont le nombre est connu autrement : dans ce cas, compter directement nombre × *R*.

**Exemple D-2026-015 (e = 0,90 m)**

| Méthode | Résultat |
|---|---|
| Formule continue | 133,3 ml |
| Par versant : (⌊10 / 0,9⌋ + 1) × 6 m × 2 = 12 × 6 × 2 | 144 ml (+8 %) |

Conditionnement : même principe que la fiche 2 (« besoin exact » montré, longueurs à acheter inconnues).

**Sources**
- Disponible : aucune source fabricant ne décrit la disposition au référentiel.
- Norme : référence probable NF DTU 40.29 pour les écrans souples ; **non consultée, droits non vérifiés**.
- **Manquant** : la notice de pose de l'écran (Soprema) ou des tuiles.

**Pratique de votre entreprise**
- Section de contre-liteau.
- Compter ou non le support d'extrémité.
- Chute habituelle.

---

## Fiche 4 — Surface d'écran sous-toiture (puis rouleaux)

**Statut proposé :** géométrie validable ; le sens de pose est de la **mise en œuvre à sourcer**. Les recouvrements, eux, sont des données fabricant déjà relevées.

**Données d'entrée**

| Donnée | Unité | D'où elle vient |
|---|---|---|
| *S* | m² | devis |
| *l* largeur du rouleau | m | fiche fabricant (SOP'ÉCRAN HPV R2 : 1,50 m) |
| *r* recouvrement entre lés | m | fiche fabricant, selon la pente : 0,20 m si pente ≤ 30 %, 0,10 m au-delà (relevé fondateur ; fiche diffusée par un distributeur, à remplacer par l'adresse Soprema) |
| pente | % | devis, sinon question **seulement si elle change la commande** |

**Formule (continue)** : *A = S × l / (l − r)*

**Démonstration [G], sous l'hypothèse [M] « lés posés parallèlement à l'égout »**
1. Chaque lé a une largeur *l* et recouvre le précédent de *r* : il couvre donc *l − r* de rampant.
2. Il faut *R / (l − r)* lés de longueur *W*.
3. La surface d'écran consommée est *W × l × R / (l − r) = S × l / (l − r)*. ∎

**Inclut**
- Les recouvrements entre lés.

**N'inclut pas**
- Les recouvrements en bout de rouleau (valeur **non saisie au référentiel**, à relever sur la fiche).
- Le débord à l'égout.
- Le traitement au faîtage.
- Les relevés autour des pénétrations.
- Les chutes.
- L'arrondi des lés.

**Hypothèses**
- [G] versant plan, surface en rampant ;
- [M] pose parallèle à l'égout, à sourcer dans la notice de pose ;
- [M] recouvrement propre au produit : un autre écran a ses propres valeurs.

**Ne pas utiliser pour**
- un autre produit que celui dont les recouvrements sont sourcés ;
- une pose parallèle à la pente ;
- une pente hors du domaine d'emploi du fabricant (à vérifier sur la fiche) ;
- un écran sur support continu, si la notice prévoit d'autres recouvrements.

**Exemple D-2026-015 (rouleau de 75 m²)**

| Pente | Formule continue | Rouleaux | Par versant (2 × ⌈6 / (l − r)⌉ lés × 10 m × 1,5 m) |
|---|---|---|---|
| ≤ 30 % (r = 0,20) | 138,5 m² | 2 | 2 × 5 × 15 = 150 m², soit exactement 2 rouleaux |
| > 30 % (r = 0,10) | 128,6 m² | 2 | 150 m², soit exactement 2 rouleaux |

**Ce que montre l'exemple** : par versant, il faut exactement 1 rouleau (5 lés de 10 m = 50 m), **sans aucune marge**. Le moindre recouvrement en bout de rouleau, ou un débord à l'égout, ferait passer à 3 rouleaux. C'est précisément ce que la formule n'inclut pas.

**Sources**
- Disponible : fiche SOP'ÉCRAN HPV R2 (largeur, longueur, recouvrements selon la pente ; adresse Soprema officielle à obtenir).
- Norme : référence probable NF DTU 40.29 ; **non consultée, droits non vérifiés**.
- **Manquant** : la notice de pose (sens de pose, recouvrement en bout de rouleau, débord à l'égout).

**Pratique de votre entreprise**
- Écran habituel : déjà géré comme préférence de l'entreprise, demandé au premier chantier.
- Marge sur les rouleaux.
- Débord à l'égout habituel.

---

## Résumé pour décision

| Règle | Partie démontrée [G] | En attente [M] (à sourcer) | Arrondi par versant (D-2026-015) |
|---|---|---|---|
| Tuiles | *S / (Lu × p)* | chatières et rives qui remplacent des tuiles ; pureau admis pour la pente | +2,1 % à +5,2 % |
| Liteaux | *S / p* | une file par rang ; files d'égout et de faîtage | +0,3 % à +3,3 % |
| Contre-liteaux | *S / e*, plus l'erreur d'un piquet | un contre-liteau par chevron sous écran | +8 % |
| Écran | *S × l / (l − r)* | sens de pose ; recouvrement en bout ; débord | 0 % de marge restante |

**Décisions demandées au fondateur**
1. Accepter ou refuser chaque **démonstration [G]**, séparément des hypothèses [M].
2. Pour chaque hypothèse [M] : fournir la source (page de la notice), **ou** l'enregistrer comme pratique de votre entreprise, **ou** la laisser en attente.
3. Si les dimensions des versants ne sont pas écrites dans le devis : formule continue présentée comme **minimum**, ou question à l'artisan. Ce choix sera tranché sur les nouveaux devis (passage à l'aveugle), pas sur D-2026-015.
