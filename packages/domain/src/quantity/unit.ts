/**
 * Unités de mesure du bâtiment.
 *
 * Règle métier (docs/domain-model.md) : une conversion n'est faite QUE si
 * elle ne dépend pas du produit. m ↔ ml, kg ↔ t, L ↔ m³ sont sûres. Une
 * conversion rouleau → m² ou sac → kg exige un conditionnement explicite
 * (PackagingSpec) : sans lui, aucune conversion n'est tentée.
 */
export type Dimension =
  | "count"
  | "length"
  | "area"
  | "volume"
  | "mass"
  | "package"
  | "lump_sum";

interface UnitDefinition {
  dimension: Dimension;
  /** Facteur vers l'unité de base de la dimension (null si non convertible). */
  toBase: string | null;
}

export const UNIT_DEFINITIONS = {
  U: { dimension: "count", toBase: "1" },
  M: { dimension: "length", toBase: "1" },
  /** Mètre linéaire : même grandeur physique que le mètre. */
  ML: { dimension: "length", toBase: "1" },
  M2: { dimension: "area", toBase: "1" },
  M3: { dimension: "volume", toBase: "1" },
  L: { dimension: "volume", toBase: "0.001" },
  KG: { dimension: "mass", toBase: "1" },
  T: { dimension: "mass", toBase: "1000" },
  SAC: { dimension: "package", toBase: null },
  BOITE: { dimension: "package", toBase: null },
  PALETTE: { dimension: "package", toBase: null },
  ROULEAU: { dimension: "package", toBase: null },
  PAQUET: { dimension: "package", toBase: null },
  BOTTE: { dimension: "package", toBase: null },
  LOT: { dimension: "package", toBase: null },
  FORFAIT: { dimension: "lump_sum", toBase: null },
} as const satisfies Record<string, UnitDefinition>;

export type UnitCode = keyof typeof UNIT_DEFINITIONS;

export function isUnitCode(value: string): value is UnitCode {
  return Object.hasOwn(UNIT_DEFINITIONS, value);
}

export function dimensionOf(unit: UnitCode): Dimension {
  return UNIT_DEFINITIONS[unit].dimension;
}

/**
 * Libellés rencontrés dans les documents → unité canonique.
 * Clés normalisées (minuscules, sans accents, sans point ni espace).
 */
const UNIT_ALIASES: Record<string, UnitCode> = {
  u: "U", un: "U", unite: "U", unites: "U", pce: "U", pc: "U", pcs: "U",
  piece: "U", pieces: "U", ens: "U", nb: "U", nbre: "U",
  m: "M", metre: "M", metres: "M",
  ml: "ML", mlin: "ML", metrelineaire: "ML", metreslineaires: "ML",
  m2: "M2", "m²": "M2", mq: "M2", metrecarre: "M2", metrescarres: "M2",
  m3: "M3", "m³": "M3", metrecube: "M3", metrescubes: "M3",
  l: "L", litre: "L", litres: "L",
  kg: "KG", kilo: "KG", kilos: "KG", kilogramme: "KG", kilogrammes: "KG",
  t: "T", tonne: "T", tonnes: "T",
  sac: "SAC", sacs: "SAC",
  bte: "BOITE", boite: "BOITE", boites: "BOITE",
  pal: "PALETTE", palette: "PALETTE", palettes: "PALETTE",
  rlx: "ROULEAU", rl: "ROULEAU", rouleau: "ROULEAU", rouleaux: "ROULEAU",
  paq: "PAQUET", pqt: "PAQUET", paquet: "PAQUET", paquets: "PAQUET", colis: "PAQUET",
  botte: "BOTTE", bottes: "BOTTE",
  lot: "LOT", lots: "LOT",
  ft: "FORFAIT", fft: "FORFAIT", forfait: "FORFAIT",
};

function normalizeUnitLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s.\-_/]/g, "");
}

/** Reconnaît une unité à partir d'un libellé brut. `null` si inconnue : ne jamais deviner. */
export function parseUnit(raw: string | null | undefined): UnitCode | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (isUnitCode(upper)) return upper;
  return UNIT_ALIASES[normalizeUnitLabel(raw)] ?? null;
}
