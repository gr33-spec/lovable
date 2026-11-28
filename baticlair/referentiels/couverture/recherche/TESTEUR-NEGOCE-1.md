# Testeur-négoce, passage 1 (19 novembre 2026, fiche `couverture-2026.11.19-1`)

Un vendeur de comptoir breton (rôle tenu par un agent) a essayé de « commander » un échantillon d'articles de
chaque famille avec la seule fiche couverture. Lecture seule.

## Résultat par article

| Famille | Article | Commandable ? | Ce qui bloque |
|---|---|---|---|
| ardoise | naturelle 32×22, 120 m² | oui avec question | pas de carrière ni de marque en modèle ; palette « 2 200 à demander » seulement en texte ; aucun chiffre « situation exposée » (toute la côte bretonne) |
| ardoise | crochets inox 9 / 10 / 11 cm | oui avec question | boîte 500 (agrafe) / 700 (pointe) confirmées ; nuance d'inox selon la mer à une source |
| ardoise | clous 2,7×30 | oui | au kg, 653 au kg ; clous par ml de rive non chiffrés |
| ardoise | fibres-ciment Cedral 40×24 / 33×23 | oui avec question | pas de teinte ; seulement Cedral en modèle |
| tuile_emboitement | HP 10 Huguenot + rives G/D | oui avec question | 240 / palette, rives 2,7/ml, faîtières 710/716/717 ; pureau du chantier inconnu (5 ou 6 palettes pour 120 m²) |
| tuile_emboitement | PV 10 Huguenot | oui avec question | rive renvoyée au « PV 13 » ; chiffres identiques à la HP 10 |
| tuile_emboitement | abouts, chatières HP/PV 10 | **non** | aucune référence ; section de chatière inconnue |
| tuile_plate | 17×27 | oui avec question | pas de coloris ; pas de rubrique comptoir propre |
| tuile_canal | Canal 50 Poudenx 414 + 454 | oui avec question | pas de coloris ; pas de rubrique comptoir propre (hors Bretagne de toute façon) |
| tuile_beton | Monier Double Romane | oui avec question | pas de teinte ; rives et faîtières béton sans nombre au ml |
| points_singuliers | faîtage terre cuite scellé | oui avec question | mortier 5 à 10 kg/ml (du simple au double) |
| points_singuliers | faîtage à sec + closoir | oui avec question | largeur de closoir non reliée à la classe de galbe |
| points_singuliers | faîtière Armor sur ardoise | **non** | longueur et nombre au ml à confirmer, pas de coloris |
| points_singuliers | lignolet | **non** | formule à confirmer, unité fausse |
| points_singuliers | noue zinc | oui | VMZinc 400 / 500, 0,65 mm |
| zinguerie | demi-ronde 25 / 33, 14 ml | oui avec question | crochets en carton de 100 / 50 ; 0,4 m en bord de mer à confirmer |
| zinguerie | nantaise 33 + crochets | oui avec question | écartement des crochets d'une rampante absent ; talons façonnés (une source) |
| zinguerie | naissance Ø80, talons, angles | oui avec question | types seulement, pas d'angle des équerres (90° / 135°) |
| zinguerie | descente zinc Ø80, 3 × 6 m | oui | 9 tuyaux de 2 m, 6 coudes, colliers, dauphin 1 m |
| zinguerie | descente PVC Ø100 | oui avec question | tubes de 4 m, botte de 10 ; teintes absentes |
| zinguerie | feuille zinc 0,65 naturel | oui | 2 × 1 m, 9,36 kg ; palette de 54 à une source |
| ecran | HPV | oui avec question | aucun produit du marché nommé |
| etancheite | bicouche SBS | oui avec question | pas de teinte de paillettes ; comptoir rangé sous « ecran » |
| bois_couverture | liteaux 27×40 / 18×38, contre-liteaux | oui | 18×38 sans ses longueurs ; contre-liteau 4 m « non vérifié » |
| bois_couverture | volige 18 mm, chevrons 63×75 | oui | — |

## Les blocages les plus graves

1. Zinguerie : aucune marque ni modèle (références VMZinc / Rheinzink par développé : crochets, naissances,
   talons G/D, équerres 90° / 135°).
2. Ardoise : pas de chiffres en situation exposée (côte des 22, 29, 56).
3. Ardoise : pas de nombre par palette par format et épaisseur, pas de carrière en modèle.
4. Faîtage breton : faîtière Armor (nombre au ml, coloris) et lignolet (formule).
5. HP 10 / PV 10 : chatière (référence, section), abouts, demi-tuiles.
6. Crochets de gouttière nantaise / havraise : écartement.
7. Coloris absents sur la plupart des modèles.
8. Closoir : largeur selon la classe de galbe.
9. Écran HPV et membranes : aucun produit du marché nommé.
10. Mortier de faîtage : valeur par type de faîtière.

## Incohérences relevées (à corriger dans la recherche)

- HP 10 `tuiles_par_palette` : la condition cite « Terreal » (tuile Edilians).
- PV 10 : rive décrite comme « PV 13 » ; tous ses chiffres identiques à la HP 10 (copie possible).
- 32×22 : deux nombres au m² pour le même cas (R + 3 contre « règle fondateur »).
- Ardoise naturelle 40×24 rangée comme modèle alors qu'elle est « absente des tables fabricants ».
- Écran : « 25 rouleaux par palette, confirmé » avec une condition « 12 à 39 ».
- Nantaise : relevé et développés « confirmés » avec VMZinc seul.
- Développé 33 codé 330 et 333.
- Longueur bois 3,70 m (inexistante) encore présente.
- Lignolet : unité « u/ml » contre une formule qui donne un total.
- Rubriques comptoir mal rangées (canal et plate sous tuile_beton, étanchéité sous ecran).
- Valeurs vides (crochets par boîte de 5 kg, mode de pose, pose au contact de l'isolant).
- Noms d'attributs différents d'une famille à l'autre (« tuiles au m² » / « tuiles_par_m2_min »).
