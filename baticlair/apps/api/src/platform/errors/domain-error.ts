/**
 * Erreur métier ou applicative, indépendante du transport (HTTP, job…).
 * Le filtre HTTP traduit le code en statut ; l'interface traduit le code en
 * message pour l'utilisateur (i18n). Le `message` est destiné aux
 * développeurs.
 */
export type ErrorCode =
  | "validation_failed"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "request_in_progress"
  | "payload_too_large"
  | "unreadable_document"
  | "analysis_quota_reached"
  | "plan_limit_reached"
  | "ai_unavailable"
  | "analysis_failed"
  | "onboarding_required"
  | "company_selection_required"
  | "internal_error";

export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const notFound = (what: string) => new DomainError("not_found", `${what} not found`);
export const forbidden = (message: string) => new DomainError("forbidden", message);
export const validationFailed = (message: string, details?: unknown) =>
  new DomainError("validation_failed", message, details);
