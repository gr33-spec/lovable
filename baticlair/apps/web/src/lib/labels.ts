/**
 * Textes courts pour l'écran : l'artisan lit « Isolation plafond 300 mm »,
 * pas « Fourniture isolation plafond 300mm - Fourniture de rouleaux ou
 * flocons… ». Le texte complet du devis reste stocké et consultable.
 */

const SUPPLY_PREFIX = /^\s*(?:fourniture\s+et\s+pose|fourniture\s*&\s*pose|f\.?\s*(?:et|&)\s*p\.?|fourniture|pose)\s+(?:(?:de\s+la|du|des|de)\s+|(?:de\s+l|d)['’]\s*)?/i;

export function shortName(designation: string): string {
  // « Faîtage (Fourniture & Pose) » : la mention du devis client n'apprend rien à l'artisan.
  let text = designation.replace(/\s*\((?:fourniture\s*(?:&|et)\s*pose|f\.?\s*(?:&|et)\s*p\.?|fourniture\s+seule|fourniture)\)/gi, "").trim();
  const stripped = text.replace(SUPPLY_PREFIX, "");
  if (stripped.length >= 3) text = stripped;
  // « Isolation plafond 300mm - Fourniture de rouleaux… » : la partie avant le tiret suffit.
  const dash = text.search(/\s[-–—]\s/);
  if (dash >= 8) text = text.slice(0, dash);
  text = text.replace(/\s*\(réf\.?[^)]*\)/gi, "").replace(/\s+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Le doute de l'IA, sans l'étiquette « L'IA hésite : » (la carte dit déjà que c'est une question). */
export function doubtText(message: string): string {
  const text = message.replace(/^L['’]IA hésite\s*:\s*/i, "").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** « 9 200 pièces » → { quantity: "9 200", unit: "pièces" } ; « 6 longueurs de 4 m » → { "6", "longueurs de 4 m" }. */
export function parseQuantity(text: string): { quantity: string; unit: string } | null {
  const m = /^([\d\s.,]+?)\s*([^\d].*)?$/.exec(text.trim());
  if (!m) return null;
  return { quantity: m[1]!.trim(), unit: (m[2] ?? "").trim() };
}
