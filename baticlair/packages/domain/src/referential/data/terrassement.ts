import type { ParamDef, Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, inPacks, lineQuantity, ok, packaging, rule, todo } from "./kit.js";

/**
 * TIROIR TERRASSEMENT (lot B, paquet 5) : `docs/referentiels/terrassier.md` et `referentiels/terrassier/tiroir.json`
 * (relevé du 2026-10-04). Couche de forme en GNT à la tonne (livrée en vrac), film polyane en rouleaux de 150 m², fosse
 * toutes eaux au volume réglementaire. Questions du comptoir seulement : le volume de la fosse quand le devis ne le dit
 * pas. La densité et le foisonnement ne se demandent jamais : hypothèses dites, orange tant qu'un terrassier ne les a
 * pas confirmées.
 */
const USAGE = "usage-terrassier";
const POLYANE = "polyane-6x25";
const DTU641 = "dtu-64-1";

const VOLUME: ParamDef = {
  key: "volume_fosse",
  label: "Volume de la fosse",
  unit: "m3",
  kind: "site_data",
  question: "Fosse toutes eaux : 3 m³ (jusqu'à 5 pièces) ou 4 m³ (6 pièces) ?",
  hint: "3 m³ jusqu'à 5 pièces principales, +1 m³ par pièce en plus (NF DTU 64.1).",
  choices: [
    { label: "3 m³", value: "3" },
    { label: "4 m³", value: "4" },
    { label: "5 m³", value: "5" },
  ],
  display: { "3": "3 m³", "4": "4 m³", "5": "5 m³" },
  textValues: [
    { value: "5", keywords: ["5 m3", "5000 l", "5 000 l"] },
    { value: "4", keywords: ["4 m3", "4000 l", "4 000 l", "6 pieces"] },
    { value: "3", keywords: ["3 m3", "3000 l", "3 000 l", "5 pieces", "t4", "t5"] },
  ],
};

export const TERRASSEMENT_REFERENTIAL: Referential = {
  id: "terrassement",
  version: "terrassement-2026.10.05-1",
  trade: "earthworks",
  sources: [
    DEFINITION_SOURCE,
    { id: USAGE, kind: "trade_practice", title: "Référentiel terrassement (docs/referentiels/terrassier.md), usages à valider par un terrassier", documentRef: "docs/referentiels/terrassier.md", retrievedAt: "2026-10-04" },
    { id: POLYANE, kind: "retailer", title: "Film polyéthylène 150 µm sous dallage : rouleau 6 × 25 m (150 m²)", url: "https://www.bricomarche.com/p/film-d-etancheite-sous-dalle-polyethylene-6x25m/3396041120003", retrievedAt: "2026-10-04" },
    { id: DTU641, kind: "standard", title: "NF DTU 64.1 : fosse toutes eaux 3 m³ jusqu'à 5 pièces principales, +1 m³ par pièce", url: "https://reseau-eau.educagri.fr/files/fichierRessource1_NF-DTU-64.1.pdf", retrievedAt: "2026-10-04" },
  ],
  families: [
    { code: "subbase_work", label: "Couche de forme", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["couche de forme", "empierrement", "gnt", "grave non traitee", "tout venant", "herisson"] },
    { code: "membrane_work", label: "Film sous dallage", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["polyane", "film polyethylene", "film sous dallage"] },
    { code: "septic_work", label: "Fosse toutes eaux", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["fosse toutes eaux", "fosse septique", "microstation"] },
    { code: "aggregate", label: "Grave non traitée", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "poly_film", label: "Film polyane", needUnit: "m2", attributes: [], keyAttributes: [] },
    { code: "septic_tank", label: "Fosse toutes eaux", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic("gnt-0-31", "aggregate", "Grave non traitée GNT 0/31,5, livrée en vrac (à la tonne)", "GNT 0/31,5 en vrac", inPacks("tonne", "tonne", "tonnes", packaging("1", "t", USAGE, ok("Vendue à la tonne.")))),
    generic(
      "polyane-150",
      "poly_film",
      "Film polyane 150 µm sous dallage, rouleau 6 × 25 m",
      "Film polyane 150 µm, rouleau 150 m²",
      inPacks("rouleau", "rouleau de 150 m²", "rouleaux de 150 m²", packaging("150", "m2", POLYANE, ok("6 × 25 m = 150 m²."))),
    ),
    generic("fosse", "septic_tank", "Fosse toutes eaux polyéthylène", "Fosse toutes eaux", byPiece("fosse", "fosses")),
  ],
  workItems: [
    {
      id: "couche-de-forme",
      trade: "earthworks",
      section: "principal",
      label: "Couche de forme en GNT (à la tonne)",
      triggers: ["subbase_work"],
      params: [
        lineQuantity("surface", "Surface", "m2", "Surface ?"),
        {
          key: "epaisseur",
          label: "Épaisseur de la couche",
          unit: "cm",
          kind: "site_data",
          question: "Couche de forme : quelle épaisseur ?",
          default: { value: "20", source: USAGE, verification: todo(), version: 1, note: "20 cm sous un dallage courant" },
          choices: [
            { label: "15 cm", value: "15" },
            { label: "20 cm", value: "20" },
            { label: "30 cm", value: "30" },
          ],
          textLabels: ["ep", "epaisseur", "ep."],
        },
      ],
      slots: [
        { key: "plateforme", family: "subbase_work", label: "Couche de forme", measureOnly: true },
        { key: "gnt", family: "aggregate", label: "GNT", usual: { text: "GNT 0/31,5 en vrac.", source: USAGE, productId: "gnt-0-31" } },
      ],
      constants: {
        densite: rule("2000", "kg/m3", USAGE, todo("GNT compactée ≈ 2 t/m³ (§4)."), "GNT 2 t/m³ compactée"),
        foisonnement: rule("1.1", "1", USAGE, todo("Pertes au réglage et au compactage (§5)."), "GNT +10 %"),
      },
      needs: [{ id: "gnt", slot: "gnt", formula: "surface * epaisseur * regle.densite * regle.foisonnement", unit: "kg", core: true, source: USAGE, verification: ok(), version: 1 }],
    },
    {
      id: "film",
      trade: "earthworks",
      label: "Film polyane sous dallage",
      triggers: ["membrane_work"],
      params: [lineQuantity("surface", "Surface", "m2", "Surface ?")],
      slots: [
        { key: "film_sol", family: "membrane_work", label: "Film", measureOnly: true },
        { key: "film", family: "poly_film", label: "Film polyane", usual: { text: "Polyane 150 µm en rouleau 6 × 25 m.", source: POLYANE, productId: "polyane-150" } },
      ],
      constants: { recouvrement: rule("1.2", "1", USAGE, todo("Recouvrements de 20 cm et remontées (§4)."), "film +20 % de recouvrements") },
      needs: [{ id: "film", slot: "film", formula: "surface * regle.recouvrement", unit: "m2", core: true, source: POLYANE, verification: ok(), version: 1 }],
    },
    {
      id: "fosse",
      trade: "earthworks",
      label: "Fosse toutes eaux",
      triggers: ["septic_work"],
      params: [lineQuantity("nombre", "Nombre de fosses", "u", "Combien de fosses ?"), VOLUME],
      slots: [
        { key: "assainissement", family: "septic_work", label: "Assainissement", measureOnly: true },
        { key: "fosse", family: "septic_tank", label: "Fosse", usual: { text: "Fosse polyéthylène.", source: DTU641, productId: "fosse" } },
      ],
      constants: {},
      needs: [
        {
          id: "fosse",
          slot: "fosse",
          formula: "nombre",
          unit: "u",
          core: true,
          designation: "Fosse toutes eaux polyéthylène {volume_fosse}",
          precisionRequires: ["volume_fosse"],
          source: DTU641,
          verification: ok(),
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
