import type { Fond } from "./themes.js";

/**
 * Le nuancier de « Ma page » (Greg, 16 novembre 2026) : une vingtaine de teintes, plus un sélecteur libre ; fond clair ou
 * sombre. LE CONTRASTE RESTE TOUJOURS LISIBLE : quelle que soit la couleur choisie, le texte des boutons et les liens sont
 * recalculés pour atteindre au moins 4,5:1 (WCAG AA, texte normal) ; une couleur trop pâle sur fond clair (ou trop sombre
 * sur fond sombre) est assombrie (ou éclaircie) pour les textes, la teinte gardée.
 */
export const NUANCIER: readonly { id: string; nom: string; hex: string }[] = [
  { id: "ardoise", nom: "Ardoise", hex: "#3E5163" },
  { id: "zinc", nom: "Zinc", hex: "#7D8B97" },
  { id: "anthracite", nom: "Anthracite", hex: "#2E3338" },
  { id: "nuit", nom: "Bleu nuit", hex: "#1D3557" },
  { id: "bleu", nom: "Bleu", hex: "#1F5FA8" },
  { id: "ocean", nom: "Océan", hex: "#1B7FA3" },
  { id: "petrole", nom: "Pétrole", hex: "#1F5F66" },
  { id: "sauge", nom: "Sauge", hex: "#5E7D63" },
  { id: "vert", nom: "Vert", hex: "#2F7D4E" },
  { id: "emeraude", nom: "Émeraude", hex: "#2F7D6D" },
  { id: "olive", nom: "Olive", hex: "#6B6F2E" },
  { id: "jaune", nom: "Jaune Mobiiz", hex: "#FED206" },
  { id: "moutarde", nom: "Moutarde", hex: "#C9A227" },
  { id: "orange", nom: "Orange", hex: "#E07A1F" },
  { id: "terre-cuite", nom: "Terre cuite", hex: "#B4532A" },
  { id: "brique", nom: "Brique", hex: "#A04A3B" },
  { id: "bordeaux", nom: "Bordeaux", hex: "#7A2E3A" },
  { id: "prune", nom: "Prune", hex: "#5E3A6E" },
  { id: "bois", nom: "Bois", hex: "#8B6440" },
  { id: "sable", nom: "Sable", hex: "#C2A878" },
];

const HEX = /^#[0-9a-f]{6}$/i;

export function estCouleur(hex: string | null | undefined): hex is string {
  return typeof hex === "string" && HEX.test(hex);
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function versHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Luminance relative (WCAG 2.x). */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste entre deux couleurs (1 à 21). */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Mélange vers une autre couleur (0 = soi, 1 = cible). */
function melanger(hex: string, cible: string, part: number): string {
  const a = rgb(hex);
  const b = rgb(cible);
  return versHex([a[0] + (b[0] - a[0]) * part, a[1] + (b[1] - a[1]) * part, a[2] + (b[2] - a[2]) * part]);
}

/** La couleur, poussée vers le noir (ou le blanc) juste assez pour atteindre le contraste demandé sur `fond`. */
export function lisibleSur(couleur: string, fond: string, minimum = 4.5): string {
  if (contraste(couleur, fond) >= minimum) return couleur.toUpperCase();
  const cible = luminance(fond) > 0.5 ? "#000000" : "#FFFFFF";
  for (let i = 1; i <= 20; i++) {
    const essai = melanger(couleur, cible, i / 20);
    if (contraste(essai, fond) >= minimum) return essai;
  }
  return cible;
}

export interface Palette {
  fond: Fond;
  /** Fond de la page, des cartes, textes. */
  page: string;
  surface: string;
  texte: string;
  texteDoux: string;
  bordure: string;
  /** La couleur choisie, telle quelle : bandeaux, aplats, motif. */
  principale: string;
  /** Texte posé sur la couleur principale (bouton « Appeler ») : blanc ou presque noir, le plus lisible. */
  surPrincipale: string;
  /** Fond des boutons pleins : la principale, ajustée si même le meilleur texte n'y est pas lisible. */
  bouton: string;
  /** Liens et titres colorés sur le fond de page : la principale ajustée à 4,5:1. */
  accent: string;
  /** Une teinte très légère de la principale (fond de pastilles, motif). */
  voile: string;
}

const CLAIR = { page: "#FBF8F3", surface: "#FFFFFF", texte: "#15181C", texteDoux: "#4A525C", bordure: "#E6E1D8" };
const SOMBRE = { page: "#111315", surface: "#1B1E22", texte: "#F4F1EA", texteDoux: "#B9BEC5", bordure: "#2E333A" };
const NOIR_TEXTE = "#111111";

/** La palette complète d'une page à partir d'une couleur et d'un fond ; toujours lisible (≥ 4,5:1 pour chaque texte). */
export function paletteDeLaPage(couleur: string | null | undefined, fond: Fond, couleurParDefaut: string): Palette {
  const principale = (estCouleur(couleur) ? couleur : couleurParDefaut).toUpperCase();
  const base = fond === "sombre" ? SOMBRE : CLAIR;
  const blanc = contraste("#FFFFFF", principale);
  const noir = contraste(NOIR_TEXTE, principale);
  const surPrincipale = blanc >= noir ? "#FFFFFF" : NOIR_TEXTE;
  const bouton = Math.max(blanc, noir) >= 4.5 ? principale : lisibleSur(principale, surPrincipale);
  const accent = lisibleSur(lisibleSur(principale, base.page), base.surface);
  const voile = melanger(principale, base.page, fond === "sombre" ? 0.82 : 0.88);
  return { fond, ...base, principale, surPrincipale, bouton, accent, voile };
}
