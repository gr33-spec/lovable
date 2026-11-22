"use client";

import { Check, Clock, Hand, Mail, MessageCircle, Package, Phone, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { reservationAction } from "@/app/admin/actions";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { AdminReservation, ReservationStatus } from "@/lib/server/reservations";
import { DELIVERY_LABELS, whatsappUrl } from "@/lib/shared";
import { Img } from "../ui/img";
import { useConfirm, useToast } from "./ui";

// Liste des réservations : tout ce qu'il faut pour rappeler la cliente et
// décider (confirmer, ou annuler et remettre le bijou en vente).

const STATUS: Record<ReservationStatus, { label: string; tone: string }> = {
  pending: { label: "En attente", tone: "bg-warning-bg text-warning" },
  confirmed: { label: "Confirmée", tone: "bg-success-bg text-success" },
  cancelled: { label: "Annulée", tone: "bg-soldout-bg text-soldout" },
  expired: { label: "Expirée", tone: "bg-soldout-bg text-soldout" },
};

function hoursLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "délai dépassé";
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `libérée dans ${h} h` : `libérée dans ${Math.max(1, Math.round(ms / 60_000))} min`;
}

function Row({ r, shopName, autoExpire }: { r: AdminReservation; shopName: string; autoExpire: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, start] = useTransition();
  const wa = whatsappUrl(r.phone);
  const message = `Bonjour ${r.firstName}, c'est ${shopName} au sujet de votre réservation « ${r.productName} ».`;
  const tel = `tel:${r.phone.replace(/[^\d+]/g, "")}`;

  const act = async (action: "confirm" | "cancel") => {
    // La confirmation est demandée AVANT la transition (sinon la fenêtre ne s'affiche pas).
    if (action === "cancel") {
      const ok = await confirm({
        title: "Annuler cette réservation ?",
        message: `« ${r.productName} » redeviendra disponible à la réservation pour les autres clientes.`,
        confirmLabel: "Annuler et remettre disponible",
        danger: true,
      });
      if (!ok) return;
    }
    start(async () => {
      const res = await reservationAction(r.id, action);
      if (res.ok) {
        toast(action === "confirm" ? "Réservation confirmée." : "Réservation annulée : le bijou est de nouveau disponible.");
        router.refresh();
      } else toast(res.error, "error");
    });
  };

  return (
    <li className="card p-4 sm:p-5">
      <div className="flex gap-3.5">
        <Link href={`/admin/produits/${r.productId}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-2" aria-label={`Voir le produit ${r.productName}`}>
          <Img image={r.image} alt="" sizes="80px" className="h-full w-full" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${STATUS[r.status].tone}`}>{STATUS[r.status].label}</span>
            {r.status === "pending" && autoExpire && (
              <span className="inline-flex items-center gap-1 text-xs text-text-2" suppressHydrationWarning>
                <Clock size={13} aria-hidden="true" /> {hoursLeft(r.expiresAt)}
              </span>
            )}
          </div>
          <p className="mt-1 truncate font-semibold">{r.productName}</p>
          <p className="text-sm text-text-2">
            {r.productSku ? `Réf. ${r.productSku} · ` : ""}
            {formatPrice(r.priceCents)}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-sm text-text-2">Cliente</dt>
          <dd className="font-semibold">{r.firstName}</dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-sm text-text-2">Téléphone</dt>
          <dd>
            <a href={tel} className="font-semibold text-primary">
              {r.phone}
            </a>
          </dd>
        </div>
        {r.email && (
          <div className="flex justify-between gap-3 sm:block">
            <dt className="text-sm text-text-2">E-mail</dt>
            <dd className="min-w-0 truncate">
              <a href={`mailto:${r.email}`} className="text-primary">
                {r.email}
              </a>
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-sm text-text-2">Remise</dt>
          <dd className="inline-flex items-center gap-1.5">
            {r.delivery === "post" ? <Package size={15} aria-hidden="true" /> : <Hand size={15} aria-hidden="true" />}
            {DELIVERY_LABELS[r.delivery]}
          </dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-sm text-text-2">Demande</dt>
          <dd>{formatDateTime(r.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-sm text-text-2">N°</dt>
          <dd className="tabular-nums">{r.number}</dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <a href={tel} className="btn btn-outline btn-sm">
          <Phone size={16} aria-hidden="true" /> Appeler
        </a>
        {wa && (
          <a href={`${wa}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
            <MessageCircle size={16} aria-hidden="true" /> Contacter sur WhatsApp
          </a>
        )}
        {r.email && (
          <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Votre réservation — ${r.productName}`)}`} className="btn btn-outline btn-sm">
            <Mail size={16} aria-hidden="true" /> E-mail
          </a>
        )}
      </div>

      {(r.status === "pending" || r.status === "confirmed") && (
        <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:flex sm:justify-end">
          {r.status === "pending" && (
            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => act("confirm")}>
              <Check size={16} aria-hidden="true" /> Confirmer
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm text-error" disabled={pending} onClick={() => act("cancel")}>
            <RotateCcw size={16} aria-hidden="true" /> Annuler · remettre disponible
          </button>
        </div>
      )}
    </li>
  );
}

export function ReservationList({ rows, shopName, autoExpire }: { rows: AdminReservation[]; shopName: string; autoExpire: boolean }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <Row key={r.id} r={r} shopName={shopName} autoExpire={autoExpire} />
      ))}
    </ul>
  );
}
