import { describe, expect, it } from "vitest";
import {
  checkReferential,
  classifyMaterial,
  computeWorkItem,
  tradeProfile,
  requiredInputs,
  identifyProducts,
  paramsFromContext,
  parseFormula,
  ROOFING_REFERENTIAL,
  type Fact,
  type Referential,
  type WorkItemInput,
} from "../src/index.js";
import { evaluate, evaluateInterval, inferDim } from "../src/referential/expression.js";
import { Decimal } from "../src/shared/decimal.js";
import { parseRefUnit } from "../src/referential/units.js";
import { drafted } from "./support/brouillon.js";
import { sansHypotheses } from "./support/sans-hypotheses.js";

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
  liteau: { productId: "liteau-sapin-27x40", origin: "devis" },
  contre_liteau: { productId: "liteau-sapin-27x40", origin: "artisan" },
  ecran: { productId: "soprema-sop-ecran-hpv-r2-150x50", origin: "artisan" },
} as const;

const CASE: WorkItemInput = {
  workItemId: "couverture-tuiles-emboitement",
  params: {
    surface: { value: "120", unit: "m2", origin: "devis", evidence: "Devis, ligne 4" },
    pureau: { value: "34.3", unit: "cm", origin: "artisan" },
    entraxe_supports: { value: "60", unit: "cm", origin: "artisan" },
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

  it("règles de calcul validées par le fondateur : tracées (qui, quand) et calculées pour l'artisan", () => {
    expect(ROOFING_REFERENTIAL.products[0]!.attributes.largeur_utile!.verification.status).toBe("verified");
    for (const n of ROOFING_REFERENTIAL.workItems[0]!.needs) {
      expect(n.verification).toMatchObject({ status: "verified", verifiedBy: "Fondateur (couvreur)" });
      expect(n.verification.verifiedAt).toMatch(/^2026-10-0[23]$/);
    }
    // 1 305,43 tuiles + 3 % de perte (référentiel du fondateur) = 1 344,59.
    const r = computeWorkItem(ROOFING_REFERENTIAL, CASE);
    expect(need(r, "tuiles")).toMatchObject({ status: "calculated", provisional: false, quantity: { value: "1344.59" } });
  });

  it("une règle remise en brouillon ne donne aucun chiffre à un artisan", () => {
    const r = computeWorkItem(drafted(ROOFING_REFERENTIAL), CASE);
    for (const n of r.needs) {
      expect(n.status).toBe("unknown");
      expect(n.quantity).toBeUndefined();
      expect(n.reason).toMatch(/Règle de calcul en attente de vérification/);
    }
  });

  it("les règles BatiClair redonnent les tableaux du fabricant (Edilians HP 10)", () => {
    // Fiche HP 10 : 3,22 / 2,91 / 2,66 ml de liteaux par m² aux pureaux 310 / 343 / 376 mm ; 9,9 à 12 tuiles/m².
    const r = (pureauCm: string) =>
      computeWorkItem(allVerified(sansHypotheses(ROOFING_REFERENTIAL)), { ...CASE, params: { ...CASE.params, surface: { value: "1", unit: "m2", origin: "devis" }, pureau: { value: pureauCm, unit: "cm", origin: "artisan" } } });
    // Démonstration complète : docs/demonstration-regles-tuiles-liteaux.md.
    // La fiche donne 2 décimales (tronquées à 310 et 343 mm, arrondies à 376 mm) : écart toléré < 0,01 ml/m².
    const FICHE_LITEAUX = [["31", 3.22], ["34.3", 2.91], ["37.6", 2.66]] as const;
    for (const [pureau, fiche] of FICHE_LITEAUX) {
      expect(Math.abs(Number(need(r(pureau), "liteaux").quantity!.value) - fiche)).toBeLessThan(0.01);
    }
    // Tuiles : la fiche annonce 9,9 à 12 tuiles/m² (1 décimale) ; le calcul donne 9,92 et 12,04.
    const FICHE_TUILES = [["31", 12], ["37.6", 9.9]] as const;
    for (const [pureau, fiche] of FICHE_TUILES) {
      expect(Math.abs(Number(need(r(pureau), "tuiles").quantity!.value) - fiche)).toBeLessThan(0.05);
    }
  });

  it("range chaque donnée dans sa nature : fabricant, pose, chantier, artisan, conditionnement", () => {
    const mixed: Referential = structuredClone(ROOFING_REFERENTIAL);
    // Un conditionnement rangé comme caractéristique fabricant, une caractéristique rangée comme condition de pose.
    mixed.products[0]!.attributes.largeur_utile = { ...mixed.products[0]!.attributes.largeur_utile!, kind: "packaging" };
    mixed.workItems[0]!.constants.seuil_pente_ecran = { ...mixed.workItems[0]!.constants.seuil_pente_ecran!, kind: "manufacturer_spec" };
    const errors = checkReferential(mixed);
    expect(errors.some((e) => e.includes("largeur_utile") && e.includes("nature « packaging » rangée comme « manufacturer_spec »"))).toBe(true);
    expect(errors.some((e) => e.includes("seuil_pente_ecran") && e.includes("condition de pose"))).toBe(true);
    // Le pureau retenu est une donnée du chantier, pas une caractéristique de la tuile.
    expect(ROOFING_REFERENTIAL.workItems[0]!.params.find((p) => p.key === "pureau")?.kind).toBe("site_data");
  });

  it("chaque règle connaît exactement les données nécessaires pour être déterministe", () => {
    const tuiles = requiredInputs(ROOFING_REFERENTIAL, "couverture-tuiles-emboitement", "tuiles");
    expect(tuiles.products.map((p) => p.slot)).toEqual(["tuile"]);
    expect(tuiles.params).toEqual([
      { key: "surface", label: "Surface de toiture", kind: "site_data" },
      { key: "pureau", label: "Pureau", kind: "site_data" },
    ]);
    expect(tuiles.manufacturerSpecs.map((s) => s.key).sort()).toEqual(["largeur_utile", "pureau_max", "pureau_min"]);
    const ecran = requiredInputs(ROOFING_REFERENTIAL, "couverture-tuiles-emboitement", "ecran");
    expect(ecran.params.map((p) => p.key)).toEqual(["surface", "pente"]);
    expect(ecran.installationConditions.sort()).toEqual(["recouvrement_faible_pente", "recouvrement_forte_pente", "seuil_pente_ecran"]);
  });

  it("refuse une donnée incohérente plutôt que de la corriger", () => {
    const broken: Referential = structuredClone(ROOFING_REFERENTIAL);
    broken.workItems[0]!.needs[1]!.unit = "m2"; // liteaux annoncés en m² alors que la formule donne des ml
    broken.products[0]!.attributes.largeur_utile = { ...broken.products[0]!.attributes.largeur_utile!, verification: { status: "verified" } };
    broken.products[1]!.attributes.epaisseur = { ...broken.products[1]!.attributes.epaisseur!, source: "inconnue" };
    broken.products[2]!.aliases.push("27x40"); // même appellation que le liteau, mais autre famille : permis
    // Une habitude métier ne peut pas fixer une caractéristique produit.
    broken.products[0]!.attributes.pureau_min = { ...broken.products[0]!.attributes.pureau_min!, source: "baticlair-geometrie-couverture" };
    const errors = checkReferential(broken);
    expect(errors.some((e) => e.includes("pureau_min") && e.includes("donnée produit sourcée par « baticlair_rule »"))).toBe(true);
    expect(errors.some((e) => e.includes("liteaux") && e.includes("pas des m2"))).toBe(true);
    expect(errors.some((e) => e.includes("vérifiée sans date ni vérificateur"))).toBe(true);
    expect(errors.some((e) => e.includes("source inconnue"))).toBe(true);
  });
});

describe("moteur : ouvrage → besoins → achat", () => {
  // La mécanique du moteur se prouve SANS les hypothèses par défaut ni les pertes du référentiel du fondateur.
  const ref = allVerified(sansHypotheses(ROOFING_REFERENTIAL));

  it("calcule et explique : tuiles, liteaux, contre-liteaux, écran", () => {
    const r = computeWorkItem(ref, CASE);
    expect(r.referentialVersion).toBe(ROOFING_REFERENTIAL.version);

    // 120 m² ÷ (0,268 m × 0,343 m) = 1 305,43 tuiles → 1 306 pièces.
    // 1 305,43 ÷ 240 par palette = 5,44 → ≈ 6 palettes (ordre de grandeur, la commande reste en pièces).
    expect(need(r, "tuiles").purchase?.approx).toEqual([{ count: "6", unit: { one: "palette", many: "palettes" } }]);
    expect(need(r, "tuiles")).toMatchObject({
      status: "calculated",
      label: "Tuiles HP10",
      origin: "explicit",
      quantity: { value: "1305.43", unit: "u" },
      purchase: { order: { count: "1306", unit: { many: "pièces" } } },
      provisional: false,
    });
    // 120 m² ÷ 0,343 m = 349,85 ml, commandés au mètre (350 ml) ; la botte de 50 ml donne l'ordre de grandeur.
    expect(need(r, "liteaux")).toMatchObject({ quantity: { value: "349.85", unit: "ml" }, origin: "explicit", purchase: { order: { count: "350", unit: { many: "ml" } }, approx: [{ count: "7" }] } });
    // 120 m² ÷ 0,60 m = 200 ml ; absent du devis mais cœur de l'ouvrage (le support n'est jamais oublié) : déduit.
    expect(need(r, "contre-liteaux")).toMatchObject({ quantity: { value: "200", unit: "ml" }, origin: "deduced" });
    // Pente 45 % ≥ 30 % : recouvrement 10 cm → 120 × 1,5 ÷ 1,4 = 128,57 m² → 2 rouleaux de 75 m².
    expect(need(r, "ecran")).toMatchObject({ quantity: { value: "128.57", unit: "m2" }, purchase: { order: { count: "2", unit: { many: "rouleaux" } } } });

    // « Voir le calcul » : chaque nombre a son origine.
    const trace = need(r, "tuiles").trace;
    expect(trace.find((t) => t.label === "Surface de toiture")).toMatchObject({ value: "120", from: "Devis, ligne 4" });
    expect(trace.find((t) => t.label.startsWith("Largeur utile"))).toMatchObject({ value: "0,268", unit: "m", verified: true });
    expect(trace.find((t) => t.label === "Marge")).toMatchObject({ value: "0", from: "Aucune marge réglée par votre entreprise", origin: "company" });
    expect(need(r, "tuiles").exclusions).toMatch(/Hors tuiles de rive/);
  });

  it("écran : à 30 % de pente pile, recouvrement de 20 cm (« ≤ 30 % », cas limite)", () => {
    const r = computeWorkItem(ref, { ...CASE, params: { ...CASE.params, pente: { value: "30", unit: "%", origin: "artisan" } } });
    // 120 × 1,5 ÷ (1,5 − 0,20) = 138,46 m² → 2 rouleaux de 75 m².
    expect(need(r, "ecran")).toMatchObject({ quantity: { value: "138.46" }, purchase: { order: { count: "2" } } });
  });

  it("une donnée inconnue n'est demandée que si elle change la commande (calcul sur toutes ses valeurs possibles)", () => {
    const { pente: _p, ...sansPente } = CASE.params;
    // 120 m² : 2 rouleaux quelle que soit la pente → pas de question, fourchette du besoin dite.
    const r = computeWorkItem(ref, { ...CASE, params: sansPente });
    expect(need(r, "ecran")).toMatchObject({ status: "calculated", quantityRange: { min: "128.57", max: "138.46" }, purchase: { order: { count: "2" } } });
    expect(need(r, "ecran").quantity).toBeUndefined();
    // 70 m² : 75 m² (pente > 30 %) = 1 rouleau, mais 80,77 m² (≤ 30 %) = 2 rouleaux → la pente compte, on la demande.
    const small = computeWorkItem(ref, { ...CASE, params: { ...sansPente, surface: { value: "70", unit: "m2", origin: "devis" } } });
    expect(need(small, "ecran")).toMatchObject({ status: "question", question: { key: "param:pente", impact: "De 1 à 2 rouleaux selon la réponse." } });
    // Sans aucune borne connue (entraxe), la commande peut tout valoir : question.
    const { entraxe_supports: _e, ...sansEntraxe } = CASE.params;
    expect(need(computeWorkItem(ref, { ...CASE, params: sansEntraxe }), "contre-liteaux").status).toBe("question");
  });

  it("ne pose jamais de question pour un besoin seulement suggéré (absent du devis)", () => {
    const { entraxe_supports: _e, ...params } = CASE.params;
    const suggested: Referential = { ...ref, workItems: ref.workItems.map((w) => ({ ...w, needs: w.needs.map((n) => (n.id === "contre-liteaux" ? { ...n, core: false } : n)) })) };
    const r = computeWorkItem(suggested, { ...CASE, params, mentioned: ["tuile", "liteau"] });
    expect(need(r, "contre-liteaux")).toMatchObject({ origin: "suggested", status: "question" });
    expect(r.nextQuestion).toBeNull();
  });

  it("conditionnement inconnu : le besoin reste affiché, seule la conversion attend (cas D-2026-015)", () => {
    // Un liteau SANS unité de vente saisie : la longueur vendue dépend du négoce, BatiClair ne la choisit pas.
    const noUnits: Referential = structuredClone(ref);
    noUnits.products.find((p) => p.id === "liteau-sapin-27x40")!.sellingUnits = [];
    const r = computeWorkItem(noUnits, CASE);
    expect(need(r, "liteaux")).toMatchObject({ status: "calculated", quantity: { value: "349.85", unit: "ml" } });
    expect(need(r, "liteaux").purchaseUnavailable).toBe("Conditionnement à confirmer : aucune unité de vente vérifiée pour Liteaux 27×40.");
    // Même chose quand l'unité de vente existe mais n'est pas vérifiée.
    const pending: Referential = structuredClone(ref);
    const ecran = pending.products.find((p) => p.id === "soprema-sop-ecran-hpv-r2-150x50")!;
    ecran.sellingUnits[0]!.contains = { ...ecran.sellingUnits[0]!.contains, verification: { status: "draft" } };
    expect(need(computeWorkItem(pending, CASE), "ecran").purchaseUnavailable).toMatch(/en attente de vérification : Contenu : 1 rouleau/);
    // Une donnée inconnue + conversion impossible : on ne peut pas prouver qu'elle est sans effet → question.
    const { pureau: _p, ...params } = CASE.params;
    expect(need(computeWorkItem(ref, { ...CASE, params }), "liteaux").status).toBe("question");
  });

  it("applique la marge réglée par l'artisan, jamais une marge inventée", () => {
    const r = computeWorkItem(ref, { ...CASE, preferences: { waste: { roof_tile: "5" } } });
    // 1 305,43 × 1,05 = 1 370,70 → 1 371 pièces.
    expect(need(r, "tuiles")).toMatchObject({ quantity: { value: "1370.7" }, purchase: { order: { count: "1371" } } });
    expect(need(r, "liteaux").quantity?.value).toBe("349.85");
  });

  it("prend la marge la plus précise : réglage artisan (produit, puis famille), sinon règle sourcée (produit, puis famille)", () => {
    const sourced: Referential = {
      ...ref,
      wasteRules: [
        { family: "roof_tile", rate: "3", source: "edilians-hp10", verification: { status: "verified", verifiedAt: "2026-10-01", verifiedBy: "test" }, version: 1 },
        { family: "roof_tile", product: "edilians-hp10-huguenot", rate: "4", source: "edilians-hp10", verification: { status: "verified", verifiedAt: "2026-10-01", verifiedBy: "test" }, version: 1 },
      ],
    };
    expect(checkReferential(sourced)).toEqual([]);
    const ruled = computeWorkItem(sourced, CASE);
    // 1 305,43 × 1,04 = 1 357,64 : la règle du produit l'emporte sur celle de la famille.
    expect(need(ruled, "tuiles").quantity?.value).toBe("1357.64");
    expect(need(ruled, "tuiles").trace.find((t) => t.label === "Marge recommandée")).toMatchObject({ value: "4" });
    // Le réglage de l'artisan pour ce produit prime sur tout.
    const own = computeWorkItem(sourced, { ...CASE, preferences: { waste: { roof_tile: "8", "edilians-hp10-huguenot": "2" } } });
    // 1 305,4262 × 1,02 = 1 331,5347.
    expect(need(own, "tuiles").quantity?.value).toBe("1331.53");
    // Aucune règle pour les liteaux : 0 %, dit clairement.
    expect(need(own, "liteaux").trace.find((t) => t.label === "Marge")).toMatchObject({ value: "0" });
  });

  it("120 m² + modèle HP10 ne suffisent pas : jamais de pureau choisi à la place de l'artisan", () => {
    const r = computeWorkItem(ref, {
      workItemId: "couverture-tuiles-emboitement",
      params: { surface: { value: "120", unit: "m2", origin: "devis" } },
      products: { tuile: { productId: "edilians-hp10-huguenot", origin: "devis" } },
      mentioned: ["tuile"],
    });
    expect(need(r, "tuiles")).toMatchObject({ status: "question", question: { key: "param:pureau" } });
    expect(need(r, "tuiles").quantity).toBeUndefined();
    // L'écart que cette question évite : entre 1 191 (pureau maxi) et 1 445 tuiles (pureau mini).
    const at = (p: string) =>
      need(computeWorkItem(ref, { ...CASE, params: { ...CASE.params, pureau: { value: p, unit: "cm", origin: "artisan" } } }), "tuiles").purchase!.order.count;
    expect([at("37.6"), at("31")]).toEqual(["1191", "1445"]);
  });

  it("pose UNE question quand il manque une information, au lieu de deviner", () => {
    const { pureau: _p, ...params } = CASE.params;
    const r = computeWorkItem(ref, { ...CASE, params });
    expect(need(r, "tuiles")).toMatchObject({
      status: "question",
      question: { key: "param:pureau", text: "À quel pureau posez-vous ces tuiles ?", impact: "De 1 191 à 1 445 pièces selon la réponse." },
    });
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
    const r = computeWorkItem(drafted(ROOFING_REFERENTIAL), CASE, { acceptDraft: true });
    expect(need(r, "tuiles")).toMatchObject({ status: "calculated", provisional: true, quantity: { value: "1344.59" } });
    // La caractéristique fabricant est vérifiée ; c'est la règle de calcul qui attend sa validation.
    expect(need(r, "tuiles").trace.find((t) => t.label.startsWith("Largeur utile"))).toMatchObject({ verified: true });
    expect(need(r, "tuiles").trace.find((t) => t.label === "Besoin calculé")).toMatchObject({ verified: false });
  });
});

describe("reconnaissance des appellations (devis client et fournisseurs)", () => {
  it("relie les appellations au produit, sans jamais prêter une marque à une description générique", () => {
    const tile = identifyProducts("Couverture en tuiles HP10 rouge – 120 m²", ROOFING_REFERENTIAL);
    expect(tile.candidates.map((c) => c.product.id)).toEqual(["edilians-hp10-huguenot"]);
    expect(identifyProducts("SOP'ÉCRAN HPV R2 1,50 x 50 m", ROOFING_REFERENTIAL, "underlay").candidates.map((c) => c.product.id)).toEqual([
      "soprema-sop-ecran-hpv-r2-150x50",
    ]);
    // Cas trouvé par la simulation du devis 120 m² : « écran HPV » désigne la famille, pas le rouleau Soprema.
    for (const text of ["Écran HPV", "Membrane respirante sous-toiture", "Pare-pluie toiture haute perméance"]) {
      expect(identifyProducts(text, ROOFING_REFERENTIAL, "underlay").candidates).toEqual([]);
      expect(classifyMaterial(text, tradeProfile("roofing"))?.code).toBe("underlay");
    }
    expect(identifyProducts("Liteaux sapin 27 x 40", ROOFING_REFERENTIAL).candidates[0]?.product.shortLabel).toBe("Liteaux 27×40");
    expect(identifyProducts("Tuile romane canal", ROOFING_REFERENTIAL).candidates).toEqual([]);
  });
});

describe("calcul sur intervalles (sûr : contient toujours toutes les valeurs possibles)", () => {
  const iv = (lo: string | number, hi: string | number, L = 0) => ({ lo: new Decimal(lo), hi: new Decimal(hi), dim: { L, M: 0 } });
  const run = (f: string, vars: Record<string, ReturnType<typeof iv>>) => {
    const r = evaluateInterval(parseFormula(f), (n) => vars[n]!);
    return [r.lo.toString(), r.hi.toString()];
  };
  it("encadre sans jamais exclure une valeur possible", () => {
    expect(run("a * b", { a: iv(-2, 3), b: iv(4, 5) })).toEqual(["-10", "15"]);
    expect(run("a / b", { a: iv(1, 1), b: iv(2, 4) })).toEqual(["0.25", "0.5"]);
    // Division par un intervalle qui contient 0 : tout est possible.
    expect(run("a / b", { a: iv(1, 1), b: iv(-1, 1) })).toEqual(["-Infinity", "Infinity"]);
    // Condition indécidable : les deux branches restent possibles.
    expect(run("si(p <= 30, 20, 10)", { p: iv("-Infinity", "Infinity") })).toEqual(["10", "20"]);
    expect(run("si(p <= 30, 20, 10)", { p: iv(31, 50) })).toEqual(["10", "10"]);
    expect(run("arrondi_sup(a)", { a: iv("1.2", "1.9") })).toEqual(["2", "2"]);
  });
});

describe("contexte chantier : une information trouvée n'importe où sert à tout l'ouvrage", () => {
  const work = ROOFING_REFERENTIAL.workItems[0]!;
  it("réunit les preuves concordantes, et signale les contradictions au lieu de choisir", () => {
    const { params, conflicts } = paramsFromContext(
      {
        facts: [
          { key: "surface", value: "120", unit: "m2", evidence: "Devis, ligne 4", origin: "devis" },
          { key: "surface", value: "120", unit: "m2", evidence: "Devis, ligne 5", origin: "devis" },
          { key: "pureau", value: "343", unit: "mm", evidence: "Devis, en-tête", origin: "devis" },
          { key: "pureau", value: "34.3", unit: "cm", evidence: "Devis, ligne 5", origin: "devis" },
          { key: "entraxe_supports", value: "60", unit: "cm", evidence: "Devis, ligne 2", origin: "devis" },
          { key: "entraxe_supports", value: "50", unit: "cm", evidence: "Devis, ligne 9", origin: "devis" },
        ],
      },
      work,
    );
    expect(params.surface).toMatchObject({ value: "120", origin: "devis", evidence: "Devis, ligne 4, Devis, ligne 5" });
    // « 343 mm » et « 34,3 cm » : la même valeur, aucune contradiction.
    expect(params.pureau).toMatchObject({ value: "343", unit: "mm" });
    expect(params.entraxe_supports).toBeUndefined();
    expect(conflicts.map((c) => c.key)).toEqual(["entraxe_supports"]);
  });

  it("la réponse de l'artisan l'emporte sur le document", () => {
    const { params, conflicts } = paramsFromContext(
      {
        facts: [
          { key: "entraxe_supports", value: "60", unit: "cm", evidence: "Devis, ligne 2", origin: "devis" },
          { key: "entraxe_supports", value: "50", unit: "cm", evidence: "Devis, ligne 9", origin: "devis" },
          { key: "entraxe_supports", value: "60", unit: "cm", evidence: "Votre réponse", origin: "artisan" },
        ],
      },
      work,
    );
    expect(params.entraxe_supports).toMatchObject({ value: "60", origin: "artisan" });
    expect(conflicts).toEqual([]);
  });
});
