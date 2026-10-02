import { describe, expect, it } from "vitest";
import { checkReferential, mergeReferentials, planQuote, ROOFING_REFERENTIAL, scoreQuote, tradeProfile, documentationNeeds, type QuoteLine, type Referential } from "../src/index.js";

const PROFILE = tradeProfile("roofing");
const L = (ref: string, designation: string, quantity: string | null = null, unit: string | null = null): QuoteLine => ({ ref, designation, quantity, unit });
const plan = (lines: QuoteLine[]) => planQuote(lines, ROOFING_REFERENTIAL, PROFILE);
const where = (lines: QuoteLine[]) => plan(lines).lines.map((l) => (l.status === "planned" ? `${l.ref}:${l.workItemId}/${l.slot}` : `${l.ref}:${l.status}`));

/**
 * Le pont devis → moteur sur des formulations VARIÉES (entreprises,
 * ordres de mots, pluriels, abréviations). Aucun de ces textes n'est le
 * devis de référence : c'est ce qui garantit qu'on ne construit pas pour lui.
 */
describe("pont devis → moteur : formulations variées", () => {
  it("nomme l'ouvrage par son premier mot, quelle que soit la rédaction", () => {
    expect(
      where([
        L("a", "Tuiles mécaniques HP 10 coloris brun", "85", "m2"),
        L("b", "Liteaux sapin traité 27 x 40", "85", "m2"),
        L("c", "Contre-lattes 27x40 sur fermettes", "85", "m2"),
        L("d", "Pare-pluie HPV", "85", "m2"),
        L("e", "Gouttière zinc demi-ronde de 33, crochets compris", "14", "ml"),
        L("f", "Tuyau de descente zinc Ø100", "1", "u"),
      ]),
    ).toEqual([
      "a:couverture-tuiles-emboitement/tuile",
      "b:couverture-tuiles-emboitement/liteau",
      "c:couverture-tuiles-emboitement/contre_liteau",
      "d:couverture-tuiles-emboitement/ecran",
      "e:gouttiere/profil",
      "f:descente/tube",
    ]);
  });

  it("ne rattache jamais au plus proche : rive, noue, abergement, fenêtre de toit, chatière restent non couverts", () => {
    expect(
      where([
        L("a", "Couverture tuiles HP10", "60", "m2"),
        L("b", "Tuiles de rive gauche et droite HP10", "12", "ml"),
        L("c", "Noue zinc", "6", "ml"),
        L("d", "Abergement de cheminée avec bavette, tuiles reprises", "1", "u"),
        L("e", "Fenêtre de toit 78x98 avec raccord pour tuiles", "1", "u"),
        L("f", "Tuiles chatières HP10", "4", "u"),
      ]),
    ).toEqual(["a:couverture-tuiles-emboitement/tuile", "b:not_covered", "c:not_covered", "d:not_covered", "e:not_covered", "f:not_covered"]);
  });

  it("un ouvrage sans ligne déclencheuse n'est pas inventé : des liteaux seuls ne font pas une couverture", () => {
    const p = plan([L("a", "Liteaux 27x40", "200", "ml")]);
    expect(p.lines[0]).toMatchObject({ status: "not_covered" });
    expect(p.inputs).toEqual([]);
  });

  it("main-d'œuvre : hors achat", () => {
    expect(where([L("a", "Main d'œuvre dépose de l'ancienne couverture", "1", "forfait")])).toEqual(["a:not_material"]);
  });

  it("lit une valeur seulement si elle est écrite avec son nom et son unité", () => {
    const p = plan([L("a", "Couverture tuiles HP10, pureau de 34,5 cm, pente 45 %", "100", "m2"), L("b", "Liteaux 27x40 pureau adapté", "100", "m2")]);
    expect(p.inputs[0]!.params).toMatchObject({
      pureau: { value: "34.5", unit: "cm", evidence: "Devis, a (« pureau »)" },
      pente: { value: "45", unit: "%" },
      surface: { value: "100", unit: "m2" },
    });
    // Pente en degrés : non convertie (aucune hypothèse), donc non lue.
    expect(plan([L("a", "Couverture tuiles HP10 pente 35°", "100", "m2")]).inputs[0]!.params.pente).toBeUndefined();
  });

  it("deux valeurs différentes pour la même donnée : une question de cohérence, jamais un choix silencieux", () => {
    const p = plan([L("a", "Couverture tuiles HP10", "120", "m2"), L("b", "Écran sous-toiture HPV", "125", "m2")]);
    expect(p.inputs[0]!.params.surface).toBeUndefined();
    expect(p.conflicts).toEqual(["Surface de toiture : 120 m2 (Devis, a) / 125 m2 (Devis, b)"]);
  });

  it("deux produits différents nommés pour le même emplacement : aucun n'est retenu", () => {
    const ref: Referential = structuredClone(ROOFING_REFERENTIAL);
    ref.products.push({ ...structuredClone(ref.products.find((p) => p.id === "edilians-hp10-huguenot")!), id: "autre-tuile", shortLabel: "Autre tuile", aliases: ["autre tuile"] });
    const p = planQuote([L("a", "Couverture tuiles HP10", "50", "m2"), L("b", "Complément autre tuile", "5", "m2")], ref, PROFILE);
    expect(p.inputs[0]!.products.tuile).toBeUndefined();
  });
});

describe("enrichissement progressif", () => {
  it("un produit rencontré mais inconnu donne la liste précise de ce qu'il faut documenter", () => {
    const s = scoreQuote([L("a", "Gouttière PVC demi-ronde 25 sable, crochets compris", "12", "ml")], ROOFING_REFERENTIAL, PROFILE, { acceptDraft: true });
    expect(documentationNeeds(ROOFING_REFERENTIAL, s.plan, s.workItems).map((d) => [d.kind, d.title, d.lines])).toEqual([
      ["product", "Gouttière — produit à identifier", ["a"]],
      ["product", "Crochets — produit à identifier", ["a"]],
    ]);
  });

  it("une couche documentée (ou une base externe) s'ajoute sans changer le moteur, et suit les mêmes règles", () => {
    const layer = {
      id: "chantiers-2026-10",
      version: "1",
      sources: [{ id: "fiche-crochet-x", kind: "manufacturer" as const, title: "Fiche crochet X (fabricant)", documentRef: "Fiche technique crochet X", retrievedAt: "2026-10-01" }],
      products: [
        {
          id: "crochet-x",
          family: "gutter_hook",
          label: "Crochet X",
          shortLabel: "Crochets X",
          aliases: ["crochet x"],
          attributes: { espacement_max: { kind: "manufacturer_spec" as const, value: "0.5", unit: "m", source: "fiche-crochet-x", verification: { status: "draft" as const }, version: 1 } },
          sellingUnits: [],
        },
      ],
    };
    const merged = mergeReferentials(ROOFING_REFERENTIAL, layer);
    expect(merged.version).toBe(`${ROOFING_REFERENTIAL.version}+chantiers-2026-10@1`);
    expect(checkReferential(merged)).toEqual([]);
    // Donnée importée en brouillon : visible pour le validateur, jamais pour l'artisan.
    // (Modèle de marque reconnu dans le devis : l'artisan le confirme d'abord.)
    const run = (acceptDraft: boolean) =>
      scoreQuote([L("a", "Gouttière PVC 25, crochet X compris", "12", "ml")], merged, PROFILE, { acceptDraft, answers: { "product:crochet": "crochet-x" } }).workItems[0]!.needs.find(
        (n) => n.needId === "crochets",
      )!;
    expect(run(false).status).toBe("unknown");
    expect(run(true)).toMatchObject({ status: "calculated", quantity: { value: "24" }, provisional: true });
  });

  it("une couche qui casse une règle (donnée sans source) est refusée par le contrôle d'intégrité", () => {
    const merged = mergeReferentials(ROOFING_REFERENTIAL, {
      id: "import",
      version: "1",
      products: [{ id: "x", family: "gutter_hook", label: "X", shortLabel: "X", aliases: [], attributes: { espacement_max: { kind: "manufacturer_spec", value: "0.5", unit: "m", source: "inconnue", verification: { status: "draft" }, version: 1 } }, sellingUnits: [] }],
    });
    expect(checkReferential(merged).length).toBeGreaterThan(0);
  });
});
