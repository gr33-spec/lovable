import { describe, expect, it } from "vitest";
import { interpreterReponsesNumerotees, sansNombreNuHorsBouton, type QuestionNumerotee } from "../src/assistant/reponses-libres-numerotees.js";
import { avecMotsDits } from "./support/mots-dits.js";
import { validerInterpretation } from "../src/assistant/interpretation-ia.js";

/**
 * Recette en ligne du 16 novembre 2026 (devis zinc joint debout de Greg). L'épaisseur était déjà connue et le nombre de
 * descentes pas encore demandé : « 0,65 » et « 1 » ont été rangés, par l'ordre, comme un rampant de 0,65 m et une gouttière
 * de 1 cm. Règle : un nombre nu rangé par l'ordre n'est jamais pris pour une question à boutons dont il n'est aucun bouton ;
 * cette question est reposée, seule. Rien n'est inventé.
 */
const questions: QuestionNumerotee[] = avecMotsDits([
  { numero: 1, cle: "param:faconnage@couverture-zinc-joint-debout", texte: "Tu façonnes tes bacs toi-même ou tu les commandes façonnés ?", options: [{ value: "1", label: "Je façonne (bobines)" }, { value: "2", label: "Je commande façonné (bacs)" }], unite: "u" },
  { numero: 2, cle: "param:longueur_rampant", texte: "Longueur du rampant (de l'égout au faîtage) ?", options: [{ value: "5.5", label: "Jusqu'à 5,5 m" }, { value: "8", label: "5,5 à 8 m" }, { value: "10", label: "Plus de 8 m" }], unite: "m", libre: "number" },
  { numero: 3, cle: "param:developpe_gouttiere", texte: "Gouttière de 25, de 28, de 33 ou de 40 ?", options: [{ value: "25", label: "De 25" }, { value: "28", label: "De 28" }, { value: "33", label: "De 33" }, { value: "40", label: "De 40" }], unite: "cm", libre: "number" },
  { numero: 4, cle: "fiche:fixation", texte: "Crochets sur les chevrons ou en façade ?", options: [{ value: "chevrons", label: "Sur les chevrons" }, { value: "bandeau", label: "En façade (bandeau)" }], unite: null },
  { numero: 5, cle: "param:faconnage@bandes-zinc__4", texte: "Habillage de rive : tu le façonnes ou tu le commandes façonné ?", options: [{ value: "1", label: "Je façonne (feuilles ou bobineau)" }, { value: "2", label: "Je commande façonné" }], unite: "u" },
  { numero: 6, cle: "param:zone", texte: "Ton chantier est où ?", options: [{ value: "3", label: "Bord de mer" }, { value: "1", label: "Intérieur des terres" }, { value: "2", label: "Montagne" }], unite: "u" },
]);
const PHRASE = "J'achète tout fait, 0,65, 1, chevron, ou je pli, bord de mer";

/** Les six questions posées en ligne le 16 novembre 2026 sur le devis zinc (relevées en base de test), dans leur ordre. */
const enLigne: QuestionNumerotee[] = avecMotsDits([
  questions[0]!,
  questions[1]!,
  { ...questions[2]!, numero: 3 },
  { numero: 4, cle: "param:nb_descentes", texte: "Combien de descentes sur cette gouttière ?", options: [{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }], unite: "u", libre: "written" },
  questions[4]!,
  questions[5]!,
]);

describe("plusieurs réponses d'un coup : une réponse qui nomme un bouton est prise (Greg, 16 novembre 2026, soir)", () => {
  it("la phrase de Greg sur les questions réellement posées en ligne : « 1 » est le nombre de descentes", () => {
    const lues = interpreterReponsesNumerotees(enLigne, PHRASE);
    const de = (n: number) => lues.find((r) => r.numero === n)!;
    expect(de(1)).toMatchObject({ statut: "compris", valeur: "2" });
    expect(de(4)).toMatchObject({ statut: "compris", valeur: "1", libreEcrite: false });
    expect(de(5)).toMatchObject({ statut: "compris", valeur: "1" });
    expect(de(6)).toMatchObject({ statut: "compris", valeur: "3" });
    // Ni rampant de 0,65 m ni gouttière de 1 cm : ces deux questions reviennent, avec leurs boutons.
    expect(de(2).statut).not.toBe("compris");
    expect(de(3).statut).not.toBe("compris");
  });

  it("« chevron » n'est jamais un nombre de descentes, même rendu par le modèle", () => {
    const lues = validerInterpretation(enLigne, PHRASE, { reponses: [{ numero: 4, statut: "compris", valeur: "chevron" }] });
    expect(lues.find((r) => r.numero === 4)!.statut).not.toBe("compris");
  });
});

describe("plusieurs réponses d'un coup : un nombre nu n'est jamais pris pour une question à boutons dont il n'est aucun bouton", () => {
  it("la phrase de Greg, quand l'épaisseur et les descentes ne sont pas posées : ni rampant de 0,65 m, ni gouttière de 1 cm", () => {
    const lues = interpreterReponsesNumerotees(questions, PHRASE);
    const de = (n: number) => lues.find((r) => r.numero === n)!;
    expect(de(1)).toMatchObject({ statut: "compris", valeur: "2" });
    expect(de(2).statut).not.toBe("compris");
    expect(de(3).statut).not.toBe("compris");
    expect(de(6)).toMatchObject({ statut: "compris", valeur: "3" });
  });

  it("le modèle ne passe pas non plus : sa réponse est reposée", () => {
    const lues = validerInterpretation(questions, PHRASE, { reponses: [{ numero: 2, statut: "compris", valeur: "0.65" }, { numero: 3, statut: "compris", valeur: "1" }] });
    expect(lues.find((r) => r.numero === 2)!.statut).toBe("ambigu");
    expect(lues.find((r) => r.numero === 3)!.statut).toBe("ambigu");
  });

  it("le nombre est pris quand il nomme un bouton, quand l'unité est écrite, ou quand la réponse est seule", () => {
    const lues = interpreterReponsesNumerotees(questions, "tout fait, 6,2 m, de 33, chevron, je plie, bord de mer");
    expect(lues.find((r) => r.numero === 2)).toMatchObject({ statut: "compris", valeur: "6.2" });
    expect(lues.find((r) => r.numero === 3)).toMatchObject({ statut: "compris", valeur: "33" });
    expect(interpreterReponsesNumerotees([questions[1]!], "6,2")[0]).toMatchObject({ statut: "compris", valeur: "6.2" });
    const seule = [{ numero: 2, cle: questions[1]!.cle, statut: "compris" as const, valeur: "6.2", libelle: "6,2 m", libreEcrite: true, raison: null }];
    expect(sansNombreNuHorsBouton(questions, "6,2", seule)[0]!.statut).toBe("compris");
  });
});
