import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LIGNES_LECTURE_PAR_LOTS, type LectureDevis } from "@baticlair/domain";
import { LECTURE_READER, type LectureRequest } from "../src/modules/takeoff/application/lecture-reader.js";
import { FakeLectureReader } from "../src/modules/takeoff/infrastructure/fake-lecture-reader.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * LA LECTURE LOT PAR LOT (décision du fondateur, 24 octobre 2026, « option 1 ») : la vraie lecture de 7954 (trois métiers,
 * 8 pages) a été coupée ; un gros devis de plusieurs métiers est lu en UN APPEL PAR MÉTIER, chacun avec son référentiel,
 * puis fusionné. Un devis d'un seul métier garde l'appel unique. Un lot en échec : les autres s'affichent, et l'écran dit
 * « Je n'ai pas pu lire la partie …, ajoute-la à la main ou renvoie-la. »
 */
const appels: string[] = [];
let reperes: string[] = [];
let enPanne: string | null = null;
const PRISE = /prise/i;

/** Le modèle simulé : il suit la consigne du lot (ses lignes seulement) ; un lot « en panne » rend une réponse coupée. */
class LecteurParLots extends FakeLectureReader {
  override async lire(request: LectureRequest) {
    const lot = /SEULEMENT le lot « [^»]+ » \(([a-z_]+)\)/.exec(request.consigne ?? "")?.[1] ?? null;
    appels.push(lot ? `lot:${lot}` : request.referentiel.includes("=== Référentiel") ? "tous" : (request.trade ?? ""));
    const r = await super.lire(request);
    if (lot && lot === enPanne) return { ...r!, status: "invalid_output", output: null, errorCode: "max_tokens" } as ReadAttempt<LectureDevis>;
    const l = r?.output as LectureDevis | undefined;
    if (l && lot) {
      l.lignes = l.lignes.filter((x) => (lot === "electrical") === PRISE.test(x.designation));
      for (const x of l.lignes) for (const f of x.fournitures) if (PRISE.test(x.designation)) Object.assign(f, { ouvrage: "prise-16a", emplacement: null });
      l.metier = lot;
      l.lots = [{ metier: lot, libelle: lot === "electrical" ? "Électricité" : "Plomberie", lignes: l.lignes.map((x) => x.ref) }];
    }
    return r;
  }
  async reperer(): Promise<ReadAttempt<string[]> | null> {
    appels.push("reperage");
    return { status: "success", output: reperes, provider: "fake", model: "fake-rapide", usage: { inputTokens: 100, outputTokens: 5 }, errorCode: null, durationMs: 1 } as ReadAttempt<string[]>;
  }
}

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(LECTURE_READER).useValue(new LecteurParLots()));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  appels.length = 0;
  enPanne = null;
  await resetDatabase(ctx.prisma);
});

/** Un gros devis : assez de lignes pour passer lot par lot, moitié prises, moitié mitigeurs. */
const n = LIGNES_LECTURE_PAR_LOTS + 20;
const rows: FixtureRow[] = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? [`E${i}`, `Prise de courant 16A 2P+T pièce ${i}`, "2 u", "10,00", "20,00"] : [`P${i}`, `Mitigeur lavabo chromé pièce ${i}`, "1 u", "50,00", "50,00"]));

type Ecran = { lotsNonLus: string[]; purchase: { toBuy: { key: string; label: string }[]; screen: { groups: { label: string; rows: { itemKey?: string }[] }[] } } };
async function depose(agent: Agent): Promise<Ecran> {
  const pdf = await makePdf(["devis", "devis", "devis", "devis"], rows, "Total HT 9 999,00", "DEVIS 2026-500");
  const res = await agent.post("/v1/quantitatifs").field("reference", "2026-500").attach("file", Buffer.from(pdf), { filename: "devis.pdf", contentType: "application/pdf" });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return (await agent.get(`/v1/projects/${res.body.projetId as string}/takeoff`).expect(200)).body.takeoff as Ecran;
}

describe("lecture lot par lot", { timeout: 60_000 }, () => {
  it("un gros devis électricité + plomberie : un appel par métier, une section par lot", async () => {
    reperes = ["electrical", "plumbing"];
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A", ["roofing"]);
    const e = await depose(agent);
    expect(appels).toEqual(["reperage", "lot:electrical", "lot:plumbing"]);
    expect(e.purchase.screen.groups.map((g) => g.label)).toEqual(["Électricité", "Plomberie"]);
    expect(e.lotsNonLus).toEqual([]);
  });

  it("un lot en échec : l'autre s'affiche, et l'écran dit la partie non lue", async () => {
    reperes = ["electrical", "plumbing"];
    enPanne = "plumbing";
    const { agent } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B", ["roofing"]);
    const e = await depose(agent);
    expect(e.lotsNonLus).toEqual(["Je n'ai pas pu lire la partie plomberie, chauffage, ajoute-la à la main ou renvoie-la."]);
    const libelles = e.purchase.toBuy.map((b) => b.label);
    expect(libelles.some((l) => /Prise/.test(l))).toBe(true);
    expect(libelles.some((l) => /Mitigeur/.test(l))).toBe(false);
  });

  it("un gros devis d'un seul métier : l'appel unique", async () => {
    reperes = ["electrical"];
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Elec C", ["electrical"]);
    await depose(agent);
    expect(appels).toEqual(["reperage", "electrical"]);
  });
});
