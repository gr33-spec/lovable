import { describe, expect, it } from "vitest";
import {
  computeWorkItem,
  identifyProducts,
  paramsFromContext,
  ROOFING_REFERENTIAL,
  tradeProfile,
  validateTakeoffLine,
  type ChantierContext,
  type CompanyPreferences,
  type NeedResult,
  type SlotChoice,
} from "../src/index.js";

/**
 * CAS DE RÉFÉRENCE N° 1 — devis client réel D-2026-015 (couverture, 120 m²),
 * fourni par le fondateur le 2026-10-01. ANONYMISÉ : seuls les contenus
 * techniques sont gardés (ni noms, ni adresses, ni coordonnées).
 *
 * Ce test fixe la frontière RÉELLE de BatiClair sur ce devis. Toute
 * évolution (donnée vérifiée, règle validée, faiblesse corrigée) doit la
 * faire bouger ici, explicitement. Voir docs/cas-reference-d2026-015.md.
 */
const DEVIS = [
  {
    ref: "ligne 1",
    designation:
      "Écran de sous-toiture respirant (Fourniture & Pose) - Fourniture et pose d'un écran de sous-toiture HPV (Hautement Perméable à la Vapeur) respirant, posé sur fermettes d'entraxe 90 cm (Surface : 120 m²)",
    quantity: "120",
    unit: "m²",
  },
  {
    ref: "ligne 2",
    designation:
      "Contre-lattage en liteaux 27x40 (Fourniture & Pose) - Fourniture et pose de contre-lattes en liteaux de section 27x40 mm pour la création de la lame d'air (Surface : 120 m²)",
    quantity: "120",
    unit: "m²",
  },
  {
    ref: "ligne 3",
    designation:
      "Lattage en liteaux 27x40 pour tuiles HP10 (Fourniture & Pose) - Fourniture et pose de liteaux de section 27x40 mm avec pureau adapté pour tuiles de type HP10 (Surface : 120 m²)",
    quantity: "120",
    unit: "m²",
  },
  {
    ref: "ligne 4",
    designation:
      "Couverture en tuiles terre cuite HP10 rouge (Fourniture & Pose) - Fourniture et pose de tuiles en terre cuite grand moule type HP10 de coloris rouge (Surface : 120 m²)",
    quantity: "120",
    unit: "m²",
  },
  {
    ref: "ligne 5",
    designation: "Rives de toit (Fourniture & Pose) - Fourniture et pose de tuiles de rive pour la finition des rives latérales (4 rives de 6 m)",
    quantity: "24",
    unit: "m",
  },
  {
    ref: "ligne 6",
    designation: "Faîtage (Fourniture & Pose) - Fourniture et pose de faîtières ventilées avec closoir ventilé et accessoires de fixation (Longueur : 10 m)",
    quantity: "10",
    unit: "m",
  },
  {
    ref: "ligne 7",
    designation:
      "Gouttière PVC de 25 sable (Fourniture & Pose) - Fourniture et pose de gouttières demi-ronde de 25 en PVC de coloris sable, crochets et naissances compris (Longueur : 2 x 10 m)",
    quantity: "20",
    unit: "m",
  },
  {
    ref: "ligne 8",
    designation:
      "Descente d'eau pluviale PVC Ø80 avec coudes (Fourniture & Pose) - Fourniture et pose d'un ensemble de descente d'eau pluviale en PVC Ø80 coloris sable, hauteur 4m, comprenant 2 jeux de coudes et les colliers de fixation par descente (2 ensembles au total)",
    quantity: "2",
    unit: "unités",
  },
  {
    ref: "ligne 9",
    designation: "Chatières de ventilation (Fourniture & Pose) - Fourniture et pose de tuiles chatières de ventilation adaptées au modèle HP10 (5 de chaque côté)",
    quantity: "10",
    unit: "unités",
  },
  {
    ref: "ligne 10",
    designation:
      "Sortie de toit Poujoulat (Fourniture & Pose) - Fourniture et pose d'une sortie de toit complète de marque Poujoulat avec solin d'étanchéité adapté à la tuile HP10",
    quantity: "1",
    unit: "unité",
  },
];

const PROFILE = tradeProfile("roofing");
const line = (ref: string) => DEVIS.find((l) => l.ref === ref)!;
const review = (ref: string) => {
  const l = line(ref);
  return validateTakeoffLine({ id: ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" }, PROFILE);
};

/**
 * CONTEXTE CHANTIER attendu de la lecture (ce que l'IA devra extraire, avec
 * ses preuves). Chaque fait est écrit dans le devis : rien n'est supposé.
 */
const CONTEXT: ChantierContext = {
  facts: [
    { key: "surface", value: "120", unit: "m2", evidence: "Devis, ligne 1", origin: "devis" },
    { key: "surface", value: "120", unit: "m2", evidence: "Devis, ligne 2", origin: "devis" },
    { key: "surface", value: "120", unit: "m2", evidence: "Devis, ligne 3", origin: "devis" },
    { key: "surface", value: "120", unit: "m2", evidence: "Devis, ligne 4", origin: "devis" },
    // Information trouvée dans la ligne de l'ÉCRAN, qui sert aux CONTRE-LATTES : raisonner sur le chantier.
    { key: "entraxe_supports", value: "90", unit: "cm", evidence: "Devis, ligne 1 (« fermettes d'entraxe 90 cm »)", origin: "devis" },
  ],
};

describe("cas de référence D-2026-015 : lecture des lignes", () => {
  it("nomme chaque ligne par son ouvrage, pas par un composant cité dans la description", () => {
    expect(DEVIS.map((l) => [l.ref, review(l.ref).kind, review(l.ref).family])).toEqual([
      ["ligne 1", "material", "underlay"],
      ["ligne 2", "material", "batten"],
      ["ligne 3", "material", "batten"],
      ["ligne 4", "material", "roof_tile"],
      ["ligne 5", "material", "roof_accessory"],
      // Faiblesse trouvée sur ce devis (corrigée) : « … avec closoir » classait la ligne en closoir.
      ["ligne 6", "material", "roof_accessory"],
      // Faiblesse trouvée (corrigée) : « … crochets et naissances compris » classait la gouttière en accessoire.
      ["ligne 7", "material", "gutter"],
      // Faiblesse trouvée (corrigée) : « … 2 jeux de coudes et les colliers » classait la descente en accessoire.
      ["ligne 8", "material", "downpipe"],
      ["ligne 9", "material", "roof_accessory"],
      // Faiblesse trouvée (corrigée) : « … avec solin d'étanchéité » classait la sortie de toit en zinguerie.
      ["ligne 10", "material", "roof_accessory"],
    ]);
  });

  it("distingue mesure d'ouvrage et quantité d'achat", () => {
    expect(DEVIS.map((l) => [l.ref, review(l.ref).basis])).toEqual([
      ["ligne 1", "work"], // 120 m² couverts ≠ 120 m² d'écran (recouvrements)
      ["ligne 2", "work"],
      ["ligne 3", "work"],
      ["ligne 4", "work"],
      ["ligne 5", "work"], // 24 m de rives ≠ nombre de tuiles de rive (faiblesse trouvée, corrigée)
      ["ligne 6", "work"], // 10 m de faîtage ≠ nombre de faîtières (faiblesse trouvée, corrigée)
      ["ligne 7", "purchase"], // la gouttière s'achète au mètre (barres) ; ses accessoires restent à calculer
      ["ligne 8", "purchase"], // FRONTIÈRE : « 2 ensembles » = 2 descentes complètes, pas 2 pièces
      ["ligne 9", "purchase"], // 10 chatières : une vraie quantité de pièces
      ["ligne 10", "purchase"], // 1 sortie de toit : une vraie quantité (modèle à préciser)
    ]);
  });

  it("ne prête jamais le produit d'une autre famille : « pour tuiles HP10 » ne fait pas d'un liteau une tuile", () => {
    const products = (ref: string) => identifyProducts(line(ref).designation, ROOFING_REFERENTIAL, review(ref).family ?? undefined).candidates.map((c) => c.product.id);
    expect(products("ligne 4")).toEqual(["edilians-hp10-huguenot"]);
    expect(products("ligne 3")).toEqual(["liteau-sapin-27x40"]);
    expect(products("ligne 2")).toEqual(["liteau-sapin-27x40"]);
    // « écran HPV respirant » : aucune marque, aucun rouleau précis.
    expect(products("ligne 1")).toEqual([]);
    // « chatières adaptées au modèle HP10 », « solin adapté à la tuile HP10 » : ce ne sont pas des tuiles HP10.
    expect(products("ligne 9")).toEqual([]);
    expect(products("ligne 10")).toEqual([]);
    // Sans le filtre par famille, la tuile serait proposée à tort : le filtre est obligatoire.
    expect(identifyProducts(line("ligne 9").designation, ROOFING_REFERENTIAL).candidates.map((c) => c.product.id)).toEqual(["edilians-hp10-huguenot"]);
  });
});

describe("cas de référence D-2026-015 : contexte chantier et questions", () => {
  const { params, conflicts } = paramsFromContext(CONTEXT, ROOFING_REFERENTIAL.workItems[0]!);
  const products: Record<string, SlotChoice> = {
    // « type HP10 » : modèle reconnu par son appellation, sans marque ni référence → à confirmer.
    tuile: { productId: "edilians-hp10-huguenot", origin: "alias" },
    liteau: { productId: "liteau-sapin-27x40", origin: "devis" },
    contre_liteau: { productId: "liteau-sapin-27x40", origin: "devis" },
  };
  const mentioned = ["ecran", "contre_liteau", "liteau", "tuile"];
  const run = (prods: Record<string, SlotChoice>, extra: Record<string, { value: string; unit: string }> = {}, preferences?: CompanyPreferences, acceptDraft = true) =>
    computeWorkItem(
      ROOFING_REFERENTIAL,
      {
        workItemId: "couverture-tuiles-emboitement",
        params: { ...params, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { ...v, origin: "artisan" as const }])) },
        products: prods,
        mentioned,
        ...(preferences ? { preferences } : {}),
      },
      { acceptDraft },
    );
  const byNeed = (needs: NeedResult[], id: string) => needs.find((n) => n.needId === id)!;

  it("réunit le contexte : surface concordante sur 4 lignes, entraxe lu sur la ligne de l'écran", () => {
    expect(conflicts).toEqual([]);
    expect(params.surface).toMatchObject({ value: "120", evidence: "Devis, ligne 1, Devis, ligne 2, Devis, ligne 3, Devis, ligne 4" });
    expect(params.entraxe_supports).toMatchObject({ value: "90", unit: "cm" });
    // Le devis ne donne ni pureau (« pureau adapté »), ni pente.
    expect(params.pureau).toBeUndefined();
    expect(params.pente).toBeUndefined();
  });

  it("aujourd'hui pour un artisan : aucune quantité (règles de calcul en attente de validation)", () => {
    const r = run(products, {}, undefined, false);
    for (const n of r.needs) expect(n.quantity ?? n.quantityRange).toBeUndefined();
  });

  it("règles validées : 2 questions seulement (modèle, pureau), +1 au tout premier chantier (écran)", () => {
    let r = run(products);
    expect(r.nextQuestion).toMatchObject({ kind: "confirm_product", text: "J'ai identifié : Tuiles HP10. C'est bien ce modèle ?" });
    const confirmed = { ...products, tuile: { productId: "edilians-hp10-huguenot", origin: "artisan" } as SlotChoice };

    r = run(confirmed);
    expect(r.nextQuestion).toMatchObject({ key: "param:pureau", impact: "De 1 191 à 1 445 pièces selon la réponse." });
    // L'entraxe des contre-lattes n'est PAS demandé : il est sur la ligne de l'écran (90 cm).
    expect(byNeed(r.needs, "contre-liteaux")).toMatchObject({ status: "calculated", quantity: { value: "133.33", unit: "ml" }, purchase: { order: { count: "34" } } });

    r = run(confirmed, { pureau: { value: "34.3", unit: "cm" } });
    expect(r.nextQuestion).toMatchObject({ kind: "choose_product", key: "product:ecran" });

    // Dès le deuxième chantier, l'écran habituel de l'entreprise répond.
    r = run(confirmed, { pureau: { value: "34.3", unit: "cm" } }, { products: { ecran: "soprema-sop-ecran-hpv-r2-150x50" } });
    expect(r.nextQuestion).toBeNull();
    expect(r.needs.map((n) => [n.needId, n.quantity?.value ?? `${n.quantityRange?.min}–${n.quantityRange?.max}`, n.purchase?.order.count, n.purchase?.order.unit.many])).toEqual([
      ["tuiles", "1305.43", "1306", "pièces"],
      ["liteaux", "349.85", "88", "longueurs de 4 m"],
      ["contre-liteaux", "133.33", "34", "longueurs de 4 m"],
      // La pente n'est jamais demandée : 2 rouleaux quelle qu'elle soit.
      ["ecran", "128.57–138.46", "2", "rouleaux"],
    ]);
    expect(byNeed(r.needs, "contre-liteaux").trace).toContainEqual(
      expect.objectContaining({ label: "Entraxe des chevrons ou fermettes", value: "90", from: "Devis, ligne 1 (« fermettes d'entraxe 90 cm »)" }),
    );
  });
});
