import { randomUUID } from "node:crypto";
import { PHRASE_ANALYSES_OFFERTES_UTILISEES, phrasePlafondAtteint } from "@baticlair/domain";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AnalysisMeter } from "../src/modules/ai-usage/index.js";
import { DroitsService, PHRASE_EMAIL_A_VERIFIER } from "../src/modules/recentrage/application/droits.service.js";
import { ReglagePlafondsIa } from "../src/platform/reglages/reglage-plafonds-ia.js";
import { DEVIS_7954_PDF } from "./support/devis7954-pdf.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES FORMULES ET LEURS GARDE-FOUS (RÈGLE CHANGÉE, Greg, 15 novembre 2026) : un compte GRATUIT a 3 analyses offertes EN
 * TOUT (devis, photo et liste confondus) ; un abonné PRO ou PRO MAX n'a aucun nombre à l'écran, mais un plafond CACHÉ en
 * euros par mois d'abonnement (5 € et 20 € pour commencer, réglables dans l'admin), dit seulement quand il est atteint ;
 * un devis de plus de 150 lignes compte pour 2 analyses offertes, et l'artisan le voit AVANT la lecture ; une analyse
 * demande une adresse e-mail vérifiée. Avant (30 octobre 2026) : Découverte 1 + 3, Essentiel 3 + 10, Pro 8 + 30 par mois.
 */
let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "MODE_REGROUPEMENT"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT; // le défaut : automatique
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");
const ceMois = () => new Date().toISOString().slice(0, 7);
const JOUR = 86_400_000;
/** Un abonnement pris il y a 10 jours : le mois d'abonnement en cours a commencé il y a 10 jours. */
const abonner = (companyId: string, formule: "pro" | "promax") =>
  ctx.prisma.abonnement.create({ data: { companyId, statut: "actif", fournisseur: "simule", formule, periodeDebut: new Date(Date.now() - 10 * JOUR), periodeFin: new Date(Date.now() + 20 * JOUR) } });
/** Un appel IA payé par ce compte : `eur` euros (au taux des tests, 0,92 € pour 1 $). */
const depense = (companyId: string, eur: number, quand = new Date()) =>
  ctx.prisma.aiExecution.create({ data: { companyId, task: "takeoff_extraction", route: "text", provider: "anthropic", model: "test", promptId: "p", promptVersion: 1, costMicroUsd: BigInt(Math.round((eur / 0.92) * 1_000_000)), priceTableVersion: "test", status: "success", durationMs: 1, createdAt: quand } });
const analyse = (companyId: string, projectId: string, billingMonth: string, poids = 1) =>
  ctx.prisma.aiAnalysis.create({ data: { companyId, projectId, documentId: randomUUID(), kind: "client_quote", status: "completed", billable: true, billingMonth, poids } });
const scan = (companyId: string, quand = new Date()) =>
  ctx.prisma.aiExecution.create({ data: { companyId, task: "lecture_liste", route: "vision", provider: "anthropic", model: "test", promptId: "lecture_liste", promptVersion: 1, costMicroUsd: 0n, priceTableVersion: "test", status: "success", durationMs: 1, createdAt: quand } });

async function compte(email: string) {
  const a = await signUpWithCompany(ctx.app, email, "Toitures A", ["roofing"]);
  await a.agent.patch("/v1/company/profile").send({ name: "Toitures A", address: "3 rue de la Gare, 22300 Lannion", siret: null, phone: null, email: null }).expect(200);
  const projet = (await a.agent.post("/v1/projects").send({ name: "Chantier" }).expect(201)).body.id as string;
  return { ...a, projet };
}

describe("les formules et leurs garde-fous", () => {
  const nouvelle = (a: { companyId: string; projet: string }) => ({ companyId: a.companyId, userId: null, projectId: a.projet, documentId: randomUUID(), kind: "client_quote" as const });

  it("Gratuit : 3 analyses offertes en tout, scans de liste compris ; la jauge le dit avant le dépôt, puis le paywall, sans rien dépenser", async () => {
    const a = await compte("a@toitures.fr");
    // Aucun compteur « formule » : seulement ce qui reste des analyses offertes.
    expect((await a.agent.get("/v1/ai-usage/jauge").expect(200)).body).toEqual({ jauge: { limite: 3, utilisees: 0, restantes: 3, parMois: false }, quotas: null });
    const meter = ctx.app.get(AnalysisMeter);
    // Une analyse de devis (même ancienne) et un scan de liste : il en reste une.
    await analyse(a.companyId, a.projet, "2026-07");
    await scan(a.companyId);
    expect((await a.agent.get("/v1/ai-usage/jauge").expect(200)).body.jauge).toMatchObject({ restantes: 1 });
    await expect(meter.begin(nouvelle(a))).resolves.toMatchObject({ status: "go" });
    // Un second scan : les trois sont prises. Ni devis ni liste ne sont plus lus.
    await scan(a.companyId);
    expect((await a.agent.get("/v1/ai-usage/jauge").expect(200)).body.jauge).toMatchObject({ restantes: 0 });
    await expect(meter.begin(nouvelle(a))).rejects.toMatchObject({ code: "abonnement_requis", details: { refus: "lectures", phrase: PHRASE_ANALYSES_OFFERTES_UTILISEES } });
    const avant = await ctx.prisma.aiExecution.count({ where: { companyId: a.companyId } });
    const r = await a.agent.post(`/v1/projects/${a.projet}/liste?ecran=1`).attach("file", PNG, { filename: "liste.png", contentType: "image/png" });
    expect(r.status).toBe(402);
    expect(r.body.error.details).toMatchObject({ refus: "scans", phrase: "Tes 3 analyses offertes sont utilisées. Note ta liste à la main, c'est gratuit, ou passe à Pro : les analyses sont incluses." });
    expect(await ctx.prisma.aiExecution.count({ where: { companyId: a.companyId } })).toBe(avant);
    // L'assistant connecté ne coûte plus rien non plus : le code seul répond.
    expect(await meter.iaPermise(a.companyId, null)).toBe(false);
  });

  it("Pro : aucun compteur ; le plafond caché (5 € par mois d'abonnement) refuse avant tout appel, avec la date du renouvellement ; Pro Max passe", async () => {
    const a = await compte("a@toitures.fr");
    await abonner(a.companyId, "pro");
    const meter = ctx.app.get(AnalysisMeter);
    // Rien à compter à l'écran, et beaucoup d'analyses ne changent rien tant que le coût reste sous le plafond.
    for (let i = 0; i < 12; i++) await analyse(a.companyId, a.projet, ceMois());
    await depense(a.companyId, 4.5);
    // Ce qui a été dépensé AVANT le mois d'abonnement en cours ne compte pas.
    await depense(a.companyId, 50, new Date(Date.now() - 40 * JOUR));
    expect((await a.agent.get("/v1/ai-usage/jauge").expect(200)).body).toEqual({ jauge: null, quotas: null });
    await expect(meter.begin(nouvelle(a))).resolves.toMatchObject({ status: "go" });
    expect(await meter.iaPermise(a.companyId, null)).toBe(true);
    // 5,10 € dépensés ce mois d'abonnement : le plafond est atteint.
    await depense(a.companyId, 0.6);
    const renouvellement = new Date((await ctx.prisma.abonnement.findUniqueOrThrow({ where: { companyId: a.companyId } })).periodeDebut!);
    renouvellement.setUTCMonth(renouvellement.getUTCMonth() + 1);
    const phrase = phrasePlafondAtteint("pro", renouvellement);
    expect(phrase).toMatch(/^Tu as atteint la limite d'analyses de ton mois\. Passe au Pro Max ou attends le renouvellement le \d+ \S+\.$/);
    await expect(meter.begin(nouvelle(a))).rejects.toMatchObject({ code: "abonnement_requis", details: { refus: "plafond", phrase } });
    const avant = await ctx.prisma.aiExecution.count({ where: { companyId: a.companyId } });
    const r = await a.agent.post(`/v1/projects/${a.projet}/liste?ecran=1`).attach("file", PNG, { filename: "liste.png", contentType: "image/png" });
    expect(r.status).toBe(402);
    expect(r.body.error.details).toMatchObject({ refus: "plafond", phrase });
    expect(await ctx.prisma.aiExecution.count({ where: { companyId: a.companyId } })).toBe(avant);
    expect(await meter.iaPermise(a.companyId, null)).toBe(false);
    // L'admin est prévenu une fois (file d'exceptions), sans le nom de l'entreprise dans le titre.
    const exceptions = await ctx.prisma.exceptionSupervision.findMany({ where: { companyId: a.companyId } });
    expect(exceptions.map((e) => e.titre)).toContain("Un abonné a atteint son plafond d'analyses du mois");
    expect(JSON.stringify(exceptions.map((e) => [e.titre, e.detail]))).not.toContain("Toitures A");

    // Le même coût en Pro Max (20 €) : rien n'est refusé.
    const b = await compte("b@toitures.fr");
    await abonner(b.companyId, "promax");
    await depense(b.companyId, 5.1);
    await expect(meter.begin(nouvelle(b))).resolves.toMatchObject({ status: "go" });

    // L'admin relève le plafond de Pro : appliqué tout de suite, sans redéploiement.
    await ctx.app.get(ReglagePlafondsIa).regler({ pro: 8, promax: 20 });
    await expect(meter.begin(nouvelle(a))).resolves.toMatchObject({ status: "go" });
  });

  it("un compte qui dépense plus de 1 € en un jour remonte à l'admin, une seule fois, sans être bloqué", async () => {
    const a = await compte("a@toitures.fr");
    await abonner(a.companyId, "promax");
    await depense(a.companyId, 1.2);
    const meter = ctx.app.get(AnalysisMeter);
    await expect(meter.begin(nouvelle(a))).resolves.toMatchObject({ status: "go" });
    await expect(meter.begin(nouvelle(a))).resolves.toMatchObject({ status: "go" });
    const e = await ctx.prisma.exceptionSupervision.findMany({ where: { companyId: a.companyId } });
    expect(e.map((x) => x.titre)).toEqual(["Un compte consomme anormalement des analyses"]);
    expect(e[0]!.detail).toMatch(/^1,20 € d'analyses le \d{4}-\d{2}-\d{2} \(seuil : 1 € par jour et par compte\)\.$/);
  });

  it("une analyse demande une adresse e-mail vérifiée dès qu'un vrai fournisseur est branché ; sinon le code seul répond à l'assistant", async () => {
    const a = await compte("a@toitures.fr");
    const user = await ctx.prisma.user.findFirstOrThrow({ where: { email: "a@toitures.fr" } });
    const abo = { actif: true, etat: async () => ({ acces: "essai" }) } as never;
    const strict = new DroitsService(ctx.prisma, abo, { zonesActives: null, seuilZoneActive: 20, lecturesGratuites: 2, lecturesIaGratuitTotal: 3, emailVerifieExige: true });
    await ctx.prisma.user.update({ where: { id: user.id }, data: { emailVerified: false } });
    await expect(strict.verifierEmail(user.id)).rejects.toMatchObject({ details: { reason: "email_non_verifie", phrase: PHRASE_EMAIL_A_VERIFIER } });
    expect(await strict.assistantPermis(a.companyId, user.id)).toBe(false);
    await ctx.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    await expect(strict.verifierEmail(user.id)).resolves.toBeUndefined();
    // En test (faux fournisseur, aucun coût), rien n'est exigé.
    await ctx.prisma.user.update({ where: { id: user.id }, data: { emailVerified: false } });
    await expect(ctx.app.get(DroitsService).verifierEmail(user.id)).resolves.toBeUndefined();
  });

  it("un gros devis (plus de 150 lignes) : un compte gratuit le voit AVANT la lecture, rien n'est décompté ; « Lancer » le lit, il compte pour 2 ; un abonné n'a pas la question", async () => {
    const a = await compte("a@toitures.fr");
    // Le devis 7954 (anonymisé, régénéré à la volée) : 324 lignes.
    const deposer = async (c: { agent: typeof a.agent; projet: string }) => (await c.agent.post(`/v1/projects/${c.projet}/documents`).field("purpose", "client_quote").attach("file", Buffer.from(await DEVIS_7954_PDF()), { filename: "gros-devis.pdf", contentType: "application/pdf" }).expect(201)).body.id as string;
    const doc = await deposer(a);
    const refus = await a.agent.post("/v1/quantitatifs?ecran=1").send({ documentId: doc });
    expect(refus.status).toBe(409);
    expect(refus.body.error.details).toMatchObject({ reason: "gros_devis", poids: 2, restantes: 3 });
    expect(refus.body.error.details.lignes).toBeGreaterThan(150);
    expect(refus.body.error.details.message).toMatch(/^Ce devis fait \d+ lignes : il compte pour 2 analyses\. Il t'en reste 3\.$/);
    expect(await ctx.prisma.aiAnalysis.count({ where: { companyId: a.companyId } })).toBe(0);
    await a.agent.post("/v1/quantitatifs?ecran=1").send({ documentId: doc, confirmeGros: true }).expect((r) => expect([200, 201, 202]).toContain(r.status));
    const lue = await ctx.prisma.aiAnalysis.findFirstOrThrow({ where: { companyId: a.companyId, documentId: doc } });
    expect(lue.poids).toBe(2);
    expect((await a.agent.get("/v1/ai-usage/jauge").expect(200)).body.jauge).toMatchObject({ restantes: 1 });

    // Un abonné n'a pas de nombre d'analyses : aucune question, le devis est lu.
    const b = await compte("b@toitures.fr");
    await abonner(b.companyId, "pro");
    const docB = await deposer(b);
    await b.agent.post("/v1/quantitatifs?ecran=1").send({ documentId: docB }).expect((r) => expect([200, 201, 202]).toContain(r.status));
  });
});
