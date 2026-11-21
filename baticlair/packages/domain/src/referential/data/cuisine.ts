import type { Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, lineQuantity, ok, rule, todo } from "./kit.js";

/**
 * TIROIR CUISINE (lot B, paquet 4) : `docs/referentiels/cuisine.md` et `referentiels/cuisine/tiroir.json` (relevé du
 * 2026-10-04). Les meubles, l'électroménager et le plan de travail se commandent tels que le devis les décrit (fabricant,
 * gamme, coloris, références) : c'est ce que le comptoir demande. BatiClair compte ce qui en découle : les plinthes en
 * longueurs de 2,40 m sous les meubles bas, les pieds et la quincaillerie ne se demandent jamais (hypothèses dites).
 */
const USAGE = "usage-cuisiniste";
const PLINTHE = "goodhome-plinthe-cuisine";

export const CUISINE_REFERENTIAL: Referential = {
  id: "cuisine",
  version: "cuisine-2026.10.05-1",
  trade: "kitchen",
  sources: [
    DEFINITION_SOURCE,
    { id: USAGE, kind: "trade_practice", title: "Référentiel cuisine (docs/referentiels/cuisine.md), usages à valider par un cuisiniste", documentRef: "docs/referentiels/cuisine.md", retrievedAt: "2026-10-04" },
    {
      id: PLINTHE,
      kind: "retailer",
      title: "Plinthe de cuisine : longueur 2,40 m, hauteurs 10, 12 et 15 cm",
      url: "https://www.castorama.fr/plinthe-de-cuisine-goodhome-alpinia-chene-h-15-cm-x-l-2-4-m-x-ep-16-mm/3663602640035_CAFR.prd",
      retrievedAt: "2026-10-04",
    },
  ],
  families: [
    { code: "base_units_work", label: "Meubles bas", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["meuble bas", "meubles bas", "caisson bas", "meuble sous evier", "colonne"] },
    { code: "worktop_work", label: "Plan de travail", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["plan de travail", "plans de travail"] },
    { code: "kitchen_plinth", label: "Plinthe de cuisine", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "worktop_kit", label: "Kit de finition de plan", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
  ],
  products: [
    generic("plinthe-cuisine", "kitchen_plinth", "Plinthe de cuisine assortie aux façades, hauteur 15 cm, longueur 2,40 m", "Plinthes de cuisine H 15, L 2,40 m", byPiece("plinthe", "plinthes")),
    generic("kit-plan", "worktop_kit", "Kit de finition de plan de travail (chants assortis, joint silicone, équerres)", "Kit de finition de plan de travail", byPiece("kit", "kits")),
  ],
  workItems: [
    {
      id: "meubles-bas",
      trade: "kitchen",
      section: "principal",
      label: "Meubles bas (tels que décrits au devis, plinthes)",
      triggers: ["base_units_work"],
      params: [lineQuantity("nombre", "Nombre de meubles bas", "u", "Combien de meubles bas ?")],
      slots: [
        { key: "meubles", family: "base_units_work", label: "Meubles bas", measureOnly: true, orderedAsWritten: true },
        { key: "plinthes", family: "kitchen_plinth", label: "Plinthes", usual: { text: "Plinthe assortie, 2,40 m.", source: PLINTHE, productId: "plinthe-cuisine" } },
      ],
      constants: {
        largeur_meuble: rule("0.6", "m/u", USAGE, todo("Meuble bas de 60 cm en moyenne (§4)."), "{v} de façade par meuble"),
        plinthe: rule("2.4", "m", PLINTHE, ok("Plinthe de 2,40 m."), ""),
      },
      needs: [{ id: "plinthes", slot: "plinthes", formula: "arrondi_sup(nombre * regle.largeur_meuble / regle.plinthe)", unit: "u", core: true, source: PLINTHE, verification: ok(), version: 1 }],
    },
    {
      id: "plan-de-travail",
      trade: "kitchen",
      section: "principal",
      label: "Plan de travail (tel que décrit au devis, kit de finition)",
      triggers: ["worktop_work"],
      params: [lineQuantity("longueur", "Longueur de plan", "m", "Longueur de plan de travail ?")],
      slots: [
        { key: "plan", family: "worktop_work", label: "Plan de travail", measureOnly: true, orderedAsWritten: true },
        { key: "kit", family: "worktop_kit", label: "Kit de finition", usual: { text: "Chants, joint, équerres.", source: USAGE, productId: "kit-plan" } },
      ],
      constants: { longueur_plan: rule("4.1", "m", USAGE, todo("Plan de 4,10 m, la longueur courante (§4)."), "un kit par plan de {v}") },
      needs: [{ id: "kit", slot: "kit", formula: "arrondi_sup(longueur / regle.longueur_plan)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 }],
    },
  ],
  wasteRules: [],
};
