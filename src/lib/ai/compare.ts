import "server-only";
import { getAnthropicClient, AI_MODEL } from "./client";
import { COMPARISON_PROMPT } from "./prompts";
import { parseJsonResponse } from "./parse";
import { extractText } from "./response";
import type { ComparisonResult, ExtractedDocument } from "./types";

/**
 * Compare plusieurs devis déjà extraits et désigne le moins-disant (Pilier 1, §9).
 */
export async function compareDevis(
  documents: ExtractedDocument[]
): Promise<ComparisonResult> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${COMPARISON_PROMPT}\n\n${JSON.stringify(documents)}`,
      },
    ],
  });

  return parseJsonResponse<ComparisonResult>(extractText(message));
}
