/**
 * PARCOURS §48, ÉTAPE 2 : le chantier naît du seul dépôt du PDF, sous un nom d'attente ; la lecture lui donne le nom du
 * client lu dans le devis (« Chantier Dupont »), sinon celui de la commune, renommable d'un tap. Un nom donné par
 * l'artisan n'est jamais remplacé.
 */
export const NEW_PROJECT_NAME = "Nouveau chantier";

const CIVILITY = /^(?:(?:monsieur|mr\.?|m\.?)\s+et\s+(?:madame|mme\.?)|monsieur\s+ou\s+madame|monsieur|madame|mademoiselle|mme\.?|mlle\.?|mr\.?|m\.|famille|ste|sté|société)\s+/i;

/** « M. et Mme DUPONT Jean » → « Dupont Jean » ; « SCI LES PINS » → « SCI Les Pins ». */
function tidy(raw: string): string {
  const one = raw.split(/[\n,;(]/)[0]!.replace(/\s+/g, " ").trim();
  const bare = one.replace(CIVILITY, "").replace(CIVILITY, "").trim() || one;
  return bare
    .split(" ")
    .map((w) => (/^[A-ZÀ-Ý'’-]{2,}$/.test(w) && !/^(SCI|SARL|SAS|SASU|EURL|SA)$/.test(w) ? w.charAt(0) + w.slice(1).toLowerCase() : w))
    .join(" ")
    .slice(0, 60)
    .trim();
}

export function siteNameFromQuote(read: { client: string | null; commune: string | null }): string | null {
  const client = read.client ? tidy(read.client) : "";
  if (client.length >= 2) return `Chantier ${client}`;
  if (read.commune && read.commune.trim().length >= 2) return `Chantier ${read.commune.trim()}`;
  return null;
}
