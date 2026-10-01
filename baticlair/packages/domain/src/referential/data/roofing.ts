import type { Fact, Provenance, Referential } from "../model.js";

/**
 * Référentiel COUVERTURE — premier système réel, pour prouver le moteur.
 *
 * Statut des données (2026-10-01) :
 *  - caractéristiques Edilians HP 10 et Soprema SOP'ÉCRAN HPV R2 : confirmées
 *    par le fondateur sur la documentation officielle des fabricants ; page
 *    et version exactes à compléter à réception des PDF ;
 *  - règles de calcul (tuiles, liteaux, contre-liteaux) : règles BatiClair,
 *    EN ATTENTE de validation métier par le fondateur → inutilisables pour un
 *    artisan tant qu'elles ne sont pas validées ;
 *  - liteaux (longueur vendue, section) : en attente de la fiche du négoce.
 *
 * Le PUREAU n'est pas une caractéristique figée de la tuile : la fiche donne
 * une plage (310 à 376 mm), et la pente, la zone et la situation servent aux
 * pentes MINIMALES admissibles (condition d'emploi), pas au choix du pureau.
 * Le pureau retenu est donc une donnée du CHANTIER : lue dans le devis, ou
 * demandée. Il n'est jamais choisi par BatiClair.
 */
const DRAFT = { status: "draft" } as const;
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

export const ROOFING_REFERENTIAL: Referential = {
  id: "roofing",
  version: "roofing-2026.10.01-2",
  trade: "roofing",
  sources: [
    { id: "definition", kind: "definition", title: "Définition", retrievedAt: "2026-10-01" },
    {
      id: "edilians-hp10",
      kind: "manufacturer",
      title: "Documentation HP 10 Huguenot (Edilians)",
      publisher: "Edilians",
      url: "https://edilians.com/media/productattach/2/0/205_fag_hp_10_huguenot_14122021_bd.pdf",
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
      note: "Redonne le tableau Edilians « ml de liteaux par m² » et les 9,9 à 12 tuiles/m² (tests). Validation métier attendue.",
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
      code: "roof_tile",
      label: "Tuile",
      needUnit: "u",
      attributes: [
        { key: "largeur_utile", label: "Largeur utile", unit: "m" },
        { key: "pureau_min", label: "Pureau minimal", unit: "m" },
        { key: "pureau_max", label: "Pureau maximal", unit: "m" },
      ],
      keyAttributes: ["largeur_utile"],
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
    },
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
      attributes: {
        epaisseur: spec("27", "mm", "negoce-liteau-27x40", DRAFT, "Section nominale (désignation commerciale)."),
        largeur: spec("40", "mm", "negoce-liteau-27x40", DRAFT, "Section nominale (désignation commerciale)."),
      },
      sellingUnits: [
        {
          id: "longueur-4m",
          label: { one: "longueur de 4 m", many: "longueurs de 4 m" },
          contains: packaging("4", "m", "negoce-liteau-27x40", DRAFT, "Longueur vendue à confirmer avec le négoce."),
          primary: true,
        },
      ],
    },
    {
      id: "soprema-sop-ecran-hpv-r2-150x50",
      family: "underlay",
      label: "SOP'ÉCRAN HPV R2, rouleau 1,50 × 50 m (Soprema)",
      shortLabel: "Écran HPV",
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
  ],
  workItems: [
    {
      id: "couverture-tuiles-emboitement",
      trade: "roofing",
      label: "Couverture en tuiles à emboîtement sur liteaux",
      triggers: ["roof_tile"],
      params: [
        { key: "surface", label: "Surface de toiture", unit: "m2", kind: "site_data", question: "Quelle surface de toiture ?" },
        {
          key: "pureau",
          label: "Pureau",
          unit: "cm",
          kind: "site_data",
          question: "À quel pureau posez-vous ces tuiles ?",
          hint: "Il change le nombre de tuiles et de liteaux.",
          range: { min: "tuile.pureau_min", max: "tuile.pureau_max" },
        },
        { key: "entraxe_chevrons", label: "Entraxe des chevrons", unit: "cm", kind: "site_data", question: "Entraxe des chevrons ?" },
        { key: "pente", label: "Pente du toit", unit: "%", kind: "site_data", question: "Pente du toit (en %) ?" },
      ],
      slots: [
        { key: "tuile", family: "roof_tile", label: "Tuiles" },
        { key: "liteau", family: "batten", label: "Liteaux" },
        { key: "contre_liteau", family: "batten", label: "Contre-liteaux" },
        { key: "ecran", family: "underlay", label: "Écran sous-toiture" },
      ],
      constants: {
        seuil_pente_ecran: condition("30", "%", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED),
        recouvrement_faible_pente: condition("0.20", "m", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED, "Pente inférieure OU ÉGALE au seuil (« ≤ 30 % »)."),
        recouvrement_forte_pente: condition("0.10", "m", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED, "Pente supérieure au seuil."),
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
          verification: DRAFT,
          version: 1,
        },
        {
          id: "liteaux",
          slot: "liteau",
          formula: "surface / pureau",
          unit: "ml",
          core: false,
          exclusions: "Hors doublage du liteau d'égout et liteaux de faîtage.",
          source: "baticlair-geometrie-couverture",
          verification: DRAFT,
          version: 1,
        },
        {
          id: "contre-liteaux",
          slot: "contre_liteau",
          formula: "surface / entraxe_chevrons",
          unit: "ml",
          core: false,
          exclusions: "Suppose des chevrons réguliers sur toute la surface.",
          source: "baticlair-geometrie-couverture",
          verification: DRAFT,
          version: 1,
        },
        {
          id: "ecran",
          slot: "ecran",
          formula:
            "surface * ecran.largeur_rouleau / (ecran.largeur_rouleau - si(pente <= regle.seuil_pente_ecran, regle.recouvrement_faible_pente, regle.recouvrement_forte_pente))",
          unit: "m2",
          core: false,
          exclusions: "Hors recouvrements en bout de rouleau (10 cm au droit d'un support), relevés et chutes.",
          // Les recouvrements viennent de Soprema ; la formule qui en tire la surface d'écran est une règle BatiClair.
          source: "baticlair-geometrie-couverture",
          verification: DRAFT,
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
