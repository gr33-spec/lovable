import { describe, expect, it } from "vitest";
import { computeWorkItem, ROOFING_REFERENTIAL, type ParamValue } from "../src/index.js";

/**
 * Audit du référentiel (fondateur, 2026-10-10, « un tableau règle / section / test ») : les dix règles qu'aucun test ne
 * citait ont chacune le leur. §25 (sortie de toit), §25.3 et §25.7 (étain, décapant), §25.5 (vis des bandes), §25.6
 * (mastic du porte-solin).
 */
const v = (value: string, unit: string): ParamValue => ({ value, unit, origin: "devis", evidence: "Devis, ligne 1" });
const run = (workItemId: string, params: Record<string, ParamValue>, mentioned: string[]) =>
  computeWorkItem(ROOFING_REFERENTIAL, { workItemId, params, products: {}, mentioned });
const qty = (r: ReturnType<typeof run>, id: string) => {
  const n = r.needs.find((x) => x.needId === id);
  return n ? `${n.status} ${n.quantity?.value ?? ""} ${n.quantity?.unit ?? ""}`.trim() : "absent";
};

describe("audit : chaque règle de calcul a son test", () => {
  it("sortie de toit (§25) : embase ou platine selon le support, chapeau, collerette au-delà de la VMC (`vmc`)", () => {
    const base = { nb_sorties: v("2", "u"), diametre_sortie: v("150", "mm"), usage_sortie: v("1", "u") };
    const tuiles = run("sortie-de-toit", { ...base, support_sortie: v("1", "u") }, ["embase", "chapeau", "collerette"]);
    expect(qty(tuiles, "embase-sortie")).toBe("calculated 2 u");
    expect(qty(tuiles, "platine-sortie")).toBe("absent");
    expect(qty(tuiles, "chapeau-sortie")).toBe("calculated 2 u");
    expect(qty(tuiles, "collerette-sortie")).toBe("calculated 2 u");
    const bac = run("sortie-de-toit", { ...base, support_sortie: v("2", "u"), usage_sortie: v("2", "u") }, ["platine", "chapeau", "collerette"]);
    expect(qty(bac, "platine-sortie")).toBe("calculated 2 u");
    expect(qty(bac, "embase-sortie")).toBe("absent");
    expect(qty(bac, "collerette-sortie")).toBe("absent");
  });

  it("gouttière zinc (§25.3, §25.7) : étain (`etain_par_jonction`) et décapant (`flacons_decapant`) restent à valider : jamais un chiffre sûr", () => {
    const r = run("gouttiere", { longueur_gouttiere: v("12", "m"), nb_descentes: v("2", "u") }, ["etain", "decapant"]);
    // §25.7 : « ≈ 15 g d'étain par jonction », « 1 flacon pour ≈ 40 ml de soudure », à valider par un couvreur : la ligne
    // sort sans quantité, avec la raison, tant que le chiffre est en brouillon.
    for (const id of ["etain-gouttiere", "decapant-gouttiere"]) {
      const n = r.needs.find((x) => x.needId === id)!;
      expect(n.status, id).toBe("unknown");
      expect(n.reason, id).toMatch(/en attente de vérification/);
    }
  });

  it("bandes zinc (§25.5) : vis 4/ml (`vis_par_ml`) ; porte-solin (§25.6) : mastic au ml (`mastic-porte-solin`)", () => {
    expect(qty(run("bandes-zinc", { longueur_bande: v("10", "m") }, ["vis"]), "vis-bandes")).toBe("calculated 40 u");
    expect(qty(run("bande-porte-solin", { longueur_bande: v("10", "m") }, ["porte_solin", "mastic"]), "mastic-porte-solin")).toBe("calculated 10 ml");
  });
});
