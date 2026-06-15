import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Pages accessibles sans connexion.
const PUBLIC_PATHS = ["/connexion"];

/** Protège les écrans de l'app : redirige vers /connexion si non connecté (§5). */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/connexion", req.nextUrl));
  }

  if (isLoggedIn && isPublicPath) {
    return NextResponse.redirect(new URL("/accueil", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
