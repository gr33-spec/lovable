import { describe, expect, it } from "vitest";
import {
  checkReferential,
  computeWorkItem,
  identifyProducts,
  parseFormula,
  ROOFING_REFERENTIAL,
  type Fact,
  type Referential,
  type WorkItemInput,
} from "../src/index.js";
import { evaluate, inferDim } from "../src/referential/expression.js";
import { parseRefUnit } from "../src/referential/units.js";

/** Copie du référentiel où tout est vérifié : uniquement pour tester le moteur, jamais une vraie donnée. */
function allVerified(ref: Referential): Referential {
  const v = { status: "verified", verifiedAt: "2026-10-01", verifiedBy: "test" } as const;
  const fix = <T extends { verification: unknown }>(x: T): T => ({ ...x, verification: v });
  return {
    ...ref,
    products: ref.products.map((p) => ({
      ...p,
      attributes: Object.fromEntries(Object.entries(p.attributes).map(([k, f]) => [k, fix(f)])),
      sellingUnits: p.sellingUnits.map((s) => ({ ...s, contains: fix(s.contains) })),
    })),
    workItems: ref.workItems.map((w) => ({
      ...w,
      constants: Object.fromEntries(Object.entries(w.constants).map(([k, f]) => [k, fix(f)])),
      needs: w.needs.map(fix),
    })),
  };
}

const ALL_PRODUCTS = {
  tuile: { productId: "edilians-hp10-huguenot", origin: "devis" },
  liteau: { productId: "liteau-sapin-27x40-4m", origin: "devis" },
  contre_liteau: { productId: "liteau-sapin-27x40-4m", origin: "artisan" },
  ecran: { productId: "ecran-hpv-r2-150x50", origin: "artisan" },
} as const;

const CASE: WorkItemInput = {
  workItemId: "couverture-tuiles-emboitement",
  params: {
    surface: { value: "120", unit: "m2", origin: "devis", evidence: "Devis, ligne 4" },
    pureau: { value: "34.3", unit: "cm", origin: "artisan" },
    entraxe_chevrons: { value: "60", unit: "cm", origin: "artisan" },
    pente: { value: "45", unit: "%", origin: "artisan" },
  },
  products: ALL_PRODUCTS,
  mentioned: ["tuile", "liteau"],
};

const need = (r: ReturnType<typeof computeWorkItem>, id: string) => r.needs.find((n) => n.needId === id)!;

describe("formules du référentiel (unités contrôlées)", () => {
  it("calcule exactement et refuse ce qui n'a pas de sens physique", () => {
    const vars = { surface: { value: parseRefUnit("m2").factor.times(120), dim: parseRefUnit("m2").dim }, pureau: { value: parseRefUnit("cm").factor.times("34.3"), dim: parseRefUnit("cm").dim } };
    const v = evaluate(parseFormula("surface / pureau"), (n) => vars[n as keyof typeof vars]);
    expect(v.dim).toEqual({ L: 1, M: 0 });
    expect(v.value.toDecimalPlaces(3).toFixed()).toBe("349.854");

    const dims = (n: string) => ({ surface: { L: 2, M: 0 }, longueur: { L: 1, M: 0 } })[n]!;
    expect(() => inferDim(parseFormula("surface + longueur"), dims)).toThrow(/ne se combinent pas/);
    expect(() => inferDim(parseFormula("arrondi_sup(longueur)"), dims)).toThrow(/arrondi_sup/);
    expect(() => parseFormula("surface ** 2")).toThrow();
    expect(() => parseFormula("eval(surface)")).toThrow(/Fonction inconnue/);
    expect(() => parseFormula("surface; process.exit()")).toThrow();
  });
});

describe("référentiel couverture", () => {
  it("est cohérent : sources, unités, formules, appellations", () => {
    expect(checkReferential(ROOFING_REFERENTIAL)).toEqual([]);
  });

  it("n'a encore aucune donnée vérifiée : rien ne sert au calcul d'un artisan", () => {
    const facts: Fact[] = ROOFING_REFERENTIAL.products.flatMap((p) => [...Object.values(p.attributes), ...p.sellingUnits.map((s) => s.contains)]);
    const nonDefinition = facts.filter((f) => f.source !== "definition");
    expect(nonDefinition.length).toBeGreaterThan(0);
    expect(nonDefinition.every((f) => f.verification.status === "draft")).toBe(true);

    const r = computeWorkItem(ROOFING_REFERENTIAL, CASE);
    for (const n of r.needs) {
      expect(n.status).toBe("unknown");
      expect(n.quantity).toBeUndefined();
      expect(n.reason).toMatch(/en attente de vérification/);
    }
  });

  it("refuse une donnée incohérente plutôt que de la corriger", () => {
    const broken: Referential = structuredClone(ROOFING_REFERENTIAL);
    broken.workItems[0]!.needs[1]!.unit = "m2"; // liteaux annoncés en m² alors que la formule donne des ml
    broken.products[0]!.attributes.largeur_utile = { ...broken.products[0]!.attributes.largeur_utile!, verification: { status: "verified" } };
    broken.products[1]!.attributes.epaisseur = { ...broken.products[1]!.attributes.epaisseur!, source: "inconnue" };
    broken.products[2]!.aliases.push("27x40"); // même appellation que le liteau, mais autre famille : permis
    const errors = checkReferential(broken);
    expect(errors.some((e) => e.includes("liteaux") && e.includes("pas des m2"))).toBe(true);
    expect(errors.some((e) => e.includes("vérifiée sans date ni vérificateur"))).toBe(true);
    expect(errors.some((e) => e.includes("source inconnue"))).toBe(true);
  });
});

describe("moteur : ouvrage → besoins → achat", () => {
  const ref = allVerified(ROOFING_REFERENTIAL);

  it("calcule et explique : tuiles, liteaux, contre-liteaux, écran", () => {
    const r = computeWorkItem(ref, CASE);
    expect(r.referentialVersion).toBe(ROOFING_REFERENTIAL.version);

    // 120 m² ÷ (0,268 m × 0,343 m) = 1 305,43 tuiles → 1 306 pièces.
    expect(need(r, "tuiles")).toMatchObject({
      status: "calculated",
      label: "Tuiles HP10",
      origin: "explicit",
      quantity: { value: "1305.43", unit: "u" },
      purchase: { order: { count: "1306", unit: { many: "pièces" } } },
      provisional: false,
    });
    // 120 m² ÷ 0,343 m = 349,85 ml → 88 longueurs de 4 m.
    expect(need(r, "liteaux")).toMatchObject({ quantity: { value: "349.85", unit: "ml" }, purchase: { order: { count: "88" } }, origin: "explicit" });
    // 120 m² ÷ 0,60 m = 200 ml → 50 longueurs ; absent du devis : seulement suggéré.
    expect(need(r, "contre-liteaux")).toMatchObject({ quantity: { value: "200", unit: "ml" }, purchase: { order: { count: "50" } }, origin: "suggested" });
    // Pente 45 % ≥ 30 % : recouvrement 10 cm → 120 × 1,5 ÷ 1,4 = 128,57 m² → 2 rouleaux de 75 m².
    expect(need(r, "ecran")).toMatchObject({ quantity: { value: "128.57", unit: "m2" }, purchase: { order: { count: "2", unit: { many: "rouleaux" } } } });

    // « Voir le calcul » : chaque nombre a son origine.
    const trace = need(r, "tuiles").trace;
    expect(trace.find((t) => t.label === "Surface de toiture")).toMatchObject({ value: "120", from: "Devis, ligne 4" });
    expect(trace.find((t) => t.label.startsWith("Largeur utile"))).toMatchObject({ value: "0,268", unit: "m", verified: true });
    expect(trace.find((t) => t.label === "Marge")).toMatchObject({ value: "0", from: "Aucune marge réglée" });
    expect(need(r, "tuiles").exclusions).toMatch(/Hors tuiles de rive/);
  });

  it("applique la marge réglée par l'artisan, jamais une marge inventée", () => {
    const r = computeWorkItem(ref, { ...CASE, companyWaste: { roof_tile: "5" } });
    // 1 305,43 × 1,05 = 1 370,70 → 1 371 pièces.
    expect(need(r, "tuiles")).toMatchObject({ quantity: { value: "1370.7" }, purchase: { order: { count: "1371" } } });
    expect(need(r, "liteaux").quantity?.value).toBe("349.85");
  });

  it("pose UNE question quand il manque une information, au lieu de deviner", () => {
    const { pureau: _p, ...params } = CASE.params;
    const r = computeWorkItem(ref, { ...CASE, params });
    expect(need(r, "tuiles")).toMatchObject({ status: "question", question: { key: "param:pureau", text: "À quel pureau posez-vous ces tuiles ?" } });
    expect(need(r, "tuiles").quantity).toBeUndefined();
    expect(r.nextQuestion?.key).toBe("param:pureau");
    // Le pureau sert aussi aux liteaux : c'est la même question, posée une fois.
    expect(need(r, "liteaux").question?.key).toBe("param:pureau");
    // Ce qui ne dépend pas du pureau reste calculé.
    expect(need(r, "contre-liteaux").status).toBe("calculated");
  });

  it("fait confirmer un modèle reconnu par son appellation, et refuse un pureau hors fiche", () => {
    const alias = computeWorkItem(ref, { ...CASE, products: { ...ALL_PRODUCTS, tuile: { productId: "edilians-hp10-huguenot", origin: "alias" } } });
    expect(need(alias, "tuiles").question).toMatchObject({ kind: "confirm_product", text: "J'ai identifié : Tuiles HP10. C'est bien ce modèle ?" });

    const { tuile: _t, ...others } = ALL_PRODUCTS;
    const missing = computeWorkItem(ref, { ...CASE, products: others });
    expect(need(missing, "tuiles").question).toMatchObject({ kind: "choose_product", options: [{ label: "Tuiles HP10" }] });

    const outside = computeWorkItem(ref, { ...CASE, params: { ...CASE.params, pureau: { value: "40", unit: "cm", origin: "artisan" } } });
    expect(need(outside, "tuiles").question).toMatchObject({ key: "param:pureau", hint: "Entre 31 et 37,6 cm." });
  });

  it("marque « provisoire » un calcul fait en brouillon (écran du validateur uniquement)", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, CASE, { acceptDraft: true });
    expect(need(r, "tuiles")).toMatchObject({ status: "calculated", provisional: true, quantity: { value: "1305.43" } });
    expect(need(r, "tuiles").trace.find((t) => t.label.startsWith("Largeur utile"))).toMatchObject({ verified: false });
  });
});

describe("reconnaissance des appellations (devis client et fournisseurs)", () => {
  it("relie le vocabulaire chantier et fournisseur au même produit", () => {
    const tile = identifyProducts("Couverture en tuiles HP10 rouge – 120 m²", ROOFING_REFERENTIAL);
    expect(tile.candidates.map((c) => c.product.id)).toEqual(["edilians-hp10-huguenot"]);
    for (const text of ["Écran HPV", "Membrane respirante sous-toiture", "Écran sous-toiture HPV R2 1,5x50"]) {
      expect(identifyProducts(text, ROOFING_REFERENTIAL, "underlay").candidates.map((c) => c.product.id)).toEqual(["ecran-hpv-r2-150x50"]);
    }
    expect(identifyProducts("Liteaux sapin 27 x 40", ROOFING_REFERENTIAL).candidates[0]?.product.shortLabel).toBe("Liteaux 27×40");
    expect(identifyProducts("Tuile romane canal", ROOFING_REFERENTIAL).candidates).toEqual([]);
  });
});
