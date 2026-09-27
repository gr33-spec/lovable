import { existsSync } from "node:fs";
import path from "node:path";
import {
  Circle,
  Defs,
  Document,
  Font,
  G,
  Line,
  LinearGradient,
  Page,
  Path,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type { AppData, Company, Loan, Scenario } from "../types";
import type { MonthIndex } from "../engine/dates";
import { monthLabel, yearOf } from "../engine/dates";
import { NO_COMPANY, cashflowMonthly, companyTree, ltv, netWorth, type Figures } from "../engine/snapshot";
import { debtFreeYear, halfDebtYear, type Projection, type TimelineEvent } from "../engine/projection";
import { companyLabel } from "../engine/milestones";
import { compareScenario, totalWealth } from "../engine/scenario";
import { eur, eurCompact, pct, pdfSafe, dateFr } from "../format";
import { COMPANY_KINDS, WORK_STATUSES, labelOf } from "../labels";
import { SECTION_OPTIONS } from "./sections";

// Dossier banque : présentation paysage (A4), inspirée des synthèses
// patrimoniales « type présentation ». Tous les chiffres viennent du moteur
// de calcul unique : ce sont exactement ceux de l'application.

export const SECTIONS = SECTION_OPTIONS;
export type SectionId = (typeof SECTIONS)[number]["id"];

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
const BOLD = HAS_INTER ? { fontFamily: "Inter", fontWeight: 700 as const } : { fontFamily: "Helvetica-Bold" };
const XBOLD = HAS_INTER ? { fontFamily: "Inter", fontWeight: 800 as const } : { fontFamily: "Helvetica-Bold" };
const SEMI = HAS_INTER ? { fontFamily: "Inter", fontWeight: 600 as const } : { fontFamily: "Helvetica-Bold" };

// ——— Charte ———
const NAVY = "#0b2545";
const ROYAL = "#243b8a";
const ROYAL_2 = "#3149a3";
const LAV = "#e5e7f7";
const LAV_2 = "#f3f4fc";
const GOLD = "#b08d57";
const GOLD_L = "#e2c795";
const INK = "#0f1b2d";
const INK2 = "#4b5567";
const MUTED = "#8a93a3";
const LINE = "#e3e6ef";
const BLUE = "#2a78d6";
const ORANGE = "#eb6834";
const POS = "#0f8a5f";
const NEG = "#d23f3f";

const W = 841.89;
const H = 595.28;
const MX = 40;
const CW = W - MX * 2; // largeur utile

const TOTAL = "__total";
const E = (n: number | undefined) => pdfSafe(eur(n));
const K = (n: number | undefined) => pdfSafe(eurCompact(n));
const P = (n: number | undefined, d = 1) => pdfSafe(pct(n, d));
const T = (s: string) => pdfSafe(s);

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 46, paddingHorizontal: MX, fontFamily: FONT, fontSize: 9.5, color: INK, backgroundColor: "#ffffff" },
  footer: { position: "absolute", bottom: 18, left: MX, right: MX, flexDirection: "row", justifyContent: "space-between", alignItems: "center", fontSize: 7.5, color: MUTED },
  kicker: { ...SEMI, fontSize: 8, color: GOLD, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 4 },
  h1: { ...XBOLD, fontSize: 24, color: NAVY, letterSpacing: -0.4, marginBottom: 6 },
  h2: { ...BOLD, fontSize: 13, color: NAVY, marginBottom: 8 },
  lead: { fontSize: 9.5, color: INK2, lineHeight: 1.5, marginBottom: 14, maxWidth: 560 },
  th: { ...SEMI, fontSize: 7.5, color: INK2, textTransform: "uppercase", letterSpacing: 0.4 },
  td: { fontSize: 8.8, color: INK },
  right: { textAlign: "right" },
  note: { fontSize: 7.5, color: MUTED, marginTop: 8, lineHeight: 1.45 },
});

// ——— Briques de mise en page ———

function Footer({ groupName }: { groupName: string }) {
  return (
    <View style={s.footer} fixed>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={{ width: 14, height: 2, backgroundColor: GOLD }} />
        <Text>{T(`${groupName} — Dossier patrimonial confidentiel`)}</Text>
      </View>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function SectionPage({
  groupName,
  num,
  kicker,
  title,
  lead,
  children,
}: {
  groupName: string;
  num?: number;
  kicker: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <Page size="A4" orientation="landscape" style={s.page} wrap>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>{T(num ? `${String(num).padStart(2, "0")} · ${kicker}` : kicker)}</Text>
          <Text style={s.h1}>{T(title)}</Text>
        </View>
        <View style={{ width: 46, height: 4, backgroundColor: ROYAL, marginTop: 8, borderRadius: 2 }} />
      </View>
      {lead ? <Text style={s.lead}>{T(lead)}</Text> : <View style={{ height: 10 }} />}
      {children}
      <Footer groupName={groupName} />
    </Page>
  );
}

/** Tuile « chiffre clé » bleu roi, texte blanc (esprit du document de référence). */
function StatTile({ value, label, sub, tone = "royal", flex = 1 }: { value: string; label: string; sub?: string; tone?: "royal" | "navy" | "lav" | "gold"; flex?: number }) {
  const bg = tone === "royal" ? ROYAL : tone === "navy" ? NAVY : tone === "gold" ? "#f6efe2" : LAV;
  const dark = tone === "royal" || tone === "navy";
  return (
    <View style={{ flex, backgroundColor: bg, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14 }}>
      <Text style={{ ...XBOLD, fontSize: 20, color: dark ? "#ffffff" : NAVY, letterSpacing: -0.4 }}>{T(value)}</Text>
      <Text style={{ ...SEMI, fontSize: 8.5, color: dark ? "#dbe2f5" : INK, marginTop: 4 }}>{T(label)}</Text>
      {sub && <Text style={{ fontSize: 7.5, color: dark ? "#aab6dc" : MUTED, marginTop: 2 }}>{T(sub)}</Text>}
    </View>
  );
}

function Card({ title, children, tone = "lav", style }: { title?: string; children: React.ReactNode; tone?: "lav" | "white" | "navy"; style?: object }) {
  const bg = tone === "lav" ? LAV : tone === "navy" ? NAVY : "#ffffff";
  return (
    <View
      style={{ backgroundColor: bg, borderRadius: 8, padding: 12, borderWidth: tone === "white" ? 1 : 0, borderColor: LINE, ...style }}
      wrap={false}
    >
      {title && <Text style={{ ...BOLD, fontSize: 10.5, color: tone === "navy" ? "#ffffff" : NAVY, marginBottom: 6 }}>{T(title)}</Text>}
      {children}
    </View>
  );
}

function Bullet({ children, dark }: { children: string; dark?: boolean }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 5 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD, marginTop: 4, marginRight: 7 }} />
      <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.45, color: dark ? "#e6ebf7" : INK }}>{T(children)}</Text>
    </View>
  );
}

interface Col<R> {
  label: string;
  width: number;
  right?: boolean;
  get: (row: R) => string;
  bold?: (row: R) => boolean;
  color?: (row: R) => string | undefined;
}

function Table<R>({ cols, rows, total }: { cols: Col<R>[]; rows: R[]; total?: R }) {
  return (
    <View>
      <View style={{ flexDirection: "row", backgroundColor: LAV, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 8 }} fixed>
        {cols.map((c) => (
          <Text key={c.label} style={[s.th, { width: `${c.width}%` }, c.right ? s.right : {}]}>
            {T(c.label)}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", paddingVertical: 3.8, paddingHorizontal: 8, backgroundColor: i % 2 ? LAV_2 : "#ffffff" }} wrap={false}>
          {cols.map((c) => (
            <Text
              key={c.label}
              style={[s.td, { width: `${c.width}%` }, c.right ? s.right : {}, c.bold?.(r) ? BOLD : {}, c.color?.(r) ? { color: c.color(r) } : {}]}
            >
              {T(c.get(r))}
            </Text>
          ))}
        </View>
      ))}
      {total && (
        <View style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, backgroundColor: NAVY, borderRadius: 6, marginTop: 2 }} wrap={false}>
          {cols.map((c) => (
            <Text key={c.label} style={[s.td, BOLD, { width: `${c.width}%`, color: "#ffffff" }, c.right ? s.right : {}]}>
              {T(c.get(total))}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ——— Graphiques ———

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

interface ChartSeries {
  label: string;
  values: number[];
  color: string;
  dashed?: boolean;
}

/** Courbe(s) sur une échelle unique, avec aire sous la première série. */
function AreaChart({ title, years, series, width = CW, height = 150, area = true }: { title?: string; years: number[]; series: ChartSeries[]; width?: number; height?: number; area?: boolean }) {
  const left = 48;
  const bottom = 16;
  const iw = width - left - 8;
  const ih = height - bottom - 8;
  const all = series.flatMap((x) => x.values);
  const maxV = niceMax(Math.max(0, ...all));
  const minV = Math.min(0, ...all) < 0 ? -niceMax(-Math.min(0, ...all)) : 0;
  const y = (v: number) => 8 + ih - ((v - minV) / (maxV - minV || 1)) * ih;
  const x = (i: number) => left + (years.length <= 1 ? 0 : (i / (years.length - 1)) * iw);
  const ticks = [minV, minV < 0 ? 0 : maxV / 2, maxV].filter((v, i, a) => a.indexOf(v) === i);
  const first = series[0];
  const line = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <View wrap={false}>
      {title && <Text style={{ ...BOLD, fontSize: 10, color: NAVY, marginBottom: 6 }}>{T(title)}</Text>}
      <View style={{ position: "relative", width, height }}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={first?.color ?? BLUE} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={first?.color ?? BLUE} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {ticks.map((t) => (
            <Line key={t} x1={left} x2={width - 8} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c7cde0" : "#edf0f6"} strokeWidth={0.8} />
          ))}
          {area && first && <Path d={`${line(first.values)} L${x(first.values.length - 1)},${y(Math.max(minV, 0))} L${x(0)},${y(Math.max(minV, 0))} Z`} fill="url(#areaFill)" />}
          {series.map((se) => (
            <Path key={se.label} d={line(se.values)} stroke={se.color} strokeWidth={2} strokeDasharray={se.dashed ? "5 4" : undefined} fill="none" />
          ))}
        </Svg>
        {ticks.map((t) => (
          <Text key={`l${t}`} style={{ position: "absolute", left: 0, width: left - 8, top: y(t) - 4, fontSize: 6.8, color: MUTED, textAlign: "right" }}>
            {K(t)}
          </Text>
        ))}
        {years.map((yr, i) =>
          i % 5 === 0 ? (
            <Text key={yr} style={{ position: "absolute", left: x(i) - 14, width: 28, top: height - 11, fontSize: 6.8, color: MUTED, textAlign: "center" }}>
              {String(yr)}
            </Text>
          ) : null,
        )}
      </View>
      {series.length > 1 && <Legend items={series} />}
    </View>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, marginTop: 5 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: LAV_2, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: it.color }} />
          <Text style={{ fontSize: 7.2, color: INK2 }}>{T(it.label)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Histogramme annuel (positif bleu roi, négatif rouge). */
function YearBars({ title, years, values, width = CW, height = 140 }: { title?: string; years: number[]; values: number[]; width?: number; height?: number }) {
  const left = 48;
  const bottom = 16;
  const iw = width - left - 8;
  const ih = height - bottom - 8;
  const maxV = niceMax(Math.max(0, ...values));
  const minV = Math.min(0, ...values) < 0 ? -niceMax(-Math.min(0, ...values)) : 0;
  const y = (v: number) => 8 + ih - ((v - minV) / (maxV - minV || 1)) * ih;
  const slot = iw / Math.max(1, years.length);
  const ticks = [minV, minV < 0 ? 0 : maxV / 2, maxV].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <View wrap={false}>
      {title && <Text style={{ ...BOLD, fontSize: 10, color: NAVY, marginBottom: 6 }}>{T(title)}</Text>}
      <View style={{ position: "relative", width, height }}>
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <Line key={t} x1={left} x2={width - 8} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c7cde0" : "#edf0f6"} strokeWidth={0.8} />
          ))}
          {values.map((v, i) => (
            <Rect key={i} x={left + i * slot + 1} y={y(Math.max(0, v))} width={Math.max(1, slot - 2)} height={Math.max(0.5, Math.abs(y(v) - y(0)))} rx={1.5} fill={v >= 0 ? ROYAL : NEG} />
          ))}
        </Svg>
        {ticks.map((t) => (
          <Text key={`l${t}`} style={{ position: "absolute", left: 0, width: left - 8, top: y(t) - 4, fontSize: 6.8, color: MUTED, textAlign: "right" }}>
            {K(t)}
          </Text>
        ))}
        {years.map((yr, i) =>
          i % 5 === 0 ? (
            <Text key={yr} style={{ position: "absolute", left: left + i * slot + slot / 2 - 14, width: 28, top: height - 11, fontSize: 6.8, color: MUTED, textAlign: "center" }}>
              {String(yr)}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

/** Barres groupées par société (ex. loyers vs mensualités). */
function GroupedBars({ title, groups, series, width = CW, height = 170 }: { title?: string; groups: string[]; series: { label: string; color: string; values: number[] }[]; width?: number; height?: number }) {
  const left = 46;
  const bottom = 22;
  const iw = width - left - 8;
  const ih = height - bottom - 8;
  const maxV = niceMax(Math.max(1, ...series.flatMap((x) => x.values)));
  const y = (v: number) => 8 + ih - (v / maxV) * ih;
  const slot = iw / Math.max(1, groups.length);
  const barW = Math.min(26, (slot * 0.7) / series.length);
  const ticks = [0, maxV / 2, maxV];
  return (
    <View wrap={false}>
      {title && <Text style={{ ...BOLD, fontSize: 10, color: NAVY, marginBottom: 4 }}>{T(title)}</Text>}
      <Legend items={series} />
      <View style={{ position: "relative", width, height, marginTop: 6 }}>
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <Line key={t} x1={left} x2={width - 8} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c7cde0" : "#edf0f6"} strokeWidth={0.8} />
          ))}
          {groups.map((_, gi) =>
            series.map((se, si) => {
              const v = se.values[gi] ?? 0;
              const x0 = left + gi * slot + (slot - barW * series.length - 3 * (series.length - 1)) / 2 + si * (barW + 3);
              return <Rect key={`${gi}-${si}`} x={x0} y={y(v)} width={barW} height={Math.max(0.5, y(0) - y(v))} rx={2} fill={se.color} />;
            }),
          )}
        </Svg>
        {ticks.map((t) => (
          <Text key={`t${t}`} style={{ position: "absolute", left: 0, width: left - 8, top: y(t) - 4, fontSize: 6.8, color: MUTED, textAlign: "right" }}>
            {K(t)}
          </Text>
        ))}
        {groups.map((g, gi) => (
          <Text key={g} style={{ position: "absolute", left: left + gi * slot, width: slot, top: height - 16, fontSize: 7, color: INK2, textAlign: "center" }}>
            {T(g)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ——— Couverture et organigramme ———

function CoverArt() {
  // Silhouette de port breton stylisée : immeubles, mâts, vagues.
  const w = 330;
  const h = H - 1;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#173d6e" />
          <Stop offset="100%" stopColor="#0b2545" />
        </LinearGradient>
        <LinearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1f4a86" />
          <Stop offset="100%" stopColor="#0b2545" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill="url(#sky)" />
      <Circle cx={230} cy={150} r={64} fill={GOLD_L} opacity={0.12} />
      <Circle cx={230} cy={150} r={48} fill={GOLD_L} opacity={0.2} />
      <Circle cx={230} cy={150} r={36} fill={GOLD_L} opacity={0.95} />
      <G>
        {[
          [30, 300, 46, 110],
          [80, 270, 38, 140],
          [122, 310, 52, 100],
          [178, 250, 44, 160],
          [226, 290, 40, 120],
          [270, 320, 50, 90],
        ].map(([x, y, bw, bh], i) => (
          <G key={i}>
            <Rect x={x} y={y} width={bw} height={bh} fill={i % 2 ? "#2b4f8c" : "#244478"} />
            <Path d={`M${x - 3},${y} L${x + bw / 2},${y - 18} L${x + bw + 3},${y} Z`} fill={i % 2 ? "#33599a" : "#2b4f8c"} />
            {[0, 1, 2, 3].map((r) =>
              [0, 1].map((c) => (
                <Rect key={`${r}-${c}`} x={x + 8 + c * (bw / 2 - 4)} y={y + 12 + r * 22} width={bw / 2 - 12} height={10} fill={(r + c + i) % 3 === 0 ? GOLD_L : "#5c7fb8"} opacity={(r + c + i) % 3 === 0 ? 0.85 : 0.5} />
              )),
            )}
          </G>
        ))}
      </G>
      <Rect x={0} y={410} width={w} height={h - 410} fill="url(#sea)" />
      {[430, 452, 478, 506, 538].map((yy, i) => (
        <Path key={yy} d={`M${-20 + i * 11},${yy} q30,-7 60,0 t60,0 t60,0 t60,0 t60,0 t60,0`} stroke={i % 2 ? GOLD_L : "#5c7fb8"} strokeWidth={1.1} opacity={0.55} fill="none" />
      ))}
      <Line x1={110} x2={110} y1={330} y2={420} stroke={GOLD_L} strokeWidth={1.4} opacity={0.8} />
      <Path d="M110,336 L140,404 L110,404 Z" fill={GOLD_L} opacity={0.75} />
      <Path d="M92,420 L132,420 L124,430 L98,430 Z" fill={GOLD_L} opacity={0.9} />
    </Svg>
  );
}

interface Person {
  name: string;
  pct?: number;
}

/** Organigramme : associés → holding → sociétés (grille). */
function OrgChartPdf({ data, snap, holding, people }: { data: AppData; snap: Projection["snapshot"]; holding: Company; people: Person[] }) {
  const children = data.companies.filter((c) => c.parentId === holding.id);
  const perRow = Math.min(5, Math.max(1, children.length));
  const gap = 8;
  const boxW = (CW - gap * (perRow - 1)) / perRow;
  const rows: Company[][] = [];
  for (let i = 0; i < children.length; i += perRow) rows.push(children.slice(i, i + perRow));
  const hf = snap.byCompany.get(holding.id);
  const detention = (c: Company) => {
    const partners = c.partners?.filter((p) => p.name) ?? [];
    if (partners.length) return partners.map((p) => `${p.name} ${p.pct !== undefined ? pct(p.pct, 2) : ""}`.trim()).join(" · ");
    if (c.ownershipPct !== undefined) return `${holding.name} ${pct(c.ownershipPct, 2)}`;
    return "Détention à préciser";
  };
  const personW = 150;
  const peopleW = people.length * personW + (people.length - 1) * 16;
  return (
    <View>
      {people.length > 0 && (
        <View style={{ alignItems: "center" }}>
          <View style={{ flexDirection: "row", gap: 16 }}>
            {people.map((p) => (
              <View key={p.name} style={{ width: personW, backgroundColor: "#f6efe2", borderRadius: 8, paddingVertical: 8, alignItems: "center" }}>
                <Text style={{ ...BOLD, fontSize: 10.5, color: NAVY }}>{T(p.name)}</Text>
                <Text style={{ ...XBOLD, fontSize: 17, color: GOLD }}>{p.pct !== undefined ? P(p.pct, 2) : "—"}</Text>
              </View>
            ))}
          </View>
          <Svg width={Math.max(peopleW, 10)} height={18}>
            {people.map((p, i) => {
              const cx = i * (personW + 16) + personW / 2;
              return <Line key={p.name} x1={cx} x2={cx} y1={0} y2={9} stroke="#b9c3dc" strokeWidth={1.2} />;
            })}
            {people.length > 1 && <Line x1={personW / 2} x2={peopleW - personW / 2} y1={9} y2={9} stroke="#b9c3dc" strokeWidth={1.2} />}
            <Line x1={peopleW / 2} x2={peopleW / 2} y1={9} y2={18} stroke="#b9c3dc" strokeWidth={1.2} />
          </Svg>
        </View>
      )}
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 300, backgroundColor: NAVY, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" }}>
          <Text style={{ ...XBOLD, fontSize: 14, color: "#ffffff" }}>{T(holding.name)}</Text>
          <Text style={{ fontSize: 7.5, color: GOLD_L, letterSpacing: 1.2, marginTop: 2 }}>{T(labelOf(COMPANY_KINDS, holding.kind)?.toUpperCase() ?? "")}</Text>
          {hf && (hf.buildings > 0 || hf.debt > 0) && (
            <Text style={{ fontSize: 7.8, color: "#c9d3e8", marginTop: 4 }}>
              {T(`${hf.buildings} immeubles · ${eurCompact(hf.rentMonthly)} de loyers/mois · dette ${eurCompact(hf.debt)}`)}
            </Text>
          )}
        </View>
      </View>
      {rows.map((row, ri) => {
        const rowW = row.length * boxW + (row.length - 1) * gap;
        const offset = (CW - rowW) / 2;
        return (
          <View key={ri} style={{ marginTop: ri === 0 ? 0 : 8 }}>
            {ri === 0 && (
              <Svg width={CW} height={20}>
                <Line x1={CW / 2} x2={CW / 2} y1={0} y2={10} stroke="#b9c3dc" strokeWidth={1.2} />
                <Line x1={offset + boxW / 2} x2={offset + rowW - boxW / 2} y1={10} y2={10} stroke="#b9c3dc" strokeWidth={1.2} />
                {row.map((_, i) => (
                  <Line key={i} x1={offset + i * (boxW + gap) + boxW / 2} x2={offset + i * (boxW + gap) + boxW / 2} y1={10} y2={20} stroke="#b9c3dc" strokeWidth={1.2} />
                ))}
              </Svg>
            )}
            <View style={{ flexDirection: "row", gap, paddingLeft: offset }}>
              {row.map((c) => {
                const f = snap.byCompany.get(c.id);
                const empty = !f || (f.buildings === 0 && f.loans === 0);
                const det = detention(c);
                return (
                  <View key={c.id} style={{ width: boxW, backgroundColor: LAV, borderRadius: 8, padding: 9, minHeight: 78 }}>
                    <Text style={{ ...BOLD, fontSize: 9.5, color: NAVY }}>{T(c.name)}</Text>
                    <Text style={{ fontSize: 6.8, color: INK2, marginTop: 1 }}>{T(labelOf(COMPANY_KINDS, c.kind) ?? c.kind)}</Text>
                    <Text style={{ fontSize: 7, color: det === "Détention à préciser" ? "#b7791f" : ROYAL, marginTop: 4 }}>{T(det)}</Text>
                    {empty ? (
                      <Text style={{ fontSize: 7, color: MUTED, marginTop: 5 }}>Sans actif immobilier</Text>
                    ) : (
                      <View style={{ marginTop: 5 }}>
                        <Text style={{ fontSize: 7.3, color: INK }}>{T(`${f!.units} lots · ${eurCompact(f!.rentMonthly)}/mois`)}</Text>
                        <Text style={{ fontSize: 7.3, color: INK }}>{T(`Dette ${eurCompact(f!.debt)}`)}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Frise horizontale des fins de crédits. */
function EndsTimeline({ events, y0 }: { events: TimelineEvent[]; y0: number }) {
  const lastYear = Math.max(y0 + 10, ...events.map((e) => e.year));
  const span = lastYear - y0 || 1;
  const width = CW;
  const x = (yr: number) => 20 + ((yr - y0) / span) * (width - 40);
  const byYear = new Map<number, TimelineEvent[]>();
  for (const e of events) byYear.set(e.year, [...(byYear.get(e.year) ?? []), e]);
  const entries = [...byYear.entries()].sort((a, b) => a[0] - b[0]);
  return (
    <View style={{ position: "relative", width, height: 118 }} wrap={false}>
      <Svg width={width} height={118}>
        <Line x1={20} x2={width - 20} y1={58} y2={58} stroke={ROYAL} strokeWidth={2} />
        {Array.from({ length: span + 1 }, (_, i) => y0 + i).map((yr) => (
          <Line key={yr} x1={x(yr)} x2={x(yr)} y1={55} y2={61} stroke="#9aa8cf" strokeWidth={0.8} />
        ))}
        {entries.map(([yr], i) => (
          <G key={yr}>
            <Line x1={x(yr)} x2={x(yr)} y1={i % 2 ? 58 : 30} y2={i % 2 ? 86 : 58} stroke={GOLD} strokeWidth={1} />
            <Circle cx={x(yr)} cy={58} r={5} fill={GOLD} />
            <Circle cx={x(yr)} cy={58} r={2.2} fill="#ffffff" />
          </G>
        ))}
      </Svg>
      <Text style={{ position: "absolute", left: 0, top: 63, fontSize: 7, color: MUTED }}>{String(y0)}</Text>
      <Text style={{ position: "absolute", right: 0, top: 63, fontSize: 7, color: MUTED }}>{String(lastYear)}</Text>
      {entries.map(([yr, evs], i) => {
        const freed = evs.reduce((sum, e) => sum + (e.monthlyFreed ?? 0), 0);
        const label = evs.length > 1 ? `${evs.length} crédits` : evs[0].label.replace(/^Fin — /, "").replace(/^Remboursement du capital — /, "Capital ");
        return (
          <View key={yr} style={{ position: "absolute", left: Math.min(Math.max(x(yr) - 45, 0), width - 90), top: i % 2 ? 88 : 0, width: 90, alignItems: "center" }}>
            <Text style={{ ...XBOLD, fontSize: 9, color: NAVY }}>{String(yr)}</Text>
            <Text style={{ fontSize: 6.5, color: INK2, textAlign: "center" }}>{T(label.length > 26 ? `${label.slice(0, 25)}…` : label)}</Text>
            {freed > 0 && <Text style={{ ...SEMI, fontSize: 6.8, color: POS }}>{T(`+${eurCompact(freed)}/mois`)}</Text>}
          </View>
        );
      })}
    </View>
  );
}

// ——— Document ———

export interface DossierInput {
  data: AppData;
  projection: Projection;
  nowMonth: MonthIndex;
  sections: SectionId[];
  scenarios: Scenario[];
  generatedAt: Date;
}

function loanCompany(l: Loan, data: AppData): string {
  const b = data.buildings.find((x) => x.id === l.buildingId);
  return b?.companyId ?? l.companyId ?? NO_COMPANY;
}

export function DossierDocument({ data, projection, nowMonth, sections, scenarios, generatedAt }: DossierInput) {
  const has = (id: SectionId) => sections.includes(id);
  const snap = projection.snapshot;
  const t = snap.total;
  const y0 = yearOf(nowMonth);
  const holding = data.companies.find((c) => c.kind === "holding");
  const groupName = data.settings.groupName || holding?.name || "Patrimoine immobilier";
  const owner = data.settings.ownerName;
  const date = generatedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const years = projection.years.map((r) => r.year);
  const tree = companyTree(data.companies);
  const loanEnds = projection.events.filter((e) => e.kind === "loan_end" || e.kind === "balloon");
  const half = halfDebtYear(projection);
  const free = debtFreeYear(projection);
  const cf = cashflowMonthly(t);
  const unvalued = t.unvalued > 0;
  const net = netWorth(t);
  const loanToValue = ltv(t);
  const companyNames = new Set(data.companies.map((c) => c.name.toLowerCase()));
  const people: Person[] = (holding?.partners ?? []).filter((p) => p.name && !companyNames.has(p.name.toLowerCase()));
  const activeLoans = data.loans.filter((l) => !snap.resolvedLoans.get(l.id)?.finished);
  const sciWithAssets = tree.map(({ company }) => company).filter((c) => {
    const f = snap.ownByCompany.get(c.id);
    return f && (f.buildings > 0 || f.loans > 0);
  });
  const emptyCompanies = data.companies.filter((c) => {
    if (c.kind === "holding") return false;
    const f = snap.byCompany.get(c.id);
    return !f || (f.buildings === 0 && f.loans === 0);
  });
  const hyp = `Hypothèses : revalorisation des biens ${pct(data.settings.valueGrowthPct ?? 0)} / an, indexation des loyers ${pct(data.settings.rentGrowthPct ?? 0)} / an, charges ${pct(data.settings.chargesGrowthPct ?? 0)} / an. Opérations datées au 1er janvier. Calculs déterministes à partir des données déclarées.`;

  // Numérotation des sections effectivement incluses.
  const order: SectionId[] = SECTIONS.map((x) => x.id).filter(
    (id) => has(id) && (id !== "scenarios" || scenarios.length > 0) && (id !== "travaux" || data.works.some((w) => w.status !== "termine")),
  );
  const num = (id: SectionId) => order.indexOf(id) + 1;
  const titles: Record<SectionId, string> = {
    synthese: "Synthèse",
    structure: "Structure du groupe",
    patrimoine: "Patrimoine immobilier",
    credits: "Endettement",
    echeancier: "Échéancier des crédits",
    projection: "Projection à 30 ans",
    chronologie: "Chronologie patrimoniale",
    fiches: "Fiches par société",
    travaux: "Travaux programmés",
    scenarios: "Scénarios étudiés",
  };
  const common = { groupName };

  const keyPoints = [
    `${data.companies.filter((c) => c.kind !== "holding").length} sociétés, ${t.buildings} immeubles et ${t.units} lots${t.vacantUnits ? ` (${t.vacantUnits} vacant${t.vacantUnits > 1 ? "s" : ""})` : ""}.`,
    `Loyers de ${eur(t.rentMonthly)} par mois, soit ${eur(t.rentMonthly * 12)} par an.`,
    loanEnds[0] && `Prochaine fin de crédit en ${loanEnds[0].year} : ${loanEnds[0].label.replace(/^Fin — /, "")}.`,
    half && `La dette est divisée par deux d'ici ${half}, par le seul amortissement des crédits en cours.`,
    free && `Désendettement complet projeté en ${free}.`,
    !unvalued && projection.years[10] && `Patrimoine net projeté à 10 ans (${projection.years[10].year}) : ${eurCompact(projection.years[10].net)}.`,
  ].filter(Boolean) as string[];

  return (
    <Document title={`Dossier patrimonial — ${groupName}`} author={owner ?? groupName} language="fr">
      {/* ——— Couverture ——— */}
      <Page size="A4" orientation="landscape" style={{ fontFamily: FONT, backgroundColor: NAVY, flexDirection: "row" }} wrap={false}>
        <View style={{ width: W - 331, height: H - 1, padding: 48, justifyContent: "space-between" }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 26, height: 2, backgroundColor: GOLD_L }} />
              <Text style={{ ...SEMI, fontSize: 9, letterSpacing: 2.4, color: GOLD_L }}>DOSSIER PATRIMONIAL</Text>
            </View>
          </View>
          <View>
            <Text style={{ ...SEMI, fontSize: 14, color: "#c9d3e8" }}>Synthèse patrimoniale</Text>
            <Text style={{ ...XBOLD, fontSize: 34, color: "#ffffff", lineHeight: 1.15, marginTop: 6, letterSpacing: -0.6 }}>{T(owner ? `${owner}` : groupName)}</Text>
            {owner && <Text style={{ ...BOLD, fontSize: 18, color: GOLD_L, marginTop: 6 }}>{T(groupName)}</Text>}
            <Text style={{ fontSize: 10, color: "#aebbd6", marginTop: 14, lineHeight: 1.5, maxWidth: 380 }}>
              {T(`Structure, patrimoine immobilier, endettement et trajectoire sur 30 ans (${y0} – ${y0 + 30}).`)}
            </Text>
          </View>
          <View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                ["Loyers / an", K(t.rentMonthly * 12)],
                ["Dette", K(t.debt)],
                [unvalued ? "Crédits" : "Patrimoine net", unvalued ? String(activeLoans.length) : K(net)],
                ["Cash-flow / an", K(cf * 12)],
              ].map(([l, v]) => (
                <View key={l} style={{ flex: 1, borderTopWidth: 1.5, borderTopColor: GOLD_L, paddingTop: 7 }}>
                  <Text style={{ ...XBOLD, fontSize: 15, color: "#ffffff" }}>{v}</Text>
                  <Text style={{ fontSize: 7.5, color: "#9fb0cf", marginTop: 2, letterSpacing: 0.6, textTransform: "uppercase" }}>{T(l)}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 8, color: "#7f91b5", marginTop: 18 }}>{T(`${date} · Document confidentiel`)}</Text>
          </View>
        </View>
        <CoverArt />
      </Page>

      {/* ——— Sommaire ——— */}
      {order.length > 2 && (
        <Page size="A4" orientation="landscape" style={s.page}>
          <View style={{ flexDirection: "row", height: H - 86 }}>
            <View style={{ width: 250, backgroundColor: NAVY, borderRadius: 12, padding: 24, justifyContent: "space-between" }}>
              <View>
                <Text style={{ ...SEMI, fontSize: 8, letterSpacing: 2, color: GOLD_L }}>SOMMAIRE</Text>
                <Text style={{ ...XBOLD, fontSize: 24, color: "#ffffff", marginTop: 8, lineHeight: 1.2 }}>{T(groupName)}</Text>
              </View>
              <View>
                <Text style={{ ...XBOLD, fontSize: 28, color: GOLD_L }}>{K(t.rentMonthly * 12)}</Text>
                <Text style={{ fontSize: 8, color: "#aebbd6" }}>de loyers annuels</Text>
                <Text style={{ ...XBOLD, fontSize: 28, color: "#ffffff", marginTop: 14 }}>{String(t.units)}</Text>
                <Text style={{ fontSize: 8, color: "#aebbd6" }}>lots répartis sur {t.buildings} immeubles</Text>
              </View>
            </View>
            <View style={{ flex: 1, paddingLeft: 36, paddingTop: 10 }}>
              {order.map((id) => (
                <View key={id} style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 0.8, borderBottomColor: LINE, paddingVertical: 9 }}>
                  <Text style={{ ...XBOLD, fontSize: 16, color: GOLD, width: 44 }}>{String(num(id)).padStart(2, "0")}</Text>
                  <Text style={{ ...SEMI, fontSize: 12, color: NAVY }}>{T(titles[id])}</Text>
                </View>
              ))}
            </View>
          </View>
          <Footer groupName={groupName} />
        </Page>
      )}

      {/* ——— Synthèse ——— */}
      {has("synthese") && (
        <SectionPage {...common} num={num("synthese")} kicker="Vue d'ensemble" title="Synthèse du patrimoine" lead={`Situation consolidée du groupe au ${date}.`}>
          <View style={{ flexDirection: "row", gap: 14 }}>
            <View style={{ flex: 1.55 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatTile value={unvalued ? "n.c." : K(t.value)} label="Valeur du patrimoine" sub={unvalued ? `${t.unvalued} bien(s) non valorisé(s)` : "Estimations déclarées"} />
                <StatTile value={K(t.debt)} label="Capital restant dû" sub={`${activeLoans.length} crédits en cours`} />
                <StatTile value={net === undefined ? "n.c." : K(net)} label="Patrimoine net" sub={loanToValue === undefined ? "LTV n.c." : `LTV ${P(loanToValue)}`} tone="navy" />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <StatTile tone="lav" value={E(t.rentMonthly)} label="Loyers / mois" sub={`${E(t.rentMonthly * 12)} / an`} />
                <StatTile tone="lav" value={E(t.paymentsMonthly)} label="Mensualités / mois" sub={t.unknownPayment ? "dont estimations" : "assurance comprise"} />
                <StatTile tone="gold" value={E(cf)} label="Cash-flow / mois" sub={`${E(cf * 12)} / an, avant impôt`} />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <StatTile tone="lav" value={String(data.companies.filter((c) => c.kind !== "holding").length)} label="Sociétés" />
                <StatTile tone="lav" value={String(t.buildings)} label="Immeubles" />
                <StatTile tone="lav" value={String(t.units)} label="Lots" />
                <StatTile tone="lav" value={t.cash > 0 ? K(t.cash) : "—"} label="Trésorerie" />
              </View>
            </View>
            <Card tone="navy" title="Points clés" style={{ flex: 1 }}>
              {keyPoints.map((line) => (
                <Bullet key={line} dark>
                  {line}
                </Bullet>
              ))}
            </Card>
          </View>
          {(t.unvalued > 0 || t.unknownDebt > 0 || t.unknownPayment > 0) && (
            <Text style={s.note}>
              {T(
                `Données non communiquées exclues des totaux : ${t.unvalued} bien(s) sans valeur, ${t.unknownDebt} crédit(s) sans capital restant dû, ${t.unknownPayment} mensualité(s) estimée(s).`,
              )}
            </Text>
          )}
        </SectionPage>
      )}

      {/* ——— Structure ——— */}
      {has("structure") && holding && (
        <SectionPage {...common} num={num("structure")} kicker="Organisation" title="Structure du groupe" lead="Organisation juridique : associés, holding et sociétés détenues.">
          <OrgChartPdf data={data} snap={snap} holding={holding} people={people} />
        </SectionPage>
      )}
      {has("structure") && (
        <SectionPage {...common} num={num("structure")} kicker="Organisation" title="Chiffres par société" lead="Chiffres propres à chaque société (hors filiales), consolidés à 100 % dans le total.">
          <Table
            cols={[
              { label: "Société", width: 22, get: (r: { name: string; kind: string; f: Figures }) => r.name, bold: () => true },
              { label: "Forme", width: 8, get: (r) => r.kind },
              { label: "Lots", width: 7, right: true, get: (r) => String(r.f.units) },
              { label: "Valeur", width: 12, right: true, get: (r) => (r.f.unvalued ? "n.c." : K(r.f.value)) },
              { label: "Dette", width: 12, right: true, get: (r) => K(r.f.debt) },
              { label: "Loyers / mois", width: 13, right: true, get: (r) => E(r.f.rentMonthly) },
              { label: "Crédits / mois", width: 13, right: true, get: (r) => E(r.f.paymentsMonthly) },
              { label: "Cash-flow / mois", width: 13, right: true, get: (r) => E(cashflowMonthly(r.f)), color: (r) => (cashflowMonthly(r.f) >= 0 ? POS : NEG) },
            ]}
            rows={[
              ...tree.map(({ company }) => ({ name: company.name, kind: company.kind, f: snap.ownByCompany.get(company.id)! })),
              ...(snap.ownByCompany.get(NO_COMPANY) && (snap.ownByCompany.get(NO_COMPANY)!.buildings > 0 || snap.ownByCompany.get(NO_COMPANY)!.loans > 0)
                ? [{ name: "Détenu en direct", kind: "—", f: snap.ownByCompany.get(NO_COMPANY)! }]
                : []),
            ]}
            total={{ name: "Total groupe", kind: "", f: t }}
          />
        </SectionPage>
      )}

      {/* ——— Patrimoine ——— */}
      {has("patrimoine") && (
        <SectionPage {...common} num={num("patrimoine")} kicker="Actifs" title="Patrimoine immobilier" lead="Inventaire des immeubles, valeurs estimées et revenus locatifs.">
          <Table
            cols={[
              { label: "Immeuble", width: 24, get: (b: (typeof data.buildings)[number]) => b.name, bold: () => true },
              { label: "Société", width: 15, get: (b) => data.companies.find((c) => c.id === b.companyId)?.name ?? "En direct" },
              { label: "Commune", width: 13, get: (b) => b.city ?? "—" },
              { label: "Lots", width: 6, right: true, get: (b) => String(snap.byBuilding.get(b.id)?.units ?? 0) },
              { label: "Valeur", width: 11, right: true, get: (b) => (snap.byBuilding.get(b.id)?.unvalued ? "n.c." : K(snap.byBuilding.get(b.id)?.value)) },
              { label: "Dette", width: 10, right: true, get: (b) => K(snap.byBuilding.get(b.id)?.debt) },
              { label: "Loyers / mois", width: 12, right: true, get: (b) => E(snap.byBuilding.get(b.id)?.rentMonthly) },
              {
                label: "Rdt brut",
                width: 9,
                right: true,
                get: (b) => {
                  const f = snap.byBuilding.get(b.id);
                  return f && f.value > 0 && !f.unvalued ? P(((f.rentMonthly * 12) / f.value) * 100) : "—";
                },
              },
            ]}
            rows={data.buildings}
          />
        </SectionPage>
      )}

      {/* ——— Endettement ——— */}
      {has("credits") && (
        <SectionPage {...common} num={num("credits")} kicker="Financement" title="Endettement" lead="Encours bancaires au jour du dossier. Mensualités assurance comprise. * mensualité estimée (taux non communiqué) · n.c. : non communiqué.">
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <StatTile value={K(t.debt)} label="Capital restant dû" sub={`${activeLoans.length} crédits en cours`} />
            <StatTile value={E(t.paymentsMonthly)} label="Mensualités / mois" sub={t.unknownPayment ? `${t.unknownPayment} estimée(s)` : "assurance comprise"} tone="navy" />
            <StatTile tone="lav" value={loanToValue === undefined ? "n.c." : P(loanToValue)} label="LTV" sub="Dette / valeur" />
            <StatTile tone="gold" value={t.paymentsMonthly > 0 ? P((t.rentMonthly / t.paymentsMonthly) * 100, 0) : "—"} label="Couverture" sub="Loyers / mensualités" />
          </View>
          <Table
            cols={[
              { label: "Crédit", width: 20, get: (l: Loan) => l.name || "Crédit", bold: () => true },
              { label: "Société", width: 14, get: (l) => companyLabel(data, loanCompany(l, data)) },
              { label: "Banque", width: 16, get: (l) => l.bank ?? "—" },
              { label: "CRD", width: 10, right: true, get: (l) => { const b = snap.byLoan.get(l.id)?.balance; return b === undefined ? "n.c." : K(b); } },
              { label: "Mensualité", width: 11, right: true, get: (l) => { const r = snap.resolvedLoans.get(l.id); const m = snap.byLoan.get(l.id)?.paymentMonthly; return m ? `${E(m)}${l.monthlyPayment === undefined && l.ratePct === undefined && !r?.impliedRatePct ? "*" : ""}` : "n.c."; } },
              { label: "Taux", width: 8, right: true, get: (l) => (l.ratePct !== undefined ? P(l.ratePct, 2) : "—") },
              { label: "Fin", width: 11, right: true, get: (l) => { const r = snap.resolvedLoans.get(l.id); return r?.endMonth !== undefined ? monthLabel(r.endMonth) : "n.c."; } },
              { label: "Type", width: 10, right: true, get: (l) => (l.kind === "in_fine" ? "In fine" : "Amortissable") },
            ]}
            rows={activeLoans}
          />
        </SectionPage>
      )}
      {has("credits") && sciWithAssets.length > 0 && (
        <SectionPage {...common} num={num("credits")} kicker="Financement" title="Crédits par société" lead="Détail des crédits en cours et comparaison des loyers aux mensualités.">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {sciWithAssets.map((c) => {
              const loans = activeLoans.filter((l) => loanCompany(l, data) === c.id);
              const f = snap.ownByCompany.get(c.id)!;
              return (
                <View key={c.id} style={{ width: (CW - 16) / 3, backgroundColor: LAV, borderRadius: 8, padding: 10 }} wrap={false}>
                  <Text style={{ ...BOLD, fontSize: 10.5, color: NAVY }}>{T(c.name)}</Text>
                  <Text style={{ fontSize: 7.8, color: INK2, marginBottom: 5 }}>{T(`${loans.length} crédit${loans.length > 1 ? "s" : ""} — total ${eur(f.debt)}`)}</Text>
                  {loans.map((l) => {
                    const r = snap.resolvedLoans.get(l.id);
                    const b = snap.byLoan.get(l.id)?.balance;
                    return (
                      <View key={l.id} style={{ flexDirection: "row", marginBottom: 2 }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ROYAL, marginTop: 3.5, marginRight: 5 }} />
                        <Text style={{ fontSize: 7.8, color: INK, flex: 1 }}>
                          {T(`${b === undefined ? "n.c." : eur(b)} — fin ${r?.endMonth !== undefined ? monthLabel(r.endMonth) : "n.c."}`)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
          <View style={{ marginTop: 14 }}>
            <GroupedBars
              title="Loyers vs mensualités (par mois)"
              groups={sciWithAssets.map((c) => c.name)}
              series={[
                { label: "Loyers mensuels", color: NAVY, values: sciWithAssets.map((c) => snap.ownByCompany.get(c.id)?.rentMonthly ?? 0) },
                { label: "Mensualités de crédit", color: ROYAL_2, values: sciWithAssets.map((c) => snap.ownByCompany.get(c.id)?.paymentsMonthly ?? 0) },
              ]}
              height={150}
            />
          </View>
        </SectionPage>
      )}

      {/* ——— Échéancier ——— */}
      {has("echeancier") && (
        <SectionPage {...common} num={num("echeancier")} kicker="Trajectoire" title="Échéancier des crédits" lead="Chaque fin de crédit libère une mensualité et améliore mécaniquement le cash-flow.">
          {loanEnds.length === 0 ? (
            <Text style={s.lead}>Aucune échéance sur l&apos;horizon de projection.</Text>
          ) : (
            <EndsTimeline events={loanEnds} y0={y0} />
          )}
          <View style={{ flexDirection: "row", gap: 14, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Table
                cols={[
                  { label: "Date", width: 22, get: (e: TimelineEvent) => monthLabel(e.month), bold: () => true },
                  { label: "Crédit", width: 44, get: (e) => e.label.replace(/^Fin — /, "").replace(/^Remboursement du capital — /, "Capital in fine — ") },
                  { label: "Impact", width: 34, right: true, get: (e) => (e.kind === "balloon" ? `- ${eurCompact(e.amount)}` : `+${eur(e.monthlyFreed)}/mois`), color: (e) => (e.kind === "balloon" ? NEG : POS) },
                ]}
                rows={loanEnds.slice(0, 13)}
              />
              {loanEnds.length > 13 && <Text style={s.note}>{T(`+ ${loanEnds.length - 13} autres échéances (voir la chronologie).`)}</Text>}
            </View>
            <View style={{ width: 330 }}>
              <AreaChart title="Capital restant dû projeté" years={years} series={[{ label: "Dette", values: projection.years.map((r) => r.debt), color: ROYAL }]} width={330} height={170} />
            </View>
          </View>
        </SectionPage>
      )}

      {/* ——— Projection ——— */}
      {has("projection") && (
        <SectionPage {...common} num={num("projection")} kicker="Trajectoire" title="Projection à 30 ans" lead={hyp}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[5, 10, 15, 20, 30].map((h) => {
              const r = projection.years[h];
              if (!r) return null;
              return (
                <View key={h} style={{ flex: 1, backgroundColor: h === 10 ? NAVY : LAV, borderRadius: 8, padding: 10 }}>
                  <Text style={{ ...SEMI, fontSize: 7.5, color: h === 10 ? GOLD_L : GOLD, letterSpacing: 1 }}>{T(`DANS ${h} ANS`)}</Text>
                  <Text style={{ ...XBOLD, fontSize: 16, color: h === 10 ? "#ffffff" : NAVY }}>{String(r.year)}</Text>
                  <Text style={{ fontSize: 7.8, color: h === 10 ? "#c9d3e8" : INK2, marginTop: 5 }}>{T(`Dette : ${eurCompact(r.debt)}`)}</Text>
                  <Text style={{ fontSize: 7.8, color: h === 10 ? "#c9d3e8" : INK2 }}>{T(`Cash-flow : ${eurCompact(r.cashflow / 12)}/mois`)}</Text>
                  <Text style={{ fontSize: 7.8, color: h === 10 ? "#c9d3e8" : INK2 }}>{T(`Net : ${unvalued ? "n.c." : eurCompact(r.net)}`)}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              {unvalued ? (
                <AreaChart title="Capital restant dû" years={years} series={[{ label: "Dette", values: projection.years.map((r) => r.debt), color: ROYAL }]} width={(CW - 16) / 2} height={180} />
              ) : (
                <AreaChart title="Patrimoine net" years={years} series={[{ label: "Patrimoine net", values: projection.years.map((r) => r.net), color: ROYAL }]} width={(CW - 16) / 2} height={180} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <YearBars title="Cash-flow annuel" years={years} values={projection.years.map((r) => r.cashflow)} width={(CW - 16) / 2} height={180} />
            </View>
          </View>
        </SectionPage>
      )}

      {/* ——— Chronologie ——— */}
      {has("chronologie") && (
        <SectionPage {...common} num={num("chronologie")} kicker="Trajectoire" title="Chronologie patrimoniale" lead="Événements structurants des 30 prochaines années.">
          {projection.events.length === 0 ? (
            <Text style={s.lead}>Aucun événement programmé.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[...new Set(projection.events.map((e) => e.year))].map((year) => (
                <View key={year} style={{ width: (CW - 20) / 3, flexDirection: "row" }} wrap={false}>
                  <View style={{ width: 44, alignItems: "center" }}>
                    <View style={{ backgroundColor: NAVY, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 6 }}>
                      <Text style={{ ...XBOLD, fontSize: 9, color: "#ffffff" }}>{String(year)}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, borderLeftWidth: 1.5, borderLeftColor: GOLD, paddingLeft: 8, paddingBottom: 4 }}>
                    {projection.events
                      .filter((e) => e.year === year)
                      .map((e) => (
                        <Text key={e.id} style={{ fontSize: 7.8, marginBottom: 2, lineHeight: 1.35, color: INK }}>
                          {T(`${e.label.replace(/^Fin — /, "Fin : ")}${e.monthlyFreed ? ` (+${eur(e.monthlyFreed)}/mois)` : e.amount ? ` (${eurCompact(e.amount)})` : ""}`)}
                        </Text>
                      ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionPage>
      )}

      {/* ——— Fiches ——— */}
      {has("fiches") &&
        tree
          .map(({ company }) => company)
          .filter((c) => !emptyCompanies.some((e) => e.id === c.id))
          .map((c) => {
            const f = snap.byCompany.get(c.id)!;
            const own = snap.ownByCompany.get(c.id)!;
            const buildings = data.buildings.filter((b) => b.companyId === c.id);
            const loans = activeLoans.filter((l) => loanCompany(l, data) === c.id);
            const rows = projection.byCompany.get(c.id) ?? [];
            const parent = data.companies.find((p) => p.id === c.parentId);
            const figs = c.kind === "holding" ? f : own;
            const partners = c.partners?.filter((p) => p.name) ?? [];
            return (
              <Page key={c.id} size="A4" orientation="landscape" style={s.page}>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View style={{ width: 230, backgroundColor: NAVY, borderRadius: 12, padding: 18 }}>
                    <Text style={{ ...SEMI, fontSize: 7.5, color: GOLD_L, letterSpacing: 1.6 }}>{T(`${String(num("fiches")).padStart(2, "0")} · FICHE SOCIÉTÉ`)}</Text>
                    <Text style={{ ...XBOLD, fontSize: 20, color: "#ffffff", marginTop: 6 }}>{T(c.name)}</Text>
                    <Text style={{ fontSize: 8.5, color: "#aebbd6", marginTop: 2 }}>{T(labelOf(COMPANY_KINDS, c.kind) ?? c.kind)}</Text>
                    <View style={{ height: 1, backgroundColor: "#2a4570", marginVertical: 12 }} />
                    {[
                      ["Loyers / mois", E(figs.rentMonthly)],
                      ["Mensualités / mois", E(figs.paymentsMonthly)],
                      ["Cash-flow / mois", E(cashflowMonthly(figs))],
                      ["Capital restant dû", E(figs.debt)],
                      ["Valeur", figs.unvalued ? "n.c." : E(figs.value)],
                      ["Trésorerie", figs.cash ? E(figs.cash) : "—"],
                    ].map(([l, v]) => (
                      <View key={l} style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 7.5, color: "#8fa0c4" }}>{T(l)}</Text>
                        <Text style={{ ...BOLD, fontSize: 13, color: "#ffffff" }}>{v}</Text>
                      </View>
                    ))}
                    <View style={{ height: 1, backgroundColor: "#2a4570", marginVertical: 8 }} />
                    <Text style={{ fontSize: 7.5, color: "#8fa0c4" }}>Détention</Text>
                    {partners.length > 0 ? (
                      partners.map((p) => (
                        <Text key={p.name} style={{ ...SEMI, fontSize: 9, color: GOLD_L }}>
                          {T(`${p.name}${p.pct !== undefined ? ` — ${pct(p.pct, 2)}` : ""}`)}
                        </Text>
                      ))
                    ) : (
                      <Text style={{ fontSize: 8.5, color: "#c9d3e8" }}>
                        {T(parent ? `${parent.name}${c.ownershipPct ? ` — ${pct(c.ownershipPct, 2)}` : " (à préciser)"}` : "À préciser")}
                      </Text>
                    )}
                    {own.partnerAccounts > 0 && <Text style={{ fontSize: 8, color: "#c9d3e8", marginTop: 6 }}>{T(`Comptes courants : ${eur(own.partnerAccounts)}`)}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    {buildings.length > 0 && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={s.h2}>Immeubles</Text>
                        <Table
                          cols={[
                            { label: "Immeuble", width: 40, get: (b: (typeof buildings)[number]) => `${b.name}${b.city ? ` (${b.city})` : ""}`, bold: () => true },
                            { label: "Lots", width: 12, right: true, get: (b) => String(snap.byBuilding.get(b.id)?.units ?? 0) },
                            { label: "Valeur", width: 24, right: true, get: (b) => (snap.byBuilding.get(b.id)?.unvalued ? "n.c." : K(snap.byBuilding.get(b.id)?.value)) },
                            { label: "Loyers / mois", width: 24, right: true, get: (b) => E(snap.byBuilding.get(b.id)?.rentMonthly) },
                          ]}
                          rows={buildings}
                        />
                      </View>
                    )}
                    {loans.length > 0 && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={s.h2}>Crédits</Text>
                        <Table
                          cols={[
                            { label: "Crédit", width: 40, get: (l: Loan) => `${l.name || "Crédit"}${l.bank ? ` — ${l.bank}` : ""}`, bold: () => true },
                            { label: "CRD", width: 20, right: true, get: (l) => { const b = snap.byLoan.get(l.id)?.balance; return b === undefined ? "n.c." : K(b); } },
                            { label: "Mensualité", width: 20, right: true, get: (l) => E(snap.byLoan.get(l.id)?.paymentMonthly) },
                            { label: "Fin", width: 20, right: true, get: (l) => { const r = snap.resolvedLoans.get(l.id); return r?.endMonth !== undefined ? monthLabel(r.endMonth) : "n.c."; } },
                          ]}
                          rows={loans}
                        />
                      </View>
                    )}
                    {buildings.length === 0 && loans.length === 0 && (
                      <Card title="Sans actif immobilier">
                        <Text style={{ fontSize: 9, color: INK2, lineHeight: 1.45 }}>{T(c.notes || "Entité sans actif immobilier à ce jour.")}</Text>
                      </Card>
                    )}
                    {rows.length > 0 && own.debt > 0 && (
                      <AreaChart title="Dette projetée de la société" years={rows.map((r) => r.year)} series={[{ label: "Dette", values: rows.map((r) => r.debt), color: ROYAL }]} width={CW - 246} height={130} />
                    )}
                  </View>
                </View>
                <Footer groupName={groupName} />
              </Page>
            );
          })}

      {has("fiches") && emptyCompanies.length > 0 && (
        <SectionPage {...common} num={num("fiches")} kicker="Fiche société" title="Sociétés sans actif immobilier" lead="Entités du groupe ne détenant pas d'immeuble à ce jour.">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {emptyCompanies.map((c) => {
              const parent = data.companies.find((p) => p.id === c.parentId);
              const partners = c.partners?.filter((p) => p.name) ?? [];
              return (
                <View key={c.id} style={{ width: (CW - 20) / 3, backgroundColor: LAV, borderRadius: 8, padding: 12 }} wrap={false}>
                  <Text style={{ ...XBOLD, fontSize: 13, color: NAVY }}>{T(c.name)}</Text>
                  <Text style={{ fontSize: 8, color: INK2, marginBottom: 6 }}>{T(labelOf(COMPANY_KINDS, c.kind) ?? c.kind)}</Text>
                  <Text style={{ fontSize: 8.5, color: INK, lineHeight: 1.45 }}>{T(c.notes || "Entité sans actif immobilier à ce jour.")}</Text>
                  <Text style={{ fontSize: 7.8, color: ROYAL, marginTop: 6 }}>
                    {T(partners.length ? partners.map((p) => `${p.name}${p.pct !== undefined ? ` ${pct(p.pct, 2)}` : ""}`).join(" · ") : parent ? `Rattachée à ${parent.name}` : "")}
                  </Text>
                </View>
              );
            })}
          </View>
        </SectionPage>
      )}

      {/* ——— Travaux ——— */}
      {has("travaux") && data.works.some((w) => w.status !== "termine") && (
        <SectionPage {...common} num={num("travaux")} kicker="Entretien" title="Travaux programmés" lead="Dépenses programmées, intégrées aux projections de trésorerie.">
          {data.works.filter((w) => w.status !== "termine").length === 0 ? (
            <Text style={s.lead}>Aucun travaux programmés.</Text>
          ) : (
            <Table
              cols={[
                { label: "Année", width: 10, get: (w: (typeof data.works)[number]) => (w.year ? String(w.year) : "—"), bold: () => true },
                { label: "Travaux", width: 34, get: (w) => w.label },
                { label: "Immeuble / société", width: 28, get: (w) => (w.id === TOTAL ? "" : (data.buildings.find((b) => b.id === w.buildingId)?.name ?? companyLabel(data, w.companyId ?? NO_COMPANY))) },
                { label: "État", width: 12, get: (w) => (w.id === TOTAL ? "" : (labelOf(WORK_STATUSES, w.status ?? "prevu") ?? "")) },
                { label: "Montant", width: 16, right: true, get: (w) => E(w.amount) },
              ]}
              rows={data.works.filter((w) => w.status !== "termine").sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))}
              total={{ id: TOTAL, label: "Total", amount: data.works.filter((w) => w.status !== "termine").reduce((a, w) => a + (w.amount ?? 0), 0) }}
            />
          )}
        </SectionPage>
      )}

      {/* ——— Scénarios ——— */}
      {has("scenarios") &&
        scenarios.map((sc) => {
          const cmp = compareScenario(data, nowMonth, sc, projection);
          return (
            <SectionPage key={sc.id} {...common} num={num("scenarios")} kicker="Scénario" title={sc.name} lead="Simulation comparée à la trajectoire actuelle. Non intégrée aux données réelles.">
              {cmp.sim.sales.map((sale) => (
                <View key={sale.actionId} style={{ marginBottom: 12 }} wrap={false}>
                  <Text style={s.h2}>{T(`Vente de ${data.buildings.find((b) => b.id === sale.buildingId)?.name ?? "l'immeuble"} en ${sale.year}`)}</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <StatTile tone="lav" value={E(sale.price)} label="Prix de vente" />
                    <StatTile tone="lav" value={E(sale.debtRepaid)} label="Dette remboursée" />
                    <StatTile tone="lav" value={E(sale.fees + sale.tax)} label="Frais et impôts" />
                    <StatTile value={E(sale.netCash)} label="Trésorerie dégagée" tone="navy" />
                  </View>
                </View>
              ))}
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1.2 }}>
                  <Table
                    cols={[
                      { label: "Année", width: 14, get: (p: (typeof cmp.points)[number]) => String(p.year), bold: () => true },
                      { label: unvalued ? "Tréso. avant" : "Patrim. avant", width: 22, right: true, get: (p) => K(unvalued ? p.before.treasury : totalWealth(p.before)) },
                      { label: unvalued ? "Tréso. après" : "Patrim. après", width: 22, right: true, get: (p) => K(unvalued ? p.after.treasury : totalWealth(p.after)) },
                      { label: "CF/an avant", width: 21, right: true, get: (p) => K(p.before.cashflow) },
                      { label: "CF/an après", width: 21, right: true, get: (p) => K(p.after.cashflow) },
                    ]}
                    rows={cmp.points}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AreaChart
                    title={unvalued ? "Trésorerie cumulée" : "Patrimoine net + trésorerie"}
                    years={years}
                    area={false}
                    width={(CW - 16) / 2.2}
                    height={170}
                    series={[
                      { label: "Trajectoire actuelle", values: cmp.base.years.map((r) => (unvalued ? r.treasury : totalWealth(r))), color: ROYAL },
                      { label: "Avec le scénario", values: cmp.sim.years.map((r) => (unvalued ? r.treasury : totalWealth(r))), color: ORANGE, dashed: true },
                    ]}
                  />
                </View>
              </View>
            </SectionPage>
          );
        })}

      {/* ——— Méthodologie ——— */}
      <SectionPage {...common} kicker="Annexe" title="Méthodologie">
        <View style={{ flexDirection: "row", gap: 14 }}>
          {[
            ["Sources", "Montants issus des données déclarées et des tableaux d'amortissement bancaires. Une donnée manquante est signalée « n.c. » et exclue des totaux : aucune valeur n'est inventée."],
            ["Crédits", "Capital restant dû calculé mois par mois à partir de l'échéancier (montant, taux, durée) ou, à défaut, du capital restant dû, de la mensualité et de la date de fin."],
            ["Cash-flow", "Loyers hors charges des lots occupés − charges annuelles − mensualités de crédits assurance comprise. Avant impôt. LTV = dette / valeur estimée."],
          ].map(([title, text]) => (
            <Card key={title} title={title} style={{ flex: 1 }}>
              <Text style={{ fontSize: 8.8, color: INK2, lineHeight: 1.5 }}>{T(text)}</Text>
            </Card>
          ))}
        </View>
        <Text style={[s.note, { marginTop: 14 }]}>{T(`${hyp} Document généré le ${dateFr(generatedAt.toISOString().slice(0, 10))}.`)}</Text>
      </SectionPage>
    </Document>
  );
}
