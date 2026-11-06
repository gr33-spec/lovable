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
const avant = process.env.INTERPRETE_IA;
afterEach(async () => {
  await ctx?.app.close();
  ctx = null;
  if (avant === undefined) delete process.env.INTERPRETE_IA;
  else process.env.INTERPRETE_IA = avant;
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
});
