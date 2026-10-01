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

### PD-021 — Un seul geste pour ajouter un document : le bouton +
- **Date** : 2026-09-28 · **Statut** : Décidé (audit global, `ux-audit-2026-09-28.md`)
- **Décision** : le bouton **+** central de la barre remplace les trois
  boutons d'import de l'accueil. Le type (devis client, liste, devis
  fournisseur, facture) est reconnu automatiquement ; ouvert depuis une
  fiche chantier, le document y est rangé.
- **Raison** : un seul emplacement à mémoriser, accessible au pouce depuis
  tous les écrans ; supprime un doublon.

### PD-022 — « Terminé » plutôt qu'« archivé », et une recherche qui voit tout
- **Date** : 2026-09-28 · **Statut** : Décidé (audit global)
- **Décision** : à l'écran, un chantier est « En cours » ou « Terminé »
  (statut technique `archived` inchangé). Une recherche porte sur tous les
  chantiers ; sans recherche, la liste montre les chantiers en cours, du
  plus récemment travaillé au plus ancien.
- **Impact** : API `GET /v1/projects?q=&status=`, tests dédiés.

### PD-023 — Après la comparaison : « Commander chez… », de la façon habituelle de l'artisan
- **Date** : 2026-09-28, révisée le 2026-09-29 · **Statut** : Décidé
  (le fondateur : « la validation de commande peut se faire de plusieurs
  façons : téléphone, e-mail, contact réel… »)
- **Décision** : la comparaison se termine par « Commander chez
  [fournisseur] ». Un seul écran propose trois façons, avec le même
  résultat (le chantier passe à « Commandé ») :
  - **par e-mail** : message d'accord prêt, modifiable, envoyé depuis la
    boîte de l'artisan ;
  - **par téléphone** : appel en un geste, référence et montant affichés
    pendant l'appel, puis « C'est commandé » ;
  - **c'est déjà fait** (comptoir, commercial, site du négoce) : simple
    enregistrement.
  Date de livraison facultative. Option pour remercier les autres
  fournisseurs (message relu avant envoi).
- **Raison** : le logiciel suit la façon de travailler de l'artisan, il ne
  l'impose pas ; ce qui compte est que le chantier sache ce qui est
  commandé, chez qui et quand (base du futur contrôle facture ↔ devis
  accepté).

### PD-024 — Pas de suppression dans le parcours courant
- **Date** : 2026-09-28 · **Statut** : Décidé (audit global)
- **Décision** : un chantier se « marque terminé » (réversible) ; la
  suppression définitive n'existe que dans les réglages, avec confirmation
  explicite. Même principe pour les documents : retirer d'un chantier
  n'est pas détruire.

### PD-025 — MVP réservé aux charpentiers-couvreurs, architecture ouverte aux autres métiers
- **Date** : 2026-09-30 · **Statut** : Décidé (le fondateur)
- **Décision** : règles métier, vocabulaire, unités, matériaux et contrôles
  sont pensés pour la charpente-couverture (tuiles, ardoises, liteaux,
  écrans, zinguerie, bois de charpente). Tout ce qui dépend du métier est
  regroupé dans un **profil métier** (`packages/domain/src/trades/`) : un
  autre corps d'état = un nouveau profil, pas une réécriture.
- **Impact** : chaque document porte son métier (`trade`, `roofing` par
  défaut) ; le routage des pages lit le profil.

### PD-026 — On optimise les coûts IA, jamais au détriment de la précision
- **Date** : 2026-09-30 · **Statut** : Décidé (le fondateur)
- **Décision** : un PDF difficile à lire passe par un traitement plus
  coûteux (image, modèle plus puissant) plutôt que de risquer une erreur
  sur une quantité, une référence, une unité, un prix ou la TVA. Dans le
  doute, la voie la plus sûre ; une valeur incertaine est signalée « à
  vérifier », jamais devinée. Un modèle moins cher n'est adopté que s'il
  égale le plus cher sur l'évaluation de vrais devis de couvreurs.
- **Impact** : routage des pages (une page douteuse part en image) ;
  politique d'extraction par défaut Sonnet 5.5 partout
  (`DEFAULT_EXTRACTION_POLICY`) tant que l'évaluation n'a pas tranché.

### PD-027 — Budget IA : 10 € maximum par artisan et par mois en usage normal
- **Date** : 2026-09-30 · **Statut** : Décidé (prévision interne)
- **Décision** : plafond de prévision 10 €/artisan/mois en usage normal ;
  objectif réel 3 à 6 €. Le coût réel est mesuré appel par appel
  (`ai_execution`) et affiché au propriétaire (Mon compte). Les prix
  d'abonnement seront fixés sur les mesures des premiers artisans, pas
  sur les estimations. Voir `couts-ia.md`.

### PD-028 — Paliers d'abonnement comptés en analyses de documents
- **Date** : 2026-09-30 · **Statut** : Décidé (modèle du fondateur :
  paliers d'analyses mensuelles) ; règles de décompte proposées par le CTO,
  modifiables.
- **Décision** : l'unité facturable est **l'analyse d'un document** (un
  devis client ou un devis fournisseur analysé avec succès). Ne comptent
  pas en plus : les nouvelles tentatives, le passage à un modèle de
  secours, la comparaison, le rapprochement. Un échec ne compte pas. Un
  document déjà analysé n'est jamais décompté deux fois. Le mois de
  décompte est le mois civil à Paris de la première réussite.
- **Plafond** : `company.monthlyAnalysisLimit` (nul = pas de plafond,
  pendant l'essai). Il est vérifié **avant** tout appel IA : au-delà du
  palier, rien n'est dépensé ; les documents déjà analysés restent
  consultables.
- **Suivi** : décompte par entreprise et par utilisateur (celui qui a
  lancé l'analyse), avec appels et coût IA, dans `GET /v1/ai-usage` et
  « Mon compte ».

### PD-029 — Liste de matériaux : l'IA propose, le code vérifie, l'artisan valide
- **Date** : 2026-09-30 · **Statut** : Décidé (demande du fondateur :
  « intégrer l'IA »)
- **Décision** : l'IA (Claude, `AI_EXTRACTION_MODEL`, Sonnet 5.5 par
  défaut) lit le devis client : le texte numéroté des pages propres, et
  seulement les pages douteuses en image (PDF réduit à ces pages). Chaque
  ligne proposée cite ses références « page:ligne ». Le code vérifie que
  ces références existent et que la quantité y figure ; sinon la ligne est
  « à vérifier ». Aucune quantité n'est calculée par l'IA.
- **Validation** : rien n'est utilisable avant que l'artisan ait validé la
  liste ; une ligne sans quantité lisible bloque la validation. Les lignes
  corrigées ou ajoutées par l'artisan font foi.
- **Coûts** : une analyse décomptée par devis (PD-028), vérifiée avant
  l'appel ; chaque tentative (2 au plus) est enregistrée avec son coût.
  Relancer la préparation d'un devis déjà lu ne coûte rien.
- **Panne de lecture locale** : si la lecture du texte échoue pour une
  raison technique (pas un fichier abîmé), l'IA lit le PDF entier.
- **Repli de modèle en cas de refus** : non activé pour l'instant. Un
  refus est rapporté comme un échec (non décompté) ; l'activer demandera
  d'enregistrer le coût au tarif du modèle de repli.
- **Sans clé** (`AI_PROVIDER=disabled`) : l'application le dit, rien
  n'est promis. En test, `AI_PROVIDER=fake` simule l'extraction (interdit
  en ligne).

### PD-030 — Demandes de prix : envoyées depuis la messagerie de l'artisan
- **Date** : 2026-09-30 · **Statut** : Décidé (demande du fondateur :
  « ne cherche pas à automatiser l'envoi tout de suite », « ULTRA SIMPLE »)
- **Décision** : le chantier est le centre. Une fois la liste validée,
  l'artisan coche ses fournisseurs (carnet : société, e-mail, contact,
  téléphone, notes). BatiClair prépare un e-mail par fournisseur ;
  « Envoyer l'e-mail » ouvre sa propre messagerie (lien `mailto:`) et
  marque la demande « Envoyée ». « Copier le texte » et « Déjà envoyé »
  couvrent les autres cas. Aucun e-mail ne part de nos serveurs.
- **Liste figée** : la demande garde une copie de la liste validée
  (matériaux seulement, sans la main-d'œuvre). Modifier la liste ensuite
  ne change pas ce qui a été demandé.
- **Statuts** : à envoyer → envoyée → devis reçu (PDF déposé à la main sur
  la ligne du fournisseur) ; « Pas de réponse » en fin de course. Un même
  PDF ne peut pas être rangé chez deux fournisseurs.
- **Ensuite** : lecture des devis reçus par l'IA et comparaison ligne à
  ligne (lot 3-4), bouton « Classé » avec le ou les fournisseurs retenus.

### PD-031 — Liste de matériaux : chaque doute est vu avant l'envoi
- **Date** : 2026-09-30 · **Statut** : Décidé (retour du fondateur : « si
  l'IA a un doute, l'artisan doit le voir direct »)
- **Décision** : l'IA note son doute sur chaque ligne en une phrase (prompt
  v2), affiché tel quel. Les lignes douteuses passent en tête, avec la
  raison en clair et deux gestes : « C'est bon » (gardée telle quelle) ou
  « Corriger ». La liste ne se valide qu'une fois chaque doute levé.
- **Fiabilité** : trois niveaux en mots, jamais un faux pourcentage :
  Fiable (justifiée par le devis), Doute (IA ou contrôle du code),
  Incomplète (quantité absente). « Vérifiée par vous » après un geste de
  l'artisan.
- **Modifier après validation** : toujours possible ; la liste repasse « à
  valider ». Les demandes de prix déjà préparées gardent leur copie.

### PD-032 — Boussole : une seule boucle, parfaitement réussie
- **Date** : 2026-09-30 · **Statut** : Décidé (charte des trois associés :
  fondateur, Claude en CTO, ChatGPT en associé produit)
- **Boussole** : « BatiClair fait peu de choses, mais les fait tellement
  bien que le couvreur ne veut plus s'en passer. »
- **Règle d'entrée dans le MVP** : une fonctionnalité fait gagner du temps,
  économiser de l'argent ou éviter une erreur au couvreur ; sinon, backlog.
  Pas d'ERP, de CRM ni de planning.
- **La boucle V1** : devis client → quantitatif → validation → consultation
  fournisseurs → réception des devis → analyse → comparaison. Compréhensible
  en moins de 30 secondes ; une information saisie ou extraite une fois
  n'est jamais ressaisie ; le chantier est le centre, avec un fil
  Devis → Matériaux → Fournisseurs → Réponses → Comparer.
- **Cible** : charpentiers-couvreurs uniquement. L'architecture peut prévoir
  d'autres métiers, sans jamais compliquer le MVP.
- **Conséquences immédiates** : onglet Factures retiré du menu, entrées
  « Bientôt » retirées du « + », fil du chantier avec une seule action
  « prochaine étape », liste validée repliée.
- **Backlog** : envoi/réception automatiques des e-mails (attend un nom de
  domaine), factures, étape « Commander », contrôles d'autres métiers.

### PD-033 — Multi-métiers dès la V1 : un moteur, des profils de données
- **Date** : 2026-09-30 · **Statut** : Décidé (remplace la cible « couvreurs
  uniquement » de PD-032 ; la boucle et la règle anti-usine-à-gaz restent)
- **Décision** : une seule application et un seul parcours. Tout ce qui
  change d'un métier à l'autre est de la donnée (`packages/domain/src/trades`) :
  socle commun (main-d'œuvre, fourniture, pages sans matériaux) + un profil
  par métier (familles de matériaux, vocabulaire, unités, contrôles).
- **Métiers au lancement** : couverture-charpente-zinguerie (profil complet,
  déjà éprouvé), maçonnerie, plâtrerie-isolation, peinture, carrelage,
  sols-parquet, électricité, plomberie-chauffage, menuiserie, autre métier.
- **Profils légers** : hors couverture, les familles servent à reconnaître
  les lignes et à guider l'IA (vocabulaire ajouté au prompt v3). Aucun
  contrôle d'unité, de quantité ni d'oubli tant que de vrais devis ne l'ont
  pas validé.
- **Pour l'artisan** : une seule question, « Votre métier » (un ou plusieurs),
  à l'inscription et dans Mon compte. Aucune question par chantier : une
  entreprise multi-métiers lit ses devis avec la fusion de ses profils.
  Les entreprises existantes sont passées en couverture.
- **Ajouter un métier** : écrire un profil et l'ajouter à la liste ; ni
  écran ni parcours à modifier.

### PD-034 — Devis fournisseurs : lus une fois, comparés par le code
- **Date** : 2026-09-30 · **Statut** : Décidé (boucle V1, étapes Réponses → Comparer)
- **Lecture** : « Lire ce devis » : l'IA relève chaque ligne telle qu'imprimée
  (montants recopiés, jamais calculés), sa nature (article, produit remplacé,
  variante, option, frais, consigne) et la ligne demandée à laquelle elle
  répond (sûre / probable / incertaine). 1 analyse décomptée par devis, une
  seule fois ; relire est gratuit.
- **Calculs** : tout est recalculé par le moteur du domaine (montants de
  ligne, remises, totaux, contrôle des totaux imprimés).
- **Comparaison** : coût pour toute la liste, HT, frais compris ; un article
  manquant est estimé au prix médian des autres, jamais compté à zéro ; le
  « moins cher » est signalé avec ses manques. Détail ligne à ligne.
- **L'artisan tranche** : il corrige une correspondance d'un geste (elle
  fait foi), puis « Classé », avec le ou les fournisseurs retenus en option.
- **Architecture** : lecteur IA commun (`platform/ai`) et préparation des
  documents commune (`DocumentAiInput`) pour toutes les lectures.

### PD-035 — Mode démo : tout le parcours, seul, avec des données fictives

- **Pourquoi** : tester BatiClair sans vrai client ni vrai fournisseur (et
  sans nom de domaine pour les e-mails).
- **Quoi** : depuis l'accueil, « Créer un chantier de démonstration » crée un
  chantier fictif avec un devis client de toiture (PDF généré) et ajoute au
  carnet 3 fournisseurs fictifs (adresses `@demo.baticlair.fr`). Sur la fiche
  chantier, « Simuler sa réponse (démo) » établit le devis PDF du fournisseur
  à partir de la liste demandée et le range, comme un dépôt manuel.
- **Réalisme** : prix d'achat courants, un fournisseur facture la livraison,
  un autre oublie un article, totaux justes au centime.
- **Aucune exception dans le parcours** : lecture IA, comparaison et
  décompte des analyses sont les mêmes que pour un vrai chantier. Les données
  fictives se suppriment ou s'archivent comme les autres.
- **Tester sur un vrai chantier** : sous un vrai fournisseur, un lien discret
  « Test : simuler un devis fictif » range un devis établi sur la liste
  demandée, marqué « DEVIS FICTIF (TEST) » (titre et nom de fichier). Il se
  retire comme un autre (« Retirer ce devis ») quand le vrai devis arrive.

### PD-036 — « Lire et comparer » : tous les devis d'un coup, une seule analyse

- **Pourquoi** : un bouton par devis, c'est autant de gestes et d'analyses
  décomptées ; l'artisan veut comparer, pas lire un par un.
- **Quoi** : un seul bouton « Lire et comparer les N devis » au-dessus des
  fournisseurs. L'IA lit en parallèle tous les devis reçus et pas encore
  lus ; la comparaison s'affiche ensuite.
- **Décompte** : le lot compte pour **1 analyse**, quel que soit le nombre
  de devis ; rien n'est décompté si aucun n'a pu être lu. Un devis arrivé
  plus tard, ou qui n'a pas pu être lu, se lit avec un nouvel appui
  (nouveau lot, 1 analyse).
- **Coût réel** : chaque lecture reste mesurée (AiExecution) pour suivre
  la marge ; seul le compteur des paliers change.

### PD-037 — Écran fournisseurs : une action métier, le reste au second plan

- **Boussole** : à chaque étape, l'écran met en avant ce que l'artisan veut
  faire (préparer ma liste, valider ma liste, envoyer mes demandes,
  comparer les offres). Rien de technique n'est montré : pas d'« analyse »,
  d'IA, de lecture devis par devis.
- **Réponses** : un seul bouton « Comparer les N devis » (« … reçus » si un
  fournisseur n'a pas répondu, avec « vous pouvez aussi attendre »). Derrière :
  lecture des seuls devis non lus, réutilisation des autres, rapprochement,
  écarts, puis la comparaison s'ouvre. Un seul devis : « Voir l'offre reçue ».
- **Ordre de l'écran** : action « Comparer », puis la comparaison, puis les
  cartes fournisseurs.
- **Carte fournisseur** : nom, statut (À envoyer, En attente, Devis reçu,
  Comparé, À vérifier, Pas de réponse), une information (« 6/7 articles
  chiffrés · 1 manquant · 1 à vérifier »), et au plus une action d'étape
  (Envoyer l'e-mail, Ajouter son devis). Voir l'e-mail, ouvrir le PDF, voir
  les lignes lues, retirer le devis, relancer… sont dans « ••• ».
- **Fil du chantier** : avec plusieurs devis reçus, « Comparer » passe avant
  « Envoyer la demande » au dernier fournisseur ; ensuite « Choisir mon
  fournisseur ».

### PD-038 — Intuitif : 1 écran = 1 objectif = 1 gros bouton ; formules en chantiers

- **Parcours** : je dépose → je vérifie → j'envoie → je compare → je choisis.
  Actions : Préparer la liste de matériaux, Valider la liste, Envoyer les
  demandes, Comparer les offres, Choisir un fournisseur (dernière étape du
  fil : « Choisir »).
- **Comparaison honnête** : pour chaque fournisseur, le montant réellement
  chiffré ; une offre incomplète affiche « ⚠️ N article(s) manquant(s) » et,
  à part, « Total estimé avec … ». Les offres complètes passent en premier ;
  « Le moins cher » n'est donné qu'à une offre complète (« … des offres
  complètes » si une offre incomplète paraît moins chère). Écarts lisibles :
  quantités différentes, produits différents, points à vérifier, livraison.
- **Choisir** : « Retenir cette offre » sur chaque offre, « Changer d'avis ».
- **Accueil** : « À faire » = la prochaine action réelle de chaque chantier
  (GET /v1/next-actions), sinon « Tout est à jour ».
- **Plus de jargon** : ni IA, ni analyse, ni coûts techniques côté artisan
  (la carte de consommation IA quitte le compte ; l'API reste pour nous).
- **Formules (PD-039 à venir pour le paiement)** : essai gratuit de
  3 chantiers, puis Solo / Pro en chantiers par mois. Catalogue par défaut
  dans le code, remplaçable sans redéployer le code par BILLING_PLANS (JSON).
  La limite ne bloque que la création d'un nouveau chantier — jamais un
  chantier commencé, jamais la démonstration. « Choisir cette formule » note
  la demande (paiement en ligne à venir) ; PLAN_ACTIVATION_CODES permet
  d'activer une formule à la main (tests, premiers clients).

### PD-040 — Bleu de confiance, et le « + » crée un chantier

- **Couleur de marque et d'action : bleu profond #1C3FD1** (blanc dessus :
  7,8:1, AAA). Liens : #1838B4 (9,3:1). Sur fond sombre : #A9C1FF (10,6:1).
  Halo : rgba(28, 63, 209, 0.5). Tout passe par les jetons `accent` de
  `globals.css` : changer la teinte = changer ces 4 lignes.
- **Rôles** : bleu = marque et actions principales ; vert = validé, terminé ;
  ambre = à vérifier ; rouge = erreur ; blanc et gris clair = fonds. Le bleu
  remplace l'orange, il n'ajoute pas de couche visuelle.
- **Boutons** : la variante « primary » est bleue (Préparer, Valider,
  Envoyer, Comparer, Retenir…), comme le bouton du fil du chantier, « C'est
  bon », « Envoyer l'e-mail » et le « + ». Le noir reste pour les états
  sélectionnés (filtres, métiers) et les fonds sombres.
- **« + » central = Nouveau chantier**, sans feuille intermédiaire. Plus de
  « + Nouveau » en double sur la page Chantiers. « Nouveau fournisseur » vit
  dans la page Fournisseurs et dans le choix des fournisseurs d'un chantier.

### PD-041 — Devis fournisseur en PDF ou en photos

- Sous chaque fournisseur : **« Ajouter son devis (PDF ou photos) »**. Un
  devis reçu au comptoir, par SMS ou photographié s'ajoute comme un PDF.
- **Photos** : une par page, 10 au plus, jamais mélangées à un PDF. Le
  téléphone les allège avant l'envoi (JPEG, côté ≤ 2000 px, sous 4 Mo au
  total ; le HEIC de l'iPhone est converti). Le serveur les rassemble en un
  seul PDF (pdf-lib, dates fixes : mêmes photos = même fichier, anti-doublon).
  Ces pages sans texte sont lues par l'IA « en image », sans autre réglage.
- Le dépôt reste possible même si la demande n'est pas marquée envoyée (ou
  si le fournisseur n'avait pas répondu) : **••• → « Ajouter son devis
  reçu »**. Le fournisseur passe alors en « Devis reçu ».

### PD-042 — Le moteur de quantitatif est le cœur de BatiClair

- **Date** : 2026-10-01 · **Statut** : Décidé (le fondateur)
- **Principe** : l'IA comprend → le référentiel connaît → le code calcule →
  l'artisan vérifie simplement. Un devis client décrit des OUVRAGES ;
  BatiClair produit une LISTE D'ACHAT fournisseur (pièces, ml, longueurs,
  rouleaux…).
- **Fiabilité** : aucune valeur sans source (fabricant, DTU, règle validée) ;
  seules les données vérifiées par une personne identifiée servent au
  calcul ; un brouillon (web, IA) attend sa vérification. Trois issues :
  sait → calcule ; doute → UNE question ; ne sait pas → le dit.
- **Marges** : jamais universelles. Sourcées par produit/système, ou réglées
  par l'artisan, toujours affichées dans « Voir le calcul ».
- **Un seul référentiel** pour le quantitatif et la comparaison des offres.
- **Validation** : couverture validée par le fondateur (ancien couvreur) ;
  artisans référents pour les autres métiers ; jeu de vérité (devis →
  quantitatif attendu → commande réelle) pour mesurer la précision avant
  toute promesse publique.
- Détails : `referentiel-metier.md`, `referentiel-exemple-couverture.md`.

### PD-043 — Nourrir le moteur de preuves et de vrais devis

- **Date** : 2026-10-01 · **Statut** : Décidé (le fondateur)
- Pas de nouvelle architecture importante : le moteur est construit ; il
  faut le confronter à des vrais cas et le nourrir de sources.
- **Mesure de réussite** : sur plusieurs vrais devis différents (3 à 5,
  couverture d'abord), combien de lignes deviennent une liste d'achat, et
  avec combien de questions. Banc permanent : `banc-devis-reels.md`.
- **Enrichissement progressif** : un produit rencontré → documentation
  vérifiée → données → tests → réutilisation. Pas de grande base remplie à
  la main avant la bêta. Référentiel en couches, ouvert à une base externe
  sans changer le moteur. Détails : `enrichissement-referentiel.md`.
- Toute donnée non sourcée est retirée, même plausible ; les règles non
  prouvées restent en attente.

### PD-044 — Deux scores séparés : compréhension (A) et quantitatif (B)

- **Date** : 2026-10-01 · **Statut** : Décidé (le fondateur)
- **A — Compréhension documentaire** : BatiClair lit-il correctement ce qui
  est écrit (matériau ou main-d'œuvre, famille, mesure d'ouvrage ou quantité
  d'achat) ?
- **B — Quantitatif exact** : une ligne ne réussit que si la quantité à
  commander est justifiable par une donnée du devis + une règle ou une
  donnée sourcée et vérifiée. « Ouvrage reconnu » ne vaut jamais
  « quantitatif correct ».
- Le banc garde les deux scores, avant/après, par devis, et refuse toute
  régression d'un devis quand un autre métier progresse.
- **Envoi fournisseur** : les articles identiques sont regroupés (le lieu ne
  change pas l'article ; une marque, une gamme ou un lot en titre si). Les
  titres du devis (section) accompagnent chaque ligne ; la rubrique utile
  (hors lieux) part dans la demande de prix. Rien n'est déduit d'un titre.

### PD-045 — Confiance explicable et apprentissage contrôlé

- **Date** : 2026-10-01 · **Statut** : Décidé (le fondateur) — étapes 1 et 2
- **Trois états**, jamais un pourcentage : ✓ vérifié (assez d'éléments
  ÉTABLIS pour produire la ligne sans l'artisan — pas « plus de question »),
  ⚠ à confirmer (un doute qui change la commande, tranché en un geste),
  ? information manquante (BatiClair n'invente pas). Ils découlent de
  critères explicites : lecture, ouvrage, produit, caractéristique fabricant,
  règle, données chantier, cohérence, conditionnement.
- Un doute sans effet sur la commande ne dérange pas l'artisan. Le
  conditionnement est demandé au fournisseur, jamais à l'artisan, mais reste
  dans le raisonnement (risque de comparaison entre fournisseurs).
- **Quatre origines, jamais mélangées** : lu dans le devis · BatiClair sait
  (référentiel vérifié) · votre entreprise utilise (préférence) · choisi pour
  ce chantier. Deux lignes ✓ peuvent avoir des origines différentes.
- **Mémoire de l'entreprise** : un choix, jamais une donnée fabricant ; propre
  à une entreprise ; jamais appliquée si elle est incompatible avec le
  référentiel (la vérification normale reprend). En essai, ancienne ou
  contredite : proposée en une question, jamais appliquée en silence.
- **Politiques par type** (paramètres EXPÉRIMENTAUX de bêta, modifiables sans
  toucher au code) : fournisseur et appellation interne établis dès 1
  chantier ; produit, marque, conditionnement après 2 chantiers ; marge jamais
  apprise (réglage explicite) ; reproposée après 365 jours sans confirmation.
- **Journal des corrections** : ajouté, jamais réécrit ; avant, après, extrait
  du devis, contexte, cause déduite, empreinte anonyme pour compter plus tard
  des corrections similaires entre entreprises. Ne modifie jamais le
  référentiel général. Détails : `confiance-et-apprentissage.md`.


### PD-046 — Lecture des gros devis : un appel normalement, des blocs seulement si nécessaire (2026-10-01)

Validée par le fondateur après l'audit simplicité / coût. Principe inchangé :
**une lecture IA du devis, puis tout le reste en code**.

- **Réponse compacte (prompt v7)** : chaque suite de titres n'est écrite
  qu'une fois (les lignes y renvoient par son numéro), une seule liste de
  sources par ligne, noms de champ courts. Même information, environ 40 % de
  réponse en moins sur Morellec.
- **Plan de lecture décidé avant tout appel, sans IA** : si la réponse
  attendue (estimation haute) tient largement dans la limite d'un appel
  (9 000 tokens sur 16 000), un seul appel, comme avant. Sinon, blocs de
  pages consécutives de tailles voisines, lus en parallèle. Chaque bloc voit
  toutes les pages qui le précèdent (titres en cours) et la page suivante
  (ligne coupée), mais ne liste que ses pages. L'artisan ne choisit rien.
- **Réunion déterministe** : une ligne appartient au bloc de la page où elle
  commence ; une ligne lue dans le contexte d'un autre bloc, ou qui reprend
  une référence déjà retenue, est écartée ; l'ordre est celui des pages.
- **Jamais la même demande deux fois** : une réponse coupée (ou trop longue à
  venir) fait relire le bloc en deux moitiés ; une page seule trop dense
  échoue net. Une seule relance, seulement pour une réponse mal formée ou une
  panne passagère. Même règle pour les devis fournisseurs (sans découpage).
- **Garde-fou** : le coût estimé avant lecture est comparé à
  `AI_ANALYSIS_MAX_EUR` (3 € par défaut, environ 5 fois un devis de 500
  lignes scanné) ; au-delà, le document n'est pas un devis normal (catalogue,
  annexes) et n'est pas envoyé. Appels plafonnés à 12 par analyse.
- **Tests permanents** : devis synthétiques de 300 et 500 lignes (texte et
  scan, IA simulée qui désobéit parfois), Morellec en 9 pages scannées,
  bout en bout sur vrai PDF avec service IA simulé. Rapport généré :
  `lecture-gros-devis.md`.
- **Limites connues** : sur une page image, un reliquat de ligne coupée relu
  à tort par le bloc suivant ne se distingue pas d'une vraie ligne (pas de
  numéro de ligne) ; fichiers limités à 4 Mo ; les devis fournisseurs ne sont
  pas encore découpés.
