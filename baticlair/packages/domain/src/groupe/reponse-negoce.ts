/**
 * LA CARTE DE RÉPONSE D'UN NÉGOCE (Greg, 28 octobre 2026, point 8) : « Matériaux Atlantique t'a répondu · 28 oct. à
 * 8 h 31 », la première ligne de son message seulement, sans l'objet ni le texte cité, et « Ouvrir le devis (PDF) ».
 */
const CITATION = /^(>|-{2,}|_{3,}|Le .{3,120} a écrit|On .{3,120} wrote|De ?:|From ?:|Envoyé ?:|Sent ?:|Objet ?:|Subject ?:)/i;
const SALUTATION = /^(bonjour|bonsoir|salut|hello|madame|monsieur|mesdames|messieurs)\b[^a-zà-ÿ0-9]*$/i;

/** La première ligne utile d'un e-mail reçu : avant le texte cité, sans une salutation seule ; 140 caractères au plus. */
export function premiereLigneDuMessage(texte: string | null | undefined): string | null {
  if (!texte) return null;
  const lignes: string[] = [];
  for (const brute of texte.replace(/\r/g, "").split("\n")) {
    const l = brute.trim();
    if (CITATION.test(l)) break;
    if (l) lignes.push(l);
  }
  const utile = lignes.find((l) => !SALUTATION.test(l)) ?? lignes[0];
  if (!utile) return null;
  return utile.length > 140 ? `${utile.slice(0, 139).trimEnd()}…` : utile;
}

/** « 28 oct. à 8 h 31 » (heure de Paris). */
export function dateHeureCourte(d: Date): string {
  const jour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(d);
  const [h, m] = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: "Europe/Paris" }).format(d).split(":");
  return `${jour} à ${Number(h)} h ${m}`;
}
