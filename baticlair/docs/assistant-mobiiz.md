# Assistant Mobiiz, PDF interactif, thème clair / sombre — audit et plan

Demande de Greg du 31 octobre 2026 (« Refonte de l'expérience de création des quantitatifs, assistant IA et PDF
interactif », deux maquettes, et « deux options : Clair / Sombre »). Audit fait avant tout code, comme demandé.

## 1. Ce qui existe (et sera réutilisé)

| Sujet | Où | Constat |
|---|---|---|
| Quatre départs d'une liste | `journey.tsx` (dépôt du devis, lecture IA §51.5), scan de liste (photo), `ecrire-ma-liste.tsx` (saisie, catalogue, références libres) | Le devis et la photo passent par l'IA et comptent dans les quotas (« analyses de devis », « scans de liste ») ; la saisie est 100 % code. Il n'y a pas de départ « je décris mon chantier ». |
| Questions après lecture | `QuestionsScreen` (`journey.tsx`), règles §49.4, §50 (2), temps deux | Une question par donnée manquante, aucune sur une donnée écrite, « Autre », poubelle. Si le devis dit tout, l'écran n'apparaît pas. C'est déjà la bonne logique : l'assistant la reprend en conversation, il ne la remplace pas. |
| Le document du négoce | `supplier-packet.ts` (`packetDocument`, `packetPdf`, pdf-lib) | UN seul générateur pour l'aperçu, l'export et la pièce jointe. Logo du compte automatique, coordonnées, date, référence, bref encadré, tableau désignation · quantité · précision, croquis, pied paginé. Titre actuel « Demande de devis ». |
| Aperçu PDF à l'écran | `pdf-pages.tsx` (`PdfPages`) | Rend le vrai PDF en canvas, zoom pincé et double tap. Réutilisé pour le panneau de droite et le plein écran mobile. |
| Envoi et réponses | `price-requests.service.ts` `send()` ; module `adresse-mobiiz` | Chaque demande part DE l'adresse Mobiiz de l'artisan (`toitures-martin@mobiiz.fr`, « X via Mobiiz ») avec une adresse de réponse ÉTIQUETÉE par négoce (`toitures-martin+r<étiquette>@mobiiz.fr`, `adresseReponseArtisan`). Une réponse à cette adresse est rattachée à SA demande (`ReponsesRecuesService.demandeVisee`) ; une réponse à l'adresse nue arrive dans « Reçus ». Sans domaine configuré, `Reply-To` = l'e-mail de l'entreprise. |
| Thème | `app-shell.tsx` (`app-nuit`), `globals.css` | L'app est en « nuit chaude » depuis le 29 octobre ; avant, elle était claire (jetons de base). Une quinzaine de couleurs sombres écrites en dur (menu ordinateur, accueil ordinateur, boutons ronds `bouton-nuit`). |
| Coût IA et quotas | `ai-usage`, `abonnement.ts` | Facturé : analyses de devis et scans. Lecture = 1 appel (2 au plus par devis). Crédit IA de test épuisé à ce jour (routine qui surveille). |

## 2. Règles en tension, et ce que je retiens

- CLAUDE.md §50.7 « PLUS DE VOIX (elle reviendra seulement si des artisans la demandent) » et « AUCUNE RELECTURE IA tant que
  le fondateur ne la demande pas » : Greg demande maintenant la voix et un assistant. Je le note dans DECISIONS. La voix
  passe par la dictée du navigateur (Web Speech API, zéro coût, zéro dépendance), le texte n'est jamais envoyé seul.
- Règle numéro un (§49) : rien d'absent de ce qu'a écrit ou dit l'artisan. L'assistant interprète des consignes
  (« ajoute 10 sacs de colle », « retire les vis », « mets 12 au lieu de 10 ») et ne fabrique aucune quantité :
  « décris ton chantier » ne garde que les quantités dites, le reste devient une ligne orange « Quantité à préciser ».
- « Jamais une quantité demandée » : l'assistant ne demande pas « combien ? ». Il demande ce que le négoce demanderait
  (adresse, livraison, date), toujours avec « Passer ».

## 3. Coût IA (§14 du brief)

| Fonction | Traitement retenu | Coût | Quota |
|---|---|---|---|
| Conversation d'affinage (ajouter, corriger, retirer, « je ne sais pas », adresse, livraison) | Interprète déterministe en code (`packages/domain`, testé) | 0 | Aucun |
| Dictée | Reconnaissance vocale du navigateur, texte modifiable avant envoi ; repli clavier | 0 | Aucun |
| Aperçu PDF mis à jour | Régénéré par le code depuis les données (aucune relecture IA) | 0 | Aucun |
| « Décris ton chantier » | Lecture en code des quantités explicites (« 40 m² de placo BA13 ») | 0 | Aucun |
| Phrase de description du chantier | Assemblée en code (`briefTexte` existant + adresse / livraison) | 0 | Aucun |

Aucun nouvel appel IA, aucune nouvelle facturation, aucun quota touché. Un repli IA (phrase que le code ne comprend pas)
est possible plus tard par le fournisseur IA existant, mais il n'est PAS branché : il compterait des crédits.

## 4. Risques signalés (et non pris)

- E-mails : je ne change ni l'expéditeur, ni le `Reply-To`, ni le routage des réponses. Le bloc du PDF imprime l'adresse
  qui sert DÉJÀ de `Reply-To` : celle étiquetée du négoce dans le PDF envoyé, l'adresse nue (qui arrive dans « Reçus »)
  dans l'aperçu et l'export ; sans domaine, l'e-mail de l'entreprise. Aucune adresse inventée.
- Données : les réglages du PDF (modèle, couleur) se gardent par une migration ADDITIVE (deux colonnes nullables sur
  `company`), rien de supprimé.
- Le titre du PDF passe de « Demande de devis » à « Demande de prix — Matériaux » (wording du brief). Les tests §45
  qui lisent l'ancien titre sont mis à jour ; l'objet et le corps du mail ne bougent pas.

## 5. Plan, par ordre de risque croissant

1. **I2 Thème clair / sombre** : réglage dans Profil, gardé sur l'appareil ; sombre = l'existant, par défaut.
2. **I3 PDF** : trois modèles (Essentiel, Classique par défaut, Détaillé) dans LE générateur, couleur principale (défaut
   + 5 teintes), bloc « Merci d'envoyer votre proposition commerciale à l'adresse suivante : » avec l'adresse réelle,
   texte facultatif prix / disponibilités / livraison, adresse du chantier et livraison si connues, réglages dans Profil.
3. **I4 Assistant** : sur l'écran de la liste, ordinateur en deux panneaux (conversation à gauche, vrai PDF à droite,
   étapes « Liste des matériaux · Détails chantier · Négoces · Validation ») ; téléphone, la conversation et « Voir PDF »
   plein écran ; une ligne du PDF se touche pour l'éditer (zones posées depuis les coordonnées rendues par le
   générateur) ; annuler ; micro ; « Passer » ; aide d'une fois.
4. **I5 Décrire son chantier** : quatrième départ, texte ou voix, quantités explicites seulement.

Chaque étape : suites vertes (domaine, API, web, e2e) avant de pousser, captures iPhone SE et ordinateur.

## 6. Contrôle de conformité (Greg, 31 octobre 2026, soir)

### 6.1 Ce que l'assistant fait réellement (code : `packages/domain/src/assistant/assistant.ts`, écran : `apps/web/src/components/assistant-mobiiz.tsx`)

| Question de Greg | Réponse honnête |
|---|---|
| Comment il comprend un message libre | En deux passes, en code. 1) `reponsesLibres` : chaque morceau du message (coupé aux virgules, « et », points, sauf virgule décimale) qui contient UN choix proposé par une question ouverte du document y répond (« Espagne, 1er choix, crochets inox »). 2) `interpreter` : le reste est lu comme des consignes. |
| Quelles consignes | Ajouter (« ajoute / il me faut / + 10 sacs de colle »), retirer (« retire / enlève / pas de … »), changer une quantité (« passe les liteaux à 200 m », « 1300 au lieu de 1200 pour les ardoises », « écran : 4 rouleaux », « ligne 3 à 1500 »), adresse, livraison, date, « je ne sais pas », « passer », « annuler ». |
| Plusieurs demandes dans une phrase | Oui : découpe aux virgules et « et » suivis d'un verbe d'action, aux points et aux retours à la ligne ; chaque morceau est traité, le résumé les reprend tous. |
| Matériaux, quantités, dimensions, unités | Quantité = nombre en tête ou en fin de morceau ; unité = liste fermée (pièces, m, m², m³, kg, litres, sacs, rouleaux, palettes, boîtes, bottes, plaques…) ; le reste est la désignation, dimensions comprises (« 18×40 », « 100 mm » restent dans le nom). Une ligne visée l'est par ses mots (nom de tête prioritaire : « les ardoises » ≠ « crochet d'ardoise »), ou par son numéro. |
| Les informations du devis ou de la photo | AVANT ce contrôle : ignorées (seulement adresse / livraison). DEPUIS : l'assistant reprend ce que le moteur sait manquer DANS CE DOCUMENT, ligne par ligne (`questionsDuDocument`) : les données du calcul (`asks` §49.8 : pente, développé, Ø… ; une question partagée posée une fois) puis ce que le comptoir demanderait (format, origine, choix d'ardoise ; matière et longueur de crochet ; marque et teinte de tuile ; type d'écran ; format de pointes ; épaisseur du zinc ; matière et développé de gouttière…), seulement quand la désignation ne le dit pas. |
| Les précisions techniques manquantes | Par la lecture IA du devis (déjà existante, §51.5 : `asks`) et par les familles de précision du catalogue (`precisionDeLigne`). Une ligne déjà précise n'a aucune question ; un document complet n'en a aucune. |
| Une demande imprévue | Rien n'est deviné : « Je n'ai pas compris « … ». Dis-le autrement, ou touche la ligne dans le PDF. » Une cible ambiguë demande laquelle. C'est la limite du tout-code : voir 6.3. |

Preuves : `packages/domain/test/assistant-mobiiz.test.ts` (16 tests), `apps/api/test/assistant-mobiiz.test.ts`,
`apps/api/test/adresse-mobiiz.test.ts`, `apps/web/e2e/assistant-mobiiz.spec.ts` (6 parcours × téléphone et ordinateur).

### 6.2 Ce qui a été corrigé ce soir (sûr, sans IA)

- Les questions du document dans l'assistant (cartes à boutons, réponses libres groupées, réponse écrite dans la ligne ou
  donnée au moteur ; « Annuler » rend l'ancienne valeur ; « Passer » / « Je ne sais pas » ferment la question en cours).
- Ouverture automatique après la lecture d'un devis ou d'une photo, une fois par liste ; jamais pour une liste notée à la main.
- Le texte au négoce de Greg, mot pour mot.
- Tests ajoutés : PDF affiché = téléchargé = envoyé ; adresse de réponse propre à chaque négoce et à chaque demande ;
  aucun appel IA ni décompte par les gestes de l'assistant ; dictée simulée (texte dans la case, jamais envoyé seul ; micro
  refusé ; navigateur sans dictée).

### 6.3 Architecture hybride proposée (NON activée, attend l'accord de Greg)

- **Quand** : seulement si le code n'a rien compris (`incompris`) ou n'a pas pu trancher (`ambigu`), jamais pour un message
  déjà traité. Pas d'appel pour « passer », un choix touché, un nombre seul, une consigne reconnue.
- **Quoi** : un appel au modèle rapide déjà configuré (`AI_QUANTITATIF_MODEL`, Sonnet 5.5 ; ou Haiku 4.5 si on veut moins
  cher), par le lecteur IA existant (`platform/ai/lecteur-ia.ts`, journal `ai_execution`, grille de prix
  `packages/domain/src/ai-cost/pricing.ts`). Entrée : le message, les lignes (clé, nom, quantité, unité), les questions
  ouvertes ; prompt système fixe mis en cache. Sortie : JSON structuré de consignes du même format que `Consigne`.
- **Coût estimé** (grille du dépôt) : ~3 000 jetons d'entrée et ~200 de sortie par appel. Sonnet 5.5 : 3 000 × 2 $/M +
  200 × 10 $/M ≈ 0,008 $ ; Haiku 4.5 ≈ 0,004 $. Plafond proposé : 5 appels par liste, soit au plus ~4 centimes par
  conversation ; en pratique 0 à 2 appels.
- **Quotas et crédits** : non décompté dans les « analyses de devis » ni les « scans » (règles commerciales inchangées) ;
  plafond par liste et par mois en configuration ; coupé automatiquement si le crédit IA manque (repli sur le message
  « Dis-le autrement »).
- **Contre les inventions** : le modèle ne peut que proposer des consignes ; le code les vérifie avant d'agir : une ligne visée
  doit exister (clé connue) ; une quantité doit figurer en chiffres dans le message de l'artisan ; un choix doit être une
  option de la question ; tout ajout sans quantité dite arrive « quantité à préciser » ; l'artisan voit le résultat et
  « Annuler » reste disponible. Tests avec le double de test (`FakeLectureReader`), jamais l'API réelle.
