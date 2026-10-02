import { normalizeText } from "../trades/trade-profile.js";

/**
 * JOURNAL DES CORRECTIONS : chaque geste de l'artisan sur ce que BatiClair a
 * proposé est AJOUTÉ (jamais réécrit), avec l'avant et l'après. Il sert à
 * comprendre pourquoi BatiClair s'est trompé ; il ne modifie JAMAIS le
 * référentiel général. Une erreur générale passe par : signal → recherche de
 * la cause → source → validation → règle → test permanent.
 */
export type CorrectionAction =
  /** Ligne modifiée (désignation, quantité, unité, référence). */
  | "edit"
  /** Ligne retirée de la liste. */
  | "delete"
  /** Ligne ajoutée par l'artisan (BatiClair l'avait manquée). */
  | "add"
  /** « C'est bon » : la proposition était juste (signal positif). */
  | "confirm"
  /** Réponse à une question de BatiClair (produit, donnée de chantier). */
  | "answer"
  /** Préférence de l'entreprise réglée, remplacée ou abandonnée. */
  | "preference";

export type CorrectionCause =
  /** Quantité, unité ou désignation mal lue dans le document. */
  | "reading"
  /** Mot inconnu de BatiClair pour un article pourtant courant. */
  | "unknown_synonym"
  /** Mauvaise nature ou famille d'ouvrage (matériau / prestation / famille). */
  | "work_item"
  /** Mauvais produit identifié. */
  | "product"
  /** Une donnée du chantier manquait. */
  | "site_data"
  /** Choix propre à l'entreprise, pas une erreur. */
  | "company_preference"
  /** Règle de calcul incorrecte ou incomplète. */
  | "rule"
  /** Ligne qui n'était pas à commander (prestation, information, fourni par un autre lot). */
  | "not_to_order"
  /** Ligne absente de la proposition. */
  | "missed_line";

/** Ce que BatiClair avait compris d'une ligne (ou ce que l'artisan en a fait). */
export interface LineSnapshot {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
  /** Lecture de BatiClair au moment du geste : nature, famille, mesure d'ouvrage ou achat. */
  kind?: "material" | "labor" | "unknown";
  family?: string | null;
  basis?: "purchase" | "work";
  /** État ✓ / ⚠ / ? montré à l'artisan. */
  state?: "verified" | "to_confirm" | "missing" | null;
}

export interface CorrectionInput {
  action: CorrectionAction;
  before: LineSnapshot | null;
  after: LineSnapshot | null;
  /** Raison choisie ou écrite par l'artisan, si elle existe. */
  reason?: string | null;
}

/**
 * Cause probable, déduite seulement de ce qui a changé (aucune devinette sur
 * l'intention de l'artisan). null quand le geste n'est pas une correction.
 */
export function classifyCorrection(c: CorrectionInput): CorrectionCause | null {
  if (c.action === "confirm") return null;
  if (c.action === "add") return "missed_line";
  if (c.action === "delete") return "not_to_order";
  if (c.action === "preference") return "company_preference";
  if (c.action === "answer") return c.after?.reference || c.after?.designation !== c.before?.designation ? "product" : "site_data";
  const b = c.before;
  const a = c.after;
  if (!b || !a) return null;
  const designationChanged = normalizeText(b.designation) !== normalizeText(a.designation);
  if (designationChanged && (b.kind === "unknown" || !b.family) && a.kind === "material" && a.family) return "unknown_synonym";
  if (a.kind !== undefined && (a.kind !== b.kind || a.family !== b.family)) return "work_item";
  if (designationChanged) return "reading";
  if (b.quantity !== a.quantity || b.unit !== a.unit) return "reading";
  if (b.reference !== a.reference) return "product";
  return null;
}

/** Hachage FNV-1a 32 bits (déterministe, sans dépendance) : une empreinte, pas un secret. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * EMPREINTE d'une correction pour l'apprentissage collectif, plus tard :
 * deux entreprises qui corrigent la même situation ont la même empreinte, et
 * on peut compter les ENTREPRISES DISTINCTES par empreinte sans lire leurs
 * données. Elle ne contient ni texte du devis, ni quantité, ni prix, ni
 * identifiant d'entreprise : seulement la cause, les familles et une forme
 * hachée des premiers mots de la désignation.
 */
export function correctionPattern(c: CorrectionInput, cause: CorrectionCause | null): string {
  // Les mots seulement (« 16 A » et « 16A » donnent la même forme) : chiffres et lettres isolées ignorés.
  const head = normalizeText(c.before?.designation ?? c.after?.designation ?? "")
    .replace(/[^a-z ]/g, " ")
    .split(" ")
    .filter((w) => w.length >= 2)
    .slice(0, 3)
    .join(" ");
  const shape = [c.action, cause ?? "-", c.before?.family ?? "-", c.after?.family ?? "-", c.before?.kind ?? "-", c.after?.kind ?? "-"].join("|");
  return `${shape}|${fnv1a(head)}`;
}
