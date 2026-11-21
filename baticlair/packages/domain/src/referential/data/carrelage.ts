import type { Product, Referential } from "../model.js";
import { assumed, byPiece, DEFINITION_SOURCE, generic, inPacks, lineQuantity, ok, packaging, rule, spec, todo } from "./kit.js";

/**
 * TIROIR CARRELAGE (lot B, paquet 1) : `docs/referentiels/carrelage.md` (chapitres 2 à 7) et `referentiels/carrelage/
 * tiroir.json` (valeurs relevées le 2026-10-04). Le carreau en CARTONS entiers, la colle en sacs de 25 kg, le joint en
 * sacs de 5 kg, la SPEC en seaux, le ragréage en sacs de 25 kg. Questions : celles du comptoir seulement (le format du
 * carreau quand le devis ne le dit pas) ; la pose, le joint, la réserve sont des hypothèses dites.
 */
const USAGE = "usage-carreleur";
const WEBER_COL = "weber-col-flex-eco";
const WEBER_JOINT = "weber-joint-formule";
const WEBER_PROTEC = "weber-sys-protec";
const WEBER_NIV = "weber-niv-pro";
const VICAT = "vicat-dtu-52-2";
const BRICO_60 = "bricodepot-lou-60x60";
const TIROIR = "tiroir-carrelage-2026-10-04";

const piece = (l: number, w: number) => ({
  longueur: spec(String(l / 100), "m", "definition", ok("Format nominal.")),
  largeur: spec(String(w / 100), "m", "definition", ok("Format nominal.")),
});

/** Un format de carreau : le m² par carton est propre au produit (§2) ; la valeur du format sert par défaut, dite. */
function tile(
  id: string,
  l: number,
  w: number,
  label: string,
  short: string,
  epaisseur: [string, ReturnType<typeof ok>],
  carton: ReturnType<typeof packaging>,
  aliases: string[] = [],
): Product {
  return generic(
    id,
    "tile",
    label,
    short,
    inPacks("carton", `carton de ${carton.value.replace(".", ",")} m²`, `cartons de ${carton.value.replace(".", ",")} m²`, carton),
    {
      aliases: [`${l}x${w}`, `${l} x ${w}`, `${l}*${w}`, ...aliases],
      attributes: {
        ...piece(l, w),
        epaisseur: {
          ...spec(epaisseur[0], "mm", epaisseur[1].status === "verified" ? BRICO_60 : USAGE, epaisseur[1]),
          label: "carreau de {v} d'épaisseur",
        },
        carton: { ...carton, kind: "manufacturer_spec", label: "carton de {v}" },
      },
    },
  );
}

const CARTON_60 = packaging("1.44", "m2", BRICO_60, ok("Brico Dépôt LOU 60×60 : carton 1,44 m², palette 30 cartons."));
const PRODUCTS: Product[] = [
  tile("carreau-60x60", 60, 60, "Carrelage grès cérame 60 × 60 cm rectifié", "Carrelage grès cérame 60×60", ["9.5", ok()], CARTON_60),
  tile(
    "carreau-60x120",
    60,
    120,
    "Carrelage grès cérame 60 × 120 cm rectifié",
    "Carrelage grès cérame 60×120",
    ["9", todo()],
    packaging("1.44", "m2", "bricodepot-calacatta-60x120", ok("Palette 36 cartons = 51,84 m², soit 1,44 m² par carton.")),
  ),
  tile("carreau-45x45", 45, 45, "Carrelage grès cérame 45 × 45 cm", "Carrelage grès cérame 45×45", ["8", todo()], {
    ...packaging("1.62", "m2", TIROIR, todo()),
    conflict: "Les références relevées ne donnent pas toutes 1,62 m² par carton.",
  }),
  tile("carreau-30x60", 30, 60, "Carrelage grès cérame 30 × 60 cm", "Carrelage grès cérame 30×60", ["9", todo()], {
    ...packaging("1.44", "m2", TIROIR, todo()),
    conflict: "1,44 m² (Castorama) ou 1,08 m² (As de Carreaux) selon le modèle.",
  }),
  tile("carreau-33x33", 33, 33, "Carrelage 33 × 33 cm", "Carrelage 33×33", ["8", todo()], packaging("1.31", "m2", USAGE, todo())),
  tile(
    "faience-25x40",
    25,
    40,
    "Faïence murale 25 × 40 cm",
    "Faïence 25×40",
    ["8", todo()],
    packaging("1.5", "m2", TIROIR, ok("Relevé du tiroir (fiche négoce).")),
  ),
  tile("faience-20x50", 20, 50, "Faïence murale 20 × 50 cm", "Faïence 20×50", ["8", todo()], packaging("1.25", "m2", USAGE, todo())),
  generic("plinthe-8x60", "skirting_tile", "Plinthe carrelée 8 × 60 cm assortie", "Plinthes carrelées 8×60", byPiece(), {
    aliases: ["plinthe", "plinthes"],
    attributes: {
      longueur: spec("0.6", "m", "definition", ok("Pièce de 0,60 m.")),
    },
  }),
  generic(
    "colle-c2-25",
    "tile_adhesive",
    "Mortier-colle C2 S1 (type weber.col flex éco), sac de 25 kg",
    "Mortier-colle C2 S1, sac 25 kg",
    inPacks("sac", "sac de 25 kg", "sacs de 25 kg", packaging("25", "kg", WEBER_COL, ok("Sac 25 kg, palette 48 sacs (IDF Matériaux)."))),
    { aliases: ["mortier colle", "mortier-colle", "colle carrelage"] },
  ),
  generic(
    "joint-5",
    "tile_grout",
    "Mortier de joint ciment (type weber.joint fin), sac de 5 kg",
    "Mortier de joint, sac 5 kg",
    inPacks("sac", "sac de 5 kg", "sacs de 5 kg", packaging("5", "kg", WEBER_JOINT, ok("weber.joint fin : sac 5 kg (Leroy Merlin)."))),
    { aliases: ["joint carrelage", "mortier de joint"] },
  ),
  generic(
    "spec-20",
    "waterproofing_liquid",
    "Système de protection à l'eau sous carrelage (type weber.sys protec), seau de 20 kg",
    "SPEC liquide, seau 20 kg",
    inPacks("seau", "seau de 20 kg", "seaux de 20 kg", packaging("20", "kg", WEBER_PROTEC, ok("Seau 20 kg (fiche Weber, Samse)."))),
    { aliases: ["spec", "sel", "etancheite sous carrelage"] },
  ),
  generic(
    "ragreage-25",
    "self_leveling",
    "Ragréage autolissant P3 (type weber.niv pro), sac de 25 kg",
    "Ragréage autolissant P3, sac 25 kg",
    inPacks("sac", "sac de 25 kg", "sacs de 25 kg", packaging("25", "kg", WEBER_NIV, ok("Sac 25 kg, palette 48 sacs (fiche weber.niv pro)."))),
    { aliases: ["ragreage", "autolissant"] },
  ),
  generic(
    "primaire-5",
    "primer",
    "Primaire d'accrochage (type weber.prim RP), bidon de 5 kg",
    "Primaire d'accrochage, bidon 5 kg",
    inPacks("bidon", "bidon de 5 kg", "bidons de 5 kg", packaging("5", "kg", USAGE, todo("Contenance à confirmer (4, 5 ou 12 kg selon la marque)."))),
  ),
];

const POSE = [
  { label: "Droite", value: "1" },
  { label: "Décalée", value: "2" },
  { label: "Diagonale", value: "3" },
  { label: "Chevron", value: "4" },
];
const poseParam = assumed("pose", "Pose", "u", "1", USAGE, todo(), "pose droite, la plus courante", POSE, {
  display: {
    "1": "droite",
    "2": "décalée",
    "3": "diagonale",
    "4": "chevron",
  },
  textValues: [
    {
      value: "4",
      keywords: ["chevron", "point de hongrie", "baton rompu", "opus"],
    },
    { value: "3", keywords: ["diagonale"] },
    { value: "2", keywords: ["decalee", "decale", "coupe de pierre", "1/3", "1/2"] },
    { value: "1", keywords: ["pose droite"] },
  ],
});
const jointParam = assumed(
  "largeur_joint",
  "Largeur de joint",
  "mm",
  "2",
  VICAT,
  todo(),
  "joint de 2 mm (carreau rectifié)",
  [
    { label: "2 mm", value: "2" },
    { label: "3 mm", value: "3" },
    { label: "5 mm", value: "5" },
  ],
  { textLabels: ["joint de", "joints de"] },
);
/** Pertes de coupe selon la pose et le format (§5.2), usages de métier non normatifs : à confirmer par un carreleur. */
const PERTES = {
  label: "pertes de coupe",
  unit: "%",
  axes: [
    { param: "pose", thresholds: ["1", "2", "3", "4"] },
    { param: "cote", thresholds: ["0", "0.6"] },
  ],
  values: [
    ["5", "8"],
    ["8", "10"],
    ["12", "15"],
    ["15", "18"],
  ],
  source: USAGE,
  verification: todo("Usages de métier, non normatifs (§5.2)."),
  version: 1,
};
const COTE = {
  key: "cote",
  label: "Plus grand côté du carreau",
  unit: "m",
  formula: "max(carreau.longueur, carreau.largeur)",
  source: "definition",
  verification: ok(),
  version: 1,
};

const COLLE = {
  colle_simple: rule("3", "kg/m2", WEBER_COL, ok("Peigne 6×6, simple encollage (fiche Weber)."), "colle {v} (simple encollage)"),
  colle_double: rule("5.5", "kg/m2", WEBER_COL, ok("Peigne 9×9, double encollage (fiche Weber)."), "colle {v} (double encollage)"),
  seuil_double: rule("0.05", "m2", VICAT, ok("Double encollage au-delà de 500 cm² (fiche Vicat, NF DTU 52.2)."), "double encollage au-delà de 500 cm²"),
  reste_colle: rule("1.05", "1", USAGE, todo("Reste au fond des seaux et rattrapages (§5.3)."), "colle +5 % de reste"),
  densite_joint: rule("1500", "kg/m3", WEBER_JOINT, ok("Formule Weber : 1,5 × épaisseur × largeur de joint × (L + l) / (L × l)."), "joint densité 1,5"),
  perte_joint: rule("1.1", "1", USAGE, todo("Perte au lavage (§5.4)."), "joint +10 % au lavage"),
};
const TILE_NEEDS = (core: boolean) => [
  {
    id: "carreaux",
    slot: "carreau",
    formula: "surface * (1 + table.pertes) + si(surface >= regle.seuil_reserve, regle.cartons_reserve * carreau.carton, 0 * carreau.carton)",
    unit: "m2",
    core,
    precision: "carton entier, un seul bain",
    source: USAGE,
    verification: ok(),
    version: 1,
  },
  {
    id: "colle",
    slot: "colle",
    formula: "surface * si(carreau.longueur * carreau.largeur > regle.seuil_double, regle.colle_double, regle.colle_simple) * regle.reste_colle",
    unit: "kg",
    core: true,
    source: WEBER_COL,
    verification: ok(),
    version: 1,
  },
  {
    id: "joint",
    slot: "joint",
    formula:
      "surface * (carreau.longueur + carreau.largeur) / (carreau.longueur * carreau.largeur) * carreau.epaisseur * largeur_joint * regle.densite_joint * regle.perte_joint",
    unit: "kg",
    core: true,
    source: WEBER_JOINT,
    verification: ok(),
    version: 1,
  },
];
const TILE_CONSTANTS = {
  ...COLLE,
  seuil_reserve: rule("20", "m2", USAGE, todo("Réserve d'entretien au-delà de 20 m² (§5.2, ratio à valider)."), ""),
  cartons_reserve: rule("1", "u", USAGE, todo("Le client ne retrouvera jamais le même bain (§2)."), "{v} carton de réserve dès 20 m²"),
};
const tileSlots = (measure: { key: string; family: string; label: string }) => [
  { ...measure, measureOnly: true as const },
  {
    key: "carreau",
    // §49.1 : le carrelage écrit, ce sont ses carreaux ; colle et joints seulement s'ils sont écrits (ou sur le « oui »).
    formOf: measure.key,
    family: "tile",
    label: "Carreaux",
    keywords: ["carreau", "carrelage", "gres", "faience"],
    ask: "Quel format de carreau ?",
  },
  {
    key: "colle",
    family: "tile_adhesive",
    label: "Mortier-colle",
    usual: {
      text: "Mortier-colle C2 S1 en sac de 25 kg (sol et mur courants).",
      source: WEBER_COL,
      productId: "colle-c2-25",
    },
  },
  {
    key: "joint",
    family: "tile_grout",
    label: "Mortier de joint",
    usual: {
      text: "Mortier de joint ciment en sac de 5 kg.",
      source: WEBER_JOINT,
      productId: "joint-5",
    },
  },
];

export const CARRELAGE_REFERENTIAL: Referential = {
  id: "carrelage",
  version: "carrelage-2026.10.06-2",
  trade: "tiling",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel quantitatif carrelage (docs/referentiels/carrelage.md), usages de métier à valider par un carreleur",
      documentRef: "docs/referentiels/carrelage.md",
      retrievedAt: "2026-10-04",
    },
    {
      id: TIROIR,
      kind: "retailer",
      title: "Tiroir carrelage : valeurs relevées sur les fiches négoce",
      documentRef: "referentiels/carrelage/tiroir.json",
      retrievedAt: "2026-10-04",
    },
    {
      id: WEBER_COL,
      kind: "manufacturer",
      title: "weber.col flex éco (C2S1 ET) : consommations par peigne et encollage",
      url: "https://materiauxonline.fr/produit/Weber_Col_Flex_Eco_Gris_25kg",
      retrievedAt: "2026-10-04",
    },
    {
      id: WEBER_JOINT,
      kind: "manufacturer",
      title: "Formule de consommation des mortiers de joint Weber",
      url: "https://www.ma.weber/files/ma/2020-05/FTC-FR-P-webercolor-junta-premium.pdf",
      retrievedAt: "2026-10-04",
    },
    {
      id: WEBER_PROTEC,
      kind: "manufacturer",
      title: "weber.sys protec : 2 couches de 400 g/m²",
      url: "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1091512.pdf",
      retrievedAt: "2026-10-04",
    },
    {
      id: WEBER_NIV,
      kind: "manufacturer",
      title: "weber.niv pro : 1,5 kg/m²/mm, sac 25 kg",
      url: "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_295609.pdf",
      retrievedAt: "2026-10-04",
    },
    {
      id: VICAT,
      kind: "manufacturer",
      title: "Fiche Vicat citant le NF DTU 52.2 (mode d'encollage)",
      url: "https://www.mon-carrelage.com/BD_images/P8137.pdf",
      retrievedAt: "2026-10-04",
    },
    {
      id: BRICO_60,
      kind: "retailer",
      title: "Brico Dépôt, grès cérame LOU 60×60 : carton 1,44 m²",
      url: "https://www.bricodepot.fr/p/3660827059628/carrelage-de-sol-interieur-gres-cerame-60x60-lou-gris",
      retrievedAt: "2026-10-04",
    },
    {
      id: "bricodepot-calacatta-60x120",
      kind: "retailer",
      title: "Brico Dépôt, Calacatta 60×120 : palette 36 cartons = 51,84 m²",
      url: "https://www.bricodepot.fr/p/4262537230053/media.bricodepot.fr",
      retrievedAt: "2026-10-04",
    },
  ],
  families: [
    {
      code: "tile_floor_work",
      label: "Carrelage de sol",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: [
        "carrelage sol",
        "carrelage de sol",
        "carrelage au sol",
        "sol en gres",
        "gres cerame",
        "carrelage piece de vie",
        "carrelage interieur",
        "carrelage sol interieur",
      ],
    },
    {
      code: "tile_wall_work",
      label: "Faïence murale",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["faience", "credence", "carrelage mural", "carrelage murs", "carrelage mur"],
    },
    { code: "skirting_work", label: "Plinthes carrelées", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["plinthes", "plinthe"] },
    {
      code: "shower_work",
      label: "Douche à l'italienne (protection à l'eau)",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["douche a l'italienne", "douche italienne", "spec", "etancheite sous carrelage", "sel "],
    },
    {
      code: "leveling_work",
      label: "Ragréage",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["ragreage", "autolissant", "mise a niveau", "lissage"],
    },
    {
      code: "tile",
      label: "Carreau",
      needUnit: "m2",
      attributes: [
        { key: "longueur", label: "Longueur", unit: "m" },
        { key: "largeur", label: "Largeur", unit: "m" },
        { key: "epaisseur", label: "Épaisseur", unit: "mm" },
        { key: "carton", label: "Surface d'un carton", unit: "m2" },
      ],
      keyAttributes: ["longueur", "largeur"],
    },
    {
      code: "skirting_tile",
      label: "Plinthe carrelée",
      needUnit: "u",
      attributes: [{ key: "longueur", label: "Longueur d'une plinthe", unit: "m" }],
      keyAttributes: [],
    },
    { code: "tile_adhesive", label: "Mortier-colle", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "tile_grout", label: "Mortier de joint", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "waterproofing_liquid", label: "Protection à l'eau sous carrelage", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "self_leveling", label: "Ragréage autolissant", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "primer", label: "Primaire", needUnit: "kg", attributes: [], keyAttributes: [] },
  ],
  products: PRODUCTS,
  workItems: [
    {
      id: "carrelage-sol",
      trade: "tiling",
      section: "principal",
      label: "Carrelage de sol collé (carreaux, colle, joint)",
      triggers: ["tile_floor_work"],
      params: [lineQuantity("surface", "Surface carrelée", "m2", "Surface à carreler ?"), poseParam, jointParam],
      slots: tileSlots({
        key: "sol",
        family: "tile_floor_work",
        label: "Carrelage de sol",
      }),
      constants: TILE_CONSTANTS,
      derived: [COTE],
      tables: { pertes: PERTES },
      needs: TILE_NEEDS(true),
    },
    {
      id: "faience",
      trade: "tiling",
      section: "principal",
      label: "Faïence murale collée (carreaux, colle, joint)",
      triggers: ["tile_wall_work"],
      params: [lineQuantity("surface", "Surface de faïence", "m2", "Surface de faïence ?"), poseParam, jointParam],
      slots: tileSlots({
        key: "mur",
        family: "tile_wall_work",
        label: "Faïence murale",
      }),
      constants: TILE_CONSTANTS,
      derived: [COTE],
      tables: { pertes: PERTES },
      needs: TILE_NEEDS(true),
    },
    {
      id: "plinthes",
      trade: "tiling",
      label: "Plinthes carrelées",
      triggers: ["skirting_work"],
      params: [lineQuantity("longueur", "Longueur de plinthes", "m", "Longueur de plinthes ?")],
      slots: [
        {
          key: "plinthes",
          family: "skirting_work",
          label: "Plinthes",
          measureOnly: true,
        },
        {
          key: "plinthe", formOf: "plinthes",
          family: "skirting_tile",
          label: "Plinthes carrelées",
          usual: {
            text: "Plinthes 8 × 60 assorties au carrelage.",
            source: USAGE,
            productId: "plinthe-8x60",
          },
        },
      ],
      constants: { perte_plinthes: rule("1.05", "1", USAGE, todo("Coupes d'angle (§5.6)."), "plinthes +5 % de coupe") },
      needs: [
        {
          id: "plinthes",
          slot: "plinthe",
          formula: "arrondi_sup(longueur * regle.perte_plinthes / plinthe.longueur)",
          unit: "u",
          core: true,
          precision: "assorties au carrelage",
          source: USAGE,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "douche-spec",
      trade: "tiling",
      label: "Protection à l'eau sous carrelage (douche)",
      triggers: ["shower_work"],
      params: [lineQuantity("surface", "Surface à protéger", "m2", "Surface à protéger ?")],
      slots: [
        {
          key: "douche",
          family: "shower_work",
          label: "Douche",
          measureOnly: true,
        },
        {
          key: "spec", formOf: "douche",
          family: "waterproofing_liquid",
          label: "SPEC liquide",
          usual: {
            text: "SPEC liquide en seau de 20 kg (deux couches croisées).",
            source: WEBER_PROTEC,
            productId: "spec-20",
          },
        },
        {
          key: "primaire",
          family: "primer",
          label: "Primaire",
          usual: {
            text: "Primaire bouche-pores avant la SPEC.",
            source: USAGE,
            productId: "primaire-5",
          },
        },
      ],
      constants: {
        spec_par_m2: rule("0.8", "kg/m2", WEBER_PROTEC, ok("2 couches croisées de 400 g/m² (Avis technique 13/12-1153)."), "SPEC {v}"),
        reste_spec: rule("1.05", "1", USAGE, todo("Reste au fond des seaux (§5.5)."), "SPEC +5 %"),
        primaire_par_m2: rule("0.15", "kg/m2", USAGE, todo("100 à 200 g/m² selon le support (§4.5)."), "primaire {v}"),
      },
      needs: [
        {
          id: "spec",
          slot: "spec",
          formula: "surface * regle.spec_par_m2 * regle.reste_spec",
          unit: "kg",
          core: true,
          source: WEBER_PROTEC,
          verification: ok(),
          version: 1,
        },
        { id: "primaire", slot: "primaire", formula: "surface * regle.primaire_par_m2", unit: "kg", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
    {
      id: "ragreage",
      trade: "tiling",
      label: "Ragréage autolissant",
      triggers: ["leveling_work"],
      params: [
        lineQuantity("surface", "Surface à ragréer", "m2", "Surface à ragréer ?"),
        assumed(
          "epaisseur_ragreage",
          "Épaisseur de ragréage",
          "mm",
          "3",
          USAGE,
          todo(),
          "3 mm, minimum sous carrelage",
          [
            { label: "3 mm", value: "3" },
            { label: "5 mm", value: "5" },
            { label: "10 mm", value: "10" },
          ],
          { textLabels: ["epaisseur", "ep."] },
        ),
      ],
      slots: [
        {
          key: "ragreage_sol",
          family: "leveling_work",
          label: "Ragréage",
          measureOnly: true,
        },
        {
          key: "ragreage", formOf: "ragreage_sol",
          family: "self_leveling",
          label: "Ragréage",
          usual: {
            text: "Ragréage autolissant P3 en sac de 25 kg.",
            source: WEBER_NIV,
            productId: "ragreage-25",
          },
        },
        {
          key: "primaire",
          family: "primer",
          label: "Primaire",
          usual: {
            text: "Primaire d'accrochage avant ragréage.",
            source: USAGE,
            productId: "primaire-5",
          },
        },
      ],
      constants: {
        ragreage_par_m2_mm: rule("1500", "kg/m3", WEBER_NIV, ok("1,5 kg/m² par mm d'épaisseur (fiche weber.niv pro)."), "ragréage 1,5 kg/m² par mm"),
        primaire_par_m2: rule("0.15", "kg/m2", USAGE, todo("Primaire avant ragréage (§5.5)."), "primaire {v}"),
      },
      needs: [
        {
          id: "ragreage",
          slot: "ragreage",
          formula: "surface * epaisseur_ragreage * regle.ragreage_par_m2_mm",
          unit: "kg",
          core: true,
          source: WEBER_NIV,
          verification: ok(),
          version: 1,
        },
        { id: "primaire", slot: "primaire", formula: "surface * regle.primaire_par_m2", unit: "kg", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
  ],
  wasteRules: [],
};
