import type { Fact, ParamDef, Product, Provenance, Referential } from "../model.js";
import { rule, todo } from "./kit.js";

/**
 * Référentiel COUVERTURE.
 *
 * Statut des données (2026-10-03) :
 *  - caractéristiques Edilians HP 10 et Soprema SOP'ÉCRAN HPV R2 : confirmées
 *    par le fondateur sur la documentation officielle des fabricants ;
 *  - règles de calcul, tableau de recouvrement de l'ardoise, pertes,
 *    conditionnements courants et HYPOTHÈSES PAR DÉFAUT (pente 45°, zone
 *    littorale, rampant ≤ 5,5 m, entraxe 60 cm) : référentiel quantitatif
 *    rédigé et validé par le fondateur (couvreur) ;
 *  - produits GÉNÉRIQUES (« faîtière standard », « écran HPV standard ») :
 *    pièces par défaut quand le devis ne nomme rien, données tirées du même
 *    référentiel ; le fournisseur propose la marque.
 *
 * Principe produit : l'artisan dépose son devis, BatiClair sort la liste
 * d'achats. Une donnée que le devis ne dit pas prend son hypothèse par défaut,
 * DITE et modifiable ; une question n'est posée que si rien ne permet de
 * calculer et que la réponse change la commande.
 */
const DRAFT = { status: "draft" } as const;
/** Réponses du fondateur aux partiels (2026-10-04). */
const FOUNDER_REPLY = { status: "verified", verifiedAt: "2026-10-04", verifiedBy: "Fondateur (couvreur)" } as const;
const FR_REPLY = "fondateur-reponses-2026-10-04";
/** Réponses du fondateur du 2026-10-05 (descentes, plomb, cuivre). */
const FR_REPLY_DESCENTES = "fondateur-reponses-2026-10-05";
const FOUNDER_REPLY_DESCENTES = { status: "verified", verifiedAt: "2026-10-05", verifiedBy: "Fondateur (couvreur)" } as const;
/** Référentiel quantitatif couverture écrit par le fondateur (couvreur), validé par lui le 2026-10-03. */
const FOUNDER_DOC = {
  status: "verified",
  verifiedAt: "2026-10-03",
  verifiedBy: "Fondateur (couvreur)",
  note: "Référentiel quantitatif couverture rédigé et validé par le fondateur.",
} as const;
/**
 * Règles présentées une par une au fondateur (couvreur), avec formule et
 * exemple chiffré, et validées par lui le 2026-10-02 (« Oui » aux 10 règles).
 */
const FOUNDER_VALIDATED = {
  status: "verified",
  verifiedAt: "2026-10-02",
  verifiedBy: "Fondateur (couvreur)",
  note: "Validée sur présentation de la formule et d'un exemple chiffré (D-2026-015).",
} as const;
const FOUNDER_CHECKED = {
  status: "verified",
  verifiedAt: "2026-10-01",
  verifiedBy: "Fondateur (documentation officielle du fabricant)",
  note: "Page et version exactes à compléter à réception du PDF.",
} as const;

const spec = (value: string, unit: string, source: string, verification: Provenance["verification"], note?: string): Fact => ({
  kind: "manufacturer_spec",
  value,
  unit,
  source,
  verification,
  version: 1,
  ...(note ? { note } : {}),
});
const packaging = (value: string, unit: string, source: string, verification: Provenance["verification"], note?: string): Fact => ({
  ...spec(value, unit, source, verification, note),
  kind: "packaging",
});
const condition = (value: string, unit: string, source: string, verification: Provenance["verification"], note?: string): Fact => ({
  ...spec(value, unit, source, verification, note),
  kind: "installation_condition",
});

/** « 1 pièce contient 1 pièce » : une définition, pas une donnée à prouver. */
const ONE_PIECE: Fact = packaging("1", "u", "definition", { status: "verified", verifiedAt: "2026-10-01", verifiedBy: "BatiClair (définition)" });
const ONE_METRE: Fact = packaging("1", "m", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (définition)" });
const BY_PIECE: Product["sellingUnits"] = [{ id: "piece", label: { one: "pièce", many: "pièces" }, contains: ONE_PIECE, primary: true }];
/** Liteaux : commandés au mètre ; la botte de 50 ml donne l'ordre de grandeur (référentiel du fondateur). */
const BATTEN_UNITS: Product["sellingUnits"] = [
  { id: "ml", label: { one: "ml", many: "ml" }, contains: ONE_METRE, primary: true },
  { id: "botte", label: { one: "botte de 50 ml", many: "bottes de 50 ml" }, contains: packaging("50", "m", "fondateur-referentiel-2026-10-03", FOUNDER_DOC) },
];
/** Produit GÉNÉRIQUE : la pièce par défaut quand le devis ne nomme rien (le fournisseur propose la marque). */
const generic = (id: string, family: string, label: string, shortLabel: string, extra: Partial<Product> = {}): Product => ({
  id,
  family,
  label,
  shortLabel,
  aliases: [],
  generic: true,
  attributes: {},
  sellingUnits: BY_PIECE,
  ...extra,
});
const F = "fondateur-referentiel-2026-10-03";

/** Hypothèses par défaut du référentiel du fondateur : dites à l'artisan, modifiables d'un geste. */
const PENTE_PARAM: ParamDef = {
  key: "pente",
  label: "Pente du toit",
  unit: "°",
  kind: "site_data",
  question: "Pente du toit ?",
  textLabels: ["pente"],
  default: { value: "45", source: F, verification: FOUNDER_DOC, version: 1, note: "pente moyenne d'une toiture" },
  // Règle du fondateur (2026-10-03) : la pente est en degrés partout, jamais en % ; boutons 30° / 35° / 45°, « autre » = saisie libre.
  choices: [
    { label: "30°", value: "30" },
    { label: "35°", value: "35" },
    { label: "45°", value: "45" },
  ],
};
/** Zone climatique (1 intérieur, 2 intermédiaire, 3 littoral et montagne) : déduite du code postal, sinon le bord de mer. */
const ZONE_PARAM: ParamDef = {
  key: "zone",
  label: "Zone climatique",
  unit: "u",
  kind: "site_data",
  question: "Le chantier est plutôt…",
  default: { value: "3", source: F, verification: FOUNDER_DOC, version: 1, note: "bord de mer ou montagne (zone 3), à défaut de code postal" },
  choices: [
    { label: "Intérieur des terres", value: "1" },
    { label: "À 20–40 km de la mer, ou 200–500 m d'altitude", value: "2" },
    { label: "Bord de mer, ou plus de 500 m", value: "3" },
  ],
};
/**
 * Région ardoise (DTU 40.11, I / II / III, §26) : elle fixe le recouvrement. Même valeur que la zone
 * climatique tant que la table par département des régions ardoise n'est pas saisie (§37, « à vérifier ») ;
 * dite « région ardoise III », pas « zone 3 » (découpage des tuiles).
 */
const REGION_ARDOISE_PARAM: ParamDef = {
  ...ZONE_PARAM,
  label: "Région ardoise",
  display: { "1": "I", "2": "II", "3": "III" },
  estimate: "Prise égale à la zone climatique du département, en attendant la liste des régions du DTU 40.11.",
};
/**
 * Table officielle Cupa (§34) : ardoises au m² par format (hauteur × largeur, cm) et recouvrement (mm).
 * Elle fait foi ; hors table seulement, la formule Cupa (avec le diamètre du crochet) calcule.
 */
const CUPA_ARDOISES_M2 = {
  label: "Ardoises au m²",
  unit: "u/m2",
  keys: [
    { variable: "ardoise.longueur", unit: "cm" },
    { variable: "ardoise.largeur", unit: "cm" },
    // Le recouvrement POSÉ (hauteur − 2 × pureau) : un pureau choisi par l'artisan change la ligne lue.
    { variable: "recouvrement_pose", unit: "mm" },
  ],
  otherwise: "1 / (pureau * (ardoise.largeur + diametre_crochet))",
  // « Un R hors des bornes du format = format non admissible pour cette pente/région → proposer le format voisin » (§34).
  admissible: { slot: "ardoise" },
  source: "cupa-pureau-ardoises-m2",
  verification: FOUNDER_DOC,
  version: 1,
  note: "Table Cupa, 194 lignes (§34) ; « quand le R calculé n'est pas dans la table, interpoler avec les formules, jamais prendre la ligne voisine ».",
  rows: [
      ["50", "25", "153", "22.7"],
      ["46", "30", "153", "21.4"],
      ["46", "25", "153", "25.6"],
      ["50", "25", "147", "22.3"],
      ["46", "30", "147", "21.0"],
      ["46", "25", "147", "25.1"],
      ["50", "25", "142", "22.0"],
      ["46", "30", "142", "20.6"],
      ["46", "25", "142", "24.7"],
      ["50", "25", "137", "21.7"],
      ["46", "30", "137", "20.3"],
      ["46", "25", "137", "24.3"],
      ["50", "25", "133", "21.4"],
      ["46", "30", "133", "20.1"],
      ["46", "25", "133", "24.0"],
      ["40", "25", "133", "29.4"],
      ["40", "22", "133", "33.4"],
      ["50", "25", "130", "21.3"],
      ["46", "30", "130", "19.9"],
      ["46", "25", "130", "23.8"],
      ["40", "25", "130", "29.1"],
      ["40", "22", "130", "33.1"],
      ["40", "20", "130", "36.3"],
      ["40", "25", "127", "28.8"],
      ["40", "22", "127", "32.7"],
      ["40", "20", "127", "35.9"],
      ["40", "25", "123", "28.4"],
      ["40", "22", "123", "32.2"],
      ["40", "20", "123", "35.3"],
      ["40", "25", "119", "28.0"],
      ["40", "22", "119", "31.8"],
      ["40", "20", "119", "34.8"],
      ["40", "25", "117", "27.8"],
      ["40", "22", "117", "31.5"],
      ["40", "20", "117", "34.6"],
      ["35", "25", "117", "33.9"],
      ["35", "22", "117", "38.5"],
      ["40", "22", "116", "31.4"],
      ["35", "25", "116", "33.6"],
      ["35", "22", "116", "38.1"],
      ["40", "25", "113", "27.4"],
      ["40", "22", "113", "31.1"],
      ["40", "20", "113", "34.1"],
      ["35", "25", "113", "33.2"],
      ["35", "22", "113", "37.6"],
      ["35", "20", "113", "41.4"],
      ["40", "25", "110", "27.1"],
      ["40", "22", "110", "30.8"],
      ["40", "20", "110", "33.8"],
      ["35", "25", "110", "32.8"],
      ["35", "22", "110", "37.2"],
      ["35", "20", "110", "40.8"],
      ["33", "23", "110", "38.8"],
      ["40", "22", "107", "30.6"],
      ["40", "20", "107", "33.6"],
      ["35", "25", "107", "32.5"],
      ["35", "22", "107", "36.9"],
      ["35", "20", "107", "40.5"],
      ["33", "23", "107", "38.4"],
      ["40", "22", "103", "30.2"],
      ["40", "20", "103", "33.1"],
      ["35", "25", "103", "32.0"],
      ["35", "22", "103", "36.3"],
      ["35", "20", "103", "39.9"],
      ["33", "23", "103", "37.8"],
      ["32", "22", "103", "41.3"],
      ["40", "22", "100", "29.9"],
      ["40", "20", "100", "32.8"],
      ["35", "25", "100", "31.6"],
      ["35", "22", "100", "35.9"],
      ["35", "20", "100", "39.4"],
      ["33", "23", "100", "37.3"],
      ["32", "22", "100", "40.7"],
      ["30", "22", "100", "44.8"],
      ["30", "20", "100", "49.2"],
      ["30", "18", "100", "54.6"],
      ["40", "22", "97", "29.6"],
      ["40", "20", "97", "32.5"],
      ["35", "25", "97", "31.2"],
      ["35", "22", "97", "35.4"],
      ["35", "20", "97", "38.9"],
      ["33", "23", "97", "36.8"],
      ["32", "22", "97", "40.2"],
      ["30", "22", "97", "44.1"],
      ["30", "20", "97", "48.5"],
      ["30", "18", "97", "53.8"],
      ["40", "22", "94", "29.3"],
      ["40", "20", "94", "32.1"],
      ["35", "25", "94", "30.8"],
      ["35", "22", "94", "35.0"],
      ["35", "20", "94", "38.5"],
      ["33", "23", "94", "36.3"],
      ["32", "22", "94", "39.6"],
      ["30", "22", "94", "43.5"],
      ["30", "20", "94", "47.8"],
      ["30", "18", "94", "53.0"],
      ["40", "22", "92", "29.1"],
      ["40", "20", "92", "31.9"],
      ["35", "25", "92", "30.6"],
      ["35", "22", "92", "34.7"],
      ["35", "20", "92", "38.1"],
      ["33", "23", "92", "36.0"],
      ["32", "22", "92", "39.3"],
      ["30", "22", "92", "43.1"],
      ["30", "20", "92", "47.3"],
      ["30", "18", "92", "52.5"],
      ["35", "25", "89", "30.2"],
      ["35", "22", "89", "34.3"],
      ["35", "20", "89", "37.7"],
      ["33", "23", "89", "35.6"],
      ["32", "22", "89", "38.8"],
      ["30", "22", "89", "42.5"],
      ["30", "20", "89", "46.6"],
      ["30", "18", "89", "51.7"],
      ["27", "18", "89", "60.3"],
      ["27", "16", "89", "67.7"],
      ["35", "20", "87", "37.5"],
      ["33", "23", "87", "35.3"],
      ["32", "22", "87", "38.4"],
      ["30", "22", "87", "42.1"],
      ["30", "20", "87", "46.2"],
      ["30", "18", "87", "51.3"],
      ["27", "18", "87", "59.7"],
      ["27", "16", "87", "67.0"],
      ["32", "22", "83", "37.8"],
      ["30", "22", "83", "41.3"],
      ["30", "20", "83", "45.4"],
      ["30", "18", "83", "50.3"],
      ["27", "18", "83", "58.4"],
      ["27", "16", "83", "65.6"],
      ["25", "18", "83", "65.4"],
      ["25", "15", "83", "78.2"],
      ["32", "22", "80", "37.3"],
      ["30", "22", "80", "40.7"],
      ["30", "20", "80", "44.7"],
      ["30", "18", "80", "49.6"],
      ["27", "18", "80", "57.5"],
      ["27", "16", "80", "64.5"],
      ["25", "18", "80", "64.2"],
      ["25", "15", "80", "76.8"],
      ["32", "22", "77", "36.9"],
      ["30", "22", "77", "40.2"],
      ["30", "20", "77", "44.1"],
      ["30", "18", "77", "49.0"],
      ["27", "18", "77", "56.6"],
      ["27", "16", "77", "63.5"],
      ["25", "18", "77", "63.1"],
      ["25", "15", "77", "75.5"],
      ["32", "22", "73", "36.3"],
      ["30", "22", "73", "39.5"],
      ["30", "20", "73", "43.4"],
      ["30", "18", "73", "48.1"],
      ["27", "18", "73", "55.4"],
      ["27", "16", "73", "62.2"],
      ["25", "18", "73", "61.7"],
      ["25", "15", "73", "73.8"],
      ["22", "16", "73", "83.4"],
      ["32", "22", "69", "35.7"],
      ["30", "22", "69", "38.8"],
      ["30", "20", "69", "42.6"],
      ["30", "18", "69", "47.3"],
      ["27", "18", "69", "54.3"],
      ["27", "16", "69", "61.0"],
      ["25", "18", "69", "60.3"],
      ["25", "15", "69", "72.2"],
      ["22", "16", "69", "81.2"],
      ["30", "20", "67", "42.2"],
      ["30", "18", "67", "46.9"],
      ["27", "18", "67", "53.8"],
      ["27", "16", "67", "60.4"],
      ["25", "18", "67", "59.7"],
      ["25", "15", "67", "71.4"],
      ["22", "16", "67", "80.1"],
      ["30", "20", "65", "41.9"],
      ["30", "18", "65", "46.5"],
      ["27", "18", "65", "53.3"],
      ["27", "16", "65", "59.8"],
      ["25", "18", "65", "59.0"],
      ["25", "15", "65", "70.6"],
      ["22", "16", "65", "79.1"],
      ["30", "20", "63", "41.5"],
      ["30", "18", "63", "46.1"],
      ["27", "18", "63", "52.7"],
      ["27", "16", "63", "59.2"],
      ["25", "18", "63", "58.4"],
      ["25", "15", "63", "69.9"],
      ["22", "16", "63", "78.1"],
      ["30", "20", "60", "41.0"],
      ["30", "18", "60", "45.5"],
      ["27", "18", "60", "52.0"],
      ["27", "16", "60", "58.4"],
      ["25", "18", "60", "57.5"],
      ["25", "15", "60", "68.7"],
      ["22", "16", "60", "76.6"],
  ],
};
/** Diamètre du crochet dans la formule Cupa (§34) : 1 mm, inox 2,7 mm sur un département littoral (posé d'office). */
const DIAMETRE_CROCHET_PARAM: ParamDef = {
  key: "diametre_crochet",
  label: "Diamètre du crochet",
  unit: "mm",
  kind: "site_data",
  question: "Quel crochet ?",
  default: { value: "1", source: "cupa-pureau-ardoises-m2", verification: FOUNDER_DOC, version: 1, note: "crochet courant ; inox 2,7 mm en bord de mer" },
  choices: [
    // Jamais « 1 mm » à l'écran (retour du fondateur, 2026-10-06 : « un crochet de 1 mm, ça n'existe pas ») : le 1 mm est le
    // jeu de la formule Cupa (§34), pas un crochet que l'on commande.
    { label: "Standard", value: "1" },
    { label: "Inox 2,7 mm (bord de mer)", value: "2.7" },
  ],
  // Dans une désignation : « crochets d'ardoise inox standard » ou « inox Ø 2,7 mm ».
  display: { "1": "standard", "2.7": "Ø 2,7" },
};
/** Rampant : jusqu'à 5,5 m par défaut (référentiel du fondateur), partagé par l'ardoise et le joint debout. */
const RAMPANT_PARAM: ParamDef = {
  key: "longueur_rampant",
  label: "Longueur du rampant",
  unit: "m",
  kind: "site_data",
  question: "Longueur du rampant (de l'égout au faîtage) ?",
  textLabels: ["rampant"],
  default: { value: "5.5", source: F, verification: FOUNDER_DOC, version: 1, note: "rampant courant, jusqu'à 5,5 m" },
  choices: [
    { label: "Jusqu'à 5,5 m", value: "5.5" },
    { label: "5,5 à 8 m", value: "8" },
    { label: "Plus de 8 m", value: "10" },
  ],
};
/**
 * Métal façonné (§40.2, §41.2) : « tu façonnes toi-même ou tu commandes façonné ? ». La réponse change
 * tout : bobines au mètre linéaire d'un côté, pièces aux dimensions de l'autre. Pas de défaut : on demande.
 */
const FACONNAGE_PARAM: ParamDef = {
  key: "faconnage",
  // §48.6 : une question par ouvrage, jamais une réponse prêtée d'une pièce à l'autre.
  ownOnly: true,
  label: "Façonnage",
  unit: "u",
  kind: "artisan_preference",
  question: "Tu façonnes tes bacs toi-même, ou tu les commandes façonnés ?",
  hint: "Bobine de zinc au mètre linéaire si tu façonnes ; bacs à la longueur du rampant sinon.",
  choices: [
    { label: "Je façonne (bobines)", value: "1" },
    { label: "Je commande façonné (bacs)", value: "2" },
  ],
  display: { "1": "je façonne", "2": "commandé façonné" },
};
/**
 * Rampant de plus de 10 m en bacs (§7 : « bacs profilés à longueur (max 10 à 15 m) ») : soit la bobine est
 * profilée sur place (bobine au mètre linéaire), soit les bacs viennent en plusieurs longueurs. Pas de défaut : on demande.
 */
const BACS_LONGS_PARAM: ParamDef = {
  key: "bacs_longs",
  label: "Rampant de plus de 10 m",
  unit: "u",
  kind: "artisan_preference",
  question: "Rampant de plus de 10 m : bobine profilée sur place, ou bacs en plusieurs longueurs ?",
  hint: "Profilée sur place : zinc en bobine au mètre linéaire. Plusieurs longueurs : un bac tous les 10 m, avec jonction transversale.",
  choices: [
    { label: "Bobine profilée sur place", value: "1" },
    { label: "Bacs en plusieurs longueurs", value: "2" },
  ],
  display: { "1": "bobine profilée sur place", "2": "bacs en plusieurs longueurs" },
};
/** Épaisseur du zinc (§36.1) : 0,65 mm standard, 0,70 au-delà de 900 m ou bacs > 10 m, 0,80 mm. */
const EPAISSEUR_ZINC_PARAM: ParamDef = {
  key: "epaisseur_zinc",
  label: "Épaisseur du zinc",
  unit: "mm",
  kind: "artisan_preference",
  question: "Épaisseur du zinc ?",
  textLabels: ["epaisseur", "ep"],
  default: { value: "0.65", source: F, verification: FOUNDER_DOC, version: 1, note: "0,65 mm standard (§7)" },
  choices: [
    { label: "0,65 mm", value: "0.65" },
    { label: "0,70 mm", value: "0.7" },
    { label: "0,80 mm", value: "0.8" },
  ],
  // Écrite comme au comptoir dans une désignation (« bobineau 650 × 31 m, 0,65 »).
  display: { "0.65": "0,65", "0.7": "0,70", "0.8": "0,80" },
};
/** Même clé « faconnage » que le joint debout : une seule réponse, et une seule habitude, pour tout le métal façonné. */
/**
 * RÈGLE DU COMPTOIR (§47.8) : une question n'existe que si le vendeur du négoce la poserait pour chiffrer. Les données
 * ci-dessous changent l'ARTICLE servi au comptoir (teinte du zinc, développé et sortie de la gouttière, crochets) :
 * lues dans le devis, sinon une hypothèse dite, sinon demandées avec les mots du comptoir.
 */
/** Aspect du zinc : naturel quand le devis ne dit rien ; « prépatiné » sans teinte → on demande (quartz ou anthra). */
const ASPECT_ZINC_PARAM: ParamDef = {
  key: "aspect_zinc",
  label: "Aspect du zinc",
  unit: "u",
  kind: "site_data",
  question: "Zinc prépatiné : Quartz-Zinc (gris) ou Anthra-Zinc (noir) ?",
  hint: "Le devis dit « prépatiné » sans la teinte : le comptoir sert l'un ou l'autre.",
  default: { value: "1", source: F, verification: FOUNDER_DOC, version: 1, note: "zinc naturel : le devis ne dit pas prépatiné", unlessText: ["prepatine", "pre patine", "pre-patine"] },
  choices: [
    { label: "Zinc naturel", value: "1" },
    { label: "Quartz-Zinc (prépatiné gris)", value: "2" },
    { label: "Anthra-Zinc (prépatiné noir)", value: "3" },
  ],
  textValues: [
    { value: "2", keywords: ["quartz", "quartz zinc", "quartz-zinc"] },
    { value: "3", keywords: ["anthra", "anthra zinc", "anthra-zinc"] },
    { value: "4", keywords: ["pigmento"] },
    { value: "1", keywords: ["zinc naturel"] },
  ],
  display: { "1": "zinc naturel", "2": "Quartz-Zinc", "3": "Anthra-Zinc", "4": "Pigmento" },
  onlyFromPrincipal: true,
};
/** Développé de la gouttière : le comptoir sert « de 25 », « de 33 »… (dév. 250 / 285 / 333 / 400, §11). */
const DEVELOPPE_GOUTTIERE_PARAM: ParamDef = {
  key: "developpe_gouttiere",
  label: "Développé de la gouttière",
  unit: "cm",
  kind: "site_data",
  question: "Gouttière de 25, de 28, de 33 ou de 40 ?",
  hint: "Le développé : la largeur de la feuille avant façonnage.",
  choices: [
    { label: "De 25", value: "25" },
    { label: "De 28", value: "28" },
    { label: "De 33", value: "33" },
    { label: "De 40", value: "40" },
  ],
  textValues: [
    { value: "25", keywords: ["demi ronde 25", "demi-ronde 25", "nantaise 25", "gouttiere 25", "gouttiere de 25", "pvc 25", "pvc de 25", "alu 25", "alu de 25", "dev 25", "dev. 25", "developpe 25", "developpe 250", "dev 250", "de 25"] },
    { value: "28", keywords: ["demi ronde 28", "demi-ronde 28", "nantaise 28", "gouttiere 28", "gouttiere de 28", "pvc 28", "pvc de 28", "alu 28", "alu de 28", "dev 28", "dev. 28", "developpe 28", "developpe 285", "dev 285", "de 28"] },
    { value: "33", keywords: ["demi ronde 33", "demi-ronde 33", "nantaise 33", "gouttiere 33", "gouttiere de 33", "pvc 33", "pvc de 33", "alu 33", "alu de 33", "dev 33", "dev. 33", "developpe 33", "developpe 330", "developpe 333", "dev 333", "dev 330", "de 33"] },
    { value: "40", keywords: ["demi ronde 40", "demi-ronde 40", "nantaise 40", "gouttiere 40", "gouttiere de 40", "pvc 40", "pvc de 40", "alu 40", "alu de 40", "dev 40", "dev. 40", "developpe 40", "developpe 400", "dev 400", "de 40"] },
  ],
};
/** Crochets de gouttière : sur les chevrons, ou vissés en façade (« crochet bandeau ») : deux articles au comptoir. */
const FIXATION_CROCHET_PARAM: ParamDef = {
  key: "fixation_crochet",
  label: "Pose des crochets de gouttière",
  unit: "u",
  kind: "site_data",
  question: "Crochets de gouttière : sur les chevrons ou en façade (bandeau) ?",
  choices: [
    { label: "Sur les chevrons", value: "1" },
    { label: "En façade (bandeau)", value: "2" },
  ],
  textValues: [
    { value: "2", keywords: ["bandeau", "planche de rive", "en facade"] },
    { value: "1", keywords: ["sur chevron", "sur chevrons"] },
  ],
  display: { "1": "sur chevron", "2": "bandeau" },
};
/** Diamètre des descentes : Ø 80 jusqu'à ≈ 70 m² de toit par descente, Ø 100 jusqu'à ≈ 130 m² (§11). */
const DIAMETRE_DESCENTE_PARAM: ParamDef = {
  key: "diametre_descente",
  label: "Diamètre des descentes",
  unit: "mm",
  kind: "site_data",
  question: "Descentes en Ø 80 ou en Ø 100 ?",
  hint: "Ø 80 jusqu'à environ 70 m² de toit par descente, Ø 100 jusqu'à 130 m².",
  choices: [
    { label: "Ø 80", value: "80" },
    { label: "Ø 100", value: "100" },
    { label: "Ø 120", value: "120" },
  ],
  // « diam. 80mm », « diamètre 100 mm », « diamètre 80 » : lus, jamais demandés (D-2026-020).
  textLabels: ["diametre", "diam"],
  textValues: [
    { value: "80", keywords: ["ø80", "ø 80", "diametre 80", "descente 80", "descente de 80", "descentes de 80"] },
    { value: "100", keywords: ["ø100", "ø 100", "diametre 100", "descente 100", "descente de 100", "descentes de 100"] },
    { value: "120", keywords: ["ø120", "ø 120", "diametre 120", "descente 120", "descente de 120"] },
  ],
};
/**
 * Qualité de l'ardoise naturelle : le comptoir ne chiffre pas « ardoise 30×22 » sans elle (le prix va du simple au
 * double). Habitude d'entreprise : demandée une fois, retenue ensuite (§41, habitudes).
 */
const QUALITE_ARDOISE_PARAM: ParamDef = {
  key: "qualite_ardoise",
  label: "Qualité de l'ardoise",
  unit: "u",
  kind: "artisan_preference",
  question: "Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ?",
  choices: [
    { label: "Espagne 1er choix", value: "1" },
    { label: "Ardoise NF (type Cupa)", value: "2" },
  ],
  textValues: [
    { value: "2", keywords: ["cupa", "nf", "marque nf"] },
    { value: "1", keywords: ["espagne", "1er choix", "premier choix"] },
  ],
  display: { "1": "Espagne 1er choix", "2": "NF (type Cupa)" },
};
const FACONNAGE_BANDES_PARAM: ParamDef = {
  ...FACONNAGE_PARAM,
  question: "Abergements, solins, bandes zinc : tu les façonnes toi-même ou tu les commandes façonnés ?",
  hint: "Je façonne : feuilles de zinc 2 × 1 m, bobineau au-delà de 6 ml. Commandé façonné : bandes en longueurs de 2 m. Gouttières et descentes ne sont pas concernées.",
  choices: [
    { label: "Je façonne (feuilles ou bobineau)", value: "1" },
    { label: "Je commande façonné", value: "2" },
  ],
  // « Façonnage et pose des bandes de rive » (D-2026-020) : l'artisan les façonne lui-même.
  textValues: [{ value: "1", keywords: ["faconnage et pose", "faconnage des", "faconnees sur place", "faconne sur place", "faconnage sur place"] }],
};
/**
 * Développé d'une bande zinc (§36.4) : 100 mm (solin à biseau, couvre-joint), 250 à 400 mm (rive), 200 à 330 mm
 * (faîtage). Pas de défaut : le développé change le poids et la pièce, on demande (ce n'est pas une quantité).
 */
const DEVELOPPE_PARAM: ParamDef = {
  key: "developpe",
  label: "Développé de la bande",
  unit: "mm",
  kind: "site_data",
  question: "Développé de la bande zinc ?",
  textLabels: ["developpe", "dev", "dev."],
  // Le développé du faîtage n'est pas celui des bandes de rive : chaque bande a le sien (D-2026-020).
  onlyFromPrincipal: true,
  withinChoices: true,
  // « dév. 33 » : le devis écrit le développé en centimètres, comme le comptoir (« bande de 33 »).
  textValues: [
    { value: "100", keywords: ["dev 10", "dev. 10", "developpe 10"] },
    { value: "250", keywords: ["dev 25", "dev. 25", "developpe 25"] },
    { value: "330", keywords: ["dev 33", "dev. 33", "developpe 33"] },
    { value: "400", keywords: ["dev 40", "dev. 40", "developpe 40"] },
  ],
  choices: [
    { label: "100 mm (solin, couvre-joint)", value: "100" },
    { label: "250 mm", value: "250" },
    { label: "330 mm", value: "330" },
    { label: "400 mm", value: "400" },
  ],
};
/** Même clé « faconnage » : une réponse vaut pour tout le métal façonné ; la question dit la noue quand c'est elle. */
const FACONNAGE_NOUE_PARAM: ParamDef = {
  ...FACONNAGE_BANDES_PARAM,
  question: "Noue zinc : tu la façonnes toi-même ou tu la commandes façonnée ?",
  hint: "Je façonne : feuilles de zinc 2 × 1 m, bobineau au-delà de 6 ml. Commandée façonnée : noue en longueurs de 2 m.",
};
/**
 * Développé de la noue (§3 : 50 à 60 cm ; §7 : 50 à 66 cm ; §25.2 : noue préformée de 500 mm). Lu au devis ; sinon la
 * noue préformée de 50, dite et modifiable : c'est celle que le comptoir sert sans rien demander.
 */
const DEVELOPPE_NOUE_PARAM: ParamDef = {
  key: "developpe_noue",
  label: "Développé de la noue",
  unit: "mm",
  kind: "site_data",
  question: "Noue de 50 ou de 66 ?",
  hint: "Le développé : la largeur de la feuille avant façonnage.",
  default: { value: "500", source: F, verification: FOUNDER_DOC, version: 1, note: "noue préformée de 50 (§25.2)" },
  choices: [
    { label: "De 50", value: "500" },
    { label: "De 66", value: "660" },
  ],
  textValues: [
    { value: "500", keywords: ["dev 50", "dev. 50", "developpe 50", "developpe 500", "dev 500", "noue de 50", "noue 50"] },
    { value: "600", keywords: ["dev 60", "dev. 60", "developpe 60", "developpe 600", "dev 600", "noue de 60", "noue 60"] },
    { value: "660", keywords: ["dev 66", "dev. 66", "developpe 66", "developpe 660", "dev 660", "noue de 66", "noue 66", "encaissee"] },
  ],
};
/**
 * Arêtier en tuiles (arêtières, la pièce de la faîtière) ou en bande zinc (§3, §5) : deux articles au comptoir. Lu dans
 * la ligne ; sur un toit de tuiles, des arêtières ; sinon on demande, avec les mots du comptoir.
 */
const ARETIER_PARAM: ParamDef = {
  key: "aretier_matiere",
  label: "Arêtier",
  unit: "u",
  kind: "site_data",
  question: "Arêtier en tuiles (arêtières) ou en bande zinc ?",
  choices: [
    { label: "En tuiles (arêtières)", value: "1" },
    { label: "En bande zinc", value: "2" },
  ],
  textValues: [
    { value: "2", keywords: ["zinc"] },
    { value: "1", keywords: ["aretiere", "aretieres", "tuile", "tuiles", "terre cuite", "scelle", "a sec"] },
  ],
  // Sur un toit d'ardoises, l'arêtier acheté est une bande zinc (§3, §4 : « presque toujours en zinc ») : l'arêtier fermé
  // en ardoises se taille dans les ardoises de la surface.
  fromWorks: [
    { value: "1", workItems: ["couverture-tuiles-emboitement", "couverture-tuiles-canal"] },
    { value: "2", workItems: ["couverture-ardoises-crochet", "couverture-zinc-joint-debout"] },
  ],
  display: { "1": "en tuiles", "2": "en zinc" },
};
/** Arêtier zinc : « bande zinc dév. 25 à 33 cm » (§3) ; le comptoir sert « de 25 » ou « de 33 », il ne le devine pas. */
const DEVELOPPE_ARETIER_PARAM: ParamDef = {
  key: "developpe_aretier",
  label: "Développé de l'arêtier zinc",
  unit: "mm",
  kind: "site_data",
  question: "Arêtier zinc : bande de 25 ou de 33 ?",
  hint: "Le développé : la largeur de la feuille avant façonnage.",
  choices: [
    { label: "De 25", value: "250" },
    { label: "De 33", value: "330" },
  ],
  textValues: [
    { value: "250", keywords: ["dev 25", "dev. 25", "developpe 25", "developpe 250", "dev 250", "de 25"] },
    { value: "330", keywords: ["dev 33", "dev. 33", "developpe 33", "developpe 330", "dev 330", "de 33"] },
  ],
};
/** Abouts d'arêtier : « 1 par arêtier » (§5) ; le nombre d'arêtiers se lit au devis, sinon le comptoir le demande. */
const NB_ARETIERS_PARAM: ParamDef = {
  key: "nb_aretiers",
  label: "Nombre d'arêtiers",
  unit: "u",
  kind: "site_data",
  question: "Combien d'arêtiers sur ce toit ?",
  hint: "Un about par arêtier.",
  choices: [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "4", value: "4" },
  ],
  textValues: [
    { value: "1", keywords: ["1 aretier", "un aretier"] },
    { value: "2", keywords: ["2 aretiers", "deux aretiers"] },
    { value: "3", keywords: ["3 aretiers", "trois aretiers"] },
    { value: "4", keywords: ["4 aretiers", "quatre aretiers", "4 pans", "quatre pans"] },
  ],
};
/**
 * Raccord d'étanchéité d'une fenêtre de toit (§11) : un article par couverture au comptoir. Lu dans la ligne ou sur la
 * couverture du devis ; sinon demandé avec les mots du comptoir.
 */
const RACCORD_COUVERTURE_PARAM: ParamDef = {
  key: "raccord_couverture",
  label: "Raccord de la fenêtre de toit",
  unit: "u",
  kind: "site_data",
  question: "Raccord de fenêtre de toit : pour tuiles, pour ardoises ou pour tuiles plates ?",
  choices: [
    { label: "Pour tuiles (mécaniques, canal)", value: "1" },
    { label: "Pour ardoises", value: "2" },
    { label: "Pour tuiles plates", value: "3" },
  ],
  textValues: [
    { value: "3", keywords: ["tuile plate", "tuiles plates", "petit moule"] },
    { value: "2", keywords: ["ardoise", "ardoises", "pour materiau plat"] },
    { value: "1", keywords: ["tuile mecanique", "tuiles mecaniques", "pour tuiles", "pour tuile", "tuile a emboitement", "tuiles a emboitement", "tuiles canal", "tuile canal"] },
  ],
  fromWorks: [
    { value: "1", workItems: ["couverture-tuiles-emboitement", "couverture-tuiles-canal"] },
    { value: "2", workItems: ["couverture-ardoises-crochet"] },
  ],
  display: { "1": "pour tuiles", "2": "pour ardoises", "3": "pour tuiles plates" },
};
/**
 * Taille de la fenêtre (§11 : « dimensions nominales ex. 78×98, 78×118, 114×118 ») : lue dans la ligne, en cm ou par la
 * référence du fabricant (codes de taille Velux : MK04 = 78 × 98…). Sinon le raccord est « à la taille de la fenêtre » :
 * la taille est demandée une fois, sur la ligne de la fenêtre (question du comptoir), et le vendeur assortit le raccord.
 */
const FENETRES: [string, string, string[]][] = [
  ["5578", "55 × 78", ["ck02"]],
  ["5598", "55 × 98", ["ck04"]],
  ["66118", "66 × 118", ["fk06"]],
  ["7898", "78 × 98", ["mk04"]],
  ["78118", "78 × 118", ["mk06"]],
  ["78140", "78 × 140", ["mk08"]],
  ["94118", "94 × 118", ["pk06"]],
  ["94140", "94 × 140", ["pk08"]],
  ["114118", "114 × 118", ["sk06"]],
  ["114140", "114 × 140", ["sk08"]],
  ["13498", "134 × 98", ["uk04"]],
];
const TAILLE_FENETRE_PARAM: ParamDef = {
  key: "taille_fenetre",
  label: "Taille de la fenêtre de toit",
  unit: "u",
  kind: "site_data",
  question: "Fenêtre de toit : quelle taille ?",
  default: { value: "0", source: F, verification: FOUNDER_DOC, version: 1, note: "le raccord suit la taille de la fenêtre commandée" },
  textValues: FENETRES.map(([value, text, codes]) => {
    const [l, h] = text.split(" × ");
    return { value, keywords: [`${l}x${h}`, `${l} x ${h}`, `${l}*${h}`, `${l} × ${h}`, `${l}×${h}`, ...codes] };
  }),
  display: { "0": "à la taille de la fenêtre de toit", ...Object.fromEntries(FENETRES.map(([value, text]) => [value, `fenêtre ${text}`])) },
};
/** Gouttière PVC ou aluminium (§15) : la matière se lit dans la ligne (c'est elle qui choisit l'ouvrage). */
const MATIERE_GOUTTIERE_PARAM: ParamDef = {
  key: "matiere_gouttiere",
  label: "Matière de la gouttière",
  unit: "u",
  kind: "site_data",
  question: "Gouttière en PVC ou en aluminium ?",
  choices: [
    { label: "PVC", value: "1" },
    { label: "Aluminium", value: "2" },
  ],
  textValues: [
    { value: "1", keywords: ["pvc"] },
    { value: "2", keywords: ["alu", "aluminium"] },
  ],
  display: { "1": "PVC", "2": "alu" },
};
/** La teinte d'une gouttière PVC ou alu : le comptoir ne sert pas sans elle (grise, blanche, sable, brune, anthracite). */
const TEINTE_GOUTTIERE_PARAM: ParamDef = {
  key: "teinte_gouttiere",
  label: "Teinte de la gouttière",
  unit: "u",
  kind: "site_data",
  question: "Gouttière : grise, blanche, sable, brune ou anthracite ?",
  choices: [
    { label: "Grise", value: "1" },
    { label: "Blanche", value: "2" },
    { label: "Sable", value: "3" },
    { label: "Brune", value: "4" },
    { label: "Anthracite", value: "5" },
  ],
  textValues: [
    { value: "1", keywords: ["grise", "grises", "gris clair"] },
    { value: "2", keywords: ["blanc", "blanche", "blanches"] },
    { value: "3", keywords: ["sable"] },
    { value: "4", keywords: ["brun", "brune", "marron"] },
    { value: "5", keywords: ["anthracite", "7016"] },
  ],
  display: { "1": "grise", "2": "blanche", "3": "sable", "4": "brune", "5": "anthracite" },
};
/** Angles de la ligne de gouttière (§15 : « 1 angle par angle ») : le comptoir les compte, le devis les dit rarement. */
const NB_ANGLES_PARAM: ParamDef = {
  key: "nb_angles",
  label: "Angles de la gouttière",
  unit: "u",
  kind: "site_data",
  question: "Combien d'angles sur cette gouttière ?",
  choices: [
    { label: "Aucun", value: "0" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
  ],
  textValues: [
    { value: "0", keywords: ["sans angle", "ligne droite"] },
    { value: "1", keywords: ["1 angle", "un angle"] },
    { value: "2", keywords: ["2 angles", "deux angles"] },
    { value: "3", keywords: ["3 angles", "trois angles"] },
  ],
};
/**
 * Bac acier (§8) : simple peau ou panneau sandwich, lu dans la ligne (« sandwich ») ; la teinte et le feutre
 * anti-condensation sont ce que le comptoir demande ; la longueur des plaques est celle du rampant (+ 5 cm de débord).
 */
const TYPE_BAC_PARAM: ParamDef = {
  key: "type_bac",
  label: "Bac acier",
  unit: "u",
  kind: "site_data",
  question: "Bac acier simple peau ou panneau sandwich ?",
  default: { value: "1", source: F, verification: FOUNDER_DOC, version: 1, note: "simple peau : le devis ne dit pas sandwich" },
  choices: [
    { label: "Simple peau", value: "1" },
    { label: "Panneau sandwich", value: "2" },
  ],
  textValues: [{ value: "2", keywords: ["sandwich", "isole", "isolant"] }],
  display: { "1": "simple peau", "2": "panneau sandwich" },
};
const TEINTE_BAC_PARAM: ParamDef = {
  key: "teinte_bac",
  label: "Teinte du bac acier",
  unit: "u",
  kind: "site_data",
  question: "Bac acier : quelle teinte ?",
  choices: [
    { label: "Gris anthracite (RAL 7016)", value: "7016" },
    { label: "Gris ardoise (RAL 7022)", value: "7022" },
    { label: "Rouge tuile (RAL 8012)", value: "8012" },
    { label: "Noir (RAL 9005)", value: "9005" },
  ],
  textValues: [
    { value: "7016", keywords: ["7016", "anthracite"] },
    { value: "7022", keywords: ["7022", "gris ardoise"] },
    { value: "8012", keywords: ["8012", "rouge tuile", "tuile rouge"] },
    { value: "9005", keywords: ["9005", "noir"] },
  ],
  display: { "7016": "RAL 7016", "7022": "RAL 7022", "8012": "RAL 8012", "9005": "RAL 9005" },
};
const FEUTRE_BAC_PARAM: ParamDef = {
  key: "feutre_bac",
  label: "Feutre anti-condensation",
  unit: "u",
  kind: "site_data",
  question: "Bac acier : avec ou sans feutre anti-condensation ?",
  choices: [
    { label: "Avec feutre", value: "1" },
    { label: "Sans feutre", value: "2" },
  ],
  textValues: [
    { value: "2", keywords: ["sans feutre", "sans anti condensation", "sans anticondensation"] },
    { value: "1", keywords: ["anti condensation", "anticondensation", "anti-condensation", "avec feutre", "feutre"] },
  ],
  display: { "1": "avec feutre anti-condensation", "2": "sans feutre" },
};
// Même clé que le rampant de l'ardoise (la note « rampant 6 m » vaut pour les deux) ; ici sans hypothèse : la plaque de
// bac se fabrique à cette longueur, le comptoir la demande (§47.8).
const LONGUEUR_PLAQUES_PARAM: ParamDef = {
  key: "longueur_rampant",
  label: "Longueur de rampant (plaques)",
  unit: "m",
  kind: "site_data",
  question: "Bac acier : longueur du rampant (longueur des plaques) ?",
  hint: "Les plaques se commandent à la longueur du rampant, débord de 5 cm compris.",
  textLabels: ["rampant", "rampants", "longueur des plaques"],
  choices: [
    { label: "4 m", value: "4" },
    { label: "5 m", value: "5" },
    { label: "6 m", value: "6" },
    { label: "7 m", value: "7" },
  ],
};
const PANS_BAC_PARAM: ParamDef = {
  key: "nb_pans",
  label: "Pans",
  unit: "u",
  kind: "site_data",
  question: "Toit à un pan ou à deux pans ?",
  default: { value: "2", source: F, verification: FOUNDER_DOC, version: 1, note: "deux pans, un faîtage" },
  choices: [
    { label: "Un pan (monopente)", value: "1" },
    { label: "Deux pans", value: "2" },
  ],
  textValues: [
    { value: "1", keywords: ["monopente", "mono pente", "1 pan", "un pan", "appentis"] },
    { value: "2", keywords: ["2 pans", "deux pans", "double pente", "bipente"] },
  ],
};
/** Teinte de l'ardoise fibres-ciment : le comptoir ne la sert pas sans elle. */
const TEINTE_FC_PARAM: ParamDef = {
  key: "teinte_fc",
  label: "Teinte de l'ardoise fibres-ciment",
  unit: "u",
  kind: "site_data",
  question: "Ardoises fibres-ciment : bleu-noir, noir ou brun ?",
  choices: [
    { label: "Bleu-noir", value: "1" },
    { label: "Noir", value: "2" },
    { label: "Brun", value: "3" },
  ],
  textValues: [
    { value: "1", keywords: ["bleu noir", "bleu-noir", "bleue noire"] },
    { value: "2", keywords: ["noire", "noires", "teinte noir", "coloris noir"] },
    { value: "3", keywords: ["brun", "brune", "brunes"] },
  ],
  display: { "1": "bleu-noir", "2": "noir", "3": "brun" },
};
/** §12 : largeur de la bande de plomb, lue au devis (« largeur 40 cm », « bande de 33 ») ; sinon 30 cm (réponse du fondateur). */
const LARGEUR_PLOMB_PARAM: ParamDef = {
  key: "largeur_plomb",
  label: "Largeur de la bande de plomb",
  unit: "cm",
  kind: "site_data",
  question: "Plomb : bande de quelle largeur ?",
  textLabels: ["largeur", "bande de", "laize"],
  default: { value: "30", source: FR_REPLY_DESCENTES, verification: FOUNDER_REPLY_DESCENTES, version: 1, note: "bande de 30 cm" },
  choices: [
    { label: "20 cm", value: "20" },
    { label: "30 cm", value: "30" },
    { label: "40 cm", value: "40" },
    { label: "50 cm", value: "50" },
  ],
};
/** §12 : plomb 1,5 / 2 / 2,5 mm (17 / 22,7 / 28,4 kg/m²) ; 1,5 mm par défaut (réponse du fondateur). */
const EPAISSEUR_PLOMB_PARAM: ParamDef = {
  key: "epaisseur_plomb",
  label: "Épaisseur du plomb",
  unit: "mm",
  kind: "site_data",
  question: "Plomb : 1,5, 2 ou 2,5 mm ?",
  // Ses propres valeurs seulement : « ép. 0,65 mm » d'une note est l'épaisseur du zinc, jamais celle du plomb.
  textValues: [
    { value: "1.5", keywords: ["1,5 mm", "1.5 mm", "1,5mm"] },
    { value: "2", keywords: ["2 mm", "2mm"] },
    { value: "2.5", keywords: ["2,5 mm", "2.5 mm", "2,5mm"] },
  ],
  default: { value: "1.5", source: FR_REPLY_DESCENTES, verification: FOUNDER_REPLY_DESCENTES, version: 1, note: "plomb 1,5 mm" },
  choices: [
    { label: "1,5 mm", value: "1.5" },
    { label: "2 mm", value: "2" },
    { label: "2,5 mm", value: "2.5" },
  ],
  display: { "1.5": "1,5", "2": "2", "2.5": "2,5" },
};
/** Le développé d'une bande cuivre : la même lecture que le zinc, sa propre clé (une bande zinc et une bande cuivre du même devis n'ont pas forcément le même). */
const DEVELOPPE_CUIVRE_PARAM: ParamDef = { ...DEVELOPPE_PARAM, key: "developpe_cuivre", label: "Développé de la bande cuivre", question: "Développé de la bande cuivre ?" };
const FACONNAGE_CUIVRE_PARAM: ParamDef = {
  ...FACONNAGE_BANDES_PARAM,
  question: "Bandes cuivre : tu les façonnes toi-même ou tu les commandes façonnées ?",
  choices: [
    { label: "Je façonne (feuilles ou bobine)", value: "1" },
    { label: "Je commande façonné", value: "2" },
  ],
  hint: "Je façonne : feuilles de cuivre 2 × 1 m, bobine au mètre au-delà de 6 ml. Commandées façonnées : longueurs de 2 m.",
};
/** §12 : cuivre 0,6 mm (5,4 kg/m²) par défaut. */
const EPAISSEUR_CUIVRE_PARAM: ParamDef = {
  key: "epaisseur_cuivre",
  label: "Épaisseur du cuivre",
  unit: "mm",
  kind: "site_data",
  question: "Cuivre : 0,6 ou 0,7 mm ?",
  textValues: [
    { value: "0.6", keywords: ["0,6 mm", "0.6 mm", "0,60 mm"] },
    { value: "0.7", keywords: ["0,7 mm", "0.7 mm", "0,70 mm"] },
  ],
  default: { value: "0.6", source: F, verification: FOUNDER_DOC, version: 1, note: "cuivre 0,6 mm (§12)" },
  choices: [
    { label: "0,6 mm", value: "0.6" },
    { label: "0,7 mm", value: "0.7" },
  ],
  display: { "0.6": "0,6", "0.7": "0,7" },
};
/** Poids d'une bande zinc plate : 4,7 kg/m² en 0,65 mm (§7) ; 7,2 kg/m² par mm d'épaisseur pour 0,70 et 0,80 (masse volumique du zinc). */
const ZINC_PLAT_CONSTANTS = {
  poids_plat_065: condition("4.7", "kg/m2", F, FOUNDER_DOC, "« kg ≈ m² dév. × 4,7 (ép. 0,65) » (§7)."),
  poids_plat_070: condition("5.04", "kg/m2", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (7,2 kg/m² par mm, masse volumique du zinc)" }),
  poids_plat_080: condition("5.76", "kg/m2", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (7,2 kg/m² par mm, masse volumique du zinc)" }),
  seuil_070: condition("0.7", "mm", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (définition)" }),
  seuil_080: condition("0.8", "mm", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (définition)" }),
  longueur_utile: condition("1.9", "m", F, FOUNDER_DOC, "Bandes de 2 m, recouvrement 10 cm : « nombre = ml ÷ 1,9 » (§36.4)."),
  // §48.6 : la feuille de 2 × 1 m se découpe en bandes de 2 m dans le mètre de largeur.
  longueur_feuille: condition("2", "m", F, FOUNDER_DOC, "Feuille de zinc 2 × 1 m (§48.6)."),
  largeur_feuille: condition("1", "m", F, FOUNDER_DOC, "Feuille de zinc 2 × 1 m (§48.6)."),
  surface_feuille: condition("2", "m2", F, FOUNDER_DOC, "« feuilles = (ml ÷ 2 m) × (développé ÷ 1 000) arrondi sup. » (§25.2), feuille de 2 × 1 m."),
  marge_bandes: condition("1.1", "u", F, FOUNDER_DOC, "« Solin / abergement : ml × 1,1 » (§7)."),
  // Réponse du fondateur (2026-10-04) : « Bobineau : largeurs 500, 650 et 1 000 mm ; longueurs 17, 21, 31 m (40 m en
  // 500) ; épaisseurs 0,65 par défaut, 0,70 et 0,80. Je le prends pour les bandes façonnées à la place des feuilles
  // 2 × 1 m dès que la longueur dépasse 6 ml. »
  seuil_bobineau: condition("6", "m", FR_REPLY, FOUNDER_REPLY, "Au-delà de 6 ml de bande : bobineau au lieu de feuilles 2 × 1 m."),
  bobineau_500: condition("500", "mm", FR_REPLY, FOUNDER_REPLY),
  bobineau_650: condition("650", "mm", FR_REPLY, FOUNDER_REPLY),
  bobineau_1000: condition("1000", "mm", FR_REPLY, FOUNDER_REPLY),
  bobineau_17: condition("17", "m", FR_REPLY, FOUNDER_REPLY),
  bobineau_21: condition("21", "m", FR_REPLY, FOUNDER_REPLY),
  bobineau_31: condition("31", "m", FR_REPLY, FOUNDER_REPLY),
  bobineau_40: condition("40", "m", FR_REPLY, FOUNDER_REPLY, "40 m seulement en largeur 500."),
};
/**
 * Le bobineau qui suffit : la plus petite largeur qui contient le développé, puis la plus courte longueur qui couvre
 * le zinc à façonner (40 m seulement en 500) ; au-delà, plusieurs bobineaux de la plus grande longueur.
 */
const bobineauDerived = (developpe: string) => [
  {
    key: "largeur_bobineau",
    label: "Largeur du bobineau",
    unit: "mm",
    formula: `si(${developpe} <= regle.bobineau_500, regle.bobineau_500, si(${developpe} <= regle.bobineau_650, regle.bobineau_650, regle.bobineau_1000))`,
    source: FR_REPLY,
    verification: FOUNDER_REPLY,
    version: 1,
  },
  {
    key: "longueur_bobineau",
    label: "Longueur du bobineau",
    unit: "m",
    formula: "si(ml_zinc <= regle.bobineau_17, regle.bobineau_17, si(ml_zinc <= regle.bobineau_21, regle.bobineau_21, si(ml_zinc <= regle.bobineau_31, regle.bobineau_31, si(largeur_bobineau <= regle.bobineau_500, regle.bobineau_40, regle.bobineau_31))))",
    source: FR_REPLY,
    verification: FOUNDER_REPLY,
    version: 1,
  },
];
const POIDS_PLAT_DERIVED = {
  key: "poids_zinc_plat",
  label: "Poids du zinc (bande plate)",
  unit: "kg/m2",
  formula: "si(epaisseur_zinc >= regle.seuil_080, regle.poids_plat_080, si(epaisseur_zinc >= regle.seuil_070, regle.poids_plat_070, regle.poids_plat_065))",
  shown: true,
  source: F,
  verification: FOUNDER_DOC,
  version: 1,
};
const ENTRAXE_PARAM: ParamDef = {
  key: "entraxe_supports",
  label: "Entraxe des chevrons ou fermettes",
  unit: "cm",
  kind: "site_data",
  question: "Entraxe des chevrons (ou fermettes) ?",
  textLabels: ["entraxe"],
  default: { value: "60", source: F, verification: FOUNDER_DOC, version: 1, note: "entraxe courant en rénovation" },
  choices: [
    { label: "45 cm", value: "45" },
    { label: "60 cm", value: "60" },
    { label: "90 cm (fermettes)", value: "90" },
  ],
};
// Jamais « quelle quantité ? » : si le devis ne donne pas la surface, une question courte à boutons (« autre » = saisie).
const SURFACE_PARAM: ParamDef = {
  key: "surface",
  label: "Surface de toiture",
  unit: "m2",
  kind: "site_data",
  question: "Surface du toit ?",
  fromLineQuantity: true,
  choices: [
    { label: "50 m²", value: "50" },
    { label: "100 m²", value: "100" },
    { label: "150 m²", value: "150" },
    { label: "200 m²", value: "200" },
  ],
};
const USUAL_LITEAU_TUILE = { text: "Liteaux 27×40 pour la tuile (section courante).", source: F, productShort: "Liteaux 27×40", productId: "liteau-sapin-27x40" };
const USUAL_CONTRE_LITEAU = { text: "Contre-liteaux 27×40 sur chevrons (section courante).", source: F, productShort: "Liteaux 27×40", productId: "liteau-sapin-27x40" };
const USUAL_ECRAN = { text: "Écran HPV courant en rouleau de 1,5 × 50 m (75 m²).", source: F, productId: "ecran-hpv-standard" };
const ECRAN_CONSTANTS = {
  seuil_pente_ecran: condition("16.7", "°", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED, "Fiche Soprema : « pente ≤ 30 % », soit 16,7°."),
  recouvrement_faible_pente: condition("0.20", "m", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED, "Pente inférieure OU ÉGALE au seuil (« ≤ 30 % », 16,7°)."),
  recouvrement_forte_pente: condition("0.10", "m", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED, "Pente supérieure au seuil."),
};
const ECRAN_FORMULA = "surface * ecran.largeur_rouleau / (ecran.largeur_rouleau - si(pente <= regle.seuil_pente_ecran, regle.recouvrement_faible_pente, regle.recouvrement_forte_pente))";

/** Formats d'ardoise naturelle (hauteur × largeur, cm) du tableau du référentiel du fondateur (§3). */
const SLATE_FORMATS: [number, number][] = [[40, 25], [40, 22], [35, 25], [35, 22], [33, 23], [32, 22], [30, 22], [30, 20], [30, 18]];
function slate(h: number, l: number): Product {
  return {
    id: `ardoise-${h}x${l}`,
    family: "roof_slate",
    label: `Ardoise ${h} × ${l} cm`,
    shortLabel: `Ardoises ${h}×${l}`,
    aliases: [`${h}x${l}`, `${h} x ${l}`, `${h}*${l}`],
    generic: true,
    attributes: {
      longueur: spec((h / 100).toFixed(2), "m", "format-ardoise", FOUNDER_VALIDATED),
      largeur: spec((l / 100).toFixed(2), "m", "format-ardoise", FOUNDER_VALIDATED),
    },
    sellingUnits: [{ id: "piece", label: { one: "pièce", many: "pièces" }, contains: ONE_PIECE, primary: true }],
  };
}

export const ROOFING_REFERENTIAL: Referential = {
  id: "roofing",
  version: "roofing-2026.10.06-40",
  writtenOnly: true,
  trade: "roofing",
  sources: [
    { id: "definition", kind: "definition", title: "Définition", retrievedAt: "2026-10-01" },
    {
      id: "edilians-canal",
      kind: "manufacturer",
      title: "Tuiles canal Poudenx (Edilians)",
      publisher: "Edilians",
      url: "https://edilians.com/media/wysiwyg/Encyclopedie/canal-tuiles-edilians.pdf",
      note: "Nombres au m² (couvert seul) et liteaux au m² par recouvrement, relevés par le fondateur (référentiel §35.3).",
      retrievedAt: "2026-10-04",
    },
    {
      id: "edilians-hp10",
      kind: "manufacturer",
      title: "Documentation HP 10 Huguenot (Edilians)",
      publisher: "Edilians",
      url: "https://edilians.com/media/productattach/2/0/205_fag_hp_10_huguenot_19042024_bd.pdf",
      note: "Version du 19/04/2024 (données relevées par le fondateur sur le document officiel ; page à préciser).",
      retrievedAt: "2026-10-01",
    },
    {
      id: "soprema-sop-ecran-hpv-r2",
      kind: "manufacturer",
      title: "Fiche technique SOP'ÉCRAN HPV R2 (Soprema)",
      publisher: "Soprema",
      url: "https://www.bricoman.fr/pub/media/catalog/product/1/f/2/a/ecran_de_sous_toiture_et_pare_pluie_hpv_r_rouleau_de_l_x_l_m_sop_ecran_soprema_910070_techsheet.pdf",
      retrievedAt: "2026-10-01",
      note: "Fiche officielle Soprema diffusée par un distributeur ; à remplacer par l'adresse Soprema à réception du PDF.",
    },
    {
      id: "baticlair-geometrie-couverture",
      kind: "baticlair_rule",
      title: "Règle BatiClair : rangs au pureau, files de contre-liteaux par chevron, tuiles par m² couvert, surface d'écran avec recouvrements",
      retrievedAt: "2026-10-01",
      note: "Redonne le tableau Edilians « ml de liteaux par m² » et les 9,9 à 12 tuiles/m² (tests). Validée par le fondateur (couvreur) le 2026-10-02.",
    },
    {
      id: "baticlair-pratique-accessoires",
      kind: "baticlair_rule",
      title: "Règle de pratique BatiClair : faîtage, gouttière, descente",
      retrievedAt: "2026-10-01",
      note: "Closoir = longueur de faîtage, profil = longueur de gouttière, 1 naissance par descente, tubes = nombre × hauteur… Validée comme pratique métier par le fondateur (couvreur) le 2026-10-02 ; crochets de gouttière, coudes et colliers restent à sourcer.",
    },
    {
      id: "fondateur-pratique-2026-10-02",
      kind: "baticlair_rule",
      title: "Pratique déclarée par le fondateur (couvreur)",
      retrievedAt: "2026-10-02",
      note: "« Les liteaux pour ardoise, c'est souvent du 18/40 » : section par défaut quand le devis ne la précise pas, validée le 2026-10-02. Le devis l'emporte toujours.",
    },
    {
      id: "baticlair-geometrie-ardoise",
      kind: "baticlair_rule",
      title: "Règle BatiClair : ardoises au crochet (ardoises par m² couvert, un crochet par ardoise, une file de liteaux par rang)",
      retrievedAt: "2026-10-02",
      note: "Même géométrie que les tuiles (largeur × pureau) ; un crochet par ardoise. Validée par le fondateur (couvreur) le 2026-10-02.",
    },
    {
      id: "designation-liteau",
      kind: "definition",
      title: "Section nominale d'un liteau, écrite dans sa désignation commerciale (« 18 × 40 » = 18 mm × 40 mm)",
      retrievedAt: "2026-10-02",
    },
    {
      id: "format-ardoise",
      kind: "definition",
      title: "Format commercial d'une ardoise « L × l » (en cm), écrit dans le devis",
      retrievedAt: "2026-10-02",
      note: "Convention « longueur × largeur » (30×22 = 30 cm de long, 22 cm de large), confirmée par le fondateur le 2026-10-02.",
    },
    {
      id: "fondateur-reponses-2026-10-04",
      kind: "trade_practice",
      title: "Réponses du fondateur (couvreur) aux partiels du référentiel",
      documentRef: "Message du fondateur dans la conversation de travail, 2026-10-04 (réponses aux partiels : sortie de toit, bobineau, surlongueur, bâche)",
      retrievedAt: "2026-10-04",
      note: "Sortie de toit : une embase par sortie adaptée à la couverture (plomb pour ardoise et tuile, platine zinc soudée pour zinc), au diamètre du conduit, plus un chapeau ; collerette d'étanchéité seulement pour un conduit de fumée. Surlongueur de bobine 15 cm par bac. Bâche : fourniture. Bobineau : largeurs 500, 650, 1 000 mm, longueurs 17, 21, 31 m (40 m en 500), épaisseurs 0,65 (défaut), 0,70, 0,80.",
    },
    {
      id: "fondateur-reponses-2026-10-05",
      kind: "trade_practice",
      title: "Réponses du fondateur (couvreur) aux partiels du référentiel",
      documentRef: "Message du fondateur dans la conversation de travail, 2026-10-05 (descentes en longueurs, colliers, dauphin ; plomb et cuivre)",
      retrievedAt: "2026-10-05",
      note: "Descentes PVC et zinc en longueurs de 4 m (2 m si le devis le dit), 2 coudes par descente par défaut, colliers tous les 2 m, dauphin : question du comptoir. Plomb en rouleaux, largeur lue sinon 30 cm, épaisseur 1,5 mm par défaut. Cuivre : comme le zinc, avec ses propres largeurs.",
    },
    {
      id: "fondateur-referentiel-2026-10-03",
      kind: "trade_practice",
      title: "Référentiel quantitatif couverture (document du fondateur, couvreur)",
      documentRef: "Document « Référentiel quantitatif couverture-étanchéité », rédigé par le fondateur, 2026-10-03",
      retrievedAt: "2026-10-03",
      note: "Formules, tableau de recouvrement de l'ardoise (pente × zone), pertes, conditionnements courants, hypothèses par défaut. Les chiffres qu'il cite comme « valeurs courantes des DTU et fiches fabricants » restent à retrouver dans un document public : jusque-là, ils valent comme pratique validée par le fondateur (docs/ratios-a-valider.md).",
    },
    {
      id: "cupa-pureau-ardoises-m2",
      kind: "manufacturer",
      title: "Cupa Pizarras, FAQ « Pureau et nombre d'ardoises au m² »",
      publisher: "Cupa Pizarras",
      url: "https://www.cupapizarras.com/fr/centre-ressources/faqs/pureau-ardoises-au-m2/",
      retrievedAt: "2026-10-03",
      note: "Mise à jour septembre 2026 (référentiel du fondateur, §34) : ardoises/m² = 1 / [pureau × (largeur + Ø crochet)], Ø 1 mm, inox 2,7 mm en zone littorale.",
    },
    {
      id: "vmzinc-joint-debout",
      kind: "manufacturer",
      title: "VMZINC / Umicore, « Joint debout, couverture froide ventilée, dossier technique » (DTU 40.41)",
      publisher: "VMZINC",
      url: "https://www.soluzinc.com/documents/1570113828_Dossier-technique-JDB.pdf",
      retrievedAt: "2026-10-03",
      note: "Référentiel du fondateur, §36 : poids posé 5,5 / 6 / 7 kg/m² (0,65 / 0,70 / 0,80), largeur 500 → entraxe 430, 650 → 580, pattes par m² selon le rampant (36.2).",
    },
    {
      id: "negoce-liteau-27x40",
      kind: "retailer",
      title: "Fiche article liteau sapin traité 27 × 40 (négoce)",
      documentRef: "Fiche article du négoce à fournir (longueur vendue, botte)",
      retrievedAt: "2026-10-01",
    },
  ],
  families: [
    {
      code: "ridge_tile",
      label: "Faîtière",
      needUnit: "u",
      attributes: [{ key: "pieces_par_ml", label: "Pièces au mètre", unit: "u/m" }],
      keyAttributes: [],
      keywords: ["faitiere", "faitage"],
    },
    { code: "ridge_closure", label: "Closoir de faîtage", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["closoir"] },
    { code: "ridge_fixing", label: "Fixation de faîtière", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["fixation de faitiere", "agrafe de faitiere", "crochet de faitiere"] },
    { code: "ridge_end", label: "About de faîtage", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["about de faitage", "about"] },
    // Un faîtage EN ZINC est une bande, jamais des faîtières en terre cuite : le mot « zinc » le départage.
    { code: "zinc_ridge", label: "Faîtage zinc (bande)", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["faitage zinc", "faitage en zinc", "faitiere zinc", "faitiere en zinc", "bande de faitage zinc", "bande de faitage"] },
    { code: "zinc_clip", label: "Patte de fixation zinc", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["patte de fixation", "patte zinc"] },
    // §36.2 : les pattes se fixent à part (2 fixations par patte) ; le fournisseur sert les pointes séparément (§45.5).
    // Joint debout : pattes coulissantes et pattes fixes, deux articles distincts au comptoir (§45.5).
    { code: "seam_clip_sliding", label: "Patte coulissante de joint debout", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["patte coulissante", "pattes coulissantes"] },
    { code: "seam_clip_fixed", label: "Patte fixe de joint debout", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["patte fixe", "pattes fixes"] },
    // Bande d'égout à ourlet du joint debout (§7).
    { code: "eaves_strip", label: "Bande d'égout zinc", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["bande d'egout", "bande egout"] },
    // §45.8 : consommables SUGGÉRÉS (« On ajoute ? »), jamais ajoutés d'office : l'artisan répond oui ou non d'un tap.
    // Sans mots-clés : une ligne « mastic » du devis reste une ligne du devis, jamais rattachée à un ouvrage par eux.
    { code: "sealant", label: "Mastic, silicone", needUnit: "ml", attributes: [], keyAttributes: [], consumable: true },
    { code: "solder", label: "Étain à souder", needUnit: "kg", attributes: [], keyAttributes: [], consumable: true },
    { code: "flux", label: "Décapant zinc", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
    { code: "strip_screw", label: "Vis de bande", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
    { code: "clip_fixing", label: "Fixation de patte", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["pointe annelee", "pointes annelees", "vis de patte", "fixation de patte"], consumable: true },
    // Joint debout (§7, §36) : la ligne du devis est une SURFACE ; ce qui se commande, ce sont des bobines (au mètre linéaire) ou des bacs.
    { code: "standing_seam", label: "Couverture zinc joint debout", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["joint debout", "couverture zinc", "zinc a joint debout", "jdb"] },
    { code: "zinc_coil", label: "Bobine de zinc", needUnit: "m", attributes: [], keyAttributes: [], keywords: ["bobine de zinc", "bobine zinc", "zinc en bobine"] },
    { code: "zinc_panel", label: "Bac joint debout", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["bac joint debout", "bac zinc", "bacs zinc"] },
    // Bandes zinc au ml (§7, §36.4) : solin, rive, égout, ventilation, couvre-joint. Jamais commandées en « ml de zinc » nu.
    {
      code: "zinc_strip",
      label: "Bande zinc façonnée",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["bande de ventilation", "bande zinc", "bande en zinc", "bande de solin", "bande solin", "bande de rive zinc", "bande de rive en zinc", "bande d'egout", "bande egout", "couvre-joint zinc", "bavette zinc"],
    },
    { code: "zinc_sheet", label: "Feuille de zinc", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["feuille de zinc", "feuille zinc"] },
    { code: "zinc_narrow_coil", label: "Bobineau de zinc", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["bobineau"] },
    // Le mortier du solin (« bande porte-solin zinc et mortier ciment », D-2026-020) : jamais supprimé, estimé et à confirmer.
    { code: "solin_mortar", label: "Mortier de solin", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["mortier"] },
    { code: "solin_support", label: "Bande porte-solin", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["porte-solin", "porte solin"] },
    // Abergement (entourage de cheminée) : un ouvrage compté, converti en bandes zinc façonnées ou en bobine (§7 « Abergement de cheminée »).
    { code: "chimney_flashing", label: "Abergement de cheminée", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["abergement", "entourage de cheminee", "entourage cheminee", "solin de cheminee", "habillage de cheminee"] },
    { code: "sheathing", label: "Volige", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["volige", "voligeage", "planche de volige", "osb", "panneau osb", "panneaux osb", "contreplaque", "ctbx"] },
    { code: "verge_tile", label: "Tuile de rive", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["tuile de rive", "rive"] },
    { code: "gutter", label: "Gouttière (profil)", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["gouttiere"] },
    // §15 : la gouttière PVC ou aluminium précise « gouttière » (le mot de la matière, n'importe où dans la ligne).
    { code: "gutter_plastic", label: "Gouttière PVC ou aluminium", needUnit: "ml", attributes: [], keyAttributes: [], refines: "gutter", keywords: ["pvc", "alu", "aluminium"] },
    { code: "gutter_joint", label: "Jonction de gouttière", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "gutter_end", label: "Talon de gouttière", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "gutter_angle", label: "Angle de gouttière", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "gutter_expansion", label: "Joint de dilatation de gouttière", needUnit: "u", attributes: [], keyAttributes: [] },
    {
      code: "gutter_hook",
      label: "Crochet de gouttière",
      needUnit: "u",
      attributes: [{ key: "espacement_max", label: "Espacement maximal", unit: "m" }],
      keyAttributes: [],
      keywords: ["crochet de gouttiere"],
    },
    { code: "gutter_outlet", label: "Naissance", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["naissance"] },
    { code: "downpipe", label: "Tube de descente", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["descente", "tuyau de descente"] },
    { code: "downpipe_shoe", label: "Dauphin", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["dauphin", "dauphins"] },
    { code: "downpipe_elbow", label: "Coude de descente", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["coude"] },
    {
      code: "downpipe_clamp",
      label: "Collier de descente",
      needUnit: "u",
      attributes: [{ key: "espacement_max", label: "Espacement maximal", unit: "m" }],
      keyAttributes: [],
      keywords: ["collier"],
    },
    {
      code: "roof_tile",
      label: "Tuile",
      needUnit: "u",
      attributes: [
        { key: "largeur_utile", label: "Largeur utile", unit: "m" },
        { key: "pureau_min", label: "Pureau minimal", unit: "m" },
        { key: "pureau_max", label: "Pureau maximal", unit: "m" },
      ],
      keyAttributes: ["largeur_utile"],
      keywords: ["tuile"],
    },
    // Tuile canal (§35.3, DTU 40.22) : couvert + courant, nombre au m² selon le recouvrement. « Romane canal » reste
    // une tuile à emboîtement grand moule (§5) : seuls les mots ci-dessous désignent une vraie tuile canal.
    {
      code: "roof_tile_canal",
      label: "Tuile canal",
      needUnit: "u",
      refines: "roof_tile",
      attributes: [
        { key: "nb_r140", label: "Tuiles couvert au m² à R 140", unit: "u/m2" },
        { key: "nb_r150", label: "Tuiles couvert au m² à R 150", unit: "u/m2" },
        { key: "nb_r160", label: "Tuiles couvert au m² à R 160", unit: "u/m2" },
        { key: "nb_r170", label: "Tuiles couvert au m² à R 170", unit: "u/m2" },
        { key: "lit_r140", label: "Liteaux au m² à R 140", unit: "m/m2" },
        { key: "lit_r150", label: "Liteaux au m² à R 150", unit: "m/m2" },
        { key: "lit_r160", label: "Liteaux au m² à R 160", unit: "m/m2" },
        { key: "lit_r170", label: "Liteaux au m² à R 170", unit: "m/m2" },
      ],
      keyAttributes: [],
      keywords: ["tuile canal", "tuiles canal", "canal gironde", "canal charentaise", "canal lyonnaise", "canal 50"],
    },
    {
      code: "batten",
      label: "Liteau et contre-liteau",
      needUnit: "ml",
      attributes: [
        { key: "epaisseur", label: "Épaisseur", unit: "mm" },
        { key: "largeur", label: "Largeur", unit: "mm" },
      ],
      keyAttributes: ["epaisseur", "largeur"],
      keywords: ["liteau", "latte", "lattage", "contre latte", "contre lattage", "contre liteau"],
    },
    {
      code: "underlay",
      label: "Écran sous-toiture / pare-pluie",
      needUnit: "m2",
      attributes: [
        { key: "largeur_rouleau", label: "Largeur du rouleau", unit: "m" },
        { key: "longueur_rouleau", label: "Longueur du rouleau", unit: "m" },
      ],
      keyAttributes: ["largeur_rouleau"],
      keywords: ["ecran", "pare pluie", "membrane respirante", "membrane sous toiture", "sous toiture"],
    },
    {
      code: "roof_slate",
      label: "Ardoise",
      needUnit: "u",
      attributes: [
        { key: "largeur", label: "Largeur", unit: "m" },
        { key: "longueur", label: "Longueur", unit: "m" },
      ],
      keyAttributes: ["largeur", "longueur"],
      keywords: ["ardoise"],
    },
    // §4 : l'ardoise fibres-ciment précise « ardoise » ; même calcul, ses formats, ses clous et ses crochets d'antivent.
    {
      code: "roof_slate_fc",
      label: "Ardoise fibres-ciment",
      needUnit: "u",
      refines: "roof_slate",
      attributes: [
        { key: "largeur", label: "Largeur", unit: "m" },
        { key: "longueur", label: "Longueur", unit: "m" },
        { key: "ardoises_par_m2", label: "Ardoises au m²", unit: "u/m2" },
        { key: "liteaux_par_m2", label: "Liteaux au m²", unit: "m/m2" },
      ],
      keyAttributes: ["largeur", "longueur"],
      keywords: ["fibres ciment", "fibre ciment", "fibres-ciment", "fibre-ciment", "fibrociment", "fibro ciment", "fibro-ciment", "artificielle", "artificielles", "eternit"],
    },
    { code: "slate_nail", label: "Clou d'ardoise", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "slate_wind_hook", label: "Crochet d'antivent", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "slate_hook", label: "Crochet d'ardoise", needUnit: "u", attributes: [], keyAttributes: [], keywords: [
        "crochet d ardoise",
        "crochet ardoise",
        "crochet pour ardoise",
        // « Crochet inox ardoise 100 mm » : la matière s'intercale, c'est toujours un crochet.
        "crochet inox ardoise",
        "crochet cuivre ardoise",
        "crochet galva ardoise",
        "crochet galvanise ardoise",
        "crochet teinte ardoise",
      ],
    },
    // Familles de VOCABULAIRE seulement (aucun produit ni règle encore) : elles évitent qu'une
    // « tuile chatière » ou un « solin adapté à la tuile HP10 » soit pris pour une tuile.
    { code: "vent_tile", label: "Tuile chatière", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["chatiere", "tuile chatiere", "tuile de ventilation"] },
    // Sortie de toit : un ouvrage compté (réponse du fondateur, 2026-10-04) ; la ligne du devis en est la mesure.
    { code: "roof_outlet", label: "Sortie de toit", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["sortie de toit"] },
    { code: "outlet_base", label: "Embase de sortie de toit (plomb)", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "outlet_plate", label: "Platine zinc de sortie de toit", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "outlet_cap", label: "Chapeau de sortie de toit", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "outlet_collar", label: "Collerette d'étanchéité de conduit de fumée", needUnit: "u", attributes: [], keyAttributes: [] },
    // §5 : « Arêtier (même pièce que faîtière en général) : ml arêtier / 0,35 ≈ 2,9 pièces/ml » ; en zinc, une bande (§3).
    // §14 : sécurité définitive et accès ; reconnus, ils partent tels que le devis les écrit (modèle, norme, longueur).
    {
      code: "roof_safety",
      label: "Sécurité et accès (crochets de sécurité, échelle de toit, ligne de vie)",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: [
        "crochet de securite",
        "crochets de securite",
        "crochet de service",
        "crochets de service",
        "crochet d'echelle",
        "crochets d'echelle",
        "echelle de toit",
        "echelles de toit",
        "echelle de couvreur",
        "ligne de vie",
        "lignes de vie",
        "point d'ancrage",
        "points d'ancrage",
        "garde corps",
        "garde-corps",
        "passerelle",
        "chemin de circulation",
      ],
    },
    // §18 : un couvreur sans certification SS3 ne retire pas l'amiante ; le poste part tel qu'écrit, chiffré par un tiers,
    // et l'artisan est averti. Il l'emporte sur toute autre famille de la ligne (« plaques fibres-ciment amiantées »).
    {
      code: "asbestos_removal",
      label: "Désamiantage",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["desamiantage", "amiante", "amiantee", "amiantees", "amiante ciment", "amiante-ciment"],
      dominant: true,
      warning:
        "Amiante : le retrait se fait par une entreprise certifiée (SS3), après un repérage avant travaux et un plan de retrait déclaré un mois avant le chantier. BatiClair ne compte aucun matériau pour ce poste : il part tel qu'écrit (§18).",
    },
    // §12 : plomb en bande (bavettes, solins), commandé en rouleaux ; cuivre en bande, comme le zinc.
    { code: "lead_strip", label: "Bande de plomb", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["plomb", "bande de plomb", "bandes de plomb", "bavette plomb", "solin plomb"] },
    { code: "copper_strip", label: "Bande cuivre", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["cuivre", "bande cuivre", "bandes cuivre", "bande de cuivre", "solin cuivre", "couvertine cuivre"] },
    { code: "copper_sheet", label: "Feuille de cuivre", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "copper_coil", label: "Bobine de cuivre", needUnit: "m", attributes: [], keyAttributes: [] },
    // §8 : bac acier, commandé en plaques à longueur (jamais en m²), vis, closoirs, faîtière.
    {
      code: "steel_tray",
      label: "Couverture bac acier",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["bac acier", "bacs acier", "bacs aciers", "tole nervuree", "toles nervurees", "panneau sandwich", "panneaux sandwich", "bac sec", "couverture acier"],
    },
    { code: "steel_sheet", label: "Plaque bac acier", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "steel_screw", label: "Vis de bac acier", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "steel_closure", label: "Closoir de bac acier", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "steel_ridge", label: "Faîtière de bac acier", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "hip", label: "Arêtier", needUnit: "u", attributes: [{ key: "pieces_par_ml", label: "Pièces au mètre", unit: "u/m" }], keyAttributes: [], keywords: ["aretier", "aretiers", "aretiere", "aretieres"] },
    // §3 : « Arêtier ou faîtage en zinc : bande zinc dév. 25 à 33 cm, longueurs 3 m ». Un article à part de la bande de faîtage.
    { code: "hip_closure", label: "Closoir d'arêtier", needUnit: "ml", attributes: [], keyAttributes: [] },
    { code: "hip_fixing", label: "Crochet d'arêtier", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "hip_end", label: "About d'arêtier", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "hip_strip", label: "Arêtier zinc (bande)", needUnit: "ml", attributes: [], keyAttributes: [] },
    // §7, §25.2 : noue zinc, commandée façonnée (longueurs de 2 m) ou façonnée sur place (feuilles, bobineau).
    { code: "valley", label: "Noue", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["noue", "noues"] },
    { code: "flashing", label: "Solin, abergement", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["solin", "abergement"] },
    // §11 : la fenêtre se commande telle que le devis l'écrit ; sans sa taille, le comptoir la demande (réponse en précision).
    {
      code: "roof_window",
      label: "Fenêtre de toit",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["fenetre de toit", "fenetres de toit", "velux", "chassis de toit", "fenetre de toiture", "fenetres de toiture"],
      ask: {
        question: "Fenêtre de toit : quelle taille ?",
        hint: "La référence du fabricant (MK04, SK06…) ou la taille en cm.",
        choices: [
          { label: "55 × 78", value: "55 × 78" },
          { label: "78 × 98", value: "78 × 98" },
          { label: "78 × 118", value: "78 × 118" },
          { label: "114 × 118", value: "114 × 118" },
        ],
        answered: "\\b\\d{2,3} ?[x×*] ?\\d{2,3}\\b|\\b[a-z]k ?\\d{2}\\b",
      },
    },
    // §11 : « Raccord d'étanchéité : 1 par fenêtre ; type tuile (ondulée, pureau > 45 mm), ardoise ou matériau plat ».
    { code: "roof_window_flashing", label: "Raccord d'étanchéité de fenêtre de toit", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["raccord d'etancheite", "raccord etancheite"] },
  ],
  products: [
    {
      id: "edilians-hp10-huguenot",
      family: "roof_tile",
      label: "Tuile terre cuite HP 10 Huguenot, réf. 205 (Edilians)",
      shortLabel: "Tuiles HP10",
      manufacturer: "Edilians",
      aliases: ["hp10", "hp 10", "hp10 huguenot", "hp 10 huguenot"],
      attributes: {
        largeur_utile: spec("0.268", "m", "edilians-hp10", FOUNDER_CHECKED, "≈ 268 mm selon la documentation."),
        pureau_min: spec("0.310", "m", "edilians-hp10", FOUNDER_CHECKED),
        pureau_max: spec("0.376", "m", "edilians-hp10", FOUNDER_CHECKED),
      },
      sellingUnits: [
        { id: "piece", label: { one: "pièce", many: "pièces" }, contains: ONE_PIECE, primary: true },
        { id: "palette", label: { one: "palette", many: "palettes" }, contains: packaging("240", "u", "edilians-hp10", FOUNDER_CHECKED) },
      ],
    },
    {
      id: "liteau-sapin-27x40",
      family: "batten",
      label: "Liteau sapin traité 27 × 40 mm",
      shortLabel: "Liteaux 27×40",
      aliases: ["27x40", "27 x 40", "27*40", "27 40"],
      generic: true,
      attributes: {
        epaisseur: spec("27", "mm", "negoce-liteau-27x40", DRAFT, "Section nominale (désignation commerciale)."),
        largeur: spec("40", "mm", "negoce-liteau-27x40", DRAFT, "Section nominale (désignation commerciale)."),
      },
      sellingUnits: BATTEN_UNITS,
    },
    {
      id: "liteau-sapin-18x40",
      family: "batten",
      label: "Liteau 18 × 40 mm",
      shortLabel: "Liteaux 18×40",
      aliases: ["18x40", "18 x 40", "18*40", "18 40", "18/40"],
      generic: true,
      attributes: {
        epaisseur: spec("18", "mm", "designation-liteau", FOUNDER_VALIDATED, "Section nominale (désignation commerciale)."),
        largeur: spec("40", "mm", "designation-liteau", FOUNDER_VALIDATED, "Section nominale (désignation commerciale)."),
      },
      sellingUnits: BATTEN_UNITS,
    },
    // Formats d'ardoise naturelle du référentiel (§3, tableau par format). Les petits formats (27, 25, 22 cm)
    // n'y sont pas : leur recouvrement de référence est plus faible que celui du tableau pente × zone.
    ...SLATE_FORMATS.map(([h, l]) => slate(h, l)),
    {
      id: "soprema-sop-ecran-hpv-r2-150x50",
      family: "underlay",
      label: "SOP'ÉCRAN HPV R2, rouleau 1,50 × 50 m (Soprema)",
      shortLabel: "Écran HPV Soprema R2, rouleau 1,50 × 50 m",
      manufacturer: "Soprema",
      // Uniquement des appellations de MARQUE : « écran HPV » ou « membrane respirante » désignent la famille,
      // pas ce produit (le devis ne dit pas quel rouleau, donc BatiClair demande).
      aliases: ["sop ecran", "sop ecran hpv", "sop ecran hpv r2", "soprema hpv"],
      attributes: {
        largeur_rouleau: spec("1.5", "m", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED),
        longueur_rouleau: spec("50", "m", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED),
      },
      sellingUnits: [{ id: "rouleau", label: { one: "rouleau", many: "rouleaux" }, contains: packaging("75", "m2", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED), primary: true }],
    },
    // ---- Tuiles canal Poudenx (Edilians, §35.3) : couvert seul au m² par recouvrement ; ×2 pour couvert + courant.
    {
      id: "edilians-canal-50",
      family: "roof_tile_canal",
      label: "Tuile canal 50 Poudenx, réf. 414 / 454 (Edilians)",
      shortLabel: "Tuiles canal 50",
      manufacturer: "Edilians",
      aliases: ["canal 50", "canal 50 reabilis", "canal 50 restauration"],
      attributes: {
        nb_r140: spec("10.3", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r150: spec("11.1", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r160: spec("11.8", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r170: spec("12.6", "u/m2", "edilians-canal", FOUNDER_DOC),
        lit_r140: spec("2.78", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r150: spec("2.86", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r160: spec("2.94", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r170: spec("3.03", "m/m2", "edilians-canal", FOUNDER_DOC),
      },
      sellingUnits: BY_PIECE,
    },
    {
      id: "edilians-canal-gironde-50",
      family: "roof_tile_canal",
      label: "Tuile Canal Gironde 50 Poudenx, réf. 406 / 456 (Edilians)",
      shortLabel: "Tuiles Canal Gironde 50",
      manufacturer: "Edilians",
      aliases: ["canal gironde", "canal gironde 50", "quintescia"],
      attributes: {
        nb_r140: spec("12.4", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r150: spec("12.7", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r160: spec("13.1", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r170: spec("13.5", "u/m2", "edilians-canal", FOUNDER_DOC),
        lit_r140: spec("2.83", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r150: spec("2.92", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r160: spec("3.01", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r170: spec("3.10", "m/m2", "edilians-canal", FOUNDER_DOC),
      },
      sellingUnits: BY_PIECE,
    },
    {
      id: "edilians-canal-gironde-blocage",
      family: "roof_tile_canal",
      label: "Tuile Canal Gironde à blocage Poudenx, réf. 409 / 459 (Edilians)",
      shortLabel: "Tuiles Canal Gironde à blocage",
      manufacturer: "Edilians",
      aliases: ["canal gironde a blocage", "gironde a blocage"],
      attributes: {
        nb_r140: spec("12.7", "u/m2", "edilians-canal", FOUNDER_DOC, "Recouvrement fixe 150 mm (tuile à blocage)."),
        nb_r150: spec("12.7", "u/m2", "edilians-canal", FOUNDER_DOC, "Recouvrement fixe 150 mm (tuile à blocage)."),
        nb_r160: spec("12.7", "u/m2", "edilians-canal", FOUNDER_DOC, "Recouvrement fixe 150 mm (tuile à blocage)."),
        nb_r170: spec("12.7", "u/m2", "edilians-canal", FOUNDER_DOC, "Recouvrement fixe 150 mm (tuile à blocage)."),
        lit_r140: spec("2.92", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r150: spec("2.92", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r160: spec("2.92", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r170: spec("2.92", "m/m2", "edilians-canal", FOUNDER_DOC),
      },
      sellingUnits: BY_PIECE,
    },
    {
      id: "edilians-canal-lyonnaise-40",
      family: "roof_tile_canal",
      label: "Tuile Canal Lyonnaise 40 Poudenx, réf. 401 / 451 (Edilians)",
      shortLabel: "Tuiles Canal Lyonnaise 40",
      manufacturer: "Edilians",
      aliases: ["canal lyonnaise", "lyonnaise 40", "restorial"],
      attributes: {
        nb_r140: spec("14.2", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r150: spec("14.8", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r160: spec("15.4", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r170: spec("16.1", "u/m2", "edilians-canal", FOUNDER_DOC),
        lit_r140: spec("3.85", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r150: spec("4.00", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r160: spec("4.17", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r170: spec("4.35", "m/m2", "edilians-canal", FOUNDER_DOC),
      },
      sellingUnits: BY_PIECE,
    },
    {
      id: "edilians-canal-charentaise",
      family: "roof_tile_canal",
      label: "Tuile Canal Charentaise Poudenx, réf. 405 / 455 (Edilians)",
      shortLabel: "Tuiles Canal Charentaise",
      manufacturer: "Edilians",
      aliases: ["canal charentaise", "charentaise"],
      attributes: {
        nb_r140: spec("16.7", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r150: spec("17.4", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r160: spec("18.1", "u/m2", "edilians-canal", FOUNDER_DOC),
        nb_r170: spec("18.9", "u/m2", "edilians-canal", FOUNDER_DOC),
        lit_r140: spec("3.85", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r150: spec("4.00", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r160: spec("4.17", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r170: spec("4.35", "m/m2", "edilians-canal", FOUNDER_DOC),
      },
      sellingUnits: BY_PIECE,
    },
    {
      id: "edilians-canal-charentaise-blocage",
      family: "roof_tile_canal",
      label: "Tuile Canal Charentaise à blocage Poudenx, réf. 410 / 460 (Edilians)",
      shortLabel: "Tuiles Canal Charentaise à blocage",
      manufacturer: "Edilians",
      aliases: ["canal charentaise a blocage", "charentaise a blocage"],
      attributes: {
        nb_r140: spec("17.4", "u/m2", "edilians-canal", FOUNDER_DOC, "Recouvrement fixe 150 mm (tuile à blocage)."),
        nb_r150: spec("17.4", "u/m2", "edilians-canal", FOUNDER_DOC, "Recouvrement fixe 150 mm (tuile à blocage)."),
        nb_r160: spec("17.4", "u/m2", "edilians-canal", FOUNDER_DOC, "Recouvrement fixe 150 mm (tuile à blocage)."),
        nb_r170: spec("17.4", "u/m2", "edilians-canal", FOUNDER_DOC, "Recouvrement fixe 150 mm (tuile à blocage)."),
        lit_r140: spec("4.00", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r150: spec("4.00", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r160: spec("4.00", "m/m2", "edilians-canal", FOUNDER_DOC),
        lit_r170: spec("4.00", "m/m2", "edilians-canal", FOUNDER_DOC),
      },
      sellingUnits: BY_PIECE,
    },
    {
      id: "edilians-faitiere-angulaire-710",
      family: "ridge_tile",
      label: "Faîtière/arêtier angulaire à emboîtement réf. 710 (Edilians)",
      shortLabel: "Faîtières angulaires 710",
      manufacturer: "Edilians",
      // Appellations de CE modèle seulement : « faîtières ventilées » n'est pas une preuve que c'est lui.
      aliases: ["faitiere angulaire", "faitiere angulaire a emboitement", "faitiere 710", "ref 710"],
      attributes: { pieces_par_ml: spec("3", "u/m", "edilians-hp10", FOUNDER_CHECKED, "« 3 pièces/ml » (documentation HP 10, 19/04/2024).") },
      sellingUnits: [{ id: "piece", label: { one: "pièce", many: "pièces" }, contains: ONE_PIECE, primary: true }],
    },
    // ---- Produits génériques (référentiel du fondateur) : utilisés par défaut, dits comme hypothèse.
    generic("faitiere-standard", "ridge_tile", "Faîtière 40 à 42 cm, recouvrement 5 à 7 cm (modèle à préciser)", "Faîtières", {
      attributes: { pieces_par_ml: spec("2.9", "u/m", F, FOUNDER_DOC, "« ml faîtage / 0,35 ≈ 2,9 pièces/ml ».") },
    }),
    generic("closoir-standard-5m", "ridge_closure", "Closoir ventilé de faîtage, rouleau de 5 m (modèle à préciser)", "Closoir", {
      sellingUnits: [{ id: "rouleau", label: { one: "rouleau de 5 m", many: "rouleaux de 5 m" }, contains: packaging("5", "m", F, FOUNDER_DOC), primary: true }],
    }),
    generic("crochet-faitiere-standard", "ridge_fixing", "Crochet de faîtière à sec (modèle à préciser)", "Crochets de faîtière"),
    generic("about-faitage-standard", "ridge_end", "About de faîtage (modèle à préciser)", "Abouts de faîtage"),
    generic("ecran-hpv-standard", "underlay", "Écran de sous-toiture HPV, rouleau 1,5 × 50 m (modèle à préciser)", "Écran HPV, rouleau 1,50 × 50 m", {
      attributes: {
        largeur_rouleau: spec("1.5", "m", F, FOUNDER_DOC),
        longueur_rouleau: spec("50", "m", F, FOUNDER_DOC),
      },
      sellingUnits: [{ id: "rouleau", label: { one: "rouleau", many: "rouleaux" }, contains: packaging("75", "m2", F, FOUNDER_DOC, "1,5 × 50 m = 75 m²."), primary: true }],
    }),
    // §4 : formats, recouvrement courant 100 mm, ardoises et liteaux au m² du référentiel du fondateur.
    ...([
      [40, 24, "27.8", "6.67"],
      [40, 27, "24.7", "6.67"],
      [60, 30, "13.3", "4"],
      [60, 40, "10", "4"],
    ] as const).map(([h, l, parM2, liteaux]): Product => ({
      id: `ardoise-fc-${h}x${l}`,
      family: "roof_slate_fc",
      label: `Ardoise fibres-ciment ${h} × ${l} cm`,
      shortLabel: `Ardoises fibres-ciment ${h}×${l}`,
      aliases: [`${h}x${l}`, `${h} x ${l}`, `${h}*${l}`, `${h} × ${l}`, `${h}×${l}`],
      generic: true,
      attributes: {
        longueur: spec((h / 100).toFixed(2), "m", F, FOUNDER_DOC),
        largeur: spec((l / 100).toFixed(2), "m", F, FOUNDER_DOC),
        ardoises_par_m2: spec(parM2, "u/m2", F, FOUNDER_DOC, "Recouvrement courant 100 mm (§4)."),
        liteaux_par_m2: spec(liteaux, "m/m2", F, FOUNDER_DOC, "Une file par pureau (§4)."),
      },
      sellingUnits: BY_PIECE,
    })),
    generic("clou-ardoise-fc", "slate_nail", "Clou inox pour ardoise fibres-ciment", "Clous inox d'ardoise"),
    generic("antivent-ardoise-fc", "slate_wind_hook", "Crochet d'antivent inox pour ardoise fibres-ciment", "Crochets d'antivent"),
    generic("crochet-ardoise-standard", "slate_hook", "Crochet d'ardoise inox (longueur = pureau + 10 à 20 mm)", "Crochets d'ardoise"),
    generic("tuile-rive-standard", "verge_tile", "Tuile de rive (modèle de la tuile)", "Tuiles de rive"),
    generic("gouttiere-standard-4m", "gutter", "Gouttière, longueurs de 4 m (profil à préciser)", "Gouttière", {
      sellingUnits: [
        { id: "longueur", label: { one: "longueur de 4 m", many: "longueurs de 4 m" }, contains: packaging("4", "m", F, FOUNDER_DOC), primary: true },
      ],
    }),
    // §15 : « Gouttière PVC demi-ronde 25 ou 33 (longueur 4 m) » ; aluminium laqué « longueurs 4 à 6 m » : 4 m retenus.
    generic("gouttiere-pvc-alu-4m", "gutter_plastic", "Gouttière PVC ou aluminium, longueurs de 4 m (profil et teinte à préciser)", "Gouttière PVC / alu", {
      sellingUnits: [{ id: "longueur", label: { one: "longueur de 4 m", many: "longueurs de 4 m" }, contains: packaging("4", "m", F, FOUNDER_DOC, "« longueur 4 m » (§15)."), primary: true }],
    }),
    // §8 : « plaque à longueur » ; vis autoperceuses avec rondelle EPDM en boîtes de 100 ; closoirs mousse ; faîtière 2 m.
    generic("plaque-bac-acier", "steel_sheet", "Plaque bac acier à la longueur du rampant (type, teinte et largeur utile du chantier)", "Plaques bac acier"),
    generic("vis-bac-acier", "steel_screw", "Vis autoperceuses avec rondelle EPDM pour bac acier, boîte de 100", "Vis de bac acier", {
      sellingUnits: [{ id: "boite", label: { one: "boîte de 100", many: "boîtes de 100" }, contains: packaging("100", "u", F, FOUNDER_DOC, "« boîte de 100 » (§8)."), primary: true }],
    }),
    generic("closoir-bac-acier", "steel_closure", "Closoir mousse profilé au bac acier", "Closoirs mousse"),
    generic("faitiere-bac-acier", "steel_ridge", "Faîtière de bac acier, longueur 2 m (teinte du bac)", "Faîtières bac acier"),
    // §12 : plomb laminé en rouleaux ; cuivre « comme le zinc » : bandes façonnées de 2 m, feuilles 2 × 1 m, bobine au mètre.
    generic("plomb-rouleau", "lead_strip", "Plomb laminé en rouleau (largeur et épaisseur du chantier)", "Plomb en rouleau", {
      sellingUnits: [{ id: "rouleau", label: { one: "rouleau", many: "rouleaux" }, contains: ONE_PIECE, primary: true }],
    }),
    generic("bande-cuivre-faconnee", "copper_strip", "Bande cuivre façonnée, longueurs de 2 m (développé et épaisseur du chantier)", "Bandes cuivre façonnées", {
      sellingUnits: [{ id: "longueur", label: { one: "longueur de 2 m", many: "longueurs de 2 m" }, contains: ONE_PIECE, primary: true }],
    }),
    generic("feuille-cuivre-2x1", "copper_sheet", "Feuille de cuivre 2 × 1 m (épaisseur du chantier)", "Feuilles cuivre 2 × 1 m"),
    generic("bobine-cuivre", "copper_coil", "Cuivre en bobine, au mètre linéaire (largeur et épaisseur du chantier)", "Cuivre en bobine", {
      sellingUnits: [{ id: "ml", label: { one: "ml", many: "ml" }, contains: ONE_METRE, primary: true }],
    }),
    generic("ciment-sable-solin", "solin_mortar", "Ciment 35 kg + sable, pour mortier de solin", "Ciment + sable (mortier de solin)", {
      sellingUnits: [{ id: "sac", label: { one: "sac", many: "sacs" }, contains: ONE_PIECE, primary: true }],
    }),
    generic("jonction-gouttiere", "gutter_joint", "Jonction de gouttière (système de la gouttière)", "Jonctions de gouttière"),
    generic("talon-gouttiere", "gutter_end", "Talon (fond) de gouttière (système de la gouttière)", "Talons de gouttière"),
    generic("angle-gouttiere", "gutter_angle", "Angle de gouttière 90° (système de la gouttière)", "Angles de gouttière"),
    generic("dilatation-gouttiere", "gutter_expansion", "Joint de dilatation de gouttière PVC", "Joints de dilatation"),
    generic("crochet-gouttiere-standard", "gutter_hook", "Crochet de gouttière (modèle à préciser)", "Crochets de gouttière"),
    generic("naissance-standard", "gutter_outlet", "Naissance de gouttière (modèle à préciser)", "Naissances"),
    // Réponse du fondateur (2026-10-05) : tubes de descente PVC et zinc en longueurs de 4 m (2 m si le devis le dit).
    generic("tube-descente-standard", "downpipe", "Tube de descente (longueur du chantier)", "Tubes de descente"),
    generic("dauphin-standard", "downpipe_shoe", "Dauphin de pied de descente, 1 m", "Dauphins"),
    generic("coude-descente-standard", "downpipe_elbow", "Coude de descente (modèle à préciser)", "Coudes"),
    generic("bande-faitage-zinc-standard", "zinc_ridge", "Bande de faîtage zinc, développé 25 à 33 cm, longueurs de 3 m", "Faîtage zinc (bande)", {
      sellingUnits: [{ id: "longueur", label: { one: "longueur de 3 m", many: "longueurs de 3 m" }, contains: packaging("3", "m", F, FOUNDER_DOC), primary: true }],
    }),
    generic("patte-zinc-standard", "zinc_clip", "Patte de fixation pour bande zinc", "Pattes de fixation"),
    // §5 : l'arêtier est en général la même pièce que la faîtière (≈ 2,9 pièces/ml), son closoir fait 23 cm de large.
    generic("aretiere-standard", "hip", "Arêtier 40 à 42 cm, recouvrement 5 à 7 cm (modèle de la tuile posée)", "Arêtiers", {
      attributes: { pieces_par_ml: spec("2.9", "u/m", F, FOUNDER_DOC, "« ml arêtier / 0,35 ≈ 2,9 pièces/ml » (§5).") },
    }),
    generic("closoir-aretier-5m", "hip_closure", "Closoir ventilé d'arêtier, largeur 23 cm, rouleau de 5 m", "Closoir d'arêtier", {
      sellingUnits: [{ id: "rouleau", label: { one: "rouleau de 5 m", many: "rouleaux de 5 m" }, contains: packaging("5", "m", F, FOUNDER_DOC, "« arêtier : largeur 23 cm », rouleau de 5 m (§5)."), primary: true }],
    }),
    generic("crochet-aretier-standard", "hip_fixing", "Crochet d'arêtier à sec (modèle de l'arêtier)", "Crochets d'arêtier"),
    generic("bande-aretier-zinc-standard", "hip_strip", "Bande d'arêtier zinc, développé 25 à 33 cm, longueurs de 3 m", "Arêtier zinc (bande)", {
      sellingUnits: [{ id: "longueur", label: { one: "longueur de 3 m", many: "longueurs de 3 m" }, contains: packaging("3", "m", F, FOUNDER_DOC), primary: true }],
    }),
    generic("raccord-fenetre-toit", "roof_window_flashing", "Raccord d'étanchéité de fenêtre de toit, adapté à la couverture et à la taille de la fenêtre", "Raccords d'étanchéité"),
    generic("about-aretier-standard", "hip_end", "About d'arêtier (modèle de la tuile posée)", "Abouts d'arêtier"),
    // §25.2 : « Noue préformée : développé 500 mm, L 2 m ou 3 m ; recouvrement 150 mm → longueur utile 1,85 m pour 2 m ».
    generic("noue-zinc-faconnee", "valley", "Noue zinc façonnée, longueurs de 2 m (développé et épaisseur du chantier)", "Noues zinc façonnées", {
      sellingUnits: [{ id: "longueur", label: { one: "longueur de 2 m", many: "longueurs de 2 m" }, contains: ONE_PIECE, primary: true }],
    }),
    // §45.5 : pattes fixes et pattes coulissantes sont deux articles au comptoir, les pointes un troisième.
    generic("embase-plomb-sortie", "outlet_base", "Embase plomb pour sortie de toit, au diamètre du conduit", "Embase plomb de sortie de toit"),
    generic("platine-zinc-sortie", "outlet_plate", "Platine zinc soudée pour sortie de toit, au diamètre du conduit", "Platine zinc de sortie de toit"),
    generic("chapeau-sortie", "outlet_cap", "Chapeau de sortie de toit, au diamètre du conduit", "Chapeau de sortie de toit"),
    generic("collerette-sortie", "outlet_collar", "Collerette d'étanchéité (solin) pour conduit de fumée", "Collerette d'étanchéité"),
    generic("patte-coulissante-joint-debout", "seam_clip_sliding", "Patte coulissante pour joint debout (largeur de bobine du chantier)", "Pattes coulissantes joint debout"),
    generic("patte-fixe-joint-debout", "seam_clip_fixed", "Patte fixe pour joint debout (largeur de bobine du chantier)", "Pattes fixes joint debout"),
    // §36.2 : « 18 mm → pointe annelée 2,5×28 » (volige 18 mm, §7).
    generic("pointe-annelee-2-5x28", "clip_fixing", "Pointe annelée 2,5 × 28 mm pour patte sur volige 18 mm", "Pointes annelées 2,5 × 28 mm"),
    // §25.6 : « Mastic PU / silicone neutre : 1 cartouche par 8 ml de joint (solins, couvertines, pénétrations) ».
    generic("cartouche-silicone-zinc", "sealant", "Cartouche de silicone neutre (ou mastic PU) compatible zinc", "Cartouches de silicone zinc", {
      sellingUnits: [{ id: "cartouche", label: { one: "cartouche", many: "cartouches" }, contains: packaging("8", "m", F, FOUNDER_DOC, "« 1 cartouche par 8 ml de joint » (§25.6)."), primary: true }],
    }),
    // §25.3 : « Baguette de soudure étain 33 % (ou sans plomb SnZn), 220-250 g » ; « Décapant pour zinc : 1 flacon 250 ml ».
    generic("baguette-etain-250", "solder", "Baguette d'étain 33 % pour soudure du zinc, 250 g", "Étain à souder en baguettes de 250 g", {
      sellingUnits: [{ id: "baguette", label: { one: "baguette de 250 g", many: "baguettes de 250 g" }, contains: packaging("0.25", "kg", F, FOUNDER_DOC, "« Baguette de soudure étain 33 %, 220-250 g » (§25.3)."), primary: true }],
    }),
    generic("decapant-zinc-250", "flux", "Décapant pour soudure du zinc, flacon de 250 ml", "Décapant zinc, flacon de 250 ml", {
      sellingUnits: [{ id: "flacon", label: { one: "flacon de 250 ml", many: "flacons de 250 ml" }, contains: ONE_PIECE, primary: true }],
    }),
    // §25.5 : « Vis autoforeuses bandes de rive alu/zinc : 4/ml » ; la boîte de 200 : exemple du fondateur (§45.8).
    generic("vis-inox-4x40", "strip_screw", "Vis inox 4 × 40 mm pour bandes zinc", "Vis inox 4 × 40", {
      sellingUnits: [{ id: "boite", label: { one: "boîte de 200", many: "boîtes de 200" }, contains: packaging("200", "u", F, FOUNDER_DOC, "« Vis inox 4 × 40 : 1 boîte de 200 » (§45.8)."), primary: true }],
    }),
    // §7 : bande d'égout + ourlet, développé 25 à 33 cm, bandes de 2 m (33 cm retenu, comme les abergements).
    generic("bande-egout-zinc-330", "eaves_strip", "Bande d'égout zinc à ourlet, développé 33 cm, longueurs de 2 m (épaisseur du chantier)", "Bandes d'égout zinc dév. 33 cm", {
      sellingUnits: [{ id: "longueur", label: { one: "longueur de 2 m", many: "longueurs de 2 m" }, contains: ONE_PIECE, primary: true }],
    }),
    // Retour du fondateur (2026-10-04) : une bobine de zinc se commande au MÈTRE LINÉAIRE, jamais au kg ; la largeur
    // (500 mm en bord de mer, 650 mm ailleurs) et l'épaisseur partent avec la ligne, dans « Le chantier en bref ».
    ...(["650", "500"] as const).map((w) =>
      generic(w === "650" ? "bobine-zinc-standard" : "bobine-zinc-500", "zinc_coil", `Zinc en bobine largeur ${w} mm, au mètre linéaire (aspect et épaisseur du chantier)`, `Zinc en bobine ${w} mm`, {
        sellingUnits: [{ id: "ml", label: { one: "ml", many: "ml" }, contains: packaging("1", "m", "definition", { status: "verified", verifiedAt: "2026-10-04", verifiedBy: "BatiClair (définition)" }), primary: true }],
      }),
    ),
    generic("bac-joint-debout-standard", "zinc_panel", "Bac joint debout zinc naturel, façonné à la longueur du rampant (largeur utile 430 ou 580 mm)", "Bacs joint debout zinc"),
    generic("bardelis-standard", "verge_tile", "Bardelis (tuile de rive canal), modèle de la tuile posée", "Bardelis"),
    // Zinc façonné sur place (§25.2) : feuilles de 2 × 1 m, épaisseur du chantier ; jamais au kg pour un abergement ou une bande.
    generic("feuille-zinc-2x1", "zinc_sheet", "Feuille zinc naturel 2 × 1 m (épaisseur du chantier)", "Feuilles zinc 2 × 1 m"),
    // Réponse du fondateur (2026-10-04) : bobineau vendu à la pièce, désignation « bobineau 650 × 31 m, 0,65 ».
    generic("bobineau-zinc", "zinc_narrow_coil", "Bobineau de zinc naturel (largeur, longueur et épaisseur du chantier)", "Bobineau zinc"),
    // Retour du fondateur (§45.5) : une bande zinc se sert en longueurs de 2 m, dites comme telles (« 8 longueurs de 2 m »).
    generic("bande-zinc-faconnee-standard", "zinc_strip", "Bande zinc façonnée, longueurs de 2 m (développé et épaisseur du chantier)", "Bandes zinc façonnées", {
      sellingUnits: [{ id: "longueur", label: { one: "longueur de 2 m", many: "longueurs de 2 m" }, contains: ONE_PIECE, primary: true }],
    }),
    generic("porte-solin-standard", "solin_support", "Bande porte-solin, longueurs de 2 m", "Bandes porte-solin 2 m"),
    // §7 : « Panneaux OSB 3 / contreplaqué CTBX : m² × 1,05 / surface panneau (2,50 × 1,25 = 3,125 m²) ». Le m² est
    // admis pour un panneau (§40.3) ; le nombre de panneaux est donné à côté dès que le conditionnement est connu.
    generic("panneau-osb-standard", "sheathing", "Panneau OSB 3 (ou contreplaqué CTBX) 2,50 × 1,25 m, épaisseur selon le chantier", "Panneaux OSB", {
      aliases: ["osb", "osb 3", "osb3", "panneau osb", "contreplaque", "ctbx"],
      sellingUnits: [
        { id: "m2", label: { one: "m²", many: "m²" }, contains: packaging("1", "m2", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (définition)" }), primary: true },
        { id: "panneau", label: { one: "panneau de 2,50 × 1,25 m", many: "panneaux de 2,50 × 1,25 m" }, contains: packaging("3.125", "m2", F, FOUNDER_DOC, "2,50 × 1,25 = 3,125 m².") },
      ],
    }),
    generic("volige-sapin-standard", "sheathing", "Volige sapin traité 18 mm", "Voliges sapin 18 mm", {
      sellingUnits: [{ id: "m2", label: { one: "m²", many: "m²" }, contains: packaging("1", "m2", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (définition)" }), primary: true }],
    }),
    generic("collier-descente-standard", "downpipe_clamp", "Collier de descente (modèle à préciser)", "Colliers"),
  ],
  workItems: [
    {
      id: "couverture-tuiles-emboitement",
      trade: "roofing",
      section: "principal",
      label: "Couverture en tuiles à emboîtement",
      triggers: ["roof_tile"],
      params: [
        SURFACE_PARAM,
        {
          key: "pureau",
          label: "Pureau",
          unit: "cm",
          kind: "site_data",
          question: "À quel pureau posez-vous ces tuiles ?",
          hint: "Il change le nombre de tuiles et de liteaux.",
          range: { min: "tuile.pureau_min", max: "tuile.pureau_max" },
          textLabels: ["pureau"],
          // Référentiel du fondateur : « en zone 3 et pente < 35 % (19,3°), prendre le pureau mini » ; sinon le pureau se cale
          // selon la pente, le maxi du fabricant pour une pente courante. Dit comme hypothèse, modifiable.
          default: {
            formula: "si(zone >= regle.zone_littorale, tuile.pureau_min, si(pente < regle.seuil_pente_pureau, tuile.pureau_min, tuile.pureau_max))",
            source: F,
            verification: FOUNDER_DOC,
            version: 1,
            note: "pureau mini du fabricant en zone littorale ou pente < 19,3° (35 %), sinon pureau maxi",
          },
        },
        ENTRAXE_PARAM,
        PENTE_PARAM,
        ZONE_PARAM,
        { key: "longueur_rives", label: "Longueur de rives", unit: "m", kind: "site_data", question: "Longueur totale des rives ?", fromLineQuantity: true, forSlots: ["rive"] },
      ],
      slots: [
        { key: "tuile", family: "roof_tile", label: "Tuiles" },
        { key: "liteau", family: "batten", label: "Liteaux", keywords: ["lattage", "liteau", "latte"], usual: USUAL_LITEAU_TUILE },
        { key: "contre_liteau", family: "batten", label: "Contre-liteaux", keywords: ["contre lattage", "contre latte", "contre liteau"], usual: USUAL_CONTRE_LITEAU },
        { key: "ecran", family: "underlay", label: "Écran sous-toiture", usual: USUAL_ECRAN },
        { key: "rive", family: "verge_tile", label: "Tuiles de rive", keywords: ["rive"], usual: { text: "Tuile de rive du modèle de tuile posé.", source: F, productId: "tuile-rive-standard" } },
      ],
      constants: {
        ...ECRAN_CONSTANTS,
        seuil_pente_pureau: condition("19.3", "°", F, FOUNDER_DOC, "Sous cette pente (35 %, soit 19,3°), pureau mini (nombre de tuiles maxi)."),
        zone_littorale: condition("3", "u", F, FOUNDER_DOC),
      },
      needs: [
        {
          id: "tuiles",
          slot: "tuile",
          formula: "surface / (tuile.largeur_utile * pureau)",
          unit: "u",
          core: true,
          exclusions: "Hors tuiles de rive, faîtières et accessoires (calculés à part).",
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "liteaux",
          slot: "liteau",
          formula: "surface / pureau",
          unit: "ml",
          precision: "lattage {surface|m2}, une file tous les {pureau|cm}",
          core: true,
          exclusions: "Hors doublage du liteau d'égout et liteaux de faîtage.",
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "contre-liteaux",
          slot: "contre_liteau",
          formula: "surface / entraxe_supports",
          unit: "ml",
          precision: "contre-lattage {surface|m2}, une file tous les {entraxe_supports|cm}",
          core: true,
          exclusions: "Une file par chevron ou fermette ; suppose un entraxe régulier sur toute la surface.",
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "ecran",
          slot: "ecran",
          formula: ECRAN_FORMULA,
          unit: "m2",
          core: true,
          exclusions: "Hors recouvrements en bout de rouleau (10 cm au droit d'un support), relevés et chutes.",
          // Les recouvrements viennent de Soprema ; la formule qui en tire la surface d'écran est une règle BatiClair.
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "tuiles-de-rive",
          slot: "rive",
          formula: "longueur_rives / pureau",
          unit: "u",
          core: true,
          requires: ["longueur_rives"],
          exclusions: "Une tuile de rive par rang, sur la longueur totale des rives du devis (gauche et droite) ; hors abouts.",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      id: "couverture-tuiles-canal",
      trade: "roofing",
      section: "principal",
      label: "Couverture en tuiles canal",
      triggers: ["roof_tile_canal"],
      params: [
        SURFACE_PARAM,
        {
          key: "recouvrement_canal",
          label: "Recouvrement des tuiles canal",
          unit: "mm",
          kind: "site_data",
          question: "Recouvrement des tuiles canal ?",
          hint: "Il dépend de la pente et de la zone (DTU 40.22) ; sans effet pour une tuile à blocage (150 mm fixe).",
          textLabels: ["recouvrement"],
          choices: [
            { label: "140 mm", value: "140" },
            { label: "150 mm", value: "150" },
            { label: "160 mm", value: "160" },
            { label: "170 mm", value: "170" },
          ],
        },
        { key: "longueur_rives", label: "Longueur de rives", unit: "m", kind: "site_data", question: "Longueur totale des rives ?", fromLineQuantity: true, forSlots: ["rive"] },
      ],
      slots: [
        { key: "tuile", family: "roof_tile_canal", label: "Tuiles canal" },
        { key: "liteau", family: "batten", label: "Liteaux", keywords: ["lattage", "liteau", "latte", "liteaunage"], usual: USUAL_LITEAU_TUILE },
        { key: "rive", family: "verge_tile", label: "Bardelis (rives)", keywords: ["rive", "bardelis"], usual: { text: "Bardelis du modèle de tuile, 2,7 au ml (Edilians, §35.3).", source: F, productId: "bardelis-standard" } },
      ],
      constants: {
        couvert_et_courant: condition("2", "u", "edilians-canal", FOUNDER_DOC, "« multiplier par 2 pour couvert + courant » (règle Edilians, §35.3)."),
        r150: condition("150", "mm", "edilians-canal", FOUNDER_DOC),
        r160: condition("160", "mm", "edilians-canal", FOUNDER_DOC),
        r170: condition("170", "mm", "edilians-canal", FOUNDER_DOC),
        bardelis_par_ml: condition("2.7", "u/m", "edilians-canal", FOUNDER_DOC, "« bardelis S 2,7/ml » (§35.3)."),
      },
      needs: [
        {
          id: "tuiles-canal",
          slot: "tuile",
          formula: "surface * regle.couvert_et_courant * si(recouvrement_canal >= regle.r170, tuile.nb_r170, si(recouvrement_canal >= regle.r160, tuile.nb_r160, si(recouvrement_canal >= regle.r150, tuile.nb_r150, tuile.nb_r140)))",
          unit: "u",
          core: true,
          exclusions: "Couvert et courant ; hors faîtières, bardelis de rive et tuiles d'égout (comptés à part).",
          source: "edilians-canal",
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "liteaux-canal",
          slot: "liteau",
          formula: "surface * si(recouvrement_canal >= regle.r170, tuile.lit_r170, si(recouvrement_canal >= regle.r160, tuile.lit_r160, si(recouvrement_canal >= regle.r150, tuile.lit_r150, tuile.lit_r140)))",
          unit: "ml",
          core: false,
          exclusions: "Pose sur liteaux seulement (la tuile canal se pose aussi sur plaques support) ; hors liteau d'égout doublé.",
          source: "edilians-canal",
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "bardelis",
          slot: "rive",
          formula: "longueur_rives * regle.bardelis_par_ml",
          unit: "u",
          core: true,
          requires: ["longueur_rives"],
          exclusions: "Rives gauche et droite du devis ; mortier de scellement à part.",
          source: "edilians-canal",
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      id: "couverture-ardoises-crochet",
      trade: "roofing",
      section: "principal",
      label: "Couverture en ardoises au crochet",
      triggers: ["roof_slate"],
      params: [
        SURFACE_PARAM,
        {
          key: "pureau",
          label: "Pureau",
          unit: "cm",
          kind: "site_data",
          question: "À quel pureau posez-vous ces ardoises ?",
          hint: "Il change le nombre d'ardoises, de crochets et de liteaux.",
          textLabels: ["pureau"],
          // Pose au crochet, double recouvrement : pureau = (hauteur − recouvrement) / 2 (référentiel du fondateur). Des crochets
          // écrits au devis disent le recouvrement de l'artisan : crochet − 1 cm (Cupa, §34), jamais contredits (D-2026-020).
          default: {
            formula: "(ardoise.longueur - recouvrement) / 2",
            whenGiven: { param: "longueur_crochet", formula: "(ardoise.longueur - (longueur_crochet - regle.marge_crochet)) / 2", note: "recouvrement des crochets du devis (crochet − 1 cm)" },
            source: F,
            verification: FOUNDER_DOC,
            version: 1,
            note: "(hauteur de l'ardoise − recouvrement) ÷ 2",
          },
        },
        {
          // Le comptoir sert un crochet à sa longueur : celle du devis s'il l'écrit, sinon recouvrement + 1 cm (Cupa, §34).
          key: "longueur_crochet",
          label: "Longueur de crochet",
          unit: "cm",
          kind: "site_data",
          question: "Quelle longueur de crochet ?",
          textLabels: ["crochet"],
          labelGap: 5,
          textRange: { min: "5", max: "20" },
          // « crochets de 11 » (devis D-2026-020) : la longueur en cm, comme au comptoir.
          bareNumber: true,
          default: {
            formula: "arrondi_sup((recouvrement_pose + regle.marge_crochet) / regle.pas_crochet) * regle.pas_crochet",
            source: "cupa-pureau-ardoises-m2",
            verification: FOUNDER_DOC,
            version: 1,
            note: "recouvrement + 1 cm (Cupa)",
          },
        },
        ENTRAXE_PARAM,
        PENTE_PARAM,
        REGION_ARDOISE_PARAM,
        DIAMETRE_CROCHET_PARAM,
        QUALITE_ARDOISE_PARAM,
        {
          key: "longueur_rampant",
          label: "Longueur du rampant",
          unit: "m",
          kind: "site_data",
          question: "Longueur du rampant (de l'égout au faîtage) ?",
          textLabels: ["rampant"],
          default: { value: "5.5", source: F, verification: FOUNDER_DOC, version: 1, note: "rampant courant, jusqu'à 5,5 m" },
          choices: [
            { label: "Jusqu'à 5,5 m", value: "5.5" },
            { label: "5,5 à 8 m", value: "8" },
            { label: "Plus de 8 m", value: "10" },
          ],
        },
      ],
      slots: [
        { key: "ardoise", family: "roof_slate", label: "Ardoises" },
        { key: "crochet", family: "slate_hook", label: "Crochets d'ardoise", keywords: ["crochet"], usual: { text: "Un crochet inox par ardoise.", source: F, productId: "crochet-ardoise-standard" } },
        {
          key: "liteau",
          family: "batten",
          label: "Liteaux",
          keywords: ["lattage", "liteau", "latte"],
          usual: { text: "Section 18×40 par défaut : le devis ne la précise pas (règle validée par le fondateur).", source: "fondateur-pratique-2026-10-02", productShort: "Liteaux 18×40", productId: "liteau-sapin-18x40" },
        },
        { key: "contre_liteau", family: "batten", label: "Contre-liteaux", keywords: ["contre lattage", "contre latte", "contre liteau"], usual: USUAL_CONTRE_LITEAU },
        { key: "ecran", family: "underlay", label: "Écran sous-toiture", usual: USUAL_ECRAN },
      ],
      constants: {
        ...ECRAN_CONSTANTS,
        seuil_rampant: condition("5.5", "m", F, FOUNDER_DOC, "Au-delà, +10 mm de recouvrement."),
        supplement_rampant: condition("10", "mm", F, FOUNDER_DOC),
        supplement_nul: condition("0", "mm", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (définition)" }),
        pas_recouvrement: condition("5", "mm", F, FOUNDER_DOC, "Recouvrement arrondi aux 5 mm supérieurs."),
        marge_crochet: condition("10", "mm", "cupa-pureau-ardoises-m2", FOUNDER_DOC, "« Longueur de crochet = R + 1 cm environ » (Cupa, §34)."),
        pas_crochet: condition("10", "mm", "cupa-pureau-ardoises-m2", FOUNDER_DOC, "Crochets vendus de centimètre en centimètre (R 100 → 11 cm, R 90 → 10)."),
      },
      points: { ardoises_m2: CUPA_ARDOISES_M2 },
      tables: {
        recouvrement: {
          label: "Recouvrement de l'ardoise",
          unit: "mm",
          axes: [
            { param: "pente", thresholds: ["25", "30", "35", "40", "45", "50"] },
            { param: "zone", thresholds: ["1", "2", "3"] },
          ],
          values: [
            ["110", "120", "130"],
            ["100", "110", "120"],
            ["90", "100", "110"],
            ["85", "90", "100"],
            ["80", "85", "95"],
            ["70", "80", "90"],
          ],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
          note: "Pose au crochet, rampant ≤ 5,5 m. Lignes 25°, 30°, 35°, 40°, 45°, ≥ 50° du référentiel (§3) ; la première ligne vaut dès la pente minimale de l'ardoise (24°, arrondie à 25°). Sous 25° : hors table, l'ouvrage n'est pas calculé.",
        },
      },
      derived: [
        {
          key: "recouvrement_pose",
          label: "Recouvrement posé",
          unit: "mm",
          // Pose au crochet, double recouvrement : pureau = (hauteur − recouvrement) / 2, donc recouvrement = hauteur − 2 × pureau.
          formula: "ardoise.longueur - 2 * pureau",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          key: "recouvrement",
          label: "Recouvrement",
          unit: "mm",
          formula: "arrondi_sup((table.recouvrement + si(longueur_rampant > regle.seuil_rampant, regle.supplement_rampant, regle.supplement_nul)) / regle.pas_recouvrement) * regle.pas_recouvrement",
          shown: true,
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
      needs: [
        {
          id: "ardoises",
          slot: "ardoise",
          // Table Cupa (§34) : elle fait foi ; la formule Cupa ne calcule que hors table.
          formula: "surface * points.ardoises_m2",
          unit: "u",
          core: true,
          exclusions: "Hors ardoises de rive, doublis à l'égout, coupes en noue et en arêtier (la perte de 5 % couvre casse et coupes de rive d'un pan simple).",
          // Le comptoir ne chiffre pas une ardoise sans sa qualité (§47.8) ; le format suit l'ardoise du devis.
          designation: "Ardoises naturelles {qualite_ardoise} {ardoise.longueur|cm#}×{ardoise.largeur|cm#}",
          // §49.3.4 : la phrase d'hypothèse, la marge du tiroir écrite (§49.2.4).
          precision: "{surface|m2} × {points.ardoises_m2|u/m2#} ardoises/m² (crochet {longueur_crochet|cm}, pente {pente|°}) + {marge} de marge",
          precisionRequires: ["qualite_ardoise"],
          source: "cupa-pureau-ardoises-m2",
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "crochets-ardoise",
          slot: "crochet",
          // « Commander crochets = ardoises × 1,02 » : les ardoises COMMANDÉES (après leur marge), puis +2 %.
          formula: "commande.ardoises",
          unit: "u",
          core: true,
          exclusions: "Un crochet par ardoise commandée, +2 % (référentiel du fondateur) : jamais moins de crochets que d'ardoises.",
          precision: "un par ardoise commandée, + 2 % de casse (référentiel : crochets = ardoises × 1,02)",
          // Le comptoir sert un crochet à sa longueur (Cupa, §34 : recouvrement + 1 cm) et à son diamètre.
          designation: "Crochets d'ardoise inox {diametre_crochet}, longueur {longueur_crochet|cm}",
          source: "baticlair-geometrie-ardoise",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "liteaux-ardoise",
          slot: "liteau",
          formula: "surface / pureau",
          unit: "ml",
          precision: "lattage {surface|m2}, une file tous les {pureau|cm}",
          core: true,
          exclusions: "Une file par rang ; hors doublis à l'égout et liteaux de faîtage.",
          source: "baticlair-geometrie-ardoise",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "contre-liteaux-ardoise",
          slot: "contre_liteau",
          formula: "surface / entraxe_supports",
          unit: "ml",
          precision: "contre-lattage {surface|m2}, une file tous les {entraxe_supports|cm}",
          core: true,
          exclusions: "Une file par chevron ; suppose un entraxe régulier.",
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "ecran-ardoise",
          slot: "ecran",
          formula: ECRAN_FORMULA,
          unit: "m2",
          core: true,
          exclusions: "Hors recouvrements en bout de rouleau, relevés et chutes.",
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
      ],
    },
    {
      // §4 : « Mêmes formules que l'ardoise naturelle, avec des formats et recouvrements propres » ; « clous = 2,1 ×
      // ardoises, antivents = 1,05 × ardoises ». Liteaux, contre-liteaux et écran : les règles de l'ardoise naturelle.
      id: "couverture-ardoises-fibres-ciment",
      trade: "roofing",
      section: "principal",
      label: "Couverture en ardoises fibres-ciment",
      triggers: ["roof_slate_fc"],
      params: [SURFACE_PARAM, TEINTE_FC_PARAM, ENTRAXE_PARAM, PENTE_PARAM],
      slots: [
        { key: "ardoise", family: "roof_slate_fc", label: "Ardoises fibres-ciment", ask: "Ardoises fibres-ciment : 40 × 24, 40 × 27, 60 × 30 ou 60 × 40 ?" },
        { key: "clou", family: "slate_nail", label: "Clous", usual: { text: "Deux clous inox par ardoise (§4).", source: F, productId: "clou-ardoise-fc" } },
        { key: "antivent", family: "slate_wind_hook", label: "Crochets d'antivent", keywords: ["antivent", "crochet"], usual: { text: "Un crochet d'antivent par ardoise (§4).", source: F, productId: "antivent-ardoise-fc" } },
        {
          key: "liteau",
          family: "batten",
          label: "Liteaux",
          keywords: ["lattage", "liteau", "latte"],
          usual: { text: "Section 18×40 par défaut, comme l'ardoise naturelle.", source: "fondateur-pratique-2026-10-02", productShort: "Liteaux 18×40", productId: "liteau-sapin-18x40" },
        },
        { key: "contre_liteau", family: "batten", label: "Contre-liteaux", keywords: ["contre lattage", "contre latte", "contre liteau"], usual: USUAL_CONTRE_LITEAU },
        { key: "ecran", family: "underlay", label: "Écran sous-toiture", usual: USUAL_ECRAN },
      ],
      constants: {
        ...ECRAN_CONSTANTS,
        clous_par_ardoise: condition("2.1", "u", F, FOUNDER_DOC, "« commander clous = 2,1 × ardoises » (§4)."),
        antivents_par_ardoise: condition("1.05", "u", F, FOUNDER_DOC, "« antivents = 1,05 × ardoises » (§4)."),
      },
      needs: [
        {
          id: "ardoises",
          slot: "ardoise",
          formula: "surface * ardoise.ardoises_par_m2",
          unit: "u",
          core: true,
          exclusions: "Recouvrement courant 100 mm ; hors rives, doublis et coupes de noue (la perte de 5 % couvre un pan simple).",
          designation: "Ardoises fibres-ciment {teinte_fc} {ardoise.longueur|cm#}×{ardoise.largeur|cm#}",
          precisionRequires: ["teinte_fc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        { id: "clous", slot: "clou", formula: "commande.ardoises * regle.clous_par_ardoise", unit: "u", core: true, exclusions: "Deux clous par ardoise commandée, + 5 %.", source: F, verification: FOUNDER_DOC, version: 1 },
        { id: "antivents", slot: "antivent", formula: "commande.ardoises * regle.antivents_par_ardoise", unit: "u", core: true, exclusions: "Un crochet d'antivent par ardoise commandée, + 5 %.", source: F, verification: FOUNDER_DOC, version: 1 },
        {
          id: "liteaux-ardoise",
          slot: "liteau",
          formula: "surface * ardoise.liteaux_par_m2",
          unit: "ml",
          precision: "lattage {surface|m2}",
          core: true,
          exclusions: "Une file par rang (§4) ; hors doublis à l'égout et liteaux de faîtage.",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "contre-liteaux-ardoise",
          slot: "contre_liteau",
          formula: "surface / entraxe_supports",
          unit: "ml",
          precision: "contre-lattage {surface|m2}, une file tous les {entraxe_supports|cm}",
          core: true,
          exclusions: "Une file par chevron ; suppose un entraxe régulier.",
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "ecran-ardoise",
          slot: "ecran",
          formula: ECRAN_FORMULA,
          unit: "m2",
          core: true,
          exclusions: "Hors recouvrements en bout de rouleau, relevés et chutes.",
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
      ],
    },
    {
      id: "faitage",
      trade: "roofing",
      label: "Faîtage (faîtières, closoir, abouts, fixations)",
      triggers: ["ridge_tile"],
      params: [{ key: "longueur_faitage", label: "Longueur du faîtage", unit: "m", kind: "site_data", question: "Longueur du faîtage ?", fromLineQuantity: true, textLabels: ["faitage"] }],
      slots: [
        { key: "faitiere", family: "ridge_tile", label: "Faîtières", usual: { text: "Faîtière courante (40 à 42 cm) : le modèle suit la tuile ou l'ardoise posée.", source: F, productId: "faitiere-standard" } },
        { key: "closoir", family: "ridge_closure", label: "Closoir", usual: { text: "Closoir ventilé en rouleau de 5 m.", source: F, productId: "closoir-standard-5m" } },
        { key: "fixation_faitiere", family: "ridge_fixing", label: "Crochets de faîtière", keywords: ["fixation", "crochet"], usual: { text: "Faîtage à sec : un crochet par faîtière.", source: F, productId: "crochet-faitiere-standard" } },
        { key: "about", family: "ridge_end", label: "Abouts de faîtage", usual: { text: "Un about à chaque extrémité du faîtage.", source: F, productId: "about-faitage-standard" } },
      ],
      constants: {
        abouts_par_faitage: condition("2", "u", F, FOUNDER_DOC, "Deux extrémités libres par ligne de faîtage (une seule ligne supposée)."),
      },
      needs: [
        {
          id: "faitieres",
          slot: "faitiere",
          // Le ratio « pièces au mètre » du fabricant, appliqué à la longueur : c'est sa définition.
          formula: "longueur_faitage * faitiere.pieces_par_ml",
          unit: "u",
          core: true,
          exclusions: "Hors abouts (comptés à part) et rencontres d'arêtiers.",
          source: "definition",
          verification: { status: "verified", verifiedAt: "2026-10-01", verifiedBy: "BatiClair (définition d'un ratio au mètre)" },
          version: 1,
        },
        {
          id: "closoir",
          slot: "closoir",
          formula: "longueur_faitage",
          unit: "ml",
          core: true,
          exclusions: "Closoir sur toute la longueur du faîtage ; recouvrements selon le produit.",
          source: "baticlair-pratique-accessoires",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "crochets-faitiere",
          slot: "fixation_faitiere",
          formula: "longueur_faitage * faitiere.pieces_par_ml",
          unit: "u",
          core: true,
          exclusions: "Un crochet par faîtière (faîtage à sec).",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "abouts",
          slot: "about",
          formula: "regle.abouts_par_faitage",
          unit: "u",
          core: true,
          exclusions: "Deux abouts pour une ligne de faîtage ; un faîtage en plusieurs lignes en demande davantage.",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      id: "faitage-zinc",
      trade: "roofing",
      label: "Faîtage en bande zinc",
      triggers: ["zinc_ridge"],
      params: [
        { key: "longueur_faitage", label: "Longueur du faîtage", unit: "m", kind: "site_data", question: "Longueur du faîtage ?", fromLineQuantity: true, textLabels: ["faitage"] },
        DEVELOPPE_PARAM,
        // §48.6 : « tu le façonnes toi-même ? », pour le faîtage seul.
        { ...FACONNAGE_BANDES_PARAM, question: "Faîtage zinc : tu le façonnes toi-même ou tu le commandes façonné ?", hint: "Je façonne : feuilles de zinc 2 × 1 m, estimées d'après le développé. Commandé façonné : bandes de faîtage en longueurs de 3 m." },
        EPAISSEUR_ZINC_PARAM,
        ASPECT_ZINC_PARAM,
      ],
      slots: [
        { key: "bande", family: "zinc_ridge", label: "Faîtage zinc (bande)", usual: { text: "Bande zinc en longueurs de 3 m (développé 25 à 33 cm).", source: F, productId: "bande-faitage-zinc-standard" } },
        { key: "patte", family: "zinc_clip", label: "Pattes de fixation", keywords: ["patte"], usual: { text: "Trois pattes par mètre.", source: F, productId: "patte-zinc-standard" } },
        { key: "feuille", family: "zinc_sheet", label: "Feuilles zinc 2 × 1 m", usual: { text: "Feuilles de zinc naturel 2 × 1 m, façonnées sur place (§48.6).", source: F, productId: "feuille-zinc-2x1" }, formOf: "bande" },
      ],
      constants: { ...ZINC_PLAT_CONSTANTS, pattes_par_metre: condition("3", "u/m", F, FOUNDER_DOC) },
      needs: [
        {
          id: "bande-faitage-zinc",
          slot: "bande",
          when: "faconnage >= 2",
          formula: "longueur_faitage",
          unit: "ml",
          core: true,
          exclusions: "Recouvrements des longueurs couverts par la perte de 5 %.",
          precision: "{longueur_faitage|ml} de faîtage à couvrir",
          // Le comptoir sert une bande à un développé (§7 : « dév. 25 à 33 cm ») : il ne le devine pas.
          designation: "Faîtage {aspect_zinc} {epaisseur_zinc} mm, bande dév. {developpe|cm}",
          precisionRequires: ["developpe", "aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "feuilles-faitage-zinc",
          slot: "feuille",
          when: "faconnage < 2",
          formula: "arrondi_sup(longueur_faitage / (regle.longueur_feuille * max(1, arrondi_inf(regle.largeur_feuille / developpe))))",
          unit: "u",
          core: true,
          exclusions: "Zinc plat découpé dans des feuilles de 2 × 1 m (§48.6) ; chutes non réemployées.",
          precision: "pour {longueur_faitage|ml} de faîtage : estimation d'après un développé de {developpe|cm}, ajuste selon ton façonnage",
          estimate: "Estimation d'après le développé : ajuste selon ton façonnage",
          designation: "Feuilles {aspect_zinc} 2 × 1 m, {epaisseur_zinc} mm",
          precisionRequires: ["aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "pattes-faitage-zinc",
          slot: "patte",
          formula: "longueur_faitage * regle.pattes_par_metre",
          unit: "u",
          core: true,
          // §49.1 point 4 : « pattes si du zinc façonné est écrit », sur le « oui » consommables seulement.
          consumable: true,
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // §7 « Noue : ml noue × 1,05, dév. 50 à 66 cm » ; §25.2 noue préformée (longueur utile 1,85 m pour 2 m). Comme les
      // bandes : commandée façonnée en longueurs de 2 m, ou façonnée sur place (feuilles 2 × 1 m, bobineau au-delà de 6 ml).
      id: "noue",
      trade: "roofing",
      label: "Noue zinc (façonnée ou à façonner)",
      triggers: ["valley"],
      params: [
        { key: "longueur_noue", label: "Longueur de noue", unit: "m", kind: "site_data", question: "Longueur de noue ?", fromLineQuantity: true, textLabels: ["noue"] },
        DEVELOPPE_NOUE_PARAM,
        FACONNAGE_NOUE_PARAM,
        EPAISSEUR_ZINC_PARAM,
        ASPECT_ZINC_PARAM,
      ],
      slots: [
        { key: "noue", family: "valley", label: "Noues zinc façonnées", usual: { text: "Noue façonnée en longueurs de 2 m, recouvrement 15 cm (§25.2).", source: F, productId: "noue-zinc-faconnee" } },
        { key: "feuille", family: "zinc_sheet", label: "Feuilles zinc 2 × 1 m", usual: { text: "Feuilles de zinc naturel 2 × 1 m, façonnées sur place (§25.2).", source: F, productId: "feuille-zinc-2x1" }, formOf: "noue" },
        { key: "bobineau", family: "zinc_narrow_coil", label: "Bobineau zinc", usual: { text: "Bobineau de zinc au-delà de 6 ml (réponse du fondateur).", source: FR_REPLY, productId: "bobineau-zinc" }, formOf: "noue" },
      ],
      constants: {
        ...ZINC_PLAT_CONSTANTS,
        marge_noue: condition("1.05", "u", F, FOUNDER_DOC, "« ml noue × 1,05 » (§7)."),
        longueur_utile_noue: condition("1.85", "m", F, FOUNDER_DOC, "« recouvrement 150 mm entre éléments → longueur utile 1,85 m pour 2 m » (§25.2)."),
      },
      derived: [
        { key: "ml_zinc", label: "Longueur de zinc, marge comprise", unit: "m", formula: "longueur_noue * regle.marge_noue", shown: true, source: F, verification: FOUNDER_DOC, version: 1 },
        ...bobineauDerived("developpe_noue"),
      ],
      needs: [
        {
          id: "noues-faconnees",
          slot: "noue",
          when: "faconnage >= 2",
          formula: "arrondi_sup(longueur_noue / regle.longueur_utile_noue)",
          unit: "u",
          core: true,
          exclusions: "Longueurs de 2 m, recouvrement 15 cm entre éléments (§25.2).",
          precision: "{longueur_noue|ml} de noue à couvrir",
          designation: "Noues {aspect_zinc} {epaisseur_zinc} mm, dév. {developpe_noue|cm#}",
          precisionRequires: ["aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "feuilles-noue",
          slot: "feuille",
          when: "faconnage < 2",
          // §48.6 : feuilles 2 × 1 m (jamais de bobineau hors joint debout, terrasse, chéneaux), estimées d'après le développé.
          formula: "arrondi_sup(longueur_noue / (regle.longueur_feuille * max(1, arrondi_inf(regle.largeur_feuille / developpe_noue))))",
          unit: "u",
          core: true,
          exclusions: "Zinc plat, développé × longueur, découpé dans des feuilles de 2 × 1 m (§25.2).",
          precision: "pour {longueur_noue|ml} de noue : estimation d'après un développé de {developpe_noue|cm}, ajuste selon ton façonnage",
          estimate: "Estimation d'après le développé : ajuste selon ton façonnage",
          designation: "Feuilles {aspect_zinc} 2 × 1 m, {epaisseur_zinc} mm",
          precisionRequires: ["aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // §5 : arêtières (≈ 2,9 pièces/ml), un about par arêtier, closoir d'arêtier de 23 cm, un crochet par pièce à sec ;
      // §3 : en zinc, bande dév. 25 à 33 cm en longueurs de 3 m, ml × 1,05, pattes 3/ml.
      id: "aretier",
      trade: "roofing",
      label: "Arêtier (arêtières et closoir, ou bande zinc)",
      triggers: ["hip"],
      params: [
        { key: "longueur_aretier", label: "Longueur d'arêtier", unit: "m", kind: "site_data", question: "Longueur d'arêtier ?", fromLineQuantity: true, textLabels: ["aretier", "aretiers"] },
        ARETIER_PARAM,
        NB_ARETIERS_PARAM,
        DEVELOPPE_ARETIER_PARAM,
        EPAISSEUR_ZINC_PARAM,
        ASPECT_ZINC_PARAM,
      ],
      slots: [
        { key: "aretiere", family: "hip", label: "Arêtiers", usual: { text: "Arêtier courant (40 à 42 cm) : le modèle suit la tuile posée.", source: F, productId: "aretiere-standard" } },
        { key: "closoir", family: "hip_closure", label: "Closoir d'arêtier", usual: { text: "Closoir ventilé d'arêtier, 23 cm, rouleau de 5 m (§5).", source: F, productId: "closoir-aretier-5m" } },
        { key: "crochet", family: "hip_fixing", label: "Crochets d'arêtier", keywords: ["crochet"], usual: { text: "Pose à sec : un crochet par arêtier (§5).", source: F, productId: "crochet-aretier-standard" } },
        { key: "about", family: "hip_end", label: "Abouts d'arêtier", usual: { text: "Un about par arêtier (§5).", source: F, productId: "about-aretier-standard" } },
        { key: "bande", family: "hip_strip", label: "Arêtier zinc (bande)", usual: { text: "Bande zinc en longueurs de 3 m (développé 25 à 33 cm, §3).", source: F, productId: "bande-aretier-zinc-standard" } },
        { key: "patte", family: "zinc_clip", label: "Pattes de fixation", keywords: ["patte"], usual: { text: "Trois pattes par mètre (§3).", source: F, productId: "patte-zinc-standard" } },
      ],
      constants: { pattes_par_metre: condition("3", "u/m", F, FOUNDER_DOC, "« pattes de fixation 3/ml » (§3).") },
      needs: [
        {
          id: "aretieres",
          slot: "aretiere",
          when: "aretier_matiere < 2",
          formula: "longueur_aretier * aretiere.pieces_par_ml",
          unit: "u",
          core: true,
          exclusions: "Hors abouts (comptés à part) et rencontres avec le faîtage.",
          source: "definition",
          verification: { status: "verified", verifiedAt: "2026-10-01", verifiedBy: "BatiClair (définition d'un ratio au mètre)" },
          version: 1,
        },
        {
          id: "closoir-aretier",
          slot: "closoir",
          when: "aretier_matiere < 2",
          formula: "longueur_aretier",
          unit: "ml",
          core: true,
          exclusions: "Closoir sur toute la longueur de l'arêtier.",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "crochets-aretier",
          slot: "crochet",
          when: "aretier_matiere < 2",
          formula: "longueur_aretier * aretiere.pieces_par_ml",
          unit: "u",
          core: true,
          exclusions: "Un crochet par arêtier posé à sec.",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "abouts-aretier",
          slot: "about",
          when: "aretier_matiere < 2",
          formula: "nb_aretiers",
          unit: "u",
          core: true,
          exclusions: "Un about par arêtier (§5).",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "bande-aretier-zinc",
          slot: "bande",
          when: "aretier_matiere >= 2",
          formula: "longueur_aretier",
          unit: "ml",
          core: true,
          exclusions: "Recouvrements des longueurs couverts par la perte de 5 %.",
          precision: "{longueur_aretier|ml} d'arêtier à couvrir",
          designation: "Arêtier {aspect_zinc} {epaisseur_zinc} mm, bande dév. {developpe_aretier|cm#}",
          precisionRequires: ["developpe_aretier", "aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "pattes-aretier-zinc",
          slot: "patte",
          when: "aretier_matiere >= 2",
          formula: "longueur_aretier * regle.pattes_par_metre",
          unit: "u",
          core: true,
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // §11 : la fenêtre telle que le devis l'écrit (marque, taille), plus un raccord d'étanchéité par fenêtre, adapté à la
      // couverture (tuiles, ardoises, tuiles plates) et à la taille de la fenêtre.
      id: "fenetre-de-toit",
      trade: "roofing",
      label: "Fenêtre de toit (fenêtre et raccord d'étanchéité)",
      triggers: ["roof_window"],
      params: [
        { key: "nb_fenetres", label: "Nombre de fenêtres de toit", unit: "u", kind: "site_data", question: "Combien de fenêtres de toit ?", fromLineQuantity: true },
        RACCORD_COUVERTURE_PARAM,
        TAILLE_FENETRE_PARAM,
      ],
      slots: [
        { key: "fenetre", family: "roof_window", label: "Fenêtres de toit", measureOnly: true, orderedAsWritten: true },
        { key: "raccord", family: "roof_window_flashing", label: "Raccords d'étanchéité", usual: { text: "Un raccord par fenêtre, adapté à la couverture (§11).", source: F, productId: "raccord-fenetre-toit" } },
      ],
      constants: {},
      needs: [
        {
          id: "raccords",
          slot: "raccord",
          formula: "nb_fenetres",
          unit: "u",
          core: true,
          exclusions: "Un raccord par fenêtre ; fenêtres jumelées : un raccord combiné par groupe, à corriger d'un tap.",
          designation: "Raccords d'étanchéité {raccord_couverture}, {taille_fenetre}",
          precisionRequires: ["raccord_couverture"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      id: "bandes-zinc",
      trade: "roofing",
      label: "Bandes zinc (solin, rive, égout, ventilation, couvre-joint)",
      triggers: ["zinc_strip"],
      params: [
        { key: "longueur_bande", label: "Longueur de bande", unit: "m", kind: "site_data", question: "Longueur de bande zinc ?", fromLineQuantity: true },
        DEVELOPPE_PARAM,
        FACONNAGE_BANDES_PARAM,
        EPAISSEUR_ZINC_PARAM,
        ASPECT_ZINC_PARAM,
      ],
      slots: [
        { key: "bande", family: "zinc_strip", label: "Bandes zinc façonnées", usual: { text: "Bandes façonnées par le fournisseur, longueurs de 2 m (§36.4).", source: F, productId: "bande-zinc-faconnee-standard" } },
        { key: "feuille", family: "zinc_sheet", label: "Feuilles zinc 2 × 1 m", usual: { text: "Feuilles de zinc naturel 2 × 1 m, façonnées sur place (§25.2).", source: F, productId: "feuille-zinc-2x1" }, formOf: "bande" },
        { key: "bobineau", family: "zinc_narrow_coil", label: "Bobineau zinc", usual: { text: "Bobineau de zinc au-delà de 6 ml de bande (réponse du fondateur).", source: FR_REPLY, productId: "bobineau-zinc" }, formOf: "bande" },
        { key: "mastic", family: "sealant", label: "Silicone ou mastic", usual: { text: "Silicone neutre compatible zinc, 1 cartouche par 8 ml de joint (§25.6).", source: F, productId: "cartouche-silicone-zinc" } },
        { key: "vis", family: "strip_screw", label: "Vis de bandes", usual: { text: "Vis inox 4 × 40, 4 par mètre (§25.5).", source: F, productId: "vis-inox-4x40" } },
        { key: "mortier", family: "solin_mortar", label: "Mortier de solin", keywords: ["mortier"], usual: { text: "Ciment 35 kg + sable pour le solin (estimation du fondateur).", source: F, productId: "ciment-sable-solin" } },
      ],
      constants: {
        ...ZINC_PLAT_CONSTANTS,
        vis_par_ml: condition("4", "u/m", F, FOUNDER_DOC, "« Vis autoforeuses bandes de rive alu/zinc : 4/ml » (§25.5)."),
        // Retour du fondateur (2026-10-06) : « estimation indicative acceptable : 1 sac de ciment 35 kg + sable, à confirmer ».
        sac_ciment_solin: rule("1", "u", F, todo("Estimation indicative du fondateur, à confirmer sur chaque chantier."), "estimation {v} sac de ciment 35 kg + sable"),
      },
      derived: [
        POIDS_PLAT_DERIVED,
        { key: "ml_zinc", label: "Longueur de zinc, marge comprise", unit: "m", formula: "longueur_bande * regle.marge_bandes", shown: true, source: F, verification: FOUNDER_DOC, version: 1 },
        ...bobineauDerived("developpe"),
      ],
      needs: [
        {
          id: "bandes-faconnees",
          slot: "bande",
          when: "faconnage >= 2",
          formula: "arrondi_sup(ml_zinc / regle.longueur_utile)",
          unit: "u",
          core: true,
          exclusions: "Longueurs de 2 m, recouvrement 10 cm entre éléments ; fixations à part.",
          precision: "{longueur_bande|ml} à couvrir, développé {developpe|cm}",
          designation: "Bandes façonnées {aspect_zinc} {epaisseur_zinc} mm",
          // Une bande commandée façonnée se fabrique à son développé : le fournisseur ne peut pas le deviner.
          precisionRequires: ["developpe", "aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "feuilles-bandes",
          slot: "feuille",
          when: "faconnage < 2",
          // §48.6 : « 1 feuille 2 × 1 m, développé 25 cm → 4 bandes de 2 m = 8 m par feuille ; 8 m de porte-solin ⇒ 1 feuille ».
          formula: "arrondi_sup(longueur_bande / (regle.longueur_feuille * max(1, arrondi_inf(regle.largeur_feuille / developpe))))",
          unit: "u",
          core: true,
          exclusions: "Zinc plat, développé × longueur, découpé dans des feuilles de 2 × 1 m (§25.2) ; chutes non réemployées.",
          // §45.5 : une feuille dont on ne sait pas à quoi elle sert n'a rien à faire dans la liste.
          precision: "pour {longueur_bande|ml} de bande : estimation d'après un développé de {developpe|cm}, ajuste selon ton façonnage",
          estimate: "Estimation d'après le développé : ajuste selon ton façonnage",
          designation: "Feuilles {aspect_zinc} 2 × 1 m, {epaisseur_zinc} mm",
          precisionRequires: ["aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        // §45.8 : suggérés (« On ajoute ? »), jamais d'office : non « cœur » de l'ouvrage.
        {
          id: "mastic-bandes",
          slot: "mastic",
          formula: "longueur_bande",
          unit: "ml",
          core: false,
          exclusions: "Un joint sur toute la longueur des bandes (solins, couvertines) ; 1 cartouche par 8 ml.",
          precision: "pour {longueur_bande|ml} de joint",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "vis-bandes",
          slot: "vis",
          formula: "longueur_bande * regle.vis_par_ml",
          unit: "u",
          core: false,
          exclusions: "4 vis par mètre de bande (§25.5).",
          precision: "4 par mètre, {longueur_bande|ml} de bande",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        // Seulement quand le devis cite le mortier (non « cœur ») : la ligne sort orange, « Quantité à confirmer ».
        {
          id: "mortier-solin",
          slot: "mortier",
          formula: "regle.sac_ciment_solin",
          unit: "u",
          core: false,
          exclusions: "Mortier du solin cité au devis ; quantité estimée, pas calculée.",
          designation: "Ciment 35 kg + sable (mortier de solin)",
          precision: "pour le solin au mortier de ciment",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // §48.7 : la bande porte-solin peut être achetée toute prête ou façonnée : sa propre question « tu la façonnes ? »
      // (§48.6, pièce par pièce), jamais la réponse des bandes de rive. Son mortier, s'il est écrit, la suit (orange).
      id: "bande-porte-solin",
      trade: "roofing",
      label: "Bande porte-solin zinc",
      triggers: ["solin_support"],
      params: [
        { key: "longueur_bande", label: "Longueur de bande", unit: "m", kind: "site_data", question: "Longueur de bande porte-solin ?", fromLineQuantity: true },
        DEVELOPPE_PARAM,
        FACONNAGE_BANDES_PARAM,
        EPAISSEUR_ZINC_PARAM,
        ASPECT_ZINC_PARAM,
      ],
      slots: [
        { key: "porte_solin", family: "solin_support", label: "Bandes porte-solin", usual: { text: "Bande porte-solin, longueurs de 2 m (§7).", source: F, productId: "porte-solin-standard" } },
        { key: "feuille", family: "zinc_sheet", label: "Feuilles zinc 2 × 1 m", usual: { text: "Feuilles de zinc naturel 2 × 1 m, façonnées sur place (§25.2).", source: F, productId: "feuille-zinc-2x1" }, formOf: "porte_solin" },
        { key: "mortier", family: "solin_mortar", label: "Mortier de solin", keywords: ["mortier"], usual: { text: "Ciment 35 kg + sable pour le solin (estimation du fondateur).", source: F, productId: "ciment-sable-solin" } },
        { key: "mastic", family: "sealant", label: "Silicone ou mastic", usual: { text: "Silicone neutre compatible zinc, 1 cartouche par 8 ml de joint (§25.6).", source: F, productId: "cartouche-silicone-zinc" } },
      ],
      constants: {
        ...ZINC_PLAT_CONSTANTS,
        sac_ciment_solin: rule("1", "u", F, todo("Estimation indicative du fondateur, à confirmer sur chaque chantier."), "estimation {v} sac de ciment 35 kg + sable"),
      },
      derived: [{ key: "ml_zinc", label: "Longueur de zinc, marge comprise", unit: "m", formula: "longueur_bande * regle.marge_bandes", shown: true, source: F, verification: FOUNDER_DOC, version: 1 }],
      needs: [
        {
          id: "porte-solin-faconnees",
          slot: "porte_solin",
          when: "faconnage >= 2",
          formula: "arrondi_sup(ml_zinc / regle.longueur_utile)",
          unit: "u",
          core: true,
          exclusions: "Longueurs de 2 m, recouvrement 10 cm entre éléments.",
          precision: "{longueur_bande|ml} à couvrir, développé {developpe|cm}",
          designation: "Bandes porte-solin {aspect_zinc} {epaisseur_zinc} mm",
          precisionRequires: ["developpe", "aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "feuilles-porte-solin",
          slot: "feuille",
          when: "faconnage < 2",
          formula: "arrondi_sup(longueur_bande / (regle.longueur_feuille * max(1, arrondi_inf(regle.largeur_feuille / developpe))))",
          unit: "u",
          core: true,
          exclusions: "Zinc plat découpé dans des feuilles de 2 × 1 m (§48.6) ; chutes non réemployées.",
          precision: "pour {longueur_bande|ml} de porte-solin : estimation d'après un développé de {developpe|cm}, ajuste selon ton façonnage",
          estimate: "Estimation d'après le développé : ajuste selon ton façonnage",
          designation: "Feuilles {aspect_zinc} 2 × 1 m, {epaisseur_zinc} mm",
          precisionRequires: ["aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "mortier-porte-solin",
          slot: "mortier",
          formula: "regle.sac_ciment_solin",
          unit: "u",
          core: false,
          exclusions: "Mortier du solin cité au devis ; quantité estimée, pas calculée.",
          designation: "Ciment 35 kg + sable (mortier de solin)",
          precision: "pour le solin au mortier de ciment",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        // §49.1 point 4 : « silicone si des solins ou abergements sont écrits », seulement sur le « oui » consommables.
        {
          id: "mastic-porte-solin",
          slot: "mastic",
          formula: "longueur_bande",
          unit: "ml",
          core: false,
          consumable: true,
          consumableFor: "porte_solin",
          exclusions: "Un joint sur toute la longueur du porte-solin ; 1 cartouche par 8 ml (§25.6).",
          precision: "pour {longueur_bande|ml} de joint de solin",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // §12 : « Bavettes et solins plomb : ml × 1,1 » ; commandé en rouleaux (réponse du fondateur), largeur lue sinon
      // 30 cm, épaisseur 1,5 mm par défaut. La longueur du rouleau (§12 : « 3 à 6 m ») reste à confirmer.
      id: "bandes-plomb",
      trade: "roofing",
      label: "Bandes de plomb (rouleaux)",
      triggers: ["lead_strip"],
      params: [
        { key: "longueur_plomb", label: "Longueur de bande de plomb", unit: "m", kind: "site_data", question: "Longueur de bande de plomb ?", fromLineQuantity: true },
        LARGEUR_PLOMB_PARAM,
        EPAISSEUR_PLOMB_PARAM,
      ],
      slots: [{ key: "plomb", family: "lead_strip", label: "Plomb en rouleau", usual: { text: "Plomb laminé en rouleau (§12).", source: FR_REPLY_DESCENTES, productId: "plomb-rouleau" } }],
      constants: {
        marge_plomb: condition("1.1", "u", F, FOUNDER_DOC, "« ml × 1,1 » (§12)."),
        rouleau_plomb: rule("6", "m", F, todo("§12 : rouleaux de 3 à 6 m ; 6 m retenus, à confirmer."), "rouleau de plomb de {v}"),
      },
      needs: [
        {
          id: "rouleaux-plomb",
          slot: "plomb",
          formula: "arrondi_sup(longueur_plomb * regle.marge_plomb / regle.rouleau_plomb)",
          unit: "u",
          core: true,
          exclusions: "Bande à la longueur du devis, + 10 % de recouvrements et de façon.",
          designation: "Plomb laminé {epaisseur_plomb} mm, rouleau largeur {largeur_plomb|cm#} cm × 6 m",
          precision: "{longueur_plomb|ml} de bande",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // §12 : « Cuivre en bande (0,6 mm) : mêmes règles que le zinc (section 7) ». Commandé façonné : longueurs de 2 m ;
      // façonné sur place : feuilles 2 × 1 m jusqu'à 6 ml, bobine au mètre au-delà, à la largeur du cuivre qui contient
      // le développé (largeurs courantes 500, 600, 670 mm : à confirmer).
      id: "bandes-cuivre",
      trade: "roofing",
      label: "Bandes cuivre (façonnées, feuilles ou bobine)",
      triggers: ["copper_strip"],
      params: [
        { key: "longueur_bande", label: "Longueur de bande", unit: "m", kind: "site_data", question: "Longueur de bande cuivre ?", fromLineQuantity: true },
        DEVELOPPE_CUIVRE_PARAM,
        FACONNAGE_CUIVRE_PARAM,
        EPAISSEUR_CUIVRE_PARAM,
      ],
      slots: [
        { key: "bande", family: "copper_strip", label: "Bandes cuivre façonnées", usual: { text: "Bandes façonnées par le fournisseur, longueurs de 2 m (comme le zinc).", source: F, productId: "bande-cuivre-faconnee" } },
        { key: "feuille", family: "copper_sheet", label: "Feuilles cuivre 2 × 1 m", usual: { text: "Feuilles de cuivre 2 × 1 m, façonnées sur place.", source: F, productId: "feuille-cuivre-2x1" }, formOf: "bande" },
        { key: "bobine", family: "copper_coil", label: "Cuivre en bobine", usual: { text: "Cuivre en bobine au mètre au-delà de 6 ml.", source: FR_REPLY, productId: "bobine-cuivre" }, formOf: "bande" },
      ],
      constants: {
        marge_bandes: condition("1.1", "u", F, FOUNDER_DOC, "« ml × 1,1 » (§7, §12)."),
        longueur_utile: condition("1.9", "m", F, FOUNDER_DOC, "Bandes de 2 m, recouvrement 10 cm (comme le zinc, §36.4)."),
        surface_feuille: condition("2", "m2", F, FOUNDER_DOC, "Feuille de 2 × 1 m (comme le zinc, §25.2)."),
        seuil_bobine: condition("6", "m", FR_REPLY, FOUNDER_REPLY, "Au-delà de 6 ml : bobine au lieu de feuilles (comme le zinc)."),
        cuivre_500: rule("500", "mm", F, todo("Largeurs courantes du cuivre en bobine : 500, 600, 670 mm, à confirmer."), "bobine de cuivre de {v}"),
        cuivre_600: rule("600", "mm", F, todo("Largeurs courantes du cuivre en bobine : 500, 600, 670 mm, à confirmer."), "bobine de cuivre de {v}"),
        cuivre_670: rule("670", "mm", F, todo("Largeurs courantes du cuivre en bobine : 500, 600, 670 mm, à confirmer."), "bobine de cuivre de {v}"),
      },
      derived: [
        { key: "ml_cuivre", label: "Longueur de cuivre, marge comprise", unit: "m", formula: "longueur_bande * regle.marge_bandes", shown: true, source: F, verification: FOUNDER_DOC, version: 1 },
        {
          key: "largeur_bobine_cuivre",
          label: "Largeur de la bobine de cuivre",
          unit: "mm",
          formula: "si(developpe_cuivre <= regle.cuivre_500, regle.cuivre_500, si(developpe_cuivre <= regle.cuivre_600, regle.cuivre_600, regle.cuivre_670))",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
      needs: [
        {
          id: "bandes-cuivre-faconnees",
          slot: "bande",
          when: "faconnage >= 2",
          formula: "arrondi_sup(ml_cuivre / regle.longueur_utile)",
          unit: "u",
          core: true,
          exclusions: "Longueurs de 2 m, recouvrement 10 cm entre éléments.",
          precision: "{longueur_bande|ml} à couvrir, développé {developpe_cuivre|cm}",
          designation: "Bandes cuivre façonnées {epaisseur_cuivre} mm",
          precisionRequires: ["developpe_cuivre"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "feuilles-cuivre",
          slot: "feuille",
          when: "si(faconnage < 2, si(longueur_bande > regle.seuil_bobine, 0, 1), 0)",
          formula: "arrondi_sup(ml_cuivre * developpe_cuivre / regle.surface_feuille)",
          unit: "u",
          core: true,
          exclusions: "Cuivre plat, développé × longueur, découpé dans des feuilles de 2 × 1 m.",
          precision: "pour façonner {longueur_bande|ml} de bande, développé {developpe_cuivre|cm}",
          designation: "Feuilles cuivre 2 × 1 m, {epaisseur_cuivre} mm",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "bobine-cuivre",
          slot: "bobine",
          when: "si(faconnage < 2, si(longueur_bande > regle.seuil_bobine, 1, 0), 0)",
          formula: "ml_cuivre",
          unit: "m",
          core: true,
          exclusions: "La plus petite largeur qui contient le développé ; la longueur de bande, marge comprise.",
          precision: "pour façonner {longueur_bande|ml} de bande",
          designation: "Cuivre en bobine largeur {largeur_bobine_cuivre|mm#} mm, {epaisseur_cuivre} mm",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      id: "abergement-cheminee",
      trade: "roofing",
      label: "Abergement de cheminée (zinc + porte-solin)",
      triggers: ["chimney_flashing"],
      params: [
        { key: "nb_cheminees", label: "Nombre de cheminées", unit: "u", kind: "site_data", question: "Combien de cheminées ?", fromLineQuantity: true, textLabels: ["cheminee"] },
        {
          key: "perimetre_cheminee",
          label: "Périmètre d'une cheminée",
          unit: "m",
          kind: "site_data",
          question: "Périmètre d'une cheminée (les 4 côtés) ?",
          textLabels: ["perimetre", "perimetre de cheminee"],
          choices: [
            { label: "2 m", value: "2" },
            { label: "3 m", value: "3" },
            { label: "4 m", value: "4" },
            { label: "5 m", value: "5" },
          ],
        },
        FACONNAGE_BANDES_PARAM,
        EPAISSEUR_ZINC_PARAM,
        ASPECT_ZINC_PARAM,
      ],
      slots: [
        { key: "abergement", family: "chimney_flashing", label: "Abergement de cheminée", measureOnly: true },
        { key: "bande", family: "zinc_strip", label: "Bandes zinc façonnées (dév. 330 mm)", usual: { text: "Bandes façonnées par le fournisseur, longueurs de 2 m, développé 33 cm (§7).", source: F, productId: "bande-zinc-faconnee-standard" }, formOf: "abergement" },
        { key: "feuille", family: "zinc_sheet", label: "Feuilles zinc 2 × 1 m", usual: { text: "Feuilles de zinc naturel 2 × 1 m, façonnées sur place (§25.2).", source: F, productId: "feuille-zinc-2x1" }, formOf: "abergement" },
        { key: "bobineau", family: "zinc_narrow_coil", label: "Bobineau zinc", usual: { text: "Bobineau de zinc au-delà de 6 ml de zinc (réponse du fondateur).", source: FR_REPLY, productId: "bobineau-zinc" }, formOf: "abergement" },
        { key: "porte_solin", family: "solin_support", label: "Bandes porte-solin", keywords: ["solin", "porte-solin"], usual: { text: "Bande porte-solin au périmètre, longueurs de 2 m (§7).", source: F, productId: "porte-solin-standard" }, formOf: "abergement" },
      ],
      constants: {
        ...ZINC_PLAT_CONSTANTS,
        coef_abergement: condition("1.3", "u", F, FOUNDER_DOC, "« périmètre cheminée × 1,3 en ml de zinc » (§7)."),
        developpe_abergement: condition("330", "mm", F, FOUNDER_DOC, "« dév. 33 à 40 cm » (§7) : 33 cm retenu."),
      },
      derived: [
        POIDS_PLAT_DERIVED,
        { key: "ml_zinc", label: "Longueur de zinc façonné", unit: "m", formula: "nb_cheminees * perimetre_cheminee * regle.coef_abergement", shown: true, source: F, verification: FOUNDER_DOC, version: 1 },
        { key: "ml_solin", label: "Longueur de solin", unit: "m", formula: "nb_cheminees * perimetre_cheminee", shown: true, source: F, verification: FOUNDER_DOC, version: 1 },
        ...bobineauDerived("regle.developpe_abergement"),
      ],
      needs: [
        {
          id: "bandes-abergement",
          slot: "bande",
          when: "faconnage >= 2",
          formula: "arrondi_sup(ml_zinc / regle.longueur_utile)",
          unit: "u",
          core: true,
          exclusions: "Quatre côtés, développé 33 cm ; longueurs de 2 m, recouvrement 10 cm.",
          designation: "Bandes façonnées {aspect_zinc} {epaisseur_zinc} mm, dév. 33 cm",
          precisionRequires: ["aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "feuilles-abergement",
          slot: "feuille",
          when: "faconnage < 2",
          formula: "arrondi_sup(ml_zinc / (regle.longueur_feuille * max(1, arrondi_inf(regle.largeur_feuille / regle.developpe_abergement))))",
          unit: "u",
          core: true,
          exclusions: "Zinc plat, développé 33 cm × longueur, découpé dans des feuilles de 2 × 1 m (§25.2).",
          precision: "pour façonner l'abergement de cheminée, développé 33 cm",
          designation: "Feuilles {aspect_zinc} 2 × 1 m, {epaisseur_zinc} mm",
          precisionRequires: ["aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "porte-solin-abergement",
          slot: "porte_solin",
          formula: "arrondi_sup(ml_solin / regle.longueur_utile)",
          unit: "u",
          core: true,
          exclusions: "Bande porte-solin au périmètre ; vis et chevilles à part (3 par ml, §7).",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // Réponse du fondateur (2026-10-04) : « une embase par sortie, adaptée à la couverture (embase plomb pour ardoise et
      // tuile, platine zinc soudée pour zinc), au diamètre du conduit, plus un chapeau. Collerette d'étanchéité seulement
      // pour un conduit de fumée (solin). Question à boutons Ø 80 / 100 / 125 / 150 / 180 ou VMC, plus fumée / ventilation. »
      id: "sortie-de-toit",
      trade: "roofing",
      section: "singulier",
      label: "Sortie de toit",
      triggers: ["roof_outlet"],
      params: [
        { key: "nb_sorties", label: "Nombre de sorties de toit", unit: "u", kind: "site_data", question: "Combien de sorties de toit ?", fromLineQuantity: true },
        {
          key: "diametre_sortie",
          label: "Diamètre du conduit",
          unit: "mm",
          kind: "site_data",
          question: "Sortie de toit : quel diamètre ?",
          hint: "Le fournisseur en a besoin pour chiffrer la bonne embase et le bon chapeau.",
          textLabels: ["diametre", "diam", "ø"],
          textValues: [{ value: "0", keywords: ["vmc"] }],
          choices: [
            { label: "Ø 80", value: "80" },
            { label: "Ø 100", value: "100" },
            { label: "Ø 125", value: "125" },
            { label: "Ø 150", value: "150" },
            { label: "Ø 180", value: "180" },
            { label: "VMC", value: "0" },
          ],
          display: { "80": "Ø 80", "100": "Ø 100", "125": "Ø 125", "150": "Ø 150", "180": "Ø 180", "0": "VMC" },
        },
        {
          key: "usage_sortie",
          label: "Usage du conduit",
          unit: "u",
          kind: "site_data",
          question: "Sortie de toit : conduit de fumée ou ventilation ?",
          hint: "Un conduit de fumée demande une collerette d'étanchéité (solin).",
          textValues: [
            { value: "1", keywords: ["fumee", "conduit de fumee", "poele", "insert", "chaudiere"] },
            { value: "2", keywords: ["ventilation", "extraction", "aeration"] },
          ],
          choices: [
            { label: "Conduit de fumée", value: "1" },
            { label: "Ventilation", value: "2" },
          ],
          display: { "1": "conduit de fumée", "2": "ventilation" },
        },
        {
          key: "support_sortie",
          label: "Couverture autour de la sortie",
          unit: "u",
          kind: "site_data",
          question: "Sortie de toit : sur quelle couverture ?",
          textValues: [
            { value: "1", keywords: ["ardoise", "ardoises", "tuile", "tuiles"] },
            { value: "2", keywords: ["zinc"] },
          ],
          fromWorks: [
            { value: "2", workItems: ["couverture-zinc-joint-debout"] },
            { value: "1", workItems: ["couverture-tuiles-emboitement", "couverture-tuiles-canal", "couverture-ardoises-crochet"] },
          ],
          choices: [
            { label: "Ardoise ou tuile", value: "1" },
            { label: "Zinc", value: "2" },
          ],
          display: { "1": "ardoise ou tuile", "2": "zinc" },
        },
      ],
      slots: [
        { key: "sortie", family: "roof_outlet", label: "Sortie de toit", measureOnly: true },
        { key: "embase", family: "outlet_base", label: "Embase plomb", usual: { text: "Embase plomb au diamètre du conduit, pour ardoise et tuile.", source: FR_REPLY, productId: "embase-plomb-sortie" }, formOf: "sortie" },
        { key: "platine", family: "outlet_plate", label: "Platine zinc soudée", usual: { text: "Platine zinc soudée au diamètre du conduit, pour couverture zinc.", source: FR_REPLY, productId: "platine-zinc-sortie" }, formOf: "sortie" },
        { key: "chapeau", family: "outlet_cap", label: "Chapeau", usual: { text: "Un chapeau par sortie, au diamètre du conduit.", source: FR_REPLY, productId: "chapeau-sortie" }, formOf: "sortie" },
        { key: "collerette", family: "outlet_collar", label: "Collerette d'étanchéité", usual: { text: "Collerette d'étanchéité (solin), seulement pour un conduit de fumée.", source: FR_REPLY, productId: "collerette-sortie" }, formOf: "sortie" },
      ],
      constants: {
        // « VMC » se répond 0 mm : une sortie VMC n'a pas de collerette.
        vmc: condition("0", "mm", "definition", { status: "verified", verifiedAt: "2026-10-04", verifiedBy: "BatiClair (définition)" }),
      },
      needs: [
        {
          id: "embase-sortie",
          slot: "embase",
          when: "support_sortie < 2",
          formula: "nb_sorties",
          unit: "u",
          core: true,
          exclusions: "Une embase par sortie, au diamètre du conduit.",
          precision: "{diametre_sortie}, pour ardoise ou tuile",
          precisionRequires: ["diametre_sortie"],
          source: FR_REPLY,
          verification: FOUNDER_REPLY,
          version: 1,
        },
        {
          id: "platine-sortie",
          slot: "platine",
          when: "support_sortie >= 2",
          formula: "nb_sorties",
          unit: "u",
          core: true,
          exclusions: "Une platine zinc soudée par sortie, au diamètre du conduit.",
          precision: "{diametre_sortie}, soudée sur la couverture zinc",
          precisionRequires: ["diametre_sortie"],
          source: FR_REPLY,
          verification: FOUNDER_REPLY,
          version: 1,
        },
        {
          id: "chapeau-sortie",
          slot: "chapeau",
          formula: "nb_sorties",
          unit: "u",
          core: true,
          exclusions: "Un chapeau par sortie.",
          precision: "{diametre_sortie}",
          precisionRequires: ["diametre_sortie"],
          source: FR_REPLY,
          verification: FOUNDER_REPLY,
          version: 1,
        },
        {
          id: "collerette-sortie",
          slot: "collerette",
          // Seulement pour un conduit de fumée ; une sortie VMC n'en a pas.
          when: "si(diametre_sortie > regle.vmc, si(usage_sortie < 2, 1, 0), 0)",
          formula: "nb_sorties",
          unit: "u",
          core: true,
          exclusions: "Une collerette par conduit de fumée ; aucune pour une ventilation.",
          precision: "{diametre_sortie}, solin du conduit de fumée",
          precisionRequires: ["diametre_sortie"],
          source: FR_REPLY,
          verification: FOUNDER_REPLY,
          version: 1,
        },
      ],
    },
    {
      id: "couverture-zinc-joint-debout",
      trade: "roofing",
      section: "principal",
      label: "Couverture zinc à joint debout",
      triggers: ["standing_seam"],
      params: [SURFACE_PARAM, FACONNAGE_PARAM, EPAISSEUR_ZINC_PARAM, ASPECT_ZINC_PARAM, RAMPANT_PARAM, BACS_LONGS_PARAM, ZONE_PARAM],
      slots: [
        { key: "couverture", family: "standing_seam", label: "Couverture zinc joint debout", measureOnly: true },
        { key: "bobine", family: "zinc_coil", label: "Zinc en bobine", keywords: ["bobine"], usual: { text: "Zinc en bobine largeur 650 mm (naturel ou prépatiné selon le devis), commandé au mètre linéaire.", source: "vmzinc-joint-debout", productId: "bobine-zinc-standard" }, formOf: "couverture" },
        { key: "bobine_littoral", family: "zinc_coil", label: "Zinc en bobine (bord de mer)", keywords: ["bord de mer", "littoral"], usual: { text: "Bord de mer : zinc en bobine largeur 500 mm, commandé au mètre linéaire (VMZINC).", source: "vmzinc-joint-debout", productId: "bobine-zinc-500" }, formOf: "couverture" },
        { key: "bac", family: "zinc_panel", label: "Bacs joint debout", usual: { text: "Bacs façonnés par le fournisseur à la longueur du rampant.", source: F, productId: "bac-joint-debout-standard" }, formOf: "couverture" },
        // §45.5 : pattes coulissantes, pattes fixes et pointes sont trois lignes (le fournisseur les sert séparément).
        { key: "patte_coulissante", family: "seam_clip_sliding", label: "Pattes coulissantes", keywords: ["coulissante", "coulissantes"], usual: { text: "Pattes coulissantes, selon le rampant (VMZINC 36.2).", source: "vmzinc-joint-debout", productId: "patte-coulissante-joint-debout" } },
        { key: "patte_fixe", family: "seam_clip_fixed", label: "Pattes fixes", keywords: ["patte fixe", "pattes fixes"], usual: { text: "Pattes fixes, selon le rampant (VMZINC 36.2).", source: "vmzinc-joint-debout", productId: "patte-fixe-joint-debout" } },
        { key: "fixation_patte", family: "clip_fixing", label: "Fixations des pattes", keywords: ["pointe", "pointes"], usual: { text: "Pointes annelées 2,5 × 28 mm sur volige 18 mm, 2 par patte (VMZINC 36.2).", source: "vmzinc-joint-debout", productId: "pointe-annelee-2-5x28" } },
        { key: "egout", family: "eaves_strip", label: "Bandes d'égout", keywords: ["egout"], usual: { text: "Bande d'égout à ourlet, développé 33 cm, longueurs de 2 m (§7).", source: F, productId: "bande-egout-zinc-330" } },
        { key: "faitage", family: "zinc_ridge", label: "Faîtage zinc", usual: { text: "Bande de faîtage zinc en longueurs de 3 m (§7).", source: F, productId: "bande-faitage-zinc-standard" } },
        { key: "volige", family: "sheathing", label: "Voliges", keywords: ["volige"], usual: { text: "Volige sapin 18 mm sous le zinc (§7).", source: F, productId: "volige-sapin-standard" } },
      ],
      constants: {
        zone_littorale: condition("3", "u", F, FOUNDER_DOC),
        largeur_courante: condition("650", "mm", "vmzinc-joint-debout", FOUNDER_DOC, "Bobine 650 → entraxe des joints 580 mm."),
        largeur_littoral: condition("500", "mm", "vmzinc-joint-debout", FOUNDER_DOC, "Bobine 500 → entraxe 430 mm, imposée en zone de vent 3 exposé et 4 : tout le littoral breton."),
        entraxe_courant: condition("580", "mm", "vmzinc-joint-debout", FOUNDER_DOC),
        entraxe_littoral: condition("430", "mm", "vmzinc-joint-debout", FOUNDER_DOC),
        poids_065: condition("5.5", "kg/m2", "vmzinc-joint-debout", FOUNDER_DOC, "Zinc posé, joints compris, 0,65 mm."),
        poids_070: condition("6", "kg/m2", "vmzinc-joint-debout", FOUNDER_DOC),
        poids_080: condition("7", "kg/m2", "vmzinc-joint-debout", FOUNDER_DOC),
        seuil_070: condition("0.7", "mm", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (définition)" }),
        seuil_080: condition("0.8", "mm", "definition", { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "BatiClair (définition)" }),
        rampant_max_bac: condition("10", "m", F, FOUNDER_DOC, "« bacs profilés à longueur (max 10 à 15 m) » (§7) : 10 m retenu."),
        surlongueur_bac: condition("0.15", "m", F, { status: "verified", verifiedAt: "2026-10-04", verifiedBy: "Fondateur (couvreur)" }, "« 15 cm par bac (10 en égout, 5 en faîtage), ajoutés au rampant avant de multiplier par le nombre de bacs » (réponse du fondateur, 2026-10-04)."),
        fixations_par_patte: condition("2", "u", "vmzinc-joint-debout", FOUNDER_DOC, "« 2 fixations par patte » (§36.2)."),
        coef_egout_faitage: condition("1.05", "u", F, FOUNDER_DOC, "« ml égout × 1,05 », « ml faîtage × 1,05 » (§7)."),
        longueur_utile_bande: condition("1.9", "m", F, FOUNDER_DOC, "Bandes de 2 m, recouvrement 10 cm (§25.2)."),
      },
      tables: {
        // VMZINC 36.2 : pattes coulissantes et fixes par m², selon le rampant (lignes 0,5-1,5 … 13-15 m), comptées à part (§45.5).
        coulissantes_500: {
          label: "Pattes coulissantes par m² (bobine 500)",
          unit: "u/m2",
          axes: [{ param: "longueur_rampant", thresholds: ["0", "1.5", "2", "3.5", "5.5", "7.5", "10.5", "13"] }],
          values: [["7.1"], ["6.3"], ["4.7"], ["5.2"], ["5.7"], ["6.1"], ["6.4"], ["6.8"]],
          source: "vmzinc-joint-debout",
          verification: FOUNDER_DOC,
          version: 1,
        },
        fixes_500: {
          label: "Pattes fixes par m² (bobine 500)",
          unit: "u/m2",
          axes: [{ param: "longueur_rampant", thresholds: ["0", "1.5", "2", "3.5", "5.5", "7.5", "10.5", "13"] }],
          values: [["2.4"], ["3.2"], ["3.7"], ["2.9"], ["1.9"], ["1.5"], ["1"], ["0.9"]],
          source: "vmzinc-joint-debout",
          verification: FOUNDER_DOC,
          version: 1,
        },
        coulissantes_650: {
          label: "Pattes coulissantes par m² (bobine 650)",
          unit: "u/m2",
          axes: [{ param: "longueur_rampant", thresholds: ["0", "1.5", "2", "3.5", "5.5", "7.5", "10.5", "13"] }],
          values: [["5.2"], ["4.7"], ["3.5"], ["3.8"], ["4.2"], ["4.5"], ["4.7"], ["5.1"]],
          source: "vmzinc-joint-debout",
          verification: FOUNDER_DOC,
          version: 1,
        },
        fixes_650: {
          label: "Pattes fixes par m² (bobine 650)",
          unit: "u/m2",
          axes: [{ param: "longueur_rampant", thresholds: ["0", "1.5", "2", "3.5", "5.5", "7.5", "10.5", "13"] }],
          values: [["1.8"], ["2.3"], ["2.9"], ["2.2"], ["1.4"], ["1.1"], ["0.8"], ["0.7"]],
          source: "vmzinc-joint-debout",
          verification: FOUNDER_DOC,
          version: 1,
        },
      },
      derived: [
        { key: "largeur_bobine", label: "Largeur de bobine", unit: "mm", formula: "si(zone >= regle.zone_littorale, regle.largeur_littoral, regle.largeur_courante)", shown: true, source: "vmzinc-joint-debout", verification: FOUNDER_DOC, version: 1 },
        { key: "entraxe_joints", label: "Largeur utile du bac (entraxe des joints)", unit: "mm", formula: "si(zone >= regle.zone_littorale, regle.entraxe_littoral, regle.entraxe_courant)", shown: true, source: "vmzinc-joint-debout", verification: FOUNDER_DOC, version: 1 },
        { key: "poids_zinc", label: "Poids du zinc posé", unit: "kg/m2", formula: "si(epaisseur_zinc >= regle.seuil_080, regle.poids_080, si(epaisseur_zinc >= regle.seuil_070, regle.poids_070, regle.poids_065))", shown: true, source: "vmzinc-joint-debout", verification: FOUNDER_DOC, version: 1 },
        { key: "largeur_pan", label: "Largeur du pan", unit: "m", formula: "surface / longueur_rampant", shown: true, source: F, verification: FOUNDER_DOC, version: 1 },
        { key: "nb_bacs", label: "Nombre de bacs", unit: "u", formula: "arrondi_sup(largeur_pan / entraxe_joints)", source: "vmzinc-joint-debout", verification: FOUNDER_DOC, version: 1 },
        { key: "longueur_bac", label: "Longueur de bobine par bac", unit: "m", formula: "longueur_rampant + regle.surlongueur_bac", source: F, verification: FOUNDER_REPLY, version: 1 },
        { key: "coulissantes_m2", label: "Pattes coulissantes par m²", unit: "u/m2", formula: "si(largeur_bobine <= regle.largeur_littoral, table.coulissantes_500, table.coulissantes_650)", source: "vmzinc-joint-debout", verification: FOUNDER_DOC, version: 1 },
        { key: "fixes_m2", label: "Pattes fixes par m²", unit: "u/m2", formula: "si(largeur_bobine <= regle.largeur_littoral, table.fixes_500, table.fixes_650)", source: "vmzinc-joint-debout", verification: FOUNDER_DOC, version: 1 },
      ],
      needs: [
        {
          id: "zinc-bobines",
          slot: "bobine",
          // Je façonne ; ou bien je commande façonné mais le rampant dépasse 10 m et je profile la bobine sur place.
          when: "si(zone >= regle.zone_littorale, 0, si(faconnage < 2, 1, si(longueur_rampant > regle.rampant_max_bac, si(bacs_longs < 2, 1, 0), 0)))",
          // Une bande de bobine par bac : nombre de bacs (largeur du pan ÷ largeur utile) × (rampant + 15 cm de surlongueur).
          // L'épaisseur ne change pas la longueur mais l'article : le facteur 1 la garde dans le calcul, donc dite
          // (hypothèse modifiable) et transmise au fournisseur dans « Le chantier en bref ».
          formula: "nb_bacs * longueur_bac * si(epaisseur_zinc >= regle.seuil_070, 1, 1)",
          unit: "m",
          core: true,
          exclusions: "Une longueur de rampant par bac plus 15 cm de surlongueur (10 en égout, 5 en faîtage) ; hors bandes d'égout, de rive, de faîtage et de noue, comptées à part.",
          // Ce qui se calcule en longueurs dit d'où vient la longueur (retour du fondateur, 2026-10-04).
          precision: "{nb_bacs} bacs × {longueur_bac|m}",
          // Comme au comptoir : « Bobine Quartz-Zinc 0,65 mm, largeur 500 mm » (aspect lu au devis, épaisseur, largeur).
          designation: "Bobine {aspect_zinc} {epaisseur_zinc} mm, largeur {largeur_bobine|mm}",
          precisionRequires: ["aspect_zinc"],
          source: "vmzinc-joint-debout",
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "zinc-bobines-littoral",
          slot: "bobine_littoral",
          // Je façonne ; ou bien je commande façonné mais le rampant dépasse 10 m et je profile la bobine sur place.
          when: "si(zone >= regle.zone_littorale, si(faconnage < 2, 1, si(longueur_rampant > regle.rampant_max_bac, si(bacs_longs < 2, 1, 0), 0)), 0)",
          // Une bande de bobine par bac : nombre de bacs (largeur du pan ÷ largeur utile) × (rampant + 15 cm de surlongueur).
          // L'épaisseur ne change pas la longueur mais l'article : le facteur 1 la garde dans le calcul, donc dite
          // (hypothèse modifiable) et transmise au fournisseur dans « Le chantier en bref ».
          formula: "nb_bacs * longueur_bac * si(epaisseur_zinc >= regle.seuil_070, 1, 1)",
          unit: "m",
          core: true,
          exclusions: "Une longueur de rampant par bac plus 15 cm de surlongueur (10 en égout, 5 en faîtage) ; hors bandes d'égout, de rive, de faîtage et de noue, comptées à part.",
          // Ce qui se calcule en longueurs dit d'où vient la longueur (retour du fondateur, 2026-10-04).
          precision: "{nb_bacs} bacs × {longueur_bac|m}",
          // Comme au comptoir : « Bobine Quartz-Zinc 0,65 mm, largeur 500 mm » (aspect lu au devis, épaisseur, largeur).
          designation: "Bobine {aspect_zinc} {epaisseur_zinc} mm, largeur {largeur_bobine|mm}",
          precisionRequires: ["aspect_zinc"],
          source: "vmzinc-joint-debout",
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "zinc-bacs",
          slot: "bac",
          // Commandé façonné ; au-delà de 10 m de rampant, seulement si l'artisan veut des bacs en plusieurs longueurs.
          when: "si(faconnage >= 2, si(longueur_rampant > regle.rampant_max_bac, si(bacs_longs >= 2, 1, 0), 1), 0)",
          formula: "arrondi_sup(largeur_pan / entraxe_joints) * si(longueur_rampant > regle.rampant_max_bac, arrondi_sup(longueur_rampant / regle.rampant_max_bac), 1)",
          unit: "u",
          core: true,
          exclusions: "Un pan rectangulaire ; chaque bac fait la longueur du rampant, ou 10 m au plus avec jonction transversale au-delà. Hors bandes d'égout, de rive, de faîtage et de noue.",
          designation: "Bacs joint debout {aspect_zinc} {epaisseur_zinc} mm",
          precisionRequires: ["aspect_zinc"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "pattes_coulissantes",
          slot: "patte_coulissante",
          formula: "surface * coulissantes_m2",
          unit: "u",
          core: true,
          exclusions: "Pattes classiques (VMZINC 36.2) ; les pattes monovis demandent moins.",
          precision: "pour bobine {largeur_bobine|mm}",
          source: "vmzinc-joint-debout",
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "pattes_fixes",
          slot: "patte_fixe",
          formula: "surface * fixes_m2",
          unit: "u",
          core: true,
          exclusions: "Pattes classiques (VMZINC 36.2) ; les pattes monovis demandent moins.",
          precision: "pour bobine {largeur_bobine|mm}, zone fixe de chaque bac",
          source: "vmzinc-joint-debout",
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "fixations-pattes-joint-debout",
          slot: "fixation_patte",
          formula: "(commande.pattes_coulissantes + commande.pattes_fixes) * regle.fixations_par_patte",
          unit: "u",
          core: true,
          exclusions: "Deux fixations par patte, à vérifier sur le modèle de patte (VMZINC 36.2) ; volige 18 mm.",
          precision: "2 par patte, sur volige 18 mm",
          source: "vmzinc-joint-debout",
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "egout-joint-debout",
          slot: "egout",
          // Règle du comptoir (§47.8) : « on les ajoute ? » n'est pas une question de vendeur. Proposé dans
          // « On ajoute ? » (§45.8), sauf si le devis cite déjà l'égout.
          formula: "arrondi_sup(largeur_pan * regle.coef_egout_faitage / regle.longueur_utile_bande)",
          unit: "u",
          core: false,
          offer: { unlessQuoteSays: ["egout"] },
          designation: "Bandes d'égout {aspect_zinc} {epaisseur_zinc} mm, dév. 33 cm",
          exclusions: "Égout sur toute la largeur du pan ; longueurs de 2 m, recouvrement 10 cm.",
          precision: "{largeur_pan|ml} d'égout à couvrir",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "faitage-joint-debout",
          slot: "faitage",
          // Comme l'égout : proposé dans « On ajoute ? », sauf si le devis cite déjà le faîtage. Développé 33 cm, le
          // haut de la fourchette du §7 (« dév. 25 à 33 cm »), comme la bande d'égout.
          core: false,
          offer: { unlessQuoteSays: ["faitage"] },
          designation: "Faîtage {aspect_zinc} {epaisseur_zinc} mm, bande dév. 33 cm",
          formula: "largeur_pan * regle.coef_egout_faitage",
          unit: "ml",
          exclusions: "Un faîtage de la largeur du pan (monopente, ou un seul pan) ; deux pans qui se rejoignent n'en font qu'un : corrige la quantité d'un tap.",
          precision: "{largeur_pan|ml} de faîtage à couvrir",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "voliges-joint-debout",
          slot: "volige",
          formula: "surface",
          unit: "m2",
          core: true,
          exclusions: "Support bois massif (§36.4) ; la marge de 5 % couvre les chutes. Pointes à part.",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // §8 : « nb = largeur pan / 1,00 arrondi sup. × nb de plaques par rampant ; longueur = rampant + 5 cm de débord » ;
      // la largeur des pans se déduit de la surface et du rampant. Vis 7/m² + 3/ml de rive ; closoirs 1 en bas et 1 en
      // haut par plaque ; faîtière « ml / 2 arrondi sup., +1 ».
      id: "couverture-bac-acier",
      trade: "roofing",
      section: "principal",
      label: "Couverture bac acier (plaques à longueur, vis, closoirs, faîtière)",
      triggers: ["steel_tray"],
      params: [SURFACE_PARAM, LONGUEUR_PLAQUES_PARAM, TYPE_BAC_PARAM, TEINTE_BAC_PARAM, FEUTRE_BAC_PARAM, PANS_BAC_PARAM],
      slots: [
        { key: "couverture", family: "steel_tray", label: "Bac acier", measureOnly: true },
        { key: "plaque", family: "steel_sheet", label: "Plaques bac acier", usual: { text: "Bac de largeur utile 1,00 m, une plaque par rampant (§8).", source: F, productId: "plaque-bac-acier" }, formOf: "couverture" },
        { key: "vis", family: "steel_screw", label: "Vis", usual: { text: "Vis autoperceuses avec rondelle EPDM (§8).", source: F, productId: "vis-bac-acier" } },
        { key: "closoir", family: "steel_closure", label: "Closoirs", usual: { text: "Closoirs mousse profilés, en bas et en haut de chaque plaque (§8).", source: F, productId: "closoir-bac-acier" } },
        { key: "faitiere", family: "steel_ridge", label: "Faîtières", usual: { text: "Faîtière de bac en longueurs de 2 m (§8).", source: F, productId: "faitiere-bac-acier" } },
      ],
      constants: {
        largeur_utile: condition("1", "m", F, FOUNDER_DOC, "« Largeur utile courante 1,00 m (bac 1000) » (§8)."),
        debord: condition("0.05", "m", F, FOUNDER_DOC, "« longueur = rampant + 5 cm de débord » (§8)."),
        vis_par_m2: condition("7", "u/m2", F, FOUNDER_DOC, "« m² × 7 » (§8)."),
        vis_par_ml_rive: condition("3", "u/m", F, FOUNDER_DOC, "« + ml rives × 3 » (§8)."),
        closoirs_par_plaque: condition("2", "u", F, FOUNDER_DOC, "« 1 par plaque en bas, 1 par plaque en haut » (§8)."),
        faitiere: condition("2", "m", F, FOUNDER_DOC, "« ml / 2 ou 3 arrondi sup., +1 » (§8), longueurs de 2 m."),
      },
      derived: [
        { key: "longueur_commande", label: "Longueur des plaques commandées", unit: "m", formula: "longueur_rampant + regle.debord", shown: true, source: F, verification: FOUNDER_DOC, version: 1 },
        { key: "largeur_pan", label: "Largeur d'un pan", unit: "m", formula: "surface / nb_pans / longueur_rampant", shown: true, source: F, verification: FOUNDER_DOC, version: 1 },
      ],
      needs: [
        {
          id: "plaques",
          slot: "plaque",
          when: "type_bac < 2",
          formula: "nb_pans * arrondi_sup(largeur_pan / regle.largeur_utile)",
          unit: "u",
          core: true,
          exclusions: "Une plaque par rampant (jusqu'à 12 m) ; au-delà, deux longueurs avec recouvrement de 15 à 20 cm.",
          designation: "Plaques bac acier simple peau {teinte_bac} {feutre_bac}, longueur {longueur_commande|m}",
          precision: "{surface|m2} de toiture, largeur utile 1,00 m",
          precisionRequires: ["teinte_bac", "feutre_bac"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          // Le panneau sandwich est isolé : pas de feutre anti-condensation à demander (§8, « option intégrée au bac »).
          id: "panneaux-sandwich",
          slot: "plaque",
          when: "type_bac >= 2",
          formula: "nb_pans * arrondi_sup(largeur_pan / regle.largeur_utile)",
          unit: "u",
          core: true,
          exclusions: "Un panneau par rampant (jusqu'à 12 m).",
          designation: "Panneaux sandwich {teinte_bac}, longueur {longueur_commande|m}",
          precision: "{surface|m2} de toiture, largeur utile 1,00 m",
          precisionRequires: ["teinte_bac"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "vis",
          slot: "vis",
          formula: "arrondi_sup(surface * regle.vis_par_m2 + nb_pans * 2 * longueur_rampant * regle.vis_par_ml_rive)",
          unit: "u",
          core: true,
          exclusions: "7 vis par m² et 3 par mètre de rive (deux rives par pan).",
          designation: "Vis autoperceuses bac acier avec rondelle EPDM",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "closoirs",
          slot: "closoir",
          formula: "nb_pans * arrondi_sup(largeur_pan / regle.largeur_utile) * regle.closoirs_par_plaque",
          unit: "u",
          core: true,
          exclusions: "Un closoir en bas et un en haut de chaque plaque.",
          designation: "Closoirs mousse profilés au bac acier",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "faitieres",
          slot: "faitiere",
          when: "nb_pans >= 2",
          formula: "arrondi_sup(largeur_pan / regle.faitiere) + 1",
          unit: "u",
          core: true,
          exclusions: "Faîtage de la largeur d'un pan, longueurs de 2 m, une de plus pour les recouvrements.",
          designation: "Faîtières bac acier {teinte_bac}, longueur 2 m",
          precision: "{largeur_pan|ml} de faîtage",
          precisionRequires: ["teinte_bac"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      id: "gouttiere",
      trade: "roofing",
      section: "evacuation",
      label: "Gouttière (profil, crochets, naissances)",
      triggers: ["gutter"],
      params: [
        { key: "longueur_gouttiere", label: "Longueur de gouttière", unit: "m", kind: "site_data", question: "Longueur de gouttière ?", fromLineQuantity: true, textLabels: ["gouttiere", "egout"] },
        {
          key: "nb_descentes",
          label: "Nombre de descentes",
          unit: "u",
          kind: "site_data",
          question: "Combien de descentes pour cette gouttière ?",
          textLabels: ["descente"],
          choices: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
          // « avec 2 descentes Ø80 » : le nombre écrit avant le mot.
          textValues: [
            { value: "1", keywords: ["1 descente", "une descente"] },
            { value: "2", keywords: ["2 descentes", "deux descentes"] },
            { value: "3", keywords: ["3 descentes", "trois descentes"] },
            { value: "4", keywords: ["4 descentes", "quatre descentes"] },
          ],
        },
        ZONE_PARAM,
        DEVELOPPE_GOUTTIERE_PARAM,
        FIXATION_CROCHET_PARAM,
        DIAMETRE_DESCENTE_PARAM,
      ],
      slots: [
        { key: "profil", family: "gutter", label: "Gouttière", usual: { text: "Longueurs de 4 m ; le profil (demi-ronde de 25, de 33…) suit le devis.", source: F, productId: "gouttiere-standard-4m" } },
        { key: "crochet", family: "gutter_hook", label: "Crochets", keywords: ["crochet"], usual: { text: "Un crochet tous les 50 cm (40 cm en bord de mer).", source: F, productId: "crochet-gouttiere-standard" } },
        { key: "naissance", family: "gutter_outlet", label: "Naissances", charsFrom: "profil", usual: { text: "Une naissance par descente.", source: F, productId: "naissance-standard" }, indissociable: true },
        // §49.1 point 4 : « étain et décapant si du zinc à souder est écrit » (« réalisation des soudures » à la pose).
        { key: "etain", family: "solder", label: "Étain à souder", citedBy: ["soudure", "soudures", "souder"], usual: { text: "Baguettes d'étain 33 % de 250 g (§25.3).", source: F, productId: "baguette-etain-250" } },
        { key: "decapant", family: "flux", label: "Décapant zinc", usual: { text: "Décapant pour zinc, flacon de 250 ml (§25.3).", source: F, productId: "decapant-zinc-250" } },
      ],
      constants: {
        // §2 : « Jonctions (soudure) : nb longueurs − 1 par ligne ; étain + décapant ≈ 15 g/jonction » (à valider, §25.7).
        etain_par_jonction: rule("0.015", "kg", F, todo("§2 et §25.3 : ≈ 15 g d'étain par jonction, à valider par un couvreur (§25.7)."), "étain {v} par jonction"),
        longueur_barre_gouttiere: condition("4", "m", F, FOUNDER_DOC, "Gouttière zinc en longueurs de 4 m (§25.2)."),
        flacons_decapant: rule("1", "u", F, todo("§25.3 : 1 flacon de 250 ml pour ≈ 40 ml de soudure, à valider (§25.7)."), "décapant {v} flacon pour les soudures"),
        espacement_crochet: condition("0.5", "m", F, FOUNDER_DOC),
        espacement_crochet_littoral: condition("0.4", "m", F, FOUNDER_DOC, "Zone 3 (bord de mer)."),
        zone_littorale: condition("3", "u", F, FOUNDER_DOC),
      },
      derived: [
        {
          key: "espacement_crochets",
          label: "Espacement des crochets",
          unit: "m",
          formula: "si(zone >= regle.zone_littorale, regle.espacement_crochet_littoral, regle.espacement_crochet)",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
      needs: [
        {
          id: "profil",
          slot: "profil",
          formula: "longueur_gouttiere",
          unit: "ml",
          core: true,
          exclusions: "Hors recouvrements ou jonctions propres au système.",
          // Comme au comptoir : « Gouttière zinc demi-ronde dév. 33 » ; le développé, il ne le devine pas.
          designation: "Gouttière {devis} dév. {developpe_gouttiere|cm#}",
          precisionRequires: ["developpe_gouttiere"],
          source: "baticlair-pratique-accessoires",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "crochets",
          slot: "crochet",
          // Un tous les 50 cm (40 en zone 3), plus un en bout (fondateur, D-2026-020 : « 21 calculés pour 10 m à 50 cm »).
          formula: "arrondi_sup(longueur_gouttiere / espacement_crochets) + 1",
          unit: "u",
          core: true,
          exclusions: "Un crochet en bout de ligne compris (une seule ligne de gouttière).",
          basis: "pour {longueur_gouttiere|ml} de gouttière, un tous les {espacement_crochets|cm} + 1 en bout",
          // Deux articles au comptoir : crochet sur chevron ou crochet bandeau, au développé de la gouttière.
          designation: "Crochets de gouttière {fixation_crochet} dév. {developpe_gouttiere|cm#}",
          precisionRequires: ["fixation_crochet", "developpe_gouttiere"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "naissances",
          slot: "naissance",
          formula: "nb_descentes",
          unit: "u",
          core: true,
          exclusions: "Une naissance par descente.",
          designation: "Naissances {devis} dév. {developpe_gouttiere|cm#} Ø{diametre_descente|mm#}",
          precisionRequires: ["developpe_gouttiere", "diametre_descente"],
          source: "baticlair-pratique-accessoires",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "etain-gouttiere",
          slot: "etain",
          formula: "(arrondi_sup(longueur_gouttiere / regle.longueur_barre_gouttiere) - 1 + nb_descentes) * regle.etain_par_jonction",
          unit: "kg",
          core: false,
          consumable: true,
          consumableFor: "etain",
          exclusions: "Une jonction soudée par longueur de 4 m après la première, plus une par naissance.",
          precision: "pour les soudures de {longueur_gouttiere|ml} de gouttière",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "decapant-gouttiere",
          slot: "decapant",
          formula: "regle.flacons_decapant",
          unit: "u",
          core: false,
          consumable: true,
          consumableFor: "etain",
          exclusions: "Un flacon pour les soudures de la gouttière.",
          precision: "pour les soudures de la gouttière",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // §15 : « même logique que le zinc » ; longueurs de 4 m, crochets tous les 50 cm (40 en zone 3) + 1 par extrémité,
      // jonctions = longueurs − 1, 2 talons par ligne droite, 1 angle par angle, 1 naissance par descente, joint de
      // dilatation PVC tous les 12 m. Une ligne de gouttière par défaut ; « 2 x 10 m » en dit deux.
      id: "gouttiere-pvc-alu",
      trade: "roofing",
      section: "evacuation",
      label: "Gouttière PVC ou alu (longueurs, crochets, jonctions, talons, angles, naissances)",
      triggers: ["gutter_plastic"],
      params: [
        { key: "longueur_gouttiere", label: "Longueur de gouttière", unit: "m", kind: "site_data", question: "Longueur de gouttière ?", fromLineQuantity: true, textLabels: ["gouttiere", "egout"] },
        {
          key: "nb_descentes",
          label: "Nombre de descentes",
          unit: "u",
          kind: "site_data",
          question: "Combien de descentes pour cette gouttière ?",
          textLabels: ["descente"],
          choices: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
          textValues: [
            { value: "1", keywords: ["1 descente", "une descente"] },
            { value: "2", keywords: ["2 descentes", "deux descentes"] },
            { value: "3", keywords: ["3 descentes", "trois descentes"] },
            { value: "4", keywords: ["4 descentes", "quatre descentes"] },
          ],
        },
        MATIERE_GOUTTIERE_PARAM,
        TEINTE_GOUTTIERE_PARAM,
        {
          key: "nb_lignes",
          label: "Lignes de gouttière",
          unit: "u",
          kind: "site_data",
          question: "Combien de lignes de gouttière ?",
          default: { value: "1", source: F, verification: FOUNDER_DOC, version: 1, note: "une ligne de gouttière" },
          // « Longueur : 2 x 10 m » : deux lignes de 10 m (deux fois les talons).
          textValues: [
            { value: "2", keywords: ["2 x", "2 ×", "2 lignes", "deux lignes", "2 pans", "deux pans", "2 faces", "deux faces"] },
            { value: "3", keywords: ["3 x", "3 ×", "3 lignes", "trois lignes"] },
            { value: "4", keywords: ["4 x", "4 ×", "4 lignes", "quatre lignes"] },
          ],
        },
        NB_ANGLES_PARAM,
        ZONE_PARAM,
        DEVELOPPE_GOUTTIERE_PARAM,
        FIXATION_CROCHET_PARAM,
        DIAMETRE_DESCENTE_PARAM,
      ],
      slots: [
        { key: "profil", family: "gutter_plastic", label: "Gouttière", usual: { text: "Longueurs de 4 m (§15).", source: F, productId: "gouttiere-pvc-alu-4m" } },
        { key: "crochet", family: "gutter_hook", label: "Crochets", keywords: ["crochet"], usual: { text: "Un crochet tous les 50 cm (40 cm en bord de mer), plus un en bout (§15).", source: F, productId: "crochet-gouttiere-standard" } },
        { key: "jonction", family: "gutter_joint", label: "Jonctions", usual: { text: "Une jonction entre deux longueurs (§15).", source: F, productId: "jonction-gouttiere" } },
        { key: "talon", family: "gutter_end", label: "Talons", usual: { text: "Deux talons par ligne droite (§15).", source: F, productId: "talon-gouttiere" } },
        { key: "angle", family: "gutter_angle", label: "Angles", usual: { text: "Un angle par angle de façade (§15).", source: F, productId: "angle-gouttiere" } },
        { key: "naissance", family: "gutter_outlet", label: "Naissances", charsFrom: "profil", usual: { text: "Une naissance par descente.", source: F, productId: "naissance-standard" }, indissociable: true },
        { key: "dilatation", family: "gutter_expansion", label: "Joints de dilatation", usual: { text: "Un joint de dilatation tous les 12 m de ligne droite en PVC (§15).", source: F, productId: "dilatation-gouttiere" } },
      ],
      constants: {
        espacement_crochet: condition("0.5", "m", F, FOUNDER_DOC, "« 1 tous les 50 cm » (§15)."),
        espacement_crochet_littoral: condition("0.4", "m", F, FOUNDER_DOC, "« 40 cm en zone 3 » (§15)."),
        zone_littorale: condition("3", "u", F, FOUNDER_DOC),
        longueur_profil: condition("4", "m", F, FOUNDER_DOC, "« longueur 4 m » (§15)."),
        talons_par_ligne: condition("2", "u", F, FOUNDER_DOC, "« 2 talons par ligne droite » (§15)."),
        dilatation_tous_les: condition("12", "m", F, FOUNDER_DOC, "« Joints de dilatation PVC : 1 tous les 12 m de ligne droite » (§15)."),
      },
      needs: [
        {
          id: "profil",
          slot: "profil",
          formula: "longueur_gouttiere",
          unit: "ml",
          core: true,
          designation: "Gouttière {matiere_gouttiere} {devis} {teinte_gouttiere} de {developpe_gouttiere|cm#}",
          precisionRequires: ["developpe_gouttiere", "teinte_gouttiere"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "crochets",
          slot: "crochet",
          formula: "arrondi_sup(longueur_gouttiere / si(zone >= regle.zone_littorale, regle.espacement_crochet_littoral, regle.espacement_crochet)) + nb_lignes",
          unit: "u",
          core: true,
          exclusions: "Un crochet en bout de chaque ligne compris.",
          designation: "Crochets de gouttière {matiere_gouttiere} {fixation_crochet} de {developpe_gouttiere|cm#}",
          precisionRequires: ["fixation_crochet", "developpe_gouttiere"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "jonctions",
          slot: "jonction",
          when: "longueur_gouttiere > regle.longueur_profil * nb_lignes",
          formula: "nb_lignes * (arrondi_sup(longueur_gouttiere / nb_lignes / regle.longueur_profil) - 1)",
          unit: "u",
          core: true,
          exclusions: "Une jonction entre deux longueurs de 4 m, sur chaque ligne.",
          designation: "Jonctions de gouttière {matiere_gouttiere} {teinte_gouttiere} de {developpe_gouttiere|cm#}",
          precisionRequires: ["developpe_gouttiere", "teinte_gouttiere"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "talons",
          slot: "talon",
          formula: "regle.talons_par_ligne * nb_lignes",
          unit: "u",
          core: true,
          exclusions: "Deux talons par ligne droite (une ligne finissant en angle n'en a qu'un : à corriger d'un tap).",
          designation: "Talons de gouttière {matiere_gouttiere} {teinte_gouttiere} de {developpe_gouttiere|cm#}",
          precisionRequires: ["developpe_gouttiere", "teinte_gouttiere"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "angles",
          slot: "angle",
          when: "nb_angles > 0",
          formula: "nb_angles",
          unit: "u",
          core: true,
          exclusions: "Angles extérieurs à 90° ; un angle intérieur se corrige d'un tap.",
          designation: "Angles extérieurs 90° {matiere_gouttiere} {teinte_gouttiere} de {developpe_gouttiere|cm#}",
          precisionRequires: ["developpe_gouttiere", "teinte_gouttiere"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "naissances",
          slot: "naissance",
          formula: "nb_descentes",
          unit: "u",
          core: true,
          exclusions: "Une naissance par descente.",
          designation: "Naissances {matiere_gouttiere} {devis} {teinte_gouttiere} de {developpe_gouttiere|cm#} Ø{diametre_descente|mm#}",
          precisionRequires: ["developpe_gouttiere", "diametre_descente", "teinte_gouttiere"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "dilatation",
          slot: "dilatation",
          when: "si(matiere_gouttiere < 2, si(longueur_gouttiere / nb_lignes > regle.dilatation_tous_les, 1, 0), 0)",
          formula: "nb_lignes * (arrondi_sup(longueur_gouttiere / nb_lignes / regle.dilatation_tous_les) - 1)",
          unit: "u",
          core: true,
          exclusions: "PVC seulement : un joint tous les 12 m de ligne droite.",
          designation: "Joints de dilatation de gouttière PVC {teinte_gouttiere} de {developpe_gouttiere|cm#}",
          precisionRequires: ["developpe_gouttiere", "teinte_gouttiere"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      id: "descente",
      trade: "roofing",
      section: "evacuation",
      label: "Descente d'eau pluviale (tubes, coudes, colliers)",
      triggers: ["downpipe"],
      params: [
        // Le nombre d'une ligne de TUBES (ou de descentes) ; « 4 coudes » ne fait jamais 4 descentes (D-2026-020). « 2 descentes
        // de 3 m » écrit dans une ligne le dit aussi.
        { key: "nb_descentes", label: "Nombre de descentes", unit: "u", kind: "site_data", question: "Combien de descentes ?", fromLineQuantity: true, forSlots: ["tube"], textCount: ["descente"] },
        DIAMETRE_DESCENTE_PARAM,
        // « hauteur 4 m », et « 2 descentes de 3 m » (D-2026-020) ; « descente 100 mm » n'est pas une hauteur (textRange).
        { key: "hauteur_descente", label: "Hauteur d'une descente", unit: "m", kind: "site_data", question: "Hauteur d'une descente ?", textLabels: ["hauteur", "descente"], textRange: { min: "1", max: "30" } },
        {
          key: "longueur_tube",
          label: "Longueur des tubes",
          unit: "m",
          kind: "site_data",
          question: "Tubes de descente en longueurs de 4 m ou de 2 m ?",
          default: { value: "4", source: FR_REPLY_DESCENTES, verification: FOUNDER_REPLY_DESCENTES, version: 1, note: "longueurs de 4 m" },
          choices: [
            { label: "4 m", value: "4" },
            { label: "2 m", value: "2" },
          ],
          textValues: [{ value: "2", keywords: ["longueur de 2 m", "longueurs de 2 m", "tube de 2 m", "tubes de 2 m", "en 2 m", "barres de 2 m"] }],
        },
        {
          key: "dauphin",
          label: "Dauphin",
          unit: "u",
          kind: "site_data",
          question: "Un dauphin en pied de chaque descente ?",
          hint: "Le dauphin protège le bas de la descente (fonte ou acier, 1 m).",
          choices: [
            { label: "Oui", value: "1" },
            { label: "Non", value: "0" },
          ],
          // « sans dauphin » contient « dauphin » : le « oui » ne se lit qu'avec ses propres mots.
          textValues: [
            { value: "0", keywords: ["sans dauphin", "sans dauphins", "pas de dauphin"] },
            { value: "1", keywords: ["avec dauphin", "avec dauphins", "et dauphin", "et dauphins", "+ dauphin", "dauphin fonte", "dauphins fonte", "dauphin acier", "dauphins acier"] },
          ],
          display: { "0": "sans dauphin", "1": "avec dauphin" },
        },
        {
          key: "coudes_par_descente",
          label: "Coudes par descente",
          unit: "u",
          kind: "site_data",
          question: "Combien de coudes par descente ?",
          default: { value: "2", source: F, verification: FOUNDER_DOC, version: 1, note: "un dévoiement sous la gouttière = 2 coudes" },
          choices: [
            { label: "Aucun", value: "0" },
            { label: "2 (un dévoiement)", value: "2" },
            { label: "4 (deux dévoiements)", value: "4" },
          ],
        },
      ],
      slots: [
        { key: "tube", family: "downpipe", label: "Tubes de descente", usual: { text: "Le diamètre et la matière suivent le devis.", source: F, productId: "tube-descente-standard" }, piecesFrom: { count: "nb_descentes", length: "hauteur_descente", piece: { one: "tube", many: "tubes" } } },
        { key: "coude", family: "downpipe_elbow", label: "Coudes", charsFrom: "tube", usual: { text: "Coudes du même système que la descente.", source: F, productId: "coude-descente-standard" } },
        // §49.6 : « fixation … des tuyaux de descente » sur la ligne de pose cite les colliers sans les chiffrer.
        { key: "collier", family: "downpipe_clamp", label: "Colliers", citedBy: ["fixation", "fixations"], usual: { text: "Un collier tous les 2 m, plus un.", source: FR_REPLY_DESCENTES, productId: "collier-descente-standard" } },
        { key: "dauphin", family: "downpipe_shoe", label: "Dauphins", usual: { text: "Un dauphin par descente, 1 m (§15).", source: F, productId: "dauphin-standard" } },
      ],
      constants: {
        espacement_collier: condition("2", "m", FR_REPLY_DESCENTES, FOUNDER_REPLY_DESCENTES, "« colliers tous les 2 m » (réponse du fondateur, 2026-10-05)."),
      },
      needs: [
        {
          id: "tubes",
          slot: "tube",
          formula: "nb_descentes * arrondi_sup(hauteur_descente / longueur_tube)",
          unit: "u",
          precision: "{nb_descentes} descentes × {hauteur_descente|m}",
          designation: "Tubes de descente {devis} Ø{diametre_descente|mm#}, longueur {longueur_tube|m}",
          precisionRequires: ["diametre_descente"],
          core: true,
          exclusions: "Par descente, la hauteur du devis en longueurs entières, sans déduire les coudes ni le dauphin.",
          source: FR_REPLY_DESCENTES,
          verification: FOUNDER_REPLY_DESCENTES,
          version: 1,
        },
        {
          id: "coudes",
          slot: "coude",
          formula: "nb_descentes * coudes_par_descente",
          unit: "u",
          core: true,
          exclusions: "Hors dauphin ou bague de pied.",
          designation: "Coudes de descente {devis} Ø{diametre_descente|mm#}",
          precisionRequires: ["diametre_descente"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
        {
          id: "colliers",
          slot: "collier",
          formula: "nb_descentes * (arrondi_sup(hauteur_descente / regle.espacement_collier) + 1)",
          unit: "u",
          core: true,
          exclusions: "Un collier tous les 2 m plus un par descente.",
          designation: "Colliers de descente Ø{diametre_descente|mm#}",
          precisionRequires: ["diametre_descente"],
          source: FR_REPLY_DESCENTES,
          verification: FOUNDER_REPLY_DESCENTES,
          version: 1,
        },
        {
          id: "dauphins",
          slot: "dauphin",
          when: "dauphin >= 1",
          formula: "nb_descentes",
          unit: "u",
          core: true,
          exclusions: "Un dauphin d'1 m par descente (§15).",
          designation: "Dauphins Ø{diametre_descente|mm#}, 1 m",
          precisionRequires: ["diametre_descente"],
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
    {
      // Une ligne « voligeage » seule (sous ardoises, tuiles ou bac) : §7 « Support voligeage : m² rampant × 1,05 ».
      // Placé en DERNIER : dans un devis de zinc à joint debout, la volige reste à l'ouvrage zinc (pas de double compte).
      id: "voligeage",
      trade: "roofing",
      section: "principal",
      label: "Voligeage (voliges ou panneaux)",
      triggers: ["sheathing"],
      params: [SURFACE_PARAM],
      slots: [{ key: "volige", family: "sheathing", label: "Voliges", keywords: ["volige", "voligeage", "osb", "contreplaque"], usual: { text: "Volige sapin 18 mm (§7).", source: F, productId: "volige-sapin-standard" } }],
      constants: {},
      needs: [
        {
          id: "voliges",
          slot: "volige",
          formula: "surface",
          unit: "m2",
          core: true,
          exclusions: "Surface du devis ; la perte de 5 % (§7, « m² rampant × 1,05 ») s'ajoute.",
          source: F,
          verification: FOUNDER_DOC,
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [
    // Pertes du référentiel du fondateur (pan simple) : appliquées après le calcul, avant l'arrondi au conditionnement.
    { family: "roof_slate", rate: "5", source: F, verification: FOUNDER_DOC, version: 1, note: "Casse et coupes de rive, pans rectangulaires simples." },
    { family: "roof_slate_fc", rate: "5", source: F, verification: FOUNDER_DOC, version: 1, note: "Comme l'ardoise naturelle (§4 : « mêmes formules »)." },
    { family: "slate_hook", rate: "2", source: F, verification: FOUNDER_DOC, version: 1, note: "« Commander crochets = ardoises × 1,02 »." },
    { family: "roof_tile", rate: "3", source: F, verification: FOUNDER_DOC, version: 1, note: "Tuiles mécaniques." },
    { family: "batten", rate: "5", source: F, verification: FOUNDER_DOC, version: 1, note: "Chutes de liteaux et contre-liteaux." },
    { family: "zinc_ridge", rate: "5", source: F, verification: FOUNDER_DOC, version: 1, note: "Recouvrements des bandes de 3 m." },
    { family: "hip_strip", rate: "5", source: F, verification: FOUNDER_DOC, version: 1, note: "« Zinc en bande (faîtage, noue, rive) : 5 % » (§2), arêtier « ml × 1,05 » (§3)." },
    { family: "sheathing", rate: "5", source: F, verification: FOUNDER_DOC, version: 1, note: "« Support voligeage : m² rampant × 1,05 » (§7)." },
  ],
  // Ouvrages que les devis de couverture comptent à l'unité (vocabulaire seulement).
  countedWorks: [
    { key: "jouee", label: { one: "jouée", many: "jouées" }, keywords: ["jouee", "jouees"] },
    { key: "lucarne", label: { one: "lucarne", many: "lucarnes" }, keywords: ["lucarne"] },
    { key: "cheminee", label: { one: "cheminée", many: "cheminées" }, keywords: ["cheminee", "souche"] },
    { key: "chien_assis", label: { one: "chien-assis", many: "chiens-assis" }, keywords: ["chien assis"] },
  ],
};
