import type { ParamDef, Referential } from "../model.js";
import { byPiece, DEFINITION_SOURCE, generic, inPacks, lineQuantity, ok, packaging, rule, todo } from "./kit.js";

/**
 * TIROIR ÉLECTRICITÉ (lot B, paquet 2) : `docs/referentiels/electricien.md` et `referentiels/electricite/tiroir.json`
 * (valeurs relevées le 2026-10-04). Le devis compte des POINTS (prises, points lumineux, tableau) ; BatiClair en tire
 * l'appareillage, les boîtes, la gaine préfilée en couronnes de 100 m, les protections du tableau. Questions du comptoir
 * seulement : la gamme d'appareillage, le nombre de rangées du tableau, le type des interrupteurs différentiels. Les
 * mètres de gaine par point et le nombre de boîtes ne se demandent jamais : hypothèses dites, orange tant qu'un
 * électricien ne les a pas confirmées.
 */
const USAGE = "usage-electricien";
const TIROIR = "tiroir-electricite-2026-10-04";
const PROFIFLEX = "profiflex-3g15-d16";
const LEGRAND_ID = "legrand-dx3-id";
const LEGRAND_PEIGNE = "legrand-peigne-404926";

/** La gamme d'appareillage : le comptoir la demande (« Céliane, Odace, Dooxie ? »), une fois pour tout le chantier. */
const GAMME: ParamDef = {
  key: "gamme",
  label: "Gamme d'appareillage",
  unit: "u",
  kind: "artisan_preference",
  question: "Appareillage : quelle gamme (Céliane, Odace, Dooxie…) ?",
  choices: [
    { label: "Legrand Dooxie", value: "1" },
    { label: "Legrand Céliane", value: "2" },
    { label: "Schneider Odace", value: "3" },
  ],
  display: { "1": "Legrand Dooxie blanc", "2": "Legrand Céliane blanc", "3": "Schneider Odace blanc" },
  textValues: [
    { value: "2", keywords: ["celiane"] },
    { value: "3", keywords: ["odace"] },
    { value: "1", keywords: ["dooxie"] },
  ],
};
const RANGEES: ParamDef = {
  key: "rangees",
  label: "Rangées du tableau",
  unit: "u",
  kind: "site_data",
  question: "Tableau : combien de rangées ?",
  choices: [
    { label: "1 rangée", value: "1" },
    { label: "2 rangées", value: "2" },
    { label: "3 rangées", value: "3" },
    { label: "4 rangées", value: "4" },
  ],
  display: { "1": "1 rangée", "2": "2 rangées", "3": "3 rangées", "4": "4 rangées" },
  textValues: [
    { value: "4", keywords: ["4 rangees", "4 rangee"] },
    { value: "3", keywords: ["3 rangees", "3 rangee"] },
    { value: "2", keywords: ["2 rangees", "2 rangee"] },
    { value: "1", keywords: ["1 rangee"] },
  ],
};
const TYPE_ID: ParamDef = {
  key: "type_id",
  label: "Type des interrupteurs différentiels",
  unit: "u",
  kind: "artisan_preference",
  question: "Interrupteurs différentiels : type AC ou type A ?",
  choices: [
    { label: "Type A", value: "1" },
    { label: "Type AC", value: "2" },
  ],
  display: { "1": "type A", "2": "type AC" },
  textValues: [
    { value: "2", keywords: ["type ac"] },
    { value: "1", keywords: ["type a "] },
  ],
};

const COURONNE_16 = packaging("100", "m", PROFIFLEX, ok("Couronne de 100 m, Ø16 (Profiflex, 10,6 kg)."));
const COURONNE_20 = packaging("100", "m", TIROIR, todo("Couronne de 100 m en 3G2,5 Ø20 : à confirmer (introuvable au relevé)."));

export const ELECTRICITE_REFERENTIAL: Referential = {
  id: "electricite",
  version: "electricite-2026.10.06-2",
  trade: "electrical",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel quantitatif électricien (docs/referentiels/electricien.md), usages à valider par un électricien",
      documentRef: "docs/referentiels/electricien.md",
      retrievedAt: "2026-10-04",
    },
    { id: TIROIR, kind: "retailer", title: "Tiroir électricité : valeurs relevées sur les fiches négoce", documentRef: "referentiels/electricite/tiroir.json", retrievedAt: "2026-10-04" },
    {
      id: PROFIFLEX,
      kind: "retailer",
      title: "Gaine ICTA préfilée 3G1,5 Ø16, couronne de 100 m (Profiflex)",
      url: "https://www.123elec.com/gaine-electrique-icta-prefilee-3g1-5-n-b-vj-d16-profiflex-couronne-de-100m.html",
      retrievedAt: "2026-10-04",
    },
    { id: LEGRAND_ID, kind: "manufacturer", title: "Legrand DX3 : interrupteur différentiel 40 A 30 mA, 2 modules (411611 type AC, 411617 type A)", url: "https://www.123elec.com/legrand-interrupteur-differentiel-dx3-40a-30ma-type-ac.html", retrievedAt: "2026-10-04" },
    { id: LEGRAND_PEIGNE, kind: "manufacturer", title: "Legrand 404926 : peigne phase + neutre 13 modules, sécable", url: "https://www.legrand.fr/pro/catalogue/peigne-dalimentation-universel-phase-neutre-hx3-horizontale-1p-longueur-13-modules", retrievedAt: "2026-10-04" },
  ],
  families: [
    {
      code: "socket_work",
      label: "Prises de courant",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["prise de courant", "prises de courant", "prise 16a", "prises 16a", "prise 2p+t", "prises 2p+t", "pc 16a", "prise electrique", "prises electriques"],
    },
    {
      code: "light_point_work",
      label: "Points lumineux",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["point lumineux", "points lumineux", "point d'eclairage", "points d'eclairage", "simple allumage", "va et vient", "va-et-vient"],
    },
    {
      code: "panel_work",
      label: "Tableau électrique",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["tableau electrique", "tableau de repartition", "tableau general", "coffret de repartition", "tableau"],
    },
    { code: "socket", label: "Prise de courant", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "switch", label: "Interrupteur", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "flush_box", label: "Boîte d'encastrement", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "dcl", label: "Boîte et douille DCL", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "prewired_conduit", label: "Gaine préfilée", needUnit: "m", attributes: [], keyAttributes: [] },
    { code: "panel", label: "Tableau", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "rcd", label: "Interrupteur différentiel", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "comb_bar", label: "Peigne d'alimentation", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic("prise-16a", "socket", "Prise de courant 2P+T 16 A complète (mécanisme, plaque, griffes)", "Prise 2P+T 16 A", byPiece()),
    generic("interrupteur-vv", "switch", "Interrupteur va-et-vient 10 A complet (mécanisme, plaque)", "Interrupteur va-et-vient", byPiece()),
    generic("boite-cloison", "flush_box", "Boîte d'encastrement cloison sèche 1 poste Ø67 prof. 40 (type Batibox)", "Boîtes d'encastrement 1 poste", byPiece("boîte", "boîtes")),
    generic("dcl", "dcl", "Boîte DCL + douille DCL pour point de centre", "Boîte + douille DCL", byPiece()),
    generic(
      "gaine-3g15",
      "prewired_conduit",
      "Gaine ICTA préfilée 3G1,5 mm² Ø16, couronne de 100 m",
      "Gaine préfilée 3G1,5 Ø16, couronne 100 m",
      inPacks("couronne", "couronne de 100 m", "couronnes de 100 m", COURONNE_16),
    ),
    generic(
      "gaine-3g25",
      "prewired_conduit",
      "Gaine ICTA préfilée 3G2,5 mm² Ø20, couronne de 100 m",
      "Gaine préfilée 3G2,5 Ø20, couronne 100 m",
      inPacks("couronne", "couronne de 100 m", "couronnes de 100 m", COURONNE_20),
    ),
    generic("tableau", "panel", "Tableau électrique nu, rangées de 13 modules", "Tableau électrique", byPiece()),
    generic("id-40-30", "rcd", "Interrupteur différentiel 40 A 30 mA, 2 modules", "Interrupteur différentiel 40 A 30 mA", byPiece()),
    generic("peigne-13", "comb_bar", "Peigne d'alimentation phase + neutre 13 modules, sécable", "Peigne phase + neutre 13 modules", byPiece()),
  ],
  workItems: [
    {
      id: "prises",
      trade: "electrical",
      section: "principal",
      label: "Prises de courant (appareillage, boîtes, gaine)",
      triggers: ["socket_work"],
      params: [lineQuantity("nombre", "Nombre de prises", "u", "Combien de prises ?"), GAMME],
      slots: [
        { key: "prises", family: "socket_work", label: "Prises", measureOnly: true },
        { key: "prise", formOf: "prises", family: "socket", label: "Prises 2P+T", usual: { text: "Prise 2P+T 16 A complète.", source: USAGE, productId: "prise-16a" } },
        { key: "boite", family: "flush_box", label: "Boîtes d'encastrement", usual: { text: "Boîte cloison sèche 1 poste (la plus vendue).", source: USAGE, productId: "boite-cloison" } },
        { key: "gaine", family: "prewired_conduit", label: "Gaine préfilée 3G2,5", usual: { text: "Gaine préfilée 3G2,5 Ø20 pour les prises.", source: USAGE, productId: "gaine-3g25" } },
      ],
      constants: {
        boites_par_prise: rule("1", "u/u", USAGE, ok("Une boîte par prise simple."), ""),
        gaine_par_prise: rule("8", "m/u", USAGE, todo("Longueur moyenne par prise, depuis le tableau ou la prise précédente (§4)."), "{v} de gaine par prise"),
      },
      needs: [
        {
          id: "prises",
          slot: "prise",
          formula: "nombre",
          unit: "u",
          core: true,
          designation: "Prise 2P+T 16 A {gamme}",
          precisionRequires: ["gamme"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        { id: "boites", slot: "boite", formula: "nombre * regle.boites_par_prise", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "gaine", slot: "gaine", formula: "nombre * regle.gaine_par_prise", unit: "m", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
    {
      id: "points-lumineux",
      trade: "electrical",
      section: "principal",
      label: "Points lumineux (interrupteur, DCL, boîtes, gaine)",
      triggers: ["light_point_work"],
      params: [lineQuantity("nombre", "Nombre de points lumineux", "u", "Combien de points lumineux ?"), GAMME],
      slots: [
        { key: "points", family: "light_point_work", label: "Points lumineux", measureOnly: true },
        { key: "interrupteur", family: "switch", label: "Interrupteurs", usual: { text: "Interrupteur va-et-vient (sert aussi en simple allumage).", source: USAGE, productId: "interrupteur-vv" } },
        { key: "dcl", formOf: "points", family: "dcl", label: "DCL", usual: { text: "Boîte et douille DCL, obligatoires au point de centre (NF C 15-100).", source: USAGE, productId: "dcl" } },
        { key: "boite", family: "flush_box", label: "Boîtes d'encastrement", usual: { text: "Boîte cloison sèche 1 poste pour l'interrupteur.", source: USAGE, productId: "boite-cloison" } },
        { key: "gaine", family: "prewired_conduit", label: "Gaine préfilée 3G1,5", usual: { text: "Gaine préfilée 3G1,5 Ø16 pour l'éclairage.", source: PROFIFLEX, productId: "gaine-3g15" } },
      ],
      constants: {
        gaine_par_point: rule("10", "m/u", USAGE, todo("Alimentation du point et retour interrupteur (§4)."), "{v} de gaine par point lumineux"),
      },
      needs: [
        {
          id: "interrupteurs",
          slot: "interrupteur",
          formula: "nombre",
          unit: "u",
          core: true,
          designation: "Interrupteur va-et-vient 10 A {gamme}",
          precisionRequires: ["gamme"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        { id: "dcl", slot: "dcl", formula: "nombre", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "boites", slot: "boite", formula: "nombre", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "gaine", slot: "gaine", formula: "nombre * regle.gaine_par_point", unit: "m", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
    {
      id: "tableau",
      trade: "electrical",
      section: "principal",
      label: "Tableau électrique (coffret, interrupteurs différentiels, peignes)",
      triggers: ["panel_work"],
      params: [lineQuantity("nombre", "Nombre de tableaux", "u", "Combien de tableaux ?"), RANGEES, TYPE_ID],
      slots: [
        { key: "tableaux", family: "panel_work", label: "Tableau", measureOnly: true },
        { key: "coffret", formOf: "tableaux", family: "panel", label: "Tableau", usual: { text: "Tableau nu, rangées de 13 modules.", source: USAGE, productId: "tableau" } },
        { key: "id", family: "rcd", label: "Interrupteurs différentiels", usual: { text: "ID 40 A 30 mA, 2 modules.", source: LEGRAND_ID, productId: "id-40-30" } },
        { key: "peigne", family: "comb_bar", label: "Peignes", usual: { text: "Peigne phase + neutre 13 modules.", source: LEGRAND_PEIGNE, productId: "peigne-13" } },
      ],
      constants: {
        id_par_rangee: rule("1", "u/u", USAGE, todo("Un interrupteur différentiel en tête de chaque rangée (§6)."), "{v} interrupteur différentiel par rangée"),
        peigne_par_rangee: rule("1", "u/u", LEGRAND_PEIGNE, ok("Un peigne de 13 modules par rangée."), ""),
      },
      needs: [
        {
          id: "coffret",
          slot: "coffret",
          formula: "nombre",
          unit: "u",
          core: true,
          designation: "Tableau électrique {rangees} de 13 modules, nu",
          precisionRequires: ["rangees"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        {
          id: "id",
          slot: "id",
          formula: "nombre * rangees * regle.id_par_rangee",
          unit: "u",
          core: true,
          designation: "Interrupteur différentiel 40 A 30 mA {type_id}, 2 modules",
          precisionRequires: ["type_id"],
          source: LEGRAND_ID,
          verification: ok(),
          version: 1,
        },
        { id: "peignes", slot: "peigne", formula: "nombre * rangees * regle.peigne_par_rangee", unit: "u", core: true, source: LEGRAND_PEIGNE, verification: ok(), version: 1 },
      ],
    },
  ],
  wasteRules: [],
};
