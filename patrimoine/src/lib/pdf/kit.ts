import { existsSync } from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";
import type { PdfCover } from "../types";
import type { PdfColors } from "./prefs";

// Modèles de mise en page des dossiers PDF. Chaque modèle fixe la
// typographie, les neutres (fond, textes, filets) et la forme des blocs ;
// la couleur principale vient toujours du thème (prefs.ts).

// ——— Polices (fichiers embarqués, licence OFL) ———
const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");
const has = (f: string) => existsSync(path.join(FONT_DIR, f));

export const HAS_INTER = has("inter-latin-400-normal.woff");
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
const HAS_FRAUNCES = has("fraunces-latin-600-normal.woff");
if (HAS_FRAUNCES) {
  Font.register({
    family: "Fraunces",
    fonts: [
      { src: path.join(FONT_DIR, "fraunces-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "fraunces-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: path.join(FONT_DIR, "fraunces-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "fraunces-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
}
const HAS_GROTESK = has("space-grotesk-latin-500-normal.woff");
if (HAS_GROTESK) {
  Font.register({
    family: "SpaceGrotesk",
    fonts: [
      { src: path.join(FONT_DIR, "space-grotesk-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "space-grotesk-latin-500-normal.woff"), fontWeight: 500 },
      { src: path.join(FONT_DIR, "space-grotesk-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
}

export type FontStyle = { fontFamily: string; fontWeight?: 400 | 500 | 600 | 700 | 800; fontStyle?: "normal" | "italic" };

export const FONT = HAS_INTER ? "Inter" : "Helvetica";
const inter = (w: 400 | 600 | 700 | 800): FontStyle => (HAS_INTER ? { fontFamily: "Inter", fontWeight: w } : { fontFamily: w >= 600 ? "Helvetica-Bold" : "Helvetica" });
export const W600 = inter(600);
export const W700 = inter(700);
export const W800 = inter(800);
const serif = (w: 400 | 600 | 700, italic = false): FontStyle =>
  HAS_FRAUNCES ? { fontFamily: "Fraunces", fontWeight: w, fontStyle: italic ? "italic" : "normal" } : { fontFamily: italic ? "Times-Italic" : w >= 600 ? "Times-Bold" : "Times-Roman" };
const grotesk = (w: 400 | 500 | 700): FontStyle => (HAS_GROTESK ? { fontFamily: "SpaceGrotesk", fontWeight: w } : inter(w >= 700 ? 800 : w >= 500 ? 700 : 400));

// ——— Modèles ———

export type KitId = "signature" | "editorial" | "bento" | "suisse";

export interface Kit {
  id: KitId;
  /** Pages sombres (à l'écran surtout). */
  dark: boolean;
  paper: string;
  ink: string;
  ink2: string;
  muted: string;
  line: string;
  /** Fond des cartes de chiffres et des lignes alternées. */
  card: string;
  /** Couleur d'accent lisible sur le fond des pages. */
  accent: string;
  /** Titres et grands chiffres. */
  heading: string;
  pos: string;
  neg: string;
  radius: number;
  /** Police des titres, des grands chiffres, et des petites étiquettes. */
  display: FontStyle;
  number: FontStyle;
  italic: FontStyle;
}

export function kitId(cover: PdfCover | undefined): KitId {
  if (cover === "editorial" || cover === "bento" || cover === "suisse") return cover;
  return "signature";
}

export function kitFor(cover: PdfCover | undefined, c: PdfColors): Kit {
  const id = kitId(cover);
  const light = { pos: "#0f8a5f", neg: "#c73a3a" };
  if (id === "editorial")
    return { id, dark: false, paper: "#fcfbf8", ink: "#1c1b18", ink2: "#56524a", muted: "#8f8a80", line: "#e5e0d5", card: "#f5f2ec", accent: c.brand, heading: c.deep, radius: 0, display: serif(600), number: serif(600), italic: serif(400, true), ...light };
  if (id === "bento")
    return { id, dark: true, paper: c.deep, ink: "#ffffff", ink2: c.muted, muted: "#9aa3ad", line: c.deep3, card: c.deep2, accent: c.glow, heading: "#ffffff", pos: "#74e3b5", neg: "#ffa3a3", radius: 14, display: grotesk(700), number: grotesk(700), italic: grotesk(400) };
  if (id === "suisse")
    return { id, dark: false, paper: "#ffffff", ink: "#111316", ink2: "#4a4d52", muted: "#8a8d92", line: "#dcdddf", card: "#f3f3f4", accent: c.brand, heading: "#111316", radius: 0, display: grotesk(700), number: grotesk(500), italic: grotesk(400), ...light };
  return { id, dark: false, paper: "#ffffff", ink: "#141c24", ink2: "#4d5663", muted: "#8b929c", line: "#e4e7ec", card: c.stripe, accent: c.brand, heading: c.deep, radius: 8, display: W800, number: W800, italic: inter(400), ...light };
}
