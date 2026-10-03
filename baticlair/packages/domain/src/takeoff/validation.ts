import type { ConfidenceLevel } from "../confidence/confidence.js";
import type { PackagingSpec } from "../quantity/quantity.js";
import { dimensionOf, parseUnit, type UnitCode } from "../quantity/unit.js";
import { Decimal } from "../shared/decimal.js";
import { containsKeyword, keywordPosition, normalizeText, type MaterialFamily, type TradeProfile } from "../trades/trade-profile.js";
import { articleScope } from "./sections.js";

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

/** Position du premier mot d'une liste dans le texte normalisé (Infinity si aucun). */
function firstPosition(text: string, keywords: readonly string[]): number {
  const positions = keywords.map((k) => keywordPosition(text, k)).filter((p) => p >= 0);
  return positions.length > 0 ? Math.min(...positions) : Infinity;
}

/** Début de la désignation, après un éventuel code article (« POSE00 », « 10381 »). */
function headPosition(text: string): number {
  const code = /^(?:[a-z]*\d[a-z0-9]*\s+)?/.exec(text)!;
  return code[0].length;
}

/**
 * Matériau, prestation ou inconnu. « Fourniture et pose de tuiles » est un
 * matériau (la fourniture est à commander) ; « Dépose de la couverture
 * existante » est une prestation.
 *
 * Comme pour la famille, c'est la TÊTE de la ligne qui décide : « Tube PVC
 * évacuation » est un tube (pas une évacuation de gravats), « Pose
 * carrelage… » une prestation, « Application peinture » aussi. Sans aucun
 * mot de matériau connu, un mot de prestation ne compte que s'il ouvre la
 * ligne (« Pose plomberie »), jamais perdu au milieu d'une description
 * (« … prix liner posé », « … protection par différentiel »).
 */
export function lineKind(designation: string, profile: TradeProfile): { kind: LineKind; family: MaterialFamily | null } {
  const text = normalizeText(designation);
  const family = classifyMaterial(designation, profile);
  const isSupply = profile.supplyKeywords.some((k) => containsKeyword(text, k));
  const laborAt = firstPosition(text, profile.laborKeywords);
  if (!isSupply && laborAt !== Infinity) {
    const materialAt = family ? firstPosition(text, family.keywords) : Infinity;
    const labor = family ? laborAt < materialAt : laborAt === headPosition(text);
    if (labor) return { kind: "labor", family: null };
  }
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
  if (dimensionOf(unit) === "count") return family.countOfWork === true;
  return false;
}

/**
 * Mots qui nomment un OUVRAGE, quel que soit le métier : en tête de ligne,
 * la quantité compte des ouvrages (« Réalisation niche de douche 1 u »,
 * « Renfort … 20 u », « Réseau de gaine 4 u »), à décomposer en matériaux.
 */
const WORK_HEADS: readonly string[] = ["realisation", "creation", "reseau", "renfort", "jouee", "habillage"];

/** « 1 250,50 » → 1250.50 ; null si la valeur n'est pas un nombre clair (jamais de devinette). */
export function parseFrenchQuantity(raw: string | null | undefined): Decimal | null {
  if (raw == null) return null;
  const compact = raw.trim().replace(/[\s  ]/g, "");
  if (!/^-?\d+(?:[.,]\d+)?$/.test(compact)) return null;
  return new Decimal(compact.replace(",", "."));
}

const issue = (code: TakeoffIssueCode, severity: IssueSeverity, message: string): TakeoffIssue => ({ code, severity, message });

const PACKAGE_WORDS: Record<string, UnitCode> = {
  barre: "BARRE",
  sac: "SAC",
  pot: "POT",
  seau: "SEAU",
  bidon: "BIDON",
  rouleau: "ROULEAU",
  carton: "CARTON",
  botte: "BOTTE",
  couronne: "COURONNE",
};

/**
 * Unité ÉCRITE dans la désignation quand le devis n'a pas de colonne
 * d'unité : « Au m2 », « le ml », « Barre de 3 ML », « Sac de 25 kg »,
 * « SABLE SAC 25KG ». Jamais déduite d'autre chose que du texte.
 */
export function unitFromText(designation: string): { unit: UnitCode; evidence: string } | null {
  const text = normalizeText(designation);
  const per = /(?:^|[^a-z0-9])((?:au|le|par) (m2|m²|m \/ ?2|m\/ ?2|ml|m3|kg))(?![a-z0-9])/.exec(text);
  if (per) {
    const u = per[2]!.replace(/\s/g, "");
    return { unit: u === "ml" ? "ML" : u === "m3" ? "M3" : u === "kg" ? "KG" : "M2", evidence: per[1]! };
  }
  const pack = /(?:^|[^a-z0-9])((barre|sac|pot|seau|bidon|rouleau|carton|botte|couronne)s? (?:de )?\d+(?:[.,]\d+)? ?(?:kgs?|ml|m|l|litres?)?)(?![a-z0-9])/.exec(text);
  if (pack) return { unit: PACKAGE_WORDS[pack[2]!]!, evidence: pack[1]! };
  return null;
}

/**
 * Multiplicateur caché dans la désignation : « Spots LED (x3) » pour une
 * quantité de 1, « fixation … X2 ». La quantité à commander n'est alors
 * pas celle de la colonne : on demande, on ne choisit pas.
 */
export function designationMultiplier(designation: string): string | null {
  const text = normalizeText(designation);
  for (const m of text.matchAll(/(?:^|[\s(])(x ?\d+|lot de \d+|pack de \d+|par \d+)(?=[\s).,]|$)/g)) {
    // « 2 x 10 m », « 1.25m x 0.25 m » sont des dimensions (mesure × mesure), pas un multiplicateur ;
    // « 6x70 x2 » en est un.
    const before = text.slice(0, m.index).trim().split(" ").at(-1) ?? "";
    const after = text.slice(m.index + m[0].length);
    if (m[1]!.startsWith("x") && (/^\d+(?:[.,]\d+)?(?:mm|cm|m)?$/.test(before) || /^[.,]\d/.test(after))) continue;
    return m[1]!;
  }
  return null;
}

export function validateTakeoffLine(line: TakeoffLineInput, profile: TradeProfile): LineValidation {
  const issues: TakeoffIssue[] = [];
  const { kind, family } = lineKind(line.designation, profile);
  const hinted = !line.unitRaw?.trim() && kind !== "labor" ? unitFromText(line.designation) : null;
  const unit = hinted?.unit ?? parseUnit(line.unitRaw);
  const quantity = parseFrenchQuantity(line.quantityRaw);

  const head = normalizeText(line.designation);
  const namesWork = WORK_HEADS.some((w) => keywordPosition(head, w) === headPosition(head));
  const basis = kind === "material" && (isWorkQuantity(family, unit) || namesWork) ? "work" : "purchase";
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
  if (hinted) {
    issues.push(issue("UNIT_FROM_TEXT", "info", `Unité lue dans la désignation (« ${hinted.evidence} »).`));
  } else if (!line.unitRaw || line.unitRaw.trim() === "") {
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
          // Le fournisseur indique le contenu de son conditionnement (demandé dans l'e-mail) : la
          // quantité commandée (« 2 paquets ») est juste, l'artisan n'est pas dérangé (PD-045).
          issue(
            "PACKAGE_CONTENT_MISSING",
            "info",
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

  const multiplier = designationMultiplier(line.designation);
  if (multiplier) {
    issues.push(
      issue("MULTIPLIER_IN_DESIGNATION", "to_verify", `La désignation indique « ${multiplier} » : combien d'articles commander au total ?`),
    );
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

  // Doublons : même désignation normalisée, même unité. Deux lignes qui se SUIVENT avec la même
  // quantité font penser à une erreur de saisie (question) ; le même article réparti dans le devis (pièce par pièce,
  // logement par logement) est normal : ses quantités s'additionnent à la commande.
  const seen = new Map<string, number[]>();
  lines.forEach((l, i) => {
    const v = validated[i]!;
    if (v.kind !== "material") return;
    // Même règle que le regroupement à l'envoi : un lieu différent ne change pas l'article, un autre titre si.
    const key = [normalizeText(l.designation), v.unit ?? "", ...articleScope(l.section)].join("|");
    seen.set(key, [...(seen.get(key) ?? []), i]);
  });
  for (const indexes of seen.values()) {
    if (indexes.length < 2) continue;
    const ids = indexes.map((i) => lines[i]!.id);
    // Copie probable : deux lignes qui se suivent, avec la même quantité, sous les MÊMES titres
    // (le point lumineux du WC puis celui de la cuisine ne sont pas une copie).
    const sameSection = (a: TakeoffLineInput, b: TakeoffLineInput) => (a.section ?? []).map(normalizeText).join("|") === (b.section ?? []).map(normalizeText).join("|");
    const copies = indexes.filter((i, k) => k > 0 && i === indexes[k - 1]! + 1 && lines[i]!.quantityRaw === lines[i - 1]!.quantityRaw && sameSection(lines[i]!, lines[i - 1]!));
    issues.push(
      copies.length > 0
        ? {
            ...issue("DUPLICATE_LINE", "to_verify", "La même ligne apparaît deux fois de suite : doublon ou quantités à additionner ?"),
            lineIds: [...new Set(copies.flatMap((i) => [lines[i - 1]!.id, lines[i]!.id]))],
          }
        : { ...issue("DUPLICATE_LINE", "info", `Même article sur ${ids.length} lignes du devis : quantités à additionner pour la commande.`), lineIds: ids },
    );
  }

  // Devis sans colonne d'unité : UNE question pour tout le document, pas une par ligne.
  const unitless = validated.filter((v) => v.kind !== "labor" && v.issues.some((i) => i.code === "UNIT_MISSING"));
  if (unitless.length >= 3) {
    for (const v of unitless) {
      const i = v.issues.findIndex((x) => x.code === "UNIT_MISSING");
      // La ligne reste « à vérifier » (son unité dépend de la réponse) ; seule la question est regroupée.
      v.issues[i] = { ...v.issues[i]!, severity: "info", message: "Unité absente : voir la question sur les unités du devis." };
    }
    issues.push({
      ...issue("UNITS_ABSENT", "to_verify", `${unitless.length} lignes sans unité : ce devis compte-t-il en pièces ?`),
      lineIds: unitless.map((v) => v.lineId),
    });
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
