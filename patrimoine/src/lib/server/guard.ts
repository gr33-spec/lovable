import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSessionToken, type Role, type SessionInfo } from "./session";
import { accessState } from "./access";
import { shareActive } from "./shares";
import { sessionAlive } from "./session-store";

/** Routes jamais ouvertes en consultation, même en lecture (export complet, accès, sauvegardes). */
const LECTURE_DENIED = ["/api/analyse", "/api/files/empreinte", "/api/backup", "/api/export-excel", "/api/shares", "/api/access", "/api/passkey", "/api/snapshots", "/api/sessions"];

/** Session en cours, révocation de l'accès gestion comprise. */
export async function currentSession(): Promise<SessionInfo | null> {
  const store = await cookies();
  const info = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!info) return null;
  // Déconnectée (ou « tout déconnecter ») : refusée même si le cookie est encore présenté.
  if (!(await sessionAlive(info).catch(() => false))) return null;
  if (info.role === "gestion") {
    const state = await accessState().catch(() => null);
    if (!state?.enabled || state.version !== info.av) return null;
  }
  // Consultation : le lien doit toujours être valable (révocation, expiration).
  if (info.role === "lecture" && !(info.sid && (await shareActive(info.sid).catch(() => false)))) return null;
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
  if (session.role === "lecture") {
    // Consultation : lecture de ce que voit le propriétaire, aucune écriture, jamais d'export complet.
    const path = new URL(request.url).pathname;
    if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.json({ error: "Mode consultation : aucune modification possible." }, { status: 403 });
    if (!roles.includes("owner") || LECTURE_DENIED.some((p) => path === p || path.startsWith(`${p}/`))) return NextResponse.json({ error: "Non disponible en consultation." }, { status: 403 });
    return null;
  }
  if (!roles.includes(session.role)) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    // Protection CSRF : une modification ne peut venir que de l'application elle-même.
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const site = request.headers.get("sec-fetch-site");
    let foreign = !!site && site !== "same-origin" && site !== "none";
    if (origin && host) {
      try {
        foreign ||= new URL(origin).host !== host;
      } catch {
        foreign = true;
      }
    }
    if (foreign) return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
  }
  return null;
}

export const BOTH: Role[] = ["owner", "gestion"];
