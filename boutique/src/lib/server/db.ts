import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Accès unique à PostgreSQL, uniquement côté serveur. Toutes les requêtes
// sont paramétrées ($1, $2…) : aucune concaténation de texte utilisateur.

const globalForDb = globalThis as unknown as { boutiquePool?: Pool };

function sslConfig(url: URL): false | { ca?: string; rejectUnauthorized: boolean } {
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (local) return false;
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  // Chiffrement vérifié : avec le certificat du fournisseur s'il est fourni,
  // sinon avec les autorités reconnues du système.
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true };
}

export function pool(): Pool {
  if (!globalForDb.boutiquePool) {
    const raw = process.env.DATABASE_URL;
    if (!raw) throw new Error("DATABASE_URL manquant : la base de données n'est pas configurée.");
    const url = new URL(raw);
    // Les paramètres sslmode de l'URL remplaceraient la configuration ci-dessous.
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
    globalForDb.boutiquePool = new Pool({
      connectionString: url.toString(),
      ssl: sslConfig(url),
      max: Number(process.env.DATABASE_POOL_MAX ?? 4),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      // Délai côté client (compatible avec le « pooler » de Supabase, qui refuse certains paramètres de connexion).
      query_timeout: 15_000,
    });
    globalForDb.boutiquePool.on("error", (err) => console.error("[db] erreur de connexion inactive", err.message));
  }
  return globalForDb.boutiquePool;
}

export type Queryable = Pick<PoolClient, "query">;

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = [], client?: Queryable): Promise<T[]> {
  const res = await (client ?? pool()).query<T>(sql, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = [], client?: Queryable): Promise<T | null> {
  const rows = await query<T>(sql, params, client);
  return rows[0] ?? null;
}

/** Transaction : tout ou rien. Rejouée automatiquement en cas de conflit de sérialisation / interblocage. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      const code = (err as { code?: string }).code;
      if ((code === "40001" || code === "40P01") && attempt < attempts) continue;
      throw err;
    } finally {
      client.release();
    }
  }
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const e = err as { code?: string; constraint?: string };
  return e?.code === "23505" && (!constraint || e.constraint === constraint);
}

export function isForeignKeyViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "23503";
}
