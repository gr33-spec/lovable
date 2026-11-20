# Photos par défaut du site d'artisan

Greg, 17 novembre 2026. Chaque métier a une vraie photo de couverture, libre de droits, qui autorise l'usage commercial. Elle sert tant que l'artisan n'a pas mis la sienne. Code : `packages/domain/src/page-entreprise/photos-defaut.ts`. Fichiers : `apps/web/public/site/photos/` (`<id>.webp|avif`, 1920 px au plus ; `<id>-800.webp|avif`).

## Règles

- La photo suit le métier principal ; une entreprise de plusieurs métiers prend la photo neutre `neutre-1`.
- L'artisan peut en choisir une autre dans la galerie (`photo_defaut`), ou mettre la sienne : elle passe devant.
- Crédit : pour une licence CC BY ou CC BY-SA, « Photo d'accueil : auteur, licence, Wikimedia Commons » en petit en pied de page, seulement quand la photo par défaut est affichée. CC0 : rien.
- CC BY-SA : une photo recadrée garde la même licence (recadrages : `roofing`, `tiling`).
- Aucune photo générée par une IA : aucun outil de génération d'images n'est branché. Les photos viennent toutes de Wikimedia Commons (Unsplash, Pexels, Openverse et Flickr refusaient l'accès automatique).

## Métiers sans photo propre

- Chauffage, ventilation (`hvac`) : chaque pompe à chaleur montrait sa marque ; la seule propre était couverte de givre. Photo neutre.
- Menuiserie intérieure, agencement (`interior_joinery`) : rien de moderne sans visage ; prend la photo de la menuiserie.
- Constructeur, entreprise générale, autre métier : photo neutre.

## Crédits

| Photo | Ce qu'elle montre | Auteur | Licence | Source |
|---|---|---|---|---|
| `roofing` | Couverture en tuiles en cours : liteaux, tuiles en piles et pans déjà couverts | Hauserphoton | CC BY-SA 3.0 | [source](https://commons.wikimedia.org/wiki/File:Dachdeckerarbeiten.jpg) |
| `masonry` | Murs en parpaings montés sur soubassement en briques, extension en chantier | Kolforn | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:-2021-01-22_Cavity_wall_construction,_Trimingham,_Norfolk_(4).JPG) |
| `drywall` | Cloisons en plaques de plâtre sur ossature métallique, joints enduits | Asurnipal | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Dornbirn-Krankenhaus-Neubau-Operation-OP4-01.jpg) |
| `painting` | Bac et rouleau de peinture sur bâche de protection, mur fraîchement peint | James Lee from Chester, NH, USA | CC BY 2.0 | [source](https://commons.wikimedia.org/wiki/File:Finish_Line_(4477301427).jpg) |
| `tiling` | Pose de grands carreaux au sol : ventouse, colle peignée, croisillons de calage | Frank Winkelmann | CC0 | [source](https://commons.wikimedia.org/wiki/File:Verlegen_von_Fliesen_mit_einem_Nivelliersystem.jpg) |
| `flooring` | Pose de lames de parquet stratifié sur sous-couche | Raphael Mecke | CC BY 4.0 | [source](https://commons.wikimedia.org/wiki/File:CLASSEN_Verlegung_Laminat.jpg) |
| `electrical` | Raccordement d'une prise : fils phase, neutre et terre dans le boîtier | Santeri Viinamäki | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Electrician_installing_socket.jpg) |
| `plumbing` | Brasure d'un tube cuivre au chalumeau sur l'établi | Le plombier du désert | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Brasure_sur_tube_cuivre,_la_brasure.jpg) |
| `joinery` | Ponçage d'un panneau de porte en bois massif à l'atelier | Minette Lontsie | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Menuisier_10.jpg) |
| `carpentry` | Charpente neuve : chevrons en bois sous un ciel bleu | Leo Miregalitheo | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Dachstuhl_Mansardgiebeldach2.jpg) |
| `waterproofing` | Membrane d'étanchéité caoutchouc posée sur toiture-terrasse et chéneau | Luanr36 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Butynol_roofing.jpg) |
| `cladding` | Bâtiment neuf entièrement bardé de lames de bois horizontales | Des Blenkinsopp | CC BY-SA 2.0 | [source](https://commons.wikimedia.org/wiki/File:Timber_Cladded_House,_Ampney_Crucis_-_geograph.org.uk_-_6960047.jpg) |
| `facade` | Maison enduite en cours de ravalement, échafaudage en façade | Mafo | CC BY 4.0 | [source](https://commons.wikimedia.org/wiki/File:75_Gda%C5%84ska_St.jpg) |
| `ceiling` | Faux plafond : ossature métallique, dalles en cours de pose, isolant au-dessus | MTA Capital Construction Mega Projects | CC BY 2.0 | [source](https://commons.wikimedia.org/wiki/File:Running_wiring_and_installing_circuitry_in_the_ceiling_of_the_future_LIRR_concourse._10-09-2019_(48882249506).jpg) |
| `kitchen` | Cuisine équipée moderne ouverte sur la salle à manger | Shixart1985 | CC BY 2.0 | [source](https://commons.wikimedia.org/wiki/File:Modern_kitchen_and_dining_area_with_stylish_furnishings_and_natural_light_in_a_contemporary_home_setting.jpg) |
| `solar` | Pose de panneaux photovoltaïques sur un toit en tuiles | Stefan Thiesen | CC BY-SA 3.0 | [source](https://commons.wikimedia.org/wiki/File:Installation_of_photovoltaic_modules_on_roof.jpg) |
| `decking` | Terrasse en lames de bois devant une maison | Øyvind Holmstad | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Kebony_terrassebord_8.JPG) |
| `paving` | Pavage en pavés de granit en arcs, chantier en cours | BrankaVV | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Sett_paving_process.jpg) |
| `earthworks` | Pelle mécanique en terrassement sur un terrain à bâtir | Triplec85 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Bagger_auf_einer_Baustelle_in_Tauberbischofsheim_2.jpg) |
| `irrigation` | Arroseurs escamotables en marche sur une pelouse | Angelo DeSantis from Berkeley, US | CC BY 2.0 | [source](https://commons.wikimedia.org/wiki/File:Sprinklers_%2B_good_light_%2B_400mm_lens_(7894662586).jpg) |
| `metalwork` | Soudure à l'arc sur une structure en acier, soudeur masqué | Kgequipment | CC BY-SA 3.0 | [source](https://commons.wikimedia.org/wiki/File:Welding_Steel_Plate.JPG) |
| `neutre-1` | Maisons neuves en construction : murs montés, fermettes posées, échafaudage | Sebastiandoe5 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:New-build_Under_Construction.jpg) |
| `neutre-2` | Façade d'immeuble ancien entièrement rénovée | Wikibenchris | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Renovated_facade_5_Krasinskiego.jpg) |
| `neutre-3` | Chantier de maisons neuves en blocs, grues, terrain propre | Geolina163 | CC BY-SA 4.0 | [source](https://commons.wikimedia.org/wiki/File:Neubaugebiet_Efferen_West_41.jpg) |
| `neutre-4` | Maisons neuves terminées, enduit clair et toit en ardoise | Retired electrician | CC0 | [source](https://commons.wikimedia.org/wiki/File:Borovsky_district_-_Oct.2023_new_house_construction_(DXO).jpg) |

Les candidates écartées et leurs raisons (visages, marques, pose douteuse) : gardées hors du dépôt, dans le rapport de recherche.
