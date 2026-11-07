/**
 * ACHATS GROUPÉS V1 (Greg, 7 novembre 2026 : « La V5.2 est validée »). Les tests obligatoires côté serveur :
 * une ligne jamais à la fois en demande individuelle et en achat groupé ; aucun volume indicatif ou non reconfirmé
 * transmis ; deux achats identiques ne divisent jamais les volumes ; produit, date ou réception différents = besoin séparé ;
 * une entreprise ne voit ni ne modifie les données privées d'une autre ; ni adresse exacte ni quantité individuelle ;
 * classement par lot d'une liste tapée ; famille non autorisée gardée ; conversion à confirmer ; modifier ne retire pas ;
 * un retrait met à jour volumes et historique ; « À faire » même si l'e-mail échoue ; opérations répétées sans doublon.
 */
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { SIRET_ARTISAN } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUp, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "CRON_SECRET", "EMAIL_DOMAINE", "MODE_REGROUPEMENT", "ACHATS_GROUPES_V1", "GROUPE_ADMINS"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
const restaurer = () => {
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
};
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT;
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.EMAIL_DOMAINE = "mobiiz.test";
  process.env.ACHATS_GROUPES_V1 = "on";
  process.env.GROUPE_ADMINS = "greg@mobiiz.test";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  restaurer();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.clear();
});

const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const ADRESSE = "12 rue du Port, 22300 Lannion";
const ARDOISE = { type: "ardoise", attributs: { format: "32x22", origine: "espagne", qualite: "1", epaisseur: "5" } };
let compteur = 0;
const cle = () => `cle-test-${Date.now()}-${compteur++}`;

/** Une entreprise vérifiée (INSEE, e-mail, « Je déclare être »), dans les Côtes-d'Armor. */
async function entreprise(email: string, nom = "Toitures", options: { declarer?: boolean } = {}) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["roofing"]);
  await agent.patch("/v1/company/profile").send({ name: nom, address: ADRESSE, siret: SIRET_ARTISAN, phone: null, email: null }).expect(200);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: SIRET_ARTISAN, siretVerifieLe: new Date(Date.now() - 60_000) } });
  await ctx.prisma.user.update({ where: { email }, data: { emailVerified: true } });
  if (options.declarer !== false) await agent.post("/v1/ag/habilitation").send({ role: "dirigeant" }).expect(200);
  return { agent, companyId, email };
}

const besoin = (b: Partial<Record<string, unknown>> = {}) => ({ ...ARDOISE, quantite: 10, unite: "palette", parUnite: 480, conversionConfirmee: true, reception: "livraison", lieu: ADRESSE, dateBesoin: jour(40), ...b });
const confirmer = (agent: Agent, besoins: Record<string, unknown>[], cleIdempotence = cle()) => agent.post("/v1/ag/besoins").send({ besoins, confirmation: true, cleIdempotence });

/** Une liste tapée à la main, validée, dans un chantier de l'entreprise. */
async function liste(agent: Agent, lignes: { libelle: string; quantite: string; unite: string }[]) {
  const q = (await agent.post("/v1/quantitatifs").send({ lignes }).expect(201)).body as { id: string; projetId: string };
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: ADRESSE }).expect(200);
  let courant = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 15 && courant.questions.length > 0; i++) {
    const question = courant.questions[0];
    courant = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  await agent.post(`/v1/quantitatifs/${q.id}/validation`).expect(200);
  const vue = (await agent.get(`/v1/ag/projects/${q.projetId}/lignes`).expect(200)).body as { lignes: { key: string; designation: string; lot: string; mention: string; texte: string; selectionnable: boolean }[] };
  return { projectId: q.projetId, lignes: vue.lignes };
}

async function admin() {
  const agent = await signUp(ctx.app, "greg@mobiiz.test", "Greg");
  await doubleAuthentification(ctx, agent, "greg@mobiiz.test");
  return agent;
}

describe("le réglage", () => {
  it("coupé par défaut : les routes V1 n'existent pas (404), rien ne change en ligne", async () => {
    delete process.env.ACHATS_GROUPES_V1;
    const coupe = await createTestApp();
    try {
      const { agent } = await signUpWithCompany(coupe.app, "off@toitures.fr", "Off");
      expect((await agent.get("/v1/ag/etat")).status).toBe(404);
      expect((await agent.post("/v1/ag/besoins").send({ besoins: [besoin()], confirmation: true, cleIdempotence: cle() })).status).toBe(404);
    } finally {
      await coupe.app.close();
      process.env.ACHATS_GROUPES_V1 = "on";
    }
  });
});

describe("entrée directe par produit", () => {
  it("vérification de l'entreprise d'abord : sans « Je déclare être », rien n'est créé", async () => {
    const a = await entreprise("a@toitures.fr", "Toitures A", { declarer: false });
    const r = await confirmer(a.agent, [besoin()]);
    expect(r.status).toBe(403);
    expect(r.body.error.details).toMatchObject({ reason: "verification_requise" });
    expect(await ctx.prisma.besoinGroupeV1.count()).toBe(0);
    const etat = (await a.agent.get("/v1/ag/etat").expect(200)).body;
    expect(etat.verification).toMatchObject({ siretVerifie: true, emailVerifie: true, habilitation: null, complete: false });
    expect(etat.zone).toEqual({ code: "22", nom: "Côtes-d'Armor" });
    expect(etat.raisons.map((r: { libelle: string }) => r.libelle)).not.toContain("Ma zone est différente");
  });

  it("caractéristique manquante : refus qui dit quoi préciser ; conversion non confirmée : refus", async () => {
    const a = await entreprise("a@toitures.fr");
    const manque = await a.agent.post("/v1/ag/compatibilite").send({ type: "ardoise", attributs: { format: "32x22", origine: "espagne", qualite: "1" }, reception: "livraison", dateBesoin: jour(40) });
    expect(manque.status).toBe(400);
    expect(manque.body.error.details.message).toBe("À préciser : épaisseur manquante. Précise-les pour rejoindre un achat groupé.");
    const conv = await confirmer(a.agent, [besoin({ conversionConfirmee: false })]);
    expect(conv.status).toBe(400);
    expect(conv.body.error.details.reason).toBe("conversion_non_confirmee");
    expect(await ctx.prisma.besoinGroupeV1.count()).toBe(0);
  });

  it("aucun achat compatible : on l'ouvre ; la quantité de référence reste en pièces (10 palettes = 4 800 pièces)", async () => {
    const a = await entreprise("a@toitures.fr");
    const c = (await a.agent.post("/v1/ag/compatibilite").send({ ...ARDOISE, reception: "livraison", dateBesoin: jour(40) }).expect(200)).body;
    expect(c.compatible).toBeNull();
    expect(c.produit.nom).toBe("Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm");
    expect(c.ouverture.possible).toBe(true);
    const r = (await confirmer(a.agent, [besoin()]).expect(201)).body;
    expect(r.besoins[0]).toMatchObject({ statut: { libelle: "Besoin confirmé" }, quantite: { valeur: 4800, lisible: "10 palettes = 4 800 pièces" } });
    expect(r.besoins[0].achat.conditionnement.libelle).toBe("1 palette = 480 pièces");
    const h = await ctx.prisma.historiqueBesoinGroupeV1.findMany();
    expect(h.map((x) => x.type)).toEqual(["ouvert"]);
  });

  it("deux achats identiques ne divisent jamais les volumes : rejoindre obligatoire, même en simultané", async () => {
    const a = await entreprise("a@toitures.fr", "Toitures A");
    const b = await entreprise("b@toitures.fr", "Toitures B");
    const c = await entreprise("c@toitures.fr", "Toitures C");
    // Simultané : deux entreprises ouvrent le même produit au même instant → un seul achat.
    const [r1, r2] = await Promise.all([confirmer(a.agent, [besoin()]), confirmer(b.agent, [besoin({ dateBesoin: jour(45) })])]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    const perdant = r1.status === 409 ? r1 : r2;
    expect(perdant.body.error.details).toMatchObject({ reason: "besoin_identique", message: "Ce besoin est identique : rejoins cet achat groupé pour ne pas diviser les volumes." });
    expect(await ctx.prisma.achatGroupeV1.count()).toBe(1);
    // La troisième voit l'achat compatible et le rejoint.
    const vu = (await c.agent.post("/v1/ag/compatibilite").send({ ...ARDOISE, reception: "livraison", dateBesoin: jour(50) }).expect(200)).body;
    expect(vu.compatible).not.toBeNull();
    expect((await confirmer(c.agent, [besoin({ dateBesoin: jour(50) })])).status).toBe(409);
    await confirmer(c.agent, [besoin({ dateBesoin: jour(50), achatId: vu.compatible.id })]).expect(201);
    expect(await ctx.prisma.achatGroupeV1.count()).toBe(1);
    expect(await ctx.prisma.besoinGroupeV1.count({ where: { achatId: vu.compatible.id } })).toBe(2);
  });

  it("produit, date ou réception différents ouvrent un besoin séparé (un autre achat)", async () => {
    const a = await entreprise("a@toitures.fr");
    await confirmer(a.agent, [besoin()]).expect(201);
    await confirmer(a.agent, [besoin({ attributs: { ...ARDOISE.attributs, format: "40x25" } })]).expect(201);
    await confirmer(a.agent, [besoin({ dateBesoin: jour(70) })]).expect(201);
    await confirmer(a.agent, [besoin({ reception: "retrait", lieu: "Dépôt de Lannion" })]).expect(201);
    expect(await ctx.prisma.achatGroupeV1.count()).toBe(4);
  });

  it("opérations répétées : la même confirmation renvoyée ne crée rien de plus", async () => {
    const a = await entreprise("a@toitures.fr");
    const k = cle();
    const r1 = (await confirmer(a.agent, [besoin(), besoin({ type: "gouttiere", attributs: { matiere: "zinc", developpe: "33" }, quantite: 40, unite: "m", parUnite: null, conversionConfirmee: false })], k).expect(201)).body;
    const r2 = (await confirmer(a.agent, [besoin(), besoin({ type: "gouttiere", attributs: { matiere: "zinc", developpe: "33" }, quantite: 40, unite: "m", parUnite: null, conversionConfirmee: false })], k).expect(201)).body;
    expect(r2.besoins.map((x: { id: string }) => x.id)).toEqual(r1.besoins.map((x: { id: string }) => x.id));
    expect(await ctx.prisma.besoinGroupeV1.count()).toBe(2);
    // Même clé d'action HTTP (double appui) : la réponse est rejouée.
    const id = r1.besoins[0].id;
    const [m1, m2] = await Promise.all([1, 2].map(() => a.agent.post(`/v1/ag/besoins/${id}/quantite`).set("idempotency-key", "k-modif-123456").send({ quantite: 12 })));
    expect([m1!.status, m2!.status].filter((s) => s === 200).length).toBeGreaterThanOrEqual(1);
    expect((await ctx.prisma.historiqueBesoinGroupeV1.findMany({ where: { besoinId: id, type: "quantite_modifiee" } })).length).toBe(1);
  });
});

describe("isolation entre entreprises", () => {
  it("une entreprise ne voit ni ne modifie le besoin d'une autre ; jamais d'adresse exacte ni de quantité individuelle", async () => {
    const a = await entreprise("a@toitures.fr", "Toitures A");
    const b = await entreprise("b@toitures.fr", "Toitures B");
    const ra = (await confirmer(a.agent, [besoin({ quantite: 7, contraintes: "Camion 19 t maximum" })]).expect(201)).body.besoins[0];
    for (const [verbe, url, corps] of [
      ["get", `/v1/ag/besoins/${ra.id}`, null],
      ["post", `/v1/ag/besoins/${ra.id}/quantite`, { quantite: 1 }],
      ["post", `/v1/ag/besoins/${ra.id}/date`, { dateBesoin: jour(41) }],
      ["post", `/v1/ag/besoins/${ra.id}/retrait`, { motif: "annule" }],
      ["post", `/v1/ag/besoins/${ra.id}/reconfirmation`, {}],
    ] as const) {
      const r = verbe === "get" ? await b.agent.get(url) : await b.agent.post(url).send(corps!);
      expect(r.status, url).toBe(404);
    }
    expect((await b.agent.get("/v1/ag/besoins").expect(200)).body.enCours).toEqual([]);
    expect(Number((await ctx.prisma.besoinGroupeV1.findUniqueOrThrow({ where: { id: ra.id } })).quantiteSaisie)).toBe(7);
    // Ce que B voit de l'achat : produit, zone, période ; sous 5 entreprises, aucun volume.
    const vu = (await b.agent.get("/v1/ag/achats").expect(200)).body;
    const texte = JSON.stringify(vu) + JSON.stringify((await b.agent.post("/v1/ag/compatibilite").send({ ...ARDOISE, reception: "livraison", dateBesoin: jour(40) })).body);
    expect(texte).not.toMatch(/Lannion|12 rue du Port|Camion|3360|3 360|"A"|a@toitures/);
    expect(vu.achats[0].volumes.principale).toBe("D'autres entreprises se positionnent. Les volumes seront visibles à partir de 5 entreprises.");
    // Le lot d'une ligne ne se corrige que dans ses chantiers.
    const { projectId } = await liste(a.agent, [{ libelle: "Liteaux sapin 27x40", quantite: "300", unite: "m" }]);
    expect((await b.agent.get(`/v1/ag/projects/${projectId}/lignes`)).status).toBe(404);
    expect((await b.agent.put(`/v1/ag/projects/${projectId}/lignes/x/lot`).send({ lot: "bois" })).status).toBe(404);
  });

  it("à partir de 5 entreprises : des totaux seulement (palettes), jamais une quantité par entreprise", async () => {
    const agents = [];
    for (const i of [1, 2, 3, 4, 5]) agents.push(await entreprise(`e${i}@toitures.fr`, `Toitures E${i}`));
    const premier = (await confirmer(agents[0]!.agent, [besoin()]).expect(201)).body.besoins[0];
    for (const e of agents.slice(1)) await confirmer(e.agent, [besoin({ quantite: 4, achatId: premier.achat.id })]).expect(201);
    const vu = (await agents[1]!.agent.get("/v1/ag/achats").expect(200)).body.achats[0];
    expect(vu.volumes).toMatchObject({ principale: "26 palettes de besoins confirmés par 5 entreprises", sous: "À reconfirmer avant consultation" });
    expect(JSON.stringify(vu)).not.toMatch(/"quantite"|companyId|"lieu"/);
  });
});

describe("depuis un quantitatif : une ligne, un seul circuit", () => {
  it("liste tapée : classée par lot, famille non autorisée gardée, mentions et raisons", async () => {
    const a = await entreprise("a@toitures.fr");
    const { lignes } = await liste(a.agent, [
      { libelle: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: "10", unite: "palettes" },
      { libelle: "Ardoise naturelle 35x25 Espagne", quantite: "3000", unite: "pièces" },
      { libelle: "Gouttière zinc dév. 33", quantite: "40", unite: "m" },
      { libelle: "Câble R2V 3G2,5", quantite: "6", unite: "couronnes" },
      { libelle: "Parpaing creux 20x20x50", quantite: "200", unite: "u" },
    ]);
    const par = (re: RegExp) => lignes.find((l) => re.test(l.designation))!;
    expect(par(/Ardoise/)).toMatchObject({ lot: "couverture", mention: "recommande", texte: "Recommandé pour un achat groupé", selectionnable: true });
    expect(par(/35x25/)).toMatchObject({ lot: "couverture", mention: "a_preciser", texte: "À préciser : choix et épaisseur manquants", selectionnable: false });
    // Le moteur de liste écrit « 10 longueurs de 4 m » : conditionnement proposé, à confirmer à l'étape suivante.
    expect(par(/Gouttière/)).toMatchObject({ lot: "zinguerie", mention: "recommande", quantite: { conditionnement: { unite: "longueur", parDefaut: 4 } } });
    expect(par(/Câble/)).toMatchObject({ lot: "electricite", mention: "compatible" });
    expect(par(/Parpaing/)).toMatchObject({ lot: "maconnerie", mention: "non_ouvert", texte: "Pas encore ouvert aux achats groupés", selectionnable: false });
  });

  it("liste tapée : aucune ligne ne disparaît — incomplète désactivée avec sa raison, famille fermée dite, compatible sélectionnable", async () => {
    // Greg, 7 novembre 2026 : « les liteaux tapés seuls disparaissent de la sélection ». Cause : la sélection passait par
    // les lignes « proposables » de l'ancien achat groupé, qui écartent en silence une ligne vague (« Liteaux » sans section).
    const a = await entreprise("a@toitures.fr");
    const tapees = [
      { libelle: "Liteaux", quantite: "300", unite: "m" },
      { libelle: "Liteaux sapin", quantite: "300", unite: "m" },
      { libelle: "Liteaux 27x40 sapin", quantite: "300", unite: "m" },
      { libelle: "Parpaing creux 20x20x50", quantite: "200", unite: "u" },
      { libelle: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: "10", unite: "palettes" },
    ];
    const { lignes } = await liste(a.agent, tapees);
    const seule = (re: RegExp) => {
      const t = lignes.filter((l) => re.test(l.designation));
      expect(t, `${re} doit apparaître une fois`).toHaveLength(1);
      return t[0]!;
    };
    expect(seule(/^Liteaux$/)).toMatchObject({ mention: "a_preciser", texte: "À préciser : section et essence manquantes", selectionnable: false });
    expect(seule(/^Liteaux sapin$/)).toMatchObject({ mention: "a_preciser", texte: "À préciser : section manquante", selectionnable: false });
    expect(seule(/^Liteaux 27x40 sapin$/)).toMatchObject({ mention: "compatible", texte: "Compatible avec un achat groupé", selectionnable: true });
    expect(seule(/^Parpaing creux/)).toMatchObject({ mention: "non_ouvert", texte: "Pas encore ouvert aux achats groupés", selectionnable: false });
    expect(seule(/^Ardoise naturelle 32x22/)).toMatchObject({ mention: "recommande", selectionnable: true });
    // Chaque ligne tapée est là, chacune avec une raison lisible.
    expect(lignes.length).toBeGreaterThanOrEqual(tapees.length);
    for (const l of lignes) expect(l.texte.length, l.designation).toBeGreaterThan(0);
  });

  it("correction du lot ligne par ligne, sans déplacer les autres", async () => {
    const a = await entreprise("a@toitures.fr");
    const { projectId, lignes } = await liste(a.agent, [
      { libelle: "Crochets inox 100 mm", quantite: "950", unite: "u" },
      { libelle: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: "10", unite: "palettes" },
    ]);
    const crochet = lignes.find((l) => /Crochets/.test(l.designation))!;
    await a.agent.put(`/v1/ag/projects/${projectId}/lignes/${encodeURIComponent(crochet.key)}/lot`).send({ lot: "zinguerie" }).expect(200);
    const apres = (await a.agent.get(`/v1/ag/projects/${projectId}/lignes`).expect(200)).body.lignes as { designation: string; lot: string }[];
    expect(apres.find((l) => /Crochets/.test(l.designation))!.lot).toBe("zinguerie");
    expect(apres.find((l) => /Ardoise/.test(l.designation))!.lot).toBe("couverture");
  });

  it("une ligne d'achat groupé ne part pas en demande individuelle, et une ligne envoyée ne rejoint pas d'achat groupé", async () => {
    const a = await entreprise("a@toitures.fr");
    const { projectId, lignes } = await liste(a.agent, [
      { libelle: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: "10", unite: "palettes" },
      { libelle: "Gouttière zinc dév. 33", quantite: "40", unite: "m" },
    ]);
    const ardoise = lignes.find((l) => /Ardoise/.test(l.designation))!;
    const gouttiere = lignes.find((l) => /Gouttière/.test(l.designation))!;
    // L'ardoise rejoint un achat groupé.
    await confirmer(a.agent, [besoin({ projectId, articleKey: ardoise.key })]).expect(201);
    const s = (await a.agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.example" }).expect(201)).body;
    const seule = await a.agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.id], articles: [ardoise.key] });
    expect(seule.status).toBe(409);
    expect(seule.body.error.details).toMatchObject({ reason: "dans_un_achat_groupe" });
    expect(seule.body.error.details.message).toMatch(/ne part pas en même temps en demande individuelle/);
    expect((await a.agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.id] })).status).toBe(409);
    expect(await ctx.prisma.priceRequest.count()).toBe(0);
    // La gouttière part en demande individuelle (envoyée) : elle ne rejoint plus d'achat groupé.
    const demande = (await a.agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.id], articles: [gouttiere.key] }).expect(201)).body;
    await a.agent.post(`/v1/price-request-recipients/${demande.recipients[0].id}/send`).expect(200);
    const vue = (await a.agent.get(`/v1/ag/projects/${projectId}/lignes`).expect(200)).body.lignes as { key: string; texte: string; selectionnable: boolean }[];
    expect(vue.find((l) => l.key === gouttiere.key)).toMatchObject({ texte: "Déjà dans une demande individuelle", selectionnable: false });
    expect(vue.find((l) => l.key === ardoise.key)).toMatchObject({ texte: "Déjà dans un achat groupé", selectionnable: false });
    const refus = await confirmer(a.agent, [besoin({ type: "gouttiere", attributs: { matiere: "zinc", developpe: "33" }, quantite: 40, unite: "m", parUnite: null, projectId, articleKey: gouttiere.key })]);
    expect(refus.status).toBe(409);
    expect(refus.body.error.details.reason).toBe("circuit_demande_individuelle");
    // Une ligne ne rejoint qu'un seul achat groupé, même en double clic.
    const [d1, d2] = await Promise.all([confirmer(a.agent, [besoin({ dateBesoin: jour(80), projectId, articleKey: ardoise.key })]), confirmer(a.agent, [besoin({ dateBesoin: jour(80), projectId, articleKey: ardoise.key })])]);
    expect([d1.status, d2.status]).toEqual([409, 409]);
    expect(await ctx.prisma.besoinGroupeV1.count({ where: { articleKey: ardoise.key, statut: { not: "retire" } } })).toBe(1);
  });

  it("une demande d'une ligne retirée de l'achat groupé redevient possible", async () => {
    const a = await entreprise("a@toitures.fr");
    const { projectId, lignes } = await liste(a.agent, [{ libelle: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: "10", unite: "palettes" }]);
    const b = (await confirmer(a.agent, [besoin({ projectId, articleKey: lignes[0]!.key })]).expect(201)).body.besoins[0];
    await a.agent.post(`/v1/ag/besoins/${b.id}/retrait`).send({ motif: "autrement" }).expect(200);
    const s = (await a.agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.example" }).expect(201)).body;
    await a.agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.id], articles: [lignes[0]!.key] }).expect(201);
  });
});

describe("modifier, reconfirmer, retirer", () => {
  it("modifier la quantité ou la date ne retire pas le besoin ; une date hors période est refusée", async () => {
    const a = await entreprise("a@toitures.fr");
    const b = (await confirmer(a.agent, [besoin()]).expect(201)).body.besoins[0];
    const q = (await a.agent.post(`/v1/ag/besoins/${b.id}/quantite`).send({ quantite: 12 }).expect(200)).body;
    expect(q).toMatchObject({ etat: "confirme", statut: { libelle: "Besoin confirmé" }, quantite: { valeur: 5760 } });
    const d = (await a.agent.post(`/v1/ag/besoins/${b.id}/date`).send({ dateBesoin: jour(50) }).expect(200)).body;
    expect(d).toMatchObject({ etat: "confirme", dateBesoin: jour(50) });
    const hors = await a.agent.post(`/v1/ag/besoins/${b.id}/date`).send({ dateBesoin: jour(90) });
    expect(hors.status).toBe(409);
    expect(hors.body.error.details.reason).toBe("date_hors_achat");
    expect(d.historique.map((h: { type: string }) => h.type)).toEqual(["ouvert", "quantite_modifiee", "date_modifiee"]);
  });

  it("aucun volume indicatif ou non reconfirmé n'est transmis ; un retrait tardif met à jour volumes et historique", async () => {
    const a = await entreprise("a@toitures.fr", "Toitures A");
    const b = await entreprise("b@toitures.fr", "Toitures B");
    const ba = (await confirmer(a.agent, [besoin()]).expect(201)).body.besoins[0];
    const bb = (await confirmer(b.agent, [besoin({ quantite: 4, achatId: ba.achat.id })]).expect(201)).body.besoins[0];
    const g = await admin();
    // Trop tôt : on ne reconfirme qu'en préparation ; la consultation ne part qu'après la clôture.
    expect((await a.agent.post(`/v1/ag/besoins/${ba.id}/reconfirmation`)).status).toBe(409);
    const prep = (await g.post(`/v1/admin/ag/achats/${ba.achat.id}/preparation`).send({}).expect(200)).body;
    expect((Date.parse(prep.reconfirmerAvant) - Date.now()) / 3_600_000).toBeCloseTo(72, 0);
    expect((await g.post(`/v1/admin/ag/achats/${ba.achat.id}/cloture`).send({})).status).toBe(409);
    expect((await a.agent.get(`/v1/ag/besoins/${ba.id}`).expect(200)).body).toMatchObject({ statut: { libelle: "Préparation de la consultation" }, actions: { reconfirmer: true } });
    await a.agent.post(`/v1/ag/besoins/${ba.id}/reconfirmation`).expect(200);
    // B ne reconfirme pas. Clôture après l'heure.
    await ctx.prisma.achatGroupeV1.update({ where: { id: ba.achat.id }, data: { reconfirmerAvant: new Date(Date.now() - 1000) } });
    const clos = (await g.post(`/v1/admin/ag/achats/${ba.achat.id}/cloture`).send({}).expect(200)).body;
    expect(clos.volumeTransmis).toBe(4800);
    expect((await b.agent.get(`/v1/ag/besoins/${bb.id}`).expect(200)).body).toMatchObject({ etat: "indicatif", statut: { libelle: "Besoin indicatif" }, actions: { confirmer: false } });
    expect((await a.agent.get(`/v1/ag/besoins/${ba.id}`).expect(200)).body).toMatchObject({ statut: { libelle: "Consultation envoyée" }, avertissements: { retrait: "Retirer ton besoin modifiera les volumes déjà transmis." } });
    // Le retrait après l'envoi : tardif, volumes transmis mis à jour, historique gardé et marqué transmis.
    const r = (await a.agent.post(`/v1/ag/besoins/${ba.id}/retrait`).send({ motif: "annule", precision: "Client parti" }).expect(200)).body;
    expect(r).toMatchObject({ etat: "retire", statut: { libelle: "Besoin retiré" }, retrait: { motif: "Besoin annulé", precision: "Client parti" } });
    expect(r.historique.at(-1)).toMatchObject({ type: "retire", transmis: true });
    const achat = await ctx.prisma.achatGroupeV1.findUniqueOrThrow({ where: { id: ba.achat.id } });
    expect(Number(achat.volumeTransmis)).toBe(0);
    expect((await ctx.prisma.besoinGroupeV1.findUniqueOrThrow({ where: { id: ba.id } })).retraitTardif).toBe(true);
    // Un besoin retiré ne bouge plus.
    expect((await a.agent.post(`/v1/ag/besoins/${ba.id}/quantite`).send({ quantite: 3 })).status).toBe(409);
  });

  it("« À faire » porte l'action même si l'e-mail échoue ; le rappel repartira", async () => {
    const a = await entreprise("a@toitures.fr");
    const ba = (await confirmer(a.agent, [besoin()]).expect(201)).body.besoins[0];
    const g = await admin();
    const envoi = ctx.emails.send.bind(ctx.emails);
    ctx.emails.send = async () => {
      throw new Error("Resend en panne");
    };
    try {
      await g.post(`/v1/admin/ag/achats/${ba.achat.id}/preparation`).send({ heures: 24 }).expect(200);
      const actions = (await a.agent.get("/v1/rapprochements/actions").expect(200)).body.items as { cle: string; texte: string; href: string }[];
      expect(actions[0]).toMatchObject({ cle: `ag-reconfirmer:${ba.id}`, href: `/achats-groupes/besoins/${ba.id}` });
      expect(actions[0]!.texte).toMatch(/^Reconfirme ta quantité : Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm · 10 palettes = 4 800 pièces — avant le /);
      const t = (await request(ctx.app.getHttpServer()).get("/v1/internal/achats-groupes-v1/rappels").set("authorization", "Bearer secret-de-la-tache").expect(200)).body;
      expect(t).toMatchObject({ rappels: 0, echecs: 1 });
      expect((await ctx.prisma.besoinGroupeV1.findUniqueOrThrow({ where: { id: ba.id } })).rappelEnvoyeLe).toBeNull();
    } finally {
      ctx.emails.send = envoi;
    }
    const t2 = (await request(ctx.app.getHttpServer()).get("/v1/internal/achats-groupes-v1/rappels").set("authorization", "Bearer secret-de-la-tache").expect(200)).body;
    expect(t2).toMatchObject({ rappels: 1, echecs: 0 });
    expect(ctx.emails.sent.some((m) => m.to === "a@toitures.fr" && /Rappel : reconfirme ta quantité/.test(m.subject))).toBe(true);
  });
});

describe("l'offre, jusqu'à « Offre à examiner »", () => {
  it("incomplète : vérification en cours ; complète : à examiner, calcul exact ; jamais acceptable en V1", async () => {
    const a = await entreprise("a@toitures.fr");
    const ba = (await confirmer(a.agent, [besoin()]).expect(201)).body.besoins[0];
    const g = await admin();
    await g.post(`/v1/admin/ag/achats/${ba.achat.id}/preparation`).send({}).expect(200);
    await a.agent.post(`/v1/ag/besoins/${ba.id}/reconfirmation`).expect(200);
    await g.post(`/v1/admin/ag/achats/${ba.achat.id}/cloture`).send({ avantLHeure: true }).expect(200);
    const offre = { fournisseur: "Négoce de l'Armor", prixUnitaireHt: 0.98, livraisonHt: 45, delai: "10 jours ouvrés", lieu: "Livraison sur chantier, Lannion", paiement: "30 jours fin de mois", validite: "72 heures", annulation: null };
    expect((await g.put(`/v1/admin/ag/achats/${ba.achat.id}/offre`).send(offre).expect(200)).body).toMatchObject({ statut: "offre_verification", complete: false });
    let vue = (await a.agent.get(`/v1/ag/besoins/${ba.id}`).expect(200)).body;
    expect(vue).toMatchObject({ statut: { libelle: "Offre reçue — vérification en cours" }, offre: { complete: false, acceptable: false, manques: ["conditions d'annulation"], calcul: null } });
    await g.put(`/v1/admin/ag/achats/${ba.achat.id}/offre`).send({ ...offre, annulation: "Sans frais jusqu'à 48 h avant livraison" }).expect(200);
    vue = (await a.agent.get(`/v1/ag/besoins/${ba.id}`).expect(200)).body;
    expect(vue).toMatchObject({ statut: { libelle: "Offre à examiner" }, offre: { complete: true, acceptable: false, calcul: { ht: 4749, tva: 949.8, ttc: 5698.8 } } });
    expect(vue.offre.calcul.lignes[0]).toBe("4 800 × 0,98 € = 4 704,00 €");
    expect(vue.actions.modifier).toBe(false);
    const actions = (await a.agent.get("/v1/ag/actions").expect(200)).body.items;
    expect(actions[0].cle).toBe(`ag-offre:${ba.id}`);
    // Pas d'« Offre acceptée » : aucune transition ne l'atteint.
    expect((await g.post(`/v1/admin/ag/achats/${ba.achat.id}/preparation`).send({})).status).toBe(409);
  });
});

describe("double engagement simultané : demande individuelle contre achat groupé (verrou commun en base)", () => {
  /**
   * Greg, 7 novembre 2026 : « La création d'un achat groupé et l'envoi d'une demande individuelle pour la même ligne
   * doivent partager une protection atomique côté base de données… Ajoute un test réellement concurrent qui lance les
   * deux opérations simultanément et vérifie qu'une seule réussit, dans les deux ordres possibles. » L'e-mail est
   * ralenti (300 ms) pour ouvrir la fenêtre où l'envoi est en cours : sans verrou commun, les deux réussissaient.
   */
  async function preparer(n: number) {
    const a = await entreprise(`course${n}@toitures.fr`, `Toitures Course ${n}`);
    const { projectId, lignes } = await liste(a.agent, [{ libelle: "Ardoise naturelle 32x22 Espagne 1er choix 5 mm", quantite: "10", unite: "palettes" }]);
    const key = lignes[0]!.key;
    const s = (await a.agent.post("/v1/suppliers").send({ name: "Kerbrat", email: `devis${n}@kerbrat.example` }).expect(201)).body;
    const demande = (await a.agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.id], articles: [key] }).expect(201)).body;
    return { a, projectId, key, recipientId: demande.recipients[0].id as string };
  }
  const envoyer = (x: Awaited<ReturnType<typeof preparer>>) => x.a.agent.post(`/v1/price-request-recipients/${x.recipientId}/send`);
  const rejoindre = (x: Awaited<ReturnType<typeof preparer>>) => confirmer(x.a.agent, [besoin({ projectId: x.projectId, articleKey: x.key })]);

  for (const ordre of ["envoi d'abord", "achat groupé d'abord"] as const)
    it(`une seule des deux opérations réussit (${ordre}, 3 fois)`, async () => {
      const envoi = ctx.emails.send.bind(ctx.emails);
      ctx.emails.send = async (m) => {
        await new Promise((r) => setTimeout(r, 300));
        return envoi(m);
      };
      try {
        for (let i = 0; i < 3; i++) {
          const x = await preparer(i + (ordre === "envoi d'abord" ? 0 : 10));
          const [r1, r2] = ordre === "envoi d'abord" ? await Promise.all([envoyer(x), rejoindre(x)]) : await Promise.all([rejoindre(x), envoyer(x)]).then(([g, e]) => [e, g] as const);
          // r1 : l'envoi, r2 : l'achat groupé.
          const reussis = [r1.status === 200, r2.status === 201].filter(Boolean).length;
          expect(reussis, `envoi ${r1.status}, achat groupé ${r2.status}`).toBe(1);
          expect([r1.status, r2.status]).toContain(409);
          const envoye = (await ctx.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: x.recipientId } })).sentAt !== null;
          const tenue = (await ctx.prisma.besoinGroupeV1.count({ where: { projectId: x.projectId, articleKey: x.key, statut: { not: "retire" } } })) > 0;
          expect(envoye && tenue).toBe(false);
          expect(envoye || tenue).toBe(true);
        }
      } finally {
        ctx.emails.send = envoi;
      }
    });
});
