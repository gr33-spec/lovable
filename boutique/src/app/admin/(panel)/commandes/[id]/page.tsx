import { AlertTriangle, ArrowLeft, Mail, Phone, Printer } from "lucide-react";
import { requireAdminPage } from "@/lib/server/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/order-actions";
import { StatusBadge } from "@/components/admin/ui";
import { Img } from "@/components/ui/img";
import { countryName, formatDateTime, formatMoney } from "@/lib/format";
import type { OrderStatus } from "@/lib/order-status";
import { adminOrder } from "@/lib/server/admin-queries";

export const metadata = { title: "Commande" };

const EMAIL_LABEL: Record<string, string> = {
  order_confirmation: "Confirmation à la cliente",
  admin_new_order: "Notification de nouvelle commande",
  order_shipped: "Avis d'expédition",
  order_refunded: "Avis de remboursement",
  order_cancelled: "Avis d'annulation",
};

const ACTION_LABEL: Record<string, string> = {
  order_status: "Statut modifié",
  order_note: "Note modifiée",
  order_cancelled: "Commande annulée et remboursée",
  order_refunded: "Commande remboursée",
  order_anonymized: "Données personnelles effacées",
  order_attention_cleared: "Alerte marquée comme traitée",
  emails_retried: "Renvoi des e-mails",
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  // Chaque page vérifie elle-même la session : la mise en page (layout) est rendue en
  // parallèle et ne protège pas, à elle seule, les données de la page.
  await requireAdminPage();
  const { id } = await params;
  const data = await adminOrder(id);
  if (!data) notFound();
  const o = data.order as Record<string, string | number | boolean | null | Date>;
  const status = o.status as OrderStatus;
  const pickup = !o.shipping_requires_address;
  const date = (v: unknown) => (v ? formatDateTime(v as Date) : null);
  const itemCount = data.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div>
      <Link href="/admin/commandes" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        <ArrowLeft size={16} aria-hidden="true" /> Commandes
      </Link>
      <header className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl sm:text-4xl">Commande {String(o.number)}</h1>
        <StatusBadge status={status} />
        {o.paid_at && (
          <Link href={`/admin/bons?commande=${id}`} className="btn btn-outline btn-sm ml-auto">
            <Printer size={16} aria-hidden="true" /> Bon de préparation
          </Link>
        )}
      </header>

      {o.needs_attention && (
        <div className="mb-5 flex gap-3 rounded-2xl bg-warning-bg p-4 text-sm text-warning" role="alert">
          <AlertTriangle size={20} className="shrink-0" aria-hidden="true" />
          <p>
            <strong>À vérifier :</strong> {String(o.needs_attention)}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="titre-articles">
            <h2 id="titre-articles" className="font-sans text-base font-semibold">
              À préparer · {itemCount} article{itemCount > 1 ? "s" : ""}
            </h2>
            <ul className="mt-3 divide-y divide-border">
              {data.items.map((i) => (
                <li key={`${i.product_name}-${i.product_sku}`} className="flex items-center gap-3 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    <Img image={i.image} alt="" sizes="64px" className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {i.product_id ? (
                        <Link href={`/admin/produits/${i.product_id}`} className="no-underline hover:underline">
                          {i.product_name}
                        </Link>
                      ) : (
                        i.product_name
                      )}
                    </p>
                    <p className="text-sm text-text-2">
                      {formatMoney(i.unit_price_cents)}
                      {i.product_sku ? ` · Réf. ${i.product_sku}` : ""}
                    </p>
                  </div>
                  <span className={`badge text-sm ${i.quantity > 1 ? "bg-primary text-on-primary" : "bg-surface-2"}`}>× {i.quantity}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-2">Articles</dt>
                <dd>{formatMoney(Number(o.subtotal_cents))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-2">Livraison ({String(o.shipping_method_name)})</dt>
                <dd>{formatMoney(Number(o.shipping_cents))}</dd>
              </div>
              {Number(o.discount_cents) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-text-2">Réduction</dt>
                  <dd>− {formatMoney(Number(o.discount_cents))}</dd>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>Total payé</dt>
                <dd>{formatMoney(Number(o.total_cents))}</dd>
              </div>
              {Number(o.refunded_cents) > 0 && (
                <div className="flex justify-between text-error">
                  <dt>Remboursé</dt>
                  <dd>− {formatMoney(Number(o.refunded_cents))}</dd>
                </div>
              )}
            </dl>
          </section>

          <OrderActions
            orderId={id}
            status={status}
            pickup={pickup}
            trackingNumber={(o.tracking_number as string) ?? ""}
            trackingUrl={(o.tracking_url as string) ?? ""}
            note={String(o.admin_note ?? "")}
            needsAttention={Boolean(o.needs_attention)}
            anonymized={Boolean(o.anonymized_at)}
            emailsFailed={data.emails.some((e) => e.status === "failed")}
          />
        </div>

        <aside className="space-y-6">
          <section className="card p-5" aria-labelledby="titre-cliente">
            <h2 id="titre-cliente" className="font-sans text-base font-semibold">
              Cliente
            </h2>
            <p className="mt-2 font-medium">
              {String(o.first_name)} {String(o.last_name)}
            </p>
            {!o.anonymized_at && (
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>
                  <a href={`mailto:${o.email}?subject=${encodeURIComponent(`Votre commande ${o.number}`)}`} className="inline-flex items-center gap-2 text-primary">
                    <Mail size={15} aria-hidden="true" /> {String(o.email)}
                  </a>
                </li>
                {o.phone && (
                  <li>
                    <a href={`tel:${o.phone}`} className="inline-flex items-center gap-2 text-primary">
                      <Phone size={15} aria-hidden="true" /> {String(o.phone)}
                    </a>
                  </li>
                )}
              </ul>
            )}
            <h3 className="mt-5 text-sm font-semibold">{pickup ? "Retrait" : "Adresse de livraison"}</h3>
            {pickup ? (
              <p className="text-sm text-text-2">{String(o.shipping_method_name)} — à convenir avec la cliente.</p>
            ) : o.ship_line1 ? (
              <address className="mt-1 text-sm not-italic select-all">
                {String(o.first_name)} {String(o.last_name)}
                <br />
                {String(o.ship_line1)}
                {o.ship_line2 && (
                  <>
                    <br />
                    {String(o.ship_line2)}
                  </>
                )}
                <br />
                {String(o.ship_postal_code)} {String(o.ship_city)}
                <br />
                {countryName(o.ship_country as string)}
              </address>
            ) : (
              <p className="text-sm text-text-2">Adresse effacée (RGPD).</p>
            )}
          </section>

          <section className="card p-5 text-sm" aria-labelledby="titre-paiement">
            <h2 id="titre-paiement" className="font-sans text-base font-semibold">
              Paiement et historique
            </h2>
            <dl className="mt-2 space-y-1.5">
              {[
                ["Commande passée", date(o.created_at)],
                ["Payée", date(o.paid_at)],
                ["Expédiée", date(o.shipped_at)],
                ["Terminée", date(o.completed_at)],
                ["Annulée", date(o.cancelled_at)],
                ["Remboursée", date(o.refunded_at)],
                ["N° de facture", o.invoice_number as string | null],
                ["Mode", o.payment_livemode === false ? "Test (aucun argent réel)" : o.payment_livemode ? "Réel" : null],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-3">
                    <dt className="text-text-2">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
            </dl>
            {data.emails.length > 0 && (
              <>
                <h3 className="mt-4 font-semibold">E-mails</h3>
                <ul className="mt-1 space-y-1">
                  {data.emails.map((e) => (
                    <li key={e.kind} className="flex justify-between gap-3">
                      <span className="text-text-2">{EMAIL_LABEL[e.kind] ?? e.kind}</span>
                      <span className={e.status === "failed" ? "font-semibold text-error" : e.status === "sent" ? "text-success" : "text-text-2"}>
                        {e.status === "sent" ? "Envoyé" : e.status === "failed" ? "Échec" : "En attente"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {data.history.length > 0 && (
              <>
                <h3 className="mt-4 font-semibold">Actions</h3>
                <ul className="mt-1 space-y-1 text-text-2">
                  {data.history.map((h, i) => (
                    <li key={i}>
                      {formatDateTime(h.created_at)} — {ACTION_LABEL[h.action] ?? h.action}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
