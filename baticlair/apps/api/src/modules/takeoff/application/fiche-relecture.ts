import { normalizeText, type FicheChantier, type FicheRelecture } from "@baticlair/domain";
import { z } from "zod";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";

/**
 * §51.2 (fondateur, 2026-10-10) : « Quand l'artisan répond par « Autre » avec un texte libre, l'IA réanalyse : elle met
 * la fiche à jour avec cette réponse, et si la réponse ouvre une nouvelle donnée manquante, elle pose une question de plus
 * avant de calculer. Une réponse « Autre » n'est jamais rangée dans une case sans être relue. »
 *
 * Un appel IA par réponse « Autre », en plus des deux appels du devis (§41) : c'est le §51.2 qui le demande.
 */
export const FICHE_RELECTURE_PROMPT = { id: "fiche_relecture", version: 1 } as const;

export const RULE_51_2 = `RÈGLE §51.2 DU RÉFÉRENTIEL (ajoutée par le fondateur le 10 octobre 2026) : les questions viennent des trous de la fiche.
Les questions ne viennent plus des lignes une par une mais des données manquantes de la fiche, et chaque donnée manquante donne une seule question. Autant de questions que le chantier en demande, sans maximum : dix ou quinze questions sur un gros chantier valent mieux qu'une heure à reprendre le quantitatif. Chaque question doit être une vraie question : une donnée absente du devis et nécessaire au calcul, jamais une donnée déjà lue ou déductible.
Quand l'artisan répond par « Autre » avec un texte libre, l'IA réanalyse : elle met la fiche à jour avec cette réponse, et si la réponse ouvre une nouvelle donnée manquante, elle pose une question de plus avant de calculer. Une réponse « Autre » n'est jamais rangée dans une case sans être relue.`;

export interface RelectureQuestion {
  key: string;
  text: string;
  options: { label: string; value: string }[];
  unit: string | null;
}

export interface RelectureInput {
  tradeLabel: string;
  fiche: FicheChantier;
  /** La question à laquelle l'artisan a répondu « Autre ». */
  question: RelectureQuestion;
  /** Ce qu'il a écrit. */
  texte: string;
  /** Les autres questions encore ouvertes : une réponse peut en régler plusieurs (« les bacs façonnés, les bandes je les plie »). */
  ouvertes: RelectureQuestion[];
}

/** Réponse de l'IA : aucun champ « valeur ou vide » (chaînes vides à la place). */
export const relectureWireSchema = z.object({
  fiche: z.array(z.object({ donnee: z.string(), valeur: z.string() })),
  reponses: z.array(z.object({ question: z.string(), valeur: z.string() })),
  manque: z.object({ donnee: z.string(), question: z.string() }),
});
export type RelectureWire = z.infer<typeof relectureWireSchema>;

export interface FicheRelecteur {
  readonly provider: string;
  relire(input: RelectureInput): Promise<ReadAttempt<RelectureWire>>;
}

export const FICHE_RELECTEUR = Symbol("FICHE_RELECTEUR");

export function relectureSystem(input: Pick<RelectureInput, "tradeLabel">): string {
  return `Tu es le lecteur de devis de BatiClair (métier de l'artisan : ${input.tradeLabel}). L'artisan vient de répondre à une question en écrivant sous « Autre ».

${RULE_51_2}

RÈGLE NUMÉRO UN : rien n'entre dans la fiche qui ne vienne du devis ou des réponses de l'artisan. Tu n'inventes aucune donnée, aucun article.

CE QUE TU RENVOIES (un seul objet JSON) :
- fiche : les données de la fiche que la réponse change ou ajoute, chacune {"donnee", "valeur"} : la valeur telle que l'artisan la dit, avec son unité. Liste vide si rien ne change.
- reponses : les questions que sa réponse règle, chacune {"question" : la clé de la question, "valeur" : la valeur d'UN de ses boutons, ou un nombre dans l'unité de la question}. Seulement ce que la réponse dit clairement ; une réponse peut régler plusieurs questions ouvertes. Liste vide si elle ne colle à aucun bouton.
- manque : si la réponse ouvre une donnée qui manque encore et sans laquelle on ne peut pas commander, {"donnee" : son nom court, "question" : la question à poser, courte, en tutoyant} ; sinon {"donnee": "", "question": ""}.`;
}

/** Le dossier donné à l'IA : la fiche, la question et ses boutons, ce que l'artisan a écrit, les autres questions. */
export function relectureDossier(input: RelectureInput): string {
  const q = (x: RelectureQuestion) => `- ${x.key} : « ${x.text} »${x.options.length > 0 ? ` boutons : ${x.options.map((o) => `${o.value} = ${o.label}`).join(" ; ")}` : ""}${x.unit && x.unit !== "u" ? ` (unité : ${x.unit})` : ""}`;
  return [
    "FICHE DE CHANTIER :",
    ...input.fiche.donnees.map((d) => `- ${d.libelle} : ${d.valeur ?? "manquante"} (${d.origine})`),
    "",
    "QUESTION :",
    q(input.question),
    "",
    `RÉPONSE DE L'ARTISAN SOUS « AUTRE » : « ${input.texte.replace(/[«»]/g, '"')} »`,
    "",
    "AUTRES QUESTIONS OUVERTES :",
    ...(input.ouvertes.length > 0 ? input.ouvertes.map(q) : ["- aucune"]),
  ].join("\n");
}

/**
 * La réponse de l'IA, relue par le code : une clé de question inconnue, une valeur hors des boutons ou un nombre sans
 * sens ne passent pas. La donnée écrite par l'artisan entre dans la fiche, origine « ta réponse ».
 */
export function decodeRelecture(wire: RelectureWire, input: RelectureInput): FicheRelecture {
  const all = [input.question, ...input.ouvertes];
  const reponses = wire.reponses.flatMap((r) => {
    const q = all.find((x) => x.key === r.question.trim());
    if (!q) return [];
    const v = r.valeur.trim().replace(",", ".");
    if (q.options.length > 0 && q.options.some((o) => o.value === v)) return [{ question: q.key, valeur: v, unite: q.unit }];
    if (/^\d+(?:\.\d+)?$/.test(v) && q.unit && q.unit !== "u" && q.options.every((o) => /^\d+(?:[.,]\d+)?$/.test(o.value))) return [{ question: q.key, valeur: v, unite: q.unit }];
    return [];
  });
  const donnees = wire.fiche
    .filter((d) => d.donnee.trim() && d.valeur.trim())
    .map((d) => ({ cle: normalizeText(d.donnee).replace(/\s+/g, "_"), libelle: d.donnee.trim().charAt(0).toUpperCase() + d.donnee.trim().slice(1), valeur: d.valeur.trim().slice(0, 120), origine: "reponse" as const, preuve: `Ta réponse : « ${input.texte.slice(0, 120)} »` }));
  const manque = wire.manque.donnee.trim() && wire.manque.question.trim() ? { donnee: wire.manque.donnee.trim().slice(0, 60), question: (wire.manque.question.trim().charAt(0).toUpperCase() + wire.manque.question.trim().slice(1)).slice(0, 160) } : null;
  return { donnees, reponses, manque };
}
