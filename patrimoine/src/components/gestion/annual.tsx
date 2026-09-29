"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, DoorOpen, Repeat, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { yearStats, type CellStatus, type YearStats } from "@/lib/engine/annual";
import { todayIso } from "@/lib/engine/leases";
import { eur, pct } from "@/lib/format";
import { Card, SectionTitle, cx } from "../ui";

// Bilan de l'année : vacance, rotation, calendrier mensuel, révisions de
// loyer, avec comparaison à l'année précédente (même période).

const CELL: Record<CellStatus, { cls: string; label: string }> = {
  paye: { cls: "bg-pos", label: "Payé" },
  partiel: { cls: "bg-warn", label: "Partiel" },
  impaye: { cls: "bg-neg", label: "Impayé" },
  vacant: { cls: "bg-[#c7ccd6]", label: "Vacant" },
  non_pointe: { cls: "bg-black/[0.07]", label: "Non pointé" },
  futur: { cls: "bg-transparent border border-dashed border-line", label: "À venir" },
};

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Variation par rapport à l'an dernier ; `better` indique le sens favorable. */
function Delta({ now, before, better, unit = "" }: { now?: number; before?: number; better: "up" | "down"; unit?: string }) {
  if (now === undefined || before === undefined) return <span className="text-[11px] text-muted">—</span>;
  const d = now - before;
  if (Math.abs(d) < 0.05) return <span className="text-[11px] font-semibold text-muted">= N-1</span>;
  const good = better === "up" ? d > 0 : d < 0;
  return (
    <span className={cx("text-[11px] font-bold", good ? "text-pos" : "text-neg")}>
      {d > 0 ? "▲" : "▼"} {Math.abs(Math.round(d * 10) / 10).toLocaleString("fr-FR")}
      {unit} vs N-1
    </span>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-soft/70 px-3 py-3">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="tabular text-[19px] font-extrabold text-navy">{value}</div>
      {delta}
    </div>
  );
}

export function AnnualView() {
  const { data } = useStore();
  const today = todayIso();
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const s = useMemo(() => yearStats(data, year, today), [data, year, today]);
  // Comparaison sur la même période (de janvier au mois en cours pour l'année en cours).
  const prev: YearStats = useMemo(() => yearStats(data, year - 1, today, s.monthsCount || 12), [data, year, today, s.monthsCount]);
  const years = s.departures.length + s.arrivals.length;

  return (
    <div>
      <div className="soft-card flex items-center justify-between rounded-[22px] px-2 py-2">
        <button onClick={() => setYear(year - 1)} aria-label="Année précédente" className="flex h-10 w-10 items-center justify-center rounded-full text-navy active:bg-black/5">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <div className="text-[17px] font-bold text-navy">Année {year}</div>
          <div className="text-[11.5px] text-muted">{year === thisYear ? `Janvier → ${new Date().toLocaleDateString("fr-FR", { month: "long" })}` : year > thisYear ? "Année à venir" : "Année complète"}</div>
        </div>
        <button onClick={() => setYear(year + 1)} disabled={year >= thisYear} aria-label="Année suivante" className="flex h-10 w-10 items-center justify-center rounded-full text-navy active:bg-black/5 disabled:opacity-30">
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Ordinateur : vacance, rotation et révisions côte à côte. */}
      <div className="xl:grid xl:grid-cols-3 xl:items-start xl:gap-x-5">
      <div className="min-w-0">
      {/* Vacance locative */}
      <SectionTitle>
        <span className="flex items-center gap-2">
          <DoorOpen size={17} className="text-gold" /> Vacance locative
        </span>
      </SectionTitle>
      <Card>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Taux d'occupation" value={s.occupancyPct === undefined ? "—" : pct(s.occupancyPct)} delta={<Delta now={s.occupancyPct} before={prev.occupancyPct} better="up" unit=" pt" />} />
          <Stat label="Mois vacants" value={s.vacantMonths.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} delta={<Delta now={s.vacantMonths} before={prev.vacantMonths} better="down" />} />
          <Stat label="Loyers perdus" value={eur(s.lostRent)} delta={<Delta now={s.lostRent} before={prev.lostRent} better="down" unit=" €" />} />
        </div>
        <div className="mt-4 space-y-2.5">
          {s.buildings.map((b) => (
            <div key={b.buildingId}>
              <div className="flex justify-between text-[13px]">
                <span className="truncate font-medium text-ink">{b.name}</span>
                <span className="tabular shrink-0 text-muted">
                  {b.occupancyPct === undefined ? "—" : pct(b.occupancyPct)}
                  {b.lostRent > 0 && <span className="text-neg"> · −{eur(b.lostRent)}</span>}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft">
                <div className={cx("h-full rounded-full", (b.occupancyPct ?? 0) >= 95 ? "bg-pos" : (b.occupancyPct ?? 0) >= 85 ? "bg-series-1" : "bg-warn")} style={{ width: `${b.occupancyPct ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        {s.estimatedUnits > 0 && <p className="mt-3 text-[11.5px] text-muted">{s.estimatedUnits} logement(s) sans historique de bail : occupation déduite du pointage ou du statut actuel.</p>}
      </Card>

      </div>
      <div className="min-w-0">
      {/* Turnover */}
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Repeat size={17} className="text-gold" /> Rotation des locataires
        </span>
      </SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Départs" value={String(s.departures.length)} delta={<Delta now={s.departures.length} before={prev.departures.length} better="down" />} />
          <Stat label="Arrivées" value={String(s.arrivals.length)} delta={<Delta now={s.arrivals.length} before={prev.arrivals.length} better="up" />} />
          <Stat
            label="Durée moyenne d'occupation"
            value={s.avgStayYears === undefined ? "—" : `${s.avgStayYears.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ans`}
            delta={<Delta now={s.avgStayYears} before={prev.avgStayYears} better="up" unit=" an" />}
          />
          <Stat
            label="Délai de relocation"
            value={s.avgRelocationDays === undefined ? "—" : `${Math.round(s.avgRelocationDays)} j`}
            delta={<Delta now={s.avgRelocationDays} before={prev.avgRelocationDays} better="down" unit=" j" />}
          />
        </div>
        {years === 0 && <p className="mt-3 text-[12px] text-muted">Aucun départ ni arrivée enregistré cette année (les changements de locataire faits dans l&apos;application sont comptés automatiquement).</p>}
      </Card>

      </div>
      <div className="min-w-0">
      {/* Révisions */}
      <SectionTitle>
        <span className="flex items-center gap-2">
          <TrendingUp size={17} className="text-gold" /> Révisions de loyer
        </span>
      </SectionTitle>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Révisions appliquées" value={String(s.revisions.length)} delta={<Delta now={s.revisions.length} before={prev.revisions.length} better="up" />} />
          <Stat label="Gain mensuel" value={`+${eur(s.revisionGain)}`} delta={<Delta now={s.revisionGain} before={prev.revisionGain} better="up" unit=" €" />} />
        </div>
        {s.revisions.length > 0 && (
          <div className="mt-3 divide-y divide-line">
            {s.revisions.map((r, i) => {
              const b = data.buildings.find((x) => x.id === r.unit.buildingId);
              return (
                <div key={i} className="flex items-center justify-between py-2 text-[13px]">
                  <span className="min-w-0 truncate text-ink">
                    {[b?.name, r.unit.name].filter(Boolean).join(" · ")}
                    <span className="text-muted"> · {r.date.split("-").reverse().join("/")}</span>
                  </span>
                  <span className="tabular shrink-0 font-semibold text-pos">
                    {eur(r.previousRent)} → {eur(r.rent)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      </div>
      </div>
      {/* Calendrier annuel */}
      <SectionTitle>Calendrier de l&apos;année</SectionTitle>
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-muted">
        {(["paye", "partiel", "impaye", "vacant", "non_pointe"] as CellStatus[]).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className={cx("inline-block h-2.5 w-2.5 rounded-sm", CELL[k].cls)} /> {CELL[k].label}
          </span>
        ))}
      </div>
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 2xl:grid-cols-3">
        {s.buildings.map((b) => {
          const isOpen = open.has(b.buildingId);
          return (
            <div key={b.buildingId} className="soft-card overflow-hidden rounded-[22px]">
              <button
                onClick={() => setOpen((cur) => { const n = new Set(cur); if (n.has(b.buildingId)) n.delete(b.buildingId); else n.add(b.buildingId); return n; })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-navy">{b.name}</span>
                {/* Mini résumé : une bande par mois, couleur dominante de l'immeuble */}
                <span className="flex shrink-0 gap-[2px]">
                  {MONTHS.map((_, i) => {
                    const cells = b.units.map((u) => u.months[i]);
                    const worst: CellStatus = cells.includes("impaye") ? "impaye" : cells.includes("partiel") ? "partiel" : cells.every((c) => c === "futur") ? "futur" : cells.every((c) => c === "paye" || c === "vacant") && cells.some((c) => c === "paye") ? "paye" : cells.every((c) => c === "vacant") ? "vacant" : "non_pointe";
                    return <span key={i} className={cx("h-3.5 w-1.5 rounded-sm", CELL[worst].cls)} />;
                  })}
                </span>
                <ChevronDown size={17} className={cx("shrink-0 text-muted transition", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="border-t border-line px-3 pb-3 pt-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_repeat(12,minmax(0,18px))] items-center gap-[3px] text-[10px] text-muted">
                    <span />
                    {MONTHS.map((m, i) => (
                      <span key={i} className="text-center">
                        {m}
                      </span>
                    ))}
                    {b.units.map((u) => (
                      <div key={u.unit.id} className="contents">
                        <span className="truncate pr-1 text-[12px] text-ink">{u.unit.name}</span>
                        {u.months.map((c, i) => (
                          <span key={i} title={`${u.unit.name} · ${MONTHS[i]} : ${CELL[c].label}`} className={cx("h-[18px] rounded-[4px]", CELL[c].cls)} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 px-1 text-center text-[11.5px] text-muted">Comparaisons faites sur la même période de l&apos;année précédente. Un mois non pointé n&apos;est jamais compté comme payé.</p>
    </div>
  );
}
