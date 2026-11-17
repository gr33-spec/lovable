import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { interpreterReponsesNumerotees, ROOFING_REFERENTIAL, type QuestionNumerotee } from "../src/index.js";
import { readQuote, type QuoteLineInput } from "./support/read-quote.js";

/**
 * LE CŒUR S'ADAPTE À N'IMPORTE QUEL MÉTIER (Greg, 17 novembre 2026 : « ce que tu mets en place au cœur de Mobiiz doit
 * s'adapter à n'importe quel métier ; pour le couvreur, s'il plie, des feuilles de zinc, sinon des longueurs toutes
 * prêtes »). Les mots de l'artisan (« je plie », « tout fait ») sont écrits sur le bouton, dans la fiche du métier
 * (`dit`). Le lecteur des réponses n'en connaît aucun : un autre métier apporte ses mots sans toucher au code commun.
 */
describe("les mots de l'artisan vivent dans la fiche du métier, pas dans le lecteur des réponses", () => {
  const lus = (questions: QuestionNumerotee[], texte: string) => interpreterReponsesNumerotees(questions, texte).map((r) => (r.statut === "compris" ? r.libelle : null));

  it("le lecteur commun ne nomme aucun métier", () => {
    const code = readFileSync(new URL("../src/assistant/reponses-libres-numerotees.ts", import.meta.url), "utf8")
      .split("\n")
      .filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l))
      .join("\n");
    expect(code).not.toMatch(/faconn|façonn|\bpli|zinc|bobine|tuile|ardoise|peinture|tout fait/i);
  });

  it("un autre métier (peinture) apporte ses mots : « au rouleau », « je pulvérise »", () => {
    const peinture: QuestionNumerotee[] = [
      { numero: 1, cle: "param:application", texte: "Tu appliques comment ?", options: [{ label: "Rouleau et brosse", value: "1", dit: ["au rouleau", "a la main"] }, { label: "Pistolet airless", value: "2", dit: ["je pulverise", "a la machine", "airless"] }], unite: null },
      { numero: 2, cle: "param:couches", texte: "Combien de couches de finition ?", options: [{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }], unite: "u" },
    ];
    expect(lus(peinture, "à la machine, 2")).toEqual(["Pistolet airless", "2"]);
    expect(lus(peinture, "au rouleau")[0]).toBe("Rouleau et brosse");
  });

  it("sans mots sur le bouton, rien n'est deviné : la question est reposée", () => {
    const sans: QuestionNumerotee[] = [{ numero: 1, cle: "param:application", texte: "Tu appliques comment ?", options: [{ label: "Rouleau et brosse", value: "1" }, { label: "Pistolet airless", value: "2" }], unite: null }];
    expect(lus(sans, "à la machine")).toEqual([null]);
  });

  it("deux boutons dits dans la même réponse : un vrai doute, la question est reposée avec ses boutons", () => {
    const q: QuestionNumerotee[] = [{ numero: 1, cle: "param:application", texte: "Tu appliques comment ?", options: [{ label: "Rouleau et brosse", value: "1", dit: ["au rouleau"] }, { label: "Pistolet airless", value: "2", dit: ["airless"] }], unite: null }];
    const [r] = interpreterReponsesNumerotees(q, "au rouleau ou airless");
    expect(r!.statut).toBe("ambigu");
  });

  it("couverture : chaque bouton de façonnage porte ses mots (« je plie » → je façonne, « tout fait » → commandé façonné)", () => {
    const faconnages = ROOFING_REFERENTIAL.workItems.flatMap((w) => w.params).filter((p) => p.key === "faconnage");
    expect(faconnages.length).toBeGreaterThan(0);
    for (const p of faconnages) {
      expect(p.choices?.find((c) => c.value === "1")?.dit, p.question).toContain("je plie");
      expect(p.choices?.find((c) => c.value === "2")?.dit, p.question).toContain("tout fait");
    }
  });
});

/**
 * §48.6 et §49.2 : « s'il plie, des feuilles de zinc ; sinon des longueurs ». La même bande de rive sort en feuilles
 * 2 × 1 m quand l'artisan la façonne, en longueurs de 2 m quand il la commande façonnée.
 */
describe("s'il plie, des feuilles de zinc ; sinon des longueurs toutes prêtes", () => {
  // Le même banc que `zinguerie-piece-par-piece.test.ts` (sa lecture est enregistrée).
  const PIECES: QuoteLineInput[] = [
    { ref: "1", designation: "Bande de solin zinc naturel dév. 25", quantity: "5", unit: "ml" },
    { ref: "2", designation: "Bande de ventilation en Z en zinc quartz", quantity: "13", unit: "m" },
    { ref: "3", designation: "Bande de rive zinc dév. 33", quantity: "14", unit: "ml" },
    { ref: "4", designation: "Faîtage zinc dév. 33", quantity: "8", unit: "ml" },
  ];
  const avec = (valeur: string) => {
    const cles = readQuote(PIECES).questions.flatMap((q) => (q.question?.key.includes("faconnage") ? [q.question.key] : []));
    expect(cles.length).toBeGreaterThan(0);
    return readQuote(PIECES, Object.fromEntries(cles.map((c) => [c, { value: valeur, unit: "u" }]))).toBuy.map((b) => b.label);
  };

  it("« je plie » : des feuilles 2 × 1 m, aucune bande toute prête", () => {
    const lignes = avec("1");
    expect(lignes.some((l) => /^Feuilles .*2 × 1 m/.test(l)), lignes.join(" | ")).toBe(true);
    expect(lignes.some((l) => /^Bande de rive/i.test(l)), lignes.join(" | ")).toBe(false);
  });

  it("« tout fait » : la bande de rive en longueurs, aucune feuille", () => {
    const lignes = avec("2");
    expect(lignes.some((l) => /^Bande de rive/i.test(l)), lignes.join(" | ")).toBe(true);
    expect(lignes.some((l) => /^Feuilles .*rive/i.test(l)), lignes.join(" | ")).toBe(false);
  });
});
