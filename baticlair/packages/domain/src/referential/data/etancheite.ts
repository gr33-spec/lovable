import type { ParamDef, Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, inPacks, lineQuantity, ok, packaging, rule, todo } from "./kit.js";

/**
 * TIROIR ÉTANCHÉITÉ (lot B, paquet 3) : `docs/referentiels/etancheur.md` et `referentiels/etancheur/tiroir.json`
 * (relevé du 2026-10-04). Toiture-terrasse en bitume SBS bicouche : primaire (EIF) en bidons, isolant en panneaux,
 * sous-couche et couche autoprotégée en rouleaux entiers. Questions du comptoir seulement : l'épaisseur d'isolant quand le
 * devis ne la dit pas. Les recouvrements et la consommation d'EIF ne se demandent jamais : hypothèses dites, orange tant
 * qu'un étancheur ne les a pas confirmées.
 */
const USAGE = "usage-etancheur";
const MAMMOUTH = "chape-alu-mammouth";

const EPAISSEUR: ParamDef = {
  key: "epaisseur_isolant",
  label: "Épaisseur d'isolant",
  unit: "mm",
  kind: "site_data",
  question: "Isolant PIR : quelle épaisseur ?",
  choices: [
    { label: "80 mm", value: "80" },
    { label: "100 mm", value: "100" },
    { label: "120 mm", value: "120" },
    { label: "140 mm", value: "140" },
  ],
  textValues: [
    { value: "80", keywords: ["80 mm", "ep 80"] },
    { value: "100", keywords: ["100 mm", "ep 100"] },
    { value: "120", keywords: ["120 mm", "ep 120"] },
    { value: "140", keywords: ["140 mm", "ep 140"] },
  ],
};

export const ETANCHEITE_REFERENTIAL: Referential = {
  id: "etancheite",
  version: "etancheite-2026.10.06-2",
  trade: "waterproofing",
  sources: [
    DEFINITION_SOURCE,
    { id: USAGE, kind: "trade_practice", title: "Référentiel étanchéité (docs/referentiels/etancheur.md), usages à valider par un étancheur", documentRef: "docs/referentiels/etancheur.md", retrievedAt: "2026-10-04" },
    {
      id: MAMMOUTH,
      kind: "retailer",
      title: "Membrane bitume SBS : rouleaux de 1 × 6 m (Chape Alu Mammouth) et 1 × 10 m",
      url: "https://www.bricomarche.com/p/couche-de-finition-alu-chape-alu-mammouth-sbs-6x1m/3434550871617",
      retrievedAt: "2026-10-04",
    },
  ],
  families: [
    {
      code: "flat_roof_work",
      label: "Étanchéité de toiture-terrasse",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["etancheite", "toiture terrasse", "toit terrasse", "bicouche", "membrane bitume", "etancheite bitume"],
    },
    { code: "primer_eif", label: "Primaire EIF", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "roof_insulation", label: "Isolant de toiture-terrasse", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "underlayer", label: "Sous-couche bitume", needUnit: "m2", attributes: [], keyAttributes: [] },
    { code: "cap_sheet", label: "Couche autoprotégée", needUnit: "m2", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic(
      "eif-25",
      "primer_eif",
      "Enduit d'imprégnation à froid (EIF), bidon de 25 kg",
      "EIF, bidon 25 kg",
      inPacks("bidon", "bidon de 25 kg", "bidons de 25 kg", packaging("25", "kg", USAGE, todo("Bidons de 5, 10 ou 25 kg selon la marque."))),
    ),
    generic("pir-1200", "roof_insulation", "Panneau isolant PIR pour toiture-terrasse 1 200 × 1 000 mm, parement aluminium", "Isolant PIR toiture-terrasse 1 200 × 1 000", byPiece("panneau", "panneaux")),
    generic(
      "sous-couche-10",
      "underlayer",
      "Membrane bitume SBS sous-couche, rouleau de 1 × 10 m",
      "Membrane SBS sous-couche, rouleau 10 m²",
      inPacks("rouleau", "rouleau de 10 m²", "rouleaux de 10 m²", packaging("10", "m2", MAMMOUTH, todo("Rouleau 1 × 10 m en sous-couche : à confirmer."))),
    ),
    generic(
      "autoprotegee-6",
      "cap_sheet",
      "Membrane bitume SBS autoprotégée ardoisée, rouleau de 1 × 6 m",
      "Membrane SBS autoprotégée, rouleau 6 m²",
      inPacks("rouleau", "rouleau de 6 m²", "rouleaux de 6 m²", packaging("6", "m2", MAMMOUTH, todo("Rouleau 1 × 6 m relevé en GSB ; 1 × 8 m chez d'autres."))),
    ),
  ],
  workItems: [
    {
      id: "terrasse-bitume",
      trade: "waterproofing",
      section: "principal",
      label: "Toiture-terrasse bitume SBS bicouche (EIF, isolant, deux couches)",
      triggers: ["flat_roof_work"],
      params: [lineQuantity("surface", "Surface de terrasse", "m2", "Surface de la terrasse ?"), EPAISSEUR],
      slots: [
        { key: "terrasse", family: "flat_roof_work", label: "Toiture-terrasse", measureOnly: true },
        { key: "eif", family: "primer_eif", label: "EIF", usual: { text: "EIF en bidon.", source: USAGE, productId: "eif-25" } },
        { key: "isolant", family: "roof_insulation", label: "Isolant", usual: { text: "PIR 1 200 × 1 000.", source: USAGE, productId: "pir-1200" } },
        { key: "sous_couche", family: "underlayer", label: "Sous-couche", usual: { text: "Sous-couche SBS en rouleau.", source: MAMMOUTH, productId: "sous-couche-10" } },
        { key: "finition", formOf: "terrasse", family: "cap_sheet", label: "Couche autoprotégée", usual: { text: "Autoprotégée ardoisée en rouleau.", source: MAMMOUTH, productId: "autoprotegee-6" } },
      ],
      constants: {
        eif_par_m2: rule("0.3", "kg/m2", USAGE, todo("200 à 300 g/m² sur béton (§5)."), "EIF {v}"),
        panneau: rule("1.2", "m2", USAGE, ok("Panneau 1 200 × 1 000 mm."), ""),
        perte_isolant: rule("1.03", "1", USAGE, todo("Découpes en rive (§5)."), "isolant +3 %"),
        recouvrement: rule("1.12", "1", USAGE, todo("Recouvrements de 6 à 10 cm et relevés (§5)."), "membranes +12 % de recouvrements et relevés"),
      },
      needs: [
        { id: "eif", slot: "eif", formula: "surface * regle.eif_par_m2", unit: "kg", core: true, source: USAGE, verification: ok(), version: 1 },
        {
          id: "isolant",
          slot: "isolant",
          formula: "arrondi_sup(surface * regle.perte_isolant / regle.panneau)",
          unit: "u",
          core: true,
          designation: "Isolant PIR toiture-terrasse 1 200 × 1 000, ép. {epaisseur_isolant|mm}",
          precisionRequires: ["epaisseur_isolant"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        { id: "sous_couche", slot: "sous_couche", formula: "surface * regle.recouvrement", unit: "m2", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "finition", slot: "finition", formula: "surface * regle.recouvrement", unit: "m2", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
  ],
  wasteRules: [],
};
