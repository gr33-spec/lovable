# MISSION.md — journal de mission BatiClair

Ce fichier est la mémoire de la mission. Une nouvelle session reprend avec : **« reprends MISSION.md »**.
Il est tenu à jour après chaque PR fusionnée, quoi qu'il arrive. Dernière mise à jour : 2026-10-19 13 h (UTC).

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

## 2. État au 2026-10-20 (point de 18 h)

En production (main) : inchangé depuis le 19 (jusqu'à #283, tableau de bord des métiers). Zéro appel API aujourd'hui.
Branche `claude/saas-achat-artisans-prompt-1lyihx` = PR #284 (non fusionnée, décision de Greg) : groupé étapes 1 à 7
faites (+ onglet « Groupé », accroche par métier, bloc grisé SIRET, page de réponse négoce, SIRET_VERIFICATION=forme en
prévisualisation seulement, WEB_APP_URL multiple + origines `*-gr33-spec.vercel.app` acceptées en preview, santé `db` /
`origine`). Prévisualisation Vercel ouverte pour cette seule branche : web
`https://baticlair-git-claude-saas-achat-artisans-promp-67e67a-gr33-spec.vercel.app`, API
`https://baticlair-api-git-claude-saas-achat-artisans-p-1271cd-gr33-spec.vercel.app` (Resend pas posé en Preview :
`email:false`). Suites : domaine 658, API 373 + étape 7, e2e groupé verts. Reste : étapes 8 (notifications, webhook
e-mail entrant) et 9 (admin Greg).

## 2 ter. État au 2026-10-19 (archive)

En production (main) : tout jusqu'à la PR #276 (fiche chauffage), plus #262 (autre chantier, `patrimoine/`, pas le nôtre).
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
| 3 | Terrassement-VRD (`fiche:terrassement`) | étiquette `lecture-reelle` sur une PR qui touche `referentiels/metiers/terrassement.md` (ou `pnpm exec tsx scripts/lecture-reelle.ts fixture:fiche:terrassement fiche:terrassement`) | `controleLectureFiche` sans écart : 12 lignes, chaque ouvrage de la §6, aucune épaisseur ni diamètre inventés |
| 4 | Maçonnerie (`fiche:maconnerie`) | même commande, `fixture:fiche:maconnerie fiche:maconnerie` | 12 lignes, chaque ouvrage de la §6, aucune épaisseur, section ni mortier inventés |
| 5 | Charpente (`fiche:charpente`) | `fixture:fiche:charpente fiche:charpente` | 7 lignes, chevronnage sans longueur ni entraxe inventés, fermettes sans ouvrage |
| 6 | Menuiseries extérieures (`fiche:menuiserie`) | `fixture:fiche:menuiserie fiche:menuiserie` | chaque menuiserie gardée telle qu'écrite ET sa pose ; format déduit des cotes, jamais inventé |
| 7 | Menuiserie intérieure (`fiche:menuiserie-interieure`) | `fixture:fiche:menuiserie-interieure fiche:menuiserie-interieure` | blocs-portes tels qu'écrits ; pose et colisage du parquet jamais inventés |
| 8 | Plâtrerie-isolation (`fiche:platrerie`) | `fixture:fiche:platrerie fiche:platrerie` | hauteur et résistance jamais inventées ; consommables seulement sur la question |
| 9 | Plomberie (`fiche:plomberie`) | `fixture:fiche:plomberie fiche:plomberie` | chaque appareil tel qu'écrit ; distance, tube et kit jamais inventés |
| 10 | Chauffage-PAC-VMC (`fiche:chauffage`) | `fixture:fiche:chauffage fiche:chauffage` | appareils tels qu'écrits ; distance, type de PAC, réseau, pièces de service jamais inventés |
| 11 | Carrelage-faïence (`fiche:carrelage`) | `fixture:fiche:carrelage fiche:carrelage` | format, pose, épaisseur de ragréage jamais inventés |
| 12 | Sols souples et parquet (`fiche:sols`) | `fixture:fiche:sols fiche:sols` | colis, pose du parquet, épaisseur de ragréage jamais inventés ; lé de 4 m |
| 13 | Peinture-finitions (`fiche:peinture`) | `fixture:fiche:peinture fiche:peinture` | couches, impression, passes d'enduit jamais inventées ; radiateurs tels qu'écrits |
| 14 | Serrurerie-métallerie (`fiche:serrurerie`) | `fixture:fiche:serrurerie fiche:serrurerie` | finition et hauteur de clôture jamais inventées ; portail et portillon tels qu'écrits |
| 15 | Ravalement-ITE (`fiche:facade`) | `fixture:fiche:facade fiche:facade` | support, finition, épaisseur d'isolant, grain jamais inventés ; bavettes telles qu'écrites |
| 16+ | Un devis d'épreuve par nouveau métier | même commande, `fiche:<code>` | ligne ajoutée ici à chaque métier |

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
| 3 | Étape 0 : socle `referentiels/metiers/` (format 8 sections, registre par fichier, « Métiers couverts », cache de prompt) | fait (#265, en prod) |
| 4 | Étape 1-2 : 14 nouveaux référentiels, un par PR, dans l'ordre du §1 | 5/14 faits : terrassement-VRD (#266), maçonnerie (#267), charpente (#268), étanchéité déclarée (#269, tiroir relu gardé), menuiseries extérieures (#270), en prod ; #271 ratios « à vérifier » en orange, #272 consommables des fiches, menuiserie intérieure (#273), plâtrerie-isolation (#274), plomberie-sanitaire (#275), chauffage-PAC-VMC (#276), en prod ; carrelage-faïence (#277) ; sols souples et parquet (#278) ; peinture-finitions (#279) ; serrurerie-métallerie (`metalwork`, #280) ; ravalement-ITE (fiche, PR ouverte) : 16/16 métiers de l'étape 2 faits (couverture et électricité non touchées) |
| 5 | Étape 3 : devis maison complète 8 lots | fait (#282) : `apps/api/test/maison-entiere-8-lots.test.ts` (maçonnerie, électricité, plomberie, carrelage, sols, peinture, serrurerie, façade ; carte des lots, une section par lot, envoi par lot) |
| 6 | Mission B, boucle 1 à 5, jusqu'au vendredi 23 octobre 12 h | à faire |

Tableau de bord : `baticlair/docs/tableau-de-bord-metiers.md` (écrit par un test). Prochaine étape : boucle de la mission B (épreuves, robustesse, écrans iPhone), sans API. Au retour du crédit : file du §2 bis.

## 5. Mesures (temps et coût par devis)

| Devis | Date | Repérage | Lecture Opus | Coût |
|---|---|---|---|---|
| DE00000071 (couverture, 1 page) | 2026-10-13 | 2 s | 75 s | à mesurer |
| D.2026.105 (réparation, 1 page) | 2026-10-13 | 1 s | 27 s | à mesurer |

## 5 bis. Comment écrire une fiche métier (socle livré le 2026-10-19)

- Copier `baticlair/referentiels/metiers/_modele.md` en `<code>.md` ; en-tête : `metier` = identifiant du repérage
  (earthworks, masonry, carpentry, waterproofing, joinery, interior_joinery, drywall, plumbing, hvac, tiling, painting, facade…)
  ou un identifiant neuf (sols souples : `flooring` ; serrurerie : `metalwork`) ; `etat: brouillon` ; `moteur: fiche`.
- Section 2 ouvrages (id en kebab-case) ; 3 ratios par unité d'ouvrage, condition `cle=valeur`, confiance, source S… ;
  plusieurs conditions : `cle=valeur et cle2=valeur2` ; colonne « Article écrit » = oui en §2 quand l'ouvrage est la pose d'un article écrit (la ligne le garde tel qu'écrit) ; 4 conditionnements ; 5 questions (clé, texte, `Libellé=valeur / …`, ouvrages) ; 6 test (devis, bref, questions attendues,
  réponses, comptes attendus au mot près : « 2,5 m³ », « 2 panneaux de 14,4 m² ») ; 7 à relire ; 8 sources.
- `cd baticlair/packages/domain && pnpm test` : `fiches-metier.test.ts` refuse une fiche fautive et joue sa section 6.
- Une fiche « fiche » prend le pas sur l'ancien tiroir du métier (lecture et calcul) ; les anciens chantiers gardent leur
  version (instantané). Le faux lecteur de l'API (`lectureSimulee`) nomme l'ouvrage d'une fiche par la colonne « Ce que le devis
  écrit » (double de test seulement). Cinq épreuves par métier : `apps/api/test/fiches-epreuves-faux-lecteur.test.ts`.
  Vraie lecture : `fixture:fiche:<code>` (PDF tiré de la §6), contrôle `controleLectureFiche` ; le workflow ne lit que les fiches
  que la PR touche (une lecture par métier et par jour au plus).

## 6. Décisions prises (rappel)

- 2026-10-13 : phrase d'attente après 30 s : oui (#260, en prod).
- 2026-10-13 : bref DE00000071 : durcir le prompt, le contrôle ne bouge pas (#261, en attente).
- 2026-10-13 : 7954 anonymisé comme D.2026.105 et lu en CI (patch prêt).

## 7. Questions pour Greg

- Recharger le crédit API (§3).
- Étanchéité toiture-terrasse : le tiroir `waterproofing` est déjà « relu » (METIERS_RELUS). Choix fait : on le garde
  (fiche « moteur tiroir », comme couverture et électricité) plutôt que de le remplacer par une fiche brouillon. À confirmer.
- (réglé) Les « docs du 3 octobre » sont dans `baticlair/docs/referentiels/*.md` (un par métier, 20 à 60 Ko), avec la
  recherche du 4 octobre dans `baticlair/referentiels/<métier>/tiroir.json` (valeurs sourcées ou à vérifier). Base de chaque fiche.

## 9. Chantier « BatiClair Groupé » (Greg, 2026-10-19)

Règles : `baticlair/docs/groupe/parcours-complet.md` (sections 1 à 6, prompt section 7). Drapeau `GROUPE` désactivé par
défaut ; RIEN EN PROD SANS L'ACCORD EXPLICITE DE GREG (décision du 20 octobre : « ne fusionne pas la PR 1 ; enchaîne
les PR 2 à 9 sur la même branche, sans rien fusionner, jusqu'à mon accord global ») : TOUTES les étapes s'empilent
sur la PR #284 (une branche = une PR), jamais fusionnée sans son oui. Neuf familles (décision du 20 octobre :
+ « menuiseries et fermetures », « second œuvre », « serrurerie et métallerie », chaque métier rattaché à au moins
une) ; désistements dans une table à part, étape 7. Décision du 20 octobre (changement de modèle) : GRATUIT pour
l'artisan (plus aucune condition d'abonnement) ; le négoce accepte AVANT de répondre une commission de 2 % du HT du lot
s'il est retenu (phrase en gras dans l'e-mail, case obligatoire sur la page de dépôt, contrat PDF à côté, date + e-mail
+ IP dans `accord_negoce` ; sans case, la réponse n'est pas prise en compte) ; au bon de commande, facture PDF
automatique au négoce (2 % × total HT du lot, 30 jours, relance automatique, `facture_negoce`).

| PR | Étape | État |
|---|---|---|
| 1 | Données : 12 tables (dont accord et facture du négoce), clé de référence, zone, statuts, drapeau, 9 familles | fait (#284, non fusionnée) |
| 2 | Entrée du besoin (écran 3) : SIRET (INSEE), gratuit, « Proposer au groupé » par ligne et par lot, fenêtre, signé / en attente + engagement, bascule, retrait | fait (#284) |
| 3 | Base négoces : « Mes négoces » (9 familles, favori, numéro de compte), message type, liens signés « pas concerné » / « stop » | fait (#284) |
| 4 | Regroupement : `groupe/seuils.json`, un lot par (référence, zone, fenêtre compatible), un seul ouvert, seuil sur le volume ferme, lundi sur deux (`/v1/internal/groupe/regrouper`, cron Vercel lundi 6 h UTC), plafond 3 × médiane 90 j | fait (#284) |
| 5 | Demande aux négoces : `DemandeService` (un e-mail par négoce concerné, texte + HTML avec la phrase de commission en gras, PDF en deux parties, lien unique `reponse/<jeton>` par lot × négoce, lot → envoyé, besoins signés → engagés), page publique `/reponse/[jeton]` (case d'accord OBLIGATOIRE, contrat PDF à côté, 1 ou 2 devis PDF, `accord_negoce` date + e-mail + IP), lecture prix + délai (faux lecteur en test, Sonnet `AI_QUANTITATIF_MODEL` en ligne), page `/negoces/lien/[jeton]` ; cron envoie aussi | fait (#284) |
| 6 | Choix et offres : `choisirLeNegoce` (domaine pur : prix au volume ferme par palier, délai dans la fenêtre, un seul négoce, « à vérifier » jamais retenu), `ChoixService` (dès que tous ont répondu ou passé 7 jours ; lot choisi + `OffreArtisan` par besoin engagé ; sans offre valable, lot clos, besoins engagés gardés pour Greg), « pas concerné » / « stop » notés sur la réponse du lot, routes `GET /v1/groupe/offres`, `POST …/offres/:id/probleme`, `POST …/offres/:id/reference` (économie = (référence − groupé) × quantité), carte « Mon offre » dans « Au groupé », cron quotidien 6 h UTC | fait (#284) |
| 7 | Bons de commande : `CommandeService` (dès le négoce retenu : un bon PDF par artisan engagé, nom + compte ou « ouverture demandée » + adresse + quantités + fenêtre + « tarif groupé lot n° … », e-mail au négoce avec récapitulatif, copie à l'artisan), facture 2 % × total HT des bons à 30 jours (`facture_negoce`, PDF, relance automatique une fois), « Livré » / « Problème » d'un tap (`POST /v1/groupe/bons/:id/livraison`), relance à J+15, table `desistement` à part (avertissement puis exclusion 6 mois, négoce prévenu, `exclu_du_groupe` ferme le groupé), compteur « Économisé grâce au groupé » dans Compte (`GET /v1/groupe/economies`) ; la tâche quotidienne enchaîne tout | fait (#284) |
| 8 | Notifications : `NotificationsGroupeService` (push sur chaque appareil des membres + e-mail à l'entreprise), les quatre messages de la section 3 mot pour mot (besoin accepté, demande partie chez N négoces, négoce retenu avec −Y % si prix de référence, « Livraison aujourd'hui. Tout est arrivé ? » le jour J une fois, `livraison.prevenuLe`), avertissement par e-mail après un désistement ; facture : émetteur en variables `FACTURE_EMETTEUR_*` (nom, forme, SIRET, adresse, TVA intracom) + `FACTURE_TVA_POURCENT` (20), TTC sur la facture, plus de mention « projet » ; webhook Resend entrant `POST /v1/webhooks/resend` (signature Svix `RESEND_WEBHOOK_SECRET`, adresses `lot-<n°>@REPONSES_DOMAINE` en Reply-To) : une réponse par e-mail renvoie au négoce un lien de dépôt neuf, rien n'est pris sans la case | fait (#284) |
| 9 | Admin Greg : `GET /v1/admin/groupe` (réservé à `GROUPE_ADMINS`, repli `REFERENTIAL_VALIDATORS` ; 404 drapeau éteint, 403 sinon) : lots par département avec fermes/total, réponses déposées/attendues/à vérifier, négoce retenu, bons ; `lots/:id` journal complet ; gestes de secours `clore`, `annuler` (libère les besoins), `forcer` (envoi sous le seuil), `negoce` (changer le retenu avant les bons) ; négoces, accords, factures + `factures.csv` (mois;numero;negoce;lot;total_lot_ht;commission_ht;tva;ttc;statut;emise_le;echeance_le;payee_le, « payée » à la main), exclusions ; ouverture par département `GROUPE_DEPARTEMENTS` (`*` = tous, raison `departement_ferme` + message sur l'onglet) ; page `/admin/groupe` (lien sur l'onglet Groupé pour l'admin seul) ; e2e étape 8 (lot de bout en bout, deux négoces par e-mail) et étape 9 verts téléphone + ordinateur | fait (#284) |

### Plan de Greg du 20 octobre (jusqu'au vendredi 23 octobre 12 h, autonome, routine horaire `trig_019b3LSmsdY43Aowni5jVARm`)

Décisions seul → `baticlair/docs/DECISIONS.md`. Rapport chaque jour 18 h, dernier vendredi 12 h. Zéro appel API. Rien fusionné.
Groupé sur #284 ; le reste : une branche `claude/…` et une PR par bloc. Dans l'ordre :
1. Étape 8 : e2e iPhone complet, un lot de bout en bout, deux négoces qui répondent par e-mail (webhook) — FAIT
2. Étape 9 : admin Greg (journal, ouverture par département, lots, négoces, accords, factures, exclusions, clore, export CSV factures) — FAIT
3. Base négoces préremplie (Sirene, NAF 46.73A/B, 47.52A/B, départements 22/29/35/56, suggestions dans « Mes négoces ») — FAIT : table `negoce_sirene`, `SireneService` (import page par page par curseur, `GET /v1/internal/groupe/sirene` le 1er du mois 5 h UTC avec `CRON_SECRET`, `INSEE_API_KEY` obligatoire, `SIRENE_DEPARTEMENTS`/`SIRENE_NAF`), `GET /v1/groupe/negoces/suggestions?q=` (3 lettres, département de l'entreprise d'abord, 8 au plus, source « Sirene » + date d'import), liste sous « Nom du négoce » ; test API `groupe-sirene.test.ts`
4. Scénarios e2e groupé supplémentaires — FAIT : « scénarios 1 » (deux départements → deux lots, deux références → deux lots, retrait avant départ, SIRET invalide dit en clair, plafond 3 × médiane refusé avec son message) et « scénarios 2 » (lot sans offre clos par la tâche rejouée 8 jours plus tard via `?maintenant=` en test seulement, « pas concerné » par le lien de l'e-mail, désistement ×2 → exclusion 6 mois affichée sur l'onglet, nouveau lot refusé, l'autre artisan garde son lot) ; le seuil (2 signés) est couvert par « étape 8 » ; messages des motifs groupé dans `fr.ts` ; un besoin retiré par désistement reste dans « Mes lots »
5. Landing page `/` — FAIT, PR #286 (`claude/landing-page`, base main) · 6. Pages légales + case CGU — FAIT, PR #285 (`claude/pages-legales`, base #284) · 7. PWA — FAIT, PR #287 (`claude/pwa`, base main) · 8. Audit sécurité + `docs/SECURITE.md` — FAIT sur `claude/securite` (base #284), PR à ouvrir après la suite e2e complète · 9. Non-régression 179 lectures + couverture 90 % domaine groupé — FAIT (`docs/non-regression-179-lectures.md` : 0 écart #284/main ; couverture groupé 97,9 % instructions, 86 % branches ; test permanent `banc-179-lectures.test.ts`) · 10. Aide « ? » — FAIT, PR #289 (`claude/aide`, base #284) · 11. `docs/groupe/MISE-EN-PROD.md` — FAIT · 12. `docs/DETTE.md` + performance — FAIT (`docs/PERFORMANCE.md` : Lighthouse mobile slow 4G, pages publiques 93–99, app 92–95, CLS de Mon compte corrigé ; `docs/DETTE.md` : 13 dettes classées par risque). Audit sécurité : PR #288 (`claude/securite`, base #284).
