/**
 * §51.6 (retour du fondateur, 2026-10-12) : « tout orange a sa question, et quand toutes les questions sont répondues la
 * liste est verte. Une donnée écrite dans le devis ou déjà répondue ne peut pas être « à préciser ». » L'orange ne vient
 * que d'une question sans réponse ou retirée ; ce que le fournisseur précisera se dit dans la précision de la ligne.
 * Capture du fondateur : après les deux vagues, 11 lignes orange « Épaisseur à préciser », dont « Bobine Quartz-Zinc
 * 0,65 mm » et « Feuilles Quartz-Zinc 2 × 1 m, 0,65 mm » (la lecture avait marqué l'épaisseur « à préciser »).
 * Puis (même jour, capture « Crochets … · Finition à préciser ») : « tout orange a sa question, et elle se règle là où on
 * ouvre la ligne » : chaque ligne orange porte sa question (`asks`), boutons, « Au choix du fournisseur », « Autre ».
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
/** Tout répondre : l'écran des questions, puis la question de chaque ligne orange (le premier bouton), jusqu'au vert. */
const toutRepondre = (go: (a: Record<string, EngineAnswer>) => PurchaseView) => {
  const { first, answers } = answerAll(go);
  let last = go(answers);
  for (let round = 0; round < 5; round++) {
    const asks = last.toBuy.flatMap((b) => b.asks ?? []).filter((a) => answers[a.key] === undefined);
    if (asks.length === 0) break;
    for (const a of asks) answers[a.key] = a.options[0] ? (a.unit ? { value: a.options[0].value, unit: a.unit } : a.options[0].value) : "ok";
    last = go(answers);
  }
  return { first, last, answers };
};
const run = (lecture: LectureDevis) => (answers: Record<string, EngineAnswer>) => applyRuleConfirmations(ecranDeLecture({ ref, lecture, answers, preferences: HABITUDES_BANC }).purchase, answers as never);

describe("§51.6 : toutes les questions répondues, zéro ligne orange", () => {
  it("DE00000071 : chaque ligne orange porte sa question dans sa fiche ; tout répondu, la liste est entièrement verte", () => {
    const go = run(DE00000071_LECTURE);
    const { first, last } = toutRepondre(go);
    expect(oranges(first).length).toBeGreaterThan(0);
    // Après les deux vagues, ce qui reste orange se règle dans la fiche de la ligne : jamais une ligne orange sans question.
    const { answers } = answerAll(go);
    const apres = go(answers);
    for (const r of apres.screen.groups.flatMap((g) => g.rows).filter((x) => x.status === "check")) {
      const b = apres.toBuy.find((x) => x.key === r.itemKey)!;
      expect(b.asks?.length ?? 0, b.label).toBeGreaterThan(0);
      for (const a of b.asks!) expect(a.options.length, `${b.label} : ${a.text}`).toBeGreaterThan(0);
    }
    const toles = apres.toBuy.find((b) => /^Tôles/i.test(b.label))!;
    expect(toles.asks?.find((a) => a.key.startsWith("a-preciser:"))).toMatchObject({ text: "Profil, teinte", options: expect.arrayContaining([{ label: "Au choix du fournisseur", value: "ok" }]) });
    expect(oranges(last)).toEqual([]);
    expect(last.toBuy.find((b) => /^Tôles/i.test(b.label))!.precision).toMatch(/Profil, teinte : au choix du fournisseur/);
  });

  it("D-2026-018 : « Crochets … · Finition à préciser » a sa question dans la fiche ; une réponse écrite la passe au vert, dans sa précision", () => {
    const lecture = structuredClone(lectureEnregistree(ref, D2026_018_LINES, [], HABITUDES_BANC, {}));
    const crochets = lecture.lignes.flatMap((l) => l.fournitures).filter((f) => /crochet/i.test(f.nom));
    expect(crochets.length).toBeGreaterThan(0);
    for (const f of crochets) f.aPreciser = ["finition"];
    const go = run(lecture);
    const { answers } = answerAll(go);
    const v = go(answers);
    const item = v.toBuy.find((b) => /crochet/i.test(b.label) && (b.asks ?? []).some((a) => a.key.startsWith("a-preciser:")))!;
    const ask = item.asks!.find((a) => a.key.startsWith("a-preciser:"))!;
    expect(ask.text).toBe("Finition");
    expect(oranges(v).some((o) => o.startsWith(item.label) && /Finition à préciser/.test(o))).toBe(true);
    const done = go({ ...answers, [ask.key]: "Inox" });
    const after = done.toBuy.find((b) => b.key === item.key)!;
    expect(after.precision).toMatch(/Inox/);
    expect(done.screen.groups.flatMap((g) => g.rows).find((r) => r.itemKey === item.key)?.status).toBe("ok");
  });

  it("D-2026-018 : une épaisseur marquée « à préciser » alors qu'elle est écrite (« 0,65 mm ») ne met aucune ligne en orange, ni ne s'écrit dans la précision", () => {
    const lecture = structuredClone(lectureEnregistree(ref, D2026_018_LINES, [], HABITUDES_BANC, {}));
    for (const l of lecture.lignes) for (const f of l.fournitures) f.aPreciser = ["épaisseur"];
    const { last } = toutRepondre(run(lecture));
    expect(oranges(last)).toEqual([]);
    for (const b of last.toBuy.filter((x) => /0,65 mm/.test(x.label))) expect(b.precision ?? "", b.label).not.toMatch(/paisseur/i);
  });

  it("une question retirée (sans réponse) garde sa ligne orange : c'est juste (§51.6)", () => {
    const answers: Record<string, EngineAnswer> = {};
    const { answers: all } = toutRepondre(run(DE00000071_LECTURE));
    Object.assign(answers, all, { "param:developpe_gouttiere": null });
    expect(oranges(run(DE00000071_LECTURE)(answers)).length).toBeGreaterThan(0);
  });
});
