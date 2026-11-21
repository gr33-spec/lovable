# Référentiel quantitatif PEINTRE (Rappidos)

Oct 3, 2026 · @Greg

## 1. Métier et axes de variation

Le peintre est piloté d'abord par la gamme du produit (rendement 6 à 12 m²/L selon la fiche) et par l'état du support (neuf ou rénovation), presque pas par la région. Ce document est la deuxième instance du gabarit section 27 du référentiel couverture : il se charge comme un tiroir `referentiels/peinture/`, aucun mot de métier dans le moteur.

**Périmètre** : peinture intérieure murs et plafonds, boiseries et métaux (laques), préparation (lessivage, rebouchage, enduits de lissage), revêtements muraux (toile de verre, intissé à peindre, papier peint), peinture de façade D2 et revêtements d'imperméabilité I1-I4 en ravalement. Hors périmètre : sols résine (DTU 59.3), ITE (règles pro ETICS), plâtrerie (métier plâtrerie).

### 1.1 Fiche d'identité `metier.json`

```json
{
  "code": "peinture",
  "nom": "Peinture - revêtements muraux - ravalement",
  "version": "1.0.0-beta",
  "normes": ["NF DTU 59.1", "NF DTU 59.4", "NF DTU 42.1", "NF DTU 59.2", "NF T 36-005", "NF EN 1062-1", "XP T 34-722"],
  "axes_de_variation": {
    "geographie": "faible",
    "epoque_bati": "moyen",
    "type_batiment": "faible",
    "neuf_renovation": "fort",
    "gamme": "fort"
  },
  "metiers_lies": ["platrerie", "facade", "menuiserie"],
  "unites_de_commande": ["pot L", "seau L", "sac kg", "seau kg", "rouleau", "cartouche", "bidon L", "boîte"],
  "maturite": "beta"
}
```

### 1.2 Poids de chaque axe

| Axe | Poids | Ce qu'il change dans le quantitatif | Résolu comment |
| --- | --- | --- | --- |
| neuf\_renovation | fort | Neuf : impression obligatoire sur fond brut. Rénovation : lessivage, rebouchage, parfois décollage, impression seulement si fond changé. Écart ±30 % sur le total produits. | Devis (mots « neuf », « dépose », « lessivage ») ; sinon question 2 |
| gamme | fort | Le rendement varie de 6 à 12 m²/L entre une peinture de mécanisation et une peinture haut de gamme : ±40 % de litres. | Marque / référence lue dans le devis ; sinon gamme négoce par défaut (6.1) |
| epoque\_bati | moyen | Avant 1949 : risque plomb (pas de ponçage à sec), plâtre ancien farinant (fixateur), papiers à décoller. Après 2000 : plaque de plâtre, juste impression. | Déduit de « ancien », « fixateur », « décollage » dans le devis ; sinon défaut « après 1975 » |
| type\_batiment | faible | ERP : classement feu des revêtements muraux (toile de verre B-s1,d0). Pièces humides : peinture satin ou spéciale. Change le produit, pas la quantité. | Devis (nom de pièce, « ERP ») |
| geographie | faible | Intérieur : nul. Façade uniquement : bord de mer et climat océanique → anti-mousse, résines Pliolite / siloxane ; Sud → peintures minérales et chaux plus fréquentes. | Adresse chantier → département ; littoral = liste commune `departements.json` |

Conséquence pour le moteur : sur un devis 100 % intérieur, aucune question de région n'est posée. Sur une ligne façade, la région est lue dans l'adresse, jamais demandée.

## 2. Règle d'or et unités de commande

Jamais un m² ni un litre « en vrac » sur le quantitatif : chaque ligne est un nombre de pots, seaux, sacs, rouleaux ou cartouches d'un conditionnement qui existe au comptoir. Le peintre commande « 3 × 15 L + 2 × 5 L de mat blanc », pas « 52 L ».

### 2.1 Unités de commande

| Famille | Unité de commande | Conditionnements courants négoce | Ne jamais sortir |
| --- | --- | --- | --- |
| Peinture murs/plafonds, impression | pot / seau (L) | 1 L, 5 L, 15 L ([Seigneurie Super G](https://www.seigneuriegauthier.com/peintures/peintures-interieures/peintures-murs-plafonds/super-g-blanc-15l), [Practi Prim](https://seigneurie.com/nos-produits/peintures-interieures/impressions/practi-prim-blanc-15l)) | m², litres non arrondis |
| Laque boiseries/métaux | pot (L) | 0,5 L, 1 L, 2 à 3 L, 10 L selon marque | m² de porte |
| Peinture façade D2 | seau (L) | 5 L, 10 L, 15 L ([Pancryl](https://seigneurie.com/nos-produits/facades/films-minces-d2/pancryl-blanc-1l), [Tol-Façade](https://www.tollens.com/download/fiche_technique/TBA_TOFAPL/1/Tol+Fa%C3%A7ade+PLIOLITE%C2%AE-fiche_technique.pdf)) | m² de façade |
| Enduit poudre | sac (kg) | 5, 15, 25 kg ([Toupret F](https://toupret.com/fr/enduit-professionnels/produit/enduits-de-lissage/toupret-f-enduit-de-finition)) | kg non arrondis |
| Enduit pâte | seau (kg) | 4, 10, 15, 25 kg ([Semin](https://www.kenzai.fr/enduits-a-joints-et-lissage/4643-enduit-2en1-garnissage-lissage-semin-seau-25kg.html)) | kg non arrondis |
| Toile de verre / intissé à peindre | rouleau | 1 × 25 m (25 m²), 1 × 50 m (50 m²) | m² |
| Papier peint | rouleau | 10,05 × 0,53 m (≈ 5,3 m²) ; intissé large 1,06 m | m² |
| Colle murale | seau (kg) | 5, 10, 15, 20 kg | kg non arrondis |
| Mastic acrylique | cartouche | 310 ml, carton de 12 *(carton à vérifier)* | ml de joint |
| Ruban de masquage | rouleau | 50 m | ml |
| Bâche / film de protection | rouleau | 4 × 25 m (100 m²) *(à vérifier)* | m² |
| Anti-mousse, fixateur, lessive | bidon (L) | 5 L, 20 L | m² |

### 2.2 Algorithme d'arrondi aux pots (commun à tous les liquides)

1. Litres nets = surface × couches ÷ rendement retenu, puis × (1 + perte).
2. Remplir avec le plus gros conditionnement de la référence (souvent 15 L).
3. Reste r : r ≤ 1 L → 1 pot de 1 L ; r ≤ 5 L → 1 pot de 5 L ; r ≤ 10 L → 2 pots de 5 L ; sinon 1 pot de 15 L de plus. Laques (2,5 L, 1 L, 0,5 L) : reste ≤ 0,5 L → 0,5 L ; ≤ 1 L → 1 L ; ≤ 2 L → 2 × 1 L ; sinon 2,5 L. Bidons (20 L, 5 L) : reste ≤ 5 L → 5 L ; ≤ 10 L → 2 × 5 L ; sinon 20 L. Les formats réels de chaque référence priment.
4. Une teinte machine (hors blanc) se commande en une seule fois, dans un seul lot de fabrication : afficher « même teinte, même commande » sur la ligne. *(Règle de chantier, pas de source DTU.)*
5. Les sacs et seaux d'enduit s'arrondissent toujours au sac supérieur ; si l'écart dépasse 60 % d'un sac, proposer le petit format (5 kg) à la place.

### 2.3 Ce que le moteur rend

Une ligne par produit et par teinte, ex. « Peinture mate blanc – 3 × 15 L + 2 × 5 L ». Sur la ligne, une hypothèse lisible en un tap : « 245 m² × 2 couches, 10 m²/L, +5 % ».

## 3. Ouvrages du métier, vocabulaire des devis, pièges

Douze ouvrages couvrent la quasi-totalité des devis de peintre ; chaque ligne de devis doit tomber dans l'un d'eux via `vocabulaire.json`, sinon elle est signalée « non reconnue » et jamais devinée.

### 3.1 Ouvrages (`ouvrages.json`)

| Code ouvrage | Ce que fait l'artisan | Unité du devis | Matériaux générés |
| --- | --- | --- | --- |
| PREP\_LESSIVAGE | Lessiver, rincer les fonds peints | m² | lessive (bidon) |
| PREP\_DECOLLAGE | Décoller papier ou toile | m² | décolleuse (location, hors commande), produit décollant (bidon) |
| PREP\_REBOUCHAGE | Reboucher trous et fissures, ponctuel | m² ou forfait | enduit de rebouchage (sac), bande à fissure (rouleau) |
| PREP\_ENDUIT\_LISSAGE | Ratissage / lissage, 1 ou 2 passes | m² | enduit poudre (sac) ou pâte (seau), abrasif |
| PREP\_ENDUIT\_GARNISSANT | Garnir en épaisseur (toile de verre, crépi, gouttelette) | m² | enduit garnissant (sac/seau) |
| PEINT\_INT\_MUR\_PLAFOND | Impression + finitions murs et plafonds | m² | impression (seau), finition (seau) |
| PEINT\_BOISERIE | Portes, huisseries, plinthes, fenêtres bois | u, ml, m² | impression bois (pot), laque (pot) |
| PEINT\_METAL | Radiateurs, garde-corps, tuyaux | u, ml | primaire antirouille (pot), laque (pot) |
| REV\_TOILE\_VERRE | Pose toile de verre ou intissé à peindre + 2 couches | m² | toile (rouleau), colle (seau), peinture (seau) |
| REV\_PAPIER\_PEINT | Pose papier peint | m² ou nombre de rouleaux | papier (rouleau), colle (seau ou boîte) |
| FACADE\_D2 | Ravalement peinture film mince | m² | anti-mousse, fixateur, peinture façade (seau), mastic façade |
| FACADE\_IMPER | Revêtement d'imperméabilité I1 à I4 | m² | primaire, revêtement I (seau), armature si I4 |

### 3.2 Vocabulaire des devis → ouvrage (`vocabulaire.json`)

| Mots trouvés dans les devis | Ouvrage |
| --- | --- |
| impression, sous-couche, primaire, couche d'accrochage, fixateur | couche d'impression de l'ouvrage peinture concerné |
| ratissage, lissage, enduit repassé, enduisage, « enduit 2 passes », révision des fonds | PREP\_ENDUIT\_LISSAGE |
| égrenage, ponçage, dépoussiérage, époussetage | inclus (abrasif en consommable, 9) |
| rebouchage, rebouchage ponctuel, traitement des fissures, calicot | PREP\_REBOUCHAGE |
| mat, velours, velouté, satin, brillant, laque, glycéro, acrylique, alkyde | finition (aspect) |
| finition A / soignée / très soignée, B / courante, C / élémentaire / ordinaire | degré de finition DTU 59.1 |
| boiseries, huisseries, chambranles, plinthes, portes isoplanes, menuiseries | PEINT\_BOISERIE |
| radiateur, garde-corps, rampe, grille, tuyauterie, canalisations | PEINT\_METAL |
| toile de verre, fibre de verre, voile de verre, intissé à peindre, revêtement de rénovation | REV\_TOILE\_VERRE |
| papier peint, PP, tapisserie, lé, raccord | REV\_PAPIER\_PEINT |
| ravalement, peinture façade, D2, Pliolite, siloxane, film mince | FACADE\_D2 |
| imperméabilité, I1, I2, I3, I4, RSI, revêtement souple, hydrofuge de surface (D1, à part) | FACADE\_IMPER |
| démoussage, traitement anti-mousse, fongicide, nettoyage HP | préparation façade (ligne consommable) |

### 3.3 Pièges fréquents

1. **Forfait sans surface** (« peinture chambre 1 – forfait »). Ne jamais demander la surface : prendre la surface au sol si présente ailleurs dans le devis, sinon le défaut 6.2 (murs ≈ 4 × √S sol × HSP 2,50 m), afficher l'hypothèse, corrigeable d'un tap.
2. **m² « développé » vs m² « projeté »** pour radiateurs, volets, persiennes, garde-corps : le devis compte souvent au projeté. Appliquer les coefficients 9.1.
3. **Murs et plafonds sur une seule ligne** : séparer si le devis donne deux aspects (plafond mat, murs velours) ; sinon un seul produit.
4. **« 2 couches » mais neuf** : l'impression n'est pas toujours écrite ; sur fond neuf brut elle est due par le DTU 59.1, le moteur l'ajoute et l'affiche.
5. **« Monocouche »** sur le devis : 1 couche de finition seulement si le produit de la fiche est monocouche (ex. [Hermina](https://www.seigneuriegauthier.com/peintures-peintures-interieures-peintures-murs-plafonds-hermina-bas-carbone-blanc-15l) 6 à 8 m²/L en monocouche) ; sinon 2.
6. **Toile de verre** : la peinture sur toile consomme plus que sur plâtre lisse (coefficient 5.3) ; la toile est déjà « m² posés », ajouter les pertes 5.4.
7. **Teinte** : une teinte foncée ou vive peut exiger une couche de plus et une sous-couche teintée. Ne jamais supposer : question 3 si le devis dit « teinte au choix » ou une couleur foncée.
8. **Papier peint vendu au rouleau par le client** : si le devis dit « fourniture client », sortir seulement la colle.

## 4. Matériaux et fiches fabricant

Le rendement de la fiche technique est la donnée qui pèse le plus : il est transcrit tel quel, avec la valeur retenue par défaut (milieu de fourchette, côté prudent). Densités utiles pour le poids de livraison (kg = L × densité).

### 4.1 Peintures intérieures murs et plafonds

| Produit (fiche) | Type | Rendement fiche | Retenu | Conditionnement | Densité kg/L |
| --- | --- | --- | --- | --- | --- |
| [Seigneurie Pantex Mat](https://seigneurie.com/peintures-peintures-interieures-peintures-murs-plafonds-pantex-bas-carbone-mat-blanc-1l) | finition mat acrylique, finition A ou B | 9 à 12 m²/L/couche | 10 | 1 - 5 - 15 L | 1,49 |
| [Gauthier Super G Mat](https://www.seigneuriegauthier.com/peintures/peintures-interieures/peintures-murs-plafonds/super-g-blanc-15l) | finition mat haut de gamme, sans impression sur fond sain | 8 à 11 m²/L | 9,5 | 1 - 5 - 15 L ([fiche](https://pimmediastorage.blob.core.windows.net/pimprodmediasync/medias/docus/12/10200DF0157_12_all_Data%20sheet.pdf)) | 1,32 |
| [Seigneurie Hermina](https://www.seigneuriegauthier.com/peintures-peintures-interieures-peintures-murs-plafonds-hermina-bas-carbone-blanc-15l) | mat monocouche | mono 6 à 8 ; bicouche 8 à 12 m²/L | mono 7 / bi 10 | 5 - 15 L ([fiche](https://pimmediastorage.blob.core.windows.net/pimprodmediasync/medias/docus/12/12100DF0267_12_all_Data%20sheet.pdf)) | 1,44 |
| [Seigneurie Practi Mat Aéro](https://www.seigneuriegauthier.com/peintures-peintures-interieures-peintures-murs-plafonds-practi-mat-aero-blanc-15l) | mat grands chantiers, allégée | 8 à 9 m²/L | 8,5 | 15 L | 1,20 |
| [Seigneurie Practi Velours](https://www.seigneuriegauthier.com/peintures-peintures-interieures-peintures-murs-plafonds-practi-velours-blanc-5l) | velours, admis sur toile de verre | 8 à 10 m²/L | 9 | 5 - 15 L | *à vérifier* |
| [Seigneurie Practi Méca Mat](https://www.seigneuriegauthier.com/peintures/peintures-interieures/peintures-murs-plafonds/practi-meca-mat-blanc-15l) | mat airless | 6 à 7 m²/L | 6,5 | 15 L | 1,54 |

### 4.2 Impressions et sous-couches

| Produit (fiche) | Support | Rendement fiche | Retenu | Conditionnement | Densité |
| --- | --- | --- | --- | --- | --- |
| [Seigneurie Practi Prim](https://seigneurie.com/nos-produits/peintures-interieures/impressions/practi-prim-blanc-15l) | plâtre, plaque, murs/plafonds | 8 à 10 m²/L | 9 | 5 - 15 L | 1,40 |
| [Seigneurie Muroprim](https://seigneurie.com/peintures-peintures-interieures-impressions-muroprim-blanc-5l) | multi-supports dont boiseries | 8 à 10 m²/L | 9 | 5 - 15 L | 1,40 |

### 4.3 Laques boiseries et métaux

| Produit (fiche) | Type | Rendement fiche | Retenu | Conditionnement |
| --- | --- | --- | --- | --- |
| [Seigneurie Elyopur Laque Satin](https://www.seigneuriegauthier.com/product/362) | acrylique satin, murs et boiseries | 11 à 13 m²/L | 12 | 1 L … *(autres formats à vérifier)* |
| [Tollens Laque Boiseries Satin](https://www.tollens.com/download/fiche_technique/TGP_LAQSAT/1/Laque+Boiseries+Satin-fiche_technique.pdf) | acrylique PU satin | ≈ 14 m²/L | 12 | 0,5 - 2 L |
| [Comus Styl'Laque Satin](https://comus.fr/produit/styllaque-satin-laque-polyurethane-acrylique/) | PU-acrylique finition A | 12 à 16 m²/L | 12 | 1 - 3 - 10 L |
| [Trimetal Permacryl Satin](https://daiteo-media.s3.amazonaws.com/pu/1BB1CDF4/original/7b40da1c8f9b420c871ec4dde743763c.pdf) | acrylique int./ext. | 10 à 12 m²/L | 11 | *à vérifier* |
| Primaire antirouille (métal) | *fiche à saisir* | *à vérifier* (≈ 8 à 10 m²/L) | 8 | 0,5 - 2,5 L *(à vérifier)* |

### 4.4 Enduits

| Produit (fiche) | Usage | Consommation fiche | Retenu | Conditionnement |
| --- | --- | --- | --- | --- |
| [Toupret F](https://toupret.com/fr/enduit-professionnels/produit/enduits-de-lissage/toupret-f-enduit-de-finition) | lissage poudre, manuel | 300 g/m²/mm ; 25 kg = 60 à 75 m² par passe | 0,40 kg/m²/passe | sac 15 - 25 kg |
| [Toupret Extra'Liss](https://toupret.com/fr/enduit-particuliers/produit/lisser-en-finition/extraliss-poudre) | lissage poudre fin | 200 g/m²/mm | — | 1 - 5 - 15 kg |
| [Toupret Multifonction M](https://bo.toupret.com/storage/media/shares/FT_TOUPRET_ENDUIT_MULTIFONCTION_M_220_FR.pdf) | rebouchage / égalisage | 1,2 kg/m²/mm (rebouchage) ; 1 kg/m²/mm (égalisage) | 1,2 | sac 5 - 15 kg |
| [Toupret G](https://toupret.com/fr/enduit-particuliers/produit/lisser-en-epaisseur/enduit-pour-garnir-g-poudre) | garnissant poudre | 1 000 g/m²/mm ; 25 kg = 23 m² | 1,1 kg/m² | sac 5 - 15 - 25 kg |
| [Semin 2 en 1 G&L](https://www.kenzai.fr/enduits-a-joints-et-lissage/4643-enduit-2en1-garnissage-lissage-semin-seau-25kg.html) | pâte airless garnissage + lissage | 0,8 à 1,2 kg/m²/couche ; densité 1,73 | 1,0 kg/m²/couche | seau 10 - 25 kg ; sac 25 kg ; palette 22 seaux ([Krenobat](https://krenobat.fr/Enduit-2-en-1-Garnissage-Lissage-palette-22-seaux-25-kg-SEMIN-3701414403728--0178349.html)) |
| [Semin Lissage Pâte](https://www.batiproduits.com/amp/fiche/produits/enduit-pate-pour-finition-interieure-semin-lis-p246259030.html) | lissage pâte manuel | 250 à 400 g/m² | 0,35 kg/m²/passe | seau 1,5 - 4 - 10 - 15 kg |

### 4.5 Revêtements muraux et colles

| Produit | Format | Consommation | Retenu |
| --- | --- | --- | --- |
| Toile de verre à peindre ([formats](https://www.brikadeco.com/toile-de-verre/)) | rouleau 1 × 25 m ou 1 × 50 m ; grammage 100 à 200 g/m² | — | rouleau 50 m² en pro |
| Colle toile de verre prête à l'emploi ([Zolpan Quelyd TDV](https://www.zolpan.fr/download/fiche_technique/zol_quelyd_tdv/1/QUELYD+Tdv-fiche_technique.pdf), [Tollens chantier](https://www.tollens.com/download/fiche_technique/tol_artiscollemuraletdvchantier/1/Colle+toile+de+verre+chantier-fiche_technique.pdf)) | seau 5 - 10 - 15 - 20 kg | 150 à 250 g/m² ; 250 à 400 g/m² pour toiles lourdes ([fiche Agir](https://maisonpeinture.fr/wp-content/uploads/2020/09/FT_AGIR_Colle-MUR.pdf)) | 0,22 kg/m² ; 0,30 si > 150 g/m² |
| Papier peint standard ([exemple fiche](https://www.leroymerlin.fr/produits/papier-peint-intisse-vintage-gris-84709436.html)) | rouleau 10,05 × 0,53 m ≈ 5,3 m² ; ≈ 1,3 kg | calcul par lés (5.5) | — |
| Colle papier peint intissé | seau prêt à l'emploi ou boîte poudre | *à vérifier par fiche* (≈ 0,2 kg/m² prêt à l'emploi) | 0,20 kg/m² |

### 4.6 Façade

| Produit (fiche) | Classe | Rendement fiche | Retenu | Conditionnement | Densité |
| --- | --- | --- | --- | --- | --- |
| [Seigneurie Pancryl](https://seigneurie.com/nos-produits/facades/films-minces-d2/pancryl-blanc-1l) | D2 Pliolite solvant | 6 à 9 m²/L, majoration selon relief | 7 | 1 - 5 - 15 L | 1,60 |
| [Seigneurie Pancrytex D2 Aéro](https://www.seigneuriegauthier.com/peintures-facades-films-minces-d2-pancrytex-d2-aero-base-set1-15l) | D2 Hydro Pliolite | 6 à 8 m²/L | 7 | 15 L | 0,99 |
| [Tollens Tol-Façade Pliolite](https://www.tollens.com/download/fiche_technique/TBA_TOFAPL/1/Tol+Fa%C3%A7ade+PLIOLITE%C2%AE-fiche_technique.pdf) | D2 | 8 m²/L | 7 | 5 - 15 L | 1,50 |
| Revêtement I1 à I4 | NF DTU 42.1 | *par fiche système, à saisir* | — | seau 15 - 25 kg *(à vérifier)* | — |
| Anti-mousse / fongicide | — | *à vérifier* (≈ 4 à 5 m²/L) | 4 m²/L | bidon 5 - 20 L | ≈ 1 |

Règle : le conditionnement de `materiaux.json` vient de la fiche du négoce qui livre (Comptoir Seigneurie, Tollens, Zolpan, Point.P, Gedimat), pas du site grand public.

## 5. Règles de calcul (DTU 59.1, 59.4, 42.1)

Toutes les quantités sortent de cinq formules pures ; seuls les paramètres (couches, rendement, coefficient support, perte) changent d'un ouvrage à l'autre, et ils vivent dans `regles.json` et `defauts.json`.

### 5.1 Degrés de finition NF DTU 59.1

Le NF DTU 59.1 définit trois degrés : A (soigné), B (courant), C (élémentaire) ; ils fixent les travaux préparatoires et le nombre de couches ([Batiactu](https://produits.batiactu.com/publi/le-dtu-59.1-explique-pour-vos-travaux-de-batiment--452-194844.php), [Monsieur Peinture](https://www.monsieurpeinture.com/dtu-peinture-normes-finition/)). Les sites secondaires se contredisent sur le contenu exact de chaque degré : la table ci-dessous est la valeur par défaut de l'app, **à vérifier sur le texte AFNOR du NF DTU 59.1 (P1-1) et par un peintre**.

| Fond × degré | Impression | Enduit (passes) | Couches de finition |
| --- | --- | --- | --- |
| Neuf brut (plâtre, plaque, béton), A | 1 | 1 générale + 1 révision | 2 |
| Neuf brut, B | 1 | révision (ponctuel) | 2 |
| Neuf brut, C | 1 | aucun | 2 *(certaines sources : 1, à vérifier)* |
| Rénovation fond peint sain, A | 1 | 1 générale + 1 révision | 2 |
| Rénovation fond peint sain, B | 0 (1 si changement glycéro → acrylique, taches, fond farinant) | révision | 2 |
| Rénovation fond peint sain, C | 0 | rebouchage | 2 |
| Rénovation fond abîmé ou ancien, A | 1 | 1 garnissante + 1 générale | 2 |
| Rénovation fond abîmé ou ancien, B | 1 | 1 générale | 2 |
| Rénovation fond abîmé ou ancien, C | 1 | rebouchage + révision | 2 |
| Métaux ferreux extérieur | primaire antirouille | — | 2 ; le degré C n'existe pas sur métaux ferreux ([Batiactu](https://produits.batiactu.com/publi/le-dtu-59.1-explique-pour-vos-travaux-de-batiment--452-194844.php)) |

Degré absent du devis : B par défaut en logement *(source secondaire [chantiers-facile](https://chantiers-facile.fr/normes-dtu/dtu-59-1), à vérifier)*.

### 5.2 Formule 1 – produits liquides (impression, peinture, laque, façade, anti-mousse)

```latex
L = \frac{S \times n}{R \times k_{support}} \times (1 + p)
```

S = surface en m² (développée pour les points singuliers, 9.1) ; n = nombre de couches (5.1) ; R = rendement retenu de la fiche (4) ; k\_support = coefficient de support (5.3) ; p = perte (5.3). Puis arrondi aux pots (2.2).

### 5.3 Coefficients et pertes

| Paramètre | Valeur | Statut |
| --- | --- | --- |
| k plâtre, enduit lisse, fond peint lisse | 1,00 | référence fiche |
| k plaque de plâtre brute (impression seulement) | 0,90 | à vérifier |
| k béton brut, parpaing enduit fin | 0,85 | à vérifier |
| k toile de verre / intissé à peindre (1re couche) | 0,75 | à vérifier |
| k façade enduit gratté ou taloché | 0,85 | à vérifier (Pancryl : « majoration à déterminer sur chantier ») |
| k façade crépi, RPE, gouttelette | 0,70 | à vérifier |
| k teinte foncée ou vive (index de luminance < 35) | +1 couche de finition | à vérifier |
| p rouleau / brosse | 5 % | à vérifier |
| p airless (pistolet) | 20 % | à vérifier |
| p laque (petits pots, fonds de pot) | 10 % | à vérifier |
| p enduit | 10 % | à vérifier |
| p toile de verre (lés, coupes) | 10 % | à vérifier |
| p colle | 10 % | à vérifier |

### 5.4 Formule 2 – enduits et colles (kg)

```latex
kg = S \times c \times passes \times (1 + p)
```

c = consommation par passe retenue : lissage poudre 0,40 ; lissage pâte 0,35 ; garnissant 1,0 à 1,1 ; révision 0,15 ; rebouchage ponctuel 0,05 kg/m² *(révision et rebouchage : à vérifier)*. Colle toile de verre 0,22 (0,30 si toile > 150 g/m²). Arrondi au sac / seau supérieur (2.2, règle 5).

### 5.5 Formule 3 – papier peint (DTU 59.4)

```latex
l\acute{e}s = \left\lceil \frac{P}{0{,}53} \right\rceil \qquad l\acute{e}s\_par\_rouleau = \left\lfloor \frac{10{,}05}{H + 0{,}10 + r} \right\rfloor \qquad rouleaux = \left\lceil \frac{l\acute{e}s}{l\acute{e}s\_par\_rouleau} \right\rceil
```

P = périmètre des murs tapissés (m), H = hauteur (m), r = raccord du motif (m, 0 si uni), 0,10 m de marge de coupe ([méthode courante](https://info.fr/comment-calculer-le-nombre-de-rouleaux-de-papier-peint/)). Si le devis ne donne que des m² : P = S ÷ H. Ajouter 1 rouleau si raccord > 0 *(à vérifier)*. Exemple : H 2,50, raccord 0,32 → 10,05 ÷ 2,92 = 3 lés par rouleau.

### 5.6 Formule 4 – toile de verre

```latex
rouleaux = \left\lceil \frac{S \times 1{,}10}{surface\_rouleau} \right\rceil
```

Puis peinture sur toile : formule 1 avec n = 2 et k = 0,75 sur la 1re couche *(simplification moteur : k = 0,85 sur les 2 couches, à vérifier)*.

### 5.7 Formule 5 – façade

D2 : anti-mousse 1 passe (formule 1, R = 4 m²/L) + fixateur si fond farinant (formule 1, n = 1, R = 8 m²/L, *à vérifier*) + 2 couches de finition (formule 1). I1 à I4 : la classe est imposée par la largeur de fissure, I1 ≤ 0,2 mm, I2 ≤ 0,5 mm, I3 ≤ 1 mm, I4 ≤ 2 mm ([NF DTU 42.1](https://progineer.fr/workspace/regulation/dtu-42-1/), [Le Moniteur](https://www.lemoniteur.fr/photo/peintures-les-facades-a-l-epreuve-du-temps.2099004)) ; les consommations par couche viennent obligatoirement de la fiche système du fabricant (DTU 42.1 P1-2 : la classe se distingue aussi par la consommation). Tant qu'aucune fiche I n'est saisie, l'app sort la ligne « revêtement I\_ – quantité à confirmer par le négoce » et ne calcule pas.

## 6. Valeurs par défaut et hypothèses à afficher

Chaque défaut utilisé est affiché sur la carte quantitatif en une ligne, modifiable d'un tap ; un défaut n'est jamais silencieux. Ordre de surcharge (27.1) : référentiel → habitudes de l'artisan → chantier.

### 6.1 Défauts produits (`defauts.json`)

| Paramètre | Défaut | Texte affiché à l'artisan |
| --- | --- | --- |
| Degré de finition | B | « Finition B (courante) » |
| Fond | rénovation fond peint sain | « Murs déjà peints, en bon état » |
| Finition plafond | mat blanc, R = 10 m²/L, 15 L | « Plafond mat blanc, 10 m²/L » |
| Finition murs pièces sèches | mat blanc, R = 10 m²/L | « Murs mat, 10 m²/L » |
| Finition murs pièces humides | satin acrylique, R = 12 m²/L | « Salle de bain / cuisine en satin » |
| Impression | acrylique, R = 9 m²/L, 15 L | « Sous-couche 9 m²/L » |
| Boiseries | impression + 2 laque satin acrylique, R = 12 m²/L | « Portes et plinthes en laque satin » |
| Métaux | primaire antirouille + 2 laque, R = 8 / 12 m²/L | « Radiateurs : antirouille + 2 couches » |
| Teinte | blanc | « Blanc » ; teinte → ligne « teinte : même lot » |
| Application | rouleau (p = 5 %) | « Au rouleau » ; airless si le devis le dit |
| Enduit | poudre de lissage, sac 15 kg | « Enduit poudre en sacs de 15 kg » |
| Toile de verre | rouleau 50 m², 130 g/m² *(à vérifier)* | « Toile de verre 50 m² » |
| Papier peint | uni, sans raccord, 10,05 × 0,53 | « Papier sans raccord » |
| Façade | D2 Pliolite, 2 couches, R = 7, k = 0,85, anti-mousse 1 passe | « Façade : 2 couches + démoussage » |
| Époque du bâti | après 1975 | rien affiché sauf ligne « ancien » dans le devis |

### 6.2 Défauts de géométrie (seulement si le devis n'a pas la surface)

| Donnée manquante | Défaut | Statut |
| --- | --- | --- |
| Hauteur sous plafond | 2,50 m | à vérifier |
| Surface murs d'une pièce connue par sa surface au sol S | 4 × √S × 2,50 − 2 m² par porte ou fenêtre | à vérifier |
| Surface plafond | = surface au sol | sûr |
| Pièce sans aucune surface (« forfait chambre ») | chambre 12 m² sol, séjour 25 m², SDB 5 m², cuisine 9 m², couloir 6 m² | à vérifier |

Ces défauts de géométrie s'affichent en orange « surface estimée » : l'artisan peut taper la vraie valeur ou la dicter, mais l'app ne la lui demande jamais en question.

### 6.3 Habitudes apprises (niveau artisan)

À chaque correction de l'artisan, le moteur propose de retenir : sa marque et sa gamme habituelles (donc son rendement), son conditionnement préféré (5 L ou 15 L), le passage airless, ses passes d'enduit par degré. Exemple : un peintre qui corrige trois fois la peinture de 10 à 8 m²/L passe à 8 par défaut.

## 7. Questions à poser (`questions.json`)

Quatre questions au maximum, à boutons, posées seulement si le devis ne donne pas déjà la réponse, dans l'ordre de leur poids sur le résultat ; aucune ne porte sur une quantité. Sensibilité mesurée sur le cas test peint-001 (245 m² murs + plafonds).

| Ordre | Question (texte exact) | Boutons | Ce que ça change | Sensibilité | Posée si |
| --- | --- | --- | --- | --- | --- |
| 1 | « Les murs, ils sont comment ? » | Neufs (jamais peints) · Déjà peints, en bon état · Abîmés ou très anciens | impression 0 ou 1 couche ; enduit révision → 1 passe générale (+ garnissante) | peinture +55 % ; enduit +170 % ; total ±35 % | devis muet sur « neuf », « lessivage », « ratissage » |
| 2 | « Quelle finition tu vises ? » | Très soignée (A) · Normale (B) · Simple (C) | passes d'enduit (5.1) | enduit de 0,05 à 0,55 kg/m² (×10) ; peinture 0 % | degré A/B/C absent du devis |
| 3 | « La couleur des murs est foncée ou vive ? » | Oui · Non, blanc ou clair | +1 couche de finition, sous-couche teintée | peinture de finition +50 % | devis dit « teinte », « couleur au choix » ou une teinte foncée nommée |
| 4 | « Tu peins au rouleau ou à la machine ? » | Rouleau · Airless | perte 5 % → 20 % | peinture +14 % | devis ne dit pas « airless », « pistolet » ; et surface > 150 m² |

### 7.1 Questions de réserve (seulement en cas de doute réel, une ligne concernée)

Décision du 3 oct. 2026 (référentiel couverture) : l'IA peut poser plus de 4 questions si le doute est réel, toujours à boutons et classées par levier. Pour la peinture, trois questions de réserve :

| Question | Boutons | Sensibilité | Posée si |
| --- | --- | --- | --- |
| « Quelle marque tu prends d'habitude ? » | Seigneurie · Tollens · Zolpan · Autre / pas de préférence | rendement 6,5 à 12 m²/L : ±25 % peinture | aucune marque dans le devis ni dans les habitudes artisan |
| « La façade a des fissures ? » | Non · Fines (cheveu) · Ouvertes | D2 → I1 / I2-I3 : change de produit et de système | ligne façade sans classe D2 / I |
| « Le papier peint a un motif à raccorder ? » | Non, uni · Oui, petit motif · Oui, grand motif | +0 / +1 / +2 rouleaux pour 10 *(à vérifier)* | ligne papier peint sans « uni » ni raccord |

Règle : une question déjà répondue par l'artisan sur ses trois derniers chantiers n'est plus posée ; sa réponse devient défaut niveau artisan (6.3).

## 8. Matériaux dominants par région

En intérieur, rien ne change d'une région à l'autre : mêmes peintures acryliques, mêmes enduits, mêmes conditionnements partout en France. La région ne joue que sur les façades, et sur le choix de produit plus que sur les quantités ; tout ce tableau est **à vérifier par des peintres locaux**, aucune source officielle ne le publie.

| Zone | Supports de façade fréquents | Produit dominant attendu | Effet sur le quantitatif |
| --- | --- | --- | --- |
| Bretagne, Normandie, littoral Atlantique et Manche | enduits ciment, granit et schiste (souvent non peints), menuiseries bois | D2 Pliolite ou Hydro Pliolite, siloxane ; anti-mousse systématique | ligne anti-mousse ajoutée par défaut ; teintes claires |
| Nord, Hauts-de-France, Alsace | brique (rarement peinte), enduits | D2, peintures minérales sur enduit ; hydrofuge D1 sur brique | façade brique : hydrofuge D1 au lieu de peinture si le devis dit « traitement » |
| Île-de-France | plâtre et chaux « type parisien », béton | D2 ou I1-I2 ; règles DTU 42.1 pour façades plâtre | question fissures fréquente |
| Sud-Est, Provence, Occitanie | enduits chaux, crépis, béton | peintures minérales, silicate, chaux, D3 (RPE) | k crépi 0,70 plus fréquent |
| Montagne (Alpes, Pyrénées, Massif central) | bois en bardage, pierre, enduits | lasures et saturateurs bois *(hors périmètre v1)*, D2 | ligne bois signalée « à compléter » |
| Outre-mer | béton, enduits, climat humide | D2 fongicide, I1 | anti-mousse / fongicide par défaut *(à vérifier)* |

Pour le moteur : `geographie` = « faible » ; seule la clé `littoral` de `commun/departements.json` déclenche automatiquement l'anti-mousse et une résine adaptée aux climats marins (Pancrytex est présenté par Seigneurie comme adapté aux climats agressifs, notamment marins : [Batiactu](https://www.batiactu.com/edito/solution-phase-aqueuse-facades-exposees-16398.php)).

## 9. Points singuliers et consommables

Les points singuliers sont comptés à la pièce ou au mètre dans les devis ; le moteur les convertit en m² développés (9.1) puis applique la formule 1. Les consommables sont ajoutés automatiquement en fin de liste, regroupés, désactivables en un tap.

### 9.1 Conversion en m² développés

Tous ces forfaits suivent la logique des coefficients de métré du peintre (surface réelle peinte / surface comptée) ; **aucune valeur n'a été trouvée dans une source officielle ouverte : tout le tableau est à vérifier par un peintre.**

| Élément (unité devis) | m² peints retenus | Produits |
| --- | --- | --- |
| Porte intérieure 2 faces + chants + huisserie (u) | 4,5 m² | impression bois + 2 laque |
| Porte seule 1 face (u) | 1,9 m² | idem |
| Huisserie / chambranle seul (u) | 1,0 m² | idem |
| Fenêtre bois 1 vantail, 2 faces (u) | 2,5 m² | impression + 2 laque |
| Porte-fenêtre bois 2 vantaux, 2 faces (u) | 5,0 m² | impression + 2 laque |
| Plinthe bois h ≤ 10 cm (ml) | 0,12 m²/ml | 2 laque (+ impression si brute) |
| Radiateur acier à panneaux (u, ou m² de face) | face × 2 ; défaut 1,2 m² | antirouille si rouille + 2 laque |
| Radiateur fonte à éléments (u) | face × 4 ; défaut 3 m² | idem |
| Tuyauterie Ø ≤ 50 mm (ml) | 0,15 m²/ml | 2 laque |
| Garde-corps barreaudé (ml) | ml × hauteur × 2 ; défaut h = 1 m | antirouille + 2 laque |
| Volet battant plein, 2 faces (u) | face × 2,2 | impression + 2 laque ou lasure |
| Volet persienne, 2 faces (u) | face × 3 | idem |
| Sous-face de débord de toit (m²) | × 1,0 (× 1,5 si chevrons apparents) | 2 couches façade ou laque |

### 9.2 Consommables (`regles.json`, bloc consommables)

| Consommable | Règle | Unité de commande | Statut |
| --- | --- | --- | --- |
| Ruban de masquage | 1 rouleau par pièce + 1 par tranche de 4 portes/fenêtres ; façade 1 / 20 m² | rouleau 50 m | à vérifier |
| Protection de sol (film ou bâche) | surface au sol × 1,10 | rouleau ≈ 100 m² | à vérifier |
| Mastic acrylique (angles, huisseries) | 1 cartouche par pièce ; 1 / 10 ml de joint si le devis le compte | cartouche 310 ml | à vérifier |
| Bande à fissure (calicot ou fibre) | rénovation fond abîmé : 1 rouleau / 50 m² | rouleau 20 à 90 m | à vérifier |
| Abrasif (ponçage enduit) | 1 abrasif / 5 m² enduit poncé | boîte de 50 | à vérifier |
| Lessive (fonds peints) | 1 kg / 40 m² *(selon fiche produit)* | boîte / sac | à vérifier |
| Mastic façade (fissures) | 1 cartouche / 20 m² de façade fissurée | cartouche 310 ml | à vérifier |
| Manchons, bacs, brosses | non commandés par défaut ; option « ajouter l'outillage » | u | décision produit |

### 9.3 Règles qui déclenchent ou interdisent

1. Ponçage à sec interdit sur peinture au plomb (bâti antérieur à 1949) : l'app affiche l'alerte et remplace l'abrasif par du décapant / ponçage humide *(alerte de sécurité, réglementation plomb à citer, à vérifier)*.
2. Métaux ferreux : un primaire antirouille est toujours ajouté si le devis dit « rouille », « antirouille » ou en extérieur ([Batiactu](https://produits.batiactu.com/publi/le-dtu-59.1-explique-pour-vos-travaux-de-batiment--452-194844.php)).
3. Pièces humides : jamais de mat de plafond classique en douche, satin ou peinture spéciale pièces humides.
4. Application interdite sous 8 °C et au-dessus de 65 à 70 % d'humidité relative (fiches Seigneurie) : alerte, pas d'effet sur les quantités.
5. Teinte de façade foncée (indice de luminance < 35) déconseillée sur supports exposés aux chocs thermiques ([fiche D2](https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000128842606.pdf)) : alerte.

## 10. Cas de test (`tests/`)

Cinq cas synthétiques, calculés à la main avec les formules et défauts de ce document ; ils servent de tests unitaires du moteur tant qu'aucun devis réel de peintre n'est disponible, puis seront remplacés par des devis réels anonymisés (13).

### 10.1 peint-001 – appartement en rénovation, finition B

Devis : murs 180 m² + plafonds 65 m² « peinture acrylique mate blanche 2 couches », 6 portes « laque satin 2 faces », 60 ml de plinthes, 5 pièces. Fond peint sain. Calcul : finition 245 × 2 ÷ 10 × 1,05 = 51,45 L ; enduit 245 × 0,15 × 1,10 = 40,4 kg ; laque (27 + 7,2 m²) × 2 ÷ 12 × 1,10 = 6,27 L.

```json
{
  "id": "peint-001",
  "source": "cas synthétique Rappidos, à remplacer par devis réel",
  "devis_pdf": "peint-001.pdf",
  "contexte": { "departement": "35", "fond": "renovation_sain", "finition": "B", "application": "rouleau", "teinte": "blanc" },
  "attendu": [
    { "article": "peinture mate blanche murs plafonds", "quantite": 3, "unite": "seau 15 L", "tolerance_pct": 0 },
    { "article": "peinture mate blanche murs plafonds", "quantite": 2, "unite": "pot 5 L", "tolerance_pct": 0 },
    { "article": "enduit de lissage poudre", "quantite": 3, "unite": "sac 15 kg", "tolerance_pct": 0 },
    { "article": "laque satin acrylique blanche", "quantite": 2, "unite": "pot 2,5 L", "tolerance_pct": 0 },
    { "article": "laque satin acrylique blanche", "quantite": 2, "unite": "pot 1 L", "tolerance_pct": 0 },
    { "article": "ruban de masquage", "quantite": 7, "unite": "rouleau 50 m", "tolerance_pct": 30 },
    { "article": "mastic acrylique", "quantite": 5, "unite": "cartouche 310 ml", "tolerance_pct": 30 }
  ],
  "questions_max": 4
}
```

### 10.2 peint-002 – maison neuve, plaques de plâtre, finition B

Devis : « impression + 2 couches mat » murs 230 m² + plafonds 90 m², 8 portes neuves laquées. Calcul : impression 320 ÷ (9 × 0,90) × 1,05 = 41,5 L ; finition 320 × 2 ÷ 10 × 1,05 = 67,2 L ; enduit 320 × 0,15 × 1,10 = 52,8 kg ; impression bois 36 ÷ 9 × 1,05 = 4,2 L ; laque 36 × 2 ÷ 12 × 1,10 = 6,6 L.

```json
{
  "id": "peint-002",
  "source": "cas synthétique Rappidos, à remplacer par devis réel",
  "devis_pdf": "peint-002.pdf",
  "contexte": { "departement": "22", "fond": "neuf_brut", "support": "plaque_platre", "finition": "B", "application": "rouleau" },
  "attendu": [
    { "article": "impression acrylique murs plafonds", "quantite": 3, "unite": "seau 15 L", "tolerance_pct": 0 },
    { "article": "peinture mate blanche", "quantite": 4, "unite": "seau 15 L", "tolerance_pct": 0 },
    { "article": "peinture mate blanche", "quantite": 2, "unite": "pot 5 L", "tolerance_pct": 0 },
    { "article": "enduit de lissage poudre", "quantite": 4, "unite": "sac 15 kg", "tolerance_pct": 0 },
    { "article": "impression boiseries", "quantite": 1, "unite": "pot 5 L", "tolerance_pct": 0 },
    { "article": "laque satin acrylique blanche", "quantite": 2, "unite": "pot 2,5 L", "tolerance_pct": 0 },
    { "article": "laque satin acrylique blanche", "quantite": 2, "unite": "pot 1 L", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

### 10.3 peint-003 – façade en bord de mer, D2

Devis : « ravalement façade 140 m², démoussage, 2 couches peinture Pliolite » sur enduit gratté, Paimpol. Calcul : anti-mousse 140 ÷ 4 × 1,05 = 36,75 L ; peinture 140 × 2 ÷ (7 × 0,85) × 1,05 = 49,4 L.

```json
{
  "id": "peint-003",
  "source": "cas synthétique Rappidos, à remplacer par devis réel",
  "devis_pdf": "peint-003.pdf",
  "contexte": { "departement": "22", "littoral": true, "support": "enduit_gratte", "classe": "D2" },
  "attendu": [
    { "article": "anti-mousse façade", "quantite": 2, "unite": "bidon 20 L", "tolerance_pct": 0 },
    { "article": "peinture façade D2 Pliolite", "quantite": 3, "unite": "seau 15 L", "tolerance_pct": 0 },
    { "article": "peinture façade D2 Pliolite", "quantite": 1, "unite": "pot 5 L", "tolerance_pct": 0 },
    { "article": "ruban de masquage", "quantite": 7, "unite": "rouleau 50 m", "tolerance_pct": 30 }
  ],
  "questions_max": 4
}
```

### 10.4 peint-004 – chambre en toile de verre

Devis : « toile de verre murs 38 m², 2 couches mat ; plafond 12 m² 2 couches mat ». Calcul : toile 38 × 1,10 = 41,8 m² ; colle 38 × 0,22 × 1,10 = 9,2 kg ; peinture 38 × 2 ÷ (10 × 0,85) × 1,05 + 12 × 2 ÷ 10 × 1,05 = 11,9 L.

```json
{
  "id": "peint-004",
  "source": "cas synthétique Rappidos, à remplacer par devis réel",
  "devis_pdf": "peint-004.pdf",
  "contexte": { "fond": "renovation_sain", "finition": "B" },
  "attendu": [
    { "article": "toile de verre à peindre", "quantite": 1, "unite": "rouleau 50 m²", "tolerance_pct": 0 },
    { "article": "colle toile de verre prête à l'emploi", "quantite": 1, "unite": "seau 10 kg", "tolerance_pct": 0 },
    { "article": "peinture mate blanche", "quantite": 1, "unite": "seau 15 L", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

### 10.5 peint-005 – papier peint uni

Devis : « pose papier peint intissé uni, chambre 14 ml de murs, HSP 2,50 m ». Calcul : lés = ⌈14 ÷ 0,53⌉ = 27 ; lés par rouleau = ⌊10,05 ÷ 2,60⌋ = 3 ; rouleaux = 9 ; colle 35 m² × 0,20 × 1,10 = 7,7 kg.

```json
{
  "id": "peint-005",
  "source": "cas synthétique Rappidos, à remplacer par devis réel",
  "devis_pdf": "peint-005.pdf",
  "contexte": { "hsp_m": 2.5, "raccord_m": 0 },
  "attendu": [
    { "article": "papier peint intissé 10,05 x 0,53", "quantite": 9, "unite": "rouleau", "tolerance_pct": 0 },
    { "article": "colle papier peint intissé", "quantite": 1, "unite": "seau 10 kg", "tolerance_pct": 0 }
  ],
  "questions_max": 4
}
```

## 11. Ratios à faire valider par un peintre (`ratios-a-valider.md`)

Vingt points à faire relire par un peintre en activité, classés par impact sur le quantitatif ; chaque réponse se reporte dans `regles.json` ou `defauts.json` avec la mention « validé par \[nom\], \[date\] ».

- [ ] 1\. Table finition × fond (5.1) : passes d'enduit et couches d'impression par degré A/B/C, à confronter au texte NF DTU 59.1 P1-1.
- [ ] 2\. Rendement retenu par défaut 10 m²/L pour un mat de chantier courant (fiches 8 à 12) : est-ce le rendement réel constaté ?
- [ ] 3\. Révision d'enduit 0,15 kg/m² et rebouchage 0,05 kg/m² (5.4).
- [ ] 4\. Lissage poudre 0,40 kg/m² par passe (Toupret F : 25 kg = 60 à 75 m²).
- [ ] 5\. Perte airless 20 % et rouleau 5 % (5.3).
- [ ] 6\. Coefficients support : plaque brute 0,90 ; béton 0,85 ; toile de verre 0,75 à 0,85 ; crépi 0,70.
- [ ] 7\. Couche supplémentaire pour teinte foncée ou vive : systématique ou selon produit ?
- [ ] 8\. Degré C en neuf : 1 ou 2 couches de finition ?
- [ ] 9\. Forfaits points singuliers (9.1) : porte 2 faces + huisserie 4,5 m² ; fenêtre 2,5 m² ; radiateur acier face × 2 ; fonte × 4 ; persienne × 3 ; plinthe 0,12 m²/ml.
- [ ] 10\. Défaut murs = 4 × √S sol × 2,50 − 2 m² par ouverture (6.2) et surfaces par type de pièce.
- [ ] 11\. Satin acrylique par défaut en pièces humides.
- [ ] 12\. Colle toile de verre 0,22 kg/m² (0,30 pour toiles lourdes) ; perte toile 10 %.
- [ ] 13\. Papier peint : + 1 rouleau dès qu'il y a un raccord ; + 2 pour grand motif ?
- [ ] 14\. Façade : anti-mousse 4 m²/L, 1 passe ; fixateur 8 m²/L.
- [ ] 15\. Façade : k enduit gratté 0,85 ; nombre de couches D2 = 2 (+ 1re diluée ?).
- [ ] 16\. Consommables (9.2) : ruban, mastic, protection, abrasif, lessive.
- [ ] 17\. Impression des boiseries déjà peintes en bon état : 0 couche (égrenage seul) ?
- [ ] 18\. Format préféré : seau 15 L ou pot 5 L sur petits chantiers (< 50 m²) ?
- [ ] 19\. Enduit poudre en sac 15 kg ou pâte en seau 25 kg par défaut (selon région, habitude) ?
- [ ] 20\. Liste des marques réellement achetées en négoce par les peintres de la cible (Seigneurie/Gauthier, Tollens, Zolpan, Sikkens, Unikalo, Guittet…).

## 12. Sources

Les textes NF DTU sont payants (AFNOR / CSTB) : aucun n'a été lu en intégralité, seules des présentations secondaires l'ont été ; tout chiffre DTU est donc marqué « à vérifier » tant que le texte officiel n'est pas consulté. Consulté le 3 oct. 2026.

| Source | Type | Utilisée pour |
| --- | --- | --- |
| [Batiactu – NF DTU 59.1 expliqué](https://produits.batiactu.com/publi/le-dtu-59.1-explique-pour-vos-travaux-de-batiment--452-194844.php) | presse technique | degrés A/B/C, métaux ferreux, domaine d'application |
| [Monsieur Peinture – DTU 59.1](https://www.monsieurpeinture.com/dtu-peinture-normes-finition/) | site métier | degrés A/B/C |
| [Chantiers-facile – DTU 59.1](https://chantiers-facile.fr/normes-dtu/dtu-59-1) | site secondaire | défaut B en logement *(non confirmé)* |
| [Cahiers Techniques du Bâtiment – DTU 42.1](https://www.cahiers-techniques-batiment.fr/article/travaux-sur-existant-ravalement-des-facades-avec-le-nouveau-dtu-42-1.20461) | presse technique | classes D et I, garanties |
| [Le Moniteur – façades](https://www.lemoniteur.fr/photo/peintures-les-facades-a-l-epreuve-du-temps.2099004) | presse technique | D1-D3, I1-I4 et ouvertures de fissure |
| [Progineer – NF DTU 42.1](https://progineer.fr/workspace/regulation/dtu-42-1/) | synthèse | domaine (façades en service), classes I |
| [Comus – guide façade](https://comus.fr/guide-facade/) | fabricant | épaisseurs D2 / D3 / I |
| [AFNOR – NF EN 12956](https://www.boutique.afnor.org/fr-fr/norme/nf-en-233/revetements-muraux-en-rouleaux-specifications-des-papiers-peints-finis-des-/fa033211/455226) | norme | revêtements muraux en rouleaux (remplace EN 233) |
| [Seigneurie Pantex Mat](https://seigneurie.com/peintures-peintures-interieures-peintures-murs-plafonds-pantex-bas-carbone-mat-blanc-1l) | fiche fabricant | rendement, formats, densité |
| [Gauthier Super G Mat (fiche PDF)](https://pimmediastorage.blob.core.windows.net/pimprodmediasync/medias/docus/12/10200DF0157_12_all_Data%20sheet.pdf) | fiche fabricant | rendement, formats |
| [Seigneurie Hermina (fiche PDF)](https://pimmediastorage.blob.core.windows.net/pimprodmediasync/medias/docus/12/12100DF0267_12_all_Data%20sheet.pdf) | fiche fabricant | monocouche / bicouche |
| [Seigneurie Practi Mat Aéro](https://www.seigneuriegauthier.com/peintures-peintures-interieures-peintures-murs-plafonds-practi-mat-aero-blanc-15l), [Practi Méca Mat](https://www.seigneuriegauthier.com/peintures/peintures-interieures/peintures-murs-plafonds/practi-meca-mat-blanc-15l), [Practi Velours](https://www.seigneuriegauthier.com/peintures-peintures-interieures-peintures-murs-plafonds-practi-velours-blanc-5l) | fiches fabricant | rendements gamme chantier |
| [Seigneurie Practi Prim](https://seigneurie.com/nos-produits/peintures-interieures/impressions/practi-prim-blanc-15l), [Muroprim](https://seigneurie.com/peintures-peintures-interieures-impressions-muroprim-blanc-5l) | fiches fabricant | impressions |
| [Elyopur Laque Satin](https://www.seigneuriegauthier.com/product/362), [Tollens Laque Satin](https://www.tollens.com/download/fiche_technique/TGP_LAQSAT/1/Laque+Boiseries+Satin-fiche_technique.pdf), [Comus Styl'Laque](https://comus.fr/produit/styllaque-satin-laque-polyurethane-acrylique/), [Trimetal Permacryl](https://daiteo-media.s3.amazonaws.com/pu/1BB1CDF4/original/7b40da1c8f9b420c871ec4dde743763c.pdf) | fiches fabricant | laques |
| [Pancryl](https://seigneurie.com/nos-produits/facades/films-minces-d2/pancryl-blanc-1l), [Pancrytex D2 Aéro](https://www.seigneuriegauthier.com/peintures-facades-films-minces-d2-pancrytex-d2-aero-base-set1-15l), [Tol-Façade Pliolite](https://www.tollens.com/download/fiche_technique/TBA_TOFAPL/1/Tol+Fa%C3%A7ade+PLIOLITE%C2%AE-fiche_technique.pdf), [fiche D2 Gedimat](https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000128842606.pdf) | fiches fabricant | façade D2 |
| [Toupret F](https://toupret.com/fr/enduit-professionnels/produit/enduits-de-lissage/toupret-f-enduit-de-finition), [Extra'Liss](https://toupret.com/fr/enduit-particuliers/produit/lisser-en-finition/extraliss-poudre), [G](https://toupret.com/fr/enduit-particuliers/produit/lisser-en-epaisseur/enduit-pour-garnir-g-poudre), [Multifonction M (PDF)](https://bo.toupret.com/storage/media/shares/FT_TOUPRET_ENDUIT_MULTIFONCTION_M_220_FR.pdf) | fiches fabricant | enduits poudre |
| [Semin 2 en 1 G&L](https://www.kenzai.fr/enduits-a-joints-et-lissage/4643-enduit-2en1-garnissage-lissage-semin-seau-25kg.html), [Semin Lissage Pâte](https://www.batiproduits.com/amp/fiche/produits/enduit-pate-pour-finition-interieure-semin-lis-p246259030.html) | négoce / fiche | enduits pâte |
| [Zolpan Quelyd TDV](https://www.zolpan.fr/download/fiche_technique/zol_quelyd_tdv/1/QUELYD+Tdv-fiche_technique.pdf), [Tollens colle chantier](https://www.tollens.com/download/fiche_technique/tol_artiscollemuraletdvchantier/1/Colle+toile+de+verre+chantier-fiche_technique.pdf), [Agir colle MUR](https://maisonpeinture.fr/wp-content/uploads/2020/09/FT_AGIR_Colle-MUR.pdf) | fiches fabricant | colles toile de verre |
| [Brikadeco – toile de verre](https://www.brikadeco.com/toile-de-verre/), [info.fr – papier peint](https://info.fr/comment-calculer-le-nombre-de-rouleaux-de-papier-peint/) | sites secondaires | formats de rouleaux, méthode des lés |

À obtenir en priorité : NF DTU 59.1 P1-1 (tableaux de travaux par support et par degré), NF DTU 59.4 P1-1, NF DTU 42.1 P1-2 (tableau 1 de choix des classes), fiches négoce Comptoir Seigneurie / Tollens Pro / Zolpan avec conditionnements et palettes.

## 13. Plan de complétion

Le référentiel est utilisable en bêta pour l'intérieur (murs, plafonds, boiseries, toile de verre, papier peint) ; la façade D2 est calculée, les classes I1-I4 et les bois extérieurs ne le sont pas encore. Ordre de travail, du plus rentable au moins rentable :

| Étape | Contenu | Qui | Débloque |
| --- | --- | --- | --- |
| 1 | Relecture des 20 ratios (11) par un peintre | Greg trouve un peintre partenaire | passage beta → v1 des défauts |
| 2 | 5 devis réels anonymisés + quantitatif attendu par le peintre | peintre partenaire | remplacement des cas synthétiques (10) |
| 3 | Achat et lecture NF DTU 59.1 P1-1 | Greg / Claude | table finition × fond (5.1) sourcée |
| 4 | Fiches négoce : formats réels, palettes, poids, pour 2 gammes par marque (Seigneurie, Tollens, Zolpan) | Claude | `materiaux.json` complet |
| 5 | Fiches systèmes I1 à I4 (primaire + couches + armature) | Claude | calcul FACADE\_IMPER |
| 6 | Lasures, saturateurs, vernis bois extérieur | Claude | bardages, volets bois en lasure |
| 7 | Peinture de sols (DTU 59.3) | plus tard | hors v1 |

## 14. CHANGELOG

| Date | Version | Changement |
| --- | --- | --- |
| 2026-10-03 | 1.0.0-beta | Création : 14 chapitres au format section 27 ; fiches Seigneurie, Gauthier, Tollens, Comus, Trimetal, Toupret, Semin, Zolpan transcrites ; 5 cas de test synthétiques ; 20 ratios à valider. |
