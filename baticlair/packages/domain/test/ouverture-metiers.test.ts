// Lot C (Greg, 15 novembre 2026) : au lancement public, seuls Couverture et Peinture sont utilisables ; les autres métiers
// restent visibles avec le badge « Bientôt ». Un seul réglage, une seule liste.
import { describe, expect, it } from "vitest";
import { lireMetiersOuverts, lotOuvertV1, METIERS_CATALOGUE, METIER_DU_LOT_V1, LOTS_V1, metierOuvert, ouvertsDAbord } from "../src/index.js";

describe("ouverture des métiers", () => {
  it("sans réglage : la production ouvre Couverture et Peinture, le site de test ouvre tout", () => {
    expect(lireMetiersOuverts(undefined, true)).toEqual(["couverture", "peinture"]);
    expect(lireMetiersOuverts("", false)).toBe("tous");
  });
  it("le réglage ouvre un métier sans toucher aux écrans ; un code inconnu est ignoré ; jamais une application sans métier", () => {
    expect(lireMetiersOuverts("couverture, peinture ,zinguerie", true)).toEqual(["couverture", "peinture", "zinguerie"]);
    expect(lireMetiersOuverts("TOUS", true)).toBe("tous");
    expect(lireMetiersOuverts("plomberie,inconnu", true)).toEqual(["plomberie"]);
    expect(lireMetiersOuverts("n-importe-quoi", true)).toEqual(["couverture", "peinture"]);
  });
  it("au lancement : Zinguerie et Étanchéité restent des métiers à part, « Bientôt » ; ouverts d'abord", () => {
    const o = lireMetiersOuverts(undefined, true);
    expect(METIERS_CATALOGUE.filter((m) => metierOuvert(m, o))).toEqual(["couverture", "peinture"]);
    expect(METIERS_CATALOGUE).toContain("zinguerie");
    expect(METIERS_CATALOGUE).toContain("etancheite");
    expect(metierOuvert("zinguerie", o)).toBe(false);
    expect(ouvertsDAbord(METIERS_CATALOGUE.map((m) => ({ m, ouvert: metierOuvert(m, o) }))).slice(0, 2).map((x) => x.m)).toEqual(["couverture", "peinture"]);
  });
  it("chaque lot des achats groupés a son métier ; « Divers » n'ouvre que si tout est ouvert", () => {
    for (const l of LOTS_V1) expect(Object.keys(METIER_DU_LOT_V1), l.id).toContain(l.id);
    const o = lireMetiersOuverts(undefined, true);
    expect(LOTS_V1.filter((l) => lotOuvertV1(l.id, o)).map((l) => l.id)).toEqual(["couverture", "peinture"]);
    expect(LOTS_V1.every((l) => lotOuvertV1(l.id, "tous"))).toBe(true);
  });
});
