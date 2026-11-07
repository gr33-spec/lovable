import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleDeReference } from "@baticlair/domain";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 1 : LES DONNÉES (document du fondateur, 2026-10-19, section 7, étape 1). Les tables du groupé existent (treize, dont l'accord et la facture du négoce, et les désistements à part, décisions du 20 octobre),
 * se relient du besoin au bon de commande et à la livraison, et tiennent les garde-fous de section 5 en base : un seul lot
 * ouvert par référence et par zone, un besoin par ligne de liste, un négoce par e-mail et par département. Le drapeau
 * `groupe` est désactivé par défaut (« rien en prod sans mon accord explicite »).
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

const jour = (s: string) => new Date(`${s}T00:00:00Z`);

async function artisanAvecChantier(email: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, "Toitures d'épreuve");
  const project = (await agent.post("/v1/projects").send({ name: "Chantier d'épreuve", address: "3 rue des Ajoncs, 22300 Lannion" }).expect(201)).body as { id: string };
  return { agent, companyId, projectId: project.id };
}

describe("groupé, étape 1 : les données", () => {
  it("le drapeau `groupe` est désactivé par défaut", async () => {
    const health = await request(ctx.app.getHttpServer()).get("/v1/health").expect(200);
    expect(health.body.features.groupe).toBe(false);
  });

  it("du besoin à la livraison : un lot, une réponse de négoce, une offre, un bon, une livraison, le journal", async () => {
    const { companyId, projectId } = await artisanAvecChantier("groupe-a@example.fr");
    const cle = cleDeReference({ libelle: "Ardoise naturelle", dimension: "32x22" });
    const lot = await ctx.prisma.lotGroupe.create({ data: { cle, famille: "couverture", zone: "22", fenetreTot: jour("2026-11-02"), fenetreTard: jour("2026-11-20") } });
    const besoin = await ctx.prisma.besoin.create({
      data: {
        companyId, projectId, takeoffId: "01900000-0000-7000-8000-000000000001", articleKey: "ardoise", designation: "Ardoise naturelle 32×22",
        cle, famille: "couverture", quantite: "4200", unite: "u", zone: "22", adresseLivraison: "3 rue des Ajoncs, 22300 Lannion",
        fenetreTot: jour("2026-11-02"), fenetreTard: jour("2026-11-15"), statut: "signe", signeLe: new Date(), lotId: lot.id,
      },
    });
    const negoce = await ctx.prisma.negoce.create({ data: { nom: "Négoce d'épreuve", email: "devis@example.com", departement: "22", familles: ["couverture"], ajouteParId: companyId } });
    await ctx.prisma.negoceArtisan.create({ data: { companyId, negoceId: negoce.id, rang: 1, numeroCompte: "C-0042" } });
    await ctx.prisma.reponseNegoce.create({ data: { lotId: lot.id, negoceId: negoce.id, tokenHash: "h1", prix: [{ cle, palier: "4200", prixUnitaire: "1.18" }], delaiJours: 7, statutExtraction: "lue" } });
    await ctx.prisma.lotGroupe.update({ where: { id: lot.id }, data: { statut: "choisi", negoceRetenuId: negoce.id, prixRetenu: "1.18" } });
    const offre = await ctx.prisma.offreArtisan.create({ data: { lotId: lot.id, besoinId: besoin.id, prixUnitaire: "1.18", prixReference: "1.35", economie: "714.00", dateLivraison: jour("2026-11-03") } });
    const bon = await ctx.prisma.bonCommande.create({ data: { offreId: offre.id, negoceId: negoce.id, envoyeLe: new Date() } });
    await ctx.prisma.livraison.create({ data: { bonId: bon.id, datePrevue: jour("2026-11-03") } });
    await ctx.prisma.journalGroupe.create({ data: { lotId: lot.id, evenement: "negoce_retenu", details: { negoceId: negoce.id } } });
    // Décision du 20 octobre : l'accord du négoce (2 % s'il est retenu) avant sa réponse, et la facture au bon de commande.
    const accord = await ctx.prisma.accordNegoce.create({ data: { lotId: lot.id, negoceId: negoce.id, versionContrat: "2026-10-20", tauxPourcent: "2.00", email: "devis@example.com", adresseIp: "203.0.113.7" } });
    await ctx.prisma.factureNegoce.create({ data: { lotId: lot.id, negoceId: negoce.id, accordId: accord.id, totalLotHt: "4956.00", montantHt: "99.12", echeanceLe: jour("2026-12-03") } });

    const tout = await ctx.prisma.lotGroupe.findUniqueOrThrow({
      where: { id: lot.id },
      include: { besoins: true, reponses: true, offres: { include: { bon: { include: { livraison: true } } } }, journal: true, negoceRetenu: true, accords: true, facture: true },
    });
    expect(tout.numero).toBeGreaterThan(0);
    expect(tout.besoins.map((b) => b.statut)).toEqual(["signe"]);
    expect(tout.reponses[0]!.statutExtraction).toBe("lue");
    expect(tout.offres[0]!.bon!.livraison!.statut).toBe("prevue");
    expect(tout.negoceRetenu!.nom).toBe("Négoce d'épreuve");
    expect(tout.journal.map((j) => j.evenement)).toEqual(["negoce_retenu"]);
    expect(tout.accords[0]).toMatchObject({ email: "devis@example.com", adresseIp: "203.0.113.7", versionContrat: "2026-10-20" });
    expect(tout.facture).toMatchObject({ statut: "emise", montantHt: expect.anything() });
    expect(tout.facture!.numero).toBeGreaterThan(0);
    // Un seul accord par négoce et par lot ; une seule facture par lot.
    await expect(ctx.prisma.accordNegoce.create({ data: { lotId: lot.id, negoceId: negoce.id, versionContrat: "2026-10-20", tauxPourcent: "2.00", email: "x@example.com", adresseIp: "::1" } })).rejects.toThrow();
  });

  it("section 5 : un seul lot ouvert par référence et par zone ; le suivant s'ouvre quand le premier est parti", async () => {
    const data = { cle: "lib:bac acier|0.75mm|ral 7016", famille: "couverture", zone: "22", fenetreTot: jour("2026-11-02"), fenetreTard: jour("2026-11-20") };
    const premier = await ctx.prisma.lotGroupe.create({ data });
    await expect(ctx.prisma.lotGroupe.create({ data })).rejects.toThrow();
    // Une autre zone, ou la même zone pour une autre référence : un lot à part.
    await ctx.prisma.lotGroupe.create({ data: { ...data, zone: "29" } });
    await ctx.prisma.lotGroupe.create({ data: { ...data, cle: "lib:bac acier|0.75mm|ral 9006" } });
    await ctx.prisma.lotGroupe.update({ where: { id: premier.id }, data: { statut: "envoye", envoyeLe: new Date() } });
    await ctx.prisma.lotGroupe.create({ data });
  });

  it("un besoin par ligne de liste ; un négoce par e-mail et par département ; la base commune survit à l'artisan qui l'a nourrie", async () => {
    const { companyId, projectId } = await artisanAvecChantier("groupe-b@example.fr");
    const besoin = {
      companyId, projectId, takeoffId: "01900000-0000-7000-8000-000000000002", articleKey: "bac", designation: "Bac acier", cle: "lib:bac acier||",
      famille: "couverture", quantite: "31", unite: "u", zone: "22", adresseLivraison: "22300 Lannion", fenetreTot: jour("2026-11-02"), fenetreTard: jour("2026-11-20"), statut: "en_attente",
    };
    await ctx.prisma.besoin.create({ data: besoin });
    await expect(ctx.prisma.besoin.create({ data: besoin })).rejects.toThrow();
    const negoce = await ctx.prisma.negoce.create({ data: { nom: "Négoce B", email: "b@example.com", departement: "22", familles: ["couverture", "charpente"], ajouteParId: companyId } });
    await expect(ctx.prisma.negoce.create({ data: { nom: "Négoce B bis", email: "b@example.com", departement: "22" } })).rejects.toThrow();
    await ctx.prisma.negoce.create({ data: { nom: "Négoce B", email: "b@example.com", departement: "29" } });
    // L'entreprise part (RGPD) : ses besoins avec elle ; le négoce reste dans la base du département.
    await ctx.prisma.company.delete({ where: { id: companyId } });
    expect(await ctx.prisma.besoin.count()).toBe(0);
    expect((await ctx.prisma.negoce.findUniqueOrThrow({ where: { id: negoce.id } })).ajouteParId).toBeNull();
  });
});

describe("groupé, drapeau éteint", () => {
  it("toutes les routes du groupé répondent 404 : le groupé n'existe pas pour l'application", async () => {
    const { agent, projectId } = await artisanAvecChantier("eteint@example.fr");
    expect((await agent.get("/v1/groupe")).status).toBe(404);
    expect((await agent.post("/v1/groupe/siret")).status).toBe(404);
    expect((await agent.get(`/v1/projects/${projectId}/groupe`)).status).toBe(404);
    expect((await agent.post(`/v1/projects/${projectId}/groupe`).send({ articles: ["x"], fenetre: { tot: "2026-11-02", tard: "2026-11-20" }, statut: "en_attente" })).status).toBe(404);
  });
});
