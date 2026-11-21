import { execFileSync } from "node:child_process";
import pg from "pg";

/**
 * Base de test repartie de zéro à chaque exécution, puis migrations
 * appliquées exactement comme en production (`prisma migrate deploy`).
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/baticlair_test";
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
