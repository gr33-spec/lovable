import { describe, expect, it } from "vitest";
import { groupIdenticalLines, isPlaceTitle, keyCharacteristics, tradeProfile, validateTakeoff, type GroupableLine } from "../src/index.js";

/**
 * Regroupement des articles identiques avant l'envoi fournisseur, et
 * contexte de section (titres du devis) attaché à chaque ligne. Cas
 * découverts sur 4 vrais devis (2026-10-01), écrits ici avec d'autres mots.
 */
const L = (designation: string, quantity: string | null, unit: string | null, section: string[] = [], extra: Partial<GroupableLine> = {}): GroupableLine => ({
  designation,
  quantity,
  unit,
  reference: null,
  section,
  ...extra,
});

describe("titres de lieu", () => {
  it("une pièce, un logement, un niveau ne nomment qu'un lieu", () => {
    for (const t of ["Cuisine / Séjour", "Chambre 2", "Logement n°3 - type T4", "R+1", "Salle d'eau", "Espace WC niveau 0", "Parties communes"]) {
      expect([t, isPlaceTitle(t)]).toEqual([t, true]);
    }
  });
  it("une marque, une gamme, un ouvrage, un lot ne sont pas des lieux", () => {
    for (const t of ["Appareillage Legrand Mosaic", "Cloison SAD", "Lot 3 : électricité", "Doublage isolant", "Mise à la terre", "Tableau électrique"]) {
      expect([t, isPlaceTitle(t)]).toEqual([t, false]);
    }
  });
});

describe("regroupement avant envoi", () => {
  it("le même article réparti pièce par pièce part en une ligne, avec le total et le titre commun", () => {
    const g = groupIdenticalLines([
      L("Interrupteur va-et-vient", "2", "u", ["Électricité", "Appareillage Schneider Odace", "Maison", "Entrée"]),
      L("Prise 16 A", "4", "u", ["Électricité", "Appareillage Schneider Odace", "Maison", "Salon"]),
      L("Interrupteur va-et-vient", "1", "U", ["Électricité", "Appareillage Schneider Odace", "Maison", "Chambre 1"]),
      L("interrupteur VA-ET-VIENT", "1,5", "pièces", ["Électricité", "Appareillage Schneider Odace", "Étage", "Palier"]),
    ]);
    expect(g.map((x) => [x.designation, x.quantity, x.mergedFrom, x.section])).toEqual([
      ["Interrupteur va-et-vient", "4,5", 3, ["Électricité", "Appareillage Schneider Odace"]],
      ["Prise 16 A", "4", 1, ["Électricité", "Appareillage Schneider Odace", "Maison", "Salon"]],
    ]);
  });

  it("jamais fusionnés : marques ou ouvrages différents, unités différentes, achat et mesure d'ouvrage", () => {
    const g = groupIdenticalLines([
      L("Prise 16 A", "4", "u", ["Appareillage Legrand"]),
      L("Prise 16 A", "4", "u", ["Appareillage Schneider"]),
      L("Plus-value plaque hydrofuge", "20", "m²", ["Cloison 72/48"]),
      L("Plus-value plaque hydrofuge", "12", "m²", ["Doublage collé"]),
      L("Câble 3G2,5", "50", "ml"),
      L("Câble 3G2,5", "2", "couronne"),
      L("Faïence 20x60", "12", "m²", [], { basis: "work" }),
      L("Faïence 20x60", "3", "m²"),
    ]);
    expect(g).toHaveLength(8);
    expect(g.every((x) => x.mergedFrom === 1)).toBe(true);
  });

  it("jamais additionnés : quantité illisible ou unité inconnue (deux forfaits « 1 » sans unité)", () => {
    const g = groupIdenticalLines([
      L("Accessoires de raccordement", "1", null),
      L("Accessoires de raccordement", "1", null),
      L("Robinet d'arrêt", "à voir", "u"),
      L("Robinet d'arrêt", "2", "u"),
    ]);
    expect(g.map((x) => x.mergedFrom)).toEqual([1, 1, 1, 1]);
  });

  it("des références différentes restent deux articles", () => {
    const g = groupIdenticalLines([L("Receveur 120x80", "1", "u", [], { reference: "A12" }), L("Receveur 120x80", "1", "u", [], { reference: "B7" })]);
    expect(g).toHaveLength(2);
  });
});

describe("doublons dans le quantitatif : même règle de section", () => {
  it("la même plus-value sous deux ouvrages n'est ni un doublon ni à additionner", () => {
    const v = validateTakeoff(
      [
        { id: "a", designation: "Plus-value plaque hydrofuge", quantityRaw: "20", unitRaw: "m²", section: ["Cloison 72/48"] },
        { id: "b", designation: "Plus-value plaque hydrofuge", quantityRaw: "12", unitRaw: "m²", section: ["Doublage collé"] },
      ],
      tradeProfile("drywall"),
    );
    expect(v.issues.filter((i) => i.code === "DUPLICATE_LINE")).toEqual([]);
  });
});

describe("caractéristiques : un texte TOUT EN MAJUSCULES n'est pas une suite de sigles", () => {
  it("« SALLE DE BAINS », « MISE A LA TERRE » ne donnent rien ; « HP10 », « LG25 » restent", () => {
    expect(keyCharacteristics("SALLE DE BAINS")).toEqual([]);
    expect(keyCharacteristics("MISE A LA TERRE")).toEqual([]);
    expect(keyCharacteristics("GOUTTIERE LG25 SABLE")).toEqual(expect.arrayContaining(["LG25"]));
    // Texte en casse normale : les sigles restent des sigles.
    expect(keyCharacteristics("Écran de sous-toiture HPV")).toEqual(["HPV"]);
  });
});
