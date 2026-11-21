/**
 * LES FICHIERS CHIFFRÉS AU REPOS, BRANCHÉS (lot B, Greg, 26 octobre puis 16 novembre 2026 : « Sans cette clé, rien ne doit
 * pouvoir être chiffré. »). Avec `CHIFFREMENT_CLE` : un fichier déposé est illisible en base et se relit à l'identique par
 * l'application ; sans la clé, il ne se relit pas (erreur franche). Les fichiers déjà en base se chiffrent et se remettent en
 * clair par le script, sans perte. La liste des colonnes de fichiers suit le schéma.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import type request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { jpeg } from "../../../packages/domain/test/images-profil.js";
import { Chiffreur, CleDeChiffrementAbsente, estChiffre, lireCle } from "../src/platform/chiffrement/chiffreur.js";
import { COLONNES_DE_FICHIERS, convertirFichiers } from "../src/platform/chiffrement/fichiers.js";
import { PrismaService } from "../src/platform/database/prisma.service.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const avant = { m: process.env.MISSIONS_V1, c: process.env.CHIFFREMENT_CLE };
const cle = randomBytes(32).toString("base64");
beforeAll(async () => {
  process.env.MISSIONS_V1 = "on";
  process.env.CHIFFREMENT_CLE = cle;
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [nom, v] of [["MISSIONS_V1", avant.m], ["CHIFFREMENT_CLE", avant.c]] as const) {
    if (v === undefined) delete process.env[nom];
    else process.env[nom] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const lireImage = (agent: ReturnType<typeof request.agent>, companyId: string) =>
  agent.get(`/v1/profil-public/${companyId}/image`).buffer(true).parse((res, cb) => {
    const morceaux: Buffer[] = [];
    res.on("data", (d: Buffer) => morceaux.push(d));
    res.on("end", () => cb(null, Buffer.concat(morceaux)));
  });

describe("fichiers chiffrés au repos, de bout en bout", () => {
  it("la liste des colonnes de fichiers est celle du schéma (toute colonne d'octets y figure)", () => {
    const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
    const vues: string[] = [];
    for (const bloc of schema.split(/^model /m).slice(1)) {
      const table = /@@map\("([^"]+)"\)/.exec(bloc)?.[1];
      for (const l of bloc.split("\n")) {
        const m = /^\s+(\w+)\s+Bytes\??(\s|$)/.exec(l);
        if (m) vues.push(`${table}.${/@map\("([^"]+)"\)/.exec(l)?.[1] ?? m[1]}`);
      }
    }
    expect(vues.sort()).toEqual(COLONNES_DE_FICHIERS.map(([t, c]) => `${t}.${c}`).sort());
  });

  it("avec la clé : illisible en base, relu à l'identique par l'application ; sans la clé, erreur franche", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await a.agent.put("/v1/profil-public/image").attach("file", Buffer.from(jpeg(512, 512)), "logo.jpg").expect(200);
    // L'application relit l'image telle qu'elle l'a gardée.
    const garde = await ctx.prisma.imageProfil.findUniqueOrThrow({ where: { companyId: a.companyId } });
    expect(estChiffre(garde.contenu)).toBe(false);
    expect(Buffer.from(garde.contenu).subarray(0, 2).toString("hex")).toBe("ffd8");
    const lue = await lireImage(a.agent, a.companyId);
    expect(lue.status).toBe(200);
    expect((lue.body as Buffer).equals(Buffer.from(garde.contenu))).toBe(true);
    // En base, sans passer par le déchiffrement : illisible.
    const [brute] = await ctx.prisma.$brut.$queryRaw<{ contenu: Uint8Array }[]>`SELECT contenu FROM image_profil`;
    expect(estChiffre(brute!.contenu)).toBe(true);
    expect(Buffer.from(brute!.contenu).includes(Buffer.from(garde.contenu).subarray(0, 64))).toBe(false);
    // Sans la clé (ou avec une autre) : jamais un contenu illisible servi, une erreur.
    const sans = new PrismaService(process.env.DATABASE_URL!);
    const autre = new PrismaService(process.env.DATABASE_URL!, new Chiffreur(randomBytes(32)));
    try {
      await expect(sans.imageProfil.findUniqueOrThrow({ where: { companyId: a.companyId } })).rejects.toBeInstanceOf(CleDeChiffrementAbsente);
      await expect(autre.imageProfil.findUniqueOrThrow({ where: { companyId: a.companyId } })).rejects.toThrow();
      // Ce qui n'est pas un fichier se lit toujours.
      expect(await sans.imageProfil.count()).toBe(1);
    } finally {
      await sans.$disconnect();
      await autre.$disconnect();
    }
  });

  it("le script : relevé, remise en clair, chiffrement, rejouable, sans perte ; rien sans la clé", async () => {
    const a = await signUpWithCompany(ctx.app, "a@exemple.fr", "Toits Martin", ["roofing"]);
    await a.agent.put("/v1/profil-public/image").attach("file", Buffer.from(jpeg(256, 256)), "logo.jpg").expect(200);
    const origine = Buffer.from((await ctx.prisma.imageProfil.findUniqueOrThrow({ where: { companyId: a.companyId } })).contenu);
    const chiffreur = new Chiffreur(lireCle(cle));
    const ligne = (r: Awaited<ReturnType<typeof convertirFichiers>>) => r.find((x) => x.table === "image_profil")!;
    // Relevé seul : rien n'est écrit.
    expect(ligne(await convertirFichiers(ctx.prisma.$brut, chiffreur))).toMatchObject({ total: 1, chiffres: 1, convertis: 0 });
    // Sans la clé : refus, rien n'est touché.
    await expect(convertirFichiers(ctx.prisma.$brut, new Chiffreur(null), "dechiffrer")).rejects.toThrow(/CHIFFREMENT_CLE/);
    // Une mauvaise clé s'arrête au premier fichier, qui reste intact.
    await expect(convertirFichiers(ctx.prisma.$brut, new Chiffreur(randomBytes(32)), "dechiffrer")).rejects.toThrow();
    expect(ligne(await convertirFichiers(ctx.prisma.$brut, chiffreur))).toMatchObject({ chiffres: 1 });
    // Remise en clair, puis rejouée : plus rien à faire.
    expect(ligne(await convertirFichiers(ctx.prisma.$brut, chiffreur, "dechiffrer"))).toMatchObject({ total: 1, chiffres: 0, convertis: 1 });
    expect(ligne(await convertirFichiers(ctx.prisma.$brut, chiffreur, "dechiffrer"))).toMatchObject({ convertis: 0 });
    const [clair] = await ctx.prisma.$brut.$queryRaw<{ contenu: Uint8Array }[]>`SELECT contenu FROM image_profil`;
    expect(Buffer.from(clair!.contenu).equals(origine)).toBe(true);
    // Un fichier déposé avant la clé se relit tel quel par l'application.
    expect(((await lireImage(a.agent, a.companyId)).body as Buffer).equals(origine)).toBe(true);
    // Chiffrement des fichiers déjà là, puis rejoué.
    expect(ligne(await convertirFichiers(ctx.prisma.$brut, chiffreur, "chiffrer"))).toMatchObject({ chiffres: 1, convertis: 1 });
    expect(ligne(await convertirFichiers(ctx.prisma.$brut, chiffreur, "chiffrer"))).toMatchObject({ chiffres: 1, convertis: 0 });
    expect(((await lireImage(a.agent, a.companyId)).body as Buffer).equals(origine)).toBe(true);
  });
});
