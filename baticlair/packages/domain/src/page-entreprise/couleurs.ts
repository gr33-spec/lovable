/**
 * Le contraste de « Ma page » : fond ivoire fixe (comme la landing de Mobiiz), quatre teintes sobres, bouton d'appel jaune
 * à texte noir. Ces fonctions servent aux tests qui GARANTISSENT la lisibilité (4,5:1 au moins pour chaque texte).
 */
const HEX = /^#[0-9a-f]{6}$/i;

export function estCouleur(hex: string | null | undefined): hex is string {
  return typeof hex === "string" && HEX.test(hex);
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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

/** Les couleurs fixes de la page publique (celles de la landing de Mobiiz). */
export const COULEURS_PAGE = {
  ivoire: "#FBF8F3",
  os: "#EFEAE2",
  encre: "#15120E",
  doux: "#5E554A",
  jaune: "#FED206",
  noir: "#0C0A08",
} as const;
