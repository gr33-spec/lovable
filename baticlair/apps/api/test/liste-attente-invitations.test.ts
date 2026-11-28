import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * CHANTIER 05 (Greg, 28 novembre 2026) : LISTE D'ATTENTE PAR MÉTIER ET DÉPARTEMENT, ET INVITATIONS.
 * - un artisan d'un métier ou d'un département pas encore ouvert s'inscrit sur un choix explicite, voit qu'il est sur la
 *   liste (« On t'écrit dès que Mobiiz ouvre pour les plaquistes du 22 »), sans doublon, et se désinscrit en un clic ;
 * - « Prévenir les inscrits » : l'admin voit combien seront prévenus et l'e-mail, confirme ce nombre ; chaque inscrit
 *   n'est prévenu qu'une fois, par petits lots, avec un journal ; jamais un désinscrit, jamais un autre métier ni un autre
 *   département ;
 * - le lien d'invitation est suivi de bout en bout (qui a invité qui), sans récompense ;
 * - aucune adresse d'un artisan chez un autre.
 */
let ctx: TestContext;
const VARS = ["GROUPE_ADMINS"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  process.env.GROUPE_ADMINS = "greg@example.fr";
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
  ctx.emails.failNext = 0;
});

const publicAgent = () => request(ctx.app.getHttpServer());

/** Un artisan avec son compte et son entreprise (métier, département de la carte). */
async function artisan(email: string, metier: string, departement: string) {
  const agent = await signUp(ctx.app, email);
  const c = (await agent.post("/v1/companies").send({ name: `Entreprise ${email}`, trades: [metier], departement }).expect(201)).body as { id: string };
  return { agent, companyId: c.id };
}

async function admin() {
  const greg = await artisan("greg@example.fr", "roofing", "22");
  await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
  return greg.agent;
}

const annoncesEnvoyees = () => ctx.emails.sent.filter((m) => /^Mobiiz ouvre pour/.test(m.subject));

describe("chantier 05 : la liste d'attente", { timeout: 120_000 }, () => {
  it("un plaquiste du 22 voit qu'il n'est pas encore ouvert ; il s'inscrit seulement en cochant ; il voit qu'il est sur la liste", async () => {
    const p = await artisan("placo@exemple.fr", "drywall", "22");
    const e0 = (await p.agent.get("/v1/communaute").expect(200)).body;
    expect(e0.attente).toMatchObject({ metier: "drywall", departement: { code: "22", nom: "Côtes-d'Armor" }, ouvert: false, inscrit: false });
    expect(e0.attente.question).toBe("Tu veux qu'on t'écrive quand Mobiiz ouvre pour les plaquistes du 22 ?");
    expect(e0.attente.disponibilite).not.toMatch(/\d{4}|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre/);

    // Jamais sans le choix explicite.
    await p.agent.post("/v1/communaute/liste-attente").send({}).expect(400);
    await p.agent.post("/v1/communaute/liste-attente").send({ consentement: false }).expect(400);
    expect(await ctx.prisma.listeAttenteMetier.count()).toBe(0);

    const e1 = (await p.agent.post("/v1/communaute/liste-attente").send({ consentement: true }).expect(201)).body;
    expect(e1.attente.inscrit).toBe(true);
    expect(e1.attente.phrase).toBe("On t'écrit dès que Mobiiz ouvre pour les plaquistes du 22.");
    const ligne = await ctx.prisma.listeAttenteMetier.findFirstOrThrow();
    expect(ligne).toMatchObject({ email: "placo@exemple.fr", metier: "drywall", departement: "22", companyId: p.companyId, consentementVersion: "2026-11-28", desinscritLe: null, prevenuLe: null });
    expect(ligne.consentementLe).toBeInstanceOf(Date);
    // S'inscrire n'envoie rien (hors l'e-mail de validation du compte, envoyé à la création).
    expect(ctx.emails.sent.filter((m) => !m.compte)).toHaveLength(0);
  });

  it("un couvreur du 22 est déjà ouvert : pas de liste d'attente ; un couvreur du Finistère, si", async () => {
    const c22 = await artisan("c22@exemple.fr", "roofing", "22");
    expect((await c22.agent.get("/v1/communaute").expect(200)).body.attente.ouvert).toBe(true);
    await c22.agent.post("/v1/communaute/liste-attente").send({ consentement: true }).expect(409);
    const c29 = await artisan("c29@exemple.fr", "roofing", "29");
    const e = (await c29.agent.get("/v1/communaute").expect(200)).body.attente;
    expect(e.ouvert).toBe(false);
    expect(e.question).toContain("les couvreurs du 29");
  });

  it("pas de doublon : deux inscriptions et la liste publique avec la même adresse font une seule ligne", async () => {
    const p = await artisan("placo@exemple.fr", "drywall", "22");
    await p.agent.post("/v1/communaute/liste-attente").send({ consentement: true }).expect(201);
    await p.agent.post("/v1/communaute/liste-attente").send({ consentement: true }).expect(201);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "PLACO@exemple.fr", metier: "drywall", departement: "22", consentement: true }).expect(204);
    expect(await ctx.prisma.listeAttenteMetier.count()).toBe(1);
    expect((await ctx.prisma.listeAttenteMetier.findFirstOrThrow()).companyId).toBe(p.companyId);
  });

  it("désinscription en un clic : depuis l'appli, ou par le lien de l'e-mail ; un jeton inconnu ne change rien", async () => {
    const p = await artisan("placo@exemple.fr", "drywall", "22");
    await p.agent.post("/v1/communaute/liste-attente").send({ consentement: true }).expect(201);
    const sortie = (await p.agent.delete("/v1/communaute/liste-attente").expect(200)).body;
    expect(sortie.attente.inscrit).toBe(false);
    expect((await ctx.prisma.listeAttenteMetier.findFirstOrThrow()).desinscritLe).toBeInstanceOf(Date);

    // Un nouveau choix explicite le réinscrit (jamais sans).
    await p.agent.post("/v1/communaute/liste-attente").send({ consentement: true }).expect(201);
    const { jeton } = await ctx.prisma.listeAttenteMetier.findFirstOrThrow();

    await publicAgent().post("/v1/public/liste-attente/desinscription").send({ jeton: "00000000-0000-4000-8000-000000000000" }).expect(204);
    await publicAgent().post("/v1/public/liste-attente/desinscription").send({ jeton: "pas-un-jeton" }).expect(204);
    expect((await ctx.prisma.listeAttenteMetier.findFirstOrThrow()).desinscritLe).toBeNull();

    await publicAgent().post("/v1/public/liste-attente/desinscription").send({ jeton }).expect(204);
    await publicAgent().post("/v1/public/liste-attente/desinscription").send({ jeton }).expect(204);
    expect((await ctx.prisma.listeAttenteMetier.findFirstOrThrow()).desinscritLe).toBeInstanceOf(Date);
    expect((await p.agent.get("/v1/communaute").expect(200)).body.attente.inscrit).toBe(false);
  });
});

describe("chantier 05 : prévenir les inscrits", { timeout: 180_000 }, () => {
  it("l'aperçu compte les bonnes personnes ; la confirmation porte sur ce nombre ; chacun est prévenu une fois, seul destinataire de son e-mail", async () => {
    const a = await artisan("placo-a@exemple.fr", "drywall", "22");
    const b = await artisan("placo-b@exemple.fr", "drywall", "22");
    const c29 = await artisan("placo-29@exemple.fr", "drywall", "29");
    const parti = await artisan("placo-parti@exemple.fr", "drywall", "22");
    const elec = await artisan("elec@exemple.fr", "electrical", "22");
    const sansChoix = await artisan("placo-muet@exemple.fr", "drywall", "22");
    for (const x of [a, b, c29, parti, elec]) await x.agent.post("/v1/communaute/liste-attente").send({ consentement: true }).expect(201);
    await parti.agent.delete("/v1/communaute/liste-attente").expect(200);
    // L'ancienne liste publique (sans compte) : l'adresse laissée exprès pour être prévenu.
    await publicAgent().post("/v1/public/liste-attente").send({ email: "ancien@exemple.fr", metier: "drywall", departement: "22" }).expect(204);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "sans-dep@exemple.fr", metier: "drywall" }).expect(204);

    const greg = await admin();
    // Un artisan n'a jamais accès à l'admin ; sans session, non plus.
    await a.agent.get("/v1/admin/annonces/apercu").query({ metier: "drywall", departements: "22" }).expect(403);
    await a.agent.post("/v1/admin/annonces").send({ metier: "drywall", departements: ["22"], nombre: 3 }).expect(403);
    await publicAgent().get("/v1/admin/annonces").expect(401);

    const ap = (await greg.get("/v1/admin/annonces/apercu").query({ metier: "drywall", departements: "22" }).expect(200)).body;
    expect(ap).toMatchObject({ nombre: 3, desinscrits: 1, dejaPrevenus: 0, sansDepartement: 1, sujet: "Mobiiz ouvre pour les plaquistes du 22" });
    expect(ap.texte).toContain("les plaquistes du 22 (Côtes-d'Armor)");
    expect(ap.texte).toMatch(/Ne plus recevoir ces e-mails : /);
    expect(ap.parDepartement).toEqual([
      { code: "22", nom: "Côtes-d'Armor", nombre: 3 },
      { code: "29", nom: "Finistère", nombre: 1 },
    ]);
    // L'aperçu n'envoie rien.
    expect(annoncesEnvoyees()).toHaveLength(0);

    // Un nombre qui n'est plus celui de l'aperçu : on refait l'aperçu.
    expect((await greg.post("/v1/admin/annonces").send({ metier: "drywall", departements: ["22"], nombre: 4 }).expect(409)).body.error.details).toMatchObject({ reason: "nombre_change", nombre: 3 });
    const an = (await greg.post("/v1/admin/annonces").send({ metier: "drywall", departements: ["22"], nombre: 3 }).expect(201)).body;
    expect(an.total).toBe(3);
    expect(await ctx.prisma.journalAdmin.count({ where: { action: "annonce_ouverture" } })).toBe(1);

    const lot = (await greg.post(`/v1/admin/annonces/${an.id}/lot`).expect(201)).body;
    expect(lot).toEqual({ envoyes: 3, echecs: 0, annules: 0, restants: 0 });
    const mails = annoncesEnvoyees();
    expect(mails.map((m) => m.to).sort()).toEqual(["ancien@exemple.fr", "placo-a@exemple.fr", "placo-b@exemple.fr"]);
    // Aucune fuite : chaque e-mail a UN destinataire et ne contient aucune autre adresse ni le jeton d'un autre.
    const lignes = await ctx.prisma.listeAttenteMetier.findMany();
    for (const m of mails) {
      expect(m.to).not.toMatch(/,|;/);
      for (const l of lignes.filter((x) => x.email !== m.to)) {
        expect(m.text).not.toContain(l.email);
        expect(m.text).not.toContain(l.jeton);
      }
      expect(m.text).toContain(lignes.find((x) => x.email === m.to)!.jeton);
    }
    // Celui qui a un compte : « connecte-toi » ; l'ancienne liste : « pour commencer ».
    expect(mails.find((m) => m.to === "placo-a@exemple.fr")!.text).toContain("/connexion");
    expect(mails.find((m) => m.to === "ancien@exemple.fr")!.text).toContain("/commencer");
    // Jamais : le désinscrit, l'autre département, l'autre métier, celui qui n'a rien coché, celui sans département.
    for (const absent of ["placo-parti@exemple.fr", "placo-29@exemple.fr", "elec@exemple.fr", "placo-muet@exemple.fr", "sans-dep@exemple.fr"]) expect(mails.some((m) => m.to === absent)).toBe(false);

    // Une seule fois : un deuxième lot, une deuxième annonce n'envoient plus rien à ces trois-là.
    expect((await greg.post(`/v1/admin/annonces/${an.id}/lot`).expect(201)).body.envoyes).toBe(0);
    expect((await greg.get("/v1/admin/annonces/apercu").query({ metier: "drywall", departements: "22" }).expect(200)).body).toMatchObject({ nombre: 0, dejaPrevenus: 3 });
    expect(annoncesEnvoyees()).toHaveLength(3);

    // L'ouverture est faite : le plaquiste du 22 n'est plus « en attente » ; celui du 29, toujours.
    expect((await a.agent.get("/v1/communaute").expect(200)).body.attente).toMatchObject({ ouvert: true, prevenu: true });
    expect((await sansChoix.agent.get("/v1/communaute").expect(200)).body.attente.ouvert).toBe(true);
    expect((await c29.agent.get("/v1/communaute").expect(200)).body.attente.ouvert).toBe(false);

    // Le journal : ce qui est parti, adresses masquées.
    const liste = (await greg.get("/v1/admin/annonces").expect(200)).body.annonces;
    expect(liste[0]).toMatchObject({ metier: "drywall", public: "les plaquistes du 22", total: 3, envoyes: 3, aEnvoyer: 0, echecs: 0 });
    expect(liste[0].termineeLe).not.toBeNull();
    const j = (await greg.get(`/v1/admin/annonces/${an.id}/journal`).expect(200)).body.envois;
    expect(j).toHaveLength(3);
    expect(JSON.stringify(j)).not.toContain("placo-a@exemple.fr");
    expect(j.every((e: { statut: string; destinataire: string }) => e.statut === "envoye" && e.destinataire.includes("•••@"))).toBe(true);
  });

  it("par petits lots de 20 ; deux lots lancés en même temps n'envoient jamais deux fois le même e-mail ; un échec se réessaie", async () => {
    for (let i = 0; i < 25; i++) await publicAgent().post("/v1/public/liste-attente").send({ email: `peintre${i}@exemple.fr`, metier: "painting", departement: "35", consentement: true }).expect(204);
    const greg = await admin();
    const an = (await greg.post("/v1/admin/annonces").send({ metier: "painting", departements: ["35"], nombre: 25 }).expect(201)).body;

    ctx.emails.failNext = 1;
    const [l1, l2] = await Promise.all([greg.post(`/v1/admin/annonces/${an.id}/lot`).expect(201), greg.post(`/v1/admin/annonces/${an.id}/lot`).expect(201)]);
    const envoyes = l1.body.envoyes + l2.body.envoyes;
    expect(l1.body.envoyes + l1.body.echecs).toBeLessThanOrEqual(20);
    let suite = (await greg.post(`/v1/admin/annonces/${an.id}/lot`).expect(201)).body;
    expect(envoyes + suite.envoyes).toBe(24);
    expect(suite.restants).toBe(0);
    const tos = annoncesEnvoyees().map((m) => m.to);
    expect(new Set(tos).size).toBe(tos.length);

    // L'échec n'a jamais été reçu : il peut repartir, une fois.
    expect((await greg.post(`/v1/admin/annonces/${an.id}/echecs`).expect(201)).body.relances).toBe(1);
    suite = (await greg.post(`/v1/admin/annonces/${an.id}/lot`).expect(201)).body;
    expect(suite).toMatchObject({ envoyes: 1, restants: 0 });
    const tous = annoncesEnvoyees().map((m) => m.to);
    expect(tous).toHaveLength(25);
    expect(new Set(tous).size).toBe(25);
  });

  it("un inscrit qui se désinscrit entre la confirmation et l'envoi n'est pas prévenu", async () => {
    await publicAgent().post("/v1/public/liste-attente").send({ email: "change@exemple.fr", metier: "tiling", departement: "56", consentement: true }).expect(204);
    const greg = await admin();
    const an = (await greg.post("/v1/admin/annonces").send({ metier: "tiling", departements: ["56"], nombre: 1 }).expect(201)).body;
    const { jeton } = await ctx.prisma.listeAttenteMetier.findFirstOrThrow({ where: { email: "change@exemple.fr" } });
    await publicAgent().post("/v1/public/liste-attente/desinscription").send({ jeton }).expect(204);
    expect((await greg.post(`/v1/admin/annonces/${an.id}/lot`).expect(201)).body).toEqual({ envoyes: 0, echecs: 0, annules: 1, restants: 0 });
    expect(annoncesEnvoyees()).toHaveLength(0);
  });
});

describe("chantier 05 : les invitations", { timeout: 120_000 }, () => {
  it("le lien d'invitation est suivi de bout en bout : qui a invité qui, une seule fois, jamais soi-même ni un compte ancien", async () => {
    const a = await artisan("toitures-a@exemple.fr", "roofing", "22");
    const inv = (await a.agent.get("/v1/communaute").expect(200)).body.invitation;
    expect(inv.code).toMatch(/^[23456789a-z]{10}$/);
    expect(inv.lien).toMatch(new RegExp(`/invitation/${inv.code}$`));
    expect(inv.phrase).toBe("Tu connais d'autres artisans ? Invite-les à découvrir Mobiiz. Plus on est, moins on paie.");
    expect(inv.message).toContain(inv.lien);
    // Le même lien à chaque fois.
    expect((await a.agent.get("/v1/communaute").expect(200)).body.invitation.code).toBe(inv.code);

    // B arrive par le lien et crée son compte.
    const b = await artisan("toitures-b@exemple.fr", "roofing", "29");
    expect((await b.agent.post("/v1/communaute/invitation").send({ code: inv.code }).expect(201)).body).toEqual({ suivi: true });
    expect((await b.agent.post("/v1/communaute/invitation").send({ code: inv.code }).expect(201)).body).toEqual({ suivi: false });
    // Son propre lien, un code faux, un compte ancien : rien.
    expect((await a.agent.post("/v1/communaute/invitation").send({ code: inv.code }).expect(201)).body).toEqual({ suivi: false });
    await b.agent.post("/v1/communaute/invitation").send({ code: "pas-un-code" }).expect(400);
    const vieux = await artisan("vieux@exemple.fr", "roofing", "22");
    await ctx.prisma.company.update({ where: { id: vieux.companyId }, data: { createdAt: new Date(Date.now() - 3 * 86_400_000) } });
    expect((await vieux.agent.post("/v1/communaute/invitation").send({ code: inv.code }).expect(201)).body).toEqual({ suivi: false });

    // Aucune adresse de A chez B : ni dans son état, ni dans la réponse au suivi.
    const etatB = JSON.stringify((await b.agent.get("/v1/communaute").expect(200)).body);
    expect(etatB).not.toContain("toitures-a@exemple.fr");
    expect(etatB).not.toContain(inv.code);

    // L'admin voit qui a invité qui. Aucune récompense : aucune autre table ne bouge.
    await a.agent.get("/v1/admin/invitations").expect(403);
    const greg = await admin();
    const r = (await greg.get("/v1/admin/invitations").expect(200)).body;
    expect(r.total).toBe(1);
    expect(r.suivis).toEqual([expect.objectContaining({ inviteur: "Entreprise toitures-a@exemple.fr", invite: "Entreprise toitures-b@exemple.fr", metier: "roofing", departement: "29" })]);
    expect(r.parInviteur).toEqual([{ inviteur: "Entreprise toitures-a@exemple.fr", nombre: 1 }]);
    expect(await ctx.prisma.journalAdmin.count({ where: { action: "vue_invitations" } })).toBe(1);
    // Aucun e-mail aux contacts de personne : seuls les e-mails de compte (validation) et le code de l'admin.
    expect(ctx.emails.sent.filter((m) => !m.compte && m.to !== "greg@example.fr")).toHaveLength(0);
  });
});
