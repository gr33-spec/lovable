import type { Metadata } from "next";
import { CartView } from "@/components/shop/cart-view";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function CartPage() {
  return <CartView />;
}
