import { ASSISTANT_IA_SYSTEM, assistantIaDossier, type AssistantIaWire, type EchangeAssistant } from "@baticlair/domain";
import { z } from "zod";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { FabriqueIa, LecteurIa } from "../../../platform/ai/lecteur-ia.js";
import { ETIQUETTE_ASSISTANT, type Decoupeur } from "../application/assistant-ia.service.js";

export const assistantIaSchema = z.object({
  lignes: z.array(z.object({ designation: z.string().max(300), quantite: z.string().max(20).nullable(), unite: z.string().max(30).nullable() })).max(60),
  questions: z.array(z.object({ texte: z.string().max(400), choix: z.array(z.string().max(120)).max(12) })).max(10),
  message: z.string().max(600),
});

/** L'assistant par l'IA : le texte seul (ce que l'artisan a dit, les questions posées), jamais un document. */
export class IaDecoupeur implements Decoupeur {
  readonly provider: string;
  private readonly reader: LecteurIa;

  constructor(ia: FabriqueIa, model: string) {
    this.reader = ia({ model, effort: "low" });
    this.provider = this.reader.provider;
  }

  decouper(echanges: readonly EchangeAssistant[]): Promise<ReadAttempt<AssistantIaWire>> {
    return this.reader.read({
      system: ASSISTANT_IA_SYSTEM,
      schema: assistantIaSchema,
      document: { numberedText: assistantIaDossier(echanges), imagePdf: null, imagePages: [] },
      documentName: "demande de l'artisan",
      tag: ETIQUETTE_ASSISTANT,
    }) as Promise<ReadAttempt<AssistantIaWire>>;
  }
}
