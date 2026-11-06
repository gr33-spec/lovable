import type { QuestionNumerotee, ReponseInterpretee } from "./reponses-libres-numerotees.js";

/**
 * L'INTERPRÉTATION DES RÉPONSES LIBRES PAR L'IA (Greg, 6 novembre 2026, prompt maître point 3 et point 15 ; lot 7).
 * Le CODE lit d'abord la réponse (`interpreterReponsesNumerotees`, zéro coût). L'IA n'intervient qu'en second, seulement
 * pour les questions que le code laisse ambiguës ou sans réponse, et seulement si l'interrupteur est allumé. Ce qu'elle
 * rend est REVALIDÉ ICI, en code, avant toute utilisation :
 *  - une question inconnue est ignorée ;
 *  - un choix doit être la valeur d'un bouton de la question ;
 *  - un nombre doit être un nombre, sur une question chiffrée, dans son unité (jamais converti en silence) ;
 *  - un texte écrit doit se lire DANS la réponse de l'artisan (l'IA rattache, elle n'invente jamais) ;
 *  - ce qui ne passe pas reste « à reposer ».
 * Ce que le code a compris n'est jamais remplacé par l'IA.
 */

export const INTERPRETATION_PROMPT = { id: "interpretation_reponses", version: 1 } as const;

/** La consigne système (envoyée telle quelle ; testée). Pas de raisonnement rendu, seulement le rattachement. */
export const INTERPRETATION_SYSTEM = [
  "Tu aides un artisan du bâtiment qui a répondu en une seule fois, à l'écrit ou à la voix, à des questions numérotées sur sa liste de matériaux.",
  "Ta seule tâche : rattacher chaque morceau de sa réponse à la question qu'il concerne.",
  "Règles absolues :",
  "- N'invente jamais une quantité, une dimension, une qualité, une référence ou une compatibilité. Ce que l'artisan n'a pas dit reste sans réponse.",
  "- Pour une question à boutons, rends la VALEUR exacte d'un bouton, ou rien.",
  "- Pour une question chiffrée, rends le nombre que l'artisan a dit, sans conversion d'unité.",
  "- Pour une réponse écrite (modèle, teinte, précision), recopie les mots de l'artisan, sans les compléter.",
  "- Si tu hésites entre deux choix, ou si l'artisan dit qu'il ne sait pas, marque la question « ambigu » ou « sans_reponse ».",
  "Réponds seulement avec le JSON demandé, sans explication.",
].join("\n");

export interface InterpretationWire {
  reponses: { numero: number; statut: "compris" | "ambigu" | "sans_reponse"; valeur: string }[];
}

/** Le schéma JSON de la sortie (aucun champ « valeur ou vide » : une valeur vide est la chaîne vide). */
export const interpretationWireSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reponses"],
  properties: {
    reponses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["numero", "statut", "valeur"],
        properties: { numero: { type: "integer" }, statut: { type: "string", enum: ["compris", "ambigu", "sans_reponse"] }, valeur: { type: "string" } },
      },
    },
  },
} as const;

/** Le message envoyé au modèle : les questions (numéro, texte, boutons ou unité), puis la réponse de l'artisan. */
export function interpretationDossier(questions: readonly QuestionNumerotee[], texte: string): string {
  const qs = questions.map((q) => {
    const boutons = q.options.length ? ` Boutons (valeur = libellé) : ${q.options.map((o) => `${o.value} = ${o.label}`).join(" ; ")}.` : "";
    const nature = q.numerique ? ` Valeur chiffrée${q.unite ? ` en ${q.unite}` : ""}.` : q.libre ? " Réponse écrite possible." : "";
    return `${q.numero}. ${q.texte}${boutons}${nature}`;
  });
  return ["QUESTIONS", ...qs, "", "RÉPONSE DE L'ARTISAN", texte.slice(0, 2000)].join("\n");
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9,.]+/g, " ")
    .trim();

/** Revalide la sortie du modèle : seul ce qui passe les règles du code devient une réponse. */
export function validerInterpretation(questions: readonly QuestionNumerotee[], texte: string, wire: InterpretationWire): ReponseInterpretee[] {
  const dit = ` ${norm(texte)} `;
  const out: ReponseInterpretee[] = [];
  for (const q of questions) {
    const r = wire.reponses.find((x) => x.numero === q.numero);
    const base = { numero: q.numero, cle: q.cle, libreEcrite: false };
    const reposer = (raison: string | null, statut: "ambigu" | "sans_reponse" = "ambigu"): ReponseInterpretee => ({ ...base, statut, valeur: null, libelle: null, raison });
    if (!r || r.statut !== "compris" || !r.valeur.trim()) {
      out.push(reposer(r?.statut === "ambigu" ? "Je n'ai pas compris ta réponse à cette question." : null, r?.statut === "ambigu" ? "ambigu" : "sans_reponse"));
      continue;
    }
    const v = r.valeur.trim();
    const bouton = q.options.find((o) => o.value === v);
    if (bouton) {
      out.push({ ...base, statut: "compris", valeur: bouton.value, libelle: bouton.label, raison: null });
      continue;
    }
    if (q.numerique || q.libre === "number") {
      const n = Number(v.replace(",", "."));
      // Le nombre doit avoir été dit par l'artisan (aucun chiffre inventé ni converti).
      const nombresDits = (texte.match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => Number(x.replace(",", ".")));
      if (Number.isFinite(n) && n > 0 && nombresDits.includes(n)) {
        out.push({ ...base, statut: "compris", valeur: String(n), libelle: `${String(n).replace(".", ",")}${q.unite ? ` ${q.unite}` : ""}`, libreEcrite: true, raison: null });
      } else out.push(reposer("Je n'ai pas trouvé ce nombre dans ta réponse : redis-le."));
      continue;
    }
    if (q.libre === "text" || q.libre === "written") {
      if (v.length <= 300 && norm(v).length >= 2 && dit.includes(` ${norm(v)} `)) out.push({ ...base, statut: "compris", valeur: v, libelle: v, libreEcrite: true, raison: null });
      else out.push(reposer("Redis-le avec tes mots : je ne veux rien compléter à ta place."));
      continue;
    }
    out.push(reposer("Choisis un des boutons."));
  }
  return out;
}

/** Ce que le code a compris l'emporte ; l'IA ne complète que les questions restées ambiguës ou sans réponse. */
export function fusionnerInterpretations(code: readonly ReponseInterpretee[], ia: readonly ReponseInterpretee[]): ReponseInterpretee[] {
  return code.map((c) => (c.statut === "compris" ? c : (ia.find((x) => x.numero === c.numero && x.statut === "compris") ?? c)));
}

/** Les questions à confier à l'IA : celles que le code n'a pas comprises, quand l'artisan a écrit quelque chose. */
export function questionsPourIa(questions: readonly QuestionNumerotee[], code: readonly ReponseInterpretee[], texte: string): QuestionNumerotee[] {
  if (texte.trim().length < 2) return [];
  return questions.filter((q) => code.find((c) => c.numero === q.numero)?.statut !== "compris");
}

/**
 * Le coût estimé d'une interprétation (pour le dire à Greg AVANT d'allumer) : environ 600 jetons de consigne, 60 par
 * question, la réponse (≈ 1 jeton pour 3,5 caractères) ; 40 jetons de sortie par question. En jetons ; le prix vient de la
 * grille du domaine (`computeAiCost`).
 */
export function jetonsEstimes(nbQuestions: number, longueurTexte: number): { inputTokens: number; outputTokens: number } {
  return { inputTokens: Math.ceil(600 + 60 * nbQuestions + longueurTexte / 3.5), outputTokens: Math.ceil(20 + 40 * nbQuestions) };
}
