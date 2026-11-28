import { notFound } from "next/navigation";
import { FakePaymentPage } from "@/components/shop/fake-payment";
import { formatPrice } from "@/lib/format";
import { paymentConfig } from "@/lib/server/env";
import { payments } from "@/lib/server/payments";
import type { FakeProvider } from "@/lib/server/payments/fake";

export const metadata = { title: "Simulateur de paiement", robots: { index: false } };

export default async function DevPayment({ params }: { params: Promise<{ id: string }> }) {
  const cfg = paymentConfig();
  if (!cfg.ok || cfg.provider !== "fake") notFound();
  const { id } = await params;
  const provider = payments() as FakeProvider;
  let req;
  try {
    req = provider.requestOf(id);
  } catch {
    notFound();
  }
  const total = req.lines.reduce((s, l) => s + l.unitAmountCents * l.quantity, 0) + req.shipping.amountCents;
  return <FakePaymentPage sessionId={id} email={req.email} total={formatPrice(total)} successUrl={req.successUrl} cancelUrl={req.cancelUrl} lines={req.lines.map((l) => `${l.name} × ${l.quantity}`)} />;
}
