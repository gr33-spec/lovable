# Consignes communes aux chercheurs (mission plaquiste-isolation, 19-20 novembre 2026)

But : Mobiiz (application d'achat de matériaux pour artisans) doit transformer une ligne de devis de plaquiste
(« 45 m² cloison 72/48 », « doublage collé 30 m² ») en liste complète à commander chez un négoce, jusqu'à la dernière vis.
Tu es un plaquiste-isolateur expérimenté ET un vendeur de comptoir de négoce.

Règles de qualité (impératives) :
1. Sources : documentations techniques / guides de pose / fiches produits des fabricants (Placo-Saint-Gobain, Knauf,
   Siniat, Fermacell/James Hardie, Isover, Rockwool, Ursa, Knauf Insulation, Steico, Pavatex/Soprema, Gutex, Igloo,
   Soprema, etc.), NF DTU 25.41 / 25.42 / 45.10 / 45.11 / 45.10, Avis Techniques / DTA CSTB, catalogues de négoces
   (Point.P, Gedimat, BigMat, Tout Faire, Samse, Chausson, Dispano, Doras, Leroy Merlin/Brico Dépôt/Castorama en appoint).
2. Versions en vigueur seulement (édition DTU et doc fabricant les plus récentes). Si un document ancien est utilisé, dire
   pourquoi la valeur n'a pas changé et comment tu l'as vérifié.
3. Chaque chiffre : au moins DEUX sources indépendantes, dont au moins un fabricant ou un DTU. Si elles divergent,
   chercher pourquoi (système, hauteur, entraxe, marque, édition) et l'écrire.
4. Ce qui reste incertain : statut « à confirmer » + la raison. Jamais présenté comme sûr.
5. Noter l'URL et la date de consultation à côté de chaque chiffre.
6. Le curl direct vers les sites fabricants renvoie 403 : utilise tes outils WebSearch / WebFetch. Les PDF peuvent
   être lus via WebFetch quand c'est possible ; sinon les extraits des moteurs de recherche, en le disant.
7. Écris AU FUR ET À MESURE dans ton fichier de résultats (Write puis Edit), section par section, pour que rien
   ne soit perdu si tu es interrompu. Ne touche à AUCUN autre fichier du dépôt.
8. Pistes déjà écrites (à revérifier, pas à recopier) : baticlair/docs/referentiels/platrerie-isolation.md,
   isolation.md, isolation-des-combles.md, plafonds-suspendus.md, baticlair/referentiels/platrerie-isolation/tiroir.json.

Format de sortie : Markdown, tableaux. Colonnes minimales :
| Donnée | Valeur | Unité | Source 1 (URL, date) | Source 2 (URL, date) | Statut | Note |
Statut ∈ « confirmé (2 sources) », « 1 source », « à confirmer (raison) », « contradiction (détail) ».
Termine ton fichier par : « Bilan » (nombre de chiffres, nombre confirmés 2 sources, liste des à confirmer) et
« Sources » (liste numérotée, URL, éditeur, date du document, date de consultation).
