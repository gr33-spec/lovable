import { describe, expect, it } from "vitest";
import { readQuote } from "./support/read-quote.js";

/**
 * UN SEUL ÉCRAN : LA LISTE DES FOURNITURES (retour du fondateur, 2026-10-04, « un enfant de 10 ans s'en sort »).
 * Chaque ligne a sa couleur : vert = sûr ; orange = à vérifier, un tap ouvre SA question ; gris = à préciser avec le
 * fournisseur. Groupes : ouvrage principal, points singuliers, évacuation, autres, consommables.
 */
const TEST = [
  { ref: "1", designation: "Couverture zinc à joint debout prépatiné gris quartz 0,65 mm, monopente, rampant 7 m, largeur 13 m", quantity: "91", unit: "m²" },
  { ref: "2", designation: "Voligeage en sapin traité 18×200 mm", quantity: "91", unit: "m²" },
  { ref: "3", designation: "Bande zinc d'égout", quantity: "13", unit: "ml" },
  { ref: "4", designation: "Gouttière zinc demi-ronde", quantity: "13", unit: "ml" },
  { ref: "5", designation: "Jouées de lucarnes", quantity: "2", unit: "u" },
];
const u = (value: string, unit = "u") => ({ value, unit });
const TOUT = {
  "param:faconnage": u("1"),
  "param:nb_descentes": u("2"),
  "param:developpe": u("330", "mm"),
  "param:developpe_gouttiere": u("33", "cm"),
  "param:fixation_crochet": u("2"),
  "param:diametre_descente": u("80", "mm"),
};
type V = ReturnType<typeof readQuote>;
const rows = (v: V) => v.screen.groups.flatMap((g) => g.rows);
const label = (v: V, r: ReturnType<typeof rows>[number]) =>
  r.itemKey ? v.toBuy.find((b) => b.key === r.itemKey)!.label : r.quoteKey ? v.toQuote.find((q) => q.key === r.quoteKey)!.label : r.pending!.label;

describe("la liste des fournitures, une couleur par ligne", () => {
  it("groupes dans l'ordre : ouvrage principal, points singuliers, évacuation, autres (consommables : seulement s'ils sont écrits)", () => {
    const v = readQuote(TEST);
    expect(v.screen.groups.map((g) => g.kind)).toEqual(["principal", "singulier", "evacuation", "autres"]);
    expect(v.screen.groups[0]).toMatchObject({ label: "Couverture zinc à joint debout", measure: "91 m²" });
  });

  it("à l'ouverture : chaque question est une ligne orange de son ouvrage, avec sa décision ; le compte en haut", () => {
    const v = readQuote(TEST);
    const check = rows(v).filter((r) => r.status === "check");
    // Règle du comptoir (§47.8) : la gouttière sans développé, les naissances sans nombre ne se chiffrent pas. RÈGLE NUMÉRO
    // UN : pas de crochets de gouttière (non écrits), donc pas de question sur leur pose.
    expect(check.map((r) => [label(v, r), r.decisionKey])).toEqual([
      ["Zinc en bobine 500 mm ou Bacs joint debout zinc", "engine:param:faconnage@couverture-zinc-joint-debout"],
      ["Bandes zinc façonnées ou Feuilles zinc 2 × 1 m", "engine:param:faconnage@bandes-zinc"],
      ["Gouttière", "engine:param:developpe_gouttiere"],
      ["Naissances", "engine:param:nb_descentes"],
      ["Jouées de lucarnes", "group:unknown"],
    ]);
    // Chaque ligne orange ouvre une vraie question de l'écran.
    for (const r of check) expect(v.questions.map((d) => d.key)).toContain(r.decisionKey);
    expect(v.screen).toMatchObject({ total: rows(v).length, toCheck: 5 });
  });

  it("une réponse fait passer ses lignes au vert ; la question suivante d'un ouvrage (le développé) vient après", () => {
    // Je façonne, 13 ml : des feuilles 2 × 1 m estimées d'après le développé (§48.6), qui vient alors.
    const apres = readQuote(TEST, { "param:faconnage": u("1") });
    expect(rows(apres).filter((r) => r.status === "check").map((r) => [label(apres, r), r.decisionKey])).toEqual([
      ["Feuilles zinc 2 × 1 m", "engine:param:developpe"],
      ["Gouttière", "engine:param:developpe_gouttiere"],
      ["Naissances", "engine:param:nb_descentes"],
      ["Jouées de lucarnes", "group:unknown"],
    ]);
    const tout = readQuote(TEST, TOUT);
    expect(rows(tout).filter((r) => r.status === "check").map((r) => label(tout, r))).toEqual(["Jouées de lucarnes"]);
    expect(rows(tout).filter((r) => r.status === "ok").map((r) => label(tout, r))).toContain("Bobine Quartz-Zinc 0,65 mm, largeur 500 mm");
  });

  it("gris : à préciser avec le fournisseur, la ligne part telle quelle ; aucun consommable ajouté d'office (règle numéro un)", () => {
    const tout = readQuote(TEST, TOUT);
    const sansDoute = readQuote(TEST.slice(0, 4).concat([{ ref: "5", designation: "Chatière de ventilation", quantity: "4", unit: "u" }]), {});
    expect(rows(sansDoute).every((r) => r.status !== "supplier" || r.quoteKey)).toBe(true);
    expect(tout.screen.groups.map((g) => g.kind)).not.toContain("consommables");
    expect(rows(tout).map((r) => label(tout, r))).not.toContain("Pointes annelées 2,5 × 28 mm");
  });
});
