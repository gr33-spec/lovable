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
    // La bande zinc au ml n'est plus « à chiffrer » : le moteur tente d'abord (développé ? façonnage ?), ce sont des questions.
    expect(v.toQuote).toEqual([]);
    expect(v.questions.map((q) => q.question?.key ?? q.key)).toContain("param:faconnage");
    // Le voligeage est un composant du joint debout : calculé (91 m² × 1,05), vendu au m² de planche.
    expect(v.toBuy.find((b) => b.label === "Voliges sapin 18×200 mm traité")?.quantity).toBe("96 m²");
    // La gouttière, elle, a une règle : des longueurs de 4 m, des crochets, des naissances ; le comptoir demande son
    // développé, la pose des crochets et le diamètre des descentes (§47.8) avant de la chiffrer.
    expect(v.questions.map((q) => q.question?.key ?? q.key)).toEqual(expect.arrayContaining(["param:developpe_gouttiere", "param:fixation_crochet"]));
    // Un forfait n'est jamais commandé (main-d'œuvre), et une ligne n'est jamais à la fois commandée et à chiffrer.
    expect(labels).not.toContain("Échafaudage");
    const keys = [...v.toBuy.map((b) => b.key), ...v.toQuote.map((q) => q.key)];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("une ligne qui échoue au test ne part pas, mais elle n'empêche pas d'envoyer le reste", () => {
    const v = readQuote(ZINC_QUOTE, { "param:nb_descentes": { value: "2", unit: "u" } });
    // Restent, posées d'un coup : UNE question de façonnage pour tout le métal, le développé (une bande commandée
    // façonnée se fabrique à son développé ; façonnée sur place au-delà de 6 ml, un bobineau de 500 mm suffit et la
    // réponse est simplement ignorée), et ce que le comptoir demande pour la gouttière (§47.8). Plus « égout et
    // faîtage ? » (proposés dans « On ajoute ? »). Le voligeage est reconnu (§7), plus « article inconnu ».
    expect(v.questions.map((q) => q.question?.key ?? q.key).sort()).toEqual(["param:developpe", "param:developpe_gouttiere", "param:diametre_descente", "param:faconnage", "param:fixation_crochet"]);
    const surPlaceLong = readQuote(ZINC_QUOTE, { "param:nb_descentes": { value: "2", unit: "u" }, "param:faconnage": { value: "1", unit: "u" } });
    expect(surPlaceLong.questions.map((q) => q.question?.key ?? q.key)).not.toContain("param:developpe");
    const commande = readQuote(ZINC_QUOTE, { "param:nb_descentes": { value: "2", unit: "u" }, "param:faconnage": { value: "2", unit: "u" } });
    expect(commande.questions.map((q) => q.question?.key ?? q.key)).toContain("param:developpe");
    // Façonné : 13 ml × 1,1 = 14,3 m → 8 longueurs de 2 m (recouvrement 10 cm, §45.5) ; rien à faire chiffrer.
    const faconne = readQuote(ZINC_QUOTE, { "param:nb_descentes": { value: "2", unit: "u" }, "param:faconnage": { value: "2", unit: "u" }, "param:developpe": { value: "100", unit: "mm" } });
    expect(faconne.toBuy.find((b) => b.label.startsWith("Bandes façonnées Quartz-Zinc"))).toMatchObject({ quantity: "8 longueurs de 2 m" });
    expect(faconne.toQuote).toEqual([]);
    // L'aspect se lit sur sa ligne (la bande « en zinc quartz ») ; une bande ne fait pas l'aspect de la couverture.
    // Je façonne 13 ml (plus de 6 ml) : un BOBINEAU, jamais du zinc au kg (réponse du fondateur, 2026-10-04) : 14,3 m de
    // zinc → bobineau 500 × 17 m. Le joint debout, lui, part en bobine au mètre linéaire, largeur écrite (jamais au kg).
    const surPlace = readQuote(ZINC_QUOTE, { "param:nb_descentes": { value: "2", unit: "u" }, "param:faconnage": { value: "1", unit: "u" } });
    expect(surPlace.toBuy.find((b) => b.needIds.includes("bobineau-bandes"))).toMatchObject({ label: "Bobineau Quartz-Zinc 500 × 17 m, 0,65", quantity: "1 pièce" });
    expect(surPlace.toBuy.find((b) => b.needIds.some((id) => id.startsWith("zinc-bobines")))?.label).toBe("Bobine zinc naturel 0,65 mm, largeur 500 mm");
    expect(surPlace.toBuy.find((b) => b.needIds.some((id) => id.startsWith("zinc-bobines")))?.order?.unit).toBe("ml");
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
    const key = "product:Ardoises naturelles Espagne 1er choix 30×22";
    const out = applyPurchaseOverrides(v, { [`libelle:${key}`]: "Ardoises Cupa 30×22", [`quantite:${key}`]: { value: "9000", unit: "pièces" } });
    const edited = out.toBuy.find((b) => b.key === key)!;
    expect(edited).toMatchObject({ label: "Ardoises Cupa 30×22", quantity: "9 000 pièces", order: { count: "9000", unit: "pièces" }, approx: null, edited: ["label", "quantity"] });
    expect(out.toBuy.filter((b) => b.key !== key)).toEqual(v.toBuy.filter((b) => b.key !== key));
    // Rien réécrit : l'objet est inchangé.
    expect(applyPurchaseOverrides(v, {}).toBuy).toEqual(v.toBuy);
  });
});
