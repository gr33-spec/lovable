import { describe, expect, it } from "vitest";
import { designationPrecisee, phrasePrecision, precisionDeLigne } from "../src/index.js";

/**
 * Nouveau cap (Greg, 22 octobre 2026, section 0 du doc « BatiClair Groupé ») : « Ligne vague → question en boutons (format,
 * origine, choix, marque). Pastille verte si précise, orange sinon : « Précise pour trouver d'autres couvreurs ». »
 */
describe("une ligne précise ou vague", () => {
  it("une ardoise sans format, origine ni choix : trois questions, dans l'ordre du comptoir", () => {
    const p = precisionDeLigne("Ardoise naturelle");
    expect(p.famille).toBe("ardoise naturelle");
    expect(p.precise).toBe(false);
    expect(p.questions.map((q) => q.cle)).toEqual(["format", "origine", "choix"]);
    expect(p.questions[0]!.options).toContain("32×22");
  });

  it("une ardoise écrite comme au comptoir est précise", () => {
    expect(precisionDeLigne("Ardoises naturelles Espagne 1er choix 32×22").precise).toBe(true);
    expect(precisionDeLigne("Ardoise 32 x 22 Espagne 1er choix").precise).toBe(true);
  });

  it("une ardoise fibres-ciment n'est jamais prise pour une ardoise naturelle", () => {
    const p = precisionDeLigne("Ardoise fibres-ciment 60x30 bleu-noir");
    expect(p.famille).toBe("ardoise fibres-ciment");
    expect(p.precise).toBe(true);
  });

  it("la liste écrite à la main (faux lecteur) : ce qui est vague et ce qui est précis", () => {
    expect(precisionDeLigne("Tuile romane canal rouge").questions.map((q) => q.cle)).toEqual(["marque"]);
    expect(precisionDeLigne("Faîtière ronde à emboîtement").questions.map((q) => q.cle)).toEqual(["teinte"]);
    expect(precisionDeLigne("Liteau sapin 27x38").precise).toBe(true);
    expect(precisionDeLigne("Écran sous-toiture").questions.map((q) => q.cle)).toEqual(["type"]);
    expect(precisionDeLigne("Pointes inox").questions.map((q) => q.cle)).toEqual(["format"]);
  });

  it("le zinc, la gouttière, la descente et le crochet demandent ce que le comptoir demande", () => {
    expect(precisionDeLigne("Gouttière zinc").questions.map((q) => q.cle)).toEqual(["developpe"]);
    expect(precisionDeLigne("Gouttière zinc demi-ronde dév. 33").precise).toBe(true);
    expect(precisionDeLigne("Tuyau de descente PVC").questions.map((q) => q.cle)).toEqual(["diametre"]);
    expect(precisionDeLigne("Bande de zinc").questions.map((q) => q.cle)).toEqual(["epaisseur"]);
    expect(precisionDeLigne("Crochet inox 100 mm").precise).toBe(true);
    // Un crochet de gouttière n'est pas un crochet d'ardoise, ni une gouttière.
    expect(precisionDeLigne("Crochets de gouttière dév. 33").famille).toBeNull();
  });

  it("un article inconnu n'a pas de question : on ne demande jamais ce qu'on ne sait pas proposer", () => {
    expect(precisionDeLigne("Chatière tuile")).toEqual({ famille: null, precise: true, questions: [] });
    expect(precisionDeLigne("Prise 16 A Legrand Céliane")).toEqual({ famille: null, precise: true, questions: [] });
  });

  it("la réponse s'écrit dans la désignation, et la ligne devient précise", () => {
    let d = "Ardoise naturelle";
    for (const [cle, valeur] of [["format", "32×22"], ["origine", "Espagne"], ["choix", "1er choix"]] as const) {
      const q = precisionDeLigne(d).questions.find((x) => x.cle === cle)!;
      d = designationPrecisee(d, q, valeur);
    }
    expect(d).toBe("Ardoise naturelle 32×22 Espagne 1er choix");
    expect(precisionDeLigne(d).precise).toBe(true);
    const dev = precisionDeLigne("Gouttière zinc").questions[0]!;
    expect(designationPrecisee("Gouttière zinc", dev, "33")).toBe("Gouttière zinc dév. 33");
  });

  it("la pastille dit qui on trouve : les couvreurs au lancement, les artisans ailleurs", () => {
    expect(phrasePrecision("roofing")).toBe("Précise pour trouver d'autres couvreurs");
    expect(phrasePrecision(null)).toBe("Précise pour trouver d'autres couvreurs");
    expect(phrasePrecision("masonry")).toBe("Précise pour trouver d'autres artisans");
  });
});
