/**
 * Retour du fondateur (2026-10-12, écran Aperçu, D-2026-018 ; règle demandée aussi sur DE00000071) :
 *  - « Une fourniture = une ligne, additionnée (§49.9) » : « Cartouches de silicone zinc » et « Vis inox 4 × 40 » sortaient
 *    deux fois (une par pièce de zinc) ;
 *  - « Une précision ne s'écrit que si elle apporte une info absente de la désignation ; jamais de doublon » :
 *    « épaisseur : au choix du fournisseur » sur presque toutes les lignes, parfois deux fois, alors que « 0,65 mm » est écrit.
 */
import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, DE00000071_LECTURE, ecranDeLecture, precisionPropre, ROOFING_REFERENTIAL, type EngineAnswer, type LectureDevis, type PurchaseView } from "../src/index.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { answerAll } from "./support/lot-b.js";
import { lectureEnregistree } from "./support/lectures.js";

const ref = ROOFING_REFERENTIAL;
const run = (lecture: LectureDevis) => (answers: Record<string, EngineAnswer>) => applyRuleConfirmations(ecranDeLecture({ ref, lecture, answers, preferences: HABITUDES_BANC }).purchase, answers as never);
const doublons = (v: PurchaseView) => {
  const vus = new Map<string, number>();
  for (const b of v.toBuy) vus.set(b.label, (vus.get(b.label) ?? 0) + 1);
  return [...vus].filter(([, n]) => n > 1).map(([l]) => l);
};
const choixEcrits = (v: PurchaseView) => v.toBuy.filter((b) => /0,65 mm/.test(b.label) && /paisseur[^;]*au choix du fournisseur/i.test(b.precision ?? "")).map((b) => b.label);

describe("zéro ligne en double, zéro « au choix du fournisseur » sur une donnée écrite", () => {
  it("D-2026-018 (consommables acceptés, épaisseur laissée au fournisseur comme en production) : chaque fourniture une fois, additionnée", () => {
    const lecture = structuredClone(lectureEnregistree(ref, D2026_018_LINES, [], HABITUDES_BANC, {}));
    for (const l of lecture.lignes) for (const f of l.fournitures) f.aPreciser = ["épaisseur"];
    const go = run(lecture);
    const { answers } = answerAll(go);
    // Comme en production : l'artisan a laissé l'épaisseur au fournisseur sur chaque ligne (« Au choix du fournisseur »).
    for (const l of lecture.lignes) answers[`a-preciser:${l.ref}`] = "ok";
    const v = go({ ...answers, "param:consommables": { value: "1", unit: "u" } });
    expect(doublons(v)).toEqual([]);
    expect(v.toBuy.find((b) => b.label === "Vis inox 4 × 40")?.quantity).toBe("1 boîte de 200");
    expect(choixEcrits(v)).toEqual([]);
    for (const b of v.toBuy) {
      const morceaux = (b.precision ?? "").split(/\s*;\s*/).filter(Boolean);
      expect(new Set(morceaux).size, b.label).toBe(morceaux.length);
    }
  });

  it("DE00000071 : tout répondu, chaque fourniture une fois", () => {
    const { last } = answerAll(run(DE00000071_LECTURE));
    expect(doublons(last)).toEqual([]);
  });

  it("la précision garde ce qui manque au nom, une fois", () => {
    expect(precisionPropre("31 bacs × 7,15 m ; épaisseur : au choix du fournisseur", "Bobine Quartz-Zinc 0,65 mm, largeur 500 mm")).toBe("31 bacs × 7,15 m");
    expect(precisionPropre("pour 13 ml de joint ; épaisseur, développé : au choix du fournisseur ; épaisseur : au choix du fournisseur", "Cartouches de silicone zinc")).toBe("pour 13 ml de joint ; épaisseur, développé : au choix du fournisseur");
    expect(precisionPropre("Perforée, pliée en Z. ; épaisseur, développé : au choix du fournisseur", "Bande de ventilation en Z, Quartz-Zinc 0,65 mm")).toBe("Perforée, pliée en Z ; développé : au choix du fournisseur");
  });
});
