import { Document, Line, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { AppData, Scenario } from "../types";
import type { MonthIndex } from "../engine/dates";
import { monthLabel, yearOf } from "../engine/dates";
import { NO_COMPANY, cashflowMonthly, companyTree, ltv, netWorth, type Figures } from "../engine/snapshot";
import { debtFreeYear, halfDebtYear, type Projection, type YearRow } from "../engine/projection";
import { companyLabel } from "../engine/milestones";
import { compareScenario, totalWealth } from "../engine/scenario";
import { eur, eurCompact, pct, pdfSafe, dateFr } from "../format";
import { COMPANY_KINDS, WORK_STATUSES, labelOf } from "../labels";
import { SECTION_OPTIONS } from "./sections";

// Dossier banque : document PDF généré à partir des données enregistrées
// et du moteur de calcul unique (mêmes chiffres que l'application).

export const SECTIONS = SECTION_OPTIONS;

export type SectionId = (typeof SECTIONS)[number]["id"];

const NAVY = "#0b2545";
const GOLD = "#b08d57";
const INK = "#0f1b2d";
const INK2 = "#4b5567";
const MUTED = "#8a93a3";
const LINE = "#e3e6eb";
const SOFT = "#f3f5f8";
const BLUE = "#2a78d6";
const ORANGE = "#eb6834";
const POS = "#0f8a5f";
const NEG = "#d23f3f";

const TOTAL = "__total";
const E = (n: number | undefined) => pdfSafe(eur(n));
const K = (n: number | undefined) => pdfSafe(eurCompact(n));
const P = (n: number | undefined, d = 1) => pdfSafe(pct(n, d));
const T = (s: string) => pdfSafe(s);

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 9.5, color: INK },
  header: { position: "absolute", top: 22, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: MUTED, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 6 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: MUTED },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 18, color: NAVY, marginBottom: 4 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 12, color: NAVY, marginTop: 14, marginBottom: 6 },
  lead: { fontSize: 9.5, color: INK2, marginBottom: 12, lineHeight: 1.4 },
  rule: { width: 36, height: 2, backgroundColor: GOLD, marginBottom: 12 },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  kpi: { flex: 1, backgroundColor: SOFT, borderRadius: 6, padding: 10 },
  kpiLabel: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  kpiValue: { fontFamily: "Helvetica-Bold", fontSize: 13, color: INK },
  table: { borderTopWidth: 1, borderTopColor: NAVY },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 4.5 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: INK2, textTransform: "uppercase" },
  td: { fontSize: 8.5 },
  right: { textAlign: "right" },
  note: { fontSize: 7.5, color: MUTED, marginTop: 8, lineHeight: 1.4 },
  bullet: { flexDirection: "row", marginBottom: 4 },
});

interface Col<T> {
  label: string;
  width: number;
  right?: boolean;
  get: (row: T) => string;
  bold?: (row: T) => boolean;
}

function Table<T>({ cols, rows, total }: { cols: Col<T>[]; rows: T[]; total?: T }) {
  return (
    <View style={s.table}>
      <View style={s.tr} fixed>
        {cols.map((c) => (
          <Text key={c.label} style={[s.th, { width: `${c.width}%` }, c.right ? s.right : {}]}>
            {T(c.label)}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={s.tr} wrap={false}>
          {cols.map((c) => (
            <Text key={c.label} style={[s.td, { width: `${c.width}%` }, c.right ? s.right : {}, c.bold?.(r) ? { fontFamily: "Helvetica-Bold" } : {}]}>
              {T(c.get(r))}
            </Text>
          ))}
        </View>
      ))}
      {total && (
        <View style={[s.tr, { backgroundColor: SOFT, borderBottomWidth: 0 }]} wrap={false}>
          {cols.map((c) => (
            <Text key={c.label} style={[s.td, { width: `${c.width}%`, fontFamily: "Helvetica-Bold" }, c.right ? s.right : {}]}>
              {T(c.get(total))}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{T(label)}</Text>
      <Text style={[s.kpiValue, color ? { color } : {}]}>{T(value)}</Text>
    </View>
  );
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

/** Graphique linéaire (une échelle), avec étiquettes superposées. */
function Chart({ title, years, series, bars }: { title: string; years: number[]; series: { label: string; values: number[]; color: string; dashed?: boolean }[]; bars?: boolean }) {
  const W = 507;
  const H = 130;
  const left = 46;
  const bottom = 16;
  const iw = W - left - 6;
  const ih = H - bottom - 6;
  const all = series.flatMap((x) => x.values);
  const maxV = niceMax(Math.max(0, ...all));
  const minV = Math.min(0, ...all) < 0 ? -niceMax(-Math.min(0, ...all)) : 0;
  const y = (v: number) => 6 + ih - ((v - minV) / (maxV - minV || 1)) * ih;
  const x = (i: number) => left + (years.length <= 1 ? 0 : (i / (years.length - 1)) * iw);
  const ticks = [minV, minV < 0 ? 0 : (maxV + minV) / 2, maxV].filter((v, i, a) => a.indexOf(v) === i);
  const slot = iw / years.length;
  return (
    <View wrap={false} style={{ marginBottom: 12 }}>
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, color: INK, marginBottom: 4 }}>{T(title)}</Text>
      <View style={{ position: "relative", width: W, height: H }}>
        <Svg width={W} height={H}>
          {ticks.map((t) => (
            <Line key={t} x1={left} x2={W - 6} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c9ced6" : "#eceff3"} strokeWidth={0.7} />
          ))}
          {bars
            ? series[0].values.map((v, i) => (
                <Rect key={i} x={left + i * slot + 0.8} y={y(Math.max(0, v))} width={Math.max(1, slot - 1.6)} height={Math.max(0.5, Math.abs(y(v) - y(0)))} fill={v >= 0 ? BLUE : NEG} />
              ))
            : series.map((se) => (
                <Path
                  key={se.label}
                  d={se.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
                  stroke={se.color}
                  strokeWidth={1.6}
                  strokeDasharray={se.dashed ? "4 3" : undefined}
                  fill="none"
                />
              ))}
        </Svg>
        {ticks.map((t) => (
          <Text key={`l${t}`} style={{ position: "absolute", left: 0, width: left - 6, top: y(t) - 4, fontSize: 6.5, color: MUTED, textAlign: "right" }}>
            {K(t)}
          </Text>
        ))}
        {years.map((yr, i) =>
          i % 5 === 0 ? (
            <Text key={yr} style={{ position: "absolute", left: (bars ? left + i * slot + slot / 2 : x(i)) - 14, width: 28, top: H - 11, fontSize: 6.5, color: MUTED, textAlign: "center" }}>
              {String(yr)}
            </Text>
          ) : null,
        )}
      </View>
      {series.length > 1 && (
        <View style={{ flexDirection: "row", gap: 14, marginTop: 3 }}>
          {series.map((se) => (
            <View key={se.label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 12, height: 2, backgroundColor: se.color }} />
              <Text style={{ fontSize: 7, color: INK2 }}>{T(se.label)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Frame({ children, groupName, date, title }: { children: React.ReactNode; groupName: string; date: string; title: string }) {
  return (
    <Page size="A4" style={s.page} wrap>
      <View style={s.header} fixed>
        <Text>{T(groupName)}</Text>
        <Text>{T(title)}</Text>
      </View>
      {children}
      <View style={s.footer} fixed>
        <Text>{T(`Dossier patrimonial — ${date} — Document confidentiel`)}</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

function Title({ children, lead }: { children: string; lead?: string }) {
  return (
    <View>
      <Text style={s.h1}>{T(children)}</Text>
      <View style={s.rule} />
      {lead && <Text style={s.lead}>{T(lead)}</Text>}
    </View>
  );
}

function figuresKpis(f: Figures) {
  const cf = cashflowMonthly(f);
  return (
    <>
      <View style={s.kpiRow}>
        <Kpi label="Valeur du patrimoine" value={E(f.value)} />
        <Kpi label="Capital restant dû" value={E(f.debt)} />
        <Kpi label="Patrimoine net" value={E(netWorth(f))} color={NAVY} />
      </View>
      <View style={s.kpiRow}>
        <Kpi label="Loyers mensuels" value={E(f.rentMonthly)} />
        <Kpi label="Mensualités de crédits" value={E(f.paymentsMonthly)} />
        <Kpi label="Cash-flow mensuel" value={E(cf)} color={cf >= 0 ? POS : NEG} />
      </View>
      <View style={s.kpiRow}>
        <Kpi label="LTV" value={ltv(f) === undefined ? "—" : P(ltv(f))} />
        <Kpi label="Cash-flow annuel" value={E(cf * 12)} color={cf >= 0 ? POS : NEG} />
        <Kpi label="Trésorerie disponible" value={E(f.cash)} />
      </View>
    </>
  );
}

export interface DossierInput {
  data: AppData;
  projection: Projection;
  nowMonth: MonthIndex;
  sections: SectionId[];
  scenarios: Scenario[];
  generatedAt: Date;
}

export function DossierDocument({ data, projection, nowMonth, sections, scenarios, generatedAt }: DossierInput) {
  const has = (id: SectionId) => sections.includes(id);
  const snap = projection.snapshot;
  const t = snap.total;
  const y0 = yearOf(nowMonth);
  const groupName = data.settings.groupName || data.companies.find((c) => c.kind === "holding")?.name || "Patrimoine immobilier";
  const date = generatedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const years = projection.years.map((r) => r.year);
  const tree = companyTree(data.companies);
  const horizons = [0, 5, 10, 15, 20, 30].map((h) => projection.years[h]).filter(Boolean) as YearRow[];
  const loanEnds = projection.events.filter((e) => e.kind === "loan_end" || e.kind === "balloon");
  const half = halfDebtYear(projection);
  const free = debtFreeYear(projection);
  const frame = (title: string, children: React.ReactNode) => (
    <Frame groupName={groupName} date={date} title={title}>
      {children}
    </Frame>
  );
  const hyp = `Hypothèses : revalorisation des biens ${P(data.settings.valueGrowthPct ?? 0)} / an, indexation des loyers ${P(data.settings.rentGrowthPct ?? 0)} / an, charges ${P(data.settings.chargesGrowthPct ?? 0)} / an. Opérations datées au 1er janvier. Calculs déterministes réalisés à partir des données déclarées.`;
  const cf = cashflowMonthly(t);

  return (
    <Document title={`Dossier patrimonial — ${groupName}`} author={data.settings.ownerName ?? groupName} language="fr">
      {/* Couverture */}
      <Page size="A4" style={{ fontFamily: "Helvetica", backgroundColor: NAVY, color: "#ffffff", padding: 56 }}>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 9, letterSpacing: 2, color: GOLD, textTransform: "uppercase" }}>Dossier patrimonial</Text>
            <View style={{ width: 48, height: 2, backgroundColor: GOLD, marginTop: 10 }} />
          </View>
          <View>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 32, lineHeight: 1.2 }}>{T(groupName)}</Text>
            {data.settings.ownerName && <Text style={{ fontSize: 13, color: "#c9d3e3", marginTop: 8 }}>{T(data.settings.ownerName)}</Text>}
            <Text style={{ fontSize: 11, color: "#c9d3e3", marginTop: 18, lineHeight: 1.5 }}>
              {T(`Structure, patrimoine immobilier, endettement et projection à 30 ans (${y0} – ${y0 + 30}).`)}
            </Text>
            <View style={{ flexDirection: "row", marginTop: 36, gap: 12 }}>
              {[
                ["Patrimoine", K(t.value)],
                ["Dette", K(t.debt)],
                ["Patrimoine net", K(netWorth(t))],
                ["Cash-flow / an", K(cf * 12)],
              ].map(([l, v]) => (
                <View key={l} style={{ flex: 1, borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 8 }}>
                  <Text style={{ fontSize: 7.5, color: "#9fb0c8", textTransform: "uppercase", letterSpacing: 0.8 }}>{T(l)}</Text>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 15, marginTop: 4 }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: "#9fb0c8" }}>
            <Text>{T(date)}</Text>
            <Text>Document confidentiel</Text>
          </View>
        </View>
      </Page>

      {has("synthese") &&
        frame(
          "Synthèse",
          <>
            <Title lead={`Situation consolidée du groupe au ${date}.`}>Synthèse</Title>
            {figuresKpis(t)}
            <View style={s.kpiRow}>
              <Kpi label="Sociétés" value={String(data.companies.filter((c) => c.kind !== "holding").length)} />
              <Kpi label="Immeubles" value={String(t.buildings)} />
              <Kpi label="Logements / lots" value={String(t.units)} />
              <Kpi label="Crédits en cours" value={String(t.loans)} />
            </View>
            <Text style={s.h2}>Points clés</Text>
            {[
              loanEnds[0] && `Prochaine fin de crédit : ${loanEnds[0].year} (${loanEnds[0].label.replace(/^Fin — /, "")}).`,
              half && `La dette est divisée par deux en ${half} par l'amortissement des crédits en cours.`,
              free && `Désendettement complet projeté en ${free}.`,
              projection.years[10] && `Patrimoine net projeté à 10 ans (${projection.years[10].year}) : ${K(projection.years[10].net)}.`,
              t.vacantUnits > 0 && `${t.vacantUnits} logement(s) vacant(s) à ce jour.`,
            ]
              .filter(Boolean)
              .map((line) => (
                <View key={line as string} style={s.bullet}>
                  <Text style={{ color: GOLD, width: 10 }}>•</Text>
                  <Text style={{ flex: 1, lineHeight: 1.4 }}>{T(line as string)}</Text>
                </View>
              ))}
            {(t.unvalued > 0 || t.unknownDebt > 0) && (
              <Text style={s.note}>
                {T(`Données non renseignées exclues des totaux : ${t.unvalued} bien(s) sans valeur, ${t.unknownDebt} crédit(s) sans capital restant dû.`)}
              </Text>
            )}
          </>,
        )}

      {has("structure") &&
        frame(
          "Structure du groupe",
          <>
            <Title lead="Organisation juridique et chiffres consolidés par société.">Structure du groupe</Title>
            <View style={{ marginBottom: 14 }}>
              {tree.map(({ company, depth }) => (
                <View key={company.id} style={{ flexDirection: "row", alignItems: "center", marginLeft: depth * 18, marginBottom: 5 }} wrap={false}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: depth === 0 ? NAVY : GOLD, marginRight: 6 }} />
                  <Text style={{ fontFamily: depth === 0 ? "Helvetica-Bold" : "Helvetica", fontSize: depth === 0 ? 11 : 9.5 }}>
                    {T(company.name)}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 8, marginLeft: 6 }}>
                    {T(`${labelOf(COMPANY_KINDS, company.kind) ?? ""}${company.ownershipPct ? ` — détenue à ${P(company.ownershipPct, 2)}` : ""}`)}
                  </Text>
                </View>
              ))}
            </View>
            <Table
              cols={[
                { label: "Société", width: 26, get: (r: { name: string; f: Figures }) => r.name },
                { label: "Valeur", width: 15, right: true, get: (r) => K(r.f.value) },
                { label: "Dette", width: 15, right: true, get: (r) => K(r.f.debt) },
                { label: "Net", width: 15, right: true, get: (r) => K(netWorth(r.f)) },
                { label: "Loyers/mois", width: 15, right: true, get: (r) => K(r.f.rentMonthly) },
                { label: "CF/mois", width: 14, right: true, get: (r) => K(cashflowMonthly(r.f)) },
              ]}
              rows={tree.map(({ company }) => ({ name: company.name, f: snap.ownByCompany.get(company.id)! }))}
              total={{ name: "Total groupe", f: t }}
            />
            <Text style={s.note}>Chiffres propres à chaque société (hors filiales), consolidés à 100 % dans le total.</Text>
          </>,
        )}

      {has("patrimoine") &&
        frame(
          "Patrimoine immobilier",
          <>
            <Title lead="Inventaire des actifs, valeurs estimées et revenus locatifs.">Patrimoine immobilier</Title>
            <Table
              cols={[
                { label: "Immeuble", width: 24, get: (b: (typeof data.buildings)[number]) => b.name },
                { label: "Société", width: 16, get: (b) => data.companies.find((c) => c.id === b.companyId)?.name ?? "—" },
                { label: "Commune", width: 13, get: (b) => b.city ?? "—" },
                { label: "Valeur", width: 12, right: true, get: (b) => (snap.byBuilding.get(b.id)?.unvalued ? "n.c." : K(snap.byBuilding.get(b.id)?.value)) },
                { label: "Dette", width: 12, right: true, get: (b) => K(snap.byBuilding.get(b.id)?.debt) },
                { label: "Loyers/an", width: 12, right: true, get: (b) => K((snap.byBuilding.get(b.id)?.rentMonthly ?? 0) * 12) },
                {
                  label: "Rdt brut",
                  width: 11,
                  right: true,
                  get: (b) => {
                    const f = snap.byBuilding.get(b.id);
                    return f && f.value > 0 ? P(((f.rentMonthly * 12) / f.value) * 100) : "—";
                  },
                },
              ]}
              rows={data.buildings}
            />
            <View style={[s.kpiRow, { marginTop: 14 }]}>
              <Kpi label="Valeur totale" value={E(t.value)} />
              <Kpi label="Loyers annuels" value={E(t.rentMonthly * 12)} />
              <Kpi label="Rendement brut global" value={t.value > 0 ? P(((t.rentMonthly * 12) / t.value) * 100) : "—"} />
            </View>
          </>,
        )}

      {has("credits") &&
        frame(
          "Crédits",
          <>
            <Title lead="Encours bancaires au jour du dossier.">Tableau des crédits</Title>
            <Table
              cols={[
                { label: "Crédit", width: 20, get: (l: (typeof data.loans)[number]) => l.name || "Crédit" },
                { label: "Banque", width: 17, get: (l) => l.bank ?? "—" },
                { label: "Initial", width: 11, right: true, get: (l) => K(l.initialAmount) },
                { label: "CRD", width: 12, right: true, get: (l) => { const b = snap.byLoan.get(l.id)?.balance; return b === undefined ? "n.c." : K(b); } },
                { label: "Mensualité", width: 12, right: true, get: (l) => E(snap.byLoan.get(l.id)?.paymentMonthly) },
                { label: "Taux", width: 9, right: true, get: (l) => (l.ratePct !== undefined ? P(l.ratePct, 2) : "—") },
                { label: "Fin", width: 11, right: true, get: (l) => { const r = snap.resolvedLoans.get(l.id); return r?.finished ? "soldé" : r?.endMonth !== undefined ? monthLabel(r.endMonth) : "n.c."; } },
                { label: "Type", width: 8, right: true, get: (l) => (l.kind === "in_fine" ? "In fine" : "Amort.") },
              ]}
              rows={data.loans.filter((l) => !snap.resolvedLoans.get(l.id)?.finished)}
              total={undefined}
            />
            <View style={[s.kpiRow, { marginTop: 14 }]}>
              <Kpi label="Capital restant dû total" value={E(t.debt)} />
              <Kpi label="Mensualités totales" value={E(t.paymentsMonthly)} />
              <Kpi label="LTV globale" value={ltv(t) === undefined ? "—" : P(ltv(t))} />
            </View>
            <Text style={s.note}>Mensualités assurance incluse. n.c. : non communiqué.</Text>
          </>,
        )}

      {has("echeancier") &&
        frame(
          "Échéancier",
          <>
            <Title lead="Chaque fin de crédit libère une mensualité et améliore le cash-flow.">Échéancier des fins de crédits</Title>
            {loanEnds.length === 0 ? (
              <Text style={s.lead}>Aucune échéance sur l&apos;horizon de projection.</Text>
            ) : (
              <Table
                cols={[
                  { label: "Date", width: 15, get: (e: (typeof loanEnds)[number]) => monthLabel(e.month) },
                  { label: "Crédit", width: 35, get: (e) => e.label.replace(/^Fin — /, "").replace(/^Remboursement du capital — /, "Capital in fine — ") },
                  { label: "Société", width: 25, get: (e) => companyLabel(data, e.companyKey) },
                  { label: "Impact", width: 25, right: true, get: (e) => (e.kind === "balloon" ? `- ${K(e.amount)} (capital)` : `+${E(e.monthlyFreed)} / mois`) },
                ]}
                rows={loanEnds}
              />
            )}
            <View style={{ marginTop: 16 }}>
              <Chart title="Capital restant dû projeté" years={years} series={[{ label: "Dette", values: projection.years.map((r) => r.debt), color: BLUE }]} />
            </View>
          </>,
        )}

      {has("projection") &&
        frame(
          "Projection",
          <>
            <Title lead="Photographie du patrimoine à différents horizons.">Projection à 5, 10, 15, 20 et 30 ans</Title>
            <Table
              cols={[
                { label: "Année", width: 10, get: (r: YearRow) => String(r.year), bold: () => true },
                { label: "Valeur", width: 15, right: true, get: (r) => K(r.value) },
                { label: "Dette", width: 15, right: true, get: (r) => K(r.debt) },
                { label: "Net", width: 15, right: true, get: (r) => K(r.net) },
                { label: "Loyers/an", width: 15, right: true, get: (r) => K(r.rent) },
                { label: "Crédits/an", width: 15, right: true, get: (r) => K(r.payments) },
                { label: "Cash-flow/an", width: 15, right: true, get: (r) => K(r.cashflow) },
              ]}
              rows={horizons}
            />
            <View style={{ marginTop: 14 }}>
              <Chart title="Patrimoine net" years={years} series={[{ label: "Patrimoine net", values: projection.years.map((r) => r.net), color: BLUE }]} />
              <Chart title="Cash-flow annuel" years={years} bars series={[{ label: "Cash-flow", values: projection.years.map((r) => r.cashflow), color: BLUE }]} />
            </View>
            <Text style={s.note}>{T(hyp)}</Text>
          </>,
        )}

      {has("chronologie") &&
        frame(
          "Chronologie",
          <>
            <Title lead="Événements structurants des 30 prochaines années.">Chronologie patrimoniale</Title>
            {projection.events.length === 0 ? (
              <Text style={s.lead}>Aucun événement programmé.</Text>
            ) : (
              [...new Set(projection.events.map((e) => e.year))].map((year) => (
                <View key={year} style={{ flexDirection: "row", marginBottom: 6 }} wrap={false}>
                  <Text style={{ width: 44, fontFamily: "Helvetica-Bold", fontSize: 11, color: NAVY }}>{String(year)}</Text>
                  <View style={{ flex: 1, borderLeftWidth: 1.5, borderLeftColor: GOLD, paddingLeft: 10 }}>
                    {projection.events
                      .filter((e) => e.year === year)
                      .map((e) => (
                        <Text key={e.id} style={{ marginBottom: 2, lineHeight: 1.35 }}>
                          {T(
                            `${e.label} — ${companyLabel(data, e.companyKey)}${e.monthlyFreed ? ` (+${eur(e.monthlyFreed)}/mois)` : e.amount ? ` (${eurCompact(e.amount)})` : ""}`,
                          )}
                        </Text>
                      ))}
                  </View>
                </View>
              ))
            )}
          </>,
        )}

      {has("fiches") &&
        tree
          .map(({ company }) => company)
          .map((c) => {
            const f = snap.byCompany.get(c.id)!;
            const own = snap.ownByCompany.get(c.id)!;
            const buildings = data.buildings.filter((b) => b.companyId === c.id);
            const bIds = new Set(buildings.map((b) => b.id));
            const loans = data.loans.filter((l) => ((l.buildingId && bIds.has(l.buildingId)) || (!l.buildingId && l.companyId === c.id)) && !snap.resolvedLoans.get(l.id)?.finished);
            const rows = projection.byCompany.get(c.id) ?? [];
            const parent = data.companies.find((p) => p.id === c.parentId);
            return (
              <Frame key={c.id} groupName={groupName} date={date} title={`Fiche — ${c.name}`}>
                <Title
                  lead={[labelOf(COMPANY_KINDS, c.kind), parent ? `détenue par ${parent.name}${c.ownershipPct ? ` à ${pct(c.ownershipPct, 2)}` : ""}` : undefined, c.taxRegime ? `fiscalité : ${c.taxRegime}` : undefined].filter(Boolean).join(" · ")}
                >
                  {c.name}
                </Title>
                {figuresKpis(c.kind === "holding" ? f : own)}
                {c.partners && c.partners.length > 0 && (
                  <Text style={{ marginBottom: 6, color: INK2 }}>{T(`Associés : ${c.partners.map((p) => `${p.name}${p.pct !== undefined ? ` (${pct(p.pct, 2)})` : ""}`).join(", ")}`)}</Text>
                )}
                {own.partnerAccounts > 0 && <Text style={{ marginBottom: 6, color: INK2 }}>{T(`Comptes courants d'associés : ${eur(own.partnerAccounts)}`)}</Text>}
                {buildings.length > 0 && (
                  <>
                    <Text style={s.h2}>Immeubles</Text>
                    <Table
                      cols={[
                        { label: "Immeuble", width: 34, get: (b: (typeof buildings)[number]) => `${b.name}${b.city ? ` (${b.city})` : ""}` },
                        { label: "Valeur", width: 22, right: true, get: (b) => (snap.byBuilding.get(b.id)?.unvalued ? "n.c." : K(snap.byBuilding.get(b.id)?.value)) },
                        { label: "Loyers/mois", width: 22, right: true, get: (b) => K(snap.byBuilding.get(b.id)?.rentMonthly) },
                        { label: "Lots", width: 22, right: true, get: (b) => String(snap.byBuilding.get(b.id)?.units ?? 0) },
                      ]}
                      rows={buildings}
                    />
                  </>
                )}
                {loans.length > 0 && (
                  <>
                    <Text style={s.h2}>Crédits</Text>
                    <Table
                      cols={[
                        { label: "Crédit", width: 34, get: (l: (typeof loans)[number]) => `${l.name || "Crédit"}${l.bank ? ` — ${l.bank}` : ""}` },
                        { label: "CRD", width: 22, right: true, get: (l) => { const b = snap.byLoan.get(l.id)?.balance; return b === undefined ? "n.c." : K(b); } },
                        { label: "Mensualité", width: 22, right: true, get: (l) => E(snap.byLoan.get(l.id)?.paymentMonthly) },
                        { label: "Fin", width: 22, right: true, get: (l) => { const r = snap.resolvedLoans.get(l.id); return r?.endMonth !== undefined ? monthLabel(r.endMonth) : "n.c."; } },
                      ]}
                      rows={loans}
                    />
                  </>
                )}
                {rows.length > 0 && (own.debt > 0 || own.value > 0) && (
                  <View style={{ marginTop: 12 }}>
                    <Chart title="Dette projetée de la société" years={rows.map((r) => r.year)} series={[{ label: "Dette", values: rows.map((r) => r.debt), color: BLUE }]} />
                  </View>
                )}
              </Frame>
            );
          })}

      {has("travaux") &&
        frame(
          "Travaux",
          <>
            <Title lead="Dépenses programmées intégrées aux projections de trésorerie.">Travaux programmés</Title>
            {data.works.filter((w) => w.status !== "termine").length === 0 ? (
              <Text style={s.lead}>Aucun travaux programmés.</Text>
            ) : (
              <Table
                cols={[
                  { label: "Année", width: 10, get: (w: (typeof data.works)[number]) => (w.year ? String(w.year) : "—") },
                  { label: "Travaux", width: 30, get: (w) => w.label },
                  { label: "Immeuble / société", width: 30, get: (w) => (w.id === TOTAL ? "" : (data.buildings.find((b) => b.id === w.buildingId)?.name ?? companyLabel(data, w.companyId ?? NO_COMPANY))) },
                  { label: "État", width: 14, get: (w) => (w.id === TOTAL ? "" : (labelOf(WORK_STATUSES, w.status ?? "prevu") ?? "")) },
                  { label: "Montant", width: 16, right: true, get: (w) => E(w.amount) },
                ]}
                rows={data.works.filter((w) => w.status !== "termine").sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))}
                total={{ id: TOTAL, label: "Total", amount: data.works.filter((w) => w.status !== "termine").reduce((a, w) => a + (w.amount ?? 0), 0) }}
              />
            )}
          </>,
        )}

      {has("scenarios") &&
        scenarios.map((sc) => {
          const cmp = compareScenario(data, nowMonth, sc, projection);
          return (
            <Frame key={sc.id} groupName={groupName} date={date} title={`Scénario — ${sc.name}`}>
              <Title lead="Simulation : comparaison avec la trajectoire actuelle.">{`Scénario : ${sc.name}`}</Title>
              {cmp.sim.sales.map((sale) => (
                <View key={sale.actionId} style={{ marginBottom: 10 }} wrap={false}>
                  <Text style={s.h2}>{T(`Vente de ${data.buildings.find((b) => b.id === sale.buildingId)?.name ?? "l'immeuble"} en ${sale.year}`)}</Text>
                  <View style={s.kpiRow}>
                    <Kpi label="Prix de vente" value={E(sale.price)} />
                    <Kpi label="Dette remboursée" value={E(sale.debtRepaid)} />
                    <Kpi label="Frais et impôts" value={E(sale.fees + sale.tax)} />
                    <Kpi label="Trésorerie dégagée" value={E(sale.netCash)} color={POS} />
                  </View>
                  <Text style={{ color: INK2 }}>
                    {T(`Loyers perdus : ${eur(sale.rentLostMonthly)}/mois — mensualités supprimées : ${eur(sale.paymentsRemovedMonthly)}/mois.`)}
                  </Text>
                </View>
              ))}
              <Table
                cols={[
                  { label: "Année", width: 10, get: (p: (typeof cmp.points)[number]) => String(p.year), bold: () => true },
                  { label: "Patrimoine avant", width: 15, right: true, get: (p) => K(totalWealth(p.before)) },
                  { label: "Patrimoine après", width: 15, right: true, get: (p) => K(totalWealth(p.after)) },
                  { label: "Dette avant", width: 15, right: true, get: (p) => K(p.before.debt) },
                  { label: "Dette après", width: 15, right: true, get: (p) => K(p.after.debt) },
                  { label: "CF/an avant", width: 15, right: true, get: (p) => K(p.before.cashflow) },
                  { label: "CF/an après", width: 15, right: true, get: (p) => K(p.after.cashflow) },
                ]}
                rows={cmp.points}
              />
              <View style={{ marginTop: 14 }}>
                <Chart
                  title="Patrimoine net + trésorerie cumulée"
                  years={years}
                  series={[
                    { label: "Trajectoire actuelle", values: cmp.base.years.map(totalWealth), color: BLUE },
                    { label: "Avec le scénario", values: cmp.sim.years.map(totalWealth), color: ORANGE, dashed: true },
                  ]}
                />
              </View>
              <Text style={s.note}>{T(`Simulation non intégrée aux données réelles. ${hyp}`)}</Text>
            </Frame>
          );
        })}

      {/* Note méthodologique */}
      {frame(
        "Méthodologie",
        <>
          <Title>Méthodologie</Title>
          {[
            "Les montants proviennent des données déclarées par le propriétaire ; aucune valeur n'est inventée : une donnée manquante est signalée « n.c. » et exclue des totaux.",
            "Capital restant dû calculé mois par mois à partir du tableau d'amortissement (montant, taux, durée) ou, à défaut, du capital restant dû, de la mensualité et de la date de fin.",
            "Cash-flow = loyers hors charges des lots occupés − charges annuelles (taxe foncière, assurance, comptabilité, autres) − mensualités de crédits assurance comprise. Avant impôt.",
            "LTV = capital restant dû / valeur estimée des biens.",
            hyp,
          ].map((line) => (
            <View key={line} style={s.bullet}>
              <Text style={{ color: GOLD, width: 10 }}>•</Text>
              <Text style={{ flex: 1, lineHeight: 1.45 }}>{T(line)}</Text>
            </View>
          ))}
          <Text style={[s.note, { marginTop: 16 }]}>{T(`Document généré le ${dateFr(generatedAt.toISOString().slice(0, 10))}.`)}</Text>
        </>,
      )}
    </Document>
  );
}
