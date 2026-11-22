import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ecranDeLecture, parseLecture, ROOFING_REFERENTIAL as ref, SUGGESTIONS_KEY, type EngineAnswer } from "../src/index.js";
import { evaluate, parseFormula } from "../src/referential/expression.js";

/**
 * CHATIÈRES (A-INTEGRER §1, Greg, 22 novembre 2026) : calculées d'après le modèle de tuile et la surface, jamais demandées.
 * Surface projetée (surface × cos de la pente) × 1/5000 au-dessus d'un écran, 1/3000 sans écran, ÷ section de la chatière du
 * modèle, arrondi au nombre PAIR au-dessus (moitié en bas, moitié en haut). « Écran sous toiture ? » seulement si le devis
 * ne le dit pas. Modèle sans section connue : pas de nombre.
 */
const lecture = (id: string) => parseLecture(JSON.parse(readFileSync(new URL(`./banc-couverture/${id}.json`, import.meta.url), "utf8")).lecture)!;
const CASE = "couverture-tuiles-emboitement/chatiere";

describe("les chatières", () => {
  it("cos_deg : le cosinus d'un angle en degrés, de 0 à 90", () => {
    const v = (f: string) => evaluate(parseFormula(f), () => { throw new Error(); }).value.toDecimalPlaces(4).toNumber();
    expect(v("cos_deg(0)")).toBe(1);
    expect(v("cos_deg(60)")).toBe(0.5);
    expect(() => v("cos_deg(120)")).toThrow(/0 à 90/);
  });

  it("C02 (HP 10) : une case Ventilation ; cochée, le nombre se calcule, pair, avec la seule question de l'écran si le devis n'en dit rien", () => {
    const l = lecture("C02");
    const e0 = ecranDeLecture({ ref, lecture: l, answers: {}, preferences: {} });
    expect(e0.suggestions.find((s) => s.key === CASE)).toMatchObject({ label: "Chatières (ventilation de la toiture)", categorie: "Ventilation" });
    const answers: Record<string, EngineAnswer> = { [SUGGESTIONS_KEY]: CASE };
    let e = ecranDeLecture({ ref, lecture: l, answers, preferences: {} });
    const ecran = e.questions.find((q) => /ecran_sous_toiture/.test(q.key));
    if (ecran) {
      expect(ecran.text).toBe("Écran sous toiture ?");
      answers[ecran.key] = { value: "2", unit: "u" };
      e = ecranDeLecture({ ref, lecture: l, answers, preferences: {} });
    }
    const chat = e.purchase.toBuy.find((b) => /^Chatières/.test(b.label))!;
    expect(chat, JSON.stringify(e.purchase.toBuy.map((b) => b.label))).toBeDefined();
    // C02 : 120 m² à 30°, sans écran : 120 × cos 30° = 103,9 m² projetés × 1/3000 = 346 cm² ÷ 50 cm² (HP 10) = 6,9 → 8.
    expect(chat.quantity).toBe("8 pièces");
    expect(Number(chat.quantity!.split(" ")[0]) % 2).toBe(0);
    expect(e.questions.some((q) => /chatiere/.test(q.key))).toBe(false);
  });
});
