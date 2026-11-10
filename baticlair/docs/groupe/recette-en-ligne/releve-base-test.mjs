// RELEVÉ DE LA BASE DE TEST AVANT ET APRÈS UN DÉPLOIEMENT (10 novembre 2026).
//
// Quand Neon refuse une nouvelle branche de sauvegarde (plafond de branches atteint, et aucune suppression sans l'accord de
// Greg), le point de retour est l'HISTORIQUE de la branche de test (restauration à un instant donné, durée dite ci-dessous).
// Ce script NE FAIT QUE LIRE : il note l'heure, la dernière migration et le nombre de lignes de chaque table de la branche
// de prévisualisation « preview/claude/saas-achat-artisans-prompt-1lyihx », puis, après le déploiement, compare. Il refuse
// la branche par défaut (production). Aucune donnée, aucune clé, aucune chaîne de connexion n'est imprimée.
//
//   node docs/groupe/recette-en-ligne/releve-base-test.mjs <fichier.json>             note l'état
//   node docs/groupe/recette-en-ligne/releve-base-test.mjs <fichier.json> --comparer  compare à l'état noté
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const K = process.env.NEON_API_KEY;
if (!K) throw new Error("NEON_API_KEY absente");
const fichier = process.argv[2];
if (!fichier) throw new Error("fichier du relevé manquant");
const SOURCE = "preview/claude/saas-achat-artisans-prompt-1lyihx";
const h = { authorization: `Bearer ${K}`, accept: "application/json" };
const api = async (u) => {
  const r = await fetch(`https://console.neon.tech/api/v2${u}`, { headers: h });
  if (!r.ok) throw new Error(`${u.split("?")[0]} ${r.status}`);
  return r.json();
};
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
const { projects } = await api("/projects?org_id=org-broad-brook-44084324");
let projet = null;
let source = null;
for (const p of projects) {
  const { branches } = await api(`/projects/${p.id}/branches`);
  const b = branches.find((x) => x.name === SOURCE);
  if (b) {
    projet = p;
    source = b;
    break;
  }
}
if (!projet || !source) throw new Error(`branche ${SOURCE} introuvable`);
if (source.default || source.primary || source.name === "main") throw new Error("REFUS : la source est la branche par défaut (production)");
const { project } = await api(`/projects/${projet.id}`);
const { databases } = await api(`/projects/${projet.id}/branches/${source.id}/databases`);
const db = databases[0];
const { uri } = await api(`/projects/${projet.id}/connection_uri?branch_id=${source.id}&database_name=${db.name}&role_name=${db.owner_name}`);
const hote = new URL(uri).hostname;
async function sql(q) {
  for (let essai = 0; ; essai++) {
    const r = await fetch(`https://${hote}/sql`, { method: "POST", headers: { "Neon-Connection-String": uri, "content-type": "application/json", "Neon-Raw-Text-Output": "true" }, body: JSON.stringify({ query: q }) });
    const t = await r.json().catch(() => ({}));
    if (r.ok) return t.rows;
    if (essai >= 10) throw new Error(`sql ${r.status}`);
    await attendre(3000);
  }
}
const tables = (await sql(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`)).map((r) => r.table_name);
const comptes = {};
for (const r of await sql(tables.map((t) => `select '${t}' as t, count(*)::text as n from "${t}"`).join(" union all "))) comptes[r.t] = Number(r.n);
const mig = await sql(`select migration_name from _prisma_migrations where finished_at is not null order by finished_at desc, migration_name desc limit 1`);
const etat = { le: new Date().toISOString(), branche: source.id, historiqueHeures: (project.history_retention_seconds ?? 0) / 3600, tables, comptes, derniereMigration: mig[0]?.migration_name ?? null };
const total = (e) => Object.values(e.comptes).reduce((a, b) => a + b, 0);
console.log(`branche de test : ${source.name} (${source.id}) ; historique Neon : ${etat.historiqueHeures} h`);
console.log(`${etat.tables.length} tables, ${total(etat)} lignes, dernière migration ${etat.derniereMigration}, relevé le ${etat.le}`);
if (!process.argv.includes("--comparer")) {
  writeFileSync(fichier, JSON.stringify(etat, null, 2));
  console.log(`POINT DE RETOUR : restaurer la branche ${source.id} à l'instant ${etat.le} (possible pendant ${etat.historiqueHeures} h).`);
} else {
  if (!existsSync(fichier)) throw new Error("aucun relevé à comparer");
  const avant = JSON.parse(readFileSync(fichier, "utf8"));
  const perdues = avant.tables.filter((t) => !etat.tables.includes(t));
  const moins = avant.tables.filter((t) => etat.tables.includes(t) && etat.comptes[t] < avant.comptes[t]).map((t) => `${t}: ${avant.comptes[t]} → ${etat.comptes[t]}`);
  const nouvelles = etat.tables.filter((t) => !avant.tables.includes(t));
  console.log(`avant : ${avant.tables.length} tables, ${total(avant)} lignes, dernière migration ${avant.derniereMigration}, le ${avant.le}`);
  console.log(`tables nouvelles (${nouvelles.length}) : ${nouvelles.join(", ") || "aucune"}`);
  if (perdues.length || moins.length) {
    console.log(`ÉCARTS : tables disparues [${perdues.join(", ")}] ; lignes en moins [${moins.join(" ; ")}]`);
    process.exitCode = 1;
  } else console.log("DONNÉES CONSERVÉES : aucune table disparue, aucune table d'avant n'a perdu de ligne.");
}
