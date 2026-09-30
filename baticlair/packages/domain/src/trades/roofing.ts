import type { TradeProfile } from "./trade-profile.js";

/**
 * Charpente-couverture. Vocabulaire tiré des devis de couvreurs et des
 * catalogues de négoces (tuiles, ardoises, zinguerie, écrans, bois de
 * charpente). Enrichi au fil des vrais documents analysés.
 */
export const ROOFING_PROFILE: TradeProfile = {
  id: "roofing",
  label: "Charpente-couverture",
  materialKeywords: [
    // Couverture
    "tuile", "tuiles", "ardoise", "ardoises", "faitiere", "faitieres", "faitage", "rive", "rives",
    "arestier", "aretier", "noue", "noues", "closoir", "chatiere", "abergement", "solin", "bande de rive",
    "crochet", "crochets", "clou", "pointe", "vis", "lambourde", "bac acier", "fibrociment", "shingle",
    "ecran sous toiture", "ecran hpv", "pare pluie", "pare-pluie", "pare vapeur", "pare-vapeur",
    "closoir ventile", "grille anti rongeurs", "sortie de toit", "fenetre de toit", "velux",
    // Charpente et support
    "liteau", "liteaux", "contre liteau", "contre-liteau", "volige", "voliges", "chevron", "chevrons",
    "panne", "pannes", "entrait", "arbaletrier", "poincon", "sabliere", "fermette", "fermettes",
    "osb", "contreplaque", "douglas", "sapin", "epicea", "traite classe",
    // Zinguerie
    "zinc", "gouttiere", "gouttieres", "descente", "descentes", "naissance", "crochet de gouttiere",
    "dauphin", "moignon", "coude", "talon", "cheneau", "habillage",
    // Isolation de toiture
    "laine de verre", "laine de roche", "sarking", "isolant", "polyurethane",
  ],
  usualUnits: ["u", "pce", "m2", "m²", "ml", "m", "m3", "botte", "paquet", "palette", "rouleau", "kg", "sac", "lot", "forfait"],
  boilerplateMarkers: [
    "conditions generales de vente",
    "conditions generales",
    "clause de reserve de propriete",
    "reserve de propriete",
    "tribunal de commerce",
    "penalites de retard",
    "indemnite forfaitaire pour frais de recouvrement",
    "article 1",
    "article 2",
    "mediateur de la consommation",
    "droit de retractation",
    "garantie decennale",
  ],
};

/** Profils disponibles. MVP : un seul. */
export const TRADE_PROFILES: Readonly<Record<string, TradeProfile>> = {
  roofing: ROOFING_PROFILE,
};

export const DEFAULT_TRADE = "roofing";
