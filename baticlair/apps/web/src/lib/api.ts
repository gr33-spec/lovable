import { errorMessage } from "./fr";

/**
 * Accès à l'API. Toutes les requêtes passent par /v1 sur la même adresse
 * que le site (relais configuré dans next.config.ts).
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly supportId?: string,
    readonly details?: { path: string; message: string }[],
    /** Motif précis, quand l'API en donne un (ex. document illisible : « encrypted »). */
    readonly reason?: string,
  ) {
    super(errorMessage(code, reason));
    this.name = "ApiError";
  }

  get retryable(): boolean {
    return this.code === "network" || this.status >= 500 || this.code === "request_in_progress";
  }
}

const COMPANY_KEY = "baticlair.companyId";

export function getActiveCompanyId(): string | null {
  try {
    return localStorage.getItem(COMPANY_KEY);
  } catch {
    return null;
  }
}

export function setActiveCompanyId(id: string | null): void {
  try {
    if (id) localStorage.setItem(COMPANY_KEY, id);
    else localStorage.removeItem(COMPANY_KEY);
  } catch {
    /* navigation privée : on se passe de mémorisation */
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Objet envoyé en JSON, ou formulaire (envoi de fichier). */
  body?: unknown;
  /**
   * Clé de l'action utilisateur : un double appui ou une nouvelle tentative
   * avec la même clé ne crée jamais deux fois la même chose.
   */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers["content-type"] = "application/json";
  if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;
  const companyId = getActiveCompanyId();
  if (companyId && !path.startsWith("/v1/auth")) headers["x-company-id"] = companyId;

  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      credentials: "same-origin",
      ...(options.body !== undefined ? { body: isForm ? (options.body as FormData) : JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("network", 0);
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (res.ok) return data as T;

  // Deux formats : l'API métier ({ error: { code } }) et l'authentification ({ code }).
  const body = (data ?? {}) as { error?: { code?: string; supportId?: string; details?: unknown }; code?: string };
  const code = body.error?.code ?? body.code ?? (res.status >= 500 ? "internal_error" : "validation_failed");
  const details = body.error?.details;
  const fieldErrors = Array.isArray(details) ? (details as { path: string; message: string }[]) : undefined;
  const reason = details && typeof details === "object" && "reason" in details ? String(details.reason) : undefined;
  throw new ApiError(code, res.status, body.error?.supportId, fieldErrors, reason);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Nouvelle clé d'action (une par formulaire affiché). */
export function newActionKey(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Types renvoyés par l'API (contrats de /v1).
// ---------------------------------------------------------------------------

export interface Me {
  user: { id: string; email: string; name: string; emailVerified: boolean };
  companies: { id: string; name: string; role: "owner" | "admin" | "member" | "viewer"; trades: string[] }[];
}

export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  name: string;
  clientName: string | null;
  address: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface ProjectPage {
  items: Project[];
  nextCursor: string | null;
}

export type DocumentPurpose = "client_quote" | "supplier_quote";

export interface ProjectDocument {
  id: string;
  projectId: string;
  purpose: DocumentPurpose;
  name: string;
  sizeBytes: number;
  pageCount: number | null;
  status: "stored" | "read" | "failed";
  createdAt: string;
  reading: {
    status: "processing" | "completed" | "failed";
    errorCode: string | null;
    pagesTotal: number;
    pagesText: number;
    pagesVision: number;
    pagesSkipped: number;
    estimatedAiCostEur: string;
    actualAiCostEur: string;
  } | null;
  duplicate?: boolean;
}

export interface AiUsageReport {
  month: string;
  budgetEur: string;
  analyses: { used: number; limit: number | null; remaining: number | null };
  byUser: { userId: string | null; userName: string | null; analyses: number; calls: number; costEur: string }[];
  actual: { calls: number; retries: number; failedCalls: number; pagesText: number; pagesVision: number; costEur: string; budgetUsedPercent: number };
  reading: { documents: number; pagesTotal: number; pagesText: number; pagesVision: number; pagesSkipped: number; estimatedCostEur: string };
}

/** Taille maximale d'un document (même valeur par défaut que l'API). */
export const MAX_DOCUMENT_BYTES = 4_000_000;

export interface Health {
  status: "ok";
  features: { email: boolean; ai: boolean; alerts?: boolean };
}

export interface TakeoffIssue {
  code: string;
  severity: "blocking" | "to_verify" | "info";
  message: string;
}

export interface TakeoffLine {
  id: string;
  position: number;
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
  sourceRefs: string[];
  sourcePages: number[];
  origin: "ai" | "manual";
  edited: boolean;
  /** Doute exprimé par l'IA sur la ligne. */
  aiDoubt: string | null;
  /** Titres du devis au-dessus de la ligne (lot, marque, logement, pièce). */
  section?: string[];
  /** L'artisan a vérifié la ligne et la garde telle quelle. */
  confirmed: boolean;
  kind: "material" | "labor" | "unknown";
  family: string | null;
  /** « work » : surface de l'ouvrage (liteaux 120 m²), quantité d'achat encore à calculer. */
  basis: "purchase" | "work";
  /** Rôle de la quantité : mesure d'un ouvrage, à commander telle quelle, ou indéterminé. */
  role: "measure" | "purchase" | "undetermined" | null;
  status: "certain" | "probable" | "to_verify";
  issues: TakeoffIssue[];
}

/** Lecture du devis client encore sur le serveur (gros devis) : en cours, ou échouée (on peut relancer). */
export interface ReadingState {
  status: "reading" | "failed";
  reason: string | null;
}

/**
 * Le quantitatif de la porte /v1/quantitatifs (§38) : le même objet pour l'appli et les partenaires.
 * `ecran` (demandé avec `?ecran=1`) : le détail de l'écran de l'appli.
 */
export interface Quantitatif {
  id: string;
  projetId: string;
  etat: "en_cours" | "questions" | "pret" | "erreur";
  erreur?: { raison: string };
  valide?: boolean;
  ecran?: Takeoff;
}

export interface Takeoff {
  id: string;
  projectId: string;
  documentId: string | null;
  status: "draft" | "validated";
  model: string;
  notes: string[];
  createdAt: string;
  validatedAt: string | null;
  counts: { certain: number; probable: number; toVerify: number; labor: number; blocking: number };
  issues: (TakeoffIssue & { lineIds: string[] })[];
  lines: TakeoffLine[];
  /** Ce que voit l'artisan : compteurs, décisions à prendre, éléments prêts et leur preuve. */
  view: TakeoffView;
  /** LA LISTE D'ACHATS : à acheter, à faire chiffrer, hypothèses, et si elle peut partir. */
  purchase: TakeoffPurchase;
}

export interface PurchaseItem {
  key: string;
  label: string;
  /** « 1 488 pièces », « 547 ml », « 2 rouleaux » ; null si la quantité n'est pas établie. */
  quantity: string | null;
  /** « ≈ 7 palettes », ou le besoin dans son unité (« 128,57 m² »). */
  approx: string | null;
  kind: "computed" | "direct";
  needIds: string[];
  lineIds: string[];
  state: "ready" | "to_confirm";
  assumptionKeys: string[];
  /** Réécrit par l'artisan (§41.4). */
  edited: ("label" | "quantity")[];
}

export interface PurchaseAssumption {
  key: string;
  label: string;
  value: string;
  unit: string;
  note: string | null;
  choices: { label: string; value: string }[];
}

export interface TakeoffPurchase {
  /** « Couverture en ardoises au crochet sur liteaux : 200 m² »… */
  understood: string[];
  toBuy: PurchaseItem[];
  /** « À acheter » rangé par ouvrage (« Couverture en ardoises… · 200 m² »), pour la carte du quantitatif. */
  groups: { key: string; label: string; measure: string | null; itemKeys: string[] }[];
  toQuote: { key: string; label: string; measure: string; reason: string; lineIds: string[] }[];
  assumptions: PurchaseAssumption[];
  canValidate: boolean;
}

/** D'où vient un élément : lu dans le devis, BatiClair (vérifié), votre entreprise, choisi pour ce chantier, hypothèse par défaut. */
export type Origin = "devis" | "referential" | "company" | "project" | "assumption";

export interface TakeoffDecision {
  key: string;
  state: "to_confirm" | "missing";
  title: string;
  text: string;
  lineIds: string[];
  pieceLineIds: string[];
  primary: { action: "pieces" | "keep" | "edit" | "answer" | "remove"; label: string } | null;
  secondary: ("pieces" | "keep" | "edit" | "answer" | "remove")[];
  question: {
    key: string;
    kind: "confirm_product" | "choose_product" | "param" | "choose";
    unit: string | null;
    hint: string | null;
    options: { label: string; value: string }[];
    /** Ce que la réponse change (« De 1 191 à 1 445 pièces selon la réponse. »). */
    impact: string | null;
  } | null;
}

export interface ProofCriterion {
  key: "reading" | "work_item" | "product" | "manufacturer_data" | "rule" | "site_data" | "consistency" | "packaging";
  status: "established" | "to_confirm" | "missing" | "no_effect" | "supplier";
  detail: string;
  origin: Origin | null;
  comparisonRisk: boolean;
}

export interface TakeoffViewItem {
  kind: "line" | "need";
  id: string;
  label: string;
  quantity: string | null;
  state: "verified" | "to_confirm" | "missing";
  reason: string | null;
  proof: ProofCriterion[];
  calculation: {
    slot: string;
    formula: string | null;
    exclusions: string | null;
    productOrigin: string | null;
    trace: { label: string; value: string; unit: string; from: string; origin: Origin | null; url: string | null }[];
  } | null;
}

/** Une ligne du devis en trois niveaux : lu dans le devis → il faut → à commander. */
export interface TakeoffOuvrage {
  lineId: string;
  designation: string;
  role: "measure" | "purchase" | "undetermined" | null;
  read: { quantity: string | null; unit: string | null };
  needs: {
    slot: string;
    label: string;
    origin: "explicit" | "deduced";
    need: { value: string; unit: string } | null;
    needRange: { min: string; max: string; unit: string } | null;
    order: { count: string; unit: { one: string; many: string } } | null;
    missing: string | null;
    /** Calcul provisoire (règle en brouillon, mode validateur) : à juger, jamais ✓. */
    provisional: boolean;
    /** Produit d'usage quand le devis ne le précise pas (« 18×40 d'ordinaire… à confirmer »). */
    usual: string | null;
    state: "verified" | "to_confirm" | "missing";
  }[];
  direct: { quantity: string; unit: string } | null;
  pending: string | null;
  state: "verified" | "to_confirm" | "missing";
}

export interface TakeoffView {
  counts: { verified: number; toConfirm: number; missing: number };
  decisions: TakeoffDecision[];
  measures: { lineIds: string[]; text: string } | null;
  ouvrages: TakeoffOuvrage[];
  items: TakeoffViewItem[];
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecipientStatus = "to_send" | "sent" | "received" | "declined";

export interface PriceRequestRecipient {
  id: string;
  supplier: Pick<Supplier, "id" | "name" | "contactName" | "email" | "phone">;
  status: RecipientStatus;
  sentAt: string | null;
  document: { id: string; name: string; status: string } | null;
  /** E-mail prêt à envoyer (texte brut). */
  email: { subject: string; body: string } | null;
}

export interface PriceRequest {
  id: string;
  projectId: string;
  /** Copie figée de la liste validée au moment de la demande. */
  lines: { designation: string; quantity: string | null; unit: string | null; reference: string | null }[];
  message: string | null;
  dueDate: string | null;
  createdAt: string;
  /** « Classé » : l'artisan a fait son choix (fournisseurs retenus facultatifs). */
  classifiedAt: string | null;
  retainedSupplierIds: string[];
  recipients: PriceRequestRecipient[];
  /** §43 : les trois blocs envoyés au fournisseur (mail et PDF) ; absent pour une demande d'avant. */
  packet: { entreprise: string; chantier: string; articles: string[]; a_chiffrer: string[]; resume: string[]; joindre_detail: boolean } | null;
}

/** Réglages des envois fournisseur (§42.2), par entreprise. */
export interface PriceRequestSettings {
  attachQuoteDetail: boolean;
}

export type OfferLineKind = "main" | "substitution" | "variant" | "option" | "fee" | "deposit" | "info";

export interface OfferLine {
  id: string;
  position: number;
  kind: OfferLineKind;
  designation: string;
  reference: string | null;
  quantity: string | null;
  unit: string | null;
  unitPrice: string | null;
  discountRate: string | null;
  lineTotal: string | null;
  /** Montant HT retenu pour la ligne (imprimé, sinon recalculé), en euros. */
  amount: string | null;
  /** Ligne demandée correspondante (numéro à partir de 1), ou null. */
  requestLine: number | null;
  matchConfidence: "sure" | "probable" | "unsure" | null;
  matchConfirmed: boolean;
  aiDoubt: string | null;
  edited: boolean;
}

/** Devis fournisseur lu par l'IA ; tous les montants sont recalculés par le code. */
export interface Offer {
  recipientId: string;
  id: string;
  documentId: string;
  notes: string[];
  printed: { totalHT: string | null; totalVAT: string | null; totalTTC: string | null };
  deliveryIncluded: boolean | null;
  computedTotalHT: string | null;
  arithmetic: { status: "consistent" | "inconsistent" | "insufficient_data"; issues: { code: string; lineId: string | null; computed: string | null; printed: string | null }[] };
  requestedCount: number;
  answeredCount: number;
  lines: OfferLine[];
}

export interface ComparisonSupplier {
  recipientId: string;
  supplierId: string;
  name: string;
  computedTotalHT: string | null;
  printedTotalHT: string | null;
  feesHT: string | null;
  /** Coût pour couvrir toute la liste (manquants estimés), frais compris. */
  comparableTotalHT: string | null;
  estimatedPartHT: string | null;
  coveredCount: number;
  missingCount: number;
  uncertainCount: number;
  /** Lignes proposées qui ne correspondent à aucun article demandé (non comptées). */
  extrasCount: number;
  extrasHT: string | null;
  comparability: "complete" | "provisional" | "estimated" | "incomplete";
  arithmetic: "consistent" | "inconsistent" | "insufficient_data";
}

export type ItemFlag = "SUBSTITUTION" | "QUANTITY_LOWER" | "QUANTITY_HIGHER" | "UNIT_NOT_COMPARABLE" | "ONLY_AS_VARIANT" | "NOT_PRICED";

export interface ComparisonItem {
  index: number;
  designation: string;
  quantity: string | null;
  unit: string | null;
  lowestSupplierId: string | null;
  offers: {
    supplierId: string;
    status: "covered" | "missing";
    confidence: "certain" | "probable" | "to_verify" | null;
    comparableAmount: string | null;
    effectiveUnitPrice: string | null;
    offeredQuantity: { value: string; unit: string } | null;
    estimatedAmount: string | null;
    flags: ItemFlag[];
  }[];
}

export interface Comparison {
  engineVersion: string;
  classifiedAt: string | null;
  retainedSupplierIds: string[];
  suppliers: ComparisonSupplier[];
  items: ComparisonItem[];
}

/** Prochaine action réelle d'un chantier (accueil « À faire »). */
export interface NextAction {
  projectId: string;
  projectName: string;
  kind: "add_quote" | "prepare_list" | "validate_list" | "send_requests" | "compare" | "view_offer" | "choose_supplier";
  label: string;
  detail: string | null;
  target: "devis" | "materiaux" | "fournisseurs" | "comparer";
}

/** Formule et utilisation, en nombre de chantiers. */
export interface BillingPlan {
  key: string;
  label: string;
  projectLimit: number | null;
  period: "trial" | "month";
  priceEurMonth: number | null;
}

export interface BillingStatus {
  plan: BillingPlan;
  usage: { projects: number; limit: number | null; remaining: number | null };
  limitReached: boolean;
  offers: BillingPlan[];
  requestedPlan: string | null;
  activationEnabled: boolean;
}
