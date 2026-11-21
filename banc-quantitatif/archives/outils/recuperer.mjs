// Un sous-agent a parfois répondu son JSON au lieu de l'écrire dans le fichier : on le reprend dans son journal.
//   node outils/recuperer.mjs <id du travail> <fichier de sortie>
import fs from "node:fs";
import path from "node:path";
const W = "/root/.claude/projects/-home-user-lovable/b47d3cff-6ecf-5a0f-9a71-2342a1956b8c/subagents/workflows";
const [id, sortie] = process.argv.slice(2);
let trouve = null;
for (const wf of fs.readdirSync(W)) {
  const j = path.join(W, wf, "journal.jsonl"); if (!fs.existsSync(j)) continue;
  for (const l of fs.readFileSync(j, "utf8").split("\n")) { if (!l.includes(`"${id}"`)) continue; try { const o = JSON.parse(l); if (o.label === id && o.agentId) trouve = path.join(W, wf, `agent-${o.agentId}.jsonl`); } catch {} }
}
if (!trouve || !fs.existsSync(trouve)) { console.log(id, "journal introuvable"); process.exit(0); }
let texte = null;
for (const l of fs.readFileSync(trouve, "utf8").split("\n")) { try { const o = JSON.parse(l); const c = o.message?.content; if (o.type === "assistant" && Array.isArray(c)) for (const b of c) { if (b.type === "text" && b.text.includes("{")) texte = b.text; if (b.type === "tool_use" && b.input && typeof b.input === "object") { const s = Object.values(b.input).find((v) => typeof v === "string" && v.trim().startsWith("{") && v.length > 200); if (s) texte = s; else if (b.input.lignes || b.input.ouvrages) texte = JSON.stringify(b.input); } } } catch {} }
if (!texte) { console.log(id, "rien à reprendre"); process.exit(0); }
const t = texte.slice(texte.indexOf("{"), texte.lastIndexOf("}") + 1);
try { JSON.parse(t); fs.mkdirSync(path.dirname(sortie), { recursive: true }); fs.writeFileSync(sortie, t); console.log(id, "repris"); } catch { console.log(id, "JSON illisible"); }
