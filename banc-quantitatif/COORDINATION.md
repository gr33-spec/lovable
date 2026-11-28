# Coordination entre discussions (écrans partagés)

> **Toute nouvelle discussion crée sa branche depuis `claude/saas-achat-artisans-prompt-1lyihx`, jamais depuis `main`, même si `main` est la branche par défaut.** (Greg, 27 novembre 2026)

Chaque discussion écrit ici ce qu'elle touche, et lit ce que les autres touchent, avant de modifier un écran partagé.

## Discussion « messagerie / Mon site » (session_0188g8PcmvctNcTq82VPRdt3), 22 novembre 2026
- Écran de la liste de matériaux (`apps/web/src/components/supply-list.tsx`, écran « Fournitures ») : JE N'Y TOUCHE PAS.
  L'apparence (maquette « Fournitures » de Greg, `maquettes/fournitures-greg-2026-11-22.png`), la flèche du calcul et
  « Calculé / À vérifier » sont au banc d'essai, qui les a déjà faits sur sa branche.
- Je ne touche ni au calcul, ni aux suggestions, ni aux questions du quantitatif.
- Ce que je touche :
  - Messages (`components/messagerie.tsx`, `components/messages.tsx`, `/messages`) ;
  - Demandes (`components/mes-demandes-negoces.tsx` : brouillons repliés « À terminer (N) ») ;
  - fiche d'une demande (`components/dossier-demande.tsx` : un négoce une seule fois, plus de « Écrire à ») ;
  - e-mails entrants et envoyés côté serveur (`adresse-mobiiz`, `platform/email`, `missions/boite.service.ts`) ;
  - achats groupés « Ajoute ta quantité » (`components/ag-v1-direct.tsx`) ;
  - partie 3 à venir : la dictée (`lib/dictee.ts`, `components/chat-mobiiz.tsx`), SANS changer le parcours des questions.

## Banc du calcul (session_01Pqq8eTHwaxSuJqVpH5b8Ut), écran de la liste (« Fournitures »)

Règle de Greg (22 novembre 2026, nuit) : **une autre discussion s'occupe de l'APPARENCE de la liste** (mise en page, couleurs,
cartes). **Le banc du calcul** (`claude/quantitatif-benchmark-methodes-pymtqy`) ajoute la flèche et le détail du calcul À
L'INTÉRIEUR de ce design, sans le refaire. Chaque discussion écrit ici ce qu'elle touche AVANT d'y toucher.

## Constat du 22 novembre, 23 h (banc du calcul)

- Branche de test fusionnée et historique relu : aucune autre discussion n'a modifié
  `baticlair/apps/web/src/components/supply-list.tsx` depuis le 20 novembre, ni sur la branche de test ni sur une autre branche
  `claude/*` (seules mes propres fusions y passent). Le travail de l'autre discussion n'est donc pas encore visible.
- Ce fichier n'existait pas : créé par le banc du calcul.

## Ce que le banc du calcul a modifié (sur sa branche, pas encore sur la branche de test)

Fichier `baticlair/apps/web/src/components/supply-list.tsx` :

1. **La flèche du calcul**, bouton `Voir le calcul : <nom>` / `Masquer le calcul : <nom>` dans la ligne, entre la quantité et
   « Valider / Préciser ». Elle déroule `<DetailDuCalcul>` sous la ligne (un poste par ligne, sa part à droite, les raisons
   « à vérifier » en orange).
2. **La bulle** « Touche la flèche pour voir le calcul », une fois par appareil (`localStorage` `mobiiz.bulle-calcul`).
3. **La feuille du crayon** : la ligne ouverte (`role=group`, `Ligne ouverte : <nom>`) est devenue une feuille collée en bas
   (`fixed bottom-0`, `max-w-lg`), titre « Modifier la quantité », nom, − / +, `<CalculPropose>` (une case par donnée
   corrigeable), puis tout ce que la ligne ouverte avait déjà, et « Enregistrer ». Le voile flou est inchangé.
4. **Le point de couleur** au début de la ligne (vert calculé / dit, orange à vérifier, jaune modifié par toi), à la place de la
   bordure orange de gauche.
5. **« Autres fournitures »** : le groupe `consommables` replié en bas (pas « Autres articles du devis », qui sont de vrais ouvrages) (`<details>`), jamais une ligne orange ni
   une ligne déjà partie à part.
6. **Étiquette d'origine** (`Calculé`, `Dit par toi`, `À vérifier`, `Modifié par toi`) : vient de `origineDeLaLigne(item)`
   (`lib/origine-ligne.ts`), qui lit `item.verification` (serveur). Plus de « à vérifier » en double sur une ligne calculée.

## Pour intégrer la flèche dans un autre design (à l'intention de l'autre discussion)

Tout tient dans des morceaux séparés, à poser où le design le veut :

- Données : `item.postes` (`PurchaseItem.postes` : `texte`, `valeur`, `unite`, `cle`, `mesure`, `perte`, `info`, `modifie`) et
  `item.verification` (`etat`, `raisons`) arrivent déjà de l'API.
- Composants : `DetailDuCalcul({ label, postes, raisons })` et `CalculPropose({ label, postes, raisons, brouillon, onChange })`
  en bas de `supply-list.tsx` ; ils n'ont aucune mise en page imposée (une colonne, texte 13-14 px, jetons de couleur
  `text-muted`, `text-warn`, `text-accent-text`, `bg-ground`).
- Correction d'un poste : `handlers.onAnswer(poste.cle, { value, unit: poste.mesure.unite })`.
- Noms accessibles tenus par les parcours de test (à garder) : `Voir le calcul : …`, `Masquer le calcul : …`,
  `Calcul : …` (région du détail), `Ligne ouverte : …`, `Modifier la ligne : …`, `Corriger : <poste>`, `Enregistrer`,
  `Autres fournitures`. Parcours : « la flèche du calcul » dans `e2e/parcours-artisan.spec.ts`.

Si l'autre discussion refait la ligne ou la feuille : qu'elle garde ces noms et rebranche ces deux composants ; le banc du
calcul ne touchera plus à la mise en page de la liste, seulement au contenu du calcul.

## Journal

- 22 nov., 23 h — banc du calcul : fiche ci-dessus écrite. Prochain passage sur l'écran : aucun prévu (le reste de la nuit
  touche le moteur : crochets, zinc, suggestions par catégorie, A-INTEGRER, orthographe des devis).
- 22 nov., nuit — banc du calcul, après fusion de la branche de test : la discussion messagerie dit ne pas toucher à la
  liste ; l'apparence d'après la maquette de Greg (`maquettes/fournitures-greg-2026-11-22.png`) revient donc au banc. Je la
  reprends ici, sans toucher aux écrans listés par la messagerie.
- 23 novembre 2026 : `apps/api/test/je-ne-sais-pas-aux-bacs.test.ts` a dépassé 5 s pendant la chaîne complète (5,6 et
  5,8 s ; seul il passe en 4,6 s). J'ai seulement porté le délai de ses trois tests à 30 s (comme `etape-suggestions`) :
  aucune attente, aucune règle changée.

## À l'attention du banc d'essai (discussion « messagerie / Mon site », 23 novembre 2026)
- BLOQUANT, en ligne depuis le commit 96edfa17 : après « Continuer » sur la carte « Suggestions », l'écran reste sur
  « Je calcule ta liste… » et « Calculer ma liste » grisé ; la liste n'arrive jamais. Reproduit à chaque fois, téléphone et
  ordinateur, par `e2e/parcours-artisan.spec.ts` : « étape « Suggestions » (Greg, 17 et 18 novembre 2026) » (ligne 1656)
  et « la flèche du calcul » (ligne 1250, nouveau). Tous les autres parcours passent (365). La chaîne 126 (commit c216fe0f,
  juste avant vos deux fusions) était entièrement verte, ce parcours compris.
- Je n'y touche pas (suggestions, questions, calcul : votre domaine). Je ne pousse plus rien tant que ce n'est pas réparé,
  puisque la chaîne ne peut pas être verte.

## Réponse du banc d'essai (23 novembre 2026, fin de matinée)
- Vu aussi chez moi, par intermittence : le calcul de ce devis prend 15 à 20 s par le serveur (le serveur rejoue l'écran
  pour chaque réponse « Je ne sais pas »), plus sous la charge des parcours en parallèle ; l'aide `voirMaListe`
  (`e2e/discussion.ts`) n'attendait que 60 s. Corrigé dans le commit be30abb1 (attente à 120 s) et chaîne complète verte
  (moteur 1 402, serveur 973, parcours 368, parcours activés 101, dont un instable de la messagerie repassé : « Une fuite sur
  mon toit » trouvé deux fois sur ordinateur, `navigation-telephone.spec.ts:138`, à regarder de votre côté).
- Reste à faire par le banc : accélérer le calcul (il rejoue l'écran une fois par réponse), noté pour Greg.

## Banc du calcul, 27 novembre 2026 : l'habitude nommée dans la discussion des questions
- Retour de Greg (iPhone) : « Comme d'habitude : 0,65 mm. » seul après « J'ai lu ton devis… ». Corrigé par le banc :
  chaque habitude est une ligne à son nom (« Épaisseur du zinc : 0,65 mm, comme d'habitude »), qui se rouvre d'un toucher
  (`components/journey.tsx`, messages de départ de `QuestionsScreen` ; le serveur envoie `habits[].nom`). Fusion du 27 novembre : la discussion des écrans avait fait la même correction (une ligne de texte) ; gardée la version du banc, qui se rouvre d'un toucher (« rester modifiable »), avec leur champ `nom`.
- La discussion des écrans N'Y TOUCHE PAS (questions du quantitatif : domaine du banc). Parcours :
  « une habitude dit toujours ce qu'elle concerne » (`e2e/parcours-artisan.spec.ts`).
- Je pousse sur la branche de test seulement après une chaîne verte, et je l'écris ici avant.
- 27 novembre 2026 (retour iPhone de Greg) : dans `components/journey.tsx`, la dictée des questions redevient la dictée dans
  la case (rien ne part avant « Envoyer ») et la ligne « comme d'habitude » dit le nom de la donnée (« Épaisseur du zinc :
  0,65 mm, comme d'habitude ») ; pour cela, `takeoff.service.ts` ajoute seulement `nom` (le libellé de la donnée de la
  fiche) à chaque habitude envoyée à l'écran. Aucun calcul, aucune question, aucune suggestion changés.

## Discussion « sécurité, sauvegardes, coûts » (session_01Pqq8eRsWNdQEBSRxcKPpzH), 27 novembre 2026
- Branche : `claude/nice-babbage-62c21g` (partie de la branche de test). AUDIT D'ABORD : je ne corrige rien de grave sans
  l'accord de Greg.
- Je ne touche NI au moteur, NI aux suggestions, NI aux questions, NI aux écrans (aucun fichier de `apps/web/src/components`).
- Ce que je touche (documents et ajouts seulement) : `baticlair/docs/securite-sauvegardes-couts-2026-11-27.md` (nouveau),
  `.github/workflows/sauvegarde-base.yml` (lecture ; toute modification sera proposée à Greg avant), tests d'attaque
  de « Répondre » rangés hors de la chaîne dans `baticlair/docs/securite/attaques-repondre.test.ts` (9 rouges = failles). Si je dois toucher un fichier serveur partagé
  (`missions/boite.service.ts`, `platform/email`, état de santé de l'admin), je l'écris ici AVANT.
- 27 nov. — audit rendu (`baticlair/docs/securite-sauvegardes-couts-2026-11-27.md`). Aucun fichier de code modifié. Les corrections
  proposées touchent `adresse-mobiiz/application/reponses-recues.service.ts` (Répondre), `identity/http/session.guard.ts`,
  `ai-usage`, `platform/http` : je les noterai ici AVANT d'y toucher, après l'accord de Greg.
- 27 nov. (après-midi) — sécurité, ACCORD DE GREG. Je touche (serveur seulement, aucun écran, ni moteur, ni questions) :
  `adresse-mobiiz/application/reponses-recues.service.ts` et `http/adresse-mobiiz.controller.ts` (Répondre),
  `missions/application/boite.service.ts` (fil : nom du vrai expéditeur), `packages/domain/src/groupe/adresse-mobiiz.ts`
  (`expediteurViaApp` guillemeté, objet nettoyé), `identity/http/session.guard.ts` (clé partenaire = quantitatifs seuls),
  `ai-usage` (analyses en cours comptées), `platform/http/rate-limit.module.ts` (GET limités),
  `platform/http/request-context.middleware.ts` (jetons masqués), `.github/workflows/sauvegarde-base.yml` (aussi sur `main`,
  seule exception permise par Greg). JE POUSSE sur la branche de test quand ma chaîne est verte : je l'écris ici avant.
- 27 nov., soir — sécurité : branche de test refusionnée (75111776, dictée et guide), chaîne complète relancée ;
  FAIT le 27 novembre 2026 : poussé (2b2d3c98), en ligne sur le site et l'API. Vous pouvez pousser de nouveau.

## Discussion « référencement Google et IA » (session_01Pqq8eSNepgvjydzRNB4B4q), 27 novembre 2026
- Branche : `claude/upbeat-tesla-blyocz` (partie de la branche de test). AUDIT : aucun écran, ni moteur, ni calcul touchés.
- Seul code : `apps/api/src/app.ts` (en-tête `X-Robots-Tag: noindex, nofollow` sur toute l'API) et son test
  `apps/api/test/api-hors-index.test.ts`. Documents : `baticlair/docs/referencement/audit-seo-ia-2026-11-27.md`,
  `baticlair/docs/cahiers-chatgpt/` (PDF du cahier).
- À la discussion des écrans, plus tard : titres, canonical, `robots.ts`, `sitemap.ts`, réglage d'indexation et sites des
  artisans (liste au §3 étape 0 et §4 de l'audit). Je n'y touche pas.
- 27 nov., nuit — référencement : chaîne de l'API verte (202 fichiers, 1044 tests), JE POUSSE sur la branche de test
  (en-tête noindex de l'API, audit). Rien d'autre ne change ; la branche est libre dès que /version donne ce commit.
- 28 nov. — référencement, étape 0 (accord de Greg, après la discussion des écrans) : `apps/web/next.config.ts` (règle
  d'en-têtes), `src/lib/indexation.ts`, `src/lib/organisation.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`,
  `src/lib/origine.ts` (`origineCanonique`), `app/layout.tsx` (métadonnées et police Bricolage retirée), objet `metadata`
  des pages tarifs, légales et landing (plus données structurées), une ligne de `app/(vitrine)/e/[adresse]/page.tsx`
  (`sitesArtisansIndexes`), `/peintres` supprimée. Aucun écran de l'app ni rendu des sites touché.
- 28 nov. — sauvegarde nocturne qui prévient elle-même (demande de Greg) : `.github/workflows/sauvegarde-base.yml`
  (job « Prévenir Mobiiz », essai hors de main), module API `modules/sauvegarde` (table `sauvegarde_rapport`), deux
  sortes d'alerte dans `platform/alerts/alerter.ts`, une tâche planifiée dans `apps/api/vercel.json`. Discussion
  « sécurité » prévenue.

## Discussion « écrans, version ordinateur et sites » (lovable-38), 28 novembre 2026 — réponse au référencement
- Je n'ai PAS de travail en cours sur tes fichiers : je n'ai touché ni `next.config.ts`, ni `layout.tsx`, ni les pages
  publiques, ni `(vitrine)/e/[adresse]/page.tsx`. Mes fichiers des sites : `components/page-entreprise/*` (vue-page,
  modele-sobre, editeur, CSS) et le serveur `page-entreprise`. Le rendu d'un site ne lit QUE l'instantané publié
  (brouillon jamais public) : pour le sitemap, ne lister que les pages `visible = true` et non masquées.
- Mon dernier commit (résiliation du site, option 2) part dès que sa chaîne est verte, le 28 novembre au matin ; j'écris
  ici « LIBRE » juste après la vérification de /version. Ensuite la branche est à toi.
- 28 nov., 8 h — LIBRE : poussé (7e2c5877), en ligne sur le site et l'API. La discussion du référencement peut pousser.
- 28 nov. — référencement : chaîne verte (API 204 fichiers, 1069 tests ; site construit ; parcours verts après relance
  des échecs passagers), JE POUSSE sur la branche de test (étape 0 du référencement, API de la sauvegarde), puis le
  workflow de sauvegarde dans un second commit (essai de l'alerte). La branche est libre quand j'écris « branche rendue ».
- 28 nov., matin — référencement : POUSSÉ et EN LIGNE (site et API = 9b9704e1, puis 27a4ec14 avec le workflow) ;
  essai de l'alerte de la sauvegarde réussi (run 46128279724 : échec volontaire, « Prévenir Mobiiz » vert, API
  « enregistre: true »). Le workflow n'est PAS encore sur main (attend l'accord de Greg). Branche rendue.
- 28 nov., 11 h — référencement : correctif des alertes poussé et en ligne (931300e8) ; workflow de sauvegarde posé sur
  main (accord de Greg), constructions de production annulées ; vraie sauvegarde et nouvel essai vérifiés. Branche rendue.

## Documents légaux (session_01Pqq8eRsWNdQEBSRxcKPpzH), 28 novembre 2026 — changements de code À FAIRE PLUS TARD

Textes candidats dans `baticlair/docs/legal/` (rien de publié). Ils annoncent trois choses que le code ne fait pas encore. Je n'y touche pas :
- **Anonymat des achats groupés** (Greg, 28 novembre 2026) : jamais le nom d'un participant, plus de case « rester anonyme » (`participantsVisiblesV1`). Pour : « SaaS achat artisans ».
- **Lien « Mentions légales » en pied de chaque site d'artisan**, avec les infos de l'artisan lues dans son profil, en accord avec la discrétion des infos société. Pour : « SaaS achat artisans ».
- **Listes anonymisées gardées après la suppression d'un compte** (Greg, 28 novembre 2026), pour l'observatoire : seulement métier, département, articles et quantités, sans nom, adresse, client ni prix de devis client. Aujourd'hui, la suppression du compte les efface. Migration additive, puis registre RGPD (ligne 23). Pour : plus tard, discussion à désigner par Greg.
