import { normalizeText } from "../trades/trade-profile.js";
import type { OrangeFlag } from "./orange.js";
import type { PurchaseView } from "./purchase-view.js";

/**
 * LE QUANTITATIF EN UN PASSAGE, APPEL IA N° 2 (décision du fondateur, 2026-10-06 : « 2 appels IA max par devis,
 * lecture + quantitatif, prompt §41, rôle couvreur ET comptoir négoce ; pour chaque ouvrage, fixations, scellements,
 * étanchéité et consommables obligatoires ; tout doute = orange + suggestion de remplacement »).
 *
 * Le MOTEUR calcule toujours les quantités (réponse du fondateur, 2026-10-06 : « moteur + IA qui complète ») : l'appel
 * n° 2 reçoit le devis lu, la liste calculée et le référentiel, et rend deux choses seulement :
 *  - des AJOUTS : fixations, scellements, étanchéité, consommables qui manquent à un ouvrage ;
 *  - des DOUTES : un article de la liste qui ne passerait pas au comptoir, avec ce qu'il propose à la place.
 * Tout ce que l'IA ajoute ou propose sort ORANGE, jamais vert : rien n'entre dans la commande sans l'appui de l'artisan.
 */
export const AI_ADDITION = "ia-ajout:";
export const AI_DOUBT = "ia-doute:";
/**
 * §48.4 : une question laissée sans réponse est close au calcul (plus aucune question après la liste) ; la ligne qui
 * attendait cette information sort ORANGE « Info manquante », levée d'un « C'est bon » (elle part telle quelle).
 */
export const MISSING_INFO = "manque:";

/**
 * Ce que rend l'IA (repères du dossier : L = ligne du devis, A = article, F = à préciser avec le fournisseur). Prompt B
 * réécrit (§41.2, 2026-10-06) : des doutes seulement (repère, raison, proposition sans chiffre) ; « ajouts » est
 * TOUJOURS vide, et ce qui y arriverait quand même est ignoré (§49.1 : rien d'autre que le devis).
 */
export interface CompletionWire {
  doutes: { repere: string; raison: string; proposition: string | null }[];
  ajouts: unknown[];
}

/** Ce qui est gardé avec le quantitatif : les repères déjà résolus en clés d'articles. */
export interface CompletionRecord {
  additions: { nearItemKey: string | null; label: string; quantity: string | null; unit: string | null; reason: string }[];
  doubts: { itemKey: string; reason: string; replacement: { label: string; quantity: string | null; unit: string | null } | null }[];
}

export interface CompletionDossier {
  text: string;
  /** Repère du dossier → clé de l'article (A1 → toBuy, F1 → toQuote). */
  refs: Record<string, string>;
}

export interface DossierLine {
  ref: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
  section?: readonly string[] | undefined;
}

/** Le dossier de l'appel n° 2 : le devis lu (L1…), la liste calculée par le moteur (A1…, F1…), les hypothèses. */
export function completionDossier(purchase: PurchaseView, lines: readonly DossierLine[]): CompletionDossier {
  const refs: Record<string, string> = {};
  const lineRef = new Map(lines.map((l, i) => [l.ref, `L${i + 1}`]));
  const out: string[] = ["DEVIS DU CLIENT (lignes lues, le devis fait foi) :"];
  lines.forEach((l, i) => {
    const where = l.section?.length ? ` [${l.section.join(" › ")}]` : "";
    out.push(`L${i + 1} · ${l.designation} · ${[l.quantity, l.unit].filter(Boolean).join(" ") || "sans quantité"}${where}`);
  });
  out.push("", "LISTE À COMMANDER, CALCULÉE PAR LE MOTEUR (référentiel du métier) :");
  purchase.toBuy.forEach((b, i) => {
    const id = `A${i + 1}`;
    refs[id] = b.key;
    const from = b.lineIds.map((x) => lineRef.get(x)).filter(Boolean).join(", ");
    const extra = [b.precision, b.approx].filter(Boolean).join(" ; ");
    out.push(`${id} · ${b.label} · ${b.quantity ?? "quantité à établir"}${extra ? ` (${extra})` : ""}${from ? ` — d'après ${from}` : ""}`);
  });
  if (purchase.toQuote.length > 0) {
    out.push("", "À PRÉCISER AVEC LE FOURNISSEUR (parties telles qu'écrites au devis) :");
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

const clip = (s: string, n = 240) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s.trim());
const blank = (s: string | null | undefined) => !s || !s.trim();

/** Les repères de l'IA résolus en clés ; un repère inconnu est écarté (jamais un ajout ni un doute au hasard). */
export function completionRecord(wire: CompletionWire, dossier: CompletionDossier): CompletionRecord {
  const keyOf = (ref: string | null) => (ref ? (dossier.refs[ref.trim().toUpperCase()] ?? null) : null);
  // Un ajout identique à un article déjà dans la liste n'est pas un ajout.
  const listed = new Set(Object.values(dossier.refs));
  return {
    // §49.1 point 5 : jamais d'article proposé hors du devis, même si l'IA en rendait un.
    additions: [],
    // §41.2 : au plus 20 doutes ; la proposition est une désignation ou une unité, jamais une nouvelle quantité.
    doubts: wire.doutes.slice(0, 20).flatMap((d) => {
      const itemKey = keyOf(d.repere);
      if (!itemKey || !listed.has(itemKey)) return [];
      const replacement = !blank(d.proposition) ? { label: clip(d.proposition!, 160), quantity: null, unit: null } : null;
      return [{ itemKey, reason: clip(d.raison), replacement }];
    }),
  };
}

const keyOfLabel = (label: string) => normalizeText(label).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Les drapeaux ORANGE de l'appel n° 2 : un ajout proposé a sa ligne (« Oui, on l'ajoute »), un doute colore l'article. */
export function completionFlags(record: CompletionRecord): OrangeFlag[] {
  const flags: OrangeFlag[] = [];
  record.additions.forEach((a, i) => {
    const quantity = [a.quantity, a.unit].filter(Boolean).join(" ") || null;
    flags.push({
      key: `${AI_ADDITION}${i + 1}-${keyOfLabel(a.label)}`,
      itemKey: null,
      title: a.label,
      text: `À ajouter ? ${a.reason}`,
      primaryLabel: "Oui, on l'ajoute",
      suggestion: { label: a.label, quantity: a.quantity, unit: a.unit },
      row: { label: a.label, quantity, nearItemKey: a.nearItemKey },
    });
  });
  const seen = new Set<string>();
  for (const d of record.doubts) {
    if (seen.has(d.itemKey)) continue;
    seen.add(d.itemKey);
    flags.push({
      key: `${AI_DOUBT}${d.itemKey}`,
      itemKey: d.itemKey,
      title: "Le comptoir aurait un doute",
      text: d.reason,
      ...(d.replacement ? { suggestion: d.replacement } : {}),
    });
  }
  return flags;
}
