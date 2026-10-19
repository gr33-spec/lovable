# MISSION.md — journal de mission BatiClair

Ce fichier est la mémoire de la mission. Une nouvelle session reprend avec : **« reprends MISSION.md »**.
Il est tenu à jour après chaque PR fusionnée, quoi qu'il arrive. Dernière mise à jour : 2026-10-19 12 h (UTC).

## 0. Pour reprendre (nouvelle session)

1. Lire ce fichier en entier, puis `baticlair/CLAUDE.md` (règles produit) et `.claude/skills/referentiel/SKILL.md`.
2. Vérifier le crédit API : poser l'étiquette `lecture-reelle` sur une PR ouverte (ou relancer le workflow
   « Vraie lecture (Opus) ») et lire le journal. « credit balance is too low » = crédit épuisé → s'arrêter (§3).
3. Reprendre au premier point « en cours » ou « prochaine étape » du §4.

Conventions de travail (inchangées) :
- Une seule branche de développement : `claude/saas-achat-artisans-prompt-1lyihx`, remise sur `origin/main` avant chaque PR
  (`git fetch origin main && git checkout -B claude/saas-achat-artisans-prompt-1lyihx origin/main`). Donc **une PR ouverte à la fois**.
- Une PR par sujet, CI verte (« Lint, types, tests, build » + « Parcours de bout en bout »), fusion par `merge`, déploiement suivi
  (Vercel : projets baticlair-api et baticlair). Accès GitHub : `gh api` (PR, merge, checks), journaux de CI par l'outil MCP GitHub.
- Tests : domaine `cd baticlair/packages/domain && npx vitest run` (puis `pnpm build`, l'API importe `dist`) ;
  API `service postgresql start` puis `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_test CI=true npx vitest run` ;
  web `pnpm build` puis `CI=true E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_e2e PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test`.
  Après un nouveau test : `npx vitest run test/audit-regles-uniques.test.ts -u` dans le domaine (l'audit recense aussi les tests de l'API).
- La vraie lecture Opus en CI ne tourne que sur demande (étiquette `lecture-reelle`), jamais à chaque push ; au plus une par métier et par jour.
- Rapports en français, courts : Section / Ce qui a changé (avant → après) / À décider. « Règle changée : §X, avant → après ».
- Ne jamais toucher : paiement, CGU, mentions légales, autres projets Vercel, branche par défaut, historique de main, PR #69.
  Jamais de PDF client dans le dépôt ; devis anonymisés seulement (désignations, quantités, unités ; ni nom, ni adresse, ni prix).

## 1. Les deux missions données par Greg (2026-10-19)

### Mission A — BatiClair couvre tous les métiers courants de la construction
Autonomie jusqu'au bout, sans demander d'accord entre les étapes. Arrêt seulement si crédit API épuisé ou règle impossible à tenir.
- **Règles fixes** : règle numéro un (rien d'absent du devis) ; §51 (une lecture IA, questions seulement sur ce qui manque,
  conversion par le code) ; §51.6 (tout orange a sa question) ; §52 (un référentiel par métier au format commun, un devis comme
  test permanent, mention « ratios en cours de validation » tant qu'un artisan du métier n'a pas relu). Une PR par métier, CI verte, prod.
- **Étape 0, socle (une PR)** : dossier `referentiels/`, un fichier par métier, format commun en 8 sections : 1 unités et vocabulaire
  du devis ; 2 fournitures par ouvrage ; 3 ratios et longueurs par point ; 4 conditionnements fournisseur ; 5 questions fermées et
  boutons ; 6 test permanent (devis + bref + questions + comptes attendus) ; 7 points à relire par un artisan, confiance par ratio
  (sûr / usuel / à vérifier) ; 8 sources (DTU, NF, fiches fabricants, règles pro). Registre : ajouter un métier = ajouter un fichier,
  zéro code. Chargement automatique par le repérage ; « métier non couvert » avec message clair sinon. Écran « Métiers couverts »
  dans Compte (brouillon / en validation / relu). Référentiel en cache de prompt à chaque appel.
- **Étape 1, recherche par métier** avant chaque référentiel (web si accessible, sinon connaissance citée et « à vérifier ») :
  écriture des devis du métier, ce qui se commande par ouvrage, ratios, conditionnements, 5 à 10 données souvent omises.
  Un ratio sans source ni niveau de confiance est interdit.
- **Étape 2, un référentiel par PR, dans cet ordre** : terrassement-VRD ; maçonnerie-gros œuvre (reprendre le doc du 3 octobre) ;
  charpente bois ; couverture (existe, ne pas toucher) ; étanchéité toiture-terrasse ; menuiseries extérieures ; menuiserie intérieure
  et agencement ; plâtrerie-isolation ; électricité (existe, ne pas toucher) ; plomberie-sanitaire ; chauffage-PAC-VMC ;
  carrelage-faïence (reprendre le doc du 3 octobre) ; sols souples et parquet ; peinture-finitions ; serrurerie-métallerie ;
  ravalement-ITE. Pour chacun : devis d'épreuve anonymisé de 2 à 4 pages, bref + questions + comptes attendus écrits à la main,
  une vraie lecture, comparaison, correction du prompt ou du référentiel, fusion.
- **Étape 3, multi-lots** : devis d'épreuve de maison complète (8 lots) → carte « Lots repérés », une liste par lot, envoi par lot. Test permanent.
- **Rapport** : un message par métier fusionné (nombre de ratios, questions type, 3 points à relire en premier, coût API de la vraie
  lecture) ; à la fin, tableau de bord (métiers, état, reste à faire : artisan relecteur et devis réel par métier).
- Docs de Greg à réexporter avec la mission : référentiel couverture https://claude.ai/code/artifact/1f60bf5a-edad-4ce7-ba90-afb6930d498e
  et référentiel électricité https://claude.ai/code/artifact/f315619f-97ad-44ee-b00b-102d02e79a1e (version du 11 octobre aussi
  jointe en .md ; à comparer avec `baticlair/docs/referentiel-electricite.md`).

### Mission B — continue jusqu'au vendredi 23 octobre 2026, 12 h
Après la mission A, enchaîner sans s'arrêter tant qu'il y a du crédit. Arrêt si crédit API épuisé ou contexte > 85 % : alors écrire
l'état complet ici et dire à Greg « contexte plein, relance une session avec : reprends MISSION.md ». Boucle, dans l'ordre, puis recommencer :
1. **Précision des quantitatifs** : web (fiches techniques, conditionnements, DTU, catalogues négoces) → corriger les ratios, source
   et confiance ; « à vérifier » confirmé → « usuel » ; contredit → corrigé avec la source.
2. **Épreuves** : 5 devis d'épreuve par métier (tableau propre, texte libre, scan, abréviations, multi-lots), passés au faux lecteur et
   au calcul ; tout faux ou orange sans question corrigé ; une vraie lecture Opus par métier et par jour au plus.
3. **Robustesse** : PDF illisible, photo floue, 40 pages, plusieurs fichiers, réseau perdu pendant les questions, double tap,
   retour arrière : rien ne casse, message clair et test pour chaque cas.
4. **Écrans** : relecture iPhone (§49, §50) : rien de coupé, barre figée, dix questions sans défiler, coches vertes, légende,
   mention de validation ; captures dans la PR.
5. **Vitesse et coût** : mesurer temps de lecture et coût API par devis, les inscrire ici (§5), réduire (cache, pages inutiles, repérage).
- Règles : une PR par sujet ; règle numéro un, §51, §51.6, §52 ne bougent jamais ; pas de réécriture de prompt de lecture sans test
  permanent avant/après ; ni paiement, ni CGU, ni mentions légales. **Chaque jour à 18 h (Paris)** : un seul message à Greg (ce qui
  est en prod, chiffres : métiers, ratios, tests, coût par devis ; au plus 3 décisions, avec recommandation).

## 2. État au 2026-10-19

En production (main) : tout jusqu'à la PR #260, plus #262 (autre chantier, `patrimoine/`, pas le nôtre).
- #257 carte « Lots repérés » ; #258 chaque bouton du modèle passe (22 tiroirs) ; #259 repérage rapide des métiers puis une seule
  lecture Opus ; #260 « Gros devis, j'y suis encore… » après 30 s.
- L'existant multimétier : 22 tiroirs TypeScript dans `baticlair/packages/domain/src/referential/data/*.ts` (registre `REFERENTIALS`,
  `registry.ts`) ; couverture et étanchéité relues (`METIERS_RELUS`), les autres portent « Ratios en cours de validation ».
  Référentiels écrits : `baticlair/docs/referentiel-couverture.md`, `baticlair/docs/referentiel-electricite.md`.

En attente (bloqué par le crédit API) :
- **PR #261 fermée, à rouvrir** — « Bref : les mots du devis, mot pour mot (prompt lecture v5) ». Décision de Greg : durcir le
  prompt, le contrôle `controleLectureDe00000071` ne bouge pas. Commits : `3984972` (prompt v5 + test), `9337dc7` (instantané de
  l'audit), `a4f2ad4` (message d'erreur du fournisseur IA gardé dans `ReadAttempt.errorMessage`, imprimé par le script de vraie
  lecture). Reprise : `git fetch origin pull/261/head:pr261 && git checkout -B claude/saas-achat-artisans-prompt-1lyihx origin/main
  && git cherry-pick 3984972 9337dc7 a4f2ad4`, nouvelle PR, étiquette `lecture-reelle`, fusion si DE00000071 et D.2026.105 passent
  le contrôle (avant : 3 écarts de bref, « 4 fenêtres de toit Velux GGL SK06 », « avec raccord »).
- 7954 en CI : FUSIONNÉ (PR « 7954 anonymisé en CI ») ; seule la vraie lecture attend le crédit (file du §2 bis).

## 2 bis. Consigne en vigueur (Greg, 2026-10-19)

« Le crédit API Anthropic est à zéro et le restera quelques jours. Ne t'arrête pas : fais tout ce qui ne demande pas de vraie
lecture Opus (référentiels avec recherche web, devis d'épreuve par le faux lecteur, robustesse, écrans, vitesse, tests). Note dans
MISSION.md la liste des vraies lectures à lancer quand le crédit reviendra, une par métier. **Zéro appel API tant que je ne t'ai pas
dit « crédit rechargé ».** » → Pas d'étiquette `lecture-reelle`, pas de test de crédit. Une PR qui change le prompt de lecture
attend la vraie lecture avant fusion (file ci-dessous) ; tout le reste se fusionne sur CI verte.

### File des vraies lectures à lancer au retour du crédit (une par métier, dans cet ordre)

| # | Quoi | Comment | Attendu |
|---|---|---|---|
| 1 | Prompt v5 (bref mot pour mot) | recréer la PR #261 (§2), étiquette `lecture-reelle` | DE00000071 sans écart au contrôle, D.2026.105 sans écart |
| 2 | 7954 (électricité + VMC + sanitaire) | même passage (le workflow lit `fixture:7954`) | rapport à Greg : lots repérés, bref, 7 questions mot pour mot, contrôle `controleLecture7954` |
| 3+ | Un devis d'épreuve par nouveau métier | ajouté au workflow à chaque PR de métier | ligne ajoutée ici à chaque métier |

## 3. Blocage actuel

**Crédit API Anthropic épuisé** (depuis le 13 octobre ≈ 7 h 45 UTC ; encore constaté le 19 octobre 11 h 44 UTC) : tout appel
(repérage Sonnet, lecture Opus) répond 400 « Your credit balance is too low to access the Anthropic API ». La production ne lit
plus aucun devis tant que ce n'est pas rechargé (même nom de clé `BATICLAIR_ANTHROPIC_KEY` en CI et sur Vercel).
À faire par Greg : https://console.anthropic.com/settings/billing, bonne organisation (celle de la clé), acheter des crédits et
activer l'auto-reload. Le forfait Claude (claude.ai) est un autre compteur et ne compte pas ici.

## 4. Plan et avancement

| # | Sujet | État |
|---|---|---|
| 1 | Rouvrir #261 (bref mot pour mot), vraie lecture, fusion | bloqué (crédit) |
| 2 | PR 7954 en CI | fait ; vraie lecture en file (§2 bis) |
| 3 | Étape 0 : socle `referentiels/` (format 8 sections, registre par fichier, « Métiers couverts », cache de prompt) | à faire |
| 4 | Étape 1-2 : 14 nouveaux référentiels, un par PR, dans l'ordre du §1 | à faire |
| 5 | Étape 3 : devis maison complète 8 lots | à faire |
| 6 | Mission B, boucle 1 à 5, jusqu'au vendredi 23 octobre 12 h | à faire |

Prochaine étape : point 3 (socle), sans API. Au retour du crédit : file du §2 bis.

## 5. Mesures (temps et coût par devis)

| Devis | Date | Repérage | Lecture Opus | Coût |
|---|---|---|---|---|
| DE00000071 (couverture, 1 page) | 2026-10-13 | 2 s | 75 s | à mesurer |
| D.2026.105 (réparation, 1 page) | 2026-10-13 | 1 s | 27 s | à mesurer |

## 6. Décisions prises (rappel)

- 2026-10-13 : phrase d'attente après 30 s : oui (#260, en prod).
- 2026-10-13 : bref DE00000071 : durcir le prompt, le contrôle ne bouge pas (#261, en attente).
- 2026-10-13 : 7954 anonymisé comme D.2026.105 et lu en CI (patch prêt).

## 7. Questions pour Greg

- Recharger le crédit API (§3).
- Les « docs du 3 octobre » (maçonnerie, carrelage) à reprendre : où sont-ils ? (introuvables dans le dépôt à ce jour ; à chercher
  dans `baticlair/docs/` au démarrage de l'étape 2, sinon demander le lien).
