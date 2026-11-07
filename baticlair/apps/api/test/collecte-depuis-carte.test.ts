/**
 * LOT 3 (Greg, 6 novembre 2026) : rejoindre une collecte compatible depuis la carte, date de besoin, livraison ou retrait.
 * (Harnais repris du cycle de vie.)
 * LE CYCLE DE VIE ET LES DOUBLES ENGAGEMENTS (Greg, 6 novembre 2026, prompt maître, points 7, 9 et 19) : une ligne de liste ne
 * rejoint qu'un achat groupé (même en double clic) ; elle n'y entre pas si elle est commandée seule ; la commander seule
 * alors qu'un achat groupé la tient attend le geste explicite de l'artisan (retirée de l'achat groupé, jamais en silence) ;
 * une ligne commandée en groupe n'est jamais recommandée seule ; l'état de chaque ligne se lit d'une route.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SIRET_ARTISAN } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "CRON_SECRET", "EMAIL_DOMAINE", "MODE_REGROUPEMENT"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT;
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.EMAIL_DOMAINE = "mobiiz.test";
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
  ctx.emails.clear();
});

const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const ARDOISE = { libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "900", unite: "pièces" };

async function artisan(email: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, "Toitures A", ["roofing"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: SIRET_ARTISAN, siretVerifieLe: new Date() } });
  await ctx.prisma.user.update({ where: { email }, data: { emailVerified: true } });
  const q = (await agent.post("/v1/quantitatifs").send({ lignes: [ARDOISE] }).expect(201)).body as { id: string; projetId: string };
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: "3 rue des Ajoncs, 22300 Lannion" }).expect(200);
  let courant = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && courant.questions.length > 0; i++) {
    const question = courant.questions[0];
    courant = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  await agent.post(`/v1/quantitatifs/${q.id}/validation`).expect(200);
  const analyse = (await agent.get(`/v1/projects/${q.projetId}/rapprochement`).expect(200)).body as { lignes: { key: string; designation: string }[] };
  const cle = analyse.lignes.find((l) => /Ardoise/.test(l.designation))!.key;
  return { agent, companyId, projectId: q.projetId, cle };
}


async function collecteOuverte(companyIdAutre: string) {
  const collecte = await ctx.prisma.regroupementNegocie.create({ data: { mode: "automatique", statut: "en_collecte", cle: "metier:couverture", libelle: "Couverture · Lannion", famille: "couverture", departement: "22", clotureLe: new Date(Date.now() + 6 * 86_400_000), dateBesoinMin: new Date(Date.now() + 20 * 86_400_000) } });
  const besoin = await ctx.prisma.besoinNegocie.create({ data: { companyId: companyIdAutre, designation: "Couverture · Lannion", cle: "metier:couverture", famille: "couverture", quantite: 1, unite: "lignes", departement: "22", livraison: "22300 Lannion", dateBesoin: new Date(Date.now() + 20 * 86_400_000), statut: "declare", regroupementId: collecte.id } });
  await ctx.prisma.ligneAchatGroupe.create({ data: { besoinId: besoin.id, regroupementId: collecte.id, companyId: companyIdAutre, cle: "ardoise|x", libelle: "Ardoise 32×22 Espagne 1er choix", famille: "couverture", unite: "pièces", quantite: 1200, designationOrigine: ARDOISE.libelle } });
  return collecte;
}

describe("rejoindre une collecte depuis la carte ; date de besoin ; livraison ou retrait", () => {
  it("la carte propose la collecte qui correspond exactement, avec sa date et la phrase d'engagement ; un geste la rejoint, puis la ligne n'est plus proposée", async () => {
    const autre = await artisan("x@toitures.fr");
    const collecte = await collecteOuverte(autre.companyId);
    const a = await artisan("a@toitures.fr");
    let analyse = (await a.agent.get(`/v1/projects/${a.projectId}/rapprochement`).expect(200)).body;
    expect(analyse.engagement).toBe("Je confirme que ces quantités correspondent à un besoin réel de mon entreprise.");
    expect(analyse.lignes[0]).toMatchObject({ key: a.cle, rapprochable: true, collecte: { id: collecte.id, titre: "Couverture · Lannion", dateBesoin: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) } });
    // Sans la case d'engagement, rien ne part.
    const s = (await a.agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.example" }).expect(201)).body;
    await a.agent.post(`/v1/projects/${a.projectId}/achat-groupe`).send({ confirmees: [a.cle], achatId: collecte.id, negoces: [{ supplierId: s.id }], engagement: false }).expect(400);
    expect(await ctx.prisma.ligneAchatGroupe.count({ where: { companyId: a.companyId } })).toBe(0);
    const r = (await a.agent.post(`/v1/projects/${a.projectId}/achat-groupe`).send({ confirmees: [a.cle], achatId: collecte.id, negoces: [{ supplierId: s.id }], engagement: true }).expect(201)).body;
    expect(r).toMatchObject({ achatId: collecte.id, titre: "Couverture · Lannion" });
    analyse = (await a.agent.get(`/v1/projects/${a.projectId}/rapprochement`).expect(200)).body;
    expect(analyse.lignes[0]).toMatchObject({ rapprochable: false, collecte: null, raison: "Déjà dans l'achat groupé « Couverture · Lannion »." });
  });

  it("la recherche garde la date de besoin et le retrait au dépôt ; l'autre entreprise voit l'écart « Mode différent »", async () => {
    const a = await artisan("a@toitures.fr");
    await a.agent.post(`/v1/projects/${a.projectId}/rapprochement`).send({ articles: [a.cle], jusquau: jour(10), dateMax: jour(25), modeLivraison: "retrait" }).expect(200);
    const analyse = (await a.agent.get(`/v1/projects/${a.projectId}/rapprochement`).expect(200)).body;
    expect(analyse.lignes[0].recherche).toMatchObject({ statut: "disponible", modeLivraison: "retrait", dateMax: jour(25) });
    const b = await artisan("b@toitures.fr");
    await b.agent.post(`/v1/projects/${b.projectId}/rapprochement`).send({ articles: [b.cle], jusquau: jour(10), dateMax: jour(25), modeLivraison: "livraison" }).expect(200);
    const vueB = (await b.agent.get("/v1/rapprochements").expect(200)).body.lignes[0];
    expect(vueB.propositions[0]).toMatchObject({ niveau: "alternative" });
    expect(vueB.propositions[0].differences.join(" ")).toMatch(/Mode différent/);
  });
});
