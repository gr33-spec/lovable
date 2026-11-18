import { describe, expect, it } from "vitest";
import { D2026_020_LECTURE, ecranDeLecture, ROOFING_REFERENTIAL, SUGGESTIONS_AUCUNE, SUGGESTIONS_KEY, SUGGESTIONS_MAX, SUGGESTIONS_TEXTE, suggestionsDuPlan, type EngineAnswer } from "../src/index.js";

/**
 * ÉTAPE « SUGGESTIONS » (Greg, 17 novembre 2026, points 13 à 17 ; règle changée : §49.1 points 3 et 5).
 * « Après la lecture et avant les questions de précision, une seule étape dans la discussion : « Suggestions. Coche ce
 * qu'il te faut, on l'ajoute à ta liste. » […] Ce qui est coché s'ajoute, le reste est ignoré, sans autre question. »
 * « Les suggestions viennent des règles de la fiche métier, pas de l'IA […]. Cinq au plus […]. Aucune suggestion = pas
 * d'étape. » « N'ajoute jamais un article que je n'ai pas dit. […] Les angles et les talons de gouttière sont des lignes
 * à part, proposées seulement dans les suggestions. »
 * Le devis : le chantier ardoise et zinguerie de Greg (D-2026-020, lecture réelle enregistrée) ; sa gouttière Havraise
 * a ses crochets écrits, pas ses naissances.
 */
const ecran = (answers: Record<string, EngineAnswer> = {}) => ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture: D2026_020_LECTURE, answers, preferences: {} });
const cles = (e: ReturnType<typeof ecran>) => e.purchase.questions.map((d) => d.question?.key ?? d.key);
const noms = (e: ReturnType<typeof ecran>) => e.purchase.toBuy.map((b) => b.label);

describe("l'étape « Suggestions » : des cases à cocher tirées de la fiche, avant les questions", () => {
  it("à l'ouverture : l'étape propose naissances, talons et angles, jamais les crochets déjà écrits ; rien n'est ajouté", () => {
    const e = ecran();
    expect(e.suggestions.map((o) => o.label)).toEqual(["Naissances de gouttière", "Talons de gouttière (si tu ne les fabriques pas)", "Angles de gouttière (si tu ne les fabriques pas)"]);
    expect(e.suggestions.map((o) => o.key)).toEqual(["gouttiere/naissance", "gouttiere/talon", "gouttiere/angle"]);
    expect(e.suggestions.length).toBeLessThanOrEqual(SUGGESTIONS_MAX);
    expect(SUGGESTIONS_TEXTE).toBe("Suggestions. Coche ce qu'il te faut, on l'ajoute à ta liste.");
    expect(noms(e).join(" | ")).not.toMatch(/naissance|talon|angle/i);
    // L'étape n'est pas une question de précision : elle ne s'y mêle pas.
    expect(cles(e)).not.toContain(SUGGESTIONS_KEY);
  });

  it("rien de coché : aucun article ajouté, aucune question sur eux ; les questions de précision arrivent", () => {
    const e = ecran({ [SUGGESTIONS_KEY]: SUGGESTIONS_AUCUNE });
    expect(e.suggestions).toEqual([]);
    expect(cles(e).length).toBeGreaterThan(0);
    expect(cles(e).join(" ")).not.toMatch(/nb_angles/);
    expect(noms(e).join(" | ")).not.toMatch(/naissance|talon|angle/i);
  });

  it("naissances et angles cochés : ils entrent dans la liste comme des articles écrits ; les talons, non cochés, n'existent pas", () => {
    const choix = { [SUGGESTIONS_KEY]: "gouttiere/naissance,gouttiere/angle" };
    const e = ecran(choix);
    expect(e.suggestions).toEqual([]);
    expect(noms(e).join(" | ")).toMatch(/Naissances/);
    expect(noms(e).join(" | ")).not.toMatch(/talon/i);
    // Point 16 : ce que le calcul d'un article coché demande se pose tout de suite, avec les premières questions.
    expect(cles(e)).toContain("param:nb_angles");
    // Point 16 : la question des angles ne se pose que parce qu'ils sont cochés ; répondue, la ligne est comptée.
    const apres = ecran({ ...choix, "param:nb_angles": { value: "2", unit: "u" }, "param:nb_descentes": { value: "1", unit: "u" }, "param:developpe_gouttiere": { value: "25", unit: "cm" } });
    const angles = apres.purchase.toBuy.find((b) => /^Angles de gouttière/.test(b.label));
    expect(angles?.quantity).toMatch(/^2\b/);
  });

  it("un devis sans oubli probable n'a pas d'étape : aucune suggestion, pas de carte", () => {
    const sansGouttiere = { ...D2026_020_LECTURE, lignes: D2026_020_LECTURE.lignes.filter((l) => !/goutti/i.test(l.designation)), questions: D2026_020_LECTURE.questions.filter((q) => !/goutti|descente/i.test(q.texte)) };
    const e = ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture: sansGouttiere, answers: {}, preferences: {} });
    expect(suggestionsDuPlan(ROOFING_REFERENTIAL, e.plan)).toEqual([]);
    expect(e.suggestions).toEqual([]);
  });

  it("toute suggestion de la fiche couverture a ses mots, et ne dit jamais un article ajouté d'office dans la lecture", () => {
    const slots = ROOFING_REFERENTIAL.workItems.flatMap((w) => w.slots.filter((s) => s.suggested).map((s) => `${w.id}/${s.key} : ${s.suggested!.label}`));
    expect(slots).toEqual([
      "gouttiere/crochet : Crochets de gouttière",
      "gouttiere/naissance : Naissances de gouttière",
      "gouttiere/talon : Talons de gouttière (si tu ne les fabriques pas)",
      "gouttiere/angle : Angles de gouttière (si tu ne les fabriques pas)",
      "gouttiere-pvc-alu/talon : Talons de gouttière",
      "gouttiere-pvc-alu/angle : Angles de gouttière",
      "gouttiere-pvc-alu/naissance : Naissances de gouttière",
    ]);
  });
});
