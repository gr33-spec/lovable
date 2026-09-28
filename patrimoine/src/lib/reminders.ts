import type { AppData } from "./types";
import type { ResolvedLoan } from "./engine/loan";
import { reminders, type Reminder } from "./engine/leases";
import { depositDue, tenantsName } from "./tenancy";
import { depositSettlement } from "./legal/rules";
import { dateFr } from "./format";

/** Tous les rappels : baux, révisions, crédits, impayés et restitution des dépôts de garantie. */
export function allReminders(data: AppData, today: string, resolvedLoans?: Map<string, ResolvedLoan>, options: { includeDismissed?: boolean } = {}): Reminder[] {
  const list = reminders(data, today, resolvedLoans, { includeDismissed: true });
  for (const t of data.tenancies) {
    if (t.status !== "sortie" || t.depositReturnedDate) continue;
    const due = depositDue(data, t);
    if (!due) continue;
    const unit = data.units.find((u) => u.id === t.unitId);
    if (!unit) continue;
    const building = data.buildings.find((b) => b.id === unit.buildingId);
    const s = depositSettlement(t);
    list.push({
      id: `deposit:${t.id}:${due}`,
      unitId: unit.id,
      kind: "deposit",
      date: due,
      title: "Dépôt de garantie à restituer",
      detail: `${[building?.name, unit.name, tenantsName(t)].filter(Boolean).join(" · ")} — ${s.toReturn > 0 ? `${s.toReturn.toLocaleString("fr-FR")} € ` : ""}avant le ${dateFr(due)}`,
      href: `/patrimoine/logement/${t.unitId}/changement`,
      late: today > due,
      amount: s.toReturn,
    });
  }
  const dismissed = new Set(data.settings.dismissedReminders ?? []);
  return list
    .filter((r) => options.includeDismissed || !dismissed.has(r.id))
    .sort((a, b) => Number(b.late) - Number(a.late) || a.date.localeCompare(b.date));
}
