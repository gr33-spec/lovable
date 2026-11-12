/**
 * RETOUR DE GREG (12 novembre 2026, capture de l'assistant) : « Ici, je veux une IA connectée. Quand je parle ça doit
 * retranscrire et convertir en quantitatif, l'IA doit poser des questions si besoin (comme un salarié de comptoir). »
 * Le modèle découpe et questionne ; le CODE garde la règle numéro un : aucune quantité, aucun format, aucun article que
 * l'artisan n'a pas dit.
 */
import { describe, expect, it } from "vitest";
import { ASSISTANT_IA_SYSTEM, assistantIaDossier, nombresDits, validerAssistantIa, type AssistantIaWire, type EchangeAssistant } from "../src/index.js";

const DICTEE = "J'aurais besoin de 52 m² d'ardoise 32 22 premier choix d'Espagne j'ai besoin d'une gouttière de 25 gouttières à braise";
const dit = (...t: string[]): EchangeAssistant[] => t.map((texte) => ({ de: "artisan", texte }));
const wire = (w: Partial<AssistantIaWire>): AssistantIaWire => ({ lignes: [], questions: [], message: "", ...w });

describe("l'assistant connecté à l'IA : ce que le code accepte du modèle", () => {
  it("la phrase dictée de la capture : deux articles, la quantité dite, la question du comptoir", () => {
    const r = validerAssistantIa(
      dit(DICTEE),
      wire({
        lignes: [
          { designation: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "52", unite: "m²" },
          { designation: "Gouttière havraise développé 25", quantite: null, unite: null },
        ],
        questions: [{ texte: "Gouttière havraise de 25 : en zinc naturel ou prépatiné ?", choix: ["Zinc naturel", "Zinc prépatiné", "Cuivre"] }],
      }),
    );
    expect(r.lignes).toEqual([
      { libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "52", unite: "m²" },
      { libelle: "Gouttière havraise développé 25", quantite: null, unite: null },
    ]);
    expect(r.questions).toEqual([{ texte: "Gouttière havraise de 25 : en zinc naturel ou prépatiné ?", choix: ["Zinc naturel", "Zinc prépatiné", "Cuivre"] }]);
    expect(r.ecartees).toBe(0);
  });

  it("RÈGLE NUMÉRO UN : une quantité non dite tombe ; un format non dit ou un article non dit écarte la ligne", () => {
    const r = validerAssistantIa(
      dit(DICTEE),
      wire({
        lignes: [
          { designation: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "60", unite: "m²" },
          { designation: "Gouttière havraise développé 33", quantite: "1", unite: "pièces" },
          { designation: "Crochets inox 100 mm", quantite: "950", unite: "pièces" },
          { designation: "Clous cuivre", quantite: null, unite: null },
        ],
      }),
    );
    // 60 n'a pas été dit : la ligne reste, sans quantité ni unité.
    expect(r.lignes).toEqual([{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: null, unite: null }]);
    // « 33 » et « 100 » non dits ; « clous » jamais dit.
    expect(r.ecartees).toBe(3);
  });

  it("la réponse de l'artisan à une question compte comme dite (« en 33 », « zinc ») ; pas celle du vendeur", () => {
    const echanges: EchangeAssistant[] = [
      { de: "artisan", texte: "12 mètres de gouttière demi-ronde" },
      { de: "assistant", texte: "Gouttière demi-ronde : quel développé ? 25, 33 ou 40" },
    ];
    const propose = wire({ lignes: [{ designation: "Gouttière demi-ronde zinc développé 33", quantite: "12", unite: "m" }] });
    // Avant sa réponse : « 33 » n'est dit que par le vendeur.
    expect(validerAssistantIa(echanges, propose)).toMatchObject({ lignes: [], ecartees: 1 });
    expect(validerAssistantIa([...echanges, { de: "artisan", texte: "en 33 zinc" }], propose).lignes).toEqual([{ libelle: "Gouttière demi-ronde zinc développé 33", quantite: "12", unite: "m" }]);
  });

  it("un mot corrigé garde le mot de l'artisan (« Lito » → « liteaux ») ; les nombres en lettres et les milliers sont dits", () => {
    expect(validerAssistantIa(dit("36 mètres de Lito"), wire({ lignes: [{ designation: "Liteaux", quantite: "36", unite: "m" }] })).lignes).toEqual([{ libelle: "Liteaux", quantite: "36", unite: "m" }]);
    expect([...nombresDits("deux rouleaux, 1 000 ardoises, zinc de 0,65")].sort((a, b) => a - b)).toEqual([0.65, 2, 1000]);
    expect(validerAssistantIa(dit("deux rouleaux d'écran sous-toiture"), wire({ lignes: [{ designation: "Écran sous-toiture", quantite: "2", unite: "rouleaux" }] })).lignes[0]!.quantite).toBe("2");
  });

  it("les questions : trois au plus, jamais la quantité, l'adresse, la date ni le prix", () => {
    const r = validerAssistantIa(
      dit("de la gouttière zinc et des descentes"),
      wire({
        lignes: [{ designation: "Gouttière zinc", quantite: null, unite: null }],
        questions: [
          { texte: "Combien de mètres de gouttière ?", choix: [] },
          { texte: "Gouttière zinc : quel développé ?", choix: ["25", "33", "40", "", "50", "60", "80", "100"] },
          { texte: "Descente : quel diamètre ?", choix: ["80", "100"] },
          { texte: "Tu veux être livré quand ?", choix: [] },
          { texte: "Gouttière : demi-ronde ou carrée ?", choix: ["Demi-ronde", "Carrée"] },
          { texte: "Descente : zinc ou cuivre ?", choix: ["Zinc", "Cuivre"] },
        ],
      }),
    );
    expect(r.questions.map((q) => q.texte)).toEqual(["Gouttière zinc : quel développé ?", "Descente : quel diamètre ?", "Gouttière : demi-ronde ou carrée ?"]);
    expect(r.questions[0]!.choix).toEqual(["25", "33", "40", "50", "60", "80"]);
  });

  it("la consigne tient les règles du comptoir ; la conversation part dans l'ordre", () => {
    for (const regle of [/N'ajoute JAMAIS un article/, /N'invente JAMAIS une quantité/, /au plus trois questions/, /Ne demande jamais une quantité/]) expect(ASSISTANT_IA_SYSTEM).toMatch(regle);
    expect(assistantIaDossier([{ de: "artisan", texte: "12 m de gouttière" }, { de: "assistant", texte: "Quel développé ?" }, { de: "artisan", texte: "33" }])).toBe("ARTISAN : 12 m de gouttière\nVENDEUR : Quel développé ?\nARTISAN : 33");
  });
});
