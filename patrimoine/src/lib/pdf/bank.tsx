import { existsSync } from "node:fs";
import path from "node:path";
import { Document, Font, Line, Page, Path, Svg, Text, View } from "@react-pdf/renderer";
import type { AppData, Company, Project } from "../types";
import type { MonthIndex } from "../engine/dates";
import { monthLabel } from "../engine/dates";
import { NO_COMPANY, cashflowMonthly, companyTree, type Figures } from "../engine/snapshot";
import { halfDebtYear, type Projection } from "../engine/projection";
import { portfolioIndicators } from "../engine/indicators";
import { projectCompanyName, projectFigures } from "../engine/projects";
import type { ProjectImpact } from "../engine/project-impact";
import { eur, eurCompact, pct, pdfSafe, dateFr } from "../format";
import { CONDITIONS, UNIT_TYPES, labelOf } from "../labels";

// Dossier banque, format A4 portrait : court (6 à 8 pages), sans répétition,
// uniquement des chiffres connus. Deux usages :
//  - présentation du groupe (ou d'une seule société) ;
//  - dossier de financement d'un projet, suivi du groupe en résumé.
// Tous les chiffres viennent des moteurs de l'application.

// ——— Police ———
const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");
const HAS_INTER = existsSync(path.join(FONT_DIR, "inter-latin-400-normal.woff"));
if (HAS_INTER) {
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(FONT_DIR, "inter-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "inter-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "inter-latin-700-normal.woff"), fontWeight: 700 },
      { src: path.join(FONT_DIR, "inter-latin-800-normal.woff"), fontWeight: 800 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
}
const FONT = HAS_INTER ? "Inter" : "Helvetica";
const W600 = HAS_INTER ? { fontFamily: "Inter", fontWeight: 600 as const } : { fontFamily: "Helvetica-Bold" };
const W700 = HAS_INTER ? { fontFamily: "Inter", fontWeight: 700 as const } : { fontFamily: "Helvetica-Bold" };
const W800 = HAS_INTER ? { fontFamily: "Inter", fontWeight: 800 as const } : { fontFamily: "Helvetica-Bold" };

// ——— Charte ———
const NAVY = "#0b2545";
const BLUE = "#2a5bd7";
const SOFT = "#f1f3f8";
const SOFT2 = "#f8f9fc";
const GOLD = "#b08d57";
const INK = "#0f1b2d";
const INK2 = "#4b5567";
const MUTED = "#8a93a3";
const LINE = "#e3e6ef";
const POS = "#0f8a5f";
const NEG = "#c73a3a";

const PW = 595.28;
const MX = 44;
const CW = PW - MX * 2;

const T = (s: string | undefined) => pdfSafe(s ?? "");
const E = (n: number | undefined) => (n === undefined ? "—" : pdfSafe(eur(n)));
const K = (n: number | undefined) => (n === undefined ? "—" : pdfSafe(eurCompact(n)));
const P = (n: number | undefined, d = 1) => (n === undefined ? "—" : pdfSafe(pct(n, d)));
const S = (n: number) => pdfSafe(`${n >= 0 ? "+" : "−"}${eur(Math.abs(n))}`);

const base = { fontFamily: FONT, fontSize: 9, color: INK };

// ——— Mise en page ———

function Footer({ label }: { label: string }) {
  return (
    <View fixed style={{ position: "absolute", bottom: 20, left: MX, right: MX, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED }}>
      <Text>{T(label)}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Sheet({ label, kicker, title, children }: { label: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <Page size="A4" style={{ ...base, paddingTop: 44, paddingBottom: 52, paddingHorizontal: MX }} wrap>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <View style={{ width: 14, height: 2, backgroundColor: GOLD }} />
        <Text style={{ ...W600, fontSize: 7.5, color: GOLD, letterSpacing: 1.4, textTransform: "uppercase" }}>{T(kicker)}</Text>
      </View>
      <Text style={{ ...W800, fontSize: 20, color: NAVY, letterSpacing: -0.3, marginBottom: 14 }}>{T(title)}</Text>
      {children}
      <Footer label={label} />
    </Page>
  );
}

function H2({ children, top = 16 }: { children: string; top?: number }) {
  return <Text style={{ ...W700, fontSize: 11, color: NAVY, marginTop: top, marginBottom: 6 }}>{T(children)}</Text>;
}

function Para({ children }: { children: string }) {
  return <Text style={{ fontSize: 9, color: INK2, lineHeight: 1.5 }}>{T(children)}</Text>;
}

function Note({ children }: { children: string }) {
  return <Text style={{ fontSize: 7, color: MUTED, marginTop: 6, lineHeight: 1.4 }}>{T(children)}</Text>;
}

interface Kpi {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
}

function KpiGrid({ items, cols = 3, dark }: { items: Kpi[]; cols?: number; dark?: boolean }) {
  const gap = 8;
  const w = (CW - gap * (cols - 1)) / cols;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap }} wrap={false}>
      {items.map((k) => (
        <View key={k.label} style={{ width: w, backgroundColor: dark ? NAVY : SOFT, borderRadius: 7, paddingVertical: 10, paddingHorizontal: 11 }}>
          <Text style={{ fontSize: 7.5, color: dark ? "#b9c4dd" : INK2 }}>{T(k.label)}</Text>
          <Text style={{ ...W800, fontSize: 15, marginTop: 3, color: k.tone === "pos" ? (dark ? "#7fe0b0" : POS) : k.tone === "neg" ? (dark ? "#ff9b9b" : NEG) : dark ? "#ffffff" : NAVY }}>{T(k.value)}</Text>
          {k.sub && <Text style={{ fontSize: 7, color: dark ? "#8fa0c4" : MUTED, marginTop: 2 }}>{T(k.sub)}</Text>}
        </View>
      ))}
    </View>
  );
}

interface Col<R> {
  label: string;
  w: number;
  right?: boolean;
  get: (r: R) => string;
  bold?: boolean;
}

function Table<R>({ cols, rows, total, sub }: { cols: Col<R>[]; rows: R[]; total?: R; sub?: (r: R) => string | undefined }) {
  return (
    <View>
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NAVY, paddingBottom: 4, paddingHorizontal: 4 }} fixed>
        {cols.map((c) => (
          <Text key={c.label} style={{ ...W600, width: `${c.w}%`, fontSize: 6.8, color: INK2, textTransform: "uppercase", letterSpacing: 0.3, textAlign: c.right ? "right" : "left" }}>
            {T(c.label)}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} wrap={false} style={{ paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: LINE, backgroundColor: i % 2 ? SOFT2 : "#ffffff" }}>
          <View style={{ flexDirection: "row" }}>
            {cols.map((c) => (
              <Text key={c.label} style={[{ width: `${c.w}%`, fontSize: 8.2, textAlign: c.right ? "right" : "left" }, c.bold ? W600 : {}]}>
                {T(c.get(r))}
              </Text>
            ))}
          </View>
          {sub?.(r) && <Text style={{ fontSize: 7, color: MUTED, marginTop: 1 }}>{T(sub(r))}</Text>}
        </View>
      ))}
      {total && (
        <View wrap={false} style={{ flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, backgroundColor: NAVY, borderRadius: 4, marginTop: 3 }}>
          {cols.map((c) => (
            <Text key={c.label} style={{ ...W700, width: `${c.w}%`, fontSize: 8.2, color: "#ffffff", textAlign: c.right ? "right" : "left" }}>
              {T(c.get(total))}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: "row", marginBottom: 4 }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: GOLD, marginTop: 4, marginRight: 7 }} />
          <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.45, color: INK }}>{T(t)}</Text>
        </View>
      ))}
    </View>
  );
}

// ——— Graphiques (une seule échelle chacun) ———

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function Chart({ title, years, values, kind, width = CW, height = 120, color = BLUE }: { title: string; years: number[]; values: number[]; kind: "line" | "step"; width?: number; height?: number; color?: string }) {
  const left = 44;
  const bottom = 14;
  const iw = width - left - 6;
  const ih = height - bottom - 6;
  const maxV = niceMax(Math.max(0, ...values));
  const minV = Math.min(0, ...values) < 0 ? -niceMax(-Math.min(0, ...values)) : 0;
  const y = (v: number) => 6 + ih - ((v - minV) / (maxV - minV || 1)) * ih;
  const x = (i: number) => left + (years.length <= 1 ? 0 : (i / (years.length - 1)) * iw);
  const ticks = [minV, minV < 0 ? 0 : maxV / 2, maxV].filter((v, i, a) => a.indexOf(v) === i);
  const d =
    kind === "step"
      ? values.map((v, i) => (i === 0 ? `M${x(0)},${y(v)}` : `L${x(i)},${y(values[i - 1])} L${x(i)},${y(v)}`)).join(" ")
      : values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaD = `${d} L${x(values.length - 1)},${y(Math.max(minV, 0))} L${x(0)},${y(Math.max(minV, 0))} Z`;
  return (
    <View wrap={false}>
      <Text style={{ ...W600, fontSize: 8.5, color: NAVY, marginBottom: 4 }}>{T(title)}</Text>
      <View style={{ position: "relative", width, height }}>
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <Line key={t} x1={left} x2={width - 6} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c7cde0" : "#edf0f6"} strokeWidth={0.7} />
          ))}
          <Path d={areaD} fill={color} fillOpacity={0.08} />
          <Path d={d} stroke={color} strokeWidth={1.6} fill="none" />
        </Svg>
        {ticks.map((t) => (
          <Text key={`l${t}`} style={{ position: "absolute", left: 0, width: left - 6, top: y(t) - 4, fontSize: 6.3, color: MUTED, textAlign: "right" }}>
            {K(t)}
          </Text>
        ))}
        {years.map((yr, i) =>
          i % 5 === 0 || i === years.length - 1 ? (
            <Text key={yr} style={{ position: "absolute", left: x(i) - 14, width: 28, top: height - 10, fontSize: 6.3, color: MUTED, textAlign: "center" }}>
              {String(yr)}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

// ——— Modèle du groupe (ou d'une société) ———

interface GroupModel {
  name: string;
  f: Figures;
  indicators: Map<string, number | undefined>;
  buildings: {
    name: string;
    place: string;
    company: string;
    lots: number;
    acquisition: string;
    value?: number;
    rentAnnual: number;
    debt: number;
  }[];
  loansByCompany: { company: string; loans: { name: string; bank: string; initial?: number; balance?: number; monthly?: number; rate?: number; end?: string }[]; balance: number; monthly: number }[];
  capacity: { company: string; rent: number; charges: number; payments: number; cf: number; dscr?: number }[];
  highlights: string[];
  milestones: { year: number; label: string; freed: number }[];
  years: number[];
  debtSeries: number[];
  cfSeries: number[];
  statements: { company: string; year: number; revenue?: number; net?: number; caf?: number; equity?: number; bankDebt?: number; cash?: number }[];
}

function groupModel(data: AppData, p: Projection, name: string): GroupModel {
  const snap = p.snapshot;
  const f = snap.total;
  const indicators = new Map(portfolioIndicators(data, p).map((i) => [i.id, i.value]));
  const companyName = (id?: string | null) => (id ? data.companies.find((c) => c.id === id)?.name : undefined) ?? "En direct";

  const buildings = data.buildings.map((b) => {
    const bf = snap.byBuilding.get(b.id)!;
    return {
      name: b.name,
      place: [b.address, b.city].filter(Boolean).join(", "),
      company: companyName(b.companyId),
      lots: bf.units,
      acquisition: [b.acquisitionDate ? b.acquisitionDate.slice(0, 4) : undefined, b.acquisitionPrice ? K(b.acquisitionPrice) : undefined].filter(Boolean).join(" · "),
      value: bf.unvalued ? undefined : bf.value,
      rentAnnual: bf.rentMonthly * 12,
      debt: bf.debt,
    };
  });

  const byCompany = new Map<string, GroupModel["loansByCompany"][number]>();
  const buildingsById = new Map(data.buildings.map((b) => [b.id, b]));
  for (const l of data.loans) {
    const r = snap.resolvedLoans.get(l.id);
    if (!r || r.finished) continue;
    const now = snap.byLoan.get(l.id);
    const key = l.buildingId ? (buildingsById.get(l.buildingId)?.companyId ?? NO_COMPANY) : (l.companyId ?? NO_COMPANY);
    const label = key === NO_COMPANY ? "En direct" : companyName(key);
    const g = byCompany.get(label) ?? { company: label, loans: [], balance: 0, monthly: 0 };
    // Crédit signé mais pas encore débloqué : montant emprunté et mensualité à venir.
    const upcoming = r.fromMonth > snap.nowMonth;
    g.loans.push({
      name: l.name || "Crédit",
      bank: l.bank ?? "",
      initial: l.initialAmount,
      balance: upcoming ? (r.balance ?? l.initialAmount) : now?.balance,
      monthly: upcoming ? (r.payment !== undefined ? r.payment + r.insurance : undefined) : now?.paymentMonthly || undefined,
      rate: l.ratePct ?? r.impliedRatePct,
      end: r.endMonth !== undefined ? monthLabel(r.endMonth) : undefined,
    });
    g.balance += (upcoming ? (r.balance ?? l.initialAmount) : now?.balance) ?? 0;
    g.monthly += now?.paymentMonthly ?? 0;
    byCompany.set(label, g);
  }

  const capacity = companyTree(data.companies)
    .map(({ company }) => ({ company, own: snap.ownByCompany.get(company.id) }))
    .filter((x): x is { company: Company; own: Figures } => !!x.own && (x.own.rentMonthly > 0 || x.own.paymentsMonthly > 0))
    .map(({ company, own }) => {
      const charges = own.chargesAnnual / 12;
      return { company: company.name, rent: own.rentMonthly, charges, payments: own.paymentsMonthly, cf: cashflowMonthly(own), dscr: own.paymentsMonthly > 0 ? (own.rentMonthly - charges) / own.paymentsMonthly : undefined };
    });
  const direct = snap.ownByCompany.get(NO_COMPANY);
  if (direct && (direct.rentMonthly > 0 || direct.paymentsMonthly > 0)) {
    const charges = direct.chargesAnnual / 12;
    capacity.push({ company: "En direct", rent: direct.rentMonthly, charges, payments: direct.paymentsMonthly, cf: cashflowMonthly(direct), dscr: direct.paymentsMonthly > 0 ? (direct.rentMonthly - charges) / direct.paymentsMonthly : undefined });
  }

  const cf = cashflowMonthly(f);
  const occupancy = indicators.get("occupancy");
  const dscr = indicators.get("dscr");
  const half = halfDebtYear(p);
  const highlights: string[] = [];
  if (f.units > 0) highlights.push(`${f.buildings} immeuble(s), ${f.units} lots${occupancy !== undefined ? `, taux d'occupation de ${pct(occupancy)}` : ""}.`);
  if (cf > 0 && f.unknownPayment === 0) highlights.push(`Cash-flow positif de ${eur(Math.round(cf))} par mois, après charges et mensualités.`);
  if (dscr !== undefined && dscr >= 1.2 && f.unknownPayment === 0) highlights.push(`Loyers nets couvrant ${dscr.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} fois les mensualités de crédit.`);
  if (half) highlights.push(`Capital restant dû divisé par deux d'ici ${half}.`);

  const ends = new Map<number, { freed: number; names: string[] }>();
  for (const e of p.events.filter((x) => x.kind === "loan_end")) {
    const cur = ends.get(e.year) ?? { freed: 0, names: [] };
    cur.freed += e.monthlyFreed ?? 0;
    cur.names.push(e.label.replace(/^Fin — /, ""));
    ends.set(e.year, cur);
  }
  const milestones = [...ends.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, 8)
    .map(([year, v]) => ({ year, freed: v.freed, label: v.names.length > 2 ? `${v.names.length} crédits se terminent` : v.names.join(", ") }));

  const statements = companyTree(data.companies)
    .map(({ company }) => {
      const st = [...data.statements].filter((s) => s.companyId === company.id).sort((a, b) => b.year - a.year)[0];
      if (!st) return undefined;
      const fg = st.figures;
      return {
        company: company.name,
        year: st.year,
        revenue: fg.revenue,
        net: fg.netResult,
        caf: fg.netResult !== undefined && fg.depreciation !== undefined ? fg.netResult + fg.depreciation : undefined,
        equity: fg.equity,
        bankDebt: fg.bankDebt,
        cash: fg.cash,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const horizon = p.years.slice(0, 26);
  return {
    name,
    f,
    indicators,
    buildings,
    loansByCompany: [...byCompany.values()],
    capacity,
    highlights,
    milestones,
    years: horizon.map((r) => r.year),
    debtSeries: horizon.map((r) => r.debt),
    cfSeries: horizon.map((r) => Math.round(r.cashflow / 12)),
    statements,
  };
}

// ——— Pages du groupe ———

function SynthesisPage({ m, label, now }: { m: GroupModel; label: string; now: string }) {
  const f = m.f;
  const cf = cashflowMonthly(f);
  const valued = f.unvalued === 0 && f.value > 0;
  const kpis: Kpi[] = [
    { label: "Loyers annuels", value: K(f.rentMonthly * 12), sub: `${E(Math.round(f.rentMonthly))} par mois` },
    { label: "Capital restant dû", value: K(f.debt), sub: `${f.loans} crédit(s) en cours` },
    { label: "Mensualités", value: E(Math.round(f.paymentsMonthly)), sub: "par mois, assurance comprise" },
    { label: "Cash-flow", value: S(Math.round(cf)), sub: "par mois, après charges et crédits", tone: cf >= 0 ? "pos" : "neg" },
  ];
  const occ = m.indicators.get("occupancy");
  if (occ !== undefined) kpis.push({ label: "Taux d'occupation", value: P(occ), sub: `${f.units - f.vacantUnits} lots loués sur ${f.units}` });
  if (valued) kpis.push({ label: "Valeur estimée du patrimoine", value: K(f.value), sub: `Dette / valeur : ${P((f.debt / f.value) * 100)}` });
  if (f.cash > 0) kpis.push({ label: "Trésorerie des sociétés", value: K(f.cash) });
  return (
    <Sheet label={label} kicker="Synthèse" title={`${m.name} en un coup d'œil`}>
      <Para>{`Situation au ${now}. Chiffres issus des baux, des tableaux d'amortissement et des données de gestion.`}</Para>
      <View style={{ height: 10 }} />
      <KpiGrid items={kpis} />
      {m.highlights.length > 0 && (
        <>
          <H2>Points forts</H2>
          <Bullets items={m.highlights} />
        </>
      )}
      <Trajectory m={m} />
    </Sheet>
  );
}

function AssetsPage({ m, label }: { m: GroupModel; label: string }) {
  const total = { name: "Total", place: "", company: "", lots: m.buildings.reduce((s, b) => s + b.lots, 0), acquisition: "", value: m.buildings.every((b) => b.value !== undefined) ? m.buildings.reduce((s, b) => s + (b.value ?? 0), 0) : undefined, rentAnnual: m.buildings.reduce((s, b) => s + b.rentAnnual, 0), debt: m.buildings.reduce((s, b) => s + b.debt, 0) };
  return (
    <Sheet label={label} kicker="Patrimoine" title="État du patrimoine immobilier">
      <Table
        cols={[
          { label: "Immeuble", w: 30, get: (r) => r.name, bold: true },
          { label: "Société", w: 16, get: (r) => r.company },
          { label: "Lots", w: 7, right: true, get: (r) => String(r.lots || "—") },
          { label: "Acquisition", w: 14, right: true, get: (r) => r.acquisition || "—" },
          { label: "Valeur", w: 11, right: true, get: (r) => K(r.value) },
          { label: "Loyers / an", w: 11, right: true, get: (r) => K(r.rentAnnual) },
          { label: "Dette", w: 11, right: true, get: (r) => K(r.debt) },
        ]}
        rows={m.buildings}
        sub={(r) => r.place || undefined}
        total={total}
      />
      <Note>« — » : non communiqué. Valeurs estimées par le propriétaire ; aucune valeur n&apos;est extrapolée.</Note>
    </Sheet>
  );
}

function LoansPage({ m, label }: { m: GroupModel; label: string }) {
  if (m.loansByCompany.length === 0) return null;
  const totalBalance = m.loansByCompany.reduce((s, g) => s + g.balance, 0);
  const totalMonthly = m.loansByCompany.reduce((s, g) => s + g.monthly, 0);
  type Row = GroupModel["loansByCompany"][number]["loans"][number];
  const cols: Col<Row>[] = [
    { label: "Crédit", w: 27, get: (r) => r.name, bold: true },
    { label: "Banque", w: 17, get: (r) => r.bank || "—" },
    { label: "Montant initial", w: 12, right: true, get: (r) => K(r.initial) },
    { label: "Restant dû", w: 12, right: true, get: (r) => K(r.balance) },
    { label: "Mensualité", w: 11, right: true, get: (r) => E(r.monthly !== undefined ? Math.round(r.monthly) : undefined) },
    { label: "Taux", w: 8, right: true, get: (r) => (r.rate !== undefined ? P(r.rate, 2) : "—") },
    { label: "Fin", w: 13, right: true, get: (r) => r.end ?? "—" },
  ];
  return (
    <Sheet label={label} kicker="Financement" title="Crédits en cours">
      {m.loansByCompany.map((g) => (
        <View key={g.company} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }} wrap={false}>
            <Text style={{ ...W700, fontSize: 9.5, color: NAVY }}>{T(g.company)}</Text>
            <Text style={{ fontSize: 8, color: INK2 }}>{T(`${K(g.balance)} restant dû · ${E(Math.round(g.monthly))} / mois`)}</Text>
          </View>
          <Table cols={cols} rows={g.loans} />
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: NAVY, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8 }} wrap={false}>
        <Text style={{ ...W700, fontSize: 9, color: "#ffffff" }}>Total</Text>
        <Text style={{ ...W700, fontSize: 9, color: "#ffffff" }}>{T(`${K(totalBalance)} restant dû · ${E(Math.round(totalMonthly))} / mois`)}</Text>
      </View>
      <Note>Mensualités assurance comprise. Capital restant dû calculé à ce jour à partir des tableaux d&apos;amortissement ou des conditions du prêt.</Note>
    </Sheet>
  );
}

function CapacityPage({ m, label }: { m: GroupModel; label: string }) {
  const dscr = m.indicators.get("dscr");
  const effort = m.indicators.get("effort");
  const occ = m.indicators.get("occupancy");
  const ltv = m.indicators.get("ltv");
  const ratios: Kpi[] = [
    { label: "Couverture des mensualités (DSCR)", value: dscr !== undefined ? `${dscr.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}×` : "—", sub: "loyers nets ÷ mensualités" },
    { label: "Part des loyers consacrée aux crédits", value: P(effort), sub: "mensualités ÷ loyers" },
  ];
  if (occ !== undefined) ratios.push({ label: "Taux d'occupation", value: P(occ), sub: "lots loués ÷ lots" });
  if (ltv !== undefined) ratios.push({ label: "Dette / valeur (LTV)", value: P(ltv), sub: "capital restant dû ÷ valeur" });
  const tot = m.capacity.reduce((a, c) => ({ rent: a.rent + c.rent, charges: a.charges + c.charges, payments: a.payments + c.payments, cf: a.cf + c.cf }), { rent: 0, charges: 0, payments: 0, cf: 0 });
  return (
    <Sheet label={label} kicker="Capacité" title="Capacité de remboursement">
      <KpiGrid items={ratios} cols={ratios.length > 2 ? 2 : 2} />
      {m.capacity.length > 0 && (
        <>
          <H2>Par société, par mois</H2>
          <Table
            cols={[
              { label: "Société", w: 28, get: (r) => r.company, bold: true },
              { label: "Loyers", w: 15, right: true, get: (r) => E(Math.round(r.rent)) },
              { label: "Charges", w: 14, right: true, get: (r) => E(Math.round(r.charges)) },
              { label: "Mensualités", w: 15, right: true, get: (r) => E(Math.round(r.payments)) },
              { label: "Cash-flow", w: 15, right: true, get: (r) => S(Math.round(r.cf)) },
              { label: "DSCR", w: 13, right: true, get: (r) => (r.dscr !== undefined ? `${r.dscr.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}×` : "—") },
            ]}
            rows={m.capacity}
            total={{ company: "Total", ...tot, dscr: tot.payments > 0 ? (tot.rent - tot.charges) / tot.payments : undefined }}
          />
          <Note>Charges : taxe foncière, assurance, comptabilité et autres charges annuelles déclarées, ramenées au mois.</Note>
        </>
      )}
    </Sheet>
  );
}

function Trajectory({ m }: { m: GroupModel }) {
  const half = (CW - 12) / 2;
  return (
    <View wrap={false}>
      <H2>Trajectoire</H2>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Chart title="Capital restant dû" years={m.years} values={m.debtSeries} kind="line" width={half} height={100} />
        <Chart title="Cash-flow par mois" years={m.years} values={m.cfSeries} kind="step" width={half} height={100} color={POS} />
      </View>
      {m.milestones.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Table
            cols={[
              { label: "Fin de crédit", w: 14, get: (r) => String(r.year), bold: true },
              { label: "Crédit(s)", w: 62, get: (r) => r.label },
              { label: "Mensualité libérée", w: 24, right: true, get: (r) => `+${E(Math.round(r.freed))}` },
            ]}
            rows={m.milestones}
          />
        </View>
      )}
    </View>
  );
}

function AccountsPage({ m, label }: { m: GroupModel; label: string }) {
  if (m.statements.length === 0) return null;
  return (
    <Sheet label={label} kicker="Comptes" title="Comptes annuels">
      <Table
        cols={[
          { label: "Société", w: 22, get: (r) => r.company, bold: true },
          { label: "Exercice", w: 9, right: true, get: (r) => String(r.year) },
          { label: "Chiffre d'aff.", w: 12, right: true, get: (r) => K(r.revenue) },
          { label: "Résultat net", w: 12, right: true, get: (r) => K(r.net) },
          { label: "CAF", w: 11, right: true, get: (r) => K(r.caf) },
          { label: "Capitaux propres", w: 12, right: true, get: (r) => K(r.equity) },
          { label: "Dettes banc.", w: 11, right: true, get: (r) => K(r.bankDebt) },
          { label: "Trésorerie", w: 11, right: true, get: (r) => K(r.cash) },
        ]}
        rows={m.statements}
      />
      <Note>Derniers comptes approuvés disponibles. CAF approchée : résultat net + dotations aux amortissements.</Note>
    </Sheet>
  );
}

function Cover({ kicker, title, subtitle, lines, date }: { kicker: string; title: string; subtitle?: string; lines: string[]; date: string }) {
  return (
    <Page size="A4" style={{ ...base, padding: 0 }}>
      <View style={{ backgroundColor: NAVY, height: 330, paddingHorizontal: MX, paddingTop: 70 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 22, height: 2, backgroundColor: GOLD }} />
          <Text style={{ ...W600, fontSize: 8.5, color: GOLD, letterSpacing: 2, textTransform: "uppercase" }}>{T(kicker)}</Text>
        </View>
        <Text style={{ ...W800, fontSize: 30, color: "#ffffff", marginTop: 26, letterSpacing: -0.5, lineHeight: 1.15 }}>{T(title)}</Text>
        {subtitle && <Text style={{ ...W600, fontSize: 13, color: "#e2c795", marginTop: 10 }}>{T(subtitle)}</Text>}
      </View>
      <View style={{ paddingHorizontal: MX, paddingTop: 34 }}>
        {lines.map((l) => (
          <Text key={l} style={{ fontSize: 10, color: INK2, marginBottom: 5 }}>
            {T(l)}
          </Text>
        ))}
      </View>
      <Text style={{ position: "absolute", bottom: 36, left: MX, fontSize: 8, color: MUTED }}>{T(`Document établi le ${date} · confidentiel`)}</Text>
    </Page>
  );
}

function contactLines(data: AppData): string[] {
  const holding = data.companies.find((c) => c.kind === "holding") ?? data.companies[0];
  const who = holding?.representative ?? data.settings.ownerName;
  return [who ? `Contact : ${who}${holding?.representativeRole ? `, ${holding.representativeRole}` : ""}` : "", [holding?.email, holding?.phone].filter(Boolean).join(" · "), holding?.address ?? ""].filter(Boolean);
}

// ——— Documents ———

export interface GroupDossierInput {
  data: AppData;
  projection: Projection;
  nowMonth: MonthIndex;
  /** Nom du périmètre (groupe ou société). */
  scopeName: string;
  generatedAt: Date;
}

export function GroupDossier({ data, projection, scopeName, generatedAt }: GroupDossierInput) {
  const m = groupModel(data, projection, scopeName);
  const date = generatedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const label = `${scopeName} · présentation patrimoniale`;
  return (
    <Document title={`Présentation patrimoniale - ${scopeName}`} author={data.settings.ownerName ?? scopeName}>
      <Cover kicker="Présentation patrimoniale" title={scopeName} subtitle={data.settings.ownerName} lines={contactLines(data)} date={date} />
      <SynthesisPage m={m} label={label} now={date} />
      <AssetsPage m={m} label={label} />
      <LoansPage m={m} label={label} />
      <CapacityPage m={m} label={label} />
      <AccountsPage m={m} label={label} />
    </Document>
  );
}

export interface ProjectDossierInput extends GroupDossierInput {
  project: Project;
  impact?: ProjectImpact;
}

export function ProjectDossier({ data, projection, scopeName, generatedAt, project: p, impact }: ProjectDossierInput) {
  const f = projectFigures(p);
  const m = groupModel(data, projection, scopeName);
  const date = generatedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const label = `${p.name} · dossier de financement`;
  const acquisition = p.kind !== "travaux";
  const building = data.buildings.find((b) => b.id === p.buildingId);
  const request = f.loanTotal;
  const durations = [...new Set((p.loans ?? []).map((l) => l.durationMonths).filter((x): x is number => !!x))];

  const uses: { label: string; amount?: number; sub?: string }[] = [];
  if (acquisition) {
    uses.push({ label: "Prix d'achat", amount: f.price });
    if (f.notary !== undefined) uses.push({ label: "Frais de notaire", amount: f.notary });
    if (f.agency) uses.push({ label: "Frais d'agence", amount: f.agency });
  }
  for (const c of p.costs ?? []) uses.push({ label: c.label || (c.kind === "travaux" ? "Travaux" : "Frais"), amount: c.amount, sub: c.kind === "travaux" ? (c.fileId ? "Travaux · devis joint" : "Travaux") : undefined });
  if (f.bankFees) uses.push({ label: "Frais bancaires et de garantie", amount: f.bankFees });
  const resources: { label: string; amount?: number; sub?: string }[] = [];
  if (f.equity) resources.push({ label: "Apport personnel", amount: f.equity, sub: p.equitySource });
  for (const l of p.loans ?? []) resources.push({ label: l.label || "Prêt", amount: l.amount, sub: [l.bank, l.durationMonths ? `${l.durationMonths / 12} ans` : undefined, l.ratePct !== undefined ? `${pct(l.ratePct, 2)}` : undefined].filter(Boolean).join(" · ") || undefined });

  const property: string[] = [];
  if (acquisition) {
    property.push(...[labelOfType(p.propertyType), [p.address, p.city].filter(Boolean).join(", "), p.surface ? `${p.surface.toLocaleString("fr-FR")} m²` : "", (p.lots ?? []).length ? `${p.lots.length} lot(s)` : "", labelOf(CONDITIONS, p.condition) ? `État : ${labelOf(CONDITIONS, p.condition)}` : "", p.dpeClass ? `DPE ${p.dpeClass}` : ""].filter(Boolean));
  } else if (building) {
    property.push(building.name, [building.address, building.city].filter(Boolean).join(", "));
  }

  const annualRent = f.rentMonthly * 12;
  const exploitation = [
    { label: "Loyers prévus", value: annualRent },
    ...(f.vacancyMonthly ? [{ label: "Vacance prudente", value: -f.vacancyMonthly * 12 }] : []),
    { label: "Charges (taxe foncière, assurance, copropriété…)", value: -f.chargesAnnual },
    ...(f.monthlyPayments !== undefined ? [{ label: "Mensualités de crédit", value: -f.monthlyPayments * 12 }] : []),
  ];

  return (
    <Document title={`Dossier de financement - ${p.name}`} author={data.settings.ownerName ?? scopeName}>
      <Cover
        kicker="Dossier de financement"
        title={p.name}
        subtitle={[projectCompanyName(p, data), scopeName].filter(Boolean).join(" · ")}
        lines={[request ? `Financement sollicité : ${eur(request)}${durations.length === 1 ? ` sur ${durations[0] / 12} ans` : ""}` : "", ...contactLines(data)].filter(Boolean)}
        date={date}
      />

      <Sheet label={label} kicker="La demande" title={acquisition ? "Le projet d'acquisition" : "Le projet de travaux"}>
        <KpiGrid
          dark
          items={[
            { label: "Financement sollicité", value: request ? E(request) : "—", sub: durations.length === 1 ? `sur ${durations[0] / 12} ans` : undefined },
            { label: "Coût total du projet", value: E(f.totalCost) },
            { label: "Apport", value: E(f.equity), sub: f.totalCost ? `${pct((f.equity / f.totalCost) * 100)} du coût` : undefined },
          ]}
        />
        {p.requestPurpose && (
          <>
            <H2>Objet de la demande</H2>
            <Para>{p.requestPurpose}</Para>
          </>
        )}
        {property.length > 0 && (
          <>
            <H2>{acquisition ? "Le bien" : "L'immeuble"}</H2>
            <Bullets items={property} />
          </>
        )}
        {p.description && (
          <>
            <H2>Présentation</H2>
            <Para>{p.description}</Para>
          </>
        )}
        {(p.purchaseDate || p.rentStartDate) && (
          <>
            <H2>Calendrier</H2>
            <Bullets items={[p.purchaseDate ? `${acquisition ? "Acte prévu" : "Début des travaux"} : ${dateFr(p.purchaseDate)}` : "", p.rentStartDate ? `Mise en location : ${dateFr(p.rentStartDate)}` : ""].filter(Boolean)} />
          </>
        )}
        <H2>Porteur du projet</H2>
        <Para>{`${projectCompanyName(p, data) ?? scopeName}, au sein de ${scopeName} : ${m.f.buildings} immeuble(s), ${m.f.units} lots, ${eur(Math.round(m.f.rentMonthly * 12))} de loyers annuels (détail en fin de dossier).`}</Para>
      </Sheet>

      <Sheet label={label} kicker="Financement" title="Plan de financement">
        <Text style={{ ...W700, fontSize: 9.5, color: NAVY, marginBottom: 4 }}>Emplois</Text>
        <Table cols={[{ label: "Poste", w: 70, get: (r) => r.label, bold: true }, { label: "Montant", w: 30, right: true, get: (r) => E(r.amount) }]} rows={uses} sub={(r) => r.sub} total={{ label: "Coût total", amount: f.totalCost }} />
        <Text style={{ ...W700, fontSize: 9.5, color: NAVY, marginTop: 14, marginBottom: 4 }}>Ressources</Text>
        <Table cols={[{ label: "Origine", w: 70, get: (r) => r.label, bold: true }, { label: "Montant", w: 30, right: true, get: (r) => E(r.amount) }]} rows={resources} sub={(r) => r.sub} total={{ label: "Total des ressources", amount: f.resources }} />
        {f.gap !== undefined && Math.abs(f.gap) > 1 && <Note>{f.gap > 0 ? `Reste à financer : ${eur(f.gap)}.` : `Ressources supérieures au coût de ${eur(-f.gap)}.`}</Note>}
        {f.loans.length > 0 && (
          <>
            <H2>Prêts envisagés</H2>
            <Table
              cols={[
                { label: "Prêt", w: 26, get: (r) => r.loan.label || "Prêt", bold: true },
                { label: "Montant", w: 16, right: true, get: (r) => E(r.loan.amount) },
                { label: "Taux", w: 10, right: true, get: (r) => (r.loan.ratePct !== undefined ? P(r.loan.ratePct, 2) : "—") },
                { label: "Durée", w: 11, right: true, get: (r) => (r.loan.durationMonths ? `${r.loan.durationMonths / 12} ans` : "—") },
                { label: "Différé", w: 11, right: true, get: (r) => (r.loan.deferralMonths ? `${r.loan.deferralMonths} mois` : "—") },
                { label: "Mensualité", w: 14, right: true, get: (r) => E(r.monthly) },
                { label: "Intérêts", w: 12, right: true, get: (r) => K(r.totalInterest) },
              ]}
              rows={f.loans}
            />
            <Note>Mensualités calculées (échéances constantes), assurance comprise.</Note>
          </>
        )}
      </Sheet>

      <Sheet label={label} kicker="Rentabilité" title="Rentabilité prévisionnelle">
        <KpiGrid
          items={[
            { label: "Loyers prévus", value: E(Math.round(f.rentMonthly)), sub: "par mois, hors charges" },
            { label: "Cash-flow", value: f.cashflowMonthly === undefined ? "—" : S(Math.round(f.cashflowMonthly)), sub: "par mois, après crédit", tone: f.cashflowMonthly === undefined ? undefined : f.cashflowMonthly >= 0 ? "pos" : "neg" },
            { label: "Couverture des mensualités", value: f.dscr !== undefined ? `${f.dscr.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}×` : "—", sub: "loyers nets ÷ mensualités" },
            { label: "Rendement brut", value: P(f.grossYieldPct), sub: "loyers annuels ÷ coût total" },
            { label: "Rendement net", value: P(f.netYieldPct), sub: "après vacance et charges" },
            ...(p.valueAfterWorks ? [{ label: "Valeur estimée après travaux", value: K(p.valueAfterWorks) }] : []),
          ]}
        />
        {(p.lots ?? []).length > 0 && (
          <>
            <H2>Lots et loyers</H2>
            <Table
              cols={[
                { label: "Lot", w: 34, get: (r) => r.name, bold: true },
                { label: "Type", w: 18, get: (r) => labelOf(UNIT_TYPES, r.type) ?? "—" },
                { label: "Surface", w: 14, right: true, get: (r) => (r.surface ? `${r.surface.toLocaleString("fr-FR")} m²` : "—") },
                { label: "Loyer HC", w: 17, right: true, get: (r) => E(r.rent) },
                { label: "Charges", w: 17, right: true, get: (r) => E(r.charges) },
              ]}
              rows={p.lots}
            />
          </>
        )}
        <H2>Compte d&apos;exploitation annuel</H2>
        <Table
          cols={[{ label: "", w: 70, get: (r) => r.label }, { label: "Par an", w: 30, right: true, get: (r) => (r.value >= 0 ? E(Math.round(r.value)) : `−${E(Math.round(-r.value))}`) }]}
          rows={exploitation}
          total={{ label: "Cash-flow annuel", value: f.cashflowMonthly !== undefined ? f.cashflowMonthly * 12 : 0 }}
        />
        {impact && (
          <>
            <H2>{`Effet sur le groupe (${impact.year})`}</H2>
            <Table
              cols={[{ label: "", w: 40, get: (r) => r.label, bold: true }, { label: "Sans le projet", w: 30, right: true, get: (r) => r.before }, { label: "Avec le projet", w: 30, right: true, get: (r) => r.after }]}
              rows={[
                { label: "Cash-flow par mois", before: S(Math.round(impact.before.cashflowMonthly)), after: S(Math.round(impact.after.cashflowMonthly)) },
                { label: "Capital restant dû", before: K(impact.before.debt), after: K(impact.after.debt) },
                ...(impact.before.ltvPct !== undefined && impact.after.ltvPct !== undefined ? [{ label: "Dette / valeur (LTV)", before: P(impact.before.ltvPct), after: P(impact.after.ltvPct) }] : []),
              ]}
            />
          </>
        )}
      </Sheet>

      <SynthesisPage m={m} label={label} now={date} />
      <AssetsPage m={m} label={label} />
      <LoansPage m={m} label={label} />
    </Document>
  );
}

function labelOfType(t?: Project["propertyType"]): string {
  return t ? ({ immeuble: "Immeuble de rapport", appartement: "Appartement", maison: "Maison", local: "Local commercial", terrain: "Terrain", autre: "Bien" } as const)[t] : "";
}

/** Nom du périmètre affiché : groupe, ou société choisie. */
export function scopeTitle(data: AppData, companyId?: string): string {
  if (companyId) return data.companies.find((c) => c.id === companyId)?.name ?? "Société";
  return data.settings.groupName || data.companies.find((c) => c.kind === "holding")?.name || "Patrimoine";
}

