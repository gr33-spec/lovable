@AGENTS.md

# Mobiiz — contexte

Fiche lue par chaque nouvelle session. Le détail des règles produit est dans `baticlair/CLAUDE.md` (à lire avant de toucher au code) ; l'état d'avancement dans `baticlair/docs/SUIVI.md`, les décisions dans `baticlair/docs/DECISIONS.md`, la reprise dans `baticlair/docs/REPRISE.md`.

## Qui, quoi

- Fondateur : Grégory Roy, ancien couvreur, non technicien. On lui parle simplement, court, en français, en le tutoyant.
- Entité : BATI INVEST (SARL, RCS Saint-Brieuc). Contact : contact@mobiiz.fr. Site de test : test.mobiiz.fr (API : api-test.mobiiz.fr).
- Slogans : « Par des artisans, pour les artisans » / « Plus on est, moins on paie ».
- Le produit s'appelle Mobiiz. Le dossier du code s'appelle encore `baticlair` (ancien nom) : ne pas le renommer.

## Trois briques

1. **Quantitatif** : la liste de matériaux d'un chantier (à la main, par le catalogue, par l'assistant, photo ou scan, devis PDF).
2. **Achats** : envoi de la demande de prix jusqu'à 5 négoces, comparaison des réponses, achats groupés par métier et par département.
3. **Mission** : un artisan indépendant (qui se lance, ou dont un chantier est décalé) publie ses compétences et ses diplômes ; une entreprise surchargée cherche du renfort (compétences, nombre de personnes). Mobiiz fait UNIQUEMENT de la mise en relation : les deux parties s'arrangent entre elles, administratif compris (contrat, assurances, attestation de vigilance URSSAF). Jamais d'intérim, de recrutement ni de mission garantie.

- Application multimétier (douze métiers au catalogue) ; la publicité et la communication ciblent d'abord les couvreurs en Bretagne.
- Zinguerie et Étanchéité sont des métiers à part de la Couverture, partout : catalogue, routage des négoces, lots et filtre des achats groupés (13 novembre 2026).
- Confidentialité : côté achats, les artisans ne se voient jamais entre eux ; un négoce ne voit jamais les prix d'un autre ; les négoces sont vérifiés.

## Charte

- Jaune #FFC800 et noir profond ; thème clair ivoire #FBF8F3 ; aucun marron.
- Police : **Plus Jakarta Sans** (tranché par Greg le 13 novembre 2026). Bricolage Grotesque n'est plus utilisée.
- Ton : `baticlair/docs/TON.md`. Page publique : jamais « IA », « automatique », « précis », « exact » ; aucun montant ; aucune économie garantie.

## État réel du code (13 novembre 2026)

- Monorepo pnpm + Turborepo dans `baticlair/` :
  - `packages/domain` : règles métier en TypeScript pur (catalogue, référentiels, achats groupés, missions, abonnement). L'API importe son `dist` : `pnpm -s build` après chaque changement.
  - `apps/api` : NestJS 11, Prisma 7, PostgreSQL (Neon en ligne), tests vitest.
  - `apps/web` : Next 16, React 19, Tailwind 4, tests Playwright (`e2e/`, `e2e-ag-v1/`).
  - `referentiels/`, `docs/` : référentiels métier et documents de suivi.
- Outils : Vercel (site et API), Neon (base), Resend (e-mails), Stripe (compte « Mobiiz »), Anthropic (lecture des devis, clé `BATICLAIR_ANTHROPIC_KEY`).
- Tarifs (décision de Greg du 13 novembre 2026, conforme au code `packages/domain/src/abonnement/abonnement.ts`) : deux formules payantes, Essentiel et Pro ; à l'année, deux mois offerts (dix mois facturés pour douze). Essentiel 19,90 € HT par mois ou 199 € HT par an ; Pro 39,90 € HT par mois ou 399 € HT par an. La formule Découverte gratuite reste, en plus des deux payantes (confirmé par Greg le 13 novembre 2026). Achats groupés gratuits. Rien n'est facturé aux négoces. L'annuel n'est payable que si ses prix Stripe existent (pas créés à ce jour). Le paywall est en pause (`PAYWALL=off`).
- Réglages coupés par défaut : `MISSIONS_V1`, `ASSISTANT_IA`, `ACHATS_GROUPES_V1`, `ACCES_DEMO`, `DEMO_PUBLIQUE`.
- Budget IA : `BUDGET_IA_JOUR` (2 € par défaut dans le code ; alerte e-mail au-delà), `AI_MONTHLY_BUDGET_EUR`, plafonds de l'assistant.
- Branche de test : `claude/saas-achat-artisans-prompt-1lyihx` (déployée sur test.mobiiz.fr). Aucune production à ce jour.

## Commandes

Depuis `baticlair/` (avant tout : `service postgresql start`) :

- Moteur : `cd packages/domain && pnpm -s build && npx tsc --noEmit && npx vitest run`
- Serveur : `cd apps/api && npx tsc --noEmit && npx eslint src test && TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_test CI=true npx vitest run`
- Site : `cd apps/web && npx tsc --noEmit && npx eslint src e2e e2e-ag-v1 && pnpm -s build`
- Parcours : `CI=true E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/baticlair_e2e PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --trace off` (ajouter `-c playwright.ag-v1.config.ts` pour les parcours activés) ; ils tournent sur le site CONSTRUIT.

## Règles de travail

- Expliquer simplement et court ; compte rendu en français simple.
- Pas de refonte du modèle sans retours terrain.
- Aucun champ à remplir à la main dans les documents générés (sauf le bon de commande).
- Tests sans appel à l'API IA réelle ; respecter `BUDGET_IA_JOUR`. Jamais d'e-mail réel à un négoce ou à un artisan, jamais de paiement réel, pendant un test.
- Ne jamais toucher à la production ni à la branche principale sans accord. Aucune suppression de données sans accord. Migrations additives et réversibles.
- On ne pousse sur la branche de test qu'un commit dont toute la chaîne de tests est verte ; on vérifie ensuite que le site et l'API servent ce commit.
- Chaque règle changée se dit : « Règle changée : avant → après ».
- Ne jamais afficher une clé ni un secret. Pas de nouvelle dépendance sans accord.
- Mettre ce fichier à jour à chaque décision importante.

## Décisions du 13 novembre 2026

- Capture d'écran des signalements : pas de bibliothèque pour l'instant.
- Mission reste coupée ; les propositions du juriste (`baticlair/docs/groupe/relecture-juridique-missions-2026-11-13.md`) sont à revoir avec un avocat avant la production.
- Studio : aucun outil payant pour l'instant.
- Alertes : `ALERT_EMAIL` = contact@mobiiz.fr.
- Filtre par fabricant (tuiles) : plus tard, après retours terrain.
- Tarifs : Découverte gratuite, plus deux formules payantes (Essentiel, Pro) ; deux mois offerts à l'année.

## Signalement de bugs

- Bouton « Signaler un problème » : dans « Mon menu » sur chaque écran de l'application, et en bas des pages sans compte (espace négoce). La page et la capture d'écran sont jointes toutes seules.
- L'utilisateur reçoit « Merci, on regarde » ; Greg reçoit une alerte, puis le résumé du réparateur avec un lien pour valider. Rien n'est corrigé sans l'accord de Greg. Une fois corrigé et en ligne, « Marquer corrigé » envoie « C'est corrigé, merci ».
- Liste : espace admin › Signalements (`/admin/signalements`), statuts nouveau, en cours, corrigé.

## Équipe d'agents

Les sous-agents sont dans `.claude/agents/` (un fichier par agent). Greg ne parle qu'à la session principale, qui délègue et résume. Les agents ne travaillent que quand Greg le demande.

- « recette complète » : lancer tous les testeurs (testeur-artisan, testeur-negoce, testeur-mission, saboteur, rush, comptable, relecteur, mauvais-payeur, testeur-terrain), puis rendre UN rapport classé par gravité avec des propositions. Ne rien corriger sans l'accord de Greg.
- Les testeurs ne travaillent que sur l'environnement de test ou en local.
