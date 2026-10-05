import type { ParamDef, Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, inPacks, lineQuantity, assumed, ok, packaging, rule, todo } from "./kit.js";

/**
 * TIROIR CHAUFFAGE-VENTILATION (lot B, paquet 2) : `docs/referentiels/chauffage-pac-ventilation.md`,
 * `docs/referentiels/ventilation-vmc.md` et `referentiels/chauffage-ventilation/tiroir.json` (relevé du 2026-10-04).
 * VMC simple flux : le kit, ses gaines en filets de 6 m, l'adhésif aluminium. Climatisation : le split tel que le devis le
 * décrit, et sa liaison frigorifique au bon diamètre. Questions du comptoir seulement : le type de VMC, le nombre de
 * sanitaires, les diamètres de liaison quand la puissance n'est pas écrite. Les mètres de gaine par bouche et la marge
 * de liaison ne se demandent jamais : hypothèses dites, orange tant qu'un chauffagiste ne les a pas confirmées.
 */
const USAGE = "usage-chauffagiste";
const ALDES_GAINE = "aldes-algaine-80";
const HYGROCOSY = "atlantic-hygrocosy-412292";
const ALDES_ADHESIF = "aldes-raa-50";
const WEINMANN = "weinmann-liaisons";

const TYPE_VMC: ParamDef = {
  key: "type_vmc",
  label: "Type de VMC",
  unit: "u",
  kind: "site_data",
  question: "VMC : autoréglable, hygro A ou hygro B ?",
  choices: [
    { label: "Hygro B", value: "1" },
    { label: "Hygro A", value: "2" },
    { label: "Autoréglable", value: "3" },
  ],
  display: { "1": "hygroréglable B", "2": "hygroréglable A", "3": "autoréglable" },
  textValues: [
    { value: "1", keywords: ["hygro b", "hygroreglable b", "hygroreglable type b"] },
    { value: "2", keywords: ["hygro a", "hygroreglable a", "hygroreglable type a"] },
    { value: "3", keywords: ["autoreglable", "auto reglable"] },
  ],
};
const SANITAIRES: ParamDef = {
  key: "sanitaires",
  label: "Sanitaires desservis",
  unit: "u",
  kind: "site_data",
  question: "VMC : combien de sanitaires (salle de bains, WC) en plus de la cuisine ?",
  choices: [
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
  ],
  textValues: [
    { value: "5", keywords: ["5 sanitaires", "5 pieces humides"] },
    { value: "4", keywords: ["4 sanitaires", "4 pieces humides"] },
    { value: "3", keywords: ["3 sanitaires", "3 pieces humides"] },
    { value: "2", keywords: ["2 sanitaires", "2 pieces humides"] },
  ],
};
const LIAISON: ParamDef = {
  key: "liaison",
  label: "Diamètres de liaison",
  unit: "u",
  kind: "site_data",
  question: "Liaisons frigorifiques : 1/4-3/8 ou 1/4-1/2 ?",
  hint: "1/4-3/8 pour les splits de 2,5 et 3,5 kW ; 1/4-1/2 au-delà (Weinmann-Schanz).",
  choices: [
    { label: "1/4-3/8 (2,5 à 3,5 kW)", value: "1" },
    { label: "1/4-1/2 (5 kW et plus)", value: "2" },
  ],
  display: { "1": "1/4-3/8", "2": "1/4-1/2" },
  textValues: [
    { value: "2", keywords: ["1/4-1/2", "5,0 kw", "5,2 kw", "6,0 kw", "7,1 kw"] },
    { value: "1", keywords: ["1/4-3/8", "2,5 kw", "2.5 kw", "3,5 kw", "3.5 kw", "2,6 kw", "3,4 kw"] },
  ],
};

export const CHAUFFAGE_VENTILATION_REFERENTIAL: Referential = {
  id: "chauffage-ventilation",
  version: "chauffage-ventilation-2026.10.05-1",
  trade: "hvac",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiels chauffage-PAC et VMC (docs/referentiels), usages à valider par un chauffagiste",
      documentRef: "docs/referentiels/ventilation-vmc.md",
      retrievedAt: "2026-10-04",
    },
    { id: ALDES_GAINE, kind: "retailer", title: "Aldes Algaine Ø80 isolée : filet de 6 m", url: "https://www.123elec.com/aldes-gaine-vmc-isolee-souple-en-pvc-l6m-d80mm-algaine-11091619.html", retrievedAt: "2026-10-04" },
    {
      id: HYGROCOSY,
      kind: "retailer",
      title: "Atlantic Hygrocosy 412292 : kit VMC hygro, 3 bouches, extensible à 6 sanitaires",
      url: "https://www.domomat.com/30409-kit-vmc-hygrocosy-simple-flux-hygroreglable-231mh-22db-avec-3-bouches-a-piles-atlantic-412292.html",
      retrievedAt: "2026-10-04",
    },
    { id: ALDES_ADHESIF, kind: "retailer", title: "Adhésif aluminium VMC Aldes RAA : rouleau de 50 m × 50 mm", url: "https://www.domomat.com/10224-bande-adhesive-raa-50m-aldes-11091013.html", retrievedAt: "2026-10-04" },
    {
      id: WEINMANN,
      kind: "manufacturer",
      title: "Liaisons 1/4-3/8 pour les splits de 2,5 et 3,5 kW",
      url: "https://weinmann-schanz.de/de/en/Heating/New-in-Range/Heat-generators-tanks/Refrigerant-line-1-4-and-3-8-for-Air-conditioning-devices-sid2670324.html",
      retrievedAt: "2026-10-04",
    },
  ],
  families: [
    { code: "vmc_work", label: "VMC simple flux", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["vmc simple flux", "vmc hygro", "vmc hygroreglable", "vmc autoreglable", "vmc", "ventilation mecanique"] },
    {
      code: "split_work",
      label: "Climatisation (split)",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["climatisation", "climatiseur", "split", "pompe a chaleur air/air", "pac air/air", "monosplit", "unite interieure"],
    },
    { code: "vmc_kit", label: "Kit VMC", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "vmc_duct_80", label: "Gaine VMC Ø80", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "vmc_duct_125", label: "Gaine VMC Ø125", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "alu_tape", label: "Adhésif aluminium", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
    { code: "refrigerant_line", label: "Liaison frigorifique", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic("kit-vmc", "vmc_kit", "Kit VMC simple flux (caisson, bouches, entrées d'air)", "Kit VMC simple flux", byPiece()),
    generic("gaine-80", "vmc_duct_80", "Gaine VMC souple isolée Ø80, filet de 6 m", "Gaine VMC isolée Ø80, 6 m", byPiece("filet", "filets")),
    generic("gaine-125", "vmc_duct_125", "Gaine VMC souple isolée Ø125, filet de 6 m", "Gaine VMC isolée Ø125, 6 m", byPiece("filet", "filets")),
    generic(
      "adhesif-alu",
      "alu_tape",
      "Adhésif aluminium VMC 50 mm, rouleau de 50 m",
      "Adhésif alu VMC, rouleau 50 m",
      inPacks("rouleau", "rouleau de 50 m", "rouleaux de 50 m", packaging("1", "u", ALDES_ADHESIF, ok("Rouleau de 50 m × 50 mm (Aldes RAA)."))),
    ),
    generic("liaison-5", "refrigerant_line", "Liaison frigorifique cuivre isolée, kit bitube de 5 m", "Liaison frigorifique isolée, kit 5 m", byPiece("kit", "kits")),
  ],
  workItems: [
    {
      id: "vmc",
      trade: "hvac",
      section: "principal",
      label: "VMC simple flux (kit, gaines, adhésif)",
      triggers: ["vmc_work"],
      params: [lineQuantity("nombre", "Nombre de VMC", "u", "Combien de VMC ?"), TYPE_VMC, SANITAIRES],
      slots: [
        { key: "vmcs", family: "vmc_work", label: "VMC", measureOnly: true },
        { key: "kit", family: "vmc_kit", label: "Kit VMC", usual: { text: "Kit simple flux (type Atlantic Hygrocosy).", source: HYGROCOSY, productId: "kit-vmc" } },
        { key: "gaine_80", family: "vmc_duct_80", label: "Gaines Ø80", usual: { text: "Gaine isolée Ø80, filet de 6 m.", source: ALDES_GAINE, productId: "gaine-80" } },
        { key: "gaine_125", family: "vmc_duct_125", label: "Gaine Ø125", usual: { text: "Gaine isolée Ø125 pour la cuisine.", source: USAGE, productId: "gaine-125" } },
        { key: "adhesif", family: "alu_tape", label: "Adhésif aluminium", usual: { text: "Adhésif alu 50 m.", source: ALDES_ADHESIF, productId: "adhesif-alu" } },
      ],
      constants: {
        filets_par_bouche: rule("1", "u/u", USAGE, todo("Une gaine de 6 m par bouche sanitaire (§4)."), "{v} gaine de 6 m par bouche"),
        filets_cuisine: rule("1", "u", USAGE, todo("Une gaine Ø125 de 6 m pour la cuisine, plus le rejet (§4)."), "{v} gaine Ø125 de 6 m pour la cuisine"),
      },
      needs: [
        {
          id: "kit",
          slot: "kit",
          formula: "nombre",
          unit: "u",
          core: true,
          designation: "Kit VMC simple flux {type_vmc}, cuisine + {sanitaires|u#} sanitaires",
          precisionRequires: ["type_vmc", "sanitaires"],
          source: HYGROCOSY,
          verification: ok(),
          version: 1,
        },
        { id: "gaine_80", slot: "gaine_80", formula: "nombre * sanitaires * regle.filets_par_bouche", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "gaine_125", slot: "gaine_125", formula: "nombre * regle.filets_cuisine", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "adhesif", slot: "adhesif", formula: "nombre", unit: "u", core: true, source: ALDES_ADHESIF, verification: ok(), version: 1 },
      ],
    },
    {
      id: "climatisation",
      trade: "hvac",
      section: "principal",
      label: "Climatisation (split tel qu'écrit, liaison frigorifique)",
      triggers: ["split_work"],
      params: [
        lineQuantity("nombre", "Nombre d'unités intérieures", "u", "Combien d'unités ?"),
        LIAISON,
        assumed("longueur_liaison", "Longueur de liaison", "m", "5", USAGE, todo(), "5 m entre unités intérieure et extérieure", [
          { label: "3 m", value: "3" },
          { label: "5 m", value: "5" },
          { label: "10 m", value: "10" },
        ]),
      ],
      slots: [
        { key: "splits", family: "split_work", label: "Climatiseurs", measureOnly: true, orderedAsWritten: true },
        { key: "liaison", family: "refrigerant_line", label: "Liaison frigorifique", usual: { text: "Kit bitube isolé.", source: WEINMANN, productId: "liaison-5" } },
      ],
      constants: {},
      needs: [
        {
          id: "liaison",
          slot: "liaison",
          formula: "nombre",
          unit: "u",
          core: true,
          designation: "Liaison frigorifique cuivre isolée {liaison}, kit bitube de {longueur_liaison|m}",
          precisionRequires: ["liaison"],
          source: WEINMANN,
          verification: ok(),
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
