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
         ALTER TABLE app_file ADD COLUMN IF NOT EXISTS sha_verified boolean NOT NULL DEFAULT false;
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

export async function createFile(name: string, mime: string, size: number): Promise<string> {
  await ready();
  const id = randomUUID();
  const chunks = Math.max(1, Math.ceil(size / CHUNK_BYTES));
  // L'empreinte n'est jamais celle annoncée par le navigateur : elle est calculée
  // par le serveur sur le contenu reçu, une fois le fichier complet.
  await pool().query("INSERT INTO app_file (id, name, mime, size, chunks) VALUES ($1, $2, $3, $4, $5)", [id, name.slice(0, 200), mime, size, chunks]);
  return id;
}

/**
 * Empreintes des fichiers déposés avant leur généralisation : calculées à la
 * demande (quelques fichiers par appel), sans rien modifier d'autre.
 */
async function backfillHashes(limit = 40): Promise<void> {
  // Empreintes absentes, ou annoncées autrefois par le navigateur : recalculées sur le contenu.
  const res = await pool().query("SELECT id FROM app_file WHERE NOT sha_verified ORDER BY created_at DESC LIMIT $1", [limit]);
  for (const row of res.rows as { id: string }[]) {
    const file = await readFile(row.id).catch(() => undefined);
    if (!file) continue;
    await pool().query("UPDATE app_file SET sha256 = $2, sha_verified = true WHERE id = $1", [row.id, createHash("sha256").update(file.data).digest("hex")]);
  }
}

/** Fichiers déjà stockés avec la même empreinte (même contenu, octet pour octet). */
export async function findByHash(sha256: string): Promise<{ id: string; name: string }[]> {
  await ready();
  if (!/^[a-f0-9]{64}$/.test(sha256)) return [];
  await backfillHashes();
  const res = await pool().query("SELECT id, name FROM app_file WHERE sha256 = $1 AND sha_verified ORDER BY created_at", [sha256]);
  return res.rows as { id: string; name: string }[];
}

/** Signature des formats acceptés : le contenu doit correspondre au type déclaré. */
function matchesMime(mime: string, head: Buffer): boolean {
  if (mime === "application/pdf") return head.subarray(0, 1024).includes(Buffer.from("%PDF-"));
  if (mime === "image/jpeg") return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (mime === "image/png") return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return false;
}

/**
 * Envoi d'un morceau. Un fichier ne s'écrit qu'une fois : dès qu'il est
 * complet (ou au-delà de 24 h après sa création), plus aucun morceau n'est
 * accepté — un document enregistré ne peut pas être altéré.
 */
export async function putChunk(id: string, idx: number, data: Buffer): Promise<void> {
  await ready();
  const res = await pool().query(
    `SELECT f.chunks, f.mime, f.size, f.created_at > now() - interval '1 day' AS fresh,
            (SELECT count(*)::int FROM app_file_chunk c WHERE c.file_id = f.id) AS received
       FROM app_file f WHERE f.id = $1`,
    [id],
  );
  if (!res.rowCount) throw new Error("Fichier introuvable");
  const f = res.rows[0] as { chunks: number; mime: string; size: number; fresh: boolean; received: number };
  if (!Number.isInteger(idx) || idx < 0 || idx >= f.chunks) throw new Error("Morceau invalide");
  if (f.received >= f.chunks || !f.fresh) throw new Error("Fichier déjà enregistré : il ne peut pas être modifié");
  if (idx === 0 && !matchesMime(f.mime, data)) throw new Error("Le contenu du fichier ne correspond pas à son format (PDF, JPEG ou PNG)");
  await pool().query(
    "INSERT INTO app_file_chunk (file_id, idx, data) VALUES ($1, $2, $3) ON CONFLICT (file_id, idx) DO UPDATE SET data = EXCLUDED.data",
    [id, idx, data],
  );
  // Dernier morceau reçu : empreinte calculée sur le contenu réel (anti-doublon fiable).
  if (f.received + 1 >= f.chunks) {
    const file = await readFile(id).catch(() => undefined);
    if (file) await pool().query("UPDATE app_file SET sha256 = $2, sha_verified = true WHERE id = $1", [id, createHash("sha256").update(file.data).digest("hex")]);
  }
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

/** Date d'envoi d'un fichier (undefined s'il n'existe pas). */
export async function fileCreatedAt(id: string): Promise<Date | undefined> {
  await ready();
  const res = await pool().query("SELECT created_at FROM app_file WHERE id = $1", [id]);
  return res.rowCount ? new Date(res.rows[0].created_at) : undefined;
}

export async function deleteFile(id: string): Promise<void> {
  await ready();
  await pool().query("DELETE FROM app_file WHERE id = $1", [id]);
}
