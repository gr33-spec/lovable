import type { FabriqueIa, LecteurIa } from "../../../platform/ai/lecteur-ia.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import { reponseNegoceSchema, type LectureReponseNegoce, type NegoceExtractor, type ReponseLue } from "../application/negoce-extractor.js";
import { consigneDevisNegoce, contexteDuLot, PROMPT_DEVIS_NEGOCE } from "../application/prompt-negoce.js";

/** Lecture du devis d'un négoce par le modèle le plus capable (Opus, `AI_EXTRACTION_MODEL`, nouveau cap du 22 octobre), une fois à son arrivée : prix et délai, rien d'autre. */
export class IaNegoceExtractor implements NegoceExtractor {
  readonly provider: string;
  private readonly reader: LecteurIa;

  constructor(ia: FabriqueIa, model: string) {
    this.reader = ia({ model, effort: "low" });
    this.provider = this.reader.provider;
  }

  lire(demande: LectureReponseNegoce): Promise<ReadAttempt<ReponseLue>> {
    return this.reader.read({
      system: consigneDevisNegoce(),
      schema: reponseNegoceSchema,
      document: demande,
      documentName: "devis du négoce",
      extra: contexteDuLot(demande.lot),
      tag: `${PROMPT_DEVIS_NEGOCE.id}-v${PROMPT_DEVIS_NEGOCE.version}`,
    });
  }
}
