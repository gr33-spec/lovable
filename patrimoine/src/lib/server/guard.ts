import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSessionToken, type Role, type SessionInfo } from "./session";
import { accessState } from "./access";

/** Session en cours, révocation de l'accès gestion comprise. */
export async function currentSession(): Promise<SessionInfo | null> {
  const store = await cookies();
  const info = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!info) return null;
  if (info.role === "gestion") {
    const state = await accessState().catch(() => null);
    if (!state?.enabled || state.version !== info.av) return null;
  }
  return info;
}

export async function isAuthenticated(): Promise<boolean> {
  return (await currentSession()) !== null;
}

/**
 * Vérifie la session, le rôle autorisé (propriétaire par défaut : l'espace
 * gestion n'a accès qu'aux routes qui l'autorisent explicitement) et
 * l'origine (protection CSRF) d'une requête d'API.
 */
export async function guardApi(request: Request, roles: Role[] = ["owner"]): Promise<NextResponse | null> {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  if (!roles.includes(session.role)) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (origin && host && new URL(origin).host !== host) {
      return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
    }
  }
  return null;
}

export const BOTH: Role[] = ["owner", "gestion"];
