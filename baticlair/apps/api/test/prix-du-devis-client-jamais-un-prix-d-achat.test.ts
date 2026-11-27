import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ARDOISE, LITEAU, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LE PRIX D'UN DEVIS CLIENT EST UN PRIX DE VENTE (Greg, 27 novembre 2026) : « le prix écrit sur un devis client, c'est le prix
 * de VENTE de l'artisan, jamais son prix d'achat. Il ne doit jamais servir de prix d'achat, ni entrer dans l'observatoire des
 * prix comme un prix négoce. » Les prix d'achat ne viennent que des négoces (réponse par le lien, offre d'un achat groupé).
 * Ce test le garantit de bout en bout : un devis client chiffré (888,88 € et 777,77 €), puis la réponse d'un négoce
 * (1,20 € et 0,50 €). L'observatoire et « Mes prix » n'ont que les prix du négoce ; le négoce ne voit jamais le prix de vente.
 */
let ctx: TestContext;
const avant = process.env.MODE_REGROUPEMENT;
beforeAll(async () => {
  process.env.MODE_REGROUPEMENT = "mois";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.MODE_REGROUPEMENT;
  else process.env.MODE_REGROUPEMENT = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const VENTE = /888|777/;
const publique = () => request(ctx.app.getHttpServer());
const lien = (texte: string) => /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(texte)?.[1] ?? null;

describe("le prix d'un devis client n'est jamais un prix d'achat", () => {
  it("lignes d'un devis avec leur prix de vente, puis la réponse d'un négoce : l'observatoire et « Mes prix » n'ont que le prix du négoce", { timeout: 60_000 }, async () => {
    const lignes = [
      { libelle: ARDOISE, quantite: "1000", unite: "pièces", prix: "888,88" },
      { libelle: LITEAU, quantite: "100", unite: "m", prix: "777,77" },
    ];
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", lignes);
    // Le prix de vente est bien gardé avec la ligne (il reste à l'artisan)…
    expect((await ctx.prisma.takeoffLine.findMany()).map((l) => l.priceRaw).sort()).toEqual(["777,77", "888,88"]);
    // … mais avant tout négoce : aucun prix d'achat, nulle part.
    expect(await ctx.prisma.observationPrix.count()).toBe(0);
    expect(((await a.agent.get("/v1/mes-prix").expect(200)).body.articles as unknown[]).length).toBe(0);

    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }] }).expect(201);
    const mail = mailsVers(ctx, "b@negoce.fr").at(-1)!;
    // Le négoce ne lit jamais le prix de vente de l'artisan : ni dans l'e-mail, ni sur sa page de chiffrage.
    expect(mail.text + mail.subject).not.toMatch(VENTE);
    const jeton = lien(mail.text)!;
    const page = (await publique().get(`/v1/public/chiffrer/${jeton}`).expect(200)).body;
    expect(JSON.stringify(page)).not.toMatch(VENTE);
    const cles = (page.lignes as { cle: string }[]).map((l) => l.cle);
    await publique().post(`/v1/public/chiffrer/${jeton}`).send({ prix: { [cles[0]!]: 1.2, [cles[1]!]: 0.5 }, livraisonHt: 0, delaiJours: 2, validiteJours: 14 }).expect(200);

    const observes = (await ctx.prisma.observationPrix.findMany()).map((o) => Number(o.prixUnitaireHt)).sort();
    expect(observes).toEqual([0.5, 1.2]);
    const mesPrix = (await a.agent.get("/v1/mes-prix").expect(200)).body;
    expect(JSON.stringify(mesPrix)).not.toMatch(VENTE);
    expect(JSON.stringify(mesPrix)).toMatch(/1\.2|0\.5/);
  });

  it("un devis client déposé en PDF, avec ses prix : lu, calculé, et toujours aucun prix d'achat", { timeout: 60_000 }, async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@toitures.fr", "Toitures C");
    const pdf = Buffer.from(await makePdf(["devis"], [["1", "Couverture en ardoise naturelle 32x22 au crochet", "80 m2", "888,88", "71 110,40"], ["2", "Liteaux sapin traité 27x40", "80 m2", "777,77", "62 221,60"]]));
    const q = (await agent.post("/v1/quantitatifs").field("reference", "Vente").attach("file", pdf, { filename: "devis.pdf", contentType: "application/pdf" }).expect(201)).body as { id: string };
    await agent.post(`/v1/quantitatifs/${q.id}/calcul?ecran=1`).send({}).expect((r) => expect(r.status).toBeLessThan(500));
    expect(await ctx.prisma.observationPrix.count()).toBe(0);
    expect(JSON.stringify((await agent.get("/v1/mes-prix").expect(200)).body)).not.toMatch(VENTE);
  });
});
