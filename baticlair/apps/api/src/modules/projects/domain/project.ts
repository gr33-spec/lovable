import { validationFailed } from "../../../platform/errors/domain-error.js";

export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  companyId: string;
  name: string;
  clientName: string | null;
  address: string | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

const LIMITS = { name: 120, clientName: 120, address: 300 } as const;

function clean(value: string, field: keyof typeof LIMITS, required: boolean): string | null {
  const v = value.trim().replace(/\s+/g, " ");
  if (v.length === 0) {
    if (required) throw validationFailed(`${field} is required`, [{ path: field, message: "required" }]);
    return null;
  }
  if (v.length > LIMITS[field]) {
    throw validationFailed(`${field} is too long`, [{ path: field, message: "too_long" }]);
  }
  return v;
}

export const normalizeProjectName = (v: string) => clean(v, "name", true) as string;
export const normalizeOptionalText = (v: string | null | undefined, field: "clientName" | "address") =>
  v == null ? null : clean(v, field, false);
