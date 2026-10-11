import { normalizeText } from "../trades/trade-profile.js";

/**
 * §49.9 (retour du fondateur, 2026-10-09, devis de réparation D.2026.105) : « une ligne du quantitatif nomme une
 * fourniture, jamais la phrase du devis ». La fourniture de chaque ligne vient de la lecture du modèle (§51.5) ; ici,
 * seulement les unités qui ne sont jamais une fourniture (h, fft, jour).
 */

/** Les unités qui ne sont jamais une fourniture (§49.9), écrites comme on les lit au devis (minuscules, sans accent). */
export const WITHOUT_SUPPLY_UNITS = ["h", "hr", "hrs", "heure", "heures", "j", "jour", "jours", "journee", "journees", "fft", "ft", "forfait", "forfaits"] as const;
/** Parmi elles, le temps : une heure ou un jour ne nomme jamais un article, quel que soit le texte de la ligne. */
const TIME_UNITS = new Set(["h", "hr", "hrs", "heure", "heures", "j", "jour", "jours", "journee", "journees"]);

const unitWord = (unit: string | null | undefined) => normalizeText(unit ?? "").replace(/[.\s]/g, "");

/** « 1,5 h », « 2 jours », « 1 fft » : l'unité dit une prestation, jamais une fourniture (§49.9). */
export function isWithoutSupplyUnit(unit: string | null | undefined): boolean {
  return (WITHOUT_SUPPLY_UNITS as readonly string[]).includes(unitWord(unit));
}

/** Une durée (heures, jours) : jamais un article, même si la ligne nomme un matériau (« Repositionnement des tuiles · 1,5 h »). */
export function isTimeUnit(unit: string | null | undefined): boolean {
  return TIME_UNITS.has(unitWord(unit));
}
