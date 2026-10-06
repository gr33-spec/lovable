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
    // Commandée façonnée, la bande se fabrique à son développé : sans lui, une question (jamais deviné).
    expect(need(computeWorkItem(ROOFING_REFERENTIAL, input({ faconnage: "2" })), "bandes-faconnees").question?.key).toBe("param:developpe");
    const r = computeWorkItem(ROOFING_REFERENTIAL, input({ faconnage: "2", developpe: "330" }));
    expect(order(r, "bandes-faconnees")).toBe(12);
    expect(r.needs.find((n) => n.needId === "feuilles-bandes")).toBeUndefined();
  });

  it("je façonne, 6 ml au plus : des feuilles de zinc 2 × 1 m, jamais du zinc au kg (§25.2) : 5,5 m × 0,25 m / 2 m² = 0,69 → 1 feuille", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, input({ faconnage: "1", developpe: "250", longueur_bande: "5" }));
    expect(order(r, "feuilles-bandes")).toBe(1);
    expect(need(r, "feuilles-bandes").label).toBe("Feuilles zinc naturel 2 × 1 m, 0,65 mm");
    expect(r.needs.some((n) => n.purchase?.order.unit.many === "kg")).toBe(false);
  });

  it("je façonne, 22 m : toujours des feuilles 2 × 1 m (§48.6, jamais de bobineau pour une bande), 8 m par feuille au développé de 25 cm → 3 feuilles", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, input({ faconnage: "1", developpe: "250" }));
    expect(order(r, "feuilles-bandes")).toBe(3);
    expect(r.needs.some((n) => /bobineau/i.test(n.label))).toBe(false);
  });

  it("sans façonnage connu : une question, pas « à chiffrer » ; le développé est demandé pour estimer les feuilles", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, input({}));
    // Les deux formes de la bande attendent la réponse ; rien d'autre (règle numéro un : ni mastic ni vis non écrits).
    expect(r.needs.map((n) => n.status)).toEqual(["question", "question"]);
    expect(need(r, "bandes-faconnees").question?.key).toBe("param:faconnage");
    const feuilles = computeWorkItem(ROOFING_REFERENTIAL, input({ faconnage: "1", longueur_bande: "5" }));
    expect(need(feuilles, "feuilles-bandes").question?.key).toBe("param:developpe");
  });
});

describe("abergement de cheminée (§7) : un ouvrage compté devient des bandes ou des feuilles de zinc", () => {
  it("2 cheminées de 3 m : 7,8 m de zinc → 5 bandes de 2 m dév. 33 cm ; 6 m de porte-solin → 4 bandes ; façonné sur place : 2 feuilles", () => {
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
    // Façonné sur place (§48.6) : 7,8 m de zinc au développé de 33 cm, 3 bandes de 2 m par feuille → 2 feuilles 2 × 1 m.
    expect(order(bobine, "feuilles-abergement")).toBe(2);
    expect(bobine.needs.some((n) => /bobineau/i.test(n.label))).toBe(false);
  });
});
