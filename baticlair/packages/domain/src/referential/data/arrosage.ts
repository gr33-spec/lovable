import type { ParamDef, Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, inPacks, lineQuantity, ok, packaging, rule, todo } from "./kit.js";

/**
 * TIROIR ARROSAGE AUTOMATIQUE (lot B, paquet 5) : `docs/referentiels/arrosage-automatique.md` et
 * `referentiels/arrosage-automatique/tiroir.json` (relevé du 2026-10-04). Pelouse arrosée par tuyères ou turbines : tube
 * PE 25 en couronnes, arroseurs, électrovannes par secteur, programmateur. Questions du comptoir seulement : tuyères ou
 * turbines, le nombre de stations du programmateur. Les mètres de tube par arroseur et le débit par secteur ne se
 * demandent jamais : hypothèses dites, orange tant qu'un installateur ne les a pas confirmées.
 */
const USAGE = "usage-arrosage";
const BRICOMARCHE = "tube-pe25-couronne";

const ARROSEURS: ParamDef = {
  key: "arroseurs",
  label: "Arroseurs",
  unit: "u",
  kind: "site_data",
  question: "Arroseurs : tuyères (petites surfaces) ou turbines (grandes surfaces) ?",
  choices: [
    { label: "Tuyères", value: "1" },
    { label: "Turbines", value: "2" },
  ],
  display: { "1": "tuyères escamotables", "2": "turbines escamotables" },
  textValues: [
    { value: "1", keywords: ["tuyere", "tuyeres"] },
    { value: "2", keywords: ["turbine", "turbines"] },
  ],
};
const STATIONS: ParamDef = {
  key: "stations",
  label: "Stations du programmateur",
  unit: "u",
  kind: "site_data",
  question: "Programmateur : combien de stations ?",
  choices: [
    { label: "4", value: "4" },
    { label: "6", value: "6" },
    { label: "8", value: "8" },
  ],
  textValues: [
    { value: "8", keywords: ["8 stations", "8 zones", "8 secteurs", "8 voies"] },
    { value: "6", keywords: ["6 stations", "6 zones", "6 secteurs", "6 voies"] },
    { value: "4", keywords: ["4 stations", "4 zones", "4 secteurs", "4 voies"] },
  ],
};

export const ARROSAGE_REFERENTIAL: Referential = {
  id: "arrosage",
  version: "arrosage-2026.10.06-2",
  trade: "irrigation",
  sources: [
    DEFINITION_SOURCE,
    { id: USAGE, kind: "trade_practice", title: "Référentiel arrosage automatique (docs/referentiels/arrosage-automatique.md), usages à valider", documentRef: "docs/referentiels/arrosage-automatique.md", retrievedAt: "2026-10-04" },
    { id: BRICOMARCHE, kind: "retailer", title: "Tube PE 25 basse densité 6 bar : couronnes de 25, 50 et 100 m", url: "https://www.bricomarche.com/p/tube-polyethylene-bd-6-bars-d.25-couronne-50m/3396048125506", retrievedAt: "2026-10-04" },
  ],
  families: [
    { code: "irrigation_work", label: "Arrosage automatique", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["arrosage automatique", "arrosage enterre", "systeme d'arrosage", "arrosage integre"] },
    { code: "pe_pipe", label: "Tube PE", needUnit: "m", attributes: [], keyAttributes: [] },
    { code: "sprinkler", label: "Arroseur", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "valve", label: "Électrovanne", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "controller", label: "Programmateur", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic(
      "pe25-50",
      "pe_pipe",
      "Tube PE 25 basse densité 6 bar, couronne de 50 m",
      "Tube PE 25 PN6, couronne 50 m",
      inPacks("couronne", "couronne de 50 m", "couronnes de 50 m", packaging("50", "m", BRICOMARCHE, todo("Couronnes de 25, 50 et 100 m, à confirmer."))),
    ),
    generic("arroseur", "sprinkler", "Arroseur escamotable", "Arroseurs escamotables", byPiece()),
    generic("electrovanne", "valve", "Électrovanne 24 V 1\" pour arrosage", "Électrovannes 24 V 1\"", byPiece()),
    generic("programmateur", "controller", "Programmateur d'arrosage sur secteur", "Programmateur d'arrosage", byPiece()),
  ],
  workItems: [
    {
      id: "arrosage",
      trade: "irrigation",
      section: "principal",
      label: "Arrosage enterré (tube, arroseurs, électrovannes, programmateur)",
      triggers: ["irrigation_work"],
      params: [lineQuantity("surface", "Surface arrosée", "m2", "Surface arrosée ?"), ARROSEURS, STATIONS],
      slots: [
        { key: "pelouse", family: "irrigation_work", label: "Pelouse", measureOnly: true },
        { key: "tube", family: "pe_pipe", label: "Tube PE 25", usual: { text: "PE 25 en couronne de 50 m.", source: BRICOMARCHE, productId: "pe25-50" } },
        { key: "arroseurs", family: "sprinkler", label: "Arroseurs", keywords: ["arroseur", "tuyere", "turbine"], usual: { text: "Arroseurs escamotables.", source: USAGE, productId: "arroseur" } },
        { key: "vannes", family: "valve", label: "Électrovannes", usual: { text: "Électrovannes 24 V.", source: USAGE, productId: "electrovanne" } },
        { key: "programmateur", family: "controller", label: "Programmateur", usual: { text: "Programmateur sur secteur.", source: USAGE, productId: "programmateur" } },
      ],
      constants: {
        tube_par_m2: rule("0.25", "m/m2", USAGE, todo("Réseau en peigne, ≈ 25 m de tube pour 100 m² (§4)."), "{v} de tube par m²"),
        surface_par_arroseur: rule("12", "m2/u", USAGE, todo("Une tuyère pour ≈ 12 m² (§4)."), "un arroseur pour {v}"),
        surface_par_secteur: rule("75", "m2/u", USAGE, todo("Un secteur (une électrovanne) pour ≈ 75 m² (§4)."), "une électrovanne pour {v}"),
      },
      needs: [
        { id: "tube", slot: "tube", formula: "surface * regle.tube_par_m2", unit: "m", core: true, source: USAGE, verification: ok(), version: 1 },
        {
          id: "arroseurs",
          slot: "arroseurs",
          formula: "arrondi_sup(surface / regle.surface_par_arroseur)",
          unit: "u",
          core: true,
          designation: "Arroseurs {arroseurs}",
          precisionRequires: ["arroseurs"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        { id: "vannes", slot: "vannes", formula: "arrondi_sup(surface / regle.surface_par_secteur)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        {
          id: "programmateur",
          slot: "programmateur",
          formula: "1 + 0 * stations",
          unit: "u",
          core: true,
          designation: "Programmateur d'arrosage {stations|u#} stations, sur secteur",
          precisionRequires: ["stations"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
