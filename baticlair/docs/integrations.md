# Intégrations

Principe : **tronc + branches**. Chaque intégration est un adapter derrière
un port ; elle peut être connectée, déconnectée, remplacée sans toucher au
métier. État de chaque intégration affiché honnêtement :
**RÉEL · SIMULÉ · PARTIEL · NON IMPLÉMENTÉ · NON CONNECTÉ**.

## État actuel

| Intégration | Port | État |
|---|---|---|
| Authentification (Better Auth, e-mail + mot de passe) | module `identity` | **RÉEL** (testé) |
| Connexion Google / Microsoft | module `identity` | NON CONNECTÉ (configuration prête, identifiants OAuth absents, non testé) |
| E-mails système (vérification, mot de passe) | `TransactionalEmailSender` | **SIMULÉ** : affichés dans les logs (dev) ou capturés (tests) |
| IA (Anthropic) | `AIProvider` | NON IMPLÉMENTÉ dans la nouvelle architecture (existe en direct dans BatiClair) |
| Stockage S3 | `StorageProvider` | NON IMPLÉMENTÉ |
| E-mail sortant | `TransactionalEmailProvider` | NON IMPLÉMENTÉ (Resend dans BatiClair) |
| E-mail entrant | `InboundEmailReceiver` | NON IMPLÉMENTÉ (webhook dans BatiClair) |
| Gmail / Outlook | `MailboxConnector` | NON IMPLÉMENTÉ (phase 4) |
| Paiement | `PaymentProvider` | NON IMPLÉMENTÉ (Stripe dans BatiClair) |
| Logiciels de devis | `EstimatingSoftwareConnector` | NON IMPLÉMENTÉ (phase 7) |
| Données produit | `ProductDataProvider` | NON IMPLÉMENTÉ |

## E-mail (ADR-0010)

### Envoi des demandes de prix (phase 3)
- Depuis la vraie boîte de l'artisan : Gmail (scope d'envoi seul) ou
  Microsoft Graph (`Mail.Send`). Autres messageries : « au nom de »
  l'artisan depuis notre domaine, artisan en copie.
- `Reply-To` = adresse de l'artisan **+** adresse de suivi de la
  consultation. Sujet : `[K7Q2M] Demande de prix — Réfection toiture Dupont`.

### Réception des réponses
1. Adresse de suivi `k7q2m@reponses.<domaine>` (présente dans le
   `Reply-To`) → webhook du prestataire d'e-mail entrant. L'artisan reçoit
   la même réponse dans sa propre boîte.
2. Rattachement par indices, dans l'ordre de fiabilité :
   adresse de destination → en-têtes `In-Reply-To`/`References` (fil) →
   code `[K7Q2M]` dans le sujet → expéditeur connu d'une demande en cours →
   domaine de l'expéditeur. Chaque rattachement mémorise les indices
   utilisés (`linkEvidence`).
3. Indices contradictoires ou insuffisants → `needs_review` : l'artisan
   choisit en un geste (« Cette réponse concerne-t-elle *Toiture Dupont* ? »).
4. Cas gérés : réponse dans le fil, sujet modifié, transfert, plusieurs
   pièces jointes (chacune devient un document), réponse **sans** pièce
   jointe (le corps du message est analysé comme une offre), refus
   (« nous ne faisons pas ce produit ») détecté comme `declined`.
5. Dédoublonnage par `Message-ID` : un même e-mail reçu deux fois ne crée
   qu'une réponse.
6. Fournisseur qui répond à l'adresse personnelle de l'artisan : l'artisan
   **transfère** à l'adresse dédiée (affichée sur la fiche) — ou importe le
   PDF.

### Dégradation gracieuse
E-mail indisponible → l'import manuel reste toujours disponible ; les envois
en échec sont réessayés et signalés, jamais perdus silencieusement.

## Logiciels de devis / facturation (phase 7)

Aucune dépendance à une API existante. Niveaux d'intégration, du plus
simple au plus riche : export PDF → import CSV/Excel → partage mobile →
API/OAuth officielle si elle existe et apporte de la valeur → webhooks.
Le connecteur produit un `Document` ou un `Takeoff` : le cœur ne change pas.

## Share sheet / « Ouvrir avec » (phase 7)

- **Web (PWA)** : Web Share Target permet de recevoir des fichiers sur
  Android (Chrome) ; le support iOS est limité — à revérifier au moment de
  la phase 7.
- **Natif iOS** : extension de partage (Share Extension) nécessaire pour
  « Partager → BatiClair » depuis Messages, Mail, Fichiers.
- **Natif Android** : `intent-filter` `ACTION_SEND` / `ACTION_VIEW`.
- Dans tous les cas le fichier est envoyé à `POST /v1/documents` : même
  pipeline. Le rattachement au bon chantier est proposé (dernier chantier
  actif, fournisseur reconnu, code de consultation trouvé dans le document).

## Paiement (ADR-0011)

Stripe pour le web, derrière `PaymentProvider`. Le reste de l'application
ne lit que les `Entitlement` (« peut lancer une analyse », « nombre de
consultations/mois ») : un abonnement App Store ou Play Store alimentera
les mêmes entitlements.

## Données produit externes

`ProductDataProvider` prévu, rien de branché. Aucune source externe
(catalogue, base de prix) ne sera utilisée sans vérification préalable des
droits d'usage, de la licence et des conditions d'accès. Pas de scraping.
