/**
 * Greg, 7 novembre 2026 (point 4) : les détections automatiques de la file d'exceptions, prudentes ; chacune crée une
 * exception à examiner et ne corrige jamais rien (aucune fusion, aucun produit modifié, l'accès reste refusé).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ARDOISE, couvreurAvecListe } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "MODE_REGROUPEMENT", "EMAIL_DOMAINE", "INTERPRETE_IA"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT;
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.EMAIL_DOMAINE = "mobiiz.test";
  process.env.INTERPRETE_IA = "on";
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

const exceptions = (type: string) => ctx.prisma.exceptionSupervision.findMany({ where: { type } });
const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe("les détections automatiques", () => {
  it("accès croisé : l'entreprise d'un autre est refusée (404) et une alerte minimale est créée ; une entreprise inexistante, non", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A");
    const b = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B");
    expect((await b.agent.get("/v1/suppliers").set("x-company-id", a.companyId)).status).toBe(404);
    expect((await b.agent.get("/v1/suppliers").set("x-company-id", "0190f0f0-0000-7000-8000-000000000000")).status).toBe(404);
    const e = await exceptions("acces_croise");
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ gravite: 3, companyId: a.companyId });
    expect(e[0]!.detail).not.toContain("Toitures");
  });

  it("doublon incertain : un négoce au même téléphone est créé tel quel et signalé, jamais fusionné", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A");
    await agent.post("/v1/suppliers").send({ name: "Point P Lannion", email: "lannion@pointp.fr", phone: "02 96 00 00 01" }).expect(201);
    await agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.fr", phone: "+33 2 96 00 00 01" }).expect(201);
    await agent.post("/v1/suppliers").send({ name: "Gédimat Paimpol", email: "paimpol@gedimat.fr" }).expect(201);
    expect((await agent.get("/v1/suppliers").expect(200)).body.items ?? (await agent.get("/v1/suppliers")).body).toHaveLength(3);
    const e = await exceptions("doublon_incertain");
    expect(e).toHaveLength(1);
    expect(e[0]!.titre).toBe("Négoce peut-être en double : « Kerbrat » et « Point P Lannion »");
  });

  it("adresse incertaine et produit ambigu : refusés comme avant, et signalés", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "900", unite: "pièces" }]);
    const engager = (o: Record<string, unknown>) =>
      a.agent.post("/v1/achats-groupes").send({ lignes: [{ designation: ARDOISE, quantite: 900, unite: "pièces" }], livraison: "22300 Lannion", dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }], engagement: true, ...o });
    expect((await engager({ livraison: "Lannion, près du port" })).status).toBe(400);
    expect((await exceptions("adresse_incertaine")).length).toBe(1);
    expect((await engager({ lignes: [{ designation: "Ardoise", quantite: 900, unite: "pièces" }] })).status).toBe(400);
    const p = await exceptions("produit_ambigu");
    expect(p).toHaveLength(1);
    expect(p[0]!.detail).toContain("« Ardoise »");
  });

  it("résultat IA incohérent : une valeur du modèle refusée par la validation du serveur", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A");
    const q = [{ numero: 1, cle: "fiche:teinte", texte: "Quelle teinte pour les tuiles ?", options: [], unite: null, libre: "written" }, { numero: 2, cle: "param:x", texte: "Autre ?", options: [{ label: "Oui", value: "oui" }, { label: "Non", value: "non" }], unite: null }];
    // Le double du modèle invente une marque (« invente ») : le serveur la refuse et l'admin le voit.
    const r = (await agent.post("/v1/assistant/interpretation").send({ questions: q, texte: "2. peut-être, et les tuiles rouge vieilli, invente" }).expect(200)).body;
    expect(r.reponses[0].valeur ?? "").not.toMatch(/Edilians/);
    expect((await exceptions("resultat_ia_incoherent")).length).toBe(1);
  });
});
