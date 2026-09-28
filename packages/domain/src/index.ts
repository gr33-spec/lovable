export { Decimal, toDecimal, median, type DecimalInput } from "./shared/decimal";
export { Money, CurrencyMismatchError, type CurrencyCode } from "./money/money";
export { parseUnit, isUnitCode, dimensionOf, UNIT_DEFINITIONS, type UnitCode, type Dimension } from "./quantity/unit";
export { Quantity, type PackagingSpec } from "./quantity/quantity";
export { confidenceLevel, DEFAULT_CONFIDENCE_THRESHOLDS, type ConfidenceLevel, type ConfidenceThresholds } from "./confidence/confidence";
export * from "./offer/offer";
export * from "./offer/arithmetic";
export * from "./comparison/types";
export { compareOffers, COMPARISON_ENGINE_VERSION, DEFAULT_COMPARISON_CONFIG } from "./comparison/engine";
