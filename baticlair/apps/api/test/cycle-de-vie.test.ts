/**
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

const engager = (a: Awaited<ReturnType<typeof artisan>>) =>
  a.agent.post(`/v1/projects/${a.projectId}/achat-groupe`).send({ confirmees: [a.cle], dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }], engagement: true });

async function demandeRepondue(a: Awaited<ReturnType<typeof artisan>>) {
  const s = (await a.agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.example" }).expect(201)).body;
  const demande = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests`).send({ supplierIds: [s.id] }).expect(201)).body;
  await a.agent.post(`/v1/price-request-recipients/${demande.recipients[0].id}/send`).expect(200);
  return { supplierId: s.id as string, demandeId: demande.id as string };
}

describe("le cycle de vie des lignes", () => {
  it("une ligne ne rejoint qu'un achat groupé : la seconde fois est refusée et la quantité ne double pas, même en double clic", async () => {
    const a = await artisan("a@toitures.fr");
    expect((await engager(a)).status).toBe(201);
    const deuxieme = await engager(a);
    expect(deuxieme.status).toBe(409);
    expect(deuxieme.body.error.details).toMatchObject({ reason: "deja_dans_un_groupe" });
    expect(deuxieme.body.error.details.message).toMatch(/une ligne ne rejoint qu'un seul achat groupé/);
    const lignes = await ctx.prisma.ligneAchatGroupe.findMany({ where: { companyId: a.companyId } });
    expect(lignes).toHaveLength(1);
    expect(Number(lignes[0]!.quantite)).toBe(900);

    // Double clic sur une autre entreprise : une seule ligne engagée.
    const b = await artisan("b@toitures.fr");
    const [r1, r2] = await Promise.all([engager(b), engager(b)]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect(await ctx.prisma.ligneAchatGroupe.count({ where: { companyId: b.companyId } })).toBe(1);
  });

  it("commander seule une ligne tenue par un achat groupé ouvert : refusé avec la phrase, puis retirée sur le geste explicite", async () => {
    const a = await artisan("a@toitures.fr");
    expect((await engager(a)).status).toBe(201);
    const { supplierId, demandeId } = await demandeRepondue(a);
    const refus = await a.agent.patch(`/v1/price-requests/${demandeId}/classification`).send({ classified: true, retainedSupplierIds: [supplierId] });
    expect(refus.status).toBe(409);
    expect(refus.body.error.details).toMatchObject({ reason: "dans_un_groupe", deblocage: "retirer_du_groupe" });
    expect(refus.body.error.details.message).toMatch(/retire-la d'abord de l'achat groupé/);
    expect(await ctx.prisma.ligneAchatGroupe.count({ where: { companyId: a.companyId } })).toBe(1);
    // Le geste explicite : la ligne quitte l'achat groupé (vidé, il est retiré comme « Retirer ma liste »), puis la commande.
    await a.agent.patch(`/v1/price-requests/${demandeId}/classification`).send({ classified: true, retainedSupplierIds: [supplierId], retirerDesGroupes: true }).expect(200);
    expect(await ctx.prisma.ligneAchatGroupe.count({ where: { companyId: a.companyId } })).toBe(0);
    expect((await ctx.prisma.besoinNegocie.findFirstOrThrow({ where: { companyId: a.companyId } })).statut).toBe("retire");
    // Commandée seule : elle ne revient pas dans un achat groupé, ni dans une recherche.
    expect((await engager(a)).body.error.details.reason).toBe("deja_commande");
    const cycle = (await a.agent.get(`/v1/projects/${a.projectId}/cycle`).expect(200)).body.lignes;
    expect(cycle).toEqual([expect.objectContaining({ key: a.cle, etat: "commandee_seule", libelle: "Commandée seule", actions: [] })]);
  });

  it("une ligne commandée en groupe n'est jamais recommandée seule ; l'état de chaque ligne se lit d'une route", async () => {
    const a = await artisan("a@toitures.fr");
    let cycle = (await a.agent.get(`/v1/projects/${a.projectId}/cycle`).expect(200)).body.lignes;
    expect(cycle[0]).toMatchObject({ etat: "libre", actions: ["envoyer_demande", "chercher", "rejoindre_groupe", "commander_seul"] });
    expect((await engager(a)).status).toBe(201);
    cycle = (await a.agent.get(`/v1/projects/${a.projectId}/cycle`).expect(200)).body.lignes;
    expect(cycle[0]).toMatchObject({ etat: "dans_un_groupe", libelle: "Dans un achat groupé", actions: ["envoyer_demande"] });
    // Dans un achat groupé : pas de recherche de rapprochement en plus.
    const recherche = await a.agent.post(`/v1/projects/${a.projectId}/rapprochement`).send({ articles: [a.cle], jusquau: jour(7) });
    expect(recherche.status).toBe(409);
    expect(recherche.body.error.details.reason).toBe("deja_dans_un_groupe");
    // La commande groupée passée : plus aucune commande seule possible, même avec le geste de retrait.
    await ctx.prisma.besoinNegocie.updateMany({ where: { companyId: a.companyId }, data: { statut: "accepte", accepteLe: new Date() } });
    const { supplierId, demandeId } = await demandeRepondue(a);
    const refus = await a.agent.patch(`/v1/price-requests/${demandeId}/classification`).send({ classified: true, retainedSupplierIds: [supplierId], retirerDesGroupes: true });
    expect(refus.status).toBe(409);
    expect(refus.body.error.details.reason).toBe("deja_commande_en_groupe");
    expect(await ctx.prisma.ligneAchatGroupe.count({ where: { companyId: a.companyId } })).toBe(1);
    cycle = (await a.agent.get(`/v1/projects/${a.projectId}/cycle`).expect(200)).body.lignes;
    expect(cycle[0]).toMatchObject({ etat: "commandee_en_groupe", actions: [] });
  });

  it("après la clôture, la ligne ne sort pas de l'achat groupé d'ici : il faut en sortir avec son motif", async () => {
    const a = await artisan("a@toitures.fr");
    expect((await engager(a)).status).toBe(201);
    await ctx.prisma.regroupementNegocie.updateMany({ data: { clotureLe: new Date(Date.now() - 3_600_000) } });
    const { supplierId, demandeId } = await demandeRepondue(a);
    const refus = await a.agent.patch(`/v1/price-requests/${demandeId}/classification`).send({ classified: true, retainedSupplierIds: [supplierId], retirerDesGroupes: true });
    expect(refus.status).toBe(409);
    expect(refus.body.error.details.reason).toBe("groupe_clos");
    expect(await ctx.prisma.ligneAchatGroupe.count({ where: { companyId: a.companyId } })).toBe(1);
  });

  it("isolation : l'état des lignes d'un chantier n'est lisible que par son entreprise", async () => {
    const a = await artisan("a@toitures.fr");
    const b = await artisan("b@toitures.fr");
    expect((await b.agent.get(`/v1/projects/${a.projectId}/cycle`)).status).toBe(404);
  });
});
