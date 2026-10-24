import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ChoixService, CommandeService, DemandeService, RapportMensuelService, RegroupementService } from "../src/modules/groupe/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * PLAN 2 DU 21 OCTOBRE 2026, BLOC 7 : LES TESTS DE CHARGE. 200 artisans, 50 lots, 1 000 besoins, 20 négoces ; on mesure
 * les routes de l'artisan et de l'admin, puis chaque étape de la tâche planifiée (regrouper, demandes, choix, bons de
 * commande, factures, rapport mensuel). Lancé à la demande (`CHARGE=1`), jamais dans la série ordinaire : il écrit dans
 * `docs/PERFORMANCE.md` à la main, pas dans la CI. Objectif : aucune route au-dessus d'une seconde ; une tâche se mesure
 * par lot (elle tourne hors ligne, une fois par jour).
 */
const ACTIF = process.env.CHARGE === "1";
const ZONES = ["22", "29", "35", "56", "44"] as const;
const REFS = 10;
const ARTISANS_PAR_ZONE = 40;
const BESOINS_PAR_REF = 20;

let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, GROUPE_ADMINS: process.env.GROUPE_ADMINS, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  if (!ACTIF) return;
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  if (!ACTIF) return;
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) if (v === undefined) delete process.env[k];
  else process.env[k] = v;
});

const mesures: { etape: string; ms: number; unite: string; note: string }[] = [];
async function mesurer<T>(etape: string, f: () => Promise<T>, note = "", unite = "appel"): Promise<T> {
  const t0 = performance.now();
  const r = await f();
  mesures.push({ etape, ms: Math.round(performance.now() - t0), unite, note });
  return r;
}

describe.skipIf(!ACTIF)("charge : 200 artisans, 50 lots, 1 000 besoins", { timeout: 1_800_000 }, () => {
  it("routes sous une seconde ; tâche planifiée mesurée par lot", async () => {
    const p = ctx.prisma;
    const fenetre = { tot: new Date("2026-11-09T00:00:00Z"), tard: new Date("2026-11-23T00:00:00Z") };
    // 20 négoces (4 par département), 200 artisans (40 par département) avec un chantier et un quantitatif.
    const negoces = [];
    for (const z of ZONES) for (let i = 0; i < 4; i++) negoces.push(await p.negoce.create({ data: { nom: `Négoce ${z}-${i}`, email: `negoce-${z}-${i}@example.com`, departement: z, familles: ["couverture"] } }));
    const artisans: { companyId: string; projectId: string; takeoffId: string; zone: string; adresse: string }[] = [];
    for (const z of ZONES) {
      for (let i = 0; i < ARTISANS_PAR_ZONE; i++) {
        const user = await p.user.create({ data: { id: randomUUID(), name: `Artisan ${z}-${i}`, email: `artisan-${z}-${i}@example.fr`, emailVerified: true } });
        const adresse = `${i + 1} rue de la Charge, ${z}000 Ville`;
        const company = await p.company.create({ data: { name: `Toitures ${z}-${i}`, trades: ["roofing"], address: adresse, siret: "73282932000074", siretVerifieLe: new Date() } });
        await p.membership.create({ data: { companyId: company.id, userId: user.id, role: "owner" } });
        await p.negoceArtisan.create({ data: { companyId: company.id, negoceId: negoces[ZONES.indexOf(z) * 4 + (i % 4)]!.id, rang: 1 } });
        const project = await p.project.create({ data: { companyId: company.id, name: `Chantier ${z}-${i}`, address: adresse, createdById: user.id } });
        const takeoff = await p.takeoff.create({ data: { companyId: company.id, projectId: project.id, source: "lignes", trade: "roofing", status: "validated", promptId: "charge", promptVersion: 1, model: "charge" } });
        artisans.push({ companyId: company.id, projectId: project.id, takeoffId: takeoff.id, zone: z, adresse });
      }
    }
    // 1 000 besoins signés, libres : 5 départements × 10 références × 20 artisans.
    let besoins = 0;
    for (const z of ZONES) {
      const duDepartement = artisans.filter((a) => a.zone === z);
      for (let r = 0; r < REFS; r++) {
        for (let k = 0; k < BESOINS_PAR_REF; k++) {
          const a = duDepartement[(r * 7 + k) % duDepartement.length]!;
          await p.besoin.create({ data: { companyId: a.companyId, projectId: a.projectId, takeoffId: a.takeoffId, articleKey: `charge:${r}:${k}`, designation: `Ardoise charge ${r} 32 × 22`, cle: `charge-ardoise-${r}`, famille: "couverture", quantite: 1000 + k * 50, unite: "pièces", zone: z, adresseLivraison: a.adresse, fenetreTot: fenetre.tot, fenetreTard: fenetre.tard, statut: "signe", signeLe: new Date() } });
          besoins++;
        }
      }
    }
    expect(besoins).toBe(1000);
    // Greg : un vrai compte (admin), dans le 22, avec un besoin dans chaque référence du 22.
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "BATI INVEST", ["roofing"]);
    await p.company.update({ where: { id: greg.companyId }, data: { address: "6 impasse du Ouipoure, 22620 Ploubazlanec", siret: "73282932000074", siretVerifieLe: new Date() } });
    await greg.agent.post("/v1/groupe/negoces").send({ nom: "Mon négoce", email: "negoce-22-0@example.com", familles: ["couverture"] }).expect(201);
    const projet = await p.project.create({ data: { companyId: greg.companyId, name: "Chantier Greg", address: "6 impasse du Ouipoure, 22620 Ploubazlanec" } });
    const takeoff = await p.takeoff.create({ data: { companyId: greg.companyId, projectId: projet.id, source: "lignes", trade: "roofing", status: "validated", promptId: "charge", promptVersion: 1, model: "charge" } });
    for (let r = 0; r < REFS; r++) await p.besoin.create({ data: { companyId: greg.companyId, projectId: projet.id, takeoffId: takeoff.id, articleKey: `charge:${r}:greg`, designation: `Ardoise charge ${r} 32 × 22`, cle: `charge-ardoise-${r}`, famille: "couverture", quantite: 1200, unite: "pièces", zone: "22", adresseLivraison: "6 impasse du Ouipoure, 22620 Ploubazlanec", fenetreTot: fenetre.tot, fenetreTard: fenetre.tard, statut: "signe", signeLe: new Date() } });

    // Routes de l'artisan et de l'admin, avant les lots.
    const api = (chemin: string) => mesurer(`GET ${chemin}`, async () => (await greg.agent.get(chemin).expect(200)).body);
    await api("/v1/groupe");
    await api("/v1/groupe/lots");
    await api("/v1/groupe/negoces");
    await api(`/v1/projects/${projet.id}/groupe`);
    await api("/v1/admin/groupe");

    // La tâche planifiée, étape par étape.
    const regroupement = ctx.app.get(RegroupementService);
    const range = await mesurer("cron : regrouper (ranger + former)", () => regroupement.tachePlanifiee(new Date("2026-10-27T07:00:00Z")), "1 010 besoins → 50 lots", "tâche");
    expect(range.lotsCrees).toBe(50);
    expect(range.lotsFormes).toBe(50);
    const demandes = await mesurer("cron : demandes aux négoces", () => ctx.app.get(DemandeService).envoyerLesLotsFormes(new Date("2026-10-27T07:00:00Z")), "50 lots, 20 négoces, 20 e-mails avec PDF", "tâche");
    expect(demandes.lotsEnvoyes).toBe(50);
    expect(demandes.negocesPrevenus).toBe(20);
    // Chaque négoce répond à chacun de ses lots (prix lus), directement en base : la lecture du PDF n'est pas mesurée ici.
    const reponses = await p.reponseNegoce.findMany({ include: { lot: { select: { cle: true } } } });
    expect(reponses).toHaveLength(200);
    for (const [i, r] of reponses.entries()) await p.reponseNegoce.update({ where: { id: r.id }, data: { deposeLe: new Date(), statutExtraction: "lue", prix: [{ cle: r.lot.cle, palier: null, prixUnitaire: (0.9 + (i % 4) * 0.02).toFixed(2).replace(".", ",") }], delaiJours: 6 } });
    for (const lot of await p.lotGroupe.findMany({ select: { id: true } })) await p.accordNegoce.createMany({ data: reponses.filter((r) => r.lotId === lot.id).map((r) => ({ lotId: lot.id, negoceId: r.negoceId, versionContrat: "2026-10-20", tauxPourcent: 2, email: "x@example.com", adresseIp: "203.0.113.1" })) });
    const choix = await mesurer("cron : choix des négoces + bons de commande + factures", () => ctx.app.get(ChoixService).choisirLesLotsEnvoyes(new Date("2026-10-28T07:00:00Z")), "50 lots, 1 010 bons (un PDF chacun), 50 factures, 1 010 e-mails artisans", "tâche");
    expect(choix.lotsChoisis).toBe(50);
    expect(await p.bonCommande.count()).toBe(1010);
    const relances = await mesurer("cron : relances factures + livraisons + livraisons du jour", async () => {
      const c = ctx.app.get(CommandeService);
      return { f: await c.relancerLesFactures(new Date("2026-12-15T07:00:00Z")), l: await c.relancerLesLivraisons(new Date("2026-12-15T07:00:00Z")), j: await c.prevenirLesLivraisonsDuJour(new Date("2026-11-09T07:00:00Z")) };
    }, "50 factures échues, 1 010 livraisons", "tâche");
    expect(relances.f.relancees).toBe(50);
    const rapport = await mesurer("cron : rapport mensuel", () => ctx.app.get(RapportMensuelService).envoyer(new Date("2026-11-01T07:00:00Z")), "201 entreprises", "tâche");
    expect(rapport.envoyes).toBe(201);

    // Les routes, une fois les lots passés.
    await api("/v1/groupe");
    await api("/v1/groupe/lots");
    await api(`/v1/projects/${projet.id}/groupe`);
    await api("/v1/admin/groupe");
    const admin = (await greg.agent.get("/v1/admin/groupe").expect(200)).body as { lots: unknown[] };
    const lotId = (admin.lots[0] as { id: string }).id;
    await api(`/v1/admin/groupe/lots/${lotId}`);
    await api("/v1/groupe/economies");
    await mesurer("GET /v1/admin/groupe/factures.csv", async () => (await greg.agent.get("/v1/admin/groupe/factures.csv").expect(200)).text);
    await mesurer("GET /v1/internal/rapport-mensuel (déjà fait)", async () => request(ctx.app.getHttpServer()).get("/v1/internal/rapport-mensuel?maintenant=2026-11-01T07:00:00Z").set("authorization", "Bearer secret-de-la-tache").expect(200));

    // Le tableau, lisible dans la sortie du test.
    const lignes = mesures.map((m) => `| ${m.etape} | ${m.ms} ms | ${m.note} |`);
    console.log(["| Étape | Durée | Volume |", "|---|---|---|", ...lignes].join("\n"));
    for (const m of mesures.filter((m) => m.unite === "appel")) expect(m.ms, m.etape).toBeLessThan(1000);
  });
});
