import type { ParamDef, Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, inPacks, lineQuantity, ok, packaging, rule, todo } from "./kit.js";

/**
 * TIROIR PAVAGE (lot B, paquet 5) : `docs/referentiels/pavage-dallage-exterieur.md` et
 * `referentiels/pavage-dallage-exterieur/tiroir.json` (relevé du 2026-10-04). Pavés béton en palettes, sable de pose en
 * big-bags d'une tonne, bordures à la pièce. Questions du comptoir seulement : l'épaisseur des pavés (6 ou 8 cm pour un
 * accès voiture), le type de bordure. L'épaisseur du lit de pose et les pertes ne se demandent jamais.
 */
const USAGE = "usage-paveur";
const HELLOPRO = "hellopro-bordure-t2";

const EPAISSEUR: ParamDef = {
  key: "epaisseur_paves",
  label: "Épaisseur des pavés",
  unit: "cm",
  kind: "site_data",
  question: "Pavés : 6 cm (piéton) ou 8 cm (accès voiture) ?",
  choices: [
    { label: "6 cm", value: "6" },
    { label: "8 cm", value: "8" },
  ],
  textValues: [
    { value: "8", keywords: ["8 cm", "ep 8", "epaisseur 8", "carrossable", "acces voiture", "allee de garage"] },
    { value: "6", keywords: ["6 cm", "ep 6", "epaisseur 6", "pietonne", "pieton"] },
  ],
};
const BORDURE: ParamDef = {
  key: "type_bordure",
  label: "Type de bordure",
  unit: "u",
  kind: "site_data",
  question: "Bordures : P1 (jardin) ou T2 (voirie) ?",
  choices: [
    { label: "P1 (jardin)", value: "1" },
    { label: "T2 (voirie)", value: "2" },
  ],
  display: { "1": "P1 6 × 20 × 100", "2": "T2 15 × 25 × 100" },
  textValues: [
    { value: "2", keywords: ["t2", "voirie"] },
    { value: "1", keywords: ["p1", "jardin", "bordurette"] },
  ],
};

export const PAVAGE_REFERENTIAL: Referential = {
  id: "pavage",
  version: "pavage-2026.10.06-2",
  trade: "paving",
  sources: [
    DEFINITION_SOURCE,
    { id: USAGE, kind: "trade_practice", title: "Référentiel pavage (docs/referentiels/pavage-dallage-exterieur.md), usages à valider", documentRef: "docs/referentiels/pavage-dallage-exterieur.md", retrievedAt: "2026-10-04" },
    { id: HELLOPRO, kind: "retailer", title: "Bordure béton T2 15 × 25 × 100 : ≈ 81 kg, 18 ou 24 par palette", url: "https://www.hellopro.fr/bordure-t2-2000585-6057533-produit.html", retrievedAt: "2026-10-04" },
  ],
  families: [
    { code: "paving_work", label: "Pavage", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["paves", "pave", "pavage", "allee pavee", "cour pavee"] },
    { code: "kerb_work", label: "Bordures", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["bordure", "bordures", "bordurette"] },
    { code: "paver", label: "Pavés", needUnit: "m2", attributes: [], keyAttributes: [] },
    { code: "bedding_sand", label: "Sable de pose", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "kerb", label: "Bordure", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic(
      "paves-beton",
      "paver",
      "Pavés béton, palette de 10 m²",
      "Pavés béton, palette 10 m²",
      inPacks("palette", "palette de 10 m²", "palettes de 10 m²", packaging("10", "m2", USAGE, todo("De 8 à 12 m² par palette selon le modèle."))),
    ),
    generic(
      "sable-04",
      "bedding_sand",
      "Sable 0/4 lavé, big-bag d'1 t",
      "Sable 0/4, big-bag 1 t",
      inPacks("bigbag", "big-bag d'1 t", "big-bags d'1 t", packaging("1", "t", USAGE, ok("Big-bag d'une tonne."))),
    ),
    generic("bordure", "kerb", "Bordure béton, longueur 1 m", "Bordures béton 1 m", byPiece("bordure", "bordures")),
  ],
  workItems: [
    {
      id: "pavage",
      trade: "paving",
      section: "principal",
      label: "Pavage sur lit de sable (pavés, sable)",
      triggers: ["paving_work"],
      params: [lineQuantity("surface", "Surface pavée", "m2", "Surface à paver ?"), EPAISSEUR],
      slots: [
        { key: "allee", family: "paving_work", label: "Pavage", measureOnly: true },
        { key: "paves", formOf: "allee", family: "paver", label: "Pavés", usual: { text: "Pavés béton en palette.", source: USAGE, productId: "paves-beton" } },
        { key: "sable", family: "bedding_sand", label: "Sable de pose", usual: { text: "Sable 0/4 en big-bag.", source: USAGE, productId: "sable-04" } },
      ],
      constants: {
        perte: rule("1.05", "1", USAGE, todo("Coupes en rive (§5)."), "pavés +5 %"),
        lit: rule("3", "cm", USAGE, todo("Lit de pose de 3 cm (§4)."), "lit de sable de {v}"),
        densite: rule("1600", "kg/m3", USAGE, todo("Sable 0/4 en place (§4)."), "sable 1,6 t/m³"),
      },
      needs: [
        {
          id: "paves",
          slot: "paves",
          formula: "surface * regle.perte",
          unit: "m2",
          core: true,
          designation: "Pavés béton {devis} ép. {epaisseur_paves|cm}, palette de 10 m²",
          precisionRequires: ["epaisseur_paves"],
          precision: "modèle et coloris du devis",
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        { id: "sable", slot: "sable", formula: "surface * regle.lit * regle.densite", unit: "kg", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
    {
      id: "bordures",
      trade: "paving",
      label: "Bordures béton (à la pièce)",
      triggers: ["kerb_work"],
      params: [lineQuantity("longueur", "Longueur de bordure", "m", "Longueur de bordure ?"), BORDURE],
      slots: [
        { key: "bordures", family: "kerb_work", label: "Bordures", measureOnly: true },
        { key: "bordure", formOf: "bordures", family: "kerb", label: "Bordures", usual: { text: "Bordure béton de 1 m.", source: HELLOPRO, productId: "bordure" } },
      ],
      constants: { piece: rule("1", "m", "definition", ok("Bordure de 1 m."), ""), perte: rule("1.05", "1", USAGE, todo("Coupes (§5)."), "bordures +5 %") },
      needs: [
        {
          id: "bordures",
          slot: "bordure",
          formula: "arrondi_sup(longueur * regle.perte / regle.piece)",
          unit: "u",
          core: true,
          designation: "Bordures béton {type_bordure}",
          precisionRequires: ["type_bordure"],
          source: HELLOPRO,
          verification: ok(),
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
