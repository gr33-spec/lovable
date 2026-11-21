import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ARDOISE } from "./support/cycle.js";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * L'APPRENTISSAGE DES CORRECTIONS (Greg, 24 octobre 2026) par l'API : la même correction sur 2 chantiers devient une
 * habitude de l'artisan, appliquée d'elle-même (« Ajusté selon tes habitudes ») et annulable d'un clic ; la même correction
 * chez 3 artisans est proposée à l'admin, et ne s'applique à personne d'autre tant qu'elle n'est pas validée.
 */
let ctx: TestContext;
const avant = process.env.GROUPE_ADMINS;
beforeAll(async () => {
  process.env.GROUPE_ADMINS = "greg@example.fr";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE_ADMINS;
  else process.env.GROUPE_ADMINS = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const NOUVEAU = "Ardoise Cupa Heavy 32×22 première qualité";

/** Une liste (ardoise) sur un nouveau chantier : l'identifiant de la liste et sa ligne d'ardoise. */
async function liste(agent: Agent) {
  const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }] }).expect(201)).body as { projetId: string };
  const t = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff as { id: string; purchase: { toBuy: { key: string; label: string }[] }; ajustements: { itemKey: string; texte: string }[] };
  return { id: t.id, ligne: t.purchase.toBuy[0]!, ajustements: t.ajustements };
}
const renommer = (agent: Agent, l: { id: string; ligne: { key: string } }) => agent.post(`/v1/takeoffs/${l.id}/answers`).send({ key: `libelle:${l.ligne.key}`, value: NOUVEAU }).expect(200);

describe("l'apprentissage des corrections", () => {
  it("par artisan : au 2e chantier, la correction s'applique d'elle-même ; « Annuler » la défait et l'arrête", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const c1 = await liste(A.agent);
    expect(c1.ligne.label).toBe(ARDOISE);
    await renommer(A.agent, c1);
    // Une seule fois : rien ne s'applique encore.
    const c2 = await liste(A.agent);
    expect(c2.ligne.label).toBe(ARDOISE);
    expect(c2.ajustements).toEqual([]);
    await renommer(A.agent, c2);
    // Deux chantiers : c'est une habitude.
    const c3 = await liste(A.agent);
    expect(c3.ligne.label).toBe(NOUVEAU);
    expect(c3.ajustements).toEqual([expect.objectContaining({ itemKey: c3.ligne.key, texte: "Ajusté selon tes habitudes" })]);
    // « Annuler » : la ligne revient à la proposition, l'habitude s'arrête.
    const annule = (await A.agent.post(`/v1/takeoffs/${c3.id}/answers`).send({ key: `habitude:${c3.ligne.key}`, value: "non" }).expect(200)).body;
    expect(annule.purchase.toBuy[0].label).toBe(ARDOISE);
    expect(annule.ajustements).toEqual([]);
    const c4 = await liste(A.agent);
    // Par la porte de l'écran (`/v1/quantitatifs/:id/reponses`) aussi : l'habitude se réapprend, puis s'annule.
    await renommer(A.agent, c4);
    const c5 = await liste(A.agent);
    await renommer(A.agent, c5);
    const q6 = (await A.agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }] }).expect(201)).body as { id: string; projetId: string };
    const t6 = (await A.agent.get(`/v1/projects/${q6.projetId}/takeoff`).expect(200)).body.takeoff as { purchase: { toBuy: { key: string; label: string }[] } };
    expect(t6.purchase.toBuy[0]!.label).toBe(NOUVEAU);
    await A.agent.post(`/v1/quantitatifs/${q6.id}/reponses?ecran=1`).send({ reponses: [{ question: `habitude:${t6.purchase.toBuy[0]!.key}`, valeur: "non" }] }).expect(201);
    const t6b = (await A.agent.get(`/v1/projects/${q6.projetId}/takeoff`).expect(200)).body.takeoff as { purchase: { toBuy: { label: string }[] }; ajustements: unknown[] };
    expect(t6b.purchase.toBuy[0]!.label).toBe(ARDOISE);
    expect(t6b.ajustements).toEqual([]);
    expect(c4.ligne.label).toBe(ARDOISE);
    // Une autre entreprise n'en hérite rien.
    const B = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    expect((await liste(B.agent)).ligne.label).toBe(ARDOISE);
  });

  it("global : 3 artisans proposent la règle à l'admin ; rien ne s'applique avant la validation ; refusée, jamais", async () => {
    for (const e of ["a@toitures.fr", "b@toitures.fr", "c@toitures.fr"]) {
      const X = await signUpWithCompany(ctx.app, e, `Toitures ${e[0]}`, ["roofing"]);
      await renommer(X.agent, await liste(X.agent));
    }
    const D = await signUpWithCompany(ctx.app, "d@toitures.fr", "Toitures D", ["roofing"]);
    expect((await liste(D.agent)).ligne.label).toBe(ARDOISE);

    // L'admin seul voit et décide.
    await D.agent.get("/v1/admin/pilotage/apprentissage").expect(403);
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const admin = (await greg.agent.get("/v1/admin/pilotage/apprentissage").expect(200)).body;
    expect(admin.aValider).toEqual([expect.objectContaining({ metier: "roofing", artisans: 3, phrase: expect.stringContaining(`s'appelle « ${NOUVEAU} »`) })]);
    expect(admin.tauxParMois.at(-1)).toMatchObject({ corrigees: 3 });

    await greg.agent.post(`/v1/admin/pilotage/apprentissage/${admin.aValider[0].id}`).send({ decision: "valider" }).expect(200);
    const d2 = await liste(D.agent);
    expect(d2.ligne.label).toBe(NOUVEAU);
    expect(d2.ajustements[0]).toMatchObject({ texte: "Ajusté selon les habitudes des artisans" });
    // Une décision ne se reprend pas en silence.
    await greg.agent.post(`/v1/admin/pilotage/apprentissage/${admin.aValider[0].id}`).send({ decision: "refuser" }).expect(400);
  });

  it("global refusée : elle ne s'applique jamais", async () => {
    for (const e of ["a@toitures.fr", "b@toitures.fr", "c@toitures.fr"]) {
      const X = await signUpWithCompany(ctx.app, e, `Toitures ${e[0]}`, ["roofing"]);
      await renommer(X.agent, await liste(X.agent));
    }
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const id = (await greg.agent.get("/v1/admin/pilotage/apprentissage").expect(200)).body.aValider[0].id;
    expect((await greg.agent.post(`/v1/admin/pilotage/apprentissage/${id}`).send({ decision: "refuser" }).expect(200)).body.aValider).toEqual([]);
    const D = await signUpWithCompany(ctx.app, "d@toitures.fr", "Toitures D", ["roofing"]);
    expect((await liste(D.agent)).ligne.label).toBe(ARDOISE);
  });
});
