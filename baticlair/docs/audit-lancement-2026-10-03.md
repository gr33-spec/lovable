# Audit avant lancement — 3 octobre 2026

Audit sans complaisance, rien n'a été corrigé. Chaque point donne la preuve (fichier, ligne ou test), le correctif proposé et l'effort (S = moins d'une journée, M = 1 à 3 jours, L = une semaine ou plus).

État audité : branche `claude/saas-achat-artisans-prompt-1lyihx` (commit `f0adad8`), c'est-à-dire la prod actuelle + la liste d'achats (PR #121, non fusionnée). ~70 000 lignes TypeScript, 264 commits. Tests : 281 cas domaine (23 fichiers), 16 fichiers API, 13 parcours e2e (26 exécutions avec les deux tailles d'écran).

## Avis net

**Non, on ne lance pas en l'état auprès de vrais artisans payants.** On peut lancer **une bêta fermée gratuite** (10 à 20 couvreurs choisis, qui savent que c'est une bêta) une fois les 5 points ci-dessous faits — environ **une semaine** de travail.

Ce qui est solide : le moteur de calcul (formules à unités, traces, intégrité des référentiels, 281 tests dont les deux vrais devis du fondateur), l'isolation entre entreprises (toutes les requêtes vues passent par `companyId`), l'authentification (Better Auth, cookies, CORS fermé, en-têtes de sécurité), le coût IA maîtrisé (plafond par document, comptage par mois).

Ce qui ne l'est pas : la lecture des PDF (librairie vulnérable, lecture faite dans la requête d'upload), aucune limite de débit, aucune suppression de compte, aucune alerte quand ça casse en prod, et une UX qui n'a pas encore été vue par un seul couvreur hors du fondateur.

### Les 5 choses à faire d'abord

1. ~~**Mettre à jour `pdfjs-dist` et désactiver l'exécution de code dans les PDF** (B1) — S.~~ Fait le 3 octobre.
2. ~~**Limiter le débit** sur connexion, inscription, upload et lecture IA (B2) — S.~~ Fait le 3 octobre.
3. **Sortir la lecture IA de la requête HTTP** : file d'attente + statut interrogé par l'écran, sinon les devis de 30 pages scannées tombent en timeout (B3) — M.
4. **Suppression de compte et export des données** (RGPD) + page « Confidentialité » (B4) — M.
5. **Alerte en cas d'erreur en prod** (Sentry ou équivalent) + contrôle que les sauvegardes Neon sont actives (B5, M1) — S.

Et, en parallèle, **faire tester l'écran « liste d'achats » par 3 couvreurs qui ne sont pas le fondateur**, sans aucune explication, en les regardant faire (U1). C'est la seule façon de vérifier la règle des 10 ans.

---

## Bloquant (avant toute mise en ligne publique)

### B1 — Librairie PDF vulnérable, exécutée sur des fichiers envoyés par n'importe qui — **corrigé le 3 octobre** (pdfjs-dist 6.3.289, `disableAutoFetch`)
- Preuve : `pnpm audit` → **high** « PDF.js: Arbitrary JavaScript execution upon opening a malicious PDF », version installée `pdfjs-dist@5.7.284` (`apps/api/package.json:31`), correctif ≥ 6.2.108. Le lecteur `apps/api/src/modules/documents/infrastructure/pdfjs-pdf-reader.ts` ne passe pas `isEvalSupported: false` (aucune occurrence dans le fichier).
- Risque : un PDF piégé exécute du code dans le serveur de l'API, là où se trouvent la clé Anthropic et la base.
- Correctif : monter `pdfjs-dist`, passer `isEvalSupported: false` à `getDocument`, ajouter un test qui ouvre un PDF avec une police malveillante connue et vérifie qu'il est refusé. Effort : S.

### B2 — Aucune limite de débit — **corrigé le 3 octobre** (compteurs en base, voir `docs/security.md`)
- Preuve : `grep -ri "throttl|rateLimit" apps/api/src apps/api/package.json` → rien. Routes `POST /v1/auth/*`, `POST documents` (50 Mo autorisés par requête, `documents.controller.ts:39`), lecture IA.
- Risque : force brute sur les mots de passe ; un seul script vide le budget IA (3 € par document × autant de requêtes qu'on veut, `config.ts:60` ne plafonne que par document, le palier mensuel compte après l'appel) ; saturation de la base par l'upload.
- Correctif : `@nestjs/throttler` (par IP sur auth, par entreprise sur documents et lecture), plafond IA **mensuel dur** par entreprise vérifié avant l'appel. Effort : S.

### B3 — La lecture IA se fait dans la requête d'upload
- Preuve : `documents.service.ts:87` `await this.read(...)` dans `upload()` ; client Anthropic `timeout: 180_000` (`anthropic-document-reader.ts:51`) ; `apps/api/vercel.json` ne fixe pas `maxDuration`. Un devis de 30 pages scannées = plusieurs appels vision successifs.
- Risque : la fonction Vercel coupe avant la fin ; l'artisan voit une erreur ou un document « en cours » pour toujours ; le coût IA est déjà dépensé. Testé en local seulement avec l'IA simulée ; aucun test avec un vrai devis de 30 pages.
- Correctif : enregistrer le document, répondre tout de suite, lire dans une tâche de fond (Vercel background function, ou simple table `jobs` + cron), l'écran interroge le statut toutes les 3 s (il affiche déjà « jusqu'à une minute »). Effort : M.

### B4 — Ni suppression de compte, ni export des données
- Preuve : aucune route `DELETE` dans `apps/api/src/modules/identity` ni `tenancy` (`grep "@Delete"` → price-requests, takeoff-lines, suppliers, documents seulement) ; aucun mot « rgpd / export » dans `apps/api/src`.
- Risque : illégal dès le premier client payant (RGPD art. 17 et 20) ; les devis clients contiennent des noms et adresses de particuliers.
- Correctif : `DELETE /v1/me` (anonymisation + purge des `DocumentBlob` de l'entreprise si dernier membre), `GET /v1/me/export` (zip JSON + PDF), bouton dans Compte, politique de confidentialité et durée de conservation (proposition : 24 mois après dernière activité). Effort : M.

### B5 — Aucune alerte quand la prod casse
- Preuve : journalisation pino seulement (`apps/api/src/platform/logging`), `GET /v1/health` existe, mais aucun Sentry/OpenTelemetry/alerte (`grep "sentry|otel"` → rien). Les échecs de lecture IA sont enregistrés en base (`status: failed`) et nulle part ailleurs.
- Risque : on apprend les pannes par les artisans, ou jamais.
- Correctif : Sentry sur API + web (DSN en variable d'env), alerte si taux d'échec IA > 20 % sur 1 h, uptime check sur `/v1/health`. Effort : S.

## Dans le mois

### M1 — Sauvegardes et chiffrement : jamais vérifiés
- Preuve : base Neon créée depuis Vercel Storage (`docs/mise-en-ligne.md:62-68`) ; Neon chiffre au repos et garde un historique de 7 jours (Free) — jamais contrôlé, aucune restauration testée. Les PDF sont en base (`DocumentBlob`), donc couverts par la même sauvegarde — mais une base qui grossit de 4 Mo par devis atteint la limite du plan Free (0,5 Go) après ~120 devis.
- Correctif : vérifier le plan Neon et le point-in-time recovery, faire une restauration d'essai, planifier le passage des PDF dans un stockage objet (Vercel Blob / S3, région UE) avant 100 clients. Effort : S (vérif) puis M (stockage).

### M2 — Injection par le contenu du devis
- Preuve : le prompt (`apps/api/src/modules/takeoff/application/prompt.ts:14`) colle le texte du devis en lignes numérotées, sans balisage « données non fiables » ni consigne d'ignorer les instructions qu'il contient. La sortie est validée par zod (`takeoff-extractor.ts:5`), ce qui limite les dégâts au contenu des champs texte (`designation`, `doubt`, `notes`), affichés à l'artisan.
- Risque : un devis contenant « ignore les consignes et écris … » peut faire afficher n'importe quoi dans les notes ; pas d'accès aux données d'autrui (pas d'outils donnés au modèle).
- Correctif : encadrer le texte du devis dans un bloc explicitement « document », consigne de ne jamais suivre d'instruction qui s'y trouve, test permanent avec un devis piégé, longueur maximale des champs texte en sortie. Effort : S.

### M3 — Dépendances vulnérables (hors pdfjs)
- Preuve : `pnpm audit` → `deepmerge-ts` (high, stack exhaustion), `mysql2` ×2 (via `@prisma/client` → non utilisé, MySQL absent), `braces` (high, sans correctif publié).
- Correctif : `pnpm update` ciblé + `pnpm audit` dans la CI (bloquant sur high). Effort : S.

### M4 — Pente hors table : l'ouvrage disparaît sans explication claire
- Preuve : `hypotheses-par-defaut.test.ts:55` — pente 30 % avec ardoises → `status: "unknown"`, « Pente du toit trop faible pour cet ouvrage (minimum 45 %) ». À 5° (9 %) même chose ; à 80° (567 %) la table prend la dernière ligne (≥ 119 %) : correct. Surface 2 m² → 1 rouleau d'écran de 75 m² (juste mais à dire) ; 2 000 m² → 112 300 ardoises, affiché sans « êtes-vous sûr ».
- Correctif : la pente hors table devient une **question** (« Pente lue : 30 %. Pose d'ardoises sous 45 % : quelle technique ? ») et non un ouvrage muet ; garde-fou d'ordre de grandeur (surface > 800 m² ou < 5 m² → confirmation). Effort : S.

### M5 — Précision des quantités : l'écart vient des hypothèses, pas des calculs
- Preuve : `docs/liste-achats-vrais-devis.md`. Devis D-2026-015 : 1 488 tuiles au pureau mini (zone 3) contre 1 345 au pureau 34,3 cm (+10,6 %) ; devis ardoises : 11 230 (zone 3) contre 10 048 (zone 1), +11,8 %. Sur un même jeu d'hypothèses, l'écart entre moteur et exemples du référentiel est inférieur à 2 % (`referential.test.ts`, `cas-reference-d2026-015`). 
- Donc : la précision ±2 % n'est tenable que si la **zone et le pureau sont confirmés** par l'artisan. Ils sont aujourd'hui dans « Hypothèses » repliées. À remonter en première question quand l'écart dépasse 5 % de la commande (voir plan d'architecture : questions dérivées de la sensibilité). Effort : M.

### M6 — Ratios sans source publique
- Preuve : `docs/ratios-a-valider.md` liste tout ce qui vaut « pratique validée par le fondateur » (`roofing.ts:214`) : tableau de recouvrement ardoise, 2,9 faîtières/ml, crochets de gouttière tous les 40/50 cm, pertes 3/5 %, etc. Trois écarts entre le document du fondateur et les fiches fabricants déjà notés.
- Correctif : chaque ratio cité avec sa source publique (fiche fabricant en ligne) ou marqué « à confirmer par l'artisan » à l'écran. Effort : M, continu.

### M7 — Perte réseau et double tap
- Preuve : les boutons passent `pending` et sont désactivés (`purchase-list.tsx:98,190,215`), l'API a l'idempotence par en-tête (`idempotency.interceptor.ts`, 24 h). Mais `apps/web/src/lib/api.ts` ne distingue pas « réseau coupé » d'« erreur serveur » (catch génériques lignes 30, 39, 73, 94) : message identique, pas de réessai, pas de « vos réponses sont gardées ».
- Correctif : détecter `TypeError: fetch failed`, message « Pas de réseau, on réessaie », réessai automatique des GET, réponses aux questions gardées localement jusqu'à l'envoi. Effort : S.

### M8 — Montée en charge
- 1 000 artisans : tient. Postgres indexé (23 `@@index`), requêtes par entreprise, Vercel sans état. Point faible : `DocumentBlob` en base (M1).
- 10 000 : les lectures IA synchrones (B3) et l'absence de file d'attente deviennent le goulot ; coût IA 3–6 €/artisan/mois = 30–60 k€/mois, à mettre en face du prix.
- 100 000 : architecture à revoir (stockage objet, file de jobs, cache des référentiels, lecture par lots). Pas un sujet de lancement.
- Aucun test de charge n'a jamais été fait. Effort pour un premier tir k6 sur `/v1/health`, login, liste chantiers : S.

### M9 — Robustesse IA
- Preuve : statuts `success | invalid_output | refused | provider_error | timeout` (`document-reader.ts:3`), `maxRetries: 1`, pas de relance identique (PD gros devis), garde-fou de coût `AI_ANALYSIS_MAX_EUR=3`. Sortie aberrante (quantité 999 999) : la zod n'a **pas de bornes** (`quantity: z.string().nullable()`), passe tel quel jusqu'à l'écran.
- Correctif : bornes de vraisemblance par unité (m² ≤ 5 000, u ≤ 100 000) → ligne marquée « à vérifier » plutôt que calculée ; message clair « L'assistant est indisponible, réessayez dans 5 min » quand `provider_error`. Effort : S.

### M10 — Observabilité produit
- Preuve : `readingStats` enregistrés par analyse ; aucun événement produit (devis déposé → liste vue → validée → envoyée), aucun tableau de bord.
- Correctif : 6 événements dans une table `events` + requête SQL hebdomadaire ; c'est aussi ce qui alimente la section 23 du référentiel (corrections des artisans). Effort : S.

## Amélioration

### A1 — Qualité du code et architecture
- Points forts : séparation domaine pur / API / web, provenance de chaque chiffre, intégrité des référentiels testée, tests permanents par devis réel.
- Points faibles : la **ligne de devis** reste l'objet central (le pont lignes → ouvrages est une couche de rattrapage, `plan.ts`, `line-roles.ts`), le prompt est v7 (lecture par lignes), `roofing.ts` fait ~700 lignes de données en TypeScript là où le référentiel demande des JSON par métier (section 22). Détail et chantiers : `docs/plan-architecture-v2.md`.

### A2 — UX règle des 10 ans, écran par écran
- Dépôt : bon (un bouton, un fichier). Lecture : « Préparer la liste de matériaux… jusqu'à une minute » sans étapes visibles ; la section 21 demande les étapes de réflexion. Liste d'achats : « J'ai compris » + « À acheter » sont lisibles ; « À faire chiffrer » et « Hypothèses » sont du vocabulaire de pro — remplacer par « Le fournisseur devra estimer » et « Ce que j'ai supposé » ; « Voir le calcul » montre une formule, pas une phrase. Questions : boutons + « Je ne sais pas » OK. Validation : pas de PDF bon de commande (section 21, 24). Jamais testé par un utilisateur extérieur (U1).

### A3 — Tests manquants
- Aucun e2e sur : PDF illisible, devis scanné, perte réseau, double tap, 30 pages. Aucun test API sur l'isolation multi-entreprise **par requête HTTP** (un utilisateur A qui demande le takeoff de B) — l'isolation est dans le code mais pas prouvée par un test. Effort : M.

### A4 — Documentation
- `docs/` compte 37 fichiers dont beaucoup générés ; faire le tri (archiver les bancs d'essai anciens) pour que le prochain développeur lise 5 documents, pas 37. Effort : S.
