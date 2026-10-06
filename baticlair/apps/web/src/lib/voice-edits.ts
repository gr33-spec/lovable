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
  "donc", "alors", "ok", "oui", "faut", "il", "j", "ai", "as", "a",
]);

const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14,
  quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, mille: 1000,
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
  [/^(longueurs?)$/, "longueurs"],
  [/^(plaques?)$/, "plaques"],
  [/^(feuilles?)$/, "feuilles"],
  [/^(ml|metres? lineaires?)$/, "ml"],
  [/^(m2|m²|metres? carres?)$/, "m²"],
  [/^(m|metres?)$/, "m"],
  [/^(kg|kilos?)$/, "kg"],
];

const REMOVE = /^(enleve|enlever|enleves|retire|retirer|retires|supprime|supprimer|vire|virer|pas besoin|j ai pas besoin|on a pas besoin|sans|zappe)\b/;
const ADD = /^(ajoute|ajouter|ajoutes|rajoute|rajouter|il manque|manque|j ai oublie|oublie|tu as oublie|t as oublie|en plus|prevois|mets aussi|ajoute aussi)\b/;
const SET = /^(mets|met|mettre|passe|passer|change|changer|corrige|corriger|il en faut|il faut|plutot|fais|compte)\b/;

const stem = (w: string) => (w.length > 4 ? w.replace(/(es|s|x|e)$/, "") : w);
const words = (t: string) => normalize(t).split(" ").filter((w) => w.length > 1 && !STOP.has(w) && !/^\d/.test(w));

export function segments(transcript: string): string[] {
  return transcript
    .split(/[.;!?\n]+|,(?!\d)|\bpuis\b|\bensuite\b|\bet (?=(?:enleve|retire|supprime|vire|ajoute|rajoute|mets|passe|change|j ai oublie|il manque)\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Le premier nombre dit (chiffres ou mots), et l'unité qui le suit s'il y en a une. */
function quantityIn(norm: string): { value: number; unit: string | null; at: number; end: number } | null {
  const tokens = norm.split(" ");
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    let value: number | null = /^\d+(?:\.\d+)?$/.test(t) ? Number(t) : null;
    if (value === null && NUMBER_WORDS[t] !== undefined && !(t === "un" || t === "une") ) value = NUMBER_WORDS[t]!;
    // « un » / « une » ne comptent que devant une unité (« une cartouche ») : sinon c'est un article (« une noue »).
    if (value === null && (t === "un" || t === "une") && tokens[i + 1] && UNITS.some(([re]) => re.test(tokens[i + 1]!))) value = 1;
    if (value === null) continue;
    let end = i + 1;
    let unit: string | null = null;
    const next = tokens[i + 1];
    const nextTwo = next && tokens[i + 2] ? `${next} ${tokens[i + 2]}` : null;
    for (const [re, u] of UNITS) {
      if (nextTwo && re.test(nextTwo)) {
        unit = u;
        end = i + 3;
        break;
      }
      if (next && re.test(next)) {
        unit = u;
        end = i + 2;
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
      return { it, hit, score: hit / said.length, close: own.size > 0 ? hit / own.size : 0 };
    })
    .filter((x) => x.hit > 0 && x.score >= 0.5)
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
const shown = (n: number) => String(n).replace(".", ",");
const unitOf = (quantity: string | null) => (quantity ? (/^[\d\s.,]+\s*(.*)$/.exec(quantity.trim())?.[1]?.trim() ?? null) || null : null);

/** Le dit, morceau par morceau, en modifications de la liste. */
export function parseEdits(transcript: string, items: readonly VoiceItem[]): VoiceEdit[] {
  const out: VoiceEdit[] = [];
  for (const heard of segments(transcript)) {
    const norm = normalize(heard);
    const verb = REMOVE.exec(norm) ?? ADD.exec(norm) ?? SET.exec(norm);
    const rest = verb ? norm.slice(verb[0].length).trim() : norm;
    const q = quantityIn(rest);
    // Ce qui nomme l'article : le morceau sans le verbe, sans le nombre et son unité.
    const tokens = rest.split(" ");
    const name = q ? [...tokens.slice(0, q.at), ...tokens.slice(q.end)].join(" ").replace(/^(a|en)\s+/, "") : rest;
    const item = findItem(name, items);
    if (verb && REMOVE.test(norm)) {
      out.push(item ? { kind: "remove", itemKey: item.key, label: item.label, heard } : { kind: "unknown", heard });
      continue;
    }
    if (verb && ADD.test(norm)) {
      if (item && q) {
        // « Ajoute 10 crochets » quand les crochets sont déjà là : la quantité augmente d'autant.
        const current = item.quantity ? Number(normalize(item.quantity).split(" ")[0]) : NaN;
        const to = Number.isFinite(current) ? current + q.value : q.value;
        out.push({ kind: "set", itemKey: item.key, label: item.label, from: item.quantity, to: shown(to), unit: q.unit ?? unitOf(item.quantity), heard });
      } else if (item) out.push({ kind: "unknown", heard });
      else {
        const label = tidy(heard.replace(/^\s*(ajoute[rs]?|rajoute[r]?|il manque|manque|j'ai oublié|j ai oublié|oublié|tu as oublié|t'as oublié|en plus|prévois|mets aussi|ajoute aussi)\s*/i, "").replace(/^\s*(\d+(?:[.,]\d+)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+/i, "").replace(new RegExp(`^${q?.unit ?? "@@"}\\s*`, "i"), ""));
        const cleaned = q?.unit ? tidy(label.replace(/^(cartouches?|boîtes?|boites?|rouleaux?|paquets?|bottes?|sacs?|seaux?|longueurs?|plaques?|feuilles?|pièces?|pieces?|ml|mètres?|metres?|kg|kilos?)\s+/i, "")) : label;
        out.push(cleaned.length >= 3 ? { kind: "add", label: cleaned, quantity: q ? shown(q.value) : null, unit: q?.unit ?? null, heard } : { kind: "unknown", heard });
      }
      continue;
    }
    if (item && q) {
      out.push({ kind: "set", itemKey: item.key, label: item.label, from: item.quantity, to: shown(q.value), unit: q.unit ?? unitOf(item.quantity), heard });
      continue;
    }
    out.push({ kind: "unknown", heard });
  }
  return out;
}
