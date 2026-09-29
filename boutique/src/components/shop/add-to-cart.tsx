"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { MAX_QUANTITY_PER_LINE } from "@/lib/validation";
import { cart, useCart } from "./cart-store";

// Bouton « Ajouter au panier ». Sur téléphone, une barre fixe en bas de
// l'écran reste accessible au pouce pendant que la cliente fait défiler les
// photos et la description.

export function AddToCart({ productId, name, priceCents, stock, ordersOpen }: { productId: string; name: string; priceCents: number; stock: number; ordersOpen: boolean }) {
  const lines = useCart();
  const inCart = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  const max = Math.min(stock, MAX_QUANTITY_PER_LINE);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const mainButton = useRef<HTMLDivElement>(null);
  const remaining = Math.max(0, max - inCart);
  const soldOut = stock <= 0;

  useEffect(() => {
    const el = mainButton.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 3500);
    return () => clearTimeout(t);
  }, [added]);

  const add = () => {
    if (remaining <= 0) return;
    cart.add(productId, Math.min(qty, remaining), max);
    setAdded(true);
    setQty(1);
  };

  if (soldOut) {
    return (
      <div className="rounded-2xl bg-soldout-bg p-4 text-soldout" role="status">
        <p className="font-semibold">Cette création est épuisée.</p>
        <p className="mt-1 text-sm">Chaque pièce est faite main : d&apos;autres modèles vous attendent dans la boutique.</p>
      </div>
    );
  }
  if (!ordersOpen) {
    return (
      <p className="rounded-2xl bg-primary-light p-4 text-sm font-medium text-primary" role="status">
        Les commandes sont momentanément en pause.
      </p>
    );
  }

  return (
    <>
      <div ref={mainButton} className="flex flex-wrap items-stretch gap-3">
        {max > 1 && (
          <div className="flex items-center rounded-full border-[1.5px] border-border bg-surface" role="group" aria-label="Quantité">
            <button type="button" className="btn btn-icon" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Diminuer la quantité">
              <Minus size={16} />
            </button>
            <span className="w-6 text-center font-semibold" aria-live="polite">
              {qty}
            </span>
            <button type="button" className="btn btn-icon" onClick={() => setQty((q) => Math.min(remaining || 1, q + 1))} disabled={qty >= remaining} aria-label="Augmenter la quantité">
              <Plus size={16} />
            </button>
          </div>
        )}
        <button type="button" className="btn btn-primary min-h-[52px] flex-1 text-base" onClick={add} disabled={remaining <= 0}>
          {remaining <= 0 ? (
            <>
              <Check size={18} aria-hidden="true" /> Déjà dans votre panier
            </>
          ) : (
            <>
              <ShoppingBag size={18} aria-hidden="true" /> Ajouter au panier
            </>
          )}
        </button>
      </div>
      {inCart > 0 && (
        <p className="mt-3 text-sm text-text-2">
          {inCart} dans votre panier ·{" "}
          <Link href="/panier" className="font-semibold text-primary">
            Voir le panier
          </Link>
        </p>
      )}

      {/* Confirmation d'ajout, discrète et non bloquante. */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {added && (
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-text p-3 pl-4 text-bg shadow-lift" style={{ animation: "rise .25s ease both" }} role="status">
            <Check size={20} className="shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm">
              <strong>{name}</strong> ajouté au panier
            </p>
            <Link href="/panier" className="btn btn-sm shrink-0 bg-bg text-text">
              Voir le panier
            </Link>
          </div>
        )}
      </div>

      {/* Barre fixe sur mobile quand le bouton principal n'est plus visible. */}
      {!added && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 md:hidden ${
            showBar ? "translate-y-0" : "translate-y-full"
          }`}
          aria-hidden={!showBar}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="text-sm font-semibold">{formatPrice(priceCents)}</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={add} disabled={remaining <= 0} tabIndex={showBar ? 0 : -1}>
              {remaining <= 0 ? "Dans le panier" : "Ajouter au panier"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
