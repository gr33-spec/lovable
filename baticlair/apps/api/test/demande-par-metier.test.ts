import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * LA DEMANDE CLASSIQUE TRIE SES LIGNES PAR MÉTIER DU NÉGOCE (Greg, 14 novembre 2026 ; recette complète du 13, B7). Avant : un
 * négoce « Zinguerie seule » et un négoce « Étanchéité seule » recevaient toute la liste d'un couvreur, ardoises comprises.
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, ZONES_ACTIVES: process.env.ZONES_ACTIVES };
beforeAll(async () => {
  process.env.ZONES_ACTIVES = "22";
  process.env.MODE_REGROUPEMENT = "automatique";
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

const LISTE = [
  { libelle: "Ardoise naturelle 32×22", quantite: "1000", unite: "pièces" },
  { libelle: "Liteau 27×40", quantite: "100", unite: "m" },
  { libelle: "Gouttière zinc demi-ronde de 25", quantite: "24", unite: "m" },
  { libelle: "Membrane EPDM 1,14 mm", quantite: "40", unite: "m²" },
];

describe("demande de prix classique : tri par métier du négoce", () => {
  it("qui reçoit quoi : le zingueur ses gouttières, l'étancheur sa membrane, le couvreur le reste, le généraliste tout ; puis chacun ne reçoit que ses lignes", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LISTE);
    const creer = async (nom: string, specialites: string[]) => (await a.agent.post("/v1/suppliers").send({ name: nom, email: `${nom.toLowerCase()}@negoce.fr`, specialites }).expect(201)).body.id as string;
    const couv = await creer("Couv", ["couverture"]);
    const zing = await creer("Zing", ["zinguerie"]);
    const etan = await creer("Etan", ["etancheite"]);
    const gene = await creer("Gene", ["generaliste"]);
    const tri = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests/repartition`).send({ supplierIds: [couv, zing, etan, gene] }).expect(200)).body as {
      toutPourTous: boolean;
      groupes: { supplierIds: string[]; negoces: string[]; articles: string[]; lignes: string[] }[];
      sansSpecialiste: unknown[];
      sansLigne: string[];
    };
    expect(tri.toutPourTous).toBe(false);
    const de = (id: string) => tri.groupes.find((g) => g.supplierIds.includes(id))!;
    expect(de(couv).lignes.map((l) => /Ardoise|Liteau/.test(l))).toEqual([true, true]);
    // La gouttière et sa naissance (la seule pièce que le moteur ajoute à une gouttière).
    expect(de(zing).lignes.length).toBeGreaterThanOrEqual(1);
    expect(de(zing).lignes.every((l) => /Gouttière|Naissance/i.test(l))).toBe(true);
    expect(de(etan).lignes[0]).toMatch(/EPDM/);
    expect(de(gene).lignes).toHaveLength(de(couv).lignes.length + de(zing).lignes.length + de(etan).lignes.length);
    expect(tri).toMatchObject({ sansSpecialiste: [], sansLigne: [] });
    // Rien n'est créé par le tri.
    expect((await a.agent.get(`/v1/projects/${a.projectId}/price-requests`).expect(200)).body.items).toHaveLength(0);

    // L'écran crée une demande par groupe : le zingueur ne reçoit que sa ligne.
    const g = de(zing);
    const demande = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests`).send({ supplierIds: g.supplierIds, articles: g.articles }).expect(201)).body as { recipients: { id: string }[] };
    await a.agent.post(`/v1/price-request-recipients/${demande.recipients[0]!.id}/send`).expect(200);
    expect(mailsVers(ctx, "zing@negoce.fr")).toHaveLength(1);
    // Ce qui est parti chez lui : ses lignes seulement (elles sont dans le PDF joint, gardées avec la demande).
    const partie = JSON.stringify(await ctx.prisma.priceRequest.findFirstOrThrow({ select: { lines: true, itemKeys: true } }));
    expect(partie).toMatch(/Gouttière/);
    expect(partie).not.toMatch(/Ardoise|EPDM|Liteau/);
  }, 60_000);

  it("aucune ligne perdue : sans négoce de zinguerie ni d'étanchéité, ces lignes partent chez tous, et c'est dit ; un négoce sans ligne ne reçoit rien", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LISTE);
    const couv = (await a.agent.post("/v1/suppliers").send({ name: "Couv", email: "couv@negoce.fr", specialites: ["couverture"] }).expect(201)).body.id as string;
    const elec = (await a.agent.post("/v1/suppliers").send({ name: "Elec", email: "elec@negoce.fr", specialites: ["electricite"] }).expect(201)).body.id as string;
    const tri = (await a.agent.post(`/v1/projects/${a.projectId}/price-requests/repartition`).send({ supplierIds: [couv, elec] }).expect(200)).body;
    expect([...new Set(tri.sansSpecialiste.map((l: { metier: string }) => l.metier))].sort()).toEqual(["Zinguerie", "Étanchéité"]);
    const lignesDe = (id: string) => tri.groupes.find((g: { supplierIds: string[] }) => g.supplierIds.includes(id)).lignes as string[];
    // Le couvreur reçoit tout ; l'électricien seulement les lignes que personne ne couvre.
    expect(lignesDe(elec)).toHaveLength(tri.sansSpecialiste.length);
    expect(lignesDe(couv)).toHaveLength(tri.sansSpecialiste.length + 2);
    expect(lignesDe(elec).some((l) => /Ardoise|Liteau/.test(l))).toBe(false);
  }, 60_000);

  it("le tri ne lit ni le chantier ni les négoces d'un autre artisan", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LISTE);
    const b = await couvreurAvecListe(ctx, "b@toitures.fr", "Toitures B", "3 rue des Ajoncs, 22300 Lannion", LISTE);
    const negoceDeB = (await b.agent.post("/v1/suppliers").send({ name: "N", email: "n@negoce.fr" }).expect(201)).body.id as string;
    // Le chantier d'un autre : la même réponse que pour un chantier sans liste, rien n'est lu.
    expect((await b.agent.post(`/v1/projects/${a.projectId}/price-requests/repartition`).send({ supplierIds: [negoceDeB] }).expect(400)).body.error.details).toMatchObject({ reason: "takeoff_not_validated" });
    const negoceDeA = (await a.agent.post("/v1/suppliers").send({ name: "N", email: "n@negoce.fr" }).expect(201)).body.id as string;
    await a.agent.post(`/v1/projects/${a.projectId}/price-requests/repartition`).send({ supplierIds: [negoceDeB] }).expect(404);
    await a.agent.post(`/v1/projects/${a.projectId}/price-requests/repartition`).send({ supplierIds: [negoceDeA] }).expect(200);
  }, 60_000);
});
