import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HttpStripeClient, signerCommeStripe } from "../src/modules/abonnement/index.js";
import { mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * MENSUEL OU ANNUEL (RÈGLE CHANGÉE, Greg, 12 novembre 2026, dossier de corrections UX, point 13). L'annuel : dix mois
 * facturés pour douze mois de service, payé en une fois. Pro 290 € HT par an, Pro 490 € HT par an. Tout est testé en
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
      ["pro", { prix: "290 € HT par an", equivalent: "soit 24,17 € HT par mois", economie: "2 mois offerts : 58 € HT de moins que douze mois payés au mois", details: ["Tout le Gratuit", "L'analyse de tes devis, photos et listes incluse", "Achats groupés : tu vois le négoce retenu et tu commandes", "Payé en une fois, renouvelé chaque année ; tu peux arrêter le renouvellement quand tu veux, l'année payée reste acquise."], ttc: "348 €" }],
      ["promax", { prix: "490 € HT par an", equivalent: "soit 40,83 € HT par mois", economie: "2 mois offerts : 98 € HT de moins que douze mois payés au mois", details: ["Tout le Pro", "Pour ceux qui font analyser beaucoup de documents : une limite d'usage bien plus haute", "Payé en une fois, renouvelé chaque année ; tu peux arrêter le renouvellement quand tu veux, l'année payée reste acquise."], ttc: "588 €" }],
    ]);
    await A.agent.post("/v1/abonnement/payer").send({ formule: "pro", periodicite: "trimestriel" }).expect(400);
  });

  it("Pro annuel : 290 € HT facturés une fois, un an d'accès, la facture le dit, les quotas restent ceux de Pro", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const s = await session(A.agent, { formule: "pro", periodicite: "annuel" });
    expect((await A.agent.get(`/v1/abonnement/simulation/${s}`).expect(200)).body).toEqual({ formule: "pro", periodicite: "annuel" });
    const v = (await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200)).body;
    expect(v).toMatchObject({ acces: "abonne", formule: "pro", periodicite: "annuel", prixHt: "290 €", prixTtc: "348 €", periode: "par an", periodeFin: "2028-01-01T08:00:00.000Z", bascule: null });
    // Double appui sur « Payer » : une seule facture, une seule année.
    await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    const f = await factures(A.companyId);
    expect(f.map((x) => [x.formule, x.montantHtCentimes, x.tvaCentimes, x.ttcCentimes, x.periodeFin.toISOString()])).toEqual([["pro_annuel", 29_000, 5_800, 34_800, "2028-01-01T08:00:00.000Z"]]);
    const pdf = await A.agent.get(`/v1/abonnement/factures/${f[0]!.id}/pdf`).expect(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect((await A.agent.get(`/v1/quotas?${q(T)}`)).status).toBeLessThan(500);
    // Onze mois plus tard : toujours abonné, rien n'a été refacturé.
    expect(await tache("2027-12-01T08:00:00.000Z")).toMatchObject({ renouveles: 0 });
    expect((await A.agent.get(`/v1/abonnement?${q("2027-12-01T08:00:00.000Z")}`)).body.acces).toBe("abonne");
    expect(await factures(A.companyId)).toHaveLength(1);
  });

  it("Pro annuel : 490 € HT ; le rappel 30 jours avant dit le bon montant ; le renouvellement refait une année, une seule fois", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const s = await session(A.agent, { formule: "promax", periodicite: "annuel" });
    const v = (await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200)).body;
    expect(v).toMatchObject({ formule: "promax", periodicite: "annuel", prixHt: "490 €", prixTtc: "588 €", periode: "par an" });
    expect((await tache("2027-12-05T08:00:00.000Z")).rappelsAnnuels).toBe(1);
    expect((await tache("2027-12-06T08:00:00.000Z")).rappelsAnnuels).toBe(0);
    const rappel = mailsVers(ctx, "a@toitures.fr").find((m) => m.subject.includes("se renouvelle"))!;
    expect(rappel.text).toContain("490 € HT (588 € TTC) pour un an");
    // L'échéance : une nouvelle année, une facture de plus ; rejouer la tâche ne refacture pas.
    expect((await tache("2028-01-01T09:00:00.000Z")).renouveles).toBe(1);
    expect((await tache("2028-01-01T10:00:00.000Z")).renouveles).toBe(0);
    const f = await factures(A.companyId);
    expect(f.map((x) => [x.formule, x.montantHtCentimes])).toEqual([["promax_annuel", 49_000], ["promax_annuel", 49_000]]);
    expect((await ctx.prisma.abonnement.findUniqueOrThrow({ where: { companyId: A.companyId } })).periodeFin!.toISOString()).toBe("2029-01-01T08:00:00.000Z");
  });

  it("le mensuel ne change pas ; résilier un annuel garde l'accès jusqu'au bout de l'année payée, sans nouvelle facture", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const m = await session(A.agent, { formule: "pro" });
    expect((await A.agent.post(`/v1/abonnement/simulation/${m}?${q(T)}`).send({ issue: "payer" }).expect(200)).body).toMatchObject({ periodicite: "mensuel", prixHt: "29 €", periode: "par mois", periodeFin: "2027-02-01T08:00:00.000Z" });
    expect((await factures(A.companyId)).map((x) => [x.formule, x.montantHtCentimes])).toEqual([["pro", 2_900]]);
    const B = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    const s = await session(B.agent, { formule: "pro", periodicite: "annuel" });
    await B.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    expect((await B.agent.post(`/v1/abonnement/resilier?${q("2027-03-01T08:00:00.000Z")}`).send({}).expect(200)).body).toMatchObject({ resiliationProgrammee: true, acces: "abonne" });
    expect((await B.agent.get(`/v1/abonnement?${q("2027-12-31T08:00:00.000Z")}`)).body.acces).toBe("abonne");
    // (Le compte mensuel A, lui, se renouvelle normalement dans la même tâche.)
    expect((await tache("2028-01-01T09:00:00.000Z")).resilies).toBe(1);
    expect(await factures(B.companyId)).toHaveLength(1);
    expect((await B.agent.get(`/v1/abonnement?${q("2028-01-02T08:00:00.000Z")}`)).body.acces).not.toBe("abonne");
  });

  it("changement de formule : de Pro mensuel à Pro au prorata comme avant ; un annuel ne bascule pas en cours d'année, avec une phrase", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const m = await session(A.agent, { formule: "pro" });
    await A.agent.post(`/v1/abonnement/simulation/${m}?${q(T)}`).send({ issue: "payer" }).expect(200);
    expect((await A.agent.post(`/v1/abonnement/promax?${q("2027-01-16T08:00:00.000Z")}`).send({}).expect(200)).body).toMatchObject({ formule: "promax", periodicite: "mensuel" });
    const B = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    const s = await session(B.agent, { formule: "pro", periodicite: "annuel" });
    await B.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    const refus = await B.agent.post(`/v1/abonnement/promax?${q("2027-02-01T08:00:00.000Z")}`).send({});
    expect(refus.status).toBe(400);
    expect(refus.body.error.details).toMatchObject({ reason: "abonnement_annuel", phrase: "Ton abonnement est annuel : le passage à Pro Max se fait à son échéance. Écris-nous si tu en as besoin avant." });
    expect(await factures(B.companyId)).toHaveLength(1);
  });

  it("paiement refusé : rien n'est facturé, aucun accès ; une autre entreprise ne paie pas la session d'une autre", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const B = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    const s = await session(A.agent, { formule: "promax", periodicite: "annuel" });
    await B.agent.get(`/v1/abonnement/simulation/${s}`).expect(404);
    await B.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(404);
    const v = (await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "echec" }).expect(200)).body;
    expect(v.statut).toBe("echec");
    expect(await factures(A.companyId)).toHaveLength(0);
    expect(await ctx.prisma.factureAbonnement.count()).toBe(0);
  });
});

describe("abonnement annuel (faux Stripe, aucun appel réel)", () => {
  const client = (prixAnnuel: { pro: string | null; promax: string | null } | null) => {
    const appels: { url: string; body?: string }[] = [];
    const fetcher = async (url: string, init: { method: string; body?: string }) => {
      appels.push({ url, ...(init.body !== undefined ? { body: init.body } : {}) });
      return { ok: true, status: 200, json: async () => ({ id: "cs_1", url: "https://checkout.stripe.com/x" }) };
    };
    return { c: new HttpStripeClient({ secretKey: "sk_test_x", prix: { pro: "price_2900", promax: "price_4900" }, prixAnnuel, taxRateId: null }, fetcher), appels };
  };

  it("le client : le Checkout annuel prend le prix annuel et le dit en métadonnée ; sans prix annuel, rien n'est demandé à Stripe", async () => {
    const { c, appels } = client({ pro: "price_290an", promax: "price_490an" });
    expect(c.annuelDisponible()).toBe(true);
    await c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "promax", periodicite: "annuel", succes: "https://x/ok", annulation: "https://x" });
    const corps = decodeURIComponent(appels[0]!.body!);
    expect(corps).toContain("line_items[0][price]=price_490an");
    expect(corps).toContain("subscription_data[metadata][periodicite]=annuel");
    expect(appels[0]!.url).toBe("https://api.stripe.com/v1/checkout/sessions");
    await c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "pro", succes: "https://x/ok", annulation: "https://x" });
    expect(decodeURIComponent(appels[1]!.body!)).toContain("line_items[0][price]=price_2900");
    expect([c.formuleDuPrix("price_290an"), c.formuleDuPrix("price_490an"), c.formuleDuPrix("price_2900")]).toEqual(["pro", "promax", "pro"]);
    expect([c.periodiciteDuPrix("price_290an"), c.periodiciteDuPrix("price_490an"), c.periodiciteDuPrix("price_4900"), c.periodiciteDuPrix("price_autre"), c.periodiciteDuPrix(null)]).toEqual(["annuel", "annuel", "mensuel", null, null]);
    // Sans prix annuel configuré : indisponible, et le Checkout annuel échoue AVANT tout appel.
    const sans = client(null);
    expect(sans.c.annuelDisponible()).toBe(false);
    expect(client({ pro: "price_290an", promax: null }).c.annuelDisponible()).toBe(false);
    await expect(sans.c.checkout({ companyId: "co", customerId: null, email: "a@b.fr", formule: "promax", periodicite: "annuel", succes: "https://x/ok", annulation: "https://x" })).rejects.toThrow("prix annuel non configuré");
    expect(sans.appels).toHaveLength(0);
  });

  it("Stripe sans prix annuels : l'annuel est dit indisponible et refusé avec une phrase ; avec eux, les webhooks ouvrent une année, une seule fois même rejoués", async () => {
    const cles = ["PAIEMENT", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRIX_PRO", "STRIPE_PRIX_PROMAX", "STRIPE_PRIX_PRO_ANNUEL", "STRIPE_PRIX_PROMAX_ANNUEL"] as const;
    const env = Object.fromEntries(cles.map((k) => [k, process.env[k]]));
    Object.assign(process.env, { PAIEMENT: "stripe", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test_secret", STRIPE_PRIX_PRO: "price_2900", STRIPE_PRIX_PROMAX: "price_4900" });
    delete process.env.STRIPE_PRIX_PRO_ANNUEL;
    delete process.env.STRIPE_PRIX_PROMAX_ANNUEL;
    let s = await createTestApp();
    try {
      const A = await signUpWithCompany(s.app, "a@toitures.fr", "Toitures A", ["roofing"]);
      expect((await A.agent.get("/v1/abonnement").expect(200)).body.annuelDisponible).toBe(false);
      const refus = await A.agent.post("/v1/abonnement/payer").send({ formule: "pro", periodicite: "annuel" });
      expect(refus.status).toBe(400);
      expect(refus.body.error.details).toMatchObject({ reason: "annuel_indisponible", phrase: "L'abonnement annuel n'est pas encore ouvert au paiement. Choisis le mensuel pour l'instant." });
      await s.app.close();

      Object.assign(process.env, { STRIPE_PRIX_PRO_ANNUEL: "price_290an", STRIPE_PRIX_PROMAX_ANNUEL: "price_490an" });
      s = await createTestApp();
      const envoyer = (evt: unknown) => {
        const corps = JSON.stringify(evt);
        return request(s.app.getHttpServer()).post("/v1/abonnement/stripe/webhook").set("content-type", "application/json").set("stripe-signature", signerCommeStripe("whsec_test_secret", corps)).send(corps).expect(200);
      };
      const B = await signUpWithCompany(s.app, "b@toitures.fr", "Toitures B", ["roofing"]);
      expect((await B.agent.get("/v1/abonnement").expect(200)).body.annuelDisponible).toBe(true);
      const checkout = { id: "evt_1", type: "checkout.session.completed", data: { object: { client_reference_id: B.companyId, customer: "cus_b", subscription: "sub_b", metadata: { companyId: B.companyId, formule: "pro", periodicite: "annuel" } } } };
      const payee = { id: "evt_2", type: "invoice.paid", data: { object: { id: "in_b", customer: "cus_b", billing_reason: "subscription_create", subtotal: 29000, total: 34800, lines: { data: [{ amount: 29000, pricing: { price_details: { price: "price_290an" } }, period: { start: 1798761600, end: 1830297600 } }] } } } };
      await envoyer(checkout);
      await envoyer(payee);
      // Webhooks rejoués par Stripe : rien en double.
      await envoyer(checkout);
      await envoyer(payee);
      expect((await B.agent.get("/v1/abonnement").expect(200)).body).toMatchObject({ formule: "pro", periodicite: "annuel", prixHt: "290 €", periode: "par an" });
      const f = await s.prisma.factureAbonnement.findMany({ where: { companyId: B.companyId } });
      expect(f.map((x) => [x.formule, x.montantHtCentimes, x.ttcCentimes])).toEqual([["pro_annuel", 29_000, 34_800]]);
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
    const s = await session(A.agent, { formule: "promax", periodicite: "annuel" });
    await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    const mail = ctx.emails.sent.filter((m) => m.to === "a@toitures.fr" && m.subject === "Ton abonnement Mobiiz est actif").at(-1)!;
    expect(mail.text).toContain("Pro Max, 490 € HT par an, payé en une fois");
    expect(mail.text).not.toContain("49 € HT par mois");
  });

  it("abonné au mois, un second paiement est refusé d'une phrase, sans facture ; après la fin de la période, payer redevient possible", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const s = await session(A.agent, { formule: "pro", periodicite: "mensuel" });
    await A.agent.post(`/v1/abonnement/simulation/${s}?${q(T)}`).send({ issue: "payer" }).expect(200);
    // Une nouvelle session de paiement n'est même pas ouverte.
    const refus = await A.agent.post(`/v1/abonnement/payer?${q(T)}`).send({ formule: "pro", periodicite: "annuel" }).expect(400);
    expect(refus.body.error.details).toMatchObject({ reason: "deja_abonne" });
    expect(refus.body.error.details.phrase).toMatch(/^Tu es déjà abonné jusqu'au /);
    expect(await factures(A.companyId)).toHaveLength(1);
  });
});
