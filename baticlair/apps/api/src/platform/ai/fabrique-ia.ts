import type { AppConfig } from "../config/config.js";
import { AnthropicDocumentReader } from "./anthropic-document-reader.js";
import type { FabriqueIa } from "./lecteur-ia.js";
import { LecteurEnregistre, type Enregistrements } from "./lecteur-enregistre.js";
import { OpenAiDocumentReader } from "./openai-document-reader.js";

/**
 * La fabrique choisie par la configuration (`AI_PROVIDER`) : le seul endroit qui connaît les fournisseurs. Null quand
 * l'IA est coupée (pas de clé) ou jouée par les doubles de test historiques (`fake`, propres à chaque module).
 */
export function fabriqueIa(config: AppConfig, options: { fetchImpl?: typeof fetch; enregistrements?: Enregistrements } = {}): FabriqueIa | null {
  const ai = config.ai;
  switch (ai.provider) {
    case "anthropic":
      return ({ model, effort }) => new AnthropicDocumentReader(ai.apiKey!, model, effort, options.fetchImpl, ai.timeoutMs);
    case "openai":
      return ({ model, effort }) => new OpenAiDocumentReader(ai.apiKey!, model, effort, options.fetchImpl as never, ai.timeoutMs);
    case "enregistre":
      return ({ model }) => new LecteurEnregistre(options.enregistrements ?? {}, model);
    default:
      return null;
  }
}
