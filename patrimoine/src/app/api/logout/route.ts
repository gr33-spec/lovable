import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, readSessionToken } from "@/lib/server/session";
import { revokeSession } from "@/lib/server/session-store";

/** Déconnexion : le cookie est effacé et la session révoquée côté serveur (une copie du cookie ne sert plus). */
export async function POST(request: Request) {
  const raw = request.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  const info = readSessionToken(raw ? decodeURIComponent(raw) : undefined);
  if (info) await revokeSession(info, Date.now() + SESSION_DAYS * 24 * 3600 * 1000).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
