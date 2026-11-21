import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AbonnementService } from "../src/modules/abonnement/index.js";
import { couvreurAvecListe, deposerGrille, jetonDeGrille, mailsVers, tacheDuMois } from "./support/cycle.js";
import { inscrireNegoce } from "./support/negoce.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES REGROUPEMENTS (Greg, 25 octobre 2026, recentrage), par l'API : gros articles identiques seulement (référence stricte,
 * 1 000 € HT estimés), une famille par regroupement aux échéances du 1er et du 15, « Tenter un prix de groupe » depuis un
 * chantier, « Rejoindre » en tapant une quantité, lancement par une entreprise, volume minimum (sinon bascule), une seule
 * consultation par famille et par cycle, validité fixée par le négoce, anonymat sous 5 participants, zones actives.
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, GROUPE: process.env.GROUPE, CRON_SECRET: process.env.CRON_SECRET, ZONES_ACTIVES: process.env.ZONES_ACTIVES, PRIX_REPERES: process.env.PRIX_REPERES, SEUIL_VOLUME_MIN: process.env.SEUIL_VOLUME_MIN };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.ZONES_ACTIVES = "22";
  // Des repères de TEST (pas des prix réels) : l'ardoise 1,20 € HT la pièce, le liteau 0,50 € HT le mètre.
  process.env.PRIX_REPERES = "ardoise:pieces=1.2,liteau:m=0.5";
  process.env.SEUIL_VOLUME_MIN = "couverture=3000";
  // Business model final (25 octobre 2026) : la consultation automatique, derrière l'interrupteur.
  process.env.MODE_REGROUPEMENT = "mois";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const A3222 = "Ardoise naturelle 32×22 Espagne 1er choix";
const A3020 = "Ardoise naturelle 30×20 Espagne 1er choix";
const CROCHET = "Crochet inox 100 mm";
const T0 = "2026-10-10T07:00:00.000Z";
const APRES_CLOTURE = "2026-10-15T10:00:00.000Z";
const PENDANT = "2026-10-19T09:00:00.000Z";
const LIMITE = "2026-10-22T16:00:00.000Z";
const q = (m: string) => `?maintenant=${encodeURIComponent(m)}`;

async function artisan(n: number, lignes: { libelle: string; quantite: string; unite: string }[], adresse = "3 rue des Ajoncs, 22300 Lannion") {
  return couvreurAvecListe(ctx, `artisan${n}@toitures.fr`, `Toitures ${n}`, adresse, lignes);
}

function tenter(a: { agent: request.Agent; projectId: string }, cles: string[], mois = "2026-10-15") {
  return a.agent.post(`/v1/projects/${a.projectId}/regroupements${q(T0)}`).send({ articles: cles, mois });
}

describe("regroupements", { timeout: 120_000 }, () => {
  it("une ligne non groupable est refusée, avec sa raison ; une ligne groupable lance le regroupement", async () => {
    const a = await artisan(1, [
      { libelle: A3222, quantite: "1800", unite: "pièces" },
      { libelle: CROCHET, quantite: "5000", unite: "pièces" },
    ]);
    const lignes = (await a.agent.get(`/v1/projects/${a.projectId}/regroupements/lignes`).expect(200)).body;
    expect(lignes.zoneActive).toBe(true);
    const parNom = Object.fromEntries((lignes.lignes as { designation: string; groupable: boolean; raison: string | null; estimeHt: number | null }[]).map((l) => [l.designation, l]));
    expect(parNom[A3222]).toMatchObject({ groupable: true, estimeHt: 2160 });
    expect(parNom[CROCHET]).toMatchObject({ groupable: false, raison: expect.stringContaining("petits accessoires") });
    const keyCrochet = lignes.lignes.find((l: { designation: string }) => l.designation === CROCHET).key;
    const refus = await tenter(a, [keyCrochet]).expect(400);
    expect(refus.body.error.details.reason).toBe("non_groupable");
    const ok = (await tenter(a, a.articles).expect(201)).body;
    expect(ok.ajoutees).toHaveLength(1);
    expect(ok.refusees.map((r: { designation: string }) => r.designation)).toEqual([CROCHET]);
    const besoin = await ctx.prisma.besoin.findFirstOrThrow({ where: { companyId: a.companyId } });
    expect(besoin).toMatchObject({ participation: "intention", lanceur: true, famille: "couverture" });
    expect(Number(besoin.estimeHt)).toBe(2160);
  });

  it("une 30×20 ne rejoint jamais une 32×22 ; un deuxième artisan se greffe ; une consultation par famille et par cycle", async () => {
    const a = await artisan(1, [{ libelle: A3222, quantite: "1800", unite: "pièces" }]);
    const b = await artisan(2, [{ libelle: A3020, quantite: "1500", unite: "pièces" }], "8 rue du Port, 22500 Paimpol");
    const c = await artisan(3, [{ libelle: A3222, quantite: "1200", unite: "pièces" }], "1 place du Centre, 22200 Guingamp");
    for (const x of [a, b, c]) await tenter(x, x.articles).expect(201);
    const cycles = await ctx.prisma.cycleCommande.findMany({ where: { famille: "couverture" } });
    expect(cycles).toHaveLength(1);
    const besoins = await ctx.prisma.besoin.findMany({ where: { cycleId: cycles[0]!.id }, orderBy: { createdAt: "asc" } });
    expect(besoins.map((x) => x.lanceur)).toEqual([true, false, false]);
    expect(new Set(besoins.map((x) => x.cle)).size).toBe(2);
    // Des négoces inscrits du 22 : un couvreur spécialiste, un généraliste.
    for (const [nom, email, offre, familles] of [
      ["Couverture Pro", "couv@negoce.fr", "specialiste", ["couverture"]],
      ["Généraliste", "gen@negoce.fr", "generaliste", []],
    ] as const) {
      await a.agent.post(`/v1/groupe/negoces${q(T0)}`).send({ nom, email, familles: ["couverture"] }).expect(201);
      await inscrireNegoce(ctx, email, { depot: "Zone de Kerampont, 22300 Lannion", enseigne: nom, maintenant: T0, offre, familles: [...familles] });
    }
    expect((await tacheDuMois(ctx, APRES_CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 2 });
    // Les deux ardoises restent deux lignes de la grille ; jamais fusionnées.
    const grille = mailsVers(ctx, "couv@negoce.fr").at(-1)!.text;
    expect(grille).toContain("32×22");
    expect(grille).toContain("30×20");
    expect((await ctx.prisma.cycleCommande.findUniqueOrThrow({ where: { id: cycles[0]!.id } })).lignes).toHaveLength(2);
    // Au-dessus du minimum (3 000 € HT estimés), les intentions deviennent des quantités confirmées.
    expect((await ctx.prisma.besoin.findMany({ where: { cycleId: cycles[0]!.id } })).every((x) => x.participation === "quantite_confirmee")).toBe(true);
    // Une seule consultation : un deuxième passage n'envoie rien de plus.
    expect((await tacheDuMois(ctx, PENDANT)).body.grillesEnvoyees).toBe(0);
    expect(await ctx.prisma.grilleNegoce.count({ where: { cycleId: cycles[0]!.id } })).toBe(2);

    // La validité est fixée par le négoce : moins de 7 jours, refusée ; 10 jours, elle fait la garantie.
    const jeton = jetonDeGrille(ctx, "couv@negoce.fr");
    const court = await request(ctx.app.getHttpServer()).post(`/v1/grille/${jeton}${q(PENDANT)}`).field("fermes", "oui").field("validiteJours", "5").attach("file", Buffer.from("%PDF-1.4"), { filename: "d.pdf", contentType: "application/pdf" });
    expect(court.status).toBe(400);
    await deposerGrille(ctx, jeton, [["A", A3222, "3000 pièces", "1,10", "3 300,00"], ["B", A3020, "1500 pièces", "0,95", "1 425,00"]], PENDANT).then(async (r) => {
      expect(r.status).toBe(201);
    });
    await ctx.prisma.grilleNegoce.updateMany({ where: { cycleId: cycles[0]!.id, negoce: { email: "couv@negoce.fr" } }, data: { validiteJours: 10 } });
    // Le généraliste refuse la consultation : pas de relance.
    await request(ctx.app.getHttpServer()).post(`/v1/grille/${jetonDeGrille(ctx, "gen@negoce.fr")}/refuser${q(PENDANT)}`).expect(200);
    await tacheDuMois(ctx, LIMITE);
    const c1 = await ctx.prisma.cycleCommande.findUniqueOrThrow({ where: { id: cycles[0]!.id } });
    expect(c1.phase).toBe("resultats");
    if (c1.retenuId) expect(c1.garantieJusquau!.getTime() - c1.resultatsLe!.getTime()).toBe(10 * 86_400_000);
  });

  it("volume minimum non atteint : rien ne part aux négoces ; bascule sur le cycle suivant ou en demande perso", async () => {
    const a = await artisan(1, [{ libelle: A3222, quantite: "1800", unite: "pièces" }]);
    await tenter(a, a.articles).expect(201);
    await a.agent.post(`/v1/groupe/negoces${q(T0)}`).send({ nom: "Couverture Pro", email: "couv@negoce.fr", familles: ["couverture"] }).expect(201);
    await inscrireNegoce(ctx, "couv@negoce.fr", { depot: "Zone de Kerampont, 22300 Lannion", maintenant: T0, offre: "specialiste", familles: ["couverture"] });
    // 2 160 € HT estimés sous 3 000 : pas de consultation.
    expect((await tacheDuMois(ctx, APRES_CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 0 });
    const r = (await a.agent.get(`/v1/regroupements${q(APRES_CLOTURE)}`).expect(200)).body.regroupements[0];
    expect(r).toMatchObject({ nonConsulte: true, jeSuisDedans: true });
    const bascule = (await a.agent.post(`/v1/regroupements/${r.id}/basculer${q(APRES_CLOTURE)}`).send({ vers: "suivant" }).expect(200)).body;
    expect(bascule).toMatchObject({ vers: "suivant", de: "du 1er novembre" });
    const besoin = await ctx.prisma.besoin.findFirstOrThrow({ where: { companyId: a.companyId } });
    expect(besoin).toMatchObject({ cycleId: bascule.regroupementId, participation: "intention" });
  });

  it("rejoindre en tapant une quantité ; anonymat sous 5 participants ; un artisan d'un autre métier n'a pas l'encart", async () => {
    const a = await artisan(1, [{ libelle: A3222, quantite: "1800", unite: "pièces" }]);
    await tenter(a, a.articles).expect(201);
    const b = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    await b.agent.patch("/v1/company/profile").send({ name: "Toitures B", address: "8 rue du Port, 22500 Paimpol", siret: "73282932000074", phone: null, email: null }).expect(200);
    const liste = (await b.agent.get(`/v1/regroupements${q(T0)}`).expect(200)).body;
    expect(liste.regroupements).toHaveLength(1);
    const r = liste.regroupements[0];
    expect(r).toMatchObject({ titre: "Couverture", departement: "22", participants: "Regroupement en cours", participantsDetail: null, jeSuisDedans: false });
    expect(JSON.stringify(liste)).not.toMatch(/Lannion|Toitures 1|artisan1/);
    await b.agent.post(`/v1/regroupements/${r.id}/rejoindre${q(T0)}`).send({ cle: r.materiaux[0].cle, quantite: 900 }).expect(200);
    const detail = (await b.agent.get(`/v1/regroupements/${r.id}${q(T0)}`).expect(200)).body;
    expect(detail.mesLignes).toEqual([expect.objectContaining({ quantite: 900, chantier: "Stock (regroupements)", statut: "intention", libelle: "Tu as rejoint" })]);
    // Cinq entreprises : « 5+ entreprises » et le département, jamais la commune.
    for (let n = 3; n <= 5; n++) {
      const x = await artisan(n, [{ libelle: A3222, quantite: "1000", unite: "pièces" }], "1 place du Centre, 22200 Guingamp");
      await tenter(x, x.articles).expect(201);
    }
    const plein = (await b.agent.get(`/v1/regroupements/${r.id}${q(T0)}`).expect(200)).body;
    expect(plein).toMatchObject({ participants: "5+ entreprises", participantsDetail: "Département 22" });
    expect(JSON.stringify(plein)).not.toMatch(/Guingamp/);
    // Un électricien du 22 : pas de regroupement de couverture dans son encart.
    const elec = await signUpWithCompany(ctx.app, "e@elec.fr", "Élec", ["electrical"]);
    await elec.agent.patch("/v1/company/profile").send({ name: "Élec", address: "4 rue Haute, 22300 Lannion", siret: "73282932000074", phone: null, email: null }).expect(200);
    expect((await elec.agent.get(`/v1/regroupements${q(T0)}`).expect(200)).body.regroupements).toEqual([]);
  });

  it("zone inactive : tout sauf les regroupements ; gratuit : pas de regroupement ; zone offerte puis préavis de 30 jours", async () => {
    const f = await artisan(1, [{ libelle: A3222, quantite: "1800", unite: "pièces" }], "2 rue de Brest, 29200 Brest");
    const liste = (await f.agent.get(`/v1/regroupements${q(T0)}`).expect(200)).body;
    expect(liste).toMatchObject({ zoneActive: false, regroupements: [], message: "Les regroupements arrivent bientôt dans ton département, invite tes négoces pour accélérer." });
    await tenter(f, f.articles).expect(403);
    // Le payant offert : moins de 10 artisans actifs dans le 22.
    const a = await artisan(2, [{ libelle: A3222, quantite: "1800", unite: "pièces" }]);
    await ctx.app.get(AbonnementService).finirEssai(a.companyId);
    expect((await a.agent.get("/v1/droits").expect(200)).body).toMatchObject({ formule: "payant", raison: "zone_offerte", preavis: null });
    // Le seuil franchi il y a 3 jours : encore offert, avec le préavis.
    await ctx.prisma.parametreGroupe.create({ data: { cle: "zone:22:seuil_franchi", valeur: new Date(Date.now() - 3 * 86_400_000).toISOString() } });
    const preavis = (await a.agent.get("/v1/droits").expect(200)).body;
    expect(preavis).toMatchObject({ formule: "payant", raison: "zone_offerte", preavis: expect.stringContaining("l'abonnement t'est offert jusqu'au") });
    // Le préavis passé : gratuit, et le regroupement passe par l'abonnement.
    await ctx.prisma.parametreGroupe.update({ where: { cle: "zone:22:seuil_franchi" }, data: { valeur: "2026-01-01T00:00:00.000Z" } });
    expect((await a.agent.get("/v1/droits").expect(200)).body).toMatchObject({ formule: "gratuit", regroupements: false });
    const refus = await tenter(a, a.articles).expect(402);
    expect(refus.body.error.details.refus).toBe("regroupements");
  });
});
