import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";
import { inscrireNegoce } from "./support/negoce.js";
import { exclure } from "../src/modules/privacy/application/exclusion.js";

/**
 * « METS TON NÉGOCE DANS LA BOUCLE » (Greg, 23 octobre 2026) : sur l'accueil et dans l'onglet Commande commune, un champ
 * e-mail (ou le nom choisi dans Sirene) et un bouton « Ajouter mon négoce ». Le négoce entre dans la base couverture du
 * département, dédoublonné par SIRET ou par e-mail ; ajouté avant la clôture, il reçoit la commande du mois en cours ;
 * ajouté après, la suivante. L'artisan lit « Ton négoce X est dans la boucle ».
 */
let ctx: TestContext;
const avant = process.env.GROUPE;
const avantSecret = process.env.CRON_SECRET;
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
  if (avantSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = avantSecret;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

// Le 10 octobre 2026 à 9 h (Paris) : inscriptions ouvertes, clôture le 15 à 12 h ; la limite des négoces le 22 octobre.
const T0 = "2026-10-10T07:00:00.000Z";
const APRES_CLOTURE = "2026-10-15T10:00:00.000Z";
const SIRET = "73282932000074";

async function couvreur(email: string, nom: string, adresse: string | null = "3 rue des Ajoncs, 22300 Lannion") {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["roofing"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: SIRET, siretVerifieLe: new Date() } });
  if (adresse) await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: SIRET, phone: null, email: null }).expect(200);
  return { agent, companyId };
}
const boucle = (agent: request.Agent, body: object, maintenant = T0) => agent.post(`/v1/groupe/negoces/boucle?maintenant=${maintenant}`).send(body);
const tache = (maintenant: string) => request(ctx.app.getHttpServer()).get(`/v1/internal/commande-du-mois?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", `Bearer ${process.env.CRON_SECRET}`).expect(200);
const mailsVers = (email: string) => ctx.emails.sent.filter((m) => m.to === email);

describe("mets ton négoce dans la boucle", { timeout: 60_000 }, () => {
  it("un négoce qui a demandé à ne plus être contacté : la réponse le dit, rien ne lui part (retour de Greg, 24 octobre 2026)", async () => {
    const { agent } = await couvreur("a@example.fr", "Toitures A");
    await exclure(ctx.prisma as never, { email: "stop@negoce.fr" }, "opposition");
    const r = await boucle(agent, { email: "stop@negoce.fr", nom: "Calipro" }).expect(200);
    expect(r.body).toMatchObject({ negoce: { nom: "Calipro", email: "stop@negoce.fr" }, exclu: true, lienInvitation: null });
    expect(mailsVers("stop@negoce.fr")).toHaveLength(0);
    expect((await boucle(agent, { email: "ouvert@negoce.fr" }).expect(200)).body.exclu).toBe(false);
  });

  it("un e-mail, un bouton : le négoce entre dans la base couverture du département et dans ma liste, la réponse dit la commande qu'il recevra", async () => {
    const { agent } = await couvreur("a@example.fr", "Toitures A");
    const r = await boucle(agent, { email: "Agence.Lannion@Negoce-Ardoises.fr" }).expect(200);
    expect(r.body).toMatchObject({ negoce: { nom: "negoce-ardoises.fr", email: "agence.lannion@negoce-ardoises.fr", departement: "22" }, dejaLa: false, mois: { mois: "2026-10-15", de: "du 15 octobre" } });
    const liste = (await agent.get("/v1/groupe/negoces").expect(200)).body.negoces;
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ email: "agence.lannion@negoce-ardoises.fr", familles: ["couverture"], favori: true });
    // L'invitation à créer son accès part au négoce (espace négoce, 23 octobre) ; la réponse porte le même lien.
    expect(mailsVers("agence.lannion@negoce-ardoises.fr")).toHaveLength(1);
    expect(mailsVers("agence.lannion@negoce-ardoises.fr")[0]!.text).toContain("Créez votre accès en une minute");
    expect(r.body.lienInvitation).toMatch(/\/negoce\/rejoindre\//);
    expect(mailsVers("agence.lannion@negoce-ardoises.fr")[0]!.text).toContain(r.body.lienInvitation);
    // Rappuyer : rien ne change, la réponse le dit quand même.
    const r2 = await boucle(agent, { email: "agence.lannion@negoce-ardoises.fr" }).expect(200);
    expect(r2.body).toMatchObject({ negoce: { email: "agence.lannion@negoce-ardoises.fr" }, dejaLa: true });
    expect(await ctx.prisma.negoce.count()).toBe(1);
  });

  it("choisi dans Sirene : le nom et le SIRET viennent de la base ; dédoublonnage par SIRET puis par e-mail", async () => {
    await ctx.prisma.negoceSirene.create({ data: { siret: "12345678900011", siren: "123456789", nom: "POINT D'EPREUVE LANNION", adresse: "ZA de Kerampont", codePostal: "22300", commune: "LANNION", departement: "22", naf: "46.73A", importeLe: new Date() } });
    const a = await couvreur("a@example.fr", "Toitures A");
    const b = await couvreur("b@example.fr", "Toitures B", "8 rue du Port, 22500 Paimpol");
    const r = await boucle(a.agent, { email: "lannion@pointdepreuve.fr", siret: "12345678900011" }).expect(200);
    expect(r.body.negoce).toMatchObject({ nom: "POINT D'EPREUVE LANNION", email: "lannion@pointdepreuve.fr", departement: "22" });
    // B donne le même SIRET avec un autre e-mail (celui de son vendeur) : le même négoce, pas un deuxième.
    const rb = await boucle(b.agent, { email: "vendeur@pointdepreuve.fr", siret: "12345678900011" }).expect(200);
    expect(rb.body.negoce.id).toBe(r.body.negoce.id);
    expect(rb.body.negoce.email).toBe("lannion@pointdepreuve.fr");
    expect(await ctx.prisma.negoce.count()).toBe(1);
    // Un troisième artisan donne seulement l'e-mail : retrouvé par e-mail, le SIRET reste.
    const c = await couvreur("c@example.fr", "Toitures C", "1 rue du Stade, 22300 Lannion");
    const rc = await boucle(c.agent, { email: "LANNION@pointdepreuve.fr" }).expect(200);
    expect(rc.body.negoce.id).toBe(r.body.negoce.id);
    expect(await ctx.prisma.negoce.count()).toBe(1);
    expect((await ctx.prisma.negoce.findFirstOrThrow()).siret).toBe("12345678900011");
    // Un ancien négoce (sans SIRET) retrouvé par e-mail gagne le SIRET donné ensuite.
    await a.agent.post(`/v1/groupe/negoces?maintenant=${T0}`).send({ nom: "Négoce Généraliste", email: "general@example.com", familles: ["couverture"] }).expect(201);
    await boucle(b.agent, { email: "general@example.com", siret: SIRET }).expect(200);
    expect((await ctx.prisma.negoce.findFirstOrThrow({ where: { email: "general@example.com" } })).siret).toBe(SIRET);
  });

  it("sans département connu (pas d'adresse), la réponse dit « departement_requis » ; un e-mail faux est refusé", async () => {
    const { agent } = await couvreur("a@example.fr", "Toitures A", null);
    const r = await boucle(agent, { email: "n@example.com" }).expect(400);
    expect(r.body.error.details).toMatchObject({ reason: "departement_requis" });
    await boucle(agent, { email: "pas-un-email" }).expect(400);
    await boucle(agent, { email: "n@example.com", siret: "123" }).expect(400);
  });

  it("ajouté avant la clôture, le négoce reçoit la commande du mois en cours ; ajouté après, il attend la suivante", async () => {
    const { agent, companyId } = await couvreur("a@example.fr", "Toitures A");
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "2000", unite: "pièces" }] }).expect(201)).body as { projetId: string };
    await agent.patch(`/v1/projects/${q.projetId}`).send({ address: "3 rue des Ajoncs, 22300 Lannion" }).expect(200);
    const articles = ((await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string }[]).map((b) => b.key);
    await agent.post(`/v1/projects/${q.projetId}/commande-du-mois?maintenant=${T0}`).send({ articles, nature: "chantier" }).expect(201);
    // Avant la clôture : « avant ».
    await boucle(agent, { email: "avant@example.com" }, "2026-10-12T09:00:00.000Z").expect(200);
    await inscrireNegoce(ctx, "avant@example.com", { depot: "Zone de Kerampont, 22300 Lannion", maintenant: "2026-10-12T10:00:00.000Z" });
    // La clôture : la grille part au seul négoce connu.
    expect((await tache(APRES_CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 1 });
    expect(mailsVers("avant@example.com").filter((m) => /\/grille\//.test(m.text))).toHaveLength(1);
    // Après la clôture, pendant les jours des négoces : « après » est ajouté ; la réponse annonce le 1er novembre.
    const r = await boucle(agent, { email: "apres@example.com" }, "2026-10-18T09:00:00.000Z").expect(200);
    expect(r.body.mois).toMatchObject({ mois: "2026-11-01", de: "du 1er novembre" });
    await inscrireNegoce(ctx, "apres@example.com", { depot: "ZA de Kerfolic, 22500 Paimpol", maintenant: "2026-10-18T09:30:00.000Z" });
    expect((await tache("2026-10-18T10:00:00.000Z")).body).toMatchObject({ grillesEnvoyees: 0 });
    expect(mailsVers("apres@example.com").filter((m) => /\/grille\//.test(m.text))).toHaveLength(0);
    expect(await ctx.prisma.grilleNegoce.count()).toBe(1);
    // La commande du 1er novembre, elle, part aux deux.
    const q2 = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Liteau sapin traité 27×38", quantite: "400", unite: "m" }] }).expect(201)).body as { projetId: string };
    await agent.patch(`/v1/projects/${q2.projetId}`).send({ address: "3 rue des Ajoncs, 22300 Lannion" }).expect(200);
    const articles2 = ((await agent.get(`/v1/projects/${q2.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string }[]).map((b) => b.key);
    await agent.post(`/v1/projects/${q2.projetId}/commande-du-mois?maintenant=2026-10-18T11:00:00.000Z`).send({ articles: articles2, nature: "chantier" }).expect(201);
    const novembre = (await tache("2026-11-01T11:30:00.000Z")).body;
    expect(novembre.clos).toBe(1);
    expect(mailsVers("apres@example.com").filter((m) => /\/grille\//.test(m.text))).toHaveLength(1);
    expect(mailsVers("avant@example.com").filter((m) => /\/grille\//.test(m.text))).toHaveLength(2);
    expect(companyId).toBeTruthy();
  });

  it("l'autre entreprise ne voit pas mon négoce dans sa liste, et sans le drapeau la route n'existe pas", async () => {
    const a = await couvreur("a@example.fr", "Toitures A");
    const b = await couvreur("b@example.fr", "Toitures B");
    await boucle(a.agent, { email: "n@example.com" }).expect(200);
    expect((await b.agent.get("/v1/groupe/negoces").expect(200)).body.negoces).toEqual([]);
  });
});
