import type { LoggerService } from "@nestjs/common";
import { pino, type Logger } from "pino";
import { currentRequestContext } from "./request-context.js";

export type AppLogger = Logger;

/**
 * Logs JSON structurés. Les identifiants de corrélation sont ajoutés
 * automatiquement ; les champs sensibles sont masqués (docs/observability.md).
 */
export function createLogger(level: string): AppLogger {
  return pino({
    level,
    base: { service: "api" },
    mixin() {
      const ctx = currentRequestContext();
      return ctx ? { ...ctx } : {};
    },
    redact: {
      paths: [
        "password",
        "*.password",
        "newPassword",
        "*.newPassword",
        "token",
        "*.token",
        "headers.cookie",
        "headers.authorization",
        "*.headers.cookie",
        "*.headers.authorization",
      ],
      censor: "[masqué]",
    },
  });
}

/** Adaptateur pour que les messages internes de NestJS passent par pino. */
export class NestPinoLogger implements LoggerService {
  constructor(private readonly logger: AppLogger) {}
  log(message: unknown, context?: string) {
    this.logger.debug({ context }, String(message));
  }
  error(message: unknown, trace?: string, context?: string) {
    this.logger.error({ context, trace }, String(message));
  }
  warn(message: unknown, context?: string) {
    this.logger.warn({ context }, String(message));
  }
  debug(message: unknown, context?: string) {
    this.logger.debug({ context }, String(message));
  }
  verbose(message: unknown, context?: string) {
    this.logger.trace({ context }, String(message));
  }
}
