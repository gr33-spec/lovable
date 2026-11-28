import { describe, expect, it } from "vitest";
import { computeWorkItem, ROOFING_REFERENTIAL as ref, type WorkItemInput } from "../src/index.js";

/**
 * L'ABERGEMENT DE CHEMINÉE EST DU SUR-MESURE (Greg, 23 novembre 2026) : « un devant, un derrière, et des noquets sur les
 * côtés. Si le devis ne donne pas la taille de la cheminée, ne calcule pas : demande combien de feuilles. Si le devis donne
 * la taille, calcule devant + derrière + noquets, montre le calcul sous la flèche, et laisse la quantité modifiable. »
 * Les cotes (retours, développés) sont déduites des minimums des règles de l'art (aucune source ne chiffre la consommation) :
 * la ligne reste « à vérifier » tant que Greg ne les a pas validées.
 */
const base = (params: WorkItemInput["params"]): WorkItemInput => ({
  workItemId: "abergement-cheminee",
  params: { nb_cheminees: { value: "1", unit: "u", origin: "devis" }, faconnage: { value: "1", unit: "u", origin: "artisan" }, aspect_zinc: { value: "1", unit: "u", origin: "artisan" }, ...params },
  products: {},
  mentioned: ["abergement"],
});
const feuilles = (r: ReturnType<typeof computeWorkItem>) => r.needs.find((n) => n.needId === "feuilles-abergement")!;

describe("l'abergement de cheminée", () => {
  it("sans la taille de la souche : pas de calcul, la question « combien de feuilles ? » (1, 2, 3, 4)", () => {
    const r = computeWorkItem(ref, base({}));
    const n = feuilles(r);
    expect(n.status).not.toBe("calculated");
    expect(n.question?.text).toBe("Pour l'entourage de ta cheminée, combien de feuilles de zinc te faut-il ?");
    expect(n.question?.options?.map((o) => o.label)).toEqual(["1", "2", "3", "4"]);
  });

  it("souche de 0,90 × 0,60 m : devant + derrière + côtés, le détail sous la flèche, à vérifier", () => {
    const r = computeWorkItem(ref, base({ largeur_cheminee: { value: "0.9", unit: "m", origin: "devis" }, profondeur_cheminee: { value: "0.6", unit: "m", origin: "devis" } }));
    const n = feuilles(r);
    expect(n.status).toBe("calculated");
    // Devant 0,90 + 2 × 0,11 = 1,12 m : une bande de 2 m de 30 cm, 3 par feuille (0,33) ; derrière 0,90 + 2 × 0,135 = 1,17 m :
    // une bande de 50 cm, 2 par feuille (0,5) ; côtés 2 × (0,60 + 0,20) : deux bandes de 25 cm, 4 par feuille (0,5). 1,33 → 2.
    expect(Number(n.partage)).toBeCloseTo(1.3333, 3);
    expect(n.postes?.map((x) => x.texte)).toEqual([
      "Devant : 0,9 m + 2 retours de 11 cm, bande de 30 cm",
      "Derrière : 0,9 m + 2 retours de 13,5 cm, bande de 50 cm",
      "Côtés : 2 × (0,6 m + 20 cm), bandes de 25 cm",
    ]);
    expect((n.toConfirm ?? []).length).toBeGreaterThan(0);
  });
});
