import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cocherLesNaissances } from "./support/suggestions.js";
import { D2026_020_PDF } from "./support/d2026-020-pdf.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

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

/**
 * LES RÉPONSES ENVOYÉES D'UN COUP (recette en ligne du 18 novembre 2026, chantier ardoise de Greg). L'écran envoie toutes
 * ses réponses ensemble. Le serveur refusait « sans unité » une donnée du métier dont la question n'était pas, ou plus,
 * ouverte (« Combien de descentes ? », puis la gouttière déjà prise par l'envoi d'avant) : l'écran reposait alors la même
 * question sans fin (« Cette réponse ne passe pas »). Une donnée connue de la fiche garde l'unité de sa fiche.
 */
describe("les réponses envoyées d'un coup", () => {
  const envoi = { reponses: [{ question: "engine:param:developpe_gouttiere", valeur: "25" }, { question: "engine:param:nb_descentes", valeur: "1" }, { question: "engine:param:faconnage@pieces-pliees", valeur: "1" }] };

  it("une donnée du métier sans question ouverte est prise avec l'unité de sa fiche ; le même envoi rejoué passe encore", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs").field("reference", "Extension ardoise").field("adresse", "3 rue du Port, 22620 Ploubazlanec").attach("file", Buffer.from(await D2026_020_PDF()), { filename: "devis.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);
    const id = res.body.id as string;
    await cocherLesNaissances(agent, id);
    const ouvertes = async () => ((await agent.get(`/v1/quantitatifs/${id}?ecran=1`)).body.questions as { id: string }[]).map((q) => q.id);
    // « Combien de descentes ? » n'est pas ouverte ici (le devis le dit) : l'écran peut pourtant l'envoyer.
    expect(await ouvertes()).not.toContain("engine:param:nb_descentes");
    const premier = await agent.post(`/v1/quantitatifs/${id}/reponses?ecran=1`).send(envoi);
    expect(premier.status).toBe(201);
    const apres = await ouvertes();
    expect(apres).not.toContain("engine:param:developpe_gouttiere");
    expect(apres).not.toContain("engine:param:faconnage@pieces-pliees");
    // Les réponses déjà prises, renvoyées telles quelles : jamais un refus.
    const second = await agent.post(`/v1/quantitatifs/${id}/reponses?ecran=1`).send(envoi);
    expect(second.status).toBe(201);
    expect(await ouvertes()).toEqual(apres);
  });

  it("une donnée inconnue de toute fiche reste refusée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs").field("reference", "Extension ardoise").attach("file", Buffer.from(await D2026_020_PDF()), { filename: "devis.pdf", contentType: "application/pdf" });
    const refus = await agent.post(`/v1/quantitatifs/${res.body.id}/reponses?ecran=1`).send({ reponses: [{ question: "engine:param:donnee_inconnue", valeur: "3" }] });
    expect(refus.status).toBe(400);
  });
});
