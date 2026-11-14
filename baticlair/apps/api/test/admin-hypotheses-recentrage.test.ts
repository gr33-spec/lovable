import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AbonnementService } from "../src/modules/abonnement/index.js";
import { DemandePersoService } from "../src/modules/recentrage/index.js";
import { doubleAuthentification } from "./support/admin.js";
import { ARDOISE, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * L'ADMIN DU RECENTRAGE (Greg, 25 octobre 2026) : les trois hypothèses de lancement par zone et par mois, le coût IA des
 * comptes gratuits (alerte au-delà de 3 $), l'interrupteur des inscriptions gratuites ; et « Vos résultats » du négoce.
 */
let ctx: TestContext;
const avant = { GROUPE_ADMINS: process.env.GROUPE_ADMINS, ZONES_ACTIVES: process.env.ZONES_ACTIVES };
beforeAll(async () => {
  process.env.GROUPE_ADMINS = "greg@example.fr";
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
  ctx.emails.sent.length = 0;
});

describe("admin du recentrage", () => {
  it("hypothèses : taux de réponse perso et demandes commandées, par zone ; « Vos résultats » du négoce", { timeout: 60_000 }, async () => {
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    const d = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "commander", accord: true, articles: a.articles, negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }, { nom: "Négoce Y", email: "y@negoce.fr" }] }).expect(201)).body;
    const jeton = /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, "x@negoce.fr").at(-1)!.text)![1]!;
    await request(ctx.app.getHttpServer()).post(`/v1/public/chiffrer/${jeton}`).send({ prix: { "0": 1.1 }, livraisonHt: 0, delaiJours: 2, validiteJours: 7 }).expect(200);
    await a.agent.post(`/v1/demandes-perso/${d.id}/commander`).send({ recipientId: d.destinataires.find((x: { nom: string }) => x.nom === "Négoce X").id }).expect(200);

    await greg.agent.get("/v1/admin/pilotage/hypotheses").expect(403);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const h = (await greg.agent.get("/v1/admin/pilotage/hypotheses").expect(200)).body;
    const ce = h.mois.find((m: { zone: string; mois: string }) => m.zone === "22" && m.mois === new Date().toISOString().slice(0, 7));
    expect(ce).toMatchObject({ tauxReponsePerso: 0.5, tauxCommande: 1, regroupements: { formes: 0, consultes: 0, commandes: 0 } });

    // « Vos résultats » : demandes reçues, réponses, commandes gagnées, chiffre d'affaires via l'app.
    // Sa première réponse a créé son invitation (le compte, pas encore inscrit) : il s'inscrit.
    const compte = await ctx.prisma.compteNegoce.update({ where: { email: "x@negoce.fr" }, data: { inscritLe: new Date() } });
    expect(await ctx.app.get(DemandePersoService).resultatsNegoce(compte.id)).toEqual({ demandesRecues: 1, reponses: 1, tauxReponse: 1, commandesGagnees: 1, caHt: 1100 });
  });

  it("le coût IA d'un compte gratuit au-delà de 3 $ est signalé ; l'interrupteur coupe les inscriptions", async () => {
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    await ctx.prisma.parametreGroupe.create({ data: { cle: "zone:22:seuil_franchi", valeur: "2026-01-01T00:00:00.000Z" } });
    await ctx.app.get(AbonnementService).finirEssai(a.companyId);
    await ctx.prisma.aiExecution.create({ data: { companyId: a.companyId, task: "takeoff_extraction", route: "text", provider: "anthropic", model: "test", promptId: "test", promptVersion: 1, costMicroUsd: 4_200_000n, priceTableVersion: "test", status: "success", durationMs: 1 } });
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const couts = (await greg.agent.get("/v1/admin/pilotage/cout-ia-gratuits").expect(200)).body;
    expect(couts).toMatchObject({ seuilUsd: 3, comptes: [{ entreprise: "Toitures A", usd: 4.2, alerte: true }] });

    expect((await greg.agent.get("/v1/admin/pilotage/inscriptions").expect(200)).body).toEqual({ gratuitesOuvertes: true });
    await greg.agent.put("/v1/admin/pilotage/inscriptions").send({ gratuitesOuvertes: false }).expect(200);
    const refus = await request(ctx.app.getHttpServer()).post("/v1/auth/sign-up/email").send({ email: "nouveau@toitures.fr", password: "un-mot-de-passe-solide", name: "Nouveau" });
    expect(refus.status).toBe(403);
    expect(JSON.stringify(refus.body)).toContain("Les inscriptions sont fermées");
    await greg.agent.put("/v1/admin/pilotage/inscriptions").send({ gratuitesOuvertes: true }).expect(200);
    const ok = await request(ctx.app.getHttpServer()).post("/v1/auth/sign-up/email").send({ email: "nouveau@toitures.fr", password: "un-mot-de-passe-solide", name: "Nouveau" });
    expect(ok.status).toBe(200);
  });
});
