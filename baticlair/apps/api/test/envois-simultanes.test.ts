import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ARDOISE, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * ENVOIS SIMULTANÉS (recette complète du 13 novembre 2026, B6 et G10). Une douzaine d'artisans qui envoient leur demande au
 * même instant figeaient le serveur deux minutes (le verrou « une ligne, un seul circuit » prenait toutes les connexions
 * à la base) ; un double appui faisait partir trois fois le même mail. Les envois passent maintenant par une file, et un
 * envoi relit l'état une fois son tour venu.
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, ZONES_ACTIVES: process.env.ZONES_ACTIVES };
beforeAll(async () => {
  process.env.ZONES_ACTIVES = "22";
  process.env.MODE_REGROUPEMENT = "automatique";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

async function artisanPretAEnvoyer(i: number) {
  const a = await couvreurAvecListe(ctx, `a${i}@toitures.fr`, `Toitures ${i}`, "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
  const negoce = (await a.agent.post("/v1/suppliers").send({ name: `Négoce ${i}`, email: `n${i}@negoce.fr` }).expect(201)).body.id as string;
  const demande = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests`).send({ supplierIds: [negoce], articles: a.articles }).expect(201)).body as { recipients: { id: string }[] };
  return { ...a, destinataire: demande.recipients[0]!.id, emailNegoce: `n${i}@negoce.fr` };
}

describe("envois simultanés", () => {
  it("quatorze artisans envoient au même instant : tous passent, vite, chacun son mail, et le serveur répond toujours", async () => {
    const artisans = [];
    for (let i = 1; i <= 14; i++) artisans.push(await artisanPretAEnvoyer(i));
    const debut = Date.now();
    const reponses = await Promise.all(artisans.map((a) => a.agent.post(`/v1/price-request-recipients/${a.destinataire}/send`)));
    expect(reponses.map((r) => r.status)).toEqual(artisans.map(() => 200));
    // Avant : 120 secondes d'attente et des erreurs 500. La marge est large pour une machine de test chargée.
    expect(Date.now() - debut).toBeLessThan(30_000);
    for (const a of artisans) expect(mailsVers(ctx, a.emailNegoce)).toHaveLength(1);
    await artisans[0]!.agent.get("/v1/me").expect(200);
  }, 120_000);

  it("trois « Envoyer » au même instant sur le même négoce : un seul mail part", async () => {
    const a = await artisanPretAEnvoyer(1);
    const reponses = await Promise.all([1, 2, 3].map(() => a.agent.post(`/v1/price-request-recipients/${a.destinataire}/send`)));
    expect(reponses.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(mailsVers(ctx, a.emailNegoce)).toHaveLength(1);
  }, 60_000);
});
