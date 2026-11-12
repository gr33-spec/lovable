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
const wire = (w: Partial<AssistantIaWire>): AssistantIaWire => ({ nature: "texte", lignes: [], questions: [], message: "", ...w });

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

  it("les questions : trois au plus ; la quantité qui manque se demande ; jamais l'adresse, la date ni le prix", () => {
    const r = validerAssistantIa(
      dit("de la gouttière zinc et des descentes"),
      wire({
        lignes: [{ designation: "Gouttière zinc", quantite: null, unite: null }],
        questions: [
          { texte: "À quelle adresse je te livre ?", choix: [] },
          { texte: "Gouttière : quelle longueur, en mètres ?", choix: [] },
          { texte: "Gouttière zinc : quel développé ?", choix: ["25", "33", "40", "", "50", "60", "80", "100"] },
          { texte: "Descente : quel diamètre ?", choix: ["80", "100"] },
          { texte: "Tu veux être livré quand ?", choix: [] },
          { texte: "Gouttière : demi-ronde ou carrée ?", choix: ["Demi-ronde", "Carrée"] },
          { texte: "Descente : zinc ou cuivre ?", choix: ["Zinc", "Cuivre"] },
        ],
      }),
    );
    expect(r.questions.map((q) => q.texte)).toEqual(["Gouttière : quelle longueur, en mètres ?", "Gouttière zinc : quel développé ?", "Descente : quel diamètre ?"]);
    expect(r.questions[1]!.choix).toEqual(["25", "33", "40", "50", "60", "80"]);
  });

  it("PHOTO DE CHANTIER : les matériaux vus sont proposés « vus sur la photo », sans quantité ni dimension, jamais inventées", () => {
    const vue = wire({
      nature: "chantier",
      message: "Je vois une couverture en ardoises et une gouttière en zinc.",
      lignes: [
        { designation: "Ardoise naturelle", quantite: null, unite: null },
        { designation: "Gouttière zinc demi-ronde", quantite: "12", unite: "m" },
        { designation: "Ardoise naturelle 32×22", quantite: null, unite: null },
      ],
      questions: [{ texte: "Tu refais toute la couverture ou une partie ?", choix: ["Toute la couverture", "Une partie"] }, { texte: "Quelle surface de couverture ?", choix: [] }],
    });
    const r = validerAssistantIa(dit("regarde cette toiture"), vue, { photo: true });
    expect(r.nature).toBe("chantier");
    // « 12 » et « 32×22 » ne viennent pas de l'artisan : la quantité tombe, la ligne au format inventé est écartée.
    expect(r.lignes).toEqual([
      { libelle: "Ardoise naturelle", quantite: null, unite: null, vuSurPhoto: true },
      { libelle: "Gouttière zinc demi-ronde", quantite: null, unite: null, vuSurPhoto: true },
    ]);
    expect(r.ecartees).toBe(1);
    expect(r.questions.map((q) => q.texte)).toEqual(["Tu refais toute la couverture ou une partie ?", "Quelle surface de couverture ?"]);
    // La suite de la conversation, sans renvoyer la photo : ce qui a été vu reste nommé, les mesures viennent de l'artisan.
    const suite: EchangeAssistant[] = [{ de: "artisan", texte: "regarde cette toiture" }, { de: "photo", texte: "Ardoise naturelle ; Gouttière zinc demi-ronde" }, { de: "assistant", texte: "Quelle surface de couverture ?" }, { de: "artisan", texte: "85 m² en 32 22 et 14 mètres de gouttière" }];
    const r2 = validerAssistantIa(suite, wire({ lignes: [{ designation: "Ardoise naturelle 32×22", quantite: "85", unite: "m²" }, { designation: "Gouttière zinc demi-ronde", quantite: "14", unite: "m" }, { designation: "Crochets inox", quantite: null, unite: null }] }));
    expect(r2.lignes).toEqual([
      { libelle: "Ardoise naturelle 32×22", quantite: "85", unite: "m²", vuSurPhoto: true },
      { libelle: "Gouttière zinc demi-ronde", quantite: "14", unite: "m" },
    ]);
    expect(r2.ecartees).toBe(1);
  });

  it("PHOTO d'une liste ou d'un devis : rien n'est recopié ici (le document est lu à part) ; sans photo, la nature est « texte »", () => {
    const liste = wire({ nature: "liste", lignes: [{ designation: "Ardoise", quantite: "1000", unite: "pièces" }], message: "C'est une liste de matériaux." });
    expect(validerAssistantIa(dit("voilà"), liste, { photo: true })).toEqual({ nature: "liste", lignes: [], questions: [], message: "C'est une liste de matériaux.", ecartees: 0 });
    expect(validerAssistantIa(dit("12 m de gouttière"), wire({ nature: "chantier", lignes: [{ designation: "Gouttière", quantite: "12", unite: "m" }] })).nature).toBe("texte");
    expect(validerAssistantIa(dit("voilà"), wire({ nature: "texte" }), { photo: true }).nature).toBe("autre");
  });

  it("la consigne tient les règles du comptoir ; la conversation part dans l'ordre", () => {
    for (const regle of [/N'ajoute JAMAIS un article/, /N'invente JAMAIS une quantité/, /au plus trois questions/, /Ne la devine jamais/, /Ne demande jamais une adresse/, /une photo ne donne ni mesure ni quantité/, /« liste » ou « devis » : ne recopie rien/]) expect(ASSISTANT_IA_SYSTEM).toMatch(regle);
    expect(assistantIaDossier([{ de: "artisan", texte: "12 m de gouttière" }, { de: "assistant", texte: "Quel développé ?" }, { de: "artisan", texte: "33" }])).toBe("ARTISAN : 12 m de gouttière\nVENDEUR : Quel développé ?\nARTISAN : 33");
  });
});
