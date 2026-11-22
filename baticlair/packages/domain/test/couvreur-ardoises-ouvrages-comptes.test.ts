import { describe, expect, it } from "vitest";
import { ecranDeLecture, ROOFING_REFERENTIAL, type EngineAnswer } from "../src/index.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { lectureEnregistree } from "./support/lectures.js";
import { EGOUT_COMPRIS_OUI } from "./support/read-quote.js";

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
  return { proposals: e.roles, view: e.view, questions: e.questions, ouvrage: (ref: string) => e.view.ouvrages.find((o) => o.lineId === ref)! };
}

describe("couverture en ardoises au crochet : chaque composant détaillé", () => {
  it("dès l'ouverture, sans rien demander : ardoises, crochets et liteaux 18×40 calculés avec les hypothèses du référentiel, dites", () => {
    // Règle changée (Greg, 21 novembre 2026) : avant, aucune question → l'égout se demande quand aucune gouttière n'est écrite.
    const ouverture = read();
    const oui = read(EGOUT_COMPRIS_OUI);
    // La seule question de la couverture : celle de l'égout (les autres questions du devis, cheminée et pliage, ne changent pas).
    expect(ouverture.questions.map((q) => q.key).filter((k) => !oui.questions.some((q) => q.key === k))).toEqual(["param:egout_compris"]);
    expect(ouverture.questions.find((q) => q.key === "param:egout_compris")).toMatchObject({ text: "Tes m² d'ardoise comprennent déjà l'égout et les coupes ?", options: [{ label: "Oui", value: "1" }, { label: "Non", value: "2" }] });
    expect(ouverture.ouvrage("a1").needs.find((n) => n.slot === "ardoise")).toMatchObject({ need: null, missing: "Tes m² d'ardoise comprennent déjà l'égout et les coupes ?" });
    // « Oui » : tout est calculé comme avant.
    const { ouvrage } = oui;
    const couverture = ouvrage("a1");
    expect(couverture.role).toBe("measure");
    const ardoises = couverture.needs.find((n) => n.slot === "ardoise")!;
    const crochets = couverture.needs.find((n) => n.slot === "crochet")!;
    const liteaux = ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    // Pente 45°, zone 3, rampant ≤ 5,5 m → recouvrement 89 mm (NF DTU 40.11, fiche couverture) → pureau (300 − 89) / 2 = 105,5 mm.
    // Table Cupa (§34) : 42,5/m² × 200 = 8 500 ardoises + 5 % = 8 925 ; crochets = un par ardoise commandée, 8 925 ;
    // 200 / 0,1055 = 1 895,73 ml + 10 % de chute = 2 085,31 ml. (Avant, ancien tableau : recouvrement 95 mm, 9 271 ardoises.)
    // Règle changée (Greg, 22 novembre 2026) : 10 % de chute au total sur les liteaux, contre-liteaux 5 % ; avant (hier) 2 189,57 → 2 085,31 ml (200 ÷ 0,1055 × 1,10).
    expect(ardoises.need).toEqual({ value: "8925", unit: "u" });
    expect(crochets.need).toEqual({ value: "8925", unit: "u" });
    expect(liteaux.need).toEqual({ value: "2085.31", unit: "ml" });
    expect(ardoises.assumptions.map((a) => `${a.key}=${a.value}`)).toEqual([
      // Greg, 21 novembre 2026 : les ouvrages au mètre se lisent au devis ; il n'en écrit aucun : zéro, jamais dit en hypothèse.
      "param:pente=45", "param:zone=III", "param:longueur_rampant=5,5", "param:situation=normale", "derived:recouvrement=89", "param:pureau=10,55", "param:diametre_crochet=standard",
    ]);
    // Le devis ne précise pas la section : 18×40 par défaut, dit comme hypothèse (modifiable).
    expect(liteaux.label).toBe("Liteaux 18×40");
    expect(liteaux.assumptions).toContainEqual(expect.objectContaining({ key: "product:liteau", value: "Liteaux 18×40", note: expect.stringMatching(/18×40 par défaut/) }));
    for (const n of [ardoises, crochets, liteaux]) expect(n).toMatchObject({ provisional: false, state: "verified" });
  });

  it("pureau donné par l'artisan : il remplace l'hypothèse, les pertes restent", () => {
    const { ouvrage } = read({ ...EGOUT_COMPRIS_OUI, "param:pureau": { value: "11", unit: "cm" } });
    const ardoises = ouvrage("a1").needs.find((n) => n.slot === "ardoise")!;
    const crochets = ouvrage("a1").needs.find((n) => n.slot === "crochet")!;
    const liteaux = ouvrage("a2").needs.find((n) => n.slot === "liteau")!;
    // Pureau 110 mm sur 30×22 = recouvrement posé 80 mm : ligne de la table Cupa (40,7/m²) → 8 140 + 5 % = 8 547 ;
    // crochets = un par ardoise commandée, 8 547 (avant × 1,02) ; 200 / 0,11 = 1 818,18 ml + 10 % de chute = 2 000.
    // Règle changée (Greg, 22 novembre 2026) : 10 % de chute au total sur les liteaux, contre-liteaux 5 % ; avant (hier) 2 100 → 2 000 ml (200 ÷ 0,11 × 1,10).
    expect(ardoises.need).toEqual({ value: "8547", unit: "u" });
    expect(crochets.need).toEqual({ value: "8547", unit: "u" });
    expect(liteaux.need).toEqual({ value: "2000", unit: "ml" });
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
