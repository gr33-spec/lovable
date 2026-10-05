import { describe, expect, it } from "vitest";
import { isUnitTitle, siteUnits, type SiteUnitLine } from "../src/index.js";

/**
 * LE CHANTIER PAR LOGEMENT (retour du fondateur, 2026-10-05, gros devis d'électricité de plusieurs appartements) :
 * « logement 1, tant de prises…, logement 2…, puis on regroupe pour le fournisseur ». Les quantités sont celles du
 * devis, rangées par logement ; les pièces d'un logement s'additionnent ; les logements identiques se regroupent.
 */
let n = 0;
const line = (
  section: string[],
  designation: string,
  quantity: string | null,
  unit: string | null = "u",
): SiteUnitLine => ({ id: `l${++n}`, designation, quantity, unit, section });

describe("titres de logement", () => {
  it("reconnaît les logements, jamais une pièce ni un lot de corps d'état", () => {
    for (const t of [
      "Logement 1",
      "LOGEMENT N°12",
      "Appartement A12",
      "Appt 3",
      "N°1 TYPE T3",
      "T3 n°4",
      "Villa B",
      "Maison 2",
    ])
      expect(isUnitTitle(t), t).toBe(true);
    for (const t of [
      "Cuisine",
      "Chambre 1",
      "Lot 3 : Électricité",
      "Parties communes",
      "Type T3",
      "Tableau électrique",
      "Niveau 1",
    ])
      expect(isUnitTitle(t), t).toBe(false);
  });
});

describe("le chantier rangé par logement", () => {
  it("chaque logement avec ses articles (pièces additionnées), les identiques regroupés, les communs à part", () => {
    const lines = [
      line(["Logement 1", "Cuisine"], "Prise 2P+T 16 A", "4"),
      line(["Logement 1", "Séjour"], "Prise 2P+T 16 A", "5"),
      line(["Logement 1", "Séjour"], "Prise RJ45", "1"),
      line(
        ["Logement 1"],
        "Tableau électrique 2 rangées (Fourniture et pose)",
        "1",
      ),
      line(["Logement 2", "Cuisine"], "Prise 2P+T 16 A", "9"),
      line(["Logement 2", "Séjour"], "Prise RJ45", "1"),
      line(["Logement 2"], "Tableau électrique 2 rangées", "1"),
      line(["Logement 3"], "Prise 2P+T 16 A", "6"),
      line(["Logement 3"], "Tableau électrique 2 rangées", "1"),
      line(["Parties communes"], "Hublot LED", "8"),
    ];
    const s = siteUnits(lines)!;
    expect(s.count).toBe(3);
    // Logements 1 et 2 : mêmes articles, mêmes quantités (9 prises, 1 RJ45, 1 tableau) → un groupe « × 2 ».
    expect(s.units.map((u) => u.labels)).toEqual([
      ["Logement 1", "Logement 2"],
      ["Logement 3"],
    ]);
    expect(s.units[0]!.items.map((i) => [i.designation, i.quantity])).toEqual([
      ["Prise 2P+T 16 A", "9"],
      ["Prise RJ45", "1"],
      ["Tableau électrique 2 rangées", "1"],
    ]);
    expect(s.units[0]!.items[0]!.lineIds).toHaveLength(3);
    expect(s.other.map((i) => [i.designation, i.quantity])).toEqual([
      ["Hublot LED", "8"],
    ]);
  });

  it("deux bâtiments, chacun son « Logement 1 » : deux logements", () => {
    const s = siteUnits([
      line(["Bât. A", "Logement 1"], "Prise", "3"),
      line(["Bât. B", "Logement 1"], "Prise", "4"),
    ])!;
    expect(s.units.map((u) => u.labels)).toEqual([
      ["Bât. A › Logement 1"],
      ["Bât. B › Logement 1"],
    ]);
  });

  it("un seul logement, ou aucun titre : rien à ranger", () => {
    expect(
      siteUnits([
        line(["Logement 1"], "Prise", "3"),
        line(["Cuisine"], "Prise", "2"),
      ]),
    ).toBeNull();
    expect(siteUnits([line([], "Prise", "3")])).toBeNull();
  });
});
