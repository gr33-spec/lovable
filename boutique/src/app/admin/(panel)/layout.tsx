import { AdminNav } from "@/components/admin/nav";
import { AdminProviders } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/cached";
import { queryOne } from "@/lib/server/db";
import { RESERVATION_MODE } from "@/lib/sales-mode";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const [settings, pending] = await Promise.all([
    getSettings(),
    // Pastille du menu : réservations en attente (mode réservation) ou commandes à préparer.
    queryOne<{ n: string }>(
      RESERVATION_MODE ? "SELECT count(*) AS n FROM reservation WHERE status = 'pending'" : "SELECT count(*) AS n FROM customer_order WHERE status IN ('paid', 'preparing')",
    ),
  ]);
  return (
    <AdminProviders>
    <div className="lg:flex">
      <AdminNav shopName={settings.shopName} toPrepare={Number(pending?.n ?? 0)} adminName={admin.name || admin.email} />
      <main id="contenu" className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
    </AdminProviders>
  );
}
