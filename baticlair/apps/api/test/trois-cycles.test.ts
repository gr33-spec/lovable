import request from "supertest";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";

/**
 * TROIS COMMANDES COMPLÈTES (revue à froid du 23 octobre 2026 ; cycle raccourci le même jour) : le 15 octobre, le 1er
 * novembre et le 15 décembre 2026, avec des données
 * de couvreurs des Côtes-d'Armor. Chaque chiffre est posé à la main dans `docs/groupe/RECETTE.md` (« Trois cycles à la
 * main ») AVANT d'être vérifié ici. Distances (table des communes de test, vol d'oiseau × 1,3) : Lannion–Ploubazlanec
 * 42 km, Lannion–Saint-Brieuc 74, Lannion–Guingamp 38, Lannion–Paimpol 40, Saint-Brieuc–Ploubazlanec 49,
 * Saint-Brieuc–Guingamp 38, Saint-Brieuc–Paimpol 48, Paimpol–Ploubazlanec 3, Paimpol–Guingamp 33.
 */
let ctx: TestContext;
const avant = { groupe: process.env.GROUPE, cron: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.CRON_SECRET = "secret-de-la-tache";
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [cle, v] of [["GROUPE", avant.groupe], ["CRON_SECRET", avant.cron]] as const) {
    if (v === undefined) delete process.env[cle];
    else process.env[cle] = v;
  }
});

const ARD = "Ardoise naturelle 32×22 Espagne 1er choix";
const CRO = "Crochet inox 100 mm";
const LIT = "Liteau sapin traité 27×38";
type Ligne = { libelle: string; quantite: string; unite: string };
const ard = (q: number): Ligne => ({ libelle: ARD, quantite: String(q), unite: "pièces" });
const cro = (q: number): Ligne => ({ libelle: CRO, quantite: String(q), unite: "boîtes" });
const lit = (q: number): Ligne => ({ libelle: LIT, quantite: String(q), unite: "m" });

const ADR = {
  lannion: "3 rue des Ajoncs, 22300 Lannion",
  ploubazlanec: "7 chemin de Pors Even, 22620 Ploubazlanec",
  saintBrieuc: "18 rue de Gouët, 22000 Saint-Brieuc",
  guingamp: "4 place du Centre, 22200 Guingamp",
  paimpol: "12 rue du Port, 22500 Paimpol",
};

const server = () => request(ctx.app.getHttpServer());
const tache = (maintenant: string) => server().get(`/v1/internal/commande-du-mois?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", "Bearer secret-de-la-tache").expect(200).then((r) => r.body);
const mails = (to: string) => ctx.emails.sent.filter((m) => m.to === to);
const jetonDe = (to: string) => /\/grille\/([A-Za-z0-9_-]+)/.exec(mails(to).filter((m) => /\/grille\//.test(m.text)).at(-1)!.text)![1]!;

async function couvreur(email: string, nom: string, adresse: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["roofing"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: "73282932000074", siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: "73282932000074", phone: null, email: null }).expect(200);
  return { agent, nom };
}
type Couvreur = Awaited<ReturnType<typeof couvreur>>;

/** Un chantier (sa liste, son adresse de livraison) déposé dans la commande du mois à `maintenant`. */
async function depose(c: Couvreur, adresse: string, lignes: Ligne[], nature: "chantier" | "stock", maintenant: string, visee?: string) {
  const q = (await c.agent.post("/v1/quantitatifs").send({ lignes }).expect(201)).body as { projetId: string };
  await c.agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const articles = ((await c.agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string }[]).map((b) => b.key);
  return (await c.agent.post(`/v1/projects/${q.projetId}/commande-du-mois?maintenant=${encodeURIComponent(maintenant)}`).send({ articles, nature, ...(visee ? { mois: visee } : {}) }).expect(201)).body as { mois: string; message: string | null };
}

async function grille(email: string, rows: FixtureRow[], depart: string, francoKm: string, prixAuDela: string, maintenant: string) {
  const pdf = Buffer.from(await makePdf(["devis"], rows, "Total HT", "DEVIS"));
  return server()
    .post(`/v1/grille/${jetonDe(email)}?maintenant=${encodeURIComponent(maintenant)}`)
    .field("depart", depart)
    .field("francoKm", francoKm)
    .field("prixAuDela", prixAuDela)
    .attach("file", pdf, { filename: "devis.pdf", contentType: "application/pdf" })
    .expect(201)
    .then((r) => r.body as { rang: string; depose: { manquantes: number } });
}

interface Resultat {
  cycleId: string;
  resultats: null | { parDefaut: string; moinsCherPourToi: string; negoces: { negoceId: string; nom: string; totalHt: number; marchandiseHt: number; livraisonHt: number; complet: boolean }[] };
}
async function resultats(c: Couvreur, mois: string, maintenant: string) {
  const vue = ((await c.agent.get(`/v1/commande-du-mois?maintenant=${encodeURIComponent(maintenant)}`).expect(200)).body.commandes as (Resultat & { mois: string })[]).find((x) => x.mois === mois)!;
  const nom = (id: string | null | undefined) => vue.resultats?.negoces.find((n) => n.negoceId === id)?.nom ?? null;
  return {
    cycleId: vue.cycleId,
    lignes: vue.resultats?.negoces.map((n) => [n.nom, n.marchandiseHt, n.livraisonHt, n.totalHt, n.complet]) ?? null,
    parDefaut: nom(vue.resultats?.parDefaut),
    moinsCherPourToi: nom(vue.resultats?.moinsCherPourToi),
    id: (n: string) => vue.resultats!.negoces.find((x) => x.nom === n)!.negoceId,
  };
}
const commander = (c: Couvreur, cycleId: string, negoceId: string, maintenant: string) =>
  c.agent.post(`/v1/commande-du-mois/${cycleId}/commander?maintenant=${encodeURIComponent(maintenant)}`).send({ negoceId });

it("15 octobre, 1er novembre, 15 décembre : trois commandes complètes, chaque total posé à la main", { timeout: 180_000 }, async () => {
  const A = await couvreur("a@toitures.fr", "Toitures A", ADR.lannion);
  const B = await couvreur("b@toitures.fr", "Toitures B", ADR.saintBrieuc);
  const D = await couvreur("d@toitures.fr", "Toitures D", ADR.guingamp);
  for (const [i, email] of [1, 2, 3, 4].map((i) => [i, `n${i}@negoce.fr`] as const)) {
    await A.agent.post("/v1/groupe/negoces?maintenant=2026-10-10T08:00:00.000Z").send({ nom: `Négoce N${i}`, email, familles: ["couverture"] }).expect(201);
  }

  // ── 15 OCTOBRE ─────────────────────────────────────────────────────────────────────────────────────────────────────
  // Clôture le jeudi 15 octobre à 12 h (heure d'été : 10 h UTC) ; 5 jours ouvrés : réponses avant le jeudi 22, 18 h (16 h UTC).
  const oct = "2026-10-10T08:00:00.000Z";
  expect((await depose(A, ADR.lannion, [ard(2400), lit(520)], "chantier", oct)).mois).toBe("2026-10-15");
  await depose(A, ADR.ploubazlanec, [ard(1800), cro(8)], "chantier", oct);
  await depose(B, ADR.saintBrieuc, [ard(3000), cro(12), lit(300)], "stock", oct);
  await depose(D, ADR.guingamp, [lit(800)], "chantier", oct);
  const vueA = (await A.agent.get(`/v1/commande-du-mois?maintenant=${oct}`).expect(200)).body.commandes[0];
  expect(vueA.clotureLe).toBe("2026-10-15T10:00:00.000Z");
  expect(vueA.reponseAvant).toBe("2026-10-22T16:00:00.000Z");
  expect(vueA.tout.replace(/\u202f/g, " ")).toBe("Toute la commande du 15 octobre : 7 200 pièces d'ardoise naturelle 32×22 Espagne 1er choix, 1 620 m de liteau sapin traité 27×38, 20 boîtes de crochet inox 100 mm");
  expect(vueA.toi.replace(/\u202f/g, " ")).toBe("Toi seul : 4 200 pièces d'ardoise naturelle 32×22 Espagne 1er choix, 520 m de liteau sapin traité 27×38, 8 boîtes de crochet inox 100 mm");

  expect(await tache("2026-10-15T10:01:00.000Z")).toMatchObject({ clos: 1, grillesEnvoyees: 4 });
  // C, à Paimpol, le lendemain de la clôture, l'écran encore sur le 15 octobre : sa liste part avec le 1er novembre.
  const C = await couvreur("c@toitures.fr", "Toitures C", ADR.paimpol);
  expect(await depose(C, ADR.paimpol, [ard(2000), lit(400)], "chantier", "2026-10-16T09:00:00.000Z", "2026-10-15")).toEqual({ mois: "2026-11-01", message: "Trop tard pour le 15 octobre, ta liste part avec la commande du 1er novembre.", vue: expect.anything() });

  const p = "2026-10-19T09:00:00.000Z";
  expect((await grille("n1@negoce.fr", [["A", ARD, "7200 pièces", "0,92", ""], ["L", LIT, "1620 m", "0,78", ""], ["C", CRO, "20 boîtes", "29,50", ""]], "ZA de Kerverzot, 22300 Lannion", "25", "55", p)).rang).toBe("Vous êtes premier sur le total de la commande.");
  expect((await grille("n2@negoce.fr", [["A", ARD, "7200 pièces", "0,95", ""], ["L", LIT, "1620 m", "0,74", ""], ["C", CRO, "20 boîtes", "28,00", ""]], "Rue de la Gare, 22000 Saint-Brieuc", "40", "45", p)).rang).toBe("Vous n'êtes pas premier sur le total de la commande.");
  const n3 = await grille("n3@negoce.fr", [["A", ARD, "7200 pièces", "0,89", ""], ["L", LIT, "1620 m", "0,81", ""]], "Quai Morand, 22500 Paimpol", "10", "60", p);
  expect(n3).toMatchObject({ rang: "Vous n'êtes pas premier sur le total de la commande.", depose: { manquantes: 1 } });
  // N4 ne répond pas : relancé la veille, une fois.
  expect(await tache("2026-10-21T16:30:00.000Z")).toMatchObject({ relances: 1 });
  expect(await tache("2026-10-21T17:30:00.000Z")).toMatchObject({ relances: 0 });
  expect(await tache("2026-10-22T16:01:00.000Z")).toMatchObject({ resultats: 1 });

  const rA = await resultats(A, "2026-10-15", "2026-10-23T08:00:00.000Z");
  expect(rA.lignes).toEqual([
    ["Négoce N1", 4505.6, 55, 4560.6, true],
    ["Négoce N2", 4598.8, 90, 4688.8, true],
    ["Négoce N3", 4159.2, 60, 4219.2, false],
  ]);
  expect([rA.parDefaut, rA.moinsCherPourToi]).toEqual(["Négoce N1", "Négoce N1"]);
  const rB = await resultats(B, "2026-10-15", "2026-10-23T08:00:00.000Z");
  expect(rB.lignes).toEqual([
    ["Négoce N1", 3348, 55, 3403, true],
    ["Négoce N2", 3408, 0, 3408, true],
    ["Négoce N3", 2913, 60, 2973, false],
  ]);
  const rD = await resultats(D, "2026-10-15", "2026-10-23T08:00:00.000Z");
  expect(rD.lignes).toEqual([
    ["Négoce N2", 592, 0, 592, true],
    ["Négoce N1", 624, 55, 679, true],
    ["Négoce N3", 648, 60, 708, true],
  ]);
  // Le moins cher sur toute la commande (N1, 8 642,60 €) est proposé à D, mais N2 est moins cher pour lui : il le prend.
  expect([rD.parDefaut, rD.moinsCherPourToi]).toEqual(["Négoce N1", "Négoce N2"]);
  await commander(A, rA.cycleId, rA.id("Négoce N1"), "2026-10-23T08:00:00.000Z").expect(200);
  await commander(B, rB.cycleId, rB.id("Négoce N1"), "2026-10-23T08:00:00.000Z").expect(200);
  await commander(D, rD.cycleId, rD.id("Négoce N2"), "2026-10-23T08:00:00.000Z").expect(200);
  expect(mails("n1@negoce.fr").filter((m) => m.subject.startsWith("Bon de commande"))).toHaveLength(2);
  expect(mails("n2@negoce.fr").filter((m) => m.subject.startsWith("Bon de commande"))).toHaveLength(1);
  // Le négoce non retenu reçoit un message neutre, jamais les prix des autres.
  const neutre = mails("n2@negoce.fr").find((m) => /résultat|commande commune du 15 octobre/i.test(m.subject) && !m.subject.startsWith("Bon"))!;
  expect(neutre.text).not.toMatch(/0,92|29,50|N1|8 642/);

  // ── 1ER NOVEMBRE ────────────────────────────────────────────────────────────────────────────────────────────────────
  // Le 1er novembre est un dimanche : clôture à 12 h quand même (heure d'hiver : 11 h UTC) ; 5 jours ouvrés du lundi 2 au
  // vendredi 6 : réponses avant le 6 novembre, 18 h. N5 arrive (dépôt à Paimpol).
  await C.agent.post("/v1/groupe/negoces?maintenant=2026-10-28T09:00:00.000Z").send({ nom: "Négoce N5", email: "n5@negoce.fr", familles: ["couverture"] }).expect(201);
  const E = await couvreur("e@toitures.fr", "Toitures E", ADR.ploubazlanec);
  const nov = "2026-10-28T09:00:00.000Z";
  expect((await depose(A, ADR.lannion, [ard(1500)], "chantier", nov)).mois).toBe("2026-11-01");
  await depose(E, ADR.ploubazlanec, [cro(5)], "stock", nov);
  expect(await tache("2026-11-01T11:01:00.000Z")).toMatchObject({ clos: 1, grillesEnvoyees: 5 });
  const vueC = (await C.agent.get(`/v1/commande-du-mois?maintenant=2026-11-02T09:00:00.000Z`).expect(200)).body.commandes.find((x: { mois: string }) => x.mois === "2026-11-01");
  expect(vueC.reponseAvant).toBe("2026-11-06T17:00:00.000Z");
  // Égalité sur le total (3 735 €) : le premier déposé passe devant (N5, le 3 ; N2, le 4).
  expect((await grille("n5@negoce.fr", [["A", ARD, "3500 pièces", "0,92", ""], ["L", LIT, "400 m", "0,75", ""], ["C", CRO, "5 boîtes", "33,00", ""]], "Quai Morand, 22500 Paimpol", "20", "50", "2026-11-03T09:00:00.000Z")).rang).toBe("Vous êtes premier sur le total de la commande.");
  expect((await grille("n2@negoce.fr", [["A", ARD, "3500 pièces", "0,90", ""], ["L", LIT, "400 m", "0,75", ""], ["C", CRO, "5 boîtes", "30,00", ""]], "Rue de la Gare, 22000 Saint-Brieuc", "40", "45", "2026-11-04T09:00:00.000Z")).rang).toBe("Vous n'êtes pas premier sur le total de la commande.");
  expect(await tache("2026-11-05T17:30:00.000Z")).toMatchObject({ relances: 3 });
  expect(await tache("2026-11-06T17:01:00.000Z")).toMatchObject({ resultats: 1 });
  const nA = await resultats(A, "2026-11-01", "2026-11-07T08:00:00.000Z");
  expect(nA.lignes).toEqual([
    ["Négoce N2", 1350, 45, 1395, true],
    ["Négoce N5", 1380, 50, 1430, true],
  ]);
  expect([nA.parDefaut, nA.moinsCherPourToi]).toEqual(["Négoce N5", "Négoce N2"]);
  const nC = await resultats(C, "2026-11-01", "2026-11-07T08:00:00.000Z");
  expect(nC.lignes).toEqual([
    ["Négoce N5", 2140, 0, 2140, true],
    ["Négoce N2", 2100, 45, 2145, true],
  ]);
  const nE = await resultats(E, "2026-11-01", "2026-11-07T08:00:00.000Z");
  expect(nE.lignes).toEqual([
    ["Négoce N5", 165, 0, 165, true],
    ["Négoce N2", 150, 45, 195, true],
  ]);
  // A garde sa commande du 15 octobre et ne voit le 1er novembre que pour ses nouvelles lignes.
  await commander(A, nA.cycleId, nA.id("Négoce N2"), "2026-11-07T08:00:00.000Z").expect(200);
  await commander(C, nC.cycleId, nC.id("Négoce N5"), "2026-11-07T08:00:00.000Z").expect(200);

  // ── 15 DÉCEMBRE ────────────────────────────────────────────────────────────────────────────────────────────────────
  // Greg (23 octobre) : en décembre, le 15 à 12 h (11 h UTC) puis le 1er janvier ; 5 jours ouvrés : réponses avant le
  // mardi 22 décembre, 18 h. Aucun négoce ne répond.
  const F = await couvreur("f@toitures.fr", "Toitures F", ADR.saintBrieuc);
  expect((await depose(F, ADR.saintBrieuc, [lit(200)], "chantier", "2026-12-02T09:00:00.000Z")).mois).toBe("2026-12-15");
  const vueF = (await F.agent.get("/v1/commande-du-mois?maintenant=2026-12-02T09:00:00.000Z").expect(200)).body.commandes[0];
  expect([vueF.clotureLe, vueF.reponseAvant, vueF.premier]).toEqual(["2026-12-15T11:00:00.000Z", "2026-12-22T17:00:00.000Z", "Pour l'instant, tu es le premier. Partage le lien pour faire grossir la commande."]);
  expect(await tache("2026-12-15T11:01:00.000Z")).toMatchObject({ clos: 1, grillesEnvoyees: 5 });
  expect(await tache("2026-12-22T17:01:00.000Z")).toMatchObject({ resultats: 1 });
  const dF = await resultats(F, "2026-12-15", "2026-12-23T08:00:00.000Z");
  expect(dF.lignes).toBeNull();
  expect((await F.agent.get("/v1/commande-du-mois?maintenant=2026-12-23T08:00:00.000Z").expect(200)).body.commandes.find((x: { mois: string }) => x.mois === "2026-12-15").suivi).toMatchObject({ etape: 2, phrase: "Aucun négoce n'a chiffré la commande du 15 décembre.", aFaire: "Commande ta liste en direct chez ton négoce." });
  // Après le 15 décembre, la suivante est le 1er janvier (un vendredi) : réponses avant le vendredi 8, 18 h.
  expect((await F.agent.get("/v1/commande-du-mois?maintenant=2026-12-23T08:00:00.000Z").expect(200)).body.prochaine).toMatchObject({ mois: "2027-01-01", de: "du 1er janvier", clotureLe: "2027-01-01T11:00:00.000Z" });
});
