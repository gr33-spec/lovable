import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/server/db";
import { BOTH, currentSession, guardApi } from "@/lib/server/guard";
import { scopeForGestion } from "@/lib/scope";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardApi(request, BOTH);
  if (denied) return denied;
  const session = (await currentSession())!;
  const doc = await loadDocument();
  const response = NextResponse.json(
    { data: session.role === "gestion" ? scopeForGestion(doc.data) : doc.data, version: doc.version, exists: doc.exists },
    { headers: { "Cache-Control": "no-store" } },
  );
  // Session glissante : chaque ouverture prolonge la connexion.
  response.cookies.set(SESSION_COOKIE, createSessionToken(session), sessionCookieOptions);
  return response;
}
