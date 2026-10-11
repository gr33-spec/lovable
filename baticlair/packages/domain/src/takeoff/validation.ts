import type { ConfidenceLevel } from "../confidence/confidence.js";
import type { PackagingSpec } from "../quantity/quantity.js";
import type { UnitCode } from "../quantity/unit.js";
import { Decimal } from "../shared/decimal.js";

/**
 * La lecture d'un quantitatif, ligne par ligne : ce que chaque ligne du devis est (fourniture, main-d'œuvre), sa
 * quantité et son unité lues, et ce qui cloche. Depuis §51.5, c'est la lecture du modèle qui remplit ces fiches
 * (`validationDeLecture`, lecture/lecture.ts) : le code ne classe plus une ligne d'après ses mots. Ici restent les
 * types et la lecture d'un nombre écrit à la française.
 */

export interface TakeoffLineInput {
  id: string;
  designation: string;
  /** Quantité telle que lue (« 1 250 », « 12,5 ») ou nulle si absente. */
  quantityRaw: string | null;
  /** Unité telle que lue (« u », « m² », « rlx »). */
  unitRaw: string | null;
  reference?: string | null;
  /** Contenu du conditionnement, s'il est écrit dans le document. */
  packaging?: PackagingSpec | null;
  /**
   * Titres du devis au-dessus de la ligne, du plus général au plus précis
   * (« Appareillage Hager Essensya », « Logement T3 n°1 », « Cuisine ») : une
   * information globale (marque, lot, pièce) reste attachée aux lignes qu'elle couvre.
   */
  section?: readonly string[];
  /** Ligne issue du devis client (où « fourniture et pose en m² » est courant). */
  source?: "client_quote" | "supplier_quote" | "manual";
}

export type LineKind = "material" | "labor" | "unknown";

export type TakeoffIssueCode =
  | "QUANTITY_MISSING"
  | "QUANTITY_UNREADABLE"
  | "QUANTITY_NOT_POSITIVE"
  | "UNIT_MISSING"
  | "UNIT_FROM_TEXT"
  | "UNITS_ABSENT"
  | "MULTIPLIER_IN_DESIGNATION"
  | "UNIT_UNKNOWN"
  | "UNIT_UNUSUAL_FOR_FAMILY"
  | "FRACTIONAL_PIECES"
  | "WORK_QUANTITY"
  | "PACKAGE_CONTENT_MISSING"
  | "QUANTITY_UNUSUALLY_HIGH"
  | "FAMILY_UNKNOWN"
  | "LABOR_LINE"
  | "SOURCE_NOT_FOUND"
  | "QUANTITY_NOT_IN_SOURCE"
  | "READ_FROM_IMAGE"
  | "AI_DOUBT"
  | "AI_CALCULATION_NOTE"
  | "DUPLICATE_LINE"
  | "POSSIBLE_OMISSION"
  | "NO_MATERIAL";

export type IssueSeverity = "blocking" | "to_verify" | "info";

export interface TakeoffIssue {
  code: TakeoffIssueCode;
  severity: IssueSeverity;
  /** Message pour l'artisan, en français simple. */
  message: string;
  lineIds?: string[];
}

export interface LineValidation {
  lineId: string;
  kind: LineKind;
  family: string | null;
  familyLabel: string | null;
  unit: UnitCode | null;
  /** Quantité décimale exacte lue, si lisible. */
  quantity: Decimal | null;
  /**
   * « purchase » : la quantité se commande telle quelle. « work » : c'est la
   * surface de l'OUVRAGE (« liteaux 120 m² » = 120 m² de toiture liteautée),
   * pas une quantité d'achat : elle doit être convertie (référentiel métier),
   * jamais envoyée comme si c'était une quantité de matériau.
   */
  basis: "purchase" | "work";
  status: ConfidenceLevel;
  issues: TakeoffIssue[];
}

export interface TakeoffValidation {
  trade: string;
  lines: LineValidation[];
  /** Constats sur l'ensemble (doublons, oublis possibles). */
  issues: TakeoffIssue[];
  counts: { certain: number; probable: number; toVerify: number; labor: number; blocking: number };
}


/** « 1 250,50 » → 1250.50 ; null si la valeur n'est pas un nombre clair (jamais de devinette). */
export function parseFrenchQuantity(raw: string | null | undefined): Decimal | null {
  if (raw == null) return null;
  const compact = raw.trim().replace(/[\s  ]/g, "");
  if (!/^-?\d+(?:[.,]\d+)?$/.test(compact)) return null;
  return new Decimal(compact.replace(",", "."));
}

