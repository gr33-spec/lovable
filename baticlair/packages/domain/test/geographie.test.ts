/**
 * Greg, 6 novembre 2026 (prompt maître, point 10 ; lot 5) : la recherche par département, région ou rayon ; une distance
 * entre chefs-lieux, dite approximative ; deux secteurs voisins se rapprochent seulement si les deux artisans l'acceptent.
 */
import { describe, expect, it } from "vitest";
import { DEPARTEMENTS, REGIONS, comparerBesoins, departementsAutour, departementsDeLaRegion, distanceDepartements, memeSecteur, pointSurLaCarte, regionDe } from "../src/index.js";

const ARDOISE = "Ardoise naturelle 32×22 Espagne 1er choix";

describe("la géographie des secteurs", () => {
  it("chaque département a un nom, une région et des coordonnées plausibles ; les codes sont uniques", () => {
    expect(DEPARTEMENTS).toHaveLength(101);
    expect(new Set(DEPARTEMENTS.map((d) => d.code)).size).toBe(101);
    for (const d of DEPARTEMENTS) if (d.code.length === 2) expect(pointSurLaCarte(d.code, 400, 400)).not.toBeNull();
    expect(REGIONS).toContain("Bretagne");
    expect(departementsDeLaRegion("Bretagne").sort()).toEqual(["22", "29", "35", "56"]);
    expect(regionDe("2a")).toBe("Corse");
  });

  it("les distances entre chefs-lieux : Saint-Brieuc–Rennes ≈ 90 km, Paris–Marseille ≈ 660 km", () => {
    expect(distanceDepartements("22", "22")).toBe(0);
    expect(distanceDepartements("22", "35")).toBeGreaterThan(80);
    expect(distanceDepartements("22", "35")).toBeLessThan(100);
    expect(distanceDepartements("75", "13")).toBeGreaterThan(640);
    expect(distanceDepartements("75", "13")).toBeLessThan(680);
    expect(distanceDepartements("22", "99")).toBeNull();
  });

  it("autour de son département : le sien d'abord, puis du plus proche au plus loin", () => {
    const autour = departementsAutour("22", 100);
    expect(autour[0]).toBe("22");
    expect(autour).toContain("35");
    expect(autour).not.toContain("44");
    expect(departementsAutour("22", 0)).toEqual(["22"]);
  });

  it("un secteur voisin ne se rapproche que si les deux artisans acceptent ce rayon, et l'écart se dit", () => {
    expect(memeSecteur("22", "35", 0).ok).toBe(false);
    expect(memeSecteur("22", "35", 100).ok).toBe(true);
    const a = { designation: ARDOISE, unite: "pièces", departement: "22", dateMax: null, modeLivraison: "livraison" as const };
    const b = { ...a, departement: "35" };
    expect(comparerBesoins(a, b).niveau).toBe("incompatible");
    expect(comparerBesoins({ ...a, rayonKm: 100 }, b).niveau).toBe("incompatible");
    const r = comparerBesoins({ ...a, rayonKm: 100 }, { ...b, rayonKm: 150 });
    expect(r.niveau).toBe("alternative");
    expect(r.differences[0]).toMatch(/^Secteur voisin : Ille-et-Vilaine \(35\), ≈ \d+ km$/);
    // Le même département reste une correspondance exacte, rayon ou pas.
    expect(comparerBesoins({ ...a, rayonKm: 100 }, a).niveau).toBe("exacte");
  });
});
