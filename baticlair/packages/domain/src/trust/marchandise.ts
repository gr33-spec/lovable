/**
 * MARCHANDISE SEULE (retour du fondateur, 2026-10-04) : « Aucun intérêt de parler de pose… on veut juste des quantités
 * de marchandises. Pas du tout de main d'œuvre. » Une désignation recopiée du devis client perd ses mentions de pose
 * (« (Fourniture et pose) », « F&P », « Fourniture et pose de… », « pose comprise ») partout où elle se montre :
 * liste des fournitures, mail, PDF. La façon de poser qui décrit l'article (« ardoises posées au crochet ») reste.
 */
const MENTION = String.raw`(?:fournitures?\s*(?:&|et|\+|\/)\s*poses?|poses?\s*(?:&|et|\+|\/)\s*fournitures?|f\.?\s*(?:&|et|\+|\/)\s*p\.?|fournitures?\s+seules?|fournitures?|poses?\s+(?:comprises?|incluses?)|y\s+compris\s+(?:la\s+)?pose|main[-\s]d['’]\s*(?:œ|oe)uvre(?:\s+comprises?)?)`;
const IN_PARENS = new RegExp(String.raw`\s*\(\s*${MENTION}\s*\)`, "gi");
/** « Fourniture et pose de tuiles… », « Pose de liteaux… » en tête de phrase ou après un tiret : l'article seul. */
const LEADING = new RegExp(
  String.raw`(^|[-–—:;,]\s*)(?:fournitures?\s*(?:&|et|\+|\/)\s*poses?|fournitures?\s+et\s+mise\s+en\s+(?:place|œuvre|oeuvre)|mise\s+en\s+(?:place|œuvre|oeuvre)|poses?|fournitures?)\s+(?:de\s+la\s+|de\s+l['’]\s*|des\s+|du\s+|de\s+|d['’]\s*|d\s+)(?:une?\s+)?`,
  "gi",
);
const TRAILING = /[,;]?\s*(?:y\s+compris\s+(?:la\s+)?pose|pose\s+(?:comprise|incluse)|et\s+pose|(?:fourniture\s+)?(?:&|et)\s+pose)\b\.?/gi;

export function withoutLabour(designation: string): string {
  const text = designation
    .replace(IN_PARENS, "")
    .replace(LEADING, "$1")
    .replace(TRAILING, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/(?:\s*[-–—:;,])+\s*$/, "")
    .replace(/^\s*[-–—:;,]\s*/, "")
    .trim();
  if (!text) return designation.trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Une quantité recopiée du devis telle que le logiciel du devis l'imprime : « 30,000 » (trois décimales), « 530,00 ».
 * Les zéros après la virgule ne disent rien : « 30 », « 530 », « 3,5 » (retour du fondateur, 2026-10-04). Une
 * virgule est décimale (devis français) ; un point suivi de trois chiffres (« 1.200 ») peut être un millier : gardé tel
 * quel. Le calcul lit la valeur, jamais ce texte.
 */
export function writtenNumber(raw: string): string {
  const text = raw.trim();
  const m = /^(\d{1,3}(?:[   ]\d{3})*|\d+)(?:,(\d+)|\.(\d{1,2}|\d{4,}))$/.exec(text);
  if (!m) return text;
  const decimals = (m[2] ?? m[3]!).replace(/0+$/, "");
  return decimals ? `${m[1]},${decimals}` : m[1]!;
}
