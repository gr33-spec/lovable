import type { Metadata } from "next";
import { Listing, type RawParams } from "@/components/shop/listing";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== "tri");
  return {
    title: sp.q ? `Recherche « ${String(sp.q).slice(0, 60)} »` : "Toutes les créations",
    description: "Bijoux et créations en résine pailletée, faits main : boucles d'oreilles, pendentifs, broches…",
    alternates: { canonical: "/boutique" },
    // Les pages de recherche et de filtres ne sont pas indexées (contenu dupliqué).
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  return <Listing params={await searchParams} />;
}
