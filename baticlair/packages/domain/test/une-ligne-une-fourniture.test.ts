import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, isPrestationPhrase, isWithoutSupplyUnit, linesWithoutSupply, tradeProfile, validateTakeoff, type QuoteLineReading } from "../src/index.js";
import { readQuote, type QuoteLineInput } from "./support/read-quote.js";

/**
 * §49.9 (retour du fondateur, 2026-10-09, devis de réparation D.2026.105) : « une ligne du quantitatif nomme une
 * fourniture, jamais la phrase du devis ».
 *  - Le lecteur extrait la fourniture contenue dans chaque prestation : d'abord les sous-lignes (« – Tuile terre cuite
 *    mécanique »), puis le texte (« y compris les petites fournitures de fixation »).
 *  - Une ligne sans fourniture (heures, forfait, évacuation) est hors quantitatif : pas dans la liste, repliée sous
 *    « N lignes sans fourniture ». Une unité h, fft ou jour n'est jamais une fourniture.
 *  - Modèle et teinte de tuile : pas de question à boutons, ligne orange « à préciser ».
 * Devis de réparation ANONYMISÉ (désignations, quantités, unités ; ni nom, ni adresse, ni prix), tel que le lecteur le rend.
 */
const REPARATION: QuoteLineInput[] = [
  { ref: "1", designation: "Accès toiture et mise en sécurité (échelle, harnais, protections)", quantity: "1", unit: "fft" },
  { ref: "2", designation: "Remplacement unitaire d'une tuile cassée, comprenant accès toit, dépose de la tuile cassée et pose de la tuile neuve – Tuile terre cuite mécanique", quantity: "20", unit: "u" },
  { ref: "3", designation: "Repositionnement des tuiles", quantity: "1,5", unit: "h" },
  { ref: "4", designation: "Reprise de l'élément de rive, y compris les petites fournitures de fixation", quantity: "1", unit: "fft" },
  { ref: "5", designation: "Évacuation des déchets et nettoyage de fin de chantier", quantity: "1", unit: "fft" },
];

const READINGS = new Map<string, QuoteLineReading>([
  ["1", { role: "hors_quantitatif", articles: [], faconnage: null, manque: [] }],
  ["2", { role: "fourniture_et_pose", articles: [{ nom: "Tuile terre cuite mécanique", materiau: null, quantite: "20", unite: "u", elements: null }], faconnage: null, manque: ["modèle et teinte de tuile"] }],
  ["3", { role: "pose", articles: [], faconnage: null, manque: [] }],
  ["4", { role: "fourniture_et_pose", articles: [{ nom: "Fixations pour l'élément de rive", materiau: null, quantite: "1", unite: "jeu", elements: null }], faconnage: null, manque: ["type d'élément de rive (tuile de rive, bande zinc)"] }],
  ["5", { role: "hors_quantitatif", articles: [], faconnage: null, manque: [] }],
]);

const read = (answers: Record<string, unknown> = {}) => applyRuleConfirmations(readQuote(REPARATION, answers as never, [], undefined, { acceptDraft: true }, READINGS), answers as never);

/** Ce que l'artisan voit : chaque ligne de l'écran avec son nom et sa quantité. */
function shown(p: ReturnType<typeof read>) {
  return p.screen.groups.flatMap((g) =>
    g.rows.map((r) => {
      const item = r.itemKey ? p.toBuy.find((b) => b.key === r.itemKey) : undefined;
      const quote = r.quoteKey ? p.toQuote.find((q) => q.key === r.quoteKey) : undefined;
      return { status: r.status, label: item?.label ?? quote?.label ?? r.pending?.label ?? "", quantity: item?.quantity ?? quote?.measure ?? r.pending?.quantity ?? null, item, row: r };
    }),
  );
}

describe("§49.9 une ligne du quantitatif nomme une fourniture, jamais la phrase du devis", () => {
  it("devis de réparation : exactement 2 lignes, la tuile (20 pièces) et les fixations de rive (1 jeu), toutes deux orange", () => {
    const rows = shown(read());
    expect(rows.map((r) => r.label)).toEqual(["Tuile terre cuite mécanique", "Fixations pour l'élément de rive"]);
    expect(rows.map((r) => r.quantity)).toEqual(["20 pièces", "1 jeu"]);
    expect(rows.map((r) => r.status)).toEqual(["check", "check"]);
  });

  it("aucune ligne ne reprend une phrase de prestation, aucune ne porte une unité en h, fft ou jour", () => {
    const p = read();
    const labels = [...p.toBuy.map((b) => b.label), ...p.toQuote.map((q) => q.label), ...shown(p).map((r) => r.label)];
    for (const label of labels) {
      expect(isPrestationPhrase(label), label).toBe(false);
      for (const l of REPARATION) expect(label.includes(l.designation.slice(0, 30)), label).toBe(false);
    }
    for (const b of p.toBuy) expect(isWithoutSupplyUnit(b.order?.unit) || /\b(h|fft|ft|forfait|jours?|heures?)\b/i.test(b.quantity ?? ""), b.label).toBe(false);
    for (const q of p.toQuote) expect(/\b(h|fft|ft|forfait|jours?|heures?)\b/i.test(q.measure), q.label).toBe(false);
  });

  it("modèle et teinte de tuile : pas de question à boutons, la ligne est orange « à préciser » ; « C'est bon » la laisse au fournisseur", () => {
    const p = read();
    const tuile = shown(p).find((r) => r.label === "Tuile terre cuite mécanique")!;
    expect(tuile.item?.asks ?? []).toEqual([]);
    expect(p.questions.some((q) => q.question && /teinte/i.test(q.question.text))).toBe(false);
    const d = p.questions.find((q) => q.key === tuile.row.decisionKey)!;
    expect(d.text).toMatch(/^Modèle et teinte de tuile à préciser/);
    const kept = shown(read({ [d.key]: "ok" })).find((r) => r.label === "Tuile terre cuite mécanique")!;
    expect(kept.status).toBe("supplier");
    expect(kept.item?.precision).toMatch(/modèle et teinte de tuile : au choix du fournisseur/);
  });

  it("élément de rive : la question tuile de rive / bande zinc, en boutons dans la carte, posée une fois", () => {
    const p = read();
    const rive = shown(p).find((r) => r.label === "Fixations pour l'élément de rive")!;
    expect(rive.item?.asks?.map((a) => a.options.map((o) => o.label))).toEqual([["tuile de rive", "bande zinc"]]);
    expect(p.questions.filter((q) => q.question && /rive/i.test(q.question.text))).toHaveLength(1);
  });

  it("les lignes sans fourniture (accès, heures, évacuation) sont repliées à part, jamais dans la liste", () => {
    const lines = REPARATION.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit }));
    const validation = validateTakeoff(lines.map((l) => ({ id: l.id, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), tradeProfile("roofing"));
    const without = linesWithoutSupply(lines.filter((l) => !["2", "4"].includes(l.id)), validation, READINGS);
    expect(without.map((w) => w.measure)).toEqual(["1 fft", "1,5 h", "1 fft"]);
  });

  it("sans la lecture (lignes d'un partenaire), une heure n'est jamais une fourniture", () => {
    const p = readQuote([{ ref: "1", designation: "Repositionnement des tuiles", quantity: "1,5", unit: "h" }]);
    expect(p.toBuy).toEqual([]);
    expect(p.toQuote).toEqual([]);
  });
});
