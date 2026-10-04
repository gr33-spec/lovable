import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PLATRERIE_REFERENTIAL, ROOFING_REFERENTIAL } from "@baticlair/domain";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * UN MÉTIER = UN TIROIR (§22, lot du §44) : la porte /v1/quantitatifs choisit le référentiel selon le métier (champ
 * « metier », sinon le métier de l'entreprise). Un métier sans tiroir reçoit une erreur claire, jamais les règles du
 * couvreur. La plâtrerie garde rails, montants et entraxe en BROUILLON : jamais présentés comme une commande certaine.
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

type Q = { metier: string; version_referentiel: string; lignes: { libelle: string; quantite: number | null }[]; a_chiffrer: { libelle: string; raison: string }[]; hypotheses: { cle: string }[] };
const CLOISON = { lignes: [{ libelle: "Cloison 72/48 BA13 sur ossature", quantite: "40", unite: "m²" }] };

describe("la porte choisit le référentiel selon le métier", () => {
  it("un couvreur : référentiel couverture, comme avant", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Couverture en ardoises naturelles 30x22 posées au crochet", quantite: "200", unite: "m²" }] })).body as Q;
    expect(q).toMatchObject({ metier: "couverture", version_referentiel: ROOFING_REFERENTIAL.version });
  });

  it("un plaquiste (ou « metier: platrerie ») : référentiel plâtrerie ; plaques, vis, bande, enduit calculés (§16), rails et montants en brouillon, à chiffrer", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "p@example.fr", "Plâtres Le Gall", ["drywall"]);
    const q = (await agent.post("/v1/quantitatifs").send(CLOISON)).body as Q;
    expect(q).toMatchObject({ metier: "platrerie", version_referentiel: PLATRERIE_REFERENTIAL.version });
    const commande = q.lignes.map((l) => `${l.libelle} : ${l.quantite}`);
    // 40 m² × 2 faces × 1,10 ÷ 3 m² (BA13 1,20 × 2,50) = 30 plaques ; 80 m² × 15 = 1 200 vis ; × 2 = 160 ml de bande ; × 0,4 = 32 kg d'enduit.
    expect(commande).toEqual(expect.arrayContaining([expect.stringMatching(/BA13.* : 30$/), expect.stringMatching(/[Vv]is.* : 1200$/), expect.stringMatching(/[Bb]ande.* : 160$/), expect.stringMatching(/[Ee]nduit.* : 32$/)]));
    // Rails, montants, entraxe : chiffres d'usage non validés par un plaquiste → jamais dans « À commander ».
    expect(JSON.stringify(q.lignes)).not.toMatch(/[Rr]ail|[Mm]ontant/);
    expect(q.a_chiffrer.map((a) => a.libelle).join(" ")).toMatch(/[Rr]ail/);
    expect(q.a_chiffrer.map((a) => a.libelle).join(" ")).toMatch(/[Mm]ontant/);
    // Un couvreur qui précise « metier: platrerie » obtient le même tiroir.
    const roofer = await signUpWithCompany(ctx.app, "r@example.fr", "Toitures Martin");
    expect(((await roofer.agent.post("/v1/quantitatifs").send({ ...CLOISON, metier: "platrerie" })).body as Q).metier).toBe("platrerie");
  });

  it("un métier sans tiroir : 422 « no_referential », message clair, rien de créé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "e@example.fr", "Élec Bretagne", ["electrical"]);
    const res = await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Tableau électrique 2 rangées", quantite: "1", unite: "u" }] });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: "no_referential", details: { metier: "electrical", disponibles: ["couverture", "platrerie"] } });
    expect(JSON.stringify(res.body)).toContain("couverture, platrerie");
    expect(await ctx.prisma.quantitatif.count()).toBe(0);
    // Même chose quand un couvreur demande un métier sans tiroir.
    const roofer = await signUpWithCompany(ctx.app, "r@example.fr", "Toitures Martin");
    expect((await roofer.agent.post("/v1/quantitatifs").send({ ...CLOISON, metier: "electricite" })).status).toBe(422);
  });
});
