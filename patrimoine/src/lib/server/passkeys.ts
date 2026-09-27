import "server-only";
import { Pool } from "pg";
import { secretTag } from "./session";

// Clés d'accès (Face ID / Touch ID) enregistrées. Chaque clé est liée au mot
// de passe en vigueur lors de son ajout : changer APP_PASSWORD désactive
// toutes les clés, comme toutes les sessions.

const g = globalThis as unknown as { passkeyPool?: Pool; passkeyReady?: Promise<void> };

function pool(): Pool {
  if (!g.passkeyPool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!connectionString) throw new Error("DATABASE_URL manquant");
    g.passkeyPool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 10_000 });
  }
  return g.passkeyPool;
}

async function ready(): Promise<void> {
  if (!g.passkeyReady) {
    g.passkeyReady = pool()
      .query(
        `CREATE TABLE IF NOT EXISTS passkey (
           id text PRIMARY KEY,
           public_key bytea NOT NULL,
           counter bigint NOT NULL DEFAULT 0,
           transports text,
           name text NOT NULL,
           secret_tag text NOT NULL,
           rp_id text NOT NULL,
           created_at timestamptz NOT NULL DEFAULT now(),
           last_used_at timestamptz
         );`,
      )
      .then(() => undefined)
      .catch((err) => {
        g.passkeyReady = undefined;
        throw err;
      });
  }
  return g.passkeyReady;
}

export interface StoredPasskey {
  id: string;
  publicKey: Uint8Array<ArrayBuffer>;
  counter: number;
  transports?: string[];
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

function toPasskey(r: Record<string, unknown>): StoredPasskey {
  return {
    id: r.id as string,
    publicKey: Uint8Array.from(r.public_key as Buffer),
    counter: Number(r.counter),
    transports: r.transports ? String(r.transports).split(",").filter(Boolean) : undefined,
    name: r.name as string,
    createdAt: new Date(r.created_at as string).toISOString(),
    lastUsedAt: r.last_used_at ? new Date(r.last_used_at as string).toISOString() : undefined,
  };
}

/** Clés valides pour le mot de passe actuel et ce domaine. */
export async function listPasskeys(rpId: string): Promise<StoredPasskey[]> {
  await ready();
  const res = await pool().query("SELECT * FROM passkey WHERE secret_tag = $1 AND rp_id = $2 ORDER BY created_at", [secretTag(), rpId]);
  return res.rows.map(toPasskey);
}

export async function findPasskey(id: string, rpId: string): Promise<StoredPasskey | undefined> {
  await ready();
  const res = await pool().query("SELECT * FROM passkey WHERE id = $1 AND secret_tag = $2 AND rp_id = $3", [id, secretTag(), rpId]);
  return res.rowCount ? toPasskey(res.rows[0]) : undefined;
}

export async function savePasskey(p: { id: string; publicKey: Uint8Array; counter: number; transports?: string[]; name: string; rpId: string }): Promise<void> {
  await ready();
  await pool().query(
    `INSERT INTO passkey (id, public_key, counter, transports, name, secret_tag, rp_id) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET public_key = EXCLUDED.public_key, counter = EXCLUDED.counter, name = EXCLUDED.name, secret_tag = EXCLUDED.secret_tag, rp_id = EXCLUDED.rp_id`,
    [p.id, Buffer.from(p.publicKey), p.counter, (p.transports ?? []).join(","), p.name, secretTag(), p.rpId],
  );
}

export async function touchPasskey(id: string, counter: number): Promise<void> {
  await ready();
  await pool().query("UPDATE passkey SET counter = $2, last_used_at = now() WHERE id = $1", [id, counter]);
}

export async function deletePasskey(id: string): Promise<void> {
  await ready();
  await pool().query("DELETE FROM passkey WHERE id = $1", [id]);
}
