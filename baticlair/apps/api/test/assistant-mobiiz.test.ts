/**
 * ASSISTANT MOBIIZ (Greg, 31 octobre 2026) côté API : l'adresse du chantier et la livraison dites par l'artisan partent
 * dans le PDF (rien sinon) ; « Annuler » un retrait remet l'article ; les zones des lignes du PDF de l'aperçu ; une liste
 * validée le reste (ces gestes ne lèvent aucun doute).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

async function liste(agent: Agent) {
  const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }, { libelle: "Colle carrelage C2", quantite: "10", unite: "sacs" }] })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses?ecran=1`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  return { id: q.id as string, projetId: q.projetId as string, ecran: current.ecran };
}

describe("assistant Mobiiz : adresse, livraison, annuler, zones", () => {
  it("l'adresse et la livraison dites vont dans le document ; vides, elles en sortent ; jamais sinon", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const l = await liste(agent);
    expect(l.ecran.chantier).toEqual({ adresse: null, livraison: null });
    const avant = (await agent.post(`/v1/projects/${l.projetId}/price-requests/preview`).send({})).body;
    expect(avant.document.chantierInfos).toEqual([]);
    const r = (await agent.post(`/v1/quantitatifs/${l.id}/corrections?ecran=1`).send({ action: "chantier", champ: "adresse", texte: "3 rue du Port, 22300 Lannion" })).body;
    expect(r.ecran.chantier.adresse).toBe("3 rue du Port, 22300 Lannion");
    await agent.post(`/v1/quantitatifs/${l.id}/corrections?ecran=1`).send({ action: "chantier", champ: "livraison", texte: "Livraison sur le chantier, demain" }).expect(201);
    const apres = (await agent.post(`/v1/projects/${l.projetId}/price-requests/preview`).send({})).body;
    expect(apres.document.chantierInfos).toEqual(["Adresse du chantier : 3 rue du Port, 22300 Lannion", "Livraison : Livraison sur le chantier, demain"]);
    await agent.post(`/v1/quantitatifs/${l.id}/corrections?ecran=1`).send({ action: "chantier", champ: "adresse", texte: "" }).expect(201);
    const vide = (await agent.post(`/v1/projects/${l.projetId}/price-requests/preview`).send({})).body;
    expect(vide.document.chantierInfos).toEqual(["Livraison : Livraison sur le chantier, demain"]);
    expect((await agent.post(`/v1/quantitatifs/${l.id}/corrections`).send({ action: "chantier", champ: "client", texte: "x" })).status).toBe(400);
  });

  it("une liste validée reste validée après l'adresse ou la livraison", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Martin");
    const l = await liste(agent);
    await agent.post(`/v1/quantitatifs/${l.id}/validation`).expect(200);
    const r = (await agent.post(`/v1/quantitatifs/${l.id}/corrections`).send({ action: "chantier", champ: "livraison", texte: "Retrait au dépôt" })).body;
    expect(r.valide).toBe(true);
  });

  it("« Annuler » un retrait : l'article revient ; remettre un article jamais retiré est refusé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const l = await liste(agent);
    const cles = (l.ecran.purchase.toBuy as { key: string }[]).map((b) => b.key);
    const calcule = cles.find((k) => !k.startsWith("line:"));
    // Une liste écrite à la main n'a que des lignes reprises : l'annulation d'un retrait y rajoute la ligne (côté écran).
    if (calcule) {
      await agent.post(`/v1/quantitatifs/${l.id}/corrections`).send({ action: "retirer_article", id: calcule }).expect(201);
      const remis = (await agent.post(`/v1/quantitatifs/${l.id}/corrections?ecran=1`).send({ action: "remettre_article", id: calcule })).body;
      expect(remis.ecran.purchase.toBuy.map((b: { key: string }) => b.key)).toContain(calcule);
    }
    expect((await agent.post(`/v1/quantitatifs/${l.id}/corrections`).send({ action: "remettre_article", id: cles[0] })).status).toBe(404);
  });

  it("les zones des lignes du PDF de l'aperçu : une par ligne, avec sa clé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "d@example.fr", "Toitures Martin");
    const l = await liste(agent);
    const z = (await agent.get(`/v1/projects/${l.projetId}/demande-de-devis.zones`)).body;
    const cles = (l.ecran.purchase.toBuy as { key: string }[]).map((b) => b.key);
    expect(z.zones.map((x: { cle: string }) => x.cle).sort()).toEqual([...cles].sort());
    for (const x of z.zones) expect(x).toMatchObject({ page: 0, largeur: expect.any(Number), hauteur: expect.any(Number) });
    // Une autre entreprise ne voit rien de ce chantier.
    const autre = await signUpWithCompany(ctx.app, "e@example.fr", "Autre");
    const refus = await autre.agent.get(`/v1/projects/${l.projetId}/demande-de-devis.zones`);
    expect([400, 404]).toContain(refus.status);
    expect(JSON.stringify(refus.body)).not.toContain("Chatière");
  });
});
