// SAUVEGARDE DE LA BASE DE TEST AVANT UN DÉPLOIEMENT (Greg, 1er novembre 2026).
//
// Crée, sur Neon, une branche « sauvegarde-avant-mes-listes » copiée de la branche de PRÉVISUALISATION
// « preview/claude/saas-achat-artisans-prompt-1lyihx » (celle de test.mobiiz.fr), puis vérifie la copie : même liste
// de tables, même nombre de lignes par table, même dernière migration. Refuse de toucher la branche par défaut
// (« main », la production) ou toute autre branche. Rien n'est écrit dans la base de test ; aucune donnée n'est
// imprimée (seulement des noms de tables et des nombres). NEON_API_KEY et les chaînes de connexion ne sont JAMAIS
// imprimées.
//
//   node docs/groupe/recette-en-ligne/sauvegarde-neon.mjs           crée (si absente) et vérifie
//   node docs/groupe/recette-en-ligne/sauvegarde-neon.mjs --verifier vérifie seulement
const K = process.env.NEON_API_KEY;
if (!K) throw new Error("NEON_API_KEY absente");
const SOURCE = "preview/claude/saas-achat-artisans-prompt-1lyihx";
// Le nom se choisit par déploiement (`SAUVEGARDE_NOM`), pour garder les sauvegardes précédentes.
const SAUVEGARDE = process.env.SAUVEGARDE_NOM?.trim() || "sauvegarde-avant-mes-listes";
const h = { authorization: `Bearer ${K}`, accept: "application/json", "content-type": "application/json" };
const api = async (u, init = {}) => {
  const r = await fetch(`https://console.neon.tech/api/v2${u}`, { headers: h, ...init });
  const t = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${u.split("?")[0]} ${r.status} ${t.message ?? ""}`);
  return t;
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
    var toutes = branches;
    break;
  }
}
if (!projet || !source) throw new Error(`branche ${SOURCE} introuvable`);
// Garde : jamais la production.
if (source.default || source.primary || source.name === "main") throw new Error("REFUS : la source est la branche par défaut (production)");
const prod = toutes.find((x) => x.default);
console.log(`projet : ${projet.name}`);
console.log(`production (branche par défaut, NON touchée) : ${prod?.name} (${prod?.id})`);
console.log(`source (test) : ${source.name} (${source.id}), par défaut : ${!!source.default}`);

let sauvegarde = toutes.find((x) => x.name === SAUVEGARDE);
if (!sauvegarde && !process.argv.includes("--verifier")) {
  const cree = await api(`/projects/${projet.id}/branches`, {
    method: "POST",
    body: JSON.stringify({ branch: { name: SAUVEGARDE, parent_id: source.id }, endpoints: [{ type: "read_only" }] }),
  });
  sauvegarde = cree.branch;
  console.log(`sauvegarde CRÉÉE : ${sauvegarde.name} (${sauvegarde.id}), parent ${sauvegarde.parent_id}, lsn ${sauvegarde.parent_lsn ?? "?"}, le ${sauvegarde.created_at}`);
  for (let i = 0; i < 60; i++) {
    const { branch } = await api(`/projects/${projet.id}/branches/${sauvegarde.id}`);
    if (branch.current_state === "ready") break;
    await attendre(2000);
  }
} else if (sauvegarde) {
  console.log(`sauvegarde existante : ${sauvegarde.name} (${sauvegarde.id}), parent ${sauvegarde.parent_id}, lsn ${sauvegarde.parent_lsn ?? "?"}, le ${sauvegarde.created_at}`);
}
if (!sauvegarde) throw new Error("aucune sauvegarde");
if (sauvegarde.parent_id !== source.id) throw new Error("REFUS : la sauvegarde ne vient pas de la branche de test");

// Une branche sans point d'accès (créée sans) en reçoit un en lecture seule pour la vérification.
const { endpoints } = await api(`/projects/${projet.id}/branches/${sauvegarde.id}/endpoints`);
if (endpoints.length === 0) {
  await api(`/projects/${projet.id}/endpoints`, { method: "POST", body: JSON.stringify({ endpoint: { branch_id: sauvegarde.id, type: "read_only" } }) });
}

async function sqlDe(branche) {
  const { databases } = await api(`/projects/${projet.id}/branches/${branche.id}/databases`);
  const db = databases[0];
  const { uri } = await api(`/projects/${projet.id}/connection_uri?branch_id=${branche.id}&database_name=${db.name}&role_name=${db.owner_name}`);
  const host = new URL(uri).hostname;
  return async (q) => {
    for (let essai = 0; ; essai++) {
      const r = await fetch(`https://${host}/sql`, { method: "POST", headers: { "Neon-Connection-String": uri, "content-type": "application/json", "Neon-Raw-Text-Output": "true" }, body: JSON.stringify({ query: q }) });
      const t = await r.json().catch(() => ({}));
      if (r.ok) return t.rows;
      if (essai >= 10) throw new Error(`sql ${r.status} ${t.message ?? ""}`);
      await attendre(3000);
    }
  };
}

async function etat(sql) {
  const tables = (await sql(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`)).map((r) => r.table_name);
  const comptes = {};
  // Un seul aller-retour : le nombre de lignes de chaque table.
  const union = tables.map((t) => `select '${t}' as t, count(*)::text as n from "${t}"`).join(" union all ");
  for (const r of await sql(union)) comptes[r.t] = Number(r.n);
  const mig = await sql(`select migration_name from _prisma_migrations where finished_at is not null order by finished_at desc, migration_name desc limit 1`);
  const nbMig = await sql(`select count(*)::text as n from _prisma_migrations where finished_at is not null`);
  return { tables, comptes, derniereMigration: mig[0]?.migration_name ?? null, migrations: Number(nbMig[0].n) };
}

const [eSource, eSauvegarde] = await Promise.all([etat(await sqlDe(source)), etat(await sqlDe(sauvegarde))]);
const diff = [];
for (const t of new Set([...eSource.tables, ...eSauvegarde.tables])) if (eSource.comptes[t] !== eSauvegarde.comptes[t]) diff.push(`${t}: test ${eSource.comptes[t]} / sauvegarde ${eSauvegarde.comptes[t]}`);
const total = (e) => Object.values(e.comptes).reduce((a, b) => a + b, 0);
console.log(`test       : ${eSource.tables.length} tables, ${total(eSource)} lignes, ${eSource.migrations} migrations, dernière ${eSource.derniereMigration}`);
console.log(`sauvegarde : ${eSauvegarde.tables.length} tables, ${total(eSauvegarde)} lignes, ${eSauvegarde.migrations} migrations, dernière ${eSauvegarde.derniereMigration}`);
console.log(`ligne_rapprochement présente sur test : ${eSource.tables.includes("ligne_rapprochement")}`);
for (const t of ["project", "company", "price_request", "user"]) if (t in eSource.comptes) console.log(`  ${t} : test ${eSource.comptes[t]} / sauvegarde ${eSauvegarde.comptes[t]}`);
if (diff.length) {
  console.log(`ÉCARTS (${diff.length}) : ${diff.join(" ; ")}`);
  process.exitCode = 1;
} else console.log("VÉRIFIÉE : mêmes tables, mêmes nombres de lignes, même dernière migration.");
