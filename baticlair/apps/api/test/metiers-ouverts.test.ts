/**
 * LOT C (Greg, 15 novembre 2026) : au lancement public, seuls Couverture et Peinture sont utilisables ; les autres métiers
 * restent visibles avec le badge « Bientôt ». Un seul réglage (`METIERS_OUVERTS`) : ouvrir un métier ne touche aucun écran.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const avant = { metiers: process.env.METIERS_OUVERTS, ag: process.env.ACHATS_GROUPES_V1 };
beforeAll(async () => {
  process.env.METIERS_OUVERTS = "couverture,peinture";
  process.env.ACHATS_GROUPES_V1 = "on";
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of [["METIERS_OUVERTS", avant.metiers], ["ACHATS_GROUPES_V1", avant.ag]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("métiers ouverts au lancement : Couverture et Peinture", () => {
  it("la santé dit le réglage ; le catalogue montre tous les métiers, les ouverts d'abord, les autres « Bientôt » ; un métier fermé ne s'ouvre pas par son adresse", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures", ["roofing"]);
    expect((await agent.get("/v1/health").expect(200)).body.features.metiersOuverts).toEqual(["couverture", "peinture"]);
    const c = (await agent.get("/v1/catalogue").expect(200)).body;
    const metiers = c.metiers as { code: string; ouvert: boolean }[];
    expect(metiers.filter((m) => m.ouvert).map((m) => m.code).sort()).toEqual(["couverture", "peinture"]);
    expect(metiers.slice(0, 2).every((m) => m.ouvert)).toBe(true);
    // Zinguerie et Étanchéité restent des métiers à part, visibles, « Bientôt ».
    for (const code of ["zinguerie", "etancheite", "electricite", "plomberie"]) expect(metiers.find((m) => m.code === code), code).toMatchObject({ ouvert: false });
    expect(metiers.length).toBeGreaterThanOrEqual(12);
    // Aucun cul-de-sac : demander un métier fermé ramène au premier métier utilisable.
    expect((await agent.get("/v1/catalogue?metier=electricite").expect(200)).body.metier).toBe("couverture");
    expect((await agent.get("/v1/catalogue?metier=peinture").expect(200)).body.metier).toBe("peinture");
  });

  it("achats groupés : seuls les produits d'un métier ouvert se publient ; les filtres disent « Bientôt » sous le nom du métier ; un produit fermé est refusé avec sa raison", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    await agent.patch("/v1/company/profile").send({ name: "Toitures B", address: "3 rue du Port, 22500 Paimpol", siret: null, phone: null, email: null }).expect(200);
    const etat = (await agent.get("/v1/ag/etat").expect(200)).body;
    const lots = new Set((etat.produits as { lot: string }[]).map((p) => p.lot));
    // Greg, 16 novembre 2026 : la peinture a ses produits en achat groupé (murs et plafonds, façade) ; métier ouvert, ils se publient.
    expect([...lots].sort()).toEqual(["couverture", "peinture"]);
    const filtres = etat.filtres as { id: string; libelle: string; ouvert: boolean }[];
    expect(filtres[0]).toEqual({ id: "couverture", libelle: "Couverture", ouvert: true });
    expect(filtres.find((f) => f.id === "zinguerie")).toEqual({ id: "zinguerie", libelle: "Zinguerie", ouvert: false });
    // Plus de libellé vague : « Isolation » et « Bois » portent le nom de leur métier.
    expect(filtres.find((f) => f.id === "isolation")?.libelle).toBe("Plâtrerie et isolation");
    expect(filtres.find((f) => f.id === "bois")?.libelle).toBe("Charpente");
    const jour = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
    const refus = await agent.post("/v1/ag/compatibilite").send({ type: "gouttiere", attributs: { matiere: "zinc", developpe: "33" }, reception: "livraison", dateBesoin: jour });
    expect(refus.status).toBe(400);
    expect(refus.body.error.details).toMatchObject({ reason: "metier_bientot", message: "Zinguerie : bientôt en achat groupé. Ce produit reste dans ton quantitatif." });
    expect((await agent.post("/v1/ag/compatibilite").send({ type: "ardoise", attributs: { format: "32x22", origine: "espagne", qualite: "1" }, reception: "livraison", dateBesoin: jour })).status).toBe(200);
  });
});
