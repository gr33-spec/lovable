import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/legal-page";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default function Page() {
  return <LegalPage slug="mentions-legales" />;
}
