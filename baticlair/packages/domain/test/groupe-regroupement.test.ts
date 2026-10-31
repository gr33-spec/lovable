/**
 * BATICLAIR GROUPÉ, ÉTAPE 4 : LE REGROUPEMENT (document du fondateur, 2026-10-19, section 2 étape 4 et section 5), en
 * code pur : un lot par (référence, zone, fenêtre compatible), un seul ouvert par référence et zone, un seuil du fichier
 * `groupe/seuils.json` qui le forme avant le lundi, le volume ferme à part du probable, le plafond à 3 × la médiane.
 */
import { describe, expect, it } from "vitest";
import { estUnLundiDeFormation, fenetreCommune, lotParti, mediane, plafondDuBesoin, rangerLesBesoins, SEUILS, seuilAtteint, seuilDuLot, volumeDuLot, type BesoinACouper } from "../src/index.js";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const besoin = (id: string, companyId: string, q: number, statut: "signe" | "en_attente" = "signe", extra: Partial<BesoinACouper> = {}): BesoinACouper => ({
  id,
  companyId,
  cle: "lib:ardoise naturelle|32x22|",
  famille: "couverture",
  zone: "22",
  quantite: q,
  unite: "pièces",
  statut,
  fenetre: { tot: d("2026-11-02"), tard: d("2026-11-20") },
  ...extra,
});

describe("groupé, étape 4 : les seuils du fichier", () => {
  it("le fichier se lit : un défaut, une entrée par famille, la référence « ardoise » (2 artisans ou 2 000 pièces)", () => {
    expect(SEUILS.defaut.artisans).toBe(2);
    expect(SEUILS.familles.electricite?.artisans).toBe(2);
    expect(seuilDuLot("lib:ardoise naturelle|32x22|", "couverture")).toEqual({ artisans: 2, quantite: 2000, unite: "pièces" });
    expect(seuilDuLot("lib:bac acier|0.75mm|", "couverture")).toEqual({ artisans: 2 });
    expect(seuilDuLot("ref:velux:MK04", "menuiseries_fermetures")).toEqual({ artisans: 2 });
    expect(SEUILS.plafond).toEqual({ foisMediane: 3, jours: 90 });
  });

  it("le seuil se mesure sur le volume FERME : deux artisans signés le forment, un signé et un en attente non ; 2 000 ardoises signées d'un seul artisan, oui", () => {
    expect(seuilAtteint({ cle: "lib:ardoise naturelle|32x22|", famille: "couverture", besoins: [besoin("a", "A", 500), besoin("b", "B", 500)] })).toBe(true);
    expect(seuilAtteint({ cle: "lib:ardoise naturelle|32x22|", famille: "couverture", besoins: [besoin("a", "A", 500), besoin("b", "B", 500, "en_attente")] })).toBe(false);
    expect(seuilAtteint({ cle: "lib:ardoise naturelle|32x22|", famille: "couverture", besoins: [besoin("a", "A", 2000)] })).toBe(true);
    // Une quantité dans une autre unité ne compte pas pour le seuil de quantité.
    expect(seuilAtteint({ cle: "lib:ardoise naturelle|32x22|", famille: "couverture", besoins: [besoin("a", "A", 2000, "signe", { unite: "palettes" })] })).toBe(false);
    expect(volumeDuLot([besoin("a", "A", 500), besoin("b", "B", 300, "en_attente"), besoin("c", "A", 200)])).toEqual({ ferme: 700, probable: 300, artisansFermes: 1, unite: "pièces" });
  });
});

describe("groupé, étape 4 : ranger les besoins dans les lots", () => {
  it("sans lot ouvert, un lot par (clé, zone) ; les fenêtres compatibles se resserrent à la fenêtre commune", () => {
    const r = rangerLesBesoins(
      [
        besoin("a", "A", 500),
        besoin("b", "B", 300, "en_attente", { fenetre: { tot: d("2026-11-10"), tard: d("2026-11-30") } }),
        besoin("c", "C", 100, "signe", { zone: "29" }),
        besoin("d", "D", 100, "signe", { cle: "lib:bac acier|0.75mm|" }),
      ],
      [],
    );
    expect(r.aCreer.map((l) => [l.cle, l.zone, l.besoins.map((b) => b.id)])).toEqual([
      ["lib:ardoise naturelle|32x22|", "22", ["a", "b"]],
      ["lib:ardoise naturelle|32x22|", "29", ["c"]],
      ["lib:bac acier|0.75mm|", "22", ["d"]],
    ]);
    expect(r.aCreer[0]!.fenetre).toEqual({ tot: d("2026-11-10"), tard: d("2026-11-20") });
    expect(r.aRattacher).toEqual([]);
    expect(r.enAttente).toEqual([]);
  });

  it("un lot ouvert reçoit le besoin compatible et resserre sa fenêtre ; un besoin incompatible attend le lot suivant (un seul ouvert par clé et zone)", () => {
    const ouvert = { id: "L1", cle: "lib:ardoise naturelle|32x22|", zone: "22", fenetre: { tot: d("2026-11-02"), tard: d("2026-11-15") }, besoins: [besoin("a", "A", 500)] };
    const r = rangerLesBesoins([besoin("b", "B", 300, "signe", { fenetre: { tot: d("2026-11-12"), tard: d("2026-11-30") } }), besoin("c", "C", 100, "signe", { fenetre: { tot: d("2026-12-01"), tard: d("2026-12-20") } })], [ouvert]);
    expect(r.aRattacher).toEqual([{ lotId: "L1", besoinId: "b", fenetre: { tot: d("2026-11-12"), tard: d("2026-11-15") } }]);
    expect(r.enAttente).toEqual(["c"]);
    expect(r.aCreer).toEqual([]);
  });

  it("la fenêtre commune, le lundi de formation, le lot parti", () => {
    expect(fenetreCommune([{ tot: d("2026-11-02"), tard: d("2026-11-20") }, { tot: d("2026-11-10"), tard: d("2026-11-30") }])).toEqual({ tot: d("2026-11-10"), tard: d("2026-11-20") });
    expect(fenetreCommune([{ tot: d("2026-11-02"), tard: d("2026-11-09") }, { tot: d("2026-11-10"), tard: d("2026-11-30") }])).toBeNull();
    // Un lundi sur deux : le 19 octobre 2026 est un lundi ; le suivant formateur est deux semaines plus loin.
    const lundi19 = estUnLundiDeFormation(new Date("2026-10-19T07:00:00Z"));
    expect(estUnLundiDeFormation(new Date("2026-10-26T07:00:00Z"))).toBe(!lundi19);
    expect(estUnLundiDeFormation(new Date("2026-11-02T07:00:00Z"))).toBe(lundi19);
    expect(estUnLundiDeFormation(new Date("2026-10-20T07:00:00Z"))).toBe(false);
    // Section 4 a : un lot formé mais pas encore parti laisse le retrait libre.
    expect(lotParti("ouvert")).toBe(false);
    expect(lotParti("forme")).toBe(false);
    expect(lotParti("envoye")).toBe(true);
  });
});

describe("groupé, section 5 : le plafond à 3 × la médiane sur 90 jours", () => {
  it("médiane paire et impaire ; sans historique, pas de plafond ; au-delà de 3 × la médiane, refusé", () => {
    expect(mediane([])).toBeNull();
    expect(mediane([5, 1, 3])).toBe(3);
    expect(mediane([4, 1, 3, 2])).toBe(2.5);
    expect(plafondDuBesoin(50000, [500])).toEqual({ admis: true, plafond: null });
    expect(plafondDuBesoin(1500, [500, 400, 600])).toEqual({ admis: true, plafond: 1500 });
    expect(plafondDuBesoin(1501, [500, 400, 600])).toEqual({ admis: false, plafond: 1500 });
  });
});
