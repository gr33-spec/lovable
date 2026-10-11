import { describe, expect, it } from "vitest";
import { readQuote } from "./support/read-quote.js";
import { ARDOISES_LUCARNES_LINES } from "./devis-reels/ardoises-lucarnes.js";

/**
 * UNE MESURE N'EST JAMAIS UN ARTICLE (retour du fondateur, 2026-10-05, devis ardoises 200 m² : « pourquoi j'ai plusieurs
 * fois les liteaux ? On met en ml, jamais en m² ») ; et depuis le 2026-10-06 (« les mesures lues dans le devis on s'en
 * fout »), la mesure ne fait aucune ligne orange : elle se lit dans l'ouvrage.
 */
describe("une mesure n'est jamais un article, ni une ligne à vérifier", () => {
  it("« Liteaux bois pour ardoises 200 m² » : aucune ligne orange pour la mesure, les liteaux restent en ml", () => {
    const p = readQuote(ARDOISES_LUCARNES_LINES);
    const rows = p.screen.groups.flatMap((g) => g.rows);
    const pending = rows.filter((r) => r.pending);
    expect(pending.map((r) => r.pending!.label)).not.toContain("Liteaux bois pour ardoises");
    expect(pending.map((r) => r.pending!.label)).not.toContain("Faîtage zinc");
    expect(pending.map((r) => r.pending!.label)).not.toContain("Mesure lue dans le devis");
    expect(p.questions.map((q) => q.key)).not.toContain("line:ligne 1");
    const battens = p.toBuy.filter((b) => /liteau/i.test(b.label));
    expect(battens.length).toBeGreaterThan(0);
    for (const b of battens) expect(b.quantity).toMatch(/ml$/);
  });
});
