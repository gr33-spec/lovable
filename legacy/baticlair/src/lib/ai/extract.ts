import "server-only";
import { getAnthropicClient, AI_MODEL } from "./client";
import { extractionPrompt } from "./prompts";
import { parseJsonResponse } from "./parse";
import { extractText } from "./response";
import type { AnalysisType, ExtractedDocument } from "./types";

/** Types de fichiers acceptés pour un devis ou une facture. */
export type SupportedMediaType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

export interface FilePayload {
  /** Contenu du fichier encodé en base64. */
  base64: string;
  mediaType: SupportedMediaType;
}

/**
 * Lit un devis ou une facture (PDF natif ou photo) et en extrait les lignes
 * d'articles via l'IA. C'est la première étape de chaque analyse (§9).
 */
export async function extractDocument(
  file: FilePayload,
  type: AnalysisType
): Promise<ExtractedDocument> {
  const client = getAnthropicClient();

  const fileBlock =
    file.mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: file.base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.mediaType,
            data: file.base64,
          },
        };

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [fileBlock, { type: "text", text: extractionPrompt(type) }],
      },
    ],
  });

  return parseJsonResponse<ExtractedDocument>(extractText(message));
}
