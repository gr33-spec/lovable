import { describe, expect, it } from "vitest";
import { takeoffSystemPrompt, TAKEOFF_PROMPT } from "../src/modules/takeoff/application/prompt.js";
import { decodeExtraction, extractionWireSchema } from "../src/modules/takeoff/application/takeoff-extractor.js";

/** PROMPT A (référentiel §41.1), branché mot pour mot : seules les accolades sont remplies, et le format technique est ajouté après. */
describe("prompt A de lecture du devis (v9)", () => {
  const prompt = takeoffSystemPrompt("Couverture", ["Tuile", "Ardoise"], [
    { id: "couverture-ardoises-crochet", label: "Couverture en ardoises au crochet sur liteaux", synonyms: ["ardoise"] },
    { id: "couverture-zinc-joint-debout", label: "Couverture zinc à joint debout", synonyms: ["joint debout", "couverture zinc"] },
  ]);

  it("est la version 9, et reprend le texte du §41.1 tel quel", () => {
    expect(TAKEOFF_PROMPT.version).toBe(9);
    for (const sentence of [
      "Tu lis le devis d'un artisan du bâtiment pour en extraire les ouvrages à quantifier. Tu ne calcules rien : tu structures.",
      "MÉTIER DE L'ARTISAN : Couverture",
      "1. Le devis fait foi. Tu ne corriges jamais une quantité, un matériau ou un format écrit sur le devis, même s'il te paraît faux. Tu le signales en doute.",
      "2. Tu ne devines pas. Si le format d'ardoise, le modèle de tuile ou l'épaisseur du zinc n'est pas écrit, materiau = null.",
      "3. Les lignes qui ne sont pas des ouvrages (déplacement, nettoyage, échafaudage, main-d'œuvre seule, TVA, remise) ont ouvrage = \"hors_quantitatif\".",
      "5. Les pièges du vocabulaire du métier sont dans le référentiel chargé : \"couverture ardoise\" inclut souvent liteaux et écran, \"zinguerie\" peut vouloir dire gouttières seules. Dans ces cas, confiance = \"doute\".",
      "Tu renvoies uniquement le JSON, sans commentaire.",
    ]) {
      expect(prompt).toContain(sentence);
    }
    // Le référentiel chargé : les ouvrages et leurs synonymes, injectés dans l'accolade.
    expect(prompt).toContain("RÉFÉRENTIEL CHARGÉ : couverture-ardoises-crochet = Couverture en ardoises au crochet sur liteaux (synonymes : ardoise) ; couverture-zinc-joint-debout = Couverture zinc à joint debout (synonymes : joint debout, couverture zinc)");
    expect(prompt).not.toContain("{metier}");
    expect(prompt).not.toContain("{referentiel}");
    // Le format technique vient APRÈS les règles, et se présente comme du contexte injecté.
    expect(prompt.indexOf("FORMAT TECHNIQUE DE LA RÉPONSE (contexte injecté par BatiClair")).toBeGreaterThan(prompt.indexOf("Tu renvoies uniquement le JSON"));
    // Jamais de question de calcul : seul un doute de lecture est demandé.
    expect(prompt).not.toMatch(/combien de mètres linéaires|combien par paquet/);
  });

  it("une réponse v9 se décode : doute = confiance « doute » avec sa raison ; « hors_quantitatif » n'est pas une ligne à commander", () => {
    const wire = extractionWireSchema.parse({
      sections: [["TOITURE"]],
      lignes: [
        { des: "Couverture ardoises 32x22", qte: "200", unite: "m²", ref: null, src: ["1:004"], sec: 0, ouvrage: "couverture-ardoises-crochet", materiau: "ardoise 32×22", dimensions: { pente: "35°" }, confiance: "sur", doute: null },
        { des: "Zinguerie", qte: "1", unite: "ens", ref: null, src: ["1:009"], sec: 0, ouvrage: "inconnu", materiau: null, dimensions: null, confiance: "doute", doute: "Gouttières seules ou avec descentes ?" },
        { des: "Échafaudage", qte: "1", unite: "forfait", ref: null, src: ["1:012"], sec: null, ouvrage: "hors_quantitatif", materiau: null, dimensions: null, confiance: "sur", doute: null },
      ],
      contexte: { adresse: "29200 Brest", travaux: "rénovation" },
      notes: [],
    });
    const out = decodeExtraction(wire);
    expect(out.lines.map((l) => l.designation)).toEqual(["Couverture ardoises 32x22", "Zinguerie"]);
    expect(out.lines[0]).toMatchObject({ doubt: null, workItem: "couverture-ardoises-crochet", material: "ardoise 32×22", dimensions: { pente: "35°" }, section: ["TOITURE"] });
    expect(out.lines[1]).toMatchObject({ doubt: "Gouttières seules ou avec descentes ?", workItem: "inconnu", material: null });
    expect(out.context).toEqual({ adresse: "29200 Brest", travaux: "rénovation" });
  });

  it("une réponse à l'ancien format (sans confiance ni ouvrage) se décode encore", () => {
    const wire = extractionWireSchema.parse({ sections: [], lignes: [{ des: "Tuile romane", qte: "1 250", unite: "u", ref: "TUI", src: ["1:004"], sec: null, doute: "1 250 ou 1 280 ?" }], notes: [] });
    expect(decodeExtraction(wire).lines[0]).toMatchObject({ doubt: "1 250 ou 1 280 ?", workItem: "inconnu", material: null, dimensions: null });
  });
});
