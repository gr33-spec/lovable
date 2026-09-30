import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/product-editor";
import { adminProduct, attributeSuggestions, groups } from "@/lib/server/admin-queries";

export const metadata = { title: "Modifier un produit" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
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
