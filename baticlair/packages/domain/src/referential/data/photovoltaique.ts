import type { ParamDef, Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, lineQuantity, ok, rule, todo } from "./kit.js";

/**
 * TIROIR PHOTOVOLTAÏQUE EN TOITURE (lot B, paquet 4) : `docs/referentiels/couvreur-photovoltaique.md` et
 * `referentiels/couvreur-photovoltaique/tiroir.json` (relevé du 2026-10-04). Pose en surimposition : les modules se
 * commandent tels que le devis les décrit (marque, puissance) ; BatiClair compte les rails K2 SingleRail de 4,40 m, les
 * crochets de toit selon la couverture, les brides et les micro-onduleurs. Questions du comptoir seulement : la couverture
 * (tuile, ardoise, bac acier), micro-onduleurs ou onduleur string. Le nombre de crochets par rail ne se demande jamais.
 */
const USAGE = "usage-couvreur-pv";
const K2 = "k2-singlerail-36";

const SUPPORT: ParamDef = {
  key: "support",
  label: "Couverture",
  unit: "u",
  kind: "site_data",
  question: "Panneaux posés sur tuile, ardoise ou bac acier ?",
  choices: [
    { label: "Tuile", value: "1" },
    { label: "Ardoise", value: "2" },
    { label: "Bac acier", value: "3" },
  ],
  display: { "1": "pour tuile", "2": "pour ardoise", "3": "pour bac acier" },
  textValues: [
    { value: "1", keywords: ["tuile", "tuiles"] },
    { value: "2", keywords: ["ardoise", "ardoises"] },
    { value: "3", keywords: ["bac acier", "bacs acier", "toiture metallique"] },
  ],
};
const ONDULEUR: ParamDef = {
  key: "onduleur",
  label: "Onduleur",
  unit: "u",
  kind: "site_data",
  question: "Onduleur : micro-onduleurs ou onduleur string ?",
  choices: [
    { label: "Micro-onduleurs", value: "1" },
    { label: "Onduleur string", value: "2" },
  ],
  textValues: [
    { value: "1", keywords: ["micro onduleur", "micro onduleurs", "micro-onduleur", "micro-onduleurs", "enphase"] },
    { value: "2", keywords: ["onduleur string", "onduleur central", "string"] },
  ],
};

export const PHOTOVOLTAIQUE_REFERENTIAL: Referential = {
  id: "photovoltaique",
  version: "photovoltaique-2026.10.05-1",
  trade: "solar",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel photovoltaïque (docs/referentiels/couvreur-photovoltaique.md), usages à valider par un couvreur-poseur",
      documentRef: "docs/referentiels/couvreur-photovoltaique.md",
      retrievedAt: "2026-10-04",
    },
    { id: K2, kind: "manufacturer", title: "K2 SingleRail 36 : rail de 4,40 m (aussi 2,40 m et 4,80 m)", url: "https://catalogue.k2-systems.com/singlerail-36/2003222", retrievedAt: "2026-10-04" },
  ],
  families: [
    {
      code: "pv_work",
      label: "Modules photovoltaïques en surimposition",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["panneau photovoltaique", "panneaux photovoltaiques", "panneaux solaires", "panneau solaire", "module photovoltaique", "modules photovoltaiques", "modules pv"],
    },
    { code: "pv_rail", label: "Rail de montage", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "pv_hook", label: "Crochet de toit", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "pv_clamp", label: "Bride", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "pv_inverter", label: "Onduleur", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic("k2-rail-440", "pv_rail", "Rail K2 SingleRail 36, longueur 4,40 m", "Rails K2 SingleRail 36, L 4,40 m", byPiece("rail", "rails")),
    generic("k2-crochet", "pv_hook", "Crochet de toit K2 inox", "Crochets de toit K2", byPiece()),
    generic("k2-bride", "pv_clamp", "Bride K2 (milieu et extrémité) pour cadre 30 à 40 mm", "Brides K2 milieu / extrémité", byPiece()),
    generic("onduleur", "pv_inverter", "Onduleur", "Onduleur", byPiece()),
  ],
  workItems: [
    {
      id: "pv-surimposition",
      trade: "solar",
      section: "principal",
      label: "Modules en surimposition (rails, crochets, brides, onduleurs)",
      triggers: ["pv_work"],
      params: [lineQuantity("nombre", "Nombre de modules", "u", "Combien de modules ?"), SUPPORT, ONDULEUR],
      slots: [
        { key: "modules", family: "pv_work", label: "Modules", measureOnly: true, orderedAsWritten: true },
        { key: "rails", family: "pv_rail", label: "Rails", usual: { text: "K2 SingleRail 36 de 4,40 m.", source: K2, productId: "k2-rail-440" } },
        { key: "crochets", family: "pv_hook", label: "Crochets de toit", usual: { text: "Crochets K2 selon la couverture.", source: USAGE, productId: "k2-crochet" } },
        { key: "brides", family: "pv_clamp", label: "Brides", usual: { text: "Brides K2.", source: USAGE, productId: "k2-bride" } },
        { key: "onduleurs", family: "pv_inverter", label: "Onduleurs", usual: { text: "Selon le devis.", source: USAGE, productId: "onduleur" } },
      ],
      constants: {
        largeur_module: rule("1.134", "m/u", USAGE, todo("Module de 1,134 m de large posé en portrait (§4)."), "{v} de rail par module et par file"),
        files: rule("2", "u", USAGE, ok("Deux rails par rangée de modules."), ""),
        perte_rail: rule("1.05", "1", USAGE, todo("Jonctions et dépassements (§5)."), "rails +5 %"),
        rail: rule("4.4", "m", K2, ok("Rail de 4,40 m."), ""),
        portee: rule("1.2", "m", USAGE, todo("Un crochet tous les 1,20 m de rail (§4)."), "un crochet tous les {v}"),
        brides_par_module: rule("2", "u/u", USAGE, todo("Deux brides par module et par file, extrémités comprises (§4)."), "{v} brides par module"),
      },
      needs: [
        { id: "rails", slot: "rails", formula: "arrondi_sup(nombre * regle.largeur_module * regle.files * regle.perte_rail / regle.rail)", unit: "u", core: true, source: K2, verification: ok(), version: 1 },
        {
          id: "crochets",
          slot: "crochets",
          formula: "arrondi_sup(nombre * regle.largeur_module * regle.files / regle.portee)",
          unit: "u",
          core: true,
          designation: "Crochets de toit K2 inox {support}",
          precisionRequires: ["support"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        { id: "brides", slot: "brides", formula: "nombre * regle.files * regle.brides_par_module", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "micro", slot: "onduleurs", formula: "nombre", unit: "u", core: true, when: "onduleur < 2", designation: "Micro-onduleurs (un par module)", source: USAGE, verification: ok(), version: 1 },
        { id: "string", slot: "onduleurs", formula: "1 + 0 * nombre", unit: "u", core: true, when: "onduleur >= 2", designation: "Onduleur string à la puissance de l'installation", source: USAGE, verification: ok(), version: 1 },
      ],
    },
  ],
  wasteRules: [],
};
