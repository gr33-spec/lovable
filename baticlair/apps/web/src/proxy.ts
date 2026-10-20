import { NextResponse, type NextRequest } from "next/server";

/**
 * La racine du site (plan du 20 octobre, bloc 5) : un visiteur sans session voit la page publique (« Découvrir ») ;
 * un artisan connecté garde l'app telle quelle. La session vit dans le cookie de better-auth (préfixe « __Secure- »
 * en ligne) ; l'adresse ne change pas, la page publique est servie à la place.
 */
const COOKIES_DE_SESSION = ["better-auth.session_token", "__Secure-better-auth.session_token"];

export function proxy(request: NextRequest) {
  if (COOKIES_DE_SESSION.some((c) => request.cookies.has(c))) return NextResponse.next();
  return NextResponse.rewrite(new URL("/decouvrir", request.url));
}

export const config = { matcher: "/" };
