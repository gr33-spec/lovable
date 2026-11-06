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

## Lot 3 : rejoindre une collecte compatible depuis la carte, date de besoin, livraison ou retrait

**Terminé**
- Carte « Rechercher des besoins compatibles » : une ligne qui correspond EXACTEMENT à une collecte ouverte de son
  département montre « Rejoindre cette collecte » ; le panneau dit la collecte, la clôture, la livraison, demande le
  négoce (carnet, ou un autre : nom et e-mail) et la case d'engagement (la phrase de l'achat groupé, `PHRASE_ENGAGEMENT`,
  donnée par le serveur) ; sans la case, rien ne part. Le serveur revérifie tout (lot 1 : cycle de vie, une ligne dans un
  seul achat groupé, SIRET, e-mail confirmé). Après : « … a rejoint la collecte « … » », lien vers l'achat groupé, et la
  ligne n'est plus proposée (« Déjà dans l'achat groupé … »).
- Recherche de rapprochement : « Besoin au plus tard le » (facultatif) et « Livraison sur chantier / Retrait au dépôt » ;
  la ligne en recherche les rappelle ; le rapprochement les compare (dates, « Mode différent »).
- Analyse (`GET projects/:id/rapprochement`) : `engagement`, `collecte.dateBesoin`, `recherche.modeLivraison`, `recherche.dateMax`.

**Tests** : API `test/collecte-depuis-carte.test.ts` (2) ; e2e « Lot 3 » dans `rapprochement.spec.ts` (deux artisans,
téléphone et ordinateur).

## Lot 4 : clôture, reconfirmation et comparaison du coût total livré

**Terminé**
- Reconfirmation (prompt maître point 12) : dans les 48 h avant la clôture d'un achat groupé automatique, la tâche
  planifiée demande UNE fois à chaque participant engagé depuis plus de 3 jours de reconfirmer (notification « Reconfirme
  ta participation », `reconfirmationDue`). Sur l'écran de l'achat groupé : section « Reconfirmation », la phrase,
  « Je confirme ma participation », puis « Participation reconfirmée le … ». À la clôture, une participation à qui la
  reconfirmation a été demandée et qui ne l'a pas faite ne part pas aux négoces : statut « retiré », désistement
  `non_reconfirme` (jamais compté comme une sortie, aucune exclusion), notification « Liste non reconfirmée ».
  Interrupteur `RECONFIRMATION_GROUPE` (allumé par défaut, éteint seulement en test unitaire).
- Coût total livré (point 11) : dans le résultat d'un achat groupé, pour les MÊMES lignes de l'artisan, l'offre du groupe
  (livraison comprise) face à sa meilleure offre individuelle (prix par lien des mêmes désignations + sa livraison) :
  « Pour ces 2 lignes, livré : achat groupé 1 080,00 € HT ; ta meilleure offre individuelle (Kerbrat) 1 140,00 € HT.
  Écart : 60,00 € HT de moins en groupe. » ; jamais « économie » ni « garanti » ; écart non calculé quand une offre ne
  chiffre pas toutes les lignes ; « Aucune offre individuelle chiffrée à comparer. » sinon (`comparerCoutLivre`, code pur).
- Migration ADDITIVE `20261107100000_reconfirmation_groupe` (`besoin_negocie.reconfirmation_demandee_le`, `reconfirme_le`).
- Route : `POST /v1/achats-groupes/:besoinId/reconfirmer` (idempotente ; isolation : 404 pour une autre entreprise).

**Tests** : domaine `test/cout-total-livre.test.ts` (4) ; API `test/cloture-reconfirmation.test.ts` (2), plus
`achat-groupe.test.ts` et `isolation-toutes-routes.test.ts` verts. Pas d'e2e propre : la fenêtre des 48 h demande de
déplacer l'heure en base, ce que les e2e ne font pas ; l'écran est contrôlé par capture (téléphone et ordinateur).

## Lot 5 : recherche géographique, filtres et carte

**Terminé**
- Domaine `groupe/geographie.ts` (code pur, sans dépendance) : les 101 départements avec leur nom, leur région et les
  coordonnées de leur chef-lieu (arrondies au 0,01°) ; distance à vol d'oiseau entre chefs-lieux (« ≈ 90 km », dite
  approximative) ; départements dans un rayon ; régions ; point de chaque département sur un plan de la métropole.
- « Découvrir » : secteur en un seul choix (mon département, autour de moi 50 / 100 / 150 km, une région, un département,
  toute la France), « Livraison sur chantier / Retrait au dépôt », « Besoin avant le », « Clôture avant le », famille,
  produit ; chaque carte dit le secteur en clair (« Ille-et-Vilaine (35) »), la distance depuis le sien, le retrait.
  « Liste / Carte » : la carte est un plan de la France en points dessiné en SVG (aucune tuile, aucun service, aucune
  dépendance) ; un rond par département qui a des collectes, avec leur nombre ; le toucher filtre la liste.
- Rapprochement : « Secteur » (mon département seulement, jusqu'à 50 / 100 / 150 km) sur la recherche de besoins
  compatibles ; deux départements voisins ne se rapprochent que si LES DEUX artisans acceptent la distance (le plus petit
  des deux rayons), jamais en correspondance exacte : « Secteur voisin : Ille-et-Vilaine (35), ≈ 90 km ». Les collectes
  des départements voisins dans le rayon de l'artisan lui sont aussi proposées.
- Achat groupé : qui le lance choisit « Livraison sur chantier » (défaut) ou « Retrait au dépôt » ; un achat groupé
  compatible n'est rejoint d'office que dans le même mode.
- Migration ADDITIVE `20261107110000_recherche_geographique` (`ligne_rapprochement.rayon_km`, `regroupement_negocie.mode_livraison`).

**Pas fait (dit tel quel)** : la recherche par commune exacte et la distance de route ; les secteurs restent au
département (les adresses des artisans ne sont jamais géocodées : ni service payant, ni base des communes ajoutée).

**Tests** : domaine `test/geographie.test.ts` (4) ; API `test/recherche-geographique.test.ts` (3) ; e2e « Lot 5 » dans `rapprochement.spec.ts` (téléphone et ordinateur, capture de la carte).
