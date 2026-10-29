import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ARDOISE, LITEAU, couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * LOT FINAL, point 6 (Greg, 29 octobre 2026) : à mi-délai, l'artisan est prévenu (« [Négoce] n'a pas encore répondu.
 * Appelle ton commercial : ta demande est peut-être dans ses spams. ») et le négoce reçoit « Votre client … attend votre
 * offre. Les réponses sont closes le … » ; la veille, l'artisan encore. Rien après une réponse ; deux rappels au plus.
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
const publique = () => request(ctx.app.getHttpServer());
const tache = (quand: Date) => publique().get(`/v1/internal/demandes-perso?maintenant=${encodeURIComponent(quand.toISOString())}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
const JOUR = 86_400_000;

describe("les relances du lot final", { timeout: 60_000 }, () => {
  it("mi-délai : l'artisan et le négoce ; veille : l'artisan ; puis plus rien ; jamais pour un négoce qui a répondu", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const envoi = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, dateBesoin: "2099-12-01", negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }] }).expect(201)).body;
    const r = await ctx.prisma.priceRequestRecipient.findFirstOrThrow({ where: { priceRequestId: envoi.id } });
    const envoyeLe = r.sentAt!;
    // Réponse attendue dans 4 jours (fin de journée) : mi-délai vers J+2,5, veille à J+4.
    const due = new Date(Date.UTC(envoyeLe.getUTCFullYear(), envoyeLe.getUTCMonth(), envoyeLe.getUTCDate() + 4));
    await ctx.prisma.priceRequest.update({ where: { id: envoi.id }, data: { dueDate: due } });

    expect((await tache(new Date(envoyeLe.getTime() + JOUR))).body).toEqual({ relances: 0, rappels: 0 });
    const mi = new Date(envoyeLe.getTime() + 3 * JOUR);
    expect((await tache(mi)).body).toEqual({ relances: 1, rappels: 1 });
    const artisan = mailsVers(ctx, "a@toitures.fr").at(-1)!;
    expect(artisan.subject).toBe("Négoce B n'a pas encore répondu");
    expect(artisan.text).toContain("Négoce B n'a pas encore répondu. Appelle ton commercial : ta demande est peut-être dans ses spams.");
    expect(artisan.text).toContain(`Renvoyer la demande : `);
    const negoce = mailsVers(ctx, "b@negoce.fr").at(-1)!;
    expect(negoce.subject).toBe("Toitures A attend votre offre");
    // La même date que la demande (« réponse souhaitée avant le … »).
    expect(negoce.text).toContain(`Les réponses sont closes le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(due).replace(/^1 /, "1er ")}.`);
    expect(negoce.html).toContain(">Répondre en ligne</a>");
    // Même jour : rien de plus.
    expect((await tache(new Date(mi.getTime() + 3_600_000))).body).toEqual({ relances: 0, rappels: 0 });
    // La veille : l'artisan seulement.
    expect((await tache(new Date(due.getTime() + 2 * 3_600_000))).body).toEqual({ relances: 0, rappels: 1 });
    // Ensuite plus rien : deux rappels au plus pour ce négoce.
    expect((await tache(new Date(due.getTime() + 20 * 3_600_000))).body).toEqual({ relances: 0, rappels: 0 });
    expect(mailsVers(ctx, "a@toitures.fr").filter((m) => /n'a pas encore répondu/.test(m.subject))).toHaveLength(2);
  });

  it("un négoce qui a répondu ou refusé n'est jamais relancé", async () => {
    const a = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const envoi = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, dateBesoin: "2099-12-01", negoces: [{ nom: "Négoce B", email: "b@negoce.fr" }] }).expect(201)).body;
    const r = await ctx.prisma.priceRequestRecipient.findFirstOrThrow({ where: { priceRequestId: envoi.id } });
    await ctx.prisma.priceRequestRecipient.update({ where: { id: r.id }, data: { refuseLe: new Date(), status: "declined" } });
    expect((await tache(new Date(r.sentAt!.getTime() + 10 * JOUR))).body).toEqual({ relances: 0, rappels: 0 });
  });
});
