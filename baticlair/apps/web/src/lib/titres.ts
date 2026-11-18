/**
 * TITRES COURTS (Greg, 19 novembre 2026) : « Liste du 18 nov. », jamais « Liste du 18 novembl » coupé en plein mot.
 * Le mois s'abrège à l'écran (le nom enregistré ne change pas) ; un titre trop long se coupe à la fin d'un mot, avec « … ».
 */
const MOIS: Record<string, string> = {
  janvier: "janv.",
  février: "févr.",
  mars: "mars",
  avril: "avr.",
  mai: "mai",
  juin: "juin",
  juillet: "juil.",
  août: "août",
  septembre: "sept.",
  octobre: "oct.",
  novembre: "nov.",
  décembre: "déc.",
};

/** « Liste du 18 novembre » → « Liste du 18 nov. » ; tout autre texte reste tel quel. */
export function moisAbrege(texte: string): string {
  return texte.replace(/\b(1er|\d{1,2}) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/g, (_, j: string, m: string) => `${j} ${MOIS[m]}`);
}

/** Coupe à la fin d'un mot, avec « … », au-delà de `max` caractères ; jamais au milieu d'un mot. */
export function coupeAuMot(texte: string, max: number): string {
  const t = texte.trim();
  if (t.length <= max) return t;
  const avant = t.slice(0, max - 1);
  const espace = avant.lastIndexOf(" ");
  return `${(espace > max / 2 ? avant.slice(0, espace) : avant).replace(/[\s·,;:–-]+$/, "")}…`;
}

/** Le titre d'une liste à l'écran : mois abrégé, coupé proprement. */
export const titreCourt = (nom: string, max = 40): string => coupeAuMot(moisAbrege(nom), max);
