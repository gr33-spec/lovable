/**
 * ISOLATION ENTRE ENTREPRISES, ROUTE PAR ROUTE (audit avant commercialisation, 2026-10-11). L'entreprise A remplit tout
 * (chantier de démonstration complet, quantitatif, devis déposé, fournisseur, clé partenaire, morceaux d'un envoi) ;
 * l'entreprise B appelle CHAQUE route de l'API (relevées sur l'application elle-même, aucune oubliée) avec les
 * identifiants de A. Aucune réponse 2xx, aucune 500, et les données de A sont intactes à la fin.
 */
import { randomUUID } from "node:crypto";
import type { Test } from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { confirmRemaining } from "./support/confirm.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
});

interface Route {
  method: string;
  path: string;
}

/** Les routes montées dans l'application (Express), telles que Nest les a enregistrées. */
function routes(): Route[] {
  const server = ctx.app.getHttpAdapter().getInstance() as { router?: { stack: unknown[] }; _router?: { stack: unknown[] } };
  const stack = (server.router ?? server._router)!.stack as { route?: { path: string; methods: Record<string, boolean> } }[];
  return stack.flatMap((l) => (l.route ? Object.keys(l.route.methods).map((m) => ({ method: m, path: l.route!.path })) : []));
}

describe("isolation entre entreprises, toutes les routes", () => {
  it("B ne lit, ne modifie, ne supprime et ne déclenche rien chez A", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B");

    // A : un chantier complet (démonstration : fournisseurs, demande, devis reçus, offres), un quantitatif, un devis
    // déposé, une clé partenaire, des morceaux d'envoi pas encore assemblés.
    const demo = (await a.agent.post("/v1/demo/project").expect(201)).body as { projectId: string };
    const demoDoc = (await a.agent.get(`/v1/projects/${demo.projectId}/documents`)).body.items[0] as { id: string };
    const takeoff = (await a.agent.post(`/v1/documents/${demoDoc.id}/takeoff`).expect(201)).body as { id: string; lines: { id: string; status: string }[] };
    for (const line of takeoff.lines.filter((l) => l.status === "to_verify")) await a.agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200);
    await confirmRemaining(a.agent, demo.projectId, takeoff.id);
    await a.agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);
    const suppliers = (await a.agent.get("/v1/suppliers")).body.items as { id: string }[];
    const request = (await a.agent.post(`/v1/projects/${demo.projectId}/price-requests`).send({ supplierIds: suppliers.map((x) => x.id) }).expect(201)).body as { recipients: { id: string }[] };
    await a.agent.post(`/v1/demo/recipients/${request.recipients[0]!.id}/quote`).expect(201);
    await a.agent.post(`/v1/price-request-recipients/${request.recipients[0]!.id}/analysis`).expect(201);
    const q = (
      await a.agent
        .post("/v1/quantitatifs")
        .send({ reference: "A", adresse: "1 rue de Siam, 29200 Brest", lignes: [{ libelle: "Gouttière zinc demi-ronde", quantite: "13", unite: "ml" }] })
    ).body as { id: string; projetId: string };
    const pdf = Buffer.from(await makePdf(["devis"]));
    const doc = (
      await a.agent.post(`/v1/projects/${demo.projectId}/documents`).field("purpose", "client_quote").attach("file", pdf, { filename: "devis-a.pdf", contentType: "application/pdf" })
    ).body as { id: string };
    const key = (await a.agent.post("/v1/partner-keys").send({ nom: "Intégration A", quotaMensuel: 5 })).body as { id: string };
    const uploadId = randomUUID();
    await a.agent.put(`/v1/uploads/${uploadId}/parts/0`).attach("file", pdf, { filename: "morceau", contentType: "application/octet-stream" }).expect(204);

    const companyId = a.companyId as string;
    const first = async <T>(p: Promise<T | null>, what: string): Promise<T> => {
      const v = await p;
      expect(v, what).not.toBeNull();
      return v!;
    };
    const ids = {
      project: demo.projectId,
      quantitatif: q.id,
      document: doc.id,
      partnerKey: key.id,
      upload: uploadId,
      supplier: (await first(ctx.prisma.supplier.findFirst({ where: { companyId } }), "fournisseur")).id,
      priceRequest: (await first(ctx.prisma.priceRequest.findFirst({ where: { companyId } }), "demande")).id,
      recipient: (await first(ctx.prisma.priceRequestRecipient.findFirst({ where: { priceRequest: { companyId } } }), "destinataire")).id,
      offerLine: (await first(ctx.prisma.supplierOfferLine.findFirst({ where: { offer: { companyId } } }), "ligne d'offre")).id,
      takeoff: (await first(ctx.prisma.takeoff.findFirst({ where: { companyId } }), "lecture")).id,
      takeoffLine: (await first(ctx.prisma.takeoffLine.findFirst({ where: { takeoff: { companyId } } }), "ligne lue")).id,
      // BatiClair Groupé : un besoin de A (le drapeau éteint, ses routes répondent 404 ; allumé, l'appartenance refuse).
      besoin: (
        await ctx.prisma.besoin.create({
          data: { companyId, projectId: demo.projectId, takeoffId: takeoff.id, articleKey: "a", designation: "Besoin de A", cle: "lib:a||", famille: "couverture", quantite: "1", unite: "u", zone: "29", adresseLivraison: "29200 Brest", fenetreTot: new Date("2026-11-02"), fenetreTard: new Date("2026-11-20"), statut: "en_attente" },
        })
      ).id,
      // Étape 3 : un négoce dans la liste de A (le lien artisan-négoce est à A ; le négoce, lui, est à la base du département).
      negoce: (
        await ctx.prisma.negoce.create({
          data: { nom: "Négoce de A", email: "negoce-a@example.com", departement: "29", familles: ["couverture"], ajouteParId: companyId, artisans: { create: { companyId, rang: 1, numeroCompte: "A-1" } } },
        })
      ).id,
    };
    const idFor = (path: string, param: string): string => {
      if (param === "projectId" || param === "projetId") return ids.project;
      if (param === "uploadId") return ids.upload;
      if (param === "index") return "0";
      const prefix = path.split("/:")[0]!;
      const byPrefix: [RegExp, string][] = [
        [/\/projects$/, ids.project],
        [/\/quantitatifs$/, ids.quantitatif],
        [/\/documents$/, ids.document],
        [/\/partner-keys$/, ids.partnerKey],
        [/\/suppliers$/, ids.supplier],
        [/\/price-requests$/, ids.priceRequest],
        [/\/(price-request-)?recipients$/, ids.recipient],
        [/\/offer-lines$/, ids.offerLine],
        [/\/takeoffs$/, ids.takeoff],
        [/\/takeoff-lines$/, ids.takeoffLine],
        [/\/groupe\/besoins$/, ids.besoin],
        [/\/groupe\/negoces$/, ids.negoce],
      ];
      const hit = byPrefix.find(([re]) => re.test(prefix));
      if (!hit) throw new Error(`Paramètre sans identifiant de A : ${path} (${param})`);
      return hit[1];
    };

    const all = routes().filter((r) => r.path.includes("/:"));
    expect(all.length).toBeGreaterThan(40);
    const leaks: string[] = [];
    for (const r of all) {
      const url = r.path.replace(/:(\w+)/g, (_, p: string) => idFor(r.path, p));
      const req = (b.agent as unknown as Record<string, (u: string) => Test>)[r.method]!(url);
      // Un corps plausible pour chaque verbe d'écriture : la route doit refuser avant de le regarder.
      const res = r.method === "get" || r.method === "delete" ? await req : await req.send({ name: "B", reponses: [], ligne: { libelle: "x", quantite: "1", unite: "u" }, supplierIds: [], code: "x" });
      // Une lecture qui répond sans rien de A (une liste vide) ne fuit pas ; toute écriture acceptée, toute 500, toute
      // réponse qui contient un identifiant ou un nom de A, si.
      const body = JSON.stringify(res.body ?? "") + (res.text ?? "");
      const seesA = [...Object.values(ids), "Toitures A", "devis-a.pdf"].some((v) => body.includes(v));
      const ok = res.status >= 200 && res.status < 400;
      if (res.status >= 500 || (ok && (r.method !== "get" || seesA))) leaks.push(`${r.method.toUpperCase()} ${r.path} → ${res.status} ${body.slice(0, 160)}`);
    }
    // Deuxième passe : les écritures avec un corps VALIDE (celui des tests de chaque module) et un fichier quand la route en
    // attend un, pour que le refus vienne de l'appartenance, jamais d'un corps mal formé.
    const bSupplier = (await b.agent.post("/v1/suppliers").send({ name: "Fournisseur B", email: "b-fournisseur@example.com" })).body.id as string;
    const file = { filename: "f.pdf", contentType: "application/pdf" };
    const valid: [string, string, Record<string, unknown> | "file"][] = [
      ["patch", `/v1/projects/${ids.project}`, { clientName: "Volé" }],
      ["post", `/v1/projects/${ids.project}/documents`, "file"],
      ["put", `/v1/uploads/${ids.upload}/parts/1`, "file"],
      ["patch", `/v1/takeoff-lines/${ids.takeoffLine}`, { designation: "Volé", quantity: "1", unit: "u" }],
      ["post", `/v1/takeoffs/${ids.takeoff}/lines`, { designation: "Volé", quantity: "1", unit: "u" }],
      ["post", `/v1/takeoffs/${ids.takeoff}/decisions`, { action: "pieces", lineIds: [ids.takeoffLine], pieceLineIds: [] }],
      ["post", `/v1/takeoffs/${ids.takeoff}/answers`, { key: "product:faitiere", value: null }],
      ["patch", `/v1/suppliers/${ids.supplier}`, { notes: "Volé" }],
      ["post", `/v1/projects/${ids.project}/price-requests`, { supplierIds: [bSupplier] }],
      ["post", `/v1/projects/${ids.project}/price-requests/preview`, {}],
      ["post", `/v1/price-requests/${ids.priceRequest}/recipients`, { supplierIds: [bSupplier] }],
      ["patch", `/v1/price-requests/${ids.priceRequest}/classification`, { classified: true, retainedSupplierIds: [ids.supplier] }],
      ["patch", `/v1/price-request-recipients/${ids.recipient}`, { status: "declined" }],
      ["post", `/v1/price-requests/${ids.priceRequest}/order`, { supplierId: ids.supplier, outcome: "as_is" }],
      ["post", `/v1/price-requests/${ids.priceRequest}/order/document`, "file"],
      ["post", `/v1/price-request-recipients/${ids.recipient}/quote`, "file"],
      ["patch", `/v1/offer-lines/${ids.offerLine}`, { requestLine: null }],
      ["post", `/v1/quantitatifs/${ids.quantitatif}/reponses`, { reponses: [{ question: "engine:param:faconnage", valeur: "1" }] }],
      ["post", `/v1/quantitatifs/${ids.quantitatif}/corrections`, { action: "modifier", cle: "param:pente", valeur: "40" }],
      ["put", `/v1/projects/${ids.project}/infos`, { texte: "Volé" }],
      ["post", `/v1/projects/${ids.project}/infos/croquis`, "file"],
    ];
    for (const [method, url, body] of valid) {
      const req = (b.agent as unknown as Record<string, (u: string) => Test>)[method]!(url);
      const res = body === "file" ? await req.field("purpose", "client_quote").field("supplierId", ids.supplier).attach("file", pdf, file) : await req.send(body);
      // Avec un corps valide, tout refus convient (404 le plus souvent ; 400 « liste à valider » ou « envoi inconnu » quand la
      // recherche, filtrée par entreprise, ne trouve rien) ; une réponse acceptée ou une 500, jamais.
      if (res.status < 400 || res.status >= 500) leaks.push(`${method.toUpperCase()} ${url} (corps valide) → ${res.status} ${JSON.stringify(res.body).slice(0, 160)}`);
    }

    // Les listes sans identifiant (chantiers, fournisseurs, clés, prochaines actions…) : B n'y voit rien de A.
    const lists = routes().filter((r) => r.method === "get" && !r.path.includes("/:") && !/\.csv$|internal|health/.test(r.path));
    expect(lists.length).toBeGreaterThan(8);
    for (const r of lists) {
      const res = await b.agent.get(r.path);
      const body = JSON.stringify(res.body ?? "") + (res.text ?? "");
      if (res.status >= 500 || [...Object.values(ids), "Toitures A", "devis-a.pdf"].some((v) => body.includes(v))) leaks.push(`GET ${r.path} → ${res.status} ${body.slice(0, 160)}`);
    }
    // B tente aussi d'assembler les morceaux que A a envoyés, dans son propre chantier.
    const own = (await b.agent.post("/v1/projects").send({ name: "Chantier B" })).body.id as string;
    const stolen = await b.agent.post(`/v1/projects/${own}/documents`).field("purpose", "client_quote").field("uploadId", uploadId).field("parts", "1").field("fileName", "vol.pdf");
    if (stolen.status < 400) leaks.push(`assemblage des morceaux de A → ${stolen.status}`);
    expect(leaks).toEqual([]);

    // Rien n'a bougé chez A.
    await a.agent.get(`/v1/projects/${ids.project}`).expect(200);
    await a.agent.get(`/v1/quantitatifs/${ids.quantitatif}`).expect(200);
    await a.agent.get(`/v1/documents/${ids.document}`).expect(200);
    await a.agent.get(`/v1/suppliers/${ids.supplier}`).expect(200);
    expect((await a.agent.get("/v1/partner-keys")).body.items[0].revoqueeLe).toBeNull();
    expect(await ctx.prisma.uploadPart.count({ where: { uploadId } })).toBe(1);
  });

  it("sans session, chaque route refuse (sauf les pages publiques)", async () => {
    const { default: request } = await import("supertest");
    const anon = request(ctx.app.getHttpServer());
    const open: string[] = [];
    for (const r of routes()) {
      const url = r.path.replace(/:(\w+)/g, () => randomUUID());
      try {
        const res = await (anon as unknown as Record<string, (u: string) => Test>)[r.method]!(url).set("origin", "http://localhost:3000");
        if (res.status < 400 || res.status >= 500) open.push(`${r.method.toUpperCase()} ${r.path} → ${res.status}`);
      } catch (e) {
        open.push(`${r.method.toUpperCase()} ${r.path} → ${(e as Error).message}`);
      }
    }
    // Ce qui répond sans session : la santé du service, et les demandes d'accès elles-mêmes (inscription, connexion…).
    expect(open.filter((o) => !/\/v1\/health|\/api\/auth|\/v1\/auth/.test(o))).toEqual([]);
  });
});

