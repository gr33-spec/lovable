"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Flag, PartyPopper, Plus } from "lucide-react";
import { KIND_STYLE } from "@/components/event-style";
import { useStore } from "@/lib/store";
import { NO_COMPANY, companyTree } from "@/lib/engine/snapshot";
import type { TimelineEvent, YearRow } from "@/lib/engine/projection";
import { companyLabel } from "@/lib/engine/milestones";
import { yearOf } from "@/lib/engine/dates";
import { eur, eurCompact, eurSigned } from "@/lib/format";
import { LineChart } from "@/components/charts";
import { remunerationYear } from "@/lib/fiscal/remuneration";
import { Card, Page, PageHeader, SectionTitle, cx } from "@/components/ui";

// Chronologie : ce qui change, et quand. Un escalier du cash-flow mensuel,
// puis une carte par année où il se passe quelque chose.

const ALL = "__all";

/** Lien vers l'élément à l'origine de l'événement. */
function hrefOf(e: TimelineEvent): string | undefined {
  if (e.id.startsWith("project-") && e.refId) return `/patrimoine/projet/${e.refId}`;
  if (e.source === "plan") return "/simulations";
  if ((e.kind === "loan_end" || e.kind === "balloon" || e.kind === "prepayment") && e.loanId && !e.loanId.startsWith("loan-")) return `/patrimoine/credit/${e.loanId}`;
  if (e.kind === "works") return "/plus/travaux";
  if (e.kind === "event") return "/plus/evenements";
  if (e.kind === "income") return "/plus/remuneration";
  if (e.kind === "acquisition" && e.refId) return `/patrimoine/immeuble/${e.refId}`;
  return undefined;
}

/** Libellé lisible : « Fin — Prêt X » devient « Fin du crédit : Prêt X ». */
function labelOf(e: TimelineEvent): string {
  if (e.kind === "loan_end") return e.label.replace(/^Fin — /, "Fin du crédit · ");
  return e.label;
}

function EventAmount({ e }: { e: TimelineEvent }) {
  if (e.monthlyFreed) return <span className="text-pos">+{eur(e.monthlyFreed)}/mois</span>;
  if (!e.amount) return null;
  if (e.kind === "income") return <span className="text-ink">{eurCompact(e.amount)}/an</span>;
  const out = e.kind === "works" || e.kind === "balloon" || e.kind === "prepayment" || e.kind === "purchase";
  return <span className={out ? "text-neg" : "text-ink"}>{out ? "−" : ""}{eurCompact(Math.abs(e.amount))}</span>;
}

const monthly = (r: YearRow) => r.cashflow / 12;

export default function Chronologie() {
  const { data, projection, nowMonth } = useStore();
  const y0 = yearOf(nowMonth);
  const [scope, setScope] = useState<string>(ALL);

  // Sociétés concernées par au moins un événement (dans l'ordre de l'organigramme).
  const scopes = useMemo(() => {
    const keys = new Set(projection.events.map((e) => e.companyKey));
    const list = companyTree(data.companies)
      .map(({ company }) => company)
      .filter((c) => keys.has(c.id))
      .map((c) => ({ key: c.id, label: c.name }));
    if (keys.has(NO_COMPANY)) list.push({ key: NO_COMPANY, label: "Hors société" });
    return list;
  }, [data.companies, projection.events]);

  const rows = scope === ALL ? projection.years : (projection.byCompany.get(scope) ?? []);
  const events = useMemo(
    () => projection.events.filter((e) => e.year >= y0 && (scope === ALL || e.companyKey === scope)),
    [projection.events, scope, y0],
  );

  const groups = useMemo(() => {
    const byYear = new Map<number, TimelineEvent[]>();
    for (const e of events) byYear.set(e.year, [...(byYear.get(e.year) ?? []), e]);
    return [...byYear.entries()].sort((a, b) => a[0] - b[0]);
  }, [events]);

  // « Grande année » : celle qui libère le plus de mensualités (au moins deux fins de crédit).
  const bigYear = useMemo(() => {
    let best: { year: number; freed: number } | undefined;
    for (const [year, list] of groups) {
      const ends = list.filter((e) => e.kind === "loan_end");
      const freed = ends.reduce((s, e) => s + (e.monthlyFreed ?? 0), 0);
      if (ends.length >= 2 && (!best || freed > best.freed)) best = { year, freed };
    }
    return best?.year;
  }, [groups]);

  const now = rows.find((r) => r.year === y0);
  const last = rows[rows.length - 1];
  const debtFree = rows.find((r) => r.year > y0 && r.debt < 1 && (now?.debt ?? 0) >= 1)?.year;
  // Situation une fois tous les crédits terminés (l'année suivant la dernière échéance, pleine).
  const endRow = debtFree ? (rows.find((r) => r.year === debtFree + 1) ?? rows.find((r) => r.year === debtFree)) : last;
  const loanYears = [...new Set(events.filter((e) => e.kind === "loan_end").map((e) => e.year))];
  const household = useMemo(() => (data.withdrawals.length ? projection.years.map((r) => remunerationYear(data, r.year, y0)) : []), [data, projection.years, y0]);
  const scopeName = scope === ALL ? undefined : scopes.find((s) => s.key === scope)?.label;

  return (
    <>
      <PageHeader
        title="Chronologie"
        back="/plus"
        subtitle={scopeName ? `${scopeName} · ${y0} → ${y0 + 30}` : "Ce qui change, et quand"}
        action={
          <Link href="/plus/evenements" className="flex h-10 items-center gap-1.5 rounded-full bg-soft px-4 text-sm font-semibold text-navy">
            <Plus size={15} /> Événement
          </Link>
        }
      />
      <Page>
        {scopes.length > 1 && (
          <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
            {[{ key: ALL, label: "Tout le groupe" }, ...scopes].map((s) => (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                className={cx("shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold", scope === s.key ? "bg-navy text-white" : "bg-soft text-ink-2")}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* L'escalier du cash-flow */}
        {rows.length > 1 && now && (
          <Card>
            <div className="text-[13px] text-muted">Cash-flow par mois</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className={cx("tabular text-[26px] font-extrabold", monthly(now) >= 0 ? "text-navy" : "text-neg")}>{eurSigned(monthly(now))}</span>
              <span className="text-[13px] text-muted">aujourd&apos;hui</span>
            </div>
            {endRow && endRow.year !== y0 && (
              <div className="text-[14px] text-ink-2">
                → <b className={cx("tabular", monthly(endRow) >= 0 ? "text-pos" : "text-neg")}>{eurSigned(monthly(endRow))}</b>{" "}
                {debtFree ? `à partir de ${debtFree + 1 <= last.year ? debtFree + 1 : debtFree}, sans aucun crédit` : `en ${endRow.year}`}
              </div>
            )}
            <div className="mt-3">
              <LineChart
                years={rows.map((r) => r.year)}
                series={[{ label: "Cash-flow / mois", values: rows.map((r) => Math.round(r.cashflow / 12)), color: "var(--series-1)" }]}
                markers={loanYears}
                height={170}
                step
              />
            </div>
            {loanYears.length > 0 && (
              <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold" /> Chaque marche = un ou plusieurs crédits terminés
              </div>
            )}
          </Card>
        )}

        {/* Revenus du foyer */}
        {scope === ALL && household.length > 1 && household.some((h) => h.net > 0) && (
          <Card className="mt-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] text-muted">Revenus nets du foyer, après cotisations et impôts</div>
              <Link href="/plus/remuneration" className="text-[13px] font-medium text-series-1">
                Régler
              </Link>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="tabular text-[22px] font-extrabold text-navy">{eur(Math.round(household[0].net / 12))}</span>
              <span className="text-[13px] text-muted">par mois en {household[0].year}</span>
            </div>
            <div className="mt-3">
              <LineChart years={household.map((h) => h.year)} series={[{ label: "Revenus nets / mois", values: household.map((h) => Math.round(h.net / 12)), color: "#7c5cc4" }]} height={130} step />
            </div>
          </Card>
        )}

        {/* Frise */}
        <SectionTitle>Année après année</SectionTitle>
        <div className="relative pl-6">
          <div className="absolute bottom-3 left-[9px] top-3 w-0.5 rounded bg-line" />

          <YearNode label="Aujourd'hui" tone="navy">
            {now ? (
              <Summary row={now} hint={`${now.activeLoans} crédit(s) en cours`} />
            ) : (
              <p className="text-[13px] text-muted">Données insuffisantes</p>
            )}
          </YearNode>

          {groups.length === 0 && (
            <Card className="mb-3">
              <p className="text-[14px] text-muted">Aucune échéance à venir{scopeName ? ` pour ${scopeName}` : ""}. Les fins de crédit, travaux et événements s&apos;afficheront ici.</p>
            </Card>
          )}

          {groups.map(([year, list]) => {
            // Situation une fois l'année passée (une fin de crédit en cours d'année ne pèse plus l'année suivante).
            const row = rows.find((r) => r.year === year + 1) ?? rows.find((r) => r.year === year);
            const big = year === bigYear;
            return (
              <YearNode
                key={year}
                label={String(year)}
                tone={year === debtFree ? "pos" : big ? "gold" : "line"}
                icon={year === debtFree ? <PartyPopper size={12} /> : undefined}
                badge={year === debtFree ? "Dernier crédit" : big ? "Grande année" : undefined}
              >
                <div className="divide-y divide-line">
                  {list.map((e) => {
                    const href = hrefOf(e);
                    const inner = (
                      <>
                        <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", KIND_STYLE[e.kind].color)}>{KIND_STYLE[e.kind].icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[14.5px] leading-snug text-ink">{labelOf(e)}</div>
                          <div className="truncate text-[12px] text-muted">
                            {scope === ALL ? companyLabel(data, e.companyKey) : KIND_STYLE[e.kind].label}
                            {e.id.startsWith("project-") ? " · projet" : e.source === "plan" ? " · opération validée" : ""}
                          </div>
                        </div>
                        <div className="tabular shrink-0 text-[13.5px] font-semibold">
                          <EventAmount e={e} />
                        </div>
                        {href && <ChevronRight size={16} className="shrink-0 text-muted" />}
                      </>
                    );
                    return href ? (
                      <Link key={e.id} href={href} className="flex items-center gap-3 py-2.5">
                        {inner}
                      </Link>
                    ) : (
                      <div key={e.id} className="flex items-center gap-3 py-2.5">
                        {inner}
                      </div>
                    );
                  })}
                </div>
                {row && <Summary row={row} after />}
                {year === debtFree && <div className="border-t border-line pb-1 pt-2.5 text-[14px] font-bold text-pos">Plus aucun crédit : tous les loyers restent disponibles.</div>}
              </YearNode>
            );
          })}

          {debtFree && !groups.some(([y]) => y === debtFree) && (
            <YearNode label={String(debtFree)} tone="pos" icon={<PartyPopper size={12} />}>
              <div className="py-2 text-[14px] font-bold text-pos">Plus aucun crédit : tous les loyers restent disponibles.</div>
            </YearNode>
          )}
          {!debtFree && (
            last &&
            last.year !== y0 && (
              <YearNode label={`En ${last.year}`} tone="line">
                <Summary row={last} />
              </YearNode>
            )
          )}
        </div>

        <p className="mt-4 px-2 text-center text-xs text-muted">
          Cash-flow = loyers − charges − mensualités, hors travaux et opérations ponctuelles. Hypothèses modifiables dans{" "}
          <Link href="/plus/hypotheses" className="underline">
            Hypothèses de projection
          </Link>
          .
        </p>
      </Page>
    </>
  );
}

/** Pastille d'année sur la frise, suivie de sa carte. */
function YearNode({
  label,
  tone,
  badge,
  icon,
  children,
}: {
  label: string;
  tone: "navy" | "gold" | "pos" | "line";
  badge?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const dot = { navy: "bg-navy", gold: "bg-gold", pos: "bg-pos", line: "bg-card ring-2 ring-line" }[tone];
  return (
    <div className="relative mb-4">
      <span className={cx("absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full text-white", dot)}>{icon ?? (tone === "gold" ? <Flag size={11} /> : null)}</span>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="tabular text-[17px] font-extrabold text-navy">{label}</span>
        {badge && <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", tone === "pos" ? "bg-pos/10 text-pos" : "bg-gold/15 text-gold")}>{badge}</span>}
      </div>
      <Card className="py-2">{children}</Card>
    </div>
  );
}

/** Situation en fin d'année : cash-flow mensuel et dette restante. */
function Summary({ row, after, hint }: { row: YearRow; after?: boolean; hint?: string }) {
  const cf = row.cashflow / 12;
  return (
    <div className={cx("flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-2 text-[13px]", after && "mt-1 border-t border-line pt-2.5")}>
      {after && <span className="text-muted">Ensuite :</span>}
      <span>
        <span className="text-muted">Cash-flow </span>
        <b className={cx("tabular", cf >= 0 ? "text-pos" : "text-neg")}>{eurSigned(cf)}/mois</b>
      </span>
      <span>
        <span className="text-muted">Dette </span>
        <b className="tabular text-ink">{eurCompact(row.debt)}</b>
      </span>
      {hint && <span className="text-muted">{hint}</span>}
    </div>
  );
}
