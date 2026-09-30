// Imports nommés (pas l'export par défaut) : même résultat quel que soit le
// format (CJS/ESM) retenu par le compilateur de Vercel (voir helmet, app.ts).
import { Anthropic, APIConnectionTimeoutError, APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AiUsage } from "@baticlair/domain";
import type { z } from "zod";
import type { DocumentInput, ReadAttempt } from "./document-reader.js";

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

export interface ReadRequest<S extends z.ZodType> {
  /** Consignes (mises en cache côté fournisseur). */
  system: string;
  schema: S;
  document: DocumentInput;
  /** Nom du document pour l'IA (« devis », « devis du fournisseur »). */
  documentName: string;
  /** Texte ajouté après le document (liste demandée, contexte…). */
  extra?: string;
  /** Étiquette « prompt-vN » transmise au fournisseur (suivi). */
  tag: string;
}

/**
 * Lecture structurée d'un document par Claude (API Anthropic), commune à
 * toutes les lectures (devis client, devis fournisseur). Sortie imposée par
 * un schéma ; le code vérifie ensuite. Aucune donnée n'est conservée ici.
 */
export class AnthropicDocumentReader {
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

  async read<S extends z.ZodType>(request: ReadRequest<S>): Promise<ReadAttempt<z.infer<S>>> {
    const { document } = request;
    const content: Anthropic.ContentBlockParam[] = [];
    if (document.imagePdf) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: Buffer.from(document.imagePdf).toString("base64") },
        title: `Pages du ${request.documentName} à lire en image (numéros d'origine, dans l'ordre : ${document.imagePages.join(", ")})`,
      });
    }
    const text = document.numberedText.trim()
      ? `Texte du ${request.documentName}, lignes numérotées :\n\n${document.numberedText}`
      : "Aucune page n'a de texte lisible : lis le document PDF ci-dessus.";
    content.push({ type: "text", text: request.extra ? `${text}\n\n${request.extra}` : text });

    const started = Date.now();
    const base = { provider: this.provider, model: this.model };
    try {
      // `create` (et non `parse`) : une réponse illisible doit rester une tentative
      // mesurée (jetons consommés), pas une exception qui ferait perdre l'usage.
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content }],
        output_config: { effort: this.effort, format: zodOutputFormat(request.schema) },
        metadata: { user_id: request.tag },
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
      const raw = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return { ...attempt, status: "invalid_output", output: null, errorCode: "json" };
      }
      const parsed = request.schema.safeParse(json);
      if (!parsed.success) return { ...attempt, status: "invalid_output", output: null, errorCode: "schema" };
      return { ...attempt, status: "success", output: parsed.data as z.infer<S>, errorCode: null };
    } catch (error) {
      const durationMs = Date.now() - started;
      if (error instanceof APIConnectionTimeoutError) {
        return { ...base, usage: NO_USAGE, status: "timeout", output: null, errorCode: "timeout", durationMs };
      }
      if (error instanceof APIError) {
        const code = error.status ? `http_${error.status}` : "connection";
        return { ...base, usage: NO_USAGE, status: "provider_error", output: null, errorCode: code, durationMs };
      }
      throw error;
    }
  }
}
