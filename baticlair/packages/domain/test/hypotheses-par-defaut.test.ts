import { describe, expect, it } from "vitest";
import { checkReferential, computeWorkItem, ROOFING_REFERENTIAL, type Referential, type WorkItemInput } from "../src/index.js";
import { sansHypotheses } from "./support/sans-hypotheses.js";

/**
 * LA RÈGLE PRODUIT (2026-10-03) : l'artisan dépose son devis, BatiClair sort la
 * liste d'achats. Une donnée que le devis ne dit pas prend l'hypothèse par
 * défaut du référentiel du fondateur, DITE et modifiable ; une question n'est
 * posée que si rien ne permet de calculer et que la réponse change la commande.
 */
const need = (r: ReturnType<typeof computeWorkItem>, id: string) => r.needs.find((n) => n.needId === id)!;
const ARDOISE: WorkItemInput = {
  workItemId: "couverture-ardoises-crochet",
  params: { surface: { value: "200", unit: "m2", origin: "devis", evidence: "Devis, ligne 2" } },
  products: { ardoise: { productId: "ardoise-30x22", origin: "devis" } },
  mentioned: ["ardoise", "liteau"],
};

describe("hypothèses par défaut : utilisées sans question, dites, modifiables", () => {
  it("pente 45°, zone littorale, rampant ≤ 5,5 m, entraxe 60 cm : le devis ne dit rien, tout se calcule quand même", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, ARDOISE);
    expect(r.nextQuestion).toBeNull();
    for (const n of r.needs) expect(n.status).toBe("calculated");
    // Chaque hypothèse est tracée comme telle, jamais confondue avec une donnée lue ou répondue.
    const ardoises = need(r, "ardoises");
    expect(ardoises.trace.filter((t) => t.origin === "assumption").map((t) => [t.label, t.value, t.unit])).toEqual([
      ["Pente du toit", "45", "°"],
      // Pour l'ardoise, la région ardoise (DTU 40.11), pas la zone climatique des tuiles.
      ["Région ardoise", "3", "u"],
      ["Longueur du rampant", "5,5", "m"],
      ["Pureau", "10,25", "cm"],
      // Formule Cupa (§34) : crochet courant 1 mm sans département littoral connu.
      ["Diamètre du crochet", "1", "mm"],
    ]);
    expect(ardoises.trace.find((t) => t.label === "Région ardoise")).toMatchObject({ value: "3", shown: "III" });
    expect(ardoises.assumptions.map((a) => a.key)).toEqual(["param:pente", "param:zone", "param:longueur_rampant", "derived:recouvrement", "param:pureau", "param:diametre_crochet"]);
    // Les hypothèses à boutons gardent leurs réponses proposées (l'artisan ne tape rien).
    expect(ardoises.assumptions.find((a) => a.key === "param:pente")?.choices?.map((c) => c.label)).toEqual(["30°", "35°", "45°"]);
    expect(need(r, "contre-liteaux-ardoise").assumptions.map((a) => a.key)).toEqual(["product:contre_liteau", "param:entraxe_supports"]);
  });

  it("une réponse de l'artisan remplace l'hypothèse, et seulement elle", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, { ...ARDOISE, params: { ...ARDOISE.params, pente: { value: "100", unit: "%", origin: "artisan" }, zone: { value: "1", unit: "u", origin: "artisan" } } });
    const ardoises = need(r, "ardoises");
    // Pente 100 % (une ancienne réponse en %) = 45°, zone 1 : recouvrement 80 mm, dans la table Cupa : 40,7/m² × 200 = 8 140 + 5 %.
    expect(ardoises.quantity).toEqual({ value: "8547", unit: "u" });
    expect(ardoises.assumptions.map((a) => a.key)).toEqual(["param:longueur_rampant", "derived:recouvrement", "param:pureau", "param:diametre_crochet"]);
    expect(ardoises.trace.find((t) => t.label === "Pente du toit")).toMatchObject({ origin: "project", value: "45", unit: "°" });
  });

  it("table de recouvrement : la cellule des plus grands seuils atteints ; sous la pente minimale, rien n'est deviné", () => {
    const at = (pente: string, zone: string) => need(computeWorkItem(ROOFING_REFERENTIAL, { ...ARDOISE, params: { ...ARDOISE.params, pente: { value: pente, unit: "°", origin: "artisan" }, zone: { value: zone, unit: "u", origin: "artisan" } } }), "ardoises");
    const recouvrement = (pente: string, zone: string) => at(pente, zone).trace.find((t) => t.label === "Recouvrement")!.value;
    expect([recouvrement("25", "1"), recouvrement("26", "1"), recouvrement("29.9", "1"), recouvrement("30", "1"), recouvrement("80", "3")]).toEqual(["110", "110", "110", "100", "90"]);
    // Rampant de 6 m (45°, zone 3 : 95 mm) : +10 mm, arrondi aux 5 mm supérieurs.
    const long = need(computeWorkItem(ROOFING_REFERENTIAL, { ...ARDOISE, params: { ...ARDOISE.params, longueur_rampant: { value: "6", unit: "m", origin: "artisan" } } }), "ardoises");
    expect(long.trace.find((t) => t.label === "Recouvrement")!.value).toBe("105");
    // Pente 20° (et 5°) : sous le premier seuil, l'ouvrage n'est pas calculé, et la raison est dite.
    expect(at("20", "3")).toMatchObject({ status: "unknown", reason: "Pente du toit trop faible pour cet ouvrage (minimum 25 °)." });
    expect(at("5", "1")).toMatchObject({ status: "unknown" });
  });

  it("produit par défaut (liteaux 18×40, crochets, écran) : dit comme hypothèse ; « aucun de ces modèles » → le générique compte, « modèle à préciser »", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, ARDOISE);
    expect(need(r, "liteaux-ardoise")).toMatchObject({ label: "Liteaux 18×40", productOrigin: "default" });
    expect(need(r, "liteaux-ardoise").assumptions).toContainEqual(expect.objectContaining({ key: "product:liteau", value: "Liteaux 18×40" }));
    const declined = computeWorkItem(ROOFING_REFERENTIAL, { ...ARDOISE, declined: ["ecran"] });
    // Écran refusé : le moteur calcule quand même avec le générique (le fournisseur met sa marque), sans re-poser l'hypothèse.
    expect(need(declined, "ecran-ardoise")).toMatchObject({ status: "calculated", productOrigin: "declined", label: "Écran HPV (modèle à préciser)" });
    expect(need(declined, "ecran-ardoise").assumptions.some((a) => a.key === "product:ecran")).toBe(false);
  });

  it("un besoin qui exige une donnée absente (tuiles de rive sans longueur de rives) n'existe pas : ni chiffre, ni question", () => {
    const tuiles: WorkItemInput = {
      workItemId: "couverture-tuiles-emboitement",
      params: { surface: { value: "120", unit: "m2", origin: "devis" } },
      products: { tuile: { productId: "edilians-hp10-huguenot", origin: "artisan" } },
      mentioned: ["tuile"],
    };
    expect(computeWorkItem(ROOFING_REFERENTIAL, tuiles).needs.map((n) => n.needId)).toEqual(["tuiles", "liteaux", "contre-liteaux", "ecran"]);
    const withRives = computeWorkItem(ROOFING_REFERENTIAL, { ...tuiles, params: { ...tuiles.params, longueur_rives: { value: "24", unit: "m", origin: "devis" } } });
    // 24 m / 0,31 m (pureau mini, zone littorale par défaut) = 77,42 tuiles de rive → 78.
    expect(need(withRives, "tuiles-de-rive")).toMatchObject({ status: "calculated", purchase: { order: { count: "78" } } });
  });

  it("pertes du référentiel du fondateur : ardoise 5 %, crochets 2 %, tuile 3 %, liteaux 5 %, dites dans le calcul", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, { ...ARDOISE, params: { ...ARDOISE.params, pureau: { value: "10", unit: "cm", origin: "artisan" } } });
    // Pureau 100 mm sur 30×22 = recouvrement 100 mm : la table Cupa fait foi (44,8/m²) → 8 960 ardoises.
    expect(need(r, "ardoises").trace.find((t) => t.label === "Besoin calculé")!.value).toBe("8 960");
    expect(need(r, "ardoises")).toMatchObject({ quantity: { value: "9408" }, purchase: { order: { count: "9408" } } });
    expect(need(r, "ardoises").trace.find((t) => t.label === "Marge recommandée")).toMatchObject({ value: "5", unit: "%" });
    // Crochets = ardoises commandées (9 408) × 1,02 = 9 596,16.
    expect(need(r, "crochets-ardoise")).toMatchObject({ quantity: { value: "9596.16" }, purchase: { order: { count: "9597" } } });
    expect(need(r, "liteaux-ardoise")).toMatchObject({ quantity: { value: "2100" } });
  });

  it("sans ces hypothèses, le moteur redemande : la règle produit tient aux données, pas à un contournement", () => {
    const bare = sansHypotheses(ROOFING_REFERENTIAL);
    const r = computeWorkItem(bare, ARDOISE);
    expect(need(r, "ardoises").status).toBe("question");
    expect(r.nextQuestion?.key).toBe("param:pureau");
  });

  it("le contrôle d'intégrité refuse une hypothèse ou une table mal formée", () => {
    const broken: Referential = structuredClone(ROOFING_REFERENTIAL);
    const ardoise = broken.workItems.find((w) => w.id === "couverture-ardoises-crochet")!;
    ardoise.params.find((p) => p.key === "pente")!.default = { value: "45", formula: "1", source: "fondateur-referentiel-2026-10-03", verification: { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "test" }, version: 1 };
    ardoise.tables!.recouvrement!.values[0] = ["110", "120"];
    const errors = checkReferential(broken);
    expect(errors.some((e) => e.includes("pente (hypothèse)") && e.includes("une valeur OU une formule"))).toBe(true);
    expect(errors.some((e) => e.includes("table recouvrement") && e.includes("lignes de 3 valeurs"))).toBe(true);
  });
});
