import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Listing, type RawParams } from "@/components/shop/listing";
import { getCategories } from "@/lib/server/cached";
import { queryOne } from "@/lib/server/db";

// Page d'une catégorie, à n'importe quel niveau : /boutique/pampilles/coeurs.

type Props = { params: Promise<{ chemin: string[] }>; searchParams: Promise<RawParams> };

function pathOf(segments: string[]): string | null {
  const parts = segments.map((s) => decodeURIComponent(s).toLowerCase());
  return parts.length <= 3 && parts.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 80) ? parts.join("/") : null;
}

async function findCategory(segments: string[]) {
  const path = pathOf(segments);
  return path ? ((await getCategories()).find((c) => c.path === path) ?? null) : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ chemin }, sp] = await Promise.all([params, searchParams]);
  const category = await findCategory(chemin);
  if (!category) return { title: "Catégorie introuvable" };
  const full = [...category.trail.map((t) => t.name), category.name].reverse().join(" · ");
  return {
    title: full,
    description: category.description || `${[...category.trail.map((t) => t.name), category.name].join(" › ")} : créations en résine pailletée, faites main.`,
    alternates: { canonical: `/boutique/${category.path}` },
    // Pages filtrées ou vides : pas d'indexation (contenu dupliqué ou pauvre).
    robots: Object.keys(sp).some((k) => k !== "tri") || category.productCount === 0 ? { index: false, follow: true } : undefined,
    openGraph: category.cover ? { images: [{ url: `${category.cover.base}/og.jpg` }] } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ chemin }, sp] = await Promise.all([params, searchParams]);
  const category = await findCategory(chemin);
  if (!category) {
    // Ancienne adresse (catégorie renommée ou déplacée) : redirection permanente.
    const path = pathOf(chemin);
    const moved = path
      ? await queryOne<{ path: string }>("SELECT sc.path FROM category_redirect r JOIN shop_category sc ON sc.id = r.category_id WHERE r.old_path = $1", [path])
      : null;
    if (moved) {
      const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]).map((x) => [k, x])))).toString();
      permanentRedirect(`/boutique/${moved.path}${qs ? `?${qs}` : ""}`);
    }
    notFound();
  }
  return <Listing params={sp} category={category} />;
}
