import { z } from "zod";
import type { AiUsage } from "@baticlair/domain";
import type { ReadAttempt } from "./document-reader.js";
import type { EffortIa, LecteurIa, ReadRequest } from "./lecteur-ia.js";

/**
 * SECOND FOURNISSEUR, EN SQUELETTE (revue du 26 octobre 2026, lot 1) : la preuve que la brique IA se remplace par
 * configuration (`AI_PROVIDER=openai`, `OPENAI_API_KEY`). Même contrat que l'adaptateur Anthropic : texte numéroté et images
 * en entrée, sortie imposée par le schéma (JSON Schema strict), relue par le code. Pas encore branché en ligne : aucune clé
 * posée, et le PDF en image n'est pas transmis (une page scannée part en « provider_error »). Testé avec un faux réseau.
 */
type Post = (url: string, init: { method: "POST"; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const NO_USAGE: AiUsage = { inputTokens: 0, outputTokens: 0 };
const EFFORTS: Record<EffortIa, "low" | "medium" | "high"> = { low: "low", medium: "medium", high: "high", xhigh: "high", max: "high" };

export class OpenAiDocumentReader implements LecteurIa {
  readonly provider = "openai";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly effort: EffortIa,
    private readonly fetchImpl: Post = fetch as unknown as Post,
    private readonly timeoutMs = 170_000,
  ) {}

  async read<S extends z.ZodType>(request: ReadRequest<S>): Promise<ReadAttempt<z.infer<S>>> {
    const base = { provider: this.provider, model: this.model };
    const started = Date.now();
    if (request.document.imagePdf) return { ...base, usage: NO_USAGE, status: "provider_error", output: null, errorCode: "pdf_image_non_pris", durationMs: 0 };
    const texte = `Texte du ${request.documentName}, lignes numérotées :\n\n${request.document.numberedText}${request.extra ? `\n\n${request.extra}` : ""}`;
    const contenu: unknown[] = [{ type: "input_text", text: texte }];
    for (const image of request.document.images ?? []) contenu.push({ type: "input_image", image_url: `data:${image.mediaType};base64,${Buffer.from(image.bytes).toString("base64")}` });
    let res: Awaited<ReturnType<Post>>;
    try {
      res = await this.fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          instructions: request.system,
          input: [{ role: "user", content: contenu }],
          reasoning: { effort: EFFORTS[this.effort] },
          text: { format: { type: "json_schema", name: "reponse", strict: true, schema: z.toJSONSchema(request.format ?? request.schema) } },
          metadata: { tag: request.tag },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      const durationMs = Date.now() - started;
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      return { ...base, usage: NO_USAGE, status: timeout ? "timeout" : "provider_error", output: null, errorCode: timeout ? "timeout" : "connection", durationMs };
    }
    const durationMs = Date.now() - started;
    if (!res.ok) return { ...base, usage: NO_USAGE, status: "provider_error", output: null, errorCode: `http_${res.status}`, durationMs };
    const corps = (await res.json()) as { model?: string; output_text?: string; output?: { content?: { type?: string; text?: string }[] }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    const usage: AiUsage = { inputTokens: corps.usage?.input_tokens ?? 0, outputTokens: corps.usage?.output_tokens ?? 0 };
    const attempt = { ...base, model: corps.model ?? this.model, usage, durationMs };
    const brut = corps.output_text ?? (corps.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("");
    let json: unknown;
    try {
      json = JSON.parse(brut);
    } catch {
      return { ...attempt, status: "invalid_output", output: null, errorCode: "json" };
    }
    const lu = request.schema.safeParse(json);
    if (!lu.success) return { ...attempt, status: "invalid_output", output: null, errorCode: "schema" };
    return { ...attempt, status: "success", output: lu.data as z.infer<S>, errorCode: null };
  }
}
