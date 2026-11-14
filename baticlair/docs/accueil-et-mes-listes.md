# Accueil et « Mes listes » (Greg, 1er novembre 2026)

La maquette « Bonjour Greg » fait foi pour l'accueil ; elle remplace les maquettes précédentes.

## 1. Avant

- **Accueil (mode automatique)** : « Bonjour [prénom] » et un slogan (« Achète en groupe, paie moins cher. »), la file
  des reprises, jusqu'à trois grandes cartes jaunes « Reprendre … » (une par brouillon), sur ordinateur trois chiffres,
  un bloc jaune « N actions t'attendent », les deux portes (« Achat groupé de ton métier », « Ma liste de matériaux »),
  « Mes listes et chantiers » (trois listes récentes), « Achats groupés près de chez toi », « Mes achats groupés »,
  une colonne « Mes négoces ».
- **Le « + »** : une feuille avec les deux portes (achat groupé, ma liste) ; « Ma liste de matériaux » de l'accueil et
  « Nouvelle liste » de la page des listes menaient au même écran, le « + » à un choix de plus.
- **« Chantiers »** (le menu disait « Mes listes ») : recherche « Chercher un chantier, un client ou une adresse »,
  filtres En cours / Terminés / Tous, lignes qui se rangent dans « Terminés » par glissement (bouton au clavier),
  aucune suppression (le serveur n'avait pas de route).
- **Statut d'un achat groupé** : « Seul jusqu'au 15 novembre » quand l'artisan était le seul inscrit.
- L'ancien mode (humain / mois) garde son propre accueil ; il n'est pas touché.

## 2. Accueil

Ordre fixe : « Bonjour [prénom] », puis **À faire maintenant**, **Commencer**, **Suivi en cours**. Aucun slogan.

**À faire maintenant** : UNE carte (bord jaune, statut court, titre d'action, une information utile, « Continuer »),
entièrement cliquable ; « Voir 1 autre brouillon » / « Voir N autres brouillons » (ou « autres actions ») déplie les
suivantes en cartes compactes. Section masquée quand rien n'est à reprendre.

Candidats, tous tirés de données existantes :

| Source | Carte |
|---|---|
| Brouillon `envoi` (`/v1/brouillons`) | BROUILLON · « Terminer ta demande de prix » · « Liste vérifiée · N négoces à confirmer » |
| Brouillon `achat-groupe` | BROUILLON · « Terminer ton achat groupé » · son titre |
| Brouillon `liste` | BROUILLON · « Terminer ta liste » · « Ta liste · N matériaux » |
| Achat groupé `offre` (`/v1/achats-groupes`) | CHOIX À CONFIRMER · « Choisir ton offre » · commande avant le … |
| Achat groupé `pas_assez` avec plan B | À DÉCIDER · « Pas assez de volume cette fois » |
| Demande avec réponse(s), pas tranchée (`/v1/projects?resume=1`) | N RÉPONSES REÇUES · « Voir les réponses de tes négoces » |
| Liste à vérifier / prête à demander (`/v1/next-actions`), sans brouillon d'envoi | À VÉRIFIER / LISTE PRÊTE |

**Règle de priorité** (`actionPrioritaire`, `packages/domain/src/accueil/accueil.ts`, test `accueil-priorite.test.ts`) :

1. ce qui attend une réponse de l'artisan (offre à choisir, réponses de négoces, plan B) ;
2. puis l'échéance la plus proche (sans échéance : après) ;
3. puis le parcours modifié le plus récemment ;
4. à égalité, l'identifiant (ordre fixe d'un affichage à l'autre).

Une carte = un seul dossier : une demande de prix individuelle et un achat groupé ne sont jamais mélangés.

**Commencer** : « Créer une liste » (icône jaune, « Document, saisie ou description », `/chantiers/nouveau`) et
« Rejoindre un achat groupé » (ivoire, « Regrouper tes besoins avec d'autres artisans », `/achats-groupes`). Le « + »
du menu (« Nouvelle liste » sur ordinateur) et « Nouvelle liste » de Mes listes mènent au même `/chantiers/nouveau` :
un seul départ.

**Suivi en cours** : deux cartes au plus, « Voir tout » (Mes listes s'il y a une demande, sinon Achats groupés).
Ce qui demande de l'attention d'abord, puis le plus récent ; le dossier déjà montré dans « À faire maintenant » n'est pas
répété. Statuts (`statutAchatGroupe`, `statutDemande`) :

| État | Libellé | Couleur |
|---|---|---|
| achat `seul`, `regroupe`, `regroupe_total` | Inscriptions ouvertes (+ « Clôture 15 nov. · N lignes ») | jaune |
| achat `consultation` | Consultation des négoces | neutre |
| achat `validation` | Offres reçues | vert |
| achat `offre` | Choix à confirmer | jaune |
| achat `pas_assez` | Pas assez de volume | neutre |
| achat `commande` | Terminée | vert |
| demande sans réponse | Consultation des négoces (+ « N négoces consultés ») | neutre |
| demande avec réponses | N réponses reçues | vert |

États vides : « Aucun dossier en cours » ; « Aucun achat groupé en cours » sous des demandes sans achat groupé.
« Seul jusqu'au… » est remplacé partout par « Inscriptions ouvertes jusqu'au … ».

Rien sur l'accueil n'envoie quoi que ce soit : chaque carte ouvre son dossier (vérifié en e2e).

## 3. Mes listes

Titre « Mes listes », « Nouvelle liste », recherche « Rechercher une liste ou un chantier… » (nom, client, adresse,
sans accents), filtres **Toutes** (par défaut) / **En cours** / **Terminées**. Pas d'« Archivées » : l'archivage
existant, c'est « Terminée » (statut `archived`). Une recherche porte sur toutes les listes (PD-022).

Carte (entièrement cliquable) : nom, client ou adresse, statut réel, nombre de lignes, origine (Devis, Photo ou document,
Saisie), « Modifiée le … », chevron, et un vrai bouton « … » (au doigt et au clavier) : Ouvrir, Marquer terminée /
Remettre en cours, **Supprimer définitivement** (rouge). Le glissement n'existe plus sur cet écran.

## 4. Suppression définitive

### Relations auditées (`Project`)

| Donnée | Lien | À la suppression |
|---|---|---|
| Documents importés, fichiers (`document_blob`), traitements, pages | cascade | supprimés |
| Quantitatif | cascade | supprimé |
| Relevé (`takeoff`) et lignes | AUCUN lien en cascade vers le chantier | supprimés explicitement |
| Brouillons de la liste (`url` `/chantiers/<id>`) | aucun lien | supprimés |
| Reprises en attente de ses documents (`lecture_ia:<document>`) | aucun lien | supprimées |
| Journal des corrections (`correction_event`, cite le document) | aucun lien | supprimé |
| Consommation d'IA (`ai_execution`, `ai_analysis` : coût, jetons, décompte) | aucun lien | **gardée** : pas de recrédit, aucun contenu |
| Conversations de l'assistant | sur l'appareil (stockage local par chantier) | rien côté serveur |
| PDF de demande | généré à la volée, jamais stocké | rien |
| Demandes de prix, e-mails, négoces consultés, commandes | `price_request` (cascade) | **bloque** |
| Réponses reçues par l'adresse Mobiiz | `email_recu_artisan.project_id` | **bloque** |
| Devis de négoce rangé (offre) | document `supplier_quote` | **bloque** |
| Achat groupé (actif ou clos) | `besoin_negocie.project_id`, `ligne_achat_groupe.project_id`, `besoin` | **bloque** |

### Règles

- **Supprimable** : brouillon, liste de test, liste jamais envoyée, sans demande, sans offre, sans réponse, sans
  participation à un achat groupé.
- **Jamais supprimée directement**, avec la raison :
  - « Cette liste est liée à une demande déjà envoyée. Elle ne peut pas être supprimée. »
  - « Cette liste a reçu une réponse d'un négoce. Elle ne peut pas être supprimée. »
  - « Cette liste a une offre de négoce. Elle ne peut pas être supprimée. »
  - « Cette liste est liée à un achat groupé. Elle ne peut pas être supprimée. »
  L'action réelle proposée : « Marquer terminée ». Jamais de retrait d'un achat groupé à la place.
- **Côté serveur** (`ListesService`, `POST /v1/listes/suppression/verifier`, `POST /v1/listes/suppression`) :
  session obligatoire ; entreprise propriétaire (une seule liste d'une autre entreprise : 404 pour tout) ; rôle
  lecteur refusé (403) ; éligibilité recalculée DANS la transaction ; tout ou rien (409 `liste_non_supprimable` avec
  les raisons) ; idempotente (une liste déjà supprimée par l'entreprise répond « supprimée ») ; 50 listes au plus par
  appel ; limite de 120 appels par heure.
- **Trace minimale** (`liste_supprimee`) : identifiant, entreprise, auteur, date. Aucun contenu.
- **Écran** : confirmation mot pour mot (« Supprimer définitivement cette liste ? », « “Nom” et ses données associées
  seront supprimées. Cette action est irréversible. », « Les crédits d'analyse déjà utilisés ne seront pas
  recrédités. », Annuler / Supprimer définitivement en rouge) ; le bouton ne part qu'une fois ; succès : les cartes
  disparaissent et « Liste supprimée définitivement » / « N listes supprimées définitivement » ; erreur : les cartes
  restent, la raison est dite.
- **Sélection multiple** (filtre Toutes) : « Sélectionner », cases, barre « Annuler » / « Supprimer (N) » au-dessus du
  menu ; le serveur vérifie d'abord ; une liste non supprimable est expliquée AVANT toute action, et les autres ne
  partent que sur « Supprimer les N autres listes » (jamais de suppression partielle silencieuse).

## 5. Limites

- L'ancien mode (humain / mois) garde son accueil ; le « + » y mène aussi à « Créer une liste ».
- « Voir tout » du suivi mène à Mes listes ou aux Achats groupés (pas de page commune aux deux).
- L'origine « Saisie » couvre aussi « Décrire mon chantier » (le relevé ne les distingue pas).
- Les captures Android sont prises sur un Pixel 7 émulé (le projet « telephone » des tests), en plus de l'iPhone SE
  (375 × 667).
