import { normalizeText } from "../trades/trade-profile.js";

/**
 * Caractéristiques qui peuvent changer le PRODUIT, la QUANTITÉ ou le PRIX :
 * elles ne doivent jamais disparaître quand BatiClair simplifie un
 * intitulé (cas de référence D-2026-015 : « HPV », « rouge », « sable »,
 * « Ø80 », « hauteur 4 m », « crochets et naissances compris »…).
 *
 * Lecture déterministe, commune à tous les métiers : dimensions, diamètres,
 * matériaux, coloris, sigles produit, marques, hauteurs/longueurs/entraxes,
 * éléments « compris ». Rien n'est déduit : on ne fait que relever.
 */
const MATERIALS = ["terre cuite", "beton", "pvc", "zinc", "alu", "aluminium", "cuivre", "inox", "acier", "galvanise", "sapin", "douglas", "chene", "polyurethane", "laine de verre", "laine de roche", "fibre de bois"];
const COLOURS = ["rouge", "sable", "blanc", "gris", "noir", "anthracite", "brun", "marron", "ardoise", "beige", "vieilli", "flamme", "nuance", "naturel", "vert", "bleu", "terracotta", "cuivre"];
const QUALIFIERS = ["ventile", "respirant", "traite", "classe 2", "classe 3", "demi ronde", "cylindrique", "carree", "angulaire", "a emboitement", "grand moule"];
/** Forme affichée (accents, trait d'union) des mots relevés sous forme normalisée. */
const DISPLAY: Record<string, string> = {
  beton: "béton",
  galvanise: "galvanisé",
  chene: "chêne",
  polyurethane: "polyuréthane",
  flamme: "flammé",
  ventile: "ventilé",
  traite: "traité",
  "demi ronde": "demi-ronde",
  carree: "carrée",
  "a emboitement": "à emboîtement",
};

/** Mots de la liste présents dans le texte ; les accords (« ventilées », « respirante ») comptent. */
function words(text: string, list: readonly string[]): string[] {
  const t = ` ${normalizeText(text).replace(/[^a-z0-9 ]/g, " ")} `;
  return list.filter((w) => new RegExp(` ${w}(?:e|s|es)? `).test(t)).map((w) => DISPLAY[w] ?? w);
}

/**
 * L'objet réellement fourni, quand la description le nomme : « Fourniture et
 * pose de faîtières ventilées avec… » → « faîtières ventilées ». Sous un
 * titre d'ouvrage (« Faîtage »), c'est lui le produit à commander.
 */
export function suppliedObject(text: string): string | null {
  const m = /fourniture\s*(?:et|&)\s*pose\s+(?:de\s+la\s+|du\s+|des\s+|de\s+|d['’]un\s+|d['’]une\s+|d['’])([^,(]+?)(?=\s+(?:avec|pour|comprenant|posée?s?|sur)\b|\s*[,(]|$)/i.exec(text);
  return m ? m[1]!.trim() : null;
}

export function keyCharacteristics(text: string): string[] {
  const out: string[] = [];
  const push = (v: string) => {
    const clean = v.replace(/\s+/g, " ").trim();
    // « 27×40 » et « 27×40 mm » : la même caractéristique, gardée une fois.
    const key = normalizeText(clean).replace(/\s*(mm|cm|m)$/, "");
    if (clean && !out.some((o) => normalizeText(o).replace(/\s*(mm|cm|m)$/, "") === key)) out.push(clean);
  };

  // Sections et formats : « 27x40 », « 1,50 x 50 m », « 460x306 mm ».
  for (const m of text.matchAll(/\b(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×*]\s*(\d+(?:[.,]\d+)?))?\s*(mm|cm|m)?\b/gi)) {
    push(`${m[1]}×${m[2]}${m[3] ? `×${m[3]}` : ""}${m[4] ? ` ${m[4]}` : ""}`);
  }
  // Diamètres : « Ø80 », « diamètre 80 ».
  for (const m of text.matchAll(/(?:Ø|ø|diam(?:è|e)tre)\s*(\d+)/gi)) push(`Ø${m[1]}`);
  // Hauteur, longueur, entraxe, épaisseur, pente chiffrées.
  for (const m of text.matchAll(/\b(hauteur|entraxe|épaisseur|epaisseur|pente)\s*(?:de\s*)?:?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|%)/gi)) {
    push(`${m[1]!.toLowerCase()} ${m[2]} ${m[3]}`);
  }
  // Sigles produit : « HPV », « HP10 », « R2 », « LG25 » (majuscules, éventuellement suivies de chiffres).
  for (const m of text.matchAll(/\b([A-Z]{2,}[0-9]*|[A-Z][0-9]{1,3})\b/g)) {
    if (!["TVA", "HT", "TTC", "FR", "SARL", "SAS"].includes(m[1]!)) push(m[1]!);
  }
  // Marques citées comme telles : « de marque Poujoulat ».
  for (const m of text.matchAll(/\bmarque\s+([A-Z][\wÀ-ÿ'-]+)/g)) push(m[1]!);
  for (const w of words(text, MATERIALS)) push(w === "pvc" ? "PVC" : w);
  for (const w of words(text, COLOURS)) push(w);
  for (const w of words(text, QUALIFIERS)) push(w);
  // Éléments inclus : « crochets et naissances compris », « coudes et colliers compris ».
  for (const m of text.matchAll(/\b([a-zà-ÿ]+(?:\s+(?:et|,)\s+[a-zà-ÿ]+)*)\s+compris\b/gi)) push(`${m[1]} compris`);
  // Composition annoncée : « comprenant 2 jeux de coudes et les colliers », « avec closoir ventilé et accessoires de fixation ».
  for (const m of text.matchAll(/\b(comprenant|avec)\s+([^,(.]+)/gi)) {
    const part = m[2]!.trim();
    // « avec pureau adapté… » décrit la pose, pas un composant à commander.
    if (/^(pureau|soin|finition)\b/i.test(part)) continue;
    push(`${m[1]!.toLowerCase()} ${part}`);
  }
  return out;
}
