import type { NeedResult, Origin } from "../referential/engine.js";
import type { LineValidation, TakeoffIssue } from "../takeoff/validation.js";

/**
 * FICHE DE CONFIANCE d'un élément de la liste (une ligne envoyée au
 * fournisseur ou un besoin calculé). Aucun pourcentage : l'état découle de
 * critères explicites, chacun avec son statut et son origine.
 *
 *  ✓ « verified »   : BatiClair dispose de suffisamment d'éléments ÉTABLIS
 *                     pour produire cette ligne sans intervention de l'artisan.
 *                     Ce n'est pas « plus de question » : chaque critère
 *                     REQUIS doit être établi.
 *  ⚠ « to_confirm » : une ambiguïté qui CHANGE la commande, que l'artisan
 *                     tranche en un geste.
 *  ? « missing »    : une donnée indispensable manque ; BatiClair n'invente pas.
 *
 * Une incertitude sans effet sur la commande reste derrière (« no_effect ») ;
 * un conditionnement demandé au fournisseur reste dans le raisonnement
 * (« supplier ») sans déranger l'artisan.
 */
export type TrustState = "verified" | "to_confirm" | "missing";

export type CriterionKey =
  /** Lecture du document : quantité, unité, désignation. */
  | "reading"
  /** Ouvrage ou nature de la ligne (matériau, famille, mesure d'ouvrage ou d'achat). */
  | "work_item"
  /** Produit ou référence. */
  | "product"
  /** Caractéristique fabricant sourcée et vérifiée. */
  | "manufacturer_data"
  /** Règle de calcul validée. */
  | "rule"
  /** Données du chantier nécessaires au calcul. */
  | "site_data"
  /** Absence de contradiction entre informations. */
  | "consistency"
  /** Conditionnement (unité de vente). */
  | "packaging";

export type CriterionStatus =
  | "established"
  | "to_confirm"
  | "missing"
  /** Incertitude réelle, mais aucune de ses issues ne change la commande. */
  | "no_effect"
  /** Le fournisseur l'indique dans sa réponse (demandé dans l'e-mail) : rien à demander à l'artisan. */
  | "supplier";

/** Ce que la réponse de l'artisan changerait. Un doute qui ne change rien n'en a pas. */
export type OrderImpact = "product" | "quantity" | "packaging" | "compatibility" | "order";

export interface Criterion {
  key: CriterionKey;
  status: CriterionStatus;
  /** Une phrase pour « Voir le calcul ». */
  detail: string;
  origin?: Origin;
  affects?: OrderImpact[];
  /**
   * Conditionnement laissé au fournisseur MAIS qui peut fausser la comparaison
   * entre fournisseurs (prix au rouleau contre prix au m²) : à normaliser.
   */
  comparisonRisk?: boolean;
}

export interface Assessment {
  state: TrustState;
  /** Raison affichée à l'artisan quand l'état n'est pas ✓ (une phrase). */
  reason: string | null;
  criteria: Criterion[];
}

const LABEL: Record<CriterionKey, string> = {
  reading: "Lecture du devis",
  work_item: "Ouvrage",
  product: "Produit",
  manufacturer_data: "Caractéristique fabricant",
  rule: "Règle de calcul",
  site_data: "Données du chantier",
  consistency: "Cohérence",
  packaging: "Conditionnement",
};

/**
 * État d'un élément à partir de ses critères.
 *  - Un critère non établi SANS effet déclaré sur la commande est traité comme
 *    « sans effet » : il ne dérange jamais l'artisan.
 *  - ✓ exige que chaque critère REQUIS soit présent et établi (ou laissé au
 *    fournisseur pour le conditionnement) : l'absence de question ne suffit pas.
 */
export function decideState(criteria: Criterion[], required: readonly CriterionKey[]): Assessment {
  const effective = criteria.map((c) =>
    (c.status === "to_confirm" || c.status === "missing") && !(c.affects && c.affects.length > 0) ? { ...c, status: "no_effect" as const } : c,
  );
  const missing = effective.find((c) => c.status === "missing");
  if (missing) return { state: "missing", reason: missing.detail, criteria: effective };
  const absent = required.find((k) => !effective.some((c) => c.key === k && (c.status === "established" || c.status === "supplier" || c.status === "no_effect")));
  const doubt = effective.find((c) => c.status === "to_confirm");
  if (doubt) return { state: "to_confirm", reason: doubt.detail, criteria: effective };
  if (absent) return { state: "missing", reason: `${LABEL[absent]} : non établi.`, criteria: effective };
  return { state: "verified", reason: null, criteria: effective };
}

/** Critères requis pour une ligne commandée telle qu'écrite (achat direct). */
export const REQUIRED_FOR_PURCHASE_LINE: readonly CriterionKey[] = ["reading", "work_item", "consistency", "packaging"];
/** Critères requis pour un besoin calculé par le moteur. */
export const REQUIRED_FOR_COMPUTED_NEED: readonly CriterionKey[] = ["site_data", "product", "manufacturer_data", "rule", "consistency", "packaging"];

/** Ce que chaque contrôle de lecture dit, et ce qu'il changerait à la commande. */
const ISSUE_CRITERION: Partial<Record<TakeoffIssue["code"], { key: CriterionKey; status: CriterionStatus; affects?: OrderImpact[] }>> = {
  QUANTITY_MISSING: { key: "reading", status: "missing", affects: ["quantity"] },
  QUANTITY_UNREADABLE: { key: "reading", status: "missing", affects: ["quantity"] },
  QUANTITY_NOT_POSITIVE: { key: "reading", status: "missing", affects: ["quantity"] },
  UNIT_MISSING: { key: "reading", status: "to_confirm", affects: ["quantity"] },
  UNIT_UNKNOWN: { key: "reading", status: "to_confirm", affects: ["quantity"] },
  SOURCE_NOT_FOUND: { key: "reading", status: "to_confirm", affects: ["order"] },
  QUANTITY_NOT_IN_SOURCE: { key: "reading", status: "to_confirm", affects: ["quantity"] },
  AI_DOUBT: { key: "reading", status: "to_confirm", affects: ["order"] },
  UNIT_UNUSUAL_FOR_FAMILY: { key: "consistency", status: "to_confirm", affects: ["quantity"] },
  FRACTIONAL_PIECES: { key: "consistency", status: "to_confirm", affects: ["quantity"] },
  QUANTITY_UNUSUALLY_HIGH: { key: "consistency", status: "to_confirm", affects: ["quantity"] },
  MULTIPLIER_IN_DESIGNATION: { key: "consistency", status: "to_confirm", affects: ["quantity"] },
  DUPLICATE_LINE: { key: "consistency", status: "to_confirm", affects: ["quantity"] },
  UNITS_ABSENT: { key: "reading", status: "to_confirm", affects: ["quantity"] },
  // Le fournisseur indique le contenu de son conditionnement dans sa réponse : l'artisan n'est pas dérangé.
  PACKAGE_CONTENT_MISSING: { key: "packaging", status: "supplier" },
};

export interface LineContext {
  /** Questions qui concernent tout le document (doublons, unités absentes), avec les lignes visées. */
  documentIssues?: readonly TakeoffIssue[];
  /** L'artisan a confirmé la ligne (« C'est bon ») : ses doutes sont levés pour ce chantier. */
  confirmedByArtisan?: boolean;
  /** Ligne saisie ou corrigée par l'artisan : c'est lui la source. */
  enteredByArtisan?: boolean;
}

/**
 * Fiche d'une ligne du quantitatif telle qu'elle partira au fournisseur.
 * Renvoie null pour une prestation (rien à commander).
 */
export function assessTakeoffLine(v: LineValidation, ctx: LineContext = {}): Assessment | null {
  if (v.kind === "labor") return null;
  const readingOrigin: Origin = ctx.enteredByArtisan ? "project" : "devis";
  const criteria: Criterion[] = [];
  const issues = [
    ...v.issues.filter((i) => i.severity !== "info" || i.code === "PACKAGE_CONTENT_MISSING" || i.code === "UNIT_MISSING"),
    ...(ctx.documentIssues ?? []).filter((i) => i.severity !== "info" && i.lineIds?.includes(v.lineId)),
  ];
  for (const issue of issues) {
    const map = ISSUE_CRITERION[issue.code];
    if (!map) continue;
    // Une ligne sans unité dans un devis SANS colonne d'unité : la question est posée une fois pour le document.
    if (issue.code === "UNIT_MISSING" && issue.severity === "info" && !(ctx.documentIssues ?? []).some((d) => d.code === "UNITS_ABSENT")) continue;
    const resolved = ctx.confirmedByArtisan && map.status === "to_confirm";
    criteria.push({
      key: map.key,
      status: resolved ? "established" : map.status,
      detail: resolved ? `${issue.message} — confirmé pour ce chantier.` : issue.message,
      origin: resolved ? "project" : readingOrigin,
      ...(map.affects && !resolved ? { affects: map.affects } : {}),
      ...(map.key === "packaging" ? { comparisonRisk: true } : {}),
    });
  }
  const has = (k: CriterionKey) => criteria.some((c) => c.key === k);
  if (!has("reading")) {
    criteria.push({ key: "reading", status: "established", detail: `${v.quantity?.toFixed() ?? "?"} ${v.unit ?? ""} lus dans le devis.`.trim(), origin: readingOrigin });
  }
  if (v.kind === "unknown") {
    // Pas de famille connue : BatiClair ne sait pas si c'est un article à commander. Cela change la commande.
    criteria.push({
      key: "work_item",
      status: ctx.confirmedByArtisan ? "established" : "to_confirm",
      detail: ctx.confirmedByArtisan ? "Article gardé tel qu'écrit pour ce chantier." : "Article non reconnu : à commander tel qu'écrit ?",
      origin: ctx.confirmedByArtisan ? "project" : "devis",
      ...(ctx.confirmedByArtisan ? {} : { affects: ["order"] as OrderImpact[] }),
    });
  } else if (v.basis === "work") {
    // Mesure d'ouvrage : la quantité à commander n'est PAS établie. Jamais ✓ : on ne la fait pas passer pour un achat.
    criteria.push({
      key: "work_item",
      status: "missing",
      detail: "Quantité à commander non calculée : la mesure de l'ouvrage est envoyée au fournisseur.",
      origin: "referential",
      affects: ["quantity"],
    });
  } else {
    criteria.push({ key: "work_item", status: "established", detail: `${v.familyLabel ?? "Matériau"}, commandé tel qu'écrit.`, origin: "referential" });
  }
  if (!has("consistency")) criteria.push({ key: "consistency", status: "established", detail: "Aucune contradiction relevée." });
  if (!has("packaging")) {
    criteria.push(
      v.unit === "U"
        ? { key: "packaging", status: "established", detail: "À la pièce." }
        : { key: "packaging", status: "supplier", detail: "Conditionnement indiqué par le fournisseur.", comparisonRisk: true },
    );
  }
  return decideState(criteria, REQUIRED_FOR_PURCHASE_LINE);
}

/**
 * Fiche d'un besoin calculé par le moteur. Les origines viennent de la trace :
 * deux besoins ✓ peuvent reposer l'un sur le référentiel, l'autre sur une
 * préférence de l'entreprise ; « Voir le calcul » les distingue toujours.
 */
export function assessNeed(n: NeedResult): Assessment {
  const criteria: Criterion[] = [];
  const product = n.trace.find((t) => t.label === "Produit");
  if (n.status === "question" && n.question) {
    const q = n.question;
    if (q.kind === "param") {
      criteria.push({ key: "site_data", status: "missing", detail: q.impact ? `${q.text} ${q.impact}` : q.text, affects: ["quantity"] });
    } else {
      criteria.push({
        key: "product",
        status: "to_confirm",
        detail: q.text,
        origin: n.productOrigin === "proposal" ? "company" : "devis",
        affects: ["product"],
      });
    }
    return decideState(criteria, REQUIRED_FOR_COMPUTED_NEED);
  }
  if (n.status === "unknown") {
    const key: CriterionKey =
      n.missing?.kind === "rule" ? "rule" : n.missing?.kind === "product" ? "product" : n.missing?.kind === "product_data" ? "manufacturer_data" : "rule";
    criteria.push({ key, status: "missing", detail: n.reason ?? "Information manquante.", affects: ["quantity"] });
    return decideState(criteria, REQUIRED_FOR_COMPUTED_NEED);
  }
  // Calculé : chaque élément de la trace devient un critère, avec son origine.
  const facts = n.trace.filter((t) => t.origin === "referential" && t.label !== "Besoin calculé" && !t.label.startsWith("Marge"));
  criteria.push({
    key: "rule",
    status: n.provisional ? "missing" : "established",
    detail: n.provisional ? "Calcul provisoire : une donnée ou une règle attend sa vérification." : `Règle : ${n.formula ?? "?"}`,
    origin: "referential",
    ...(n.provisional ? { affects: ["quantity"] as OrderImpact[] } : {}),
  });
  criteria.push({
    key: "manufacturer_data",
    status: "established",
    detail: facts.map((f) => `${f.label} : ${f.value} ${f.unit}`).join(" ; ") || "Aucune caractéristique nécessaire.",
    origin: "referential",
  });
  criteria.push(
    product
      ? { key: "product", status: "established", detail: `${product.value} (${product.from})`, ...(product.origin ? { origin: product.origin } : {}) }
      : { key: "product", status: "established", detail: `${n.label}, tel que décrit au devis.`, origin: "devis" },
  );
  // Une donnée du chantier par critère : lue dans le devis ou répondue pour ce chantier, jamais confondues.
  const params = n.trace.filter((t) => (t.origin === "devis" || t.origin === "project") && t.label !== "Produit");
  const noEffect = n.trace.filter((t) => t.from === "Sans effet sur la commande");
  for (const p of params) criteria.push({ key: "site_data", status: "established", detail: `${p.label} : ${p.value} ${p.unit} (${p.from})`, origin: p.origin! });
  if (params.length === 0) criteria.push({ key: "site_data", status: "established", detail: "Aucune donnée de chantier nécessaire." });
  for (const t of noEffect) criteria.push({ key: "site_data", status: "no_effect", detail: `${t.label} inconnue : sans effet sur la commande.` });
  criteria.push({ key: "consistency", status: "established", detail: "Aucune contradiction relevée." });
  criteria.push(
    n.purchase
      ? { key: "packaging", status: "established", detail: `Commande : ${n.purchase.order.count} ${n.purchase.order.unit.many}.`, origin: "referential" }
      : { key: "packaging", status: "supplier", detail: "Conditionnement indiqué par le fournisseur.", comparisonRisk: true },
  );
  return decideState(criteria, REQUIRED_FOR_COMPUTED_NEED);
}

/** Compteurs de l'écran « Votre liste est prête » : ✓ / ⚠ / ?. */
export function trustCounts(assessments: readonly (Assessment | null)[]): Record<TrustState, number> {
  const counts: Record<TrustState, number> = { verified: 0, to_confirm: 0, missing: 0 };
  for (const a of assessments) if (a) counts[a.state]++;
  return counts;
}
