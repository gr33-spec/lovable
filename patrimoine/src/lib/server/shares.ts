import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";

// Liens de partage en lecture seule : jeton aléatoire (256 bits) montré une
// seule fois, seule son empreinte SHA-256 est stockée. Chaque lien a une
// date d'expiration et peut être révoqué.

const g = globalThis as unknown as { sharesPool?: Pool; sharesReady?: Promise<void> };

function pool(): Pool {
  if (!g.sharesPool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!connectionString) throw new Error("DATABASE_URL manquant");
    g.sharesPool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 10_000 });
  }
  return g.sharesPool;
}

async function ready(): Promise<void> {
  if (!g.sharesReady) {
    g.sharesReady = pool()
      .query(
        `CREATE TABLE IF NOT EXISTS share_link (
           id text PRIMARY KEY,
           token_hash text NOT NULL UNIQUE,
           label text NOT NULL,
           expires_at timestamptz NOT NULL,
           created_at timestamptz NOT NULL DEFAULT now(),
           revoked_at timestamptz,
           last_used_at timestamptz,
           uses integer NOT NULL DEFAULT 0
         );`,
      )
      .then(() => undefined)
      .catch((err) => {
        g.sharesReady = undefined;
        throw err;
      });
  }
  return g.sharesReady;
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export interface ShareLink {
  id: string;
  label: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
  lastUsedAt?: string;
  uses: number;
}

function toLink(r: Record<string, unknown>): ShareLink {
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : undefined);
  return {
    id: r.id as string,
    label: r.label as string,
    expiresAt: iso(r.expires_at)!,
    createdAt: iso(r.created_at)!,
    revokedAt: iso(r.revoked_at),
    lastUsedAt: iso(r.last_used_at),
    uses: Number(r.uses ?? 0),
  };
}

export async function listShares(): Promise<ShareLink[]> {
  await ready();
  const res = await pool().query("SELECT * FROM share_link ORDER BY created_at DESC LIMIT 100");
  return res.rows.map(toLink);
}

export async function createShare(label: string, expiresAt: Date): Promise<{ link: ShareLink; token: string }> {
  await ready();
  const token = randomBytes(32).toString("base64url");
  const res = await pool().query(
    "INSERT INTO share_link (id, token_hash, label, expires_at) VALUES ($1, $2, $3, $4) RETURNING *",
    [randomUUID(), hash(token), label, expiresAt],
  );
  return { link: toLink(res.rows[0]), token };
}

export async function revokeShare(id: string): Promise<void> {
  await ready();
  await pool().query("UPDATE share_link SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL", [id]);
}

/** Lien valide (non expiré, non révoqué) correspondant au jeton, sinon undefined. */
export async function resolveShare(token: string | undefined, count = false): Promise<ShareLink | undefined> {
  if (!token || token.length < 30 || token.length > 100 || !/^[A-Za-z0-9_-]+$/.test(token)) return undefined;
  await ready();
  const res = await pool().query(
    count
      ? "UPDATE share_link SET last_used_at = now(), uses = uses + 1 WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now() RETURNING *"
      : "SELECT * FROM share_link WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()",
    [hash(token)],
  );
  return res.rowCount ? toLink(res.rows[0]) : undefined;
}

/** Lien encore valable (session de consultation ouverte avec ce lien). */
export async function shareActive(id: string): Promise<boolean> {
  await ready();
  const res = await pool().query("SELECT 1 FROM share_link WHERE id = $1 AND revoked_at IS NULL AND expires_at > now()", [id]);
  return (res.rowCount ?? 0) > 0;
}
