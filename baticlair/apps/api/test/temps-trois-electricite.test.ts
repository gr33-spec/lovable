import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * TEMPS TROIS, électricité (directive du fondateur, 2026-10-12 ; référentiel électricité, sections 2 et 3), par la porte
 * /v1/quantitatifs : « Prises 9 + 9 + 6 : une ligne 24, c'est le quantitatif. Garde la trace des trois lignes du devis
 * dans la raison de la ligne. » Les câbles et les gaines se commandent en couronnes de 100 m.
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

type Q = { metier: string; lignes: { libelle: string; quantite: number | null; unite: string; precision?: string | null }[] };

describe("temps trois : les points d'un devis d'électricité, additionnés et convertis", () => {
  it("trois lignes de prises (9 + 9 + 6) font une ligne de 24 prises, avec la trace des lignes ; le câble en couronnes", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "e@example.fr", "Élec Armor", ["electrical"]);
    const prise = (quantite: string) => ({ libelle: "Prise de courant 16A 2P+T", quantite, unite: "u" });
    const res = await agent.post("/v1/quantitatifs").send({ lignes: [prise("9"), { libelle: "Tableau électrique 3 rangées", quantite: "1", unite: "u" }, prise("9"), prise("6")] });
    expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
    const q = res.body as Q;
    expect(q.metier).toBe("electricite");
    const prises = q.lignes.filter((l) => /^Prise 2P\+T 16 A/.test(l.libelle));
    expect(prises).toHaveLength(1);
    expect(prises[0]).toMatchObject({ quantite: 24 });
    expect((prises[0] as unknown as { explication: { phrase: string } }).explication.phrase).toBe("24 pièces = 9 + 9 + 6, lignes 1, 3 et 4 du devis");
    expect(q.lignes.filter((l) => l.libelle === "Prise de courant 16A 2P+T")).toEqual([]);
    const cable = q.lignes.find((l) => /3G2,5/.test(l.libelle))!;
    expect(cable).toMatchObject({ quantite: 2 });
    expect(cable.unite).toMatch(/couronnes de 100 m/);
  });
});
