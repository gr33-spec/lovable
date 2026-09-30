import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { AppLogger } from "../logging/logger.js";
import { runWithRequestContext } from "../logging/request-context.js";

const INCOMING_ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Attribue un requestId (repris de `x-request-id` s'il est sûr), le renvoie
 * dans la réponse et journalise chaque requête terminée.
 */
export function requestContextMiddleware(logger: AppLogger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header("x-request-id");
    const requestId = incoming && INCOMING_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader("x-request-id", requestId);
    const startedAt = process.hrtime.bigint();

    runWithRequestContext({ requestId }, () => {
      res.on("finish", () => {
        logger.info(
          {
            method: req.method,
            // Chemin sans la query string (qui peut contenir des jetons).
            path: req.originalUrl.split("?")[0],
            status: res.statusCode,
            durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
          },
          "request completed",
        );
      });
      next();
    });
  };
}
