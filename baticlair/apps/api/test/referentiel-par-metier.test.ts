import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CARRELAGE_REFERENTIAL, MACONNERIE_REFERENTIAL, METIER_NAMES, PEINTURE_REFERENTIAL, PLATRERIE_REFERENTIAL, REFERENTIALS, ROOFING_REFERENTIAL } from "@baticlair/domain";
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
// §49.1 : les rails et montants n'existent que s'ils sont écrits ; vis, bande et enduit sont des consommables (sur le « oui »).
const CLOISON = { lignes: [{ libelle: "Cloison 72/48 BA13 sur ossature, rails et montants, hauteur 2,50 m", quantite: "40", unite: "m²" }] };

describe("la porte choisit le référentiel selon le métier", () => {
  it("un couvreur : référentiel couverture, comme avant", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Couverture en ardoises naturelles 30x22 posées au crochet", quantite: "200", unite: "m²" }] })).body as Q;
    expect(q).toMatchObject({ metier: "couverture", version_referentiel: ROOFING_REFERENTIAL.version });
  });

  it("un plaquiste (ou « metier: platrerie ») : référentiel plâtrerie ; plaques calculées (§16), rails et montants écrits « à vérifier », orange (§47.1) ; vis, bande, enduit sur le « oui » consommables", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "p@example.fr", "Plâtres Le Gall", ["drywall"]);
    const q = (await agent.post("/v1/quantitatifs").send(CLOISON)).body as Q;
    expect(q).toMatchObject({ metier: "platrerie", version_referentiel: PLATRERIE_REFERENTIAL.version });
    const commande = q.lignes.map((l) => `${l.libelle} : ${l.quantite}`);
    // 40 m² × 2 faces × 1,10 ÷ 3 m² (BA13 1,20 × 2,50) = 30 plaques.
    expect(commande).toEqual(expect.arrayContaining([expect.stringMatching(/BA13.* : 30$/)]));
    expect(commande.filter((l) => /[Vv]is|[Bb]ande|[Ee]nduit/.test(l))).toEqual([]);
    // Rails, montants : chiffres d'usage non validés par un plaquiste → calculés, mais « Quantité à confirmer » (§47.1, §47.3).
    const rails = q.lignes.find((l) => /[Rr]ail/.test(l.libelle))!;
    const montants = q.lignes.find((l) => /[Mm]ontant/.test(l.libelle))!;
    expect(rails).toMatchObject({ a_confirmer: true, raison: expect.stringMatching(/Quantité à confirmer : /) });
    expect(montants).toMatchObject({ a_confirmer: true, raison: expect.stringMatching(/Quantité à confirmer : /) });
    expect(q.lignes.find((l) => /BA13/.test(l.libelle))).toMatchObject({ a_confirmer: false });
    // Un couvreur qui précise « metier: platrerie » obtient le même tiroir.
    const roofer = await signUpWithCompany(ctx.app, "r@example.fr", "Toitures Martin");
    expect(((await roofer.agent.post("/v1/quantitatifs").send({ ...CLOISON, metier: "platrerie" })).body as Q).metier).toBe("platrerie");
  });

  it("lot B, paquet 1 : carrelage, peinture, maçonnerie ont leur tiroir ; chaque ligne calculée sort avec son chiffre, orange si sa règle est à confirmer", async () => {
    const cas = [
      { trade: "tiling", metier: "carrelage", ref: CARRELAGE_REFERENTIAL, ligne: { libelle: "Carrelage sol grès cérame 60x60 rectifié", quantite: "42", unite: "m²" }, article: /60×60/ },
      { trade: "painting", metier: "peinture", ref: PEINTURE_REFERENTIAL, ligne: { libelle: "Peinture plafonds mate, impression + 2 couches", quantite: "85", unite: "m²" }, article: /[Pp]einture/ },
      { trade: "masonry", metier: "maconnerie", ref: MACONNERIE_REFERENTIAL, ligne: { libelle: "Chape ciment 5 cm", quantite: "35", unite: "m²" }, article: /[Cc]hape/ },
    ];
    for (const c of cas) {
      const { agent } = await signUpWithCompany(ctx.app, `${c.trade}@example.fr`, `Entreprise ${c.metier}`, [c.trade]);
      const q = (await agent.post("/v1/quantitatifs").send({ lignes: [c.ligne] })).body as Q;
      expect(q, c.metier).toMatchObject({ metier: c.metier, version_referentiel: c.ref.version });
      const l = q.lignes.find((x) => c.article.test(x.libelle))!;
      expect(l.quantite, c.metier).toBeGreaterThan(0);
      if (l.a_confirmer) expect(l.raison).toMatch(/(Quantité|Valeur par défaut) à confirmer : \S/);
    }
  });

  it("rien ne part vide ni avec une question ouverte, dans aucun métier", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "pe@example.fr", "Peintures Le Bihan", ["painting"]);
    // La finition et l'impression ne sont pas dites : deux questions du comptoir, aucune ligne calculée encore.
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Peinture murs séjour, 2 couches", quantite: "85", unite: "m²" }] })).body as Q & { peut_partir: boolean; questions: unknown[] };
    expect(q.questions.length).toBeGreaterThan(0);
    expect(q.peut_partir).toBe(false);
  });

  it("un métier sans tiroir : 422 « no_referential », message clair, rien de créé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "s@example.fr", "Sols Bretagne", ["flooring"]);
    const res = await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Sol vinyle en lames", quantite: "30", unite: "m²" }] });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({
      code: "no_referential",
      details: {
        metier: "flooring",
        // Tous les tiroirs ouverts, dans l'ordre du registre (le lot B en ajoute par paquets).
        disponibles: REFERENTIALS.map((r) => METIER_NAMES[r.trade]),
      },
    });
    expect(JSON.stringify(res.body)).toContain("couverture, platrerie");
    expect(await ctx.prisma.quantitatif.count()).toBe(0);
    // Même chose quand un couvreur demande un métier sans tiroir.
    const roofer = await signUpWithCompany(ctx.app, "r@example.fr", "Toitures Martin");
    expect((await roofer.agent.post("/v1/quantitatifs").send({ ...CLOISON, metier: "sols" })).status).toBe(422);
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
