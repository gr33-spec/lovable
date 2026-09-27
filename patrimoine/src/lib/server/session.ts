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

export type Role = "owner" | "gestion";

export interface SessionInfo {
  role: Role;
  /** Version de l'accès gestion au moment de la connexion (révocation). */
  av?: number;
}

export function createSessionToken(info: SessionInfo = { role: "owner" }, now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("APP_PASSWORD manquant");
  const payload = Buffer.from(
    JSON.stringify({ iat: now, exp: now + SESSION_DAYS * 24 * 3600 * 1000, role: info.role, av: info.av }),
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

/** Session valide (signature et expiration), sans contrôle de révocation. */
export function readSessionToken(token: string | undefined, now = Date.now()): SessionInfo | null {
  const key = secret();
  if (!key || !token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { exp, role, av } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof exp !== "number" || exp <= now) return null;
    // Anciennes sessions (sans rôle) : propriétaire.
    return role === "gestion" ? { role: "gestion", av: typeof av === "number" ? av : -1 } : { role: "owner" };
  } catch {
    return null;
  }
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  return readSessionToken(token, now) !== null;
}

/** Empreinte courte du secret : change quand le mot de passe change. */
export function secretTag(): string | undefined {
  const key = secret();
  return key ? createHash("sha256").update(`tag|${key}`).digest("hex").slice(0, 24) : undefined;
}

/** Valeur signée à durée de vie courte (défi Face ID). */
export function signShortLived(value: string, ttlMs: number, now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("APP_PASSWORD manquant");
  const payload = Buffer.from(JSON.stringify({ v: value, exp: now + ttlMs })).toString("base64url");
  return `${payload}.${sign(payload, `${key}|short-lived`)}`;
}

export function readShortLived(token: string | undefined, now = Date.now()): string | undefined {
  const key = secret();
  if (!key || !token) return undefined;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return undefined;
  // Clé distincte de celle des sessions : un défi ne peut jamais servir de session.
  const expected = Buffer.from(sign(payload, `${key}|short-lived`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return undefined;
  try {
    const { v, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof v === "string" && typeof exp === "number" && exp > now ? v : undefined;
  } catch {
    return undefined;
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
