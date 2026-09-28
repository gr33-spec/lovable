# Décisions produit

Journal des décisions métier. Une décision prise ici devient, lorsque c'est
pertinent, une règle du domaine **et** un test.

Statuts : **Décidé** · **Proposé** (ma recommandation, en attente de ta
validation) · **Ouvert**.

---

### PD-001 — Les variantes ne sont jamais additionnées au total comparable
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : une ligne `variant` (ou « alternative ») n'entre ni dans le
  total fournisseur recalculé ni dans le total comparable. Elle est
  signalée, avec son montant.
- **Raison** : une variante est un autre choix possible, pas une quantité
  supplémentaire.
- **Impact** : `offer.ts` (`COUNTED_KINDS`), test « n'additionne ni variante ni option ».

### PD-002 — « Variante » et « alternative » : un seul concept
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : même traitement métier, un seul `kind: "variant"`.
  « Substitution » reste distinct : le fournisseur **remplace** le produit
  dans son offre principale (comptée, à valider).
- **Raison** : aucune différence de calcul ; deux concepts identiques
  créeraient des incohérences d'extraction.

### PD-003 — Les options ne sont pas additionnées
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : une option (article facultatif non demandé) est signalée,
  jamais comptée.

### PD-004 — Les consignes sont exclues du total comparable
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : une consigne (palette…) est comptée dans le total
  fournisseur (c'est de l'argent à avancer) mais pas dans le total
  comparable (elle est remboursable).

### PD-005 — Les frais sont inclus dans le total comparable
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : livraison, éco-contribution, manutention comptent. Une
  livraison **non mentionnée** n'est pas supposée gratuite : elle est
  signalée « non précisée », sauf mention explicite « franco ».

### PD-006 — Estimation d'un article manquant : médiane des autres fournisseurs
- **Date** : 2026-09-28 · **Statut** : Proposé
- **Décision** : pour compléter le total comparable d'une offre à laquelle
  il manque un article, on utilise la médiane des prix (ramenés à la
  quantité demandée) des autres fournisseurs, en l'affichant **toujours**
  comme une estimation.
- **Raison** : le minimum avantagerait l'offre incomplète, le maximum la
  pénaliserait ; la médiane est neutre.
- **Alternative écartée** : ne pas estimer du tout — l'artisan perdrait
  alors toute vision d'ensemble.

### PD-007 — Pas de recommandation sur la base d'estimations
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : « X est l'offre la plus avantageuse » n'est affiché que si
  l'offre de X est complète (ou seulement en attente de confirmation d'une
  correspondance). Sinon, on montre les chiffres et leurs limites.

### PD-008 — Comparaison en HT
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : les comparaisons se font hors taxes ; le TTC reste affiché
  lorsqu'il est connu.
- **Raison** : les entreprises récupèrent la TVA ; les taux sont en
  général identiques entre fournisseurs pour un même produit.
- **À prévoir** : un réglage d'entreprise « non assujetti à la TVA »
  (micro-entrepreneur en franchise) basculera l'affichage en TTC.

### PD-009 — Un écart arithmétique n'est jamais présenté comme une erreur du fournisseur
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : formulation « écart à vérifier » ; notre extraction peut
  être en cause.

### PD-010 — Une offre incomplète n'est jamais présentée comme la moins chère
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : si le total affiché le plus bas appartient à une offre à
  laquelle il manque des articles, on le dit explicitement et on montre le
  total comparable estimé.

### PD-011 — Conditionnement : on compare ce que l'artisan paie réellement pour couvrir son besoin
- **Date** : 2026-09-28 · **Statut** : Décidé (délégué par le fondateur : « mets-toi à ma place »)
- **Décision** : pour chaque besoin, le coût retenu dans le total comparable
  est le **montant réellement facturé** quand la quantité proposée couvre le
  besoin (le conditionnement entier est payé : 2 rouleaux de 47 m² pour
  91 m² demandés = 94 m² payés). Si la quantité proposée est insuffisante,
  on complète au prix unitaire du fournisseur. Le prix unitaire (ramené au
  m², à l'unité…) reste affiché comme information et sert aux comparaisons
  par famille (« 18 % moins cher sur le bardage »).
- **Raison** : l'artisan paie des conditionnements entiers ; un classement
  sur un prix ramené au besoin favoriserait un fournisseur qui lui coûtera
  en réalité plus cher. Le surplus est signalé (« 3 m² en plus »), pas caché.
- **Alternative écartée** : classer sur le prix ramené au besoin (ma
  recommandation initiale « C ») — plus « équitable » en apparence, mais
  décalé de ce qui sort réellement de la trésorerie.
- **Impact** : moteur v0.2.0 (`comparableAmount`), test dédié.

### PD-012 — La mémoire métier est privée par entreprise
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : correspondances validées, alias, historique de prix sont
  propres à chaque entreprise. Aucune mutualisation sans cadre juridique
  explicite et décision de ta part.
- **Conséquence** : la table `PriceRecord` de BatiClair (mutualisée) n'est
  pas reprise ; BatiClair est gelé dans `legacy/baticlair/` (aucun
  utilisateur réel, réponse du fondateur à Q1).

### PD-013 — Pas d'étape obligatoire « créer un chantier »
- **Date** : 2026-09-28 · **Statut** : Proposé
- **Décision** : l'import d'un document propose un chantier (nom déduit du
  document) que l'utilisateur confirme ou renomme.

### PD-014 — Les quantités demandées sont figées au lancement de la consultation
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : la consultation garde un instantané du quantitatif
  validé. Modifier le quantitatif ensuite crée une nouvelle version, sans
  fausser les offres déjà reçues.

### PD-015 — On peut utiliser le produit avant d'avoir vérifié son e-mail
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : l'inscription connecte immédiatement l'utilisateur ; l'e-mail
  de vérification part en parallèle. La vérification sera **exigée avant tout
  envoi vers des tiers** (demandes de prix aux fournisseurs).
- **Raison** : onboarding très court (§67) sans permettre d'écrire à des
  fournisseurs depuis une adresse non prouvée.
- **Impact** : `modules/identity/infrastructure/auth.ts` ; le contrôle
  « e-mail vérifié » sera ajouté au cas d'usage d'envoi (phase 3).

### PD-016 — Deux points de départ : devis ou quantitatif, au choix de l'artisan
- **Date** : 2026-09-28 · **Statut** : Décidé (réponse du fondateur à Q2)
- **Décision** : un seul bouton « Importer un document » ; le type (devis
  client ou quantitatif / liste de matériaux) est détecté automatiquement.
  Chaque ligne extraite est classée `material` (matériau commandable) ou
  `work_item` (ouvrage, ex. « 95 m² couverture ardoise posée »). Au MVP, un
  ouvrage est conservé tel quel et signalé « à préciser en matériaux » ;
  l'artisan complète. Un module de conversion ouvrage → matériaux (ratios
  métier) viendra plus tard, construit à partir de vrais documents.
- **Toujours souhaité** : 10 à 20 documents réels anonymisés pour calibrer
  l'extraction.

### PD-017 — Les demandes de prix partent de la boîte mail de l'artisan
- **Date** : 2026-09-28 · **Statut** : Décidé (réponse du fondateur à Q4)
- **Décision** : connexion Gmail ou Outlook (droit d'envoi uniquement) ;
  réponses reçues à la fois dans sa boîte et dans le logiciel grâce à une
  double adresse de réponse. Détails : ADR-0010.
- **Impact** : la connexion de la boîte mail passe en phase 3.

### PD-018 — Essai gratuit : 30 jours, sans carte bancaire
- **Date** : 2026-09-28 · **Statut** : Décidé par délégation, révisable avant la phase 5
- **Décision** : 30 jours, toutes fonctionnalités, sans carte bancaire ; un
  seul plan payant (hypothèse 19,90 €/mois ou ~199 €/an, montants en
  configuration) ; tous les membres d'une entreprise inclus au lancement ;
  un plafond anti-abus de pages analysées pendant l'essai, invisible en
  usage normal (valeur fixée quand les coûts IA réels seront mesurés).
- **Raison** : une consultation met souvent une à deux semaines à recevoir
  ses réponses ; 14 jours ne laissent pas voir la valeur. Sans carte : moins
  de friction pour des artisans méfiants envers les abonnements.
- **Risque accepté** : taux de conversion plus faible qu'avec carte ; à
  mesurer.

### PD-019 — Conservation des données
- **Date** : 2026-09-28 · **Statut** : Décidé par délégation, à valider juridiquement avant le lancement
- **Décision** : les documents et données sont conservés tant que le compte
  est actif. À la fermeture (ou suppression) : export proposé, puis
  suppression définitive sous 30 jours (sauvegardes comprises, par
  rotation). Le produit n'est **pas** un coffre-fort d'archivage comptable :
  l'artisan reste responsable de ses obligations de conservation de
  factures, ce qui sera dit clairement.

### PD-020 — Jeu de documents d'évaluation fictifs, sans attendre de documents réels
- **Date** : 2026-09-28 · **Statut** : Décidé
- **Décision** : je fabrique un jeu de documents fictifs mais réalistes
  (devis clients, quantitatifs, devis fournisseurs, factures ; PDF propres,
  scans, photos de travers) pour la phase 2. Des documents réels anonymisés
  resteront les bienvenus pour calibrer, mais ne bloquent rien.

### Q6 — Fournisseur IA et hébergement de production
Pas une décision du fondateur : c'est une vérification technique et
contractuelle que je mène (conservation, non-entraînement, région UE, DPA),
documentée dans un ADR avant la moindre donnée réelle. D'ici là : données
fictives uniquement.
