import request from "supertest";
import { afterAll, beforeAll, expect, it } from "vitest";
import { ARDOISE, couvreurAvecListe, deposerGrille, jetonDeGrille, mailsVers, tacheDuMois } from "./support/cycle.js";
import { inscrireNegoce } from "./support/negoce.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * DROIT DE LA CONCURRENCE (Greg, 24 octobre 2026) : les prix d'un négoce ne sont JAMAIS communiqués à un autre négoce,
 * ni pendant ni après la consultation. Le test lit tout ce que le négoce B peut voir (sa page de grille avant et après les
 * résultats, son espace, chaque e-mail reçu) et cherche les prix et le nom du négoce A : rien ne doit sortir.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.GROUPE = "on";
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
/** Les prix de A, écrits de toutes les façons qu'un écran ou un e-mail pourrait les montrer. */
const PRIX_A = /0,8731|0\.8731|873,1|2\s?095,44|2095\.44|Négoce Alpha/;

it("rien du prix ni du nom d'un négoce n'atteint un autre négoce, pendant ni après la consultation", { timeout: 120_000 }, async () => {
  const A = await couvreurAvecListe(ctx, "a@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }]);
  const negoces = [
    { email: "alpha@negoce.fr", enseigne: "Négoce Alpha" },
    { email: "beta@negoce.fr", enseigne: "Négoce Beta" },
  ];
  const cookies: Record<string, string> = {};
  for (const n of negoces) {
    await A.agent.post(`/v1/groupe/negoces?maintenant=${AVANT}`).send({ nom: n.enseigne, email: n.email, familles: ["couverture"] }).expect(201);
    cookies[n.email] = (await inscrireNegoce(ctx, n.email, { depot: "ZA de Kerverzot, 22300 Lannion", enseigne: n.enseigne, departements: ["22"], maintenant: AVANT })).cookie;
  }
  await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${AVANT}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
  await tacheDuMois(ctx, "2026-10-15T10:01:00.000Z");
  const jetonB = jetonDeGrille(ctx, "beta@negoce.fr");
  expect((await deposerGrille(ctx, jetonDeGrille(ctx, "alpha@negoce.fr"), [["A", ARDOISE, "2400 pièces", "0,8731", "2 095,44"]], "2026-10-16T09:00:00.000Z")).status).toBe(201);
  expect((await deposerGrille(ctx, jetonB, [["A", ARDOISE, "2400 pièces", "0,95", "2 280,00"]], "2026-10-16T10:00:00.000Z")).status).toBe(201);

  const srv = () => request(ctx.app.getHttpServer());
  const vuB = async (maintenant: string) => [
    JSON.stringify((await srv().get(`/v1/grille/${jetonB}?maintenant=${encodeURIComponent(maintenant)}`).expect(200)).body),
    JSON.stringify((await srv().get(`/v1/negoce/compte?maintenant=${encodeURIComponent(maintenant)}`).set("cookie", cookies["beta@negoce.fr"]!).expect(200)).body),
  ];
  // Pendant la consultation : B sait seulement s'il est premier, jamais le prix de A.
  const pendant = await vuB("2026-10-17T09:00:00.000Z");
  expect(pendant.join("\n")).not.toMatch(PRIX_A);
  expect(pendant[0]).toContain("Vous n'êtes pas premier sur le total de la commande.");
  // Après les résultats : le message neutre, ni prix ni nom du retenu.
  await tacheDuMois(ctx, "2026-10-22T16:01:00.000Z");
  const apres = await vuB("2026-10-23T08:00:00.000Z");
  expect(apres.join("\n")).not.toMatch(PRIX_A);
  const mailsB = mailsVers(ctx, "beta@negoce.fr").map((m) => `${m.subject}\n${m.text}\n${m.html ?? ""}\n${(m.attachments ?? []).map((p) => Buffer.from(p.contentBase64, "base64").toString("latin1")).join("\n")}`);
  expect(mailsB.length).toBeGreaterThanOrEqual(3);
  expect(mailsB.join("\n")).not.toMatch(PRIX_A);
  // Et l'inverse : A ne voit pas le prix de B.
  expect(JSON.stringify((await srv().get(`/v1/grille/${jetonDeGrille(ctx, "alpha@negoce.fr")}?maintenant=2026-10-23T08:00:00.000Z`).expect(200)).body)).not.toMatch(/0,95|0\.95|2\s?280|Négoce Beta/);
});
