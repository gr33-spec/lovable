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
