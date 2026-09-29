import { Check, Clock, FileText, Package, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCartAfterPayment, RefreshWhilePending } from "@/components/shop/order-client";
import { countryName, formatDate, formatPrice } from "@/lib/format";
import { CUSTOMER_STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { getSettings } from "@/lib/server/cached";
import { errorMessage, reportEvent } from "@/lib/server/monitoring";
import { findOrderByToken, syncPendingOrder } from "@/lib/server/orders";

export const metadata: Metadata = { title: "Votre commande", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ merci?: string }> };

const STEPS: { status: OrderStatus[]; label: string; icon: typeof Check }[] = [
  { status: ["paid", "preparing", "shipped", "completed"], label: "Confirmée", icon: Check },
  { status: ["preparing", "shipped", "completed"], label: "En préparation", icon: Package },
  { status: ["shipped", "completed"], label: "Expédiée", icon: Truck },
];

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ token }, { merci }] = await Promise.all([params, searchParams]);
  let order = await findOrderByToken(token);
  if (!order) notFound();
  if (order.status === "pending") {
    // Le webhook peut avoir quelques secondes de retard : on vérifie directement.
    try {
      await syncPendingOrder(order.id);
      order = (await findOrderByToken(token))!;
    } catch (err) {
      await reportEvent("warning", "confirmation", "Vérification du paiement impossible", { error: errorMessage(err) });
    }
  }
  const settings = await getSettings();
  const status = order.status as OrderStatus;
  const paid = !["pending", "expired"].includes(status);
  const pickup = !order.requiresAddress;

  return (
    <div className="container-page max-w-3xl pt-8 pb-16">
      {merci === "1" && paid && <ClearCartAfterPayment />}
      {status === "pending" && <RefreshWhilePending />}

      {status === "pending" ? (
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-info-bg text-info">
            <Clock size={26} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-4xl">Paiement en cours de confirmation…</h1>
          <p className="mt-3 text-text-2">Cela ne prend généralement que quelques secondes. Cette page se met à jour toute seule.</p>
        </div>
      ) : status === "expired" ? (
        <div className="text-center">
          <h1 className="text-4xl">Paiement non finalisé</h1>
          <p className="mt-3 text-text-2">Aucun montant n&apos;a été débité. Votre panier vous attend si vous souhaitez réessayer.</p>
          <Link href="/panier" className="btn btn-primary mt-6">
            Retour au panier
          </Link>
        </div>
      ) : (
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
            <Check size={28} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-5">Commande {order.number}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{merci === "1" ? `Merci ${order.firstName} !` : CUSTOMER_STATUS_LABEL[status]}</h1>
          <p className="mx-auto mt-3 max-w-lg text-text-2">
            {status === "cancelled" || status === "refunded"
              ? `Cette commande a été ${status === "cancelled" ? "annulée" : "remboursée"}. Le remboursement de ${formatPrice(order.refundedCents || order.totalCents)} apparaît sous quelques jours sur votre moyen de paiement.`
              : merci === "1"
                ? `Votre commande est confirmée. Un e-mail récapitulatif vient d'être envoyé à ${order.email}. Chaque bijou est préparé à la main : nous vous prévenons dès ${pickup ? "qu'elle est prête" : "son expédition"}.`
                : `Commande passée le ${formatDate(order.createdAt)}.`}
          </p>
        </div>
      )}

      {paid && status !== "cancelled" && status !== "refunded" && (
        <ol className="mt-10 grid grid-cols-3 gap-2" aria-label="Avancement de la commande">
          {STEPS.map((s) => {
            const done = s.status.includes(status);
            const Icon = s.icon;
            return (
              <li key={s.label} className="flex flex-col items-center gap-2 text-center text-sm">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? "bg-primary text-on-primary" : "bg-surface-2 text-text-2"}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className={done ? "font-semibold" : "text-text-2"}>
                  {pickup && s.label === "Expédiée" ? "Prête" : s.label}
                  <span className="sr-only">{done ? " (fait)" : " (à venir)"}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {paid && (order.trackingUrl || order.trackingNumber) && (
        <div className="card mt-8 flex flex-wrap items-center justify-between gap-3 p-5">
          <p>
            <strong>Suivi du colis</strong>
            {order.trackingNumber && <span className="block text-sm text-text-2">N° {order.trackingNumber}</span>}
          </p>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
              Suivre mon colis
            </a>
          )}
        </div>
      )}

      {status !== "expired" && (
        <section className="card mt-8 p-5 sm:p-7" aria-labelledby="titre-recap">
          <h2 id="titre-recap" className="font-serif text-2xl">
            Récapitulatif
          </h2>
          <ul className="mt-4 divide-y divide-border">
            {order.items.map((i) => (
              <li key={`${i.slug}-${i.name}`} className="flex justify-between gap-4 py-3 text-[15px]">
                <span>
                  {i.name}
                  {i.quantity > 1 && <span className="text-text-2"> × {i.quantity}</span>}
                </span>
                <span className="font-medium">{formatPrice(i.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-1.5 border-t border-border pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-text-2">Sous-total</dt>
              <dd>{formatPrice(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-2">Livraison ({order.shippingMethodName})</dt>
              <dd>{order.shippingCents ? formatPrice(order.shippingCents) : "Offerte"}</dd>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between">
                <dt className="text-text-2">Réduction</dt>
                <dd>− {formatPrice(order.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-2 text-lg font-semibold">
              <dt>Total</dt>
              <dd>{formatPrice(order.totalCents)}</dd>
            </div>
          </dl>
          {!order.anonymized && (
            <div className="mt-6 grid gap-6 border-t border-border pt-5 text-[15px] sm:grid-cols-2">
              <div>
                <p className="font-semibold">{pickup ? "Retrait" : "Livraison"}</p>
                {pickup ? (
                  <p className="text-text-2">{order.shippingMethodName} — nous vous contactons pour convenir du rendez-vous.</p>
                ) : (
                  <address className="text-text-2 not-italic">
                    {order.firstName} {order.lastName}
                    <br />
                    {order.address.line1}
                    {order.address.line2 && (
                      <>
                        <br />
                        {order.address.line2}
                      </>
                    )}
                    <br />
                    {order.address.postalCode} {order.address.city}
                    <br />
                    {countryName(order.address.country)}
                  </address>
                )}
              </div>
              <div>
                <p className="font-semibold">Une question ?</p>
                <p className="text-text-2">
                  Indiquez votre numéro de commande <strong>{order.number}</strong>
                  {settings.contactEmail && (
                    <>
                      {" "}
                      à <a href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent(`Commande ${order.number}`)}`}>{settings.contactEmail}</a>
                    </>
                  )}
                  .
                </p>
              </div>
            </div>
          )}
          {paid && order.invoiceNumber && (
            <Link href={`/commande/suivi/${token}/facture`} className="btn btn-outline btn-sm mt-6">
              <FileText size={16} aria-hidden="true" /> Voir le justificatif de commande
            </Link>
          )}
        </section>
      )}

      <div className="mt-10 text-center">
        <Link href="/boutique" className="btn btn-ghost">
          Retour à la boutique
        </Link>
      </div>
    </div>
  );
}
