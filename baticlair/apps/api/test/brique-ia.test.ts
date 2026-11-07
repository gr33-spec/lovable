import { z } from "zod";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/platform/config/config.js";
import { AnthropicDocumentReader } from "../src/platform/ai/anthropic-document-reader.js";
import { fabriqueIa } from "../src/platform/ai/fabrique-ia.js";
import { empreinte, LecteurEnregistre } from "../src/platform/ai/lecteur-enregistre.js";
import type { ReadRequest } from "../src/platform/ai/lecteur-ia.js";
import { OpenAiDocumentReader } from "../src/platform/ai/openai-document-reader.js";
import { IaLectureReader } from "../src/modules/takeoff/infrastructure/ia-lecture-reader.js";

/**
 * LA BRIQUE IA, REMPLAÇABLE PAR CONFIGURATION (revue du 26 octobre 2026, lot 1) : un contrat (`LecteurIa`), une fabrique
 * choisie par `AI_PROVIDER`, trois adaptateurs (Anthropic, réponses enregistrées, second fournisseur en squelette). Aucun
 * appel réseau réel : le faux réseau répond comme le fournisseur.
 */
const base = { DATABASE_URL: "postgresql://x@localhost/db", AUTH_SECRET: "a".repeat(32), NODE_ENV: "test" };
const schema = z.object({ articles: z.array(z.object({ nom: z.string(), quantite: z.number() })) });
const demande: ReadRequest<typeof schema> = {
  system: "Lis la liste.",
  schema,
  document: { numberedText: "[1:001] 20 pots de blanc mat 15 L", imagePdf: null, imagePages: [] },
  documentName: "liste",
  tag: "liste-v1",
};

describe("la fabrique suit la configuration", () => {
  it("anthropic par défaut avec une clé ; openai et enregistre sur demande ; rien sans clé", () => {
    expect(fabriqueIa(loadConfig({ ...base, BATICLAIR_ANTHROPIC_KEY: "k" }))!({ model: "m", effort: "low" })).toBeInstanceOf(AnthropicDocumentReader);
    const openai = fabriqueIa(loadConfig({ ...base, AI_PROVIDER: "openai", OPENAI_API_KEY: "k" }))!({ model: "gpt-x", effort: "high" });
    expect(openai).toBeInstanceOf(OpenAiDocumentReader);
    expect(openai.model).toBe("gpt-x");
    expect(fabriqueIa(loadConfig({ ...base, AI_PROVIDER: "enregistre" }))!({ model: "m", effort: "low" }).provider).toBe("enregistre");
    expect(fabriqueIa(loadConfig(base))).toBeNull();
    expect(loadConfig({ ...base, AI_TIMEOUT_MS: "30000" }).ai.timeoutMs).toBe(30000);
    expect(() => loadConfig({ ...base, AI_PROVIDER: "openai" })).toThrow(/OPENAI_API_KEY/);
    expect(loadConfig({ ...base, AI_PROVIDER: "openai", OPENAI_API_KEY: "k" }).ai.keySource).toBe("OPENAI_API_KEY");
  });

  it("le code métier ne voit que le contrat : la lecture d'un devis prend le fournisseur de la fabrique", () => {
    const lecture = new IaLectureReader(() => new LecteurEnregistre({}, "modele-x"), "modele-x", "high");
    expect(lecture.provider).toBe("enregistre");
  });
});

describe("les réponses enregistrées", () => {
  it("rejouent par étiquette, puis par étiquette et empreinte du texte ; sinon une panne propre", async () => {
    const lu = await new LecteurEnregistre({ "liste-v1": { articles: [{ nom: "Blanc mat 15 L", quantite: 20 }] } }).read(demande);
    expect(lu).toMatchObject({ status: "success", output: { articles: [{ nom: "Blanc mat 15 L", quantite: 20 }] }, usage: { inputTokens: 0 } });
    const precis = await new LecteurEnregistre({ "liste-v1": { articles: [] }, [`liste-v1#${empreinte(demande.document.numberedText)}`]: { articles: [{ nom: "Précis", quantite: 1 }] } }).read(demande);
    expect(precis.output?.articles[0]?.nom).toBe("Précis");
    expect(await new LecteurEnregistre({}).read(demande)).toMatchObject({ status: "provider_error", errorCode: "pas_d_enregistrement" });
    expect(await new LecteurEnregistre({ "liste-v1": { autre: 1 } }).read(demande)).toMatchObject({ status: "invalid_output", errorCode: "schema" });
  });
});

describe("le second fournisseur (squelette)", () => {
  const reponse = (corps: unknown, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(corps) });

  it("envoie le schéma en JSON Schema strict, relit la réponse avec le même schéma et compte les jetons", async () => {
    const envois: { url: string; corps: Record<string, unknown> }[] = [];
    const fauxReseau = (url: string, init: { body: string }) => {
      envois.push({ url, corps: JSON.parse(init.body) as Record<string, unknown> });
      return reponse({ model: "gpt-x-2026", output_text: JSON.stringify({ articles: [{ nom: "Blanc mat 15 L", quantite: 20 }] }), usage: { input_tokens: 120, output_tokens: 30 } });
    };
    const lu = await new OpenAiDocumentReader("k", "gpt-x", "high", fauxReseau as never).read(demande);
    expect(lu).toMatchObject({ provider: "openai", model: "gpt-x-2026", status: "success", usage: { inputTokens: 120, outputTokens: 30 } });
    expect(envois[0]!.url).toBe("https://api.openai.com/v1/responses");
    expect(envois[0]!.corps).toMatchObject({ model: "gpt-x", instructions: "Lis la liste.", text: { format: { type: "json_schema", strict: true } } });
  });

  it("une réponse hors schéma, une erreur HTTP ou une page en image donnent une tentative ratée, jamais une exception", async () => {
    expect(await new OpenAiDocumentReader("k", "m", "low", (() => reponse({ output_text: "{\"x\":1}" })) as never).read(demande)).toMatchObject({ status: "invalid_output", errorCode: "schema" });
    expect(await new OpenAiDocumentReader("k", "m", "low", (() => reponse({}, false, 429)) as never).read(demande)).toMatchObject({ status: "provider_error", errorCode: "http_429" });
    const scanne = { ...demande, document: { ...demande.document, imagePdf: new Uint8Array([1]), imagePages: [1] } };
    expect(await new OpenAiDocumentReader("k", "m", "low").read(scanne)).toMatchObject({ status: "provider_error", errorCode: "pdf_image_non_pris" });
  });
});
