"use client";

import { AnalysisEntry } from "@/components/analysis/entry";
import { usePageState } from "@/lib/nav";
import Link from "next/link";
import { useMemo } from "react";
import { BadgeEuro, Briefcase, Building2, CalendarClock, ChevronRight, CircleAlert, DoorOpen, Flag, Hammer, Landmark, Receipt, RefreshCw, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { cashflowMonthly, ltv, netWorth } from "@/lib/engine/snapshot";
import { milestones, type Milestone } from "@/lib/engine/milestones";
import { qualityIssues } from "@/lib/engine/quality";
import { portfolioIndicators } from "@/lib/engine/indicators";
import { IndicatorTile } from "@/components/indicators";
import { RemindersCard } from "@/components/leases";
import { todayIso } from "@/lib/engine/leases";
import { allReminders } from "@/lib/reminders";
import { eur, eurCompact, eurSigned, pct } from "@/lib/format";
import { Card, IconChip, Kpi, Page, SectionTitle, Segmented, cx, Insufficient, type ChipTone } from "@/components/ui";
import { BarChart, LineChart } from "@/components/charts";
import { yearOf } from "@/lib/engine/dates";

const HORIZONS = [5, 10, 15, 20, 30];

export default function Accueil() {
  const { data, projection, nowMonth } = useStore();
  const snap = projection.snapshot;
  const t = snap.total;
  const [chart, setChart] = usePageState<"net" | "debt" | "cf">("graphique", "net");
  const [horizon, setHorizon] = usePageState("horizon", 10);
  const y0 = yearOf(nowMonth);

  const steps = useMemo(() => milestones(data, projection, 6), [data, projection]);
  const issues = useMemo(() => qualityIssues(data, snap), [data, snap]);
  const cf = cashflowMonthly(t);
  const loanToValue = ltv(t);
  const sciCount = data.companies.filter((c) => c.kind !== "holding").length;
  const years = projection.years.map((r) => r.year);
  const future = projection.years.find((r) => r.year === y0 + horizon);
  const hasData = t.buildings > 0 || t.loans > 0;
  const keyIndicators = useMemo(() => {
    const all = portfolioIndicators(data, projection);
    const pick = ["dscr", "occupancy", "avg-rate", "amortized-10"];
    return pick.map((id) => all.find((i) => i.id === id)).filter((i): i is NonNullable<typeof i> => !!i && t.loans + t.buildings > 0);
  }, [data, projection, t.loans, t.buildings]);
  const alerts = useMemo(() => allReminders(data, todayIso(), snap.resolvedLoans), [data, snap]);

  return (
    <>
      <header className="safe-top pb-2 pt-6">
        <div className="mx-auto max-w-2xl px-5 lg:max-w-[2000px] lg:px-9 xl:px-11">
          <div>
            <div className="flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.12em] text-gold">
              <span className="truncate">{data.settings.groupName || "Mon patrimoine"}</span>
              <span className="shrink-0 font-medium normal-case tracking-normal text-muted">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
            <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-navy">
              {data.settings.ownerName ? (
                <>
                  <span className="font-semibold text-ink-2">Bonjour</span> {data.settings.ownerName}
                </>
              ) : (
                "Vue d'ensemble"
              )}
            </h1>
          </div>
        </div>
      </header>
      <Page>
        {/* Ordinateur : deux colonnes (situation à gauche, perspectives à droite). */}
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <div className="min-w-0">
        {/* Carte principale */}
        <div className="hero-card mt-3 rounded-[30px] p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-medium text-white/65">Patrimoine net</div>
            {loanToValue !== undefined && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">LTV {pct(loanToValue)}</span>
            )}
          </div>
          <div className="tabular mt-1 text-[42px] font-extrabold leading-tight tracking-[-0.03em]">
            {netWorth(t) !== undefined && (t.value > 0 || t.debt > 0) ? (
              eur(netWorth(t))
            ) : (
              <span className="block tracking-normal">
                <span className="block text-[22px] font-bold text-white/80">Données insuffisantes</span>
                {t.unvalued > 0 && (
                  <Link href="/plus/a-completer" className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white">
                    Estimer la valeur de {t.unvalued} immeuble{t.unvalued > 1 ? "s" : ""} <ChevronRight size={14} />
                  </Link>
                )}
              </span>
            )}
          </div>
          <HeroSpark
            values={(t.unvalued > 0 ? projection.years.map((r) => r.debt) : projection.years.map((r) => r.net)).slice(0, 21)}
            label={t.unvalued > 0 ? "Dette restante, 20 prochaines années" : "Patrimoine net, 20 prochaines années"}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/10">
              <div className="text-[12px] text-white/60">Valeur des biens</div>
              <div className="tabular text-[19px] font-bold">{t.unvalued > 0 ? "—" : eurCompact(t.value)}</div>
            </div>
            <div className="rounded-2xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/10">
              <div className="text-[12px] text-white/60">Capital restant dû</div>
              <div className="tabular text-[19px] font-bold">{eurCompact(t.debt)}</div>
            </div>
          </div>
          {loanToValue !== undefined && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#d4b483] to-[#b08d57]" style={{ width: `${Math.min(100, loanToValue)}%` }} />
            </div>
          )}
          {(t.unvalued > 0 || t.unknownDebt > 0) && (
            <div className="mt-3 text-xs text-white/60">
              {t.unvalued > 0 && `${t.unvalued} immeuble(s) sans valeur`}
              {t.unvalued > 0 && t.unknownDebt > 0 && " · "}
              {t.unknownDebt > 0 && `${t.unknownDebt} crédit(s) sans capital restant dû`}
            </div>
          )}
        </div>

        <RemindersCard items={alerts} />
        <AnalysisEntry scope={{ type: "global" }} />

        {/* Flux */}
        <Card className="mt-4">
          <div className="flex items-center gap-3">
            <IconChip tone={cf >= 0 ? "green" : "rose"} size={46}>
              {cf >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </IconChip>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-muted">Cash-flow mensuel</div>
              <div className={cx("tabular text-[30px] font-extrabold leading-tight tracking-[-0.02em]", cf >= 0 ? "text-pos" : "text-neg")}>{hasData ? eurSigned(cf) : "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-[12px] text-muted">Par an</div>
              <div className={cx("tabular text-[16px] font-bold", cf >= 0 ? "text-pos" : "text-neg")}>{hasData ? eurSigned(cf * 12) : "—"}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <FlowTile icon={<Wallet size={17} />} tone="green" label="Loyers" value={eurCompact(t.rentMonthly)} hint="/ mois" />
            <FlowTile icon={<Landmark size={17} />} tone="blue" label="Crédits" value={eurCompact(t.paymentsMonthly)} hint={t.unknownPayment ? "incomplet" : "/ mois"} />
            <FlowTile icon={<Receipt size={17} />} tone="gold" label="Charges" value={eurCompact(t.chargesAnnual / 12)} hint="/ mois" />
          </div>
          {t.unknownPayment > 0 && (
            <Link href="/plus/a-completer" className="mt-3 flex items-center gap-2 rounded-xl bg-warn/10 px-3 py-2 text-xs font-medium text-warn">
              <CircleAlert size={14} /> Cash-flow incomplet : {t.unknownPayment} crédit(s) sans mensualité connue.
            </Link>
          )}
        </Card>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { n: sciCount, l: "Sociétés", icon: <Briefcase size={16} />, tone: "violet" as const },
            { n: t.buildings, l: "Immeubles", icon: <Building2 size={16} />, tone: "blue" as const },
            { n: t.units, l: "Lots", icon: <DoorOpen size={16} />, tone: "green" as const },
            { n: t.loans, l: "Crédits", icon: <Landmark size={16} />, tone: "gold" as const },
          ].map((x) => (
            <Link key={x.l} href="/patrimoine" className="soft-card flex flex-col items-center rounded-[20px] px-1 py-3 active:scale-[0.98]">
              <IconChip tone={x.tone} size={30}>{x.icon}</IconChip>
              <div className="tabular mt-1.5 text-[20px] font-extrabold leading-none text-navy">{x.n}</div>
              <div className="mt-1 text-[11px] font-medium text-muted">{x.l}</div>
            </Link>
          ))}
        </div>

        {keyIndicators.length > 0 && (
          <>
            <SectionTitle action={<Link href="/plus/indicateurs" className="text-sm font-medium text-series-1">Tout voir</Link>}>Indicateurs clés</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              {keyIndicators.map((i) => (
                <IndicatorTile key={i.id} ind={i} compact />
              ))}
            </div>
          </>
        )}

        </div>
        <div className="min-w-0 lg:mt-3 lg:[&>*:first-child]:mt-0">
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
            <div className="pt-2">
              {steps.map((m, i) => (
                <MilestoneRow key={i} m={m} last={i === steps.length - 1} />
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
            {chart === "net" && t.unvalued > 0 && (
              <div className="py-8 text-center text-sm text-muted">Données insuffisantes : valeur estimée manquante pour {t.unvalued} immeuble(s).</div>
            )}
            {chart === "net" && t.unvalued === 0 && (
              <LineChart years={years} series={[{ label: "Patrimoine net", values: projection.years.map((r) => r.net), color: "var(--series-1)" }]} />
            )}
            {chart === "debt" && (
              <LineChart
                years={years}
                series={[{ label: "Capital restant dû", values: projection.years.map((r) => r.debt), color: "var(--series-1)" }]}
                markers={[...new Set(projection.events.filter((e) => e.kind === "loan_end").slice(0, 5).map((e) => e.year))]}
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
                <Kpi label="Patrimoine net" value={t.unvalued > 0 ? "—" : eurCompact(future.net)} />
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

        </div>
        </div>
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

function MilestoneRow({ m, last }: { m: Milestone; last?: boolean }) {
  const tone = m.kind === "loan_end" ? "green" : m.kind === "works" ? "gold" : m.kind === "balloon" ? "rose" : m.kind === "event" ? "violet" : "blue";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <IconChip tone={tone} size={38}>{KIND_ICON[m.kind] ?? <CalendarClock size={18} />}</IconChip>
        {!last && <div className="my-1 w-0.5 flex-1 rounded-full bg-line" />}
      </div>
      <div className={cx("flex min-w-0 flex-1 items-start gap-2", last ? "pb-1" : "pb-4")}>
        <div className="min-w-0 flex-1">
          <div className="tabular text-[12px] font-bold tracking-wide text-gold">{m.year}</div>
          <div className="text-[15px] font-semibold leading-snug text-ink">{m.label}</div>
          {m.detail && <div className="truncate text-xs text-muted">{m.detail}</div>}
        </div>
        {m.monthlyFreed ? (
          <span className="tabular mt-3 shrink-0 rounded-full bg-pos/10 px-2.5 py-1 text-[12px] font-bold text-pos">+{eurCompact(m.monthlyFreed)}/m</span>
        ) : m.amount ? (
          <span className="tabular mt-3 shrink-0 rounded-full bg-soft px-2.5 py-1 text-[12px] font-bold text-ink">{eurCompact(m.amount)}</span>
        ) : null}
      </div>
    </div>
  );
}

function FlowTile({ icon, tone, label, value, hint }: { icon: React.ReactNode; tone: ChipTone; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-soft/70 px-3 py-3">
      <IconChip tone={tone} size={28}>{icon}</IconChip>
      <div className="mt-2 text-[12px] text-muted">{label}</div>
      <div className="tabular text-[17px] font-bold text-ink">{value}</div>
      <div className="text-[11px] text-muted">{hint}</div>
    </div>
  );
}

/** Mini-courbe blanche dans la carte principale. */
function HeroSpark({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2 || values.every((v) => v === values[0])) return null;
  const w = 300;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - ((v - min) / (max - min || 1)) * (h - 8)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none" aria-label={label}>
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d4b483" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d4b483" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#spark-fill)" />
        <path d={d} fill="none" stroke="#e8d3ad" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="text-[11px] text-white/50">{label}</div>
    </div>
  );
}
