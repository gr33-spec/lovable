// Temps et volumes de chaque travail : durée et modèle relevés dans les journaux des lots ; volumes de texte lus et écrits
// mesurés sur les fichiers (consignes + devis en entrée, réponse en sortie) pour estimer le coût en production.
import fs from "node:fs";
import path from "node:path";
const T = "/tmp/claude-0/-home-user-lovable/b47d3cff-6ecf-5a0f-9a71-2342a1956b8c/tasks";
const anciennes = (() => { try { return JSON.parse(fs.readFileSync("resultats/mesures.json", "utf8")); } catch { return {}; } })();
const M = { ...anciennes };
for (const f of fs.existsSync(T) ? fs.readdirSync(T) : []) {
  let o; try { o = JSON.parse(fs.readFileSync(path.join(T, f), "utf8")); } catch { continue; }
  const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if (x.type === "workflow_agent" && x.label && x.state === "done") M[x.label] = { modele: x.model, ms: x.durationMs, jetons: x.tokens, outils: x.toolCalls }; Object.values(x).forEach(walk); } };
  walk(o);
}
const taille = (p) => { try { return fs.statSync(p).size; } catch { return 0; } };
for (const [id, m] of Object.entries(M)) {
  const j = `travaux/${id}.md`; if (!fs.existsSync(j)) continue;
  const t = fs.readFileSync(j, "utf8"), chemins = [...t.matchAll(/`([^`]+\.(?:txt|json|pdf|jpg|md))`/g)].map((x) => x[1]);
  const sortie = chemins[chemins.length - 1];
  // Entrée : consignes et pièces en texte ; un PDF ou une photo compte ≈ 1 600 jetons par page (image), mis à part.
  m.entreeCar = chemins.slice(0, -1).filter((p) => /\.(txt|json)$/.test(p)).reduce((s, p) => s + taille(p), 0);
  m.pages = chemins.filter((p) => /\.jpg$/.test(p)).length + (chemins.some((p) => /\.pdf$/.test(p)) ? 2 : 0);
  m.sortieCar = taille(sortie);
}
fs.writeFileSync("resultats/mesures.json", JSON.stringify(M, null, 1));
console.log(Object.keys(M).length, "travaux mesurés");
