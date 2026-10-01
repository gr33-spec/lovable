import { COMMON_BOILERPLATE, COMMON_LABOR, COMMON_SUPPLY } from "./common.js";
import type { MaterialFamily, TradeProfile } from "./trade-profile.js";

/**
 * Référentiel couvreur (couverture, zinguerie, support de couverture,
 * charpente légère). Tiré des devis de couvreurs et des catalogues de
 * négoces ; enrichi au fil des vrais documents analysés.
 *
 * L'ORDRE COMPTE : les familles précises passent avant les générales
 * (« tuile de rive » est un accessoire, pas une tuile ; « crochet de
 * gouttière » n'est pas un crochet d'ardoise).
 */
const FAMILIES: MaterialFamily[] = [
  {
    code: "roof_window",
    label: "Fenêtre de toit",
    keywords: ["fenetre de toit", "velux", "chassis de toit", "tabatiere", "raccord de fenetre"],
    allowedUnits: ["U"],
    wholeUnits: true,
    plausibleMax: { U: 20 },
  },
  {
    code: "underlay",
    label: "Écran sous-toiture / pare-pluie",
    keywords: ["ecran sous toiture", "ecran hpv", "ecran de sous toiture", "pare pluie", "sous toiture"],
    allowedUnits: ["ROULEAU", "M2"],
    plausibleMax: { ROULEAU: 60, M2: 3000 },
  },
  {
    code: "vapour_barrier",
    label: "Pare-vapeur",
    keywords: ["pare vapeur", "frein vapeur"],
    allowedUnits: ["ROULEAU", "M2"],
    plausibleMax: { ROULEAU: 60, M2: 3000 },
  },
  {
    code: "insulation",
    label: "Isolant de toiture",
    keywords: ["laine de verre", "laine de roche", "sarking", "isolant", "panneau isolant", "polyurethane", "fibre de bois"],
    allowedUnits: ["M2", "ROULEAU", "PAQUET", "U"],
    plausibleMax: { M2: 3000 },
  },
  {
    code: "ridge_closure",
    label: "Closoir, bande d'égout, grille",
    keywords: ["closoir", "bande d egout", "grille anti rongeur", "grille pare moineaux", "peigne"],
    allowedUnits: ["ML", "M", "ROULEAU", "U"],
    plausibleMax: { ML: 500, M: 500, ROULEAU: 50 },
  },
  {
    code: "gutter_hook",
    label: "Crochet de gouttière",
    keywords: ["crochet de gouttiere", "crochet gouttiere", "crochet pour gouttiere"],
    allowedUnits: ["U", "PAQUET", "BOITE"],
    wholeUnits: true,
    plausibleMax: { U: 1000 },
  },
  {
    code: "gutter_fitting",
    label: "Accessoire de gouttière et descente",
    keywords: ["naissance", "talon", "coude", "dauphin", "moignon", "collier", "fond de gouttiere", "jonction", "angle de gouttiere"],
    allowedUnits: ["U"],
    wholeUnits: true,
    plausibleMax: { U: 300 },
  },
  {
    code: "gutter",
    label: "Gouttière",
    keywords: ["gouttiere", "cheneau"],
    allowedUnits: ["ML", "M", "U"],
    plausibleMax: { ML: 1000, M: 1000, U: 300 },
  },
  {
    code: "downpipe",
    label: "Descente d'eaux pluviales",
    keywords: ["descente", "tuyau de descente"],
    allowedUnits: ["ML", "M", "U"],
    plausibleMax: { ML: 500, M: 500, U: 200 },
  },
  {
    code: "flashing",
    label: "Zinguerie (bande, noue, solin, abergement)",
    keywords: ["bande de rive", "bande de solin", "solin", "abergement", "noue", "zinc", "habillage", "couvertine", "bavette"],
    allowedUnits: ["ML", "M", "M2", "KG", "U", "FORFAIT"],
    plausibleMax: { ML: 1000, M: 1000, M2: 500, KG: 5000 },
  },
  {
    code: "roof_accessory",
    label: "Accessoire de couverture (faîtière, arêtier, rive, chatière, sortie)",
    keywords: ["faitiere", "faitage", "aretier", "rive", "about", "chatiere", "tuile a douille", "sortie de toit", "lanterne", "rencontre", "fronton"],
    allowedUnits: ["U", "ML", "M"],
    wholeUnits: true,
    plausibleMax: { U: 3000, ML: 1000, M: 1000 },
  },
  {
    code: "slate_hook",
    label: "Fixation d'ardoise (crochet, clou)",
    keywords: ["crochet", "clou", "pointe", "agrafe"],
    excludes: ["gouttiere"],
    allowedUnits: ["U", "BOITE", "PAQUET", "KG"],
    plausibleMax: { U: 100000, KG: 500 },
  },
  {
    code: "fixing",
    label: "Visserie et fixations",
    keywords: ["vis", "cheville", "rondelle", "tire fond", "tirefond", "equerre", "sabot"],
    allowedUnits: ["U", "BOITE", "PAQUET", "KG"],
    plausibleMax: { U: 100000, KG: 500 },
  },
  {
    code: "batten",
    label: "Liteau et contre-liteau",
    keywords: ["contre liteau", "liteau", "latte"],
    allowedUnits: ["ML", "M", "BOTTE", "U", "PAQUET"],
    areaOfWork: true,
    plausibleMax: { ML: 20000, M: 20000, BOTTE: 300, U: 5000 },
  },
  {
    code: "sarking_board",
    label: "Volige et panneaux de support",
    keywords: ["volige", "planche", "osb", "contreplaque", "panneau ctbx", "ctbx"],
    allowedUnits: ["M2", "ML", "M", "BOTTE", "PAQUET", "U"],
    plausibleMax: { M2: 3000, ML: 10000, U: 2000 },
  },
  {
    code: "timber",
    label: "Bois de charpente",
    keywords: ["chevron", "panne", "sabliere", "entrait", "arbaletrier", "poincon", "fermette", "madrier", "bastaing", "solive", "lambourde", "bois de charpente"],
    allowedUnits: ["ML", "M", "U", "M3"],
    plausibleMax: { ML: 5000, M: 5000, U: 1000, M3: 100 },
  },
  {
    code: "roof_tile",
    label: "Tuile",
    keywords: ["tuile"],
    allowedUnits: ["U", "M2", "PALETTE"],
    wholeUnits: true,
    areaNeedsYield: true,
    plausibleMax: { U: 60000, M2: 3000, PALETTE: 60 },
  },
  {
    code: "slate",
    label: "Ardoise",
    keywords: ["ardoise"],
    allowedUnits: ["U", "M2", "PALETTE", "PAQUET"],
    wholeUnits: true,
    areaNeedsYield: true,
    plausibleMax: { U: 80000, M2: 3000, PALETTE: 60 },
  },
  {
    code: "metal_sheet",
    label: "Bac acier, tôle, panneau sandwich",
    keywords: ["bac acier", "tole", "panneau sandwich", "fibrociment", "plaque ondulee"],
    allowedUnits: ["M2", "U", "ML"],
    plausibleMax: { M2: 5000, U: 2000 },
  },
  {
    code: "shingle",
    label: "Bardeau bitumé (shingle)",
    keywords: ["shingle", "bardeau"],
    allowedUnits: ["PAQUET", "M2"],
    plausibleMax: { PAQUET: 500, M2: 3000 },
  },
  {
    code: "mortar",
    label: "Mortier, ciment, mastic",
    keywords: ["mortier", "ciment", "chaux", "mastic", "colle", "joint"],
    allowedUnits: ["SAC", "KG", "U", "L"],
    plausibleMax: { SAC: 200, KG: 5000 },
  },
  {
    code: "waterproofing",
    label: "Étanchéité (membrane, EPDM)",
    keywords: ["epdm", "membrane", "bitume", "etancheite"],
    allowedUnits: ["M2", "ROULEAU"],
    plausibleMax: { M2: 3000, ROULEAU: 100 },
  },
];

export const ROOFING_PROFILE: TradeProfile = {
  id: "roofing",
  label: "Couverture",
  families: FAMILIES,
  laborKeywords: [...COMMON_LABOR, "demoussage", "bache", "traitement"],
  supplyKeywords: COMMON_SUPPLY,
  companionRules: [
    {
      when: "roof_tile",
      expectAnyOf: ["batten"],
      message: "Des tuiles sans liteaux : les liteaux sont-ils déjà en place ou oubliés ?",
    },
    {
      when: "roof_tile",
      expectAnyOf: ["roof_accessory"],
      message: "Des tuiles sans faîtières ni rives : les accessoires sont-ils oubliés ?",
    },
    {
      when: "slate",
      expectAnyOf: ["slate_hook"],
      message: "Des ardoises sans crochets ni clous : la fixation est-elle oubliée ?",
    },
    {
      when: "slate",
      expectAnyOf: ["batten", "sarking_board"],
      message: "Des ardoises sans liteaux ni voliges : le support est-il déjà en place ou oublié ?",
    },
    {
      when: "gutter",
      expectAnyOf: ["gutter_hook"],
      message: "Une gouttière sans crochets : les crochets sont-ils oubliés ?",
    },
    {
      when: "gutter",
      expectAnyOf: ["gutter_fitting", "downpipe"],
      message: "Une gouttière sans naissance ni descente : l'évacuation est-elle oubliée ?",
    },
  ],
  boilerplateMarkers: COMMON_BOILERPLATE,
  materialKeywords: FAMILIES.flatMap((f) => f.keywords),
};

