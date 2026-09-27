import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "./lib/server/session";

// Aucune page ni donnée n'est accessible sans session valide, sauf les
// liens de partage : /partage/<jeton> vérifie lui-même son jeton (expiration,
// révocation) et n'offre qu'une lecture seule.
const PUBLIC_PATHS = ["/connexion", "/api/login", "/api/passkey/login", "/partage"];

const GESTION_PAGES = ["/gestion", "/patrimoine/logement", "/plus/securite"];
const GESTION_API = ["/api/data", "/api/ops", "/api/documents", "/api/files", "/api/passkey", "/api/logout"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session?.role === "owner") return NextResponse.next();
  if (session?.role === "gestion") {
    // Espace gestion locative : uniquement ses écrans et ses API (la révocation
    // est vérifiée ensuite par chaque page et chaque route).
    if (GESTION_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || GESTION_API.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    return NextResponse.redirect(new URL("/gestion", request.url));
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
