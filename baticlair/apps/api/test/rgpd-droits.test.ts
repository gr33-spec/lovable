import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ARDOISE, couvreurAvecListe, deposerGrille, jetonDeGrille, mailsVers, tacheDuMois } from "./support/cycle.js";
import { inscrireNegoce } from "./support/negoce.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES DROITS RGPD EN LIBRE-SERVICE (Greg, 24 octobre 2026, partie D) : un devis client anonymisé avant d'être stocké ;
 * l'export JSON et PDF (artisan et négoce) ; la suppression du compte (preuve d'acceptation gardée 5 ans, commandes gardées
 * 10 ans sans nom) ; « Ne plus recevoir ces e-mails » en un clic ; « Ne plus jamais être contacté » côté négoce, et la liste
 * d'exclusion respectée même quand un autre artisan rajoute le même e-mail ; les purges du registre, dates forcées.
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
const CLOTURE = "2026-10-15T10:01:00.000Z";
const serveur = () => request(ctx.app.getHttpServer());
const purge = (maintenant: string) =>
  serveur().get(`/v1/internal/purge-inactive?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", `Bearer ${process.env.CRON_SECRET}`).expect(200);
/** Un artisan avec son adresse : le département de ses négoces en vient. */
async function artisan(email: string, nom: string, adresse = "3 rue des Ajoncs, 22300 Lannion") {
  const x = await signUpWithCompany(ctx.app, email, nom);
  await x.agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: null, phone: null, email: null }).expect(200);
  return x;
}
const lien = (texte: string, motif: RegExp) => motif.exec(texte)?.[1] ?? null;

describe("anonymisation d'un devis client", { timeout: 60_000 }, () => {
  it("le nom, le téléphone, l'e-mail et la rue du client sont retirés avant le stockage ; la commune reste", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "anonyme@toitures.fr", "Toitures Anonyme");
    const projectId = (await agent.post("/v1/projects").send({ name: "Chantier" }).expect(201)).body.id as string;
    const titre = "Client : M. Kerbrat Yann, 17 rue des Goélands 22300 Lannion, Tél 06 12 34 56 78, yann.kerbrat@gmail.com";
    const pdf = await makePdf(["devis"], undefined, undefined, titre);
    await agent.post(`/v1/projects/${projectId}/documents`).field("purpose", "client_quote").attach("file", Buffer.from(pdf), { filename: "devis.pdf", contentType: "application/pdf" }).expect(201);
    const pages = await ctx.prisma.documentPage.findMany({ where: { processing: { document: { projectId } } } });
    const texte = JSON.stringify(pages.map((p) => p.lines));
    expect(texte).not.toMatch(/Kerbrat|Goélands|06 12 34 56 78|gmail/);
    expect(texte).toMatch(/22300 Lannion/);
  });
});

describe("export et suppression du compte artisan", { timeout: 60_000 }, () => {
  it("export JSON et PDF, puis suppression : preuve CGU gardée, aucune donnée nominative restante", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "export@toitures.fr", "Toitures Export");
    await agent.post("/v1/me/cgu").send({ version: "2026-10-24" }).expect(200);
    const json = (await agent.get("/v1/me/export").expect(200)).body as { user: { email: string; cguVersion: string }; companies: { name: string; commandeCommune: unknown }[] };
    expect(json.user).toMatchObject({ email: "export@toitures.fr", cguVersion: "2026-10-24" });
    expect(json.companies[0]).toMatchObject({ name: "Toitures Export" });
    expect(json.companies[0]!.commandeCommune).toBeDefined();
    const pdf = await agent.get("/v1/me/export.pdf").buffer(true).parse((res, cb) => {
      const morceaux: Buffer[] = [];
      res.on("data", (c: Buffer) => morceaux.push(c));
      res.on("end", () => cb(null, Buffer.concat(morceaux)));
    }).expect(200);
    expect(pdf.headers["content-type"]).toMatch(/application\/pdf/);
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");

    await agent.delete("/v1/me").send({ confirm: "SUPPRIMER" }).expect(200);
    expect(await ctx.prisma.company.findUnique({ where: { id: companyId } })).toBeNull();
    expect(await ctx.prisma.user.findFirst({ where: { email: "export@toitures.fr" } })).toBeNull();
    const preuve = await ctx.prisma.preuveAcceptation.findFirst({ where: { sorte: "cgu", version: "2026-10-24" } });
    expect(preuve).not.toBeNull();
    expect(preuve!.email).not.toMatch(/@/);
  });
});

describe("e-mails : désabonnement en un clic", { timeout: 120_000 }, () => {
  it("le lien de chaque notification coupe les e-mails suivants ; Compte les remet", async () => {
    const adresse = "3 rue des Ajoncs, 22300 Lannion";
    const A = await couvreurAvecListe(ctx, "stop@toitures.fr", "Toitures Stop", adresse, [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }]);
    const negoces = ["n1-stop@negoce.fr", "n2-stop@negoce.fr"];
    for (const [i, email] of negoces.entries()) {
      await A.agent.post(`/v1/groupe/negoces?maintenant=${AVANT}`).send({ nom: `Négoce Stop ${i}`, email, familles: ["couverture"] }).expect(201);
      await inscrireNegoce(ctx, email, { depot: "ZA du Port, 22300 Lannion", enseigne: `Négoce Stop ${i}`, departements: ["22"], maintenant: AVANT });
    }
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${AVANT}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    await tacheDuMois(ctx, CLOTURE);
    const avantNotif = mailsVers(ctx, A.email).length;
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, negoces[0]!), [["A", ARDOISE, "3400 pièces", "0,92", ""]], "2026-10-16T10:00:00.000Z")).status).toBe(201);
    const notif = mailsVers(ctx, A.email).slice(avantNotif).at(-1)!;
    const jeton = lien(notif.text, /Ne plus recevoir ces e-mails : \S+\/emails\/stop\/([A-Za-z0-9_.-]+)/);
    expect(jeton).not.toBeNull();
    // La page ne coupe rien au chargement ; le bouton, si.
    expect((await serveur().get(`/v1/emails/stop/${jeton}`).expect(200)).body).toMatchObject({ entreprise: "Toitures Stop", coupes: false });
    await serveur().post(`/v1/emails/stop/${jeton}`).expect(200);
    expect((await A.agent.get("/v1/me/emails").expect(200)).body).toEqual({ actifs: false });
    const apresStop = mailsVers(ctx, A.email).length;
    expect((await deposerGrille(ctx, jetonDeGrille(ctx, negoces[1]!), [["A", ARDOISE, "3400 pièces", "0,95", ""]], "2026-10-17T10:00:00.000Z")).status).toBe(201);
    await tacheDuMois(ctx, "2026-10-18T07:05:00.000Z");
    expect(mailsVers(ctx, A.email).slice(apresStop).filter((m) => /nouvelle réponse/.test(m.text))).toHaveLength(0);
    // Un jeton faux : rien.
    await serveur().post("/v1/emails/stop/faux").expect(404);
    await A.agent.put("/v1/me/emails").send({ actifs: true }).expect(200);
    expect((await A.agent.get("/v1/me/emails").expect(200)).body).toEqual({ actifs: true });
  });
});

describe("négoce : opposition, liste d'exclusion, export, suppression", { timeout: 120_000 }, () => {
  it("« Ne plus jamais être contacté » : un autre artisan qui rajoute le même e-mail n'envoie aucune invitation", async () => {
    const A = await artisan("oppo-a@toitures.fr", "Toitures Oppo A");
    await A.agent.post(`/v1/groupe/negoces?maintenant=${AVANT}`).send({ nom: "Négoce Refus", email: "refus@negoce.fr", familles: ["couverture"] }).expect(201);
    const invitation = mailsVers(ctx, "refus@negoce.fr").at(-1)!;
    expect(invitation.text).toMatch(/Ce message vous est envoyé par BATI INVEST/);
    expect(invitation.text).toMatch(/Pourquoi ce message \?/);
    const jeton = lien(invitation.text, /\/negoce\/opposition\/([A-Za-z0-9_.-]+)/)!;
    expect(jeton).toBeTruthy();
    const page = (await serveur().get(`/v1/negoce/opposition/${jeton}?maintenant=${AVANT}`).expect(200)).body;
    expect(JSON.stringify(page)).not.toMatch(/Toitures Oppo A/);
    await serveur().post(`/v1/negoce/opposition/${jeton}?maintenant=${AVANT}`).expect(200);
    expect(await ctx.prisma.exclusionContact.count({ where: { sorte: "email", source: "opposition" } })).toBeGreaterThan(0);

    const B = await artisan("oppo-b@toitures.fr", "Toitures Oppo B");
    const avantAjout = mailsVers(ctx, "refus@negoce.fr").length;
    await B.agent.post(`/v1/groupe/negoces?maintenant=${AVANT}`).send({ nom: "Négoce Refus", email: "REFUS@negoce.fr", familles: ["couverture"] }).expect(201);
    expect(mailsVers(ctx, "refus@negoce.fr").length).toBe(avantAjout);
    // La relance du mois non plus.
    await tacheDuMois(ctx, CLOTURE);
    expect(mailsVers(ctx, "refus@negoce.fr").length).toBe(avantAjout);
  });

  it("export JSON et PDF du négoce, puis suppression : exclusion, preuve des conditions, plus de session", async () => {
    const A = await artisan("sup-a@toitures.fr", "Toitures Sup", "3 rue des Ajoncs, 29600 Morlaix");
    await A.agent.post(`/v1/groupe/negoces?maintenant=${AVANT}`).send({ nom: "Négoce Sup", email: "sup@negoce.fr", familles: ["couverture"] }).expect(201);
    const { cookie } = await inscrireNegoce(ctx, "sup@negoce.fr", { depot: "ZA du Port, 29600 Morlaix", enseigne: "Négoce Sup", departements: ["29"], maintenant: AVANT });
    const json = (await serveur().get(`/v1/negoce/export?maintenant=${AVANT}`).set("cookie", cookie).expect(200)).body;
    expect(JSON.stringify(json)).toMatch(/sup@negoce\.fr/);
    expect(JSON.stringify(json)).not.toMatch(/Toitures Sup/);
    const pdf = await serveur().get(`/v1/negoce/export.pdf?maintenant=${AVANT}`).set("cookie", cookie).buffer(true).parse((res, cb) => {
      const morceaux: Buffer[] = [];
      res.on("data", (c: Buffer) => morceaux.push(c));
      res.on("end", () => cb(null, Buffer.concat(morceaux)));
    }).expect(200);
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");

    await serveur().delete(`/v1/negoce/compte?maintenant=${AVANT}`).set("cookie", cookie).expect(200);
    expect(await ctx.prisma.compteNegoce.findFirst({ where: { email: "sup@negoce.fr" } })).toBeNull();
    expect(await ctx.prisma.preuveAcceptation.count({ where: { sorte: "conditions_negoce" } })).toBeGreaterThan(0);
    expect(await ctx.prisma.negoce.count({ where: { email: "sup@negoce.fr" } })).toBe(0);
    await serveur().get(`/v1/negoce/export?maintenant=${AVANT}`).set("cookie", cookie).expect(401);
    // Rajouté par un artisan : aucune invitation.
    const avantAjout = mailsVers(ctx, "sup@negoce.fr").length;
    await A.agent.post(`/v1/groupe/negoces?maintenant=${AVANT}`).send({ nom: "Négoce Sup", email: "sup@negoce.fr", familles: ["couverture"] }).expect(201);
    expect(mailsVers(ctx, "sup@negoce.fr").length).toBe(avantAjout);
  });
});

describe("les purges du registre, dates forcées", { timeout: 60_000 }, () => {
  it("fichier de devis après 30 jours, invités après 12 mois, archives après 10 ans, preuves après 5 ans", async () => {
    const { agent } = await artisan("purge@toitures.fr", "Toitures Purge");
    const projectId = (await agent.post("/v1/projects").send({ name: "Chantier" }).expect(201)).body.id as string;
    const pdf = await makePdf(["devis"]);
    const doc = (await agent.post(`/v1/projects/${projectId}/documents`).field("purpose", "client_quote").attach("file", Buffer.from(pdf), { filename: "devis.pdf", contentType: "application/pdf" }).expect(201)).body as { id?: string; document?: { id: string } };
    const docId = doc.id ?? doc.document!.id;
    await ctx.prisma.document.update({ where: { id: docId }, data: { createdAt: new Date("2026-09-01T00:00:00Z") } });
    await agent.post(`/v1/groupe/negoces?maintenant=${AVANT}`).send({ nom: "Négoce Muet", email: "muet@negoce.fr", familles: ["couverture"] }).expect(201);
    await ctx.prisma.compteNegoce.updateMany({ where: { email: "muet@negoce.fr" }, data: { createdAt: new Date("2025-09-01T00:00:00Z") } });
    await ctx.prisma.archiveCommande.create({ data: { sorte: "cycle", mois: "2016-01-01", negoceNom: "Ancien", totalHt: 10, commandeLe: new Date("2016-01-05T00:00:00Z"), artisan: "x", archiveLe: new Date("2016-01-05T00:00:00Z") } });
    await ctx.prisma.preuveAcceptation.create({ data: { sorte: "cgu", version: "2020-01-01", accepteLe: new Date("2020-01-01T00:00:00Z"), email: "empreinte", finCompteLe: new Date("2021-01-01T00:00:00Z") } });

    const r = (await purge("2026-10-24T03:00:00.000Z")).body.registre as Record<string, number>;
    expect(r.fichiersDevis).toBeGreaterThanOrEqual(1);
    expect(r.invitesEffaces).toBeGreaterThanOrEqual(1);
    expect(r.archives).toBeGreaterThanOrEqual(1);
    expect(r.preuves).toBeGreaterThanOrEqual(1);
    expect(await ctx.prisma.documentBlob.findUnique({ where: { documentId: docId } })).toBeNull();
    // Le texte anonymisé reste : la liste se relit encore.
    expect(await ctx.prisma.documentPage.count({ where: { processing: { documentId: docId } } })).toBeGreaterThan(0);
    expect(await ctx.prisma.compteNegoce.findFirst({ where: { email: "muet@negoce.fr" } })).toBeNull();
    expect(await ctx.prisma.negoce.findFirst({ where: { email: "muet@negoce.fr" } })).toMatchObject({ compteId: null });
    // Sans le secret de la tâche, rien.
    await serveur().get("/v1/internal/purge-inactive").expect(403);
  });
});
