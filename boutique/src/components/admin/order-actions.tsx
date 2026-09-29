"use client";

import { Check, Package, RotateCcw, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { anonymizeOrderAction, clearAttentionAction, orderNoteAction, refundOrderAction, retryEmailsAction, setOrderStatusAction } from "@/app/admin/actions";
import { canCancel, canRefund, type OrderStatus } from "@/lib/order-status";
import { useConfirm, useToast } from "./ui";

// Les actions de préparation, dans l'ordre naturel du travail.
export function OrderActions({
  orderId,
  status,
  pickup,
  trackingNumber,
  trackingUrl,
  note,
  needsAttention,
  anonymized,
  emailsFailed,
}: {
  orderId: string;
  status: OrderStatus;
  pickup: boolean;
  trackingNumber: string;
  trackingUrl: string;
  note: string;
  needsAttention: boolean;
  anonymized: boolean;
  emailsFailed: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [tracking, setTracking] = useState({ trackingNumber, trackingUrl });
  const [memo, setMemo] = useState(note);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast(success);
        router.refresh();
      } else toast(res.error ?? "Erreur", "error");
    });

  const ship = () => run(() => setOrderStatusAction(orderId, "shipped", tracking), pickup ? "Commande prête : la cliente est prévenue par e-mail." : "Expédiée : la cliente reçoit un e-mail avec le suivi.");

  const refund = async (cancel: boolean) => {
    let restock = cancel;
    const ok = await confirm({
      title: cancel ? "Annuler et rembourser la commande ?" : "Rembourser la commande ?",
      message: (
        <div className="space-y-3">
          <p>La cliente sera remboursée intégralement sur son moyen de paiement et prévenue par e-mail. Cette action est définitive.</p>
          <label className="flex items-center gap-2 text-text">
            <input type="checkbox" defaultChecked={cancel} onChange={(e) => (restock = e.target.checked)} className="h-5 w-5 accent-[var(--c-primary)]" />
            Remettre les articles en stock
          </label>
        </div>
      ),
      confirmLabel: cancel ? "Annuler et rembourser" : "Rembourser",
      danger: true,
    });
    if (ok) run(() => refundOrderAction(orderId, cancel, restock), cancel ? "Commande annulée et remboursée." : "Commande remboursée.");
  };

  return (
    <section className="card space-y-5 p-5" aria-labelledby="titre-suivi">
      <h2 id="titre-suivi" className="font-sans text-base font-semibold">
        Suivi
      </h2>

      {status === "paid" && (
        <button type="button" className="btn btn-outline w-full" disabled={pending} onClick={() => run(() => setOrderStatusAction(orderId, "preparing"), "Commande passée en préparation.")}>
          <Package size={18} aria-hidden="true" /> Je commence la préparation
        </button>
      )}

      {(status === "paid" || status === "preparing") && (
        <div className="space-y-3 rounded-2xl bg-secondary/60 p-4">
          {!pickup && (
            <>
              <label className="block">
                <span className="field-label">N° de suivi (facultatif)</span>
                <input className="input" value={tracking.trackingNumber} maxLength={80} onChange={(e) => setTracking({ ...tracking, trackingNumber: e.target.value })} />
              </label>
              <label className="block">
                <span className="field-label">Lien de suivi (facultatif)</span>
                <input className="input" type="url" inputMode="url" placeholder="https://www.laposte.fr/outils/suivre-vos-envois?code=…" value={tracking.trackingUrl} onChange={(e) => setTracking({ ...tracking, trackingUrl: e.target.value })} />
              </label>
            </>
          )}
          <button type="button" className="btn btn-primary w-full" disabled={pending} onClick={ship}>
            <Truck size={18} aria-hidden="true" /> {pickup ? "Commande prête (prévenir la cliente)" : "Marquer comme expédiée"}
          </button>
        </div>
      )}

      {status === "shipped" && (
        <button type="button" className="btn btn-outline w-full" disabled={pending} onClick={() => run(() => setOrderStatusAction(orderId, "completed"), "Commande terminée.")}>
          <Check size={18} aria-hidden="true" /> Terminer (bien reçue)
        </button>
      )}

      {needsAttention && (
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => clearAttentionAction(orderId), "Alerte retirée.")}>
          C&apos;est traité : retirer l&apos;alerte
        </button>
      )}
      {emailsFailed && (
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => retryEmailsAction(orderId), "E-mails renvoyés.")}>
          Renvoyer les e-mails en échec
        </button>
      )}

      <label className="block">
        <span className="field-label">Note interne (invisible pour la cliente)</span>
        <textarea className="input !min-h-20" value={memo} maxLength={2000} onChange={(e) => setMemo(e.target.value)} onBlur={() => memo !== note && run(() => orderNoteAction(orderId, memo), "Note enregistrée.")} />
      </label>

      {(canCancel(status) || canRefund(status) || (!anonymized && !["paid", "preparing", "pending"].includes(status))) && (
        <details className="border-t border-border pt-4">
          <summary className="text-sm font-semibold text-text-2">Annulation, remboursement, données</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {canCancel(status) && (
              <button type="button" className="btn btn-outline btn-sm text-error" disabled={pending} onClick={() => refund(true)}>
                Annuler et rembourser
              </button>
            )}
            {canRefund(status) && (
              <button type="button" className="btn btn-outline btn-sm text-error" disabled={pending} onClick={() => refund(false)}>
                <RotateCcw size={15} aria-hidden="true" /> Rembourser
              </button>
            )}
            {!anonymized && !["paid", "preparing", "pending"].includes(status) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={pending}
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Effacer les données personnelles ?",
                      message: "Pour une demande d'effacement (RGPD) : nom, e-mail, téléphone et adresse sont supprimés. Les montants restent pour la comptabilité. Définitif.",
                      confirmLabel: "Effacer",
                      danger: true,
                    })
                  )
                    run(() => anonymizeOrderAction(orderId), "Données personnelles effacées.");
                }}
              >
                Effacer les données de la cliente
              </button>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
