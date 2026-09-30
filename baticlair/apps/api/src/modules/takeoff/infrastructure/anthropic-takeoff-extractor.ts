import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AiUsage } from "@baticlair/domain";
import { TAKEOFF_PROMPT, takeoffSystemPrompt } from "../application/prompt.js";
import {
  extractionOutputSchema,
  type ExtractionAttempt,
  type ExtractionRequest,
  type TakeoffExtractor,
} from "../application/takeoff-extractor.js";

const NO_USAGE: AiUsage = { inputTokens: 0, outputTokens: 0 };

function toUsage(usage: Anthropic.Usage): AiUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWrite5mTokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? usage.cache_creation_input_tokens ?? 0,
    cacheWrite1hTokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
  };
}

/**
 * Lecture d'un devis client par Claude (API Anthropic). Sortie structurée
 * (schéma JSON imposé) ; le code vérifie ensuite chaque ligne contre le
 * texte du devis. Aucune donnée n'est conservée par ce module.
 */
export class AnthropicTakeoffExtractor implements TakeoffExtractor {
  readonly provider = "anthropic";
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: "low" | "medium" | "high" | "xhigh" | "max",
    /** Tests uniquement : remplace l'accès réseau. */
    fetchImpl?: typeof fetch,
  ) {
    // Une lecture de devis dure de quelques secondes à une minute ; au-delà, on arrête.
    this.client = new Anthropic({ apiKey, timeout: 180_000, maxRetries: 1, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  }

  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    const content: Anthropic.ContentBlockParam[] = [];
    if (request.imagePdf) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: Buffer.from(request.imagePdf).toString("base64") },
        title: `Pages du devis à lire en image (numéros d'origine, dans l'ordre : ${request.imagePages.join(", ")})`,
      });
    }
    const text = request.numberedText.trim()
      ? `Texte du devis, lignes numérotées :\n\n${request.numberedText}`
      : "Aucune page n'a de texte lisible : lis le document PDF ci-dessus.";
    content.push({ type: "text", text });

    const started = Date.now();
    const base = { provider: this.provider, model: this.model };
    try {
      // `create` (et non `parse`) : une réponse illisible doit rester une tentative
      // mesurée (jetons consommés), pas une exception qui ferait perdre l'usage.
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        system: [{ type: "text", text: takeoffSystemPrompt(request.tradeLabel), cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content }],
        output_config: { effort: this.effort, format: zodOutputFormat(extractionOutputSchema) },
        metadata: { user_id: `${TAKEOFF_PROMPT.id}-v${TAKEOFF_PROMPT.version}` },
      });
      const usage = toUsage(response.usage);
      const durationMs = Date.now() - started;
      const attempt = { ...base, model: response.model, usage, durationMs };
      if (response.stop_reason === "refusal") {
        return { ...attempt, status: "refused", output: null, errorCode: response.stop_details?.category ?? "refusal" };
      }
      if (response.stop_reason === "max_tokens") {
        return { ...attempt, status: "invalid_output", output: null, errorCode: "max_tokens" };
      }
      const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return { ...attempt, status: "invalid_output", output: null, errorCode: "json" };
      }
      const parsed = extractionOutputSchema.safeParse(json);
      if (!parsed.success) return { ...attempt, status: "invalid_output", output: null, errorCode: "schema" };
      return { ...attempt, status: "success", output: parsed.data, errorCode: null };
    } catch (error) {
      const durationMs = Date.now() - started;
      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        return { ...base, usage: NO_USAGE, status: "timeout", output: null, errorCode: "timeout", durationMs };
      }
      if (error instanceof Anthropic.APIError) {
        const code = error.status ? `http_${error.status}` : "connection";
        return { ...base, usage: NO_USAGE, status: "provider_error", output: null, errorCode: code, durationMs };
      }
      throw error;
    }
  }
}
