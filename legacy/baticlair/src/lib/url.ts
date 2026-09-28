import "server-only";
import { headers } from "next/headers";

/** Reconstruit l'origine (protocole + hôte) de la requête courante, pour les redirections Stripe. */
export async function getOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host");
  return `${proto}://${host}`;
}
