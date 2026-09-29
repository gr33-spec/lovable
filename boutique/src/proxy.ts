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
  if (pathname.startsWith("/api/admin")) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const url = request.nextUrl.clone();
  url.pathname = "/admin/connexion";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
