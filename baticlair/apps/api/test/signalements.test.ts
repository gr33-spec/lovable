import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { pageSure } from "../src/modules/signalements/signalements.service.js";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * SIGNALEMENT DE BUGS (Greg, 13 novembre 2026) : « Bouton « Signaler un problème » partout dans l'appli et côté négoce,
 * avec capture d'écran et page concernée jointes automatiquement. Accusé de réception automatique immédiat à l'utilisateur
 * (« Merci, on regarde »). Alerte e-mail à moi avec le résumé de l'agent reparateur et un lien pour valider la correction.
 * Une fois corrigé et déployé, mail automatique à l'utilisateur (« C'est corrigé, merci »). Liste des signalements dans
 * l'espace admin (statut : nouveau, en cours, corrigé). » Aucun e-mail réel : ils sont capturés.
 */
let ctx: TestContext;
const VARS = ["GROUPE", "GROUPE_ADMINS", "ALERT_EMAIL"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  delete process.env.ALERT_EMAIL; // sans adresse d'alerte, le premier admin reçoit
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
// Un PNG d'un pixel : la capture d'écran jointe.
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const publique = () => request(ctx.app.getHttpServer());
async function admin() {
  const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", LIGNES);
  await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
  return greg;
}

describe("signaler un problème", { timeout: 120_000 }, () => {
  it("un artisan connecté : page et capture jointes, accusé de réception immédiat, alerte à Greg avec le lien de l'espace admin", async () => {
    const a = await couvreurAvecListe(ctx, "artisan@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    ctx.emails.sent.length = 0;
    const r = (await a.agent.post("/v1/signalements").send({ message: "Le bouton Envoyer ne répond pas.", page: "/chantiers/0190a1b2-0000-7000-8000-000000000001?vue=fournitures", contexte: "iPhone, 375×667", capture: PIXEL }).expect(201)).body;
    expect(r.accuse).toBe(true);
    const s = await ctx.prisma.signalement.findUniqueOrThrow({ where: { id: r.id } });
    // La page : le chemin seul, sans paramètre ni identifiant ; l'e-mail est celui du compte, jamais saisi.
    expect(s).toMatchObject({ statut: "nouveau", origine: "artisan", page: "/chantiers/:id", email: "artisan@toitures.fr", captureType: "image/png", contexte: "iPhone, 375×667" });
    expect(s.capture?.length).toBeGreaterThan(20);
    const accuse = mailsVers(ctx, "artisan@toitures.fr");
    expect(accuse).toHaveLength(1);
    expect(accuse[0]!.subject).toBe("Merci, on regarde");
    expect(accuse[0]!.text).toContain("Le bouton Envoyer ne répond pas.");
    const alerte = mailsVers(ctx, "greg@example.fr").find((m) => m.subject.startsWith("Nouveau signalement"))!;
    expect(alerte.subject).toBe("Nouveau signalement : /chantiers/:id");
    expect(alerte.text).toContain(`/admin/signalements?id=${r.id}`);
    expect(alerte.text).toContain("rien n'est corrigé sans ton accord");
  });

  it("côté négoce, sans compte : l'e-mail écrit reçoit l'accusé ; le jeton du lien n'est jamais gardé ; sans e-mail, le signalement arrive quand même", async () => {
    const r = (await publique().post("/v1/public/signalements").send({ message: "Je ne peux pas déposer mon PDF.", page: "/negoce/chiffrer/AbCdEfGhIjKlMnOpQrStUvWxYz012345?x=1", email: "Vendeur@Negoce.fr", origine: "negoce" }).expect(201)).body;
    const s = await ctx.prisma.signalement.findUniqueOrThrow({ where: { id: r.id } });
    expect(s).toMatchObject({ origine: "negoce", page: "/negoce/chiffrer/:jeton", email: "vendeur@negoce.fr", companyId: null, capture: null });
    expect(mailsVers(ctx, "vendeur@negoce.fr").map((m) => m.subject)).toEqual(["Merci, on regarde"]);
    const sans = (await publique().post("/v1/public/signalements").send({ message: "Page blanche.", page: "/tarifs" }).expect(201)).body;
    expect(sans.accuse).toBe(false);
    // Refus clairs : message vide, capture qui n'est pas une image.
    await publique().post("/v1/public/signalements").send({ message: "", page: "/tarifs" }).expect(400);
    const faux = await publique().post("/v1/public/signalements").send({ message: "Capture bizarre", page: "/tarifs", capture: "data:text/html;base64,PGI+" });
    expect(faux.status).toBe(400);
    expect(faux.body.error.details.reason).toBe("capture_invalide");
    expect(pageSure("/achats-groupes/0190a1b2-0000-7000-8000-000000000001/offre#x")).toBe("/achats-groupes/:id/offre");
  });

  it("l'espace admin : la liste par statut, la capture, le résumé du réparateur (e-mail à Greg avec le lien pour valider), la validation, puis « C'est corrigé, merci » une seule fois", async () => {
    const a = await couvreurAvecListe(ctx, "artisan@toitures.fr", "Toitures A", "3 rue des Ajoncs, 22300 Lannion", LIGNES);
    const { id } = (await a.agent.post("/v1/signalements").send({ message: "La quantité saute quand je valide.", page: "/chantiers/nouveau", capture: PIXEL }).expect(201)).body;
    // Réservé aux admins : un artisan ne voit ni la liste, ni la capture, et ne change rien.
    await a.agent.get("/v1/admin/signalements").expect(403);
    await a.agent.get(`/v1/admin/signalements/${id}/capture`).expect(403);
    await a.agent.put(`/v1/admin/signalements/${id}`).send({ statut: "corrige" }).expect(403);
    const greg = await admin();
    const liste = (await greg.agent.get("/v1/admin/signalements").expect(200)).body;
    expect(liste.comptes).toEqual({ nouveau: 1, en_cours: 0, corrige: 0 });
    expect(liste.signalements[0]).toMatchObject({ id, statut: "nouveau", page: "/chantiers/nouveau", email: "artisan@toitures.fr", capture: true });
    const image = await greg.agent.get(`/v1/admin/signalements/${id}/capture`).expect(200);
    expect(image.headers["content-type"]).toBe("image/png");
    // Le réparateur écrit son résumé : le signalement passe « en cours », Greg reçoit l'e-mail et le lien pour valider.
    ctx.emails.sent.length = 0;
    await greg.agent.put(`/v1/admin/signalements/${id}`).send({ resume: "La quantité est remise à zéro au second appui. Cause : double envoi. Correction proposée : désactiver le bouton pendant l'envoi.", gravite: "genant" }).expect(200);
    const analyse = mailsVers(ctx, "greg@example.fr").find((m) => m.subject.startsWith("Signalement analysé"))!;
    expect(analyse.subject).toBe("Signalement analysé (Gênant) : /chantiers/nouveau");
    expect(analyse.text).toContain("double envoi");
    expect(analyse.text).toContain(`Valider la correction : `);
    expect(analyse.text).toContain(`/admin/signalements?id=${id}`);
    expect((await greg.agent.get("/v1/admin/signalements?statut=en_cours").expect(200)).body.signalements).toHaveLength(1);
    // Rien n'est « corrigé » sans l'accord de Greg.
    const refus = await greg.agent.put(`/v1/admin/signalements/${id}`).send({ statut: "corrige" });
    expect(refus.status).toBe(400);
    expect(refus.body.error.details.reason).toBe("correction_non_validee");
    expect(mailsVers(ctx, "artisan@toitures.fr")).toHaveLength(0);
    await greg.agent.put(`/v1/admin/signalements/${id}`).send({ validerLaCorrection: true }).expect(200);
    // Corrigé et déployé : l'utilisateur est prévenu, une seule fois même si le geste est rejoué.
    const fait = (await greg.agent.put(`/v1/admin/signalements/${id}`).send({ statut: "corrige" }).expect(200)).body;
    expect(fait).toMatchObject({ statut: "corrige", mailCorrige: true });
    expect((await greg.agent.put(`/v1/admin/signalements/${id}`).send({ statut: "corrige" }).expect(200)).body.mailCorrige).toBe(false);
    const corrige = mailsVers(ctx, "artisan@toitures.fr");
    expect(corrige.map((m) => m.subject)).toEqual(["C'est corrigé, merci"]);
    expect(corrige[0]!.text).toContain("La quantité saute quand je valide.");
    expect((await greg.agent.get("/v1/admin/signalements").expect(200)).body.comptes).toEqual({ nouveau: 0, en_cours: 0, corrige: 1 });
    // Chaque geste de l'admin est au journal.
    const journal = await ctx.prisma.journalAdmin.findMany({ where: { action: { startsWith: "signalement:" } } });
    expect(journal.map((j) => j.action)).toEqual(expect.arrayContaining(["signalement:suivi", "signalement:correction validée", "signalement:corrige"]));
    await greg.agent.put("/v1/admin/signalements/0190a1b2-0000-7000-8000-000000000009").send({ statut: "en_cours" }).expect(404);
  });
});
