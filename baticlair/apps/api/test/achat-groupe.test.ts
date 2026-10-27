import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PHRASE_NEGOCE_OBLIGATOIRE } from "@baticlair/domain";
import { SIRET_TEST_GROSSISTE } from "../src/modules/groupe/index.js";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * L'ACHAT GROUPÉ AUTOMATIQUE (Greg, 27 octobre 2026 : « l'achat groupé devient le cœur de l'app, en automatique »), par
 * l'API : lancer (au moins un négoce, référence stricte, date possible, SIRET du bâtiment), rejoindre, la quantité qui
 * s'ajoute, les alertes, « Préviens ton négoce », la clôture (une demande par négoce, de la part de SES clients), la
 * réponse sans inscription (une seule offre), l'analyse à l'échéance (douteuse à l'admin), la vue de l'artisan (nom
 * selon les droits), la commande, le désistement, le plan B, la facture de commission, l'admin.
 */
let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "GROUPE_ADMINS", "CRON_SECRET", "PRIX_REPERES", "SEUIL_VOLUME_MIN", "EMAIL_DOMAINE", "MODE_REGROUPEMENT", "COMMISSION_DEFAUT"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT; // le défaut : automatique
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.PRIX_REPERES = "ardoise:pieces=1.2";
  process.env.SEUIL_VOLUME_MIN = "couverture=3000";
  process.env.EMAIL_DOMAINE = "mobiiz.test";
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

const A3222 = "Ardoise naturelle 32×22 Espagne 1er choix";
const publique = () => request(ctx.app.getHttpServer());
const jour = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
const tache = (maintenant: string) => publique().get(`/v1/internal/achats-groupes?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
const artisan = (n: number, adresse = "3 rue des Ajoncs, 22300 Lannion") => couvreurAvecListe(ctx, `artisan${n}@toitures.fr`, `Toitures ${n}`, adresse, [{ libelle: A3222, quantite: "100", unite: "pièces" }]);
const lancement = (o: Record<string, unknown> = {}) => ({ designation: A3222, quantite: 1800, unite: "pièces", livraison: "22300 Lannion", dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr", telephone: "02 96 00 00 01" }], ...o });
const jetonDe = (email: string) => /\/achat-groupe\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, email).at(-1)!.text)![1]!;

describe("achat groupé automatique", { timeout: 180_000 }, () => {
  it("lancer : mode automatique par défaut, catalogue, au moins un négoce, référence stricte, date possible, SIRET du bâtiment ; la même référence ajoute la quantité", async () => {
    const a = await artisan(1);
    expect((await a.agent.get("/v1/regroupement/mode").expect(200)).body).toEqual({ mode: "automatique" });
    const cat = (await a.agent.get("/v1/achats-groupes/catalogue?q=ardoise 32").expect(200)).body.references;
    expect(cat.map((r: { designation: string }) => r.designation)).toContain(A3222);

    const sans = await a.agent.post("/v1/achats-groupes").send(lancement({ negoces: [] })).expect(400);
    expect(sans.body.error.details).toMatchObject({ reason: "negoce_obligatoire", message: PHRASE_NEGOCE_OBLIGATOIRE });
    expect((await a.agent.post("/v1/achats-groupes").send(lancement({ designation: "Ardoise" })).expect(400)).body.error.details.reason).toBe("reference_imprecise");
    expect((await a.agent.post("/v1/achats-groupes").send(lancement({ dateBesoin: jour(5) })).expect(400)).body.error.details.reason).toBe("date_trop_proche");

    const premier = (await a.agent.post("/v1/achats-groupes").send(lancement()).expect(201)).body;
    expect(premier).toMatchObject({ ajoute: false, rejoint: false });
    expect(premier.prevenir.texte).toMatch(/^Ton négoce va recevoir une grosse demande : 1\u00a0800 pièces d'ardoise 32×22 Espagne 1er choix, le \d+ \S+, de la part de Mobiiz\. C'est une belle opportunité pour lui\./);
    expect(premier.prevenir.sms).toMatch(/^Bonjour, je participe à un achat groupé Mobiiz pour ardoise 32×22/);
    expect(premier.prevenir.negoces[0]).toMatchObject({ nom: "Négoce X", tel: "tel:0296000001" });
    // Précision 4 : relancer la même référence dans le même achat ajoute la quantité, sans doublon.
    const encore = (await a.agent.post("/v1/achats-groupes").send(lancement({ quantite: 200, negoces: [{ nom: "Négoce Z", email: "z@negoce.fr" }] })).expect(201)).body;
    expect(encore).toMatchObject({ besoinId: premier.besoinId, ajoute: true });
    const mes = (await a.agent.get("/v1/achats-groupes").expect(200)).body.achats;
    expect(mes).toHaveLength(1);
    expect(mes[0]).toMatchObject({ quantite: 2000, etat: "seul", titre: expect.stringMatching(/^Seul jusqu'au \d+ \S+$/), sousTitre: "On te prévient dès qu'il y a du nouveau." });
    expect(mes[0].negoces.map((n: { nom: string }) => n.nom)).toEqual(["Négoce X", "Négoce Z"]);
    await a.agent.post(`/v1/achats-groupes/negoces/${premier.prevenir.negoces[0].id}/prevenu`).expect(200);

    // Sans SIRET vérifié : refusé ; un SIRET de commerce de gros : refusé à la vérification.
    const g = await artisan(9);
    await ctx.prisma.company.update({ where: { id: g.companyId }, data: { siret: SIRET_TEST_GROSSISTE, siretVerifieLe: null } });
    expect((await g.agent.post("/v1/achats-groupes").send(lancement()).expect(403)).body.error.details.reason).toBe("siret_requis");
    const v = (await g.agent.post("/v1/groupe/siret").expect(200)).body;
    expect(v).toMatchObject({ verifie: false, statut: "activite_refusee" });
    expect((await g.agent.post("/v1/achats-groupes").send(lancement()).expect(403)).body.error.details.reason).toBe("activite_refusee");
  });

  it("rejoindre, alertes, clôture : une demande par négoce de la part de SES clients ; réponse unique ; analyse ; offres selon les droits ; commande ; désistement ; admin", async () => {
    const a = await artisan(1);
    const b = await artisan(2, "8 rue du Port, 22500 Paimpol");
    const lance = (await a.agent.post("/v1/achats-groupes").send(lancement({ negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }, { nom: "Négoce Y", email: "y@negoce.fr" }] })).expect(201)).body;
    // Point 2 : B (même métier, même secteur) est alerté, mot pour mot.
    const alerte = mailsVers(ctx, "artisan2@toitures.fr").find((m) => m.subject.startsWith("Nouvel achat groupé"))!;
    expect(alerte.text).toMatch(/^Nouvel achat groupé : Ardoise 32×22 Espagne 1er choix, livraison avant le \d+ \S+, secteur 22\. Rejoins-le avant le \d+ \S+\./);
    const pres = (await b.agent.get("/v1/achats-groupes/pres-de-chez-moi").expect(200)).body.achats;
    expect(pres).toHaveLength(1);
    expect(JSON.stringify(pres)).not.toMatch(/Toitures 1|Lannion/);
    const rejoint = (await b.agent.post(`/v1/achats-groupes/ouverts/${pres[0].id}/rejoindre`).send({ quantite: 900, livraison: "22500 Paimpol", dateBesoin: jour(32), negoces: [{ nom: "Négoce Y", email: "y@negoce.fr" }] }).expect(201)).body;
    expect(rejoint).toMatchObject({ achatId: lance.achatId, rejoint: true });
    const carteA = (await a.agent.get(`/v1/achats-groupes/${lance.besoinId}`).expect(200)).body;
    expect(carteA).toMatchObject({ etat: "regroupe", titre: "Regroupé avec d'autres entreprises", commune: "Lannion" });
    // Sous le seuil d'anonymat : la jauge, sans le reste à atteindre (2 700 pièces × 1,20 € = 3 240 € ≥ 3 000 €).
    expect(carteA.jauge).toMatchObject({ pourcent: 100, atteint: true });
    expect(JSON.stringify(carteA)).not.toMatch(/Toitures 2|Paimpol/);
    // L'autre entreprise ne voit pas la participation de A.
    await b.agent.get(`/v1/achats-groupes/${lance.besoinId}`).expect(404);

    const achat = await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: lance.achatId } });
    // La veille : « Demain, Négoce X reçoit la demande groupée… Tu l'as prévenu ? » (pas encore prévenu).
    const r = (await tache(new Date(achat.clotureLe!.getTime() - 20 * 3_600_000).toISOString())).body;
    expect(r.rappels).toBe(3);
    // La clôture : une demande par négoce.
    const c = (await tache(new Date(achat.clotureLe!.getTime() + 3_600_000).toISOString())).body;
    expect(c.consultes).toBe(1);
    const x = mailsVers(ctx, "x@negoce.fr");
    const y = mailsVers(ctx, "y@negoce.fr");
    expect(x).toHaveLength(1);
    expect(y).toHaveLength(1);
    expect(x[0]!.text).toContain("De la part de votre client Toitures 1, via Mobiiz.");
    expect(x[0]!.text).not.toContain("Toitures 2");
    expect(y[0]!.text).toContain("De la part de vos clients Toitures 1 et Toitures 2, via Mobiiz.");
    expect(x[0]!.subject).toMatch(/^Demande de prix groupée : 2\u00a0700 pièces d'ardoise 32×22 Espagne 1er choix \(réponse avant le \d+ \S+\)$/);
    for (const t of ["Vous n'êtes pas le seul négoce consulté.", "Une seule offre possible, sans deuxième tour", "livraison comprise", "même si le volume final est un peu inférieur", "- 1\u00a0800 pièces à Lannion", "- 900 pièces à Paimpol"]) expect(x[0]!.text).toContain(t);
    expect(x[0]!.replyTo).toMatch(/@mobiiz\.test$/);
    expect(mailsVers(ctx, "artisan1@toitures.fr").some((m) => m.text.includes("Ta demande est partie chez Négoce X. Assure-toi qu'il l'a bien reçue."))).toBe(true);
    // Retirer n'est plus possible : « Me désister ».
    expect((await b.agent.post(`/v1/achats-groupes/${rejoint.besoinId}/retirer`).expect(409)).body.error.details.reason).toBe("cloture_passee");

    // Le négoce répond sans inscription : une seule offre.
    const page = (await publique().get(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).expect(200)).body;
    expect(page).toMatchObject({ deLaPartDe: "De la part de votre client Toitures 1, via Mobiiz", quantiteTotale: 2700, reponse: null });
    expect(page.livraisons.map((l: { commune: string }) => l.commune).sort()).toEqual(["Lannion", "Paimpol"]);
    await publique().post(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).send({ accepteConditions: false, prixUnitaireHt: 1.1 }).expect(400);
    await publique().post(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).send({ accepteConditions: true, prixUnitaireHt: 1.1, delaiJours: 5 }).expect(200);
    expect((await publique().post(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).send({ accepteConditions: true, prixUnitaireHt: 0.9 }).expect(409)).body.error.details.reason).toBe("deja_repondu");
    // Y dépose un devis PDF… sur une autre référence (30×20) : douteux, jamais mis en avant.
    const pdf = Buffer.from(await makePdf(["devis"], [["A", "Ardoise naturelle 30×20 Espagne 1er choix", "2700 pièces", "0,80", "2 160,00"]], "Total HT 2 160,00", "DEVIS")).toString("base64");
    await publique().post(`/v1/public/achat-groupe/${jetonDe("y@negoce.fr")}`).send({ accepteConditions: true, pdf: { nom: "devis.pdf", contenuBase64: pdf } }).expect(200);

    // B se désiste après la clôture : noté pour l'admin.
    await b.agent.post(`/v1/achats-groupes/${rejoint.besoinId}/desister`).send({ raison: "Chantier reporté" }).expect(200);

    const echeance = (await tache(new Date(achat.reponseAvantLe!.getTime() + 3_600_000).toISOString())).body;
    expect(echeance.analyses).toBe(1);
    const consultations = await ctx.prisma.consultationAchatGroupe.findMany({ where: { regroupementId: achat.id }, orderBy: { email: "asc" } });
    expect(consultations.map((k) => [k.email, k.statut, k.raisons])).toEqual([
      ["x@negoce.fr", "valide", []],
      ["y@negoce.fr", "douteuse", ["reference"]],
    ]);
    const vueA = (await a.agent.get(`/v1/achats-groupes/${lance.besoinId}`).expect(200)).body;
    expect(vueA).toMatchObject({ etat: "offre", titre: "Offre reçue", actions: { commander: true } });
    expect(vueA.offres.mien).toMatchObject({ nom: "Négoce X", totalHt: 1980 });
    expect(vueA.offres.meilleure).toMatchObject({ nom: "Négoce X", nomVisible: true, prixUnitaireHt: 1.1 });
    expect(vueA.offres.economieHt).toBe(0);

    // Commander : le bon part chez le négoce, le prix va dans « Mes prix ».
    const cmd = (await a.agent.post(`/v1/achats-groupes/${lance.besoinId}/commander`).send({ consultationId: vueA.offres.mien.consultationId }).expect(200)).body;
    expect(cmd).toMatchObject({ negoce: "Négoce X", totalHt: 1980 });
    const bon = mailsVers(ctx, "x@negoce.fr").at(-1)!;
    expect(bon.subject).toMatch(/^Bon de commande n° \d+ : 1\u00a0800 pièces d'ardoise 32×22/);
    expect(bon.attachments?.[0]?.contentType).toBe("application/pdf");
    const prix = (await a.agent.get("/v1/mes-prix").expect(200)).body.articles;
    expect(prix.some((p: { dernier: { prixHt: number } }) => p.dernier.prixHt === 1.1)).toBe(true);
    await a.agent.get(`/v1/achats-groupes/${lance.besoinId}/bon.pdf`).expect(200);

    // L'admin : la douteuse, le désistement, la facture du mois (préparée, jamais envoyée).
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
    await greg.agent.get("/v1/admin/pilotage/achats-groupes").expect(403);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const adm = (await greg.agent.get("/v1/admin/pilotage/achats-groupes").expect(200)).body;
    expect(adm.douteuses).toHaveLength(1);
    expect(adm.douteuses[0].raisons).toEqual(["La référence de l'offre n'est pas celle demandée."]);
    expect(adm.desistements[0]).toMatchObject({ entreprise: "Toitures 2", apresCloture: true, raison: "Chantier reporté", quantite: 900 });
    expect(adm.volumesMin.couverture).toBe(3000);
    expect(adm.envoiFacturesActif).toBe(false);
    const premierDuMois = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1, 10, 15)).toISOString();
    expect((await tache(premierDuMois)).body.factures).toBe(1);
    const f = await ctx.prisma.factureCommissionMensuelle.findFirstOrThrow();
    expect(f).toMatchObject({ negoceEmail: "x@negoce.fr", envoyeeLe: null });
    expect(Number(f.totalHt)).toBe(1980);
    expect((await greg.agent.put("/v1/admin/pilotage/achats-groupes/volume-min").send({ famille: "couverture", montantHt: 4500 }).expect(200)).body.volumesMin.couverture).toBe(4500);
  });

  it("le nom de la meilleure offre : seulement pour un participant abonné ; sinon « un négoce du secteur », sans commande possible chez lui", async () => {
    const a = await artisan(1);
    const b = await artisan(2, "8 rue du Port, 22500 Paimpol");
    const la = (await a.agent.post("/v1/achats-groupes").send(lancement({ negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }] })).expect(201)).body;
    const lb = (await b.agent.post(`/v1/achats-groupes/ouverts/${la.achatId}/rejoindre`).send({ quantite: 900, livraison: "22500 Paimpol", dateBesoin: jour(30), negoces: [{ nom: "Négoce Y", email: "y@negoce.fr" }] }).expect(201)).body;
    const achat = await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: la.achatId } });
    await tache(new Date(achat.clotureLe!.getTime() + 3_600_000).toISOString());
    await publique().post(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).send({ accepteConditions: true, prixUnitaireHt: 1.05 }).expect(200);
    await publique().post(`/v1/public/achat-groupe/${jetonDe("y@negoce.fr")}`).send({ accepteConditions: true, prixUnitaireHt: 1.25 }).expect(200);
    await tache(new Date(achat.reponseAvantLe!.getTime() + 3_600_000).toISOString());
    const vueB = (await b.agent.get(`/v1/achats-groupes/${lb.besoinId}`).expect(200)).body.offres;
    expect(vueB.mien).toMatchObject({ nom: "Négoce Y", totalHt: 1125 });
    expect(vueB.meilleure).toMatchObject({ nom: "un négoce du secteur", nomVisible: false, totalHt: 945, consultationId: null });
    expect(vueB.economieHt).toBe(180);
    expect(JSON.stringify(vueB)).not.toContain("Négoce X");
    const meilleure = (await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: la.achatId } })).meilleureId!;
    await b.agent.post(`/v1/achats-groupes/${lb.besoinId}/commander`).send({ consultationId: meilleure }).expect(403);
  });

  it("plan B : pas assez de volume → « Envoyer à mes négoces » fait la demande perso en un clic ; retirer avant la clôture est noté", async () => {
    const a = await artisan(1);
    const l = (await a.agent.post("/v1/achats-groupes").send(lancement({ quantite: 500 })).expect(201)).body;
    const b = await artisan(2);
    const lb = (await b.agent.post(`/v1/achats-groupes/ouverts/${l.achatId}/rejoindre`).send({ quantite: 100, livraison: "22300 Lannion", dateBesoin: jour(30), negoces: [{ nom: "Négoce Y", email: "y@negoce.fr" }] }).expect(201)).body;
    await b.agent.post(`/v1/achats-groupes/${lb.besoinId}/retirer`).expect(200);
    const achat = await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: l.achatId } });
    // 500 pièces × 1,20 € = 600 € < 3 000 € : pas assez.
    expect((await tache(new Date(achat.clotureLe!.getTime() + 3_600_000).toISOString())).body.pasAssez).toBe(1);
    expect(mailsVers(ctx, "x@negoce.fr")).toHaveLength(0);
    const carte = (await a.agent.get(`/v1/achats-groupes/${l.besoinId}`).expect(200)).body;
    expect(carte).toMatchObject({ etat: "pas_assez", titre: "Pas assez de volume cette fois", actions: { planB: true } });
    const pb = (await a.agent.post(`/v1/achats-groupes/${l.besoinId}/plan-b`).expect(200)).body;
    expect(pb.demandeId).toBeTruthy();
    expect(mailsVers(ctx, "x@negoce.fr")).toHaveLength(1);
    expect((await a.agent.get("/v1/achats-groupes").expect(200)).body.achats).toHaveLength(0);
    const d = await ctx.prisma.desistementAchatGroupe.findFirstOrThrow();
    expect(d).toMatchObject({ apresCloture: false });
  });

  it("alertes : au plus 2 par jour, le reste dans le résumé ; réglage « aucune » ; « Acheter en groupe » depuis une liste demande la confirmation", async () => {
    const a = await artisan(1);
    const b = await artisan(2);
    for (const d of ["Ardoise naturelle 40×22 Espagne 1er choix", "Ardoise naturelle 40×25 Espagne 1er choix", "Ardoise naturelle 30×20 Espagne 1er choix"]) await a.agent.post("/v1/achats-groupes").send(lancement({ designation: d })).expect(201);
    expect(mailsVers(ctx, "artisan2@toitures.fr").filter((m) => m.subject.startsWith("Nouvel achat groupé"))).toHaveLength(2);
    const r = (await tache(new Date().toISOString())).body;
    expect(r.resumes).toBe(1);
    expect(mailsVers(ctx, "artisan2@toitures.fr").some((m) => m.subject === "Achats groupés près de chez toi")).toBe(true);
    expect((await b.agent.put("/v1/me/alertes-achats-groupes").send({ reglage: "aucune" }).expect(200)).body.reglage).toBe("aucune");
    await a.agent.post("/v1/achats-groupes").send(lancement({ designation: "Ardoise naturelle 32×22 Angers 1er choix" })).expect(201);
    expect(mailsVers(ctx, "artisan2@toitures.fr").filter((m) => m.subject.startsWith("Nouvel achat groupé"))).toHaveLength(2);

    // Précision 2 : depuis une liste, chaque ligne reçoit sa question ; seules les lignes confirmées partent.
    const c = await couvreurAvecListe(ctx, "artisan3@toitures.fr", "Toitures 3", "3 rue des Ajoncs, 22300 Lannion", [
      { libelle: A3222, quantite: "1200", unite: "pièces" },
      { libelle: "Crochet inox 100 mm", quantite: "1300", unite: "pièces" },
    ]);
    const lignes = (await c.agent.get(`/v1/projects/${c.projectId}/achat-groupe`).expect(200)).body.lignes;
    expect(lignes.map((x: { question: string | null }) => x.question)).toEqual(["C'est bien de l'ardoise 32×22 Espagne 1er choix ?", null]);
    await c.agent.post(`/v1/projects/${c.projectId}/achat-groupe`).send({ confirmees: [], dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }] }).expect(400);
    const res = (await c.agent.post(`/v1/projects/${c.projectId}/achat-groupe`).send({ confirmees: lignes.map((x: { key: string }) => x.key), dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }] }).expect(201)).body;
    expect(res.lancees).toHaveLength(1);
    expect(res.perso).toHaveLength(1);
  });

  it("recette en prévisualisation : l'admin clôture et analyse tout de suite (refusé aux autres)", async () => {
    const a = await artisan(1);
    const l = (await a.agent.post("/v1/achats-groupes").send(lancement({ quantite: 3000 })).expect(201)).body;
    await a.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/avancer`).send({ etape: "cloture" }).expect(403);
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    expect((await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/avancer`).send({ etape: "cloture" }).expect(200)).body).toEqual({ statut: "consultation" });
    await publique().post(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).send({ accepteConditions: true, prixUnitaireHt: 1.15 }).expect(200);
    expect((await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/avancer`).send({ etape: "echeance" }).expect(200)).body.douteuses).toBe(0);
    expect((await a.agent.get(`/v1/achats-groupes/${l.besoinId}`).expect(200)).body).toMatchObject({ etat: "offre" });
  });
});
