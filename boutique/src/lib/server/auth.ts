import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  decrypt,
  dummyPasswordHash,
  encrypt,
  hashPassword,
  randomToken,
  readShortLived,
  signShortLived,
  tokenHash,
  verifyPassword,
  verifyTotp,
} from "./crypto";
import { query, queryOne, transaction } from "./db";
import { isProduction } from "./env";
import { audit } from "./monitoring";
import { hit, ipFromHeaders, resetBucket } from "./rate-limit";

// Authentification de l'administration.
//  - mot de passe haché (scrypt), jamais stocké ni journalisé en clair ;
//  - session aléatoire (256 bits) en cookie HttpOnly/Secure/SameSite, dont
//    seule l'empreinte est en base → révocable à tout moment ;
//  - expiration absolue (30 jours) et d'inactivité (7 jours) ;
//  - limitation des essais par adresse IP et par compte ;
//  - double authentification (code à 6 chiffres) facultative.

export const SESSION_COOKIE = isProduction() ? "__Host-bp_admin" : "bp_admin";
const SESSION_DAYS = 30;
const IDLE_DAYS = 7;
const SESSION_PURPOSE = "admin-session";
const TOTP_PURPOSE = "totp-secret";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  totpEnabled: boolean;
  sessionId: string;
}

function cookieOptions(maxAgeSeconds: number) {
  return { httpOnly: true, secure: isProduction(), sameSite: "lax" as const, path: "/", maxAge: maxAgeSeconds };
}

async function requestContext() {
  const h = await headers();
  return { ip: ipFromHeaders(h), userAgent: (h.get("user-agent") ?? "").slice(0, 300) };
}

async function openSession(adminId: string): Promise<void> {
  const { userAgent, ip } = await requestContext();
  const token = randomToken();
  await query(
    "INSERT INTO admin_session (admin_id, token_hash, user_agent, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))",
    [adminId, tokenHash(token, SESSION_PURPOSE), userAgent, SESSION_DAYS],
  );
  await query("UPDATE admin_user SET last_login_at = now() WHERE id = $1", [adminId]);
  await audit(adminId, "login", "admin", adminId, {}, ip);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 86_400));
}

/** Administratrice connectée (vérifiée en base à chaque requête), ou null. */
export const currentAdmin = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const row = await queryOne<{ session_id: string; id: string; email: string; name: string; totp_enabled: boolean; last_seen_at: Date }>(
    `SELECT s.id AS session_id, s.last_seen_at, a.id, a.email, a.name, a.totp_enabled
     FROM admin_session s JOIN admin_user a ON a.id = s.admin_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
       AND s.last_seen_at > now() - make_interval(days => $2)
       AND s.created_at >= a.password_changed_at`,
    [tokenHash(token, SESSION_PURPOSE), IDLE_DAYS],
  );
  if (!row) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > 5 * 60_000) {
    await query("UPDATE admin_session SET last_seen_at = now() WHERE id = $1", [row.session_id]);
  }
  return { id: row.id, email: row.email, name: row.name, totpEnabled: row.totp_enabled, sessionId: row.session_id };
});

/** Pages de l'administration : redirige vers la connexion si nécessaire. */
export async function requireAdminPage(): Promise<AdminUser> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/connexion");
  return admin;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expirée : reconnectez-vous.");
  }
}

/** Actions et API de l'administration : refuse toute requête non authentifiée. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await currentAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}

export type LoginResult = { ok: true } | { ok: false; error: string } | { ok: "totp"; challenge: string };

export async function login(emailInput: string, password: string): Promise<LoginResult> {
  const { ip } = await requestContext();
  const email = emailInput.trim().toLowerCase().slice(0, 254);
  const byIp = await hit(`login:ip:${ip}`, 10, 15 * 60);
  const byAccount = await hit(`login:acct:${email}`, 8, 15 * 60);
  if (!byIp.allowed || !byAccount.allowed) {
    return { ok: false, error: `Trop de tentatives. Réessayez dans ${Math.ceil(Math.max(byIp.retryAfter, byAccount.retryAfter) / 60)} minutes.` };
  }
  const admin = await queryOne<{ id: string; password_hash: string; totp_enabled: boolean }>(
    "SELECT id, password_hash, totp_enabled FROM admin_user WHERE email = $1",
    [email],
  );
  // Même durée de calcul que le compte existe ou non (pas d'indice pour un attaquant).
  const valid = await verifyPassword(password.slice(0, 200), admin?.password_hash ?? (await dummyPasswordHash()));
  if (!admin || !valid) {
    await audit(admin?.id ?? null, "login_failed", "admin", admin?.id ?? "", {}, ip);
    return { ok: false, error: "E-mail ou mot de passe incorrect." };
  }
  if (admin.totp_enabled) {
    return { ok: "totp", challenge: signShortLived(admin.id, "login-totp", 5 * 60_000) };
  }
  await resetBucket(`login:acct:${email}`);
  await openSession(admin.id);
  return { ok: true };
}

export async function loginWithTotp(challenge: string, code: string): Promise<LoginResult> {
  const { ip } = await requestContext();
  const adminId = readShortLived(challenge, "login-totp");
  if (!adminId) return { ok: false, error: "Délai dépassé : recommencez la connexion." };
  const limit = await hit(`totp:${adminId}`, 6, 15 * 60);
  if (!limit.allowed) return { ok: false, error: "Trop de codes incorrects. Réessayez dans quelques minutes." };
  const ok = await transaction(async (c) => {
    const row = await queryOne<{ totp_secret_enc: string | null; totp_last_step: string | null }>(
      "SELECT totp_secret_enc, totp_last_step FROM admin_user WHERE id = $1 AND totp_enabled FOR UPDATE",
      [adminId],
      c,
    );
    if (!row?.totp_secret_enc) return false;
    const step = verifyTotp(decrypt(row.totp_secret_enc, TOTP_PURPOSE), code.replace(/\s/g, ""), row.totp_last_step === null ? null : Number(row.totp_last_step));
    if (step === null) return false;
    await query("UPDATE admin_user SET totp_last_step = $2 WHERE id = $1", [adminId, step], c);
    return true;
  });
  if (!ok) {
    await audit(adminId, "login_totp_failed", "admin", adminId, {}, ip);
    return { ok: false, error: "Code incorrect." };
  }
  await openSession(adminId);
  return { ok: true };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("UPDATE admin_session SET revoked_at = now() WHERE token_hash = $1", [tokenHash(token, SESSION_PURPOSE)]);
  jar.delete(SESSION_COOKIE);
}

export async function revokeOtherSessions(admin: AdminUser): Promise<number> {
  const rows = await query("UPDATE admin_session SET revoked_at = now() WHERE admin_id = $1 AND id <> $2 AND revoked_at IS NULL RETURNING id", [admin.id, admin.sessionId]);
  await audit(admin.id, "sessions_revoked", "admin", admin.id, { count: rows.length });
  return rows.length;
}

export async function listSessions(adminId: string) {
  return query<{ id: string; user_agent: string; created_at: Date; last_seen_at: Date }>(
    `SELECT id, user_agent, created_at, last_seen_at FROM admin_session
     WHERE admin_id = $1 AND revoked_at IS NULL AND expires_at > now() AND last_seen_at > now() - make_interval(days => $2)
     ORDER BY last_seen_at DESC`,
    [adminId, IDLE_DAYS],
  );
}

/** Changement de mot de passe : toutes les autres sessions sont déconnectées. */
export async function changePassword(admin: AdminUser, current: string, next: string): Promise<string | null> {
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM admin_user WHERE id = $1", [admin.id]);
  if (!row || !(await verifyPassword(current, row.password_hash))) return "Mot de passe actuel incorrect.";
  await transaction(async (c) => {
    await query("UPDATE admin_user SET password_hash = $2, password_changed_at = now() WHERE id = $1", [admin.id, await hashPassword(next)], c);
    await query("UPDATE admin_session SET revoked_at = now() WHERE admin_id = $1 AND revoked_at IS NULL", [admin.id], c);
  });
  await audit(admin.id, "password_changed", "admin", admin.id);
  await openSession(admin.id);
  return null;
}

// ───────────── Double authentification ─────────────

export function encryptTotpSecret(secret: string): string {
  return encrypt(secret, TOTP_PURPOSE);
}

export async function enableTotp(admin: AdminUser, secret: string, code: string): Promise<boolean> {
  const step = verifyTotp(secret, code.replace(/\s/g, ""), null);
  if (step === null) return false;
  await query("UPDATE admin_user SET totp_secret_enc = $2, totp_enabled = true, totp_last_step = $3 WHERE id = $1", [admin.id, encryptTotpSecret(secret), step]);
  await audit(admin.id, "totp_enabled", "admin", admin.id);
  return true;
}

export async function disableTotp(admin: AdminUser, password: string): Promise<boolean> {
  const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM admin_user WHERE id = $1", [admin.id]);
  if (!row || !(await verifyPassword(password, row.password_hash))) return false;
  await query("UPDATE admin_user SET totp_enabled = false, totp_secret_enc = NULL, totp_last_step = NULL WHERE id = $1", [admin.id]);
  await audit(admin.id, "totp_disabled", "admin", admin.id);
  return true;
}

// ───────────── Mot de passe oublié ─────────────

const RESET_PURPOSE = "password-reset";

/** Renvoie le jeton à envoyer par e-mail, ou null (compte inconnu / trop de demandes). Réponse identique côté interface. */
export async function createPasswordReset(emailInput: string): Promise<{ token: string; email: string } | null> {
  const { ip } = await requestContext();
  const email = emailInput.trim().toLowerCase().slice(0, 254);
  const limit = await hit(`reset:${ip}`, 5, 60 * 60);
  const perAccount = await hit(`reset:acct:${email}`, 3, 60 * 60);
  if (!limit.allowed || !perAccount.allowed) return null;
  const admin = await queryOne<{ id: string }>("SELECT id FROM admin_user WHERE email = $1", [email]);
  if (!admin) return null;
  const token = randomToken();
  await query("INSERT INTO password_reset (admin_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '30 minutes')", [admin.id, tokenHash(token, RESET_PURPOSE)]);
  await audit(admin.id, "password_reset_requested", "admin", admin.id, {}, ip);
  return { token, email };
}

export async function resetPassword(token: string, password: string): Promise<boolean> {
  const ok = await transaction(async (c) => {
    const row = await queryOne<{ id: string; admin_id: string }>(
      "SELECT id, admin_id FROM password_reset WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE",
      [tokenHash(token.slice(0, 100), RESET_PURPOSE)],
      c,
    );
    if (!row) return null;
    await query("UPDATE password_reset SET used_at = now() WHERE admin_id = $1 AND used_at IS NULL", [row.admin_id], c);
    await query("UPDATE admin_user SET password_hash = $2, password_changed_at = now() WHERE id = $1", [row.admin_id, await hashPassword(password)], c);
    await query("UPDATE admin_session SET revoked_at = now() WHERE admin_id = $1 AND revoked_at IS NULL", [row.admin_id], c);
    return row.admin_id;
  });
  if (!ok) return false;
  await audit(ok, "password_reset", "admin", ok);
  return true;
}

// ───────────── Première installation ─────────────

export async function adminExists(): Promise<boolean> {
  return Boolean(await queryOne("SELECT 1 FROM admin_user LIMIT 1"));
}

export async function createFirstAdmin(setupToken: string, email: string, name: string, password: string): Promise<string | null> {
  const { ip } = await requestContext();
  const limit = await hit(`setup:${ip}`, 5, 60 * 60);
  if (!limit.allowed) return "Trop de tentatives.";
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected || expected.length < 16) return "L'installation n'est pas activée (ADMIN_SETUP_TOKEN absent ou trop court).";
  const { timingSafeEqual, createHash } = await import("node:crypto");
  const a = createHash("sha256").update(setupToken).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(a, b)) return "Jeton d'installation incorrect.";
  const created = await transaction(async (c) => {
    // Verrou : deux installations simultanées ne peuvent pas créer deux comptes.
    await c.query("LOCK TABLE admin_user IN EXCLUSIVE MODE");
    if (await queryOne("SELECT 1 FROM admin_user LIMIT 1", [], c)) return null;
    return queryOne<{ id: string }>("INSERT INTO admin_user (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id", [email, name, await hashPassword(password)], c);
  });
  if (!created) return "Un compte administrateur existe déjà.";
  await audit(created.id, "admin_created", "admin", created.id, {}, ip);
  await openSession(created.id);
  return null;
}
