import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { SIRENE_HTTP, type SireneHttp } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LA BASE NÉGOCES PRÉREMPLIE (plan du 20 octobre 2026, bloc 3) : l'API Sirene (NAF 46.73A/B, 47.52A/B, départements
 * 22/29/35/56) remplit `negoce_sirene` par la tâche mensuelle ; « Mes négoces » suggère dès trois lettres, le département
 * de l'entreprise d'abord, avec la source « Sirene » et la date d'import. Sirene n'a pas d'e-mail : rien ne part sans lui.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, INSEE_API_KEY: process.env.INSEE_API_KEY, CRON_SECRET: process.env.CRON_SECRET, SIRENE_DEPARTEMENTS: process.env.SIRENE_DEPARTEMENTS, SIRENE_NAF: process.env.SIRENE_NAF };
const appels: string[] = [];
const etab = (siret: string, nom: string, cp: string, commune: string, naf: string, enseigne?: string) => ({
  siret,
  siren: siret.slice(0, 9),
  uniteLegale: { denominationUniteLegale: nom },
  adresseEtablissement: { numeroVoieEtablissement: "12", typeVoieEtablissement: "RUE", libelleVoieEtablissement: "DE LA GARE", codePostalEtablissement: cp, libelleCommuneEtablissement: commune },
  periodesEtablissement: [{ enseigne1Etablissement: enseigne ?? null, activitePrincipaleEtablissement: naf, etatAdministratifEtablissement: "A" }],
});
/** Deux pages pour le 22 en 46.73A (curseur), une pour le 29, rien ailleurs. */
const fauxSirene: SireneHttp = async (url) => {
  appels.push(url);
  const u = new URL(url);
  const q = u.searchParams.get("q") ?? "";
  const curseur = u.searchParams.get("curseur");
  const page = (etablissements: unknown[], suivant: string) => ({ status: 200, ok: true, json: async () => ({ header: { curseur, curseurSuivant: suivant }, etablissements }) });
  if (q.includes("46.73A") && q.includes("codePostalEtablissement:22*")) {
    if (curseur === "*") return page([etab("11111111100011", "POINT P LANNION", "22300", "LANNION", "46.73A"), etab("22222222200022", "GEDIMAT TREGOR", "22300", "LANNION", "46.73A", "GEDIMAT")], "page2");
    return page([etab("33333333300033", "BIG MAT PAIMPOL", "22500", "PAIMPOL", "46.73A")], "page2");
  }
  if (q.includes("47.52B") && q.includes("codePostalEtablissement:29*")) return page([etab("44444444400044", "POINT P BREST", "29200", "BREST", "47.52B")], "*");
  return { status: 404, ok: false, json: async () => ({}) };
};
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.INSEE_API_KEY = "cle-de-test";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.SIRENE_DEPARTEMENTS = "22,29";
  process.env.SIRENE_NAF = "46.73A,47.52B";
  ctx = await createTestApp((b) => b.overrideProvider(SIRENE_HTTP).useValue(fauxSirene));
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  appels.length = 0;
});

describe("groupé, base négoces Sirene", { timeout: 30_000 }, () => {
  it("la tâche importe page par page, département × NAF, et suggère dès trois lettres, le département de l'artisan d'abord", async () => {
    const anon = request(ctx.app.getHttpServer());
    expect((await anon.get("/v1/internal/groupe/sirene")).status).toBe(403);
    const r = (await anon.get("/v1/internal/groupe/sirene").set("authorization", "Bearer secret-de-la-tache").expect(200)).body;
    expect(r).toEqual({ importes: 4, departements: ["22", "29"], disponible: true });
    // 2 départements × 2 NAF = 4 requêtes, plus la deuxième page du 22 en 46.73A.
    expect(appels).toHaveLength(5);
    expect(appels[0]).toContain("nombre=1000");
    const lignes = await ctx.prisma.negoceSirene.findMany({ orderBy: { siret: "asc" } });
    expect(lignes.map((l) => [l.nom, l.departement, l.naf, l.adresse, l.commune])).toEqual([
      ["Point P Lannion", "22", "46.73A", "12 RUE DE LA GARE", "Lannion"],
      ["Gedimat", "22", "46.73A", "12 RUE DE LA GARE", "Lannion"],
      ["Big Mat Paimpol", "22", "46.73A", "12 RUE DE LA GARE", "Paimpol"],
      ["Point P Brest", "29", "47.52B", "12 RUE DE LA GARE", "Brest"],
    ]);
    // Un deuxième import met à jour sans doublon.
    await anon.get("/v1/internal/groupe/sirene").set("authorization", "Bearer secret-de-la-tache").expect(200);
    expect(await ctx.prisma.negoceSirene.count()).toBe(4);

    const { agent } = await signUpWithCompany(ctx.app, "sirene@example.fr", "Toitures Sirene");
    await agent.patch("/v1/company/profile").send({ name: "Toitures Sirene", address: "3 rue des Ajoncs, 29200 Brest", siret: null, phone: null, email: null }).expect(200);
    expect((await agent.get("/v1/groupe/negoces/suggestions?q=po")).status).toBe(400);
    const s = (await agent.get("/v1/groupe/negoces/suggestions?q=poi").expect(200)).body.suggestions as { nom: string; departement: string; source: string; importeLe: string; siret: string }[];
    // Le 29 (l'entreprise) d'abord, puis le 22 ; source et date d'import dites.
    expect(s.map((x) => [x.nom, x.departement, x.source])).toEqual([
      ["Point P Brest", "29", "Sirene"],
      ["Point P Lannion", "22", "Sirene"],
    ]);
    expect(s[0]!.importeLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s[0]!.siret).toBe("44444444400044");
    expect((await agent.get("/v1/groupe/negoces/suggestions?q=zzz").expect(200)).body.suggestions).toEqual([]);
  });
});
