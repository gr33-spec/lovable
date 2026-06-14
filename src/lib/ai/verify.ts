import "server-only";
import { getAnthropicClient, AI_MODEL } from "./client";
import { VERIFICATION_PROMPT } from "./prompts";
import { parseJsonResponse } from "./parse";
import { extractText } from "./response";
import type { ExtractedDocument, VerificationResult } from "./types";

/**
 * Vérifie qu'une facture respecte son devis et chiffre le trop-payé (Pilier 2, §9).
 */
export async function verifyFacture(
  devis: ExtractedDocument,
  facture: ExtractedDocument
): Promise<VerificationResult> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${VERIFICATION_PROMPT}\n\n${JSON.stringify({ devis, facture })}`,
      },
    ],
  });

  return parseJsonResponse<VerificationResult>(extractText(message));
}
