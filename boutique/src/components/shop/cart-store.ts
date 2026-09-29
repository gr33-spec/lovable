"use client";

import { useSyncExternalStore } from "react";
import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from "@/lib/validation";

// Panier conservé dans le navigateur (localStorage) : seulement des
// identifiants et des quantités. Les prix et le stock sont TOUJOURS relus
// sur le serveur — le panier local n'est jamais une source de vérité.
// Stockage strictement nécessaire au service demandé : pas de consentement requis.

export interface CartLine {
  productId: string;
  quantity: number;
}

const KEY = "boheme-panier-v1";
const EMPTY: CartLine[] = [];
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw)
      ? raw
          .filter((l) => typeof l?.productId === "string" && /^[0-9a-f-]{36}$/i.test(l.productId) && Number.isInteger(l.quantity) && l.quantity > 0)
          .map((l) => ({ productId: l.productId, quantity: Math.min(l.quantity, MAX_QUANTITY_PER_LINE) }))
          .slice(0, MAX_CART_LINES)
      : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* navigation privée : le panier reste en mémoire */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  return useCart().reduce((n, l) => n + l.quantity, 0);
}

export const cart = {
  add(productId: string, quantity = 1, max = MAX_QUANTITY_PER_LINE) {
    const lines = read();
    const existing = lines.find((l) => l.productId === productId);
    const limit = Math.min(max, MAX_QUANTITY_PER_LINE);
    if (existing) write(lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(limit, l.quantity + quantity) } : l)));
    else if (lines.length < MAX_CART_LINES) write([...lines, { productId, quantity: Math.min(limit, quantity) }]);
  },
  set(productId: string, quantity: number) {
    const q = Math.max(0, Math.min(MAX_QUANTITY_PER_LINE, Math.floor(quantity)));
    write(q === 0 ? read().filter((l) => l.productId !== productId) : read().map((l) => (l.productId === productId ? { ...l, quantity: q } : l)));
  },
  remove(productId: string) {
    write(read().filter((l) => l.productId !== productId));
  },
  clear() {
    write([]);
  },
  lines: read,
};
