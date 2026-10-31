/**
 * BATICLAIR GROUPÉ, ÉTAPE 1 (document du fondateur, 2026-10-19, sections 1 à 4 et 7 « Normalisation ») : les règles de données
 * du groupé, en code pur. Deux besoins ne se groupent que sur une clé de référence identique ; la zone est le
 * département ; un besoin se retire tant que le lot n'est pas parti, et seul un besoin signé s'engage.
 */
import { describe, expect, it } from "vitest";
import { cleDeReference, FAMILLES_GROUPE, quantiteDuBesoin, FICHES, familleDuMetier, famillesDuMetier, REFERENTIALS, TRADES, fenetresCompatibles, fenetreValide, transitionBesoin, zoneDuCodePostal } from "../src/index.js";

describe("groupé : la clé de référence (section 7, normalisation)", () => {
  it("la référence fabricant fait la clé, quelle que soit son écriture, et ne vaut que chez sa marque", () => {
    expect(cleDeReference({ referenceFabricant: "MK04 ", marque: "Velux", libelle: "Fenêtre de toit" })).toBe("ref:velux:MK04");
    expect(cleDeReference({ referenceFabricant: "mk-04", marque: "VELUX", libelle: "autre libellé" })).toBe(cleDeReference({ referenceFabricant: "MK 04", marque: "velux", libelle: "x" }));
    expect(cleDeReference({ referenceFabricant: "MK04", marque: "Fakro", libelle: "x" })).not.toBe(cleDeReference({ referenceFabricant: "MK04", marque: "Velux", libelle: "x" }));
  });

  it("sans référence : libellé + dimension + teinte, « 32×22 » = « 32 x 22 », et une teinte différente ne se groupe pas", () => {
    const a = cleDeReference({ libelle: "Ardoise naturelle", dimension: "32×22" });
    expect(a).toBe("lib:ardoise naturelle|32x22|");
    expect(cleDeReference({ libelle: "ARDOISE  naturelle", dimension: "32 x 22" })).toBe(a);
    expect(cleDeReference({ libelle: "Ardoise naturelle", dimension: "40x24" })).not.toBe(a);
    expect(cleDeReference({ libelle: "Bac acier", dimension: "0,75 mm", teinte: "RAL 7016" })).not.toBe(cleDeReference({ libelle: "Bac acier", dimension: "0.75 mm", teinte: "RAL 9006" }));
    expect(cleDeReference({ libelle: "Bac acier", dimension: "0,75 mm" })).toBe(cleDeReference({ libelle: "Bac acier", dimension: "0.75mm" }));
  });
});

describe("groupé : zone, fenêtre, famille", () => {
  it("la zone est le département du code postal (Corse 2A / 2B, outre-mer sur trois chiffres)", () => {
    expect(zoneDuCodePostal("22300 Lannion")).toBe("22");
    expect(zoneDuCodePostal("29200")).toBe("29");
    expect(zoneDuCodePostal("20000 Ajaccio")).toBe("2A");
    expect(zoneDuCodePostal("20200 Bastia")).toBe("2B");
    expect(zoneDuCodePostal("97400 Saint-Denis")).toBe("974");
    expect(zoneDuCodePostal("Lannion")).toBeNull();
  });

  it("deux fenêtres sont compatibles quand une même date tient dans les deux", () => {
    const d = (s: string) => new Date(`${s}T00:00:00Z`);
    expect(fenetresCompatibles({ tot: d("2026-11-02"), tard: d("2026-11-10") }, { tot: d("2026-11-10"), tard: d("2026-11-20") })).toBe(true);
    expect(fenetresCompatibles({ tot: d("2026-11-02"), tard: d("2026-11-09") }, { tot: d("2026-11-10"), tard: d("2026-11-20") })).toBe(false);
    expect(fenetreValide({ tot: d("2026-11-10"), tard: d("2026-11-02") })).toBe(false);
  });

  it("neuf familles (décision du 20 octobre) ; chaque métier du référentiel rattaché à au moins une", () => {
    expect(FAMILLES_GROUPE).toHaveLength(9);
    const metiers = new Set([...REFERENTIALS.map((r) => r.trade), ...FICHES.map((f) => f.metier), ...TRADES.map((t) => t.id).filter((id) => id !== "other")]);
    for (const m of metiers) expect(famillesDuMetier(m).length, m).toBeGreaterThan(0);
    expect(familleDuMetier("roofing")).toBe("couverture");
    expect(familleDuMetier("painting")).toBe("second_oeuvre");
    expect(familleDuMetier("joinery")).toBe("menuiseries_fermetures");
    expect(familleDuMetier("metalwork")).toBe("serrurerie_metallerie");
    expect(famillesDuMetier("general")).toEqual(FAMILLES_GROUPE);
    expect(familleDuMetier("other")).toBeNull();
    expect(familleDuMetier(null)).toBeNull();
  });
});

describe("groupé : la vie d'un besoin (section 4)", () => {
  it("a) retrait libre avant le départ du lot ; b) plus de retrait d'un besoin signé une fois le lot parti", () => {
    expect(transitionBesoin("signe", "retire", { lotParti: false })).toEqual({ ok: true });
    expect(transitionBesoin("signe", "retire", { lotParti: true })).toEqual({ ok: false, raison: "lot_parti" });
    expect(transitionBesoin("engage", "retire", { lotParti: true })).toEqual({ ok: false, raison: "deja_engage" });
  });

  it("d) un besoin en attente n'engage personne : il se retire toujours, bascule « signé » d'un tap, et ne s'engage pas seul", () => {
    expect(transitionBesoin("en_attente", "retire", { lotParti: true })).toEqual({ ok: true });
    expect(transitionBesoin("en_attente", "signe", { lotParti: false })).toEqual({ ok: true });
    expect(transitionBesoin("en_attente", "engage", { lotParti: true })).toEqual({ ok: false, raison: "pas_signe" });
  });

  it("signé → engagé → commandé → livré, jamais un saut", () => {
    expect(transitionBesoin("signe", "engage", { lotParti: true })).toEqual({ ok: true });
    expect(transitionBesoin("engage", "commande", { lotParti: true })).toEqual({ ok: true });
    expect(transitionBesoin("commande", "livre", { lotParti: true })).toEqual({ ok: true });
    expect(transitionBesoin("signe", "livre", { lotParti: true }).ok).toBe(false);
    expect(transitionBesoin("livre", "signe", { lotParti: true }).ok).toBe(false);
  });
});

describe("groupé : la quantité d'un besoin vient de sa ligne", () => {
  it("le nombre de la commande, sans séparateur de milliers ; rien sans quantité établie", () => {
    expect(quantiteDuBesoin({ count: "1 488", unit: "pièces" }, "1 488 pièces")).toEqual({ quantite: "1488", unite: "pièces" });
    expect(quantiteDuBesoin(null, "23 cartons de 1,44 m²")).toEqual({ quantite: "23", unite: "cartons de 1,44 m²" });
    expect(quantiteDuBesoin({ count: "12,5", unit: "m²" }, null)).toEqual({ quantite: "12.5", unite: "m²" });
    expect(quantiteDuBesoin(null, null)).toBeNull();
    expect(quantiteDuBesoin(null, "à préciser")).toBeNull();
  });
});
