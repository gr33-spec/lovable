import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ARDOISE, LITEAU, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type Agent, type TestContext } from "./support/test-app.js";

/**
 * LE PARCOURS DU NÉGOCE (Greg, 6 novembre 2026, prompt maître point 13) : par le lien sécurisé, « Je vais répondre »,
 * « Je ne peux pas chiffrer » (motif), « J'ai besoin d'une précision » ; l'artisan voit chaque intention dans son suivi
 * et répond à la précision depuis MOBIIZ ; la réponse part au négoce et s'affiche sur sa page ; jamais un autre négoce.
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, CRON_SECRET: process.env.CRON_SECRET, ZONES_ACTIVES: process.env.ZONES_ACTIVES };
beforeAll(async () => {
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.ZONES_ACTIVES = "22";
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

async function demandeEnvoyee() {
  const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
  const envoi = (
    await a.agent
      .post(`/v1/projects/${a.projectId}/demandes-perso`)
      .send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }, { nom: "Négoce C", email: "c@negoce.fr" }] })
      .expect(201)
  ).body;
  return { a, demandeId: envoi.id as string };
}
const destinataire = async (a: { agent: Agent; projectId: string }, demandeId: string, nom: string) =>
  (await a.agent.get(`/v1/projects/${a.projectId}/price-requests`).expect(200)).body.items
    .find((d: { id: string }) => d.id === demandeId)
    .recipients.find((r: { supplier: { name: string } }) => r.supplier.name === nom);

describe("le parcours du négoce", () => {
  it("« Je vais répondre » se voit dans le suivi de l'artisan, sans e-mail ; une seconde fois ne change rien", async () => {
    const { a, demandeId } = await demandeEnvoyee();
    const avantMails = mailsVers(ctx, "a@toitures.fr").length;
    await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}/intention`).expect(200);
    await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}/intention`).expect(200);
    expect((await publique().get(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}`).expect(200)).body.vaRepondre).toBe(true);
    const b = await destinataire(a, demandeId, "Négoce B");
    expect(b.negoce.vaRepondreLe).toEqual(expect.any(String));
    expect((await destinataire(a, demandeId, "Négoce C")).negoce.vaRepondreLe).toBeNull();
    expect(mailsVers(ctx, "a@toitures.fr").length).toBe(avantMails);
  });

  it("« Je ne peux pas chiffrer » avec un motif : l'artisan est prévenu une fois, le motif s'affiche, la ligne passe « Ne chiffre pas »", async () => {
    const { a, demandeId } = await demandeEnvoyee();
    await publique().post(`/v1/public/chiffrer/${jetonPour("c@negoce.fr")}/refuser`).send({ motif: "Pas d'ardoise d'Espagne en stock" }).expect(200);
    await publique().post(`/v1/public/chiffrer/${jetonPour("c@negoce.fr")}/refuser`).send({}).expect(200);
    const c = await destinataire(a, demandeId, "Négoce C");
    expect(c.status).toBe("declined");
    const refus = mailsVers(ctx, "a@toitures.fr").filter((m) => /ne peut pas chiffrer/.test(m.subject));
    expect(refus).toHaveLength(1);
    expect(refus[0]!.text).toContain("Pas d'ardoise d'Espagne en stock");
    expect(refus[0]!.text).not.toMatch(/Négoce B/);
    // Le second refus (sans motif) garde l'état « refusé » ; le motif est celui du dernier geste.
    expect(c.negoce.refusMotif).toBeNull();
  });

  it("« J'ai besoin d'une précision » : la question va à l'artisan, sa réponse va au négoce et s'affiche sur sa page", async () => {
    const { a, demandeId } = await demandeEnvoyee();
    const jetonB = jetonPour("b@negoce.fr");
    await publique().post(`/v1/public/chiffrer/${jetonB}/precision`).send({ question: "x" }).expect(400);
    await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}/precision`).send({ question: "Les liteaux : traités classe 2 ou classe 4 ?" }).expect(200);
    const mail = mailsVers(ctx, "a@toitures.fr").find((m) => /a besoin d'une précision/.test(m.subject))!;
    expect(mail.text).toContain("Les liteaux : traités classe 2 ou classe 4 ?");
    expect(mail.text).toContain("?onglet=suivi");
    const b = await destinataire(a, demandeId, "Négoce B");
    expect(b.negoce.precision).toMatchObject({ question: "Les liteaux : traités classe 2 ou classe 4 ?", reponse: null });
    // « À faire » : la question attend l'artisan, puis disparaît une fois répondue.
    const aFaire = async () => (await a.agent.get("/v1/rapprochements/actions").expect(200)).body.items.filter((i: { cle: string }) => i.cle.startsWith("precision:"));
    expect(await aFaire()).toEqual([expect.objectContaining({ texte: "Négoce B a besoin d'une précision", href: `/chantiers/${a.projectId}?onglet=suivi` })]);
    await a.agent.post(`/v1/price-request-recipients/${b.id}/precision`).send({ reponse: "Classe 4, autoclave vert." }).expect(200);
    expect(await aFaire()).toEqual([]);
    const auNegoce = mailsVers(ctx, "b@negoce.fr").at(-1)!;
    expect(auNegoce.subject).toBe("Réponse à votre question : Toitures A");
    expect(auNegoce.text).toContain("Classe 4, autoclave vert.");
    expect(mailsVers(ctx, "c@negoce.fr").some((m) => /Classe 4/.test(m.text))).toBe(false);
    const page = (await publique().get(`/v1/public/chiffrer/${jetonB}`).expect(200)).body;
    expect(page.precision).toMatchObject({ question: "Les liteaux : traités classe 2 ou classe 4 ?", reponse: "Classe 4, autoclave vert." });
    // Une précision sans question ne se répond pas.
    const c = await destinataire(a, demandeId, "Négoce C");
    expect((await a.agent.post(`/v1/price-request-recipients/${c.id}/precision`).send({ reponse: "?" })).status).toBe(400);
  });

  it("isolation : une autre entreprise ne répond pas à la précision d'un négoce de A", async () => {
    const { a, demandeId } = await demandeEnvoyee();
    await publique().post(`/v1/public/chiffrer/${jetonPour("b@negoce.fr")}/precision`).send({ question: "Quel accès pour le camion ?" }).expect(200);
    const b = await destinataire(a, demandeId, "Négoce B");
    const autre = await couvreurAvecListe(ctx, "x@toitures.fr", "Toitures X", "8 rue du Port, 22700 Perros-Guirec", LIGNES);
    expect((await autre.agent.post(`/v1/price-request-recipients/${b.id}/precision`).send({ reponse: "Par la rue" })).status).toBe(404);
    expect((await destinataire(a, demandeId, "Négoce B")).negoce.precision.reponse).toBeNull();
  });
});

describe("le coût réellement livré (Greg, 7 novembre 2026)", () => {
  it("le négoce dit livraison en plusieurs fois, minimum et déchargement ; la disponibilité se déduit ; l'artisan le voit", async () => {
    const { a, demandeId } = await demandeEnvoyee();
    const jeton = jetonPour("b@negoce.fr");
    const jetonC = jetonPour("c@negoce.fr");
    const cles = ((await publique().get(`/v1/public/chiffrer/${jeton}`).expect(200)).body.lignes as { cle: string }[]).map((l) => l.cle);
    await publique().post(`/v1/public/chiffrer/${jeton}`).send({ prix: { [cles[0]!]: 1.1 }, livraisonHt: 60, delaiJours: 5, validiteJours: 14, livraisons: "plusieurs", minimumCommandeHt: 500, dechargement: "Hayon, pas de grue" }).expect(200);
    const page = (await publique().get(`/v1/public/chiffrer/${jeton}`).expect(200)).body;
    expect(page.reponse).toMatchObject({ disponibilite: "partielle", lignesChiffrees: 1, lignesDemandees: 2, livraisons: "plusieurs", minimumCommandeHt: 500, dechargement: "Hayon, pas de grue" });
    // Tout est facultatif : la réponse d'avant passe encore telle quelle.
    await publique().post(`/v1/public/chiffrer/${jetonC}`).send({ prix: { [cles[0]!]: 1.2, [cles[1]!]: 0.9 }, livraisonHt: 0, delaiJours: null, validiteJours: 14 }).expect(200);
    expect((await publique().get(`/v1/public/chiffrer/${jetonC}`).expect(200)).body.reponse).toMatchObject({ disponibilite: "complete", livraisons: null, minimumCommandeHt: null });
    const b = await destinataire(a, demandeId, "Négoce B");
    expect(b.negoce.conditions).toEqual({ livraisons: "plusieurs", minimumCommandeHt: 500, dechargement: "Hayon, pas de grue" });
  });
});
