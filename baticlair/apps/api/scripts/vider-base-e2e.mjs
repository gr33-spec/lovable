// Vide la base des parcours e2e avant une série (dette n° 2, 21 octobre 2026) : les lots des séries précédentes, même
// département et même référence, faussaient les parcours groupé. Garde l'historique des migrations ; refuse toute base
// dont le nom ne contient pas « e2e » ou « test », pour ne jamais vider autre chose.
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquante");
if (!/(e2e|test)/i.test(new URL(url).pathname)) throw new Error(`Refus de vider ${new URL(url).pathname} : seule une base e2e ou test se vide`);
const client = new pg.Client({ connectionString: url });
await client.connect();
const { rows } = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`);
if (rows.length > 0) await client.query(`TRUNCATE TABLE ${rows.map((r) => `"public"."${r.tablename}"`).join(", ")} CASCADE`);
await client.end();
console.log(`Base e2e vidée : ${rows.length} table(s)`);
