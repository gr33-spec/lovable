import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/server/session";

// Aucune page ni donnée n'est accessible sans session valide, sauf les
// liens de partage : /partage/<jeton> vérifie lui-même son jeton (expiration,
// révocation) et n'offre qu'une lecture seule.
const PUBLIC_PATHS = ["/connexion", "/api/login", "/api/passkey/login", "/partage"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const url = new URL("/connexion", request.url);
  return NextResponse.redirect(url);
}

export const config = {
  // Icônes et manifeste restent publics (nécessaires à l'écran d'accueil de l'iPhone).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|icons/).*)"],
};
