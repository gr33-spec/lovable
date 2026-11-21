import { tradeProfile } from "../trades/index.js";
import { FICHES, fautesDeFiche } from "./fiches/index.js";
import { METIER_NAMES, METIERS_RELUS, REFERENTIALS } from "./registry.js";

/** Un métier dans l'écran « Métiers couverts » (Compte) : son état de validation et ce qui le calcule. */
export interface MetierCouvert {
  metier: string;
  nom: string;
  /** brouillon : rédigé, jamais relu ; en validation : en cours de relecture ; relu : un artisan du métier l'a relu (§52). */
  etat: "brouillon" | "en validation" | "relu";
  /** « fiche » : référentiel au format commun (`referentiels/metiers/`) ; « tiroir » : ancien tiroir du moteur. */
  source: "fiche" | "tiroir";
  version: string;
  /** Nombre de ratios sourcés (fiche) ; null pour un tiroir. */
  ratios: number | null;
  /** Les points qu'un artisan du métier doit relire en premier (fiche). */
  aRelire: string[];
}

/**
 * §52 (mission du fondateur, 2026-10-19 : « un écran Métiers couverts dans Compte avec l'état de chaque métier »). Les
 * fiches au format commun d'abord, puis les tiroirs qui n'ont pas encore la leur (relus : couverture, étanchéité).
 */
export function metiersCouverts(): MetierCouvert[] {
  const out: MetierCouvert[] = [];
  for (const f of FICHES) {
    if (fautesDeFiche(f).length > 0) continue;
    out.push({ metier: f.metier, nom: f.nom, etat: f.etat, source: f.moteur === "fiche" ? "fiche" : "tiroir", version: f.version, ratios: f.moteur === "fiche" ? f.ratios.length : null, aRelire: f.aRelire.slice(0, 3) });
  }
  for (const r of REFERENTIALS) {
    if (r.trade === "general" || out.some((m) => m.metier === r.trade) || !(r.trade in METIER_NAMES)) continue;
    out.push({ metier: r.trade, nom: tradeProfile(r.trade).label, etat: METIERS_RELUS.includes(r.trade) ? "relu" : "brouillon", source: "tiroir", version: r.version, ratios: null, aRelire: [] });
  }
  const rang = { relu: 0, "en validation": 1, brouillon: 2 } as const;
  return out.sort((a, b) => rang[a.etat] - rang[b.etat] || a.nom.localeCompare(b.nom, "fr"));
}
