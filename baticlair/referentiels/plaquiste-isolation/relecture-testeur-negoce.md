# Relecture « testeur-négoce » : fiche plaquiste-isolation

Relecture sur papier, du 19/11/2026. Aucune application lancée, aucun fichier du dépôt modifié.

J'ai joué trois vendeurs au comptoir, chacun avec la « liste attendue » de `chantiers-types.md` sous les yeux et sans pouvoir rappeler l'artisan :
- **G** : un généraliste breton (type Point.P ou Gedimat). Il a Placo et Knauf en rayon, vend les plaques au m² et les profilés au ml ou à la pièce.
- **S** : un spécialiste plâtrerie (type Chausson ou SFIC). Il a toute la gamme Placo, Siniat et Knauf, et les vis en boîtes de 500 ou 1 500 chez Placo.
- **K** : un négoce qui ne tient que Knauf et des marques négoce (vis et chevilles Gypso ou Klimas, laine Knauf Insulation).

Chantiers relus en entier : PI-01, PI-03, PI-04, PI-05, PI-07, PI-10, PI-11, PI-13, PI-15. J'ai aussi survolé PI-02, PI-06, PI-09 et PI-17.

## Problèmes relevés

| Gravité | Chantier | Ligne | Ce qui m'empêche de commander | Proposition |
|---|---|---|---|---|
| Bloquant | PI-04, PI-15 (et tout devis à plusieurs ouvrages) | Bande à joint, Enduit poudre, Vis TTPC 25, Vis TRPF 13, Clous + gaz, Plaques BA13 | **Le même article apparaît 2 ou 3 fois**, et chaque ligne est arrondie à un conditionnement entier. Dans PI-15 : 3 rouleaux de bande pour 108 ml (1 suffit), 3 sacs d'enduit pour 25,4 kg (2 suffisent), 2 boîtes TTPC 25 pour 720 vis, 2 boîtes TRPF pour 96 vis, 2 boîtes de clous pour 57 clous. Dans PI-04, la plaque hydro est sur 2 lignes (9 + 3). Au comptoir, je ne sais pas si l'artisan veut vraiment le double ou si c'est une erreur. Je sers le double, et l'artisan paie trop. | Additionner les pièces d'un même article sur tout le chantier, **puis** arrondir au conditionnement. Une ligne par article, avec le détail par ouvrage dans « Précision ». |
| Bloquant | PI-05, PI-06, PI-15 | Complexes de doublage 1,20 × 2,5 m | La ligne ne dit **ni l'isolant ni l'épaisseur** (10+80 PSE ? 13+100 laine ? PSE blanc ou graphité ? R ?). Le devis le dit, mais la liste l'a perdu. Je ne peux rien servir. | Recopier la constitution lue au devis dans la désignation : « Complexe 10+80 PSE, R 2,15 environ, 1,20 × 2,50 m ». Pour K : « type Polyplac ». |
| Bloquant | Tous (PI-01, 03, 04, 08, 09, 10, 13, 15, 17) | Clous + gaz béton, boîte de 500 avec gaz | Clous et cartouches **ne sont pas interchangeables d'une marque de cloueur à l'autre** (Spit Pulsa, Hilti GX, Paslode, Alsafix). La longueur manque aussi (C6 15, 20 ou 32 mm). Le libellé du référentiel dit bien « marque du cloueur à préciser », mais la liste envoyée ne le dit pas. | Question à l'artisan, une fois pour toutes (et à retenir) : « Ton cloueur, c'est quelle marque ? ». Mettre ensuite la marque et la longueur dans la ligne. |
| Bloquant | PI-03 | Plaques BA13 feu 1,20 × 3 m (+ montants, laine) | Un EI 60 ne vaut que **dans le système testé d'un fabricant** (procès-verbal Placo PPF, Knauf KF ou Siniat Prégyfeu). Pour du coupe-feu, je ne peux pas accepter « ou équivalent » ligne par ligne, et je ne peux pas mélanger les marques entre plaques, ossature et laine. K ne peut servir que le système Knauf. | Pour les ouvrages coupe-feu, envoyer « système 98/48 EI 60, marque X » et demander au négoce de chiffrer tout l'ouvrage dans un seul système. Interdire de répartir ces lignes entre plusieurs négoces. |
| Gênant | PI-09, PI-13 (et PI-04) | Clous + gaz béton, « une fixation tous les 60 cm, sous bois » | La ligne dit à la fois « béton » et « sous bois ». La cornière de rive se fixe sur les murs (béton, brique, bois ?), pas sous les solives. Je ne sais pas quel clou servir (C6 béton ou CW bois). Sur brique creuse, le clou à gaz ne tient pas : il faut des chevilles. | Demander le support des murs pour la cornière, séparément de celui du plafond. Ne pas écrire « béton » quand la réponse est « bois ». |
| Gênant | PI-07, PI-13 | GR 32 kraft 100 / Isoconfort 35 kraft 220 **avec** membrane Vario Xtra | Une laine kraft et une membrane pare-vapeur font un double pare-vapeur. Isover associe Vario à de la laine **nue**. Au comptoir, je poserais la question. | Si un pare-vapeur est lu sur le même chantier, demander « laine nue ou kraft ? » ou proposer la version nue. |
| Gênant | PI-07, PI-13 | Membrane / Adhésif (oubli) | **Il manque le mastic de raccord périphérique** (Vario DS en cartouche ou équivalent) et les manchettes de passage de gaines. Tout poseur de Vario en prend. | Suggestion (case proposée) « Mastic d'étanchéité membrane, cartouche 310 ml : 1 pour environ 8 à 10 ml de périphérie ». |
| Gênant | PI-07 | Appuis intermédiaires pour isolant de 100 mm, boîte de 50 | L'appui Optima 2 se choisit **par sa longueur** (75, 100, 120…), et la correspondance avec l'épaisseur de laine change selon la notice (100 mm de laine donne 100 ou 120 ?). K n'a pas Optima. | Écrire la référence d'appui (« Optima 2, 120 mm ») ou « appui réglable pour laine 100 mm + vide ». |
| Gênant | PI-07 | Rails F530, longueurs de 2,35 m | Cette longueur ne vient que d'une source. Chez K, la lisse de la fourrure F47 est un rail U 28 de 3 m : « longueur de 2,35 m » n'existe pas chez lui. | Commander en ml (33,6 ml) et laisser le négoce convertir en barres. Garder 2,35 m comme info. |
| Gênant | PI-04, PI-10, PI-13, PI-15 | Fourrures F530 + Suspentes + Éclisses | K n'a que la fourrure F47 et ses suspentes. Les pièces Placo F530 et Knauf F47 ne s'emboîtent pas entre elles. Si Mobiiz envoie fourrures et suspentes à deux négoces différents, l'artisan reçoit des pièces incompatibles. | Grouper « ossature plafond » (fourrures, suspentes, éclisses, cornières) : toujours chez le même négoce, dans une même marque. |
| Gênant | PI-04, PI-15 | Suspentes longues, boîte de 100 | « Longue », c'est 171 ou 240 mm ? Le libellé du référentiel dit 171, mais la ligne commandée ne le dit pas. | Écrire « Suspente longue 171 mm (plénum 20 à 150 mm) ». |
| Gênant | PI-04 | Montants M48 à 60 cm (cloison de salle de bain) | En salle de bain, il y a presque toujours de la faïence. Sur une 72/48 en simple peau, il faut alors des montants **à 40 cm** (14 montants au lieu de 10). Je l'aurais signalé à l'artisan. | Pour les plaques hydro en cloison, demander « faïence dessus ? ». Si oui, mettre les montants à 40 cm par défaut. |
| Gênant | PI-10 | Plaques BA13 standard (titre « plafond coupe-feu ») | Le titre parle de coupe-feu, mais la liste sert de la plaque standard. Le devis ne dit pas « feu ». Si c'est vraiment du coupe-feu, on retombe sur le problème de PI-03. | Si un mot « coupe-feu », « EI » ou « REI » est lu (titre compris), demander la performance et la marque. |
| Gênant | PI-03 | Enduit poudre 2 sacs (39,6 kg) | En double peau, on garnit aussi les joints de la 1re peau, sans bande. Le calcul ne compte que la peau de finition, donc il manquera de l'enduit. | Ajouter environ 0,15 à 0,2 kg/m² par face pour la 1re peau, soit 3 sacs ici. |
| Gênant | PI-15 (et PI-05 pour un vieux mur) | Mortier adhésif MAP, 2 sacs (46,8 kg pour 26 m²) | Environ 1,8 kg/m², c'est juste sur un mur ancien qui n'est pas plan. En rénovation d'appartement, on compte plutôt 2,5 à 3 kg/m². | En rénovation, prendre 2,5 kg/m² par défaut, soit 3 sacs. |
| Gênant | PI-11 | Comblissimo, 18 sacs de 17,3 kg | Le nombre de sacs dépend du **certificat du produit**. K (Knauf Supafil) ou G (autre marque) n'aura pas le même nombre de sacs pour R 7. Il manque aussi la **location de la souffleuse**, les piges de repérage, les rehausses de trappe et les protections de spots, que tout le monde demande. | Envoyer « 80 m² à R 7 » et laisser le négoce convertir en sacs selon son produit. Ajouter en suggestion : souffleuse (location), piges, coffrages de spots, rehausse de trappe. |
| Gênant | Tous les isolants (PI-02, 03, 07, 13…) | GR 32 Nu 45 « colis de 12,15 m² », Isoconfort 35 « colis de 3,36 m² » | Les m² par colis sont ceux d'Isover. Chez K (Knauf Insulation), un « colis » n'a pas la même surface, donc le nombre de colis change. | Commander en **m² + épaisseur + R + nu/kraft**, et donner le nombre de colis Isover seulement à titre d'information. |
| Gênant | PI-01 | Clous + gaz pour le rail haut | En maison neuve, le plafond est souvent déjà en plaques sur fourrures. Au plafond, le rail se fixe alors par vis dans les fourrures, pas au clou à gaz. | Poser la question « rail haut : sous dalle béton ou sous plafond plaque ? ». |
| Détail | Tous | Vis TTPC 25 / 35, boîte de 1000 | Chez Placo, les boîtes sont de 500 ou 1 500 : S ne sert pas de boîte de 1000 en Placo. | Écrire « boîte (1000, ou 500 / 1500 selon la marque) », ou donner la quantité de vis et laisser le négoce choisir la boîte. |
| Détail | Tous | Vis TRPF 13, boîte de 500 | Klimas et Gypso vendent par 1000. Beaucoup de plaquistes sertissent à la pince et ne prennent pas de TRPF. | Mettre cette ligne en suggestion, avec le nombre de pièces. |
| Détail | Tous | Montants M48 longueur 2,49 m | C'est juste chez Placo, mais K et G vendent aussi en 2,50, 2,60 ou 3,00 (longueurs Knauf). | « M48 pour hauteur 2,50 (2,49 ou 2,50 selon la marque) ». |
| Détail | PI-04, 09, 10, 13, 15 | Éclisses « 1,5 pièces », « 5,25 pièces » ; suspentes ou chevilles en boîte de 100 pour 17 à 27 pièces | Des pièces à virgule, ça n'a pas de sens au comptoir. Il faut aussi dire à l'artisan qu'il paie une boîte entière pour quelques pièces. | Arrondir les pièces à l'entier. Signaler « boîte entière, il en restera ». |
| Détail | PI-04, PI-15 | « Clous de fixation des rails (Clous + gaz béton) » et « Clous de fixation (Clous + gaz béton) » | Le même article porte deux noms différents. | Un seul nom par article (lié au regroupement ci-dessus). |
| Détail | PI-04, PI-07, PI-10, PI-15 | Cornières de rive | La ligne ne dit pas « CR2 » (le terme du comptoir). Chez K, c'est la « cornière U/L 30 » de Knauf. | Écrire « Cornière de rive CR2 (ou équivalent) 3 m ». |
| Détail | G breton | Toutes les plaques et tous les profilés | Quéguiner facture les plaques **au m²** (1 plaque = 3 m²) et les profilés au ml. « 32 plaques » se convertit, mais il faut que la saisie de l'offre l'accepte. | Côté offre négoce, accepter un prix au m² ou au ml et convertir. |

## Familles qui passent sans problème

- **Plaques BA13 standard et hydro H1** : désignation claire et longueur donnée. Les quantités sont cohérentes (environ 5 % de chute).
- **Rails R48** en longueurs de 3 m : standard partout, quantités justes.
- **Fourrures F530** en longueurs de 3 m : bonnes pour G et S (pour K, voir « système »). Entraxe de 40 cm bien appliqué à l'hydro en plafond.
- **Suspentes sécables**, boîte de 50 : bon conditionnement, bonne plage de plénum pour 30 cm.
- **Bande à joint**, rouleau de 150 m : article et quantité au m² justes (en dehors des doublons).
- **Enduit poudre** (sac de 25 kg) et **enduit prêt à l'emploi** (seau de 25 kg) : environ 0,33 kg/m² par face, c'est réaliste. Le seau Placomix Pro fait 22 kg, mais cela ne bloque pas.
- **Membrane Vario Xtra**, rouleau de 60 m², et **adhésif KB1**, rouleau de 40 m : articles exacts et quantités justes.
- **Chevilles 6 × 40**, sachet de 50 : claires.
- **Vis TTPC 35 pour la 2e peau** : bonne logique (25 pour la 1re peau, 35 pour la 2e).
- Bonne règle : la ligne « Bandes et enduit sur l'ensemble » (PI-15) n'est pas recomptée.

## Ce qui manque à la fiche selon un vendeur

1. **Regrouper les articles sur tout le chantier** avant d'arrondir aux conditionnements. C'est le premier point à corriger.
2. **Garder la constitution lue au devis** dans la désignation envoyée : complexe (plaque + isolant + épaisseur + R), produit à souffler, type de laine.
3. **Marque du cloueur** et **support** (béton, brique, bois, plafond plaque), demandés séparément pour le sol, le plafond et les murs de la cornière.
4. **La notion de « système »** : plafond (fourrure, suspente, éclisse) et coupe-feu doivent rester chez un seul négoce, dans une seule marque.
5. **Les isolants commandés en m² + R + épaisseur + nu/kraft**, et non en colis Isover. Le vrac se commande en m² + R.
6. **Articles qu'un plaquiste prend toujours et que la fiche ne propose pas** (en suggestion) :
   - bande armée ou cornière pour les angles saillants ;
   - mastic de membrane et manchettes ;
   - bande résiliente ou joint mousse sous les rails (acoustique) ;
   - renforts ou huisseries de porte dans les cloisons ;
   - trappes de visite ;
   - complexes plus fins pour les tableaux de fenêtre ;
   - location de souffleuse, piges et protections de spots pour le soufflage.
7. **Questions de métier manquantes** : « faïence sur la cloison ? » (montants à 40 cm), « coupe-feu ? quelle performance ? », « laine nue ou kraft avec la membrane ? ».
8. **Une unité de commande sans marque pour les ossatures** (ml plutôt que « longueur de 2,35 m », longueur « 2,49 ou 2,50 ») pour qu'un négoce non Placo puisse répondre.
