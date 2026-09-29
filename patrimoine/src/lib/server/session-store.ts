import "server-only";
import { Pool } from "pg";
import type { Role, SessionInfo } from "./session";

// Révocation des sessions côté serveur. Le cookie de session est signé et
// suffit à prouver qui l'a obtenu ; la déconnexion inscrit en plus son
// identifiant ici, pour qu'une copie du cookie (appareil perdu, cookie
// dérobé) ne serve plus à rien. « Déconnecter tous les appareils » fixe une
// date avant laquelle toute session de ce rôle est refusée.

const g = globalThis as unknown as { sessPool?: Pool; sessReady?: Promise<void>; epochCache?: Map<string, { at: number; value: number }> };

function pool(): Pool {
  if (!g.sessPool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!connectionString) throw new Error("DATABASE_URL manquant");
    g.sessPool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 10_000 });
  }
  return g.sessPool;
}

async function ready(): Promise<void> {
  if (!g.sessReady) {
    g.sessReady = pool()
      .query(
        `CREATE TABLE IF NOT EXISTS session_revoked (
           jti text PRIMARY KEY,
           expires_at timestamptz NOT NULL
         );
         CREATE TABLE IF NOT EXISTS session_epoch (
           role text PRIMARY KEY,
           not_before bigint NOT NULL
         );`,
      )
      .then(() => undefined)
      .catch((err) => {
        g.sessReady = undefined;
        throw err;
      });
  }
  return g.sessReady;
}

/** Date (ms) avant laquelle les sessions de ce rôle sont refusées ; cache de 5 s. */
async function epoch(role: Role): Promise<number> {
  const cache = (g.epochCache ??= new Map());
  const hit = cache.get(role);
  if (hit && Date.now() - hit.at < 5000) return hit.value;
  await ready();
  const res = await pool().query("SELECT not_before FROM session_epoch WHERE role = $1", [role]);
  const value = res.rowCount ? Number(res.rows[0].not_before) : 0;
  cache.set(role, { at: Date.now(), value });
  return value;
}

/** Session encore valable côté serveur (ni déconnectée, ni antérieure à « tout déconnecter »). */
export async function sessionAlive(info: SessionInfo): Promise<boolean> {
  const notBefore = await epoch(info.role);
  // Sessions ouvertes avant cette protection (sans date) : refusées seulement après un « tout déconnecter ».
  if (notBefore && (info.iat ?? 0) < notBefore) return false;
  if (!info.jti) return true;
  await ready();
  const res = await pool().query("SELECT 1 FROM session_revoked WHERE jti = $1", [info.jti]);
  return !res.rowCount;
}

/** Déconnexion : cette session ne pourra plus être utilisée, même si le cookie a été copié. */
export async function revokeSession(info: SessionInfo, expiresAt: number): Promise<void> {
  if (!info.jti) return;
  await ready();
  await pool().query("INSERT INTO session_revoked (jti, expires_at) VALUES ($1, to_timestamp($2 / 1000.0)) ON CONFLICT (jti) DO NOTHING", [info.jti, expiresAt]);
  await pool().query("DELETE FROM session_revoked WHERE expires_at < now()");
}

/** Déconnecte toutes les sessions d'un rôle ouvertes jusqu'à maintenant. */
export async function revokeAllSessions(role: Role): Promise<number> {
  await ready();
  const now = Date.now();
  await pool().query("INSERT INTO session_epoch (role, not_before) VALUES ($1, $2) ON CONFLICT (role) DO UPDATE SET not_before = EXCLUDED.not_before", [role, now]);
  g.epochCache?.delete(role);
  return now;
}
