import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { AppLogger } from "../logging/logger.js";
import { runWithRequestContext } from "../logging/request-context.js";

const INCOMING_ID = /^[A-Za-z0-9-]{8,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Le chemin journalisé, SANS JETON (audit du 27 novembre 2026, accord de Greg) : un lien de négoce, de chiffrage, de
 * réponse ou de désabonnement porte son jeton dans le chemin ; écrit tel quel dans les journaux Vercel, il pouvait être
 * rejoué. Tout morceau qui ressemble à un jeton devient « *** » ; les identifiants (uuid) et les mots des routes (en
 * minuscules, 22 caractères au plus) restent lisibles. La query string n'est jamais écrite.
 */
function ressembleAUnJeton(morceau: string): boolean {
  const nu = morceau.replace(/\.(pdf|xlsx|csv|zones)$/i, "");
  if (nu.length < 16 || UUID.test(nu)) return false;
  return nu.length >= 32 || (/[A-Z]/.test(nu) && /[a-z]/.test(nu)) || (nu.match(/\d/g) ?? []).length >= 4;
}
export function cheminJournalise(url: string): string {
  return (url.split("?")[0] ?? "")
    .split("/")
    .map((morceau) => (ressembleAUnJeton(morceau) ? "***" : morceau))
    .join("/");
}

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

    runWithRequestContext({ requestId, ...(req.ip ? { ip: req.ip } : {}) }, () => {
      res.on("finish", () => {
        logger.info(
          {
            method: req.method,
            // Chemin sans la query string ni les jetons du chemin.
            path: cheminJournalise(req.originalUrl),
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
