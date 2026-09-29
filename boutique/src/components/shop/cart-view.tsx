"use client";

import { AlertCircle, ArrowLeft, Lock, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { formatPrice } from "@/lib/format";
import { MAX_QUANTITY_PER_LINE } from "@/lib/validation";
import { Img } from "../ui/img";
import { cart } from "./cart-store";
import { useCartDetails } from "./use-cart-details";

export function CartView() {
  const { lines, state, retry } = useCartDetails();

  // Produits disparus ou quantités devenues trop grandes : le panier s'ajuste tout seul.
  useEffect(() => {
    if (state.status !== "ready") return;
    for (const l of lines) {
      const p = state.products.get(l.productId);
      if (!p) cart.remove(l.productId);
    }
  }, [state, lines]);

  if (state.status === "loading" && lines.length > 0) {
    return (
      <div className="container-page py-8" aria-busy="true">
        <div className="skeleton mb-6 h-10 w-48" />
        {lines.map((l) => (
          <div key={l.productId} className="skeleton mb-3 h-28" />
        ))}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-primary">
            <ShoppingBag size={28} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-4xl">Votre panier est vide</h1>
          <p className="mt-3 text-text-2">Laissez-vous tenter par une création pailletée, faite main.</p>
          <Link href="/boutique" className="btn btn-primary mt-7">
            Découvrir les créations
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="container-page py-16 text-center">
        <p className="font-serif text-2xl">Impossible de charger le panier</p>
        <p className="mt-2 text-text-2">Vérifiez votre connexion internet. Votre panier est bien conservé.</p>
        <button type="button" className="btn btn-primary mt-6" onClick={retry}>
          Réessayer
        </button>
      </div>
    );
  }
  if (state.status !== "ready") return null;

  const rows = lines
    .map((l) => ({ line: l, product: state.products.get(l.productId) }))
    .filter((r): r is { line: typeof r.line; product: NonNullable<typeof r.product> } => Boolean(r.product));
  const problems = rows.filter((r) => r.product.stock < r.line.quantity);
  const sellable = rows.filter((r) => r.product.stock > 0);
  const subtotal = sellable.reduce((s, r) => s + r.product.priceCents * Math.min(r.line.quantity, r.product.stock), 0);
  const cheapest = state.shipping.length ? state.shipping.reduce((a, b) => (a.priceCents <= b.priceCents ? a : b)) : null;
  const freeRule = state.shipping.find((s) => s.freeOverCents !== null && s.priceCents > 0);
  const toFree = freeRule?.freeOverCents && subtotal < freeRule.freeOverCents ? freeRule.freeOverCents - subtotal : null;
  const count = rows.reduce((n, r) => n + r.line.quantity, 0);

  return (
    <div className="container-page pt-6 pb-28 sm:pt-10 md:pb-12">
      <h1 className="text-4xl sm:text-5xl">Panier</h1>
      <p className="mt-1 text-text-2">
        {count} article{count > 1 ? "s" : ""}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
        <section aria-label="Articles">
          {problems.length > 0 && (
            <div role="alert" className="mb-5 flex gap-3 rounded-2xl bg-warning-bg p-4 text-sm text-warning">
              <AlertCircle size={20} className="shrink-0" aria-hidden="true" />
              <p>Certaines créations ont été achetées entre-temps : les quantités disponibles sont indiquées ci-dessous.</p>
            </div>
          )}
          <ul className="divide-y divide-border border-y border-border">
            {rows.map(({ line, product }) => {
              const soldOut = product.stock <= 0;
              const max = Math.min(product.stock, MAX_QUANTITY_PER_LINE);
              return (
                <li key={product.id} className="flex gap-4 py-5">
                  <Link href={`/produit/${product.slug}`} className="block h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary sm:h-32 sm:w-28">
                    <Img image={product.image} alt={product.name} sizes="120px" className={`h-full w-full ${soldOut ? "opacity-60 grayscale" : ""}`} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/produit/${product.slug}`} className="font-medium no-underline hover:underline">
                        {product.name}
                      </Link>
                      <p className="shrink-0 font-semibold">{formatPrice(product.priceCents * Math.min(line.quantity, Math.max(product.stock, 0)))}</p>
                    </div>
                    <p className="text-sm text-text-2">{formatPrice(product.priceCents)} l&apos;unité</p>
                    {soldOut ? (
                      <p className="mt-1 text-sm font-semibold text-error">N&apos;est plus disponible</p>
                    ) : (
                      product.stock < line.quantity && (
                        <p className="mt-1 text-sm font-semibold text-warning">
                          Plus que {product.stock} disponible{product.stock > 1 ? "s" : ""}{" "}
                          <button type="button" className="underline" onClick={() => cart.set(product.id, product.stock)}>
                            Ajuster
                          </button>
                        </p>
                      )
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      {!soldOut && max > 1 ? (
                        <div className="flex items-center rounded-full border-[1.5px] border-border" role="group" aria-label={`Quantité de ${product.name}`}>
                          <button type="button" className="btn btn-icon !min-h-10 !min-w-10" onClick={() => cart.set(product.id, line.quantity - 1)} aria-label="Diminuer">
                            <Minus size={15} />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                          <button type="button" className="btn btn-icon !min-h-10 !min-w-10" onClick={() => cart.set(product.id, line.quantity + 1)} disabled={line.quantity >= max} aria-label="Augmenter">
                            <Plus size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-text-2">{soldOut ? "" : "Pièce unique"}</span>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm -mr-3 text-text-2" onClick={() => cart.remove(product.id)}>
                        <Trash2 size={16} aria-hidden="true" /> Retirer
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link href="/boutique" className="mt-6 inline-flex items-center gap-2 font-medium text-primary">
            <ArrowLeft size={16} aria-hidden="true" /> Continuer mes achats
          </Link>
        </section>

        <aside aria-label="Récapitulatif" className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <div className="card p-5 sm:p-6">
            <h2 className="font-serif text-2xl">Récapitulatif</h2>
            <dl className="mt-4 space-y-2.5 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-text-2">Sous-total</dt>
                <dd className="font-medium">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-2">Livraison</dt>
                <dd className="text-right">{cheapest ? (cheapest.priceCents === 0 ? "Dès 0 €" : `Dès ${formatPrice(cheapest.priceCents)}`) : "À l'étape suivante"}</dd>
              </div>
            </dl>
            {toFree !== null && freeRule && (
              <p className="mt-3 rounded-xl bg-primary-light px-3 py-2 text-sm text-primary">
                Plus que {formatPrice(toFree)} pour profiter de la livraison offerte ({freeRule.name.toLowerCase()}).
              </p>
            )}
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <span className="font-semibold">Total estimé</span>
              <span className="text-xl font-semibold">{formatPrice(subtotal + (cheapest?.priceCents ?? 0))}</span>
            </div>
            {!state.ordersOpen ? (
              <p className="mt-5 rounded-xl bg-primary-light p-3 text-sm font-medium text-primary">{state.closedMessage || "Les commandes sont momentanément en pause."}</p>
            ) : (
              <Link
                href="/commande"
                aria-disabled={sellable.length === 0}
                className={`btn btn-primary mt-5 hidden w-full md:flex ${sellable.length === 0 ? "pointer-events-none opacity-50" : ""}`}
              >
                <Lock size={16} aria-hidden="true" /> Commander
              </Link>
            )}
            <p className="mt-3 text-center text-xs text-text-2">Livraison et total définitif à l&apos;étape suivante.</p>
          </div>
        </aside>
      </div>

      {/* Mobile : bouton de commande toujours sous le pouce. */}
      {state.ordersOpen && sellable.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <Link href="/commande" className="btn btn-primary w-full">
            <Lock size={16} aria-hidden="true" /> Commander · {formatPrice(subtotal)}
          </Link>
        </div>
      )}
    </div>
  );
}
