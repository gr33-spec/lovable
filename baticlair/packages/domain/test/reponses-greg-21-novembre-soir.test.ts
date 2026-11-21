import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ecranDeLecture, parseLecture, ROOFING_REFERENTIAL as ref, SUGGESTIONS_KEY, type EngineAnswer } from "../src/index.js";

/**
 * RÉPONSES DE GREG DU 21 NOVEMBRE 2026 (SOIR), sur les chantiers du banc du calcul (lectures enregistrées, sans IA).
 * 4. « Égout : la longueur de la gouttière si elle est écrite. Sinon, une seule question : Tes m² d'ardoise comprennent
 *    déjà l'égout et les coupes ? Si oui, on n'ajoute rien. Si non : Quelle longueur d'égout ? »
 * 9. « Remaniage : aucune ardoise d'office. Question : Tu vas remanier. Je te prévois des ardoises ? Si oui, combien ? »
 * Ajout 1. « Sur toute réfection de toiture, si le devis n'en parle pas, propose en Suggestions : Sortie de ventilation
 *    (VMC, extraction d'air). […] l'article commandé s'adapte au matériau. »
 */
const lecture = (c: string) => parseLecture(JSON.parse(readFileSync(new URL(`./banc-couverture/${c}.json`, import.meta.url), "utf8")).lecture)!;
const ecran = (c: string, answers: Record<string, EngineAnswer> = {}) => ecranDeLecture({ ref, lecture: lecture(c), answers, preferences: {} });
const questions = (e: ReturnType<typeof ecran>) => e.questions.map((q) => q.key);
const ligne = (e: ReturnType<typeof ecran>, mot: RegExp) => e.purchase.toBuy.find((b) => mot.test(b.label));
const TOIT = "couverture-ardoises-crochet__4";

describe("égout d'un toit d'ardoise (C05 : aucune gouttière au devis)", () => {
  it("une seule question à boutons ; la longueur ne se demande pas d'avance", () => {
    const e = ecran("C05");
    const q = e.questions.find((x) => x.key === `param:egout_compris@${TOIT}`)!;
    expect(q.text).toMatch(/[Tt]es m² d'ardoise comprennent déjà l'égout et les coupes \?$/);
    expect(q.options?.map((o) => o.label)).toEqual(["Oui", "Non"]);
    expect(questions(e).join(" ")).not.toMatch(/egout_a_ajouter/);
  });

  it("« Oui » : rien ne s'ajoute, la longueur n'est jamais demandée ; « Non » : la longueur se demande, et compte un rang", () => {
    const oui = ecran("C05", { [`param:egout_compris@${TOIT}`]: { value: "1", unit: "u" } });
    expect(questions(oui).join(" ")).not.toMatch(new RegExp(`egout_(compris|a_ajouter)@${TOIT}`));
    const non = ecran("C05", { [`param:egout_compris@${TOIT}`]: { value: "2", unit: "u" } });
    expect(questions(non)).toContain(`param:egout_a_ajouter@${TOIT}`);
    expect(non.questions.find((x) => x.key === `param:egout_a_ajouter@${TOIT}`)!.text).toMatch(/[Qq]uelle longueur d'égout \?$/);
  });

  it("C01 : la gouttière est écrite (16 m), aucune question d'égout ; 4 107 ardoises = (96 m² × 39,6 + faîtage 8 m et égout 16 m, un rang chacun) + 5 %", () => {
    const e = ecran("C01");
    expect(questions(e).join(" ")).not.toMatch(/egout/);
    expect(ligne(e, /^Ardoises/)?.quantity).toBe("4 107 pièces");
  });
});

describe("remaniage d'ardoises (C08 : « Remaniage ardoises autour noue », 12 m²)", () => {
  it("aucune ardoise d'office ; la question de Greg ; le nombre dit est commandé tel quel, sans marge", () => {
    const e = ecran("C08");
    const q = e.questions.find((x) => x.key === "param:ardoises_a_prevoir")!;
    expect(q.text).toBe("Tu vas remanier. Je te prévois des ardoises ? Si oui, combien ?");
    expect(e.purchase.toBuy.filter((b) => /rdoise/.test(b.label) && /[1-9]/.test(b.quantity ?? ""))).toEqual([]);
    const dit = ecran("C08", { "param:ardoises_a_prevoir": { value: "170", unit: "u" } });
    expect(ligne(dit, /rdoises pour remaniage/)?.quantity).toBe("170 pièces");
  });
});

describe("suggestion « Sortie de ventilation »", () => {
  it("proposée sur une couverture dont le devis ne parle pas de sortie de toit (C01, ardoise) ; jamais d'office", () => {
    const e = ecran("C01");
    expect(e.suggestions.map((s) => s.label)).toContain("Sortie de ventilation (VMC, extraction d'air)");
    expect(e.purchase.toBuy.map((b) => b.label).join(" | ")).not.toMatch(/ventilation/i);
  });

  it("cochée : une pièce, adaptée à l'ardoise", () => {
    const e = ecran("C01", { [SUGGESTIONS_KEY]: "couverture-ardoises-crochet/sortie_ventilation" });
    expect(ligne(e, /ventilation/i)).toMatchObject({ label: "Sortie de ventilation pour ardoise", quantity: "1 pièce" });
  });

  it("pas proposée quand le devis écrit déjà une sortie de toit (C12) ; sur tuile, la sortie écrite est une tuile à douille et sa lanterne", () => {
    const e = ecran("C12");
    expect(e.suggestions.map((s) => s.label)).not.toContain("Sortie de ventilation (VMC, extraction d'air)");
    expect(ligne(e, /douille/)?.quantity).toBe("1 pièce");
    expect(ligne(e, /[Ll]anterne/)?.quantity).toBe("1 pièce");
    expect(e.purchase.toBuy.map((b) => b.label).join(" | ")).not.toMatch(/[Ee]mbase plomb|Chapeau/);
  });
});
