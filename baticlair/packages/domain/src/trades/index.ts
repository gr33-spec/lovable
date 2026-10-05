import {
  CARPENTRY_PROFILE,
  CEILING_PROFILE,
  CLADDING_PROFILE,
  DRYWALL_PROFILE,
  ELECTRICAL_PROFILE,
  FACADE_PROFILE,
  FLOORING_PROFILE,
  HVAC_PROFILE,
  INTERIOR_JOINERY_PROFILE,
  JOINERY_PROFILE,
  KITCHEN_PROFILE,
  MASONRY_PROFILE,
  OTHER_PROFILE,
  PAINTING_PROFILE,
  PLUMBING_PROFILE,
  SOLAR_PROFILE,
  TILING_PROFILE,
  WATERPROOFING_PROFILE,
} from "./light-profiles.js";
import { ROOFING_PROFILE } from "./roofing.js";
import type { TradeProfile } from "./trade-profile.js";

/**
 * Métiers proposés à l'inscription (PD-033). Un métier = un profil de
 * données ; en ajouter un ne change ni le parcours ni le moteur.
 */
export const TRADES: readonly { id: string; label: string }[] = [
  { id: "roofing", label: "Couverture, charpente, zinguerie" },
  { id: "masonry", label: "Maçonnerie" },
  { id: "drywall", label: "Plâtrerie, isolation" },
  { id: "painting", label: "Peinture" },
  { id: "tiling", label: "Carrelage" },
  { id: "flooring", label: "Sols, parquet" },
  { id: "electrical", label: "Électricité" },
  { id: "plumbing", label: "Plomberie, chauffage" },
  { id: "joinery", label: "Menuiserie" },
  { id: "hvac", label: "Chauffage, ventilation" },
  { id: "carpentry", label: "Charpente" },
  { id: "waterproofing", label: "Étanchéité" },
  { id: "cladding", label: "Bardage" },
  { id: "facade", label: "Façade, ravalement" },
  { id: "ceiling", label: "Plafonds suspendus" },
  { id: "interior_joinery", label: "Menuiserie intérieure, agencement" },
  { id: "kitchen", label: "Cuisine" },
  { id: "solar", label: "Photovoltaïque" },
  { id: "other", label: "Autre métier" },
];

export const TRADE_PROFILES: Readonly<Record<string, TradeProfile>> = {
  roofing: ROOFING_PROFILE,
  masonry: MASONRY_PROFILE,
  drywall: DRYWALL_PROFILE,
  painting: PAINTING_PROFILE,
  tiling: TILING_PROFILE,
  flooring: FLOORING_PROFILE,
  electrical: ELECTRICAL_PROFILE,
  plumbing: PLUMBING_PROFILE,
  joinery: JOINERY_PROFILE,
  hvac: HVAC_PROFILE,
  carpentry: CARPENTRY_PROFILE,
  waterproofing: WATERPROOFING_PROFILE,
  cladding: CLADDING_PROFILE,
  facade: FACADE_PROFILE,
  ceiling: CEILING_PROFILE,
  interior_joinery: INTERIOR_JOINERY_PROFILE,
  kitchen: KITCHEN_PROFILE,
  solar: SOLAR_PROFILE,
  other: OTHER_PROFILE,
};

/** Métier par défaut quand l'artisan n'en a choisi aucun. */
export const DEFAULT_TRADE = "other";

/** Métiers connus, sans doublon, dans l'ordre donné ; « other » si aucun. */
export function normalizeTrades(ids: readonly string[]): string[] {
  const known = [...new Set(ids.map((id) => id.trim()).filter((id) => id in TRADE_PROFILES))];
  const specific = known.filter((id) => id !== "other");
  return specific.length > 0 ? specific : [DEFAULT_TRADE];
}

/** Clé stockée avec un document ou un quantitatif : les métiers de l'entreprise, séparés par des virgules. */
export function tradeKey(ids: readonly string[]): string {
  return normalizeTrades(ids).join(",");
}

const cache = new Map<string, TradeProfile>();

/**
 * Profil de lecture pour une clé de métiers (« roofing,painting ») : la
 * fusion des profils, familles du premier métier d'abord. Une clé inconnue
 * donne le socle commun, jamais une erreur.
 */
export function tradeProfile(key: string): TradeProfile {
  const cached = cache.get(key);
  if (cached) return cached;
  const profiles = normalizeTrades(key.split(",")).map((id) => TRADE_PROFILES[id]!);
  const merged = profiles.length === 1 ? profiles[0]! : mergeProfiles(profiles);
  cache.set(key, merged);
  return merged;
}

const union = (lists: readonly (readonly string[])[]): string[] => [...new Set(lists.flat())];

function mergeProfiles(profiles: readonly TradeProfile[]): TradeProfile {
  const seen = new Set<string>();
  return {
    id: profiles.map((p) => p.id).join(","),
    label: profiles.map((p) => p.label).join(" + "),
    families: profiles.flatMap((p) => p.families).filter((family) => !seen.has(family.code) && seen.add(family.code)),
    laborKeywords: union(profiles.map((p) => p.laborKeywords)),
    supplyKeywords: union(profiles.map((p) => p.supplyKeywords)),
    companionRules: profiles.flatMap((p) => p.companionRules),
    boilerplateMarkers: union(profiles.map((p) => p.boilerplateMarkers)),
    materialKeywords: union(profiles.map((p) => p.materialKeywords)),
  };
}

export { ROOFING_PROFILE };
