/**
 * CODE POSTAL ↔ COMMUNE (Greg, 12 novembre 2026, dossier de corrections UX, point 4). Un code postal à plusieurs communes
 * les rend toutes (aucun choix arbitraire) ; une commune à plusieurs codes postaux rend une ligne par code ; le service de
 * l'État muet ou en panne ne bloque rien (liste vide) ; la route est réservée aux comptes connectés.
 */
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GeoApiCommunes } from "../src/platform/communes/communes.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
});

describe("annuaire des communes", () => {
  it("la route : un code à une commune, un code à plusieurs communes, un nom à plusieurs codes, rien sans compte", async () => {
    await request(ctx.app.getHttpServer()).get("/v1/communes?codePostal=22580").expect(401);
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toits A", ["roofing"]);
    expect((await agent.get("/v1/communes?codePostal=22580").expect(200)).body.items).toEqual([{ nom: "Plouha", codePostal: "22580" }]);
    expect((await agent.get("/v1/communes?codePostal=22300").expect(200)).body.items.map((c: { nom: string }) => c.nom)).toEqual(["Lannion", "Ploubezre", "Ploulec'h", "Rospez"]);
    expect((await agent.get("/v1/communes?nom=renn").expect(200)).body.items).toEqual([
      { nom: "Rennes", codePostal: "35000" },
      { nom: "Rennes", codePostal: "35200" },
      { nom: "Rennes", codePostal: "35700" },
    ]);
    expect((await agent.get("/v1/communes?nom=plouleC").expect(200)).body.items).toEqual([{ nom: "Ploulec'h", codePostal: "22300" }]);
    // Saisie incomplète, inconnue ou farfelue : une liste vide, jamais une erreur.
    for (const q of ["codePostal=2258", "codePostal=abcde", "codePostal=99999", "nom=p", "nom=", "nom=zzzz"]) expect((await agent.get(`/v1/communes?${q}`).expect(200)).body.items).toEqual([]);
  });

  it("l'annuaire de l'État : lu une fois puis gardé, trié, une ligne par code postal ; en panne, liste vide", async () => {
    const appels: string[] = [];
    const reponses: Record<string, unknown> = {
      "codePostal=22300": [{ nom: "Rospez", codesPostaux: ["22300"] }, { nom: "Lannion", codesPostaux: ["22300", "22303"] }, { nom: 12, codesPostaux: ["22300"] }],
      "nom=Rennes": [{ nom: "Rennes", codesPostaux: ["35000", "35200", "x"] }],
    };
    let panne = false;
    const annuaire = new GeoApiCommunes(async (url) => {
      appels.push(url);
      if (panne) throw new Error("réseau");
      const cle = Object.keys(reponses).find((k) => url.includes(k));
      return { ok: !!cle, json: async () => (cle ? reponses[cle] : null) };
    });
    expect(await annuaire.parCodePostal("22300")).toEqual([{ nom: "Lannion", codePostal: "22300" }, { nom: "Rospez", codePostal: "22300" }]);
    expect(await annuaire.parCodePostal("22300")).toHaveLength(2);
    expect(appels).toHaveLength(1);
    expect(appels[0]).toBe("https://geo.api.gouv.fr/communes?codePostal=22300&fields=nom,codesPostaux");
    expect(await annuaire.parNom("Rennes")).toEqual([{ nom: "Rennes", codePostal: "35000" }, { nom: "Rennes", codePostal: "35200" }]);
    expect(await annuaire.parCodePostal("2230")).toEqual([]);
    expect(await annuaire.parNom("r")).toEqual([]);
    expect(await annuaire.parCodePostal("75001")).toEqual([]);
    panne = true;
    expect(await annuaire.parCodePostal("29200")).toEqual([]);
    expect(await annuaire.parNom("Brest")).toEqual([]);
  });
});
