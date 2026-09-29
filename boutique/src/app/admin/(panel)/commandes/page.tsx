import { AlertTriangle, ChevronRight, Download, Inbox } from "lucide-react";
import Link from "next/link";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { OrderSearch } from "@/components/admin/order-search";
import { formatDateTime, formatPrice } from "@/lib/format";
import { adminOrders } from "@/lib/server/admin-queries";

export const metadata = { title: "Commandes" };

const FILTERS = [
  { v: "", label: "Toutes" },
  { v: "a-preparer", label: "À préparer" },
  { v: "shipped", label: "Expédiées" },
  { v: "completed", label: "Terminées" },
  { v: "cancelled", label: "Annulées" },
  { v: "refunded", label: "Remboursées" },
  { v: "non-abouties", label: "Paiements non aboutis" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string }> }) {
  const sp = await searchParams;
  const rows = await adminOrders({ status: sp.statut, q: sp.q });
  const qs = (statut: string) => {
    const p = new URLSearchParams();
    if (statut) p.set("statut", statut);
    if (sp.q) p.set("q", sp.q);
    return p.size ? `?${p}` : "";
  };
  return (
    <>
      <PageTitle
        title="Commandes"
        subtitle={`${rows.length} commande${rows.length > 1 ? "s" : ""}`}
        actions={
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- téléchargement de fichier, pas une page
          <a href="/api/admin/export/commandes" className="btn btn-outline btn-sm">
            <Download size={16} aria-hidden="true" /> Exporter (tableur)
          </a>
        }
      />
      <OrderSearch initial={sp.q ?? ""} statut={sp.statut ?? ""} />
      <nav aria-label="Filtrer les commandes" className="-mx-4 mb-4 overflow-x-auto px-4 no-scrollbar">
        <ul className="flex gap-2">
          {FILTERS.map((f) => (
            <li key={f.v}>
              <Link href={`/admin/commandes${qs(f.v)}`} className="chip" aria-current={(sp.statut ?? "") === f.v ? "page" : undefined}>
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Inbox size={32} className="text-text-2" aria-hidden="true" />
          <p className="font-serif text-2xl">{sp.q ? "Aucune commande trouvée" : "Aucune commande ici"}</p>
          <p className="text-text-2">Les nouvelles commandes apparaissent ici dès que le paiement est confirmé, et vous recevez un e-mail.</p>
        </div>
      ) : (
        <ul className="card divide-y divide-border">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/commandes/${o.id}`} className="flex items-center gap-3 p-4 no-underline hover:bg-secondary/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {o.first_name} {o.last_name}
                    {o.needs_attention && <AlertTriangle size={16} className="ml-2 inline text-warning" aria-label="À vérifier" />}
                  </p>
                  <p className="text-sm text-text-2">
                    {o.number} · {formatDateTime(o.paid_at ?? o.created_at)} · {o.item_count} article{Number(o.item_count) > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold">{formatPrice(o.total_cents)}</span>
                  <StatusBadge status={o.status} />
                </div>
                <ChevronRight size={18} className="text-text-2" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
