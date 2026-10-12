/**
 * §52 (décision du 11 octobre) : « Un devis multi-lots donne une liste par lot, chacun avec son référentiel. » Directive
 * du fondateur (2026-10-12) : « on y va franco, fais en sorte que l'appli fonctionne en multi métiers. » Le devis 7954
 * (électricité, VMC, sanitaire) en petit : chaque lot calculé avec son tiroir, une section par lot, dans l'ordre du devis.
 */
import { describe, expect, it } from "vitest";
import { ecranParLots, parseFiche, referentialFor, ROOFING_REFERENTIAL, type LectureDevis } from "../src/index.js";

const f = (nom: string, quantite: string, unite: string, ouvrage: string | null = null) => ({ nom, quantite, unite, ouvrage, emplacement: null, donnees: {}, attend: [], aPreciser: [], precision: null });
const lecture: LectureDevis = {
  metier: "electrical",
  lots: [
    { metier: "electrical", libelle: "Électricité", lignes: ["1", "2"] },
    { metier: "plumbing", libelle: "Sanitaire", lignes: ["3"] },
  ],
  fiche: parseFiche([{ donnee: "ouvrage", valeur: "4 logements", origine: "lue", preuve: "en-tête" }])!,
  bref: ["Transformation d'un immeuble en 4 logements"],
  questions: [],
  lignes: [
    { ref: "1", designation: "Prise de courant 16A", quantite: "9", unite: "u", role: "fourniture_et_pose", fournitures: [f("Prise de courant 16 A 2P+T", "9", "u", "prise-16a")] },
    { ref: "2", designation: "Prise de courant 16A", quantite: "6", unite: "u", role: "fourniture_et_pose", fournitures: [f("Prise de courant 16 A 2P+T", "6", "u", "prise-16a")] },
    { ref: "3", designation: "Mitigeur lavabo chromé", quantite: "4", unite: "u", role: "fourniture_et_pose", fournitures: [f("Mitigeur lavabo chromé", "4", "u")] },
  ],
  contexte: {},
  notes: [],
};

describe("§52 : une liste par lot, chacun avec son référentiel", () => {
  const e = ecranParLots({ ref: ROOFING_REFERENTIAL, lecture, refDe: (m) => referentialFor(m) });
  const libelle = (key: string | undefined) => e.purchase.toBuy.find((b) => b.key === key)?.label ?? "";

  it("deux sections, dans l'ordre du devis, chacune nommée par son lot et calculée par son tiroir", () => {
    expect(e.purchase.screen.groups.map((g) => g.label)).toEqual(["Électricité", "Sanitaire"]);
    expect(e.lots.map((l) => [l.libelle, l.trade])).toEqual([["Électricité", "electrical"], ["Sanitaire", "plumbing"]]);
  });

  it("l'électricité additionne ses points (9 + 6 = 15 prises) ; le sanitaire garde son mitigeur", () => {
    const [elec, sani] = e.purchase.screen.groups;
    const prises = elec!.rows.map((r) => r.itemKey).map((k) => e.purchase.toBuy.find((b) => b.key === k)).find((b) => /^Prise 2P\+T 16 A/.test(b?.label ?? ""));
    expect(prises?.quantity).toMatch(/^15\b/);
    expect(sani!.rows.map((r) => libelle(r.itemKey))).toEqual([expect.stringMatching(/Mitigeur lavabo/)]);
  });

  it("un devis d'un seul lot ne change pas", () => {
    const seul = ecranParLots({ ref: referentialFor("electrical")!, lecture: { ...lecture, lots: [] }, refDe: (m) => referentialFor(m) });
    expect(seul.lots).toEqual([]);
    expect(seul.purchase.screen.groups.some((g) => g.key.startsWith("lot:"))).toBe(false);
  });
});
