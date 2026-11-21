// Coût et temps par quantitatif, par méthode. Volumes de texte mesurés (consignes + devis lus, réponse écrite),
// convertis en jetons (≈ 3,3 caractères par jeton lu, ≈ 3 par jeton écrit), prix de la grille de l'appli
// (packages/domain/src/ai-cost/pricing.ts) en dollars par million de jetons. Hypothèse de réflexion (non mesurable ici) :
// Opus « high » ≈ 3 000 jetons, Sonnet « medium » ≈ 1 000, Haiku ≈ 0 à 500.
import fs from "node:fs";
const M = JSON.parse(fs.readFileSync("resultats/mesures.json", "utf8"));
const PRIX = { opus: { e: 4, s: 20, c: 0.2, r: 3000 }, sonnet: { e: 2, s: 10, c: 0.1, r: 1000 }, haiku: { e: 0.1, s: 0.5, c: 0.01, r: 300 } };
const EUR = 0.92;
// Les étapes de chaque méthode (les mêmes que dans banc.mjs) ; « x » : nombre moyen d'appels de cette étape par devis.
const ETAPES = { M0: ["M0-a"], M1: ["M0-a", "M1-b"], M2: ["M2-a"], M3: ["M3-a", "M3-b-toiture", "M3-b-evacuation", "M3-b-raccords"], M4: ["M4-a"], M5: ["M5-a", "M8-a", "M5-b"], M6: ["M6-a", "M6-b"], M7: ["M7-a"], M8: ["M8-a"], M9: ["M8-a", "M9-b"], M10: ["M10-a"], M11: ["M6-a"] };
const par = {};
for (const [id, m] of Object.entries(M)) { const p = id.split("-"); if (!/^M\d+$/.test(p[0]) || !/^C(0\d|10)$/.test(p[1])) continue; const k = `${p[0]}-${p.slice(3).join("-")}`; (par[k] ??= []).push(m); }
const moy = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length;
const out = {};
for (const [meth, etapes] of Object.entries(ETAPES)) {
  let usd = 0, usdCache = 0, s = 0, sMax = 0, appels = 0, lus = 0, ecrits = 0;
  for (const k of etapes) {
    const a = par[k]; if (!a) continue;
    const mod = /opus/.test(a[0].modele) ? "opus" : /sonnet/.test(a[0].modele) ? "sonnet" : "haiku", P = PRIX[mod];
    // Nombre d'appels de l'étape par devis : sur 10 chantiers × le nombre d'essais faits.
    const essais = Math.max(1, Math.round((par[`${k.split("-")[0]}-a`]?.length ?? a.length) / 10)), x = Math.min(1, a.length / (10 * essais));
    const fixe = moy(a, (m) => Math.min(m.entreeCar, 76000)) , entree = moy(a, (m) => m.entreeCar) / 3.3 + moy(a, (m) => m.pages) * 1600, sortie = moy(a, (m) => m.sortieCar) / 3 + P.r;
    // Avec le cache de consignes : la partie fixe (les consignes, ≈ tout sauf le devis) est relue au prix du cache.
    const consignes = Math.max(0, moy(a, (m) => m.entreeCar) - 4000) / 3.3;
    usd += x * (entree * P.e + sortie * P.s) / 1e6; usdCache += x * ((entree - consignes) * P.e + consignes * P.c + sortie * P.s) / 1e6;
    const d = moy(a, (m) => m.ms) / 1000; s += x * d; sMax = Math.max(sMax, d); appels += x; lus += x * entree; ecrits += x * sortie;
  }
  // Les étapes d'une même vague partent ensemble (méthodes 3 et 6) : le temps ressenti est celui de la plus longue chaîne.
  const ressenti = meth === "M6" ? sMax : meth === "M3" ? moy(par["M3-a"], (m) => m.ms) / 1000 + sMax : meth === "M5" ? Math.max(moy(par["M5-a"], (m) => m.ms), moy(par["M8-a"], (m) => m.ms)) / 1000 + (par["M5-b"] ? (par["M5-b"].length / 10) * moy(par["M5-b"], (m) => m.ms) / 1000 : 0) : s;
  out[meth] = { appels: +appels.toFixed(1), jetonsLus: Math.round(lus), jetonsEcrits: Math.round(ecrits), secondes: Math.round(ressenti), eur: +(usd * EUR).toFixed(3), eurAvecCache: +(usdCache * EUR).toFixed(3) };
}
fs.writeFileSync("resultats/couts.json", JSON.stringify(out, null, 1)); console.table(out);
