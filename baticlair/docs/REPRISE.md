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

## En cours

SUIVI 155-159 (brief de Greg du 31 octobre : « Assistant Mobiiz, PDF interactif » + Clair / Sombre) : TOUT FAIT
(thème, audit, PDF trois modèles + bloc de réponse, assistant, « Je décris mon chantier »). Reste : suites complètes,
push, captures et rapport à Greg. Plan et choix : `docs/assistant-mobiiz.md`, DECISIONS du 31/10.


SUIVI 152 : refonte de l'app sur ordinateur (lg: seulement, mobile inchangé). Fait : menu, accueil, listes, chantier, achats groupés, négoces, profil. Reste : e2e complets, push, captures avant / après à Greg (script de capture temporaire : scratchpad `zz-captures-pc.spec.ts`).

SUIVI 143-145 (messages de Greg du 31 octobre, après le catalogue métier), dans cet ordre :
- [x] 143. Landing « Comment ça marche ? » : vraies captures de l'app (données fictives) dans un cadre de téléphone
  neutre, sans marque, à la place des trois téléphones dessinés ; CTA fixe mobile qui ne cache plus le texte du collectif.
- [x] 144. Couverture et peinture : recherche poussée, données vérifiées (tuiles, ardoises naturelles et synthétiques,
  canal, plates, accessoires), sources et dates ; peinture plus générique (par attributs).
- [x] 145. Un produit inconnu devient une référence quand un autre artisan écrit la même chose ou quand il est commandé
  en achat groupé (garder confidentialité et contrôle ; décision dans DECISIONS).

Précédent :
SUIVI 142, « CATALOGUE MÉTIER INTELLIGENT » (message de Greg du 31 octobre). Plan par étapes (cocher au fil de l'eau) :
- [x] 1. Audit (catalogue en données, recherche, Écris ta liste, lecture IA, achats groupés, PDF) → docs/catalogue-metier.md
- [x] 2. Moteur de recherche : dimensions (18x40, 18 40, 18×40), références exactes (H14 ≠ HP10), abréviations, fautes
- [x] 3. Couverture d'abord : seulement des données sourcées (référentiel du fondateur, fabricants vérifiés), sinon « à vérifier »
- [x] 4. Écris ta liste : préciser seulement ce qui manque (variantes en boutons), « Je ne trouve pas mon matériau », référence
- [x] 5. Apprentissage : propositions existantes (admin) + rapprochement de désignations voisines, seuils configurables
- [x] 6. Lecture IA : la question « Quel modèle ? » répondue avec le même moteur ; jamais une référence inventée
- [x] 7. Achats groupés : rapprochement par clé technique (existant `clesDeRegroupement`), carte discrète
- [x] 8. Référence conservée dans liste, PDF, demandes ; tests de non-régression ; rapport
État détaillé : docs/catalogue-metier.md. Étapes 1-8 en ligne (c6f878a), rapportées à Greg. Suite : données vérifiées à étendre (voir docs/catalogue-metier.md §5).
Règles : rien d'inventé ni de faux produit ; pas de collecte massive ; pas de migration destructive ; landing, abonnements,
DA intouchés.

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
