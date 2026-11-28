/**
 * NOTIFICATIONS COHÉRENTES ET SUPPRIMABLES (Greg, 12 novembre 2026, dossier de corrections UX, point 2). Côté serveur :
 * une alerte se retire de MA liste et se remet (« Annuler ») ; la retirer ne touche jamais ce qu'elle désigne ; l'état
 * « vu » et « retiré » des actions « À faire » tient après actualisation ; rejouer ne double rien ; une autre entreprise
 * répond 404 et ne voit rien.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ecrireAlerte } from "../src/platform/notifications/alertes.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const avant = process.env.MISSIONS_V1;
beforeAll(async () => {
  process.env.MISSIONS_V1 = "on";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.MISSIONS_V1;
  else process.env.MISSIONS_V1 = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const alerte = (cle: string) => ({ categorie: "prix" as const, genre: "information" as const, titre: "Négoce Breizh a répondu", detail: "Liste du 12 novembre", action: "Voir la proposition", href: "/chantiers/x#fournisseurs", cle });

describe("cycle de vie des notifications", () => {
  it("lue puis retirée : le compteur suit, l'alerte revient avec « Annuler », rien d'autre ne bouge", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits A", ["roofing"]);
    await ecrireAlerte(ctx.prisma, a.companyId, alerte("r-1"));
    await ecrireAlerte(ctx.prisma, a.companyId, alerte("r-2"));
    const projets = await ctx.prisma.project.count();
    let vue = (await a.agent.get("/v1/alertes").expect(200)).body;
    expect(vue.nonLues).toBe(2);
    const [premiere, seconde] = vue.items;
    await a.agent.post(`/v1/alertes/${premiere.id}/lue`).send({}).expect(200);
    expect((await a.agent.get("/v1/alertes").expect(200)).body.nonLues).toBe(1);
    // Retirée : elle sort de la liste et ne compte plus, même non lue ; rejouer ne change rien.
    await a.agent.delete(`/v1/alertes/${seconde.id}`).expect(200);
    await a.agent.delete(`/v1/alertes/${seconde.id}`).expect(200);
    vue = (await a.agent.get("/v1/alertes").expect(200)).body;
    expect(vue.items.map((x: { id: string }) => x.id)).toEqual([premiere.id]);
    expect(vue.nonLues).toBe(0);
    // « Annuler » : elle revient, déjà lue (elle a été vue pour être retirée).
    await a.agent.post(`/v1/alertes/${seconde.id}/restaurer`).send({}).expect(200);
    vue = (await a.agent.get("/v1/alertes").expect(200)).body;
    expect(vue.items).toHaveLength(2);
    expect(vue.nonLues).toBe(0);
    expect(await ctx.prisma.alerteCourte.count()).toBe(2);
    expect(await ctx.prisma.project.count()).toBe(projets);
  });

  it("une autre entreprise ne retire, ne remet et ne voit rien", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits A", ["roofing"]);
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Toits B", ["roofing"]);
    await ecrireAlerte(ctx.prisma, a.companyId, alerte("r-1"));
    const id = (await a.agent.get("/v1/alertes").expect(200)).body.items[0].id;
    await b.agent.delete(`/v1/alertes/${id}`).expect(404);
    await b.agent.post(`/v1/alertes/${id}/restaurer`).send({}).expect(404);
    await b.agent.delete("/v1/alertes/pas-un-identifiant").expect(404);
    expect((await a.agent.get("/v1/alertes").expect(200)).body.items).toHaveLength(1);
    await a.agent.post("/v1/alertes/a-faire").send({ cles: ["n-1|Envoyer"], geste: "masquer" }).expect(200);
    expect((await b.agent.get("/v1/alertes/a-faire").expect(200)).body).toEqual({ vues: [], masquees: [] });
  });

  it("« À faire » : vu, retiré, remis ; l'état tient après actualisation et rejouer ne double rien", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits A", ["roofing"]);
    expect((await a.agent.get("/v1/alertes/a-faire").expect(200)).body).toEqual({ vues: [], masquees: [] });
    await a.agent.post("/v1/alertes/a-faire").send({ cles: ["n-1|Envoyer", "n-2|Comparer", "n-1|Envoyer"], geste: "vu" }).expect(200);
    await a.agent.post("/v1/alertes/a-faire").send({ cles: ["n-1|Envoyer"], geste: "vu" }).expect(200);
    expect(await ctx.prisma.etatAFaire.count()).toBe(2);
    let etat = (await a.agent.get("/v1/alertes/a-faire").expect(200)).body;
    expect(etat.vues.sort()).toEqual(["n-1|Envoyer", "n-2|Comparer"]);
    expect(etat.masquees).toEqual([]);
    etat = (await a.agent.post("/v1/alertes/a-faire").send({ cles: ["n-2|Comparer"], geste: "masquer" }).expect(200)).body;
    expect(etat.masquees).toEqual(["n-2|Comparer"]);
    etat = (await a.agent.post("/v1/alertes/a-faire").send({ cles: ["n-2|Comparer"], geste: "restaurer" }).expect(200)).body;
    expect(etat.masquees).toEqual([]);
    // Remise, elle reste « vue » : la pastille ne se rallume pas.
    expect(etat.vues).toContain("n-2|Comparer");
    await a.agent.post("/v1/alertes/a-faire").send({ cles: [], geste: "vu" }).expect(400);
    await a.agent.post("/v1/alertes/a-faire").send({ cles: ["x"], geste: "effacer" }).expect(400);
  });
});
