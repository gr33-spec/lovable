import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PHRASE_ABONNEMENT_ACHAT, PHRASE_LECTURES_EPUISEES, PHRASE_NEGOCE_OBLIGATOIRE, PHRASE_PREMIER_OFFERT } from "@baticlair/domain";
import { AnalysisMeter } from "../src/modules/ai-usage/index.js";
import { SIRET_TEST_GROSSISTE } from "../src/modules/groupe/index.js";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * L'ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message : « ce message fait foi »), par l'API : un achat = un métier
 * + une zone + une période, un panier de lignes du catalogue ; s'engager (case obligatoire, premier offert puis
 * abonnement) ; la clôture (une liste propre par négoce, ses familles s'il est spécialiste, les généralistes pour un panier
 * de plusieurs métiers, aucune commission à 0) ; la réponse ligne par ligne et les conditions d'ouverture ; la validation
 * de l'admin (écarter, corriger un prix, publier) ; la comparaison sur SES lignes ; commander, « Commande reçue »,
 * transmettre ses coordonnées ; les deux sorties et l'exclusion ; la commande pas passée ; l'accès (3 lectures en tout,
 * plus d'essai).
 */
let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "GROUPE_ADMINS", "CRON_SECRET", "PRIX_REPERES", "SEUIL_VOLUME_MIN", "EMAIL_DOMAINE", "MODE_REGROUPEMENT", "COMMISSION_DEFAUT"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT; // le défaut : automatique
  delete process.env.COMMISSION_DEFAUT; // le défaut : 0
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.PRIX_REPERES = "ardoise:pieces=1.2";
  process.env.SEUIL_VOLUME_MIN = "couverture=1000";
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
const LITEAU = "Liteaux 27×38";
const CHEVRON = "Chevrons 63×75";
const publique = () => request(ctx.app.getHttpServer());
const jour = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
const tache = (maintenant: string) => publique().get(`/v1/internal/achats-groupes?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
const artisan = (n: number, adresse = "3 rue des Ajoncs, 22300 Lannion") => couvreurAvecListe(ctx, `artisan${n}@toitures.fr`, `Toitures ${n}`, adresse, [{ libelle: A3222, quantite: "100", unite: "pièces" }]);
const engagement = (o: Record<string, unknown> = {}) => ({
  lignes: [
    { designation: A3222, quantite: 1800, unite: "pièces" },
    { designation: LITEAU, quantite: 400, unite: "m" },
  ],
  livraison: "22300 Lannion",
  dateBesoin: jour(30),
  negoces: [{ nom: "Négoce X", email: "x@negoce.fr", telephone: "02 96 00 00 01" }],
  engagement: true,
  ...o,
});
const jetonDe = (email: string) => /\/achat-groupe\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, email).filter((m) => m.subject.startsWith("Demande de prix groupée")).at(-1)!.text)![1]!;
const abonner = (companyId: string) => ctx.prisma.abonnement.create({ data: { companyId, statut: "actif", fournisseur: "simule", periodeDebut: new Date(), periodeFin: new Date(Date.now() + 30 * 86_400_000) } });
async function admin() {
  const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: A3222, quantite: "10", unite: "pièces" }]);
  await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
  return greg;
}

describe("achat groupé par métier", { timeout: 240_000 }, () => {
  it("s'engager : un achat par métier, secteur et période ; case obligatoire, lignes du catalogue, au moins un négoce ; le premier est offert, ensuite l'abonnement ; plus d'essai", async () => {
    const a = await artisan(1);
    expect((await a.agent.get("/v1/regroupement/mode").expect(200)).body).toEqual({ mode: "automatique" });
    // Point 26 : plus d'essai, ni pastille ni bandeau ; gratuit sans limite de temps.
    expect((await a.agent.get("/v1/abonnement").expect(200)).body).toMatchObject({ acces: "gratuit", joursEssai: null, bandeau: null });

    expect((await a.agent.post("/v1/achats-groupes").send(engagement({ negoces: [] })).expect(400)).body.error.details).toMatchObject({ reason: "negoce_obligatoire", message: PHRASE_NEGOCE_OBLIGATOIRE });
    expect((await a.agent.post("/v1/achats-groupes").send(engagement({ engagement: false })).expect(400)).body.error.details.reason).toBe("engagement_requis");
    expect((await a.agent.post("/v1/achats-groupes").send(engagement({ lignes: [{ designation: "Ardoise", quantite: 10, unite: "pièces" }] })).expect(400)).body.error.details.reason).toBe("reference_imprecise");
    expect((await a.agent.post("/v1/achats-groupes").send(engagement({ dateBesoin: jour(5) })).expect(400)).body.error.details.reason).toBe("date_trop_proche");

    const premier = (await a.agent.post("/v1/achats-groupes").send(engagement()).expect(201)).body;
    expect(premier).toMatchObject({ ajoute: false, rejoint: false, offert: true, phrase: PHRASE_PREMIER_OFFERT });
    expect(premier.titre).toMatch(/^Couverture · secteur Lannion · livraison avant le \d+ \S+$/);
    expect(premier.prevenir.texte).toMatch(/^Ton négoce va recevoir une grosse demande : 2 références de couverture, le \d+ \S+, de la part de Mobiiz\./);
    // Ajouter encore : la même référence s'additionne.
    const encore = (await a.agent.post("/v1/achats-groupes").send(engagement({ lignes: [{ designation: A3222, quantite: 200, unite: "pièces" }] })).expect(201)).body;
    expect(encore).toMatchObject({ besoinId: premier.besoinId, ajoute: true, offert: false });
    const mes = (await a.agent.get("/v1/achats-groupes").expect(200)).body.achats;
    expect(mes).toHaveLength(1);
    expect(mes[0]).toMatchObject({ titreAchat: premier.titre, metier: "Couverture", etat: "seul", offert: true });
    expect(mes[0].lignes.map((l: { libelle: string; quantite: number }) => [l.libelle, l.quantite])).toEqual([
      ["Ardoise 32×22 Espagne 1er choix", 2000],
      ["Liteaux 27×38", 400],
    ]);

    // Une autre période : un autre achat ; le premier était offert, il faut l'abonnement.
    const refus = (await a.agent.post("/v1/achats-groupes").send(engagement({ dateBesoin: jour(80) })).expect(402)).body.error.details;
    expect(refus).toMatchObject({ refus: "achat_groupe", phrase: PHRASE_ABONNEMENT_ACHAT });
    await abonner(a.companyId);
    expect((await a.agent.post("/v1/achats-groupes").send(engagement({ dateBesoin: jour(80) })).expect(201)).body).toMatchObject({ offert: false, phrase: null });

    // Sans SIRET vérifié : refusé ; un SIRET de commerce de gros : refusé à la vérification.
    const g = await artisan(9);
    await ctx.prisma.company.update({ where: { id: g.companyId }, data: { siret: SIRET_TEST_GROSSISTE, siretVerifieLe: null } });
    expect((await g.agent.post("/v1/achats-groupes").send(engagement()).expect(403)).body.error.details.reason).toBe("siret_requis");
    expect((await g.agent.post("/v1/groupe/siret").expect(200)).body).toMatchObject({ verifie: false, statut: "activite_refusee" });
  });

  it("le cycle : clôture (listes propres, spécialiste, généraliste), réponse ligne par ligne, validation de l'admin, publication par artisan, commander, « Commande reçue », coordonnées, commande pas passée", async () => {
    // X : spécialiste couverture inscrit ; G : généraliste inscrit du 22 (jamais choisi) ; Y : tapé par l'artisan.
    await ctx.prisma.negoce.create({ data: { nom: "Négoce X", email: "x@negoce.fr", departement: "22", familles: ["couverture"] } });
    await ctx.prisma.negoce.create({ data: { nom: "Négoce G", email: "g@negoce.fr", departement: "22", generaliste: true } });
    const a = await artisan(1);
    const b = await artisan(2, "8 rue du Port, 22500 Paimpol");
    const la = (await a.agent.post("/v1/achats-groupes").send(engagement()).expect(201)).body;
    // Point 21 : B (même métier, même secteur) est alerté, mot pour mot.
    const alerte = mailsVers(ctx, "artisan2@toitures.fr").find((m) => m.subject.startsWith("Achat groupé couverture ouvert"))!;
    expect(alerte.text).toMatch(/^Achat groupé couverture ouvert dans ton secteur, livraison avant le \d+ \S+\. Ajoute ta liste avant le \d+ \S+\./);
    const pres = (await b.agent.get("/v1/achats-groupes/pres-de-chez-moi").expect(200)).body.achats;
    expect(pres).toHaveLength(1);
    expect(JSON.stringify(pres)).not.toMatch(/Toitures 1/);
    const lb = (
      await b.agent
        .post("/v1/achats-groupes")
        .send(engagement({ achatId: pres[0].id, dateBesoin: null, livraison: "22500 Paimpol", lignes: [{ designation: A3222, quantite: 900, unite: "pièces" }, { designation: CHEVRON, quantite: 120, unite: "m" }], negoces: [{ nom: "Négoce Y", email: "y@negoce.fr" }] }))
        .expect(201)
    ).body;
    expect(lb).toMatchObject({ achatId: la.achatId, rejoint: true });
    await b.agent.get(`/v1/achats-groupes/${la.besoinId}`).expect(404);

    const achat = await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: la.achatId } });
    expect((await tache(new Date(achat.clotureLe!.getTime() + 3_600_000).toISOString())).body.consultes).toBe(1);
    const [x] = mailsVers(ctx, "x@negoce.fr");
    const [y] = mailsVers(ctx, "y@negoce.fr");
    const [gm] = mailsVers(ctx, "g@negoce.fr");
    // Le spécialiste ne reçoit que ses familles ; les quantités sont cumulées ; aucune commission à 0.
    expect(x!.subject).toMatch(/^Demande de prix groupée couverture : 2 références \(réponse avant le \d+ \S+\)$/);
    expect(x!.text).toContain("De la part de votre client Toitures 1, via Mobiiz.");
    expect(x!.text).toContain("- Ardoise 32×22 Espagne 1er choix : 2 700 pièces");
    expect(x!.text).not.toContain("Bois de charpente");
    expect(x!.text).not.toMatch(/commission/i);
    expect(y!.subject).toMatch(/^Demande de prix groupée couverture : 3 références/);
    expect(y!.text).toContain("De la part de votre client Toitures 2, via Mobiiz.");
    // Un panier de deux métiers part aussi chez le généraliste inscrit du secteur.
    expect(gm!.subject).toMatch(/3 références/);
    expect((await b.agent.post(`/v1/achats-groupes/${lb.besoinId}/retirer`).expect(409)).body.error.details.reason).toBe("cloture_passee");

    // X répond ligne par ligne : chaque ligne a un prix ou « je ne fournis pas » ; ses conditions d'ouverture.
    const page = (await publique().get(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).expect(200)).body;
    expect(page.lignes.map((l: { libelle: string; quantite: number }) => [l.libelle, l.quantite])).toEqual([
      ["Ardoise 32×22 Espagne 1er choix", 2700],
      ["Liteaux 27×38", 400],
    ]);
    expect(page.conditions.join(" ")).not.toMatch(/commission/i);
    const [cleArdoise, cleLiteau] = page.lignes.map((l: { cle: string }) => l.cle) as [string, string];
    expect((await publique().post(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).send({ accepteConditions: true, prix: { [cleArdoise]: 1.2 } }).expect(400)).body.error.details.reason).toBe("lignes_incompletes");
    await publique()
      .post(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`)
      .send({ accepteConditions: true, prix: { [cleArdoise]: 1.2, [cleLiteau]: null }, conditionsOuverture: { pieces: ["kbis", "rib"], paiement: "comptant", autre: null } })
      .expect(200);
    // Y dépose un devis PDF… sur une autre référence (30×20) : l'alerte va à l'admin.
    const pdf = Buffer.from(await makePdf(["devis"], [["A", "Ardoise naturelle 30×20 Espagne 1er choix", "2700 pièces", "0,80", "2 160,00"]], "Total HT 2 160,00", "DEVIS")).toString("base64");
    await publique().post(`/v1/public/achat-groupe/${jetonDe("y@negoce.fr")}`).send({ accepteConditions: true, pdf: { nom: "devis-y.pdf", contenuBase64: pdf } }).expect(200);

    // L'échéance : validation de l'admin (point 14), alerte e-mail.
    expect((await tache(new Date(achat.reponseAvantLe!.getTime() + 3_600_000).toISOString())).body.analyses).toBe(1);
    expect((await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: achat.id } })).statut).toBe("validation");
    expect(mailsVers(ctx, "greg@example.fr").some((m) => /^achat groupé n° \d+ à valider$/.test(m.subject))).toBe(true);
    expect((await a.agent.get(`/v1/achats-groupes/${la.besoinId}`).expect(200)).body).toMatchObject({ etat: "validation", titre: "Offres reçues, vérification en cours", resultat: null });

    const greg = await admin();
    const v = (await greg.agent.get(`/v1/admin/pilotage/achats-groupes/${achat.id}`).expect(200)).body;
    expect(v).toMatchObject({ reponses: "2 sur 3", consultes: 3 });
    const ox = v.offres.find((o: { nom: string }) => o.nom === "Négoce X");
    const oy = v.offres.find((o: { nom: string }) => o.nom === "Négoce Y");
    expect(ox).toMatchObject({ totalHt: 3240, manquantes: ["Liteaux 27×38"], ouvertureCompte: "Pour commander, ouvre un compte : Kbis de moins de 3 mois, RIB, Paiement comptant au départ." });
    expect(oy).toMatchObject({ statut: "douteuse", pdf: "devis-y.pdf", totalHt: null });
    expect(oy.alertes.join(" ")).toContain("« Ardoise naturelle 30×20 Espagne 1er choix » ne correspond à aucune ligne demandée.");
    await greg.agent.get(`/v1/admin/pilotage/achats-groupes/consultations/${oy.consultationId}/devis.pdf`).expect(200);
    // L'admin corrige les prix de Y (corrections gardées), le valide : Y, complet, passe devant.
    for (const l of oy.lignes as { cle: string; libelle: string }[]) {
      const prix = l.libelle.startsWith("Ardoise") ? 1 : l.libelle.startsWith("Liteaux") ? 0.5 : 3;
      await greg.agent.put(`/v1/admin/pilotage/achats-groupes/consultations/${oy.consultationId}/prix`).send({ cle: l.cle, prixHt: prix }).expect(200);
    }
    const apres = (await greg.agent.post(`/v1/admin/pilotage/achats-groupes/consultations/${oy.consultationId}/valider`).expect(200)).body;
    expect(apres).toMatchObject({ proposeeId: oy.consultationId, corrections: 4 });
    expect(await ctx.prisma.correctionOffreAchatGroupe.count({ where: { regroupementId: achat.id, action: "prix" } })).toBe(3);
    // Le généraliste n'a pas répondu ; l'admin l'écarte (correction), puis publie.
    const og = v.offres.find((o: { nom: string }) => o.nom === "Négoce G");
    await greg.agent.post(`/v1/admin/pilotage/achats-groupes/consultations/${og.consultationId}/ecarter`).expect(404);
    await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${achat.id}/publier`).expect(200);

    // Point 17 : A est comparé sur SES lignes, livraison comprise (Y complet 2 000 €, son négoce X 2 160 € incomplet).
    const pub = mailsVers(ctx, "artisan1@toitures.fr").find((m) => m.subject.startsWith("Résultats de ton achat groupé"))!;
    expect(pub.text).toContain("Ta liste chez le meilleur négoce : 2 000,00 € HT au lieu de 2 160,00 € HT, livraison comprise.");
    const vueA = (await a.agent.get(`/v1/achats-groupes/${la.besoinId}`).expect(200)).body;
    expect(vueA).toMatchObject({ etat: "offre", actions: { commander: true, sortir: true } });
    expect(vueA.resultat.meilleure).toMatchObject({ nom: "Négoce Y", totalHt: 2000, complete: true, habituel: false, ouvertureCompte: "Pour commander, ouvre un compte chez ce négoce." });
    expect(vueA.resultat.monNegoce).toMatchObject({ nom: "Négoce X", totalHt: 2160, manquantes: "1 ligne non chiffrée chez ce négoce", ouvertureCompte: null });

    // Point 19 : pas de compte chez Y : ses coordonnées, avec son accord.
    await a.agent.post(`/v1/achats-groupes/${la.besoinId}/coordonnees`).send({ consultationId: oy.consultationId, consentement: false }).expect(400);
    await a.agent.post(`/v1/achats-groupes/${la.besoinId}/coordonnees`).send({ consultationId: oy.consultationId, consentement: true }).expect(200);
    const coord = mailsVers(ctx, "y@negoce.fr").find((m) => m.subject.startsWith("Ouverture de compte"))!;
    expect(coord.subject).toBe("Ouverture de compte : Toitures 1, de la part de Mobiiz");
    expect(coord.text).toMatch(/SIRET : \d{14}/);
    expect(coord.text).toContain("Merci de le rappeler « de la part de Mobiiz ».");

    // Point 18 : « Commander » : le bon chez Y, qui confirme « Commande reçue ».
    const cmd = (await a.agent.post(`/v1/achats-groupes/${la.besoinId}/commander`).send({ consultationId: oy.consultationId }).expect(200)).body;
    expect(cmd).toMatchObject({ negoce: "Négoce Y", totalHt: 2000, nonChiffrees: 0 });
    const bon = mailsVers(ctx, "y@negoce.fr").find((m) => m.subject.startsWith("Bon de commande"))!;
    expect(bon.attachments?.[0]?.contentType).toBe("application/pdf");
    const jetonBon = /\/achat-groupe\/commande\/([A-Za-z0-9_-]+)/.exec(bon.text)![1]!;
    expect((await publique().post(`/v1/public/achat-groupe/commande/${jetonBon}`).expect(200)).body).toMatchObject({ recue: true, client: "Toitures 1" });
    expect((await a.agent.get(`/v1/achats-groupes/${la.besoinId}`).expect(200)).body).toMatchObject({ commandeRecue: true, actions: { livre: true } });
    await a.agent.post(`/v1/achats-groupes/${la.besoinId}/livre`).send({}).expect(200);
    await a.agent.get(`/v1/achats-groupes/${la.besoinId}/bon.pdf`).expect(200);
    // Point 20 : les prix vont dans « Mes prix ».
    const prix = (await a.agent.get("/v1/mes-prix").expect(200)).body.articles;
    expect(prix.some((p: { dernier: { prixHt: number } }) => p.dernier.prixHt === 0.5)).toBe(true);

    // B ne commande pas avant la date : commande pas passée, sans motif → exclusion de 3 mois (point 8).
    const publie = await ctx.prisma.regroupementNegocie.findUniqueOrThrow({ where: { id: achat.id } });
    expect((await tache(new Date(publie.commandeAvantLe!.getTime() + 3_600_000).toISOString())).body.nonCommandes).toBe(1);
    expect((await b.agent.get(`/v1/achats-groupes/${lb.besoinId}`).expect(200)).body).toMatchObject({ etat: "non_commande" });
    const exclu = (await b.agent.post("/v1/achats-groupes").send(engagement({ livraison: "22500 Paimpol", dateBesoin: jour(80) })).expect(403)).body.error.details;
    expect(exclu.reason).toBe("exclu");
    expect(exclu.message).toMatch(/^Tu ne peux pas rejoindre d'achat groupé avant le \d+ \S+ \(règle des sorties\)\.$/);

    // L'admin : suivi de l'achat publié, IA suivie sans correction, sorties, exclus ; rien à facturer à 0 %.
    const adm = (await greg.agent.get("/v1/admin/pilotage/achats-groupes").expect(200)).body;
    expect(adm.achats.find((x: { id: string }) => x.id === achat.id).suivi).toMatchObject({ vus: 2, commandes: 1, participants: 2, sortis: 0 });
    expect(adm.iaSuivie).toEqual({ publies: 1, sansCorrection: 0, part: 0 });
    expect(adm.desistements[0]).toMatchObject({ entreprise: "Toitures 2", motif: "Commande pas passée, sans motif" });
    expect(adm.exclus.map((e: { entreprise: string }) => e.entreprise)).toEqual(["Toitures 2"]);
    const premierDuMois = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1, 10, 15)).toISOString();
    expect((await tache(premierDuMois)).body.factures).toBe(0);
  });

  it("les deux sorties, en un clic avec le motif ; avant la clôture, retirer ne compte pas ; deux sorties en un trimestre : exclusion", async () => {
    const a = await artisan(1);
    await abonner(a.companyId);
    const greg = await admin();
    const l1 = (await a.agent.post("/v1/achats-groupes").send(engagement()).expect(201)).body;
    // Avant la clôture : « Sortir » n'existe pas encore, « Retirer ma liste » est libre.
    await a.agent.post(`/v1/achats-groupes/${l1.besoinId}/sortir`).send({ motif: "chantier_annule" }).expect(409);
    await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l1.achatId}/avancer`).send({ etape: "cloture" }).expect(200);
    await a.agent.post(`/v1/achats-groupes/${l1.besoinId}/sortir`).send({ motif: "autre" }).expect(400);
    expect((await a.agent.post(`/v1/achats-groupes/${l1.besoinId}/sortir`).send({ motif: "chantier_annule" }).expect(200)).body).toEqual({ fait: true, exclusion: null });
    expect((await a.agent.get(`/v1/achats-groupes/${l1.besoinId}`).expect(200)).body).toMatchObject({ etat: "sorti", titre: "Tu es sorti de cet achat groupé" });

    const l2 = (await a.agent.post("/v1/achats-groupes").send(engagement({ dateBesoin: jour(80) })).expect(201)).body;
    const l3 = (await a.agent.post("/v1/achats-groupes").send(engagement({ dateBesoin: jour(140) })).expect(201)).body;
    await a.agent.post(`/v1/achats-groupes/${l3.besoinId}/retirer`).expect(200);
    await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l2.achatId}/avancer`).send({ etape: "cloture" }).expect(200);
    const deuxieme = (await a.agent.post(`/v1/achats-groupes/${l2.besoinId}/sortir`).send({ motif: "aucune_offre_livrable" }).expect(200)).body;
    expect(deuxieme.exclusion).toMatch(/^Tu ne peux pas rejoindre d'achat groupé avant le /);
    expect((await a.agent.post("/v1/achats-groupes").send(engagement({ dateBesoin: jour(200) })).expect(403)).body.error.details.reason).toBe("exclu");
    const adm = (await greg.agent.get("/v1/admin/pilotage/achats-groupes").expect(200)).body;
    expect(adm.desistements.map((d: { motif: string }) => d.motif).sort()).toEqual(["Aucune offre livrable dans les délais", "Mon client a annulé le chantier", "Retiré avant la clôture"]);
  });

  it("depuis une liste : la question de rattachement, la suggestion des grosses quantités, l'engagement ; 3 lectures IA en tout", async () => {
    const c = await couvreurAvecListe(ctx, "artisan3@toitures.fr", "Toitures 3", "3 rue des Ajoncs, 22300 Lannion", [
      { libelle: A3222, quantite: "1200", unite: "pièces" },
      { libelle: "Crochet inox 100 mm", quantite: "1300", unite: "pièces" },
    ]);
    const d = (await c.agent.get(`/v1/projects/${c.projectId}/achat-groupe`).expect(200)).body;
    expect(d.lignes.map((x: { question: string | null }) => x.question)).toEqual(["C'est bien de l'ardoise 32×22 Espagne 1er choix ?", null]);
    expect(d.suggestion.phrase).toBe("Tu as 1 200 pièces de ardoise 32×22 Espagne 1er choix, mets-les en achat groupé pour payer moins cher.");
    expect(d.suggestion.keys).toEqual([d.lignes[0].key]);
    expect(d.droit).toEqual({ ok: true, offert: true, phrase: PHRASE_PREMIER_OFFERT });
    expect(d.engagement.phrase).toBe("Je commande ces quantités, chez le moins cher entre la meilleure offre du groupe et mon négoce habituel.");
    const corps = { confirmees: d.lignes.map((x: { key: string }) => x.key), dateBesoin: jour(30), negoces: [{ nom: "Négoce X", email: "x@negoce.fr" }] };
    await c.agent.post(`/v1/projects/${c.projectId}/achat-groupe`).send({ ...corps, engagement: false }).expect(400);
    const r = (await c.agent.post(`/v1/projects/${c.projectId}/achat-groupe`).send({ ...corps, engagement: true }).expect(201)).body;
    expect(r.lancees).toHaveLength(1);
    expect(r.perso).toHaveLength(1);
    expect(r.offert).toBe(true);

    // Point 24 : trois lectures IA offertes en tout (pas par mois), puis la phrase de `TARIFS.paywallListes`.
    for (const mois of ["2026-07", "2026-08", "2026-09"])
      await ctx.prisma.aiAnalysis.create({ data: { companyId: c.companyId, projectId: c.projectId, documentId: randomUUID(), kind: "client_quote", status: "completed", billable: true, billingMonth: mois } });
    const meter = ctx.app.get(AnalysisMeter);
    await expect(meter.begin({ companyId: c.companyId, userId: null, projectId: c.projectId, documentId: randomUUID(), kind: "client_quote" })).rejects.toMatchObject({ details: { refus: "lectures", phrase: PHRASE_LECTURES_EPUISEES } });
    await abonner(c.companyId);
    expect((await meter.begin({ companyId: c.companyId, userId: null, projectId: c.projectId, documentId: randomUUID(), kind: "client_quote" })).status).toBe("go");
  });

  it("recette en prévisualisation : l'admin clôture, analyse et publie tout de suite (refusé aux autres)", async () => {
    const a = await artisan(1);
    const l = (await a.agent.post("/v1/achats-groupes").send(engagement()).expect(201)).body;
    await a.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/avancer`).send({ etape: "cloture" }).expect(403);
    const greg = await admin();
    expect((await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/avancer`).send({ etape: "cloture" }).expect(200)).body).toEqual({ statut: "consultation" });
    const page = (await publique().get(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`).expect(200)).body;
    await publique()
      .post(`/v1/public/achat-groupe/${jetonDe("x@negoce.fr")}`)
      .send({ accepteConditions: true, prix: Object.fromEntries(page.lignes.map((x: { cle: string }) => [x.cle, 1.15])) })
      .expect(200);
    expect((await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/avancer`).send({ etape: "echeance" }).expect(200)).body).toMatchObject({ statut: "validation", douteuses: 0 });
    await greg.agent.post(`/v1/admin/pilotage/achats-groupes/${l.achatId}/publier`).expect(200);
    expect((await greg.agent.get("/v1/admin/pilotage/achats-groupes").expect(200)).body.iaSuivie).toEqual({ publies: 1, sansCorrection: 1, part: 100 });
    expect((await a.agent.get(`/v1/achats-groupes/${l.besoinId}`).expect(200)).body.resultat.phrase).toBe("Ta liste chez le meilleur négoce : 2 530,00 € HT, livraison comprise.");
  });

  it("le catalogue guidé (Greg, 27 octobre, captures iPhone) : l'arbre par métier, le sien d'abord ; un électricien n'a pas de catalogue et l'écran le dit", async () => {
    const couvreur = await signUpWithCompany(ctx.app, "cat-couvreur@example.fr", "Toitures Cat", ["roofing"]);
    const c = (await couvreur.agent.get("/v1/achats-groupes/catalogue").expect(200)).body;
    expect(c.familles[0]).toEqual({ famille: "couverture", libelle: "Couverture", mienne: true });
    expect(c.familles.filter((f: { mienne: boolean }) => f.mienne).map((f: { famille: string }) => f.famille)).toEqual(["couverture"]);
    expect(c.arbre.couverture.map((n: { libelle: string }) => n.libelle)).toEqual(["Ardoise", "Zinc", "Liteaux", "Voliges"]);
    expect(c.arbre.couverture[0].enfants[0].enfants[0]).toMatchObject({ libelle: "Espagne 1er choix", reference: { designation: A3222, unite: "pièces" } });
    expect(c.monMetier).toEqual({ libelle: "Couverture", catalogue: true });
    const electricien = await signUpWithCompany(ctx.app, "cat-elec@example.fr", "Élec Cat", ["electrical"]);
    const e = (await electricien.agent.get("/v1/achats-groupes/catalogue").expect(200)).body;
    expect(e.familles.every((f: { mienne: boolean }) => !f.mienne)).toBe(true);
    expect(e.monMetier).toEqual({ libelle: "Électricité", catalogue: false });
  });
});
