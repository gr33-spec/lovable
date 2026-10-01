import type { ConfidenceLevel } from "../confidence/confidence.js";
import type { PackagingSpec } from "../quantity/quantity.js";
import { dimensionOf, parseUnit, type UnitCode } from "../quantity/unit.js";
import { Decimal } from "../shared/decimal.js";
import { containsKeyword, keywordPosition, normalizeText, type MaterialFamily, type TradeProfile } from "../trades/trade-profile.js";

/**
 * Validation d'un quantitatif (liste de matériaux) selon le profil métier.
 *
 * Principe (PD-026) : le code ne corrige jamais une valeur. Il classe la
 * ligne, vérifie ce qui est vérifiable, et dit à l'artisan précisément ce
 * qu'il doit regarder. Une ligne n'est « certaine » que si rien ne cloche.
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
  /** Ligne issue du devis client (où « fourniture et pose en m² » est courant). */
  source?: "client_quote" | "supplier_quote" | "manual";
}

export type LineKind = "material" | "labor" | "unknown";

export type TakeoffIssueCode =
  | "QUANTITY_MISSING"
  | "QUANTITY_UNREADABLE"
  | "QUANTITY_NOT_POSITIVE"
  | "UNIT_MISSING"
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

const UNIT_LABEL: Partial<Record<UnitCode, string>> = {
  U: "pièces",
  M: "m",
  ML: "ml",
  M2: "m²",
  M3: "m³",
  KG: "kg",
  ROULEAU: "rouleaux",
  PAQUET: "paquets",
  BOTTE: "bottes",
  PALETTE: "palettes",
  BOITE: "boîtes",
  SAC: "sacs",
  POT: "pots",
  SEAU: "seaux",
  BIDON: "bidons",
  CARTON: "cartons",
  BARRE: "barres",
  COURONNE: "couronnes",
};
const unitLabel = (u: UnitCode) => UNIT_LABEL[u] ?? u.toLowerCase();

/**
 * Famille de la ligne : celle de son NOM D'OUVRAGE, c'est-à-dire le mot
 * reconnu le plus tôt dans le texte. Une description d'ouvrage énumère ses
 * composants (« Gouttière PVC… crochets et naissances compris »,
 * « Faîtage… avec closoir », « Sortie de toit… avec solin ») : ce ne sont
 * pas eux qui nomment la ligne. À position égale (« tuile de rive » /
 * « tuile »), l'ordre du référentiel départage (le plus précis d'abord).
 */
export function classifyMaterial(designation: string, profile: TradeProfile): MaterialFamily | null {
  const text = normalizeText(designation);
  let best: { family: MaterialFamily; position: number } | null = null;
  for (const family of profile.families) {
    if (family.excludes?.some((e) => containsKeyword(text, e))) continue;
    const positions = family.keywords.map((k) => keywordPosition(text, k)).filter((p) => p >= 0);
    if (positions.length === 0) continue;
    const position = Math.min(...positions);
    if (!best || position < best.position) best = { family, position };
  }
  return best?.family ?? null;
}

/**
 * Matériau, prestation ou inconnu. « Fourniture et pose de tuiles » est un
 * matériau (la fourniture est à commander) ; « Dépose de la couverture
 * existante » est une prestation.
 */
export function lineKind(designation: string, profile: TradeProfile): { kind: LineKind; family: MaterialFamily | null } {
  const text = normalizeText(designation);
  const family = classifyMaterial(designation, profile);
  const isSupply = profile.supplyKeywords.some((k) => containsKeyword(text, k));
  const isLabor = profile.laborKeywords.some((k) => containsKeyword(text, k));
  if (isLabor && !isSupply) return { kind: "labor", family: null };
  if (family) return { kind: "material", family };
  return { kind: "unknown", family: null };
}

/**
 * Mesure d'OUVRAGE plutôt que quantité d'achat : une surface de toiture
 * (tuiles, ardoises, liteaux, écran en m²) ou une longueur d'ouvrage
 * (faîtage, rives en m). Ailleurs (gouttière en m²…), c'est une anomalie.
 */
export function isWorkQuantity(family: MaterialFamily | null, unit: UnitCode | null): boolean {
  if (!family || !unit) return false;
  if (dimensionOf(unit) === "area") return family.areaNeedsYield === true || family.areaOfWork === true;
  if (dimensionOf(unit) === "length") return family.lengthOfWork === true;
  return false;
}

/** « 1 250,50 » → 1250.50 ; null si la valeur n'est pas un nombre clair (jamais de devinette). */
export function parseFrenchQuantity(raw: string | null | undefined): Decimal | null {
  if (raw == null) return null;
  const compact = raw.trim().replace(/[\s  ]/g, "");
  if (!/^-?\d+(?:[.,]\d+)?$/.test(compact)) return null;
  return new Decimal(compact.replace(",", "."));
}

const issue = (code: TakeoffIssueCode, severity: IssueSeverity, message: string): TakeoffIssue => ({ code, severity, message });

export function validateTakeoffLine(line: TakeoffLineInput, profile: TradeProfile): LineValidation {
  const issues: TakeoffIssue[] = [];
  const { kind, family } = lineKind(line.designation, profile);
  const unit = parseUnit(line.unitRaw);
  const quantity = parseFrenchQuantity(line.quantityRaw);

  const basis = kind === "material" && isWorkQuantity(family, unit) ? "work" : "purchase";
  const base = { lineId: line.id, kind, family: family?.code ?? null, familyLabel: family?.label ?? null, unit, quantity, basis } as const;

  if (kind === "labor") {
    issues.push(issue("LABOR_LINE", "info", "Prestation (pose, dépose, échafaudage…) : rien à commander au fournisseur."));
    return { ...base, status: "certain", issues };
  }

  // Quantité
  if (line.quantityRaw == null || line.quantityRaw.trim() === "") {
    issues.push(issue("QUANTITY_MISSING", "blocking", "Quantité absente : indiquez-la avant de demander des prix."));
  } else if (!quantity) {
    issues.push(issue("QUANTITY_UNREADABLE", "blocking", `Quantité illisible (« ${line.quantityRaw} ») : corrigez-la.`));
  } else if (quantity.lessThanOrEqualTo(0)) {
    issues.push(issue("QUANTITY_NOT_POSITIVE", "blocking", "La quantité doit être supérieure à zéro."));
  }

  // Unité
  if (!line.unitRaw || line.unitRaw.trim() === "") {
    issues.push(issue("UNIT_MISSING", "to_verify", "Unité absente (pièces, m², ml… ?)."));
  } else if (!unit) {
    issues.push(issue("UNIT_UNKNOWN", "to_verify", `Unité « ${line.unitRaw} » non reconnue : précisez-la.`));
  }

  // Familles « légères » (sans unités de référence) : reconnaissance seulement, aucun contrôle métier
  // tant que de vrais devis ne les ont pas validés (PD-033).
  if (basis === "work") {
    // Ni « unité inhabituelle » ni « confirmez » : la surface est juste, c'est une quantité d'ouvrage.
    // Elle part au fournisseur comme telle (« pour 120 m² ») tant que le référentiel ne la convertit pas.
    issues.push(
      issue("WORK_QUANTITY", "info", "Mesure de l'ouvrage : la quantité à commander reste à calculer (demandée au fournisseur pour cette mesure)."),
    );
  } else if (family?.allowedUnits && unit) {
    if (!family.allowedUnits.includes(unit)) {
      issues.push(
        issue(
          "UNIT_UNUSUAL_FOR_FAMILY",
          "to_verify",
          `${family.label} en ${unitLabel(unit)}, c'est inhabituel (d'ordinaire : ${family.allowedUnits.map(unitLabel).join(", ")}).`,
        ),
      );
    }
    if (family.wholeUnits && unit === "U" && quantity && !quantity.isInteger()) {
      issues.push(issue("FRACTIONAL_PIECES", "to_verify", `Quantité en pièces non entière.`));
    }
    if (dimensionOf(unit) === "package") {
      const usable = line.packaging && line.packaging.packageUnit === unit;
      if (!usable) {
        issues.push(
          issue(
            "PACKAGE_CONTENT_MISSING",
            "to_verify",
            `Combien par ${unitLabel(unit).replace(/[sx]$/, "")} ? Contenu non indiqué.`,
          ),
        );
      }
    }
    const max = family.plausibleMax?.[unit];
    if (max !== undefined && quantity && quantity.greaterThan(max)) {
      issues.push(
        issue(
          "QUANTITY_UNUSUALLY_HIGH",
          "to_verify",
          `${quantity.toString()} ${unitLabel(unit)} de ${family.label.toLowerCase()}, c'est beaucoup pour un chantier : vérifiez (erreur d'unité ou de virgule ?).`,
        ),
      );
    }
  }

  if (kind === "unknown") {
    // Simple information : le référentiel ne couvre pas tous les matériaux (autres métiers, produits
    // rares). En faire un doute noierait les vrais doutes (retour terrain du 30/09).
    issues.push(issue("FAMILY_UNKNOWN", "info", "Matériau hors référentiel du métier : pas de contrôle automatique."));
  }

  const status: ConfidenceLevel = issues.some((i) => i.severity !== "info") ? "to_verify" : "certain";
  return { ...base, status, issues };
}

/** Validation de l'ensemble du quantitatif : chaque ligne, puis doublons et oublis fréquents du métier. */
export function validateTakeoff(lines: readonly TakeoffLineInput[], profile: TradeProfile): TakeoffValidation {
  const validated = lines.map((l) => validateTakeoffLine(l, profile));
  const issues: TakeoffIssue[] = [];

  // Doublons : même désignation normalisée, même unité.
  const seen = new Map<string, string[]>();
  lines.forEach((l, i) => {
    const v = validated[i]!;
    if (v.kind !== "material") return;
    const key = `${normalizeText(l.designation)}|${v.unit ?? ""}`;
    seen.set(key, [...(seen.get(key) ?? []), l.id]);
  });
  for (const ids of seen.values()) {
    if (ids.length > 1) {
      issues.push({ ...issue("DUPLICATE_LINE", "to_verify", "La même ligne apparaît plusieurs fois : doublon ou quantités à additionner ?"), lineIds: ids });
    }
  }

  // Oublis fréquents : une question, jamais un ajout automatique.
  const present = new Set(validated.filter((v) => v.kind === "material").map((v) => v.family));
  for (const rule of profile.companionRules) {
    if (present.has(rule.when) && !rule.expectAnyOf.some((f) => present.has(f))) {
      issues.push(issue("POSSIBLE_OMISSION", "info", rule.message));
    }
  }

  const materials = validated.filter((v) => v.kind === "material" || v.kind === "unknown");
  if (materials.length === 0) {
    issues.push(issue("NO_MATERIAL", "blocking", "Aucun matériau à commander n'a été trouvé."));
  }

  return {
    trade: profile.id,
    lines: validated,
    issues,
    counts: {
      certain: validated.filter((v) => v.kind !== "labor" && v.status === "certain").length,
      probable: validated.filter((v) => v.status === "probable").length,
      toVerify: validated.filter((v) => v.status === "to_verify").length,
      labor: validated.filter((v) => v.kind === "labor").length,
      blocking: validated.filter((v) => v.issues.some((i) => i.severity === "blocking")).length + issues.filter((i) => i.severity === "blocking").length,
    },
  };
}
