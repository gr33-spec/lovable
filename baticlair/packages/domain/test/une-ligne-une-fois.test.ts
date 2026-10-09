import { describe, expect, it } from "vitest";
import { applyRuleConfirmations } from "../src/index.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { D2026_020_LINES } from "./devis-reels/d2026-020.js";
import { readQuote, type QuoteLineInput } from "./support/read-quote.js";

/**
 * §49.4, §49.8 (retour du fondateur, 2026-10-09) : une ligne écrite ne sort JAMAIS deux fois, même quand une donnée est
 * en blanc au devis (le développé de la gouttière) : une seule ligne, orange « Info manquante », la donnée demandée une
 * fois à l'écran des questions ; jamais aussi une ligne grise « à préciser avec le fournisseur ».
 */
const GOUTTIERE_SANS_DEV: QuoteLineInput[] = [
  { ref: "1", designation: "Couverture en ardoises naturelles 32x22", quantity: "48", unit: "m²" },
  { ref: "2", designation: "Gouttière zinc demi-ronde", quantity: "13", unit: "ml" },
];
const lignesDe = (v: ReturnType<typeof readQuote>, ref: string) => [
  ...v.toBuy.filter((b) => b.lineIds.includes(ref) && !b.key.startsWith("manque:need:")).map((b) => b.key),
  ...v.toQuote.filter((q) => q.lineIds.includes(ref)).map((q) => q.key),
];
const closAuCalcul = (lines: QuoteLineInput[]) => {
  const ouvert = readQuote(lines);
  const closes = Object.fromEntries(ouvert.questions.filter((q) => q.question).map((q) => [q.key.replace(/^engine:/, ""), null]));
  return { ouvert, clos: applyRuleConfirmations(readQuote(lines, closes as never), {}) };
};

describe("§49.4 / §49.8 : une ligne écrite sort une seule fois", () => {
  it("développé de gouttière en blanc : la question est posée une fois, puis UNE ligne orange « Info manquante »", () => {
    const { ouvert, clos } = closAuCalcul(GOUTTIERE_SANS_DEV);
    expect(ouvert.questions.filter((q) => (q.question?.key ?? q.key).endsWith("developpe_gouttiere"))).toHaveLength(1);
    expect(lignesDe(clos, "2")).toHaveLength(1);
    const gouttiere = clos.toBuy.find((b) => b.lineIds.includes("2") && /^Gouttière/.test(b.label))!;
    expect(gouttiere.key).toMatch(/^manque:/);
    const row = clos.screen.groups.flatMap((g) => g.rows).find((r) => r.itemKey === gouttiere.key);
    expect(row?.status).toBe("check");
    expect(clos.toQuote.some((q) => q.lineIds.includes("2"))).toBe(false);
  });

  for (const [nom, lines] of [["D-2026-018", D2026_018_LINES], ["D-2026-020", D2026_020_LINES]] as const) {
    it(`${nom} : tout laissé sans réponse, aucune ligne du devis n'apparaît deux fois`, () => {
      const { clos } = closAuCalcul(lines as QuoteLineInput[]);
      // Une ligne écrite attend une donnée (orange) OU part telle quelle au fournisseur (grise) : jamais les deux.
      for (const l of lines) {
        const keys = lignesDe(clos, l.ref);
        if (keys.some((k) => k.startsWith("manque:"))) expect(keys.filter((k) => k.startsWith("line:")), `ligne ${l.ref}`).toEqual([]);
      }
    });
  }
});
