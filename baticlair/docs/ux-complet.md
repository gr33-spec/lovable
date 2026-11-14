# Interface et parcours complets (prompt maître du 10 novembre 2026, captures MOBIIZ-PREMIUM)

Demande de Greg : intégrer le parcours des 52 captures, sur téléphone et ordinateur, sans rien supprimer d'utile ; garder
les activités distinctes ; ne rien déployer hors de test.mobiiz.fr. Ce document dit ce qui correspond à quoi dans le code,
ce qui a été décidé, ce qui reste différent des maquettes, et comment revenir en arrière.

## 1. Les trois activités restent séparées

| Activité | Tables | Service | Ce qui la sépare des autres |
|---|---|---|---|
| Quantitatif et demande de prix individuelle | `project`, `takeoff`, `price_request`, `price_request_recipient`, `email_recu_artisan` | `price-requests`, `adresse-mobiiz` | Le verrou « une ligne, un seul circuit » (`gardeCircuit`, 409 `dans_un_achat_groupe`) |
| Achats groupés V1 | `achat_groupe_v1`, `besoin_groupe_v1`… | `achats-groupes-v1` | Même verrou, dans l'autre sens (`peutCircuit`) ; réglage `ACHATS_GROUPES_V1` |
| Missions entre entreprises | `annonce_mission`, `reponse_mission`, `conversation_mission`, `message_mission`, `fichier_pro`… | `missions` | Aucune clé vers un quantitatif ni vers un achat groupé ; réglage `MISSIONS_V1` |

« Messages et réponses » montre côte à côte les conversations Missions et les réponses des négoces, mais ne fait que LIRE
deux circuits : `conversation_mission` d'un côté, `email_recu_artisan` et les réponses saisies par le lien de l'autre.
Aucune table commune, aucune écriture croisée (`BoiteService`). Test : `apps/api/test/missions.test.ts`, « deux circuits
séparés ».

## 2. Correspondance captures, routes, composants

| Captures | Écran | Route | Composant | État |
|---|---|---|---|---|
| 01 | Accueil : trois cartes, « À faire » | `/` | `accueil.tsx` | fait |
| 02 | Mes quantitatifs | `/chantiers` | `chantiers/page.tsx` | titre, sous-titre, recherche ; les cinq filtres d'avant sont gardés |
| 03, 27, 28 | Créer un quantitatif, assistant | `/chantiers/nouveau` | `nouveau-quantitatif.tsx` | existant gardé (une question à la fois depuis le 8 novembre) ; présentation non refaite |
| 29 | Fiche du quantitatif | `/chantiers/[id]` | `project-takeoff.tsx` | existant gardé (deux actions distinctes depuis le 8 novembre) |
| 30 | Choisir les négoces | feuille « À qui j'envoie ? » | `project-price-requests.tsx` | existant gardé ; règle retenue : jusqu'à 5 négoces pour toutes les formules (décision de Greg du 11 novembre, voir 4) |
| 31, 32 | Demande envoyée, comparer | `/chantiers/[id]` | `dossier-demande.tsx`, `project-offers.tsx` | existant gardé |
| 04, 04b, 05, 33 à 42, 48 | Achats groupés | `/achats-groupes/...` | `ag-v1-*.tsx` | existant gardé (V1 du 7 et 8 novembre) |
| 06 | Missions | `/missions` | `missions.tsx` | fait |
| 07, 13, 49 | Publier une mission (3 étapes puis aperçu) | `/missions/nouvelle` | `missions-formulaires.tsx` | fait |
| 08, 50 | Proposer ses services, tarif indicatif | `/missions/services` | `missions-formulaires.tsx` | fait |
| 09, 10 | Détail mission, entreprise disponible | `/missions/[id]` | `missions.tsx` | fait |
| 14, 51, 45 | Répondre, proposition, « Réponse envoyée » | `/missions/[id]/repondre` | `missions-formulaires.tsx` | fait |
| 15, 16 | Réponses reçues, profil pour la mission | `/missions/[id]/reponses`, `/missions/reponses/[id]` | `missions.tsx` | fait |
| 43 | Mes missions | `/missions/mes-missions` | `missions.tsx` | fait |
| 22, 47, 11 | Messages et réponses | `/messages` | `messages.tsx` | fait |
| 12, 46 | Conversation, échange des coordonnées | `/messages/[id]` | `messages.tsx` | fait |
| 23 | Réponse du négoce | `/messages/negoce/[id]` | `messages.tsx` | fait, sans montant lu dans le PDF (voir 4) |
| 26 | Notifications (la cloche) | `/notifications` | `messages.tsx` | fait |
| 17 | Menu du compte | feuille | `menu-artisan.tsx` | fait |
| 18, 19 | Profil et paramètres | `/compte` | `rubriques-profil.ts` | fait |
| 20 | Apparence | `/compte/apparence` | `apparence.tsx` | Automatique, Clair, Sombre |
| 21 | Notifications (réglages) | `/compte/notifications` | `compte-missions.tsx` | fait |
| 24 | Documents et qualifications | `/compte/documents` | `compte-missions.tsx` | fait |
| 25 | Réception des réponses | `/compte/adresse` | `compte-missions.tsx` | fait |
| 44 | Profil public et missions | `/compte/profil-public`, `/missions/profil/[id]` | `compte-missions.tsx` | fait |

## 3. Règles de sécurité tenues par le serveur

- Chaque route part de l'entreprise courante ; un identifiant d'une autre entreprise répond 404 (jamais 403, on ne dit pas
  qu'il existe). `isolation-toutes-routes.test.ts` passe sur toutes les routes, nouvelles comprises.
- Jamais de contact libre : une conversation n'existe qu'à propos d'une annonce. Mission : entre l'auteur et une entreprise
  qui y a RÉPONDU, ouverte par l'auteur. Disponibilité publiée : une entreprise vérifiée écrit à son auteur. Dix
  conversations ouvertes par jour au plus.
- Coordonnées : montrées seulement après l'accord des DEUX entreprises ; d'ici là, un numéro ou un e-mail écrit dans un
  message est masqué à l'affichage.
- Fichiers : PDF, JPEG, PNG, WebP, 4 Mo (limite de l'hébergeur : 4,5 Mo par requête) ; le contenu est contrôlé sur ses
  premiers octets ; ouverture par un lien signé, valable 5 minutes, lié à l'entreprise qui le demande, et le droit d'accès
  est revérifié à l'ouverture (un droit retiré ferme un lien déjà émis).
- Un document du dossier professionnel n'est visible d'une autre entreprise que s'il a été partagé dans une réponse à SA
  mission, ou mis sur un profil public visible.
- Doublons : un message porte une clé d'envoi (unique par conversation) ; une réponse est unique par mission et par
  entreprise ; une conversation unique par annonce et par paire ; une alerte unique par fait.
- Blocage (dans les deux sens), signalement (lu par l'admin seulement), archivage par côté, historique (`historique_mission`).
- La cloche ne porte que des alertes courtes (jamais le texte d'un message ni le contenu d'une proposition).
- Réglages de notification : par catégorie et par canal, appliqués dans `NotificationsGroupeService.prevenir` pour TOUTES
  les notifications ; un bon de commande part toujours par e-mail.
- Administration : `Espace administration` n'apparaît que si le serveur dit que le compte est admin ; les routes admin
  refusent tout autre compte (403).

## 4. Écarts avec les maquettes, et pourquoi

1. Capture 23, montant « 5 037,00 € HT » lu dans le PDF d'un e-mail : depuis le 28 octobre, le devis d'un négoce n'est plus
   lu par l'IA (aucun appel payant). L'écran dit « Devis reçu » et ouvre le PDF ; le montant n'existe que pour une réponse
   saisie par le lien.
2. Capture 25, adresse `batiinvest+rep@reponses.mobiiz.fr` : le format d'adresse Mobiiz actuel est gardé (aucune demande en
   cours cassée).
3. Capture 20, « Le choix s'applique sur tous tes appareils » : le thème reste gardé par appareil ; la phrase dit vrai.
4. Capture 08, « Aucun tarif public demandé », et capture 50, tarif journalier : le tarif est facultatif et masquable.
5. Capture 15, pastilles « Disponible » / « À vérifier » sur une réponse : non reprises (aucune règle ne les définit) ; la
   pastille dit « En conversation ».
6. Captures 02, 03, 27 à 32 et 04 à 05, 33 à 42, 48 : les parcours existants sont gardés tels qu'ils fonctionnent ; seuls le
   titre et la recherche ont changé. Leur présentation n'est pas redessinée carte par carte.
7. Le menu garde une ligne de plus que la capture 17, « Messages et réponses », pour que la boîte reste accessible quand
   les missions sont coupées.
8. Budget, tarif, niveau et expérience sont toujours dits « indicatifs » ou « déclarés ».
9. « Jusqu'à 3 négoces » (prompt maître, capture 30) n'est pas appliqué. DÉCIDÉ par Greg le 11 novembre 2026 pour le pilote : jusqu'à 5 négoces par envoi pour TOUTES les formules, Découverte gratuite comprise ; les abonnements Essentiel et Pro tiennent aux quotas d'analyses de devis et de scans de liste, pas au nombre de négoces.
   Appliqué partout le 11 novembre (anciens modes, envoi classique, page Tarifs) : `docs/verification-2026-11-11.md`, partie 9. La capture 30, si elle est reprise, devra
   dire « jusqu'à 5 négoces ».

## 5. Migration et retour arrière

- `20261110200000_missions_messages_alertes` : 13 tables NOUVELLES, aucune colonne ajoutée à une table existante, aucune
  suppression. Testée sur base vierge (82 migrations, aucun écart avec le schéma).
- Couper sans rien défaire : retirer `MISSIONS_V1` (ou `off`) et redéployer l'API ; les routes répondent 404, l'onglet et
  les rubriques disparaissent, les données restent.
- Remettre le déploiement précédent : rattacher test.mobiiz.fr et api-test.mobiiz.fr aux déploiements de `fd157e1c`
  (site `dpl_CUeFuCfJ1rv6hhBkCmqhWfqyW3yj`, API `dpl_FbNKMJP9f7T9mWNkyt9tS9pECfEy`). L'ancien code fonctionne sur le
  nouveau schéma (tables en plus, jamais lues).
- Supprimer les tables (JAMAIS automatique, seulement sur accord de Greg) :
  `DROP TABLE "lecture_boite", "profil_public", "reglage_alertes", "alerte_courte", "historique_mission",
  "annonce_enregistree", "signalement_mission", "blocage_entreprise", "fichier_pro", "message_mission",
  "conversation_mission", "reponse_mission", "annonce_mission";` puis retirer la ligne de `_prisma_migrations`.

## 6. Tests

- Domaine : `packages/domain/test/missions.test.ts`.
- API : `apps/api/test/missions.test.ts`, `missions-coupees.test.ts`, `isolation-toutes-routes.test.ts`.
- e2e (iPhone SE, Android, ordinateur, réglages allumés) : `apps/web/e2e-ag-v1/missions.spec.ts`.
