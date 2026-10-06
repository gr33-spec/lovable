import type { Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, inPacks, lineQuantity, ok, packaging, rule, spec, todo } from "./kit.js";

/**
 * TIROIR MENUISERIE INTÉRIEURE (lot B, paquet 4) : `docs/referentiels/menuiserie-interieure-agencement.md` et
 * `referentiels/menuiserie-interieure-agencement/tiroir.json` (relevé du 2026-10-04). Blocs-portes : commandés tels que
 * le devis les décrit (passage, sens, finition), avec leurs vis de fixation d'huisserie. Plinthes : barres entières et
 * mastic-colle en cartouches. Lambris : lames en paquets, clips en boîtes, tasseaux. Les questions du comptoir sur les
 * portes sont celles que le devis écrit ; la sous-couche et les pertes ne se demandent jamais : hypothèses dites.
 */
const USAGE = "usage-agenceur";
const BOSTIK = "bostik-fixation-plinthes";
const LUNA = "luna-profix-3";

export const MENUISERIE_INTERIEURE_REFERENTIAL: Referential = {
  id: "menuiserie-interieure",
  version: "menuiserie-interieure-2026.10.06-2",
  trade: "interior_joinery",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel menuiserie intérieure (docs/referentiels/menuiserie-interieure-agencement.md), usages à valider",
      documentRef: "docs/referentiels/menuiserie-interieure-agencement.md",
      retrievedAt: "2026-10-04",
    },
    { id: BOSTIK, kind: "manufacturer", title: "Bostik Fixation Plinthes : ≈ 15 m de cordon de 5 mm par cartouche", url: "https://diy.bostik.com/sites/default/files/2026-01/Bostik-Fixation-Plinthes-Multi-Materiaux-technical-data-sheet-ok.pdf", retrievedAt: "2026-10-04" },
    { id: LUNA, kind: "manufacturer", title: "Luna Profix 3 : boîtes de 100 clips, 1,6 clip par mètre de tasseau", url: "https://lunawood.com/fr/produits/boite-dinstallation-luna-profix-3/", retrievedAt: "2026-10-04" },
  ],
  families: [
    { code: "door_work", label: "Blocs-portes", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["bloc porte", "bloc-porte", "blocs portes", "porte interieure", "portes interieures", "porte de distribution"] },
    { code: "skirting_work", label: "Plinthes", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["plinthes", "plinthe"] },
    { code: "panelling_work", label: "Lambris", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["lambris", "habillage bois", "lames de lambris"] },
    { code: "frame_screw", label: "Vis de fixation d'huisserie", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
    { code: "skirting_board", label: "Plinthe", needUnit: "u", attributes: [{ key: "longueur", label: "Longueur", unit: "m" }], keyAttributes: [] },
    { code: "skirting_glue", label: "Mastic-colle", needUnit: "m", attributes: [], keyAttributes: [], consumable: true },
    { code: "panel_board", label: "Lames de lambris", needUnit: "m2", attributes: [], keyAttributes: [] },
    { code: "panel_clip", label: "Clips de lambris", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
    { code: "batten", label: "Tasseau", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic("vis-huisserie", "frame_screw", "Vis de fixation d'huisserie 6 × 100 avec chevilles", "Vis d'huisserie 6 × 100 + chevilles", byPiece()),
    generic("plinthe-240", "skirting_board", "Plinthe MDF revêtue blanc 10 × 70 mm, barre de 2,40 m", "Plinthes MDF 10×70, barre 2,40 m", byPiece("barre", "barres"), {
      attributes: { longueur: spec("2.4", "m", USAGE, ok("Barre de 2,40 m.")) },
    }),
    generic(
      "colle-plinthes",
      "skirting_glue",
      "Mastic-colle de fixation de plinthes, cartouche de 310 ml",
      "Mastic-colle plinthes 310 ml",
      inPacks("cartouche", "cartouche de 310 ml", "cartouches de 310 ml", { ...packaging("15", "m", BOSTIK, todo("≈ 15 m de cordon par cartouche.")), conflict: "Rendement annoncé selon la taille du cordon." }),
    ),
    generic(
      "lambris-sapin",
      "panel_board",
      "Lambris sapin 12 × 120 mm, paquet de 2,5 m²",
      "Lambris sapin, paquet 2,5 m²",
      inPacks("paquet", "paquet de 2,5 m²", "paquets de 2,5 m²", packaging("2.5", "m2", USAGE, todo("Paquets de 2 à 3 m² selon la longueur."))),
    ),
    generic(
      "clips-100",
      "panel_clip",
      "Clips de lambris, boîte de 100",
      "Clips lambris, boîte de 100",
      inPacks("boite", "boîte de 100", "boîtes de 100", packaging("100", "u", LUNA, ok("Boîtes de 100 clips."))),
    ),
    generic("tasseau-27x40", "batten", "Tasseau sapin 27 × 40 mm, longueur 2,40 m", "Tasseaux 27×40, L 2,40 m", byPiece("tasseau", "tasseaux")),
  ],
  workItems: [
    {
      id: "blocs-portes",
      trade: "interior_joinery",
      section: "principal",
      label: "Blocs-portes (tels que décrits au devis, fixation)",
      triggers: ["door_work"],
      params: [lineQuantity("nombre", "Nombre de blocs-portes", "u", "Combien de portes ?")],
      slots: [
        { key: "portes", family: "door_work", label: "Blocs-portes", measureOnly: true, orderedAsWritten: true },
        { key: "vis", family: "frame_screw", label: "Vis d'huisserie", usual: { text: "Vis 6 × 100 avec chevilles.", source: USAGE, productId: "vis-huisserie" } },
      ],
      constants: { vis_par_porte: rule("6", "u/u", USAGE, todo("Trois points de fixation par montant (§5)."), "{v} vis par huisserie") },
      needs: [{ id: "vis", slot: "vis", formula: "nombre * regle.vis_par_porte", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 }],
    },
    {
      id: "plinthes",
      trade: "interior_joinery",
      label: "Plinthes collées (barres, mastic-colle)",
      triggers: ["skirting_work"],
      params: [lineQuantity("longueur", "Longueur de plinthes", "m", "Longueur de plinthes ?")],
      slots: [
        { key: "plinthes", family: "skirting_work", label: "Plinthes", measureOnly: true },
        { key: "plinthe", formOf: "plinthes", family: "skirting_board", label: "Plinthes", usual: { text: "Plinthe MDF 10 × 70, barre de 2,40 m.", source: USAGE, productId: "plinthe-240" } },
        { key: "colle", family: "skirting_glue", label: "Mastic-colle", usual: { text: "Mastic-colle en cartouche.", source: BOSTIK, productId: "colle-plinthes" } },
      ],
      constants: { perte: rule("1.1", "1", USAGE, todo("Coupes d'angle et de porte (§5)."), "plinthes +10 % de coupe") },
      needs: [
        { id: "plinthes", slot: "plinthe", formula: "arrondi_sup(longueur * regle.perte / plinthe.longueur)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "colle", slot: "colle", formula: "longueur", unit: "m", core: true, source: BOSTIK, verification: ok(), version: 1 },
      ],
    },
    {
      id: "lambris",
      trade: "interior_joinery",
      label: "Lambris sur tasseaux (lames, clips, tasseaux)",
      triggers: ["panelling_work"],
      params: [lineQuantity("surface", "Surface de lambris", "m2", "Surface de lambris ?")],
      slots: [
        { key: "lambris", family: "panelling_work", label: "Lambris", measureOnly: true },
        { key: "lames", formOf: "lambris", family: "panel_board", label: "Lames", usual: { text: "Lambris sapin en paquets.", source: USAGE, productId: "lambris-sapin" } },
        { key: "clips", family: "panel_clip", label: "Clips", usual: { text: "Clips en boîte de 100.", source: LUNA, productId: "clips-100" } },
        { key: "tasseaux", family: "batten", label: "Tasseaux", usual: { text: "Tasseaux 27 × 40.", source: USAGE, productId: "tasseau-27x40" } },
      ],
      constants: {
        perte: rule("1.1", "1", USAGE, todo("Coupes et aboutages (§5)."), "lambris +10 % de coupe"),
        clips_par_m2: rule("3.2", "u/m2", LUNA, todo("1,6 clip par mètre de tasseau à 50 cm ; jusqu'à 30/m² en PVC."), "{v} clips par m²"),
        tasseaux_par_m2: rule("2", "m/m2", USAGE, todo("Tasseaux tous les 50 cm (§4)."), "{v} de tasseau par m²"),
        tasseau: rule("2.4", "m", "definition", ok("Tasseau de 2,40 m."), ""),
      },
      needs: [
        { id: "lames", slot: "lames", formula: "surface * regle.perte", unit: "m2", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "clips", slot: "clips", formula: "arrondi_sup(surface * regle.clips_par_m2)", unit: "u", core: true, source: LUNA, verification: ok(), version: 1 },
        { id: "tasseaux", slot: "tasseaux", formula: "arrondi_sup(surface * regle.tasseaux_par_m2 / regle.tasseau)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
  ],
  wasteRules: [],
};
