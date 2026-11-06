/**
 * LE RAPPROCHEMENT CONTINU (Greg, 6 novembre 2026, parcours produit, points 7 à 9, 16 et 19) : une ligne laissée
 * disponible jusqu'à une date ; un besoin compatible d'une autre entreprise apparaît plus tard ; chaque entreprise est
 * prévenue (une fois, une relance au plus) ; exact / alternative (écarts dits) / autre secteur ; jamais le nom ni la
 * quantité de l'autre ; rien n'est ajouté tout seul ; une offre acceptée retire la ligne et bloque l'achat groupé (pas de
 * double commande) ; isolation entre entreprises ; double clic sans effet.
 */
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SIRET_ARTISAN, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

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

/** Une entreprise de test, sa liste validée (questions répondues au premier bouton) et l'adresse du chantier. */
async function artisan(email: string, nom: string, adresse: string, lignes: { libelle: string; quantite: string; unite: string }[]) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["roofing"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: SIRET_ARTISAN, siretVerifieLe: new Date() } });
  await ctx.prisma.user.update({ where: { email }, data: { emailVerified: true } });
  const q = (await agent.post("/v1/quantitatifs").send({ lignes }).expect(201)).body as { id: string; projetId: string };
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  let courant = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && courant.questions.length > 0; i++) {
    const question = courant.questions[0];
    courant = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  await agent.post(`/v1/quantitatifs/${q.id}/validation`).expect(200);
  const analyse = (await agent.get(`/v1/projects/${q.projetId}/rapprochement`).expect(200)).body;
  return { agent, companyId, email, projectId: q.projetId, analyse };
}

const ARDOISE = { libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "900", unite: "pièces" };
const cleDe = (analyse: { lignes: { key: string; designation: string }[] }, mot: RegExp) => analyse.lignes.find((l) => new RegExp(mot.source, "i").test(l.designation))!.key;
const disponible = (a: { agent: Agent; projectId: string }, articles: string[], jusquau = jour(7)) => a.agent.post(`/v1/projects/${a.projectId}/rapprochement`).send({ articles, jusquau });
const tache = (maintenant: Date) => request(ctx.app.getHttpServer()).get(`/v1/internal/achats-groupes?maintenant=${encodeURIComponent(maintenant.toISOString())}`).set("authorization", "Bearer secret-de-la-tache");

describe("le rapprochement continu", () => {
  it("analyse ligne par ligne : ce qui peut chercher, ce qui part seulement en individuel, et pourquoi", async () => {
    const a = await artisan("a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [ARDOISE, { libelle: "Crochet inox 100 mm", quantite: "900", unite: "pièces" }]);
    expect(a.analyse.phrase).toMatch(/^Ta demande peut partir maintenant à tes négoces\./);
    expect(a.analyse.departement).toBe("22");
    const ardoise = a.analyse.lignes.find((l: { designation: string }) => /Ardoise/.test(l.designation));
    const crochet = a.analyse.lignes.find((l: { designation: string }) => /Crochet/.test(l.designation));
    expect(ardoise).toMatchObject({ rapprochable: true, reference: "Ardoise 32×22 Espagne 1er choix", raison: null, recherche: null });
    expect(crochet).toMatchObject({ rapprochable: false, raison: "Petit accessoire : il part en demande individuelle." });
    // Une ligne non rapprochable est refusée par le serveur, même envoyée à la main.
    expect((await disponible(a, [crochet.key])).body.error.details.reason).toBe("ligne_non_rapprochable");
    // La date de fin de recherche : entre demain et 30 jours.
    expect((await disponible(a, [ardoise.key], jour(45))).body.error.details.reason).toBe("date_recherche");
  });

  it("un besoin compatible apparaît plus tard : les deux entreprises sont prévenues, sans nom ni quantité de l'autre ; double clic sans effet", async () => {
    const a = await artisan("a@toitures.fr", "Toitures Armor", "3 rue des Ajoncs, 22300 Lannion", [ARDOISE]);
    const cle = cleDe(a.analyse, /Ardoise/);
    const [r1, r2] = await Promise.all([disponible(a, [cle]), disponible(a, [cle])]);
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(await ctx.prisma.ligneRapprochement.count()).toBe(1);
    expect(mailsVers(ctx, "a@toitures.fr").filter((m) => /Rapprochement/.test(m.subject))).toHaveLength(0);

    const b = await artisan("b@toitures.fr", "Couvreurs du Trégor", "8 rue du Port, 22700 Perros-Guirec", [{ libelle: "ardoise 32x22 espagne 1er choix", quantite: "450", unite: "pièces" }]);
    await disponible(b, [cleDe(b.analyse, /ardoise/)]).expect(200);
    for (const qui of ["a@toitures.fr", "b@toitures.fr"]) {
      const mails = mailsVers(ctx, qui).filter((m) => /Rapprochement possible/.test(m.subject));
      expect(mails).toHaveLength(1);
      expect(mails[0]!.text).toMatch(/correspondance exacte/);
      expect(mails[0]!.text).toMatch(/Rien n'est ajouté sans ton accord/);
      expect(mails[0]!.text).not.toMatch(/Armor|Trégor|450|900/);
    }
    const vueA = (await a.agent.get("/v1/rapprochements").expect(200)).body;
    expect(vueA.lignes).toHaveLength(1);
    expect(vueA.lignes[0]).toMatchObject({ statut: "proposee", libelle: "Ardoise 32×22 Espagne 1er choix" });
    expect(vueA.lignes[0].propositions).toEqual([expect.objectContaining({ niveau: "exacte", libelleNiveau: "Correspondance exacte", differences: [], zone: "Département 22", entreprises: "moins de 5 entreprises", total: null, reponse: null })]);
    expect(JSON.stringify(vueA)).not.toMatch(/Trégor|450|b@toitures/);
    // À faire : l'action à examiner.
    expect((await a.agent.get("/v1/rapprochements/actions").expect(200)).body.items).toEqual([expect.objectContaining({ texte: "Correspondance exacte pour « Ardoise 32×22 Espagne 1er choix » : à examiner" })]);
    // Rien n'a rejoint d'achat groupé tout seul.
    expect(await ctx.prisma.ligneAchatGroupe.count()).toBe(0);
    expect(await ctx.prisma.besoinNegocie.count()).toBe(0);
  });

  it("alternative possible : les écarts sont dits ; un autre secteur ne se rapproche pas", async () => {
    const a = await artisan("a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [ARDOISE]);
    await disponible(a, [cleDe(a.analyse, /Ardoise/)]).expect(200);
    const c = await artisan("c@toitures.fr", "Toitures C", "1 place du Martray, 22220 Tréguier", [{ libelle: "Ardoise naturelle 30×20 Espagne 1er choix", quantite: "600", unite: "pièces" }]);
    await disponible(c, [cleDe(c.analyse, /Ardoise/)]).expect(200);
    const autre = await artisan("d@toitures.fr", "Toitures D", "4 rue de Siam, 29200 Brest", [ARDOISE]);
    await disponible(autre, [cleDe(autre.analyse, /Ardoise/)]).expect(200);
    const vueC = (await c.agent.get("/v1/rapprochements").expect(200)).body;
    expect(vueC.lignes[0].propositions).toEqual([expect.objectContaining({ niveau: "alternative", libelleNiveau: "Alternative possible", differences: ["Format différent : 30×20 et 32×22"] })]);
    expect(mailsVers(ctx, "c@toitures.fr").at(-1)!.text).toMatch(/alternative possible, avec des différences à vérifier/);
    expect((await autre.agent.get("/v1/rapprochements").expect(200)).body.lignes[0].propositions).toEqual([]);
  });

  it("refuser arrête les relances ; sans réponse, une seule relance deux jours après", async () => {
    const a = await artisan("a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [ARDOISE]);
    await disponible(a, [cleDe(a.analyse, /Ardoise/)]).expect(200);
    const b = await artisan("b@toitures.fr", "Toitures B", "8 rue du Port, 22700 Perros-Guirec", [ARDOISE]);
    await disponible(b, [cleDe(b.analyse, /Ardoise/)]).expect(200);
    const pA = (await a.agent.get("/v1/rapprochements").expect(200)).body.lignes[0].propositions[0];
    expect((await a.agent.post(`/v1/rapprochements/propositions/${pA.id}/reponse`).send({ reponse: "refusee" }).expect(200)).body).toEqual({ reponse: "refusee" });
    const dans3jours = new Date(Date.now() + 3 * 86_400_000);
    await tache(dans3jours).expect(200);
    await tache(new Date(Date.now() + 4 * 86_400_000)).expect(200);
    expect(mailsVers(ctx, "a@toitures.fr").filter((m) => /^Rappel : rapprochement/.test(m.subject))).toHaveLength(0);
    expect(mailsVers(ctx, "b@toitures.fr").filter((m) => /^Rappel : rapprochement/.test(m.subject))).toHaveLength(1);
    // « Examiner » ouvre le parcours existant (l'artisan confirme lui-même) : rien n'est ajouté.
    const pB = (await b.agent.get("/v1/rapprochements").expect(200)).body.lignes[0].propositions[0];
    expect((await b.agent.post(`/v1/rapprochements/propositions/${pB.id}/reponse`).send({ reponse: "examinee" }).expect(200)).body).toMatchObject({ reponse: "examinee", href: `/chantiers/${b.projectId}`, achat: null });
    expect(await ctx.prisma.ligneAchatGroupe.count()).toBe(0);
  });

  it("une offre acceptée retire la ligne de la recherche et lui ferme l'achat groupé : pas de double commande", async () => {
    const a = await artisan("a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [ARDOISE]);
    const cle = cleDe(a.analyse, /Ardoise/);
    await disponible(a, [cle]).expect(200);
    const s = (await a.agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.example" }).expect(201)).body;
    const demande = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests`).send({ supplierIds: [s.id] }).expect(201)).body;
    await a.agent.post(`/v1/price-request-recipients/${demande.recipients[0].id}/send`).expect(200);
    await a.agent.patch(`/v1/price-requests/${demande.id}/classification`).send({ classified: true, retainedSupplierIds: [s.id] }).expect(200);
    const vue = (await a.agent.get("/v1/rapprochements").expect(200)).body;
    expect(vue.lignes[0]).toMatchObject({ statut: "retiree", retraitMotif: "offre_acceptee" });
    expect((await disponible(a, [cle])).body.error.details.reason).toBe("offre_deja_acceptee");
    const r = await a.agent.post(`/v1/projects/${a.projectId}/achat-groupe`).send({ confirmees: [cle], dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }], engagement: true });
    expect(r.status).toBe(409);
    expect(r.body.error.details.reason).toBe("deja_commande");
  });

  it("isolation : une autre entreprise ne lit ni ne touche les lignes, propositions ou listes de A", async () => {
    const a = await artisan("a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [ARDOISE]);
    await disponible(a, [cleDe(a.analyse, /Ardoise/)]).expect(200);
    const b = await artisan("b@toitures.fr", "Toitures B", "8 rue du Port, 22700 Perros-Guirec", [ARDOISE]);
    await disponible(b, [cleDe(b.analyse, /Ardoise/)]).expect(200);
    const ligneA = (await a.agent.get("/v1/rapprochements").expect(200)).body.lignes[0];
    expect((await b.agent.get(`/v1/projects/${a.projectId}/rapprochement`)).status).toBe(404);
    expect((await b.agent.post(`/v1/projects/${a.projectId}/rapprochement`).send({ articles: ["x"], jusquau: jour(5) })).status).toBe(404);
    expect((await b.agent.post(`/v1/rapprochements/propositions/${ligneA.propositions[0].id}/reponse`).send({ reponse: "refusee" })).status).toBe(404);
    expect((await b.agent.delete(`/v1/rapprochements/lignes/${ligneA.id}`)).status).toBe(404);
    const vueB = (await b.agent.get("/v1/rapprochements").expect(200)).body;
    expect(vueB.lignes.map((l: { id: string }) => l.id)).not.toContain(ligneA.id);
    // A retire sa ligne : la proposition de B reste lisible, mais aucune nouvelle relance ne vise une ligne retirée.
    await a.agent.delete(`/v1/rapprochements/lignes/${ligneA.id}`).expect(200);
    expect((await a.agent.get("/v1/rapprochements").expect(200)).body.lignes[0].statut).toBe("retiree");
  });
});
