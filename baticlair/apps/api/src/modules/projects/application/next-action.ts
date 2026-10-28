/**
 * La prochaine action réelle sur un chantier, en mots d'artisan. Suit le
 * même fil que la fiche chantier : devis → liste → demandes → offres → choix.
 * Une attente (fournisseurs qui n'ont pas répondu) n'est pas une action.
 */
export interface ProjectSnapshot {
  hasClientQuote: boolean;
  takeoff: "none" | "draft" | "validated";
  /** Demande de prix en cours (la plus récente), si elle existe. */
  request: {
    recipients: { status: "to_send" | "sent" | "received" | "declined"; hasQuote: boolean; read: boolean }[];
    chosen: boolean;
  } | null;
}

export type NextActionKind =
  | "add_quote"
  | "prepare_list"
  | "validate_list"
  | "send_requests"
  | "compare"
  | "view_offer"
  | "choose_supplier";

export interface NextAction {
  kind: NextActionKind;
  label: string;
  detail: string | null;
  /** Section de la fiche chantier où agir. */
  target: "devis" | "materiaux" | "fournisseurs" | "comparer";
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function nextAction(s: ProjectSnapshot): NextAction | null {
  if (!s.hasClientQuote) return { kind: "add_quote", label: "Ajouter le devis client", detail: null, target: "devis" };
  if (s.takeoff === "none") return { kind: "prepare_list", label: "Préparer la liste de matériaux", detail: "Devis client ajouté", target: "materiaux" };
  if (s.takeoff === "draft") return { kind: "validate_list", label: "Valider la liste", detail: "Liste de matériaux à vérifier", target: "materiaux" };
  if (!s.request || s.request.recipients.length === 0) {
    return { kind: "send_requests", label: "Envoyer les demandes", detail: "Liste validée", target: "fournisseurs" };
  }
  const recipients = s.request.recipients;
  const received = recipients.filter((r) => r.status === "received" && r.hasQuote);
  const toSend = recipients.filter((r) => r.status === "to_send").length;
  const offers = plural(received.length, "devis reçu", "devis reçus");
  if (toSend > 0) {
    return { kind: "send_requests", label: "Envoyer les demandes", detail: plural(toSend, "demande à envoyer", "demandes à envoyer"), target: "fournisseurs" };
  }
  // Point 7 (Greg, 28 octobre 2026) : plus de lecture IA des devis reçus ; l'artisan les ouvre et retient un négoce.
  if (received.length > 0 && !s.request.chosen) {
    return { kind: "view_offer", label: received.length > 1 ? "Voir les devis reçus" : "Voir le devis reçu", detail: offers, target: "fournisseurs" };
  }
  return null;
}
