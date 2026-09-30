export interface RequestedLine {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
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
    const qty = [l.quantity, l.unit].filter(Boolean).join(" ") || "quantité à préciser";
    const ref = l.reference ? ` (réf. ${l.reference})` : "";
    return `- ${l.designation}${ref} : ${qty}`;
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
