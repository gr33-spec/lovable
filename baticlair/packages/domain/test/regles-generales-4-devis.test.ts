import { describe, expect, it } from "vitest";
import { normalizeText, planQuote, ROOFING_REFERENTIAL, tradeProfile, validateTakeoff, validateTakeoffLine, type TakeoffLineInput } from "../src/index.js";

/**
 * Règles GÉNÉRALES découvertes par le passage à l'aveugle de 4 vrais devis
 * (électricité-plomberie, plâtrerie, piscine, salle de bain — 2026-10-01).
 * Chaque test utilise une formulation DIFFÉRENTE de celle des devis : la
 * règle doit valoir pour les devis à venir, pas pour ceux-là.
 */
const L = (designation: string, quantityRaw: string | null = "1", unitRaw: string | null = "u"): TakeoffLineInput => ({
  id: designation.slice(0, 20),
  designation,
  quantityRaw,
  unitRaw,
  source: "client_quote",
});
const read = (trade: string, designation: string, quantity: string | null = "1", unit: string | null = "u") => validateTakeoffLine(L(designation, quantity, unit), tradeProfile(trade));

describe("matériau ou main-d'œuvre : c'est la tête de la ligne qui décide", () => {
  it("« œ » est lu comme « oe » (main d'œuvre, cœur…)", () => {
    expect(normalizeText("Main d'Œuvre")).toBe("main d oeuvre");
    expect(read("roofing", "Main d'œuvre pour remaniement").kind).toBe("labor");
  });

  it("un matériau en tête reste un matériau, même si la description parle de pose ou d'évacuation", () => {
    expect(read("plumbing", "Tuyau PVC évacuation Ø 40", "12", "ml").kind).toBe("material");
    expect(read("plumbing", "Fixation chromée pour lavabo, raccordement compris").kind).toBe("material");
    expect(read("tiling", "Ragréage autolissant P3, application en 5 mm", "20", "m²").kind).toBe("material");
  });

  it("une prestation en tête reste une prestation, même si elle cite un matériau", () => {
    expect(read("tiling", "Pose de faïence 20x60 avec joints gris", "12", "m²").kind).toBe("labor");
    expect(read("painting", "Application de lasure sur volets", "8", "m²").kind).toBe("labor");
    expect(read("electrical", "Installation et raccordement des prises", "1", "u").kind).toBe("labor");
    expect(read("electrical", "Mesure d'isolement de l'installation", "1", "u").kind).toBe("labor");
  });

  it("sans vocabulaire du métier, un mot de prestation perdu dans la description ne fait pas une prestation", () => {
    // « autre métier » : aucune famille connue. « posé » en fin de texte ≠ ligne de pose.
    expect(read("other", "Abri de jardin 2x3 m, prix posé").kind).toBe("unknown");
    expect(read("other", "Coffret de commande, protection par différentiel").kind).toBe("unknown");
    expect(read("other", "Pose et réglage de l'abri").kind).toBe("labor");
    // Un code article en tête ne cache pas la prestation qui suit.
    expect(read("other", "MO12 Pose et réglage de l'abri").kind).toBe("labor");
  });
});

describe("le vocabulaire d'un référentiel ne vaut que pour son métier", () => {
  it("dans un devis de plombier, « coude » et « collier » ne sont pas des accessoires de descente de gouttière", () => {
    const plan = planQuote(
      [
        { ref: "a", designation: "Coude PVC 87°30 Ø 40", quantity: "6", unit: "u" },
        { ref: "b", designation: "Collier isophonique Ø 100", quantity: "10", unit: "u" },
      ],
      ROOFING_REFERENTIAL,
      tradeProfile("plumbing"),
    );
    expect(plan.lines).toEqual([
      { ref: "a", status: "not_covered", family: null, reason: "Le calcul des quantités n'existe pas encore pour ce métier." },
      { ref: "b", status: "not_covered", family: null, reason: "Le calcul des quantités n'existe pas encore pour ce métier." },
    ]);
    expect(plan.inputs).toEqual([]);
  });

  it("une entreprise couvreur + plombier garde le vocabulaire couverture", () => {
    const plan = planQuote([{ ref: "a", designation: "Couverture tuiles HP10", quantity: "40", unit: "m²" }], ROOFING_REFERENTIAL, tradeProfile("plumbing,roofing"));
    expect(plan.lines[0]).toMatchObject({ status: "planned", workItemId: "couverture-tuiles-emboitement" });
  });
});

describe("mesure d'ouvrage ou quantité d'achat, dans tous les métiers", () => {
  it("une surface de cloison, de carrelage, de peinture ou de parquet est celle de l'ouvrage", () => {
    expect(read("drywall", "Cloison 98/48 deux BA13 par face", "45", "m²").basis).toBe("work");
    expect(read("drywall", "Isolation des rampants, laine de roche 200 mm", "60", "m²").basis).toBe("work");
    expect(read("tiling", "Faïence 20x60 blanc mat", "12", "m²").basis).toBe("work");
    expect(read("painting", "Peinture acrylique velours, deux couches", "35", "m²").basis).toBe("work");
    expect(read("flooring", "Parquet contrecollé chêne", "28", "m²").basis).toBe("work");
  });

  it("une longueur ou un nombre de produits définis se commande tel quel", () => {
    expect(read("electrical", "Câble R2V 3G2,5", "50", "ml").basis).toBe("purchase");
    expect(read("drywall", "Bande à joint papier", "150", "ml").basis).toBe("purchase");
    expect(read("electrical", "Prise 2P+T 16 A blanche", "6", "u").basis).toBe("purchase");
  });

  it("un point lumineux ou une alimentation compte des ouvrages, pas des articles", () => {
    expect(read("electrical", "Point lumineux simple allumage", "3", "u")).toMatchObject({ kind: "material", basis: "work" });
    expect(read("electrical", "Va-et-vient sur point lumineux", "2", "u")).toMatchObject({ basis: "work" });
    expect(read("electrical", "Alimentation four 32 A", "1", "u")).toMatchObject({ basis: "work" });
  });

  it("une ligne qui nomme un ouvrage (réalisation, création, réseau, renfort…) se décompose", () => {
    expect(read("drywall", "Création d'une trémie habillée en BA13", "1", "u").basis).toBe("work");
    expect(read("tiling", "Réalisation d'un tablier de baignoire habillé de carrelage", "1", "u").basis).toBe("work");
    expect(read("electrical", "Réseau de gaines ICTA pour le séjour", "1", "u").basis).toBe("work");
  });
});

describe("unités et quantités : lire ce qui est écrit, demander le reste", () => {
  it("l'unité écrite dans la désignation est lue quand la colonne manque", () => {
    expect(read("electrical", "Câble souple 3G1,5 vendu au ml", "25", null)).toMatchObject({ unit: "ML" });
    expect(read("tiling", "Colle carrelage C2 sac 25kg", "4", null)).toMatchObject({ unit: "SAC" });
    expect(read("plumbing", "Tube PER nu en couronne de 50 m", "2", null)).toMatchObject({ unit: "COURONNE" });
    expect(read("plumbing", "Robinet d'arrêt 1/2", "3", null).issues.map((i) => i.code)).toContain("UNIT_MISSING");
  });

  it("un devis sans colonne d'unité : UNE question pour tout le document", () => {
    const v = validateTakeoff(
      [L("Robinet d'arrêt 1/2", "3", null), L("Siphon de lavabo", "2", null), L("Flexible inox 50 cm", "4", null), L("Vanne 3/4", "1", null)],
      tradeProfile("plumbing"),
    );
    expect(v.issues.filter((i) => i.code === "UNITS_ABSENT")).toHaveLength(1);
    expect(v.lines.every((l) => l.issues.every((i) => i.code !== "UNIT_MISSING" || i.severity === "info"))).toBe(true);
    // La ligne reste à vérifier : son unité dépend de la réponse.
    expect(v.lines.every((l) => l.status === "to_verify")).toBe(true);
  });

  it("un multiplicateur dans la désignation est une question, une dimension ne l'est pas", () => {
    const codes = (d: string) => read("electrical", d).issues.map((i) => i.code);
    expect(codes("Lot de 4 spots GU10 orientables")).toContain("MULTIPLIER_IN_DESIGNATION");
    expect(codes("Hublot LED étanche (x2)")).toContain("MULTIPLIER_IN_DESIGNATION");
    expect(codes("Cheville 8x50 x10")).toContain("MULTIPLIER_IN_DESIGNATION");
    expect(codes("Goulotte 2 x 40 mm")).not.toContain("MULTIPLIER_IN_DESIGNATION");
    expect(codes("Dalle 0.60m x 0.60 m")).not.toContain("MULTIPLIER_IN_DESIGNATION");
    expect(codes("Coffret 4XRJ45")).not.toContain("MULTIPLIER_IN_DESIGNATION");
  });

  it("le même article réparti dans le devis s'additionne ; deux lignes identiques qui se suivent posent question", () => {
    const profile = tradeProfile("electrical");
    const spread = validateTakeoff([L("Prise 16 A", "3"), L("Interrupteur simple", "1"), L("Prise 16 A", "2")], profile);
    expect(spread.issues.find((i) => i.code === "DUPLICATE_LINE")).toMatchObject({ severity: "info" });
    const adjacent = validateTakeoff([L("Prise 16 A", "3"), L("Prise 16 A", "3")], profile);
    expect(adjacent.issues.find((i) => i.code === "DUPLICATE_LINE")).toMatchObject({ severity: "to_verify" });
    // Qui se suivent mais avec des quantités différentes (deux pièces à la suite) : on additionne.
    const rooms = validateTakeoff([L("Prise 16 A", "1"), L("Prise 16 A", "2")], profile);
    expect(rooms.issues.find((i) => i.code === "DUPLICATE_LINE")).toMatchObject({ severity: "info" });
  });
});

describe("vocabulaire de métier ajouté (synonymes, jamais une marque)", () => {
  it("ventilation, sanitaire, robinetterie, isolation", () => {
    expect(read("electrical", "Bouche d'extraction hygroréglable salle d'eau").family).toBe("vent_vmc");
    expect(read("plumbing", "VMC double flux").family).toBe("vent_vmc");
    expect(read("plumbing", "Paroi de douche walk-in 120 cm").family).toBe("plumb_sanitary");
    expect(read("plumbing", "Groupe de sécurité droit 3/4").family).toBe("plumb_tap");
    expect(read("drywall", "Isolation des combles perdus", "80", "m²").family).toBe("drywall_insulation");
    expect(read("drywall", "Plus-value plaque hydrofuge", "12", "m²").family).toBe("drywall_board");
  });
});
