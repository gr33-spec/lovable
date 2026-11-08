# Reprise du travail (fichier de continuité)

Consigne de Greg (30 octobre 2026) : en cas de limite d'utilisation de Claude Code, la mission n'est pas terminée.
À chaque reprise : relire ce fichier, puis `docs/SUIVI.md` et `docs/DECISIONS.md`, et reprendre à « En cours ».
Ne pas redemander d'autorisation pour ce qui est listé ici. Ne jamais contourner les limites d'utilisation.

## Règles permanentes

- Rien dans `main`, aucune dépense, pas de Stripe live, pas de vrais e-mails aux négoces, pas de modification des CGU,
  des prix facturés, des quotas ou des droits sans accord de Greg.
- Pousser seulement après des suites vertes (domaine, API, web : types, lint, unitaires, build, e2e complets, une seule
  série à la fois), sur `claude/saas-achat-artisans-prompt-1lyihx` puis `claude/integration-groupe`.
- Chaque choix fait seul : une ligne dans `docs/DECISIONS.md` ; chaque demande : une ligne numérotée dans `docs/SUIVI.md`.
- Rapport court en français, captures iPhone SE et ordinateur (avant / après).

## Petite modification = tests ciblés SEULEMENT (Greg, 7 novembre 2026, ferme)

« Ne refais plus jamais les tests à chaque fois que je te demande une simple modification. » Une petite demande (libellé,
couleur, bouton) : types, lint, le test ciblé s'il existe, une capture ; JAMAIS les suites complètes API ou e2e. Les suites
complètes seulement avant un déploiement important, et en le disant.

## Niveaux de tests (Greg, 1er novembre 2026)

- **Petite modification** (un texte, un style, une fonction isolée) : les tests ciblés de la fonctionnalité touchée
  (le fichier de test du domaine ou de l'API, les parcours e2e qui la nomment, `-g`), plus types et lint du paquet touché.
- **Modification importante** (un écran, une route, une règle, une migration) : les tests ciblés + ceux des fonctions
  liées (écrans et routes qui partagent le composant, la donnée ou la règle), plus types, lint et build.
- **Avant un déploiement important** (plusieurs lots, migration, suppression de données, parcours d'achat) : la suite
  complète, domaine, API (≈ 17 min), web (≈ 3 min), e2e (≈ 30 min), une seule série à la fois.
- Quand tout est relancé : dire pourquoi, la progression (étape, nombre de tests passés) et la durée normale (≈ 55 min).
- Aucun déploiement tant que les vérifications du niveau ne sont pas vertes.
- Jamais un processus bloqué : chaque série est lancée avec une limite de temps (`timeout`) ; une série qui la dépasse
  est arrêtée, la cause cherchée, puis relancée.

## En cours

SUIVI 184 (8 novembre 2026) : revue UX du site entier (menu du bas à trois onglets, une action un nom, boutons qui ne
coupent plus leur texte, écrans vides avec leur action). Après les suites vertes : push sur la branche de test, domaines
test.mobiiz.fr / api-test.mobiiz.fr rattachés, recette en ligne. Attendre le retour de Greg (un designer va juger).

SUIVI 179 (7 novembre 2026) : V1 des achats groupés EN LIGNE sur test.mobiiz.fr (commit e1998d75 ; déploiements
`dpl_JAck1CBYB3Ud2WrmoCtqcCinkmUH` site, `dpl_CKpzsiMXCQDCR3bSG597WowKDvWv` API) ; migration `20261108090000_achats_groupes_v1`
appliquée à la base de test ; recette en ligne 17/17 sur iPhone SE, Android, ordinateur. Retour arrière :
`docs/retour-arriere-2026-11-07-achats-groupes-v1.md`. La conversation IA « Nouveau quantitatif » reste sur la branche
locale `assistant-ia-saisie` (non poussée). Attendre les retours de Greg.

SUIVI 176 (7 novembre 2026) : les deux points bloquants sont corrigés (verrou `avecVerrouCircuit` commun à la demande
individuelle et à la confirmation V1 ; aucune ligne cachée dans « Depuis un quantitatif »), suites complètes vertes,
migration testée (vierge et copie). Toujours local, rien poussé : attendre l'accord explicite de Greg, puis suivre
`docs/deploiement-achats-groupes-v1.md` (sauvegarde Neon, push, migration de la base de test, `ACHATS_GROUPES_V1=on` en Preview).

SUIVI 175 (7 novembre 2026) : V5.2 VALIDÉE, fin des maquettes ; développement LOCAL de la V1 des achats groupés
(`docs/achats-groupes-v1.md`). Branche locale `achats-groupes-v1` (partie de c99cdc12), NON POUSSÉE ; aucune sauvegarde
Neon, aucun déploiement sans accord explicite de Greg. Réglage `ACHATS_GROUPES_V1` coupé par défaut. Fait : domaine,
migration additive `20261108090000_achats_groupes_v1`, API `/v1/ag`, écrans, e2e (`playwright.ag-v1.config.ts`).
Hors V1 (ne pas développer sans accord) : acceptation finale, « Offre acceptée », second tour, commande, envoi réel aux
négoces, CGU. Rapport final envoyé ; attendre la décision de Greg (pousser, sauvegarder Neon, déployer).

SUIVI 174 (7 novembre 2026) : « mets en place tout ça pour que je puisse tester » (5 captures). Fait : conversation
« Nouveau quantitatif » (`nouveau-quantitatif.tsx`), carte « Ton quantitatif est prêt » (`liste-prete.tsx`), recommandations
du rapprochement (`opportunites.ts`, paliers = HYPOTHÈSES), 10 photos par envoi (un PDF), « Achat en gros ». Limites V1 :
questions après un document = écran actuel ; notifications inchangées ; page « Achat en gros » seulement renommée ; un
document importé quand une liste tapée existe ouvre une nouvelle liste. Les 5 questions ouvertes à Greg restent aux
réglages actuels (DECISIONS).

SUIVI 173 (7 novembre 2026) : accord de Greg « Oui pour la sauvegarde Neon puis test.mobiiz.fr uniquement ». Sauvegarde
`sauvegarde-avant-lots-prompt-maitre` (br-noisy-frog-b2wy0xkl) faite ; 9429dc8e déployé (5 migrations) ; plan de retour
arrière dans `docs/retour-arriere-2026-11-07.md`. Puis les 4 décisions de Greg (interprète IA plafonné 1 $ / 500, badge
« Famille à vérifier », conditions du négoce, détections prudentes) et l'ACCÈS DÉMO « Découvrir l'application »
(option 1, `ACCES_DEMO`, `docs/acces-demo.md`). EN LIGNE sur test.mobiiz.fr : f7bb44c8 (site dpl_…, API
prévisualisation), migration `20261107140000_conditions_negoce` appliquée à la base de test, accès démo vérifié en ligne
(iPhone SE, Android, ordinateur ; paiement refusé 403). Sauvegarde `sauvegarde-avant-acces-demo` (br-empty-credit-b26ty9mn)
créée SANS point d'accès (plafond de points d'accès Neon atteint ; supprimer celui d'une vieille sauvegarde a été refusé par
le contrôle des permissions). Aucune production.

## À faire ensuite (dans cet ordre)

2. FAIT (garder pour mémoire) : SUIVI 137, « Évolution de la landing, de l'expérience et du positionnement » (message de Greg du 30 octobre, soir) :
   - Économies au premier plan : consulter plusieurs négoces (concurrence saine, jamais contre les négoces), puis le
     collectif comme service complémentaire (« Plus on est, moins on paie », animation des 20 artisans gardée).
   - « Comment ça marche » en 3 étapes : prépare ta demande (main, scan, devis avec l'IA, vérifier) ; consulte plusieurs
     négoces (une demande, PDF, plusieurs envois) ; retrouve les réponses et compare (seulement ce qui existe vraiment :
     auditer l'adresse Mobiiz, « Mes reçus », la comparaison par lien). Pas de badge « Recommandé ».
   - Achats groupés : section à part, facultatifs.
   - Mobile : CTA fixe plus discret (bandeau et dégradé trop lourds), cartes plus compactes, pas de répétitions.
   - Histoire de Greg raccourcie, naturelle.
   - Ne pas toucher prix, quotas, droits, CGU ; analyser le nombre de négoces par demande (limite actuelle, coûts,
     délivrabilité) et recommander sans changer les droits.
   - Compte rendu final en 7 points (constaté, modifié, pourquoi, pas modifié, testé, recommandations, arbitrages).
3. Tâche 23 : CGU proposées (doc VNekwvYYq3KzhijCSm2KDX), attendre la relecture de Greg.
4. Tâche 24 : /couvreurs et /peintres au nouveau design.
5. Point 13 du lot final : la routine du crédit IA le reprend seule quand le crédit revient.
