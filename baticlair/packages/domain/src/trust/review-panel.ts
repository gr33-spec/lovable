import type { Decision } from "./artisan-view.js";
import type { PurchaseView, ScreenGroup, ScreenRow } from "./purchase-view.js";

/**
 * LA RELECTURE À DEUX VOIX (décision du fondateur, 2026-10-05 : « une IA lit le devis, deux autres discutent pour se
 * mettre d'accord, une dans la peau du fournisseur, l'autre de l'artisan ; le moindre doute ira en orange »).
 *
 * Après le calcul (le CODE calcule, jamais l'IA), deux relecteurs échangent sur le dossier :
 *  1. le FOURNISSEUR (vendeur de comptoir) dit ce qu'il ne pourrait pas chiffrer ou charger tel quel ;
 *  2. l'ARTISAN répond à chaque remarque (d'accord ou non) et ajoute les siennes (oubli, quantité incohérente) ;
 *  3. le FOURNISSEUR répond aux objections de l'artisan (il maintient ou retire) et donne son avis sur ses remarques.
 * Le CODE tire la conclusion : une remarque ne tombe que si les deux finissent d'accord qu'elle ne pose pas problème ;
 * tout le reste (accord sur un problème, désaccord) est un doute : la ligne passe ORANGE avec ce qu'ils ont dit.
 * Les relecteurs ne changent jamais un chiffre : « C'est bon » ou « Corriger le chiffre », d'un appui.
 */
export const REVIEW = "revue:";

export type RemarkTopic = "quantite" | "precision" | "manque" | "designation" | "autre";

export interface PanelRemark {
  /** Repère du dossier (« A3 » article à commander, « F2 » à préciser avec le fournisseur), null : tout le dossier. */
  article: string | null;
  sujet: RemarkTopic;
  texte: string;
}

export interface SupplierRound {
  remarques: PanelRemark[];
}

export interface ArtisanRound {
  /** Réponse à la remarque n° `remarque` (1, 2, 3… dans l'ordre du fournisseur). */
  reponses: { remarque: number; accord: boolean; texte: string }[];
  remarques: PanelRemark[];
}

export interface SupplierReply {
  /** Les remarques du fournisseur que l'artisan a contestées : il les maintient ou les retire. */
  objections: { remarque: number; maintient: boolean; texte: string }[];
  /** Son avis sur les remarques de l'artisan (n° dans l'ordre de l'artisan). */
  avis: { remarque: number; accord: boolean; texte: string }[];
}

export interface ReviewDoubt {
  /** Clé de l'article (`toBuy`) ou de la ligne à préciser (`toQuote`) ; null : remarque sur tout le dossier. */
  itemKey: string | null;
  text: string;
}

/** Le dossier que lisent les deux relecteurs, et les repères qui renvoient à la liste. */
export interface ReviewDossier {
  text: string;
  refs: Record<string, string>;
}

export interface DossierLine {
  ref: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
  section?: readonly string[] | undefined;
}

/** Le devis tel qu'il a été lu, et la liste calculée, avec des repères courts (L1, A1, F1). */
export function reviewDossier(purchase: PurchaseView, lines: readonly DossierLine[]): ReviewDossier {
  const refs: Record<string, string> = {};
  const lineRef = new Map(lines.map((l, i) => [l.ref, `L${i + 1}`]));
  const out: string[] = ["DEVIS DU CLIENT (lignes lues) :"];
  lines.forEach((l, i) => {
    const where = l.section?.length ? ` [${l.section.join(" › ")}]` : "";
    out.push(`L${i + 1} · ${l.designation} · ${[l.quantity, l.unit].filter(Boolean).join(" ") || "sans quantité"}${where}`);
  });
  out.push("", "LISTE À COMMANDER (calculée par BatiClair) :");
  purchase.toBuy.forEach((b, i) => {
    const id = `A${i + 1}`;
    refs[id] = b.key;
    const from = b.lineIds.map((x) => lineRef.get(x)).filter(Boolean).join(", ");
    const extra = [b.precision, b.approx].filter(Boolean).join(" ; ");
    out.push(`${id} · ${b.label} · ${b.quantity ?? "quantité à établir"}${extra ? ` (${extra})` : ""}${from ? ` — d'après ${from}` : ""}`);
  });
  if (purchase.toQuote.length > 0) {
    out.push("", "À PRÉCISER AVEC LE FOURNISSEUR (parties telles qu'écrites) :");
    purchase.toQuote.forEach((q, i) => {
      const id = `F${i + 1}`;
      refs[id] = q.key;
      out.push(`${id} · ${q.label} · ${q.measure}`);
    });
  }
  if (purchase.assumptions.length > 0) {
    out.push("", "HYPOTHÈSES DU CALCUL (modifiables par l'artisan) :");
    for (const a of purchase.assumptions) out.push(`- ${a.label} : ${a.value}${a.unit && a.unit !== "u" ? ` ${a.unit}` : ""}`);
  }
  return { text: out.join("\n"), refs };
}

const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s.trim());

/** La conclusion de l'échange, tirée par le code : chaque doute qui reste, avec ce que chacun a dit. */
export function panelDoubts(dossier: ReviewDossier, supplier: SupplierRound, artisan: ArtisanRound, reply: SupplierReply): ReviewDoubt[] {
  const keyOf = (r: PanelRemark) => (r.article ? (dossier.refs[r.article.trim().toUpperCase()] ?? null) : null);
  const doubts: ReviewDoubt[] = [];
  supplier.remarques.forEach((r, i) => {
    const n = i + 1;
    const answer = artisan.reponses.find((x) => x.remarque === n);
    const objection = reply.objections.find((x) => x.remarque === n);
    // Seul cas où la remarque tombe : l'artisan la conteste ET le fournisseur la retire.
    if (answer && !answer.accord && objection && !objection.maintient) return;
    const parts = [`Fournisseur : ${clip(r.texte)}`];
    if (answer?.texte.trim()) parts.push(`Artisan : ${clip(answer.texte)}`);
    if (answer && !answer.accord && objection?.texte.trim()) parts.push(`Fournisseur : ${clip(objection.texte)}`);
    doubts.push({ itemKey: keyOf(r), text: parts.join(" — ") });
  });
  artisan.remarques.forEach((r, i) => {
    const avis = reply.avis.find((x) => x.remarque === i + 1);
    const parts = [`Artisan : ${clip(r.texte)}`];
    if (avis?.texte.trim()) parts.push(`Fournisseur : ${clip(avis.texte)}`);
    doubts.push({ itemKey: keyOf(r), text: parts.join(" — ") });
  });
  // Un article, un doute : les remarques sur la même ligne se lisent ensemble.
  const merged = new Map<string, ReviewDoubt>();
  const global: ReviewDoubt[] = [];
  for (const d of doubts) {
    if (d.itemKey === null) {
      global.push(d);
      continue;
    }
    const known = merged.get(d.itemKey);
    merged.set(d.itemKey, known ? { itemKey: d.itemKey, text: `${known.text} · ${d.text}` } : d);
  }
  return [...merged.values(), ...global];
}

/**
 * Les doutes de la relecture sur l'écran : la ligne concernée passe ORANGE (« C'est bon » d'un appui, ou corriger le
 * chiffre) ; une remarque sur tout le dossier (un oubli possible) a sa propre ligne orange. Une réponse « revue:… »
 * de l'artisan lève le doute ; un article qui n'existe plus (liste recalculée) n'en porte plus.
 */
export function applyReviewDoubts(
  purchase: PurchaseView,
  doubts: readonly ReviewDoubt[],
  answers: Record<string, unknown>,
): PurchaseView {
  if (doubts.length === 0) return purchase;
  const decisions: Decision[] = [];
  const onRow = new Map<string, Decision>();
  const globals: { row: ScreenRow; decision: Decision }[] = [];
  doubts.forEach((d, i) => {
    const key = d.itemKey ? `${REVIEW}${d.itemKey}` : `${REVIEW}dossier:${i + 1}`;
    if (key in answers) return;
    const item = d.itemKey ? purchase.toBuy.find((b) => b.key === d.itemKey) : undefined;
    const quote = d.itemKey && !item ? purchase.toQuote.find((q) => q.key === d.itemKey) : undefined;
    if (d.itemKey && !item && !quote) return;
    const decision: Decision = {
      key,
      state: "to_confirm",
      title: item?.label ?? quote?.label ?? "Relecture du dossier",
      text: d.text,
      lineIds: [],
      primary: { action: "keep", label: "C'est bon" },
      secondary: item ? ["edit"] : [],
    };
    decisions.push(decision);
    if (d.itemKey) onRow.set(d.itemKey, decision);
    else globals.push({ row: { key: `review:${i + 1}`, status: "check", pending: { label: "Remarque de la relecture", quantity: null }, decisionKey: key, lineIds: [] }, decision });
  });
  if (decisions.length === 0) return purchase;
  const groups: ScreenGroup[] = purchase.screen.groups.map((g) => ({
    ...g,
    rows: g.rows.map((r): ScreenRow => {
      const d = (r.itemKey && onRow.get(r.itemKey)) || (r.quoteKey && onRow.get(r.quoteKey)) || undefined;
      // Une ligne qui attend déjà une autre réponse la garde d'abord : la relecture viendra ensuite.
      return d && !r.decisionKey ? { ...r, status: "check", decisionKey: d.key, reason: d.text } : r;
    }),
  }));
  if (globals.length > 0) groups.push({ key: "relecture", label: "Relecture du dossier", measure: null, kind: "autres", rows: globals.map((x) => x.row) });
  const rows = groups.flatMap((g) => g.rows);
  return {
    ...purchase,
    questions: [...purchase.questions, ...decisions],
    canValidate: false,
    screen: { groups, total: rows.length, toCheck: rows.filter((r) => r.status === "check").length },
  };
}
