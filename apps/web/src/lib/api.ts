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
  ) {
    super(errorMessage(code));
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
  method?: "GET" | "POST" | "PATCH";
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
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;
  const companyId = getActiveCompanyId();
  if (companyId && !path.startsWith("/v1/auth")) headers["x-company-id"] = companyId;

  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      credentials: "same-origin",
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
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
  const body = (data ?? {}) as { error?: { code?: string; supportId?: string; details?: never }; code?: string };
  const code = body.error?.code ?? body.code ?? (res.status >= 500 ? "internal_error" : "validation_failed");
  throw new ApiError(code, res.status, body.error?.supportId, body.error?.details);
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

export interface Health {
  status: "ok";
  features: { email: boolean };
}
