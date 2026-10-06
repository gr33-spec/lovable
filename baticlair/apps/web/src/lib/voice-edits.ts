/**
 * MODIFIER LE QUANTITATIF À LA VOIX (§48.4, retour de Greg) : « enlève les liteaux, mets 40 crochets, j'ai oublié
 * 2 cartouches de silicone ». Chaque morceau dit devient UNE modification d'une ligne de la liste : retirer, changer la
 * quantité, ajouter. Lu par le code (deux appels IA max par devis : lecture + quantitatif) ; ce qui n'est pas compris
 * est dit tel quel, jamais deviné.
 */

export interface VoiceItem {
  key: string;
  label: string;
  /** « 3 706 pièces » : le nombre et l'unité affichés. */
  quantity: string | null;
}

export type VoiceEdit =
  | { kind: "remove"; itemKey: string; label: string; heard: string }
  | { kind: "set"; itemKey: string; label: string; from: string | null; to: string; unit: string | null; heard: string }
  | { kind: "add"; label: string; quantity: string | null; unit: string | null; heard: string }
  | { kind: "unknown"; heard: string };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/(\d)\s+(\d{3})\b/g, "$1$2")
    .replace(/[^a-z0-9.%°²]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "d", "l", "en", "a", "au", "aux", "et", "pour", "sur", "avec", "par", "je", "j", "tu", "on", "il", "elle",
  "me", "moi", "mon", "ma", "mes", "ton", "ta", "tes", "ce", "cette", "ces", "y", "s", "n", "ne", "pas", "plus", "aussi", "encore", "stp", "svp", "merci", "bien",
  "donc", "alors", "ok", "oui", "faut", "il", "j", "ai", "as", "a", "lieu", "fait", "ca", "c", "est", "sera", "veux", "besoin", "ligne", "lignes",
  "quantite", "total", "tout", "tous", "toutes", "euh", "bon", "puis", "ensuite", "voila", "vous", "nous", "qu", "que", "en", "lui", "leur",
]);

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14,
  quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, cents: 100, mille: 1000, demi: 0.5,
};

/** Les unités qu'on dit au comptoir, ramenées à leur écriture courte. */
const UNITS: [RegExp, string][] = [
  [/^(pieces?|pcs?|u|unites?)$/, "pièces"],
  [/^(cartouches?)$/, "cartouches"],
  [/^(boites?)$/, "boîtes"],
  [/^(rouleaux?)$/, "rouleaux"],
  [/^(paquets?)$/, "paquets"],
  [/^(bottes?)$/, "bottes"],
  [/^(sacs?)$/, "sacs"],
  [/^(seaux?)$/, "seaux"],
  [/^(longueurs?|barres?)$/, "longueurs"],
  [/^(plaques?)$/, "plaques"],
  [/^(feuilles?)$/, "feuilles"],
  [/^(ml|metres? lineaires?)$/, "ml"],
  [/^(m2|m²|metres? carres?)$/, "m²"],
  [/^(m|metres?)$/, "m"],
  [/^(kg|kilos?)$/, "kg"],
];

// Le verbe se dit n'importe où dans le morceau (« les liteaux, enlève-les », « on n'a pas besoin de l'écran »).
const REMOVE = /\b(enleve|enlever|enleves|enlevez|retire|retirer|retires|retirez|supprime|supprimer|supprimez|vire|virer|zappe|zapper|pas besoin|plus besoin|n en veux pas|sans)\b/;
const ADD = /\b(ajoute|ajouter|ajoutes|ajoutez|rajoute|rajouter|rajoutes|rajoutez|il manque|manque|oublie|en plus|de plus|prevois|prevoir)\b/;
const SET = /\b(mets|met|mettre|mettez|passe|passer|passez|change|changer|corrige|corriger|il en faut|il faut|faut|plutot|fais|compte|compter|au lieu de|c est|ca fait|ca sera|remplace|on part sur|pars sur)\b/;
const LESS = /\b(en moins|de moins)\b/;
/** Ce qui se dit sans rien demander (« ok », « alors », « euh ») : ni modification, ni « pas compris ». */
const FILLER = new Set(["ok", "okay", "bon", "alors", "euh", "heu", "donc", "et", "puis", "ensuite", "aussi", "bah", "ben", "voila", "oui", "non", "merci", "stp", "svp", "bref", "voila", "c", "est", "tout", "fini", "termine", "c est tout"]);

const stem = (w: string) => (w.length > 4 ? w.replace(/(es|s|x|e)$/, "") : w);
const words = (t: string) => normalize(t).split(" ").filter((w) => w.length > 1 && !STOP.has(w) && !/^\d/.test(w));

/** Le début d'une consigne : un verbe (« enlève », « mets », « j'ai oublié »…), accents ou pas. */
const VERB_START = /(?:^|\s)((?:et\s+)?(?:enl[eè]ve|retire|supprime|vire|zappe|ajoute|rajoute|mets|mettre|passe|change|corrige|remplace|j['’]?\s?ai oubli[eé]|il manque|il (?:en )?faut|on n['’]?\s?a pas besoin|pas besoin|plus besoin))(?![\p{L}\d])/giu;

export function segments(transcript: string): string[] {
  const pieces = transcript
    .split(/[.;!?\n]+|,(?!\d)|\bpuis\b|\bensuite\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // Sans ponctuation (la dictée n'en met pas toujours) : « enlève l'écran j'ai oublié 2 cartouches » = deux consignes.
  // On coupe devant chaque verbe qui suit déjà un verbe ; « les ardoises, mets-en 3 800 » reste une seule consigne.
  const out: string[] = [];
  for (const piece of pieces) {
    const starts = [...piece.matchAll(VERB_START)].map((m) => m.index! + m[0].indexOf(m[1]!));
    let from = 0;
    for (const at of starts.slice(1)) {
      out.push(piece.slice(from, at).trim());
      from = at;
    }
    out.push(piece.slice(from).trim());
  }
  return out.filter((s) => s.length > 0);
}

/** « deux cent cinquante » → 250, « mille deux cents » → 1200, « quatre vingt » → 80. Null : pas un nombre dit en lettres. */
function wordsNumber(tokens: readonly string[], from: number): { value: number; end: number } | null {
  let total = 0;
  let current = 0;
  let i = from;
  let any = false;
  for (; i < tokens.length; i++) {
    const t = tokens[i]!;
    const v = NUMBER_WORDS[t];
    if (v === undefined || (t === "un" || t === "une" ? any : false)) break;
    if (t === "cent" || t === "cents") current = (current || 1) * 100;
    else if (t === "mille") {
      total += (current || 1) * 1000;
      current = 0;
    } else if ((t === "vingt" || t === "vingts") && current === 4) current = 80;
    else current += v;
    any = true;
  }
  return any ? { value: total + current, end: i } : null;
}

/** Le premier nombre dit (chiffres ou mots), et l'unité qui le suit s'il y en a une. */
function quantityIn(norm: string): { value: number; unit: string | null; at: number; end: number } | null {
  const tokens = norm.split(" ");
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    let value: number | null = null;
    let end = i + 1;
    if (/^\d+(?:\.\d+)?$/.test(t)) value = Number(t);
    else if (t === "un" || t === "une") {
      // « un » / « une » ne comptent que devant une unité (« une cartouche ») : sinon c'est un article (« une noue »).
      if (tokens[i + 1] && UNITS.some(([re]) => re.test(tokens[i + 1]!))) value = 1;
    } else {
      const w = wordsNumber(tokens, i);
      if (w) {
        value = w.value;
        end = w.end;
      }
    }
    if (value === null) continue;
    let unit: string | null = null;
    const next = tokens[end];
    const nextTwo = next && tokens[end + 1] ? `${next} ${tokens[end + 1]}` : null;
    for (const [re, u] of UNITS) {
      if (nextTwo && re.test(nextTwo)) {
        unit = u;
        end += 2;
        break;
      }
      if (next && re.test(next)) {
        unit = u;
        end += 1;
        break;
      }
    }
    return { value, unit, at: i, end };
  }
  return null;
}

/** L'article de la liste que nomme le morceau : le plus de mots en commun, seul en tête ; sinon rien (jamais au hasard). */
function findItem(phrase: string, items: readonly VoiceItem[]): VoiceItem | null {
  const said = words(phrase).map(stem);
  if (said.length === 0) return null;
  const scored = items
    .map((it) => {
      const own = new Set(words(it.label).map(stem));
      const hit = said.filter((w) => own.has(w)).length;
      // À mots égaux, la désignation la plus proche gagne (« liteaux » : les liteaux, pas les contre-liteaux).
      return { it, hit, close: own.size > 0 ? hit / own.size : 0 };
    })
    // Au moins un tiers des mots dits (hors verbes et petits mots) : un mot égaré ne choisit pas une ligne.
    .filter((x) => x.hit > 0 && x.hit / said.length >= 1 / 3)
    .sort((a, b) => b.hit - a.hit || b.close - a.close);
  const best = scored[0];
  if (!best) return null;
  const second = scored[1];
  if (second && second.hit === best.hit && second.close === best.close) return null;
  return best.it;
}

const tidy = (s: string) => {
  const t = s.replace(/^(de |d |des |du |la |le |les |l )/i, "").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const shown = (n: number) => String(Number(n.toFixed(2))).replace(".", ",");
const unitOf = (quantity: string | null) => (quantity ? (/^[\d\s.,]+\s*(.*)$/.exec(quantity.trim())?.[1]?.trim() ?? null) || null : null);
const currentOf = (item: VoiceItem) => (item.quantity ? Number(normalize(item.quantity).split(" ")[0]) : NaN);

/** Le dit, morceau par morceau, en modifications de la liste. */
export function parseEdits(transcript: string, items: readonly VoiceItem[]): VoiceEdit[] {
  const out: VoiceEdit[] = [];
  // « Et les ardoises, mets-en 3 800 » : la virgule coupe la phrase ; un morceau qui ne fait que nommer une ligne
  // passe son nom au morceau suivant.
  let carry: string | null = null;
  for (const said of segments(transcript)) {
    const heard: string = carry ? `${carry} ${said}` : said;
    carry = null;
    const norm = normalize(heard);
    // « Ok », « alors », « c'est tout » : rien à modifier, et rien à dire.
    if (norm.split(" ").every((w) => FILLER.has(w) || STOP.has(w))) continue;
    const removing = REMOVE.exec(norm);
    const adding = ADD.exec(norm);
    const setting = SET.exec(norm);
    const less = LESS.test(norm);
    // Ce qui nomme l'article : le morceau sans ses verbes, sans le nombre et son unité.
    let rest = norm;
    for (const re of [REMOVE, ADD, SET, LESS]) rest = rest.replace(new RegExp(re.source, "g"), " ");
    rest = rest.replace(/\s+/g, " ").trim();
    const q = quantityIn(rest);
    const tokens = rest.split(" ");
    const name = q ? [...tokens.slice(0, q.at), ...tokens.slice(q.end)].join(" ") : rest;
    const item = findItem(name, items);
    const current = item ? currentOf(item) : NaN;
    // « 500 mètres » de liteaux comptés en ml : l'unité de la ligne reste la sienne.
    const sameUnit = (u: string | null) => {
      const own = unitOf(item!.quantity);
      return !u || (own && /^(m|ml)$/.test(u) && /^(m|ml|m lin)/.test(own)) ? own : u;
    };
    const set = (to: number, unit: string | null) =>
      out.push({ kind: "set", itemKey: item!.key, label: item!.label, from: item!.quantity, to: shown(Math.max(0, to)), unit: sameUnit(unit), heard });
    if (item && !q && !removing && !adding && !setting && !less) {
      carry = heard;
      continue;
    }

    // Retirer : toute la ligne, ou quelques-uns (« enlève 2 rouleaux d'écran », « 10 crochets en moins »).
    if (item && (removing || less)) {
      if (q && Number.isFinite(current) && q.value < current) set(current - q.value, q.unit);
      else out.push({ kind: "remove", itemKey: item.key, label: item.label, heard });
      continue;
    }
    // Ajouter à une ligne qui existe : la quantité augmente (« ajoute 10 crochets », « un dauphin de plus »).
    if (item && adding && !setting) {
      const plus = q?.value ?? (/\b(un|une)\b/.test(norm) ? 1 : null);
      if (plus !== null && Number.isFinite(current)) set(current + plus, q?.unit ?? null);
      else if (plus !== null) set(plus, q?.unit ?? null);
      else out.push({ kind: "unknown", heard });
      continue;
    }
    // Changer la quantité : « mets 3800 crochets », « les liteaux c'est 500 », « 3 rouleaux d'écran au lieu de 2 ».
    if (item && q) {
      set(q.value, q.unit);
      continue;
    }
    // Un article qui n'est pas dans la liste : ajouté avec les mots de l'artisan.
    if (!item && adding) {
      const label = tidy(
        heard
          .replace(/^\s*(et |alors |puis |ok |bon )*/i, "")
          .replace(/^\s*(ajoute[rsz]?|rajoute[rsz]?|il manque|manque|j'ai oublié|j ai oublié|oublié|tu as oublié|t'as oublié|en plus|prévois|mets aussi|ajoute aussi)\s*/i, "")
          .replace(/\s*(en plus|de plus|aussi)\s*$/i, "")
          .replace(/^\s*(\d+(?:[.,]\d+)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+/i, ""),
      );
      const cleaned = q?.unit ? tidy(label.replace(/^(cartouches?|boîtes?|boites?|rouleaux?|paquets?|bottes?|sacs?|seaux?|longueurs?|barres?|plaques?|feuilles?|pièces?|pieces?|ml|mètres?|metres?|kg|kilos?)\s+/i, "")) : label;
      out.push(cleaned.length >= 3 ? { kind: "add", label: cleaned, quantity: q ? shown(q.value) : null, unit: q?.unit ?? null, heard } : { kind: "unknown", heard });
      continue;
    }
    out.push({ kind: "unknown", heard });
  }
  if (carry) out.push({ kind: "unknown", heard: carry });
  return out;
}
