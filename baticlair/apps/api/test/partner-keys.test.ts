import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * CLÉ API PARTENAIRE AVEC QUOTA (plan v3 §1) : une clé par intégration, montrée une seule fois, hachée en base ;
 * elle crée des quantitatifs pour l'entreprise jusqu'à son quota mensuel ; révoquée, elle ne vaut plus rien.
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

const RAPPIDOS = { reference: "Dupont", adresse: "29200 Brest", lignes: [{ libelle: "Couverture en ardoises naturelles 30x22 posées au crochet", quantite: "200", unite: "m²" }] };
const raw = () => request(ctx.app.getHttpServer());

describe("une clé API partenaire", () => {
  it("se crée depuis le compte, n'est montrée qu'une fois, et crée des quantitatifs sans session ni x-company-id", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const created = await agent.post("/v1/partner-keys").send({ nom: "Rappidos", quotaMensuel: 2 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ nom: "Rappidos", quotaMensuel: 2, cle: expect.stringMatching(/^bc_[0-9a-f]{48}$/), prefixe: created.body.cle.slice(0, 11) });
    const cle = created.body.cle as string;
    // En base : seulement l'empreinte.
    const row = await ctx.prisma.partnerApiKey.findFirstOrThrow();
    expect(row.hash).not.toContain(cle.slice(3));
    expect((await agent.get("/v1/partner-keys")).body.items).toEqual([expect.objectContaining({ nom: "Rappidos", prefixe: cle.slice(0, 11), utilisesCeMois: 0, revoqueeLe: null })]);
    expect(JSON.stringify((await agent.get("/v1/partner-keys")).body)).not.toContain(cle);

    const q = await raw().post("/v1/quantitatifs").set("x-api-key", cle).send(RAPPIDOS);
    expect(q.status).toBe(201);
    expect(q.body.lignes.find((l: { libelle: string }) => l.libelle === "Ardoises 30×22").quantite).toBe(9200);
    // Le quantitatif appartient à l'entreprise de la clé ; l'appli le voit.
    expect((await ctx.prisma.quantitatif.findFirstOrThrow()).companyId).toBe(companyId);
    expect((await agent.get(`/v1/quantitatifs/${q.body.id}`)).status).toBe(200);
    expect((await agent.get("/v1/partner-keys")).body.items[0].utilisesCeMois).toBe(1);
  });

  it("au-delà du quota mensuel : 429 avec le quota et l'utilisation ; les lectures ne comptent pas", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const cle = (await agent.post("/v1/partner-keys").send({ nom: "Rappidos", quotaMensuel: 2 })).body.cle as string;
    const first = await raw().post("/v1/quantitatifs").set("x-api-key", cle).send(RAPPIDOS);
    expect(first.status).toBe(201);
    expect((await raw().post("/v1/quantitatifs").set("x-api-key", cle).send(RAPPIDOS)).status).toBe(201);
    const third = await raw().post("/v1/quantitatifs").set("x-api-key", cle).send(RAPPIDOS);
    expect(third.status).toBe(429);
    expect(third.body).toMatchObject({ error: { code: "too_many_requests", details: { quota: 2, utilises: 2 } } });
    expect((await raw().get(`/v1/quantitatifs/${first.body.id}`).set("x-api-key", cle)).status).toBe(200);
    // Une seconde clé a son propre quota.
    const autre = (await agent.post("/v1/partner-keys").send({ nom: "Autre", quotaMensuel: 1 })).body.cle as string;
    expect((await raw().post("/v1/quantitatifs").set("x-api-key", autre).send(RAPPIDOS)).status).toBe(201);
  });

  it("inconnue ou révoquée : 401 ; une clé ne gère pas les clés : 403", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const created = (await agent.post("/v1/partner-keys").send({ nom: "Rappidos", quotaMensuel: 5 })).body;
    expect((await raw().post("/v1/quantitatifs").set("x-api-key", "bc_pas_une_cle").send(RAPPIDOS)).status).toBe(401);
    expect((await raw().get("/v1/partner-keys").set("x-api-key", created.cle)).status).toBe(403);
    expect((await raw().post("/v1/partner-keys").set("x-api-key", created.cle).send({ nom: "x", quotaMensuel: 1 })).status).toBe(403);
    expect((await agent.delete(`/v1/partner-keys/${created.id}`)).status).toBe(204);
    expect((await raw().post("/v1/quantitatifs").set("x-api-key", created.cle).send(RAPPIDOS)).status).toBe(401);
    expect((await agent.get("/v1/partner-keys")).body.items[0].revoqueeLe).toEqual(expect.any(String));
    expect((await agent.delete(`/v1/partner-keys/${created.id}`)).status).toBe(404);
  });

  it("une autre entreprise ne voit pas la clé, et la clé ne voit pas ses chantiers", async () => {
    const { agent: a } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
    const { agent: b } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B");
    const cle = (await a.post("/v1/partner-keys").send({ nom: "Rappidos", quotaMensuel: 5 })).body.cle as string;
    const qb = (await b.post("/v1/quantitatifs").send(RAPPIDOS)).body;
    expect((await b.get("/v1/partner-keys")).body.items).toEqual([]);
    expect((await raw().get(`/v1/quantitatifs/${qb.id}`).set("x-api-key", cle)).status).toBe(404);
  });
});
