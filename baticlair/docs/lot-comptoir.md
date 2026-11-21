# Lot comptoir : le PDF lu par le vendeur de Point.P

4 octobre 2026. Règle appliquée : §47.8 du référentiel, « la règle du comptoir ».
- Le vendeur doit pouvoir chiffrer chaque ligne sans rappeler l'artisan.
- S'il ne le peut pas, il manque une information. Elle devient une question courte, posée avant l'envoi.
- S'il le peut, aucune question.
- Ce que le comptoir ne demande jamais (zone, entraxe, pureau, pertes) reste une hypothèse dite et modifiable.

Test permanent : `packages/domain/test/regle-du-comptoir.test.ts`.

## 1. Le PDF du chantier Test, lu par le vendeur

### Avant ce lot

| Ligne du PDF | Ce que dit le vendeur |
| --- | --- |
| Zinc naturel en bobine 500 mm · 222 ml | « Naturel ? Votre devis dit prépatiné quartz. Et en quelle épaisseur ? » Il rappelle. |
| Pattes coulissantes / fixes joint debout | Chiffrable (pattes VMZINC pour bobine 500). |
| Faîtage zinc (bande) · 5 longueurs de 3 m | « Un faîtage sur un monopente ? Quel développé, quel zinc ? » Il rappelle. |
| Voliges sapin 18 mm · 96 m² | « Traitées ? En 18 × 150 ou 18 × 200 ? » Le devis le disait, la ligne l'avait perdu. |
| Bobineau 500 × 17 m, 0,65 | « Naturel ou quartz ? » Il rappelle. |
| Gouttière zinc demi-ronde · 4 longueurs de 4 m | « De 25 ou de 33 ? » Il rappelle. |
| Crochets de gouttière · 33 pièces | « À queue sur chevron, ou bandeau ? Pour du 25 ou du 33 ? » Il rappelle. |
| Naissances · 2 pièces | « Pour quelle gouttière, sortie 80 ou 100 ? » Il rappelle. |
| Pointes annelées 2,5 × 28 mm | Chiffrable. |

Bilan avant : 6 lignes sur 10 obligent le vendeur à rappeler.

### Après ce lot

```
2. Fournitures à chiffrer
Bobine Quartz-Zinc 0,65 mm, largeur 500 mm   222 ml               31 bacs × 7,15 m
Pattes coulissantes joint debout             519 pièces           pour bobine 500 mm
Pattes fixes joint debout                    173 pièces           pour bobine 500 mm, zone fixe de chaque bac
Voliges sapin 18×200 mm traité               96 m²
Bobineau Quartz-Zinc 500 × 17 m, 0,65        1 pièce              pour façonner 13 ml de bande
Gouttière zinc demi-ronde dév. 33            4 longueurs de 4 m (13 ml à couvrir)
Crochets de gouttière bandeau dév. 33        33 pièces
Naissances zinc demi-ronde dév. 33 Ø80       2 pièces
Consommables
Pointes annelées 2,5 × 28 mm                 1 384 pièces         2 par patte, sur volige 18 mm
```

Le vendeur chiffre chaque ligne telle quelle. Le faîtage a quitté la liste : il est proposé dans « On ajoute ? », et Greg l'ajoute d'un tap s'il le veut. Il ne reste aucun rappel, à trois réserves près (§5) : conditionnement des pointes, galva ou inox des pattes, talons de gouttière.

## 2. Les questions, avant et après

| Chantier | Avant | Après |
| --- | --- | --- |
| **Test** (joint debout 91 m², gouttière 13 ml) | 4 questions : façonnage · **égout et faîtage, on les ajoute ?** · développé de la bande · nombre de descentes | 6 questions : façonnage · développé de la bande · **gouttière de 25, 28, 33 ou 40 ?** · **crochets sur les chevrons ou en façade (bandeau) ?** · **descentes en Ø 80 ou en Ø 100 ?** · nombre de descentes |
| **Brest** (ardoises 30×22 200 m², gouttière dév. 33 24 ml) | 1 question : nombre de descentes | 4 questions : **quelle ardoise, Espagne 1er choix ou NF (type Cupa) ?** · **crochets sur les chevrons ou en façade ?** · **descentes en Ø 80 ou en Ø 100 ?** · nombre de descentes |

Notes :
- Le développé de la gouttière de Brest est lu au devis (« développé 33 ») : pas de question.
- La qualité d'ardoise est une habitude d'entreprise : demandée aux premiers chantiers, puis retenue, comme le façonnage.
- Un devis qui écrit tout ne pose rien. Exemple : « ardoises d'Espagne 1er choix », « gouttière dév. 33, crochets bandeau, 2 descentes Ø80 ». C'est vérifié par un test.

Le test du §46.5 (« Brest sans note : deux lignes orange ») est à mettre à jour de ta main : Brest a désormais 4 lignes orange.

### Supprimée, parce que le comptoir ne la pose pas

- « Bandes d'égout et de faîtage du zinc : on les ajoute à la liste ? »
  - Ce n'est pas une question de chiffrage. Les deux bandes passent dans « On ajoute ? » (§45.8), avec le zinc du chantier.
  - Une bande déjà citée au devis n'est pas reproposée.

### Restées hypothèses, jamais demandées

Zone climatique, entraxe des chevrons, pureau, pente, rampant (ardoise), épaisseur du zinc, diamètre du crochet d'ardoise, coudes par descente. Chacune est dite et modifiable d'un tap. Le test vérifie qu'elles ont toutes une hypothèse.

### Ajoutées (le vendeur ne peut pas chiffrer sans)

| Question | Ligne concernée | Lue au devis quand il écrit… |
| --- | --- | --- |
| Gouttière de 25, de 28, de 33 ou de 40 ? | gouttière, crochets, naissances | « dév. 33 », « développé 33 », « gouttière de 25 », « demi-ronde 33 » |
| Crochets de gouttière : sur les chevrons ou en façade (bandeau) ? | crochets | « bandeau », « planche de rive », « sur chevrons » |
| Descentes en Ø 80 ou en Ø 100 ? | naissances, tubes, coudes, colliers | « Ø80 », « descente de 100 » |
| Quelle ardoise : Espagne 1er choix ou NF (type Cupa) ? | ardoises | « Espagne », « 1er choix », « Cupa », « NF » |
| Zinc prépatiné : Quartz-Zinc (gris) ou Anthra-Zinc (noir) ? | bobine, bacs, bandes, feuilles, bobineau | seulement si le devis dit « prépatiné » sans la teinte ; sans rien, zinc naturel (hypothèse) |

Toutes les questions d'un devis arrivent d'un coup, y compris celles cachées derrière deux réponses : le Ø des descentes apparaît dès l'ouverture, avec leur nombre.

## 3. Ce que la ligne dit désormais au comptoir

- **Zinc :** l'aspect lu au devis (Quartz-Zinc, Anthra-Zinc, zinc naturel) et l'épaisseur, comme le vendeur les écrit. Exemples : « Bobine Quartz-Zinc 0,65 mm, largeur 500 mm », « Bobineau Quartz-Zinc 500 × 17 m, 0,65 », « Bandes façonnées Quartz-Zinc 0,65 mm ».
  - L'aspect d'une couverture vaut pour ses bandes. L'aspect d'une bande ne fait pas celui de la couverture.
- **Gouttière et descente :** le développé, la matière et la forme du devis, le Ø. Exemples : « Gouttière zinc demi-ronde dév. 33 », « Crochets de gouttière bandeau dév. 33 », « Naissances zinc demi-ronde dév. 33 Ø80 », « Tubes de descente PVC sable Ø80 », « Coudes de descente PVC sable Ø80 », « Colliers de descente Ø80 ».
- **Ardoise :** « Ardoises naturelles Espagne 1er choix 30×22 ».
  - Les crochets donnent leur longueur, recouvrement + 1 cm (Cupa, §34) : « Crochets d'ardoise inox standard, longueur 11 cm ». À Brest : « inox Ø 2,7, longueur 11 cm ».
- **Bois :** la section et le traitement du devis restent sur la ligne : « Voliges sapin 18×200 mm traité ».
- **Écran :** le format du rouleau, « Écran HPV, rouleau 1,50 × 50 m ».

### Conditionnements confirmés dans les catalogues

| Article | Ce que disent les catalogues |
| --- | --- |
| Gouttière zinc demi-ronde | dév. 25 et 33, longueurs 2 et 4 m (Point.P : dév. 33 = section 113 cm²) |
| Naissance zinc dév. 33 | en Ø 80 et en Ø 100, à souder ou agrafable |
| Crochet de gouttière | « crochet embouti bandeau de 33, acier galvanisé » |
| Pattes VMZINC monovis | boîtes de 100 |
| Crochets d'ardoise inox Frenehard 2,7 | boîtes de 500 ou 700 selon la longueur (diamètres 2,4 / 2,7 / 3 ; longueurs de 7 à 16 cm) |
| Écran HPV | rouleau 1,50 × 50 m = 75 m² |
| Quartz-Zinc 0,65 | 500 mm × 31 m ≈ 73 kg ; 650 mm × 31 m ≈ 95 kg |
| Tube PE d'arrosage | couronnes de 25, 50 et 100 m |

## 4. Ouvrages de la couverture : ce que le vendeur demande

| Ouvrage | Le vendeur chiffre-t-il ? | Ce qui manquait | Désormais |
| --- | --- | --- | --- |
| Tuiles à emboîtement | oui si le modèle est lu, sinon question de modèle (déjà en place) | — | inchangé |
| Tuiles canal | oui avec modèle et recouvrement | le recouvrement est demandé alors que le comptoir ne le demande pas | **à trancher** : pas de défaut sourcé (DTU 40.22 non lu) ; la question reste en attendant ton chiffre |
| Ardoises au crochet | non sans la qualité | qualité, longueur du crochet | question de qualité (habitude), crochet R + 1 cm |
| Faîtage tuiles | oui (faîtières par défaut « modèle à préciser ») | — | inchangé |
| Faîtage zinc | non sans le développé ni le zinc | développé, aspect, épaisseur | question de développé ; aspect et épaisseur sur la ligne |
| Bandes zinc | non sans le zinc | aspect, épaisseur | sur la ligne |
| Abergement de cheminée | non sans le zinc | aspect, épaisseur | sur la ligne |
| Sortie de toit | oui après Ø et usage (déjà demandés) | — | inchangé |
| Joint debout | non sans l'aspect ni l'épaisseur | aspect (le PDF disait « naturel » pour un devis quartz), épaisseur | lus au devis ; égout et faîtage dans « On ajoute ? » |
| Gouttière | non sans le développé ni la pose des crochets | développé, pose, Ø de la naissance | 3 questions, lues au devis quand il les écrit |
| Descente | non sans le Ø | Ø | question, lue au devis (« Ø80 ») |
| Voligeage | oui | traitement et section perdus | gardés |

## 5. Ce qui reste (prochain lot)

- **Conditionnements à la boîte :** pointes annelées (1 384 pièces), crochets d'ardoise (500 ou 700 par boîte selon la longueur). Les pages négoce ne s'ouvrent pas depuis l'environnement de travail : à relever en magasin ou sur un catalogue PDF.
- **Pattes de joint debout :** inox ou galva, et colisage des pattes classiques. Les monovis sont en boîtes de 100.
- **Talons et jonctions de gouttière :** le §11 du référentiel les prévoit (« 1 talon par extrémité, 1 jonction par longueur »). Ils ne sont pas encore calculés ; le vendeur les ajoutera ou demandera.
- **Monopente :** le « faîtage » proposé est en fait une bande de tête (rive haute). Le nom reste à adapter.
- **Liteaux :** « bottes de 50 ml » (référentiel du fondateur). Les négoces vendent à la longueur (2,40 / 3 / 4 m) : à confirmer.
- **Tuiles canal :** recouvrement, voir §4.

## 6. Les tiroirs des autres métiers

Chaque `referentiels/<métier>/tiroir.json` porte désormais un bloc `questions_comptoir`, sous la même règle :
- les questions du vendeur, avec ses mots (marque et gamme, format, teinte, diamètre, modèle) ;
- ce qu'il ne demande jamais (consommation au m², pertes, entraxes).

Ce sont des listes de travail, non activées pour un utilisateur, à faire relire par un vendeur de chaque négoce : Point.P, Cedeo, Rexel, Chausson.
