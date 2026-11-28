/**
 * BROUILLON ET SITE PUBLIÉ (Greg, 27 novembre 2026, cahier 03 « socle avant les effets ») : l'éditeur modifie un brouillon,
 * le visiteur ne voit que ce qui a été publié ; « Publier » met en ligne, « Retirer de la ligne » cache sans rien effacer ;
 * une page en ligne d'avant le brouillon ne bouge pas tant que l'artisan ne republie pas ; les photos suivent la même
 * règle ; le droit de publier peut être réservé à l'abonnement (coupé par défaut, vérifié côté serveur) ; deux artisans
 * restent isolés ; les adresses réservées sont refusées.
 */
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PageEntrepriseService } from "../src/modules/page-entreprise/application/page-entreprise.service.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
let service: PageEntrepriseService;
const DOSSIER = `${process.env.TMPDIR ?? "/tmp"}/mobiiz-brouillon-test-${process.pid}`;
const avant = { dossier: process.env.STOCKAGE_PHOTOS_DOSSIER, payante: process.env.SITE_PUBLICATION_PAYANTE };

beforeAll(async () => {
  process.env.STOCKAGE_PHOTOS_DOSSIER = DOSSIER;
  ctx = await createTestApp();
  service = ctx.app.get(PageEntrepriseService);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of [["STOCKAGE_PHOTOS_DOSSIER", avant.dossier], ["SITE_PUBLICATION_PAYANTE", avant.payante]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  delete process.env.SITE_PUBLICATION_PAYANTE;
});

const anon = () => request(ctx.app.getHttpServer());
const lire = async (adresse = "toits-martin") => (await anon().get(`/v1/public/pages/${adresse}`).expect(200)).body.contenu;
const photo = () => sharp({ create: { width: 1600, height: 1200, channels: 3, background: { r: 90, g: 110, b: 130 } } }).jpeg().toBuffer();

describe("Brouillon et site publié", () => {
  it("le brouillon n'est jamais public ; « Publier » met en ligne ; un changement attend la publication ; « Retirer de la ligne » ne perd rien", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await a.agent.patch("/v1/ma-page").send({ accroche: "Premier texte" }).expect(200);
    // Jamais publiée : rien pour le visiteur.
    await anon().get("/v1/public/pages/toits-martin").expect(404);
    const publiee = (await a.agent.post("/v1/ma-page/publication").expect(201)).body;
    expect(publiee.reglages.visible).toBe(true);
    expect(publiee.publication).toMatchObject({ changementsAPublier: false, autorisee: true });
    expect(publiee.publication.publieLe).toEqual(expect.any(String));
    expect((await lire()).accroche).toBe("Premier texte");
    // Un changement : dans le brouillon seulement.
    const brouillon = (await a.agent.patch("/v1/ma-page").send({ accroche: "Texte pas encore publié", couleurBoutons: "#1971C2" }).expect(200)).body;
    expect(brouillon.publication.changementsAPublier).toBe(true);
    expect(brouillon.contenu.accroche).toBe("Texte pas encore publié");
    const enLigne = await lire();
    expect(enLigne.accroche).toBe("Premier texte");
    expect(enLigne.couleurBoutons).toBeNull();
    expect(JSON.stringify(enLigne)).not.toContain("pas encore publié");
    // Publier.
    expect((await a.agent.post("/v1/ma-page/publication").expect(201)).body.publication.changementsAPublier).toBe(false);
    expect(await lire()).toMatchObject({ accroche: "Texte pas encore publié", couleurBoutons: "#1971C2" });
    // Retirer de la ligne : 404 pour le visiteur, mais rien n'est effacé ; republier remet tout.
    expect((await a.agent.delete("/v1/ma-page/publication").expect(200)).body.reglages.visible).toBe(false);
    await anon().get("/v1/public/pages/toits-martin").expect(404);
    expect((await a.agent.get("/v1/ma-page").expect(200)).body.reglages.accroche).toBe("Texte pas encore publié");
    await a.agent.post("/v1/ma-page/publication").expect(201);
    expect((await lire()).accroche).toBe("Texte pas encore publié");
  });

  it("une page en ligne d'avant le brouillon (sans instantané) reste telle quelle jusqu'à la prochaine publication", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await a.agent.get("/v1/ma-page").expect(200);
    // L'état d'une page publiée avant le 27 novembre 2026 : visible, sans instantané.
    await ctx.prisma.pageEntreprise.update({ where: { companyId: a.companyId }, data: { visible: true, accroche: "Texte d'avant" } });
    expect((await lire()).accroche).toBe("Texte d'avant");
    expect((await a.agent.get("/v1/ma-page").expect(200)).body.publication.changementsAPublier).toBe(false);
    // Premier changement : ce qui était en ligne est figé d'abord.
    await a.agent.patch("/v1/ma-page").send({ accroche: "Nouveau texte" }).expect(200);
    expect((await lire()).accroche).toBe("Texte d'avant");
    const ligne = await ctx.prisma.pageEntreprise.findUniqueOrThrow({ where: { companyId: a.companyId } });
    expect(ligne.publie).toMatchObject({ version: 1, champs: { accroche: "Texte d'avant" } });
    await a.agent.post("/v1/ma-page/publication").expect(201);
    expect((await lire()).accroche).toBe("Nouveau texte");
  });

  it("les photos suivent la même règle : une nouvelle photo attend la publication ; une photo retirée disparaît aussi du site", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await a.agent.post("/v1/ma-page/accord-photos").expect(200);
    const chantier = (await a.agent.post("/v1/ma-page/realisations").send({ titre: "Toiture ardoise · Paimpol" }).expect(201)).body;
    const id = chantier.realisation.id as string;
    await a.agent.post("/v1/ma-page/photos").field("role", "galerie").field("realisationId", id).attach("file", await photo(), "a.jpg").expect(202);
    await service.traitementsTermines();
    await a.agent.post("/v1/ma-page/publication").expect(201);
    expect((await lire()).realisations).toHaveLength(1);
    // Une deuxième photo, dans un deuxième chantier : invisible tant que rien n'est publié.
    const deux = (await a.agent.post("/v1/ma-page/realisations").send({ titre: "Zinguerie · Perros-Guirec" }).expect(201)).body;
    const id2 = deux.realisation.id as string;
    await a.agent.post("/v1/ma-page/photos").field("role", "galerie").field("realisationId", id2).attach("file", await photo(), "b.jpg").expect(202);
    await service.traitementsTermines();
    expect((await lire()).realisations.map((r: { titre: string }) => r.titre)).toEqual(["Toiture ardoise · Paimpol"]);
    await a.agent.post("/v1/ma-page/publication").expect(201);
    expect((await lire()).realisations.map((r: { titre: string }) => r.titre)).toEqual(["Toiture ardoise · Paimpol", "Zinguerie · Perros-Guirec"]);
    // Un chantier renommé : l'ancien titre reste en ligne jusqu'à la publication.
    await a.agent.patch(`/v1/ma-page/realisations/${id}`).send({ titre: "Toiture neuve · Paimpol" }).expect(200);
    expect((await lire()).realisations[0].titre).toBe("Toiture ardoise · Paimpol");
    // Une photo retirée est effacée : elle quitte aussi le site en ligne.
    const photos = (await a.agent.get("/v1/ma-page").expect(200)).body.photos as { id: string; realisationId: string | null }[];
    await a.agent.delete(`/v1/ma-page/photos/${photos.find((p) => p.realisationId === id2)!.id}`).expect(200);
    expect((await lire()).realisations.map((r: { titre: string }) => r.titre)).toEqual(["Toiture ardoise · Paimpol"]);
  });

  it("DROIT DE PUBLIER : coupé par défaut ; allumé, publier demande un abonnement en cours (vérifié par le serveur)", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    process.env.SITE_PUBLICATION_PAYANTE = "on";
    expect((await a.agent.get("/v1/ma-page").expect(200)).body.publication.autorisee).toBe(false);
    const refus = await a.agent.post("/v1/ma-page/publication").expect(403);
    expect(refus.body.error.details).toMatchObject({ reason: "publication_reservee" });
    // « Page visible » passe par le même contrôle.
    await a.agent.patch("/v1/ma-page").send({ visible: true }).expect(403);
    await anon().get("/v1/public/pages/toits-martin").expect(404);
    // Abonné (période en cours) : permis. Aucun appel à Stripe : la ligne d'abonnement suffit.
    await ctx.prisma.abonnement.create({ data: { companyId: a.companyId, statut: "actif", fournisseur: "simule", formule: "pro", periodeFin: new Date(Date.now() + 20 * 86_400_000) } });
    await a.agent.post("/v1/ma-page/publication").expect(201);
    await lire();
    delete process.env.SITE_PUBLICATION_PAYANTE;
  });

  it("deux artisans isolés : l'un ne publie, ne lit ni ne retire jamais le site de l'autre", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Peinture Le Goff", ["painting"]);
    await a.agent.patch("/v1/ma-page").send({ accroche: "Chez Martin" }).expect(200);
    await a.agent.post("/v1/ma-page/publication").expect(201);
    await b.agent.patch("/v1/ma-page").send({ accroche: "Chez Le Goff" }).expect(200);
    await b.agent.delete("/v1/ma-page/publication").expect(200);
    expect((await lire()).accroche).toBe("Chez Martin");
    expect((await b.agent.get("/v1/ma-page").expect(200)).body.reglages.accroche).toBe("Chez Le Goff");
    expect((await a.agent.get("/v1/ma-page").expect(200)).body.reglages.accroche).toBe("Chez Martin");
  });

  it("ADRESSES : les noms réservés (messagerie, technique, marque) sont refusés ; l'ancienne adresse redirige", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await a.agent.post("/v1/ma-page/publication").expect(201);
    for (const adresse of ["mail", "www", "api-test", "mobiiz", "admin", "static", "mon-site"]) {
      const r = await a.agent.put("/v1/ma-page/adresse").send({ adresse });
      expect(r.status, adresse).toBe(400);
    }
    await a.agent.put("/v1/ma-page/adresse").send({ adresse: "couvreur-lannion" }).expect(200);
    expect((await anon().get("/v1/public/pages/toits-martin").expect(200)).body).toEqual({ redirection: "couvreur-lannion" });
    // Une adresse d'un autre ne se prend pas.
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Autre Couvreur", ["roofing"]);
    expect((await b.agent.put("/v1/ma-page/adresse").send({ adresse: "toits-martin" })).status).toBe(409);
  });
});
