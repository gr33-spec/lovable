import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "./lib/server/session";

// Aucune page ni donnée n'est accessible sans session valide, sauf les
// liens de partage : /partage/<jeton> vérifie lui-même son jeton (expiration,
// révocation) et n'offre qu'une lecture seule.
const PUBLIC_PATHS = ["/connexion", "/api/login", "/api/passkey/login", "/partage"];

const GESTION_PAGES = ["/gestion", "/patrimoine/logement", "/plus/securite"];
const LECTURE_CLOSED = ["/plus/securite", "/plus/sauvegardes", "/plus/partage", "/plus/acces-gestion", "/bienvenue"];
const GESTION_API = ["/api/data", "/api/ops", "/api/documents", "/api/files", "/api/passkey", "/api/logout", "/api/irl"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session?.role === "owner") {
    // Propriétaire en vue « gestion locative » : mêmes écrans que l'espace gestion
    // (simple préférence d'affichage, il peut revenir à tout moment).
    const gestionView = request.cookies.get("patrimoine_vue")?.value === "gestion";
    if (gestionView && !pathname.startsWith("/api/") && !GESTION_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.redirect(new URL("/gestion", request.url));
    }
    return NextResponse.next();
  }
  if (session?.role === "lecture") {
    // Consultation via un lien de partage : tout se consulte ; chaque route d'API
    // refuse les écritures et vérifie que le lien est toujours valable. Les écrans
    // d'administration (sécurité, sauvegardes, partages, accès gestion) restent fermés.
    if (LECTURE_CLOSED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
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
