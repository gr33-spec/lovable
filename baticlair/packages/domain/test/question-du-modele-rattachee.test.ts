/**
 * Recette en ligne du 16 novembre 2026 (zinc à joint debout D-2026-018, vraie lecture, petit iPhone) : le modèle a demandé
 * le façonnage sous une clé à lui (« faconnage_joint_debout »). Greg y a répondu ; le calcul a quand même reposé « Couverture
 * zinc à joint debout : tu façonnes toi-même ou tu commandes façonné ? », et « Calculer ma liste » était refusé.
 * RÈGLE PERMANENTE : une clé du modèle qui prolonge une donnée à boutons du référentiel et dont la suite nomme un seul
 * ouvrage du devis est cette donnée, pour cet ouvrage. Sa réponse va au calcul : la question ne se pose qu'une fois (§49.4).
 */
import { describe, expect, it } from "vitest";
import { ecranDeLecture, lignesDeLecture, planDeLecture, rattacherQuestion, ROOFING_REFERENTIAL, type EngineAnswer, type LectureDevis, type LectureQuestion } from "../src/index.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { lectureEnregistree } from "./support/lectures.js";

const ref = ROOFING_REFERENTIAL;
const duModele: LectureQuestion = {
  cle: "faconnage_joint_debout",
  texte: "Joint debout : tu façonnes tes bacs toi-même en bobines ou tu les commandes façonnés ?",
  boutons: [
    { label: "Je façonne (bobines)", valeur: "bobines" },
    { label: "Je commande façonné (bacs)", valeur: "bacs" },
  ],
  unite: null,
  donnee: "façonnage du joint debout",
  ligne: null,
};
/** La lecture du devis, où la question de façonnage du joint debout est écrite comme le modèle l'a écrite en ligne. */
const lecture = (): LectureDevis => {
  const l = structuredClone(lectureEnregistree(ref, D2026_018_LINES, [], HABITUDES_BANC, {}));
  const plan = planDeLecture(ref, l, lignesDeLecture(l));
  const jointDebout = plan.lines.find((x) => x.status === "planned" && x.workItemId.startsWith("couverture-zinc-joint-debout"));
  const ligne = jointDebout?.ref.split(".")[0];
  return { ...l, questions: [duModele, ...l.questions.filter((q) => !(q.cle === "faconnage" && (q.ligne === null || q.ligne === ligne)))] };
};
const ecran = (answers: Record<string, EngineAnswer> = {}) => ecranDeLecture({ ref, lecture: lecture(), answers, preferences: {} });

describe("une question du modèle qui prolonge une donnée du référentiel est cette donnée", () => {
  it("« faconnage_joint_debout » est le façonnage de la couverture zinc à joint debout, avec les valeurs du référentiel", () => {
    const q = ecran().questions.find((x) => x.text === duModele.texte)!;
    expect(q.key).toMatch(/^param:faconnage(@couverture-zinc-joint-debout)?$/);
    expect(q.options).toEqual([
      { label: "Je façonne (bobines)", value: "1", dit: expect.arrayContaining(["je plie"]) },
      { label: "Je commande façonné (bacs)", value: "2", dit: expect.arrayContaining(["tout fait"]) },
    ]);
  });

  it("une fois répondue, le façonnage du joint debout ne se repose plus", () => {
    const q = ecran().questions.find((x) => x.text === duModele.texte)!;
    const apres = ecran({ [q.key]: { value: "2", unit: "u" } });
    expect(apres.questions.filter((x) => /^param:faconnage(@couverture-zinc-joint-debout)?$/.test(x.key))).toEqual([]);
    expect(apres.questions.some((x) => x.key.startsWith("fiche:faconnage"))).toBe(false);
  });

  it("jamais rattachée au hasard : une suite qui ne nomme aucun ouvrage du devis, ou une donnée sans boutons, reste telle quelle", () => {
    const l = lecture();
    const plan = planDeLecture(ref, l, lignesDeLecture(l));
    expect(rattacherQuestion(ref, plan, { ...duModele, cle: "faconnage_veranda" }).cle).toBe("faconnage_veranda");
    expect(rattacherQuestion(ref, plan, { ...duModele, cle: "teinte_de_la_tuile" }).cle).toBe("teinte_de_la_tuile");
    expect(rattacherQuestion(ref, plan, { ...duModele, cle: "faconnage" }).cle).toBe("faconnage");
  });

  // Essai en ligne du 16 novembre 2026 (soir, prompt version 6) : le modèle a demandé « Habillage de rive zinc : tu le façonnes
  // toi-même ou tu le commandes façonné ? » sous la clé « faconnage_rive », en visant sa ligne. Greg y a répondu ; le calcul a
  // reposé la même question pour cette pièce. La suite (« rive ») ne nomme aucun ouvrage, mais la LIGNE visée en nomme un seul.
  it("« faconnage_rive » qui vise la ligne d'une pièce de zinc est le façonnage de CETTE pièce, et ne se repose plus", () => {
    const l = lecture();
    const plan = planDeLecture(ref, l, lignesDeLecture(l));
    const piece = plan.lines.find((x) => x.status === "planned" && x.workItemId.startsWith("bandes-zinc__"))!;
    expect(piece.status).toBe("planned");
    const ligne = piece.ref.split(".")[0]!;
    const rive: LectureQuestion = { cle: "faconnage_rive", texte: "Habillage de rive zinc : tu le façonnes toi-même ou tu le commandes façonné ?", boutons: [{ label: "Je façonne (feuilles ou bobineau)", valeur: "1" }, { label: "Je commande façonné", valeur: "2" }], unite: null, donnee: "façonnage de l'habillage de rive", ligne };
    expect(rattacherQuestion(ref, plan, rive)).toMatchObject({ cle: "faconnage", ligne });
    // Sans ligne visée, ou sur une ligne dont l'ouvrage n'a pas cette donnée : jamais rattachée au hasard.
    expect(rattacherQuestion(ref, plan, { ...rive, ligne: null }).cle).toBe("faconnage_rive");
    expect(rattacherQuestion(ref, plan, { ...rive, ligne: "9:999" }).cle).toBe("faconnage_rive");
    const avec = { ...l, questions: [rive, ...l.questions.filter((q) => !(q.cle === "faconnage" && q.ligne === ligne))] };
    const e0 = ecranDeLecture({ ref, lecture: avec, answers: {}, preferences: {} });
    const q = e0.questions.find((x) => x.text === rive.texte)!;
    expect(q.key.startsWith("param:faconnage@bandes-zinc__")).toBe(true);
    const e1 = ecranDeLecture({ ref, lecture: avec, answers: { [q.key]: { value: "1", unit: "u" } }, preferences: {} });
    expect(e1.questions.filter((x) => x.key === q.key || x.key === "fiche:faconnage_rive")).toEqual([]);
  });
});
