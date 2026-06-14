import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Client Anthropic — utilisé UNIQUEMENT côté serveur (routes API).
 * La clé ne doit jamais être exposée au navigateur (cf. cahier des charges §11).
 */
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY manquante : ajoute-la dans ton fichier .env.local."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/** Modèle utilisé pour toutes les analyses, configurable via l'environnement. */
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
