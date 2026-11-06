/**
 * LOT 6 (Greg, 6 novembre 2026, prompt maître points 6, 13 et 14) : la taxonomie des familles réglée par l'admin (et suivie
 * par « Découvrir »), la file d'exceptions (offre incomplète, prix incohérent, échec d'envoi, résolution) et le score
 * interne de fiabilité des négoces, réservés à l'admin avec la double authentification.
 */
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { ARDOISE, LITEAU, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const VARS = ["GROUPE", "GROUPE_ADMINS", "ZONES_ACTIVES", "CRON_SECRET", "MODE_REGROUPEMENT", "EMAIL_DOMAINE"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT;
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
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

const LIGNES = [
  { libelle: ARDOISE, quantite: "1000", unite: "pièces" },
  { libelle: LITEAU, quantite: "100", unite: "m" },
];
const publique = () => request(ctx.app.getHttpServer());
const jetonPour = (email: string) => /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, email).at(-1)!.text)![1]!;

async function admin() {
  const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: ARDOISE, quantite: "10", unite: "pièces" }]);
  await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
  return greg;
}

async function demandeATroisNegoces() {
  const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
  await a.agent
    .post(`/v1/projects/${a.projectId}/demandes-perso`)
    .send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }, { nom: "Négoce C", email: "c@negoce.fr" }, { nom: "Négoce D", email: "d@negoce.fr" }] })
    .expect(201);
  const cles = ((await publique().get(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).expect(200)).body.lignes as { cle: string }[]).map((l) => l.cle);
  return { a, cles };
}

describe("la supervision (admin)", () => {
  it("réservée à l'admin : un artisan n'y lit rien, ne change rien", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    for (const [m, url] of [
      ["get", "/v1/admin/pilotage/familles"],
      ["get", "/v1/admin/pilotage/exceptions"],
      ["get", "/v1/admin/pilotage/negoces/fiabilite"],
    ] as const)
      expect((await a.agent[m](url)).status).toBe(403);
    expect((await a.agent.put("/v1/admin/pilotage/familles/couverture").send({ libelle: "Piraté" })).status).toBe(403);
    expect(await ctx.prisma.familleMateriau.count()).toBe(0);
  });

  it("les familles : la configuration recopiée à la première ouverture, puis l'admin règle libellé et activité ; Découvrir suit", async () => {
    const greg = await admin();
    const f = (await greg.agent.get("/v1/admin/pilotage/familles").expect(200)).body.familles as { code: string; active: boolean }[];
    expect(f.filter((x) => x.active).map((x) => x.code).sort()).toEqual(["charpente", "couverture", "second_oeuvre"]);
    expect(f.length).toBeGreaterThanOrEqual(9);
    await greg.agent.put("/v1/admin/pilotage/familles/couverture").send({ libelle: "Couverture et zinguerie" }).expect(200);
    await greg.agent.put("/v1/admin/pilotage/familles/charpente").send({ active: false }).expect(200);
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const d = (await a.agent.get("/v1/achats-groupes/decouvrir").expect(200)).body;
    expect(d.familles).toEqual(["couverture", "second_oeuvre"]);
    expect(d.libellesFamilles.couverture).toBe("Couverture et zinguerie");
    // Une famille ajoutée naît inactive ; un code mal formé est refusé ; on ne désactive pas la dernière.
    await greg.agent.post("/v1/admin/pilotage/familles").send({ code: "isolation", libelle: "Isolation" }).expect(201);
    expect((await greg.agent.post("/v1/admin/pilotage/familles").send({ code: "Isolation thermique", libelle: "Isolation" })).status).toBe(400);
    await greg.agent.put("/v1/admin/pilotage/familles/couverture").send({ active: false }).expect(200);
    expect((await greg.agent.put("/v1/admin/pilotage/familles/second_oeuvre").send({ active: false })).status).toBe(409);
  });

  it("la file d'exceptions : une offre incomplète et un prix incohérent remontent une fois, puis l'admin les résout", async () => {
    const { cles } = await demandeATroisNegoces();
    await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).send({ prix: { [cles[0]!]: 1.1, [cles[1]!]: 0.9 }, livraisonHt: 60, delaiJours: 3, validiteJours: 14 }).expect(200);
    await publique().post(`/v1/public/chiffrer/${jetonPour("c@negoce.fr")}`).send({ prix: { [cles[0]!]: 1.2, [cles[1]!]: 0.95 }, livraisonHt: 0, delaiJours: 2, validiteJours: 14 }).expect(200);
    // D : une seule ligne, et un prix dix fois au-dessus des deux autres ; deux fois la même réponse.
    const jetonD = jetonPour("d@negoce.fr");
    for (let i = 0; i < 2; i++) await publique().post(`/v1/public/chiffrer/${jetonD}`).send({ prix: { [cles[0]!]: 12 }, livraisonHt: 0, delaiJours: 2, validiteJours: 14 }).expect(200);
    const greg = await admin();
    const file = (await greg.agent.get("/v1/admin/pilotage/exceptions").expect(200)).body;
    expect(file.types).toHaveLength(11);
    const types = (file.items as { type: string }[]).map((e) => e.type).sort();
    expect(types).toEqual(["offre_incomplete", "prix_incoherent"]);
    const incoherent = file.items.find((e: { type: string }) => e.type === "prix_incoherent");
    expect(incoherent).toMatchObject({ libelle: "Prix incohérent", gravite: 2, titre: "Prix très éloignés des autres offres chez Négoce D", occurrences: 2 });
    expect(file.items.find((e: { type: string }) => e.type === "offre_incomplete").titre).toBe("Négoce D a chiffré 1 ligne sur 2");
    await greg.agent.post(`/v1/admin/pilotage/exceptions/${incoherent.id}/resoudre`).send({ note: "Appelé : erreur de saisie, corrigée." }).expect(200);
    expect(((await greg.agent.get("/v1/admin/pilotage/exceptions").expect(200)).body.items as unknown[]).length).toBe(1);
    const resolues = (await greg.agent.get("/v1/admin/pilotage/exceptions?statut=resolue").expect(200)).body.items;
    expect(resolues).toEqual([expect.objectContaining({ type: "prix_incoherent", note: "Appelé : erreur de saisie, corrigée." })]);
    // « Autre anomalie » se signale à la main.
    await greg.agent.post("/v1/admin/pilotage/exceptions").send({ type: "autre", titre: "Un négoce dit ne jamais avoir reçu la demande" }).expect(201);
  });

  it("un e-mail de demande qui ne part pas remonte en « échec d'envoi »", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: ARDOISE, quantite: "900", unite: "pièces" }] }).expect(201)).body as { id: string; projetId: string };
    let courant = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
    for (let i = 0; i < 10 && courant.questions.length > 0; i++) {
      const question = courant.questions[0];
      courant = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
    }
    await agent.post(`/v1/quantitatifs/${q.id}/validation`).expect(200);
    const a = { agent, projectId: q.projetId };
    const s = (await a.agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.example" }).expect(201)).body;
    const demande = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests`).send({ supplierIds: [s.id] }).expect(201)).body;
    ctx.emails.failNext = 1;
    expect((await a.agent.post(`/v1/price-request-recipients/${demande.recipients[0].id}/send`)).status).toBe(502);
    const e = await ctx.prisma.exceptionSupervision.findFirstOrThrow({ where: { type: "echec_envoi" } });
    expect(e).toMatchObject({ statut: "ouverte", gravite: 3, titre: "L'e-mail de demande de prix n'est pas parti chez Kerbrat" });
  });

  it("le score de fiabilité : des faits par négoce (réponses, refus, complétude), rien sous trois demandes, jamais côté artisan", async () => {
    for (let i = 0; i < 3; i++) {
      const { cles } = await (async () => {
        const a = await couvreurAvecListe(ctx, `a${i}@toitures.fr`, `Toitures ${i}`, "3 rue des Ajoncs, 22300 Lannion", LIGNES);
        await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }, { nom: "Négoce C", email: "c@negoce.fr" }] }).expect(201);
        return { cles: ((await publique().get(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).expect(200)).body.lignes as { cle: string }[]).map((l) => l.cle) };
      })();
      await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).send({ prix: { [cles[0]!]: 1.1, [cles[1]!]: 0.9 }, livraisonHt: 60, delaiJours: 3, validiteJours: 14 }).expect(200);
      if (i === 0) await publique().post(`/v1/public/chiffrer/${jetonPour("c@negoce.fr")}/refuser`).send({ motif: "Pas en stock" }).expect(200);
    }
    const greg = await admin();
    const r = (await greg.agent.get("/v1/admin/pilotage/negoces/fiabilite").expect(200)).body;
    expect(r.phrase).toMatch(/Jamais montré aux artisans/);
    const b = r.negoces.find((n: { email: string }) => n.email === "b@negoce.fr");
    const c = r.negoces.find((n: { email: string }) => n.email === "c@negoce.fr");
    expect(b).toMatchObject({ nom: "Négoce B", tauxReponse: 1, completude: 1, familles: ["couverture"], base: "3 demandes, 3 réponses" });
    expect(b.score).toBeGreaterThan(80);
    expect(c).toMatchObject({ base: "3 demandes, 0 réponse, 1 « ne peut pas chiffrer »" });
    expect(c.score).toBeLessThan(b.score);
  });
});
