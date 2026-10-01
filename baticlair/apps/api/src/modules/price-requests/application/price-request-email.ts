export interface RequestedLine {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
  /**
   * « work » : la quantité est la surface de l'ouvrage (« liteaux 120 m² »),
   * pas une quantité d'achat. Elle est demandée comme telle au fournisseur.
   */
  basis?: "work";
}

/** « 120 m² » ou, pour une surface d'ouvrage, « pour une surface de 120 m² (quantité à calculer) ». */
export function requestedQuantityText(l: RequestedLine): string {
  const qty = [l.quantity, l.unit].filter(Boolean).join(" ");
  if (!qty) return "quantité à préciser";
  return l.basis === "work" ? `pour une surface de ${qty} (quantité à calculer)` : qty;
}

export interface EmailInput {
  companyName: string;
  senderName: string;
  projectName: string;
  projectAddress: string | null;
  supplierName: string;
  contactName: string | null;
  lines: readonly RequestedLine[];
  message: string | null;
  dueDate: Date | null;
}

const dateFr = (d: Date) =>
  d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

const SUPPLY_PREFIX = /^(?:fourniture\s+et\s+pose|fourniture\s*&\s*pose|f\.?\s*(?:et|&)\s*p\.?|fourniture)\s+(?:(?:de\s+la|du|des|de)\s+|(?:de\s+l|d)['’]\s*)?/i;

/**
 * Ce que le fournisseur doit chiffrer, sans le jargon du devis client :
 * « Fourniture isolation murs 100mm - Fourniture de laine de verre »
 * devient « Isolation murs 100mm - laine de verre ».
 */
export function purchaseLabel(designation: string): string {
  const parts = designation
    .split(/\s[-–—]\s/)
    .map((part) => {
      const stripped = part.trim().replace(SUPPLY_PREFIX, "");
      return stripped.length >= 2 ? stripped : part.trim();
    })
    .filter((part) => part.length > 0 && !/^fourniture$/i.test(part));
  const label = parts.join(" - ") || designation.trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * E-mail de demande de prix, en texte simple : lisible dans toutes les
 * messageries et copiable tel quel. Aucune donnée n'est inventée : seules
 * les lignes validées par l'artisan y figurent.
 */
export function priceRequestEmail(input: EmailInput): {
  subject: string;
  body: string;
} {
  const subject = `Demande de prix – ${input.projectName} – ${input.companyName}`;
  const hello = input.contactName ? `Bonjour ${input.contactName},` : "Bonjour,";
  const lines = input.lines.map((l) => {
    const ref = l.reference ? ` (réf. ${l.reference})` : "";
    return `- ${purchaseLabel(l.designation)}${ref} : ${requestedQuantityText(l)}`;
  });
  const body = [
    hello,
    "",
    `Pourriez-vous me faire une offre de prix pour le chantier « ${input.projectName} »${input.projectAddress ? ` (${input.projectAddress})` : ""} :`,
    "",
    ...lines,
    "",
    ...(input.message ? [input.message, ""] : []),
    "Merci d'indiquer pour chaque ligne le prix unitaire HT, la remise éventuelle, le conditionnement et le délai de livraison.",
    ...(input.dueDate ? [`Une réponse avant le ${dateFr(input.dueDate)} serait idéale.`] : []),
    "",
    "Cordialement,",
    input.senderName,
    input.companyName,
  ].join("\n");
  return { subject, body };
}
