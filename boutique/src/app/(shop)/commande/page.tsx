import type { Metadata } from "next";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { getSettings } from "@/lib/server/cached";
import { query } from "@/lib/server/db";
import { vatMention } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getSettings();
  const methods = await query<{
    id: string;
    name: string;
    description: string;
    price_cents: number;
    free_over_cents: number | null;
    countries: string[];
    requires_address: boolean;
    delivery_estimate: string;
  }>("SELECT id, name, description, price_cents, free_over_cents, countries, requires_address, delivery_estimate FROM shipping_method WHERE is_active ORDER BY position, name");
  return (
    <CheckoutForm
      methods={methods.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        priceCents: m.price_cents,
        freeOverCents: m.free_over_cents,
        countries: m.countries,
        requiresAddress: m.requires_address,
        estimate: m.delivery_estimate,
      }))}
      vatMention={vatMention(settings)}
      ordersOpen={settings.ordersOpen}
      closedMessage={settings.closedMessage}
    />
  );
}
