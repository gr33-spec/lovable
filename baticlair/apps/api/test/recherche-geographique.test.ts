/**
 * LOT 5 (Greg, 6 novembre 2026, prompt maître point 10) : la recherche géographique. Découvrir filtre par département,
 * région ou rayon autour de son secteur (distance entre chefs-lieux, dite approximative), par livraison ou retrait et par
 * date de besoin, et donne les points de la carte ; le rapprochement entre deux départements voisins n'existe que si les
 * deux artisans acceptent la distance, et l'écart se dit.
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

async function artisan(email: string, adresse = "3 rue des Ajoncs, 22300 Lannion") {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, "Toitures A", ["roofing"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: SIRET_ARTISAN, siretVerifieLe: new Date(), address: adresse } });
  await ctx.prisma.user.update({ where: { email }, data: { emailVerified: true } });
  const q = (await agent.post("/v1/quantitatifs").send({ lignes: [ARDOISE] }).expect(201)).body as { id: string; projetId: string };
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
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



async function collecte(companyIdAutre: string, departement: string, libelle: string, modeLivraison: "livraison" | "retrait" = "livraison", besoinDansJours = 20) {
  const c = await ctx.prisma.regroupementNegocie.create({ data: { mode: "automatique", statut: "en_collecte", cle: "metier:couverture", libelle, famille: "couverture", departement, modeLivraison, clotureLe: new Date(Date.now() + 6 * 86_400_000), dateBesoinMin: new Date(Date.now() + besoinDansJours * 86_400_000) } });
  const besoin = await ctx.prisma.besoinNegocie.create({ data: { companyId: companyIdAutre, designation: libelle, cle: "metier:couverture", famille: "couverture", quantite: 1, unite: "lignes", departement, livraison: departement, dateBesoin: new Date(Date.now() + besoinDansJours * 86_400_000), statut: "declare", regroupementId: c.id } });
  await ctx.prisma.ligneAchatGroupe.create({ data: { besoinId: besoin.id, regroupementId: c.id, companyId: companyIdAutre, cle: "ardoise|x", libelle: "Ardoise 32×22 Espagne 1er choix", famille: "couverture", unite: "pièces", quantite: 1200, designationOrigine: ARDOISE.libelle } });
  return c;
}

describe("la recherche géographique", () => {
  it("Découvrir : son département par défaut, puis un rayon, une région, livraison ou retrait, une date de besoin ; la carte compte par département", async () => {
    const autre = await artisan("x@toitures.fr");
    await collecte(autre.companyId, "22", "Couverture · Lannion");
    await collecte(autre.companyId, "35", "Couverture · Rennes", "retrait", 40);
    await collecte(autre.companyId, "29", "Couverture · Quimper");
    await collecte(autre.companyId, "13", "Couverture · Marseille");
    const a = await artisan("a@toitures.fr");
    const titres = async (q: string) => ((await a.agent.get(`/v1/achats-groupes/decouvrir${q}`).expect(200)).body.achats as { titre: string }[]).map((x) => x.titre).sort();
    expect(await titres("")).toEqual(["Couverture · Lannion"]);
    expect(await titres("?rayon=100")).toEqual(["Couverture · Lannion", "Couverture · Rennes"]);
    expect(await titres("?rayon=150")).toEqual(["Couverture · Lannion", "Couverture · Quimper", "Couverture · Rennes"]);
    expect(await titres("?region=Bretagne")).toEqual(["Couverture · Lannion", "Couverture · Quimper", "Couverture · Rennes"]);
    expect(await titres("?region=Bretagne&mode=retrait")).toEqual(["Couverture · Rennes"]);
    expect(await titres(`?region=Bretagne&besoinAvant=${jour(30)}`)).toEqual(["Couverture · Lannion", "Couverture · Quimper"]);
    expect(await titres("?departement=tous")).toHaveLength(4);
    // Un filtre inconnu est ignoré, jamais une erreur.
    expect(await titres("?rayon=999&region=Atlantide&mode=camion")).toEqual(["Couverture · Lannion"]);
    const d = (await a.agent.get("/v1/achats-groupes/decouvrir?region=Bretagne").expect(200)).body;
    expect(d.regions).toContain("Bretagne");
    expect(d.rayons).toEqual([0, 50, 100, 150]);
    expect(d.carte.map((c: { code: string }) => c.code).sort()).toEqual(["22", "29", "35"]);
    const rennes = d.achats.find((x: { titre: string }) => x.titre === "Couverture · Rennes");
    expect(rennes).toMatchObject({ zone: "35", secteur: "Ille-et-Vilaine (35)", region: "Bretagne", modeLivraison: "retrait", distanceKm: expect.any(Number) });
    expect(rennes.distanceKm).toBeGreaterThan(80);
    expect(rennes.distanceKm).toBeLessThan(100);
  });

  it("deux départements voisins se rapprochent seulement si les deux artisans acceptent la distance ; l'écart se dit", async () => {
    const a = await artisan("a@toitures.fr");
    const b = await artisan("b@toitures.fr", "2 rue de Nantes, 35000 Rennes");
    await a.agent.post(`/v1/projects/${a.projectId}/rapprochement`).send({ articles: [a.cle], jusquau: jour(7), rayonKm: 100 }).expect(200);
    await b.agent.post(`/v1/projects/${b.projectId}/rapprochement`).send({ articles: [b.cle], jusquau: jour(7) }).expect(200);
    // B n'a accepté que son département : aucune proposition.
    expect((await a.agent.get("/v1/rapprochements").expect(200)).body.lignes[0].propositions).toEqual([]);
    const analyseB = (await b.agent.post(`/v1/projects/${b.projectId}/rapprochement`).send({ articles: [b.cle], jusquau: jour(7), rayonKm: 150 }).expect(200)).body;
    expect(analyseB.lignes[0].recherche).toMatchObject({ rayonKm: 150 });
    const pA = (await a.agent.get("/v1/rapprochements").expect(200)).body.lignes[0].propositions;
    expect(pA).toEqual([expect.objectContaining({ niveau: "alternative", differences: [expect.stringMatching(/^Secteur voisin : Ille-et-Vilaine \(35\), ≈ \d+ km$/)] })]);
    const pB = (await b.agent.get("/v1/rapprochements").expect(200)).body.lignes[0].propositions;
    expect(pB[0].differences).toEqual([expect.stringMatching(/^Secteur voisin : Côtes-d'Armor \(22\), ≈ \d+ km$/)]);
    // Un rayon hors de la liste est refusé.
    expect((await a.agent.post(`/v1/projects/${a.projectId}/rapprochement`).send({ articles: [a.cle], jusquau: jour(7), rayonKm: 70 })).status).toBe(400);
  });

  it("qui lance un achat groupé choisit le retrait au dépôt ; il est gardé et Découvrir le dit", async () => {
    const a = await artisan("a@toitures.fr");
    const r = await a.agent.post(`/v1/projects/${a.projectId}/achat-groupe`).send({ confirmees: [a.cle], dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }], engagement: true, modeLivraison: "retrait" });
    expect(r.status).toBe(201);
    const g = await ctx.prisma.regroupementNegocie.findFirstOrThrow({ where: { id: r.body.achatId } });
    expect(g.modeLivraison).toBe("retrait");
    const b = await artisan("b@toitures.fr");
    const d = (await b.agent.get("/v1/achats-groupes/decouvrir?mode=retrait").expect(200)).body;
    expect(d.achats).toEqual([expect.objectContaining({ id: g.id, modeLivraison: "retrait" })]);
    expect((await b.agent.get("/v1/achats-groupes/decouvrir?mode=livraison").expect(200)).body.achats).toEqual([]);
  });
});
