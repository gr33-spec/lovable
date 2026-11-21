import { INTERPRETATION_SYSTEM, interpretationDossier, type InterpretationWire, type QuestionNumerotee } from "@baticlair/domain";
import { z } from "zod";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { FabriqueIa, LecteurIa } from "../../../platform/ai/lecteur-ia.js";
import { ETIQUETTE_INTERPRETATION, type Interpreteur } from "../application/interpretation.service.js";

export const interpretationSchema = z.object({
  reponses: z.array(z.object({ numero: z.number().int(), statut: z.enum(["compris", "ambigu", "sans_reponse"]), valeur: z.string().max(400) })).max(50),
});

/** Lot 7 par l'IA : le texte seul (les questions et la réponse de l'artisan), jamais un document ni un nom de client. */
export class IaInterpreteur implements Interpreteur {
  readonly provider: string;
  private readonly reader: LecteurIa;

  constructor(ia: FabriqueIa, model: string) {
    this.reader = ia({ model, effort: "low" });
    this.provider = this.reader.provider;
  }

  interpreter(questions: readonly QuestionNumerotee[], texte: string): Promise<ReadAttempt<InterpretationWire>> {
    return this.reader.read({
      system: INTERPRETATION_SYSTEM,
      schema: interpretationSchema,
      document: { numberedText: interpretationDossier(questions, texte), imagePdf: null, imagePages: [] },
      documentName: "réponse de l'artisan",
      tag: ETIQUETTE_INTERPRETATION,
    }) as Promise<ReadAttempt<InterpretationWire>>;
  }
}
