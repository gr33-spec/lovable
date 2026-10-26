import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ARDOISE, couvreurAvecListe, deposerGrille, jetonDeGrille, mailsVers, tacheDuMois } from "./support/cycle.js";
import { inscrireNegoce } from "./support/negoce.js";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LE SUIVI DES DEMANDES DE PRIX (Greg, 24 octobre 2026), par l'API : « Demandes envoyées à N négoces de ton secteur »,
 * « Résultats le … », le compteur en temps réel, une notification par jour au plus (« 2 nouvelles réponses. »), jamais un
 * nom ni un prix avant les résultats ; à l'échéance, le bilan pour 1, plusieurs et toutes les réponses ; aucune réponse :
 * la liste passe toute seule à la commande suivante. Côté négoce : combien sont consultés, jamais lesquels. Côté admin :
 * le même compteur par commande et par département.
 *
 * Commande du 15 octobre 2026 : clôture le jeudi 15 à 12 h (10 h UTC), réponses avant le jeudi 22 à 18 h (16 h UTC),
 * relance le mercredi 21 à 18 h. Chaque cas a son département pour ne pas se mêler aux autres.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, GROUPE_ADMINS: process.env.GROUPE_ADMINS, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [cle, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[cle];
    else process.env[cle] = v;
  }
});

const AVANT = "2026-10-10T08:00:00.000Z";
const CLOTURE = "2026-10-15T10:01:00.000Z";
const PENDANT = "2026-10-16T09:00:00.000Z";
const LIMITE = "2026-10-22T16:01:00.000Z";
const APRES = "2026-10-23T08:00:00.000Z";
const nbsp = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

/** Un département, deux artisans, `n` négoces inscrits (ajoutés par le premier artisan). */
async function scene(dep: string, ville: string, n: number) {
  const adresse = `3 rue des Ajoncs, ${dep}300 ${ville}`;
  const A = await couvreurAvecListe(ctx, `a${dep}@toitures.fr`, `Toitures A${dep}`, adresse, [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }]);
  const B = await couvreurAvecListe(ctx, `b${dep}@toitures.fr`, `Toitures B${dep}`, adresse, [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
  const negoces: string[] = [];
  for (let i = 1; i <= n; i++) {
    const email = `n${i}-${dep}@negoce.fr`;
    await A.agent.post(`/v1/groupe/negoces?maintenant=${AVANT}`).send({ nom: `Négoce ${dep}-${i}`, email, familles: ["couverture"] }).expect(201);
    await inscrireNegoce(ctx, email, { depot: `ZA du Port, ${dep}300 ${ville}`, enseigne: `Négoce ${dep}-${i}`, departements: [dep], maintenant: AVANT });
    negoces.push(email);
  }
  for (const x of [A, B]) await x.agent.post(`/v1/projects/${x.projectId}/commande-du-mois?maintenant=${AVANT}`).send({ articles: x.articles, nature: "chantier" }).expect(201);
  return { A, B, negoces };
}
const vue = async (x: { agent: request.Agent }, maintenant: string, mois = "2026-10-15") =>
  ((await x.agent.get(`/v1/commande-du-mois?maintenant=${encodeURIComponent(maintenant)}`).expect(200)).body.commandes as { mois: string }[]).find((c) => c.mois === mois) as
    | undefined
    | { phase: string; demandes: { titre: string; resultatsLe: string | null; compteur: string | null; progression: number | null; phrase: string | null; boucle: boolean }; mesNegoces: string[]; report: string | null; suivi: { etape: number; phrase: string; aFaire: string | null }; resultats: unknown };
const repond = (email: string, maintenant: string) => deposerGrille(ctx, jetonDeGrille(ctx, email), [["A", ARDOISE, "3400 pièces", "0,92", ""]], maintenant).then((r) => expect(r.status).toBe(201));

describe("pendant le délai, puis à l'échéance", { timeout: 120_000 }, () => {
  it("plusieurs réponses : compteur en temps réel, notification une fois par jour, jamais un nom ni un prix", async () => {
    const { A, negoces } = await scene("22", "Lannion", 4);
    await tacheDuMois(ctx, CLOTURE);
    let v = (await vue(A, PENDANT))!;
    expect(v.phase).toBe("negoces");
    expect(v.demandes.titre).toBe("Demandes envoyées à 4 négoces de ton secteur");
    expect(nbsp(v.demandes.resultatsLe!)).toBe("Résultats le 22/10 à 18 h");
    expect(v.demandes.compteur).toBe("Aucun négoce sur 4 n'a encore répondu");
    expect(v.suivi).toMatchObject({ etape: 2, phrase: "Demandes envoyées à 4 négoces de ton secteur." });
    // Le négoce que A a mis dans la boucle : pas encore répondu.
    expect(v.mesNegoces).toContain("Ton négoce Négoce 22-1 n'a pas encore répondu.");

    // Deux réponses le même jour : une seule notification (« 1 nouvelle réponse »), la seconde attend le lendemain.
    const avantNotif = mailsVers(ctx, A.email).length;
    await repond(negoces[0]!, "2026-10-16T10:00:00.000Z");
    await repond(negoces[1]!, "2026-10-16T11:00:00.000Z");
    const notifs = mailsVers(ctx, A.email).slice(avantNotif);
    expect(notifs).toHaveLength(1);
    expect(nbsp(notifs[0]!.text)).toMatch(/^1 nouvelle réponse\. Résultats le 22\/10 à 18 h\./);
    // Jamais le nom du négoce ni un prix.
    expect(notifs[0]!.text).not.toMatch(/Négoce 22|0,92|€/);
    v = (await vue(A, "2026-10-16T12:00:00.000Z"))!;
    expect(v.demandes).toMatchObject({ compteur: "2 négoces sur 4 ont répondu", progression: 0.5 });
    expect(v.mesNegoces).toContain("Ton négoce Négoce 22-1 a répondu.");
    expect(JSON.stringify(v)).not.toMatch(/0,92|0\.92/);
    // Le lendemain, la réponse en attente part, regroupée.
    await tacheDuMois(ctx, "2026-10-17T07:05:00.000Z");
    const suite = mailsVers(ctx, A.email).slice(avantNotif + 1);
    expect(suite).toHaveLength(1);
    expect(suite[0]!.text).toMatch(/^1 nouvelle réponse\./);
    await repond(negoces[2]!, "2026-10-19T09:00:00.000Z");

    // À l'échéance : le bilan.
    await tacheDuMois(ctx, LIMITE);
    v = (await vue(A, APRES))!;
    expect(v.demandes.phrase).toBe("Sur 4 demandes, 3 négoces ont répondu. Voici le meilleur prix livré pour toi.");
    expect(v.suivi.aFaire).toBe("Sur 4 demandes, 3 négoces ont répondu. Voici le meilleur prix livré pour toi.");
    expect(v.resultats).not.toBeNull();
  });

  it("une seule réponse : « compare son prix à ta dernière facture »", async () => {
    const { A, negoces } = await scene("29", "Morlaix", 3);
    await tacheDuMois(ctx, CLOTURE);
    await repond(negoces[0]!, "2026-10-16T10:00:00.000Z");
    await tacheDuMois(ctx, LIMITE);
    expect((await vue(A, APRES))!.demandes.phrase).toBe("Sur 3 demandes, 1 négoce a répondu. Compare son prix à ta dernière facture.");
  });

  it("toutes les réponses : « Les 2 négoces ont répondu »", async () => {
    const { A, negoces } = await scene("35", "Rennes", 2);
    await tacheDuMois(ctx, CLOTURE);
    for (const n of negoces) await repond(n, "2026-10-16T10:00:00.000Z");
    expect((await vue(A, "2026-10-16T12:00:00.000Z"))!.demandes.compteur).toBe("Les 2 négoces ont répondu");
    await tacheDuMois(ctx, LIMITE);
    expect((await vue(A, APRES))!.demandes.phrase).toBe("Sur 2 demandes, 2 négoces ont répondu. Voici le meilleur prix livré pour toi.");
  });

  it("aucune réponse : relancés la veille (« On les a relancés »), puis la liste passe toute seule à la commande suivante", async () => {
    const { A, B } = await scene("56", "Vannes", 2);
    await tacheDuMois(ctx, CLOTURE);
    await tacheDuMois(ctx, "2026-10-21T16:30:00.000Z");
    expect((await vue(A, "2026-10-21T17:00:00.000Z"))!.demandes.phrase).toBe("Aucune réponse pour l'instant. On les a relancés.");
    const avantNotif = mailsVers(ctx, B.email).length;
    await tacheDuMois(ctx, LIMITE);
    // La commande du 15 octobre n'a plus de ligne ; celle du 1er novembre porte la liste et le message.
    expect(await vue(A, APRES)).toBeUndefined();
    const nov = (await vue(A, APRES, "2026-11-01"))!;
    expect(nov.report).toBe("Aucun négoce n'a répondu à la commande du 15 octobre. Ta liste passe automatiquement à la commande du 1er novembre.");
    expect(nov.phase).toBe("inscriptions");
    expect(JSON.stringify(nov)).toMatch(/2[\u00a0\u202f ]400 pièces/);
    // Chaque artisan est prévenu, une fois.
    expect(mailsVers(ctx, B.email).slice(avantNotif).filter((m) => /passe automatiquement/.test(m.text))).toHaveLength(1);
  });

  it("aucun négoce consulté : le bouton « Mets ton négoce dans la boucle »", async () => {
    const { A } = await scene("50", "Granville", 0);
    await tacheDuMois(ctx, CLOTURE);
    const v = (await vue(A, PENDANT))!;
    expect(v.demandes).toMatchObject({ titre: "Aucun négoce de ton secteur n'a encore son accès", compteur: null, boucle: true });
  });
});

describe("côté négoce et côté admin", { timeout: 120_000 }, () => {
  it("le négoce sait combien sont consultés, jamais lesquels ; l'admin voit le même compteur", async () => {
    const { negoces } = await scene("44", "Nantes", 3);
    await tacheDuMois(ctx, CLOTURE);
    await repond(negoces[0]!, "2026-10-16T10:00:00.000Z");
    const page = (await request(ctx.app.getHttpServer()).get(`/v1/grille/${jetonDeGrille(ctx, negoces[1]!)}?maintenant=${encodeURIComponent(PENDANT)}`).expect(200)).body as { consultation: string };
    expect(nbsp(page.consultation)).toBe("3 négoces consultés, résultats le 22/10 à 18 h.");
    expect(JSON.stringify(page)).not.toMatch(/Négoce 44-1|n1-44/);
    const admin = await signUpWithCompany(ctx.app, "greg@example.fr", "Admin");
    await doubleAuthentification(ctx, admin.agent, "greg@example.fr");
    const t = (await admin.agent.get("/v1/admin/commande-du-mois/negoces").expect(200)).body as { cycles: { zone: string; compteur: string }[] };
    expect(t.cycles.find((c) => c.zone === "44")!.compteur).toBe("44 · commande du 15 octobre : 1 négoce sur 3 a répondu");
  });
});
