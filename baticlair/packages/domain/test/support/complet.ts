import { ROOFING_REFERENTIAL, type EngineAnswer, type CompanyPreferences, type PurchaseView, type Referential, type SiteFact } from "../../src/index.js";
import { HABITUDES_BANC } from "./habitudes.js";
import { readQuote, type QuoteLineInput } from "./read-quote.js";

/**
 * VALIDATION DU RÉFÉRENTIEL seulement : ses formules et ses tables sur TOUS les articles d'un ouvrage (liteaux, écran,
 * colliers…), écrits au devis ou non. Une liste d'achats d'artisan, elle, suit la règle numéro un (`writtenOnly`) :
 * ces tests vérifient le calcul d'un article le jour où le devis l'écrit, pas qu'il sort d'office.
 */
export const REFERENTIEL_COMPLET: Referential = { ...ROOFING_REFERENTIAL, writtenOnly: false };

/** Le parcours complet, en mode validation du référentiel (tous les articles de chaque ouvrage). */
export function readQuoteComplet(bench: readonly QuoteLineInput[], answers: Record<string, EngineAnswer> = {}, extraFacts: readonly SiteFact[] = [], preferences: CompanyPreferences = HABITUDES_BANC): PurchaseView {
  return readQuote(bench, answers, extraFacts, preferences, { everyArticle: true });
}
