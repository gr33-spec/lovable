/**
 * LOGO OU PHOTO DU PROFIL MISSIONS (Greg, 12 novembre 2026, dossier de corrections UX, point 12). Côté serveur : dépôt,
 * remplacement, retrait ; type réel et forme vérifiés ; métadonnées retirées avant d'être gardées ; les initiales par
 * défaut ; isolation (seule MON entreprise change SON image, une entreprise bloquée ne la voit pas) ; signalement.
 */
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { jpeg, png } from "../../../packages/domain/test/images-profil.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const avant = { m: process.env.MISSIONS_V1, a: process.env.GROUPE_ADMINS };
beforeAll(async () => {
  process.env.MISSIONS_V1 = "on";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant.m === undefined) delete process.env.MISSIONS_V1;
  else process.env.MISSIONS_V1 = avant.m;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const image = (octets: Uint8Array, nom = "logo.jpg") => ({ octets: Buffer.from(octets), nom });

describe("image du profil Missions", () => {
  it("déposer, voir, remplacer, retirer : une seule image, sans métadonnées, sinon les initiales", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    let moi = (await a.agent.get("/v1/profil-public").expect(200)).body.entreprise;
    expect(moi).toMatchObject({ initiales: "TM", image: null });
    await a.agent.get(`/v1/profil-public/${a.companyId}/image`).expect(404);
    const j = image(jpeg(512, 512));
    moi = (await a.agent.put("/v1/profil-public/image").attach("file", j.octets, j.nom).expect(200)).body;
    expect(moi.image).toMatch(/^\d+$/);
    const lue = await a.agent.get(`/v1/profil-public/${a.companyId}/image`).buffer(true).parse((res, cb) => {
      const morceaux: Buffer[] = [];
      res.on("data", (d: Buffer) => morceaux.push(d));
      res.on("end", () => cb(null, Buffer.concat(morceaux)));
    });
    expect(lue.status).toBe(200);
    expect(lue.headers["content-type"]).toBe("image/jpeg");
    expect(lue.headers["x-content-type-options"]).toBe("nosniff");
    expect(lue.headers["cache-control"]).toContain("private");
    const texte = (lue.body as Buffer).toString("latin1");
    expect(texte).not.toMatch(/Exif|GPS|iPhone|Dupont/);
    // En base aussi, rien des métadonnées n'est gardé.
    const garde = await ctx.prisma.imageProfil.findUniqueOrThrow({ where: { companyId: a.companyId } });
    expect(Buffer.from(garde.contenu).toString("latin1")).not.toMatch(/Exif|GPS|iPhone|Dupont/);
    expect(garde.cote).toBe(512);
    // Remplacer : toujours une seule image, d'un autre type.
    const p = image(png(256, 256), "logo.png");
    await a.agent.put("/v1/profil-public/image").attach("file", p.octets, p.nom).expect(200);
    expect(await ctx.prisma.imageProfil.count()).toBe(1);
    expect((await a.agent.get(`/v1/profil-public/${a.companyId}/image`)).headers["content-type"]).toBe("image/png");
    // Retirer : les initiales reviennent ; rejouer ne casse rien.
    expect((await a.agent.delete("/v1/profil-public/image").expect(200)).body.image).toBeNull();
    await a.agent.delete("/v1/profil-public/image").expect(200);
    await a.agent.get(`/v1/profil-public/${a.companyId}/image`).expect(404);
  });

  it("refus avec une phrase : faux type (même renommé), pas carrée, trop grande, trop lourde, sans fichier", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    const refus = async (octets: Uint8Array, nom: string) => (await a.agent.put("/v1/profil-public/image").attach("file", Buffer.from(octets), nom)).body.error?.details;
    expect(await refus(new Uint8Array(Buffer.from("%PDF-1.4 pas une image")), "logo.jpg")).toMatchObject({ reason: "image_type", phrase: "Choisis une image JPEG ou PNG." });
    expect(await refus(new Uint8Array(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>")), "logo.png")).toMatchObject({ reason: "image_type" });
    expect(await refus(jpeg(640, 480), "photo.jpg")).toMatchObject({ reason: "image_carree" });
    expect(await refus(png(2048, 2048), "grand.png")).toMatchObject({ reason: "image_dimensions" });
    expect((await a.agent.put("/v1/profil-public/image").attach("file", Buffer.alloc(450_000, 0xff), "lourd.jpg")).status).toBeGreaterThanOrEqual(400);
    expect((await a.agent.put("/v1/profil-public/image").send({})).status).toBe(400);
    expect(await ctx.prisma.imageProfil.count()).toBe(0);
  });

  it("isolation : une autre entreprise voit l'image mais ne la change pas ; bloquée, elle ne la voit plus ; sans compte, rien", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    const b = await signUpWithCompany(ctx.app, "b@exemple.fr", "Zinc Le Gall", ["roofing"]);
    await a.agent.put("/v1/profil-public/image").attach("file", Buffer.from(jpeg(512, 512)), "logo.jpg").expect(200);
    await request(ctx.app.getHttpServer()).get(`/v1/profil-public/${a.companyId}/image`).expect(401);
    await b.agent.get(`/v1/profil-public/${a.companyId}/image`).expect(200);
    // B dépose SON image : celle de A ne bouge pas ; B la retire : celle de A reste.
    await b.agent.put("/v1/profil-public/image").attach("file", Buffer.from(png(256, 256)), "b.png").expect(200);
    expect((await a.agent.get(`/v1/profil-public/${a.companyId}/image`)).headers["content-type"]).toBe("image/jpeg");
    await b.agent.delete("/v1/profil-public/image").expect(200);
    expect(await ctx.prisma.imageProfil.count({ where: { companyId: a.companyId } })).toBe(1);
    await b.agent.get("/v1/profil-public/pas-un-identifiant/image").expect(404);
    // Signalement : écrit une fois, rejoué sans doublon ; jamais sur sa propre image ni sur une entreprise sans image.
    expect((await b.agent.post(`/v1/profil-public/${a.companyId}/image/signalement`).send({}).expect(200)).body).toEqual({ signale: true, deja: false });
    expect((await b.agent.post(`/v1/profil-public/${a.companyId}/image/signalement`).send({}).expect(200)).body).toEqual({ signale: true, deja: true });
    await a.agent.post(`/v1/profil-public/${a.companyId}/image/signalement`).send({}).expect(404);
    await a.agent.post(`/v1/profil-public/${b.companyId}/image/signalement`).send({}).expect(404);
    expect(await ctx.prisma.signalementMission.count({ where: { cibleId: a.companyId, motif: "image-profil" } })).toBe(1);
    // Bloquée dans un sens ou dans l'autre : plus d'image.
    await ctx.prisma.blocageEntreprise.create({ data: { companyId: a.companyId, cibleId: b.companyId } });
    await b.agent.get(`/v1/profil-public/${a.companyId}/image`).expect(404);
  });
});
