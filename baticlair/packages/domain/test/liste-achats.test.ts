import { describe, expect, it } from "vitest";
import {
  applyLineRoles,
  artisanView,
  computeWithAnswers,
  planQuote,
  proposeLineRoles,
  purchaseView,
  ROOFING_REFERENTIAL,
  slotsGivenByQuote,
  tradeProfile,
  validateTakeoff,
  type EngineAnswer,
  type LineRole,
  type PurchaseView,
} from "../src/index.js";
import { ARDOISES_LUCARNES_LINES } from "./devis-reels/ardoises-lucarnes.js";
import { D2026_015_LINES } from "./devis-reels/d2026-015.js";
import type { BenchLine } from "./devis-reels/truth.js";

/**
 * LA LISTE D'ACHATS sur les deux vrais devis de couvreur du fondateur : ce que
 * l'artisan voit à l'ouverture, et après ses réponses. Rapport généré :
 * docs/liste-achats-vrais-devis.md. C'est le résultat à juger avant toute
 * mise en ligne.
 */
function read(bench: BenchLine[], answers: Record<string, EngineAnswer> = {}): PurchaseView {
  const profile = tradeProfile("roofing");
  const lines = bench.map((l) => ({ ref: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit }));
  const raw = validateTakeoff(lines.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), profile);
  const plan = planQuote(lines, ROOFING_REFERENTIAL, profile);
  const proposals = proposeLineRoles(lines, plan, raw, ROOFING_REFERENTIAL);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  for (const [key, value] of Object.entries(answers)) if (key.startsWith("role:") && (value === "measure" || value === "purchase")) roles.set(key.slice(5), value);
  const asks = new Map([...proposals].filter(([id, p]) => p.ask && roles.get(id) === "undetermined").map(([k, p]) => [k, p.ask!]));
  const validation = applyLineRoles(raw, roles);
  const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, answers, {}, {}, slotsGivenByQuote(plan, validation));
  const view = artisanView(
    lines.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false })),
    validation,
    engine,
    { plan, roles, ref: ROOFING_REFERENTIAL, asks },
  );
  return purchaseView(view, engine, { plan, roles, ref: ROOFING_REFERENTIAL, validation });
}

const short = (d: string) => d.replace(/\s*\((?:fourniture\s*(?:&|et)\s*pose|f\.?\s*(?:&|et)\s*p\.?|fourniture)\)/gi, "").split(/\s[-–—]\s/)[0]!.trim();

function render(title: string, v: PurchaseView): string {
  const out = [`### ${title}`, "", `**J'ai compris :** ${v.understood.join(" · ")}`, ""];
  if (v.questions.length > 0) {
    out.push("**Questions :**", "");
    for (const q of v.questions) out.push(`- ${q.text}${q.question?.options?.length ? ` → ${q.question.options.map((o) => `[${o.label}]`).join(" ")}` : ""}`);
    out.push("");
  }
  out.push("**À acheter :**", "", "| Article | Quantité | Repère |", "|---|---|---|");
  for (const b of v.toBuy) out.push(`| ${short(b.label)} | ${b.quantity ?? "—"} | ${b.approx ?? ""}${b.state === "to_confirm" ? " ⚠ à confirmer" : ""} |`);
  out.push("");
  if (v.toQuote.length > 0) {
    out.push("**À faire chiffrer par le fournisseur :**", "");
    for (const q of v.toQuote) out.push(`- ${short(q.label)} : ${q.measure} — ${q.reason}`);
    out.push("");
  }
  if (v.assumptions.length > 0) {
    out.push(`**Hypothèses (modifiables) :** ${v.assumptions.map((a) => `${a.label.toLowerCase()} ${a.value}${a.unit === "u" ? "" : a.unit === "°" ? "°" : ` ${a.unit}`}`).join(" · ")}`, "");
  }
  return out.join("\n");
}

describe("liste d'achats : D-2026-015 (tuiles HP10, 120 m²)", () => {
  it("à l'ouverture : une question (le modèle lu), et déjà presque tout à acheter", () => {
    const v = read(D2026_015_LINES);
    expect(v.questions.map((q) => q.key)).toEqual(["engine:product:tuile"]);
    expect(v.toBuy.map((b) => [short(b.label), b.quantity])).toEqual([
      ["Liteaux 27×40", "547 ml"],
      ["Écran HPV", "2 rouleaux"],
      ["Tuiles de rive", "78 pièces"],
      ["Faîtières", "29 pièces"],
      ["Closoir", "2 rouleaux de 5 m"],
      ["Crochets de faîtière", "29 pièces"],
      ["Abouts de faîtage", "2 pièces"],
      ["Gouttière PVC sable demi-ronde", "5 longueurs de 4 m"],
      ["Crochets de gouttière", "50 pièces"],
      ["Naissances", "2 pièces"],
      ["Tubes de descente Ø80 PVC sable", "8 ml"],
      ["Coudes", "4 pièces"],
      ["Colliers", "8 pièces"],
      ["Chatières de ventilation", "10 pièces"],
      ["Sortie de toit Poujoulat", "1 pièce"],
    ]);
    expect(v.toQuote).toEqual([]);
    expect(v.canValidate).toBe(true);
  });

  it("après « oui, c'est bien ce modèle » : 1 488 tuiles avec le pureau mini (zone littorale), 1 345 si l'artisan donne 34,3 cm", () => {
    const v = read(D2026_015_LINES, { "product:tuile": "edilians-hp10-huguenot" });
    expect(v.questions).toEqual([]);
    expect(v.toBuy.find((b) => b.needIds.includes("tuiles"))).toMatchObject({ quantity: "1 488 pièces", approx: "≈ 7 palettes" });
    expect(v.assumptions.map((a) => a.key)).toEqual(expect.arrayContaining(["param:zone", "param:pente", "param:pureau"]));
    const precise = read(D2026_015_LINES, { "product:tuile": "edilians-hp10-huguenot", "param:pureau": { value: "34.3", unit: "cm" } });
    expect(precise.toBuy.find((b) => b.needIds.includes("tuiles"))).toMatchObject({ quantity: "1 345 pièces", approx: "≈ 6 palettes" });
    // Les liteaux du lattage (368 ml) et du contre-lattage (140 ml) font UNE ligne.
    expect(precise.toBuy.find((b) => b.needIds.includes("liteaux"))).toMatchObject({ quantity: "508 ml", approx: "≈ 11 bottes de 50 ml", needIds: ["liteaux", "contre-liteaux"] });
    // Une mesure du devis n'est jamais une quantité d'article.
    expect(JSON.stringify(precise.toBuy)).not.toMatch(/"120 m²"|"120 m2"/);
  });
});

describe("liste d'achats : devis ardoises (200 m², jouées, cheminée)", () => {
  it("à l'ouverture : deux questions seulement (6 : ardoises ou jouées ? combien de descentes ?), le reste calculé", () => {
    const v = read(ARDOISES_LUCARNES_LINES);
    expect(v.questions.map((q) => q.key).sort()).toEqual(["engine:param:nb_descentes", "role:ligne 5"]);
    expect(v.toBuy.map((b) => [short(b.label), b.quantity])).toEqual([
      ["Ardoises 30×22", "9 271 pièces"],
      ["Crochets d'ardoise", "9 457 pièces"],
      ["Liteaux 18×40", "2 049 ml"],
      ["Liteaux 27×40", "350 ml"],
      ["Écran HPV", "3 rouleaux"],
      ["Faîtage zinc (bande)", "6 longueurs de 3 m"],
      ["Pattes de fixation", "51 pièces"],
      ["Gouttière zinc", "5 longueurs de 4 m"],
      ["Crochets de gouttière", "43 pièces"],
      ["Chatières de ventilation", "12 pièces"],
    ]);
    // Un faîtage ZINC ne donne jamais des faîtières en terre cuite.
    expect(v.toBuy.some((b) => /Faîtières/.test(b.label))).toBe(false);
    // Les naissances attendent la réponse « combien de descentes » : une question, pas un article à faire chiffrer.
    expect(v.toQuote.map((q) => short(q.label))).toEqual(["Entourage de cheminée zinc et solin"]);
    expect(v.assumptions.map((a) => a.key)).toEqual(["param:pente", "param:zone", "param:longueur_rampant", "derived:recouvrement", "param:pureau", "param:diametre_crochet", "product:liteau", "product:contre_liteau", "param:entraxe_supports"]);
    // Tant que « 6 » n'est pas tranché, rien ne part.
    expect(v.canValidate).toBe(false);
  });

  it("après les réponses (6 jouées, 2 descentes) : les jouées partent à faire chiffrer, les naissances se comptent", () => {
    const v = read(ARDOISES_LUCARNES_LINES, { "role:ligne 5": "measure", "param:nb_descentes": { value: "2", unit: "u" } });
    expect(v.questions).toEqual([]);
    expect(v.toBuy.find((b) => b.label === "Naissances")).toMatchObject({ quantity: "2 pièces" });
    expect(v.toQuote.map((q) => [short(q.label), q.measure])).toEqual([
      ["Ardoises pour jouées de lucarnes", "6 unités"],
      ["Entourage de cheminée zinc et solin", "2 unités"],
    ]);
    expect(v.canValidate).toBe(true);
    // La carte du quantitatif : chaque article sous son ouvrage, avec la mesure du devis.
    expect(v.groups.map((g) => [g.label, g.measure, g.itemKeys.length])).toEqual([
      ["Couverture en ardoises au crochet sur liteaux", "200 m²", 5],
      ["Faîtage en bande zinc", "17 m", 2],
      ["Gouttière", "17 m", 3],
      ["Autres articles du devis", null, 1],
    ]);
    expect(v.groups.flatMap((g) => g.itemKeys).sort()).toEqual(v.toBuy.map((b) => b.key).sort());
    // Zone intérieure : moins de recouvrement, donc moins d'ardoises (8 547, table Cupa à R 80) et des crochets de gouttière tous les 50 cm.
    const inland = read(ARDOISES_LUCARNES_LINES, { "role:ligne 5": "measure", "param:nb_descentes": { value: "2", unit: "u" }, "param:zone": { value: "1", unit: "u" } });
    expect(inland.toBuy.find((b) => b.label === "Ardoises 30×22")).toMatchObject({ quantity: "8 547 pièces" });
    expect(inland.toBuy.find((b) => b.label === "Crochets de gouttière")).toMatchObject({ quantity: "34 pièces" });
  });

  it("génère docs/liste-achats-vrais-devis.md", async () => {
    const doc = [
      "# La liste d'achats sur les deux vrais devis de couvreur",
      "",
      "Fichier GÉNÉRÉ par `packages/domain/test/liste-achats.test.ts` : ne pas modifier à la main.",
      "Valeurs réellement produites par BatiClair (référentiel du fondateur, 2026-10-03). Les mesures du devis",
      "servent au calcul et à la phrase « J'ai compris » ; seules des quantités d'articles sont « à acheter ».",
      "",
      "## D-2026-015 — tuiles HP10, 120 m²",
      "",
      render("À l'ouverture", read(D2026_015_LINES)),
      render("Après « oui, c'est bien ce modèle »", read(D2026_015_LINES, { "product:tuile": "edilians-hp10-huguenot" })),
      render("Si l'artisan précise le pureau (34,3 cm)", read(D2026_015_LINES, { "product:tuile": "edilians-hp10-huguenot", "param:pureau": { value: "34.3", unit: "cm" } })),
      "## Devis ardoises — 200 m², jouées de lucarnes, cheminée",
      "",
      render("À l'ouverture", read(ARDOISES_LUCARNES_LINES)),
      render("Après « 6 jouées » et « 2 descentes »", read(ARDOISES_LUCARNES_LINES, { "role:ligne 5": "measure", "param:nb_descentes": { value: "2", unit: "u" } })),
      render("Si l'artisan dit « intérieur des terres »", read(ARDOISES_LUCARNES_LINES, { "role:ligne 5": "measure", "param:nb_descentes": { value: "2", unit: "u" }, "param:zone": { value: "1", unit: "u" } })),
    ].join("\n");
    await expect(doc).toMatchFileSnapshot("../../../docs/liste-achats-vrais-devis.md");
  });
});
