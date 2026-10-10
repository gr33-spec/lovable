import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * §50.7 (fondateur, 2026-10-10) : « L'écran 3 est le document » : après les questions, « Ton chantier », présenté comme le
 * document que le fournisseur recevra. « Le chantier en bref » en haut : chaque ligne se modifie ou se supprime comme une
 * ligne de la liste. Test : « le document envoyé au fournisseur est identique à l'écran ».
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

const LIGNES = [
  { libelle: "Couverture zinc à joint debout prépatiné gris quartz 0,65 mm, monopente, rampant 7 m, largeur 13 m", quantite: "91", unite: "m²" },
  { libelle: "Bande zinc d'égout", quantite: "13", unite: "ml" },
];

async function chantier() {
  const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
  await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Test", adresse: "18 rue de Siam, 29200 Brest", lignes: LIGNES })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const supplier = (await agent.post("/v1/suppliers").send({ name: "Négoce test", email: "devis@example.com" })).body;
  const bref = async () => (await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`).expect(200)).body.ecran.bref as { cle: string; texte: string }[];
  return { agent, id: q.id as string, projectId: q.projetId as string, supplierId: supplier.id as string, bref };
}

describe("§50.7 : « Ton chantier », l'écran est le document", () => {
  it("le bref de l'écran est celui que reçoit le fournisseur, ligne pour ligne", async () => {
    const { agent, projectId, supplierId, bref } = await chantier();
    const screen = await bref();
    expect(screen.map((l) => l.texte)).toEqual(["Couverture zinc à joint debout", "91 m² en monopente", "rampant 7 m", "largeur 13 m", "zinc prépatiné gris quartz 0,65 mm", "Brest, bord de mer"]);
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] }).expect(201)).body;
    expect(created.packet.resume).toEqual(screen.map((l) => l.texte));
  });

  it("une ligne du bref se corrige ou se retire d'un geste, à l'écran comme chez le fournisseur", async () => {
    const { agent, id, projectId, supplierId, bref } = await chantier();
    const [first, second] = await bref();
    await agent.post(`/v1/quantitatifs/${id}/corrections`).send({ action: "bref", cle: first!.cle, texte: "Couverture zinc joint debout, versant nord" }).expect(201);
    await agent.post(`/v1/quantitatifs/${id}/corrections`).send({ action: "bref", cle: second!.cle, texte: "" }).expect(201);
    const after = await bref();
    expect(after[0]).toEqual({ cle: first!.cle, texte: "Couverture zinc joint debout, versant nord" });
    expect(after.map((l) => l.cle)).not.toContain(second!.cle);
    // Une correction du bref ne rouvre pas la liste validée : elle part telle quelle.
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] }).expect(201)).body;
    expect(created.packet.resume).toEqual(after.map((l) => l.texte));
    // Une clé qui n'est pas au bref est refusée.
    await agent.post(`/v1/quantitatifs/${id}/corrections`).send({ action: "bref", cle: "inconnue", texte: "x" }).expect(404);
  });
});
