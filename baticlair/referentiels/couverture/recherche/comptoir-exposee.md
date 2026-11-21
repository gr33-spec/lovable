# Comptoir et situation exposée : cinq questions du testeur-négoce (20 novembre 2026)

Données et sources : `comptoir-exposee.json` (22 entrées, 5 verdicts, 4 fiches comptoir).
Statuts : 6 `confirme`, 9 `une_source`, 7 `a_confirmer`. Aucun texte de DTU n'a été recopié : seulement les valeurs, lues dans
une copie non officielle et dans des guides qui les citent. Points.P, Leroy Merlin et Tecnomat refusent les robots : leurs
chiffres viennent des titres de fiche lus par le moteur de recherche (indiqué dans chaque source).

## 1. Faîtière Armor 33 Edilians (réf. 729)

| Valeur | Retenu | Statut | Sources |
|---|---|---|---|
| Nombre au ml | **3** (longueur utile 0,33 m ; 1 000 ÷ 330 = 3,03) | confirme | Point.P / Bretagne Matériaux « 3 / ml » ; Tanguy « (0,33 m) » ; Leadermat / Quéguiner « 0,33 » ; nom Edilians « 33 » |
| Recouvrement entre faîtières | 40 mm (370 hors tout − 330 utile) | une_source (calcul) | Edilians 370 mm + négoces 0,33 m |
| Coloris | Rouge C1029, Vieilli Masse C1044, Émaillé Brun (sur commande, environ 3 fois plus cher) | confirme | Edilians, Tanguy, Quéguiner |
| Palette | 184 (Rouge, Vieilli Masse) ; 176 en Émaillé Brun | confirme / une_source | catalogue Ardoise 360, Leadermat ; Quéguiner |
| Faîtière ardoise de 40 (réf. 720) | 2,5 au ml (0,40 m utile, 445 hors tout) | une_source | Point.P « ardoisée bretagne 2,5 / ml », Tanguy « (0,40 m) » |

Edilians n'écrit nulle part le nombre au ml : le « 3 » n'est pas `confirme_fabricant`. Commande : 3 au ml + 1 par about,
arrondi au supérieur.

## 2. Palettes d'ardoise naturelle hors 32×22

Aucun fabricant (Cupa, Samaca, Rathscheck) ne publie de nombre par palette. Les négoces, si :

| Format | Par palette | Statut | Source | Contrôle (poids Cupa, 2,8 g/cm³) |
|---|---|---|---|---|
| 27×18 | 2 800 | une_source | Leroy Merlin / Tecnomat (Europe Matériaux) | 1 333 kg à 3,5 mm |
| 40×22 | 1 500 | une_source | idem | 1 293 kg |
| 40×25 | 950 (Samaca 55, 4 mm) ; 900 chez LM | une_source | Apok ; LM | 1 064 kg |
| 35×25 | 800 | une_source | LM / Tecnomat | ardoise épaisse probable (980 kg à 5 mm) |
| 46×30 | 700 | une_source | LM / Tecnomat | 1 352 kg à 5 mm |
| 30×20, 33×23, 35×22, 45×30, 50×25 | non publiés | a_confirmer | — | estimation : ≈ 2 300 / 1 810 / 1 790 / 710 / 770 |

- **Règle par le poids** (`a_confirmer`) : palette ≈ 1 350 kg (de 1,0 à 1,45 t selon les négoces) ÷ poids unitaire
  (Cupa : L × l × e × 2,8 g/cm³ ; 32×22 3,5 mm = 0,690 kg). Elle retrouve les chiffres publiés à 10 % près. Ordre de
  grandeur seulement : le vendeur donne le vrai nombre.
- **Correction** : Sobemat vend au **mille** ; ses « 690 kg » (32×22) et « 862 kg » (40×22) sont le poids d'un mille, pas
  d'une palette (contrôle : 1 000 × 0,862 kg).

## 3. Crochets à pointe quand on pose à l'agrafe sur liteaux

- **Retenu : 1/5 de pointes sur liteaux, 100 % sur voligeage** (`une_source`). Le chiffre n'est écrit que dans le manuel CAP.
- Où vont les pointes (Ministère de la Culture, cours BTS, tutoriel Leroy Merlin : principe confirmé) : au droit de chaque
  chevron ou contre-liteau, là où l'agrafe ne passe pas ; à l'égout sur volige (doublis et premier rang). Les rives se
  clouent (2 clous), elles ne prennent pas de crochet.
- Contrôle par la géométrie : de 10 % (contre-liteau de 4 cm, entraxe 60) à 17 % (chevron de 8 cm), plus 5 à 7 % pour
  l'égout : de 15 à 23 %. Le 1/5 tombe dans la plage. Frénéhard, Cupa et Rathscheck ne donnent pas de proportion.

## 4. Crochets de gouttière à 0,40 m en bord de mer ou sous la neige

- **DTU 40.5 (via Progineer, CAPEB)** : pendante 0,50 m au plus, « fonction des charges climatiques » sans chiffre
  (art. 5.2.1.1) ; nantaise et havraise 0,50 m au plus (5.2.1.2) ; anglaise 0,40 m (5.2.1.3).
- **VMZINC** : crochet discret 2,5 au mètre (0,40 m), propre à ce produit, sans lien avec le climat.
- **RHEINZINK** : aucun écartement publié ; le climat marin ne concerne que la patine.
- **Frénéhard** (extrait du moteur de recherche, PDF illisible) : en zone de neige, les crochets légers prennent un
  raidisseur ou un tirant neige.
- **Blogs d'artisans** (non fiables) : 40 cm « en zone venteuse ou neigeuse », 40-50 cm sur le littoral, attribués au DTU à
  tort.
- **Retenu** : 0,50 m partout. Le 0,40 m en bord de mer reste `a_confirmer` : c'est une prudence d'atelier, sans source. En
  bord de mer, ce qui change, c'est la matière (inox, cuivre), pas l'écartement.

## 5. Situation exposée (ardoise, NF DTU 40.11 de 2020)

Règle prête à brancher (R = recouvrement du tableau en site normal) :

| Zone | Site exposé | Statut | Sources |
|---|---|---|---|
| III | **max(R + 10 mm, R × 1,10)** | confirme | DTU 2020 §5.1.1.2 (copie) + Progineer : + 10 mm ; Cupa, Rathscheck : + 10 % |
| I et II | **R × 1,10**, arrondi au mm supérieur | a_confirmer | Cupa, Rathscheck (texte de 1993), calcul-pente.fr |

- Écart entre + 10 mm et + 10 % : moins de 3 mm de 60 % à 170 % de pente (zone III : R 89 → 99 ou 98 à 45°), le même crochet
  sauf aux bords d'arrondi, moins de 1 % sur le nombre au m².
- Zones I et II : les tableaux 6 et 7 du DTU 2020 ont leurs propres valeurs « par zone et par situation », mais ils sont en
  image et n'ont pas été lus. Trois lectures sont possibles : × 1,10, + 10 mm, ou la valeur de la zone suivante en site
  normal. Elles diffèrent de 0 à 5 mm (exemple : zone 2 à 45°, 88 / 90 / 89 mm, crochet de 10 cm dans les trois cas). À
  relire dans le texte AFNOR.
- La **côte sud, de Lorient à l'Espagne** (Morbihan sud-est, Loire-Atlantique) est en **zone 2 exposée** : la règle des
  zones I et II la concerne.
- **Tuiles (DTU 40.21 et 40.211)** : pas de majoration du recouvrement (il est fixé par l'emboîtement). Le site exposé a
  sa propre colonne de **pente minimale plus forte**, par exemple famille B sans écran 60 / 70 / 80 % contre 40 / 50 / 60 %
  en site normal (Edilians, Koramic), et sa grille de fixation. La règle de l'ardoise ne s'applique pas aux tuiles.

## Reste à confirmer

1. Le nombre au ml de l'Armor sur une fiche Edilians datée (hotline), pour passer en `confirme_fabricant`.
2. Les palettes du 30×20, 33×23, 35×22, 45×30 et 50×25 : à demander à un négoce breton, par épaisseur.
3. Le 1/5 de pointes : une deuxième source chiffrée (Frénéhard, calepin CAPEB).
4. Le 0,40 m de gouttière en bord de mer : aucune source. C'est au fondateur de décider (0,50 m partout ?).
5. Les zones I et II exposées : lire les tableaux 6 et 7 du NF DTU 40.11 (2020).
