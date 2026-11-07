import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { signerCommeStripe } from "../src/modules/abonnement/index.js";
import { ARDOISE, couvreurAvecListe, deposerGrille, jetonDeGrille, mailsVers, tacheDuMois } from "./support/cycle.js";
import { inscrireNegoce } from "./support/negoce.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * L'ABONNEMENT ARTISAN (Greg, 24 octobre 2026) par l'API : l'essai (début, fin, prolongation par un dépôt), le paywall sur
 * chaque action bloquée, la liste gardée dans son cycle, le paiement simulé (réussi, échoué), la grâce, la résiliation,
 * la numérotation des factures, les rappels de fin d'essai, et le webhook Stripe signé.
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, GROUPE: process.env.GROUPE, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  // L'essai et le gratuit d'avant (25 octobre 2026) ne valent plus qu'hors du mode automatique (achat groupé par métier, 27 octobre 2026).
  process.env.MODE_REGROUPEMENT = "mois";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [cle, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[cle];
    else process.env[cle] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
  // Recentrage (25 octobre 2026) : sous 10 artisans actifs, le payant est offert dans la zone ; ici, le 22 a franchi le
  // seuil depuis longtemps, pour tester l'essai et le paywall.
  await ctx.prisma.parametreGroupe.create({ data: { cle: "zone:22:seuil_franchi", valeur: "2026-01-01T00:00:00.000Z" } });
});

const srv = () => request(ctx.app.getHttpServer());
const q = (m: string) => `maintenant=${encodeURIComponent(m)}`;
const tacheAbonnement = (m: string) => srv().get(`/v1/internal/abonnement?${q(m)}`).set("authorization", `Bearer ${process.env.CRON_SECRET}`).expect(200);
const inscritLe = (companyId: string, le: string) => ctx.prisma.company.update({ where: { id: companyId }, data: { createdAt: new Date(le) } });

describe("l'essai et le paywall", () => {
  it("sans dépôt : 60 jours, le bandeau compte les jours, puis déposer répond 402", async () => {
    const A = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }]);
    await inscritLe(A.companyId, "2026-08-01T10:00:00.000Z");
    const pendant = (await A.agent.get(`/v1/abonnement?${q("2026-09-18T10:00:00.000Z")}`).expect(200)).body;
    expect(pendant).toMatchObject({ acces: "essai", joursEssai: 12, bandeau: "Essai gratuit : encore 12 jours", prixHt: "19,90 €", modeTest: "Mode test : aucun paiement réel" });
    const fini = (await A.agent.get(`/v1/abonnement?${q("2026-10-10T08:00:00.000Z")}`).expect(200)).body;
    expect(fini.acces).toBe("bloque");
    expect(fini.paywall.phrase).toBe("Ton essai est terminé. Continue dès 19,90 € HT par mois.");
    const refus = await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?${q("2026-10-10T08:00:00.000Z")}`).send({ articles: A.articles, nature: "chantier" });
    expect(refus.status).toBe(402);
    expect(refus.body.error.code).toBe("abonnement_requis");
    // Ce qui reste ouvert : l'historique, le compte, les données.
    await A.agent.get("/v1/projects").expect(200);
    await A.agent.get("/v1/me/export").expect(200);
  });

  it("un dépôt prolonge l'essai jusqu'aux résultats + 30 jours ; la liste reste dans son cycle, commander attend l'abonnement ; l'écran dit l'économie réelle", { timeout: 120_000 }, async () => {
    const A = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }]);
    const AVANT = "2026-10-10T08:00:00.000Z";
    for (const n of [{ email: "alpha@negoce.fr", enseigne: "Négoce Alpha" }, { email: "beta@negoce.fr", enseigne: "Négoce Beta" }]) {
      await A.agent.post(`/v1/groupe/negoces?${q(AVANT)}`).send({ nom: n.enseigne, email: n.email, familles: ["couverture"] }).expect(201);
      await inscrireNegoce(ctx, n.email, { depot: "ZA de Kerverzot, 22300 Lannion", enseigne: n.enseigne, departements: ["22"], maintenant: AVANT });
    }
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?${q(AVANT)}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    await inscritLe(A.companyId, "2026-08-01T10:00:00.000Z");
    await ctx.prisma.besoin.updateMany({ where: { companyId: A.companyId }, data: { createdAt: new Date(AVANT) } });
    // 70 jours après l'inscription, l'essai court encore : la liste attend ses résultats.
    expect((await A.agent.get(`/v1/abonnement?${q("2026-10-12T08:00:00.000Z")}`).expect(200)).body).toMatchObject({ acces: "essai", joursEssai: null });
    await tacheDuMois(ctx, "2026-10-15T10:01:00.000Z");
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, "alpha@negoce.fr"), [["A", ARDOISE, "2400 pièces", "0,8731", "2 095,44"]], "2026-10-16T09:00:00.000Z")).status).toBe(201);
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, "beta@negoce.fr"), [["A", ARDOISE, "2400 pièces", "0,95", "2 280,00"]], "2026-10-16T10:00:00.000Z")).status).toBe(201);
    await tacheDuMois(ctx, "2026-10-22T16:01:00.000Z");
    expect((await A.agent.get(`/v1/abonnement?${q("2026-11-11T16:30:00.000Z")}`).expect(200)).body).toMatchObject({ acces: "essai", joursEssai: 10 });

    // Rappels : 7 jours avant, la veille, le jour même, une fois chacun, avec l'économie réelle.
    await tacheAbonnement("2026-11-14T17:00:00.000Z");
    await tacheAbonnement("2026-11-14T18:00:00.000Z");
    const rappels = mailsVers(ctx, "a@toitures.fr").filter((m) => /Ton essai Mobiiz se termine/.test(m.subject));
    expect(rappels.map((m) => m.subject)).toEqual(["Ton essai Mobiiz se termine dans 7 jours"]);
    expect(rappels[0]!.text).toContain("Sur ton premier cycle : 185 € d'écart avec le prix le plus cher reçu.");
    await tacheAbonnement("2026-11-20T17:00:00.000Z");
    await tacheAbonnement("2026-11-21T17:00:00.000Z");
    expect(mailsVers(ctx, "a@toitures.fr").filter((m) => /Ton essai Mobiiz se termine/.test(m.subject)).map((m) => m.subject)).toEqual(["Ton essai Mobiiz se termine dans 7 jours", "Ton essai Mobiiz se termine demain", "Ton essai Mobiiz se termine aujourd'hui"]);

    // Après l'essai : les résultats de la liste déposée pendant l'essai restent visibles ; commander attend « Je continue ».
    const APRES = "2026-11-25T08:00:00.000Z";
    const vue = (await A.agent.get(`/v1/abonnement?${q(APRES)}`).expect(200)).body;
    expect(vue.acces).toBe("bloque");
    expect(vue.paywall.economie).toBe("Sur ton premier cycle : 185 € d'écart avec le prix le plus cher reçu");
    const commande = (await A.agent.get(`/v1/commande-du-mois?${q(APRES)}`).expect(200)).body.commandes[0];
    expect(commande.resultatsBloques).toBe(false);
    expect(commande.resultats.negoces).toHaveLength(2);
    const refus = await A.agent.post(`/v1/commande-du-mois/${commande.cycleId}/commander?${q(APRES)}`).send({ negoceId: commande.resultats.negoces[0].negoceId });
    expect(refus.status).toBe(402);
    // « Recommander à ce prix » aussi.
    expect((await A.agent.post(`/v1/commande-du-mois/${commande.cycleId}/recommander?${q(APRES)}`).send({ lignes: [{ cle: "x", quantite: 1 }], adresseLivraison: "3 rue des Ajoncs, 22300 Lannion" })).status).toBe(402);

    // Je continue (paiement simulé) : commander repart.
    const { url } = (await A.agent.post("/v1/abonnement/payer").expect(200)).body;
    const session = new URL(url).searchParams.get("session")!;
    await A.agent.post(`/v1/abonnement/simulation/${session}?${q(APRES)}`).send({ issue: "payer" }).expect(200);
    await A.agent.post(`/v1/commande-du-mois/${commande.cycleId}/commander?${q(APRES)}`).send({ negoceId: commande.resultats.negoces[0].negoceId }).expect(200);
  });
});

describe("le paiement simulé", () => {
  const T = "2026-10-24T08:00:00.000Z";
  async function payer(agent: Awaited<ReturnType<typeof signUpWithCompany>>["agent"], issue: "payer" | "echec", m = T) {
    const { url } = (await agent.post("/v1/abonnement/payer").expect(200)).body;
    expect(url).toMatch(/\/paiement-simule\?session=sim_/);
    const session = new URL(url).searchParams.get("session")!;
    return (await agent.post(`/v1/abonnement/simulation/${session}?${q(m)}`).send({ issue }).expect(200)).body;
  }

  it("payer : abonné, facture TEST numérotée sans trou entre entreprises et renouvellements, PDF, e-mail", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const B = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    await A.agent.put("/v1/abonnement/tva").send({ tvaIntra: "FR 12 345678901" }).expect(200);
    expect(await payer(A.agent, "payer")).toMatchObject({ acces: "abonne", statut: "actif", tvaIntra: "FR12345678901" });
    await payer(B.agent, "payer");
    expect(mailsVers(ctx, "a@toitures.fr").map((m) => m.subject)).toContain("Ton abonnement Mobiiz est actif");
    // Le renouvellement simulé du mois (le même événement que Stripe).
    await tacheAbonnement("2026-11-24T09:00:00.000Z");
    await tacheAbonnement("2026-11-24T10:00:00.000Z");
    const fa = (await A.agent.get("/v1/abonnement/factures").expect(200)).body.factures;
    const fb = (await B.agent.get("/v1/abonnement/factures").expect(200)).body.factures;
    // Deux factures chacune ; ensemble, une seule suite continue (1, 2, 3, 4), sans trou.
    expect(fa).toHaveLength(2);
    expect(fb).toHaveLength(2);
    expect(fa.at(-1).numero).toBe("TEST-000001");
    expect([...fa, ...fb].map((f: { numero: string }) => f.numero).sort()).toEqual(["TEST-000001", "TEST-000002", "TEST-000003", "TEST-000004"]);
    expect(fa[1]).toMatchObject({ test: true, ht: "19,90 €", ttc: "23,88 €" });
    const pdf = await A.agent.get(`/v1/abonnement/factures/${fa[1].id}/pdf`).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on("data", (d: Buffer) => c.push(d)); res.on("end", () => cb(null, Buffer.concat(c))); }).expect(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
    // La facture d'une autre entreprise n'existe pas pour elle.
    await B.agent.get(`/v1/abonnement/factures/${fa[1].id}/pdf`).expect(404);
    const rangs = await ctx.prisma.factureAbonnement.findMany({ orderBy: { rang: "asc" }, select: { rang: true, ttcCentimes: true, tvaCentimes: true, montantHtCentimes: true, raisonSociale: true } });
    expect(rangs.map((r) => r.rang)).toEqual([1, 2, 3, 4]);
    expect(rangs[0]).toMatchObject({ montantHtCentimes: 1990, tvaCentimes: 398, ttcCentimes: 2388, raisonSociale: "Toitures A" });
  });

  it("échec : 7 jours de grâce avec bandeau et e-mail, puis le paywall ; la session ne se rejoue pas", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await inscritLe(A.companyId, "2026-07-01T10:00:00.000Z");
    const grace = await payer(A.agent, "echec");
    expect(grace).toMatchObject({ acces: "grace", bandeauRouge: true });
    expect(grace.bandeau).toBe("Ton paiement n'est pas passé. Mets à jour ta carte avant le 31/10 pour garder l'accès.");
    expect(mailsVers(ctx, "a@toitures.fr").map((m) => m.subject)).toContain("Ton paiement Mobiiz n'est pas passé");
    expect((await A.agent.get(`/v1/abonnement?${q("2026-11-01T09:00:00.000Z")}`).expect(200)).body.acces).toBe("bloque");
    expect(await ctx.prisma.factureAbonnement.count()).toBe(0);
  });

  it("résiliation : effet en fin de période, e-mail de confirmation, puis le paywall", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await inscritLe(A.companyId, "2026-07-01T10:00:00.000Z");
    await payer(A.agent, "payer");
    const r = (await A.agent.post(`/v1/abonnement/resilier?${q("2026-11-01T08:00:00.000Z")}`).expect(200)).body;
    expect(r).toMatchObject({ acces: "abonne", resiliationProgrammee: true });
    expect(mailsVers(ctx, "a@toitures.fr").map((m) => m.subject)).toContain("Ta résiliation Mobiiz est enregistrée");
    await tacheAbonnement("2026-11-24T09:00:00.000Z");
    expect(await ctx.prisma.factureAbonnement.count()).toBe(1);
    expect((await A.agent.get(`/v1/abonnement?${q("2026-11-24T10:00:00.000Z")}`).expect(200)).body).toMatchObject({ acces: "bloque", statut: "resilie" });
    // Les factures restent consultables.
    expect((await A.agent.get("/v1/abonnement/factures").expect(200)).body.factures).toHaveLength(1);
  });
});

describe("Stripe, prêt mais éteint", () => {
  it("le webhook n'existe pas en paiement simulé", async () => {
    await srv().post("/v1/abonnement/stripe/webhook").send({}).expect(404);
  });

  it("allumé : signature obligatoire, checkout puis invoice.paid → abonné et facture F-000001, un événement rejoué ne compte pas", async () => {
    const env = { PAIEMENT: process.env.PAIEMENT, STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_ESSENTIEL: process.env.STRIPE_PRICE_ID_ESSENTIEL, STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO };
    Object.assign(process.env, { PAIEMENT: "stripe", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test_secret", STRIPE_PRICE_ID_ESSENTIEL: "price_1990", STRIPE_PRICE_ID_PRO: "price_3990" });
    const s = await createTestApp();
    try {
      const A = await signUpWithCompany(s.app, "s@toitures.fr", "Toitures S", ["roofing"]);
      const envoyer = (evt: unknown, signature?: string) => {
        const corps = JSON.stringify(evt);
        return request(s.app.getHttpServer()).post("/v1/abonnement/stripe/webhook").set("content-type", "application/json").set("stripe-signature", signature ?? signerCommeStripe("whsec_test_secret", corps)).send(corps);
      };
      const checkout = { id: "evt_1", type: "checkout.session.completed", data: { object: { client_reference_id: A.companyId, customer: "cus_1", subscription: "sub_1" } } };
      await envoyer(checkout, "t=1,v1=00").expect(403);
      await envoyer(checkout).expect(200);
      const paid = { id: "evt_2", type: "invoice.paid", data: { object: { id: "in_1", customer: "cus_1", billing_reason: "subscription_create", subtotal: 1990, total: 2388, lines: { data: [{ period: { start: 1793000000, end: 1795600000 } }] } } } };
      await envoyer(paid).expect(200);
      await envoyer(paid).expect(200);
      expect((await A.agent.get("/v1/abonnement").expect(200)).body).toMatchObject({ acces: "abonne", paiement: "stripe", modeTest: null });
      const f = await s.prisma.factureAbonnement.findMany();
      expect(f.map((x) => [x.numero, x.ttcCentimes])).toEqual([["F-000001", 2388]]);
      await envoyer({ id: "evt_3", type: "invoice.payment_failed", data: { object: { customer: "cus_1" } } }).expect(200);
      expect((await A.agent.get("/v1/abonnement").expect(200)).body.acces).toBe("grace");
      await envoyer({ id: "evt_4", type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_1" } } }).expect(200);
      expect((await s.prisma.abonnement.findUniqueOrThrow({ where: { companyId: A.companyId } })).statut).toBe("resilie");
    } finally {
      await s.app.close();
      for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});
