import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { inscrireNegoce, lienInvitation } from "./support/negoce.js";
import { ARDOISE, couvreurAvecListe, mailsVers, tacheDuMois } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * L'ESPACE NÉGOCE AUTONOME (Greg, 23 octobre 2026), points 1 à 3 et 8 : le lien d'invitation unique par négoce (90 jours,
 * jamais le nom de l'artisan), l'inscription en une page (dépôts géocodés, paliers, départements, conditions), le lien
 * magique et la session de 30 jours, l'abonnement à la zone (grille à chaque clôture, rappels aux non-inscrits trois fois
 * au plus), le compte (modifier, se désabonner, supprimer), le tableau admin.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, CRON_SECRET: process.env.CRON_SECRET, GROUPE_ADMINS: process.env.GROUPE_ADMINS };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.GROUPE_ADMINS = "greg@example.fr";
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
const srv = () => request(ctx.app.getHttpServer());
const ajouter = (agent: request.Agent, email: string, nom = "Négoce Test", maintenant = T0) => agent.post(`/v1/groupe/negoces?maintenant=${maintenant}`).send({ nom, email, familles: ["couverture"] }).expect(201);
async function artisan(email: string, nom: string, adresse = "3 rue des Ajoncs, 22300 Lannion") {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom);
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: null, phone: null, email: null }).expect(200);
  return { agent, companyId };
}
const PALIERS = { gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 60, prixHt: 80 }], maxKm: 100 };

describe("1. le lien d'invitation unique par négoce", { timeout: 60_000 }, () => {
  it("le même négoce ajouté par deux artisans : un seul compte, un seul e-mail d'invitation (une semaine), jamais le nom de l'artisan, lien valable 90 jours", async () => {
    const a = await artisan("a@example.fr", "Toitures A");
    const b = await artisan("b@example.fr", "Toitures B", "8 rue du Port, 22500 Paimpol");
    await ajouter(a.agent, "contact@negoce-ponant.fr", "Négoce du Ponant");
    await ajouter(b.agent, "contact@negoce-ponant.fr", "Ponant");
    expect(await ctx.prisma.compteNegoce.count()).toBe(1);
    expect(await ctx.prisma.negoce.count({ where: { compteId: { not: null } } })).toBe(1);
    const mails = mailsVers(ctx, "contact@negoce-ponant.fr");
    expect(mails).toHaveLength(1);
    expect(mails[0]!.text).toContain("Un artisan de votre secteur (22) vous a ajouté");
    expect(mails[0]!.text).not.toMatch(/Toitures A|Toitures B/);
    const jeton = lienInvitation(ctx, "contact@negoce-ponant.fr");
    // La page d'inscription : préremplie, sans artisan.
    const page = (await srv().get(`/v1/negoce/invitation/${jeton}?maintenant=${T0}`).expect(200)).body;
    expect(page).toMatchObject({ email: "contact@negoce-ponant.fr", enseigne: "Négoce du Ponant", inscrit: false, departements: ["22"], paliersDefaut: PALIERS });
    expect(JSON.stringify(page)).not.toMatch(/Toitures/);
    // 89 jours plus tard, le lien vaut ; 91 jours, non.
    await srv().get(`/v1/negoce/invitation/${jeton}?maintenant=2027-01-07T07:00:00.000Z`).expect(200);
    await srv().get(`/v1/negoce/invitation/${jeton}?maintenant=2027-01-09T07:00:00.000Z`).expect(404);
    await srv().get(`/v1/negoce/invitation/jeton-bidon.signature`).expect(404);
    // Un nouvel ajout huit jours plus tard : nouvel e-mail, lien régénéré.
    const c = await artisan("c@example.fr", "Toitures C");
    await ajouter(c.agent, "contact@negoce-ponant.fr", "Ponant", "2026-10-18T07:00:00.000Z");
    expect(mailsVers(ctx, "contact@negoce-ponant.fr")).toHaveLength(2);
  });

  it("dédoublonné par SIRET : deux e-mails pour le même SIRET font un seul compte", async () => {
    await ctx.prisma.negoceSirene.create({ data: { siret: "12345678900011", siren: "123456789", nom: "POINT D'EPREUVE LANNION", adresse: "ZA de Kerampont", codePostal: "22300", commune: "LANNION", departement: "22", naf: "46.73A", importeLe: new Date() } });
    const a = await artisan("a@example.fr", "Toitures A");
    await a.agent.post(`/v1/groupe/negoces/boucle?maintenant=${T0}`).send({ email: "lannion@pointdepreuve.fr", siret: "12345678900011" }).expect(200);
    const b = await artisan("b@example.fr", "Toitures B");
    const r = await b.agent.post(`/v1/groupe/negoces/boucle?maintenant=${T0}`).send({ email: "vendeur@pointdepreuve.fr", siret: "12345678900011" }).expect(200);
    expect(await ctx.prisma.compteNegoce.count()).toBe(1);
    expect(r.body.lienInvitation).toBe((await ctx.prisma.compteNegoce.findFirstOrThrow()).id && r.body.lienInvitation);
    expect(lienInvitation(ctx, "lannion@pointdepreuve.fr")).toBe(/\/negoce\/rejoindre\/(.+)$/.exec(r.body.lienInvitation)![1]);
  });
});

describe("2. l'inscription en une page", { timeout: 60_000 }, () => {
  it("dépôts géocodés, paliers, départements cochés d'après les dépôts, conditions obligatoires ; ensuite la phrase de la prochaine clôture et une session", async () => {
    const a = await artisan("a@example.fr", "Toitures A");
    await ajouter(a.agent, "contact@negoce-ponant.fr", "Négoce du Ponant");
    const jeton = lienInvitation(ctx, "contact@negoce-ponant.fr");
    const corps = { jeton, email: "contact@negoce-ponant.fr", siret: null, enseigne: "Négoce du Ponant", telephone: "02 96 00 00 00", depots: [{ adresse: "ZA de Kerfolic, 22500 Paimpol" }, { adresse: "2 rue de Siam, 29200 Brest" }], livraison: PALIERS, departements: null, conditions: true };
    expect((await srv().post(`/v1/negoce/inscription?maintenant=${T0}`).send({ ...corps, conditions: false }).expect(400)).body.error.details).toMatchObject({ reason: "conditions_requises" });
    expect((await srv().post(`/v1/negoce/inscription?maintenant=${T0}`).send({ ...corps, livraison: { gratuiteJusquaKm: 50, paliers: [{ jusquaKm: 40, prixHt: 10 }], maxKm: 100 } }).expect(400)).body.error.details).toMatchObject({ reason: "paliers_invalides" });
    expect((await srv().post(`/v1/negoce/inscription?maintenant=${T0}`).send({ ...corps, siret: "123" }).expect(400)).body.error.details).toMatchObject({ reason: "siret_invalide" });
    const r = await srv().post(`/v1/negoce/inscription?maintenant=${T0}`).send(corps).expect(201);
    expect(r.body).toEqual({ phrase: "Vous recevrez la prochaine grille de votre secteur à la clôture du 15 octobre à 12 h.", departements: ["22", "29"] });
    const cookie = (r.headers["set-cookie"] as unknown as string[])[0]!;
    expect(cookie).toMatch(/^bc_negoce=.+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
    const compte = await ctx.prisma.compteNegoce.findFirstOrThrow({ include: { depots: true, abonnements: true } });
    expect(compte).toMatchObject({ inscritLe: new Date(T0), conditionsVersion: "2026-10-24", departements: ["22", "29"] });
    expect(compte.depots.map((d) => [d.codePostal, d.departement, d.lat !== null])).toEqual([
      ["22500", "22", true],
      ["29200", "29", true],
    ]);
    // Une ligne « negoce » par département desservi (l'abonnement), couverture, reliée au compte.
    expect(compte.abonnements.map((n) => [n.departement, n.familles, n.stopLe]).sort()).toEqual([
      ["22", ["couverture"], null],
      ["29", ["couverture"], null],
    ]);
    // Le lien d'invitation renvoie désormais vers la connexion ; une seconde inscription est refusée.
    expect((await srv().get(`/v1/negoce/invitation/${jeton}?maintenant=${T0}`).expect(200)).body.inscrit).toBe(true);
    expect((await srv().post(`/v1/negoce/inscription?maintenant=${T0}`).send(corps).expect(409)).body.error.details).toMatchObject({ reason: "deja_inscrit" });
    // Le compte, par le cookie.
    const c = (await srv().get(`/v1/negoce/compte?maintenant=${T0}`).set("cookie", cookie).expect(200)).body;
    expect(c).toMatchObject({ enseigne: "Négoce du Ponant", departements: ["22", "29"], livraison: PALIERS, prochaine: { mois: "2026-10-15", de: "du 15 octobre" }, grilles: [], commandes: [] });
    expect(c.depots).toHaveLength(2);
    await srv().get("/v1/negoce/compte").expect(401);
  });
});

describe("1 bis. la connexion par lien magique, la session de 30 jours", { timeout: 60_000 }, () => {
  it("un e-mail, un lien de 30 minutes, un cookie de 30 jours ; une adresse inconnue reçoit la même réponse et rien", async () => {
    const a = await artisan("a@example.fr", "Toitures A");
    await ajouter(a.agent, "contact@negoce-ponant.fr");
    await inscrireNegoce(ctx, "contact@negoce-ponant.fr", { depot: "ZA de Kerfolic, 22500 Paimpol", maintenant: T0 });
    ctx.emails.sent.length = 0;
    await srv().post(`/v1/negoce/connexion?maintenant=${T0}`).send({ email: "inconnu@example.com" }).expect(200);
    expect(ctx.emails.sent).toHaveLength(0);
    await srv().post(`/v1/negoce/connexion?maintenant=${T0}`).send({ email: "Contact@Negoce-Ponant.fr" }).expect(200);
    const mail = mailsVers(ctx, "contact@negoce-ponant.fr").at(-1)!;
    expect(mail.subject).toBe("Votre lien de connexion BatiClair");
    const jeton = /\/negoce\/connexion\/([A-Za-z0-9_.-]+)/.exec(mail.text)![1]!;
    await srv().post(`/v1/negoce/connexion/${jeton}?maintenant=2026-10-10T07:31:00.000Z`).expect(404);
    const r = await srv().post(`/v1/negoce/connexion/${jeton}?maintenant=2026-10-10T07:20:00.000Z`).expect(200);
    const cookie = (r.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;
    await srv().get("/v1/negoce/compte?maintenant=2026-11-08T07:00:00.000Z").set("cookie", cookie).expect(200);
    await srv().get("/v1/negoce/compte?maintenant=2026-11-10T07:00:00.000Z").set("cookie", cookie).expect(401);
    const d = await srv().post("/v1/negoce/deconnexion").expect(200);
    expect((d.headers["set-cookie"] as unknown as string[])[0]).toMatch(/Max-Age=0/);
  });
});

describe("3. l'abonnement à la zone", { timeout: 90_000 }, () => {
  it("à la clôture, un négoce inscrit reçoit « La grille est prête » avec son lien de désabonnement ; un invité sans compte reçoit le rappel d'inscription, trois cycles au plus", async () => {
    const A = await couvreurAvecListe(ctx, "a@example.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }]);
    await ajouter(A.agent, "inscrit@negoce.fr", "Inscrit");
    await ajouter(A.agent, "invite@negoce.fr", "Invité");
    await inscrireNegoce(ctx, "inscrit@negoce.fr", { depot: "Zone de Kerampont, 22300 Lannion", maintenant: T0 });
    const deposer = async (maintenant: string) => {
      const q = (await A.agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: ARDOISE, quantite: "100", unite: "pièces" }] }).expect(201)).body as { projetId: string };
      await A.agent.patch(`/v1/projects/${q.projetId}`).send({ address: "3 rue des Ajoncs, 22300 Lannion" }).expect(200);
      const articles = ((await A.agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string }[]).map((b) => b.key);
      await A.agent.post(`/v1/projects/${q.projetId}/commande-du-mois?maintenant=${maintenant}`).send({ articles, nature: "chantier" }).expect(201);
    };
    await deposer(T0);
    expect((await tacheDuMois(ctx, "2026-10-15T10:00:00.000Z")).body).toMatchObject({ clos: 1, grillesEnvoyees: 1 });
    const grille = mailsVers(ctx, "inscrit@negoce.fr").at(-1)!;
    expect(grille.subject).toBe("La grille du 15 octobre est prête (22) : 1 article à chiffrer");
    expect(grille.text).toMatch(/Se désabonner : http.*\/negoce\/desabonner\//);
    const rappel = mailsVers(ctx, "invite@negoce.fr").at(-1)!;
    expect(rappel.subject).toBe("La grille du 15 octobre (22) est prête : créez votre accès pour la chiffrer");
    expect(rappel.text).toMatch(/\/negoce\/rejoindre\//);
    // Rejoué dans l'heure : rien de plus.
    await tacheDuMois(ctx, "2026-10-15T11:00:00.000Z");
    expect(mailsVers(ctx, "invite@negoce.fr").filter((m) => /est prête : créez votre accès/.test(m.subject))).toHaveLength(1);
    // Trois cycles, puis plus rien.
    for (const [depot, cloture] of [["2026-10-20T09:00:00.000Z", "2026-11-01T11:00:00.000Z"], ["2026-11-05T09:00:00.000Z", "2026-11-15T11:00:00.000Z"], ["2026-11-20T09:00:00.000Z", "2026-12-01T11:00:00.000Z"]] as const) {
      await deposer(depot);
      await tacheDuMois(ctx, cloture);
    }
    expect(mailsVers(ctx, "invite@negoce.fr").filter((m) => /est prête : créez votre accès/.test(m.subject))).toHaveLength(3);
    expect(mailsVers(ctx, "inscrit@negoce.fr").filter((m) => /est prête/.test(m.subject))).toHaveLength(4);
    // Le lien « Se désabonner » de l'e-mail, confirmé : plus de grille à la clôture suivante.
    const jeton = /\/negoce\/desabonner\/([A-Za-z0-9_.-]+)/.exec(grille.text)![1]!;
    expect((await srv().post(`/v1/negoce/desabonner/${jeton}?maintenant=2026-12-02T09:00:00.000Z`).expect(200)).body).toEqual({ departements: [], departement: "22" });
    await deposer("2026-12-05T09:00:00.000Z");
    expect((await tacheDuMois(ctx, "2026-12-15T11:00:00.000Z")).body).toMatchObject({ clos: 1, grillesEnvoyees: 0 });
  });

  it("le compte : modifier dépôts, paliers et départements ; se désabonner d'un département ; supprimer son compte", async () => {
    const a = await artisan("a@example.fr", "Toitures A");
    await ajouter(a.agent, "contact@negoce-ponant.fr", "Négoce du Ponant");
    const { cookie } = await inscrireNegoce(ctx, "contact@negoce-ponant.fr", { depot: "ZA de Kerfolic, 22500 Paimpol", departements: ["22", "29", "35"], maintenant: T0 });
    const modif = (await srv().put(`/v1/negoce/compte?maintenant=${T0}`).set("cookie", cookie).send({ depots: [{ adresse: "ZA de Kerfolic, 22500 Paimpol" }, { adresse: "1 rue du Stade, 22300 Lannion" }], livraison: { gratuiteJusquaKm: 40, paliers: [], maxKm: 40 }, departements: ["22", "29"] }).expect(200)).body;
    expect(modif).toMatchObject({ departements: ["22", "29"], livraison: { gratuiteJusquaKm: 40, paliers: [], maxKm: 40 } });
    expect(modif.depots).toHaveLength(2);
    expect((await ctx.prisma.negoce.findMany({ where: { departement: "35" } })).every((n) => n.stopLe)).toBe(true);
    expect((await srv().post(`/v1/negoce/desabonner?maintenant=${T0}`).set("cookie", cookie).send({ departement: "29" }).expect(200)).body).toEqual({ departements: ["22"] });
    expect((await srv().get(`/v1/negoce/compte?maintenant=${T0}`).set("cookie", cookie).expect(200)).body.departements).toEqual(["22"]);
    await srv().delete(`/v1/negoce/compte?maintenant=${T0}`).set("cookie", cookie).expect(200);
    expect(await ctx.prisma.compteNegoce.count()).toBe(0);
    expect(await ctx.prisma.depotNegoce.count()).toBe(0);
    expect((await ctx.prisma.negoce.findMany()).every((n) => n.stopLe && !n.compteId)).toBe(true);
    await srv().get(`/v1/negoce/compte?maintenant=${T0}`).set("cookie", cookie).expect(401);
  });

  it("les conditions, versionnées, se lisent sans compte", async () => {
    const r = (await srv().get("/v1/negoce/conditions").expect(200)).body;
    expect(r.version).toBe("2026-10-24");
    expect(r.points).toHaveLength(13);
  });
});

describe("8. l'admin", { timeout: 60_000 }, () => {
  it("la liste des négoces (inscrits, invités jamais venus, désabonnés), réservée aux admins", async () => {
    const admin = await signUpWithCompany(ctx.app, "greg@example.fr", "Admin");
    const a = await artisan("a@example.fr", "Toitures A");
    await ajouter(a.agent, "inscrit@negoce.fr", "Inscrit");
    await ajouter(a.agent, "invite@negoce.fr", "Invité");
    await ajouter(a.agent, "parti@negoce.fr", "Parti");
    const i = await inscrireNegoce(ctx, "inscrit@negoce.fr", { depot: "Zone de Kerampont, 22300 Lannion", maintenant: T0 });
    const p = await inscrireNegoce(ctx, "parti@negoce.fr", { depot: "Zone de Kerampont, 22300 Lannion", maintenant: T0 });
    await srv().post(`/v1/negoce/desabonner?maintenant=${T0}`).set("cookie", p.cookie).send({}).expect(200);
    void i;
    await a.agent.get("/v1/admin/commande-du-mois/negoces").expect(403);
    const t = (await admin.agent.get("/v1/admin/commande-du-mois/negoces").expect(200)).body;
    expect(t.negoces.map((n: { email: string; etat: string }) => [n.email, n.etat]).sort()).toEqual([
      ["inscrit@negoce.fr", "inscrit"],
      ["invite@negoce.fr", "invite"],
      ["parti@negoce.fr", "desabonne"],
    ]);
    expect(t.cycles).toEqual([]);
  });
});
