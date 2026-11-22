import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Img } from "@/components/ui/img";
import { countryName, formatDate } from "@/lib/format";
import { imageSrc } from "@/lib/image-ref";
import { adminOrder } from "@/lib/server/admin-queries";
import { requireAdminPage } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/cached";
import { query } from "@/lib/server/db";
import { siteUrl } from "@/lib/server/env";
import { PrintButton } from "./print-button";

export const metadata = { title: "Bons de préparation" };

// Bons de préparation à imprimer (A4, un par page). Volontairement SANS prix :
// le bon peut être glissé dans le colis, même pour un cadeau.
export default async function PackingSlips({ searchParams }: { searchParams: Promise<{ commande?: string }> }) {
  await requireAdminPage();
  const { commande } = await searchParams;
  const all = !commande || commande === "a-preparer";
  const ids = all
    ? (await query<{ id: string }>("SELECT id FROM customer_order WHERE status IN ('paid', 'preparing') ORDER BY paid_at")).map((r) => r.id)
    : [commande];
  const orders = (await Promise.all(ids.map((id) => adminOrder(id)))).filter((o) => o !== null);
  if (!all && orders.length === 0) notFound();
  const settings = await getSettings();
  const site = siteUrl().replace(/^https?:\/\//, "");

  return (
    <div className="slips mx-auto max-w-[210mm] px-4 py-6 print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={all ? "/admin" : `/admin/commandes/${commande}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          <ArrowLeft size={16} aria-hidden="true" /> Retour
        </Link>
        {orders.length > 0 && <PrintButton label={orders.length > 1 ? `Imprimer les ${orders.length} bons` : "Imprimer le bon"} />}
      </div>
      {orders.length === 0 && <p className="card p-6 text-text-2">Aucune commande à préparer : rien à imprimer.</p>}

      {orders.map(({ order: o, items }) => {
        const pickup = !o.shipping_requires_address;
        const count = items.reduce((n, i) => n + i.quantity, 0);
        return (
          <article key={String(o.id)} className="slip mb-8 rounded-2xl border border-border bg-surface p-8 text-[14px] text-text shadow-soft print:mb-0 print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <header className="flex items-start justify-between gap-6 border-b border-border pb-5">
              <div className="flex items-center gap-3">
                {settings.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageSrc(settings.logo, 320)} alt="" className="h-14 w-14 rounded-full object-cover" />
                )}
                <div>
                  <p className="font-serif text-2xl leading-tight">{settings.shopName}</p>
                  <p className="text-xs text-text-2">{site}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold tracking-[0.14em] text-text-2 uppercase">Bon de préparation</p>
                <p className="text-xl font-semibold">{String(o.number)}</p>
                <p className="text-xs text-text-2">Commande du {formatDate(o.paid_at as Date)}</p>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-6 py-5">
              <section>
                <h2 className="mb-1 font-sans text-xs font-semibold tracking-[0.14em] text-text-2 uppercase">{pickup ? "Cliente" : "Livrer à"}</h2>
                <p className="text-base font-semibold">
                  {String(o.first_name)} {String(o.last_name)}
                </p>
                {!pickup && (
                  <p className="leading-snug">
                    {String(o.ship_line1 ?? "")}
                    {o.ship_line2 ? (
                      <>
                        <br />
                        {String(o.ship_line2)}
                      </>
                    ) : null}
                    <br />
                    {String(o.ship_postal_code ?? "")} {String(o.ship_city ?? "")}
                    <br />
                    {countryName(String(o.ship_country ?? "FR"))}
                  </p>
                )}
                {o.phone ? <p className="mt-1 text-text-2">Tél. {String(o.phone)}</p> : null}
                <p className="text-text-2">{String(o.email)}</p>
              </section>
              <section>
                <h2 className="mb-1 font-sans text-xs font-semibold tracking-[0.14em] text-text-2 uppercase">Livraison</h2>
                <p className="text-base font-semibold">{String(o.shipping_method_name)}</p>
                <p className="text-text-2">
                  {count} article{count > 1 ? "s" : ""}
                </p>
              </section>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-[0.1em] text-text-2 uppercase">
                  <th className="w-8 py-2 font-semibold">
                    <span className="sr-only">Préparé</span>
                  </th>
                  <th className="py-2 font-semibold" colSpan={2}>
                    Création
                  </th>
                  <th className="py-2 text-right font-semibold">Quantité</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={`${i.product_name}-${i.product_sku}`} className="border-b border-border">
                    <td className="py-3 align-middle">
                      <span className="block h-5 w-5 rounded border-2 border-border-strong" aria-hidden="true" />
                    </td>
                    <td className="w-16 py-3">
                      <span className="block h-12 w-12 overflow-hidden rounded-lg bg-surface-2">
                        <Img image={i.image} alt="" sizes="48px" className="h-full w-full" />
                      </span>
                    </td>
                    <td className="py-3">
                      <p className="font-medium">{i.product_name}</p>
                      {i.product_sku && <p className="text-xs text-text-2">Réf. {i.product_sku}</p>}
                    </td>
                    <td className="py-3 text-right text-lg font-semibold tabular-nums">× {i.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <footer className="mt-10 text-center">
              <p className="font-serif text-2xl">Merci pour votre commande ✨</p>
              <p className="mt-1 text-text-2">
                Chaque bijou est fait main avec soin. Une question ? {settings.contactEmail || site}
              </p>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
