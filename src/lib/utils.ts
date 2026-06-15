/** Combine des classes Tailwind en ignorant les valeurs vides/false. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Formate un nombre en euros, sans décimales inutiles (ex: "1 234 €"). */
export function formatEuros(value: number) {
  const rounded = Math.round(value * 100) / 100;
  const hasCents = Math.abs(rounded % 1) > 0.001;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded) + " €";
}

/** Formate une date au format court français (ex: "14 juin 2026"). */
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

interface NegotiationMailtoInput {
  fournisseur: string;
  produit: string;
  prixActuel: number;
  prixCible: number;
  email?: string;
}

/**
 * Construit un lien `mailto:` pré-rempli pour demander à un fournisseur de
 * s'aligner sur le meilleur prix trouvé lors d'une comparaison (bonus §8).
 */
export function buildNegotiationMailto({ fournisseur, produit, prixActuel, prixCible, email }: NegotiationMailtoInput) {
  const subject = `Alignement de prix — ${produit}`;
  const body = [
    `Bonjour${fournisseur ? ` ${fournisseur}` : ""},`,
    "",
    `J'ai reçu une offre à ${formatEuros(prixCible)} pour "${produit}", contre ${formatEuros(prixActuel)} dans votre devis.`,
    "Seriez-vous en mesure de vous aligner sur ce prix ?",
    "",
    "Merci d'avance,",
  ].join("\n");

  return `mailto:${email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
