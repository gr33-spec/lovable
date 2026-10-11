import { describe, expect, it } from "vitest";
import { ecranDeLecture, ROOFING_REFERENTIAL, type EngineAnswer } from "../src/index.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { lectureEnregistree } from "./support/lectures.js";

/**
 * COUVERTURE EN ARDOISES AU CROCHET : chaque composant détaillé, calculé avec les hypothèses du référentiel, dites.
 * (Les ouvrages comptés, « 6 ardoises ou 6 jouées ? », sont désormais tranchés par la lecture du modèle, §51.5.)
 */
const LINES = [
  { ref: "a1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" },
  { ref: "a2", designation: "Liteaux bois pour ardoises", quantity: "200", unit: "m²" },
  { ref: "a3", designation: "Ardoises pour jouées de lucarnes", quantity: "6", unit: "unités" },
  { ref: "a4", designation: "Entourage de cheminée zinc et solin", quantity: "2", unit: "unités" },
  { ref: "a5", designation: "Chatières de ventilation", quantity: "12", unit: "unités" },
];

function read(answers: Record<string, EngineAnswer> = {}, acceptDraft = false, lines: typeof LINES = LINES) {
  const lecture = lectureEnregistree(ROOFING_REFERENTIAL, lines, [], HABITUDES_BANC, { acceptDraft }, undefined, answers);
  const e = ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture, answers, preferences: HABITUDES_BANC, options: { acceptDraft }, interdits: false });
  return { proposals: e.roles, view: e.view, ouvrage: (ref: string) => e.view.ouvrages.find((o) => o.lineId === ref)! };
}

describe("couverture en ardoises au crochet : chaque composant détaillé", () => {
  it("dès l'ouverture, sans rien demander : ardoises, crochets et liteaux 18×40 calculés avec les hypothèses du référentiel, dites", () => {
    const { ouvrage } = read();
    const couverture = ouvrage("a1");
    expect(couverture.role).toBe("measure");
    const ardoises = couverture.needs.find((n) => n.slot === "ardoise")!;
    const crochets = couverture.needs.find((n) => n.slot === "crochet")!;
    const liteaux = ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    // Pente 45°, zone 3, rampant ≤ 5,5 m → recouvrement 95 mm → pureau (300 − 95) / 2 = 102,5 mm.
    // Formule Cupa (§34), crochet 1 mm : 200 / (0,1025 × 0,221) = 8 829,05 ardoises + 5 % = 9 270,50, soit 9 271 commandées ;
    // crochets = 9 271 × 1,02 = 9 456,42 ; 200 / 0,1025 = 1 951,22 ml + 5 % = 2 048,78 ml.
    expect(ardoises.need).toEqual({ value: "9270.5", unit: "u" });
    expect(crochets.need).toEqual({ value: "9456.42", unit: "u" });
    expect(liteaux.need).toEqual({ value: "2048.78", unit: "ml" });
    expect(ardoises.assumptions.map((a) => `${a.key}=${a.value}`)).toEqual(["param:pente=45", "param:zone=III", "param:longueur_rampant=5,5", "derived:recouvrement=95", "param:pureau=10,25", "param:diametre_crochet=standard"]);
    // Le devis ne précise pas la section : 18×40 par défaut, dit comme hypothèse (modifiable).
    expect(liteaux.label).toBe("Liteaux 18×40");
    expect(liteaux.assumptions).toContainEqual(expect.objectContaining({ key: "product:liteau", value: "Liteaux 18×40", note: expect.stringMatching(/18×40 par défaut/) }));
    for (const n of [ardoises, crochets, liteaux]) expect(n).toMatchObject({ provisional: false, state: "verified" });
  });

  it("pureau donné par l'artisan : il remplace l'hypothèse, les pertes restent", () => {
    const { ouvrage } = read({ "param:pureau": { value: "11", unit: "cm" } });
    const ardoises = ouvrage("a1").needs.find((n) => n.slot === "ardoise")!;
    const crochets = ouvrage("a1").needs.find((n) => n.slot === "crochet")!;
    const liteaux = ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    // Pureau 110 mm sur 30×22 = recouvrement posé 80 mm : ligne de la table Cupa (40,7/m²) → 8 140 + 5 % = 8 547 ;
    // crochets 8 547 × 1,02 = 8 717,94 ; 200 / 0,11 = 1 818,18 ml + 5 % = 1 909,09.
    expect(ardoises.need).toEqual({ value: "8547", unit: "u" });
    expect(crochets.need).toEqual({ value: "8717.94", unit: "u" });
    expect(liteaux.need).toEqual({ value: "1909.09", unit: "ml" });
    expect(ardoises.assumptions.some((a) => a.key === "param:pureau" || a.key === "derived:recouvrement")).toBe(false);
    for (const n of [ardoises, crochets, liteaux]) expect(n).toMatchObject({ provisional: false });
  });

  it("le devis nomme une autre section de liteau : elle l'emporte, plus de « 18×40 par défaut »", () => {
    const lines = LINES.map((l) => (l.ref === "a2" ? { ...l, designation: "Liteaux sapin 27x40 pour ardoises" } : l));
    const liteaux = read({}, false, lines).ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    expect(liteaux.label).toBe("Liteaux 27×40");
    expect(liteaux.usual).toBeNull();
  });
});
