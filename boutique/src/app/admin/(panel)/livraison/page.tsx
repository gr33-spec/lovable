import { ShippingManager } from "@/components/admin/shipping-manager";
import { requireAdminPage } from "@/lib/server/auth";
import { PageTitle } from "@/components/admin/ui";
import { shippingMethods } from "@/lib/server/admin-queries";

export const metadata = { title: "Livraison" };

export default async function ShippingPage() {
  // Chaque page vérifie elle-même la session : la mise en page (layout) est rendue en
  // parallèle et ne protège pas, à elle seule, les données de la page.
  await requireAdminPage();
  const methods = await shippingMethods();
  return (
    <>
      <PageTitle title="Livraison" subtitle="Les modes proposés à la cliente, leurs prix et les pays desservis. Seuls les modes actifs apparaissent." />
      <ShippingManager
        methods={methods.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          priceCents: m.price_cents,
          freeOverCents: m.free_over_cents,
          countries: m.countries,
          requiresAddress: m.requires_address,
          deliveryEstimate: m.delivery_estimate,
          isActive: m.is_active,
        }))}
      />
    </>
  );
}
