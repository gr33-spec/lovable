/**
 * Prompt maître point 11 (Greg, 6 novembre 2026) : Mobiiz lance des collectes de besoins sur quelques produits standards,
 * dans une zone pilote, avec leurs dates ; elles se voient dans « Découvrir » avant le premier besoin (les collectes
 * vides des artisans, non) ; un artisan les rejoint comme une autre ; seul l'admin les lance.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { ARDOISE, couvreurAvecListe } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const VARS = ["GROUPE", "GROUPE_ADMINS", "ZONES_ACTIVES", "MODE_REGROUPEMENT", "EMAIL_DOMAINE"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT;
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.ZONES_ACTIVES = "22";
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
const CAMPAGNE = { famille: "couverture", departement: "22", libelle: "Ardoise 32×22 · zone pilote Côtes-d'Armor", dateBesoin: jour(40) };

describe("les collectes lancées par Mobiiz", () => {
  it("l'admin lance une collecte ; elle se voit dans Découvrir avant le premier besoin, marquée « campagne »", async () => {
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: ARDOISE, quantite: "10", unite: "pièces" }]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const c = (await greg.agent.post("/v1/admin/pilotage/achats-groupes/campagnes").send(CAMPAGNE).expect(201)).body;
    expect(c).toMatchObject({ titre: CAMPAGNE.libelle, clotureLe: expect.any(String) });
    // Une collecte vide lancée par un artisan reste cachée ; celle de Mobiiz se voit.
    await ctx.prisma.regroupementNegocie.create({ data: { mode: "automatique", statut: "en_collecte", cle: "metier:couverture", libelle: "Vide d'un artisan", famille: "couverture", departement: "22", clotureLe: new Date(Date.now() + 6 * 86_400_000) } });
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "900", unite: "pièces" }]);
    const d = (await a.agent.get("/v1/achats-groupes/decouvrir").expect(200)).body;
    expect(d.achats).toEqual([expect.objectContaining({ id: c.id, titre: CAMPAGNE.libelle, campagne: true, entreprises: null })]);
    // Les gardes : famille non proposée, département inconnu, date trop proche.
    expect((await greg.agent.post("/v1/admin/pilotage/achats-groupes/campagnes").send({ ...CAMPAGNE, famille: "plomberie" })).status).toBe(400);
    expect((await greg.agent.post("/v1/admin/pilotage/achats-groupes/campagnes").send({ ...CAMPAGNE, departement: "99" })).status).toBe(400);
    expect((await greg.agent.post("/v1/admin/pilotage/achats-groupes/campagnes").send({ ...CAMPAGNE, dateBesoin: jour(1) })).status).toBe(400);
  });

  it("seul l'admin lance une collecte", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "900", unite: "pièces" }]);
    expect((await a.agent.post("/v1/admin/pilotage/achats-groupes/campagnes").send(CAMPAGNE)).status).toBe(403);
    expect(await ctx.prisma.regroupementNegocie.count()).toBe(0);
  });
});
