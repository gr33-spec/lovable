# Carte des régions : matériaux de couverture et zones par département

Recherche du 19 novembre 2026, données dans `regions.json` : 101 départements (96 métropolitains et 5 DROM). Statut des matériaux : 34 `confirme`, 55 `une_source`, 12 `a_confirmer` (avant le 19 novembre au soir : 16, 68, 17). Vent : 79 confirmés, les autres partagés entre plusieurs régions. Neige : 63 confirmés. **Les zones DTU sont calculées par commune** (`communes/`, 34 739 communes) ; la colonne DTU donne la plage des zones des communes du département.

**À lire avant d'utiliser la carte.** Le devis prime toujours : la carte ne fait qu'ordonner les boutons et choisir les valeurs par défaut. Les matériaux de rang 1 à 3 reprennent surtout l'état traditionnel relevé par J.-Y. Chauvet (années 1880-1950). Depuis, la tuile mécanique s'est imposée presque partout : environ 74 % des maisons françaises sont en terre cuite (FFB 2018). Aucune source ne publie de part par département.

## Les zones en une ligne

- **DTU tuiles (40.21)** : zone 1 = intérieur et côte méditerranéenne sous 200 m ; zone 2 = côte atlantique de Lorient à l'Espagne (20 km), bande de 20 à 40 km de Lorient à la Belgique, altitude 200-500 m ; zone 3 = Atlantique, Manche et Mer du Nord sur 20 km de Lorient à la Belgique, altitude > 500 m.
- **DTU ardoise (40.11, 2020)** : même découpage, sauf que la **vallée du Rhône, la Provence, le Languedoc, le Roussillon et la Corse sont en zone 3**. Il faut donc deux colonnes et non une.
- **Par commune** : `communes/bretagne-44.json` (1 409 communes) et `communes/france.json` (34 739). Distance de la mairie à la côte générale au 1:10 M, altitude IGN au point de la mairie, contrôle du contour et du relief. Sources, licences et cas limites dans `communes/README.md`.
- **Situation exposée** (les deux DTU) : littoral sur environ 5 km, sommets de falaises, îles et presqu'îles, estuaires et baies encaissées ; vallées étroites, montagnes isolées, cols.
- **Vent (Eurocode = NV65 2009)** : régions 1 à 4 en métropole (22, 24, 26, 28 m/s). La région 4 n'existe qu'en Corse, et il n'y a pas de zone 5 en métropole. Outre-mer : Guadeloupe 36, Réunion 34, Martinique 32, Mayotte 30, Guyane 17 m/s.
- **Neige** : A1 à E. La Bretagne est entièrement en A1.

`*` = département partagé (cantons dans `regions.json`). DTU = plage de zones possibles dans le département (tuile / ardoise).

### Bretagne

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 22 Côtes-d'Armor | ardoise naturelle | tuile mécanique (emboîtement) | ardoise fibres-ciment / bac acier | 3 | A1 | 1-3 / 1-3 | confirme |
| 29 Finistère | ardoise naturelle | tuile mécanique | chaume (roseau) | 3 | A1 | 1-3 / 1-3 | confirme |
| 35 Ille-et-Vilaine | ardoise naturelle | tuile mécanique | ardoise fibres-ciment / bac acier | 2 | A1 | 1-3 / 1-3 | confirme |
| 56 Morbihan | ardoise naturelle | chaume (roseau) | tuile mécanique | 3 | A1 | 1-3 / 1-3 | confirme |

#### Bretagne en détail (22, 29, 35, 56, et 44)

| | Côtes-d'Armor 22 | Finistère 29 | Ille-et-Vilaine 35 | Morbihan 56 | Loire-Atlantique 44 |
| --- | --- | --- | --- | --- | --- |
| Boutons, dans l'ordre | Ardoise · Tuile · Autre | Ardoise · Tuile · Autre | Ardoise · Tuile · Autre (à l'est, tuile mécanique en 2e) | Ardoise · Tuile · Autre (chaume dans le golfe) | Nord Loire : Ardoise · Tuile · Autre. Sud Loire : Tuile canal · Tuile mécanique · Ardoise · Autre |
| Tuile canal par défaut | jamais | jamais | jamais | jamais | au sud de la Loire seulement |
| Vent | 3 | 3 | **2** | 3 | 3, sauf cantons du nord (Châteaubriant, Ancenis, Blain, Nozay…) en 2 |
| DTU tuile = ardoise, par commune (zone 1 / 2 / 3) | 24 / 109 / 211 sur 344 | 4 / 34 / 239 sur 277 | **184** / 88 / 60 sur 332 (Rennes et Vitré 1, Fougères 2, Saint-Malo 3) | 99 / 118 / 32 sur 249 (Lorient, Groix, Étel 3 ; Quiberon, Vannes, Belle-Île 2) | 155 / 52 / **0** sur 207 (Saint-Nazaire 2, Nantes 1) |
| Communes en « limite » / exposées probables | 69 / 79 | 30 / 131 | 40 / 24 | 67 / 76 | 17 / 48 |
| Neige | A1 | A1 | A1 | A1 | A1 |

Habitudes bretonnes sourcées :

- **Ardoise naturelle au crochet**. En site très venté, la Bretagne pose aux crochets sur **voligeage jointif**, qui sert aussi d'écran rigide (guide Culture, deux passages). Ardoises plutôt épaisses (Cupa). Formats ordinaires 32×22 et 30×22 dans la table Culture ; le format le plus vendu en Bretagne n'est publié nulle part (à demander aux négoces).
- **Faîtage** : rangs de rencontre recouverts de faîtières en terre cuite scellées au mortier (Chauvet), tuiles rondes sans emboîtement, teinte naturelle, scellées à la chaux (CAUE 44). Lignolet en ardoises triangulaires dans le Morbihan et le Finistère nord. Le zinc est réservé aux toitures ornées (CAUE 44) : proposer la terre cuite avant le zinc.
- **Gouttières et descentes en zinc naturel** (CAUE 44). Le CAUE 44 cite la « dalle nantaise » en pied de versant. Les gouttières nantaise (rampante) et havraise ne sont définies que par des sites de vente ; leur usage par département reste à confirmer.
- **Est de l'Ille-et-Vilaine** (Vitré, La Guerche, Fougères) : ardoise principalement, quelquefois de la tuile mécanique sur des maisons du début du XXe siècle (Inventaire de Bretagne). La tuile plate n'apparaît qu'au-delà de la limite Mayenne-Sarthe (Chauvet).
- **Chaume** : Brière (plus de 1 200 chaumières en 1989), golfe du Morbihan, Poul-Fétan, et un résiduel dans le Finistère. Le seigle du centre Morbihan a été remplacé par l'ardoise après la tempête de 1987.
- **Loire-Atlantique sud** : tige de botte, faîtage et arêtiers scellés à la chaux, égout parfois sans gouttière (rang de tuiles en saillie). Les tuiles noires ou imitation ardoise sont proscrites à Vertou.

### Pays de la Loire (Bretagne historique)

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 44 Loire-Atlantique | ardoise naturelle / tuile canal « tige de botte » | tuile mécanique | chaume (roseau) | 3 * | A1 | 1-2 / 1-2 | confirme |

### Pays de la Loire

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 49 Maine-et-Loire | ardoise naturelle | tuile canal | tuile mécanique | 2 | A1 | 1 / 1 | confirme |
| 53 Mayenne | ardoise naturelle | tuile plate | tuile mécanique | 2 | A1 | 1-2 / 1-2 | une_source |
| 72 Sarthe | tuile plate / ardoise naturelle | — | tuile mécanique | 2 | A1 | 1-2 / 1-2 | une_source |
| 85 Vendée | tuile canal « tige de botte » | tuile mécanique / romane | chaume (roseau) | 3 | A1 | 1-2 / 1-2 | une_source |

### Normandie

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 14 Calvados | ardoise naturelle | tuile plate | chaume | 2 | A1 | 1-3 / 1-3 | confirme |
| 27 Eure | tuile plate | ardoise naturelle | chaume | 2 | A1 | 1-3 / 1-3 | une_source |
| 50 Manche | ardoise naturelle | chaume (roseau) | tuile plate | 2 | A1 | 1-3 / 1-3 | confirme |
| 61 Orne | tuile plate / ardoise naturelle | — | tuile mécanique | 2 | A1 | 1-2 / 1-2 | une_source |
| 76 Seine-Maritime | ardoise naturelle | tuile plate | chaume | 2 * | A1 | 1-3 / 1-3 | a_confirmer |

### Hauts-de-France

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 02 Aisne | tuile plate | ardoise naturelle | tuile mécanique / panne | 2 | A1 * | 1-2 / 1-2 | une_source |
| 59 Nord | panne flamande | tuile mécanique | ardoise naturelle | 3 * | A1 * | 1-3 / 1-3 | une_source |
| 60 Oise | tuile plate | panne picarde | ardoise naturelle | 2 | A1 | 1-2 / 1-2 | une_source |
| 62 Pas-de-Calais | panne flamande | tuile mécanique | ardoise naturelle | 3 * | A1 | 1-3 / 1-3 | une_source |
| 80 Somme | panne picarde | tuile mécanique | ardoise naturelle | 3 * | A1 | 1-3 / 1-3 | une_source |

### Île-de-France

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 75 Paris | zinc | ardoise naturelle | tuile mécanique | 2 | A1 | 1 / 1 | une_source |
| 77 Seine-et-Marne | tuile plate | tuile mécanique | ardoise naturelle | 2 | A1 | 1 / 1 | une_source |
| 78 Yvelines | tuile plate | tuile mécanique | ardoise naturelle | 2 | A1 | 1 / 1 | confirme |
| 91 Essonne | tuile plate | tuile mécanique | ardoise naturelle | 2 | A1 | 1 / 1 | confirme |
| 92 Hauts-de-Seine | tuile mécanique | zinc | ardoise naturelle | 2 | A1 | 1 / 1 | a_confirmer |
| 93 Seine-Saint-Denis | tuile mécanique | zinc | ardoise naturelle | 2 | A1 | 1 / 1 | a_confirmer |
| 94 Val-de-Marne | tuile mécanique | zinc | ardoise naturelle | 2 | A1 | 1 / 1 | confirme |
| 95 Val-d'Oise | tuile plate | tuile mécanique | ardoise naturelle | 2 | A1 | 1 / 1 | confirme |

### Centre-Val de Loire

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 18 Cher | tuile plate | ardoise naturelle | tuile mécanique | 2 | A1 | 1-2 / 1-2 | une_source |
| 28 Eure-et-Loir | tuile plate | ardoise naturelle | tuile mécanique | 2 | A1 | 1-2 / 1-2 | une_source |
| 36 Indre | tuile plate | ardoise naturelle | tuile canal | 2 | A1 | 1-2 / 1-2 | a_confirmer |
| 37 Indre-et-Loire | ardoise naturelle / tuile plate | — | tuile mécanique | 2 | A1 | 1 / 1 | une_source |
| 41 Loir-et-Cher | tuile plate / ardoise naturelle | — | tuile mécanique | 2 | A1 | 1-2 / 1-2 | une_source |
| 45 Loiret | tuile plate | ardoise naturelle | tuile mécanique | 2 | A1 | 1-2 / 1-2 | une_source |

### Grand Est

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 08 Ardennes | ardoise naturelle | tuile néo-romaine / mécanique | tuile plate | 2 | C1 * | 1-2 / 1-2 | confirme |
| 10 Aube | tuile plate | tuile néo-romaine | tuile mécanique (dont tuile violon) | 2 | A1 | 1-2 / 1-2 | une_source |
| 51 Marne | tuile néo-romaine champenoise | tuile plate | tuile mécanique | 2 | A1 | 1-2 / 1-2 | une_source |
| 52 Haute-Marne | tuile plate | tuile creuse / néo-romaine | tuile violon | 2 | A1 | 1-2 / 1-2 | une_source |
| 54 Meurthe-et-Moselle | tuile creuse lorraine | tuile mécanique (romane, grand moule) | tuile plate | 2 | A1 * | 1-2 / 1-2 | une_source |
| 55 Meuse | tuile creuse lorraine / tuile néo-romaine champenoise | — | tuile mécanique | 2 | A1 * | 1-2 / 1-2 | une_source |
| 57 Moselle | tuile creuse lorraine / tuile écaille alsacienne (Biberschwanz) | — | ardoise | 2 | A1 * | 1-2 / 1-2 | une_source |
| 67 Bas-Rhin | tuile plate écaille Biberschwanz | tuile mécanique | ardoise naturelle | 2 | B1/C1 * | 1-3 / 1-3 | confirme |
| 68 Haut-Rhin | tuile plate écaille Biberschwanz | tuile mécanique | ardoise naturelle | 2 | C1 | 1-3 / 1-3 | confirme |
| 88 Vosges | tuile creuse lorraine | tuile plate « queue de castor » | bardeau bois | 2 | A1/B1/C1 * | 2-3 / 2-3 | une_source |

### Bourgogne-Franche-Comté

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 21 Côte-d'Or | tuile plate | lave calcaire | tuile mécanique | 2 * | A1 | 1-3 / 1-3 | confirme |
| 25 Doubs | tuile plate | tuile écaille alsacienne | bardeau bois (tavaillon) / bac acier | 1 * | C1 * | 2-3 / 2-3 | une_source |
| 39 Jura | tuile plate | tuile creuse | bardeau bois / tôle | 1 | C1 * | 1-3 / 1-3 | une_source |
| 58 Nièvre | tuile plate | ardoise naturelle | tuile mécanique | 2 | A1 | 1-3 / 1-3 | confirme |
| 70 Haute-Saône | tuile plate | tuile creuse lorraine | lave de grès | 2 * | B1 * | 1-3 / 1-3 | une_source |
| 71 Saône-et-Loire | tuile plate / tuile creuse | — | tuile mécanique | 2 | A2 * | 1-3 / 1-3 | une_source |
| 89 Yonne | tuile plate | tuile mécanique | ardoise naturelle | 2 | A1 | 1-2 / 1-2 | a_confirmer |
| 90 Territoire de Belfort | tuile plate / écaille | tuile mécanique | bac acier | 2 | C2 | 2-3 / 2-3 | a_confirmer |

### Nouvelle-Aquitaine

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 16 Charente | tuile canal | tuile mécanique / romane | ardoise naturelle | 1 | A2 | 1-2 / 1-2 | une_source |
| 17 Charente-Maritime | tuile canal | tuile mécanique / romane | ardoise naturelle | 3 * | A2 | 1-2 / 1-2 | une_source |
| 19 Corrèze | ardoise naturelle | lauze de schiste | tuile plate | 1 | A2 | 1-3 / 1-3 | confirme |
| 23 Creuse | ardoise naturelle / tuile plate | — | tuile mécanique | 1 | A2 | 2-3 / 2-3 | une_source |
| 24 Dordogne | tuile plate | tuile canal | lauze calcaire | 1 | A2 | 1-2 / 1-2 | une_source |
| 33 Gironde | tuile canal | tuile mécanique / romane | ardoise naturelle | 1 * | A2 | 1-2 / 1-2 | confirme |
| 40 Landes | tuile canal | tuile mécanique (Marseille, romane) | bardeau bois (essentes) | 1 * | A2 | 1-2 / 1-2 | une_source |
| 47 Lot-et-Garonne | tuile canal | tuile mécanique / romane | tuile plate | 1 | A2 | 1-2 / 1-2 | une_source |
| 64 Pyrénées-Atlantiques | tuile canal / ardoise naturelle | — | tuile mécanique | 2 | A2 | 1-3 / 1-3 | a_confirmer |
| 79 Deux-Sèvres | tuile canal | ardoise naturelle | tuile mécanique | 2 | A1 | 1-2 / 1-2 | a_confirmer |
| 86 Vienne | tuile canal | ardoise naturelle | tuile mécanique | 1 | A1 | 1 / 1 | une_source |
| 87 Haute-Vienne | tuile canal | ardoise naturelle | tuile plate | 1 | A2 | 1-3 / 1-3 | a_confirmer |

### Occitanie

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 09 Ariège | ardoise / lauze de schiste | tuile canal | tuile mécanique | 2 | A2 * | 2-3 / 2-3 | une_source |
| 11 Aude | tuile canal | tuile mécanique / romane | ardoise | 3 * | D * | 1-3 / 3 | une_source |
| 12 Aveyron | lauze et ardoise de schiste | lauze calcaire | tuile canal | 2 | A2 | 1-3 / 1-3 | confirme |
| 30 Gard | tuile canal | lauze de schiste | chaume (roseau) | 2 * | B2 | 1-3 / 3 | une_source |
| 31 Haute-Garonne | tuile canal | ardoise | tuile mécanique / romane | 1 * | A2 * | 1-3 / 1-3 | confirme |
| 32 Gers | tuile canal | tuile mécanique / romane | — | 1 | A2 | 1-2 / 1-2 | confirme |
| 34 Hérault | tuile canal | tuile mécanique / romane | ardoise | 3 | B2 * | 1-3 / 3 | confirme |
| 46 Lot | tuile plate | tuile canal | lauze calcaire / de schiste | 1 | A2 | 1-3 / 1-3 | confirme |
| 48 Lozère | lauze de schiste | lauze calcaire | tuile canal / mécanique | 2 | A2 | 2-3 / 2-3 | confirme |
| 65 Hautes-Pyrénées | ardoise naturelle | tuile canal | tuile mécanique | 1 | A2 | 1-3 / 1-3 | confirme |
| 66 Pyrénées-Orientales | tuile canal | ardoise / lauze | tuile mécanique | 3 | D * | 1-3 / 3 | a_confirmer |
| 81 Tarn | tuile canal | ardoise naturelle | tuile mécanique | 2 * | A2 * | 1-3 / 1-3 | confirme |
| 82 Tarn-et-Garonne | tuile canal | ardoise / lauze | tuile mécanique | 1 | A2 | 1-2 / 1-2 | confirme |

### Auvergne-Rhône-Alpes

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 Ain | tuile creuse | tuile mécanique | tuile plate / bois / tôle | 1 * | C2 * | 1-3 / 1-3 | confirme |
| 03 Allier | tuile plate / tuile creuse | — | bardeau bois (tavaillon) | 2 | A2 | 1-3 / 1-3 | une_source |
| 07 Ardèche | tuile canal | lauze | tuile mécanique / romane | 2 | C2 | 1-3 / 1-3 | a_confirmer |
| 15 Cantal | lauze (phonolite, schiste) | ardoise naturelle | tuile mécanique | 1 * | A2 | 2-3 / 2-3 | une_source |
| 26 Drôme | tuile canal | tuile romane | tuile écaille | 2 | C2 | 1-3 / 1-3 | une_source |
| 38 Isère | tuile plate écaille dauphinoise | tuile canal | ardoise / tôle / bois | 1 * | C2 | 1-3 / 1-3 | confirme |
| 42 Loire | tuile canal | tuile mécanique | — | 2 | A2 | 1-3 / 1-3 | confirme |
| 43 Haute-Loire | lauze (phonolite) | tuile mécanique | tuile canal | 2 | A2 | 2-3 / 2-3 | une_source |
| 63 Puy-de-Dôme | tuile creuse | lave / lauze | ardoise | 2 | A2 | 2-3 / 2-3 | une_source |
| 69 Rhône | tuile canal | tuile mécanique (grand moule, Losangée Ste Foy) | tuile plate | 2 | A2 | 1-3 / 1-3 | confirme |
| 73 Savoie | ardoise naturelle | bac acier / tôle | lauze / bardeau | 1 | C2 * | 2-3 / 2-3 | une_source |
| 74 Haute-Savoie | bardeau bois (tavaillon, ancelle) | tôle / bac acier | ardoise naturelle | 1 | E * | 2-3 / 2-3 | une_source |

### Provence-Alpes-Côte d'Azur

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 04 Alpes-de-Haute-Provence | tuile canal | tuile écaille dauphinoise | bois / tôle | 2 * | C1 | 2-3 / 2-3 | une_source |
| 05 Hautes-Alpes | tuile plate écaille dauphinoise | bois / tôle | tuile canal | 1 * | C1 | 3 / 3 | une_source |
| 06 Alpes-Maritimes | tuile canal | tuile romane / mécanique | — | 2 * | A2 * | 1-3 / 1-3 | a_confirmer |
| 13 Bouches-du-Rhône | tuile canal | tuile mécanique « Marseille » | chaume (roseau) | 3 | A2 | 1-2 / 3 | confirme |
| 83 Var | tuile canal | tuile mécanique | — | 2 | A2 * | 1-3 / 3 | confirme |
| 84 Vaucluse | tuile canal | tuile romane | — | 2 | B2 * | 1-3 / 3 | une_source |

### Corse

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2A Corse-du-Sud | tuile canal | lauze de schiste (teghje) | — | 3 * | A2 | 1-3 / 3 | une_source |
| 2B Haute-Corse | tuile canal / lauze de schiste (teghje) | — | — | 4 * | A2 | 1-3 / 3 | une_source |

### Outre-mer

| Dépt | Rang 1 | Rang 2 | Rang 3 | Vent | Neige | DTU tuile / ardoise | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 971 Guadeloupe | tôle acier ondulée ou nervurée | — | — | 36 m/s | — | — / — | une_source |
| 972 Martinique | tôle acier ondulée ou nervurée | — | — | 32 m/s | — | — / — | une_source |
| 973 Guyane | tôle acier ondulée ou nervurée | — | — | 17 m/s | — | — / — | une_source |
| 974 La Réunion | tôle acier ondulée ou nervurée | — | — | 34 m/s | — | — / — | une_source |
| 976 Mayotte | tôle acier ondulée ou nervurée | — | — | 30 m/s | — | — / — | une_source |

## Verdict sur la section 26 du référentiel et sur zone.ts (détail ligne par ligne dans `regions.json`)

- **Zones ardoise du §26.1 : corrigé.** Le seuil de montagne est 500 m (900 m est la limite du climat de plaine). La zone 3 de l'ardoise inclut la Méditerranée et la vallée du Rhône. La côte atlantique au sud de Lorient est en zone 2. La zone 2 ne correspond pas à « l'intérieur de l'Ouest, Nord, Est, Massif central ».
- **Vent du §26.1 : corrigé.** La Bretagne est en région 3 (Ille-et-Vilaine 2), la Manche en 2. Il n'y a pas de zone 4 ou 5 en Bretagne : la zone 4 bretonne vient de la carte NV65 de 1999, remplacée en 2009.
- **Exemple 22 du §32.1 : corrigé.** `zone_vent` vaut 3 et non 4. Les valeurs III et 3 ne valent que sur la côte.
- **Tableau du §26.2 : globalement juste, avec des corrections.** Faîtage breton en terre cuite scellée (et non zinc), panne flamande et picarde dans le Nord, tuile creuse en Lorraine, tuile plate dans le Périgord, tuile écaille en Isère et dans les Hautes-Alpes. Partages internes : Normandie, Pays de la Loire, Sarthe, Orne, Ardennes.
- **zone.ts : à revoir, chiffré par commune.** Avec la table par commune, en Bretagne et en Loire-Atlantique : 466 communes en zone 1, 401 en zone 2 et 542 en zone 3. zone.ts met en zone 3 tout le 22, le 29, le 35, le 56 et le 44. Constat initial : (1) Il faut deux zones, ardoise et tuile. (2) 44, 85, 17, 33 et 40 passent de 3 à 2. (3) 35 vaut 3 sur la côte et 1 à Rennes. (4) La Méditerranée vaut 1 en tuile et 3 en ardoise. (5) 48, 15, 43 et 12 passent à 3 par l'altitude, et 19, 23, 87, 58, 03 et 52 au moins à 2. (6) L'altitude et la distance à la côte de la commune doivent remplacer le département, sinon il faut poser la question « Bord de mer ? » dès que le département est littoral.

## Décisions à trancher

1. ~~Calculer la zone par commune ou garder le département~~ : tranché par le fondateur le 19 novembre (par commune). La table est prête (`communes/`). Restent à trancher : la limite de Lorient (une commune à moins de 20 km de la côte ouest de Lorient est en zone 3 même si la côte est est plus près : Étel, Belz, Riantec), les rives d'estuaire (Nantes, Paimbœuf, Donges : exposées ou non ?) et la zone 3 méditerranéenne de l'ardoise à la commune (04, 06, 07, 26, 48).
2. Ille-et-Vilaine : faut-il garder la zone 3 par prudence (recouvrement majoré sur les chantiers de Rennes) ou passer à 1 hors bande côtière ?
3. Inox 2,7 mm « d'office » : dans tout le département littoral, ou seulement à moins de 5 km de la côte (situation exposée du DTU) ?
4. Faîtage breton par défaut : terre cuite scellée (tradition sourcée) ou zinc (habitude actuelle à vérifier auprès des couvreurs) ?

Sources principales : NF DTU 40.11 (2020) et 40.21 (2013), annexe B ; Edilians ; ArcelorMittal 2025 ; VMZINC Mémento 2025 ; Techniques de l'Ingénieur et INRS (vent et neige, annexes nationales Eurocode) ; guide Culture « Ardoises » ; Cupa ; J.-Y. Chauvet / Maisons paysannes de France ; CAUE 44, CAUE Midi-Pyrénées, UDAP Isère et Alsace ; Inventaire de Bretagne. Ajouts du 19 novembre au soir (deuxième source) : fiche PCI des savoir-faire chaumiers (golfe du Morbihan et Brière) ; CAUE Midi-Pyrénées (tuile canal, tuile plate) ; SPR de Toulouse ; UDAP 13, 2A, 05, 14, 21, 34, 69, 73-74 et 83 ; AVAP de Bordeaux Métropole ; CAUE de l'Ain et du Val-de-Marne ; Saint-Maur-des-Fossés ; Montbrison ; PNR du Morvan, de la Haute Vallée de Chevreuse et du Vexin français. Données par commune : data.gouv.fr (communes 2026), IGN (altimétrie), Natural Earth, SHOM (Histolitt, limites transversales de la mer), DREAL Bretagne (loi Littoral), INSEE (COG 2011 et 2025).

## Encore à confirmer (deuxième source à trouver)

- **Toujours `a_confirmer` (12)** : 06, 36, 64, 66, 76, 79, 87, 89, 90, 92 et 93 (aucune source départementale lue), ainsi que 07. Pour 06, 66 et 79, les fiches UDAP et CAUE n'ont pas été trouvées en ligne : il faut les demander aux UDAP.
- **Passés à `une_source`** : 2A (UDAP 2A : tuile canal) et 73 (UDAP 73-74 : ardoise alpine).
- **Gros du reste** (55 `une_source`) : Chauvet seul, surtout pour la tuile plate du Bassin parisien et du Centre, les pannes du Nord et de Picardie, la Lorraine, la Franche-Comté et le Poitou. Les sources trouvées mais non lisibles (fiche de Comines : panne flamande, 403) sont à relire.
- **Bretagne et 44** : les rangs 1 sont confirmés. Le chaume du Morbihan et de la Brière passe à `confirme`. La tuile mécanique (rangs 2 et 3 du 22, 29, 35, 56 et 44) n'a toujours qu'une source ou aucune.
