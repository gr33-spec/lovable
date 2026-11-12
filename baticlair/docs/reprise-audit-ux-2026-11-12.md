# Reprise : dossier de corrections UX du 12 novembre 2026

Source : « MOBIIZ — Dossier de corrections UX et produit » (Greg, 12 novembre 2026, 14 points, 22 captures) et la mission
en 5 lots. Ce fichier est LA première chose à lire à la reprise : vérifier le commit, puis reprendre au « Prochain geste ».

## Où
- Dossier : `/home/user/lovable/baticlair` · branche locale isolée `audit-ux-2026-11-12` (jamais poussée telle quelle).
- Base de départ : `4badcc4e` (branche de test `claude/saas-achat-artisans-prompt-1lyihx`, en ligne sur test.mobiiz.fr).
- Livraison : seulement quand TOUS les lots sûrs sont faits et la chaîne complète verte sur un commit exact ; alors
  avance rapide de la branche de test, push, attente des deux domaines, recette en ligne.

## Lots
| Lot | État |
|---|---|
| 1 Blocages et fiabilité | FAIT (commits locaux) |
| 2 Missions, aide, paramètres | FAIT (commit local) ; contrastes restants repris au lot 5 |
| 3 Contenus, documents, MVP | FAIT (commit local) |
| 4 Formules et facturation (test seulement) | FAIT (commit local) ; annuel payable en simulé, fermé avec Stripe tant que ses prix annuels ne sont pas configurés |
| 5 Passe visuelle | non commencé |

## Fait
- Point 1 (case « Quels articles grouper ? ») : cause = la case d'un article « À préciser » était `disabled`, donc l'appui
  était ignoré en silence. Maintenant : l'appui dit ce qui manque, ouvre « Préciser », garde l'intention ; l'article se
  coche dès que la précision est complète. Fichiers : `apps/web/src/components/ag-v1-quantitatif.tsx`,
  `apps/web/e2e-ag-v1/achats-groupes-v1.spec.ts`. Test : `-g "depuis un quantitatif tapé|un seul circuit"` 6/6 (3 appareils).

- Point 2 (notifications) : cause = la pastille comptait toute action « À faire », impossible à lire ni à retirer.
  Maintenant : pastille = seulement du nouveau pas encore vu (état gardé par le serveur), ligne retirable par glissement
  ou bouton, « Annuler ». Migration additive `20261112200000_notifications_etat` (colonne `alerte_courte.supprimee_le`,
  table `etat_a_faire`). Fichiers : `apps/api/src/modules/missions/{application/boite.service.ts,http/missions.controller.ts}`,
  `apps/web/src/components/notifications.tsx` (nouveau), `apps/web/src/lib/notifications.ts`, `Cloche` dans
  `achat-groupe.tsx`. Tests : `apps/api/test/notifications-cycle.test.ts` 3/3 ; `e2e-ag-v1/notifications.spec.ts` 3/3.
- Point 3 (rattachement + « Mes reçus ») : l'étiquette sécurisée classe toujours seule. Sans repère : Mobiiz PROPOSE la
  demande (même adresse, ou même nom de domaine s'il désigne un seul négoce, jamais une messagerie grand public), dit
  pourquoi, l'artisan confirme ; « Ce n'est pas la bonne demande » corrige sans doublon de devis. `/recus` devient
  « Réponses à classer » ; « Messages et réponses » montre « N réponses à classer » en tête et l'état de chaque réponse.
  Fichiers : `reponses-recues.service.ts`, `adresse-mobiiz.controller.ts`, `recus.tsx`, `app/(app)/recus/page.tsx`,
  `messages.tsx`. Tests : `apps/api/test/adresse-mobiiz.test.ts` 20/20 ; `e2e/adresse-mobiiz.spec.ts -g R7` 4/4 ;
  `e2e-ag-v1/missions` 15/15.

- Lot 2 : `ChampMetier` (sélecteur avec recherche, mots du chantier, métier absent gardé sur demande) et
  `ChampsCommune` (code postal ↔ commune, choix explicite si plusieurs communes) dans
  `apps/web/src/components/champs-missions.tsx` ; annuaire serveur `apps/api/src/platform/communes/communes.ts`
  (geo.api.gouv.fr en ligne, table fixe en test), route `GET /v1/communes` ; « Type de mission » dans sa carte ;
  filtres Missions entiers (`Puces entieres`) ; fenêtre d'aide fixe dans l'écran (`aide.tsx`) et texte à jour ; menu du
  compte court (`menu-artisan.tsx`) ; « Mes négoces » et « Réponses des négoces » sur `/chantiers` ; réglages
  `MEMOIRE_VISIBLE` et `CONNEXIONS_LOGICIEL` (défaut off, exposés par `/v1/health`) qui masquent « Mémoire de Mobiiz »
  et « Connexions » du sommaire ET par l'adresse ; « Effacer ce que Mobiiz a appris » déplacé dans « Données et
  confidentialité ». Base de test : 0 clé partenaire (vérifié en lecture seule), rien à préserver.
  Tests : `apps/api/test/communes.test.ts` 2/2 ; domaine `missions.test.ts` 16/16 ;
  `e2e-ag-v1/missions-formulaires.spec.ts` 6/6 ; `e2e-ag-v1/missions.spec.ts` 15/15 ; anciens parcours touchés 26
  réussis, 12 ignorés (`@ancien` hors projet).
- À dire à Greg : la formulation RGPD de la carte « Ce que Mobiiz a appris » est à faire valider ; l'annuaire des
  communes appelle un service de l'État (geo.api.gouv.fr) depuis le serveur, sans donnée d'artisan.

- Lot 3 :
  - E-mail au négoce (`supplier-packet.ts`, `mail-html.ts`) : cordial, jamais « plusieurs fournisseurs », date seulement
    si l'artisan l'a choisie (plus de date par défaut à trois jours, `price-requests.service.ts`), « répondre à cet
    e-mail » d'abord, lien « Chiffrer en ligne » ensuite (bouton contour), pied « Demande de prix envoyée avec Mobiiz. ».
    Le garde-fou `priceLeak` (mot « prix » interdit hors « demande de prix ») est RESPECTÉ, pas modifié : d'où
    « proposition tarifaire ». Rappel individuel (`relances.ts`, `individuelle`, `sansDate`) : cordial, aucune date inventée.
  - PDF : la section « Détail du devis » devient « Informations complémentaires sur le chantier », ne redit jamais une
    ligne du tableau, disparaît si rien ne reste.
  - Achats groupés ouverts : une carte autonome par achat (métier, secteur, réception, date de besoin, échéance).
  - Image du profil Missions : `packages/domain/src/missions/image-profil.ts` (type réel, carré, poids, métadonnées
    retirées), migration additive `20261112210000_image_profil`, routes `PUT/DELETE /v1/profil-public/image`,
    `GET /v1/profil-public/:id/image`, `POST …/image/signalement`, `apps/web/src/components/image-profil.tsx`
    (avatar partout, recadrage, retrait, signalement).
  - Mémoire de Mobiiz et Connexions : faits au lot 2 (réglages réversibles).
  Tests : serveur `pdf-informations-complementaires` 5/5, `image-profil` 3/3, mails 38/38, `missions` 18/18 ;
  domaine `image-profil` 3/3, `relances-lot-final` 7/7 ; e2e `image-profil` 3/3, `achats-groupes-v1` + `missions` 33/33,
  aperçu du mail et relance 4/4.

- Lot 4 (RÈGLE CHANGÉE : l'annuel revient, dix mois facturés pour douze) :
  - Domaine `packages/domain/src/abonnement/abonnement.ts` : `Periodicite`, `MOIS_FACTURES_PAR_AN = 10`,
    `prixAnnuelDeFormule` (Essentiel 19 900 centimes, Pro 39 900), `equivalentMensuelDeLAnnuel` (1 658, 3 325),
    `economieDeLAnnuel` (deux mois), `finDePeriode(…, periodicite)`, `offresAbonnement().annuel`.
  - Serveur : migration additive `20261112220000_abonnement_periodicite` (colonne `abonnement.periodicite`, défaut
    « mensuel ») ; `abonnement.service.ts` (session, simulation, événements, facture « essentiel_annuel » / « pro_annuel »,
    renouvellement annuel, rappel 30 jours avant au bon montant, refus du passage à Pro en cours d'année) ;
    `stripe.ts` (prix annuels FACULTATIFS `STRIPE_PRICE_ID_ESSENTIEL_ANNUEL` / `STRIPE_PRICE_ID_PRO_ANNUEL` ; sans eux
    l'annuel est refusé avant tout appel) ; `POST /v1/abonnement/payer { formule, periodicite }`.
  - Écran : `apps/web/src/components/choix-formule.tsx` (au mois / à l'année, un bouton par formule, récapitulatif du
    montant prélevé), `/abonnement`, `/paiement-simule`.
  - L'environnement de test a `PAIEMENT` et des prix Stripe mensuels configurés (noms lus, jamais les valeurs) : l'annuel y
    est AFFICHÉ mais non payable tant que Greg n'a pas autorisé la création des deux prix annuels en mode test.
  - Rien n'a été créé, modifié ni appelé chez Stripe. CGU et page publique des tarifs non touchées (validation juridique).
  Tests : domaine `abonnement-annuel` 5/5 ; serveur `abonnement-annuel` 8/8, `deux-formules` + `pilotage` +
  `abonnement` verts (28/28 au total) ; e2e « Abonnement » 6/6 (téléphone, ordinateur).

- **Lot 5 (passe visuelle)** : FAIT.
  - Thème clair renouvelé (`apps/web/src/app/globals.css`, bloc « PASSE VISUELLE ») : page ivoire #FBF8F3, cartes blanches
    tenues par un liseré et une ombre courte, lueur jaune très douce, barre du bas blanche, onglet actif jaune #FED206.
    Textes inchangés (contrastes AA). Le sombre n'est pas modifié.
  - Sélecteur Automatique / Clair / Sombre dans l'en-tête, téléphone et ordinateur :
    `apps/web/src/components/bouton-theme.tsx`, posé dans `menu-artisan.tsx` (même réglage que Profil › Apparence).
  - Aucun flash : script en tête de page (`app/layout.tsx`, avec le nonce de la CSP) qui pose `data-theme` sur `<html>`
    avant le premier affichage ; fond de page par `html[data-theme] body:has([data-zone-app])` ; pages publiques non
    touchées (`data-zone-app` n'existe que dans `app/(app)/layout.tsx`).
  - Focus au clavier visible sur les deux thèmes (anneau noir serti de jaune) ; survol discret des cartes cliquables.
  - Choix « Au mois / À l'année » : tient sur une ligne sur iPhone SE (`choix-formule.tsx`).
  - Contrôle : balayage automatique des contrastes (17 écrans, clair et sombre, téléphone et ordinateur) : aucun texte
    sous le seuil AA. Captures de contrôle dans le dossier de travail (hors dépôt).
  Tests : `e2e-ag-v1/theme.spec.ts` (choix, persistance, fond avant l'application, automatique, aucun débordement sur
  8 écrans en clair et en sombre) 6/6 sur iPhone SE, Android, ordinateur.

## Rappels techniques
- Les e2e tournent sur le site CONSTRUIT : `pnpm -s build` dans `apps/web` avant chaque passe, puis
  `fuser -k 3000/tcp 4000/tcp`.
- e2e activés : `CI=true E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_e2e PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test -c playwright.ag-v1.config.ts --trace off`.
- Chaîne complète : voir `docs/REPRISE.md`.

## Interdits (toujours)
Production, `main`, e-mail réel, paiement réel, appel IA payant, suppression de données, Stripe en production, document
juridique validé, règles de facturation réelles : rien sans l'accord explicite de Greg.

## Prochain geste
Les cinq lots sont commités sur la branche locale `audit-ux-2026-11-12`. COMMANDE EN COURS : chaîne complète sur le commit
candidat (le commit de ce fichier), résultats dans le dossier de travail `final20` (`etat.txt` : une ligne par étape,
code 0 = vert, « FIN » à la fin). Ne modifier AUCUNE source pendant qu'elle tourne. Seulement si elle est verte : avance rapide de `claude/saas-achat-artisans-prompt-1lyihx`, push,
attente des deux domaines de test, recette en ligne (sans e-mail, sans paiement, sans appel IA), compte rendu final.
Si la chaîne échoue : ne rien pousser, corriger, relancer la chaîne ENTIÈRE.
