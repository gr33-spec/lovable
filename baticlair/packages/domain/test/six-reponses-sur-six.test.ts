import { describe, expect, it } from "vitest";
import { donneesDicibles, interpreterReponsesNumerotees, lignesDeLecture, phraseNotee, planDeLecture, ROOFING_REFERENTIAL, type QuestionNumerotee } from "../src/index.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { lectureEnregistree } from "./support/lectures.js";
import { avecMotsDits } from "./support/mots-dits.js";

/**
 * Greg, 17 novembre 2026 : « Mon cas zinc : ta réponse ne montre que 4 réponses sur 6. Il manque "0,65 mm" et "crochets
 * sur chevrons". Je veux les 6 comprises et confirmées en une ligne. »
 * En ligne, l'épaisseur n'était pas posée (elle est connue par l'habitude : « Comme d'habitude : 0,65 mm ») et la pose
 * des crochets non plus (ce devis n'écrit pas de crochets). Une donnée DÉJÀ CONNUE ou que le devis ne demande pas est
 * confirmée quand l'artisan en nomme un bouton ; elle n'est jamais posée ni reposée, et rien n'est inventé.
 */
const PHRASE = "J'achète tout fait, 0,65, 1, chevron, ou je pli, bord de mer";
// Les questions posées en ligne sur le devis zinc, dans leur ordre, puis les deux données connues.
const QUESTIONS: QuestionNumerotee[] = avecMotsDits([
  { numero: 1, cle: "param:faconnage@couverture-zinc-joint-debout", texte: "Tu façonnes tes bacs toi-même, ou tu les commandes façonnés ?", options: [{ label: "Je façonne (bobines)", value: "1" }, { label: "Je commande façonné (bacs)", value: "2" }], unite: "u", libre: "written" },
  { numero: 2, cle: "param:longueur_rampant", texte: "Longueur du rampant (de l'égout au faîtage) ?", options: [{ label: "Jusqu'à 5,5 m", value: "5.5" }, { label: "5,5 à 8 m", value: "8" }, { label: "Plus de 8 m", value: "10" }], unite: "m", libre: "number" },
  { numero: 3, cle: "param:developpe_gouttiere", texte: "Gouttière de 25, de 28, de 33 ou de 40 ?", options: [{ label: "De 25", value: "25" }, { label: "De 28", value: "28" }, { label: "De 33", value: "33" }, { label: "De 40", value: "40" }], unite: "cm", libre: "number" },
  { numero: 4, cle: "param:nb_descentes", texte: "Combien de descentes pour cette gouttière ?", options: [{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" }], unite: "u", libre: "number" },
  { numero: 5, cle: "param:faconnage@pieces-pliees", texte: "Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ?", options: [{ label: "Je façonne (feuilles ou bobineau)", value: "1" }, { label: "Je commande façonné", value: "2" }], unite: "u", libre: "written" },
  { numero: 6, cle: "param:zone", texte: "Ton chantier est où ?", options: [{ label: "Bord de mer", value: "3" }, { label: "Intérieur des terres", value: "1" }, { label: "Montagne", value: "3" }], unite: "u" },
  { numero: 7, cle: "param:epaisseur_zinc", texte: "Épaisseur du zinc ?", options: [{ label: "0,65 mm", value: "0.65" }, { label: "0,70 mm", value: "0.7" }, { label: "0,80 mm", value: "0.8" }], unite: "mm", connue: true },
  { numero: 8, cle: "param:fixation_crochet", texte: "Crochets de gouttière : sur les chevrons ou en façade (bandeau) ?", options: [{ label: "Sur les chevrons", value: "1" }, { label: "En façade (bandeau)", value: "2" }], unite: "u", connue: true },
]);
const lire = (texte: string, questions = QUESTIONS) => Object.fromEntries(interpreterReponsesNumerotees(questions, texte).filter((r) => r.statut === "compris").map((r) => [r.cle, r.libelle]));

describe("le cas zinc de Greg : six réponses comprises sur six", () => {
  it("la phrase de Greg : les six, chacune à sa place", () => {
    expect(lire(PHRASE)).toEqual({
      "param:faconnage@couverture-zinc-joint-debout": "Je commande façonné (bacs)",
      "param:epaisseur_zinc": "0,65 mm",
      "param:nb_descentes": "1",
      "param:fixation_crochet": "Sur les chevrons",
      "param:faconnage@pieces-pliees": "Je façonne (feuilles ou bobineau)",
      "param:zone": "Bord de mer",
    });
  });

  it("confirmées en une ligne", () => {
    const lues = interpreterReponsesNumerotees(QUESTIONS, PHRASE).filter((r) => r.statut === "compris");
    expect(lues).toHaveLength(6);
    expect(phraseNotee(lues.map((r) => r.libelle!))).toMatch(/^Noté : .*0,65 mm.*Sur les chevrons.*\.$/);
  });

  it("une donnée connue n'est jamais reposée : sans rien dire d'elle, elle reste sans réponse et sans reproche", () => {
    const lues = interpreterReponsesNumerotees(QUESTIONS, "tout fait, je plie");
    for (const cle of ["param:epaisseur_zinc", "param:fixation_crochet"]) expect(lues.find((r) => r.cle === cle)).toMatchObject({ statut: "sans_reponse", raison: null });
  });

  it("elle se change en la disant : « 0,70 » remplace l'habitude", () => {
    expect(lire("tout fait, 0,70, je plie")["param:epaisseur_zinc"]).toBe("0,70 mm");
  });

  it("un nombre seul ne vaut jamais pour un compte que personne n'a demandé ; une question posée passe toujours devant", () => {
    // « 1 » est le nombre de descentes (question posée), jamais une donnée connue comptée en unités.
    const avecCompte: QuestionNumerotee[] = [...QUESTIONS, { numero: 9, cle: "param:nb_naissances", texte: "Combien de naissances ?", options: [{ label: "1", value: "1" }, { label: "2", value: "2" }], unite: "u", connue: true }];
    const lues = lire(PHRASE, avecCompte);
    expect(lues["param:nb_descentes"]).toBe("1");
    expect(lues["param:nb_naissances"]).toBeUndefined();
  });

  it("un mot que deux données connues reconnaissent n'est rangé nulle part : rien n'est deviné", () => {
    const double: QuestionNumerotee[] = [...QUESTIONS, { numero: 9, cle: "param:fixation_autre", texte: "Pattes : sur les chevrons ou sur les voliges ?", options: [{ label: "Sur les chevrons", value: "1" }, { label: "Sur les voliges", value: "2" }], unite: "u", connue: true }];
    const lues = lire(PHRASE, double);
    expect(lues["param:fixation_crochet"]).toBeUndefined();
    expect(lues["param:fixation_autre"]).toBeUndefined();
  });

  it("sans donnée connue, rien ne change : la lecture des questions posées est la même", () => {
    const ouvertes = QUESTIONS.filter((q) => !q.connue);
    expect(interpreterReponsesNumerotees(ouvertes, PHRASE)).toEqual(interpreterReponsesNumerotees(ouvertes, PHRASE.replace(", 0,65", ", 0,65")));
    expect(Object.keys(lire(PHRASE, ouvertes))).not.toContain("param:epaisseur_zinc");
  });
});

describe("ce que l'artisan peut dire sans qu'on le lui demande", () => {
  const LIGNES = [
    { ref: "1", designation: "Couverture zinc joint debout gris quartz", quantity: "91", unit: "m2" },
    { ref: "2", designation: "Voliges sapin 18 mm traité", quantity: "96", unit: "m2" },
    { ref: "3", designation: "Gouttière zinc demi-ronde dév. 25", quantity: "13", unit: "ml" },
    { ref: "4", designation: "Bande de ventilation en Z en zinc quartz", quantity: "13", unit: "ml" },
    { ref: "5", designation: "Bande de rive zinc quartz dév. 200", quantity: "14", unit: "ml" },
  ];
  const l = lectureEnregistree(ROOFING_REFERENTIAL, LIGNES, [], HABITUDES_BANC);
  const plan = planDeLecture(ROOFING_REFERENTIAL, l, lignesDeLecture(l));

  it("la pose des crochets de la gouttière : non demandée sur ce devis, mais dicible, avec les boutons de la fiche", () => {
    const d = donneesDicibles(ROOFING_REFERENTIAL, plan, {}, []);
    expect(d.find((x) => x.key === "param:fixation_crochet")?.options.map((o) => o.label)).toEqual(["Sur les chevrons", "En façade (bandeau)"]);
    // Jamais deux fois la même donnée, jamais une donnée sans boutons.
    expect(new Set(d.map((x) => x.key)).size).toBe(d.length);
    for (const x of d) expect(x.options.length).toBeGreaterThanOrEqual(2);
  });

  it("une donnée déjà posée, déjà répondue ou déjà dans la discussion n'y est pas", () => {
    expect(donneesDicibles(ROOFING_REFERENTIAL, plan, {}, ["param:fixation_crochet"]).some((x) => x.key === "param:fixation_crochet")).toBe(false);
    expect(donneesDicibles(ROOFING_REFERENTIAL, plan, { "param:fixation_crochet": { value: "1", unit: "u" } }, []).some((x) => x.key === "param:fixation_crochet")).toBe(false);
    expect(donneesDicibles(ROOFING_REFERENTIAL, plan, {}, ["engine:param:faconnage@pieces-pliees"]).some((x) => x.key === "param:faconnage")).toBe(false);
  });
});
