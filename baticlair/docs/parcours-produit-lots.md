# Parcours produit : les lots de finition (Greg, 6 novembre 2026)

Mandat : terminer le prompt maître (sections 1 à 22) sur l'environnement de test, par lots contrôlés, chacun avec ses
tests (domaine, serveur, navigateur), sa vérification téléphone et ordinateur et son commit. Ce fichier dit ce qui est
RÉELLEMENT terminé à chaque lot ; le tableau final des sections 1 à 22 est à la fin.

## Lot 1 : cycle de vie complet et doubles engagements

**Terminé**
- Domaine `packages/domain/src/cycle/cycle-de-vie.ts` : tables de transitions de la demande individuelle (brouillon,
  envoyée, réponses reçues, commandée, livrée, close) et de la participation à un achat groupé (engagée, en
  consultation, offre publiée, commandée, livrée, retirée, sortie, non commandée) ; état de chaque LIGNE de liste
  (libre, demande envoyée, en recherche, dans un achat groupé, commandée seule, commandée en groupe) et gestes permis
  (`peut` : envoyer une demande, chercher, rejoindre un achat groupé, commander seul), avec la phrase du refus.
- Serveur `apps/api/src/platform/cycle/lignes.ts` : les faits de chaque ligne lus en base (demandes, offres acceptées,
  recherches, achats groupés automatiques ET commande du mois), une seule règle pour toutes les entrées :
  - rejoindre un achat groupé (`POST projects/:id/achat-groupe`, `POST achats-groupes`) : une ligne de liste n'entre
    qu'une fois (avant : la quantité doublait), jamais si elle est commandée seule ; verrou de transaction par
    entreprise (double clic : une seule ligne) ;
  - commande du mois (`POST projects/:id/commande-du-mois`) : refusée pour une ligne déjà dans un achat groupé ou
    commandée seule ;
  - recherche de rapprochement : refusée pour une ligne dans un achat groupé ; la carte la montre « Déjà dans l'achat
    groupé … » au lieu d'une case ;
  - commande seule (« Je retiens ce négoce », `PATCH price-requests/:id/classification` ; « Commander » d'une demande
    perso, `POST demandes-perso/:id/commander`) : refusée (409 `dans_un_groupe`, phrase, `deblocage`) tant qu'un
    achat groupé ouvert tient la ligne ; le geste explicite `retirerDesGroupes` la retire (participation vidée =
    « retirée », trace `desistement_achat_groupe` motif `commande_seule`) ; après la clôture (`groupe_clos`) ou une
    commande groupée (`deja_commande_en_groupe`), jamais ;
  - commande groupée (`POST achats-groupes/:id/commander`) : refusée pour une ligne déjà commandée seule.
- Route `GET /v1/projects/:id/cycle` : l'état et les gestes permis de chaque ligne (base de l'onglet Suivi, lot 2).
- Écran : une confirmation « Ligne dans un achat groupé » (phrase du serveur, « Retirer de l'achat groupé et commander
  ici » / « Garder l'achat groupé ») sur les trois gestes de commande seule (`conflit-groupe.tsx`).
- Correction : deux « Rechercher des besoins compatibles » simultanés sur la même ligne ne font plus d'erreur 500.

**Tests** : domaine `test/cycle-de-vie.test.ts` (6) ; API `test/cycle-de-vie.test.ts` (5 : double engagement et double
clic, geste explicite, commande groupée, après clôture, isolation), suite API complète 655/656 puis la correction ;
e2e `e2e/cycle-de-vie.spec.ts` (téléphone et ordinateur).

## Lot 2 : dossier Demandes et parcours complet des négoces

**Terminé**
- Négoce, par son lien sécurisé (`/chiffrer/<jeton>`, une seule page pour la demande de la liste et la demande perso) :
  « Je vais répondre » (l'artisan le voit, sans e-mail), « J'ai besoin d'une précision » (question envoyée à
  l'artisan par e-mail et dans « À faire » ; sa réponse revient par e-mail au négoce et s'affiche sur sa page), « Je
  ne peux pas chiffrer » (motif facultatif, l'artisan est prévenu une fois ; le négoce peut encore envoyer une offre).
  Avant : seulement « Je ne chiffre pas », sans motif. Le PDF, l'Excel, le QR, le chiffrage en ligne et les relances
  automatiques existaient déjà (lot final, point 3 et 6) et sont gardés.
- Migration ADDITIVE `20261107090000_parcours_negoce` (colonnes de `price_request_recipient` : intention, motif du
  refus, question et réponse de précision, avec leurs dates).
- Routes : `POST /v1/public/chiffrer/:jeton/intention`, `…/precision`, `…/refuser` (motif) ; artisan :
  `POST /v1/price-request-recipients/:id/precision` (isolation : 404 pour une autre entreprise).
- Dossier d'une demande : **Suivi / Offres / Documents** (avant : Résumé / Réponses / Offres / Documents). Suivi = où
  en est chaque négoce (« Va répondre », « Question » avec la case pour répondre, « Ne chiffre pas » et son motif,
  « Devis reçu ») et chaque ligne (cycle de vie du lot 1), puis l'écran du chantier tel qu'avant. Les anciennes
  adresses `?onglet=resume|reponses` mènent au Suivi. La carte du négoce dit aussi « Va répondre » / « Question » /
  « Ne chiffre pas » (avant : « Pas de réponse »).
- Ordinateur (≥ 1280 px) : la liste des demandes reste à gauche du détail (`DemandesLaterales`) ; téléphone inchangé.

**Tests** : API `test/parcours-negoce.test.ts` (4) ; e2e « Dossier d'une demande (Greg, 6 novembre 2026) » dans
`accueil-mes-listes.spec.ts` (négoce + artisan, téléphone et ordinateur).
