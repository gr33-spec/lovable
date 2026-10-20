import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { jetonDeLien } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 3 : LA BASE DES NÉGOCES (document du fondateur, 2026-10-19, section 2 étape 3, section 5).
 * L'artisan saisit l'e-mail de ses négoces, le favori en premier, et coche ce que chacun vend (neuf familles) ; chaque
 * négoce rejoint la base commune du département, sans doublon. Dans chaque e-mail, « pas concerné » décoche la famille et
 * « stop » désinscrit, par un lien signé, sans compte, confirmé sur une page (jamais au simple chargement du lien).
 */
let ctx: TestContext;
const SECRET = "test-secret-test-secret-test-secret-000";
const avant = process.env.GROUPE;
beforeAll(async () => {
  process.env.GROUPE = "on";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

type Negoce = { id: string; nom: string; email: string; departement: string; familles: string[]; favori: boolean; numeroCompte: string | null; stop: boolean };

async function artisan(email: string, entreprise: string, adresse: string | null = "3 rue des Ajoncs, 22300 Lannion") {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, entreprise);
  if (adresse) await agent.patch("/v1/company/profile").send({ name: entreprise, address: adresse, siret: null, phone: null, email: null }).expect(200);
  return { agent, companyId };
}
const ajouter = async (agent: Agent, body: object) => (await agent.post("/v1/groupe/negoces").send(body).expect(201)).body.negoces as Negoce[];

describe("groupé, étape 3 : la base des négoces", () => {
  it("le favori en premier ; le département vient de l'adresse de l'entreprise ; un autre favori passe devant", async () => {
    const { agent } = await artisan("a@example.fr", "Toitures A");
    await ajouter(agent, { nom: "Négoce Ardoises", email: "Ardoises@Example.com", familles: ["couverture"], numeroCompte: "C-12" });
    let liste = await ajouter(agent, { nom: "Négoce Généraliste", email: "general@example.com", familles: ["couverture", "maconnerie", "second_oeuvre"] });
    expect(liste.map((n) => [n.nom, n.favori, n.departement])).toEqual([
      ["Négoce Ardoises", true, "22"],
      ["Négoce Généraliste", false, "22"],
    ]);
    expect(liste[0]).toMatchObject({ email: "ardoises@example.com", numeroCompte: "C-12", familles: ["couverture"] });
    liste = (await agent.patch(`/v1/groupe/negoces/${liste[1]!.id}`).send({ favori: true }).expect(200)).body.negoces;
    expect(liste.map((n) => n.nom)).toEqual(["Négoce Généraliste", "Négoce Ardoises"]);
  });

  it("base commune du département : le même négoce ajouté par deux artisans n'est qu'un, ses familles s'additionnent", async () => {
    const a = await artisan("a@example.fr", "Toitures A");
    const b = await artisan("b@example.fr", "Plomberie B", "8 rue du Port, 22500 Paimpol");
    await ajouter(a.agent, { nom: "Point d'épreuve", email: "agence22@example.com", familles: ["couverture"] });
    const [n] = await ajouter(b.agent, { nom: "Point d'épreuve Paimpol", email: "agence22@example.com", familles: ["plomberie"] });
    expect(await ctx.prisma.negoce.count()).toBe(1);
    expect(n!.familles).toEqual(["couverture", "plomberie"]);
    // Le même, deux fois dans ma liste : non.
    expect((await a.agent.post("/v1/groupe/negoces").send({ nom: "Point d'épreuve", email: "agence22@example.com", familles: ["couverture"] })).status).toBe(409);
    // Le retirer de ma liste : il reste dans la base (l'autre artisan l'a).
    await a.agent.delete(`/v1/groupe/negoces/${n!.id}`).expect(200);
    expect((await a.agent.get("/v1/groupe/negoces").expect(200)).body.negoces).toEqual([]);
    expect((await b.agent.get("/v1/groupe/negoces").expect(200)).body.negoces).toHaveLength(1);
  });

  it("sans adresse d'entreprise, le département se donne ; au moins une famille ; le message type nomme l'entreprise", async () => {
    const { agent } = await artisan("c@example.fr", "Charpentes C", null);
    expect((await agent.post("/v1/groupe/negoces").send({ nom: "N", email: "n@example.com", familles: ["charpente"] })).body.error.details).toMatchObject({ reason: "departement_requis" });
    expect((await agent.post("/v1/groupe/negoces").send({ nom: "N", email: "n@example.com", familles: [], departement: "29" })).status).toBe(400);
    expect((await agent.post("/v1/groupe/negoces").send({ nom: "N", email: "n@example.com", familles: ["inconnue"], departement: "29" })).status).toBe(400);
    expect((await ajouter(agent, { nom: "N", email: "n@example.com", familles: ["charpente"], departement: "29" }))[0]!.departement).toBe("29");
    const { message } = (await agent.get("/v1/groupe/negoces/message").expect(200)).body as { message: string };
    expect(message).toContain("Charpentes C");
    expect(message).toContain("pas concerné");
  });

  it("« pas concerné » et « stop » : un lien signé, lu avant d'agir, confirmé sur la page ; rejoué, rien ne change ; falsifié, refusé", async () => {
    const { agent } = await artisan("d@example.fr", "Toitures D");
    const [n] = await ajouter(agent, { nom: "Négoce Généraliste", email: "general@example.com", familles: ["couverture", "plomberie"] });
    const anon = request(ctx.app.getHttpServer());
    const pasConcerne = jetonDeLien(SECRET, { action: "pas_concerne", negoceId: n!.id, famille: "plomberie" });
    // Lire le lien (la page) ne décoche rien.
    expect((await anon.post("/v1/negoces/lien/apercu").send({ jeton: pasConcerne }).expect(200)).body).toEqual({ action: "pas_concerne", negoce: "Négoce Généraliste", famille: "Plomberie", fait: false });
    expect((await ctx.prisma.negoce.findUniqueOrThrow({ where: { id: n!.id } })).familles).toEqual(["couverture", "plomberie"]);
    expect((await anon.post("/v1/negoces/lien").send({ jeton: pasConcerne }).expect(200)).body.fait).toBe(true);
    expect((await ctx.prisma.negoce.findUniqueOrThrow({ where: { id: n!.id } })).familles).toEqual(["couverture"]);
    await anon.post("/v1/negoces/lien").send({ jeton: pasConcerne }).expect(200);
    expect((await ctx.prisma.negoce.findUniqueOrThrow({ where: { id: n!.id } })).familles).toEqual(["couverture"]);
    // « Stop » : désinscrit ; l'artisan le voit.
    await anon.post("/v1/negoces/lien").send({ jeton: jetonDeLien(SECRET, { action: "stop", negoceId: n!.id }) }).expect(200);
    expect((await agent.get("/v1/groupe/negoces").expect(200)).body.negoces[0].stop).toBe(true);
    // Un jeton signé avec un autre secret, ou modifié, ne fait rien.
    expect((await anon.post("/v1/negoces/lien").send({ jeton: jetonDeLien("autre-secret-autre-secret-autre", { action: "stop", negoceId: n!.id }) })).status).toBe(404);
    const [corps, sig] = pasConcerne.split(".");
    const autre = Buffer.from(JSON.stringify({ a: "pas_concerne", n: n!.id, f: "couverture" })).toString("base64url");
    expect((await anon.post("/v1/negoces/lien").send({ jeton: `${autre}.${sig}` })).status).toBe(404);
    expect(corps).not.toBe(autre);
    expect((await ctx.prisma.negoce.findUniqueOrThrow({ where: { id: n!.id } })).familles).toEqual(["couverture"]);
  });

  it("isolation : un artisan ne modifie ni ne retire un négoce qui n'est pas dans sa liste", async () => {
    const a = await artisan("e@example.fr", "Toitures E");
    const [n] = await ajouter(a.agent, { nom: "Négoce E", email: "e-negoce@example.com", familles: ["couverture"], numeroCompte: "E-1" });
    const b = await artisan("f@example.fr", "Toitures F");
    expect((await b.agent.patch(`/v1/groupe/negoces/${n!.id}`).send({ familles: ["plomberie"], numeroCompte: "vole" })).status).toBe(404);
    expect((await b.agent.delete(`/v1/groupe/negoces/${n!.id}`)).status).toBe(404);
    expect((await a.agent.get("/v1/groupe/negoces").expect(200)).body.negoces[0]).toMatchObject({ familles: ["couverture"], numeroCompte: "E-1" });
  });
});
