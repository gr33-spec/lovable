"use client";

import { AnalysisEntry } from "@/components/analysis/entry";
import { usePageState } from "@/lib/nav";
import Link from "next/link";
import { useMemo } from "react";
import { BadgeEuro, Briefcase, Building2, CalendarClock, ChevronRight, CircleAlert, DoorOpen, Flag, Hammer, Landmark, Receipt, RefreshCw, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { cashflowMonthly, ltv, netWorth, rentalCharges, rentalPayments } from "@/lib/engine/snapshot";
import { milestones, type Milestone } from "@/lib/engine/milestones";
import { issueCounts, qualityIssues } from "@/lib/engine/quality";
import { unpaidByUnit } from "@/lib/engine/leases";
import { portfolioIndicators } from "@/lib/engine/indicators";
import { IndicatorTile } from "@/components/indicators";
import { RemindersCard } from "@/components/leases";
import { todayIso } from "@/lib/engine/leases";
import { allReminders } from "@/lib/reminders";
import { eur, eurCompact, eurSigned, pct } from "@/lib/format";
import { Card, IconChip, Kpi, Page, SectionTitle, Segmented, cx, type ChipTone } from "@/components/ui";
import { BarChart, LineChart } from "@/components/charts";

export default function Accueil() {
  const { data, projection } = useStore();
  const snap = projection.snapshot;
  const t = snap.total;
  const [chart, setChart] = usePageState<"net" | "debt" | "cf">("graphique", "net");

  const steps = useMemo(() => milestones(data, projection, 6), [data, projection]);
  const issues = useMemo(() => qualityIssues(data, snap), [data, snap]);
  const counts = issueCounts(issues);
  // Chiffres approchés : mêmes règles que le dossier banque (mensualités estimées, charges manquantes).
  const missingCharges = issues.filter((i) => i.id.startsWith("c-")).length;
  const cfMark = t.unknownPayment > 0 ? "env. " : missingCharges > 0 ? "max. " : "";
  const unpaid = useMemo(() => unpaidByUnit(data.units), [data.units]);
  const unpaidTotal = unpaid.reduce((s, l) => s + l.amount, 0);
  const vacantUnits = data.units.filter((u) => u.status === "vacant");
  const cf = cashflowMonthly(t);
  const loanToValue = ltv(t);
  const companyCount = data.companies.length;
  const years = projection.years.map((r) => r.year);
  const hasData = t.buildings > 0 || t.loans > 0;
  const keyIndicators = useMemo(() => {
    const all = portfolioIndicators(data, projection);
    const pick = ["dscr", "ltv", "gross-yield", "occupancy"];
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
                <span className="block text-[22px] font-bold text-white/80">{hasData ? "Données insuffisantes" : "Aucun bien pour l'instant"}</span>
                {!hasData && (
                  <Link href="/patrimoine" className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white">
                    Ajouter une société ou un immeuble <ChevronRight size={14} />
                  </Link>
                )}
                {t.unvalued > 0 && (
                  <Link href="/plus/a-completer" className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white">
                    Estimer la valeur de {t.unvalued} bien{t.unvalued > 1 ? "s" : ""} <ChevronRight size={14} />
                  </Link>
                )}
              </span>
            )}
          </div>
          <HeroSpark
            values={(t.unvalued > 0 ? projection.years.map((r) => r.debt) : projection.years.map((r) => r.net)).slice(0, 21)}
            label={t.unvalued > 0 ? "Capital restant dû, 20 prochaines années" : "Patrimoine net, 20 prochaines années"}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/10">
              <div className="text-[12px] text-white/60">Valeur des biens</div>
              <div className="tabular text-[19px] font-bold">{t.value > 0 ? `${t.unvalued > 0 ? "min. " : ""}${eurCompact(t.value)}` : "—"}</div>
              {t.unvalued > 0 && t.value > 0 && <div className="text-[11px] text-white/55">{t.buildings - t.unvalued} bien(s) sur {t.buildings} estimé(s)</div>}
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
              {t.unvalued > 0 && `${t.unvalued} bien(s) sans valeur`}
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
              <div className="text-[13px] text-muted">Cash-flow locatif mensuel</div>
              <div className={cx("tabular text-[30px] font-extrabold leading-tight tracking-[-0.02em]", cf >= 0 ? "text-pos" : "text-neg")}>
                {hasData ? (
                  <>
                    {cfMark && <span className="mr-1 text-[16px] font-bold">{cfMark.trim()}</span>}
                    {eurSigned(cf)}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[12px] text-muted">Par an</div>
              <div className={cx("tabular text-[16px] font-bold", cf >= 0 ? "text-pos" : "text-neg")}>{hasData ? eurSigned(cf * 12) : "—"}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <FlowTile icon={<Wallet size={17} />} tone="green" label="Loyers" value={eurCompact(t.rentMonthly)} hint="/ mois" />
            <FlowTile icon={<Landmark size={17} />} tone="blue" label="Crédits" value={eurCompact(rentalPayments(t))} hint={t.unknownPayment ? "dont estimés" : "/ mois"} />
            <FlowTile icon={<Receipt size={17} />} tone="gold" label="Charges" value={eurCompact(rentalCharges(t) / 12)} hint={missingCharges ? "incomplètes" : "/ mois"} />
          </div>
          {t.personalPaymentsMonthly > 0 && <div className="mt-2 text-[12px] text-muted">Hors crédit personnel (résidence principale) : {eur(Math.round(t.personalPaymentsMonthly))} / mois.</div>}
          {(t.unknownPayment > 0 || missingCharges > 0) && (
            <Link href="/plus/a-completer" className="mt-3 flex items-center gap-2 rounded-xl bg-warn/10 px-3 py-2 text-xs font-medium text-warn">
              <CircleAlert size={14} />
              <span>
                {[t.unknownPayment > 0 ? `${t.unknownPayment} mensualité(s) estimée(s) ou inconnue(s)` : "", missingCharges > 0 ? `charges non renseignées pour ${missingCharges} bien(s) (cash-flow surestimé)` : ""].filter(Boolean).join(" · ")}
              </span>
            </Link>
          )}
          {t.units > 0 && (
            <Link href="/gestion" className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-black/[0.03] px-3 py-2.5 text-[13px]">
              <span className="text-ink-2">
                <b className="text-ink">{t.units - t.vacantUnits}</b> lots loués sur {t.units}
                {vacantUnits.length > 0 && <span className="text-warn"> · {vacantUnits.length} vacant{vacantUnits.length > 1 ? "s" : ""}</span>}
              </span>
              <span className={cx("shrink-0 font-semibold", unpaidTotal > 0 ? "text-neg" : "text-pos")}>{unpaidTotal > 0 ? `${eur(Math.round(unpaidTotal))} impayés` : "Aucun impayé"}</span>
            </Link>
          )}
        </Card>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { n: companyCount, l: "Sociétés", icon: <Briefcase size={16} />, tone: "violet" as const },
            { n: t.buildings, l: "Biens", icon: <Building2 size={16} />, tone: "blue" as const },
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
          <Link href="/plus/a-completer" className={cx("mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm", counts.important ? "bg-warn/10 text-warn" : "bg-black/[0.03] text-ink-2")}>
            <CircleAlert size={18} />
            <span className="flex-1">
              {counts.important
                ? `${counts.important} point${counts.important > 1 ? "s" : ""} important${counts.important > 1 ? "s" : ""} à compléter`
                : `Chiffres complets · ${counts.utile} information${counts.utile > 1 ? "s" : ""} utile${counts.utile > 1 ? "s" : ""} à ajouter`}
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
              <div className="py-8 text-center text-sm text-muted">Données insuffisantes : valeur estimée manquante pour {t.unvalued} bien(s).</div>
            )}
            {chart === "net" && t.unvalued === 0 && (
              <LineChart years={years} series={[{ label: "Patrimoine net", values: projection.years.map((r) => r.net), color: "var(--brand)" }]} />
            )}
            {chart === "debt" && (
              <LineChart
                years={years}
                series={[{ label: "Capital restant dû", values: projection.years.map((r) => r.debt), color: "var(--brand)" }]}
                markers={[...new Set(projection.events.filter((e) => e.kind === "loan_end").slice(0, 5).map((e) => e.year))]}
              />
            )}
            {chart === "cf" && <BarChart years={years} values={projection.years.map((r) => r.cashflow)} label="Cash-flow annuel" />}
          </div>
          <div className="mt-1 text-xs text-muted">
            {chart === "cf" ? "Cash-flow locatif : loyers − charges − mensualités, par an." : "Touchez le graphique pour lire une année."}
          </div>
          {projection.incompleteLoans.length > 0 && (
            <div className="mt-2 text-xs text-warn">
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
