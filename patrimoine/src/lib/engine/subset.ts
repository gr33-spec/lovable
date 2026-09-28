import type { AppData } from "../types";

/** Sociétés d'un périmètre : la société et toutes ses filiales. */
export function companyWithDescendants(data: AppData, companyId: string): Set<string> {
  const ids = new Set<string>([companyId]);
  let added = true;
  while (added) {
    added = false;
    for (const c of data.companies) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        added = true;
      }
    }
  }
  return ids;
}

/**
 * Données restreintes à une société (et ses filiales) : sert au dossier
 * banque d'une seule SCI, calculé avec les mêmes moteurs que le groupe.
 */
export function companySubset(data: AppData, companyId: string): AppData {
  const companies = companyWithDescendants(data, companyId);
  const buildings = data.buildings.filter((b) => b.companyId && companies.has(b.companyId));
  const buildingIds = new Set(buildings.map((b) => b.id));
  const inScope = (x: { buildingId?: string | null; companyId?: string | null }) =>
    x.buildingId ? buildingIds.has(x.buildingId) : !!x.companyId && companies.has(x.companyId);
  return {
    ...data,
    companies: data.companies.filter((c) => companies.has(c.id)).map((c) => (c.id === companyId ? { ...c, parentId: null } : c)),
    buildings,
    units: data.units.filter((u) => buildingIds.has(u.buildingId)),
    loans: data.loans.filter(inScope),
    works: data.works.filter(inScope),
    events: data.events.filter((e) => !!e.companyId && companies.has(e.companyId)),
    withdrawals: data.withdrawals.filter((w) => !!w.companyId && companies.has(w.companyId)),
    statements: data.statements.filter((s) => companies.has(s.companyId)),
    plans: [],
    scenarios: [],
    projects: (data.projects ?? []).filter((p) => (p.kind === "travaux" ? !!p.buildingId && buildingIds.has(p.buildingId) : !!p.companyId && companies.has(p.companyId))),
  };
}
