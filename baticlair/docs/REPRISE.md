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

SUIVI 138 (réponses de Greg du 30 octobre, nuit) :
- Bouton principal « Commencer gratuitement » (accroche, bas de page, bouton fixe) ; « Rejoindre le collectif » seulement
  dans la section du collectif ; un seul bouton principal visible à la fois sur téléphone.
- Intitulés : plus de diffusion automatique à tous. Les siens restent à l'artisan ; les intitulés génériques (tous les
  mots connus du catalogue, nombres et unités) écrits par plusieurs entreprises deviennent des PROPOSITIONS à valider
  par l'admin, qui les ajoute au catalogue ; jamais un nom, une référence ou un mot inconnu.
- « Pourquoi Mobiiz ? » neutre, collectif (texte proposé par Greg, raccourci), aucune identité ni photo du fondateur ;
  la photo de groupe reste (droits à confirmer).
- CGU, tarifs, abonnements : ne rien changer ; signaler les incohérences (Essentiel / Collectif, Pro 8 / 6 analyses).

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
