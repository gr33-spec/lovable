import { describe, expect, it } from "vitest";
import { computeWorkItem, ROOFING_REFERENTIAL, type WorkItemInput } from "../src/index.js";
import { REAL_QUOTES } from "./devis-reels/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * « LE FOURNISSEUR CHIFFRERA » EST LE DERNIER RECOURS : le moteur tente d'abord. Trois cas du banc qui y
 * tombaient :
 *  - un modèle refusé (« aucun de ces modèles ») → le générique compte quand même, « modèle à préciser » ;
 *  - une bande zinc au ml → développé, façonnage, puis bandes de 2 m ou kg de bobine (§7, §36.4) ;
 *  - un entourage de cheminée compté → périmètre × 1,3 en zinc dév. 33 cm + porte-solin (§7).
 */
const need = (r: ReturnType<typeof computeWorkItem>, id: string) => r.needs.find((n) => n.needId === id)!;
const order = (r: ReturnType<typeof computeWorkItem>, id: string) => Number(need(r, id).purchase?.order.count);

describe("modèle refusé : le générique compte, le fournisseur met sa marque", () => {
  it("D-2026-015 : faîtières ventilées refusées → 29 faîtières (modèle à préciser) et 29 crochets, plus rien à chiffrer", () => {
    const c = REAL_QUOTES.find((q) => q.id === "D-2026-015")!;
    const v = readQuote(c.lines, c.answers);
    expect(v.toQuote).toEqual([]);
    const faitieres = v.toBuy.find((b) => b.needIds.includes("faitieres"))!;
    expect(faitieres.label).toMatch(/^Faîtières \(modèle à préciser\)/);
    expect(faitieres.quantity).toBe("29 pièces");
    expect(v.toBuy.find((b) => b.needIds.includes("crochets-faitiere"))?.quantity).toBe("29 pièces");
    // L'hypothèse « modèle » n'est pas re-posée : l'artisan a déjà répondu.
    expect(v.assumptions.some((a) => a.key === "product:faitiere")).toBe(false);
  });
});

describe("bandes zinc au ml (§36.4) : jamais « ml de zinc » nu", () => {
  const input = (params: Record<string, string>): WorkItemInput => ({
    workItemId: "bandes-zinc",
    params: Object.fromEntries(Object.entries({ longueur_bande: "20", ...params }).map(([k, v]) => [k, { value: v, unit: k === "developpe" ? "mm" : k === "epaisseur_zinc" ? "mm" : k === "longueur_bande" ? "m" : "u", origin: "artisan" as const, evidence: "test" }])),
    products: {},
    mentioned: ["bande"],
  });

  it("façonné : 20 ml × 1,1 = 22 m → 12 bandes de 2 m (longueur utile 1,9 m)", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, input({ faconnage: "2" }));
    expect(order(r, "bandes-faconnees")).toBe(12);
    expect(r.needs.find((n) => n.needId === "bobine-bandes")).toBeUndefined();
  });

  it("je façonne : 22 m × 0,25 m × 4,7 kg/m² = 25,85 kg en 0,65 ; 5,76 kg/m² en 0,80", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, input({ faconnage: "1", developpe: "250" }));
    expect(need(r, "bobine-bandes").quantity?.value).toBe("25.85");
    const thick = computeWorkItem(ROOFING_REFERENTIAL, input({ faconnage: "1", developpe: "250", epaisseur_zinc: "0.8" }));
    expect(need(thick, "bobine-bandes").quantity?.value).toBe("31.68");
  });

  it("sans façonnage connu : une question, pas « à chiffrer » ; le développé n'est demandé que pour la bobine", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, input({}));
    expect(r.needs.map((n) => n.status)).toEqual(["question", "question"]);
    expect(need(r, "bandes-faconnees").question?.key).toBe("param:faconnage");
    const bobine = computeWorkItem(ROOFING_REFERENTIAL, input({ faconnage: "1" }));
    expect(need(bobine, "bobine-bandes").question?.key).toBe("param:developpe");
  });
});

describe("abergement de cheminée (§7) : un ouvrage compté devient des bandes ou des kg", () => {
  it("2 cheminées de 3 m : 7,8 m de zinc façonné → 5 bandes de 2 m dév. 33 cm ; 6 m de porte-solin → 4 bandes", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, {
      workItemId: "abergement-cheminee",
      params: {
        nb_cheminees: { value: "2", unit: "u", origin: "devis", evidence: "Devis" },
        perimetre_cheminee: { value: "3", unit: "m", origin: "artisan", evidence: "Réponse" },
        faconnage: { value: "2", unit: "u", origin: "artisan", evidence: "Réponse" },
      },
      products: {},
      mentioned: ["abergement"],
    });
    expect(order(r, "bandes-abergement")).toBe(5);
    expect(order(r, "porte-solin-abergement")).toBe(4);
    const bobine = computeWorkItem(ROOFING_REFERENTIAL, {
      workItemId: "abergement-cheminee",
      params: {
        nb_cheminees: { value: "2", unit: "u", origin: "devis", evidence: "Devis" },
        perimetre_cheminee: { value: "3", unit: "m", origin: "artisan", evidence: "Réponse" },
        faconnage: { value: "1", unit: "u", origin: "artisan", evidence: "Réponse" },
      },
      products: {},
      mentioned: ["abergement"],
    });
    // 7,8 m × 0,33 m × 4,7 kg/m² = 12,10 kg.
    expect(need(bobine, "bobine-abergement").quantity?.value).toBe("12.1");
  });
});
