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

export const ROOFING_REFERENTIAL: Referential = {
  id: "roofing",
  version: "roofing-2026.10.02-8",
  trade: "roofing",
  sources: [
    { id: "definition", kind: "definition", title: "Définition", retrievedAt: "2026-10-01" },
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
    { code: "ridge_fixing", label: "Fixation de faîtière", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["fixation de faitiere", "agrafe de faitiere"] },
    { code: "verge_tile", label: "Tuile de rive", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["tuile de rive", "rive"] },
    { code: "gutter", label: "Gouttière (profil)", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["gouttiere"] },
    {
      code: "gutter_hook",
      label: "Crochet de gouttière",
      needUnit: "u",
      attributes: [{ key: "espacement_max", label: "Espacement maximal", unit: "m" }],
      keyAttributes: [],
      keywords: ["crochet de gouttiere"],
    },
    { code: "gutter_outlet", label: "Naissance", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["naissance"] },
    { code: "downpipe", label: "Tube de descente", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["descente", "tuyau de descente"] },
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
    { code: "roof_outlet", label: "Sortie de toit", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["sortie de toit"] },
    { code: "hip", label: "Arêtier", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["aretier"] },
    { code: "valley", label: "Noue", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["noue"] },
    { code: "flashing", label: "Solin, abergement", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["solin", "abergement"] },
    { code: "roof_window", label: "Fenêtre de toit", needUnit: "u", attributes: [], keyAttributes: [], keywords: ["fenetre de toit", "velux"] },
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
      // Aucun conditionnement saisi : la longueur vendue dépend du négoce (fiche article à fournir).
      sellingUnits: [],
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
      sellingUnits: [],
    },
    {
      id: "ardoise-30x22",
      family: "roof_slate",
      label: "Ardoise 30 × 22 cm",
      shortLabel: "Ardoises 30×22",
      aliases: ["30x22", "30 x 22", "30*22"],
      generic: true,
      attributes: {
        longueur: spec("0.30", "m", "format-ardoise", FOUNDER_VALIDATED),
        largeur: spec("0.22", "m", "format-ardoise", FOUNDER_VALIDATED),
      },
      sellingUnits: [{ id: "piece", label: { one: "pièce", many: "pièces" }, contains: ONE_PIECE, primary: true }],
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
  ],
  workItems: [
    {
      id: "couverture-tuiles-emboitement",
      trade: "roofing",
      label: "Couverture en tuiles à emboîtement sur liteaux",
      triggers: ["roof_tile"],
      params: [
        { key: "surface", label: "Surface de toiture", unit: "m2", kind: "site_data", question: "Quelle surface de toiture ?", fromLineQuantity: true },
        {
          key: "pureau",
          label: "Pureau",
          unit: "cm",
          kind: "site_data",
          question: "À quel pureau posez-vous ces tuiles ?",
          hint: "Il change le nombre de tuiles et de liteaux.",
          range: { min: "tuile.pureau_min", max: "tuile.pureau_max" },
          textLabels: ["pureau"],
        },
        {
          key: "entraxe_supports",
          label: "Entraxe des chevrons ou fermettes",
          unit: "cm",
          kind: "site_data",
          question: "Entraxe des chevrons (ou fermettes) ?",
          textLabels: ["entraxe"],
        },
        { key: "pente", label: "Pente du toit", unit: "%", kind: "site_data", question: "Pente du toit (en %) ?", textLabels: ["pente"] },
      ],
      slots: [
        { key: "tuile", family: "roof_tile", label: "Tuiles" },
        { key: "liteau", family: "batten", label: "Liteaux", keywords: ["lattage", "liteau", "latte"] },
        { key: "contre_liteau", family: "batten", label: "Contre-liteaux", keywords: ["contre lattage", "contre latte", "contre liteau"] },
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
          verification: FOUNDER_VALIDATED,
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
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "contre-liteaux",
          slot: "contre_liteau",
          formula: "surface / entraxe_supports",
          unit: "ml",
          core: false,
          exclusions: "Une file par chevron ou fermette ; suppose un entraxe régulier sur toute la surface.",
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
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
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
      ],
    },
    {
      id: "couverture-ardoises-crochet",
      trade: "roofing",
      label: "Couverture en ardoises au crochet sur liteaux",
      triggers: ["roof_slate"],
      params: [
        { key: "surface", label: "Surface de toiture", unit: "m2", kind: "site_data", question: "Quelle surface de toiture ?", fromLineQuantity: true },
        {
          key: "pureau",
          label: "Pureau",
          unit: "cm",
          kind: "site_data",
          question: "À quel pureau posez-vous ces ardoises ?",
          hint: "Il change le nombre d'ardoises, de crochets et de liteaux.",
          textLabels: ["pureau"],
        },
        { key: "entraxe_supports", label: "Entraxe des chevrons", unit: "cm", kind: "site_data", question: "Entraxe des chevrons ?", textLabels: ["entraxe"] },
        { key: "pente", label: "Pente du toit", unit: "%", kind: "site_data", question: "Pente du toit (en %) ?", textLabels: ["pente"] },
      ],
      slots: [
        { key: "ardoise", family: "roof_slate", label: "Ardoises" },
        { key: "crochet", family: "slate_hook", label: "Crochets d'ardoise", keywords: ["crochet"] },
        {
          key: "liteau",
          family: "batten",
          label: "Liteaux",
          keywords: ["lattage", "liteau", "latte"],
          usual: { text: "Section 18×40 par défaut : le devis ne la précise pas (règle validée par le fondateur).", source: "fondateur-pratique-2026-10-02", productShort: "Liteaux 18×40" },
        },
        { key: "contre_liteau", family: "batten", label: "Contre-liteaux", keywords: ["contre lattage", "contre latte", "contre liteau"] },
        { key: "ecran", family: "underlay", label: "Écran sous-toiture" },
      ],
      constants: {
        seuil_pente_ecran: condition("30", "%", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED),
        recouvrement_faible_pente: condition("0.20", "m", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED, "Pente inférieure OU ÉGALE au seuil (« ≤ 30 % »)."),
        recouvrement_forte_pente: condition("0.10", "m", "soprema-sop-ecran-hpv-r2", FOUNDER_CHECKED, "Pente supérieure au seuil."),
      },
      needs: [
        {
          id: "ardoises",
          slot: "ardoise",
          formula: "surface / (ardoise.largeur * pureau)",
          unit: "u",
          core: true,
          exclusions: "Hors ardoises de rive, doublis à l'égout, coupes en noue et en arêtier, casse.",
          source: "baticlair-geometrie-ardoise",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "crochets-ardoise",
          slot: "crochet",
          formula: "surface / (ardoise.largeur * pureau)",
          unit: "u",
          core: true,
          exclusions: "Un crochet par ardoise (règle validée par le fondateur) ; hors ardoises de rive et doublis.",
          source: "baticlair-geometrie-ardoise",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "liteaux-ardoise",
          slot: "liteau",
          formula: "surface / pureau",
          unit: "ml",
          core: false,
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
          core: false,
          exclusions: "Une file par chevron ; suppose un entraxe régulier.",
          source: "baticlair-geometrie-couverture",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "ecran-ardoise",
          slot: "ecran",
          formula:
            "surface * ecran.largeur_rouleau / (ecran.largeur_rouleau - si(pente <= regle.seuil_pente_ecran, regle.recouvrement_faible_pente, regle.recouvrement_forte_pente))",
          unit: "m2",
          core: false,
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
      label: "Faîtage (faîtières, closoir, fixations)",
      triggers: ["ridge_tile"],
      params: [{ key: "longueur_faitage", label: "Longueur du faîtage", unit: "m", kind: "site_data", question: "Longueur du faîtage ?", fromLineQuantity: true }],
      slots: [
        { key: "faitiere", family: "ridge_tile", label: "Faîtières" },
        { key: "closoir", family: "ridge_closure", label: "Closoir" },
        { key: "fixation_faitiere", family: "ridge_fixing", label: "Fixations de faîtières", keywords: ["fixation"] },
      ],
      constants: {},
      needs: [
        {
          id: "faitieres",
          slot: "faitiere",
          // Le ratio « pièces au mètre » du fabricant, appliqué à la longueur : c'est sa définition.
          formula: "longueur_faitage * faitiere.pieces_par_ml",
          unit: "u",
          core: true,
          exclusions: "Hors abouts/frontons de faîtage et tuiles de rive.",
          source: "definition",
          verification: { status: "verified", verifiedAt: "2026-10-01", verifiedBy: "BatiClair (définition d'un ratio au mètre)" },
          version: 1,
        },
        {
          id: "closoir",
          slot: "closoir",
          formula: "longueur_faitage",
          unit: "ml",
          core: false,
          exclusions: "Closoir sur toute la longueur du faîtage ; recouvrements selon le produit.",
          source: "baticlair-pratique-accessoires",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
      ],
    },
    {
      id: "gouttiere",
      trade: "roofing",
      label: "Gouttière (profil, crochets, naissances)",
      triggers: ["gutter"],
      params: [
        { key: "longueur_gouttiere", label: "Longueur de gouttière", unit: "m", kind: "site_data", question: "Longueur de gouttière ?", fromLineQuantity: true },
        { key: "nb_descentes", label: "Nombre de descentes", unit: "u", kind: "site_data", question: "Combien de descentes ?" },
      ],
      slots: [
        { key: "profil", family: "gutter", label: "Gouttière" },
        { key: "crochet", family: "gutter_hook", label: "Crochets", keywords: ["crochet"] },
        { key: "naissance", family: "gutter_outlet", label: "Naissances" },
      ],
      constants: {},
      needs: [
        {
          id: "profil",
          slot: "profil",
          formula: "longueur_gouttiere",
          unit: "ml",
          core: true,
          exclusions: "Hors recouvrements ou jonctions propres au système.",
          source: "baticlair-pratique-accessoires",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "crochets",
          slot: "crochet",
          formula: "longueur_gouttiere / crochet.espacement_max",
          unit: "u",
          core: false,
          exclusions: "Hors crochet supplémentaire en extrémité et aux naissances selon le fabricant.",
          source: "baticlair-pratique-accessoires",
          verification: DRAFT,
          version: 1,
        },
        {
          id: "naissances",
          slot: "naissance",
          formula: "nb_descentes",
          unit: "u",
          core: false,
          exclusions: "Une naissance par descente.",
          source: "baticlair-pratique-accessoires",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
      ],
    },
    {
      id: "descente",
      trade: "roofing",
      label: "Descente d'eau pluviale (tubes, coudes, colliers)",
      triggers: ["downpipe"],
      params: [
        { key: "nb_descentes", label: "Nombre de descentes", unit: "u", kind: "site_data", question: "Combien de descentes ?", fromLineQuantity: true },
        { key: "hauteur_descente", label: "Hauteur d'une descente", unit: "m", kind: "site_data", question: "Hauteur d'une descente ?", textLabels: ["hauteur"] },
        { key: "coudes_par_descente", label: "Coudes par descente", unit: "u", kind: "site_data", question: "Combien de coudes par descente ?" },
      ],
      slots: [
        { key: "tube", family: "downpipe", label: "Tubes de descente" },
        { key: "coude", family: "downpipe_elbow", label: "Coudes" },
        { key: "collier", family: "downpipe_clamp", label: "Colliers" },
      ],
      constants: {},
      needs: [
        {
          id: "tubes",
          slot: "tube",
          formula: "nb_descentes * hauteur_descente",
          unit: "ml",
          core: true,
          exclusions: "Hauteur du devis, sans déduire les coudes ni ajouter de dauphin.",
          source: "baticlair-pratique-accessoires",
          verification: FOUNDER_VALIDATED,
          version: 1,
        },
        {
          id: "coudes",
          slot: "coude",
          formula: "nb_descentes * coudes_par_descente",
          unit: "u",
          core: false,
          source: "baticlair-pratique-accessoires",
          verification: DRAFT,
          version: 1,
        },
        {
          id: "colliers",
          slot: "collier",
          formula: "nb_descentes * hauteur_descente / collier.espacement_max",
          unit: "u",
          core: false,
          exclusions: "Hors collier supplémentaire en tête et en pied selon le fabricant.",
          source: "baticlair-pratique-accessoires",
          verification: DRAFT,
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
  // Ouvrages que les devis de couverture comptent à l'unité (vocabulaire seulement).
  countedWorks: [
    { key: "jouee", label: { one: "jouée", many: "jouées" }, keywords: ["jouee", "jouees"] },
    { key: "lucarne", label: { one: "lucarne", many: "lucarnes" }, keywords: ["lucarne"] },
    { key: "cheminee", label: { one: "cheminée", many: "cheminées" }, keywords: ["cheminee", "souche"] },
    { key: "chien_assis", label: { one: "chien-assis", many: "chiens-assis" }, keywords: ["chien assis"] },
  ],
};
