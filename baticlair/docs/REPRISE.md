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

Parcours produit du 6 novembre 2026 (SUIVI 171) sur la branche LOCALE `claude/pilote-fiabilite`, NON poussée, au-dessus
de SUIVI 170. S1 (rapprochement continu : domaine, migration ADDITIVE `20261106090000_rapprochement_continu` appliquée aux
seules bases locales de test, API, tests) et S2 (écrans, menu, e2e) commités. S3 en cours : suites complètes, captures,
rapport. Arrêt prévu avant tout push (test.mobiiz.fr) : accord de Greg pour ce push précis.
Attend Greg : accord pour chaque action en ligne (push, mise en production, réglages Vercel, Neon, Stripe, Resend, crédit IA).

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
