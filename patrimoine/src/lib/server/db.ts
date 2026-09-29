import "server-only";
import { Pool, type PoolClient } from "pg";
import { applyOps, normalizeData, type Op } from "../ops";
import { emptyData, type AppData } from "../types";

// Stockage : un document JSON (toutes les données) versionné, plus des
// instantanés de sauvegarde. Les tables sont créées automatiquement au
// premier accès : aucune migration à lancer.

const globalForDb = globalThis as unknown as { pgPool?: Pool; schemaReady?: Promise<void> };

function pool(): Pool {
  if (!globalForDb.pgPool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL manquant : la base de données n'est pas configurée.");
    }
    globalForDb.pgPool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000 });
  }
  return globalForDb.pgPool;
}

async function ensureSchema(): Promise<void> {
  if (!globalForDb.schemaReady) {
    globalForDb.schemaReady = pool()
      .query(
        `CREATE TABLE IF NOT EXISTS app_document (
           id text PRIMARY KEY,
           data jsonb NOT NULL,
           version integer NOT NULL DEFAULT 1,
           updated_at timestamptz NOT NULL DEFAULT now()
         );
         CREATE TABLE IF NOT EXISTS app_snapshot (
           id serial PRIMARY KEY,
           created_at timestamptz NOT NULL DEFAULT now(),
           reason text NOT NULL,
           data jsonb NOT NULL
         );
         CREATE TABLE IF NOT EXISTS login_attempt (
           id serial PRIMARY KEY,
           ip text NOT NULL,
           created_at timestamptz NOT NULL DEFAULT now()
         );
         CREATE INDEX IF NOT EXISTS login_attempt_ip_idx ON login_attempt (ip, created_at);`,
      )
      .then(() => undefined)
      .catch((err) => {
        globalForDb.schemaReady = undefined;
        throw err;
      });
  }
  return globalForDb.schemaReady;
}

const DOC_ID = "main";
const MAX_SNAPSHOTS = 120;

export interface StoredDocument {
  data: AppData;
  version: number;
  exists: boolean;
  updatedAt?: string;
}

export async function loadDocument(): Promise<StoredDocument> {
  await ensureSchema();
  const res = await pool().query("SELECT data, version, updated_at FROM app_document WHERE id = $1", [DOC_ID]);
  if (res.rowCount === 0) return { data: emptyData(), version: 0, exists: false };
  const row = res.rows[0];
  return {
    data: normalizeData(row.data),
    version: row.version,
    exists: true,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

async function lockCurrent(client: PoolClient): Promise<{ data: AppData; version: number }> {
  await client.query(
    `INSERT INTO app_document (id, data, version) VALUES ($1, $2, 0) ON CONFLICT (id) DO NOTHING`,
    [DOC_ID, JSON.stringify(emptyData())],
  );
  const res = await client.query("SELECT data, version FROM app_document WHERE id = $1 FOR UPDATE", [DOC_ID]);
  return { data: normalizeData(res.rows[0].data), version: res.rows[0].version };
}

async function snapshot(client: PoolClient, data: AppData, reason: string) {
  await client.query("INSERT INTO app_snapshot (reason, data) VALUES ($1, $2)", [reason, JSON.stringify(data)]);
  await client.query(
    `DELETE FROM app_snapshot WHERE id NOT IN (SELECT id FROM app_snapshot ORDER BY created_at DESC LIMIT $1)`,
    [MAX_SNAPSHOTS],
  );
}

/** Sauvegarde automatique quotidienne : un instantané avant la première modification de la journée. */
async function dailySnapshot(client: PoolClient, data: AppData, version: number) {
  if (version === 0) return;
  const res = await client.query(
    "SELECT 1 FROM app_snapshot WHERE reason = 'auto' AND created_at > now() - interval '20 hours' LIMIT 1",
  );
  if (res.rowCount === 0) await snapshot(client, data, "auto");
}

async function write(client: PoolClient, data: AppData, version: number): Promise<number> {
  const next = version + 1;
  await client.query("UPDATE app_document SET data = $2, version = $3, updated_at = now() WHERE id = $1", [
    DOC_ID,
    JSON.stringify(data),
    next,
  ]);
  return next;
}

export async function applyDocumentOps(ops: Op[], transform?: (current: AppData, ops: Op[]) => Op[]): Promise<{ version: number; data: AppData }> {
  return withTransaction(async (client) => {
    const current = await lockCurrent(client);
    await dailySnapshot(client, current.data, current.version);
    // Filtrage éventuel (espace gestion) sur l'état verrouillé, pour fusionner sans rien écraser.
    const data = applyOps(current.data, transform ? transform(current.data, ops) : ops);
    const version = await write(client, data, current.version);
    return { version, data };
  });
}

/** Remplace toutes les données (import, restauration, démo) après un instantané de sécurité. */
export async function replaceDocument(data: AppData, reason: string): Promise<{ version: number }> {
  return withTransaction(async (client) => {
    const current = await lockCurrent(client);
    if (current.version > 0) await snapshot(client, current.data, reason);
    const version = await write(client, normalizeData(data), current.version);
    return { version };
  });
}

export interface SnapshotInfo {
  id: number;
  createdAt: string;
  reason: string;
  counts: { companies: number; buildings: number; loans: number };
}

export async function listSnapshots(): Promise<SnapshotInfo[]> {
  await ensureSchema();
  const res = await pool().query(
    `SELECT id, created_at, reason,
            jsonb_array_length(COALESCE(data->'companies', '[]'::jsonb)) AS companies,
            jsonb_array_length(COALESCE(data->'buildings', '[]'::jsonb)) AS buildings,
            jsonb_array_length(COALESCE(data->'loans', '[]'::jsonb)) AS loans
       FROM app_snapshot ORDER BY created_at DESC LIMIT $1`,
    [MAX_SNAPSHOTS],
  );
  return res.rows.map((r) => ({
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    reason: r.reason,
    counts: { companies: r.companies, buildings: r.buildings, loans: r.loans },
  }));
}

export async function getSnapshot(id: number): Promise<AppData | undefined> {
  await ensureSchema();
  const res = await pool().query("SELECT data FROM app_snapshot WHERE id = $1", [id]);
  return res.rowCount ? normalizeData(res.rows[0].data) : undefined;
}

export async function createManualSnapshot(): Promise<void> {
  await withTransaction(async (client) => {
    const current = await lockCurrent(client);
    await snapshot(client, current.data, "manuel");
  });
}

// ——— Limitation des tentatives de connexion ———

const MAX_FAILURES = 8;
const WINDOW_MINUTES = 15;
/** Toutes adresses confondues (attaque répartie sur de nombreuses adresses) : au-delà, pause générale. */
const MAX_GLOBAL_FAILURES = 60;

export async function isLoginBlocked(ip: string): Promise<boolean> {
  await ensureSchema();
  const res = await pool().query(
    `SELECT count(*) FILTER (WHERE ip = $1)::int AS n, count(*)::int AS total FROM login_attempt WHERE created_at > now() - ($2 || ' minutes')::interval`,
    [ip, String(WINDOW_MINUTES)],
  );
  return res.rows[0].n >= MAX_FAILURES || res.rows[0].total >= MAX_GLOBAL_FAILURES;
}

export async function recordLoginFailure(ip: string): Promise<void> {
  await ensureSchema();
  await pool().query("INSERT INTO login_attempt (ip) VALUES ($1)", [ip]);
  await pool().query("DELETE FROM login_attempt WHERE created_at < now() - interval '1 day'");
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await ensureSchema();
  await pool().query("DELETE FROM login_attempt WHERE ip = $1", [ip]);
}
