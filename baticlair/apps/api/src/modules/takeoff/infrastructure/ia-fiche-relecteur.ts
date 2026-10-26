import type { FabriqueIa, LecteurIa } from "../../../platform/ai/lecteur-ia.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import { FICHE_RELECTURE_PROMPT, relectureDossier, relectureSystem, relectureWireSchema, type FicheRelecteur, type RelectureInput, type RelectureWire } from "../application/fiche-relecture.js";

/** §51.2 par l'IA : la fiche, la question et la réponse « Autre » en texte, jamais le PDF. Le modèle de la lecture (le plus capable). */
export class IaFicheRelecteur implements FicheRelecteur {
  readonly provider: string;
  private readonly reader: LecteurIa;

  constructor(ia: FabriqueIa, model: string) {
    this.reader = ia({ model, effort: "medium" });
    this.provider = this.reader.provider;
  }

  relire(input: RelectureInput): Promise<ReadAttempt<RelectureWire>> {
    return this.reader.read({
      system: relectureSystem(input),
      schema: relectureWireSchema,
      document: { numberedText: relectureDossier(input), imagePdf: null, imagePages: [] },
      documentName: "dossier",
      tag: `${FICHE_RELECTURE_PROMPT.id}-v${FICHE_RELECTURE_PROMPT.version}`,
    }) as Promise<ReadAttempt<RelectureWire>>;
  }
}
