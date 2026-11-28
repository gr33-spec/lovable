# À intégrer par le banc d'essai (écrit par la base couverture)

La base couverture fait la recherche et la fiche, avec les sources (`baticlair/referentiels/couverture/`). Tout ce qui
touche au calcul, aux suggestions ou aux questions est écrit ici, et le banc d'essai l'intègre (Greg, 22 novembre 2026).
Chaque règle renvoie aux chiffres de la recherche (`recherche/<fichier>.json`, consultés le 20/11/2026).

## 1. Chatières : calculées d'après le modèle et la surface, jamais demandées (Greg, 22/11/2026)

- **Section de ventilation à atteindre** (confirmé : NF DTU 40.11 §4.5.2, DTU 40.23 tableau 6, FFB, Ubbink) :
  - comble perdu, ou au-dessus d'un écran : 1/5000 de la surface projetée, soit **2 cm² par m²** ;
  - comble aménagé sans écran, ou sous l'écran : 1/3000, soit **3,3 cm² par m²** ;
  - écran non HPV ventilé : les deux (1/5000 au-dessus + 1/3000 dessous).
- **Nombre** = arrondi au-dessus de (surface projetée × 2 ou 3,3 ÷ section d'une chatière), **puis au nombre pair**
  (moitié en partie basse, moitié près du faîtage). Exemple : 100 m², rampant isolé sans écran, HP 10 : 333 ÷ 50 = 6,7,
  soit 8 (et non 7).
- **Section d'une chatière par modèle** (`accessoires-tuiles.json`, fiches fabricant 2025-2026) :

  | Modèle | Chatière | Section |
  |---|---|---|
  | Edilians HP 10 | 205.20 | 50 cm² |
  | Edilians PV 10 | 214.20 | 50 cm² |
  | Monier Signy | — | 33 cm² |
  | Koramic Actua | MACT 8640 + grille | 26 cm² |
  | Edilians Alpha 10 | 200.20 | 19 cm² |
  | Terreal Romane Canal | 610 RC | 18 cm² |

- **Surface projetée** = surface du toit × cos(pente).
- **Écran ou pas** : la même question que la fixation des tuiles (point 2), posée une seule fois.
- **Modèle inconnu** : pas de section, donc pas de nombre. La chatière reste « à chiffrer » avec sa question de modèle,
  jamais un nombre inventé.
- **Vis** : la visserie se calcule aussi d'après la fiche, jamais demandée. Tuiles : voir le point 2 (vis + rondelle sur
  chaque tuile de rive ; 4,5 × 45 ou 4,5 × 60 inox, une seule source, Koramic). Bac acier : écart encore ouvert dans
  `A-TRANCHER.md` §2.

## 2. Fixation des tuiles à emboîtement (Greg, 22/11/2026)

- **La zone de vent et la situation exposée se déduisent de la commune** (carte par commune :
  `referentiels/couverture/carte-regions.json`, colonnes `exposee` et zones ; `zoneDeLAdresse`). Jamais demandées.
- **Une seule question** : « Écran sous toiture ? », et seulement si le devis ne le dit pas.
- **Toujours fixées** (confirmé : Edilians, Koramic, AQC) :
  - toutes les tuiles du 1er rang d'égout ;
  - toutes les tuiles de rive (vis + rondelle) ;
  - chaque faîtière et chaque arêtière (1 crochet ou clip par pièce).
- **Partie courante** (tableau NF DTU 40.21 §5.4, lu chez Edilians et Koramic ; bâtiment fermé, hauteur ≤ 15 m) :

  | Départements | Écran | Pente | Site normal | Site exposé |
  |---|---|---|---|---|
  | 22, 29, 56 (vent 3) | sans | ≤ 100 % | 1 sur 3 | toutes |
  | 22, 29, 56 | sans | 100 à 175 % | 1 sur 2 | toutes |
  | 22, 29, 56 | avec | ≤ 175 % | 1 sur 5 | 1 sur 5 |
  | 35 (vent 2) | sans | ≤ 100 % | 1 sur 5 | 1 sur 3 |
  | 35 | sans | 100 à 175 % | 1 sur 3 | toutes |
  | 35 | avec | ≤ 100 % | aucune | 1 sur 5 |
  | 35 | avec | 100 à 175 % | 1 sur 5 | 1 sur 5 |
  | Bretagne | — | > 175 % | toutes | toutes |

  Le tableau complet, toutes régions : `recherche/fixations.json`, entrée `tuiles_fixees_partie_courante_bretagne`.
- **Nombre de fixations** = arrondi au-dessus (tuiles de partie courante × fraction) + tuiles du 1er rang d'égout + tuiles
  de rive + 1 par faîtière ou arêtière ; partie courante = total − égout − rives.
- **Conditionnement** : crochets en boîtes de 400 (Dimos, Frénéhard ; une seule source chacune) ; crochet Mono d'Edilians
  selon la section du liteau (25×27 → Mono 14, 27×40 → Mono 16, 40×40 → Mono 17 ; une seule source).
- **Le skill du fondateur** : la fixation des tuiles est en Suggestion. Cochée, ce calcul s'applique.

## 3. Clous d'ardoise naturelle en Suggestion (Greg, 22/11/2026)

- **Où on cloue** (confirmé : NF DTU 40.11 P1-1 déc. 2020 §5.1.3, ministère de la Culture, CAPEB) : **2 clous** par ardoise
  au doublis, au 1er rang d'égout, sur chaque ardoise de rive (entière et demie) et au dernier rang sous le faîtage.
  En pose au clou complète : 2 clous par chaque ardoise.
- **Faîtage : on suit le DTU, au moins 2 clous au dernier rang** (Greg, 22/11/2026). Règle changée dans le skill : avant,
  « 1 clou par ardoise au faîtage ».
- **Nombre** :
  - égout : 2 rangs (doublis + 1er rang) × (longueur d'égout ÷ largeur d'ardoise) × 2 ;
  - faîtage : (longueur de faîtage ÷ largeur d'ardoise) × 2, par versant ;
  - rive : (rampant ÷ pureau) × 2, par rive.
  Exemple : ardoise 32×22, 10 m d'égout : 2 × 45,5 × 2 = 182 clous.
- **Longueurs** : d'abord celles du devis (gouttière ou égout, faîtage, rives). Elles ne se demandent **que si la case est
  cochée et qu'elles manquent**.
- **Vente au kg**, cartons de 1, 2,5 et 5 kg (Alsafix, ArcelorMittal) :
  - galva 2,7 × 30 : ≈ 653 au kg ; 2,8 × 30 : ≈ 680 (galva seulement pour les clous cachés) ;
  - cuivre 3 × 30 : ≈ 418 au kg ; 3 × 27 : ≈ 464 ; 3 × 35 : ≈ 358 ;
  - inox : comme le galva de même dimension (à confirmer, aucun catalogue trouvé).
  Clous apparents : inox ou cuivre (DTU 2020).

## Déjà intégré par la base couverture avant cette consigne (roofing-2026.11.20-63, sur la branche de test)

Pour info, à ne pas refaire : Suggestions sans limite ; pointes de liteaux (ardoise 2,8 × 60, tuile 3,1 × 70, boîtes de
1 kg, une par croisement + une par bout de liteau de 4 m) ; tuiles de rive, bardelis, dauphins (la case vaut le « oui »),
jonctions PVC, clous fibres-ciment, six kits Velux (BDX, BBX, BFX, volet, store, habillage). Le rangement par catégorie
et la vingtaine au plus sont au banc (Greg, 22/11/2026).
