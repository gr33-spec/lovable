# Couvreurs de Bretagne : sources de la page

Page : `/couvreurs-bretagne` (fiche `apps/web/src/lib/regions/couvreurs-bretagne.ts`). Recherche du 19 novembre 2026.
Règle : chaque fait de la petite histoire est confirmé par **au moins deux sources sérieuses** ; en cas de doute, la phrase
est retirée. Le test `apps/web/e2e/couvreurs-bretagne.spec.ts` (« chaque fiche ») refuse une phrase à une seule source.
Le détail complet de la recherche (citations, faits écartés) est dans `recherche-bretagne-brute.md`.

## Ce que dit la page, et ses sources

| Phrase de la page | Sources |
|---|---|
| Les schistes ardoisiers du bassin de Châteaulin, jusqu'à Maël-Carhaix, datent du Carbonifère inférieur. | INERIS 2003 (§ 3.3) ; Préfecture 22, dossier 2016-791 |
| Au XIXe siècle, l'ardoise s'est généralisée dans le Finistère, à la place d'une partie des toits de chaume ; dans le golfe du Morbihan, le chaume a reculé au début du XXe siècle, souvent remplacé par l'ardoise. | Ministère de la Culture, fiche « La volumétrie de toiture » (Finistère) ; Ministère de la Culture, fiche « Savoir-faire chaumiers » |
| Maël-Carhaix a été le grand site ardoisier breton du XXe siècle ; l'ardoisière souterraine a fermé en 2000. | INERIS 2003 ; Préfecture 22, dossier 2016-791 ; Préfecture 22, rapport d'enquête 2018 |
| L'ardoise espagnole arrive à partir de 1965 et précipite le déclin des ardoisières françaises ; depuis Trélazé (2014), la France ne produit plus d'ardoise, elle est importée. | AD Maine-et-Loire, répertoire 124 J ; Inventaire Pays de la Loire, « Le schiste ardoisier » ; FFB |
| Littoral Manche et Atlantique jusqu'à Lorient : zone la plus sévère vent et pluie ; environ 5 km depuis la côte, îles, presqu'îles : site « exposé », recouvrement à étudier. | Guide Culture 2011 (§ 3.2.1, 3.2.2) ; Cupa Pizarras, catalogue architecte |
| Le recouvrement fait l'étanchéité ; il dépend de la région, de la pente, de la longueur du versant et de la fixation, et donne le pureau. | Guide Culture 2011 (§ 3.2.2 à 3.2.5) ; Cupa Pizarras, catalogue architecte |
| Pose au clou (ancienne) ou au crochet (depuis la fin du XIXe siècle) ; crochet visible teintable. | Guide Culture 2011 (§ 3.4) ; Cupa Pizarras, gamme Monuments historiques |
| En front de mer, seul un inox au molybdène (type 316 Ti) ; l'inox 17 % est déconseillé en bord de mer. | Frénéhard, fiche NF DTU 40.11 (2020) ; Bati Avenue, fiche crochet inox 17 % |
| Règles de pose : NF DTU 40.11, révisé en décembre 2020 (seule son existence est citée, jamais son texte). | FFB ; Frénéhard |

Faits **retirés** (une seule source sérieuse, ou chiffre de fabricant seul) : l'âge en millions d'années, les ardoisières des
monts d'Arrée (Inventaire seul, Wikipédia en complément), la part de l'Espagne dans l'ardoise posée en France, « 90 % de
l'ardoise d'Europe », la pose sur voliges jointives typique de la Bretagne, les faîtages à lignolets, le granite dans
l'architecture bretonne, le zinc en Bretagne, les pentes de 40 à 45° et le minimum de 42° du Finistère.

Liens de chaque source : voir la liste `sources` de la fiche (affichée sous « Les sources » en bas de l'histoire).

## Photos

Toutes de Wikimedia Commons, licence vérifiée sur la page du fichier, usage commercial permis, aucune personne
reconnaissable, aucune marque. Converties en WebP et redimensionnées (métadonnées retirées) : c'est une modification, dite
« redimensionnée » dans le crédit ; sous CC BY-SA, l'image modifiée reste sous la même licence.

| Fichier (`apps/web/public/regions/bretagne/`) | Sujet | Auteur | Licence | Page source |
|---|---|---|---|---|
| `toit-ardoise.webp` (1600 × 1200) | Toit d'ardoise et faîtage, Le Creisquer, Botmeur (29) | Henri Moreau | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:2010._Botmeur._Creisquer._Lignolet._D%C3%A9tail.JPG |
| `maison-pierre-ardoise.webp` (1200 × 900) | Maison de pierre et d'ardoise, Botmeur (29) | Henri Moreau | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:2010._Botmeur._Creisquer._Maison_%C3%A0_lignolet..JPG |
| `maison-granit-brehat.webp` (1200 × 800) | Bâtisse en pierre et ardoise, Île-de-Bréhat (22) | Gzen92 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Batisse_(%C3%8Ele-de-Br%C3%A9hat).jpg |
| `littoral-brehat.webp` (1200 × 803) | Pointe du Paon, Île-de-Bréhat (22) | JLPC | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Br%C3%A9hat_granit_pr%C3%A8s_Paon.jpg |

Écartée : la vue de Loguivy-de-la-Mer (brume et lampadaires au premier plan, un logo sur un bâtiment).

**Mettre tes propres photos** : remplace le fichier sous le même nom (WebP, même orientation), puis corrige dans la fiche la
largeur, la hauteur, la légende et le crédit (« Photo : » suivi de ton nom suffit pour les tiennes, sans licence). Le test
vérifie seulement que le fichier existe et qu'un crédit est écrit.

## Carte

Tracés des départements : IGN Admin Express (édition 2018) via le dépôt public gregoiredavid/france-geojson, Licence ouverte
Etalab ; noms et codes INSEE. Générés par `apps/web/scripts/gen-carte-france.mjs` dans `src/lib/regions/carte-france.ts`
(le crédit est en bas de la page).
