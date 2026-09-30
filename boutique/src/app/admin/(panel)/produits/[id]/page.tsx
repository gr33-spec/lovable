import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/server/auth";
import { ProductEditor } from "@/components/admin/product-editor";
import { adminProduct, attributeSuggestions, groups } from "@/lib/server/admin-queries";

export const metadata = { title: "Modifier un produit" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  // Chaque page vérifie elle-même la session : la mise en page (layout) est rendue en
  // parallèle et ne protège pas, à elle seule, les données de la page.
  await requireAdminPage();
  const { id } = await params;
  const [product, { categories, collections }, suggestions] = await Promise.all([adminProduct(id), groups(), attributeSuggestions()]);
  if (!product) notFound();
  return (
    <ProductEditor
      key={`${product.id}-${product.version}`}
      isNew={false}
      initial={product}
      categories={categories.map((c) => ({ id: c.id, parentId: c.parentId, name: c.name, depth: c.depth, archived: c.archived, isVisible: c.isVisible }))}
      suggestions={suggestions}
      collections={collections.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
