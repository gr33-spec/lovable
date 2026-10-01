/**
 * Remarques de l'IA montrées à l'artisan : on écarte celles qui parlent de
 * sa mécanique interne (« sourceRefs est vide », « références [page:ligne] »),
 * incompréhensibles pour un couvreur. Appliqué à l'affichage, donc aussi aux
 * listes déjà préparées.
 */
const TECHNICAL = new RegExp(
  [
    "sourceRefs|sourcePages|\\[page:ligne\\]|\\bJSON\\b|\\bschema\\b|\\bnull\\b",
    "champ\\s+(doubt|notes|designation|quantity|unit|reference)\\b",
    // Façon dont l'IA a lu le document : sans intérêt pour l'artisan.
    "num[ée]rot[ée]e?s?|r[ée]f[ée]rences?\\s+de\\s+ligne|lues?\\s+(en|sur|à\\s+partir\\s+de\\s+l['’])\\s*image|texte\\s+(n['’]?[ée]tait\\s+)?(non\\s+)?disponible",
  ].join("|"),
  "i",
);

export function artisanNotes(notes: readonly string[]): string[] {
  return notes.map((n) => n.trim()).filter((n) => n.length > 0 && !TECHNICAL.test(n));
}
