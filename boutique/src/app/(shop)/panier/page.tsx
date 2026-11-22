import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CartView } from "@/components/shop/cart-view";
import { RESERVATION_MODE } from "@/lib/sales-mode";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function CartPage() {
  // Pas de panier en mode réservation : chaque bijou se réserve depuis sa page.
  if (RESERVATION_MODE) redirect("/boutique");
  return <CartView />;
}
