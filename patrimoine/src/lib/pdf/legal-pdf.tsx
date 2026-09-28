/* eslint-disable jsx-a11y/alt-text -- composant Image de react-pdf (PDF), sans attribut alt */
import { existsSync } from "node:fs";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Block, LegalDoc } from "../legal/doc";
import { dateLong } from "../legal/doc";

// Mise en page A4 portrait des documents de gestion locative (bail, états
// des lieux, quittances…) à partir du modèle neutre `LegalDoc`.

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
const SEMI = HAS_INTER ? { fontFamily: "Inter", fontWeight: 600 as const } : { fontFamily: "Helvetica-Bold" };

const NAVY = "#0b2545";
const GOLD = "#b08d57";
const INK = "#16202e";
const INK2 = "#4b5567";
const MUTED = "#8a93a3";
const LINE = "#dfe3ec";
const SOFT = "#f4f6fa";
const WARN_BG = "#fdecec";

const T = (s: string) => s.replace(/[  ]/g, " ").replace(/−/g, "-");

const st = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 54, paddingHorizontal: 46, fontFamily: FONT, fontSize: 9.4, color: INK, lineHeight: 1.45 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: NAVY, paddingBottom: 10, marginBottom: 14 },
  title: { ...BOLD, fontSize: 19, color: NAVY, letterSpacing: -0.3, lineHeight: 1.25 },
  subtitle: { fontSize: 9.5, color: INK2, marginTop: 4, lineHeight: 1.3 },
  h: { ...BOLD, fontSize: 11, color: NAVY, marginTop: 14, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 0.7, borderBottomColor: LINE },
  h2: { ...SEMI, fontSize: 9.8, color: NAVY, marginTop: 8, marginBottom: 4 },
  p: { marginBottom: 5, textAlign: "justify" },
  small: { fontSize: 8, color: INK2, marginBottom: 5, textAlign: "justify" },
  kvRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 3.2 },
  kvLabel: { width: "38%", color: INK2, paddingRight: 8 },
  kvValue: { width: "62%", ...SEMI },
  th: { ...SEMI, fontSize: 7.8, color: "#ffffff", paddingVertical: 4, paddingHorizontal: 5 },
  td: { fontSize: 8.4, paddingVertical: 3.4, paddingHorizontal: 5 },
  footer: { position: "absolute", bottom: 22, left: 46, right: 46, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 5 },
});

export type PhotoMap = Map<string, { data: Buffer; format: "jpg" | "png" }>;

function BlockView({ b, photos }: { b: Block; photos: PhotoMap }) {
  switch (b.t) {
    case "h":
      return <Text style={st.h} minPresenceAhead={40}>{T(b.text)}</Text>;
    case "h2":
      return <Text style={st.h2} minPresenceAhead={30}>{T(b.text)}</Text>;
    case "p":
      return <Text style={[b.small ? st.small : st.p, b.bold ? BOLD : {}]}>{T(b.text)}</Text>;
    case "kv":
      return (
        <View style={{ marginBottom: 6 }}>
          {b.rows.map(([k, v], i) => (
            <View key={i} style={st.kvRow} wrap={false}>
              <Text style={st.kvLabel}>{T(k)}</Text>
              <Text style={st.kvValue}>{T(v)}</Text>
            </View>
          ))}
        </View>
      );
    case "table": {
      const widths = b.widths ?? b.head.map(() => 100 / b.head.length);
      return (
        <View style={{ marginBottom: 8, borderWidth: 0.5, borderColor: LINE, borderRadius: 3 }}>
          <View style={{ flexDirection: "row", backgroundColor: NAVY }} fixed={false}>
            {b.head.map((h, i) => (
              <Text key={i} style={[st.th, { width: `${widths[i]}%`, textAlign: i > 0 && /Montant|Loyer|Charges|Total|Reçu|Relevé|Nombre|Remis|Restitu/.test(h) ? "right" : "left" }]}>{T(h)}</Text>
            ))}
          </View>
          {b.rows.map((r, ri) => {
            const isTotal = b.totalRow && ri === b.rows.length - 1;
            const hl = b.highlight?.includes(ri);
            return (
              <View key={ri} wrap={false} style={{ flexDirection: "row", backgroundColor: hl ? WARN_BG : isTotal ? SOFT : ri % 2 ? "#fbfcfe" : "#ffffff", borderTopWidth: ri ? 0.5 : 0, borderTopColor: LINE }}>
                {r.map((c, ci) => (
                  <Text key={ci} style={[st.td, { width: `${widths[ci]}%`, textAlign: ci > 0 && /€|^\d/.test(c) ? "right" : "left" }, isTotal ? SEMI : {}]}>{T(c)}</Text>
                ))}
              </View>
            );
          })}
        </View>
      );
    }
    case "list":
      return (
        <View style={{ marginBottom: 6 }}>
          {b.items.map((it, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={{ width: 12, color: GOLD }}>•</Text>
              <Text style={{ flex: 1, textAlign: "justify" }}>{T(it)}</Text>
            </View>
          ))}
        </View>
      );
    case "checks":
      return (
        <View style={{ marginBottom: 6 }}>
          {b.items.map((it, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
              <View style={{ width: 9, height: 9, borderWidth: 0.8, borderColor: NAVY, marginRight: 7, backgroundColor: it.checked ? NAVY : "#ffffff" }} />
              <Text style={{ flex: 1 }}>{T(it.label)}</Text>
            </View>
          ))}
        </View>
      );
    case "box":
      return (
        <View style={{ borderWidth: 0.8, borderColor: GOLD, borderRadius: 4, padding: 9, marginVertical: 8 }} wrap={false}>
          {b.title && <Text style={[SEMI, { color: NAVY, marginBottom: 4 }]}>{T(b.title)}</Text>}
          <Text style={st.small}>{T(b.text)}</Text>
          {Array.from({ length: b.lines ?? 0 }).map((_, i) => (
            <View key={i} style={{ borderBottomWidth: 0.5, borderBottomColor: MUTED, height: 18 }} />
          ))}
        </View>
      );
    case "signatures":
      return (
        <View wrap={false} style={{ marginTop: 14 }}>
          <Text style={{ marginBottom: 8 }}>{T(`Fait${b.place ? ` à ${b.place}` : " à ____________"}, le ${b.date ? dateLong(b.date) : "____________"}`)}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {b.parties.map((p, i) => (
              <View key={i} style={{ width: b.parties.length > 2 ? "31%" : "48%", borderWidth: 0.6, borderColor: LINE, borderRadius: 4, padding: 8, minHeight: 92 }}>
                <Text style={[SEMI, { color: NAVY }]}>{T(p.role)}</Text>
                <Text style={{ fontSize: 8, color: INK2 }}>{T(p.name || "")}</Text>
                {p.mention && <Text style={{ fontSize: 6.8, color: MUTED, marginTop: 2 }}>{T(p.mention)}</Text>}
                {p.image && <Image src={p.image} style={{ height: 46, objectFit: "contain", marginTop: 4 }} />}
              </View>
            ))}
          </View>
        </View>
      );
    case "photos":
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {b.items.map((ph, i) => {
            const img = photos.get(ph.fileId);
            if (!img) return null;
            return (
              <View key={i} style={{ width: "48%" }} wrap={false}>
                <Image src={{ data: img.data, format: img.format }} style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: 3 }} />
                <Text style={{ fontSize: 7.5, color: INK2, marginTop: 2 }}>{T(ph.caption)}</Text>
              </View>
            );
          })}
        </View>
      );
    case "pagebreak":
      return <View break />;
  }
}

export function LegalPdf({ doc, photos = new Map() }: { doc: LegalDoc; photos?: PhotoMap }) {
  return (
    <Document title={doc.title} author="Patrimoine" subject={doc.subtitle}>
      <Page size="A4" style={st.page} wrap>
        <View style={st.header}>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>{T(doc.title)}</Text>
            {doc.subtitle && <Text style={st.subtitle}>{T(doc.subtitle)}</Text>}
          </View>
          <View style={{ width: 34, height: 4, backgroundColor: GOLD, borderRadius: 2, marginBottom: 6 }} />
        </View>
        {doc.blocks.map((b, i) => (
          <BlockView key={i} b={b} photos={photos} />
        ))}
        <View style={st.footer} fixed>
          <Text style={{ maxWidth: "80%" }}>{T(doc.reference)}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
