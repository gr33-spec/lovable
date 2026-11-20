import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { couvreurAvecListe, deposerGrille, jetonDeGrille, mailsVers, tacheDuMois } from "./support/cycle.js";
import { inscrireNegoce } from "./support/negoce.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * LISTES MULTIMÉTIERS, NÉGOCES GÉNÉRALISTES OU SPÉCIALISTES (Greg, 25 octobre 2026), par l'API : l'artisan dépose sa liste
 * telle quelle (couverture et placo), l'app range chaque ligne ; une seule commande par département ; le généraliste
 * reçoit toute la grille, chaque spécialiste ses seules familles ; l'artisan voit les meilleures combinaisons livrées et
 * chaque négoce retenu ne reçoit que sa part du bon de commande.
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
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const ARDOISE = "Ardoise naturelle 32×22 Espagne 1er choix";
const PLACO = "Plaque de plâtre BA13 2,50 × 1,20 m";
const T0 = "2026-10-10T07:00:00.000Z";
const APRES_CLOTURE = "2026-10-15T10:00:00.000Z";
const PENDANT = "2026-10-19T09:00:00.000Z";
const LIMITE = "2026-10-22T16:00:00.000Z";
const DEPOT = "Zone de Kerampont, 22300 Lannion";
const G = "generaliste@example.com";
const C = "couverture@example.com";
const P = "placo@example.com";

/** Les trois négoces du 22 : un généraliste et deux spécialistes, ajoutés par l'artisan puis inscrits avec leur choix. */
async function troisNegoces(agent: request.Agent, livraison: number) {
  for (const [nom, email, offre, familles] of [
    ["Négoce Généraliste", G, "generaliste", []],
    ["Couverture Pro", C, "specialiste", ["couverture"]],
    ["Placo Pro", P, "specialiste", ["second_oeuvre"]],
  ] as const) {
    await agent.post(`/v1/groupe/negoces?maintenant=${T0}`).send({ nom, email, familles: ["couverture"] }).expect(201);
    await inscrireNegoce(ctx, email, { depot: DEPOT, francoKm: 1, prixAuDela: livraison, enseigne: nom, maintenant: T0, offre, familles: [...familles] });
  }
}

async function artisanCouvertureEtPlaco() {
  const A = await couvreurAvecListe(ctx, "a@example.fr", "Toitures A", "12 rue du Port, 22500 Paimpol", [
    { libelle: ARDOISE, quantite: "1000", unite: "pièces" },
    { libelle: PLACO, quantite: "50", unite: "plaques" },
  ]);
  await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
  return A;
}

const resultatsDe = async (agent: request.Agent) => (await agent.get(`/v1/commande-du-mois?maintenant=${LIMITE}`).expect(200)).body.commandes[0];

describe("multimétier : généraliste et spécialistes", { timeout: 120_000 }, () => {
  it("une seule commande, chaque ligne dans sa famille ; le spécialiste ne reçoit que ses lignes, sa grille partielle est acceptée ; les spécialistes gagnent malgré deux livraisons ; chacun reçoit sa part du bon", async () => {
    const A = await artisanCouvertureEtPlaco();
    await troisNegoces(A.agent, 50);
    const besoins = await ctx.prisma.besoin.findMany({ where: { companyId: A.companyId }, select: { designation: true, famille: true, cycleId: true } });
    expect(Object.fromEntries(besoins.map((b) => [b.designation, b.famille]))).toEqual({ [ARDOISE]: "couverture", [PLACO]: "second_oeuvre" });
    expect(new Set(besoins.map((b) => b.cycleId)).size).toBe(1);

    expect((await tacheDuMois(ctx, APRES_CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 3 });
    const demande = (email: string) => mailsVers(ctx, email).at(-1)!.text;
    expect(demande(G)).toContain(ARDOISE);
    expect(demande(G)).toContain(PLACO);
    expect(demande(C)).toContain(ARDOISE);
    expect(demande(C)).not.toContain("BA13");
    expect(demande(P)).toContain(PLACO);
    expect(demande(P)).not.toContain("Ardoise");

    const page = async (email: string) => (await request(ctx.app.getHttpServer()).get(`/v1/grille/${jetonDeGrille(ctx, email)}?maintenant=${PENDANT}`).expect(200)).body;
    expect((await page(C)).lignes.map((l: { designation: string }) => l.designation)).toEqual([ARDOISE]);
    expect((await page(P)).lignes.map((l: { designation: string }) => l.designation)).toEqual([PLACO]);
    expect((await page(G)).lignes).toHaveLength(2);

    // Les grilles : chaque spécialiste ne chiffre que les siennes (acceptées, complètes sur son périmètre).
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, G), [["A", ARDOISE, "1000 pièces", "1,00", "1 000,00"], ["P", PLACO, "50 plaques", "8,00", "400,00"]], PENDANT)).status).toBe(201);
    const c = await deposerGrille(ctx, jetonDeGrille(ctx, C), [["A", ARDOISE, "1000 pièces", "0,95", "950,00"]], PENDANT);
    expect(c.status).toBe(201);
    expect(c.body.depose).toMatchObject({ manquantes: 0 });
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, P), [["P", PLACO, "50 plaques", "7,50", "375,00"]], PENDANT)).status).toBe(201);
    // Confidentialité : chacun se juge sur son seul périmètre, sans rien savoir des autres.
    expect((await page(C)).rang).toBe("Vous êtes premier sur le total de la commande.");
    expect(JSON.stringify(await page(C))).not.toMatch(/BA13|7[.,]5|Placo Pro|Généraliste/);

    await tacheDuMois(ctx, LIMITE);
    const r = (await resultatsDe(A.agent)).resultats;
    // 950 + 375 de marchandise, 50 + 50 de livraison ; « Tout chez » le généraliste : 1 400 + 50 ; à égalité de prix, la
    // moins livrée d'abord.
    expect(r.combinaisons.map((x: { libelle: string; totalHt: number; livraisons: number; ecartHt: number }) => [x.libelle, x.totalHt, x.livraisons, x.ecartHt])).toEqual([
      ["Couverture chez Couverture Pro, second œuvre chez Placo Pro", 1425, 2, 0],
      ["Tout chez Négoce Généraliste", 1450, 1, 25],
      ["Couverture chez Couverture Pro, second œuvre chez Négoce Généraliste", 1450, 2, 25],
    ]);
    expect(r.sansPrix).toEqual([]);

    // L'artisan commande la moins chère : chaque spécialiste reçoit SA part, le généraliste rien.
    const avantCommande = ctx.emails.sent.length;
    await A.agent.post(`/v1/commande-du-mois/${(await resultatsDe(A.agent)).cycleId}/commander?maintenant=${LIMITE}`).send({ combinaison: r.combinaisons[0].cle }).expect(200);
    const bons = ctx.emails.sent.slice(avantCommande).filter((m) => /bon de commande/i.test(m.subject));
    expect(bons.map((m) => m.to).sort()).toEqual([C, P].sort());
    const choix = await ctx.prisma.choixArtisan.findFirstOrThrow({ where: { companyId: A.companyId } });
    expect((choix.parts as { negoceId: string; totalHt: number; cles: string[] }[]).map((p) => [p.totalHt, p.cles.length])).toEqual([
      [1000, 1],
      [425, 1],
    ]);
    // Rejouer « Commander » ne renvoie aucun bon.
    await A.agent.post(`/v1/commande-du-mois/${choix.cycleId}/commander?maintenant=${LIMITE}`).send({ combinaison: r.combinaisons[0].cle }).expect(409);
  });

  it("le généraliste gagne grâce à la livraison unique", async () => {
    const A = await artisanCouvertureEtPlaco();
    await troisNegoces(A.agent, 80);
    await tacheDuMois(ctx, APRES_CLOTURE);
    await deposerGrille(ctx, jetonDeGrille(ctx, G), [["A", ARDOISE, "1000 pièces", "1,00", "1 000,00"], ["P", PLACO, "50 plaques", "8,00", "400,00"]], PENDANT);
    await deposerGrille(ctx, jetonDeGrille(ctx, C), [["A", ARDOISE, "1000 pièces", "0,95", "950,00"]], PENDANT);
    await deposerGrille(ctx, jetonDeGrille(ctx, P), [["P", PLACO, "50 plaques", "7,50", "375,00"]], PENDANT);
    await tacheDuMois(ctx, LIMITE);
    const r = (await resultatsDe(A.agent)).resultats;
    // Tout chez le généraliste : 1 400 + 80 = 1 480 ; les deux spécialistes : 1 325 + 160 = 1 485.
    expect(r.combinaisons[0]).toMatchObject({ libelle: "Tout chez Négoce Généraliste", totalHt: 1480, livraisons: 1, ecartHt: 0, phraseLivraisons: "1 livraison" });
    expect(r.combinaisons[1]).toMatchObject({ totalHt: 1485, livraisons: 2, ecartHt: 5, phraseLivraisons: "2 livraisons" });
    // L'ancien appel par négoce vaut « Tout chez lui » : le bon complet part au généraliste.
    const negoce = r.combinaisons[0].toutChez;
    await A.agent.post(`/v1/commande-du-mois/${(await resultatsDe(A.agent)).cycleId}/commander?maintenant=${LIMITE}`).send({ negoceId: negoce }).expect(200);
    expect(mailsVers(ctx, G).filter((m) => /bon de commande/i.test(m.subject))).toHaveLength(1);
    expect(mailsVers(ctx, C).filter((m) => /bon de commande/i.test(m.subject))).toHaveLength(0);
  });

  it("une commande avec seulement du placo n'envoie rien au spécialiste couverture : ni e-mail, ni grille, ni relance", async () => {
    const B = await couvreurAvecListe(ctx, "b@example.fr", "Plâtrerie B", "12 rue du Port, 22500 Paimpol", [{ libelle: PLACO, quantite: "80", unite: "plaques" }]);
    await B.agent.post(`/v1/projects/${B.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: B.articles, nature: "chantier" }).expect(201);
    await troisNegoces(B.agent, 50);
    const avantCloture = mailsVers(ctx, C).length;
    expect((await tacheDuMois(ctx, APRES_CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 2 });
    await tacheDuMois(ctx, "2026-10-21T17:00:00.000Z");
    expect(mailsVers(ctx, C)).toHaveLength(avantCloture);
    const compteC = await ctx.prisma.negoce.findFirstOrThrow({ where: { email: C } });
    expect(await ctx.prisma.grilleNegoce.count({ where: { negoceId: compteC.id } })).toBe(0);
    const grille = (email: string) => mailsVers(ctx, email).find((m) => /est prête/.test(m.subject))!.text;
    expect(grille(P)).toContain(PLACO);
    expect(grille(G)).toContain(PLACO);
  });
});
