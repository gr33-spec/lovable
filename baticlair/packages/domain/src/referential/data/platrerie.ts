import type { Fact, Product, Provenance, Referential } from "../model.js";
import { assumed, byPiece as piecesOf, generic as kitGeneric, inPacks, lineQuantity, ok, packaging, rule, todo } from "./kit.js";

/**
 * RÉFÉRENTIEL PLÂTRERIE MINIMAL (plan v3 §4.4) : UNE cloison sur ossature 72/48 (plaques BA13, rails et montants
 * 48, vis, bande à joint, enduit), écrite comme la couverture, pour prouver que le moteur est générique : il la
 * calcule sans qu'une ligne de moteur change.
 *
 * Sources : §16 du référentiel du fondateur pour les plaques, vis, bande et enduit (« m² × 1,10 / 3 arrondi sup. ;
 * vis 15/m² ; bande à joint 2 ml/m² ; enduit 0,4 kg/m² »). Rails et montants : AUCUN chiffre dans le référentiel du
 * fondateur → règles en BROUILLON (montrées seulement au validateur, marquées « provisoire »), à faire valider par un
 * plaquiste avant d'être affichées comme certaines.
 */
const F = "fondateur-referentiel-2026-10-03";
const FOUNDER_DOC = { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "Fondateur (couvreur)", note: "Référentiel quantitatif, section 16 (plafonds et plaques de plâtre)." } as const;
const DRAFT = { status: "draft", note: "Chiffre d'usage de plaquiste, pas encore dans le référentiel du fondateur : à valider." } as const;
const DEFINITION = { status: "verified", verifiedAt: "2026-10-04", verifiedBy: "BatiClair (définition)" } as const;

const fact = (kind: Fact["kind"], value: string, unit: string, source: string, verification: Provenance["verification"], note?: string): Fact => ({ kind, value, unit, source, verification, version: 1, ...(note ? { note } : {}) });
const condition = (value: string, unit: string, verification: Provenance["verification"], note?: string, label?: string) => ({
  ...fact("installation_condition", value, unit, verification === DRAFT ? "usage-plaquiste" : F, verification, note),
  ...(label ? { label } : {}),
});
const ONE_PIECE = fact("packaging", "1", "u", "definition", DEFINITION);
const byPiece: Product["sellingUnits"] = [{ id: "piece", label: { one: "pièce", many: "pièces" }, contains: ONE_PIECE, primary: true }];
const generic = (id: string, family: string, label: string, shortLabel: string, extra: Partial<Product> = {}): Product => ({ id, family, label, shortLabel, aliases: [], generic: true, attributes: {}, sellingUnits: byPiece, ...extra });

const PLACO_DOUBLAGE = "placo-doublage-colle";
const PLACO_PLAFOND = "placo-plafond-f530";
const COMBLISSIMO = "isover-comblissimo";
const USAGE_PLAQUISTE_DOC = "usage-plaquiste-doc";

/** Hauteur sous plafond : une hypothèse dite (2,50 m), jamais une question. */
const HAUTEUR = assumed(
  "hauteur",
  "Hauteur sous plafond",
  "m",
  "2.5",
  USAGE_PLAQUISTE_DOC,
  todo(),
  "hauteur courante d'un logement",
  [
    { label: "2,50 m", value: "2.5" },
    { label: "2,70 m", value: "2.7" },
    { label: "3 m", value: "3" },
  ],
  { textLabels: ["hauteur", "hsp"] },
);
/** R visé en combles perdus : le comptoir le demande (« épaisseur ou R visé ? »), lu au devis quand il l'écrit. */
const R_VISE = {
  key: "r_vise",
  label: "Résistance thermique visée",
  unit: "u",
  kind: "site_data" as const,
  question: "Quel R visé pour l'isolant ?",
  choices: [
    { label: "R 5", value: "5" },
    { label: "R 7", value: "7" },
    { label: "R 8", value: "8" },
    { label: "R 10", value: "10" },
  ],
  display: { "5": "R 5", "7": "R 7", "8": "R 8", "10": "R 10" },
  textValues: [
    { value: "10", keywords: ["r10", "r 10", "r=10"] },
    { value: "8", keywords: ["r8", "r 8", "r=8"] },
    { value: "7", keywords: ["r7", "r 7", "r=7"] },
    { value: "5", keywords: ["r5", "r 5", "r=5"] },
  ],
};

export const PLATRERIE_REFERENTIAL: Referential = {
  id: "platrerie",
  version: "platrerie-2026.10.05-1",
  trade: "drywall",
  sources: [
    { id: F, kind: "trade_practice", title: "Référentiel quantitatif couverture-étanchéité (fondateur), section 16", documentRef: "docs/referentiel-couverture.md, section 16", retrievedAt: "2026-10-03" },
    { id: "usage-plaquiste", kind: "trade_practice", title: "Chiffres d'usage de plaquiste (entraxe 60 cm, rails haut et bas) — à faire valider par un plaquiste", documentRef: "referentiels/platrerie (à documenter)", retrievedAt: "2026-10-04", note: "Brouillon : aucune règle de cette source n'est affichée comme certaine." },
    { id: "definition", kind: "definition", title: "Définitions (1 pièce = 1 pièce)", retrievedAt: "2026-10-04" },
    {
      id: PLACO_DOUBLAGE,
      kind: "manufacturer",
      title: "Placo, doublage collé Placomur : MAP 1,8 kg/m², bande 1,4 ml/m², enduit 0,33 kg/m²",
      url: "https://www.placo.fr/en/node/99101",
      retrievedAt: "2026-10-04",
    },
    {
      id: PLACO_PLAFOND,
      kind: "manufacturer",
      title: "Placo, plafond sur fourrures F530 : 1,79 ml/m², suspentes 1,8/m², bande 1,58 ml/m², enduit 0,37 kg/m²",
      url: "https://www.placo.fr/professionnels/solution/sp00012110/plafonds-sur-fourrures-stil-f-530-plancher-bois-1x-placoplatre-ba-13-stil-f-530-et-r-f-530-06-m",
      retrievedAt: "2026-10-04",
    },
    {
      id: COMBLISSIMO,
      kind: "manufacturer",
      title: "Isover Comblissimo : sacs de 17,3 kg pour 100 m² selon R (R5 15,4 ; R7 22 ; R8 24,7 ; R10 30,8)",
      url: "https://www.isover.fr/produits/laine-de-verre/comblissimo",
      retrievedAt: "2026-10-04",
    },
    {
      id: USAGE_PLAQUISTE_DOC,
      kind: "trade_practice",
      title: "Référentiel plâtrerie-isolation (docs/referentiels/platrerie-isolation.md), usages à valider par un plaquiste",
      documentRef: "docs/referentiels/platrerie-isolation.md",
      retrievedAt: "2026-10-04", },
  ],
  families: [
    { code: "partition_72_48", label: "Cloison 72/48", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["cloison", "cloison 72/48", "cloison 72 48", "cloison placo", "cloison seche"] },
    { code: "plasterboard", label: "Plaque de plâtre", needUnit: "u", attributes: [{ key: "surface", label: "Surface d'une plaque", unit: "m2" }], keyAttributes: [], keywords: ["plaque de platre", "ba13", "ba 13", "placo"] },
    { code: "rail_48", label: "Rail 48", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["rail"] },
    { code: "stud_48", label: "Montant 48", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["montant"] },
    { code: "board_screw", label: "Vis à plaque", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["vis a plaque", "vis ttpc", "vis placo"], consumable: true },
    { code: "joint_tape", label: "Bande à joint", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["bande a joint", "bande joint"], consumable: true },
    { code: "joint_compound", label: "Enduit à joint", needUnit: "kg", attributes: [], keyAttributes: [], keywords: ["enduit a joint", "enduit"], consumable: true,
    },
    {
      code: "lining_work",
      label: "Doublage collé",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["doublage colle", "doublage", "placomur", "doublissimo", "complexe de doublage"],
    },
    {
      code: "ceiling_work",
      label: "Plafond suspendu",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["plafond suspendu", "faux plafond", "plafond placo", "plafond sur fourrures", "plafond ba13", "plafond"],
    },
    {
      code: "loft_work",
      label: "Isolation des combles perdus",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["combles perdus", "laine soufflee", "isolation des combles", "soufflage", "comblissimo"],
    },
    { code: "lining_board", label: "Complexe de doublage", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "map_adhesive", label: "Mortier adhésif (MAP)", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "furring", label: "Fourrure F530", needUnit: "ml", attributes: [], keyAttributes: [] },
    { code: "hanger", label: "Suspente", needUnit: "u", attributes: [], keyAttributes: [] },
    {
      code: "blown_wool",
      label: "Laine à souffler",
      needUnit: "u",
      attributes: [],
      keyAttributes: [], },
  ],
  products: [
    kitGeneric(
      "complexe-doublage",
      "lining_board",
      "Complexe de doublage BA13 + isolant, largeur 1,20 m",
      "Complexes de doublage BA13 + isolant",
      piecesOf("complexe", "complexes"),
    ),
    kitGeneric(
      "map-25",
      "map_adhesive",
      "Mortier adhésif plâtre (MAP), sac de 25 kg",
      "Mortier adhésif MAP, sac 25 kg",
      inPacks("sac", "sac de 25 kg", "sacs de 25 kg", packaging("25", "kg", PLACO_DOUBLAGE, ok("Sac de 25 kg."))),
    ),
    kitGeneric(
      "fourrure-f530",
      "furring",
      "Fourrure Stil F530, barre de 3 m",
      "Fourrures F530 3 m",
      inPacks("barre", "barre de 3 m", "barres de 3 m", packaging("3", "m", PLACO_PLAFOND, ok("Barres de 3,00 m (ou 5,30 m)."))),
      { aliases: ["f530", "f 530", "fourrure"] },
    ),
    kitGeneric("suspente-f530", "hanger", "Suspente pour fourrure F530", "Suspentes F530", piecesOf("suspente", "suspentes")),
    kitGeneric(
      "laine-soufflee-17",
      "blown_wool",
      "Laine de verre à souffler (type Comblissimo), sac de 17,3 kg",
      "Laine de verre à souffler, sac 17,3 kg",
      piecesOf("sac de 17,3 kg", "sacs de 17,3 kg"),
      { aliases: ["comblissimo", "laine soufflee"] },
    ),
    generic("ba13-standard", "plasterboard", "Plaque de plâtre BA13, 1,20 × 2,50 m (3 m²), marque à préciser", "Plaques BA13 1,20 × 2,50", {
      aliases: ["ba13", "ba 13", "plaque ba13"],
      attributes: { surface: fact("manufacturer_spec", "3", "m2", F, FOUNDER_DOC, "« 1,20 × 2,50 = 3 m² » (§16).") },
      sellingUnits: [{ id: "plaque", label: { one: "plaque", many: "plaques" }, contains: ONE_PIECE, primary: true }],
    }),
    generic("rail-48-standard", "rail_48", "Rail R48, longueurs de 3 m", "Rails R48 3 m", {
      sellingUnits: [{ id: "longueur", label: { one: "longueur de 3 m", many: "longueurs de 3 m" }, contains: fact("packaging", "3", "m", "usage-plaquiste", DRAFT), primary: true }],
    }),
    generic("montant-48-standard", "stud_48", "Montant M48, longueur selon la hauteur sous plafond", "Montants M48"),
    generic("vis-plaque-standard", "board_screw", "Vis à plaque TTPC 25 mm, boîte de 1 000 (marque à préciser)", "Vis à plaque 25 mm", {
      sellingUnits: [
        { id: "piece", label: { one: "vis", many: "vis" }, contains: ONE_PIECE, primary: true },
        { id: "boite", label: { one: "boîte de 1 000", many: "boîtes de 1 000" }, contains: fact("packaging", "1000", "u", "usage-plaquiste", DRAFT) },
      ],
    }),
    generic("bande-joint-standard", "joint_tape", "Bande à joint papier, rouleau de 150 m (marque à préciser)", "Bande à joint", {
      sellingUnits: [
        { id: "ml", label: { one: "ml", many: "ml" }, contains: fact("packaging", "1", "m", "definition", DEFINITION), primary: true },
        { id: "rouleau", label: { one: "rouleau de 150 m", many: "rouleaux de 150 m" }, contains: fact("packaging", "150", "m", "usage-plaquiste", DRAFT) },
      ],
    }),
    generic("enduit-joint-standard", "joint_compound", "Enduit à joint, sac de 25 kg (marque à préciser)", "Enduit à joint", {
      sellingUnits: [
        { id: "kg", label: { one: "kg", many: "kg" }, contains: fact("packaging", "1", "kg", "definition", DEFINITION), primary: true },
        { id: "sac", label: { one: "sac de 25 kg", many: "sacs de 25 kg" }, contains: fact("packaging", "25", "kg", "usage-plaquiste", DRAFT) },
      ],
    }),
  ],
  workItems: [
    {
      id: "doublage-colle",
      trade: "drywall",
      section: "principal",
      label: "Doublage collé (complexes, MAP, bande, enduit)",
      triggers: ["lining_work"],
      params: [lineQuantity("surface", "Surface de doublage", "m2", "Surface de doublage ?"), HAUTEUR],
      slots: [
        {
          key: "doublage",
          family: "lining_work",
          label: "Doublage",
          measureOnly: true,
        },
        {
          key: "complexe",
          family: "lining_board",
          label: "Complexes de doublage",
          usual: {
            text: "Complexe BA13 + isolant, 1,20 m de large, à la hauteur sous plafond.",
            source: PLACO_DOUBLAGE,
            productId: "complexe-doublage",
          },
        },
        {
          key: "map",
          family: "map_adhesive",
          label: "Mortier adhésif",
          usual: {
            text: "Mortier adhésif (MAP) en sac de 25 kg.",
            source: PLACO_DOUBLAGE,
            productId: "map-25",
          },
        },
        {
          key: "bande",
          family: "joint_tape",
          label: "Bande à joint",
          usual: {
            text: "Bande à joint papier, 1,4 ml/m².",
            source: PLACO_DOUBLAGE,
            productId: "bande-joint-standard",
          },
        },
        {
          key: "enduit",
          family: "joint_compound",
          label: "Enduit à joint",
          usual: {
            text: "Enduit à joint en poudre, 0,33 kg/m².",
            source: PLACO_DOUBLAGE,
            productId: "enduit-joint-standard",
          },
        },
      ],
      constants: {
        perte: rule("1.05", "1", USAGE_PLAQUISTE_DOC, ok("Perte plaques 5 % en neuf (§5.9)."), "plaques +5 %"),
        largeur_complexe: rule("1.2", "m", PLACO_DOUBLAGE, ok("Complexe de 1,20 m de large."), "complexe de {v}"),
        map_par_m2: rule("1.8", "kg/m2", PLACO_DOUBLAGE, ok("MAP 1,8 kg/m² (Placo)."), "MAP {v}"),
        bande_par_m2: rule("1.4", "ml/m2", PLACO_DOUBLAGE, ok("Bande 1,4 ml/m² (Placo)."), "bande {v}"),
        enduit_par_m2: rule("0.33", "kg/m2", PLACO_DOUBLAGE, ok("Enduit poudre 0,33 kg/m² (Placo)."), "enduit {v}"),
      },
      needs: [
        {
          id: "complexes",
          slot: "complexe",
          formula: "arrondi_sup(surface / hauteur * regle.perte / regle.largeur_complexe)",
          unit: "u",
          core: true,
          precision: "longueur à la hauteur sous plafond",
          source: PLACO_DOUBLAGE,
          verification: ok(),
          version: 1,
        },
        { id: "map", slot: "map", formula: "surface * regle.map_par_m2", unit: "kg", core: true, source: PLACO_DOUBLAGE, verification: ok(), version: 1 },
        { id: "bande", slot: "bande", formula: "surface * regle.bande_par_m2", unit: "ml", core: true, source: PLACO_DOUBLAGE, verification: ok(), version: 1 },
        {
          id: "enduit",
          slot: "enduit",
          formula: "surface * regle.enduit_par_m2",
          unit: "kg",
          core: true,
          source: PLACO_DOUBLAGE,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "plafond-suspendu",
      trade: "drywall",
      section: "principal",
      label: "Plafond suspendu sur fourrures F530 (plaques, fourrures, suspentes, vis, bande, enduit)",
      triggers: ["ceiling_work"],
      params: [lineQuantity("surface", "Surface de plafond", "m2", "Surface de plafond ?")],
      slots: [
        {
          key: "plafond",
          family: "ceiling_work",
          label: "Plafond",
          measureOnly: true,
        },
        {
          key: "plaque",
          family: "plasterboard",
          label: "Plaques BA13",
          usual: {
            text: "BA13 1,20 × 2,50, pose perpendiculaire aux fourrures.",
            source: PLACO_PLAFOND,
            productId: "ba13-standard",
          },
        },
        {
          key: "fourrure",
          family: "furring",
          label: "Fourrures F530",
          usual: {
            text: "Fourrures F530 en barres de 3 m, entraxe 0,60 m.",
            source: PLACO_PLAFOND,
            productId: "fourrure-f530",
          },
        },
        {
          key: "suspente",
          family: "hanger",
          label: "Suspentes",
          usual: {
            text: "Suspentes F530, 1,8 par m².",
            source: PLACO_PLAFOND,
            productId: "suspente-f530",
          },
        },
        {
          key: "vis",
          family: "board_screw",
          label: "Vis à plaque",
          usual: {
            text: "Vis TTPC 25, 15 par m².",
            source: PLACO_PLAFOND,
            productId: "vis-plaque-standard",
          },
        },
        {
          key: "bande",
          family: "joint_tape",
          label: "Bande à joint",
          usual: {
            text: "Bande à joint papier, 1,58 ml/m².",
            source: PLACO_PLAFOND,
            productId: "bande-joint-standard",
          },
        },
        {
          key: "enduit",
          family: "joint_compound",
          label: "Enduit à joint",
          usual: {
            text: "Enduit à joint en poudre, 0,37 kg/m².",
            source: PLACO_PLAFOND,
            productId: "enduit-joint-standard",
          },
        },
      ],
      constants: {
        perte: rule("1.05", "1", USAGE_PLAQUISTE_DOC, ok("Perte plaques 5 % (§5.9)."), "plaques +5 %"),
        fourrure_par_m2: rule("1.79", "ml/m2", PLACO_PLAFOND, ok("1,79 ml/m² (Placo)."), "fourrures {v}"),
        suspentes_par_m2: rule("1.8", "u/m2", PLACO_PLAFOND, ok("1,8 suspente/m² (Placo, sous bois)."), "{v} suspentes"),
        vis_par_m2: rule("15", "u/m2", PLACO_PLAFOND, ok("15 vis TTPC 25 par m²."), "{v} vis"),
        bande_par_m2: rule("1.58", "ml/m2", PLACO_PLAFOND, ok("1,58 ml/m² (Placo)."), "bande {v}"),
        enduit_par_m2: rule("0.37", "kg/m2", PLACO_PLAFOND, ok("0,37 kg/m² en poudre (Placo)."), "enduit {v}"),
        perte_fourrures: rule("1.05", "1", USAGE_PLAQUISTE_DOC, todo("Chutes de fourrures (§5.5)."), "fourrures +5 %"),
      },
      needs: [
        {
          id: "plaques",
          slot: "plaque",
          formula: "arrondi_sup(surface * regle.perte / plaque.surface)",
          unit: "u",
          core: true,
          source: PLACO_PLAFOND,
          verification: ok(),
          version: 1,
        },
        {
          id: "fourrures",
          slot: "fourrure",
          formula: "surface * regle.fourrure_par_m2 * regle.perte_fourrures",
          unit: "ml",
          core: true,
          source: PLACO_PLAFOND,
          verification: ok(),
          version: 1,
        },
        {
          id: "suspentes",
          slot: "suspente",
          formula: "surface * regle.suspentes_par_m2",
          unit: "u",
          core: true,
          source: PLACO_PLAFOND,
          verification: ok(),
          version: 1,
        },
        { id: "vis", slot: "vis", formula: "surface * regle.vis_par_m2", unit: "u", core: true, source: PLACO_PLAFOND, verification: ok(), version: 1 },
        { id: "bande", slot: "bande", formula: "surface * regle.bande_par_m2", unit: "ml", core: true, source: PLACO_PLAFOND, verification: ok(), version: 1 },
        {
          id: "enduit",
          slot: "enduit",
          formula: "surface * regle.enduit_par_m2",
          unit: "kg",
          core: true,
          source: PLACO_PLAFOND,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "combles-souffles",
      trade: "drywall",
      label: "Isolation des combles perdus en laine soufflée",
      triggers: ["loft_work"],
      params: [lineQuantity("surface", "Surface de combles", "m2", "Surface de combles ?"), R_VISE],
      slots: [
        {
          key: "combles",
          family: "loft_work",
          label: "Combles",
          measureOnly: true,
        },
        {
          key: "laine",
          family: "blown_wool",
          label: "Laine à souffler",
          usual: {
            text: "Laine de verre à souffler en sac de 17,3 kg.",
            source: COMBLISSIMO,
            productId: "laine-soufflee-17",
          },
        },
      ],
      constants: {
        perte: rule("1.05", "1", USAGE_PLAQUISTE_DOC, todo("Perte au soufflage (§5.7)."), "laine +5 %"),
        base_table: rule("100", "m2", COMBLISSIMO, ok("La table du fabricant est donnée pour 100 m²."), ""),
      },
      tables: {
        sacs: {
          label: "sacs pour 100 m²",
          unit: "u",
          axes: [{ param: "r_vise", thresholds: ["5", "7", "8", "10"] }],
          values: [["15.4"], ["22"], ["24.7"], ["30.8"]],
          source: COMBLISSIMO,
          verification: ok("Table Comblissimo (sacs minimum pour 100 m², sans perte)."),
          version: 1,
        },
      },
      needs: [
        {
          id: "laine",
          slot: "laine",
          formula: "surface / regle.base_table * table.sacs * regle.perte",
          unit: "u",
          core: true,
          designation: "Laine de verre à souffler (type Comblissimo), sac de 17,3 kg, {r_vise}",
          precisionRequires: ["r_vise"],
          source: COMBLISSIMO,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "cloison-72-48",
      trade: "drywall",
      section: "principal",
      label: "Cloison 72/48 (plaques BA13, rails, montants, vis, bande, enduit)",
      triggers: ["partition_72_48"],
      params: [
        { key: "surface", label: "Surface de cloison", unit: "m2", kind: "site_data", question: "Surface de cloison ?", fromLineQuantity: true },
        {
          key: "hauteur",
          label: "Hauteur sous plafond",
          unit: "m",
          kind: "site_data",
          question: "Hauteur sous plafond ?",
          textLabels: ["hauteur", "hsp"],
          default: { value: "2.5", source: "usage-plaquiste", verification: DRAFT, version: 1, note: "hauteur courante d'un logement" },
          choices: [
            { label: "2,50 m", value: "2.5" },
            { label: "2,70 m", value: "2.7" },
            { label: "3 m", value: "3" },
          ],
        },
        {
          key: "entraxe_montants",
          label: "Entraxe des montants",
          unit: "cm",
          kind: "artisan_preference",
          question: "Entraxe des montants ?",
          textLabels: ["entraxe"],
          default: { value: "60", source: "usage-plaquiste", verification: DRAFT, version: 1, note: "entraxe courant" },
          choices: [
            { label: "40 cm", value: "40" },
            { label: "60 cm", value: "60" },
          ],
        },
      ],
      slots: [
        { key: "cloison", family: "partition_72_48", label: "Cloison 72/48", measureOnly: true },
        { key: "plaque", family: "plasterboard", label: "Plaques BA13", keywords: ["plaque", "ba13"], usual: { text: "BA13 1,20 × 2,50, une plaque par face (§16).", source: F, productId: "ba13-standard" } },
        { key: "rail", family: "rail_48", label: "Rails R48", keywords: ["rail"], usual: { text: "Un rail en haut, un en bas.", source: "usage-plaquiste", productId: "rail-48-standard" } },
        { key: "montant", family: "stud_48", label: "Montants M48", keywords: ["montant"], usual: { text: "Un montant par entraxe, plus un.", source: "usage-plaquiste", productId: "montant-48-standard" } },
        { key: "vis", family: "board_screw", label: "Vis à plaque", keywords: ["vis"], usual: { text: "15 vis par m² de plaque (§16).", source: F, productId: "vis-plaque-standard" } },
        { key: "bande", family: "joint_tape", label: "Bande à joint", keywords: ["bande"], usual: { text: "2 ml de bande par m² de plaque (§16).", source: F, productId: "bande-joint-standard" } },
        { key: "enduit", family: "joint_compound", label: "Enduit à joint", keywords: ["enduit"], usual: { text: "0,4 kg d'enduit par m² de plaque (§16).", source: F, productId: "enduit-joint-standard" } },
      ],
      constants: {
        faces: condition("2", "u", FOUNDER_DOC, "Une cloison a deux faces, une plaque par face."),
        marge_plaques: condition("1.1", "u", FOUNDER_DOC, "« m² × 1,10 » (§16)."),
        vis_par_m2: condition("15", "u/m2", FOUNDER_DOC, "« vis 15/m² » (§16)."),
        bande_par_m2: condition("2", "ml/m2", FOUNDER_DOC, "« bande à joint 2 ml/m² » (§16)."),
        enduit_par_m2: condition("0.4", "kg/m2", FOUNDER_DOC, "« enduit 0,4 kg/m² » (§16)."),
        rails_par_cloison: condition("2", "u", DRAFT, "Un rail en haut, un en bas.", "{v} rails par cloison (haut et bas)"),
        montant_de_depart: condition("1", "u", DRAFT, "Le montant de départ, en plus d'un par entraxe.", "1 montant par entraxe + {v} de départ"),
      },
      derived: [
        { key: "surface_plaques", label: "Surface de plaques (deux faces)", unit: "m2", formula: "surface * regle.faces", shown: true, source: F, verification: FOUNDER_DOC, version: 1 },
        { key: "longueur_cloison", label: "Longueur de cloison", unit: "m", formula: "surface / hauteur", shown: true, source: "usage-plaquiste", verification: DRAFT, version: 1 },
      ],
      needs: [
        { id: "plaques", slot: "plaque", formula: "arrondi_sup(surface_plaques * regle.marge_plaques / plaque.surface)", unit: "u", core: true, exclusions: "Hors découpes de portes et de gaines.", source: F, verification: FOUNDER_DOC, version: 1 },
        { id: "vis", slot: "vis", formula: "surface_plaques * regle.vis_par_m2", unit: "u", core: true, source: F, verification: FOUNDER_DOC, version: 1 },
        { id: "bande", slot: "bande", formula: "surface_plaques * regle.bande_par_m2", unit: "ml", core: true, source: F, verification: FOUNDER_DOC, version: 1 },
        { id: "enduit", slot: "enduit", formula: "surface_plaques * regle.enduit_par_m2", unit: "kg", core: true, source: F, verification: FOUNDER_DOC, version: 1 },
        { id: "rails", slot: "rail", formula: "longueur_cloison * regle.rails_par_cloison", unit: "ml", core: true, exclusions: "Hors huisseries.", source: "usage-plaquiste", verification: DRAFT, version: 1 },
        { id: "montants", slot: "montant", formula: "arrondi_sup(longueur_cloison / entraxe_montants) + regle.montant_de_depart", unit: "u", core: true, exclusions: "Hors montants doublés aux huisseries.", source: "usage-plaquiste", verification: DRAFT, version: 1 },
      ],
    },
  ],
  wasteRules: [],
  countedWorks: [],
};
