import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * UNE CLÉ PARTENAIRE N'OUVRE QUE LES QUANTITATIFS (Greg, 27 novembre 2026, après l'audit de sécurité) : avant, la clé valait
 * une session de son auteur sur toutes les routes (export RGPD, profil, suppression du compte compris).
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

const raw = () => request(ctx.app.getHttpServer());

describe("une clé API partenaire", () => {
  it("crée et lit un quantitatif, mais n'ouvre ni le compte, ni l'entreprise, ni les envois, ni la suppression", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const cle = (await agent.post("/v1/partner-keys").send({ nom: "Rappidos", quotaMensuel: 5 })).body.cle as string;

    const q = await raw().post("/v1/quantitatifs").set("x-api-key", cle).send({ reference: "Dupont", adresse: "29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] });
    expect(q.status).toBe(201);
    expect((await raw().get(`/v1/quantitatifs/${q.body.id}`).set("x-api-key", cle)).status).toBe(200);
    expect((await raw().get(`/v1/quantitatifs?projetId=${q.body.projetId}`).set("x-api-key", cle)).status).toBe(200);
    expect((await raw().put(`/v1/projects/${q.body.projetId}/infos`).set("x-api-key", cle).send({ texte: "Pente 35°" })).status).toBeLessThan(300);

    const interdites: [string, string, object?][] = [
      ["get", "/v1/me/export"],
      ["get", "/v1/me/export.pdf"],
      ["get", "/v1/company/profile"],
      ["patch", "/v1/company/profile", { name: "Pirate" }],
      ["delete", "/v1/me", { confirm: "SUPPRIMER" }],
      ["get", "/v1/projects"],
      ["get", "/v1/suppliers"],
      ["post", "/v1/suppliers", { name: "X", email: "x@example.fr" }],
      ["post", `/v1/projects/${q.body.projetId}/price-requests`, { supplierIds: [] }],
      ["get", "/v1/partner-keys"],
      ["get", "/v1/recus"],
      ["get", "/v1/abonnement"],
      ["post", "/v1/abonnement/payer", { formule: "pro" }],
    ];
    for (const [methode, chemin, corps] of interdites) {
      const r = await (raw() as unknown as Record<string, (u: string) => request.Test>)[methode]!(chemin).set("x-api-key", cle).send(corps ?? {});
      expect({ chemin, statut: r.status }).toEqual({ chemin, statut: 403 });
    }
    // Rien n'a bougé : le compte et l'entreprise existent toujours, le nom n'a pas changé.
    const c = await ctx.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    expect(c.name).toBe("Toitures Martin");
    // Avec la session, tout reste ouvert.
    expect((await agent.get("/v1/company/profile")).status).toBe(200);
  });
});
