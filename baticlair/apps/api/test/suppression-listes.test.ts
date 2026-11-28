import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * « MES LISTES » : LA SUPPRESSION DÉFINITIVE (Greg, 1er novembre 2026). Décidée par le serveur : une liste liée à une
 * demande envoyée, une offre, une réponse ou un achat groupé ne se supprime pas (raison dite) ; sinon, tout ce qui dépend
 * d'elle part (documents et fichiers, relevé et lignes, quantitatif, brouillon, journal de corrections), dans une
 * transaction, tout ou rien ; la consommation d'IA reste (pas de recrédit) ; une trace minimale (identifiant, auteur,
 * date). Idempotente, et jamais pour la liste d'une autre entreprise.
 */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

/** Une liste saisie (deux lignes, aucune IA). */
async function listeSaisie(agent: Agent, nom = "Ma liste du 1er novembre") {
  const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Ardoise naturelle 32×22", quantite: "900", unite: "pièces" }, { libelle: "Crochets inox", quantite: "1000", unite: "pièces" }] }).expect(201)).body as { projetId: string };
  await agent.patch(`/v1/projects/${q.projetId}`).send({ name: nom }).expect(200);
  return q.projetId;
}

/** Une liste depuis un devis déposé (document, fichier, relevé IA simulé). */
async function listeDevis(agent: Agent) {
  const project = (await agent.post("/v1/projects").send({ name: "Toiture Dupont" }).expect(201)).body.id as string;
  const doc = (await agent.post(`/v1/projects/${project}/documents`).field("purpose", "client_quote").attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" })).body.id as string;
  await agent.post(`/v1/documents/${doc}/takeoff`).expect(201);
  return { project, doc };
}

const verifier = (agent: Agent, ids: string[]) => agent.post("/v1/listes/suppression/verifier").send({ ids });
const supprimer = (agent: Agent, ids: string[]) => agent.post("/v1/listes/suppression").send({ ids });

describe("Mes listes : suppression définitive", () => {
  it("un brouillon issu d'un devis : chantier, documents, fichier, relevé, lignes, quantitatif et brouillon partent ; la consommation d'IA reste ; une trace minimale", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { project, doc } = await listeDevis(agent);
    await agent.put("/v1/brouillons").send({ cle: `envoi:${project}`, type: "envoi", titre: "Demande de prix à 2 négoces", url: `/chantiers/${project}`, etape: 1, donnees: { selected: ["a", "b"] } }).expect(200);
    const iaAvant = await ctx.prisma.aiExecution.count({ where: { companyId } });
    expect((await ctx.prisma.takeoff.count({ where: { projectId: project } })) > 0).toBe(true);

    const v = await verifier(agent, [project]).expect(200);
    expect(v.body.listes).toEqual([expect.objectContaining({ id: project, supprimable: true, raison: null })]);
    expect((await supprimer(agent, [project]).expect(200)).body).toEqual({ supprimees: [project] });

    expect(await ctx.prisma.project.count({ where: { id: project } })).toBe(0);
    expect(await ctx.prisma.document.count({ where: { id: doc } })).toBe(0);
    expect(await ctx.prisma.documentBlob.count({ where: { documentId: doc } })).toBe(0);
    expect(await ctx.prisma.takeoff.count({ where: { projectId: project } })).toBe(0);
    expect(await ctx.prisma.takeoffLine.count({ where: { takeoff: { projectId: project } } })).toBe(0);
    expect(await ctx.prisma.quantitatif.count({ where: { projectId: project } })).toBe(0);
    expect(await ctx.prisma.brouillon.count({ where: { companyId } })).toBe(0);
    // Les crédits déjà utilisés ne sont pas recrédités : le journal de consommation reste.
    expect(await ctx.prisma.aiExecution.count({ where: { companyId } })).toBe(iaAvant);
    const trace = await ctx.prisma.listeSupprimee.findMany({ where: { companyId } });
    expect(trace).toEqual([expect.objectContaining({ projectId: project, userId: expect.any(String) })]);
    expect(Object.keys(trace[0]!).sort()).toEqual(["companyId", "id", "projectId", "supprimeeLe", "userId"]);
  });

  it("plusieurs listes d'un coup ; une requête rejouée (double clic, réseau) répond pareil sans rien casser", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const a = await listeSaisie(agent, "Liste A");
    const b = await listeSaisie(agent, "Liste B");
    const garde = await listeSaisie(agent, "Liste gardée");
    const [r1, r2] = await Promise.all([supprimer(agent, [a, b]), supprimer(agent, [a, b])]);
    expect([r1.status, r2.status].every((s) => s === 200 || s === 409)).toBe(true);
    expect((await supprimer(agent, [a, b]).expect(200)).body).toEqual({ supprimees: [a, b] });
    expect(await ctx.prisma.project.count({ where: { id: { in: [a, b] } } })).toBe(0);
    expect(await ctx.prisma.project.count({ where: { id: garde } })).toBe(1);
    expect(await ctx.prisma.listeSupprimee.count()).toBe(2);
  });

  it("la liste d'une autre entreprise : 404, rien n'est touché, même mêlée aux siennes", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Le Gall");
    const deA = await listeSaisie(a.agent);
    const deB = await listeSaisie(b.agent);
    expect((await verifier(b.agent, [deA])).status).toBe(404);
    expect((await supprimer(b.agent, [deA])).status).toBe(404);
    expect((await supprimer(b.agent, [deB, deA])).status).toBe(404);
    expect(await ctx.prisma.project.count({ where: { id: { in: [deA, deB] } } })).toBe(2);
    expect(await ctx.prisma.listeSupprimee.count()).toBe(0);
  });

  it("liée à une demande envoyée : refusée avec sa raison ; avec une autre liste supprimable, rien n'est supprimé (pas de suppression partielle)", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const envoyee = await listeSaisie(agent, "Liste envoyée");
    const libre = await listeSaisie(agent, "Liste libre");
    const takeoff = await ctx.prisma.takeoff.findFirstOrThrow({ where: { projectId: envoyee } });
    await ctx.prisma.priceRequest.create({ data: { companyId, projectId: envoyee, takeoffId: takeoff.id, lines: [] } });
    const v = (await verifier(agent, [envoyee, libre]).expect(200)).body.listes as { id: string; supprimable: boolean; phrase: string | null }[];
    expect(v.find((x) => x.id === envoyee)).toMatchObject({ supprimable: false, phrase: "Cette liste est liée à une demande déjà envoyée. Elle ne peut pas être supprimée." });
    expect(v.find((x) => x.id === libre)).toMatchObject({ supprimable: true });
    const res = await supprimer(agent, [envoyee, libre]);
    expect(res.status).toBe(409);
    expect(res.body.error.details).toMatchObject({ reason: "liste_non_supprimable", refus: [expect.objectContaining({ id: envoyee, raison: "demande" })] });
    expect(await ctx.prisma.project.count({ where: { id: { in: [envoyee, libre] } } })).toBe(2);
  });

  it("liée à une offre de négoce ou à un achat groupé : refusée, chacune avec sa raison", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const avecOffre = await listeSaisie(agent, "Avec offre");
    const enGroupe = await listeSaisie(agent, "En achat groupé");
    await agent.post(`/v1/projects/${avecOffre}/documents`).field("purpose", "supplier_quote").attach("file", Buffer.from(await makePdf(["devis"])), { filename: "offre.pdf", contentType: "application/pdf" }).expect(201);
    await ctx.prisma.besoinNegocie.create({ data: { companyId, projectId: enGroupe, designation: "Ardoise", cle: "ardoise", famille: "ardoise", quantite: 900, unite: "pièces", departement: "22", livraison: "Paimpol", dateBesoin: new Date("2026-12-01"), statut: "declare" } });
    const v = (await verifier(agent, [avecOffre, enGroupe]).expect(200)).body.listes as { id: string; raison: string; phrase: string }[];
    expect(v.find((x) => x.id === avecOffre)).toMatchObject({ raison: "offre", phrase: "Cette liste a une offre de négoce. Elle ne peut pas être supprimée." });
    expect(v.find((x) => x.id === enGroupe)).toMatchObject({ raison: "achat_groupe", phrase: "Cette liste est liée à un achat groupé. Elle ne peut pas être supprimée." });
    expect((await supprimer(agent, [enGroupe])).status).toBe(409);
    // Jamais un retrait de l'achat groupé à la place : la participation est intacte.
    expect(await ctx.prisma.besoinNegocie.count({ where: { projectId: enGroupe, statut: "declare" } })).toBe(1);
  });

  it("le résumé des cartes : lignes, origine, statut, supprimable", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const saisie = await listeSaisie(agent, "Saisie");
    const items = (await agent.get("/v1/projects?resume=1").expect(200)).body.items as { id: string; resume: { lignes: number; origine: string; statut: string; supprimable: boolean; demande: unknown } }[];
    expect(items.find((p) => p.id === saisie)?.resume).toMatchObject({ lignes: 2, origine: "Saisie", supprimable: true, demande: null });
    expect((await agent.get("/v1/projects").expect(200)).body.items[0].resume).toBeUndefined();
  });

  it("un lecteur (rôle viewer) ne supprime rien", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const liste = await listeSaisie(agent);
    await ctx.prisma.membership.updateMany({ where: { companyId }, data: { role: "viewer" } });
    expect((await supprimer(agent, [liste])).status).toBe(403);
    expect(await ctx.prisma.project.count({ where: { id: liste } })).toBe(1);
  });
});
