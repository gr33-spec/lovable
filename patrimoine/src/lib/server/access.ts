import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";

// Accès « gestion locative » (Enora) : mot de passe défini par le
// propriétaire depuis l'application, stocké haché (scrypt + sel). Chaque
// changement ou désactivation incrémente la version, ce qui invalide les
// sessions et clés Face ID de cet accès.

const g = globalThis as unknown as { accessPool?: Pool; accessReady?: Promise<void>; accessCache?: { at: number; state: AccessState } };

function pool(): Pool {
  if (!g.accessPool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!connectionString) throw new Error("DATABASE_URL manquant");
    g.accessPool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 10_000 });
  }
  return g.accessPool;
}

async function ready(): Promise<void> {
  if (!g.accessReady) {
    g.accessReady = pool()
      .query(
        `CREATE TABLE IF NOT EXISTS app_access (
           id text PRIMARY KEY,
           password_hash text,
           enabled boolean NOT NULL DEFAULT false,
           version integer NOT NULL DEFAULT 0,
           label text,
           updated_at timestamptz NOT NULL DEFAULT now(),
           last_login_at timestamptz
         );`,
      )
      .then(() => undefined)
      .catch((err) => {
        g.accessReady = undefined;
        throw err;
      });
  }
  return g.accessReady;
}

export interface AccessState {
  enabled: boolean;
  version: number;
  label?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

const ID = "gestion";

export async function accessState(): Promise<AccessState> {
  // Lecture fréquente (chaque requête de l'espace gestion) : cache de 5 s.
  if (g.accessCache && Date.now() - g.accessCache.at < 5000) return g.accessCache.state;
  await ready();
  const res = await pool().query("SELECT enabled, version, label, updated_at, last_login_at FROM app_access WHERE id = $1", [ID]);
  const r = res.rows[0];
  const state: AccessState = r
    ? { enabled: r.enabled, version: r.version, label: r.label ?? undefined, updatedAt: new Date(r.updated_at).toISOString(), lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined }
    : { enabled: false, version: 0 };
  g.accessCache = { at: Date.now(), state };
  return state;
}

function hash(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 32);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function setAccessPassword(password: string, label?: string): Promise<AccessState> {
  await ready();
  await pool().query(
    `INSERT INTO app_access (id, password_hash, enabled, version, label, updated_at) VALUES ($1, $2, true, 1, $3, now())
     ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, enabled = true, version = app_access.version + 1, label = COALESCE(EXCLUDED.label, app_access.label), updated_at = now()`,
    [ID, hash(password), label ?? null],
  );
  g.accessCache = undefined;
  return accessState();
}

export async function disableAccess(): Promise<void> {
  await ready();
  await pool().query("UPDATE app_access SET enabled = false, password_hash = NULL, version = version + 1, updated_at = now() WHERE id = $1", [ID]);
  g.accessCache = undefined;
}

/** Vérifie le mot de passe de l'accès gestion ; renvoie la version en cas de succès. */
export async function checkAccessPassword(password: string): Promise<number | null> {
  await ready();
  const res = await pool().query("SELECT password_hash, enabled, version FROM app_access WHERE id = $1", [ID]);
  const r = res.rows[0];
  if (!r || !r.enabled || !r.password_hash || !password) return null;
  const [, saltHex, keyHex] = String(r.password_hash).split(":");
  const expected = Buffer.from(keyHex, "hex");
  const given = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  if (!timingSafeEqual(expected, given)) return null;
  await pool().query("UPDATE app_access SET last_login_at = now() WHERE id = $1", [ID]);
  return r.version as number;
}
