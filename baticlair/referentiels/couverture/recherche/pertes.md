# Pertes de casse et de coupe en couverture

Recherche des 19 et 20 novembre 2026. Les données sont dans `pertes.json` : 17 entrées, 12 verdicts et la table de décision.

## Ce qu'il faut retenir

1. **Aucun fabricant ne publie de pourcentage de perte de chantier.** Ont été cherchés : Cupa, Rathscheck, Cedral/Eternit,
   Edilians, Terreal, Wienerberger/Koramic, BMI/Monier, VMZinc, Rheinzink, Siplast, Soprema et Dörken. Seules les FDES collectives
   de la terre cuite (CTMNC) chiffrent quelque chose : **1 % de tuiles cassées à la pose**. C'est une hypothèse de bilan
   environnemental, qui ne compte pas les coupes.
2. **Aucun chiffre de perte n'a été trouvé dans un DTU** cité par un guide. Les sujets CAP et BP d'eduscol n'ont pas pu être lus
   (erreur 503).
3. **La méthode du métier compte les points singuliers à part, PUIS ajoute la casse.** Deux sources indépendantes le disent :
   - le manuel CAP, chapitre 21, ajoute des plus-values en m² par ml, puis demande « un pourcentage pour casse, remplissage » ;
   - le guide Culture (MOA/MOE Ardoises, 2011) traite les rives, noues et arêtiers comme ouvrages au mètre linéaire et prévoit
     « le supplément pour coupes et pertes ».
   Les plus-values ne remplacent donc pas la perte : elles s'y ajoutent. Le skill dit au contraire « coupes dans la perte » :
   la recherche contredit cette règle pour l'ardoise (à signaler au fondateur).
4. **Le seul chiffre de formation est 5 %** (Nomad Education, CAP couvreur) : « marge de 5 % pour la casse et les coupes ».
   Il s'applique aux tuiles et aux ardoises. Correction de `bois.json` : cette page n'applique PAS 1,05 aux liteaux.
5. Les autres chiffres (7 %, 10 %, 10-15 %) ne viennent que de calculateurs grand public : une agence web, des sites de devis,
   un blog belge. Ils sont notés pour mémoire et ne comptent pas comme sources.

## Plus-values du manuel CAP, ardoise au crochet (une source)

Ces m² s'ajoutent à la surface de couverture, par ml d'ouvrage :

| Ouvrage | m² par ml |
| --- | --- |
| Égout droit / biais | pureau × L / 2 pureaux × L |
| Rive, tranchis droit / biais / circulaire | 0,16 / 0,25 / 0,33 |
| Arêtier (2 rives), rang de doublage ou ardoises biaises | 0,66 |
| Noue à fendis et renvers | 1,50 |
| Déversée à 1 tranchis / à 2 tranchis | 0,33 / 0,50 |
| Tourelle | circonférence × hauteur |

Ces valeurs sont identiques à celles de `referentiel-couverture.md` §25.1. Dans l'exemple du manuel, les rives d'un pan de 39 m²
ajoutent déjà +8 % de surface, avant la casse. Rien n'a été trouvé pour les lucarnes, chiens-assis, fenêtres de toit et
pénétrations.

## Verdicts sur l'existant

| Existant | Verdict | Bonne valeur |
| --- | --- | --- |
| Code : ardoise 5 % | à confirmer | 5 % sur toit simple, à garder. Une source de formation. La fiche wallonne tolère jusqu'à 5 % de rebut à la livraison, ce qui est cohérent. |
| Fondateur : 5 % simple / 10 % compliqué ; §2 : 8 à 10 % | à confirmer | 10 % n'a que des sources grand public. Méthode mieux sourcée : plus-values CAP puis 5 %. |
| Skill : rives, noues, arêtiers dans la perte | **corrigé** (ardoise) | Plus-values au ml, puis la perte en %. |
| Code : crochets 0 % (1 par ardoise commandée) | à confirmer | Le principe d'1 crochet par ardoise est confirmé (CAP, Nomad). Le surplus diverge : 0 % (CAP) contre 10 % (Nomad). Le code donne déjà +5 % sur le besoin. |
| Code : fibres-ciment 5 % | à confirmer | Aucune source propre au fibres-ciment. |
| Code : tuile mécanique 3 % | à confirmer | 3 % n'est écrit nulle part. Les sources donnent entre 1 % (casse seule, FDES) et 5 % (CAP). La règle du fondateur reste : on demande à l'artisan et on propose 5 %. |
| Code : tuile canal 0 % | **corrigé** | Une perte non nulle : au moins 1 % de casse selon la FDES ; valeur à fixer. |
| Code : liteaux 5 % | à confirmer | Aucune source écrite. La vraie chute est celle de l'aboutage (longueur vendue ÷ multiple de l'entraxe) : 0 % en 4,20 m et 10 % en 4,00 m sur chevrons à 60 cm. |
| Code : volige 5 % | à confirmer | Le guide Culture prévoit un supplément sans le chiffrer ; seul un blog dit 5 à 10 %. |
| Code : bande zinc 5 % | à confirmer | Méthode : ml + recouvrements, arrondi aux longueurs de 2 m. Les 5 % reviennent à 10 cm de recouvrement par bande, valeur non sourcée. |
| Code : écran × 1,10 / × 1,20, sans perte en plus | **confirmé** | Consommation Siplast, recoupée par le calcul sur les recouvrements Edilians. Les 10 à 15 % du §2 feraient double compte. |
| Fondateur : « + 5 % » sur closoir, rives, noues | à confirmer | Aucune source ne le chiffre ni ne le contredit. Les pièces au ml s'arrondissent à la pièce. |

## Table de décision recommandée

| Matériau | Toit simple | Toit compliqué / points singuliers | Statut |
| --- | --- | --- | --- |
| Ardoise naturelle | 5 % | Plus-values CAP au ml, puis 5 % ; à défaut, 10 % demandé à l'artisan | 5 % : une source ; méthode : confirmée ; 10 % : à confirmer |
| Crochets d'ardoise | 1 par ardoise commandée | idem | principe confirmé ; surplus à confirmer |
| Ardoise fibres-ciment | 5 % | comme l'ardoise naturelle | à confirmer |
| Tuiles à emboîtement GM, PM, romanes, béton | On demande ; proposer 5 % | On demande ; 7 à 10 % | à confirmer ; la casse seule (1 %) est confirmée |
| Tuiles plates | On demande ; proposer 5 % | comme l'ardoise | à confirmer |
| Tuiles canal | On demande, jamais 0 % ; proposer 5 % | On demande | 0 % corrigé ; valeur à confirmer |
| Faîtières, arêtiers, tuiles de rive | ml × pièces/ml, arrondi à la pièce | idem | à confirmer |
| Liteaux, contre-liteaux | Chute d'aboutage calculée ; 5 % par défaut | + coupes biaises (on demande) | une source (calcul) |
| Voliges | 5 % | On demande (5 à 10 %) | à confirmer |
| Zinc en bandes | ml + recouvrements, arrondi aux 2 m | idem, par ouvrage | à confirmer (recouvrement) |
| Gouttières zinc | ml + 30 mm par jonction, arrondi aux 4 m | idem | confirmé |
| Écran sous toiture | × 1,10 (pente > 30 %) / × 1,20 (≤ 30 %), rien en plus | idem | confirmé |
| Lucarnes, chiens-assis, fenêtres de toit, pénétrations | — | On demande à l'artisan (règle du fondateur) | aucune source |

## Vraiment confirmé par deux sources indépendantes

- Les points singuliers se comptent à part de la surface courante, puis la casse s'ajoute : manuel CAP et guide Culture.
- Un crochet par ardoise : manuel CAP et Nomad Education.
- La tuile canal a une perte non nulle : FDES CTMNC et CAP.
- La consommation d'écran de 1,10 à 1,20 m²/m² : Siplast et le calcul sur les recouvrements d'une autre marque.
- La méthode des gouttières, à partir des longueurs et recouvrements confirmés dans `zinguerie.json`.
- 1 % de casse à la pose de la tuile terre cuite : un seul producteur (CTMNC), mais trois éditions concordantes de 2014 à 2022.

Aucun **pourcentage** de casse et de coupe n'est confirmé par deux sources sérieuses, à part le 1 % de casse seule.

## Reste à chercher

- Les sujets et corrigés CAP/BP couvreur sur eduscol (bnseep), à relire quand le site répondra.
- Les guides Culture « Tuiles plates » et « Tuiles » : même série, mode de métré probablement identique.
- Le recouvrement des bandes zinc (DTU 40.41 via un guide).
- Les FDES INIES originales des ardoises (Cupa), des tuiles béton (BMI) et des écrans : chercher le taux de chute du module A5.
- Batiprix : sous-détails de couverture, base payante non consultée.
