/**
 * Greg, 1er novembre 2026 : après l'analyse, MOBIIZ pose plusieurs questions numérotées dans un même message, l'artisan
 * répond librement en une fois, chaque réponse va à sa question, seules les questions ambiguës ou sans réponse sont
 * reposées ; jamais une quantité ni une caractéristique inventée ; unités vérifiées.
 */
import { describe, expect, it } from "vitest";
import { ETAPES_RELECTURE, interpreterReponsesNumerotees, messageDesQuestions, morceauxNumerotes, type QuestionNumerotee } from "../src/index.js";

const Q: QuestionNumerotee[] = [
  { numero: 1, cle: "param:materiau_descente", texte: "La descente, en quelle matière ?", options: [{ label: "Zinc", value: "zinc" }, { label: "PVC", value: "pvc" }, { label: "Alu", value: "alu" }], unite: null, libre: "text" },
  { numero: 2, cle: "param:diametre", texte: "Le Ø de la descente ?", options: [{ label: "Ø 80", value: "80" }, { label: "Ø 100", value: "100" }], unite: "mm", libre: "number" },
  { numero: 3, cle: "param:pente", texte: "La pente du toit ?", options: [{ label: "30°", value: "30" }, { label: "35°", value: "35" }, { label: "45°", value: "45" }], unite: "°", libre: "number" },
  { numero: 4, cle: "comptoir:003:1", texte: "Quelle tuile : modèle et teinte ?", options: [], unite: null, libre: "text" },
];

const par = (r: ReturnType<typeof interpreterReponsesNumerotees>, n: number) => r.find((x) => x.numero === n)!;

describe("réponses libres aux questions numérotées", () => {
  it("relie chaque morceau numéroté à sa question", () => {
    const r = interpreterReponsesNumerotees(Q, "1. zinc 2) 80 3 : 38° 4- H14 rouge vieilli");
    expect(par(r, 1)).toMatchObject({ statut: "compris", valeur: "zinc", libelle: "Zinc" });
    expect(par(r, 2)).toMatchObject({ statut: "compris", valeur: "80" });
    expect(par(r, 3)).toMatchObject({ statut: "compris", valeur: "38", libelle: "38°", libreEcrite: true });
    expect(par(r, 4)).toMatchObject({ statut: "compris", valeur: "H14 rouge vieilli" });
  });

  it("une ligne par réponse, dans l'ordre, sans numéros", () => {
    const r = interpreterReponsesNumerotees(Q, "pvc\n100\n45\nTuile plate rouge");
    expect(r.map((x) => x.valeur)).toEqual(["pvc", "100", "45", "Tuile plate rouge"]);
  });

  it("sans numéro, un morceau ne va qu'à la seule question dont il nomme un bouton ; le reste n'est pas inventé", () => {
    const r = interpreterReponsesNumerotees(Q, "en zinc, et la pente 45°");
    expect(par(r, 1).valeur).toBe("zinc");
    expect(par(r, 3).valeur).toBe("45");
    expect(par(r, 2)).toMatchObject({ statut: "sans_reponse", valeur: null });
    expect(par(r, 4)).toMatchObject({ statut: "sans_reponse", valeur: null });
  });

  it("une unité qui ne va pas est reposée, jamais convertie en silence ; cm, mm et m se convertissent exactement", () => {
    const pente = interpreterReponsesNumerotees([Q[2]!], "35 %");
    expect(pente[0]).toMatchObject({ statut: "ambigu", valeur: null });
    expect(pente[0]!.raison).toContain("degrés");
    const diam = interpreterReponsesNumerotees([{ ...Q[1]!, options: [] }], "8 cm");
    expect(diam[0]).toMatchObject({ statut: "compris", valeur: "80", libelle: "80 mm" });
  });

  it("deux boutons nommés ou deux valeurs : la question est reposée", () => {
    expect(interpreterReponsesNumerotees([Q[0]!], "zinc ou alu")[0]).toMatchObject({ statut: "ambigu" });
    expect(interpreterReponsesNumerotees([{ ...Q[2]!, options: [] }], "30 ou 35")[0]).toMatchObject({ statut: "ambigu" });
  });

  it("« je ne sais pas » laisse la question sans réponse, avec sa raison", () => {
    const r = interpreterReponsesNumerotees(Q, "1. zinc 2. je sais pas");
    expect(par(r, 2)).toMatchObject({ statut: "sans_reponse", valeur: null });
    expect(par(r, 2).raison).toContain("à vérifier");
  });

  it("un nombre décimal ou un Ø ne coupe pas la réponse", () => {
    expect([...morceauxNumerotes("1. Ø 80 2. 1.5 m", 4)!.entries()]).toEqual([[1, "Ø 80"], [2, "1.5 m"]]);
    expect(morceauxNumerotes("zinc 2,5 m", 4)).toBeNull();
  });

  it("le message pose toutes les questions, numérotées, et la relance seulement celles qui restent", () => {
    const m = messageDesQuestions(Q);
    expect(m.split("\n")).toHaveLength(5);
    expect(m).toContain("1. La descente, en quelle matière ? (Zinc, PVC, Alu)");
    expect(messageDesQuestions([Q[1]!], true)).toBe("Il me manque encore une réponse :\n2. Le Ø de la descente ? (Ø 80, Ø 100)");
    expect(ETAPES_RELECTURE).toEqual(["Je relis tes réponses…", "Je vérifie les unités…", "Je mets à jour le quantitatif…"]);
  });

  it("le façonnage : « je façonne » choisit le bouton qui le dit, « bobine » le seul qui la nomme", () => {
    const q: QuestionNumerotee = { numero: 1, cle: "param:faconnage@faitage", texte: "Le faîtage, tu le façonnes ?", options: [{ label: "Je façonne (bobine)", value: "oui" }, { label: "Je le commande façonné", value: "non" }], unite: null };
    expect(interpreterReponsesNumerotees([q], "je façonne")[0]).toMatchObject({ statut: "compris", valeur: "oui" });
    expect(interpreterReponsesNumerotees([q], "bobine")[0]).toMatchObject({ statut: "compris", valeur: "oui" });
    expect(interpreterReponsesNumerotees([q], "commandé façonné")[0]).toMatchObject({ valeur: "non" });
  });
});
