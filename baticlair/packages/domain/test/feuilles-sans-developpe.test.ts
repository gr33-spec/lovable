import { describe, expect, it } from "vitest";
import { applyRuleConfirmations } from "../src/index.js";
import { D2026_020_LINES } from "./devis-reels/d2026-020.js";
import { readQuote } from "./support/read-quote.js";

/**
 * Retour du fondateur (2026-10-10, capture iPhone, D-2026-020) : « Ici on s'en fout du développé, l'utilisateur veut
 * juste un nombre de feuilles. » Une pièce façonnée sur place se commande en feuilles 2 × 1 m (§48.6) : le nombre est une
 * estimation que l'artisan ajuste (moins / plus, « C'est bon ») ; le développé n'est jamais demandé pour elle, ni sur la
 * ligne, ni à l'écran des questions. Commandée façonnée, la pièce garde sa question (le comptoir en a besoin).
 */
type A = Record<string, { value: string; unit: string }>;
const faconne = (): A => {
  const first = readQuote(D2026_020_LINES, {});
  return Object.fromEntries(first.questions.flatMap((q) => (q.question?.key.includes("faconnage") ? [[q.question.key, { value: "1", unit: "u" }]] : [])));
};

describe("feuilles 2 × 1 m d'une pièce façonnée sur place : un nombre de feuilles, pas de développé", () => {
  it("la ligne de feuilles ne demande pas le développé ; elle reste une estimation à ajuster", () => {
    const answers = faconne();
    const v = applyRuleConfirmations(readQuote(D2026_020_LINES, answers), answers);
    const feuilles = v.toBuy.filter((b) => /^Feuilles .*2 × 1 m/.test(b.label));
    expect(feuilles.length).toBeGreaterThan(0);
    for (const f of feuilles) {
      expect(f.waitsOn ?? [], f.label).not.toContain("param:developpe");
      expect((f.asks ?? []).map((a) => a.key), f.label).not.toContain("param:developpe");
      expect(f.order?.count, f.label).toBeTruthy();
      expect((f.rules ?? []).some((r) => r.key.startsWith("estimation:")), f.label).toBe(true);
    }
    expect(v.questions.map((q) => q.question?.key).filter((k) => k === "param:developpe")).toEqual([]);
  });
});
