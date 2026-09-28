// Barèmes fiscaux et sociaux 2026 (France), relevés en septembre 2026.
// Ce sont des paramètres, pas des règles figées : l'écran Rémunération permet
// de modifier les principaux taux, et chaque résultat reste une estimation à
// faire valider par l'expert-comptable.

export const BAREME_YEAR = 2026;

/** Plafond annuel de la sécurité sociale 2026 (arrêté du 22 décembre 2025). */
export const PASS = 48060;

/** Impôt sur le revenu : barème 2026 (revenus 2025), loi n° 2026-103 du 19 février 2026. */
export const IR_BRACKETS: [upTo: number, rate: number][] = [
  [11497, 0],
  [29315, 0.11],
  [83823, 0.3],
  [180294, 0.41],
  [Infinity, 0.45],
];
export const IR_DECOTE = { single: 897, couple: 1483, rate: 0.4525 };
/** Plafonnement de l'avantage par demi-part supplémentaire. */
export const QF_HALF_PART_CAP = 1807;
/** Déduction forfaitaire de 10 % pour frais professionnels (revenus 2025). */
export const PROF_ALLOWANCE = { rate: 0.1, min: 509, max: 14555 };

/** Revenus du capital (LFSS 2026). */
export const CAPITAL = {
  /** Part impôt sur le revenu du prélèvement forfaitaire unique. */
  pfuIncome: 0.128,
  /** Prélèvements sociaux sur dividendes : 18,6 % depuis 2026. */
  socialDividends: 0.186,
  /** Prélèvements sociaux sur revenus fonciers : 17,2 %. */
  socialLand: 0.172,
  /** Abattement sur dividendes en cas d'option pour le barème. */
  dividendAllowance: 0.4,
  /** CSG déductible l'année suivante en cas d'option pour le barème. */
  deductibleCsg: 0.068,
};

/** Impôt sur les sociétés 2026. */
export const IS = { reducedRate: 0.15, reducedCeiling: 42500, normalRate: 0.25 };

/**
 * Cotisations des travailleurs indépendants (gérant majoritaire) : assiette
 * unique depuis 2026 = revenu − abattement de 26 % (borné entre 1,76 % et
 * 130 % du PASS), décret n° 2024-688 du 5 juillet 2024.
 */
export const TNS = {
  allowanceRate: 0.26,
  allowanceMinPass: 0.0176,
  allowanceMaxPass: 1.3,
  /** Maladie-maternité : taux progressif (paliers en fraction du PASS, taux aux bornes). */
  healthSteps: [
    [0, 0],
    [0.2, 0],
    [0.2, 0.015],
    [0.4, 0.015],
    [0.6, 0.04],
    [1.1, 0.065],
    [2, 0.077],
    [3, 0.085],
  ] as [number, number][],
  healthAbove3Pass: 0.065,
  dailyAllowance: 0.0085,
  dailyAllowanceCapPass: 5,
  pensionBase: 0.1787,
  pensionBaseUncapped: 0.0072,
  pensionComplementary1: 0.081,
  pensionComplementary2: 0.091,
  pensionComplementaryCapPass: 4,
  disability: 0.013,
  family: 0.031,
  familyFromPass: 1.1,
  familyFullPass: 1.4,
  csgCrds: 0.097,
  csgDeductible: 0.068,
  /** Contribution à la formation professionnelle, forfaitaire. */
  trainingPass: 0.0025,
};

/**
 * Dirigeant assimilé salarié (président de SAS, gérant minoritaire) : taux
 * moyens 2026, hors assurance chômage (non due). Détail variable selon la
 * convention, le taux accidents du travail et le niveau de salaire.
 */
export const SALARY = {
  employee: 0.22,
  employer: 0.45,
  /** CSG non déductible + CRDS, sur 98,25 % du brut. */
  csgNonDeductible: 0.029,
  csgBase: 0.9825,
  /** Part retraite (estimation) : régime de base et Agirc-Arrco, salarié + employeur. */
  pensionShare: 0.28,
};

/** Seuil de 10 % (capital + primes + comptes courants) au-delà duquel les dividendes d'un gérant majoritaire supportent les cotisations TNS. */
export const TNS_DIVIDEND_THRESHOLD = 0.1;

export const SOURCES = [
  { label: "Barème IR 2026 (loi de finances pour 2026)", url: "https://bofip.impots.gouv.fr/bofip/14954-PGP.html/ACTU-2026-00022" },
  { label: "PFU 31,4 % en 2026 (LFSS 2026)", url: "https://entreprendre.service-public.gouv.fr/actualites/A18796" },
  { label: "PASS 2026 : 48 060 €", url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053143451" },
  { label: "Réforme de l'assiette des indépendants", url: "https://www.urssaf.fr/accueil/independant/comprendre-payer-cotisations/reforme-cotisations-independants.html" },
  { label: "Taux d'impôt sur les sociétés", url: "https://www.impots.gouv.fr/professionnel/questions/quels-sont-les-taux-de-limpot-sur-les-societes" },
];
