import { NextResponse, type NextRequest } from "next/server";

// Premier filtre (rapide) de l'administration : sans cookie de session, on
// ne va pas plus loin. La VRAIE vérification (session valide en base,
// non expirée, non révoquée) est faite par chaque page et chaque action.
const PUBLIC_ADMIN = ["/admin/connexion", "/admin/mot-de-passe-oublie", "/admin/reinitialiser", "/admin/installation"];
const COOKIES = ["__Host-bp_admin", "bp_admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  const hasSession = COOKIES.some((c) => request.cookies.get(c)?.value);
  if (hasSession) return NextResponse.next();
  // Action d'un onglet resté ouvert après la déconnexion : on la laisse arriver à l'action,
  // qui refuse elle-même (session vérifiée en base) avec un message clair « reconnectez-vous ».
  // Une redirection ici casserait la page au lieu d'expliquer.
  if (request.method === "POST" && request.headers.has("next-action") && !pathname.startsWith("/api/")) return NextResponse.next();
  if (pathname.startsWith("/api/admin")) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const url = request.nextUrl.clone();
  url.pathname = "/admin/connexion";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
