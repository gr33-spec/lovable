# Fiche plaquiste-isolation — CHANGELOG

## plaquiste-isolation-2026.11.20-1 — Première version (mission de nuit, 19-20 novembre 2026)

- Fiche écrite au format de la couverture : `FICHE.md` (lisible, classée familles › systèmes › marques, source à côté de
  chaque chiffre) et `referentiel.json` (même schéma que `referentiels/couverture/referentiel.json`, validé par
  `loadReferential` : 10 ouvrages, 39 produits).
- Ouvrages : cloison distributive (72/48 à 150/100), cloison séparative SAA / SAD, doublage collé, doublage sur fourrures
  et appuis, contre-cloison sur montants, plafond sur fourrures et suspentes, bandes et enduit seuls, isolant en rouleaux
  ou panneaux, soufflage en combles perdus, membrane pare-vapeur.
- Toutes les valeurs restent `draft` (à relire par un plaquiste) ; l'état de recherche (2 sources, 1 source, à confirmer,
  contradiction) est dans la note de chaque valeur.
- 17 chantiers types calculés par le moteur de Mobiiz (`chantiers-types.md`).
- Relecture par le testeur-négoce (`relecture-testeur-negoce.md`) ; corrigé dans cette version : un seul total par article
  sur le chantier (jeu de test), caractéristiques du complexe gardées, marque du cloueur demandée (habitude), montants à
  40 cm lus au devis « sous faïence », PI-10 en plaques feu.
- **Métier toujours fermé** : rien n'est branché.

## plaquiste-isolation-2026.11.20-2 — Troisième passe de recherche (recherche/07)

- Membrane : majoration 1,10 m²/m² et recouvrement de 10 cm confirmés (deux sources ou plus) ; rouleaux Intello / Majrex
  (75 m²) et Knauf LDS (100 m²) ajoutés à la fiche lisible.
- Locaux humides : montants à 0,40 m sous carreaux de plus de 1 600 cm² en parement simple (AQC, Knauf, guide DTU 2022).
- Isolants PSE sous chape, XPS, isolants minces (statut AQC), suspentes Intégra 2, seuils CEE 2026 et R « élément par
  élément » : dans `FICHE.md`, pas encore d'ouvrage dans `referentiel.json`.

## plaquiste-isolation-2026.11.20-3 — Deuxième passe « viser 98 % » (Greg, 20 novembre 2026)

- Décisions de Greg écrites : vis et fixations d'office ; bande et enduit en cases ; coupe-feu d'une seule marque
  (question « Quelle marque ? », lignes marquées « à chiffrer en entier dans cette marque », laine du système d'office,
  entretoises PRF Placo, REI en plafond).
- Taux de chiffres confirmés par deux sources : 59 % → 91 % (90 % avec le nouvel ouvrage coffrage). Recherches
  `recherche/09` à `15`.
- Règles changées : vis 30/m² confirmé (Placo actuel 29,19) ; montants doublés (les deux montants de bout ne se doublent
  pas) ; TRPF doublés 6 (0,60) et 10 (0,40) ; fourrure horizontale des appuis en doublage Optima ; suspentes 1,56/m²
  (avant 1,8) ; éclisses par fourrure de 3 m ; plus de TRPF en plafond (suspentes clipsées) ; 1re peau de plafond 3 / 4
  vis/m² ; 98/48 doublés 3,75 m ; mortier adhésif 1,8 (mur plan) / 2,5 (mur irrégulier) ; adhésif de membrane 0,8 ml/m² ;
  GR 32 Nu 45 (retiré par Isover) remplacé par URSA PRK 32 45 ; tables de soufflage séparées par niveau de preuve.
- Nouvel ouvrage `coffrage` (soffite, caisson) : règle proposée, à confirmer ; chantier type PI-18.
- Chantiers types : `recherche/14-chantiers-avant-apres.md` (ancienne et nouvelle valeur, raison, source).

## plaquiste-isolation-2026.11.20-4 — Réponses de Greg et cinquième vague (20 novembre 2026)

- Décisions de Greg, valeurs « vérifiées » (comme la couverture) :
  - 2 montants par porte écrite au devis ;
  - vis de doublage et de contre-cloison selon la marque écrite (Placo 11, Siniat 12), sinon 15 ;
  - suspentes 1,56/m² et 98/48 en 3,75 m validés ;
  - mortier adhésif : question gardée ;
  - coupe-feu : un négoce sans la marque peut proposer un système complet d'une autre marque avec son PV, signalé à l'artisan, jamais de mélange ;
  - coffrages : règle acceptée, lignes « à vérifier » avec le calcul visible.
- FDES Placo (base INIES) en 2e source : montants, rails, TRPF, fourrures, appuis, plaques.
- Règles changées :
  - 1re peau d'un plafond en 2 BA13 : retour à 8 vis/m² (le 3 de Placo est contredit par sa FDES 2026) ;
  - Igloo en sacs de 10 kg (avant 12,5) ;
  - entretoises du plafond feu Placo : Stil Flam, 1,3/m² (avant PRF 2,6/m², système retiré).
- Taux : 91 % des chiffres confirmés (88 % par deux sources, 3 % validés par Greg).

## plaquiste-isolation-2026.11.20-5 — Montage et cornière tranchés par la recherche (20 novembre 2026)

- Greg : « c'est à toi de chercher tes réponses, n'invente rien ». Plus aucune question technique pour lui (`recherche/18-trancher-montage-corniere.md`).
- Montage par défaut tiré de la hauteur : les seuils de la fiche sont confirmés (72/48 : 2,50 / 2,75 / 3,05 / 3,40 m ; contre-cloison M48 : 2,00 / 2,25 / 2,40 / 2,65 m). Ordre simples 0,40 avant doublés 0,60 : 21 % de montant en moins ; reste à confirmer par un plaquiste.
- Règle changée : au-delà du tableau, les montants sortent « à vérifier » avec la raison (avant : doublés à 0,40 sans mot).
- Règle changée : le périmètre d'un plafond écrit au devis est lu (nouvelle donnée `perimetre`) ; sinon il est estimé et dit comme hypothèse (avant : toujours estimé, sans être dit).
- Vis de plafond 12/m² et TRPF doublés 0,40 à 10/m² : écarts entre sources expliqués (vis de rive ; espacement de l'assemblage), plus des contradictions.
- Les 18 chantiers types : aucune quantité ne change.

## plaquiste-isolation-2026.11.20-6 — Sixième vague : vis, plafond feu, produits (20 novembre 2026)

- Recherches `recherche/19` (vis et fixations) et `recherche/20` (plafond feu et produits).
- Règle changée : entretoises Stil Flam du plafond feu Placo, 1,3 → 1,7 par m² (quatre FDES Placo ; le 1,3 oubliait rives et coupes).
- Règle changée : vis de la peau visible d'un plafond feu, 23 → 13 par m² (avec Stil Flam, Placo visse comme un plafond standard ; 23 ne valait que pour le PRF) ; reste « à confirmer ».
- Chantier PI-10 : entretoises 52 → 68 ; vis TTPC 35 920 → 520 (toujours 1 boîte de 1000).
- Fiche lisible : Glasroc H Ocean 40 plaques par palette, R du Styrodur 3035 CS (aucun certificat ACERMI en cours), Siniat D102/48 EI 120 (2 + 1 BA18), formats KF 13 et Fermacell, plafonds feu Siniat.
- Sans deuxième source indépendante, gardés « à confirmer » : vis Knauf (15), séparative 1re peau (12), plafond à 0,40 (15 vis, 3,0 ml), adhésif de membrane (0,8), fixation en bout de rail (non comptée).

## Septième vague, coupe-feu (20 novembre 2026, `recherche/22`)

- Fiche lisible §5.8 bis : 98/48 EI 120 Placo à 3,00 m avec laine (avant 3,10 m) ; 98/48 BA 25 EI 120 à 3,80 m ; EI 60 en 100/70 ; EI 90 absent chez Placo et Siniat → système EI 120 de la marque ; isolant = celui du PV ; vissage, bande et enduit identiques au standard ; boîtiers, gaines, trappes, plafond autoportant REI 120, protection de poteaux.
- Rien ne change dans `referentiel.json` (les nouveaux systèmes sont décrits, à brancher comme ouvrages).

## plaquiste-isolation-2026.11.20-7 — Séparatives SAA / SAD corrigées (20 novembre 2026, `recherche/21`)

- Règle changée : montants doublés (0,60 jusqu'à 2,75 m, 0,40 jusqu'à 3,00 m), avant deux files simples à 0,60 ; au-delà de 3,00 m, ligne « à vérifier ».
- Règle changée : rails SAA sur tout le pourtour (2L + 2H), avant 2L.
- Règle changée : TRPF 10 (doublés 0,60) et 14 (0,40), avant 4 ; vis des plaques 15 / 35 et 21 / 47, avant 12 / 30.
- Nouveau d'office : ruban résilient sous les rails bas (rouleaux de 15 m) et mastic acrylique en pied (1 cartouche pour 3 m², quantité d'une seule source).
- Chantier PI-14 : montants 33 → 62 ; TRPF 88 → 220 ; vis 264 → 330 et 660 → 770 ; + 2 rouleaux de ruban, + 8 cartouches de mastic.

## plaquiste-isolation-2026.11.20-8 — Isolation approfondie (20 novembre 2026, `recherche/23`)

- Nouveau : piges de repérage d'épaisseur en case à cocher dans le soufflage (une pour 25 m², 4 au moins ; AQC / Proreno et Biofib).
- Fiche lisible §8.5 : R des complexes collés à demander (deux isolants à même épaisseur), épaisseur maxi collée (DTU 25.42/A1 2026), plots de colle, aucune cheville de sécurité d'office, R de deux couches = somme, rampants (fourrures, suspentes Intégra 1,5/m²), combles en rouleaux (2e couche nue), conduits et spots, charge maxi de 6 kg/m² sur plafond (alerte ouate R 7), sous-face de plancher, textes et aides en vigueur.
- Chantiers types : aucune quantité ne change (piges non cochées).
