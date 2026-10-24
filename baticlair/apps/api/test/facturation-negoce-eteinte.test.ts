import request from "supertest";
import { afterAll, beforeAll, expect, it } from "vitest";
import { ChoixService } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * PLUS DE COMMISSION (Greg, 24 octobre 2026) : drapeau `FACTURATION_NEGOCE` éteint (le défaut), le lot va jusqu'aux bons
 * de commande sans aucune facture ni relance ; aucun e-mail ni page ne parle de 2 % ; l'accord garde la version
 * 2026-10-24 et un taux nul. La facturation elle-même reste testée, drapeau allumé, dans `groupe-commande.test.ts`.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, FACTURATION_NEGOCE: process.env.FACTURATION_NEGOCE };
beforeAll(async () => {
  process.env.GROUPE = "on";
  delete process.env.FACTURATION_NEGOCE;
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


it("drapeau éteint : bons de commande partis, aucune facture, aucune relance, aucun « 2 % » nulle part", { timeout: 90_000 }, async () => {
  await scenario();
  const lot = await ctx.prisma.lotGroupe.findFirstOrThrow({ where: { statut: "choisi" }, include: { facture: true, offres: { include: { bon: true } } } });
  expect(lot.offres.every((o) => o.bon)).toBe(true);
  expect(lot.facture).toBeNull();
  expect(await ctx.prisma.factureNegoce.count()).toBe(0);
  const accord = await ctx.prisma.accordNegoce.findFirstOrThrow({ where: { lotId: lot.id } });
  expect([accord.versionContrat, Number(accord.tauxPourcent)]).toEqual(["2026-10-24", 0]);
  const tout = ctx.emails.sent.map((m) => `${m.subject}\n${m.text}\n${m.html ?? ""}`).join("\n");
  expect(tout).not.toMatch(/\b2 ?%|reverser|facture de commission/i);
  expect(tout).toContain("Aucun frais pour l'instant. BATI INVEST pourra introduire une commission ultérieurement, avec un préavis de 60 jours et l'accord du négoce.");
  expect(ctx.emails.sent.find((m) => /bons? de commande/.test(m.subject) && m.to === "carrelage@example.com")!.text).toContain("Mobiiz ne vous facture rien.");
});
