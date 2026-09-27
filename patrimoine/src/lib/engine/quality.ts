import type { AppData } from "../types";
import type { Snapshot } from "./snapshot";

export interface QualityIssue {
  id: string;
  label: string;
  detail: string;
  href: string;
}

/** Données manquantes qui empêchent un calcul : affichées, jamais inventées. */
export function qualityIssues(data: AppData, snap: Snapshot): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const b of data.buildings) {
    if ((snap.byBuilding.get(b.id)?.unvalued ?? 0) > 0) {
      issues.push({ id: `b-${b.id}`, label: b.name, detail: "Valeur estimée manquante", href: `/patrimoine/immeuble/${b.id}` });
    }
  }
  for (const l of data.loans) {
    const r = snap.resolvedLoans.get(l.id);
    if (!r || r.finished) continue;
    const name = l.name || l.bank || "Crédit";
    if (r.quality === "insufficient") {
      issues.push({ id: `l-${l.id}`, label: name, detail: r.notes[r.notes.length - 1] ?? "Données insuffisantes", href: `/patrimoine/credit/${l.id}` });
    } else if (r.quality === "estimated") {
      issues.push({ id: `l-${l.id}`, label: name, detail: r.notes[0] ?? "Projection estimée", href: `/patrimoine/credit/${l.id}` });
    }
  }
  for (const w of data.works) {
    if (w.status !== "termine" && !w.year) {
      issues.push({ id: `w-${w.id}`, label: w.label, detail: "Travaux sans année prévue", href: `/plus/travaux` });
    }
  }
  return issues;
}
