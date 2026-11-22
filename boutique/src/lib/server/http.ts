import "server-only";
import { NextResponse } from "next/server";
import { siteUrl } from "./env";

// Aides communes aux routes d'API : contrôle d'origine (anti-CSRF), lecture
// JSON bornée en taille, réponses sans détail technique.

/** Refuse les requêtes d'écriture venant d'un autre site. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const o = new URL(origin);
    return o.host === host || o.origin === siteUrl();
  } catch {
    return false;
  }
}

export async function readJson(request: Request, maxBytes = 32_000): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new HttpError(413, "Requête trop volumineuse.");
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "Requête trop volumineuse.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Requête invalide.");
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function errorResponse(err: unknown, context: string) {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  console.error(`[${context}]`, err instanceof Error ? err.message : err);
  return json({ error: "Une erreur est survenue. Merci de réessayer dans un instant." }, 500);
}
