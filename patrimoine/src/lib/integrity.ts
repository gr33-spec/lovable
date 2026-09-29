import type { AppData, Collection } from "./types";
import { COLLECTIONS } from "./types";

// Contrôle d'intégrité des données : relations cassées (élément qui pointe
// vers un élément disparu), identifiants en double et contradictions entre
// rattachements. Lecture seule : rien n'est corrigé ici, le rapport sert au
// diagnostic (Plus › Sauvegardes) et aux tests.

export interface IntegrityIssue {
  level: "erreur" | "attention";
  coll: Collection;
  id: string;
  message: string;
}

/** Champ de rattachement → collection visée. */
const REFS: Record<string, Collection> = {
  companyId: "companies",
  parentId: "companies",
  newCompanyParentId: "companies",
  realizedCompanyId: "companies",
  buildingId: "buildings",
  realizedBuildingId: "buildings",
  unitId: "units",
  tenancyId: "tenancies",
  loanId: "loans",
  entryId: "inspections",
};
const LIST_REFS: Record<string, Collection> = { loanIds: "loans", realizedLoanIds: "loans" };

/** Collections d'historique ou de simulation : un lien vers un élément vendu ou supprimé y est normal. */
const HISTORICAL = new Set<Collection>(["plans", "scenarios", "projects"]);

export function integrityReport(data: AppData): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const ids = new Map<Collection, Set<string>>();
  for (const coll of COLLECTIONS) {
    const seen = new Set<string>();
    for (const item of (data[coll] ?? []) as { id: string }[]) {
      if (seen.has(item.id)) issues.push({ level: "erreur", coll, id: item.id, message: "Identifiant en double" });
      seen.add(item.id);
    }
    ids.set(coll, seen);
  }
  const has = (coll: Collection, id: unknown) => typeof id === "string" && ids.get(coll)!.has(id);

  for (const coll of COLLECTIONS) {
    for (const item of (data[coll] ?? []) as unknown as Record<string, unknown>[]) {
      const level = HISTORICAL.has(coll) ? "attention" : "erreur";
      for (const [key, target] of Object.entries(REFS)) {
        const v = item[key];
        if (v === undefined || v === null || v === "") continue;
        if (!has(target, v)) issues.push({ level, coll, id: item.id as string, message: `${key} vers un élément absent (${target})` });
      }
      for (const [key, target] of Object.entries(LIST_REFS)) {
        const list = item[key];
        if (Array.isArray(list)) for (const v of list) if (!has(target, v)) issues.push({ level: "attention", coll, id: item.id as string, message: `${key} contient un élément absent (${target})` });
      }
    }
  }

  // Contradictions entre rattachements.
  const buildings = new Map(data.buildings.map((b) => [b.id, b]));
  const units = new Map(data.units.map((u) => [u.id, u]));
  const tenancies = new Map(data.tenancies.map((t) => [t.id, t]));
  for (const l of data.loans) {
    const b = l.buildingId ? buildings.get(l.buildingId) : undefined;
    if (b && l.companyId && b.companyId && l.companyId !== b.companyId) issues.push({ level: "attention", coll: "loans", id: l.id, message: "Crédit rattaché à un immeuble d'une autre société que la sienne" });
  }
  for (const i of data.inspections) {
    const t = tenancies.get(i.tenancyId);
    if (t && t.unitId !== i.unitId) issues.push({ level: "erreur", coll: "inspections", id: i.id, message: "État des lieux d'un autre logement que celui du bail" });
  }
  const activeByUnit = new Map<string, number>();
  for (const t of data.tenancies) if (t.status === "actif") activeByUnit.set(t.unitId, (activeByUnit.get(t.unitId) ?? 0) + 1);
  for (const [unitId, n] of activeByUnit) if (n > 1) issues.push({ level: "attention", coll: "units", id: unitId, message: `${n} baux actifs sur le même logement` });
  for (const d of data.documents ?? []) {
    const u = d.unitId ? units.get(d.unitId) : undefined;
    if (u && d.buildingId && u.buildingId !== d.buildingId) issues.push({ level: "attention", coll: "documents", id: d.id, message: "Document rattaché à un lot d'un autre immeuble" });
    const b = d.buildingId ? buildings.get(d.buildingId) : undefined;
    if (b && d.companyId && b.companyId && b.companyId !== d.companyId) issues.push({ level: "attention", coll: "documents", id: d.id, message: "Document rattaché à un immeuble d'une autre société" });
  }
  // Société mère en boucle (A détient B qui détient A).
  const parent = new Map(data.companies.map((c) => [c.id, c.parentId ?? undefined]));
  for (const c of data.companies) {
    const seen = new Set<string>();
    let cur: string | undefined = c.id;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      cur = parent.get(cur);
    }
    if (cur === c.id) issues.push({ level: "erreur", coll: "companies", id: c.id, message: "Détention circulaire entre sociétés" });
  }
  return issues;
}
