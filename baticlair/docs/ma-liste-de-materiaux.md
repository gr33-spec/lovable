# « Ma liste de matériaux » (Greg, 31 octobre 2026)

## 1. Avant / après

| Avant | Après |
|---|---|
| « Depuis mon devis » (PDF → analyse de devis) | « Importer un document » : une seule entrée, une feuille avec « Prendre une photo », « Choisir une photo », « Choisir un PDF ou un fichier ». Le type est reconnu tout seul. |
| « Photo de ma liste » (photo ou PDF → scan de liste) | (fusionné dans « Importer un document ») |
| « Je la note moi-même » (écran « Écris ta liste », champ texte + suggestions) | « Saisir ma liste » : le sélecteur de l'étape 1 de l'achat groupé (`CatalogueListes`, partagé, mode `liste`), sans rien de l'achat groupé. |
| « Je décris mon chantier » | « Décrire mon chantier » (« À l'écrit ou au micro. »), inchangé derrière. |
| Carte « Besoin d'un coup de main ? » | Une ligne « MOBIIZ prépare une première liste. Tu pourras tout vérifier et modifier. », le compteur, le lien « Comment fonctionne l'analyse ? » (petite fenêtre). |

Les trois entrées mènent au même éditeur (`/chantiers/:id`, « Liste des fournitures »). Rien n'est supprimé :
`EcrireMaListe` et `CoupDeMainIa` restent dans le code ; le brouillon « liste:nouvelle » est repris dans « liste:saisie ».

## 2. Reconnaissance du document (`packages/domain/src/documents/nature.ts`)

Règles, dans l'ordre (rien n'est demandé à l'artisan) :

1. Une image (photo, capture d'écran, JPEG, PNG, WebP, HEIC) → **liste** (scan) : elle se lit telle qu'écrite.
2. Un PDF sans texte (scanné) → **devis** (l'analyse de devis lit les pages).
3. Un PDF dont le texte porte « DEVIS », « Devis n° … » ou « Devis X-123 » → **devis**.
4. Un PDF qui a au moins deux marques de devis (devis, facture, total HT/TTC, montant, TVA, prix unitaire, montants en €) → **devis**.
5. Sinon → **liste**.

Un fichier ni image ni PDF : « Ce fichier n'est ni une photo ni un PDF. », rien n'est créé.
Limite : une photo d'un devis est lue comme une liste (scan), comme avant avec « Photo de ma liste ».

## 3. Audit des crédits : analyses et scans

| | Analyse de devis | Scan de liste |
|---|---|---|
| Ce qui la déclenche | un PDF reconnu comme devis | une photo, une capture, un PDF reconnu comme liste |
| Route | dépôt du devis → `takeoff.service` (lecture complète : référentiel, questions, calcul) | `POST /v1/projects/:id/liste` → `quantitatifs.fromListe` (lecture telle qu'écrite, prompt `lecture_liste`) |
| Où c'est compté | table `ai_analysis` (`billable`, `poids`) via `AnalysisMeter.begin` | table `ai_execution`, `task = "lecture_liste"`, `status = "success"` (`droits.service.ts`, `scansFaits`) |
| Vérifié avant l'appel | `limiteGratuite` / `monthlyLimit` | `verifierScan` |
| Poids | 1 ; **2 au-delà de 150 lignes** (`poidsAnalyse`, `LIGNES_PAR_ANALYSE`), dit avant l'analyse | 1 |
| Un échec | ne compte pas | ne compte pas |
| Découverte | 1 en tout (`reglages.lecturesIaGratuitTotal`) | 3 en tout |
| Essentiel | 3 par mois | 10 par mois |
| Pro | 8 par mois | 30 par mois |

**Pourquoi deux compteurs** : l'analyse de devis est la lecture coûteuse (modèle le plus fort, référentiel, questions,
calcul) ; le scan lit seulement les lignes écrites, pour bien moins cher. Les quotas d'offre ont été fixés ainsi le
30 octobre (`OFFRES`, `packages/domain/src/groupe/tarifs.ts`).

**Gratuit, jamais compté** : « Saisir ma liste » et « Décrire mon chantier » (aucun appel IA). Vérifié en e2e : la
jauge (`GET /v1/ai-usage/jauge`) est identique avant et après.

## 4. Proposition (non appliquée, attend Greg) : un seul compteur affiché

« Analyses de documents restantes : N ». Deux façons :

- **A. Affichage seul** : N = analyses de devis restantes + scans restants ; les deux quotas restent séparés derrière.
  Simple, mais un compteur à 3 peut refuser un devis (si les 3 sont des scans) : à expliquer dans la fenêtre.
- **B. Un vrai crédit unique** : un devis = 2 crédits (3 au-delà de 150 lignes), une photo / liste = 1 crédit ;
  quota unique par offre (par exemple Découverte 5, Essentiel 16, Pro 46). Plus clair, mais **change les quotas et la
  page Tarifs** : il faut l'accord de Greg (CGU, offres).

En attendant, l'écran dit les deux chiffres en une ligne : « Il te reste N analyse(s) de devis (PDF) et M analyse(s)
de photo. » Rien n'a été fusionné.

## 5. « Saisir ma liste »

- Titre « Saisir ma liste », question « Quels matériaux veux-tu ajouter ? », « Métier : … », « Rechercher un matériau… ».
- Pas un catalogue fermé : « Ajouter « … » tel que je l'écris » en tête des résultats, et « Je ne trouve pas : je l'écris
  moi-même. » ; la désignation tapée n'est jamais remplacée.
- Chaque ligne : désignation, caractéristiques ou précision, quantité, unité ; tout se modifie ; rien n'est inventé (une
  quantité vide reste vide, la ligne arrive « à préciser »). La précision part sur la ligne (correction `preciser`) :
  elle apparaît dans le PDF du négoce et dans la fiche de la ligne, pas dans la désignation.
- Choix du bouton : les matériaux s'ajoutent un par un (« Ajouter ce matériau »), et le bouton du bas dit l'état :
  « Sélectionne un matériau » (désactivé), « Ajouter 1 matériau à ma liste », « Ajouter N matériaux à ma liste ».
  Raison : c'est le geste de l'achat groupé (le même composant), on voit sa liste grandir, et on ne crée la liste qu'une
  fois, quand on a fini.
- Brouillon serveur (`liste:saisie`) : rien ne se perd au changement de métier, au retour arrière ou au départ ;
  « Quitter la saisie ? » (Rester / Quitter) quand des lignes ne sont pas encore envoyées ; « Reprendre ta liste » à
  l'accueil.
- Séparation stricte : aucun achat groupé, aucune participation, aucun négoce, aucune demande de prix, aucun crédit.
