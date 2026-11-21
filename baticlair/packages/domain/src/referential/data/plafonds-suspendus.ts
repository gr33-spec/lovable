import type { ParamDef, Product, Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, inPacks, lineQuantity, ok, packaging, rule, spec, todo } from "./kit.js";

/**
 * TIROIR PLAFONDS SUSPENDUS (lot B, paquet 4) : `docs/referentiels/plafonds-suspendus.md` et
 * `referentiels/plafonds-suspendus/tiroir.json` (relevé du 2026-10-04). Dalles 600 × 600 sur ossature T24 : dalles en
 * cartons entiers, porteurs de 3,60 m, entretoises de 1,20 m et 0,60 m, cornières de rive, suspentes. Questions du
 * comptoir seulement : le modèle de dalle, la hauteur de plénum. Le nombre de suspentes au m² et les pertes ne se
 * demandent jamais : hypothèses dites, orange tant qu'un plaquiste ne les a pas confirmées.
 */
const USAGE = "usage-plafonds";
const ROCKFON = "rockfon-tropic-arctic";

const PLENUM: ParamDef = {
  key: "plenum",
  label: "Hauteur de plénum",
  unit: "cm",
  kind: "site_data",
  question: "Suspentes : quelle hauteur de plénum ?",
  choices: [
    { label: "20 cm", value: "20" },
    { label: "50 cm", value: "50" },
    { label: "1 m", value: "100" },
  ],
  textValues: [
    { value: "20", keywords: ["plenum 20", "plenum de 20"] },
    { value: "50", keywords: ["plenum 50", "plenum de 50"] },
    { value: "100", keywords: ["plenum 100", "plenum de 1 m", "plenum 1 m"] },
  ],
};

const dalle = (id: string, label: string, short: string, carton: ReturnType<typeof packaging>, aliases: string[]): Product =>
  generic(id, "ceiling_tile", label, short, inPacks("carton", `carton de ${carton.value.replace(".", ",")} m²`, `cartons de ${carton.value.replace(".", ",")} m²`, carton), {
    aliases,
    attributes: { cote: spec("0.6", "m", "definition", ok("Dalle 600 × 600.")) },
  });

export const PLAFONDS_SUSPENDUS_REFERENTIAL: Referential = {
  id: "plafonds-suspendus",
  version: "plafonds-suspendus-2026.10.06-2",
  trade: "ceiling",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel plafonds suspendus (docs/referentiels/plafonds-suspendus.md), usages à valider par un plaquiste",
      documentRef: "docs/referentiels/plafonds-suspendus.md",
      retrievedAt: "2026-10-04",
    },
    { id: ROCKFON, kind: "retailer", title: "Rockfon 600 × 600 × 15 : Tropic carton de 16 dalles (5,76 m²), Arctic carton de 32 (11,52 m²)", url: "https://www.ccfltd.co.uk/Rockfon-Tropic-E15S8-600-x-600-x-15mm/p/564118", retrievedAt: "2026-10-04" },
  ],
  families: [
    { code: "grid_ceiling_work", label: "Plafond suspendu en dalles", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["faux plafond dalles", "plafond suspendu dalles", "dalles 600x600", "plafond demontable", "dalles minerales", "faux plafond demontable", "t24"] },
    { code: "ceiling_tile", label: "Dalle de plafond", needUnit: "m2", attributes: [{ key: "cote", label: "Côté", unit: "m" }], keyAttributes: [] },
    { code: "main_runner", label: "Porteur T24", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "cross_tee", label: "Entretoise T24", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "wall_angle", label: "Cornière de rive", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "hanger_wire", label: "Suspente", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    dalle("rockfon-tropic", "Dalle minérale 600 × 600 × 15 bord A (type Rockfon Tropic)", "Dalles 600×600 bord A (type Tropic)", {
      ...packaging("5.76", "m2", ROCKFON, todo("16 dalles par carton (Tropic) ; 32 pour l'Arctic.")),
      conflict: "5,76 m² (Tropic) ou 11,52 m² (Arctic) par carton.",
    }, ["tropic"]),
    dalle("rockfon-arctic", "Dalle minérale 600 × 600 × 15 bord A (type Rockfon Arctic)", "Dalles 600×600 bord A (type Arctic)", packaging("11.52", "m2", ROCKFON, ok("Carton de 32 dalles, 11,52 m².")), ["arctic"]),
    generic("porteur-360", "main_runner", "Porteur T24 blanc, longueur 3,60 m", "Porteurs T24, L 3,60 m", byPiece()),
    generic("entretoise-120", "cross_tee", "Entretoise T24 blanche, longueur 1,20 m", "Entretoises T24 1,20 m", byPiece()),
    generic("corniere-300", "wall_angle", "Cornière de rive blanche 24 × 24, longueur 3 m", "Cornières de rive 24×24, L 3 m", byPiece()),
    generic("suspente", "hanger_wire", "Suspente rapide (tige + ressort) pour T24", "Suspentes T24", byPiece()),
  ],
  workItems: [
    {
      id: "dalles-t24",
      trade: "ceiling",
      section: "principal",
      label: "Plafond en dalles 600 × 600 sur ossature T24",
      triggers: ["grid_ceiling_work"],
      params: [lineQuantity("surface", "Surface de plafond", "m2", "Surface de plafond ?"), PLENUM],
      slots: [
        { key: "plafond", family: "grid_ceiling_work", label: "Plafond", measureOnly: true },
        { key: "dalles", formOf: "plafond", family: "ceiling_tile", label: "Dalles", keywords: ["tropic", "arctic"], usual: { text: "Dalle minérale 600 × 600 bord A (type Rockfon Tropic), la plus courante.", source: ROCKFON, productId: "rockfon-tropic" } },
        { key: "porteurs", family: "main_runner", label: "Porteurs", usual: { text: "Porteurs T24 de 3,60 m.", source: USAGE, productId: "porteur-360" } },
        { key: "entretoises", family: "cross_tee", label: "Entretoises", usual: { text: "Entretoises T24 de 1,20 m.", source: USAGE, productId: "entretoise-120" } },
        { key: "rive", family: "wall_angle", label: "Cornières de rive", usual: { text: "Cornière 24 × 24 de 3 m.", source: USAGE, productId: "corniere-300" } },
        { key: "suspentes", family: "hanger_wire", label: "Suspentes", usual: { text: "Suspentes rapides.", source: USAGE, productId: "suspente" } },
      ],
      constants: {
        perte: rule("1.05", "1", USAGE, todo("Découpes en rive (§5)."), "dalles +5 %"),
        porteurs_par_m2: rule("0.83", "m/m2", USAGE, todo("Porteurs tous les 1,20 m (§4)."), "{v} de porteur par m²"),
        entretoises_par_m2: rule("1.39", "u/m2", USAGE, todo("Entretoises de 1,20 m tous les 0,60 m (§4)."), "{v} entretoises par m²"),
        rive_par_m2: rule("0.5", "m/m2", USAGE, todo("Périmètre des pièces rapporté à la surface (§4)."), "{v} de cornière par m²"),
        suspentes_par_m2: rule("0.7", "u/m2", USAGE, todo("Une suspente tous les 1,20 m de porteur (§4)."), "{v} suspente par m²"),
        porteur: rule("3.6", "m", "definition", ok("Porteur de 3,60 m."), ""),
        corniere: rule("3", "m", "definition", ok("Cornière de 3 m."), ""),
      },
      needs: [
        { id: "dalles", slot: "dalles", formula: "surface * regle.perte", unit: "m2", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "porteurs", slot: "porteurs", formula: "arrondi_sup(surface * regle.porteurs_par_m2 / regle.porteur)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "entretoises", slot: "entretoises", formula: "arrondi_sup(surface * regle.entretoises_par_m2)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "rive", slot: "rive", formula: "arrondi_sup(surface * regle.rive_par_m2 / regle.corniere)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        {
          id: "suspentes",
          slot: "suspentes",
          formula: "arrondi_sup(surface * regle.suspentes_par_m2)",
          unit: "u",
          core: true,
          designation: "Suspentes rapides T24 pour plénum de {plenum|cm}",
          precisionRequires: ["plenum"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
