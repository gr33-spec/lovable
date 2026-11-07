// Lecture seule : les dernières exécutions IA de la base de prévisualisation (le crédit Anthropic est-il revenu ?). Clé : NEON_API_KEY, jamais imprimée.
const K = process.env.NEON_API_KEY;
const h = { authorization: `Bearer ${K}`, accept: "application/json" };
const j = async (u) => { const r = await fetch(`https://console.neon.tech/api/v2${u}`, { headers: h }); if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); };
const { projects } = await j("/projects?org_id=org-broad-brook-44084324");
for (const p of projects) {
  const { branches } = await j(`/projects/${p.id}/branches`);
  const b = branches.find((x) => x.name === "preview/claude/saas-achat-artisans-prompt-1lyihx");
  if (!b) continue;
  const { databases } = await j(`/projects/${p.id}/branches/${b.id}/databases`);
  const db = databases[0];
  const { uri } = await j(`/projects/${p.id}/connection_uri?branch_id=${b.id}&database_name=${db.name}&role_name=${db.owner_name}`);
  const host = new URL(uri).hostname;
  const sql = async (q) => { const r = await fetch(`https://${host}/sql`, { method: "POST", headers: { "Neon-Connection-String": uri, "content-type": "application/json", "Neon-Raw-Text-Output": "true" }, body: JSON.stringify({ query: q }) }); const t = await r.json(); if (!r.ok) throw new Error(t.message); return t.rows; };
  const cols = await sql(`select column_name from information_schema.columns where table_name='ai_execution'`);
  console.log("colonnes:", cols.map((c) => c.column_name).join(","));
  console.log(JSON.stringify(await sql(`select "createdAt", task, status, "errorCode", model, "inputTokens", "outputTokens" from ai_execution order by "createdAt" desc limit 4`), null, 1));
}
