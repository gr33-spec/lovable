# Cadrage initial — Assistant d'achat pour artisans

> Document de synthèse demandé au §133 du prompt maître. Il résume les
> décisions et renvoie vers les documents détaillés. Rédigé le 2026-09-28.
>
> **Mise à jour 2026-09-28 — réponses du fondateur** : Q1 → aucun
> utilisateur réel, BatiClair est gelé dans `legacy/baticlair/` (option B) ;
> Q2 → devis ou quantitatif, au choix (PD-016) ; Q4 → envoi depuis la boîte
> de l'artisan (ADR-0010, PD-017). Q3, Q5, Q7 → décisions déléguées
> (« mets-toi à ma place ») : PD-011, PD-018, PD-019. Q6 → vérification
> technique menée par le CTO.
>
> Statut des éléments : **DÉCIDÉ** (je tranche), **PROPOSÉ** (ma
> recommandation, validation souhaitée), **À DÉCIDER** (ta décision est
> nécessaire).

---

## 0. Ce qui existe déjà dans le repository

Le dépôt `lovable` contient deux produits sans lien entre eux :

| Élément | Contenu | Constat |
|---|---|---|
| Racine (`src/`, `prisma/`) | **BatiClair** : prototype Next.js 16 de ce même produit (comparer des devis, vérifier une facture, demandes de devis par e-mail, relances, bilan, abonnement Stripe) | Utile comme **prototype UX**, pas comme fondation (voir ci-dessous) |
| `patrimoine/` | Application de gestion de patrimoine immobilier / gestion locative | **Autre produit**. Je n'y touche pas. |

### Ce que BatiClair fait bien (à conserver)

- Parcours mobile-first, vocabulaire simple, tutoiement chaleureux.
- **Adresse de réponse dédiée par chantier** (`demande+<id>@domaine`) : les
  réponses fournisseurs arrivent sans connecter la boîte mail de l'artisan.
  Très bonne idée, reprise dans l'architecture e-mail (ADR-0010).
- Relances des fournisseurs muets, suivi « 2 / 5 devis reçus ».
- Bouton « Négocier » qui prépare un e-mail.
- Dégradation gracieuse quand une clé d'intégration manque.

### Ce qui empêche d'en faire la fondation

| Problème | Règle du prompt concernée |
|---|---|
| C'est **le LLM qui compare** et désigne le moins-disant ; l'économie est calculée par l'IA | §42, §75 |
| Montants en `Float` | §44 |
| Données rattachées à un **utilisateur**, pas à une **entreprise** | §15 |
| Appels IA **dans la requête HTTP** (limite 60 s), pas de jobs, pas de reprise | §92 |
| Extraction plafonnée à **30 lignes** par document | §27 |
| Aucune provenance (page, zone), aucune version de prompt/modèle | §16, §77, §84 |
| Pas de variantes / options / manquants / conditionnements dans le modèle | §43, §53 |
| `PriceRecord` : base de prix **mutualisée entre clients** | §33 (confidentialité) |
| Prompts dans le code métier, appels Anthropic directs | §11, §77 |
| Aucun test | §108 |

**Conclusion** : reconstruire le cœur proprement, en reprenant les bonnes
idées UX de BatiClair. Voir la question bloquante Q1 (§23 ci-dessous).

---

## 1. Ma compréhension du produit

Un **assistant d'achat de matériaux** pour artisans du bâtiment. Sa valeur
n'est pas « lire des PDF » mais **rendre comparables des offres qui ne le
sont pas** et **montrer uniquement ce qui mérite l'attention**.

Trois boucles de valeur, par ordre de fréquence d'usage probable :

1. **Consulter** : du document de départ (devis client, métré, liste) à une
   demande de prix envoyée à plusieurs fournisseurs.
2. **Comparer** : des réponses hétérogènes → une comparaison honnête
   (manquants, variantes, conditionnements, frais) → une décision, voire une
   négociation.
3. **Contrôler** : l'historique des factures → dérives de prix, remises
   disparues, écarts entre offre acceptée et facture.

Le cœur différenciant est le **moteur de comparaison déterministe**
alimenté par une IA qui *extrait et rapproche*, mais ne *calcule* ni ne
*décide* jamais.

## 2. Personas

| Persona | Contexte | Attentes | Contraintes |
|---|---|---|---|
| **Artisan solo / TPE** (couvreur, plaquiste, maçon, 1-5 pers.) — *principal* | Fait ses achats lui-même, souvent le soir ou depuis le camion | Gagner du temps, ne pas se faire avoir, ne pas « faire de l'informatique » | Mobile, photos de mauvaise qualité, peu de patience |
| **Gérant / conducteur de travaux PME** (10-50 pers.) | Plusieurs chantiers en parallèle, volumes plus élevés | Traçabilité, historique, écarts de prix | Desktop + mobile, plusieurs utilisateurs |
| **Assistante administrative** | Prépare les consultations, saisit les factures | Imports en masse, rapidité clavier | Desktop |
| **Fournisseur / négoce** — *indirect* | Reçoit la demande | Comprendre vite la demande, répondre sans créer de compte | Utilise ses propres outils de devis |

Le fournisseur n'est pas un utilisateur, mais **sa facilité à répondre
conditionne toute la valeur** (voir suggestion S5).

## 3. Parcours principaux

| # | Parcours | Phase |
|---|---|---|
| P1 | Document de départ → quantitatif compris → clarifications → validation | 2 |
| P2 | Quantitatif validé → choix fournisseurs → demande générée → envoi | 3 |
| P3 | Réception des offres (e-mail ou import) → extraction → correspondances → synthèse | 3-4 |
| P4 | Synthèse → détail → négociation d'une ligne → décision | 3 |
| P5 | Import de factures en masse → historique → écarts de prix | 6 |
| P6 | Facture reçue ↔ offre acceptée : contrôle du trop-facturé | 6 (existant dans BatiClair) |

Chaque parcours est détaillé dans [product-spec.md](product-spec.md) selon
la grille du §20 (objectif → départ → … → prochaine action évidente).

## 4. Risques produit

1. **Fréquence réelle de la mise en concurrence.** Beaucoup d'artisans ont
   un négoce attitré avec des prix « compte pro ». La valeur de la
   consultation multi-fournisseurs est peut-être plus forte sur les gros
   chantiers ; le contrôle des factures (P5/P6) est peut-être plus
   universel. → À valider avec 5-10 artisans avant la phase 4.
2. **Comportement des fournisseurs.** Certains répondent par téléphone,
   par leur portail, ou ignorent un e-mail venant d'une adresse inconnue.
   L'identité d'envoi (au nom de l'artisan) est critique (Q4).
3. **Documents de départ en « ouvrages » et non en matériaux.** Un devis
   client dit « 95 m² de couverture ardoise », pas « 1 520 ardoises + 350
   crochets ». Passer de l'ouvrage au matériau demande des ratios métier
   (pureau, pertes, recouvrements). C'est un sujet à part entière (Q2).
4. **Confiance.** Une seule erreur visible sur un montant (« l'appli m'a
   dit que B était moins cher ») peut tuer l'adoption. D'où la prudence du
   moteur et la distinction fait / estimation.
5. **Consentement à payer** à 19,90 €/mois : à tester tôt.

## 5. Risques UX

- **Fatigue de clarification** : trop de questions = abandon. Règle : ne
  poser une question que si la réponse peut changer le résultat (S1).
- **Latence** : une analyse prend 20 s à 2 min. Il faut un état
  « je travaille » vivant, la possibilité de partir et d'être prévenu.
- **Comparateur sur mobile** : un tableau 6 colonnes × 40 lignes est
  illisible. UX mobile dédiée (cartes par besoin, synthèse d'abord).
- **Photos de mauvaise qualité** : message d'erreur utile + reprise.
- **Vocabulaire** : « quantitatif », « consultation » sont compris des PME,
  moins des artisans solo. À tester (« ma liste de matériaux », « demande
  de prix »).

## 6. Risques techniques

- **Next.js évolue vite** (le dépôt le signale lui-même dans `AGENTS.md`) :
  ne pas y enfermer la logique métier ni l'API.
- **Traitements longs en serverless** : impossible de fiabiliser OCR / IA /
  e-mail dans des fonctions limitées à 60 s → jobs dans un worker.
- **Fuite inter-entreprises** : le risque le plus grave. Isolation imposée
  au niveau des repositories + tests automatiques dédiés.
- **Délivrabilité e-mail** (SPF, DKIM, DMARC) et **analyse des e-mails
  entrants** (réponses transférées, sujets modifiés).
- **Migration** des éventuelles données BatiClair (Q1).

## 7. Risques IA

| Risque | Parade |
|---|---|
| Lignes inventées ou prix hallucinés | Provenance obligatoire (page + extrait) ; contrôle arithmétique déterministe ; lignes sans preuve → « à vérifier » |
| Lignes oubliées (longs PDF, tableaux sur plusieurs pages) | Découpage par pages ; contrôle « somme des lignes = total imprimé » qui révèle un oubli |
| Confusion d'unités | Unités fermées côté domaine ; « inconnue » plutôt que deviner |
| Fausse correspondance produit | Seuils prudents ; une fausse correspondance est pire qu'une question |
| Injection d'instructions dans un PDF | Document traité comme donnée ; aucun outil à effet de bord pendant l'extraction ; sortie validée par schéma |
| Non-déterminisme / changement de modèle | Versions de prompt et de modèle tracées ; jeu d'évaluation de non-régression |
| Coût par document | Texte natif d'abord, vision seulement si nécessaire ; suivi du coût par exécution |

## 8. Risques sécurité / confidentialité

- Documents = données commerciales sensibles (prix négociés, clients,
  adresses) → stockage privé, URLs signées courtes, chiffrement au repos.
- Isolation multi-tenant stricte ; la **mémoire métier est privée** par
  entreprise. La base `PriceRecord` mutualisée de BatiClair doit être
  arrêtée ou encadrée juridiquement (Q1).
- Scopes OAuth minimaux ; **éviter les scopes Gmail « restreints »** qui
  imposent un audit de sécurité annuel payant (CASA) — voir ADR-0010.
- Choix du fournisseur IA pour la production : conservation, non-
  entraînement, région, contrat (DPA) à vérifier avant la mise en
  production (Q6).

Détails : [security.md](security.md).

## 9. Architecture proposée

**Monolithe modulaire, hexagonal par module**, avec un noyau métier pur.

```
        ┌──────────────┐       ┌───────────────────────────────┐
        │  apps/web    │ HTTP  │  apps/api  (NestJS)           │
        │  Next.js     ├──────►│  ─ entrée HTTP (API /v1)      │
        │  (UI seule)  │       │  ─ entrée worker (jobs)       │
        └──────────────┘       │  modules/ : identity, tenancy,│
   (demain : mobile,           │  projects, documents, takeoff,│
    API partenaires) ─────────►│  suppliers, consultations,    │
                               │  offers, matching, comparison,│
                               │  invoices, notifications,     │
                               │  billing, ai, integrations    │
                               └──────┬───────────┬────────────┘
                                      │ ports     │ ports
                  ┌───────────────────┘           └──────────────────┐
          PostgreSQL (données + file de jobs)      Adapters : IA, e-mail,
          Object storage S3 privé                  stockage, paiement, OCR…
                                      ▲
                     packages/domain (noyau pur : argent, unités,
                     offres, moteur de comparaison) — sans framework
```

Détails : [architecture.md](architecture.md), ADR 0001 à 0014.

## 10. Stack recommandée

| Couche | Choix | Pourquoi (court) | ADR |
|---|---|---|---|
| Langage | TypeScript strict partout | Un seul langage front/back/domaine | — |
| Monorepo | pnpm + Turborepo | Standard, rapide, simple | 0002 |
| Front | Next.js + React | Déjà maîtrisé dans le dépôt ; UI uniquement | 0003 |
| API | NestJS | Modules + injection de dépendances = ports/adapters naturels ; conventions connues | 0003 |
| Base | PostgreSQL | Relationnel, contraintes, JSONB, full-text, `pg_trgm` pour le matching | 0004 |
| ORM | Prisma (déjà utilisé) | Migrations, typage ; SQL brut possible si besoin | 0004 |
| Jobs | **pg-boss** (sur PostgreSQL) derrière un port `JobQueue` | Une infra de moins que Redis/BullMQ, mise en file **dans la même transaction** que l'écriture métier | 0005 |
| Stockage | S3-compatible privé (MinIO en local) | Portable (Scaleway, OVH, AWS…) | 0006 |
| Auth | **Better Auth** hébergé dans l'API | E-mail + mot de passe, vérification, reset, Google, Microsoft ; données chez nous | 0007 |
| Validation | Zod | Schémas partagés API / web / sorties IA | 0008 |
| Calculs | `decimal.js` | Aucun flottant pour l'argent | 0009 |
| Tests | Vitest, Postgres réel en intégration, Playwright E2E | | [testing.md](testing.md) |
| Observabilité | Logs JSON (pino), OpenTelemetry, suivi d'erreurs compatible Sentry | | [observability.md](observability.md) |
| Hébergement | Conteneurs Docker, région UE | Pas de dépendance à une plateforme | 0013 |

Deux écarts assumés par rapport à la base suggérée : **pg-boss plutôt que
Redis + BullMQ**, et **auth dans l'API plutôt que dans Next.js**. Arguments
dans les ADR.

## 11. Modèle de domaine

Résumé (détail : [domain-model.md](domain-model.md)) :

- **Tenancy** : `User`, `Company`, `Membership(role)`.
- **Chantiers** : `Project`.
- **Documents** : `Document` (fichier, empreinte, statut) → `DocumentProcessing` (tentative versionnée).
- **Besoin** : `Takeoff` → `TakeoffLine` (valeurs + origine IA/utilisateur + provenance) ; `Clarification`.
- **Fournisseurs** : `Supplier`, `SupplierContact`.
- **Consultation** : `Consultation` → `ConsultationItem` (**instantané figé** du quantitatif validé) → `SupplierRequest` (un par fournisseur) → `InboundMessage`.
- **Offres** : `SupplierOffer` (versionnée) → `SupplierOfferLine` (avec `kind` : main / substitution / variant / option / fee / deposit / info).
- **Mémoire métier** : `CanonicalProduct`, `ProductAlias` (privés par entreprise), `ItemMatch`.
- **Comparaison** : `ComparisonRun` (version du moteur, empreinte des entrées, résultat figé).
- **Factures** : `Invoice`, `InvoiceLine`, `PriceObservation`, `PriceAnomaly`.
- **Plateforme** : `AIExecution`, `OutboxEvent`, `AuditEvent`, `Notification`, `Connection` (intégrations), `Plan`/`Subscription`/`Entitlement`/`UsageCounter`.

Fusions notables : *Variant / Option / Alternative / Fee* ne sont pas des
entités mais des **natures de ligne** ; *ProductMapping* = `ProductAlias` ;
*PromptVersion* vit dans le code (registre versionné), seul son identifiant
est stocké.

## 12. Modules du monolithe

`identity` · `tenancy` · `projects` · `documents` · `takeoff` ·
`suppliers` · `consultations` · `offers` · `matching` · `comparison` ·
`invoices` · `notifications` · `billing` · `ai` · `integrations` ·
`audit`. Règles de dépendance dans [architecture.md](architecture.md).

## 13. Arborescence du repository (cible)

```
apps/
  web/                 Next.js — interface uniquement
  api/                 NestJS — API HTTP + worker
    src/modules/<module>/{domain,application,infrastructure,http}
    src/platform/      config, db, jobs, logs, events, auth
packages/
  domain/              noyau métier pur (DÉJÀ CRÉÉ)
  contracts/           schémas Zod partagés (API + sorties IA)
  ui/                  design system
  i18n/                textes (fr d'abord)
tools/
  ai-evals/            jeux d'évaluation IA + runner
fixtures/              données de démo fictives (chantier Dupont)
docs/                  cette documentation + ADR
patrimoine/            autre produit — inchangé
legacy/baticlair/      prototype gelé (Q1 : option B retenue)
```

## 14. Pipeline documentaire

`INPUT → VALIDATION (octets magiques, taille, pages, chiffrement) →
STOCKAGE PRIVÉ + empreinte SHA-256 (doublons) → DÉTECTION DU TYPE →
TEXTE NATIF si exploitable, sinon VISION → EXTRACTION STRUCTURÉE (schéma) →
NORMALISATION (unités, montants) → VALIDATION MÉTIER (arithmétique,
cohérence) → CLARIFICATIONS → PERSISTANCE`, chaque étape étant un job
reprenable et idempotent. Détails : [document-pipeline.md](document-pipeline.md).

## 15. Architecture IA

- Port `AIProvider.generateStructured(task, input, schema)` → sortie
  validée + consommation. Premier adapter : Anthropic.
- **Nos** schémas (`TakeoffExtraction`, `SupplierOfferExtraction`,
  `ProductMatching`…), jamais ceux d'un fournisseur.
- Registre de prompts versionnés dans le code (`takeoff-extraction@1`).
- Routage simple par *tâche → niveau* (rapide / standard / vision), configurable.
- `AIExecution` trace fournisseur, modèle, prompt, jetons, coût, durée, issue.
- Pas de fallback automatique vers un autre fournisseur au MVP (décision explicite).
- Évaluations de non-régression avant tout changement de prompt/modèle.

Détails : [ai-architecture.md](ai-architecture.md).

## 16. Moteur de comparaison

**Déjà implémenté et testé** dans `packages/domain` (v0.1.0). Il calcule,
pour chaque fournisseur : total imprimé (fait), total calculé, cohérence
arithmétique, couverture, **total comparable** sur une base commune
(quantités demandées, frais inclus, consignes et articles non demandés
exclus, manquants estimés par la médiane des autres fournisseurs), et
produit des **constats typés** (fait / inférence / avertissement /
recommandation) sans aucun texte, traduits ensuite par l'interface.

Il sait notamment : ne jamais présenter une offre incomplète comme la
moins chère ; détecter qu'un total imprimé additionne une option ;
convertir 2 rouleaux de 47 m² en 94 m² ; refuser de convertir des m² en
unités ; répartir une remise globale ; ne recommander que sur une base
complète. Détails : [comparison-engine.md](comparison-engine.md).

## 17. Stratégie UX

- **Accueil orienté action** : « Que voulez-vous faire ? » + une file
  « À traiter » (réponses reçues, questions en attente).
- **Navigation proposée** (je challenge la tienne) : *Accueil · Chantiers ·
  Factures · Fournisseurs* ; les consultations vivent **dans** le chantier
  (pas d'onglet dédié) ; Paramètres dans le menu du compte. 4 entrées =
  barre basse mobile lisible.
- **Pas d'étape « créer un chantier » obligatoire** : on dépose un document,
  le chantier est proposé automatiquement (« Toiture Dupont ? »).
- **Assistant de clarification** : un fil sobre, questions groupées, réponses
  en un geste, quantitatif mis à jour en direct.
- **Divulgation progressive** en 4 niveaux (synthèse → vigilance → détail →
  provenance).
- Confiance en 3 niveaux, toujours **icône + texte** (jamais la couleur seule).

Détails : [ux-principles.md](ux-principles.md).

## 18. Stratégie de tests

Pyramide : noyau métier très couvert (déjà 52 cas) → intégration avec un
vrai PostgreSQL (dont tests d'isolation inter-entreprises) → adapters
testés sur réponses enregistrées → E2E Playwright du parcours complet avec
un faux fournisseur IA → évaluations IA séparées. Détails : [testing.md](testing.md).

## 19. Observabilité

Logs JSON structurés avec `requestId`, `jobId`, `documentId`,
`consultationId`, `companyId` — **jamais le contenu des documents**.
Traces OpenTelemetry, métriques (durée des jobs, coût IA par document /
utilisateur / consultation / modèle), suivi d'erreurs, **identifiant de
support** affiché dans chaque message d'erreur. Détails : [observability.md](observability.md).

## 20. Étapes du MVP

| Phase | Contenu | Livrable vérifiable |
|---|---|---|
| **0 — Cadrage** (ce livrable) | Docs, ADR, noyau métier + moteur de comparaison testés | ✅ fait |
| **1 — Fondations** | Monorepo, API NestJS, Postgres/Prisma, auth, entreprise, chantier, stockage, jobs, port IA, bases du design system, CI | Inscription → entreprise → chantier, en local et en CI |
| **2 — Premier parcours réel** | Dépôt PDF → stockage → job → extraction IA → quantitatif → clarifications → édition → validation | Parcours complet réel, E2E |
| **3 — Consultation** | Fournisseurs, consultation, envoi (adresse de réponse dédiée), import manuel des offres, extraction, matching, comparaison, négociation | Chantier Dupont réel de bout en bout |
| **4 — E-mail avancé** | Rattachement robuste, envoi depuis la boîte de l'artisan (OAuth), notifications | |
| **5 — Lancement** | Essai, plans, paywall, facturation, entitlements, pages légales, durcissement sécurité | |
| **6 — Factures** | Import massif, historique, anomalies, contrôle facture ↔ offre | |
| **7 — Intégrations** | Connecteurs devis/facturation, share sheet, mobile, API partenaires | |

Changement proposé par rapport à ta roadmap : la **réception des réponses
par adresse dédiée** passe en phase 3 (au lieu d'attendre OAuth en
phase 4). Détails : [roadmap.md](roadmap.md).

## 21. Décisions que je prends moi-même

Toutes les décisions techniques des ADR 0001 à 0014 ; la représentation de
l'argent et des unités ; les règles du moteur listées dans
[product-decisions.md](product-decisions.md) (variantes non additionnées,
consignes exclues du comparable, estimation des manquants par médiane,
comparaison en HT…) ; la structure de navigation proposée (réversible) ;
les seuils de confiance initiaux (recalibrés par les évaluations).

## 22. Décisions pour lesquelles j'ai besoin de toi

| # | Sujet | Bloquant ? | Quand |
|---|---|---|---|
| Q1 | Sort de BatiClair | ✅ Répondu : gelé dans `legacy/` | — |
| Q2 | Documents de départ | ✅ Répondu : devis ou quantitatif (PD-016). Documents d'exemple toujours souhaités | Avant la fin de la phase 2 |
| Q3 | Conditionnement | ✅ Décidé : coût réellement payé pour couvrir le besoin (PD-011) | — |
| Q4 | Identité d'envoi des demandes aux fournisseurs | ✅ Répondu : depuis la boîte de l'artisan (ADR-0010) | — |
| Q5 | Essai gratuit, plans, multi-utilisateurs, quotas | ✅ Décidé : 30 jours sans carte (PD-018), révisable | — |
| Q6 | Fournisseur IA et hébergement de production | Vérification menée par le CTO | Fin de phase 2 |
| Q7 | Conservation des documents | ✅ Décidé (PD-019), validation juridique avant lancement | — |

## 23. Mes questions importantes

**Q1 — BatiClair.** Le prototype est-il en production avec de vrais
utilisateurs, abonnés Stripe ou données ?
- **A** — Évoluer BatiClair sur place. *Déconseillé* : presque tout le cœur
  serait réécrit, avec la dette en plus.
- **B** — Nouveau monorepo dans ce dépôt ; BatiClair gelé dans
  `legacy/baticlair/` et laissé en service tant que le nouveau ne le
  remplace pas ; migration des comptes si nécessaire. **Ma recommandation.**
- **C** — Nouveau dépôt dédié. Le plus propre (historique, droits, CI
  séparés), mais cette session ne peut écrire que dans `lovable`.

Et : acceptes-tu d'**arrêter l'alimentation de la base de prix mutualisée**
(`PriceRecord`) tant qu'un cadre juridique n'est pas défini ? Je le
recommande. À terme, je recommande aussi de sortir `patrimoine/` dans son
propre dépôt.

**Q2 — Documents de départ.** Dans la réalité de tes artisans, le document
de départ est-il plutôt :
- une **liste de matériaux** déjà faite (facile) ;
- un **devis client en ouvrages** (« 95 m² couverture ardoise »), qu'il faut
  convertir en matériaux (difficile, nécessite des ratios métier) ?

Ma recommandation pour le MVP : extraire fidèlement ce qui est écrit ;
quand une ligne est un ouvrage, la garder comme telle avec la mention « à
convertir en matériaux » et laisser l'artisan compléter ; construire le
module de ratios plus tard, à partir de vrais cas. **Peux-tu aussi me
fournir 10 à 20 documents réels anonymisés** (devis clients, métrés, devis
fournisseurs, factures) ? C'est l'élément qui aura le plus d'impact sur la
qualité réelle de l'extraction.

**Q3 — Conditionnement (§46).** Besoin 91 m², le fournisseur facture 94 m².
- A — comparer le montant réellement facturé ;
- B — ramener au besoin (prix unitaire × 91) ;
- C — afficher les deux : « coût réel » et « coût comparable ».

Je recommande **C**, avec le comparable pour classer les offres et le réel
toujours visible. Le moteur calcule déjà les deux.

**Q4 — Identité d'envoi.** Les fournisseurs reçoivent la demande :
- A — depuis notre domaine, au nom de l'artisan (« Jean Martin via BatiClair »),
  réponse vers l'adresse dédiée, artisan en copie. Immédiat, aucun accès à
  sa boîte.
- B — depuis la vraie boîte de l'artisan (Gmail/Outlook, scope d'envoi seul).
  Meilleure confiance côté fournisseur, mais connexion OAuth nécessaire.

Je recommande **A pour la phase 3, B en option en phase 4**.

## 24. Suggestions produit

| # | Idée | Pourquoi | Complexité | Recommandation |
|---|---|---|---|---|
| S1 | **Ne poser une question que si la réponse change le résultat** (matérialité) | Une ambiguïté à 12 € sur un chantier de 9 000 € ne mérite pas d'interrompre | Moyenne | **Maintenant** |
| S2 | **Adresse de réponse dédiée par consultation** (reprise de BatiClair) | Réception automatique sans OAuth ni scope Gmail restreint | Faible | **Maintenant** (phase 3) |
| S3 | **Chantier créé automatiquement** à partir du document déposé | Une étape de moins sur le parcours principal | Faible | **Maintenant** |
| S4 | **Contrôle facture ↔ offre acceptée** | Referme la boucle : prix négocié = prix facturé ? Existe déjà dans BatiClair | Moyenne | Phase 6, voire plus tôt |
| S5 | **Lien de réponse fournisseur sans compte** : le fournisseur dépose son devis ou saisit ses prix sur une page web liée à la demande | Données structurées à la source = zéro erreur d'extraction ; très différenciant | Moyenne | Plus tard (après validation terrain) |
| S6 | **Bon de commande** généré vers le fournisseur retenu | Prolonge naturellement la décision | Faible | Plus tard |
| S7 | **Validation terrain** : 5 entretiens d'artisans avec leurs vrais documents avant la phase 3 | Réduit le risque produit n°1 | — | **Maintenant** |
