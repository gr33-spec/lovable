import type { Decision } from "./artisan-view.js";
import type { PurchaseView, ScreenGroup, ScreenRow } from "./purchase-view.js";

/**
 * UNE LIGNE FORCÉE EN ORANGE par une vérification (interdits du code, doutes et ajouts du quantitatif IA). La ligne
 * concernée passe orange avec sa raison ; une remarque sans article (un oubli, un ajout proposé) a sa propre ligne.
 * Une réponse de l'artisan (clé de la décision dans `answers`) la lève. Rien n'est jamais changé sans son appui.
 */
export interface OrangeFlag {
  /** Clé de la décision (« interdit:…», « ia-doute:…», « ia-ajout:…»), stable d'un calcul à l'autre. */
  key: string;
  /** Article (`toBuy`) ou ligne à préciser (`toQuote`) concerné ; null : une ligne à part. */
  itemKey: string | null;
  title: string;
  text: string;
  /** Gros bouton (« C'est bon » par défaut, « Oui, on l'ajoute » pour un ajout). */
  primaryLabel?: string;
  suggestion?: { label: string; quantity: string | null; unit: string | null };
  /** Ligne à part : son nom, sa quantité, et l'article près duquel la ranger. */
  row?: { label: string; quantity: string | null; nearItemKey: string | null };
}

const OWN_GROUP = { key: "verification", label: "À ajouter ou vérifier", measure: null, kind: "autres" as const };

export function applyOrangeFlags(purchase: PurchaseView, flags: readonly OrangeFlag[], answers: Record<string, unknown>): PurchaseView {
  const open = flags.filter((f) => !(f.key in answers));
  if (open.length === 0) return purchase;
  const decisions: Decision[] = [];
  const onRow = new Map<string, OrangeFlag>();
  const ownRows: { flag: OrangeFlag; row: ScreenRow }[] = [];
  for (const f of open) {
    const item = f.itemKey ? purchase.toBuy.find((b) => b.key === f.itemKey) : undefined;
    const quote = f.itemKey && !item ? purchase.toQuote.find((q) => q.key === f.itemKey) : undefined;
    // L'article a disparu (liste recalculée) : la remarque n'a plus d'objet.
    if (f.itemKey && !item && !quote) continue;
    decisions.push({
      key: f.key,
      state: "to_confirm",
      title: f.title,
      text: f.text,
      lineIds: [],
      primary: { action: "keep", label: f.primaryLabel ?? "C'est bon" },
      secondary: item ? ["edit"] : [],
      ...(f.suggestion ? { suggestion: f.suggestion } : {}),
    });
    if (f.itemKey) {
      if (!onRow.has(f.itemKey)) onRow.set(f.itemKey, f);
    } else {
      ownRows.push({ flag: f, row: { key: `flag:${f.key}`, status: "check", pending: { label: f.row?.label ?? f.title, quantity: f.row?.quantity ?? null }, decisionKey: f.key, reason: f.text, lineIds: [] } });
    }
  }
  if (decisions.length === 0) return purchase;
  const groups: ScreenGroup[] = purchase.screen.groups.map((g) => ({
    ...g,
    rows: g.rows.map((r): ScreenRow => {
      const f = (r.itemKey && onRow.get(r.itemKey)) || (r.quoteKey && onRow.get(r.quoteKey)) || undefined;
      // Une ligne qui attend déjà une autre réponse la garde d'abord : la vérification viendra ensuite.
      return f && !r.decisionKey ? { ...r, status: "check", decisionKey: f.key, reason: f.text } : r;
    }),
  }));
  // Les lignes à part : près de l'article qu'elles complètent, sinon dans « À ajouter ou vérifier ».
  for (const { flag, row } of ownRows) {
    const near = flag.row?.nearItemKey ? groups.find((g) => g.rows.some((r) => r.itemKey === flag.row!.nearItemKey)) : undefined;
    if (near) near.rows.push(row);
    else {
      let own = groups.find((g) => g.key === OWN_GROUP.key);
      if (!own) groups.push((own = { ...OWN_GROUP, rows: [] }));
      own.rows.push(row);
    }
  }
  const rows = groups.flatMap((g) => g.rows);
  return {
    ...purchase,
    questions: [...purchase.questions, ...decisions],
    canValidate: false,
    screen: { groups, total: rows.length, toCheck: rows.filter((r) => r.status === "check").length },
  };
}
