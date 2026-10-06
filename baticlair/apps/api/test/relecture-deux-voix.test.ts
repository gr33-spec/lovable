import type { ArtisanRound, SupplierReply, SupplierRound } from "@baticlair/domain";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { TAKEOFF_EXTRACTOR, type ExtractionAttempt, type TakeoffExtractor } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { TAKEOFF_REVIEWER, type ReviewInput, type TakeoffReviewer } from "../src/modules/takeoff/application/takeoff-reviewer.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LA RELECTURE À DEUX VOIX en vrai (décision du fondateur, 2026-10-05) : une IA lit le devis, le code calcule, puis
 * un fournisseur et un artisan (IA) discutent la liste. Le moindre doute qui reste passe la ligne ORANGE avec leurs
 * mots ; « C'est bon » le lève (journal). Aucune quantité ne bouge. Chaque tour est payé et mesuré.
 */
type Line = NonNullable<ExtractionAttempt["output"]>["lines"][number];
const line = (ref: string, designation: string, quantity: string, unit: string): Line => ({
  designation,
  quantity,
  unit,
  reference: null,
  sourceRefs: [ref],
  sourcePages: [1],
  doubt: null,
  section: [],
  dimensions: null,
});

class OneReading implements TakeoffExtractor {
  readonly provider = "anthropic";
  async extract(): Promise<ExtractionAttempt> {
    return {
      provider: this.provider,
      model: "claude-opus-5-5",
      usage: { inputTokens: 5000, outputTokens: 800 },
      status: "success",
      output: { lines: [line("1:3", "Gouttière zinc demi-ronde dév. 33", "20", "ml"), line("1:4", "Écran sous-toiture HPV", "100", "m²")], notes: [], context: null },
      errorCode: null,
      durationMs: 1,
    };
  }
}

const ok = <T,>(output: T | null): ReadAttempt<T> => ({
  provider: "anthropic",
  model: "claude-sonnet-5-5",
  usage: { inputTokens: 2000, outputTokens: 300 },
  status: output ? "success" : "provider_error",
  output,
  errorCode: output ? null : "http_529",
  durationMs: 1,
});

/** Le fournisseur trouve deux problèmes ; l'artisan en conteste un, le fournisseur le retire ; l'artisan signale un oubli. */
class Panel implements TakeoffReviewer {
  readonly provider = "anthropic";
  dossiers: string[] = [];
  failSupplier = false;
  async supplier(input: ReviewInput): Promise<ReadAttempt<SupplierRound>> {
    this.dossiers.push(input.dossier);
    if (this.failSupplier) return ok<SupplierRound>(null);
    const gouttiere = /^(A\d+) · Gouttière/m.exec(input.dossier)![1]!;
    const ecran = /^([AF]\d+) · Écran/m.exec(input.dossier)![1]!;
    return ok({
      remarques: [
        { article: gouttiere, sujet: "precision", texte: "Zinc naturel ou prépatiné ? Il me faut l'aspect." },
        { article: ecran, sujet: "quantite", texte: "2 rouleaux pour 100 m², c'est juste ?" },
      ],
    });
  }
  async artisan(): Promise<ReadAttempt<ArtisanRound>> {
    return ok({
      reponses: [
        { remarque: 1, accord: true, texte: "Le devis ne le dit pas." },
        { remarque: 2, accord: false, texte: "2 rouleaux de 75 m² couvrent 100 m² avec les recouvrements." },
      ],
      remarques: [{ article: null, sujet: "manque", texte: "Aucune descente alors qu'il y a 20 ml de gouttière." }],
    });
  }
  async reply(): Promise<ReadAttempt<SupplierReply>> {
    return ok({ objections: [{ remarque: 2, maintient: false, texte: "D'accord, ça passe." }], avis: [{ remarque: 1, accord: true, texte: "Il faut au moins une descente." }] });
  }
}

let ctx: TestContext;
const panel = new Panel();
beforeAll(async () => {
  const config = loadConfig({ ...process.env, AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test", AI_DOUBLE_READING: "off", AI_REVIEW_PANEL: "on" });
  ctx = await createTestApp((b) =>
    b.overrideProvider(CONFIG).useValue(config).overrideProvider(TAKEOFF_EXTRACTOR).useValue(new OneReading()).overrideProvider(TAKEOFF_REVIEWER).useValue(panel),
  );
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  panel.dossiers = [];
  panel.failSupplier = false;
});

type Row = { status: string; itemKey?: string; decisionKey?: string; reason?: string; pending?: { label: string } };
type Ecran = { purchase: { toBuy: { key: string; label: string; quantity: string | null }[]; screen: { groups: { rows: Row[] }[] } } };

async function read(email: string) {
  const { agent } = await signUpWithCompany(ctx.app, email, "Toitures Le Gall");
  const project = await agent.post("/v1/projects").send({ name: "Chantier relecture" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  expect((await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).status).toBe(201);
  const q = (await agent.get(`/v1/quantitatifs?projetId=${project.body.id}&ecran=1`)).body.items[0] as { id: string; ecran: Ecran };
  return { agent, q, rows: q.ecran.purchase.screen.groups.flatMap((g) => g.rows) };
}

describe("relecture à deux voix d'un devis", () => {
  it("le moindre doute passe la ligne orange avec leurs mots ; d'accord pour retirer : rien ; un oubli a sa ligne ; « C'est bon » le lève", async () => {
    const { agent, q, rows } = await read("r@example.fr");
    // Les relecteurs lisent le devis lu et la liste calculée, en texte.
    expect(panel.dossiers[0]).toMatch(/^DEVIS DU CLIENT/);
    const byLabel = (re: RegExp) => q.ecran.purchase.toBuy.find((b) => re.test(b.label))!;
    const gouttiere = rows.find((r) => r.itemKey === byLabel(/Gouttière/).key)!;
    expect(gouttiere).toMatchObject({ status: "check", decisionKey: `revue:${byLabel(/Gouttière/).key}`, reason: "Fournisseur : Zinc naturel ou prépatiné ? Il me faut l'aspect. — Artisan : Le devis ne le dit pas." });
    // L'écran : l'artisan a contesté, le fournisseur a retiré sa remarque → pas de doute de la relecture. Il ne reste
    // que la gouttière et l'oubli signalé par l'artisan.
    expect(rows.filter((r) => r.decisionKey?.startsWith("revue:"))).toHaveLength(2);
    const oubli = rows.find((r) => r.pending?.label === "Remarque de la relecture")!;
    expect(oubli).toMatchObject({ status: "check", decisionKey: expect.stringMatching(/^revue:dossier:/) });
    // Quatre appels payés et mesurés : une lecture, trois tours.
    expect(await ctx.prisma.aiExecution.count()).toBe(4);
    expect(await ctx.prisma.aiExecution.count({ where: { task: "takeoff_review" } })).toBe(3);
    // « C'est bon » sur le doute de la gouttière : il tombe, au journal ; la quantité n'a jamais bougé.
    const before = byLabel(/Gouttière/).quantity;
    const after = (await agent.post(`/v1/quantitatifs/${q.id}/reponses?ecran=1`).send({ reponses: [{ question: gouttiere.decisionKey, valeur: "ok" }] })).body as { ecran: Ecran };
    const rowsAfter = after.ecran.purchase.screen.groups.flatMap((g) => g.rows);
    expect(rowsAfter.find((r) => r.itemKey === byLabel(/Gouttière/).key)?.decisionKey ?? "").not.toMatch(/^revue:/);
    expect(after.ecran.purchase.toBuy.find((b) => /Gouttière/.test(b.label))!.quantity).toBe(before);
    expect(await ctx.prisma.correctionEvent.count({ where: { action: "confirm" } })).toBe(1);
  });

  it("une relecture impossible ne fait jamais passer la liste pour vérifiée", async () => {
    panel.failSupplier = true;
    const { rows } = await read("f@example.fr");
    expect(rows.find((r) => r.pending?.label === "Remarque de la relecture")).toMatchObject({ status: "check" });
  });
});
