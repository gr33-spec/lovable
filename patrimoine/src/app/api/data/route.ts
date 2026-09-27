import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/server/db";
import { guardApi } from "@/lib/server/guard";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const doc = await loadDocument();
  const response = NextResponse.json(
    { data: doc.data, version: doc.version, exists: doc.exists },
    { headers: { "Cache-Control": "no-store" } },
  );
  // Session glissante : chaque ouverture prolonge la connexion.
  response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  return response;
}
