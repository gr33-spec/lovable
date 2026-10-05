import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PLATRERIE_REFERENTIAL, ROOFING_REFERENTIAL } from "@baticlair/domain";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * UN MÉTIER = UN TIROIR (§22, lot du §44) : la porte /v1/quantitatifs choisit le référentiel selon le métier (champ
 * « metier », sinon le métier de l'entreprise). Un métier sans tiroir reçoit une erreur claire, jamais les règles du
 * couvreur. La plâtrerie garde rails, montants et entraxe « à vérifier » (§47.1) : calculés, mais ORANGE, « Quantité à
 * confirmer », jamais présentés comme une commande certaine.
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

type Q = { metier: string; version_referentiel: string; lignes: { libelle: string; quantite: number | null; a_confirmer: boolean; raison?: string }[]; a_chiffrer: { libelle: string; raison: string }[]; hypotheses: { cle: string }[] };
const CLOISON = { lignes: [{ libelle: "Cloison 72/48 BA13 sur ossature", quantite: "40", unite: "m²" }] };

describe("la porte choisit le référentiel selon le métier", () => {
  it("un couvreur : référentiel couverture, comme avant", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Couverture en ardoises naturelles 30x22 posées au crochet", quantite: "200", unite: "m²" }] })).body as Q;
    expect(q).toMatchObject({ metier: "couverture", version_referentiel: ROOFING_REFERENTIAL.version });
  });

  it("un plaquiste (ou « metier: platrerie ») : référentiel plâtrerie ; plaques, vis, bande, enduit calculés (§16), rails et montants « à vérifier », orange (§47.1)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "p@example.fr", "Plâtres Le Gall", ["drywall"]);
    const q = (await agent.post("/v1/quantitatifs").send(CLOISON)).body as Q;
    expect(q).toMatchObject({ metier: "platrerie", version_referentiel: PLATRERIE_REFERENTIAL.version });
    const commande = q.lignes.map((l) => `${l.libelle} : ${l.quantite}`);
    // 40 m² × 2 faces × 1,10 ÷ 3 m² (BA13 1,20 × 2,50) = 30 plaques ; 80 m² × 15 = 1 200 vis ; × 2 = 160 ml de bande ; × 0,4 = 32 kg d'enduit.
    expect(commande).toEqual(expect.arrayContaining([expect.stringMatching(/BA13.* : 30$/), expect.stringMatching(/[Vv]is.* : 1200$/), expect.stringMatching(/[Bb]ande.* : 160$/), expect.stringMatching(/[Ee]nduit.* : 32$/)]));
    // Rails, montants : chiffres d'usage non validés par un plaquiste → calculés, mais « Quantité à confirmer » (§47.1, §47.3).
    const rails = q.lignes.find((l) => /[Rr]ail/.test(l.libelle))!;
    const montants = q.lignes.find((l) => /[Mm]ontant/.test(l.libelle))!;
    expect(rails).toMatchObject({ a_confirmer: true, raison: expect.stringMatching(/^Quantité à confirmer : /) });
    expect(montants).toMatchObject({ a_confirmer: true, raison: expect.stringMatching(/^Quantité à confirmer : /) });
    expect(q.lignes.find((l) => /BA13/.test(l.libelle))).toMatchObject({ a_confirmer: false });
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

describe("le métier du chantier, choisi à la création quand le devis ne le dit pas", () => {
  it("un couvreur crée un chantier de plâtrerie : le chantier garde son métier ; un métier inconnu est ignoré", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "r@example.fr", "Toitures Martin");
    const created = (await agent.post("/v1/projects").send({ name: "Cloisons Dupont", trade: "drywall" })).body as { id: string; trade: string | null };
    expect(created.trade).toBe("drywall");
    expect(((await agent.get(`/v1/projects/${created.id}`)).body as { trade: string | null }).trade).toBe("drywall");
    expect(((await agent.post("/v1/projects").send({ name: "Autre", trade: "astronaute" })).body as { trade: string | null }).trade).toBeNull();
    expect(((await agent.post("/v1/projects").send({ name: "Sans métier" })).body as { trade: string | null }).trade).toBeNull();
  });
});
