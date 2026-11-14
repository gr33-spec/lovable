import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HttpStripeClient, signerCommeStripe } from "../src/modules/abonnement/index.js";
import { mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * MENSUEL OU ANNUEL (RÈGLE CHANGÉE, Greg, 12 novembre 2026, dossier de corrections UX, point 13). L'annuel : dix mois
 * facturés pour douze mois de service, payé en une fois. Essentiel 199 € HT par an, Pro 399 € HT par an. Tout est testé en
 * paiement SIMULÉ ou avec un faux Stripe : aucun appel réel, aucun prix créé chez le prestataire.
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.CRON_SECRET = "secret-de-la-tache";
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
});

const srv = () => request(ctx.app.getHttpServer());
const q = (m: string) => `maintenant=${encodeURIComponent(m)}`;
const tache = async (m: string) => (await srv().get(`/v1/internal/abonnement?${q(m)}`).set("authorization", `Bearer ${process.env.CRON_SECRET}`).expect(200)).body;
type Agent = Awaited<ReturnType<typeof signUpWithCompany>>["agent"];
async function session(agent: Agent, corps: Record<string, string>) {
  const { url } = (await agent.post("/v1/abonnement/payer").send(corps).expect(200)).body;
  return new URL(url).searchParams.get("session")!;
}
const factures = async (companyId: string) => ctx.prisma.factureAbonnement.findMany({ where: { companyId }, orderBy: { rang: "asc" } });
const T = "2027-01-01T08:00:00.000Z";

describe("abonnement annuel (paiement simulé)", () => {
  it("l'écran : les deux formules au mois et à l'année, le montant facturé, l'équivalent, les deux mois offerts", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const v = (await A.agent.get("/v1/abonnement").expect(200)).body;
    expect(v).toMatchObject({ periodicite: "mensuel", periode: "par mois", annuelDisponible: true });
    expect(v.offres.map((o: { formule: string; annuel: unknown }) => [o.formule, o.annuel])).toEqual([
      ["essentiel", { prix: "199 € HT par an", equivalent: "soit 16,58 € HT par mois", economie: "2 mois offerts : 39,80 € HT de moins que douze mois payés au mois", details: ["3 analyses de devis par mois", "10 scans de liste par mois", "Payé en une fois, renouvelé chaque année ; tu peux arrêter le renouvellement quand tu veux, l'année payée reste acquise."], ttc: "238,80 €" }],
      ["pro", { prix: "399 € HT par an", equivalent: "soit 33,25 € HT par mois", economie: "2 mois offerts : 79,80 € HT de moins que douze mois payés au mois", details: ["8 analyses de devis par mois", "30 scans de liste par mois", "Payé en une fois, renouvelé chaque année ; tu peux arrêter le renouvellement quand tu veux, l'année payée reste acquise."], ttc: "478,80 €" }],
    ]);
    await A.agent.post("/v1/abonnement/payer").send({ formule: "essentiel", periodicite: "trimestriel" }).expect(400);
  });

  it("Essentiel annuel : 199 € HT facturés une fois, un an d'accès, la facture le dit, les quotas restent ceux d'Essentiel", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const s = await session(A.agent, { formule: "essentiel", periodicite: "annuel" });
    expect((await A.agent.get(`/v1/abonnement/simulation/${s}`).expect(200)).body).toEqual({ formule: "essentiel", periodicite: "annuel" });
    const v = (await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200)).body;
    expect(v).toMatchObject({ acces: "abonne", formule: "essentiel", periodicite: "annuel", prixHt: "199 €", prixTtc: "238,80 €", periode: "par an", periodeFin: "2028-01-01T08:00:00.000Z", bascule: null });
    // Double appui sur « Payer » : une seule facture, une seule année.
    await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    const f = await factures(A.companyId);
    expect(f.map((x) => [x.formule, x.montantHtCentimes, x.tvaCentimes, x.ttcCentimes, x.periodeFin.toISOString()])).toEqual([["essentiel_annuel", 19_900, 3_980, 23_880, "2028-01-01T08:00:00.000Z"]]);
    const pdf = await A.agent.get(`/v1/abonnement/factures/${f[0]!.id}/pdf`).expect(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect((await A.agent.get(`/v1/quotas?${q(T)}`)).status).toBeLessThan(500);
    // Onze mois plus tard : toujours abonné, rien n'a été refacturé.
    expect(await tache("2027-12-01T08:00:00.000Z")).toMatchObject({ renouveles: 0 });
    expect((await A.agent.get(`/v1/abonnement?${q("2027-12-01T08:00:00.000Z")}`)).body.acces).toBe("abonne");
    expect(await factures(A.companyId)).toHaveLength(1);
  });

  it("Pro annuel : 399 € HT ; le rappel 30 jours avant dit le bon montant ; le renouvellement refait une année, une seule fois", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const s = await session(A.agent, { formule: "pro", periodicite: "annuel" });
    const v = (await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200)).body;
    expect(v).toMatchObject({ formule: "pro", periodicite: "annuel", prixHt: "399 €", prixTtc: "478,80 €", periode: "par an" });
    expect((await tache("2027-12-05T08:00:00.000Z")).rappelsAnnuels).toBe(1);
    expect((await tache("2027-12-06T08:00:00.000Z")).rappelsAnnuels).toBe(0);
    const rappel = mailsVers(ctx, "a@toitures.fr").find((m) => m.subject.includes("se renouvelle"))!;
    expect(rappel.text).toContain("399 € HT (478,80 € TTC) pour un an");
    // L'échéance : une nouvelle année, une facture de plus ; rejouer la tâche ne refacture pas.
    expect((await tache("2028-01-01T09:00:00.000Z")).renouveles).toBe(1);
    expect((await tache("2028-01-01T10:00:00.000Z")).renouveles).toBe(0);
    const f = await factures(A.companyId);
    expect(f.map((x) => [x.formule, x.montantHtCentimes])).toEqual([["pro_annuel", 39_900], ["pro_annuel", 39_900]]);
    expect((await ctx.prisma.abonnement.findUniqueOrThrow({ where: { companyId: A.companyId } })).periodeFin!.toISOString()).toBe("2029-01-01T08:00:00.000Z");
  });

  it("le mensuel ne change pas ; résilier un annuel garde l'accès jusqu'au bout de l'année payée, sans nouvelle facture", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const m = await session(A.agent, { formule: "essentiel" });
    expect((await A.agent.post(`/v1/abonnement/simulation/${m}?${q(T)}`).send({ issue: "payer" }).expect(200)).body).toMatchObject({ periodicite: "mensuel", prixHt: "19,90 €", periode: "par mois", periodeFin: "2027-02-01T08:00:00.000Z" });
    expect((await factures(A.companyId)).map((x) => [x.formule, x.montantHtCentimes])).toEqual([["essentiel", 1_990]]);
    const B = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    const s = await session(B.agent, { formule: "essentiel", periodicite: "annuel" });
    await B.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    expect((await B.agent.post(`/v1/abonnement/resilier?${q("2027-03-01T08:00:00.000Z")}`).send({}).expect(200)).body).toMatchObject({ resiliationProgrammee: true, acces: "abonne" });
    expect((await B.agent.get(`/v1/abonnement?${q("2027-12-31T08:00:00.000Z")}`)).body.acces).toBe("abonne");
    // (Le compte mensuel A, lui, se renouvelle normalement dans la même tâche.)
    expect((await tache("2028-01-01T09:00:00.000Z")).resilies).toBe(1);
    expect(await factures(B.companyId)).toHaveLength(1);
    expect((await B.agent.get(`/v1/abonnement?${q("2028-01-02T08:00:00.000Z")}`)).body.acces).not.toBe("abonne");
  });

  it("changement de formule : d'Essentiel mensuel à Pro au prorata comme avant ; un annuel ne bascule pas en cours d'année, avec une phrase", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const m = await session(A.agent, { formule: "essentiel" });
    await A.agent.post(`/v1/abonnement/simulation/${m}?${q(T)}`).send({ issue: "payer" }).expect(200);
    expect((await A.agent.post(`/v1/abonnement/pro?${q("2027-01-16T08:00:00.000Z")}`).send({}).expect(200)).body).toMatchObject({ formule: "pro", periodicite: "mensuel" });
    const B = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    const s = await session(B.agent, { formule: "essentiel", periodicite: "annuel" });
    await B.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    const refus = await B.agent.post(`/v1/abonnement/pro?${q("2027-02-01T08:00:00.000Z")}`).send({});
    expect(refus.status).toBe(400);
    expect(refus.body.error.details).toMatchObject({ reason: "abonnement_annuel", phrase: "Ton abonnement est annuel : le passage à Pro se fait à son échéance. Écris-nous si tu en as besoin avant." });
    expect(await factures(B.companyId)).toHaveLength(1);
  });

  it("paiement refusé : rien n'est facturé, aucun accès ; une autre entreprise ne paie pas la session d'une autre", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const B = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    const s = await session(A.agent, { formule: "pro", periodicite: "annuel" });
    await B.agent.get(`/v1/abonnement/simulation/${s}`).expect(404);
    await B.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(404);
    const v = (await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "echec" }).expect(200)).body;
    expect(v.statut).toBe("echec");
    expect(await factures(A.companyId)).toHaveLength(0);
    expect(await ctx.prisma.factureAbonnement.count()).toBe(0);
  });
});

describe("abonnement annuel (faux Stripe, aucun appel réel)", () => {
  const client = (prixAnnuel: { essentiel: string | null; pro: string | null } | null) => {
    const appels: { url: string; body?: string }[] = [];
    const fetcher = async (url: string, init: { method: string; body?: string }) => {
      appels.push({ url, ...(init.body !== undefined ? { body: init.body } : {}) });
      return { ok: true, status: 200, json: async () => ({ id: "cs_1", url: "https://checkout.stripe.com/x" }) };
    };
    return { c: new HttpStripeClient({ secretKey: "sk_test_x", prix: { essentiel: "price_1990", pro: "price_3990" }, prixAnnuel, taxRateId: null }, fetcher), appels };
  };

  it("le client : le Checkout annuel prend le prix annuel et le dit en métadonnée ; sans prix annuel, rien n'est demandé à Stripe", async () => {
    const { c, appels } = client({ essentiel: "price_199an", pro: "price_399an" });
    expect(c.annuelDisponible()).toBe(true);
    await c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "pro", periodicite: "annuel", succes: "https://x/ok", annulation: "https://x" });
    const corps = decodeURIComponent(appels[0]!.body!);
    expect(corps).toContain("line_items[0][price]=price_399an");
    expect(corps).toContain("subscription_data[metadata][periodicite]=annuel");
    expect(appels[0]!.url).toBe("https://api.stripe.com/v1/checkout/sessions");
    await c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "essentiel", succes: "https://x/ok", annulation: "https://x" });
    expect(decodeURIComponent(appels[1]!.body!)).toContain("line_items[0][price]=price_1990");
    expect([c.formuleDuPrix("price_199an"), c.formuleDuPrix("price_399an"), c.formuleDuPrix("price_1990")]).toEqual(["essentiel", "pro", "essentiel"]);
    expect([c.periodiciteDuPrix("price_199an"), c.periodiciteDuPrix("price_399an"), c.periodiciteDuPrix("price_3990"), c.periodiciteDuPrix("price_autre"), c.periodiciteDuPrix(null)]).toEqual(["annuel", "annuel", "mensuel", null, null]);
    // Sans prix annuel configuré : indisponible, et le Checkout annuel échoue AVANT tout appel.
    const sans = client(null);
    expect(sans.c.annuelDisponible()).toBe(false);
    expect(client({ essentiel: "price_199an", pro: null }).c.annuelDisponible()).toBe(false);
    await expect(sans.c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "pro", periodicite: "annuel", succes: "https://x/ok", annulation: "https://x" })).rejects.toThrow("prix annuel non configuré");
    expect(sans.appels).toHaveLength(0);
  });

  it("Stripe sans prix annuels : l'annuel est dit indisponible et refusé avec une phrase ; avec eux, les webhooks ouvrent une année, une seule fois même rejoués", async () => {
    const cles = ["PAIEMENT", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID_ESSENTIEL", "STRIPE_PRICE_ID_PRO", "STRIPE_PRICE_ID_ESSENTIEL_ANNUEL", "STRIPE_PRICE_ID_PRO_ANNUEL"] as const;
    const env = Object.fromEntries(cles.map((k) => [k, process.env[k]]));
    Object.assign(process.env, { PAIEMENT: "stripe", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test_secret", STRIPE_PRICE_ID_ESSENTIEL: "price_1990", STRIPE_PRICE_ID_PRO: "price_3990" });
    delete process.env.STRIPE_PRICE_ID_ESSENTIEL_ANNUEL;
    delete process.env.STRIPE_PRICE_ID_PRO_ANNUEL;
    let s = await createTestApp();
    try {
      const A = await signUpWithCompany(s.app, "a@toitures.fr", "Toitures A", ["roofing"]);
      expect((await A.agent.get("/v1/abonnement").expect(200)).body.annuelDisponible).toBe(false);
      const refus = await A.agent.post("/v1/abonnement/payer").send({ formule: "essentiel", periodicite: "annuel" });
      expect(refus.status).toBe(400);
      expect(refus.body.error.details).toMatchObject({ reason: "annuel_indisponible", phrase: "L'abonnement annuel n'est pas encore ouvert au paiement. Choisis le mensuel pour l'instant." });
      await s.app.close();

      Object.assign(process.env, { STRIPE_PRICE_ID_ESSENTIEL_ANNUEL: "price_199an", STRIPE_PRICE_ID_PRO_ANNUEL: "price_399an" });
      s = await createTestApp();
      const envoyer = (evt: unknown) => {
        const corps = JSON.stringify(evt);
        return request(s.app.getHttpServer()).post("/v1/abonnement/stripe/webhook").set("content-type", "application/json").set("stripe-signature", signerCommeStripe("whsec_test_secret", corps)).send(corps).expect(200);
      };
      const B = await signUpWithCompany(s.app, "b@toitures.fr", "Toitures B", ["roofing"]);
      expect((await B.agent.get("/v1/abonnement").expect(200)).body.annuelDisponible).toBe(true);
      const checkout = { id: "evt_1", type: "checkout.session.completed", data: { object: { client_reference_id: B.companyId, customer: "cus_b", subscription: "sub_b", metadata: { companyId: B.companyId, formule: "essentiel", periodicite: "annuel" } } } };
      const payee = { id: "evt_2", type: "invoice.paid", data: { object: { id: "in_b", customer: "cus_b", billing_reason: "subscription_create", subtotal: 19900, total: 23880, lines: { data: [{ amount: 19900, pricing: { price_details: { price: "price_199an" } }, period: { start: 1798761600, end: 1830297600 } }] } } } };
      await envoyer(checkout);
      await envoyer(payee);
      // Webhooks rejoués par Stripe : rien en double.
      await envoyer(checkout);
      await envoyer(payee);
      expect((await B.agent.get("/v1/abonnement").expect(200)).body).toMatchObject({ formule: "essentiel", periodicite: "annuel", prixHt: "199 €", periode: "par an" });
      const f = await s.prisma.factureAbonnement.findMany({ where: { companyId: B.companyId } });
      expect(f.map((x) => [x.formule, x.montantHtCentimes, x.ttcCentimes])).toEqual([["essentiel_annuel", 19_900, 23_880]]);
      expect((await s.prisma.abonnement.findUniqueOrThrow({ where: { companyId: B.companyId } })).periodeFin!.getTime()).toBe(1830297600 * 1000);
      // Une signature fausse est refusée.
      await request(s.app.getHttpServer()).post("/v1/abonnement/stripe/webhook").set("content-type", "application/json").set("stripe-signature", "t=1,v1=faux").send(JSON.stringify(payee)).expect(403);
    } finally {
      await s.app.close();
      for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe("jamais deux paiements pour la même période (recette du 13 novembre 2026, B4)", () => {
  it("l'e-mail de confirmation d'un abonnement à l'année dit le prix à l'année, jamais le prix au mois (B5)", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const s = await session(A.agent, { formule: "pro", periodicite: "annuel" });
    await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    const mail = ctx.emails.sent.filter((m) => m.to === "a@toitures.fr" && m.subject === "Ton abonnement Mobiiz est actif").at(-1)!;
    expect(mail.text).toContain("Pro, 399 € HT par an, payé en une fois");
    expect(mail.text).not.toContain("39,90 € HT par mois");
  });

  it("abonné au mois, un second paiement est refusé d'une phrase, sans facture ; après la fin de la période, payer redevient possible", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const s = await session(A.agent, { formule: "essentiel", periodicite: "mensuel" });
    await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    // Une nouvelle session de paiement n'est même pas ouverte.
    const refus = await A.agent.post(`/v1/abonnement/payer?${q(T)}`).send({ formule: "essentiel", periodicite: "annuel" }).expect(400);
    expect(refus.body.error.details).toMatchObject({ reason: "deja_abonne" });
    expect(refus.body.error.details.phrase).toMatch(/^Tu es déjà abonné jusqu'au /);
    expect(await factures(A.companyId)).toHaveLength(1);
  });
});
