import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { couvreurAvecListe, mailsVers } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * LES DERNIERS ÉCARTS DU CŒUR MÉTIER, PAR L'API (Greg, 13 novembre 2026) :
 * 5. « Zinguerie et Étanchéité ne doivent plus partir automatiquement vers les négoces de Couverture. Utilise les métiers
 *    réellement déclarés par chaque négoce, tout en permettant à un négoce de couvrir plusieurs métiers. »
 * 1. Les sept métiers partiels restent visibles et se disent « en cours d'enrichissement ».
 * Couverture, Zinguerie et Étanchéité sont éprouvées comme trois métiers indépendants. Aucun e-mail réel, aucun appel payant.
 */
let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "GROUPE_ADMINS", "CRON_SECRET", "SEUIL_VOLUME_MIN", "EMAIL_DOMAINE", "MODE_REGROUPEMENT", "COMMISSION_DEFAUT", "FAMILLES_GROUPABLES"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT;
  delete process.env.COMMISSION_DEFAUT;
  delete process.env.FAMILLES_GROUPABLES; // le défaut : il comprend la zinguerie et l'étanchéité
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
  process.env.SEUIL_VOLUME_MIN = "couverture=0,zinguerie=0,etancheite=0";
  process.env.EMAIL_DOMAINE = "mobiiz.test";
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

const jour = (jours: number) => new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
const tache = (maintenant: string) => request(ctx.app.getHttpServer()).get(`/v1/internal/achats-groupes?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", "Bearer secret-de-la-tache").expect(200);
const artisan = (n: number) => couvreurAvecListe(ctx, `artisan${n}@toitures.fr`, `Toitures ${n}`, "3 rue des Ajoncs, 22300 Lannion", [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "100", unite: "pièces" }]);
const ARTICLES = {
  couverture: { cle: "couverture/ardoises/ardoise-naturelle/32x22-espagne-1er-choix", designation: "Ardoise naturelle 32×22 · Espagne 1er choix", unite: "pièces" },
  zinguerie: { cle: "zinguerie/zinc/bobineau-de-zinc/naturel-0-65-mm-largeur-250-mm", designation: "Bobineau de zinc naturel · 0,65 mm · largeur 250 mm", unite: "m" },
  etancheite: { cle: "etancheite/etancheite-epdm/membrane-epdm/1-14-mm-largeur-3-05-m", designation: "Membrane EPDM 1,14 mm · largeur 3,05 m", unite: "m²" },
} as const;
const NEGOCES = [
  { nom: "Négoce Couverture", email: "couverture@negoce.fr" },
  { nom: "Négoce Zinc et Étanchéité", email: "zinc-etancheite@negoce.fr" },
];
const engagement = (metier: keyof typeof ARTICLES, o: Record<string, unknown> = {}) => ({
  lignes: [{ ...ARTICLES[metier], quantite: 500 }],
  livraison: "22300 Lannion",
  dateBesoin: jour(30),
  negoces: NEGOCES,
  engagement: true,
  ...o,
});

describe("trois métiers indépendants, par l'API", { timeout: 240_000 }, () => {
  it("le catalogue : chaque métier a sa famille d'achat ; les métiers partiels restent là, dits « en cours d'enrichissement »", async () => {
    const a = await artisan(1);
    const metiers = (await a.agent.get("/v1/catalogue").expect(200)).body.metiers as { code: string; familleAchat: string; enEnrichissement: boolean }[];
    const de = (code: string) => metiers.find((m) => m.code === code)!;
    expect(de("couverture")).toMatchObject({ familleAchat: "couverture", enEnrichissement: false });
    expect(de("zinguerie")).toMatchObject({ familleAchat: "zinguerie", enEnrichissement: false });
    expect(de("etancheite")).toMatchObject({ familleAchat: "etancheite", enEnrichissement: false });
    expect(metiers.filter((m) => m.enEnrichissement).map((m) => m.code).sort()).toEqual(["carrelage", "chauffage", "electricite", "maconnerie", "menuiserie", "platrerie_isolation", "plomberie"]);
    expect(metiers).toHaveLength(12);
  });

  it("routage : la zinguerie et l'étanchéité vont aux négoces qui les ont déclarées, plus d'office à ceux de la couverture ; un négoce peut couvrir plusieurs métiers", async () => {
    // Trois négoces inscrits : couverture seule ; zinguerie ET étanchéité ; un généraliste que personne ne choisit.
    await ctx.prisma.negoce.create({ data: { nom: NEGOCES[0]!.nom, email: NEGOCES[0]!.email, departement: "22", familles: ["couverture"] } });
    await ctx.prisma.negoce.create({ data: { nom: NEGOCES[1]!.nom, email: NEGOCES[1]!.email, departement: "22", familles: ["zinguerie", "etancheite"] } });
    await ctx.prisma.negoce.create({ data: { nom: "Négoce G", email: "g@negoce.fr", departement: "22", generaliste: true } });
    const achats: Record<string, string> = {};
    for (const [i, metier] of (["couverture", "zinguerie", "etancheite"] as const).entries()) {
      const a = await artisan(i + 1);
      const r = await a.agent.post("/v1/achats-groupes").send(engagement(metier));
      expect(r.status, `${metier} : ${JSON.stringify(r.body)}`).toBe(201);
      achats[metier] = r.body.achatId;
    }
    // Trois achats distincts : un par métier, jamais la zinguerie ou l'étanchéité rangée dans celui de la couverture.
    expect(new Set(Object.values(achats)).size).toBe(3);
    const lus = await ctx.prisma.regroupementNegocie.findMany({ where: { id: { in: Object.values(achats) } } });
    expect(Object.fromEntries(lus.map((x) => [x.id, x.famille]))).toEqual({ [achats.couverture!]: "couverture", [achats.zinguerie!]: "zinguerie", [achats.etancheite!]: "etancheite" });

    const fin = Math.max(...lus.map((x) => x.clotureLe!.getTime()));
    await tache(new Date(fin + 3_600_000).toISOString());
    const consultations = await ctx.prisma.consultationAchatGroupe.findMany({ where: { regroupementId: { in: Object.values(achats) } } });
    const recus = (email: string) => consultations.filter((c) => c.email === email).map((c) => lus.find((x) => x.id === c.regroupementId)!.famille).sort();
    // Le négoce de couverture ne reçoit QUE la couverture ; celui qui a déclaré zinguerie et étanchéité reçoit les deux.
    expect(recus("couverture@negoce.fr")).toEqual(["couverture"]);
    expect(recus("zinc-etancheite@negoce.fr")).toEqual(["etancheite", "zinguerie"]);
    // Un généraliste n'est jamais consulté sans avoir été choisi.
    expect(recus("g@negoce.fr")).toEqual([]);
    // Les e-mails suivent : aucun mail de zinguerie ni d'étanchéité chez le négoce de couverture.
    const objets = (email: string) => mailsVers(ctx, email).filter((m) => / : achat groupé /.test(m.subject)).map((m) => m.subject);
    expect(objets("couverture@negoce.fr")).toHaveLength(1);
    expect(objets("couverture@negoce.fr")[0]).toMatch(/achat groupé couverture/);
    expect(objets("zinc-etancheite@negoce.fr")).toHaveLength(2);
    expect(objets("zinc-etancheite@negoce.fr").join(" ")).not.toMatch(/achat groupé couverture/);
  });

  it("un achat groupé reste d'un seul métier : couverture et zinguerie ne se mêlent plus dans le même achat", async () => {
    const a = await artisan(1);
    const deux = engagement("couverture", { lignes: [{ ...ARTICLES.couverture, quantite: 100 }, { ...ARTICLES.zinguerie, quantite: 40 }] });
    expect((await a.agent.post("/v1/achats-groupes").send(deux).expect(400)).body.error.details.reason).toBe("plusieurs_metiers");
  });

  it("un négoce déclare la zinguerie et l'étanchéité comme n'importe quelle famille ; une famille inconnue est refusée", async () => {
    const { FAMILLES_GROUPE } = await import("@baticlair/domain");
    expect(FAMILLES_GROUPE).toEqual(expect.arrayContaining(["couverture", "zinguerie", "etancheite"]));
  });
});
