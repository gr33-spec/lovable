import { NextResponse } from "next/server";

/**
 * LE COMMIT EN LIGNE DU SITE (Greg, 22 novembre 2026) : `/version` donne le commit construit par l'hébergeur (Vercel) et
 * l'environnement, rien d'autre (jamais une variable, une clé ni une adresse). L'API a la même adresse. Après chaque
 * poussée, on attend que les deux donnent le commit poussé avant de dire « c'est en ligne ».
 */
export const dynamic = "force-dynamic";

export function GET() {
  const brut = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  const commit = brut && /^[0-9a-f]{7,40}$/i.test(brut) ? brut.toLowerCase() : null;
  const environnement = process.env.VERCEL_ENV === "production" ? "production" : process.env.VERCEL_ENV === "preview" ? "test" : "local";
  return NextResponse.json({ commit, environnement }, { headers: { "cache-control": "no-store" } });
}
