import type { AppData, Tenancy, Unit } from "../types";
import { daysBetween, monthKey, todayIso } from "./leases";
import { occupiedDays } from "../legal/rules";

// Bilan locatif d'une année : vacance, rotation des locataires, calendrier
// mensuel et révisions de loyer. Données issues des baux (dates d'entrée et
// de sortie), du pointage mensuel et de l'historique des loyers ; rien n'est
// supposé payé sans pointage.

export type CellStatus = "paye" | "partiel" | "impaye" | "vacant" | "non_pointe" | "futur";

export interface UnitYear {
  unit: Unit;
  months: CellStatus[];
  /** Mois occupés (fractions de mois comprises). */
  occupied: number;
  vacant: number;
  lostRent: number;
}

export interface BuildingYear {
  buildingId: string;
  name: string;
  units: UnitYear[];
  occupancyPct?: number;
  vacantMonths: number;
  lostRent: number;
}

export interface YearStats {
  year: number;
  /** Nombre de mois écoulés pris en compte (12 pour une année passée). */
  monthsCount: number;
  buildings: BuildingYear[];
  occupancyPct?: number;
  vacantMonths: number;
  lostRent: number;
  departures: Tenancy[];
  arrivals: Tenancy[];
  /** Durée moyenne d'occupation des locataires partis (années). */
  avgStayYears?: number;
  /** Délai moyen de relocation (jours entre un départ et l'arrivée suivante). */
  avgRelocationDays?: number;
  revisions: { unit: Unit; date: string; previousRent?: number; rent: number; gain: number }[];
  revisionGain: number;
  /** Logements dont l'occupation est déduite de leur statut actuel (pas d'historique de bail). */
  estimatedUnits: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function tenanciesOf(data: AppData, unitId: string): Tenancy[] {
  return data.tenancies.filter((t) => t.unitId === unitId && t.status !== "brouillon");
}

/** Part du mois occupée (0 à 1) par au moins un bail. */
function occupancyShare(tenancies: Tenancy[], month: string): number {
  let best = 0;
  for (const t of tenancies) {
    const { days, total } = occupiedDays(month, t.startDate, t.endDate);
    if (!t.startDate && !t.endDate) return 1;
    best = Math.max(best, total ? days / total : 0);
  }
  return best;
}

export function yearStats(data: AppData, year: number, today = todayIso(), upToMonth?: number): YearStats {
  const current = monthKey(today);
  const lastMonth = upToMonth ?? (year < Number(current.slice(0, 4)) ? 12 : year > Number(current.slice(0, 4)) ? 0 : Number(current.slice(5, 7)));
  const keys = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  let estimatedUnits = 0;

  const buildings: BuildingYear[] = data.buildings
    .map((b) => {
      const units: UnitYear[] = data.units
        .filter((u) => u.buildingId === b.id)
        .map((unit) => {
          const leases = tenanciesOf(data, unit.id);
          const known = leases.length > 0;
          if (!known) estimatedUnits += 1;
          let occupied = 0;
          let vacant = 0;
          const months: CellStatus[] = keys.map((k, i) => {
            if (i + 1 > lastMonth) return "futur";
            const p = unit.payments?.[k];
            // Occupation : baux connus, sinon pointage du mois, sinon statut actuel du logement.
            const share = known ? occupancyShare(leases, k) : p ? 1 : unit.status === "vacant" ? 0 : 1;
            occupied += share;
            vacant += 1 - share;
            if (share === 0) return "vacant";
            if (!p) return "non_pointe";
            return p.status;
          });
          return { unit, months, occupied: r2(occupied), vacant: r2(vacant), lostRent: r2(vacant * (unit.rent ?? 0)) };
        });
      const total = units.reduce((s, u) => s + u.occupied + u.vacant, 0);
      const occ = units.reduce((s, u) => s + u.occupied, 0);
      return {
        buildingId: b.id,
        name: b.name,
        units,
        occupancyPct: total > 0 ? (occ / total) * 100 : undefined,
        vacantMonths: r2(units.reduce((s, u) => s + u.vacant, 0)),
        lostRent: r2(units.reduce((s, u) => s + u.lostRent, 0)),
      };
    })
    .filter((b) => b.units.length > 0);

  const total = buildings.reduce((s, b) => s + b.units.reduce((a, u) => a + u.occupied + u.vacant, 0), 0);
  const occ = buildings.reduce((s, b) => s + b.units.reduce((a, u) => a + u.occupied, 0), 0);

  const limit = `${year}-${String(Math.max(lastMonth, 1)).padStart(2, "0")}-31`;
  const inYear = (d?: string) => !!d && d.startsWith(String(year)) && d <= limit;
  const leases = data.tenancies.filter((t) => t.status !== "brouillon");
  const departures = leases.filter((t) => inYear(t.endDate));
  const arrivals = leases.filter((t) => !t.imported && inYear(t.startDate));

  const stays = departures.filter((t) => t.startDate && t.endDate).map((t) => daysBetween(t.startDate!, t.endDate!) / 365.25);
  const gaps: number[] = [];
  for (const a of arrivals) {
    const previous = leases
      .filter((t) => t.unitId === a.unitId && t.id !== a.id && t.endDate && a.startDate && t.endDate <= a.startDate)
      .sort((x, y) => (y.endDate ?? "").localeCompare(x.endDate ?? ""))[0];
    if (previous?.endDate && a.startDate) gaps.push(Math.max(0, daysBetween(previous.endDate, a.startDate) - 1));
  }

  const revisions: YearStats["revisions"] = [];
  for (const unit of data.units) {
    for (const h of unit.rentHistory ?? []) {
      if (!inYear(h.date)) continue;
      revisions.push({ unit, date: h.date, previousRent: h.previousRent, rent: h.rent, gain: r2(h.rent - (h.previousRent ?? h.rent)) });
    }
  }
  revisions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    year,
    monthsCount: lastMonth,
    buildings,
    occupancyPct: total > 0 ? (occ / total) * 100 : undefined,
    vacantMonths: r2(buildings.reduce((s, b) => s + b.vacantMonths, 0)),
    lostRent: r2(buildings.reduce((s, b) => s + b.lostRent, 0)),
    departures,
    arrivals,
    avgStayYears: stays.length ? stays.reduce((s, x) => s + x, 0) / stays.length : undefined,
    avgRelocationDays: gaps.length ? gaps.reduce((s, x) => s + x, 0) / gaps.length : undefined,
    revisions,
    revisionGain: r2(revisions.reduce((s, r) => s + r.gain, 0)),
    estimatedUnits,
  };
}
