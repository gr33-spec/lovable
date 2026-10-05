import type { ParamDef, Referential } from "../model.js";
import { DEFINITION_SOURCE, assumed, byPiece, generic, lineQuantity, ok, rule, todo } from "./kit.js";

/**
 * TIROIR CHARPENTE (lot B, paquet 3) : `docs/referentiels/charpentier.md` et `referentiels/charpentier/tiroir.json`
 * (relevé du 2026-10-04). Règle d'or (§4) : on commande des PIÈCES d'une section dans une longueur commerciale, jamais
 * des m², des m³ ou des « ml » en vrac. Chevronnage : nombre de chevrons à l'entraxe, dans la longueur du rampant plus le
 * débord ; planches de rive en longueurs de 4 m. Questions du comptoir seulement : l'essence et le traitement, la
 * longueur des chevrons. L'entraxe et les pertes ne se demandent jamais : hypothèses dites, orange tant qu'un charpentier
 * ne les a pas confirmées. Le moteur ne dimensionne pas une charpente (§3) : il lit les sections du devis.
 */
const USAGE = "usage-charpentier";

const BOIS: ParamDef = {
  key: "bois",
  label: "Essence et traitement",
  unit: "u",
  kind: "artisan_preference",
  question: "Bois : sapin-épicéa traité classe 2, ou douglas ?",
  choices: [
    { label: "Sapin-épicéa traité classe 2", value: "1" },
    { label: "Douglas", value: "2" },
  ],
  display: { "1": "sapin-épicéa traité classe 2", "2": "douglas" },
  textValues: [
    { value: "2", keywords: ["douglas"] },
    { value: "1", keywords: ["sapin", "epicea", "classe 2", "traite"] },
  ],
};
const LONGUEUR: ParamDef = {
  key: "longueur_chevron",
  label: "Longueur des chevrons",
  unit: "m",
  kind: "site_data",
  question: "Chevrons : en quelle longueur (rampant + débord) ?",
  choices: [
    { label: "4 m", value: "4" },
    { label: "4,5 m", value: "4.5" },
    { label: "5 m", value: "5" },
    { label: "6 m", value: "6" },
  ],
  textValues: [
    { value: "6", keywords: ["l 6 m", "longueur 6 m", "6,00 m", "en 6 m"] },
    { value: "5", keywords: ["l 5 m", "longueur 5 m", "5,00 m", "en 5 m"] },
    { value: "4.5", keywords: ["l 4,5 m", "longueur 4,5 m", "4,50 m", "en 4,5 m"] },
    { value: "4", keywords: ["l 4 m", "longueur 4 m", "4,00 m", "en 4 m"] },
  ],
};
const SECTION = assumed(
  "section",
  "Section des chevrons",
  "u",
  "1",
  USAGE,
  todo(),
  "63 × 75, la section courante (§3.2)",
  [
    { label: "63 × 75", value: "1" },
    { label: "75 × 100", value: "2" },
    { label: "63 × 150", value: "3" },
  ],
  {
    display: { "1": "63×75", "2": "75×100", "3": "63×150" },
    textValues: [
      { value: "3", keywords: ["63x150", "6/15"] },
      { value: "2", keywords: ["75x100", "75x105", "7/10", "8/10"] },
      { value: "1", keywords: ["63x75", "6/8", "6x8", "60x80"] },
    ],
  },
);

export const CHARPENTE_REFERENTIAL: Referential = {
  id: "charpente",
  version: "charpente-2026.10.05-1",
  trade: "carpentry",
  sources: [
    DEFINITION_SOURCE,
    { id: USAGE, kind: "trade_practice", title: "Référentiel charpente (docs/referentiels/charpentier.md), usages à valider par un charpentier", documentRef: "docs/referentiels/charpentier.md", retrievedAt: "2026-10-04" },
  ],
  families: [
    { code: "rafter_work", label: "Chevronnage", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["chevronnage", "chevrons", "chevron", "charpente chevrons", "remplacement des chevrons"] },
    { code: "fascia_work", label: "Planches de rive", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["planches de rive", "planche de rive", "bandeau", "bandeaux de rive"] },
    { code: "rafter", label: "Chevron", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "rafter_nail", label: "Pointes de charpente", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
    { code: "fascia_board", label: "Planche de rive", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic("chevron", "rafter", "Chevron", "Chevrons", byPiece("chevron", "chevrons")),
    generic("pointes-torsadees", "rafter_nail", "Pointes torsadées galvanisées 3,4 × 90 mm", "Pointes torsadées 3,4 × 90", byPiece()),
    generic("rive-22x200", "fascia_board", "Planche de rive sapin traité classe 3, 22 × 200 mm, longueur 4 m", "Planches de rive 22×200, L 4 m", byPiece("planche", "planches")),
  ],
  workItems: [
    {
      id: "chevronnage",
      trade: "carpentry",
      section: "principal",
      label: "Chevronnage (chevrons à l'entraxe, pointes)",
      triggers: ["rafter_work"],
      params: [
        lineQuantity("surface", "Surface de toiture", "m2", "Surface de toiture ?"),
        BOIS,
        LONGUEUR,
        SECTION,
        assumed("entraxe", "Entraxe des chevrons", "m", "0.6", USAGE, todo(), "60 cm sous tuiles ou ardoises", [
          { label: "50 cm", value: "0.5" },
          { label: "60 cm", value: "0.6" },
        ]),
      ],
      slots: [
        { key: "toiture", family: "rafter_work", label: "Chevronnage", measureOnly: true },
        { key: "chevrons", family: "rafter", label: "Chevrons", usual: { text: "Chevrons à la section du devis.", source: USAGE, productId: "chevron" } },
        { key: "pointes", family: "rafter_nail", label: "Pointes", usual: { text: "Pointes torsadées 3,4 × 90.", source: USAGE, productId: "pointes-torsadees" } },
      ],
      constants: {
        debord: rule("0.5", "m", USAGE, todo("Débord d'égout courant (§4)."), "débord de {v}"),
        rives: rule("2", "u", USAGE, todo("Un chevron de rive de chaque côté (§4)."), "{v} chevrons de rive"),
        pointes_par_chevron: rule("6", "u/u", USAGE, todo("2 pointes par appui, 3 appuis (§5)."), "{v} pointes par chevron"),
      },
      needs: [
        {
          id: "chevrons",
          slot: "chevrons",
          formula: "arrondi_sup(surface / (longueur_chevron - regle.debord) / entraxe) + regle.rives",
          unit: "u",
          core: true,
          designation: "Chevrons {bois} {section}, L {longueur_chevron|m}",
          precisionRequires: ["bois", "longueur_chevron"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        {
          id: "pointes",
          slot: "pointes",
          formula: "(arrondi_sup(surface / (longueur_chevron - regle.debord) / entraxe) + regle.rives) * regle.pointes_par_chevron",
          unit: "u",
          core: true,
          source: USAGE,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "planches-rive",
      trade: "carpentry",
      label: "Planches de rive (longueurs de 4 m)",
      triggers: ["fascia_work"],
      params: [lineQuantity("longueur", "Longueur de rive", "m", "Longueur de rive ?")],
      slots: [
        { key: "rive", family: "fascia_work", label: "Rives", measureOnly: true },
        { key: "planches", family: "fascia_board", label: "Planches de rive", usual: { text: "Planche 22 × 200 traitée, L 4 m.", source: USAGE, productId: "rive-22x200" } },
      ],
      constants: {
        perte: rule("1.1", "1", USAGE, todo("Coupes d'onglet et aboutages (§5)."), "planches +10 % de coupe"),
        longueur_planche: rule("4", "m", "definition", ok("Planche de 4 m."), ""),
      },
      needs: [{ id: "planches", slot: "planches", formula: "arrondi_sup(longueur * regle.perte / regle.longueur_planche)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 }],
    },
  ],
  wasteRules: [],
};
