import { describe, expect, it } from "vitest";
import { enginePreferences, learnFromChoice, type CompanyPreference } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * Trois demandes du fondateur (2026-10-03) :
 *  3) joint debout au-delà de 10 m de rampant : « bobine profilée sur place ou bacs en plusieurs longueurs ? » ;
 *  4) panneaux et rouleaux : le m² est admis, mais le nombre de panneaux sort aussi quand le conditionnement est connu ;
 *  5) l'habitude « je façonne » est mémorisée à la deuxième confirmation et n'est plus demandée.
 */
const JOINT_DEBOUT = [{ ref: "z1", designation: "Couverture zinc joint debout", quantity: "91", unit: "m²" }];
const A = (v: Record<string, string>) => Object.fromEntries(Object.entries(v).map(([k, value]) => [`param:${k}`, { value, unit: k === "longueur_rampant" ? "m" : "u" }]));

describe("3) joint debout : rampant de plus de 10 m", () => {
  it("rampant 5,5 m : pas de question « bacs longs », 39 bacs comme avant", () => {
    const v = readQuote(JOINT_DEBOUT, A({ faconnage: "2" }));
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:bacs_longs");
    expect(v.toBuy.find((b) => b.needIds.includes("zinc-bacs"))?.quantity).toBe("39 pièces");
  });

  it("rampant 12 m, commandé façonné : la question se pose ; « plusieurs longueurs » → 2 bacs de 10 m max par travée ; « profilée sur place » → bobine au ml", () => {
    const asked = readQuote(JOINT_DEBOUT, A({ faconnage: "2", longueur_rampant: "12" }));
    const q = asked.questions.find((d) => d.question?.key === "param:bacs_longs")!;
    expect(q.question).toMatchObject({ text: "Rampant de plus de 10 m : bobine profilée sur place, ou bacs en plusieurs longueurs ?", options: [{ label: "Bobine profilée sur place", value: "1" }, { label: "Bacs en plusieurs longueurs", value: "2" }] });
    expect(asked.toBuy.some((b) => b.needIds.includes("zinc-bacs") || b.needIds.some((id) => id.startsWith("zinc-bobines")))).toBe(false);
    // 91 m² / 12 m = 7,58 m de pan ÷ 0,43 = 18 travées × 2 longueurs = 36 bacs.
    const bacs = readQuote(JOINT_DEBOUT, A({ faconnage: "2", longueur_rampant: "12", bacs_longs: "2" }));
    expect(bacs.toBuy.find((b) => b.needIds.includes("zinc-bacs"))?.quantity).toBe("36 pièces");
    expect(bacs.toBuy.some((b) => b.needIds.some((id) => id.startsWith("zinc-bobines")))).toBe(false);
    // Profilée sur place : 18 bacs × 12 m = 216 ml de bobine, et pas de bacs.
    const bobine = readQuote(JOINT_DEBOUT, A({ faconnage: "2", longueur_rampant: "12", bacs_longs: "1" }));
    expect(bobine.toBuy.find((b) => b.needIds.some((id) => id.startsWith("zinc-bobines")))?.quantity).toBe("216 ml");
    expect(bobine.toBuy.some((b) => b.needIds.includes("zinc-bacs"))).toBe(false);
  });

  it("je façonne : jamais la question « bacs longs », même à 12 m", () => {
    const v = readQuote(JOINT_DEBOUT, A({ faconnage: "1", longueur_rampant: "12" }));
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:bacs_longs");
    expect(v.toBuy.find((b) => b.needIds.some((id) => id.startsWith("zinc-bobines")))?.quantity).toBe("216 ml");
  });
});

describe("4) panneaux : le m² est admis, le nombre de panneaux est dit à côté", () => {
  it("support en OSB sous le zinc : 96 m² (91 × 1,05), soit ≈ 31 panneaux de 2,50 × 1,25 m", () => {
    const v = readQuote([...JOINT_DEBOUT, { ref: "z3", designation: "Support en panneaux OSB 3 18 mm", quantity: "91", unit: "m²" }], A({ faconnage: "1" }));
    const osb = v.toBuy.find((b) => b.needIds.includes("voliges-joint-debout"))!;
    expect(osb).toMatchObject({ label: expect.stringMatching(/^Panneaux OSB/), quantity: "96 m²", approx: "≈ 31 panneaux de 2,50 × 1,25 m" });
  });

  it("volige sapin : m² seulement, le paquet n'étant pas un conditionnement connu", () => {
    const v = readQuote([...JOINT_DEBOUT, { ref: "z3", designation: "Voligeage en sapin traité 18×200 mm", quantity: "91", unit: "m²" }], A({ faconnage: "1" }));
    expect(v.toBuy.find((b) => b.needIds.includes("voliges-joint-debout"))).toMatchObject({ quantity: "96 m²", approx: null });
  });
});

describe("5) habitude « je façonne » : apprise à la deuxième confirmation", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  const choose = (m: CompanyPreference[], value: string, projectId: string, at = now.toISOString()) => learnFromChoice(m, { kind: "param", key: "param:faconnage", value, projectId, at });

  it("un chantier : rien ; deux chantiers : établie, la question n'est plus posée et l'habitude est dite", () => {
    let m: CompanyPreference[] = [];
    m = choose(m, "1", "chantier-1");
    expect(enginePreferences(m, now).params).toEqual({});
    expect(readQuote(JOINT_DEBOUT, {}, [], enginePreferences(m, now)).questions.map((q) => q.question?.key)).toContain("param:faconnage");
    m = choose(m, "1", "chantier-2");
    expect(enginePreferences(m, now).params).toEqual({ faconnage: "1" });
    const v = readQuote(JOINT_DEBOUT, {}, [], enginePreferences(m, now));
    expect(v.questions.map((q) => q.question?.key)).not.toContain("param:faconnage");
    expect(v.toBuy.find((b) => b.needIds.some((id) => id.startsWith("zinc-bobines")))?.quantity).toBe("215 ml");
    // La réponse de CE chantier passe devant l'habitude.
    expect(readQuote(JOINT_DEBOUT, A({ faconnage: "2" }), [], enginePreferences(m, now)).toBuy.find((b) => b.needIds.includes("zinc-bacs"))?.quantity).toBe("39 pièces");
  });

  it("un choix contraire sur un nouveau chantier : l'habitude est reproposée, pas appliquée en silence", () => {
    let m: CompanyPreference[] = [];
    m = choose(m, "1", "chantier-1");
    m = choose(m, "1", "chantier-2");
    m = choose(m, "2", "chantier-3", "2026-10-04T09:00:00Z");
    expect(enginePreferences(m, new Date("2026-10-04T10:00:00Z")).params).toEqual({});
  });
});
