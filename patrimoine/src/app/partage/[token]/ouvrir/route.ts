import { NextResponse } from "next/server";
import { resolveShare } from "@/lib/server/shares";
import { SESSION_COOKIE, createSessionToken, readSessionToken, sessionCookieOptions } from "@/lib/server/session";
import { VIEW_COOKIE } from "@/lib/view";

export const dynamic = "force-dynamic";

// Ouverture d'un lien de partage : session de consultation liée au lien
// (révocable, jamais plus longue que lui). L'application entière se consulte,
// toute écriture est refusée par le serveur.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const link = await resolveShare(token, true);
  if (!link) return NextResponse.redirect(new URL(`/partage/${token}`, url));
  // Le propriétaire qui ouvre son propre lien est prévenu avant d'être déconnecté.
  const cookie = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  const current = readSessionToken(cookie);
  if (current && current.role !== "lecture" && url.searchParams.get("confirmer") !== "1") {
    return NextResponse.redirect(new URL(`/partage/${token}?connecte=1`, url));
  }
  const expires = new Date(link.expiresAt).getTime();
  const response = NextResponse.redirect(new URL("/", url));
  response.cookies.set(SESSION_COOKIE, createSessionToken({ role: "lecture", sid: link.id }, Date.now(), expires), {
    ...sessionCookieOptions,
    maxAge: Math.max(60, Math.floor((expires - Date.now()) / 1000)),
  });
  response.cookies.set(VIEW_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
