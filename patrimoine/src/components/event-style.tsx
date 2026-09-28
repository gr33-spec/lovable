import { BadgeEuro, Flag, Hammer, HandCoins, Landmark, RefreshCw, ShoppingCart, TrendingUp } from "lucide-react";
import type { EventKind } from "@/lib/engine/projection";

export const KIND_STYLE: Record<EventKind, { color: string; icon: React.ReactNode; label: string }> = {
  loan_end: { color: "bg-pos text-white", icon: <Landmark size={12} />, label: "Fin de crédit" },
  balloon: { color: "bg-neg text-white", icon: <BadgeEuro size={12} />, label: "Remboursement in fine" },
  works: { color: "bg-warn text-white", icon: <Hammer size={12} />, label: "Travaux" },
  sale: { color: "bg-series-1 text-white", icon: <TrendingUp size={12} />, label: "Vente" },
  purchase: { color: "bg-series-1 text-white", icon: <ShoppingCart size={12} />, label: "Achat" },
  acquisition: { color: "bg-series-1 text-white", icon: <ShoppingCart size={12} />, label: "Acquisition" },
  refinance: { color: "bg-navy text-white", icon: <RefreshCw size={12} />, label: "Refinancement" },
  prepayment: { color: "bg-navy text-white", icon: <BadgeEuro size={12} />, label: "Remb. anticipé" },
  event: { color: "bg-gold text-white", icon: <Flag size={12} />, label: "Événement" },
  income: { color: "bg-[#7c5cc4] text-white", icon: <HandCoins size={12} />, label: "Rémunération" },
};
