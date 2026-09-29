"use client";

import { useEffect, useState } from "react";
import type { ImageRef } from "@/lib/image-ref";
import { useCart } from "./cart-store";

export interface CartProduct {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  stock: number;
  image: ImageRef | null;
}

export interface ShippingOption {
  id: string;
  name: string;
  priceCents: number;
  freeOverCents: number | null;
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; products: Map<string, CartProduct>; shipping: ShippingOption[]; ordersOpen: boolean; closedMessage: string };

/** Relit sur le serveur les prix et le stock ACTUELS des articles du panier. */
export function useCartDetails() {
  const lines = useCart();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const key = lines
    .map((l) => l.productId)
    .sort()
    .join(",");

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(",") : [];
    fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (cancelled) return;
        setState({
          status: "ready",
          products: new Map((data.products as CartProduct[]).map((p) => [p.id, p])),
          shipping: data.shipping,
          ordersOpen: data.ordersOpen,
          closedMessage: data.closedMessage,
        });
      })
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  return { lines, state, retry: () => setAttempt((a) => a + 1) };
}
