import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChoixService, CommandeService } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 7 : BONS DE COMMANDE, FACTURE, LIVRAISON, DÉSISTEMENT (document du fondateur, 2026-10-19,
 * section 2 étape 8, section 4 c, section 6). LE SCÉNARIO COMPLET DEMANDÉ : quatre artisans (trois signés, un en
 * attente), trois négoces (un généraliste, un « pas concerné »), un désistement après bon de commande. Dès le négoce
 * retenu : un bon par artisan engagé (nom, compte ou ouverture demandée, adresse, quantités, fenêtre, « tarif groupé lot
 * n° … ») au négoce avec le récapitulatif, copie à l'artisan ; la facture de commission 2 % à 30 jours ; « Livré » d'un
 * tap ; la relance à J+15 ; le désistement : avertissement puis exclusion, le négoce prévenu.
 */
let ctx: TestContext;
const avant = process.env.GROUPE;
beforeAll(async () => {
  process.env.GROUPE = "on";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };
async function carreleur(email: string, nom: string, adresse: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["tiling"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: "73282932000074", phone: "06 00 00 00 00", email: null }).expect(200);
  let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
  const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
  if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
  return { agent, companyId, projectId: q.projetId, carreaux, nom, email };
}
const proposer = (c: Awaited<ReturnType<typeof carreleur>>, statut: "signe" | "en_attente") =>
  c.agent.post(`/v1/projects/${c.projectId}/groupe`).send({ articles: [c.carreaux.key], fenetre: FENETRE, statut, engagement: true }).expect(201);
const negoce = (agent: Agent, nom: string, email: string, familles: string[], numeroCompte?: string) => agent.post("/v1/groupe/negoces").send({ nom, email, familles, ...(numeroCompte ? { numeroCompte } : {}) }).expect(201);
// Nouveau cap (22 octobre) : le mail d'information au négoce ajouté et les alertes de devis ont leurs propres tests
// (`cap-22-octobre.test.ts`) ; ici, on suit les messages du parcours d'origine.
const nouveauCap = (m: { subject: string }) => /^(Un regroupement d|Nouveau meilleur prix|Nouveau devis)/.test(m.subject);
const mailsVers = (email: string) => ctx.emails.sent.filter((m) => m.to === email && !nouveauCap(m));
const jetonPour = (email: string) => /\/reponse\/([A-Za-z0-9_-]+)/.exec(mailsVers(email)[0]!.text)![1]!;
const CARREAU = "Carreau de sol 60x60 grès cérame";
async function deposer(jeton: string, rows: FixtureRow[], titre: string) {
  const devis = Buffer.from(await makePdf(["devis"], rows, "Total HT 1 000,00   TVA 20 % 200,00   Total TTC 1 200,00", titre));
  // Décision de Greg (22 octobre) : la livraison est obligatoire (son dépôt, gratuite jusqu'à X km, Y € au-delà) ; ici
  // franco partout, pour suivre le parcours d'origine.
  return request(ctx.app.getHttpServer()).post(`/v1/reponse/${jeton}`).field("accord", "oui").field("depart", "ZA de Kerfolic, 22500 Paimpol").field("francoKm", "500").field("prixAuDela", "0").attach("file", devis, { filename: "devis.pdf", contentType: "application/pdf" });
}

/** Quatre artisans : A et B signés avant le départ (le lot part au deuxième), D en attente ; C signé après (lot suivant). Trois négoces. */
async function scenario() {
  const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
  await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"], "A-77");
  await negoce(a.agent, "Négoce Généraliste", "general@example.com", ["couverture", "second_oeuvre"]);
  await negoce(a.agent, "Négoce Plomberie", "plomberie@example.com", ["plomberie"]);
  await proposer(a, "signe");
  const d = await carreleur("d@example.fr", "Carrelages D", "8 rue du Port, 22500 Paimpol");
  await proposer(d, "en_attente");
  const b = await carreleur("b@example.fr", "Carrelages B", "12 rue de Kerampont, 22300 Lannion");
  await proposer(b, "signe");
  const c = await carreleur("c@example.fr", "Carrelages C", "5 rue de Brest, 22300 Lannion");
  await proposer(c, "signe");
  // Deux négoces concernés reçoivent la demande (le plombier, non) ; le généraliste répond trop cher, le spécialiste gagne.
  expect(mailsVers("plomberie@example.com")).toHaveLength(0);
  expect((await deposer(jetonPour("general@example.com"), [["CAR", CARREAU, "46 u", "19,90", "915,40"]], "DEVIS G – Délai de livraison 5 jours")).status).toBe(201);
  expect((await deposer(jetonPour("carrelage@example.com"), [["CAR", CARREAU, "46 u", "18,50", "851,00"]], "DEVIS C – Délai de livraison 8 jours")).status).toBe(201);
  await ctx.app.get(ChoixService).choisirLesLotsEnvoyes();
  return { a, b, c, d };
}

describe("groupé, étape 7 : bons de commande, facture, livraison, désistement", { timeout: 90_000 }, () => {
  it("dès le négoce retenu : un bon par artisan engagé au négoce (récapitulatif joint), copie à l'artisan, facture 2 % à 30 jours", async () => {
    const { a, b, d } = await scenario();
    const lot = await ctx.prisma.lotGroupe.findFirstOrThrow({ where: { statut: "choisi" }, include: { offres: { include: { bon: { include: { livraison: true } }, besoin: true } }, facture: true, journal: true, negoceRetenu: true } });
    expect(lot.negoceRetenu!.nom).toBe("Négoce Carrelage");
    // Deux bons (A et B engagés) ; D en attente n'en a pas ; les besoins passent « commandé ».
    expect(lot.offres).toHaveLength(2);
    expect(lot.offres.every((o) => o.bon && o.bon.envoyeLe && o.bon.livraison?.statut === "prevue")).toBe(true);
    expect(lot.offres.map((o) => o.besoin.statut)).toEqual(["commande", "commande"]);
    expect((await ctx.prisma.besoin.findFirst({ where: { companyId: d.companyId } }))!.statut).toBe("en_attente");
    // Au négoce : un e-mail « bons de commande » avec 3 PDF (récapitulatif + 2 bons), le nom de A et son numéro de compte.
    const auNegoce = mailsVers("carrelage@example.com").find((m) => /bons? de commande/.test(m.subject))!;
    expect(auNegoce.attachments).toHaveLength(3);
    const bonA = Buffer.from(auNegoce.attachments!.find((x) => x.filename.includes("bon-de-commande"))!.contentBase64, "base64");
    expect(bonA.subarray(0, 4).toString()).toBe("%PDF");
    const bonsA = await ctx.prisma.bonCommande.findMany({ where: { offre: { besoin: { companyId: a.companyId } } } });
    expect(bonsA).toHaveLength(1);
    // Copie à chaque artisan : son bon seulement (une pièce jointe), jamais le nom de l'autre.
    const copieA = mailsVers("a@example.fr").find((m) => /bon de commande/.test(m.subject))!;
    expect(copieA.attachments).toHaveLength(1);
    expect(copieA.text).not.toContain("Carrelages B");
    expect(mailsVers("b@example.fr").some((m) => /bon de commande/.test(m.subject))).toBe(true);
    // La facture : 2 % × (23 + 23) × 18,50 = 2 % × 851 = 17,02 €, à 30 jours, envoyée.
    expect(lot.facture).toMatchObject({ statut: "envoyee" });
    expect(Number(lot.facture!.totalLotHt)).toBe(851);
    expect(Number(lot.facture!.montantHt)).toBe(17.02);
    expect(lot.facture!.echeanceLe.toISOString().slice(0, 10)).toBe(new Date(lot.facture!.emiseLe.getTime() + 30 * 86_400_000).toISOString().slice(0, 10));
    const factureMail = mailsVers("carrelage@example.com").find((m) => /^Facture n°/.test(m.subject))!;
    expect(factureMail.text).toContain("17,02 € HT");
    expect(lot.journal.map((j) => j.evenement)).toEqual(expect.arrayContaining(["negoce_retenu", "bons_envoyes", "facture_envoyee"]));
    // « Mes lots » : le bon et la livraison prévue.
    const lots = (await a.agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    expect(lots[0].bon).toMatchObject({ livraison: { statut: "prevue" } });
    expect(lots[0].bon.envoyeLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Rien ne repart au passage suivant.
    expect(await ctx.app.get(CommandeService).passerLesCommandes()).toEqual({ lotsCommandes: 0, bons: 0 });
    void b;
  });

  it("« Livré » d'un tap ; la relance à J+15 ; la facture relancée après l'échéance ; l'économie se compte dans Compte", async () => {
    const { a, b } = await scenario();
    const commande = ctx.app.get(CommandeService);
    const lotsA = (await a.agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    const bonA = lotsA[0].bon.id as string;
    const offreA = lotsA[0].offre.id as string;
    // L'économie : prix de référence 21 → (21 − 18,50) × 23 = 57,50 €, comptée dès que le bon existe.
    await a.agent.post(`/v1/groupe/offres/${offreA}/reference`).send({ prixReference: 21 }).expect(200);
    expect((await a.agent.get("/v1/groupe/economies").expect(200)).body).toEqual({ total: "57.50", lots: 1 });
    // B ne peut pas toucher au bon de A.
    expect((await b.agent.post(`/v1/groupe/bons/${bonA}/livraison`).send({ statut: "livre" })).status).toBe(404);
    // Relance à J+15 : rien avant, un e-mail après, une seule fois.
    const livraison = await ctx.prisma.livraison.findUniqueOrThrow({ where: { bonId: bonA } });
    const j14 = new Date(livraison.datePrevue!.getTime() + 14 * 86_400_000);
    const j16 = new Date(livraison.datePrevue!.getTime() + 16 * 86_400_000);
    expect(await commande.relancerLesLivraisons(j14)).toEqual({ relancees: 0 });
    expect(await commande.relancerLesLivraisons(j16)).toEqual({ relancees: 2 });
    expect(mailsVers("a@example.fr").some((m) => /tout est arrivé/.test(m.subject))).toBe(true);
    expect(await commande.relancerLesLivraisons(j16)).toEqual({ relancees: 0 });
    // « Livré » : la livraison et le besoin le disent.
    expect((await a.agent.post(`/v1/groupe/bons/${bonA}/livraison`).send({ statut: "livre" }).expect(200)).body.statut).toBe("livre");
    expect((await ctx.prisma.livraison.findUniqueOrThrow({ where: { bonId: bonA } })).statut).toBe("livre");
    expect((await ctx.prisma.besoin.findFirstOrThrow({ where: { companyId: a.companyId } })).statut).toBe("livre");
    // « Problème » chez B, avec un mot.
    const lotsB = (await b.agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    await b.agent.post(`/v1/groupe/bons/${lotsB[0].bon.id}/livraison`).send({ statut: "probleme", texte: "Il manque 3 cartons" }).expect(200);
    expect((await ctx.prisma.journalGroupe.findFirst({ where: { evenement: "livraison_probleme" } }))!.details).toMatchObject({ texte: "Il manque 3 cartons" });
    // La facture : pas de relance avant l'échéance, une après, une seule.
    const facture = await ctx.prisma.factureNegoce.findFirstOrThrow();
    expect(await commande.relancerLesFactures(new Date(facture.echeanceLe.getTime() - 86_400_000))).toEqual({ relancees: 0 });
    expect(await commande.relancerLesFactures(new Date(facture.echeanceLe.getTime() + 86_400_000))).toEqual({ relancees: 1 });
    expect(mailsVers("carrelage@example.com").some((m) => /^Relance : facture/.test(m.subject))).toBe(true);
    expect((await ctx.prisma.factureNegoce.findFirstOrThrow()).statut).toBe("relancee");
    expect(await commande.relancerLesFactures(new Date(facture.echeanceLe.getTime() + 2 * 86_400_000))).toEqual({ relancees: 0 });
  });

  it("section 4 c : un désistement après bon de commande = avertissement, le négoce prévenu ; le deuxième sur 12 mois = exclu 6 mois", async () => {
    const { a } = await scenario();
    const lotsA = (await a.agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    const bonA = lotsA[0].bon.id as string;
    const r = (await a.agent.post(`/v1/groupe/bons/${bonA}/desistement`).send({ raison: "Chantier reporté" }).expect(200)).body;
    expect(r).toEqual({ sanction: "avertissement", excluJusquau: null });
    expect(await ctx.prisma.desistement.count()).toBe(1);
    expect((await ctx.prisma.besoin.findFirstOrThrow({ where: { companyId: a.companyId } })).statut).toBe("retire");
    const auNegoce = mailsVers("carrelage@example.com").find((m) => /commande annulée/.test(m.subject))!;
    expect(auNegoce.text).toContain("Carrelages A");
    // Deux fois sur le même bon : non.
    expect((await a.agent.post(`/v1/groupe/bons/${bonA}/desistement`).send({})).status).toBe(409);
    // Le groupé reste ouvert après un avertissement ; un deuxième désistement (simulé, autre lot) exclut 6 mois.
    expect((await a.agent.get("/v1/groupe").expect(200)).body.eligible).toBe(true);
    const lot = await ctx.prisma.lotGroupe.findFirstOrThrow({ where: { statut: "choisi" } });
    await ctx.prisma.desistement.create({ data: { companyId: a.companyId, lotId: lot.id, bonId: bonA, sanction: "exclusion", excluJusquau: new Date(Date.now() + 180 * 86_400_000) } });
    const etat = (await a.agent.get("/v1/groupe").expect(200)).body;
    expect(etat).toMatchObject({ eligible: false, raisons: ["exclu_du_groupe"] });
    expect((await a.agent.post(`/v1/projects/${a.projectId}/groupe`).send({ articles: [a.carreaux.key], fenetre: FENETRE, statut: "signe", engagement: true })).status).toBe(403);
  });
});
