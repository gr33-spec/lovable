# Spécification produit

## Promesse

« Je donne mes documents au logiciel, il comprend ce qui se passe et il me
montre uniquement ce qui mérite mon attention. »

## Périmètre MVP (phases 1 à 3)

Inclus : compte + entreprise, chantiers, import de documents, liste de
matériaux (import, extraction, création manuelle), clarifications,
validation, fournisseurs, demandes de prix envoyées par e-mail, réception
des réponses (adresse dédiée + import manuel), extraction des offres,
correspondances, comparaison, brouillon de négociation.

Hors MVP : connexion des boîtes mail (phase 4), facturation et essai
(phase 5), module factures (phase 6), connecteurs et mobile natif (phase 7).

## Parcours détaillés

Grille : objectif → point de départ → informations disponibles → actions
minimales → automatisations → ambiguïtés → résultat → prochaine action.

### P1 — Du document au besoin validé (phase 2)

| | |
|---|---|
| **Objectif** | Obtenir une liste de matériaux juste, sans la ressaisir |
| **Départ** | Accueil → « Importer un document », ou fichier partagé |
| **Disponible** | Le document (PDF, photo), l'historique de l'entreprise |
| **Actions minimales** | Déposer le fichier ; confirmer le chantier ; répondre aux 0-5 questions ; valider |
| **Automatisations** | Détection du type ; stratégie texte/vision ; extraction ; normalisation des unités ; proposition du nom de chantier ; détection de doublon |
| **Ambiguïtés** | Unité illisible ou incohérente ; quantité absente ; ligne « ouvrage » (Q2) ; doublons ; lignes illisibles |
| **Résultat** | Liste validée, versionnée, chaque ligne traçable jusqu'au document |
| **Prochaine action** | « Demander des prix à mes fournisseurs » |

Création manuelle : même écran de liste, vide, avec saisie rapide
(désignation → quantité → unité, autocomplétion depuis la mémoire de
l'entreprise).

### P2 — Consulter les fournisseurs (phase 3)

| | |
|---|---|
| **Objectif** | Envoyer une demande claire à plusieurs fournisseurs en une minute |
| **Départ** | Liste validée → « Demander des prix » |
| **Disponible** | Liste figée, carnet de fournisseurs, historique (fournisseurs habituels pour cette famille) |
| **Actions minimales** | Cocher les fournisseurs (présélection des habituels) ; relire l'aperçu ; Envoyer |
| **Automatisations** | Rédaction de la demande ; code de consultation ; adresse de réponse ; relances proposées après X jours |
| **Ambiguïtés** | Fournisseur sans e-mail ; date de livraison souhaitée (facultative) |
| **Résultat** | « 3 fournisseurs contactés · 0 réponse · 3 en attente » |
| **Prochaine action** | Attendre (notification) ou importer une offre reçue autrement |

### P3 — Recevoir et comprendre les offres (phase 3)

| | |
|---|---|
| **Objectif** | Voir immédiatement ce que vaut chaque offre |
| **Départ** | Notification « Nouvelle offre de B » ou import manuel |
| **Automatisations** | Rattachement ; extraction ; natures de lignes ; correspondances ; contrôle arithmétique ; comparaison recalculée |
| **Ambiguïtés** | Correspondances « à vérifier » **qui changent le résultat** ; rattachement incertain |
| **Résultat** | Synthèse du moteur : couverture, manquants, frais, écarts, recommandation prudente |
| **Prochaine action** | « Voir le détail », « Négocier cette ligne », ou « Relancer C » |

### P4 — Décider et négocier (phase 3)

Brouillon de négociation ciblé sur les lignes où un concurrent est
nettement moins cher (constat `CATEGORY_PRICE_GAP` ou écart par ligne),
modifiable, envoyé uniquement après validation. Une offre révisée reçue
crée une nouvelle version et relance la comparaison.

### P5 / P6 — Factures (phase 6)

Import en masse (glisser 50 PDF), traitement en tâche de fond avec
progression, rapprochement des produits via la mémoire métier,
historique de prix par produit et fournisseur, écarts « à vérifier »
formulés sobrement (« Ce produit était généralement facturé autour de
1,00 € ; cette facture indique 1,05 € (+5 %) »). Contrôle facture ↔ offre
acceptée (S4).

## Notifications (phase 3-4)

Événements : nouvelle offre, toutes les offres reçues, analyse terminée,
question en attente, absence de réponse après X jours. Canaux : in-app,
e-mail (résumé groupé, jamais une rafale), push mobile plus tard. Chaque
notification mène à une action.

## Onboarding

Création de compte → nom de l'entreprise (préremplissage possible depuis
le SIREN, comme dans `patrimoine`) → métier (facultatif) → accueil. Les
fournisseurs et intégrations se configurent au moment où ils servent.

## Billing (phase 5)

Plans configurables (hypothèse : 19,90 €/mois, ~199 €/an), essai à définir
(Q5), paywall explicatif, jamais un blocage sans contexte. Voir ADR-0011.

## Analytics produit

Événements : `SignupCompleted`, `OnboardingCompleted`,
`FirstDocumentUploaded`, `TakeoffValidated`, `FirstConsultationCreated`,
`SupplierResponseReceived`, `ComparisonViewed`, `InvoiceAnalysisCompleted`.
Stockés en interne d'abord ; aucune donnée de document ; pas de traçage
publicitaire.
