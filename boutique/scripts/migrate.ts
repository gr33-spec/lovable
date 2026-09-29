// Applique les migrations SQL versionnées (db/migrations/NNN_nom.sql), dans
// l'ordre, une seule fois chacune, dans une transaction verrouillée (deux
// déploiements simultanés ne peuvent pas migrer en même temps). Une migration
// déjà appliquée ne doit jamais être modifiée : son empreinte est vérifiée.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

export async function migrate(databaseUrl: string, log: (msg: string) => void = console.log): Promise<string[]> {
  const url = new URL(databaseUrl);
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  const client = new Client({
    connectionString: url.toString(),
    ssl: local ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true },
  });
  await client.connect();
  const dir = path.join(__dirname, "..", "db", "migrations");
  const files = readdirSync(dir).filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f)).sort();
  const applied: string[] = [];
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(4242001)");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migration (
      version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    await client.query("ALTER TABLE schema_migration ENABLE ROW LEVEL SECURITY");
    const done = new Map(
      (await client.query<{ version: string; checksum: string }>("SELECT version, checksum FROM schema_migration")).rows.map((r) => [r.version, r.checksum]),
    );
    for (const file of files) {
      const sql = readFileSync(path.join(dir, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const version = file.replace(/\.sql$/, "");
      const previous = done.get(version);
      if (previous) {
        if (previous !== checksum) throw new Error(`La migration ${file} a été modifiée après avoir été appliquée. Créez une nouvelle migration.`);
        continue;
      }
      log(`→ migration ${file}`);
      await client.query(sql);
      await client.query("INSERT INTO schema_migration (version, checksum) VALUES ($1, $2)", [version, checksum]);
      applied.push(version);
    }
    // Garde-fou : aucune table publique sans RLS (sinon lisible par l'API Supabase).
    const open = await client.query<{ tablename: string }>(
      `SELECT c.relname AS tablename FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`,
    );
    if (open.rows.length) throw new Error(`Tables sans RLS : ${open.rows.map((r) => r.tablename).join(", ")}`);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    await client.end();
  }
  log(applied.length ? `✓ ${applied.length} migration(s) appliquée(s)` : "✓ Base à jour");
  return applied;
}

if (require.main === module) {
  const url = process.env.DATABASE_URL_MIGRATIONS || process.env.DATABASE_URL;
  if (!url) {
    // Premier déploiement sans base : on laisse la construction continuer,
    // le site affichera « base non configurée ».
    console.warn("DATABASE_URL absent : migrations ignorées.");
    process.exit(0);
  }
  migrate(url).catch((err) => {
    console.error("✗ Échec des migrations :", err.message);
    process.exit(1);
  });
}
