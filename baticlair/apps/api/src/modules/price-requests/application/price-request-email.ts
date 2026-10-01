import { dimensionOf, keyCharacteristics, normalizeText, parseUnit, suppliedObject } from "@baticlair/domain";

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

/**
 * « 120 m² » ou, pour une mesure d'ouvrage, « pour une surface de 120 m² »
 * / « pour une longueur de 24 m » (quantité à calculer).
 */
export function requestedQuantityText(l: RequestedLine): string {
  const qty = [l.quantity, l.unit].filter(Boolean).join(" ");
  if (!qty) return "quantité à préciser";
  if (l.basis !== "work") return qty;
  const unit = parseUnit(l.unit);
  const measure = unit && dimensionOf(unit) === "length" ? "une longueur" : "une surface";
  return `pour ${measure} de ${qty} (quantité à calculer)`;
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

/** « (Fourniture & Pose) », « (F&P) », « (fourniture et pose) » au milieu d'un titre de devis client. */
const SUPPLY_MARK = /\s*\((?:fourniture\s*(?:&|et)\s*pose|f\.?\s*(?:&|et)\s*p\.?|fourniture\s+seule|fourniture)\)/gi;

const SUPPLY_PREFIX = /^(?:fourniture\s+et\s+pose|fourniture\s*&\s*pose|f\.?\s*(?:et|&)\s*p\.?|fourniture)\s+(?:(?:de\s+la|du|des|de)\s+|(?:de\s+l|d)['’]\s*)?/i;

/**
 * Ce que le fournisseur doit chiffrer, sans le jargon du devis client :
 * « Fourniture isolation murs 100mm - Fourniture de laine de verre »
 * devient « Isolation murs 100mm - laine de verre ».
 */
export function purchaseLabel(designation: string): string {
  const parts = designation
    .replace(SUPPLY_MARK, "")
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
 * Ligne envoyée au fournisseur : intitulé court, mais SANS PERTE. On garde le
 * titre de l'ouvrage, l'objet réellement fourni s'il n'est pas déjà dans le
 * titre (« Faîtage » → « faîtières ventilées »), puis toute caractéristique
 * qui peut changer le produit, la quantité ou le prix (HPV, rouge, sable,
 * Ø80, hauteur 4 m, « crochets et naissances compris »…), une seule fois.
 * La phrase de pose du devis client (« pour la création de la lame d'air »)
 * disparaît, elle n'apprend rien au fournisseur.
 */
export function supplierLineLabel(designation: string): string {
  const [titlePart, ...rest] = designation.split(/\s[-–—]\s/);
  const title = purchaseLabel(titlePart ?? designation);
  const description = rest.join(" - ");
  // « 27x40 » et « 27×40 » s'écrivent pareil ici.
  const norm = (t: string) => normalizeText(t.replace(/×/g, "x"));
  const has = (text: string, piece: string) => {
    const words = norm(piece).split(" ").filter((w) => w.length > 2 || /\d/.test(w));
    const hay = norm(text);
    return words.length > 0 && words.every((w) => hay.includes(w.replace(/s$/, "")));
  };
  const extras: string[] = [];
  const object = description ? suppliedObject(description) : null;
  if (object && !has(title, object)) extras.push(object);
  for (const c of keyCharacteristics(designation)) {
    if (!has(`${title} ${extras.join(" ")}`, c)) extras.push(c);
  }
  return extras.length > 0 ? `${title} (${extras.join(", ")})` : title;
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
    return `- ${supplierLineLabel(l.designation)}${ref} : ${requestedQuantityText(l)}`;
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
