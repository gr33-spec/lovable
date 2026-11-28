/**
 * Greg, 6 novembre 2026, parcours produit (points 8, 9 et 19) : correspondance exacte, alternative possible avec les
 * écarts expliqués, non compatible ; secteur et dates vérifiés ; jamais une donnée modifiée ; machine d'états.
 */
import { describe, expect, it } from "vitest";
import { comparerBesoins, phraseNotificationRapprochement, transitionPermise, type BesoinComparable } from "../src/index.js";

const b = (designation: string, extra: Partial<BesoinComparable> = {}): BesoinComparable => ({ designation, unite: "pièces", departement: "29", dateMax: "2026-12-01", modeLivraison: "livraison", ...extra });

describe("rapprochement entre besoins", () => {
  it("correspondance exacte : même référence, même unité, même secteur, dates proches", () => {
    const r = comparerBesoins(b("Ardoise naturelle 32×22 Espagne 1er choix"), b("ardoise 32x22 espagne 1er choix", { dateMax: "2026-12-04" }));
    expect(r).toEqual({ niveau: "exacte", differences: [], score: 100 });
  });

  it("alternative possible : chaque écart est dit, rien n'est modifié", () => {
    const r = comparerBesoins(b("Ardoise naturelle 32×22 Espagne 1er choix"), b("Ardoise naturelle 30×20 Espagne 2e choix", { modeLivraison: "retrait", dateMax: "2026-12-15" }));
    expect(r.niveau).toBe("alternative");
    expect(r.differences).toEqual(expect.arrayContaining(["Format différent : 32×22 et 30×20", "Qualité ou classement différent : 1 et 2", "Mode différent : livraison sur chantier et retrait au dépôt", "Date de livraison différente : 14 jours d'écart"]));
    expect(r.score).toBeLessThan(100);
  });

  it("une marque précisée d'un seul côté est un écart, jamais supposée identique", () => {
    const r = comparerBesoins(b("Ardoise 32x22 Cupa"), b("Ardoise 32x22"));
    expect(r.niveau).toBe("alternative");
    expect(r.differences.join(" ")).toMatch(/Marque précisée d'un seul côté : cupa/);
  });

  it("non compatible : autre article, autre unité, autre secteur, dates trop éloignées, ligne non reconnue", () => {
    expect(comparerBesoins(b("Ardoise 32x22"), b("Zinc 0,65 mm")).niveau).toBe("incompatible");
    expect(comparerBesoins(b("Ardoise 32x22"), b("Ardoise 32x22", { unite: "m²" })).niveau).toBe("incompatible");
    expect(comparerBesoins(b("Ardoise 32x22"), b("Ardoise 32x22", { departement: "35" })).differences).toEqual(["Autre secteur de livraison"]);
    expect(comparerBesoins(b("Ardoise 32x22"), b("Ardoise 32x22", { dateMax: "2027-02-01" })).differences).toEqual(["Dates de livraison trop éloignées"]);
    expect(comparerBesoins(b("Crochets inox"), b("Crochets inox")).niveau).toBe("incompatible");
    expect(comparerBesoins(b("Tuiles rouges"), b("Tuiles rouges")).differences).toEqual(["Article non reconnu avec certitude"]);
  });

  it("la notification dit le produit et le niveau, jamais un nom ni une quantité", () => {
    const t = phraseNotificationRapprochement({ produit: "Ardoise 32×22", niveau: "alternative", collecte: false });
    expect(t).toBe("Un besoin compatible vient d'apparaître dans ton secteur pour « Ardoise 32×22 » (alternative possible, avec des différences à vérifier). Veux-tu examiner le rapprochement ?");
  });

  it("machine d'états : un état final ne revient que par un nouveau geste, une ligne rejointe ne repart pas en recherche", () => {
    expect(transitionPermise("disponible", "proposee")).toBe(true);
    expect(transitionPermise("rejointe", "disponible")).toBe(false);
    expect(transitionPermise("rejointe", "retiree")).toBe(true);
    expect(transitionPermise("expiree", "proposee")).toBe(false);
    expect(transitionPermise("retiree", "disponible")).toBe(true);
  });
});
