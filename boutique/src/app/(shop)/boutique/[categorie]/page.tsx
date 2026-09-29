import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing, type RawParams } from "@/components/shop/listing";
import { getCategories } from "@/lib/server/cached";

async function findCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ categorie: string }>; searchParams: Promise<RawParams> }): Promise<Metadata> {
  const [{ categorie }, sp] = await Promise.all([params, searchParams]);
  const category = await findCategory(categorie);
  if (!category) return { title: "Catégorie introuvable" };
  return {
    title: category.name,
    description: category.description || `${category.name} en résine pailletée, faits main.`,
    alternates: { canonical: `/boutique/${category.slug}` },
    robots: Object.keys(sp).some((k) => k !== "tri") ? { index: false, follow: true } : undefined,
    openGraph: category.cover ? { images: [{ url: `${category.cover.base}/og.jpg` }] } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ categorie: string }>; searchParams: Promise<RawParams> }) {
  const [{ categorie }, sp] = await Promise.all([params, searchParams]);
  const category = await findCategory(categorie);
  if (!category) notFound();
  return <Listing params={sp} category={category} />;
}
