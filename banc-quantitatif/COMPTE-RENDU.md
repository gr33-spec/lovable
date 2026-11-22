# Banc d'essai du quantitatif — compte rendu

Fait entièrement dans Claude Code, avec des sous-agents, sur l'abonnement. **La clé Anthropic de Mobiiz n'a jamais été
appelée. Rien n'est changé dans l'appli** : tout est dans `banc-quantitatif/`, sur la branche
`claude/quantitatif-benchmark-methodes-pymtqy`, sans fusion.

## En deux phrases

La meilleure lecture est la plus simple : **l'IA ne fait que lire les lignes, le code décide de tout le reste**. Elle fait
aussi bien avec un modèle trois fois moins cher et quatre fois plus rapide que l'actuel. Mais le banc montre surtout que
**le gros des erreurs ne vient pas de la lecture : il vient du calcul**, qui ne suit pas la fiche métier vérifiée.

## Ce qui a tourné

- 15 chantiers fabriqués en partant de la réponse (fiche vérité → devis → lecture de référence), 10 pour l'entraînement,
  5 gardés pour l'examen ; plus D-2026-024 et 4 devis du jeu de test existant. Ardoise, HP 10, canal, fibres-ciment, zinc à
  tasseaux, joint debout, bac acier, zinguerie seule, mixtes ; PDF propres, brouillons, prose sans colonnes, 4 photos.
- 3 rôles séparés, chacun dans son sous-agent : le couvreur (répond d'après la fiche vérité, réponses gardées dans un
  carnet pour être toujours les mêmes), le contrôleur (recalcule à la main d'après la fiche métier, sans voir aucune
  méthode), le contrôleur du contrôleur (tranche). Vérifié dans les journaux : sur 533 lectures, aucun lecteur n'a ouvert
  un fichier de vérité.
- 11 méthodes au tour 1 (110 lectures), 3 finalistes + la méthode 0 au tour 2 (230 lectures), examen final et devis réels.

Les méthodes sont décrites dans `methodes/METHODES.md`.

## Le tableau des méthodes (tour 1 : 10 chantiers, 63 lignes attendues, 20 questions attendues)

« Lignes justes » = même article, même quantité, même unité que la liste que donne le moteur de l'appli avec une lecture
parfaite. C'est donc la note de la **lecture**.

| Méthode | Lignes justes | Quantité fausse | Manquantes | Inventées | Questions posées | dont inutiles | Temps | Coût par devis |
|---|---|---|---|---|---|---|---|---|
| **0. Actuelle** (Opus, tout d'un coup) | 54 (86 %) | 8 | 1 | 0 | 32 | 2 | 91 s | 0,20 € |
| 1. Deux passes (lecture + relecture) | 55 (87 %) | 7 | 1 | 0 | 32 | 2 | 129 s | 0,36 € |
| 2. Mesures relevées par le code | 50 (79 %) | 6 | 7 | **10** | 20 | 4 | 19 s | 0,03 € |
| 3. Lecture par ouvrage | 52 (83 %) | 8 | 3 | 1 | 20 | 0 | 23 s | 0,09 € |
| **4. L'IA ne fait que lire** (Opus) | **59 (94 %)** | 3 | 1 | 0 | 20 | 0 | 43 s | 0,17 € |
| 5. Petit modèle vérifié par le code | 55 (87 %) | 4 | 4 | 2 | 22 | 2 | 58 s | 0,01 € |
| 6. Deux lectures comparées | 58 (92 %) | 4 | 1 | 0 | 22 | 2 | 24 s | 0,13 € |
| 7. Formulaire rempli ouvrage par ouvrage | 44 (70 %) | 8 | 11 | 8 | 20 | 3 | 23 s | 0,06 € |
| 8. L'IA recopie, le code comprend | 41 (65 %) | 11 | 11 | 6 | 20 | 2 | 14 s | 0,001 € |
| 9. Le code lit, l'IA vérifie | 47 (75 %) | 10 | 6 | 5 | 22 | 2 | 45 s | 0,07 € |
| 10. Lecture avec preuves | 58 (92 %) | 4 | 1 | 0 | 21 | 1 | 27 s | 0,07 € |
| **11. L'IA ne fait que lire** (modèle moyen) **+ garde-fous du code** | 58 (92 %) | 4 | 1 | 0 | 21 | 1 | **24 s** | **0,06 €** |

Coût : estimé d'après les volumes de texte lus et écrits et la grille de prix de l'appli ; avec le cache des consignes
(elles sont les mêmes pour tous les devis), compter à peu près la moitié (0,13 € pour la 0 ; 0,03 € pour la 11).

### Stabilité (tour 2 : le même devis lu 5 fois ; 3 fois pour la méthode 0)

| Méthode | Lectures | Lignes justes | Inventées | Mêmes quantités à chaque lecture | Même liste mot pour mot | Mêmes questions |
|---|---|---|---|---|---|---|
| 0. Actuelle | 30 | 169/189 (89 %) | 0 | 7 chantiers sur 10 | 4 sur 10 | 5 sur 10 |
| 4. L'IA ne fait que lire (Opus) | 50 | 288/315 (91 %) | 1 | 7 sur 10 | 4 sur 10 | 9 sur 10 |
| 6. Deux lectures comparées | 50 | 290/315 (92 %) | 1 | 9 sur 10 | 5 sur 10 | 9 sur 10 |
| 11. Lire seulement, modèle moyen, garde-fous | 50 | 291/315 (92 %) | 0 | **9 sur 10** | 5 sur 10 | **9 sur 10** |
| 12. La 11 + le nom de l'article écrit par le code | 50 | — | — | 9 sur 10 | **8 sur 10** | 9 sur 10 |

Quand la liste n'est pas « mot pour mot » la même, les quantités sont presque toujours identiques : c'est le **nom** de
l'article qui change d'une lecture à l'autre (« Gouttière 1/2 rde zn » / « demi-ronde zinc »). La méthode 12 le montre :
dès que le code écrit le nom, on passe de 5 à 8 chantiers stables.

### Examen final (5 chantiers jamais vus, une lecture) et devis réels

| Méthode | Examen : lignes justes (29) | Questions (16 attendues) | Devis réels : lignes justes (45) |
|---|---|---|---|
| 0. Actuelle | 27 | 21 | 37 |
| 4. L'IA ne fait que lire (Opus) | **28** | 15 | 37 |
| 11. Lire seulement, modèle moyen, garde-fous | 25 | 14 | **40** |

Sur l'ensemble des lectures uniques (137 lignes) : méthode 4 = 124, méthode 11 = 123, méthode 0 = 118.

### La vraie justesse : contre la liste du contrôleur

Le contrôleur a recalculé chaque chantier à la main d'après la fiche métier vérifiée ; l'arbitre a tranché les désaccords.
Notées contre cette liste-là (15 chantiers, 102 lignes) :

| Méthode | Lignes justes | Quantité fausse | Manquantes | En trop |
|---|---|---|---|---|
| 0. Actuelle | 50 (49 %) | 39 | 13 | 7 |
| 4. L'IA ne fait que lire (Opus) | 51 (49 %) | 38 | 15 | 6 |
| 11. Lire seulement, modèle moyen | 49 (48 %) | 41 | 12 | 7 |

**Une ligne sur deux est fausse, quelle que soit la lecture.** Ce n'est pas l'IA : c'est le calcul.

## La gagnante, et pourquoi

**La méthode 11 : l'IA ne rend que les lignes du devis (article, ouvrage de la fiche, données écrites), le code décide des
questions, calcule, et retire tout chiffre ou ouvrage qui n'est pas dans le devis.** Elle lit mieux que l'actuelle (92 %
contre 86 à 89 %), n'a inventé aucune ligne en 50 lectures, pose une question inutile sur vingt au lieu d'en poser douze de
plus, et donne les mêmes quantités et les mêmes questions 9 fois sur 10 (5 à 7 pour l'actuelle). Elle coûte environ
0,06 € au lieu de 0,20 € et répond en 24 s au lieu de 91 s.

Réserve honnête : à l'examen, sur 29 lignes, le gros modèle avec la même méthode (la 4) a fait 3 lignes de mieux. C'est
peu de lignes pour conclure ; le choix du modèle se règle dans la configuration et se vérifiera sur de vrais devis.

Ce que le banc a écarté : relire (méthode 1), lire deux fois (6), exiger des preuves (10) n'apportent rien de plus qu'une
seule lecture simple ; faire comprendre le devis par le code seul (8, 9), par un formulaire (7) ou par des étiquettes (2)
fait perdre des lignes et en invente. Les trois façons de poser les questions (tout d'un coup, une à la fois, bloquantes
seulement) donnent exactement les mêmes questions et la même liste : ce levier ne change rien.

## Ce qu'elle rate encore

1. **Des questions utiles disparaissent.** La méthode actuelle pose en plus « Quelle longueur de crochet ? », « Un dauphin
   en pied de descente ? », « Noue de 50 ou de 66 ? », « Quelle ardoise ? » : ce sont de vraies questions de comptoir,
   que le code ne sait pas encore poser seul. Avec la lecture seule, elles ne sont plus posées. À corriger dans le code
   (la fiche doit dire ce que chaque ligne exige) avant d'adopter.
2. **Le nom des articles varie** d'une lecture à l'autre. Tant que l'IA écrit le nom, la liste n'est pas la même « mot
   pour mot » (5 chantiers sur 10). Il faut que le code écrive le nom d'un article calculé.
3. **Les mesures écrites dans le texte** quand la colonne dit « 1 ens » (chantier C02) : les tuiles sortent « 1 pièce ».
   Toutes les méthodes s'y trompent, l'actuelle aussi.
4. **Une descente « 1 u » est comptée comme un tube**, une bande « 2 u » de 3 m mal convertie (C11, C13).
5. **Suggestions** : les règles de la fiche trouvent environ 3 oublis réels sur 10 (surtout la gouttière) ; un contrôle
   de cohérence par l'IA en trouve d'autres (liteaux et écran oubliés après une dépose, coudes et colliers, pattes du joint
   debout) et monte à environ 5 sur 10, avec quelques propositions à côté. Regardé à la main sur 5 chantiers seulement :
   c'est une indication, pas une mesure.

## Ce qu'il faudrait changer dans l'appli pour l'adopter

| Changement | Risque |
|---|---|
| Le lecteur ne rend plus que les lignes (plus de fiche de chantier, de bref ni de questions écrits par l'IA) | Le « chantier en bref » et la fiche de chantier affichés à l'écran doivent être refaits par le code, ou gardés dans un second appel léger. À décider. |
| Modèle de lecture : passer du plus gros au moyen (réglage `AI_EXTRACTION_MODEL`) | Faible : se change et se défait dans la configuration. À confirmer sur de vrais devis. |
| Garde-fous du code : un chiffre absent du devis ou un ouvrage inconnu de la fiche est retiré et demandé | 4 déclenchements en 60 lectures, dont deux développés que le devis n'écrivait pas : le code les a retirés et les demande. Le filet sert. |
| Le code pose TOUTES les questions que la fiche exige pour une ligne (crochet, dauphin, noue, modèle d'ardoise) | C'est le point à faire avant tout : sans lui, on perd des questions utiles. |
| Le code écrit le nom d'un article calculé | Moyen : il faut que la fiche porte la matière et le profil, sinon le nom perd des mots du devis. |

Coût par quantitatif : environ **0,06 €** (0,03 € avec le cache des consignes), contre **0,20 €** aujourd'hui (0,13 €).

## Les défauts trouvés dans la fiche métier et dans le calcul

Sur les 15 chantiers fabriqués, le contrôleur et le moteur sont d'accord sur 46 lignes et en désaccord sur 56. L'arbitre a
tranché : **28 fois le moteur ne suit pas la fiche vérifiée, 15 fois la fiche est fausse ou incomplète**, 11 fois c'est ma
lecture de référence qui était fausse, 2 fois le contrôleur ou le couvreur. Le détail, ligne par ligne avec la preuve, est
dans `DEFAUTS.md` ; 111 autres constats faits à la fabrication sont dans `chantiers/*/defauts-fiche.md`.

Le fond du problème : **le moteur calcule avec l'ancien référentiel (`roofing`), pas avec la fiche couverture vérifiée**
(`referentiels/couverture/fiche-couverture.md`). Les plus lourds :

- **Ardoises au crochet** sur une ligne « fourniture et pose » en m² : le format écrit (32×22) est perdu, les ardoises, les
  crochets et les liteaux restent « à chiffrer » sans aucune question pour les débloquer. La fiche a pourtant la règle.
- **Tuiles HP 10, tuiles canal, tuiles à emboîtement** : sorties sans quantité ou « 1 pièce », alors que la fiche donne le
  nombre au m² ; rives non séparées gauche et droite ; casse de 1 % des faîtières oubliée.
- **Liteaux et contre-liteaux** : mauvais ratio, pertes de l'un appliquées à l'autre.
- **Gouttières** : chaque ligne doit s'arrondir à part aux longueurs de 4 m (2 × 8 m = 5 longueurs, pas 4) ; la naissance,
  dite « ajoutée d'office », ne sort qu'en suggestion.
- **Descentes** : une descente comptée « 1 u » sort comme 1 tube ; la hauteur n'est pas toujours demandée.
- **Bac acier** : la fiche n'a aucune section (ni vis, ni conditionnement) ; la faîtière est comptée comme une faîtière de tuile.
- **Zinc** : « Faîtage en bande de zinc » part en faîtières terre cuite ; recouvrement des bandes non compté ; pas de règle
  de longueur pour les bacs à joint debout ; tasseaux à une seule rive mal comptés.
- **Tuile canal et fibres-ciment** : la fiche donne plusieurs valeurs au m² sans dire à quel recouvrement elles
  correspondent.

## Ce qui diffère entre ces essais et l'appli réelle

- **Les modèles sont les mêmes familles** (Opus 5.5, Sonnet 5.5, Haiku 5.5), mais ils ont tourné comme sous-agents de
  Claude Code : ils lisent leurs consignes et le devis dans des fichiers, puis écrivent leur réponse dans un fichier.
  Dans l'appli, les consignes sont le « système » de l'appel et la réponse est contrainte par un schéma.
- **Pas de sortie structurée** ici : un sous-agent peut rendre un JSON mal formé (ou répondre au lieu d'écrire son fichier : arrivé deux fois sur 533, rattrapé).
- **Réglages** : j'ai demandé l'effort « high » pour Opus et « medium » pour Sonnet ; je n'ai pas pu vérifier la quantité
  de réflexion réellement utilisée. Le coût de la réflexion est donc une hypothèse (3 000 jetons pour Opus, 1 000 pour
  Sonnet).
- **Temps** : mesurés sur les sous-agents, allers-retours de lecture de fichiers compris. Les écarts entre méthodes sont
  fiables, les secondes absolues non.
- **Devis** : fabriqués par moi, sauf 5 ; les photos sont des pages imprimées dégradées, pas de vraies photos de chantier
  ni d'écriture manuscrite.
- **La liste de référence** vient du moteur actuel : 11 lignes de mes lectures de référence étaient fausses (par exemple les
  tasseaux du chantier C14, que les trois finalistes « inventent » à raison). Les notes de lecture sont donc justes à
  quelques lignes près.
- **Méthode 0** : stabilité mesurée sur 3 lectures, pas 5 ; les devis réels n'ont été lus qu'une fois, par les finalistes
  seulement ; la méthode 10 n'a pas été rejouée au tour 2 (le quota de l'abonnement a coupé deux fois).

**À vérifier avec la vraie clé avant d'adopter** : 10 à 20 vrais devis lus par la méthode 11 dans l'appli de test, à
environ 0,06 € pièce, soit 1 € environ.

## Où sont les choses

- `ETAT.md` : où en est le banc. `methodes/` : les méthodes et leurs consignes. `chantiers/` : fiches vérité, devis,
  lectures de référence. `entrees/` : ce que voient les lecteurs. `resultats/` : chaque lecture, chaque liste, chaque note
  (`tableaux.md` : tous les tableaux). `controle/` : listes du contrôleur, comparaisons, arbitrages. `couvreur/` : le
  carnet des réponses. `outils/` : le code du banc (`prepare.sh` remet le moteur en place).
