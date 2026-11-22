import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/shop/order-client";
import { countryName, formatDate, formatMoney } from "@/lib/format";
import { getSettings } from "@/lib/server/cached";
import { findOrderByToken } from "@/lib/server/orders";
import { missingLegalInfo, vatMention } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Justificatif de commande", robots: { index: false, follow: false }, referrer: "no-referrer" };

// Document imprimable. Il n'est intitulé « Facture » que lorsque toutes les
// informations légales du vendeur sont renseignées (sinon : « Récapitulatif »).
export default async function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await findOrderByToken(token);
  if (!order || !order.invoiceNumber || !order.paidAt) notFound();
  const s = await getSettings();
  const complete = missingLegalInfo(s).length === 0;
  const mention = order.vatRegime === "franchise" ? "TVA non applicable, art. 293 B du CGI" : vatMention(s);
  return (
    <div className="container-page max-w-3xl py-8">
      <div className="mb-6 flex justify-end">
        <PrintButton />
      </div>
      <article className="card p-6 text-[14px] leading-relaxed sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap justify-between gap-6">
          <div>
            <p className="font-serif text-2xl">{s.shopName}</p>
            <p className="mt-1 whitespace-pre-line text-text-2">
              {[s.legal.name, s.legal.status, s.legal.address, s.legal.siret && `SIRET ${s.legal.siret}`, s.legal.registration, s.legal.vatNumber && `TVA ${s.legal.vatNumber}`]
                .filter(Boolean)
                .join("\n")}
            </p>
          </div>
          <div className="text-right">
            <h1 className="font-sans text-xl font-semibold">{complete ? "Facture" : "Récapitulatif de commande"}</h1>
            <p>N° {order.invoiceNumber}</p>
            <p>Date : {formatDate(order.paidAt)}</p>
            <p>Commande {order.number}</p>
          </div>
        </header>
        <section className="mt-8">
          <p className="font-semibold">Client</p>
          <p className="text-text-2">
            {order.firstName} {order.lastName}
            {order.requiresAddress && !order.anonymized && (
              <>
                <br />
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ""}
                <br />
                {order.address.postalCode} {order.address.city}, {countryName(order.address.country)}
              </>
            )}
          </p>
        </section>
        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 font-semibold">Désignation</th>
              <th className="py-2 text-right font-semibold">Qté</th>
              <th className="py-2 text-right font-semibold">Prix unitaire</th>
              <th className="py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.name} className="border-b border-border">
                <td className="py-2">{i.name}</td>
                <td className="py-2 text-right">{i.quantity}</td>
                <td className="py-2 text-right">{formatMoney(i.unitPriceCents)}</td>
                <td className="py-2 text-right">{formatMoney(i.lineTotalCents)}</td>
              </tr>
            ))}
            <tr className="border-b border-border">
              <td className="py-2" colSpan={3}>
                Livraison — {order.shippingMethodName}
              </td>
              <td className="py-2 text-right">{formatMoney(order.shippingCents)}</td>
            </tr>
            {order.discountCents > 0 && (
              <tr className="border-b border-border">
                <td className="py-2" colSpan={3}>
                  Réduction
                </td>
                <td className="py-2 text-right">− {formatMoney(order.discountCents)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-4 ml-auto w-full max-w-xs space-y-1">
          <p className="flex justify-between text-base font-semibold">
            <span>Total {order.vatRegime === "assujetti" ? "TTC" : ""}</span>
            <span>{formatMoney(order.totalCents)}</span>
          </p>
          {order.vatRegime === "assujetti" && order.vatCents !== null && (
            <p className="flex justify-between text-text-2">
              <span>dont TVA</span>
              <span>{formatMoney(order.vatCents)}</span>
            </p>
          )}
          <p className="text-text-2">Payée le {formatDate(order.paidAt)} par carte (Stripe)</p>
          {order.refundedCents > 0 && <p className="text-text-2">Remboursée : {formatMoney(order.refundedCents)}</p>}
        </div>
        {mention && <p className="mt-8 text-text-2">{mention}</p>}
      </article>
    </div>
  );
}
