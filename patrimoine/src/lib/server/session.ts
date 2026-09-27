import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Session signée (HMAC-SHA256) stockée dans un cookie httpOnly. Le mot de
// passe n'existe que dans les variables d'environnement du serveur.

export const SESSION_COOKIE = "patrimoine_session";
export const SESSION_DAYS = 60;

function secret(): string | undefined {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const password = process.env.APP_PASSWORD;
  if (!password) return undefined;
  // Changer le mot de passe invalide automatiquement toutes les sessions.
  return createHash("sha256").update(`patrimoine-session|${password}`).digest("hex");
}

export function isConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createSessionToken(now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("APP_PASSWORD manquant");
  const payload = Buffer.from(
    JSON.stringify({ iat: now, exp: now + SESSION_DAYS * 24 * 3600 * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}

/** Comparaison à temps constant du mot de passe saisi. */
export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !input) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 3600,
};
