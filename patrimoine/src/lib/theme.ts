// Thèmes de couleur de l'application. Chaque thème part d'une seule couleur
// principale ; toutes les variantes (survol, fond clair, texte foncé, halos…)
// en sont déduites dans l'espace OKLCH, puis ajustées pour que les textes
// restent lisibles (contraste WCAG AA au minimum). Les composants n'utilisent
// que les variables CSS produites ici (voir globals.css).

export type ThemeId = "teal" | "sauge" | "azur" | "violet" | "prune" | "graphite";

export interface ThemeDef {
  id: ThemeId;
  name: string;
  base: string;
}

export const THEMES: ThemeDef[] = [
  { id: "teal", name: "Teal menthe", base: "#0F8F8F" },
  { id: "sauge", name: "Vert sauge", base: "#5E806A" },
  { id: "azur", name: "Bleu azur", base: "#3478D4" },
  { id: "violet", name: "Violet moderne", base: "#7457D9" },
  { id: "prune", name: "Prune douce", base: "#8A5A8C" },
  { id: "graphite", name: "Graphite", base: "#3F4854" },
];

export const DEFAULT_THEME: ThemeId = "teal";

export function themeDef(id: string | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME)!;
}

// ——— Conversions sRGB ⇄ OKLCH ———

type RGB = [number, number, number];
type LCH = { l: number; c: number; h: number };

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as RGB;
}

function rgbToHex(rgb: RGB): string {
  return "#" + rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join("");
}

function rgbToOklch([r, g, b]: RGB): LCH {
  const [R, G, B] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(a, bb), h: Math.atan2(bb, a) };
}

function oklchToLinear({ l: L, c, h }: LCH): RGB {
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Couleur OKLCH → hexadécimal, en réduisant la saturation si elle sort de l'écran. */
function toHex(lch: LCH): string {
  let c = lch.c;
  for (let i = 0; i < 40; i++) {
    const lin = oklchToLinear({ ...lch, c });
    if (lin.every((v) => v >= -0.0005 && v <= 1.0005)) return rgbToHex(lin.map(fromLin) as RGB);
    c *= 0.93;
  }
  return rgbToHex(oklchToLinear({ ...lch, c: 0 }).map(fromLin) as RGB);
}

// ——— Contraste (WCAG 2) ———

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// ——— Palette ———

export interface Palette {
  /** Couleur principale : boutons, élément actif, liens, icônes d'action. */
  brand: string;
  /** Survol / appui des boutons principaux. */
  brandHover: string;
  /** Version très claire : fonds secondaires, pastilles, boutons secondaires. */
  brandSoft: string;
  /** Version pâle : états désactivés, contours légers. */
  brandMuted: string;
  /** Version lumineuse : halos décoratifs des cartes sombres. */
  brandGlow: string;
  /** Teinte très foncée, presque neutre : titres et grands chiffres. */
  deep: string;
  deep2: string;
  deep3: string;
  /** Fond de page, à peine teinté. */
  bg: string;
  /** Texte sur la couleur principale (toujours lisible). */
  onBrand: string;
}

const WHITE = "#ffffff";
/** Contraste minimal visé pour un texte normal (WCAG AA : 4,5). */
const AA = 4.6;

export function paletteFor(base: string): Palette {
  const src = rgbToOklch(hexToRgb(base));
  const tone = (l: number, c: number) => toHex({ l, c, h: src.h });

  const bg = tone(0.972, Math.min(src.c * 0.08, 0.004));
  const brandSoft = tone(0.955, Math.min(src.c * 0.22, 0.02));

  // Couleur principale : la teinte demandée, assombrie juste ce qu'il faut
  // pour qu'un texte blanc dessus et un lien de cette couleur sur les fonds
  // clairs restent lisibles.
  let l = src.l;
  let brand = tone(l, src.c);
  while (l > 0.2 && (contrast(brand, WHITE) < AA || contrast(brand, brandSoft) < AA || contrast(brand, bg) < AA)) {
    l -= 0.005;
    brand = tone(l, src.c);
  }
  const deepC = Math.min(src.c * 0.55, 0.06);
  return {
    brand,
    brandHover: tone(Math.max(0.18, l - 0.07), src.c),
    brandSoft,
    brandMuted: tone(0.86, Math.min(src.c * 0.45, 0.05)),
    brandGlow: tone(0.72, Math.min(src.c * 1.1, 0.14)),
    deep: tone(0.27, deepC),
    deep2: tone(0.33, deepC),
    deep3: tone(0.4, Math.min(src.c * 0.7, 0.08)),
    bg,
    onBrand: WHITE,
  };
}

/** Contrôles de lisibilité d'une palette (ratio obtenu pour chaque usage). */
export function paletteChecks(p: Palette): { label: string; ratio: number; min: number }[] {
  return [
    { label: "Texte sur bouton principal", ratio: contrast(p.onBrand, p.brand), min: 4.5 },
    { label: "Texte sur bouton survolé", ratio: contrast(p.onBrand, p.brandHover), min: 4.5 },
    { label: "Lien sur carte", ratio: contrast(p.brand, WHITE), min: 4.5 },
    { label: "Lien sur fond de page", ratio: contrast(p.brand, p.bg), min: 4.5 },
    { label: "Action sur fond clair", ratio: contrast(p.brand, p.brandSoft), min: 4.5 },
    { label: "Titre sur carte", ratio: contrast(p.deep, WHITE), min: 7 },
    { label: "Titre sur fond clair", ratio: contrast(p.deep, p.brandSoft), min: 7 },
  ];
}

/** Variables CSS du thème, injectées sur :root. */
export function themeCss(id: string | undefined): string {
  const p = paletteFor(themeDef(id).base);
  const vars: Record<string, string> = {
    "--brand": p.brand,
    "--brand-hover": p.brandHover,
    "--brand-soft": p.brandSoft,
    "--brand-muted": p.brandMuted,
    "--brand-glow": p.brandGlow,
    "--on-brand": p.onBrand,
    "--deep": p.deep,
    "--deep-2": p.deep2,
    "--deep-3": p.deep3,
    "--bg": p.bg,
  };
  return `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;
}
