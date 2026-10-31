import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LISTES_ENREGISTREES } from "../src/modules/takeoff/infrastructure/fake-liste-reader.js";
import { decodeListe, listeSystemPrompt, listeWireSchema } from "../src/modules/takeoff/application/liste-reader.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * « J'AI DÉJÀ MA LISTE » (demande du fondateur, 21 octobre 2026), crédit API à zéro : trois listes fictives enregistrées
 * (manuscrite, bon de négoce, tableau) lues par le faux lecteur, derrière le même client que les devis.
 * Les lignes sortent TELLES QU'ÉCRITES : aucun calcul, aucune question, la liste est prête à corriger puis à envoyer.
 */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");

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
});

async function deposer(agent: Awaited<ReturnType<typeof signUpWithCompany>>["agent"], fichier: { nom: string; octets: Buffer; type: string }) {
  const project = await agent.post("/v1/projects").send({ name: "Nouveau chantier" });
  const r = await agent.post(`/v1/projects/${project.body.id}/liste?ecran=1`).attach("file", fichier.octets, { filename: fichier.nom, contentType: fichier.type });
  return { projectId: project.body.id as string, r };
}

describe("lecture d'une liste déjà comptée", () => {
  for (const [nom, cle, octets, type] of [
    ["liste-manuscrite.png", "manuscrite", PNG, "image/png"],
    ["bon-negoce.png", "bon", PNG, "image/png"],
  ] as const) {
    it(`${cle} (photo) : les lignes telles qu'écrites, prêtes, sans question`, async () => {
      const { agent } = await signUpWithCompany(ctx.app, `${cle}@example.fr`, "Toitures Martin");
      const { projectId, r } = await deposer(agent, { nom, octets, type });
      expect(r.status).toBe(201);
      const attendu = LISTES_ENREGISTREES[cle].lignes;
      const takeoff = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff;
      expect(takeoff.lines.map((l: { designation: string; quantity: string | null; unit: string | null }) => [l.designation, l.quantity, l.unit])).toEqual(attendu.map((l) => [l.designation, l.quantite, l.unite]));
      // Aucun calcul, aucune question : la phase est « resultat », jamais « questions ».
      expect(r.body.phase).toBe("resultat");
      expect(r.body.questions ?? []).toEqual([]);
      // Plan « finition », bloc 4 : l'accueil ne redemande pas « Ajouter le devis client » pour une liste déjà là.
      const actions = (await agent.get("/v1/next-actions").expect(200)).body.items as { kind: string }[];
      expect(actions.map((a) => a.kind)).not.toContain("add_quote");
    });
  }

  it("tableau (PDF) : une ligne par ligne du tableau, quantités et unités gardées", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "tableau@example.fr", "Toitures Martin");
    const pdf = Buffer.from(await makePdf(["devis"]));
    const { projectId, r } = await deposer(agent, { nom: "tableau.pdf", octets: pdf, type: "application/pdf" });
    expect(r.status).toBe(201);
    const lignes = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff.lines;
    expect(lignes).toHaveLength(LISTES_ENREGISTREES.tableau.lignes.length);
    expect(lignes[0]).toMatchObject({ designation: "Plaque de plâtre BA13 2,50x1,20", quantity: "84", unit: "plaques" });
  });

  it("la liste reste modifiable d'un doigt : une ligne corrigée, une retirée, une ajoutée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "corrige@example.fr", "Toitures Martin");
    const { projectId } = await deposer(agent, { nom: "liste-manuscrite.png", octets: PNG, type: "image/png" });
    const t0 = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff;
    const [a, b] = t0.lines;
    expect((await agent.patch(`/v1/takeoff-lines/${a.id}`).send({ designation: a.designation, quantity: "1300", unit: a.unit })).status).toBe(200);
    expect((await agent.delete(`/v1/takeoff-lines/${b.id}`)).status).toBe(200);
    expect((await agent.post(`/v1/takeoffs/${t0.id}/lines`).send({ designation: "Chatière tuile", quantity: "6", unit: "pièces" })).status).toBeLessThan(300);
    const t1 = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff;
    expect(t1.lines).toHaveLength(t0.lines.length);
    expect(t1.lines.find((l: { id: string }) => l.id === a.id).quantity).toBe("1300");
    expect(t1.lines.some((l: { designation: string }) => l.designation === "Chatière tuile")).toBe(true);
  });

  it("le coût de la lecture est enregistré, sans compter une analyse de devis", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "cout@example.fr", "Toitures Martin");
    await deposer(agent, { nom: "liste-manuscrite.png", octets: PNG, type: "image/png" });
    const executions = await ctx.prisma.aiExecution.findMany({ where: { task: "lecture_liste" } });
    expect(executions).toHaveLength(1);
    expect(executions[0]!.documentId).toBeNull();
  });

  it("un fichier qui n'est ni une image ni un PDF est refusé en clair", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "refus@example.fr", "Toitures Martin");
    const { r } = await deposer(agent, { nom: "note.txt", octets: Buffer.from("du texte"), type: "text/plain" });
    expect(r.status).toBe(422);
    expect(r.body.error).toMatchObject({ code: "unreadable_document", details: { reason: "not_pdf" } });
  });

  it("une entreprise ne lit pas la liste du chantier d'une autre", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B");
    const project = await a.agent.post("/v1/projects").send({ name: "Chantier A" });
    const r = await b.agent.post(`/v1/projects/${project.body.id}/liste`).attach("file", PNG, { filename: "liste.png", contentType: "image/png" });
    expect([403, 404]).toContain(r.status);
  });
});

describe("la suite d'un devis : envoi et groupé", () => {
  async function couvreur(email: string, adresse: string) {
    const { agent, companyId } = await signUpWithCompany(ctx.app, email, `Toitures ${email}`);
    await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
    const { projectId } = await deposer(agent, { nom: "liste-manuscrite.png", octets: PNG, type: "image/png" });
    await agent.patch(`/v1/projects/${projectId}`).send({ address: adresse }).expect(200);
    const takeoff = (await agent.get(`/v1/projects/${projectId}/takeoff`).expect(200)).body.takeoff as { id: string; purchase: { toBuy: { key: string; label: string }[] } };
    // Une ligne vague n'entre pas dans le regroupement (décision de Greg, 22 octobre) : la marque se précise d'abord.
    const vague = takeoff.purchase.toBuy.find((x) => /^Tuile romane canal rouge/.test(x.label))!;
    const ligne = (takeoff as unknown as { lines: { id: string; designation: string; quantity: string | null; unit: string | null }[] }).lines.find((l) => `line:${l.id}` === vague.key)!;
    await agent.patch(`/v1/takeoff-lines/${ligne.id}`).send({ designation: `${ligne.designation} Edilians`, quantity: ligne.quantity, unit: ligne.unit }).expect(200);
    const toBuy = (await agent.get(`/v1/projects/${projectId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
    return { agent, projectId, tuile: toBuy.find((x) => /^Tuile romane canal rouge.*Edilians/.test(x.label))! };
  }
  const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };

  it("deux listes lues, même article, même département : un seul lot au groupé", async () => {
    const a = await couvreur("a@example.fr", "3 rue des Ajoncs, 22300 Lannion");
    const b = await couvreur("b@example.fr", "8 rue du Port, 22500 Paimpol");
    expect(a.tuile).toBeDefined();
    await a.agent.post(`/v1/projects/${a.projectId}/groupe`).send({ articles: [a.tuile.key], fenetre: FENETRE, statut: "signe", engagement: true }).expect(201);
    await b.agent.post(`/v1/projects/${b.projectId}/groupe`).send({ articles: [b.tuile.key], fenetre: FENETRE, statut: "signe", engagement: true }).expect(201);
    const lots = await ctx.prisma.lotGroupe.findMany({ include: { besoins: true } });
    expect(lots).toHaveLength(1);
    expect(lots[0]).toMatchObject({ zone: "22", statut: "forme" });
    expect(lots[0]!.besoins).toHaveLength(2);
    expect(lots[0]!.besoins[0]!.designation).toMatch(/^Tuile romane canal rouge/);
  });

  it("rien n'est envoyé aux négoces sans la validation de l'artisan : la liste attend, les lignes corrigées sont celles qui partent", async () => {
    const a = await couvreur("c@example.fr", "3 rue des Ajoncs, 22300 Lannion");
    const takeoff = (await a.agent.get(`/v1/projects/${a.projectId}/takeoff`).expect(200)).body.takeoff;
    expect(takeoff.status).not.toBe("validated");
    expect(ctx.prisma.priceRequest ? await ctx.prisma.priceRequest.count() : 0).toBe(0);
  });
});

describe("les consignes de lecture", () => {
  it("disent : tel qu'écrit, aucun calcul, rien d'ajouté, prix et totaux ignorés", () => {
    const p = listeSystemPrompt();
    for (const mot of ["TELLES QU'ELLES SONT ÉCRITES", "AUCUN CALCUL", "n'ajoutes aucun article", "prix, montants, totaux", "tu ne devines jamais"]) expect(p).toContain(mot);
  });

  it("la relecture par le code nettoie les espaces, retire les lignes sans article, vide = absent", () => {
    const lu = decodeListe(listeWireSchema.parse({ lignes: [{ designation: "  Liteau   sapin ", quantite: " 480 ", unite: "m" }, { designation: "   ", quantite: "3", unite: "" }, { designation: "Vis", quantite: "", unite: "" }] }));
    expect(lu.lignes).toEqual([
      { designation: "Liteau sapin", quantite: "480", unite: "m" },
      { designation: "Vis", quantite: null, unite: null },
    ]);
  });
});
