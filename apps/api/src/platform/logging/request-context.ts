import { AsyncLocalStorage } from "node:async_hooks";

/** Identifiants de corrélation propagés à tous les logs d'une requête. */
export interface RequestContext {
  requestId: string;
  userId?: string;
  companyId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Complète le contexte courant (ex. une fois l'utilisateur authentifié). */
export function enrichRequestContext(values: Partial<Omit<RequestContext, "requestId">>): void {
  const ctx = storage.getStore();
  if (ctx) Object.assign(ctx, values);
}

/**
 * Identifiant court à communiquer au support (« 7F3K-92QA »), dérivé du
 * requestId : il permet de retrouver les logs sans exposer de donnée.
 */
export function toSupportId(requestId: string): string {
  const compact = requestId.replace(/[^A-Za-z0-9]/g, "").toUpperCase().padEnd(8, "0");
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}`;
}
