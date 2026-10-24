import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { inscrireNegoce } from "./support/negoce.js";
import { ARDOISE, couvreurAvecListe, CROCHET, deposerGrille, jetonDeGrille, LITEAU, SIRET_ARTISAN, tacheDuMois } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * CONFIDENTIALITÉ, RÈGLE ABSOLUE (Greg, 23 octobre 2026, point 4) : jusqu'au clic « Commander » de l'artisan, aucune
 * réponse d'une route négoce (invitation, compte, grille, conditions) ne contient un nom d'artisan, un SIRET d'artisan,
 * un téléphone ni une adresse exacte ; seulement la grille et les communes de livraison. Après la commande, le négoce
 * retenu voit cet artisan, et lui seul ; l'autre négoce ne voit rien, ni combien ont commandé ailleurs.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const T0 = "2026-10-10T07:00:00.000Z";
const CLOTURE = "2026-10-15T10:00:00.000Z";
const PENDANT = "2026-10-19T09:00:00.000Z";
const LIMITE = "2026-10-22T16:00:00.000Z";
const TELEPHONE_A = "02 96 11 22 33";
const RUE_A = "3 rue des Ajoncs";
const srv = () => request(ctx.app.getHttpServer());
/** Ce qu'un négoce ne doit jamais lire avant une commande. */
const SECRETS = ["Toitures A", "Toitures B", SIRET_ARTISAN, TELEPHONE_A, RUE_A, "12 rue du Port", "a@example.fr", "b@example.fr"];
const fuites = (body: unknown) => SECRETS.filter((s) => JSON.stringify(body).includes(s));

describe("confidentialité des artisans côté négoce", { timeout: 120_000 }, () => {
  it("avant toute commande : aucune route négoce ne fuit un nom, un SIRET, un téléphone, une adresse ; après « Commander », le négoce retenu seul voit l'artisan", async () => {
    const A = await couvreurAvecListe(ctx, "a@example.fr", "Toitures A", `${RUE_A}, 22300 Lannion`, [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }, { libelle: LITEAU, quantite: "400", unite: "m" }], TELEPHONE_A);
    const B = await couvreurAvecListe(ctx, "b@example.fr", "Toitures B", "12 rue du Port, 22500 Paimpol", [{ libelle: ARDOISE, quantite: "3000", unite: "pièces" }, { libelle: CROCHET, quantite: "10", unite: "boîtes" }]);
    for (const [nom, email] of [["Négoce N1", "n1@example.com"], ["Négoce N2", "n2@example.com"]] as const) {
      await A.agent.post(`/v1/groupe/negoces?maintenant=${T0}`).send({ nom, email, familles: ["couverture"] }).expect(201);
    }
    const n1 = await inscrireNegoce(ctx, "n1@example.com", { depot: "Zone de Kerampont, 22300 Lannion", francoKm: 20, prixAuDela: 50, enseigne: "Négoce N1", maintenant: T0 });
    const n2 = await inscrireNegoce(ctx, "n2@example.com", { depot: "ZA de Kerfolic, 22500 Paimpol", francoKm: 30, prixAuDela: 40, enseigne: "Négoce N2", maintenant: T0 });
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    await B.agent.post(`/v1/projects/${B.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: B.articles, nature: "stock" }).expect(201);

    // Pendant les inscriptions : le compte ne montre que la prochaine clôture et le chrono, jamais les quantités.
    const avantCloture = (await srv().get(`/v1/negoce/compte?maintenant=${T0}`).set("cookie", n1.cookie).expect(200)).body;
    expect(avantCloture.prochaine).toMatchObject({ mois: "2026-10-15", clotureDans: "5 j 3 h" });
    expect(avantCloture.grilles).toEqual([]);
    expect(JSON.stringify(avantCloture)).not.toMatch(/2 ?000|ardoise/i);
    expect(fuites(avantCloture)).toEqual([]);

    // La clôture, les grilles.
    expect((await tacheDuMois(ctx, CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 2 });
    for (const m of ctx.emails.sent.filter((x) => x.to.startsWith("n"))) expect(fuites(m.text + m.subject)).toEqual([]);
    const j1 = jetonDeGrille(ctx, "n1@example.com");
    const j2 = jetonDeGrille(ctx, "n2@example.com");
    const page = (await srv().get(`/v1/grille/${j1}?maintenant=${PENDANT}`).expect(200)).body;
    // La grille et les communes, sans rue.
    expect(page.zones).toEqual(["22300 Lannion", "22500 Paimpol"]);
    expect(page.lignes).toHaveLength(3);
    expect(fuites(page)).toEqual([]);
    // Le dépôt demande « prix fermes » ; sans compte inscrit, le dépôt est refusé.
    expect((await deposerGrille(ctx, j1, [["A", ARDOISE, "5000 pièces", "0,90", ""]], PENDANT, { fermes: false })).body.error.details).toMatchObject({ reason: "prix_fermes_requis" });
    expect((await deposerGrille(ctx, j1, [["A", ARDOISE, "5000 pièces", "0,90", ""], ["L", LITEAU, "400 m", "0,80", ""], ["C", CROCHET, "10 boîtes", "30,00", ""]], PENDANT)).status).toBe(201);
    expect((await deposerGrille(ctx, j2, [["A", ARDOISE, "5000 pièces", "0,88", ""], ["L", LITEAU, "400 m", "0,85", ""], ["C", CROCHET, "10 boîtes", "32,00", ""]], PENDANT)).status).toBe(201);
    // Après dépôt : premier ou pas, rien d'autre ; le compte liste la grille, sans artisan.
    for (const [cookie, j] of [[n1.cookie, j1], [n2.cookie, j2]] as const) {
      const compte = (await srv().get(`/v1/negoce/compte?maintenant=${PENDANT}`).set("cookie", cookie).expect(200)).body;
      expect(compte.grilles).toHaveLength(1);
      expect(compte.commandes).toEqual([]);
      expect(fuites(compte)).toEqual([]);
      expect(fuites((await srv().get(`/v1/grille/${j}?maintenant=${PENDANT}`).expect(200)).body)).toEqual([]);
    }
    expect(fuites((await srv().get("/v1/negoce/conditions").expect(200)).body)).toEqual([]);

    // Les résultats : A commande chez N2 ; B ne commande pas.
    expect((await tacheDuMois(ctx, LIMITE)).body).toMatchObject({ resultats: 1 });
    for (const m of ctx.emails.sent.filter((x) => x.to.startsWith("n"))) expect(fuites(m.text + m.subject)).toEqual([]);
    const vueA = (await A.agent.get(`/v1/commande-du-mois?maintenant=${LIMITE}`).expect(200)).body.commandes.find((c: { mois: string }) => c.mois === "2026-10-15");
    await A.agent.post(`/v1/commande-du-mois/${vueA.cycleId}/commander?maintenant=${LIMITE}`).send({ negoceId: vueA.resultats.parDefaut }).expect(200);
    const retenu = vueA.resultats.negoces.find((n: { negoceId: string }) => n.negoceId === vueA.resultats.parDefaut).nom as string;
    const [cookieRetenu, cookieAutre] = retenu === "Négoce N2" ? [n2.cookie, n1.cookie] : [n1.cookie, n2.cookie];
    // Le négoce retenu voit la commande de A (nom, total), rien de B ; l'autre ne voit rien, ni un compteur.
    const compteRetenu = (await srv().get(`/v1/negoce/compte?maintenant=${LIMITE}`).set("cookie", cookieRetenu).expect(200)).body;
    expect(compteRetenu.commandes).toEqual([expect.objectContaining({ type: "cycle", artisan: "Toitures A" })]);
    expect(JSON.stringify(compteRetenu)).not.toMatch(/Toitures B|12 rue du Port/);
    const compteAutre = (await srv().get(`/v1/negoce/compte?maintenant=${LIMITE}`).set("cookie", cookieAutre).expect(200)).body;
    expect(compteAutre.commandes).toEqual([]);
    expect(fuites(compteAutre)).toEqual([]);
    expect(JSON.stringify(compteAutre)).not.toMatch(/artisans? ont choisi|\bchoisi\b/);
    // Le bon de commande, lui, porte le nom, le téléphone et l'adresse exacte : c'est l'artisan qui les transmet, à ce négoce seul.
    const bon = ctx.emails.sent.find((m) => m.subject.startsWith("Bon de commande"))!;
    expect(bon.to).toBe(retenu === "Négoce N2" ? "n2@example.com" : "n1@example.com");
    expect(bon.text).toContain("Toitures A");
    // La page de grille, même après, ne nomme personne.
    expect(fuites((await srv().get(`/v1/grille/${j1}?maintenant=${LIMITE}`).expect(200)).body)).toEqual([]);
  });
});
