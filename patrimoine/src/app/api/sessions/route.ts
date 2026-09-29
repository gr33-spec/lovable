import { NextResponse } from "next/server";
import { currentSession, guardApi } from "@/lib/server/guard";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/server/session";
import { revokeAllSessions } from "@/lib/server/session-store";

export const dynamic = "force-dynamic";

/** « Déconnecter tous les autres appareils » : toutes les sessions propriétaire sont révoquées, sauf celle-ci (renouvelée). */
export async function POST(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const session = (await currentSession())!;
  const now = await revokeAllSessions("owner");
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken({ role: session.role, iat: now }), sessionCookieOptions);
  return response;
}
