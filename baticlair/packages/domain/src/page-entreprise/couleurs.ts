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

function hex2(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
}

/** Le mélange de deux couleurs (`part` de la seconde, 0 à 1). */
export function melange(a: string, b: string, part: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => hex2(v + (y[i]! - v) * part)).join("")}`.toUpperCase();
}

/** Le texte d'un bouton de cette couleur : l'encre ou le blanc, celui qui se lit le mieux. */
export function texteSurCouleur(fond: string): string {
  return contraste(fond, "#15120E") >= contraste(fond, "#FFFFFF") ? "#15120E" : "#FFFFFF";
}

/**
 * La couleur lisible SUR UN FOND SOMBRE (la ville du grand titre, sur la photo) : la couleur elle-même si elle se lit
 * (4,5:1 sur le noir), sinon éclaircie juste assez ; une couleur trop sombre (noir) devient le blanc.
 */
export function couleurSurSombre(c: string, sombre = "#141414"): string {
  for (let part = 0; part <= 0.6; part += 0.05) {
    const m = melange(c, "#FFFFFF", part);
    if (contraste(m, sombre) >= 4.5) return m;
  }
  return "#FFFFFF";
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
