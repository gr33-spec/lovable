// Constantes et petites fonctions partagées entre le serveur et le navigateur,
// SANS dépendance (pas de zod) : les pages de la boutique restent légères.

export const MAX_QUANTITY_PER_LINE = 10;
export const MAX_CART_LINES = 30;

export const PRODUCT_COLORS = [
  { id: "dore", label: "Doré", hex: "#C9A55A" },
  { id: "argente", label: "Argenté", hex: "#B8BCC2" },
  { id: "noir", label: "Noir", hex: "#26221F" },
  { id: "blanc", label: "Blanc", hex: "#F4F1EC" },
  { id: "rose", label: "Rose", hex: "#E3A2B0" },
  { id: "rouge", label: "Rouge", hex: "#B8373D" },
  { id: "orange", label: "Orange", hex: "#E08A3C" },
  { id: "jaune", label: "Jaune", hex: "#E8C547" },
  { id: "vert", label: "Vert", hex: "#5E8B5A" },
  { id: "bleu", label: "Bleu", hex: "#3F6FB0" },
  { id: "violet", label: "Violet", hex: "#8565A8" },
  { id: "marron", label: "Marron", hex: "#8A5B3C" },
  { id: "multicolore", label: "Multicolore", hex: "conic" },
] as const;

export const COLOR_IDS = PRODUCT_COLORS.map((c) => c.id) as string[];

export const DELIVERY_LABELS = { hand: "Remise en main propre", post: "Envoi postal" } as const;

export const SOCIAL_NETWORKS = ["facebook", "instagram", "whatsapp", "tiktok", "pinterest", "youtube", "site"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  youtube: "YouTube",
  site: "Autre lien",
};

/** Numéro WhatsApp saisi (« 06 12 34 56 78 ») → lien officiel https://wa.me/33612345678. */
export function whatsappUrl(input: string): string | null {
  if (/^https:\/\//.test(input.trim())) return input.trim();
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^0[1-9]\d{8}$/.test(digits)) digits = `33${digits.slice(1)}`;
  return /^\d{8,15}$/.test(digits) ? `https://wa.me/${digits}` : null;
}
