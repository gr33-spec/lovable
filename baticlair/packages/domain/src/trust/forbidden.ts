import { normalizeText } from "../trades/trade-profile.js";
import type { OrangeFlag } from "./orange.js";
import type { PurchaseView } from "./purchase-view.js";

/**
 * LES INTERDITS, 100 % CODE, SANS IA (décision du fondateur, 2026-10-06) : une liste de ce que le comptoir refuserait
 * de charger, article par article. Chaque interdit force la ligne en ORANGE avec sa raison (et, quand c'est clair,
 * l'article à ajouter) ; l'artisan tranche d'un appui. Le moteur verrouille déjà ses propres lignes (§41.3) : cette
 * liste tient aussi pour ce que l'IA, l'artisan ou le devis ont mis dans la liste.
 */
export const FORBIDDEN = "interdit:";

const has = (text: string, re: RegExp) => re.test(normalizeText(text));
/** Ce qui se pose en éléments, en bobine ou au ml : jamais vendu au m². */
const ELEMENT = /\b(ardoises?|tuiles?|faitieres?|bacs?|plaques?|joint debout|zinc|cuivre|plomb|closoirs?|crochets?|chatieres?|bardeaux?|shingles?)\b/;
/** Vendu au m² (ou en rouleau dont la surface fait foi) : le m² est admis. */
const SOLD_BY_M2 = /\b(ecran|film|membrane|pare ?pluie|pare ?vapeur|isolant|isolation|laine|feutre|natte|voliges?|voligeage|panneaux?|osb|contreplaque|grillage|treillis|enduit|etancheite)\b/;
const M2 = /^(m2|m²|metres? carres?|m\. ?carres?)$/;
const ML = /^(ml|m|metres?( lineaires?)?|m\.l\.?)$/;
const METAL = /\b(zinc|cuivre|plomb|alu|aluminium|acier)\b/;
/** Une largeur, une épaisseur ou un développé lisibles dans la désignation. */
const DIMENSION = /\b(dev|developpe|largeur|ep|epaisseur)\b|\d+([.,]\d+)? ?(mm|cm)\b|\d+ ?x ?\d+|o ?\d+/;
/** Une UNITÉ vague (« 1 lot », « 1 forfait », « 1 ensemble ») ; dans une désignation, seulement les mots sans ambiguïté
 * (« Bouchon d'angle, ensemble haut et bas » est un vrai article). */
const VAGUE_UNIT = /^(lots?|forfaits?|ens\.?|ensembles?|ff|fft)$/;
const VAGUE_LABEL = /^(lot|forfait)\b|\b(forfait|selon besoin|fournitures? diverses?|divers)\b/;

/** L'unité de commande d'un article : celle de la commande, sinon celle écrite après le nombre (« 96 m² »). */
const unitOf = (order: { unit: string } | null, quantity: string | null) =>
  normalizeText(order?.unit ?? (quantity ?? "").replace(/^[\d\s  .,]+/, "")).trim();

interface Companion {
  rule: string;
  /** L'article principal. */
  main: RegExp;
  /** Ce qui ne doit pas être là pour que la règle porte (« ardoise fibres-ciment » a ses propres crochets). */
  unless?: RegExp;
  /** Au moins un article de la liste doit nommer l'un de ces mots. */
  needs: RegExp;
  text: string;
  suggestion: string;
}

/** Les articles qui ne partent jamais seuls : le comptoir les rappellerait. */
const COMPANIONS: Companion[] = [
  { rule: "ardoise-sans-crochets", main: /\bardoises?\b/, needs: /\b(crochets?|clous?|pointes?)\b/, text: "Ardoises sans crochets ni clous dans la liste.", suggestion: "Crochets d'ardoise inox" },
  { rule: "tuile-sans-faitage", main: /\btuiles?\b/, unless: /\bfaitieres?\b/, needs: /\b(faitieres?|faitage|closoirs?)\b/, text: "Tuiles sans faîtières ni closoir de faîtage dans la liste.", suggestion: "Faîtières" },
  { rule: "joint-debout-sans-pattes", main: /\bjoint debout\b/, unless: /\bpattes?\b/, needs: /\bpattes?\b/, text: "Joint debout sans pattes de fixation dans la liste.", suggestion: "Pattes coulissantes et fixes joint debout" },
  { rule: "gouttiere-sans-crochets", main: /\bgouttieres?\b/, unless: /\bcrochets?\b/, needs: /\b(crochets?|naissances?)\b/, text: "Gouttière sans crochets dans la liste.", suggestion: "Crochets de gouttière" },
  { rule: "bac-acier-sans-vis", main: /\bbacs? acier\b/, needs: /\bvis\b/, text: "Bac acier sans vis de fixation dans la liste.", suggestion: "Vis de fixation bac acier avec rondelle" },
];

/**
 * `writtenOnly` (règle numéro un, fondateur 2026-10-06) : un article absent du devis n'est jamais réclamé, pas même en
 * orange ; seuls restent les interdits de forme (m², lot, métal sans dimension).
 */
export function forbiddenFlags(purchase: PurchaseView, writtenOnly = false): OrangeFlag[] {
  const flags: OrangeFlag[] = [];
  const flag = (rule: string, itemKey: string, title: string, text: string, suggestion?: string) =>
    flags.push({ key: `${FORBIDDEN}${rule}:${itemKey}`, itemKey, title, text, ...(suggestion ? { suggestion: { label: suggestion, quantity: null, unit: null } } : {}) });
  for (const b of purchase.toBuy) {
    const unit = unitOf(b.order, b.quantity);
    if (M2.test(unit) && has(b.label, ELEMENT) && !has(b.label, SOLD_BY_M2)) {
      flag("m2", b.key, b.label, "Interdit : vendu à la pièce, au ml ou en bobine, jamais au m². Le comptoir ne peut pas le charger tel quel.");
    }
    if (has(b.label, VAGUE_LABEL) || VAGUE_UNIT.test(unit)) flag("vague", b.key, b.label, "Interdit : « lot », « forfait », « ensemble » : le comptoir ne sait pas quoi charger.");
    if (ML.test(unit) && has(b.label, METAL) && !has(b.label, DIMENSION)) flag("metal-ml", b.key, b.label, "Interdit : métal au mètre sans largeur, développé ni épaisseur.");
  }
  // Les articles qui ne partent jamais seuls : tout ce qui est dans la liste compte (à commander et à préciser).
  const everything = [...purchase.toBuy.map((b) => b.label), ...purchase.toQuote.map((q) => q.label)];
  for (const c of writtenOnly ? [] : COMPANIONS) {
    const main = purchase.toBuy.find((b) => has(b.label, c.main) && !(c.unless && has(b.label, c.unless)));
    if (!main || everything.some((l) => has(l, c.needs))) continue;
    flag(c.rule, main.key, main.label, `Interdit : ${c.text}`, c.suggestion);
  }
  return flags;
}
