import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { repondreParLeCode } from "../src/modules/admin-vue/application/admin-vue.service.js";
import { ALERTER } from "../src/platform/tokens.js";
import type { Alerter } from "../src/platform/alerts/alerter.js";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * L'ESPACE ADMIN, VUE GLOBALE (Greg, 14 novembre 2026) : « un écran d'accueil, tout accessible en 3 clics maximum » : six
 * cartes avec leur tendance, un bandeau seulement s'il y a un problème, les listes artisans et négoces, la fiche, « Pose ta
 * question » en lecture seule, l'adresse d'alerte à double validation. RGPD : jamais le détail d'un chantier, chaque
 * consultation au journal. Aucun e-mail réel, aucun appel IA : ils sont capturés ou éteints.
 */
let ctx: TestContext;
const VARS = ["GROUPE", "GROUPE_ADMINS", "ALERT_EMAIL", "ASSISTANT_IA"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.ALERT_EMAIL = "contact@mobiiz.example";
  delete process.env.ASSISTANT_IA;
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

const LIGNES = [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "10", unite: "pièces" }];
async function admin() {
  const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", LIGNES);
  await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
  return greg;
}

describe("l'espace admin, vue globale", { timeout: 120_000 }, () => {
  it("réservé à l'équipe : un artisan est refusé partout, et rien ne se lit sans session", async () => {
    const a = await couvreurAvecListe(ctx, "artisan@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    for (const chemin of ["accueil", "artisans", "negoces", `artisans/${a.companyId}`, "promos", "reglages/alerte"]) await a.agent.get(`/v1/admin/vue/${chemin}`).expect(403);
    await a.agent.post("/v1/admin/vue/question").send({ question: "combien d'inscrits ?" }).expect(403);
    await a.agent.post("/v1/admin/vue/reglages/alerte").send({ adresse: "pirate@example.fr" }).expect(403);
    await request(ctx.app.getHttpServer()).get("/v1/admin/vue/accueil").expect(401);
  });

  it("l'accueil : six cartes avec leur comparaison, chacune mène à sa liste ; le bandeau n'existe que s'il y a un problème", async () => {
    const g = await admin();
    const a = await couvreurAvecListe(ctx, "artisan@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    let r = (await g.agent.get("/v1/admin/vue/accueil").expect(200)).body;
    expect(r.cartes.map((c: { cle: string }) => c.cle)).toEqual(["inscrits", "payants", "gratuit", "revenus", "inscriptions_semaine", "negoces"]);
    expect(r.cartes[0]).toMatchObject({ valeur: 2, avant: 0, lien: "/admin/artisans" });
    expect(r.cartes[2]).toMatchObject({ valeur: 2 });
    for (const c of r.cartes) expect(c.lien).toMatch(/^\/admin\/(artisans|negoces)/);
    // Aucun problème : aucun bandeau.
    expect(r.problemes).toEqual([]);
    await a.agent.post("/v1/signalements").send({ message: "Le bouton ne répond pas.", page: "/" }).expect(201);
    await ctx.prisma.abonnement.create({ data: { companyId: a.companyId, statut: "echec", fournisseur: "simule", formule: "essentiel", echecLe: new Date() } });
    r = (await g.agent.get("/v1/admin/vue/accueil").expect(200)).body;
    expect(r.problemes).toEqual([
      { type: "signalement", nombre: 1, lien: "/admin/signalements" },
      { type: "paiement_refuse", nombre: 1, lien: "/admin/artisans?formule=echec" },
    ]);
  });

  it("les listes : une recherche et des filtres simples ; la fiche tient sur une page, sans aucun détail de chantier ; chaque consultation est au journal", async () => {
    const g = await admin();
    const a = await couvreurAvecListe(ctx, "artisan@toitures.fr", "Toitures de l'Armor", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    await couvreurAvecListe(ctx, "b@peinture.fr", "Peinture Brestoise", "1 rue de Siam, 29200 Brest", LIGNES);
    await ctx.prisma.abonnement.create({ data: { companyId: a.companyId, statut: "actif", fournisseur: "simule", formule: "pro", codePromo: "FONDATEUR", periodeFin: new Date(Date.now() + 20 * 86_400_000) } });
    const tous = (await g.agent.get("/v1/admin/vue/artisans").expect(200)).body;
    expect(tous.total).toBe(3);
    const armor = tous.items.find((x: { entreprise: string }) => x.entreprise === "Toitures de l'Armor");
    expect(armor).toMatchObject({ metiers: ["roofing"], departement: "22", formule: "pro", codePromo: "FONDATEUR", paiementRefuse: false });
    expect(armor.inscritLe).toMatch(/^\d{4}-/);
    expect(armor.derniereConnexion).toMatch(/^\d{4}-/);
    expect((await g.agent.get("/v1/admin/vue/artisans?q=brest").expect(200)).body.items.map((x: { entreprise: string }) => x.entreprise)).toEqual(["Peinture Brestoise"]);
    expect((await g.agent.get("/v1/admin/vue/artisans?departement=22&formule=payant").expect(200)).body.items.map((x: { entreprise: string }) => x.entreprise)).toEqual(["Toitures de l'Armor"]);
    expect((await g.agent.get("/v1/admin/vue/artisans?formule=gratuit").expect(200)).body.total).toBe(2);
    expect((await g.agent.get("/v1/admin/vue/artisans?promo=fondateur").expect(200)).body.total).toBe(1);

    const fiche = (await g.agent.get(`/v1/admin/vue/artisans/${a.companyId}`).expect(200)).body;
    expect(fiche.infos).toMatchObject({ entreprise: "Toitures de l'Armor", departement: "22", email: "artisan@toitures.fr" });
    expect(fiche.abonnement).toMatchObject({ formule: "pro", codePromo: "FONDATEUR", statut: "actif" });
    expect(fiche.activite).toMatchObject({ listes: 1, demandes: 0, besoinsGroupes: 0 });
    expect(fiche.connexions.length).toBeGreaterThan(0);
    // RGPD : la fiche compte les listes, elle ne dit jamais ce qu'elles contiennent.
    expect(JSON.stringify(fiche)).not.toMatch(/Ardoise|32×22/);
    await g.agent.get("/v1/admin/vue/artisans/0190a1b2-0000-7000-8000-000000000001").expect(404);

    expect((await g.agent.get("/v1/admin/vue/promos").expect(200)).body.codes).toEqual([{ code: "FONDATEUR", utilisateurs: [expect.objectContaining({ entreprise: "Toitures de l'Armor", formule: "pro" })] }]);
    const journal = (await ctx.prisma.journalAdmin.findMany({ where: { action: { startsWith: "vue_" } }, orderBy: { createdAt: "asc" } })).map((j) => j.action);
    expect(journal).toEqual(expect.arrayContaining(["vue_liste_artisans", "vue_fiche_artisan", "vue_codes_promo"]));
    expect(await ctx.prisma.journalAdmin.findFirst({ where: { action: "vue_fiche_artisan" } })).toMatchObject({ cible: a.companyId, email: "greg@example.fr" });
  });

  it("les négoces : familles, zone, vérifié ou non, demandes reçues, taux de réponse ; la fiche", async () => {
    const g = await admin();
    const n = await ctx.prisma.compteNegoce.create({ data: { email: "ventes@armor.example", enseigne: "Négoce de l'Armor", familles: ["couverture", "zinguerie"], departements: ["22"], inscritLe: new Date(), verification: "a_verifier" } });
    await ctx.prisma.compteNegoce.create({ data: { email: "pro@brest.example", enseigne: "Brest Matériaux", generaliste: true, departements: ["29"], inscritLe: new Date(), verification: "valide", derniereConnexionLe: new Date() } });
    const liste = (await g.agent.get("/v1/admin/vue/negoces").expect(200)).body;
    expect(liste.total).toBe(2);
    expect(liste.items.find((x: { nom: string }) => x.nom === "Négoce de l'Armor")).toMatchObject({ familles: ["couverture", "zinguerie"], zone: ["22"], verifie: false, demandesRecues: 0, tauxReponse: null });
    expect((await g.agent.get("/v1/admin/vue/negoces?verifie=non").expect(200)).body.items.map((x: { nom: string }) => x.nom)).toEqual(["Négoce de l'Armor"]);
    expect((await g.agent.get("/v1/admin/vue/negoces?q=brest").expect(200)).body.items[0]).toMatchObject({ nom: "Brest Matériaux", familles: ["generaliste"], verifie: true });
    const fiche = (await g.agent.get(`/v1/admin/vue/negoces/${n.id}`).expect(200)).body;
    expect(fiche.infos).toMatchObject({ nom: "Négoce de l'Armor", verifie: false, zone: ["22"] });
    expect(fiche.activite).toMatchObject({ demandesRecues: 0, tauxReponse: null });
    // Le négoce à vérifier apparaît dans le bandeau de l'accueil.
    expect((await g.agent.get("/v1/admin/vue/accueil").expect(200)).body.problemes).toContainEqual({ type: "negoce_a_verifier", nombre: 1, lien: "/admin/negoces?verifie=non" });
  });

  it("les corrections les plus fréquentes (Greg, 16 novembre 2026) : la ligne proposée et la ligne corrigée, comptées, sans nom d'entreprise ni de chantier", async () => {
    const g = await admin();
    const a = await couvreurAvecListe(ctx, "artisan@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    await a.agent.get("/v1/admin/vue/corrections").expect(403);
    const avantL = { designation: "Gouttière zinc dév. 25", quantity: "40", unit: "m", reference: null };
    const apresL = { designation: "Gouttière zinc dév. 33", quantity: "40", unit: "m", reference: null };
    const geste = (companyId: string, action: string, before: object | null, after: object | null, patternKey: string, createdAt = new Date()) =>
      ctx.prisma.correctionEvent.create({ data: { companyId, action, cause: "wrong_designation", before: before ?? undefined, after: after ?? undefined, context: { metier: "roofing" }, patternKey, createdAt } });
    // La même correction chez deux entreprises (trois fois), une suppression, une confirmation (non comptée), une ancienne.
    await geste(a.companyId, "edit", avantL, apresL, "forme-gouttiere");
    await geste(a.companyId, "edit", avantL, apresL, "forme-gouttiere");
    await geste(g.companyId, "edit", avantL, { ...apresL, quantity: "42" }, "forme-gouttiere");
    await geste(a.companyId, "delete", { designation: "Échafaudage", quantity: "1", unit: "forfait", reference: null }, null, "forme-echafaudage");
    await geste(a.companyId, "confirm", avantL, avantL, "forme-confirmation");
    await geste(a.companyId, "edit", avantL, apresL, "forme-ancienne", new Date(Date.now() - 120 * 86_400_000));
    const r = (await g.agent.get("/v1/admin/vue/corrections").expect(200)).body;
    expect(r.total).toBe(4);
    expect(r.corrections).toHaveLength(2);
    expect(r.corrections[0]).toMatchObject({ geste: "edit", cause: "wrong_designation", metier: "roofing", fois: 3, entreprises: 2, proposee: "Gouttière zinc dév. 25 · 40 m", corrigee: "Gouttière zinc dév. 33 · 40 m" });
    expect(r.corrections[1]).toMatchObject({ geste: "delete", fois: 1, entreprises: 1, proposee: "Échafaudage · 1 forfait", corrigee: null });
    // RGPD : des matériaux seulement ; la consultation est au journal de l'admin.
    expect(JSON.stringify(r)).not.toMatch(/Toitures A|Bati Invest|Lannion|Ajoncs|companyId|artisan@/);
    expect(await ctx.prisma.journalAdmin.count({ where: { action: "vue_corrections_frequentes" } })).toBe(1);
  });

  it("« Pose ta question » : des chiffres, en lecture seule ; hors sujet, il le dit ; la question est au journal", async () => {
    const g = await admin();
    await couvreurAvecListe(ctx, "artisan@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const avantQuestion = await ctx.prisma.company.count();
    let r = (await g.agent.post("/v1/admin/vue/question").send({ question: "Combien d'inscrits ce mois ?" }).expect(200)).body;
    expect(r).toMatchObject({ ia: false });
    expect(r.reponse).toMatch(/2 inscriptions ce mois/);
    r = (await g.agent.post("/v1/admin/vue/question").send({ question: "Quelle croissance ?" }).expect(200)).body;
    expect(r.reponse).toMatch(/croissance|inscription/i);
    r = (await g.agent.post("/v1/admin/vue/question").send({ question: "Quels négoces ne répondent jamais ?" }).expect(200)).body;
    expect(r.reponse).toMatch(/Aucun négoce/);
    // Une demande d'action ne change rien : il ne sait que lire.
    r = (await g.agent.post("/v1/admin/vue/question").send({ question: "Supprime le compte Toitures A" }).expect(200)).body;
    expect(await ctx.prisma.company.count()).toBe(avantQuestion);
    expect(r.reponse).not.toMatch(/Ardoise/);
    expect((await g.agent.post("/v1/admin/vue/question").send({ question: "Quel temps fait-il ?" }).expect(200)).body.reponse).toMatch(/Je n'ai pas de chiffre/);
    expect(await ctx.prisma.journalAdmin.count({ where: { action: "vue_question" } })).toBe(5);
    expect(await ctx.prisma.aiExecution.count()).toBe(0);
  });

  it("le code répond avec les chiffres, jamais avec un nom d'artisan", () => {
    const c = { date: "2026-11-14", artisans: { inscrits: 56, inscritsAuDebutDuMois: 50, inscritsCeMois: 6, croissanceDuMoisPct: 12, inscriptions7Jours: 3, inscriptions7JoursDAvant: 1, inscriptionsParMois: [] }, abonnements: { payants: 8, payantsLeMoisDernier: 6, enGratuit: 48, parFormule: { pro: 5, promax: 3 }, revenusDuMoisHt: 219.2, revenusDuMoisDernierHt: 159.4, paiementsRefuses: 1 }, negoces: { inscrits: 4, aVerifier: 1, demandesRecues: 20, tauxDeReponsePct: 55, quiNeRepondentJamais: [{ nom: "Négoce Muet", demandesRecues: 4 }] }, activiteDuMois: { listesCreees: 30, demandesDePrix: 12, besoinsEnAchatGroupe: 5 }, aTraiter: { bugsSignales: 2, erreursServeur24h: 0 } };
    expect(repondreParLeCode("quelle croissance ?", c)).toBe("Croissance des inscrits ce mois : 12 % (50 au début du mois, 56 aujourd'hui).");
    expect(repondreParLeCode("quels négoces ne répondent jamais ?", c)).toContain("Négoce Muet (4 demandes)");
    expect(repondreParLeCode("combien d'abonnés payants ?", c)).toContain("8 abonnés payants (pro : 5, promax : 3), 48 en Gratuit.");
    expect(repondreParLeCode("les revenus ?", c)).toContain("219,2 € HT");
  });

  it("l'adresse d'alerte : double validation ; rien ne change avant le clic ; après, les alertes et les signalements y partent tout de suite", async () => {
    const g = await admin();
    expect((await g.agent.get("/v1/admin/vue/reglages/alerte").expect(200)).body).toEqual({ adresse: "contact@mobiiz.example", source: "repli", enAttente: null });
    ctx.emails.sent.length = 0;
    await g.agent.post("/v1/admin/vue/reglages/alerte").send({ adresse: "pas une adresse" }).expect(400);
    await g.agent.post("/v1/admin/vue/reglages/alerte").send({ adresse: "Greg.Perso@example.org" }).expect(200);
    const mail = mailsVers(ctx, "greg.perso@example.org");
    expect(mail).toHaveLength(1);
    expect(mail[0]!.subject).toBe("Mobiiz : confirme ta nouvelle adresse d'alerte");
    const jeton = /confirmer\?jeton=([A-Za-z0-9_-]+)/.exec(mail[0]!.text)![1]!;
    // Avant le clic : l'ancienne adresse reste en service, la nouvelle attend.
    expect((await g.agent.get("/v1/admin/vue/reglages/alerte").expect(200)).body).toMatchObject({ adresse: "contact@mobiiz.example", source: "repli", enAttente: { adresse: "greg.perso@example.org" } });
    const publique = request(ctx.app.getHttpServer());
    expect((await publique.post("/v1/public/admin/alerte/confirmer").send({ jeton: "un-jeton-invente-0000" }).expect(200)).body).toEqual({ confirme: false, adresse: null });
    expect((await publique.post("/v1/public/admin/alerte/confirmer").send({ jeton }).expect(200)).body).toEqual({ confirme: true, adresse: "greg.perso@example.org" });
    // Le lien ne sert qu'une fois ; l'ancienne adresse est prévenue du changement.
    expect((await publique.post("/v1/public/admin/alerte/confirmer").send({ jeton }).expect(200)).body.confirme).toBe(false);
    expect(mailsVers(ctx, "contact@mobiiz.example").map((m) => m.subject)).toContain("Mobiiz : l'adresse d'alerte a changé");
    expect((await g.agent.get("/v1/admin/vue/reglages/alerte").expect(200)).body).toEqual({ adresse: "greg.perso@example.org", source: "admin", enAttente: null });

    // Sans redéploiement : le signalement suivant part à la nouvelle adresse.
    ctx.emails.sent.length = 0;
    await publique.post("/v1/public/signalements").send({ message: "La page ne s'ouvre pas.", page: "/espace-negoce", email: "negoce@example.fr" }).expect(201);
    expect(mailsVers(ctx, "greg.perso@example.org").some((m) => m.subject.startsWith("Nouveau signalement"))).toBe(true);
    expect(mailsVers(ctx, "contact@mobiiz.example")).toHaveLength(0);
    // Et une alerte (erreur serveur, paiement refusé…) aussi.
    ctx.emails.sent.length = 0;
    ctx.app.get<Alerter>(ALERTER).alert("paiement_refuse", "un paiement d'abonnement n'est pas passé.");
    await new Promise((r) => setTimeout(r, 150));
    const alerte = mailsVers(ctx, "greg.perso@example.org");
    expect(alerte).toHaveLength(1);
    expect(alerte[0]!.text).toContain("Paiement refusé");
  });
});
