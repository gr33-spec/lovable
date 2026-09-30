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
  companies: { id: string; name: string; role: "owner" | "admin" | "member" | "viewer" }[];
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
  features: { email: boolean; ai: boolean };
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
  /** L'artisan a vérifié la ligne et la garde telle quelle. */
  confirmed: boolean;
  kind: "material" | "labor" | "unknown";
  family: string | null;
  status: "certain" | "probable" | "to_verify";
  issues: TakeoffIssue[];
}

export interface Takeoff {
  id: string;
  projectId: string;
  documentId: string;
  status: "draft" | "validated";
  model: string;
  notes: string[];
  createdAt: string;
  validatedAt: string | null;
  counts: { certain: number; probable: number; toVerify: number; labor: number; blocking: number };
  issues: (TakeoffIssue & { lineIds: string[] })[];
  lines: TakeoffLine[];
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
  recipients: PriceRequestRecipient[];
}
