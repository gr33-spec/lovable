import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LIGNES_LECTURE_PAR_LOTS, LIGNES_PAR_TRANCHE, type LectureDevis } from "@baticlair/domain";
import { LECTURE_READER, type LectureRequest, type Reperage } from "../src/modules/takeoff/application/lecture-reader.js";
import { FakeLectureReader } from "../src/modules/takeoff/infrastructure/fake-lecture-reader.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * LA LECTURE LOT PAR LOT (décision du fondateur, 24 octobre 2026, « option 1 ») : la vraie lecture de 7954 (trois métiers,
 * 8 pages) a été coupée ; un gros devis de plusieurs métiers est lu en UN APPEL PAR MÉTIER, chacun avec son référentiel,
 * puis fusionné. Un devis d'un seul métier garde l'appel unique. Un lot en échec : les autres s'affichent, et l'écran dit
 * « Je n'ai pas pu lire la partie …, ajoute-la à la main ou renvoie-la. »
 */
const appels: string[] = [];
let reperes: string[] = [];
let avecSections = false;
const vus: string[] = [];
let enPanne: string | null = null;
const PRISE = /prise/i;

/** Le modèle simulé : il suit la consigne du lot (ses lignes seulement) ; un lot « en panne » rend une réponse coupée. */
class LecteurParLots extends FakeLectureReader {
  override async lire(request: LectureRequest) {
    const lot = /lot « [^»]+ » \(([a-z_]+)\)/.exec(request.consigne ?? "")?.[1] ?? null;
    const tranche = /tranche (\d+) sur/.exec(request.consigne ?? "")?.[1];
    appels.push(lot ? `lot:${lot}${tranche ? `#${tranche}` : ""}:${request.document.numberedText.split("\n").filter((x) => /^\[\d+:\d+\]/.test(x)).length > 0 ? "texte" : "vide"}` : request.referentiel.includes("=== Référentiel") ? "tous" : (request.trade ?? ""));
    vus.push(request.document.numberedText);
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
  async reperer(numberedText: string): Promise<ReadAttempt<string[] | Reperage> | null> {
    appels.push("reperage");
    // Le repérage rend aussi les sections : le premier et le dernier repère des lignes de chaque métier.
    const refs = (re: RegExp) => numberedText.split("\n").filter((x) => re.test(x)).map((x) => /^\[(\d+:\d+)\]/.exec(x)?.[1]).filter((x): x is string => !!x);
    const sections = [["electrical", refs(PRISE)], ["plumbing", refs(/mitigeur/i)]].filter(([, r]) => r!.length > 0).map(([m, r]) => ({ metier: m as string, de: (r as string[])[0]!, a: (r as string[]).at(-1)! }));
    return { status: "success", output: avecSections ? { metiers: reperes, sections } : reperes, provider: "fake", model: "fake-rapide", usage: { inputTokens: 100, outputTokens: 5 }, errorCode: null, durationMs: 1 } as ReadAttempt<string[]>;
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
  avecSections = false;
  vus.length = 0;
  await resetDatabase(ctx.prisma);
});

/** Un gros devis : assez de lignes pour passer lot par lot, moitié prises, moitié mitigeurs. */
const n = LIGNES_LECTURE_PAR_LOTS + 20;
const rows: FixtureRow[] = Array.from({ length: n }, (_, i) => (i < 80 ? [`E${i}`, `Prise de courant 16A 2P+T pièce ${i}`, "2 u", "10,00", "20,00"] : [`P${i}`, `Mitigeur lavabo chromé pièce ${i}`, "1 u", "50,00", "50,00"]));

/** Un devis de plusieurs pages, 35 lignes par page (le gabarit des tests met tout sur une page). */
async function pdfLong(lignes: FixtureRow[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < lignes.length; p += 35) {
    const page = pdf.addPage([595.28, 841.89]);
    let y = 780;
    page.drawText("DEVIS 2026-500", { x: 40, y, size: 14, font });
    y -= 30;
    const cols = [40, 110, 370, 440, 505];
    ["Réf.", "Désignation", "Qté", "P.U. HT", "Total HT"].forEach((h, i) => page.drawText(h, { x: cols[i]!, y, size: 10, font }));
    for (const row of lignes.slice(p, p + 35)) {
      y -= 18;
      row.forEach((cell, i) => page.drawText(cell, { x: cols[i]!, y, size: 10, font }));
    }
  }
  return pdf.save();
}

type Ecran = { lotsNonLus: string[]; purchase: { toBuy: { key: string; label: string }[]; screen: { groups: { label: string; rows: { itemKey?: string }[] }[] } } };
async function depose(agent: Agent): Promise<Ecran> {

  const pdf = await pdfLong(rows);
  const res = await agent.post("/v1/quantitatifs").field("reference", "2026-500").attach("file", Buffer.from(pdf), { filename: "devis.pdf", contentType: "application/pdf" });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  const t = (await agent.get(`/v1/projects/${res.body.projetId as string}/takeoff`).expect(200)).body.takeoff as Ecran;
  return t;
}

describe("lecture lot par lot", { timeout: 60_000 }, () => {
  it("un gros devis électricité + plomberie : un appel par métier, une section par lot", async () => {
    reperes = ["electrical", "plumbing"];
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A", ["roofing"]);
    const e = await depose(agent);
    expect(appels).toEqual(["reperage", "lot:electrical:texte", "lot:plumbing:texte"]);
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

  it("avec les sections du repérage : chaque appel ne reçoit que ses lignes, un lot long en plusieurs tranches", async () => {
    reperes = ["electrical", "plumbing"];
    avecSections = true;
    const { agent } = await signUpWithCompany(ctx.app, "d@example.fr", "Toitures D", ["roofing"]);
    const e = await depose(agent);
    // 80 prises (plus les en-têtes de page) : plusieurs tranches, chacune sous la limite ; les mitigeurs à part.
    const elec = appels.filter((x) => x.startsWith("lot:electrical#"));
    expect(elec.length).toBeGreaterThanOrEqual(Math.ceil(80 / LIGNES_PAR_TRANCHE));
    expect(elec.every((x) => x.endsWith(":texte"))).toBe(true);
    expect(appels.filter((x) => x.startsWith("lot:plumbing#")).length).toBeGreaterThanOrEqual(1);
    // Aucun appel ne reçoit les lignes d'un autre lot, et chaque tranche tient sous la limite.
    const textes = appels.slice(1).map((a, i) => ({ a, t: vus[i]! }));
    for (const { a, t } of textes) {
      expect(a.startsWith("lot:electrical") ? /Mitigeur/.test(t) : /Prise/.test(t)).toBe(false);
      expect(t.split("\n").length).toBeLessThanOrEqual(LIGNES_PAR_TRANCHE);
    }
    expect(e.purchase.screen.groups.map((g) => g.label)).toEqual(["Électricité", "Plomberie"]);
    expect(e.purchase.toBuy.some((b) => /Mitigeur/.test(b.label)) && e.purchase.toBuy.some((b) => /Prise/.test(b.label))).toBe(true);
  });

  it("un gros devis d'un seul métier : l'appel unique", async () => {
    reperes = ["electrical"];
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Elec C", ["electrical"]);
    await depose(agent);
    expect(appels).toEqual(["reperage", "electrical"]);
  });
});
