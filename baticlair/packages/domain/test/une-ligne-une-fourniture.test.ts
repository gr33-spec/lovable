import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, isWithoutSupplyUnit, type QuoteLineReading } from "../src/index.js";
import { D2026_105_LINES, D2026_105_READINGS } from "./devis-reels/d2026-105.js";
import { isPrestationPhrase } from "./support/prestation.js";
import { readQuote } from "./support/read-quote.js";

/**
 * §49.9 (retour du fondateur, 2026-10-09, devis de réparation D.2026.105) : « une ligne du quantitatif nomme une
 * fourniture, jamais la phrase du devis ».
 *  - Le lecteur extrait la fourniture contenue dans chaque prestation : d'abord les sous-lignes (« – Tuile terre cuite
 *    mécanique »), puis le texte (« y compris les petites fournitures de fixation »).
 *  - Une ligne sans fourniture (heures, forfait, évacuation) est hors quantitatif : pas dans la liste, repliée sous
 *    « N lignes sans fourniture ». Une unité h, fft ou jour n'est jamais une fourniture.
 *  - Modèle et teinte de tuile : pas de question à boutons, ligne orange « à préciser ».
 * Devis D.2026.105 (réparation), tel que le lecteur le rend (`devis-reels/d2026-105.ts`).
 */
const REPARATION = D2026_105_LINES;
const READINGS = D2026_105_READINGS;

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
  it("devis de réparation : exactement 2 lignes, la tuile (20 pièces) et les fixations de rive (1 jeu) ; seules les fixations, qui attendent leur question, sont orange", () => {
    const rows = shown(read());
    expect(rows.map((r) => r.label)).toEqual(["Tuile terre cuite mécanique", "Fixations pour l'élément de rive"]);
    expect(rows.map((r) => r.quantity)).toEqual(["20 pièces", "1 jeu"]);
    expect(rows.map((r) => r.status)).toEqual(["ok", "check"]);
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

  it("modèle et teinte de tuile : pas de question, la ligne n'est pas orange et dit « à voir avec le fournisseur » (retour du fondateur, 2026-10-12, §51.6)", () => {
    // Règle changée le 2026-10-12 : avant, ligne orange « à préciser » jusqu'au « C'est bon » ; maintenant l'orange ne vient
    // que d'une question sans réponse ou retirée, et ce que le fournisseur précisera se dit dans la précision de la ligne.
    const p = read();
    const tuile = shown(p).find((r) => r.label === "Tuile terre cuite mécanique")!;
    expect(tuile.item?.asks ?? []).toEqual([]);
    expect(p.questions.some((q) => q.question && /teinte/i.test(q.question.text))).toBe(false);
    expect(tuile.status).toBe("ok");
    expect(tuile.item?.precision).toMatch(/Modèle et teinte à voir avec le fournisseur/);
  });

  it("élément de rive : la question tuile de rive / bande zinc, en boutons dans la carte, posée une fois", () => {
    const p = read();
    const rive = shown(p).find((r) => r.label === "Fixations pour l'élément de rive")!;
    expect(rive.item?.asks?.map((a) => a.options.map((o) => o.label))).toEqual([["tuile de rive", "bande de rive zinc"]]);
    expect(p.questions.filter((q) => q.question && /rive/i.test(q.question.text))).toHaveLength(1);
  });

  it("sans la lecture (lignes d'un partenaire), une heure n'est jamais une fourniture", () => {
    const p = readQuote([{ ref: "1", designation: "Repositionnement des tuiles", quantity: "1,5", unit: "h" }]);
    expect(p.toBuy).toEqual([]);
    expect(p.toQuote).toEqual([]);
  });
});
