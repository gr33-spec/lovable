import type { AppConfig } from "../config/config.js";
import { AnthropicDocumentReader } from "./anthropic-document-reader.js";
import type { FabriqueIa, LecteurIa } from "./lecteur-ia.js";
import { estRequeteDemo } from "../logging/request-context.js";
import { LecteurEnregistre, type Enregistrements } from "./lecteur-enregistre.js";
import { OpenAiDocumentReader } from "./openai-document-reader.js";

/**
 * La fabrique choisie par la configuration (`AI_PROVIDER`) : le seul endroit qui connaît les fournisseurs. Null quand
 * l'IA est coupée (pas de clé) ou jouée par les doubles de test historiques (`fake`, propres à chaque module).
 */
export function fabriqueIa(config: AppConfig, options: { fetchImpl?: typeof fetch; enregistrements?: Enregistrements } = {}): FabriqueIa | null {
  const fabrique = fabriqueDuFournisseur(config, options);
  return fabrique ? (choix) => sansIaEnDemo(fabrique(choix)) : null;
}

/**
 * ACCÈS DÉMO (Greg, 7 novembre 2026) : un visiteur fictif ne déclenche JAMAIS un appel payant. Le lecteur répond « refusé »
 * sans rien appeler (zéro jeton, zéro coût) ; les lectures de la démo passent par la lecture simulée (`lecteurDemo`).
 */
export function sansIaEnDemo(lecteur: LecteurIa): LecteurIa {
  return {
    provider: lecteur.provider,
    model: lecteur.model,
    read: (request) =>
      estRequeteDemo()
        ? Promise.resolve({ provider: lecteur.provider, model: lecteur.model, usage: { inputTokens: 0, outputTokens: 0 }, status: "refused", output: null, errorCode: "acces_demo_sans_ia", durationMs: 0 })
        : lecteur.read(request),
  };
}

function fabriqueDuFournisseur(config: AppConfig, options: { fetchImpl?: typeof fetch; enregistrements?: Enregistrements }): FabriqueIa | null {
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
