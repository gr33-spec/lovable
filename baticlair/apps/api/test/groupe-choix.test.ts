import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChoixService } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 6 : LECTURE ET CHOIX, OFFRE À CHAQUE ARTISAN (document du fondateur, 2026-10-19, section 2
 * étapes 6 et 7). Trois négoces du département reçoivent le lot : deux déposent (le moins cher au volume ferme dans la
 * fenêtre gagne), le troisième dit « pas concerné » ; dès que tous ont répondu, le lot est choisi, un seul négoce, et
 * chaque artisan engagé reçoit son offre (information, pas question) sans jamais voir les autres ; « Problème » se
 * journalise ; le prix de référence déclaré donne l'économie. Passé 7 jours sans réponse valable, le lot est clos.
 */
let ctx: TestContext;
const avant = process.env.GROUPE;
beforeAll(async () => {
  process.env.GROUPE = "on";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };
async function carreleur(email: string, adresse = "3 rue des Ajoncs, 22300 Lannion") {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, `Carrelages ${email}`, ["tiling"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: `Carrelages ${email}`, address: adresse, siret: "73282932000074", phone: null, email: null }).expect(200);
  let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
  const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
  if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
  return { agent, companyId, projectId: q.projetId, carreaux };
}
const proposer = (c: Awaited<ReturnType<typeof carreleur>>, statut: "signe" | "en_attente") =>
  c.agent.post(`/v1/projects/${c.projectId}/groupe`).send({ articles: [c.carreaux.key], fenetre: FENETRE, statut, engagement: true }).expect(201);
const negoce = (agent: Agent, nom: string, email: string, familles: string[]) => agent.post("/v1/groupe/negoces").send({ nom, email, familles }).expect(201);
const jetonPour = (email: string) => /\/reponse\/([A-Za-z0-9_-]+)/.exec(ctx.emails.sent.find((m) => m.to === email)!.text)![1]!;
const lienPasConcerne = (email: string) => /\/negoces\/lien\/([A-Za-z0-9_.-]+)/.exec(ctx.emails.sent.find((m) => m.to === email)!.text)![1]!;

async function deposer(jeton: string, rows: FixtureRow[], titre: string) {
  const devis = Buffer.from(await makePdf(["devis"], rows, "Total HT 1 000,00   TVA 20 % 200,00   Total TTC 1 200,00", titre));
  return request(ctx.app.getHttpServer()).post(`/v1/reponse/${jeton}`).field("accord", "oui").attach("file", devis, { filename: "devis.pdf", contentType: "application/pdf" });
}

/** Deux signés et un en attente dans le même lot, trois négoces du 22. Le lot part dès le deuxième signé. */
async function scenario() {
  const a = await carreleur("a@example.fr");
  await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
  await negoce(a.agent, "Négoce Généraliste", "general@example.com", ["couverture", "second_oeuvre"]);
  await negoce(a.agent, "Négoce Bricolage", "bricolage@example.com", ["second_oeuvre"]);
  await proposer(a, "signe");
  const d = await carreleur("d@example.fr", "8 rue du Port, 22500 Paimpol");
  await proposer(d, "en_attente");
  const b = await carreleur("b@example.fr", "12 rue de Kerampont, 22300 Lannion");
  await proposer(b, "signe");
  expect(ctx.emails.sent.filter((m) => m.to.endsWith("@example.com"))).toHaveLength(3);
  return { a, b, d };
}
const CARREAU = "Carreau de sol 60x60 grès cérame";

describe("groupé, étape 6 : le choix du négoce et l'offre de chaque artisan", { timeout: 60_000 }, () => {
  it("dès que tous ont répondu, le moins cher au volume ferme est retenu ; chaque artisan engagé a son offre, sans voir les autres", async () => {
    const { a, b, d } = await scenario();
    // Le volume ferme fait 46 cartons (2 × 23) : le généraliste n'a un prix que « à partir de 100 », il ne couvre pas le lot.
    expect((await deposer(jetonPour("general@example.com"), [["CAR", CARREAU, "100 u", "15,00", "1 500,00"]], "DEVIS 1 – Délai de livraison 5 jours")).status).toBe(201);
    expect((await ctx.prisma.lotGroupe.findFirstOrThrow()).statut).toBe("envoye");
    expect((await deposer(jetonPour("carrelage@example.com"), [["CAR", CARREAU, "46 u", "18,50", "851,00"], ["CAR", CARREAU, "100 u", "17,20", "1 720,00"]], "DEVIS 2 – Délai de livraison 10 jours")).status).toBe(201);
    expect((await ctx.prisma.lotGroupe.findFirstOrThrow()).statut).toBe("envoye");
    // Le troisième dit « pas concerné » : tout le monde a répondu, le lot se décide.
    await request(ctx.app.getHttpServer()).post("/v1/negoces/lien").send({ jeton: lienPasConcerne("bricolage@example.com") }).expect(200);
    await ctx.app.get(ChoixService).choisirLesLotsEnvoyes();
    const lot = await ctx.prisma.lotGroupe.findFirstOrThrow({ include: { negoceRetenu: true, offres: true, besoins: true, journal: { orderBy: { createdAt: "asc" } } } });
    expect(lot.statut).toBe("choisi");
    expect(lot.negoceRetenu!.nom).toBe("Négoce Carrelage");
    expect(Number(lot.prixRetenu)).toBe(18.5);
    expect(lot.offres).toHaveLength(2);
    const retenu = lot.journal.find((j) => j.evenement === "negoce_retenu")!.details as { ecartes: { raison: string }[] };
    expect(retenu.ecartes.map((e) => e.raison).sort()).toEqual(["palier_insuffisant", "pas_concerne"]);
    // Le besoin en attente redevient libre (volume probable seulement) ; les engagés restent au lot.
    expect(lot.besoins.filter((x) => x.statut === "engage")).toHaveLength(2);
    expect(await ctx.prisma.besoin.count({ where: { statut: "en_attente", lotId: null } })).toBe(1);

    // L'offre de A : sa quantité, son prix, le négoce, la date ; jamais le nombre ni le nom des autres artisans.
    const vueA = (await a.agent.get(`/v1/projects/${a.projectId}/groupe`).expect(200)).body.besoins[0];
    expect(vueA.statut).toBe("engage");
    expect(vueA.offre).toMatchObject({ lotNumero: lot.numero, prixUnitaire: "18.5", negoce: "Négoce Carrelage", prixReference: null, economie: null, probleme: null });
    expect(vueA.offre.dateLivraison).toMatch(/^2026-11-/);
    const offres = (await a.agent.get("/v1/groupe/offres").expect(200)).body.offres as { id: string; designation: string; quantite: string }[];
    expect(offres).toHaveLength(1);
    expect(JSON.stringify(offres)).not.toMatch(/b@example|Carrelages b|12 rue de Kerampont/);
    // D (en attente) n'a pas d'offre.
    expect((await d.agent.get("/v1/groupe/offres").expect(200)).body.offres).toEqual([]);

    // Le prix de référence déclaré donne l'économie : (21 − 18,50) × 23 = 57,50.
    const ref = (await a.agent.post(`/v1/groupe/offres/${offres[0]!.id}/reference`).send({ prixReference: 21 }).expect(200)).body;
    expect(Number(ref.economie)).toBe(57.5);
    // « Problème » : journalisé, l'offre reste.
    const pb = (await a.agent.post(`/v1/groupe/offres/${offres[0]!.id}/probleme`).send({ probleme: "Ce n'est pas la bonne teinte" }).expect(200)).body;
    expect(pb.probleme).toBe("Ce n'est pas la bonne teinte");
    expect((await ctx.prisma.journalGroupe.findMany({ where: { evenement: "probleme_signale" } })).length).toBe(1);
    // Isolation : B ne touche pas l'offre de A.
    expect((await b.agent.post(`/v1/groupe/offres/${offres[0]!.id}/probleme`).send({ probleme: "x" })).status).toBe(404);
    expect((await b.agent.get("/v1/groupe/offres").expect(200)).body.offres).toHaveLength(1);
  });

  it("une lecture « à vérifier » n'est jamais retenue ; passé 7 jours sans offre valable, le lot est clos, les besoins restent engagés pour Greg", async () => {
    await scenario();
    // Un devis sans aucune ligne de prix : lu « à vérifier ».
    expect((await deposer(jetonPour("carrelage@example.com"), [], "DEVIS 3")).body.reponse.statutExtraction).toBe("a_verifier");
    const choix = ctx.app.get(ChoixService);
    expect(await choix.choisirLesLotsEnvoyes()).toEqual({ lotsChoisis: 0, lotsClos: 0 });
    const lot = await ctx.prisma.lotGroupe.findFirstOrThrow();
    const apres = new Date(lot.envoyeLe!.getTime() + 8 * 24 * 3600 * 1000);
    expect(await choix.choisirLesLotsEnvoyes(apres)).toEqual({ lotsChoisis: 0, lotsClos: 1 });
    const clos = await ctx.prisma.lotGroupe.findFirstOrThrow({ include: { besoins: true, journal: { orderBy: { createdAt: "asc" } } } });
    expect(clos.statut).toBe("clos");
    expect(clos.negoceRetenuId).toBeNull();
    expect(clos.journal.at(-1)!.evenement).toBe("sans_offre");
    expect((clos.journal.at(-1)!.details as { aVerifier: string[] }).aVerifier).toHaveLength(1);
    expect(clos.besoins.filter((b) => b.statut === "engage")).toHaveLength(2);
  });
});
