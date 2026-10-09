import type { CompletionWire } from "@baticlair/domain";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { PROMPT_B_41_2, QUANTITATIF_PASS, quantitatifSystem, type QuantitatifInput, type QuantitatifPass } from "../src/modules/takeoff/application/quantitatif-pass.js";
import { TAKEOFF_EXTRACTOR, type ExtractionAttempt, type TakeoffExtractor } from "../src/modules/takeoff/application/takeoff-extractor.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * DEUX APPELS IA MAX PAR DEVIS (décision du fondateur, 2026-10-06) : la lecture, puis le quantitatif en un passage
 * (prompt B du §41.2, couvreur ET comptoir). Le moteur calcule ; l'appel n° 2 propose des ajouts (fixations,
 * scellements, étanchéité, consommables) et des doutes avec remplacement : tout sort ORANGE. Les interdits du code
 * passent aussi en orange. « Oui, on l'ajoute » fait entrer la ligne ; rien ne bouge sans l'artisan.
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
  calls = 0;
  async extract(): Promise<ExtractionAttempt> {
    this.calls++;
    return {
      provider: this.provider,
      model: "claude-opus-5-5",
      usage: { inputTokens: 5000, outputTokens: 800 },
      status: "success",
      output: { lines: [line("1:3", "Gouttière zinc demi-ronde dév. 33", "20", "ml"), line("1:4", "Ardoises naturelles 32x22", "120", "m²")], notes: [], context: { client: "M. et Mme DUPONT", adresse: "3 rue de Siam, 29200 Brest" } },
      errorCode: null,
      durationMs: 1,
    };
  }
}

class Pass implements QuantitatifPass {
  readonly provider = "anthropic";
  inputs: QuantitatifInput[] = [];
  async complete(input: QuantitatifInput): Promise<ReadAttempt<CompletionWire>> {
    this.inputs.push(input);
    const gouttiere = /^(A\d+) · Gouttière/m.exec(input.dossier)![1]!;
    return {
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      usage: { inputTokens: 4000, outputTokens: 600 },
      status: "success",
      output: {
        // §41.2 : « ajouts » TOUJOURS vide ; ce que l'IA y mettrait quand même est ignoré.
        ajouts: ["Mastic silicone neutre, cartouche 310 ml"],
        doutes: [{ repere: gouttiere, raison: "Zinc naturel ou prépatiné ? Le comptoir doit le savoir.", proposition: "Gouttière zinc naturel demi-ronde dév. 33" }],
      },
      errorCode: null,
      durationMs: 1,
    };
  }
}

let ctx: TestContext;
const reader = new OneReading();
const pass = new Pass();
beforeAll(async () => {
  const config = loadConfig({ ...process.env, AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test", AI_QUANTITATIF: "on" });
  ctx = await createTestApp((b) => b.overrideProvider(CONFIG).useValue(config).overrideProvider(TAKEOFF_EXTRACTOR).useValue(reader).overrideProvider(QUANTITATIF_PASS).useValue(pass));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  reader.calls = 0;
  pass.inputs = [];
});

type Row = { status: string; itemKey?: string; decisionKey?: string; reason?: string; pending?: { label: string; quantity: string | null } };
type Decision = { key: string; primary: { label: string }; suggestion?: { label: string; quantity: string | null; unit: string | null } };
type Ecran = { lines: { designation: string }[]; aiSuggestions: { key: string; label: string; quantity: string | null; unit: string | null; reason: string }[]; view: { decisions: Decision[] }; purchase: { toBuy: { key: string; label: string; quantity: string | null }[]; screen: { groups: { rows: Row[] }[] } } };

describe("le prompt de l'appel n° 2", () => {
  it("le prompt B du §41.2 (réécrit) est branché mot pour mot, puis le référentiel chargé ; plus de bloc « MODE UN SEUL PASSAGE » ajouté", () => {
    const doc = readFileSync(new URL("../../../docs/referentiel-couverture.md", import.meta.url), "utf8");
    const b = doc.slice(doc.indexOf("### 41.2 Prompt B"), doc.indexOf("### 41.3")).split("```")[1]!.replace(/^\n|\n$/g, "");
    expect(PROMPT_B_41_2).toBe(b);
    const system = quantitatifSystem({ metier: "Couverture", entreprise: "Toitures Le Gall", ville: "Brest", referentiel: "- Gouttière : crochets" });
    expect(system).toContain("Tu es le vendeur de comptoir du négoce qui relit la demande de devis de Toitures Le Gall, Couverture à Brest, avant de la passer au magasin.");
    expect(system).toContain("- ajouts : TOUJOURS une liste vide.");
    expect(system).not.toMatch(/MODE UN SEUL PASSAGE|RÈGLE NUMÉRO UN|\{[a-z_]+\}/);
    expect(system.endsWith("RÉFÉRENTIEL CHARGÉ :\n- Gouttière : crochets")).toBe(true);
  });
});

describe("deux appels IA max : lecture + quantitatif", () => {
  it("doutes en orange ; un « ajout » rendu malgré tout par l'IA n'apparaît nulle part (règle numéro un)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "q@example.fr", "Toitures Le Gall");
    const project = await agent.post("/v1/projects").send({ name: "Chantier deux appels", address: "3 rue de Siam, 29200 Brest" });
    const doc = await agent
      .post(`/v1/projects/${project.body.id}/documents`)
      .field("purpose", "client_quote")
      .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
    expect((await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).status).toBe(201);
    // §48 : la lecture seule d'abord ; les questions de comptoir avant le calcul ; l'appel n° 2 part avec « Calculer ».
    const before = (await agent.get(`/v1/quantitatifs?projetId=${project.body.id}`)).body.items[0] as { id: string; phase: string };
    expect(before.phase).toBe("questions");
    expect(pass.inputs).toHaveLength(0);
    const calcul = await agent.post(`/v1/quantitatifs/${before.id}/calcul`).send({ reponses: [] });
    expect(calcul.status).toBe(200);
    expect(calcul.body.phase).toBe("resultat");
    // Un deuxième appui ne relance rien.
    await agent.post(`/v1/quantitatifs/${before.id}/calcul`).send({});
    // Deux appels, pas un de plus.
    expect(reader.calls).toBe(1);
    expect(pass.inputs).toHaveLength(1);
    expect(await ctx.prisma.aiExecution.count()).toBe(2);
    expect(await ctx.prisma.aiExecution.count({ where: { task: "takeoff_quantitatif" } })).toBe(1);
    expect(pass.inputs[0]).toMatchObject({ entreprise: "Toitures Le Gall", ville: "Brest" });

    const q = (await agent.get(`/v1/quantitatifs?projetId=${project.body.id}&ecran=1`)).body.items[0] as { id: string; ecran: Ecran };
    const rows = q.ecran.purchase.screen.groups.flatMap((g) => g.rows);
    const gouttiere = q.ecran.purchase.toBuy.find((b) => /Gouttière/.test(b.label))!;
    // Le doute de l'IA (avec son remplacement) colore la ligne de la gouttière.
    // §50.3 : la raison en cinq mots au plus.
    expect(rows.find((r) => r.itemKey === gouttiere.key)).toMatchObject({ status: "check", decisionKey: `ia-doute:${gouttiere.key}`, reason: "Zinc naturel ou prépatiné ?" });
    // §48.4 : plus aucune question après la sortie de la liste (celles laissées sans réponse sont closes au calcul).
    expect(q.ecran.view.decisions.filter((d) => (d as { question?: unknown }).question)).toEqual([]);
    // Une question laissée vide (la pose des crochets de gouttière…) ne disparaît pas : sa ligne sort orange, « … à préciser »
    // (§50.4 : plus de préfixe « Info manquante : »). §49.2.5 : elle part telle quelle d'un « C'est bon ».
    const manque = rows.filter((r) => r.reason?.endsWith("à préciser"));
    expect(manque.length).toBeGreaterThan(0);
    for (const r of manque) expect(r).toMatchObject({ status: "check", decisionKey: expect.stringMatching(/^ratio:|^manque:/) });
    expect(rows.filter((r) => /Info manquante/.test(r.reason ?? ""))).toEqual([]);
    expect(q.ecran.view.decisions.find((d) => d.key === `ia-doute:${gouttiere.key}`)!.suggestion).toEqual({ label: "Gouttière zinc naturel demi-ronde dév. 33", quantity: null, unit: null });
    // RÈGLE NUMÉRO UN : l'ajout que l'IA rend malgré la consigne (un mastic que le devis n'écrit pas) n'est NI dans la
    // liste, NI une ligne orange, NI une suggestion.
    expect(rows.some((r) => r.pending?.label === "Mastic silicone neutre, cartouche 310 ml")).toBe(false);
    expect(q.ecran.view.decisions.some((d) => d.key.startsWith("ia-ajout:"))).toBe(false);
    expect(q.ecran.aiSuggestions).toEqual([]);
    expect(q.ecran.purchase.toBuy.some((b) => /mastic/i.test(b.label))).toBe(false);
    expect(await ctx.prisma.aiExecution.count()).toBe(2);
  });
});

describe("nouveau chantier = déposer le PDF (§48)", () => {
  it("le chantier né du dépôt prend le nom du client lu dans le devis, son adresse ; un nom donné n'est jamais remplacé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "n@example.fr", "Toitures Le Gall");
    const fresh = await agent.post("/v1/projects").send({ name: "Nouveau chantier" });
    const named = await agent.post("/v1/projects").send({ name: "Toiture de la grange" });
    for (const p of [fresh, named]) {
      const doc = await agent
        .post(`/v1/projects/${p.body.id}/documents`)
        .field("purpose", "client_quote")
        .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
      expect((await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).status).toBe(201);
    }
    expect((await agent.get(`/v1/projects/${fresh.body.id}`)).body).toMatchObject({ name: "Chantier Dupont", clientName: "M. et Mme DUPONT", address: "3 rue de Siam, 29200 Brest" });
    expect((await agent.get(`/v1/projects/${named.body.id}`)).body.name).toBe("Toiture de la grange");
  });
});
