# Zones de couverture par commune

Recherche du 19 novembre 2026. Décision du fondateur : la zone climatique est calculée **par commune** (distance à la côte, altitude), avec une **zone ardoise** (NF DTU 40.11) et une **zone tuile** (NF DTU 40.21) séparées. Rien de ce dossier n'est lu par le moteur.

| Fichier | Contenu |
| --- | --- |
| `bretagne-44.json` | 1 409 communes (22, 29, 35, 56, 44), indentation 1 |
| `france.json` | 34 739 communes de métropole et de Corse, même script, JSON compact (41 Mo) |
| `calcul_zones.py` | le calcul (Python, bibliothèque standard seulement, à lancer avec `python3 -I`) |
| `telecharger_alti_ign.py` | l'altitude IGN au point de la mairie, par lots de 150 points |

## Les règles (vérifiées sur deux sources)

| Règle | NF DTU 40.21 P1-1 (oct. 2013), annexe B, tuiles | NF DTU 40.11 P1-1 (déc. 2020), annexe B, ardoise |
| --- | --- | --- |
| Zone 1 | intérieur, et côte méditerranéenne, sous 200 m | intérieur sous 200 m |
| Zone 2 | côte atlantique de Lorient à l'Espagne sur 20 km ; bande de 20 à 40 km de Lorient à la Belgique ; 200 à 500 m | côte atlantique de Lorient à l'Espagne sur 20 km ; transition d'environ 20 km (Manche, Bretagne, mer du Nord) ; 200 à 500 m |
| Zone 3 | Atlantique, Manche, mer du Nord sur 20 km, de Lorient à la Belgique ; plus de 500 m | les mêmes côtes sur 20 km ; **vallée du Rhône jusqu'à la pointe Isère-Drôme-Ardèche ; Provence, Languedoc, Roussillon, Corse** ; plus de 500 m |
| Situation exposée | littoral sur 5 km, sommets de falaises, îles ou presqu'îles étroites ; vallées où le vent s'engouffre, montagnes isolées, cols | la même liste, plus « les estuaires ou baies encaissées et profondément découpées » |

Sources lues le 19 novembre 2026 : la copie en ligne des deux annexes B (dtu.golgoth.org, `DTU4011_B`, `DTU4021_B`) ; Edilians, prescription de mise en œuvre DTU 40.21 (même texte, et « il convient de se référer aux définitions des zones, qui seules font foi » : la carte est approximative) ; ArcelorMittal, guide des actions climatiques 4A de septembre 2025 (même découpage pour 40.11 / 40.35). Les deux DTU disent que les documents particuliers du marché précisent la zone : **le devis prime**.

Le calcul prend la plus sévère des règles (côte, altitude, région). En Bretagne et en Loire-Atlantique, **zone ardoise = zone tuile pour toutes les communes** : les deux DTU ne diffèrent qu'en Méditerranée et dans la vallée du Rhône.

## Les jeux de données

| Donnée | Source | Licence | Date | Usage |
| --- | --- | --- | --- | --- |
| Communes 2026 : code INSEE, nom, codes postaux, coordonnées de la mairie, altitude moyenne / min / max | data.gouv.fr, « Liste des communes de France » (Ville de rêve, d'après INSEE, IGN ADMIN EXPRESS, geo.api.gouv.fr), `communes-france-2026.csv` et `communes-france-avec-polygon-2026.geojson` | Licence Ouverte 2.0 | COG 2026, publié le 17 juin 2026 | liste, point de la mairie, relief, contour |
| Altitude au point de la mairie | IGN, service d'altimétrie `data.geopf.fr/altimetrie` (RGE ALTI), interrogé le 19 novembre 2026 | Licence Ouverte (Géoplateforme) | 19/11/2026 | altitude retenue (34 863 points, 5 hors grille écartés) |
| Côte générale | Natural Earth, `ne_10m_coastline` (1:10 M) | domaine public | v5 | bandes de 20 et 40 km, à l'échelle de la carte des DTU |
| Trait de côte fin | SHOM / IGN, Histolitt TCH_FRA_V2 (via datasud.fr) | Licence Ouverte 2.0 | 2009, publié 2021 | situation exposée : littoral sur 5 km, rives d'estuaire et de ria, îles |
| Limites transversales de la mer | SHOM, LTM (92 arcs, 238 points en métropole) | Licence Ouverte 2.0 | 2020 | ferme les estuaires de la Loire (Mindin-Penhoët, décret du 8 novembre 1854), de la Gironde (1857) et de la Seine (1869) |
| Communes littorales (loi Littoral) | DREAL Bretagne, WFS `dreal_b:l_communes_littorales` (geobretagne.fr) | Licence Ouverte 2.0 | 2023 | 263 communes « Mer » ou « Estuaire » dans 22, 29, 35, 56 |
| Vent, Loire-Atlantique | NF EN 1991-1-4/NA, tableau des cantons : Techniques de l'Ingénieur C 3 306 (mai 2014), tableau 2, et VMZINC, mémento du couvreur 2025 | lecture seule | 2014 / 2025 | 15 anciens cantons en région 2, les autres en 3 (les deux listes concordent) |
| Anciens cantons et communes nouvelles | INSEE, COG 2011 (`comsimp2011`, `canton2011`) et mouvements de communes du COG 2025 | Licence Ouverte 2.0 | 2011 / 2025 | rattacher chaque commune 2026 à ses cantons de l'annexe nationale |
| Vent et neige des autres départements | `regions.json` (Techniques de l'Ingénieur, INRS, VMZINC, ICAB) | | | valeur du département ; département partagé = `a_confirmer` |

La liste nationale des communes de la loi Littoral (DGALN, « COG 2020-2022 », Observatoire des territoires) n'a pas pu être téléchargée : le lien de data.gouv.fr est mort et l'API de l'Observatoire refuse la requête. Hors Bretagne, le champ `littoral.riveraine_mer_ou_estuaire` vaut `null`, et c'est la distance qui sert.

## Comment c'est calculé

1. **Point du chantier** : la mairie (coordonnées data.gouv). Le chantier peut être ailleurs dans la commune ; d'où le contrôle du contour (point 4).
2. **Distance à la côte** : de la mairie à la côte générale au 1:10 M, découpée en trois côtes : « nord » (Atlantique jusqu'à la rive ouest de la rade de Lorient, Manche, mer du Nord), « sud » (de Port-Louis à l'Espagne) et Méditerranée. La côte générale ne remonte pas les rias (Rance, Aulne, Élorn, Odet, rivière d'Auray). Les estuaires de la Loire, de la Gironde et de la Seine, où elle remonte loin, sont retirés en amont de leur limite transversale de la mer (polygones `ESTUAIRES` du script).
3. **Altitude** : celle de l'IGN au point de la mairie, sinon la moyenne communale.
4. **Contrôles** : si un point du contour communal tombe dans une bande plus sévère que la mairie, la commune passe en `limite` (« territoire communal à cheval »). De même si l'altitude maximale de la commune dépasse 200 ou 500 m alors que la mairie est en dessous, si la mairie est à moins de 2 km d'une limite de 20 ou 40 km, ou près de la limite de Lorient.
5. **Situation exposée probable** : à 5 km au plus du rivage (Histolitt) ; « île » si la mairie est dans un contour fermé de moins de 300 km ; « rive d'estuaire ou de ria » si l'eau salée est à 3 km au plus alors que la mer ouverte est à plus de 5 km. Elle n'est jamais affirmée : falaise, vallée ou col ne se voient pas dans ces données. C'est une question à poser (« Bord de mer ? »), pas une valeur.
6. **Vent** : la valeur du département s'il est entier. En Loire-Atlantique, par les anciens cantons. Une commune nouvelle à cheval sur des cantons de deux régions passe en `limite` (Vallons-de-l'Erdre).

`statut` d'une commune : `calcule` (une seule zone possible), `limite` (la zone dépend de l'endroit exact du chantier : demander « Bord de mer ? » ou l'altitude, ou prendre la plus sévère), `a_confirmer` (règle non tranchée à la commune).

## Résultat en Bretagne et en Loire-Atlantique (zone tuile = zone ardoise)

| Dépt | Communes | Zone 1 | Zone 2 | Zone 3 | `limite` | Exposée probable | Vent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 22 | 344 | 24 | 109 | 211 | 69 | 79 | 3 |
| 29 | 277 | 4 | 34 | 239 | 30 | 131 | 3 |
| 35 | 332 | 184 | 88 | 60 | 40 | 24 | 2 |
| 56 | 249 | 99 | 118 | 32 | 67 | 76 | 3 |
| 44 | 207 | 155 | 52 | 0 | 17 | 48 | 3 (136), 2 (71) |
| **Total** | **1 409** | **466** | **401** | **542** | **223** | **358** | |

Neige A1 partout. Contrôles : Rennes 1, Vitré 1, Fougères 2 (129 m, 34 km de la Manche), Brest 3, Quimper 3, Lorient 3, Quiberon 2, Vannes 2, Belle-Île 2, Groix 3, Saint-Nazaire 2, Nantes 1, Châteaubriant 1. Aucune commune de Loire-Atlantique n'est en zone 3. **zone.ts met aujourd'hui tout le 35 et le 44 en zone 3** : 184 communes d'Ille-et-Vilaine et 155 de Loire-Atlantique sont en zone 1.

## Cas limites

- **Îles** (14 en Bretagne : Bréhat, Batz, Ouessant, Molène, Sein, Groix, les quatre communes de Belle-Île, Houat, Hœdic, Île-aux-Moines, Arz) : la côte de l'île compte, même quand la côte générale l'oublie. Situation exposée d'office d'après les deux DTU. Groix est à l'ouest de Lorient, donc en zone 3 ; Belle-Île, à l'est, est en zone 2.
- **Limite de Lorient** : le texte dit « de Lorient à la Belgique » et « de Lorient à l'Espagne ». La rade est coupée entre Larmor-Plage (côte nord) et Port-Louis (côte sud). Une commune à moins de 20 km de la côte nord est en zone 3 même si la côte sud est plus près : Lanester, Riantec, Port-Louis, Plouhinec, Étel et Belz sont en zone 3. Étel, Belz et 20 autres sont en `limite`. Quiberon (27 km de la côte nord) et Carnac sont en zone 2. Le texte ne tranche pas ce point : à faire valider par le fondateur.
- **Rade de Brest** : c'est la mer (la limite transversale est en amont, à Landerneau sur l'Élorn et à Port-Launay sur l'Aulne). Brest, Plougastel-Daoulas, Le Relecq-Kerhuon, Daoulas et Landerneau sont en zone 3, en situation exposée probable.
- **Golfe du Morbihan** : c'est la mer, côte « sud ». Vannes, Séné, Arradon, Baden et Sarzeau sont en zone 2, avec le littoral à moins de 5 km. Larmor-Baden est à 38 km de la côte nord, donc près de la limite des 40 km.
- **Estuaire de la Loire** : la mer s'arrête à Mindin-Penhoët. Saint-Nazaire et Saint-Brevin sont en zone 2. Paimbœuf (10,7 km) et Donges (9,9 km) sont aussi en zone 2, avec la rive d'estuaire à moins de 3 km. Cordemais, Le Pellerin, Bouguenais, Nantes et Vertou sont en zone 1, avec une rive d'estuaire : le DTU 40.11 classe exposés « les estuaires », mais rien ne dit jusqu'où. À demander.
- **Rias** (Rance, Trieux, Jaudy, Léguer, Morlaix, Élorn, Aulne, Odet, Blavet, rivière d'Auray) : la distance est prise à la côte générale, pas au fond de la ria. Dinan est à 8,3 km de la côte générale et à 3,7 km de la Rance salée, Quimper à 8,3 km, Châteaulin à 13,5 km. Les trois sont en zone 3. Les rives sont marquées « rive d'estuaire ou de ria ».
- **Précision** : la côte au 1:10 M peut s'écarter d'environ 1 km du rivage. D'où la marge de 2 km autour des limites de 20 et 40 km.
- **Altitude** : la Bretagne culmine à 385 m (monts d'Arrée). Les zones 2 de l'intérieur viennent de la bande de 20 à 40 km ou des hauteurs de 200 à 385 m (Méné, Arrée, Montagnes Noires). Aucune commune bretonne ne dépasse 500 m.

## France entière

`france.json` couvre les 34 739 communes de métropole et de Corse : 21 634 `calcule`, 11 166 `limite` (surtout le relief : altitude min et max de part et d'autre de 200 ou 500 m), 1 939 `a_confirmer`. Il manque encore :

1. **La zone 3 méditerranéenne de l'ardoise** : « Provence, Languedoc, Roussillon, Corse » n'a pas de limite à la commune. Elle est lue par département : 2A, 2B, 13, 83, 84, 30, 34, 11 et 66 entiers ; 26 et 07 à moins de 10 km du Rhône. 04, 06, 48, 26 et 07 sont en `a_confirmer`. Il faut la carte B.1 du DTU 40.11 ou une décision.
2. **Vent et neige des départements partagés** : un seul est fait (44). Les tableaux 2 de Techniques de l'Ingénieur se lisent comme celui de la Loire-Atlantique, mais il faut saisir la liste des cantons de chaque département (vent : 17, 31, 33, 38, 40, 59, 62, 76, 80… ; neige : une trentaine). L'amendement NF EN 1991-1-3/NA/A2 de 2022, qui découpe la neige par commune, n'est pas en accès libre.
3. **Montagne** : au-dessus de 900 m, le DTU 40.11 ne vise plus le climat de plaine. Ces communes sont en `a_confirmer`.
4. Cinq communes n'ont pas de coordonnées dans le fichier 2026 (Conques-en-Rouergue, Aurseulles, Neussargues en Pinatelle, Orée d'Anjou, Porte des Pierres Dorées) : zone `null`.
5. DROM : pas de zone DTU 40.x. Ils restent au niveau du département dans `regions.json`.

## Refaire le calcul

```sh
S=<dossier de téléchargement>      # données non fiables : jamais exécutées, seulement lues
curl -L -o $S/dg/communes-france-2026.csv https://static.data.gouv.fr/resources/communes-et-villes-de-france-en-csv-excel-json-parquet-et-feather/20260617-155950/communes-france-2026.csv
curl -L -o $S/dg/communes-france-avec-polygon-2026.geojson https://static.data.gouv.fr/resources/communes-et-villes-de-france-en-csv-excel-json-parquet-et-feather/20260617-160823/communes-france-avec-polygon-2026.geojson
curl -L -o $S/cote/TCH_FRA_V2.zip https://www.datasud.fr/fr/dataset/datasets/2324/resource/2845/download/      # dézipper : TCH.shp/.dbf
curl -L -o $S/ne/ne_10m_coastline.zip https://naciscdn.org/naturalearth/10m/physical/ne_10m_coastline.zip          # dézipper
curl -L -o $S/littoral/bzh_littoral.json "https://geobretagne.fr/geoserver/dreal_b/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=dreal_b:l_communes_littorales&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326"
curl -L -o $S/cog/comsimp2011-txt.zip https://www.insee.fr/fr/statistiques/fichier/2560625/comsimp2011-txt.zip    # et canton2011-txt.zip, dézipper
curl -L -o $S/cog/cog_ensemble_2025_csv.zip https://www.insee.fr/fr/statistiques/fichier/8377162/cog_ensemble_2025_csv.zip   # dézipper dans cog/cog2025
python3 -I telecharger_alti_ign.py $S/dg/communes-france-2026.csv $S/alti/alti_mairie_ign.json
python3 -I calcul_zones.py --communes $S/dg/communes-france-2026.csv --polygones $S/dg/communes-france-avec-polygon-2026.geojson \
  --trait-cote $S/cote/TCH --cote-generale $S/ne/ne_10m_coastline --alti-ign $S/alti/alti_mairie_ign.json \
  --littoral-bzh $S/littoral/bzh_littoral.json --cog-2011 $S/cog/comsimp2011.txt --mvt $S/cog/cog2025/v_mvt_commune_2025.csv \
  --regions ../regions.json --departements 22,29,35,56,44 --sortie bretagne-44.json
# France : même commande sans --departements, avec --compact --sortie france.json
```

Le calcul de la Bretagne prend environ 20 s ; celui de la France, environ 90 s.

## France entière

`france.json.gz` (34 739 communes) : le même calcul sur toute la France, compressé (41 Mo non compressé). `gunzip -k france.json.gz` pour le lire.
