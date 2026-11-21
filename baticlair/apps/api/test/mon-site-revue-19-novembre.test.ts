/**
 * « MON SITE », REVUE DU 19 NOVEMBRE 2026 (développeur senior et saboteur) : les limites tiennent quand tout arrive au même
 * instant, une demande de devis n'est jamais perdue, une photo bloquée ne reste pas bloquée, un champ refusé est nommé.
 */
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LIMITES_CONTACT, PageEntrepriseService } from "../src/modules/page-entreprise/application/page-entreprise.service.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
let service: PageEntrepriseService;
const DOSSIER = `${process.env.TMPDIR ?? "/tmp"}/mobiiz-pages-revue-${process.pid}`;
const avant = process.env.STOCKAGE_PHOTOS_DOSSIER;
beforeAll(async () => {
  process.env.STOCKAGE_PHOTOS_DOSSIER = DOSSIER;
  ctx = await createTestApp();
  service = ctx.app.get(PageEntrepriseService);
});
afterAll(async () => {
  await service.traitementsTermines();
  await ctx.app.close();
  if (avant === undefined) delete process.env.STOCKAGE_PHOTOS_DOSSIER;
  else process.env.STOCKAGE_PHOTOS_DOSSIER = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});
const anon = () => request(ctx.app.getHttpServer());
const photo = () => sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 90, g: 90, b: 110 } } }).jpeg().toBuffer();

describe("Mon site : la revue du 19 novembre 2026", () => {
  it("dix demandes de devis au même instant : la limite par visiteur tient, chaque demande gardée est une demande acceptée", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await a.agent.patch("/v1/ma-page").send({ visible: true }).expect(200);
    const r = await Promise.all(Array.from({ length: 10 }, (_, i) => anon().post("/v1/public/pages/toits-martin/contact").send({ nom: "Paul", telephone: "0600000000", message: `Message numéro ${i} pour vous` })));
    const acceptes = r.filter((x) => x.status === 200).length;
    expect(acceptes).toBe(LIMITES_CONTACT.parIpParHeure);
    expect(r.filter((x) => x.status !== 200).every((x) => x.status === 429)).toBe(true);
    expect(await ctx.prisma.messageSite.count({ where: { companyId: a.companyId } })).toBe(acceptes);
  });

  it("un nom sur plusieurs lignes n'entre jamais tel quel dans l'objet de l'e-mail", async () => {
    await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]).then((a) => a.agent.patch("/v1/ma-page").send({ visible: true }).expect(200));
    await anon().post("/v1/public/pages/toits-martin/contact").send({ nom: "Paul\nBcc: x@y.fr", telephone: "0600000000", message: "Une fuite sur le toit." }).expect(200);
    const mail = ctx.emails.sent.find((m) => m.subject.startsWith("Nouveau message"))!;
    expect(mail.subject).toBe("Nouveau message depuis votre page Mobiiz : Paul Bcc: x@y.fr");
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it("sans adresse où écrire, la demande reste dans l'app (avant : refusée, perdue)", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await a.agent.patch("/v1/ma-page").send({ visible: true }).expect(200);
    await ctx.prisma.company.update({ where: { id: a.companyId }, data: { contactEmail: null } });
    await ctx.prisma.membership.updateMany({ where: { companyId: a.companyId }, data: { role: "member" } });
    await anon().post("/v1/public/pages/toits-martin/contact").send({ nom: "Paul", telephone: "0600000000", message: "Une fuite sur le toit." }).expect(200);
    expect(await ctx.prisma.messageSite.count({ where: { companyId: a.companyId } })).toBe(1);
    expect(ctx.emails.sent.filter((m) => m.subject.startsWith("Nouveau message"))).toHaveLength(0);
  });

  it("vingt-cinq photos envoyées au même instant : vingt au plus", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await a.agent.post("/v1/ma-page/accord-photos").expect(200);
    const octets = await photo();
    const r = await Promise.all(Array.from({ length: 25 }, (_, i) => a.agent.post("/v1/ma-page/photos").attach("file", octets, `p${i}.jpg`)));
    await service.traitementsTermines();
    expect(r.filter((x) => x.status === 202).length).toBe(20);
    expect(await ctx.prisma.photoPage.count({ where: { companyId: a.companyId, role: "galerie" } })).toBe(20);
  });

  it("une photo restée « en traitement » plus de dix minutes passe « erreur » au ménage et ne compte plus", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    const bloquee = await ctx.prisma.photoPage.create({ data: { companyId: a.companyId, role: "galerie", ordre: 0, largeur: 600, hauteur: 400, octets: 10, createdAt: new Date(Date.now() - 30 * 60_000) } });
    const recente = await ctx.prisma.photoPage.create({ data: { companyId: a.companyId, role: "galerie", ordre: 1, largeur: 600, hauteur: 400, octets: 10 } });
    await service.menage();
    expect((await ctx.prisma.photoPage.findUniqueOrThrow({ where: { id: bloquee.id } })).statut).toBe("erreur");
    expect((await ctx.prisma.photoPage.findUniqueOrThrow({ where: { id: recente.id } })).statut).toBe("traitement");
  });

  it("un lien Google refusé nomme son champ, et un lien de redirection Google est refusé", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    for (const lien of ["https://www.google.com/url?q=https://arnaque.example", "https://goo.gl/abcd"]) {
      const r = await a.agent.patch("/v1/ma-page").send({ lienGoogle: lien }).expect(400);
      expect(r.body.error.details).toMatchObject({ reason: "lien_google", field: "lienGoogle" });
    }
    await a.agent.patch("/v1/ma-page").send({ lienGoogle: "https://maps.app.goo.gl/AbCd123" }).expect(200);
  });

  it("l'adresse du site d'une entreprise supprimée n'est jamais redonnée (un QR code imprimé ne mène jamais chez un autre)", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    expect((await a.agent.get("/v1/ma-page").expect(200)).body.reglages.adresse).toBe("toits-martin");
    await a.agent.put("/v1/ma-page/adresse").send({ adresse: "martin-couverture" }).expect(200);
    await ctx.prisma.company.delete({ where: { id: a.companyId } });
    expect((await ctx.prisma.adressePageReservee.findMany({ orderBy: { adresse: "asc" } })).map((x) => x.adresse)).toEqual(["martin-couverture", "toits-martin"]);
    // Une nouvelle entreprise du même nom prend une autre adresse, et ne peut pas demander l'ancienne.
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Toits Martin", ["roofing"]);
    expect((await b.agent.get("/v1/ma-page").expect(200)).body.reglages.adresse).not.toMatch(/^(toits-martin|martin-couverture)$/);
    expect((await b.agent.put("/v1/ma-page/adresse").send({ adresse: "toits-martin" }).expect(409)).body.error.details.reason).toBe("adresse_prise");
    await anon().get("/v1/public/pages/toits-martin").expect(404);
  });
});
