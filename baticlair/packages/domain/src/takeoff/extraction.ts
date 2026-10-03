import { normalizeText, type TradeProfile } from "../trades/trade-profile.js";
import {
  validateTakeoff,
  type LineValidation,
  type TakeoffIssue,
  type TakeoffLineInput,
  type TakeoffValidation,
} from "./validation.js";

/**
 * Relecture déterministe d'un quantitatif proposé par l'IA.
 *
 * L'IA ne recopie pas le devis : chaque ligne cite les références
 * « page:ligne » du texte numéroté (« 2:014 »). Le code vérifie ici que
 * ces références existent et que la quantité proposée figure bien dans
 * les lignes citées. Une ligne qui ne se justifie pas par le document est
 * « à vérifier », jamais « certaine » (PD-026 : le doute va à l'artisan).
 */
export interface ExtractedLine {
  designation: string;
  /** Quantité telle qu'écrite dans le devis (« 1 250 », « 12,5 »), ou null. */
  quantity: string | null;
  unit: string | null;
  reference: string | null;
  /** Références « page:ligne » du texte numéroté qui justifient la ligne. */
  sourceRefs: string[];
  /** Pages lues sur l'image du document (pas de texte numéroté à citer). */
  sourcePages: number[];
  /** Titres du devis au-dessus de la ligne, du plus général au plus précis (vide si aucun). */
  section?: readonly string[];
  /** Ligne saisie ou corrigée par l'artisan : c'est lui la source, rien à retrouver dans le devis. */
  enteredByArtisan?: boolean;
  /** Doute exprimé par l'IA sur cette ligne (phrase courte), ou null. */
  aiDoubt?: string | null;
  /** L'artisan a regardé la ligne et confirmé qu'elle est juste telle quelle. */
  confirmedByArtisan?: boolean;
}

export interface ReviewedLine extends TakeoffLineInput {
  sourceRefs: string[];
  sourcePages: number[];
}

/** Chiffres seuls : « 1 250,50 » → « 125050 ». Sert à retrouver une quantité dans le texte source. */
function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Doute de LECTURE : ce que seul l'artisan peut trancher en regardant son devis. */
const READING_DOUBT = /(lisible|flou|coupe|efface|tache|manuscrit|rature|fourniture ou|prestation|pose seule|main d oeuvre)/;
/**
 * Doute de CALCUL : convertir des m² en ml, compter des pièces, le contenu d'un paquet… C'est le
 * travail de BatiClair (référentiel, hypothèses par défaut), jamais celui de l'artisan (règle du
 * fondateur, 2026-10-03 : « ce n'est pas à l'artisan de calculer »).
 */
const CALCULATION_DOUBT = /(combien|quantite|lineaire|\bml\b|\bm2\b|m²|metre|convers|convert|par (paquet|rouleau|botte|carton|palette|boite|lot)|contenu|conditionnement|nombre d|en pieces|surface|a calculer)/;

/** Un doute de calcul est gardé pour mémoire (info), jamais posé comme question. */
export function isCalculationDoubt(doubt: string): boolean {
  const n = normalizeText(doubt);
  return !READING_DOUBT.test(n) && CALCULATION_DOUBT.test(n);
}

function provenanceIssues(line: ExtractedLine, source: ReadonlyMap<string, string>): TakeoffIssue[] {
  if (line.enteredByArtisan) return [];
  const text = line.aiDoubt?.trim();
  const doubt: TakeoffIssue[] = !text
    ? []
    : isCalculationDoubt(text)
      ? [{ code: "AI_CALCULATION_NOTE", severity: "info", message: `L'IA s'est demandé : ${text} (BatiClair calcule).` }]
      : [{ code: "AI_DOUBT", severity: "to_verify", message: `L'IA hésite : ${text}` }];
  return [...doubt, ...sourceIssues(line, source)];
}

function sourceIssues(line: ExtractedLine, source: ReadonlyMap<string, string>): TakeoffIssue[] {
  const cited = line.sourceRefs.filter((ref) => source.has(ref));
  const issues: TakeoffIssue[] = [];
  if (cited.length === 0 && line.sourcePages.length === 0) {
    issues.push({
      code: "SOURCE_NOT_FOUND",
      severity: "to_verify",
      message: "Ligne introuvable dans le devis : vérifiez qu'elle existe vraiment.",
    });
    return issues;
  }
  if (cited.length === 0) {
    issues.push({
      code: "READ_FROM_IMAGE",
      severity: "info",
      // Information seulement : sur une page image, c'est le doute de l'IA qui signale une lecture difficile.
      message: `Lu sur l'image de la page ${line.sourcePages.join(", ")}.`,
    });
    return issues;
  }
  const qty = line.quantity ? digits(line.quantity) : "";
  if (qty.length > 0) {
    const found = cited.some((ref) => digits(source.get(ref) ?? "").includes(qty));
    if (!found) {
      issues.push({
        code: "QUANTITY_NOT_IN_SOURCE",
        severity: "to_verify",
        message: `La quantité « ${line.quantity} » ne figure pas sur la ligne du devis : vérifiez-la.`,
      });
    }
  }
  return issues;
}

/**
 * Valide le quantitatif proposé : règles métier (famille, unité, oublis),
 * traçabilité de chaque ligne jusqu'au document et doutes de l'IA.
 * Une ligne confirmée par l'artisan devient sûre ; seul un problème
 * bloquant (quantité illisible) reste, car on ne commande pas sans quantité.
 */
export function reviewExtractedTakeoff(
  lines: readonly (ExtractedLine & { id: string })[],
  source: ReadonlyMap<string, string>,
  profile: TradeProfile,
): { validation: TakeoffValidation; lines: ReviewedLine[] } {
  const inputs: ReviewedLine[] = lines.map((l) => ({
    id: l.id,
    designation: l.designation,
    quantityRaw: l.quantity,
    unitRaw: l.unit,
    reference: l.reference,
    source: l.enteredByArtisan ? "manual" : "client_quote",
    sourceRefs: l.sourceRefs,
    sourcePages: l.sourcePages,
    ...(l.section?.length ? { section: l.section } : {}),
  }));
  const validation = validateTakeoff(inputs, profile);
  const merged: LineValidation[] = validation.lines.map((v, i) => {
    if (v.kind === "labor") return v;
    const line = lines[i]!;
    const extra = provenanceIssues(line, source);
    const all = [...v.issues, ...extra];
    if (line.confirmedByArtisan) {
      const kept = all.filter((x) => x.severity !== "to_verify");
      return { ...v, issues: kept, status: kept.some((x) => x.severity === "blocking") ? "to_verify" : "certain" };
    }
    if (!extra.some((x) => x.severity !== "info")) return { ...v, issues: all };
    return { ...v, issues: all, status: "to_verify" };
  });
  const counts = {
    ...validation.counts,
    certain: merged.filter((v) => v.kind !== "labor" && v.status === "certain").length,
    toVerify: merged.filter((v) => v.status === "to_verify").length,
  };
  return { validation: { ...validation, lines: merged, counts }, lines: inputs };
}
