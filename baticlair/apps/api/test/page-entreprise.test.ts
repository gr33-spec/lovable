/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026) : le serveur. Page privée par défaut, prérempli et synchronisé avec le profil,
 * réglages appliqués tout de suite, adresse changée une fois (l'ancienne redirige), photos compressées en plusieurs tailles
 * en arrière-plan et supprimées proprement, rien de personnel sans le choix de l'artisan, formulaire de contact sans
 * exposer l'e-mail (avec ses limites), signalement et modération, isolation stricte entre deux comptes.
 */
import { readdir } from "node:fs/promises";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LecteurIa } from "../src/platform/ai/lecteur-ia.js";
import { AideEcriture, TACHE_AIDE_ECRITURE } from "../src/modules/page-entreprise/application/aide-ecriture.js";
import { LIBELLES_METIERS, LIMITES_CONTACT, PageEntrepriseService, villeDeLAdresse } from "../src/modules/page-entreprise/application/page-entreprise.service.js";
import { typeDesOctets } from "../src/modules/page-entreprise/application/photos.js";
import type { AiUsageRecorder, AnalysisMeter } from "../src/modules/ai-usage/index.js";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
let service: PageEntrepriseService;
const DOSSIER = `${process.env.TMPDIR ?? "/tmp"}/mobiiz-pages-test-${process.pid}`;
const avant = { admins: process.env.GROUPE_ADMINS, dossier: process.env.STOCKAGE_PHOTOS_DOSSIER, missions: process.env.MISSIONS_V1 };

beforeAll(async () => {
  process.env.GROUPE_ADMINS = "admin@exemple.fr";
  process.env.STOCKAGE_PHOTOS_DOSSIER = DOSSIER;
  process.env.MISSIONS_V1 = "on";
  ctx = await createTestApp();
  service = ctx.app.get(PageEntrepriseService);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of [["GROUPE_ADMINS", avant.admins], ["STOCKAGE_PHOTOS_DOSSIER", avant.dossier], ["MISSIONS_V1", avant.missions]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

/** Une photo de téléphone : grande, tournée (EXIF), avec un lieu, un appareil et un auteur dans ses métadonnées. */
async function photoDeTelephone(largeur = 2400, hauteur = 1800): Promise<Buffer> {
  return sharp({ create: { width: largeur, height: hauteur, channels: 3, background: { r: 120, g: 90, b: 60 } } })
    .composite([{ input: Buffer.from(`<svg width="${largeur}" height="${hauteur}"><rect x="100" y="100" width="${largeur / 2}" height="${hauteur / 3}" fill="#335"/></svg>`), top: 0, left: 0 }])
    .withExif({ IFD0: { Make: "Apple", Model: "iPhone 15", Artist: "Jean Dupont", Copyright: "Dupont" } })
    .withMetadata({ orientation: 6 })
    .jpeg({ quality: 90 })
    .toBuffer();
}

const anon = () => request(ctx.app.getHttpServer());

async function rendrePublique(agent: Awaited<ReturnType<typeof signUpWithCompany>>["agent"]) {
  return (await agent.patch("/v1/ma-page").send({ visible: true }).expect(200)).body;
}

describe("Ma page : réglages", () => {
  it("créée privée à la première ouverture, adresse tirée du nom, préremplie depuis le profil", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing", "carpentry"]);
    await a.agent.patch("/v1/company/profile").send({ phone: "0296000000", address: "3 rue des Ardoises, 22300 Lannion" }).expect(200);
    const p = (await a.agent.get("/v1/ma-page").expect(200)).body;
    expect(p.reglages).toMatchObject({ visible: false, adresse: "toits-martin", adresseModifiable: true, couleur: null, telephone: null, zone: null, afficherAdresse: false });
    expect(p.profil).toMatchObject({ nom: "Toits Martin", metiers: ["roofing", "carpentry"], telephone: "02 96 00 00 00", zone: "Lannion", verifiee: false });
    expect(p.contenu).toMatchObject({ telephone: "02 96 00 00 00", zone: "Lannion", metierPrincipal: "roofing", adressePostale: null });
    expect(p.choix.theme.nom).toBe("Couvreur");
    // La page se fabrique toute seule : les prestations du métier sont proposées, modifiables.
    expect(p.reglages.prestations.map((x: { titre: string }) => x.titre)).toEqual(["Couverture ardoise et tuile", "Zinguerie", "Réparation de toiture", "Entretien et démoussage"]);
    expect(p.choix.teintes.map((x: { nom: string }) => x.nom)).toEqual(["Ardoise", "Anthracite", "Bleu nuit", "Vert sapin"]);
    // Privée : un visiteur ne la voit pas (404, comme une page qui n'existe pas).
    await anon().get("/v1/public/pages/toits-martin").expect(404);
    // Une deuxième entreprise au même nom prend une autre adresse.
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Toits Martin", ["roofing"]);
    expect((await b.agent.get("/v1/ma-page").expect(200)).body.reglages.adresse).toBe("toits-martin-2");
  });

  it("SYNCHRONISÉ : le téléphone, la zone et le métier changés dans le profil changent la page ; ce que l'artisan a choisi reste", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await rendrePublique(a.agent);
    await a.agent.patch("/v1/company/profile").send({ phone: "0611111111" }).expect(200);
    expect((await anon().get("/v1/public/pages/toits-martin").expect(200)).body.contenu.telephone).toBe("06 11 11 11 11");
    await a.agent.patch("/v1/company/profile").send({ phone: "0622222222" }).expect(200);
    expect((await anon().get("/v1/public/pages/toits-martin").expect(200)).body.contenu.telephone).toBe("06 22 22 22 22");
    // Le métier principal change : l'ambiance suit (métier), la couleur choisie reste.
    await a.agent.patch("/v1/ma-page").send({ couleur: "#1d3557" }).expect(200);
    await a.agent.patch("/v1/company/trades").send({ trades: ["painting"] }).expect(200);
    const c = (await anon().get("/v1/public/pages/toits-martin").expect(200)).body.contenu;
    expect(c).toMatchObject({ metierPrincipal: "painting", couleur: "#1D3557" });
    // Un téléphone propre à la page l'emporte ; vide, il revient à celui du profil.
    await a.agent.patch("/v1/ma-page").send({ telephone: "02 98 00 00 00" }).expect(200);
    expect((await anon().get("/v1/public/pages/toits-martin")).body.contenu.telephone).toBe("02 98 00 00 00");
    await a.agent.patch("/v1/ma-page").send({ telephone: null }).expect(200);
    expect((await anon().get("/v1/public/pages/toits-martin")).body.contenu.telephone).toBe("06 22 22 22 22");
  });

  it("chaque champ validé, refus en une phrase ; certifications sans doublon, plafonnées", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    const refus = async (corps: object) => (await a.agent.patch("/v1/ma-page").send(corps).expect(400)).body.error.details;
    expect(await refus({ couleur: "rouge" })).toMatchObject({ reason: "couleur" });
    expect(await refus({ couleur: "#FF00FF" })).toMatchObject({ reason: "couleur", phrase: "Choisis une des quatre teintes." });
    expect(await refus({ telephone: "12" })).toMatchObject({ reason: "telephone", phrase: "Ce numéro n'est pas valable." });
    expect(await refus({ siteWeb: "javascript:alert(1)" })).toMatchObject({ reason: "site_web" });
    expect(await refus({ creeeEn: 1850 })).toMatchObject({ reason: "creee_en" });
    const p = (await a.agent.patch("/v1/ma-page").send({ couleur: "vert-sapin", siteWeb: "toits-martin.fr", prestations: [{ titre: " Zinguerie\n", texte: "Gouttières et noues." }, { titre: "", texte: "sans titre" }, ...Array.from({ length: 8 }, (_, i) => ({ titre: `P${i}`, texte: "x" }))], accroche: "  Ligne 1\nligne 2 ", certifications: ["RGE", "rge", "Qualibat", "", ...Array.from({ length: 12 }, (_, i) => `Label ${i}`)] }).expect(200)).body;
    expect(p.reglages).toMatchObject({ couleur: "#1F4D3A", siteWeb: "https://toits-martin.fr", accroche: "Ligne 1 ligne 2" });
    expect(p.reglages.prestations[0]).toEqual({ titre: "Zinguerie", texte: "Gouttières et noues." });
    expect(p.reglages.prestations).toHaveLength(6);
    expect(p.reglages.certifications.slice(0, 2)).toEqual(["RGE", "Qualibat"]);
    expect(p.reglages.certifications).toHaveLength(10);
  });

  it("JAMAIS D'ADRESSE EXACTE sans le choix explicite de l'artisan, jamais d'e-mail, jamais de nom de personne", async () => {
    const a = await signUpWithCompany(ctx.app, "jean.dupont@exemple.fr", "Toits Martin");
    await a.agent.patch("/v1/company/profile").send({ address: "3 rue des Ardoises, 22300 Lannion", email: "contact@toits-martin.fr" }).expect(200);
    await ctx.prisma.company.update({ where: { id: a.companyId }, data: { prenom: "Jean" } });
    await rendrePublique(a.agent);
    const texte = JSON.stringify((await anon().get("/v1/public/pages/toits-martin").expect(200)).body);
    expect(texte).not.toMatch(/rue des Ardoises|@|Jean|Dupont/);
    await a.agent.patch("/v1/ma-page").send({ afficherAdresse: true }).expect(200);
    expect((await anon().get("/v1/public/pages/toits-martin")).body.contenu.adressePostale).toBe("3 rue des Ardoises, 22300 Lannion");
  });

  it("l'adresse se change UNE fois ; l'ancienne redirige ; une adresse prise ou réservée est refusée", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Zinc Le Gall");
    await rendrePublique(a.agent);
    await b.agent.get("/v1/ma-page").expect(200);
    expect((await a.agent.put("/v1/ma-page/adresse").send({ adresse: "zinc-le-gall" }).expect(409)).body.error.details.reason).toBe("adresse_prise");
    expect((await a.agent.put("/v1/ma-page/adresse").send({ adresse: "admin" }).expect(400)).body.error.details.phrase).toMatch(/réservée/);
    const p = (await a.agent.put("/v1/ma-page/adresse").send({ adresse: "couvreur-lannion" }).expect(200)).body;
    expect(p.reglages).toMatchObject({ adresse: "couvreur-lannion", adresseModifiable: false });
    expect((await anon().get("/v1/public/pages/toits-martin").expect(200)).body).toEqual({ redirection: "couvreur-lannion" });
    expect((await a.agent.put("/v1/ma-page/adresse").send({ adresse: "toits-martin-bis" }).expect(409)).body.error.details.reason).toBe("adresse_deja_changee");
    // L'ancienne adresse n'est jamais réattribuée.
    expect((await b.agent.put("/v1/ma-page/adresse").send({ adresse: "toits-martin" }).expect(409)).body.error.details.reason).toBe("adresse_prise");
    expect((await a.agent.get("/v1/ma-page/adresses").expect(200)).body.adresses).toEqual(["couvreur-lannion", "toits-martin"]);
  });

  it("ENTRE PROS : le site public ne dit rien de Mission ; une entreprise connectée lit la disponibilité et les compétences, jamais un document", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Zinc Le Gall", ["roofing"]);
    await rendrePublique(a.agent);
    const userId = (await ctx.prisma.membership.findFirstOrThrow({ where: { companyId: a.companyId } })).userId;
    const dispo = await ctx.prisma.annonceMission.create({ data: { companyId: a.companyId, userId, type: "disponibilite", metier: "Couverture", lieu: "Lannion", departement: "22", debut: new Date("2026-12-01"), fin: new Date("2026-12-20"), description: "Dispo" } });
    await ctx.prisma.profilPublic.create({ data: { companyId: a.companyId, visible: true, metiers: ["Ardoise naturelle", "Zinc joint debout, appeler le 06 12 34 56 78"], services: "Renfort sur toiture" } });
    await ctx.prisma.fichierPro.create({ data: { companyId: a.companyId, portee: "dossier", categorie: "cv", nom: "cv-jean.pdf", type: "application/pdf", taille: 3, contenu: Buffer.from("cv!"), surProfil: true } });
    // Le site public (le même pour tous, mis en cache) ne porte rien de Mission.
    const publique = (await anon().get("/v1/public/pages/toits-martin").expect(200)).body.contenu;
    expect(publique).not.toHaveProperty("missions");
    expect(JSON.stringify(publique)).not.toMatch(/Dispo|Ardoise naturelle|Renfort|cv-jean/);
    // Un visiteur non connecté : jamais le bloc.
    await anon().get("/v1/pages-entreprises/toits-martin/entre-pros").expect(401);
    await anon().get(`/v1/pages-entreprises/entreprise/${a.companyId}`).expect(401);
    // Une entreprise connectée : disponibilité, compétences (coordonnées masquées), le lien de la disponibilité.
    const vu = await b.agent.get("/v1/pages-entreprises/toits-martin/entre-pros").expect(200);
    expect(vu.headers["cache-control"]).toMatch(/no-store/);
    expect(vu.body).toMatchObject({ mienne: false, entrepriseId: a.companyId, services: "Renfort sur toiture", disponibilite: { annonceId: dispo.id, du: "2026-12-01", au: "2026-12-20" } });
    expect(vu.body.competences[0]).toBe("Ardoise naturelle");
    expect(vu.body.competences[1]).not.toMatch(/06 12/);
    expect(JSON.stringify(vu.body)).not.toMatch(/cv-jean|cv!/);
    // L'artisan voit son propre bloc tel que le voient les autres, sans masquage.
    expect((await a.agent.get("/v1/pages-entreprises/toits-martin/entre-pros").expect(200)).body.mienne).toBe(true);
    // Depuis Mission, le profil ouvre le site.
    expect((await b.agent.get(`/v1/pages-entreprises/entreprise/${a.companyId}`).expect(200)).body).toEqual({ adresse: "toits-martin" });
    expect((await a.agent.get(`/v1/pages-entreprises/entreprise/${b.companyId}`).expect(200)).body).toEqual({ adresse: null });
    // Un blocage posé ou subi : rien.
    await ctx.prisma.blocageEntreprise.create({ data: { companyId: a.companyId, cibleId: b.companyId } });
    await b.agent.get("/v1/pages-entreprises/toits-martin/entre-pros").expect(404);
    expect((await b.agent.get(`/v1/pages-entreprises/entreprise/${a.companyId}`).expect(200)).body).toEqual({ adresse: null });
    await ctx.prisma.blocageEntreprise.deleteMany({});
    // Site privé : rien non plus.
    await a.agent.patch("/v1/ma-page").send({ visible: false }).expect(200);
    await b.agent.get("/v1/pages-entreprises/toits-martin/entre-pros").expect(404);
    expect((await b.agent.get(`/v1/pages-entreprises/entreprise/${a.companyId}`).expect(200)).body).toEqual({ adresse: null });
  });

  it("ENTRE PROS : missions coupées dans l'admin, le bloc n'existe pas", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Zinc Le Gall", ["roofing"]);
    await rendrePublique(a.agent);
    const { ReglageMissions } = await import("../src/platform/reglages/reglage-missions.js");
    const reglage = ctx.app.get(ReglageMissions);
    await reglage.regler(false);
    try {
      await b.agent.get("/v1/pages-entreprises/toits-martin/entre-pros").expect(404);
      await b.agent.get(`/v1/pages-entreprises/entreprise/${a.companyId}`).expect(404);
    } finally {
      await reglage.regler(true);
    }
    expect((await b.agent.get("/v1/pages-entreprises/toits-martin/entre-pros").expect(200)).body.competences).toEqual(["Couverture, charpente, zinguerie"]);
  });
});

describe("Ma page : photos", () => {
  it("compressée en AVIF et WebP à trois tailles + JPEG de partage, en arrière-plan, sans métadonnées ; supprimée proprement", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    const brute = await photoDeTelephone();
    expect(brute.toString("latin1")).toMatch(/Dupont/);
    await a.agent.post("/v1/ma-page/accord-photos").expect(200);
    const p = (await a.agent.post("/v1/ma-page/photos").field("legende", "Toiture ardoise à Lannion").attach("file", brute, "IMG_0001.jpg").expect(202)).body;
    expect(p).toMatchObject({ statut: "traitement", legende: "Toiture ardoise à Lannion", role: "galerie" });
    await service.traitementsTermines();
    const lue = (await a.agent.get("/v1/ma-page").expect(200)).body.photos[0];
    expect(lue.statut).toBe("prete");
    // Redressée (EXIF orientation 6 : 2400 × 1800 devient 1800 × 2400).
    expect([lue.largeur, lue.hauteur]).toEqual([1800, 2400]);
    // Deux grandes colonnes sur ordinateur : 640, 1280, puis la largeur d'origine (1800), jamais agrandie.
    expect(lue.variantes.map((v: { largeur: number }) => v.largeur)).toEqual([640, 1280, 1800]);
    for (const v of lue.variantes) {
      const avif = (await anon().get(v.avif).buffer(true).expect(200)).body as Buffer;
      const webp = (await anon().get(v.webp).buffer(true).expect(200)).body as Buffer;
      expect(typeDesOctets(avif)).toBe("image/avif");
      expect(typeDesOctets(webp)).toBe("image/webp");
      expect(avif.length).toBeLessThan(brute.length);
      for (const f of [avif, webp]) expect(f.toString("latin1")).not.toMatch(/Dupont|iPhone|Apple/);
    }
    const res = await anon().get(lue.partage).buffer(true).expect(200);
    expect(res.headers["cache-control"]).toContain("immutable");
    const meta = await sharp(res.body as Buffer).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1200, 630]);
    const fichiers = await readdir(`${DOSSIER}/pages/${a.companyId}/${p.id}`);
    expect(fichiers.sort()).toEqual(["1280.avif", "1280.webp", "1800.avif", "1800.webp", "640.avif", "640.webp", "partage.jpg"]);
    // Supprimée : les fichiers d'abord, puis la ligne.
    await a.agent.delete(`/v1/ma-page/photos/${p.id}`).expect(200);
    expect(await readdir(`${DOSSIER}/pages/${a.companyId}/${p.id}`).catch(() => [])).toEqual([]);
    await anon().get(lue.variantes[0].webp).expect(404);
    expect(await ctx.prisma.photoPage.count()).toBe(0);
  });

  it("refus dits : pas une image (même renommée), trop petite, trop lourde ; 20 photos au plus", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    const refus = async (o: Buffer, nom = "photo.jpg") => (await a.agent.post("/v1/ma-page/photos").attach("file", o, nom)).body.error?.details;
    // Relecture du juriste : rien n'entre avant « J'ai le droit de publier ces photos », coché une fois et daté.
    expect(await refus(await photoDeTelephone(800, 600))).toMatchObject({ reason: "accord_photos" });
    expect((await a.agent.get("/v1/ma-page")).body.reglages.photosAccord).toBe(false);
    expect((await a.agent.post("/v1/ma-page/accord-photos").expect(200)).body.reglages.photosAccord).toBe(true);
    const le = (await ctx.prisma.pageEntreprise.findUniqueOrThrow({ where: { companyId: a.companyId } })).photosAccordLe;
    await a.agent.post("/v1/ma-page/accord-photos").expect(200);
    expect((await ctx.prisma.pageEntreprise.findUniqueOrThrow({ where: { companyId: a.companyId } })).photosAccordLe).toEqual(le);
    expect(await refus(Buffer.from("%PDF-1.4 pas une image"))).toMatchObject({ reason: "photo_type" });
    expect(await refus(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>"), "x.png")).toMatchObject({ reason: "photo_type" });
    expect(await refus(await sharp({ create: { width: 200, height: 150, channels: 3, background: "#fff" } }).png().toBuffer())).toMatchObject({ reason: "photo_trop_petite" });
    expect((await a.agent.post("/v1/ma-page/photos").attach("file", Buffer.alloc(10 * 1024 * 1024 + 10, 0xff), "lourde.jpg")).status).toBeGreaterThanOrEqual(400);
    expect(await ctx.prisma.photoPage.count()).toBe(0);
    await ctx.prisma.photoPage.createMany({ data: Array.from({ length: 20 }, (_, i) => ({ companyId: a.companyId, ordre: i, statut: "prete" })) });
    expect(await refus(await photoDeTelephone(800, 600))).toMatchObject({ reason: "photos_max" });
  });

  it("réordonner, légender ; la couverture remplace l'ancienne (fichiers supprimés) et se retire", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    const ids: string[] = [];
    await a.agent.post("/v1/ma-page/accord-photos").expect(200);
    for (let i = 0; i < 3; i++) ids.push((await a.agent.post("/v1/ma-page/photos").attach("file", await photoDeTelephone(900, 600), `p${i}.jpg`).expect(202)).body.id);
    await service.traitementsTermines();
    await a.agent.put("/v1/ma-page/photos/ordre").send({ ids: [ids[2], ids[0], ids[1]] }).expect(200);
    await a.agent.patch(`/v1/ma-page/photos/${ids[0]}`).send({ legende: "Zinguerie" }).expect(200);
    await rendrePublique(a.agent);
    const c = (await anon().get("/v1/public/pages/toits-martin")).body.contenu;
    // Sans chantier, chaque photo se montre comme un chantier à elle seule, titrée par sa légende.
    expect(c.realisations.map((r: { id: string }) => r.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(c.realisations[1].titre).toBe("Zinguerie");
    // Un ordre qui cite une photo inconnue est refusé.
    await a.agent.put("/v1/ma-page/photos/ordre").send({ ids: [ids[0], "0193a0a0-0000-7000-8000-000000000000"] }).expect(404);
    const c1 = (await a.agent.post("/v1/ma-page/photos").field("role", "couverture").attach("file", await photoDeTelephone(2000, 1200), "c1.jpg").expect(202)).body.id;
    await service.traitementsTermines();
    const c2 = (await a.agent.post("/v1/ma-page/photos").field("role", "couverture").attach("file", await photoDeTelephone(2000, 1200), "c2.jpg").expect(202)).body.id;
    await service.traitementsTermines();
    const page = (await a.agent.get("/v1/ma-page")).body;
    expect(page.reglages.couvertureId).toBe(c2);
    // Photo de 2000 × 1200 tournée (EXIF) : 1200 de large ; jamais agrandie.
    expect(page.contenu.couverture.variantes.map((v: { largeur: number }) => v.largeur)).toEqual([640, 1200]);
    expect(await ctx.prisma.photoPage.count({ where: { id: c1 } })).toBe(0);
    expect(await readdir(`${DOSSIER}/pages/${a.companyId}/${c1}`).catch(() => [])).toEqual([]);
    expect((await a.agent.delete("/v1/ma-page/couverture").expect(200)).body.reglages.couvertureId).toBeNull();
    expect(await ctx.prisma.photoPage.count({ where: { role: "couverture" } })).toBe(0);
  });
});

describe("Ma page : chantiers et photo « À propos »", () => {
  it("un chantier a un titre et ses photos ; réordonner, renommer ; le retirer retire ses photos et leurs fichiers", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Zinc Le Gall");
    await a.agent.post("/v1/ma-page/accord-photos").expect(200);
    await a.agent.post("/v1/ma-page/realisations").send({ titre: "  " }).expect(400);
    const r1 = (await a.agent.post("/v1/ma-page/realisations").send({ titre: "Toiture ardoise · Paimpol" }).expect(201)).body.realisation.id as string;
    const r2 = (await a.agent.post("/v1/ma-page/realisations").send({ titre: "Zinguerie · Lannion" }).expect(201)).body.realisation.id as string;
    for (let i = 0; i < 2; i++) await a.agent.post("/v1/ma-page/photos").field("realisationId", r1).attach("file", await photoDeTelephone(900, 600), `r1-${i}.jpg`).expect(202);
    await a.agent.post("/v1/ma-page/photos").field("realisationId", r2).attach("file", await photoDeTelephone(900, 600), "r2.jpg").expect(202);
    // Le chantier d'une autre entreprise : refusé, rien n'est créé.
    await b.agent.post("/v1/ma-page/accord-photos").expect(200);
    await b.agent.post("/v1/ma-page/photos").field("realisationId", r1).attach("file", await photoDeTelephone(900, 600), "vol.jpg").expect(404);
    await b.agent.patch(`/v1/ma-page/realisations/${r1}`).send({ titre: "Volé" }).expect(404);
    await b.agent.delete(`/v1/ma-page/realisations/${r1}`).expect(404);
    await service.traitementsTermines();
    await a.agent.put("/v1/ma-page/realisations/ordre").send({ ids: [r2, r1] }).expect(200);
    await a.agent.patch(`/v1/ma-page/realisations/${r1}`).send({ titre: "Toiture ardoise · Paimpol (22)" }).expect(200);
    await rendrePublique(a.agent);
    const c = (await anon().get("/v1/public/pages/toits-martin").expect(200)).body.contenu;
    expect(c.realisations.map((r: { titre: string; photos: unknown[] }) => [r.titre, r.photos.length])).toEqual([["Zinguerie · Lannion", 1], ["Toiture ardoise · Paimpol (22)", 2]]);
    // Un chantier sans photo prête n'apparaît pas.
    await a.agent.post("/v1/ma-page/realisations").send({ titre: "Vide" }).expect(201);
    expect((await anon().get("/v1/public/pages/toits-martin")).body.contenu.realisations).toHaveLength(2);
    const fichiers = (await ctx.prisma.photoPage.findMany({ where: { realisationId: r1 } })).map((ph) => ph.id);
    await a.agent.delete(`/v1/ma-page/realisations/${r1}`).expect(200);
    expect(await ctx.prisma.photoPage.count({ where: { id: { in: fichiers } } })).toBe(0);
    for (const id of fichiers) expect(await readdir(`${DOSSIER}/pages/${a.companyId}/${id}`).catch(() => [])).toEqual([]);
  });

  it("la photo « À propos » : une seule, remplacée par la suivante, retirée proprement", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    await a.agent.post("/v1/ma-page/accord-photos").expect(200);
    await a.agent.post("/v1/ma-page/photos").field("role", "equipe").attach("file", await photoDeTelephone(1200, 900), "equipe.jpg").expect(202);
    await service.traitementsTermines();
    await a.agent.post("/v1/ma-page/photos").field("role", "equipe").attach("file", await photoDeTelephone(1200, 900), "equipe2.jpg").expect(202);
    await service.traitementsTermines();
    expect(await ctx.prisma.photoPage.count({ where: { role: "equipe" } })).toBe(1);
    expect((await a.agent.get("/v1/ma-page")).body.contenu.photoEquipe).not.toBeNull();
    await a.agent.delete("/v1/ma-page/equipe").expect(200);
    expect(await ctx.prisma.photoPage.count({ where: { role: "equipe" } })).toBe(0);
  });
});

describe("Ma page : visiteurs", () => {
  it("contact : l'e-mail de l'entreprise n'est jamais montré ; « Répondre » écrit au visiteur ; limites anti-abus", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    await rendrePublique(a.agent);
    const page = JSON.stringify((await anon().get("/v1/public/pages/toits-martin")).body);
    expect(page).not.toContain("a@exemple.fr");
    await anon().post("/v1/public/pages/toits-martin/contact").send({ nom: "Paul", message: "Bonjour, une fuite." }).expect(400);
    await anon().post("/v1/public/pages/toits-martin/contact").send({ nom: "Paul Client", email: "paul@client.fr", commune: "Perros", message: "Bonjour, une fuite sur mon toit." }).expect(200);
    const mail = ctx.emails.sent.at(-1)!;
    expect(mail).toMatchObject({ to: "a@exemple.fr", replyTo: "paul@client.fr" });
    expect(mail.subject).toContain("Paul Client");
    expect(mail.text).toContain("une fuite sur mon toit");
    expect(mail.text).toContain("Perros");
    // On ne garde que la trace (limites), jamais le texte ni les coordonnées du visiteur.
    expect(JSON.stringify(await ctx.prisma.contactPage.findMany())).not.toMatch(/Paul|fuite|client\.fr/);
    for (let i = 1; i < LIMITES_CONTACT.parIpParHeure; i++) await anon().post("/v1/public/pages/toits-martin/contact").send({ nom: "Paul", telephone: "0600000000", message: `Message ${i} pour vous` }).expect(200);
    expect((await anon().post("/v1/public/pages/toits-martin/contact").send({ nom: "Robot", telephone: "0600000000", message: "Encore un message" }).expect(429)).body.error.details.reason).toBe("trop_de_messages");
    // Page privée ou masquée : pas de contact.
    await a.agent.patch("/v1/ma-page").send({ visible: false }).expect(200);
    await ctx.prisma.contactPage.deleteMany();
    await anon().post("/v1/public/pages/toits-martin/contact").send({ nom: "Paul", telephone: "0600000000", message: "Bonjour bonjour" }).expect(404);
  });

  it("logo public seulement pour une page visible, mis en cache", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#123456" } }).png().toBuffer();
    await a.agent.put("/v1/company/logo").attach("file", png, "logo.png").expect(200);
    await anon().get("/v1/public/pages/toits-martin/logo").expect(404);
    await rendrePublique(a.agent);
    const logo = (await anon().get("/v1/public/pages/toits-martin")).body.contenu.logo as string;
    expect(logo).toMatch(/^\/v1\/public\/pages\/toits-martin\/logo\?v=/);
    const r = await anon().get(logo).expect(200);
    expect(r.headers["content-type"]).toBe("image/png");
    expect(r.headers["cache-control"]).toContain("public");
  });

  it("signaler cette page (une fois par visiteur et par jour), l'admin voit, masque (page en 404) et rétablit", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    await rendrePublique(a.agent);
    await anon().post("/v1/public/pages/toits-martin/signalement").send({ motif: "inconnu" }).expect(400);
    await anon().post("/v1/public/pages/toits-martin/signalement").send({ motif: "usurpation", precision: "Ce n'est pas lui" }).expect(200);
    await anon().post("/v1/public/pages/toits-martin/signalement").send({ motif: "usurpation" }).expect(200);
    expect(await ctx.prisma.signalementPage.count()).toBe(1);
    // L'entreprise signalée ne voit jamais le signalement ; un non-admin n'a pas la liste.
    expect(JSON.stringify((await a.agent.get("/v1/ma-page")).body)).not.toContain("Ce n'est pas lui");
    await a.agent.get("/v1/admin/pages-publiques").expect(403);
    const admin = await signUpWithCompany(ctx.app, "admin@exemple.fr", "Mobiiz Admin");
    await doubleAuthentification(ctx, admin.agent, "admin@exemple.fr");
    const liste = (await admin.agent.get("/v1/admin/pages-publiques").expect(200)).body;
    expect(liste.pages).toEqual([expect.objectContaining({ adresse: "toits-martin", nom: "Toits Martin", metier: "Couvreur", visible: true, masquee: false, signalements: 1 })]);
    expect(liste.signalements[0]).toMatchObject({ adresse: "toits-martin", motif: "Cette page usurpe une entreprise", precision: "Ce n'est pas lui" });
    expect((await admin.agent.put("/v1/admin/pages-publiques/toits-martin/masquage").send({ masquer: true, motif: "Usurpation" }).expect(200)).body.adresses).toEqual(["toits-martin"]);
    // DSA, art. 17 : l'artisan est prévenu du masquage, avec le motif et le moyen de contester.
    const prevenu = ctx.emails.sent.find((m) => m.to === "a@exemple.fr" && m.subject === "Votre page Mobiiz a été masquée")!;
    expect(prevenu.text).toContain("Motif : Usurpation.");
    expect(prevenu.text).toContain("contact@mobiiz.fr");
    await anon().get("/v1/public/pages/toits-martin").expect(404);
    // L'artisan voit que sa page est masquée ; la rendre visible n'y change rien.
    expect((await rendrePublique(a.agent)).reglages).toMatchObject({ visible: true, masquee: true });
    await anon().get("/v1/public/pages/toits-martin").expect(404);
    await admin.agent.post(`/v1/admin/pages-publiques/signalements/${liste.signalements[0].id}/traite`).expect(200);
    await admin.agent.put("/v1/admin/pages-publiques/toits-martin/masquage").send({ masquer: false }).expect(200);
    await anon().get("/v1/public/pages/toits-martin").expect(200);
    expect((await admin.agent.get("/v1/admin/pages-publiques")).body.signalements).toEqual([]);
    expect(await ctx.prisma.journalAdmin.count({ where: { action: { startsWith: "page_publique:" } } })).toBe(3);
  });
});

describe("Ma page : isolation entre deux comptes", () => {
  it("B ne lit ni ne change rien de A : réglages, photos, adresse ; un visiteur ne voit que la page visible", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Peinture Le Gall", ["painting"]);
    await a.agent.post("/v1/ma-page/accord-photos").expect(200);
    const pa = (await a.agent.post("/v1/ma-page/photos").attach("file", await photoDeTelephone(900, 600), "a.jpg").expect(202)).body.id as string;
    await service.traitementsTermines();
    await a.agent.patch("/v1/ma-page").send({ accroche: "Accroche secrète de A" }).expect(200);
    // B ne voit que SA page.
    const pageB = (await b.agent.get("/v1/ma-page").expect(200)).body;
    expect(JSON.stringify(pageB)).not.toMatch(/Toits Martin|Accroche secrète|toits-martin/);
    expect(pageB.photos).toEqual([]);
    // B ne touche à aucune photo de A.
    await b.agent.patch(`/v1/ma-page/photos/${pa}`).send({ legende: "Volée" }).expect(404);
    await b.agent.delete(`/v1/ma-page/photos/${pa}`).expect(404);
    await b.agent.put("/v1/ma-page/photos/ordre").send({ ids: [pa] }).expect(404);
    // B ne peut pas viser l'entreprise de A avec l'en-tête d'entreprise (404 : comme si elle n'existait pas).
    await b.agent.patch("/v1/ma-page").set("x-company-id", a.companyId).send({ accroche: "Volée" }).expect(404);
    await b.agent.get("/v1/ma-page").set("x-company-id", a.companyId).expect(404);
    const apresA = (await a.agent.get("/v1/ma-page")).body;
    expect(apresA.reglages.accroche).toBe("Accroche secrète de A");
    expect(apresA.photos.map((p: { id: string }) => p.id)).toEqual([pa]);
    // Sans session : les routes de réglage refusent ; la page privée de A reste invisible.
    await anon().get("/v1/ma-page").expect(401);
    await anon().patch("/v1/ma-page").set("origin", "http://localhost:3000").send({ visible: true }).expect(401);
    await anon().get("/v1/public/pages/toits-martin").expect(404);
    // Un lecteur (rôle viewer) de A ne modifie rien.
    const lecteur = await signUpWithCompany(ctx.app, "c@exemple.fr", "Autre");
    const userC = (await ctx.prisma.user.findUniqueOrThrow({ where: { email: "c@exemple.fr" } })).id;
    await ctx.prisma.membership.create({ data: { companyId: a.companyId, userId: userC, role: "viewer" } });
    await lecteur.agent.patch("/v1/ma-page").set("x-company-id", a.companyId).send({ visible: true }).expect(403);
  });
});

describe("Mobiiz m'aide à l'écrire", () => {
  const profil = { nom: "Toits Martin", metiers: ["roofing"], zone: "Lannion", creeeEn: 2008, certifications: ["RGE"], verifiee: true };
  const recorder = () => {
    const appels: { task: string; status: string }[] = [];
    return { appels, r: { record: async (x: { task: string; status: string }) => (appels.push(x), { id: "x", costMicroUsd: 1 }) } as unknown as AiUsageRecorder };
  };
  const meter = (permis: boolean) => ({ verifierScan: async () => { if (!permis) throw Object.assign(new Error("x"), { details: { phrase: "Tes 3 analyses offertes sont utilisées." } }); } }) as unknown as AnalysisMeter;
  const lecteur = (sortie: { accroche: string; presentation: string } | null): LecteurIa & { lu: number } => {
    const l = { provider: "test", model: "m", lu: 0, read: async () => (l.lu++, { provider: "test", model: "m", usage: { inputTokens: 10, outputTokens: 10 }, status: sortie ? "success" : "provider_error", output: sortie, errorCode: null, durationMs: 1 }) };
    return l as never;
  };
  const silencieux = { warn: () => undefined } as never;

  it("l'IA propose, le texte est nettoyé (ni numéro, ni e-mail, ni lien) ; l'appel compte comme une analyse", async () => {
    const r = recorder();
    const l = lecteur({ accroche: "Votre toit à Lannion, appelez le 06 12 34 56 78", presentation: "Toits Martin, couvreur à Lannion depuis 2008. Écrivez à jean@toits.fr ou www.toits.fr." });
    const p = await new AideEcriture(l, meter(true), r.r, silencieux).proposer("c", "u", profil, LIBELLES_METIERS, { accroche: null, presentation: null });
    expect(p.source).toBe("ia");
    expect(p.accroche + p.presentation).not.toMatch(/06 12|@|www/);
    expect(r.appels).toEqual([expect.objectContaining({ task: TACHE_AIDE_ECRITURE, status: "success" })]);
  });

  it("plus d'analyses offertes : AUCUN appel, le code propose depuis le profil et le dit ; IA en panne : le code aussi", async () => {
    const r = recorder();
    const l = lecteur({ accroche: "x", presentation: "y" });
    const p = await new AideEcriture(l, meter(false), r.r, silencieux).proposer("c", "u", profil, LIBELLES_METIERS, { accroche: null, presentation: null });
    expect(l.lu).toBe(0);
    expect(p).toMatchObject({ source: "profil", phrase: "Tes 3 analyses offertes sont utilisées." });
    expect(p.presentation).toContain("Toits Martin");
    const panne = await new AideEcriture(lecteur(null), meter(true), r.r, silencieux).proposer("c", "u", profil, LIBELLES_METIERS, { accroche: null, presentation: null });
    expect(panne.source).toBe("profil");
  });

  it("par l'API (IA coupée en test) : une proposition tirée du profil, rien n'est enregistré sans l'artisan", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    const p = (await a.agent.post("/v1/ma-page/aide-ecriture").send({}).expect(200)).body;
    expect(p.source).toBe("profil");
    expect(p.accroche.length).toBeGreaterThan(5);
    expect((await a.agent.get("/v1/ma-page")).body.reglages.accroche).toBeNull();
  });
});

describe("le ménage de la nuit", () => {
  it("traces de contact à 30 jours, empreintes IP à 30 jours, signalements à 12 mois, fichiers sans photo ; seulement avec le secret", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin");
    await a.agent.post("/v1/ma-page/accord-photos").expect(200);
    const gardee = (await a.agent.post("/v1/ma-page/photos").attach("file", await photoDeTelephone(900, 600), "a.jpg").expect(202)).body.id as string;
    const partie = (await a.agent.post("/v1/ma-page/photos").attach("file", await photoDeTelephone(900, 600), "b.jpg").expect(202)).body.id as string;
    await service.traitementsTermines();
    // Une photo dont la ligne a disparu (entreprise supprimée) : ses fichiers restent dans le stockage jusqu'au ménage.
    await ctx.prisma.photoPage.delete({ where: { id: partie } });
    const fichiersDeLaPartie = (await readdir(`${DOSSIER}/pages/${a.companyId}/${partie}`)).length;
    // 900 × 600 tournée (EXIF) : 600 px de large, une seule taille (jamais agrandie), en AVIF et WebP, et le JPEG de partage.
    expect(fichiersDeLaPartie).toBe(3);
    const vieux = new Date(Date.now() - 40 * 86_400_000);
    const tresVieux = new Date(Date.now() - 400 * 86_400_000);
    await ctx.prisma.contactPage.createMany({ data: [{ companyId: a.companyId, ipHash: "x", createdAt: vieux }, { companyId: a.companyId, ipHash: "y" }] });
    await ctx.prisma.signalementPage.createMany({ data: [{ companyId: a.companyId, motif: "autre", ipHash: "x", createdAt: vieux }, { companyId: a.companyId, motif: "autre", ipHash: "y", createdAt: tresVieux }, { companyId: a.companyId, motif: "autre", ipHash: "z" }] });
    await anon().get("/v1/internal/pages-entreprises/menage").expect(403);
    const bilan = await service.menage();
    expect(bilan).toMatchObject({ contacts: 1, signalements: 1 });
    // Au moins ceux de la photo partie (les tests précédents laissent aussi des fichiers sans ligne : ils partent avec).
    expect(bilan.fichiers).toBeGreaterThanOrEqual(fichiersDeLaPartie);
    expect(await ctx.prisma.contactPage.count()).toBe(1);
    expect((await ctx.prisma.signalementPage.findMany({ orderBy: { createdAt: "asc" } })).map((s) => s.ipHash)).toEqual([null, "z"]);
    expect(await readdir(`${DOSSIER}/pages/${a.companyId}/${partie}`).catch(() => [])).toEqual([]);
    expect((await readdir(`${DOSSIER}/pages/${a.companyId}/${gardee}`)).length).toBe(3);
  });
});

it("la ville d'une adresse postale", () => {
  expect(villeDeLAdresse("3 rue des Ardoises, 22300 Lannion")).toBe("Lannion");
  expect(villeDeLAdresse("BP 12, 29200 Brest Cedex 2")).toBe("Brest");
  expect(villeDeLAdresse("Lannion")).toBeNull();
});
