import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HttpStripeClient, signerCommeStripe } from "../src/modules/abonnement/index.js";
import { mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES DEUX FORMULES (RÈGLE CHANGÉE, Greg, 15 novembre 2026) : PRO 29 € HT et PRO MAX 49 € HT par mois, sans engagement.
 * Le choix au paiement ; de Pro à Pro Max à tout moment, au prorata ; une résiliation prend effet à la fin du mois payé.
 * Avant (30 octobre 2026) : Essentiel 19,90 € HT et Pro 39,90 € HT.
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
async function payer(agent: Agent, formule: "pro" | "promax" | undefined, m: string) {
  const { url } = (await agent.post("/v1/abonnement/payer").send(formule ? { formule } : {}).expect(200)).body;
  const session = new URL(url).searchParams.get("session")!;
  expect((await agent.get(`/v1/abonnement/simulation/${session}`).expect(200)).body).toEqual({ formule: formule ?? "pro", periodicite: "mensuel" });
  return (await agent.post(`/v1/abonnement/simulation/${session}?${q(m)}`).send({ issue: "payer" }).expect(200)).body;
}
const factures = async (companyId: string) => ctx.prisma.factureAbonnement.findMany({ where: { companyId }, orderBy: { rang: "asc" } });

describe("Pro ou Pro Max", () => {
  const T = "2027-01-01T08:00:00.000Z";

  it("l'écran montre les deux formules, Pro d'abord ; sans choix, c'est Pro ; l'ancien mensuel et l'ancien annuel au paiement sont refusés", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const v = (await A.agent.get("/v1/abonnement").expect(200)).body;
    // Le mensuel n'a pas changé (l'annuel de chaque formule a ses propres tests, `abonnement-annuel.test.ts`).
    expect(v.offres.map((o: Record<string, unknown>) => ({ formule: o.formule, titre: o.titre, badge: o.badge, prix: o.prix, details: o.details, enAvant: o.enAvant, ttc: o.ttc }))).toEqual([
      { formule: "pro", titre: "Pro", badge: null, prix: "29 € HT par mois", details: ["Tout le Gratuit", "L'analyse de tes devis, photos et listes incluse", "Achats groupés : tu vois le négoce retenu et tu commandes", "Sans engagement, résiliable quand tu veux"], enAvant: true, ttc: "34,80 €" },
      { formule: "promax", titre: "Pro Max", badge: null, prix: "49 € HT par mois", details: ["Tout le Pro", "Pour ceux qui font analyser beaucoup de documents : une limite d'usage bien plus haute", "Sans engagement, résiliable quand tu veux"], enAvant: false, ttc: "58,80 €" },
    ]);
    expect(v).toMatchObject({ formule: "pro", prixHt: "29 €", periode: "par mois", bascule: null });
    await A.agent.post("/v1/abonnement/payer").send({ formule: "annuel" }).expect(400);
    expect(await payer(A.agent, undefined, T)).toMatchObject({ acces: "abonne", formule: "pro" });
    // La page publique (landing, /tarifs) dit les mêmes formules, sans session.
    const pub = (await srv().get("/v1/public/tarif").expect(200)).body;
    expect(pub).toMatchObject({ argument: "Gratuit pour tes listes, tes négoces et les achats groupés. Dès 29 € HT par mois pour l'analyse de tes devis et la commande en achat groupé.", prixHt: "29 €", prixProMaxHt: "49 €", prixDes: "29 €" });
    expect(pub.offres.map((o: { formule: string }) => o.formule)).toEqual(["pro", "promax"]);
  });

  it("Pro : 49 € HT pour un mois, la facture et l'e-mail le disent ; déjà Pro, rien à changer", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const v = await payer(A.agent, "promax", T);
    expect(v).toMatchObject({ acces: "abonne", formule: "promax", prixHt: "49 €", prixTtc: "58,80 €", periode: "par mois", periodeFin: "2027-02-01T08:00:00.000Z", bascule: null });
    const [f] = await factures(A.companyId);
    expect(f).toMatchObject({ formule: "promax", montantHtCentimes: 4900, tvaCentimes: 980, ttcCentimes: 5880 });
    const actif = mailsVers(ctx, "a@toitures.fr").find((m) => m.subject === "Ton abonnement Mobiiz est actif")!;
    expect(actif.text).toContain("Ton abonnement Mobiiz est actif (mode test : aucun paiement réel) : Pro Max, 49 € HT par mois, sans engagement");
    expect((await A.agent.post(`/v1/abonnement/promax?${q(T)}`)).body.error.details.reason).toBe("deja_promax");
  });

  it("de Pro à Pro, au prorata : ce qui reste du mois est déduit, le mois de Pro commence le jour même", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await payer(A.agent, "pro", T);
    // Le 16 janvier : 16 jours sur 31 restent (du 16 au 1er février), 14,97 € des 29 € de Pro déduits des 49 €.
    const M = "2027-01-16T08:00:00.000Z";
    const avantPassage = (await A.agent.get(`/v1/abonnement?${q(M)}`).expect(200)).body;
    expect(avantPassage.bascule).toEqual({ credit: "14,97 €", aPayerHt: "34,03 €", aPayerTtc: "40,84 €", jusquau: "2027-02-16T08:00:00.000Z" });
    const v = (await A.agent.post(`/v1/abonnement/promax?${q(M)}`).expect(200)).body;
    expect(v).toMatchObject({ formule: "promax", acces: "abonne", periodeFin: "2027-02-16T08:00:00.000Z", bascule: null });
    const f = await factures(A.companyId);
    expect(f.map((x) => [x.formule, x.montantHtCentimes])).toEqual([["pro", 2900], ["passage_promax", 4900 - 1497]]);
    expect(mailsVers(ctx, "a@toitures.fr").map((m) => m.subject)).toContain("Tu es passé à Mobiiz Pro Max");
    // La facture du passage dit ce qu'elle paie.
    const liste = (await A.agent.get("/v1/abonnement/factures").expect(200)).body.factures;
    expect(liste[0]).toMatchObject({ formule: "passage_promax", ht: "34,03 €", periode: "du 16/01/2027 au 16/02/2027" });
    await A.agent.get(`/v1/abonnement/factures/${liste[0].id}/pdf`).expect(200);
    // Un mois après, le renouvellement est celui de Pro : 49 €.
    await tache("2027-02-16T09:00:00.000Z");
    expect((await factures(A.companyId)).at(-1)).toMatchObject({ formule: "promax", montantHtCentimes: 4900 });
  });

  it("pas de passage à Pro Max sans abonnement, ni avec une résiliation en cours", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    expect((await A.agent.post(`/v1/abonnement/promax?${q(T)}`)).body.error.details.reason).toBe("pas_d_abonnement");
    await payer(A.agent, "pro", T);
    await A.agent.post(`/v1/abonnement/resilier?${q(T)}`).expect(200);
    expect((await A.agent.get(`/v1/abonnement?${q(T)}`).expect(200)).body.bascule).toBeNull();
    expect((await A.agent.post(`/v1/abonnement/promax?${q(T)}`)).body.error.details.reason).toBe("resiliation_programmee");
  });

  it("résilier : l'accès reste jusqu'à la fin du mois payé, aucun rappel annuel, aucune nouvelle facture", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await payer(A.agent, "promax", T);
    const r = (await A.agent.post(`/v1/abonnement/resilier?${q("2027-01-10T08:00:00.000Z")}`).expect(200)).body;
    expect(r).toMatchObject({ acces: "abonne", resiliationProgrammee: true, periodeFin: "2027-02-01T08:00:00.000Z" });
    const mail = mailsVers(ctx, "a@toitures.fr").find((m) => m.subject === "Ta résiliation Mobiiz est enregistrée")!;
    expect(mail.text).toContain("Tu gardes l'accès jusqu'au 01/02/2027, la fin de la période payée.");
    expect((await tache("2027-01-20T08:00:00.000Z")).rappelsAnnuels).toBe(0);
    expect((await tache("2027-02-01T09:00:00.000Z")).resilies).toBe(1);
    expect(await ctx.prisma.factureAbonnement.count({ where: { companyId: A.companyId } })).toBe(1);
  });

  it("les deux prix se règlent dans l'admin ; des réglages enregistrés avant le 30 octobre prennent les nouveaux prix", async () => {
    await ctx.prisma.parametreGroupe.create({ data: { cle: "abonnement:reglages", valeur: { prixHtCentimes: 5900, prixAnnuelHtCentimes: 49000, tauxTva: 20, joursEssaiApresResultats: 30, joursEssaiSansDepot: 60, joursGrace: 7, joursRappelAnnuel: 30 } } });
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    expect((await A.agent.get("/v1/abonnement").expect(200)).body.offres.map((o: { prix: string }) => o.prix)).toEqual(["29 € HT par mois", "49 € HT par mois"]);
    await ctx.prisma.parametreGroupe.update({ where: { cle: "abonnement:reglages" }, data: { valeur: { prixMensuelProHtCentimes: 2500, prixMensuelProMaxHtCentimes: 4500, tauxTva: 20, joursEssaiApresResultats: 30, joursEssaiSansDepot: 60, joursGrace: 7, joursRappelAnnuel: 30 } } });
    expect((await A.agent.get("/v1/abonnement").expect(200)).body.offres.map((o: { prix: string }) => o.prix)).toEqual(["25 € HT par mois", "45 € HT par mois"]);
    await payer(A.agent, "promax", T);
    expect((await factures(A.companyId))[0]).toMatchObject({ montantHtCentimes: 4500 });
  });

  it("un ancien abonnement « mensuel » ou « annuel » de la prévisualisation compte comme Pro", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await ctx.prisma.abonnement.create({ data: { companyId: A.companyId, statut: "actif", fournisseur: "simule", formule: "mensuel", periodeDebut: new Date(T), periodeFin: new Date("2027-02-01T08:00:00.000Z") } });
    expect((await A.agent.get(`/v1/abonnement?${q("2027-01-10T08:00:00.000Z")}`).expect(200)).body).toMatchObject({ acces: "abonne", formule: "pro" });
  });
});

describe("Stripe : deux prix", () => {
  it("le client HTTP : Checkout au prix de la formule, passage à Pro Max au prorata, formule d'un prix", async () => {
    const appels: { url: string; method: string; body?: string }[] = [];
    const fetcher = async (url: string, init: { method: string; body?: string }) => {
      appels.push({ url, method: init.method, ...(init.body !== undefined ? { body: init.body } : {}) });
      const corps = url.includes("checkout") ? { id: "cs_1", url: "https://checkout.stripe.com/x" } : url.includes("subscriptions") && init.method === "GET" ? { items: { data: [{ id: "si_1" }] } } : {};
      return { ok: true, status: 200, json: async () => corps };
    };
    const c = new HttpStripeClient({ secretKey: "sk_test_x", prix: { pro: "price_2900", promax: "price_4900" }, taxRateId: null }, fetcher);
    await c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "promax", succes: "https://x/ok", annulation: "https://x" });
    expect(decodeURIComponent(appels[0]!.body!)).toContain("line_items[0][price]=price_4900");
    expect(decodeURIComponent(appels[0]!.body!)).toContain("subscription_data[metadata][formule]=promax");
    // Greg, 15 novembre 2026 : le code « FONDATEUR » vaut pour le Pro seulement ; Pro Max n'a pas la case du code promo.
    expect(appels[0]!.body!).not.toContain("allow_promotion_codes");
    await c.passerProMax("sub_1");
    expect(appels[1]).toEqual({ url: "https://api.stripe.com/v1/subscriptions/sub_1", method: "GET" });
    const maj = decodeURIComponent(appels[2]!.body!);
    expect(maj).toContain("items[0][id]=si_1");
    expect(maj).toContain("items[0][price]=price_4900");
    expect(maj).toContain("proration_behavior=always_invoice");
    // En passant à Pro Max, la remise du code s'arrête.
    expect(maj).toMatch(/(^|&)discounts=(&|$)/);
    await c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "pro", succes: "https://x/ok", annulation: "https://x" });
    expect(appels[3]!.body!).toContain("allow_promotion_codes=true");
    expect([c.formuleDuPrix("price_2900"), c.formuleDuPrix("price_4900"), c.formuleDuPrix("price_autre")]).toEqual(["pro", "promax", null]);
  });

  it("les webhooks : un Checkout Pro, puis la facture d'un passage à Pro Max lue à son prix", async () => {
    const env = { PAIEMENT: process.env.PAIEMENT, STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET, STRIPE_PRIX_PRO: process.env.STRIPE_PRIX_PRO, STRIPE_PRIX_PROMAX: process.env.STRIPE_PRIX_PROMAX };
    Object.assign(process.env, { PAIEMENT: "stripe", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test_secret", STRIPE_PRIX_PRO: "price_2900", STRIPE_PRIX_PROMAX: "price_4900" });
    const s = await createTestApp();
    try {
      const envoyer = (evt: unknown) => {
        const corps = JSON.stringify(evt);
        return request(s.app.getHttpServer()).post("/v1/abonnement/stripe/webhook").set("content-type", "application/json").set("stripe-signature", signerCommeStripe("whsec_test_secret", corps)).send(corps).expect(200);
      };
      // Un artisan prend Pro directement.
      const A = await signUpWithCompany(s.app, "a@toitures.fr", "Toitures A", ["roofing"]);
      await envoyer({ id: "evt_a1", type: "checkout.session.completed", data: { object: { client_reference_id: A.companyId, customer: "cus_a", subscription: "sub_a", metadata: { companyId: A.companyId, formule: "promax" } } } });
      await envoyer({ id: "evt_a2", type: "invoice.paid", data: { object: { id: "in_a", customer: "cus_a", billing_reason: "subscription_create", subtotal: 4900, total: 4788, lines: { data: [{ amount: 4900, pricing: { price_details: { price: "price_4900" } }, period: { start: 1798761600, end: 1801440000 } }] } } } });
      expect((await A.agent.get("/v1/abonnement").expect(200)).body).toMatchObject({ formule: "promax", prixHt: "49 €" });
      // Un autre passe de Pro à Pro : la facture Stripe porte un crédit (négatif) puis le mois de Pro.
      const B = await signUpWithCompany(s.app, "b@toitures.fr", "Toitures B", ["roofing"]);
      await envoyer({ id: "evt_b1", type: "checkout.session.completed", data: { object: { client_reference_id: B.companyId, customer: "cus_b", subscription: "sub_b", metadata: { companyId: B.companyId, formule: "pro" } } } });
      await envoyer({ id: "evt_b2", type: "invoice.paid", data: { object: { id: "in_b1", customer: "cus_b", billing_reason: "subscription_create", subtotal: 2900, total: 2388, lines: { data: [{ amount: 2900, price: { id: "price_2900" }, period: { start: 1798761600, end: 1801440000 } }] } } } });
      await envoyer({ id: "evt_b3", type: "invoice.paid", data: { object: { id: "in_b2", customer: "cus_b", billing_reason: "subscription_update", subtotal: 2963, total: 3556, lines: { data: [{ amount: -1027, price: { id: "price_2900" }, period: { start: 1800144000, end: 1801440000 } }, { amount: 4900, price: { id: "price_4900" }, period: { start: 1800144000, end: 1802822400 } }] } } } });
      const b = await s.prisma.abonnement.findUniqueOrThrow({ where: { companyId: B.companyId } });
      expect(b.formule).toBe("promax");
      expect(b.periodeFin!.getTime()).toBe(1802822400 * 1000);
      const f = await s.prisma.factureAbonnement.findMany({ where: { companyId: B.companyId }, orderBy: { rang: "asc" } });
      expect(f.map((x) => [x.numero, x.formule, x.montantHtCentimes])).toEqual([["F-000002", "pro", 2900], ["F-000003", "passage_promax", 2963]]);
    } finally {
      await s.app.close();
      for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});
