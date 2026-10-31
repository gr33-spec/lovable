import { NextResponse, type NextRequest } from "next/server";
import { cspDe, nouveauNonce } from "@/lib/csp";

/**
 * La racine du site (plan du 20 octobre, bloc 5) : un visiteur sans session voit la page publique (« Découvrir ») ;
 * un artisan connecté garde l'app telle quelle. La session vit dans le cookie de better-auth (préfixe « __Secure- »
 * en ligne) ; l'adresse ne change pas, la page publique est servie à la place.
 *
 * Chaque page reçoit aussi sa Content-Security-Policy avec un nonce neuf (`src/lib/csp.ts`, 26 octobre 2026) : Next le
 * lit dans l'en-tête de la requête et le pose sur ses scripts (les pages sont rendues à la demande, `app/layout.tsx`).
 */
const COOKIES_DE_SESSION = ["better-auth.session_token", "__Secure-better-auth.session_token"];

export function proxy(request: NextRequest) {
  const nonce = nouveauNonce();
  const csp = cspDe(nonce, process.env.NODE_ENV === "development", !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const enTetes = new Headers(request.headers);
  enTetes.set("x-nonce", nonce);
  enTetes.set("Content-Security-Policy", csp);
  const racineSansSession = request.nextUrl.pathname === "/" && !COOKIES_DE_SESSION.some((c) => request.cookies.has(c));
  const reponse = racineSansSession ? NextResponse.rewrite(new URL("/decouvrir", request.url), { request: { headers: enTetes } }) : NextResponse.next({ request: { headers: enTetes } });
  reponse.headers.set("Content-Security-Policy", csp);
  return reponse;
}

export const config = {
  // Toutes les pages ; ni l'API relayée (/v1), ni les fichiers de Next, ni les fichiers publics (un point dans le nom).
  matcher: [
    {
      source: "/((?!v1/|_next/static|_next/image|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
