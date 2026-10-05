import { COMMON_BOILERPLATE, COMMON_LABOR, COMMON_SUPPLY } from "./common.js";
import type { MaterialFamily, TradeProfile } from "./trade-profile.js";

/**
 * Profils « légers » (PD-033) : vocabulaire et familles de matériaux pour
 * reconnaître les lignes et guider l'IA. Aucun contrôle d'unité, de
 * quantité ni d'oubli tant que de vrais devis ne l'ont pas validé ; les
 * règles s'ajoutent famille par famille, comme pour la couverture.
 * L'ordre compte : les familles précises avant les générales.
 */
function light(id: string, label: string, families: MaterialFamily[], extraLabor: string[] = []): TradeProfile {
  return {
    id,
    label,
    families,
    laborKeywords: [...COMMON_LABOR, ...extraLabor],
    supplyKeywords: COMMON_SUPPLY,
    companionRules: [],
    boilerplateMarkers: COMMON_BOILERPLATE,
    materialKeywords: families.flatMap((f) => f.keywords),
  };
}

const f = (code: string, label: string, keywords: string[], options: Pick<MaterialFamily, "areaOfWork" | "countOfWork" | "excludes"> = {}): MaterialFamily => ({
  code,
  label,
  keywords,
  ...options,
});
/**
 * Une surface (m²) de ces familles est celle de l'OUVRAGE (mur doublé, sol
 * carrelé, plafond peint) : les matériaux se vendent en plaques, cartons,
 * pots, colis. Elle n'est jamais envoyée comme une quantité d'achat.
 */
const AREA_OF_WORK = { areaOfWork: true } as const;

/** Ventilation : posée par l'électricien comme par le plombier. */
const VENTILATION = f("vent_vmc", "Ventilation (VMC, bouches, gaines)", [
  "vmc",
  "ventilation mecanique",
  "bouche d extraction",
  "bouche extraction",
  "bouche d entree d air",
  "entree d air",
  "extracteur",
  "gaine souple",
]);

export const MASONRY_PROFILE = light("masonry", "Maçonnerie", [
  f("masonry_lintel", "Linteau, poutrelle, hourdis", ["linteau", "poutrelle", "hourdis", "entrevous", "predalle"]),
  f("masonry_block", "Parpaing, bloc, brique", ["parpaing", "bloc beton", "agglo", "brique", "monomur", "carreau de platre"], AREA_OF_WORK),
  f("masonry_rebar", "Acier, treillis, armature", ["treillis soude", "fer a beton", "armature", "chainage", "rond a beton", "etrier"]),
  f("masonry_foundation", "Fondation, dallage, chape", ["semelle", "fondation", "dallage", "chape", "radier", "longrine"]),
  f("masonry_binder", "Ciment, mortier, béton", ["ciment", "mortier", "chaux", "beton", "enduit", "adjuvant"]),
  f("masonry_aggregate", "Sable, gravier, granulat", ["sable", "gravier", "gravillon", "granulat", "tout venant", "grave"]),
  f("masonry_formwork", "Coffrage, étai", ["coffrage", "banche", "etai", "planche de coffrage"]),
  f("masonry_drainage", "Drainage, regard, réseau", ["drain", "geotextile", "regard", "tampon", "delta ms", "tuyau pvc"]),
], ["terrassement", "fouille", "demolition"]);

export const DRYWALL_PROFILE = light("drywall", "Plâtrerie, isolation", [
  f("drywall_board", "Plaque de plâtre", ["plaque de platre", "ba13", "ba 13", "ba18", "placo", "fermacell", "plaque hydro", "ppm", "hydrofuge", "doublage", "doublissimo", "complexe isolant"], AREA_OF_WORK),
  f("drywall_frame", "Ossature (rail, montant, fourrure)", ["rail", "montant", "fourrure", "suspente", "corniere", "entretoise"], AREA_OF_WORK),
  f(
    "drywall_insulation",
    "Isolant",
    ["laine de verre", "laine de roche", "isolant", "isolation", "polystyrene", "fibre de bois", "ouate", "polyurethane"],
    AREA_OF_WORK,
  ),
  f("drywall_membrane", "Pare-vapeur, membrane", ["pare vapeur", "frein vapeur", "membrane"], AREA_OF_WORK),
  f("drywall_finish", "Bande, enduit, joint", ["bande a joint", "bande", "enduit", "joint"]),
  f("drywall_fixing", "Vis, cheville, fixation", ["vis", "cheville", "fixation", "trappe de visite"]),
]);

export const PAINTING_PROFILE = light("painting", "Peinture", [
  f("paint_primer", "Impression, sous-couche", ["sous couche", "impression", "primaire", "fixateur"], AREA_OF_WORK),
  f("paint_paint", "Peinture, laque, lasure", ["peinture", "laque", "glycero", "acrylique", "lasure", "vernis", "satin", "mat", "velours"], AREA_OF_WORK),
  f("paint_filler", "Enduit, rebouchage", ["enduit", "reboucheur", "lissage", "mastic"], AREA_OF_WORK),
  f("paint_wallcovering", "Toile de verre, revêtement mural", ["toile de verre", "papier peint", "revetement mural", "fibre de verre"], AREA_OF_WORK),
  f("paint_protection", "Protection, masquage", ["bache", "ruban de masquage", "adhesif", "film de protection", "carton de protection"]),
  f("paint_tools", "Rouleau, pinceau, abrasif", ["rouleau", "pinceau", "brosse", "abrasif", "papier de verre", "bac a peinture"]),
], ["lessivage", "poncage", "grattage"]);

export const TILING_PROFILE = light("tiling", "Carrelage", [
  f("tile_waterproofing", "Étanchéité sous carrelage (SPEC)", ["spec", "natte d etancheite", "systeme de protection", "kerdi", "bande d etancheite"], AREA_OF_WORK),
  f("tile_tile", "Carrelage, faïence", ["carrelage", "carreau", "faience", "gres cerame", "mosaique", "dalle"], AREA_OF_WORK),
  f("tile_adhesive", "Colle, mortier-colle", ["mortier colle", "colle", "double encollage"], AREA_OF_WORK),
  f("tile_grout", "Joint", ["joint", "mortier joint"], AREA_OF_WORK),
  f("tile_screed", "Ragréage, primaire", ["ragreage", "primaire d accrochage", "chape"], AREA_OF_WORK),
  f("tile_trim", "Plinthe, profilé, nez de marche", ["plinthe", "profile", "nez de marche", "baguette", "seuil"]),
  f("tile_spacer", "Croisillon, cale", ["croisillon", "cale", "systeme de nivellement"]),
]);

export const FLOORING_PROFILE = light("flooring", "Sols, parquet", [
  f("floor_underlay", "Sous-couche", ["sous couche", "isolant phonique", "film polyane"], AREA_OF_WORK),
  f("floor_wood", "Parquet, stratifié", ["parquet", "contrecolle", "massif", "stratifie", "lame"], AREA_OF_WORK),
  f("floor_resilient", "Sol souple (vinyle, PVC, moquette)", ["vinyle", "lvt", "pvc", "lino", "linoleum", "moquette", "sol souple"], AREA_OF_WORK),
  f("floor_trim", "Plinthe, barre de seuil", ["plinthe", "barre de seuil", "profile", "quart de rond"]),
  f("floor_prep", "Colle, ragréage, primaire", ["colle", "ragreage", "primaire"], AREA_OF_WORK),
  f("floor_finish", "Vitrificateur, huile", ["vitrificateur", "huile", "vernis", "cire"], AREA_OF_WORK),
], ["poncage", "vitrification"]);

export const ELECTRICAL_PROFILE = light("electrical", "Électricité", [
  VENTILATION,
  f("elec_panel", "Tableau, protection", ["tableau", "disjoncteur", "differentiel", "interrupteur differentiel", "parafoudre", "peigne", "coffret", "contacteur"]),
  f("elec_cable", "Câble, fil", ["cable", "fil", "conducteur", "r2v", "h07", "u1000"]),
  f("elec_conduit", "Gaine, conduit, goulotte", ["gaine", "icta", "conduit", "moulure", "goulotte"]),
  f("elec_box", "Boîte d'encastrement, dérivation", ["boite d encastrement", "boite de derivation", "boite de connexion"]),
  // Un « point » (lumineux, d'alimentation) est un ouvrage : appareillage + boîte + câble.
  f("elec_point", "Point d'installation (lumineux, alimentation)", ["point lumineux", "point d eclairage", "alimentation"], { countOfWork: true }),
  f("elec_device", "Prise, interrupteur", [
    "prise",
    "interrupteur",
    "va et vient",
    "simple allumage",
    "point lumineux",
    "poussoir",
    "telerupteur",
    "minuterie",
    "sortie de cable",
    "plaque de finition",
  ], { excludes: ["point lumineux", "point d eclairage"] }),
  f("elec_lighting", "Éclairage", ["luminaire", "spot", "plafonnier", "applique", "ampoule", "led", "reglette", "hublot"]),
  f("elec_heating", "Chauffage électrique", ["radiateur", "convecteur", "seche serviette", "panneau rayonnant"]),
  f("elec_connection", "Connexion, borne", ["wago", "borne", "domino", "connecteur"]),
], ["raccordement", "consuel", "tirage de cable"]);

export const PLUMBING_PROFILE = light("plumbing", "Plomberie, chauffage", [
  VENTILATION,
  f("plumb_heater", "Chauffe-eau, chaudière, PAC", ["chauffe eau", "ballon", "cumulus", "chaudiere", "pompe a chaleur", "circulateur"]),
  f("plumb_heating", "Radiateur, plancher chauffant", ["radiateur", "plancher chauffant", "collecteur", "seche serviette"]),
  f("plumb_sanitary", "Sanitaire", [
    "wc",
    "cuvette",
    "lavabo",
    "vasque",
    "evier",
    "receveur",
    "baignoire",
    "bati support",
    "meuble vasque",
    "ensemble suspendu",
    "plaque de commande",
    "paroi de douche",
  ]),
  f("plumb_tap", "Robinetterie", [
    "robinet",
    "mitigeur",
    "thermostatique",
    "vanne",
    "colonne de douche",
    "barre de douche",
    "douchette",
    "flexible",
    "groupe de securite",
    "reducteur de pression",
  ]),
  f("plumb_pipe", "Tube, tuyau", ["tube", "tuyau", "per", "multicouche", "cuivre"]),
  f("plumb_fitting", "Raccord", ["raccord", "coude", "manchon", "reduction", "mamelon", "a sertir", "a glissement"]),
  f("plumb_drain", "Évacuation", ["siphon", "bonde", "evacuation", "pvc", "descente"]),
  f("plumb_fixing", "Collier, support", ["collier", "support", "patte", "fixation"]),
], ["raccordement", "vidange", "mise en eau"]);

export const JOINERY_PROFILE = light("joinery", "Menuiserie", [
  f("join_window", "Fenêtre, baie", ["fenetre", "porte fenetre", "baie", "coulissant", "chassis", "velux"]),
  f("join_door", "Porte, bloc-porte", ["bloc porte", "porte d entree", "porte", "huisserie"]),
  f("join_shutter", "Volet, store", ["volet", "persienne", "store", "moustiquaire"]),
  f("join_hardware", "Quincaillerie", ["poignee", "serrure", "cylindre", "charniere", "paumelle", "gond", "butee"]),
  f("join_trim", "Habillage, chambranle", ["chambranle", "couvre joint", "appui", "precadre", "tapee"]),
  f("join_panel", "Bois, panneau", ["tasseau", "planche", "contreplaque", "mdf", "osb", "agglomere", "panneau", "lambris"]),
  f("join_stair", "Escalier, garde-corps, placard", ["escalier", "garde corps", "main courante", "placard", "dressing"]),
  f("join_sealing", "Mousse, joint, mastic", ["mousse", "compribande", "silicone", "mastic"]),
], ["ajustage", "calfeutrement"]);

/** « Autre métier » : le socle commun seul, sans famille de matériaux. */
export const OTHER_PROFILE = light("other", "Autre métier", []);
