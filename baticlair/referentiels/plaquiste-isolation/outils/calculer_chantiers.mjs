// Outil de RÉDACTION (aucun code de l'application ne le lit) : calcule les chantiers types de `chantiers-types.json`
// avec le VRAI moteur de Mobiiz (packages/domain, construit : `pnpm -s build`) et la fiche `referentiel.json`, puis
// écrit `chantiers-types.md`. Lancer depuis referentiels/plaquiste-isolation : node outils/calculer_chantiers.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ici = join(dirname(fileURLToPath(import.meta.url)), "..");
const dom = await import(join(ici, "../../packages/domain/dist/index.js"));
const ref = dom.loadReferential(JSON.parse(readFileSync(join(ici, "referentiel.json"), "utf8")));
const cas = JSON.parse(readFileSync(join(ici, "chantiers-types.json"), "utf8"));

const val = (v) => (Array.isArray(v) ? { value: String(v[0]), unit: v[1] } : { value: String(v), unit: "u" });
const unitOf = (work, key) => work.params.find((p) => p.key === key)?.unit ?? "u";

function calcul(ligne, reponses, coches) {
  const work = ref.workItems.find((w) => w.id === ligne.ouvrage);
  const params = { surface: { value: String(ligne.quantite), unit: "m2" } };
  for (const [k, v] of Object.entries(ligne.lu)) params[k] = val(v);
  const avec = { ...params };
  for (const [k, v] of Object.entries(reponses)) if (work.params.some((p) => p.key === k) && !avec[k]) avec[k] = Array.isArray(v) ? val(v) : { value: String(v), unit: unitOf(work, k) };
  const products = ligne.produit ? { isolant: { productId: ligne.produit } } : {};
  const ecrits = [...ligne.ecrits, ...coches.filter((c) => work.slots.some((s) => s.key === c))];
  const input = (p) => ({ workItemId: ligne.ouvrage, params: p, products, mentioned: ecrits, suggestions: true });
  // Questions : ce que le moteur demande avec le seul devis (les suggestions cochées comprises).
  const avant = dom.computeWorkItem(ref, input(params), { acceptDraft: true });
  const questions = [...new Set(avant.needs.filter((n) => n.status === "question").map((n) => n.question.key))];
  const suggestions = work.slots.filter((s) => s.suggested && !ligne.ecrits.includes(s.key)).map((s) => s.suggested.label);
  const apres = dom.computeWorkItem(ref, input(avec), { acceptDraft: true });
  const ouverts = apres.needs.filter((n) => n.status !== "calculated").map((n) => `${n.needId} (${n.status}${n.question ? " : " + n.question.key : ""})`);
  const shown = (a) => { const p = work.params.find((x) => x.label === a.label); const d = p?.display?.[String(a.value).replace(",", ".")]; return d ?? `${a.value}${a.unit && a.unit !== "u" ? " " + a.unit.replace("m2", "m²") : ""}`; };
  const hypotheses = [...new Set(apres.needs.flatMap((n) => n.assumptions ?? []).filter((a) => !a.key?.startsWith?.("slot")).map((a) => `${a.label} : ${shown(a)}`))];
  return { questions, suggestions, resultat: apres, ouverts, hypotheses };
}

const textes = Object.fromEntries(ref.workItems.flatMap((w) => w.params.map((p) => [`param:${p.key}`, p.question])));
let md = `# Chantiers types plaquiste-isolation (jeu de test pour l'ouverture du métier)

Calculés par le moteur de Mobiiz (\`packages/domain\`, \`computeWorkItem\` puis \`purchaseList\`) avec \`referentiel.json\`
(version \`${ref.version}\`), règles « à confirmer » acceptées (mode validateur). **Tout est à relire par un plaquiste.**
Écrit par \`outils/calculer_chantiers.mjs\` : ne pas modifier à la main, relancer l'outil.

Lecture : « Lu au devis » = données que le modèle de lecture doit trouver dans la ligne ; « Questions » = ce que le moteur
demande quand le devis ne le dit pas, dans l'ordre où il les rencontre ; « Suggestions » = cases proposées (jamais ajoutées
d'office) ; « Hypothèses » = valeurs par défaut dites à l'artisan, modifiables d'un geste.

`;
for (const c of cas) {
  md += `## ${c.id} — ${c.titre}\n\n### Devis\n\n| Désignation | Quantité | Unité | Ouvrage de la fiche |\n|---|---|---|---|\n`;
  for (const l of c.devis) md += `| ${l.designation} | ${l.quantite} | ${l.unite} | ${l.ouvrage ?? "aucun (ligne sans fourniture)"} |\n`;
  const resultats = [];
  const qs = new Set(), sugg = new Set(), hyp = new Set(), ouv = [];
  for (const l of c.devis) {
    if (!l.ouvrage) continue;
    const r = calcul(l, c.reponses, c.coches);
    r.questions.forEach((q) => qs.add(q));
    r.suggestions.forEach((s) => sugg.add(s));
    r.hypotheses.forEach((h) => hyp.add(h));
    ouv.push(...r.ouverts);
    resultats.push(r.resultat);
  }
  md += `\n**Questions attendues** : ${qs.size ? [...qs].map((q) => `\`${q}\` (« ${textes[q] ?? ""} »)`).join(" ; ") : "aucune"}\n\n`;
  md += `**Réponses du test** : ${Object.keys(c.reponses).length ? Object.entries(c.reponses).map(([k, v]) => `${k} = ${Array.isArray(v) ? v.join(" ") : v}`).join(" ; ") : "aucune"}\n\n`;
  md += `**Suggestions proposées** : ${sugg.size ? [...sugg].join(" ; ") : "aucune"} — cochées dans le test : ${c.coches.length ? c.coches.join(", ") : "aucune"}\n\n`;
  md += `**Hypothèses dites** : ${hyp.size ? [...hyp].join(" ; ") : "aucune"}\n\n`;
  md += `### Liste attendue (une ligne par article, besoins additionnés sur tout le chantier puis arrondis, §49.5)\n\n| Article | Commande | Besoin calculé | Précision |\n|---|---|---|---|\n`;
  const lignes = new Map();
  resultats.forEach((r, i) => {
    const carac = c.devis.filter((l) => l.ouvrage)[i]?.caracteristiques ?? "";
    for (const n of r.needs) {
      if (n.status !== "calculated" || !n.purchase) continue;
      const label = (n.labelWithQuote ?? n.label).replace("\u241F", carac).replace(/\s{2,}/g, " ").trim();
      const unite = n.purchase.order.unit;
      const k = `${label}|${unite.many}`;
      const prod = ref.products.find((p) => p.family === n.family && p.sellingUnits.some((u) => u.primary && u.label.many === unite.many));
      const contient = prod ? Number(prod.sellingUnits.find((u) => u.primary).contains.value) : 1;
      const e = lignes.get(k) ?? { label, unite, besoin: 0, unitBesoin: n.quantity.unit, contient, precisions: new Set() };
      e.besoin += Number(n.quantity.value);
      if (n.precision) e.precisions.add(n.precision);
      lignes.set(k, e);
    }
  });
  for (const e of lignes.values()) {
    const nb = Math.ceil(Math.round((e.besoin / e.contient) * 1000) / 1000);
    const besoin = `${String(Math.round(e.besoin * 100) / 100).replace(".", ",")} ${e.unitBesoin.replace("m2", "m²").replace(/^u$/, "pièces")}`;
    md += `| ${e.label} | ${nb} ${nb > 1 ? e.unite.many : e.unite.one} | ${besoin} | ${[...e.precisions].join(" ; ")} |\n`;
  }
  if (ouv.length) md += `\nReste ouvert : ${ouv.join(", ")}\n`;
  if (c.note) md += `\n> ${c.note}\n`;
  md += "\n";
}
writeFileSync(join(ici, "chantiers-types.md"), md);
console.log(`chantiers-types.md : ${cas.length} chantiers`);
