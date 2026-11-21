import { ecranDeLecture, ROOFING_REFERENTIAL, SUGGESTIONS_KEY, type CompanyPreferences, type EngineAnswer, type EngineOptions, type PurchaseView, type QuoteLineReading, type SiteFact } from "../../src/index.js";
import { HABITUDES_BANC } from "./habitudes.js";
import { lectureEnregistree } from "./lectures.js";

export interface QuoteLineInput {
  ref: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
}

/**
 * L'étape « Suggestions » (Greg, 17 novembre 2026) passe avant les questions. Ces bancs mesurent le calcul : ils y répondent
 * d'avance comme un artisan qui coche les naissances de sa gouttière (ce que le calcul ajoutait d'office avant l'étape), et
 * rien d'autre. L'étape elle-même a son test : `etape-suggestions.test.ts`. Un banc peut donner sa propre réponse.
 */
export const SUGGESTIONS_DU_BANC = "gouttiere/naissance,gouttiere-pvc-alu/naissance";

/**
 * Règle changée (Greg, 21 novembre 2026) : sans gouttière écrite au devis, l'égout des ardoises se demande (« Tes m² d'ardoise
 * comprennent déjà l'égout et les coupes ? »). La réponse « Oui » : rien n'est ajouté pour l'égout, les quantités d'avant
 * restent. Un banc qui mesure autre chose la donne explicitement ; la question elle-même a ses tests.
 */
export const EGOUT_COMPRIS_OUI: Record<string, EngineAnswer> = { "param:egout_compris": { value: "1", unit: "u" } };

/** Tout le parcours d'un devis de couvreur jusqu'à la liste, comme l'API (§51.5) : la lecture enregistrée du devis, puis le calcul. */
export function readQuote(
  bench: readonly QuoteLineInput[],
  answers: Record<string, EngineAnswer> = {},
  extraFacts: readonly SiteFact[] = [],
  preferences: CompanyPreferences = HABITUDES_BANC,
  options: EngineOptions = {},
  /** La lecture §41.1 de chaque ligne (son « manque », §49.4), telle que les anciens bancs la donnaient : elle désigne la lecture enregistrée. */
  readings?: ReadonlyMap<string, QuoteLineReading>,
): PurchaseView {
  const lecture = lectureEnregistree(ROOFING_REFERENTIAL, bench, extraFacts, preferences, options, readings, answers);
  return ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture, answers: { [SUGGESTIONS_KEY]: SUGGESTIONS_DU_BANC, ...answers }, preferences, options, extraFacts, interdits: false }).purchase;
}
