export { Decimal, toDecimal, median, type DecimalInput } from "./shared/decimal.js";
export { Money, CurrencyMismatchError, type CurrencyCode } from "./money/money.js";
export { parseUnit, isUnitCode, dimensionOf, UNIT_DEFINITIONS, type UnitCode, type Dimension } from "./quantity/unit.js";
export { Quantity, type PackagingSpec } from "./quantity/quantity.js";
export { confidenceLevel, DEFAULT_CONFIDENCE_THRESHOLDS, type ConfidenceLevel, type ConfidenceThresholds } from "./confidence/confidence.js";
export * from "./offer/offer.js";
export * from "./offer/arithmetic.js";
export * from "./comparison/types.js";
export { compareOffers, COMPARISON_ENGINE_VERSION, DEFAULT_COMPARISON_CONFIG } from "./comparison/engine.js";
