import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { AiParseError } from "./parse";

/** Récupère le texte de la réponse d'un message Anthropic. */
export function extractText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new AiParseError("L'IA n'a renvoyé aucun texte exploitable.");
  }
  return block.text;
}
