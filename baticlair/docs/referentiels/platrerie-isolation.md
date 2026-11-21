# Référentiel quantitatif plâtrerie-isolation (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

La plâtrerie-isolation est un métier quasi national : les produits (plaque 1,20 m de large, rails 48/70, vis TTPC) sont les mêmes partout ; ce qui fait varier le quantitatif, c'est le neuf ou la rénovation, la hauteur sous plafond et le niveau d'isolation visé, pas la région.

Périmètre : cloisons de distribution en plaques de plâtre, doublages des murs (collés ou sur ossature), plafonds (sous rampants, sous solives, suspendus), isolation associée (laine en rouleaux ou panneaux, soufflage de combles), pare-vapeur, traitement des joints. Hors périmètre : carreaux de plâtre (DTU 25.31, tiroir optionnel en section 13), staff, plafonds en dalles 600×600 (DTU 58.1), enduit plâtre projeté, isolation par l'extérieur (métier « façade »).

```json
{
  "code": "platrerie-isolation",
  "nom": "Plâtrerie - isolation intérieure",
  "version": "0.1.0",
  "normes": ["NF DTU 25.41", "NF DTU 25.42", "NF DTU 45.10", "NF DTU 45.11", "NF DTU 25.31"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "moyen",
    "type_batiment": "moyen",
    "neuf_renovation": "fort",
    "gamme": "moyen"
  },
  "metiers_lies": ["peinture", "electricite", "menuiserie-interieure", "couverture"],
  "unites_de_commande": ["u", "palette", "botte", "boite", "sac", "seau", "rouleau", "colis", "cartouche"],
  "maturite": "alpha"
}
```

| Axe | Poids | Ce qui change dans le quantitatif | Comment le moteur le résout |
| --- | --- | --- | --- |
| neuf\_renovation | fort | Neuf : murs droits, hauteur 2,50 m, cloison 72/48 standard. Réno : doublage collé ou sur fourrures selon l'état du mur, hauteurs 2,60 à 3,00 m, chutes plus fortes (+3 à +5 points de perte) | Profil artisan ou mot du devis (« dépose », « rénovation », « existant ») ; sinon question 1 |
| epoque\_bati | moyen | Avant 1948 : hauteurs 2,80-3,20 m, murs non plans → ossature (jamais collé), plaques de 2,80 / 3,00 m. 1950-1990 : 2,50 m, collage possible. Après 2000 : 2,50 m | Déduite de la hauteur (question 2) ; pas de question dédiée |
| type\_batiment | moyen | Maison : BA13 standard + hydro en pièces humides. Collectif / ERP : plaques feu, acoustiques, cloisons 98/48 ou 140/90, laine obligatoire | Mot du devis (« EI 60 », « PV feu », « logement collectif ») ; sinon défaut maison |
| gamme | moyen | Standard vs phonique (Placo Phonique, Knauf Acoustic), haute dureté, laine de verre vs roche vs biosourcée : change la référence, pas les quantités | Lu dans le devis ; sinon défaut BA13 standard + laine de verre |
| geographie | faible | Zone climatique H1/H2/H3 et altitude : épaisseur d'isolant visée si le devis n'indique ni R ni épaisseur. Brique plâtrière ou carreau de plâtre en cloison dans certaines régions (Sud-Ouest, Rhône-Alpes, Est) | Département de l'adresse chantier ; aucune question |

Règle de lecture : le devis donne presque toujours le système (« cloison 72/48 », « doublage 10+80 », « laine 200 mm R 5 ») ; les axes ne servent qu'à combler ce qu'il ne dit pas.

## 2. Règle d'or et unités de commande

Règle d'or : le m² du devis n'est jamais une unité de commande. Il est converti en pièces réelles (plaques d'une longueur donnée, barres de 3 m, rouleaux, sacs, boîtes), puis arrondi à l'unité de vente supérieure du négoce, après pertes.

Ordre de calcul, identique pour tous les ouvrages : métré du devis → quantité technique (ratio ou calepinage) → + pertes (section 5) → conversion en unité de vente → arrondi supérieur → regroupement des lignes identiques sur tout le chantier (une seule ligne « vis TTPC 25 » même si 4 ouvrages en consomment) → arrondi final.

| Article | Unité de calcul | Unité de commande | Contenu de l'unité | Règle d'arrondi |
| --- | --- | --- | --- | --- |
| Plaque de plâtre BA13 / BA15 / BA18 | m² puis nombre de plaques | plaque (u) | 1,20 m × longueur choisie (2,40 à 3,60 m) | plaque entière ; proposer la pile si ≥ 45 plaques |
| Complexe de doublage collé (Doublissimo, Placomur, Labelrock) | m² puis panneaux | panneau (u) | 1,20 m × 2,50 / 2,60 / 2,70 / 3,00 m | panneau entier |
| Rail R48 / R70 / R90, rail F530 | ml | barre de 3,00 m (u) | 3 ml | barre entière ; botte de 10 indiquée en info |
| Montant M48 / M70 / M90 | ml puis nombre de montants | barre (u), longueur ≥ hauteur − 1 cm | 2,50 à 3,99 m | barre entière ; botte de 10 |
| Fourrure F530 | ml puis nombre de barres | barre (u) | 3,00 m (5,30 m existe) | barre entière ; botte de 10 |
| Suspente F530, appui intermédiaire | u | boîte | 100 (suspente longue 171), 50 (sécable, appuis Optima, Intégra) | boîte entière |
| Vis TTPC 25 / 35 / 45, TRPF 13 | u | boîte | 1 000 (TTPC 25, 35) ; 500 ou 1 000 (TTPC 45, TRPF) à vérifier par négoce | boîte entière |
| Bande à joint papier | ml | rouleau | 150 m (grand rouleau) ; 23 m (petit) | rouleau entier |
| Enduit à joint poudre | kg | sac | 25 kg (5 kg existe) | sac entier |
| Enduit à joint prêt à l'emploi | kg | seau | 25 kg à vérifier (Placomix, seaux 20 et 25 kg selon gamme) | seau entier |
| Mortier adhésif MAP | kg | sac | 25 kg (10 kg existe) | sac entier |
| Laine minérale en rouleau ou panneau | m² | colis / rouleau | m² par colis de la fiche (ex. GR 32 100 mm : 3,24 m²) | colis entier |
| Laine à souffler | kg | sac | 17,3 kg (Comblissimo) | sac entier |
| Membrane pare-vapeur | m² | rouleau | 60 m² (1,50 × 40 m) | rouleau entier |
| Adhésif de membrane | ml | rouleau | 40 m (Vario KB1) | rouleau entier |
| Mastic d'étanchéité à l'air | ml de cordon | cartouche | 310 ml | cartouche entière |
| Cornière d'angle, bande armée | ml | barre 3 m / rouleau 30 m | — | entier |

Interdits dans la sortie : « m² de placo », « ml d'ossature », « kg d'enduit » sans conditionnement. Une ligne de sortie = article + format + quantité entière + unité de commande, avec le m² ou le ml rappelé en petit pour contrôle.

## 3. Ouvrages du métier, vocabulaire des devis, pièges

Dix ouvrages couvrent l'essentiel des devis de plâtrerie-isolation en maison individuelle ; chacun a un code stable que `ouvrages.json` et `regles.json` partagent.

| Code | Ouvrage | Unité du devis | Système type | Matériaux générés |
| --- | --- | --- | --- | --- |
| CLO | Cloison de distribution sur ossature | m² (une face, hauteur × longueur) | 72/48 : 1 BA13 par face, M48 entraxe 0,60, laine 45 mm | plaques ×2 faces, rails, montants, vis, bande, enduit, laine |
| CLO-ALV | Cloison alvéolaire (Placopan, Pregymétal alvéolaire) | m² | panneau 50 mm sans ossature | panneaux, semelles bois, enduit, bande (tiroir à compléter, section 13) |
| DBL-COL | Doublage collé (complexe plaque + isolant) | m² | Doublissimo / Placomur 10+80, 13+100… collé au MAP | complexes, MAP, bande, enduit |
| DBL-MON | Contre-cloison sur montants (autoportante) | m² | M48 entraxe 0,60 + laine GR 32 | plaques ×1, rails, montants, vis, bande, enduit, laine |
| DBL-APP | Doublage sur fourrures et appuis (Optima, Placo appui rénovation) | m² | F530 entraxe 0,60 + appuis tous les 1,30 m de haut | plaques, rails F530, fourrures, appuis, vis, bande, enduit, laine |
| PLF-SUS | Plafond suspendu sous solives ou sous dalle | m² | F530 entraxe 0,60, suspentes tous les 1,20 m | plaques, fourrures, suspentes, cornière ou rail périphérique, vis, bande, enduit |
| PLF-RAM | Plafond sous rampants (comble aménagé) | m² (en pente) | F530 + suspentes isolation (Intégra) + laine 2 couches + membrane | plaques, fourrures, suspentes, laine, membrane, adhésif, mastic, vis, bande, enduit |
| ISO-SOU | Isolation de combles perdus par soufflage | m² au sol | laine de verre en vrac, R visé | sacs, piges, contour de trappe, déflecteurs |
| ISO-ROU | Isolation de combles perdus déroulée | m² au sol | 2 couches croisées de rouleaux | colis de laine, membrane éventuelle |
| COF | Coffrage, soffite, habillage de gaine | ml (parfois u ou forfait) | F530 ou M48 + BA13, développé 0,60 m par défaut | plaques, ossature, vis, cornières, bande, enduit |

**Vocabulaire des devis → ouvrage** (pour `vocabulaire.json`) :

| Ce que dit le devis | Ce que le moteur comprend |
| --- | --- |
| placo, plaque, BA13, plâtre cartonné | plaque de plâtre 12,5 mm standard |
| cloison 72/48, cloison placo, distribution | CLO, 1 plaque par face, M48 |
| cloison 98/48, double peau, 2 BA13 par face | CLO, 2 plaques par face |
| cloison 100/70, 120/70 | CLO, montant M70 |
| cloison alvéolaire, Placopan, carreau alvéolaire | CLO-ALV |
| doublage 10+80, 13+100, complexe, PSE, polystyrène, Doublissimo, Placomur, Labelrock | DBL-COL ; « 10+80 » = plaque 10 mm + isolant 80 mm |
| contre-cloison, doublage sur ossature, doublage M48, doublage autoportant | DBL-MON |
| doublage Optima, sur appuis, fourrures, F530 en mur | DBL-APP |
| faux plafond, plafond suspendu, plafond F530, plafond placo | PLF-SUS (PLF-RAM si « rampant », « sous toiture », « comble aménagé ») |
| laine soufflée, soufflage, laine en vrac, ouate soufflée | ISO-SOU |
| laine déroulée, rouleaux en combles, IBR | ISO-ROU |
| coffrage, caisson, soffite, habillage poutre, gaine technique | COF |
| hydro, plaque verte, H1, Placomarine | variante plaque hydrofugée (pièces humides) |
| plaque feu, rose, EI 30, PV feu | variante plaque feu |
| phonique, Placo Phonique, acoustique | variante plaque acoustique |
| haute dureté, Habito, Placodur | variante plaque haute dureté |
| bandes et enduit, jointement, finition Q2 / Q3 | déjà inclus dans chaque ouvrage ; ne pas recompter |
| GR 32, laine 45, laine 100, R 3,15 | isolant de mur ou de cloison |
| R = 7, R 7, 300 mm, 320 mm (combles) | isolant de combles perdus |

**Pièges des devis** (chacun devient un test, section 10) :

1. **Cloison = deux faces.** 20 m² de cloison 72/48 = 42 m² de plaques, pas 21.
2. **« 10+80 » n'est pas « plaque + laine 80 ».** C'est un complexe collé d'un seul bloc ; aucune ossature, aucune laine séparée.
3. **La hauteur décide de la plaque, pas le m².** Une pièce de 2,55 m demande des plaques de 2,60 m ; commander des 2,50 laisse un vide en tête. Même règle pour les montants (hauteur − 1 cm).
4. **Ligne « bandes et enduit » séparée.** Elle ne s'ajoute pas : les quantités Placo sont données « jointoyé avec bande ». Si l'artisan ne fait pas les joints (sous-traité, peintre), on retire bande et enduit.
5. **Isolant absent du devis = pas d'isolant.** Ne jamais en ajouter un ; les seules exceptions sont signalées en hypothèse (laine 45 dans une cloison 72/48 si le devis dit « isolée » ou « phonique » sans épaisseur).
6. **Pose seule.** « Pose de plaques fournies par le client » ou « main-d'œuvre seule » : aucune ligne matériau, sauf les consommables si le devis les cite.
7. **Surface rampant vs surface au sol.** Un plafond sous rampant est métré en pente ; un comble perdu est métré au sol. Ne jamais appliquer un coefficient de pente à un chiffre déjà en pente.
8. **Ouvertures.** Le devis vend une surface, déduite ou non des portes et fenêtres ; le moteur ne déduit rien de lui-même et ajoute les chevêtres (section 9) par ouverture citée.
9. **Coffrage en ml ou en forfait.** Sans développé dans le devis, on applique 0,60 m de développé (2 faces de 0,30 m) en hypothèse affichée.
10. **Cloison alvéolaire.** Système sans rails ni montants métalliques ; si le moteur génère des M48 pour une ligne « Placopan », c'est un bug.

## 4. Matériaux : fiches fabricant sourcées

Les valeurs ci-dessous sont transcrites des fiches Placo, Isover et des fiches négoce (Point.P, Gedimat, SFIC, Chausson) ; ce qui n'a pas été lu sur une fiche porte la mention « à vérifier ». Placo sert de référence ; Knauf et Siniat ont des formats identiques (largeur 1,20 m, rails 3 m) et s'ajoutent par simple fiche.

**Plaques et complexes**

| Article | Dimensions | Poids | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| Placoplatre BA13 standard | 1,20 × 2,00 / 2,40 / 2,50 / 2,60 / 2,65 / 2,70 / 2,80 / 3,00 / 3,20 / 3,60 m ; ép. 12,5 mm | 9 kg/m² ; plaque 2,50 m = 26,85 kg ; 3,00 m = 32,22 kg | pile de 50 plaques jusqu'à 3,00 m ; 40 plaques en 3,20 et 3,60 m | [fiche Placo BA13](https://dam.pim-cps.saint-gobain.com/MAM/assets/1/24488582A82047B4AABC2702AAA50B43/doc/75E9518A9102420D8DF25213571AE220/ficheproduit_Placoplatre_BA_13.pdf) |
| BA13 hydrofugée (Placomarine, H1) | 1,20 × 2,50 / 2,60 / 2,80 m | à vérifier (≈ 10 kg/m²) | pile à vérifier | [Point.P](https://www.pointp.fr/p/platre-isolation-ite/enduit-poudre-a-prise-normale-joint-pr-4-sac-25kg-A3291275) (format 2,8 × 1,2 cité) |
| Placomur Essentiel 10+80 (PSE) | 1,20 × 2,50 / 2,60 / 2,70 / 2,80 m ; ép. 90 mm ; R 2,15 | 25,19 kg le panneau de 2,50 m | panneau | [SFIC](https://www.sfic.com/p/plafonds-cloisons-isolation/doublage-a-coller-pse-placomur-essentiel-10-80-mm-2-5x1-2-m-r-A1632609), [Gedimat](https://www.gedimat.fr/doublage-polystyrene-expanse-placomur-e-10-80-2-50x1-20m-r-2-15m-k-w-placo,1726084,3,17,70.htm) |
| Doublissimo Performance BA13+140 | 1,20 × 2,70 m ; R 4,75 | 38,88 kg le panneau | panneau | [Chausson](https://www.chausson.fr/materiaux/panneaux-de-doublage-mur-doublage-doublissimo-performance-ba13-140-p-38584-4) |

**Ossatures et accessoires**

| Article | Dimensions | Poids | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| Rail Stil R48 | 48 × 28 mm, ép. 0,53 mm, L 3,00 m | 1,31 kg la barre | botte de 10 ; palette de 480 | [Placo](https://www.placo.fr/Produits/profiles/rail-stil-r-48), [La Plateforme](https://www.laplateforme.com/catalogue/produit/8224/rail-metallique-nf-stil-r-r48-l-3000-x-l-28-x-ep-0-53-mm-fixation-chevillage-ou-vissage) |
| Montant Stil M48 | 46 × 36 mm ; L 2,50 à 3,99 m (2,99 / 3,19 / 3,39 / 3,49 / 3,59 / 3,99 lus en négoce) | 2,00 kg en 3,49 m (≈ 0,57 kg/ml) | botte de 10 | [Point.P](https://www.pointp.fr/p/platre-isolation-ite/montant-placo-stil-m-48-3-39m-A6414700), [SFIC](https://www.sfic.com/p/plafonds-cloisons-isolation/montant-stil-m-48-349-l-3-49-m-l-ailes-6-mm-A1870239), [Chausson](https://www.chausson.fr/materiaux/montant-ossature-metallique-placo-stil-m48-cloison-plaque-platre-p-201256-12) |
| Montant Stil M70, M90 | longueurs comme M48, à vérifier | à vérifier | botte de 10 (à vérifier) | — |
| Fourrure Stil F530 | 45 mm, ép. 0,59 mm ; L 3,00 et 5,30 m | 2,39 kg en 5,30 m (≈ 0,45 kg/ml) | botte de 10 | [Matériaux Naturels](https://www.materiaux-naturels.fr/produit/1965-fourrure-placo-stil-f530-pour-plafond-doublage), [Chausson](https://www.chausson.fr/materiaux/fourrure-placo-stil-f530-plafond-doublage-p-201254-1) |
| Suspente longue 171 Stil F530 | plénum 20 à 150 mm ; charge 33 kg | — | boîte de 100 (≈ 50 m² de plafond) | [Placo](https://www.placo.fr/Produits/accessoires/suspente-longue-stil-f-530), [Chausson](https://www.chausson.fr/materiaux/suspente-pour-plafond-suspente-stil-f530-p-155171-1) |
| Suspente sécable Stil F530 | plénum 20 à 580 mm | — | boîte de 50 | [Placo](https://www.placo.fr/Produits/accessoires/suspente-secable-stil-f-530) |
| Appui intermédiaire Optima 2 (Isover) | L 120 mm | — | boîte de 50 | [Point.P](https://www.pointp.fr/p/platre-isolation-ite/membrane-vario-xtra-fast-rouleau-de-40x1-5m-A6788116) |
| Suspente Intégra 2 (rampants, Isover) | 12-16, 24-28 selon épaisseur d'isolant | — | boîte de 50 | [Point.P](https://www.pointp.fr/p/platre-isolation-ite/membrane-d-etancheite-vario-xtra-isover-rouleau-40x1-5-m-A3664018), [SFIC](https://www.e-sfic.fr/p/plafonds-cloisons-isolation/membrane-vario-xtra-40x1-5m-ref-65970-A3664018) |
| Vis TTPC 25 (3,5 × 25) | — | 1,33 kg la boîte | boîte de 1 000 (Placo : 1 500 existe) | [Bretagne Matériaux](https://www.bretagne-materiaux.fr/p/platre-isolation/vis-ttpc-p-a-i-l-25-mm-boite-de-1000-peces-A1830366), [Dispano](https://www.dispano.fr/p/platrerie-isolation/bande-a-joint-rouleau-de-150-m-A3877284) |
| Vis TTPC 35, 45 | — | — | boîte de 1 000 | [Isotech / Krenobat](https://krenobat.fr/Vis-plaque-de-platre-TTPC-avec-embout-de-vissage-3-5-x-25-mm-1000-bte-ISOTECH-3661523001836--0196303.html) |

**Joints, colles, isolants, étanchéité à l'air**

| Article | Rendement fabricant | Conditionnement | Source |
| --- | --- | --- | --- |
| Bande PP grand rouleau (Placo E04200010) | ≈ 1 rouleau pour 100 m² de plaques | rouleau de 150 m (23 m existe) | [Bretagne Matériaux](https://www.bretagne-materiaux.fr/p/platre-isolation/bande-a-joint-rouleau-de-150-m-A3877284) |
| Enduit Placojoint PR4 (poudre) | mini 330 g/m² de plaque ; 11 à 12 L d'eau par sac | sac de 25 kg (5 kg existe) | [Point.P](https://www.pointp.fr/p/platre-isolation-ite/enduit-poudre-a-prise-normale-joint-pr-4-sac-25kg-A3291275), [Union Matériaux](https://www.union-materiaux.fr/boutique/747445-placojoint-pr-4-25kg) |
| Enduit prêt à l'emploi Placomix | 0,47 kg/m² de plaque (Intégrale) | seau 25 kg cité dans les solutions Placo ; autres formats à vérifier | [Placo solution plafond](https://www.placo.fr/professionnels/solution/sp00012110/plafonds-sur-fourrures-stil-f-530-plancher-bois-1x-placoplatre-ba-13-stil-f-530-et-r-f-530-06-m) |
| Mortier adhésif MAP Formule + | 1,8 kg/m² de doublage collé ; plots Ø 10 cm, ≈ 10 plots/m² | sac de 25 kg ; sac de 10 kg en palette de 40 | [Placo doublage collé](https://www.placo.fr/en/node/99101), [fiche MAP](https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000130017478.pdf) |
| Isover GR 32 roulé revêtu kraft | 100 mm R 3,15 ; 120 mm R 3,75 ; 140 mm R 4,35 ; 160 mm R 5,00 | rouleau 1,20 × 2,70 = 3,24 m² (100 à 160 mm) ; 1,20 × 5,40 = 6,48 m² (85 et 100 mm) ; 9,72 m² (60, 75 mm) | [Isover](https://www.isover.fr/produits/laine-de-verre/gr-32-roule-revetu-kraft), [fiche gamme](https://annuaire.xpair.com/img/savoirfaire/entr_237/MFP_GR32roule.pdf) |
| Isover GR 32 revêtu kraft panneau | 45 mm R 1,40 ; 100 mm R 3,15 | 0,60 × 1,35 m : 15 panneaux/colis en 45 mm (12,15 m²) ; 8 panneaux/colis en 100 mm (6,48 m²) | [Isover](https://www.isover.fr/produits/laine-de-verre/gr-32-revetu-kraft) |
| Isover Comblissimo (soufflage) | R 7 : 3,80 kg/m², 320 mm environ ; R 4 : 2,20 kg/m², 190 mm | sac de 17,3 kg ; palette de 36 sacs | [Isover](https://www.isover.fr/produits/laine-de-verre/comblissimo), [fiche négoce](https://media.denismateriaux.com/media/173561_comblissimo_fichetech.pdf) |
| Membrane Vario Xtra | — | rouleau 1,50 × 40 m = 60 m² ; 5,2 kg | [Isover](https://www.isover.fr/produits/etancheite-lair/membrane-vario-xtra) |
| Adhésif Vario KB1 | recouvrement des lés 10 cm | rouleau 60 mm × 40 m | [Point.P](https://www.pointp.fr/p/platre-isolation-ite/membrane-d-etancheite-vario-xtra-isover-rouleau-40x1-5-m-A3664018) |
| Mastic Vario Double Fit | périphérie des membranes | cartouche 310 ml | [SFIC](https://www.e-sfic.fr/p/plafonds-cloisons-isolation/membrane-vario-xtra-40x1-5m-ref-65970-A3664018) |

Règle reprise du référentiel couverture : le conditionnement de `materiaux.json` vient d'une fiche négoce, pas du fabricant, car c'est le négoce qui livre. Les piles et palettes ne sont proposées qu'en information (« 1 pile = 50 plaques »), jamais imposées.

## 5. Règles de calcul (DTU 25.41, 25.42, 45.11) : formules et pertes

Deux familles de règles : les **pièces longues** (plaques, montants, fourrures) se calculent par calepinage, parce que leur longueur dépend de la hauteur ; les **consommables** (vis, bande, enduit, colle, suspentes) se calculent par les ratios officiels Placo « quantités indicatives pour 1 m² d'ouvrage jointoyé avec bande ». Les ratios Placo incluent déjà environ 5 % de chute sur les plaques (2,1 m² pour 2 m² de faces).

**Variables communes.** S = surface du devis (m², une face pour une cloison) ; H = hauteur sous plafond (m) ; L = S / H (longueur développée) ; ⌈x⌉ = arrondi supérieur.

**Choix des longueurs.** Plaque : plus petite longueur du catalogue ≥ H − 0,01 m parmi 2,40 / 2,50 / 2,60 / 2,70 / 2,80 / 3,00 / 3,20 / 3,60 (jeu de 1 cm en pied, DTU 25.41). Montant : plus petite longueur ≥ H − 0,01 m. Fourrure de doublage : 3,00 m si H ≤ 3,00 m, sinon 5,30 m (aboutage interdit en doublage sur appuis, fiche Placo). Au-delà de 3,60 m de hauteur : l'app ne calcule pas, elle le dit.

### 5.1 Cloison CLO (DTU 25.41)

Choix de l'ossature pour une 72/48 (1 BA13 par face, montant M48-35), d'après le [carnet de pose Siniat](https://www.siniat.fr/fr-fr/siniatheque/carnet-de-pose-dtu/comment-realiser-une-cloison-en-plaques-de-platre/) et la [fiche système Placo 72/48](https://www.placo.fr/documents/fiche-systeme/fichesysteme-sp00011221.pdf) :

| Hauteur H | Montants | Entraxe | Coefficient montants k\_m (ml/m²) |
| --- | --- | --- | --- |
| ≤ 2,50 m | simples | 0,60 m | 2,1 |
| 2,51 à 2,80 m | simples | 0,40 m | 3,0 |
| 2,81 à 3,05 m | doublés | 0,60 m | 3,7 |
| 3,06 à 3,40 m | doublés | 0,40 m | 5,3 |
| > 3,40 m | M70 ou plus : alerte, pas de calcul | — | — |

Pièce carrelée (salle d'eau) en parement simple : entraxe 0,40 m imposé quelle que soit la hauteur (Placo, guide DTU 25.41 ; seuil exact « carreaux > 1 600 cm² » à vérifier). Cloison 98/48 (2 BA13 par face) : simples 0,60 m jusqu'à 3,00 m (à vérifier, table Placo illisible en extraction).

```
plaques        = ⌈ L × 2 faces × p × 1,05 / 1,20 ⌉     p = plaques par face (1 ou 2)
montants       = ⌈ k_m × S / H ⌉                      barres de longueur ≥ H − 0,01
rails (barres) = ⌈ 2 × L × 1,10 / 3,00 ⌉              ≈ 0,9 ml/m² Placo à H = 2,50
vis TTPC 25    = S × (22 si entraxe 0,60 ; 30 si 0,40)        parement simple
               = S × (6 ou 8) en TTPC 25 + S × (22 ou 30) en TTPC 45   parement double
vis TRPF 13    = S × (2 si simples ; 6 si doublés 0,60 ; 10 si doublés 0,40)
bande          = S × 2,8 ml
enduit         = S × 0,66 kg (poudre) ou 0,94 kg (prêt à l'emploi)
laine          = S × 1,05 m²   (seulement si le devis la cite)
```

Source des ratios : [Intégrale Placo, cloisons Placostil](https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/L'Int%C3%A9grale%20Placo%202021-2022%20-%20%20Cloisons%20distributives%20Placostil%C2%AE%20BA13-%20BA15-%20BA18.pdf).

### 5.2 Doublage collé DBL-COL (DTU 25.42)

```
complexes = ⌈ L × 1,05 / 1,20 ⌉        longueur ≥ H − 0,01
MAP       = S × 1,8 kg  → sacs de 25 kg
bande     = S × 1,4 ml (1,74 avec Doublissimo BA13)
enduit    = S × 0,33 kg poudre ou 0,47 kg prêt à l'emploi
```

Source : [Placo, doublage collé Placomur](https://www.placo.fr/en/node/99101) et [solution Doublissimo](https://www.placo.fr/professionnels/solution/sp00012720/doublage-colle-1x-doublissimo-ba-13-380-13120-4m-lambda-0032-r-38-m2kw-support-beton). Interdit sur mur non plan, humide ou en pierre ancienne : si le devis dit « mur pierre » ou « avant 1948 », l'app le signale (le doublage collé y est déconseillé).

### 5.3 Contre-cloison sur montants DBL-MON

```
plaques   = ⌈ L × 1,05 / 1,20 ⌉
montants  = ⌈ 2,1 × S / H ⌉ (simples) ou ⌈ 4,2 × S / H ⌉ (doublés)
rails     = ⌈ L × 2 × 1,10 / 3,00 ⌉   (Placo : 1 ml/m²)
vis       = S × 11 TTPC 25 ; S × 5 TRPF 13 si montants doublés
bande     = S × 1,4 ml ; enduit = S × 0,33 kg poudre
```

Source : [Intégrale Placo, doublages sur montants](https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/L'Int%C3%A9grale%20Placo%202021-2022-Doublages%20Placostil%C2%AE%20sur%20montants.pdf). Hauteur limite en M48 simple 0,60 : à vérifier (2,00 à 2,50 m selon fabricant et isolant) ; par défaut l'app passe en doublés au-delà de 2,50 m.

### 5.4 Doublage sur fourrures et appuis DBL-APP

```
plaques            = ⌈ L × 1,05 / 1,20 ⌉
fourrures verticales = ⌈ L / 0,60 ⌉ + 1 barres (3,00 ou 5,30 m)
fourrures horizontales (lignes d'appuis) = ⌈ n_lignes × L × 1,05 / 3,00 ⌉
    n_lignes = ⌈ H / 1,30 ⌉ − 1, minimum 1   (BA13 : 1,30 m entre appuis)
rail F530          = ⌈ L × 2 × 1,10 / 3,00 ⌉   (Placo : 1,1 ml/m²)
appuis             = S × 2  → boîtes
vis TTPC 25        = S × 11
bande / enduit     = S × 1,4 ml / S × 0,33 kg poudre ou 0,47 kg pâte
laine              = S × 1,05 m²
```

Source : [Intégrale Placo, doublage sur appuis et fourrures F530](https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/L'Int%C3%A9grale%20Placo%202021-2022-%20Doublage%20Placostil%C2%AE%20avec%20appui%20sur%20fourrures%20Stil%C2%AE%20F%20530.pdf). Contrôle : le ratio Placo de 2,5 ml de fourrure/m² est retrouvé par le calepinage (1,67 vertical + 0,4 horizontal + chutes). Le ratio de 2 appuis/m² est plus haut que la géométrie (≈ 0,7/m² pour une ligne à 2,50 m) : à vérifier, probablement l'entretoise et la clé comptées séparément.

### 5.5 Plafond suspendu PLF-SUS (DTU 25.41)

Fourrures F530 à 0,60 m d'entraxe, suspentes tous les 1,20 m, plaques posées perpendiculairement aux fourrures (pose parallèle : suspentes à 0,40 m maxi, DTU 25.41).

```
plaques     = ⌈ S × 1,05 / (1,20 × Lp) ⌉    Lp = 2,50 par défaut (pose perpendiculaire)
fourrures   = ⌈ S × 1,79 × 1,05 / 3,00 ⌉   (Placo 1,79 ml/m² ; 2 ml/m² en ratio simplifié)
suspentes   = S × 1,8 → boîtes de 100 (sous bois) ; S × 1,56 dans la solution plancher bois
vis fixation suspentes = 2 TTPC 35 par suspente (sous bois) ; 1 cheville métal par suspente sous béton (à vérifier)
rail ou cornière de rive = S × 0,47 ml → barres de 3 m
éclisses     = S × 0,21
vis TTPC 25 = S × 15
bande       = S × 1,58 ml ; enduit = S × 0,37 kg poudre ou 0,53 kg pâte
```

Source : [solution Placo plafond F530 sous plancher bois](https://www.placo.fr/professionnels/solution/sp00012110/plafonds-sur-fourrures-stil-f-530-plancher-bois-1x-placoplatre-ba-13-stil-f-530-et-r-f-530-06-m) et [guide Placo plafond suspendu](https://www.placo.fr/comment-creer-un-plafond-suspendu-sur-ossature-suspentes-et-fourrures-stil-f530).

### 5.6 Plafond sous rampants PLF-RAM

Mêmes formules que 5.5 sur la surface en pente, avec ces changements : suspentes d'isolation (Intégra 2) à la place des suspentes F530, même ratio 1,8/m² ; laine en deux couches (entre chevrons + sous chevrons) chacune S × 1,05 m² ; pertes plaques 10 % (coupes biaises).

```
membrane = ⌈ S × 1,10 / 60 ⌉ rouleaux     (recouvrements 10 cm + relevés)
adhésif  = ⌈ (S / 1,40) × 1,10 / 40 ⌉ rouleaux   (un joint par lé de 1,50 m, utile 1,40 m)
mastic   = ⌈ périmètre / 6 ⌉ cartouches     (cordon Ø 8 mm : 310 ml ≈ 6 ml de cordon, calcul)
périmètre par défaut = 4 × √S (hypothèse affichée)
```

### 5.7 Combles perdus soufflés ISO-SOU (NF DTU 45.11)

```
sacs = ⌈ S × kg/m²(R) × 1,05 / 17,3 ⌉
```

| R visé (m².K/W) | Épaisseur mini | kg/m² | Sacs pour 100 m² (fabricant, sans perte) |
| --- | --- | --- | --- |
| 4 | 190 mm | 2,20 | 12,3 |
| 4,5 | 210 mm | 2,50 | 13,9 |
| 5 | à vérifier | à vérifier | 16 |
| 6 | à vérifier | à vérifier | 19 |
| 7 | ≈ 320 mm | 3,80 | 22 |
| 8 | à vérifier | à vérifier | 25 |
| 10 | 465 mm | à vérifier | 31 |
| 12 | 560 mm | 6,50 | 37 |
| 14 | 655 mm | 7,50 | 43 |

Sources : [Isover Comblissimo](https://www.isover.fr/produits/laine-de-verre/comblissimo), [fiche négoce Comblissimo](https://media.denismateriaux.com/media/173561_comblissimo_fichetech.pdf), [fiche Isover 2016](https://www.isover.fr/sites/mac3.isover.fr/files/assets/MAM/assets/1/A7350A046D7D409BB429D3C688D428E5/doc/CF2972C7575A4B44AF75CE585FBDD7D4/Fiche_Comblissimo_oct2016.pdf). Le +5 % est une marge de soufflage à faire valider (section 11).

### 5.8 Combles perdus déroulés ISO-ROU et coffrages COF

Déroulé : deux couches croisées, chacune ⌈ S × 1,05 / m² par colis ⌉. Coffrage : surface équivalente S\_eq = ml × développé (0,60 m par défaut) ; plaques = ⌈ S\_eq × 1,15 / 3,00 ⌉ (chutes fortes) ; ossature 3 ml par ml de coffrage (à vérifier) ; cornière ou bande armée = 1 ml par angle saillant ; vis, bande, enduit aux ratios plafond.

### 5.9 Pertes retenues

| Poste | Neuf | Rénovation | Note |
| --- | --- | --- | --- |
| Plaques murs et cloisons | 5 % (dans le 1,05) | 10 % | murs hors d'équerre, chutes en tête |
| Plaques plafonds et rampants | 5 % | 10 % | coupes biaises |
| Ossature (rails, montants, fourrures) | 10 % sur rails ; montants comptés à la pièce | idem | — |
| Isolants manufacturés | 5 % | 5 % | — |
| Laine soufflée | 5 % | 5 % | à valider |
| Vis, bande, enduit, MAP | 0 % (arrondi au conditionnement) | 0 % | l'arrondi à la boîte ou au sac sert de marge |

## 6. Valeurs par défaut et hypothèses à afficher

Chaque défaut utilisé apparaît en tête du quantitatif, en une ligne lisible (« Hauteur 2,50 m »), touchable pour corriger à la voix. Le moteur résout dans l'ordre : chantier (devis, chat) → artisan (habitudes apprises) → variation par axe → valeur nationale.

| Clé | Valeur nationale | Variation par axe | Hypothèse affichée |
| --- | --- | --- | --- |
| hauteur\_sous\_plafond | 2,50 m | neuf : 2,50 ; réno après 1948 : 2,50 ; réno avant 1948 : 2,80 | « Hauteur 2,50 m » |
| plaque\_standard | BA13 1,20 m | type\_batiment collectif/ERP : selon PV cité | « Plaques BA13 standard » |
| plaque\_pieces\_humides | BA13 hydrofugée H1 sur les lignes « salle de bain, salle d'eau, WC, buanderie » | — | « Plaques hydro en salle d'eau » |
| cloison\_type | 72/48, M48-35, entraxe 0,60 | entraxe et doublage selon hauteur (5.1) | « Cloison 72/48, montants à 60 cm » |
| isolant\_cloison | aucun ; laine 45 mm si « isolée » ou « phonique » sans épaisseur | — | « Laine 45 mm dans la cloison » |
| doublage\_sans\_precision | neuf : DBL-COL 10+80 ; réno : DBL-APP + GR 32 100 mm | epoque\_bati avant 1948 : DBL-APP obligatoire | « Doublage collé 10+80 » ou « Doublage sur appuis » |
| R\_mur\_sans\_precision | R 3,75 (GR 32 120 mm) | geographie : aucune variation retenue (seuil des aides nationales R ≥ 3,7, à vérifier) | « Isolant murs R 3,75 » |
| R\_combles\_perdus | R 7 | — (seuil des aides, à vérifier) | « Combles R 7, soufflage » |
| R\_rampants | R 6 en 2 couches (100 + 100 mm λ 32) | à vérifier | « Rampants R 6, 2 couches » |
| mode\_combles\_perdus | soufflage | si devis « rouleaux » ou « déroulé » : ISO-ROU | « Laine soufflée » |
| support\_plafond | sous solives bois (maison) ; dalle béton (collectif) | type\_batiment | « Plafond sous solives bois » |
| joints | faits par l'artisan, enduit poudre PR4 | artisan : appris après le 1er chantier | « Joints compris, enduit en sac » |
| pertes\_plaques | 1,05 | neuf\_renovation réno : 1,10 | « Pertes plaques 5 % » |
| coffrage\_developpe | 0,60 m | — | « Coffrage 60 cm de développé » |
| perimetre\_membrane | 4 × √S | — | « Périmètre estimé 22 m » |
| longueur\_plaque\_plafond | 2,50 m | — | « Plaques plafond 2,50 m » |

Une hypothèse qui fait varier une ligne de plus de 20 % est affichée en premier ; les autres sont repliées sous « Voir les hypothèses ».

## 7. Questions à poser (4 maximum, à boutons)

La hauteur sous plafond est la seule question presque toujours utile : elle change la longueur commandée de toutes les plaques et jusqu'à 150 % des montants. Les autres ne sont posées que si le devis et le profil de l'artisan ne répondent pas déjà.

| Ordre | Question (texte exact) | Boutons | Posée seulement si | Sensibilité |
| --- | --- | --- | --- | --- |
| 1 | Quelle hauteur sous plafond ? | 2,50 m · 2,60-2,70 m · 2,80-3,00 m · Plus de 3 m | le devis ne donne pas la hauteur et contient CLO, DBL ou COF | plaques : 100 % de la référence (longueur) ; montants : +43 % de 2,50 à 2,70 m (2,1 → 3,0 ml/m²), +76 % à 3,00 m (3,7 ml/m²) |
| 2 | C'est du neuf ou de la rénovation ? | Neuf · Rénovation | profil artisan et devis muets | plaques +5 % ; système de doublage par défaut (collé vs appuis) : 100 % des lignes de doublage si le devis dit seulement « doublage » |
| 3 | Pour les combles, quel niveau d'isolation ? | R 7 · R 8 · R 10 | une ligne ISO-SOU ou ISO-ROU sans R ni épaisseur | sacs : 22 / 25 / 31 pour 100 m², soit +14 % et +41 % |
| 4 | Les bandes et l'enduit, c'est vous qui les faites ? | Oui · Non, c'est le peintre | jamais demandé à cet artisan (réponse apprise ensuite) | bande et enduit : 0 ou 100 % de ces lignes |
| (5) | Il y a une salle de bain ou un WC dans ces cloisons ? | Oui · Non | pièce humide probable mais non nommée (devis « cloisons étage ») ; remplace la question 4 si celle-ci est déjà apprise | 10 à 30 % des plaques passent en hydro ; entraxe 0,40 m : +43 % de montants sur ces cloisons |

Questions interdites : toute question sur une quantité, une surface, un nombre de plaques, un entraxe ou une référence produit. Si le moteur hésite sur l'entraxe, il l'applique par la règle (5.1) et l'affiche en hypothèse.

Règle de tri quand plus de 4 questions sont candidates : on garde celles dont la sensibilité multipliée par la valeur de la ligne concernée est la plus forte ; les autres deviennent des hypothèses affichées.

## 8. Matériaux dominants par région

La plâtrerie sèche est la même dans toute la France : plaques de 1,20 m, ossature 48/70, vis TTPC. La région ne change aucun ratio de la section 5 ; elle change trois choses, toutes signalées sans question.

| Région ou situation | Ce qui change | Effet dans l'app | Statut |
| --- | --- | --- | --- |
| Bord de mer (département littoral, chantier en front de mer) | lame d'air de 2 cm entre isolant et mur extérieur en doublage sur appuis | rien sur les quantités ; rappel de pose affiché ; pas de doublage collé sur mur humide | sourcé : [Intégrale Placo, doublage sur appuis](https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/L'Int%C3%A9grale%20Placo%202021-2022-%20Doublage%20Placostil%C2%AE%20avec%20appui%20sur%20fourrures%20Stil%C2%AE%20F%20530.pdf) |
| Zones climatiques H1 (Nord, Est, Centre, montagne), H2 (Ouest dont Bretagne, Sud-Ouest), H3 (pourtour méditerranéen) | épaisseur d'isolant si le devis n'en donne pas | aucune : défaut national R 3,75 murs, R 7 combles (seuils des aides) | répartition par département à reprendre dans `commun/departements.json` (déjà prévu pour la couverture) |
| Sud-Est, Rhône-Alpes, Sud-Ouest | cloisons en carreaux de plâtre (DTU 25.31) plus fréquentes en logement | si le devis dit « carreau de plâtre », « Placoplatre carreau », « cloison 7 cm » : tiroir CARREAU (section 13), pas de rails | à vérifier |
| Sud et Sud-Ouest, bâti ancien | brique plâtrière en cloison existante | aucun matériau à commander (dépose) | à vérifier |
| Bretagne, Grand Est, montagne | ouate de cellulose soufflée plus fréquente en combles | si « ouate » : sacs de ouate à la place de la laine de verre (fiche à ajouter, section 13) | à vérifier |
| Altitude > 800 m | zone H1 renforcée | aucune variation retenue en MVP | à vérifier |

Conséquence pour `metier.json` : geographie = « faible ». Le moteur lit le département pour le seul rappel « bord de mer » et pour charger la bonne zone climatique dans l'écran d'hypothèses.

## 9. Points singuliers et consommables

Les points singuliers s'ajoutent seulement quand le devis les nomme (une porte, une salle de bain, un WC suspendu) ; ils ne sont jamais inventés.

| Point singulier | Déclencheur dans le devis | Ajout au quantitatif | Source / statut |
| --- | --- | --- | --- |
| Bâti de porte dans une cloison | « porte », « huisserie », « bloc-porte » (par unité) | +2 montants (encadrement renforcé) ; +1 rail de 3 m pour la traverse et les retours de 20 cm | rails remontés de 20 cm au droit des huisseries : [Intégrale Placo](https://www.placo.fr/sites/mac3.placo.fr/files/files/forum/L'Int%C3%A9grale%20Placo%202021-2022%20-%20%20Cloisons%20distributives%20Placostil%C2%AE%20BA13-%20BA15-%20BA18.pdf) ; +2 montants à vérifier |
| Fenêtre dans un doublage | « fenêtre », « baie », « tableau » | chevêtre : 1 rail F530 de 3 m par ouverture ; retours de tableaux 0,5 m² de plaque par fenêtre | à vérifier |
| Pied de cloison en pièce humide | ligne en salle de bain, salle d'eau | film polyéthylène 100 µm sous le rail, dépassant de 2 cm : L ml ; enduit hydro à la place de l'enduit standard | sourcé : Intégrale Placo (même lien) |
| Pièce humide en rénovation sans plaque hydro | « réno salle de bain » + plaques existantes | sous-couche Placotanche 2 × 0,4 kg/m² sur surfaces carrelées ; bande d'étanchéité en périphérie sur 10 cm | sourcé : Intégrale Placo ; conditionnement à vérifier |
| Charge lourde (lavabo, WC suspendu, meubles hauts, radiateur) | appareil cité | 1 renfort par appareil (traverse bois ou rail entre montants) | à vérifier |
| Angle saillant | « angle », « tableau », coffrage | bande armée ou cornière : 1 ml par ml d'angle (H par angle) ; rouleau de 30 m | rouleau 30 m : [SFIC](https://www.sfic.com/p/plafonds-cloisons-isolation/bande-a-joint-rouleau-de-150-m-A3877284) |
| Trappe de visite | « trappe » | 1 trappe par unité | — |
| Trappe d'accès aux combles soufflés | toute ligne ISO-SOU | 1 contour de trappe ; piges de repérage d'épaisseur (1 pour 15 m², à vérifier) | contour de trappe : [fiche Isover](https://www.toutsurlisolation.com/isolation-dun-comble-perdu-avec-de-la-laine-de-verre-souffler-sur-plancher-bois) |
| Étanchéité à l'air périphérique d'un doublage | DBL-APP, DBL-MON, PLF-RAM | mastic souple : 1 cartouche pour 6 ml de périphérie | principe : Intégrale Placo ; rendement calculé |

**Consommables générés automatiquement** (sans déclencheur, dès que l'ouvrage existe) :

| Consommable | Règle | Unité de commande |
| --- | --- | --- |
| Fixation des rails au sol et au plafond | 1 cheville à frapper ou clou tous les 0,60 m : rails\_ml / 0,60 | boîte de 100 (à vérifier) |
| Fixation des fourrures horizontales et rails F530 | 1 cheville tous les 0,60 m | boîte de 100 (à vérifier) |
| Fixation des suspentes | sous bois : 2 vis TTPC 35 par suspente ; sous béton : 1 cheville métal par suspente (à vérifier) | boîte |
| Vis de solidarisation des montants doublés | TRPF 13 tous les 0,40 m (ratio 5.1) | boîte |
| Vis TTPC selon épaisseur | longueur = parement + 10 mm : 25 mm pour 1 BA13, 35 mm pour 1 BA18, 45 mm pour 2 BA13 | boîte de 1 000 |
| Bande et enduit | ratios de la section 5, toujours en sacs entiers | rouleau 150 m, sac 25 kg |

Règle de regroupement : les vis, chevilles, bandes et enduits de tous les ouvrages du chantier sont additionnés avant l'arrondi à la boîte ou au sac.
