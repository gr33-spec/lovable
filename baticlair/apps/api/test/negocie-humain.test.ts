import { PDFDocument } from "pdf-lib";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SIRET_TEST_FERME, SIRET_TEST_HORS_MATERIAUX } from "../src/modules/recentrage/application/verification-negoce.service.js";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { inscrireNegoce, lienInvitation } from "./support/negoce.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * LE BUSINESS MODEL FINAL (Greg, 25 octobre 2026) : l'app fait le quantitatif et l'envoie aux négoces ; quand des besoins
 * se groupent, un CHASSEUR de Mobiiz négocie par téléphone pour tout le monde (mode humain, par défaut). Par l'API :
 * besoins et regroupements, veille et rattrapage, chasseur (double authentification), offre avec commission intégrée,
 * acceptation = bon de commande, commande totale au négoce, observatoire, vérification des négoces, « Préviens ton
 * négoce », interrupteur du mode.
 */
let ctx: TestContext;
const avant = { COMMISSION_DEFAUT: process.env.COMMISSION_DEFAUT, MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, GROUPE: process.env.GROUPE, ZONES_ACTIVES: process.env.ZONES_ACTIVES, GROUPE_ADMINS: process.env.GROUPE_ADMINS, CHASSEURS: process.env.CHASSEURS, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  // Depuis le 27 octobre 2026, le mode par défaut est l'achat groupé automatique : ce fichier joue le mode humain.
  process.env.MODE_REGROUPEMENT = "humain";
  // La commission du chasseur (1 à 2 %) ; le défaut est 0 depuis l'achat groupé par métier (27 octobre 2026).
  process.env.COMMISSION_DEFAUT = "2";
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CHASSEURS = "chasseur@mobiiz.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
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
const A3020 = "Ardoise naturelle 30×20 Espagne 1er choix";
const CROCHET = "Crochet inox 100 mm";
const publique = () => request(ctx.app.getHttpServer());
const dans = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
const artisan = (n: number, lignes = [{ libelle: A3222, quantite: "1800", unite: "pièces" }], adresse = "3 rue des Ajoncs, 22300 Lannion") => couvreurAvecListe(ctx, `artisan${n}@toitures.fr`, `Toitures ${n}`, adresse, lignes);

async function chasseur() {
  const c = await couvreurAvecListe(ctx, "chasseur@mobiiz.fr", "Mobiiz", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
  await c.agent.get("/v1/chasseur/regroupements").expect(403);
  await doubleAuthentification(ctx, c.agent, "chasseur@mobiiz.fr");
  return c;
}

describe("business model final : le regroupement négocié par un humain", { timeout: 120_000 }, () => {
  it("déclarer : gros article seulement, 30×20 ≠ 32×22, même référence + même département + dates compatibles = même regroupement ; hors zone non", async () => {
    const a = await artisan(1, [{ libelle: A3222, quantite: "1800", unite: "pièces" }, { libelle: CROCHET, quantite: "1900", unite: "pièces" }]);
    expect((await a.agent.get("/v1/regroupement/mode").expect(200)).body).toEqual({ mode: "humain" });
    const lignes = (await a.agent.get(`/v1/projects/${a.projectId}/negocie/lignes`).expect(200)).body;
    expect(lignes.lignes.map((l: { negociable: boolean }) => l.negociable)).toEqual([true, false]);
    const [ardoise, crochet] = a.articles;
    const ra = (await a.agent.post("/v1/negocie/besoins").send({ projectId: a.projectId, articleKey: ardoise, dateBesoin: dans(20) }).expect(201)).body;
    const refus = await a.agent.post("/v1/negocie/besoins").send({ projectId: a.projectId, articleKey: crochet, dateBesoin: dans(20) }).expect(400);
    expect(refus.body.error.details.reason).toBe("non_negociable");

    const b = await artisan(2, [{ libelle: A3222, quantite: "900", unite: "pièces" }], "8 rue du Port, 22500 Paimpol");
    const rb = (await b.agent.post("/v1/negocie/besoins").send({ projectId: b.projectId, articleKey: b.articles[0], dateBesoin: dans(35) }).expect(201)).body;
    expect(rb.regroupementId).toBe(ra.regroupementId);
    // 30×20 : un autre regroupement ; une date trop lointaine : un autre aussi.
    const c = await artisan(3, [{ libelle: A3020, quantite: "900", unite: "pièces" }]);
    expect((await c.agent.post("/v1/negocie/besoins").send({ projectId: c.projectId, articleKey: c.articles[0], dateBesoin: dans(20) }).expect(201)).body.regroupementId).not.toBe(ra.regroupementId);
    const tard = (await c.agent.post("/v1/negocie/besoins").send({ designation: A3222, quantite: 500, unite: "pièces", dateBesoin: dans(120), livraison: "Lannion 22300" }).expect(201)).body;
    expect(tard.regroupementId).not.toBe(ra.regroupementId);

    // L'artisan voit « Regroupement en cours » (sous 5 entreprises), jamais un nom ni une commune.
    const vue = (await a.agent.get("/v1/negocie").expect(200)).body;
    expect(vue.besoins[0].regroupement).toMatchObject({ statut: "en_collecte", libelle: "Regroupement en cours", participants: { titre: "Regroupement en cours", detail: null } });
    expect(JSON.stringify(vue)).not.toMatch(/Toitures 2|Paimpol/);

    // Hors zone active : tout sauf les regroupements.
    const brest = await artisan(4, [{ libelle: A3222, quantite: "900", unite: "pièces" }], "1 rue de Siam, 29200 Brest");
    expect((await brest.agent.post("/v1/negocie/besoins").send({ projectId: brest.projectId, articleKey: brest.articles[0], dateBesoin: dans(20) }).expect(403)).body.error.details.reason).toBe("zone_inactive");
    // La phrase en français suit le refus (Greg, 27 octobre 2026 : l'écran montrait « motif : zone_inactive »).
    expect((await brest.agent.post("/v1/negocie/besoins").send({ designation: A3222, quantite: 500, unite: "pièces", dateBesoin: dans(20) }).expect(403)).body.error.details.phrase).toMatch(/^Les regroupements arrivent bientôt/);
    // La livraison décide du département : une entreprise du 29 qui livre dans le 22 se regroupe dans le 22.
    expect((await brest.agent.post("/v1/negocie/besoins").send({ designation: A3222, quantite: 500, unite: "pièces", dateBesoin: dans(20), livraison: "22300 Lannion" }).expect(201)).body.regroupementId).toBe(ra.regroupementId);
    // Greg, 27 octobre 2026 (capture) : une entreprise sans adresse, la ville de livraison tapée : accepté, pas « zone_inactive ».
    const sansAdresse = await artisan(5, [{ libelle: A3222, quantite: "300", unite: "pièces" }]);
    await ctx.prisma.company.update({ where: { id: sansAdresse.companyId }, data: { address: null } });
    expect((await sansAdresse.agent.post("/v1/negocie/besoins").send({ designation: A3222, quantite: 300, unite: "pièces", dateBesoin: dans(20) }).expect(400)).body.error.details.reason).toBe("livraison_requise");
    await sansAdresse.agent.post("/v1/negocie/besoins").send({ designation: A3222, quantite: 300, unite: "pièces", dateBesoin: dans(20), livraison: "22300 Lannion" }).expect(201);
    // La consultation automatique est fermée en mode humain.
    expect((await a.agent.post(`/v1/projects/${a.projectId}/regroupements`).send({ articles: [ardoise], mois: "2026-11-01" }).expect(409)).body.error.details.reason).toBe("mode_humain");
  });

  it("veille et rattrapage : la ligne d'une demande perso attend ; quand un regroupement se forme, « tu les ajoutes ? », un clic ; « Non merci » ; jamais après une commande perso", async () => {
    const a = await artisan(1);
    const d = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, dateBesoin: dans(25), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }] }).expect(201)).body;
    let vue = (await a.agent.get("/v1/negocie").expect(200)).body;
    expect(vue.veille).toHaveLength(1);
    expect(vue.veille[0]).toMatchObject({ designation: A3222, quantite: 1800, regroupementDisponible: false });
    // B déclare plus tard : A, arrivé le premier, est rattrapé.
    const b = await artisan(2, [{ libelle: A3222, quantite: "900", unite: "pièces" }]);
    const rb = (await b.agent.post("/v1/negocie/besoins").send({ projectId: b.projectId, articleKey: b.articles[0], dateBesoin: dans(30) }).expect(201)).body;
    const alerte = mailsVers(ctx, "artisan1@toitures.fr").find((m) => m.subject === "Un regroupement se forme")!;
    expect(alerte.text).toContain(`Un regroupement se forme sur Ardoise`);
    expect(alerte.text).toContain("tu les ajoutes ?");
    vue = (await a.agent.get("/v1/negocie").expect(200)).body;
    expect(vue.veille[0].regroupementDisponible).toBe(true);
    const ajoute = (await a.agent.post(`/v1/negocie/besoins/${vue.veille[0].id}/ajouter`).expect(200)).body;
    expect(ajoute.regroupementId).toBe(rb.regroupementId);
    // Une seule alerte, même quand un troisième arrive.
    await (await artisan(3)).agent.get("/v1/negocie").expect(200);
    expect(mailsVers(ctx, "artisan1@toitures.fr").filter((m) => m.subject === "Un regroupement se forme")).toHaveLength(1);

    // C : déjà commandé en perso → aucune alerte ; D : « Non merci ».
    const c = await artisan(5);
    const dc = (await c.agent.post(`/v1/projects/${c.projectId}/demandes-perso`).send({ but: "commander", accord: true, articles: c.articles, dateBesoin: dans(60), negoces: [{ nom: "Négoce Y", email: "y@negoce.fr" }] }).expect(201)).body;
    const jeton = /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, "y@negoce.fr").at(-1)!.text)![1]!;
    await publique().post(`/v1/public/chiffrer/${jeton}`).send({ prix: { "0": 1.1 }, livraisonHt: 0, delaiJours: 2, validiteJours: 7 }).expect(200);
    await c.agent.post(`/v1/demandes-perso/${dc.id}/commander`).send({ recipientId: dc.destinataires[0].id }).expect(200);
    const e = await artisan(6);
    await e.agent.post("/v1/negocie/besoins").send({ projectId: e.projectId, articleKey: e.articles[0], dateBesoin: dans(55) }).expect(201);
    expect(mailsVers(ctx, "artisan5@toitures.fr").some((m) => m.subject === "Un regroupement se forme")).toBe(false);
    const vueA = (await a.agent.get("/v1/negocie").expect(200)).body;
    expect(vueA.veille).toHaveLength(0);
    expect(d.id).toBeTruthy();
  });

  it("le chasseur : double authentification, prise en charge, journal d'appels, offre (commission intégrée), envoi, acceptation = bon de commande, refus, commande totale au négoce", async () => {
    const a = await artisan(1);
    const b = await artisan(2, [{ libelle: A3222, quantite: "1200", unite: "pièces" }]);
    const c3 = await artisan(3, [{ libelle: A3222, quantite: "600", unite: "pièces" }]);
    const ra = (await a.agent.post("/v1/negocie/besoins").send({ projectId: a.projectId, articleKey: a.articles[0], dateBesoin: dans(20) }).expect(201)).body;
    await b.agent.post("/v1/negocie/besoins").send({ projectId: b.projectId, articleKey: b.articles[0], dateBesoin: dans(22) }).expect(201);
    await c3.agent.post("/v1/negocie/besoins").send({ projectId: c3.projectId, articleKey: c3.articles[0], dateBesoin: dans(24) }).expect(201);
    // Un artisan n'est pas chasseur.
    await a.agent.get("/v1/chasseur/regroupements").expect(403);
    const ch = await chasseur();
    const liste = (await ch.agent.get("/v1/chasseur/regroupements").expect(200)).body;
    const r = liste.regroupements.find((x: { id: string }) => x.id === ra.regroupementId);
    expect(r).toMatchObject({ statut: "en_collecte", volume: 3600, entreprises: 3, unite: "pièces" });
    await ch.agent.put(`/v1/chasseur/regroupements/${r.id}/offre`).send({ negoceNom: "Négoce N", negoceEmail: "n@negoce.fr", prixNegocieHt: 0.9, livraisonHt: 40, valideJusquau: dans(10) }).expect(409);
    await ch.agent.post(`/v1/chasseur/regroupements/${r.id}/prendre`).expect(200);
    await ch.agent.post(`/v1/chasseur/regroupements/${r.id}/appels`).send({ negoce: "Négoce N", note: "0,90 € si 3 500 pièces" }).expect(200);
    const offre = (await ch.agent.put(`/v1/chasseur/regroupements/${r.id}/offre`).send({ negoceNom: "Négoce N", negoceEmail: "n@negoce.fr", negoceTelephone: "02 96 00 00 00", prixNegocieHt: 0.9, livraisonHt: 40, conditions: "Livraison sous 5 jours", valideJusquau: dans(10) }).expect(200)).body;
    expect(offre.prixAfficheHt).toBe(0.918);
    // Avant l'envoi, l'artisan ne voit pas d'offre ; il ne peut rien accepter.
    expect((await a.agent.get("/v1/negocie").expect(200)).body.besoins[0].offre).toBeNull();
    await ch.agent.post(`/v1/chasseur/regroupements/${r.id}/envoyer`).expect(200);
    expect(mailsVers(ctx, "artisan2@toitures.fr").some((m) => m.subject === "Ton offre groupée est arrivée")).toBe(true);

    // L'artisan : « Négoce vérifié dans le 22 », « Négocié pour vous par Mobiiz », la commission dite ; pas le nom avant d'accepter.
    const vue = (await a.agent.get("/v1/negocie").expect(200)).body.besoins[0];
    expect(vue.offre).toMatchObject({ negoce: "Négoce vérifié dans le 22", prixHt: 0.918, livraisonHt: 40, totalHt: 1692.4, mentions: ["Négocié pour vous par Mobiiz", "Commission Mobiiz incluse dans le prix"] });
    expect(JSON.stringify(vue)).not.toContain("Négoce N");
    const bon = (await a.agent.post(`/v1/negocie/besoins/${vue.id}/accepter`).expect(200)).body;
    expect(bon).toMatchObject({ negoce: "Négoce N", totalHt: 1692.4 });
    const mailBon = mailsVers(ctx, "artisan1@toitures.fr").find((m) => m.subject.startsWith("Ta commande groupée n°"))!;
    expect(mailBon.attachments?.[0]?.filename).toMatch(/^bon-de-commande-\d+\.pdf$/);
    expect((await a.agent.get("/v1/negocie").expect(200)).body.besoins[0].offre.negoce).toBe("Négoce N");
    const pdf = await a.agent.get(`/v1/negocie/besoins/${vue.id}/bon.pdf`).buffer(true).parse((res, cb) => {
      const parts: Buffer[] = [];
      res.on("data", (c: Buffer) => parts.push(c));
      res.on("end", () => cb(null, Buffer.concat(parts)));
    }).expect(200);
    // Le bon : des champs remplissables (formulaire PDF).
    expect((await PDFDocument.load(pdf.body as Buffer)).getForm().getFields()).toHaveLength(4);
    await a.agent.post(`/v1/negocie/besoins/${vue.id}/accepter`).expect(409);
    // B refuse, sans motif ; C accepte.
    const vb = (await b.agent.get("/v1/negocie").expect(200)).body.besoins[0];
    await b.agent.post(`/v1/negocie/besoins/${vb.id}/refuser`).expect(200);
    const vc = (await c3.agent.get("/v1/negocie").expect(200)).body.besoins[0];
    await c3.agent.post(`/v1/negocie/besoins/${vc.id}/accepter`).expect(200);
    // Le chasseur voit qui a accepté, puis transmet la commande totale (quantités acceptées) au négoce.
    const apres = (await ch.agent.get("/v1/chasseur/regroupements").expect(200)).body.regroupements.find((x: { id: string }) => x.id === r.id);
    expect(apres.acceptes).toBe(2);
    const t = (await ch.agent.post(`/v1/chasseur/regroupements/${r.id}/transmettre`).expect(200)).body;
    expect(t).toMatchObject({ quantite: 2400, entreprises: 2, commissionHt: 43.2 });
    const lot = mailsVers(ctx, "n@negoce.fr").at(-1)!;
    expect(lot.subject).toMatch(new RegExp(`^Commande groupée n° ${apres.numero} : 2.400 pièces d'ardoise 32×22 Espagne 1er choix$`));
    expect(lot.text).toContain("Toitures 1");
    expect(lot.text).toContain("Toitures 3");
    expect(lot.text).not.toContain("Toitures 2");
    expect((await a.agent.get("/v1/negocie").expect(200)).body.besoins[0].regroupement.statut).toBe("commande");
    // Les hypothèses : formés, pris en charge, avec offre, commandés, taux d'acceptation, commission du mois.
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    expect((await greg.agent.get("/v1/admin/pilotage/hypotheses").expect(200)).body.negocie).toMatchObject({ formes: 1, prisEnCharge: 1, avecOffre: 1, commandes: 1, tauxAcceptation: 0.667, commissionHt: 43.2 });
  });

  it("l'observatoire : chaque réponse notée sans identifiant ; moyenne du secteur affichée à partir de 5 réponses ; export CSV sans nom", async () => {
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
    const prix = [1.05, 1.1, 1.15, 1.0, 1.2];
    for (const [i, p] of prix.entries()) {
      const x = await artisan(10 + i);
      await x.agent.post(`/v1/projects/${x.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: x.articles, negoces: [{ nom: `Négoce ${i}`, email: `n${i}@negoce.fr` }] }).expect(201);
      const jeton = /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, `n${i}@negoce.fr`).at(-1)!.text)![1]!;
      await publique().post(`/v1/public/chiffrer/${jeton}`).send({ prix: { "0": p }, livraisonHt: 0, delaiJours: 2, validiteJours: 7 }).expect(200);
      if (i === 3) expect((await x.agent.get("/v1/mes-prix/secteur").expect(200)).body.articles).toEqual([]);
    }
    const y = await artisan(30);
    expect((await y.agent.get("/v1/mes-prix/secteur").expect(200)).body).toEqual({ departement: "22", articles: [{ libelle: "Ardoise 32×22 Espagne 1er choix", unite: "pièces", environ: 1.1 }] });
    // Sur une nouvelle demande : « Prix observé dans le 22 : environ 1,10 € ».
    const d = (await y.agent.post(`/v1/projects/${y.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: y.articles, negoces: [{ nom: "Négoce Z", email: "z@negoce.fr" }] }).expect(201)).body;
    expect(d.lignes[0].repere).toContain("Prix observé dans le 22 : environ 1,10 €.");
    const obs = await ctx.prisma.observationPrix.findMany();
    expect(obs).toHaveLength(5);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const csv = (await greg.agent.get("/v1/admin/pilotage/observatoire.csv").expect(200)).text;
    expect(csv.split("\n")[0]).toBe("article;libelle;prix_unitaire_ht;quantite;unite;palier;departement;date;type");
    expect(csv).not.toMatch(/Négoce|Toitures|negoce\.fr/);
  });

  it("la vérification des négoces : SIRET fermé ou hors matériaux refusé ; e-mail grand public « à vérifier » ; l'admin valide ou bloque ; badge « Nouveau négoce »", async () => {
    const a = await artisan(1);
    for (const email of ["ferme@negoce.fr", "resto@negoce.fr", "pointp.lannion@gmail.com", "agence@pointp.fr"]) await a.agent.post("/v1/groupe/negoces").send({ nom: "Négoce", email, familles: ["couverture"] }).expect(201);
    const essai = (email: string, siret: string) =>
      publique()
        .post("/v1/negoce/inscription")
        .send({ jeton: lienInvitation(ctx, email), email, siret, enseigne: "POINT P", telephone: "02 96 00 00 00", depots: [{ adresse: "ZA de Kerverzot, 22300 Lannion" }], livraison: { gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 1000, prixHt: 80 }], maxKm: 1000 }, departements: ["22"], conditions: true });
    expect((await essai("ferme@negoce.fr", SIRET_TEST_FERME).expect(400)).body.error.details.reason).toBe("siret_fermee");
    expect((await essai("resto@negoce.fr", SIRET_TEST_HORS_MATERIAUX).expect(400)).body.error.details.reason).toBe("siret_activite");
    await essai("pointp.lannion@gmail.com", "33333333300008").expect(201);
    await inscrireNegoce(ctx, "agence@pointp.fr", { depot: "ZA de Kerverzot, 22300 Lannion", departements: ["22"], siret: "44444444400004" });
    expect((await ctx.prisma.compteNegoce.findUniqueOrThrow({ where: { email: "pointp.lannion@gmail.com" } })).verification).toBe("a_verifier");
    expect((await ctx.prisma.compteNegoce.findUniqueOrThrow({ where: { email: "agence@pointp.fr" } })).verification).toBe("valide");
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const liste = (await greg.agent.get("/v1/admin/pilotage/negoces-a-verifier").expect(200)).body.negoces;
    const gmail = liste.find((n: { email: string }) => n.email === "pointp.lannion@gmail.com");
    expect(gmail).toMatchObject({ verification: "a_verifier", nouveau: true, naf: "46.73A" });
    await greg.agent.post(`/v1/admin/pilotage/negoces/${gmail.id}/valider`).expect(200);
    expect((await ctx.prisma.compteNegoce.findUniqueOrThrow({ where: { id: gmail.id } })).verification).toBe("valide");
    await greg.agent.post(`/v1/admin/pilotage/negoces/${gmail.id}/bloquer`).expect(200);
    expect((await ctx.prisma.compteNegoce.findUniqueOrThrow({ where: { id: gmail.id } })).verification).toBe("bloque");
  });

  it("« Préviens ton négoce » : seulement pour un négoce qui n'a jamais répondu sur Mobiiz ; « Je l'ai déjà prévenu » le fait disparaître", async () => {
    const a = await artisan(1);
    const d = (await a.agent.post(`/v1/projects/${a.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: a.articles, negoces: [{ nom: "Négoce Neuf", email: "neuf@negoce.fr" }] }).expect(201)).body;
    const p = (await a.agent.get(`/v1/demandes-perso/${d.id}/prevenir`).expect(200)).body.negoces;
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ nom: "Négoce Neuf" });
    await a.agent.post(`/v1/suppliers/${p[0].supplierId}/prevenu`).expect(200);
    expect((await a.agent.get(`/v1/demandes-perso/${d.id}/prevenir`).expect(200)).body.negoces).toEqual([]);
    // Un négoce qui a déjà répondu sur Mobiiz (pour un autre artisan) n'est jamais à prévenir.
    const jeton = /\/chiffrer\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, "neuf@negoce.fr").at(-1)!.text)![1]!;
    await publique().post(`/v1/public/chiffrer/${jeton}`).send({ prix: { "0": 1.1 }, livraisonHt: 0, delaiJours: 2, validiteJours: 7 }).expect(200);
    const b = await artisan(2);
    const db = (await b.agent.post(`/v1/projects/${b.projectId}/demandes-perso`).send({ but: "chiffrer", accord: true, articles: b.articles, negoces: [{ nom: "Négoce Neuf", email: "neuf@negoce.fr" }] }).expect(201)).body;
    expect((await b.agent.get(`/v1/demandes-perso/${db.id}/prevenir`).expect(200)).body.negoces).toEqual([]);
  });

  it("l'interrupteur admin : en « mois », la consultation par cycles revient (27 octobre 2026 : « automatique » = l'achat groupé) ; le mode humain ferme la déclaration de besoins", async () => {
    const a = await artisan(1);
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
    await greg.agent.put("/v1/admin/pilotage/mode-regroupement").send({ mode: "automatique" }).expect(403);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    await greg.agent.put("/v1/admin/pilotage/mode-regroupement").send({ mode: "mois" }).expect(200);
    expect((await a.agent.get("/v1/regroupement/mode").expect(200)).body).toEqual({ mode: "mois" });
    expect((await a.agent.post("/v1/negocie/besoins").send({ projectId: a.projectId, articleKey: a.articles[0], dateBesoin: dans(20) }).expect(409)).body.error.details.reason).toBe("mode_automatique");
    const l = (await a.agent.get(`/v1/projects/${a.projectId}/regroupements/lignes`).expect(200)).body;
    expect(l.lignes[0].groupable === true || l.lignes[0].groupable === false).toBe(true);
    await greg.agent.put("/v1/admin/pilotage/mode-regroupement").send({ mode: "humain" }).expect(200);
    await a.agent.post("/v1/negocie/besoins").send({ projectId: a.projectId, articleKey: a.articles[0], dateBesoin: dans(20) }).expect(201);
  });

  it("point 4 bis : alertes du chasseur (formation, digest de 18 h, date butoir, rappels J-5 et J-2, négoces à appeler, rappel 48 h à l'artisan)", async () => {
    const CH = "greg@example.fr"; // EMAIL_CHASSEUR absent : le premier admin.
    const cron = (maintenant?: string) => publique().get(`/v1/internal/negocie${maintenant ? `?maintenant=${encodeURIComponent(maintenant)}` : ""}`).set("authorization", "Bearer secret-de-la-tache");
    const a = await artisan(1);
    await a.agent.post("/v1/negocie/besoins").send({ projectId: a.projectId, articleKey: a.articles[0], dateBesoin: dans(20) }).expect(201);
    expect(mailsVers(ctx, CH)).toHaveLength(0); // une seule entreprise : pas encore un regroupement
    const b = await artisan(2, [{ libelle: A3222, quantite: "900", unite: "pièces" }], "8 rue du Port, 22500 Paimpol");
    await b.agent.post("/v1/negocie/besoins").send({ projectId: b.projectId, articleKey: b.articles[0], dateBesoin: dans(25) }).expect(201);
    const formation = mailsVers(ctx, CH);
    expect(formation).toHaveLength(1);
    expect(formation[0]!.subject).toMatch(/^Nouveau regroupement : Ardoise 32×22 Espagne 1er choix, 2 entreprises, 2.700 pièces, besoin au plus tôt le \d+ \S+$/);
    expect(formation[0]!.text).toContain("/admin/chasseur#r-");
    // Un 3e ajout le même jour : pas d'e-mail tout de suite, il part au digest de 18 h ; le digest ne repart pas deux fois.
    const c = await artisan(3, [{ libelle: A3222, quantite: "600", unite: "pièces" }], "1 place du Centre, 22200 Guingamp");
    await c.agent.post("/v1/negocie/besoins").send({ projectId: c.projectId, articleKey: c.articles[0], dateBesoin: dans(30) }).expect(201);
    expect(mailsVers(ctx, CH)).toHaveLength(1);
    expect((await cron().expect(200)).body).toMatchObject({ digest: 1 });
    const digest = mailsVers(ctx, CH).at(-1)!;
    expect(digest.subject).toBe("Les ajouts du jour (1 regroupement)");
    expect(digest.text).toContain("nouveau total 3\u00a0300 pièces d'ardoise 32×22 Espagne 1er choix, 3 entreprises.");
    expect((await cron().expect(200)).body).toMatchObject({ digest: 0 });

    // Le tableau du chasseur : date butoir = besoin le plus proche (J+20) moins 10 jours ; communes, jamais les rues.
    const ch = await chasseur();
    const statut = (await ch.agent.get("/v1/chasseur/statut").expect(200)).body;
    expect(statut).toMatchObject({ chasseur: true, aTraiter: 1 });
    const r = (await ch.agent.get("/v1/chasseur/regroupements").expect(200)).body.regroupements.find((x: { entreprises: number }) => x.entreprises === 3);
    expect(r).toMatchObject({ dateLimite: dans(10), joursRestants: 10, pastille: "neutre" });
    expect(r.participants.map((p: { commune: string }) => p.commune).sort()).toEqual(["Guingamp", "Lannion", "Paimpol"]);
    expect(JSON.stringify(r.participants)).not.toMatch(/rue|place/);

    // Rappels : J-5 puis J-2, une fois chacun, rien après la saisie d'une offre.
    const jour = (n: number) => new Date(Date.parse(`${dans(10)}T17:00:00Z`) - n * 86_400_000).toISOString();
    expect((await cron(jour(6)).expect(200)).body.rappels).toBe(0);
    expect((await cron(jour(5)).expect(200)).body.rappels).toBe(1);
    expect(mailsVers(ctx, CH).at(-1)!.subject).toBe("J-5 : Ardoise 32×22 Espagne 1er choix, aucune offre saisie");
    expect((await cron(jour(4)).expect(200)).body.rappels).toBe(0);
    expect((await cron(jour(2)).expect(200)).body.rappels).toBe(1);
    expect(mailsVers(ctx, CH).at(-1)!.subject).toBe("J-2 : Ardoise 32×22 Espagne 1er choix, aucune offre saisie");
    const rouge = (await ch.agent.get(`/v1/chasseur/regroupements`).expect(200)).body.regroupements.find((x: { id: string }) => x.id === r.id);
    expect(rouge.pastille).toBe("neutre"); // à l'heure réelle, J-10

    // Prise en charge : chaque artisan apprend que Mobiiz négocie pour lui.
    await ch.agent.post(`/v1/chasseur/regroupements/${r.id}/prendre`).expect(200);
    expect(mailsVers(ctx, "artisan1@toitures.fr").map((m) => m.subject)).toContain("Mobiiz négocie pour toi");
    expect(mailsVers(ctx, "artisan1@toitures.fr").find((m) => m.subject === "Mobiiz négocie pour toi")!.text).toContain("1\u00a0800 pièces d'ardoise 32×22");
    await ch.agent.put(`/v1/chasseur/regroupements/${r.id}/offre`).send({ negoceNom: "Négoce N", negoceEmail: "n@negoce.fr", prixNegocieHt: 1, livraisonHt: 0, valideJusquau: dans(1) }).expect(200);
    expect((await ch.agent.get("/v1/chasseur/regroupements").expect(200)).body.regroupements.find((x: { id: string }) => x.id === r.id).pastille).toBe("verte");
    expect((await ch.agent.get("/v1/chasseur/statut").expect(200)).body.aTraiter).toBe(0);
    await ch.agent.post(`/v1/chasseur/regroupements/${r.id}/envoyer`).expect(200);
    // Rappel 48 h avant la fin de validité, une fois, à qui n'a pas répondu.
    const avantA = mailsVers(ctx, "artisan1@toitures.fr").length;
    expect((await cron().expect(200)).body.rappelsArtisans).toBe(3);
    expect(mailsVers(ctx, "artisan1@toitures.fr").at(-1)!.subject).toBe("Ton offre groupée se termine bientôt");
    expect(mailsVers(ctx, "artisan1@toitures.fr")).toHaveLength(avantA + 1);
    expect((await cron().expect(200)).body.rappelsArtisans).toBe(0);
  });
});
