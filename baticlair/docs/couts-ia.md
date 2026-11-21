# Coûts IA — audit, architecture et mesure

> Audit du 2026-09-30, validé par le fondateur. Tarifs : page officielle
> Anthropic (https://platform.claude.com/docs/en/about-claude/pricing),
> consultée le 2026-09-30. Conversion d'affichage : `AI_USD_TO_EUR`
> (0,92 par défaut, à ajuster).

## Règles

1. **La précision d'abord** (PD-026) : économiser des tokens, jamais au
   prix d'une erreur de quantité, référence, unité, prix ou TVA.
2. **Budget** (PD-027) : 10 € maximum par artisan et par mois en usage
   normal ; objectif 3 à 6 €.
3. **On mesure avant de décider** : aucun choix de modèle ni de prix
   d'abonnement sans données réelles.

## Chaîne de traitement

| Étape | IA ? | État |
|---|---|---|
| Contrôle du fichier (contenu réel PDF, taille, pages), empreinte SHA-256 | Non | ✅ |
| Texte page par page (pdf.js), colonnes conservées, lignes numérotées `page:ligne` | Non | ✅ |
| Routage par page : texte / image / écarter (profil couvreur) | Non | ✅ |
| Estimation haute du coût d'extraction de chaque document | Non | ✅ |
| Extraction en JSON validé par schéma, lignes citées par numéro | Oui | Étape C |
| Contrôles arithmétiques (qté × PU, totaux, TVA), unités, « à vérifier » | Non | Étape C |
| Relance ciblée (pages concernées) vers un modèle plus puissant | Oui | Étape C |
| Comparaison des offres | Non (moteur déterministe) | ✅ (domaine) |
| Rapprochement besoin ↔ offre : d'abord par le code, IA pour le reste | Partiel | Étape E |

Le PDF n'est **jamais relu** après l'extraction : tout le reste travaille
sur le JSON stocké. Un même fichier déposé deux fois dans un chantier
n'est ni stocké ni lu deux fois.

## Gros devis (PD-046)

Un appel pour un devis normal ; au-delà de ce qu'un appel peut rendre sans
risque, lecture en blocs de pages décidée avant tout appel ; jamais deux fois
la même demande ; garde-fou de coût par document (`AI_ANALYSIS_MAX_EUR`).
Stratégie et coût par taille de devis : `lecture-gros-devis.md` (généré).

## Modèles et tarifs (USD par million de tokens)

| Modèle | Entrée | Sortie | Cache (lecture) | Rôle prévu |
|---|---|---|---|---|
| Claude Haiku 4.5 | 1 | 5 | 0,10 | Candidat pour les PDF à texte propre, **si** l'évaluation le valide |
| Claude Sonnet 5.5 | 2 | 10 | 0,20 | Par défaut : texte, scans (vision haute résolution), rapprochement, secours |
| Claude Opus 5.5 | 4 | 20 | 0,20 | Dernier recours uniquement |

Grilles datées et versionnées dans `packages/domain/src/ai-cost/pricing.ts` :
un changement de tarif = une nouvelle grille, les coûts passés restent exacts.

## Estimations (à remplacer par les mesures)

Hypothèses : 15 chantiers/mois, 1 devis client (5 à 10 pages) + 3 devis
fournisseurs (5 à 7 pages) par chantier.

| Scénario | Mois, extraction mixte (Haiku + Sonnet) | Mois, tout Sonnet 5.5 |
|---|---|---|
| Faible | ≈ 1,5 € | — |
| Moyen | ≈ 3,6 € | ≈ 5,1 € |
| Élevé (40 % de scans, 25 % de relances) | ≈ 9,2 € | — |
| Pire cas plausible (30 chantiers, tout scanné, tout relancé 2 fois) | ≈ 54 € | |

La sortie (JSON) pèse plus de la moitié du coût : c'est pourquoi l'IA
citera les numéros de ligne au lieu de recopier le texte.

## Mesure (étape A, en place)

- `ai_execution` : une ligne par appel — modèle, voie (texte, image,
  secours, dernier recours), pages, tokens entrée/sortie/cache, tentative,
  coût en micro-dollars, grille de prix, statut, durée.
- `AiUsageRecorder.record()` : **point de passage obligatoire** de tout
  appel IA ; un modèle sans tarif est refusé (jamais un coût à zéro par
  erreur).
- `document_processing.estimatedMicroUsd` / `actualMicroUsd` : estimation
  avant appel et coût réel cumulé, par document.
- `GET /v1/ai-usage?month=AAAA-MM` (propriétaire, administrateurs) : coût
  réel du mois (heure de Paris), relances, échecs, pages, par chantier, par
  modèle, budget consommé, et volume lu avec son coût estimé. Affiché dans
  « Mon compte ».

## Paliers : comptage des analyses (PD-028)

- `ai_analysis` : une ligne par document analysé (unique par document),
  statut, utilisateur, mois de décompte, coût IA cumulé.
- `AnalysisMeter.begin()` avant tout appel IA : refuse au-delà du palier
  (`analysis_quota_reached`), renvoie « déjà fait » si le document a déjà
  été analysé (aucun appel, aucun décompte) ; `complete()` décompte,
  `fail()` ne décompte pas.
- Chaque appel IA porte `analysisId` et `userId` : coût par analyse, par
  personne, par mois.

## Modèle économique (orientation, pas de prix)

Coût faible, prévisible, proportionnel aux pages, avec une longue traîne
(scans) : **abonnement avec usage inclus et fair use** (quota de documents,
plafond de pages par document), puis supplément ou palier. Les crédits
sont écartés (friction pour l'artisan, enjeu de quelques euros).

## Suite

- **C** : branchement de l'IA (extraction couvreur, contrôles, relance
  ciblée), sur un jeu de vrais devis de couvreurs anonymisés.
- **D** : évaluation Haiku 4.5 contre Sonnet 5.5 sur ces devis ; mesure
  réelle des tokens par page.
- **E** : rapprochement besoin ↔ offre, d'abord par le code.
- Stockage objet et envoi direct du navigateur pour dépasser 4 Mo par
  document (limite actuelle d'une requête vers une fonction Vercel).
