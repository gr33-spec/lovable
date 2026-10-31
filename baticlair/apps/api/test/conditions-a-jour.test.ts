import request from "supertest";
import { afterAll, beforeAll, expect, it } from "vitest";
import { ARDOISE, couvreurAvecListe, jetonDeGrille, tacheDuMois } from "./support/cycle.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { inscrireNegoce } from "./support/negoce.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * VERSIONS MAJEURES DES CONDITIONS (Greg, 24 octobre 2026) : un négoce inscrit sous une version plus ancienne voit la
 * nouvelle sur sa page de grille et doit l'accepter avant de déposer ; l'acceptation est horodatée sur son compte.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [cle, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[cle];
    else process.env[cle] = v;
  }
});

it("un négoce sous l'ancienne version accepte la nouvelle avant de déposer, une fois, horodatée", { timeout: 60_000 }, async () => {
  const AVANT = "2026-10-10T08:00:00.000Z";
  const A = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }]);
  await A.agent.post(`/v1/groupe/negoces?maintenant=${AVANT}`).send({ nom: "Négoce N1", email: "n1@negoce.fr", familles: ["couverture"] }).expect(201);
  await inscrireNegoce(ctx, "n1@negoce.fr", { depot: "ZA de Kerverzot, 22300 Lannion", departements: ["22"], maintenant: AVANT });
  // Il avait accepté la version du 23 octobre.
  await ctx.prisma.compteNegoce.updateMany({ data: { conditionsVersion: "2026-10-23" } });
  await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${AVANT}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
  await tacheDuMois(ctx, "2026-10-15T10:01:00.000Z");
  const jeton = jetonDeGrille(ctx, "n1@negoce.fr");
  const srv = () => request(ctx.app.getHttpServer());
  expect((await srv().get(`/v1/grille/${jeton}?maintenant=2026-10-16T09:00:00.000Z`).expect(200)).body.conditionsAAccepter).toBe("2026-10-27");
  const pdf = Buffer.from(await makePdf(["devis"], [["A", ARDOISE, "2400 pièces", "0,90", ""]], "Total HT", "DEVIS"));
  const deposer = (conditions: boolean) =>
    srv()
      .post(`/v1/grille/${jeton}?maintenant=2026-10-16T09:00:00.000Z`)
      .field("fermes", "oui")
      .field("conditions", conditions ? "oui" : "non")
      .attach("file", pdf, { filename: "devis.pdf", contentType: "application/pdf" });
  const refus = await deposer(false);
  expect(refus.status).toBe(400);
  expect(JSON.stringify(refus.body)).toContain("conditions_requises");
  expect((await deposer(true)).status).toBe(201);
  const compte = await ctx.prisma.compteNegoce.findFirstOrThrow({ where: { email: "n1@negoce.fr" } });
  expect(compte.conditionsVersion).toBe("2026-10-27");
  expect(compte.conditionsAccepteesLe?.toISOString()).toBe("2026-10-16T09:00:00.000Z");
  expect((await srv().get(`/v1/grille/${jeton}?maintenant=2026-10-16T10:00:00.000Z`).expect(200)).body.conditionsAAccepter).toBeNull();
});
