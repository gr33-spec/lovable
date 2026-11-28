# Grand ménage du code, façon senior (préparation, rien n'est appliqué)

Audit de nuit du 28 novembre 2026, en LECTURE SEULE, sur la branche de test (commit `1cef91ff`). Rien n'a été modifié.

Méthode :
- knip (version 5) a donné des pistes ;
- chaque point a ensuite été vérifié à la main, avec grep, sur le code de la branche de test ;
- trois points ont été recontrôlés après coup : `lib/push.ts` sans référence, `#FFC800` encore dans `error.tsx` et
  `session.tsx`, 2 tests sur 4 en échec dans `landing-coup-de-main.test.mjs`.

**Hors périmètre, exprès** : le calcul du quantitatif (fiches, lecture, questions, suggestions) et les achats groupés en
cours. On n'y touche pas ; quelques remarques sont listées à la fin pour les discussions concernées.

## Résumé

| Classe de risque | Nombre | Ce que ça veut dire |
|---|---|---|
| Sans risque | 20 | Code ou fichiers jamais utilisés : on peut supprimer |
| À vérifier | 24 | Doublons à fusionner, décision de Greg, ou tests à ajuster |
| Risqué | 2 | Anciennes fonctions coupées, mais encore branchées sur le reste |

**À traiter en premier :** trois tests du site échouent déjà sur la branche de test (point B1). La CI lance
`turbo run test` : elle est donc rouge pour une raison qui n'a rien à voir avec le travail en cours.

---

## A. Code mort, sans risque (à supprimer)

1. **`apps/web/src/lib/push.ts`** : les notifications push (`pushSupport`, `ensurePush`, `askPush`). Aucune référence
   hors du fichier. `public/sw.js` reste : `service-worker.tsx` s'en sert. Aucun test. Supprimer.
2. **`apps/web/src/components/argument-tarif.tsx`** : il affiche encore l'ancien prix « Dès 19,90 € HT par mois ».
   Aucune référence. Supprimer, ou le reprendre pour l'offre de lancement à 19,90 €.
3. **`apps/web/src/components/chantier-scenes.tsx`** (307 lignes) : les animations du 10 octobre (`ReadingScene`,
   `ListScene`). Aucune référence. Supprimer.
4. **`apps/web/src/components/landing-illustrations.tsx`** (398 lignes) : les illustrations d'une ancienne landing.
   Aucune référence. Supprimer.
5. **`apps/web/src/components/reprendre.tsx`** : `CartesReprendre`, remplacé par `reprises.tsx`. Aucune référence.
   Supprimer.
6. **`apps/web/src/components/reglages-pdf.tsx`** : l'ancien réglage du PDF, remplacé par `apparence-editeur.tsx`.
   Aucune référence. Le nouveau est couvert par `api/test/apparence-apercu-pdf.test.ts`. Supprimer.
7. **`Boite`** dans `components/messages.tsx` (lignes 23 à 111) : l'ancienne boîte de réception, remplacée le
   22 novembre par `Messagerie`. Le reste du fichier sert encore. Test : `e2e/messagerie.spec.ts`. Supprimer la fonction
   et ses outils privés.
8. **`ListeAttente`** dans `components/inscription-metier.tsx` (lignes 113 à 193) : retirée de l'écran le 19 novembre.
   Garder l'API `POST /v1/public/liste-attente` (données gardées, futur bouton « Prévenir les inscrits »). Test :
   `api/test/liste-attente-invitations.test.ts`. Supprimer le composant seulement.
9. **Petites fonctions mortes du site** (seule leur définition existe) :
   - `EditableName` (`journey.tsx`), `Proof` (`takeoff-view.tsx`) ;
   - `OffresPubliques` et `OFFRES_PAR_DEFAUT` (`offres-abonnement.tsx`) ;
   - `DemoVingtArtisans` (`landing-premium.tsx`) ;
   - `Eyebrow` (`ui.tsx`), `Avatar` (`ux-kit.tsx`), `offerFacts` (`project-offers.tsx`) ;
   - `doubtText` (`lib/labels.ts`), `departementValide` (`lib/negoce.ts`) ;
   - `ItemForm`, `EDIT_PANEL` et `EDIT_FIELD` (`purchase-list.tsx`).

   Supprimer.
10. **`COULEURS_APP` et `EDITEUR_APP`** (`packages/domain/src/groupe/marque.ts`, réexportés par `lib/nom.ts`) : jamais
    lus. `COULEURS_APP` dit encore `#FFC800`. Supprimer, pour que personne ne les réutilise.
11. **Serveur** : jamais lus.
    - `PIED_MAIL_NEGOCE` (`supplier-packet.ts`) : le pied « envoyé avec Mobiiz », retiré le 17 novembre ;
    - `dateLimiteParDefaut` (`price-requests.service.ts`) ;
    - `DOMAINE_FACTICE` (`pilotage.service.ts`).

    Supprimer.
12. **Moteur, hors quantitatif** : jamais lus. Supprimer, puis `pnpm -s build`.
    - `BOUTON_CONTINUER` et `LIEN_PAS_MAINTENANT` (`abonnement/abonnement.ts`) ;
    - `BADGE_BIENTOT` et `PHRASE_METIER_BIENTOT` (`catalogue/ouverture.ts`) ;
    - `dureeJours` et `peutEcrire` (`missions/missions.ts`) ;
    - `estCouleur` (`page-entreprise/couleurs.ts`) ;
    - `domaineDe` (`messagerie/entrant.ts`).
13. **`useOrdinateur` en double** dans `components/messagerie.tsx` : identique à `lib/ordinateur.ts`. Importer celui de
    `lib`. Ne pas toucher celui de `page-entreprise/editeur.tsx` : il vaut à partir de 768 px, exprès. Test :
    `e2e/messagerie.spec.ts`.
14. **`toError` copié trois fois** au mot près (`project-offers.tsx`, `order-feedback.tsx`,
    `project-price-requests.tsx`) : le mettre une fois dans `lib/api.ts`.
15. **Dépendance `@fontsource/instrument-serif`** (`apps/web`) : citée nulle part, ni dans le code ni dans le CSS. La
    retirer (le fichier `pnpm-lock.yaml` change).
16. **Images publiques jamais affichées**, environ 1,7 Mo :
    - dans `public/landing/` : 13 JPG (`capture-*`, `comparer`, `depot`, `envoi`, `groupe`, `hero`, `liste`,
      `questions`) ;
    - dans `public/landing/v3/` : `hero-artisans-*` (4), `artisans-collectif*` (2), `collectif.svg`.

    Aucun chemin, même construit dans le code, ne les cite. Supprimer.
17. **`packages/domain/test-results/.last-run.json`** : un déchet de test enregistré dans git. Le supprimer et ajouter
    `test-results/` au `.gitignore`.
18. **`docs/ARCHITECTURE.md` et `docs/architecture.md`** ne diffèrent que par les majuscules : sur un Mac ou un PC, l'un
    écrase l'autre. Renommer le second (`architecture-cible-2025.md`, il se dit « en partie dépassé ») ou l'archiver.
19. **`docs/groupe/recette-en-ligne/credit-ia.mjs`** : surveillait le crédit IA, routine coupée le 15 novembre.
    Archiver.
20. **Aucun gros bloc de code mis en commentaire** (vérifié : aucun bloc de 6 lignes ou plus). Rien à faire.

## B. Tests cassés ou périmés (à vérifier, à traiter en premier)

1. **Tests du site en échec sur la branche de test.**
   - `apps/web/scripts/landing-coup-de-main.test.mjs` : 2 tests sur 4. Le test 2 cherche `<BoutonDecrire` dans
     `chantiers/nouveau/page.tsx`, qui n'en a plus. Le test 4 cherche « Analyses disponibles ».
   - `erreurs-precises.test.mjs` trouve des phrases vagues dans `desinscription.tsx`, `acces-demo.tsx` et
     `lib/missions.ts`.
   - À faire : mettre les tests à jour d'après les écrans actuels, ou corriger les phrases. Ensuite,
     `decrire-mon-chantier.tsx` (164 lignes, importé nulle part) peut partir.
2. **Les parcours `e2e-ag-v1/` ne tournent dans aucune CI** : `ci.yml` ne lance que `playwright.config.ts`. Ils peuvent
   casser sans que personne le voie.

## C. Doublons (à vérifier, à fusionner)

1. **`communeDe` en trois versions**, aux expressions régulières un peu différentes :
   - `adresse-mobiiz.service.ts` ;
   - `groupe/commande-du-mois.service.ts` ;
   - `domain/groupe/alertes-chasseur.ts`.

   En garder une, dans le moteur. Tests : `adresse-mobiiz*`, `groupe-*`.
2. **`adresseNue` en deux versions** : une simple, dans `platform/email/contact-entrant.ts`, et une renforcée contre le
   faux nom affiché, dans `domain/groupe/adresse-mobiiz.ts`. Le tri des e-mails entrants utilise la version simple :
   utiliser celle du moteur partout. Tests : `emails-entrants-blindes`, `saboteur-emails-entrants`.
3. **Domaines de démo recopiés** dans `components/demo.tsx` et `acces-demo.tsx`, alors qu'ils existent dans
   `api/src/platform/demo-domaine.ts`. À supprimer avec le point E2.
4. **`Telephone` et le cadre de téléphone recopiés** de `decouvrir/landing-premium.tsx` vers `page-locale.tsx` (la page
   Couvreurs de Bretagne, mise de côté). Utiliser `Cadre`.
5. **`Interrupteur` en deux versions** (`ux-kit.tsx`, `page-entreprise/editeur.tsx`) : à unifier un jour, sans urgence.
6. **Deux fichiers `landing-premium.tsx`** (dans `components/` et dans `app/(public)/decouvrir/`), au même nom pour deux
   rôles. Renommer celui de `components/`.
7. **Docs en double** : `docs/security.md` et `docs/SECURITE.md` ; `plan-architecture-v2.md` et `-v3.md`. Archiver les
   anciens dans `docs/archive/`.

## D. Dépendances (à vérifier)

1. **`@fontsource-variable/bricolage-grotesque`** n'est plus importée : la landing lit une copie réduite
   (`app/(public)/polices/bricolage-etroite-800.woff2`). La retirer si on ne regénère plus ce fichier.
2. **`@vitest/coverage-v8`** (`packages/domain`) : aucun script ne l'utilise. À retirer.
3. **Pas un problème** : `@fontsource-variable/plus-jakarta-sans` est lue par son chemin dans `app/layout.tsx`. Garder.
   Toutes les dépendances de l'API servent.
4. **Deux façons d'importer le moteur** dans le site : 41 fichiers par un chemin relatif
   (`../../../../packages/domain/src/...`), 8 par `@baticlair/domain`. À harmoniser plus tard.

## E. Anciennes fonctions coupées pour de bon

1. **Risqué : l'ancien paywall « limite de chantiers ».**
   - Ce qu'il comprend : `modules/billing/` (routes `/v1/billing`), `components/paywall.tsx`, la page `/formules`, et
     les réglages `PAYWALL` et `PLAN_ACTIVATION_CODES`.
   - Il est coupé pour toujours depuis le 14 novembre, mais encore branché dans les projets, les quantitatifs,
     « Nouveau quantitatif », le Compte et l'accueil (`useBilling`).
   - Tests : `billing.test.ts`, `paywall-en-pause.test.ts`, e2e « plus de limite de chantiers ».
   - À supprimer en un seul lot, avec l'accord de Greg.
2. **Risqué : l'accès visiteur public « Découvrir l'application ».**
   - Ce qu'il comprend : `modules/acces-demo/`, `platform/demo-domaine.ts`, l'indicateur `demo` de la requête,
     `BandeauDemo`, et les morceaux morts `BoutonDecouvrir`, `DemoGuidee` et `DemoCard`.
   - `ACCES_DEMO` et `DEMO_PUBLIQUE` sont déjà refusés en production. L'inventaire existe :
     `docs/inventaire-mode-demo-2026-11-11.md`.
   - Ne pas toucher au jeu de démonstration de l'admin ni à `CHANTIER_FICTIF`.
   - Tests : `acces-demo.test.ts`, `demo.test.ts`, `demo-admin.test.ts`, `e2e/acces-demo.spec.ts`.
   - Accord de Greg nécessaire.
3. **À vérifier : le lecteur OpenAI en squelette** (`openai-document-reader.ts`, `AI_PROVIDER=openai`), jamais allumé.
   Test : `brique-ia.test.ts`. À Greg de choisir : le garder en secours, ou le supprimer.
4. **À vérifier : l'ancienne landing « studio »** (`decouvrir/landing.tsx`, 421 lignes).
   - Elle ne sert plus qu'à `/couvreurs` (gardée, non liée).
   - Sa branche « peintres » est morte depuis le retrait de `/peintres`, comme `DemoSurBouton`, qu'elle seule utilise.
   - Plusieurs exports ne sont importés nulle part.
   - À faire : garder le fichier, retirer la branche « peintres ».
5. **À vérifier : les anciennes variables Stripe `STRIPE_PRICE_ID_*`**, acceptées mais jamais lues. À retirer du code
   et de Vercel.
6. **À garder** :
   - `FACTURATION_NEGOCE`, pour la clause « commission plus tard » ;
   - `MEMOIRE_VISIBLE`, `CONNEXIONS_LOGICIEL` et `INTERPRETE_IA`, prévus pour revenir ;
   - les libellés des anciennes formules sur les anciennes factures : une facture émise ne change jamais.

## F. Routes de l'API sans appel

Les 51 contrôleurs sont tous enregistrés. Les routes `internal/*` sont des tâches planifiées.

1. **À vérifier : `GET /v1/missions/enregistrees`.** Aucun écran ne l'appelle, alors qu'on peut enregistrer une annonce
   (« Enregistrer la mission ») : on enregistre sans pouvoir retrouver. C'est un manque du parcours, pas du code mort.
   Écran à ajouter quand Mission ouvrira.
2. **À vérifier : `POST /v1/quantitatifs/:id/reouverture`.** Aucun appel nulle part : le site utilise
   `takeoffs/:id/reopen`. À supprimer si c'est un doublon, après avis de la discussion du banc d'essai.

## G. Brouillons et documents dépassés (à archiver)

1. **CGU candidates superposées** (`docs/groupe/CGU-candidate-2026-11-11.md`, `-14`, `-15`, `-16`), remplacées par les
   textes du 28 novembre (`docs/legal/`). Ces textes ne sont encore que sur la branche `claude/nice-babbage-62c21g` :
   archiver les anciennes seulement quand ils seront sur la branche de test. CLAUDE.md cite encore la version du 16.
2. **Captures et cahiers trop lourds** : `docs/groupe/captures/` pèse **106 Mo** (878 captures d'octobre) et
   `docs/cahiers-chatgpt/` 18 Mo (dont un PDF de 17,5 Mo). Les sortir du dépôt rendrait le clonage bien plus léger ; ils
   restent dans l'historique.
3. **`docs/groupe/recette-en-ligne/sauvegarde-neon.mjs` et `releve-base-test.mjs`** : remplacés par la sauvegarde
   nocturne. Archiver.
4. **Vieux comptes rendus** (`retour-arriere-2026-11-01.md`, `banc-4-devis-avant*.md`, `audit-*-2026-10-*.md`) : à
   regrouper dans `docs/archive/`, sans urgence.

## H. Petit écart à la charte

- **#FFC800**, l'ancien jaune, est encore à l'écran dans `app/error.tsx` (ligne 19) et `lib/session.tsx` (ligne 114),
  avec un texte `#130901` (noir brun). Mettre #FED206 et le noir du thème.

## I. Exports jamais importés ailleurs (faible gain)

- Environ 140 exports et 200 types sont exportés pour rien : utilisés seulement dans leur fichier, ou réexportés par un
  `index.ts`. À dé-exporter au fil de l'eau, sans lot dédié.

## Hors périmètre : à signaler aux discussions concernées

- **Banc d'essai du quantitatif.**
  - Données de test jamais lues : `devis-reels/piscine.ts`, `platrerie-lezardrieux.ts`,
    `electricite-plomberie-7954.ts`, `test/support/devis-synthetique.ts`.
  - Outils de test inutilisés : dans `e2e/discussion.ts`, `api/test/support/crochets.ts` et `suggestions.ts`.
  - Fonctions jamais lues : `splitChunk`, `mergeChunkLines`, `CHAMPS_APPRIS`, `RULE_49_9`, `ficheLignes`,
    `COMMON_SUPPLY`, `MAX_SUGGESTIONS`.
- **Achats groupés (« SaaS achat artisans »).**
  - Composants morts : `FeuilleDeuxPortes` (`achat-groupe.tsx`), `DemandesEnCours` (`commande-du-mois.tsx`),
    `Participants` (`ag-v1-commun.tsx`).
  - `lib/cycle.ts` recopie les fonctions de date du moteur.
  - La route `/v1/internal/achats-groupes-v1/rappels` n'est dans aucune tâche planifiée : les rappels ne partent
    peut-être jamais.
  - `POST /v1/admin/ag/achats/:id/renegociation` n'est jamais testée.
