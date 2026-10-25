import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HttpStripeClient, signerCommeStripe } from "../src/modules/abonnement/index.js";
import { mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES DEUX FORMULES (Greg, 24 octobre 2026) : MENSUEL 49 € HT par mois sans engagement, ANNUEL 348 € HT par an payé en une
 * fois (29 € par mois, -40 %). Le choix au paiement ; du mensuel à l'annuel à tout moment, au prorata ; l'annuel se
 * renouvelle seul, avec un e-mail 30 jours avant ; sa résiliation prend effet à l'échéance, sans remboursement au prorata.
 */
let ctx: TestContext;
const avant = { CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.CRON_SECRET = "secret-de-la-tache";
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
async function payer(agent: Agent, formule: "mensuel" | "annuel" | undefined, m: string) {
  const { url } = (await agent.post("/v1/abonnement/payer").send(formule ? { formule } : {}).expect(200)).body;
  const session = new URL(url).searchParams.get("session")!;
  expect((await agent.get(`/v1/abonnement/simulation/${session}`).expect(200)).body).toEqual({ formule: formule ?? "mensuel" });
  return (await agent.post(`/v1/abonnement/simulation/${session}?${q(m)}`).send({ issue: "payer" }).expect(200)).body;
}
const factures = async (companyId: string) => ctx.prisma.factureAbonnement.findMany({ where: { companyId }, orderBy: { rang: "asc" } });

describe("mensuel ou annuel", () => {
  const T = "2027-01-01T08:00:00.000Z";

  it("l'écran montre les deux formules, l'annuel d'abord ; sans choix, c'est le mensuel", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const v = (await A.agent.get("/v1/abonnement").expect(200)).body;
    expect(v.offres).toEqual([
      { formule: "annuel", titre: "Annuel", badge: "-40 %", prix: "29 € HT par mois, payé à l'année", details: ["348 € HT par an, en une fois", "240 € économisés par an", "Renouvelé chaque année, rappel 30 jours avant"], enAvant: true, ttc: "417,60 €" },
      { formule: "mensuel", titre: "Mensuel", badge: null, prix: "49 € HT par mois", details: ["Sans engagement", "Résiliable quand tu veux"], enAvant: false, ttc: "58,80 €" },
    ]);
    expect(v).toMatchObject({ formule: "mensuel", prixHt: "49 €", periode: "par mois", bascule: null });
    expect(await payer(A.agent, undefined, T)).toMatchObject({ acces: "abonne", formule: "mensuel" });
    // La page publique (landing, /tarifs) dit les mêmes formules, sans session.
    const pub = (await srv().get("/v1/public/tarif").expect(200)).body;
    expect(pub).toMatchObject({ argument: "Gratuit pour commencer. Dès 29 € HT par mois pour comparer et acheter en groupe.", prixHt: "49 €", prixAnnuelHt: "348 €", prixDes: "29 €" });
    expect(pub.offres.map((o: { formule: string }) => o.formule)).toEqual(["annuel", "mensuel"]);
  });

  it("l'annuel : 348 € HT payés en une fois, un an d'accès, la facture et l'e-mail le disent", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const v = await payer(A.agent, "annuel", T);
    expect(v).toMatchObject({ acces: "abonne", formule: "annuel", prixHt: "348 €", prixTtc: "417,60 €", periode: "par an", periodeFin: "2028-01-01T08:00:00.000Z", bascule: null });
    const [f] = await factures(A.companyId);
    expect(f).toMatchObject({ formule: "annuel", montantHtCentimes: 34800, tvaCentimes: 6960, ttcCentimes: 41760 });
    expect(f!.periodeFin.toISOString()).toBe("2028-01-01T08:00:00.000Z");
    const actif = mailsVers(ctx, "a@toitures.fr").find((m) => m.subject === "Ton abonnement Mobiiz est actif")!;
    expect(actif.text).toContain("Ton abonnement annuel Mobiiz est actif (mode test : aucun paiement réel) : 348 € HT par an, payé en une fois");
    // Déjà annuel : rien à basculer.
    expect((await A.agent.post(`/v1/abonnement/annuel?${q(T)}`)).body.error.details.reason).toBe("deja_annuel");
  });

  it("du mensuel à l'annuel, au prorata : ce qui reste du mois est déduit, l'année commence le jour même", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await payer(A.agent, "mensuel", T);
    // Le 16 janvier : 16 jours sur 31 restent (du 16 au 1er février), 25,29 € déduits des 348 €.
    const M = "2027-01-16T08:00:00.000Z";
    const avantBascule = (await A.agent.get(`/v1/abonnement?${q(M)}`).expect(200)).body;
    expect(avantBascule.bascule).toEqual({ credit: "25,29 €", aPayerHt: "322,71 €", aPayerTtc: "387,25 €", jusquau: "2028-01-16T08:00:00.000Z" });
    const v = (await A.agent.post(`/v1/abonnement/annuel?${q(M)}`).expect(200)).body;
    expect(v).toMatchObject({ formule: "annuel", acces: "abonne", periodeFin: "2028-01-16T08:00:00.000Z", bascule: null });
    const f = await factures(A.companyId);
    expect(f.map((x) => [x.formule, x.montantHtCentimes])).toEqual([["mensuel", 4900], ["bascule", 34800 - 2529]]);
    expect(mailsVers(ctx, "a@toitures.fr").map((m) => m.subject)).toContain("Tu es passé à l'abonnement annuel Mobiiz");
    // La facture du passage dit ce qu'elle paie.
    const liste = (await A.agent.get("/v1/abonnement/factures").expect(200)).body.factures;
    expect(liste[0]).toMatchObject({ formule: "bascule", ht: "322,71 €", periode: "du 16/01/2027 au 16/01/2028" });
    await A.agent.get(`/v1/abonnement/factures/${liste[0].id}/pdf`).expect(200);
    // Un an après, le renouvellement est celui de l'annuel : 348 €.
    await tache("2028-01-16T09:00:00.000Z");
    expect((await factures(A.companyId)).at(-1)).toMatchObject({ formule: "annuel", montantHtCentimes: 34800 });
  });

  it("pas de passage à l'annuel sans abonnement, ni avec une résiliation en cours", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    expect((await A.agent.post(`/v1/abonnement/annuel?${q(T)}`)).body.error.details.reason).toBe("pas_d_abonnement");
    await payer(A.agent, "mensuel", T);
    await A.agent.post(`/v1/abonnement/resilier?${q(T)}`).expect(200);
    expect((await A.agent.get(`/v1/abonnement?${q(T)}`).expect(200)).body.bascule).toBeNull();
    expect((await A.agent.post(`/v1/abonnement/annuel?${q(T)}`)).body.error.details.reason).toBe("resiliation_programmee");
  });

  it("l'annuel se renouvelle seul ; l'e-mail de rappel part 30 jours avant, une seule fois", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await payer(A.agent, "annuel", T);
    const rappels = () => mailsVers(ctx, "a@toitures.fr").filter((m) => /se renouvelle le/.test(m.subject));
    expect((await tache("2027-12-01T08:00:00.000Z")).rappelsAnnuels).toBe(0);
    expect((await tache("2027-12-03T08:00:00.000Z")).rappelsAnnuels).toBe(1);
    expect((await tache("2027-12-04T08:00:00.000Z")).rappelsAnnuels).toBe(0);
    expect(rappels().map((m) => m.subject)).toEqual(["Ton abonnement annuel Mobiiz se renouvelle le 1 janvier 2028"]);
    expect(rappels()[0]!.text).toContain("348 € HT (417,60 € TTC) pour un an");
    expect(rappels()[0]!.text).toContain("Une année commencée n'est pas remboursée au prorata.");
    // L'échéance : un an de plus, une facture de 348 €.
    expect((await tache("2028-01-01T09:00:00.000Z")).renouveles).toBe(1);
    const a = await ctx.prisma.abonnement.findUniqueOrThrow({ where: { companyId: A.companyId } });
    expect(a.periodeFin!.toISOString()).toBe("2029-01-01T08:00:00.000Z");
    expect((await factures(A.companyId)).map((f) => [f.formule, f.montantHtCentimes])).toEqual([["annuel", 34800], ["annuel", 34800]]);
    // Le mensuel n'a jamais ce rappel.
    const B = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    await payer(B.agent, "mensuel", "2028-12-10T08:00:00.000Z");
    expect((await tache("2028-12-20T08:00:00.000Z")).rappelsAnnuels).toBe(1);
    expect(mailsVers(ctx, "b@toitures.fr").filter((m) => /se renouvelle le/.test(m.subject))).toHaveLength(0);
  });

  it("résilier l'annuel : l'accès reste jusqu'à l'échéance, aucun remboursement, aucun rappel, aucune nouvelle facture", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await payer(A.agent, "annuel", T);
    const r = (await A.agent.post(`/v1/abonnement/resilier?${q("2027-03-10T08:00:00.000Z")}`).expect(200)).body;
    expect(r).toMatchObject({ acces: "abonne", resiliationProgrammee: true, periodeFin: "2028-01-01T08:00:00.000Z" });
    const mail = mailsVers(ctx, "a@toitures.fr").find((m) => m.subject === "Ta résiliation Mobiiz est enregistrée")!;
    expect(mail.text).toContain("Tu gardes l'accès jusqu'au 01/01/2028, l'échéance de ton année (une année commencée n'est pas remboursée au prorata).");
    expect((await tache("2027-12-10T08:00:00.000Z")).rappelsAnnuels).toBe(0);
    expect((await A.agent.get(`/v1/abonnement?${q("2027-12-31T08:00:00.000Z")}`).expect(200)).body.acces).toBe("abonne");
    expect((await tache("2028-01-01T09:00:00.000Z")).resilies).toBe(1);
    expect((await A.agent.get(`/v1/abonnement?${q("2028-01-01T10:00:00.000Z")}`).expect(200)).body).toMatchObject({ acces: "bloque", statut: "resilie" });
    expect(await ctx.prisma.factureAbonnement.count({ where: { companyId: A.companyId } })).toBe(1);
  });

  it("les deux prix se règlent dans l'admin", async () => {
    await ctx.prisma.parametreGroupe.create({ data: { cle: "abonnement:reglages", valeur: { prixHtCentimes: 5900, prixAnnuelHtCentimes: 39900, tauxTva: 20, joursEssaiApresResultats: 30, joursEssaiSansDepot: 60, joursGrace: 7, joursRappelAnnuel: 30 } } });
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const v = (await A.agent.get("/v1/abonnement").expect(200)).body;
    expect(v.offres.map((o: { prix: string; badge: string | null }) => [o.prix, o.badge])).toEqual([["33 € HT par mois, payé à l'année", "-43 %"], ["59 € HT par mois", null]]);
    await payer(A.agent, "annuel", T);
    expect((await factures(A.companyId))[0]).toMatchObject({ montantHtCentimes: 39900 });
  });
});

describe("Stripe : deux prix", () => {
  it("le client HTTP : Checkout au prix de la formule, passage à l'annuel au prorata, formule d'un prix", async () => {
    const appels: { url: string; method: string; body?: string }[] = [];
    const fetcher = async (url: string, init: { method: string; body?: string }) => {
      appels.push({ url, method: init.method, ...(init.body !== undefined ? { body: init.body } : {}) });
      const corps = url.includes("checkout") ? { id: "cs_1", url: "https://checkout.stripe.com/x" } : url.includes("subscriptions") && init.method === "GET" ? { items: { data: [{ id: "si_1" }] } } : {};
      return { ok: true, status: 200, json: async () => corps };
    };
    const c = new HttpStripeClient({ secretKey: "sk_test_x", prix: { mensuel: "price_49", annuel: "price_348" }, taxRateId: null }, fetcher);
    await c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "annuel", succes: "https://x/ok", annulation: "https://x" });
    expect(decodeURIComponent(appels[0]!.body!)).toContain("line_items[0][price]=price_348");
    expect(decodeURIComponent(appels[0]!.body!)).toContain("subscription_data[metadata][formule]=annuel");
    await c.basculerAnnuel("sub_1");
    expect(appels[1]).toEqual({ url: "https://api.stripe.com/v1/subscriptions/sub_1", method: "GET" });
    const maj = decodeURIComponent(appels[2]!.body!);
    expect(maj).toContain("items[0][id]=si_1");
    expect(maj).toContain("items[0][price]=price_348");
    expect(maj).toContain("proration_behavior=always_invoice");
    expect([c.formuleDuPrix("price_49"), c.formuleDuPrix("price_348"), c.formuleDuPrix("price_autre")]).toEqual(["mensuel", "annuel", null]);
  });

  it("les webhooks : un Checkout annuel, puis la facture du passage à l'annuel lue à son prix", async () => {
    const env = { PAIEMENT: process.env.PAIEMENT, STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_MENSUEL: process.env.STRIPE_PRICE_ID_MENSUEL, STRIPE_PRICE_ID_ANNUEL: process.env.STRIPE_PRICE_ID_ANNUEL };
    Object.assign(process.env, { PAIEMENT: "stripe", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test_secret", STRIPE_PRICE_ID_MENSUEL: "price_49", STRIPE_PRICE_ID_ANNUEL: "price_348" });
    const s = await createTestApp();
    try {
      const envoyer = (evt: unknown) => {
        const corps = JSON.stringify(evt);
        return request(s.app.getHttpServer()).post("/v1/abonnement/stripe/webhook").set("content-type", "application/json").set("stripe-signature", signerCommeStripe("whsec_test_secret", corps)).send(corps).expect(200);
      };
      // Un artisan prend l'annuel directement.
      const A = await signUpWithCompany(s.app, "a@toitures.fr", "Toitures A", ["roofing"]);
      await envoyer({ id: "evt_a1", type: "checkout.session.completed", data: { object: { client_reference_id: A.companyId, customer: "cus_a", subscription: "sub_a", metadata: { companyId: A.companyId, formule: "annuel" } } } });
      await envoyer({ id: "evt_a2", type: "invoice.paid", data: { object: { id: "in_a", customer: "cus_a", billing_reason: "subscription_create", subtotal: 34800, total: 41760, lines: { data: [{ amount: 34800, pricing: { price_details: { price: "price_348" } }, period: { start: 1798761600, end: 1830297600 } }] } } } });
      expect((await A.agent.get("/v1/abonnement").expect(200)).body).toMatchObject({ formule: "annuel", prixHt: "348 €" });
      // Un autre passe du mensuel à l'annuel : la facture Stripe porte un crédit (négatif) puis l'année.
      const B = await signUpWithCompany(s.app, "b@toitures.fr", "Toitures B", ["roofing"]);
      await envoyer({ id: "evt_b1", type: "checkout.session.completed", data: { object: { client_reference_id: B.companyId, customer: "cus_b", subscription: "sub_b", metadata: { companyId: B.companyId, formule: "mensuel" } } } });
      await envoyer({ id: "evt_b2", type: "invoice.paid", data: { object: { id: "in_b1", customer: "cus_b", billing_reason: "subscription_create", subtotal: 4900, total: 5880, lines: { data: [{ amount: 4900, price: { id: "price_49" }, period: { start: 1798761600, end: 1801440000 } }] } } } });
      await envoyer({ id: "evt_b3", type: "invoice.paid", data: { object: { id: "in_b2", customer: "cus_b", billing_reason: "subscription_update", subtotal: 32271, total: 38725, lines: { data: [{ amount: -2529, price: { id: "price_49" }, period: { start: 1800144000, end: 1801440000 } }, { amount: 34800, price: { id: "price_348" }, period: { start: 1800144000, end: 1831680000 } }] } } } });
      const b = await s.prisma.abonnement.findUniqueOrThrow({ where: { companyId: B.companyId } });
      expect(b.formule).toBe("annuel");
      expect(b.periodeFin!.getTime()).toBe(1831680000 * 1000);
      const f = await s.prisma.factureAbonnement.findMany({ where: { companyId: B.companyId }, orderBy: { rang: "asc" } });
      expect(f.map((x) => [x.numero, x.formule, x.montantHtCentimes])).toEqual([["F-000002", "mensuel", 4900], ["F-000003", "bascule", 32271]]);
    } finally {
      await s.app.close();
      for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});
