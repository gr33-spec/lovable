"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ChevronRight, CircleAlert, Flag, Hammer, Landmark, ShoppingCart, BadgeEuro, RefreshCw, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { cashflowMonthly, ltv, netWorth } from "@/lib/engine/snapshot";
import { milestones, type Milestone } from "@/lib/engine/milestones";
import { qualityIssues } from "@/lib/engine/quality";
import { eur, eurCompact, eurSigned, pct } from "@/lib/format";
import { Card, Kpi, Page, SectionTitle, Segmented, cx, Insufficient } from "@/components/ui";
import { BarChart, LineChart } from "@/components/charts";
import { yearOf } from "@/lib/engine/dates";

const HORIZONS = [5, 10, 15, 20, 30];

export default function Accueil() {
  const { data, projection, nowMonth } = useStore();
  const snap = projection.snapshot;
  const t = snap.total;
  const [chart, setChart] = useState<"net" | "debt" | "cf">("net");
  const [horizon, setHorizon] = useState(10);
  const y0 = yearOf(nowMonth);

  const steps = useMemo(() => milestones(data, projection, 6), [data, projection]);
  const issues = useMemo(() => qualityIssues(data, snap), [data, snap]);
  const cf = cashflowMonthly(t);
  const loanToValue = ltv(t);
  const sciCount = data.companies.filter((c) => c.kind !== "holding").length;
  const years = projection.years.map((r) => r.year);
  const future = projection.years.find((r) => r.year === y0 + horizon);
  const hasData = t.buildings > 0 || t.loans > 0;
  const upcomingEnds = projection.events.filter((e) => e.kind === "loan_end").slice(0, 5);

  return (
    <>
      <header className="safe-top px-5 pb-2 pt-5">
        <div className="mx-auto max-w-2xl">
          <div className="text-sm text-muted">{data.settings.groupName || "Mon patrimoine"}</div>
          <h1 className="text-[28px] font-bold tracking-tight text-navy">Vue d&apos;ensemble</h1>
        </div>
      </header>
      <Page>
        {/* Carte principale */}
        <div className="mt-2 rounded-[28px] bg-gradient-to-br from-navy to-navy-2 p-6 text-white shadow-[0_12px_32px_rgba(11,37,69,0.25)]">
          <div className="text-[13px] text-white/60">Patrimoine net</div>
          <div className="tabular mt-0.5 text-[40px] font-bold leading-tight tracking-tight">
            {t.value > 0 || t.debt > 0 ? eur(netWorth(t)) : <span className="text-2xl text-white/70">Données insuffisantes</span>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[13px] text-white/60">Valeur des biens</div>
              <div className="tabular text-[19px] font-semibold">{eurCompact(t.value)}</div>
            </div>
            <div>
              <div className="text-[13px] text-white/60">Capital restant dû</div>
              <div className="tabular text-[19px] font-semibold">{eurCompact(t.debt)}</div>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-[13px] text-white/60">
              <span>LTV globale</span>
              <span className="tabular font-semibold text-white">{loanToValue === undefined ? "—" : pct(loanToValue)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, loanToValue ?? 0)}%` }} />
            </div>
          </div>
          {(t.unvalued > 0 || t.unknownDebt > 0) && (
            <div className="mt-3 text-xs text-white/60">
              {t.unvalued > 0 && `${t.unvalued} immeuble(s) sans valeur`}
              {t.unvalued > 0 && t.unknownDebt > 0 && " · "}
              {t.unknownDebt > 0 && `${t.unknownDebt} crédit(s) sans capital restant dû`}
            </div>
          )}
        </div>

        {/* Flux */}
        <Card className="mt-4">
          <div className="flex items-end justify-between">
            <Kpi label="Cash-flow mensuel" value={hasData ? eurSigned(cf) : "—"} tone={cf >= 0 ? "pos" : "neg"} big />
            <div className="text-right">
              <div className="text-[13px] text-muted">Par an</div>
              <div className={cx("tabular text-[17px] font-semibold", cf >= 0 ? "text-pos" : "text-neg")}>{hasData ? eurSigned(cf * 12) : "—"}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <Kpi label="Loyers" value={eurCompact(t.rentMonthly)} hint="par mois" />
            <Kpi label="Mensualités" value={eurCompact(t.paymentsMonthly)} hint={t.unknownPayment ? "incomplet" : "par mois"} />
            <Kpi label="Charges" value={eurCompact(t.chargesAnnual / 12)} hint="par mois" />
          </div>
          {t.unknownPayment > 0 && (
            <Link href="/plus/a-completer" className="mt-3 block rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">
              Cash-flow incomplet : {t.unknownPayment} crédit(s) sans mensualité connue.
            </Link>
          )}
        </Card>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { n: sciCount, l: "Sociétés" },
            { n: t.buildings, l: "Immeubles" },
            { n: t.units, l: "Logements" },
            { n: t.loans, l: "Crédits" },
          ].map((x) => (
            <Link key={x.l} href="/patrimoine" className="rounded-2xl bg-card px-2 py-3 text-center shadow-[0_1px_2px_rgba(15,27,45,0.04)]">
              <div className="tabular text-[22px] font-bold text-navy">{x.n}</div>
              <div className="text-[11px] text-muted">{x.l}</div>
            </Link>
          ))}
        </div>

        {t.cash > 0 && (
          <Card className="mt-4">
            <div className="flex items-center justify-between">
              <Kpi label="Trésorerie des sociétés" value={eur(t.cash)} />
              {t.partnerAccounts > 0 && <Kpi label="Comptes courants" value={eurCompact(t.partnerAccounts)} />}
            </div>
          </Card>
        )}

        {issues.length > 0 && (
          <Link href="/plus/a-completer" className="mt-4 flex items-center gap-3 rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">
            <CircleAlert size={18} />
            <span className="flex-1">
              {issues.length} élément{issues.length > 1 ? "s" : ""} à compléter pour des calculs précis
            </span>
            <ChevronRight size={16} />
          </Link>
        )}

        {/* Grandes étapes */}
        <SectionTitle action={<Link href="/chronologie" className="text-sm font-medium text-series-1">Chronologie</Link>}>
          Les prochaines grandes étapes
        </SectionTitle>
        <Card className="py-2">
          {steps.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted">Aucune échéance à venir. Ajoutez vos crédits et travaux.</div>
          ) : (
            <div className="divide-y divide-line">
              {steps.map((m, i) => (
                <MilestoneRow key={i} m={m} />
              ))}
            </div>
          )}
        </Card>

        {/* Projection */}
        <SectionTitle>Projection sur 30 ans</SectionTitle>
        <Card>
          <Segmented
            value={chart}
            onChange={setChart}
            options={[
              { value: "net", label: "Patrimoine net" },
              { value: "debt", label: "Dette" },
              { value: "cf", label: "Cash-flow" },
            ]}
          />
          <div className="mt-4">
            {chart === "net" && (
              <LineChart years={years} series={[{ label: "Patrimoine net", values: projection.years.map((r) => r.net), color: "var(--series-1)" }]} />
            )}
            {chart === "debt" && (
              <LineChart
                years={years}
                series={[{ label: "Capital restant dû", values: projection.years.map((r) => r.debt), color: "var(--series-1)" }]}
                markers={[...new Set(upcomingEnds.map((e) => e.year))]}
              />
            )}
            {chart === "cf" && <BarChart years={years} values={projection.years.map((r) => r.cashflow)} label="Cash-flow annuel" />}
          </div>
          <div className="mt-1 text-xs text-muted">
            {chart === "cf" ? "Loyers − charges − mensualités, par an." : "Touchez le graphique pour lire une année."}
          </div>
        </Card>

        {/* Horizons */}
        <SectionTitle>Et dans…</SectionTitle>
        <Card>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={cx(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
                  horizon === h ? "bg-navy text-white" : "bg-soft text-navy",
                )}
              >
                {h} ans
              </button>
            ))}
          </div>
          {future ? (
            <div className="mt-4">
              <div className="text-sm text-muted">En {future.year}</div>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <Kpi label="Patrimoine net" value={eurCompact(future.net)} />
                <Kpi label="Dette restante" value={eurCompact(future.debt)} />
                <Kpi label="Cash-flow / mois" value={eurSigned(future.cashflow / 12)} tone={future.cashflow >= 0 ? "pos" : "neg"} />
                <Kpi label="Crédits en cours" value={String(future.activeLoans)} />
              </div>
            </div>
          ) : (
            <Insufficient />
          )}
          {projection.incompleteLoans.length > 0 && (
            <div className="mt-3 text-xs text-warn">
              Projection partielle : {projection.incompleteLoans.length} crédit(s) sans échéancier calculable (dette maintenue constante).
            </div>
          )}
        </Card>

        {/* Fins de crédits */}
        {upcomingEnds.length > 0 && (
          <>
            <SectionTitle>Prochaines fins de crédits</SectionTitle>
            <Card className="py-2">
              <div className="divide-y divide-line">
                {upcomingEnds.map((e) => (
                  <Link key={e.id} href={e.loanId && !e.loanId.startsWith("loan-") ? `/patrimoine/credit/${e.loanId}` : "/chronologie"} className="flex items-center gap-3 py-3">
                    <div className="tabular w-12 text-[17px] font-bold text-navy">{e.year}</div>
                    <div className="min-w-0 flex-1 truncate text-[15px] text-ink">{e.label.replace(/^Fin — /, "")}</div>
                    <div className="tabular text-sm font-semibold text-pos">+{eurCompact(e.monthlyFreed)}/mois</div>
                  </Link>
                ))}
              </div>
            </Card>
          </>
        )}
        <p className="mt-6 px-2 text-center text-xs text-muted">
          Hypothèses : valeurs {pct(data.settings.valueGrowthPct ?? 0)}/an · loyers {pct(data.settings.rentGrowthPct ?? 0)}/an ·{" "}
          <Link href="/plus/hypotheses" className="underline">modifier</Link>
        </p>
      </Page>
    </>
  );
}

const KIND_ICON: Record<string, React.ReactNode> = {
  loan_end: <Landmark size={18} />,
  balloon: <BadgeEuro size={18} />,
  works: <Hammer size={18} />,
  sale: <TrendingUp size={18} />,
  purchase: <ShoppingCart size={18} />,
  refinance: <RefreshCw size={18} />,
  prepayment: <BadgeEuro size={18} />,
  event: <Flag size={18} />,
  acquisition: <ShoppingCart size={18} />,
};

function MilestoneRow({ m }: { m: Milestone }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="tabular w-12 shrink-0 text-[17px] font-bold text-navy">{m.year}</div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft text-navy">{KIND_ICON[m.kind] ?? <CalendarClock size={18} />}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-ink">{m.label}</div>
        {m.detail && <div className="truncate text-xs text-muted">{m.detail}</div>}
      </div>
      {m.monthlyFreed ? (
        <div className="tabular shrink-0 text-right text-sm font-semibold text-pos">+{eurCompact(m.monthlyFreed)}<span className="block text-[11px] font-normal text-muted">par mois</span></div>
      ) : m.amount ? (
        <div className="tabular shrink-0 text-sm font-semibold text-ink">{eurCompact(m.amount)}</div>
      ) : null}
    </div>
  );
}
