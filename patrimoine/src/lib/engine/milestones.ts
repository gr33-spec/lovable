import type { AppData } from "../types";
import type { Projection, TimelineEvent } from "./projection";
import { NO_COMPANY } from "./snapshot";

export interface Milestone {
  year: number;
  label: string;
  detail?: string;
  kind: TimelineEvent["kind"] | "mixed";
  monthlyFreed?: number;
  amount?: number;
}

export function companyLabel(data: AppData, key: string): string {
  if (key === NO_COMPANY) return "Hors société";
  if (key.startsWith("new-")) {
    const p = (data.projects ?? []).find((x) => `new-${x.id}` === key);
    return p?.newCompanyName ? `${p.newCompanyName} (à créer)` : "Nouvelle société";
  }
  return data.companies.find((c) => c.id === key)?.name ?? "Société";
}

/** « Les prochaines grandes étapes » : événements regroupés par année. */
export function milestones(data: AppData, p: Projection, limit = 6): Milestone[] {
  const byYear = new Map<number, TimelineEvent[]>();
  for (const e of p.events) {
    const list = byYear.get(e.year) ?? [];
    list.push(e);
    byYear.set(e.year, list);
  }
  const out: Milestone[] = [];
  for (const [year, events] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
    const ends = events.filter((e) => e.kind === "loan_end");
    const others = events.filter((e) => e.kind !== "loan_end");
    if (ends.length === 1) {
      const e = ends[0];
      out.push({
        year,
        kind: "loan_end",
        label: e.label.replace(/^Fin — /, "Fin du "),
        detail: companyLabel(data, e.companyKey),
        monthlyFreed: e.monthlyFreed,
      });
    } else if (ends.length > 1) {
      const freed = ends.reduce((s, e) => s + (e.monthlyFreed ?? 0), 0);
      out.push({
        year,
        kind: "loan_end",
        label: `${numberWord(ends.length)} crédits arrivent à échéance`,
        detail: [...new Set(ends.map((e) => companyLabel(data, e.companyKey)))].join(", "),
        monthlyFreed: freed,
      });
    }
    for (const e of others) {
      out.push({
        year,
        kind: e.kind,
        label: e.label,
        detail: e.kind === "balloon" ? companyLabel(data, e.companyKey) : undefined,
        amount: e.amount,
      });
    }
  }
  return out.slice(0, limit);
}

function numberWord(n: number): string {
  const words = ["Zéro", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"];
  return words[n] ?? String(n);
}
