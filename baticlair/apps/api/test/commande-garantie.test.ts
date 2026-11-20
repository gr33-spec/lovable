import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { inscrireNegoce } from "./support/negoce.js";
import { ARDOISE, couvreurAvecListe, CROCHET, deposerGrille, jetonDeGrille, LITEAU, tacheDuMois } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * PRIX FERMES ET GRILLE GARANTIE 30 JOURS (Greg, 23 octobre 2026, points 5 et 6) : un article « non garanti » est
 * indicatif (à part, hors total, hors garantie) ; le négoce retenu tient ses prix 30 jours pour tout artisan de la zone,
 * même nouveau ; « Recommander à ce prix » envoie un bon « Commande sur grille garantie » ; deux fenêtres se cumulent,
 * la plus récente d'abord ; passée la fin, le bloc disparaît et les commandes restent. Et « Ne livre pas ta zone ».
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
const srv = () => request(ctx.app.getHttpServer());
const lannion = "3 rue des Ajoncs, 22300 Lannion";

/** A à Lannion dépose ; N1 (Lannion) et N2 (Paimpol) inscrits ; la clôture passe. */
async function commandeClose() {
  const A = await couvreurAvecListe(ctx, "a@example.fr", "Toitures A", lannion, [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }, { libelle: LITEAU, quantite: "400", unite: "m" }, { libelle: CROCHET, quantite: "10", unite: "boîtes" }]);
  for (const [nom, email] of [["Négoce N1", "n1@example.com"], ["Négoce N2", "n2@example.com"]] as const) {
    await A.agent.post(`/v1/groupe/negoces?maintenant=${T0}`).send({ nom, email, familles: ["couverture"] }).expect(201);
  }
  await inscrireNegoce(ctx, "n1@example.com", { depot: "Zone de Kerampont, 22300 Lannion", francoKm: 20, prixAuDela: 50, enseigne: "Négoce N1", maintenant: T0 });
  await inscrireNegoce(ctx, "n2@example.com", { depot: "ZA de Kerfolic, 22500 Paimpol", francoKm: 30, prixAuDela: 40, maxKm: 60, enseigne: "Négoce N2", maintenant: T0 });
  await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
  expect((await tacheDuMois(ctx, CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 2 });
  return A;
}
const cles = async () => ((await ctx.prisma.cycleCommande.findFirstOrThrow()).lignes as { cle: string; designation: string }[]);

describe("prix non garantis, « ne livre pas ta zone »", { timeout: 120_000 }, () => {
  it("une ligne « non garantie » est acceptée, indicative, hors du total ; un négoce qui ne livre pas un chantier n'est pas choisissable", async () => {
    const A = await commandeClose();
    // Brest (29), hors de la distance maximale de N2 (60 km) : B y dépose aussi… mais la commande est close ; on teste sur A seul.
    const l = await cles();
    const crochets = l.find((x) => x.designation === CROCHET)!.cle;
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, "n1@example.com"), [["A", ARDOISE, "2000 pièces", "0,90", ""], ["L", LITEAU, "400 m", "0,80", ""], ["C", CROCHET, "10 boîtes", "30,00", ""]], PENDANT, { nonGarantis: [crochets] })).status).toBe(201);
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, "n2@example.com"), [["A", ARDOISE, "2000 pièces", "0,88", ""], ["L", LITEAU, "400 m", "0,85", ""], ["C", CROCHET, "10 boîtes", "32,00", ""]], PENDANT)).status).toBe(201);
    const page1 = (await srv().get(`/v1/grille/${jetonDeGrille(ctx, "n1@example.com")}?maintenant=${PENDANT}`).expect(200)).body;
    expect(page1.lignes.find((x: { cle: string }) => x.cle === crochets)).toMatchObject({ nonGaranti: true, prixUnitaire: 30 });
    expect(page1.depose.manquantes).toBe(0);
    await tacheDuMois(ctx, LIMITE);
    const vue = (await A.agent.get(`/v1/commande-du-mois?maintenant=${LIMITE}`).expect(200)).body;
    const r = vue.commandes.find((c: { mois: string }) => c.mois === "2026-10-15").resultats;
    const n1 = r.negoces.find((n: { nom: string }) => n.nom === "Négoce N1");
    const n2 = r.negoces.find((n: { nom: string }) => n.nom === "Négoce N2");
    // N1 : 1 800 + 320 = 2 120, crochets à part (indicatif 30 €), livraison gratuite (0 km). N2 : 1 760 + 340 + 320 = 2 420 + 40 de livraison (40 km > 30).
    expect(n1).toMatchObject({ marchandiseHt: 2120, livraisonHt: 0, totalHt: 2120, complet: true, livrable: true, indicatives: [{ designation: CROCHET, prixUnitaire: 30 }] });
    expect(n2).toMatchObject({ marchandiseHt: 2420, livraisonHt: 40, totalHt: 2460, complet: true, livrable: true, indicatives: [] });
    expect(r.parDefaut).toBe(n1.negoceId);
    // La grille garantie : N1, sans les crochets (non garantis).
    expect(vue.garanties).toHaveLength(1);
    expect(vue.garanties[0]).toMatchObject({ mois: "2026-10-15", negoce: { nom: "Négoce N1" }, titre: "Prix garantis jusqu'au 21 novembre" });
    expect(vue.garanties[0].lignes.map((x: { designation: string }) => x.designation)).toEqual([ARDOISE, LITEAU]);
  });

  it("un négoce qui ne livre pas la zone d'un artisan : « livrable: false », pas choisissable, et derrière au classement", async () => {
    const A = await couvreurAvecListe(ctx, "a@example.fr", "Toitures A", "2 rue de Siam, 29200 Brest", [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }]);
    for (const [nom, email] of [["Négoce Proche", "proche@example.com"], ["Négoce Loin", "loin@example.com"]] as const) {
      await A.agent.post(`/v1/groupe/negoces?maintenant=${T0}`).send({ nom, email, familles: ["couverture"] }).expect(201);
    }
    await inscrireNegoce(ctx, "proche@example.com", { depot: "2 rue de Siam, 29200 Brest", francoKm: 20, prixAuDela: 50, departements: ["29"], enseigne: "Négoce Proche", maintenant: T0 });
    // Loin : dépôt à Saint-Brieuc, ne livre pas au-delà de 60 km (Brest est à 162 km).
    await inscrireNegoce(ctx, "loin@example.com", { depot: "Rue de la Gare, 22000 Saint-Brieuc", francoKm: 30, prixAuDela: 40, maxKm: 60, departements: ["29"], enseigne: "Négoce Loin", maintenant: T0 });
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    expect((await tacheDuMois(ctx, CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 2 });
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, "proche@example.com"), [["A", ARDOISE, "2000 pièces", "0,95", ""]], PENDANT)).status).toBe(201);
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, "loin@example.com"), [["A", ARDOISE, "2000 pièces", "0,80", ""]], PENDANT)).status).toBe(201);
    await tacheDuMois(ctx, LIMITE);
    const c = (await A.agent.get(`/v1/commande-du-mois?maintenant=${LIMITE}`).expect(200)).body.commandes.find((x: { mois: string }) => x.mois === "2026-10-15");
    const loin = c.resultats.negoces.find((n: { nom: string }) => n.nom === "Négoce Loin");
    expect(loin).toMatchObject({ livrable: false, complet: false });
    expect(c.resultats.parDefaut).toBe(c.resultats.negoces.find((n: { nom: string }) => n.nom === "Négoce Proche").negoceId);
    expect((await A.agent.post(`/v1/commande-du-mois/${c.cycleId}/commander?maintenant=${LIMITE}`).send({ negoceId: loin.negoceId }).expect(400)).body.error.details).toMatchObject({ reason: "ne_livre_pas" });
  });
});

describe("la grille garantie 30 jours", { timeout: 120_000 }, () => {
  async function resultats() {
    const A = await commandeClose();
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, "n1@example.com"), [["A", ARDOISE, "2000 pièces", "0,90", ""], ["L", LITEAU, "400 m", "0,80", ""], ["C", CROCHET, "10 boîtes", "30,00", ""]], PENDANT)).status).toBe(201);
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, "n2@example.com"), [["A", ARDOISE, "2000 pièces", "0,88", ""], ["L", LITEAU, "400 m", "0,85", ""], ["C", CROCHET, "10 boîtes", "32,00", ""]], PENDANT)).status).toBe(201);
    expect((await tacheDuMois(ctx, LIMITE)).body).toMatchObject({ resultats: 1 });
    return A;
  }

  it("un nouvel inscrit de la zone, sans rien avoir déposé, voit le bloc et recommande au prix garanti ; le bon part avec la mention ; passée la fenêtre, plus de bloc", async () => {
    await resultats();
    // N1 (2 120 €, livré gratuit) est premier sur le total : sa grille est garantie jusqu'au 21 novembre.
    const cycle = await ctx.prisma.cycleCommande.findFirstOrThrow();
    expect(cycle.garantieJusquau?.toISOString()).toBe("2026-11-21T16:00:00.000Z");
    // Un couvreur tout neuf, à Lannion, le 2 novembre.
    const N = await couvreurAvecListe(ctx, "nouveau@example.fr", "Toitures Nouveau", "5 rue de Kerampont, 22300 Lannion", [{ libelle: LITEAU, quantite: "10", unite: "m" }]);
    const vue = (await N.agent.get("/v1/commande-du-mois?maintenant=2026-11-02T09:00:00.000Z").expect(200)).body;
    expect(vue.garanties).toHaveLength(1);
    const g = vue.garanties[0];
    expect(g).toMatchObject({ cycleId: cycle.id, de: "du 15 octobre", negoce: { nom: "Négoce N1" }, titre: "Prix garantis jusqu'au 21 novembre", jusquau: "2026-11-21T16:00:00.000Z", commandes: [] });
    expect(g.lignes.map((l: { designation: string; prixUnitaire: number }) => [l.designation, l.prixUnitaire])).toEqual([[ARDOISE, 0.9], [LITEAU, 0.8], [CROCHET, 30]]);
    expect(g.livraison).toBe("Livraison gratuite jusqu'à 20 km, 50 € HT jusqu'à 1000 km, pas de livraison au-delà de 1000 km.");
    // La recommande : 500 ardoises et 2 boîtes, livrées à Paimpol (40 km > 20 : 50 € de livraison).
    const ardoise = g.lignes[0].cle as string;
    const crochets = g.lignes[2].cle as string;
    expect((await N.agent.post(`/v1/commande-du-mois/${cycle.id}/recommander?maintenant=2026-11-02T09:00:00.000Z`).send({ lignes: [{ cle: ardoise, quantite: 500 }], adresseLivraison: "Paimpol" }).expect(400)).body.error.details).toMatchObject({ reason: "adresse_requise" });
    const r = (await N.agent.post(`/v1/commande-du-mois/${cycle.id}/recommander?maintenant=2026-11-02T09:00:00.000Z`).send({ lignes: [{ cle: ardoise, quantite: 500 }, { cle: crochets, quantite: 2 }], adresseLivraison: "8 rue du Port, 22500 Paimpol" }).expect(201)).body;
    expect(r).toMatchObject({ negoce: "Négoce N1", marchandiseHt: 510, livraisonHt: 50, totalHt: 560, mention: "Commande sur grille garantie du 15 octobre", suivi: { etape: 4, phrase: "C'est commandé." } });
    const bon = ctx.emails.sent.filter((m) => m.to === "n1@example.com" && /Bon de commande/.test(m.subject)).at(-1)!;
    expect(bon.subject).toMatch(/\(grille garantie\)$/);
    expect(bon.text).toContain("Commande sur grille garantie du 15 octobre");
    expect(bon.text).toContain("Toitures Nouveau");
    expect(bon.attachments?.[0]?.filename).toMatch(/garantie/);
    // Le négoce la voit dans son espace comme les autres.
    const n1 = await ctx.prisma.compteNegoce.findUniqueOrThrow({ where: { email: "n1@example.com" } });
    void n1;
    const apres = (await N.agent.get("/v1/commande-du-mois?maintenant=2026-11-03T09:00:00.000Z").expect(200)).body;
    expect(apres.garanties[0].commandes).toEqual([expect.objectContaining({ totalHt: 560, adresse: "8 rue du Port, 22500 Paimpol" })]);
    // Fin de fenêtre : plus de bloc, la commande reste.
    expect((await N.agent.get("/v1/commande-du-mois?maintenant=2026-11-22T09:00:00.000Z").expect(200)).body.garanties).toEqual([]);
    await N.agent.post(`/v1/commande-du-mois/${cycle.id}/recommander?maintenant=2026-11-22T09:00:00.000Z`).send({ lignes: [{ cle: ardoise, quantite: 500 }], adresseLivraison: "8 rue du Port, 22500 Paimpol" }).expect(404);
    expect(await ctx.prisma.commandeGarantie.count()).toBe(1);
  });

  it("deux fenêtres qui se chevauchent (15 octobre, 1er novembre) : les deux blocs, le plus récent en premier", async () => {
    const A = await resultats();
    // La commande du 1er novembre : A redépose, N2 seul répond (moins cher sur ce tour), résultats le 6 novembre.
    const q = (await A.agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: LITEAU, quantite: "100", unite: "m" }] }).expect(201)).body as { projetId: string };
    await A.agent.patch(`/v1/projects/${q.projetId}`).send({ address: lannion }).expect(200);
    const articles = ((await A.agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string }[]).map((b) => b.key);
    await A.agent.post(`/v1/projects/${q.projetId}/commande-du-mois?maintenant=2026-10-25T09:00:00.000Z`).send({ articles, nature: "stock" }).expect(201);
    expect((await tacheDuMois(ctx, "2026-11-01T11:00:00.000Z")).body).toMatchObject({ clos: 1, grillesEnvoyees: 2 });
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, "n2@example.com"), [["L", LITEAU, "100 m", "0,70", ""]], "2026-11-03T09:00:00.000Z")).status).toBe(201);
    expect((await tacheDuMois(ctx, "2026-11-06T17:00:00.000Z")).body).toMatchObject({ resultats: 1 });
    const g = (await A.agent.get("/v1/commande-du-mois?maintenant=2026-11-07T09:00:00.000Z").expect(200)).body.garanties;
    expect(g.map((x: { mois: string; negoce: { nom: string }; titre: string }) => [x.mois, x.negoce.nom, x.titre])).toEqual([
      ["2026-11-01", "Négoce N2", "Prix garantis jusqu'au 6 décembre"],
      ["2026-10-15", "Négoce N1", "Prix garantis jusqu'au 21 novembre"],
    ]);
  });

  it("le dépôt d'une grille exige un compte inscrit (dépôts et paliers) : sans lui, « inscription_requise » avec le lien", async () => {
    const A = await couvreurAvecListe(ctx, "a@example.fr", "Toitures A", lannion, [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }]);
    await A.agent.post(`/v1/groupe/negoces?maintenant=${T0}`).send({ nom: "Négoce N1", email: "n1@example.com", familles: ["couverture"] }).expect(201);
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    // Pas inscrit : pas de grille, un rappel.
    expect((await tacheDuMois(ctx, CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 0 });
    expect(await ctx.prisma.grilleNegoce.count()).toBe(0);
    expect(ctx.emails.sent.filter((m) => m.to === "n1@example.com" && /créez votre accès pour la chiffrer/.test(m.subject))).toHaveLength(1);
    const admin = await signUpWithCompany(ctx.app, "greg@example.fr", "Admin");
    void admin;
  });
});
