import { validationFailed } from "../../../platform/errors/domain-error.js";

export const COMPANY_NAME_MAX = 120;

export function normalizeCompanyName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > COMPANY_NAME_MAX) {
    throw validationFailed("Company name must be 2 to 120 characters", [{ path: "name", message: "invalid_length" }]);
  }
  return name;
}
