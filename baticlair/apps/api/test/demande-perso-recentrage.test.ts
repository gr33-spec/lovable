import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AbonnementService } from "../src/modules/abonnement/index.js";
import { ARDOISE, LITEAU, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * LA DEMANDE PERSO (Greg, 25 octobre 2026, recentrage) : envoi immédiat à ses négoces, chiffrage en ligne sans compte,
 * comparaison livraison comprise, commande et suivi, relance à 48 h ouvrées, clôture à la date de besoin, « Mes prix »
 * qui ne montre que ses propres prix ; en gratuit un seul négoce, en payant cinq.
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, CRON_SECRET: process.env.CRON_SECRET, ZONES_ACTIVES: process.env.ZONES_ACTIVES };
beforeAll(async () => {
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.ZONES_ACTIVES = "22";
  // L'essai et le gratuit d'avant (25 octobre 2026) ne valent plus qu'hors du mode automatique (achat groupé par métier, 27 octobre 2026).
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

const LIGNES = [
  { libelle: ARDOISE, quantite: "1000", unite: "pièces" },
  { libelle: LITEAU, quantite: "100", unite: "m" },
];
const lien = (texte: string) => /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(texte)?.[1] ?? null;
const jetonPour = (email: string) => lien(mailsVers(ctx, email).at(-1)!.text)!;
const publique = () => request(ctx.app.getHttpServer());

/** Le 22 a franchi le seuil des 10 artisans depuis longtemps : plus de payant offert, le gratuit s'applique. */
async function zoneSansOffre() {
  await ctx.prisma.parametreGroupe.create({ data: { cle: "zone:22:seuil_franchi", valeur: "2026-01-01T00:00:00.000Z" } });
}

describe("la demande perso", () => {
  it("gratuit : un seul négoce par demande, le deuxième ouvre le paywall", async () => {
    await zoneSansOffre();
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    await ctx.app.get(AbonnementService).finirEssai(a.companyId);
    const droits = (await a.agent.get("/v1/droits").expect(200)).body;
    expect(droits).toMatchObject({ formule: "gratuit", negocesParDemande: 1, regroupements: false, zone: "22", zoneActive: true });
    const deux = await a.agent
      .post(`/v1/projects/${a.projectId}/demandes-perso`)
      .send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce Un", email: "un@negoce.fr" }, { nom: "Négoce Deux", email: "deux@negoce.fr" }] })
      .expect(402);
    expect(deux.body.error.details).toMatchObject({ refus: "negoces", phrase: expect.stringContaining("un seul négoce") });
    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce Un", email: "un@negoce.fr" }] }).expect(201);
    expect(lien(mailsVers(ctx, "un@negoce.fr").at(-1)!.text)).toBeTruthy();
    // Sans l'accord pour transmettre son identité, rien ne part.
    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: false, articles: a.articles, negoces: [{ nom: "Négoce Un", email: "un@negoce.fr" }] }).expect(400);
  });

  it("payant : cinq négoces, chiffrage en ligne, comparaison livrée, commande, confirmation, livrée", { timeout: 60_000 }, async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    // Un négoce inscrit de la zone, proposé à l'artisan (sans son e-mail).
    const compte = await ctx.prisma.compteNegoce.create({ data: { email: "zone@negoce.fr", enseigne: "Négoce de la Zone", inscritLe: new Date(), departements: ["22"] } });
    const zone = await ctx.prisma.negoce.create({ data: { nom: "Négoce de la Zone", email: "zone@negoce.fr", departement: "22", generaliste: true, compteId: compte.id } });
    const proposes = (await a.agent.get(`/v1/projects/${a.projectId}/demandes-perso/negoces`).expect(200)).body;
    expect(proposes).toMatchObject({ zone: "22", max: 5, zoneNegoces: [{ negoceId: zone.id, nom: "Négoce de la Zone", generaliste: true }] });
    expect(JSON.stringify(proposes.zoneNegoces)).not.toContain("zone@negoce.fr");

    const negoces = [{ negoceId: zone.id }, ...["b", "c", "d", "e"].map((x) => ({ nom: `Négoce ${x.toUpperCase()}`, email: `${x}@negoce.fr` }))];
    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "commander", accord: true, articles: a.articles, negoces: [...negoces, { nom: "Six", email: "f@negoce.fr" }] }).expect(400);
    const envoi = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "commander", accord: true, articles: a.articles, dateBesoin: "2026-12-01", negoces }).expect(201)).body;
    expect(envoi.destinataires).toHaveLength(5);
    const mail = mailsVers(ctx, "b@negoce.fr").at(-1)!;
    expect(mail.text).toContain("Je compte commander");
    expect(mail.text).toContain("sans compte");

    // La page du négoce : la liste et le nom de l'artisan (il a donné son accord), sans aucun prix.
    const page = (await publique().get(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).expect(200)).body;
    expect(page).toMatchObject({ artisan: "Toitures A", but: "commander", etat: "a_chiffrer", validiteMin: 7 });
    const cles = (page.lignes as { cle: string; designation: string }[]).map((l) => l.cle);
    expect(cles.length).toBe(2);

    // Validité trop courte : refusée ; grille partielle : acceptée.
    await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).send({ prix: { [cles[0]!]: 1, [cles[1]!]: 1 }, livraisonHt: 80, delaiJours: 3, validiteJours: 6 }).expect(400);
    const b = (await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).send({ prix: { [cles[0]!]: 1, [cles[1]!]: 1 }, livraisonHt: 80, delaiJours: 3, validiteJours: 7 }).expect(200)).body;
    // Première réponse sans compte : l'invitation à créer son compte négoce.
    expect(b.compte).toMatchObject({ lien: expect.stringMatching(/\/negoce\/rejoindre\//) });
    await publique().post(`/v1/public/chiffrer/${jetonPour("c@negoce.fr")}`).send({ prix: { [cles[0]!]: 1.05, [cles[1]!]: 1 }, livraisonHt: 0, delaiJours: 2, validiteJours: 14 }).expect(200);
    await publique().post(`/v1/public/chiffrer/${jetonPour("d@negoce.fr")}`).send({ prix: { [cles[0]!]: 0.5 }, livraisonHt: 0, delaiJours: null, validiteJours: 7 }).expect(200);
    await publique().post(`/v1/public/chiffrer/${jetonPour("e@negoce.fr")}/refuser`).expect(200);
    // L'artisan est prévenu.
    expect(mailsVers(ctx, "a@toitures.fr").some((m) => /a chiffré ta demande/.test(m.subject))).toBe(true);

    const vue = (await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body;
    expect(vue.offres.map((o: { nom: string; totalLivreHt: number; ecartHt: number | null; complete: boolean }) => [o.nom, o.totalLivreHt, o.ecartHt, o.complete])).toEqual([
      ["Négoce C", 1150, 0, true],
      ["Négoce B", 1180, 30, true],
      ["Négoce D", 500, null, false],
    ]);
    expect(vue.destinataires.find((d: { nom: string }) => d.nom === "Négoce E").statut).toBe("refuse");

    // Commander chez C : le bon part au négoce, une seule commande par demande.
    const c = vue.offres[0].recipientId as string;
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/commander`).send({ recipientId: c }).expect(200);
    const bon = mailsVers(ctx, "c@negoce.fr").at(-1)!;
    expect(bon.subject).toMatch(/^Bon de commande de Toitures A \(1 150,00 € HT livré\)$/);
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/commander`).send({ recipientId: vue.offres[1].recipientId }).expect(409);
    await publique().post(`/v1/public/chiffrer/${lien(bon.text)}/confirmer`).expect(200);
    expect((await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body.commande).toMatchObject({ nom: "Négoce C", suivi: "confirmee" });
    await a.agent.post(`/v1/demandes-perso/${envoi.id}/livree`).send({ recipientId: c }).expect(200);
    expect((await a.agent.get(`/v1/demandes-perso/${envoi.id}`).expect(200)).body.commande.suivi).toBe("livree");
  });

  it("relance à 48 h ouvrées, une seule fois ; clôture à la date de besoin", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const envoi = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, dateBesoin: "2099-12-01", negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }] }).expect(201)).body;
    const envoyeLe = (await ctx.prisma.priceRequestRecipient.findFirstOrThrow({ where: { priceRequestId: envoi.id } })).sentAt!;
    const tache = (quand: Date) => publique().get(`/v1/internal/demandes-perso?maintenant=${encodeURIComponent(quand.toISOString())}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
    expect((await tache(new Date(envoyeLe.getTime() + 3_600_000))).body).toEqual({ relances: 0 });
    // Quatre jours plus tard (au moins 48 h ouvrées, week-end compris) : une relance.
    expect((await tache(new Date(envoyeLe.getTime() + 4 * 86_400_000))).body).toEqual({ relances: 1 });
    expect(mailsVers(ctx, "b@negoce.fr").at(-1)!.subject).toMatch(/^Rappel : la demande de prix de Toitures A attend votre réponse$/);
    expect((await tache(new Date(envoyeLe.getTime() + 6 * 86_400_000))).body).toEqual({ relances: 0 });
    // La demande close, plus de chiffrage.
    await ctx.prisma.priceRequest.update({ where: { id: envoi.id }, data: { closLe: new Date(Date.now() - 1000) } });
    const r = await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).send({ prix: { "0": 1 }, livraisonHt: 0, delaiJours: 1, validiteJours: 7 }).expect(409);
    expect(r.body.error.details.reason).toBe("demande_close");
  });

  it("« Mes prix » ne montre que ses propres prix ; le repère « Ton dernier prix » sur une nouvelle demande", { timeout: 60_000 }, async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const b = await couvreurAvecListe(ctx, "b@toitures.fr", "Toitures B", "8 rue du Port, 22500 Paimpol", LIGNES);
    const da = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }] }).expect(201)).body;
    await publique().post(`/v1/public/chiffrer/${jetonPour("x@negoce.fr")}`).send({ prix: { "0": 1.12, "1": 0.9 }, livraisonHt: 0, delaiJours: 2, validiteJours: 7 }).expect(200);
    await b.agent.post(`/v1/projects/${b.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: b.articles, negoces: [{ nom: "Négoce Y", email: "y@negoce.fr" }] }).expect(201);
    await publique().post(`/v1/public/chiffrer/${jetonPour("y@negoce.fr")}`).send({ prix: { "0": 0.77 }, livraisonHt: 0, delaiJours: 2, validiteJours: 7 }).expect(200);

    const mesA = (await a.agent.get("/v1/mes-prix").expect(200)).body;
    expect(mesA.articles.map((x: { designation: string; dernier: { prixHt: number; negoce: string } }) => [x.designation, x.dernier.prixHt, x.dernier.negoce]).sort()).toEqual([
      [ARDOISE, 1.12, "Négoce X"],
      [LITEAU, 0.9, "Négoce X"],
    ]);
    expect(JSON.stringify(mesA)).not.toContain("0.77");
    expect(JSON.stringify(mesA)).not.toContain("Négoce Y");
    // La vue de la demande porte le repère sur chaque ligne.
    const vue = (await a.agent.get(`/v1/demandes-perso/${da.id}`).expect(200)).body;
    expect(vue.lignes[0].repere).toBe("Ton dernier prix pour cet article : 1,12 € HT / pièce");
    // Une autre entreprise ne voit jamais la demande de A.
    await b.agent.get(`/v1/demandes-perso/${da.id}`).expect(404);
  });
});
