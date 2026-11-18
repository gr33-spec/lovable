---
name: regles-metier
description: Règles métier de couvreur (20-25 ans d'expérience terrain) pour le quantitatif IA de Mobiiz — ardoise, tuile, liteaux, écran, faîtage, rives, noues, zinguerie, gouttières, Velux, fixations, pertes, unités de vente. À charger AVANT d'écrire ou de modifier une règle de calcul, une question posée à l'artisan, une suggestion d'oubli ou la liste de matériaux d'un devis couverture, même si l'utilisateur ne parle pas de « règle métier ».
---

# Règles métier — couverture

Ces règles viennent d'un couvreur avec 20-25 ans de chantier. Elles priment sur
les habitudes génériques. Ne pas inventer de règle : si un cas n'est pas
couvert ici, demander au fondateur plutôt que deviner.

## Principes communs (tous métiers)

- Le cœur du quantitatif est commun à tous les métiers : rien de propre à un
  métier dans le code commun. Les règles de couverture vivent dans les données
  et la configuration du métier couverture.
- Jamais d'accessoire non demandé dans la liste. Les oublis probables passent
  par l'étape « Suggestions » (cases à cocher + bouton « Continuer ») : c'est
  l'artisan qui coche.
- On garde les mots de l'artisan.
- On compte en unités de vente (ce qu'on achète au comptoir), pas en unités de
  calcul.
- Aucun « ? » dans la liste finale : une inconnue se règle par une question
  avant, pas par un trou dans la liste.

## Ardoise

### Ce qu'on demande à l'artisan
- Le format d'ardoise et la taille des crochets. Jamais le pureau.
- Le type de crochet : à pointe ou à agrafe (pas de défaut).
- Naturelle ou fibre-ciment : seulement si ce n'est pas déjà écrit dans le
  devis ou la liste. Règle générale : on ne redemande jamais ce qui est déjà
  noté.
- « Toit simple ou compliqué ? » en proposant les pourcentages de perte
  (5 % simple, 10 % compliqué). On ne le déduit pas seul.

### Repères terrain
- Formats les plus posés : 32×22 et 30×20.
- Crochets courants : 90, 100, 110. Le choix dépend de la pente et du format.

### Calcul (interne)
- Pureau = (longueur de l'ardoise − taille du crochet) ÷ 2 + 2,5 mm.
  Exemple : 32×22, crochet de 90 → (320 − 90) ÷ 2 + 2,5 = 117,5 mm.
  Validé pour tous les formats et toutes les tailles de crochet.
- En plus de la surface : 1 rang à l'égout (doublis) et 1 rang au faîtage,
  sur leur longueur.
- Rives : pas d'ardoise spéciale, on coupe dans les normales (c'est dans la
  perte).
- Perte : 5 % toit simple, 10 % toit compliqué (croupes, noues, lucarnes).
- Arrondi à l'ardoise près (unité supérieure). Vente à la pièce.

### Crochets
- 1 crochet par ardoise, partout (rives, égout et faîtage compris).
- Inox brut par défaut. Vente en boîte de 500.
- À VÉRIFIER (abaques fabricants, à valider par le fondateur) : avec du
  crochet à agrafe, il faut toujours un peu de crochet à pointe au droit des
  chevrons. Proportion à établir avant de coder.

### Clous (en Suggestion, jamais d'office)
- Galva (90 % des cas).
- 1 clou par ardoise au faîtage, 2 à l'égout, au doublis et à la rive.
- Unité de vente : inconnue (le fondateur ne sait pas), à confirmer.

## Tuile

### Ce qu'on demande à l'artisan
- La référence exacte du modèle, pour prendre le nombre au m² sur la fiche
  fabricant. Si on n'a pas la référence, on lui demande son nombre au m².
- La perte, pour toutes les tuiles (mécanique, plate, canal…) : « Combien de
  tuiles en plus, ou quel % ? ». On ne fixe pas de % nous-mêmes.
- Les chatières : le nombre, si ce n'est pas noté.

### Calcul et vente
- Le type de tuile dépend de la région : pas de type par défaut.
- Vente à la pièce.
- Tuiles de rive : (longueur de rive + 5 %) ÷ pureau, en 2 lignes séparées (rive
  gauche et rive droite, ce ne sont pas les mêmes pièces).

### Jamais d'office
- Rien qui ne soit ni demandé ni au devis. Tuiles de rive et chatières
  passent en Suggestion si elles ne sont pas au devis (pour les rives, on
  demande ensuite le type : voir Faîtage et rives).

### Points ouverts
- Tuile canal (courant et couvert : une ou deux lignes, quel ratio) : le
  fondateur ne sait pas, à vérifier chez les fabricants puis à faire valider.
- Fixation des tuiles : voir Fixations.

## Liteaux et voliges

### Liteaux
- Sapin par défaut, l'essence est facultative (ne pas la demander).
- Section : elle dépend de la couverture (repères : tuile HP10 → 27×40,
  ardoise → 18×38, ou volige). Elle est souvent au devis ; sinon on la
  demande, sans proposer de défaut.
- Compter en ml, avec un ratio ml/m² (= 1 ÷ pureau ; à recouper avec les
  fiches fabricants).
- On demande la perte et l'unité de vente (barres, bottes, ml…) à l'artisan.

### Contre-liteaux
- D'office dès qu'il y a un écran sous-toiture.
- Entraxe de 50 cm par défaut : (longueur du pan ÷ 0,50) rangs × longueur du
  rampant.

### Voliges
- Au m² (surface du toit) + perte.
- On demande la perte et l'épaisseur.

### Pointes
- Pointes pour liteaux, contre-liteaux et voliges : en Suggestion.

## Écran sous-toiture

- Seulement s'il est demandé ou au devis. Jamais en Suggestion.
- Quantité : surface + 10 %, affichée en m² (pas de conversion en rouleaux).
- On ne demande pas la référence : on garde le mot de l'artisan (« écran »).
- Accessoires d'écran (adhésif, bande d'égout, closoir…) : jamais proposés.
- Contre-liteaux d'office avec l'écran (voir Liteaux et voliges).

## Faîtage et rives

### Faîtage
- Le type (à sec, scellé, zinc, lignolet…) dépend du chantier : s'il n'est pas
  au devis, on le demande.
- Sur la liste : en ml, + 5 % (pas de conversion en nombre de faîtières).
- Abouts de faîtage : on demande.
- Faîtage scellé : le mortier, on le demande.
- Faîtage à sec : closoir d'office, en ml de faîtage + 5 %.
- Supports de panne faîtière (rehausses) et agrafes de faîtière : jamais
  proposés.

### Rives
- Rive absente du devis : d'abord en Suggestion. Si l'artisan coche, on
  demande le type (tuile de rive, zinc, scellée…).
- Perte : + 5 % sur les ml de rive.
- Tuiles de rive : (ml de rive + 5 %) ÷ pureau, en 2 lignes gauche/droite
  (voir Tuile).
- About de rive : on demande.

## Noues

- Le type dépend du chantier (zinc, alu ou préfabriquée, ardoisée…). S'il
  n'est pas au devis, on le demande.
- Longueur prise sur le devis, sinon on la demande. Perte : + 5 % sur les ml.
- Les coupes d'ardoise ou de tuile le long de la noue sont dans la perte du
  toit (10 % toit compliqué) : rien en plus.
- Accessoires de noue (pattes, volige de noue, mousse, clous…) : jamais
  proposés.
- Noue en zinc : la règle Zinguerie s'applique (pliée par l'artisan →
  feuilles ; sinon longueurs façonnées).

## Zinguerie

- Si ce n'est pas au devis, on demande : « Tu plies toi-même ou je te
  commande les pièces façonnées ? ».

### Zinc plié par l'artisan
- Feuilles regroupées en une seule ligne.
- On demande la finition (naturel, prépatiné…) et le nombre de feuilles.
  L'artisan donne toujours le nombre : on ne le calcule pas.
- Épaisseur 0,65 par défaut (pas demandée).

### Zinc façonné (tout prêt)
- Une ligne par pièce, avec les mots de l'artisan. On demande seulement la
  longueur en ml (ni développé ni finition).
- Arrondi aux longueurs de vente de 2 m. Rien en plus pour les
  recouvrements : l'arrondi suffit.

### Accessoires
- Étain, soudure, pattes, clous, mastic : en Suggestion.

## Gouttières et descentes

### Gouttière
- Si ce n'est pas au devis, on demande : matière (zinc, PVC, alu…), modèle
  (demi-ronde, nantaise…), développé (25, 33…) et longueur en ml.
- Arrondi aux longueurs de vente de 4 m.
- Crochets de gouttière : d'office, 1 tous les 50 cm, au même développé que
  la gouttière (on ne demande pas le type).
- Angles et talons de gouttière : lignes à part, avec la question « Tu les
  fabriques toi-même ou je te les commande ? ».
- Fonds et naissances : en Suggestion. Si l'artisan coche, on demande le
  nombre.
- Dauphin, cuvette (boîte à eau), jonctions : en Suggestion.

### Descente
- Si ce n'est pas au devis, on demande : matière, diamètre (80, 100…),
  nombre de descentes, hauteur (ml).
- Arrondi aux longueurs de vente de 2 m.
- Colliers : d'office, 1 tous les 2 m + 1 pour le premier morceau, par
  descente.
- Coudes : on demande le nombre.

## Velux (fenêtres de toit)

- On garde le mot de l'artisan (« Velux » = fenêtre de toit), sans demander
  la marque.
- Si ce n'est pas au devis, on demande : dimension (CK02, MK04…), ouverture
  (rotation, projection), type de couverture, nombre.
- Raccord d'étanchéité : d'office avec le Velux, choisi selon la couverture.
- En Suggestion : kit d'isolation (BDX), pare-vapeur (BBX), volet roulant,
  store, habillage intérieur.
- On retire toujours la surface du Velux de la surface d'ardoise ou de tuile.
  Les coupes autour sont dans la perte du toit.

## Fixations

- Fixation des tuiles (crochets, clous, vis de tuile) : en Suggestion. Si
  l'artisan coche → ratio de la fiche fabricant.
  Point ouvert : le ratio dépend de la zone de vent et de la pente. Comment
  les obtenir (demander ou déduire) reste à décider avec le fondateur.
- Vis, chevilles et visserie (liteaux, voliges, crochets de gouttière,
  colliers…) : en Suggestion. Si l'artisan coche → deux cases : sa
  description, puis le nombre. On ne calcule rien.
- Clous d'ardoise et pointes : voir Ardoise et Liteaux (en Suggestion).

## Chutes et pertes

- La perte est affichée à l'artisan et modifiable par lui (ex. :
  « 520 ardoises, dont 5 % de perte »).
- Pièces vendues en longueur (zinc façonné 2 m, gouttière 4 m, descente
  2 m) : l'arrondi à la longueur de vente suffit, pas de % en plus.
- Quantité donnée par l'artisan lui-même : on n'ajoute jamais de perte.
- Taux de référence : ardoise 5 % (toit simple) / 10 % (toit compliqué) ;
  faîtage, rives, noues, closoir 5 % ; écran 10 %. Tuile, liteau, volige :
  demandés à l'artisan.
