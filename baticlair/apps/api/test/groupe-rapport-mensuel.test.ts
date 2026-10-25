import { moisEcoule, nomDuMois } from "@baticlair/domain";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChoixService } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * PLAN 2 DU 21 OCTOBRE 2026, BLOC 4 : LE RAPPORT MENSUEL DE L'ARTISAN. Le 1er du mois, la tâche envoie à chaque
 * entreprise « ce mois : X chantiers lus, Y € économisés au groupé, Z lots » ; rien à celle qui n'a rien fait ; jamais
 * deux fois pour le même mois.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
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

const FENETRE = { tot: "2026-11-02", tard: "2026-11-20" };
async function carreleur(email: string, nom: string, adresse: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["tiling"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: "73282932000074", phone: null, email: null }).expect(200);
  let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
  const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
  if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
  return { agent, companyId, projectId: q.projetId, carreaux, email };
}
const proposer = (c: Awaited<ReturnType<typeof carreleur>>) => c.agent.post(`/v1/projects/${c.projectId}/groupe`).send({ articles: [c.carreaux.key], fenetre: FENETRE, statut: "signe", engagement: true }).expect(201);
const negoce = (agent: Agent, nom: string, email: string, familles: string[]) => agent.post("/v1/groupe/negoces").send({ nom, email, familles }).expect(201);
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
const tache = (maintenant: Date, secret = "secret-de-la-tache") => request(ctx.app.getHttpServer()).get(`/v1/internal/rapport-mensuel?maintenant=${encodeURIComponent(maintenant.toISOString())}`).set("authorization", `Bearer ${secret}`);

describe("le rapport mensuel de l'artisan", { timeout: 90_000 }, () => {
  it("le 1er du mois : chantiers lus, économies, lots ; rien à qui n'a rien fait ; jamais deux fois", async () => {
    // Un lot de bout en bout ce mois-ci : A et B, un négoce retenu, les bons partis ; A déclare son prix habituel.
    const a = await carreleur("a@example.fr", "Carrelages A", "3 rue des Ajoncs, 22300 Lannion");
    await negoce(a.agent, "Négoce Carrelage", "carrelage@example.com", ["second_oeuvre"]);
    await proposer(a);
    const b = await carreleur("b@example.fr", "Carrelages B", "12 rue de Kerampont, 22300 Lannion");
    await proposer(b);
    await deposer(jetonPour("carrelage@example.com"), [["CAR", CARREAU, "46 u", "18,50", "851,00"]], "DEVIS C – Délai de livraison 8 jours");
    await ctx.app.get(ChoixService).choisirLesLotsEnvoyes();
    const lotsA = (await a.agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    expect(lotsA[0].bon).toBeTruthy();
    await a.agent.post(`/v1/groupe/offres/${lotsA[0].offre.id}/reference`).send({ prixReference: 21 }).expect(200);
    // C a un compte mais n'a rien fait ce mois-ci.
    await signUpWithCompany(ctx.app, "c@example.fr", "Carrelages C", ["tiling"]);
    ctx.emails.sent.length = 0;

    // Sans le secret : fermé.
    expect((await tache(new Date(), "mauvais")).status).toBe(403);

    // Le 1er du mois suivant, 7 h.
    const now = new Date();
    const premier = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 7));
    const mois = moisEcoule(premier);
    const r = await tache(premier).expect(200);
    expect(r.body).toEqual({ mois, envoyes: 2, sansRien: 1, dejaFaits: 0 });
    const mailA = mailsVers("a@example.fr");
    expect(mailA).toHaveLength(1);
    expect(mailA[0]!.subject).toBe(`Ton mois ${/^[aeiouy]/i.test(nomDuMois(mois)) ? "d'" : "de "}${nomDuMois(mois)} avec Mobiiz : 1 chantier lu, 58 € économisés, 1 lot`);
    expect(mailA[0]!.text).toContain("Ce mois : 1 chantier lu, 58 € économisés grâce au regroupement, 1 lot.");
    expect(mailA[0]!.text).toContain("Bonjour Artisan,");
    expect(mailA[0]!.html).toContain("<strong>Ce mois : 1 chantier lu, 58 € économisés grâce au regroupement, 1 lot.</strong>");
    // B n'a pas déclaré de prix habituel : 0 € mais son lot compte.
    expect(mailsVers("b@example.fr")[0]!.subject).toContain("1 chantier lu, 0 € économisés, 1 lot");
    expect(mailsVers("c@example.fr")).toHaveLength(0);
    // Relancée le même jour : personne ne reçoit deux fois.
    ctx.emails.sent.length = 0;
    expect((await tache(premier).expect(200)).body).toEqual({ mois, envoyes: 0, sansRien: 1, dejaFaits: 2 });
    expect(ctx.emails.sent).toHaveLength(0);
    // Le mois d'après, le lot ne compte plus : A et B n'ont rien fait, personne n'écrit.
    const suivant = new Date(Date.UTC(premier.getUTCFullYear(), premier.getUTCMonth() + 1, 1, 7));
    expect((await tache(suivant).expect(200)).body).toEqual({ mois: moisEcoule(suivant), envoyes: 0, sansRien: 3, dejaFaits: 0 });
  });
});
