# Fabriquer un chantier d'essai (banc quantitatif Mobiiz, couverture)

Tu fabriques UN chantier de couverture fictif mais réaliste, **en partant de la réponse**. Tu travailles dans le dossier
`/home/user/lovable/banc-quantitatif/` (ne touche à rien d'autre ; n'appelle aucune API IA ; ne fais aucun commit).

**Reprise** : si `chantiers/<ID>/` contient déjà des fichiers (un travail interrompu), lis-les, garde ce qui est bon et TERMINE au lieu de recommencer.

Lis d'abord (et rien de plus, pour économiser) :
- `fiche/export-lecture.txt` : la fiche métier couverture telle que l'appli la donne au lecteur (ouvrages, données, emplacements, calculs).
- les 40 premières lignes de `fiche/systeme-m0.txt` seulement (les règles et le format exact de la lecture ; la suite du fichier est la même fiche métier, ne la relis pas).

Travaille vite et sobrement (peu d'allers-retours). Écris dans `chantiers/<ID>/` trois fichiers, dans cet ordre :

## 1. `verite.json` — la fiche vérité (ce que SAIT le couvreur)
Un objet JSON : `id`, `commune`, `code_postal`, `nature` (neuf / rénovation), `ouvrages` (liste ; pour chacun tout ce que le couvreur sait :
surfaces, pente, rampant, matériau, format, modèle, teinte, crochets, liteaux, écran, gouttières (profil, développé, longueur par ligne, angles),
descentes (nombre, Ø, hauteur, dauphin, coudes), faîtage, rives, noues, particularités…), `faconnage` (il plie lui-même ou achète tout fait),
`ne_sait_pas` (liste des choses que même le couvreur ne sait pas encore : il répondra « je ne sais pas »),
`ecrit_au_devis` (liste : chaque information que le devis écrit), `tu_au_devis` (liste : ce que le couvreur sait mais que le devis ne dit pas),
`oublis` (articles dont le chantier a réellement besoin mais que le devis n'écrit pas : ils ne doivent PAS sortir dans la liste, seulement en suggestion).
Donne des valeurs précises et cohérentes entre elles (surface ≈ rampant × longueur, etc.). Utilise les clés et valeurs de la fiche métier quand elles existent
(ex. `developpe_gouttiere: 25`, `diametre_descente: 80`, `faconnage: 1` = je façonne), en plus des mots du métier.

## 2. `devis.html` — le devis, écrit comme un VRAI couvreur l'écrit
Une page HTML autonome (CSS dans la page, aucune ressource externe, format A4) qui ressemble à un vrai devis d'artisan : en-tête d'entreprise fictive,
client fictif, numéro et date, lignes, prix plausibles, totaux, conditions. Respecte À LA LETTRE le style demandé dans le brief (propre ou brouillon,
colonnes ou texte, écritures m2 / m² / ml / Ø, abréviations, infos manquantes, erreurs voulues). Le devis ne dit QUE ce que `ecrit_au_devis` contient.
Pour un support « photo » : police Courier, mise en page d'un document tapé vite. N'écris jamais « IA », « test » ou « banc » dans le devis.

## 3. `lecture-or.json` — la lecture parfaite de CE devis
Le JSON au format exact de `fiche/schema-m0.json` qu'un lecteur parfait rendrait pour ce devis : toutes les lignes dans l'ordre, chaque fourniture rattachée au bon
`ouvrage` / `emplacement` de la fiche métier quand une règle s'applique, `donnees` = uniquement ce que le devis écrit (clés de la fiche), rien d'inventé,
rien qui vienne de `tu_au_devis`. `questions` : laisse `[]` (le code de l'appli décide des questions). Les lignes sans fourniture ont `fournitures: []`.

## Vérifie
Lance `node outils/moteur.mjs chantiers/<ID>/lecture-or.json` : la lecture doit être acceptée, chaque article écrit au devis doit sortir (liste ou « à chiffrer »),
aucun article absent du devis ne doit sortir, et les questions doivent porter seulement sur ce que le devis ne dit pas. Corrige `lecture-or.json` (pas le moteur)
jusqu'à ce que ce soit le cas. Si tu constates que le MOTEUR ou la FICHE MÉTIER se trompe (calcul faux, question sur une donnée écrite malgré une lecture
correcte, ouvrage courant introuvable dans la fiche), ne contourne pas : note-le dans `chantiers/<ID>/defauts-fiche.md` (une ligne par défaut, avec la preuve).

Réponds à la fin par une seule ligne : `<ID> : ok` ou `<ID> : problème — <quoi>`.
