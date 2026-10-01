export * from "./model.js";
export { parseRefUnit, type Dim, type RefUnit } from "./units.js";
export { parseFormula, formulaVariables, FormulaError, type Expr } from "./expression.js";
export { computeChantier, computeWorkItem, requiredInputs, type RequiredInputs, type WorkItemInput, type WorkItemResult, type NeedResult, type Question, type TraceLine, type ParamValue, type SlotChoice, type EngineOptions, type CompanyPreferences } from "./engine.js";
export { identifyProducts, type Identification } from "./resolve.js";
export { checkReferential } from "./integrity.js";
export { ROOFING_REFERENTIAL } from "./data/roofing.js";
export { paramsFromContext, type ChantierContext, type SiteFact, type ContextConflict } from "./context.js";
export { purchaseList, type PurchaseRow } from "./purchase-list.js";
