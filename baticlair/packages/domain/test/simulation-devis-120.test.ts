import { describe, expect, it } from "vitest";
import {
  computeWorkItem,
  identifyProducts,
  ROOFING_REFERENTIAL,
  tradeProfile,
  validateTakeoffLine,
  type NeedResult,
  type ParamValue,
  type SlotChoice,
} from "../src/index.js";

/**
 * Simulation du devis test de 120 m² : où est la frontière entre ce que
 * BatiClair SAIT et ce qu'il doit DEMANDER ? Test permanent : si une donnée
 * ou une règle change, la frontière bouge ici, visiblement.
 *
 * Devis reconstitué d'après l'exemple du fondateur (le vrai devis test est
 * à fournir). La qualification des lignes (rôle « contre-liteau »…) est ici
 * faite par mots-clés ; dans l'appli, l'IA la proposera, avec ses preuves.
 */
const DEVIS = [
  { ref: "ligne 1", designation: "Dépose de la couverture existante et évacuation", quantity: "120", unit: "m²" },
  { ref: "ligne 2", designation: "Fourniture et pose écran sous-toiture HPV", quantity: "120", unit: "m²" },
  { ref: "ligne 3", designation: "Fourniture et pose contre-lattes 27x40", quantity: "120", unit: "m²" },
  { ref: "ligne 4", designation: "Fourniture et pose liteaux 27x40", quantity: "120", unit: "m²" },
  { ref: "ligne 5", designation: "Toiture tuiles terre cuite grand moule type HP10", quantity: "120", unit: "m²" },
  { ref: "ligne 6", designation: "Faîtage avec faîtières et closoir ventilé", quantity: "12", unit: "ml" },
  { ref: "ligne 7", designation: "Rives à rabat", quantity: "20", unit: "ml" },
  { ref: "ligne 8", designation: "Gouttière zinc demi-ronde développé 33", quantity: "24", unit: "ml" },
  { ref: "ligne 9", designation: "Descente zinc diamètre 80", quantity: "10", unit: "ml" },
];

const PROFILE = tradeProfile("roofing");
const SLOT_OF_FAMILY: Record<string, (designation: string) => string> = {
  roof_tile: () => "tuile",
  batten: (d) => (/contre/i.test(d) ? "contre_liteau" : "liteau"),
  underlay: () => "ecran",
};

function lineReports() {
  return DEVIS.map((line) => {
    const v = validateTakeoffLine({ id: line.ref, designation: line.designation, quantityRaw: line.quantity, unitRaw: line.unit, source: "client_quote" }, PROFILE);
    const slot = v.family ? SLOT_OF_FAMILY[v.family]?.(line.designation) : undefined;
    const candidates = v.family ? identifyProducts(line.designation, ROOFING_REFERENTIAL, v.family).candidates : [];
    return { line, kind: v.kind, family: v.family, basis: v.basis, slot, candidates };
  });
}

/** Ce que le devis donne au moteur, sans rien inventer. */
function fromDevis() {
  const reports = lineReports();
  const inWork = reports.filter((r) => r.slot);
  const params: Record<string, ParamValue> = {};
  const surfaces = new Set(inWork.filter((r) => r.basis === "work" || r.line.unit === "m²").map((r) => r.line.quantity));
  // Une seule surface sur toutes les lignes de l'ouvrage : elle est certaine. Plusieurs : on demanderait.
  if (surfaces.size === 1) params.surface = { value: [...surfaces][0]!, unit: "m2", origin: "devis", evidence: `Devis, ${inWork.map((r) => r.line.ref).join(", ")}` };
  const products: Record<string, SlotChoice> = {};
  for (const r of inWork) {
    if (r.candidates.length !== 1) continue;
    const product = r.candidates[0]!.product;
    // Un modèle de marque reconnu par son appellation se fait confirmer ; un produit défini par sa seule section non.
    products[r.slot!] = { productId: product.id, origin: product.manufacturer ? "alias" : "devis" };
  }
  return { reports, params, products, mentioned: inWork.map((r) => r.slot!) };
}

const byNeed = (needs: NeedResult[], id: string) => needs.find((n) => n.needId === id)!;

describe("simulation : devis test 120 m² (frontière savoir / question)", () => {
  it("lit chaque ligne : prestation, ouvrage à convertir, ou hors référentiel", () => {
    const r = lineReports();
    expect(r.map((x) => [x.line.ref, x.kind, x.family, x.basis])).toEqual([
      ["ligne 1", "labor", null, "purchase"],
      ["ligne 2", "material", "underlay", "work"],
      ["ligne 3", "material", "batten", "work"],
      ["ligne 4", "material", "batten", "work"],
      ["ligne 5", "material", "roof_tile", "work"],
      // FRONTIÈRE : une seule ligne pour deux produits (faîtières + closoir) ; le classement n'en retient
      // qu'un. Il faudra un ouvrage « faîtage » (faîtières au ml, closoir au rouleau) : données à fournir.
      ["ligne 6", "material", "ridge_closure", "purchase"],
      ["ligne 7", "material", "roof_accessory", "purchase"],
      ["ligne 8", "material", "gutter", "purchase"],
      ["ligne 9", "material", "downpipe", "purchase"],
    ]);
  });

  it("reconnaît le modèle de tuile, mais pas le modèle d'écran : « écran HPV » ne désigne aucune marque", () => {
    const r = lineReports();
    expect(r[4]!.candidates.map((c) => c.product.id)).toEqual(["edilians-hp10-huguenot"]);
    expect(r[1]!.candidates).toEqual([]);
    expect(r[3]!.candidates.map((c) => c.product.id)).toEqual(["liteau-sapin-27x40"]);
  });

  it("aujourd'hui, pour un artisan : aucune quantité (règles en attente de validation), et les questions qui restent", () => {
    const { params, products, mentioned } = fromDevis();
    expect(params.surface).toMatchObject({ value: "120", origin: "devis" });
    const r = computeWorkItem(ROOFING_REFERENTIAL, { workItemId: "couverture-tuiles-emboitement", params, products, mentioned });
    for (const n of r.needs) expect(n.quantity).toBeUndefined();
    expect(r.needs.map((n) => [n.needId, n.status])).toEqual([
      ["tuiles", "unknown"],
      ["liteaux", "unknown"],
      ["contre-liteaux", "unknown"],
      ["ecran", "unknown"],
    ]);
  });

  it("une fois les règles validées : la suite exacte des questions, une à la fois", () => {
    const { params, products, mentioned } = fromDevis();
    const ask = (p: Record<string, ParamValue>, prod: Record<string, SlotChoice>) =>
      computeWorkItem(ROOFING_REFERENTIAL, { workItemId: "couverture-tuiles-emboitement", params: p, products: prod, mentioned }, { acceptDraft: true });

    let r = ask(params, products);
    expect(r.nextQuestion).toMatchObject({ kind: "confirm_product", text: "J'ai identifié : Tuiles HP10. C'est bien ce modèle ?" });
    const confirmed = { ...products, tuile: { productId: "edilians-hp10-huguenot", origin: "artisan" } as SlotChoice };

    r = ask(params, confirmed);
    expect(r.nextQuestion).toMatchObject({ key: "param:pureau", text: "À quel pureau posez-vous ces tuiles ?" });
    const p2 = { ...params, pureau: { value: "34.3", unit: "cm", origin: "artisan" } as ParamValue };

    r = ask(p2, confirmed);
    expect(r.nextQuestion).toMatchObject({ key: "param:entraxe_chevrons" });
    const p3 = { ...p2, entraxe_chevrons: { value: "60", unit: "cm", origin: "artisan" } as ParamValue };

    r = ask(p3, confirmed);
    expect(r.nextQuestion).toMatchObject({ kind: "choose_product", key: "product:ecran", options: [{ label: "Écran HPV" }] });
    const withScreen = { ...confirmed, ecran: { productId: "soprema-sop-ecran-hpv-r2-150x50", origin: "artisan" } as SlotChoice };

    r = ask(p3, withScreen);
    expect(r.nextQuestion).toMatchObject({ key: "param:pente" });
    const p4 = { ...p3, pente: { value: "45", unit: "%", origin: "artisan" } as ParamValue };

    r = ask(p4, withScreen);
    expect(r.nextQuestion).toBeNull();
    expect(r.needs.map((n) => [n.needId, n.quantity?.value, n.purchase?.order.count, n.purchase?.order.unit.many, n.origin, n.provisional])).toEqual([
      ["tuiles", "1305.43", "1306", "pièces", "explicit", true],
      ["liteaux", "349.85", "88", "longueurs de 4 m", "explicit", true],
      ["contre-liteaux", "200", "50", "longueurs de 4 m", "explicit", true],
      ["ecran", "128.57", "2", "rouleaux", "explicit", true],
    ]);
    expect(byNeed(r.needs, "tuiles").purchase?.approx).toEqual([{ count: "6", unit: { one: "palette", many: "palettes" } }]);
  });
});
