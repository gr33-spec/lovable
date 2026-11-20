import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * LOT 4 (Greg, 6 novembre 2026, prompt maître points 11 et 12) : la reconfirmation avant la clôture (une liste non
 * reconfirmée ne part pas, sans être comptée comme une sortie) et la comparaison au coût total livré (l'offre du groupe
 * face à la meilleure offre individuelle de l'artisan, sur ses mêmes lignes, jamais une économie promise).
 * Harnais repris de `achat-groupe.test.ts`.
 */
let ctx: TestContext;
const VARS = ["RECONFIRMATION_GROUPE", "GROUPE", "ZONES_ACTIVES", "GROUPE_ADMINS", "CRON_SECRET", "PRIX_REPERES", "SEUIL_VOLUME_MIN", "EMAIL_DOMAINE", "MODE_REGROUPEMENT", "COMMISSION_DEFAUT"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  process.env.RECONFIRMATION_GROUPE = "on";
  delete process.env.MODE_REGROUPEMENT; // le défaut : automatique
  delete process.env.COMMISSION_DEFAUT; // le défaut : 0
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.PRIX_REPERES = "ardoise:pieces=1.2";
  process.env.SEUIL_VOLUME_MIN = "couverture=1000";
  process.env.EMAIL_DOMAINE = "mobiiz.test";
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
const LITEAU = "Liteaux 27×38";
const publique = () => request(ctx.app.getHttpServer());
const jour = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
const tache = (maintenant: string) => publique().get(`/v1/internal/achats-groupes?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
const artisan = (n: number, adresse = "3 rue des Ajoncs, 22300 Lannion") => couvreurAvecListe(ctx, `artisan${n}@toitures.fr`, `Toitures ${n}`, adresse, [{ libelle: A3222, quantite: "100", unite: "pièces" }]);
const engagement = (o: Record<string, unknown> = {}) => ({
  lignes: [
    { designation: A3222, quantite: 1800, unite: "pièces" },
    { designation: LITEAU, quantite: 400, unite: "m" },
  ],
  livraison: "22300 Lannion",
  dateBesoin: jour(30),
  negoces: [{ nom: "Négoce X", email: "x@negoce.fr", telephone: "02 96 00 00 01" }],
  engagement: true,
  ...o,
});
const jetonDe = (email: string) => /\/achat-groupe\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, email).filter((m) => / : achat groupé /.test(m.subject)).at(-1)!.text)![1]!;
async function admin() {
  const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
  await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
  return greg;
}

describe("clôture, reconfirmation, coût total livré", { timeout: 240_000 }, () => {
  it("dans les 48 h avant la clôture, la reconfirmation est demandée ; reconfirmée, la liste part ; sinon elle reste individuelle, sans sortie comptée", async () => {
    const a = await artisan(1);
    const b = await artisan(2, "8 rue du Port, 22700 Perros-Guirec");
    const la = (await a.agent.post("/v1/achats-groupes").send(engagement()).expect(201)).body;
    const lb = (await b.agent.post("/v1/achats-groupes").send(engagement({ negoces: [{ nom: "Négoce Z", email: "z@negoce.fr" }] })).expect(201)).body;
    expect(lb.achatId).toBe(la.achatId);
    // Engagés depuis longtemps (plus de 3 jours avant la clôture).
    await ctx.prisma.besoinNegocie.updateMany({ data: { engageLe: new Date(Date.now() - 10 * 86_400_000) } });
    const achat = await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: la.achatId } });
    const veille = new Date(achat.clotureLe!.getTime() - 24 * 3_600_000).toISOString();
    expect((await tache(veille)).body).toMatchObject({ reconfirmations: 2 });
    expect((await tache(veille)).body).toMatchObject({ reconfirmations: 0 });
    let va = (await a.agent.get(`/v1/achats-groupes/${la.besoinId}`).expect(200)).body;
    expect(va.reconfirmation).toMatchObject({ faiteLe: null, phrase: expect.stringContaining("sans ta reconfirmation, ta liste ne part pas") });
    va = (await a.agent.post(`/v1/achats-groupes/${la.besoinId}/reconfirmer`).expect(200)).body;
    expect(va.reconfirmation.faiteLe).toEqual(expect.any(String));
    // Isolation : B ne reconfirme pas pour A.
    expect((await b.agent.post(`/v1/achats-groupes/${la.besoinId}/reconfirmer`)).status).toBe(404);

    await tache(new Date(achat.clotureLe!.getTime() + 3_600_000).toISOString());
    expect((await ctx.prisma.besoinNegocie.findUniqueOrThrow({ where: { id: la.besoinId } })).statut).toBe("declare");
    expect((await ctx.prisma.besoinNegocie.findUniqueOrThrow({ where: { id: lb.besoinId } })).statut).toBe("retire");
    expect((await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: la.achatId } })).statut).toBe("consultation");
    // Seul le négoce de A est consulté ; B est prévenu et n'est pas exclu.
    expect(mailsVers(ctx, "x@negoce.fr").some((m) => / : achat groupé /.test(m.subject))).toBe(true);
    expect(mailsVers(ctx, "z@negoce.fr").some((m) => / : achat groupé /.test(m.subject))).toBe(false);
    const vb = (await b.agent.get(`/v1/achats-groupes/${lb.besoinId}`).expect(200)).body;
    expect(vb.reconfirmation).toMatchObject({ nonFaite: true, phrase: expect.stringContaining("ce n'est pas compté comme une sortie") });
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: b.companyId } })).achatsGroupesExclusJusquau).toBeNull();
    // Trop tard pour reconfirmer après la clôture.
    expect((await a.agent.post(`/v1/achats-groupes/${la.besoinId}/reconfirmer`)).status).toBe(409);
  });

  it("le coût total livré : pour ses lignes, l'offre du groupe face à sa meilleure offre individuelle", async () => {
    const a = await couvreurAvecListe(ctx, "artisan5@toitures.fr", "Toitures 5", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: A3222, quantite: "1800", unite: "pièces" }]);
    // Sa demande individuelle, chiffrée par lien : 1,30 € la pièce, 40 € de livraison.
    await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce K", email: "k@negoce.fr" }] }).expect(201);
    const jetonK = /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, "k@negoce.fr").at(-1)!.text)![1]!;
    await publique().post(`/v1/public/chiffrer/${jetonK}`).send({ prix: { "0": 1.3 }, livraisonHt: 40, delaiJours: 3, validiteJours: 30 }).expect(200);
    // L'achat groupé depuis la liste, la consultation, la réponse du négoce X (1,15 € livré), la publication.
    const d = (await a.agent.get(`/v1/projects/${a.projectId}/achat-groupe`).expect(200)).body;
    const l = (await a.agent.post(`/v1/projects/${a.projectId}/achat-groupe`).send({ confirmees: [d.lignes[0].key], dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }], engagement: true }).expect(201)).body;
    const greg = await admin();
    await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/avancer`).send({ etape: "cloture" }).expect(200);
    const page = (await publique().get(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).expect(200)).body;
    await publique().post(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).send({ accepteConditions: true, prix: Object.fromEntries(page.lignes.map((x: { cle: string }) => [x.cle, 1.15])) }).expect(200);
    await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/avancer`).send({ etape: "echeance" }).expect(200);
    await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/publier`).expect(200);
    const vue = (await a.agent.get(`/v1/achats-groupes/${l.besoinId}`).expect(200)).body;
    expect(vue.resultat.coutLivre).toMatchObject({
      lignes: 1,
      groupe: { totalLivreHt: 2070, complet: true },
      individuelle: { nom: "Négoce K", totalLivreHt: 2380, complet: true },
      ecartHt: -310,
    });
    expect(vue.resultat.coutLivre.phrase).toBe("Pour cette ligne, livré : achat groupé 2 070,00 € HT ; ta meilleure offre individuelle (Négoce K) 2 380,00 € HT. Écart : 310,00 € HT de moins en groupe.");
  });
});
