import { normalizeText } from "../../src/index.js";

/** Oracle de test (§50.5) : une ligne de la liste ne reprend jamais la PHRASE d'une prestation du devis. */
const PRESTATION_HEADS = ["remplacement", "refixation", "reprise", "repositionnement", "remaniement", "reparation", "revision", "recherche", "intervention", "demoussage", "nettoyage", "traitement", "remise en place", "remise en etat", "fixation", "scellement", "calfeutrement"];

export function isPrestationPhrase(designation: string): boolean {
  const text = normalizeText(designation).replace(/^[^a-z]+/, "");
  return PRESTATION_HEADS.some((h) => text === h || text.startsWith(`${h} `) || text.startsWith(`${h},`));
}
