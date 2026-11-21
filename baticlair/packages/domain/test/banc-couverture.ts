import { readdirSync, readFileSync } from "node:fs";
import { ecranDeLecture, normalizeText, parseLecture, ROOFING_REFERENTIAL, type EngineAnswer } from "../src/index.js";

/**
 * LE BANC DU CALCUL DE LA COUVERTURE (Greg, 21 novembre 2026) : 15 chantiers dont on connaît la réponse, rejoués par le
 * moteur SEUL, sans IA, en quelques secondes. Pour chacun : la lecture parfaite du devis, les réponses du couvreur (par clé
 * de question) et la liste juste. La liste juste est celle du contrôleur (recalcul à la main d'après la fiche métier),
 * corrigée par l'arbitre, puis par les règles du fondateur, qui passent avant : un article non dit ne s'ajoute jamais
 * d'office, il va en Suggestions (la naissance de gouttière).
 * Objectif : 95 % de lignes justes. Aucune correction du moteur ne doit faire baisser une ligne déjà juste.
 */
export interface LigneAttendue {
  article: string;
  /** Les mots que le libellé du moteur doit contenir (« a|b » : l'un ou l'autre ; « !a » : absent). */
  mots: string[];
  /** null : la ligne doit rester « à chiffrer » (le couvreur ne sait pas, ou la fiche ne permet pas de compter). */
  quantite: number | null;
  /** n (un compte : pièces, longueurs, feuilles, tubes…), ml, m2, rl (rouleaux), bt (boîtes), sac. */
  unite: string;
  /** Des lignes d'un même groupe peuvent sortir en une seule ligne du moteur, quantités additionnées. */
  groupe?: string;
  /** L'article sort en plusieurs lignes du moteur, toutes à la même quantité (une sortie de toit : son embase et son chapeau). */
  ensemble?: boolean;
  /** Une ligne que les sources ne tranchent pas : hors du score, dite au fondateur. */
  incertain?: string;
}
export interface Chantier {
  id: string;
  jeu: "entrainement" | "examen";
  lecture: unknown;
  reponses: Record<string, { bouton?: string; valeur?: string; unite?: string; ne_sait_pas?: boolean }>;
  attendu: LigneAttendue[];
  suggestions: string[];
}
export type Classe = "juste" | "quantite" | "manquante" | "incertain";
export interface Note {
  id: string;
  jeu: string;
  lignes: { article: string; classe: Classe; attendu: string; obtenu: string }[];
  enTrop: string[];
  /** Les lignes « à chiffrer » sans question qui les débloque (règle du fondateur : il en faut zéro). */
  sansQuestion: string[];
  questions: string[];
  sansReponse: string[];
  suggestionsManquantes: string[];
}

const DIR = new URL("./banc-couverture/", import.meta.url);
export const chantiers = (): Chantier[] =>
  readdirSync(DIR)
    .filter((f) => /^C\d+\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(new URL(f, DIR), "utf8")) as Chantier);

const mot = (s: string) => normalizeText(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).map((w) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w));
const contient = (label: string, mots: readonly string[]) => {
  const t = new Set(mot(label));
  return mots.every((m) => (m.startsWith("!") ? !mot(m.slice(1)).some((x) => t.has(x)) : m.split("|").some((a) => mot(a).every((x) => t.has(x)))));
};
/** L'unité de commande du moteur, ramenée à sa famille. */
const famille = (u: string | null | undefined): string => {
  const n = normalizeText(u ?? "");
  if (/^(ml|m)$/.test(n)) return "ml";
  if (/^m2|^m²/.test(n) || n === "m2") return "m2";
  if (/rouleau/.test(n)) return "rl";
  if (/boite/.test(n)) return "bt";
  if (/sac/.test(n)) return "sac";
  return "n";
};
const nombre = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(String(v).replace(/\s/g, "").replace(",", ".")));
const egal = (a: number, b: number, unite: string) => Math.abs(a - b) <= (unite === "ml" ? 0.6 : 0.001);

/** Rejoue un chantier : les questions du moteur reçoivent les réponses du couvreur, jusqu'à n'en plus avoir. */
export function rejouer(c: Chantier) {
  const lecture = parseLecture(c.lecture)!;
  const ref = ROOFING_REFERENTIAL;
  const answers: Record<string, EngineAnswer> = {};
  const posees: string[] = [];
  const sansReponse: string[] = [];
  let e = ecranDeLecture({ ref, lecture, answers, preferences: {} });
  for (let tour = 0; tour < 12; tour++) {
    const ouvertes = e.questions.filter((q) => !posees.includes(q.key));
    if (ouvertes.length === 0) break;
    for (const q of ouvertes) {
      posees.push(q.key);
      const r = c.reponses[q.key];
      if (!r) sansReponse.push(`${q.key} « ${q.text} »`);
      if (!r || r.ne_sait_pas) {
        answers[q.key] = null;
        continue;
      }
      const o = r.bouton ? q.options?.find((x) => normalizeText(x.label) === normalizeText(r.bouton!)) : undefined;
      const v = (r.valeur ?? r.bouton ?? "").replace(",", ".");
      const parNombre = /^-?\d+(\.\d+)?/.test(v) ? q.options?.find((x) => parseFloat(x.value) === parseFloat(v)) : undefined;
      const choix = o ?? parNombre;
      answers[q.key] = choix ? { value: choix.value, unit: q.unit ?? "u" } : /^-?\d+(\.\d+)?$/.test(v) ? { value: v, unit: r.unite || q.unit || "u" } : v;
    }
    e = ecranDeLecture({ ref, lecture, answers, preferences: {} });
  }
  return { ecran: e, posees, sansReponse };
}

/** Note un chantier : chaque ligne attendue contre la liste du moteur. */
export function noter(c: Chantier): Note {
  const { ecran: e, posees, sansReponse } = rejouer(c);
  const sorties = [
    // Une ligne qui attend encore la réponse à une question du calcul (le périmètre d'une cheminée que le couvreur ne sait pas)
    // est « à chiffrer avec sa question » : sa quantité n'est pas une commande.
    ...e.purchase.toBuy.map((b) => {
      const attend = (b.waitsOn ?? []).filter((k) => k.startsWith("param:"));
      return attend.length > 0
        ? { label: b.label, q: null as number | null, u: "", dit: `à chiffrer (attend ${attend.join(", ")})`, pris: false, aChiffrer: true, raison: `attend ${attend.join(", ")}`, justeAChiffrer: true }
        : { label: b.label, q: nombre(b.order?.count), u: famille(b.order?.unit), dit: b.quantity, pris: false, aChiffrer: false, raison: "", justeAChiffrer: false };
    }),
    ...e.purchase.toQuote.map((t) => ({ label: t.label, q: null as number | null, u: "", dit: "à chiffrer", pris: false, aChiffrer: true, raison: t.reason, justeAChiffrer: false })),
  ];
  const lignes: Note["lignes"] = [];
  const dit = (l: LigneAttendue) => (l.quantite === null ? "à chiffrer" : `${l.quantite} ${l.unite}`);
  const groupesFaits = new Set<string>();
  for (const l of c.attendu) {
    const classe = (k: Classe, obtenu: string) => lignes.push({ article: l.article, classe: l.incertain && k !== "juste" ? "incertain" : k, attendu: dit(l), obtenu });
    if (l.groupe && groupesFaits.has(l.groupe)) continue;
    const candidats = sorties.filter((s) => !s.pris && contient(s.label, l.mots));
    const juste = (s: (typeof sorties)[number], q: number | null, u: string) => (q === null ? s.aChiffrer : !s.aChiffrer && s.q !== null && s.u === u && egal(s.q, q, u));
    if (l.ensemble && candidats.length > 0 && candidats.every((x) => juste(x, l.quantite, l.unite))) {
      for (const x of candidats) x.pris = true;
      classe("juste", candidats.map((x) => `${x.label} : ${x.dit}`).join(" + "));
      continue;
    }
    let s = candidats.find((x) => juste(x, l.quantite, l.unite));
    if (!s && l.groupe) {
      // Le groupe en une seule ligne, quantités additionnées (« 8 feuilles » pour 6 + 1 + 1).
      const groupe = c.attendu.filter((x) => x.groupe === l.groupe);
      const somme = groupe.reduce((t, x) => t + (x.quantite ?? 0), 0);
      const un = candidats.find((x) => juste(x, somme, l.unite));
      if (un) {
        un.pris = true;
        groupesFaits.add(l.groupe);
        for (const g of groupe) lignes.push({ article: g.article, classe: "juste", attendu: dit(g), obtenu: `${un.label} : ${un.dit}` });
        continue;
      }
    }
    if (s) {
      s.pris = true;
      s.justeAChiffrer = s.aChiffrer;
      classe("juste", `${s.label} : ${s.dit}`);
      continue;
    }
    s = candidats[0];
    if (s) {
      s.pris = true;
      classe("quantite", `${s.label} : ${s.dit}`);
    } else classe("manquante", "absent");
  }
  const suggestions = e.suggestions.map((x) => x.label);
  return {
    id: c.id,
    jeu: c.jeu,
    lignes,
    enTrop: sorties.filter((s) => !s.pris).map((s) => `${s.label} : ${s.dit}`),
    // Toutes les questions ont reçu leur réponse : une ligne encore « à chiffrer » que la liste juste n'attend pas ainsi est
    // une ligne bloquée sans question qui la débloque.
    sansQuestion: sorties.filter((s) => s.aChiffrer && !s.justeAChiffrer).map((s) => `${s.label} (${s.raison})`),
    questions: posees,
    sansReponse,
    suggestionsManquantes: c.suggestions.filter((m) => !suggestions.some((x) => contient(x, [m]))),
  };
}

/** Le score d'un jeu de notes : lignes justes sur lignes attendues (les lignes incertaines hors du compte). */
export function score(notes: readonly Note[]) {
  const l = notes.flatMap((n) => n.lignes).filter((x) => x.classe !== "incertain");
  const justes = l.filter((x) => x.classe === "juste").length;
  return { justes, attendues: l.length, pourcent: l.length ? Math.round((1000 * justes) / l.length) / 10 : 0, enTrop: notes.reduce((t, n) => t + n.enTrop.length, 0), sansQuestion: notes.reduce((t, n) => t + n.sansQuestion.length, 0) };
}
