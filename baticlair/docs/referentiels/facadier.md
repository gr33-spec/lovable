# Référentiel quantitatif FAÇADIER (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

Le façadier traite l'enveloppe verticale : enduits (neuf et ravalement), isolation thermique par l'extérieur sous enduit (ITE), revêtements et peintures de façade, nettoyage et traitements. Ses quantités dépendent d'abord du support (époque du bâti) et du neuf/rénovation, beaucoup moins de la région.

Périmètre du tiroir : enduit monocouche (DTU 26.1), enduits traditionnels et chaux sur bâti ancien, ITE PSE ou laine de roche sous enduit mince (cahier CSTB 3035 / Règles professionnelles ETICS), RPE et revêtements d'imperméabilité I1 à I4 (DTU 42.1), peinture de façade D2/D3 (DTU 59.1), nettoyage, antimousse, hydrofuge, réparation béton, joints. Hors périmètre (autres tiroirs) : bardage bois (charpente), bardage ardoise (couverture), maçonnerie neuve.

| Axe | Poids | Ce qui change |
| --- | --- | --- |
| Époque du bâti | fort | Avant 1948 (moellon, pierre, terre) : enduit chaux, jamais monocouche ciment. 1950-1980 : béton banché, fissures, I3/I4. Après 1980 : parpaing/brique, monocouche. |
| Neuf / rénovation | fort | Neuf : monocouche en 1 passe sur support propre. Réno : nettoyage, piquage ou décapage, réparation, primaire, puis finition ; +1 à 3 produits. |
| Type de bâtiment | moyen | Hauteur > R+2 : chevillage renforcé ITE, bandes coupe-feu laine de roche par niveau (IT 249), échafaudage plus lourd. Maison individuelle = cas par défaut. |
| Géographie | moyen | Littoral et zone de vent forte : plus de chevilles ITE, hydrofuge. Bretagne, granit apparent : rejointoiement chaux. Sud : teintes claires imposées (indice de luminance). Montagne : résistance au gel. |
| Gamme | faible | Finition grattée, talocheuse ou écrasée : change l'épaisseur donc la consommation (± 15 %). Marque indifférente pour la quantité. |

```json
{
  "code": "facade",
  "nom": "Façade - ravalement - ITE",
  "version": "1.0.0",
  "normes": ["DTU 26.1", "DTU 42.1", "DTU 59.1", "Cahier CSTB 3035_V3", "Règles pro ETICS-PSE", "IT 249"],
  "axes_de_variation": {
    "geographie": "moyen",
    "epoque_bati": "fort",
    "type_batiment": "moyen",
    "neuf_renovation": "fort",
    "gamme": "faible"
  },
  "metiers_lies": ["maconnerie", "peinture", "echafaudage", "isolation", "couverture"],
  "unites_de_commande": ["sac", "seau", "bidon", "plaque", "colis", "rouleau", "barre", "boite", "cartouche", "u", "palette"],
  "maturite": "beta"
}
```

## 2. Règle d'or et unités de commande

Règle d'or : le devis parle en m² et en ml, le négoce livre des sacs, des seaux, des plaques et des barres. Aucune ligne du quantitatif ne sort en m². Chaque ligne = produit + format + nombre d'unités de commande, arrondi à l'unité supérieure (et au colis entier pour l'isolant et les chevilles).

| Famille | Unité de commande | Format courant négoce | Piège à éviter |
| --- | --- | --- | --- |
| Enduit monocouche, enduit chaux, mortier colle-enduit ITE, mortier de réparation | sac | 25 kg (parfois 30 kg) | Sortir des kg ou des m² au lieu de sacs |
| Sous-enduit, gobetis, ragréage façade | sac | 25 kg | Oublier la couche quand le support est irrégulier |
| Finition pâteuse (RPE, enduit organique, silicate) | seau | 25 kg (parfois 15 ou 20 kg) | Confondre seau en kg et peinture en litres |
| Peinture façade, imperméabilité I1-I4 | seau | 15 L (aussi 10 L, 5 L) | Oublier la 2e couche ou l'armature I4 |
| Primaire, fixateur, imperméabilisant | bidon / seau | 5, 10, 15 ou 20 L / kg | Un seul primaire pour deux supports différents |
| Nettoyant, antimousse, hydrofuge | bidon | 5, 20 ou 30 L | Rendement en m²/L très variable selon porosité |
| Isolant ITE (PSE blanc/gris, laine de roche) | colis (et plaques) | 1200 × 600 mm, colis selon épaisseur | Commander en m² : le négoce veut un nombre de colis |
| Treillis / armature fibre de verre | rouleau | 1 × 50 m | Oublier les recouvrements de 10 cm et les renforts d'angle |
| Profilés (rail de départ, cornière d'angle, baguette d'arrêt, goutte d'eau, joint de fractionnement) | barre | 2,5 m (parfois 2 ou 3 m) | Sortir des ml au lieu de barres |
| Chevilles ITE, chevilles à frapper | boîte | 100 ou 200 u | Longueur de cheville = isolant + colle + ancrage : jamais « une cheville » sans longueur |
| Mastic, joint mousse précomprimé | cartouche / rouleau | 310 ml / rouleau 5 à 12 m | Oublier le tour des menuiseries |
| Bande, ruban, film de protection | rouleau | 33 ou 50 m | Oublier la protection des menuiseries en ravalement |
| Échafaudage | location (m² de façade × semaines) | — | Ligne à part : m² autorisé ici car c'est une location, pas une fourniture |

Principe fournisseur (rappel du référentiel couverture) : chaque ligne doit pouvoir être saisie telle quelle par le négoce, sans calcul. Exemple bon : « Enduit monocouche gratté, teinte à préciser, sac 25 kg × 54 ». Exemple refusé : « Enduit monocouche 72 m² ».

## 3. Ouvrages du métier, vocabulaire des devis, pièges

Dix ouvrages couvrent l'essentiel des devis de façadier. Le moteur reconnaît l'ouvrage par les mots du devis (colonne vocabulaire), puis applique les règles du chapitre 5.

| id ouvrage | Ce que c'est | Mots du devis (vocabulaire.json) | Mesure attendue | Pièges |
| --- | --- | --- | --- | --- |
| enduit\_monocouche | Enduit ciment-chaux prêt à l'emploi, 1 passe en 2 couches frais sur frais, finition grattée/talocheuse/écrasée | monocouche, OC1, OC2, OC3, enduit gratté, enduit taloché, crépi (abus), enduit de façade, projection mécanique | m² façade (ouvertures déduites ou non), ml d'angles et tableaux | « Crépi » peut désigner un RPE (seau) et non un monocouche (sac). Tableaux et voussures souvent facturés en ml mais consomment de l'enduit. |
| enduit\_chaux | Enduit traditionnel ou prêt à l'emploi chaux aérienne/NHL en 2 ou 3 couches, bâti ancien | enduit chaux, chaux NHL, gobetis, corps d'enduit, finition, enduit 3 couches, rejointoiement, beurré, pierre vue | m², épaisseur totale, ml de joints | Rejointoiement à pierre vue consomme 5 à 10 fois moins qu'un enduit couvrant. Ne jamais proposer de monocouche ciment sur moellon. |
| ite\_enduit\_mince | Isolant collé (et chevillé) + sous-enduit armé + finition | ITE, isolation par l'extérieur, ETICS, PSE, polystyrène graphité, laine de roche, R = , épaisseur 140 mm, sous-enduit armé, finition grattée | m², épaisseur ou R, ml d'angles, ml de pied (départ), ml de tableaux | Le devis donne R ou épaisseur : convertir avant de compter les colis. Chevilles dépendantes de la hauteur et du vent. Tableaux : isolant mince + profilés. |
| rpe\_finition | Revêtement plastique épais ou finition organique/silicate en pâte | RPE, crépi, revêtement plastique épais, enduit organique, finition siloxène, enduit silicate, ribbed, grain 1,5 | m², granulométrie | Consommation liée au grain (1 à 3 mm). Primaire teinté sous RPE presque toujours. |
| peinture\_facade | Peinture D2/D3, Pliolite, acrylique, siloxène, 2 couches | peinture façade, D2, D3, Pliolite, siloxène, minéral, 2 couches, impression | m², nombre de couches | Une ligne m² = 2 couches + 1 impression si non dit. Rendement réel = moitié du rendement « théorique » sur support rugueux. |
| impermeabilite\_i1\_i4 | Revêtement d'imperméabilité sur béton fissuré, classes I1 à I4 (I4 = armé) | I1, I2, I3, I4, imperméabilité, film semi-épais, entoilage, armé, traitement des fissures | m², classe, ml de fissures | I3/I4 impose consommation minimale (kg/m²) par l'Avis technique : pas de rendement libre. I4 = toile/armature en rouleaux. |
| nettoyage\_traitement | Lavage HP, antimousse, fongicide, décapage, hydrofuge | nettoyage haute pression, démoussage, traitement antimousse, fongicide, algicide, hydrofuge, décapage | m² | Antimousse avant tout ravalement étalé en 1 couche généreuse ; hydrofuge en 2 passes frais sur frais sur support poreux. |
| reparation\_support | Piquage d'enduit, rebouchage, reprises béton (aciers, mortier R3/R4) | piquage, dégrossissage, reprise enduit, traitement des aciers, épauffrures, réparation béton, Réparation ponctuelle | m², ml, forfait, nb | « Forfait réparations » : pas de quantité → hypothèse affichée (chap. 6), jamais une question chiffrée à l'artisan. |
| traitement\_fissures | Ouverture, mastic ou bande + entoilage | fissures, microfissures, ouverture et calfeutrement, pontage, bande d'entoilage | ml de fissures | Si absent du devis mais I2-I4 présent : hypothèse 0,3 ml/m² (à vérifier). |
| habillage\_appuis\_profiles | Appuis de fenêtre, couvertines, profilés de rive, goutte d'eau | appui, bavette alu, couvertine, profilé de départ, baguette d'angle, joint de dilatation | ml, nb fenêtres | Bavettes commande en longueur exacte par fenêtre, pas en ml global. |

Pièges transverses : le m² du devis est souvent « plein pour vide » (ouvertures non déduites, compensées par les tableaux) ; le moteur doit détecter la mention et ne pas compter deux fois. La ligne « échafaudage » donne souvent la vraie surface de façade quand le m² d'enduit est ambigu.

## 4. Matériaux : fiches fabricant sourcées

Les consommations ci-dessous viennent des fiches fabricant ou négoce ouvertes le 3 oct. 2026 ; une valeur sans lien porte « à vérifier ». Toutes les poudres sont en sac de 25 kg, palette de 48 sacs (1 200 kg), sauf mention.

### 4.1 Enduits hydrauliques (sacs)

| id matériau | Produit type | Consommation fabricant | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| monocouche\_oc2\_grain\_fin | weber.pral F (OC2, 0-1,5 mm) | Maçonnerie : 22-25 kg/m² rustique/taloché, 26-28 kg/m² gratté. Béton ou sous-enduit : 12-15 / 15-17 kg/m² | sac 25 kg, palette 48 | [fiche Weber via Quéguiner](https://www.queguiner.fr/external-media/sa-saint-gobain-weber-france/fiche/fiche-produit-weberpral-f.pdf), [Sobemat](https://www.sobemat.fr/produit/weber-pral-f-blanc-000-25kg-V0VCMDUwNTA2) |
| monocouche\_oc1\_allege | PRB Monorex GF (OC1 semi-allégé) | 1,3 kg/m² par mm | sac 25 kg | [fiche PRB via Chausson](https://www.chausson.fr/media/article-document/271884) |
| monocouche\_chaux\_oc1 | Thermocromex (chaux Saint-Astier) | 1,5-1,6 kg/m² par mm ; épaisseur finale 12-15 mm (maçonnerie soignée) ou 15-18 mm (courante) | sac 25 kg | [fiche technique Samse](https://private.samse.fr/catalogueWs/Fiche_technique/Fiche_technique_1364922.pdf) |
| sous\_enduit\_tradi | PRB Tradirex (sous-enduit DTU 26.1) | 1,6 kg/m² par mm | sac 25 kg | [fiche PRB Samse](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1382208.pdf) |
| sous\_enduit\_chaux\_restauration | Parexlanko Parlumière Clair | 1,5 kg/m² par mm minimum ; 5 à 15 mm par passe | sac 25 kg | [Chausson](https://www.chausson.fr/materiaux/produits-de-mise-en-oeuvre-sous-enduit-blanc-de-restauration-la-chaux-parlumiere-clair-parex-sac-de-9547-poids-p-672718-1) |
| finition\_chaux | Parexlanko Parlumière Fin / Moyen | 1,4 kg/m² par mm minimum | sac 25 kg, palette 48 | [Chausson](https://www.chausson.fr/materiaux/enduit-parement-chaux-grain-moyen-parexlanko-parlumiere-p-672720-10), [Gedimat](https://www.gedimat.fr/enduit-de-restauration-parlumiere-fin-o50-sac-de-25kg-parexlanko,1845399,14,89,10.htm) |
| enduit\_chaux\_generique | Enduit chaux sable Parexlanko | 14 kg/m² par cm | sac 25 kg | [Mr Bricolage](https://www.mr-bricolage.fr/enduit-de-facade-a-chaux-sable-25kg-parexlanko.html) |

### 4.2 ITE sous enduit mince

| id matériau | Produit type | Donnée fabricant | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| mortier\_ite\_colle\_sous\_enduit | weber.therm XM (collage + calage + sous-enduit) | Collage/calage 2,5-4,5 kg/m² selon relief ; sous-enduit 7,5 kg/m² (5 mm) | sac 25 kg, palette 48 | [fiche Weber Gedimat](https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000125213799.pdf), [Gedimat produit](https://www.gedimat.fr/mortier-pour-systeme-ite-webertherm-xm-sac-de-25kg-weber,1711145,3,21,85.htm) |
| pse\_graphite\_ite | PSE gris λ 0,031, 1200 × 600 mm (0,72 m²/plaque) | 140 mm : R = 4,50, 2,38 kg/plaque ; 120 mm : R = 3,85 | colis ≈ 0,30 m³ : 3 plaques en 140 mm (2,16 m²) | [Point.P 120 mm](https://www.pointp.fr/p/platre-isolation-ite/panneau-polystyrene-graphite-lisse-1200x600mm-epaisseur-120mm-A3879888), [CBA 140 mm](https://cba-materiaux.fr/p/platre-isolation/panneau-isolant-ite-pse-graphite-gris-1200x600-mm-ep-140-mm-r-A3879890), [Elaustore colis](https://www.elaustore.com/produit/polystyrene-expanse-graphite-0031-140-mm) |
| pse\_blanc\_ite | PSE blanc λ 0,038, 1200 × 600 mm, 15 kg/m³ | épaisseurs 20 à 300 mm par pas de 10 mm | colis selon épaisseur (à vérifier) | [Weber, choix des isolants](https://www.fr.weber/choix-des-isolants-ite) |
| colis\_pse\_par\_epaisseur | Cellomur Ultra (Hirsch), 1200 × 600 | 50 mm : 10 plaques ; 60 : 8 ; 70 : 7 ; 80 : 6 ; 100-120 : 4-5 ; 140-180 : 3 ; 190 : 2 | colis | [Hirsch Isolation](https://hirschisolation.fr/produits/cellomur-ultra/) (correspondance épaisseur/colis au-delà de 80 mm à vérifier) |
| laine\_roche\_ite | Laine de roche double densité ITE, 1200 × 600 | à vérifier (Rockwool Ecorock / Knauf) | colis à vérifier | — |
| cheville\_ite\_frapper | Cheville à frapper rosace 60 mm, longueur = isolant + calage + ancrage | voir règle 5.4 | boîte 100 ou 200 | [Point.P boîte 100](https://www.pointp.fr/p/platre-isolation-ite/panneau-polystyrene-graphite-lisse-1200x600mm-epaisseur-120mm-A3879888), [prix-de-gros boîte 200](https://www.prix-de-gros.com/fr/p/kit-complet-ite-pse-graphite-th31-100-m-140-mm/r/ki100g140) |
| treillis\_verre\_ite | Armature fibre de verre anti-alcalis, maille 4 × 4 ou 8 × 8, 145-165 g/m² | 1,1 m² par m² (recouvrements) | rouleau 50 m² (1 × 50 m) ; parfois 55 m² | [prix-de-gros](https://prix-de-gros.com/fr/p/kit-complet-ite-pse-blanc-150-m-140-mm/r/ki150b140) |
| treillis\_renforce\_soubassement | Treillis renforcé maille 4 × 4 (partie basse, chocs) | 1 couche en plus sur hauteur 1 à 2 m | rouleau (format à vérifier) | [fiche weber.therm XM PSE](https://www.ets-lherbier.com/wp-content/uploads/2018/04/webertherm-xm-polystyrene_cale-cheville.pdf) |
| profile\_goutte\_eau\_ite | Profilé goutte d'eau PVC entoilé | 1 par ml de linteau/rive basse | barre 2,5 m | [Point.P](https://www.pointp.fr/p/platre-isolation-ite/sous-enduit-mineral-pour-ite-en-pose-collee-weber-therm-xm-colle-A3050932) |
| rail\_depart\_ite | Rail de départ alu, largeur = épaisseur isolant | ml pied de façade ; cheville tous les 30 cm | barre 2,5 m (à vérifier, parfois 2 m) | [Batirama](https://www.batirama.com/article/1571-isolation-thermique-par-l-exterieur-systeme-colle-fixe-cale-ou-par-rails.html) (espacement) |
| corniere\_angle\_ite | Cornière d'angle PVC entoilée | ml d'angles + tableaux | barre 2,5 m (à vérifier) | — |

### 4.3 Finitions en pâte (seaux)

| id matériau | Produit type | Consommation | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| finition\_organique\_taloche | webertene XL+ taloché | ≈ 2,5 kg/m² (1,25 mm) | seau 25 kg, palette 24 | [fiche Weber Chausson](https://www.chausson.fr/media/article-document/223789) |
| rpe\_taloche\_fibre | PRB Révomur M, grain 1,5 | 2,2-2,8 kg/m² | seau 25 kg | [ITE-shop](https://www.ite-shop.com/enduit-organique-structure-prb-revomur-m-25kg) |
| rpe\_ignifuge\_ite | Parexlanko Revlane+ ignifugé taloché fin | 2,2-2,5 kg/m² | seau 25 kg | [Chausson](https://www.chausson.fr/materiaux/enduits-de-facade-enduit-de-parement-organique-revlane-ignifuge-taloche-fin-parex-9552-couleur-seau-de-9547-poids-p-652998-3) |
| rpe\_d3\_ravalement | Caparol Capatect Taloché T15 (RPE D3) | ≈ 2,5 kg/m² | seau 25 kg | [fiche Caparol](https://www.caparol.fr/caparol_pim_import/caparol_fr/products/ti/253477/TI_Capatect_Taloch_T15_FR.pdf) |
| finition\_silicate | Allios Cristalite Taloché (silicate) | ≈ 2,6 kg/m² à 1,5 mm | fût 25 kg | [fiche Allios](https://peintea.fr/wp-content/uploads/2018/12/CRISTALITE-TALOCHE.pdf) |
| finition\_grattee\_par\_grain | Baumit, gratté 1,5 / 2 / 3 mm | 2,5 / 2,9 / 3,9 kg/m² (+ 10 % conseillé par le fabricant) | seau 25 kg, palette 32 | [fiche Baumit](https://media.hornbach.de/hb/technicaldatasheet/as.181008751.pdf) |

### 4.4 Peintures et imperméabilité (seaux en litres ou kg)

| id matériau | Produit type | Rendement | Conditionnement | Source |
| --- | --- | --- | --- | --- |
| peinture\_d2\_hydropliolite | Tollens TOL PRO Hydro Façade | ≈ 9 m²/L/couche ; densité 1,56 | seau 15 L (à vérifier pour cette réf.) | [fiche Tollens](https://www.tollens.com/download/fiche_technique/TGP_TOPRFH/1/TOLPRO+HYDRO+Fa%C3%A7ade+Hydro+PLIOLITE%C2%AE-fiche_technique.pdf) |
| peinture\_d2\_pliolite | Pliolite solvant (Artilite, Batir…) | 6-8 à 7-11 m²/L/couche selon porosité ; 2 couches, 1re diluée 10 % | seau 15 L ou 10 L | [Batiproduits Artilite](https://www.batiproduits.com/fiche/produits/peinture-mate-antimoisissures-a-base-de-resine-p-p68898763.html), [fiche Gedimat 1517](https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000128842606.pdf) |
| systeme\_impermeabilite | PRB Color Impermat (RSI, DTU 42.1) | I1 (A2) : 1 × 300 g/m² ; I2 (A3) : 2 × 250 ; I3 (A4) : 2 × 400 ; I4 (A5) : 2 × 400 + armature + 400 ; impression 150-200 g/m² ; densité 1,3 | seau (format à vérifier, 15 L courant) | [fiche PRB](https://pim.prb.fr/PRB/Fiches%20Techniques/en/ft_prb_color_impermat_en_30_11_2023.pdf) |
| armature\_i4 | Voile / armature non tissée d'imperméabilité | 1,1 m²/m² (à vérifier) | rouleau 1 × 50 m (à vérifier) | — |

Poids utiles pour la livraison : sac 25 kg ; palette 48 sacs = 1 200 kg ; seau pâte 25 kg ; plaque PSE gris 140 mm = 2,38 kg.

## 5. Règles de calcul DTU, formules et pertes

Toutes les règles partent de la surface S (m²) et des linéaires lus dans le devis, puis convertissent en kg ou L, puis en unités de commande arrondies au-dessus. Le moteur affiche chaque hypothèse utilisée (chap. 6).

### 5.1 Surface à traiter

- Devis « plein pour vide » ou sans mention : S = surface du devis, ouvertures non déduites (les tableaux sont compensés).
- Devis « ouvertures déduites » : S = surface du devis + ml\_tableaux × profondeur de tableau (défaut 0,20 m, à vérifier).
- Ligne échafaudage présente et surface d'enduit absente : S = surface échafaudage × 0,85 (ouvertures moyennes, à vérifier).

### 5.2 Enduit monocouche (DTU 26.1)

Règles DTU reprises par les fiches : recouvrement minimal 10 mm en tout point après finition, maximum 25 mm ponctuellement, application en 1 ou 2 passes ; épaisseur finale 12-15 mm sur maçonnerie soignée, 15-18 mm sur maçonnerie courante ([fiche Thermocromex](https://private.samse.fr/catalogueWs/Fiche_technique/Fiche_technique_1364922.pdf), [fiche PRB](https://www.chausson.fr/media/article-document/267805)).

- kg = S × conso(support, finition), conso tirée du tableau 4.1 (milieu de fourchette) : maçonnerie gratté 27, rustique/taloché 23,5 ; béton ou sous-enduit gratté 16, rustique/taloché 13,5 kg/m².
- Variante si le devis donne l'épaisseur : kg = S × e\_mm × 1,45 (densité moyenne 1,3 à 1,6 kg/m²/mm).
- Tableaux et voussures facturés en ml : + ml × 0,20 m × conso.
- Sacs = arrondi\_sup(kg × (1 + perte) / 25), perte 5 % (machine) ou 8 % (main) à vérifier.
- Accessoires : baguette d'angle et d'arrêt, barres de 2,5 m = arrondi\_sup(ml × 1,05 / 2,5) ; arrêt d'enduit à 15 cm du sol (sauf monocouche enterrable).

### 5.3 Enduit chaux sur bâti ancien (DTU 26.1, enduit en 3 couches)

- Épaisseurs par défaut (à vérifier) : gobetis 5 mm, corps d'enduit 15 mm, finition 7 mm.
- kg = S × (5 × 1,6 + 15 × 1,5 + 7 × 1,4) = S × 40,3 kg/m² ; sacs = arrondi\_sup(kg × 1,08 / 25), répartis par produit (sous-enduit / finition).
- Rejointoiement à pierre vue : 6 kg/m² de finition chaux (à vérifier par un façadier).

### 5.4 ITE PSE sous enduit mince (CPT 3035, DTA du système)

- Plaques = arrondi\_sup(S × 1,05 / 0,72) ; colis = arrondi\_sup(plaques / plaques\_par\_colis(épaisseur)). Si le devis donne R : épaisseur = R × λ arrondie aux 10 mm supérieurs (λ 0,031 gris, 0,038 blanc).
- Mortier colle + sous-enduit (même produit) : kg = S × (3,5 + 7,5) × 1,05 ; sacs de 25 kg. Calage 2,5-4,5 kg/m² selon planéité du support (milieu 3,5).
- Chevilles partie courante : 5 par plaque soit 6,9/m² minimum ([Edilteco, DTA](https://www.edilteco.fr/fr/catalogue/ite/accessoires/chevilles-de-fixation)), 8 à 12/m² selon vent et hauteur ([Tollens](https://www.tollens.com/content/download/16766/file/Documentation_technique_ITE_Tollens.pdf)). Défaut maison individuelle site normal : 7/m² courant + 4 par ml d'angle de bâtiment ([Batirama](https://www.batirama.com/article/1571-isolation-thermique-par-l-exterieur-systeme-colle-fixe-cale-ou-par-rails.html)). PSE gris : 2 chevilles par plaque minimum même en pose collée ([FFB 2026](https://www.ffbatiment.fr/actualites-batiment/actualite-bam/isolation-thermique-exterieure-enduit-isolant-regles-art-evoluent)).
- Longueur de cheville = ancrage + ancien revêtement + calage + isolant ; défaut ancrage 50 mm + calage 10 mm (à vérifier selon cheville) ; arrondie à la longueur catalogue supérieure. Boîtes = arrondi\_sup(chevilles × 1,05 / 100).
- Treillis : m² = S × 1,1 + 0,06 × nb\_ouvertures (mouchoirs 200 × 300 mm aux angles, à vérifier) + ml\_pied × 1,5 m de renfort soubassement ; rouleaux = arrondi\_sup(m² / 50).
- Rail de départ : barres = arrondi\_sup(ml\_pied × 1,05 / 2,5), largeur = épaisseur isolant ; vis/chevilles de rail tous les 30 cm.
- Cornières d'angle : barres = arrondi\_sup((ml\_angles + ml\_tableaux) × 1,05 / 2,5). Goutte d'eau : barres = arrondi\_sup(ml\_linteaux × 1,05 / 2,5).
- Finition : kg = S × 2,5 × 1,10 ; seaux = arrondi\_sup(kg / 25). Primaire de fond teinté si le système l'impose : 0,2 kg/m² (à vérifier).

### 5.5 RPE ou finition en pâte sur façade existante

- Seaux = arrondi\_sup(S × conso(grain) × 1,10 / 25), conso 2,5 kg/m² en grain 1,5, 2,9 en grain 2, 3,9 en grain 3 (Baumit).
- Impression/primaire : 1 couche, 0,15-0,25 kg/m² (à vérifier).

### 5.6 Peinture de façade D2/D3 (DTU 59.1)

- L = S × couches / rendement ; couches défaut 2 ; rendement défaut 7 m²/L/couche (bas de la fourchette Pliolite 6-11 car façade rugueuse).
- Seaux 15 L = arrondi\_sup(L × 1,05 / 15). Fixateur/impression si support farinant : 1 couche à 8 m²/L (à vérifier).

### 5.7 Imperméabilité I1 à I4 (DTU 42.1)

- Grammages PRB (g/m²) : impression 175 ; I1 300 ; I2 500 ; I3 800 ; I4 1 200 + armature. kg = S × total / 1000 ; L = kg / 1,3 ; seaux selon conditionnement du système retenu.
- I4 : armature m² = S × 1,1 ; rouleaux = arrondi\_sup(m² / 50) (format à vérifier). Fissures : mastic acrylique 1 cartouche 310 ml pour 10 ml de fissure ouverte (à vérifier).

### 5.8 Nettoyage et traitements

- Antimousse : L = S / 5 (à vérifier) ; bidons 5 ou 20 L.
- Hydrofuge incolore : L = S / 3, 2 passes frais sur frais (à vérifier).

### 5.9 Pertes par défaut

| Famille | Perte | Statut |
| --- | --- | --- |
| Enduits poudre machine | 5 % | à vérifier |
| Enduits poudre main | 8 % | à vérifier |
| Isolant ITE (coupes) | 5 %, 10 % si nombreuses ouvertures | à vérifier |
| Finitions pâte | 10 % | fiche Baumit |
| Peintures | 5 % | à vérifier |
| Profilés, treillis | 5 % + recouvrements | à vérifier |

### 5.10 Exemple au format regles.json

```json
{
  "regles": [
    {
      "id": "ite_pse_enduit_mince",
      "declencheur": {"ouvrage": "ite_enduit_mince", "mesure": "surface_m2"},
      "entrees": ["surface_m2", "epaisseur_mm", "type_pse", "ml_pied", "ml_angles", "ml_tableaux", "ml_linteaux", "nb_ouvertures", "chevilles_m2"],
      "etapes": [
        "plaques = ceil(surface_m2 * 1.05 / 0.72)",
        "colis = ceil(plaques / plaques_par_colis(epaisseur_mm))",
        "mortier_kg = surface_m2 * (3.5 + 7.5) * 1.05",
        "chevilles = surface_m2 * chevilles_m2 + ml_angles * 4",
        "longueur_cheville = catalogue_sup(epaisseur_mm + 10 + 50)",
        "treillis_m2 = surface_m2 * 1.1 + 0.06 * nb_ouvertures + ml_pied * 1.5",
        "finition_kg = surface_m2 * 2.5 * 1.10"
      ],
      "sorties": [
        {"materiau": "pse_*", "quantite": "colis", "unite": "colis", "param": "plaques"},
        {"materiau": "mortier_ite_*", "quantite": "ceil(mortier_kg / 25)", "unite": "sac"},
        {"materiau": "cheville_ite_*", "quantite": "ceil(chevilles * 1.05 / 100)", "unite": "boite", "param": "longueur_cheville"},
        {"materiau": "treillis_verre_ite", "quantite": "ceil(treillis_m2 / 50)", "unite": "rouleau"},
        {"materiau": "rail_depart_ite", "quantite": "ceil(ml_pied * 1.05 / 2.5)", "unite": "barre", "param": "largeur = epaisseur_mm"},
        {"materiau": "corniere_angle_ite", "quantite": "ceil((ml_angles + ml_tableaux) * 1.05 / 2.5)", "unite": "barre"},
        {"materiau": "profile_goutte_eau_ite", "quantite": "ceil(ml_linteaux * 1.05 / 2.5)", "unite": "barre"},
        {"materiau": "finition_*", "quantite": "ceil(finition_kg / 25)", "unite": "seau"}
      ],
      "hypotheses_a_afficher": ["epaisseur_mm", "chevilles_m2", "plaques_par_colis", "calage_kg_m2"]
    },
    {
      "id": "monocouche",
      "declencheur": {"ouvrage": "enduit_monocouche", "mesure": "surface_m2"},
      "entrees": ["surface_m2", "support", "finition", "mode_application", "ml_tableaux"],
      "etapes": [
        "conso = table_monocouche(support, finition)",
        "kg = (surface_m2 + ml_tableaux * 0.20) * conso",
        "perte = 0.05 if mode_application == 'machine' else 0.08"
      ],
      "sorties": [
        {"materiau": "monocouche_*", "quantite": "ceil(kg * (1 + perte) / 25)", "unite": "sac"}
      ],
      "hypotheses_a_afficher": ["conso", "perte"]
    }
  ]
}
```

## 6. Valeurs par défaut et hypothèses à afficher

Quand le devis ne dit rien, le moteur prend la valeur ci-dessous et l'affiche en clair sous le quantitatif (« Hypothèse : finition grattée »), modifiable d'un tap. Jamais de question chiffrée à l'artisan.

| Paramètre | Défaut | Indexé sur l'axe | Phrase affichée |
| --- | --- | --- | --- |
| support | maçonnerie parpaing/brique si construction > 1980 ; pierre/moellon si mot « ancien », « longère », « pierre » ; béton si « banché », « immeuble » | époque | Support : maçonnerie de parpaings |
| finition\_monocouche | grattée | gamme | Finition grattée (la plus consommatrice) |
| mode\_application | machine (projection) | — | Application à la machine |
| ouvertures | non déduites (plein pour vide) | — | Surfaces plein pour vide |
| profondeur\_tableau\_m | 0,20 | époque (0,30 sur bâti ancien, à vérifier) | Tableaux 20 cm |
| epaisseurs\_chaux\_mm | gobetis 5 / corps 15 / finition 7 | époque | Enduit chaux 3 couches, 27 mm |
| type\_pse | gris graphité λ 0,031 | gamme | Isolant PSE gris |
| epaisseur\_ite\_mm | 140 (R ≈ 4,5) | neuf/réno | ITE 140 mm |
| plaques\_par\_colis | table 4.2 (3 en 140 mm) | — | Colis de 3 plaques |
| calage\_kg\_m2 | 3,5 | époque (4,5 sur support ancien irrégulier) | Calage 3,5 kg/m² |
| chevilles\_m2 | 7 (maison ≤ R+1, site normal) ; 10 littoral ou > R+2 ; 12 site exposé et > R+4 (à vérifier) | type bâtiment + géographie | 7 chevilles/m² + 4/ml d'angle |
| longueur\_cheville | épaisseur + 60 mm, longueur catalogue supérieure | — | Chevilles de 215 mm (pour 140 mm) |
| ml\_pied | périmètre lu dans le devis, sinon S / hauteur\_facade (défaut 5,5 m maison R+1, à vérifier) | type bâtiment | Pied de façade estimé à 40 ml |
| ml\_angles | 4 angles × hauteur façade | type bâtiment | 4 angles de 5,5 m |
| nb\_ouvertures | S / 12 (une ouverture pour 12 m², à vérifier) | — | Environ 8 ouvertures |
| ml\_tableaux | nb\_ouvertures × 4,5 ml (fenêtre 1,25 × 1,0, 3 côtés + appui, à vérifier) | — | 36 ml de tableaux |
| ml\_linteaux | nb\_ouvertures × 1,2 | — | 10 ml de linteaux |
| grain\_finition | 1,5 mm taloché | gamme | Finition talochée grain 1,5 |
| couches\_peinture | 2 | neuf/réno | Peinture 2 couches |
| rendement\_peinture | 7 m²/L/couche | époque (6 sur support très poreux) | Rendement 7 m²/L |
| classe\_impermeabilite | I2 si « fissures » sans classe ; I4 si « armé » ou « entoilage » | époque | Système I2 |
| perte | table 5.9 | — | Pertes 5 % |

Le moteur affiche au plus 5 hypothèses, classées par impact sur le résultat (chap. 7) ; les autres restent visibles en dépliant.

## 7. Questions à poser, avec sensibilité

Quatre questions principales, à boutons, posées seulement si le devis ne donne pas déjà la réponse, dans l'ordre de leur impact. Les questions facultatives ne sortent qu'en cas de doute réel (règle générale du moteur : mieux vaut une question que des corrections après).

| Ordre | Question (texte exact) | Boutons | Quand la poser | Sensibilité sur le quantitatif |
| --- | --- | --- | --- | --- |
| 1 | Le mur à enduire, c'est quoi ? | Parpaing / brique · Béton · Pierre ancienne · Déjà enduit | ouvrage enduit ou revêtement, support non nommé | ± 40 % sur les sacs de monocouche (27 vs 16 kg/m²) ; bascule monocouche ↔ chaux sur pierre |
| 2 | Quelle finition ? | Grattée · Talochée / rustique · Je ne sais pas | monocouche ou RPE sans finition dite | ± 13 % sur les sacs (27 vs 23,5 kg/m²) ; ± 35 % sur les seaux selon grain |
| 3 | Les fenêtres sont déduites du m² ? | Oui · Non · Je ne sais pas | toujours si ml de tableaux absents | ± 10 à 15 % sur tout le quantitatif ; Je ne sais pas = non déduites |
| 4 | Le bâtiment, c'est… | Maison · Petit immeuble (R+2/R+3) · Plus haut | ouvrage ITE, ou échafaudage à dimensionner | ± 40 % sur les chevilles (7 → 10-12/m²) ; ajoute bandes coupe-feu au-delà de R+2 (IT 249, à vérifier) |
| f1 | Tu projettes à la machine ? | Oui · Non | enduit poudre | ± 3 % (pertes 5 vs 8 %) |
| f2 | La maison est en bord de mer ou très exposée au vent ? | Oui · Non | ITE, si le code postal n'est pas déjà littoral | + 40 % de chevilles |
| f3 | La façade a des fissures ? | Non · Petites · Larges (> 1 mm) | peinture ou revêtement sur béton | change de produit : D2 → I2 → I4 (x 2 à x 4 en kg) |
| f4 | Tu veux les bacs de finition teintés par le fournisseur ? | Oui (teinte à préciser) · Non | finition pâte ou monocouche | 0 % en quantité, change la désignation |

```json
{
  "questions": [
    {"id": "support", "ordre": 1, "texte": "Le mur à enduire, c'est quoi ?", "boutons": ["parpaing_brique", "beton", "pierre_ancienne", "deja_enduit"], "si_absent_du_devis": true, "sensibilite_pct": 40},
    {"id": "finition", "ordre": 2, "texte": "Quelle finition ?", "boutons": ["grattee", "talochee_rustique", "ne_sait_pas"], "defaut_si_ne_sait_pas": "grattee", "sensibilite_pct": 13},
    {"id": "ouvertures_deduites", "ordre": 3, "texte": "Les fenêtres sont déduites du m² ?", "boutons": ["oui", "non", "ne_sait_pas"], "defaut_si_ne_sait_pas": "non", "sensibilite_pct": 12},
    {"id": "hauteur_batiment", "ordre": 4, "texte": "Le bâtiment, c'est…", "boutons": ["maison", "petit_immeuble", "plus_haut"], "si_ouvrage": ["ite_enduit_mince"], "sensibilite_pct": 40}
  ]
}
```

## 8. Matériaux dominants par région

La région sert surtout à deviner le support et à régler le chevillage ITE ; elle change peu les consommations. Tableau issu de la connaissance métier, entièrement à vérifier par un façadier de chaque région.

| Région | Bâti ancien dominant | Pavillon récent | Effet sur le moteur | Statut |
| --- | --- | --- | --- | --- |
| Bretagne | granit, moellon schiste, longères à pierre vue | parpaing + monocouche blanc/ton pierre | Si « longère » ou « pierre » : chaux + rejointoiement ; littoral (22, 29, 56) : chevilles x 10/m², antimousse quasi systématique | à vérifier |
| Normandie | brique, silex, colombages | parpaing + monocouche | Colombages : chaux uniquement, jamais monocouche | à vérifier |
| Hauts-de-France | brique apparente | brique ou parpaing enduit | Fréquent : nettoyage + rejointoiement + hydrofuge plutôt qu'enduit | à vérifier |
| Île-de-France | plâtre et plâtre-chaux (Paris), meulière | parpaing + monocouche, ITE en copropriété | Plâtre parisien : système I3/I4 obligatoire (fiche imperméabilité) ; immeubles : question 4 souvent « plus haut » | partiellement sourcé |
| Grand Est, Alsace | grès, colombages, enduits colorés | parpaing + monocouche | Teintes vives fréquentes : préciser la teinte au fournisseur | à vérifier |
| Auvergne-Rhône-Alpes | pisé, pierre volcanique | parpaing, béton | Pisé : enduit chaux ou terre, jamais ciment ; altitude : résistance au gel | à vérifier |
| Provence, Occitanie | moellon, enduits chaux ocres | parpaing, brique + monocouche | Teintes imposées par PLU, indice de luminance > 35 % conseillé au sud ; enduit chaux fréquent | à vérifier |
| Nouvelle-Aquitaine | pierre calcaire, galets (Landes) | parpaing + monocouche | Pierre calcaire : chaux ; côte : chevilles renforcées | à vérifier |
| Montagne (> 900 m) | pierre, bois | béton, parpaing | Gel : enduits CS III et ITE épaisseur plus forte (160-200 mm) | à vérifier |
| Corse | granit, schiste | béton | Vent fort : chevilles renforcées | à vérifier |

Le fichier commun `departements.json` (déjà prévu dans le référentiel couverture) donne la zone de vent ; le tiroir façade lit simplement : zone de vent 3-4 ou département littoral → chevilles\_m2 = 10.

## 9. Points singuliers et consommables

Ce sont les lignes que l'artisan oublie et que le négoce lui fait rappeler. Le moteur les ajoute automatiquement dès que l'ouvrage parent est détecté, chacune en unité de commande.

### 9.1 Points singuliers

| Point singulier | Ouvrage parent | Ce qui s'ajoute | Calcul | Statut |
| --- | --- | --- | --- | --- |
| Angle saillant de bâtiment | monocouche, ITE | baguette ou cornière d'angle | barres 2,5 m = ml × 1,05 / 2,5 | sourcé (format à vérifier) |
| Tableau de fenêtre | ITE | isolant mince 20-30 mm en retour + cornière | m² = ml\_tableaux × 0,20 ; plaques 1200 × 600 en 20 ou 30 mm | à vérifier |
| Linteau, sous-face | ITE | profilé goutte d'eau | barres 2,5 m | sourcé |
| Appui de fenêtre | ITE | rehausse ou appui alu rapporté, longueur = largeur fenêtre + 2 × épaisseur isolant | 1 par fenêtre, désignation avec longueur exacte | à vérifier |
| Pied de façade | ITE | rail de départ + treillis renforcé sur 1,5 m ; PSE ou XPS en partie enterrée | barres + m² de treillis | sourcé (hauteur à vérifier) |
| Raccord menuiserie | ITE, monocouche | profilé d'arrêt avec bande mousse (type APU) | barres = périmètre menuiseries / 2,5 | à vérifier |
| Joint de dilatation | ITE, monocouche | profilé de joint de dilatation | barres 2,5 m | à vérifier |
| Rive de toit, débord | ITE | profilé de rive ou couvertine alu | barres ou ml à la longueur | à vérifier |
| Descente d'eaux pluviales, coffret, lampe | ITE, ravalement | colliers déportés, plots de fixation | 1 plot par fixation (3 par descente, à vérifier) | à vérifier |
| Bande coupe-feu laine de roche | ITE PSE > R+2 | bande 200 mm par niveau | ml = périmètre × nb niveaux ; colis laine de roche | IT 249, à vérifier |
| Fissure | imperméabilité, ravalement | mastic acrylique ou bande | cartouches 310 ml | à vérifier |
| Soubassement enduit | monocouche | arrêt à 15 cm du sol ou monocouche enterrable | baguette d'arrêt barres 2,5 m | sourcé (DTU 26.1 via fiches) |

### 9.2 Consommables

| Consommable | Quand | Quantité par défaut | Unité |
| --- | --- | --- | --- |
| Film polyane de protection | tout ravalement | 1 rouleau 4 × 25 m pour 150 m² (à vérifier) | rouleau |
| Ruban adhésif de masquage extérieur | tout ravalement, peinture | 1 rouleau 50 m pour 4 fenêtres (à vérifier) | rouleau |
| Fixateur / primaire d'accrochage | support béton lisse ou ancien | 0,15-0,25 kg/m² (à vérifier) | bidon |
| Mousse PU expansive basse pression | ITE (joints entre plaques > 2 mm) | 1 aérosol pour 50 m² (à vérifier) | aérosol |
| Vis + chevilles de rail | ITE | 1 tous les 30 cm de rail | boîte de 100 |
| Mastic acrylique / MS | tour des menuiseries, fissures | 1 cartouche 310 ml pour 10 ml | cartouche |
| Antimousse | ravalement de façade ancienne | S / 5 L (à vérifier) | bidon 5 ou 20 L |

Échafaudage : ligne « location » séparée, en m² de façade × durée ; le moteur ne la chiffre pas en fourniture et la laisse modifiable.

## 10. Cas de test (format JSON)

Cinq cas calculés à la main avec les règles du chapitre 5 ; le moteur doit retomber exactement sur ces nombres. À remplacer progressivement par des devis réels anonymisés, quantitatif validé par un façadier.

```json
[
  {
    "id": "facade_t1_monocouche_neuf",
    "devis": "Enduit monocouche gratté ton pierre sur parpaings, 120 m² plein pour vide, 4 angles de 6 m",
    "reponses": {"support": "parpaing_brique", "finition": "grattee", "ouvertures_deduites": "non", "mode_application": "machine"},
    "attendu": [
      {"materiau": "monocouche_oc2_grain_fin", "quantite": 137, "unite": "sac", "calcul": "120 x 27 x 1.05 / 25 = 136.1"},
      {"materiau": "baguette_angle", "quantite": 11, "unite": "barre", "calcul": "24 x 1.05 / 2.5 = 10.1"}
    ]
  },
  {
    "id": "facade_t2_ite_pse_maison",
    "devis": "ITE PSE graphité 140 mm calé-chevillé, 100 m², finition talochée 1,5 ; pied 40 ml ; angles 24 ml ; tableaux 60 ml ; linteaux 10 ml ; 8 fenêtres",
    "reponses": {"hauteur_batiment": "maison"},
    "attendu": [
      {"materiau": "pse_graphite_ite", "quantite": 49, "unite": "colis", "param": "146 plaques 1200x600x140, colis de 3"},
      {"materiau": "mortier_ite_colle_sous_enduit", "quantite": 47, "unite": "sac", "calcul": "100 x 11 x 1.05 / 25 = 46.2"},
      {"materiau": "cheville_ite_frapper", "quantite": 9, "unite": "boite", "param": "boite de 100, longueur >= 200 mm", "calcul": "(700 + 96) x 1.05 / 100 = 8.4"},
      {"materiau": "treillis_verre_ite", "quantite": 4, "unite": "rouleau", "calcul": "(110 + 0.48 + 60) / 50 = 3.4"},
      {"materiau": "rail_depart_ite", "quantite": 17, "unite": "barre", "param": "largeur 140 mm, barre 2,5 m"},
      {"materiau": "corniere_angle_ite", "quantite": 36, "unite": "barre", "calcul": "(24 + 60) x 1.05 / 2.5 = 35.3"},
      {"materiau": "profile_goutte_eau_ite", "quantite": 5, "unite": "barre"},
      {"materiau": "finition_organique_taloche", "quantite": 11, "unite": "seau", "calcul": "100 x 2.5 x 1.10 / 25 = 11"}
    ]
  },
  {
    "id": "facade_t3_peinture_d2",
    "devis": "Peinture façade Pliolite D2, 2 couches, 150 m²",
    "reponses": {},
    "attendu": [
      {"materiau": "peinture_d2_pliolite", "quantite": 3, "unite": "seau", "param": "seau 15 L", "calcul": "150 x 2 / 7 x 1.05 = 45 L"}
    ]
  },
  {
    "id": "facade_t4_chaux_longere",
    "devis": "Longère en pierre : piquage et enduit chaux 3 couches, 80 m²",
    "reponses": {"support": "pierre_ancienne", "mode_application": "main"},
    "attendu": [
      {"materiau": "sous_enduit_chaux_restauration", "quantite": 106, "unite": "sac", "calcul": "80 x (5x1.6 + 15x1.5) x 1.08 / 25 = 105.4"},
      {"materiau": "finition_chaux", "quantite": 34, "unite": "sac", "calcul": "80 x 7 x 1.4 x 1.08 / 25 = 33.9"}
    ]
  },
  {
    "id": "facade_t5_impermeabilite_i4",
    "devis": "Revêtement d'imperméabilité I4 armé sur béton fissuré, 120 m²",
    "reponses": {},
    "attendu": [
      {"materiau": "impression_impermeabilite", "quantite": 21, "unite": "kg", "note": "convertir au conditionnement du système retenu", "calcul": "120 x 0.175"},
      {"materiau": "systeme_impermeabilite", "quantite": 8, "unite": "seau", "param": "seau 15 L, densité 1,3", "calcul": "120 x 1.2 / 1.3 = 110.8 L"},
      {"materiau": "armature_i4", "quantite": 3, "unite": "rouleau", "calcul": "120 x 1.1 / 50 = 2.6"}
    ]
  }
]
```

Cas t5 : la ligne impression reste en kg tant que le conditionnement de l'impression n'est pas sourcé (chap. 13) ; c'est la seule exception tolérée, signalée à l'artisan.

## 11. Ratios à faire valider par un façadier

Quinze points à relire avec un façadier en 30 minutes, cas de test à l'appui. Cocher quand c'est validé ou corrigé.

- [ ] Conso monocouche retenue au milieu de fourchette (27 gratté / 23,5 taloché sur maçonnerie) : conforme à ta pratique ?
- [ ] Pertes enduit 5 % machine / 8 % main
- [ ] Enduit chaux 3 couches : 5 / 15 / 7 mm, soit ≈ 40 kg/m²
- [ ] Rejointoiement pierre vue : 6 kg/m²
- [ ] Profondeur de tableau 0,20 m (0,30 sur bâti ancien)
- [ ] Estimations quand le devis est muet : 1 fenêtre pour 12 m², 4,5 ml de tableau par fenêtre, 1,2 ml de linteau
- [ ] ITE : calage 3,5 kg/m² + sous-enduit 7,5 kg/m² du même sac
- [ ] ITE : 7 chevilles/m² maison, 10 littoral ou > R+2, + 4 par ml d'angle
- [ ] Longueur de cheville = isolant + 60 mm
- [ ] Treillis : 1,1 m²/m² + mouchoirs + 1,5 m de renfort en pied
- [ ] Pertes isolant 5 % (10 % si beaucoup d'ouvertures)
- [ ] Peinture : 7 m²/L/couche, 2 couches
- [ ] Antimousse S / 5 L et hydrofuge S / 3 L
- [ ] Consommables : 1 polyane 4 × 25 m pour 150 m², 1 rouleau de masquage pour 4 fenêtres
- [ ] Questions : les 4 boutons du chap. 7 suffisent-ils, et dans cet ordre ?

## 12. Sources officielles

Pages ouvertes le 3 oct. 2026. Les DTU eux-mêmes sont payants (AFNOR / CSTB) : leurs règles sont reprises ici via les fiches fabricant qui les citent ; acheter NF DTU 26.1 et le CPT 3035 V3 reste l'étape 1 du plan.

| Source | Type | Utilisé pour |
| --- | --- | --- |
| [Fiche weber.pral F (Weber via Quéguiner)](https://www.queguiner.fr/external-media/sa-saint-gobain-weber-france/fiche/fiche-produit-weberpral-f.pdf) | fabricant | conso monocouche, palette |
| [weber.pral F (Sobemat)](https://www.sobemat.fr/produit/weber-pral-f-blanc-000-25kg-V0VCMDUwNTA2) | négoce | gratté vs taloché |
| [PRB Monorex GF / Tradirex (Chausson)](https://www.chausson.fr/media/article-document/271884) | fabricant | 1,3 et 1,6 kg/m²/mm, épaisseurs DTU 26.1 |
| [PRB Tradirex (Samse)](https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1382208.pdf) | fabricant | sous-enduit |
| [Thermocromex (Samse)](https://private.samse.fr/catalogueWs/Fiche_technique/Fiche_technique_1364922.pdf) | fabricant | épaisseurs monocouche, maxi 25 mm |
| [Parlumière Clair (Chausson)](https://www.chausson.fr/materiaux/produits-de-mise-en-oeuvre-sous-enduit-blanc-de-restauration-la-chaux-parlumiere-clair-parex-sac-de-9547-poids-p-672718-1) | négoce | sous-enduit chaux |
| [Parlumière Moyen (Chausson)](https://www.chausson.fr/materiaux/enduit-parement-chaux-grain-moyen-parexlanko-parlumiere-p-672720-10) | négoce | finition chaux, palette |
| [Parlumière Fin (Gedimat)](https://www.gedimat.fr/enduit-de-restauration-parlumiere-fin-o50-sac-de-25kg-parexlanko,1845399,14,89,10.htm) | négoce | finition chaux |
| [Enduit chaux Parexlanko (Mr Bricolage)](https://www.mr-bricolage.fr/enduit-de-facade-a-chaux-sable-25kg-parexlanko.html) | négoce | 14 kg/m²/cm |
| [weber.therm XM (fiche Gedimat)](https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000125213799.pdf) | fabricant | collage, sous-enduit |
| [weber.therm XM PSE calé-chevillé](https://www.ets-lherbier.com/wp-content/uploads/2018/04/webertherm-xm-polystyrene_cale-cheville.pdf) | fabricant | treillis, mode de calcul des chevilles |
| [Weber, choix des isolants ITE](https://www.fr.weber/choix-des-isolants-ite) | fabricant | PSE blanc/gris, formats |
| [PSE gris 120 mm (Point.P)](https://www.pointp.fr/p/platre-isolation-ite/panneau-polystyrene-graphite-lisse-1200x600mm-epaisseur-120mm-A3879888) | négoce | plaque, R, boîte de chevilles |
| [PSE gris 140 mm (CBA)](https://cba-materiaux.fr/p/platre-isolation/panneau-isolant-ite-pse-graphite-gris-1200x600-mm-ep-140-mm-r-A3879890) | négoce | plaque, poids |
| [PSE 140 mm (Elaustore)](https://www.elaustore.com/produit/polystyrene-expanse-graphite-0031-140-mm) | négoce | colis de 3, 0,30 m³ |
| [Cellomur Ultra (Hirsch)](https://hirschisolation.fr/produits/cellomur-ultra/) | fabricant | plaques par colis |
| [Kits ITE (prix-de-gros)](https://prix-de-gros.com/fr/p/kit-complet-ite-pse-blanc-150-m-140-mm/r/ki150b140) | négoce | treillis 50 m², 1,1 m²/m² |
| [Documentation ITE Tollens](https://www.tollens.com/content/download/16766/file/Documentation_technique_ITE_Tollens.pdf) | fabricant | 8/10/12 chevilles selon dépression |
| [Avis technique CSTB 7/18-1713](https://www.cstb.fr/pdf/atec/GS07-H/AH181713_V1.pdf) | organisme | 6 et 6,9 chevilles/m² minimum |
| [Edilteco, chevilles](https://www.edilteco.fr/fr/catalogue/ite/accessoires/chevilles-de-fixation) | fabricant | minimum 5 par plaque |
| [FFB, règles ITE 2026](https://www.ffbatiment.fr/actualites-batiment/actualite-bam/isolation-thermique-exterieure-enduit-isolant-regles-art-evoluent) | organisme | planéité 15 mm, 2 chevilles/plaque PSE gris |
| [FFB, bonnes pratiques calé-chevillé](https://www.ffbatiment.fr/techniques-batiment/enveloppe-du-batiment/isolation-exterieure/dossier-bam/les-bonnes-pratiques) | organisme | CPT 3035, densités 5/8/10/12 |
| [Batirama, fixé-calé](https://www.batirama.com/article/1571-isolation-thermique-par-l-exterieur-systeme-colle-fixe-cale-ou-par-rails.html) | presse pro | 4 chevilles/ml d'arête, rail tous les 30 cm |
| [webertene XL+ (fiche Chausson)](https://www.chausson.fr/media/article-document/223789) | fabricant | finition 2,5 kg/m², palette 24 |
| [PRB Révomur M (ITE-shop)](https://www.ite-shop.com/enduit-organique-structure-prb-revomur-m-25kg) | négoce | RPE 2,2-2,8 kg/m² |
| [Revlane+ (Chausson)](https://www.chausson.fr/materiaux/enduits-de-facade-enduit-de-parement-organique-revlane-ignifuge-taloche-fin-parex-9552-couleur-seau-de-9547-poids-p-652998-3) | négoce | RPE ignifugé |
| [Capatect Taloché T15 (Caparol)](https://www.caparol.fr/caparol_pim_import/caparol_fr/products/ti/253477/TI_Capatect_Taloch_T15_FR.pdf) | fabricant | RPE D3 |
| [Cristalite Taloché (Allios)](https://peintea.fr/wp-content/uploads/2018/12/CRISTALITE-TALOCHE.pdf) | fabricant | silicate |
| [Baumit finition grattée](https://media.hornbach.de/hb/technicaldatasheet/as.181008751.pdf) | fabricant | conso par grain, +10 % |
| [Tollens Hydro Façade](https://www.tollens.com/download/fiche_technique/TGP_TOPRFH/1/TOLPRO+HYDRO+Fa%C3%A7ade+Hydro+PLIOLITE%C2%AE-fiche_technique.pdf) | fabricant | 9 m²/L/couche |
| [Artilite Pliolite (Batiproduits)](https://www.batiproduits.com/fiche/produits/peinture-mate-antimoisissures-a-base-de-resine-p-p68898763.html) | fabricant | 7-11 m²/L, seau 15 L |
| [Pliolite fiche 1517 (Gedimat)](https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000128842606.pdf) | fabricant | 6-8 m²/L |
| [PRB Color Impermat](https://pim.prb.fr/PRB/Fiches%20Techniques/en/ft_prb_color_impermat_en_30_11_2023.pdf) | fabricant | grammages I1-I4 |
| [PPG Pantiflex, classes I1-I4](https://dam-cdn.ppg.com/adaptivemedia/rendition?id=d058edb3226c4a5b44de9459df8dadf055c614c9) | fabricant | fissures 0,5 / 1 / 2 mm |
| NF DTU 26.1, NF DTU 42.1, NF DTU 59.1, CPT CSTB 3035 V3, IT 249 | normes | à acheter / lire en texte intégral |

## 13. Plan de complétion

Le tiroir est utilisable en bêta pour monocouche, ITE PSE, RPE et peinture ; il reste six trous, par ordre d'impact.

1. Faire relire le chapitre 11 par un façadier, avec les 5 cas de test ; corriger les ratios.
2. Sourcer les formats négoce manquants : longueur des barres de profilés (2 ou 2,5 m), colis PSE blanc par épaisseur, rouleau d'armature I4, conditionnement des impressions.
3. Ajouter la laine de roche ITE (Rockwool, Knauf) : formats, colis, chevilles à cœur.
4. Lire le texte intégral NF DTU 26.1 (épaisseurs du 3 couches) et CPT 3035 V3 (chevillage par zone de vent et hauteur), puis remplacer les « à vérifier » concernés.
5. Ajouter fibre de bois et ITE sur rails si un artisan en demande.
6. Remplacer les cas de test théoriques par 10 devis réels de façadiers, quantitatif validé.

Note technique pour Claude Code : arrondir le résultat à 0,01 avant `ceil` (cas t3 : 45,000001 L ne doit pas donner 4 seaux).

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 3 oct. 2026 | 1.0.0 | Création du tiroir façade au format section 27 : 10 ouvrages, 30 matériaux dont 24 sourcés, règles monocouche / chaux / ITE PSE / RPE / peinture / I1-I4, 4 questions, 5 cas de test. Maturité bêta, ratios à faire valider. |
