/**
 * Erreur levée quand la réponse de l'IA ne contient pas de JSON exploitable.
 * On l'attrape dans les routes API pour renvoyer un message clair à l'artisan.
 */
export class AiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiParseError";
  }
}

/**
 * Parse de façon défensive le JSON renvoyé par l'IA (cf. cahier des charges §9) :
 * - retire d'éventuels ```json ... ``` autour de la réponse,
 * - isole le premier `{`/`[` et le dernier `}`/`]`,
 * - lève une AiParseError claire en cas d'échec (jamais de crash).
 */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, "```").replaceAll("```", "").trim();

  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");

  if (firstObj === -1 && firstArr === -1) {
    throw new AiParseError("L'IA n'a renvoyé aucun résultat exploitable.");
  }

  const isObject =
    firstObj !== -1 && (firstArr === -1 || firstObj < firstArr);
  const start = isObject ? firstObj : firstArr;
  const end = cleaned.lastIndexOf(isObject ? "}" : "]");

  if (end === -1 || end < start) {
    throw new AiParseError("La réponse de l'IA est incomplète.");
  }

  const jsonSlice = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(jsonSlice) as T;
  } catch {
    throw new AiParseError("La réponse de l'IA n'est pas un JSON valide.");
  }
}
