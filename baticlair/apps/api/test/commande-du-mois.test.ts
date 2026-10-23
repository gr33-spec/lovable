import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CapturingPushSender } from "../src/platform/push/web-push.sender.js";
import { PUSH_SENDER } from "../src/platform/tokens.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * LA COMMANDE COMMUNE DU MOIS (Greg, 22 octobre 2026, au soir), de bout en bout par l'API. Le cas est celui posé à la
 * main dans `packages/domain/test/commande-du-mois.test.ts` et `docs/groupe/RECETTE.md` : A à Lannion, B à Paimpol, C
 * qui arrive après la clôture ; N1 (Lannion), N2 (Paimpol), N3 (Lannion, sans les crochets).
 */
let ctx: TestContext;
let push: CapturingPushSender;
const avant = process.env.GROUPE;
const avantSecret = process.env.CRON_SECRET;
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  ctx = await createTestApp();
  push = ctx.app.get(PUSH_SENDER);
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
  if (avantSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = avantSecret;
  delete process.env.GROUPE_ADMINS;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
  push.sent.length = 0;
});

const ARDOISE = "Ardoise naturelle 32×22 Espagne 1er choix";
const LITEAU = "Liteau sapin traité 27×38";
const CROCHET = "Crochet inox 100 mm";
/** La désignation telle que la phrase l'écrit : première lettre en minuscule. */
const min = (d: string) => d.charAt(0).toLowerCase() + d.slice(1);
// Le 16 octobre 2026 à 9 h (Paris) : inscriptions ouvertes, clôture le 25 à 12 h.
const T0 = "2026-10-16T07:00:00.000Z";
const APRES_CLOTURE = "2026-10-25T11:00:00.000Z";
const LIMITE = "2026-11-08T17:00:00.000Z";

async function couvreur(email: string, nom: string, adresse: string, lignes: { libelle: string; quantite: string; unite: string }[]) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["roofing"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: "73282932000074", phone: null, email: null }).expect(200);
  await agent.post("/v1/me/notifications/push").send({ endpoint: `https://push.example/${email}`, keys: { p256dh: "p256dh-de-test-0000000000", auth: "auth-de-test-00" } }).expect(200);
  const q = (await agent.post("/v1/quantitatifs").send({ lignes }).expect(201)).body as { id: string; projetId: string };
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  return { agent, companyId, projectId: q.projetId, articles: toBuy.map((b) => b.key), email };
}
const pushVers = (email: string) => push.sent.filter((p) => p.target.endpoint.endsWith(`/${email}`)).map((p) => p.message);
const mailsVers = (email: string) => ctx.emails.sent.filter((m) => m.to === email);
const jetonDe = (email: string) => /\/grille\/([A-Za-z0-9_-]+)/.exec(mailsVers(email).filter((m) => /\/grille\//.test(m.text)).at(-1)!.text)![1]!;
const tache = (maintenant: string) => request(ctx.app.getHttpServer()).get(`/v1/internal/commande-du-mois?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", `Bearer ${process.env.CRON_SECRET}`).expect(200);
async function deposerGrille(jeton: string, rows: FixtureRow[], livraison: { depart: string; francoKm: string; prixAuDela: string }, maintenant: string) {
  const pdf = Buffer.from(await makePdf(["devis"], rows, "Total HT 1 000,00", "DEVIS"));
  return request(ctx.app.getHttpServer())
    .post(`/v1/grille/${jeton}?maintenant=${encodeURIComponent(maintenant)}`)
    .field("depart", livraison.depart)
    .field("francoKm", livraison.francoKm)
    .field("prixAuDela", livraison.prixAuDela)
    .attach("file", pdf, { filename: "devis.pdf", contentType: "application/pdf" });
}

describe("la commande commune du mois : inscriptions, clôture, grille aux négoces, résultats, commande", { timeout: 120_000 }, () => {
  it("un cycle complet, avec les totaux posés à la main", async () => {
    const A = await couvreur("a@example.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [
      { libelle: ARDOISE, quantite: "2000", unite: "pièces" },
      { libelle: LITEAU, quantite: "400", unite: "m" },
    ]);
    const B = await couvreur("b@example.fr", "Toitures B", "12 rue du Port, 22500 Paimpol", [
      { libelle: ARDOISE, quantite: "3000", unite: "pièces" },
      { libelle: CROCHET, quantite: "10", unite: "boîtes" },
    ]);
    // Les négoces couverture du 22, ajoutés par les artisans.
    for (const [nom, email] of [["Négoce N1", "n1@example.com"], ["Négoce N2", "n2@example.com"], ["Négoce N3", "n3@example.com"]] as const) {
      await A.agent.post("/v1/groupe/negoces").send({ nom, email, familles: ["couverture"] }).expect(201);
    }

    // A dépose : il est le premier, la commande d'octobre ; en quantités, jamais en nombre d'entreprises.
    const a1 = (await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201)).body;
    expect(a1).toMatchObject({ mois: "2026-10", message: null });
    expect(a1.vue).toMatchObject({ phase: "inscriptions", clotureDans: "9 j 4 h", premier: "Pour l'instant, tu es le premier. Partage le lien pour faire grossir la commande." });
    expect(a1.vue.toi.replace(/\u202f/g, " ")).toBe(`Toi seul : 2 000 pièces d'${min(ARDOISE)}, 400 m de ${min(LITEAU)}`);

    // B dépose (du stock) : A est prévenu, en quantités ; la commande grossit.
    await B.agent.post(`/v1/projects/${B.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: B.articles, nature: "stock" }).expect(201);
    expect(pushVers("a@example.fr").map((m) => m.body.replace(/\u202f/g, " "))).toContain(`+3 000 pièces d'${min(ARDOISE)} et 10 boîtes de ${min(CROCHET)} viennent d'être ajoutées. L'union fait la force !`);
    const vueA = (await A.agent.get(`/v1/commande-du-mois?maintenant=${T0}`).expect(200)).body.commandes[0];
    expect(vueA.premier).toBeNull();
    expect(vueA.tout.replace(/\u202f/g, " ")).toBe(`Toute la commande d'octobre : 5 000 pièces d'${min(ARDOISE)}, 400 m de ${min(LITEAU)}, 10 boîtes de ${min(CROCHET)}`);
    expect(JSON.stringify(vueA)).not.toMatch(/Toitures B|entreprises/);

    // La clôture : tout est figé, la grille fusionnée part aux trois négoces.
    expect((await tache(APRES_CLOTURE)).body).toMatchObject({ clos: 1, grillesEnvoyees: 3 });
    const demande = mailsVers("n1@example.com").at(-1)!;
    expect(demande.subject).toBe("Commande commune d'octobre (22) : demande de prix sur 3 articles");
    expect(demande.text.replace(/\u202f/g, " ")).toContain(`- ${ARDOISE} : 5 000 pièces`);
    expect(demande.text).toContain("Réponse avant le 08/11 à 18 h, il reste 14 j 6 h");
    expect(demande.text).toContain("Chaque artisan choisit le négoce le moins cher pour lui.");
    expect(demande.text).not.toMatch(/Toitures|Lannion|Paimpol/);

    // C arrive après la clôture : sa liste part avec novembre, en clair.
    const C = await couvreur("c@example.fr", "Toitures C", "5 rue de Kerampont, 22300 Lannion", [{ libelle: ARDOISE, quantite: "1000", unite: "pièces" }]);
    const c1 = (await C.agent.post(`/v1/projects/${C.projectId}/commande-du-mois?maintenant=${APRES_CLOTURE}`).send({ articles: C.articles, nature: "chantier" }).expect(201)).body;
    expect(c1).toMatchObject({ mois: "2026-11", message: "Trop tard pour octobre, ta liste part avec la commande de novembre." });

    // Les négoces chiffrent la MÊME grille ; N3 ne chiffre pas les crochets. Pendant le chrono : premier ou pas, sans prix des autres.
    const j1 = jetonDe("n1@example.com");
    const j2 = jetonDe("n2@example.com");
    const j3 = jetonDe("n3@example.com");
    const pendant = "2026-10-30T09:00:00.000Z";
    const page1 = (await request(ctx.app.getHttpServer()).get(`/v1/grille/${j1}?maintenant=${pendant}`).expect(200)).body;
    expect(page1).toMatchObject({ ouverte: true, mois: "2026-10", departement: "22", depose: null });
    expect(page1.lignes).toHaveLength(3);
    expect((await deposerGrille(j1, [["A", ARDOISE, "5000 pièces", "0,90", "4 500,00"], ["L", LITEAU, "400 m", "0,80", "320,00"], ["C", CROCHET, "10 boîtes", "30,00", "300,00"]], { depart: "Zone de Kerampont, 22300 Lannion", francoKm: "20", prixAuDela: "50" }, pendant)).status).toBe(201);
    expect((await deposerGrille(j2, [["A", ARDOISE, "5000 pièces", "0,88", "4 400,00"], ["L", LITEAU, "400 m", "0,85", "340,00"], ["C", CROCHET, "10 boîtes", "32,00", "320,00"]], { depart: "ZA de Kerfolic, 22500 Paimpol", francoKm: "30", prixAuDela: "40" }, pendant)).status).toBe(201);
    const p3 = await deposerGrille(j3, [["A", ARDOISE, "5000 pièces", "0,80", "4 000,00"], ["L", LITEAU, "400 m", "0,70", "280,00"]], { depart: "Zone de Kerampont, 22300 Lannion", francoKm: "10", prixAuDela: "60" }, pendant);
    expect(p3.status).toBe(201);
    expect(p3.body.depose).toMatchObject({ manquantes: 1 });
    // N2 est premier sur le total (5 100 €) ; N1 ne l'est pas ; N3, incomplet, non plus (malgré 4 340 €).
    const rang = async (j: string) => (await request(ctx.app.getHttpServer()).get(`/v1/grille/${j}?maintenant=${pendant}`).expect(200)).body.rang;
    expect(await rang(j2)).toBe("Vous êtes premier sur le total de la commande.");
    expect(await rang(j1)).toBe("Vous n'êtes pas premier sur le total de la commande.");
    expect(await rang(j3)).toBe("Vous n'êtes pas premier sur le total de la commande.");
    // Revue à froid (23 octobre) : la page de N1 ne contient aucun prix de N2 ni de N3, ni aucun total (nombres JSON compris).
    const pageN1 = JSON.stringify((await request(ctx.app.getHttpServer()).get(`/v1/grille/${j1}?maintenant=${pendant}`).expect(200)).body);
    expect(pageN1).not.toMatch(/0[.,]88|0[.,]85|"prixUnitaire":32|0[.,]7\b|5\s?100|5\s?170|4\s?340|Négoce N[23]/);
    expect(pageN1).toMatch(/0\.9\b/);

    // La veille : personne à relancer (tous ont déposé). À la limite : les résultats.
    expect((await tache("2026-11-07T18:00:00.000Z")).body).toMatchObject({ relances: 0 });
    expect((await tache(LIMITE)).body).toMatchObject({ resultats: 1 });
    expect(mailsVers("n2@example.com").at(-1)!.text).toContain("Votre grille est la moins chère sur le total");
    expect(mailsVers("n1@example.com").at(-1)!.text).toContain("Elle n'est pas la moins chère sur le total");
    expect(mailsVers("n1@example.com").at(-1)!.text).not.toMatch(/0,88|N2|Négoce N2/);

    // A : N2 mis en avant (premier sur le total), mais N3 moins cher pour lui. Les totaux posés à la main.
    const rA = (await A.agent.get(`/v1/commande-du-mois?maintenant=${LIMITE}`).expect(200)).body.commandes.find((c: { mois: string }) => c.mois === "2026-10").resultats;
    const nomDe = (id: string) => rA.negoces.find((n: { negoceId: string }) => n.negoceId === id).nom;
    expect(nomDe(rA.parDefaut)).toBe("Négoce N2");
    expect(nomDe(rA.moinsCherPourToi)).toBe("Négoce N3");
    expect(rA.negoces.map((n: { nom: string; totalHt: number; livraisonHt: number; complet: boolean }) => [n.nom, n.totalHt, n.livraisonHt, n.complet])).toEqual([
      ["Négoce N3", 1880, 0, true],
      ["Négoce N1", 2120, 0, true],
      ["Négoce N2", 2140, 40, true],
    ]);
    const rB = (await B.agent.get(`/v1/commande-du-mois?maintenant=${LIMITE}`).expect(200)).body.commandes.find((c: { mois: string }) => c.mois === "2026-10").resultats;
    expect(rB.negoces.map((n: { nom: string; totalHt: number; complet: boolean }) => [n.nom, n.totalHt, n.complet])).toEqual([
      ["Négoce N2", 2960, true],
      ["Négoce N1", 3050, true],
      ["Négoce N3", 2460, false],
    ]);
    expect(pushVers("b@example.fr").some((m) => m.title === "Les prix sont là")).toBe(true);

    // B ne peut pas commander chez N3 (il manque ses crochets) ; il commande chez N2 : le bon part, avec son nom.
    const n3 = rB.negoces.find((n: { nom: string }) => n.nom === "Négoce N3").negoceId;
    const n2 = rB.parDefaut;
    const cycleId = (await B.agent.get(`/v1/commande-du-mois?maintenant=${LIMITE}`)).body.commandes.find((c: { mois: string }) => c.mois === "2026-10").cycleId;
    expect((await B.agent.post(`/v1/commande-du-mois/${cycleId}/commander?maintenant=${LIMITE}`).send({ negoceId: n3 }).expect(400)).body.error.details).toMatchObject({ reason: "grille_incomplete" });
    const apres = (await B.agent.post(`/v1/commande-du-mois/${cycleId}/commander?maintenant=${LIMITE}`).send({ negoceId: n2 }).expect(200)).body;
    expect(apres.suivi).toMatchObject({ etape: 4, phrase: "C'est commandé." });
    const bon = mailsVers("n2@example.com").at(-1)!;
    expect(bon.subject).toBe(`Bon de commande, commande commune d'octobre n° ${apres.numero}`);
    expect(bon.attachments?.[0]?.filename).toMatch(/^bon-de-commande-2026-10-/);
    await B.agent.post(`/v1/commande-du-mois/${cycleId}/commander?maintenant=${LIMITE}`).send({ negoceId: n2 }).expect(409);
  });

  it("le suivi d'un chantier dans la commande : Liste déposée, puis Commande close", async () => {
    const A = await couvreur("a@example.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }]);
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    expect((await A.agent.get(`/v1/projects/${A.projectId}/commande-du-mois/suivi?maintenant=${T0}`).expect(200)).body.suivi).toMatchObject({ etape: 0, phrase: "Ta liste est dans la commande d'octobre." });
    // Une ligne se retire avant la clôture, plus après.
    const ligne = (await A.agent.get(`/v1/commande-du-mois?maintenant=${T0}`)).body.commandes[0].mesLignes[0].id;
    await tache(APRES_CLOTURE);
    await A.agent.delete(`/v1/commande-du-mois/lignes/${ligne}?maintenant=${APRES_CLOTURE}`).expect(409);
    // Aucun négoce couverture dans le 22 : la commande est close, aucune grille ne part.
    expect((await A.agent.get(`/v1/projects/${A.projectId}/commande-du-mois/suivi?maintenant=${APRES_CLOTURE}`).expect(200)).body.suivi).toMatchObject({ etape: 1, phrase: "La commande d'octobre est close." });
  });

  it("la notification d'ajout : au plus une par jour, les suivantes regroupées le lendemain", async () => {
    const A = await couvreur("a@example.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }]);
    const B = await couvreur("b@example.fr", "Toitures B", "12 rue du Port, 22500 Paimpol", [{ libelle: ARDOISE, quantite: "3000", unite: "pièces" }, { libelle: LITEAU, quantite: "400", unite: "m" }]);
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    await B.agent.post(`/v1/projects/${B.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: [B.articles[0]!], nature: "chantier" }).expect(201);
    await B.agent.post(`/v1/projects/${B.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: [B.articles[1]!], nature: "chantier" }).expect(201);
    const ajouts = () => pushVers("a@example.fr").filter((m) => m.title === "La commande commune grossit");
    expect(ajouts()).toHaveLength(1);
    await tache("2026-10-17T07:00:00.000Z");
    expect(ajouts()).toHaveLength(2);
    expect(ajouts()[1]!.body).toBe(`+400 m de ${min(LITEAU)} viennent d'être ajoutés. L'union fait la force !`);
  });

  it("l'admin règle les dates : elles valent pour la commande en cours ; un artisan ne peut pas", async () => {
    const admin = await signUpWithCompany(ctx.app, "greg@example.fr", "Admin");
    const A = await couvreur("a@example.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }]);
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    expect((await admin.agent.get("/v1/admin/commande-du-mois/config").expect(200)).body).toEqual({ jourCloture: 25, heureCloture: 12, joursReponse: 14, heureReponse: 18, jourClotureDecembre: 18 });
    await A.agent.get("/v1/admin/commande-du-mois/config").expect(403);
    await A.agent.put("/v1/admin/commande-du-mois/config").send({ jourCloture: 20, heureCloture: 12, joursReponse: 14, heureReponse: 18 }).expect(403);
    expect((await admin.agent.put("/v1/admin/commande-du-mois/config").send({ jourCloture: 31, heureCloture: 12, joursReponse: 14, heureReponse: 18 }).expect(400)).body.error.details).toMatchObject({ reason: "reglages_invalides" });
    await admin.agent.put("/v1/admin/commande-du-mois/config").send({ jourCloture: 20, heureCloture: 12, joursReponse: 14, heureReponse: 18 }).expect(200);
    // Le 20 octobre à 12 h (Paris, heure d'été) : 10 h UTC ; le chrono de A suit.
    const vue = (await A.agent.get(`/v1/commande-du-mois?maintenant=${T0}`).expect(200)).body.commandes[0];
    expect(vue.clotureLe).toBe("2026-10-20T10:00:00.000Z");
    expect(vue.clotureDans).toBe("4 j 3 h");
  });

  it("le bloc de « Ton chantier » suit le département du chantier, pas celui de l'entreprise", async () => {
    const A = await couvreur("a@example.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }]);
    await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
    // B a son entreprise à Paimpol (22), mais ce chantier est à Brest (29).
    const B = await couvreur("b@example.fr", "Toitures B", "12 rue du Port, 22500 Paimpol", [{ libelle: LITEAU, quantite: "300", unite: "m" }]);
    await B.agent.patch(`/v1/projects/${B.projectId}`).send({ address: "2 rue de Siam, 29200 Brest" }).expect(200);
    await B.agent.post(`/v1/projects/${B.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: B.articles, nature: "stock" }).expect(201);
    const sansChantier = (await B.agent.get(`/v1/commande-du-mois?maintenant=${T0}`).expect(200)).body.prochaine;
    expect(sansChantier.tout.replace(/\u202f/g, " ")).toContain("2 000 pièces d'ardoise");
    const duChantier = (await B.agent.get(`/v1/commande-du-mois?maintenant=${T0}&projectId=${B.projectId}`).expect(200)).body.prochaine;
    expect(duChantier).toMatchObject({ mois: "2026-10", zone: "29" });
    expect(duChantier.tout).toContain("300 m de liteau");
    expect(duChantier.tout).not.toContain("ardoise");
    // Le chantier d'une autre entreprise : introuvable.
    await B.agent.get(`/v1/commande-du-mois?maintenant=${T0}&projectId=${A.projectId}`).expect(404);
  });

  describe("revue à froid", () => {
    /** A dépose, deux négoces couverture du 22, la clôture passe. */
    async function commandeClose(echecs = 0) {
      const A = await couvreur("a@example.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", [{ libelle: ARDOISE, quantite: "2000", unite: "pièces" }]);
      for (const [nom, email] of [["Négoce N1", "n1@example.com"], ["Négoce N2", "n2@example.com"]] as const) {
        await A.agent.post("/v1/groupe/negoces").send({ nom, email, familles: ["couverture"] }).expect(201);
      }
      await A.agent.post(`/v1/projects/${A.projectId}/commande-du-mois?maintenant=${T0}`).send({ articles: A.articles, nature: "chantier" }).expect(201);
      ctx.emails.failNext = echecs;
      const cloture = (await tache(APRES_CLOTURE)).body;
      ctx.emails.failNext = 0;
      return { A, cloture };
    }

    it("la relance de la veille garde le lien du premier e-mail", async () => {
      await commandeClose();
      const premier = jetonDe("n1@example.com");
      expect((await tache("2026-11-07T18:00:00.000Z")).body).toMatchObject({ relances: 2 });
      expect(mailsVers("n1@example.com").at(-1)!.subject).toMatch(/rappel|relance|demain/i);
      expect(jetonDe("n1@example.com")).toBe(premier);
      await request(ctx.app.getHttpServer()).get(`/v1/grille/${premier}?maintenant=2026-11-07T19:00:00.000Z`).expect(200);
    });

    it("une grille qui n'est pas partie (prestataire en panne) repart au passage suivant", async () => {
      // Trois refus de suite : les deux envois de la clôture, puis le premier nouvel essai du même passage.
      const { cloture } = await commandeClose(3);
      expect(cloture).toMatchObject({ clos: 1, grillesEnvoyees: 1 });
      expect((await tache("2026-10-25T12:00:00.000Z")).body).toMatchObject({ grillesEnvoyees: 1 });
      expect(mailsVers("n1@example.com").filter((m) => /\/grille\//.test(m.text))).toHaveLength(1);
      expect(mailsVers("n2@example.com").filter((m) => /\/grille\//.test(m.text))).toHaveLength(1);
      // Rejouable : plus rien à envoyer.
      expect((await tache("2026-10-25T13:00:00.000Z")).body).toMatchObject({ grillesEnvoyees: 0 });
    });

    it("deux « Commander » en même temps (double appui) : un seul bon de commande", async () => {
      const { A } = await commandeClose();
      const pendant = "2026-10-30T09:00:00.000Z";
      expect((await deposerGrille(jetonDe("n1@example.com"), [["A", ARDOISE, "2000 pièces", "0,90", "1 800,00"]], { depart: "Zone de Kerampont, 22300 Lannion", francoKm: "20", prixAuDela: "50" }, pendant)).status).toBe(201);
      await tache(LIMITE);
      const c = (await A.agent.get(`/v1/commande-du-mois?maintenant=${LIMITE}`).expect(200)).body.commandes.find((x: { mois: string }) => x.mois === "2026-10");
      const statuts = (await Promise.all([1, 2].map(() => A.agent.post(`/v1/commande-du-mois/${c.cycleId}/commander?maintenant=${LIMITE}`).send({ negoceId: c.resultats.parDefaut })))).map((r) => r.status).sort();
      expect(statuts).toEqual([200, 409]);
      expect(mailsVers("n1@example.com").filter((m) => m.subject.startsWith("Bon de commande"))).toHaveLength(1);
    });

    it("un bon de commande qui ne part pas laisse la commande à refaire", async () => {
      const { A } = await commandeClose();
      expect((await deposerGrille(jetonDe("n1@example.com"), [["A", ARDOISE, "2000 pièces", "0,90", "1 800,00"]], { depart: "Zone de Kerampont, 22300 Lannion", francoKm: "20", prixAuDela: "50" }, "2026-10-30T09:00:00.000Z")).status).toBe(201);
      await tache(LIMITE);
      const c = (await A.agent.get(`/v1/commande-du-mois?maintenant=${LIMITE}`).expect(200)).body.commandes.find((x: { mois: string }) => x.mois === "2026-10");
      ctx.emails.failNext = 1;
      await A.agent.post(`/v1/commande-du-mois/${c.cycleId}/commander?maintenant=${LIMITE}`).send({ negoceId: c.resultats.parDefaut }).expect(502);
      await A.agent.post(`/v1/commande-du-mois/${c.cycleId}/commander?maintenant=${LIMITE}`).send({ negoceId: c.resultats.parDefaut }).expect(200);
    });
  });
});
