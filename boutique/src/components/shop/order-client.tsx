"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cart } from "./cart-store";

/** Après un paiement réussi : panier vidé, données temporaires effacées. */
export function ClearCartAfterPayment() {
  useEffect(() => {
    cart.clear();
    try {
      sessionStorage.removeItem("boheme-paiement-en-cours");
      sessionStorage.removeItem("boheme-commande-v1");
    } catch {
      /* rien */
    }
  }, []);
  return null;
}

/** Paiement en cours de confirmation : la page se met à jour toute seule. */
export function RefreshWhilePending({ attempts = 10 }: { attempts?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n++;
      router.refresh();
      if (n >= attempts) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
  }, [router, attempts]);
  return null;
}

export function PrintButton() {
  return (
    <button type="button" className="btn btn-primary no-print" onClick={() => window.print()}>
      Imprimer / enregistrer en PDF
    </button>
  );
}
