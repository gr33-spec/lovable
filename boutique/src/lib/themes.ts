// Thèmes de la boutique : un seul système de design pour tout le site.
//
// Chaque thème se résume à quelques couleurs « graines » (principale, douce,
// accent, fond). Toutes les autres nuances — survol, fonds pâles, bordures,
// textes, états sélectionnés — sont CALCULÉES ici, avec des contrastes
// garantis (WCAG). La palette personnalisée de la créatrice passe par le même
// calcul : elle ne peut pas rendre le site illisible.
//
// Règle de direction artistique : l'interface encadre les bijoux, elle ne
// leur vole jamais la vedette. Fonds blancs ou presque blancs, la couleur est
// réservée aux accents (boutons, sélection, petits aplats).

export interface ThemeSeed {
  primary: string; // boutons, liens, éléments actifs
  secondary: string; // petits aplats doux (badges, pastilles, encadrés)
  accent: string; // touches décoratives (éclats, filets, mot en valeur)
  background?: string; // blanc ou presque blanc ; déduit si absent
}

export interface ThemeTokens {
  background: string;
  surface: string; // cartes, panneaux
  surfaceSecondary: string; // sections alternées, fonds neutres très légers
  primary: string;
  primaryHover: string;
  primarySoft: string; // sélection, fonds de badge
  onPrimary: string; // texte posé sur primary
  secondary: string;
  accent: string; // décoratif uniquement
  accentText: string; // accent assez foncé pour du texte
  text: string;
  textMuted: string;
  border: string; // séparations très discrètes
  borderStrong: string; // contour des champs de saisie (≥ 3:1)
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  seed: ThemeSeed;
  tokens: ThemeTokens;
}

// ───────────── Couleurs : conversions et mélanges ─────────────

type RGB = [number, number, number];

const HEX = /^#?([0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

function toRgb(hex: string): RGB {
  const m = HEX.exec(hex);
  if (!m) throw new Error(`Couleur invalide : ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Mélange `a` et `b` : weight = part de `b` (0 → a, 1 → b). */
export function mix(a: string, b: string, weight: number): string {
  const [x, y] = [toRgb(a), toRgb(b)];
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * weight) as RGB);
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  if (s === 0) return toHex([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return toHex([f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]);
}

/** Assombrit (en gardant la teinte) jusqu'à atteindre le contraste voulu sur tous les fonds donnés. */
function darkenUntil(color: string, backgrounds: string[], min: number): string {
  const [h, s0, l0] = toHsl(color);
  let l = l0;
  let c = color;
  while (Math.min(...backgrounds.map((bg) => contrastRatio(c, bg))) < min && l > 0) {
    l = Math.max(0, l - 0.01);
    // Une couleur pastel assombrie garde sa teinte mais perd un peu de
    // saturation : on obtient un ton profond et chic, pas une couleur criarde.
    c = fromHsl(h, s0 * (0.35 + 0.65 * (l / l0)), l);
  }
  return c;
}

/** Éclaircit (en gardant la teinte) jusqu'à une luminance minimale. */
function lightenUntil(color: string, minLuminance: number): string {
  const [h, s, l0] = toHsl(color);
  let l = l0;
  let c = color;
  while (luminance(c) < minLuminance && l < 1) {
    l = Math.min(1, l + 0.01);
    c = fromHsl(h, s, l);
  }
  return c;
}

// ───────────── Génération des jetons ─────────────

const WHITE = "#FFFFFF";
const INK = "#1B1A19";

/**
 * Calcule tous les jetons à partir des couleurs graines. Garanties :
 * textes ≥ 4,5:1 sur tous les fonds, bouton lisible, contour de champ ≥ 3:1.
 */
export function buildTokens(seed: ThemeSeed): ThemeTokens {
  // Fond : blanc ou presque. Une graine trop colorée est ramenée vers le blanc.
  const background = lightenUntil(seed.background ?? mix(seed.secondary, WHITE, 0.82), 0.93);
  const surface = WHITE;
  // Aplat doux : toujours pâle, pour ne jamais concurrencer les photos.
  const [sh, ss, sl] = toHsl(seed.secondary);
  const secondary = lightenUntil(fromHsl(sh, Math.min(ss, 0.85), Math.max(sl, 0.9)), 0.72);
  const surfaceSecondary = lightenUntil(mix(secondary, WHITE, 0.62), 0.9);

  // Couleur principale : si elle est trop claire pour porter du texte blanc
  // (ex. corail très pâle choisi par la créatrice), on prend sa variante
  // foncée de même teinte. Le bouton reste reconnaissable ET lisible.
  const primaryBase = darkenUntil(seed.primary, [WHITE, background, surfaceSecondary], 4.6);
  const primarySoft = lightenUntil(mix(primaryBase, WHITE, 0.9), 0.78);
  const primary = darkenUntil(primaryBase, [primarySoft], 4.6);
  const primaryHover = darkenUntil(mix(primary, INK, 0.18), [WHITE], 4.6);

  const text = darkenUntil(mix(INK, primary, 0.1), [background, surface, surfaceSecondary, secondary, primarySoft], 12);
  const textMuted = darkenUntil(mix(text, background, 0.42), [background, surface, surfaceSecondary, secondary, primarySoft], 4.6);
  const accentText = darkenUntil(seed.accent, [background, surface, surfaceSecondary], 4.6);
  const border = mix(background, text, 0.09);
  const borderStrong = darkenUntil(mix(background, text, 0.3), [surface, background], 3);

  return {
    background,
    surface,
    surfaceSecondary,
    primary,
    primaryHover,
    primarySoft,
    onPrimary: WHITE,
    secondary,
    accent: seed.accent.toUpperCase(),
    accentText,
    text,
    textMuted,
    border,
    borderStrong,
  };
}

function theme(id: string, name: string, description: string, seed: ThemeSeed): Theme {
  return { id, name, description, seed, tokens: buildTokens(seed) };
}

export const THEMES: Theme[] = [
  theme("boheme-sauge", "Sauge & Champagne", "Naturel et bohème : vert sauge profond, touches champagne.", {
    primary: "#4F6A56",
    secondary: "#E3EBDF",
    accent: "#C9A86A",
    background: "#FDFCF9",
  }),
  theme("rose-poudre", "Rose Poudré", "Féminin et chic : vieux rose, nude et une pointe de prune.", {
    primary: "#A2566A",
    secondary: "#F6E3E4",
    accent: "#7B3A5F",
    background: "#FFFBFA",
  }),
  theme("nude-prune", "Prune & Nude", "Sophistiqué : prune profonde, mauve nude, rose poudré.", {
    primary: "#5B2449",
    secondary: "#EFE1E6",
    accent: "#D8A1AE",
    background: "#FFFFFF",
  }),
  theme("lavande", "Lavande", "Frais et contemporain : lavande soutenue, lilas, prune.", {
    primary: "#6A55A3",
    secondary: "#ECE8F8",
    accent: "#6B2F66",
    background: "#FCFCFF",
  }),
  theme("terracotta", "Terracotta Bohème", "Chaleureux : terracotta douce, pêche nude, brun rosé.", {
    primary: "#98583D",
    secondary: "#F7E6D9",
    accent: "#A26F62",
    background: "#FFFBF8",
  }),
  theme("emeraude", "Vert Émeraude", "Premium et affirmé : émeraude profonde, champagne.", {
    primary: "#0E5F4C",
    secondary: "#E1F1EA",
    accent: "#CBAE72",
    background: "#FFFFFF",
  }),
  theme("brume-marine", "Bleu Pétrole", "Original et élégant : bleu pétrole, gris bleuté, rose nude.", {
    primary: "#1C5767",
    secondary: "#E2ECF0",
    accent: "#D9A79E",
    background: "#FFFFFF",
  }),
  theme("framboise", "Framboise", "Pétillant mais adulte : framboise profonde, rose pâle, prune.", {
    primary: "#AE1F4E",
    secondary: "#FCE4EB",
    accent: "#6A2352",
    background: "#FFFFFF",
  }),
  theme("champagne", "Champagne & Noir", "Bijouterie : graphite presque noir, champagne, doré léger.", {
    primary: "#1F1D1B",
    secondary: "#F2EADB",
    accent: "#C8A465",
    background: "#FFFFFF",
  }),
  theme("corail", "Corail Poudré", "Solaire : corail doux, pêche pâle, rose profond.", {
    primary: "#E0604A",
    secondary: "#FDE9E1",
    accent: "#B0345A",
    background: "#FFFFFF",
  }),
  theme("bleu-lavande", "Bleu Lavande", "Moderne et inattendu : bleu lavande, lilas pâle, rose froid.", {
    primary: "#4E5BAE",
    secondary: "#EAEBFA",
    accent: "#B24C84",
    background: "#FFFFFF",
  }),
  theme("boheme-nature", "Bohème Nature", "Organique : olive douce, lin clair, brun rosé.", {
    primary: "#5F6B3C",
    secondary: "#F1EDE2",
    accent: "#A56F5E",
    background: "#FDFCF7",
  }),
];

export const DEFAULT_THEME_ID = "boheme-sauge";
export const CUSTOM_THEME_ID = "personnalise";

/** Palette personnalisée : 3 couleurs choisies par la créatrice. */
export interface CustomPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export function customTheme(p: CustomPalette): Theme {
  return theme(CUSTOM_THEME_ID, "Ma palette", "Vos trois couleurs, nuances calculées automatiquement.", p);
}

/** Thème affiché : prédéfini, ou palette personnalisée si elle est choisie. */
export function getTheme(id: string | null | undefined, custom?: CustomPalette | null): Theme {
  if (id === CUSTOM_THEME_ID && custom) return customTheme(custom);
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * Couleurs métier : identiques quel que soit le thème, pour que « épuisé »,
 * « erreur » ou « stock faible » gardent toujours le même sens.
 */
export const STATUS_COLORS = {
  success: { fg: "#2F6B3F", bg: "#E8F3EA" },
  error: { fg: "#A12D2D", bg: "#FCEBE9" },
  warning: { fg: "#855600", bg: "#FDF2DC" },
  info: { fg: "#2C5A87", bg: "#E8F0F8" },
  lowStock: { fg: "#855600", bg: "#FDF2DC" },
  soldOut: { fg: "#5B5752", bg: "#EFEDEA" },
} as const;

/** Variables CSS du thème (noms courts utilisés par tout le site). */
export function themeVars(theme: Theme): Record<string, string> {
  const t = theme.tokens;
  return {
    "--c-bg": t.background,
    "--c-surface": t.surface,
    "--c-surface-2": t.surfaceSecondary,
    "--c-primary": t.primary,
    "--c-primary-hover": t.primaryHover,
    "--c-primary-soft": t.primarySoft,
    "--c-on-primary": t.onPrimary,
    "--c-secondary": t.secondary,
    "--c-accent": t.accent,
    "--c-accent-text": t.accentText,
    "--c-text": t.text,
    "--c-text-muted": t.textMuted,
    "--c-border": t.border,
    "--c-border-strong": t.borderStrong,
  };
}

export function themeCss(theme: Theme, selector = ":root"): string {
  return `${selector}{${Object.entries(themeVars(theme))
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
}

export function themeStyle(theme: Theme): Record<string, string> {
  return themeVars(theme);
}

// ───────────── Contraste (WCAG 2.1) ─────────────

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Paires qui doivent rester lisibles (texte : 4,5:1 ; éléments graphiques : 3:1). */
export function themeContrastChecks(theme: Theme): { label: string; ratio: number; min: number }[] {
  const t = theme.tokens;
  const pairs: [string, string, string, number][] = [
    ["texte / fond", t.text, t.background, 4.5],
    ["texte / carte", t.text, t.surface, 4.5],
    ["texte / section", t.text, t.surfaceSecondary, 4.5],
    ["texte / aplat doux", t.text, t.secondary, 4.5],
    ["texte discret / fond", t.textMuted, t.background, 4.5],
    ["texte discret / carte", t.textMuted, t.surface, 4.5],
    ["texte discret / section", t.textMuted, t.surfaceSecondary, 4.5],
    ["texte discret / aplat doux", t.textMuted, t.secondary, 4.5],
    ["texte discret / sélection", t.textMuted, t.primarySoft, 4.5],
    ["bouton / texte du bouton", t.primary, t.onPrimary, 4.5],
    ["bouton survolé / texte", t.primaryHover, t.onPrimary, 4.5],
    ["lien / fond", t.primary, t.background, 4.5],
    ["lien / section", t.primary, t.surfaceSecondary, 4.5],
    ["lien / sélection", t.primary, t.primarySoft, 4.5],
    ["accent en texte / fond", t.accentText, t.background, 4.5],
    ["accent en texte / carte", t.accentText, t.surface, 4.5],
    ["contour de champ / carte", t.borderStrong, t.surface, 3],
    ["contour de focus / fond", t.primary, t.background, 3],
  ];
  return pairs.map(([label, a, b, min]) => ({ label, ratio: contrastRatio(a, b), min }));
}

/** Écart perçu (approximatif) entre deux couleurs : sert à garantir des thèmes vraiment distincts. */
export function colorDistance(a: string, b: string): number {
  const [x, y] = [toRgb(a), toRgb(b)];
  const rMean = (x[0] + y[0]) / 2;
  const [dr, dg, db] = [x[0] - y[0], x[1] - y[1], x[2] - y[2]];
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
}
