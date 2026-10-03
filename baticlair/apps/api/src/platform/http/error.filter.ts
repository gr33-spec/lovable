import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import { DomainError, type ErrorCode } from "../errors/domain-error.js";
import { NO_ALERTS, type Alerter } from "../alerts/alerter.js";
import type { AppLogger } from "../logging/logger.js";
import { currentRequestContext, toSupportId } from "../logging/request-context.js";

const STATUS: Record<ErrorCode, number> = {
  validation_failed: 400,
  company_selection_required: 400,
  unauthenticated: 401,
  forbidden: 403,
  onboarding_required: 403,
  not_found: 404,
  conflict: 409,
  request_in_progress: 409,
  payload_too_large: 413,
  too_many_requests: 429,
  unreadable_document: 422,
  analysis_quota_reached: 402,
  plan_limit_reached: 402,
  ai_unavailable: 503,
  analysis_failed: 502,
  internal_error: 500,
};

const FROM_HTTP_STATUS: Record<number, ErrorCode> = {
  400: "validation_failed",
  401: "unauthenticated",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  413: "payload_too_large",
  415: "validation_failed",
  429: "too_many_requests",
};

/** Codes pour lesquels une nouvelle tentative a une chance d'aboutir. */
const RETRYABLE: ReadonlySet<ErrorCode> = new Set(["internal_error", "request_in_progress", "too_many_requests"]);

/** Erreurs HTTP levées hors de NestJS (ex. parseur de corps : trop gros, JSON invalide). */
function httpStatusOf(exception: unknown): number | undefined {
  if (typeof exception !== "object" || exception === null) return undefined;
  const e = exception as { status?: unknown; statusCode?: unknown };
  const status = typeof e.status === "number" ? e.status : e.statusCode;
  return typeof status === "number" && status >= 400 && status < 500 ? status : undefined;
}

/**
 * Format d'erreur unique de l'API :
 * `{ error: { code, message, supportId, retryable, details? } }`.
 * Une erreur inattendue n'expose jamais sa cause au client.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly alerter: Alerter = NO_ALERTS,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const requestId = currentRequestContext()?.requestId ?? "unknown";

    let code: ErrorCode = "internal_error";
    let message = "Unexpected error";
    let details: unknown;

    if (exception instanceof DomainError) {
      ({ code, message, details } = exception);
    } else if (exception instanceof ZodError) {
      code = "validation_failed";
      message = "Invalid request";
      details = exception.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    } else if (exception instanceof HttpException) {
      code = FROM_HTTP_STATUS[exception.getStatus()] ?? "internal_error";
      message = exception.message;
    } else if (httpStatusOf(exception) !== undefined) {
      code = FROM_HTTP_STATUS[httpStatusOf(exception)!] ?? "validation_failed";
      message = code === "payload_too_large" ? "Request body too large" : "Invalid request";
    }

    const status = STATUS[code];
    if (status >= 500) {
      this.logger.error({ err: exception }, "unhandled error");
      // Le code support suffit pour retrouver l'erreur dans le journal ; rien du client dans l'alerte.
      const req = host.switchToHttp().getRequest<{ method?: string; route?: { path?: string } }>();
      this.alerter.alert("server_error", `${code} sur ${req.method ?? "?"} ${req.route?.path ?? "?"} (code support ${toSupportId(requestId)}).`);
    }

    res.status(status).json({
      error: {
        code,
        message,
        supportId: toSupportId(requestId),
        retryable: RETRYABLE.has(code),
        ...(details !== undefined ? { details } : {}),
      },
    });
  }
}
