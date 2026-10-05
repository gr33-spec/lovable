import { describe, expect, it } from "vitest";
import { PLATRERIE_REFERENTIAL, referentialFor, ROOFING_REFERENTIAL, tradeIdOf } from "../src/index.js";

/** Un métier = un tiroir (§22) : le référentiel suit le métier, jamais celui du couvreur par défaut. */
describe("referentialFor : le tiroir du métier", () => {
  it("couverture et plâtrerie ont leur tiroir, sous leur nom ou leur identifiant", () => {
    expect(referentialFor("roofing")).toBe(ROOFING_REFERENTIAL);
    expect(referentialFor("couverture")).toBe(ROOFING_REFERENTIAL);
    expect(referentialFor("drywall")).toBe(PLATRERIE_REFERENTIAL);
    expect(referentialFor("Plâtrerie")).toBe(PLATRERIE_REFERENTIAL);
    expect(tradeIdOf("Platrerie")).toBe("drywall");
  });
  it("un métier sans tiroir : null, jamais le couvreur", () => {
    expect(referentialFor("flooring")).toBeNull();
    expect(referentialFor("other")).toBeNull();
    expect(referentialFor("")).toBeNull();
    expect(referentialFor(null)).toBeNull();
  });
  it("multi-métiers : le premier qui a un tiroir", () => {
    expect(referentialFor("flooring,drywall")).toBe(PLATRERIE_REFERENTIAL);
    expect(referentialFor("roofing,drywall")).toBe(ROOFING_REFERENTIAL);
  });
});

/**
 * Point 5 du lot §44 : en plâtrerie, rails, montants et entraxe restent en BROUILLON tant qu'un plaquiste ne les a pas
 * validés. Ce test casse si l'un d'eux passe « vérifié » sans qu'on l'ait décidé.
 */
describe("plâtrerie : rails, montants, entraxe restent en brouillon", () => {
  const cloison = PLATRERIE_REFERENTIAL.workItems.find((w) => w.id === "cloison-72-48")!;
  it("les besoins rails et montants sont en brouillon", () => {
    expect(cloison.needs.filter((n) => n.id === "rails" || n.id === "montants").map((n) => [n.id, n.verification.status])).toEqual([
      ["rails", "draft"],
      ["montants", "draft"],
    ]);
  });
  it("l'entraxe des montants (et la hauteur, la longueur de cloison qui en découlent) aussi", () => {
    expect(cloison.params.find((p) => p.key === "entraxe_montants")?.default?.verification.status).toBe("draft");
    expect(cloison.derived?.find((d) => d.key === "longueur_cloison")?.verification.status).toBe("draft");
    expect(cloison.constants.rails_par_cloison?.verification.status).toBe("draft");
    expect(cloison.constants.montant_de_depart?.verification.status).toBe("draft");
  });
});
