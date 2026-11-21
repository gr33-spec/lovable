import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LectureDevis } from "@baticlair/domain";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * Retour du fondateur (2026-10-13, capture iPhone, chantier SCI Armor Immo) : « Cette réponse ne passe pas : choisis un
 * bouton ou réécris-la » sur « Je façonne (bobine) », un bouton que l'écran venait lui-même de proposer. Le modèle avait
 * écrit « bobine » au singulier et des valeurs en mots ; le référentiel dit « Je façonne (bobines) », valeur « 1 ».
 * RÈGLE PERMANENTE : chaque bouton montré à l'écran des questions est accepté par le serveur, un par un, puis le calcul part.
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

type Ecran = { questions: { id: string; boutons: { label: string; valeur: string }[]; unite?: string | null }[] };

async function chantier(boutons: { label: string; valeur: string }[]) {
  const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
  await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
  const q = (await agent
    .post("/v1/quantitatifs")
    .send({ reference: "Armor", lignes: [{ libelle: "Couverture zinc joint debout 0,65 mm", quantite: "60", unite: "m2" }, { libelle: "Gouttière zinc demi-ronde dév. 33", quantite: "20", unite: "ml" }] })
    .expect(201)).body as { id: string };
  const row = await ctx.prisma.quantitatif.findUniqueOrThrow({ where: { id: q.id } });
  const record = await ctx.prisma.takeoff.findUniqueOrThrow({ where: { id: row.takeoffId! } });
  const lecture = record.lecture as unknown as LectureDevis;
  const ligne = lecture.lignes.find((l) => /joint debout/i.test(l.designation))!;
  for (const f of ligne.fournitures) f.attend = [...new Set([...f.attend, "faconnage"])];
  // La question telle que le modèle l'a rendue en production : « bobine » au singulier, valeurs en mots.
  lecture.questions = [
    ...lecture.questions.filter((x) => x.cle !== "faconnage"),
    { cle: "faconnage", texte: "La couverture joint debout : tu façonnes tes bacs toi-même en bobine ou tu les commandes façonnés ?", boutons, unite: "", donnee: "façonnage", ligne: ligne.ref },
  ];
  await ctx.prisma.takeoff.update({ where: { id: record.id }, data: { lecture: lecture as unknown as object } });
  return { agent, q };
}

const variantes = [
  [{ label: "Je façonne (bobine)", valeur: "bobine" }, { label: "Je commande façonné (bacs)", valeur: "bacs" }],
  [{ label: "Je façonne (bobine)", valeur: "je_faconne" }, { label: "Je commande façonné", valeur: "je_commande" }],
  [{ label: "Je façonne", valeur: "faconne" }, { label: "Commandé façonné", valeur: "commande" }],
];

describe("chaque bouton de l'écran des questions passe", () => {
  for (const boutons of variantes) {
    it(`boutons du modèle ${boutons.map((b) => `« ${b.label} »/${b.valeur}`).join(", ")}`, async () => {
      const { agent, q } = await chantier(boutons);
      const ecran = (await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`).expect(200)).body as Ecran;
      const faconnage = ecran.questions.find((x) => x.id.includes("faconnage"));
      expect(faconnage?.boutons.map((b) => b.valeur)).toEqual(["1", "2"]);
      // Tous les boutons de toutes les questions, un par un.
      for (const question of ecran.questions) {
        for (const b of question.boutons) {
          const res = await agent.post(`/v1/quantitatifs/${q.id}/reponses?ecran=1`).send({ reponses: [{ question: question.id, valeur: b.valeur, ...(question.unite ? { unite: question.unite } : {}) }] });
          expect(res.status, `${question.id} → ${b.label} : ${JSON.stringify(res.body)}`).toBe(201);
        }
      }
      // Puis le calcul, avec le premier bouton de chaque question.
      const reponses = ecran.questions.filter((x) => x.boutons.length > 0).map((x) => ({ question: x.id, valeur: x.boutons[0]!.valeur, ...(x.unite ? { unite: x.unite } : {}) }));
      const res = await agent.post(`/v1/quantitatifs/${q.id}/calcul?ecran=1`).send({ reponses });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
    });
  }
});
