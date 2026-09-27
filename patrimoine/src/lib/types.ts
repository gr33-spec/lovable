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
  /** Valeurs estimées passées, une par année (historique). */
  valueHistory?: ValuePoint[];
  demo?: boolean;
}

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
  /** Montant réellement encaissé (paiement partiel). */
  paid?: number;
  note?: string;
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
];
