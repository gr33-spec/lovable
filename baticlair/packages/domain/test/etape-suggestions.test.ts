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
  it("à l'ouverture : naissances, talons, angles, puis les consommables (silicone, vis) ; jamais les crochets déjà écrits ; cinq au plus ; rien n'est ajouté", () => {
    const e = ecran();
    expect(e.suggestions.map((o) => o.label)).toEqual([
      "Naissances de gouttière",
      "Talons de gouttière (si tu ne les fabriques pas)",
      "Angles de gouttière (si tu ne les fabriques pas)",
      "Cartouches de silicone zinc",
      "Vis inox 4 × 40",
    ]);
    // Le silicone de deux pièces (la rive, le porte-solin) : une seule case, qui vaut pour les deux.
    expect(e.suggestions.map((o) => o.key)).toEqual(["gouttiere/naissance", "gouttiere/talon", "gouttiere/angle", "bandes-zinc/mastic+bande-porte-solin/mastic", "bandes-zinc/vis"]);
    expect(e.suggestions.length).toBe(SUGGESTIONS_MAX);
    expect(SUGGESTIONS_TEXTE).toBe("Suggestions. Coche ce qu'il te faut, on l'ajoute à ta liste.");
    expect(noms(e).join(" | ")).not.toMatch(/naissance|talon|angle|silicone|vis inox|pattes/i);
    // L'étape n'est pas une question de précision : elle ne s'y mêle pas ; et plus de question oui / non sur les consommables.
    expect(cles(e)).not.toContain(SUGGESTIONS_KEY);
    expect(cles(e).join(" ")).not.toMatch(/consommables/);
  });

  it("consommables (Greg, 18 novembre 2026) : jamais d'office, jamais de question ; cochés, ils entrent dans la liste ; les autres n'existent pas", () => {
    const rien = ecran({ [SUGGESTIONS_KEY]: SUGGESTIONS_AUCUNE, "param:faconnage@pieces-pliees": { value: "1", unit: "u" } });
    expect(noms(rien).join(" | ")).not.toMatch(/silicone|vis inox|pattes|étain|décapant/i);
    expect(cles(rien).join(" ")).not.toMatch(/consommables/);
    const coche = ecran({ [SUGGESTIONS_KEY]: "bandes-zinc/mastic+bande-porte-solin/mastic", "param:faconnage@pieces-pliees": { value: "1", unit: "u" } });
    const silicone = coche.purchase.toBuy.filter((b) => /silicone/i.test(b.label));
    // Une seule ligne, le total des deux pièces (une ligne par article identique).
    expect(silicone.map((b) => [b.label, b.quantity])).toEqual([["Cartouches de silicone zinc", "2 cartouches"]]);
    expect(noms(coche).join(" | ")).not.toMatch(/vis inox|pattes|étain|décapant/i);
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
    const ardoisesSeules = { ...D2026_020_LECTURE, lignes: D2026_020_LECTURE.lignes.filter((l) => /ardoise/i.test(l.designation)), questions: [] };
    const e = ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture: ardoisesSeules, answers: {}, preferences: {} });
    expect(suggestionsDuPlan(ROOFING_REFERENTIAL, e.plan)).toEqual([]);
    expect(e.suggestions).toEqual([]);
  });

  it("toute suggestion de la fiche couverture a ses mots, et ne dit jamais un article ajouté d'office dans la lecture", () => {
    const slots = ROOFING_REFERENTIAL.workItems.flatMap((w) => w.slots.filter((s) => s.suggested).map((s) => `${w.id}/${s.key} : ${s.suggested!.label}`));
    expect(slots).toEqual([
      // Greg, 21 novembre 2026 : la bande porte-solin d'un abergement, non dite au devis, se propose ici (avant : ajoutée d'office).
      "abergement-cheminee/porte_solin : Bandes porte-solin de l'abergement",
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
