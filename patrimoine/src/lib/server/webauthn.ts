import "server-only";
import { readShortLived, signShortLived } from "./session";

// Paramètres WebAuthn communs : le domaine (rpID) et l'origine attendue sont
// déduits de la requête, l'origine étant contrôlée par rapport à l'hôte.

export const CHALLENGE_COOKIE = "patrimoine_webauthn";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function relyingParty(request: Request): { rpID: string; origin: string } | undefined {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const origin = request.headers.get("origin");
  if (!host || !origin) return undefined;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return undefined;
  }
  if (url.host !== host) return undefined;
  return { rpID: url.hostname, origin: url.origin };
}

export function challengeCookie(challenge: string, kind: "register" | "login") {
  return {
    name: CHALLENGE_COOKIE,
    value: signShortLived(`${kind}:${challenge}`, CHALLENGE_TTL_MS),
    options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/api/passkey", maxAge: CHALLENGE_TTL_MS / 1000 },
  };
}

export function readChallenge(request: Request, kind: "register" | "login"): string | undefined {
  const raw = request.headers.get("cookie") ?? "";
  const match = raw.split(/;\s*/).find((c) => c.startsWith(`${CHALLENGE_COOKIE}=`));
  const value = readShortLived(match ? decodeURIComponent(match.slice(CHALLENGE_COOKIE.length + 1)) : undefined);
  if (!value?.startsWith(`${kind}:`)) return undefined;
  return value.slice(kind.length + 1);
}
