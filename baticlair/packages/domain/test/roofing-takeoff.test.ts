import { describe, expect, it } from "vitest";
import {
  classifyMaterial,
  lineKind,
  parseFrenchQuantity,
  Quantity,
  ROOFING_PROFILE,
  validateTakeoff,
  validateTakeoffLine,
  type TakeoffLineInput,
} from "../src/index.js";

const P = ROOFING_PROFILE;
const family = (d: string) => classifyMaterial(d, P)?.code ?? null;
const line = (id: string, designation: string, quantityRaw: string | null, unitRaw: string | null, extra: Partial<TakeoffLineInput> = {}): TakeoffLineInput => ({
  id,
  designation,
  quantityRaw,
  unitRaw,
  ...extra,
});
const codes = (d: TakeoffLineInput) => validateTakeoffLine(d, P).issues.map((i) => i.code);

describe("référentiel couvreur : classement des désignations", () => {
  it.each([
    ["Tuile romane canal terre cuite rouge", "roof_tile"],
    ["TUILES MÉCANIQUES 13 AU M²", "roof_tile"],
    ["Tuile de rive gauche", "roof_accessory"],
    ["Faîtière ronde à emboîtement", "roof_accessory"],
    ["Ardoise naturelle Espagne 32x22", "slate"],
    ["Crochet inox ardoise 100 mm", "slate_hook"],
    ["Crochet de gouttière zinc dév. 33", "gutter_hook"],
    ["Gouttière zinc demi-ronde dév. 33", "gutter"],
    ["Naissance à souder Ø80", "gutter_fitting"],
    ["Descente EP zinc Ø80", "downpipe"],
    ["Bande de rive zinc", "flashing"],
    ["Abergement de cheminée plomb", "flashing"],
    ["Liteau sapin traité 27x38", "batten"],
    ["Contre-liteau 27x38 classe 2", "batten"],
    ["Écran sous-toiture HPV 1,5 x 50 m", "underlay"],
    ["Pare-pluie HPV", "underlay"],
    ["Closoir ventilé rouleau 5 m", "ridge_closure"],
    ["Chevron sapin 63x75 traité", "timber"],
    ["Volige peuplier 18 mm", "sarking_board"],
    ["Fenêtre de toit VELUX GGL CK04", "roof_window"],
    ["Vis inox tête fraisée 5x60", "fixing"],
  ])("« %s » → %s", (designation, expected) => {
    expect(family(designation)).toBe(expected);
  });

  it("ne confond pas « devis » avec « vis », ni « dépose » avec « pose »", () => {
    expect(family("Montant du devis")).toBeNull();
    expect(lineKind("Dépose de la couverture existante", P).kind).toBe("labor");
  });

  it("distingue fourniture, prestation et inconnu", () => {
    expect(lineKind("Fourniture et pose de tuiles romanes", P)).toMatchObject({ kind: "material", family: { code: "roof_tile" } });
    expect(lineKind("Échafaudage de pied, location 3 semaines", P).kind).toBe("labor");
    expect(lineKind("Évacuation des gravats en benne", P).kind).toBe("labor");
    expect(lineKind("Article divers 42", P).kind).toBe("unknown");
  });
});

describe("lecture des quantités françaises", () => {
  it("lit les espaces de milliers et la virgule décimale, refuse le reste", () => {
    expect(parseFrenchQuantity("1 250")?.toString()).toBe("1250");
    expect(parseFrenchQuantity("12,5")?.toString()).toBe("12.5");
    expect(parseFrenchQuantity(" 480 ")?.toString()).toBe("480");
    expect(parseFrenchQuantity("env. 40")).toBeNull();
    expect(parseFrenchQuantity("1.250,00")).toBeNull();
  });
});

describe("validation d'une ligne de quantitatif", () => {
  it("valide une ligne propre", () => {
    const v = validateTakeoffLine(line("l1", "Liteau sapin traité 27x38", "480", "ml"), P);
    expect(v).toMatchObject({ kind: "material", family: "batten", unit: "ML", status: "certain", issues: [] });
  });

  it("bloque une quantité absente ou illisible", () => {
    expect(codes(line("l", "Tuile romane", null, "u"))).toContain("QUANTITY_MISSING");
    expect(codes(line("l", "Tuile romane", "beaucoup", "u"))).toContain("QUANTITY_UNREADABLE");
    expect(codes(line("l", "Tuile romane", "0", "u"))).toContain("QUANTITY_NOT_POSITIVE");
  });

  it("signale une unité inconnue ou inhabituelle pour le matériau", () => {
    expect(codes(line("l", "Tuile romane", "40", "feuille"))).toContain("UNIT_UNKNOWN");
    expect(codes(line("l", "Tuile romane", "40", "kg"))).toContain("UNIT_UNUSUAL_FOR_FAMILY");
    expect(codes(line("l", "Gouttière zinc", "12", "m²"))).toContain("UNIT_UNUSUAL_FOR_FAMILY");
  });

  it("une surface de tuiles ou de liteaux est une quantité d'OUVRAGE, jamais une quantité d'achat", () => {
    for (const [designation] of [["Fourniture et pose de tuiles romanes"], ["Liteaux 27x40"], ["Contre-liteaux 27x40"]]) {
      const v = validateTakeoffLine(line("l", designation!, "120", "m²", { source: "client_quote" }), P);
      expect(v.basis).toBe("work");
      expect(v.issues.map((i) => i.code)).toEqual(["WORK_QUANTITY"]);
      // La surface est juste : rien à « confirmer », elle partira comme surface d'ouvrage.
      expect(v.status).toBe("certain");
    }
    // Ailleurs, le m² reste une anomalie d'unité, et une quantité d'achat reste une quantité d'achat.
    expect(validateTakeoffLine(line("l", "Gouttière zinc", "12", "m²"), P).basis).toBe("purchase");
    expect(validateTakeoffLine(line("l", "Liteaux 27x40", "372", "ml"), P).basis).toBe("purchase");
    // Cas trouvé par la simulation du devis 120 m² : « écran 120 m² » est la surface couverte, pas la surface
    // d'écran (recouvrements) ; en rouleaux, c'est bien une quantité d'achat.
    expect(validateTakeoffLine(line("l", "Écran sous-toiture HPV", "120", "m²"), P).basis).toBe("work");
    expect(validateTakeoffLine(line("l", "Écran sous-toiture HPV", "2", "rouleau"), P).basis).toBe("purchase");
  });

  it("refuse des pièces fractionnaires", () => {
    expect(codes(line("l", "Faîtière ronde", "42,5", "u"))).toContain("FRACTIONAL_PIECES");
  });

  it("exige le contenu d'un rouleau ou d'une botte pour comparer", () => {
    expect(codes(line("l", "Écran sous-toiture HPV", "4", "rouleau"))).toContain("PACKAGE_CONTENT_MISSING");
    const withContent = validateTakeoffLine(
      line("l", "Écran sous-toiture HPV", "4", "rouleau", { packaging: { packageUnit: "ROULEAU", content: Quantity.of(75, "M2") } }),
      P,
    );
    expect(withContent.status).toBe("certain");
  });

  it("signale une quantité anormalement haute (erreur de virgule ?)", () => {
    expect(codes(line("l", "Tuile romane", "125000", "u"))).toContain("QUANTITY_UNUSUALLY_HIGH");
  });

  it("ne demande rien à commander pour une prestation", () => {
    const v = validateTakeoffLine(line("l", "Dépose de la couverture existante", "120", "m²"), P);
    expect(v).toMatchObject({ kind: "labor", status: "certain", issues: [{ code: "LABOR_LINE", severity: "info" }] });
  });
});

describe("validation du quantitatif complet", () => {
  it("détecte doublons et oublis fréquents du couvreur, sans rien ajouter", () => {
    const result = validateTakeoff(
      [
        line("a", "Tuile romane canal rouge", "1250", "u"),
        line("b", "Tuile romane canal rouge", "200", "u"),
        line("c", "Gouttière zinc demi-ronde", "36", "ml"),
        line("d", "Dépose de l'ancienne couverture", "95", "m²"),
      ],
      P,
    );
    expect(result.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["DUPLICATE_LINE", "POSSIBLE_OMISSION"]));
    const omissions = result.issues.filter((i) => i.code === "POSSIBLE_OMISSION").map((i) => i.message);
    expect(omissions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("sans liteaux"),
        expect.stringContaining("sans faîtières"),
        expect.stringContaining("sans crochets"),
        expect.stringContaining("sans naissance"),
      ]),
    );
    expect(result.issues.find((i) => i.code === "DUPLICATE_LINE")?.lineIds).toEqual(["a", "b"]);
    expect(result.counts).toMatchObject({ labor: 1, blocking: 0 });
    expect(result.lines).toHaveLength(4);
  });

  it("n'annonce aucun oubli quand le quantitatif est complet", () => {
    const result = validateTakeoff(
      [
        line("a", "Tuile romane", "1250", "u"),
        line("b", "Liteau 27x38", "480", "ml"),
        line("c", "Faîtière ronde", "42", "u"),
      ],
      P,
    );
    expect(result.issues).toEqual([]);
    expect(result.counts.certain).toBe(3);
  });

  it("bloque un quantitatif sans aucun matériau", () => {
    const result = validateTakeoff([line("d", "Dépose de la couverture", "95", "m²")], P);
    expect(result.issues.map((i) => i.code)).toContain("NO_MATERIAL");
  });
});
