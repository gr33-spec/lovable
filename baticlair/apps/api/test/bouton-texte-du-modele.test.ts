import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LectureDevis } from "@baticlair/domain";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * Retour du fondateur (2026-10-12, capture iPhone, chantier SCI du Trégor) : « Un champ n'est pas correctement rempli »
 * en haut de l'écran des questions, après « En façade (bandeau) » sur « Les crochets de gouttière, tu les fixes sur les
 * chevrons ou en façade sur le bandeau ? ». Le modèle avait donné à ses boutons des valeurs en mots (« chevrons »,
 * « bandeau ») au lieu des valeurs du référentiel (« 1 », « 2 ») : le serveur attendait un nombre. Un bouton du modèle
 * se ramène à la valeur du référentiel ; un refus nomme toujours la réponse fautive (`reponses.N`), jamais seulement
 * « un champ ».
 */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

async function chantier() {
  const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
  await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Trégor", lignes: [{ libelle: "Gouttière zinc demi-ronde dév. 33", quantite: "20", unite: "ml" }] }).expect(201)).body as { id: string; projetId: string };
  const row = await ctx.prisma.quantitatif.findUniqueOrThrow({ where: { id: q.id } });
  const record = await ctx.prisma.takeoff.findUniqueOrThrow({ where: { id: row.takeoffId! } });
  const lecture = record.lecture as unknown as LectureDevis;
  // La question telle que le modèle l'a rendue en production : boutons en mots.
  lecture.questions = [
    { cle: "fixation_crochet", texte: "Les crochets de gouttière, tu les fixes sur les chevrons ou en façade sur le bandeau ?", boutons: [{ label: "Sur les chevrons", valeur: "chevrons" }, { label: "En façade (bandeau)", valeur: "bandeau" }], unite: "", donnee: "pose des crochets", ligne: null },
  ];
  await ctx.prisma.takeoff.update({ where: { id: record.id }, data: { lecture: lecture as unknown as object } });
  return { agent, q };
}

describe("un bouton du modèle en mots passe, et un refus se dit sur sa carte", () => {
  // RÈGLE CHANGÉE (Greg, 20 novembre 2026) : les questions sont décidées par le code. La pose des crochets ne se demande que
  // si le calcul en a besoin (des crochets écrits ou cochés) ; ici le devis n'écrit que la gouttière : la question du modèle
  // n'est pas posée. Avant : elle était posée, avec ses boutons ramenés aux valeurs du référentiel.
  it("la question du modèle sur une donnée de la fiche n'est posée que si le calcul en a besoin", async () => {
    const { agent, q } = await chantier();
    const ecran = (await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`).expect(200)).body as { questions: { id: string; texte: string }[] };
    expect(ecran.questions.filter((x) => x.id.includes("fixation_crochet") || /bandeau/.test(x.texte))).toEqual([]);
  });

  it("même envoyé en mots (« bandeau »), la réponse passe ; une réponse illisible est refusée sur sa carte (reponses.N)", async () => {
    const { agent, q } = await chantier();
    const ok = await agent.post(`/v1/quantitatifs/${q.id}/reponses?ecran=1`).send({ reponses: [{ question: "param:fixation_crochet", valeur: "bandeau", unite: "u" }] });
    expect(ok.status, JSON.stringify(ok.body)).toBe(201);
    const ko = await agent.post(`/v1/quantitatifs/${q.id}/reponses?ecran=1`).send({ reponses: [{ question: "param:pente", valeur: "3", unite: "°" }, { question: "role:not-a-uuid", valeur: "x" }] });
    expect(ko.status).toBe(400);
    expect(JSON.stringify(ko.body)).toMatch(/reponses\.1\./);
  });
});
