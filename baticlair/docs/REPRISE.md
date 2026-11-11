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

SUIVI 188 (10 novembre 2026) : INTERFACE ET PARCOURS COMPLETS (archive MOBIIZ-UX-COMPLET, prompt maître, 52 captures), voir
`docs/ux-complet.md`. Branche locale `ux-complet` (partie de fd157e1c), à pousser sur
`claude/saas-achat-artisans-prompt-1lyihx` une fois les suites vertes. Fait : missions (domaine, migration
`20261110200000_missions_messages_alertes`, API derrière `MISSIONS_V1`, écrans), « Messages et réponses », cloche,
réglages de notification, menu du compte, « Profil et paramètres », quatre onglets, accueil à trois cartes, thème
Automatique. Tests : domaine `missions.test.ts`, API `missions.test.ts`, `missions-coupees.test.ts`,
`isolation-toutes-routes.test.ts`, e2e `e2e-ag-v1/missions.spec.ts` (la configuration `playwright.ag-v1.config.ts` allume
`ACHATS_GROUPES_V1` ET `MISSIONS_V1`, comme test.mobiiz.fr). Déploiement : `MISSIONS_V1=on` en Preview sur la branche de
test, relevé de la base avant et après (`releve-base-test.mjs`), rattacher les deux domaines de test. Restent différents
des maquettes : la présentation carte par carte des parcours Quantitatifs (02, 03, 27 à 32) et Achats groupés (04 à 05,
33 à 42, 48), gardés tels qu'ils fonctionnent. Aucune production.
EN LIGNE sur test.mobiiz.fr le 10 novembre : commit 81409636 (site dpl_FZUzof6me6hC8KRpyoTjrFcc4KgL, API
dpl_J2WwqxXo83Q9SVaD8mAWASDWBy16), recette en ligne 25/25 sur trois appareils, base conservée. Avant chaque poussée :
`npx tsc -p tsconfig.vercel.json` dans `apps/api` (l'hébergeur compile en mode non strict ; un build en échec applique
quand même la migration). Tests liés à l'heure : `relances-lot-final.test.ts` échoue s'il est lancé après 23 h UTC
(échéance fabriquée à minuit) ; ce n'est pas un défaut du produit. En attente de Greg : validation,
plafond de branches Neon, présentation des parcours Quantitatifs et Achats groupés.

SUIVI 189 (11 novembre 2026) : VÉRIFICATION AVANT VALIDATION, voir `docs/verification-2026-11-11.md`. Greg ne valide ni
la fin du chantier ni la production. ATTENTION : `test.mobiiz.fr` et `api-test.mobiiz.fr` suivent tout seuls le dernier
déploiement de la branche ; on ne pousse donc RIEN après avoir testé la version finale (les résultats vont dans le rapport
et le livrable de preuves, hors dépôt). Horloge des tests : `horlogeAu(...)` fixe un fichier, `TEST_DECALAGE_JOURS=n`
avance tous les autres (`apps/api/test/support/horloge-decalee.ts`). EN ATTENTE DE L'ACCORD DE GREG : 1) supprimer une
branche Neon (recommandée : `sauvegarde-avant-lots-prompt-maitre`), puis créer et vérifier
`sauvegarde-avant-ux-complet-2026-11-11` ; 2) lancer `reception-negoce.mjs --envoyer` (une vingtaine d'e-mails, 0 €) ;
3) la reprise graphique des Quantitatifs et des Achats groupés (chantier séparé, liste dans le document).

SUIVI 190 (11 novembre 2026, après-midi) : FAIT, partie 7 du même document. Branche Neon
`sauvegarde-avant-lots-prompt-maitre` supprimée (la seule) ; sauvegarde `sauvegarde-test-2026-11-11-35d83f77`
(`br-wild-violet-b2etltsm`) créée et vérifiée. Recette réelle de réception passée (aucun défaut du circuit). Décision de
Greg : jusqu'à 5 négoces par envoi en payant, 1 en gratuit. ATTENTION : chaque recette en ligne envoie une douzaine
d'e-mails ; le plafond gratuit est de 100 par jour (99 partis le 11 novembre). Le plafond Neon de 10 branches est de
nouveau atteint. Reste en attente de Greg : sa validation sur de vrais téléphones, puis la reprise graphique.

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
