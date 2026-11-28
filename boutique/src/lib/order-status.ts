// Cycle de vie d'une commande — une seule définition, utilisée par le serveur
// (contrôle des transitions) et par l'interface (libellés, couleurs).

export const ORDER_STATUSES = ["pending", "paid", "preparing", "shipped", "completed", "cancelled", "refunded", "expired"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuts visibles par la créatrice (pending / expired restent techniques). */
export const ADMIN_STATUSES: OrderStatus[] = ["paid", "preparing", "shipped", "completed", "cancelled", "refunded"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Paiement en cours",
  paid: "Payée",
  preparing: "En préparation",
  shipped: "Expédiée",
  completed: "Terminée",
  cancelled: "Annulée",
  refunded: "Remboursée",
  expired: "Paiement non abouti",
};

/** Libellé pour la cliente. */
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Paiement en cours de confirmation",
  paid: "Commande confirmée",
  preparing: "En préparation",
  shipped: "Expédiée",
  completed: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
  expired: "Paiement non finalisé",
};

export type StatusTone = "info" | "warning" | "success" | "neutral" | "danger";

export const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  pending: "neutral",
  paid: "warning",
  preparing: "info",
  shipped: "success",
  completed: "neutral",
  cancelled: "danger",
  refunded: "danger",
  expired: "neutral",
};

/** Transitions manuelles autorisées depuis l'administration. */
const MANUAL: Partial<Record<OrderStatus, OrderStatus[]>> = {
  paid: ["preparing", "shipped"],
  preparing: ["shipped", "paid"],
  shipped: ["completed", "preparing"],
  completed: ["shipped"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return MANUAL[from]?.includes(to) ?? false;
}

/** Annulation (avec remboursement) possible tant que rien n'est parti. */
export function canCancel(status: OrderStatus): boolean {
  return status === "paid" || status === "preparing";
}

/** Remboursement possible après expédition (retour, litige…). */
export function canRefund(status: OrderStatus): boolean {
  return status === "shipped" || status === "completed";
}

/** Commandes « à traiter » pour la créatrice. */
export const TO_PREPARE: OrderStatus[] = ["paid", "preparing"];
