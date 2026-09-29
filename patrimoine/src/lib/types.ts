import type { SavedAnalysis } from "./analysis/types";

// Modèle de données de l'application. Tous les champs chiffrés sont
// optionnels : l'application doit fonctionner avec des données partielles.

export type Id = string;

export type CompanyKind = "holding" | "SCI" | "SC" | "SARL" | "SAS" | "autre";

export interface Partner {
  name: string;
  pct?: number;
}

export interface Company {
  id: Id;
  name: string;
  kind: CompanyKind;
  /** Société mère (holding) éventuelle. */
  parentId?: Id | null;
  /** Pourcentage détenu par la société mère. */
  ownershipPct?: number;
  partners?: Partner[];
  /** Trésorerie disponible (€). */
  cash?: number;
  /** Comptes courants d'associés (€). */
  partnerAccounts?: number;
  /** Régime / fiscalité, texte libre. */
  taxRegime?: string;
  /** Capital social (€) : sert au calcul des dividendes soumis aux cotisations TNS. */
  shareCapital?: number;
  /** Société d'exploitation : chiffre d'affaires et charges. */
  activity?: CompanyActivity;
  // ——— Bailleur (baux, états des lieux, quittances) ———
  /** Adresse du siège social. */
  address?: string;
  siren?: string;
  /** Représentant légal (gérant). */
  representative?: string;
  representativeRole?: string;
  email?: string;
  phone?: string;
  /** SCI constituée exclusivement entre parents et alliés jusqu'au 4e degré (bail de 3 ans possible). */
  familySci?: boolean;
  notes?: string;
  demo?: boolean;
}

export type Condition = "neuf" | "bon" | "correct" | "a_renover";

export interface Building {
  id: Id;
  name: string;
  companyId?: Id | null;
  address?: string;
  city?: string;
  /** Date d'acquisition au format AAAA-MM-JJ. */
  acquisitionDate?: string;
  acquisitionPrice?: number;
  /** "manual" : valeur saisie ; "surface" : surface × prix au m². */
  valueMode?: "manual" | "surface";
  value?: number;
  surface?: number;
  pricePerSqm?: number;
  lotsCount?: number;
  /** Loyer mensuel global, utilisé si aucun logement n'a de loyer. */
  rentMonthly?: number;
  /** Charges annuelles. */
  propertyTax?: number;
  insurance?: number;
  accounting?: number;
  otherCharges?: number;
  condition?: Condition;
  recentWorks?: string;
  plannedWorks?: string;
  notes?: string;
  // ——— Informations reprises dans les baux ———
  /** Commune en zone tendue (art. 17 loi 89-462). */
  zoneTendue?: boolean;
  /** Loyers encadrés (loyer de référence), cas particulier des zones tendues. */
  rentControl?: boolean;
  legalRegime?: "copropriete" | "monopropriete";
  constructionPeriod?: ConstructionPeriod;
  /** Équipements et services communs (ascenseur, local vélos…). */
  commonFacilities?: string;
  /** Valeurs estimées passées, une par année (historique). */
  valueHistory?: ValuePoint[];
  demo?: boolean;
}

export type ConstructionPeriod = "avant_1949" | "1949_1974" | "1975_1989" | "1990_2005" | "apres_2005";

export interface ValuePoint {
  year: number;
  value: number;
  note?: string;
}

export type UnitType = "studio" | "T1" | "T2" | "T3" | "T4" | "T5+" | "commerce" | "bureau" | "parking" | "autre";

export interface Unit {
  id: Id;
  buildingId: Id;
  name: string;
  type?: UnitType;
  surface?: number;
  /** Loyer mensuel hors charges. */
  rent?: number;
  /** Provision mensuelle sur charges (récupérable, non comptée dans le rendement). */
  charges?: number;
  status?: "occupe" | "vacant";
  tenantLastName?: string;
  tenantFirstName?: string;
  entryDate?: string;
  condition?: Condition;
  plannedWorks?: string;
  value?: number;
  // ——— Description reprise dans le bail ———
  floor?: string;
  door?: string;
  /** Nombre de pièces principales. */
  mainRooms?: number;
  habitatType?: "collectif" | "individuel";
  heating?: "individuel" | "collectif";
  heatingEnergy?: string;
  hotWater?: "individuel" | "collectif";
  hotWaterEnergy?: string;
  /** Équipements du logement (cuisine équipée, sanitaires…). */
  equipments?: string;
  /** Locaux et équipements accessoires à usage privatif (cave, parking…). */
  accessories?: string;
  dpeClass?: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  /** Montant estimé des dépenses annuelles d'énergie (bas et haut de fourchette) et année de référence. */
  energyCostMin?: number;
  energyCostMax?: number;
  energyCostYear?: number;
  /** Pièces pour l'état des lieux (reprises d'un état des lieux à l'autre). */
  rooms?: string[];
  // ——— Bail ———
  leaseType?: LeaseType;
  /** Date de prise d'effet du bail (AAAA-MM-JJ). */
  leaseStart?: string;
  /** Durée du bail en années (renouvellement tacite pour la même durée). */
  leaseDurationYears?: number;
  /** Date de fin saisie directement (prioritaire sur début + durée). */
  leaseEnd?: string;
  /** Révision du loyer : annuelle (par défaut), triennale ou aucune. */
  revision?: "annuelle" | "triennale" | "aucune";
  /** Indice de référence du loyer actuel, saisi manuellement (ex. « IRL T2 2025 »). */
  indexLabel?: string;
  indexValue?: number;
  /** Date de la dernière révision appliquée (ou ignorée). */
  lastRevisionDate?: string;
  rentHistory?: RentChange[];
  /** Pointage des encaissements, clé « AAAA-MM ». */
  payments?: Record<string, RentPayment>;
  demo?: boolean;
}

export type LeaseType = "nue" | "meuble" | "commercial" | "professionnel" | "autre";

export interface RentChange {
  date: string;
  rent: number;
  previousRent?: number;
  indexLabel?: string;
  indexValue?: number;
  /** Révision : indice de comparaison (un an avant) et date prévue au bail, pour régénérer le courrier. */
  referenceLabel?: string;
  referenceValue?: number;
  dueDate?: string;
  note?: string;
}

export interface RentPayment {
  status: "paye" | "impaye" | "partiel";
  /** Montant attendu (loyer + charges) au moment du pointage. */
  due?: number;
  /** Détail du montant attendu : loyer hors charges et charges. */
  rent?: number;
  charges?: number;
  /** Date d'encaissement (AAAA-MM-JJ). */
  paidDate?: string;
  /** Bail concerné. */
  tenancyId?: string;
  /** Montant réellement encaissé (paiement partiel). */
  paid?: number;
  note?: string;
}

// ——— Gestion locative ———

export interface Person {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthPlace?: string;
  email?: string;
  phone?: string;
  /** Adresse (garant, ou nouvelle adresse du locataire après son départ). */
  address?: string;
}

export interface TenancyLetter {
  id: Id;
  kind: "revision" | "relance" | "mise_en_demeure" | "autre";
  label: string;
  /** Date du courrier (AAAA-MM-JJ). */
  date: string;
  file: StoredFileRef;
}

/** Fichier déposé (PDF ou photo), stocké côté serveur. */
export interface StoredFileRef {
  fileId: string;
  name: string;
  uploadedAt?: string;
}

export interface Guarantor extends Person {
  /** Acte de cautionnement signé (scan). */
  signedFile?: StoredFileRef;
  kind: "personne" | "visale" | "autre";
  /** Montant maximal garanti (principal et accessoires), en euros. */
  maxAmount?: number;
  /** Durée de l'engagement en années (si différente de la durée du bail). */
  durationYears?: number;
  /** Engagement pour toute la durée du bail (tant que le bail court). */
  wholeLease?: boolean;
  /** Montant mensuel garanti (loyer + charges). */
  monthlyAmount?: number;
  visaNumber?: string;
}

export interface Deduction {
  id: string;
  label: string;
  amount?: number;
  kind: "degradation" | "loyers" | "charges" | "autre";
  /** Justificatif (devis, facture…). */
  justification?: string;
}

export type TenancyStatus = "brouillon" | "actif" | "sortie" | "clos";

export interface Tenancy {
  id: Id;
  unitId: Id;
  status: TenancyStatus;
  tenants: Person[];
  guarantors?: Guarantor[];
  /** Date de signature (détermine le modèle de bail applicable). */
  signDate?: string;
  signPlace?: string;
  startDate?: string;
  durationYears?: number;
  /** Loyer mensuel hors charges. */
  rent?: number;
  /** Charges mensuelles. */
  charges?: number;
  chargesMode?: "provision" | "forfait";
  /** Jour de paiement dans le mois. */
  paymentDay?: number;
  paymentTerm?: "a_echoir" | "echu";
  paymentMethod?: string;
  deposit?: number;
  // Révision
  indexLabel?: string;
  indexValue?: number;
  /** Indice repris automatiquement de l'INSEE (mis à jour avec la date de signature). */
  indexAuto?: boolean;
  // Zone tendue
  referenceRent?: number;
  referenceRentMax?: number;
  rentSupplement?: number;
  rentSupplementReason?: string;
  previousTenantRent?: number;
  previousTenantRentDate?: string;
  previousRevisionDate?: string;
  // Travaux
  worksSinceLastLease?: string;
  worksAmount?: number;
  worksPlanned?: string;
  // Clauses résolutoires facultatives (modèle 2026)
  clauseInsurance?: boolean;
  clauseNeighbours?: boolean;
  clauseMainResidence?: boolean;
  specialConditions?: string;
  /** Annexes jointes (identifiants de la liste légale). */
  annexes?: string[];
  /** Bail existant saisi a posteriori (non généré par l'application). */
  imported?: boolean;
  /** Exemplaire signé du bail (scan), remplacé à chaque nouveau dépôt. */
  signedLease?: StoredFileRef;
  /** Courriers joints (augmentation de loyer, relance…), gardés tant que le locataire est en place. */
  letters?: TenancyLetter[];
  // ——— Départ ———
  noticeDate?: string;
  noticeBy?: "locataire" | "bailleur";
  endDate?: string;
  keysReturnedDate?: string;
  deductions?: Deduction[];
  depositReturnedDate?: string;
  depositReturnedAmount?: number;
  closedAt?: string;
  signatures?: Signatures;
  createdAt?: string;
  notes?: string;
}

export interface Signatures {
  /** Images PNG (data URL) de signatures manuscrites numérisées. */
  landlord?: string;
  tenants?: (string | undefined)[];
  signedAt?: string;
}

export type ItemState = "neuf" | "bon" | "usage" | "mauvais" | "absent";

export interface InspectionItem {
  id: string;
  name: string;
  state?: ItemState;
  note?: string;
  /** Identifiants de photos (stockées côté serveur). */
  photos?: string[];
}

export interface InspectionRoom {
  id: string;
  name: string;
  items: InspectionItem[];
  note?: string;
}

export interface MeterReading {
  id: string;
  kind: string;
  number?: string;
  value?: string;
}

export interface KeyItem {
  id: string;
  kind: string;
  count?: number;
}

export interface Inspection {
  id: Id;
  tenancyId: Id;
  unitId: Id;
  kind: "entree" | "sortie";
  date?: string;
  rooms: InspectionRoom[];
  meters: MeterReading[];
  keys: KeyItem[];
  heating?: string;
  hotWater?: string;
  observations?: string;
  /** État des lieux d'entrée de référence (pour une sortie). */
  entryId?: Id;
  signatures?: Signatures;
  completedAt?: string;
}

export interface Loan {
  id: Id;
  name?: string;
  bank?: string;
  /** Rattachement : immeuble (prioritaire) ou société. */
  buildingId?: Id | null;
  companyId?: Id | null;
  kind?: "amortissable" | "in_fine";
  initialAmount?: number;
  /** Capital restant dû connu… */
  remaining?: number;
  /** …à cette date (AAAA-MM-JJ). Par défaut : aujourd'hui. */
  remainingDate?: string;
  startDate?: string;
  endDate?: string;
  /** Mensualité hors assurance. */
  monthlyPayment?: number;
  /** Taux annuel nominal en %. */
  ratePct?: number;
  /** Assurance mensuelle. */
  insuranceMonthly?: number;
  durationMonths?: number;
  /** Numéro ou référence du prêt chez la banque. */
  reference?: string;
  notes?: string;
  /** Tableau d'amortissement de la banque : quand il est présent, il fait foi pour tous les calculs. */
  schedule?: LoanSchedule;
  demo?: boolean;
}

/** Une échéance du tableau d'amortissement. */
export interface LoanScheduleRow {
  /** Mois de l'échéance (AAAA-MM). */
  month: string;
  /** Échéance hors assurance (capital + intérêts). */
  payment: number;
  interest: number;
  principal: number;
  insurance?: number;
  /** Capital restant dû après l'échéance. */
  balance: number;
}

export interface LoanSchedule {
  rows: LoanScheduleRow[];
  /** PDF ou photo d'origine (conservé pour consultation). */
  fileId?: string;
  fileName?: string;
  importedAt: string;
  source: "ia" | "manuel";
  /** Informations imprimées sur le document (en-tête du tableau), telles quelles. */
  meta?: ScheduleMeta;
}

/** En-tête d'un tableau d'amortissement : ce que la banque y indique. */
export interface ScheduleMeta {
  borrower?: string;
  bank?: string;
  /** Numéro ou référence du prêt. */
  reference?: string;
  /** Adresse du bien financé. */
  address?: string;
  initialAmount?: number;
  /** Date de début (déblocage ou signature), AAAA-MM-JJ. */
  startDate?: string;
  durationMonths?: number;
  /** Taux nominal annuel en %. */
  ratePct?: number;
}

export type WorkStatus = "envisage" | "prevu" | "en_cours" | "termine";
export type Priority = "basse" | "normale" | "haute";

export interface Work {
  id: Id;
  label: string;
  amount?: number;
  year?: number;
  companyId?: Id | null;
  buildingId?: Id | null;
  unitId?: Id | null;
  priority?: Priority;
  status?: WorkStatus;
  /** Payés par un crédit : pas de sortie de trésorerie dans les projections. */
  financedByLoan?: boolean;
  notes?: string;
  demo?: boolean;
}

export interface LifeEvent {
  id: Id;
  year: number;
  label: string;
  companyId?: Id | null;
  amount?: number;
  demo?: boolean;
}

/**
 * Nature d'une sortie d'argent :
 * - tns : rémunération de gérant majoritaire (SARL/EURL), travailleur non salarié ;
 * - salaire : dirigeant assimilé salarié (président de SAS, gérant minoritaire) ;
 * - dividendes, cca (remboursement de compte courant), autre.
 */
export type WithdrawalKind = "tns" | "salaire" | "dividendes" | "cca" | "autre";

export interface Withdrawal {
  id: Id;
  kind: WithdrawalKind;
  label?: string;
  /** Bénéficiaire (ex. « Grégory », « Enora »). */
  person?: string;
  companyId?: Id | null;
  /**
   * Montant annuel sortant de la société : coût total pour la société
   * (rémunération + cotisations) pour tns / salaire, montant brut pour
   * dividendes, montant remboursé pour cca.
   */
  annualAmount?: number;
  startYear?: number;
  endYear?: number;
  /** Évolution annuelle du montant (%). */
  growthPct?: number;
  /** Dividendes : prélèvement forfaitaire unique (par défaut) ou barème progressif. */
  dividendTax?: "pfu" | "bareme";
  /** Dividendes d'une SARL versés à son gérant majoritaire (part > 10 % soumise aux cotisations TNS). */
  majorityManager?: boolean;
  /** « Autre » : taux de charges / fiscalité saisi manuellement (%). */
  taxRatePct?: number;
  demo?: boolean;
}

/** Foyer fiscal et hypothèses de la rémunération. */
export interface Household {
  /** Nombre de parts de quotient familial. */
  parts?: number;
  /** Imposition commune (mariés ou pacsés). */
  couple?: boolean;
  /** Autres revenus nets imposables du foyer (€/an), hors sources saisies ici. */
  otherIncome?: number;
  /** Stratégie de rémunération expliquée au banquier. */
  strategy?: string;
  /** Hypothèses modifiables (en %). Vides = barèmes 2026 intégrés. */
  salaryEmployeePct?: number;
  salaryEmployerPct?: number;
  dividendSocialPct?: number;
  pfuIncomePct?: number;
}

/** Activité d'une société d'exploitation (SARL de bâtiment, SAS…). */
export interface CompanyActivity {
  /** Chiffre d'affaires annuel hors taxes. */
  revenue?: number;
  /** Charges annuelles hors rémunération des dirigeants (achats, sous-traitance, frais…). */
  expenses?: number;
  /** Évolution annuelle du chiffre d'affaires et des charges (%). */
  growthPct?: number;
  /** Prestations facturées aux sociétés du groupe (€/an, incluses dans le chiffre d'affaires). */
  billed?: { companyId: Id; annualAmount?: number }[];
}

// ——— Opérations futures (plans validés ou scénarios) ———

export interface SaleLot {
  unitId: Id;
  /** Prix de vente du lot (€). */
  price?: number;
}

export interface SaleAction {
  id: Id;
  type: "sale";
  buildingId: Id;
  year: number;
  /** Date prévue de l'acte (AAAA-MM-JJ), prioritaire sur l'année. */
  date?: string;
  /** Prix de l'immeuble entier (vente en bloc). */
  price?: number;
  /** Vente lot par lot : lots vendus et prix de chacun (absent = tout l'immeuble). */
  lots?: SaleLot[];
  /** Frais (agence, diagnostics, indemnités de remboursement anticipé…) en €. */
  fees?: number;
  /** Impôt sur la plus-value saisi manuellement (€). */
  tax?: number;
  /** Capital remboursé sur les crédits de l'immeuble (vente partielle ; par défaut la quote-part des lots). */
  debtRepaid?: number;
  /** Compromis signé (information pour le dossier). */
  underOffer?: boolean;
}

export interface PurchaseAction {
  id: Id;
  type: "purchase";
  name: string;
  companyId?: Id | null;
  year: number;
  price?: number;
  /** Frais d'acquisition (€). */
  fees?: number;
  loanAmount?: number;
  ratePct?: number;
  durationYears?: number;
  rentMonthly?: number;
  /** Charges annuelles. */
  chargesAnnual?: number;
}

export interface RefinanceAction {
  id: Id;
  type: "refinance";
  year: number;
  /** Crédits remboursés par le refinancement. */
  loanIds: Id[];
  companyId?: Id | null;
  buildingId?: Id | null;
  amount?: number;
  ratePct?: number;
  durationYears?: number;
  fees?: number;
}

export interface WorksAction {
  id: Id;
  type: "works";
  label: string;
  year: number;
  amount?: number;
  companyId?: Id | null;
  buildingId?: Id | null;
}

export interface PrepaymentAction {
  id: Id;
  type: "prepayment";
  loanId: Id;
  year: number;
  amount?: number;
  /** Réduire la durée (mensualité identique) ou la mensualité (durée identique). */
  mode?: "duree" | "mensualite";
}

export type Action = SaleAction | PurchaseAction | RefinanceAction | WorksAction | PrepaymentAction;

export interface Scenario {
  id: Id;
  name: string;
  actions: Action[];
  /** Inclure dans le dossier banque. */
  includeInExport?: boolean;
  appliedAt?: string;
  createdAt?: string;
}

// ——— Projets (acquisition, travaux) à présenter à la banque ———

export type ProjectStatus = "idee" | "etude" | "soumis" | "accorde" | "realise" | "abandonne";
export type PropertyType = "immeuble" | "appartement" | "maison" | "local" | "terrain" | "autre";

export interface ProjectLot {
  id: Id;
  name: string;
  type?: UnitType;
  surface?: number;
  /** Loyer mensuel prévu hors charges. */
  rent?: number;
  /** Provision sur charges mensuelle prévue (récupérable). */
  charges?: number;
}

/** Poste de dépense : travaux (avec devis) ou autre frais. */
export interface ProjectCost {
  id: Id;
  label: string;
  kind: "travaux" | "frais";
  amount?: number;
  /** Devis joint (fichier stocké côté serveur). */
  fileId?: string;
  fileName?: string;
}

export interface ProjectLoan {
  id: Id;
  label?: string;
  bank?: string;
  amount?: number;
  ratePct?: number;
  durationMonths?: number;
  /** Différé d'amortissement (intérêts seuls), en mois. */
  deferralMonths?: number;
  insuranceMonthly?: number;
  /** Tableau d'amortissement de l'offre de prêt : il fait foi et devient celui du crédit à la réalisation. */
  schedule?: LoanSchedule;
}

export interface ProjectDocument {
  id: Id;
  fileId: string;
  name: string;
  mime?: string;
}

export interface Project {
  id: Id;
  name: string;
  /** Achat d'un bien, ou travaux sur un immeuble déjà détenu. */
  kind: "acquisition" | "travaux";
  status: ProjectStatus;
  createdAt?: string;
  /** Immeuble concerné (projet de travaux). */
  buildingId?: Id | null;
  /** Hausse de loyers attendue après travaux (€/mois), en plus des lots ajoutés. */
  extraRentMonthly?: number;
  // ——— Le bien ———
  propertyType?: PropertyType;
  address?: string;
  city?: string;
  surface?: number;
  condition?: Condition;
  dpeClass?: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  constructionPeriod?: ConstructionPeriod;
  legalRegime?: "copropriete" | "monopropriete";
  description?: string;
  lots: ProjectLot[];
  documents?: ProjectDocument[];
  // ——— Coût ———
  price?: number;
  agencyFees?: number;
  /** Taux de frais de notaire saisi par l'utilisateur (aucun taux imposé). */
  notaryFeesPct?: number;
  /** Montant de frais de notaire connu (prioritaire sur le taux). */
  notaryFees?: number;
  /** Frais de dossier, garantie, courtage. */
  bankFees?: number;
  costs: ProjectCost[];
  /** Valeur estimée du bien une fois les travaux faits. */
  valueAfterWorks?: number;
  // ——— Financement ———
  equity?: number;
  /** Provenance de l'apport (texte libre : trésorerie SCI, compte courant…). */
  equitySource?: string;
  loans: ProjectLoan[];
  // ——— Exploitation ———
  /** Date d'acte prévue. */
  purchaseDate?: string;
  /** Mise en location prévue (après travaux). */
  rentStartDate?: string;
  propertyTax?: number;
  insurance?: number;
  coproCharges?: number;
  otherCharges?: number;
  /** Vacance locative prudente, en % des loyers. */
  vacancyPct?: number;
  // ——— Structure ———
  /** Société qui achète ; absente = nouvelle société (voir newCompanyName) ou détention en direct. */
  companyId?: Id | null;
  newCompanyName?: string;
  newCompanyParentId?: Id | null;
  // ——— Banque ———
  /** Objet de la demande, présenté en tête du dossier. */
  requestPurpose?: string;
  submittedTo?: string;
  submittedDate?: string;
  /** Prendre ce projet en compte dans les projections (accueil, chronologie). */
  inProjection?: boolean;
  notes?: string;
  // ——— Réalisation ———
  realizedAt?: string;
  realizedBuildingId?: Id;
  realizedCompanyId?: Id;
  realizedLoanIds?: Id[];
}

// ——— Comptes annuels (bilans) ———

/** Chiffres clés d'un exercice. Tous facultatifs : null/undefined = non renseigné. */
export interface StatementFigures {
  // Compte de résultat
  revenue?: number; // chiffre d'affaires / loyers facturés
  otherIncome?: number;
  externalCharges?: number;
  taxes?: number; // impôts et taxes (taxe foncière…)
  depreciation?: number; // dotations aux amortissements
  operatingResult?: number;
  financialCharges?: number; // intérêts d'emprunts
  exceptionalResult?: number;
  corporateTax?: number;
  netResult?: number;
  // Bilan
  fixedAssetsGross?: number;
  fixedAssetsNet?: number;
  cash?: number; // disponibilités
  totalAssets?: number;
  equity?: number; // capitaux propres
  shareCapital?: number;
  bankDebt?: number; // emprunts auprès des établissements de crédit
  partnerAccounts?: number; // comptes courants d'associés
  otherDebts?: number;
}

export interface Statement {
  id: Id;
  companyId: Id;
  /** Année de clôture de l'exercice. */
  year: number;
  closingDate?: string;
  durationMonths?: number;
  figures: StatementFigures;
  source: "ia" | "manuel";
  fileId?: string;
  fileName?: string;
  /** Points d'attention relevés lors de l'analyse. */
  aiNotes?: string[];
  confidence?: "haute" | "moyenne" | "faible";
  notes?: string;
  createdAt?: string;
}

export interface Settings {
  onboardingDone?: boolean;
  groupName?: string;
  /** Hypothèses de projection, en % par an. */
  valueGrowthPct?: number;
  rentGrowthPct?: number;
  chargesGrowthPct?: number;
  ownerName?: string;
  /** Rappels marqués comme traités (identifiant incluant l'échéance). */
  dismissedReminders?: string[];
  /** Durée des nouveaux baux, en années (choix du propriétaire, 3 par défaut). */
  leaseYears?: number;
  /** Foyer fiscal et hypothèses de rémunération. */
  household?: Household;
  /** Dernières analyses IA du patrimoine (5 au plus), jamais visibles de l'espace gestion. */
  analyses?: SavedAnalysis[];
  /** Couleur principale de l'application (voir lib/theme.ts), teal par défaut. */
  theme?: string;
}

export interface AppData {
  schemaVersion: 1;
  settings: Settings;
  companies: Company[];
  buildings: Building[];
  units: Unit[];
  loans: Loan[];
  works: Work[];
  events: LifeEvent[];
  withdrawals: Withdrawal[];
  /** Opérations futures validées (intégrées aux données réelles). */
  plans: Action[];
  scenarios: Scenario[];
  statements: Statement[];
  tenancies: Tenancy[];
  inspections: Inspection[];
  projects: Project[];
  /** Pièces déposées sans emplacement dédié (assurance, facture, diagnostic…). */
  documents: AppDocument[];
}

// ——— Documents ———

export type DocCategory =
  | "bail"
  | "caution"
  | "etat_des_lieux"
  | "courrier"
  | "identite"
  | "tableau_amortissement"
  | "offre_pret"
  | "banque"
  | "assurance"
  | "facture"
  | "devis"
  | "diagnostic"
  | "acte"
  | "fiscal"
  | "copropriete"
  | "bilan"
  | "autre";

/**
 * Pièce déposée qui n'a pas d'emplacement dédié ailleurs. Les baux signés,
 * cautions, courriers, tableaux d'amortissement, bilans et pièces de projet
 * restent à leur place : la bibliothèque les réunit sans les copier.
 */
export interface AppDocument {
  id: Id;
  fileId: string;
  name: string;
  category: DocCategory;
  /** Titre lisible (« Assurance PNO 2026 »). */
  title?: string;
  /** Date du document (AAAA-MM-JJ). */
  date?: string;
  companyId?: Id | null;
  buildingId?: Id | null;
  unitId?: Id | null;
  tenancyId?: Id | null;
  loanId?: Id | null;
  /** Résumé et mots-clés lus dans le document (recherche). */
  summary?: string;
  addedAt: string;
  source: "ia" | "manuel";
}

export type Collection = Exclude<keyof AppData, "schemaVersion" | "settings">;

export function emptyData(): AppData {
  return {
    schemaVersion: 1,
    settings: {},
    companies: [],
    buildings: [],
    units: [],
    loans: [],
    works: [],
    events: [],
    withdrawals: [],
    plans: [],
    scenarios: [],
    statements: [],
    tenancies: [],
    inspections: [],
    projects: [],
    documents: [],
  };
}

export const COLLECTIONS: Collection[] = [
  "companies",
  "buildings",
  "units",
  "loans",
  "works",
  "events",
  "withdrawals",
  "plans",
  "scenarios",
  "statements",
  "tenancies",
  "inspections",
  "projects",
  "documents",
];
