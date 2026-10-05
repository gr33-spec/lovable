import type { ParamDef, Referential } from "../model.js";
import { DEFINITION_SOURCE, assumed, byPiece, generic, inPacks, lineQuantity, ok, packaging, rule, todo } from "./kit.js";

/**
 * TIROIR FAÇADE (lot B, paquet 3) : `docs/referentiels/facadier.md` et `referentiels/facade/tiroir.json` (relevé du
 * 2026-10-04). Enduit monocouche en sacs de 25 kg selon la finition ; ITE sous enduit : panneaux d'isolant, mortier de
 * collage et sous-enduit, treillis en rouleaux de 50 m², rails de départ en barres de 2,50 m. Questions du comptoir
 * seulement : la finition de l'enduit, l'épaisseur d'isolant. Consommations, pertes et chevilles ne se demandent jamais :
 * hypothèses dites, orange tant qu'un façadier ne les a pas confirmées.
 */
const USAGE = "usage-facadier";
const WEBER_PRAL = "weber-pral-f";
const WEBER_THERM = "weber-therm-xm";
const BIGMAT_RAIL = "bigmat-rail-depart";
const STRIKOTHERM = "strikotherm-treillis";
const ECOROCK = "rockwool-ecorock";

const FINITION: ParamDef = {
  key: "finition",
  label: "Finition de l'enduit",
  unit: "u",
  kind: "site_data",
  question: "Enduit : finition grattée, talochée ou écrasée ?",
  choices: [
    { label: "Grattée", value: "1" },
    { label: "Talochée", value: "2" },
    { label: "Écrasée (rustique)", value: "3" },
  ],
  display: { "1": "finition grattée", "2": "finition talochée", "3": "finition écrasée" },
  textValues: [
    { value: "1", keywords: ["gratte", "grattee"] },
    { value: "2", keywords: ["taloche", "talochee"] },
    { value: "3", keywords: ["ecrase", "ecrasee", "rustique", "jete"] },
  ],
};
const EPAISSEUR_ISOLANT: ParamDef = {
  key: "epaisseur_isolant",
  label: "Épaisseur d'isolant",
  unit: "mm",
  kind: "site_data",
  question: "ITE : quelle épaisseur d'isolant ?",
  choices: [
    { label: "100 mm", value: "100" },
    { label: "120 mm", value: "120" },
    { label: "140 mm", value: "140" },
    { label: "160 mm", value: "160" },
  ],
  textValues: [
    { value: "100", keywords: ["100 mm", "ep 100", "epaisseur 100"] },
    { value: "120", keywords: ["120 mm", "ep 120", "epaisseur 120"] },
    { value: "140", keywords: ["140 mm", "ep 140", "epaisseur 140"] },
    { value: "160", keywords: ["160 mm", "ep 160", "epaisseur 160"] },
  ],
};

export const FACADE_REFERENTIAL: Referential = {
  id: "facade",
  version: "facade-2026.10.05-1",
  trade: "facade",
  sources: [
    DEFINITION_SOURCE,
    { id: USAGE, kind: "trade_practice", title: "Référentiel façade (docs/referentiels/facadier.md), usages à valider par un façadier", documentRef: "docs/referentiels/facadier.md", retrievedAt: "2026-10-04" },
    {
      id: WEBER_PRAL,
      kind: "manufacturer",
      title: "weber.pral F : gratté 27 kg/m², taloché ou rustique 23 kg/m², sac 25 kg",
      url: "https://www.lamaisonsaintgobain.fr/innovation-produit/enduit-de-facade-monocouche-traditionnel-weberpral-f",
      retrievedAt: "2026-10-04",
    },
    { id: WEBER_THERM, kind: "manufacturer", title: "weber.therm XM : collage 2,5 à 4,5 kg/m², sous-enduit 7,5 kg/m², sac 25 kg", url: "https://uploads.gedimat.fr/DOCUMENT/TYPE1/0000125213799.pdf", retrievedAt: "2026-10-04" },
    { id: BIGMAT_RAIL, kind: "retailer", title: "Rail de départ ITE aluminium : barre de 2,50 m", url: "https://bigmat.fr/wp-content/uploads/2024/08/2210.pdf", retrievedAt: "2026-10-04" },
    {
      id: STRIKOTHERM,
      kind: "manufacturer",
      title: "Treillis d'armature ITE : rouleau 1 × 50 m, recouvrement 10 cm",
      url: "https://www.strikolith.com/files/strikolith/2026-04/Strikotherm_Glasvezelweefsel_Fijn_fr.pdf",
      retrievedAt: "2026-10-04",
    },
    { id: ECOROCK, kind: "manufacturer", title: "Rockwool Ecorock : panneau 1 200 × 600 mm (0,72 m²)", url: "https://rockwool.com/siteassets/rw-f/telechargements/fiches-produits/rockwool_fp_ecorock_duo.pdf", retrievedAt: "2026-10-04" },
  ],
  families: [
    { code: "render_work", label: "Enduit monocouche", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["enduit monocouche", "monocouche", "enduit de facade", "ravalement enduit", "crepi"] },
    {
      code: "ite_work",
      label: "ITE sous enduit",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["ite", "isolation thermique par l'exterieur", "isolation par l'exterieur", "etics", "isolation exterieure"],
    },
    { code: "render", label: "Enduit monocouche", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "ite_mortar", label: "Mortier de collage et sous-enduit", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "ite_board", label: "Panneau d'isolant ITE", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "ite_mesh", label: "Treillis d'armature", needUnit: "m2", attributes: [], keyAttributes: [] },
    { code: "start_rail", label: "Rail de départ", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic(
      "monocouche-25",
      "render",
      "Enduit monocouche OC2 (type weber.pral F), sac de 25 kg",
      "Enduit monocouche, sac 25 kg",
      inPacks("sac", "sac de 25 kg", "sacs de 25 kg", packaging("25", "kg", WEBER_PRAL, ok("Sac 25 kg, palette 48 sacs."))),
    ),
    generic(
      "therm-xm-25",
      "ite_mortar",
      "Mortier de collage et sous-enduit ITE (type weber.therm XM), sac de 25 kg",
      "Mortier ITE collage + sous-enduit, sac 25 kg",
      inPacks("sac", "sac de 25 kg", "sacs de 25 kg", packaging("25", "kg", WEBER_THERM, ok("Sac 25 kg, palette 48."))),
    ),
    generic("ecorock", "ite_board", "Panneau de laine de roche ITE (type Rockwool Ecorock) 1 200 × 600 mm", "Laine de roche ITE 1 200 × 600", byPiece("panneau", "panneaux")),
    generic(
      "treillis-50",
      "ite_mesh",
      "Treillis d'armature fibre de verre ITE, maille 4 × 4, rouleau de 50 m²",
      "Treillis ITE, rouleau 50 m²",
      inPacks("rouleau", "rouleau de 50 m²", "rouleaux de 50 m²", packaging("50", "m2", STRIKOTHERM, ok("Rouleau 1 × 50 m."))),
    ),
    generic("rail-depart", "start_rail", "Rail de départ ITE aluminium, barre de 2,50 m", "Rail de départ ITE, barre 2,50 m", byPiece("barre", "barres")),
  ],
  workItems: [
    {
      id: "enduit-monocouche",
      trade: "facade",
      section: "principal",
      label: "Enduit monocouche (sacs selon la finition)",
      triggers: ["render_work"],
      params: [lineQuantity("surface", "Surface enduite", "m2", "Surface à enduire ?"), FINITION],
      slots: [
        { key: "facade", family: "render_work", label: "Façade", measureOnly: true },
        { key: "enduit", family: "render", label: "Enduit", usual: { text: "Monocouche OC2 en sac de 25 kg.", source: WEBER_PRAL, productId: "monocouche-25" } },
      ],
      constants: {
        perte: rule("1.05", "1", USAGE, todo("Reste en auge et projection (§5)."), "enduit +5 %"),
      },
      tables: {
        conso: {
          label: "enduit",
          unit: "kg/m2",
          axes: [{ param: "finition", thresholds: ["1", "2", "3"] }],
          values: [["27"], ["23"], ["23"]],
          source: WEBER_PRAL,
          verification: todo("Gratté 26 à 28 kg/m², taloché ou rustique 22 à 25 kg/m² (fiche weber.pral F)."),
          version: 1,
        },
      },
      needs: [
        {
          id: "enduit",
          slot: "enduit",
          formula: "surface * table.conso * regle.perte",
          unit: "kg",
          core: true,
          designation: "Enduit monocouche OC2, {finition}, sac 25 kg",
          precisionRequires: ["finition"],
          precision: "teinte du nuancier à préciser",
          source: WEBER_PRAL,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "ite",
      trade: "facade",
      section: "principal",
      label: "ITE sous enduit (isolant, mortier, treillis, rail de départ)",
      triggers: ["ite_work"],
      params: [
        lineQuantity("surface", "Surface isolée", "m2", "Surface isolée ?"),
        EPAISSEUR_ISOLANT,
        assumed("hauteur_facade", "Hauteur moyenne de façade", "m", "5.5", USAGE, todo(), "maison à un étage", [
          { label: "3 m (plain-pied)", value: "3" },
          { label: "5,5 m (R+1)", value: "5.5" },
          { label: "8 m (R+2)", value: "8" },
        ]),
      ],
      slots: [
        { key: "facade", family: "ite_work", label: "ITE", measureOnly: true },
        { key: "isolant", family: "ite_board", label: "Isolant", usual: { text: "Laine de roche ITE 1 200 × 600.", source: ECOROCK, productId: "ecorock" } },
        { key: "mortier", family: "ite_mortar", label: "Mortier de collage et sous-enduit", usual: { text: "Mortier ITE en sac de 25 kg.", source: WEBER_THERM, productId: "therm-xm-25" } },
        { key: "treillis", family: "ite_mesh", label: "Treillis", usual: { text: "Treillis 4 × 4 en rouleau de 50 m².", source: STRIKOTHERM, productId: "treillis-50" } },
        { key: "rail", family: "start_rail", label: "Rail de départ", usual: { text: "Rail alu, barre de 2,50 m.", source: BIGMAT_RAIL, productId: "rail-depart" } },
      ],
      constants: {
        panneau: rule("0.72", "m2", ECOROCK, ok("Panneau 1 200 × 600 mm."), "panneau de {v}"),
        perte_isolant: rule("1.05", "1", USAGE, todo("Découpes aux tableaux et angles (§5)."), "isolant +5 %"),
        collage: rule("3.5", "kg/m2", WEBER_THERM, todo("Collage 2,5 à 4,5 kg/m² selon le relief."), "collage {v}"),
        sous_enduit: rule("7.5", "kg/m2", WEBER_THERM, ok("Sous-enduit 7,5 kg/m² en 5 mm."), "sous-enduit {v}"),
        recouvrement: rule("1.1", "1", STRIKOTHERM, ok("Recouvrement de 10 cm entre lés."), "treillis +10 % de recouvrements"),
        barre_rail: rule("2.5", "m", BIGMAT_RAIL, ok("Barre de 2,50 m."), ""),
      },
      needs: [
        {
          id: "isolant",
          slot: "isolant",
          formula: "arrondi_sup(surface * regle.perte_isolant / regle.panneau)",
          unit: "u",
          core: true,
          designation: "Laine de roche ITE (type Rockwool Ecorock) 1 200 × 600, ép. {epaisseur_isolant|mm}",
          precisionRequires: ["epaisseur_isolant"],
          source: ECOROCK,
          verification: ok(),
          version: 1,
        },
        { id: "mortier", slot: "mortier", formula: "surface * (regle.collage + regle.sous_enduit)", unit: "kg", core: true, source: WEBER_THERM, verification: ok(), version: 1 },
        { id: "treillis", slot: "treillis", formula: "surface * regle.recouvrement", unit: "m2", core: true, source: STRIKOTHERM, verification: ok(), version: 1 },
        {
          id: "rail",
          slot: "rail",
          formula: "arrondi_sup(surface / hauteur_facade / regle.barre_rail)",
          unit: "u",
          core: true,
          designation: "Rail de départ ITE aluminium {epaisseur_isolant|mm#} mm, barre 2,50 m",
          precisionRequires: ["epaisseur_isolant"],
          source: BIGMAT_RAIL,
          verification: ok(),
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
