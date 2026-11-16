# Ma page Mobiiz : la page publique de chaque entreprise (chantier du 16 novembre 2026)

Demande de Greg (16 novembre 2026) : chaque entreprise inscrite a une landing page propre, moderne et partageable
(`mobiiz.fr/e/<adresse>`), réglée en 5 minutes depuis le téléphone, depuis Profil › Mon entreprise › Ma page. Branche de
travail : `claude/company-public-page-htnc6f` (partie de `claude/saas-achat-artisans-prompt-1lyihx`, la branche de test).
Hors périmètre, à ne pas toucher : l'assistant IA, le quantitatif, les achats groupés (le chantier « quantitatif IA » tourne
en parallèle dans une autre session).

## Point de reprise (à tenir à jour à chaque étape)

État : voir la liste ci-dessous ; reprendre à la première case non cochée.

- [x] 1. Domaine `packages/domain/src/page-entreprise/` : thèmes par métier, nuancier et contraste, adresse, sections,
      données structurées, textes proposés ; tests `packages/domain/test/page-entreprise.test.ts`.
- [ ] 2. API, module `apps/api/src/modules/page-entreprise/` : migration additive, réglages, photos (sharp + stockage
      objet), page publique, contact, signalement, admin ; tests `apps/api/test/page-entreprise.test.ts`.
- [ ] 3. Web : page publique `app/(public)/e/[adresse]`, éditeur `app/(app)/compte/ma-page`, admin
      `app/(app)/admin/pages-publiques`, rafraîchissement du cache.
- [ ] 4. e2e (petit iPhone, Android, ordinateur, clair et sombre, deux comptes), Lighthouse mobile.
- [ ] 5. Relecture du juriste, captures des 3 modèles (couvreur, peintre), coût mensuel, compte rendu.
- [ ] 6. Intégrer les derniers commits de la branche de test, rejouer la chaîne complète, pousser SUR MA BRANCHE seulement
      si tout est vert.

## Décisions prises seules (aussi dans `docs/DECISIONS.md`)

Voir la section « Décisions » en bas de ce fichier.
