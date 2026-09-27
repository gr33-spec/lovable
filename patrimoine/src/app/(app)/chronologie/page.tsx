"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { KIND_STYLE } from "@/components/event-style";
import { useStore } from "@/lib/store";
import { NO_COMPANY, companyTree } from "@/lib/engine/snapshot";
import { debtFreeYear, halfDebtYear, type EventKind, type TimelineEvent } from "@/lib/engine/projection";
import { companyLabel } from "@/lib/engine/milestones";
import { yearOf } from "@/lib/engine/dates";
import { eur, eurCompact, eurSigned } from "@/lib/format";
import { BarChart, LineChart } from "@/components/charts";
import { Card, Kpi, Page, PageHeader, SectionTitle, Segmented, cx } from "@/components/ui";


const NAME_COL = 104;

export default function ChronologiePage() {
  const { data, projection, nowMonth } = useStore();
  const y0 = yearOf(nowMonth);
  const years = projection.years.map((r) => r.year);
  const [zoom, setZoom] = useState<"10" | "20" | "30">("10");
  const [selected, setSelected] = useState(y0 + 5);
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const visibleYears = Number(zoom) + 1;
  const colW = Math.max(26, (width - NAME_COL) / visibleYears);

  // Garde l'année sélectionnée visible lors d'un changement de zoom ou d'année.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const x = (selected - y0) * colW;
    const viewW = el.clientWidth - NAME_COL;
    if (x < el.scrollLeft || x + colW > el.scrollLeft + viewW) {
      el.scrollTo({ left: Math.max(0, x - viewW / 2), behavior: "smooth" });
    }
  }, [selected, colW, y0]);

  const lines = useMemo(() => {
    const keys = companyTree(data.companies).map(({ company }) => ({ key: company.id, label: company.name }));
    if (projection.events.some((e) => e.companyKey === NO_COMPANY) || data.buildings.some((b) => !b.companyId)) {
      keys.push({ key: NO_COMPANY, label: "Hors société" });
    }
    return keys;
  }, [data.companies, data.buildings, projection.events]);

  const eventsByCell = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of projection.events) {
      const k = `${e.companyKey}|${e.year}`;
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return map;
  }, [projection.events]);

  const row = projection.years.find((r) => r.year === selected);
  const yearEvents = projection.events.filter((e) => e.year === selected);
  const half = halfDebtYear(projection);
  const free = debtFreeYear(projection);

  const insights = useMemo(() => {
    const out: string[] = [];
    const ends = projection.events.filter((e) => e.kind === "loan_end");
    const byYear = new Map<number, TimelineEvent[]>();
    for (const e of ends) byYear.set(e.year, [...(byYear.get(e.year) ?? []), e]);
    const first = ends[0];
    if (first) {
      out.push(`En ${first.year}, ${first.label.replace(/^Fin — /, "le ")} se termine : cash-flow +${eurCompact(first.monthlyFreed)}/mois.`);
    }
    const busiest = [...byYear.entries()].filter(([, l]) => l.length > 1).sort((a, b) => b[1].length - a[1].length)[0];
    if (busiest) {
      const freed = busiest[1].reduce((s, e) => s + (e.monthlyFreed ?? 0), 0);
      out.push(`En ${busiest[0]}, ${busiest[1].length} crédits se terminent : +${eurCompact(freed)}/mois.`);
    }
    if (half) out.push(`En ${half}, la dette est divisée par deux par rapport à aujourd'hui.`);
    if (free) out.push(`En ${free}, le patrimoine est entièrement désendetté.`);
    return out;
  }, [projection.events, half, free]);

  return (
    <>
      <PageHeader title="Chronologie" back="/plus" subtitle={`${y0} → ${y0 + 30}`} />
      <Page>
        {insights.length > 0 && (
          <div className="hero-card space-y-2.5 rounded-[26px] p-5 text-white">
            {insights.map((t) => (
              <div key={t} className="flex gap-2 text-[15px] leading-snug">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <Segmented
              value={zoom}
              onChange={setZoom}
              options={[
                { value: "10", label: "10 ans" },
                { value: "20", label: "20 ans" },
                { value: "30", label: "30 ans" },
              ]}
            />
          </div>
        </div>

        {/* Frise */}
        <Card className="mt-3 overflow-hidden p-0">
          <div ref={scroller} className="no-scrollbar relative overflow-x-auto">
            <div style={{ width: NAME_COL + colW * years.length }}>
              {/* En-tête des années */}
              <div className="flex border-b border-line">
                <div className="sticky left-0 z-10 shrink-0 bg-card" style={{ width: NAME_COL }} />
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSelected(y)}
                    className={cx(
                      "tabular shrink-0 py-2 text-center text-[11px] font-medium",
                      y === selected ? "bg-navy text-white" : y % 5 === 0 ? "text-ink" : "text-muted",
                    )}
                    style={{ width: colW }}
                  >
                    {colW < 34 ? (colW >= 20 || y % 5 === 0 || y === selected ? `’${String(y).slice(2)}` : "") : y}
                  </button>
                ))}
              </div>
              {lines.map((line) => (
                <div key={line.key} className="flex border-b border-line/70 last:border-0">
                  <div className="sticky left-0 z-10 flex shrink-0 items-center bg-card px-3 text-[12px] font-semibold leading-tight text-navy shadow-[4px_0_8px_-6px_rgba(0,0,0,0.15)]" style={{ width: NAME_COL, minHeight: 48 }}>
                    <span className="line-clamp-2">{line.label}</span>
                  </div>
                  {years.map((y) => {
                    const evs = eventsByCell.get(`${line.key}|${y}`) ?? [];
                    return (
                      <button
                        key={y}
                        onClick={() => setSelected(y)}
                        className={cx("flex shrink-0 flex-col items-center justify-center gap-0.5 py-1", y === selected && "bg-navy/5")}
                        style={{ width: colW, minHeight: 48 }}
                        aria-label={`${line.label} ${y} : ${evs.length} événement(s)`}
                      >
                        {evs.slice(0, 2).map((e) => (
                          <span key={e.id} className={cx("flex h-5 w-5 items-center justify-center rounded-full", KIND_STYLE[e.kind].color, e.source === "scenario" && "opacity-60")}>
                            {KIND_STYLE[e.kind].icon}
                          </span>
                        ))}
                        {evs.length > 2 && <span className="text-[10px] font-semibold text-ink-2">+{evs.length - 2}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-ink-2">
          {(["loan_end", "works", "sale", "balloon", "event"] as EventKind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className={cx("flex h-3.5 w-3.5 items-center justify-center rounded-full", KIND_STYLE[k].color)} />
              {KIND_STYLE[k].label}
            </span>
          ))}
        </div>

        {/* Photographie de l'année */}
        <div className="mt-6 flex items-center justify-between px-1">
          <button onClick={() => setSelected(Math.max(y0, selected - 1))} className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-navy shadow-sm" aria-label="Année précédente">
            <ChevronLeft size={22} />
          </button>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted">Photographie</div>
            <div className="tabular text-[30px] font-bold text-navy">{selected}</div>
          </div>
          <button onClick={() => setSelected(Math.min(y0 + 30, selected + 1))} className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-navy shadow-sm" aria-label="Année suivante">
            <ChevronRight size={22} />
          </button>
        </div>
        <input
          type="range"
          min={y0}
          max={y0 + 30}
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="mt-2 w-full accent-[#0b2545]"
          aria-label="Choisir une année"
        />
        {row && (
          <Card className="mt-3">
            <div className="grid grid-cols-2 gap-4">
              <Kpi label="Valeur patrimoniale" value={projection.snapshot.total.unvalued > 0 ? "—" : eurCompact(row.value)} />
              <Kpi label="Dette restante" value={eurCompact(row.debt)} />
              <Kpi label="Patrimoine net" value={projection.snapshot.total.unvalued > 0 ? "—" : eurCompact(row.net)} />
              <Kpi label="Trésorerie cumulée" value={eurCompact(row.treasury)} />
              <Kpi label="Loyers / mois" value={eurCompact(row.rent / 12)} />
              <Kpi label="Mensualités / mois" value={eurCompact(row.payments / 12)} />
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
              <Kpi label="Cash-flow estimé / mois" value={eurSigned(row.cashflow / 12)} tone={row.cashflow >= 0 ? "pos" : "neg"} big />
              <div className="text-right text-sm text-muted">
                <div>{eurSigned(row.cashflow)} / an</div>
                <div>{row.activeLoans} crédit(s) en cours</div>
              </div>
            </div>
            {(row.works > 0 || row.balloons > 0 || row.withdrawals > 0 || row.operations !== 0) && (
              <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                {row.works > 0 && <Line label="Travaux" value={-row.works} />}
                {row.balloons > 0 && <Line label="Remboursements in fine" value={-row.balloons} />}
                {row.withdrawals > 0 && <Line label="Sorties personnelles" value={-row.withdrawals} />}
                {row.operations !== 0 && <Line label="Opérations (ventes, achats…)" value={row.operations} />}
              </div>
            )}
          </Card>
        )}
        {yearEvents.length > 0 && (
          <Card className="mt-3 py-2">
            <div className="divide-y divide-line">
              {yearEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", KIND_STYLE[e.kind].color)}>{KIND_STYLE[e.kind].icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] text-ink">{e.label}</div>
                    <div className="truncate text-xs text-muted">{companyLabel(data, e.companyKey)}{e.source === "plan" ? " · opération validée" : ""}</div>
                  </div>
                  <div className="tabular shrink-0 text-sm font-semibold">
                    {e.monthlyFreed ? <span className="text-pos">+{eurCompact(e.monthlyFreed)}/m</span> : e.amount ? eurCompact(e.amount) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <SectionTitle>Projection</SectionTitle>
        <Card>
          <div className="mb-1 text-sm font-semibold text-ink">Dette restante</div>
          <LineChart years={years} series={[{ label: "Dette restante", values: projection.years.map((r) => r.debt), color: "var(--series-1)" }]} selectedYear={selected} onSelectYear={setSelected} height={160} />
        </Card>
        <Card className="mt-3">
          <div className="mb-1 text-sm font-semibold text-ink">Cash-flow annuel</div>
          <BarChart years={years} values={projection.years.map((r) => r.cashflow)} selectedYear={selected} onSelectYear={setSelected} label="Cash-flow" height={150} />
        </Card>
        {projection.snapshot.total.unvalued === 0 && (
        <Card className="mt-3">
          <div className="mb-1 text-sm font-semibold text-ink">Patrimoine net</div>
          <LineChart years={years} series={[{ label: "Patrimoine net", values: projection.years.map((r) => r.net), color: "var(--series-1)" }]} selectedYear={selected} onSelectYear={setSelected} height={160} />
        </Card>
        )}
        <p className="mt-4 px-2 text-center text-xs text-muted">
          Opérations datées au 1er janvier de l&apos;année. L&apos;année en cours est annualisée.
        </p>
      </Page>
    </>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-2">{label}</span>
      <span className={cx("tabular font-medium", value >= 0 ? "text-pos" : "text-neg")}>{eur(value)}</span>
    </div>
  );
}
