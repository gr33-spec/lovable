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
  it("B ne lit, ne modifie, ne supprime et ne déclenche rien chez A", { timeout: 30_000 }, async () => {
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
      offre: "",
      bon: "",
      lot: "",
      cycle: "",
      besoinNegocie: "",
      recu: "",
      recuFichier: "",
      regroupementNegocie: "",
    };
    // Étape 6 : une offre de A, sur un lot choisi.
    const lotA = await ctx.prisma.lotGroupe.create({ data: { cle: "lib:a||", famille: "couverture", zone: "29", fenetreTot: new Date("2026-11-02"), fenetreTard: new Date("2026-11-20"), statut: "choisi", besoins: { connect: { id: ids.besoin } } } });
    const offreA = await ctx.prisma.offreArtisan.create({ data: { lotId: lotA.id, besoinId: ids.besoin, prixUnitaire: 10 } });
    ids.offre = offreA.id;
    ids.lot = lotA.id;
    // Étape 7 : le bon de commande de A, et sa livraison.
    const bonA = await ctx.prisma.bonCommande.create({ data: { offreId: offreA.id, negoceId: ids.negoce, livraison: { create: {} } } });
    ids.bon = bonA.id;
    // Le regroupement du mois (Greg, 22 octobre 2026) : une commande de A, son besoin dedans.
    const cycleA = await ctx.prisma.cycleCommande.create({ data: { mois: "2026-10", famille: "couverture", zone: "29", clotureLe: new Date("2026-10-25T11:00:00Z"), reponseAvant: new Date("2026-11-08T17:00:00Z"), relanceLe: new Date("2026-11-07T17:00:00Z"), phase: "resultats" } });
    await ctx.prisma.besoin.update({ where: { id: ids.besoin }, data: { cycleId: cycleA.id } });
    ids.cycle = cycleA.id;
    // Business model final (25 octobre 2026) : un regroupement négocié et le besoin de A dedans.
    const negocieA = await ctx.prisma.regroupementNegocie.create({ data: { cle: "ardoise:32x22", libelle: "Ardoise 32×22", famille: "couverture", departement: "29" } });
    ids.besoinNegocie = (await ctx.prisma.besoinNegocie.create({ data: { companyId, designation: "Ardoise 32×22", cle: "ardoise:32x22", famille: "couverture", quantite: 100, unite: "pièces", departement: "29", livraison: "29200 Brest", dateBesoin: new Date("2026-11-20"), statut: "declare", regroupementId: negocieA.id } })).id;
    ids.regroupementNegocie = negocieA.id;
    // R7 (27 octobre 2026) : un e-mail reçu sur l'adresse Mobiiz de A, avec son fichier.
    const recuA = await ctx.prisma.emailRecuArtisan.create({ data: { companyId, adresse: "toitures-a", de: "Négoce A <a@example.org>", objet: "Devis Toitures A", texte: "Toitures A", recuLe: new Date(), fichiers: { create: [{ nom: "devis-a.pdf", type: "application/pdf", taille: 4, contenu: new Uint8Array([37, 80, 68, 70]) }] } }, include: { fichiers: true } });
    ids.recu = recuA.id;
    ids.recuFichier = recuA.fichiers[0]!.id;
    // L'abonnement (24 octobre 2026) : une session de paiement simulé et une facture de A.
    await ctx.prisma.evenementAbonnement.create({ data: { companyId, type: "session", source: "simule", refExterne: "sim_session_de_a_000000" } });
    const factureA = await ctx.prisma.factureAbonnement.create({ data: { numero: "TEST-000001", serie: "TEST", rang: 1, companyId, raisonSociale: "Toitures A", periodeDebut: new Date(), periodeFin: new Date(), montantHtCentimes: 2900, tvaCentimes: 580, ttcCentimes: 3480, tauxTva: 20, emiseLe: new Date() } });
    const abonnementDeA = { session: "sim_session_de_a_000000", facture: factureA.id };
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
        // Étape 5 : le lien de réponse d'un négoce est un jeton, jamais un identifiant ; un jeton inconnu répond 404.
        [/\/reponse$/, "jeton-inconnu-de-b-0000000000000000"],
        [/\/groupe\/offres$/, ids.offre],
        [/\/groupe\/bons$/, ids.bon],
        // Étape 9 : l'admin (B n'est pas admin : 403, jamais une donnée de A).
        [/\/admin\/groupe\/lots$/, ids.lot],
        [/\/admin\/groupe\/factures$/, ids.lot],
        // La commande du mois : la ligne et la commande de A ; la grille du négoce est un jeton.
        [/\/commande-du-mois\/lignes$/, ids.besoin],
        [/\/commande-du-mois$/, ids.cycle],
        [/\/admin\/commande-du-mois\/cycles$/, ids.cycle],
        [/\/grille$/, "jeton-inconnu-de-b-0000000000000000"],
        // L'espace négoce (23 octobre 2026) : invitation, connexion et désabonnement sont des jetons signés.
        [/\/negoce\/(invitation|connexion|desabonner|opposition)$/, "jeton-inconnu-de-b.0000000000000000"],
        // RGPD (24 octobre 2026) : « Ne plus recevoir ces e-mails » est un jeton signé, comme l'opposition du négoce.
        [/\/emails\/stop$/, "jeton-inconnu-de-b.0000000000000000"],
        // L'abonnement : la session de paiement simulé et la facture de A.
        [/\/abonnement\/simulation$/, abonnementDeA.session],
        [/\/abonnement\/factures$/, abonnementDeA.facture],
        // Le pilotage admin : B n'est pas admin (403), quel que soit le détail demandé.
        [/\/admin\/pilotage\/detail$/, "a_risque"],
        [/\/admin\/pilotage\/apprentissage$/, abonnementDeA.facture],
        // La démo admin : B n'est pas admin (403), quel que soit le geste.
        [/\/admin\/pilotage\/demo$/, "jeu"],
        // Recentrage (25 octobre 2026) : la demande perso de A, le regroupement (cycle) de A ; le chiffrage en ligne est un jeton.
        [/\/demandes-perso$/, ids.priceRequest],
        [/\/regroupements$/, ids.cycle],
        [/\/public\/chiffrer$/, "jeton-inconnu-de-b-0000000000000000"],
        // Business model final : le besoin négocié de A ; B n'est pas chasseur (403) ; l'admin non plus.
        [/\/negocie\/besoins$/, ids.besoinNegocie],
        // R7 : l'e-mail reçu de A et son fichier.
        [/\/recus$/, ids.recu],
        [/\/fichiers$/, ids.recuFichier],
        [/\/chasseur\/regroupements$/, ids.regroupementNegocie],
        [/\/admin\/pilotage\/negoces$/, ids.negoce],
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
    // Ce qui répond sans session : la santé du service, le compteur et l'argument des tarifs de la page publique (un nombre, rien d'une
    // entreprise), et les demandes d'accès elles-mêmes (inscription, connexion…).
    // Les conditions négoce et la déconnexion de l'espace négoce se lisent sans compte (23 octobre 2026) : aucune donnée.
    expect(open.filter((o) => !/\/v1\/health|\/v1\/public\/(compteur|tarif|visite)|\/api\/auth|\/v1\/auth|\/v1\/negoce\/(conditions|deconnexion)/.test(o))).toEqual([]);
  });
});

