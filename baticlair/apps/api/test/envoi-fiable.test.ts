/**
 * ENVOI FIABLE (audit avant commercialisation, 2026-10-11). Deux défauts trouvés :
 *  1. un refus du prestataire d'e-mail (clé invalide, quota, adresse rejetée) était seulement journalisé : la demande
 *     passait quand même « envoyée », le fournisseur n'avait rien reçu ;
 *  2. le mail n'avait pas d'adresse de réponse : « Répondre » écrivait à l'adresse d'envoi de BatiClair, pas à l'artisan.
 * Désormais un mail fournisseur DOIT partir (`mustDeliver`) : sinon l'artisan voit une erreur et la demande n'est pas
 * « envoyée » ; et la réponse du fournisseur va à l'artisan (`replyTo` : l'e-mail de l'entreprise, sinon du compte).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ResendEmailSender } from "../src/platform/email/resend-email.sender.js";
import type { AppLogger } from "../src/platform/logging/logger.js";
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
  ctx.emails.clear();
  ctx.emails.failNext = 0;
});

async function demande(agent: Agent, fournisseur = "Point.P", email = "devis@example.com") {
  const q = (
    await agent.post("/v1/quantitatifs").send({ reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })
  ).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const supplier = (await agent.post("/v1/suppliers").send({ name: fournisseur, email })).body;
  const res = await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [supplier.id] });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  const created = res.body;
  return { requestId: created.id as string, recipientId: created.recipients[0].id as string };
}

describe("envoi fiable au fournisseur", () => {
  it("la réponse du fournisseur va à l'artisan : l'e-mail de l'entreprise, sinon celui du compte", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const { recipientId } = await demande(agent);
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
    const mail = ctx.emails.lastTo("devis@example.com")!;
    expect(mail.replyTo).toBe("greg@example.fr");
    expect(mail.mustDeliver).toBe(true);

    await agent.patch("/v1/company/profile").send({ email: "devis@toitures-martin.fr" }).expect(200);
    const second = await demande(agent, "Point.P Brest", "devis-brest@example.com");
    await agent.post(`/v1/price-request-recipients/${second.recipientId}/send`).expect(200);
    expect(ctx.emails.lastTo("devis-brest@example.com")!.replyTo).toBe("devis@toitures-martin.fr");
  });

  it("un mail que le prestataire refuse : l'artisan le voit, et la demande n'est PAS « envoyée »", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const { requestId, recipientId } = await demande(agent);
    ctx.emails.failNext = 1;
    const res = await agent.post(`/v1/price-request-recipients/${recipientId}/send`);
    expect(res.status).toBe(502);
    expect(res.body.error).toMatchObject({ code: "email_not_sent", retryable: true });
    const request = (await agent.get(`/v1/projects/${(await ctx.prisma.priceRequest.findUniqueOrThrow({ where: { id: requestId } })).projectId}/price-requests`)).body.items[0];
    expect(request.recipients[0].status).not.toBe("sent");
    // Réessayer : cette fois il part.
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
    expect(ctx.emails.sent.filter((m) => m.to === "devis@example.com")).toHaveLength(1);
  });

  it("« Envoyer » rappuyé après une panne : un fournisseur déjà servi ne reçoit jamais le mail deux fois", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const { recipientId } = await demande(agent);
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
    await agent.post(`/v1/price-request-recipients/${recipientId}/send`).expect(200);
    expect(ctx.emails.sent.filter((m) => m.to === "devis@example.com")).toHaveLength(1);
  });
});

describe("Resend : un refus ou une panne", () => {
  const logger = { error: () => {}, warn: () => {}, info: () => {} } as unknown as AppLogger;
  const refuse = async () => ({ ok: false, status: 422 });
  const panne = async (): Promise<{ ok: boolean; status: number }> => {
    throw new Error("timeout");
  };
  const posted: string[] = [];
  const accepte = async (_url: string, init: { body: string }) => {
    posted.push(init.body);
    return { ok: true, status: 200 };
  };

  it("un mail qui doit partir lève une erreur ; un mail de compte (inscription) reste toléré", async () => {
    for (const impl of [refuse, panne]) {
      const sender = new ResendEmailSender("cle", "BatiClair <devis@baticlair.fr>", logger, impl);
      await expect(sender.send({ to: "a@example.com", subject: "s", text: "t", mustDeliver: true })).rejects.toMatchObject({ code: "email_not_sent" });
      await expect(sender.send({ to: "a@example.com", subject: "s", text: "t" })).resolves.toBeUndefined();
    }
  });

  it("l'adresse de réponse part chez Resend (reply_to)", async () => {
    const sender = new ResendEmailSender("cle", "BatiClair <devis@baticlair.fr>", logger, accepte);
    await sender.send({ to: "a@example.com", subject: "s", text: "t", replyTo: "greg@example.fr" });
    expect(JSON.parse(posted.at(-1)!)).toMatchObject({ reply_to: "greg@example.fr" });
  });
});
