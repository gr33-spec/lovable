import type { Fact, Product, Provenance, Referential } from "../model.js";

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
const condition = (value: string, unit: string, verification: Provenance["verification"], note?: string) => fact("installation_condition", value, unit, verification === DRAFT ? "usage-plaquiste" : F, verification, note);
const ONE_PIECE = fact("packaging", "1", "u", "definition", DEFINITION);
const byPiece: Product["sellingUnits"] = [{ id: "piece", label: { one: "pièce", many: "pièces" }, contains: ONE_PIECE, primary: true }];
const generic = (id: string, family: string, label: string, shortLabel: string, extra: Partial<Product> = {}): Product => ({ id, family, label, shortLabel, aliases: [], generic: true, attributes: {}, sellingUnits: byPiece, ...extra });

export const PLATRERIE_REFERENTIAL: Referential = {
  id: "platrerie",
  version: "platrerie-2026.10.04-1",
  trade: "drywall",
  sources: [
    { id: F, kind: "trade_practice", title: "Référentiel quantitatif couverture-étanchéité (fondateur), section 16", documentRef: "docs/referentiel-couverture.md, section 16", retrievedAt: "2026-10-03" },
    { id: "usage-plaquiste", kind: "trade_practice", title: "Chiffres d'usage de plaquiste (entraxe 60 cm, rails haut et bas) — à faire valider par un plaquiste", documentRef: "referentiels/platrerie (à documenter)", retrievedAt: "2026-10-04", note: "Brouillon : aucune règle de cette source n'est affichée comme certaine." },
    { id: "definition", kind: "definition", title: "Définitions (1 pièce = 1 pièce)", retrievedAt: "2026-10-04" },
  ],
  families: [
    { code: "partition_72_48", label: "Cloison 72/48", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["cloison", "cloison 72/48", "cloison 72 48", "cloison placo", "cloison seche"] },
    { code: "plasterboard", label: "Plaque de plâtre", needUnit: "u", attributes: [{ key: "surface", label: "Surface d'une plaque", unit: "m2" }], keyAttributes: [], keywords: ["plaque de platre", "ba13", "ba 13", "placo"] },
    { code: "rail_48", label: "Rail 48", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["rail"] },
    { code: "stud_48", label: "Montant 48", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["montant"] },
    { code: "board_screw", label: "Vis à plaque", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["vis a plaque", "vis ttpc", "vis placo"], consumable: true },
    { code: "joint_tape", label: "Bande à joint", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["bande a joint", "bande joint"], consumable: true },
    { code: "joint_compound", label: "Enduit à joint", needUnit: "kg", attributes: [], keyAttributes: [], keywords: ["enduit a joint", "enduit"], consumable: true },
  ],
  products: [
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
      id: "cloison-72-48",
      trade: "drywall",
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
        rails_par_cloison: condition("2", "u", DRAFT, "Un rail en haut, un en bas."),
        montant_de_depart: condition("1", "u", DRAFT, "Le montant de départ, en plus d'un par entraxe."),
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
