/**
 * RÉPONDRE À LA VOIX (parcours §48, étape 3) : l'artisan dicte (ou tape) ses réponses d'un trait — « je façonne, zinc
 * 0,65, pente 35 degrés, les vis oui » — et chaque morceau est relié À SA QUESTION, par le code (aucun appel IA : deux
 * appels max par devis). Un morceau qui ne désigne clairement qu'une réponse d'une question la coche ; un doute (deux
 * questions possibles, aucun mot reconnu) ne coche rien : la question reste ouverte, sa ligne sortira orange.
 */

export interface VoiceQuestion {
  key: string;
  /** La question telle qu'affichée (ses mots aident à reconnaître de quoi parle un morceau). */
  text: string;
  /** Réponses à boutons ; vide pour une valeur à dire (« 35 degrés »). */
  options: { label: string; value: string }[];
  /** Unité d'une valeur à dire (°, mm, cm, m, %, u). */
  unit?: string | null;
}

export interface VoiceMatch {
  key: string;
  value: string;
  /** Le libellé de la réponse retenue (ou la valeur avec son unité). */
  label: string;
  /** Le morceau dicté qui a donné la réponse. */
  heard: string;
}

const STOP = new Set([
  "les", "des", "une", "un", "le", "la", "de", "du", "en", "et", "ou", "au", "aux", "pour", "par", "sur", "avec", "sans", "est", "sont", "pas",
  "que", "qui", "quoi", "quel", "quelle", "quels", "quelles", "tu", "te", "toi", "ton", "ta", "tes", "je", "j", "me", "moi", "mon", "ma", "mes",
  "on", "il", "elle", "ce", "cet", "cette", "ces", "ca", "cela", "a", "y", "l", "d", "s", "c", "n", "qu", "ne", "plus", "tout", "tous", "comme",
  "fait", "faire", "veux", "mets", "met", "prends", "prend", "alors", "bon", "bien", "oui", "non", "type", "ajoute", "ajouter", "ajoutes",
  "est", "quelle", "combien", "meme", "plutot",
]);

const YES = /^(oui|ouais|ouep|yes|ok|okay|d accord|bien sur|evidemment|carrement|volontiers|mets en|mets les|ajoute|ajoutes)$/;
const NO = /^(non|nan|pas besoin|pas la peine|sans|aucun|aucune|jamais|on oublie|laisse tomber)$/;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^a-z0-9.%°]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Racine grossière : « bobines » = « bobine », « façonnés » = « faconne ». */
const stem = (w: string) => (w.length > 4 ? w.replace(/(es|s|x|e)$/, "") : w);

function words(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 0 && !STOP.has(w));
}

/** Les nombres d'un texte (« 0,65 mm » → 0.65 ; « trente-cinq » n'est pas compris : on le dit en chiffres). */
function numbers(text: string): number[] {
  return [...normalize(text).matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

const UNIT_WORDS: Record<string, RegExp> = {
  "°": /(°|\bdegres?\b|\bdeg\b)/,
  mm: /\b(mm|millimetres?)\b/,
  cm: /\b(cm|centimetres?)\b/,
  m: /\b(m|metres?)\b/,
  "%": /(%|\bpour ?cent\b)/,
};

/** Le dit est découpé en morceaux : ponctuation, « et puis », « ensuite », « après ». */
export function segments(transcript: string): string[] {
  return transcript
    .split(/[.;!?\n]+|,(?!\d)|\bet puis\b|\bpuis\b|\bensuite\b|\bapres\b|\bapr[eè]s\b|\bet\b(?=\s+(?:le|la|les|pour|pente|zinc|ardoise|vis|on|je|j))/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Les mots de chaque réponse, pesés : un mot propre à cette réponse compte double, un mot partagé compte simple, le
 * SUJET de la question n'en est pas un (« ardoise » dans « Quelle ardoise : Espagne, ou ardoise NF ? »).
 */
function weighted(q: VoiceQuestion): Map<string, Map<string, number>> {
  const sets = q.options.map((o) => new Set(words(o.label).map(stem)));
  const count = (list: string[], w: string) => list.filter((x) => x === w).length;
  const inQuestion = words(q.text).map(stem);
  const inOptions = sets.flatMap((s) => [...s]);
  const subject = new Set(inQuestion.filter((w) => count(inQuestion, w) > count(inOptions, w)));
  return new Map(
    q.options.map((o, i) => {
      const own = [...sets[i]!].filter((w) => !subject.has(w));
      return [o.value, new Map(own.map((w) => [w, sets.filter((s) => s.has(w)).length === 1 ? 2 : 1]))];
    }),
  );
}

function yesNo(q: VoiceQuestion): { yes: string; no: string } | null {
  const yes = q.options.find((o) => /^oui\b/i.test(normalize(o.label)));
  const no = q.options.find((o) => /^non\b/i.test(normalize(o.label)));
  return yes && no ? { yes: yes.value, no: no.value } : null;
}

/** Combien de mots de la question se retrouvent dans le morceau (« pente », « zinc », « façonne »…). */
function topicScore(q: VoiceQuestion, seg: string[]): number {
  const topic = new Set(words(q.text).filter((w) => w.length >= 3).map(stem));
  return seg.filter((w) => topic.has(w)).length;
}

interface Candidate {
  key: string;
  value: string;
  label: string;
  score: number;
}

function candidates(q: VoiceQuestion, seg: string): Candidate[] {
  const norm = normalize(seg);
  const segWords = words(seg).map(stem);
  const topic = topicScore(q, segWords);
  const out: Candidate[] = [];
  // Oui / Non : seulement si le morceau parle de cette question (« les vis : oui »).
  const yn = yesNo(q);
  if (yn) {
    if (topic === 0) return [];
    const said = norm.split(" ");
    const anyYes = said.some((w) => YES.test(w)) || YES.test(norm);
    const anyNo = said.some((w) => NO.test(w)) || /\bpas besoin\b|\bpas la peine\b/.test(norm);
    if (anyYes !== anyNo) {
      const value = anyYes ? yn.yes : yn.no;
      out.push({ key: q.key, value, label: q.options.find((o) => o.value === value)!.label, score: 2 + topic });
    }
    return out;
  }
  if (q.options.length > 0) {
    const weights = weighted(q);
    for (const o of q.options) {
      const mine = weights.get(o.value) ?? new Map<string, number>();
      const total = [...mine.values()].reduce((a, b) => a + b, 0);
      const hit = [...mine].filter(([w]) => segWords.includes(w)).reduce((a, [, n]) => a + n, 0);
      // Une réponse chiffrée (« 0,65 mm ») : le nombre suffit.
      const optionNumbers = numbers(o.label);
      const numberHit = optionNumbers.length > 0 && numbers(seg).some((n) => optionNumbers.includes(n));
      if (hit === 0 && !numberHit) continue;
      out.push({ key: q.key, value: o.value, label: o.label, score: (total > 0 ? (4 * hit) / total : 0) + (numberHit ? 3 : 0) + topic });
    }
    return out;
  }
  // Une valeur à dire : un nombre, et soit son unité, soit un mot de la question.
  const unit = q.unit ?? "";
  const found = numbers(seg);
  if (found.length !== 1) return [];
  const unitSaid = UNIT_WORDS[unit]?.test(norm) ?? false;
  if (!unitSaid && topic === 0) return [];
  const value = String(found[0]);
  out.push({ key: q.key, value, label: unit && unit !== "u" ? `${value.replace(".", ",")} ${unit === "°" ? "°" : unit}`.replace(" °", "°") : value.replace(".", ","), score: 1 + topic + (unitSaid ? 1 : 0) });
  return out;
}

/**
 * Relie chaque morceau du dit à une réponse. Pour un morceau : la meilleure réponse, si elle est seule en tête (une
 * égalité entre deux questions ne coche rien). Un morceau plus loin peut changer une réponse (« non, plutôt 0,70 »).
 */
export function matchAnswers(transcript: string, questions: readonly VoiceQuestion[]): VoiceMatch[] {
  const result = new Map<string, VoiceMatch>();
  for (const seg of segments(transcript)) {
    const all = questions.flatMap((q) => candidates(q, seg)).sort((a, b) => b.score - a.score);
    const best = all[0];
    if (!best) continue;
    const second = all[1];
    if (second && second.score === best.score && (second.key !== best.key || second.value !== best.value)) continue;
    result.set(best.key, { key: best.key, value: best.value, label: best.label, heard: seg });
  }
  return [...result.values()];
}
