import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * RECETTE N° 2 DU 14 NOVEMBRE 2026 (gênant, priorité de Greg le 16 novembre) : « Le PDF porte l'e-mail personnel de
 * l'artisan alors que l'écran dit "Ton e-mail, lui, n'est jamais donné". » L'e-mail de connexion de l'artisan n'est plus
 * JAMAIS imprimé : ni dans le document de la demande de prix, ni dans le message, ni sur le bon de commande. Seul l'e-mail
 * de contact de l'entreprise, s'il l'a rempli lui-même dans son profil, peut y figurer.
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
  ctx.emails.sent.length = 0;
});

const LIGNES = [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "1000", unite: "pièces" }];
const CONNEXION = "jean.perso@example.fr";
const lien = (texte: string) => /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(texte)?.[1] ?? null;
const toutDuMail = (m: { subject: string; text: string; html?: string | null; attachments?: { contentBase64: string }[] }) =>
  `${m.subject}\n${m.text}\n${m.html ?? ""}\n${(m.attachments ?? []).map((p) => Buffer.from(p.contentBase64, "base64").toString("latin1")).join("\n")}`;

async function demandeEnvoyee(contact: string | null) {
  const a = await couvreurAvecListe(ctx, CONNEXION, "Toitures Martin", "3 rue des Ajoncs, 22300 Lannion", LIGNES, "06 12 34 56 78");
  if (contact) await a.agent.patch("/v1/company/profile").send({ name: "Toitures Martin", address: "3 rue des Ajoncs, 22300 Lannion", siret: "73282932000074", phone: "06 12 34 56 78", email: contact }).expect(200);
  const { takeoff } = (await a.agent.get(`/v1/projects/${a.projectId}/takeoff`).expect(200)).body as { takeoff: { id: string } };
  await a.agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);
  const s = (await a.agent.post("/v1/suppliers").send({ name: "Négoce Kerbrat", email: "devis@kerbrat.example" }).expect(201)).body as { id: string };
  const d = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests`).send({ supplierIds: [s.id] }).expect(201)).body as { id: string; recipients: { id: string }[]; document: unknown };
  await a.agent.post(`/v1/price-request-recipients/${d.recipients[0]!.id}/send`).expect(200);
  return { a, d };
}

describe("l'e-mail de connexion de l'artisan n'est jamais imprimé", { timeout: 120_000 }, () => {
  it("demande de prix puis bon de commande : ni le document, ni le message, ni la pièce jointe ne portent l'e-mail de connexion", async () => {
    const { a, d } = await demandeEnvoyee(null);
    // Le document tel que le négoce le reçoit : le téléphone y est (le négoce peut appeler), jamais l'e-mail.
    const relu = (await a.agent.get(`/v1/projects/${a.projectId}/price-requests`).expect(200)).body.items[0] as { document: unknown };
    for (const doc of [d.document, relu.document]) {
      expect(JSON.stringify(doc)).toContain("06 12 34 56 78");
      expect(JSON.stringify(doc)).not.toContain(CONNEXION);
    }
    const demande = mailsVers(ctx, "devis@kerbrat.example").at(-1)!;
    expect(toutDuMail(demande)).not.toContain(CONNEXION);
    // Le négoce chiffre ; l'artisan commande : le bon de commande non plus.
    const jeton = lien(demande.text)!;
    const cles = ((await request(ctx.app.getHttpServer()).get(`/v1/public/chiffrer/${jeton}`).expect(200)).body.lignes as { cle: string }[]).map((l) => l.cle);
    await request(ctx.app.getHttpServer()).post(`/v1/public/chiffrer/${jeton}`).send({ prix: Object.fromEntries(cles.map((k) => [k, 1])), livraisonHt: 0, delaiJours: 2, validiteJours: 30 }).expect(200);
    await a.agent.post(`/v1/demandes-perso/${d.id}/commander`).send({ recipientId: d.recipients[0]!.id, livraisonSouhaitee: "2099-12-03" }).expect(200);
    const bon = mailsVers(ctx, "devis@kerbrat.example").at(-1)!;
    expect(bon.subject).toMatch(/^Bon de commande de Toitures Martin/);
    expect(bon.text).toContain("Contact : 06 12 34 56 78.");
    expect(toutDuMail(bon)).not.toContain(CONNEXION);
  });

  it("l'e-mail de contact que l'artisan a rempli pour son entreprise, lui, figure sur ses documents", async () => {
    const { a, d } = await demandeEnvoyee("contact@toitures-martin.example");
    const relu = (await a.agent.get(`/v1/projects/${a.projectId}/price-requests`).expect(200)).body.items[0] as { document: unknown };
    expect(JSON.stringify(relu.document)).toContain("contact@toitures-martin.example");
    expect(JSON.stringify(relu.document)).not.toContain(CONNEXION);
    expect(d.id).toBeTruthy();
  });
});
