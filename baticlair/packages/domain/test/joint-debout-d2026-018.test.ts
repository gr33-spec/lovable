import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, isMandatoryQuestion } from "../src/index.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { readQuote } from "./support/read-quote.js";

/**
 * Retour du fondateur (2026-10-09) sur D-2026-018 (joint debout 91 m², « pattes en inox fixes et coulissantes ») :
 * 1. §49.1 : deux articles écrits, deux lignes (pattes fixes ET pattes coulissantes), chacune sa quantité ;
 * 2. §49.2 : tant que le façonnage n'est pas choisi, les pattes restent orange « Info manquante », jamais vertes ;
 * 3. §49.4 : chaque pièce de zinguerie écrite a sa question de façonnage à l'écran des questions (sauf si le devis le dit).
 */
const screen = (answers: Record<string, { value: string; unit: string } | null> = {}) => applyRuleConfirmations(readQuote(D2026_018_LINES, answers), answers);
const row = (v: ReturnType<typeof screen>, re: RegExp) => {
  const item = v.toBuy.find((b) => re.test(b.label));
  const r = v.screen.groups.flatMap((g) => g.rows).find((x) => x.itemKey === item?.key);
  return { item, status: r?.status };
};

describe("D-2026-018 : pattes du joint debout et façonnage", () => {
  it("§49.1 : pattes fixes et pattes coulissantes, deux lignes, chacune sa quantité", () => {
    const v = screen({ "param:faconnage@couverture-zinc-joint-debout": { value: "1", unit: "u" } });
    const fixes = row(v, /^Pattes fixes/);
    const coulissantes = row(v, /^Pattes coulissantes/);
    expect(fixes.item?.quantity).toMatch(/^\d[\d ]* pièces$/);
    expect(coulissantes.item?.quantity).toMatch(/^\d[\d ]* pièces$/);
    expect(fixes.item?.quantity).not.toBe(coulissantes.item?.quantity);
  });

  it("§49.2 : façonnage pas choisi, les pattes sont orange « Info manquante », jamais vertes", () => {
    const v = screen();
    for (const re of [/^Pattes fixes/, /^Pattes coulissantes/]) {
      const p = row(v, re);
      expect(p.item, String(re)).toBeDefined();
      expect(p.status, String(re)).toBe("check");
      expect(p.item?.waitsOn).toContain("param:faconnage@couverture-zinc-joint-debout");
    }
    // Choisi : elles passent au vert.
    const ok = screen({ "param:faconnage@couverture-zinc-joint-debout": { value: "1", unit: "u" } });
    expect(row(ok, /^Pattes coulissantes/).item?.waitsOn ?? []).not.toContain("param:faconnage@couverture-zinc-joint-debout");
  });

  it("§49.4 : la question de façonnage du joint debout est à l'écran des questions ; pas pour les pièces dont le devis dit le façonnage", () => {
    const keys = readQuote(D2026_018_LINES).questions.map((q) => q.question?.key ?? q.key).filter((k) => k.startsWith("param:faconnage"));
    // Ventilation « pliées en Z » (commandée façonnée) et rive « comprend le pliage » (je façonne) : le devis le dit.
    expect(keys).toEqual(["param:faconnage@couverture-zinc-joint-debout"]);
    // Obligatoire avant le calcul (« Calculer ma liste » attend, l'API refuse) : jamais close en silence.
    expect(keys.every(isMandatoryQuestion)).toBe(true);
    expect(isMandatoryQuestion("engine:param:faconnage")).toBe(true);
    expect(isMandatoryQuestion("param:consommables")).toBe(false);
  });
});
