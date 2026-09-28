import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import { DomainError, type ErrorCode } from "../errors/domain-error.js";
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
  internal_error: 500,
};

const FROM_HTTP_STATUS: Record<number, ErrorCode> = {
  400: "validation_failed",
  401: "unauthenticated",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
};

/**
 * Format d'erreur unique de l'API :
 * `{ error: { code, message, supportId, retryable, details? } }`.
 * Une erreur inattendue n'expose jamais sa cause au client.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

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
    }

    const status = STATUS[code];
    if (status >= 500) {
      this.logger.error({ err: exception }, "unhandled error");
    }

    res.status(status).json({
      error: {
        code,
        message,
        supportId: toSupportId(requestId),
        retryable: status >= 500,
        ...(details !== undefined ? { details } : {}),
      },
    });
  }
}
