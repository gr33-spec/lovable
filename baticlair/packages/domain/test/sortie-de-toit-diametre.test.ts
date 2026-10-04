import { describe, expect, it } from "vitest";
import { readQuote } from "./support/read-quote.js";

/**
 * SORTIE DE TOIT : QUEL DIAMÈTRE ? (réponse du fondateur, 2026-10-04 : « boutons Ø 80 / 100 / 125 / 150 / 180 ou VMC »).
 * La ligne reste telle qu'écrite (marque, modèle) ; tant que le devis ne dit pas le diamètre, elle est orange et sa
 * question a six boutons ; la réponse part dans la précision et la ligne passe au vert. Une ligne qui le dit déjà ne
 * demande rien.
 */
const base = [{ ref: "1", designation: "Couverture ardoises naturelles 32×22 au crochet", quantity: "80", unit: "m²" }];
const avec = (designation: string) => base.concat([{ ref: "2", designation, quantity: "1", unit: "u" }]);
type V = ReturnType<typeof readQuote>;
const row = (v: V) => v.screen.groups.flatMap((g) => g.rows).find((r) => r.itemKey && /sortie de toit/i.test(v.toBuy.find((b) => b.key === r.itemKey)!.label))!;
const item = (v: V) => v.toBuy.find((b) => /sortie de toit/i.test(b.label))!;

describe("sortie de toit : le diamètre à boutons", () => {
  it("sans diamètre : ligne orange, une question à six boutons, la désignation du devis gardée", () => {
    const v = readQuote(avec("Sortie de toit Poujoulat"));
    expect(item(v).label).toBe("Sortie de toit Poujoulat");
    expect(row(v).status).toBe("check");
    const q = v.questions.find((d) => d.key === row(v).decisionKey)!;
    expect(q.question).toMatchObject({ kind: "choose", text: "Sortie de toit : quel diamètre ?" });
    expect(q.question!.options!.map((o) => o.label)).toEqual(["Ø 80", "Ø 100", "Ø 125", "Ø 150", "Ø 180", "VMC"]);
    expect(v.canValidate).toBe(false);
  });

  it("la réponse part dans la précision ; la ligne passe au vert", () => {
    const key = `precise:${item(readQuote(avec("Sortie de toit Poujoulat"))).lineIds[0]}`;
    const v = readQuote(avec("Sortie de toit Poujoulat"), { [key]: "Ø 150" });
    expect(item(v)).toMatchObject({ label: "Sortie de toit Poujoulat", precision: "Ø 150" });
    expect(row(v).status).toBe("ok");
    expect(v.questions.some((d) => d.key === key)).toBe(false);
  });

  it("« Je ne sais pas » : la ligne part telle quelle, à préciser avec le fournisseur", () => {
    const key = `precise:${item(readQuote(avec("Sortie de toit Poujoulat"))).lineIds[0]}`;
    const v = readQuote(avec("Sortie de toit Poujoulat"), { [key]: null });
    expect(item(v).precision).toBeUndefined();
    expect(row(v).status).toBe("supplier");
  });

  it.each(["Sortie de toit Ø 150 Poujoulat", "Sortie de toit diamètre 125", "Sortie de toit VMC", "Sortie de toit 180 mm"])("« %s » dit déjà le diamètre : aucune question", (d) => {
    const v = readQuote(avec(d));
    expect(v.questions.some((q) => q.key.startsWith("precise:"))).toBe(false);
    expect(row(v).decisionKey).toBeUndefined();
  });
});
