// Thèmes de la boutique. Un thème ne définit que des jetons de couleur ;
// toute l'interface les utilise via des variables CSS (jamais de couleur
// codée en dur dans une page). Les contrastes sont vérifiés par les tests
// (tests/themes.test.ts) : un thème illisible ne peut pas être livré.

export interface ThemeTokens {
  primary: string; // boutons principaux, liens forts
  primaryHover: string;
  primaryLight: string; // fonds doux (badges, sélection)
  onPrimary: string; // texte posé sur primary
  secondary: string; // fonds de sections alternées
  accent: string; // touches décoratives (filets, étoiles)
  background: string;
  surface: string; // cartes, panneaux
  border: string;
  textPrimary: string;
  textSecondary: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  tokens: ThemeTokens;
}

export const THEMES: Theme[] = [
  {
    id: "boheme-sauge",
    name: "Bohème Sauge",
    description: "Crème, vert sauge et champagne — l'univers du logo.",
    tokens: {
      primary: "#4E5E48",
      primaryHover: "#3E4C39",
      primaryLight: "#E6EBE0",
      onPrimary: "#FFFFFF",
      secondary: "#F3EEE4",
      accent: "#B08A4F",
      background: "#FBF8F2",
      surface: "#FFFFFF",
      border: "#E6DED0",
      textPrimary: "#2E2A24",
      textSecondary: "#6B6257",
    },
  },
  {
    id: "champagne",
    name: "Champagne",
    description: "Crème, beige rosé et doré discret.",
    tokens: {
      primary: "#7A5A36",
      primaryHover: "#634828",
      primaryLight: "#F2E8DA",
      onPrimary: "#FFFFFF",
      secondary: "#F6EEE6",
      accent: "#C29A5B",
      background: "#FCF9F5",
      surface: "#FFFFFF",
      border: "#EADFD2",
      textPrimary: "#2F2923",
      textSecondary: "#6E6258",
    },
  },
  {
    id: "rose-poudre",
    name: "Rose Poudré",
    description: "Ivoire, vieux rose et prune douce.",
    tokens: {
      primary: "#8E4F5A",
      primaryHover: "#763F49",
      primaryLight: "#F5E6E7",
      onPrimary: "#FFFFFF",
      secondary: "#F9EFEE",
      accent: "#C68B8F",
      background: "#FDF9F7",
      surface: "#FFFFFF",
      border: "#EEDFDC",
      textPrimary: "#33262A",
      textSecondary: "#725F63",
    },
  },
  {
    id: "terracotta",
    name: "Terracotta Douce",
    description: "Crème, terracotta légère et nude.",
    tokens: {
      primary: "#9A4E33",
      primaryHover: "#803F28",
      primaryLight: "#F6E7DF",
      onPrimary: "#FFFFFF",
      secondary: "#F7EEE7",
      accent: "#C98A5E",
      background: "#FCF8F4",
      surface: "#FFFFFF",
      border: "#EDDFD4",
      textPrimary: "#32271F",
      textSecondary: "#71625A",
    },
  },
  {
    id: "lavande",
    name: "Lavande",
    description: "Ivoire, lavande et prune.",
    tokens: {
      primary: "#65507F",
      primaryHover: "#523F69",
      primaryLight: "#ECE6F3",
      onPrimary: "#FFFFFF",
      secondary: "#F4F0F7",
      accent: "#A28BBE",
      background: "#FBFAFC",
      surface: "#FFFFFF",
      border: "#E4DDEB",
      textPrimary: "#2B2632",
      textSecondary: "#665E70",
    },
  },
  {
    id: "nude-prune",
    name: "Nude & Prune",
    description: "Nude, rose ancien et prune profonde.",
    tokens: {
      primary: "#6A3450",
      primaryHover: "#562842",
      primaryLight: "#F1E3E8",
      onPrimary: "#FFFFFF",
      secondary: "#F6EDE8",
      accent: "#B9857F",
      background: "#FAF6F3",
      surface: "#FFFFFF",
      border: "#EADCD6",
      textPrimary: "#2F2429",
      textSecondary: "#6E5E64",
    },
  },
  {
    id: "brume-marine",
    name: "Brume Marine",
    description: "Sable, bleu minéral et nacre — un clin d'œil à la côte bretonne.",
    tokens: {
      primary: "#3B6068",
      primaryHover: "#2D4D54",
      primaryLight: "#E1ECEC",
      onPrimary: "#FFFFFF",
      secondary: "#EFF3F1",
      accent: "#B39868",
      background: "#F9FAF8",
      surface: "#FFFFFF",
      border: "#DDE4E2",
      textPrimary: "#23292B",
      textSecondary: "#5C686B",
    },
  },
];

export const DEFAULT_THEME_ID = "boheme-sauge";

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * Couleurs métier : identiques quel que soit le thème, pour que « épuisé »,
 * « erreur » ou « stock faible » gardent toujours le même sens.
 */
export const STATUS_COLORS = {
  success: { fg: "#2F6B3F", bg: "#E5F2E8" },
  error: { fg: "#A12D2D", bg: "#FBE9E7" },
  warning: { fg: "#8A5A00", bg: "#FDF1D8" },
  info: { fg: "#2C5A87", bg: "#E5EEF7" },
  lowStock: { fg: "#8A5A00", bg: "#FDF1D8" },
  soldOut: { fg: "#5F5A55", bg: "#ECEAE7" },
} as const;

/** Déclarations CSS des variables du thème. */
export function themeCss(theme: Theme, selector = ":root"): string {
  const t = theme.tokens;
  const vars: Record<string, string> = {
    "--c-primary": t.primary,
    "--c-primary-hover": t.primaryHover,
    "--c-primary-light": t.primaryLight,
    "--c-on-primary": t.onPrimary,
    "--c-secondary": t.secondary,
    "--c-accent": t.accent,
    "--c-bg": t.background,
    "--c-surface": t.surface,
    "--c-border": t.border,
    "--c-text": t.textPrimary,
    "--c-text-2": t.textSecondary,
  };
  return `${selector}{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
}

export function themeStyle(theme: Theme): Record<string, string> {
  const css = themeCss(theme, "x");
  const body = css.slice(2, -1);
  return Object.fromEntries(body.split(";").map((pair) => pair.split(":") as [string, string]));
}

// ───────────── Contraste (WCAG 2.1) ─────────────

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Couleur invalide : ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Paires qui doivent rester lisibles (texte normal : 4,5:1 ; éléments graphiques : 3:1). */
export function themeContrastChecks(theme: Theme): { label: string; ratio: number; min: number }[] {
  const t = theme.tokens;
  const pairs: [string, string, string, number][] = [
    ["texte / fond", t.textPrimary, t.background, 4.5],
    ["texte / carte", t.textPrimary, t.surface, 4.5],
    ["texte secondaire / fond", t.textSecondary, t.background, 4.5],
    ["texte secondaire / carte", t.textSecondary, t.surface, 4.5],
    ["texte secondaire / section", t.textSecondary, t.secondary, 4.5],
    ["bouton / texte du bouton", t.primary, t.onPrimary, 4.5],
    ["bouton survolé / texte", t.primaryHover, t.onPrimary, 4.5],
    ["lien / fond", t.primary, t.background, 4.5],
    ["lien / fond doux", t.primary, t.primaryLight, 4.5],
    ["texte / section", t.textPrimary, t.secondary, 4.5],
    ["contour de focus / fond", t.primary, t.background, 3],
  ];
  return pairs.map(([label, a, b, min]) => ({ label, ratio: contrastRatio(a, b), min }));
}
