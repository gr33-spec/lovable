import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChoixService } from "../src/modules/groupe/index.js";
import type { CapturingPushSender } from "../src/platform/push/web-push.sender.js";
import { PUSH_SENDER } from "../src/platform/tokens.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * NOUVEAU CAP DU 22 OCTOBRE 2026 (décidé avec Greg, section 0 du doc « BatiClair Groupé ») : le mail qui prévient chaque
 * négoce ajouté qu'un regroupement existe ; le devis du négoce lu une fois à son arrivée, puis l'alerte « Nouveau meilleur
 * prix » / « Devis de X, légèrement plus haut » ; le compteur du groupe ; le prix de livraison par zone obligatoire et le
 * prix livré chez l'artisan ; le suivi façon colis du chantier.
 */
let ctx: TestContext;
let push: CapturingPushSender;
const avant = { GROUPE: process.env.GROUPE, RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET, REPONSES_DOMAINE: process.env.REPONSES_DOMAINE, FACTURE_EMETTEUR_NOM: process.env.FACTURE_EMETTEUR_NOM };
const SECRET = "whsec_" + Buffer.from("secret-du-webhook-de-test-0000").toString("base64");
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  process.env.REPONSES_DOMAINE = "reponses.example.com";
  process.env.FACTURE_EMETTEUR_NOM = "Société Émettrice";
  process.env.FACTURE_EMETTEUR_FORME = "SARL";
  process.env.FACTURE_EMETTEUR_SIRET = "000 000 000 00000";
  process.env.FACTURE_EMETTEUR_ADRESSE = "1 rue de l'Exemple, 22000 Ville";
  process.env.FACTURE_EMETTEUR_TVA = "FR00000000000";
  ctx = await createTestApp();
  push = ctx.app.get(PUSH_SENDER);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
  for (const k of ["FACTURE_EMETTEUR_FORME", "FACTURE_EMETTEUR_SIRET", "FACTURE_EMETTEUR_ADRESSE", "FACTURE_EMETTEUR_TVA"]) delete process.env[k];
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
  push.sent.length = 0;
});

const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };
async function carreleur(email: string, nom: string, adresse: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["tiling"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: "73282932000074", phone: null, email: null }).expect(200);
  // Un appareil abonné aux notifications.
  await agent.post("/v1/me/notifications/push").send({ endpoint: `https://push.example/${email}`, keys: { p256dh: "p256dh-de-test-0000000000", auth: "auth-de-test-00" } }).expect(200);
  let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
  const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
  if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
  return { agent, companyId, projectId: q.projetId, carreaux, email };
}
const proposer = (c: Awaited<ReturnType<typeof carreleur>>, statut: "signe" | "en_attente") =>
  c.agent.post(`/v1/projects/${c.projectId}/groupe`).send({ articles: [c.carreaux.key], fenetre: FENETRE, statut, engagement: true }).expect(201);
const negoce = (agent: Agent, nom: string, email: string, familles: string[]) => agent.post("/v1/groupe/negoces").send({ nom, email, familles }).expect(201);
const mailsVers = (email: string) => ctx.emails.sent.filter((m) => m.to === email);
const pushVers = (email: string) => push.sent.filter((p) => p.target.endpoint.endsWith(`/${email}`)).map((p) => p.message);
const jetonPour = (email: string) => /\/reponse\/([A-Za-z0-9_-]+)/.exec(mailsVers(email).find((m) => /\/reponse\//.test(m.text))!.text)![1]!;
const CARREAU = "Carreau de sol 60x60 grès cérame";
async function deposer(jeton: string, rows: FixtureRow[], titre: string, livraison: { depart: string; francoKm: string; prixAuDela?: string }) {
  const devis = Buffer.from(await makePdf(["devis"], rows, "Total HT 1 000,00   TVA 20 % 200,00   Total TTC 1 200,00", titre));
  const r = request(ctx.app.getHttpServer()).post(`/v1/reponse/${jeton}`).field("accord", "oui").field("depart", livraison.depart).field("francoKm", livraison.francoKm);
  return (livraison.prixAuDela ? r.field("prixAuDela", livraison.prixAuDela) : r).attach("file", devis, { filename: "devis.pdf", contentType: "application/pdf" });
}

describe("nouveau cap du 22 octobre : regroupement, alertes, livraison au kilomètre, suivi", { timeout: 120_000 }, () => {
  it("un négoce ajouté est invité à créer son accès, une seule fois, sans le nom de l'artisan (espace négoce, 23 octobre)", async () => {
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
    const [info] = mailsVers("carrelage@example.com");
    expect(info!.subject).toBe("Un regroupement d'artisans vous a ajouté à la Commande commune : créez votre accès");
    expect(info!.text).toContain("Un artisan de votre secteur (22) vous a ajouté");
    expect(info!.text).not.toContain("Carrelages A");
    expect(info!.text).toMatch(/http.*\/negoce\/rejoindre\//);
    // Le même négoce ajouté par un autre artisan : déjà dans la base, pas de second mail.
    const b = await carreleur("b@example.fr", "Carrelages B", "12 rue de Kerampont, 22300 Lannion");
    await negoce(b.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
    expect(mailsVers("carrelage@example.com")).toHaveLength(1);
  });

  it("chaque devis lu prévient les artisans du lot ; le compteur ; le prix de livraison par zone ; le prix livré ; le suivi", async () => {
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
    await negoce(a.agent, "Négoce Généraliste", "general@example.com", ["couverture", "second_oeuvre"]);
    // Suivi façon colis : la liste est prête, rien n'est demandé.
    expect((await a.agent.get(`/v1/projects/${a.projectId}/suivi`).expect(200)).body).toMatchObject({ etape: 0, phrase: "Ta liste est prête." });
    await proposer(a, "signe");
    // Le compteur avant le départ : un artisan, la demande pas encore partie.
    let lots = (await a.agent.get("/v1/groupe/lots").expect(200)).body.besoins as { compteur: { phrase: string; artisans: number } }[];
    expect(lots[0]!.compteur).toMatchObject({ artisans: 1, phrase: "1 artisan, demande commune pas encore partie" });
    const b = await carreleur("b@example.fr", "Carrelages B", "8 rue du Port, 22500 Paimpol");
    await proposer(b, "signe");
    // Le lot est parti chez deux négoces : le compteur le dit à chacun (sans nom ni chantier des autres).
    lots = (await a.agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    expect(lots[0]!.compteur.phrase).toBe("2 artisans, 2 demandes envoyées, 0 devis reçu");
    expect(JSON.stringify(lots)).not.toContain("Carrelages B");
    expect((await b.agent.get(`/v1/projects/${b.projectId}/suivi`).expect(200)).body).toMatchObject({ etape: 1, phrase: "Demande partie chez 2 négoces. On attend leurs prix." });

    // La page du négoce : sans sa livraison complète (dépôt, gratuite jusqu'à X km, Y € au-delà), rien n'est pris.
    const jeton = jetonPour("general@example.com");
    const page = (await request(ctx.app.getHttpServer()).get(`/v1/reponse/${jeton}`).expect(200)).body;
    expect(page.lot.chantiers).toHaveLength(2);
    const GENERAL = { depart: "Zone de Kerampont, 22300 Lannion", francoKm: "20", prixAuDela: "55" };
    const incomplet = await deposer(jeton, [["CAR", CARREAU, "46 u", "19,90", "915,40"]], "DEVIS G – Délai de livraison 5 jours", { depart: GENERAL.depart, francoKm: "20" });
    expect(incomplet.status).toBe(400);
    expect(incomplet.body.error.details).toMatchObject({ reason: "livraison_requise" });
    expect(pushVers("a@example.fr").filter((x) => /^Nouveau/.test(x.title))).toHaveLength(0);

    // Premier devis : « Nouveau meilleur prix », pour les deux artisans, push et e-mail.
    expect((await deposer(jeton, [["CAR", CARREAU, "46 u", "19,90", "915,40"]], "DEVIS G – Délai de livraison 5 jours", GENERAL)).status).toBe(201);
    for (const e of ["a@example.fr", "b@example.fr"]) {
      const alerte = pushVers(e).find((x) => x.title === "Nouveau meilleur prix")!;
      expect(alerte.body).toMatch(/^19,90 € HT chez Négoce Généraliste pour carreau de sol 60×60/);
      expect(mailsVers(e).some((m) => m.subject.startsWith("Nouveau meilleur prix"))).toBe(true);
    }
    // Le compteur et le suivi ont vu le devis.
    lots = (await a.agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    expect(lots[0]!.compteur.phrase).toBe("2 artisans, 2 demandes envoyées, 1 devis reçu, meilleur prix 19,90 €");
    expect((await a.agent.get(`/v1/projects/${a.projectId}/suivi`).expect(200)).body).toMatchObject({ etape: 2, phrase: "1 devis reçu sur 2 demandes. Meilleur prix : 19,90 € HT l'unité.", aFaire: "Compare et retiens l'offre qui te va." });
    // Plan « finition », bloc 6 : le même négoce redépose (devis corrigé) : son devis remplace le premier, il ne compte
    // jamais pour deux.
    expect((await deposer(jeton, [["CAR", CARREAU, "46 u", "19,90", "915,40"]], "DEVIS G bis – Délai de livraison 5 jours", GENERAL)).status).toBe(201);
    lots = (await a.agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    expect(lots[0]!.compteur.phrase).toBe("2 artisans, 2 demandes envoyées, 1 devis reçu, meilleur prix 19,90 €");
    expect((await request(ctx.app.getHttpServer()).get(`/v1/reponse/${jeton}`).expect(200)).body.reponse).toMatchObject({ fichiers: ["devis.pdf"] });
    // Même prix qu'avant : aucune seconde alerte aux artisans.
    expect(pushVers("a@example.fr").filter((x) => x.title === "Nouveau meilleur prix")).toHaveLength(1);

    // Deuxième devis, moins cher, dépôt à Paimpol, gratuit jusqu'à 50 km : les deux chantiers (0 et 40 km) sont livrés
    // gratuitement. Le généraliste, depuis Lannion, facture Paimpol (40 km > 20). Le choix se fait livraison comprise.
    expect((await deposer(jetonPour("carrelage@example.com"), [["CAR", CARREAU, "46 u", "18,50", "851,00"]], "DEVIS C – Délai de livraison 8 jours", { depart: "ZA de Kerfolic, 22500 Paimpol", francoKm: "50", prixAuDela: "60" })).status).toBe(201);
    expect(pushVers("a@example.fr").filter((x) => x.title === "Nouveau meilleur prix")).toHaveLength(2);
    await ctx.app.get(ChoixService).choisirLesLotsEnvoyes();
    // Généraliste : 46 × 19,90 + 55 = 970,40 ; Carrelage : 46 × 18,50 + 0 = 851,00 → Carrelage retenu.
    const lot = await ctx.prisma.lotGroupe.findFirstOrThrow({ include: { negoceRetenu: true } });
    expect(lot.negoceRetenu?.nom).toBe("Négoce Carrelage");

    // Le prix livré chez A (Lannion, 40 km du dépôt de Paimpol, sous les 50 km gratuits), puis son prix habituel.
    let offre = (await a.agent.get("/v1/groupe/offres").expect(200)).body.offres[0];
    expect(offre.livre).toMatchObject({ distanceKm: 40, francoKm: 50, livraisonHt: 0, totalHt: 425.5, habituelHt: null });
    await a.agent.post(`/v1/groupe/offres/${offre.id}/reference`).send({ prixReference: 21 }).expect(200);
    offre = (await a.agent.get("/v1/groupe/offres").expect(200)).body.offres[0];
    expect(offre.livre).toMatchObject({ totalHt: 425.5, habituelHt: 483, economieHt: 57.5 });
    // Commandé : le bon de commande est parti au négoce retenu.
    expect((await a.agent.get(`/v1/projects/${a.projectId}/suivi`).expect(200)).body).toMatchObject({ etape: 3, phrase: "C'est commandé." });
  });

  it("une ligne vague n'entre pas dans la commande commune : elle part seulement chez le négoce de l'artisan", async () => {
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    const q = (await a.agent.post("/v1/quantitatifs").send({ metier: "roofing", lignes: [{ libelle: "Tuile romane", quantite: "200", unite: "pièces" }] }).expect(201)).body as { projetId: string };
    await a.agent.patch(`/v1/projects/${q.projetId}`).send({ address: "3 rue des Ajoncs, 22300 Lannion" }).expect(200);
    const takeoff = (await a.agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff;
    const tuile = (takeoff.purchase.toBuy as { key: string; label: string; aPreciserPourGroupe: { cle: string }[] }[]).find((b) => /^Tuile romane/.test(b.label))!;
    expect(tuile.aPreciserPourGroupe.map((x) => x.cle)).toEqual(["marque", "teinte"]);
    expect(takeoff.phrasePrecision).toBe("Précise pour l'ajouter à la commande commune");
    const refus = await a.agent.post(`/v1/projects/${q.projetId}/groupe`).send({ articles: [tuile.key], fenetre: FENETRE, statut: "signe", engagement: true });
    expect(refus.status).toBe(400);
    expect(refus.body.error.details).toMatchObject({ reason: "ligne_vague" });
  });

  it("le suivi d'un autre chantier ou d'une autre entreprise n'existe pas", async () => {
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    const b = await carreleur("b@example.fr", "Carrelages B", "8 rue du Port, 22500 Paimpol");
    expect((await b.agent.get(`/v1/projects/${a.projectId}/suivi`)).status).toBe(404);
    expect((await a.agent.get("/v1/projects/pas-un-id/suivi")).status).toBe(404);
  });
});
