import { describe, expect, it } from "vitest";
import {
  assessNeed,
  assessTakeoffLine,
  classifyCorrection,
  computeWorkItem,
  correctionPattern,
  decideState,
  DEFAULT_PREFERENCE_POLICIES,
  disablePreference,
  enginePreferences,
  learnFromChoice,
  preferenceStanding,
  REQUIRED_FOR_PURCHASE_LINE,
  resolvePreference,
  ROOFING_REFERENTIAL,
  setPreference,
  tradeProfile,
  trustCounts,
  validateTakeoff,
  type CompanyPreference,
  type Criterion,
  type NeedResult,
  type Referential,
  type TakeoffLineInput,
  type WorkItemInput,
} from "../src/index.js";

/**
 * CONFIANCE ✓ / ⚠ / ? ET MÉMOIRE DE L'ENTREPRISE (PD-045).
 * ✓ = assez d'éléments ÉTABLIS pour produire la ligne sans l'artisan ;
 * jamais « il ne reste plus de question ». On cherche à poser moins de
 * questions, jamais à fabriquer des ✓.
 */

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

const REF = allVerified(ROOFING_REFERENTIAL);
const ROOF: WorkItemInput = {
  workItemId: "couverture-tuiles-emboitement",
  params: {
    surface: { value: "80", unit: "m2", origin: "devis", evidence: "Devis, ligne 2" },
    pureau: { value: "34", unit: "cm", origin: "artisan" },
    entraxe_supports: { value: "60", unit: "cm", origin: "devis", evidence: "Devis, ligne 1" },
  },
  products: { tuile: { productId: "edilians-hp10-huguenot", origin: "artisan" } },
  mentioned: ["tuile", "ecran"],
};
const need = (input: WorkItemInput, id: string): NeedResult => computeWorkItem(REF, input).needs.find((n) => n.needId === id)!;
const origins = (c: Criterion[]) => c.map((x) => [x.key, x.origin ?? null]);

describe("décision ✓ / ⚠ / ? par critères explicites", () => {
  const ok = (key: Criterion["key"]): Criterion => ({ key, status: "established", detail: "" });

  it("✓ exige que chaque critère requis soit ÉTABLI : l'absence de question ne suffit pas", () => {
    expect(decideState(REQUIRED_FOR_PURCHASE_LINE.map(ok), REQUIRED_FOR_PURCHASE_LINE).state).toBe("verified");
    const withoutReading = REQUIRED_FOR_PURCHASE_LINE.filter((k) => k !== "reading").map(ok);
    expect(decideState(withoutReading, REQUIRED_FOR_PURCHASE_LINE)).toMatchObject({ state: "missing", reason: "Lecture du devis : non établi." });
  });

  it("une incertitude qui ne change pas la commande ne dérange pas l'artisan", () => {
    const criteria: Criterion[] = [...REQUIRED_FOR_PURCHASE_LINE.map(ok), { key: "consistency", status: "to_confirm", detail: "Petit doute de mise en page." }];
    const a = decideState(criteria, REQUIRED_FOR_PURCHASE_LINE);
    expect(a.state).toBe("verified");
    // L'incertitude reste dans le raisonnement, rangée « sans effet ».
    expect(a.criteria.at(-1)).toMatchObject({ status: "no_effect" });
  });

  it("le conditionnement laissé au fournisseur ne bloque pas ✓, mais reste dans le raisonnement (risque de comparaison)", () => {
    const criteria: Criterion[] = [
      ...REQUIRED_FOR_PURCHASE_LINE.filter((k) => k !== "packaging").map(ok),
      { key: "packaging", status: "supplier", detail: "Conditionnement indiqué par le fournisseur.", comparisonRisk: true },
    ];
    const a = decideState(criteria, REQUIRED_FOR_PURCHASE_LINE);
    expect(a.state).toBe("verified");
    expect(a.criteria.find((c) => c.key === "packaging")).toMatchObject({ status: "supplier", comparisonRisk: true });
  });

  it("une donnée manquante l'emporte sur un doute", () => {
    const a = decideState(
      [
        { key: "product", status: "to_confirm", detail: "Modèle ?", affects: ["product"] },
        { key: "site_data", status: "missing", detail: "Pureau ?", affects: ["quantity"] },
      ],
      [],
    );
    expect(a).toMatchObject({ state: "missing", reason: "Pureau ?" });
  });
});

describe("fiche d'une ligne du quantitatif (lecture du devis)", () => {
  const L = (designation: string, quantityRaw: string | null, unitRaw: string | null): TakeoffLineInput => ({ id: designation, designation, quantityRaw, unitRaw, source: "client_quote" });
  const assess = (trade: string, lines: TakeoffLineInput[], ctx: { confirmed?: string[] } = {}) => {
    const v = validateTakeoff(lines, tradeProfile(trade));
    return v.lines.map((l) => assessTakeoffLine(l, { documentIssues: v.issues, confirmedByArtisan: ctx.confirmed?.includes(l.lineId) ?? false }));
  };

  it("article défini, quantité lue en pièces : ✓, et chaque critère dit d'où il vient", () => {
    const [a] = assess("electrical", [L("Prise 2P+T 16 A blanche", "6", "u")]);
    expect(a!.state).toBe("verified");
    expect(origins(a!.criteria)).toEqual([
      ["reading", "devis"],
      ["work_item", "referential"],
      ["consistency", null],
      ["packaging", null],
    ]);
  });

  it("mesure d'ouvrage : jamais ✓ (la quantité à commander n'est pas établie), sans pour autant poser de question", () => {
    const [a] = assess("tiling", [L("Faïence 20x60 blanche", "12", "m²")]);
    expect(a).toMatchObject({ state: "missing", reason: "Quantité à commander non calculée : la mesure de l'ouvrage est envoyée au fournisseur." });
  });

  it("un doute qui change la quantité est ⚠ ; « C'est bon » le lève pour ce chantier, avec l'origine « chantier »", () => {
    const lines = [L("Lot de 4 spots GU10", "1", "u")];
    expect(assess("electrical", lines)[0]).toMatchObject({ state: "to_confirm" });
    const confirmed = assess("electrical", lines, { confirmed: ["Lot de 4 spots GU10"] })[0]!;
    expect(confirmed.state).toBe("verified");
    expect(confirmed.criteria.find((c) => c.key === "consistency")).toMatchObject({ status: "established", origin: "project" });
  });

  it("article non reconnu : ⚠ (le commander ou non change la commande) ; gardé par l'artisan : ✓ d'origine « chantier »", () => {
    expect(assess("electrical", [L("Valve 80 mm Stone", "4", "u")])[0]).toMatchObject({ state: "to_confirm", reason: "Article non reconnu : à commander tel qu'écrit ?" });
    const kept = assess("electrical", [L("Valve 80 mm Stone", "4", "u")], { confirmed: ["Valve 80 mm Stone"] })[0]!;
    expect(kept.state).toBe("verified");
    expect(kept.criteria.find((c) => c.key === "work_item")).toMatchObject({ origin: "project" });
  });

  it("conditionnement sans contenu (paquets) : demandé au fournisseur, pas à l'artisan", () => {
    const [a] = assess("roofing", [L("Crochets de gouttière", "3", "paquets")]);
    expect(a!.criteria.find((c) => c.key === "packaging")).toMatchObject({ status: "supplier", comparisonRisk: true });
    expect(a!.state).not.toBe("to_confirm");
  });

  it("devis sans unités : chaque ligne est ⚠, la question est posée une fois pour tout le document", () => {
    const lines = [L("Robinet d'arrêt", "3", null), L("Siphon de lavabo", "2", null), L("Flexible inox", "4", null)];
    const v = validateTakeoff(lines, tradeProfile("plumbing"));
    expect(v.issues.filter((i) => i.code === "UNITS_ABSENT")).toHaveLength(1);
    expect(trustCounts(assess("plumbing", lines))).toEqual({ verified: 0, to_confirm: 3, missing: 0 });
  });

  it("une prestation n'est pas un élément de la liste", () => {
    expect(assess("tiling", [L("Pose de faïence", "12", "m²")])[0]).toBeNull();
  });
});

describe("fiche d'un besoin calculé : origines séparées, jamais mélangées", () => {
  it("deux besoins ✓ d'origines différentes : produit choisi pour le chantier, produit habituel de l'entreprise", () => {
    const input: WorkItemInput = { ...ROOF, preferences: { products: { ecran: "soprema-sop-ecran-hpv-r2-150x50" } } };
    const tuiles = assessNeed(need(input, "tuiles"));
    const ecran = assessNeed(need(input, "ecran"));
    expect([tuiles.state, ecran.state]).toEqual(["verified", "verified"]);
    expect(tuiles.criteria.find((c) => c.key === "product")).toMatchObject({ origin: "project" });
    expect(ecran.criteria.find((c) => c.key === "product")).toMatchObject({ origin: "company", detail: "Écran HPV (Préférence de votre entreprise)" });
    // Les caractéristiques restent celles du référentiel : une préférence n'est jamais une donnée fabricant.
    expect(ecran.criteria.find((c) => c.key === "manufacturer_data")).toMatchObject({ origin: "referential" });
    // Données du chantier : lue dans le devis (surface) ou répondue pour ce chantier (pureau), chacune avec son origine.
    expect(tuiles.criteria.filter((c) => c.key === "site_data").map((c) => [c.detail.split(" :")[0], c.origin])).toEqual([
      ["Surface de toiture", "devis"],
      ["Pureau", "project"],
    ]);
  });

  it("une incertitude sans effet (la pente) laisse le besoin ✓, et reste visible dans le calcul", () => {
    const a = assessNeed(need({ ...ROOF, preferences: { products: { ecran: "soprema-sop-ecran-hpv-r2-150x50" } } }, "ecran"));
    expect(a.state).toBe("verified");
    expect(a.criteria).toContainEqual(expect.objectContaining({ key: "site_data", status: "no_effect" }));
  });

  it("préférence à reconfirmer : une question, jamais un ✓ silencieux", () => {
    const n = need({ ...ROOF, preferences: { proposals: { ecran: "soprema-sop-ecran-hpv-r2-150x50" } } }, "ecran");
    expect(n.question).toMatchObject({ kind: "confirm_product", text: "Écran sous-toiture habituel de votre entreprise : Écran HPV. On le garde pour ce chantier ?" });
    expect(assessNeed(n)).toMatchObject({ state: "to_confirm" });
  });

  it("préférence incompatible (autre famille) : écartée, la vérification normale reprend", () => {
    const n = need({ ...ROOF, preferences: { products: { ecran: "liteau-sapin-27x40" } } }, "ecran");
    expect(n.preferenceIgnored).toBe("Produit habituel « Liteaux 27×40 » écarté : ce n'est pas un produit de cette famille.");
    expect(n.question).toMatchObject({ kind: "choose_product" });
    expect(assessNeed(n).state).toBe("to_confirm");
  });

  it("préférence vers un produit retiré du référentiel : écartée", () => {
    const n = need({ ...ROOF, preferences: { products: { ecran: "produit-disparu" } } }, "ecran");
    expect(n.preferenceIgnored).toBe("Produit habituel écarté : il n'est plus au référentiel.");
    expect(n.status).toBe("question");
  });

  it("la sécurité technique passe avant l'habitude : un pureau hors de la fiche fabricant déclenche la vérification", () => {
    const n = need({ ...ROOF, params: { ...ROOF.params, pureau: { value: "45", unit: "cm", origin: "artisan" } } }, "tuiles");
    expect(n.question?.text).toBe("Pureau hors des valeurs de la fiche : pouvez-vous vérifier ?");
    expect(assessNeed(n).state).not.toBe("verified");
  });

  it("donnée de chantier manquante qui change la commande : ? avec l'écart chiffré", () => {
    const { pureau: _omit, ...params } = ROOF.params;
    const a = assessNeed(need({ ...ROOF, params }, "tuiles"));
    expect(a.state).toBe("missing");
    expect(a.reason).toMatch(/selon la réponse/);
  });

  it("calculer avec des préférences ne modifie jamais le référentiel", () => {
    const before = JSON.stringify(REF);
    computeWorkItem(REF, { ...ROOF, preferences: { products: { ecran: "soprema-sop-ecran-hpv-r2-150x50" }, waste: { roof_tile: "5" } } });
    expect(JSON.stringify(REF)).toBe(before);
  });
});

describe("mémoire de l'entreprise : apprise, datée, remplaçable", () => {
  const T0 = "2026-01-10T10:00:00.000Z";
  const choose = (memory: CompanyPreference[], value: string, projectId: string, at = T0, kind: CompanyPreference["kind"] = "product") =>
    learnFromChoice(memory, { kind, key: "slot:ecran", value, projectId, at });
  const now = new Date("2026-02-01T00:00:00.000Z");
  const resolve = (m: CompanyPreference[]) => resolvePreference(m, { kind: "product", key: "slot:ecran" }, now);

  it("1er choix : proposé au chantier suivant ; 2e chantier : établi, utilisé sans question", () => {
    let m = choose([], "ecran-x", "chantier-1");
    expect(resolve(m)).toMatchObject({ value: "ecran-x", use: "propose", standing: "trial" });
    m = choose(m, "ecran-x", "chantier-1"); // le même chantier ne compte qu'une fois
    expect(resolve(m)).toMatchObject({ use: "propose" });
    m = choose(m, "ecran-x", "chantier-2");
    expect(resolve(m)).toMatchObject({ value: "ecran-x", use: "silent", standing: "active" });
    expect(enginePreferences(m, now)).toEqual({ products: { ecran: "ecran-x" }, proposals: {} });
  });

  it("les seuils sont des paramètres (bêta), pas des constantes du code", () => {
    const m = choose([], "ecran-x", "chantier-1");
    const oneProject = { ...DEFAULT_PREFERENCE_POLICIES, product: { ...DEFAULT_PREFERENCE_POLICIES.product, confirmationsToActivate: 1 } };
    expect(resolvePreference(m, { kind: "product", key: "slot:ecran" }, now, oneProject)).toMatchObject({ use: "silent" });
  });

  it("prudence selon le type : fournisseur et appellation établis dès le 1er chantier, produit après 2, marge jamais apprise", () => {
    expect(DEFAULT_PREFERENCE_POLICIES.supplier.confirmationsToActivate).toBe(1);
    expect(DEFAULT_PREFERENCE_POLICIES.naming.confirmationsToActivate).toBe(1);
    expect(DEFAULT_PREFERENCE_POLICIES.product.confirmationsToActivate).toBe(2);
    expect(choose([], "8", "chantier-1", T0, "waste")).toEqual([]);
  });

  it("une préférence ancienne n'est plus appliquée en silence : elle est reproposée", () => {
    let m = choose([], "ecran-x", "chantier-1", "2025-01-01T00:00:00.000Z");
    m = choose(m, "ecran-x", "chantier-2", "2025-01-15T00:00:00.000Z");
    expect(preferenceStanding(m[0]!, new Date("2025-06-01"))).toBe("active");
    expect(preferenceStanding(m[0]!, new Date("2026-03-01"))).toBe("to_reconfirm");
    expect(enginePreferences(m, new Date("2026-03-01"))).toEqual({ products: {}, proposals: { ecran: "ecran-x" } });
  });

  it("l'artisan change d'habitude : l'ancienne est reproposée, puis remplacée (gardée dans l'historique)", () => {
    let m = choose(choose([], "ecran-x", "c1"), "ecran-x", "c2");
    m = choose(m, "ecran-y", "c3", "2026-01-20T00:00:00.000Z");
    // Plus jamais X en silence après avoir été contredit.
    expect(resolve(m)).toMatchObject({ use: "propose" });
    m = choose(m, "ecran-y", "c4", "2026-01-25T00:00:00.000Z");
    expect(resolve(m)).toMatchObject({ value: "ecran-y", use: "silent" });
    expect(m.find((p) => p.value === "ecran-x")).toMatchObject({ status: "replaced" });
  });

  it("« Désormais Y » : établi tout de suite ; « Ne plus utiliser » : plus jamais appliqué", () => {
    let m = setPreference(choose(choose([], "ecran-x", "c1"), "ecran-x", "c2"), { kind: "product", key: "slot:ecran", value: "ecran-z", projectId: "c3", at: T0 });
    expect(resolve(m)).toMatchObject({ value: "ecran-z", use: "silent" });
    expect(m.find((p) => p.value === "ecran-x")).toMatchObject({ status: "replaced" });
    m = disablePreference(m, { kind: "product", key: "slot:ecran" });
    expect(resolve(m)).toBeNull();
  });
});

describe("journal des corrections", () => {
  const before = { designation: "Prise 16 A", quantity: "6", unit: "u", reference: null, kind: "material" as const, family: "elec_device", basis: "purchase" as const };

  it("la cause est déduite de ce qui a changé, sans deviner l'intention", () => {
    expect(classifyCorrection({ action: "edit", before, after: { ...before, quantity: "8" } })).toBe("reading");
    expect(classifyCorrection({ action: "edit", before: { ...before, kind: "unknown", family: null }, after: { ...before, designation: "Prise de courant 16 A" } })).toBe(
      "unknown_synonym",
    );
    expect(classifyCorrection({ action: "edit", before, after: { ...before, kind: "labor", family: null } })).toBe("work_item");
    expect(classifyCorrection({ action: "delete", before, after: null })).toBe("not_to_order");
    expect(classifyCorrection({ action: "add", before: null, after: before })).toBe("missed_line");
    expect(classifyCorrection({ action: "confirm", before, after: before })).toBeNull();
  });

  it("l'empreinte permet de compter les entreprises sans lire leurs données", () => {
    const a = { action: "edit" as const, before: { ...before, designation: "Prise 16 A Hager Essensya", quantity: "6" }, after: { ...before, quantity: "8" } };
    const b = { action: "edit" as const, before: { ...before, designation: "PRISE 16A hager essensya", quantity: "12" }, after: { ...before, quantity: "14" } };
    expect(correctionPattern(a, "reading")).toBe(correctionPattern(b, "reading"));
    const pattern = correctionPattern(a, "reading");
    // Ni texte du devis, ni quantité, ni entreprise : la cause, les familles, et une empreinte des premiers mots.
    expect(pattern).not.toMatch(/prise|hager|essensya/i);
    expect(pattern.split("|").slice(0, -1).join("|")).toBe("edit|reading|elec_device|elec_device|material|material");
    expect(pattern.split("|").at(-1)).toMatch(/^[0-9a-f]{8}$/);
  });
});
