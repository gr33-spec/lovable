import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * §48.5 « ENVOYER UNE SÉLECTION À UN AUTRE FOURNISSEUR » (usage occasionnel : devis multi-lots ou multi-métiers). Les
 * articles cochés partent seuls chez le fournisseur choisi (mail et PDF) ; la demande garde leurs clés pour que l'écran
 * les montre « envoyé ». Une autre sélection part chez un autre fournisseur. Sans sélection, rien ne change : toute la
 * liste validée part d'un coup.
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

const supplier = async (agent: Agent, name: string, email: string) => (await agent.post("/v1/suppliers").send({ name, email }).expect(201)).body.id as string;

/** Chantier avec devis client lu (IA simulée), liste PAS encore validée. */
async function projectWithList(agent: Agent) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont", address: "12 rue des Lilas, Vannes" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  const takeoff = (await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).body;
  return { projectId: project.body.id as string, takeoffId: takeoff.id as string };
}

type Item = { key: string; label: string };

describe("§48.5 : envoyer une sélection à un autre fournisseur", () => {
  it("deux sélections, deux fournisseurs : chacun ne reçoit que ses lignes ; la demande garde les articles envoyés", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { projectId } = await projectWithList(agent);
    const toBuy = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff.purchase.toBuy as Item[];
    expect(toBuy.length).toBeGreaterThanOrEqual(3);
    const [a, b, c] = toBuy as [Item, Item, Item];
    const pointp = await supplier(agent, "Point.P", "devis@pointp.fr");
    const tout = await supplier(agent, "Tout Faire", "devis@toutfaire.fr");

    // La liste n'est pas validée : une sélection part quand même (le reste attend son tour).
    const first = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [pointp], articles: [a.key, b.key] });
    expect(first.status).toBe(201);
    expect(first.body.articles).toEqual([a.key, b.key]);
    expect(first.body.packet.fournitures.map((f: { cle?: string }) => f.cle)).toEqual(expect.arrayContaining([a.key, b.key]));
    expect(first.body.packet.fournitures.every((f: { cle?: string }) => f.cle === a.key || f.cle === b.key)).toBe(true);
    expect(first.body.packet.articles.join("\n")).not.toContain(c.label);

    const second = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [tout], articles: [c.key] });
    expect(second.status).toBe(201);
    expect(second.body.packet.fournitures.map((f: { cle?: string }) => f.cle)).toEqual([c.key]);
    expect(second.body.recipients.map((r: { supplier: { name: string } }) => r.supplier.name)).toEqual(["Tout Faire"]);

    // Les deux demandes, avec leurs articles : l'écran met ces lignes en gris « envoyé ».
    const list = (await agent.get(`/v1/projects/${projectId}/price-requests`)).body.items as { articles: string[] }[];
    expect(list.map((r) => r.articles).flat().sort()).toEqual([a.key, b.key, c.key].sort());
  });

  it("une sélection qui ne nomme aucun article de la liste ne part pas", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Martin");
    const { projectId } = await projectWithList(agent);
    const s = await supplier(agent, "Point.P", "devis@pointp.fr");
    const res = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s], articles: ["inconnu"] });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toMatchObject({ reason: "no_material" });
  });

  it("sans sélection, rien ne change : la liste doit être validée, et tout part d'un coup", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { projectId, takeoffId } = await projectWithList(agent);
    const s = await supplier(agent, "Point.P", "devis@pointp.fr");
    expect((await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s] })).body.error.details).toMatchObject({ reason: "takeoff_not_validated" });
    const takeoff = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff;
    for (const line of takeoff.lines.filter((l: { status: string }) => l.status === "to_verify")) await agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200);
    await agent.post(`/v1/takeoffs/${takeoffId}/validate`).expect(200);
    const all = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s] });
    expect(all.status).toBe(201);
    expect(all.body.articles).toEqual([]);
    expect(all.body.packet.fournitures.length).toBe((takeoff.purchase.toBuy as Item[]).length);
  });
});
