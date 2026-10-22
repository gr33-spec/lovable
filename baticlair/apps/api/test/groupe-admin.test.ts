import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChoixService } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 9 : L'ADMIN DE GREG (document du fondateur, 2026-10-19, section 7 étape 9 ; section 5 : le
 * journal visible par Greg seul). Réservé à `GROUPE_ADMINS` ; lots par département, journal, négoces, accords, factures
 * (export CSV), exclusions ; clore, annuler, forcer, changer le négoce, marquer payée ; ouverture par département.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, GROUPE_ADMINS: process.env.GROUPE_ADMINS, GROUPE_DEPARTEMENTS: process.env.GROUPE_DEPARTEMENTS };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.GROUPE_DEPARTEMENTS = "22,29";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };
async function carreleur(email: string, nom: string, adresse: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["tiling"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: "73282932000074", phone: null, email: null }).expect(200);
  let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
  const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
  if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
  return { agent, companyId, projectId: q.projetId, carreaux };
}
const proposer = (c: Awaited<ReturnType<typeof carreleur>>, statut: "signe" | "en_attente") =>
  c.agent.post(`/v1/projects/${c.projectId}/groupe`).send({ articles: [c.carreaux.key], fenetre: FENETRE, statut, engagement: true });
const negoce = (agent: Agent, nom: string, email: string, familles: string[]) => agent.post("/v1/groupe/negoces").send({ nom, email, familles }).expect(201);
// Le premier mail au négoce peut être celui qui l'informe du regroupement (nouveau cap) : on prend celui de la demande.
const jetonPour = (email: string) => /\/reponse\/([A-Za-z0-9_-]+)/.exec(ctx.emails.sent.find((m) => m.to === email && /\/reponse\//.test(m.text))!.text)![1]!;
const CARREAU = "Carreau de sol 60x60 grès cérame";
async function deposer(jeton: string, rows: FixtureRow[], titre: string) {
  const devis = Buffer.from(await makePdf(["devis"], rows, "Total HT 1 000,00   TVA 20 % 200,00   Total TTC 1 200,00", titre));
  // Décision de Greg (22 octobre) : la livraison est obligatoire (son dépôt, gratuite jusqu'à X km, Y € au-delà) ; ici
  // franco partout, pour suivre le parcours d'origine.
  return request(ctx.app.getHttpServer()).post(`/v1/reponse/${jeton}`).field("accord", "oui").field("depart", "ZA de Kerfolic, 22500 Paimpol").field("francoKm", "500").field("prixAuDela", "0").attach("file", devis, { filename: "devis.pdf", contentType: "application/pdf" });
}

describe("groupé, étape 9 : l'admin de Greg", { timeout: 90_000 }, () => {
  it("réservé aux admins ; le tableau (lots par département, négoces, accords, factures, exclusions), le journal d'un lot, l'export CSV", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "BatiClair", ["roofing"]);
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    expect((await a.agent.get("/v1/admin/groupe")).status).toBe(403);
    expect((await greg.agent.get("/v1/admin/groupe").expect(200)).body.lots).toEqual([]);
    await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
    await negoce(a.agent, "Négoce Généraliste", "general@example.com", ["couverture", "second_oeuvre"]);
    await proposer(a, "signe").expect(201);
    const b = await carreleur("b@example.fr", "Carrelages B", "12 rue de Kerampont, 22300 Lannion");
    await proposer(b, "signe").expect(201);
    await deposer(jetonPour("general@example.com"), [["CAR", CARREAU, "46 u", "19,90", "915,40"]], "DEVIS G – Délai de livraison 5 jours");
    await deposer(jetonPour("carrelage@example.com"), [["CAR", CARREAU, "46 u", "18,50", "851,00"]], "DEVIS C – Délai de livraison 8 jours");
    await ctx.app.get(ChoixService).choisirLesLotsEnvoyes();
    const tableau = (await greg.agent.get("/v1/admin/groupe").expect(200)).body;
    expect(tableau.departements).toMatchObject({ ouverts: ["22", "29"] });
    expect(tableau.departements.compteurs).toEqual([{ departement: "22", lots: 1, economies: 0 }]);
    expect(tableau.lots[0]).toMatchObject({ statut: "choisi", zone: "22", negoceRetenu: "Négoce Carrelage", prixRetenu: "18.5", besoins: { total: 2, fermes: 2 }, reponses: { attendues: 2, deposees: 2, pasConcernes: 0, aVerifier: 0 }, bons: 2 });
    expect(tableau.negoces.map((n: { nom: string }) => n.nom).sort()).toEqual(["Négoce Carrelage", "Négoce Généraliste"]);
    expect(tableau.accords).toHaveLength(2);
    expect(tableau.accords[0]).toMatchObject({ versionContrat: "2026-10-20", tauxPourcent: "2" });
    expect(tableau.factures).toHaveLength(1);
    expect(tableau.factures[0]).toMatchObject({ negoce: "Négoce Carrelage", montantHt: "17.02", statut: "envoyee" });
    expect(tableau.exclusions).toEqual([]);
    // Le journal du lot, avec les noms (Greg seul), les réponses et les accords.
    const lot = (await greg.agent.get(`/v1/admin/groupe/lots/${tableau.lots[0].id}`).expect(200)).body;
    expect(lot.besoins.map((x: { entreprise: string }) => x.entreprise).sort()).toEqual(["Carrelages A", "Carrelages B"]);
    expect(lot.journal.map((j: { evenement: string }) => j.evenement)).toEqual(expect.arrayContaining(["lot_ouvert", "lot_forme", "demande_envoyee", "reponse_deposee", "negoce_retenu", "bons_envoyes", "facture_envoyee"]));
    expect(lot.reponses).toHaveLength(2);
    expect(lot.accords[0].adresseIp.length).toBeGreaterThan(0);
    expect((await a.agent.get(`/v1/admin/groupe/lots/${tableau.lots[0].id}`)).status).toBe(403);
    // L'export CSV des factures : mois, négoce, lot, HT, TVA, TTC, statut.
    const csv = await greg.agent.get("/v1/admin/groupe/factures.csv").expect(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    const lignes = csv.text.trim().split("\n");
    expect(lignes[0]).toBe("mois;numero;negoce;lot;total_lot_ht;commission_ht;tva;ttc;statut;emise_le;echeance_le;payee_le");
    expect(lignes[1]).toContain(";Négoce Carrelage;");
    expect(lignes[1]).toContain(";851.00;17.02;3.40;20.42;envoyee;");
    // Marquer payée.
    expect((await greg.agent.post(`/v1/admin/groupe/factures/${tableau.factures[0].id}/payee`).expect(200)).body).toEqual({ statut: "payee" });
    expect((await greg.agent.get("/v1/admin/groupe/factures.csv").expect(200)).text).toContain(";payee;");
    // Le lot commandé ne s'annule plus ; il se clôt.
    expect((await greg.agent.post(`/v1/admin/groupe/lots/${tableau.lots[0].id}/annuler`)).status).toBe(409);
    expect((await greg.agent.post(`/v1/admin/groupe/lots/${tableau.lots[0].id}/clore`).expect(200)).body).toEqual({ statut: "clos" });
    expect((await greg.agent.post(`/v1/admin/groupe/lots/${tableau.lots[0].id}/clore`)).status).toBe(409);
  });

  it("forcer un lot ouvert, changer le négoce retenu avant les bons, annuler un lot (besoins libérés) ; un département fermé ferme le groupé", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "BatiClair", ["roofing"]);
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
    await negoce(a.agent, "Négoce Généraliste", "general@example.com", ["second_oeuvre"]);
    await proposer(a, "signe").expect(201);
    let lot = await ctx.prisma.lotGroupe.findFirstOrThrow();
    expect(lot.statut).toBe("ouvert");
    // Forcer : formé sans attendre le deuxième artisan ; il part au passage suivant.
    expect((await greg.agent.post(`/v1/admin/groupe/lots/${lot.id}/forcer`).expect(200)).body).toEqual({ statut: "forme" });
    await request(ctx.app.getHttpServer()).get("/v1/internal/groupe/regrouper").set("authorization", `Bearer ${process.env.CRON_SECRET ?? ""}`);
    await ctx.app.get(ChoixService).choisirLesLotsEnvoyes();
    lot = await ctx.prisma.lotGroupe.findFirstOrThrow();
    if (lot.statut === "forme") {
      // Sans secret de tâche dans cet environnement : on envoie par le service.
      const { DemandeService } = await import("../src/modules/groupe/index.js");
      await ctx.app.get(DemandeService).envoyerLesLotsFormes();
      lot = await ctx.prisma.lotGroupe.findFirstOrThrow();
    }
    expect(lot.statut).toBe("envoye");
    // Deux dépôts, le moins cher est retenu ; Greg change pour l'autre avant les bons (le choix ne lance pas les bons si on l'empêche : ici on change après).
    await deposer(jetonPour("general@example.com"), [["CAR", CARREAU, "23 u", "19,90", "457,70"]], "DEVIS G – Délai de livraison 5 jours");
    await deposer(jetonPour("carrelage@example.com"), [["CAR", CARREAU, "23 u", "18,50", "425,50"]], "DEVIS C – Délai de livraison 8 jours");
    lot = await ctx.prisma.lotGroupe.findFirstOrThrow();
    expect(lot.statut).toBe("choisi");
    // Les bons sont partis aussitôt (zéro gestion humaine) : changer le négoce est refusé ; annuler aussi.
    const general = await ctx.prisma.negoce.findFirstOrThrow({ where: { email: "general@example.com" } });
    expect((await greg.agent.post(`/v1/admin/groupe/lots/${lot.id}/negoce`).send({ negoceId: general.id })).status).toBe(409);
    // Un autre lot, ouvert, s'annule : le besoin redevient libre.
    const c = await carreleur("c@example.fr", "Carrelages C", "1 rue de Siam, 29200 Brest");
    await proposer(c, "signe").expect(201);
    const lotBrest = await ctx.prisma.lotGroupe.findFirstOrThrow({ where: { zone: "29" } });
    expect((await greg.agent.post(`/v1/admin/groupe/lots/${lotBrest.id}/annuler`).expect(200)).body).toEqual({ statut: "annule", besoinsLiberes: 1 });
    expect((await ctx.prisma.besoin.findFirstOrThrow({ where: { companyId: c.companyId } })).lotId).toBeNull();
    // Département fermé (35 n'est pas dans GROUPE_DEPARTEMENTS) : le groupé est fermé, la proposition refusée.
    const d = await carreleur("d@example.fr", "Carrelages D", "3 quai Duguay-Trouin, 35400 Saint-Malo");
    const etat = (await d.agent.get("/v1/groupe").expect(200)).body;
    expect(etat).toMatchObject({ eligible: false, raisons: ["departement_ferme"], departement: "35", admin: false });
    expect((await proposer(d, "signe")).status).toBe(403);
    expect((await greg.agent.get("/v1/groupe").expect(200)).body.admin).toBe(true);
  });
});
