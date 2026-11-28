// Les tableaux du compte rendu, à partir des notes.
import fs from "node:fs";
const L = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const N = L("resultats/notes.json"), C = L("resultats/couts.json") ?? {}, S = L("resultats/stabilite.json") ?? {};
const jeu = (c) => (/^R/.test(c) ? "reel" : +c.slice(1) <= 10 ? "entrainement" : "examen");
const table = (filtre, titre) => {
  const g = {};
  for (const n of N) { if (n.absent || !filtre(n)) continue; const a = (g[n.m] ??= { n: 0 }); a.n++; for (const k of ["nRef", "justes", "quantite", "manquantes", "inventees", "doutes", "questions", "questionsRef", "questionsInutiles", "questionsHorsRef", "questionsOubliees"]) a[k] = (a[k] ?? 0) + n[k]; }
  console.log(`\n### ${titre}\n| Méthode | Lectures | Lignes justes | Quantité fausse | Manquantes | Inventées | Doutes | Questions (réf.) | Inutiles | Autres hors réf. | Oubliées |\n|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const [m, a] of Object.entries(g).sort((x, y) => (x[0].replace(/\D/g, "") || 99) - (y[0].replace(/\D/g, "") || 99) || x[0].localeCompare(y[0]))) console.log(`| ${m} | ${a.n} | ${a.justes}/${a.nRef} (${Math.round((100 * a.justes) / a.nRef)} %) | ${a.quantite} | ${a.manquantes} | ${a.inventees} | ${a.doutes} | ${a.questions} (${a.questionsRef}) | ${a.questionsInutiles} | ${a.questionsHorsRef - a.questionsInutiles} | ${a.questionsOubliees} |`);
};
table((n) => jeu(n.c) === "entrainement" && n.e === 1, "Tour 1 : 10 chantiers d'entraînement, une lecture");
table((n) => jeu(n.c) === "entrainement", "Tour 2 : toutes les lectures répétées (entraînement)");
table((n) => jeu(n.c) === "examen", "Examen final : 5 chantiers gardés de côté");
table((n) => jeu(n.c) === "reel", "Devis réels (D-2026-024 et jeu de test existant)");
console.log("\n### Stabilité (tour 2)\n| Méthode | Lectures | Chantiers avec les mêmes quantités | Même liste mot pour mot | Mêmes questions |\n|---|---|---|---|---|");
for (const [m, o] of Object.entries(S)) console.log(`| ${m} | ${o.lectures} | ${o.memeCommande}/${o.chantiers} | ${o.memeListe}/${o.chantiers} | ${o.memesQuestions}/${o.chantiers} |`);
console.log("\n### Temps et coût par quantitatif (estimation production)\n| Méthode | Appels | Temps mesuré (s) | Coût (€) | Coût avec cache des consignes (€) |\n|---|---|---|---|---|");
for (const [m, o] of Object.entries(C)) console.log(`| ${m} | ${o.appels} | ${o.secondes} | ${o.eur} | ${o.eurAvecCache} |`);
// Contrôleur contre référence.
let acc = 0, des = 0; const causes = {};
for (const c of fs.readdirSync("controle")) { const k = L(`controle/${c}/comparaison.json`); if (k) { acc += k.accords.length; des += k.desaccords.length; } for (const a of L(`controle/${c}/arbitrage.json`) ?? []) causes[a.cause] = (causes[a.cause] ?? 0) + 1; }
console.log(`\n### Contrôleur contre moteur (15 chantiers fabriqués)\nAccords : ${acc} lignes ; désaccords : ${des} lignes. Arbitrage :`); for (const [k, v] of Object.entries(causes).sort((a, b) => b[1] - a[1])) console.log(`- ${k} : ${v}`);
