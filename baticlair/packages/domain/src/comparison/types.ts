import type { ConfidenceLevel } from "../confidence/confidence.js";
import type { Money } from "../money/money.js";
import type { ArithmeticCheck } from "../offer/arithmetic.js";
import type { SupplierOffer } from "../offer/offer.js";
import type { Quantity } from "../quantity/quantity.js";
import type { Decimal } from "../shared/decimal.js";

/** Un besoin de la consultation (instantané figé du quantitatif validé). */
export interface RequestedItem {
  id: string;
  designation: string;
  quantity: Quantity;
  /** Famille de produits (« Couverture », « Bardage »…). */
  category?: string;
}

/**
 * Correspondance entre un besoin et une ou plusieurs lignes d'une offre.
 * Produite par le moteur de matching (hors de ce module) puis éventuellement
 * confirmée par l'utilisateur.
 */
export interface ItemMatch {
  itemId: string;
  supplierId: string;
  lineIds: string[];
  /** Score interne 0..1. */
  score: number;
  /** « confirmed » = validé par l'utilisateur : fait foi quel que soit le score. */
  status: "proposed" | "confirmed";
}

export interface ComparisonInput {
  items: RequestedItem[];
  offers: SupplierOffer[];
  matches: ItemMatch[];
}

export type ItemFlag =
  | "SUBSTITUTION"
  | "QUANTITY_LOWER"
  | "QUANTITY_HIGHER"
  | "UNIT_NOT_COMPARABLE"
  | "ONLY_AS_VARIANT"
  | "NOT_PRICED";

export interface ItemOfferResult {
  supplierId: string;
  status: "covered" | "missing";
  confidence: ConfidenceLevel | null;
  lineIds: string[];
  /** Quantité proposée, convertie dans l'unité du besoin si possible. */
  offeredQuantity: Quantity | null;
  /** Montant HT réellement facturé pour ce besoin (remise globale répartie). */
  billedAmount: Money | null;
  /** Montant HT ramené à la quantité demandée (prix unitaire effectif × besoin). */
  normalizedAmount: Money | null;
  /**
   * Coût pour couvrir le besoin (PD-011) : le montant facturé si la quantité
   * proposée couvre le besoin (on paie le conditionnement entier), sinon le
   * montant ramené au besoin avec le prix du fournisseur.
   */
  comparableAmount: Money | null;
  /** Prix unitaire effectif HT dans l'unité du besoin, remises comprises. */
  effectiveUnitPrice: Money | null;
  /** Estimation pour un besoin manquant (médiane des autres fournisseurs). */
  estimatedAmount: Money | null;
  flags: ItemFlag[];
}

export interface ItemComparison {
  itemId: string;
  offers: ItemOfferResult[];
  /** Fournisseur au coût le plus bas pour couvrir le besoin. */
  lowestSupplierId: string | null;
}

/**
 * - complete     : tous les besoins couverts, correspondances sûres.
 * - provisional  : tout est couvert mais au moins une correspondance est à vérifier.
 * - estimated    : des besoins manquants ont été estimés.
 * - incomplete   : des besoins manquants ne peuvent pas être estimés.
 */
export type Comparability = "complete" | "provisional" | "estimated" | "incomplete";

export interface SupplierSummary {
  supplierId: string;
  arithmetic: ArithmeticCheck;
  /** FAIT : total HT imprimé par le fournisseur. */
  printedTotalHT: Money | null;
  /** Total HT calculé de l'offre principale (lignes comptées − remise globale). */
  computedTotalHT: Money;
  feesHT: Money;
  depositsHT: Money;
  /** Montant HT des lignes principales ne correspondant à aucun besoin. */
  extrasHT: Money;
  coveredCount: number;
  missingCount: number;
  uncertainCount: number;
  /**
   * ESTIMATION : coût pour couvrir la base commune des besoins (conditionnements
   * payés en entier), frais inclus, consignes et articles non demandés
   * exclus, manquants estimés.
   */
  comparableTotalHT: Money | null;
  /** Part estimée (non chiffrée par ce fournisseur) du total comparable. */
  estimatedPartHT: Money;
  comparability: Comparability;
}

export type FindingNature = "FACT" | "INFERENCE" | "WARNING" | "RECOMMENDATION";
export type FindingSeverity = "info" | "attention" | "important";

export type FindingCode =
  | "FULL_COVERAGE"
  | "ITEMS_MISSING"
  | "ITEM_NOT_QUOTED_BY_ANYONE"
  | "LOWEST_TOTAL_NOT_COMPARABLE"
  | "BEST_COMPARABLE_OFFER"
  | "CATEGORY_PRICE_GAP"
  | "DELIVERY_FEE"
  | "DELIVERY_NOT_SPECIFIED"
  | "DEPOSIT_PRESENT"
  | "SUBSTITUTION_PROPOSED"
  | "VARIANT_AVAILABLE"
  | "OPTION_PRESENT"
  | "EXTRA_LINES"
  | "QUANTITY_DIFFERS"
  | "UNIT_NOT_COMPARABLE"
  | "UNCERTAIN_MATCH"
  | "ARITHMETIC_MISMATCH"
  | "PRINTED_TOTAL_INCLUDES_NON_COUNTED_LINES";

/**
 * Constat du moteur. Aucun texte ici : les paramètres alimentent des
 * gabarits traduits côté présentation (i18n). La nature distingue fait,
 * inférence, avertissement et recommandation (§55).
 */
export interface Finding {
  code: FindingCode;
  nature: FindingNature;
  severity: FindingSeverity;
  supplierId?: string;
  otherSupplierId?: string;
  itemIds?: string[];
  lineIds?: string[];
  amount?: Money;
  ratio?: Decimal;
  category?: string;
  count?: number;
  /** Ordre d'affichage dans la synthèse (plus grand = plus important). */
  priority: number;
}

export interface ComparisonResult {
  engineVersion: string;
  items: ItemComparison[];
  suppliers: SupplierSummary[];
  findings: Finding[];
}

export interface ComparisonConfig {
  /** Écart relatif minimal pour signaler une différence par famille. */
  categoryGapMinRatio: Decimal;
  /** Écart absolu minimal (HT) pour signaler une différence par famille. */
  categoryGapMinAmount: Money;
}
