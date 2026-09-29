import { renderToBuffer, Circle, ClipPath, Defs, G, Document, Line, LinearGradient, Page, Path, RadialGradient, Rect, Stop, Svg, Text, View } from "@react-pdf/renderer";
import type { AppData, Company, PdfPrefs, Project } from "../types";
import type { MonthIndex } from "../engine/dates";
import { yearOf } from "../engine/dates";
import { remunerationYear } from "../fiscal/remuneration";
import { BAREME_YEAR } from "../fiscal/bareme";
import { cashflowMonthly, type Figures } from "../engine/snapshot";
import type { Projection } from "../engine/projection";
import { groupModel, type GroupModel } from "./model";
import { projectCompanyName, projectFigures } from "../engine/projects";
import type { ProjectImpact } from "../engine/project-impact";
import { eur, eurCompact, pct, pdfSafe, dateFr } from "../format";
import type { PdfCover } from "../types";
import { CONDITIONS, UNIT_TYPES, WITHDRAWAL_KINDS, labelOf } from "../labels";
import { DEFAULT_COVER, pdfColors, shows, type PdfColors } from "./prefs";
import { FONT, W600, W700, W800, kitFor, type Kit } from "./kit";

// Dossier banque, format A4 portrait : court (6 à 8 pages), sans répétition,
// uniquement des chiffres connus. Deux usages :
//  - présentation du groupe (ou d'une seule société) ;
//  - dossier de financement d'un projet, suivi du groupe en résumé.
// Tous les chiffres viennent des moteurs de l'application. Les couleurs
// viennent du thème (lib/theme.ts), la mise en page du modèle choisi (kit.ts).

// Neutres du modèle « signature » (couvertures Immersive, Bandeau, Épurée).
const INK = "#141c24";
const INK2 = "#4d5663";
const MUTED = "#8b929c";
const LINE = "#e4e7ec";

// Palette et modèle du document en cours. Les routes serveur n'ont pas accès
// au contexte React ; l'arbre react-pdf est rendu d'un seul tenant (sans
// attente), donc ce qui est posé par renderDossier vaut pour tous ses
// composants et ne peut pas se mêler à un autre rendu.
let current: PdfColors = pdfColors(undefined, undefined);
let currentKit: Kit = kitFor(undefined, current);
const cur = () => current;
const kit = () => currentKit;

/** Rend un dossier aux couleurs et au modèle choisis (seule entrée utilisée par les routes). */
export function renderDossier(el: React.ReactElement<GroupDossierInput>, prefs: PdfPrefs | undefined, appTheme: string | undefined): Promise<Buffer> {
  current = pdfColors(prefs, appTheme);
  currentKit = kitFor(prefs?.cover, current);
  // Le rendu de l'arbre démarre ici même, sans attente : rien ne peut changer entre-temps.
  return renderToBuffer(el as Parameters<typeof renderToBuffer>[0]);
}

const PW = 595.28;
const PH = 841.89;
const MX = 44;
const CW = PW - MX * 2;

const T = (s: string | undefined) => pdfSafe(s ?? "");
const E = (n: number | undefined) => (n === undefined ? "—" : pdfSafe(eur(n)));
const K = (n: number | undefined) => (n === undefined ? "—" : pdfSafe(eurCompact(n)));
const P = (n: number | undefined, d = 1) => (n === undefined ? "—" : pdfSafe(pct(n, d)));
const S = (n: number) => pdfSafe(`${n >= 0 ? "+" : "−"}${eur(Math.abs(n))}`);
const two = (n: number) => String(n).padStart(2, "0");
const base = { fontFamily: FONT, fontSize: 9, color: INK };

/** Petites capitales espacées (étiquettes, en-têtes de colonnes). */
const caps = (size: number, spacing = 1.2) => ({ fontSize: size, textTransform: "uppercase" as const, letterSpacing: spacing });

// ——— Mise en page ———

/** Numéro et nom de chaque partie, calculés une fois pour le sommaire et les pages. */
interface Section {
  n: number;
  label: string;
}

function Footer({ label }: { label: string }) {
  const c = cur();
  const k = kit();
  const pill =
    k.id === "bento"
      ? { ...W700, color: k.accent, backgroundColor: k.card, borderRadius: 7, paddingVertical: 2, paddingHorizontal: 7 }
      : k.id === "signature"
        ? { ...W700, color: c.brand, backgroundColor: c.soft, borderRadius: 7, paddingVertical: 2, paddingHorizontal: 7 }
        : k.id === "editorial"
          ? { ...k.italic, color: k.ink2, fontSize: 8 }
          : { ...k.display, color: k.accent };
  return (
    <View fixed style={{ position: "absolute", bottom: 22, left: MX, right: MX, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: k.id === "suisse" ? 1.2 : 0.5, borderTopColor: k.id === "suisse" ? k.ink : k.line, paddingTop: 7 }}>
      <Text style={{ fontSize: 7, color: k.muted }}>{T(label)}</Text>
      <Text style={{ fontSize: 7, ...pill }} render={({ pageNumber, totalPages }) => (k.id === "editorial" ? `${pageNumber}` : k.id === "suisse" ? `${two(pageNumber)} / ${two(totalPages)}` : `${pageNumber} / ${totalPages}`)} />
    </View>
  );
}

function SectionHead({ section, title }: { section?: Section; title: string }) {
  const c = cur();
  const k = kit();
  if (k.id === "editorial")
    return (
      <View style={{ marginBottom: 18 }}>
        {section && <Text style={{ ...W700, ...caps(7.5, 2), color: k.accent, marginBottom: 6 }}>{T(`Chapitre ${two(section.n)} · ${section.label}`)}</Text>}
        <Text style={{ ...k.display, fontSize: 26, color: k.heading, lineHeight: 1.12, letterSpacing: -0.4 }}>{T(title)}</Text>
        <View style={{ height: 0.8, backgroundColor: k.ink, marginTop: 10 }} />
      </View>
    );
  if (k.id === "bento")
    return (
      <View style={{ marginBottom: 16 }}>
        {section && (
          <View style={{ flexDirection: "row", alignSelf: "flex-start", backgroundColor: k.card, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 9, marginBottom: 8 }}>
            <Text style={{ ...k.display, fontSize: 8, color: k.accent }}>{two(section.n)}</Text>
            <Text style={{ fontSize: 8, color: k.ink2, marginLeft: 6 }}>{T(section.label)}</Text>
          </View>
        )}
        <Text style={{ ...k.display, fontSize: 24, color: k.heading, letterSpacing: -0.6, lineHeight: 1.1 }}>{T(title)}</Text>
      </View>
    );
  if (k.id === "suisse")
    return (
      <View style={{ borderTopWidth: 2.2, borderTopColor: k.ink, paddingTop: 10, marginBottom: 18, flexDirection: "row", gap: 14 }}>
        {section && <Text style={{ ...k.display, fontSize: 44, color: k.accent, lineHeight: 0.9, width: 66, letterSpacing: -2 }}>{two(section.n)}</Text>}
        <View style={{ flex: 1 }}>
          {section && <Text style={{ ...k.display, ...caps(7.5, 1.5), color: k.ink2, marginBottom: 4 }}>{T(section.label)}</Text>}
          <Text style={{ ...k.display, fontSize: 21, color: k.heading, letterSpacing: -0.5, lineHeight: 1.1 }}>{T(title)}</Text>
        </View>
      </View>
    );
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: c.soft }}>
      {section && <Text style={{ ...W800, fontSize: 34, color: c.brand, lineHeight: 1, letterSpacing: -1 }}>{two(section.n)}</Text>}
      <View style={{ flex: 1, paddingBottom: 2 }}>
        {section && <Text style={{ ...W700, ...caps(7.5, 1.6), color: c.brand, marginBottom: 3 }}>{T(section.label)}</Text>}
        <Text style={{ ...W800, fontSize: 19, color: c.deep, letterSpacing: -0.3, lineHeight: 1.15 }}>{T(title)}</Text>
      </View>
    </View>
  );
}

function Sheet({ label, running, section, title, children }: { label: string; running: string; section?: Section; title: string; children: React.ReactNode }) {
  const c = cur();
  const k = kit();
  return (
    <Page size="A4" style={{ fontFamily: FONT, fontSize: 9, color: k.ink, backgroundColor: k.paper, paddingTop: 66, paddingBottom: 60, paddingHorizontal: MX }} wrap>
      <View fixed style={{ position: "absolute", top: 26, left: MX, right: MX, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {k.id !== "editorial" && <View style={{ width: 8, height: 8, borderRadius: k.id === "suisse" ? 0 : k.id === "bento" ? 4 : 2, backgroundColor: k.id === "bento" ? k.accent : c.brand }} />}
          <Text style={k.id === "editorial" ? { ...k.italic, fontSize: 9, color: k.heading } : { ...(k.id === "signature" ? W700 : k.display), ...caps(7, 1.2), color: k.heading }}>{T(running)}</Text>
        </View>
        {section && <Text style={{ fontSize: 7, color: k.muted }}>{T(`${two(section.n)} · ${section.label}`)}</Text>}
      </View>
      <SectionHead section={section} title={title} />
      {children}
      <Footer label={label} />
    </Page>
  );
}

function H2({ children, top = 18 }: { children: string; top?: number }) {
  const c = cur();
  const k = kit();
  const marker =
    k.id === "signature" ? <View style={{ width: 3, height: 11, borderRadius: 1.5, backgroundColor: c.brand }} /> : k.id === "bento" ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: k.accent }} /> : k.id === "suisse" ? <View style={{ width: 7, height: 7, backgroundColor: k.accent }} /> : null;
  const font = k.id === "editorial" ? { ...k.display, fontSize: 13.5 } : k.id === "suisse" ? { ...k.display, ...caps(9.5, 0.8) } : k.id === "bento" ? { ...k.display, fontSize: 12 } : { ...W700, fontSize: 11 };
  return (
    <View minPresenceAhead={60} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: top, marginBottom: 7 }}>
      {marker}
      <Text style={{ ...font, color: k.heading }}>{T(children)}</Text>
    </View>
  );
}

function Para({ children }: { children: string }) {
  return <Text style={{ fontSize: 9, color: kit().ink2, lineHeight: 1.55 }}>{T(children)}</Text>;
}

function Note({ children }: { children: string }) {
  return <Text style={{ fontSize: 7, color: kit().muted, marginTop: 7, lineHeight: 1.45 }}>{T(children)}</Text>;
}

/** Mot d'introduction du dirigeant, tel qu'il l'a écrit. */
function Message({ text, author }: { text: string; author?: string }) {
  const c = cur();
  const k = kit();
  if (k.id === "editorial")
    return (
      <View wrap={false} style={{ flexDirection: "row", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: k.line }}>
        <Text style={{ ...k.display, fontSize: 40, color: k.accent, lineHeight: 0.9 }}>“</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ ...k.italic, fontSize: 12, color: k.ink, lineHeight: 1.5 }}>{T(text)}</Text>
          {author && <Text style={{ ...W700, ...caps(7, 1.4), color: k.accent, marginTop: 7 }}>{T(author)}</Text>}
        </View>
      </View>
    );
  const suisse = k.id === "suisse";
  return (
    <View wrap={false} style={{ backgroundColor: suisse ? c.brand : k.id === "bento" ? k.card : c.soft, borderRadius: suisse ? 0 : k.id === "bento" ? 12 : 8, borderLeftWidth: suisse ? 0 : 3, borderLeftColor: k.id === "bento" ? k.accent : c.brand, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14 }}>
      <Text style={{ fontSize: 9.4, color: suisse ? c.onBrand : k.ink, lineHeight: 1.6 }}>{T(text)}</Text>
      {author && <Text style={{ ...W600, fontSize: 8, color: suisse ? c.onBrand : k.id === "bento" ? k.accent : c.brand, marginTop: 6 }}>{T(author)}</Text>}
    </View>
  );
}

interface Kpi {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
}

/** Fond dégradé du thème, comme les cartes principales de l'application. */
function DeepBackground({ width, height, id, radius = 0, halos = true, vivid = false }: { width: number; height: number; id: string; radius?: number; halos?: boolean; vivid?: boolean }) {
  const c = cur();
  const stops = vivid ? [c.brand, c.deep3, c.deep2] : [c.deep, c.deep2, c.deep3];
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id={`${id}-clip`}>
            <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} />
          </ClipPath>
          <LinearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset="0.55" stopColor={stops[1]} />
            <Stop offset="1" stopColor={stops[2]} />
          </LinearGradient>
          <RadialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={c.glow} stopOpacity={0.34} />
            <Stop offset="1" stopColor={c.glow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-brand`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={c.brand} stopOpacity={0.55} />
            <Stop offset="1" stopColor={c.brand} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} fill={`url(#${id}-bg)`} />
        {halos && (
          <G clipPath={`url(#${id}-clip)`}>
            <Circle cx={width - Math.min(width, height) * 0.12} cy={Math.min(width, height) * 0.05} r={Math.min(width, height) * 0.55} fill={`url(#${id}-glow)`} />
            <Circle cx={Math.min(width, height) * 0.05} cy={height} r={Math.min(width, height) * 0.7} fill={`url(#${id}-brand)`} />
          </G>
        )}
      </Svg>
    </View>
  );
}

const toneColor = (k: Kit, tone: Kpi["tone"], fallback: string) => (tone === "pos" ? k.pos : tone === "neg" ? k.neg : fallback);

/** Bandeau des chiffres principaux, dessiné selon le modèle. */
function HeroKpis({ items }: { items: Kpi[] }) {
  const c = cur();
  const k = kit();
  const n = items.length;
  if (k.id === "editorial")
    return (
      <View wrap={false} style={{ flexDirection: "row", borderTopWidth: 1.4, borderTopColor: k.ink, borderBottomWidth: 0.5, borderBottomColor: k.line, marginBottom: 12 }}>
        {items.map((it, i) => (
          <View key={it.label} style={{ flex: 1, paddingVertical: 11, paddingLeft: i ? 12 : 0, borderLeftWidth: i ? 0.5 : 0, borderLeftColor: k.line }}>
            <Text style={{ ...W700, ...caps(6.6, 1), color: k.ink2 }}>{T(it.label)}</Text>
            <Text style={{ ...k.number, fontSize: 21, marginTop: 4, color: toneColor(k, it.tone, k.heading) }}>{T(it.value)}</Text>
            {it.sub && <Text style={{ ...k.italic, fontSize: 7.5, color: k.muted, marginTop: 2 }}>{T(it.sub)}</Text>}
          </View>
        ))}
      </View>
    );
  if (k.id === "bento") {
    const gap = 8;
    const w = (CW - gap * (n - 1)) / n;
    const h = 82;
    return (
      <View wrap={false} style={{ flexDirection: "row", gap, marginBottom: 8 }}>
        {items.map((it, i) => (
          <View key={it.label} style={{ position: "relative", width: w, height: h, borderRadius: k.radius, backgroundColor: k.card, padding: 11 }}>
            {i === 0 && <DeepBackground width={w} height={h} id={`hk${i}`} radius={k.radius} vivid />}
            <Text style={{ fontSize: 7, color: i === 0 ? "#ffffff" : k.muted }}>{T(it.label)}</Text>
            <Text style={{ ...k.number, fontSize: 17, marginTop: 6, color: i === 0 ? "#ffffff" : toneColor(k, it.tone, k.ink) }}>{T(it.value)}</Text>
            {it.sub && <Text style={{ fontSize: 6.5, color: i === 0 ? c.muted : k.muted, marginTop: 3 }}>{T(it.sub)}</Text>}
          </View>
        ))}
      </View>
    );
  }
  if (k.id === "suisse")
    return (
      <View wrap={false} style={{ flexDirection: "row", backgroundColor: c.brand, marginBottom: 10 }}>
        {items.map((it, i) => (
          <View key={it.label} style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 12, borderLeftWidth: i ? 0.6 : 0, borderLeftColor: c.muted }}>
            <Text style={{ ...k.display, ...caps(6.6, 1), color: c.onBrand }}>{T(it.label)}</Text>
            <Text style={{ ...k.number, fontSize: 19, marginTop: 6, color: c.onBrand }}>{T(it.value)}</Text>
            {it.sub && <Text style={{ fontSize: 6.6, color: c.soft, marginTop: 3 }}>{T(it.sub)}</Text>}
          </View>
        ))}
      </View>
    );
  const h = 74;
  const w = CW / n;
  return (
    <View wrap={false} style={{ position: "relative", width: CW, height: h, borderRadius: 10, marginBottom: 10 }}>
      <DeepBackground width={CW} height={h} id="hero" radius={10} />
      <View style={{ flexDirection: "row", height: h, alignItems: "center" }}>
        {items.map((it, i) => (
          <View key={it.label} style={{ width: w, paddingHorizontal: 13, borderLeftWidth: i ? 0.6 : 0, borderLeftColor: c.deep3 }}>
            <Text style={{ ...caps(7, 0.6), color: c.muted }}>{T(it.label)}</Text>
            <Text style={{ ...W800, fontSize: 15.5, marginTop: 4, color: it.tone === "pos" ? "#8ee8bf" : it.tone === "neg" ? "#ffaaaa" : "#ffffff" }}>{T(it.value)}</Text>
            {it.sub && <Text style={{ fontSize: 6.6, color: c.glow, marginTop: 3 }}>{T(it.sub)}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

function KpiGrid({ items, cols = 3, dark }: { items: Kpi[]; cols?: number; dark?: boolean }) {
  const c = cur();
  const k = kit();
  if (dark) return <HeroKpis items={items} />;
  const gap = k.id === "editorial" || k.id === "suisse" ? 14 : 8;
  const w = (CW - gap * (cols - 1)) / cols;
  const box =
    k.id === "editorial"
      ? { borderTopWidth: 0.8, borderTopColor: k.ink, paddingTop: 8, paddingBottom: 6 }
      : k.id === "suisse"
        ? { borderLeftWidth: 1.2, borderLeftColor: k.ink, paddingLeft: 9, paddingVertical: 4 }
        : { backgroundColor: k.card, borderRadius: k.radius, borderWidth: k.id === "bento" ? 0 : 0.6, borderColor: k.line, paddingVertical: 10, paddingHorizontal: 11 };
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap, rowGap: k.id === "signature" || k.id === "bento" ? gap : 12 }} wrap={false}>
      {items.map((it) => (
        <View key={it.label} style={{ width: w, ...box }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            {(k.id === "signature" || k.id === "bento") && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: toneColor(k, it.tone, k.id === "bento" ? k.accent : c.brand) }} />}
            <Text style={k.id === "suisse" || k.id === "editorial" ? { ...W700, ...caps(6.4, 0.9), color: k.ink2, flex: 1 } : { fontSize: 7.3, color: k.ink2, flex: 1 }}>{T(it.label)}</Text>
          </View>
          <Text style={{ ...k.number, fontSize: k.id === "editorial" ? 18 : 15, marginTop: 4, color: toneColor(k, it.tone, k.heading) }}>{T(it.value)}</Text>
          {it.sub && <Text style={{ ...(k.id === "editorial" ? k.italic : {}), fontSize: 6.8, color: k.muted, marginTop: 2 }}>{T(it.sub)}</Text>}
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

/** Barre de total (tableaux, crédits) dans le style du modèle. */
function totalBox(): { box: object; text: object } {
  const c = cur();
  const k = kit();
  if (k.id === "editorial") return { box: { borderTopWidth: 1.2, borderTopColor: k.ink, marginTop: 2 }, text: { ...k.display, color: k.heading } };
  if (k.id === "bento") return { box: { backgroundColor: c.brand, borderRadius: 8, marginTop: 4 }, text: { ...W700, color: c.onBrand } };
  if (k.id === "suisse") return { box: { backgroundColor: c.brand, marginTop: 4 }, text: { ...k.display, color: c.onBrand } };
  return { box: { backgroundColor: c.deep, borderRadius: 5, marginTop: 4 }, text: { ...W700, color: "#ffffff" } };
}

function Table<R>({ cols, rows, total, sub }: { cols: Col<R>[]; rows: R[]; total?: R; sub?: (r: R) => string | undefined }) {
  const c = cur();
  const k = kit();
  const tot = totalBox();
  const headBox =
    k.id === "editorial"
      ? { borderBottomWidth: 0.8, borderBottomColor: k.ink, paddingBottom: 5 }
      : k.id === "suisse"
        ? { borderBottomWidth: 1.4, borderBottomColor: k.ink, paddingBottom: 5 }
        : k.id === "bento"
          ? { borderBottomWidth: 0.6, borderBottomColor: k.line, paddingBottom: 6 }
          : { backgroundColor: c.soft, borderRadius: 5, paddingVertical: 5, marginBottom: 1 };
  const headText = k.id === "suisse" ? { ...k.display, color: k.ink } : k.id === "bento" ? { ...W700, color: k.accent } : k.id === "editorial" ? { ...W700, color: k.accent } : { ...W700, color: c.deep };
  const zebra = k.id === "signature";
  const header = (
    <View fixed style={{ flexDirection: "row", paddingHorizontal: 5, ...headBox }}>
      {cols.map((col) => (
        <Text key={col.label} style={{ ...headText, ...caps(6.6, 0.4), width: `${col.w}%`, textAlign: col.right ? "right" : "left" }}>
          {T(col.label)}
        </Text>
      ))}
    </View>
  );
  const row = (r: R, i: number) => (
    <View key={i} wrap={false} style={{ paddingVertical: 4.5, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: k.line, backgroundColor: zebra && i % 2 ? k.card : undefined }}>
      <View style={{ flexDirection: "row" }}>
        {cols.map((col) => (
          <Text key={col.label} style={[{ width: `${col.w}%`, fontSize: 8.2, color: k.ink, textAlign: col.right ? "right" : "left" }, col.bold ? { ...W600, color: k.heading } : {}]}>
            {T(col.get(r))}
          </Text>
        ))}
      </View>
      {sub?.(r) && <Text style={{ fontSize: 7, color: k.muted, marginTop: 1.5 }}>{T(sub(r))}</Text>}
    </View>
  );
  // Un tableau court ne se coupe jamais (l'en-tête ne reste pas seul en bas
  // de page) ; un long se poursuit page suivante, en-tête répété.
  const body = (
    <>
      {header}
      {rows.map(row)}
      {total && (
        <View wrap={false} style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 5, ...tot.box }}>
          {cols.map((col) => (
            <Text key={col.label} style={{ ...tot.text, width: `${col.w}%`, fontSize: 8.2, textAlign: col.right ? "right" : "left" }}>
              {T(col.get(total))}
            </Text>
          ))}
        </View>
      )}
    </>
  );
  if (k.id === "bento")
    return (
      <View wrap={rows.length > 12} style={{ backgroundColor: k.card, borderRadius: 12, padding: 8 }}>
        {body}
      </View>
    );
  return <View wrap={rows.length > 12}>{body}</View>;
}

function Bullets({ items }: { items: string[] }) {
  const c = cur();
  const k = kit();
  const marker =
    k.id === "editorial" ? (
      <Text style={{ ...k.display, color: k.accent, width: 14, fontSize: 9 }}>—</Text>
    ) : k.id === "suisse" ? (
      <View style={{ width: 5, height: 5, backgroundColor: k.accent, marginTop: 3.5, marginRight: 8 }} />
    ) : (
      <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: k.id === "bento" ? k.card : c.soft, marginTop: 0.5, marginRight: 7, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: k.accent }} />
      </View>
    );
  return (
    <View>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: "row", marginBottom: 5 }}>
          {marker}
          <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.45, color: k.ink }}>{T(t)}</Text>
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

function Chart({ title, years, values, kind, width = CW, height = 120, tone = "brand", id }: { title: string; years: number[]; values: number[]; kind: "line" | "step"; width?: number; height?: number; tone?: "brand" | "pos"; id: string }) {
  const k = kit();
  const stroke = tone === "pos" ? k.pos : k.accent;
  const framed = k.id === "signature" || k.id === "bento";
  const pad = framed ? 9 : 0;
  const sw = width - pad * 2;
  const left = 44;
  const bottom = 14;
  const iw = sw - left - 14;
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
  const last = values.length - 1;
  const frame =
    k.id === "signature"
      ? { backgroundColor: "#ffffff", borderWidth: 0.6, borderColor: k.line, borderRadius: 8, padding: pad }
      : k.id === "bento"
        ? { backgroundColor: k.card, borderRadius: k.radius, padding: pad }
        : { borderTopWidth: k.id === "suisse" ? 1.4 : 0.8, borderTopColor: k.ink, paddingTop: 7 };
  return (
    <View wrap={false} style={frame}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={k.id === "editorial" ? { ...k.display, fontSize: 10, color: k.heading } : k.id === "suisse" ? { ...k.display, ...caps(7.5, 0.6), color: k.heading } : { ...W700, fontSize: 8.5, color: k.heading }}>{T(title)}</Text>
        {last >= 0 && <Text style={{ ...W600, fontSize: 7.5, color: stroke }}>{T(`${years[last]} : ${K(values[last])}`)}</Text>}
      </View>
      <View style={{ position: "relative", width: sw, height }}>
        <Svg width={sw} height={height}>
          <Defs>
            <LinearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={k.id === "suisse" ? 0.9 : k.dark ? 0.35 : 0.22} />
              <Stop offset="1" stopColor={stroke} stopOpacity={k.id === "suisse" ? 0.9 : 0.02} />
            </LinearGradient>
          </Defs>
          {ticks.map((t) => (
            <Line key={t} x1={left} x2={left + iw} y1={y(t)} y2={y(t)} stroke={t === 0 ? k.muted : k.line} strokeWidth={t === 0 ? 0.6 : 0.5} />
          ))}
          <Path d={areaD} fill={`url(#${id}-area)`} fillOpacity={k.id === "suisse" ? 0.18 : 1} />
          <Path d={d} stroke={stroke} strokeWidth={k.id === "suisse" ? 2.2 : 1.8} fill="none" />
          {last >= 0 && <Circle cx={x(last)} cy={y(values[last])} r={2.6} fill={k.id === "bento" ? k.card : k.paper} stroke={stroke} strokeWidth={1.4} />}
        </Svg>
        {ticks.map((t) => (
          <Text key={`l${t}`} style={{ position: "absolute", left: 0, width: left - 6, top: y(t) - 4, fontSize: 6.3, color: k.muted, textAlign: "right" }}>
            {K(t)}
          </Text>
        ))}
        {years.map((yr, i) =>
          i % 5 === 0 || i === years.length - 1 ? (
            <Text key={yr} style={{ position: "absolute", left: x(i) - 14, width: 28, top: height - 10, fontSize: 6.3, color: k.muted, textAlign: "center" }}>
              {String(yr)}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

// ——— Pages du groupe ———

/** Données manquantes qui limitent les totaux : toujours signalées, jamais comblées. */
function gapNote(f: Figures, missingCharges = 0): string {
  const parts: string[] = [];
  if (missingCharges > 0) parts.push(`${missingCharges} immeuble(s) loué(s) sans charges renseignées (taxe foncière, assurance) : cash-flow surestimé d'autant`);
  if (f.unknownDebt > 0) parts.push(`${f.unknownDebt} crédit(s) au capital restant dû non communiqué, non inclus dans le total`);
  if (f.unknownPayment > 0) parts.push(`${f.unknownPayment} crédit(s) à la mensualité estimée ou inconnue (taux non renseigné)`);
  return parts.length ? ` Attention : ${parts.join(" ; ")}.` : "";
}

/** En-tête commun des pages : pied de page, titre courant, numéro de partie. */
interface Head {
  label: string;
  running: string;
  section?: Section;
}

function SynthesisPage({ m, h, now, message, author, trajectory }: { m: GroupModel; h: Head; now: string; message?: string; author?: string; trajectory: boolean }) {
  const f = m.f;
  const cf = cashflowMonthly(f);
  const valued = f.unvalued === 0 && f.value > 0;
  const kpis: Kpi[] = [
    { label: "Loyers annuels", value: K(f.rentMonthly * 12), sub: `${E(Math.round(f.rentMonthly))} par mois` },
    { label: "Capital restant dû", value: K(f.debt), sub: `${f.loans} crédit(s) en cours` },
    { label: "Mensualités", value: E(Math.round(f.paymentsMonthly)), sub: f.unknownPayment > 0 ? `par mois, dont ${f.unknownPayment} estimée(s)` : "par mois, assurance comprise" },
    { label: "Cash-flow", value: S(Math.round(cf)), sub: "par mois, après charges et crédits", tone: cf >= 0 ? "pos" : "neg" },
  ];
  const occ = m.indicators.get("occupancy");
  if (occ !== undefined) kpis.push({ label: "Taux d'occupation", value: P(occ), sub: `${f.units - f.vacantUnits} lots loués sur ${f.units}` });
  if (valued) kpis.push({ label: "Valeur estimée du patrimoine", value: K(f.value), sub: `Dette / valeur : ${P((f.debt / f.value) * 100)}` });
  if (f.cash > 0) kpis.push({ label: "Trésorerie des sociétés", value: K(f.cash) });
  return (
    <Sheet {...h} title={`${m.name} en un coup d'œil`}>
      {message && <Message text={message} author={author} />}
      <Para>{`Situation au ${now}. Chiffres issus des baux, des tableaux d'amortissement et des données de gestion.`}</Para>
      <View style={{ height: 10 }} />
      <KpiGrid dark items={kpis.slice(0, 4)} />
      {kpis.length > 4 && <KpiGrid items={kpis.slice(4)} />}
      {m.highlights.length > 0 && (
        <>
          <H2>Points forts</H2>
          <Bullets items={m.highlights} />
        </>
      )}
      {gapNote(m.f, m.missingCharges) && <Note>{gapNote(m.f, m.missingCharges).trim()}</Note>}
      {trajectory && <Trajectory m={m} />}
    </Sheet>
  );
}

function AssetsPage({ m, h }: { m: GroupModel; h: Head }) {
  const rows = [...m.buildings];
  if (m.companyLevelDebt > 1) rows.push({ name: "Crédits portés par les sociétés", place: "Emprunts non rattachés à un immeuble (apports, travaux…)", company: "—", lots: 0, acquisition: "", value: 0, rentAnnual: 0, debt: m.companyLevelDebt });
  const total = { name: "Total", place: "", company: "", lots: m.buildings.reduce((s, b) => s + b.lots, 0), acquisition: "", value: m.buildings.every((b) => b.value !== undefined) ? m.buildings.reduce((s, b) => s + (b.value ?? 0), 0) : undefined, rentAnnual: m.buildings.reduce((s, b) => s + b.rentAnnual, 0), debt: rows.reduce((s, b) => s + b.debt, 0) };
  return (
    <Sheet {...h} title="État du patrimoine immobilier">
      <Table
        cols={[
          { label: "Immeuble", w: 30, get: (r) => r.name, bold: true },
          { label: "Société", w: 16, get: (r) => r.company },
          { label: "Lots", w: 7, right: true, get: (r) => (r.company === "—" ? "" : String(r.lots || "—")) },
          { label: "Acquisition", w: 14, right: true, get: (r) => (r.company === "—" ? "" : r.acquisition || "—") },
          { label: "Valeur", w: 11, right: true, get: (r) => (r.company === "—" ? "" : K(r.value)) },
          { label: "Loyers / an", w: 11, right: true, get: (r) => (r.company === "—" ? "" : K(r.rentAnnual)) },
          { label: "Dette", w: 11, right: true, get: (r) => K(r.debt) },
        ]}
        rows={rows}
        sub={(r) => r.place || undefined}
        total={total}
      />
      <Note>« — » : non communiqué. Valeurs estimées par le propriétaire ; aucune valeur n&apos;est extrapolée.</Note>
    </Sheet>
  );
}

function LoansPage({ m, h }: { m: GroupModel; h: Head }) {
  const k = kit();
  const tot = totalBox();
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
    <Sheet {...h} title="Crédits en cours">
      {m.loansByCompany.map((g) => (
        <View key={g.company} style={{ marginBottom: 12 }} wrap={g.loans.length > 12}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }} wrap={false} minPresenceAhead={70}>
            <Text style={{ ...(k.id === "signature" ? W700 : k.display), fontSize: 9.5, color: k.heading }}>{T(g.company)}</Text>
            <Text style={{ fontSize: 8, color: k.ink2 }}>{T(`${K(g.balance)} restant dû · ${E(Math.round(g.monthly))} / mois`)}</Text>
          </View>
          <Table cols={cols} rows={g.loans} sub={(r) => r.note} />
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 9, ...tot.box }} wrap={false}>
        <Text style={{ ...tot.text, fontSize: 9 }}>Total</Text>
        <Text style={{ ...tot.text, fontSize: 9 }}>{T(`${K(totalBalance)} restant dû · ${E(Math.round(totalMonthly))} / mois`)}</Text>
      </View>
      <Note>{`Mensualités assurance comprise. Capital restant dû calculé à ce jour à partir des tableaux d'amortissement ou des conditions du prêt.${gapNote(m.f, m.missingCharges)}`}</Note>
    </Sheet>
  );
}

function CapacityPage({ m, h }: { m: GroupModel; h: Head }) {
  const dscr = m.indicators.get("dscr");
  const effort = m.indicators.get("effort");
  const occ = m.indicators.get("occupancy");
  const ltv = m.indicators.get("ltv");
  const ratios: Kpi[] = [
    { label: "Couverture des mensualités (DSCR)", value: dscr !== undefined ? `${dscr.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×` : "—", sub: m.f.unknownPayment > 0 ? `loyers nets ÷ mensualités (${m.f.unknownPayment} estimée(s))` : "loyers nets ÷ mensualités" },
    { label: "Part des loyers consacrée aux crédits", value: P(effort), sub: m.f.unknownPayment > 0 ? `mensualités ÷ loyers (${m.f.unknownPayment} estimée(s))` : "mensualités ÷ loyers" },
  ];
  if (occ !== undefined) ratios.push({ label: "Taux d'occupation", value: P(occ), sub: "lots loués ÷ lots" });
  if (ltv !== undefined) ratios.push({ label: "Dette / valeur (LTV)", value: P(ltv), sub: "capital restant dû ÷ valeur" });
  const tot = m.capacity.reduce((a, c) => ({ rent: a.rent + c.rent, charges: a.charges + c.charges, payments: a.payments + c.payments, cf: a.cf + c.cf }), { rent: 0, charges: 0, payments: 0, cf: 0 });
  return (
    <Sheet {...h} title="Capacité de remboursement">
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
              { label: "DSCR", w: 13, right: true, get: (r) => (r.dscr !== undefined ? `${r.dscr.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×` : "—") },
            ]}
            rows={m.capacity}
            total={{ company: "Total", ...tot, dscr: tot.payments > 0 ? (tot.rent - tot.charges) / tot.payments : undefined }}
          />
          <Note>{`Charges : taxe foncière, assurance, comptabilité et autres charges annuelles déclarées, ramenées au mois.${gapNote(m.f, m.missingCharges)}`}</Note>
        </>
      )}
    </Sheet>
  );
}

function Trajectory({ m }: { m: GroupModel }) {
  const half = (CW - 12) / 2;
  return (
    <View>
      <H2>Trajectoire</H2>
      <View style={{ flexDirection: "row", gap: 12 }} wrap={false}>
        <Chart id="debt" title="Capital restant dû" years={m.years} values={m.debtSeries} kind="line" width={half} height={100} />
        <Chart id="cf" title="Cash-flow par mois" years={m.years} values={m.cfSeries} kind="step" width={half} height={100} tone="pos" />
      </View>
      {m.sales.length > 0 && (
        <View style={{ marginTop: 10 }} wrap={false}>
          <Table
            cols={[
              { label: "Vente prévue", w: 30, get: (r) => `${r.label}${r.underOffer ? " (compromis signé)" : ""}`, bold: true },
              { label: "Date", w: 13, get: (r) => r.when },
              { label: "Prix", w: 14, right: true, get: (r) => (r.price !== undefined ? E(r.price) : "—") },
              { label: "Remb. banque", w: 15, right: true, get: (r) => E(Math.round(r.debtRepaid)) },
              { label: "Net", w: 14, right: true, get: (r) => (r.net !== undefined ? E(Math.round(r.net)) : "—") },
              { label: "Loyers / mois", w: 14, right: true, get: (r) => `−${E(Math.round(r.rentLost))}` },
            ]}
            rows={m.sales}
          />
          <Note>{"Ventes intégrées à la trajectoire : loyers des lots vendus retirés, capital remboursé (quote-part des lots sauf montant indiqué), mensualités recalculées. Prix, frais et impôt sur la plus-value sont ceux saisis par le dirigeant."}</Note>
        </View>
      )}
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

function RemunerationPage({ data, projection, nowMonth, h: head }: { data: AppData; projection: Projection; nowMonth: MonthIndex; h: Head }) {
  if (!data.withdrawals.some((w) => w.annualAmount)) return null;
  const y0 = yearOf(nowMonth);
  const r = remunerationYear(data, y0, y0);
  const h = data.settings.household ?? {};
  const later = [0, 1, 2, 5, 10].map((i) => remunerationYear(data, y0 + i, y0));
  const kind = (k: string) => ({ tns: "Gérance (TNS)", salaire: "Salaire", dividendes: "Dividendes", cca: "Compte courant", autre: "Autre" })[k] ?? labelOf(WITHDRAWAL_KINDS, k as never) ?? k;
  // Part versée par les SCI et la holding : elle pèse sur le cash-flow des loyers.
  const realEstate = (c?: Company) => !!c && (c.kind === "SCI" || c.kind === "SC" || c.kind === "holding");
  const fromRealEstate = r.sources.filter((s) => realEstate(s.company)).reduce((a, s) => a + s.cost, 0);
  const row = projection.years.find((x) => x.year === y0);
  const cf = row ? row.cashflow : undefined;
  return (
    <Sheet {...head} title="Rémunération des dirigeants">
      <KpiGrid
        items={[
          { label: "Revenus nets du foyer", value: E(Math.round(r.net)), sub: `soit ${E(Math.round(r.net / 12))} par mois` },
          { label: "Coût pour les sociétés", value: E(Math.round(r.cost)), sub: "par an" },
          { label: "Cotisations et impôts", value: E(Math.round(r.social + r.tax)), sub: r.cost > 0 ? `${pct(((r.social + r.tax) / r.cost) * 100)} du coût` : undefined },
        ]}
      />
      {h.strategy && (
        <>
          <H2>Stratégie</H2>
          <Para>{h.strategy}</Para>
        </>
      )}
      <H2>{`Détail ${y0}`}</H2>
      <Table
        cols={[
          { label: "Bénéficiaire", w: 15, get: (s) => s.person, bold: true },
          { label: "Nature", w: 34, get: (s) => kind(s.withdrawal.kind) },
          { label: "Coût / an", w: 13, right: true, get: (s) => E(Math.round(s.cost)) },
          { label: "Cotisations", w: 14, right: true, get: (s) => E(Math.round(s.social + s.capitalSocial)) },
          { label: "Impôt", w: 11, right: true, get: (s) => E(Math.round(s.incomeTax)) },
          { label: "Net / an", w: 13, right: true, get: (s) => E(Math.round(s.net)) },
        ]}
        rows={r.sources}
        sub={(s) => s.company?.name}
      />
      <H2>Dans le temps</H2>
      <Table
        cols={[
          { label: "Année", w: 20, get: (x) => String(x.year), bold: true },
          { label: "Coût pour les sociétés", w: 28, right: true, get: (x) => E(Math.round(x.cost)) },
          { label: "Cotisations et impôts", w: 26, right: true, get: (x) => E(Math.round(x.social + x.tax)) },
          { label: "Net par mois", w: 26, right: true, get: (x) => E(Math.round(x.net / 12)) },
        ]}
        rows={later}
      />
      {cf !== undefined && fromRealEstate > 0 && (
        <>
          <H2>Soutenabilité</H2>
          <Bullets
            items={[
              `Cash-flow des loyers ${y0}, après charges et crédits : ${eur(Math.round(cf / 12))} par mois.`,
              `Rémunérations et remboursements versés par les SCI et la holding : ${eur(Math.round(fromRealEstate / 12))} par mois.`,
              `Reste après rémunération : ${eur(Math.round((cf - fromRealEstate) / 12))} par mois.`,
            ]}
          />
        </>
      )}
      {r.companies.length > 0 && (
        <>
          <H2>Sociétés d&apos;exploitation</H2>
          <Table
            cols={[
              { label: "Société", w: 22, get: (c) => c.company.name, bold: true },
              { label: "Résultat avant rémun.", w: 20, right: true, get: (c) => E(Math.round(c.profitBefore + c.remunerationCost)) },
              { label: "Rémunérations", w: 17, right: true, get: (c) => E(Math.round(c.remunerationCost)) },
              { label: "IS", w: 13, right: true, get: (c) => E(Math.round(c.corporateTax)) },
              { label: "Distribuable", w: 15, right: true, get: (c) => E(Math.round(c.distributable)) },
              { label: "Dividendes", w: 13, right: true, get: (c) => E(Math.round(c.dividends)) },
            ]}
            rows={r.companies}
          />
        </>
      )}
      <Note>{`Estimation selon les barèmes ${BAREME_YEAR} : cotisations des indépendants (assiette abattue de 26 %), charges moyennes d'un dirigeant assimilé salarié, prélèvement forfaitaire de 31,4 % sur dividendes, impôt sur le revenu du foyer (${(h.parts ?? (h.couple ? 2 : 1)).toLocaleString("fr-FR")} part(s)), IS 15 % / 25 %. À confirmer par l'expert-comptable.`}</Note>
    </Sheet>
  );
}

function AccountsPage({ m, h }: { m: GroupModel; h: Head }) {
  if (m.statements.length === 0) return null;
  return (
    <Sheet {...h} title="Comptes annuels">
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

// ——— Couverture (trois styles au choix) ———

interface CoverProps {
  style: PdfCover;
  kicker: string;
  title: string;
  subtitle?: string;
  recipient?: string;
  /** Nom affiché à côté du monogramme, en haut de page. */
  brand: string;
  lines: string[];
  date: string;
  kpis: Kpi[];
  toc: Section[];
}

function Monogram({ name, dark }: { name: string; dark?: boolean }) {
  const c = cur();
  const letter = (name.replace(/^(SC|SCI|SAS|SARL|EURL|SA)\s+(DU\s+|DE\s+LA\s+|DE\s+|DES\s+)?/i, "").trim()[0] ?? "P").toUpperCase();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: dark ? c.glow : c.brand, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ ...W800, fontSize: 12, color: dark ? c.deep : "#ffffff" }}>{T(letter)}</Text>
      </View>
      <Text style={{ ...W700, fontSize: 8, color: dark ? "#ffffff" : c.deep, letterSpacing: 1.4, textTransform: "uppercase" }}>{T(name)}</Text>
    </View>
  );
}

function Kicker({ text, dark }: { text: string; dark?: boolean }) {
  const c = cur();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 26, height: 2, borderRadius: 1, backgroundColor: dark ? c.glow : c.brand }} />
      <Text style={{ ...W700, fontSize: 8.5, color: dark ? c.glow : c.brand, letterSpacing: 2.2, textTransform: "uppercase" }}>{T(text)}</Text>
    </View>
  );
}

function Recipient({ text, dark }: { text?: string; dark?: boolean }) {
  const c = cur();
  if (!text) return null;
  return (
    <View style={{ flexDirection: "row", alignSelf: "flex-start", marginTop: 22, borderWidth: 0.8, borderColor: dark ? c.deep3 : c.muted, backgroundColor: dark ? c.deep2 : c.soft, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 8.5, color: dark ? c.muted : INK2 }}>À l&apos;attention de </Text>
      <Text style={{ ...W700, fontSize: 8.5, color: dark ? "#ffffff" : c.deep }}>{T(text)}</Text>
    </View>
  );
}

/** Sommaire et coordonnées, en bas de couverture. */
function CoverFoot({ toc, lines, date, dark, inset = 0 }: { toc: Section[]; lines: string[]; date: string; dark?: boolean; inset?: number }) {
  const c = cur();
  const faint = dark ? c.muted : INK2;
  return (
    <View style={{ position: "absolute", bottom: 34, left: MX + inset, right: MX }}>
      <View style={{ flexDirection: "row", gap: 24, paddingTop: 14, borderTopWidth: 0.6, borderTopColor: dark ? c.deep3 : LINE }}>
        <View style={{ flex: 1.2 }}>
          <Text style={{ ...W700, fontSize: 7, color: dark ? c.glow : c.brand, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 }}>Au sommaire</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {toc.map((s) => (
              <View key={s.n} style={{ width: "50%", flexDirection: "row", marginBottom: 3.5 }}>
                <Text style={{ ...W700, fontSize: 8, color: dark ? c.glow : c.brand, width: 16 }}>{two(s.n)}</Text>
                <Text style={{ fontSize: 8, color: dark ? "#ffffff" : INK }}>{T(s.label)}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...W700, fontSize: 7, color: dark ? c.glow : c.brand, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 }}>Contact</Text>
          {lines.length ? (
            lines.map((l) => (
              <Text key={l} style={{ fontSize: 8, color: dark ? "#ffffff" : INK, marginBottom: 3 }}>
                {T(l)}
              </Text>
            ))
          ) : (
            <Text style={{ fontSize: 8, color: faint }}>Coordonnées non renseignées</Text>
          )}
        </View>
      </View>
      <Text style={{ fontSize: 7, color: faint, marginTop: 12 }}>{T(`Document établi le ${date} · confidentiel`)}</Text>
    </View>
  );
}

function Cover(props: CoverProps) {
  if (props.style === "editorial") return <EditorialCover {...props} />;
  if (props.style === "bento") return <BentoCover {...props} />;
  if (props.style === "suisse") return <SuisseCover {...props} />;
  if (props.style === "bandeau") return <BandCover {...props} />;
  if (props.style === "epure") return <CleanCover {...props} />;
  return <ImmersiveCover {...props} />;
}

function ImmersiveCover({ kicker, title, subtitle, recipient, brand, lines, date, kpis, toc }: CoverProps) {
  const c = cur();
  return (
    <Page size="A4" style={{ ...base, padding: 0, backgroundColor: c.deep }}>
      <DeepBackground width={PW} height={PH} id="cover" />
      <View style={{ position: "absolute", top: 0, right: 0, width: 240, height: 440 }}>
        <Svg width={240} height={440}>
          <Circle cx={200} cy={235} r={170} stroke={c.glow} strokeOpacity={0.18} strokeWidth={0.8} fill="none" />
          <Circle cx={200} cy={235} r={120} stroke={c.glow} strokeOpacity={0.12} strokeWidth={0.8} fill="none" />
        </Svg>
      </View>
      <View style={{ position: "absolute", top: 50, left: MX, right: MX }}>
        <Monogram name={brand} dark />
      </View>
      <View style={{ position: "absolute", top: 232, left: MX, right: MX + 40 }}>
        <Kicker text={kicker} dark />
        <Text style={{ ...W800, fontSize: 38, color: "#ffffff", marginTop: 22, letterSpacing: -1, lineHeight: 1.1 }}>{T(title)}</Text>
        {subtitle && <Text style={{ ...W600, fontSize: 14, color: c.muted, marginTop: 12 }}>{T(subtitle)}</Text>}
        <Recipient text={recipient} dark />
      </View>
      {kpis.length > 0 && (
        <View style={{ position: "absolute", top: 520, left: MX, right: MX, flexDirection: "row", gap: 14 }}>
          {kpis.map((k) => (
            <View key={k.label} style={{ flex: 1, borderTopWidth: 1.5, borderTopColor: c.glow, paddingTop: 9 }}>
              <Text style={{ fontSize: 7, color: c.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{T(k.label)}</Text>
              <Text style={{ ...W800, fontSize: 20, color: "#ffffff", marginTop: 4 }}>{T(k.value)}</Text>
              {k.sub && <Text style={{ fontSize: 7.5, color: c.glow, marginTop: 2 }}>{T(k.sub)}</Text>}
            </View>
          ))}
        </View>
      )}
      <CoverFoot toc={toc} lines={lines} date={date} dark />
    </Page>
  );
}

function BandCover({ kicker, title, subtitle, recipient, brand, lines, date, kpis, toc }: CoverProps) {
  const band = 370;
  return (
    <Page size="A4" style={{ ...base, padding: 0 }}>
      <View style={{ position: "relative", height: band }}>
        <DeepBackground width={PW} height={band} id="band" />
        <View style={{ paddingHorizontal: MX, paddingTop: 50 }}>
          <Monogram name={brand} dark />
          <View style={{ marginTop: 110 }}>
            <Kicker text={kicker} dark />
            <Text style={{ ...W800, fontSize: 34, color: "#ffffff", marginTop: 18, letterSpacing: -0.8, lineHeight: 1.1 }}>{T(title)}</Text>
            {subtitle && <Text style={{ ...W600, fontSize: 13, color: "#ffffff", opacity: 0.75, marginTop: 10 }}>{T(subtitle)}</Text>}
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: MX, paddingTop: 8 }}>
        <Recipient text={recipient} />
        {kpis.length > 0 && (
          <View style={{ marginTop: 26 }}>
            <KpiGrid items={kpis} cols={kpis.length} />
          </View>
        )}
      </View>
      <CoverFoot toc={toc} lines={lines} date={date} />
    </Page>
  );
}

function CleanCover({ kicker, title, subtitle, recipient, brand, lines, date, kpis, toc }: CoverProps) {
  const c = cur();
  return (
    <Page size="A4" style={{ ...base, padding: 0 }}>
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 12, backgroundColor: c.brand }} />
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 12, width: 4, backgroundColor: c.muted }} />
      <View style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200 }}>
        <Svg width={200} height={200}>
          <Circle cx={190} cy={70} r={128} fill={c.soft} />
          <Circle cx={190} cy={70} r={80} stroke={c.muted} strokeWidth={0.8} fill="none" />
        </Svg>
      </View>
      <View style={{ position: "absolute", top: 50, left: MX + 8, right: MX }}>
        <Monogram name={brand} />
      </View>
      <View style={{ position: "absolute", top: 240, left: MX + 8, right: MX + 30 }}>
        <Kicker text={kicker} />
        <Text style={{ ...W800, fontSize: 38, color: c.deep, marginTop: 20, letterSpacing: -1, lineHeight: 1.1 }}>{T(title)}</Text>
        {subtitle && <Text style={{ ...W600, fontSize: 14, color: INK2, marginTop: 12 }}>{T(subtitle)}</Text>}
        <View style={{ width: 48, height: 3, borderRadius: 1.5, backgroundColor: c.brand, marginTop: 22 }} />
        <Recipient text={recipient} />
      </View>
      {kpis.length > 0 && (
        <View style={{ position: "absolute", top: 530, left: MX + 8, right: MX, flexDirection: "row" }}>
          {kpis.map((k, i) => (
            <View key={k.label} style={{ flex: 1, paddingLeft: i ? 14 : 0, borderLeftWidth: i ? 0.8 : 0, borderLeftColor: LINE }}>
              <Text style={{ fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 }}>{T(k.label)}</Text>
              <Text style={{ ...W800, fontSize: 20, color: c.deep, marginTop: 4 }}>{T(k.value)}</Text>
              {k.sub && <Text style={{ fontSize: 7.5, color: c.brand, marginTop: 2 }}>{T(k.sub)}</Text>}
            </View>
          ))}
        </View>
      )}
      <CoverFoot toc={toc} lines={lines} date={date} inset={8} />
    </Page>
  );
}

/** « Septembre 2026 » à partir de la date longue du document. */
const edition = (date: string) => {
  const s = date.replace(/^\d+(er)?\s+/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Sommaire et coordonnées, colonnes simples, couleurs au choix. */
function FootColumns({ toc, lines, date, text, soft, accent, font }: { toc: Section[]; lines: string[]; date: string; text: string; soft: string; accent: string; font: object }) {
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 24 }}>
        <View style={{ flex: 1.2 }}>
          <Text style={{ ...W700, ...caps(6.8, 1.4), color: accent, marginBottom: 6 }}>Au sommaire</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {toc.map((s) => (
              <View key={s.n} style={{ width: "50%", flexDirection: "row", marginBottom: 3.5 }}>
                <Text style={{ ...font, fontSize: 8, color: accent, width: 17 }}>{two(s.n)}</Text>
                <Text style={{ fontSize: 8, color: text }}>{T(s.label)}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...W700, ...caps(6.8, 1.4), color: accent, marginBottom: 6 }}>Contact</Text>
          {(lines.length ? lines : ["Coordonnées non renseignées"]).map((l) => (
            <Text key={l} style={{ fontSize: 8, color: lines.length ? text : soft, marginBottom: 3 }}>
              {T(l)}
            </Text>
          ))}
        </View>
      </View>
      <Text style={{ fontSize: 7, color: soft, marginTop: 12 }}>{T(`Document établi le ${date} · confidentiel`)}</Text>
    </View>
  );
}

function EditorialCover({ kicker, title, subtitle, recipient, brand, lines, date, kpis, toc }: CoverProps) {
  const c = cur();
  const k = kit();
  const block = 300;
  return (
    <Page size="A4" style={{ ...base, padding: 0, backgroundColor: k.paper }}>
      <View style={{ position: "absolute", top: 44, left: MX, right: MX, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.4, borderBottomColor: k.ink, paddingBottom: 8 }}>
        <Text style={{ ...W700, ...caps(8, 2.4), color: k.ink }}>{T(brand)}</Text>
        <Text style={{ ...k.italic, fontSize: 10, color: k.ink2 }}>{T(edition(date))}</Text>
      </View>
      <View style={{ position: "absolute", top: 150, left: MX, right: MX + 20 }}>
        <Text style={{ ...W700, ...caps(8, 2.4), color: k.accent }}>{T(kicker)}</Text>
        <Text style={{ ...k.display, fontSize: 50, color: k.heading, marginTop: 16, lineHeight: 1.02, letterSpacing: -1.4 }}>{T(title)}</Text>
        {subtitle && <Text style={{ ...k.italic, fontSize: 17, color: k.ink2, marginTop: 14 }}>{T(subtitle)}</Text>}
        {recipient && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22 }}>
            <View style={{ width: 22, height: 0.8, backgroundColor: k.accent }} />
            <Text style={{ ...k.italic, fontSize: 10.5, color: k.ink }}>{T(`À l'attention de ${recipient}`)}</Text>
          </View>
        )}
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: block, backgroundColor: c.deep }}>
        <DeepBackground width={PW} height={block} id="ed" halos={false} />
        <View style={{ paddingHorizontal: MX, paddingTop: 30 }}>
          {kpis.length > 0 && (
            <View style={{ flexDirection: "row", marginBottom: 30 }}>
              {kpis.map((it, i) => (
                <View key={it.label} style={{ flex: 1, paddingLeft: i ? 14 : 0, borderLeftWidth: i ? 0.5 : 0, borderLeftColor: c.deep3 }}>
                  <Text style={{ ...W700, ...caps(6.6, 1.4), color: c.glow }}>{T(it.label)}</Text>
                  <Text style={{ ...k.number, fontSize: 30, color: "#ffffff", marginTop: 4 }}>{T(it.value)}</Text>
                  {it.sub && <Text style={{ ...k.italic, fontSize: 8.5, color: c.muted, marginTop: 2 }}>{T(it.sub)}</Text>}
                </View>
              ))}
            </View>
          )}
          <View style={{ borderTopWidth: 0.5, borderTopColor: c.deep3, paddingTop: 14 }}>
            <FootColumns toc={toc} lines={lines} date={date} text="#ffffff" soft={c.muted} accent={c.glow} font={k.display} />
          </View>
        </View>
      </View>
    </Page>
  );
}

function BentoCover({ kicker, title, subtitle, recipient, brand, lines, date, kpis, toc }: CoverProps) {
  const c = cur();
  const k = kit();
  const m = 28;
  const w = PW - m * 2;
  const heroH = 440;
  const gap = 10;
  const kw = kpis.length ? (w - gap * (kpis.length - 1)) / kpis.length : w;
  return (
    <Page size="A4" style={{ ...base, padding: m, backgroundColor: k.paper }}>
      <View style={{ position: "relative", height: heroH, borderRadius: 20, padding: 26 }}>
        <DeepBackground width={w} height={heroH} id="bento" radius={20} vivid />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Monogram name={brand} dark />
          <Text style={{ ...k.display, fontSize: 8, color: "#ffffff", backgroundColor: c.deep, borderRadius: 9, paddingVertical: 4, paddingHorizontal: 9 }}>{T(edition(date))}</Text>
        </View>
        <View style={{ position: "absolute", left: 26, right: 40, bottom: 26 }}>
          <Text style={{ ...k.display, ...caps(8, 2), color: c.soft }}>{T(kicker)}</Text>
          <Text style={{ ...k.display, fontSize: 44, color: "#ffffff", marginTop: 12, letterSpacing: -1.6, lineHeight: 1.02 }}>{T(title)}</Text>
          {subtitle && <Text style={{ fontSize: 12.5, color: c.soft, marginTop: 10 }}>{T(subtitle)}</Text>}
          {recipient && (
            <View style={{ flexDirection: "row", alignSelf: "flex-start", marginTop: 16, backgroundColor: c.deep, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 11 }}>
              <Text style={{ fontSize: 8.5, color: c.muted }}>À l&apos;attention de </Text>
              <Text style={{ ...W700, fontSize: 8.5, color: "#ffffff" }}>{T(recipient)}</Text>
            </View>
          )}
        </View>
      </View>
      {kpis.length > 0 && (
        <View style={{ flexDirection: "row", gap, marginTop: gap }}>
          {kpis.map((it) => (
            <View key={it.label} style={{ width: kw, height: 118, backgroundColor: k.card, borderRadius: 16, padding: 14, justifyContent: "space-between" }}>
              <Text style={{ fontSize: 7.5, color: k.muted }}>{T(it.label)}</Text>
              <View>
                <Text style={{ ...k.number, fontSize: 28, color: "#ffffff", letterSpacing: -0.8 }}>{T(it.value)}</Text>
                {it.sub && <Text style={{ fontSize: 7.5, color: k.accent, marginTop: 3 }}>{T(it.sub)}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", gap, marginTop: gap }}>
        <View style={{ flex: 1.5, backgroundColor: k.card, borderRadius: 16, padding: 14 }}>
          <Text style={{ ...W700, ...caps(6.8, 1.4), color: k.accent, marginBottom: 8 }}>Au sommaire</Text>
          {toc.map((s) => (
            <View key={s.n} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
              <Text style={{ ...k.display, fontSize: 8, color: k.accent, width: 18 }}>{two(s.n)}</Text>
              <Text style={{ fontSize: 8.5, color: "#ffffff" }}>{T(s.label)}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, backgroundColor: k.card, borderRadius: 16, padding: 14 }}>
          <Text style={{ ...W700, ...caps(6.8, 1.4), color: k.accent, marginBottom: 8 }}>Contact</Text>
          {(lines.length ? lines : ["Coordonnées non renseignées"]).map((l) => (
            <Text key={l} style={{ fontSize: 8, color: lines.length ? "#ffffff" : k.muted, marginBottom: 4, lineHeight: 1.35 }}>
              {T(l)}
            </Text>
          ))}
        </View>
      </View>
      <Text style={{ position: "absolute", bottom: 16, left: m, fontSize: 7, color: k.muted }}>{T(`Document établi le ${date} · confidentiel`)}</Text>
    </Page>
  );
}

function SuisseCover({ kicker, title, subtitle, recipient, brand, lines, date, kpis, toc }: CoverProps) {
  const c = cur();
  const k = kit();
  const block = 470;
  const cols = [PW / 3, (PW * 2) / 3];
  return (
    <Page size="A4" style={{ ...base, padding: 0, backgroundColor: k.paper }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: block, backgroundColor: c.brand }}>
        {cols.map((x) => (
          <View key={x} style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 0.6, backgroundColor: c.muted, opacity: 0.35 }} />
        ))}
        <View style={{ position: "absolute", top: 44, left: MX, right: MX, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ ...k.display, ...caps(8.5, 1.6), color: c.onBrand }}>{T(brand)}</Text>
          <Text style={{ ...k.display, ...caps(8.5, 1.6), color: c.onBrand }}>{T(edition(date))}</Text>
        </View>
        <View style={{ position: "absolute", left: MX, right: MX + 30, bottom: 34 }}>
          <Text style={{ ...k.display, ...caps(9, 2), color: c.soft }}>{T(kicker)}</Text>
          <Text style={{ ...k.display, fontSize: 46, color: c.onBrand, marginTop: 14, letterSpacing: -1.8, lineHeight: 0.98 }}>{T(title)}</Text>
          {subtitle && <Text style={{ ...k.number, fontSize: 15, color: c.soft, marginTop: 12 }}>{T(subtitle)}</Text>}
        </View>
      </View>
      <View style={{ position: "absolute", top: block + 26, left: MX, right: MX }}>
        {recipient && (
          <View style={{ flexDirection: "row", marginBottom: 20 }}>
            <Text style={{ ...k.display, ...caps(7.5, 1.4), color: k.ink2, width: 120 }}>À l&apos;attention de</Text>
            <Text style={{ ...k.display, fontSize: 11, color: k.ink }}>{T(recipient)}</Text>
          </View>
        )}
        {kpis.length > 0 && (
          <View style={{ flexDirection: "row", borderTopWidth: 2.2, borderTopColor: k.ink }}>
            {kpis.map((it, i) => (
              <View key={it.label} style={{ flex: 1, paddingTop: 9, paddingLeft: i ? 12 : 0, borderLeftWidth: i ? 0.8 : 0, borderLeftColor: k.line }}>
                <Text style={{ ...k.display, ...caps(6.8, 1.2), color: k.ink2 }}>{T(it.label)}</Text>
                <Text style={{ ...k.number, fontSize: 28, color: k.ink, marginTop: 6, letterSpacing: -1 }}>{T(it.value)}</Text>
                {it.sub && <Text style={{ fontSize: 7.5, color: k.accent, marginTop: 2 }}>{T(it.sub)}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={{ position: "absolute", left: MX, right: MX, bottom: 34, borderTopWidth: 1.2, borderTopColor: k.ink, paddingTop: 12 }}>
        <FootColumns toc={toc} lines={lines} date={date} text={k.ink} soft={k.muted} accent={k.accent} font={k.display} />
      </View>
    </Page>
  );
}

function contactLines(data: AppData): string[] {
  const holding = data.companies.find((c) => c.kind === "holding") ?? data.companies[0];
  const who = holding?.representative ?? data.settings.ownerName;
  return [who ? `${who}${holding?.representativeRole ? `, ${holding.representativeRole}` : ""}` : "", [holding?.email, holding?.phone].filter(Boolean).join(" · "), holding?.address ?? ""].filter(Boolean);
}

/** Numérotation des parties présentes, pour le sommaire et les en-têtes. */
function numbering() {
  const toc: Section[] = [];
  const add = (label: string): Section => {
    const s = { n: toc.length + 1, label };
    toc.push(s);
    return s;
  };
  return { toc, add };
}

function groupKpis(m: GroupModel): Kpi[] {
  const f = m.f;
  const out: Kpi[] = [];
  if (f.buildings > 0) out.push({ label: "Immeubles", value: String(f.buildings), sub: `${f.units} lots` });
  if (f.rentMonthly > 0) out.push({ label: "Loyers annuels", value: K(f.rentMonthly * 12) });
  if (f.unvalued === 0 && f.value > 0) out.push({ label: "Valeur estimée", value: K(f.value) });
  else if (f.debt > 0) out.push({ label: "Capital restant dû", value: K(f.debt) });
  return out;
}

// ——— Documents ———

export interface GroupDossierInput {
  data: AppData;
  projection: Projection;
  nowMonth: MonthIndex;
  /** Nom du périmètre (groupe ou société). */
  scopeName: string;
  generatedAt: Date;
  /** Présentation choisie (couleur, couverture, textes, parties). */
  prefs?: PdfPrefs;
  /** Dossier limité à une société : le titre personnalisé du groupe ne s'applique pas. */
  scoped?: boolean;
}

export function GroupDossier({ data, projection, nowMonth, scopeName, generatedAt, prefs = {}, scoped }: GroupDossierInput) {
  const m = groupModel(data, projection, scopeName);
  const date = generatedAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const title = (!scoped && prefs.title) || scopeName;
  const label = `${title} · présentation patrimoniale`;
  const { toc, add } = numbering();
  const synth = add("Synthèse");
  const assets = shows(prefs, "patrimoine") && (m.buildings.length > 0 || m.companyLevelDebt > 1) ? add("Patrimoine") : undefined;
  const loans = shows(prefs, "credits") && m.loansByCompany.length > 0 ? add("Crédits") : undefined;
  const capacity = shows(prefs, "capacite") ? add("Capacité") : undefined;
  const remuneration = shows(prefs, "remuneration") && data.withdrawals.some((w) => w.annualAmount) ? add("Rémunération") : undefined;
  const accounts = shows(prefs, "comptes") && m.statements.length > 0 ? add("Comptes annuels") : undefined;
  const h = (section?: Section): Head => ({ label, running: title, section });
  return (
      <Document title={`Présentation patrimoniale - ${title}`} author={data.settings.ownerName ?? scopeName}>
        <Cover style={prefs.cover ?? DEFAULT_COVER} kicker="Présentation patrimoniale" title={title} subtitle={prefs.subtitle ?? data.settings.ownerName} recipient={prefs.recipient} brand={scopeTitle(data)} lines={contactLines(data)} date={date} kpis={groupKpis(m)} toc={toc} />
        <SynthesisPage m={m} h={h(synth)} now={date} message={prefs.message} author={data.settings.ownerName} trajectory={shows(prefs, "trajectoire")} />
        {assets && <AssetsPage m={m} h={h(assets)} />}
        {loans && <LoansPage m={m} h={h(loans)} />}
        {capacity && <CapacityPage m={m} h={h(capacity)} />}
        {remuneration && <RemunerationPage data={data} projection={projection} nowMonth={nowMonth} h={h(remuneration)} />}
        {accounts && <AccountsPage m={m} h={h(accounts)} />}
      </Document>
  );
}

export interface ProjectDossierInput extends GroupDossierInput {
  project: Project;
  impact?: ProjectImpact;
}

export function ProjectDossier({ data, projection, nowMonth, scopeName, generatedAt, project: p, impact, prefs = {} }: ProjectDossierInput) {
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
  const { toc, add } = numbering();
  const sDemand = add("La demande");
  const sPlan = add("Plan de financement");
  const sYield = add("Rentabilité");
  const sGroup = add("Le groupe");
  const sAssets = shows(prefs, "patrimoine") && (m.buildings.length > 0 || m.companyLevelDebt > 1) ? add("Patrimoine") : undefined;
  const sLoans = shows(prefs, "credits") && m.loansByCompany.length > 0 ? add("Crédits") : undefined;
  const sRem = shows(prefs, "remuneration") && data.withdrawals.some((w) => w.annualAmount) ? add("Rémunération") : undefined;
  const h = (section?: Section): Head => ({ label, running: p.name, section });

  const exploitation = [
    { label: "Loyers prévus", value: annualRent },
    ...(f.vacancyMonthly ? [{ label: "Vacance prudente", value: -f.vacancyMonthly * 12 }] : []),
    { label: "Charges (taxe foncière, assurance, copropriété…)", value: -f.chargesAnnual },
    ...(f.monthlyPayments !== undefined ? [{ label: "Mensualités de crédit", value: -f.monthlyPayments * 12 }] : []),
  ];

  return (
    <Document title={`Dossier de financement - ${p.name}`} author={data.settings.ownerName ?? scopeName}>
      <Cover
        style={prefs.cover ?? DEFAULT_COVER}
        kicker="Dossier de financement"
        title={p.name}
        subtitle={[projectCompanyName(p, data), scopeName].filter(Boolean).join(" · ")}
        recipient={prefs.recipient}
        brand={scopeName}
        lines={contactLines(data)}
        date={date}
        kpis={[
          ...(request ? [{ label: "Financement sollicité", value: K(request), sub: durations.length === 1 ? `sur ${durations[0] / 12} ans` : undefined }] : []),
          ...(f.totalCost ? [{ label: "Coût total", value: K(f.totalCost) }] : []),
          ...(f.equity ? [{ label: "Apport", value: K(f.equity), sub: f.totalCost ? `${pct((f.equity / f.totalCost) * 100)} du coût` : undefined }] : []),
        ]}
        toc={toc}
      />

      <Sheet {...h(sDemand)} title={acquisition ? "Le projet d'acquisition" : "Le projet de travaux"}>
        {prefs.message && <Message text={prefs.message} author={data.settings.ownerName} />}
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

      <Sheet {...h(sPlan)} title="Plan de financement">
        <H2 top={0}>Emplois</H2>
        <Table cols={[{ label: "Poste", w: 70, get: (r) => r.label, bold: true }, { label: "Montant", w: 30, right: true, get: (r) => E(r.amount) }]} rows={uses} sub={(r) => r.sub} total={{ label: "Coût total", amount: f.totalCost }} />
        <H2>Ressources</H2>
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

      <Sheet {...h(sYield)} title="Rentabilité prévisionnelle">
        <KpiGrid
          items={[
            { label: "Loyers prévus", value: E(Math.round(f.rentMonthly)), sub: "par mois, hors charges" },
            { label: "Cash-flow", value: f.cashflowMonthly === undefined ? "—" : S(Math.round(f.cashflowMonthly)), sub: "par mois, après crédit", tone: f.cashflowMonthly === undefined ? undefined : f.cashflowMonthly >= 0 ? "pos" : "neg" },
            { label: "Couverture des mensualités", value: f.dscr !== undefined ? `${f.dscr.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×` : "—", sub: "loyers nets ÷ mensualités" },
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

      <SynthesisPage m={m} h={h(sGroup)} now={date} trajectory={shows(prefs, "trajectoire")} />
      {sAssets && <AssetsPage m={m} h={h(sAssets)} />}
      {sLoans && <LoansPage m={m} h={h(sLoans)} />}
      {sRem && <RemunerationPage data={data} projection={projection} nowMonth={nowMonth} h={h(sRem)} />}
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

