/**
 * §51.6 (retour du fondateur, 2026-10-12) : « tout orange a sa question, et quand toutes les questions sont répondues la
 * liste est verte. Une donnée écrite dans le devis ou déjà répondue ne peut pas être « à préciser ». » L'orange ne vient
 * que d'une question sans réponse ou retirée ; ce que le fournisseur précisera se dit dans la précision de la ligne.
 * Capture du fondateur : après les deux vagues, 11 lignes orange « Épaisseur à préciser », dont « Bobine Quartz-Zinc
 * 0,65 mm » et « Feuilles Quartz-Zinc 2 × 1 m, 0,65 mm » (la lecture avait marqué l'épaisseur « à préciser »).
 */
import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, DE00000071_LECTURE, ecranDeLecture, ROOFING_REFERENTIAL, type EngineAnswer, type LectureDevis, type PurchaseView } from "../src/index.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { answerAll } from "./support/lot-b.js";
import { lectureEnregistree } from "./support/lectures.js";

const ref = ROOFING_REFERENTIAL;
const oranges = (v: PurchaseView) =>
  v.screen.groups.flatMap((g) => g.rows).filter((r) => r.status === "check").map((r) => `${v.toBuy.find((b) => b.key === r.itemKey)?.label ?? r.key} (${r.reason ?? ""})`);
const run = (lecture: LectureDevis) => (answers: Record<string, EngineAnswer>) => applyRuleConfirmations(ecranDeLecture({ ref, lecture, answers, preferences: HABITUDES_BANC }).purchase, answers as never);

describe("§51.6 : toutes les questions répondues, zéro ligne orange", () => {
  it("DE00000071 : les deux vagues répondues, la liste est entièrement verte (les tôles disent « Profil, teinte à voir avec le fournisseur »)", () => {
    const { first, last } = answerAll(run(DE00000071_LECTURE));
    expect(oranges(first).length).toBeGreaterThan(0);
    expect(oranges(last)).toEqual([]);
    const toles = last.toBuy.find((b) => /^Tôles/i.test(b.label))!;
    expect(toles.precision).toMatch(/Profil, teinte à voir avec le fournisseur/);
  });

  it("D-2026-018 : une épaisseur marquée « à préciser » alors qu'elle est écrite (« 0,65 mm ») ne met aucune ligne en orange, ni ne s'écrit dans la précision", () => {
    const lecture = structuredClone(lectureEnregistree(ref, D2026_018_LINES, [], HABITUDES_BANC, {}));
    for (const l of lecture.lignes) for (const f of l.fournitures) f.aPreciser = ["épaisseur"];
    const { last } = answerAll(run(lecture));
    expect(oranges(last)).toEqual([]);
    for (const b of last.toBuy.filter((x) => /0,65 mm/.test(x.label))) expect(b.precision ?? "", b.label).not.toMatch(/paisseur/i);
  });

  it("une question retirée (sans réponse) garde sa ligne orange : c'est juste (§51.6)", () => {
    const answers: Record<string, EngineAnswer> = {};
    const { answers: all } = answerAll(run(DE00000071_LECTURE));
    Object.assign(answers, all, { "param:developpe_gouttiere": null });
    expect(oranges(run(DE00000071_LECTURE)(answers)).length).toBeGreaterThan(0);
  });
});
