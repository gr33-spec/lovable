/**
 * LOT 7 (Greg, 6 novembre 2026, prompt maître points 3 et 15) : `POST /v1/assistant/interpretation`. Éteinte par défaut,
 * l'IA ne coûte rien et le code seul répond ; allumée, elle ne reçoit que ce que le code n'a pas compris, et ce qu'elle
 * rend est revalidé (aucune valeur inventée). Ici le modèle est joué par son double (`AI_PROVIDER=fake`) : zéro appel payant.
 */
import { afterEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

const QUESTIONS = [
  { numero: 1, cle: "param:matiere", texte: "Ta descente, en PVC, en zinc ou en alu ?", options: [{ label: "PVC", value: "pvc" }, { label: "Zinc", value: "zinc" }, { label: "Alu", value: "alu" }], unite: null },
  { numero: 2, cle: "param:diametre", texte: "Quel diamètre ?", options: [], unite: "mm", numerique: true, libre: "number" },
  { numero: 3, cle: "fiche:teinte", texte: "Quelle teinte pour les tuiles ?", options: [], unite: null, libre: "written" },
];
const TEXTE = "pour la descente on part sur du métal gris pas le plastique, le tuyau fait 80, et les tuiles rouge vieilli";

let ctx: TestContext | null = null;
const avant = { INTERPRETE_IA: process.env.INTERPRETE_IA, INTERPRETE_IA_PLAFOND_APPELS: process.env.INTERPRETE_IA_PLAFOND_APPELS };
afterEach(async () => {
  await ctx?.app.close();
  ctx = null;
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

async function artisan(interprete: "on" | "off") {
  process.env.INTERPRETE_IA = interprete;
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
  return (await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"])).agent;
}

describe("l'interprétation IA des réponses libres", () => {
  it("éteinte (par défaut) : le code seul répond, rien n'est confié à l'IA", async () => {
    const agent = await artisan("off");
    const r = (await agent.post("/v1/assistant/interpretation").send({ questions: QUESTIONS, texte: TEXTE }).expect(200)).body;
    expect(r.ia).toBe(false);
    expect(r.reponses).toHaveLength(3);
    // « Métal gris » n'est pas un bouton : le code ne devine pas.
    expect(r.reponses[0].statut).not.toBe("compris");
  });

  it("allumée : l'IA rattache « métal gris » à Zinc et le nombre dit (l'invention refusée : test du domaine)", async () => {
    const agent = await artisan("on");
    const r = (await agent.post("/v1/assistant/interpretation").send({ questions: QUESTIONS, texte: TEXTE }).expect(200)).body;
    expect(r.ia).toBe(true);
    expect(r.reponses[0]).toMatchObject({ statut: "compris", valeur: "zinc", libelle: "Zinc" });
    expect(r.reponses[1]).toMatchObject({ statut: "compris", valeur: "80" });
    expect(r.reponses[2]).toMatchObject({ statut: "compris", valeur: "rouge vieilli" });
  });

  it("un corps invalide est refusé ; sans session, la route refuse", async () => {
    const agent = await artisan("on");
    expect((await agent.post("/v1/assistant/interpretation").send({ questions: [], texte: "x" })).status).toBe(400);
    expect((await agent.post("/v1/assistant/interpretation").send({ questions: QUESTIONS, texte: "x".repeat(2001) })).status).toBe(400);
  });

  it("le plafond (Greg, 7 novembre : 1 $ ou 500 interprétations) : chaque appel est journalisé ; au-delà, le code seul répond", async () => {
    process.env.INTERPRETE_IA_PLAFOND_APPELS = "2";
    const agent = await artisan("on");
    for (let i = 0; i < 2; i++) expect((await agent.post("/v1/assistant/interpretation").send({ questions: QUESTIONS, texte: TEXTE }).expect(200)).body.ia).toBe(true);
    // Le troisième dépasse le plafond : aucun appel, la lecture du code.
    expect((await agent.post("/v1/assistant/interpretation").send({ questions: QUESTIONS, texte: TEXTE }).expect(200)).body.ia).toBe(false);
    const journal = await ctx!.prisma.aiExecution.findMany({ where: { task: "interpretation_reponses" } });
    expect(journal).toHaveLength(2);
    expect(journal.every((j) => j.status === "success" && j.costMicroUsd > 0n)).toBe(true);
    // Une réponse que le code comprend seul n'appelle jamais l'IA (pas d'appel à chaque frappe).
    expect((await agent.post("/v1/assistant/interpretation").send({ questions: QUESTIONS.slice(0, 1), texte: "1. zinc" }).expect(200)).body.ia).toBe(false);
  });
});
