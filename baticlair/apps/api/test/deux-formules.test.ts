import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HttpStripeClient, signerCommeStripe } from "../src/modules/abonnement/index.js";
import { mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES DEUX FORMULES (RÈGLE CHANGÉE, Greg, 30 octobre 2026, réponses aux six décisions) : ESSENTIEL 19,90 € HT et PRO
 * 39,90 € HT par mois, sans engagement ; plus d'annuel. Le choix au paiement ; d'Essentiel à Pro à tout moment, au prorata ;
 * une résiliation prend effet à la fin du mois payé. Avant : mensuel 49 € HT, annuel 348 € HT (24 octobre 2026).
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
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
});

const srv = () => request(ctx.app.getHttpServer());
const q = (m: string) => `maintenant=${encodeURIComponent(m)}`;
const tache = async (m: string) => (await srv().get(`/v1/internal/abonnement?${q(m)}`).set("authorization", `Bearer ${process.env.CRON_SECRET}`).expect(200)).body;
type Agent = Awaited<ReturnType<typeof signUpWithCompany>>["agent"];
async function payer(agent: Agent, formule: "essentiel" | "pro" | undefined, m: string) {
  const { url } = (await agent.post("/v1/abonnement/payer").send(formule ? { formule } : {}).expect(200)).body;
  const session = new URL(url).searchParams.get("session")!;
  expect((await agent.get(`/v1/abonnement/simulation/${session}`).expect(200)).body).toEqual({ formule: formule ?? "essentiel" });
  return (await agent.post(`/v1/abonnement/simulation/${session}?${q(m)}`).send({ issue: "payer" }).expect(200)).body;
}
const factures = async (companyId: string) => ctx.prisma.factureAbonnement.findMany({ where: { companyId }, orderBy: { rang: "asc" } });

describe("Essentiel ou Pro", () => {
  const T = "2027-01-01T08:00:00.000Z";

  it("l'écran montre les deux formules, Essentiel d'abord ; sans choix, c'est Essentiel ; l'ancien mensuel et l'ancien annuel au paiement sont refusés", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const v = (await A.agent.get("/v1/abonnement").expect(200)).body;
    expect(v.offres).toEqual([
      { formule: "essentiel", titre: "Essentiel", badge: null, prix: "19,90 € HT par mois", details: ["3 analyses de devis par mois", "10 scans de liste par mois", "Sans engagement, résiliable quand tu veux"], enAvant: true, ttc: "23,88 €" },
      { formule: "pro", titre: "Pro", badge: null, prix: "39,90 € HT par mois", details: ["8 analyses de devis par mois", "30 scans de liste par mois", "Sans engagement, résiliable quand tu veux"], enAvant: false, ttc: "47,88 €" },
    ]);
    expect(v).toMatchObject({ formule: "essentiel", prixHt: "19,90 €", periode: "par mois", bascule: null });
    await A.agent.post("/v1/abonnement/payer").send({ formule: "annuel" }).expect(400);
    expect(await payer(A.agent, undefined, T)).toMatchObject({ acces: "abonne", formule: "essentiel" });
    // La page publique (landing, /tarifs) dit les mêmes formules, sans session.
    const pub = (await srv().get("/v1/public/tarif").expect(200)).body;
    expect(pub).toMatchObject({ argument: "Gratuit pour tes listes, tes négoces et les achats groupés. Dès 19,90 € HT par mois pour plus d'analyses de devis.", prixHt: "19,90 €", prixProHt: "39,90 €", prixDes: "19,90 €" });
    expect(pub.offres.map((o: { formule: string }) => o.formule)).toEqual(["essentiel", "pro"]);
  });

  it("Pro : 39,90 € HT pour un mois, la facture et l'e-mail le disent ; déjà Pro, rien à changer", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const v = await payer(A.agent, "pro", T);
    expect(v).toMatchObject({ acces: "abonne", formule: "pro", prixHt: "39,90 €", prixTtc: "47,88 €", periode: "par mois", periodeFin: "2027-02-01T08:00:00.000Z", bascule: null });
    const [f] = await factures(A.companyId);
    expect(f).toMatchObject({ formule: "pro", montantHtCentimes: 3990, tvaCentimes: 798, ttcCentimes: 4788 });
    const actif = mailsVers(ctx, "a@toitures.fr").find((m) => m.subject === "Ton abonnement Mobiiz est actif")!;
    expect(actif.text).toContain("Ton abonnement Mobiiz est actif (mode test : aucun paiement réel) : Pro, 39,90 € HT par mois, sans engagement");
    expect((await A.agent.post(`/v1/abonnement/pro?${q(T)}`)).body.error.details.reason).toBe("deja_pro");
  });

  it("d'Essentiel à Pro, au prorata : ce qui reste du mois est déduit, le mois de Pro commence le jour même", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await payer(A.agent, "essentiel", T);
    // Le 16 janvier : 16 jours sur 31 restent (du 16 au 1er février), 10,27 € déduits des 39,90 €.
    const M = "2027-01-16T08:00:00.000Z";
    const avantPassage = (await A.agent.get(`/v1/abonnement?${q(M)}`).expect(200)).body;
    expect(avantPassage.bascule).toEqual({ credit: "10,27 €", aPayerHt: "29,63 €", aPayerTtc: "35,56 €", jusquau: "2027-02-16T08:00:00.000Z" });
    const v = (await A.agent.post(`/v1/abonnement/pro?${q(M)}`).expect(200)).body;
    expect(v).toMatchObject({ formule: "pro", acces: "abonne", periodeFin: "2027-02-16T08:00:00.000Z", bascule: null });
    const f = await factures(A.companyId);
    expect(f.map((x) => [x.formule, x.montantHtCentimes])).toEqual([["essentiel", 1990], ["passage_pro", 3990 - 1027]]);
    expect(mailsVers(ctx, "a@toitures.fr").map((m) => m.subject)).toContain("Tu es passé à Mobiiz Pro");
    // La facture du passage dit ce qu'elle paie.
    const liste = (await A.agent.get("/v1/abonnement/factures").expect(200)).body.factures;
    expect(liste[0]).toMatchObject({ formule: "passage_pro", ht: "29,63 €", periode: "du 16/01/2027 au 16/02/2027" });
    await A.agent.get(`/v1/abonnement/factures/${liste[0].id}/pdf`).expect(200);
    // Un mois après, le renouvellement est celui de Pro : 39,90 €.
    await tache("2027-02-16T09:00:00.000Z");
    expect((await factures(A.companyId)).at(-1)).toMatchObject({ formule: "pro", montantHtCentimes: 3990 });
  });

  it("pas de passage à Pro sans abonnement, ni avec une résiliation en cours", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    expect((await A.agent.post(`/v1/abonnement/pro?${q(T)}`)).body.error.details.reason).toBe("pas_d_abonnement");
    await payer(A.agent, "essentiel", T);
    await A.agent.post(`/v1/abonnement/resilier?${q(T)}`).expect(200);
    expect((await A.agent.get(`/v1/abonnement?${q(T)}`).expect(200)).body.bascule).toBeNull();
    expect((await A.agent.post(`/v1/abonnement/pro?${q(T)}`)).body.error.details.reason).toBe("resiliation_programmee");
  });

  it("résilier : l'accès reste jusqu'à la fin du mois payé, aucun rappel annuel, aucune nouvelle facture", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await payer(A.agent, "pro", T);
    const r = (await A.agent.post(`/v1/abonnement/resilier?${q("2027-01-10T08:00:00.000Z")}`).expect(200)).body;
    expect(r).toMatchObject({ acces: "abonne", resiliationProgrammee: true, periodeFin: "2027-02-01T08:00:00.000Z" });
    const mail = mailsVers(ctx, "a@toitures.fr").find((m) => m.subject === "Ta résiliation Mobiiz est enregistrée")!;
    expect(mail.text).toContain("Tu gardes l'accès jusqu'au 01/02/2027, la fin de la période payée.");
    expect((await tache("2027-01-20T08:00:00.000Z")).rappelsAnnuels).toBe(0);
    expect((await tache("2027-02-01T09:00:00.000Z")).resilies).toBe(1);
    expect(await ctx.prisma.factureAbonnement.count({ where: { companyId: A.companyId } })).toBe(1);
  });

  it("les deux prix se règlent dans l'admin ; des réglages enregistrés avant le 30 octobre prennent les nouveaux prix", async () => {
    await ctx.prisma.parametreGroupe.create({ data: { cle: "abonnement:reglages", valeur: { prixHtCentimes: 5900, prixAnnuelHtCentimes: 39900, tauxTva: 20, joursEssaiApresResultats: 30, joursEssaiSansDepot: 60, joursGrace: 7, joursRappelAnnuel: 30 } } });
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    expect((await A.agent.get("/v1/abonnement").expect(200)).body.offres.map((o: { prix: string }) => o.prix)).toEqual(["19,90 € HT par mois", "39,90 € HT par mois"]);
    await ctx.prisma.parametreGroupe.update({ where: { cle: "abonnement:reglages" }, data: { valeur: { prixEssentielHtCentimes: 2500, prixProHtCentimes: 4500, tauxTva: 20, joursEssaiApresResultats: 30, joursEssaiSansDepot: 60, joursGrace: 7, joursRappelAnnuel: 30 } } });
    expect((await A.agent.get("/v1/abonnement").expect(200)).body.offres.map((o: { prix: string }) => o.prix)).toEqual(["25 € HT par mois", "45 € HT par mois"]);
    await payer(A.agent, "pro", T);
    expect((await factures(A.companyId))[0]).toMatchObject({ montantHtCentimes: 4500 });
  });

  it("un ancien abonnement « mensuel » ou « annuel » de la prévisualisation compte comme Essentiel", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await ctx.prisma.abonnement.create({ data: { companyId: A.companyId, statut: "actif", fournisseur: "simule", formule: "mensuel", periodeDebut: new Date(T), periodeFin: new Date("2027-02-01T08:00:00.000Z") } });
    expect((await A.agent.get(`/v1/abonnement?${q("2027-01-10T08:00:00.000Z")}`).expect(200)).body).toMatchObject({ acces: "abonne", formule: "essentiel" });
  });
});

describe("Stripe : deux prix", () => {
  it("le client HTTP : Checkout au prix de la formule, passage à Pro au prorata, formule d'un prix", async () => {
    const appels: { url: string; method: string; body?: string }[] = [];
    const fetcher = async (url: string, init: { method: string; body?: string }) => {
      appels.push({ url, method: init.method, ...(init.body !== undefined ? { body: init.body } : {}) });
      const corps = url.includes("checkout") ? { id: "cs_1", url: "https://checkout.stripe.com/x" } : url.includes("subscriptions") && init.method === "GET" ? { items: { data: [{ id: "si_1" }] } } : {};
      return { ok: true, status: 200, json: async () => corps };
    };
    const c = new HttpStripeClient({ secretKey: "sk_test_x", prix: { essentiel: "price_1990", pro: "price_3990" }, taxRateId: null }, fetcher);
    await c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "pro", succes: "https://x/ok", annulation: "https://x" });
    expect(decodeURIComponent(appels[0]!.body!)).toContain("line_items[0][price]=price_3990");
    expect(decodeURIComponent(appels[0]!.body!)).toContain("subscription_data[metadata][formule]=pro");
    await c.passerPro("sub_1");
    expect(appels[1]).toEqual({ url: "https://api.stripe.com/v1/subscriptions/sub_1", method: "GET" });
    const maj = decodeURIComponent(appels[2]!.body!);
    expect(maj).toContain("items[0][id]=si_1");
    expect(maj).toContain("items[0][price]=price_3990");
    expect(maj).toContain("proration_behavior=always_invoice");
    expect([c.formuleDuPrix("price_1990"), c.formuleDuPrix("price_3990"), c.formuleDuPrix("price_autre")]).toEqual(["essentiel", "pro", null]);
  });

  it("les webhooks : un Checkout Pro, puis la facture d'un passage à Pro lue à son prix", async () => {
    const env = { PAIEMENT: process.env.PAIEMENT, STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_ESSENTIEL: process.env.STRIPE_PRICE_ID_ESSENTIEL, STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO };
    Object.assign(process.env, { PAIEMENT: "stripe", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test_secret", STRIPE_PRICE_ID_ESSENTIEL: "price_1990", STRIPE_PRICE_ID_PRO: "price_3990" });
    const s = await createTestApp();
    try {
      const envoyer = (evt: unknown) => {
        const corps = JSON.stringify(evt);
        return request(s.app.getHttpServer()).post("/v1/abonnement/stripe/webhook").set("content-type", "application/json").set("stripe-signature", signerCommeStripe("whsec_test_secret", corps)).send(corps).expect(200);
      };
      // Un artisan prend Pro directement.
      const A = await signUpWithCompany(s.app, "a@toitures.fr", "Toitures A", ["roofing"]);
      await envoyer({ id: "evt_a1", type: "checkout.session.completed", data: { object: { client_reference_id: A.companyId, customer: "cus_a", subscription: "sub_a", metadata: { companyId: A.companyId, formule: "pro" } } } });
      await envoyer({ id: "evt_a2", type: "invoice.paid", data: { object: { id: "in_a", customer: "cus_a", billing_reason: "subscription_create", subtotal: 3990, total: 4788, lines: { data: [{ amount: 3990, pricing: { price_details: { price: "price_3990" } }, period: { start: 1798761600, end: 1801440000 } }] } } } });
      expect((await A.agent.get("/v1/abonnement").expect(200)).body).toMatchObject({ formule: "pro", prixHt: "39,90 €" });
      // Un autre passe d'Essentiel à Pro : la facture Stripe porte un crédit (négatif) puis le mois de Pro.
      const B = await signUpWithCompany(s.app, "b@toitures.fr", "Toitures B", ["roofing"]);
      await envoyer({ id: "evt_b1", type: "checkout.session.completed", data: { object: { client_reference_id: B.companyId, customer: "cus_b", subscription: "sub_b", metadata: { companyId: B.companyId, formule: "essentiel" } } } });
      await envoyer({ id: "evt_b2", type: "invoice.paid", data: { object: { id: "in_b1", customer: "cus_b", billing_reason: "subscription_create", subtotal: 1990, total: 2388, lines: { data: [{ amount: 1990, price: { id: "price_1990" }, period: { start: 1798761600, end: 1801440000 } }] } } } });
      await envoyer({ id: "evt_b3", type: "invoice.paid", data: { object: { id: "in_b2", customer: "cus_b", billing_reason: "subscription_update", subtotal: 2963, total: 3556, lines: { data: [{ amount: -1027, price: { id: "price_1990" }, period: { start: 1800144000, end: 1801440000 } }, { amount: 3990, price: { id: "price_3990" }, period: { start: 1800144000, end: 1802822400 } }] } } } });
      const b = await s.prisma.abonnement.findUniqueOrThrow({ where: { companyId: B.companyId } });
      expect(b.formule).toBe("pro");
      expect(b.periodeFin!.getTime()).toBe(1802822400 * 1000);
      const f = await s.prisma.factureAbonnement.findMany({ where: { companyId: B.companyId }, orderBy: { rang: "asc" } });
      expect(f.map((x) => [x.numero, x.formule, x.montantHtCentimes])).toEqual([["F-000002", "essentiel", 1990], ["F-000003", "passage_pro", 2963]]);
    } finally {
      await s.app.close();
      for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});
