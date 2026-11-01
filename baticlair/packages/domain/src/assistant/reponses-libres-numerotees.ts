/**
 * LA CONVERSATION APRÈS L'ANALYSE (Greg, 1er novembre 2026 : « MOBIIZ fonctionne comme ChatGPT ») : plusieurs questions
 * numérotées dans un seul message, l'artisan répond librement en une fois (texte ou dictée). Ce module relie chaque morceau
 * de la réponse à sa question, en CODE (zéro appel IA, zéro coût) :
 *  - « 1. zinc 2. 80 », « 1) … », « 1 : … », ou une ligne par réponse dans l'ordre des questions ;
 *  - sans numéro, un morceau va à la seule question dont il nomme un bouton ;
 *  - un bouton se reconnaît à son libellé, à sa valeur ou à un nombre seul ;
 *  - une valeur chiffrée garde son unité : une unité qui ne va pas (« % » pour une pente en degrés) n'est jamais convertie
 *    en silence, la question est reposée ; cm, mm et m se convertissent exactement.
 * JAMAIS une quantité ni une caractéristique inventée : ce qui n'est pas dit reste sans réponse, ce qui hésite entre deux
 * choix est reposé. Le serveur revalide chaque réponse au calcul (`reponses.N`) : ce module ne sauvegarde rien.
 */

export interface QuestionNumerotee {
  numero: number;
  cle: string;
  texte: string;
  options: readonly { label: string; value: string }[];
  /** L'unité de la valeur (« mm », « ° », « m2 », « u »), ou null. */
  unite: string | null;
  /** Ce qui peut s'écrire hors des boutons : une valeur chiffrée, un nom (modèle, teinte), une réponse écrite. */
  libre?: "number" | "text" | "written" | undefined;
  /** Une valeur chiffrée sans boutons. */
  numerique?: boolean;
}

export type StatutReponse = "compris" | "ambigu" | "sans_reponse";

export interface ReponseInterpretee {
  numero: number;
  cle: string;
  statut: StatutReponse;
  /** La valeur à envoyer (celle du bouton, ou le nombre « 38.5 », ou le texte écrit). */
  valeur: string | null;
  /** Ce que voit l'artisan (« Zinc », « 38,5° »). */
  libelle: string | null;
  /** Réponse hors des boutons (écrite ou chiffrée). */
  libreEcrite: boolean;
  /** Pourquoi la question est reposée, en une phrase. */
  raison: string | null;
}

/** Les lignes d'état montrées pendant la relecture (jamais le raisonnement). */
export const ETAPES_RELECTURE = ["Je relis tes réponses…", "Je vérifie les unités…", "Je mets à jour le quantitatif…"] as const;

export const LONGUEUR_MAX_ECRITE = 300;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NE_SAIT_PAS = /\b(?:je (?:ne )?sais pas|sais pas|aucune idee|j en sais rien|je ne connais pas|passe)\b/;

/** Découpe « 1. zinc 2) 80 3 : rouge » en morceaux numérotés ; null quand le texte n'a pas de numéros. */
export function morceauxNumerotes(texte: string, combien: number): Map<number, string> | null {
  const re = /(?:^|[\n;]|[.,]\s|\s)\s*(\d{1,2})\s*(?:[).:\-–]|\/)(?!\d)\s*/g;
  const reperes: { n: number; debut: number; fin: number }[] = [];
  let attendu = 1;
  for (const m of texte.matchAll(re)) {
    const n = Number(m[1]);
    // Un repère ne compte que s'il suit l'ordre (« 1 », puis « 2 »…) : « Ø 80 » ou « 2,5 m » ne coupent rien.
    if (n < 1 || n > combien || n < attendu) continue;
    reperes.push({ n, debut: m.index, fin: m.index + m[0].length });
    attendu = n + 1;
  }
  if (reperes.length === 0) return null;
  const out = new Map<number, string>();
  reperes.forEach((r, i) => {
    const suite = reperes[i + 1];
    const morceau = texte.slice(r.fin, suite ? suite.debut : undefined).trim().replace(/[;,.]$/, "").trim();
    if (morceau) out.set(r.n, morceau);
  });
  return out;
}

const UNITES: Readonly<Record<string, string>> = {
  mm: "mm",
  millimetre: "mm",
  millimetres: "mm",
  cm: "cm",
  centimetre: "cm",
  centimetres: "cm",
  m: "m",
  ml: "m",
  metre: "m",
  metres: "m",
  m2: "m2",
  "m²": "m2",
  "°": "°",
  degre: "°",
  degres: "°",
  "%": "%",
  pourcent: "%",
  kg: "kg",
};

const LONGUEURS: Readonly<Record<string, number>> = { mm: 1, cm: 10, m: 1000 };

function uniteDeQuestion(u: string | null): string | null {
  if (!u || u === "u") return null;
  return UNITES[norm(u)] ?? norm(u);
}

/** Les nombres d'un morceau avec l'unité écrite juste après (« 38° », « 25 cm », « 1,5 m »). */
function nombres(morceau: string): { valeur: number; unite: string | null }[] {
  const out: { valeur: number; unite: string | null }[] = [];
  for (const m of morceau.matchAll(/(\d+(?:[.,]\d+)?)\s*(°|%|m²|m2|mm|cm|ml|kg|m\b|millim[eè]tres?|centim[eè]tres?|m[eè]tres?|degr[eé]s?|pour ?cent)?/gi)) {
    const brut = m[2] ? norm(m[2]).replace(/\s/g, "") : null;
    out.push({ valeur: Number(m[1]!.replace(",", ".")), unite: brut ? (UNITES[brut] ?? brut) : null });
  }
  return out;
}

const affiche = (v: number) => String(Math.round(v * 1000) / 1000).replace(".", ",");
const libelleUnite = (u: string | null) => (!u ? "" : u === "°" ? "°" : ` ${u === "m2" ? "m²" : u}`);

/** Une valeur chiffrée : un seul nombre, dans l'unité de la question (cm, mm et m convertis exactement). */
function valeurChiffree(q: QuestionNumerotee, morceau: string): Omit<ReponseInterpretee, "numero" | "cle"> {
  const ns = nombres(morceau);
  const u = uniteDeQuestion(q.unite);
  if (ns.length === 0) return { statut: "ambigu", valeur: null, libelle: null, libreEcrite: false, raison: "Je n'ai pas trouvé de valeur chiffrée dans ta réponse." };
  if (ns.length > 1 && new Set(ns.map((n) => n.valeur)).size > 1) return { statut: "ambigu", valeur: null, libelle: null, libreEcrite: false, raison: "Ta réponse contient plusieurs valeurs : laquelle je retiens ?" };
  const n = ns[0]!;
  let valeur = n.valeur;
  if (n.unite && u && n.unite !== u) {
    const de = LONGUEURS[n.unite];
    const vers = LONGUEURS[u];
    if (de === undefined || vers === undefined) {
      const attendue = u === "°" ? "en degrés" : `en ${libelleUnite(u).trim()}`;
      return { statut: "ambigu", valeur: null, libelle: null, libreEcrite: false, raison: `L'unité ne va pas : j'attends une valeur ${attendue}.` };
    }
    valeur = (n.valeur * de) / vers;
  }
  if (!(valeur > 0)) return { statut: "ambigu", valeur: null, libelle: null, libreEcrite: false, raison: "La valeur doit être plus grande que zéro." };
  return { statut: "compris", valeur: String(Math.round(valeur * 1000) / 1000), libelle: `${affiche(valeur)}${libelleUnite(u)}`, libreEcrite: true, raison: null };
}

const contient = (texte: string, mot: string) => {
  const m = norm(mot);
  if (!m) return false;
  return new RegExp(`(?:^|[^a-z0-9])${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`).test(texte);
};

/** Les boutons nommés par le morceau : libellé entier, valeur, nombre seul, ou libellé sans sa parenthèse. */
function boutonsNommes(q: QuestionNumerotee, morceau: string): { label: string; value: string }[] {
  const t = norm(morceau);
  const exacts = q.options.filter((o) => norm(o.label) === t || norm(o.value) === t);
  if (exacts.length) return exacts;
  const parLibelle = q.options.filter((o) => contient(t, o.label) || contient(t, o.label.replace(/\s*\(.*?\)\s*/g, " ")));
  if (parLibelle.length) {
    // « Je façonne (bobine) » et « Je façonne » : le plus long libellé dit l'emporte.
    const plusLong = Math.max(...parLibelle.map((o) => norm(o.label).length));
    const meilleurs = parLibelle.filter((o) => norm(o.label).length === plusLong || !parLibelle.some((p) => p !== o && contient(norm(p.label), o.label)));
    return meilleurs;
  }
  const chiffres = nombres(morceau);
  if (chiffres.length === 1) {
    const n = chiffres[0]!;
    const u = uniteDeQuestion(q.unite);
    const de = n.unite ? LONGUEURS[n.unite] : undefined;
    const vers = u ? LONGUEURS[u] : undefined;
    const v = de !== undefined && vers !== undefined ? (n.valeur * de) / vers : n.valeur;
    const parNombre = q.options.filter((o) => /^\d+(?:[.,]\d+)?$/.test(o.value) && Number(o.value.replace(",", ".")) === v);
    if (parNombre.length) return parNombre;
  }
  // Les mots propres à un seul bouton (« bobine », « façonné »), jamais un mot commun à tous.
  const motsDe = (o: { label: string }) => norm(o.label.replace(/[()]/g, " ")).split(" ").filter((m) => m.length >= 4);
  const propres = q.options.filter((o) => motsDe(o).some((m) => contient(t, m) && q.options.filter((p) => motsDe(p).includes(m)).length === 1));
  return propres;
}

function interpreterUne(q: QuestionNumerotee, morceau: string | undefined): ReponseInterpretee {
  const base = { numero: q.numero, cle: q.cle };
  if (!morceau || !morceau.trim()) return { ...base, statut: "sans_reponse", valeur: null, libelle: null, libreEcrite: false, raison: null };
  const t = norm(morceau);
  if (NE_SAIT_PAS.test(t)) return { ...base, statut: "sans_reponse", valeur: null, libelle: null, libreEcrite: false, raison: "Tu ne sais pas encore : la ligne restera à vérifier dans ta liste." };
  // Une unité écrite qui ne va pas (« 35 % » pour une pente en degrés) : reposée avant tout bouton, jamais convertie en silence.
  const u = uniteDeQuestion(q.unite);
  const ecrites = nombres(morceau).filter((n) => n.unite && u && n.unite !== u && (LONGUEURS[n.unite] === undefined || LONGUEURS[u] === undefined));
  if (ecrites.length > 0) return { ...base, ...valeurChiffree(q, morceau) };
  if (q.options.length > 0) {
    const nommes = boutonsNommes(q, morceau);
    const uniques = [...new Map(nommes.map((o) => [o.value, o])).values()];
    if (uniques.length === 1) return { ...base, statut: "compris", valeur: uniques[0]!.value, libelle: uniques[0]!.label, libreEcrite: false, raison: null };
    if (uniques.length > 1) return { ...base, statut: "ambigu", valeur: null, libelle: null, libreEcrite: false, raison: `J'hésite entre ${uniques.map((o) => `« ${o.label} »`).join(" et ")}.` };
  }
  if (q.libre === "number" || (q.numerique && q.options.length === 0)) return { ...base, ...valeurChiffree(q, morceau) };
  if (q.libre === "text" || q.libre === "written") {
    const ecrit = morceau.trim();
    if (ecrit.length < 2) return { ...base, statut: "ambigu", valeur: null, libelle: null, libreEcrite: false, raison: "Ta réponse est trop courte : précise-la." };
    if (ecrit.length > LONGUEUR_MAX_ECRITE) return { ...base, statut: "ambigu", valeur: null, libelle: null, libreEcrite: false, raison: `Réponse trop longue : ${LONGUEUR_MAX_ECRITE} caractères au plus.` };
    return { ...base, statut: "compris", valeur: ecrit, libelle: ecrit, libreEcrite: true, raison: null };
  }
  return { ...base, statut: "ambigu", valeur: null, libelle: null, libreEcrite: false, raison: q.options.length ? `Je n'ai pas reconnu ta réponse : ${q.options.map((o) => `« ${o.label} »`).join(", ")} ?` : "Je n'ai pas reconnu ta réponse." };
}

/**
 * Relie la réponse libre de l'artisan aux questions posées. Avec des numéros : chaque morceau à sa question. Sans numéro et
 * une seule question : tout le texte. Sans numéro et plusieurs questions : une ligne par question dans l'ordre quand le
 * nombre de lignes est celui des questions, sinon chaque morceau va à la SEULE question dont il nomme un bouton.
 */
export function interpreterReponsesNumerotees(questions: readonly QuestionNumerotee[], texte: string): ReponseInterpretee[] {
  if (questions.length === 0) return [];
  const parNumero = morceauxNumerotes(texte, Math.max(...questions.map((q) => q.numero)));
  if (parNumero) return questions.map((q) => interpreterUne(q, parNumero.get(q.numero)));
  if (questions.length === 1) return [interpreterUne(questions[0]!, texte)];
  const lignes = texte.split(/\n|;/).map((l) => l.trim()).filter(Boolean);
  if (lignes.length === questions.length) return questions.map((q, i) => interpreterUne(q, lignes[i]));
  const morceaux = texte.split(/\n|;|,(?!\d)|\bet\b/).map((l) => l.trim()).filter(Boolean);
  const pris = new Map<number, string>();
  for (const m of morceaux) {
    const cibles = questions.filter((q) => q.options.length > 0 && boutonsNommes(q, m).length > 0);
    if (cibles.length === 1 && !pris.has(cibles[0]!.numero)) pris.set(cibles[0]!.numero, m);
  }
  return questions.map((q) => interpreterUne(q, pris.get(q.numero)));
}

/** Le message de l'assistant : les questions numérotées, en un seul message. */
export function messageDesQuestions(questions: readonly QuestionNumerotee[], relance = false): string {
  const tete = relance
    ? questions.length > 1
      ? "Il me manque encore ces réponses :"
      : "Il me manque encore une réponse :"
    : questions.length > 1
      ? `J'ai ${questions.length} questions pour finir ta liste. Réponds à tout en une fois, avec les numéros :`
      : "J'ai une question pour finir ta liste :";
  return [tete, ...questions.map((q) => `${q.numero}. ${q.texte}${q.options.length ? ` (${q.options.map((o) => o.label).join(", ")})` : ""}`)].join("\n");
}
