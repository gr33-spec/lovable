import { describe, expect, it } from "vitest";
import {
  computeChantier,
  computeWorkItem,
  identifyProducts,
  paramsFromContext,
  purchaseList,
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
  const run = (prods: Record<string, SlotChoice>, extra: Record<string, { value: string; unit: string }> = {}, preferences?: CompanyPreferences, acceptDraft = false) =>
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

  it("pour un artisan, avant toute réponse : seul ce que le devis permet est calculé (contre-liteaux), rien de provisoire", () => {
    const r = run(products);
    // Entraxe lu sur la ligne de l'écran (90 cm) : 120 / 0,9 = 133,33 ml, sans rien demander.
    expect(byNeed(r.needs, "contre-liteaux")).toMatchObject({ status: "calculated", provisional: false, quantity: { value: "133.33", unit: "ml" } });
    // Pureau non écrit (« pureau adapté ») : tuiles et liteaux attendent la réponse, aucun chiffre deviné.
    for (const id of ["tuiles", "liteaux"]) expect(byNeed(r.needs, id).quantity ?? byNeed(r.needs, id).quantityRange).toBeUndefined();
  });

  it("règles validées : 2 questions seulement (modèle, pureau), +1 au tout premier chantier (écran)", () => {
    let r = run(products);
    expect(r.nextQuestion).toMatchObject({ kind: "confirm_product", text: "J'ai identifié : Tuiles HP10. C'est bien ce modèle ?" });
    const confirmed = { ...products, tuile: { productId: "edilians-hp10-huguenot", origin: "artisan" } as SlotChoice };

    r = run(confirmed);
    expect(r.nextQuestion).toMatchObject({ key: "param:pureau", impact: "De 1 191 à 1 445 pièces selon la réponse." });
    // L'entraxe des contre-lattes n'est PAS demandé : il est sur la ligne de l'écran (90 cm).
    expect(byNeed(r.needs, "contre-liteaux")).toMatchObject({ status: "calculated", quantity: { value: "133.33", unit: "ml" } });
    // Aucun conditionnement de liteau saisi (dépend du négoce) : les ml sont certains, la conversion attend.
    expect(byNeed(r.needs, "contre-liteaux").purchaseUnavailable).toMatch(/Conditionnement à confirmer/);

    r = run(confirmed, { pureau: { value: "34.3", unit: "cm" } });
    expect(r.nextQuestion).toMatchObject({ kind: "choose_product", key: "product:ecran" });

    // Dès le deuxième chantier, l'écran habituel de l'entreprise répond.
    r = run(confirmed, { pureau: { value: "34.3", unit: "cm" } }, { products: { ecran: "soprema-sop-ecran-hpv-r2-150x50" } });
    expect(r.nextQuestion).toBeNull();
    expect(r.needs.map((n) => [n.needId, n.quantity?.value ?? `${n.quantityRange?.min}–${n.quantityRange?.max}`, n.purchase?.order.count, n.purchase?.order.unit.many])).toEqual([
      ["tuiles", "1305.43", "1306", "pièces"],
      ["liteaux", "349.85", undefined, undefined],
      ["contre-liteaux", "133.33", undefined, undefined],
      // La pente n'est jamais demandée : 2 rouleaux quelle qu'elle soit.
      ["ecran", "128.57–138.46", "2", "rouleaux"],
    ]);
    expect(byNeed(r.needs, "contre-liteaux").trace).toContainEqual(
      expect.objectContaining({ label: "Entraxe des chevrons ou fermettes", value: "90", from: "Devis, ligne 1 (« fermettes d'entraxe 90 cm »)" }),
    );
  });
});

describe("cas de référence D-2026-015 : chantier complet avec ouvrages composés", () => {
  // Faits relevés dans le devis (ce que l'extraction devra trouver, avec ses preuves).
  const facts: ChantierContext["facts"] = [
    ...CONTEXT.facts,
    { key: "longueur_faitage", value: "10", unit: "m", evidence: "Devis, ligne 6", origin: "devis" },
    { key: "longueur_gouttiere", value: "20", unit: "m", evidence: "Devis, ligne 7 (2 × 10 m)", origin: "devis" },
    { key: "nb_descentes", value: "2", unit: "u", evidence: "Devis, ligne 8 (2 ensembles)", origin: "devis" },
    { key: "hauteur_descente", value: "4", unit: "m", evidence: "Devis, ligne 8", origin: "devis" },
    // « 2 jeux de coudes » n'est PAS un nombre de coudes : aucun fait « coudes_par_descente ».
  ];
  const work = (id: string) => ROOFING_REFERENTIAL.workItems.find((w) => w.id === id)!;
  const p = (id: string) => paramsFromContext({ facts }, work(id)).params;
  type Answers = { tuileOk?: boolean; pureau?: string; faitiere?: string; ecran?: string };
  const inputs = (a: Answers = {}) => [
    {
      workItemId: "couverture-tuiles-emboitement",
      params: { ...p("couverture-tuiles-emboitement"), ...(a.pureau ? { pureau: { value: a.pureau, unit: "cm", origin: "artisan" as const } } : {}) },
      products: {
        tuile: { productId: "edilians-hp10-huguenot", origin: a.tuileOk ? ("artisan" as const) : ("alias" as const) },
        liteau: { productId: "liteau-sapin-27x40", origin: "devis" as const },
        contre_liteau: { productId: "liteau-sapin-27x40", origin: "devis" as const },
      },
      mentioned: ["ecran", "contre_liteau", "liteau", "tuile"],
      ...(a.ecran ? { preferences: { products: { ecran: a.ecran } } } : {}),
    },
    {
      workItemId: "faitage",
      params: p("faitage"),
      products: a.faitiere ? { faitiere: { productId: a.faitiere, origin: "artisan" as const } } : {},
      mentioned: ["faitiere", "closoir", "fixation_faitiere"],
    },
    { workItemId: "gouttiere", params: p("gouttiere"), products: {}, mentioned: ["profil", "crochet", "naissance"] },
    { workItemId: "descente", params: p("descente"), products: {}, mentioned: ["tube", "coude", "collier"] },
  ];
  const all = (r: ReturnType<typeof computeChantier>) => r.workItems.flatMap((w) => w.needs);
  const need = (r: ReturnType<typeof computeChantier>, id: string) => all(r).find((n) => n.needId === id)!;

  it("« faîtières ventilées » ne désigne pas la faîtière angulaire 710 : jamais d'identification sans preuve", () => {
    expect(identifyProducts(line("ligne 6").designation, ROOFING_REFERENTIAL, "ridge_tile").candidates).toEqual([]);
  });

  it("quatre questions seulement, chacune pour un calcul que BatiClair sait terminer", () => {
    const r = computeChantier(ROOFING_REFERENTIAL, inputs());
    // Modèle de tuile, pureau, écran, faîtière : rien d'autre (crochets, coudes, colliers n'ont pas de règle : aucune question inutile).
    expect(r.questionsPending).toEqual(["product:tuile", "param:pureau", "product:ecran", "product:faitiere"]);
    // Si l'artisan confirme le modèle 710 : 10 m × 3 pièces/ml (Edilians, vérifié) = 30 faîtières, calcul certain.
    const answered = computeChantier(ROOFING_REFERENTIAL, inputs({ faitiere: "edilians-faitiere-angulaire-710" }));
    expect(need(answered, "faitieres")).toMatchObject({ status: "calculated", quantity: { value: "30" }, purchase: { order: { count: "30" } }, provisional: false });
    expect(answered.questionsPending).toEqual(["product:tuile", "param:pureau", "product:ecran"]);
  });

  it("règles validées : ce qui se calcule, ce qui reste à confirmer, ce qui est impossible", () => {
    const r = computeChantier(
      ROOFING_REFERENTIAL,
      inputs({ tuileOk: true, pureau: "34.3", faitiere: "edilians-faitiere-angulaire-710", ecran: "soprema-sop-ecran-hpv-r2-150x50" }),
    );
    // Calculé pour l'artisan lui-même : aucun besoin provisoire.
    expect(all(r).filter((n) => n.provisional)).toEqual([]);
    const row = (id: string) => {
      const n = need(r, id);
      return [n.status, n.quantity?.value ?? (n.quantityRange ? `${n.quantityRange.min}–${n.quantityRange.max}` : null), n.purchase?.order.count ?? null];
    };
    expect(row("tuiles")).toEqual(["calculated", "1305.43", "1306"]);
    expect(row("liteaux")).toEqual(["calculated", "349.85", null]);
    expect(row("contre-liteaux")).toEqual(["calculated", "133.33", null]);
    expect(row("ecran")).toEqual(["calculated", "128.57–138.46", "2"]);
    expect(row("faitieres")).toEqual(["calculated", "30", "30"]);
    // Besoin certain d'après le devis, produit pas encore identifié : la conversion attend.
    for (const [id, qty] of [["closoir", "10"], ["profil", "20"], ["naissances", "2"], ["tubes", "8"]] as const) {
      expect(row(id)).toEqual(["calculated", qty, null]);
      expect(need(r, id).purchaseUnavailable).toMatch(/Produit à identifier/);
    }
    // Crochets de gouttière, coudes, colliers : aucune règle validée → « à préciser », sans chiffre ni question.
    for (const id of ["crochets", "coudes", "colliers"]) expect(need(r, id)).toMatchObject({ status: "unknown", reason: "Règle de calcul en attente de vérification." });
    expect(r.questionsPending).toEqual([]);
    // Écran du validateur (brouillon accepté) : impossible sans la fiche du système, et « 2 jeux de coudes » reste ambigu.
    const v = computeChantier(
      ROOFING_REFERENTIAL,
      inputs({ tuileOk: true, pureau: "34.3", faitiere: "edilians-faitiere-angulaire-710", ecran: "soprema-sop-ecran-hpv-r2-150x50" }),
      { acceptDraft: true },
    );
    expect(need(v, "crochets")).toMatchObject({ status: "unknown", reason: "Calcul impossible sans les données du produit (Crochets)." });
    expect(need(v, "colliers")).toMatchObject({ status: "unknown", reason: "Calcul impossible sans les données du produit (Colliers)." });
    expect(v.questionsPending).toEqual(["param:coudes_par_descente"]);
  });
});

describe("cas de référence D-2026-015 : la liste d'achat vue par l'artisan", () => {
  it("trois états seulement, quantité à commander d'abord, une seule précision, coloris conservés", () => {
    const facts: ChantierContext["facts"] = [
      ...CONTEXT.facts,
      { key: "longueur_faitage", value: "10", unit: "m", evidence: "Devis, ligne 6", origin: "devis" },
      { key: "nb_descentes", value: "2", unit: "u", evidence: "Devis, ligne 8", origin: "devis" },
      { key: "hauteur_descente", value: "4", unit: "m", evidence: "Devis, ligne 8", origin: "devis" },
    ];
    const params = (id: string) => paramsFromContext({ facts }, ROOFING_REFERENTIAL.workItems.find((w) => w.id === id)!).params;
    const r = computeChantier(
      ROOFING_REFERENTIAL,
      [
        {
          workItemId: "couverture-tuiles-emboitement",
          params: { ...params("couverture-tuiles-emboitement"), pureau: { value: "34.3", unit: "cm", origin: "artisan" } },
          products: {
            tuile: { productId: "edilians-hp10-huguenot", origin: "artisan" },
            liteau: { productId: "liteau-sapin-27x40", origin: "devis" },
            contre_liteau: { productId: "liteau-sapin-27x40", origin: "devis" },
          },
          mentioned: ["ecran", "contre_liteau", "liteau", "tuile"],
          preferences: { products: { ecran: "soprema-sop-ecran-hpv-r2-150x50" } },
        },
        { workItemId: "faitage", params: params("faitage"), products: {}, mentioned: ["faitiere", "closoir"] },
        { workItemId: "descente", params: params("descente"), products: {}, mentioned: ["tube", "coude", "collier"] },
      ],
      { acceptDraft: true },
    );
    const rows = purchaseList(r.workItems, { tuile: ["rouge"], tube: ["PVC", "Ø80", "sable"] });
    const view = (id: string) => {
      const x = rows.find((row) => row.needId === id)!;
      return [x.label, x.state, x.quantity ?? null, x.detail ?? null];
    };
    expect(view("tuiles")).toEqual(["Tuiles HP10 rouge", "ready", "1 306 pièces", "≈ 6 palettes"]);
    // Conditionnement de liteau non saisi (dépend du négoce) : les ml, et ce qui reste à confirmer.
    expect(view("liteaux")).toEqual(["Liteaux 27×40", "ready", "349,85 ml", "conditionnement à confirmer"]);
    expect(view("ecran")).toEqual(["Écran HPV", "ready", "2 rouleaux", "donnée inconnue sans effet sur la commande"]);
    // Besoin certain, produit pas encore identifié : la quantité est dite, la conversion reste à confirmer.
    expect(view("tubes")).toEqual(["Tubes de descente PVC Ø80 sable", "ready", "8 ml", "conditionnement à confirmer"]);
    // Il manque le modèle de faîtière : une question, pas de chiffre.
    expect(view("faitieres")).toEqual(["Faîtières", "question", null, null]);
    // Impossible sans la fiche du fabricant : BatiClair le dit, en une phrase.
    expect(view("colliers")).toEqual(["Colliers", "unknown", null, "Calcul impossible sans les données du produit (Colliers)."]);
  });
});
