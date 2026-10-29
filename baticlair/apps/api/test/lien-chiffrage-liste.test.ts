import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ARDOISE, LITEAU, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * UN SEUL BOUTON, ET LA COMPARAISON RESTE (Greg, 28 octobre 2026, points 7 et 8) : la liste part par l'unique « Demander
 * les prix à mes négoces » ; chaque mail porte le lien de chiffrage propre au négoce, et deux réponses par le lien se
 * comparent livraison comprise, sans aucune lecture IA.
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

const lien = (texte: string) => /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(texte)?.[1] ?? null;
const publique = () => request(ctx.app.getHttpServer());

describe("la liste envoyée aux négoces", () => {
  it("porte le lien de chiffrage ; deux réponses par le lien se comparent livraison comprise", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [
      { libelle: ARDOISE, quantite: "1000", unite: "pièces" },
      { libelle: LITEAU, quantite: "100", unite: "m" },
    ]);
    const { takeoff } = (await a.agent.get(`/v1/projects/${a.projectId}/takeoff`).expect(200)).body;
    await a.agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);
    const b = (await a.agent.post("/v1/suppliers").send({ name: "Négoce B", email: "b@negoce.fr" }).expect(201)).body;
    const c = (await a.agent.post("/v1/suppliers").send({ name: "Négoce C", email: "c@negoce.fr" }).expect(201)).body;
    const demande = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests`).send({ supplierIds: [b.id, c.id] }).expect(201)).body;
    for (const r of demande.recipients) await a.agent.post(`/v1/price-request-recipients/${r.id}/send`).expect(200);

    const jeton = (email: string) => lien(mailsVers(ctx, email).at(-1)!.text)!;
    expect(jeton("b@negoce.fr")).toBeTruthy();
    expect(mailsVers(ctx, "b@negoce.fr").at(-1)!.text).toContain("Vous pouvez aussi chiffrer en ligne");
    const page = (await publique().get(`/v1/public/chiffrer/${jeton("b@negoce.fr")}`).expect(200)).body;
    expect(page).toMatchObject({ artisan: "Toitures A", negoce: "Négoce B", but: "chiffrer", etat: "a_chiffrer" });
    const cles = (page.lignes as { cle: string }[]).map((l) => l.cle);
    await publique().post(`/v1/public/chiffrer/${jeton("b@negoce.fr")}`).send({ prix: Object.fromEntries(cles.map((k) => [k, 1])), livraisonHt: 80, delaiJours: 3, validiteJours: 14 }).expect(200);
    await publique().post(`/v1/public/chiffrer/${jeton("c@negoce.fr")}`).send({ prix: Object.fromEntries(cles.map((k) => [k, 1.02])), livraisonHt: 0, delaiJours: 2, validiteJours: 14 }).expect(200);

    const vue = (await a.agent.get(`/v1/demandes-perso/${demande.id}`).expect(200)).body;
    expect(vue.offres.map((o: { nom: string }) => o.nom)).toHaveLength(2);
    expect(vue.offres[0].ecartHt).toBe(0);
    expect(vue.offres[1].ecartHt).toBeGreaterThan(0);
    const statuts = (await a.agent.get(`/v1/projects/${a.projectId}/price-requests`).expect(200)).body.items[0].recipients.map((r: { status: string }) => r.status);
    expect(statuts).toEqual(["received", "received"]);
  });
});
