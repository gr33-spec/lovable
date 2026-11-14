# Reprise : le cœur métier de Mobiiz (catalogue par métier)

Mission de Greg du 13 novembre 2026. À lire en premier à chaque reprise ; ne pas refaire un lot marqué FAIT.

## Où
- LIVRÉ sur test le 13 novembre 2026 : commit `cc9e6fe3` sur `claude/saas-achat-artisans-prompt-1lyihx` ; `test.mobiiz.fr`
  et `api-test.mobiiz.fr` servent exactement ce commit (vérifié). Branche locale de travail : `coeur-metier-catalogue`.
- Chaîne complète verte sur `cc9e6fe3` : moteur 1150, serveur 784 (+1 ignoré), parcours 281 (+29 ignorés), lots 16,
  activés 66 ; types, lint et build à 0.
- Migration `20261113100000_catalogue_coeur_metier` appliquée sur la base de test (colonnes `a_verifier`,
  `metiers_secondaires`) ; 2 188 articles inchangés, aucun marqué « à vérifier ». Aucune synchronisation distante lancée.
- Lots A à F : FAITS. Reste : les décisions de Greg (fin de ce fichier et compte rendu).
- Prochaine commande : aucune ; attendre le retour de Greg. Ce fichier part avec le prochain candidat vérifié.

## Suite du 13 novembre (2e message de Greg) : branche locale `coeur-metier-ecarts`
- FAIT, commit `b101f8fa` : les six écarts (métiers partiels, tuiles par format, routage par métier déclaré, « Laisser à
  préciser » dans l'assistant), la fiche projet à la racine (`CLAUDE.md`), 23 agents (`.claude/agents/`), les faux devis.
- FAIT, commit suivant : signalement de bugs (table `signalement`, module `signalements`, bouton, `/admin/signalements`),
  mention Mission (écran et section 11 des CGU).
- Chaîne `final26` sur `764aeaca` : ROUGE au serveur (1 test, `boucle-negoce` : un négoce invité par un couvreur recevait
  d'office zinguerie et étanchéité). Corrigé (`negoces.service.ts`), relecture juridique rangée dans `docs/groupe/`.
- RESTE : chaîne complète sur le commit candidat exact, puis livraison sur test, vérification des deux domaines et de la
  migration `20261113180000_signalement`, compte rendu à Greg. Prochaine commande : `scratchpad/chaine27.sh`.

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
| B Moteur (métiers, familles, recherche sans doublon, anciens identifiants, rattachements) | FAIT ; connaissance et questions : lot E |
| C Réorganisation Couverture, Zinguerie, Étanchéité | FAIT |
| D Interface (navigation, fil d'Ariane, recherche avec contexte) | FAIT |
| E Assistant IA | FAIT |
| F Administration, synchronisation, chaîne complète, recette test | admin et synchronisation FAITS ; chaîne complète et recette : voir « Prochaine commande » |

## Fait
- Lot A : `packages/domain/src/catalogue/audit.ts` (`etatDesLieuxDuCatalogue`, `doublonsDuCatalogue`, fonctions pures),
  `packages/domain/scripts/etat-des-lieux-catalogue.mjs`, rapports dans `docs/catalogue/`. Aucune donnée modifiée ; la
  base de test n'a été que LUE.

- Lots B et C (domaine et serveur) :
  - RÈGLE CHANGÉE : `RAYON_DU_METIER_CATALOGUE` est vide ; 12 métiers au sélecteur ; un couvreur a Couverture, Zinguerie
    et Étanchéité. `CATALOGUES.couverture` (14 familles, sous-familles pour les tuiles), `.zinguerie` (5 familles, 2 avec
    sous-familles), `.etancheite` (8 familles) dans `packages/domain/src/catalogue/rayons.ts`.
  - Aucun article déplacé, renommé ni supprimé ; aucune clé changée. La famille d'achat groupé (`FAMILLE_DU_METIER_CATALOGUE`)
    n'est PAS touchée : zinguerie et étanchéité restent chez les négoces de couverture (à décider par Greg).
  - Anciens identifiants : `anciensIdentifiants` (`audit.ts`) ; le serveur ne les propose plus (`CatalogueService.articles`),
    sans rien écrire : l'ancien reste en base et lisible par sa clé. PAS de colonne d'alias (décision : rien à migrer).
  - Recherche : jamais deux résultats de même désignation et même unité ; l'autre métier est dit (`autresCatalogues`).
  - Migration ADDITIVE `20261113100000_catalogue_coeur_metier` : `a_verifier`, `metiers_secondaires` (retour arrière en
    commentaire). Appliquée en local seulement.
  - Admin : `GET /v1/admin/catalogue?metier=&q=` (recherche tous métiers, origine, date, chemins, doublons),
    `PATCH` accepte `metier`, `metiersSecondaires`, `aVerifier` (journal `catalogue:classement`, `catalogue:à vérifier`).
  - Synchronisation : le relevé donne aussi `anciensIdentifiants`, `doublons` par nature, `bilanParMetier`.
  Tests : domaine `catalogues-par-metier` 24/24, `catalogue-etancheite-zinguerie` 4/4, `catalogue-complet` ; serveur
  `catalogues-par-metier` 7/7, `achat-groupe`, `assistant-comprendre`, `libelles-artisans`, `catalogue-regions` verts.

- Lot D (écran) : `apps/web/src/components/catalogue-listes.tsx` (familles sous le métier, sous-familles seulement où il y
  en a, fil d'Ariane qui commence par le métier, résultats « Métier · Famille · Article », « À vérifier », « Laisser à
  préciser » en saisie à la main). Le catalogue est RETIRÉ des pièces jointes de l'assistant (`nouveau-quantitatif.tsx`,
  `chat-mobiiz.tsx`) : il s'ouvre par « Je saisis ma liste ». Connaissance métier et questions utiles :
  `packages/domain/src/catalogue/connaissance.ts` (`ficheArticle`, `questionsUtiles`).
  Tests : domaine `connaissance-metier` 9/9 ; e2e `catalogue-rayons` (3 appareils), `creation-quantitatif`,
  `deux-parcours`, `clavier`, `achat-groupe` (brouillons) verts.
- Lot E (assistant) : `CatalogueService.comprendre` dit la famille probable (`ProduitCompris.contexte`) ; la carte « J'ai
  compris » l'affiche, et « Article à vérifier · gardé tel que tu l'as écrit » quand rien ne correspond. Aucun article
  créé, rien d'ajouté sans le bouton. Tests : serveur `assistant-comprendre` 3/3 ; e2e `deux-parcours` 6/6.
- Lot F (admin) : `apps/web/src/app/(app)/admin/catalogue/page.tsx` (bilan par métier, recherche tous métiers, détail :
  origine, date, clé, où il se lit ; métier principal, second métier sans copie, synonyme, à vérifier, masquer ;
  doublons possibles). Test e2e « catalogue : bilan par métier… » (téléphone, ordinateur) vert.
- Performances mesurées (moteur, 2 142 articles) : une recherche 4 à 20 ms ; les 12 catalogues rangés en 35 ms.

## Interdits (toujours)
Production, `main`, données de production, paiements, e-mails réels, appels IA payants, documents juridiques, réglages des
services : rien. Aucune suppression de données sans l'accord de Greg. La synchronisation du catalogue sur la base distante
n'est jamais lancée sans son accord.

## Limites et décisions pour Greg
- Seuls Couverture, Zinguerie, Étanchéité, Charpente et Peinture sont réellement fournis ; les sept autres métiers ont
  31 à 55 articles : structure prête, contenu professionnel à compléter avec des sources fiables.
- « Tuiles à emboîtement » reste une sous-famille de 47 produits (références de fabricants) : à découper avec un couvreur.
- Famille d'achat groupé : zinguerie et étanchéité restent chez les négoces de couverture (`FAMILLE_DU_METIER_CATALOGUE`).
- Les 46 anciens identifiants de la base de test restent en base (masqués à la lecture) : suppression seulement sur accord.
- 2 doublons probables en peinture (« Peinture plafond blanc mat profond » 10 L et 15 L) : à trancher par Greg.
- Aucune norme, compatibilité, rendement ni règle de calcul n'a été ajoutée : aucune source vérifiée ne les porte.
- La synchronisation du catalogue sur la base de test n'est pas nécessaire (aucun article nouveau) ; la migration
  `20261113100000_catalogue_coeur_metier` s'applique au déploiement.

## Prochaine commande
Chaîne complète sur le commit candidat (le commit de ce fichier) : script du dossier de travail `chaine23.sh`, résultats
dans `final23/etat.txt`. Ne modifier AUCUNE source pendant qu'elle tourne. Verte : avance rapide de
`claude/saas-achat-artisans-prompt-1lyihx`, push, attente des deux domaines, recette en ligne sans compte, compte rendu.
Rouge : ne rien pousser, corriger, relancer la chaîne ENTIÈRE.

## Livraison du 13 novembre 2026 (soir) : derniers écarts, fiche projet, agents, signalements

- En ligne sur test.mobiiz.fr et api-test.mobiiz.fr : commit `9267661b` (vérifié sur les deux domaines). Aucune production.
- Chaîne complète verte sur ce commit exact : moteur 1161, serveur 791 (+1 ignoré), parcours 287 (+29 ignorés), lots 16, parcours activés 69.
- Migration `20261113180000_signalement` appliquée sur la base de test ; table `signalement` vide.
- Non testé en ligne : l'envoi réel d'un signalement (il déclenche de vrais e-mails).
- À décider par Greg : police (Plus Jakarta Sans ou Bricolage Grotesque), filtre « Couverture » des achats groupés V1 (comprend encore la zinguerie), bibliothèque de capture d'écran, réécritures juridiques des missions et avocat avant production, nouvelle acceptation des CGU, outils payants du studio, variable `ALERT_EMAIL`, filtre par fabricant pour les tuiles.
