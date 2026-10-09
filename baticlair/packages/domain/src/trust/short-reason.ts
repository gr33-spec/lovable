import type { Decision } from "./artisan-view.js";
import { AI_DOUBT, MISSING_INFO } from "./completion.js";
import { FORBIDDEN } from "./forbidden.js";
import { isWithoutSupplyUnit } from "../takeoff/supply.js";
import { A_PRECISER, COUNTER, RATIO, type PurchaseItem, type PurchaseView, type ScreenRow } from "./purchase-view.js";

/**
 * §50.3 (fondateur, 2026-10-09) : une ligne orange dit sa raison en CINQ MOTS AU PLUS (« Modèle et teinte à préciser »,
 * « Devis 20, calcul 21 »), puis ses boutons, puis « C'est bon ». Jamais le préfixe « Info manquante : » (§50.4), jamais
 * une phrase d'explication. Une ligne verte n'a pas de raison.
 */
export const MAX_REASON_WORDS = 5;

export const wordCount = (text: string) => text.trim().split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;

/** Les mots qui ne disent rien seuls (« type d'élément de rive » : c'est l'élément de rive qui compte). */
const GENERIC = new Set(["type", "nombre", "choix", "sorte", "genre", "nature", "valeur", "donnee"]);
const plain = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** « développé de la gouttière (25, 28, 33, 40) » → « Développé » ; « type d'élément de rive » → « Élément de rive ». */
export function subjectOf(text: string): string {
  let t = text
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/^info manquante\s*:\s*/i, "")
    .replace(/\s*(?:à|a) (?:préciser|confirmer)\b.*$/i, "")
    .replace(/\s*\?.*$/, "")
    .replace(/^(?:quel(?:le)?s?|combien de|combien d['’])\s+/i, "")
    .replace(/[.:;,]+$/, "")
    .trim();
  const m = /^(.+?)\s+(?:de la|de l['’]|des|du|de|d['’])\s*(.+)$/i.exec(t);
  if (m) {
    const head = m[1]!.trim();
    t = GENERIC.has(plain(head)) ? m[2]!.trim() : head;
  }
  const words = t.split(/\s+/).filter(Boolean).slice(0, 3);
  const out = words.join(" ");
  return out.charAt(0).toUpperCase() + out.slice(1);
}

const precise = (subject: string) => (subject ? `${subject} à préciser` : "À préciser");

/** La raison courte d'une ligne orange, à partir de ce qui la rend orange (l'écart, la donnée qui manque, le doute). */
export function shortReason(item: PurchaseItem | undefined, decision: Decision | undefined): string {
  if (item?.gap) return `Devis ${item.gap.written}, calcul ${item.gap.computed}`;
  const key = decision?.key ?? "";
  if (key.startsWith(A_PRECISER)) return precise(subjectOf(decision!.title));
  if (key.startsWith(COUNTER) || key.startsWith("precise:")) return precise(subjectOf(decision!.question?.text ?? decision!.title));
  const missing = (item?.rules ?? []).find((r) => r.key.startsWith("manque:"));
  if (missing) return precise(subjectOf(missing.text));
  if (key.startsWith(MISSING_INFO)) return precise(subjectOf(decision!.text));
  if ((item?.rules ?? []).some((r) => r.key.startsWith("defaut:"))) return "Valeur par défaut à confirmer";
  if (key.startsWith(RATIO) || (item?.toConfirm?.length ?? 0) > 0 || (item?.rules ?? []).some((r) => !r.said)) return "Quantité à confirmer";
  // Un doute du comptoir dit en une question courte (« Zinc naturel ou prépatiné ? ») se garde tel quel.
  if (key.startsWith(AI_DOUBT)) {
    const ask = /^[^?.]*\?/.exec(decision!.text.trim())?.[0];
    return ask && wordCount(ask) <= MAX_REASON_WORDS ? ask : "À vérifier sur le devis";
  }
  if (key.startsWith(FORBIDDEN)) return "Article à vérifier";
  if (key.startsWith("role:")) return "Mesure ou quantité ?";
  if (key === "group:unknown") return decision!.pieceLineIds?.length ? "Article inconnu, sans unité" : "Article inconnu";
  // « L'IA hésite : … » : ce qui cloche vient après (§50.4, jamais de jargon).
  const said = (decision?.text ?? "").replace(/^L['’]IA hésite\s*:\s*/i, "");
  const text = plain(said);
  if (/unite absente|sans unite|pas d'unite/.test(text)) return "Unité à préciser";
  if (/unite/.test(text)) return "Unité à confirmer";
  if (/quantite (absente|illisible)|sans quantite/.test(text)) return "Quantité à préciser";
  if (decision && wordCount(decision.title) <= MAX_REASON_WORDS && /\?$/.test(decision.title.trim())) return decision.title.trim();
  // Un doute de lecture dit d'abord ce qui cloche (« Chiffre peu lisible : 2 ou 3 paquets ? ») : ces premiers mots suffisent.
  const head = said.split(/\s:\s|[.?!]/)[0]!.trim();
  if (head && wordCount(head) <= MAX_REASON_WORDS) return head.charAt(0).toUpperCase() + head.slice(1);
  return "À vérifier";
}

/** Chaque ligne orange de l'écran reçoit sa raison courte (§50.3) ; une ligne verte n'en a aucune. */
export function withShortReasons(purchase: PurchaseView): PurchaseView {
  const items = new Map(purchase.toBuy.map((b) => [b.key, b]));
  const decisions = new Map(purchase.questions.map((d) => [d.key, d]));
  const groups = purchase.screen.groups.map((g) => ({
    ...g,
    rows: g.rows.map((r): ScreenRow => {
      if (r.status !== "check") {
        const { reason: _gone, ...rest } = r;
        return rest;
      }
      return { ...r, reason: shortReason(r.itemKey ? items.get(r.itemKey) : undefined, r.decisionKey ? decisions.get(r.decisionKey) : undefined) };
    }),
  }));
  // §50.5 : jamais des heures ni un forfait sur une ligne : une mesure « 1 fft » n'est pas une quantité ; la ligne part sans
  // elle, le fournisseur propose.
  const toQuote = purchase.toQuote.map((q) => (isWithoutSupplyUnit(q.measure.trim().split(/\s+/).slice(1).join(" ")) ? { ...q, measure: "" } : q));
  return { ...purchase, toQuote, screen: { ...purchase.screen, groups } };
}
