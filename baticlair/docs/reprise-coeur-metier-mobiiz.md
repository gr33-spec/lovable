# Reprise : le cœur métier de Mobiiz (catalogue par métier)

Mission de Greg du 13 novembre 2026. À lire en premier à chaque reprise ; ne pas refaire un lot marqué FAIT.

## Où
- Branche locale : `coeur-metier-catalogue` (partie de `claude/saas-achat-artisans-prompt-1lyihx`, commit `a65df6f5`).
- En ligne sur test : `27eff0db` (dossier de corrections UX). Rien de cette mission n'est poussé.
- Livraison : seulement après la chaîne complète verte sur le commit candidat exact (`docs/REPRISE.md`).

## Ce qui existait déjà (audit, lot A)
- Modèle : table `catalogue_article` (clé stable `metier/famille/produit/variante`, métier, famille, produit, variante,
  désignation, unité, synonymes, masqué, ajouté par l'admin). Amorce dans `packages/domain/src/catalogue/donnees`.
- Vue par métier : `packages/domain/src/catalogue/rayons.ts` (`CATALOGUES`, `vueDuCatalogue`, `cheminsDeLArticle`) : un
  catalogue est une VUE calculée, les articles ne bougent pas ; un article peut être pris par plusieurs métiers ; les
  variantes d'un produit deviennent ses caractéristiques à choisir.
- Recherche : `rechercherAvecPrecisions` (`catalogue.ts`) : synonymes, accents, fautes légères, dimensions.
- Synchronisation explicite et idempotente : `CatalogueService.synchroniser`, `apps/api/scripts/synchroniser-catalogue.ts`,
  routes `GET|POST /v1/admin/catalogue/synchronisation`. Lire le catalogue n'écrit rien (sauf base vide).
- Admin : `apps/web/src/app/(app)/admin/catalogue/page.tsx` (ajouter, renommer, masquer, propositions, lignes libres).
- Écrans : `catalogue-listes.tsx`, `saisir-ma-liste.tsx`, `references-catalogue.tsx`.

## Constats de l'audit (détail : `docs/catalogue/etat-des-lieux-avant-2026-11-13.md`)
- Amorce : 2 142 articles, 12 métiers d'origine. Couverture 868, Zinguerie 303, Charpente 277, Peinture 220,
  Étanchéité 172, Plomberie 55, Plâtrerie et isolation 52, Menuiserie 51, Maçonnerie 42, Électricité 40, Carrelage 39,
  Chauffage 31. Seuls Couverture, Zinguerie, Étanchéité, Charpente et Peinture sont réellement fournis.
- Zinguerie et Étanchéité étaient rangées SOUS Couverture au sélecteur (décision du 12 novembre) : contraire à la règle
  du 13 novembre (« chaque métier est un catalogue de premier niveau indépendant »).
- Base de test : 2 188 articles = l'amorce + 46 ANCIENS IDENTIFIANTS (même article, clé écrite « 2-x-1 » au lieu de
  « 2x1 »). Aucun autre article hors amorce, aucun article de l'amorce absent, aucun article sans famille.
- Autres doublons : 1 article sous deux métiers (pare-vapeur 1,50 × 50 m : couverture et plâtrerie), 2 probables en
  peinture (« Peinture plafond blanc mat profond » 10 L et 15 L, deux écritures).
- 1 famille trop volumineuse : Tuiles terre cuite à emboîtement (47 produits). 1 désignation ambiguë : « Peinture façade
  pliolite » dans deux familles d'origine. Aucune unité incohérente.
- COMPATIBILITÉ : les quantitatifs (listes) ne gardent que le TEXTE de la désignation, jamais une clé du catalogue. Seules
  les lignes d'achat groupé gardent une clé (`cat:<clé>` dans `ligne_achat_groupe.cle`). En base de test : 3 lignes, dont
  1 sur un ancien identifiant (`cat:zinguerie/zinc/feuille-de-zinc-2-x-1-m/naturel-0-65-mm`). Donc : aucune clé ne se
  réécrit ni ne se supprime ; un ancien identifiant devient un ALIAS de l'article gardé.

## Architecture retenue
Métier → famille → sous-famille éventuelle → produit (article générique) → caractéristiques → quantité et unité.
- Un métier = une entrée du sélecteur. Zinguerie et Étanchéité redeviennent des métiers de premier niveau.
- Famille = l'ancien « rayon » de `rayons.ts` ; sous-famille = l'ancienne « famille » de la vue, montrée seulement quand
  une famille en a plusieurs.
- Les articles, leurs clés, leurs désignations et leurs unités ne changent pas.
- Ancien identifiant : colonne additive `alias_de` (la clé gardée) ; l'alias n'est plus proposé, mais reste lisible par sa clé.

## Lots
| Lot | État |
| --- | --- |
| A Audit et architecture | FAIT |
| B Moteur (métiers, familles, connaissance, questions, recherche, alias) | à faire |
| C Réorganisation Couverture, Zinguerie, Étanchéité | à faire |
| D Interface (navigation, fil d'Ariane, recherche avec contexte) | à faire |
| E Assistant IA | à faire |
| F Administration, synchronisation, chaîne complète, recette test | à faire |

## Fait
- Lot A : `packages/domain/src/catalogue/audit.ts` (`etatDesLieuxDuCatalogue`, `doublonsDuCatalogue`, fonctions pures),
  `packages/domain/scripts/etat-des-lieux-catalogue.mjs`, rapports dans `docs/catalogue/`. Aucune donnée modifiée ; la
  base de test n'a été que LUE.

## Interdits (toujours)
Production, `main`, données de production, paiements, e-mails réels, appels IA payants, documents juridiques, réglages des
services : rien. Aucune suppression de données sans l'accord de Greg. La synchronisation du catalogue sur la base distante
n'est jamais lancée sans son accord.

## Prochaine commande
Lot B : dans `packages/domain`, vider `RAYON_DU_METIER_CATALOGUE`, séparer `CATALOGUES.couverture` / `zinguerie` /
`etancheite`, puis `pnpm -s build && npx vitest run test/catalogues-par-metier.test.ts test/catalogue-etancheite-zinguerie.test.ts`.
