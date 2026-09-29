import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";

// Stockage des PDF (bilans) dans la base, par morceaux : les envois vers le
// serveur sont limités en taille, un gros PDF est donc découpé côté navigateur.

const g = globalThis as unknown as { filesPool?: Pool; filesReady?: Promise<void> };

function pool(): Pool {
  if (!g.filesPool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!connectionString) throw new Error("DATABASE_URL manquant");
    g.filesPool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 10_000 });
  }
  return g.filesPool;
}

async function ready(): Promise<void> {
  if (!g.filesReady) {
    g.filesReady = pool()
      .query(
        `CREATE TABLE IF NOT EXISTS app_file (
           id text PRIMARY KEY,
           name text NOT NULL,
           mime text NOT NULL,
           size integer NOT NULL,
           chunks integer NOT NULL,
           created_at timestamptz NOT NULL DEFAULT now()
         );
         CREATE TABLE IF NOT EXISTS app_file_chunk (
           file_id text NOT NULL REFERENCES app_file(id) ON DELETE CASCADE,
           idx integer NOT NULL,
           data bytea NOT NULL,
           PRIMARY KEY (file_id, idx)
         );
         ALTER TABLE app_file ADD COLUMN IF NOT EXISTS sha256 text;
         CREATE INDEX IF NOT EXISTS app_file_sha256 ON app_file (sha256);`,
      )
      .then(() => undefined)
      .catch((err) => {
        g.filesReady = undefined;
        throw err;
      });
  }
  return g.filesReady;
}

export const MAX_FILE_BYTES = 24 * 1024 * 1024;
export const CHUNK_BYTES = 3 * 1024 * 1024;

export async function createFile(name: string, mime: string, size: number, sha256?: string): Promise<string> {
  await ready();
  const id = randomUUID();
  const chunks = Math.max(1, Math.ceil(size / CHUNK_BYTES));
  const hash = sha256 && /^[a-f0-9]{64}$/.test(sha256) ? sha256 : null;
  await pool().query("INSERT INTO app_file (id, name, mime, size, chunks, sha256) VALUES ($1, $2, $3, $4, $5, $6)", [id, name.slice(0, 200), mime, size, chunks, hash]);
  return id;
}

/**
 * Empreintes des fichiers déposés avant leur généralisation : calculées à la
 * demande (quelques fichiers par appel), sans rien modifier d'autre.
 */
async function backfillHashes(limit = 40): Promise<void> {
  const res = await pool().query("SELECT id FROM app_file WHERE sha256 IS NULL ORDER BY created_at DESC LIMIT $1", [limit]);
  for (const row of res.rows as { id: string }[]) {
    const file = await readFile(row.id).catch(() => undefined);
    if (!file) continue;
    await pool().query("UPDATE app_file SET sha256 = $2 WHERE id = $1", [row.id, createHash("sha256").update(file.data).digest("hex")]);
  }
}

/** Fichiers déjà stockés avec la même empreinte (même contenu, octet pour octet). */
export async function findByHash(sha256: string): Promise<{ id: string; name: string }[]> {
  await ready();
  if (!/^[a-f0-9]{64}$/.test(sha256)) return [];
  await backfillHashes();
  const res = await pool().query("SELECT id, name FROM app_file WHERE sha256 = $1 ORDER BY created_at", [sha256]);
  return res.rows as { id: string; name: string }[];
}

export async function putChunk(id: string, idx: number, data: Buffer): Promise<void> {
  await ready();
  const res = await pool().query("SELECT chunks FROM app_file WHERE id = $1", [id]);
  if (!res.rowCount) throw new Error("Fichier introuvable");
  if (idx < 0 || idx >= res.rows[0].chunks) throw new Error("Morceau invalide");
  await pool().query(
    "INSERT INTO app_file_chunk (file_id, idx, data) VALUES ($1, $2, $3) ON CONFLICT (file_id, idx) DO UPDATE SET data = EXCLUDED.data",
    [id, idx, data],
  );
}

export async function readFile(id: string): Promise<{ name: string; mime: string; data: Buffer } | undefined> {
  await ready();
  const meta = await pool().query("SELECT name, mime, size, chunks FROM app_file WHERE id = $1", [id]);
  if (!meta.rowCount) return undefined;
  const parts = await pool().query("SELECT idx, data FROM app_file_chunk WHERE file_id = $1 ORDER BY idx", [id]);
  if (parts.rowCount !== meta.rows[0].chunks) throw new Error("Fichier incomplet");
  const data = Buffer.concat(parts.rows.map((r) => r.data as Buffer));
  if (data.length !== meta.rows[0].size) throw new Error("Taille du fichier incohérente");
  return { name: meta.rows[0].name, mime: meta.rows[0].mime, data };
}

export async function deleteFile(id: string): Promise<void> {
  await ready();
  await pool().query("DELETE FROM app_file WHERE id = $1", [id]);
}
