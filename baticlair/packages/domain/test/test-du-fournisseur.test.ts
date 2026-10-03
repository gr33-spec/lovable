import { describe, expect, it } from "vitest";
import { applyPurchaseOverrides, supplierTest } from "../src/index.js";
import { REAL_QUOTES } from "./devis-reels/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * LE TEST DU FOURNISSEUR (référentiel §40, verrou moteur §41.3) : le quantitatif est lu par le gars du
 * négoce. Chaque ligne « À commander » doit lui permettre de charger le camion sans rappeler. Une mesure
 * en m², un ml de métal sans largeur ni épaisseur, un « lot » ou un « forfait » ne passent jamais en
 * commande : ils vont chez « Le fournisseur chiffrera », avec leur mesure et la raison.
 */
const FORBIDDEN_UNIT = /^(m2|m²|lot|lots|forfait|forfaits|ft|ens|ensembles?)$/i;

/** Le devis de la capture du fondateur (2026-10-03) : joint debout en m², bande zinc en ml, voligeage. */
const ZINC_QUOTE = [
  { ref: "z1", designation: "Couverture zinc joint debout", quantity: "91", unit: "m²" },
  { ref: "z2", designation: "Bande de ventilation en Z en zinc quartz", quantity: "13", unit: "ml" },
  { ref: "z3", designation: "Voligeage en sapin traité 18×200 mm", quantity: "91", unit: "m²" },
  { ref: "z4", designation: "Gouttière zinc demi-ronde", quantity: "13", unit: "ml" },
  { ref: "z5", designation: "Échafaudage", quantity: "1", unit: "forfait" },
];

describe("test du fournisseur : chaque ligne « À commander » se charge dans le camion", () => {
  it("joint debout 91 m², bande zinc 13 ml, voligeage 91 m² : jamais en commande tels quels, chez « Le fournisseur chiffrera » avec la mesure", () => {
    const v = readQuote(ZINC_QUOTE);
    const labels = v.toBuy.map((b) => b.label);
    expect(labels).not.toContain("Couverture zinc joint debout");
    expect(labels).not.toContain("Bande de ventilation en Z en zinc quartz");
    expect(labels).not.toContain("Voligeage en sapin traité 18×200 mm");
    const quote = Object.fromEntries(v.toQuote.map((q) => [q.label, q]));
    expect(quote["Bande de ventilation en Z en zinc quartz"]).toMatchObject({ measure: "13 ml", reason: expect.stringMatching(/sans largeur ni épaisseur/) });
    // Le voligeage est un composant du joint debout : calculé (91 m² × 1,05), vendu au m² de planche.
    expect(v.toBuy.find((b) => b.label === "Voliges sapin 18 mm")?.quantity).toBe("96 m²");
    expect(quote["Couverture zinc joint debout"]).toBeUndefined(); // c'est une question de façonnage, pas un article à chiffrer
    // La gouttière, elle, a une règle : des longueurs de 4 m, des crochets, des naissances.
    expect(labels.some((l) => /gouttière/i.test(l))).toBe(true);
    // Un forfait n'est jamais commandé (main-d'œuvre), et une ligne n'est jamais à la fois commandée et à chiffrer.
    expect(labels).not.toContain("Échafaudage");
    const keys = [...v.toBuy.map((b) => b.key), ...v.toQuote.map((q) => q.key)];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("une ligne qui échoue au test ne part pas, mais elle n'empêche pas d'envoyer le reste", () => {
    const v = readQuote(ZINC_QUOTE, { "param:nb_descentes": { value: "2", unit: "u" } });
    // Restent : la question de façonnage du joint debout, et la bande de ventilation (article inconnu, à confirmer).
    expect(v.questions.map((q) => q.question?.key ?? q.key).sort()).toEqual(["group:unknown", "param:faconnage"]);
    // La bande en ml de zinc nu n'est pas une question de calcul : elle est chez « Le fournisseur chiffrera ».
    expect(v.toQuote.map((q) => q.label)).toContain("Bande de ventilation en Z en zinc quartz");
  });

  it("unités refusées en sortie : m², ml de métal nu, lot, forfait, ensemble ; admises : pièces, rouleaux, ml avec dimensions", () => {
    expect(supplierTest("Couverture ardoises", "m²")).toMatch(/m²/);
    expect(supplierTest("Couverture ardoises", "M2")).toMatch(/m²/);
    expect(supplierTest("Zinguerie diverse", "lot")).toMatch(/unité de commande/);
    expect(supplierTest("Zinguerie diverse", "ens")).toMatch(/unité de commande/);
    expect(supplierTest("Bande de rive zinc", "ml")).toMatch(/sans largeur ni épaisseur/);
    expect(supplierTest("Bande de rive zinc dév. 25 cm", "ml")).toBeNull();
    expect(supplierTest("Bande de rive zinc 0,65 mm", "ml")).toBeNull();
    expect(supplierTest("Liteau sapin 27x40", "ml")).toBeNull();
    expect(supplierTest("Chatière de ventilation", "u")).toBeNull();
    expect(supplierTest("Écran HPV", "rouleau")).toBeNull();
  });

  it("sur tous les devis du banc : aucune ligne commandée en m², lot ou forfait, aucun métal au ml sans dimension", () => {
    for (const q of REAL_QUOTES) {
      const v = readQuote(q.lines, q.answers ?? {});
      const wrong = v.toBuy.filter((b) => b.order && (FORBIDDEN_UNIT.test(b.order.unit) || supplierTest(b.label, b.order.unit)));
      expect(wrong.map((b) => `${q.id} : ${b.label} ${b.quantity}`)).toEqual([]);
    }
  });
});

describe("§ 41.4 : les mots de l'artisan passent devant ceux de BatiClair", () => {
  it("libellé et quantité réécrits sur une ligne calculée ; les autres lignes ne bougent pas", () => {
    const v = readQuote([{ ref: "a", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" }]);
    const key = "product:Ardoises 30×22";
    const out = applyPurchaseOverrides(v, { [`libelle:${key}`]: "Ardoises Cupa 30×22", [`quantite:${key}`]: { value: "9000", unit: "pièces" } });
    const edited = out.toBuy.find((b) => b.key === key)!;
    expect(edited).toMatchObject({ label: "Ardoises Cupa 30×22", quantity: "9 000 pièces", order: { count: "9000", unit: "pièces" }, approx: null, edited: ["label", "quantity"] });
    expect(out.toBuy.filter((b) => b.key !== key)).toEqual(v.toBuy.filter((b) => b.key !== key));
    // Rien réécrit : l'objet est inchangé.
    expect(applyPurchaseOverrides(v, {}).toBuy).toEqual(v.toBuy);
  });
});
