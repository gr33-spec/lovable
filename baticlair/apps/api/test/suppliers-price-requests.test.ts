import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

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

const supplier = (agent: Agent, name: string, email: string) =>
  agent.post("/v1/suppliers").send({
    name,
    email,
    contactName: "Paul",
    phone: "06 12 34 56 78",
    notes: "Tuiles, zinc",
  });

/** Chantier avec devis client lu et liste de matériaux validée (IA simulée). */
async function projectWithValidatedList(agent: Agent) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont", address: "12 rue des Lilas, Vannes" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), {
      filename: "devis.pdf",
      contentType: "application/pdf",
    });
  const takeoff = (await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).body;
  for (const line of takeoff.lines.filter((l: { status: string }) => l.status === "to_verify")) {
    await agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200);
  }
  await agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);
  return project.body.id as string;
}

describe("carnet de fournisseurs", () => {
  it("crée, cherche, modifie et archive un fournisseur", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const created = await supplier(agent, "Point.P Vannes", "Contact@PointP.fr");
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: "Point.P Vannes",
      email: "contact@pointp.fr",
      contactName: "Paul",
      archived: false,
    });
    await supplier(agent, "Tuiles & Co", "devis@tuiles.fr");

    const found = await agent.get("/v1/suppliers").query({ q: "zinc point" });
    expect(found.body.items.map((s: { name: string }) => s.name)).toEqual(["Point.P Vannes"]);

    const updated = await agent.patch(`/v1/suppliers/${created.body.id}`).send({ phone: null, notes: "Zinc uniquement" });
    expect(updated.body).toMatchObject({
      phone: null,
      notes: "Zinc uniquement",
    });

    await agent.patch(`/v1/suppliers/${created.body.id}`).send({ archived: true }).expect(200);
    expect((await agent.get("/v1/suppliers")).body.items).toHaveLength(1);
    expect((await agent.get("/v1/suppliers").query({ archived: "include" })).body.items).toHaveLength(2);
  });

  it("exige une société et un e-mail valide, sans doublon", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    expect((await agent.post("/v1/suppliers").send({ name: "", email: "x@y.fr" })).status).toBe(400);
    expect((await agent.post("/v1/suppliers").send({ name: "X", email: "pas-un-email" })).status).toBe(400);
    await supplier(agent, "Point.P", "contact@pointp.fr").expect(201);
    const dup = await supplier(agent, "Autre", "CONTACT@pointp.fr");
    expect(dup.status).toBe(409);
    expect(dup.body.error.details).toMatchObject({
      reason: "email_taken",
      name: "Point.P",
    });
  });

  it("isole les fournisseurs entre entreprises", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    const s = await supplier(a.agent, "Point.P", "contact@pointp.fr");
    expect((await b.agent.get("/v1/suppliers")).body.items).toEqual([]);
    expect((await b.agent.get(`/v1/suppliers/${s.body.id}`)).status).toBe(404);
    expect((await b.agent.patch(`/v1/suppliers/${s.body.id}`).send({ name: "x" })).status).toBe(404);
    // Même e-mail autorisé dans une autre entreprise.
    expect((await supplier(b.agent, "Point.P", "contact@pointp.fr")).status).toBe(201);
  });
});

describe("demandes de prix", () => {
  it("exige une liste de matériaux validée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const project = await agent.post("/v1/projects").send({ name: "Chantier" });
    const s = await supplier(agent, "Point.P", "contact@pointp.fr");
    const res = await agent.post(`/v1/projects/${project.body.id}/price-requests`).send({ supplierIds: [s.body.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toMatchObject({
      reason: "takeoff_not_validated",
    });
  });

  it("prépare un e-mail par fournisseur avec la liste validée, puis suit l'envoi et la réception du devis", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await projectWithValidatedList(agent);
    const p = await supplier(agent, "Point.P", "contact@pointp.fr");
    const t = await supplier(agent, "Tuiles & Co", "devis@tuiles.fr");

    const created = await agent.post(`/v1/projects/${projectId}/price-requests`).send({
      supplierIds: [p.body.id, t.body.id],
      message: "Livraison sur chantier possible ?",
      dueDate: "2026-10-15",
    });
    expect(created.status).toBe(201);
    expect(created.body.lines).toHaveLength(6);
    expect(created.body.recipients).toHaveLength(2);
    const first = created.body.recipients[0];
    expect(first).toMatchObject({
      status: "to_send",
      supplier: { name: "Point.P", email: "contact@pointp.fr" },
    });
    expect(first.email.subject).toBe("Demande de prix – Toiture Dupont – Toitures Martin");
    expect(first.email.body).toContain("Bonjour Paul,");
    expect(first.email.body).toContain("- Tuile romane canal rouge 12,5 u/m² (réf. TUI-RC12) : 1 250 u");
    expect(first.email.body).toContain("Livraison sur chantier possible ?");
    expect(first.email.body).toContain("15 octobre 2026");

    const sent = await agent.patch(`/v1/price-request-recipients/${first.id}`).send({ status: "sent" });
    expect(sent.body.recipients[0]).toMatchObject({ status: "sent" });
    expect(sent.body.recipients[0].sentAt).not.toBeNull();

    const offer = Buffer.from(await makePdf(["devis", "totaux"]));
    const quote = await agent.post(`/v1/price-request-recipients/${first.id}/quote`).attach("file", offer, {
      filename: "offre-pointp.pdf",
      contentType: "application/pdf",
    });
    expect(quote.status).toBe(201);
    expect(quote.body.recipients[0]).toMatchObject({
      status: "received",
      document: { name: "offre-pointp.pdf" },
    });

    // Le devis est rangé dans le chantier comme devis fournisseur.
    const docs = (await agent.get(`/v1/projects/${projectId}/documents`)).body.items;
    expect(docs.filter((d: { purpose: string }) => d.purpose === "supplier_quote")).toHaveLength(1);

    // Le même PDF ne peut pas être attribué à un second fournisseur.
    const second = created.body.recipients[1];
    const again = await agent.post(`/v1/price-request-recipients/${second.id}/quote`).attach("file", offer, {
      filename: "offre-pointp.pdf",
      contentType: "application/pdf",
    });
    expect(again.status).toBe(409);

    const declined = await agent.patch(`/v1/price-request-recipients/${second.id}`).send({ status: "declined" });
    expect(declined.body.recipients[1].status).toBe("declined");

    const list = await agent.get(`/v1/projects/${projectId}/price-requests`);
    expect(list.body.items).toHaveLength(1);
  });

  it("garde la liste envoyée même si la liste du chantier change ensuite", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await projectWithValidatedList(agent);
    const s = await supplier(agent, "Point.P", "contact@pointp.fr");
    const created = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.body.id] });

    const takeoff = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff;
    await agent.post(`/v1/takeoffs/${takeoff.id}/reopen`).expect(200);
    await agent.delete(`/v1/takeoff-lines/${takeoff.lines[0].id}`).expect(200);

    const list = await agent.get(`/v1/projects/${projectId}/price-requests`);
    expect(list.body.items[0].lines).toHaveLength(created.body.lines.length);
  });

  it("ajoute un fournisseur à une demande existante, sans doublon", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await projectWithValidatedList(agent);
    const p = await supplier(agent, "Point.P", "contact@pointp.fr");
    const t = await supplier(agent, "Tuiles & Co", "devis@tuiles.fr");
    const created = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [p.body.id] });
    const added = await agent.post(`/v1/price-requests/${created.body.id}/recipients`).send({ supplierIds: [p.body.id, t.body.id] });
    expect(added.body.recipients.map((r: { supplier: { name: string } }) => r.supplier.name)).toEqual(["Point.P", "Tuiles & Co"]);
  });

  it("isole les demandes entre entreprises", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    const projectId = await projectWithValidatedList(a.agent);
    const s = await supplier(a.agent, "Point.P", "contact@pointp.fr");
    const created = await a.agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.body.id] });

    expect((await b.agent.get(`/v1/projects/${projectId}/price-requests`)).body.items).toEqual([]);
    expect((await b.agent.patch(`/v1/price-request-recipients/${created.body.recipients[0].id}`).send({ status: "sent" })).status).toBe(
      404,
    );
    expect((await b.agent.delete(`/v1/price-requests/${created.body.id}`)).status).toBe(404);
    // Un fournisseur d'une autre entreprise ne peut pas être ajouté.
    const other = await supplier(b.agent, "Autre", "autre@x.fr");
    expect((await a.agent.post(`/v1/price-requests/${created.body.id}/recipients`).send({ supplierIds: [other.body.id] })).status).toBe(
      404,
    );
  });
});
