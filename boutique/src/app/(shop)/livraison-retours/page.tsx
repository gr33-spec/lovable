import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/legal-page";

export const metadata: Metadata = { title: "Livraison et retours", alternates: { canonical: "/livraison-retours" } };

export default function Page() {
  return <LegalPage slug="livraison-retours" />;
}
