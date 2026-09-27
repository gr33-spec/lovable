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

export interface Guarantor extends Person {
  kind: "personne" | "visale" | "autre";
  /** Montant maximal garanti (principal et accessoires), en euros. */
  maxAmount?: number;
  /** Durée de l'engagement en années (vide = durée du bail et renouvellements, voir acte). */
  durationYears?: number;
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
  notes?: string;
  demo?: boolean;
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

export type WithdrawalKind = "cca" | "salaire" | "dividendes" | "autre";

export interface Withdrawal {
  id: Id;
  kind: WithdrawalKind;
  label?: string;
  companyId?: Id | null;
  /** Montant brut annuel sortant de la société. */
  annualAmount?: number;
  startYear?: number;
  endYear?: number;
  /** Taux de charges / fiscalité saisi manuellement (%). */
  taxRatePct?: number;
  demo?: boolean;
}

// ——— Opérations futures (plans validés ou scénarios) ———

export interface SaleAction {
  id: Id;
  type: "sale";
  buildingId: Id;
  year: number;
  price?: number;
  /** Frais (agence, diagnostics, remboursement anticipé…) en €. */
  fees?: number;
  /** Impôt sur la plus-value saisi manuellement (€). */
  tax?: number;
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
export type ActionType = Action["type"];

export interface Scenario {
  id: Id;
  name: string;
  actions: Action[];
  /** Inclure dans le dossier banque. */
  includeInExport?: boolean;
  appliedAt?: string;
  createdAt?: string;
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
];
