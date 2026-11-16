import { describe, expect, it } from "vitest";
import { interpreterReponsesNumerotees, phraseNotee, questionEnMotsSimples, type QuestionNumerotee } from "../src/index.js";

/**
 * LA DISCUSSION DES QUESTIONS (Greg, 16 novembre 2026, retour de test sur le zinc à joint debout) : « L'IA comprend les
 * réponses brèves, et plusieurs réponses d'un coup, par le sens et par l'ordre. Mon test : aux 6 questions j'ai répondu
 * "J'achète tout fait, 0,65, 1, chevron, ou je pli, bord de mer". Attendu : bacs commandés façonnés, 0,65 mm, 1 descente,
 * crochets sur chevrons, rive que je plie moi-même, bord de mer. » Lecture par le code, zéro appel IA.
 */
const zone = questionEnMotsSimples("param:zone", "Zone climatique ?", [
  { label: "Intérieur des terres", value: "1" },
  { label: "À 20–40 km de la mer, ou 200–500 m d'altitude", value: "2" },
  { label: "Bord de mer, ou plus de 500 m", value: "3" },
]);

const QUESTIONS: QuestionNumerotee[] = [
  { numero: 1, cle: "param:faconnage@joint-debout", texte: "Tu façonnes tes bacs toi-même, ou tu les commandes façonnés ?", options: [{ label: "Je façonne (bobines)", value: "1" }, { label: "Je commande façonné (bacs)", value: "2" }], unite: null, libre: "written" },
  { numero: 2, cle: "param:epaisseur_zinc", texte: "Épaisseur du zinc ?", options: [{ label: "0,65 mm", value: "0.65" }, { label: "0,70 mm", value: "0.7" }, { label: "0,80 mm", value: "0.8" }], unite: "mm", libre: "number" },
  { numero: 3, cle: "param:nb_descentes", texte: "Combien de descentes pour cette gouttière ?", options: [], unite: "u", numerique: true },
  { numero: 4, cle: "param:pose_crochets", texte: "Tes crochets de gouttière, tu les poses où ?", options: [{ label: "Sur les chevrons", value: "1" }, { label: "En façade (bandeau)", value: "2" }], unite: null, libre: "written" },
  { numero: 5, cle: "param:faconnage@bandes-zinc__12", texte: "Bande de rive zinc : tu façonnes toi-même ou tu commandes façonné ?", options: [{ label: "Je façonne", value: "1" }, { label: "Je commande façonné", value: "2" }], unite: null, libre: "written" },
  { numero: 6, cle: "param:zone", texte: zone.texte, options: zone.options, unite: "u" },
];

const lus = (texte: string, questions = QUESTIONS) => interpreterReponsesNumerotees(questions, texte).map((r) => (r.statut === "compris" ? r.libelle : null));

describe("la discussion des questions comprend les réponses brèves", () => {
  it("le cas de Greg : six réponses d'un coup, par le sens et par l'ordre", () => {
    expect(lus("J'achète tout fait, 0,65, 1, chevron, ou je pli, bord de mer")).toEqual(["Je commande façonné (bacs)", "0,65 mm", "1", "Sur les chevrons", "Je façonne", "Bord de mer"]);
  });

  it("d'autres réponses courtes du même genre", () => {
    expect(lus("je plie, 0,70, 2, bandeau, tout fait, montagne")).toEqual(["Je façonne (bobines)", "0,70 mm", "2", "En façade (bandeau)", "Je commande façonné", "Montagne"]);
    expect(lus("tout prêt\n0,8\n3\nsur chevrons\nmoi-même\nintérieur des terres")).toEqual(["Je commande façonné (bacs)", "0,80 mm", "3", "Sur les chevrons", "Je façonne", "Intérieur des terres"]);
    // Dans le désordre et incomplet : chaque morceau va à la question dont il nomme un bouton, le reste n'est pas inventé.
    expect(lus("bord de mer et chevron")).toEqual([null, null, null, "Sur les chevrons", null, "Bord de mer"]);
    // Une seule réponse, courte : elle va à la question posée.
    expect(lus("je pli")[0]).toBe("Je façonne (bobines)");
    expect(lus("0,65", QUESTIONS.slice(1))[0]).toBe("0,65 mm");
  });

  it("deux façonnages dits d'un coup : le premier pour la première pièce, le second pour la suivante", () => {
    expect(lus("j'achète tout fait, je plie", [QUESTIONS[0]!, QUESTIONS[4]!])).toEqual(["Je commande façonné (bacs)", "Je façonne"]);
    expect(lus("je plie et après tout fait", [QUESTIONS[0]!, QUESTIONS[3]!, QUESTIONS[4]!])).toEqual(["Je façonne (bobines)", null, "Je commande façonné"]);
  });

  it("rien n'est inventé : un mot inconnu ou un nombre de trop ne devient jamais une réponse", () => {
    expect(lus("bof", QUESTIONS.slice(1))).toEqual([null, null, null, null, null]);
    // « 1 » seul n'est jamais pris pour le bouton caché n° 1 (« Je façonne ») d'une autre question.
    expect(lus("1", [QUESTIONS[3]!, QUESTIONS[2]!])).toEqual([null, "1"]);
  });

  it("une réponse écrite n'est jamais rabattue sur un bouton qui partage le mot de la question", () => {
    const ardoise: QuestionNumerotee = { numero: 1, cle: "product:ardoise", texte: "Quelle ardoise : origine et choix ?", options: [{ label: "Espagne 1er choix", value: "es1" }, { label: "Ardoise NF (type Cupa)", value: "nf" }], unite: null, libre: "text" };
    expect(lus("Ardoise d'Angers", [ardoise, QUESTIONS[3]!])).toEqual(["Ardoise d'Angers", null]);
    expect(lus("cupa", [ardoise])).toEqual(["Ardoise NF (type Cupa)"]);
    expect(lus("espagne", [ardoise])).toEqual(["Espagne 1er choix"]);
  });

  it("des mots simples : « Ton chantier est où ? », jamais « Zone climatique »", () => {
    expect(zone.texte).toBe("Ton chantier est où ?");
    expect(zone.options.map((o) => o.label)).toEqual(["Bord de mer", "Intérieur des terres", "Montagne", "Entre les deux"]);
    // Les valeurs du calcul ne changent pas : bord de mer et montagne sont la même zone du référentiel.
    expect(zone.options.map((o) => o.value)).toEqual(["3", "1", "3", "2"]);
    expect(JSON.stringify(zone)).not.toMatch(/Zone climatique|500 m/);
  });

  it("la confirmation tient en une ligne", () => {
    expect(phraseNotee(["Je commande façonné (bacs)", "0,65 mm"])).toBe("Noté : Je commande façonné (bacs), 0,65 mm.");
    expect(phraseNotee([])).toBe("");
  });
});
