/**
 * §51.3, §51.6 (retour du fondateur, 2026-10-12, capture D.2026.105) : « à la vague de questions j'ai répondu la teinte
 * et la référence de la tuile. Écran 3 : la ligne « Tuile terre cuite mécanique, identique à l'existant · 20 pièces »
 * reste orange « Teinte à préciser », et la teinte/réf répondues n'apparaissent ni dans la désignation ni dans la
 * précision. […] C'est le même bug que « Finition à préciser » sur les crochets de DE00000071 et « Épaisseur à
 * préciser » : cherche la cause commune. Test permanent sur D.2026.105, DE00000071 et D-2026-018 : toutes questions
 * répondues = zéro orange, et chaque réponse lisible dans sa ligne. »
 *
 * LA CAUSE COMMUNE : le temps trois ne voyait qu'une partie des réponses : ni celles de la deuxième vague (questions
 * `fiche:<donnée>` ouvertes par la relecture, ajoutées par l'API après le calcul de la liste), ni celles que le calcul
 * n'attend plus (une question répondue sortait des questions « vivantes »). Toutes les réponses des deux vagues vont
 * maintenant à leur ligne (`reponsesDeLaLigne`) : elles ferment le sujet « à préciser » qu'elles tranchent et s'écrivent
 * dans la ligne.
 */
import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, DE00000071_LECTURE, ecranDeLecture, normalizeText, parseFiche, ROOFING_REFERENTIAL, type EngineAnswer, type LectureDevis, type PurchaseView } from "../src/index.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { answerAll } from "./support/lot-b.js";
import { lectureEnregistree } from "./support/lectures.js";

const ref = ROOFING_REFERENTIAL;
type A = Record<string, EngineAnswer>;
const run = (lecture: LectureDevis) => (answers: A) => applyRuleConfirmations(ecranDeLecture({ ref, lecture, answers, preferences: HABITUDES_BANC }).purchase, answers as never);
const oranges = (v: PurchaseView) =>
  v.screen.groups.flatMap((g) => g.rows).filter((r) => r.status === "check").map((r) => `${v.toBuy.find((b) => b.key === r.itemKey)?.label ?? r.key} (${r.reason ?? ""})`);
/** Ce que l'artisan lit sur la ligne : la désignation, la quantité, la précision. */
const lu = (v: PurchaseView, nom: RegExp) => {
  const b = v.toBuy.find((x) => nom.test(x.label));
  expect(b, `ligne ${nom}`).toBeTruthy();
  return normalizeText(`${b!.label} ${b!.quantity ?? ""} ${b!.precision ?? ""}`);
};
/** Tout répondre : l'écran des questions (premier bouton), puis les questions des lignes orange, jusqu'au vert. */
const toutRepondre = (go: (a: A) => PurchaseView, depart: A = {}) => {
  const answers: A = { ...depart, ...answerAll((a) => go({ ...depart, ...a })).answers };
  let last = go(answers);
  for (let round = 0; round < 5; round++) {
    const asks = last.toBuy.flatMap((b) => b.asks ?? []).filter((a) => answers[a.key] === undefined);
    if (asks.length === 0) break;
    for (const a of asks) answers[a.key] = a.options[0] ? (a.unit ? { value: a.options[0].value, unit: a.unit } : a.options[0].value) : "ok";
    last = go(answers);
  }
  return { last, answers };
};

/** D.2026.105 tel que le modèle le lit en production (capture du fondateur) : une tuile « à préciser », trois lignes sans fourniture. */
const d2026105 = (questions: LectureDevis["questions"]): LectureDevis => ({
  metier: "roofing",
  lots: [],
  fiche: parseFiche([{ donnee: "ouvrage", valeur: "réparation de couverture en tuiles terre cuite mécaniques", origine: "lue", preuve: "ligne 1" }])!,
  bref: ["Réparation de couverture en tuiles terre cuite mécaniques, pas de couverture neuve"],
  questions,
  lignes: [
    {
      ref: "1",
      designation: "Remplacement unitaire d'une tuile cassée ou défectueuse – Tuile terre cuite mécanique",
      quantite: "20",
      unite: "u",
      role: "fourniture_et_pose",
      fournitures: [{ nom: "Tuile terre cuite mécanique, identique à l'existant", quantite: "20", unite: "u", ouvrage: null, emplacement: null, donnees: {}, attend: [], aPreciser: ["teinte"], precision: null }],
    },
    { ref: "2", designation: "Repositionnement et alignement des tuiles déplacées sur le versant", quantite: "1.5", unite: "h", role: "pose", fournitures: [] },
    { ref: "3", designation: "Refixation de l'élément de rive arraché, petites fournitures de fixation comprises", quantite: "1", unite: "u", role: "pose", fournitures: [] },
    { ref: "4", designation: "Évacuation des tuiles cassées et déchets vers un centre de tri", quantite: "1", unite: "fft", role: "hors_quantitatif", fournitures: [] },
  ],
  contexte: {},
  notes: [],
});
const TUILE = /^Tuile terre cuite/;

describe("§51.6 : chaque réponse du temps deux va à sa ligne, qui passe au vert", () => {
  it("D.2026.105, première vague : teinte et référence répondues sur la ligne → la tuile est verte et les porte", () => {
    const lecture = d2026105([
      { cle: "teinte_tuile", texte: "Tuile : quelle teinte ?", boutons: [], unite: null, donnee: "teinte de la tuile", ligne: "1" },
      { cle: "reference_tuile", texte: "Tuile : quelle référence (marque, modèle) ?", boutons: [], unite: null, donnee: "référence de la tuile", ligne: "1" },
    ]);
    const go = run(lecture);
    expect(oranges(go({}))).toEqual(["Tuile terre cuite mécanique, identique à l'existant (Teinte à préciser)"]);
    const v = go({ "fiche:teinte_tuile": "Rouge vieilli", "fiche:reference_tuile": "Huguenot H10" });
    expect(oranges(v)).toEqual([]);
    expect(lu(v, TUILE)).toContain(normalizeText("Rouge vieilli"));
    expect(lu(v, TUILE)).toContain(normalizeText("Huguenot H10"));
  });

  it("D.2026.105, question du chantier sur le modèle (« quel modèle et quelle teinte ? ») : la réponse ferme « teinte » et s'écrit", () => {
    const lecture = d2026105([{ cle: "modele_tuile", texte: "Quelle tuile : modèle et teinte ?", boutons: [], unite: null, donnee: "modèle de tuile", ligne: null }]);
    const v = run(lecture)({ "fiche:modele_tuile": "Huguenot H10 rouge vieilli" });
    expect(oranges(v)).toEqual([]);
    expect(lu(v, TUILE)).toContain(normalizeText("Huguenot H10 rouge vieilli"));
  });

  it("D.2026.105, deuxième vague (question ouverte par la relecture, dans la fiche) : la réponse va à la tuile", () => {
    const lecture = d2026105([]);
    lecture.fiche = { donnees: [...lecture.fiche.donnees, { cle: "teinte_de_la_tuile", libelle: "Teinte de la tuile", valeur: null, origine: "manquante", question: "Quelle teinte pour la tuile ?" }] };
    const v = run(lecture)({ "fiche:teinte_de_la_tuile": "Rouge vieilli" });
    expect(oranges(v)).toEqual([]);
    expect(lu(v, TUILE)).toContain(normalizeText("Rouge vieilli"));
  });

  it("D.2026.105 : une question retirée (null) laisse la tuile orange avec sa question (§51.6)", () => {
    const lecture = d2026105([{ cle: "teinte_tuile", texte: "Tuile : quelle teinte ?", boutons: [], unite: null, donnee: "teinte de la tuile", ligne: "1" }]);
    const v = run(lecture)({ "fiche:teinte_tuile": null });
    expect(oranges(v)).toHaveLength(1);
    expect(v.toBuy.find((b) => TUILE.test(b.label))!.asks?.length).toBeGreaterThan(0);
  });

  it("DE00000071 : « Finition à préciser » sur les crochets, tranchée à la deuxième vague → verte, « Inox » sur la ligne ; tout répondu = zéro orange", () => {
    const lecture = structuredClone(DE00000071_LECTURE);
    const crochets = lecture.lignes.flatMap((l) => l.fournitures).find((f) => /crochet/i.test(f.nom))!;
    crochets.aPreciser = ["finition"];
    crochets.nom = "Crochets de gouttière Négrafix";
    lecture.fiche = { donnees: [...lecture.fiche.donnees, { cle: "finition_crochets", libelle: "Finition des crochets", valeur: null, origine: "manquante", question: "Crochets Négrafix : galva, inox ou cuivre ?", boutons: [{ label: "Galva", valeur: "galva" }, { label: "Inox", valeur: "inox" }, { label: "Cuivre", valeur: "cuivre" }] }] };
    const go = run(lecture);
    const { last } = toutRepondre(go, { "fiche:finition_crochets": "inox" });
    expect(oranges(last)).toEqual([]);
    expect(lu(last, /^Crochets/)).toContain("inox");
  });

  it("DE00000071 : chaque réponse de la première vague se lit dans sa ligne", () => {
    const go = run(DE00000071_LECTURE);
    const answers: A = { "param:developpe_gouttiere": { value: "33", unit: "cm" }, "param:nb_descentes": { value: "2", unit: "u" }, "fiche:cheneau_membrane": "EPDM", "fiche:raccord_velux": "ZWC", "fiche:toles_bac_acier": "10 tôles" };
    const { last } = toutRepondre(go, answers);
    expect(oranges(last)).toEqual([]);
    expect(lu(last, /^Gouttière/)).toMatch(/33/);
    expect(lu(last, /^Membrane/)).toContain("epdm");
    expect(lu(last, /^Raccords SK06/)).toContain("zwc");
    expect(lu(last, /^Tôles/)).toContain("10 toles");
  });

  it("D-2026-018 : une épaisseur et une teinte « à préciser » ; l'épaisseur écrite (0,65 mm) ne se demande pas, la teinte répondue en deuxième vague va à ses lignes ; zéro orange", () => {
    const lecture = structuredClone(lectureEnregistree(ref, D2026_018_LINES, [], HABITUDES_BANC, {}));
    const zinc = lecture.lignes.flatMap((l) => l.fournitures).filter((f) => /zinc/i.test(f.nom));
    expect(zinc.length).toBeGreaterThan(0);
    for (const f of zinc) f.aPreciser = ["épaisseur", "teinte du zinc"];
    lecture.fiche = { donnees: [...lecture.fiche.donnees, { cle: "teinte_zinc", libelle: "Teinte du zinc", valeur: null, origine: "manquante", question: "Quelle teinte pour le zinc ?", boutons: [] }] };
    const { last } = toutRepondre(run(lecture), { "fiche:teinte_zinc": "Quartz-Zinc gris ardoise" });
    expect(oranges(last)).toEqual([]);
    const lignesZinc = last.toBuy.filter((x) => /zinc/i.test(x.label));
    expect(lignesZinc.length).toBeGreaterThan(0);
    for (const b of lignesZinc) {
      expect(normalizeText(`${b.label} ${b.precision ?? ""}`), b.label).toContain("gris ardoise");
      // L'épaisseur écrite dans le nom ne se redit jamais « au choix du fournisseur ».
      if (/0,65 mm/.test(b.label)) expect(b.precision ?? "", b.label).not.toMatch(/paisseur/i);
    }
  });
});
